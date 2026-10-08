"use client";

import Link from "next/link";
import { ReactNode, useRef, useState } from "react";

type Pt = { x: number; y: number };
type Mark = { id: number; start: number; end: number };

const PARA =
  "조선에서는 16세기 이후 이황과 이이로 대표되는 사림 계열의 성리학 연구가 심화되었다. 조선의 성리학자들은 주희의 행적을 이상적인 학자의 모습이라고 인식했다. 성리학을 집대성한 주희는 무이산에 은거하며 무이정사를 짓고 학문을 닦고 후학 양성에 힘을 쏟았다. 조선에서는 주희의 행적을 따라 성리학을 기반으로 심신을 수양하고 학문에 정진하는 것이 사대부 사회의 문화적 유행이 되었다. 다만 그 수용 양상은 이황의 학통을 따랐던 사대부들과 이이의 학통을 따랐던 사대부들 간에 차이가 있었다.";

// 예측단서: 흐름을 바꾸는 담화표지 '다만' + 앞으로 다룰 내용을 예고하는 '차이가 있었다'가 담긴 마지막 문장
const CUE0 = PARA.indexOf("다만");
const CUE1 = PARA.length;
const SIG0 = PARA.indexOf("차이가 있었다"); // 예고 표현

type Opt = { id: string; text: string; ok: boolean; why?: string };
const OPTIONS: Opt[] = [
  { id: "a", text: "이황 학통과 이이 학통이 주희의 성리학을 받아들인 양상을 서로 대조하여 그 차이를 설명하는 내용", ok: true },
  { id: "b", text: "주희가 무이산에 은거하여 학문을 닦고 후학을 기른 과정", ok: false, why: "그건 앞에서 이미 설명한 내용이에요. 단서는 ‘앞으로’ 무엇을 말할지 예고해요. 다시 골라볼까요?" },
  { id: "c", text: "성리학이 조선에 처음 전해진 시기와 전파 경로", ok: false, why: "글에 나오지 않은 새로운 화제예요. 단서 ‘다만 … 차이가 있었다’는 두 학통의 ‘차이’를 예고하고 있어요. 다시 골라볼까요?" },
];

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
  const start = offs[0], end = offs[offs.length - 1];
  return end > start ? { start, end } : null;
}
const overlap = (s1: number, e1: number, s2: number, e2: number) =>
  Math.max(0, Math.min(e1, e2) - Math.max(s1, s2));
// 여러 표시가 [s,e] 구간을 합쳐서 얼마나 덮었는지(union)
function unionOverlap(ms: Mark[], s: number, e: number): number {
  const ivs = ms.map((m) => [Math.max(s, m.start), Math.min(e, m.end)] as [number, number]).filter(([a, b]) => b > a).sort((p, q) => p[0] - q[0]);
  let cov = 0; let cur: [number, number] | null = null;
  for (const [a, b] of ivs) { if (!cur || a > cur[1]) { if (cur) cov += cur[1] - cur[0]; cur = [a, b]; } else cur[1] = Math.max(cur[1], b); }
  if (cur) cov += cur[1] - cur[0];
  return cov;
}

type Tool = "cue" | "erase";
type Phase = "mark" | "predict";
type Celebrate = { title: string; sub: string; final?: boolean } | null;

