// 앱 전체 공통 배경.
// public/bg.jpg 를 넣으면 그 그림이 배경으로 깔린다(없으면 아래 폴백 색).
export function BackgroundArt() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 select-none"
    >
      {/* 폴백: 그림이 아직 없을 때의 포근한 톤 */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#e7eef4] via-[#eef0ea] to-[#f4ede1] dark:from-[#0b1120] dark:via-[#0a0f1a] dark:to-[#0a0e16]" />
      {/* 배경 그림 (public/bg.jpg) */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/bg.jpg')" }}
      />
      {/* 가독성 레이어: 그림을 살짝 눌러 글이 잘 보이게(연할수록 그림이 선명) */}
      <div className="absolute inset-0 bg-white/35 dark:bg-gray-950/55" />
    </div>
  );
}
