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
  if (o >= CM0 && o < CM1) return "cm";
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
    if (commonDone) setCelebrate({ title: "완벽해요! 🎉", sub: "두 조직의 다른 점과 공통점을 모두 연결했어요. 비교·대조 연습을 끝냈어요!", final: true });
    else setCelebrate({ title: "차이점을 이었어요! 👏", sub: "밑줄 친 두 부분을 ↔로 연결했어요. 이제 두 조직의 '공통점'도 밑줄 긋고 '= 공통점'으로 표시해 볼까요?" });
  }
  function finishCommon() {
    if (contrastDone) setCelebrate({ title: "완벽해요! 🎉", sub: "두 조직의 다른 점과 공통점을 모두 연결했어요. 비교·대조 연습을 끝냈어요!", final: true });
    else setCelebrate({ title: "공통점을 찾았어요! 👏", sub: "두 조직이 함께 하는 일에 = 로 표시했어요. 이제 서로 '다른 점'도 밑줄 긋고 '↔ 차이점'으로 이어 볼까요?" });
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
    if (!wrap || pts.length < 2) return;
    const first = pts[0], last = pts[pts.length - 1];

    if (tool === "underline") {
      const span = recognize(wrap, pts);
      if (!span) { say("글자 위를 지나가도록 밑줄을 그어 주세요."); return; }
      const m: Mark = { id: ++idRef.current, start: span.start, end: span.end };
      const next = [...marks, m];
      setMarks(next);
      const hasSg = next.some((x) => markRegion(x) === "sg");
      const hasJd = next.some((x) => markRegion(x) === "jd");
      if (hasSg && hasJd && !contrastDone) say("좋아요! 이제 '↔ 차이점' 도구로 밑줄 친 두 부분(측생 쪽 ↔ 정단 쪽)을 이어 보세요.");
      else if (markRegion(m) === "cm" && !commonDone) say("좋아요! 이제 '= 공통점' 도구로 그 밑줄 위에 표시해요.");
      else say("비교할 부분에 밑줄을 그어요. 두 조직의 다른 점(위치·하는 일)과 공통점을 찾아 밑줄!");
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

    if (tool === "contrast") {
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
        say("공통점은 '= 공통점' 도구로 표시해요. 지금은 측생 쪽과 정단 쪽의 '다른 점'을 이어요.");
      } else {
        say("측생 쪽 밑줄과 정단 쪽 밑줄을 서로 이어야 해요. (같은 쪽끼리는 안 돼요.)");
      }
      return;
    }

    // similar
    const m = markNearPoint(wrap, first.x, first.y) ?? markNearPoint(wrap, last.x, last.y);
    if (m == null) { say("먼저 공통점(마지막 문장)에 밑줄을 긋고, 그 위에 = 로 표시해요."); return; }
    if (markRegion(marks.find((x) => x.id === m)!) === "cm") {
      setCommonMarkId(m);
      finishCommon();
    } else {
      say("공통점은 두 조직이 '함께' 하는 일이에요. 마지막 문장에 밑줄을 긋고 표시해요.");
    }
  }

  // 세그먼트: 영역 틴트 + 밑줄 + data-marks(연결 대상 인식용)
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
    const bg = r === "sg" ? "bg-sky-50" : r === "jd" ? "bg-amber-50" : r === "cm" ? "bg-emerald-50" : "";
    const cover = marks.filter((m) => m.start <= s && m.end >= e);
    const ids = cover.map((m) => m.id);
    const isCommon = commonMarkId != null && ids.includes(commonMarkId);
    const isRel = ids.some((id) => relSet.has(id));
    const ul = cover.length
      ? isCommon
        ? "underline decoration-emerald-500 decoration-2 underline-offset-4"
        : isRel
        ? "underline decoration-rose-500 decoration-2 underline-offset-4"
        : "underline decoration-blue-500 decoration-2 underline-offset-4"
      : "";
    segs.push(
      <span key={i} data-marks={ids.length ? ids.join(" ") : undefined} className={[bg, ul, "rounded"].filter(Boolean).join(" ") || undefined}>
        {PARA.slice(s, e)}
      </span>,
    );
  }

  const defaultLine =
    tool === "underline" ? "먼저 비교할 부분에 밑줄을 그어요. 두 조직의 다른 점(위치·하는 일)과 공통점을 찾아 밑줄!"
    : tool === "contrast" ? "밑줄 친 측생 쪽 부분과 정단 쪽 부분을 선으로 이어 ↔ 차이점으로 연결해요."
    : tool === "similar" ? "공통점(마지막 문장)에 밑줄을 긋고, 그 위에 선을 그어 = 로 표시해요."
    : "잘못 친 밑줄 위에 선을 그으면 지워져요.";
  const coachLine = msg ?? defaultLine;
  const tcolor: Record<Tool, string> = { underline: "#3b82f6", contrast: "#f43f5e", similar: "#10b981", erase: "#9ca3af" };

  const toolBtn = (t: Tool, label: string, icon: string, active: string) => (
    <button type="button" onClick={() => setTool(t)} className={"flex flex-col items-center gap-0.5 rounded-lg border px-3 py-2 text-xs " + (tool === t ? active : "border-gray-200 bg-white text-gray-600")}>
      <span className="text-base leading-none">{icon}</span>{label}
    </button>
  );

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">관계 연결 · 2/3</h1>
        <div className="flex gap-2 text-xs">
          <span className={"rounded-full px-2 py-1 " + (contrastDone ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-500")}>↔ 차이점</span>
          <span className={"rounded-full px-2 py-1 " + (commonDone ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>= 공통점</span>
        </div>
      </header>

      <div className="flex items-start gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        <div key={changeKey} className="coach-pop rounded-2xl rounded-tl-sm bg-amber-50 px-4 py-2.5 text-sm leading-relaxed text-slate-800 ring-1 ring-amber-100 dark:bg-amber-950 dark:text-amber-100 dark:ring-amber-900">
          {coachLine}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {toolBtn("underline", "밑줄", "▁", "border-blue-500 bg-blue-50 text-blue-700")}
        {toolBtn("contrast", "차이점(↔)", "↔", "border-rose-500 bg-rose-50 text-rose-700")}
        {toolBtn("similar", "공통점(=)", "=", "border-emerald-500 bg-emerald-50 text-emerald-700")}
        {toolBtn("erase", "지우개", "⌫", "border-gray-400 bg-gray-100 text-gray-700")}
        <button type="button" onClick={reset} className="ml-auto rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50">다시 하기</button>
      </div>

      <div
        ref={ref}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        style={{ touchAction: "none", userSelect: "none", WebkitUserSelect: "none", cursor: "crosshair" }}
        className="relative rounded-2xl border border-gray-200 bg-white p-6 text-[17px] leading-[2.3] text-gray-800 shadow-sm"
      >
        <p data-para className="whitespace-pre-wrap">{segs}</p>
        <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible">
          {geo.map((g) => (
            <g key={g.id}>
              <path d={`M ${g.x1} ${g.y1} Q ${g.mx} ${g.my - 34} ${g.x2} ${g.y2}`} fill="none" stroke="#f43f5e" strokeWidth={2.5} strokeOpacity={0.85} strokeLinecap="round" />
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

      <div className="mt-auto flex justify-between pt-2 text-sm">
        <Link href="/tutorial" className="text-slate-400 hover:text-slate-600">&larr; 1단계(표시)</Link>
        <Link href="/read" className="text-slate-400 hover:text-slate-600">실제로 읽어보기 &rarr;</Link>
      </div>

      {celebrate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6" onClick={() => setCelebrate(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-3xl">✓</div>
            <h2 className="mb-1 text-xl font-bold text-slate-800">{celebrate.title}</h2>
            <p className="mb-5 text-sm leading-relaxed text-slate-600">{celebrate.sub}</p>
            {celebrate.final ? (
              <div className="flex flex-col gap-2">
                <Link href="/read" className="rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white">실제로 읽어보기</Link>
                <button type="button" onClick={reset} className="rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-600">다시 연습하기</button>
              </div>
            ) : (
              <button type="button" onClick={() => setCelebrate(null)} className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white">계속하기</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
