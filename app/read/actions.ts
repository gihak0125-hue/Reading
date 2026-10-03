"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { runCoach } from "@/lib/agent/coach";
import { createServiceClient } from "@/lib/supabase/service";

const REL_KO: Record<string, string> = {
  cause_effect: "인과",
  process: "과정",
  compare_contrast: "비교·대조",
  problem_solution: "문제-해결",
  question_answer: "문답",
  listing: "나열",
  similarity: "공통점",
  contrast: "차이점",
  elaboration: "상술",
};

/**
 * 관계 그래프 구조 분석(원리3 — 연쇄/분기/수렴).
 * 화살표(from·to 모두 있는 완전 연결)들을 모아 사슬·갈래·수렴을 설명한다.
 * 코치가 학생의 인과 사슬이 어디서 끊기거나 비었는지 진단하도록 돕는 '구조 요약'.
 */
function describeRelationGraph(
  edges: { from: string; to: string; relation: string }[],
): string {
  const clip = (s: string) => (s.length > 24 ? s.slice(0, 24) + "…" : s);
  const q = (s: string) => `"${clip(s)}"`;
  const out = new Map<string, Map<string, string>>(); // from -> (to -> relation)
  const inc = new Map<string, Set<string>>(); // to -> set(from)
  const nodes = new Set<string>();
  for (const e of edges) {
    const f = e.from?.trim();
    const t = e.to?.trim();
    if (!f || !t || f === t) continue;
    nodes.add(f);
    nodes.add(t);
    if (!out.has(f)) out.set(f, new Map());
    out.get(f)!.set(t, e.relation);
    if (!inc.has(t)) inc.set(t, new Set());
    inc.get(t)!.add(f);
  }
  if (nodes.size === 0) return "";

  const lines: string[] = [];
  // 연쇄: 출발점(들어오는 화살표 없는 노드)에서 외길로 이어지는 사슬(3노드 이상)
  const sources = [...nodes].filter((n) => !inc.has(n));
  const starts = sources.length ? sources : [...nodes];
  const seenChain = new Set<string>();
  for (const s of starts) {
    const path = [s];
    let cur = s;
    while (out.has(cur) && out.get(cur)!.size === 1) {
      const nxt = [...out.get(cur)!.keys()][0];
      if (path.includes(nxt)) break;
      path.push(nxt);
      cur = nxt;
      if ((inc.get(nxt)?.size ?? 0) > 1) break;
    }
    if (path.length >= 3) {
      const sig = path.join("→");
      if (!seenChain.has(sig)) {
        seenChain.add(sig);
        lines.push("연쇄: " + path.map(q).join(" → "));
      }
    }
  }
  // 분기: 한 노드에서 여러 갈래로 나감
  for (const [n, tos] of out) {
    if (tos.size >= 2)
      lines.push("분기: " + q(n) + " → " + [...tos.keys()].map(q).join(", "));
  }
  // 수렴: 여러 노드가 한 노드로 모임
  for (const [n, froms] of inc) {
    if (froms.size >= 2)
      lines.push("수렴: " + [...froms].map(q).join(", ") + " → " + q(n));
  }
  return lines.slice(0, 8).join("\n");
}

/** 세션 소유자 확인 후 supabase 반환(없으면 리다이렉트) */
async function requireOwnedSession(sessionId: string) {
  const { supabase, user } = await getSessionProfile(`/read/${sessionId}`);
  const { data: session } = await supabase
    .from("sessions")
    .select("id, student_id")
    .eq("id", sessionId)
    .single();
  if (!session || session.student_id !== user.id) redirect("/read");
  return { supabase, user };
}

export type AddAnnotationInput = {
  sessionId: string;
  paragraphId: string;
  type: "underline" | "circle" | "discourse" | "predict_cue";
  spanStart: number;
  spanEnd: number;
};

/** 밑줄/동그라미 표시 저장 */
export async function addAnnotation(
  input: AddAnnotationInput,
): Promise<{ error?: string; id?: string }> {
  if (input.spanEnd <= input.spanStart)
    return { error: "표시할 부분을 선택하세요." };
  const { supabase } = await requireOwnedSession(input.sessionId);

  const { data, error } = await supabase
    .from("annotations")
    .insert({
      session_id: input.sessionId,
      paragraph_id: input.paragraphId,
      type: input.type,
      span_start: input.spanStart,
      span_end: input.spanEnd,
    })
    .select("id")
    .single();
  if (error) return { error: `저장 실패: ${error.message}` };

  return { id: data.id };
}

