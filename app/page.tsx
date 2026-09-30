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
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-12 px-6 py-16 sm:py-20">
      <header className="flex flex-col gap-4">
        <p className="inline-flex w-fit items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-sm font-medium text-blue-700 shadow-sm backdrop-blur dark:bg-gray-950/50 dark:text-blue-300">
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
        <p className="max-w-xl text-base leading-relaxed text-gray-600 dark:text-gray-300">
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
