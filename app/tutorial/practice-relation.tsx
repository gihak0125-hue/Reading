"use client";

import Link from "next/link";
import { ReactNode, useRef, useState } from "react";

type Pt = { x: number; y: number };
type Conn = { id: number; type: "contrast" | "similar"; path: string; mid: Pt };

const PARA =
  "식물의 지속적인 생장은 특정 부위에 존재하는 분열 조직에 의해 이루어진다. 식물의 생장과 관련된 주요 분열 조직에는 측생 분열 조직과 정단 분열 조직이 있다. 측생 분열 조직은 줄기나 뿌리의 측면에 위치하여 부피 생장을 유도하고, 정단 분열 조직은 줄기와 뿌리의 끝, 즉 정단에 위치하여 길이 생장을 담당한다. 이 두 조직은 식물이 다양한 구조를 갖추고 기능적으로 발달해 나가는 데 중요한 기반이 된다.";

// 비교 대상 영역(오프셋). 측생 설명 절 / 정단 설명 절 / 공통점 문장.
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
// 획의 시작/끝 지점이 어느 영역에서 출발해 어느 영역으로 갔는지
function endRegions(wrap: HTMLElement, pts: Pt[]): { a: Region; b: Region } {
  const dense = densify(pts);
  const regionAt = (p: Pt): Region => {
    for (const dy of [0, -8, 8, -14]) {
      const o = offsetAtPoint(wrap, p.x, p.y + dy);
      if (o != null) return regionOf(o);
    }
    return null;
  };
  let a: Region = null;
  for (let i = 0; i < dense.length; i++) {
    const r = regionAt(dense[i]);
    if (r) { a = r; break; }
  }
  let b: Region = null;
  for (let i = dense.length - 1; i >= 0; i--) {
    const r = regionAt(dense[i]);
    if (r) { b = r; break; }
  }
  return { a, b };
}

type Celebrate = { title: string; sub: string; final?: boolean } | null;

