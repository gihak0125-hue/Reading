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

  // ===== 주별 점수 추이(최근 8주, 각 점수 행의 평균을 주 단위로 집계) =====
  const WEEKS = 8;
  const WEEK_MS = 7 * 24 * 3600 * 1000;
  const now = Date.now();
  const buckets = Array.from({ length: WEEKS }, () => ({ sum: 0, n: 0 }));
  for (const r of scores) {
    const vals = [r.fact, r.inference, r.critique].filter(
      (v): v is number => v != null,
    );
    if (!vals.length) continue;
    const overall = vals.reduce((a, b) => a + b, 0) / vals.length;
    const wi = Math.floor((now - new Date(r.updated_at).getTime()) / WEEK_MS);
    if (wi >= 0 && wi < WEEKS) {
      buckets[wi].sum += overall;
      buckets[wi].n += 1;
    }
  }
  // 오래된 주 → 최근 주 순서
  const series = buckets
    .map((b) => (b.n ? Math.round(b.sum / b.n) : null))
    .reverse();
  const hasTrend = series.some((v) => v != null);
  // 라인 차트 좌표
  const CW = 320, CH = 120, X0 = 22, X1 = 300, Y0 = 12, Y1 = 94;
  const xAt = (i: number) => X0 + ((X1 - X0) * i) / (WEEKS - 1);
  const yAt = (v: number) => Y1 - ((Y1 - Y0) * v) / 100;
  const pts = series
    .map((v, i) => (v == null ? null : { x: xAt(i), y: yAt(v), v, i }))
    .filter((p): p is { x: number; y: number; v: number; i: number } => !!p);
  const linePath = pts
    .map((p, k) => `${k ? "L" : "M"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

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

        {hasTrend && (
          <section className="rounded-2xl border border-white/70 bg-white/85 p-5 shadow-sm dark:border-white/10 dark:bg-gray-950/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400">주별 점수 추이</span>
              <span className="text-xs text-gray-400">최근 {WEEKS}주 · 종합 평균</span>
            </div>
            <svg viewBox={`0 0 ${CW} ${CH}`} className="mt-3 w-full" role="img" aria-label="주별 점수 추이">
              {[0, 25, 50, 75, 100].map((g) => (
                <g key={g}>
                  <line x1={X0} y1={yAt(g)} x2={X1} y2={yAt(g)} stroke="#eae9e3" strokeWidth="1" />
                  <text x={X0 - 4} y={yAt(g) + 3} textAnchor="end" fontSize="8" fill="#b7b3a8">{g}</text>
                </g>
              ))}
              {pts.length > 1 && (
                <path d={linePath} fill="none" stroke="#286b55" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              )}
              {pts.map((p) => (
                <g key={p.i}>
                  <circle cx={p.x} cy={p.y} r="3.5" fill="#fff" stroke="#286b55" strokeWidth="2" />
                  <text x={p.x} y={p.y - 7} textAnchor="middle" fontSize="9" fontWeight="700" fill="#286b55">{p.v}</text>
                </g>
              ))}
              <text x={X0} y={112} textAnchor="start" fontSize="8" fill="#b7b3a8">{WEEKS}주 전</text>
              <text x={X1} y={112} textAnchor="end" fontSize="8" fill="#b7b3a8">이번 주</text>
            </svg>
          </section>
        )}

        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-sm font-semibold text-gray-700 dark:text-gray-200">
            지문별 점수
          </h2>
          {scored.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-300 bg-white/50 p-8 text-center dark:border-gray-700 dark:bg-gray-950/40">
              <svg viewBox="0 0 120 80" className="h-20 w-auto" aria-hidden>
                <ellipse cx="60" cy="72" rx="36" ry="4" fill="#286b55" opacity="0.1" />
                <line x1="24" y1="60" x2="96" y2="60" stroke="#c9e4d5" strokeWidth="2" strokeLinecap="round" />
                <rect x="34" y="44" width="12" height="16" rx="2" fill="#a6d1bd" />
                <rect x="54" y="34" width="12" height="26" rx="2" fill="#6cb195" />
                <rect x="74" y="24" width="12" height="36" rx="2" fill="#286b55" />
                <path d="M92 16 l1.6 4.4 4.4 1.6 -4.4 1.6 -1.6 4.4 -1.6 -4.4 -4.4 -1.6 4.4 -1.6 z" fill="#f6b73c" />
              </svg>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                아직 점수가 없어요.{" "}
                <Link href="/read" className="font-medium text-amber-700 hover:underline dark:text-amber-400">
                  지문을 읽어볼까요? &rarr;
                </Link>
              </p>
            </div>
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
