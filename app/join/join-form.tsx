"use client";

import { useActionState } from "react";
import { joinClass, type JoinState } from "./actions";

const initial: JoinState = {};

export function JoinForm() {
  const [state, formAction, pending] = useActionState(joinClass, initial);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-xl border border-gray-200 p-5 dark:border-gray-800"
    >
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-gray-700 dark:text-gray-300">참여코드</span>
        <input
          name="code"
          required
          autoCapitalize="characters"
          placeholder="예: A2K7QP"
          className="rounded-md border border-gray-300 px-3 py-2 font-mono text-lg tracking-widest uppercase dark:border-gray-700 dark:bg-gray-900"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "참여 중..." : "학급 참여하기"}
      </button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && (
        <p className="text-sm text-green-700 dark:text-green-400">{state.ok}</p>
      )}
    </form>
  );
}
