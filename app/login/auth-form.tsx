"use client";

import { useActionState, useState } from "react";
import { authenticate, type AuthState } from "./actions";

const initial: AuthState = {};

export function AuthForm({ next }: { next: string }) {
  // null = 아직 선택 전(로그인/회원가입 버튼만), 선택하면 입력창이 열린다.
  const [mode, setMode] = useState<"login" | "signup" | null>(null);
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [state, formAction, pending] = useActionState(authenticate, initial);

  // 선택 전: 큰 버튼 두 개만
  if (mode === null) {
    return (
      <div className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-white/70 bg-white/85 p-6 shadow-xl shadow-amber-900/10 dark:border-white/10 dark:bg-gray-950/90 dark:shadow-black/30">
        <button
          type="button"
          onClick={() => setMode("login")}
          className="rounded-xl bg-amber-700 px-4 py-3 font-medium text-white shadow-sm transition hover:bg-amber-800"
        >
          로그인
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className="rounded-xl border border-amber-300 bg-white px-4 py-3 font-medium text-amber-800 transition hover:bg-amber-50 dark:border-amber-800 dark:bg-gray-950 dark:text-amber-300 dark:hover:bg-amber-950"
        >
          회원가입
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-white/70 bg-white/85 p-6 shadow-xl shadow-amber-900/10 dark:border-white/10 dark:bg-gray-950/90 dark:shadow-black/30">
      <div className="mb-5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMode(null)}
          aria-label="뒤로"
          className="grid h-8 w-8 place-items-center rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          ←
        </button>
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
          {mode === "login" ? "로그인" : "회원가입"}
        </h2>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="intent" value={mode} />

        {mode === "signup" && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-700 dark:text-gray-300">이름</span>
            <input
              name="display_name"
              type="text"
              autoComplete="name"
              placeholder="홍길동"
              className="rounded-md border border-gray-300 px-3 py-2 text-base dark:border-gray-700 dark:bg-gray-900"
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
            className="rounded-md border border-gray-300 px-3 py-2 text-base dark:border-gray-700 dark:bg-gray-900"
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
            className="rounded-md border border-gray-300 px-3 py-2 text-base dark:border-gray-700 dark:bg-gray-900"
          />
        </label>

        {mode === "signup" && (
          <fieldset className="flex flex-col gap-2 text-sm">
            <span className="text-gray-700 dark:text-gray-300">역할</span>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="role"
                  value="student"
                  checked={role === "student"}
                  onChange={() => setRole("student")}
                />
                학생
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="role"
                  value="teacher"
                  checked={role === "teacher"}
                  onChange={() => setRole("teacher")}
                />
                교사
              </label>
            </div>
          </fieldset>
        )}

        {mode === "signup" && role === "teacher" && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-700 dark:text-gray-300">소속 학교</span>
            <input
              name="school"
              type="text"
              autoComplete="organization"
              placeholder="예: OO고등학교"
              className="rounded-md border border-gray-300 px-3 py-2 text-base dark:border-gray-700 dark:bg-gray-900"
            />
            <span className="text-xs text-gray-400">
              교사 가입은 관리자 승인 후 사용할 수 있어요.
            </span>
          </label>
        )}

        {mode === "signup" && role === "student" && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-700 dark:text-gray-300">출석번호</span>
            <input
              name="student_no"
              type="number"
              inputMode="numeric"
              min="1"
              autoComplete="off"
              placeholder="예: 15"
              className="rounded-md border border-gray-300 px-3 py-2 text-base dark:border-gray-700 dark:bg-gray-900"
            />
          </label>
        )}

        {mode === "signup" && role === "student" && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-700 dark:text-gray-300">
              참여 코드 <span className="text-gray-400">(선택)</span>
            </span>
            <input
              name="join_code"
              type="text"
              autoComplete="off"
              placeholder="선생님이 준 코드"
              className="rounded-md border border-gray-300 px-3 py-2 text-base uppercase dark:border-gray-700 dark:bg-gray-900"
            />
            <span className="text-xs text-gray-400">
              우리 반에 들어가요. 나중에 입력해도 됩니다.
            </span>
          </label>
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
          className="rounded-md bg-amber-700 px-4 py-2 font-medium text-white hover:bg-amber-800 disabled:opacity-60"
        >
          {pending
            ? "처리 중..."
            : mode === "login"
              ? "로그인"
              : "회원가입"}
        </button>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          {mode === "login" ? "계정이 없나요? " : "이미 계정이 있나요? "}
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="font-medium text-amber-700 hover:underline dark:text-amber-300"
          >
            {mode === "login" ? "회원가입" : "로그인"}
          </button>
        </p>
      </form>
    </div>
  );
}
