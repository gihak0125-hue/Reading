"use client";

import { useState } from "react";
import Link from "next/link";

export type ParagraphData = { id: string; seq: number; text: string };

type ToolId = "underline" | "circle" | "arrow" | "relation" | "erase";
const TOOLS: { id: ToolId; label: string; glyph: string }[] = [
  { id: "underline", label: "밑줄", glyph: "▁" },
  { id: "circle", label: "동그라미", glyph: "◯" },
  { id: "arrow", label: "화살표", glyph: "→" },
  { id: "relation", label: "관계 표시", glyph: "🔗" },
  { id: "erase", label: "지우기", glyph: "⌫" },
];

const PHASES = ["핵심원리", "관계 연결", "구조화", "자기설명"];
type PadTab = "key" | "structure" | "explain";

export function ReadingWorkspace({
  title,
  paragraphs,
}: {
  sessionId: string;
  title: string;
  paragraphs: ParagraphData[];
}) {
  const [tool, setTool] = useState<ToolId | null>(null);
  const [showTools, setShowTools] = useState(true);
  const [tab, setTab] = useState<PadTab>("key");

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
                      onClick={() => setTool(active ? null : t.id)}
                      className={`flex min-w-[64px] flex-col items-center gap-1 rounded-lg border px-3 py-2 text-xs ${
                        active
                          ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:hover:bg-gray-800"
                      }`}
                    >
                      <span className="text-lg leading-none">{t.glyph}</span>
                      {t.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                {tool
                  ? `'${TOOLS.find((t) => t.id === tool)?.label}' 선택됨 — 본문에서 표시할 곳을 정하세요. (표시 저장 기능 준비 중)`
                  : "도구를 먼저 선택한 후, 본문에서 표시할 곳을 선택하세요."}
              </p>
            </div>
          )}

          {/* 지문 */}
          <article className="flex flex-col gap-5">
            {paragraphs.map((p) => (
              <div key={p.id}>
                <span className="mb-1 inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800">
                  {p.seq}문단
                </span>
                <p className="whitespace-pre-wrap text-[17px] leading-8 text-gray-800 dark:text-gray-100">
                  {p.text}
                </p>
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
            <PadEmpty
              title="핵심 문장 / 개념"
              hint="본문에서 밑줄·동그라미로 표시하면 여기에 모여요."
            />
          )}
          {tab === "structure" && (
            <PadEmpty
              title="관계 구조도"
              hint="화살표로 정보를 연결하면 관계도가 그려져요."
            />
          )}
          {tab === "explain" && (
            <PadEmpty
              title="내 설명"
              hint="AI 코치의 질문에 답한 내용이 여기에 쌓여요."
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
              필요할 때 도와줄게요. <span className="text-blue-400">(준비 중)</span>
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
