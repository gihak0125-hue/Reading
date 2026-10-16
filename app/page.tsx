import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthForm } from "@/app/login/auth-form";
import { Wordmark } from "@/app/brand";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext =
    next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  // 이미 로그인한 사용자는 바로 대시보드로
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(safeNext);

  return (
    <main className="flex w-full flex-1 flex-col justify-center px-6 py-12 sm:pl-16 lg:pl-40">
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <Wordmark size="2xl" english />
        <p className="whitespace-nowrap text-center text-xl leading-relaxed text-gray-600 dark:text-gray-300">
          오늘 읽은 글이, 생각하는 힘을 키웁니다.
        </p>
        <AuthForm next={safeNext} />
      </div>
    </main>
  );
}
