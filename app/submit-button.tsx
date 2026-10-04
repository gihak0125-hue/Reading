"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

/** form action 제출 버튼 — 처리 중이면 자동으로 로딩 표시(멈춤/로딩 혼동 방지). */
export function SubmitButton({
  children,
  pendingText,
  className,
}: {
  children: ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? (pendingText ?? "처리 중…") : children}
    </button>
  );
}
