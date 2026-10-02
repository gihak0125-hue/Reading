// 앱 전체에 깔리는 포근한 공부방 톤 배경(장식용, 상호작용 없음)
export function BackgroundArt() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 select-none opacity-100 dark:opacity-55"
    >
      <svg
        className="h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="room" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#b9d0e0" />
            <stop offset="0.52" stopColor="#cbdcea" />
            <stop offset="0.54" stopColor="#eee4d4" />
            <stop offset="1" stopColor="#f4ede1" />
          </linearGradient>
          <radialGradient id="winlight" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#eaf3f8" stopOpacity="0.85" />
            <stop offset="1" stopColor="#eaf3f8" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="lampglow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffe6b0" stopOpacity="0.7" />
            <stop offset="1" stopColor="#ffe6b0" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width="1440" height="900" fill="url(#room)" />
        {/* 벽/벽판 경계의 나무 몰딩 */}
        <rect x="0" y="486" width="1440" height="7" fill="#d9ab82" opacity="0.5" />
        {/* 창에서 들어오는 빛(좌상) */}
        <ellipse cx="130" cy="150" rx="440" ry="380" fill="url(#winlight)" />
        {/* 책상 램프 빛(우하) */}
        <ellipse cx="1300" cy="820" rx="560" ry="380" fill="url(#lampglow)" />
        {/* 천장에서 늘어진 화분 잎(우상) */}
        <g fill="#9cb488" opacity="0.5">
          <path d="M1348 0 q-22 64 -10 128 q24 -42 10 -128 z" />
          <path d="M1392 0 q12 74 -8 160 q32 -64 8 -160 z" />
          <path d="M1318 0 q-32 54 -32 116 q36 -42 32 -116 z" />
          <path d="M1424 0 q-6 60 -22 118 q34 -48 22 -118 z" />
        </g>
        {/* 좌하 작은 화분 잎 */}
        <g fill="#8fae7d" opacity="0.4">
          <path d="M70 900 q-10 -80 10 -150 q24 70 -10 150 z" />
          <path d="M120 900 q0 -70 34 -120 q10 70 -34 120 z" />
        </g>
      </svg>
    </div>
  );
}
