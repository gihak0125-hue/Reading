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

      {/* 움직이는 배경(홈/로그인에서만): 햇살 번짐 + 흔들리는 잎 */}
      {showcase && (
        <div className="absolute inset-0 overflow-hidden">
          {/* 햇살 번짐 — 창문(상단) 쪽에서 들어오는 따뜻한 빛 */}
          <div
            className="bd-shimmer absolute -left-[10%] -top-[10%] h-[70%] w-[70%] rounded-full mix-blend-screen"
            style={{
              background:
                "radial-gradient(circle at 30% 30%, rgba(255,246,214,0.85), rgba(255,240,200,0.25) 45%, transparent 70%)",
            }}
          />
          <div
            className="bd-shimmer absolute right-[8%] top-[4%] h-[45%] w-[45%] rounded-full mix-blend-screen"
            style={{
              background:
                "radial-gradient(circle at 50% 40%, rgba(255,250,230,0.7), transparent 68%)",
              animationDelay: "-4s",
              animationDuration: "12s",
            }}
          />

          {/* 흔들리는 잎 — 상단 선반 식물에서 늘어진 느낌 + 떠다니는 잎 */}
          <Leaf className="bd-sway absolute left-[6%] top-[2%] h-8 w-8 text-emerald-600/35" />
          <Leaf
            className="bd-sway absolute left-[14%] top-[1%] h-6 w-6 text-emerald-700/30"
            style={{ animationDelay: "-2.3s", animationDuration: "6.5s" }}
          />
          <Leaf
            className="bd-sway absolute right-[20%] top-[3%] h-7 w-7 text-emerald-600/30"
            style={{ animationDelay: "-1.2s", animationDuration: "6s" }}
          />
          <Leaf
            className="bd-drift absolute left-[30%] top-[22%] h-5 w-5 text-emerald-500/25"
            style={{ animationDelay: "-3s" }}
          />
          <Leaf
            className="bd-drift absolute left-[48%] top-[12%] h-4 w-4 text-emerald-600/20"
            style={{ animationDelay: "-7s", animationDuration: "14s" }}
          />
        </div>
      )}
    </div>
  );
}

function Leaf({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style} aria-hidden>
      <path d="M12 2C7 4 4 8 4 13c0 4 3 8 8 9 0-6-1-10-5-14 5 1 8 4 9 9 1-6-1-11-4-15Z" />
    </svg>
  );
}
