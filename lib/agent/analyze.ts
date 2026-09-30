import "server-only";

import { getOpenAI, MODEL_ESCALATION } from "@/lib/openai";

/**
 * 지문 분석: 문단별 핵심문장·핵심어와 문장 간 관계를 추천한다.
 * 정확한 위치(span)는 서버가 원문에서 매칭하므로, 모델은 '원문 그대로의 부분 문자열'을 반환해야 한다.
 */

export type SuggestKeyInfo = {
  paragraphSeq: number;
  text: string; // 원문 그대로의 부분 문자열
  kind: "keyword" | "key_sentence";
};
export type SuggestRelation = {
  fromParagraphSeq: number;
  fromText: string;
  toParagraphSeq: number;
  toText: string;
  relationType:
    | "cause_effect"
    | "process"
    | "compare_contrast"
    | "problem_solution"
    | "question_answer"
    | "listing"
    | "similarity"
    | "contrast";
};
export type AnalyzeResult =
  | { keyInfos: SuggestKeyInfo[]; relations: SuggestRelation[] }
  | { error: string };

const SYSTEM = `당신은 고등학교 추론적 독해 지문을 분석하는 교사 보조입니다. 학생이 스스로 표시할 '정답 기준'을 교사가 검토하도록 제안합니다.

[핵심어(keyword)] 문단당 1~2개
- 그 문단의 중심 개념·대상·인물(반복되거나 정의되는 용어, 등장 학자/이론명). 짧은 단어/구.

[핵심문장(key_sentence)] 문단당 1~2개
- 그 문단의 중심 주장·정의·결론이 담긴 부분.
- 문장이 여러 절로 길게 이어지면, **문장 전체가 아니라 핵심이 되는 한두 절(節)만** 고르세요.
- 부연·예시·도입 표현은 빼고, 주장·판단·정의의 알맹이만.

[관계(relations)] 3~6개, 분명한 것만
- 유형: cause_effect(근거→주장/원인→결과), process(과정·순서), problem_solution(문제→해결), question_answer(문답), listing(나열), similarity(공통점), contrast(차이점).
- **비교되는 두 대상(학자/견해 등)이 있으면, 그 쌍에 대해 similarity(공통점)와 contrast(차이점)를 "각각 하나 이상" 함께 제시**하세요. 차이점만 내지 말 것.
  - similarity(공통점): 두 대상이 공유·동의하는 지점을 드러내는 구절끼리 연결.
  - contrast(차이점): 두 대상이 갈라지는 지점을 드러내는 구절끼리 연결.
- fromText/toText 는 그 공통점/차이점을 드러내는 짧은 근거 구절.
- 근거로부터 주장을 이끌면 cause_effect.

[[[ 절대 규칙 — 원문 글자 그대로 복사 ]]]
- 모든 text/fromText/toText 는 지문에 **연속으로 존재하는 글자 구간을 그대로 복사**한 것이어야 합니다.
- **한 글자도 바꾸지 마세요.** 특히 절을 고를 때 종결어미를 바꾸지 마세요:
  - 원문이 "…보장하지 않고," 이면 → "보장하지 않고" 까지만. "보장하지 않는다"로 바꾸면 안 됨.
  - 원문이 "…잘못이라는 것이다." 이면 → "잘못이라는 것이다" 그대로. "잘못이다"로 줄이면 안 됨.
  - 문장을 완결시키거나 다듬지 말고, 원문에 있는 그대로의 연속 구간만 잘라 쓰세요. (연결어미 -고/-며/-지만 으로 끝나도 괜찮음)
- 확신이 없으면 더 짧고 확실히 일치하는 구간을 고르세요.

JSON 형식으로만:
{"keyInfos":[{"paragraphSeq":1,"text":"원문 그대로","kind":"key_sentence"}],"relations":[{"fromParagraphSeq":5,"fromText":"원문 그대로","toParagraphSeq":6,"toText":"원문 그대로","relationType":"similarity"}]}`;

export async function analyzePassage(
  title: string,
  paragraphs: { seq: number; text: string }[],
): Promise<AnalyzeResult> {
  if (!process.env.OPENAI_API_KEY) return { error: "no_key" };

  const body = paragraphs.map((p) => `[${p.seq}문단] ${p.text}`).join("\n\n");
  try {
    const res = await getOpenAI().chat.completions.create({
      model: MODEL_ESCALATION(), // 분석은 상위 모델
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `제목: ${title}\n\n${body}` },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
      max_tokens: 1500,
    });
    const raw = res.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as {
      keyInfos?: SuggestKeyInfo[];
      relations?: SuggestRelation[];
    };
    return {
      keyInfos: Array.isArray(parsed.keyInfos) ? parsed.keyInfos : [],
      relations: Array.isArray(parsed.relations) ? parsed.relations : [],
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "analyze_failed" };
  }
}
