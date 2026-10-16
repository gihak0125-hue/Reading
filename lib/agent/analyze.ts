import "server-only";

import { getOpenAI, MODEL_TEACHER, tokenParams } from "@/lib/openai";

/**
 * 지문 분석: 문단별 중심문장·중심화제와 문장 간 관계를 추천한다.
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

const SYSTEM = `당신은 고등학교 문해력 학습 지문을 분석하는 교사 보조입니다. 학생이 스스로 표시할 '정답 기준'을 교사가 검토하도록 제안합니다.

[중심화제(keyword)] 문단당 1~2개
- 그 문단의 중심 개념·대상·인물(반복되거나 정의되는 용어, 등장 학자/이론명).
- 보통 한 단어일 때가 많지만 **한 단어로 고집하지 마세요.** 중심 개념이 여러 단어로 된 구(명사구)면 그 구 전체를 고르세요(예: "공리주의 윤리", "분배적 정의", "지방 분권 제도"). 다만 서술·설명 문장 전체로 늘리지는 말고, 대상을 가리키는 짧은 명사(구)까지만.

[중심문장(key_sentence)] 문단당 1~3개 (의미 구조에 따라)
- 그 문단의 중심 주장·정의·결론이 담긴 부분.
- 한 문단에 중요한 내용이 여럿이면(예: 서로 다른 두 주장/판단, 또는 주장과 핵심 근거), 가장 중요한 것 하나만 고르지 말고 **그다음으로 중요한 문장/절도 함께** 표시하세요. 문단의 의미 구조상 필요한 만큼(보통 1~3개, 중요도 순으로).
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
  teacherNote?: string,
): Promise<AnalyzeResult> {
  if (!process.env.OPENAI_API_KEY) return { error: "no_key" };

  const body = paragraphs.map((p) => `[${p.seq}문단] ${p.text}`).join("\n\n");
  const messages: { role: "system" | "user"; content: string }[] = [
    { role: "system", content: SYSTEM },
  ];
  const note = (teacherNote ?? "").trim();
  if (note) {
    messages.push({
      role: "system",
      content:
        "교사의 추가 지시입니다. 아래 지침을 최우선으로 반영해 분석하세요: " +
        note +
        " — 단, 위의 '원문 글자 그대로 복사' 규칙과 JSON 출력 형식은 반드시 지키세요.",
    });
  }
  messages.push({ role: "user", content: `제목: ${title}\n\n${body}` });
  try {
    const teacherModel = MODEL_TEACHER(); // 교사 보조는 교사 전용(최상위) 모델
    const res = await getOpenAI().chat.completions.create({
      model: teacherModel,
      messages,
      response_format: { type: "json_object" },
      ...tokenParams(teacherModel, 1500, 0.2),
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

// ===== 관점 평가 가이드 / 독해 확인 문항 추천 (교사 보조) =====

export type CheckSix = {
  detail_q: string;
  detail_a: string;
  main_q: string;
  main_a: string;
  inference_q: string;
  inference_a: string;
};

const CRITIQUE_SYSTEM = `당신은 고등학교 '비판적 독해(관점 평가)' 수업을 돕는 교사 보조입니다.
지문을 읽고 교사가 '관점 평가 가이드'로 쓸 내용을 제안하세요. 이 가이드는 교사·코치 내부용이며 학생에게 그대로 노출되지 않습니다.
다음을 간결한 개조식으로 정리하세요(한국어, 5~10줄):
- 글에 담긴 서로 겨루는 관점(또는 평가 대상이 되는 주장)과 각자의 핵심 주장·전제.
- 어떤 관점을 '기준'으로 삼아 다른 관점을 평가할 수 있는지.
- 그 기준을 적용할 때 드러나는 문제를 뒷받침하는 글의 근거(문장 요지).
- 통계·사례·인용 등 근거 자료의 신뢰성 점검 포인트.
논쟁적 주제에 '어느 쪽이 옳다'고 단정하지 말고 평가의 틀과 근거만 정리하세요(중립성).
겨루는 관점이 뚜렷하지 않으면 그 점을 한 줄로 밝히고, 비판적으로 따져볼 지점(가정·일반화·근거의 한계)을 제안하세요.
JSON으로만 출력: {"note":"..."}`;

const CHECK_SYSTEM = `당신은 고등학교 문해력 학습의 '독해 확인 문항'을 만드는 교사 보조입니다.
지문을 읽고 세 문항과 각 모범답안 가이드를 만드세요(한국어):
- 세부(detail): 글에 명시된 구체적 사실을 묻는 문항.
- 중심(main): 문단·글 전체의 요지·주제를 묻는 문항.
- 추론(inference): 글에 직접 드러나지 않은 의미·함축·필자 의도를 묻는 문항.
각 문항은 한 문장이며 학생이 '글을 근거로' 답할 수 있어야 합니다.
모범답안 가이드(_a)는 교사 채점용(학생 비노출)이며 2~3문장, 근거가 되는 문단/내용을 함께 적으세요.
JSON으로만 출력: {"detail_q":"","detail_a":"","main_q":"","main_a":"","inference_q":"","inference_a":""}`;

async function runJsonAnalysis(
  system: string,
  title: string,
  paragraphs: { seq: number; text: string }[],
  maxTokens: number,
): Promise<Record<string, unknown> | { error: string }> {
  if (!process.env.OPENAI_API_KEY) return { error: "no_key" };
  const body = paragraphs.map((p) => `[${p.seq}문단] ${p.text}`).join("\n\n");
  try {
    const teacherModel = MODEL_TEACHER();
    const res = await getOpenAI().chat.completions.create({
      model: teacherModel,
      messages: [
        { role: "system", content: system },
        { role: "user", content: `제목: ${title}\n\n${body}` },
      ],
      response_format: { type: "json_object" },
      ...tokenParams(teacherModel, maxTokens, 0.3),
    });
    return JSON.parse(res.choices[0]?.message?.content ?? "{}") as Record<
      string,
      unknown
    >;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "analyze_failed" };
  }
}

export async function suggestCritiqueGuide(
  title: string,
  paragraphs: { seq: number; text: string }[],
): Promise<{ note: string } | { error: string }> {
  const r = await runJsonAnalysis(CRITIQUE_SYSTEM, title, paragraphs, 900);
  if ("error" in r) return r as { error: string };
  const note = typeof r.note === "string" ? r.note.trim() : "";
  return { note };
}

export async function suggestCheckQuestions(
  title: string,
  paragraphs: { seq: number; text: string }[],
): Promise<{ checks: CheckSix } | { error: string }> {
  const r = await runJsonAnalysis(CHECK_SYSTEM, title, paragraphs, 1000);
  if ("error" in r) return r as { error: string };
  const g = (k: string) => (typeof r[k] === "string" ? (r[k] as string).trim() : "");
  return {
    checks: {
      detail_q: g("detail_q"),
      detail_a: g("detail_a"),
      main_q: g("main_q"),
      main_a: g("main_a"),
      inference_q: g("inference_q"),
      inference_a: g("inference_a"),
    },
  };
}

// ===== 채점 루브릭 AI 추천 (교사 보조) =====

export type RubricKind = "marking" | "critique" | "check";

const RUBRIC_SYSTEM: Record<RubricKind, string> = {
  marking: `당신은 고등학교 문해력 학습의 '표시 채점 루브릭'을 제안하는 교사 보조입니다.
학생이 지문을 읽으며 남긴 표시(밑줄=중심문장, 동그라미=중심화제, 화살표=문장·문단 관계)를 교사의 정답 기준과 비교해 0~100점으로 채점할 때 쓸 간결한 루브릭을 제안하세요.
- 배점 항목 3~5개로 나누고 배점 합이 100이 되게 하세요. (예: 중심화제 동그라미 정확 30 · 중심문장 밑줄 40 · 문단 간 관계 연결 30)
- 이 지문에서 특히 중요한 관계 유형(인과·대조·문제해결 등)이 있으면 항목에 반영하세요.
- 표시 '개수'가 아니라 '중요한 핵심을 정확히 짚고 적절히 연결했는지'로 평가하도록 쓰세요.
한국어 개조식 3~6줄. JSON으로만: {"rubric":"..."}`,
  critique: `당신은 고등학교 '비판적 독해(관점 평가)' 채점 루브릭을 제안하는 교사 보조입니다.
학생이 읽은 뒤 나눈 '관점 평가' 대화를 0~100점으로 채점할 기준을 제안하세요.
- 배점 항목 3~4개, 합 100. (예: 판단 기준의 명료성 40 · 한 관점으로 다른 관점 비판 40 · 글의 근거 인용 20)
- '어느 쪽이 옳다'가 아니라 '기준을 분명히 세우고 근거에 일관되게 적용했는지'를 평가하도록.
한국어 개조식 3~5줄. JSON으로만: {"rubric":"..."}`,
  check: `당신은 고등학교 문해력 '독해 확인(세부·중심·추론)' 채점 루브릭을 제안하는 교사 보조입니다.
학생의 세부·중심·추론 문답 답변을 0~100점으로 채점할 기준을 제안하세요.
- 세부/중심/추론 세 영역의 배점과 각 영역에서 '무엇을 맞혀야 득점인지'를 간결히.
- 배점 합 100. (예: 세부 정확 30 · 중심 요지 파악 40 · 추론 타당성 30)
한국어 개조식 3~5줄. JSON으로만: {"rubric":"..."}`,
};

export async function suggestRubric(
  kind: RubricKind,
  title: string,
  paragraphs: { seq: number; text: string }[],
): Promise<{ rubric: string } | { error: string }> {
  const r = await runJsonAnalysis(RUBRIC_SYSTEM[kind], title, paragraphs, 1200);
  if ("error" in r) return r as { error: string };
  const rubric = typeof r.rubric === "string" ? r.rubric.trim() : "";
  return { rubric };
}
