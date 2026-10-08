"use client";

import { useState, useTransition } from "react";
import { saveMarkingRubric } from "../actions";

export function MarkingRubric({
  passageId,
  initialRubric,
}: {
  passageId: string;
  initialRubric: string;
}) {
  const [rubric, setRubric] = useState(initialRubric);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
      <h2 className="font-semibold">
        표시 채점 루브릭{" "}
        <span className="text-xs font-normal text-gray-400">
          (선택 · 학생에게 노출 안 됨)
        </span>
      </h2>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        학생이 읽으며 남긴 <b>표시(밑줄·동그라미·관계)</b>를 아래 문단별 정답
        기준과 비교해 점수를 낼 때, AI가 이 루브릭의 배점·기준을 최우선으로
        적용합니다. 비워 두면 기본 기준(핵심정보·관계 정확도)으로 채점합니다.
      </p>
      <label className="mt-3 flex flex-col gap-1 text-sm">
        <span className="font-medium">채점 기준·배점</span>
        <textarea
          value={rubric}
          onChange={(e) => setRubric(e.target.value)}
          rows={4}
          maxLength={1000}
          placeholder="예) 중심화제 동그라미 정확 30점 · 핵심문장 밑줄 40점 · 문단 간 관계 연결 30점. 핵심 누락/과잉 표시는 감점."
          className="w-full resize-y rounded-md border border-dashed border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
        />
      </label>
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setMsg(null);
            start(async () => {
              const r = await saveMarkingRubric(passageId, rubric);
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
