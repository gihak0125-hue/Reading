"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type RefObject,
} from "react";
import Link from "next/link";
import {
  addAnnotation,
  deleteAnnotation,
  addRelation,
  addMarkTag,
  sendCoachMessage,
  completeSession,
  reopenSession,
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
  | "listing"
  | "similarity"
  | "contrast";
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

type ToolId =
  | "underline"
  | "circle"
  | "cause"
  | "process"
  | "problem"
  | "solution"
  | "question"
  | "answer"
  | "similar"
  | "contrast"
  | "listing"
  | "erase";

const REL_TOOL_TYPE: Partial<Record<ToolId, RelationType>> = {
  cause: "cause_effect",
  process: "process",
  similar: "similarity",
  contrast: "contrast",
};

// 단일 표시에 역할을 찍는 도구(문제/해결/질문/답)
const ROLE_TOOL: Partial<
  Record<
    ToolId,
    { type: "problem_solution" | "question_answer"; role: "from" | "to" }
  >
> = {
  problem: { type: "problem_solution", role: "from" },
  solution: { type: "problem_solution", role: "to" },
  question: { type: "question_answer", role: "from" },
  answer: { type: "question_answer", role: "to" },
};

const TOOLS: { id: ToolId; label: string; glyph: string }[] = [
  { id: "underline", label: "밑줄", glyph: "▁" },
  { id: "circle", label: "동그라미", glyph: "◯" },
  { id: "cause", label: "원인·결과", glyph: "→" },
  { id: "process", label: "과정", glyph: "⇢" },
  { id: "problem", label: "문제", glyph: "P" },
  { id: "solution", label: "해결", glyph: "S" },
  { id: "question", label: "질문", glyph: "Q" },
  { id: "answer", label: "답", glyph: "A" },
  { id: "similar", label: "공통점", glyph: "=" },
  { id: "contrast", label: "차이점", glyph: "≠" },
  { id: "listing", label: "나열", glyph: "①" },
  { id: "erase", label: "지우기", glyph: "⌫" },
];

const REL_LABEL: Record<RelationType, string> = {
  cause_effect: "인과",
  process: "과정",
  compare_contrast: "비교·대조",
  problem_solution: "문제-해결",
  question_answer: "문답",
  listing: "나열",
  similarity: "공통점",
  contrast: "차이점",
};

const BLUE =
  "border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100";
const REL_COLOR: Record<RelationType, { box: string; accent: string }> = {
  cause_effect: { box: BLUE, accent: "text-blue-600 dark:text-blue-300" },
  process: { box: BLUE, accent: "text-blue-600 dark:text-blue-300" },
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
  similarity: {
    box: "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100",
    accent: "text-sky-600 dark:text-sky-300",
  },
  contrast: {
    box: "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-100",
    accent: "text-rose-600 dark:text-rose-300",
  },
  listing: {
    box: "border-gray-300 bg-gray-50 text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100",
    accent: "text-gray-500 dark:text-gray-400",
  },
};

type PadTab = "key" | "structure" | "explain";
type Badge = { text: string; tone: string };
const TONE: Record<string, string> = {
  amber: "bg-amber-200 text-amber-900",
  green: "bg-emerald-200 text-emerald-900",
  blue: "bg-blue-200 text-blue-900",
  violet: "bg-violet-200 text-violet-900",
  sky: "bg-sky-200 text-sky-900",
  rose: "bg-rose-200 text-rose-900",
  gray: "bg-gray-300 text-gray-800",
};

type Pt = { x: number; y: number };

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

function caretOffset(
  x: number,
  y: number,
): { node: Node; offset: number } | null {
  const d = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
    caretPositionFromPoint?: (
      x: number,
      y: number,
    ) => { offsetNode: Node; offset: number } | null;
  };
  if (d.caretRangeFromPoint) {
    const r = d.caretRangeFromPoint(x, y);
    if (r) return { node: r.startContainer, offset: r.startOffset };
  }
  if (d.caretPositionFromPoint) {
    const p = d.caretPositionFromPoint(x, y);
    if (p) return { node: p.offsetNode, offset: p.offset };
  }
  return null;
}

