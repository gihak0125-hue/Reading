"use client";

import { useActionState, useState } from "react";
import { login, signup, type AuthState } from "./actions";

const initial: AuthState = {};

export function AuthForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const action = mode === "login" ? login : signup;
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <div className="w-full max-w-sm rounded-xl border border-gray-200 p-6 dark:border-gray-800">
      <div className="mb-6 flex gap-2 text-sm font-medium">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 rounded-md px-3 py-2 ${
            mode === "login"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
          }`}
        >
          로그인
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`flex-1 rounded-md px-3 py-2 ${
            mode === "signup"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
          }`}
        >
          회원가입
        </button>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />

        {mode === "signup" && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-700 dark:text-gray-300">이름</span>
            <input
              name="display_name"
              type="text"
              autoComplete="name"
              placeholder="홍길동"
              className="rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
            />
          </label>
        )}

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-700 dark:text-gray-300">이메일</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-700 dark:text-gray-300">비밀번호</span>
          <input
            name="password"
            type="password"
            required
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="6자 이상"
            className="rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
        </label>

        {mode === "signup" && (
          <fieldset className="flex flex-col gap-2 text-sm">
            <span className="text-gray-700 dark:text-gray-300">역할</span>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input type="radio" name="role" value="student" defaultChecked />
                학생
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="role" value="teacher" />
                교사
              </label>
            </div>
          </fieldset>
        )}

        {state.error && (
          <p className="text-sm text-red-600" role="alert">
            {state.error}
          </p>
        )}
        {state.message && (
          <p className="text-sm text-green-700 dark:text-green-400" role="status">
            {state.message}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending
            ? "처리 중..."
            : mode === "login"
              ? "로그인"
              : "회원가입"}
        </button>
      </form>
    </div>
  );
}
