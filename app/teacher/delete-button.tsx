"use client";

import { useFormStatus } from "react-dom";
import { deletePassage } from "./actions";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60 dark:hover:bg-red-950"
    >
      {pending ? "삭제 중…" : "삭제"}
    </button>
  );
}

export function DeleteButton({ id }: { id: string }) {
  return (
    <form
      action={deletePassage}
      onSubmit={(e) => {
        if (
          !confirm(
            "이 지문을 삭제할까요?\n관련 학생 활동 기록(표시·자기설명·진단)도 함께 지워집니다.",
          )
        )
          e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <SubmitBtn />
    </form>
  );
}
