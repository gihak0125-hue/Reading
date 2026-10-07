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
import { HomeIcon } from "@/app/home-button";
import {
  addAnnotation,
  deleteAnnotation,
  updateAnnotationSpan,
  addFreehand,
  deleteFreehand,
  addRelation,
  addMarkTag,
  sendCoachMessage,
  completeSession,
  reopenSession,
  scoreSessionAction,
} from "../actions";
import { signout } from "@/app/login/actions";

export type ParagraphData = { id: string; seq: number; text: string };
export type CoachTurn = {
  id: string;
  role: "student" | "agent";
  content: string;
  created_at: string;
};
export type FreehandStroke = { id: string; d: string; color: string };
export type RelationType =
  | "compare_contrast"
  | "cause_effect"
  | "process"
  | "problem_solution"
  | "question_answer"
  | "listing"
  | "similarity"
  | "contrast"
  | "elaboration";
export type AnnotationData = {
  id: string;
  paragraph_id: string;
  type: "underline" | "circle" | "arrow" | "discourse" | "predict_cue";
  span_start: number;
  span_end: number;
  target_ref: string | null;
  from_ref: string | null;
  relation_type: RelationType | null;
};

type ToolId =
  | "underline"
  | "circle"
  | "predictcue"
  | "freehand"
  | "cause"
  | "effect"
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
  process: "process",
  similar: "similarity",
  contrast: "contrast",
};

// 단일 표시에 역할을 찍는 도구(문제/해결/질문/답)
const ROLE_TOOL: Partial<
  Record<
    ToolId,
    {
      type: "problem_solution" | "question_answer" | "cause_effect";
      role: "from" | "to";
    }
  >
> = {
  cause: { type: "cause_effect", role: "from" },
  effect: { type: "cause_effect", role: "to" },
  problem: { type: "problem_solution", role: "from" },
  solution: { type: "problem_solution", role: "to" },
  question: { type: "question_answer", role: "from" },
  answer: { type: "question_answer", role: "to" },
};

const TOOLS: { id: ToolId; label: string; glyph: string }[] = [
  { id: "underline", label: "밑줄", glyph: "▁" },
  { id: "circle", label: "동그라미", glyph: "◯" },
  { id: "predictcue", label: "예측단서", glyph: "🔮" },
  { id: "freehand", label: "자유 필기", glyph: "✎" },
  { id: "cause", label: "원인", glyph: "c" },
  { id: "effect", label: "결과", glyph: "e" },
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

const TOP_IDS: ToolId[] = [
  "underline",
  "circle",
  "predictcue",
  "freehand",
  "erase",
];
const REL_IDS: ToolId[] = [
  "cause",
  "effect",
  "process",
  "problem",
  "solution",
  "question",
  "answer",
  "similar",
  "contrast",
  "listing",
];
const PEN_COLORS = ["#1d4ed8", "#dc2626", "#111827", "#059669"];

const REL_LABEL: Record<RelationType, string> = {
  cause_effect: "인과",
  process: "과정",
  compare_contrast: "비교·대조",
  problem_solution: "문제-해결",
  question_answer: "문답",
  listing: "나열",
  similarity: "공통점",
  contrast: "차이점",
  elaboration: "상술",
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
  elaboration: {
    box: "border-teal-300 bg-teal-50 text-teal-900 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-100",
    accent: "text-teal-600 dark:text-teal-300",
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
  teal: "bg-teal-200 text-teal-900",
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
  // 밑줄은 위(글자)를 살짝만 훑고, 동그라미는 위아래 조금씩 본다(줄 넘나듦 최소화)
  const yShifts =
    type === "underline" ? [-4, -9, -14, -19] : [0, -7, 7, -14];

  // 획을 촘촘히 보간해서 표본을 늘림(빠른 획도 정확히)
  const dense: Pt[] = [];
  for (let i = 0; i < pts.length; i++) {
    dense.push(pts[i]);
    const b = pts[i + 1];
    if (b) {
      const a = pts[i];
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const steps = Math.min(8, Math.floor(dist / 5));
      for (let s = 1; s < steps; s++)
        dense.push({
          x: a.x + ((b.x - a.x) * s) / steps,
          y: a.y + ((b.y - a.y) * s) / steps,
        });
    }
  }

  const hits: { off: number; y: number; para: string }[] = [];
  for (const pt of dense) {
    for (const dy of yShifts) {
      const h = paraOffsetAtPoint(wrap, pt.x, pt.y + dy);
      if (h) {
        hits.push({ off: h.offset, y: pt.y, para: h.paraId });
        break;
      }
    }
  }
  if (hits.length < 2) return null;

  // 표본이 가장 많은 문단 선택
  const paraCount = new Map<string, number>();
  for (const h of hits) paraCount.set(h.para, (paraCount.get(h.para) ?? 0) + 1);
  let bestPara = "";
  let bestN = 0;
  for (const [p, n] of paraCount)
    if (n > bestN) {
      bestN = n;
      bestPara = p;
    }
  const inPara = hits.filter((h) => h.para === bestPara);

  // 획의 y로 '줄' 군집화(같은 줄=y가 가깝다). 줄 넘나듦으로 과하게 잡히는 것 방지
  const sortedY = [...inPara].sort((a, b) => a.y - b.y);
  const clusters: { off: number; y: number }[][] = [];
  let cur: { off: number; y: number }[] = [];
  for (const h of sortedY) {
    if (cur.length && h.y - cur[cur.length - 1].y > 18) {
      clusters.push(cur);
      cur = [];
    }
    cur.push({ off: h.off, y: h.y });
  }
  if (cur.length) clusters.push(cur);

  // 밑줄: 표본이 가장 많은 줄. 동그라미: 획의 세로 중심에 가장 가까운 줄(감싼 글자)
  let chosen = clusters[0];
  if (type === "underline") {
    // 줄바꿈으로 이어진 밑줄을 하나로 인식한다. 화면상 줄이 바뀌어도 글자
    // 오프셋은 연속이므로, '줄' 군집을 오프셋이 거의 붙어 있으면 이어 붙인다.
    const ranges = clusters
      .map((c) => {
        const os = c.map((h) => h.off).sort((a, b) => a - b);
        return { c, lo: os[0], hi: os[os.length - 1] };
      })
      .sort((a, b) => a.lo - b.lo);
    const comps: { hits: { off: number; y: number }[]; hi: number }[] = [];
    for (const r of ranges) {
      const last = comps[comps.length - 1];
      if (last && r.lo - last.hi <= 3) {
        last.hits.push(...r.c);
        last.hi = Math.max(last.hi, r.hi);
      } else {
        comps.push({ hits: [...r.c], hi: r.hi });
      }
    }
    // 표본이 가장 많은(실제로 그은) 연속 구간 선택
    chosen = comps.reduce((best, c) =>
      c.hits.length > best.hits.length ? c : best,
    ).hits;
  } else {
    const cy = inPara.reduce((s, h) => s + h.y, 0) / inPara.length;
    let bestD = Infinity;
    for (const c of clusters) {
      const my = c.reduce((s, h) => s + h.y, 0) / c.length;
      const d = Math.abs(my - cy);
      if (d < bestD) {
        bestD = d;
        chosen = c;
      }
    }
  }

  // 선택된 줄 안에서 '가장 촘촘한 연속 구간'만 사용(외곽치 제거)
  const offs = chosen.map((h) => h.off).sort((a, b) => a - b);
  let runStart = 0;
  let bestRun: [number, number] = [0, 0];
  for (let i = 1; i <= offs.length; i++) {
    if (i === offs.length || offs[i] - offs[i - 1] > 5) {
      if (i - 1 - runStart > bestRun[1] - bestRun[0]) bestRun = [runStart, i - 1];
      runStart = i;
    }
  }
  const start = offs[bestRun[0]];
  const end = offs[bestRun[1]];
  if (end <= start) return null;
  return { paraId: bestPara, start, end };
}

const ERASER_R = 16;

const PENCIL_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">' +
  '<polygon points="4,20 7.5,19 19,7.5 16.5,5 5,16.5" fill="#f59e0b" stroke="#1f2937" stroke-width="1" stroke-linejoin="round"/>' +
  '<polygon points="4,20 5,16.5 7.5,19" fill="#1f2937"/>' +
  '<polygon points="16.5,5 19,7.5 20.5,6 18,3.5" fill="#fca5a5" stroke="#1f2937" stroke-width="1" stroke-linejoin="round"/>' +
  '</svg>';
const ERASER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26">' +
  '<g transform="rotate(-35 13 13)">' +
  '<rect x="4" y="10" width="16" height="8" rx="1.5" fill="#fecdd3" stroke="#1f2937" stroke-width="1"/>' +
  '<rect x="4" y="10" width="5.5" height="8" rx="1.5" fill="#fb7185" stroke="#1f2937" stroke-width="1"/>' +
  '</g></svg>';
const PENCIL_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(PENCIL_SVG)}") 4 20, crosshair`;
const ERASER_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(ERASER_SVG)}") 7 17, crosshair`;

