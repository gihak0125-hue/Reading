import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signout } from "@/app/login/actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("id", user.id)
    .single();

  const role = profile?.role ?? "student";
  const name = profile?.display_name ?? user.email;

  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">안녕하세요, {name}님</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            역할: {role === "teacher" ? "교사" : "학생"} · {user.email}
          </p>
        </div>
        <form action={signout}>
          <button
            type="submit"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            로그아웃
          </button>
        </form>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        {role === "teacher" ? (
          <>
            <Card
              href="/teacher"
              title="지문 관리"
              desc="추론적 독해 지문을 등록하고 핵심정보를 태깅합니다."
            />
            <Card
              href="/teacher/activity"
              title="학생 활동"
              desc="학생이 표시·연결한 내용과 자기설명을 확인합니다."
            />
          </>
        ) : (
          <Card
            href="/read"
            title="읽기 시작"
            desc="지문을 골라 추론적 독해를 시작합니다."
          />
        )}
        <Card
          href="/"
          title="소개"
          desc="이 에이전트가 어떻게 돕는지 다시 봅니다."
        />
      </section>

      <p className="mt-auto text-sm text-gray-400">
        M1: 로그인 완료. 다음 단계로 지문/읽기 화면을 준비 중입니다.
      </p>
    </main>
  );
}

function Card({
  href,
  title,
  desc,
}: {
  href: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-gray-200 p-5 transition hover:border-blue-400 hover:shadow-sm dark:border-gray-800"
    >
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{desc}</p>
    </Link>
  );
}
