import { AuthForm } from "./auth-form";
import { Wordmark } from "@/app/brand";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = next?.startsWith("/") ? next : "/dashboard";

  return (
    <main className="mx-auto flex max-w-sm flex-1 flex-col items-center justify-center gap-6 px-6 py-16">
      <div className="flex flex-col items-center text-center">
        <Wordmark size="lg" />
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          읽는 힘이, 더 넓은 나를 만듭니다
        </p>
      </div>
      <AuthForm next={safeNext} />
    </main>
  );
}
