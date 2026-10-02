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
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-12 sm:py-16">
      <header className="flex min-h-[46vh] max-w-xl flex-col justify-center gap-4">
        <p className="inline-flex w-fit items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-sm font-medium text-sky-800 shadow-sm dark:bg-gray-950/70 dark:text-sky-300">
          고등학교 3학년 · 추론적 독해
        </p>
        <h1 className="text-4xl font-bold leading-tight tracking-tight text-gray-800 drop-shadow-sm dark:text-gray-100 sm:text-5xl">
          오늘도
          <br />
          <span className="text-amber-700 dark:text-amber-400">
            차분히 읽는
          </span>{" "}
          시간
        </h1>
        <p className="max-w-md text-base leading-relaxed text-gray-700 dark:text-gray-200">
          정답을 먼저 알려주지 않아요. 지문을 읽으며 스스로 핵심을 찾고, 정보를
          잇고, 내 말로 설명하도록 곁에서 도와줍니다. 막히는 지점은 AI 읽기
          코치가 질문과 힌트로 함께 풀어가요.
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="inline-block rounded-xl bg-amber-700 px-6 py-3 font-medium text-white shadow-lg shadow-amber-700/25 transition hover:bg-amber-800"
          >
            로그인 / 시작하기
          </Link>
          <Link
            href="/join"
            className="inline-block rounded-xl border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            참여 코드로 시작
          </Link>
        </div>
      </header>

      <section className="rounded-3xl border border-white/70 bg-white/70 p-6 shadow-xl shadow-sky-900/10 dark:border-white/10 dark:bg-gray-950/65 dark:shadow-black/30 sm:p-8">
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

      <footer className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-white/70 px-3 py-2 text-sm text-gray-600 dark:bg-gray-950/60 dark:text-gray-300">
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
