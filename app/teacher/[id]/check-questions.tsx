"use client";

import { useState, useTransition } from "react";
import {
  saveCheckQuestions,
  suggestChecksAction,
  type CheckQuestionsInput,
} from "../actions";

const ROWS: { q: keyof CheckQuestionsInput; a: keyof CheckQuestionsInput; label: string; hint: string }[] = [
  { q: "detail_q", a: "detail_a", label: "세부", hint: "글에 명시된 구체적 사실" },
  { q: "main_q", a: "main_a", label: "중심", hint: "문단·글 전체의 요지" },
  { q: "inference_q", a: "inference_a", label: "추론", hint: "드러나지 않은 의미·필자 의도" },
];

export function CheckQuestions({
  passageId,
  initial,
}: {
  passageId: string;
  initial: CheckQuestionsInput;
}) {
  const [v, setV] = useState<CheckQuestionsInput>(initial);
  const [pending, start] = useTransition();
  const [suggesting, startSuggest] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const set = (k: keyof CheckQuestionsInput, val: string) =>
    setV((p) => ({ ...p, [k]: val }));

  function suggest() {
    setMsg(null);
    startSuggest(async () => {
      const r = await suggestChecksAction(passageId);
      if (r.error) setMsg(r.error);
      else if (r.checks) {
        setV((prev) => ({ ...prev, ...r.checks }));
        setMsg("AI 추천을 넣었어요. 확인·수정 후 저장하세요.");
      } else setMsg("추천 결과가 비었어요.");
    });
  }

  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">
            독해 확인 문항{" "}
            <span className="text-xs font-normal text-gray-400">
              (선택 · 읽은 뒤 코치가 사용)
            </span>
          </h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            세부·중심·추론 문항을 적어두면 학생이 읽은 뒤 코치가 순서대로
            물어봐요. 모범답안 가이드는 채점 근거로만 쓰이고 학생에게 노출되지
            않습니다. (비워 두면 코치가 알아서 만듭니다)
          </p>
        </div>
        <button
          type="button"
          onClick={suggest}
          disabled={suggesting}
          className="shrink-0 rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {suggesting ? "AI 추천 중…" : "✨ AI 추천"}
        </button>
      </div>
      <div className="mt-3 flex flex-col gap-4">
        {ROWS.map((r) => (
          <div key={r.q} className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">
              {r.label}{" "}
              <span className="text-xs font-normal text-gray-400">
                — {r.hint}
              </span>
            </span>
            <input
              value={v[r.q]}
              onChange={(e) => set(r.q, e.target.value)}
              maxLength={300}
              placeholder="문항"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            />
            <input
              value={v[r.a]}
              onChange={(e) => set(r.a, e.target.value)}
              maxLength={400}
              placeholder="모범답안 가이드 (학생 비노출)"
              className="rounded-md border border-dashed border-gray-300 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-900"
            />
          </div>
        ))}
      </div>
      <label className="mt-3 flex flex-col gap-1 text-sm">
        <span className="font-medium">
          채점 루브릭{" "}
          <span className="text-xs font-normal text-gray-400">
            (선택 · 서술형 채점 기준·배점. 있으면 AI가 이 기준으로 채점)
          </span>
        </span>
        <textarea
          value={v.rubric}
          onChange={(e) => set("rubric", e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="예) 세부: 글에 명시된 사실 정확히 제시 50점 · 중심: 문단 요지 포착 30점 · 근거 인용 20점"
          className="rounded-md border border-dashed border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
        />
      </label>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setMsg(null);
            start(async () => {
              const res = await saveCheckQuestions(passageId, v);
              setMsg(res.error ?? "저장했어요.");
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
