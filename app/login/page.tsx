import { redirect } from "next/navigation";

// 로그인 화면은 홈('/')으로 통합됨. 기존 링크(/login)는 홈으로 넘긴다.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const q =
    next?.startsWith("/") && !next.startsWith("//")
      ? `?next=${encodeURIComponent(next)}`
      : "";
  redirect(`/${q}`);
}
