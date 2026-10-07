"use client";

import Link from "next/link";
import { ReactNode, useState } from "react";

const PARA =
  "식물의 지속적인 생장은 특정 부위에 존재하는 분열 조직에 의해 이루어진다. 식물의 생장과 관련된 주요 분열 조직에는 측생 분열 조직과 정단 분열 조직이 있다. 측생 분열 조직은 줄기나 뿌리의 측면에 위치하여 부피 생장을 유도하고, 정단 분열 조직은 줄기와 뿌리의 끝, 즉 정단에 위치하여 길이 생장을 담당한다. 이 두 조직은 식물이 다양한 구조를 갖추고 기능적으로 발달해 나가는 데 중요한 기반이 된다.";

const COMMON_STR = "식물이 다양한 구조를 갖추고 기능적으로 발달해 나가는";

// 핵심 어구(비교 대상). group 같으면 같은 항목(대조 쌍).
type KeyDef = { k: string; str: string; group: "loc" | "fn" | "common" };
const KEYDEFS: KeyDef[] = [
  { k: "loc_a", str: "측면", group: "loc" },
  { k: "loc_b", str: "끝", group: "loc" },
  { k: "fn_a", str: "부피 생장", group: "fn" },
  { k: "fn_b", str: "길이 생장", group: "fn" },
  { k: "common", str: COMMON_STR, group: "common" },
];

type Span = KeyDef & { start: number; end: number };
const SPANS: Span[] = KEYDEFS.map((d) => {
  const start = PARA.indexOf(d.str);
  return { ...d, start, end: start + d.str.length };
}).sort((a, b) => a.start - b.start);

type Celebrate = { title: string; sub: string; final?: boolean } | null;