function paraOffsetAtPoint(
  wrap: HTMLElement,
  x: number,
  y: number,
): { paraId: string; offset: number } | null {
  const c = caretOffset(x, y);
  if (!c) return null;
  const el =
    c.node.nodeType === 3
      ? (c.node.parentElement as HTMLElement | null)
      : (c.node as HTMLElement);
  const p = el?.closest("[data-para-id]") as HTMLElement | null;
  if (!p || !wrap.contains(p)) return null;
  const paraId = p.getAttribute("data-para-id");
  if (!paraId) return null;
  return { paraId, offset: offsetInContainer(p, c.node, c.offset) };
}

function markNearPoint(
  wrap: HTMLElement,
  x: number,
  y: number,
  maxDist = 44,
): string | null {
  const els = document.elementsFromPoint(x, y);
  for (const el of els) {
    const m = (el as HTMLElement).closest?.("[data-marks]") as HTMLElement | null;
    if (m && wrap.contains(m)) {
      const ids = m.getAttribute("data-marks")?.split(" ");
      if (ids && ids[0]) return ids[0];
    }
  }
  let best: string | null = null;
  let bestD = maxDist;
  wrap.querySelectorAll<HTMLElement>("[data-marks]").forEach((el) => {
    const r = el.getBoundingClientRect();
    const dx = Math.max(r.left - x, 0, x - r.right);
    const dy = Math.max(r.top - y, 0, y - r.bottom);
    const d = Math.hypot(dx, dy);
    if (d < bestD) {
      bestD = d;
      best = el.getAttribute("data-marks")?.split(" ")[0] ?? null;
    }
  });
  return best;
}

function recognizeSpan(
  wrap: HTMLElement,
  pts: Pt[],
  type: "underline" | "circle",
): { paraId: string; start: number; end: number } | null {
  const yShifts =
    type === "underline" ? [-4, -10, -16, -22, 0] : [0, -8, 8, -16];
  const byPara = new Map<string, number[]>();
  for (const pt of pts) {
    for (const dy of yShifts) {
      const hit = paraOffsetAtPoint(wrap, pt.x, pt.y + dy);
      if (hit) {
        const arr = byPara.get(hit.paraId) ?? [];
        arr.push(hit.offset);
        byPara.set(hit.paraId, arr);
        break;
      }
    }
  }
  let bestPara: string | null = null;
  let best: number[] = [];
  for (const [pid, arr] of byPara)
    if (arr.length > best.length) {
      best = arr;
      bestPara = pid;
    }
  if (!bestPara || best.length < 1) return null;
  const start = Math.min(...best);
  const end = Math.max(...best);
  if (end <= start) return null;
  return { paraId: bestPara, start, end };
}

