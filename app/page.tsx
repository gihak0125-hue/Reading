import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
          고등학교 3학년 · 추론적 독해
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          추론적 독해 AI 에이전트
        </h1>
        <p className="text-base leading-relaxed text-gray-600 dark:text-gray-300">
          정답을 먼저 알려주지 않습니다. 스스로 핵심 정보를 찾고, 관계를 잇고,
          글의 구조를 추론하고, 자기설명하도록 돕습니다. 막힌 지점을 진단해
          너에게 맞는 힌트를 제공합니다.
        </p>
        <div className="mt-2">
          <Link
            href="/login"
            className="inline-block rounded-md bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700"
          >
            로그인 / 시작하기
          </Link>
        </div>
      </header>

      <section className="rounded-xl border border-gray-200 p-6 dark:border-gray-800">
        <h2 className="mb-4 text-lg font-semibold">읽기 5단계</h2>
        <ol className="flex flex-col gap-3 text-sm text-gray-700 dark:text-gray-300">
          <li>
            <span className="font-semibold">1. 핵심정보 선별</span> — 문단에서
            핵심어·핵심문장을 직접 표시
          </li>
          <li>
            <span className="font-semibold">2. 관계 연결</span> — 관련 정보를
            화살표로 잇고 관계 유형 판단
          </li>
          <li>
            <span className="font-semibold">3. 구조 추론</span> — 글의 조직
            방식과 논지 흐름 파악
          </li>
          <li>
            <span className="font-semibold">4. 자기설명</span> — 정답 확인 전에
            내 말로 먼저 설명
          </li>
          <li>
            <span className="font-semibold">5. 독해 확인</span> — 중심 내용과
            암묵적 관계 점검
          </li>
        </ol>
      </section>

      <footer className="mt-auto text-sm text-gray-500 dark:text-gray-400">
        초기 스캐폴딩(M1). 로그인·지문·에이전트 기능은 준비 중입니다.
      </footer>
    </main>
  );
}
