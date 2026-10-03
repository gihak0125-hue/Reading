"use client";

import { useState, useTransition } from "react";
import { saveCritiqueNote } from "../actions";

export function CritiqueNote({
  passageId,
  initial,
}: {
  passageId: string;
  initial: string;
}) {
  const [note, setNote] = useState(initial);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
      <h2 className="font-semibold">
        관점 평가 가이드{" "}
        <span className="text-xs font-normal text-gray-400">
          (선택 · 학생에게 노출 안 됨)
        </span>
      </h2>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        글에 담긴 관점·핵심 주장·전제와 평가 기준을 적어두면, 읽은 뒤 &lsquo;관점
        평가&rsquo; 대화에서 코치가 이를 근거로 돕습니다. (정답을 그대로 말하진
        않고 학생이 스스로 적용하게 유도)
      </p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={4}
        maxLength={1500}
        placeholder="예) 관점A(필자): ~주장, 전제 ~. 관점B: ~. 평가 기준: ~. 근거 자료(통계·사례·인용) 신뢰성: ~"
        className="mt-2 w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setMsg(null);
            start(async () => {
              const r = await saveCritiqueNote(passageId, note);
              setMsg(r.error ?? "저장했어요.");
            });
          }}
          className="rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-60"
        >
          {pending ? "저장 중…" : "저장"}
        </button>
        {msg && <span className="text-xs text-gray-500">{msg}</span>}
      </div>
    </div>
  );
}
