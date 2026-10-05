import Link from "next/link";
import type { ReactNode } from "react";

function Feature({
  icon,
  title,
  desc,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-white/60 bg-white/75 p-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-gray-950/65">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
        {icon}
      </span>
      <p className="font-semibold text-gray-800 dark:text-gray-100">{title}</p>
      <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
        {desc}
      </p>
    </div>
  );
}

function Ic({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-10 px-6 py-12 sm:py-16">
      <header className="flex min-h-[52vh] max-w-xl flex-col justify-center gap-5">
        <p className="inline-flex w-fit items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-sm font-medium text-sky-800 shadow-sm backdrop-blur-sm dark:bg-gray-950/70 dark:text-sky-300">
          고등학교 3학년 · 추론적 독해 AI 코치
        </p>
        <h1 className="text-4xl font-bold leading-tight tracking-tight text-gray-800 drop-shadow-sm dark:text-gray-100 sm:text-5xl">
          읽고 생각하는 힘,
          <br />
          <span className="text-amber-700 dark:text-amber-400">문해력</span>
        </h1>
        <p className="max-w-md text-base leading-relaxed text-gray-700 dark:text-gray-200">
          정답을 먼저 알려주지 않아요. 지문을 읽으며 스스로 핵심을 찾고, 정보를
          잇고, 내 말로 설명하도록 곁에서 도와줍니다. 막히는 지점은 AI 읽기
          코치가 질문과 힌트로 함께 풀어가요.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Link
            href="/login"
            className="inline-block rounded-xl bg-amber-700 px-6 py-3 font-medium text-white shadow-lg shadow-amber-700/25 transition hover:-translate-y-0.5 hover:bg-amber-800"
          >
            시작하기
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-amber-800 hover:underline dark:text-amber-300"
          >
            이미 계정이 있어요 &rarr;
          </Link>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <Feature
          title="읽으며 표시"
          desc="밑줄·동그라미·화살표로 핵심과 정보의 관계를 손으로 짚어요."
          icon={
            <Ic>
              <path d="M4 20 16 8l-3-3L1 17z" />
              <path d="M14 6l3 3" />
            </Ic>
          }
        />
        <Feature
          title="AI 읽기 코치"
          desc="정답 대신 질문과 힌트로, 스스로 생각해 답을 찾도록 도와요."
          icon={
            <Ic>
              <path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2z" />
              <path d="M9 10h6M9 13h3" />
            </Ic>
          }
        />
        <Feature
          title="성장 확인"
          desc="사실·추론·비판 점수로 내 읽기를 돌아보고 한 걸음씩 자라요."
          icon={
            <Ic>
              <path d="M4 20V11M10 20V4M16 20v-6" />
              <path d="M3 20h18" />
            </Ic>
          }
        />
      </section>
    </main>
  );
}
