import "server-only";

/**
 * 서버(서버 컴포넌트 / Route Handler)용 Supabase 클라이언트.
 * 쿠키 기반 세션을 사용한다. anon key 로 동작하며 RLS 가 적용된다.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPublicSupabaseConfig } from "@/lib/env";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getPublicSupabaseConfig();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // 서버 컴포넌트에서 호출된 경우 set 이 무시될 수 있다(정상).
        }
      },
    },
  });
}
