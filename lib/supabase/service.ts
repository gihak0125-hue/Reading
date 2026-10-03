import "server-only";

import { createClient as createSbClient } from "@supabase/supabase-js";
import { getPublicSupabaseConfig } from "@/lib/env";

/**
 * RLS를 우회하는 서버 전용 Supabase 클라이언트.
 * 교사 전용 데이터(정답 기준 등)를 서버에서만 읽어 진단 근거로 쓰기 위한 용도.
 * 절대 이 클라이언트로 읽은 정답을 클라이언트(학생)에게 반환하지 말 것.
 * SERVICE_ROLE 키가 없으면 null 을 반환한다(기능 graceful degrade).
 */
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  const { url } = getPublicSupabaseConfig();
  return createSbClient(url, key, { auth: { persistSession: false } });
}
