import "server-only";

import { getOpenAI, pickModel } from "@/lib/openai";

/**
 * 읽기 결과 수치화(형성 평가). 정답은 드러내지 않고 0~100 점수 + 짧은 격려 피드백.
 *  - stage "reading": 표시(밑줄·동그라미·관계) 기반 → 사실(fact)·추론(inference)
 *  - stage "review" : 독해 확인·관점 평가 대화 기반 → 사실·추론·비판(critique)
 */

export type ScoreStage = "reading" | "review";

export type ScoreResult =
  | { scores: { fact: number; inference: number; critique?: number }; comment: string }
  | { error: string };

type ScoreCtx = {
  stage: ScoreStage;
  passageText: string;
  marks: { type: string; text: string }[];
  relations: { from: string; to: string; relation: string }[];
  keyInfos: string[];
  keyRelations: { from: string; to: string; relation: string }[];
  critiqueNote: string;
  history: { role: "student" | "agent"; content: string }[];
};

const NL = String.fromCharCode(10);
const clamp = (n: unknown) => {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, v));
};

export async function scoreSession(ctx: ScoreCtx): Promise<ScoreResult> {
  if (!process.env.OPENAI_API_KEY) return { error: "no_key" };

  const marksText =
    ctx.marks.map((m) => `- (${m.type === "circle" ? "동그라미" : "밑줄"}) ${m.text}`).join(NL) ||
    "(표시 없음)";
  const relText =
    ctx.relations.map((r) => (r.to ? `- "${r.from}" —[${r.relation}]→ "${r.to}"` : `- "${r.from}" (${r.relation})`)).join(NL) ||
    "(관계 표시 없음)";
  const keyInfoText = ctx.keyInfos.map((k) => "- " + k).join(NL) || "(없음)";
  const keyRelText =
    ctx.keyRelations.map((r) => `- "${r.from}" —[${r.relation}]→ "${r.to}"`).join(NL) || "(없음)";
  const convo =
    ctx.history.slice(-14).map((h) => (h.role === "agent" ? "코치: " : "학생: ") + h.content).join(NL) ||
    "(대화 없음)";

  const system =
    ctx.stage === "reading"
      ? `당신은 고등학교 추론적 독해 '형성 평가' 채점자입니다. 학생이 지문을 읽으며 남긴 표시(밑줄=핵심문장, 동그라미=핵심어, 화살표=관계)를 교사의 정답 기준과 비교해 채점합니다.
- fact(사실적 독해): 글에 드러난 핵심정보(핵심어·핵심문장)를 얼마나 정확히 짚었는가.
- inference(추론적 독해): 정보 사이의 관계·구조를 얼마나 적절히 연결했는가.
표시 '개수'가 아니라 중요한 핵심을 정확히 짚었는지로 0~100점. 정답 문장·위치를 드러내지 말고, 격려하는 짧은 피드백 한 줄(무엇을 잘했고 무엇을 더 보면 좋을지).
JSON만: {"fact":0,"inference":0,"comment":""}`
      : `당신은 고등학교 추론적 독해 '형성 평가' 채점자입니다. 학생이 읽은 뒤 나눈 '독해 확인(세부·중심·추론 문답)'과 '관점 평가(비판)' 대화를 근거로 채점합니다.
- fact(사실): 세부·중심 내용을 정확히 이해했는가.
- inference(추론): 드러나지 않은 의미·필자 의도를 타당하게 추론했는가.
- critique(비판): 한 관점을 기준으로 다른 관점을 글의 근거로 비판했는가(기준의 명료성·근거 적용의 일관성).
각 0~100점. 정답을 드러내지 말고, 격려하는 짧은 피드백 한 줄.
JSON만: {"fact":0,"inference":0,"critique":0,"comment":""}`;

  const user =
    ctx.stage === "reading"
      ? `[지문]${NL}${ctx.passageText}${NL}${NL}[학생 표시]${NL}${marksText}${NL}${NL}[학생 관계]${NL}${relText}${NL}${NL}[교사 정답 기준 — 핵심정보]${NL}${keyInfoText}${NL}[교사 정답 기준 — 핵심 관계]${NL}${keyRelText}`
      : `[지문]${NL}${ctx.passageText}${NL}${NL}[읽은 뒤 대화(독해 확인→관점 평가)]${NL}${convo}${NL}${NL}[교사 정답 기준 — 핵심정보]${NL}${keyInfoText}${NL}[관점 평가 가이드]${NL}${ctx.critiqueNote || "(없음)"}`;

  try {
    const res = await getOpenAI().chat.completions.create({
      model: pickModel({ step: "S2", attempt: 0 }),
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.2,
      max_tokens: 400,
      response_format: { type: "json_object" },
    });
    const p = JSON.parse(res.choices[0]?.message?.content ?? "{}");
    const comment = typeof p.comment === "string" ? p.comment.trim() : "";
    if (ctx.stage === "reading")
      return { scores: { fact: clamp(p.fact), inference: clamp(p.inference) }, comment };
    return {
      scores: { fact: clamp(p.fact), inference: clamp(p.inference), critique: clamp(p.critique) },
      comment,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "score_failed" };
  }
}
