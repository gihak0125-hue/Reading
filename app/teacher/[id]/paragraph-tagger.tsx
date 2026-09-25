"use client";

import { useRef, useState, useTransition } from "react";
import { addKeyInfo, deleteKeyInfo } from "../actions";

type KeyInfo = {
  id: string;
  span_start: number;
  span_end: number;
  kind: "keyword" | "key_sentence";
};

export function ParagraphTagger({
  passageId,
  paragraphId,
  seq,
  text,
  keyInfos,
}: {
  passageId: string;
  paragraphId: string;
  seq: number;
  text: string;
  keyInfos: KeyInfo[];
}) {
  const pRef = useRef<HTMLParagraphElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function currentSelection(): { start: number; end: number } | null {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
    const el = pRef.current;
    if (!el) return null;
    // 선택의 시작/끝이 이 문단 텍스트 노드 안에 있는지 확인
    if (!el.contains(sel.anchorNode) || !el.contains(sel.focusNode)) return null;
    const a = sel.anchorOffset;
    const b = sel.focusOffset;
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

  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-400">문단 {seq}</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => tag("keyword")}
            disabled={pending}
            className="rounded-md bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-200 disabled:opacity-50 dark:bg-amber-900 dark:text-amber-200"
          >
            + 핵심어
          </button>
          <button
            type="button"
            onClick={() => tag("key_sentence")}
            disabled={pending}
            className="rounded-md bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-800 hover:bg-sky-200 disabled:opacity-50 dark:bg-sky-900 dark:text-sky-200"
          >
            + 핵심문장
          </button>
        </div>
      </div>

      <p
        ref={pRef}
        className="select-text whitespace-pre-wrap leading-relaxed text-gray-800 dark:text-gray-100"
      >
        {text}
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
                {k.kind === "keyword" ? "핵심어" : "핵심문장"}
              </span>
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
