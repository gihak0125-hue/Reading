"use server";

import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";

/** 지문을 골라 읽기 세션을 시작한다(이미 진행 중이면 그 세션으로 이어감). */
export async function startSession(formData: FormData): Promise<void> {
  const { supabase, user } = await getSessionProfile("/read");
  const passageId = String(formData.get("passage_id") ?? "");
  if (!passageId) redirect("/read");

  // 같은 지문의 진행 중 세션이 있으면 재사용
  const { data: existing } = await supabase
    .from("sessions")
    .select("id")
    .eq("student_id", user.id)
    .eq("passage_id", passageId)
    .eq("status", "in_progress")
    .maybeSingle();

  let sessionId = existing?.id;
  if (!sessionId) {
    const { data, error } = await supabase
      .from("sessions")
      .insert({ student_id: user.id, passage_id: passageId })
      .select("id")
      .single();
    if (error || !data) redirect("/read");
    sessionId = data.id;
  }

  redirect(`/read/${sessionId}`);
}