export function PracticeRelation() {
  const [tool, setTool] = useState<"contrast" | "similar">("contrast");
  const [conns, setConns] = useState<Conn[]>([]);
  const [contrastDone, setContrastDone] = useState(false);
  const [commonDone, setCommonDone] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState<Celebrate>(null);
  const [changeKey, setChangeKey] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);
  const stroke = useRef<{ active: boolean; pts: Pt[] }>({ active: false, pts: [] });
  const [path, setPath] = useState("");

  function say(next: string | null) {
    setMsg(next);
    setChangeKey((v) => v + 1);
  }
  function reset() {
    setConns([]);
    setContrastDone(false);
    setCommonDone(false);
    setCelebrate(null);
    setTool("contrast");
    say(null);
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
    setPath(
      stroke.current.pts
        .map((p, i) => (i ? "L" : "M") + " " + (p.x - wr.left).toFixed(1) + " " + (p.y - wr.top).toFixed(1))
        .join(" "),
    );
  }
  function up() {
    if (!stroke.current.active) return;
    const pts = stroke.current.pts;
    stroke.current = { active: false, pts: [] };
    const drawnPath = path;
    setPath("");
    const wrap = ref.current;
    if (!wrap || pts.length < 2) return;
    const wr = wrap.getBoundingClientRect();
    const first = pts[0];
    const last = pts[pts.length - 1];
    const mid: Pt = { x: (first.x + last.x) / 2 - wr.left, y: (first.y + last.y) / 2 - wr.top - 10 };
    const { a, b } = endRegions(wrap, pts);
    const set = new Set([a, b].filter(Boolean));

    if (tool === "contrast") {
      if (set.has("sg") && set.has("jd")) {
        const c: Conn = { id: ++idRef.current, type: "contrast", path: drawnPath, mid };
        setConns((prev) => [...prev, c]);
        if (!contrastDone) {
          setContrastDone(true);
          setTool("similar");
          say(null);
          setCelebrate({
            title: "차이점을 찾았어요! 👏",
            sub: "측생 분열 조직과 정단 분열 조직을 ↔로 이었어요. 둘은 위치(측면·끝)도, 하는 일(부피·길이 생장)도 서로 달라요. 이제 두 조직의 '공통점'을 찾아볼까요?",
          });
        } else {
          say("좋아요! 다른 점을 하나 더 이었어요.");
        }
      } else if (set.has("cm")) {
        say("지금은 '다른 점'을 이을 차례예요. 공통점은 아래 '= 공통점' 도구로 표시해요.");
      } else if (set.size === 1) {
        say("두 조직을 서로 이어야 해요. 측생 쪽 설명에서 정단 쪽 설명으로 그어 보세요.");
      } else {
        say("측생 분열 조직 설명과 정단 분열 조직 설명을 서로 이어 보세요. (낱말끼리 이어도, 문장끼리 이어도 좋아요.)");
      }
    } else {
      if (a === "cm" && b === "cm") {
        const c: Conn = { id: ++idRef.current, type: "similar", path: drawnPath, mid };
        setConns((prev) => [...prev, c]);
        setCommonDone(true);
        setCelebrate({
          title: "완벽해요! 🎉",
          sub: "두 조직은 서로 다르지만, '식물의 생장과 발달에 기여한다'는 공통점이 있어요. 비교·대조 연습을 끝냈어요!",
          final: true,
        });
      } else {
        say("두 조직이 '함께' 하는 일(공통점)을 말한 마지막 문장에 그어 보세요.");
      }
    }
  }

  // 영역별 배경 틴트로 비교 대상을 보여 준다.
  const cuts = [...new Set([0, SG0, SG1, JD0, JD1, CM0, CM1, PARA.length])].sort((a, b) => a - b);
  const segs: ReactNode[] = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const s = cuts[i];
    const e = cuts[i + 1];
    if (e <= s) continue;
    const r = regionOf(s);
    const cls =
      r === "sg" ? "rounded bg-sky-50 text-sky-900"
      : r === "jd" ? "rounded bg-amber-50 text-amber-900"
      : r === "cm" ? "rounded bg-emerald-50 text-emerald-900"
      : "";
    segs.push(
      <span key={i} className={cls || undefined}>
        {PARA.slice(s, e)}
      </span>,
    );
  }

  const defaultLine =
    tool === "contrast"
      ? "두 분열 조직은 어떻게 다를까요? 측생 쪽 설명에서 정단 쪽 설명으로 선을 그어 ↔로 이어 보세요. (낱말끼리 이어도, 문장끼리 이어도 좋아요.)"
      : "두 조직의 '공통점'(둘이 함께 하는 일)을 말한 마지막 문장에 선을 그어 = 로 표시해요.";
  const coachLine = msg ?? defaultLine;
  const strokeColor = tool === "contrast" ? "#f43f5e" : "#10b981";

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
        <button type="button" onClick={() => setTool("contrast")} className={"flex flex-col items-center gap-0.5 rounded-lg border px-3 py-2 text-xs " + (tool === "contrast" ? "border-rose-500 bg-rose-50 text-rose-700" : "border-gray-200 bg-white text-gray-600")}>
          <span className="text-base leading-none">↔</span>차이점(다른 점)
        </button>
        <button type="button" onClick={() => setTool("similar")} className={"flex flex-col items-center gap-0.5 rounded-lg border px-3 py-2 text-xs " + (tool === "similar" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-white text-gray-600")}>
          <span className="text-base leading-none">=</span>공통점(같은 점)
        </button>
        <button type="button" onClick={reset} className="ml-auto rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50">다시 하기</button>
      </div>

      <div
        ref={ref}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        style={{ touchAction: "none", userSelect: "none", WebkitUserSelect: "none", cursor: "crosshair" }}
        className="relative rounded-2xl border border-gray-200 bg-white p-6 text-[17px] leading-[2.2] text-gray-800 shadow-sm"
      >
        <p data-para className="whitespace-pre-wrap">{segs}</p>
        <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible">
          {conns.map((c) => (
            <g key={c.id}>
              <path d={c.path} fill="none" stroke={c.type === "contrast" ? "#f43f5e" : "#10b981"} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.85} />
              <text x={c.mid.x} y={c.mid.y} textAnchor="middle" fontSize="15" fontWeight="700" fill={c.type === "contrast" ? "#e11d48" : "#059669"}>{c.type === "contrast" ? "↔" : "="}</text>
            </g>
          ))}
          {path && (
            <path d={path} fill="none" stroke={strokeColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.6} />
          )}
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
