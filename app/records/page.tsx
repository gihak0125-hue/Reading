import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_LABEL } from "@/lib/categories";
import { StudentSidebar } from "@/app/dashboard/student-sidebar";

const CAT_BAR: Record<string, string> = {
  humanities: "bg-rose-400",
  social: "bg-emerald-400",
  science: "bg-sky-400",
  _none: "bg-gray-300 dark:bg-gray-600",
};

function ScorePill({ label, v }: { label: string; v: number | null }) {
  return (
    <div className="rounded-xl bg-gray-50 py-3 text-center dark:bg-gray-900">
      <div className="text-xl font-bold text-gray-800 dark:text-gray-100">
        {v == null ? "–" : v}
      </div>
      <div className="mt-0.5 text-[11px] text-gray-400">{label}</div>
    </div>
  );
}

export default async function RecordsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/records");

  const [{ data: sessions }, { data: passages }] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, passage_id, status, started_at")
      .eq("student_id", user.id)
      .order("started_at", { ascending: false }),
    supabase.from("passages").select("id, title, category"),
  ]);
  const sess = sessions ?? [];
  const pById = new Map((passages ?? []).map((p) => [p.id, p]));
  const doneCount = sess.filter((s) => s.status === "completed").length;

  const sessionIds = sess.map((s) => s.id);
  type Score = {
    session_id: string;
    fact: number | null;
    inference: number | null;
    critique: number | null;
    updated_at: string;
  };
  let scores: Score[] = [];
  if (sessionIds.length) {
    const { data } = await supabase
      .from("session_scores")
      .select("session_id, fact, inference, critique, updated_at")
      .in("session_id", sessionIds)
      .order("updated_at", { ascending: false });
    scores = (data ?? []) as Score[];
  }
  // 세션별 점수 병합(같은 세션의 여러 단계 점수를 하나로)
  const bySession = new Map<string, { fact: number | null; inference: number | null; critique: number | null }>();
  for (const r of scores) {
    const cur = bySession.get(r.session_id) ?? { fact: null, inference: null, critique: null };
    if (cur.fact == null && r.fact != null) cur.fact = r.fact;
    if (cur.inference == null && r.inference != null) cur.inference = r.inference;
    if (cur.critique == null && r.critique != null) cur.critique = r.critique;
    bySession.set(r.session_id, cur);
  }
  const firstOf = (k: "fact" | "inference" | "critique") =>
    scores.find((r) => r[k] != null)?.[k] ?? null;
  const latest = {
    fact: firstOf("fact"),
    inference: firstOf("inference"),
    critique: firstOf("critique"),
  };

  const scored = sess.filter((s) => bySession.has(s.id));

  return (
    <div className="flex min-h-full w-full flex-1">
      <StudentSidebar />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              학습 기록
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              내 읽기 점수와 기록을 한눈에 봐요.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-full border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            홈
          </Link>
        </header>

        <section className="rounded-2xl border border-white/70 bg-white/85 p-5 shadow-sm dark:border-white/10 dark:bg-gray-950/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">최근 점수</span>
            <span className="text-xs text-gray-400">완료한 읽기 {doneCount}개</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <ScorePill label="사실" v={latest.fact} />
            <ScorePill label="추론" v={latest.inference} />
            <ScorePill label="비판" v={latest.critique} />
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-sm font-semibold text-gray-700 dark:text-gray-200">
            지문별 점수
          </h2>
          {scored.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-300 bg-white/50 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-950/40 dark:text-gray-400">
              아직 점수가 없어요.{" "}
              <Link href="/read" className="text-amber-700 hover:underline dark:text-amber-400">
                지문을 읽어볼까요? &rarr;
              </Link>
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {scored.map((s) => {
                const p = pById.get(s.passage_id);
                const sc = bySession.get(s.id)!;
                return (
                  <li
                    key={s.id}
                    className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white/90 p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950/80"
                  >
                    <span
                      className={
                        "h-8 w-1.5 shrink-0 rounded-full " +
                        (CAT_BAR[p?.category ?? "_none"] ?? CAT_BAR._none)
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-gray-800 dark:text-gray-100">
                        {p?.title ?? "지문"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {p?.category ? CATEGORY_LABEL[p.category] : "미분류"}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1.5 text-xs">
                      {([["사실", sc.fact], ["추론", sc.inference], ["비판", sc.critique]] as [string, number | null][]).map(
                        ([label, v]) => (
                          <span
                            key={label}
                            className="rounded-md bg-gray-100 px-2 py-1 text-center text-gray-600 dark:bg-gray-800 dark:text-gray-200"
                          >
                            <span className="block text-[10px] text-gray-400">{label}</span>
                            <span className="font-semibold">{v == null ? "–" : v}</span>
                          </span>
                        ),
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
