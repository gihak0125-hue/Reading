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
  { id: "predictcue", label: "예측단서", glyph: "🔮" },
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
    for (const c of clusters) if (c.length > chosen.length) chosen = c;
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
  }
  function handleReopen() {
    startTransition(async () => {
      await reopenSession(sessionId);
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
      return "'동그라미' — 핵심어(중요한 낱말·개념)에 손으로 그으면 표시돼요.";
    if (tool === "predictcue")
      return "'예측단서' — 1~2문단에서 다음 내용을 짐작하게 하는 단서(담화표지·구조 등)에 표시하면 코치가 예측을 물어봐요.";
    if (tool === "listing")
      return "'나열' — 항목(밑줄·동그라미)을 순서대로 탭하면 1·2·3 번호가 붙어요.";
    if (tool === "erase") return "'지우기' — 표시 위를 그으면 지워져요.";
    if (tool && ROLE_TOOL[tool])
      return `'${TOOLS.find((t) => t.id === tool)?.label}' — 해당하는 표시(밑줄·동그라미) 하나를 탭하면 역할이 찍혀요.`;
    if (tool && REL_TOOL_TYPE[tool])
      return `'${TOOLS.find((t) => t.id === tool)?.label}' — 표시 두 개를(첫 표시 → 다음 표시) 이어 그으면 관계가 표시돼요. 먼저 밑줄·동그라미로 표시부터 하세요.`;
    return "밑줄=핵심문장, 동그라미=핵심어. 도구를 고르면 손으로 표시해요. (도구를 끄면 읽기·스크롤)";
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
              <button
                type="button"
                onClick={() => setShowGuide((v) => !v)}
                className="mt-2 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                {showGuide ? "▾ 도구 안내 닫기" : "❔ 이 도구들 뭐예요?"}
              </button>
              {showGuide && (
                <ul className="mt-2 flex flex-col gap-1 rounded-lg bg-white/70 p-3 text-xs leading-relaxed text-gray-600 dark:bg-gray-950/50 dark:text-gray-300">
                  <li>
                    <b>▁ 밑줄</b> — 핵심문장(중요한 문장·구절)에 긋기
                  </li>
                  <li>
                    <b>◯ 동그라미</b> — 핵심어(중요한 낱말·개념)에 치기
                  </li>
                  <li>
                    <b>🔮 예측단서</b> — 1~2문단에서 다음을 짐작하게 하는 단서에 표시
                  </li>
                  <li>
                    <b>→ 원인·결과 / ⇢ 과정</b> — 두 표시를 이어 관계 화살표
                  </li>
                  <li>
                    <b>P 문제 / S 해결</b> — 표시 하나를 탭해 역할 찍기
                  </li>
                  <li>
                    <b>Q 질문 / A 답</b> — 표시 하나를 탭해 역할 찍기
                  </li>
                  <li>
                    <b>= 공통점 / ≠ 차이점</b> — 두 표시를 이어 견주기
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
                    annos={renderMarks.filter((a) => a.paragraph_id === p.id)}
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
              {structureEdges.length > 0 && (
                <div className="mb-3 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900">
                  <p className="mb-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                    📐 문단 구조도
                  </p>
                  <div className="mb-2 flex flex-wrap items-center gap-1">
                    {paragraphs.map((p, i) => (
                      <span key={p.id} className="flex items-center gap-1">
                        <span className="rounded bg-white px-1.5 py-0.5 text-[11px] text-gray-600 shadow-sm dark:bg-gray-950 dark:text-gray-300">
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
              {status === "completed" && (
                <div className="mt-1 flex items-start gap-2 rounded-2xl rounded-tl-sm border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
                  <span className="mt-0.5 inline-block h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-500" />
                  <span>
                    🎉 읽기를 마쳤어요! 이제 아래 <b>📝 독해 확인</b>을 먼저
                    누르고, 이어서 <b>🔍 관점 평가</b>를 눌러 마무리해요. 👇
                  </span>
                </div>
              )}
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
                    onClick={askCheck}
                    disabled={coachPending}
                    className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 dark:bg-emerald-950 dark:text-emerald-300"
                  >
                    📝 독해 확인
                  </button>
                )}
                {status === "completed" && (
                  <button
                    type="button"
                    onClick={askCritique}
                    disabled={coachPending}
                    className="rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50 dark:bg-rose-950 dark:text-rose-300"
                  >
                    🔍 관점 평가(비판적 독해)
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
              className={`w-full resize-none rounded-xl border px-3 py-2 text-sm dark:bg-gray-900 md:w-72 ${seCue ? "border-indigo-400 ring-2 ring-indigo-300 dark:border-indigo-500" : "border-gray-300 dark:border-gray-700"}`}
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
