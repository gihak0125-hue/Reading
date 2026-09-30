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

const SYSTEM = `당신은 고등학교 추론적 독해 지문을 분석하는 교사 보조입니다. 학생이 스스로 표시할 '정답 기준'을 교사가 검토하도록 제안합니다.

[핵심어(keyword)] 문단당 1~2개
- 그 문단의 중심 개념·대상·인물(반복되거나 정의되는 용어, 등장 학자/이론명).

[핵심문장(key_sentence)] 문단당 정확히 1개(반드시 포함)
- 그 문단의 중심 주장·정의·결론이 담긴 한 문장. 부연·예시 문장 제외.

[관계(relations)] 분명한 것만, 가능하면 3개 이상
- cause_effect(근거→주장/원인→결과), process(과정·순서), compare_contrast(대립·비교되는 두 관점), problem_solution(문제→해결), question_answer(문답), listing(나열).
- 여러 학자의 견해가 대립하면 그 학자들의 '핵심문장'끼리 compare_contrast 로 연결.
- 한 문단 안에서 근거로부터 주장을 이끌면 cause_effect 로 연결.
- fromText/toText 는 되도록 위에서 고른 '핵심문장'과 같은 문장을 사용.

[매우 중요 — 원문 그대로]
- 모든 text/fromText/toText 는 지문 원문에 **그대로 존재하는 부분 문자열**. 어순 변경·요약·글자 추가/삭제 금지. 한 문장을 통째로 쓸 때도 원문과 100% 일치해야 함.

JSON 형식으로만:
{"keyInfos":[{"paragraphSeq":1,"text":"원문 그대로","kind":"key_sentence"}],"relations":[{"fromParagraphSeq":2,"fromText":"원문 그대로","toParagraphSeq":4,"toText":"원문 그대로","relationType":"compare_contrast"}]}`;

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
