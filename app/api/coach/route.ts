import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { buildCoachPrompt, checkFeedback, classifyArea } from "@/lib/agent/coach";
import { getOpenAI } from "@/lib/openai";
import { loadCoachContext, type CoachMode } from "@/lib/agent/coach-context";

export const runtime = "nodejs";

/** 코치 응답 스트리밍 엔드포인트(평문 토큰 스트림). 실패 시 클라이언트는 서버액션으로 폴백. */
export async function POST(req: Request) {
  let body: { sessionId?: string; text?: string; mode?: CoachMode; hint?: boolean };
  try {
    body = await req.json();
  } catch {
    return new Response("bad request", { status: 400 });
  }
  const sessionId = String(body.sessionId ?? "");
  const text = String(body.text ?? "").trim();
  const mode = body.mode;
  const hint = !!body.hint;
  if (!sessionId) return new Response("no session", { status: 400 });

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return new Response("unauthorized", { status: 401 });
  const { data: session } = await supabase
    .from("sessions")
    .select("id, student_id")
    .eq("id", sessionId)
    .single();
  if (!session || session.student_id !== user.id)
    return new Response("forbidden", { status: 403 });

  // 학생 메시지 저장
  if (text)
    await supabase
      .from("agent_messages")
      .insert({ session_id: sessionId, role: "student", content: text });

  const svc = createServiceClient();
  const { ctx, checkItems, passageText, marksText, skip } =
    await loadCoachContext(supabase, svc, sessionId, { text, mode, hint });

  const enc = new TextEncoder();
  const plain = (s: string) =>
    new Response(s, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });

  if (skip) return plain("");

  // 독해 확인: 교사 문항을 한 문항씩 그대로 결정적 제시(LLM 없이)
  if (mode === "check" && checkItems.length > 0) {
    const NL = "\n";
    const total = checkItems.length;
    const numbered = (i: number) => `(${i + 1}/${total}) ${checkItems[i].q}`;
    const agentMsgs = ctx.history
      .filter((h) => h.role === "agent")
      .map((h) => h.content);
    const occ = (qq: string) => agentMsgs.filter((m) => m.includes(qq)).length;
    let askedMax = -1;
    for (let i = 0; i < checkItems.length; i++)
      if (occ(checkItems[i].q) > 0) askedMax = i;

    let agentText: string;
    if (askedMax < 0) {
      agentText = numbered(0);
    } else {
      let fb = "";
      let correct = true;
      if (text) {
        const r = await checkFeedback({
          passageText,
          question: checkItems[askedMax].q,
          modelAnswer: checkItems[askedMax].a,
          studentAnswer: text,
        });
        if (!("error" in r)) {
          fb = r.feedback;
          correct = r.correct;
        }
      }
      const attempts = occ(checkItems[askedMax].q);
      const advance = correct || attempts >= 2 || !text;
      const pre = fb ? fb + NL + NL : "";
      if (advance) {
        const next = askedMax + 1;
        agentText =
          next < checkItems.length
            ? pre + numbered(next)
            : pre +
              "독해 확인 문항을 모두 마쳤어요. 아래 ‘독해 확인 완료 → 결과’를 눌러 결과를 확인해요.";
      } else {
        agentText = pre + "다시 한 번 생각해 볼까요?" + NL + NL + numbered(askedMax);
      }
    }
    await supabase
      .from("agent_messages")
      .insert({ session_id: sessionId, role: "agent", content: agentText });
    return plain(agentText);
  }

  if (!process.env.OPENAI_API_KEY) {
    return new Response(JSON.stringify({ needsKey: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { messages, model } = buildCoachPrompt(ctx);
  messages.push({
    role: "system",
    content:
      "이번에는 JSON을 쓰지 말고, 학생에게 보일 말(2~3문장)만 평문으로 출력하세요. 'message'/'area' 같은 키나 중괄호 없이.",
  });

  const completion = await getOpenAI().chat.completions.create({
    model,
    messages,
    temperature: 0.6,
    max_tokens: 400,
    stream: true,
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let full = "";
      try {
        for await (const chunk of completion) {
          const delta = chunk.choices[0]?.delta?.content ?? "";
          if (delta) {
            full += delta;
            controller.enqueue(enc.encode(delta));
          }
        }
      } catch {
        // 스트림 중단 — 지금까지 받은 내용으로 저장
      }
      controller.close();
      full = full.trim();
      if (full) {
        await supabase.from("agent_messages").insert({
          session_id: sessionId,
          role: "agent",
          content: full,
          model_used: model,
        });
        if (!mode || mode === "activity") {
          const area = await classifyArea({
            passageText,
            marksText,
            studentMessage: text,
            agentMessage: full,
          });
          if (area)
            await supabase.from("diagnoses").insert({
              session_id: sessionId,
              difficulty_area: area,
              evidence: text || null,
            });
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
