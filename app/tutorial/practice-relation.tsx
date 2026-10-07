"use client";

import Link from "next/link";
import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";

type Pt = { x: number; y: number };
type Mark = { id: number; start: number; end: number };
type Relation = { id: number; a: number; b: number };
type Geo = { id: number; x1: number; y1: number; x2: number; y2: number; mx: number; my: number };

const PARA =
  "식물의 지속적인 생장은 특정 부위에 존재하는 분열 조직에 의해 이루어진다. 식물의 생장과 관련된 주요 분열 조직에는 측생 분열 조직과 정단 분열 조직이 있다. 측생 분열 조직은 줄기나 뿌리의 측면에 위치하여 부피 생장을 유도하고, 정단 분열 조직은 줄기와 뿌리의 끝, 즉 정단에 위치하여 길이 생장을 담당한다. 이 두 조직은 식물이 다양한 구조를 갖추고 기능적으로 발달해 나가는 데 중요한 기반이 된다.";

// 비교 대상 영역(오프셋): 측생 설명 절 / 정단 설명 절 / 공통점 문장
const SG0 = PARA.indexOf("측생 분열 조직은 줄기나");
const SG1 = PARA.indexOf("유도하고") + 4;
const JD0 = PARA.indexOf("정단 분열 조직은 줄기와");
const JD1 = PARA.indexOf("담당한다") + 4;
const CM0 = PARA.indexOf("이 두 조직은");
const CM1 = PARA.length;

type Region = "sg" | "jd" | "cm" | null;
function regionOf(o: number): Region {
  if (o >= SG0 && o < SG1) return "sg";
  if (o >= JD0 && o < JD1) return "jd";
  if (o >= CM0) return "cm"; // 마지막 영역: 끝까지 포함
  return null;
}
const markRegion = (m: Mark): Region => regionOf(Math.floor((m.start + m.end) / 2));

function offsetInContainer(container: HTMLElement, node: Node, nodeOffset: number): number {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let len = 0;
  while (walker.nextNode()) {
    const t = walker.currentNode;
    if (t === node) return len + nodeOffset;
    len += t.textContent?.length ?? 0;
  }
  return len;
}
function caretOffset(x: number, y: number): { node: Node; offset: number } | null {
  const d = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
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
function offsetAtPoint(wrap: HTMLElement, x: number, y: number): number | null {
  const c = caretOffset(x, y);
  if (!c) return null;
  const el = c.node.nodeType === 3 ? (c.node.parentElement as HTMLElement | null) : (c.node as HTMLElement);
  const p = el?.closest("[data-para]") as HTMLElement | null;
  if (!p || !wrap.contains(p)) return null;
  return offsetInContainer(p, c.node, c.offset);
}
function densify(pts: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length; i++) {
    out.push(pts[i]);
    const b = pts[i + 1];
    if (b) {
      const a = pts[i];
      const steps = Math.min(8, Math.floor(Math.hypot(b.x - a.x, b.y - a.y) / 5));
      for (let s = 1; s < steps; s++)
        out.push({ x: a.x + ((b.x - a.x) * s) / steps, y: a.y + ((b.y - a.y) * s) / steps });
    }
  }
  return out;
}
function recognize(wrap: HTMLElement, pts: Pt[]): { start: number; end: number } | null {
  const offs: number[] = [];
  for (const p of densify(pts)) {
    for (const dy of [-4, -9, -14]) {
      const o = offsetAtPoint(wrap, p.x, p.y + dy);
      if (o != null) { offs.push(o); break; }
    }
  }
  if (offs.length < 2) return null;
  offs.sort((a, b) => a - b);
  const start = offs[0];
  const end = offs[offs.length - 1];
  return end > start ? { start, end } : null;
}
const overlap = (s1: number, e1: number, s2: number, e2: number) =>
  Math.max(0, Math.min(e1, e2) - Math.max(s1, s2));

