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
      <div className="flex w-full max-w-sm flex-col items-center gap-5">
        <Wordmark size="xl" english />
        <p className="text-center text-base text-gray-600 dark:text-gray-300">
          읽는 힘이, 더 넓은 나를 만듭니다
        </p>
        <AuthForm next={safeNext} />
      </div>
    </main>
  );
}
