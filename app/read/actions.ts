"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { runCoach } from "@/lib/agent/coach";

const REL_KO: Record<string, string> = {
  cause_effect: "인과",
  process: "과정",
  compare_contrast: "비교·대조",
  problem_solution: "문제-해결",
  question_answer: "문답",
  listing: "나열",
};

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
  type: "underline" | "circle";
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

  revalidatePath(`/read/${input.sessionId}`);
  return { id: data.id };
}

/** 표시 삭제(지우기) */
export async function deleteAnnotation(
  id: string,
  sessionId: string,
): Promise<void> {
  const { supabase } = await requireOwnedSession(sessionId);
  await supabase.from("annotations").delete().eq("id", id);
  revalidatePath(`/read/${sessionId}`);
}

export type RelationType =
  | "compare_contrast"
  | "cause_effect"
  | "process"
  | "problem_solution"
  | "question_answer"
  | "listing";

/**
 * 두 표시(A→B)를 관계로 연결한다.
 * arrow 주석 한 행에 A의 위치(paragraph/span)를 담고 target_ref로 B를 가리킨다.
 */
export async function addRelation(input: {
  sessionId: string;
  fromAnnotationId: string;
  toAnnotationId: string;
  relationType: RelationType;
}): Promise<{ error?: string }> {
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

  const { error } = await supabase.from("annotations").insert({
    session_id: input.sessionId,
    paragraph_id: from.paragraph_id,
    span_start: from.span_start,
    span_end: from.span_end,
    type: "arrow",
    from_ref: input.fromAnnotationId,
    target_ref: input.toAnnotationId,
    relation_type: input.relationType,
  });
  if (error) return { error: `연결 실패: ${error.message}` };

  revalidatePath(`/read/${input.sessionId}`);
  return {};
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
}): Promise<CoachResult> {
  const { supabase } = await requireOwnedSession(input.sessionId);
  const text = input.text.trim();
  if (!input.hint && !text) return { error: "내용을 입력하세요." };

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

  const passageText = (paragraphs ?? []).map((p) => p.text).join("\n\n");

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
