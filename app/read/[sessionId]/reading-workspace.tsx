"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { addAnnotation, deleteAnnotation, addRelation } from "../actions";

export type ParagraphData = { id: string; seq: number; text: string };
export type RelationType =
  | "compare_contrast"
  | "cause_effect"
  | "problem_solution"
  | "listing";
export type AnnotationData = {
  id: string;
  paragraph_id: string;
  type: "underline" | "circle" | "arrow";
  span_start: number;
  span_end: number;
  target_ref: string | null;
  relation_type: RelationType | null;
};

type ToolId = "underline" | "circle" | "arrow" | "erase";
const TOOLS: { id: ToolId; label: string; glyph: string; ready: boolean }[] = [
  { id: "underline", label: "밑줄", glyph: "▁", ready: true },
  { id: "circle", label: "동그라미", glyph: "◯", ready: true },
  { id: "arrow", label: "화살표 연결", glyph: "→", ready: true },
  { id: "erase", label: "지우기", glyph: "⌫", ready: true },
];

const RELATION_LABELS: { value: RelationType; label: string }[] = [
  { value: "cause_effect", label: "인과" },
  { value: "compare_contrast", label: "비교·대조" },
  { value: "problem_solution", label: "문제-해결" },
  { value: "listing", label: "나열" },
];
function relationLabel(v: RelationType | null): string {
  return RELATION_LABELS.find((r) => r.value === v)?.label ?? "관계";
}

const PHASES = ["핵심원리", "관계 연결", "구조화", "자기설명"];
type PadTab = "key" | "structure" | "explain";

/** 선택 영역의 문자 오프셋을 컨테이너 텍스트 기준으로 계산 */
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
  const pre = document.createRange();
  pre.selectNodeContents(container);
  pre.setEnd(range.startContainer, range.startOffset);
  const start = pre.toString().length;
  const end = start + range.toString().length;
  if (end <= start) return null;
  return { start, end };
}

