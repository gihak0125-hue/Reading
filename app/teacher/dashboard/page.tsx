import Link from "next/link";
import { requireTeacher } from "@/lib/auth";

type Anno = {
  id: string;
  session_id: string;
  paragraph_id: string;
  type: string;
  span_start: number;
  span_end: number;
  from_ref: string | null;
  target_ref: string | null;
  relation_type: string | null;
};
type KeyInfo = {
  paragraph_id: string;
  span_start: number;
  span_end: number;
  kind: string;
};
type KeyRel = {
  passage_id: string;
  from_paragraph_id: string;
  from_start: number;
  from_end: number;
  to_paragraph_id: string;
  to_start: number;
  to_end: number;
  relation_type: string;
};

const overlaps = (as: number, ae: number, bs: number, be: number) =>
  as < be && ae > bs;
const clip = (t: string, n = 40) => (t.length > n ? t.slice(0, n) + "…" : t);

function ScoreCell({ v }: { v: number | null }) {
  if (v == null)
    return <span className="text-gray-300 dark:text-gray-600">–</span>;
  return (
    <span className="inline-block rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
      {v}
    </span>
  );
}

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
  const myPassageIds = passageList.map((p) => p.id);

  const [{ data: students }, { data: paragraphs }, { data: keyRels }] =
    await Promise.all([
      classIds.length
        ? supabase
            .from("profiles")
            .select("id, display_name, class_id, student_no")
            .in("class_id", classIds)
        : Promise.resolve({
            data: [] as {
              id: string;
              display_name: string | null;
              class_id: string | null;
              student_no: number | null;
            }[],
          }),
      myPassageIds.length
        ? supabase
            .from("passage_paragraphs")
            .select("id, passage_id, text")
            .in("passage_id", myPassageIds)
        : Promise.resolve({
            data: [] as { id: string; passage_id: string; text: string }[],
          }),
      myPassageIds.length
        ? supabase
            .from("passage_key_relations")
            .select(
              "passage_id, from_paragraph_id, from_start, from_end, to_paragraph_id, to_start, to_end, relation_type",
            )
            .in("passage_id", myPassageIds)
        : Promise.resolve({ data: [] as KeyRel[] }),
    ]);
  const studentList = students ?? [];
  const studentIds = studentList.map((s) => s.id);
  const paraList = paragraphs ?? [];
  const paraToPassage = new Map(paraList.map((p) => [p.id, p.passage_id]));
  const paraText = new Map(paraList.map((p) => [p.id, p.text]));
  const myParaIds = paraList.map((p) => p.id);
  const keyRelList = (keyRels ?? []) as KeyRel[];

  const { data: keyInfos } = myParaIds.length
    ? await supabase
        .from("passage_key_info")
        .select("paragraph_id, span_start, span_end, kind")
        .in("paragraph_id", myParaIds)
    : { data: [] as KeyInfo[] };
  const keyInfoList = (keyInfos ?? []) as KeyInfo[];

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
  const touchedPassageIds = [...new Set(sessionList.map((s) => s.passage_id))];

  const [{ data: annos }, { data: msgs }, { data: sessPassages }] =
    await Promise.all([
      sessionIds.length
        ? supabase
            .from("annotations")
            .select(
              "id, session_id, paragraph_id, type, span_start, span_end, from_ref, target_ref, relation_type",
            )
            .in("session_id", sessionIds)
        : Promise.resolve({ data: [] as Anno[] }),
      sessionIds.length
        ? supabase
            .from("agent_messages")
            .select("session_id, role")
            .in("session_id", sessionIds)
        : Promise.resolve({
            data: [] as { session_id: string; role: string }[],
          }),
      touchedPassageIds.length
        ? supabase
            .from("passages")
            .select("id, title")
            .in("id", touchedPassageIds)
        : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    ]);
  const annoList = (annos ?? []) as Anno[];

  const { data: diags } = sessionIds.length
    ? await supabase
        .from("diagnoses")
        .select("difficulty_area, created_at")
        .in("session_id", sessionIds)
    : {
        data: [] as { difficulty_area: string | null; created_at: string }[],
      };
  const areaCount = { key_info: 0, inference: 0, viewpoint: 0, relation: 0 };
  for (const d of diags ?? []) {
    const a = (d.difficulty_area ?? "") as keyof typeof areaCount;
    if (a in areaCount) areaCount[a] += 1;
  }
  const diagTotal =
    areaCount.key_info +
    areaCount.inference +
    areaCount.viewpoint +
    areaCount.relation;

  // 독해 점수(형성 평가) 집계
  const { data: scoreRows } = sessionIds.length
    ? await supabase
        .from("session_scores")
        .select("session_id, stage, fact, inference, critique")
        .in("session_id", sessionIds)
    : {
        data: [] as {
          session_id: string;
          stage: string;
          fact: number | null;
          inference: number | null;
          critique: number | null;
        }[],
      };
  const avgOf = (arr: (number | null)[]) => {
    const v = arr.filter((x): x is number => typeof x === "number");
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
  };
  const sc = scoreRows ?? [];
  const byStage = (st: string) => sc.filter((r) => r.stage === st);
  const stageStats = [
    {
      key: "reading",
      label: "읽기(표시)",
      n: byStage("reading").length,
      bars: [
        { label: "사실", value: avgOf(byStage("reading").map((r) => r.fact)), color: "bg-emerald-500" },
        { label: "추론", value: avgOf(byStage("reading").map((r) => r.inference)), color: "bg-sky-500" },
      ],
    },
    {
      key: "check",
      label: "독해 확인",
      n: byStage("check").length,
      bars: [
        { label: "사실", value: avgOf(byStage("check").map((r) => r.fact)), color: "bg-emerald-500" },
        { label: "추론", value: avgOf(byStage("check").map((r) => r.inference)), color: "bg-sky-500" },
      ],
    },
    {
      key: "critique",
      label: "관점 평가",
      n: byStage("critique").length,
      bars: [
        { label: "비판", value: avgOf(byStage("critique").map((r) => r.critique)), color: "bg-rose-500" },
      ],
    },
  ];

  const perStudent = studentList
    .map((st) => {
      const mySess = new Set(
        sessionList.filter((x) => x.student_id === st.id).map((x) => x.id),
      );
      const rowsFor = (stage: string) =>
        sc.filter((r) => r.stage === stage && mySess.has(r.session_id));
      const avgPair = (rs: typeof sc) =>
        avgOf(rs.flatMap((r) => [r.fact, r.inference]));
      const readRows = rowsFor("reading");
      const checkRows = rowsFor("check");
      const critRows = rowsFor("critique");
      return {
        id: st.id,
        no: st.student_no,
        name: st.display_name ?? "학생",
        reading: avgPair(readRows),
        check: avgPair(checkRows),
        critique: avgOf(critRows.map((r) => r.critique)),
        any: readRows.length + checkRows.length + critRows.length > 0,
      };
    })
    .filter((r) => r.any)
    .sort((a, b) => {
      if (a.no == null && b.no == null) return a.name.localeCompare(b.name);
      if (a.no == null) return 1;
      if (b.no == null) return -1;
      return a.no - b.no;
    });

  // 주별 추이(최근 6주): 완료 읽기 수 + 어려움 진단 수
  const WK = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const weekOf = (iso: string | null) =>
    iso ? Math.floor((now - new Date(iso).getTime()) / WK) : -1;
  const doneByWeek = [0, 0, 0, 0, 0, 0];
  for (const s of sessionList) {
    if (s.status !== "completed") continue;
    const w = weekOf(s.started_at);
    if (w >= 0 && w < 6) doneByWeek[5 - w] += 1;
  }
  const diagByWeek = [0, 0, 0, 0, 0, 0];
  for (const d of diags ?? []) {
    const w = weekOf(d.created_at);
    if (w >= 0 && w < 6) diagByWeek[5 - w] += 1;
  }
  const maxDone = Math.max(1, ...doneByWeek);
  const weekLabel = (i: number) => (i === 5 ? "이번 주" : `${5 - i}주 전`);

  // 세션별 표시(마크)와 화살표, 전역 마크 위치 맵
  const marksBySession = new Map<
    string,
    { p: string; s: number; e: number }[]
  >();
  const arrowsBySession = new Map<string, Anno[]>();
  const markPos = new Map<string, { p: string; s: number; e: number }>();
  const marksCount = new Map<string, number>();
  for (const a of annoList) {
    if (a.type === "arrow") {
      (arrowsBySession.get(a.session_id) ?? arrowsBySession.set(a.session_id, []).get(a.session_id)!).push(a);
    } else {
      markPos.set(a.id, { p: a.paragraph_id, s: a.span_start, e: a.span_end });
      (marksBySession.get(a.session_id) ?? marksBySession.set(a.session_id, []).get(a.session_id)!).push({ p: a.paragraph_id, s: a.span_start, e: a.span_end });
      marksCount.set(a.session_id, (marksCount.get(a.session_id) ?? 0) + 1);
    }
  }
  let explainTotal = 0;
  for (const m of msgs ?? []) if (m.role === "student") explainTotal++;

  const titleOf = new Map((sessPassages ?? []).map((p) => [p.id, p.title]));
  const passageStats = touchedPassageIds
    .map((pid) => {
      const pSess = sessionList.filter((x) => x.passage_id === pid);
      const pIds = new Set(pSess.map((x) => x.id));
      const pScores = sc.filter((r) => pIds.has(r.session_id));
      const understand = avgOf(
        pScores
          .filter((r) => r.stage === "reading" || r.stage === "check")
          .flatMap((r) => [r.fact, r.inference]),
      );
      const critique = avgOf(
        pScores.filter((r) => r.stage === "critique").map((r) => r.critique),
      );
      return {
        id: pid,
        title: titleOf.get(pid) ?? "지문",
        students: new Set(pSess.map((x) => x.student_id)).size,
        done: pSess.filter((x) => x.status === "completed").length,
        understand,
        critique,
      };
    })
    .filter((p) => p.students > 0)
    .sort((a, b) => (a.understand ?? 999) - (b.understand ?? 999));
  const nameOf = new Map(
    studentList.map((s) => [
      s.id,
      s.student_no ? `${s.student_no} ${s.display_name ?? "학생"}` : s.display_name ?? "학생",
    ]),
  );
  const completed = sessionList.filter((s) => s.status === "completed").length;
  const inProgress = sessionList.length - completed;

  const perClass = classList.map((c) => {
    const sids = new Set(
      studentList.filter((s) => s.class_id === c.id).map((s) => s.id),
    );
    const sess = sessionList.filter((s) => sids.has(s.student_id));
    return {
      id: c.id,
      name: c.name,
      students: sids.size,
      sessions: sess.length,
      done: sess.filter((s) => s.status === "completed").length,
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

  // ── 많은 학생이 어려워한 부분: 정답 기준 대비 학생 표시율 ──
  const sessionsByPassage = new Map<string, typeof sessionList>();
  for (const s of sessionList)
    (sessionsByPassage.get(s.passage_id) ?? sessionsByPassage.set(s.passage_id, []).get(s.passage_id)!).push(s);
  const studentsOnPassage = (pid: string) =>
    new Set((sessionsByPassage.get(pid) ?? []).map((s) => s.student_id)).size;

  type Hard = {
    key: string;
    kind: "sentence" | "keyword" | "relation";
    passage: string;
    text: string;
    covered: number;
    total: number;
  };
  const hard: Hard[] = [];

  for (const k of keyInfoList) {
    const pid = paraToPassage.get(k.paragraph_id);
    if (!pid) continue;
    const total = studentsOnPassage(pid);
    if (total === 0) continue;
    const coveredStudents = new Set<string>();
    for (const s of sessionsByPassage.get(pid) ?? []) {
      const ms = marksBySession.get(s.id) ?? [];
      if (ms.some((m) => m.p === k.paragraph_id && overlaps(m.s, m.e, k.span_start, k.span_end)))
        coveredStudents.add(s.student_id);
    }
    const t = (paraText.get(k.paragraph_id) ?? "").slice(k.span_start, k.span_end);
    hard.push({
      key: `ki-${k.paragraph_id}-${k.span_start}`,
      kind: k.kind === "keyword" ? "keyword" : "sentence",
      passage: titleOf.get(pid) ?? "(지문)",
      text: clip(t),
      covered: coveredStudents.size,
      total,
    });
  }

  for (const r of keyRelList) {
    const total = studentsOnPassage(r.passage_id);
    if (total === 0) continue;
    const coveredStudents = new Set<string>();
    for (const s of sessionsByPassage.get(r.passage_id) ?? []) {
      const arrs = arrowsBySession.get(s.id) ?? [];
      const ok = arrs.some((a) => {
        const f = a.from_ref ? markPos.get(a.from_ref) : null;
        const t = a.target_ref ? markPos.get(a.target_ref) : null;
        if (!f || !t) return false;
        const fwd =
          f.p === r.from_paragraph_id && overlaps(f.s, f.e, r.from_start, r.from_end) &&
          t.p === r.to_paragraph_id && overlaps(t.s, t.e, r.to_start, r.to_end);
        const rev =
          t.p === r.from_paragraph_id && overlaps(t.s, t.e, r.from_start, r.from_end) &&
          f.p === r.to_paragraph_id && overlaps(f.s, f.e, r.to_start, r.to_end);
        return fwd || rev;
      });
      if (ok) coveredStudents.add(s.student_id);
    }
    const ft = clip((paraText.get(r.from_paragraph_id) ?? "").slice(r.from_start, r.from_end), 18);
    const tt = clip((paraText.get(r.to_paragraph_id) ?? "").slice(r.to_start, r.to_end), 18);
    hard.push({
      key: `kr-${r.from_paragraph_id}-${r.from_start}-${r.to_start}`,
      kind: "relation",
      passage: titleOf.get(r.passage_id) ?? "(지문)",
      text: `${ft} ↔ ${tt}`,
      covered: coveredStudents.size,
      total,
    });
  }

  const rateOf = (h: Hard) => h.covered / h.total;
  hard.sort((a, b) => rateOf(a) - rateOf(b) || b.total - a.total);
  const hardTop = hard.filter((h) => h.total >= 1).slice(0, 8);
  const kindLabel = { sentence: "핵심문장", keyword: "핵심어", relation: "관계" };

  const stats: { label: string; value: number; tone: string }[] = [
    { label: "학급", value: classList.length, tone: "text-amber-700 dark:text-amber-300" },
    { label: "학생", value: studentList.length, tone: "text-violet-600 dark:text-violet-300" },
    { label: "지문", value: passageList.length, tone: "text-emerald-600 dark:text-emerald-300" },
    { label: "진행 중", value: inProgress, tone: "text-amber-600 dark:text-amber-300" },
    { label: "완료", value: completed, tone: "text-sky-600 dark:text-sky-300" },
    { label: "자기설명", value: explainTotal, tone: "text-rose-600 dark:text-rose-300" },
  ];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">교사 대시보드</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">우리 반 읽기 활동을 한눈에 봅니다.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/teacher" className="rounded-md border border-gray-300 px-3 py-2 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">지문 관리</Link>
          <Link href="/teacher/activity" className="rounded-md border border-gray-300 px-3 py-2 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">학생 활동</Link>
          <Link href="/teacher/classes" className="rounded-md border border-gray-300 px-3 py-2 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">학급 관리</Link>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/60 bg-white p-4 text-center shadow-lg shadow-blue-200/20 dark:border-white/10 dark:bg-gray-950 dark:shadow-black/30">
            <div className={`text-3xl font-bold tabular-nums ${s.tone}`}>{s.value}</div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{s.label}</div>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-white/60 bg-white p-5 shadow-lg shadow-blue-200/20 dark:border-white/10 dark:bg-gray-950 dark:shadow-black/30">
        <h2 className="mb-1 font-semibold">주별 추이 (최근 6주)</h2>
        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
          막대 = 완료한 읽기 수. 꾸준히 읽을수록 문해력이 자라요. (빨강 = 그 주의 어려움 진단 건수 — 줄수록 성장)
        </p>
        <div className="flex items-end gap-2">
          {doneByWeek.map((v, i) => (
            <div key={i} className="flex flex-1 flex-col items-center">
              <span className="mb-1 text-xs font-medium tabular-nums text-amber-700 dark:text-amber-300">
                {v}
              </span>
              <div className="flex h-24 w-full items-end">
                <div
                  className="w-full rounded-t bg-amber-500"
                  style={{ height: `${Math.round((v / maxDone) * 100)}%` }}
                />
              </div>
              <span className="mt-1 text-[10px] text-gray-400">
                {weekLabel(i)}
              </span>
              <span className="text-[10px] text-rose-500">
                {diagByWeek[i] ? `어려움 ${diagByWeek[i]}` : " "}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/60 bg-white p-5 shadow-lg shadow-blue-200/20 dark:border-white/10 dark:bg-gray-950 dark:shadow-black/30">
        <h2 className="mb-1 font-semibold">단계별 진행 현황 &amp; 점수</h2>
        <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
          학생이 각 단계를 마칠 때마다 집계돼요. (완료 = 마친 횟수, 점수 = 평균)
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {stageStats.map((st) => (
            <div
              key={st.key}
              className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="font-medium text-gray-700 dark:text-gray-200">
                  {st.label}
                </span>
                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  완료 {st.n}
                </span>
              </div>
              {st.n === 0 ? (
                <p className="text-xs text-gray-400">아직 없음</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {st.bars.map((b) => (
                    <div key={b.label}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 dark:text-gray-400">
                          {b.label}
                        </span>
                        <span className="font-bold">
                          {b.value == null ? "–" : `${b.value}점`}
                        </span>
                      </div>
                      <div className="mt-0.5 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className={`h-full rounded-full ${b.color}`}
                          style={{ width: `${b.value ?? 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/60 bg-white p-5 shadow-lg shadow-blue-200/20 dark:border-white/10 dark:bg-gray-950 dark:shadow-black/30 lg:col-span-2">
        <h2 className="mb-1 font-semibold">학생별 현황</h2>
        <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
          단계별 평균 점수(읽기·독해 확인 = 사실·추론 평균, 관점 평가 = 비판). 아직 안 한 단계는 –.
        </p>
        {perStudent.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-400 dark:border-gray-700">
            아직 활동한 학생이 없어요.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400">
                  <th className="py-1 pr-2 text-left font-medium">학생</th>
                  <th className="px-2 text-center font-medium">읽기</th>
                  <th className="px-2 text-center font-medium">독해 확인</th>
                  <th className="px-2 text-center font-medium">관점 평가</th>
                </tr>
              </thead>
              <tbody>
                {perStudent.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-gray-100 dark:border-gray-800"
                  >
                    <td className="py-1.5 pr-2 font-medium">
                      <Link
                        href={"/teacher/student/" + r.id}
                        className="text-gray-700 hover:text-amber-700 hover:underline dark:text-gray-200 dark:hover:text-amber-400"
                      >
                        {r.no != null ? `${r.no} ` : ""}
                        {r.name}
                      </Link>
                    </td>
                    <td className="px-2 text-center">
                      <ScoreCell v={r.reading} />
                    </td>
                    <td className="px-2 text-center">
                      <ScoreCell v={r.check} />
                    </td>
                    <td className="px-2 text-center">
                      <ScoreCell v={r.critique} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/60 bg-white p-5 shadow-lg shadow-blue-200/20 dark:border-white/10 dark:bg-gray-950 dark:shadow-black/30 lg:col-span-2">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-semibold">지문별 현황</h2>
          <span className="text-xs text-gray-400">이해 점수 낮을수록 어려웠던 지문</span>
        </div>
        {passageStats.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-400 dark:border-gray-700">
            아직 지문 활동이 없어요.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400">
                  <th className="py-1 pr-2 text-left font-medium">지문</th>
                  <th className="px-2 text-center font-medium">읽은 학생</th>
                  <th className="px-2 text-center font-medium">완료</th>
                  <th className="px-2 text-center font-medium">이해</th>
                  <th className="px-2 text-center font-medium">비판</th>
                </tr>
              </thead>
              <tbody>
                {passageStats.map((p) => (
                  <tr key={p.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="py-1.5 pr-2 font-medium text-gray-700 dark:text-gray-200">
                      {p.title}
                    </td>
                    <td className="px-2 text-center">{p.students}</td>
                    <td className="px-2 text-center">{p.done}</td>
                    <td className="px-2 text-center">
                      <ScoreCell v={p.understand} />
                    </td>
                    <td className="px-2 text-center">
                      <ScoreCell v={p.critique} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/60 bg-white p-5 shadow-lg shadow-blue-200/20 dark:border-white/10 dark:bg-gray-950 dark:shadow-black/30">
        <h2 className="mb-1 font-semibold">학생이 어려워한 과정(진단)</h2>
        <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
          코치가 학생의 표시·설명을 보고 판단한 영역 집계입니다.
        </p>
        {diagTotal === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700">
            아직 진단 자료가 없어요. 학생이 읽고 코치와 대화하면 쌓여요.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {(
              [
                ["key_info", "핵심정보 확인", "bg-amber-500"],
                ["inference", "추론", "bg-violet-500"],
                ["viewpoint", "관점 평가", "bg-rose-500"],
                ["relation", "관계 연결", "bg-emerald-500"],
              ] as const
            ).map(([k, label, bar]) => {
              const v = areaCount[k];
              const pct = diagTotal ? Math.round((v / diagTotal) * 100) : 0;
              return (
                <li key={k} className="flex items-center gap-3 text-sm">
                  <span className="w-24 shrink-0 font-medium">{label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div className={`h-full ${bar}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-16 shrink-0 text-right text-xs tabular-nums text-gray-500 dark:text-gray-400">
                    {v}건 ({pct}%)
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-white/60 bg-white p-5 shadow-lg shadow-blue-200/20 dark:border-white/10 dark:bg-gray-950 dark:shadow-black/30 lg:col-span-2">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-semibold">많은 학생이 어려워한 부분</h2>
          <span className="text-xs text-gray-400">표시율 낮을수록 어려움</span>
        </div>
        <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">교사가 저장한 핵심정보·관계를 학생들이 얼마나 찾았는지 보여줍니다.</p>
        {hardTop.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700">
            아직 분석할 자료가 없어요. 지문에서 <Link href="/teacher" className="text-amber-700 hover:underline dark:text-amber-400">핵심정보·관계를 저장</Link>하고 학생들이 읽으면 여기에 나타나요.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {hardTop.map((h) => {
              const pct = Math.round((h.covered / h.total) * 100);
              const low = pct < 50;
              return (
                <li key={h.key} className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2.5 text-sm dark:border-gray-800">
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${h.kind === "relation" ? "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300" : h.kind === "keyword" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}>{kindLabel[h.kind]}</span>
                  <span className="min-w-0 flex-1 truncate" title={h.text}>{h.text}</span>
                  <span className="hidden max-w-[8rem] shrink-0 truncate text-xs text-gray-400 sm:block">{h.passage}</span>
                  <div className="hidden h-2 w-20 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800 sm:block">
                    <div className={`h-full ${low ? "bg-rose-500" : "bg-amber-500"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className={`w-24 shrink-0 text-right text-xs tabular-nums ${low ? "font-semibold text-rose-600 dark:text-rose-400" : "text-gray-500 dark:text-gray-400"}`}>{h.covered}/{h.total} ({pct}%)</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-white/60 bg-white p-5 shadow-lg shadow-blue-200/20 dark:border-white/10 dark:bg-gray-950 dark:shadow-black/30">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">학급별 진행</h2>
          <Link href="/teacher/classes" className="text-xs text-amber-700 hover:underline dark:text-amber-400">학급 관리 →</Link>
        </div>
        {perClass.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700">
            아직 학급이 없어요. <Link href="/teacher/classes" className="text-amber-700 hover:underline dark:text-amber-400">학급을 만들고</Link> 참여코드를 학생에게 나눠 주세요.
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
                    <div className="h-full bg-amber-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-24 shrink-0 text-right text-xs tabular-nums text-gray-500 dark:text-gray-400">완료 {c.done}/{c.sessions}</span>
                  <Link href={`/teacher/activity?class=${c.id}`} className="shrink-0 rounded-md bg-amber-50 px-2.5 py-1 text-xs text-amber-700 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300">보기</Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-white/60 bg-white p-5 shadow-lg shadow-blue-200/20 dark:border-white/10 dark:bg-gray-950 dark:shadow-black/30 lg:col-span-2">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">최근 활동</h2>
          <Link href="/teacher/activity" className="text-xs text-amber-700 hover:underline dark:text-amber-400">전체 보기 →</Link>
        </div>
        {recent.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700">아직 학생 읽기 기록이 없어요.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {recent.map((s) => (
              <li key={s.id}>
                <Link href={`/teacher/activity/${s.id}`} className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2.5 text-sm hover:border-blue-300 hover:bg-amber-50/40 dark:border-gray-800 dark:hover:border-blue-800 dark:hover:bg-amber-950/30">
                  <span className="w-20 shrink-0 truncate font-medium">{nameOf.get(s.student_id) ?? "학생"}</span>
                  <span className="min-w-0 flex-1 truncate text-gray-600 dark:text-gray-300">{titleOf.get(s.passage_id) ?? "(지문)"}</span>
                  <span className="shrink-0 text-xs text-gray-400 tabular-nums">표시 {marksCount.get(s.id) ?? 0}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${s.status === "completed" ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" : "bg-gray-100 text-gray-500 dark:bg-gray-800"}`}>{s.status === "completed" ? "완료" : "진행 중"}</span>
                  <span className="hidden w-24 shrink-0 text-right text-xs text-gray-400 sm:block">{fmt(s.started_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      </div>
    </main>
  );
}
