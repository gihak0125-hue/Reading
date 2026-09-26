"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  addAnnotation,
  deleteAnnotation,
  addRelation,
  sendCoachMessage,
} from "../actions";

export type ParagraphData = { id: string; seq: number; text: string };
export type CoachTurn = {
  id: string;
  role: "student" | "agent";
  content: string;
  created_at: string;
};
export type RelationType =
  | "compare_contrast"
  | "cause_effect"
  | "process"
  | "problem_solution"
  | "question_answer"
  | "listing";
export type AnnotationData = {
  id: string;
  paragraph_id: string;
  type: "underline" | "circle" | "arrow";
  span_start: number;
  span_end: number;
  target_ref: string | null;
  from_ref: string | null;
  relation_type: RelationType | null;
};

type ToolId = "underline" | "circle" | "arrow" | "listing" | "erase";
const TOOLS: { id: ToolId; label: string; glyph: string }[] = [
  { id: "underline", label: "밑줄", glyph: "▁" },
  { id: "circle", label: "동그라미", glyph: "◯" },
  { id: "arrow", label: "관계 연결", glyph: "→" },
  { id: "listing", label: "나열", glyph: "①" },
  { id: "erase", label: "지우기", glyph: "⌫" },
];

// 관계 연결(짝) 유형 — 나열은 별도 도구
const PAIR_RELATIONS: { value: RelationType; label: string; hint: string }[] = [
  { value: "cause_effect", label: "인과", hint: "→" },
  { value: "process", label: "과정", hint: "→" },
  { value: "compare_contrast", label: "비교·대조", hint: "↔" },
  { value: "problem_solution", label: "문제-해결", hint: "P·S" },
  { value: "question_answer", label: "문답", hint: "Q·A" },
];
const REL_LABEL: Record<RelationType, string> = {
  cause_effect: "인과",
  process: "과정",
  compare_contrast: "비교·대조",
  problem_solution: "문제-해결",
  question_answer: "문답",
  listing: "나열",
};
const REL_COLOR: Record<RelationType, { box: string; accent: string }> = {
  cause_effect: {
    box: "border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100",
    accent: "text-blue-600 dark:text-blue-300",
  },
  process: {
    box: "border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100",
    accent: "text-blue-600 dark:text-blue-300",
  },
  compare_contrast: {
    box: "border-violet-300 bg-violet-50 text-violet-900 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-100",
    accent: "text-violet-600 dark:text-violet-300",
  },
  problem_solution: {
    box: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100",
    accent: "text-amber-600 dark:text-amber-300",
  },
  question_answer: {
    box: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100",
    accent: "text-emerald-600 dark:text-emerald-300",
  },
  listing: {
    box: "border-gray-300 bg-gray-50 text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100",
    accent: "text-gray-500 dark:text-gray-400",
  },
};

const PHASES = ["핵심원리", "관계 연결", "구조화", "자기설명"];
type PadTab = "key" | "structure" | "explain";

type Badge = { text: string; tone: string };
const TONE: Record<string, string> = {
  amber: "bg-amber-200 text-amber-900",
  green: "bg-emerald-200 text-emerald-900",
  blue: "bg-blue-200 text-blue-900",
  violet: "bg-violet-200 text-violet-900",
  gray: "bg-gray-300 text-gray-800",
};

/** 배지([data-badge]) 텍스트를 제외하고 컨테이너 내 오프셋 계산 */
function offsetInContainer(
  container: HTMLElement,
  node: Node,
  nodeOffset: number,
): number {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      return (n.parentElement as HTMLElement | null)?.closest("[data-badge]")
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT;
    },
  });
  let len = 0;
  while (walker.nextNode()) {
    const t = walker.currentNode;
    if (t === node) return len + nodeOffset;
    len += t.textContent?.length ?? 0;
  }
  return len;
}

