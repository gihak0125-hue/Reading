"use client";

import { useMemo, useState } from "react";

export type MarkPoint = {
  ratio: number | null; // 본문 대비 표시 %
  precision: number | null; // 정확도 %
  recall: number | null; // 포괄도 %
  reading: number | null; // 읽기(표시) 점수 — 표시에서 산출(참고용)
  check: number | null; // 독해 확인 점수 — 독립 측정
  critique: number | null; // 관점 평가 점수 — 독립 측정
  passageId: string | null;
  passageTitle: string;
  classId: string | null;
};

function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 3) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let cov = 0,
    vx = 0,
    vy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    cov += dx * dy;
    vx += dx * dx;
    vy += dy * dy;
  }
  if (vx === 0 || vy === 0) return null;
  return cov / Math.sqrt(vx * vy);
}

const strength = (r: number) => {
  const a = Math.abs(r);
  if (a < 0.1) return "거의 없음";
  if (a < 0.3) return "약함";
  if (a < 0.5) return "보통";
  if (a < 0.7) return "다소 강함";
  return "강함";
};

type XKey = "ratio" | "precision";
type YKey = "check" | "critique" | "reading";

const Y_LABEL: Record<YKey, string> = {
  check: "독해 확인 점수",
  critique: "관점 평가 점수",
  reading: "읽기(표시) 점수",
};

