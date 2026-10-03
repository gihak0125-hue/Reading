"use client";

import { useState, useTransition } from "react";
import { approveTeacher, rejectTeacher } from "../actions";

export function PendingRow({
  id,
  name,
  school,
  email,
}: {
  id: string;
  name: string;
  school: string;
  email: string;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState<"approved" | "rejected" | null>(null);

  const run = (kind: "approve" | "reject") =>
    start(async () => {
      setMsg("");
      const res =
        kind === "approve" ? await approveTeacher(id) : await rejectTeacher(id);
      if (res.error) setMsg(res.error);
      else setDone(kind === "approve" ? "approved" : "rejected");
    });

  if (done) {
    return (
      <li className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-800">
        <span>
          {name} · {school || "학교 미입력"}
        </span>
        <span
          className={
            done === "approved"
              ? "font-medium text-green-700 dark:text-green-400"
              : "font-medium text-gray-400"
          }
        >
          {done === "approved" ? "승인됨 ✓" : "반려됨"}
        </span>
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium">{name}</p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {school || "학교 미입력"}
          {email ? ` · ${email}` : ""}
        </p>
        {msg && <p className="mt-1 text-xs text-red-600">{msg}</p>}
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => run("approve")}
          disabled={pending}
          className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-60"
        >
          승인
        </button>
        <button
          type="button"
          onClick={() => run("reject")}
          disabled={pending}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          반려
        </button>
      </div>
    </li>
  );
}
