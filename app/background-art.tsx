"use client";

// 앱 전체 공통 배경.
// 랜딩(/)·로그인에서는 일러스트를 선명하게, 데이터가 많은 화면에서는
// 흐리게 + 스크림을 진하게 해 글 가독성을 높인다.
// 쇼케이스(홈/로그인)에서는 배경 영상(public/bg.webm·bg.mp4)이 있으면 재생하고,
// 없거나 '동작 줄이기' 설정이면 정지 이미지(public/bg.webp)로 폴백한다.
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function BackgroundArt() {
  const pathname = usePathname();
  const showcase = pathname === "/" || pathname === "/login";

  // 접근성: prefers-reduced-motion이면 영상 대신 정지 이미지
  const [motionOk, setMotionOk] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: no-preference)");
    const apply = () => setMotionOk(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // 영상 소스가 실제로 재생 가능한지(파일 없으면 이미지 폴백 유지)
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const showVideo = showcase && motionOk;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 select-none"
    >
      {/* 폴백: 밝은 크림(레퍼런스 톤) */}
      <div className="absolute inset-0 bg-[#faf9f4] dark:bg-[#16120e]" />
      {/* 배경 그림 (public/bg.webp) — 랜딩·로그인에서만, 데이터 화면은 깔끔한 크림.
          영상이 준비되면 그 위에 영상이 덮으므로 자연스러운 폴백이 된다. */}
      <div
        className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-500 ${
          showcase ? "opacity-100" : "opacity-0"
        }`}
        style={{ backgroundImage: "url('/bg-poster.webp')" }}
      />
      {/* 배경 영상(선택): 파일이 있고 동작 허용일 때만. 준비되면 페이드인. */}
      {showVideo && (
        <video
          ref={videoRef}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
            videoReady ? "opacity-100" : "opacity-0"
          }`}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/bg-poster.webp"
          onCanPlay={() => setVideoReady(true)}
        >
          <source src="/bg.webm" type="video/webm" />
          <source src="/bg.mp4" type="video/mp4" />
        </video>
      )}
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
