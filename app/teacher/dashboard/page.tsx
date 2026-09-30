import Link from "next/link";
import { requireTeacher } from "@/lib/auth";

export default async function TeacherDashboard() {
  const { supabase, user } = await requireTeacher("/teacher/dashboard");

  const [{ data: classes }, { data: passages }] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("passages")
      .select("id, title, created_at")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false }),
  ]);
  const classList = classes ?? [];
  const passageList = passages ?? [];
  const classIds = classList.map((c) => c.id);

  const { data: students } = classIds.length
    ? await supabase
        .from("profiles")
        .select("id, display_name, class_id")
        .in("class_id", classIds)
    : {
        data: [] as {
          id: string;
          display_name: string | null;
          class_id: string | null;
        }[],
      };
  const studentList = students ?? [];
  const studentIds = studentList.map((s) => s.id);

  const { data: sessions } = studentIds.length
    ? await supabase
        .from("sessions")
        .select("id, student_id, passage_id, status, started_at")
        .in("student_id", studentIds)
        .order("started_at", { ascending: false })
    : {
        data: [] as {
          id: string;
          student_id: string;
          passage_id: string;
          status: string;
          started_at: string;
        }[],
      };
  const sessionList = sessions ?? [];
  const sessionIds = sessionList.map((s) => s.id);
  const passageIds = [...new Set(sessionList.map((s) => s.passage_id))];

  const [{ data: annos }, { data: msgs }, { data: sessPassages }] =
    await Promise.all([
      sessionIds.length
        ? supabase
            .from("annotations")
            .select("session_id, type")
            .in("session_id", sessionIds)
        : Promise.resolve({
            data: [] as { session_id: string; type: string }[],
          }),
      sessionIds.length
        ? supabase
            .from("agent_messages")
            .select("session_id, role")
            .in("session_id", sessionIds)
        : Promise.resolve({
            data: [] as { session_id: string; role: string }[],
          }),
      passageIds.length
        ? supabase.from("passages").select("id, title").in("id", passageIds)
        : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    ]);

  const marks = new Map<string, number>();
  for (const a of annos ?? [])
    if (a.type !== "arrow")
      marks.set(a.session_id, (marks.get(a.session_id) ?? 0) + 1);
  let explainTotal = 0;
  for (const m of msgs ?? []) if (m.role === "student") explainTotal++;

  const titleOf = new Map((sessPassages ?? []).map((p) => [p.id, p.title]));
  const nameOf = new Map(studentList.map((s) => [s.id, s.display_name]));

  const completed = sessionList.filter((s) => s.status === "completed").length;
  const inProgress = sessionList.length - completed;

  const perClass = classList.map((c) => {
    const sids = new Set(
      studentList.filter((s) => s.class_id === c.id).map((s) => s.id),
    );
    const sess = sessionList.filter((s) => sids.has(s.student_id));
    const done = sess.filter((s) => s.status === "completed").length;
    return {
      id: c.id,
      name: c.name,
      students: sids.size,
      sessions: sess.length,
      done,
    };
  });

  const recent = sessionList.slice(0, 6);
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const stats: { label: string; value: number; tone: string }[] = [
    { label: "학급", value: classList.length, tone: "text-blue-600 dark:text-blue-300" },
    { label: "학생", value: studentList.length, tone: "text-violet-600 dark:text-violet-300" },
    { label: "지문", value: passageList.length, tone: "text-emerald-600 dark:text-emerald-300" },
    { label: "진행 중", value: inProgress, tone: "text-amber-600 dark:text-amber-300" },
    { label: "완료", value: completed, tone: "text-sky-600 dark:text-sky-300" },
    { label: "자기설명", value: explainTotal, tone: "text-rose-600 dark:text-rose-300" },
  ];

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">교사 대시보드</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            우리 반 읽기 활동을 한눈에 봅니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/teacher" className="rounded-md border border-gray-300 px-3 py-2 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">지문 관리</Link>
          <Link href="/teacher/activity" className="rounded-md border border-gray-300 px-3 py-2 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">학생 활동</Link>
          <Link href="/teacher/classes" className="rounded-md border border-gray-300 px-3 py-2 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">학급 관리</Link>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-white/60 bg-white/70 p-4 text-center shadow-lg shadow-blue-200/20 backdrop-blur-md dark:border-white/10 dark:bg-gray-950/60 dark:shadow-black/30"
          >
            <div className={`text-3xl font-bold tabular-nums ${s.tone}`}>{s.value}</div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{s.label}</div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-lg shadow-blue-200/20 backdrop-blur-md dark:border-white/10 dark:bg-gray-950/60 dark:shadow-black/30">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">학급별 진행</h2>
          <Link href="/teacher/classes" className="text-xs text-blue-600 hover:underline dark:text-blue-400">학급 관리 →</Link>
        </div>
        {perClass.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700">
            아직 학급이 없어요. <Link href="/teacher/classes" className="text-blue-600 hover:underline dark:text-blue-400">학급을 만들고</Link> 참여코드를 학생에게 나눠 주세요.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {perClass.map((c) => {
              const pct = c.sessions ? Math.round((c.done / c.sessions) * 100) : 0;
              return (
                <li key={c.id} className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-800">
                  <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
                  <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">학생 {c.students}</span>
                  <div className="hidden h-2 w-28 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800 sm:block">
                    <div className="h-full bg-blue-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-24 shrink-0 text-right text-xs tabular-nums text-gray-500 dark:text-gray-400">완료 {c.done}/{c.sessions}</span>
                  <Link href={`/teacher/activity?class=${c.id}`} className="shrink-0 rounded-md bg-blue-50 px-2.5 py-1 text-xs text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300">보기</Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-lg shadow-blue-200/20 backdrop-blur-md dark:border-white/10 dark:bg-gray-950/60 dark:shadow-black/30">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">최근 활동</h2>
          <Link href="/teacher/activity" className="text-xs text-blue-600 hover:underline dark:text-blue-400">전체 보기 →</Link>
        </div>
        {recent.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700">
            아직 학생 읽기 기록이 없어요. 학생이 지문을 읽고 표시하면 여기에 나타나요.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {recent.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/teacher/activity/${s.id}`}
                  className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2.5 text-sm hover:border-blue-300 hover:bg-blue-50/40 dark:border-gray-800 dark:hover:border-blue-800 dark:hover:bg-blue-950/30"
                >
                  <span className="w-20 shrink-0 truncate font-medium">{nameOf.get(s.student_id) ?? "학생"}</span>
                  <span className="min-w-0 flex-1 truncate text-gray-600 dark:text-gray-300">{titleOf.get(s.passage_id) ?? "(지문)"}</span>
                  <span className="shrink-0 text-xs text-gray-400 tabular-nums">표시 {marks.get(s.id) ?? 0}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${s.status === "completed" ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" : "bg-gray-100 text-gray-500 dark:bg-gray-800"}`}>
                    {s.status === "completed" ? "완료" : "진행 중"}
                  </span>
                  <span className="hidden w-24 shrink-0 text-right text-xs text-gray-400 sm:block">{fmt(s.started_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
