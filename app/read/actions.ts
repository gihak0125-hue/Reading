"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";

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
  | "problem_solution"
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
