"use client";

import { useState, useTransition } from "react";
import {
  analyzePassageAction,
  saveSuggestions,
  type KeyInfoSuggest,
  type RelationSuggest,
} from "../actions";

const REL: Record<string, string> = {
  cause_effect: "인과",
  process: "과정",
  compare_contrast: "비교·대조",
  problem_solution: "문제-해결",
  question_answer: "문답",
  listing: "나열",
  similarity: "공통점(비교)",
  contrast: "차이점(대조)",
};

export function AiSuggest({ passageId }: { passageId: string }) {
  const [pending, start] = useTransition();
  const [saving, startSave] = useTransition();
  const [data, setData] = useState<{
    keyInfos: KeyInfoSuggest[];
    relations: RelationSuggest[];
  } | null>(null);
  const [keyChecked, setKeyChecked] = useState<boolean[]>([]);
  const [relChecked, setRelChecked] = useState<boolean[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [note, setNote] = useState("");

  function analyze() {
    setMsg(null);
    start(async () => {
      const res = await analyzePassageAction(passageId, note);
      if ("error" in res && res.error) {
        setMsg(res.error);
        setData(null);
        return;
      }
      const d = res as { keyInfos: KeyInfoSuggest[]; relations: RelationSuggest[] };
      setData(d);
      setKeyChecked(d.keyInfos.map(() => true));
      setRelChecked(d.relations.map(() => true));
      if (d.keyInfos.length + d.relations.length === 0)
        setMsg("추천할 항목을 찾지 못했어요. 문단을 확인해 주세요.");
    });
  }

  function save() {
    if (!data) return;
    const keyInfos = data.keyInfos
      .filter((_, i) => keyChecked[i])
      .map((k) => ({
        paragraphId: k.paragraphId,
        spanStart: k.spanStart,
        spanEnd: k.spanEnd,
        kind: k.kind,
      }));
    const relations = data.relations.filter((_, i) => relChecked[i]);
    if (keyInfos.length + relations.length === 0) {
      setMsg("저장할 항목을 선택하세요.");
      return;
    }
    startSave(async () => {
      const res = await saveSuggestions({ passageId, keyInfos, relations });
      if (res.error) setMsg(res.error);
      else {
        setMsg("저장했어요! 아래 문단 태깅에 반영됐어요.");
        setData(null);
      }
    });
  }

  return (
    <section className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-900 dark:bg-violet-950/40">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">✨ AI 분석 (교사 보조)</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            핵심문장·핵심어와 문장 간 관계를 추천받아 검토 후 저장하세요.
          </p>
        </div>
        <button
          type="button"
          onClick={analyze}
          disabled={pending}
          className="shrink-0 rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {pending ? "분석 중…" : data ? "다시 분석" : "AI 분석"}
        </button>
      </div>

      <div className="mt-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-600 dark:text-gray-300">
            AI에게 줄 지시·조언 <span className="text-gray-400">(선택)</span>
          </span>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="예: 공리주의와 의무론의 대조에 집중해줘. 2문단 '그러나' 뒤를 핵심으로 봐줘."
            className="w-full resize-none rounded-md border border-violet-200 bg-white px-3 py-2 text-base dark:border-violet-900 dark:bg-gray-900"
          />
          <span className="text-xs text-gray-400">
            지침을 주면 그 방향으로 다시 분석해요. 비워 두면 기본 분석.
          </span>
        </label>
      </div>

      {msg && <p className="mt-2 text-sm text-violet-800 dark:text-violet-200">{msg}</p>}

      {data && (data.keyInfos.length > 0 || data.relations.length > 0) && (
        <div className="mt-4 flex flex-col gap-4">
          {data.keyInfos.length > 0 && (
            <div>
              <p className="mb-1.5 text-sm font-medium">핵심문장 · 핵심어 추천</p>
              <ul className="flex flex-col gap-1.5">
                {data.keyInfos.map((k, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={keyChecked[i] ?? false}
                      onChange={(e) =>
                        setKeyChecked((a) =>
                          a.map((v, j) => (j === i ? e.target.checked : v)),
                        )
                      }
                      className="mt-1"
                    />
                    <span>
                      <span className="mr-1 rounded bg-gray-200 px-1.5 py-0.5 text-xs dark:bg-gray-700">
                        {k.paragraphSeq}문단 ·{" "}
                        {k.kind === "keyword" ? "핵심어" : "핵심문장"}
                      </span>
                      “{k.text}”
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.relations.length > 0 && (
            <div>
              <p className="mb-1.5 text-sm font-medium">문장 간 관계 추천</p>
              <ul className="flex flex-col gap-1.5">
                {data.relations.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={relChecked[i] ?? false}
                      onChange={(e) =>
                        setRelChecked((a) =>
                          a.map((v, j) => (j === i ? e.target.checked : v)),
                        )
                      }
                      className="mt-1"
                    />
                    <span className="flex flex-wrap items-center gap-1">
                      <span className="rounded bg-gray-200 px-1.5 py-0.5 text-xs dark:bg-gray-700">
                        {r.fromText}
                      </span>
                      <span className="font-medium text-violet-700 dark:text-violet-300">
                        →{REL[r.relationType] ?? "관계"}→
                      </span>
                      <span className="rounded bg-gray-200 px-1.5 py-0.5 text-xs dark:bg-gray-700">
                        {r.toText}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="self-start rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-60"
          >
            {saving ? "저장 중…" : "선택 항목 저장"}
          </button>
        </div>
      )}
    </section>
  );
}
