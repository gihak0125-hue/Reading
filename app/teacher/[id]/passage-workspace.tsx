"use client";

import { useEffect, useRef, useState } from "react";
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

// 관계별 화살표 색
const REL_HEX: Record<string, string> = {
  cause_effect: "#2563eb", // blue
  process: "#0284c7", // sky
  compare_contrast: "#e11d48", // rose
  contrast: "#e11d48",
  problem_solution: "#7c3aed", // violet
  question_answer: "#0d9488", // teal
  similarity: "#0d9488", // teal
  listing: "#d97706", // amber
};
const relHex = (t: string) => REL_HEX[t] ?? "#7c3aed";

type Para = { id: string; seq: number; text: string };
type KeyInfo = {
  id: string;
  paragraph_id: string;
  span_start: number;
  span_end: number;
  kind: "keyword" | "key_sentence";
  rank?: number | null;
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

// 한 문단에 찍히는 관계 양끝 밑줄 마크(+화살표 앵커용 idx·role)
export type RelMark = {
  start: number;
  end: number;
  label: string;
  preview: boolean;
  idx: number;
  role: "from" | "to";
};
// 본문 인라인 미리보기용(저장 전) 핵심정보
export type PreviewKey = {
  spanStart: number;
  spanEnd: number;
  kind: "keyword" | "key_sentence";
  rank?: number;
};

type AllRel = {
  idx: number;
  relationType: string;
  preview: boolean;
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
  const bodyRef = useRef<HTMLDivElement>(null);

  const overlap = (
    aStart: number,
    aEnd: number,
    bStart: number,
    bEnd: number,
  ) => aStart < bEnd && bStart < aEnd;

  // 저장된 핵심정보: 같은 문단·같은 종류에서 겹치는 건 하나만(이전에 쌓인 중복 숨김)
  const savedByPara = new Map<string, KeyInfo[]>();
  for (const k of keyInfos) {
    const arr = savedByPara.get(k.paragraph_id) ?? [];
    if (
      arr.some(
        (x) => x.kind === k.kind && overlap(x.span_start, x.span_end, k.span_start, k.span_end),
      )
    )
      continue;
    arr.push(k);
    savedByPara.set(k.paragraph_id, arr);
  }

  // 미리보기: 이미 저장된 것과 겹치면(이미 반영됨) 중복 표시 안 함
  const previewByPara = new Map<string, PreviewKey[]>();
  for (const k of preview?.keyInfos ?? []) {
    const saved = savedByPara.get(k.paragraphId) ?? [];
    if (
      saved.some(
        (x) => x.kind === k.kind && overlap(x.span_start, x.span_end, k.spanStart, k.spanEnd),
      )
    )
      continue;
    const arr = previewByPara.get(k.paragraphId) ?? [];
    if (arr.some((x) => x.kind === k.kind && overlap(x.spanStart, x.spanEnd, k.spanStart, k.spanEnd)))
      continue;
    arr.push({
      spanStart: k.spanStart,
      spanEnd: k.spanEnd,
      kind: k.kind,
      rank: k.rank,
    });
    previewByPara.set(k.paragraphId, arr);
  }

  // 저장된 관계 + 미리보기 관계를 하나의 배열로(전역 idx 부여)
  const allRels: AllRel[] = [];
  const relMarksByPara = new Map<string, RelMark[]>();
  const push = (pid: string, m: RelMark) => {
    const arr = relMarksByPara.get(pid) ?? [];
    arr.push(m);
    relMarksByPara.set(pid, arr);
  };
  const seenRel = new Set<string>();
  const symmetric = (t: string) =>
    t === "similarity" || t === "contrast" || t === "compare_contrast";
  const addRel = (
    fromPid: string,
    fs: number,
    fe: number,
    toPid: string,
    ts: number,
    te: number,
    type: string,
    isPreview: boolean,
  ) => {
    // 중복 제거: 같은 양끝·같은 유형(대칭 관계는 방향 무시)은 한 번만 — 저장본·미리보기 모두
    const a = `${fromPid}:${fs}:${fe}`;
    const b = `${toPid}:${ts}:${te}`;
    const sig = `${type}|${a}|${b}`;
    const rev = `${type}|${b}|${a}`;
    if (seenRel.has(sig) || (symmetric(type) && seenRel.has(rev))) return;
    seenRel.add(sig);
    const idx = allRels.length;
    allRels.push({ idx, relationType: type, preview: isPreview });
    const label = REL_LABEL[type] ?? "관계";
    push(fromPid, { start: fs, end: fe, label, preview: isPreview, idx, role: "from" });
    push(toPid, { start: ts, end: te, label, preview: isPreview, idx, role: "to" });
  };
  for (const r of relations)
    addRel(
      r.from_paragraph_id,
      r.from_start,
      r.from_end,
      r.to_paragraph_id,
      r.to_start,
      r.to_end,
      r.relation_type,
      false,
    );
  for (const r of preview?.relations ?? [])
    addRel(
      r.fromParagraphId,
      r.fromStart,
      r.fromEnd,
      r.toParagraphId,
      r.toStart,
      r.toEnd,
      r.relationType,
      true,
    );

  const depKey = JSON.stringify({
    k: keyInfos.map((k) => k.id),
    r: relations.map((r) => r.id),
    pk: preview?.keyInfos.length ?? 0,
    pr: preview?.relations.length ?? 0,
  });

  return (
    <>
      <div ref={bodyRef} className="relative flex flex-col gap-3">
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
        <RelationArrows containerRef={bodyRef} rels={allRels} depKey={depKey} />
      </div>

      {allRels.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="font-medium">관계:</span>
          {[...new Set(allRels.map((r) => r.relationType))].map((t) => (
            <span key={t} className="inline-flex items-center gap-1">
              <span
                className="inline-block h-2.5 w-4 rounded-full"
                style={{ background: relHex(t) }}
              />
              {REL_LABEL[t] ?? "관계"}
            </span>
          ))}
          <span className="text-gray-400">· 점선 화살표는 저장 전 AI 추천</span>
        </div>
      )}

      <AiSuggest passageId={passageId} onPreview={setPreview} />
    </>
  );
}

