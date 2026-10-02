"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
      className="fixed left-4 top-4 z-40 flex items-center gap-1 rounded-full border border-gray-200 bg-white/90 px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-white dark:border-gray-700 dark:bg-gray-950/90 dark:text-gray-200 dark:hover:bg-gray-950"
    >
      🏠 홈
    </Link>
  );
}
