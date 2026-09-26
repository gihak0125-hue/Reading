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
          저는 정답부터 찾지 않을게요. 지문을 읽으며 스스로 핵심을 짚고, 정보를
          잇고, 제 생각을 설명해 볼게요. 막히는 곳은 AI 읽기 코치가 저에게 맞는
          질문과 힌트로 도와줘요.
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
        <h2 className="mb-4 text-lg font-semibold">이렇게 읽어요</h2>
        <ul className="flex flex-col gap-3 text-sm text-gray-700 dark:text-gray-300">
          <li>
            <span className="font-semibold">✍️ 손으로 표시</span> — 손가락·펜으로
            핵심어에 밑줄·동그라미
          </li>
          <li>
            <span className="font-semibold">🔗 관계 잇기</span> — 정보를 화살표로
            연결하고 관계 유형(인과·비교대조·문제해결·나열) 판단
          </li>
          <li>
            <span className="font-semibold">💬 자기설명</span> — 정답 확인 전에 내
            말로 먼저 설명
          </li>
          <li>
            <span className="font-semibold">🤖 AI 읽기 코치</span> — 정답 대신
            되묻고, 막힐 때 힌트로 도와줌
          </li>
        </ul>
        <p className="mt-4 text-xs text-gray-400">
          정해진 순서는 없어요. 쭉 읽어 나가며 자유롭게 표시하면 됩니다.
        </p>
      </section>

      <footer className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
        <span>학생은 지문을 읽고 표시하며, 교사는 활동을 확인합니다.</span>
        <Link href="/login" className="text-blue-600 hover:underline dark:text-blue-400">
          시작하기 →
        </Link>
      </footer>
    </main>
  );
}
