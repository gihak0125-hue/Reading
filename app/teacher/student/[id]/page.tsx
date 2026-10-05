import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/auth";

type ScoreRow = {
  session_id: string;
  stage: string;
  fact: number | null;
  inference: number | null;
  critique: number | null;
  detail: number | null;
  main: number | null;
  comment: string | null;
};

function Metric({ label, v }: { label: string; v: number | null }) {
  return (
    <div className="flex-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500 dark:text-gray-400">{label}</span>
        <span className="font-bold">{v == null ? "–" : v}</span>
      </div>
      <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className="h-full rounded-full bg-amber-500"
          style={{ width: (v ?? 0) + "%" }}
        />
      </div>
    </div>
  );
}

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireTeacher(`/teacher/student/${id}`);

  const { data: student } = await supabase
    .from("profiles")
    .select("id, display_name, student_no, school, class_id")
    .eq("id", id)
    .maybeSingle();
  if (!student) notFound();

  const { data: cls } = student.class_id
    ? await supabase
        .from("classes")
        .select("name")
        .eq("id", student.class_id)
        .maybeSingle()
    : { data: null };

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, passage_id, status, started_at")
    .eq("student_id", id)
    .order("started_at", { ascending: false });
  const sessList = sessions ?? [];
  const passageIds = [...new Set(sessList.map((s) => s.passage_id))];
  const sessionIds = sessList.map((s) => s.id);

  const [{ data: passages }, { data: scores }] = await Promise.all([
    passageIds.length
      ? supabase.from("passages").select("id, title").in("id", passageIds)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    sessionIds.length
      ? supabase
          .from("session_scores")
          .select("session_id, stage, fact, inference, critique, detail, main, comment")
          .in("session_id", sessionIds)
      : Promise.resolve({ data: [] as ScoreRow[] }),
  ]);
  const titleOf = new Map((passages ?? []).map((p) => [p.id, p.title]));
  const scoreList = (scores ?? []) as ScoreRow[];
  const stageOf = (sid: string, stage: string) =>
    scoreList.find((r) => r.session_id === sid && r.stage === stage) ?? null;

  const nameLabel =
    (student.student_no != null ? student.student_no + " " : "") +
    (student.display_name ?? "학생");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{nameLabel}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {cls?.name ?? "반 미지정"}
            {student.school ? " · " + student.school : ""}
          </p>
        </div>
        <Link
          href="/teacher/dashboard"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          대시보드
        </Link>
      </header>

      {sessList.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700">
          아직 읽기 활동이 없어요.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {sessList.map((s) => {
            const read = stageOf(s.id, "reading");
            const check = stageOf(s.id, "check");
            const crit = stageOf(s.id, "critique");
            const comment =
              crit?.comment || check?.comment || read?.comment || "";
            return (
              <li
                key={s.id}
                className="rounded-2xl border border-gray-200 p-5 dark:border-gray-800"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-gray-800 dark:text-gray-100">
                    {titleOf.get(s.passage_id) ?? "지문"}
                  </p>
                  <span
                    className={
                      "shrink-0 rounded-full px-2 py-0.5 text-xs " +
                      (s.status === "completed"
                        ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300")
                    }
                  >
                    {s.status === "completed" ? "완료" : "읽는 중"}
                  </span>
                </div>

                <div className="mt-3 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-900">
                    <p className="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                      읽기(표시)
                    </p>
                    <div className="flex flex-col gap-2">
                      <Metric label="사실" v={read?.fact ?? null} />
                      <Metric label="추론" v={read?.inference ?? null} />
                    </div>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-900">
                    <p className="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                      독해 확인
                    </p>
                    <div className="flex flex-col gap-2">
                      <Metric label="세부" v={check?.detail ?? null} />
                      <Metric label="중심" v={check?.main ?? null} />
                      <Metric label="추론" v={check?.inference ?? null} />
                    </div>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-900">
                    <p className="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                      관점 평가
                    </p>
                    <div className="flex flex-col gap-2">
                      <Metric label="비판" v={crit?.critique ?? null} />
                    </div>
                  </div>
                </div>

                {comment && (
                  <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                    {comment}
                  </p>
                )}

                <div className="mt-3 text-right">
                  <Link
                    href={"/teacher/activity/" + s.id}
                    className="text-xs font-medium text-amber-700 hover:underline dark:text-amber-400"
                  >
                    활동 자세히 보기 &rarr;
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