/** 표시 삭제(지우기) */
export async function deleteAnnotation(
  id: string,
  sessionId: string,
): Promise<void> {
  const { supabase } = await requireOwnedSession(sessionId);
  await supabase.from("annotations").delete().eq("id", id);
}

export type RelationType =
  | "compare_contrast"
  | "cause_effect"
  | "process"
  | "problem_solution"
  | "question_answer"
  | "listing"
  | "similarity"
  | "contrast"
  | "elaboration";

/**
 * 두 표시(A→B)를 관계로 연결한다.
 * arrow 주석 한 행에 A의 위치(paragraph/span)를 담고 target_ref로 B를 가리킨다.
 */
export async function addRelation(input: {
  sessionId: string;
  fromAnnotationId: string;
  toAnnotationId: string;
  relationType: RelationType;
}): Promise<{ error?: string; id?: string }> {
  if (input.fromAnnotationId === input.toAnnotationId)
    return { error: "서로 다른 두 표시를 연결하세요." };
  const { supabase } = await requireOwnedSession(input.sessionId);

  const { data: from } = await supabase
    .from("annotations")
    .select("paragraph_id, span_start, span_end, session_id")
    .eq("id", input.fromAnnotationId)
    .single();
  if (!from || from.session_id !== input.sessionId)
    return { error: "시작 표시를 찾을 수 없습니다." };

  const { data, error } = await supabase
    .from("annotations")
    .insert({
      session_id: input.sessionId,
      paragraph_id: from.paragraph_id,
      span_start: from.span_start,
      span_end: from.span_end,
      type: "arrow",
      from_ref: input.fromAnnotationId,
      target_ref: input.toAnnotationId,
      relation_type: input.relationType,
    })
    .select("id")
    .single();
  if (error) return { error: `연결 실패: ${error.message}` };

  return { id: data.id };
}

/** 한 표시에 역할(문제/해결/질문/답) 태그를 단다. from만 또는 target만 채운 arrow 주석. */
export async function addMarkTag(input: {
  sessionId: string;
  annotationId: string;
  relationType: "problem_solution" | "question_answer";
  role: "from" | "to";
}): Promise<{ error?: string; id?: string }> {
  const { supabase } = await requireOwnedSession(input.sessionId);

  const { data: mark } = await supabase
    .from("annotations")
    .select("paragraph_id, span_start, span_end, session_id")
    .eq("id", input.annotationId)
    .single();
  if (!mark || mark.session_id !== input.sessionId)
    return { error: "표시를 찾을 수 없습니다." };

  const { data, error } = await supabase
    .from("annotations")
    .insert({
      session_id: input.sessionId,
      paragraph_id: mark.paragraph_id,
      span_start: mark.span_start,
      span_end: mark.span_end,
      type: "arrow",
      from_ref: input.role === "from" ? input.annotationId : null,
      target_ref: input.role === "to" ? input.annotationId : null,
      relation_type: input.relationType,
    })
    .select("id")
    .single();
  if (error) return { error: `표시 실패: ${error.message}` };

  return { id: data.id };
}

/** 지문을 골라 읽기 세션을 시작한다(이미 진행 중이면 그 세션으로 이어감). */
export async function startSession(formData: FormData): Promise<void> {
  const { supabase, user } = await getSessionProfile("/read");
  const passageId = String(formData.get("passage_id") ?? "");
  if (!passageId) redirect("/read");

  // 같은 지문의 진행 중 세션이 있으면 재사용
  const { data: existing } = await supabase
    .from("sessions")
    .select("id")
    .eq("student_id", user.id)
    .eq("passage_id", passageId)
    .eq("status", "in_progress")
    .maybeSingle();

  let sessionId = existing?.id;
  if (!sessionId) {
    const { data, error } = await supabase
      .from("sessions")
      .insert({ student_id: user.id, passage_id: passageId })
      .select("id")
      .single();
    if (error || !data) redirect("/read");
    sessionId = data.id;
  }

  redirect(`/read/${sessionId}`);
}

export type CoachResult = { reply?: string; needsKey?: boolean; error?: string };

