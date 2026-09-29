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
    | "listing";
};
export type AnalyzeResult =
  | { keyInfos: SuggestKeyInfo[]; relations: SuggestRelation[] }
  | { error: string };

const SYSTEM = `당신은 고등학교 추론적 독해 지문을 분석하는 교사 보조입니다.
설명하는 글에서 (1) 각 문단의 핵심어와 핵심문장, (2) 정보(문장) 사이의 의미 관계를 찾아 제시하세요.

[규칙]
- text/fromText/toText 는 반드시 지문 원문에 **그대로 존재하는 부분 문자열**이어야 합니다(요약·변형 금지, 따옴표 없이).
- 핵심어(keyword)는 짧은 단어/구, 핵심문장(key_sentence)은 한 문장 단위.
- 관계 유형: cause_effect(인과), process(과정), compare_contrast(비교대조), problem_solution(문제해결), question_answer(문답), listing(나열).
- 과하지 않게: 문단당 핵심어 1~2개, 핵심문장 1개 내외. 관계는 지문에서 분명한 것만.
- 반드시 아래 JSON 형식으로만 답하세요.

{
  "keyInfos": [{"paragraphSeq": 1, "text": "원문 부분", "kind": "keyword"}],
  "relations": [{"fromParagraphSeq": 1, "fromText": "원문 부분", "toParagraphSeq": 2, "toText": "원문 부분", "relationType": "cause_effect"}]
}`;

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
