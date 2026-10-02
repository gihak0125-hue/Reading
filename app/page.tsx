import Link from "next/link";

const STEPS: { icon: string; tone: string; title: string; desc: string }[] = [
  {
    icon: "✍️",
    tone: "bg-sky-100 dark:bg-sky-950",
    title: "손으로 표시",
    desc: "손가락·펜으로 핵심어에 밑줄·동그라미",
  },
  {
    icon: "🔗",
    tone: "bg-amber-100 dark:bg-amber-950",
    title: "관계 잇기",
    desc: "정보를 화살표로 연결하고 관계 유형(인과·비교·대조·문제해결·나열) 판단",
  },
  {
    icon: "💬",
    tone: "bg-emerald-100 dark:bg-emerald-950",
    title: "자기설명",
    desc: "정답 확인 전에 내 말로 먼저 설명",
  },
  {
    icon: "🤖",
    tone: "bg-rose-100 dark:bg-rose-950",
    title: "AI 읽기 코치",
    desc: "정답 대신 되묻고, 막힐 때 힌트로 도와줌",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-6 py-12 sm:py-16">
      <section className="grid items-center gap-10 lg:grid-cols-2">
        <header className="flex flex-col gap-4">
          <p className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-medium text-sky-800 shadow-sm dark:bg-gray-950 dark:text-sky-300">
            고등학교 3학년 · 추론적 독해
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-gray-800 dark:text-gray-100 sm:text-5xl">
            오늘도
            <br />
            <span className="text-amber-700 dark:text-amber-400">
              차분히 읽는
            </span>{" "}
            시간
          </h1>
          <p className="max-w-md text-base leading-relaxed text-gray-600 dark:text-gray-300">
            정답을 먼저 알려주지 않아요. 지문을 읽으며 스스로 핵심을 찾고,
            정보를 잇고, 내 말로 설명하도록 곁에서 도와줍니다. 막히는 지점은 AI
            읽기 코치가 질문과 힌트로 함께 풀어가요.
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="inline-block rounded-xl bg-amber-700 px-6 py-3 font-medium text-white shadow-lg shadow-amber-700/20 transition hover:bg-amber-800"
            >
              로그인 / 시작하기
            </Link>
            <Link
              href="/join"
              className="inline-block rounded-xl border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              참여 코드로 시작
            </Link>
          </div>
        </header>

        <div className="order-first lg:order-last">
          <div className="overflow-hidden rounded-3xl border-4 border-white bg-white shadow-2xl shadow-sky-900/15 dark:border-gray-800 dark:bg-gray-900 dark:shadow-black/40">
            <StudyScene />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/70 bg-white p-6 shadow-xl shadow-sky-900/10 dark:border-white/10 dark:bg-gray-950 dark:shadow-black/30 sm:p-8">
        <h2 className="mb-5 text-lg font-semibold">이렇게 읽어요</h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {STEPS.map((s) => (
            <li key={s.title} className="flex items-start gap-3">
              <span
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xl ${s.tone}`}
              >
                {s.icon}
              </span>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {s.title}
                </span>{" "}
                — {s.desc}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-xs text-gray-400">
          정해진 순서는 없어요. 쭉 읽어 나가며 자유롭게 표시하면 됩니다.
        </p>
      </section>

      <footer className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
        <span>학생은 지문을 읽고 표시하며, 교사는 활동을 확인합니다.</span>
        <Link
          href="/login"
          className="text-amber-700 hover:underline dark:text-amber-400"
        >
          시작하기 →
        </Link>
      </footer>
    </main>
  );
}

function StudyScene() {
  return (
    <svg
      viewBox="0 0 460 400"
      role="img"
      aria-label="창가 책상에서 책을 읽는 학생"
      className="h-auto w-full"
    >
      <defs>
        <linearGradient id="ssSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#cfe6f2" />
          <stop offset="1" stopColor="#eaf4f8" />
        </linearGradient>
        <radialGradient id="ssGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffe6b0" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ffe6b0" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* 벽 / 벽판 / 몰딩 */}
      <rect x="0" y="0" width="460" height="262" fill="#bcd2e2" />
      <rect x="0" y="262" width="460" height="138" fill="#ece2d2" />
      <rect x="0" y="256" width="460" height="8" fill="#d2a47c" />

      {/* 창문 */}
      <rect x="34" y="40" width="152" height="162" rx="6" fill="#ffffff" />
      <rect x="42" y="48" width="136" height="146" fill="url(#ssSky)" />
      <ellipse cx="78" cy="92" rx="22" ry="12" fill="#ffffff" opacity="0.9" />
      <ellipse cx="128" cy="78" rx="18" ry="10" fill="#ffffff" opacity="0.85" />
      <path d="M42 162 q34 -24 68 -6 q34 18 68 2 V194 H42 Z" fill="#bfe0c8" opacity="0.8" />
      <rect x="108" y="48" width="4" height="146" fill="#ffffff" />
      <rect x="42" y="118" width="136" height="4" fill="#ffffff" />
      <rect x="30" y="198" width="160" height="10" rx="2" fill="#e3d8c6" />

      {/* 액자 2개 */}
      <rect x="236" y="54" width="44" height="54" rx="3" fill="#caa06f" />
      <rect x="242" y="60" width="32" height="42" fill="#eef3ee" />
      <path d="M242 90 q10 -14 20 -6 q8 6 12 0 V102 H242 Z" fill="#a9c79a" />
      <circle cx="266" cy="70" r="4" fill="#f3d69a" />
      <rect x="298" y="48" width="48" height="40" rx="3" fill="#b98a5e" />
      <rect x="304" y="54" width="36" height="28" fill="#eef3ee" />
      <path d="M311 74 l9 -13 6 8 6 -6 5 11 Z" fill="#9bbf8a" />

      {/* 천장에서 늘어진 화분 */}
      <rect x="398" y="30" width="34" height="20" rx="3" fill="#caa06f" />
      <g stroke="#7fa06d" strokeWidth="2.5" fill="none" strokeLinecap="round">
        <path d="M408 50 q-8 40 2 84" />
        <path d="M418 50 q6 46 -4 96" />
        <path d="M426 50 q10 34 4 70" />
      </g>
      <g fill="#8fae7d">
        <ellipse cx="407" cy="92" rx="6" ry="9" transform="rotate(-20 407 92)" />
        <ellipse cx="416" cy="120" rx="6" ry="9" transform="rotate(14 416 120)" />
        <ellipse cx="429" cy="104" rx="6" ry="9" transform="rotate(26 429 104)" />
        <ellipse cx="412" cy="138" rx="6" ry="9" transform="rotate(-10 412 138)" />
      </g>

      {/* 램프 빛 */}
      <ellipse cx="300" cy="300" rx="150" ry="90" fill="url(#ssGlow)" />

      {/* 학생 (뒤·3/4, 턱 괴고 독서) */}
      <path d="M150 322 q2 -80 58 -94 q58 12 60 94 Z" fill="#c3ccd4" />
      <path d="M150 322 q2 -80 58 -94 q8 46 4 94 Z" fill="#b4bec8" />
      <ellipse cx="208" cy="214" rx="30" ry="32" fill="#5b4a3a" />
      <circle cx="208" cy="181" r="13" fill="#4e3f31" />
      <path d="M232 206 q10 6 8 22 q-2 16 -16 20 q-8 -22 8 -42 Z" fill="#ecc8a6" />
      <path d="M236 250 q22 6 24 36 q-2 20 -20 22 q-6 -34 -4 -58 Z" fill="#c3ccd4" />
      <ellipse cx="238" cy="236" rx="8" ry="10" fill="#ecc8a6" />

      {/* 책상 앞판 */}
      <rect x="0" y="306" width="460" height="94" fill="#b98a5e" />
      <rect x="0" y="306" width="460" height="6" fill="#c79b6c" />

      {/* 펼친 책 */}
      <g transform="rotate(-6 150 332)">
        <rect x="116" y="314" width="80" height="40" rx="3" fill="#f4ede1" />
        <rect x="116" y="314" width="40" height="40" rx="3" fill="#ece3d4" />
        <g stroke="#c9bfab" strokeWidth="2" strokeLinecap="round">
          <path d="M124 324 h26" />
          <path d="M124 332 h24" />
          <path d="M124 340 h26" />
          <path d="M162 324 h26" />
          <path d="M162 332 h24" />
          <path d="M162 340 h26" />
        </g>
      </g>

      {/* 머그컵 + 김 */}
      <rect x="70" y="318" width="30" height="26" rx="5" fill="#d98c6a" />
      <path d="M100 324 q10 2 10 9 q0 7 -10 9" stroke="#d98c6a" strokeWidth="4" fill="none" />
      <path d="M82 312 q-4 -8 2 -14" stroke="#e7d8c6" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.8" />
      <path d="M90 312 q4 -8 -2 -14" stroke="#e7d8c6" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.8" />

      {/* 연필꽂이 */}
      <rect x="300" y="322" width="26" height="24" rx="3" fill="#cdbfa6" />
      <rect x="305" y="302" width="4" height="22" rx="2" fill="#e8a33a" />
      <rect x="312" y="298" width="4" height="26" rx="2" fill="#7fa06d" />
      <rect x="319" y="304" width="4" height="20" rx="2" fill="#d98c6a" />

      {/* 작은 화분 */}
      <rect x="36" y="328" width="24" height="18" rx="3" fill="#caa06f" />
      <path d="M43 328 q-4 -16 6 -22 q10 8 -2 22 Z" fill="#8fae7d" />
      <path d="M51 328 q2 -18 12 -18 q2 12 -12 18 Z" fill="#9cba86" />

      {/* 책상 램프 */}
      <rect x="360" y="332" width="40" height="8" rx="4" fill="#d8c9a6" />
      <path d="M380 334 q-24 -32 -44 -36" stroke="#c7b488" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M322 296 a14 14 0 0 1 28 0 Z" fill="#efe3c8" />
      <ellipse cx="336" cy="298" rx="14" ry="4" fill="#f6e9c6" />

      {/* 반짝임 */}
      <g fill="#f3d69a">
        <path d="M252 150 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 z" />
        <path d="M400 188 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2 z" />
      </g>
    </svg>
  );
}
