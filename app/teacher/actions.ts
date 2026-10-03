"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/auth";

export type PassageState = { error?: string };

/** 본문을 문단 배열로 나눈다. 빈 줄 / 들여쓰기 / 줄바꿈(CRLF) 처리. */
function splitParagraphs(body: string): string[] {
  const t = body.replace(/\r\n?/g, "\n");
  const IND = /^[ \t\u00A0\u3000]+/;
  const lines = t.split("\n");
  const paras: string[] = [];
  let cur = "";
  for (const line of lines) {
    if (!line.trim()) {
      if (cur) {
        paras.push(cur);
        cur = "";
      }
      continue;
    }
    if (IND.test(line) && cur) {
      paras.push(cur);
      cur = line.trim();
    } else {
      cur = cur ? cur + " " + line.trim() : line.trim();
    }
  }
  if (cur) paras.push(cur);
  if (paras.length === 1) {
    const byLine = t.split(/\n/).map((s) => s.trim()).filter(Boolean);
    if (byLine.length > 1) return byLine;
  }
  return paras.filter(Boolean);
}

/** 원문에서 needle 을 공백/줄바꿈 무시하고 찾아 원본 구간(start,end) 반환 */
function findSpan(
  text: string,
  needle: string,
): { start: number; end: number } | null {
  let norm = "";
  const map: number[] = [];
  let prevWs = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (/\s/.test(c)) {
      if (!prevWs && norm.length) {
        norm += " ";
        map.push(i);
      }
      prevWs = true;
    } else {
      norm += c;
      map.push(i);
      prevWs = false;
    }
  }
  const nNeedle = needle.replace(/\s+/g, " ").trim();
  if (!nNeedle) return null;
  const idx = norm.indexOf(nNeedle);
  if (idx < 0) return null;
  const start = map[idx];
  const end = map[idx + nNeedle.length - 1] + 1;
  return { start, end };
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
  const categoryRaw = String(formData.get("category") ?? "");
  const category = ["humanities", "social", "science"].includes(categoryRaw)
    ? categoryRaw
    : null;

  if (!title) return { error: "제목을 입력하세요." };
  if (!body) return { error: "본문을 입력하세요." };

  const paras = splitParagraphs(body);
  if (paras.length === 0) return { error: "문단을 인식하지 못했습니다." };

  const { data: passage, error: pErr } = await supabase
    .from("passages")
    .insert({ title, body, source, difficulty, category, created_by: user.id })
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

