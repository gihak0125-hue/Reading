import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";

const STEPS = [
  { key: "S1", label: "핵심정보" },
  { key: "S2", label: "관계 연결" },
  { key: "S3", label: "구조 추론" },
  { key: "S4", label: "자기설명" },
  { key: "S5", label: "독해 확인" },
];

export default async function ReadingPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const { supabase, user } = await getSessionProfile(`/read/${sessionId}`);

  const { data: session } = await supabase
    .from("sessions")
    .select("id, student_id, passage_id, status")
    .eq("id", sessionId)
    .single();

  if (!session || session.student_id !== user.id) notFound();

  const { data: passage } = await supabase
    .from("passages")
    .select("id, title")
    .eq("id", session.passage_id)
    .single();

  const { data: paragraphs } = await supabase
    .from("passage_paragraphs")
    .select("id, seq, text")
    .eq("passage_id", session.passage_id)
    .order("seq", { ascending: true });

  if (!passage) notFound();

  const currentStep = "S1";

  return (
    <main className="mx-auto flex min-h-full max-w-2xl flex-1 flex-col gap-6 px-5 py-8">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold sm:text-2xl">{passage.title}</h1>
        <Link
          href="/read"
          className="shrink-0 rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          목록
        </Link>
      </header>

      {/* 5단계 진행 표시 */}
      <ol className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {STEPS.map((s, i) => {
          const active = s.key === currentStep;
          return (
            <li key={s.key} className="flex items-center gap-1.5">
              <span
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium ${
                  active
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                <span className="tabular-nums">{i + 1}</span>
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <span className="text-gray-300 dark:text-gray-600">›</span>
              )}
            </li>
          );
        })}
      </ol>

      <div className="rounded-xl bg-blue-50 p-4 text-sm leading-relaxed text-blue-900 dark:bg-blue-950 dark:text-blue-100">
        <b>1단계 · 핵심정보 선별</b> — 먼저 각 문단을 읽고, 가장 중요한
        핵심어·핵심문장이 무엇일지 생각해 보세요. (표시 기능은 곧 추가됩니다)
      </div>

      {/* 지문 본문: 태블릿에서 읽기 편한 크기 */}
      <article className="flex flex-col gap-5">
        {(paragraphs ?? []).map((p) => (
          <p
            key={p.id}
            className="whitespace-pre-wrap text-lg leading-8 text-gray-800 dark:text-gray-100"
          >
            {p.text}
          </p>
        ))}
      </article>

      <footer className="mt-auto pt-4 text-center text-sm text-gray-400">
        읽기 세션 진행 중 · 다음 단계 기능은 준비 중입니다
      </footer>
    </main>
  );
}
