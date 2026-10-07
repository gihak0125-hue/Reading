"use client";

import Link from "next/link";
import { useRef, useState } from "react";

type Pt = { x: number; y: number };
type Mark = { id: number; type: "underline" | "circle"; start: number; end: number };

const PARA =
  "일반적으로 법적 의제란 실제로는 사실이 아닌 어떤 것을 법적으로는 마치 사실인 것처럼 취급하고 반대되는 증거가 있다 하더라도 그와 같은 취급을 고수하려는 것을 의미한다. 가령 일정 기간 이상 생사가 확인되지 않는 사람에 대해 법원이 실종 선고를 내리면 그 사람은 사망한 것으로 간주되어, 법원이 다시 실종선고를 취소하기 전에는 설령 그가 살아 있다 하더라도 법적으로 여전히 사망한 것으로 취급되는데, 이러한 결과가 바로 법적 의제에 따른 것이라 할 수 있다.";

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
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const steps = Math.min(8, Math.floor(dist / 5));
      for (let s = 1; s < steps; s++)
        out.push({ x: a.x + ((b.x - a.x) * s) / steps, y: a.y + ((b.y - a.y) * s) / steps });
    }
  }
  return out;
}
function recognize(wrap: HTMLElement, pts: Pt[], type: "underline" | "circle"): { start: number; end: number } | null {
  const yShifts = type === "underline" ? [-4, -9, -14] : [0, -7, 7, -12];
  const offs: number[] = [];
  for (const p of densify(pts)) {
    for (const dy of yShifts) {
      const o = offsetAtPoint(wrap, p.x, p.y + dy);
      if (o != null) {
        offs.push(o);
        break;
      }
    }
  }
  if (offs.length < 2) return null;
  offs.sort((a, b) => a - b);
  const start = offs[0];
  const end = offs[offs.length - 1];
  if (end <= start) return null;
  return { start, end };
}
const overlap = (s1: number, e1: number, s2: number, e2: number) =>
  Math.max(0, Math.min(e1, e2) - Math.max(s1, s2));

