"use client";

import { useState, useTransition } from "react";
import { saveCritiqueNote, suggestCritiqueAction } from "../actions";

export function CritiqueNote({
  passageId,
  initial,
  initialRubric,
}: {
  passageId: string;
  initial: string;
  initialRubric: string;
}) {
  const [note, setNote] = useState(initial);
  const [rubric, setRubric] = useState(initialRubric);
  const [pending, start] = useTransition();
  const [suggesting, startSuggest] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function suggest() {
    setMsg(null);
    startSuggest(async () => {
      const r = await suggestCritiqueAction(passageId);
      if (r.error) setMsg(r.error);
      else if (r.note) {
        setNote(r.note);
        setMsg("AI 추천을 넣었어요. 확인·수정 후 저장하세요.");
      } else setMsg("추천 결과가 비었어요.");
    });
  }

  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">
            관점 평가 가이드{" "}
            <span className="text-xs font-normal text-gray-400">
              (선택 · 학생에게 노출 안 됨)
            </span>
          </h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            글에 담긴 관점·핵심 주장·전제와 평가 기준을 적어두면, 읽은 뒤
            &lsquo;관점 평가&rsquo; 대화에서 코치가 이를 근거로 돕습니다. (정답을
            그대로 말하진 않고 학생이 스스로 적용하게 유도)
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
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={4}
        maxLength={1500}
        placeholder="예) 관점A(필자): ~주장, 전제 ~. 관점B: ~. 평가 기준: ~. 근거 자료(통계·사례·인용) 신뢰성: ~"
        className="mt-2 w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
      />
      <label className="mt-3 flex flex-col gap-1 text-sm">
        <span className="font-medium">
          채점 루브릭{" "}
          <span className="text-xs font-normal text-gray-400">
            (선택 · 비판 채점 기준·배점. 있으면 AI가 이 기준으로 채점)
          </span>
        </span>
        <textarea
          value={rubric}
          onChange={(e) => setRubric(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="예) 판단 기준 명료 40점 · 한 관점으로 다른 관점 비판 40점 · 글의 근거 인용 20점"
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
              const r = await saveCritiqueNote(passageId, note, rubric);
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