/** 학생의 설명/질문을 저장하고, (키가 있으면) AI 코치 응답을 생성·저장 */
export async function sendCoachMessage(input: {
  sessionId: string;
  text: string;
  hint?: boolean;
  mode?: "activity" | "critique" | "check" | "predict" | "hidden";
}): Promise<CoachResult> {
  const { supabase } = await requireOwnedSession(input.sessionId);
  const text = input.text.trim();
  if (!input.hint && !input.mode && !text) return { error: "내용을 입력하세요." };

  // 1) 학생 메시지 저장(힌트 요청은 저장하지 않음)
  if (text) {
    await supabase.from("agent_messages").insert({
      session_id: input.sessionId,
      role: "student",
      content: text,
    });
  }

  // 2) 컨텍스트 수집
  const { data: session } = await supabase
    .from("sessions")
    .select("passage_id")
    .eq("id", input.sessionId)
    .single();
  const { data: passage } = await supabase
    .from("passages")
    .select("title")
    .eq("id", session?.passage_id ?? "")
    .single();
  const { data: paragraphs } = await supabase
    .from("passage_paragraphs")
    .select("id, seq, text")
    .eq("passage_id", session?.passage_id ?? "")
    .order("seq", { ascending: true });
  const { data: annos } = await supabase
    .from("annotations")
    .select("id, paragraph_id, type, span_start, span_end, target_ref, from_ref, relation_type")
    .eq("session_id", input.sessionId);
  const { data: history } = await supabase
    .from("agent_messages")
    .select("role, content, created_at")
    .eq("session_id", input.sessionId)
    .order("created_at", { ascending: true });

  const paraText = new Map<string, string>();
  for (const p of paragraphs ?? []) paraText.set(p.id, p.text);
  const annoById = new Map<string, NonNullable<typeof annos>[number]>();
  for (const a of annos ?? []) annoById.set(a.id, a);
  const markText = (id: string | null) => {
    const a = id ? annoById.get(id) : null;
    if (!a) return "";
    return (paraText.get(a.paragraph_id) ?? "").slice(a.span_start, a.span_end);
  };

  // 교사 정답 기준(핵심정보·관계) — RLS 우회 서버 전용 클라이언트로 읽어 진단에만 사용(학생 노출 X)
  const svc = createServiceClient();
  let keyInfos: string[] = [];
  let keyRelations: { from: string; to: string; relation: string }[] = [];
  let critiqueNote = "";
  let checkItems: { kind: string; q: string; a: string }[] = [];
  const paraIds = (paragraphs ?? []).map((p) => p.id);
  if (svc && session?.passage_id && paraIds.length) {
    const [{ data: ki }, { data: kr }, { data: cn }, { data: pc }] =
      await Promise.all([
      svc
        .from("passage_key_info")
        .select("paragraph_id, span_start, span_end, kind")
        .in("paragraph_id", paraIds),
      svc
        .from("passage_key_relations")
        .select(
          "from_paragraph_id, from_start, from_end, to_paragraph_id, to_start, to_end, relation_type",
        )
        .eq("passage_id", session.passage_id),
      svc
        .from("passage_critique")
        .select("note")
        .eq("passage_id", session.passage_id)
        .maybeSingle(),
      svc
        .from("passage_checks")
        .select(
          "detail_q, detail_a, main_q, main_a, inference_q, inference_a",
        )
        .eq("passage_id", session.passage_id)
        .maybeSingle(),
    ]);
    keyInfos = (ki ?? [])
      .map((k) => {
        const t = (paraText.get(k.paragraph_id) ?? "").slice(
          k.span_start,
          k.span_end,
        );
        return `(${k.kind === "keyword" ? "핵심어" : "핵심문장"}) ${t}`;
      })
      .filter((x) => x.length > 5);
    keyRelations = (kr ?? [])
      .map((r) => ({
        from: (paraText.get(r.from_paragraph_id) ?? "").slice(
          r.from_start,
          r.from_end,
        ),
        to: (paraText.get(r.to_paragraph_id) ?? "").slice(r.to_start, r.to_end),
        relation: REL_KO[r.relation_type] ?? "관계",
      }))
      .filter((r) => r.from && r.to);
    critiqueNote = ((cn as { note?: string } | null)?.note ?? "").trim();
    const pcr = pc as Record<string, string | null> | null;
    if (pcr) {
      const add = (kind: string, q?: string | null, a?: string | null) => {
        if (q && q.trim())
          checkItems.push({ kind, q: q.trim(), a: (a ?? "").trim() });
      };
      add("세부", pcr.detail_q, pcr.detail_a);
      add("중심", pcr.main_q, pcr.main_a);
      add("추론", pcr.inference_q, pcr.inference_a);
    }
  }

  // 최근 진단 이력(이번 세션) — 비계 수준 조절용(원리6.3·6.4)
  const { data: diagRows } = await supabase
    .from("diagnoses")
    .select("difficulty_area, created_at")
    .eq("session_id", input.sessionId)
    .order("created_at", { ascending: false })
    .limit(6);
  const recentAreas = (diagRows ?? [])
    .map((d) => d.difficulty_area)
    .filter((a): a is string => !!a);

  const marks = (annos ?? [])
    .filter((a) => a.type === "underline" || a.type === "circle")
    .map((a) => ({
      type: a.type,
      text: (paraText.get(a.paragraph_id) ?? "").slice(a.span_start, a.span_end),
    }));
  const relations = (annos ?? [])
    .filter((a) => a.type === "arrow")
    .map((a) => {
      const rt = a.relation_type ?? "listing";
      const hasFrom = !!a.from_ref;
      const hasTo = !!a.target_ref;
      if (hasFrom !== hasTo) {
        let role = REL_KO[rt] ?? "관계";
        if (rt === "problem_solution") role = hasFrom ? "문제" : "해결";
        else if (rt === "question_answer") role = hasFrom ? "질문" : "답";
        return {
          from: markText(hasFrom ? a.from_ref : a.target_ref),
          to: "",
          relation: role,
        };
      }
      return {
        from: markText(a.from_ref),
        to: markText(a.target_ref),
        relation: REL_KO[rt] ?? "관계",
      };
    });

  const relationGraph = describeRelationGraph(
    relations.filter((r) => r.from && r.to),
  );

  const passageText = (paragraphs ?? []).map((p) => p.text).join("\n\n");

  // 활동 기반 피드백인데 표시·관계가 하나도 없으면 조용히 넘어간다
  if (input.mode === "activity" && marks.length === 0 && relations.length === 0) {
    return {};
  }

  // 3) 코치 실행
  const result = await runCoach({
    passageTitle: passage?.title ?? "",
    passageText,
    marks,
    relations,
    history: (history ?? []).map((h) => ({
      role: h.role === "agent" ? "agent" : "student",
      content: h.content,
    })),
    studentMessage: text,
    hintRequested: input.hint,
    mode: input.mode ?? "chat",
    keyInfos,
    keyRelations,
    recentAreas,
    critiqueNote,
    checkItems,
    relationGraph,
  });

  if ("error" in result) {
    if (result.error === "no_key") {
      revalidatePath(`/read/${input.sessionId}`);
      return { needsKey: true };
    }
    revalidatePath(`/read/${input.sessionId}`);
    return { error: "코치 응답 생성에 실패했어요. 잠시 후 다시 시도해 주세요." };
  }

  // 4) 코치 메시지 저장
  await supabase.from("agent_messages").insert({
    session_id: input.sessionId,
    role: "agent",
    content: result.message,
    model_used: result.model,
    tokens: result.tokens,
  });

  // 진단 저장(실제 진단 모멘트: 학생 제출/활동 피드백) — 영역이 있을 때만
  if (result.area && (!input.mode || input.mode === "activity")) {
    await supabase.from("diagnoses").insert({
      session_id: input.sessionId,
      difficulty_area: result.area,
      evidence: text || null,
    });
  }

  revalidatePath(`/read/${input.sessionId}`);
  return { reply: result.message };
}

