import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * 관리자(교사 가입 승인권자) 이메일 목록. 기본값은 서비스 운영자 + 관리자 테스트 계정.
 * 환경변수 ADMIN_EMAIL 에 쉼표(,)로 여러 개 지정 가능(비밀 아님, 서버 전용).
 * 예) ADMIN_EMAIL="gihak0125@gmail.com,test0@naver.com"
 */
const DEFAULT_ADMINS = "gihak0125@gmail.com,test0@naver.com";

export const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAIL ?? DEFAULT_ADMINS)
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

/** 이메일이 관리자 목록에 있는지. */
export function isAdminEmail(email: string | null | undefined): boolean {
  return ADMIN_EMAILS.has((email ?? "").toLowerCase());
}

/** 현재 로그인 사용자가 관리자면 user 반환, 아니면 null. */
export async function getAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  if (!isAdminEmail(user.email)) return null;
  return user;
}
