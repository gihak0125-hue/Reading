"use client";

type Row = {
  no: number | null;
  name: string;
  reading: number | null;
  check: number | null;
  critique: number | null;
};

/** 학생별 현황을 CSV(엑셀 호환, UTF-8 BOM)로 내려받는다. */
export function ExportCsv({ rows }: { rows: Row[] }) {
  function download() {
    const header = ["번호", "이름", "읽기", "독해확인", "관점평가"];
    const esc = (v: string | number) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const lines = [header.join(",")];
    for (const r of rows)
      lines.push(
        [r.no ?? "", r.name, r.reading ?? "", r.check ?? "", r.critique ?? ""]
          .map(esc)
          .join(","),
      );
    const csv = "\uFEFF" + lines.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "학생별_현황.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={rows.length === 0}
      className="shrink-0 rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
    >
      CSV 내보내기
    </button>
  );
}
