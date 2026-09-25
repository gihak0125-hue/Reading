/**
 * 환경변수 접근 헬퍼.
 * - 서버 전용 값(OPENAI_API_KEY 등)은 서버 코드에서만 import 되는 파일에서 읽는다.
 * - 값이 없어도 빌드는 통과하도록, 사용 시점에 검사한다(모듈 최상단에서 throw 금지).
 */

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `환경변수 ${name} 가 설정되지 않았습니다. .env.local 을 확인하세요.`,
    );
  }
  return v;
}

/** 공개 가능한(NEXT_PUBLIC_) Supabase 설정 */
export function getPublicSupabaseConfig() {
  return {
    url: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
}

/** 설정 존재 여부만 확인(값 노출 없이 헬스체크용) */
export function envPresence() {
  return {
    supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    supabaseServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    openaiKey: Boolean(process.env.OPENAI_API_KEY),
  };
}
