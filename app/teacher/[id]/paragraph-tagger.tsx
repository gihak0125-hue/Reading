"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { addKeyInfo, deleteKeyInfo } from "../actions";
import type { PreviewKey, RelMark } from "./passage-workspace";

type KeyInfo = {
  id: string;
  span_start: number;
  span_end: number;
  kind: "keyword" | "key_sentence";
  rank?: number | null;
};

export function ParagraphTagger({
  passageId,
  paragraphId,
  seq,
  text,
  keyInfos,
  previewKeyInfos = [],
  relMarks = [],
}: {
  passageId: string;
  paragraphId: string;
  seq: number;
  text: string;
  keyInfos: KeyInfo[];
  previewKeyInfos?: PreviewKey[];
  relMarks?: RelMark[];
}) {
  const pRef = useRef<HTMLParagraphElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // 문단 안에서 선택 구간을 '원문 글자 오프셋'으로 환산.
  // 하이라이트 <span> 때문에 문단이 여러 텍스트 노드로 나뉘어도 정확히 계산한다.
  function absOffset(node: Node, offset: number): number {
    const root = pRef.current;
    if (!root) return offset;
    let total = 0;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    while ((n = walker.nextNode())) {
      if (n === node) return total + offset;
      total += n.textContent?.length ?? 0;
    }
    return total + offset;
  }

  function currentSelection(): { start: number; end: number } | null {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
    const el = pRef.current;
    if (!el) return null;
    if (!el.contains(sel.anchorNode) || !el.contains(sel.focusNode)) return null;
    const a = absOffset(sel.anchorNode!, sel.anchorOffset);
    const b = absOffset(sel.focusNode!, sel.focusOffset);
    const start = Math.min(a, b);
    const end = Math.max(a, b);
    if (end <= start) return null;
    return { start, end };
  }

  function tag(kind: "keyword" | "key_sentence") {
    const range = currentSelection();
    if (!range) {
      setMsg("문단에서 표시할 부분을 드래그로 선택한 뒤 눌러주세요.");
      return;
    }
    setMsg(null);
    startTransition(async () => {
      const res = await addKeyInfo({
        passageId,
        paragraphId,
        spanStart: range.start,
        spanEnd: range.end,
        kind,
      });
      if (res.error) setMsg(res.error);
      else window.getSelection()?.removeAllRanges();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteKeyInfo(id, passageId);
    });
  }

  // ===== 본문 인라인 하이라이트 렌더 =====
  // 배경(핵심정보, 저장/미리보기) + 밑줄(관계 양끝)을 경계로 쪼개 겹침까지 처리.
  function rendered(): ReactNode[] {
    const bg = [
      ...keyInfos.map((k) => ({
        start: k.span_start,
        end: k.span_end,
        kind: k.kind,
        preview: false,
        rank: (k.rank ?? undefined) as number | undefined,
      })),
      ...previewKeyInfos.map((k) => ({
        start: k.spanStart,
        end: k.spanEnd,
        kind: k.kind,
        preview: true,
        rank: k.rank,
      })),
    ].filter((m) => m.end > m.start);
    const rel = relMarks.filter((m) => m.end > m.start);

    if (bg.length === 0 && rel.length === 0) return [text];

    const pts = new Set<number>([0, text.length]);
    for (const m of [...bg, ...rel]) {
      if (m.start >= 0 && m.start <= text.length) pts.add(m.start);
      if (m.end >= 0 && m.end <= text.length) pts.add(m.end);
    }
    const sorted = [...pts].sort((a, b) => a - b);
    const out: ReactNode[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      if (b <= a) continue;
      const seg = text.slice(a, b);
      const bgm = bg.find((m) => m.start <= a && m.end >= b);
      const relCovers = rel.filter((m) => m.start <= a && m.end >= b);
      const relm = relCovers[0];
      if (!bgm && !relm) {
        out.push(seg);
        continue;
      }
      let cls = "rounded-[3px] px-[1px] ";
      if (bgm) {
        if (bgm.kind === "keyword")
          cls += bgm.preview
            ? "bg-amber-50 text-amber-900 border-b-2 border-dashed border-amber-500 dark:bg-amber-950/40 dark:text-amber-200 "
            : "bg-amber-200/80 text-amber-900 dark:bg-amber-800/60 dark:text-amber-100 ";
        else if (bgm.preview)
          // 중심문장 미리보기: 중요도 순위가 높을수록(1) 진하게
          cls +=
            (bgm.rank ?? 9) <= 1
              ? "bg-sky-100 text-sky-900 border-b-2 border-dashed border-sky-600 dark:bg-sky-900/50 dark:text-sky-100 "
              : (bgm.rank ?? 9) === 2
                ? "bg-sky-50 text-sky-900 border-b-2 border-dashed border-sky-400 dark:bg-sky-950/40 dark:text-sky-200 "
                : "bg-sky-50/60 text-sky-800 border-b border-dashed border-sky-300 dark:bg-sky-950/25 dark:text-sky-300 ";
        else
          // 저장된 중심문장: 순위가 높을수록(1) 진하게. 순위 없으면(수동) 기본 중간톤.
          cls +=
            bgm.rank === 1
              ? "bg-sky-300 text-sky-950 dark:bg-sky-700/70 dark:text-sky-50 "
              : bgm.rank === 2
                ? "bg-sky-200/80 text-sky-900 dark:bg-sky-800/60 dark:text-sky-100 "
                : bgm.rank && bgm.rank >= 3
                  ? "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200 "
                  : "bg-sky-200/80 text-sky-900 dark:bg-sky-800/60 dark:text-sky-100 ";
      }
      if (relm) {
        cls += relm.preview
          ? "underline decoration-dashed decoration-violet-500 decoration-2 underline-offset-[3px] "
          : "underline decoration-violet-500 decoration-2 underline-offset-[3px] ";
      }
      // 화살표 앵커: 이 구간을 덮는 모든 관계 양끝을 "idx:role"로 표기
      const ep = relCovers.length
        ? relCovers.map((m) => `${m.idx}:${m.role}`).join(" ")
        : undefined;
      out.push(
        <span
          key={a}
          className={cls}
          data-ep={ep}
          title={relm ? `관계: ${relm.label}` : undefined}
        >
          {seg}
        </span>,
      );
    }
    return out;
  }

  const hasPreview = previewKeyInfos.length > 0 || relMarks.some((m) => m.preview);

  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-400">
          문단 {seq}
          {hasPreview && (
            <span className="ml-2 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-950 dark:text-violet-300">
              AI 추천 미리보기
            </span>
          )}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => tag("keyword")}
            disabled={pending}
            className="rounded-md bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-200 disabled:opacity-50 dark:bg-amber-900 dark:text-amber-200"
          >
            + 중심화제
          </button>
          <button
            type="button"
            onClick={() => tag("key_sentence")}
            disabled={pending}
            className="rounded-md bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-800 hover:bg-sky-200 disabled:opacity-50 dark:bg-sky-900 dark:text-sky-200"
          >
            + 중심문장
          </button>
        </div>
      </div>

      <p
        ref={pRef}
        className="select-text whitespace-pre-wrap leading-relaxed text-gray-800 dark:text-gray-100"
      >
        {rendered()}
      </p>

      {msg && <p className="mt-2 text-xs text-red-600">{msg}</p>}

      {keyInfos.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5 border-t border-gray-100 pt-3 dark:border-gray-800">
          {keyInfos.map((k) => (
            <li key={k.id} className="flex items-center gap-2 text-sm">
              <span
                className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                  k.kind === "keyword"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                    : "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200"
                }`}
              >
                {k.kind === "keyword" ? "중심화제" : "중심문장"}
              </span>
              {k.kind === "key_sentence" && k.rank ? (
                <span
                  className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                    k.rank === 1
                      ? "bg-sky-600 text-white"
                      : k.rank === 2
                        ? "bg-sky-200 text-sky-800 dark:bg-sky-800 dark:text-sky-100"
                        : "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-200"
                  }`}
                >
                  {k.rank}순위
                </span>
              ) : null}
              <span className="min-w-0 flex-1 truncate text-gray-700 dark:text-gray-300">
                “{text.slice(k.span_start, k.span_end)}”
              </span>
              <button
                type="button"
                onClick={() => remove(k.id)}
                disabled={pending}
                className="text-xs text-red-500 hover:underline disabled:opacity-50"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
