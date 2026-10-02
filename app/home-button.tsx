"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function HomeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10.5V20h14v-9.5" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}

// 홈(대시보드)로 돌아가는 떠 있는 버튼.
// 랜딩/로그인/대시보드/읽기 세션 화면에서는 숨긴다(각자 자체 내비 있음).
export function HomeButton() {
  const p = usePathname() || "/";
  const hide =
    p === "/" ||
    p === "/login" ||
    p === "/dashboard" ||
    p.startsWith("/read/");
  if (hide) return null;
  return (
    <Link
      href="/dashboard"
      aria-label="홈으로"
      className="fixed left-4 top-4 z-40 flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50/90 px-3 py-1.5 text-sm font-medium text-amber-800 shadow-sm transition hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/90 dark:text-amber-300 dark:hover:bg-amber-900"
    >
      <HomeIcon className="h-4 w-4" />
      홈
    </Link>
  );
}
