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

/** 복사·붙여넣기로 섞일 수 있는 공백/제어문자/비ASCII 제거(키는 출력 가능한 ASCII만) */
function cleanKey(v: string): string {
  return v.replace(/[^\x21-\x7E]/g, "");
}

/** 지연 초기화: 키가 없어도 빌드는 통과, 실제 호출 시점에만 검사 */
export function getOpenAI(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: cleanKey(requireEnv("OPENAI_API_KEY")),
      baseURL: (process.env.OPENAI_BASE_URL || "").trim() || undefined,
    });
  }
  return _client;
}

export const MODEL_DEFAULT = () =>
  (process.env.OPENAI_MODEL_DEFAULT || "").trim() || "gpt-4o-mini";
export const MODEL_ESCALATION = () =>
  (process.env.OPENAI_MODEL_ESCALATION || "").trim() || MODEL_DEFAULT();
/**
 * 교사 보조 전용 모델(지문 분석·관점/문항 추천 등). 교사 세팅 때만 가끔 호출되므로
 * 최상위 모델을 써도 총비용이 작다. 학생 코치 비용(MODEL_ESCALATION)과 분리하기 위한 변수.
 * 미설정 시 MODEL_ESCALATION 으로 폴백.
 */
export const MODEL_TEACHER = () =>
  (process.env.OPENAI_MODEL_TEACHER || "").trim() || MODEL_ESCALATION();

/**
 * 모델별 토큰·온도 파라미터를 맞춰준다(스프레드해서 사용).
 * GPT-5·o 계열은:
 *  - `max_tokens` 대신 `max_completion_tokens`만 받고, temperature는 기본값(1)만 허용.
 *  - 내부 '추론 토큰'이 출력 예산을 잠식하므로 한도를 넉넉히 주고(reasoning가 먹어도 출력이 남게),
 *    구조적 추출 작업엔 reasoning_effort를 'low'로 낮춰 추론 토큰 낭비·비용을 줄인다.
 * 그 외(gpt-4o 등)는 기존대로 `max_tokens` + 커스텀 temperature.
 */
export function tokenParams(
  model: string,
  maxTokens: number,
  temperature = 1,
): Record<string, number | string> {
  const restricted = /^(gpt-5|o[0-9])/i.test(model);
  return restricted
    ? {
        max_completion_tokens: Math.max(maxTokens * 4, 8000),
        reasoning_effort: "low",
      }
    : { max_tokens: maxTokens, temperature };
}

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