export function PracticeMarking() {
  const topicStr = "법적 의제";
  const topicStart = PARA.indexOf(topicStr);
  const topicEnd = topicStart + topicStr.length;
  const dot = PARA.indexOf(". ");
  const sentEnd = dot >= 0 ? dot + 1 : PARA.length;

  const [tool, setTool] = useState<"circle" | "underline">("circle");
  const [marks, setMarks] = useState<Mark[]>([]);
  const [topicDone, setTopicDone] = useState(false);
  const [sentDone, setSentDone] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);
  const stroke = useRef<{ active: boolean; pts: Pt[] }>({ active: false, pts: [] });
  const [path, setPath] = useState("");

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
    setPath("");
    const wrap = ref.current;
    if (!wrap) return;
    const span = recognize(wrap, pts, tool);
    if (!span) {
      setMsg("글자 위를 지나가도록 그어 주세요.");
      return;
    }
    const m: Mark = { id: ++idRef.current, type: tool, start: span.start, end: span.end };
    setMarks((prev) => [...prev, m]);
    if (tool === "circle") {
      if (overlap(span.start, span.end, topicStart, topicEnd) >= 2) {
        setTopicDone(true);
        setTool("underline");
        setMsg("좋아요! ‘법적 의제’가 이 글이 계속 다루는 중심화제예요. 이제 밑줄로 중심 문장을 찾아볼까요?");
      } else {
        setMsg("음… 이 글이 처음부터 끝까지 다루는 낱말은 무엇일까요? ‘법적 의제’에 동그라미를 쳐 보세요.");
      }
    } else {
      const ov = overlap(span.start, span.end, 0, sentEnd);
      if (ov >= sentEnd * 0.4) {
        setSentDone(true);
        setMsg("정확해요! 첫 문장이 개념을 정의하는 중심 문장이에요.");
      } else if (overlap(span.start, span.end, sentEnd, PARA.length) > 0) {
        setMsg("그 문장은 ‘가령~’으로 시작하는 예시(뒷받침)예요. 개념을 정의한 첫 문장에 밑줄을 그어 보세요.");
      } else {
        setMsg("중심 문장(정의가 담긴 첫 문장)에 밑줄을 그어 주세요.");
      }
    }
  }

  const cuts = new Set<number>([0, PARA.length]);
  for (const m of marks) {
    cuts.add(Math.max(0, Math.min(PARA.length, m.start)));
    cuts.add(Math.max(0, Math.min(PARA.length, m.end)));
  }
  const bps = [...cuts].sort((a, b) => a - b);
  const segs = [];
  for (let i = 0; i < bps.length - 1; i++) {
    const s = bps[i];
    const e = bps[i + 1];
    if (e <= s) continue;
    const cover = marks.filter((m) => m.start <= s && m.end >= e);
    const underline = cover.some((m) => m.type === "underline");
    const circle = cover.some((m) => m.type === "circle");
    const cls =
      (underline ? "underline decoration-blue-500 decoration-2 underline-offset-4 " : "") +
      (circle ? "rounded-full border-2 border-rose-400 px-0.5 " : "");
    segs.push(
      <span key={i} className={cls || undefined}>
        {PARA.slice(s, e)}
      </span>,
    );
  }
  const done = topicDone && sentDone;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-5 py-10">
      <header>
        <p className="inline-flex w-fit items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          표시 연습 · 1/3
        </p>
        <h1 className="mt-2 text-2xl font-bold text-gray-800 dark:text-gray-100">
          중심화제와 중심 문장 찾기
        </h1>
      </header>

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">진행</span>
        <span className={"rounded-full px-2 py-0.5 text-xs " + (topicDone ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" : "bg-gray-100 text-gray-500 dark:bg-gray-800")}>
          ◯ 중심화제 {topicDone ? "✓" : ""}
        </span>
        <span className={"rounded-full px-2 py-0.5 text-xs " + (sentDone ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" : "bg-gray-100 text-gray-500 dark:bg-gray-800")}>
          ▁ 중심 문장 {sentDone ? "✓" : ""}
        </span>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
        {done ? (
          <span>잘했어요! 중심화제(법적 의제)와 중심 문장(정의가 담긴 첫 문장)을 모두 찾았어요.</span>
        ) : !topicDone ? (
          <span>① 이 글이 처음부터 끝까지 다루는 <b>중심화제</b>(중심이 되는 낱말)에 <b>동그라미</b>를 쳐 보세요.</span>
        ) : (
          <span>② 이제 글의 <b>중심 문장</b>(개념을 정의한 문장)에 <b>밑줄</b>을 그어 보세요.</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTool("circle")}
          className={"flex min-w-[96px] flex-col items-center gap-0.5 rounded-lg border px-3 py-2 text-xs " + (tool === "circle" ? "border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : "border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-950")}
        >
          <span className="text-base leading-none">◯</span>
          동그라미(중심화제)
        </button>
        <button
          type="button"
          onClick={() => setTool("underline")}
          className={"flex min-w-[96px] flex-col items-center gap-0.5 rounded-lg border px-3 py-2 text-xs " + (tool === "underline" ? "border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : "border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-950")}
        >
          <span className="text-base leading-none">▁</span>
          밑줄(중심 문장)
        </button>
        <button
          type="button"
          onClick={() => {
            setMarks([]);
            setMsg(null);
          }}
          className="ml-auto rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
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
        <p data-para className="whitespace-pre-wrap">
          {segs}
        </p>
        {path && (
          <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible">
            <path d={path} fill="none" stroke={tool === "circle" ? "#fb7185" : "#3b82f6"} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.7} />
          </svg>
        )}
      </div>

      {msg && <p className="text-sm text-gray-600 dark:text-gray-300">{msg}</p>}

      <div className="flex flex-wrap gap-2">
        {done && (
          <Link href="/read" className="rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-800">
            실제로 읽어보기 &rarr;
          </Link>
        )}
        <Link href="/dashboard" className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
          나중에 하기
        </Link>
      </div>
    </main>
  );
}
