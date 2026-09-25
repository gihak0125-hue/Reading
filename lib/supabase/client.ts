"use client";

/**
 * 브라우저(클라이언트 컴포넌트)용 Supabase 클라이언트.
 * anon key 만 사용한다. 서버 전용 키는 절대 여기서 참조하지 않는다.
 */
import { createBrowserClient } from "@supabase/ssr";
import { getPublicSupabaseConfig } from "@/lib/env";

export function createClient() {
  const { url, anonKey } = getPublicSupabaseConfig();
  return createBrowserClient(url, anonKey);
}