export function PracticeRelation() {
  const [tool, setTool] = useState<"contrast" | "similar">("contrast");
  const [selected, setSelected] = useState<string | null>(null);
  const [pairs, setPairs] = useState<string[]>([]); // 완료한 그룹: "loc","fn"
  const [commonDone, setCommonDone] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [celebrate, setCelebrate] = useState<Celebrate>(null);
  const [changeKey, setChangeKey] = useState(0);

  const groupOf = (k: string) => KEYDEFS.find((d) => d.k === k)?.group;
  const badgeOf = (k: string): "≠" | "=" | null => {
    const g = groupOf(k);
    if (g === "common") return commonDone ? "=" : null;
    return g && pairs.includes(g) ? "≠" : null;
  };

  function say(next: string) {
    setMsg(next);
    setChangeKey((v) => v + 1);
  }

  function reset() {
    setTool("contrast");
    setSelected(null);
    setPairs([]);
    setCommonDone(false);
    setCelebrate(null);
    say("");
  }

  function onTap(k: string) {
    const g = groupOf(k);
    if (tool === "contrast") {
      if (g === "common") {
        say("여기는 두 조직이 '함께' 하는 일(공통점)이에요. 공통점은 아래 '공통점' 도구로 표시해요. 지금은 서로 '다른 점'을 이어 볼까요?");
        return;
      }
      if (pairs.includes(g!)) return; // 이미 완료한 항목
      if (!selected) {
        setSelected(k);
        say("좋아요. 이제 다른 조직의 '같은 항목'을 눌러 이어 보세요. (예: 한쪽 위치 → 다른 쪽 위치)");
        return;
      }
      if (selected === k) {
        setSelected(null);
        say("선택을 취소했어요. 다시 골라 볼까요?");
        return;
      }
      const sg = groupOf(selected);
      if (sg === g) {
        const nextPairs = [...pairs, g!];
        setPairs(nextPairs);
        setSelected(null);
        if (nextPairs.includes("loc") && nextPairs.includes("fn")) {
          setTool("similar");
          say("");
          setCelebrate({
            title: "차이점을 모두 찾았어요! 👏",
            sub: "위치(측면↔끝)와 생장(부피↔길이), 두 가지 다른 점을 ↔로 이었어요. 이제 두 조직의 '공통점'을 찾아볼까요?",
          });
        } else {
          say("좋아요! 한 가지 다른 점을 이었어요. 나머지 항목(" + (g === "loc" ? "생장 기능" : "위치") + ")도 이어 볼까요?");
        }
      } else {
        setSelected(null);
        say("같은 항목끼리 비교해요. 위치는 위치끼리, 생장 기능은 기능끼리 이어 보세요.");
      }
    } else {
      // similar
      if (g === "common") {
        setCommonDone(true);
        setCelebrate({
          title: "완벽해요! 🎉",
          sub: "두 조직은 서로 다르지만, '식물의 생장과 발달에 기여한다'는 공통점이 있어요. 비교·대조 연습을 끝냈어요!",
          final: true,
        });
      } else {
        say("공통점은 두 조직이 '함께' 하는 일이에요. 마지막 문장(…발달해 나가는)을 눌러 보세요.");
      }
    }
  }

  const defaultLine =
    tool === "contrast"
      ? "두 분열 조직은 어떻게 다를까요? 서로 '다른 점'이 되는 두 어구를 차례로 눌러 ↔로 이어 보세요. (위치·생장 기능)"
      : "두 조직의 '공통점'을 찾아보세요. 둘이 함께 하는 일을 말한 문장을 눌러 = 로 표시해요.";
  const coachLine = msg || defaultLine;

  const seg: ReactNode[] = [];
  let cursor = 0;
  SPANS.forEach((s) => {
    if (s.start > cursor) seg.push(PARA.slice(cursor, s.start));
    const badge = badgeOf(s.k);
    const isSel = selected === s.k;
    const base =
      s.group === "common"
        ? "bg-emerald-50 text-emerald-900"
        : "bg-slate-100 text-slate-900";
    const cls = badge
      ? s.group === "common"
        ? "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300"
        : "bg-rose-100 text-rose-900 ring-1 ring-rose-300"
      : isSel
      ? "bg-sky-100 text-sky-900 ring-2 ring-sky-400"
      : base;
    seg.push(
      <button
        key={"k" + s.start}
        type="button"
        onClick={() => onTap(s.k)}
        className={"mx-[1px] rounded px-1 py-[1px] underline decoration-dotted decoration-slate-400 underline-offset-2 transition " + cls}
      >
        {s.str}
        {badge && <sup className="ml-[2px] text-[0.7em] font-bold">{badge}</sup>}
      </button>
    );
    cursor = s.end;
  });
  if (cursor < PARA.length) seg.push(PARA.slice(cursor));

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800">관계 연결 · 2/3</h1>
        <div className="flex gap-2 text-xs">
          <span className={"rounded-full px-2 py-1 " + (pairs.includes("loc") && pairs.includes("fn") ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-500")}>↔ 차이점</span>
          <span className={"rounded-full px-2 py-1 " + (commonDone ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>= 공통점</span>
        </div>
      </header>

      <div className="flex items-start gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        <div key={changeKey} className="coach-pop rounded-2xl rounded-tl-sm bg-amber-50 px-4 py-2.5 text-sm leading-relaxed text-slate-800 ring-1 ring-amber-100">
          {coachLine}
        </div>
      </div>

      <p data-para className="select-none rounded-xl bg-white p-4 text-[17px] leading-[2.1] text-slate-900 ring-1 ring-slate-100">
        {seg}
      </p>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => { setTool("contrast"); setSelected(null); }} className={"rounded-lg px-3 py-2 text-sm font-medium transition " + (tool === "contrast" ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-600")}>↔ 차이점</button>
        <button type="button" onClick={() => { setTool("similar"); setSelected(null); }} className={"rounded-lg px-3 py-2 text-sm font-medium transition " + (tool === "similar" ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600")}>= 공통점</button>
        <button type="button" onClick={reset} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600">다시 하기</button>
      </div>

      <div className="mt-auto flex justify-between pt-4 text-sm">
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
