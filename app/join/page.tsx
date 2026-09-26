import Link from "next/link";
import { getSessionProfile } from "@/lib/auth";
import { JoinForm } from "./join-form";

export default async function JoinPage() {
  const { supabase, user } = await getSessionProfile("/join");

  const { data: profile } = await supabase
    .from("profiles")
    .select("class_id")
    .eq("id", user.id)
    .single();

  let currentClass: string | null = null;
  if (profile?.class_id) {
    const { data: cls } = await supabase
      .from("classes")
      .select("name")
      .eq("id", profile.class_id)
      .single();
    currentClass = cls?.name ?? null;
  }

  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col gap-5 px-6 py-12">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">학급 참여</h1>
        <Link
          href="/dashboard"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          대시보드
        </Link>
      </header>

      {currentClass && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
          현재 학급: <b>{currentClass}</b> (다른 코드를 넣으면 학급이 바뀌어요)
        </div>
      )}

      <p className="text-sm text-gray-500 dark:text-gray-400">
        선생님이 알려준 <b>참여코드</b>를 입력하세요.
      </p>
      <JoinForm />
    </main>
  );
}