/** 읽기 세션을 완료 표시 */
export async function completeSession(sessionId: string): Promise<void> {
  const { supabase } = await requireOwnedSession(sessionId);
  await supabase
    .from("sessions")
    .update({ status: "completed", ended_at: new Date().toISOString() })
    .eq("id", sessionId);
  revalidatePath(`/read/${sessionId}`);
  revalidatePath("/read");
}

/** 완료한 세션을 다시 진행 중으로 */
export async function reopenSession(sessionId: string): Promise<void> {
  const { supabase } = await requireOwnedSession(sessionId);
  await supabase
    .from("sessions")
    .update({ status: "in_progress", ended_at: null })
    .eq("id", sessionId);
  revalidatePath(`/read/${sessionId}`);
  revalidatePath("/read");
}

/** 읽기 결과 수치화(형성 평가). stage: "reading"=표시 기반(사실·추론), "review"=대화 기반(사실·추론·비판) */
export async function scoreSessionAction(
  sessionId: string,
  stage: "reading" | "review",
): Promise<
  | { fact: number; inference: number; critique?: number; comment: string }
  | { error: string }
> {
  const { supabase } = await requireOwnedSession(sessionId);

  const { data: session } = await supabase
    .from("sessions")
    .select("id, passage_id")
    .eq("id", sessionId)
    .single();
  if (!session) return { error: "세션을 찾을 수 없습니다." };

  const { data: paragraphs } = await supabase
    .from("passage_paragraphs")
    .select("id, seq, text")
    .eq("passage_id", session.passage_id)
    .order("seq", { ascending: true });
  const { data: annos } = await supabase
    .from("annotations")
    .select("id, paragraph_id, type, span_start, span_end, target_ref, from_ref, relation_type")
    .eq("session_id", sessionId);
  const { data: history } = await supabase
    .from("agent_messages")
    .select("role, content, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  const paraText = new Map<string, string>();
  for (const p of paragraphs ?? []) paraText.set(p.id, p.text);
  const annoById = new Map<string, NonNullable<typeof annos>[number]>();
  for (const a of annos ?? []) annoById.set(a.id, a);
  const markText = (id: string | null) => {
    const a = id ? annoById.get(id) : null;
    if (!a) return "";
    return (paraText.get(a.paragraph_id) ?? "").slice(a.span_start, a.span_end);
  };

  const marks = (annos ?? [])
    .filter((a) => a.type === "underline" || a.type === "circle")
    .map((a) => ({
      type: a.type,
      text: (paraText.get(a.paragraph_id) ?? "").slice(a.span_start, a.span_end),
    }));
  const relations = (annos ?? [])
    .filter((a) => a.type === "arrow")
    .map((a) => ({
      from: markText(a.from_ref),
      to: markText(a.target_ref),
      relation: REL_KO[a.relation_type ?? "listing"] ?? "관계",
    }));

  const svc = createServiceClient();
  let keyInfos: string[] = [];
  let keyRelations: { from: string; to: string; relation: string }[] = [];
  let critiqueNote = "";
  const paraIds = (paragraphs ?? []).map((p) => p.id);
  if (svc && session.passage_id && paraIds.length) {
    const [{ data: ki }, { data: kr }, { data: cn }] = await Promise.all([
      svc
        .from("passage_key_info")
        .select("paragraph_id, span_start, span_end, kind")
        .in("paragraph_id", paraIds),
      svc
        .from("passage_key_relations")
        .select(
          "from_paragraph_id, from_start, from_end, to_paragraph_id, to_start, to_end, relation_type",
        )
        .eq("passage_id", session.passage_id),
      svc
        .from("passage_critique")
        .select("note")
        .eq("passage_id", session.passage_id)
        .maybeSingle(),
    ]);
    keyInfos = (ki ?? [])
      .map((k) => {
        const t = (paraText.get(k.paragraph_id) ?? "").slice(k.span_start, k.span_end);
        return `(${k.kind === "keyword" ? "핵심어" : "핵심문장"}) ${t}`;
      })
      .filter((x) => x.length > 5);
    keyRelations = (kr ?? [])
      .map((r) => ({
        from: (paraText.get(r.from_paragraph_id) ?? "").slice(r.from_start, r.from_end),
        to: (paraText.get(r.to_paragraph_id) ?? "").slice(r.to_start, r.to_end),
        relation: REL_KO[r.relation_type] ?? "관계",
      }))
      .filter((r) => r.from && r.to);
    critiqueNote = ((cn as { note?: string } | null)?.note ?? "").trim();
  }

  const passageText = (paragraphs ?? []).map((p) => p.text).join("\n\n");

  const { scoreSession } = await import("@/lib/agent/score");
  const result = await scoreSession({
    stage,
    passageText,
    marks,
    relations,
    keyInfos,
    keyRelations,
    critiqueNote,
    history: (history ?? []).map((h) => ({
      role: h.role === "agent" ? "agent" : "student",
      content: h.content,
    })),
  });
  if ("error" in result)
    return {
      error: result.error === "no_key" ? "AI 키가 필요해요." : "채점에 실패했어요.",
    };
  return { ...result.scores, comment: result.comment };
}