export function ReadingWorkspace({
  sessionId,
  title,
  paragraphs,
  annotations,
}: {
  sessionId: string;
  title: string;
  paragraphs: ParagraphData[];
  annotations: AnnotationData[];
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

  const paraById = useMemo(() => {
    const m = new Map<string, ParagraphData>();
    for (const p of paragraphs) m.set(p.id, p);
    return m;
  }, [paragraphs]);

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
    setMsg(null);
  }

  /** 화살표 도구: 표시 A 탭 → 표시 B 탭 → 관계 유형 선택 */
  function handlePickEndpoint(markId: string) {
    if (tool !== "arrow") return;
    if (!arrowFrom) {
      setArrowFrom(markId);
      setMsg("연결할 두 번째 표시를 탭하세요.");
      return;
    }
    if (arrowFrom === markId) {
      setArrowFrom(null);
      setMsg(null);
      return;
    }
    setPendingPair({ from: arrowFrom, to: markId });
    setMsg(null);
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

          {/* 도구 팔레트 */}
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
                      className={`relative flex min-w-[64px] flex-col items-center gap-1 rounded-lg border px-3 py-2 text-xs ${
                        active
                          ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:hover:bg-gray-800"
                      }`}
                    >
                      <span className="text-lg leading-none">{t.glyph}</span>
                      {t.label}
                      {!t.ready && (
                        <span className="absolute -right-1 -top-1 rounded-full bg-gray-300 px-1 text-[9px] text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                          곧
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                {tool === "underline" || tool === "circle"
                  ? `'${TOOLS.find((t) => t.id === tool)?.label}' 선택됨 — 본문에서 표시할 글자를 드래그(길게 눌러 선택)하세요.`
                  : tool === "erase"
                    ? "'지우기' 선택됨 — 표시된 부분을 탭하면 지워집니다."
                    : tool === "arrow"
                      ? "'화살표 연결' 선택됨 — 이미 표시한(밑줄·동그라미) 두 부분을 차례로 탭해 관계로 이으세요."
                      : "도구를 먼저 선택한 후, 본문에서 표시할 곳을 선택하세요."}
              </p>
              {msg && <p className="mt-1 text-xs text-red-600">{msg}</p>}

              {/* 관계 유형 선택 */}
              {pendingPair && (
                <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950">
                  <p className="mb-2 text-xs font-medium text-blue-900 dark:text-blue-100">
                    “{annoText(annoById.get(pendingPair.from))}” →{" "}
                    “{annoText(annoById.get(pendingPair.to))}” 의 관계는?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {RELATION_LABELS.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        disabled={pending}
                        onClick={() => handleAddRelation(r.value)}
                        className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 dark:bg-gray-900 dark:text-blue-300"
                      >
                        {r.label}
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

          {/* 지문 */}
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
                  {marks.map((a) => {
                    const t = paraById.get(a.paragraph_id)?.text ?? "";
                    return (
                      <li
                        key={a.id}
                        className="flex items-center gap-2 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm dark:border-gray-800"
                      >
                        <span
                          className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                            a.type === "underline"
                              ? "bg-blue-500"
                              : "bg-rose-500"
                          }`}
                        />
                        <span className="min-w-0 flex-1 truncate text-gray-700 dark:text-gray-300">
                          {t.slice(a.span_start, a.span_end)}
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
                    );
                  })}
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
                  화살표 도구로 두 표시를 이으면 관계도가 그려져요.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {relations.map((a) => (
                    <li
                      key={a.id}
                      className="rounded-lg border border-gray-200 p-2.5 text-sm dark:border-gray-800"
                    >
                      <div className="flex items-start gap-1.5">
                        <span className="min-w-0 flex-1">
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800">
                            {annoText(a) || "(삭제됨)"}
                          </span>
                          <span className="mx-1 text-blue-500">
                            ↓ {relationLabel(a.relation_type)}
                          </span>
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800">
                            {annoText(annoById.get(a.target_ref ?? "")) ||
                              "(삭제됨)"}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleErase(a.id)}
                          disabled={pending}
                          className="shrink-0 text-xs text-gray-400 hover:text-red-500 disabled:opacity-50"
                          aria-label="관계 삭제"
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {tab === "explain" && (
            <PadEmpty
              title="내 설명"
              hint="AI 코치의 질문에 답한 내용이 여기에 쌓여요. (곧 추가)"
            />
          )}
        </aside>
      </div>

      {/* AI 읽기 코치 바 */}
      <div className="sticky bottom-0 z-10 border-t border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 p-4 md:flex-row md:items-center">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-100 text-lg dark:bg-blue-950">
              🤖
            </div>
            <div className="min-w-0 rounded-2xl rounded-tl-sm bg-blue-50 px-4 py-2.5 text-sm text-blue-900 dark:bg-blue-950 dark:text-blue-100">
              읽으면서 중요한 부분을 표시해 보세요. 제가 옆에서 보고 있다가
              필요할 때 도와줄게요. <span className="text-blue-400">(코치 응답 준비 중)</span>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <textarea
              rows={1}
              maxLength={300}
              disabled
              placeholder="내 설명 입력 (예: … 때문에 … 라고 생각합니다.)"
              className="w-full resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 md:w-72"
            />
            <button
              type="button"
              disabled
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              보내기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 문단 텍스트를 주석(밑줄/동그라미) 구간에 맞춰 런 단위로 렌더 */
function AnnotatedParagraph({
  text,
  annos,
  tool,
  pending,
  arrowFrom,
  onAdd,
  onErase,
  onPickEndpoint,
}: {
  text: string;
  annos: AnnotationData[];
  tool: ToolId | null;
  pending: boolean;
  arrowFrom: string | null;
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

  return (
    <p
      ref={ref}
      onMouseUp={onSelectEnd}
      onTouchEnd={onSelectEnd}
      className={`whitespace-pre-wrap text-[17px] leading-9 text-gray-800 dark:text-gray-100 ${
        tool === "underline" || tool === "circle"
          ? "cursor-text select-text"
          : ""
      }`}
    >
      {runs.map((r, i) => {
        const marked = r.underline || r.circle;
        const isFrom = arrowFrom != null && r.ids.includes(arrowFrom);
        const clickable =
          marked && !pending && (tool === "erase" || tool === "arrow");
        const cls = [
          r.underline
            ? "underline decoration-blue-500 decoration-2 underline-offset-4"
            : "",
          r.circle
            ? "rounded-full border-2 border-rose-400 px-1 py-0.5"
            : "",
          clickable ? "cursor-pointer hover:opacity-70" : "",
          isFrom ? "rounded bg-blue-200/60 ring-2 ring-blue-400" : "",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <span
            key={i}
            className={cls || undefined}
            onClick={
              clickable
                ? () => {
                    if (!r.ids[0]) return;
                    if (tool === "erase") onErase(r.ids[0]);
                    else if (tool === "arrow") onPickEndpoint(r.ids[0]);
                  }
                : undefined
            }
          >
            {text.slice(r.start, r.end)}
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
