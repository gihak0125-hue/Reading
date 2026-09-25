import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth";
import { ParagraphTagger } from "./paragraph-tagger";

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
  const { data: keyInfos } = paraIds.length
    ? await supabase
        .from("passage_key_info")
        .select("id, paragraph_id, span_start, span_end, kind")
        .in("paragraph_id", paraIds)
    : { data: [] };

  const byParagraph = new Map<string, typeof keyInfos>();
  for (const k of keyInfos ?? []) {
    const arr = byParagraph.get(k.paragraph_id) ?? [];
    arr.push(k);
    byParagraph.set(k.paragraph_id, arr);
  }

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
        <Link
          href="/teacher"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          목록
        </Link>
      </header>

      <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-900 dark:text-gray-300">
        각 문단에서 <b>핵심어</b>·<b>핵심문장</b>을 드래그로 선택하고 버튼을
        누르면, 학생 진단의 <b>정답 기준</b>으로 저장됩니다. (학생에게는 직접
        노출되지 않습니다)
      </div>

      <div className="flex flex-col gap-3">
        {(paragraphs ?? []).map((p) => (
          <ParagraphTagger
            key={p.id}
            passageId={passage.id}
            paragraphId={p.id}
            seq={p.seq}
            text={p.text}
            keyInfos={byParagraph.get(p.id) ?? []}
          />
        ))}
      </div>
    </main>
  );
}
