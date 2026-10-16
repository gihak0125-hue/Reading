import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth";
import { PassageWorkspace } from "./passage-workspace";
import { CritiqueNote } from "./critique-note";
import { CheckQuestions } from "./check-questions";
import { MarkingRubric } from "./marking-rubric";

export default async function PassageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user } = await requireTeacher(`/teacher/${id}`);

  const { data: passage } = await supabase
    .from("passages")
    .select("id, title, difficulty, source, created_by")
    .eq("id", id)
    .single();

  if (!passage || passage.created_by !== user.id) notFound();

  const { data: paragraphs } = await supabase
    .from("passage_paragraphs")
    .select("id, seq, text")
    .eq("passage_id", id)
    .order("seq", { ascending: true });

  const paraIds = (paragraphs ?? []).map((p) => p.id);
  // rank 컬럼(0025)이 아직 없을 수 있어 폴백 조회
  let keyInfos:
    | {
        id: string;
        paragraph_id: string;
        span_start: number;
        span_end: number;
        kind: "keyword" | "key_sentence";
        rank?: number | null;
      }[]
    | null = [];
  if (paraIds.length) {
    const withRank = await supabase
      .from("passage_key_info")
      .select("id, paragraph_id, span_start, span_end, kind, rank")
      .in("paragraph_id", paraIds);
    if (withRank.error) {
      const plain = await supabase
        .from("passage_key_info")
        .select("id, paragraph_id, span_start, span_end, kind")
        .in("paragraph_id", paraIds);
      keyInfos = plain.data;
    } else {
      keyInfos = withRank.data;
    }
  }

  const { data: relations } = await supabase
    .from("passage_key_relations")
    .select(
      "id, from_paragraph_id, from_start, from_end, to_paragraph_id, to_start, to_end, relation_type",
    )
    .eq("passage_id", id);

  const { data: critique } = await supabase
    .from("passage_critique")
    .select("note, rubric")
    .eq("passage_id", id)
    .maybeSingle();

  const { data: checks } = await supabase
    .from("passage_checks")
    .select("detail_q, detail_a, main_q, main_a, inference_q, inference_a, rubric")
    .eq("passage_id", id)
    .maybeSingle();

  const { data: marking } = await supabase
    .from("passage_marking")
    .select("rubric")
    .eq("passage_id", id)
    .maybeSingle();

  return (
    <main className="mx-auto flex max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{passage.title}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {passage.difficulty ? `난이도 ${passage.difficulty}` : "난이도 미지정"}
            {passage.source ? ` · ${passage.source}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/teacher/${passage.id}/edit`}
            className="rounded-md bg-amber-700 px-3 py-2 text-sm font-medium text-white hover:bg-amber-800"
          >
            수정
          </Link>
          <Link
            href="/teacher"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            목록
          </Link>
        </div>
      </header>

      <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-900 dark:text-gray-300">
        각 문단에서 <b>중심화제</b>·<b>중심문장</b>을 드래그로 선택하고 버튼을
        누르면, 학생 진단의 <b>정답 기준</b>으로 저장됩니다. 저장된 표시와 관계는
        본문에 색으로 비칩니다. (AI 분석을 누르면 추천이 본문에 점선으로 미리
        보여요. 학생에게는 직접 노출되지 않습니다)
      </div>

      <PassageWorkspace
        passageId={passage.id}
        paragraphs={paragraphs ?? []}
        keyInfos={keyInfos ?? []}
        relations={relations ?? []}
      />

      <MarkingRubric
        passageId={passage.id}
        initialRubric={marking?.rubric ?? ""}
      />

      <CheckQuestions
        passageId={passage.id}
        initial={{
          detail_q: checks?.detail_q ?? "",
          detail_a: checks?.detail_a ?? "",
          main_q: checks?.main_q ?? "",
          main_a: checks?.main_a ?? "",
          inference_q: checks?.inference_q ?? "",
          inference_a: checks?.inference_a ?? "",
          rubric: checks?.rubric ?? "",
        }}
      />

      <CritiqueNote
        passageId={passage.id}
        initial={critique?.note ?? ""}
        initialRubric={critique?.rubric ?? ""}
      />
    </main>
  );
}