// 문단 사이를 곡선 화살표로 잇는 오버레이(본문 위에 겹침, 클릭 통과)
function RelationArrows({
  containerRef,
  rels,
  depKey,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  rels: AllRel[];
  depKey: string;
}) {
  const [paths, setPaths] = useState<
    { idx: number; d: string; hex: string; dir: "one" | "out" | "in"; preview: boolean }[]
  >([]);

  useEffect(() => {
    const wrap = containerRef.current;
    if (!wrap) return;

    const rectOf = (idx: number, role: "from" | "to") => {
      const els = wrap.querySelectorAll<HTMLElement>(`[data-ep~="${idx}:${role}"]`);
      if (!els.length) return null;
      let x1 = Infinity,
        y1 = Infinity,
        x2 = -Infinity,
        y2 = -Infinity;
      els.forEach((el) => {
        const r = el.getBoundingClientRect();
        x1 = Math.min(x1, r.left);
        y1 = Math.min(y1, r.top);
        x2 = Math.max(x2, r.right);
        y2 = Math.max(y2, r.bottom);
      });
      return { cx: (x1 + x2) / 2, cy: (y1 + y2) / 2 };
    };

    const compute = () => {
      const wr = wrap.getBoundingClientRect();
      const out: typeof paths = [];
      for (const r of rels) {
        const fr = rectOf(r.idx, "from");
        const tr = rectOf(r.idx, "to");
        if (!fr || !tr) continue;
        const fx = fr.cx - wr.left;
        const fy = fr.cy - wr.top;
        const tx = tr.cx - wr.left;
        const ty = tr.cy - wr.top;
        const mx = (fx + tx) / 2;
        const my = (fy + ty) / 2;
        const dx = tx - fx;
        const dy = ty - fy;
        const len = Math.hypot(dx, dy) || 1;
        // 수직 배치에서도 한쪽(왼쪽)으로 완만히 휘도록 수직 법선 방향으로 제어점 이동
        let nx = dy / len;
        let ny = -dx / len;
        if (nx > 0) {
          nx = -nx;
          ny = -ny;
        }
        const bow = Math.max(18, Math.min(60, len * 0.22));
        const cx = mx + nx * bow;
        const cy = my + ny * bow;
        const d = `M ${fx.toFixed(1)} ${fy.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)}`;
        const rt = r.relationType;
        const dir: "one" | "out" | "in" =
          rt === "cause_effect" || rt === "process" || rt === "problem_solution"
            ? "one"
            : rt === "similarity"
              ? "in"
              : "out";
        out.push({ idx: r.idx, d, hex: relHex(rt), dir, preview: r.preview });
      }
      setPaths(out);
    };

    const raf = requestAnimationFrame(compute);
    const ro = new ResizeObserver(compute);
    ro.observe(wrap);
    window.addEventListener("resize", compute);
    const t = setTimeout(compute, 60);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      ro.disconnect();
      window.removeEventListener("resize", compute);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, depKey]);

  // 화살촉은 경로별 색이 필요 → 각 경로마다 전용 marker 정의
  return (
    <svg
      className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible"
      aria-hidden
    >
      <defs>
        {paths.map((p) => (
          <g key={`m-${p.idx}`}>
            <marker
              id={`tah-${p.idx}-fwd`}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto"
            >
              <path d="M0,0 L10,5 L0,10 z" fill={p.hex} />
            </marker>
            <marker
              id={`tah-${p.idx}-rev`}
              viewBox="0 0 10 10"
              refX="1"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto"
            >
              <path d="M10,0 L0,5 L10,10 z" fill={p.hex} />
            </marker>
          </g>
        ))}
      </defs>
      {paths.map((p) => (
        <path
          key={p.idx}
          d={p.d}
          fill="none"
          stroke={p.hex}
          strokeWidth={2}
          strokeOpacity={0.9}
          strokeDasharray={p.preview ? "5 4" : undefined}
          markerEnd={`url(#tah-${p.idx}-${p.dir === "in" ? "rev" : "fwd"})`}
          markerStart={
            p.dir === "out"
              ? `url(#tah-${p.idx}-rev)`
              : p.dir === "in"
                ? `url(#tah-${p.idx}-fwd)`
                : undefined
          }
        />
      ))}
    </svg>
  );
}
