import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CoachContext } from "@/lib/agent/coach";

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

/** 관계 그래프 구조 분석(연쇄/분기/수렴) — actions.ts와 동일 로직 */
function describeRelationGraph(
  edges: { from: string; to: string; relation: string }[],
): string {
  const clip = (s: string) => (s.length > 24 ? s.slice(0, 24) + "…" : s);
  const q = (s: string) => `"${clip(s)}"`;
  const out = new Map<string, Map<string, string>>();
  const inc = new Map<string, Set<string>>();
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
  for (const [n, tos] of out) {
    if (tos.size >= 2)
      lines.push("분기: " + q(n) + " → " + [...tos.keys()].map(q).join(", "));
  }
  for (const [n, froms] of inc) {
    if (froms.size >= 2)
      lines.push("수렴: " + [...froms].map(q).join(", ") + " → " + q(n));
  }
  return lines.slice(0, 8).join("\n");
}

type DB = SupabaseClient;
export type CoachMode =
  | "chat"
  | "activity"
  | "critique"
  | "check"
  | "predict"
  | "hidden";

export type LoadedCoachContext = {
  ctx: CoachContext;
  checkItems: { kind: string; q: string; a: string }[];
  passageText: string;
  marksText: string;
  /** 활동 피드백인데 표시·관계가 전혀 없으면 true(조용히 넘어감) */
  skip: boolean;
};

/**
 * 코치 호출에 필요한 컨텍스트를 모은다(스트리밍 라우트/서버액션 공용).
 * sendCoachMessage의 수집 로직과 동일하며, DB 쿼리는 병렬화되어 있다.
 */
export async function loadCoachContext(
  supabase: DB,
  svc: DB | null,
  sessionId: string,
  input: { text: string; mode?: CoachMode; hint?: boolean },
): Promise<LoadedCoachContext> {
  const [{ data: session }, { data: annos }, { data: history }] =
    await Promise.all([
      supabase.from("sessions").select("passage_id").eq("id", sessionId).single(),
      supabase
        .from("annotations")
        .select(
          "id, paragraph_id, type, span_start, span_end, target_ref, from_ref, relation_type",
        )
        .eq("session_id", sessionId),
      supabase
        .from("agent_messages")
        .select("role, content, created_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true }),
    ]);

  const [{ data: passage }, { data: paragraphs }] = await Promise.all([
    supabase
      .from("passages")
      .select("title")
      .eq("id", session?.passage_id ?? "")
      .single(),
    supabase
      .from("passage_paragraphs")
      .select("id, seq, text")
      .eq("passage_id", session?.passage_id ?? "")
      .order("seq", { ascending: true }),
  ]);

  const paraText = new Map<string, string>();
  for (const p of paragraphs ?? []) paraText.set(p.id, p.text as string);
  type Anno = {
    id: string;
    paragraph_id: string;
    type: string;
    span_start: number;
    span_end: number;
    target_ref: string | null;
    from_ref: string | null;
    relation_type: string | null;
  };
  const annoList = (annos ?? []) as Anno[];
  const annoById = new Map<string, Anno>();
  for (const a of annoList) annoById.set(a.id, a);
  const markText = (id: string | null) => {
    const a = id ? annoById.get(id) : null;
    if (!a) return "";
    return (paraText.get(a.paragraph_id) ?? "").slice(a.span_start, a.span_end);
  };

  let keyInfos: string[] = [];
  let keyRelations: { from: string; to: string; relation: string }[] = [];
  let critiqueNote = "";
  const checkItems: { kind: string; q: string; a: string }[] = [];
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
          .select("detail_q, detail_a, main_q, main_a, inference_q, inference_a")
          .eq("passage_id", session.passage_id)
          .maybeSingle(),
      ]);
    keyInfos = (ki ?? [])
      .map((k) => {
        const t = (paraText.get(k.paragraph_id) ?? "").slice(k.span_start, k.span_end);
        return `(${k.kind === "keyword" ? "중심화제" : "핵심문장"}) ${t}`;
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
    const pcr = pc as Record<string, string | null> | null;
    if (pcr) {
      const add = (kind: string, qv?: string | null, av?: string | null) => {
        if (qv && qv.trim()) checkItems.push({ kind, q: qv.trim(), a: (av ?? "").trim() });
      };
      add("세부", pcr.detail_q, pcr.detail_a);
      add("중심", pcr.main_q, pcr.main_a);
      add("추론", pcr.inference_q, pcr.inference_a);
    }
  }

  const { data: diagRows } = await supabase
    .from("diagnoses")
    .select("difficulty_area, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(6);
  const recentAreas = (diagRows ?? [])
    .map((d) => d.difficulty_area)
    .filter((a: unknown): a is string => !!a);

  const marks = annoList
    .filter((a) => a.type === "underline" || a.type === "circle")
    .map((a) => ({
      type: a.type,
      text: (paraText.get(a.paragraph_id) ?? "").slice(a.span_start, a.span_end),
    }));
  const relations = annoList
    .filter((a) => a.type === "arrow")
    .map((a) => {
      const rt = a.relation_type ?? "listing";
      const hasFrom = !!a.from_ref;
      const hasTo = !!a.target_ref;
      if (hasFrom !== hasTo) {
        let role = REL_KO[rt] ?? "관계";
        if (rt === "problem_solution") role = hasFrom ? "문제" : "해결";
        else if (rt === "question_answer") role = hasFrom ? "질문" : "답";
        else if (rt === "cause_effect") role = hasFrom ? "원인" : "결과";
        return { from: markText(hasFrom ? a.from_ref : a.target_ref), to: "", relation: role };
      }
      return { from: markText(a.from_ref), to: markText(a.target_ref), relation: REL_KO[rt] ?? "관계" };
    });

  const relationGraph = describeRelationGraph(relations.filter((r) => r.from && r.to));
  const passageText = (paragraphs ?? []).map((p) => p.text).join("\n\n");
  const marksText = marks
    .map((m) => `- (${m.type === "circle" ? "동그라미" : "밑줄"}) ${m.text}`)
    .join("\n");
  const skip = input.mode === "activity" && marks.length === 0 && relations.length === 0;

  const ctx: CoachContext = {
    passageTitle: (passage?.title as string) ?? "",
    passageText,
    marks,
    relations,
    history: (history ?? []).map((h) => ({
      role: h.role === "agent" ? "agent" : "student",
      content: h.content as string,
    })),
    studentMessage: input.text,
    hintRequested: input.hint,
    mode: input.mode ?? "chat",
    keyInfos,
    keyRelations,
    recentAreas,
    critiqueNote,
    checkItems,
    relationGraph,
  };

  return { ctx, checkItems, passageText, marksText, skip };
}