export function MarkAnalysis({
  points,
  passages,
  classes,
}: {
  points: MarkPoint[];
  passages: { id: string; title: string }[];
  classes: { id: string; name: string }[];
}) {
  const [xKey, setXKey] = useState<XKey>("ratio");
  const [yKey, setYKey] = useState<YKey>("check");
  const [passageId, setPassageId] = useState<string>("all");
  const [classId, setClassId] = useState<string>("all");

  const xOf = (p: MarkPoint) => (xKey === "ratio" ? p.ratio : p.precision);
  const yOf = (p: MarkPoint) => p[yKey];

  const filtered = useMemo(
    () =>
      points.filter(
        (p) =>
          (passageId === "all" || p.passageId === passageId) &&
          (classId === "all" || p.classId === classId),
      ),
    [points, passageId, classId],
  );
  const valid = useMemo(
    () => filtered.filter((p) => xOf(p) != null && yOf(p) != null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtered, xKey, yKey],
  );

  // 표시량 구간별(10%씩) 평균 세로축 점수 — '최적 구간' 확인용
  const bins = useMemo(() => {
    const B = Array.from({ length: 10 }, (_, i) => ({
      lo: i * 10,
      hi: i * 10 + 10,
      sum: 0,
      n: 0,
    }));
    for (const p of valid) {
      const x = xOf(p) as number;
      let idx = Math.floor(x / 10);
      if (idx > 9) idx = 9;
      if (idx < 0) idx = 0;
      B[idx].sum += yOf(p) as number;
      B[idx].n += 1;
    }
    return B.map((b) => ({ ...b, mean: b.n ? Math.round(b.sum / b.n) : null }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valid, xKey, yKey]);
  const bestBin = bins
    .filter((b) => b.n > 0)
    .sort((a, b) => (b.mean ?? 0) - (a.mean ?? 0))[0];
  const xs = valid.map((p) => xOf(p) as number);
  const ys = valid.map((p) => yOf(p) as number);
  const r = pearson(xs, ys);

  const xLabel = xKey === "ratio" ? "표시량 (본문 대비 %)" : "표시 정확도 (%)";

  // SVG 좌표(0~100 → 플롯영역)
  const W = 360,
    H = 220,
    L = 36,
    R = 12,
    T = 12,
    B = 28;
  const px = (v: number) => L + ((W - L - R) * Math.min(100, Math.max(0, v))) / 100;
  const py = (v: number) => T + (H - T - B) * (1 - Math.min(100, Math.max(0, v)) / 100);

  function exportCsv() {
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const header =
      "passage,class,mark_ratio_pct,precision_pct,recall_pct,reading_score,check_score,critique_score";
    const lines = filtered.map(
      (p) =>
        `${esc(p.passageTitle)},${esc(p.classId ?? "")},${p.ratio ?? ""},${p.precision ?? ""},${p.recall ?? ""},${p.reading ?? ""},${p.check ?? ""},${p.critique ?? ""}`,
    );
    const csv = [header, ...lines].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mark_vs_score.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="rounded-2xl border border-white/60 bg-white p-5 shadow-lg shadow-blue-200/20 lg:col-span-2 dark:border-white/10 dark:bg-gray-950 dark:shadow-black/30">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">표시량 · 정확도 ↔ 독해점수</h2>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-gray-100 p-0.5 text-xs dark:bg-gray-800">
            <button
              type="button"
              onClick={() => setXKey("ratio")}
              className={`rounded-md px-2 py-1 font-medium ${
                xKey === "ratio"
                  ? "bg-white text-amber-800 shadow-sm dark:bg-gray-950 dark:text-amber-300"
                  : "text-gray-500"
              }`}
            >
              표시량
            </button>
            <button
              type="button"
              onClick={() => setXKey("precision")}
              className={`rounded-md px-2 py-1 font-medium ${
                xKey === "precision"
                  ? "bg-white text-amber-800 shadow-sm dark:bg-gray-950 dark:text-amber-300"
                  : "text-gray-500"
              }`}
            >
              정확도
            </button>
          </div>
          <button
            type="button"
            onClick={exportCsv}
            disabled={points.length === 0}
            className="rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            CSV 내보내기
          </button>
        </div>
      </div>
      {(passages.length > 1 || classes.length > 1) && (
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-gray-400">필터</span>
          {classes.length > 1 && (
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-2 py-1 dark:border-gray-700 dark:bg-gray-900"
            >
              <option value="all">전체 학급</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          {passages.length > 1 && (
            <select
              value={passageId}
              onChange={(e) => setPassageId(e.target.value)}
              className="max-w-[220px] rounded-md border border-gray-300 bg-white px-2 py-1 dark:border-gray-700 dark:bg-gray-900"
            >
              <option value="all">전체 지문</option>
              {passages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-400">세로축</span>
        <div className="flex rounded-lg bg-gray-100 p-0.5 text-xs dark:bg-gray-800">
          {(["check", "critique", "reading"] as YKey[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setYKey(k)}
              className={`rounded-md px-2 py-1 font-medium ${
                yKey === k
                  ? "bg-white text-amber-800 shadow-sm dark:bg-gray-950 dark:text-amber-300"
                  : "text-gray-500"
              }`}
            >
              {k === "check" ? "독해 확인" : k === "critique" ? "관점 평가" : "읽기(표시)"}
            </button>
          ))}
        </div>
      </div>
      <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
        가로축 = {xLabel}, 세로축 = {Y_LABEL[yKey]}. 표시량은 점수화하지 않고
        데이터로만 수집해요.{" "}
        {yKey === "reading"
          ? "※ 읽기(표시) 점수는 표시에서 산출돼 표시 지표와 순환이에요 — 참고용."
          : "독해 확인·관점 점수는 표시와 독립적으로 측정돼요(인과 추정에 적합)."}{" "}
        점 {filtered.length}개.
      </p>

      {valid.length < 3 ? (
        <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400 dark:border-gray-700">
          데이터가 더 쌓이면 상관을 보여줘요. (가로축·세로축이 모두 있는 세션 3건
          이상 필요 — 세로축이 &lsquo;독해 확인&rsquo;이면 학생이 읽기 후 독해
          확인까지 마쳐야 점이 생겨요.)
        </p>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full sm:max-w-md"
            role="img"
            aria-label="표시량과 독해점수 산점도"
          >
            {/* 격자·축 */}
            {[0, 25, 50, 75, 100].map((g) => (
              <g key={g}>
                <line x1={L} y1={py(g)} x2={W - R} y2={py(g)} stroke="#eae9e3" strokeWidth="1" />
                <text x={L - 4} y={py(g) + 3} textAnchor="end" fontSize="8" fill="#b7b3a8">
                  {g}
                </text>
                <text x={px(g)} y={H - 8} textAnchor="middle" fontSize="8" fill="#b7b3a8">
                  {g}
                </text>
              </g>
            ))}
            {/* 추세선(선형회귀) */}
            {(() => {
              const n = xs.length;
              const mx = xs.reduce((a, b) => a + b, 0) / n;
              const my = ys.reduce((a, b) => a + b, 0) / n;
              let sxy = 0,
                sxx = 0;
              for (let i = 0; i < n; i++) {
                sxy += (xs[i] - mx) * (ys[i] - my);
                sxx += (xs[i] - mx) ** 2;
              }
              if (sxx === 0) return null;
              const slope = sxy / sxx;
              const b0 = my - slope * mx;
              const y0 = b0;
              const y100 = slope * 100 + b0;
              return (
                <line
                  x1={px(0)}
                  y1={py(y0)}
                  x2={px(100)}
                  y2={py(y100)}
                  stroke="#286b55"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                  opacity="0.7"
                />
              );
            })()}
            {/* 점 */}
            {valid.map((p, i) => (
              <circle
                key={i}
                cx={px(xOf(p) as number)}
                cy={py(yOf(p) as number)}
                r="3.5"
                fill="#f6a23c"
                fillOpacity="0.75"
                stroke="#d97706"
                strokeWidth="0.8"
              />
            ))}
          </svg>

          <div className="shrink-0 rounded-xl bg-gray-50 p-4 text-center dark:bg-gray-900">
            <div className="text-xs text-gray-400">상관계수 r</div>
            <div
              className={`text-3xl font-bold tabular-nums ${
                r == null
                  ? "text-gray-400"
                  : r >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {r == null ? "–" : r.toFixed(2)}
            </div>
            {r != null && (
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {r >= 0 ? "양(+)" : "음(−)"} · {strength(r)}
                <br />n = {valid.length}
              </div>
            )}
          </div>
        </div>
      )}

      {valid.length >= 3 && (
        <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {xKey === "ratio" ? "표시량" : "정확도"} 구간별 평균 {Y_LABEL[yKey]}
            </h3>
            {bestBin && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                최고 구간 {bestBin.lo}–{bestBin.hi}% · 평균 {bestBin.mean}점
              </span>
            )}
          </div>
          <div className="flex items-end gap-1">
            {bins.map((b) => (
              <div key={b.lo} className="flex flex-1 flex-col items-center">
                <span className="mb-1 text-[10px] tabular-nums text-gray-500 dark:text-gray-400">
                  {b.mean == null ? "" : b.mean}
                </span>
                <div className="flex h-24 w-full items-end">
                  <div
                    className={`w-full rounded-t ${
                      bestBin && b.lo === bestBin.lo ? "bg-emerald-500" : "bg-amber-400"
                    }`}
                    style={{ height: `${b.mean ?? 0}%`, opacity: b.n ? 1 : 0.15 }}
                    title={b.n ? `${b.lo}–${b.hi}% · ${b.n}명 · 평균 ${b.mean}점` : `${b.lo}–${b.hi}% · 데이터 없음`}
                  />
                </div>
                <span className="mt-1 text-[9px] text-gray-400">{b.lo}</span>
                <span className="text-[9px] text-gray-300 dark:text-gray-600">
                  {b.n ? `n${b.n}` : ""}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-1 text-[10px] text-gray-400">
            가로 = {xKey === "ratio" ? "표시량" : "정확도"} 구간(%), 막대 높이 = 그
            구간 학생들의 평균 {Y_LABEL[yKey]}. 어느 구간에서 점수가 가장 높은지(=
            우리 데이터의 최적 구간)를 봐요.
          </p>
        </div>
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
        해석 주의: 상관은 인과가 아니며 표본이 작으면 흔들립니다. 표시량(r)이 음수면
        &lsquo;많이 칠할수록 점수가 낮다&rsquo;, 정확도(r)가 양수면 &lsquo;정확히
        짚을수록 점수가 높다&rsquo;는 경향입니다.
      </p>
    </section>
  );
}
