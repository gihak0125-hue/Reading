import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth";
import { EditForm } from "./edit-form";

export default async function EditPassagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user } = await requireTeacher(`/teacher/${id}/edit`);

  const { data: passage } = await supabase
    .from("passages")
    .select("id, title, body, difficulty, source, created_by")
    .eq("id", id)
    .single();

  if (!passage || passage.created_by !== user.id) notFound();

  return (
    <main className="mx-auto flex max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">지문 편집</h1>
        <Link
          href={`/teacher/${id}`}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          돌아가기
        </Link>
      </header>

      <EditForm
        id={passage.id}
        title={passage.title}
        body={passage.body}
        difficulty={passage.difficulty}
        source={passage.source}
      />
    </main>
  );
}
