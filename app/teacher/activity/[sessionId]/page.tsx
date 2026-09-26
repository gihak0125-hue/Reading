import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth";

const REL_KO: Record<string, string> = {
  cause_effect: "인과",
  process: "과정",
  compare_contrast: "비교·대조",
  problem_solution: "문제-해결",
  question_answer: "문답",
  listing: "나열",
};

type Anno = {
  id: string;
  paragraph_id: string;
  type: string;
  span_start: number;
  span_end: number;
  target_ref: string | null;
  from_ref: string | null;
  relation_type: string | null;
};

/** 읽기 전용: 문단 텍스트에 밑줄/동그라미를 입혀 렌더 */
function renderParagraph(text: string, annos: Anno[]) {
  const len = text.length;
  const cuts = new Set<number>([0, len]);
  for (const a of annos) {
    cuts.add(Math.max(0, Math.min(len, a.span_start)));
    cuts.add(Math.max(0, Math.min(len, a.span_end)));
  }
  const points = [...cuts].sort((x, y) => x - y);
  const spans = [];
  for (let i = 0; i < points.length - 1; i++) {
    const s = points[i];
    const e = points[i + 1];
    if (e <= s) continue;
    const cover = annos.filter((a) => a.span_start <= s && a.span_end >= e);
    const underline = cover.some((a) => a.type === "underline");
    const circle = cover.some((a) => a.type === "circle");
    const cls = [
      underline
        ? "underline decoration-blue-500 decoration-2 underline-offset-4"
        : "",
      circle ? "rounded-full border-2 border-rose-400 px-1 py-0.5" : "",
    ]
      .filter(Boolean)
      .join(" ");
    spans.push(
      <span key={i} className={cls || undefined}>
        {text.slice(s, e)}
      </span>,
    );
  }
  return spans;
}

export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const { supabase } = await requireTeacher(`/teacher/activity/${sessionId}`);

  const { data: session } = await supabase
    .from("sessions")
    .select("id, student_id, passage_id, status")
    .eq("id", sessionId)
    .single();
  if (!session) notFound();

  const [{ data: student }, { data: passage }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", session.student_id)
      .single(),
    supabase
      .from("passages")
      .select("title")
      .eq("id", session.passage_id)
      .single(),
  ]);

  const { data: paragraphs } = await supabase
    .from("passage_paragraphs")
    .select("id, seq, text")
    .eq("passage_id", session.passage_id)
    .order("seq", { ascending: true });

  const { data: annos } = await supabase
    .from("annotations")
    .select(
      "id, paragraph_id, type, span_start, span_end, target_ref, from_ref, relation_type",
    )
    .eq("session_id", sessionId);

  const { data: msgs } = await supabase
    .from("agent_messages")
    .select("id, role, content, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  const allAnnos = (annos ?? []) as Anno[];
  const marks = allAnnos.filter(
    (a) => a.type === "underline" || a.type === "circle",
  );
  const relations = allAnnos.filter((a) => a.type === "arrow");
  const annoById = new Map(allAnnos.map((a) => [a.id, a]));
  const paraText = new Map((paragraphs ?? []).map((p) => [p.id, p.text]));
  const markText = (id: string | null) => {
    const a = id ? annoById.get(id) : null;
    if (!a) return "(삭제됨)";
    return (paraText.get(a.paragraph_id) ?? "").slice(a.span_start, a.span_end);
  };

  return (
    <main className="mx-auto flex max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">
            {student?.display_name ?? "학생"} · {passage?.title ?? "지문"}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            표시 {marks.length} · 관계 {relations.length} · 설명{" "}
            {(msgs ?? []).filter((m) => m.role === "student").length}
          </p>
        </div>
        <Link
          href="/teacher/activity"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          목록
        </Link>
      </header>

      {/* 표시된 지문 */}
      <section className="rounded-xl border border-gray-200 p-5 dark:border-gray-800">
        <h2 className="mb-3 font-semibold">📖 학생이 표시한 지문</h2>
        <div className="flex flex-col gap-4">
          {(paragraphs ?? []).map((p) => (
            <p
              key={p.id}
              className="whitespace-pre-wrap leading-8 text-gray-800 dark:text-gray-100"
            >
              {renderParagraph(
                p.text,
                marks.filter((a) => a.paragraph_id === p.id),
              )}
            </p>
          ))}
        </div>
      </section>

      {/* 관계 */}
      <section className="rounded-xl border border-gray-200 p-5 dark:border-gray-800">
        <h2 className="mb-3 font-semibold">🔗 연결한 관계 ({relations.length})</h2>
        {relations.length === 0 ? (
          <p className="text-sm text-gray-400">아직 없음</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {relations.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-1.5">
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800">
                  {markText(a.from_ref)}
                </span>
                <span className="font-medium text-blue-600">
                  {a.relation_type === "compare_contrast" ? "↔" : "→"}{" "}
                  {REL_KO[a.relation_type ?? "listing"] ?? "관계"}
                </span>
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800">
                  {markText(a.target_ref)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 대화/설명 */}
      <section className="rounded-xl border border-gray-200 p-5 dark:border-gray-800">
        <h2 className="mb-3 font-semibold">💬 자기설명 · 코치 대화</h2>
        {!msgs || msgs.length === 0 ? (
          <p className="text-sm text-gray-400">아직 없음</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {msgs.map((m) => (
              <li
                key={m.id}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.role === "student"
                    ? "ml-auto bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
                }`}
              >
                {m.content}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
