"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updatePassage, type PassageState } from "../../actions";

const initial: PassageState = {};

export function EditForm({
  id,
  title,
  body,
  difficulty,
  source,
}: {
  id: string;
  title: string;
  body: string;
  difficulty: number | null;
  source: string | null;
}) {
  const [state, formAction, pending] = useActionState(updatePassage, initial);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-xl border border-gray-200 p-6 dark:border-gray-800"
    >
      <input type="hidden" name="id" value={id} />

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-gray-700 dark:text-gray-300">제목</span>
        <input
          name="title"
          required
          defaultValue={title}
          className="rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-gray-700 dark:text-gray-300">
          본문{" "}
          <span className="text-gray-400">
            (문단은 <b>빈 줄</b>로 구분)
          </span>
        </span>
        <textarea
          name="body"
          required
          rows={12}
          defaultValue={body}
          className="rounded-md border border-gray-300 px-3 py-2 font-mono text-sm leading-relaxed dark:border-gray-700 dark:bg-gray-900"
        />
        <span className="text-xs text-amber-600">
          ⚠️ 본문을 바꾸면 문단이 다시 나뉘어 <b>핵심정보 태깅이 초기화</b>돼요.
          (제목·난이도·출처만 바꾸면 태깅은 유지)
        </span>
      </label>

      <div className="flex flex-wrap gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-700 dark:text-gray-300">난이도(선택)</span>
          <select
            name="difficulty"
            defaultValue={difficulty ? String(difficulty) : ""}
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
            defaultValue={source ?? ""}
            className="rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
        </label>
      </div>

      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "저장 중..." : "저장"}
        </button>
        <Link
          href={`/teacher/${id}`}
          className="rounded-md border border-gray-300 px-4 py-2.5 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          취소
        </Link>
      </div>
    </form>
  );
}
