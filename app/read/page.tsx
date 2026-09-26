import Link from "next/link";
import { getSessionProfile } from "@/lib/auth";
import { startSession } from "./actions";

export default async function ReadListPage() {
  const { supabase, user } = await getSessionProfile("/read");

  const { data: passages } = await supabase
    .from("passages")
    .select("id, title, difficulty, source")
    .order("created_at", { ascending: false });

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, passage_id, status, started_at")
    .eq("student_id", user.id)
    .order("started_at", { ascending: false });

  const titleOf = new Map((passages ?? []).map((p) => [p.id, p.title]));

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

      {sessions && sessions.length > 0 && (
        <section className="mt-4 flex flex-col gap-2">
          <h2 className="text-lg font-semibold">내 읽기 기록</h2>
          <ul className="flex flex-col gap-2">
            {sessions.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/read/${s.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-4 py-3 hover:border-blue-400 dark:border-gray-800"
                >
                  <span className="min-w-0 truncate">
                    {titleOf.get(s.passage_id) ?? "지문"}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                      s.status === "completed"
                        ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    }`}
                  >
                    {s.status === "completed" ? "완료" : "이어 읽기"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
