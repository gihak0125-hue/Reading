import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * 관리자(교사 가입 승인권자) 이메일. 기본값은 서비스 운영자.
 * 필요하면 환경변수 ADMIN_EMAIL 로 바꿀 수 있다(비밀 아님, 서버 전용).
 */
export const ADMIN_EMAIL = (
  process.env.ADMIN_EMAIL ?? "gihak0125@gmail.com"
).toLowerCase();

/** 현재 로그인 사용자가 관리자면 user 반환, 아니면 null. */
export async function getAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  if ((user.email ?? "").toLowerCase() !== ADMIN_EMAIL) return null;
  return user;
}
