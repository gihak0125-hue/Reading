import Link from "next/link";
import { requireTeacher } from "@/lib/auth";

export default async function ActivityPage() {
  const { supabase } = await requireTeacher("/teacher/activity");

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, student_id, passage_id, status, started_at")
    .order("started_at", { ascending: false });

  const list = sessions ?? [];
  const studentIds = [...new Set(list.map((s) => s.student_id))];
  const passageIds = [...new Set(list.map((s) => s.passage_id))];
  const sessionIds = list.map((s) => s.id);

  const [{ data: profiles }, { data: passages }, { data: annos }, { data: msgs }] =
    await Promise.all([
      studentIds.length
        ? supabase
            .from("profiles")
            .select("id, display_name, class_id")
            .in("id", studentIds)
        : Promise.resolve({
            data: [] as {
              id: string;
              display_name: string | null;
              class_id: string | null;
            }[],
          }),
      passageIds.length
        ? supabase.from("passages").select("id, title").in("id", passageIds)
        : Promise.resolve({ data: [] as { id: string; title: string }[] }),
      sessionIds.length
        ? supabase.from("annotations").select("session_id, type").in("session_id", sessionIds)
        : Promise.resolve({ data: [] as { session_id: string; type: string }[] }),
      sessionIds.length
        ? supabase.from("agent_messages").select("session_id, role").in("session_id", sessionIds)
        : Promise.resolve({ data: [] as { session_id: string; role: string }[] }),
    ]);

  const nameOf = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));
  const classIdOf = new Map((profiles ?? []).map((p) => [p.id, p.class_id]));
  const classIds = [
    ...new Set((profiles ?? []).map((p) => p.class_id).filter(Boolean)),
  ] as string[];
  const { data: classes } = classIds.length
    ? await supabase.from("classes").select("id, name").in("id", classIds)
    : { data: [] as { id: string; name: string }[] };
  const classNameOf = new Map((classes ?? []).map((c) => [c.id, c.name]));
  const titleOf = new Map((passages ?? []).map((p) => [p.id, p.title]));
  const marksCount = new Map<string, number>();
  const relCount = new Map<string, number>();
  for (const a of annos ?? []) {
    if (a.type === "arrow")
      relCount.set(a.session_id, (relCount.get(a.session_id) ?? 0) + 1);
    else marksCount.set(a.session_id, (marksCount.get(a.session_id) ?? 0) + 1);
  }
  const explainCount = new Map<string, number>();
  for (const m of msgs ?? [])
    if (m.role === "student")
      explainCount.set(m.session_id, (explainCount.get(m.session_id) ?? 0) + 1);

  return (
    <main className="mx-auto flex max-w-4xl flex-1 flex-col gap-6 px-6 py-12">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">학생 활동</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            학생이 표시·연결한 내용과 자기설명을 확인합니다.
          </p>
        </div>
        <Link
          href="/teacher"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          지문 관리
        </Link>
      </header>

      {list.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700">
          아직 학생 읽기 기록이 없어요. 학생이 지문을 읽고 표시하면 여기에 나타나요.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-2.5">학생</th>
                <th className="px-4 py-2.5">학급</th>
                <th className="px-4 py-2.5">지문</th>
                <th className="px-4 py-2.5 text-center">표시</th>
                <th className="px-4 py-2.5 text-center">관계</th>
                <th className="px-4 py-2.5 text-center">설명</th>
                <th className="px-4 py-2.5">상태</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr
                  key={s.id}
                  className="border-t border-gray-100 dark:border-gray-800"
                >
                  <td className="px-4 py-2.5">
                    {nameOf.get(s.student_id) ?? "학생"}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {classNameOf.get(classIdOf.get(s.student_id) ?? "") ?? "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    {titleOf.get(s.passage_id) ?? "(지문)"}
                  </td>
                  <td className="px-4 py-2.5 text-center tabular-nums">
                    {marksCount.get(s.id) ?? 0}
                  </td>
                  <td className="px-4 py-2.5 text-center tabular-nums">
                    {relCount.get(s.id) ?? 0}
                  </td>
                  <td className="px-4 py-2.5 text-center tabular-nums">
                    {explainCount.get(s.id) ?? 0}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        s.status === "completed"
                          ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                          : "bg-gray-100 text-gray-500 dark:bg-gray-800"
                      }`}
                    >
                      {s.status === "completed" ? "완료" : "진행 중"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link
                      href={`/teacher/activity/${s.id}`}
                      className="rounded-md bg-blue-50 px-3 py-1.5 text-xs text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300"
                    >
                      자세히
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