export function ReadingWorkspace({
  sessionId,
  title,
  status,
  paragraphs,
  annotations,
  messages,
}: {
  sessionId: string;
  title: string;
  status: string;
  paragraphs: ParagraphData[];
  annotations: AnnotationData[];
  messages: CoachTurn[];
}) {
  const [tool, setTool] = useState<ToolId | null>(null);
  const [showTools, setShowTools] = useState(true);
  const [tab, setTab] = useState<PadTab>("key");
  const [msg, setMsg] = useState<string | null>(null);
  const [relFrom, setRelFrom] = useState<string | null>(null);
  const [listingLast, setListingLast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [draft, setDraft] = useState("");
  const [coachPending, startCoach] = useTransition();
  const [coachNote, setCoachNote] = useState<string | null>(null);
  const autoRef = useRef<{ count: number; at: number; off: boolean }>({
    count: annotations.length,
    at: 0,
    off: false,
  });

  const articleRef = useRef<HTMLDivElement>(null);
  const stroke = useRef<{ active: boolean; pts: Pt[] }>({
    active: false,
    pts: [],
  });
  const [tempPath, setTempPath] = useState("");

  const marks = useMemo(
    () =>
      annotations.filter((a) => a.type === "underline" || a.type === "circle"),
    [annotations],
  );
  const relations = useMemo(
    () => annotations.filter((a) => a.type === "arrow"),
    [annotations],
  );
  const arrowRelations = useMemo(
    () =>
      relations.filter(
        (r) =>
          r.relation_type === "cause_effect" ||
          r.relation_type === "process" ||
          r.relation_type === "compare_contrast" ||
          r.relation_type === "similarity" ||
          r.relation_type === "contrast",
      ),
    [relations],
  );
  const arrowDepKey = useMemo(
    () =>
      JSON.stringify(
        arrowRelations.map((r) => [
          r.id,
          r.from_ref,
          r.target_ref,
          r.relation_type,
        ]),
      ) +
      "|" +
      annotations.map((a) => `${a.id}:${a.span_start}:${a.span_end}`).join(","),
    [arrowRelations, annotations],
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
      if (rt === "listing") continue;
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
      } else if (rt === "similarity") {
        n++;
        push(from, { text: `${n}=`, tone: "sky" });
        push(to, { text: `${n}=`, tone: "sky" });
      } else if (rt === "compare_contrast") {
        n++;
        push(from, { text: `${n}↔`, tone: "violet" });
        push(to, { text: `${n}↔`, tone: "violet" });
      }
    }
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

  const studentTurns = useMemo(
    () => messages.filter((m) => m.role === "student"),
    [messages],
  );
  const lastAgent = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--)
      if (messages[i].role === "agent") return messages[i].content;
    return null;
  }, [messages]);

  // 학생이 읽으며 표시/연결하면(입력 없이도) 코치가 먼저 짧게 피드백
  useEffect(() => {
    if (status === "completed") return;
    const a = autoRef.current;
    if (a.off) return;
    const total = marks.length + relations.length;
    if (total <= a.count) {
      a.count = total;
      return;
    }
    const timer = setTimeout(() => {
      if (coachPending || Date.now() - a.at < 12000) return;
      a.count = total;
      a.at = Date.now();
      startCoach(async () => {
        const res = await sendCoachMessage({
          sessionId,
          text: "",
          mode: "activity",
        });
        if (res.needsKey) a.off = true;
      });
    }, 3500);
    return () => clearTimeout(timer);
  }, [marks.length, relations.length, status, sessionId, coachPending, startCoach]);

  function askFeedback() {
    setCoachNote(null);
    startCoach(async () => {
      const res = await sendCoachMessage({
        sessionId,
        text: "",
        mode: "activity",
      });
      if (res.needsKey) setCoachNote("AI 코치를 켜려면 API 키가 필요해요.");
      else if (res.error) setCoachNote(res.error);
    });
  }

  function annoText(a?: AnnotationData | null): string {
    if (!a) return "";
    return (paraById.get(a.paragraph_id)?.text ?? "").slice(
      a.span_start,
      a.span_end,
    );
  }

  function selectTool(id: ToolId) {
    setTool((cur) => (cur === id ? null : id));
    setRelFrom(null);
    setListingLast(null);
    setMsg(null);
  }

  function handleErase(id: string) {
    if (relFrom === id) setRelFrom(null);
    startTransition(async () => {
      await deleteAnnotation(id, sessionId);
    });
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!tool) return;
    articleRef.current?.setPointerCapture?.(e.pointerId);
    stroke.current = { active: true, pts: [{ x: e.clientX, y: e.clientY }] };
    setMsg(null);
    e.preventDefault();
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!stroke.current.active) return;
    stroke.current.pts.push({ x: e.clientX, y: e.clientY });
    const wr = articleRef.current?.getBoundingClientRect();
    if (!wr) return;
    const d = stroke.current.pts
      .map(
        (p, i) =>
          `${i ? "L" : "M"} ${(p.x - wr.left).toFixed(1)} ${(p.y - wr.top).toFixed(1)}`,
      )
      .join(" ");
    setTempPath(d);
  }
  function onPointerUp() {
    if (!stroke.current.active) return;
    const pts = stroke.current.pts;
    stroke.current = { active: false, pts: [] };
    setTempPath("");
    handleStroke(pts);
  }

  function handleStroke(pts: Pt[]) {
    const wrap = articleRef.current;
    if (!wrap || pts.length === 0 || !tool) return;

    if (tool === "underline" || tool === "circle") {
      const span = recognizeSpan(wrap, pts, tool);
      if (!span) {
        setMsg("표시할 글자 위를 그어 주세요.");
        return;
      }
      startTransition(async () => {
        const res = await addAnnotation({
          sessionId,
          paragraphId: span.paraId,
          type: tool,
          spanStart: span.start,
          spanEnd: span.end,
        });
        if (res.error) setMsg(res.error);
      });
      return;
    }

    if (tool === "listing") {
      const mid = pts[Math.floor(pts.length / 2)] ?? pts[0];
      const target =
        markNearPoint(wrap, mid.x, mid.y) ??
        markNearPoint(wrap, pts[0].x, pts[0].y);
      if (!target) {
        setMsg("번호를 매길 표시(밑줄·동그라미)를 탭하세요.");
        return;
      }
      if (listingLast && listingLast !== target) {
        const from = listingLast;
        startTransition(async () => {
          await addRelation({
            sessionId,
            fromAnnotationId: from,
            toAnnotationId: target,
            relationType: "listing",
          });
        });
      }
      setListingLast(target);
      setMsg("다음 항목을 탭하세요. (도구를 바꾸면 나열 끝)");
      return;
    }

    if (tool === "erase") {
      let target: string | null = null;
      for (const p of pts) {
        const m = markNearPoint(wrap, p.x, p.y, 24);
        if (m) {
          target = m;
          break;
        }
      }
      if (target) handleErase(target);
      else setMsg("지울 표시 위를 그어 주세요.");
      return;
    }

    const roleDef = ROLE_TOOL[tool];
    if (roleDef) {
      let target: string | null = null;
      for (const p of pts) {
        const m = markNearPoint(wrap, p.x, p.y, 40);
        if (m) {
          target = m;
          break;
        }
      }
      if (!target) {
        setMsg("역할을 찍을 표시(밑줄·동그라미)를 탭하세요.");
        return;
      }
      const tid = target;
      startTransition(async () => {
        const res = await addMarkTag({
          sessionId,
          annotationId: tid,
          relationType: roleDef.type,
          role: roleDef.role,
        });
        if (res.error) setMsg(res.error);
      });
      return;
    }

    const relType = REL_TOOL_TYPE[tool];
    if (relType) {
      const from = markNearPoint(wrap, pts[0].x, pts[0].y);
      const to = markNearPoint(
        wrap,
        pts[pts.length - 1].x,
        pts[pts.length - 1].y,
      );
      if (!from || !to) {
        setMsg("표시(밑줄·동그라미)에서 시작해 다른 표시로 그어 주세요.");
        return;
      }
      if (from === to) {
        setMsg("서로 다른 두 표시를 이어 주세요.");
        return;
      }
      startTransition(async () => {
        const res = await addRelation({
          sessionId,
          fromAnnotationId: from,
          toAnnotationId: to,
          relationType: relType,
        });
        if (res.error) setMsg(res.error);
      });
    }
  }

  function handleComplete() {
    startTransition(async () => {
      await completeSession(sessionId);
    });
  }
  function handleReopen() {
    startTransition(async () => {
      await reopenSession(sessionId);
    });
  }

  function sendCoach(hint: boolean) {
    const text = draft.trim();
    if (!hint && !text) return;
    setCoachNote(null);
    startCoach(async () => {
      const res = await sendCoachMessage({ sessionId, text, hint });
      if (res.needsKey)
        setCoachNote("AI 코치를 켜려면 API 키가 필요해요. (설명은 저장됐어요)");
      else if (res.error) setCoachNote(res.error);
      else setDraft("");
    });
  }

  const toolHint = () => {
    if (tool === "underline" || tool === "circle")
      return `'${TOOLS.find((t) => t.id === tool)?.label}' — 손가락/펜으로 글자 위를 그으면 표시돼요.`;
    if (tool === "listing")
      return "'나열' — 항목(밑줄·동그라미)을 순서대로 탭하면 1·2·3 번호가 붙어요.";
    if (tool === "erase") return "'지우기' — 표시 위를 그으면 지워져요.";
    if (tool && ROLE_TOOL[tool])
      return `'${TOOLS.find((t) => t.id === tool)?.label}' — 해당하는 표시(밑줄·동그라미) 하나를 탭하면 역할이 찍혀요.`;
    if (tool && REL_TOOL_TYPE[tool])
      return `'${TOOLS.find((t) => t.id === tool)?.label}' — 표시 두 개를(첫 표시 → 다음 표시) 이어 그으면 관계가 표시돼요. 먼저 밑줄·동그라미로 표시부터 하세요.`;
    return "도구를 고르면 손으로 그려서 표시할 수 있어요. (도구를 끄면 읽기·스크롤)";
  };

  return (
    <div className="flex min-h-full flex-col">
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
        <div className="flex shrink-0 items-center gap-2">
          {status === "completed" ? (
            <button
              type="button"
              onClick={handleReopen}
              disabled={pending}
              className="rounded-full border border-green-300 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-60 dark:border-green-800 dark:bg-green-950 dark:text-green-300"
            >
              완료됨 ✓ · 다시 읽기
            </button>
          ) : (
            <button
              type="button"
              onClick={handleComplete}
              disabled={pending}
              className="rounded-full border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              읽기 마치기
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowTools((v) => !v)}
            className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300"
          >
            ✨ AI 읽기 코치
          </button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 p-4 lg:flex-row">
        <section className="relative flex-1 rounded-2xl border border-white/60 bg-white/90 p-5 shadow-xl shadow-blue-200/20 backdrop-blur-sm dark:border-white/10 dark:bg-gray-950/80 dark:shadow-black/30">
          {pending && (
            <div className="pointer-events-none absolute right-3 top-3 z-30 flex items-center gap-1.5 rounded-full bg-blue-600/90 px-3 py-1 text-xs font-medium text-white shadow-lg">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              표시하는 중…
            </div>
          )}
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
                      className={`flex min-w-[60px] flex-col items-center gap-1 rounded-lg border px-3 py-2 text-xs ${
                        active
                          ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:hover:bg-gray-800"
                      }`}
                    >
                      <span className="text-base leading-none">{t.glyph}</span>
                      {t.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-gray-500">{toolHint()}</p>
              {msg && <p className="mt-1 text-xs text-red-600">{msg}</p>}
            </div>
          )}

          <div
            ref={articleRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{
              touchAction: tool ? "none" : undefined,
              userSelect: tool ? "none" : undefined,
              WebkitUserSelect: tool ? "none" : undefined,
              cursor: tool ? "crosshair" : undefined,
            }}
            className="relative"
          >
            <RelationArrows
              containerRef={articleRef}
              relations={arrowRelations}
              depKey={arrowDepKey}
            />
            {tempPath && (
              <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible">
                <path
                  d={tempPath}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeOpacity={0.7}
                />
              </svg>
            )}
            <article className="flex flex-col gap-5">
              {paragraphs.map((p) => (
                <div key={p.id}>
                  <span className="mb-1 inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800">
                    {p.seq}문단
                  </span>
                  <AnnotatedParagraph
                    paragraphId={p.id}
                    text={p.text}
                    annos={marks.filter((a) => a.paragraph_id === p.id)}
                    badgesByMark={badgesByMark}
                  />
                </div>
              ))}
            </article>
          </div>
        </section>

        <aside className="rounded-2xl border border-white/60 bg-white/85 p-5 shadow-xl shadow-blue-200/20 backdrop-blur-sm dark:border-white/10 dark:bg-gray-950/75 dark:shadow-black/30 lg:w-[340px] lg:shrink-0">
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
                  관계 도구로 표시를 이으면 여기에 정리돼요.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {relations.map((a) => {
                    const rt = a.relation_type ?? "listing";
                    const c = REL_COLOR[rt];
                    const singleRole = !a.from_ref !== !a.target_ref;
                    if (singleRole) {
                      const roleLabel =
                        rt === "problem_solution"
                          ? a.from_ref
                            ? "문제 (P)"
                            : "해결 (S)"
                          : rt === "question_answer"
                            ? a.from_ref
                              ? "질문 (Q)"
                              : "답 (A)"
                            : REL_LABEL[rt];
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
                            aria-label="표시 삭제"
                          >
                            ✕
                          </button>
                          <div className="flex flex-col items-center gap-1 text-center">
                            <div className={`text-xs font-bold ${c.accent}`}>
                              {roleLabel}
                            </div>
                            <div
                              className={`w-full rounded-lg border px-2.5 py-1.5 text-xs font-medium ${c.box}`}
                            >
                              {annoText(a) || "(삭제됨)"}
                            </div>
                          </div>
                        </li>
                      );
                    }
                    const twoway =
                      rt === "compare_contrast" ||
                      rt === "similarity" ||
                      rt === "contrast";
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
              <div className="mt-1 flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => sendCoach(true)}
                  disabled={coachPending}
                  className="rounded-md px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 disabled:opacity-50 dark:hover:bg-blue-950"
                >
                  💡 힌트
                </button>
                <button
                  type="button"
                  onClick={askFeedback}
                  disabled={coachPending}
                  className="rounded-md px-2 py-1 text-xs text-violet-600 hover:bg-violet-50 disabled:opacity-50 dark:hover:bg-violet-950"
                >
                  🔎 내 표시 봐주기
                </button>
              </div>
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
  paragraphId,
  text,
  annos,
  badgesByMark,
}: {
  paragraphId: string;
  text: string;
  annos: AnnotationData[];
  badgesByMark: Map<string, Badge[]>;
}) {
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

  const badged = new Set<string>();

  return (
    <p
      data-para-id={paragraphId}
      className="whitespace-pre-wrap text-[17px] leading-9 text-gray-800 dark:text-gray-100"
    >
      {runs.map((r, i) => {
        const cls = [
          r.underline
            ? "underline decoration-blue-500 decoration-2 underline-offset-4"
            : "",
          r.circle ? "rounded-full border-2 border-rose-400 px-1 py-0.5" : "",
        ]
          .filter(Boolean)
          .join(" ");

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
              data-marks={r.ids.length ? r.ids.join(" ") : undefined}
            >
              {text.slice(r.start, r.end)}
            </span>
          </span>
        );
      })}
    </p>
  );
}

