"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { signout } from "@/app/login/actions";

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden
    >
      {children}
    </svg>
  );
}

const NAV: { href: string; label: string; icon: ReactNode; match: (p: string) => boolean }[] = [
  {
    href: "/dashboard",
    label: "홈",
    match: (p) => p === "/dashboard",
    icon: (
      <Svg>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V20h14V9.5" />
        <path d="M9.5 20v-6h5v6" />
      </Svg>
    ),
  },
  {
    href: "/records",
    label: "학습 기록",
    match: (p) => p.startsWith("/records"),
    icon: (
      <Svg>
        <path d="M4 20V11M10 20V4M16 20v-6" />
        <path d="M3 20h18" />
      </Svg>
    ),
  },
];

export function StudentSidebar() {
  const pathname = usePathname() ?? "";
  return (
    <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-[#eae9e3] bg-white/60 px-4 py-6 md:flex dark:border-gray-800 dark:bg-gray-950/50">
      <div className="flex items-center gap-2 px-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-600 text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
            <path d="M12 21c0-5 1-8 4-10.5" />
            <path d="M12 21C12 12 7 8 3 8c0 7 4 11 9 11Z" />
            <path d="M12 16c0-5 4-8 9-8 0 5-3 8-9 8Z" />
          </svg>
        </span>
        <span className="text-sm font-semibold leading-tight text-gray-800 dark:text-gray-100">
          문해력 코치
        </span>
      </div>

      <nav className="mt-7 flex flex-col gap-1">
        {NAV.map((n) => {
          const active = n.match(pathname);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition " +
                (active
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  : "text-gray-500 hover:bg-amber-50 hover:text-amber-700 dark:text-gray-400 dark:hover:bg-gray-900")
              }
            >
              <span className={active ? "text-amber-700 dark:text-amber-300" : ""}>
                {n.icon}
              </span>
              {n.label}
            </Link>
          );
        })}
      </nav>

      {/* 하단: 일러스트(남는 공간) + 로그아웃 */}
      <div className="mt-auto px-1 pt-6">
        <svg viewBox="0 0 120 96" className="mx-auto w-full max-w-[112px]" aria-hidden>
          <ellipse cx="60" cy="88" rx="38" ry="5" fill="#286b55" opacity="0.12" />
          <path d="M60 78 C60 58 52 48 40 44" fill="none" stroke="#3d8f6e" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M60 78 C60 60 70 50 82 48" fill="none" stroke="#3d8f6e" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M40 44 q-14 -8 -20 4 q14 10 20 -4 Z" fill="#6cb195" stroke="#286b55" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M82 48 q14 -10 22 2 q-14 12 -22 -2 Z" fill="#a6d1bd" stroke="#286b55" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M60 78 C58 62 60 52 60 44" fill="none" stroke="#3d8f6e" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M60 44 q-10 -14 2 -22 q12 10 -2 22 Z" fill="#6cb195" stroke="#286b55" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M46 78 h28 l-3 14 h-22 Z" fill="#ffe6c7" stroke="#d69b72" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M44 74 h32 v5 h-32 Z" fill="#fff4e5" stroke="#d69b72" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
        <form action={signout} className="mt-4">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-900"
          >
            <Svg>
              <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" />
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
            </Svg>
            로그아웃
          </button>
        </form>
      </div>
    </aside>
  );
}
