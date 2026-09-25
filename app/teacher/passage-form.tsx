"use client";

import { useActionState } from "react";
import { createPassage, type PassageState } from "./actions";

const initial: PassageState = {};

export function PassageForm() {
  const [state, formAction, pending] = useActionState(createPassage, initial);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-xl border border-gray-200 p-6 dark:border-gray-800"
    >
      <h2 className="text-lg font-semibold">새 지문 등록</h2>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-gray-700 dark:text-gray-300">제목</span>
        <input
          name="title"
          required
          placeholder="예: 생태계의 물질 순환"
          className="rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-gray-700 dark:text-gray-300">
          본문{" "}
          <span className="text-gray-400">
            (문단은 <b>빈 줄</b>로 구분하세요)
          </span>
        </span>
        <textarea
          name="body"
          required
          rows={12}
          placeholder={
            "첫 번째 문단 내용...\n\n두 번째 문단 내용...\n\n세 번째 문단 내용..."
          }
          className="rounded-md border border-gray-300 px-3 py-2 font-mono text-sm leading-relaxed dark:border-gray-700 dark:bg-gray-900"
        />
      </label>

      <div className="flex flex-wrap gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-700 dark:text-gray-300">난이도(선택)</span>
          <select
            name="difficulty"
            defaultValue=""
            className="rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="">미지정</option>
            <option value="1">1 (쉬움)</option>
            <option value="2">2</option>
            <option value="3">3 (보통)</option>
            <option value="4">4</option>
            <option value="5">5 (어려움)</option>
          </select>
        </label>

        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="text-gray-700 dark:text-gray-300">출처(선택)</span>
          <input
            name="source"
            placeholder="예: 2024 수능특강 국어"
            className="rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
        </label>
      </div>

      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "저장 중..." : "지문 등록"}
      </button>
    </form>
  );
}
