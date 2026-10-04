import Link from "next/link";
import { requireTeacher } from "@/lib/auth";
import { ClassForm } from "./class-form";
import { deleteClass } from "./actions";
import { SubmitButton } from "@/app/submit-button";

type Member = {
  id: string;
  display_name: string | null;
  class_id: string | null;
  student_no: number | null;
};

export default async function ClassesPage() {
  const { supabase, user } = await requireTeacher("/teacher/classes");

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, join_code, created_at")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });

  const classIds = (classes ?? []).map((c) => c.id);
  const { data: members } = classIds.length
    ? await supabase
        .from("profiles")
        .select("id, display_name, class_id, student_no")
        .in("class_id", classIds)
    : { data: [] as Member[] };

  const rosterByClass = new Map<string, Member[]>();
  for (const m of (members ?? []) as Member[]) {
    if (!m.class_id) continue;
    const arr = rosterByClass.get(m.class_id) ?? [];
    arr.push(m);
    rosterByClass.set(m.class_id, arr);
  }
  for (const arr of rosterByClass.values())
    arr.sort((a, b) => {
      if (a.student_no == null) return 1;
      if (b.student_no == null) return -1;
      return a.student_no - b.student_no;
    });

  return (
    <main className="mx-auto flex max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">학급 관리</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            학급을 만들고 참여코드를 학생에게 알려주세요.
          </p>
        </div>
        <Link
          href="/teacher"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          지문 관리
        </Link>
      </header>

      <ClassForm />

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">
          내 학급 {classes?.length ? `(${classes.length})` : ""}
        </h2>
        {!classes || classes.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700">
            아직 학급이 없어요. 위에서 만들어 보세요.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {classes.map((c) => {
              const roster = rosterByClass.get(c.id) ?? [];
              return (
                <li
                  key={c.id}
                  className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-800"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{c.name}</p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        학생 {roster.length}명
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-[11px] text-gray-400">참여코드</p>
                        <p className="font-mono text-lg font-bold tracking-widest">
                          {c.join_code}
                        </p>
                      </div>
                      <form action={deleteClass}>
                        <input type="hidden" name="id" value={c.id} />
                        <SubmitButton
                          pendingText="삭제 중…"
                          className="rounded-md px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60 dark:hover:bg-red-950"
                        >
                          삭제
                        </SubmitButton>
                      </form>
                    </div>
                  </div>

                  {roster.length > 0 && (
                    <details className="group rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900">
                      <summary className="cursor-pointer select-none text-sm font-medium text-gray-600 marker:text-gray-400 dark:text-gray-300">
                        명단 보기
                      </summary>
                      <ul className="mt-2 flex flex-col gap-1">
                        {roster.map((m) => (
                          <li
                            key={m.id}
                            className="flex items-center gap-2 text-sm"
                          >
                            <span className="inline-flex h-6 w-8 shrink-0 items-center justify-center rounded bg-white text-xs font-semibold text-gray-500 shadow-sm dark:bg-gray-950 dark:text-gray-400">
                              {m.student_no ?? "–"}
                            </span>
                            <span className="truncate text-gray-700 dark:text-gray-200">
                              {m.display_name ?? "이름 없음"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
