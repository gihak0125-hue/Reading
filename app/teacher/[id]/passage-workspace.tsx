"use client";

import { useState } from "react";
import { ParagraphTagger } from "./paragraph-tagger";
import { AiSuggest } from "./ai-suggest";
import type { KeyInfoSuggest, RelationSuggest } from "../actions";

export const REL_LABEL: Record<string, string> = {
  cause_effect: "인과",
  process: "과정",
  compare_contrast: "비교·대조",
  problem_solution: "문제-해결",
  question_answer: "문답",
  listing: "나열",
  similarity: "공통점",
  contrast: "차이점",
};

type Para = { id: string; seq: number; text: string };
type KeyInfo = {
  id: string;
  paragraph_id: string;
  span_start: number;
  span_end: number;
  kind: "keyword" | "key_sentence";
};
type Relation = {
  id: string;
  from_paragraph_id: string;
  from_start: number;
  from_end: number;
  to_paragraph_id: string;
  to_start: number;
  to_end: number;
  relation_type: string;
};

// 한 문단에 찍히는 관계 양끝 밑줄 마크
export type RelMark = { start: number; end: number; label: string; preview: boolean };
// 본문 인라인 미리보기용(저장 전) 핵심정보
export type PreviewKey = {
  spanStart: number;
  spanEnd: number;
  kind: "keyword" | "key_sentence";
};

export function PassageWorkspace({
  passageId,
  paragraphs,
  keyInfos,
  relations,
}: {
  passageId: string;
  paragraphs: Para[];
  keyInfos: KeyInfo[];
  relations: Relation[];
}) {
  const [preview, setPreview] = useState<{
    keyInfos: KeyInfoSuggest[];
    relations: RelationSuggest[];
  } | null>(null);

  const savedByPara = new Map<string, KeyInfo[]>();
  for (const k of keyInfos) {
    const arr = savedByPara.get(k.paragraph_id) ?? [];
    arr.push(k);
    savedByPara.set(k.paragraph_id, arr);
  }

  const previewByPara = new Map<string, PreviewKey[]>();
  for (const k of preview?.keyInfos ?? []) {
    const arr = previewByPara.get(k.paragraphId) ?? [];
    arr.push({ spanStart: k.spanStart, spanEnd: k.spanEnd, kind: k.kind });
    previewByPara.set(k.paragraphId, arr);
  }

  // 문단별 관계 양끝 마크(저장된 관계 + 미리보기 관계)
  const relMarksByPara = new Map<string, RelMark[]>();
  const push = (pid: string, m: RelMark) => {
    const arr = relMarksByPara.get(pid) ?? [];
    arr.push(m);
    relMarksByPara.set(pid, arr);
  };
  for (const r of relations) {
    const label = REL_LABEL[r.relation_type] ?? "관계";
    push(r.from_paragraph_id, { start: r.from_start, end: r.from_end, label, preview: false });
    push(r.to_paragraph_id, { start: r.to_start, end: r.to_end, label, preview: false });
  }
  for (const r of preview?.relations ?? []) {
    const label = REL_LABEL[r.relationType] ?? "관계";
    push(r.fromParagraphId, { start: r.fromStart, end: r.fromEnd, label, preview: true });
    push(r.toParagraphId, { start: r.toStart, end: r.toEnd, label, preview: true });
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {paragraphs.map((p) => (
          <ParagraphTagger
            key={p.id}
            passageId={passageId}
            paragraphId={p.id}
            seq={p.seq}
            text={p.text}
            keyInfos={savedByPara.get(p.id) ?? []}
            previewKeyInfos={previewByPara.get(p.id) ?? []}
            relMarks={relMarksByPara.get(p.id) ?? []}
          />
        ))}
      </div>

      <AiSuggest passageId={passageId} onPreview={setPreview} />
    </>
  );
}
