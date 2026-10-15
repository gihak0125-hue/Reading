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

// 앱 제목 워드마크. size로 글자 크기만 조절.
export function Wordmark({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const icon =
    size === "lg" ? "h-9 w-9" : size === "sm" ? "h-6 w-6" : "h-7 w-7";
  const text =
    size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg";
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <SproutMark className={icon} />
      <span
        className={`font-extrabold tracking-tight text-amber-700 dark:text-amber-300 ${text}`}
      >
        북돋움
      </span>
    </span>
  );
}

// 북돋이 마스코트 — 둥근 새싹 친구 얼굴. 코치 아바타에 사용.
export function Bookdoi({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      {/* 머리 위 새싹 */}
      <path d="M24 12V6" stroke="#3d8f6e" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M24 9c-4-.5-6.5-3.2-7-7 4 0 7 2.8 7 7Z" fill="#6cb195" />
      <path d="M24 7c4-.5 6.5-3.2 7-7-4 0-7 2.8-7 7Z" fill="#a6d1bd" />
      {/* 얼굴(둥근 몸) */}
      <circle cx="24" cy="29" r="15" fill="#eef5f0" />
      <circle cx="24" cy="29" r="15" fill="none" stroke="#6cb195" strokeWidth="1.6" />
      {/* 볼 */}
      <circle cx="16.5" cy="31" r="2.4" fill="#ffc9a3" opacity="0.8" />
      <circle cx="31.5" cy="31" r="2.4" fill="#ffc9a3" opacity="0.8" />
      {/* 눈 */}
      <circle cx="19" cy="27" r="1.9" fill="#286b55" />
      <circle cx="29" cy="27" r="1.9" fill="#286b55" />
      {/* 웃는 입 */}
      <path d="M20.5 33q3.5 3 7 0" stroke="#286b55" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
  );
}
