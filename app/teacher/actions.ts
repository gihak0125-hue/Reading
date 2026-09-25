"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/auth";

export type PassageState = { error?: string };

/** 본문을 빈 줄 기준으로 문단 배열로 나눈다. */
function splitParagraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+$/g, "").replace(/^\s+/g, ""))
    .filter((p) => p.length > 0);
}

export async function createPassage(
  _prev: PassageState,
  formData: FormData,
): Promise<PassageState> {
  const { supabase, user } = await requireTeacher();

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const source = String(formData.get("source") ?? "").trim() || null;
  const difficultyRaw = String(formData.get("difficulty") ?? "");
  const difficulty = difficultyRaw ? Number(difficultyRaw) : null;

  if (!title) return { error: "제목을 입력하세요." };
  if (!body) return { error: "본문을 입력하세요." };

  const paras = splitParagraphs(body);
  if (paras.length === 0) return { error: "문단을 인식하지 못했습니다." };

  const { data: passage, error: pErr } = await supabase
    .from("passages")
    .insert({ title, body, source, difficulty, created_by: user.id })
    .select("id")
    .single();
  if (pErr || !passage) return { error: `지문 저장 실패: ${pErr?.message}` };

  const rows = paras.map((text, i) => ({
    passage_id: passage.id,
    seq: i + 1,
    text,
  }));
  const { error: parErr } = await supabase
    .from("passage_paragraphs")
    .insert(rows);
  if (parErr) {
    // 문단 저장 실패 시 지문도 롤백(삭제)해 고아 데이터 방지
    await supabase.from("passages").delete().eq("id", passage.id);
    return { error: `문단 저장 실패: ${parErr.message}` };
  }

  revalidatePath("/teacher");
  redirect(`/teacher/${passage.id}`);
}

export async function deletePassage(formData: FormData): Promise<void> {
  const { supabase } = await requireTeacher();
  const id = String(formData.get("id") ?? "");
  if (id) await supabase.from("passages").delete().eq("id", id);
  revalidatePath("/teacher");
}

export type KeyInfoInput = {
  passageId: string;
  paragraphId: string;
  spanStart: number;
  spanEnd: number;
  kind: "keyword" | "key_sentence";
};

/** 문단 텍스트의 일부 구간(span)을 핵심어/핵심문장으로 저장 */
export async function addKeyInfo(
  input: KeyInfoInput,
): Promise<{ error?: string }> {
  const { supabase } = await requireTeacher();
  if (input.spanEnd <= input.spanStart)
    return { error: "선택된 구간이 없습니다." };

  const { error } = await supabase.from("passage_key_info").insert({
    paragraph_id: input.paragraphId,
    span_start: input.spanStart,
    span_end: input.spanEnd,
    kind: input.kind,
  });
  if (error) return { error: `저장 실패: ${error.message}` };

  revalidatePath(`/teacher/${input.passageId}`);
  return {};
}

export async function deleteKeyInfo(
  id: string,
  passageId: string,
): Promise<void> {
  const { supabase } = await requireTeacher();
  await supabase.from("passage_key_info").delete().eq("id", id);
  revalidatePath(`/teacher/${passageId}`);
}
