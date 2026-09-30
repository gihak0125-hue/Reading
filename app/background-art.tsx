// 앱 전체에 깔리는 파스텔 배경 일러스트 (장식용, 상호작용 없음)
export function BackgroundArt() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 select-none opacity-95 dark:opacity-40"
    >
      <svg
        className="h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMax slice"
      >
        <defs>
          <linearGradient id="bgSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#eef4ff" />
            <stop offset="0.5" stopColor="#f6f2ff" />
            <stop offset="1" stopColor="#fff7f4" />
          </linearGradient>
          <radialGradient id="wPeach" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffd9c7" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ffd9c7" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="wLav" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#dcd2ff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#dcd2ff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="wMint" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#c9f2e2" stopOpacity="0.55" />
            <stop offset="1" stopColor="#c9f2e2" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="wSky" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#cfe4ff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#cfe4ff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="sun" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#fff1c2" stopOpacity="0.9" />
            <stop offset="1" stopColor="#ffe08a" stopOpacity="0" />
          </radialGradient>

          <symbol id="mStar" viewBox="0 0 24 24">
            <path d="M12 1 C13.2 8.5 15.5 10.8 23 12 C15.5 13.2 13.2 15.5 12 23 C10.8 15.5 8.5 13.2 1 12 C8.5 10.8 10.8 8.5 12 1 Z" />
          </symbol>
          <symbol id="mBook" viewBox="0 0 44 32">
            <path d="M22 7 C15 3 7 3 3 5 V25 C7 23 15 23 22 27 Z" />
            <path d="M22 7 C29 3 37 3 41 5 V25 C37 23 29 23 22 27 Z" />
          </symbol>
          <symbol id="mCloud" viewBox="0 0 60 34">
            <circle cx="16" cy="20" r="12" />
            <circle cx="32" cy="14" r="14" />
            <circle cx="46" cy="21" r="11" />
            <rect x="8" y="20" width="46" height="12" rx="6" />
          </symbol>
          <symbol id="mLeaf" viewBox="0 0 24 24">
            <path d="M12 2 C5 6 4 16 12 22 C20 16 19 6 12 2 Z" />
            <path d="M12 4 V21" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="1.2" fill="none" />
          </symbol>
          <symbol id="mPencil" viewBox="0 0 14 50">
            <rect x="3" y="8" width="8" height="33" rx="1.5" fill="#fcd9a8" />
            <rect x="3" y="8" width="8" height="6" rx="1.5" fill="#f7b6c2" />
            <rect x="3" y="13.5" width="8" height="2" fill="#e79fb0" />
            <path d="M3 41 h8 l-4 8 Z" fill="#f0c48a" />
            <path d="M5.5 46 h3 l-1.5 3 Z" fill="#7c8596" />
          </symbol>
          <symbol id="mPlane" viewBox="0 0 48 34">
            <path d="M2 15 L46 2 L27 32 L20 22 Z" fill="#cfe0fb" />
            <path d="M2 15 L20 22 L46 2" fill="#e7f0ff" />
          </symbol>
          <symbol id="mBubble" viewBox="0 0 40 38">
            <rect x="2" y="2" width="36" height="26" rx="9" fill="#ece2fb" />
            <path d="M12 27 L12 36 L22 27 Z" fill="#ece2fb" />
            <text x="20" y="21" fontSize="16" textAnchor="middle" fontWeight="700" fill="#9b7fd6">?</text>
          </symbol>
        </defs>

        {/* 하늘 베이스 + 색 번짐 */}
        <rect x="0" y="0" width="1440" height="900" fill="url(#bgSky)" />
        <ellipse cx="140" cy="120" rx="520" ry="420" fill="url(#wPeach)" />
        <ellipse cx="1320" cy="90" rx="520" ry="440" fill="url(#wLav)" />
        <ellipse cx="1340" cy="760" rx="560" ry="460" fill="url(#wMint)" />
        <ellipse cx="120" cy="740" rx="520" ry="440" fill="url(#wSky)" />
        <circle cx="1250" cy="150" r="110" fill="url(#sun)" />

        {/* 구름 */}
        <g fill="#ffffff" opacity="0.75">
          <use href="#mCloud" x="120" y="90" width="220" height="124" />
          <use href="#mCloud" x="1050" y="60" width="260" height="147" />
          <use href="#mCloud" x="620" y="40" width="180" height="102" />
          <use href="#mCloud" x="1230" y="300" width="150" height="85" opacity="0.7" />
          <use href="#mCloud" x="330" y="280" width="140" height="79" opacity="0.65" />
        </g>

        {/* 언덕 */}
        <path
          d="M0 700 C 260 640 520 700 760 686 C 1000 672 1220 720 1440 674 L1440 900 L0 900 Z"
          fill="#d7d0ff"
          opacity="0.55"
        />
        <path
          d="M0 772 C 320 726 580 796 840 762 C 1080 732 1300 792 1440 760 L1440 900 L0 900 Z"
          fill="#bff0da"
          opacity="0.7"
        />
        <path
          d="M0 838 C 360 806 720 862 1060 832 C 1240 816 1360 848 1440 832 L1440 900 L0 900 Z"
          fill="#ffe6d2"
          opacity="0.85"
        />

        {/* 흩뿌린 모티프 */}
        <g opacity="0.9">
          {/* 책 */}
          <use href="#mBook" x="70" y="150" width="150" height="109" fill="#bcd3ff" transform="rotate(-8 145 205)" />
          <use href="#mBook" x="1230" y="130" width="150" height="109" fill="#ffd0dd" transform="rotate(10 1305 185)" />
          <use href="#mBook" x="1150" y="470" width="128" height="93" fill="#c7ecd8" transform="rotate(-6 1214 517)" />
          <use href="#mBook" x="470" y="560" width="120" height="87" fill="#e6d4ff" transform="rotate(7 530 604)" />

          {/* 연필 */}
          <use href="#mPencil" x="360" y="330" width="26" height="93" transform="rotate(24 373 377)" />
          <use href="#mPencil" x="1040" y="590" width="24" height="86" transform="rotate(-28 1052 633)" />

          {/* 종이비행기 */}
          <use href="#mPlane" x="960" y="230" width="86" height="61" transform="rotate(-6 1003 260)" />
          <path d="M900 300 C 930 285 950 300 966 268" stroke="#a9c9f5" strokeWidth="2.5" strokeDasharray="2 9" strokeLinecap="round" fill="none" opacity="0.8" />

          {/* 말풍선 */}
          <use href="#mBubble" x="150" y="300" width="82" height="78" transform="rotate(-6 191 339)" />
          <use href="#mBubble" x="1270" y="410" width="72" height="68" transform="rotate(8 1306 444)" />

          {/* 잎 */}
          <use href="#mLeaf" x="250" y="600" width="40" height="40" fill="#a9e3c4" transform="rotate(30 270 620)" />
          <use href="#mLeaf" x="820" y="180" width="34" height="34" fill="#c9e6a9" transform="rotate(-20 837 197)" />
          <use href="#mLeaf" x="1180" y="640" width="38" height="38" fill="#a9e3c4" transform="rotate(15 1199 659)" />
        </g>

        {/* 반짝임 */}
        <g>
          <use href="#mStar" x="80" y="80" width="34" height="34" fill="#ffcf9e" />
          <use href="#mStar" x="300" y="210" width="20" height="20" fill="#c9b6ff" />
          <use href="#mStar" x="520" y="120" width="26" height="26" fill="#ffb9cf" />
          <use href="#mStar" x="690" y="300" width="16" height="16" fill="#a9d6ff" />
          <use href="#mStar" x="1000" y="120" width="22" height="22" fill="#a9e3c4" />
          <use href="#mStar" x="1090" y="330" width="30" height="30" fill="#ffcf9e" />
          <use href="#mStar" x="1330" y="230" width="20" height="20" fill="#c9b6ff" />
          <use href="#mStar" x="180" y="440" width="24" height="24" fill="#ffb9cf" />
          <use href="#mStar" x="430" y="510" width="16" height="16" fill="#a9d6ff" />
          <use href="#mStar" x="900" y="470" width="22" height="22" fill="#c9b6ff" />
          <use href="#mStar" x="1250" y="560" width="26" height="26" fill="#ffcf9e" />
          <use href="#mStar" x="610" y="650" width="18" height="18" fill="#a9e3c4" />
          <use href="#mStar" x="760" y="560" width="14" height="14" fill="#ffb9cf" />
        </g>
      </svg>
    </div>
  );
}