export async function updatePassage(
  _prev: PassageState,
  formData: FormData,
): Promise<PassageState> {
  const { supabase, user } = await requireTeacher();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const source = String(formData.get("source") ?? "").trim() || null;
  const difficultyRaw = String(formData.get("difficulty") ?? "");
  const difficulty = difficultyRaw ? Number(difficultyRaw) : null;
  const categoryRaw = String(formData.get("category") ?? "");
  const category = ["humanities", "social", "science"].includes(categoryRaw)
    ? categoryRaw
    : null;

  if (!id) return { error: "잘못된 요청입니다." };
  if (!title) return { error: "제목을 입력하세요." };
  if (!body) return { error: "본문을 입력하세요." };

  const { data: cur } = await supabase
    .from("passages")
    .select("body, created_by")
    .eq("id", id)
    .single();
  if (!cur || cur.created_by !== user.id)
    return { error: "권한이 없거나 지문을 찾을 수 없습니다." };

  const { error: uErr } = await supabase
    .from("passages")
    .update({ title, source, difficulty, category, body })
    .eq("id", id);
  if (uErr) return { error: `수정 실패: ${uErr.message}` };

  // 본문이 바뀌었거나 문단 분리 결과가 달라지면 문단을 다시 나눈다(태깅 초기화)
  const paras = splitParagraphs(body);
  if (paras.length === 0) return { error: "문단을 인식하지 못했습니다." };
  const { count: curCount } = await supabase
    .from("passage_paragraphs")
    .select("*", { count: "exact", head: true })
    .eq("passage_id", id);
  if (body !== cur.body || (curCount ?? 0) !== paras.length) {
    await supabase.from("passage_paragraphs").delete().eq("passage_id", id);
    const rows = paras.map((text, i) => ({ passage_id: id, seq: i + 1, text }));
    const { error: pErr } = await supabase
      .from("passage_paragraphs")
      .insert(rows);
    if (pErr) return { error: `문단 저장 실패: ${pErr.message}` };
  }

  revalidatePath(`/teacher/${id}`);
  revalidatePath("/teacher");
  redirect(`/teacher/${id}`);
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

// ===== AI 지문 분석 (핵심문장·관계 추천 → 교사 검토) =====

export type KeyInfoSuggest = {
  paragraphId: string;
  paragraphSeq: number;
  text: string;
  kind: "keyword" | "key_sentence";
  spanStart: number;
  spanEnd: number;
};
export type RelationSuggest = {
  fromParagraphId: string;
  fromStart: number;
  fromEnd: number;
  fromText: string;
  toParagraphId: string;
  toStart: number;
  toEnd: number;
  toText: string;
  relationType: string;
};
export type AnalyzeState =
  | { error?: string }
  | { keyInfos: KeyInfoSuggest[]; relations: RelationSuggest[] };

/** AI로 지문을 분석해 추천 목록을 반환(저장은 하지 않음) */
export async function analyzePassageAction(
  passageId: string,
  teacherNote?: string,
): Promise<AnalyzeState> {
  const { supabase, user } = await requireTeacher();
  const { data: passage } = await supabase
    .from("passages")
    .select("title, created_by")
    .eq("id", passageId)
    .single();
  if (!passage || passage.created_by !== user.id)
    return { error: "권한이 없습니다." };

  const { data: paras } = await supabase
    .from("passage_paragraphs")
    .select("id, seq, text")
    .eq("passage_id", passageId)
    .order("seq", { ascending: true });
  if (!paras || paras.length === 0) return { error: "문단이 없습니다." };

  const { analyzePassage } = await import("@/lib/agent/analyze");
  const result = await analyzePassage(
    passage.title,
    paras.map((p) => ({ seq: p.seq, text: p.text })),
    teacherNote,
  );
  if ("error" in result)
    return {
      error:
        result.error === "no_key"
          ? "AI 키가 필요해요(코치 설정 확인)."
          : "분석에 실패했어요. 잠시 후 다시 시도해 주세요.",
    };

  const bySeq = new Map(paras.map((p) => [p.seq, p]));
  const keyInfos: KeyInfoSuggest[] = [];
  for (const k of result.keyInfos) {
    const p = bySeq.get(k.paragraphSeq);
    if (!p || !k.text) continue;
    const span = findSpan(p.text, k.text);
    if (!span) continue;
    keyInfos.push({
      paragraphId: p.id,
      paragraphSeq: p.seq,
      text: p.text.slice(span.start, span.end),
      kind: k.kind === "keyword" ? "keyword" : "key_sentence",
      spanStart: span.start,
      spanEnd: span.end,
    });
  }
  const relations: RelationSuggest[] = [];
  for (const r of result.relations) {
    const pf = bySeq.get(r.fromParagraphSeq);
    const pt = bySeq.get(r.toParagraphSeq);
    if (!pf || !pt || !r.fromText || !r.toText) continue;
    const fspan = findSpan(pf.text, r.fromText);
    const tspan = findSpan(pt.text, r.toText);
    if (!fspan || !tspan) continue;
    relations.push({
      fromParagraphId: pf.id,
      fromStart: fspan.start,
      fromEnd: fspan.end,
      fromText: pf.text.slice(fspan.start, fspan.end),
      toParagraphId: pt.id,
      toStart: tspan.start,
      toEnd: tspan.end,
      toText: pt.text.slice(tspan.start, tspan.end),
      relationType: r.relationType,
    });
  }
  return { keyInfos, relations };
}

/** 교사가 검토·선택한 추천을 정답 기준으로 저장 */
export async function saveSuggestions(input: {
  passageId: string;
  keyInfos: { paragraphId: string; spanStart: number; spanEnd: number; kind: string }[];
  relations: RelationSuggest[];
}): Promise<{ error?: string; ok?: boolean }> {
  const { supabase, user } = await requireTeacher();
  const { data: passage } = await supabase
    .from("passages")
    .select("created_by")
    .eq("id", input.passageId)
    .single();
  if (!passage || passage.created_by !== user.id)
    return { error: "권한이 없습니다." };

  if (input.keyInfos.length) {
    const { error } = await supabase.from("passage_key_info").insert(
      input.keyInfos.map((k) => ({
        paragraph_id: k.paragraphId,
        span_start: k.spanStart,
        span_end: k.spanEnd,
        kind: k.kind,
      })),
    );
    if (error) return { error: `핵심정보 저장 실패: ${error.message}` };
  }
  if (input.relations.length) {
    const { error } = await supabase.from("passage_key_relations").insert(
      input.relations.map((r) => ({
        passage_id: input.passageId,
        from_paragraph_id: r.fromParagraphId,
        from_start: r.fromStart,
        from_end: r.fromEnd,
        to_paragraph_id: r.toParagraphId,
        to_start: r.toStart,
        to_end: r.toEnd,
        relation_type: r.relationType,
      })),
    );
    if (error) return { error: `관계 저장 실패: ${error.message}` };
  }

  revalidatePath(`/teacher/${input.passageId}`);
  return { ok: true };
}

/** 지문의 '관점 평가 가이드'(교사 작성, 학생 비노출) 저장 */
export async function saveCritiqueNote(
  passageId: string,
  note: string,
): Promise<{ error?: string; ok?: boolean }> {
  const { supabase, user } = await requireTeacher();
  const { data: passage } = await supabase
    .from("passages")
    .select("created_by")
    .eq("id", passageId)
    .single();
  if (!passage || passage.created_by !== user.id)
    return { error: "권한이 없습니다." };

  const { error } = await supabase.from("passage_critique").upsert({
    passage_id: passageId,
    note: note.trim() || null,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: `저장 실패: ${error.message}` };

  revalidatePath(`/teacher/${passageId}`);
  return { ok: true };
}

export type CheckQuestionsInput = {
  detail_q: string;
  detail_a: string;
  main_q: string;
  main_a: string;
  inference_q: string;
  inference_a: string;
};

/** 지문의 '독해 확인 문항'(세부·중심·추론) 저장 */
export async function saveCheckQuestions(
  passageId: string,
  data: CheckQuestionsInput,
): Promise<{ error?: string; ok?: boolean }> {
  const { supabase, user } = await requireTeacher();
  const { data: passage } = await supabase
    .from("passages")
    .select("created_by")
    .eq("id", passageId)
    .single();
  if (!passage || passage.created_by !== user.id)
    return { error: "권한이 없습니다." };

  const clean = (v: string) => (v.trim() ? v.trim() : null);
  const { error } = await supabase.from("passage_checks").upsert({
    passage_id: passageId,
    detail_q: clean(data.detail_q),
    detail_a: clean(data.detail_a),
    main_q: clean(data.main_q),
    main_a: clean(data.main_a),
    inference_q: clean(data.inference_q),
    inference_a: clean(data.inference_a),
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: `저장 실패: ${error.message}` };

  revalidatePath(`/teacher/${passageId}`);
  return { ok: true };
}

/** 관점 평가 가이드 AI 추천 (교사 보조) */
export async function suggestCritiqueAction(
  passageId: string,
): Promise<{ note?: string; error?: string }> {
  const { supabase, user } = await requireTeacher();
  const { data: passage } = await supabase
    .from("passages")
    .select("title, created_by")
    .eq("id", passageId)
    .single();
  if (!passage || passage.created_by !== user.id)
    return { error: "권한이 없습니다." };
  const { data: paras } = await supabase
    .from("passage_paragraphs")
    .select("seq, text")
    .eq("passage_id", passageId)
    .order("seq", { ascending: true });
  if (!paras || paras.length === 0) return { error: "문단이 없습니다." };

  const { suggestCritiqueGuide } = await import("@/lib/agent/analyze");
  const r = await suggestCritiqueGuide(
    passage.title,
    paras.map((p) => ({ seq: p.seq, text: p.text })),
  );
  if ("error" in r)
    return {
      error: r.error === "no_key" ? "AI 키가 필요해요." : "추천에 실패했어요.",
    };
  return { note: r.note };
}

/** 독해 확인 문항 AI 추천 (교사 보조) */
export async function suggestChecksAction(
  passageId: string,
): Promise<{ checks?: CheckQuestionsInput; error?: string }> {
  const { supabase, user } = await requireTeacher();
  const { data: passage } = await supabase
    .from("passages")
    .select("title, created_by")
    .eq("id", passageId)
    .single();
  if (!passage || passage.created_by !== user.id)
    return { error: "권한이 없습니다." };
  const { data: paras } = await supabase
    .from("passage_paragraphs")
    .select("seq, text")
    .eq("passage_id", passageId)
    .order("seq", { ascending: true });
  if (!paras || paras.length === 0) return { error: "문단이 없습니다." };

  const { suggestCheckQuestions } = await import("@/lib/agent/analyze");
  const r = await suggestCheckQuestions(
    passage.title,
    paras.map((p) => ({ seq: p.seq, text: p.text })),
  );
  if ("error" in r)
    return {
      error: r.error === "no_key" ? "AI 키가 필요해요." : "추천에 실패했어요.",
    };
  return { checks: r.checks };
}
