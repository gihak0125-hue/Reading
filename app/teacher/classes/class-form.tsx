"use client";

import { useActionState } from "react";
import { createClass, type ClassState } from "./actions";

const initial: ClassState = {};

export function ClassForm() {
  const [state, formAction, pending] = useActionState(createClass, initial);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-xl border border-gray-200 p-5 dark:border-gray-800"
    >
      <h2 className="font-semibold">새 학급 만들기</h2>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="text-gray-700 dark:text-gray-300">학급 이름</span>
          <input
            name="name"
            required
            placeholder="예: 3학년 2반"
            className="rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "생성 중..." : "만들기"}
        </button>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && (
        <p className="text-sm text-green-700 dark:text-green-400">{state.ok}</p>
      )}
    </form>
  );
}
