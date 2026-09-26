"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";

export type JoinState = { error?: string; ok?: string };

export async function joinClass(
  _prev: JoinState,
  formData: FormData,
): Promise<JoinState> {
  const { supabase } = await getSessionProfile("/join");
  const code = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase();
  if (!code) return { error: "참여코드를 입력하세요." };

  const { data, error } = await supabase.rpc("join_class", { p_code: code });
  if (error) return { error: `참여 실패: ${error.message}` };
  if (!data) return { error: "그런 참여코드가 없어요. 코드를 확인해 주세요." };

  revalidatePath("/join");
  revalidatePath("/dashboard");
  return { ok: `'${data}' 학급에 참여했어요!` };
}