function densifyPts(pts: Pt[]): Pt[] {
  const dense: Pt[] = [];
  for (let i = 0; i < pts.length; i++) {
    dense.push(pts[i]);
    const b = pts[i + 1];
    if (b) {
      const a = pts[i];
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const steps = Math.min(10, Math.floor(dist / 5));
      for (let s = 1; s < steps; s++)
        dense.push({
          x: a.x + ((b.x - a.x) * s) / steps,
          y: a.y + ((b.y - a.y) * s) / steps,
        });
    }
  }
  return dense;
}

/** 지우개 획이 지나간 '문단별 글자 구간'을 계산(부분 지우기용). */
function erasedByPara(
  wrap: HTMLElement,
  pts: Pt[],
  r: number,
): Map<string, [number, number][]> {
  const byPara = new Map<string, Set<number>>();
  for (const p of densifyPts(pts)) {
    for (const dy of [0, -8, -14]) {
      for (const dx of [-r, -r * 0.5, 0, r * 0.5, r]) {
        const h = paraOffsetAtPoint(wrap, p.x + dx, p.y + dy);
        if (!h) continue;
        let set = byPara.get(h.paraId);
        if (!set) {
          set = new Set();
          byPara.set(h.paraId, set);
        }
        set.add(h.offset);
      }
    }
  }
  const res = new Map<string, [number, number][]>();
  for (const [para, set] of byPara) {
    const offs = [...set].sort((a, b) => a - b);
    if (!offs.length) continue;
    const ivs: [number, number][] = [];
    let lo = offs[0];
    let hi = offs[0];
    for (let i = 1; i < offs.length; i++) {
      if (offs[i] - hi <= 2) hi = offs[i];
      else {
        ivs.push([lo, hi + 1]);
        lo = offs[i];
        hi = offs[i];
      }
    }
    ivs.push([lo, hi + 1]);
    res.set(para, ivs);
  }
  return res;
}

/** [s,e)에서 지운 구간들을 빼고 남는 구간들을 반환. */
function subtractIntervals(
  s: number,
  e: number,
  erased: [number, number][],
): [number, number][] {
  let parts: [number, number][] = [[s, e]];
  for (const [es, ee] of erased) {
    const next: [number, number][] = [];
    for (const [ps, pe] of parts) {
      if (ee <= ps || es >= pe) {
        next.push([ps, pe]);
        continue;
      }
      if (es > ps) next.push([ps, Math.min(es, pe)]);
      if (ee < pe) next.push([Math.max(ee, ps), pe]);
    }
    parts = next;
  }
  return parts.filter(([a, b]) => b - a >= 1);
}

