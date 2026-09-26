import Link from "next/link";
import { requireTeacher } from "@/lib/auth";
import { ClassForm } from "./class-form";
import { deleteClass } from "./actions";

export default async function ClassesPage() {
  const { supabase, user } = await requireTeacher("/teacher/classes");

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, join_code, created_at")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });

  const classIds = (classes ?? []).map((c) => c.id);
  const { data: members } = classIds.length
    ? await supabase.from("profiles").select("class_id").in("class_id", classIds)
    : { data: [] as { class_id: string | null }[] };
  const countByClass = new Map<string, number>();
  for (const m of members ?? [])
    if (m.class_id)
      countByClass.set(m.class_id, (countByClass.get(m.class_id) ?? 0) + 1);

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
            {classes.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-800"
              >
                <div className="min-w-0">
                  <p className="font-medium">{c.name}</p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    학생 {countByClass.get(c.id) ?? 0}명
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
                    <button
                      type="submit"
                      className="rounded-md px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      삭제
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
