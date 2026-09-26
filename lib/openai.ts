import "server-only";

/**
 * 서버 전용 LLM 클라이언트 + 모델 라우팅.
 * OpenAI 호환 API(OpenAI, Upstage Solar 등)를 지원한다.
 * - OPENAI_API_KEY: 제공자 API 키 (절대 클라이언트 노출 금지)
 * - OPENAI_BASE_URL: 제공자 주소 (예: https://api.upstage.ai/v1). 없으면 OpenAI 기본.
 * - 모델명은 환경변수로 주입(하드코딩 금지 — CLAUDE.md 규칙).
 */
import OpenAI from "openai";
import { requireEnv } from "@/lib/env";

let _client: OpenAI | null = null;

/** 지연 초기화: 키가 없어도 빌드는 통과, 실제 호출 시점에만 검사 */
export function getOpenAI(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: requireEnv("OPENAI_API_KEY"),
      baseURL: process.env.OPENAI_BASE_URL || undefined,
    });
  }
  return _client;
}

export const MODEL_DEFAULT = () =>
  process.env.OPENAI_MODEL_DEFAULT ?? "gpt-4o-mini";
export const MODEL_ESCALATION = () =>
  process.env.OPENAI_MODEL_ESCALATION ?? MODEL_DEFAULT();

/**
 * 승급 여부 판단.
 * 복잡한 추론 진단(S2 관계 연결 / S3 구조 추론) 또는 반복 실패 시 상위 모델 사용.
 */
export function pickModel(opts: {
  step: "S1" | "S2" | "S3" | "S4" | "S5";
  attempt: number; // 같은 단계 재시도 횟수(0부터)
}): string {
  const complexStep = opts.step === "S2" || opts.step === "S3";
  const repeatedFailure = opts.attempt >= 2;
  return complexStep || repeatedFailure ? MODEL_ESCALATION() : MODEL_DEFAULT();
}
