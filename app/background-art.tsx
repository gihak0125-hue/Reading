"use client";

// 앱 전체 공통 배경.
// 랜딩(/)·로그인에서는 일러스트를 선명하게, 데이터가 많은 화면에서는
// 흐리게 + 스크림을 진하게 해 글 가독성을 높인다.
import { usePathname } from "next/navigation";

export function BackgroundArt() {
  const pathname = usePathname();
  const showcase = pathname === "/" || pathname === "/login";

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 select-none"
    >
      {/* 폴백: 포근한 톤 */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#e7eef4] via-[#eef0ea] to-[#f4ede1] dark:from-[#0b1120] dark:via-[#0a0f1a] dark:to-[#0a0e16]" />
      {/* 배경 그림 (public/bg.webp) — 데이터 화면에서는 흐리게 */}
      <div
        className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-500 ${
          showcase ? "opacity-100" : "opacity-20"
        }`}
        style={{ backgroundImage: "url('/bg.webp')" }}
      />
      {/* 가독성 레이어: 데이터 화면은 더 진하게 */}
      <div
        className={`absolute inset-0 transition-colors duration-500 ${
          showcase
            ? "bg-white/35 dark:bg-gray-950/55"
            : "bg-white/75 dark:bg-gray-950/80"
        }`}
      />
    </div>
  );
}
