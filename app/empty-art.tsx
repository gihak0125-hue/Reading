// 빈 상태용 플랫 일러스트(Ouch풍, 브랜드 세이지그린+크림+피치). 외곽선 없이 소프트.

export function ReadingEmptyArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 134" className={className} aria-hidden>
      <circle cx="80" cy="60" r="52" fill="#eef5f0" />
      <circle cx="126" cy="34" r="4" fill="#ffd9a8" />
      <circle cx="33" cy="46" r="3" fill="#a6d1bd" />
      <path d="M118 56q7-7 13-2-4 8-13 2Z" fill="#6cb195" />
      <ellipse cx="80" cy="116" rx="46" ry="7" fill="#286b55" opacity="0.08" />
      {/* 식물 */}
      <path d="M80 92c0-18 0-28 0-40" stroke="#3d8f6e" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M80 72c-12-2-20-10-22-20 12 0 22 8 22 20Z" fill="#6cb195" />
      <path d="M80 62c12-2 20-10 22-20-12 0-22 8-22 20Z" fill="#a6d1bd" />
      <path d="M80 54c0-11 6-20 16-24 0 12-6 21-16 24Z" fill="#3d8f6e" />
      {/* 펼친 책 */}
      <path d="M80 106c-12-9-36-11-52-7V72c16-4 40-2 52 6Z" fill="#ffffff" />
      <path d="M80 106c12-9 36-11 52-7V72c-16-4-40-2-52 6Z" fill="#f3faf6" />
      <path d="M80 78v28" stroke="#c9e4d5" strokeWidth="2" />
      <path d="M40 82h26M40 89h21" stroke="#c9e4d5" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M94 82h26M94 89h21" stroke="#c9e4d5" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function ScoreEmptyArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 122" className={className} aria-hidden>
      <circle cx="80" cy="58" r="50" fill="#eef5f0" />
      <path d="M120 26l2 5.6 5.6 2-5.6 2-2 5.6-2-5.6-5.6-2 5.6-2z" fill="#f6b73c" />
      <circle cx="39" cy="38" r="3" fill="#a6d1bd" />
      <ellipse cx="80" cy="104" rx="44" ry="6" fill="#286b55" opacity="0.08" />
      <rect x="38" y="90" width="84" height="4" rx="2" fill="#c9e4d5" />
      <rect x="48" y="66" width="16" height="24" rx="4" fill="#a6d1bd" />
      <rect x="72" y="52" width="16" height="38" rx="4" fill="#6cb195" />
      <rect x="96" y="40" width="16" height="50" rx="4" fill="#286b55" />
      <path d="M50 74 80 60 108 46" stroke="#ffb067" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="50" cy="74" r="3.5" fill="#ffb067" />
      <circle cx="80" cy="60" r="3.5" fill="#ffb067" />
      <circle cx="108" cy="46" r="3.5" fill="#ffb067" />
    </svg>
  );
}
