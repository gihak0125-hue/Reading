"use client";

import { useState, useTransition } from "react";
import { saveMarkingRubric, suggestRubricAction } from "../actions";

export function MarkingRubric({
  passageId,
  initialRubric,
}: {
  passageId: string;
  initialRubric: string;
}) {
  const [rubric, setRubric] = useState(initialRubric);
  const [pending, start] = useTransition();
  const [suggesting, startSuggest] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function suggest() {
    setMsg(null);
    startSuggest(async () => {
      const r = await suggestRubricAction(passageId, "marking");
      if (r.error) setMsg(r.error);
      else if (r.rubric) {
        setRubric(r.rubric);
        setMsg("AI 추천을 넣었어요. 확인·수정 후 저장하세요.");
      } else setMsg("추천 결과가 비었어요.");
    });
  }

  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-semibold">
          표시 채점 루브릭{" "}
          <span className="text-xs font-normal text-gray-400">
            (선택 · 학생에게 노출 안 됨)
          </span>
        </h2>
        <button
          type="button"
          onClick={suggest}
          disabled={suggesting}
          className="shrink-0 rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {suggesting ? "AI 추천 중…" : "✨ AI 추천"}
        </button>
      </div>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        학생이 읽으며 남긴 <b>표시(밑줄·동그라미·관계)</b>를 아래 문단별 정답
        기준과 비교해 점수를 낼 때, AI가 이 루브릭의 배점·기준을 최우선으로
        적용합니다. 비워 두면 기본 기준(핵심정보·관계 <b>정확도</b>)으로
        채점합니다. <span className="text-gray-400">표시 '양'은 점수에 넣지 않고
        데이터로만 수집해요 — 많이 칠한다고 점수가 오르거나 내리지 않아요.</span>
      </p>
      <label className="mt-3 flex flex-col gap-1 text-sm">
        <span className="font-medium">채점 기준·배점</span>
        <textarea
          value={rubric}
          onChange={(e) => setRubric(e.target.value)}
          rows={4}
          maxLength={1000}
          placeholder="예) 중심화제 동그라미 정확 30점 · 중심문장 밑줄 40점 · 문단 간 관계 연결 30점. 표시한 곳이 핵심과 맞는지(정확도)로 평가 — 양은 채점에 넣지 않음."
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
