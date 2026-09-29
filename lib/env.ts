/**
 * 환경변수 접근 헬퍼.
 * - 서버 전용 값(OPENAI_API_KEY 등)은 서버 코드에서만 import 되는 파일에서 읽는다.
 * - 값이 없어도 빌드는 통과하도록, 사용 시점에 검사한다(모듈 최상단에서 throw 금지).
 */

// Supabase URL / anon key 는 공개 값(NEXT_PUBLIC, 브라우저에 노출됨). RLS로 데이터는 보호된다.
// 배포 환경변수가 복사·붙여넣기로 깨지는 문제를 방지하기 위해 공개 기본값을 코드에 고정한다.
const SUPABASE_URL_DEFAULT = "https://glqujeyrgfqbggdhoazp.supabase.co";
const SUPABASE_ANON_KEY_DEFAULT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdscXVqZXlyZ2ZxYmdnZGhvYXpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzMTA3MjcsImV4cCI6MjEwNTg4NjcyN30.o6DCYtsNBjhtKXVkjqJ5bDPxnP7Yg3NBm82xLjJrC3A";

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
  // 환경변수가 "원래 깨끗할 때만" 사용한다. 특수문자/공백이 섞여 있으면(정제하면 값이 달라지면)
  // 신뢰하지 않고 코드에 고정한 공개 기본값을 사용한다. (깨진 키로 인한 오류 원천 차단)
  const rawUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const url = /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(rawUrl)
    ? rawUrl
    : SUPABASE_URL_DEFAULT;

  const rawKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  const cleanKey = rawKey.replace(/[^A-Za-z0-9._-]/g, "");
  const looksValid =
    rawKey === cleanKey && cleanKey.split(".").length === 3 && cleanKey.length >= 100;
  const anonKey = looksValid ? cleanKey : SUPABASE_ANON_KEY_DEFAULT;

  return { url, anonKey };
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
