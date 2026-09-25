import Link from "next/link";
import { getSessionProfile } from "@/lib/auth";
import { startSession } from "./actions";

export default async function ReadListPage() {
  const { supabase } = await getSessionProfile("/read");

  const { data: passages } = await supabase
    .from("passages")
    .select("id, title, difficulty, source")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col gap-6 px-5 py-10">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">읽을 지문 고르기</h1>
        <Link
          href="/dashboard"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          대시보드
        </Link>
      </header>

      {!passages || passages.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500 dark:border-gray-700">
          아직 등록된 지문이 없어요. 선생님이 지문을 올리면 여기에 보여요.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {passages.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 p-5 dark:border-gray-800"
            >
              <div className="min-w-0">
                <p className="font-semibold">{p.title}</p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {p.difficulty ? `난이도 ${p.difficulty}` : "난이도 미지정"}
                  {p.source ? ` · ${p.source}` : ""}
                </p>
              </div>
              <form action={startSession}>
                <input type="hidden" name="passage_id" value={p.id} />
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-5 py-3 text-base font-medium text-white hover:bg-blue-700"
                >
                  읽기 시작
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