function selectionOffsets(
  container: HTMLElement,
): { start: number; end: number } | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
  const range = sel.getRangeAt(0);
  if (
    !container.contains(range.startContainer) ||
    !container.contains(range.endContainer)
  )
    return null;
  const a = offsetInContainer(container, range.startContainer, range.startOffset);
  const b = offsetInContainer(container, range.endContainer, range.endOffset);
  const start = Math.min(a, b);
  const end = Math.max(a, b);
  if (end <= start) return null;
  return { start, end };
}

export function ReadingWorkspace({
  sessionId,
  title,
  paragraphs,
  annotations,
  messages,
}: {
  sessionId: string;
  title: string;
  paragraphs: ParagraphData[];
  annotations: AnnotationData[];
  messages: CoachTurn[];
}) {
  const [tool, setTool] = useState<ToolId | null>(null);
  const [showTools, setShowTools] = useState(true);
  const [tab, setTab] = useState<PadTab>("key");
  const [msg, setMsg] = useState<string | null>(null);
  const [arrowFrom, setArrowFrom] = useState<string | null>(null);
  const [pendingPair, setPendingPair] = useState<{
    from: string;
    to: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const [draft, setDraft] = useState("");
  const [coachPending, startCoach] = useTransition();
  const [coachNote, setCoachNote] = useState<string | null>(null);

  const studentTurns = useMemo(
    () => messages.filter((m) => m.role === "student"),
    [messages],
  );
  const lastAgent = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--)
      if (messages[i].role === "agent") return messages[i].content;
    return null;
  }, [messages]);

  function sendCoach(hint: boolean) {
    const text = draft.trim();
    if (!hint && !text) return;
    setCoachNote(null);
    startCoach(async () => {
      const res = await sendCoachMessage({ sessionId, text, hint });
      if (res.needsKey)
        setCoachNote(
          "AI 코치를 켜려면 OpenAI 키가 필요해요. (설명은 저장됐어요)",
        );
      else if (res.error) setCoachNote(res.error);
      else setDraft("");
    });
  }

  const marks = useMemo(
    () => annotations.filter((a) => a.type === "underline" || a.type === "circle"),
    [annotations],
  );
  const relations = useMemo(
    () => annotations.filter((a) => a.type === "arrow"),
    [annotations],
  );
  const annoById = useMemo(() => {
    const m = new Map<string, AnnotationData>();
    for (const a of annotations) m.set(a.id, a);
    return m;
  }, [annotations]);
  const paraById = useMemo(() => {
    const m = new Map<string, ParagraphData>();
    for (const p of paragraphs) m.set(p.id, p);
    return m;
  }, [paragraphs]);

  // 표시별 관계 배지 계산
  const badgesByMark = useMemo(() => {
    const map = new Map<string, Badge[]>();
    const push = (id: string | null, b: Badge) => {
      if (!id) return;
      const arr = map.get(id) ?? [];
      arr.push(b);
      map.set(id, arr);
    };
    let n = 0;
    for (const r of relations) {
      const rt = r.relation_type;
      const from = r.from_ref;
      const to = r.target_ref;
      if (!to || rt === "listing") continue;
      if (rt === "problem_solution") {
        push(from, { text: "P", tone: "amber" });
        push(to, { text: "S", tone: "amber" });
      } else if (rt === "question_answer") {
        push(from, { text: "Q", tone: "green" });
        push(to, { text: "A", tone: "green" });
      } else if (rt === "cause_effect" || rt === "process") {
        n++;
        push(from, { text: `${n}→`, tone: "blue" });
        push(to, { text: `→${n}`, tone: "blue" });
      } else if (rt === "compare_contrast") {
        n++;
        push(from, { text: `${n}↔`, tone: "violet" });
        push(to, { text: `${n}↔`, tone: "violet" });
      }
    }
    // 나열 번호(연결 체인 기준)
    const listing = relations.filter(
      (r) => r.relation_type === "listing" && r.from_ref && r.target_ref,
    );
    if (listing.length) {
      const pred = new Map<string, string>();
      const nodes = new Set<string>();
      for (const r of listing) {
        pred.set(r.target_ref!, r.from_ref!);
        nodes.add(r.from_ref!);
        nodes.add(r.target_ref!);
      }
      const orderOf = (start: string) => {
        let o = 1;
        let cur = start;
        const seen = new Set<string>();
        while (pred.has(cur) && !seen.has(cur)) {
          seen.add(cur);
          cur = pred.get(cur)!;
          o++;
        }
        return o;
      };
      for (const id of nodes) push(id, { text: `${orderOf(id)}`, tone: "gray" });
    }
    return map;
  }, [relations]);

  function annoText(a?: AnnotationData | null): string {
    if (!a) return "";
    return (paraById.get(a.paragraph_id)?.text ?? "").slice(
      a.span_start,
      a.span_end,
    );
  }

  function selectTool(id: ToolId) {
    setTool((cur) => (cur === id ? null : id));
    setArrowFrom(null);
    setPendingPair(null);
    setMsg(
      id === "arrow"
        ? "표시(밑줄·동그라미) 두 개를 차례로 탭해 관계로 이으세요."
        : id === "listing"
          ? "나열할 항목들을 순서대로 탭하세요. 1·2·3 번호가 붙어요."
          : null,
    );
  }

  function handleAdd(paragraphId: string, start: number, end: number) {
    if (tool !== "underline" && tool !== "circle") return;
    startTransition(async () => {
      const res = await addAnnotation({
        sessionId,
        paragraphId,
        type: tool,
        spanStart: start,
        spanEnd: end,
      });
      if (res.error) setMsg(res.error);
      else {
        setMsg(null);
        window.getSelection()?.removeAllRanges();
      }
    });
  }

  function handleErase(id: string) {
    if (arrowFrom === id) setArrowFrom(null);
    startTransition(async () => {
      await deleteAnnotation(id, sessionId);
    });
  }

  function handlePickEndpoint(markId: string) {
    if (tool === "arrow") {
      if (!arrowFrom) {
        setArrowFrom(markId);
        setMsg("연결할 두 번째 표시를 탭하세요.");
      } else if (arrowFrom === markId) {
        setArrowFrom(null);
        setMsg(null);
      } else {
        setPendingPair({ from: arrowFrom, to: markId });
        setMsg(null);
      }
    } else if (tool === "listing") {
      if (!arrowFrom) {
        setArrowFrom(markId);
        setMsg("다음 항목을 탭하세요.");
      } else if (arrowFrom === markId) {
        setArrowFrom(null);
        setMsg(null);
      } else {
        const from = arrowFrom;
        startTransition(async () => {
          const res = await addRelation({
            sessionId,
            fromAnnotationId: from,
            toAnnotationId: markId,
            relationType: "listing",
          });
          if (res.error) setMsg(res.error);
        });
        setArrowFrom(markId); // 체인 이어가기
      }
    }
  }

  function handleAddRelation(rt: RelationType) {
    if (!pendingPair) return;
    const pair = pendingPair;
    startTransition(async () => {
      const res = await addRelation({
        sessionId,
        fromAnnotationId: pair.from,
        toAnnotationId: pair.to,
        relationType: rt,
      });
      if (res.error) setMsg(res.error);
      setPendingPair(null);
      setArrowFrom(null);
    });
  }

  return (
    <div className="flex min-h-full flex-col">
      {/* 헤더 */}
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-gray-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-gray-800 dark:bg-gray-950/90">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/read"
            aria-label="목록으로"
            className="rounded-md px-2 py-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            ‹
          </Link>
          <span className="truncate font-semibold">📄 {title}</span>
        </div>

        <ol className="hidden items-center gap-1.5 md:flex">
          {PHASES.map((p, i) => (
            <li key={p} className="flex items-center gap-1.5">
              <span
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
                  i < 2
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-400 dark:bg-gray-800"
                }`}
              >
                <span className="tabular-nums">{i + 1}</span>
                {p}
              </span>
              {i < PHASES.length - 1 && (
                <span className="text-gray-300 dark:text-gray-600">›</span>
              )}
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={() => setShowTools((v) => !v)}
          className="shrink-0 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300"
        >
          ✨ AI 읽기 코치
        </button>
      </header>

      {/* 본문 + 사고 패드 */}
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 p-4 lg:flex-row">
        {/* 본문 */}
        <section className="relative flex-1 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">📖 본문</h2>
            <button
              type="button"
              onClick={() => setShowTools((v) => !v)}
              className="rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              {showTools ? "도구 숨기기" : "도구 보기"}
            </button>
          </div>

          {showTools && (
            <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex flex-wrap gap-2">
                {TOOLS.map((t) => {
                  const active = tool === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => selectTool(t.id)}
                      className={`flex min-w-[64px] flex-col items-center gap-1 rounded-lg border px-3 py-2 text-xs ${
                        active
                          ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:hover:bg-gray-800"
                      }`}
                    >
                      <span className="text-lg leading-none">{t.glyph}</span>
                      {t.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                {tool === "underline" || tool === "circle"
                  ? `'${TOOLS.find((t) => t.id === tool)?.label}' 선택됨 — 표시할 글자를 드래그(길게 눌러 선택)하세요.`
                  : tool === "erase"
                    ? "'지우기' — 표시를 탭하면 지워집니다."
                    : tool === "arrow"
                      ? "'관계 연결' — 표시 두 개를 차례로 탭하세요."
                      : tool === "listing"
                        ? "'나열' — 항목들을 순서대로 탭하면 1·2·3 번호가 붙어요."
                        : "도구를 먼저 선택한 후, 본문에서 표시할 곳을 선택하세요."}
              </p>
              {msg && <p className="mt-1 text-xs text-blue-700">{msg}</p>}

              {pendingPair && (
                <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950">
                  <p className="mb-2 text-xs font-medium text-blue-900 dark:text-blue-100">
                    “{annoText(annoById.get(pendingPair.from))}” 와 “
                    {annoText(annoById.get(pendingPair.to))}” 의 관계는?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {PAIR_RELATIONS.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        disabled={pending}
                        onClick={() => handleAddRelation(r.value)}
                        className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 dark:bg-gray-900 dark:text-blue-300"
                      >
                        {r.label}{" "}
                        <span className="text-blue-400">{r.hint}</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setPendingPair(null);
                        setArrowFrom(null);
                      }}
                      className="rounded-md px-2 py-1.5 text-xs text-gray-500 hover:underline"
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <article className="flex flex-col gap-5">
            {paragraphs.map((p) => (
              <div key={p.id}>
                <span className="mb-1 inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800">
                  {p.seq}문단
                </span>
                <AnnotatedParagraph
                  text={p.text}
                  annos={marks.filter((a) => a.paragraph_id === p.id)}
                  tool={tool}
                  pending={pending}
                  arrowFrom={arrowFrom}
                  badgesByMark={badgesByMark}
                  onAdd={(s, e) => handleAdd(p.id, s, e)}
                  onErase={handleErase}
                  onPickEndpoint={handlePickEndpoint}
                />
              </div>
            ))}
          </article>
        </section>

        {/* 사고 패드 */}
        <aside className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950 lg:w-[340px] lg:shrink-0">
          <h2 className="mb-3 font-semibold">📝 사고 패드</h2>
          <div className="mb-4 flex gap-1 rounded-lg bg-gray-100 p-1 text-sm dark:bg-gray-800">
            {(
              [
                ["key", "핵심정보"],
                ["structure", "관계·구조"],
                ["explain", "내 설명"],
              ] as [PadTab, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex-1 rounded-md px-2 py-1.5 font-medium ${
                  tab === id
                    ? "bg-white text-blue-700 shadow-sm dark:bg-gray-950 dark:text-blue-300"
                    : "text-gray-500"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "key" && (
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                핵심 문장 / 개념 {marks.length > 0 && `(${marks.length})`}
              </p>
              {marks.length === 0 ? (
                <p className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-xs text-gray-400 dark:border-gray-700">
                  본문에서 밑줄·동그라미로 표시하면 여기에 모여요.
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {marks.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center gap-2 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm dark:border-gray-800"
                    >
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                          a.type === "underline" ? "bg-blue-500" : "bg-rose-500"
                        }`}
                      />
                      <span className="min-w-0 flex-1 truncate text-gray-700 dark:text-gray-300">
                        {annoText(a)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleErase(a.id)}
                        disabled={pending}
                        className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-50"
                        aria-label="삭제"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {tab === "structure" && (
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                관계 구조도 {relations.length > 0 && `(${relations.length})`}
              </p>
              {relations.length === 0 ? (
                <p className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-xs text-gray-400 dark:border-gray-700">
                  관계 연결·나열 도구로 표시를 이으면 여기에 정리돼요.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {relations.map((a) => {
                    const rt = a.relation_type ?? "listing";
                    const c = REL_COLOR[rt];
                    const twoway = rt === "compare_contrast";
                    return (
                      <li
                        key={a.id}
                        className="relative rounded-xl border border-gray-200 p-3 dark:border-gray-800"
                      >
                        <button
                          type="button"
                          onClick={() => handleErase(a.id)}
                          disabled={pending}
                          className="absolute right-1.5 top-1.5 text-xs text-gray-400 hover:text-red-500 disabled:opacity-50"
                          aria-label="관계 삭제"
                        >
                          ✕
                        </button>
                        <div className="flex flex-col items-center gap-1 text-center">
                          <div
                            className={`w-full rounded-lg border px-2.5 py-1.5 text-xs font-medium ${c.box}`}
                          >
                            {annoText(a) || "(삭제됨)"}
                          </div>
                          <div
                            className={`flex items-center gap-1 text-xs font-bold ${c.accent}`}
                          >
                            <span className="text-base leading-none">
                              {twoway ? "↕" : "↓"}
                            </span>
                            {REL_LABEL[rt]}
                          </div>
                          <div
                            className={`w-full rounded-lg border px-2.5 py-1.5 text-xs font-medium ${c.box}`}
                          >
                            {annoText(annoById.get(a.target_ref ?? "")) ||
                              "(삭제됨)"}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
          {tab === "explain" && (
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                내 설명 {studentTurns.length > 0 && `(${studentTurns.length})`}
              </p>
              {studentTurns.length === 0 ? (
                <p className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-xs text-gray-400 dark:border-gray-700">
                  아래 코치 입력창에 내 생각을 쓰면 여기에 쌓여요.
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {studentTurns.map((m) => (
                    <li
                      key={m.id}
                      className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-700 dark:border-gray-800 dark:text-gray-300"
                    >
                      {m.content}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </aside>
      </div>

      {/* AI 읽기 코치 바 */}
      <div className="sticky bottom-0 z-10 border-t border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 p-4 md:flex-row md:items-end">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-100 text-lg dark:bg-blue-950">
              🤖
            </div>
            <div className="min-w-0">
              <div className="rounded-2xl rounded-tl-sm bg-blue-50 px-4 py-2.5 text-sm text-blue-900 dark:bg-blue-950 dark:text-blue-100">
                {coachPending
                  ? "생각 중이에요…"
                  : (lastAgent ??
                    "읽으면서 중요한 부분을 표시하고 관계를 이어보세요. 궁금한 점이나 내 생각을 아래에 적어줘요.")}
              </div>
              {coachNote && (
                <p className="mt-1 text-xs text-amber-600">{coachNote}</p>
              )}
              <button
                type="button"
                onClick={() => sendCoach(true)}
                disabled={coachPending}
                className="mt-1 rounded-md px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 disabled:opacity-50 dark:hover:bg-blue-950"
              >
                💡 힌트
              </button>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <textarea
              rows={2}
              maxLength={300}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendCoach(false);
                }
              }}
              placeholder="내 설명 입력 (예: … 때문에 … 라고 생각합니다.)"
              className="w-full resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 md:w-72"
            />
            <button
              type="button"
              onClick={() => sendCoach(false)}
              disabled={coachPending || !draft.trim()}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              보내기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnnotatedParagraph({
  text,
  annos,
  tool,
  pending,
  arrowFrom,
  badgesByMark,
  onAdd,
  onErase,
  onPickEndpoint,
}: {
  text: string;
  annos: AnnotationData[];
  tool: ToolId | null;
  pending: boolean;
  arrowFrom: string | null;
  badgesByMark: Map<string, Badge[]>;
  onAdd: (start: number, end: number) => void;
  onErase: (id: string) => void;
  onPickEndpoint: (markId: string) => void;
}) {
  const ref = useRef<HTMLParagraphElement>(null);

  const runs = useMemo(() => {
    const len = text.length;
    const cuts = new Set<number>([0, len]);
    for (const a of annos) {
      cuts.add(Math.max(0, Math.min(len, a.span_start)));
      cuts.add(Math.max(0, Math.min(len, a.span_end)));
    }
    const points = [...cuts].sort((x, y) => x - y);
    const out: {
      start: number;
      end: number;
      underline: boolean;
      circle: boolean;
      ids: string[];
    }[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const s = points[i];
      const e = points[i + 1];
      if (e <= s) continue;
      const covering = annos.filter((a) => a.span_start <= s && a.span_end >= e);
      out.push({
        start: s,
        end: e,
        underline: covering.some((a) => a.type === "underline"),
        circle: covering.some((a) => a.type === "circle"),
        ids: covering.map((a) => a.id),
      });
    }
    return out;
  }, [text, annos]);

  function onSelectEnd() {
    if (tool !== "underline" && tool !== "circle") return;
    const el = ref.current;
    if (!el) return;
    const off = selectionOffsets(el);
    if (off) onAdd(off.start, off.end);
  }

  const badged = new Set<string>();

  return (
    <p
      ref={ref}
      onMouseUp={onSelectEnd}
      onTouchEnd={onSelectEnd}
      className={`whitespace-pre-wrap text-[17px] leading-9 text-gray-800 dark:text-gray-100 ${
        tool === "underline" || tool === "circle" ? "cursor-text select-text" : ""
      }`}
    >
      {runs.map((r, i) => {
        const marked = r.underline || r.circle;
        const isFrom = arrowFrom != null && r.ids.includes(arrowFrom);
        const clickable =
          marked &&
          !pending &&
          (tool === "erase" || tool === "arrow" || tool === "listing");
        const cls = [
          r.underline
            ? "underline decoration-blue-500 decoration-2 underline-offset-4"
            : "",
          r.circle ? "rounded-full border-2 border-rose-400 px-1 py-0.5" : "",
          clickable ? "cursor-pointer hover:opacity-70" : "",
          isFrom ? "rounded bg-blue-200/60 ring-2 ring-blue-400" : "",
        ]
          .filter(Boolean)
          .join(" ");

        // 이 런에서 처음 등장하는 표시의 배지 수집
        const badges: Badge[] = [];
        for (const id of r.ids) {
          if (badged.has(id)) continue;
          const bs = badgesByMark.get(id);
          if (bs && bs.length) {
            badges.push(...bs);
            badged.add(id);
          }
        }

        return (
          <span key={i}>
            {badges.map((b, k) => (
              <sup
                key={k}
                data-badge
                className={`mx-0.5 select-none rounded px-1 text-[10px] font-bold ${
                  TONE[b.tone] ?? TONE.gray
                }`}
              >
                {b.text}
              </sup>
            ))}
            <span
              className={cls || undefined}
              onClick={
                clickable
                  ? () => {
                      if (!r.ids[0]) return;
                      if (tool === "erase") onErase(r.ids[0]);
                      else onPickEndpoint(r.ids[0]);
                    }
                  : undefined
              }
            >
              {text.slice(r.start, r.end)}
            </span>
          </span>
        );
      })}
    </p>
  );
}

function PadEmpty({ title, hint }: { title: string; hint: string }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        {title}
      </p>
      <p className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-xs text-gray-400 dark:border-gray-700">
        {hint}
      </p>
    </div>
  );
}