export function ReadingWorkspace({
  sessionId,
  title,
  status,
  paragraphs,
  annotations,
  messages,
  freehand,
}: {
  sessionId: string;
  title: string;
  status: string;
  paragraphs: ParagraphData[];
  annotations: AnnotationData[];
  messages: CoachTurn[];
  freehand: FreehandStroke[];
}) {
  const [tool, setTool] = useState<ToolId | null>(null);
  const [showTools, setShowTools] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  const [phase, setPhase] = useState<
    | null
    | "read_score"
    | "check"
    | "check_score"
    | "critique"
    | "critique_score"
    | "done"
  >(null);
  const [showBody, setShowBody] = useState(false);
  // 확인/관점 각 단계 대화만 보여주기 위한 시작 인덱스(단계 전환 시 갱신)
  const [convStart, setConvStart] = useState(0);
  const [scores, setScores] = useState<{
    fact?: number;
    inference?: number;
    critique?: number;
    detail?: number;
    main?: number;
    comment: string;
  } | null>(null);
  const [scoring, startScoring] = useTransition();
  function fetchScore(stage: "reading" | "check" | "critique") {
    setScores(null);
    startScoring(async () => {
      const r = await scoreSessionAction(sessionId, stage);
      setScores("error" in r ? null : r);
    });
  }
  const [showGuide, setShowGuide] = useState(false);
  const [tab, setTab] = useState<PadTab>("key");
  const [msg, setMsg] = useState<string | null>(null);
  const [relFrom, setRelFrom] = useState<string | null>(null);
  const [listingLast, setListingLast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // 낙관적 표시: 화면에 즉시 반영하고 서버 저장은 뒤에서(전체 새로고침 없음)
  const [annos, setAnnos] = useState<AnnotationData[]>(annotations);
  const optIdRef = useRef(0);
  const tempAnno = (a: Omit<AnnotationData, "id">): AnnotationData => ({
    ...a,
    id: `opt-${++optIdRef.current}`,
  });
  function commitAdd(
    temp: AnnotationData,
    run: () => Promise<{ error?: string; id?: string }>,
  ) {
    setAnnos((prev) => [...prev, temp]);
    startTransition(async () => {
      const res = await run();
      if (res.error) {
        setAnnos((prev) => prev.filter((a) => a.id !== temp.id));
        setMsg(res.error);
      } else if (res.id) {
        const realId = res.id;
        setAnnos((prev) =>
          prev.map((a) => (a.id === temp.id ? { ...a, id: realId } : a)),
        );
      }
    });
  }

  const [draft, setDraft] = useState("");
  const [coachPending, startCoach] = useTransition();
  const [coachNote, setCoachNote] = useState<string | null>(null);
  const autoRef = useRef<{ count: number; at: number; off: boolean }>({
    count: annotations.length,
    at: 0,
    off: false,
  });
  const [seCue, setSeCue] = useState(false);
  const seRef = useRef({ predict: false, hidden: false, at: 0, off: false });

  const articleRef = useRef<HTMLDivElement>(null);
  const stroke = useRef<{ active: boolean; pts: Pt[] }>({
    active: false,
    pts: [],
  });
  const [tempPath, setTempPath] = useState("");
  const [eraser, setEraser] = useState<{ x: number; y: number } | null>(null);
  const [showRel, setShowRel] = useState(false);
  const [fhStrokes, setFhStrokes] = useState<FreehandStroke[]>(freehand);
  const [artW, setArtW] = useState(0);
  const [penColor, setPenColor] = useState(PEN_COLORS[0]);
  const ptrRef = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      ptrRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
    };
  }, []);
  useEffect(() => {
    const el = articleRef.current;
    if (!el) return;
    const update = () => setArtW(el.getBoundingClientRect().width);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const marks = useMemo(
    () =>
      annos.filter((a) => a.type === "underline" || a.type === "circle"),
    [annos],
  );
  const renderMarks = useMemo(
    () =>
      annos.filter(
        (a) =>
          a.type === "underline" ||
          a.type === "circle" ||
          a.type === "discourse" ||
          a.type === "predict_cue",
      ),
    [annos],
  );
  const relations = useMemo(
    () => annos.filter((a) => a.type === "arrow"),
    [annos],
  );
  const arrowRelations = useMemo(
    () =>
      relations.filter(
        (r) =>
          r.relation_type === "cause_effect" ||
          r.relation_type === "process" ||
          r.relation_type === "compare_contrast" ||
          r.relation_type === "similarity" ||
          r.relation_type === "contrast" ||
          r.relation_type === "elaboration",
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
      annos.map((a) => `${a.id}:${a.span_start}:${a.span_end}`).join(","),
    [arrowRelations, annos],
  );
  const annoById = useMemo(() => {
    const m = new Map<string, AnnotationData>();
    for (const a of annos) m.set(a.id, a);
    return m;
  }, [annos]);
  const paraById = useMemo(() => {
    const m = new Map<string, ParagraphData>();
    for (const p of paragraphs) m.set(p.id, p);
    return m;
  }, [paragraphs]);

  // 1~2문단에 예측 단서를 표시했는가 → 예측 자기설명 유도 트리거
  const earlyPredictCue = useMemo(
    () =>
      annos.some(
        (a) =>
          a.type === "predict_cue" &&
          (paraById.get(a.paragraph_id)?.seq ?? 99) <= 2,
      ),
    [annos, paraById],
  );

  // 문단 사이 관계를 모아 글 전체 구조도를 구성(설계지침4.4)
  const structureEdges = useMemo(() => {
    const seqOf = (annId: string | null) => {
      const a = annId ? annoById.get(annId) : null;
      return a ? (paraById.get(a.paragraph_id)?.seq ?? 0) : 0;
    };
    const map = new Map<string, { from: number; to: number; rt: RelationType }>();
    for (const r of relations) {
      if (!r.from_ref || !r.target_ref || !r.relation_type) continue;
      const f = seqOf(r.from_ref);
      const t = seqOf(r.target_ref);
      if (!f || !t || f === t) continue;
      const key = `${f}-${t}-${r.relation_type}`;
      if (!map.has(key)) map.set(key, { from: f, to: t, rt: r.relation_type });
    }
    return [...map.values()].sort((a, b) => a.from - b.from || a.to - b.to);
  }, [relations, annoById, paraById]);

  // 문단 구조도 2.0: 연쇄/분기/수렴 패턴 + 가장 많이 쓴 관계를 읽어 자기설명 유도(원리4.4·5)
  const structureSummary = useMemo(() => {
    if (structureEdges.length === 0) return null;
    const two = (rt: RelationType) =>
      rt === "compare_contrast" || rt === "similarity" || rt === "contrast";
    const deg = new Map<number, number>();
    const inDeg = new Map<number, number>();
    const outDeg = new Map<number, number>();
    const oneWayOut = new Map<number, number[]>();
    const relCount = new Map<RelationType, number>();
    const bump = (m: Map<number, number>, k: number) => m.set(k, (m.get(k) ?? 0) + 1);
    for (const e of structureEdges) {
      bump(deg, e.from);
      bump(deg, e.to);
      relCount.set(e.rt, (relCount.get(e.rt) ?? 0) + 1);
      if (!two(e.rt)) {
        bump(outDeg, e.from);
        bump(inDeg, e.to);
        if (!oneWayOut.has(e.from)) oneWayOut.set(e.from, []);
        oneWayOut.get(e.from)!.push(e.to);
      }
    }
    let domRt: RelationType | null = null;
    let domN = 0;
    for (const [rt, n] of relCount) if (n > domN) { domN = n; domRt = rt; }
    let hub = 0;
    let hubDeg = 0;
    for (const [p, d] of deg) if (d > hubDeg) { hubDeg = d; hub = p; }
    const merges = [...inDeg].filter(([, d]) => d >= 2).map(([p]) => p).sort((a, b) => a - b);
    const branches = [...outDeg].filter(([, d]) => d >= 2).map(([p]) => p).sort((a, b) => a - b);
    const longest = (n: number, seen: Set<number>): number[] => {
      let best: number[] = [n];
      for (const nx of oneWayOut.get(n) ?? []) {
        if (seen.has(nx)) continue;
        const path = [n, ...longest(nx, new Set([...seen, nx]))];
        if (path.length > best.length) best = path;
      }
      return best;
    };
    let chain: number[] = [];
    for (const n of deg.keys()) {
      const p = longest(n, new Set([n]));
      if (p.length > chain.length) chain = p;
    }
    let shape: string;
    if (merges.length)
      shape = `${merges.join("·")}문단으로 여러 흐름이 모이는 ‘수렴’ 구조`;
    else if (branches.length)
      shape = `${branches.join("·")}문단에서 여러 갈래로 나뉘는 ‘분기’ 구조`;
    else if (chain.length >= 3)
      shape = `${chain.join("→")}문단으로 이어지는 ‘연쇄’ 구조`;
    else shape = "문단들이 짝으로 이어진 구조";
    return { shape, domRt, hub: hubDeg >= 2 ? hub : 0 };
  }, [structureEdges]);

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
      } else if (rt === "cause_effect") {
        push(from, { text: "c", tone: "blue" });
        push(to, { text: "e", tone: "blue" });
      } else if (rt === "process") {
        n++;
        push(from, { text: `${n}→`, tone: "blue" });
        push(to, { text: `→${n}`, tone: "blue" });
      } else if (rt === "similarity") {
        if (!from || !to) {
          push(from ?? to, { text: "=", tone: "sky" });
        } else {
          n++;
          push(from, { text: `${n}=`, tone: "sky" });
          push(to, { text: `${n}=`, tone: "sky" });
        }
      } else if (rt === "compare_contrast") {
        n++;
        push(from, { text: `${n}↔`, tone: "violet" });
        push(to, { text: `${n}↔`, tone: "violet" });
      } else if (rt === "elaboration") {
        n++;
        push(from, { text: `${n}▸`, tone: "teal" });
        push(to, { text: `▸${n}`, tone: "teal" });
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
      if (coachPending || Date.now() - a.at < 45000 || total - a.count < 2)
        return;
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
    }, 7000);
    return () => clearTimeout(timer);
  }, [marks.length, relations.length, status, sessionId, coachPending, startCoach]);

  // 적절한 때 자기설명을 자동으로 띄워 학생이 쓰게 유도(읽는 중 2번: 예측·숨은 뜻)
  useEffect(() => {
    if (status === "completed") return;
    const r = seRef.current;
    if (r.off || studentTurns.length >= 2) return;
    const m = marks.length;
    let mode: "predict" | "hidden" | null = null;
    if (!r.predict && studentTurns.length < 1 && earlyPredictCue) mode = "predict";
    else if (!r.hidden && m >= 7) mode = "hidden";
    if (!mode) return;
    const pick = mode;
    const timer = setTimeout(() => {
      if (coachPending || Date.now() - r.at < 20000) return;
      if (pick === "predict") r.predict = true;
      else r.hidden = true;
      r.at = Date.now();
      startCoach(async () => {
        const res = await sendCoachMessage({ sessionId, text: "", mode: pick });
        if (res.needsKey) r.off = true;
        else if (!res.error) setSeCue(true);
      });
    }, 5000);
    return () => clearTimeout(timer);
  }, [marks.length, status, coachPending, studentTurns.length, earlyPredictCue, sessionId, startCoach]);

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

  function askCritique() {
    setCoachNote(null);
    setConvStart(messages.length);
    startCoach(async () => {
      const res = await sendCoachMessage({
        sessionId,
        text: "",
        mode: "critique",
      });
      if (res.needsKey) setCoachNote("AI 코치를 켜려면 API 키가 필요해요.");
      else if (res.error) setCoachNote(res.error);
    });
  }

  function askCheck() {
    setCoachNote(null);
    setConvStart(messages.length);
    startCoach(async () => {
      const res = await sendCoachMessage({
        sessionId,
        text: "",
        mode: "check",
      });
      if (res.needsKey) setCoachNote("AI 코치를 켜려면 API 키가 필요해요.");
      else if (res.error) setCoachNote(res.error);
    });
  }

  function askSelfExplain(mode: "predict" | "hidden") {
    setCoachNote(null);
    startCoach(async () => {
      const res = await sendCoachMessage({ sessionId, text: "", mode });
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
    setAnnos((prev) => prev.filter((a) => a.id !== id));
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
    if (tool === "erase") {
      setEraser({ x: e.clientX - wr.left, y: e.clientY - wr.top });
      return;
    }
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
    setEraser(null);
    handleStroke(pts);
  }

  function handleStroke(pts: Pt[]) {
    const wrap = articleRef.current;
    if (!wrap || pts.length === 0 || !tool) return;

    if (tool === "freehand") {
      if (pts.length < 2) return;
      const rect = wrap.getBoundingClientRect();
      const W = rect.width || 1;
      const d = pts
        .map(
          (p, i) =>
            `${i ? "L" : "M"} ${((p.x - rect.left) / W).toFixed(4)} ${((p.y - rect.top) / W).toFixed(4)}`,
        )
        .join(" ");
      const tempId = `fh-${++optIdRef.current}`;
      setFhStrokes((prev) => [...prev, { id: tempId, d, color: penColor }]);
      startTransition(async () => {
        const res = await addFreehand({ sessionId, d, color: penColor });
        if (res.error) {
          setFhStrokes((prev) => prev.filter((x) => x.id !== tempId));
          setMsg(res.error);
        } else if (res.id) {
          const realId = res.id;
          setFhStrokes((prev) =>
            prev.map((x) => (x.id === tempId ? { ...x, id: realId } : x)),
          );
        }
      });
      return;
    }

    if (tool === "underline" || tool === "circle" || tool === "predictcue") {
      const span = recognizeSpan(
        wrap,
        pts,
        tool === "circle" ? "circle" : "underline",
      );
      if (!span) {
        setMsg("표시할 글자 위를 그어 주세요.");
        return;
      }
      const markType = tool === "predictcue" ? "predict_cue" : tool;
      // 같은 문단의 인접한 기존 밑줄과 붙어 있으면 하나로 합친다
      // (앞 문장 끝까지 긋고 다음 줄 처음부터 따로 그어도 한 덩어리로 인식)
      if (markType === "underline") {
        const GAP = 2;
        const adj = annos.filter(
          (a) =>
            a.type === "underline" &&
            a.paragraph_id === span.paraId &&
            a.span_start != null &&
            a.span_end != null &&
            a.span_start <= span.end + GAP &&
            a.span_end >= span.start - GAP,
        );
        if (adj.length) {
          let ns = span.start;
          let ne = span.end;
          for (const a of adj) {
            ns = Math.min(ns, a.span_start!);
            ne = Math.max(ne, a.span_end!);
          }
          const keep = adj[0];
          const drop = adj.slice(1).map((a) => a.id);
          setAnnos((prev) =>
            prev
              .filter((a) => !drop.includes(a.id))
              .map((a) =>
                a.id === keep.id ? { ...a, span_start: ns, span_end: ne } : a,
              ),
          );
          startTransition(async () => {
            await updateAnnotationSpan(keep.id, sessionId, ns, ne);
            for (const id of drop) await deleteAnnotation(id, sessionId);
          });
          return;
        }
      }
      const temp = tempAnno({
        paragraph_id: span.paraId,
        type: markType,
        span_start: span.start,
        span_end: span.end,
        target_ref: null,
        from_ref: null,
        relation_type: null,
      });
      commitAdd(temp, () =>
        addAnnotation({
          sessionId,
          paragraphId: span.paraId,
          type: markType,
          spanStart: span.start,
          spanEnd: span.end,
        }),
      );
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
        const fm = annoById.get(from);
        const temp = tempAnno({
          paragraph_id: fm?.paragraph_id ?? "",
          type: "arrow",
          span_start: fm?.span_start ?? 0,
          span_end: fm?.span_end ?? 0,
          from_ref: from,
          target_ref: target,
          relation_type: "listing",
        });
        commitAdd(temp, () =>
          addRelation({
            sessionId,
            fromAnnotationId: from,
            toAnnotationId: target,
            relationType: "listing",
          }),
        );
      }
      setListingLast(target);
      setMsg("다음 항목을 탭하세요. (도구를 바꾸면 나열 끝)");
      return;
    }

    if (tool === "erase") {
      const eMap = erasedByPara(wrap, pts, ERASER_R);
      const ERASE_TYPES = new Set([
        "underline",
        "circle",
        "predict_cue",
        "discourse",
      ]);
      let changed = false;
      for (const a of annos) {
        if (!ERASE_TYPES.has(a.type)) continue;
        if (a.span_start == null || a.span_end == null) continue;
        const erased = eMap.get(a.paragraph_id);
        if (!erased) continue;
        const remain = subtractIntervals(a.span_start, a.span_end, erased);
        if (
          remain.length === 1 &&
          remain[0][0] === a.span_start &&
          remain[0][1] === a.span_end
        )
          continue;
        changed = true;
        if (remain.length === 0) {
          handleErase(a.id);
          continue;
        }
        const [fs, fe] = remain[0];
        setAnnos((prev) =>
          prev.map((x) =>
            x.id === a.id ? { ...x, span_start: fs, span_end: fe } : x,
          ),
        );
        startTransition(async () => {
          await updateAnnotationSpan(a.id, sessionId, fs, fe);
        });
        for (let i = 1; i < remain.length; i++) {
          const [rs, re] = remain[i];
          const temp = tempAnno({
            paragraph_id: a.paragraph_id,
            type: a.type,
            span_start: rs,
            span_end: re,
            target_ref: null,
            from_ref: null,
            relation_type: null,
          });
          commitAdd(temp, () =>
            addAnnotation({
              sessionId,
              paragraphId: a.paragraph_id,
              type: a.type as "underline" | "circle" | "discourse" | "predict_cue",
              spanStart: rs,
              spanEnd: re,
            }),
          );
        }
      }
      const erect = wrap.getBoundingClientRect();
      const epts = pts.map((p) => ({ x: p.x - erect.left, y: p.y - erect.top }));
      for (const fh of fhStrokes) {
        const nums = (fh.d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
        let hit = false;
        for (let i = 0; i + 1 < nums.length && !hit; i += 2) {
          for (const e of epts) {
            if (
              Math.hypot(nums[i] * artW - e.x, nums[i + 1] * artW - e.y) <=
              ERASER_R + 6
            ) {
              hit = true;
              break;
            }
          }
        }
        if (hit) {
          changed = true;
          const fid = fh.id;
          setFhStrokes((prev) => prev.filter((x) => x.id !== fid));
          startTransition(async () => {
            await deleteFreehand(fid, sessionId);
          });
        }
      }
      // 관계(화살표) 지우기 — 그어진 곡선(또는 단일 표시) 근처를 지나면 삭제
      const rectOfMark = (markId: string | null) => {
        if (!markId) return null;
        const els = wrap.querySelectorAll("[data-marks~=\"" + markId + "\"]");
        if (!els.length) return null;
        let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
        els.forEach((el) => {
          const r = el.getBoundingClientRect();
          x1 = Math.min(x1, r.left); y1 = Math.min(y1, r.top);
          x2 = Math.max(x2, r.right); y2 = Math.max(y2, r.bottom);
        });
        return { cx: (x1 + x2) / 2 - erect.left, top: y1 - erect.top, cy: (y1 + y2) / 2 - erect.top };
      };
      const nearPt = (ax: number, ay: number) => epts.some((e) => Math.hypot(ax - e.x, ay - e.y) <= ERASER_R + 7);
      for (const a of annos) {
        if (a.type !== "arrow") continue;
        const fr = rectOfMark(a.from_ref);
        const tr = rectOfMark(a.target_ref);
        let hit = false;
        if (fr && tr) {
          const fx = fr.cx, fy = fr.top - 3, tx = tr.cx, ty = tr.top - 3;
          const mx = (fx + tx) / 2, my = (fy + ty) / 2;
          const dx = tx - fx, dy = ty - fy;
          const len = Math.hypot(dx, dy) || 1;
          const off = Math.min(48, len * 0.35) + 10;
          let px = -dy / len, py = dx / len;
          if (py > 0) { px = -px; py = -py; }
          const cx = mx + px * off, cy = my + py * off;
          for (let i = 0; i <= 12 && !hit; i++) {
            const t = i / 12, u = 1 - t;
            const qx = u * u * fx + 2 * u * t * cx + t * t * tx;
            const qy = u * u * fy + 2 * u * t * cy + t * t * ty;
            if (nearPt(qx, qy)) hit = true;
          }
        } else {
          const c = fr || tr;
          if (c && nearPt(c.cx, c.cy)) hit = true;
        }
        if (hit) { changed = true; handleErase(a.id); }
      }
      if (!changed) setMsg("지울 표시 위를 그어 주세요.");
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
      const mk = annoById.get(tid);
      const temp = tempAnno({
        paragraph_id: mk?.paragraph_id ?? "",
        type: "arrow",
        span_start: mk?.span_start ?? 0,
        span_end: mk?.span_end ?? 0,
        from_ref: roleDef.role === "from" ? tid : null,
        target_ref: roleDef.role === "to" ? tid : null,
        relation_type: roleDef.type,
      });
      commitAdd(temp, () =>
        addMarkTag({
          sessionId,
          annotationId: tid,
          relationType: roleDef.type,
          role: roleDef.role,
        }),
      );
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
      // 공통점: 한 표시만 짚어도 공통점으로 인정(문장 하나로 공통점이 설명되는 경우)
      if (tool === "similar" && (!from || !to || from === to)) {
        const hit = from ?? to;
        if (!hit) {
          setMsg("공통점을 표시할 글자(밑줄·동그라미) 위를 짚어 주세요.");
          return;
        }
        const mk = annoById.get(hit);
        const temp = tempAnno({
          paragraph_id: mk?.paragraph_id ?? "",
          type: "arrow",
          span_start: mk?.span_start ?? 0,
          span_end: mk?.span_end ?? 0,
          from_ref: hit,
          target_ref: null,
          relation_type: "similarity",
        });
        commitAdd(temp, () =>
          addMarkTag({
            sessionId,
            annotationId: hit,
            relationType: "similarity",
            role: "from",
          }),
        );
        return;
      }
      if (!from || !to) {
        setMsg("표시(밑줄·동그라미)에서 시작해 다른 표시로 그어 주세요.");
        return;
      }
      if (from === to) {
        setMsg("서로 다른 두 표시를 이어 주세요.");
        return;
      }
      const fromMark = annoById.get(from);
      const temp = tempAnno({
        paragraph_id: fromMark?.paragraph_id ?? "",
        type: "arrow",
        span_start: fromMark?.span_start ?? 0,
        span_end: fromMark?.span_end ?? 0,
        from_ref: from,
        target_ref: to,
        relation_type: relType,
      });
      commitAdd(temp, () =>
        addRelation({
          sessionId,
          fromAnnotationId: from,
          toAnnotationId: to,
          relationType: relType,
        }),
      );
    }
  }

  function handleComplete() {
    startTransition(async () => {
      await completeSession(sessionId);
    });
    setPhase("read_score");
    fetchScore("reading");
  }
  function handleReopen() {
    startTransition(async () => {
      await reopenSession(sessionId);
    });
  }
  function clearFreehand() {
    const ids = fhStrokes.map((f) => f.id);
    if (ids.length === 0) return;
    setFhStrokes([]);
    startTransition(async () => {
      for (const id of ids) await deleteFreehand(id, sessionId);
    });
  }

  function sendCoach(hint: boolean) {
    const text = draft.trim();
    if (!hint && !text) return;
    if (!hint && text) setSeCue(false);
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
    if (tool === "underline")
      return "'밑줄' — 핵심문장(중요한 문장·구절)에 손으로 그으면 표시돼요.";
    if (tool === "circle")
      return "'동그라미' — 중심화제(글의 중심이 되는 말)에 손으로 그으면 표시돼요.";
    if (tool === "predictcue")
      return "'예측단서' — 1~2문단에서 다음 내용을 짐작하게 하는 단서(담화표지·구조 등)에 표시하면 코치가 예측을 물어봐요.";
    if (tool === "listing")
      return "'나열' — 항목(밑줄·동그라미)을 순서대로 탭하면 1·2·3 번호가 붙어요.";
    if (tool === "erase") return "'지우기' — 표시나 필기 위를 그으면 지워져요.";
    if (tool === "freehand")
      return "'자유 필기' — 본문 위에 손으로 자유롭게 쓰면 그대로 남아요.";
    if (tool && ROLE_TOOL[tool])
      return `'${TOOLS.find((t) => t.id === tool)?.label}' — 해당하는 표시(밑줄·동그라미) 하나를 탭하면 역할이 찍혀요.`;
    if (tool === "similar")
      return "'공통점' — 두 표시를 이어 그으면 두 대상의 공통점, 한 표시만 짚으면 그 문장 자체를 공통점으로 표시해요.";
    if (tool && REL_TOOL_TYPE[tool])
      return `'${TOOLS.find((t) => t.id === tool)?.label}' — 표시 두 개를(첫 표시 → 다음 표시) 이어 그으면 관계가 표시돼요. 먼저 밑줄·동그라미로 표시부터 하세요.`;
    return "밑줄=핵심문장, 동그라미=중심화제. 도구를 고르면 손으로 표시해요. (도구를 끄면 읽기·스크롤)";
  };

  useEffect(() => {
    try {
      if (!localStorage.getItem("reading_tutorial_v1")) setShowTutorial(true);
    } catch {}
  }, []);
  function closeTutorial() {
    setShowTutorial(false);
    try {
      localStorage.setItem("reading_tutorial_v1", "1");
    } catch {}
  }

  const busy = pending || coachPending || scoring;

  return (
    <div className="flex min-h-full flex-col">
      {busy && (
        <div
          className="pointer-events-none fixed z-[60]"
          style={{ left: ptrRef.current.x + 16, top: ptrRef.current.y + 16 }}
        >
          <span className="block h-5 w-5 animate-spin rounded-full border-2 border-amber-500/40 border-t-amber-600 bg-white/70 shadow" />
        </div>
      )}
      {phase && (
        <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-white dark:bg-gray-950">
          {(phase === "read_score" ||
            phase === "check_score" ||
            phase === "critique_score") && (
            <div className="mx-auto flex h-full w-full max-w-md flex-col justify-center gap-6 px-6 py-10">
              <div className="text-center">
                <h2 className="text-xl font-bold">
                  {phase === "read_score"
                    ? "표시 결과"
                    : phase === "check_score"
                      ? "독해 확인 결과"
                      : "관점 평가 결과"}
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {phase === "read_score"
                    ? "밑줄·동그라미로 핵심을 얼마나 잘 짚었는지 보여줘요."
                    : phase === "check_score"
                      ? "세부 내용·중심 내용·추론 문항에 얼마나 잘 답했는지 보여줘요."
                      : "한 관점으로 다른 관점을 얼마나 잘 비판했는지 보여줘요."}
                </p>
              </div>
              {scoring ? (
                <p className="text-center text-sm text-gray-400">채점 중이에요…</p>
              ) : scores ? (
                <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 p-6 dark:border-gray-800">
                  {[
                    { label: "세부 내용 파악", value: scores.detail, color: "bg-emerald-500" },
                    { label: "중심 내용 파악", value: scores.main, color: "bg-teal-500" },
                    { label: "사실적 독해", value: scores.fact, color: "bg-emerald-500" },
                    { label: "추론적 독해", value: scores.inference, color: "bg-sky-500" },
                    { label: "비판적 독해", value: scores.critique, color: "bg-rose-500" },
                  ]
                    .filter((b) => b.value != null)
                    .map((b) => (
                      <div key={b.label}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-700 dark:text-gray-200">
                            {b.label}
                          </span>
                          <span className="font-bold">{b.value}점</span>
                        </div>
                        <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                          <div
                            className={`h-full rounded-full ${b.color}`}
                            style={{ width: `${b.value ?? 0}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  {scores.comment && (
                    <p className="mt-1 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                      {scores.comment}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-center text-sm text-gray-400">
                  점수를 불러오지 못했어요. (AI 키 설정 확인)
                </p>
              )}
              <div className="flex justify-center gap-2">
                {phase === "read_score" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setScores(null);
                      setPhase("check");
                      askCheck();
                    }}
                    className="rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-800"
                  >
                    독해 확인 시작 →
                  </button>
                ) : phase === "check_score" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setScores(null);
                      setPhase("critique");
                      askCritique();
                    }}
                    className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    관점 평가 시작 →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPhase("done")}
                    className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-rose-700"
                  >
                    학습 완료 →
                  </button>
                )}
              </div>
            </div>
          )}
          {phase === "done" && (
            <div className="mx-auto flex h-full w-full max-w-md flex-col items-center justify-center gap-6 px-6 py-10 text-center">
              <span className="grid h-20 w-20 place-items-center rounded-full bg-emerald-100 text-4xl dark:bg-emerald-950">🎉</span>
              <div>
                <h2 className="text-2xl font-bold">학습을 모두 마쳤어요!</h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                  표시 · 독해 확인 · 관점 평가까지 모두 끝냈어요.
                  <br />오늘도 수고 많았어요!
                </p>
              </div>
              <div className="flex w-full flex-col gap-2">
                <Link href="/dashboard" className="rounded-xl bg-amber-700 px-5 py-3 text-sm font-medium text-white hover:bg-amber-800">
                  홈으로 돌아가기
                </Link>
                <form action={signout} className="w-full">
                  <button type="submit" className="w-full rounded-xl border border-gray-300 px-5 py-3 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                    종료하기
                  </button>
                </form>
              </div>
            </div>
          )}
          {(phase === "check" || phase === "critique") && (
          <div className={`mx-auto flex h-full w-full flex-col ${showBody ? "max-w-6xl" : "max-w-2xl"}`}>
            <header className="flex items-center justify-between gap-2 border-b border-gray-200 px-5 py-3 dark:border-gray-800">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span
                    className={
                      phase === "check"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-gray-400"
                    }
                  >
                    ① 독해 확인
                  </span>
                  <span className="text-gray-300">›</span>
                  <span
                    className={
                      phase === "critique"
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-gray-400"
                    }
                  >
                    ② 관점 평가
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {phase === "check"
                    ? "읽은 내용을 점검해요(세부·중심·추론)."
                    : "글의 관점을 평가해요."}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBody((v) => !v)}
                  className={`rounded-md border px-3 py-1.5 text-xs ${
                    showBody
                      ? "border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300"
                      : "border-gray-300 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  }`}
                >
                  {showBody ? "본문 숨기기" : "본문 보기"}
                </button>
                <button
                  type="button"
                  onClick={() => setPhase(null)}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  ← 읽기로
                </button>
              </div>
            </header>

            <div className="flex min-h-0 flex-1 flex-col md:flex-row">
              {showBody && (
                <div className="min-h-0 flex-1 overflow-y-auto border-b border-gray-200 px-5 py-4 md:border-b-0 md:border-r dark:border-gray-800">
                  <p className="mb-2 text-xs font-semibold text-gray-400">본문</p>
                  <div className="space-y-3 text-[15px] leading-relaxed text-gray-800 dark:text-gray-200">
                    {paragraphs.map((p) => (
                      <p key={p.id} className="whitespace-pre-wrap">
                        {p.text}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {messages.slice(convStart).length === 0 && !coachPending && (
                <p className="text-sm text-gray-400">
                  코치가 곧 질문을 띄울 거예요…
                </p>
              )}
              {messages.slice(convStart).slice(-12).map((m) => (
                <div
                  key={m.id}
                  className={m.role === "agent" ? "flex" : "flex flex-row-reverse"}
                >
                  <div
                    className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                      m.role === "agent"
                        ? "rounded-tl-sm bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100"
                        : "rounded-tr-sm bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
                    }`}
                  >
                    {(() => {
                      const mt =
                        m.role === "agent"
                          ? m.content.match(/(?:^|\n)\((\d+)\/(\d+)\)[ \t]*/)
                          : null;
                      if (!mt || mt.index == null) return m.content;
                      const cur = Number(mt[1]);
                      const total = Number(mt[2]);
                      const before = m.content.slice(0, mt.index).trim();
                      const body = m.content.slice(mt.index + mt[0].length).trim();
                      return (
                        <>
                          {before && (
                            <div className="mb-2 opacity-90">{before}</div>
                          )}
                          <div className="mb-1.5 flex items-center gap-2">
                            <span className="rounded-full bg-amber-600 px-2 py-0.5 text-[11px] font-bold leading-none text-white">
                              문항 {cur}/{total}
                            </span>
                            <span className="flex gap-1">
                              {Array.from({ length: total }).map((_, i) => (
                                <span
                                  key={i}
                                  className={
                                    "h-1.5 w-1.5 rounded-full " +
                                    (i + 1 === cur
                                      ? "bg-amber-600"
                                      : i + 1 < cur
                                        ? "bg-amber-400"
                                        : "bg-amber-200 dark:bg-amber-900")
                                  }
                                />
                              ))}
                            </span>
                          </div>
                          <div>{body}</div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              ))}
              {coachPending && (
                <p className="text-xs text-gray-400">생각 중이에요…</p>
              )}
            </div>

            <div className="border-t border-gray-200 p-3 dark:border-gray-800">
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
                  placeholder="내 답을 적어요"
                  className="w-full resize-none rounded-xl border border-gray-300 px-3 py-2 text-base dark:border-gray-700 dark:bg-gray-900"
                />
                <button
                  type="button"
                  onClick={() => sendCoach(false)}
                  disabled={coachPending || !draft.trim()}
                  className="rounded-xl bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
                >
                  보내기
                </button>
              </div>
              {coachNote && (
                <p className="mt-1 text-xs text-amber-600">{coachNote}</p>
              )}
              <div className="mt-2 flex justify-end">
                {phase === "check" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPhase("check_score");
                      fetchScore("check");
                    }}
                    disabled={coachPending}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    독해 확인 완료 → 결과
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setPhase("critique_score");
                      fetchScore("critique");
                    }}
                    className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
                  >
                    관점 평가 마치기
                  </button>
                )}
              </div>
            </div>
              </div>
            </div>
          </div>
          )}
        </div>
      )}
      {showTutorial && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeTutorial}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold">읽기 전에, 이렇게 해요 📖</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              정답을 먼저 알려주지 않아요. 스스로 표시하고 설명하면 코치가 곁에서 도와줘요.
            </p>
            <ul className="mt-4 flex flex-col gap-3">
              {(
                [
                  ["✍️", "손으로 표시", "밑줄은 핵심문장, 동그라미는 중심화제에 그어요."],
                  ["🔗", "관계 잇기", "표시를 화살표로 이어 인과·비교·대조 같은 관계를 나타내요."],
                  ["💬", "자기설명", "정답 확인 전에 내 말로 먼저 설명해요."],
                  ["🤖", "AI 읽기 코치", "막히면 정답 대신 질문과 힌트로 도와줘요."],
                ] as const
              ).map(([icon, title, desc]) => (
                <li key={title} className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-xl dark:bg-amber-950">
                    {icon}
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {title}
                    </span>{" "}
                    — {desc}
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={closeTutorial}
              className="mt-5 w-full rounded-xl bg-amber-700 px-4 py-2.5 font-medium text-white hover:bg-amber-800"
            >
              시작하기
            </button>
          </div>
        </div>
      )}
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/read"
            aria-label="목록으로"
            className="grid h-9 w-9 place-items-center rounded-md text-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            ‹
          </Link>
          <Link
            href="/dashboard"
            aria-label="홈으로"
            className="grid h-9 w-9 place-items-center rounded-md text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950"
          >
            <HomeIcon className="h-4 w-4" />
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
            onClick={() => setShowTutorial(true)}
            className="rounded-full border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            ❔ 튜토리얼
          </button>
          <button
            type="button"
            onClick={() => setShowTools((v) => !v)}
            className="rounded-full bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300"
          >
            ✨ AI 읽기 코치
          </button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 p-4 lg:flex-row">
        <section className="relative flex-1 rounded-2xl border border-white/60 bg-white p-5 shadow-xl shadow-blue-200/20 dark:border-white/10 dark:bg-gray-950 dark:shadow-black/30">
          {pending && (
            <div className="pointer-events-none absolute right-3 top-3 z-30 flex items-center gap-1.5 rounded-full bg-amber-600/90 px-3 py-1 text-xs font-medium text-white shadow-lg">
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
                {TOOLS.filter((t) => TOP_IDS.includes(t.id)).map((t) => {
                  const active = tool === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => selectTool(t.id)}
                      className={`flex min-w-[60px] flex-col items-center gap-1 rounded-lg border px-3 py-2 text-xs ${
                        active
                          ? "border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:hover:bg-gray-800"
                      }`}
                    >
                      <span className="text-base leading-none">{t.glyph}</span>
                      {t.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setShowRel((v) => !v)}
                  className={`flex min-w-[60px] flex-col items-center gap-1 rounded-lg border px-3 py-2 text-xs ${
                    showRel || (!!tool && REL_IDS.includes(tool))
                      ? "border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:hover:bg-gray-800"
                  }`}
                >
                  <span className="text-base leading-none">🔗</span>
                  관계
                </button>
              </div>
              {showRel && (
                <div className="mt-2 flex flex-wrap gap-2 border-t border-gray-200 pt-2 dark:border-gray-700">
                  {TOOLS.filter((t) => REL_IDS.includes(t.id)).map((t) => {
                    const active = tool === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => selectTool(t.id)}
                        className={`flex min-w-[56px] flex-col items-center gap-1 rounded-lg border px-3 py-2 text-xs ${
                          active
                            ? "border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:hover:bg-gray-800"
                        }`}
                      >
                        <span className="text-base leading-none">{t.glyph}</span>
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              )}
              {tool === "freehand" && (
                <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-gray-200 pt-2 dark:border-gray-700">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    펜 색
                  </span>
                  {PEN_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setPenColor(c)}
                      aria-label="펜 색 선택"
                      className={`h-7 w-7 rounded-full border-2 ${
                        penColor === c
                          ? "border-gray-800 dark:border-white"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={clearFreehand}
                    className="ml-auto rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    필기 전체 지우기
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowGuide((v) => !v)}
                className="mt-2 text-xs font-medium text-amber-700 hover:underline dark:text-amber-400"
              >
                {showGuide ? "▾ 도구 안내 닫기" : "❔ 이 도구들 뭐예요?"}
              </button>
              {showGuide && (
                <ul className="mt-2 flex flex-col gap-1 rounded-lg bg-white/70 p-3 text-xs leading-relaxed text-gray-600 dark:bg-gray-950/50 dark:text-gray-300">
                  <li>
                    <b>▁ 밑줄</b> — 핵심문장(중요한 문장·구절)에 긋기
                  </li>
                  <li>
                    <b>◯ 동그라미</b> — 중심화제(글의 중심이 되는 말)에 치기
                  </li>
                  <li>
                    <b>🔮 예측단서</b> — 1~2문단에서 다음을 짐작하게 하는 단서에 표시
                  </li>
                  <li>
                    <b>✎ 자유 필기</b> — 본문 위에 손으로 자유롭게 쓰면 그대로 남아요
                  </li>
                  <li>
                    <b>⇢ 과정</b> — 두 표시를 이어 관계 화살표
                  </li>
                  <li>
                    <b>c 원인 / e 결과</b> — 표시 하나를 탭해 역할 찍기
                  </li>
                  <li>
                    <b>P 문제 / S 해결</b> — 표시 하나를 탭해 역할 찍기
                  </li>
                  <li>
                    <b>Q 질문 / A 답</b> — 표시 하나를 탭해 역할 찍기
                  </li>
                  <li>
                    <b>= 공통점</b> — 두 표시를 잇거나, 한 표시만 짚어도 공통점 / <b>≠ 차이점</b> — 두 표시를 이어 견주기
                  </li>
                  <li>
                    <b>① 나열</b> — 여러 표시를 순서대로 탭해 번호 매기기
                  </li>
                  <li>
                    <b>⌫ 지우기</b> — 표시 위를 그어 지우기
                  </li>
                </ul>
              )}
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
              cursor:
                tool === "erase"
                  ? ERASER_CURSOR
                  : tool
                    ? PENCIL_CURSOR
                    : undefined,
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
            {eraser && (
              <div
                className="pointer-events-none absolute z-20 rounded-full border-2 border-rose-400/80 bg-rose-300/25"
                style={{
                  left: eraser.x - ERASER_R,
                  top: eraser.y - ERASER_R,
                  width: ERASER_R * 2,
                  height: ERASER_R * 2,
                }}
              />
            )}
            {fhStrokes.length > 0 && artW > 0 && (
              <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible">
                <g transform={`scale(${artW})`}>
                  {fhStrokes.map((f) => (
                    <path
                      key={f.id}
                      d={f.d}
                      fill="none"
                      stroke={f.color}
                      strokeWidth={2.5}
                      vectorEffect="non-scaling-stroke"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                </g>
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
                    annos={renderMarks.filter((a) => a.paragraph_id === p.id)}
                    badgesByMark={badgesByMark}
                  />
                </div>
              ))}
            </article>
          </div>
        </section>

        <aside className="rounded-2xl border border-white/60 bg-white p-5 shadow-xl shadow-blue-200/20 dark:border-white/10 dark:bg-gray-950 dark:shadow-black/30 lg:w-[340px] lg:shrink-0">
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
                    ? "bg-white text-amber-800 shadow-sm dark:bg-gray-950 dark:text-amber-300"
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
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-sm text-gray-400 hover:bg-gray-100 hover:text-red-500 disabled:opacity-50 dark:hover:bg-gray-800"
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
              {structureEdges.length > 0 && (
                <div className="mb-3 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900">
                  <p className="mb-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                    📐 문단 구조도
                  </p>
                  {structureSummary && (
                    <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50/70 px-2.5 py-2 dark:border-amber-900 dark:bg-amber-950/40">
                      <p className="text-[11px] leading-relaxed text-amber-900 dark:text-amber-200">
                        🔎 지금 <b>{structureSummary.shape}</b>
                        {structureSummary.domRt && (
                          <>
                            {" · 가장 많이 쓴 관계는 "}
                            <b>{REL_LABEL[structureSummary.domRt]}</b>
                          </>
                        )}
                      </p>
                      <p className="mt-0.5 text-[10px] text-amber-700/80 dark:text-amber-300/70">
                        이 구조가 글의 실제 흐름과 맞는지 스스로 설명해 볼까요?
                      </p>
                    </div>
                  )}
                  <div className="mb-2 flex flex-wrap items-center gap-1">
                    {paragraphs.map((p, i) => (
                      <span key={p.id} className="flex items-center gap-1">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[11px] shadow-sm ${
                            structureSummary?.hub === p.seq
                              ? "bg-amber-500 font-bold text-white"
                              : "bg-white text-gray-600 dark:bg-gray-950 dark:text-gray-300"
                          }`}
                        >
                          {p.seq}
                        </span>
                        {i < paragraphs.length - 1 && (
                          <span className="text-gray-300">›</span>
                        )}
                      </span>
                    ))}
                  </div>
                  <ul className="flex flex-col gap-1">
                    {structureEdges.map((e, i) => {
                      const c = REL_COLOR[e.rt];
                      const two =
                        e.rt === "compare_contrast" ||
                        e.rt === "similarity" ||
                        e.rt === "contrast";
                      return (
                        <li key={i} className="flex items-center gap-1.5 text-xs">
                          <span className="rounded bg-white px-1.5 py-0.5 font-medium shadow-sm dark:bg-gray-950">
                            {e.from}문단
                          </span>
                          <span className={`font-bold ${c.accent}`}>
                            {two ? "↔" : "→"}
                          </span>
                          <span className="rounded bg-white px-1.5 py-0.5 font-medium shadow-sm dark:bg-gray-950">
                            {e.to}문단
                          </span>
                          <span className={`rounded border px-1.5 py-0.5 text-[10px] ${c.box}`}>
                            {REL_LABEL[e.rt]}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
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
                            : rt === "cause_effect"
                              ? a.from_ref
                                ? "원인 (c)"
                                : "결과 (e)"
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
                            className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-md text-sm text-gray-400 hover:bg-gray-100 hover:text-red-500 disabled:opacity-50 dark:hover:bg-gray-800"
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
                          className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-md text-sm text-gray-400 hover:bg-gray-100 hover:text-red-500 disabled:opacity-50 dark:hover:bg-gray-800"
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

      <div className="sticky bottom-0 z-10 border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 p-4 md:flex-row md:items-end">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-100 text-lg dark:bg-amber-950">
              🤖
            </div>
            <div className="min-w-0">
              <div className="rounded-2xl rounded-tl-sm bg-amber-50 px-4 py-2.5 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
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
                  className="rounded-md px-2 py-1 text-xs text-amber-700 hover:bg-amber-50 disabled:opacity-50 dark:hover:bg-amber-950"
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
                {status !== "completed" && (
                  <>
                    <button
                      type="button"
                      onClick={() => askSelfExplain("predict")}
                      disabled={coachPending}
                      className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 dark:bg-indigo-950 dark:text-indigo-300"
                    >
                      🔮 예측
                    </button>
                    <button
                      type="button"
                      onClick={() => askSelfExplain("hidden")}
                      disabled={coachPending}
                      className="rounded-md bg-teal-50 px-2 py-1 text-xs font-medium text-teal-700 hover:bg-teal-100 disabled:opacity-50 dark:bg-teal-950 dark:text-teal-300"
                    >
                      🧩 숨은 뜻
                    </button>
                  </>
                )}
                {status === "completed" && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhase("check");
                      askCheck();
                    }}
                    disabled={coachPending}
                    className="rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-200 disabled:opacity-50 dark:bg-amber-950 dark:text-amber-300"
                  >
                    📝 마무리하기(독해 확인·관점 평가)
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="relative flex items-end gap-2">
            {seCue && (
              <div className="absolute -top-8 right-0 z-10 flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1 text-xs font-medium text-white shadow-lg">
                <span className="animate-bounce">✍️</span>
                여기에 네 생각을 적어 보내줘!
              </div>
            )}
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
              className={`w-full resize-none rounded-xl border px-3 py-2 text-base dark:bg-gray-900 md:w-72 ${seCue ? "border-indigo-400 ring-2 ring-indigo-300 dark:border-indigo-500" : "border-gray-300 dark:border-gray-700"}`}
            />
            <button
              type="button"
              onClick={() => sendCoach(false)}
              disabled={coachPending || !draft.trim()}
              className="rounded-xl bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
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
      discourse: boolean;
      predictCue: boolean;
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
        discourse: covering.some((a) => a.type === "discourse"),
        predictCue: covering.some((a) => a.type === "predict_cue"),
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
          r.discourse
            ? "rounded bg-yellow-200/70 px-0.5 dark:bg-yellow-500/30"
            : "",
          r.predictCue
            ? "underline decoration-dotted decoration-indigo-500 decoration-2 underline-offset-4"
            : "",
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

type ArrowTone = "blue" | "violet" | "sky" | "rose" | "teal";
function toneOf(rt: RelationType | null): ArrowTone {
  if (rt === "similarity") return "sky";
  if (rt === "contrast") return "rose";
  if (rt === "compare_contrast") return "violet";
  if (rt === "elaboration") return "teal";
  return "blue";
}
const TONE_HEX: Record<ArrowTone, string> = {
  blue: "#2563eb",
  violet: "#7c3aed",
  sky: "#0ea5e9",
  rose: "#e11d48",
  teal: "#0d9488",
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
        const dx = tx - fx;
        const dy = ty - fy;
        const len = Math.hypot(dx, dy) || 1;
        // 두 표시 윗부분을 완만한 호로 잇는다(항상 위로, 높이는 거리에 비례하되 과하지 않게)
        const topY = Math.min(fy, ty);
        const bow = Math.max(12, Math.min(34, len * 0.2));
        const cx = mx;
        const cy = topY - bow;
        const d = `M ${fx.toFixed(1)} ${(fy - 2).toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${tx.toFixed(1)} ${(ty - 2).toFixed(1)}`;
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

  const tones: ArrowTone[] = ["blue", "violet", "sky", "rose", "teal"];
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
