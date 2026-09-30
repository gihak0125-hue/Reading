import Link from "next/link";

const STEPS: { icon: string; tone: string; title: string; desc: string }[] = [
  {
    icon: "✍️",
    tone: "bg-blue-100 dark:bg-blue-950",
    title: "손으로 표시",
    desc: "손가락·펜으로 핵심어에 밑줄·동그라미",
  },
  {
    icon: "🔗",
    tone: "bg-violet-100 dark:bg-violet-950",
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
    tone: "bg-amber-100 dark:bg-amber-950",
    title: "AI 읽기 코치",
    desc: "정답 대신 되묻고, 막힐 때 힌트로 도와줌",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-6 py-12 sm:py-16">
      <section className="grid items-center gap-10 lg:grid-cols-2">
        <header className="flex flex-col gap-4">
          <p className="inline-flex w-fit items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            고등학교 3학년 · 추론적 독해
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            읽고, 표시하고,
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-emerald-500 bg-clip-text text-transparent">
              스스로 설명하는
            </span>{" "}
            독해
          </h1>
          <p className="text-base leading-relaxed text-gray-600 dark:text-gray-300">
            정답을 먼저 제시하지 않습니다. 지문을 읽으며 스스로 핵심을 찾고, 정보를
            잇고, 자기 생각을 설명하도록 안내합니다. 막히는 지점은 AI 읽기 코치가
            학습자에게 맞는 질문과 힌트로 돕습니다.
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="inline-block rounded-xl bg-blue-600 px-6 py-3 font-medium text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-700 hover:shadow-blue-500/40"
            >
              로그인 / 시작하기
            </Link>
            <Link
              href="/join"
              className="inline-block rounded-xl border border-gray-300 bg-white/70 px-6 py-3 font-medium text-gray-700 backdrop-blur transition hover:bg-white dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-200 dark:hover:bg-gray-900"
            >
              참여 코드로 시작
            </Link>
          </div>
        </header>

        <div className="relative order-first lg:order-last">
          <HeroArt />
        </div>
      </section>

      <section className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-xl shadow-blue-200/30 backdrop-blur-md dark:border-white/10 dark:bg-gray-950/60 dark:shadow-black/30 sm:p-8">
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
          className="text-blue-600 hover:underline dark:text-blue-400"
        >
          시작하기 →
        </Link>
      </footer>
    </main>
  );
}

function HeroArt() {
  return (
    <svg
      viewBox="0 0 460 400"
      role="img"
      aria-label="지문에 밑줄과 동그라미로 표시하고, 관계를 화살표로 잇고, AI 코치가 되묻는 모습"
      className="mx-auto w-full max-w-[440px] drop-shadow-xl"
    >
      <defs>
        <linearGradient id="tag" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#60a5fa" />
          <stop offset="1" stopColor="#818cf8" />
        </linearGradient>
        <marker
          id="heroArrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto"
        >
          <path d="M0,0 L10,5 L0,10 z" fill="#8b5cf6" />
        </marker>
      </defs>

      {/* 배경 색빛 */}
      <ellipse cx="120" cy="110" rx="130" ry="110" fill="#3b82f6" opacity="0.10" />
      <ellipse cx="360" cy="300" rx="140" ry="120" fill="#10b981" opacity="0.10" />
      <ellipse cx="380" cy="90" rx="90" ry="80" fill="#8b5cf6" opacity="0.10" />

      {/* 지문 카드 */}
      <g transform="rotate(-4 230 210)">
        <rect x="76" y="86" width="300" height="250" rx="22" fill="#0f172a" opacity="0.06" />
        <rect
          x="70"
          y="80"
          width="300"
          height="250"
          rx="22"
          fill="#ffffff"
          stroke="#e5e7eb"
        />

        {/* 태그 + 제목 줄 */}
        <rect x="92" y="102" width="72" height="24" rx="12" fill="url(#tag)" />
        <text x="128" y="119" textAnchor="middle" fontSize="13" fill="#ffffff" fontWeight="700">지문</text>
        <rect x="92" y="140" width="196" height="13" rx="6" fill="#94a3b8" />

        {/* 본문 줄들 */}
        <rect x="92" y="172" width="240" height="9" rx="4" fill="#e2e8f0" />
        <rect x="92" y="194" width="212" height="9" rx="4" fill="#e2e8f0" />
        <line x1="92" y1="210" x2="248" y2="210" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" />
        <rect x="92" y="216" width="230" height="9" rx="4" fill="#e2e8f0" />

        {/* 동그라미 친 낱말 */}
        <rect x="232" y="236" width="62" height="14" rx="4" fill="#ffe4e6" />
        <rect x="92" y="238" width="120" height="9" rx="4" fill="#e2e8f0" />
        <ellipse cx="263" cy="243" rx="42" ry="16" fill="none" stroke="#f43f5e" strokeWidth="3" />

        <rect x="92" y="266" width="248" height="9" rx="4" fill="#e2e8f0" />
        <rect x="92" y="288" width="176" height="9" rx="4" fill="#e2e8f0" />

        {/* 밑줄 → 동그라미 관계 화살표 */}
        <path
          d="M150 214 Q196 244 224 243"
          fill="none"
          stroke="#8b5cf6"
          strokeWidth="2.5"
          strokeLinecap="round"
          markerEnd="url(#heroArrow)"
        />
      </g>

      {/* AI 코치 말풍선 */}
      <g>
        <path d="M300 116 L316 116 L304 132 Z" fill="#ffffff" stroke="#dbeafe" />
        <rect x="298" y="44" width="150" height="74" rx="18" fill="#ffffff" stroke="#dbeafe" />
        <circle cx="322" cy="70" r="14" fill="#eff6ff" />
        <text x="322" y="76" textAnchor="middle" fontSize="16">🤖</text>
        <text x="344" y="68" fontSize="13" fontWeight="700" fill="#1d4ed8">AI 읽기 코치</text>
        <text x="344" y="90" fontSize="11" fill="#64748b">왜 그렇게</text>
        <text x="344" y="105" fontSize="11" fill="#64748b">생각했어?</text>
      </g>

      {/* 도구 알약 */}
      <g transform="rotate(-6 96 262)">
        <rect x="42" y="248" width="88" height="30" rx="15" fill="#dbeafe" />
        <line x1="58" y1="263" x2="82" y2="263" stroke="#1d4ed8" strokeWidth="3" strokeLinecap="round" />
        <text x="92" y="267" fontSize="12" fontWeight="700" fill="#1d4ed8">밑줄</text>
      </g>
      <g transform="rotate(6 96 316)">
        <rect x="40" y="302" width="108" height="30" rx="15" fill="#ffe4e6" />
        <circle cx="60" cy="317" r="8" fill="none" stroke="#be123c" strokeWidth="3" />
        <text x="78" y="321" fontSize="12" fontWeight="700" fill="#be123c">동그라미</text>
      </g>

      {/* 반짝임 */}
      <path d="M418 150 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4 z" fill="#f59e0b" />
      <path d="M64 150 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 z" fill="#8b5cf6" />
      <path d="M408 330 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 z" fill="#10b981" />

      {/* 연필 */}
      <g transform="rotate(38 360 300)">
        <rect x="352" y="250" width="16" height="96" rx="4" fill="#fbbf24" />
        <rect x="352" y="250" width="16" height="14" rx="4" fill="#f472b6" />
        <path d="M352 346 L368 346 L360 366 Z" fill="#fde68a" />
        <path d="M357 356 L363 356 L360 366 Z" fill="#1f2937" />
      </g>
    </svg>
  );
}
