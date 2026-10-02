import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-10 px-6 py-12 sm:py-16">
      <header className="flex min-h-[60vh] max-w-xl flex-col justify-center gap-4">
        <p className="inline-flex w-fit items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-sm font-medium text-sky-800 shadow-sm dark:bg-gray-950/70 dark:text-sky-300">
          고등학교 3학년 · AI 읽기 코치
        </p>
        <h1 className="text-4xl font-bold leading-tight tracking-tight text-gray-800 drop-shadow-sm dark:text-gray-100 sm:text-5xl">
          읽고 생각하는 힘,
          <br />
          <span className="text-amber-700 dark:text-amber-400">
            문해력
          </span>
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
