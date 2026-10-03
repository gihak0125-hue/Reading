import Link from "next/link";
import { getSessionProfile } from "@/lib/auth";
import { startSession } from "./actions";
import { StartButton } from "./start-button";
import { CATEGORIES, CATEGORY_IDS } from "@/lib/categories";

const ACCENT: Record<string, string> = {
  humanities: "bg-rose-400",
  social: "bg-emerald-400",
  science: "bg-sky-400",
  _none: "bg-gray-300 dark:bg-gray-700",
};

type PassageRow = {
  id: string;
  title: string;
  difficulty: number | null;
  source: string | null;
  category: string | null;
};

export default async function ReadListPage() {
  const { supabase, user } = await getSessionProfile("/read");

  const { data: passages } = await supabase
    .from("passages")
    .select("id, title, difficulty, source, category")
    .order("created_at", { ascending: false });

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, passage_id, status, started_at")
    .eq("student_id", user.id)
    .order("started_at", { ascending: false });

  const lastStatus = new Map<string, string>();
  for (const s of sessions ?? [])
    if (!lastStatus.has(s.passage_id)) lastStatus.set(s.passage_id, s.status);

  const list = (passages ?? []) as PassageRow[];
  const groups = [
    ...CATEGORIES.map((c) => ({
      id: c.id,
      label: c.label,
      emoji: c.emoji,
      items: list.filter((p) => p.category === c.id),
    })),
    {
      id: "_none",
      label: "미분류",
      emoji: "📚",
      items: list.filter(
        (p) => !p.category || !CATEGORY_IDS.includes(p.category),
      ),
    },
  ].filter((g) => g.items.length > 0);

  function Card({ p }: { p: PassageRow }) {
    const st = lastStatus.get(p.id);
    const accent = ACCENT[p.category ?? "_none"] ?? ACCENT._none;
    return (
      <li className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white/90 p-5 pl-6 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-950/80">
        <span className={`absolute left-0 top-0 h-full w-1.5 ${accent}`} />
        <div className="min-w-0">
          <p className="truncate font-semibold text-gray-800 dark:text-gray-100">
            {p.title}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              {p.difficulty ? `난이도 ${p.difficulty}` : "난이도 미지정"}
            </span>
            {p.source && (
              <span className="text-gray-400">· {p.source}</span>
            )}
            {st && (
              <span
                className={`rounded-full px-2 py-0.5 ${
                  st === "completed"
                    ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                }`}
              >
                {st === "completed" ? "완료" : "읽는 중"}
              </span>
            )}
          </div>
        </div>
        <form action={startSession} className="mt-4">
          <input type="hidden" name="passage_id" value={p.id} />
          <StartButton />
        </form>
      </li>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-5 py-10">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">읽을 지문 고르기</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            관심 있는 분야의 글을 골라 읽어 보세요.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="shrink-0 rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          대시보드
        </Link>
      </header>

      {groups.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-500 dark:border-gray-700">
          아직 등록된 지문이 없어요. 선생님이 지문을 올리면 여기에 보여요.
        </p>
      ) : (
        groups.map((g) => (
          <section key={g.id} className="flex flex-col gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-gray-100">
              <span aria-hidden>{g.emoji}</span>
              {g.label}
              <span className="text-sm font-normal text-gray-400">
                {g.items.length}
              </span>
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {g.items.map((p) => (
                <Card key={p.id} p={p} />
              ))}
            </ul>
          </section>
        ))
      )}

      {sessions && sessions.length > 0 && (
        <section className="mt-2 flex flex-col gap-2 border-t border-gray-200 pt-6 dark:border-gray-800">
          <h2 className="text-lg font-semibold">내 읽기 기록</h2>
          <ul className="flex flex-col gap-2">
            {sessions.map((s) => {
              const title =
                list.find((p) => p.id === s.passage_id)?.title ?? "지문";
              return (
                <li key={s.id}>
                  <Link
                    href={`/read/${s.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-4 py-3 hover:border-amber-400 dark:border-gray-800"
                  >
                    <span className="min-w-0 truncate">{title}</span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                        s.status === "completed"
                          ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                      }`}
                    >
                      {s.status === "completed" ? "완료" : "이어 읽기"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}
