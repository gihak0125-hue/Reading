// 북돋움 브랜드 자산.
// - Wordmark: 새싹 심볼 + "북돋움" 글자(앱 제목)
// - Bookdoi: 학생을 돕는 AI 코치 '북돋이' 마스코트 아바타
// 브랜드 컬러: 세이지그린 #286B55 / #3d8f6e / #6cb195 / #a6d1bd, 크림 #faf9f4

// 새싹 심볼(로고 아이콘). currentColor 대신 브랜드 그린 고정.
export function SproutMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      {/* 흙/화분 느낌의 받침 */}
      <ellipse cx="20" cy="33" rx="12" ry="2.4" fill="#286b55" opacity="0.12" />
      {/* 줄기 */}
      <path d="M20 31V18" stroke="#3d8f6e" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      {/* 왼쪽 잎 */}
      <path d="M20 22c-7-1-11-6-12-12 7 0 12 5 12 12Z" fill="#6cb195" />
      {/* 오른쪽 잎 */}
      <path d="M20 18c7-1 11-6 12-12-7 0-12 5-12 12Z" fill="#a6d1bd" />
      {/* 가운데 새순 */}
      <path d="M20 16c0-6 3-11 8-13 0 7-3 11-8 13Z" fill="#3d8f6e" />
    </svg>
  );
}

// 앱 제목 워드마크. size로 글자 크기 조절, english=true면 '북(Book)돋움' 표기.
export function Wordmark({
  size = "md",
  english = false,
  className = "",
}: {
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  english?: boolean;
  className?: string;
}) {
  const icon =
    size === "2xl"
      ? "h-16 w-16"
      : size === "xl"
        ? "h-14 w-14"
        : size === "lg"
          ? "h-9 w-9"
          : size === "sm"
            ? "h-6 w-6"
            : "h-7 w-7";
  const text =
    size === "2xl"
      ? "text-6xl"
      : size === "xl"
        ? "text-5xl"
        : size === "lg"
          ? "text-2xl"
          : size === "sm"
            ? "text-base"
            : "text-lg";
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <SproutMark className={icon} />
      <span
        className={`font-extrabold tracking-tight text-amber-700 dark:text-amber-300 ${text}`}
      >
        북
        {english && (
          <span className="align-middle text-[0.45em] font-bold text-amber-600/70 dark:text-amber-300/70">
            (Book)
          </span>
        )}
        돋움
      </span>
    </span>
  );
}

// 북돋이 마스코트 아바타(얼굴). 코치 패널 등 작은 자리에 원형으로 사용.
// eslint-disable-next-line @next/next/no-img-element
export function Bookdoi({ className }: { className?: string }) {
  return (
    <img
      src="/bookdoi-avatar.webp"
      alt="AI 북돋이"
      draggable={false}
      className={`rounded-full object-cover ${className ?? ""}`}
    />
  );
}

// 북돋이 전신 마스코트(책 읽는 모습). 랜딩/히어로 등 크게 보여줄 때 사용.
// eslint-disable-next-line @next/next/no-img-element
export function BookdoiHero({ className }: { className?: string }) {
  return (
    <img
      src="/bookdoi-hero.webp"
      alt="책을 읽는 AI 북돋이"
      draggable={false}
      className={className}
    />
  );
}