// 획 끝 지점 근처의 표시(data-marks) id를 찾는다. (실제 앱과 동일 방식)
function markNearPoint(wrap: HTMLElement, x: number, y: number, maxDist = 44): number | null {
  const els = document.elementsFromPoint(x, y);
  for (const el of els) {
    const m = (el as HTMLElement).closest?.("[data-marks]") as HTMLElement | null;
    if (m && wrap.contains(m)) {
      const id = m.getAttribute("data-marks")?.split(" ")[0];
      if (id) return Number(id);
    }
  }
  let best: number | null = null;
  let bestD = maxDist;
  wrap.querySelectorAll<HTMLElement>("[data-marks]").forEach((el) => {
    const r = el.getBoundingClientRect();
    const dx = Math.max(r.left - x, 0, x - r.right);
    const dy = Math.max(r.top - y, 0, y - r.bottom);
    const d = Math.hypot(dx, dy);
    if (d < bestD) { bestD = d; best = Number(el.getAttribute("data-marks")?.split(" ")[0]); }
  });
  return best;
}
// 특정 표시 id가 그려진 요소들의 합집합 중심(컨테이너 기준)
function centerOfMark(wrap: HTMLElement, id: number): Pt | null {
  const wr = wrap.getBoundingClientRect();
  let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
  wrap.querySelectorAll<HTMLElement>("[data-marks]").forEach((el) => {
    if (!el.getAttribute("data-marks")?.split(" ").includes(String(id))) return;
    const rc = el.getBoundingClientRect();
    l = Math.min(l, rc.left); t = Math.min(t, rc.top); r = Math.max(r, rc.right); b = Math.max(b, rc.bottom);
  });
  if (l === Infinity) return null;
  return { x: (l + r) / 2 - wr.left, y: (t + b) / 2 - wr.top };
}

type Tool = "underline" | "contrast" | "similar" | "erase";
type Celebrate = { title: string; sub: string; final?: boolean } | null;