export function PracticePredict() {
  const [phase, setPhase] = useState<Phase>("mark");
  const [tool, setTool] = useState<Tool>("cue");
  const [marks, setMarks] = useState<Mark[]>([]);
  const [cueDone, setCueDone] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [predictDone, setPredictDone] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState<Celebrate>(null);
  const [changeKey, setChangeKey] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);
  const stroke = useRef<{ active: boolean; pts: Pt[] }>({ active: false, pts: [] });
  const [path, setPath] = useState("");

  function say(next: string | null) { setMsg(next); setChangeKey((v) => v + 1); }
  function reset() {
    setPhase("mark"); setTool("cue"); setMarks([]); setCueDone(false);
    setPicked(null); setPredictDone(false); setCelebrate(null); say(null);
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
    if (!wrap || pts.length < 2 || phase !== "mark") return;

    if (tool === "erase") {
      const eoffs: number[] = [];
      for (const p of densify(pts)) for (const dy of [0, -8, -14]) { const o = offsetAtPoint(wrap, p.x, p.y + dy); if (o != null) { eoffs.push(o); break; } }
      if (!eoffs.length) { say("지울 표시 위를 그어 주세요."); return; }
      eoffs.sort((a, b) => a - b);
      const es = eoffs[0], ee = eoffs[eoffs.length - 1];
      const rem = marks.filter((mm) => overlap(mm.start, mm.end, es, ee) === 0);
      setMarks(rem);
      setCueDone(unionOverlap(rem, CUE0, CUE1) >= 8 && rem.some((m) => m.end >= SIG0));
      say("지웠어요. 다시 표시해 볼까요?");
      return;
    }

    const span = recognize(wrap, pts);
    if (!span) { say("글자 위를 지나가도록 그어 주세요."); return; }
    const m: Mark = { id: ++idRef.current, start: span.start, end: span.end };
    const next = [...marks, m];
    setMarks(next);
    const covered = unionOverlap(next, CUE0, CUE1);
    const reachesSignal = next.some((x) => x.end >= SIG0);
    if (covered >= 8 && reachesSignal) {
      setCueDone(true);
      say(null);
      setCelebrate({
        title: "단서를 찾았어요!",
        sub: "‘다만’은 흐름을 바꾸는 담화표지이고, ‘차이가 있었다’는 앞으로 그 차이를 설명하겠다는 예고예요. 이 단서로 ‘무슨 내용이’, ‘어떤 방식으로’ 이어질지 예측해 볼까요?",
      });
    } else if (overlap(span.start, span.end, 0, CUE0) > 0 && covered === 0) {
      say("다음에 이어질 내용을 ‘예고’하는 단서는 글의 마지막 문장에 있어요. 흐름을 바꾸는 말과, 앞으로 무엇을 다룰지 알려주는 표현을 찾아보세요.");
    } else {
      say("조금만 더! 다음 내용을 예고하는 핵심 표현(‘차이가 있었다’)까지 포함해 표시해 보세요.");
    }
  }

  function pick(o: Opt) {
    setPicked(o.id);
    if (o.ok) {
      setPredictDone(true);
      setCelebrate({
        title: "정확해요!",
        sub: "단서 ‘다만 … 차이가 있었다’는 두 학통의 차이를 ‘대조(對照)’의 방식으로 이어서 설명하겠다는 예고예요. 그래서 다음에는 이황·이이 학통이 주희의 성리학을 어떻게 다르게 받아들였는지를 대조하여 밝히는 내용이 이어져요. (2단계에서 익힌 ↔ 대조와 같은 전개 방식이에요!)",
        final: true,
      });
    } else {
      say(o.why ?? "다시 한 번 생각해 볼까요?");
    }
  }

  const cutSet = new Set<number>([0, PARA.length]);
  marks.forEach((m) => { cutSet.add(Math.max(0, m.start)); cutSet.add(Math.min(PARA.length, m.end)); });
  const cuts = [...cutSet].sort((a, b) => a - b);
  const segs: ReactNode[] = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const s = cuts[i], e = cuts[i + 1];
    if (e <= s) continue;
    const marked = marks.some((m) => m.start <= s && m.end >= e);
    segs.push(
      <span key={i} className={marked ? "underline decoration-violet-500 decoration-2 underline-offset-4" : undefined}>
        {PARA.slice(s, e)}
      </span>,
    );
  }

  const defaultLine: ReactNode =
    phase === "mark"
      ? (<span>① 이 글 <b>다음에 이어질 내용</b>을 ‘예고’하는 <b>단서</b>를 찾아 표시해 보세요. (흐름을 바꾸는 말·앞으로 다룰 내용을 알려주는 표현)</span>)
      : (<span>② 그 단서를 보면, 바로 다음에는 어떤 내용이 이어질까요? 아래에서 골라 보세요.</span>);
  const coachLine = msg ? <span>{msg}</span> : defaultLine;

  const toolBtn = (t: Tool, label: string, icon: string) => (
    <button type="button" onClick={() => setTool(t)} className={"flex min-w-[88px] flex-col items-center gap-0.5 rounded-lg border px-3 py-2 text-xs " + (tool === t ? "border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : "border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-950")}>
      <span className="text-base leading-none">{icon}</span>{label}
    </button>
  );

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-5 py-10">
      <header>
        <p className="inline-flex w-fit items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          예측단서 · 3/3
        </p>
        <h1 className="mt-2 text-2xl font-bold text-gray-800 dark:text-gray-100">
          단서로 다음 내용 예측하기
        </h1>
      </header>

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">진행</span>
        <span className={"rounded-full px-2 py-0.5 text-xs " + (cueDone ? "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300" : "bg-gray-100 text-gray-500 dark:bg-gray-800")}>
          🔮 단서 {cueDone ? "✓" : ""}
        </span>
        <span className={"rounded-full px-2 py-0.5 text-xs " + (predictDone ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-gray-100 text-gray-500 dark:bg-gray-800")}>
          ✓ 예측 {predictDone ? "✓" : ""}
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

      {phase === "mark" ? (
        <div className="flex flex-wrap gap-2">
          {toolBtn("cue", "예측단서", "🔮")}
          {toolBtn("erase", "지우개", "⌫")}
          <button type="button" onClick={reset} className="ml-auto rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
            다시 하기
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full bg-violet-100 px-2.5 py-1 font-medium text-violet-700 dark:bg-violet-950 dark:text-violet-300">🔮 단서 표시 완료</span>
          <button type="button" onClick={reset} className="ml-auto rounded-lg border border-gray-300 px-3 py-2 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
            다시 하기
          </button>
        </div>
      )}

      <div
        ref={ref}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        style={{ touchAction: "none", userSelect: "none", WebkitUserSelect: "none", cursor: phase === "mark" ? "crosshair" : "default" }}
        className="relative rounded-2xl border border-gray-200 bg-white p-6 text-lg leading-loose text-gray-800 shadow-sm dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
      >
        <p data-para className="font-serif-kr whitespace-pre-wrap">{segs}</p>
        {path && (
          <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible">
            <path d={path} fill="none" stroke={tool === "erase" ? "#9ca3af" : "#8b5cf6"} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.6} />
          </svg>
        )}
      </div>

      {phase === "predict" && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">다음에 이어질 내용과 전개 방식으로 가장 알맞은 것은?</p>
          {OPTIONS.map((o) => {
            const sel = picked === o.id;
            const state = sel ? (o.ok ? "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100" : "border-rose-400 bg-rose-50 text-rose-900 dark:bg-rose-950 dark:text-rose-100") : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200";
            return (
              <button key={o.id} type="button" disabled={predictDone} onClick={() => pick(o)} className={"rounded-xl border px-4 py-3 text-left text-sm leading-relaxed transition " + state}>
                {o.text}{sel && (o.ok ? " ✓" : " ✗")}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Link href="/tutorial/2" className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
          &larr; 2단계(관계)
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
                <Link href="/read" className="rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-800">
                  실제로 읽어보기 &rarr;
                </Link>
                <button type="button" onClick={reset} className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                  다시 연습하기
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => { setCelebrate(null); if (cueDone && phase === "mark") setPhase("predict"); }} className="mt-2 w-full rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-800">
                예측하러 가기 &rarr;
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
