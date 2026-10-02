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
        <h1 className="text-2xl font-bold text-gray-800 drop-shadow-sm dark:text-gray-100">
          AI 문해력 코치
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          읽고 생각하는 힘을 함께 길러요
        </p>
      </div>
      <AuthForm next={safeNext} />
    </main>
  );
}