export function PracticeRelation() {
  const [tool, setTool] = useState<Tool>("underline");
  const [marks, setMarks] = useState<Mark[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [commonMarkId, setCommonMarkId] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState<Celebrate>(null);
  const [changeKey, setChangeKey] = useState(0);
  const [geo, setGeo] = useState<Geo[]>([]);
  const [commonPt, setCommonPt] = useState<Pt | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);
  const stroke = useRef<{ active: boolean; pts: Pt[] }>({ active: false, pts: [] });
  const [path, setPath] = useState("");

  const contrastDone = relations.length > 0;
  const commonDone = commonMarkId != null;

  function say(next: string | null) {
    setMsg(next);
    setChangeKey((v) => v + 1);
  }
  function reset() {
    setMarks([]); setRelations([]); setCommonMarkId(null);
    setCelebrate(null); setTool("underline"); say(null);
  }

  function measure() {
    const wrap = ref.current;
    if (!wrap) return;
    const g: Geo[] = [];
    for (const rel of relations) {
      const A = centerOfMark(wrap, rel.a);
      const B = centerOfMark(wrap, rel.b);
      if (A && B) g.push({ id: rel.id, x1: A.x, y1: A.y, x2: B.x, y2: B.y, mx: (A.x + B.x) / 2, my: (A.y + B.y) / 2 });
    }
    setGeo(g);
    setCommonPt(commonMarkId != null ? centerOfMark(wrap, commonMarkId) : null);
  }
  useLayoutEffect(() => { measure(); /* eslint-disable-next-line */ }, [relations, marks, commonMarkId]);
  useEffect(() => {
    const h = () => measure();
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
    /* eslint-disable-next-line */
  }, [relations, marks, commonMarkId]);

  function finishContrast() {
    if (commonDone) setCelebrate({ title: "완벽해요!", sub: "두 조직의 다른 점과 공통점을 모두 연결했어요. 비교·대조 연습을 끝냈어요!", final: true });
    else setCelebrate({ title: "잘했어요!", sub: "밑줄 친 두 부분을 ↔로 연결했어요. 이제 두 조직의 ‘공통점’도 ‘= 공통점’ 도구로 문장을 눌러 표시해 볼까요?" });
  }
  function finishCommon() {
    if (contrastDone) setCelebrate({ title: "완벽해요!", sub: "두 조직의 다른 점과 공통점을 모두 연결했어요. 비교·대조 연습을 끝냈어요!", final: true });
    else setCelebrate({ title: "잘했어요!", sub: "두 조직이 함께 하는 일에 = 로 표시했어요. 이제 서로 ‘다른 점’도 밑줄 긋고 ‘↔ 차이점’으로 이어 볼까요?" });
  }

  function down(e: React.PointerEvent) {
    ref.current?.setPointerCapture?.(e.pointerId);
    stroke.current = { active: true, pts: [{ x: e.clientX, y: e.clientY }] };
    e.preventDefault();
  }
  function move(e: React.PointerEvent) {
    if (!stroke.current.active) return;
    stroke.current.pts.push({ x: e.clientX, y: e.clientY });
    const wr = ref.current?.getBoundingClientRect();
    if (!wr) return;
    setPath(stroke.current.pts.map((p, i) => (i ? "L" : "M") + " " + (p.x - wr.left).toFixed(1) + " " + (p.y - wr.top).toFixed(1)).join(" "));
  }
  function up() {
    if (!stroke.current.active) return;
    const pts = stroke.current.pts;
    stroke.current = { active: false, pts: [] };
    setPath("");
    const wrap = ref.current;
    if (!wrap || !pts.length) return;
    const first = pts[0], last = pts[pts.length - 1];
    const nearOffset = (p: Pt): number | null => {
      for (const dy of [0, -8, 8, -14]) { const o = offsetAtPoint(wrap, p.x, p.y + dy); if (o != null) return o; }
      return null;
    };

    // 공통점: 실제 앱처럼 문장을 '누르기(클릭)'만 해도 표시된다.
    if (tool === "similar") {
      const o = nearOffset(first) ?? nearOffset(last);
      if (o == null) { say("공통점이 담긴 마지막 문장을 눌러 보세요."); return; }
      if (regionOf(o) === "cm") {
        let id = marks.find((m) => markRegion(m) === "cm")?.id ?? null;
        if (id == null) { const m: Mark = { id: ++idRef.current, start: CM0, end: CM1 }; setMarks((prev) => [...prev, m]); id = m.id; }
        setCommonMarkId(id);
        finishCommon();
      } else {
        say("공통점은 두 조직이 ‘함께’ 하는 일이에요. 마지막 문장을 눌러 보세요.");
      }
      return;
    }

    if (pts.length < 2) return; // 밑줄·연결·지우개는 선을 그어야 함

    if (tool === "underline") {
      const span = recognize(wrap, pts);
      if (!span) { say("글자 위를 지나가도록 밑줄을 그어 주세요."); return; }
      const m: Mark = { id: ++idRef.current, start: span.start, end: span.end };
      const next = [...marks, m];
      setMarks(next);
      const hasSg = next.some((x) => markRegion(x) === "sg");
      const hasJd = next.some((x) => markRegion(x) === "jd");
      if (hasSg && hasJd && !contrastDone) say("좋아요! 이제 ‘↔ 차이점’ 도구로 밑줄 친 두 부분(측생 쪽 ↔ 정단 쪽)을 이어 보세요.");
      else if (markRegion(m) === "cm" && !commonDone) say("좋아요! 공통점은 ‘= 공통점’ 도구로 그 문장을 눌러 표시해요.");
      else say("비교할 부분에 밑줄을 그어요. 두 조직의 다른 점(위치·하는 일)을 찾아 밑줄!");
      return;
    }

    if (tool === "erase") {
      const eoffs: number[] = [];
      for (const p of densify(pts)) for (const dy of [0, -8, -14]) { const o = offsetAtPoint(wrap, p.x, p.y + dy); if (o != null) { eoffs.push(o); break; } }
      if (!eoffs.length) { say("지울 밑줄 위를 그어 주세요."); return; }
      eoffs.sort((a, b) => a - b);
      const es = eoffs[0], ee = eoffs[eoffs.length - 1];
      const removed = marks.filter((mm) => overlap(mm.start, mm.end, es, ee) > 0).map((mm) => mm.id);
      if (!removed.length) { say("지울 밑줄 위를 그어 주세요."); return; }
      setMarks((prev) => prev.filter((mm) => !removed.includes(mm.id)));
      setRelations((prev) => prev.filter((r) => !removed.includes(r.a) && !removed.includes(r.b)));
      if (commonMarkId != null && removed.includes(commonMarkId)) setCommonMarkId(null);
      say("지웠어요. 다시 표시해 볼까요?");
      return;
    }

    // contrast
    const a = markNearPoint(wrap, first.x, first.y);
    const b = markNearPoint(wrap, last.x, last.y);
    if (a == null || b == null) { say("먼저 비교할 두 곳에 밑줄을 긋고, 그 두 밑줄을 서로 이어 주세요."); return; }
    if (a === b) { say("서로 다른 두 밑줄을 이어야 해요."); return; }
    const ma = marks.find((m) => m.id === a)!, mb = marks.find((m) => m.id === b)!;
    const rs = new Set([markRegion(ma), markRegion(mb)]);
    if (rs.has("sg") && rs.has("jd")) {
      if (relations.some((r) => (r.a === a && r.b === b) || (r.a === b && r.b === a))) { say("이미 이은 부분이에요. 다른 점을 더 이어 볼까요?"); return; }
      setRelations((prev) => [...prev, { id: ++idRef.current, a, b }]);
      finishContrast();
    } else if (rs.has("cm")) {
      say("공통점은 ‘= 공통점’ 도구로 표시해요. 지금은 측생 쪽과 정단 쪽의 ‘다른 점’을 이어요.");
    } else {
      say("측생 쪽 밑줄과 정단 쪽 밑줄을 서로 이어야 해요. (같은 쪽끼리는 안 돼요.)");
    }
  }

  const relSet = new Set<number>();
  relations.forEach((r) => { relSet.add(r.a); relSet.add(r.b); });
  const cutSet = new Set<number>([0, PARA.length, SG0, SG1, JD0, JD1, CM0, CM1]);
  marks.forEach((m) => { cutSet.add(Math.max(0, m.start)); cutSet.add(Math.min(PARA.length, m.end)); });
  const cuts = [...cutSet].filter((c) => c >= 0 && c <= PARA.length).sort((a, b) => a - b);
  const segs: ReactNode[] = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const s = cuts[i], e = cuts[i + 1];
    if (e <= s) continue;
    const r = regionOf(s);
    const bg = r === "sg" ? "bg-sky-50 dark:bg-sky-950/40" : r === "jd" ? "bg-amber-50 dark:bg-amber-950/40" : r === "cm" ? "bg-emerald-50 dark:bg-emerald-950/40" : "";
    const cover = marks.filter((m) => m.start <= s && m.end >= e);
    const ids = cover.map((m) => m.id);
    const isCommon = commonMarkId != null && ids.includes(commonMarkId);
    const isRel = ids.some((id) => relSet.has(id));
    const ul = cover.length
      ? isCommon ? "underline decoration-emerald-500 decoration-2 underline-offset-4"
      : isRel ? "underline decoration-rose-500 decoration-2 underline-offset-4"
      : "underline decoration-blue-500 decoration-2 underline-offset-4"
      : "";
    segs.push(
      <span key={i} data-marks={ids.length ? ids.join(" ") : undefined} className={[bg, ul, "rounded"].filter(Boolean).join(" ") || undefined}>
        {PARA.slice(s, e)}
      </span>,
    );
  }

  const defaultLine: ReactNode =
    tool === "underline" ? (<span>① 비교할 부분에 <b>밑줄</b>을 그어요. 두 조직의 다른 점(위치·하는 일)을 찾아 밑줄!</span>)
    : tool === "contrast" ? (<span>② 밑줄 친 <b>측생 쪽</b>과 <b>정단 쪽</b>을 선으로 이어 <b>↔ 차이점</b>으로 연결해요.</span>)
    : tool === "similar" ? (<span>③ 두 조직의 <b>공통점</b>이 담긴 <b>마지막 문장을 눌러</b> = 로 표시해요.</span>)
    : (<span>잘못 친 밑줄 위에 선을 그으면 지워져요.</span>);
  const coachLine = msg ? <span>{msg}</span> : defaultLine;
  const tcolor: Record<Tool, string> = { underline: "#3b82f6", contrast: "#f43f5e", similar: "#10b981", erase: "#9ca3af" };

  const toolBtn = (t: Tool, label: string, icon: string) => (
    <button type="button" onClick={() => setTool(t)} className={"flex min-w-[88px] flex-col items-center gap-0.5 rounded-lg border px-3 py-2 text-xs " + (tool === t ? "border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : "border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-950")}>
      <span className="text-base leading-none">{icon}</span>{label}
    </button>
  );

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-5 py-10">
      <header>
        <p className="inline-flex w-fit items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          관계 연결 · 2/3
        </p>
        <h1 className="mt-2 text-2xl font-bold text-gray-800 dark:text-gray-100">
          비교·대조 — 다른 점과 같은 점
        </h1>
      </header>

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">진행</span>
        <span className={"rounded-full px-2 py-0.5 text-xs " + (contrastDone ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" : "bg-gray-100 text-gray-500 dark:bg-gray-800")}>
          ↔ 차이점 {contrastDone ? "✓" : ""}
        </span>
        <span className={"rounded-full px-2 py-0.5 text-xs " + (commonDone ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-gray-100 text-gray-500 dark:bg-gray-800")}>
          = 공통점 {commonDone ? "✓" : ""}
        </span>
      </div>

      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-600 text-white shadow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
            <path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2z" />
            <path d="M9 10h6M9 13h3" />
          </svg>
        </span>
        <div key={changeKey} className="coach-pop relative rounded-2xl rounded-tl-sm border border-amber-200 bg-white px-4 py-3 text-sm leading-relaxed text-gray-800 shadow-sm dark:border-amber-900 dark:bg-gray-900 dark:text-gray-100">
          {coachLine}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {toolBtn("underline", "밑줄", "▁")}
        {toolBtn("contrast", "차이점(↔)", "↔")}
        {toolBtn("similar", "공통점(=)", "=")}
        {toolBtn("erase", "지우개", "⌫")}
        <button type="button" onClick={reset} className="ml-auto rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
          다시 하기
        </button>
      </div>

      <div
        ref={ref}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        style={{ touchAction: "none", userSelect: "none", WebkitUserSelect: "none", cursor: "crosshair" }}
        className="relative rounded-2xl border border-gray-200 bg-white p-6 text-lg leading-loose text-gray-800 shadow-sm dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
      >
        <p data-para className="whitespace-pre-wrap">{segs}</p>
        <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible">
          {geo.map((g) => (
            <g key={g.id}>
              <path d={"M " + g.x1 + " " + g.y1 + " Q " + g.mx + " " + (g.my - 34) + " " + g.x2 + " " + g.y2} fill="none" stroke="#f43f5e" strokeWidth={2.5} strokeOpacity={0.85} strokeLinecap="round" />
              <circle cx={g.mx} cy={g.my - 17} r={11} fill="#fff" stroke="#f43f5e" strokeWidth={1.5} />
              <text x={g.mx} y={g.my - 12} textAnchor="middle" fontSize="14" fontWeight="700" fill="#e11d48">↔</text>
            </g>
          ))}
          {commonPt && (
            <g>
              <circle cx={commonPt.x} cy={commonPt.y - 20} r={11} fill="#fff" stroke="#10b981" strokeWidth={1.5} />
              <text x={commonPt.x} y={commonPt.y - 15} textAnchor="middle" fontSize="15" fontWeight="700" fill="#059669">=</text>
            </g>
          )}
          {path && <path d={path} fill="none" stroke={tcolor[tool]} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.6} />}
        </svg>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/tutorial" className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
          &larr; 1단계(표시)
        </Link>
        <Link href="/dashboard" className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
          나중에 하기
        </Link>
      </div>

      {celebrate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="coach-pop flex w-full max-w-xs flex-col items-center gap-3 rounded-3xl bg-white p-7 text-center shadow-2xl dark:bg-gray-900">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-3xl font-bold text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
              ✓
            </span>
            <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{celebrate.title}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{celebrate.sub}</p>
            {celebrate.final ? (
              <div className="mt-2 flex w-full flex-col gap-2">
                <Link href="/tutorial/3" className="rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-800">
                  다음 연습 · 예측단서 &rarr;
                </Link>
                <Link href="/read" className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                  실제로 읽어보기 &rarr;
                </Link>
              </div>
            ) : (
              <button type="button" onClick={() => setCelebrate(null)} className="mt-2 w-full rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-800">
                계속하기
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