type ArrowTone = "blue" | "violet" | "sky" | "rose";
function toneOf(rt: RelationType | null): ArrowTone {
  if (rt === "similarity") return "sky";
  if (rt === "contrast") return "rose";
  if (rt === "compare_contrast") return "violet";
  return "blue";
}
const TONE_HEX: Record<ArrowTone, string> = {
  blue: "#2563eb",
  violet: "#7c3aed",
  sky: "#0ea5e9",
  rose: "#e11d48",
};

type ArrowDir = "one" | "in" | "out";

function RelationArrows({
  containerRef,
  relations,
  depKey,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  relations: AnnotationData[];
  depKey: string;
}) {
  const [paths, setPaths] = useState<
    { id: string; d: string; tone: ArrowTone; dir: ArrowDir }[]
  >([]);

  useEffect(() => {
    const wrap = containerRef.current;
    if (!wrap) return;

    const rectOf = (markId: string | null) => {
      if (!markId) return null;
      const els = wrap.querySelectorAll<HTMLElement>(`[data-marks~="${markId}"]`);
      if (!els.length) return null;
      let x1 = Infinity,
        y1 = Infinity,
        x2 = -Infinity,
        y2 = -Infinity;
      els.forEach((el) => {
        const r = el.getBoundingClientRect();
        x1 = Math.min(x1, r.left);
        y1 = Math.min(y1, r.top);
        x2 = Math.max(x2, r.right);
        y2 = Math.max(y2, r.bottom);
      });
      return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
    };

    const compute = () => {
      const wr = wrap.getBoundingClientRect();
      const out: { id: string; d: string; tone: ArrowTone; dir: ArrowDir }[] =
        [];
      for (const r of relations) {
        const fr = rectOf(r.from_ref);
        const tr = rectOf(r.target_ref);
        if (!fr || !tr) continue;
        const fx = fr.x + fr.w / 2 - wr.left;
        const fy = fr.y - wr.top;
        const tx = tr.x + tr.w / 2 - wr.left;
        const ty = tr.y - wr.top;
        const mx = (fx + tx) / 2;
        const my = (fy + ty) / 2;
        const dx = tx - fx;
        const dy = ty - fy;
        const len = Math.hypot(dx, dy) || 1;
        const off = Math.min(48, len * 0.35) + 10;
        let px = -dy / len;
        let py = dx / len;
        if (py > 0) {
          px = -px;
          py = -py;
        }
        const cx = mx + px * off;
        const cy = my + py * off;
        const d = `M ${fx.toFixed(1)} ${(fy - 3).toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${tx.toFixed(1)} ${(ty - 3).toFixed(1)}`;
        const rt = r.relation_type;
        const dir: ArrowDir =
          rt === "cause_effect" || rt === "process"
            ? "one"
            : rt === "similarity"
              ? "in"
              : "out";
        out.push({ id: r.id, d, tone: toneOf(rt), dir });
      }
      setPaths(out);
    };

    const raf = requestAnimationFrame(compute);
    const ro = new ResizeObserver(compute);
    ro.observe(wrap);
    window.addEventListener("resize", compute);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, [containerRef, relations, depKey]);

  const tones: ArrowTone[] = ["blue", "violet", "sky", "rose"];
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      aria-hidden
    >
      <defs>
        {tones.map((tn) => (
          <g key={tn}>
            <marker
              id={`ah-${tn}-fwd`}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto"
            >
              <path d="M0,0 L10,5 L0,10 z" fill={TONE_HEX[tn]} />
            </marker>
            <marker
              id={`ah-${tn}-rev`}
              viewBox="0 0 10 10"
              refX="1"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto"
            >
              <path d="M10,0 L0,5 L10,10 z" fill={TONE_HEX[tn]} />
            </marker>
          </g>
        ))}
      </defs>
      {paths.map((p) => (
        <path
          key={p.id}
          d={p.d}
          fill="none"
          stroke={TONE_HEX[p.tone]}
          strokeWidth={2}
          strokeOpacity={0.85}
          markerEnd={`url(#ah-${p.tone}-${p.dir === "in" ? "rev" : "fwd"})`}
          markerStart={
            p.dir === "out"
              ? `url(#ah-${p.tone}-rev)`
              : p.dir === "in"
                ? `url(#ah-${p.tone}-fwd)`
                : undefined
          }
        />
      ))}
    </svg>
  );
}
