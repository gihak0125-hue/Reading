"use client";

import { useFormStatus } from "react-dom";

export function StartButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-2 rounded-lg bg-amber-700 px-5 py-3 text-base font-medium text-white transition hover:bg-amber-800 disabled:opacity-70"
    >
      {pending && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      )}
      {pending ? "여는 중…" : "읽기 시작"}
    </button>
  );
}
