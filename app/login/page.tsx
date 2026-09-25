import { AuthForm } from "./auth-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = next?.startsWith("/") ? next : "/dashboard";

  return (
    <main className="mx-auto flex max-w-sm flex-1 flex-col items-center justify-center gap-6 px-6 py-16">
      <div className="text-center">
        <h1 className="text-2xl font-bold">추론적 독해 AI 에이전트</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          로그인하고 시작하세요
        </p>
      </div>
      <AuthForm next={safeNext} />
    </main>
  );
}
