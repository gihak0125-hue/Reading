import Link from "next/link";
import { requireTeacher } from "@/lib/auth";
import { PassageForm } from "./passage-form";
import { deletePassage } from "./actions";

export default async function TeacherPage() {
  const { supabase, user } = await requireTeacher();

  const { data: passages } = await supabase
    .from("passages")
    .select("id, title, difficulty, source, created_at")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto flex max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">지문 관리</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            추론적 독해 지문을 등록하고 핵심정보를 태깅합니다.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          대시보드
        </Link>
      </header>

      <PassageForm />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">
          등록된 지문 {passages?.length ? `(${passages.length})` : ""}
        </h2>
        {!passages || passages.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700">
            아직 등록된 지문이 없습니다. 위에서 첫 지문을 등록해 보세요.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {passages.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-800"
              >
                <Link href={`/teacher/${p.id}`} className="min-w-0 flex-1">
                  <span className="font-medium">{p.title}</span>
                  <span className="ml-2 text-xs text-gray-400">
                    {p.difficulty ? `난이도 ${p.difficulty}` : ""}
                    {p.source ? ` · ${p.source}` : ""}
                  </span>
                </Link>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/teacher/${p.id}`}
                    className="rounded-md bg-blue-50 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300"
                  >
                    태깅
                  </Link>
                  <form action={deletePassage}>
                    <input type="hidden" name="id" value={p.id} />
                    <button
                      type="submit"
                      className="rounded-md px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      삭제
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
