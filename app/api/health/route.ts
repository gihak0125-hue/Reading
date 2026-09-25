import { NextResponse } from "next/server";
import { envPresence } from "@/lib/env";

/**
 * 헬스체크. 환경변수 "존재 여부"만 boolean 으로 반환한다(값은 절대 노출하지 않음).
 * 설정이 제대로 됐는지 브라우저에서 /api/health 로 확인하는 용도.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    env: envPresence(),
    time: new Date().toISOString(),
  });
}
