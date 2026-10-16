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
      {/* 폴백: 밝은 크림(레퍼런스 톤) */}
      <div className="absolute inset-0 bg-[#faf9f4] dark:bg-[#16120e]" />
      {/* 배경 그림 (public/bg.webp) — 랜딩·로그인에서만, 데이터 화면은 깔끔한 크림 */}
      <div
        className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-500 ${
          showcase ? "opacity-100" : "opacity-0"
        }`}
        style={{ backgroundImage: "url('/bg.webp')" }}
      />
      {/* 가독성 레이어: 랜딩은 은은한 스크림, 데이터 화면은 크림 유지 */}
      <div
        className={`absolute inset-0 transition-colors duration-500 ${
          showcase
            ? "bg-[#faf9f4]/25 dark:bg-[#1c1814]/55"
            : "bg-transparent"
        }`}
      />
    </div>
  );
}
