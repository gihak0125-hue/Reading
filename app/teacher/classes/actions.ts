"use server";

import { revalidatePath } from "next/cache";
import { requireTeacher } from "@/lib/auth";

export type ClassState = { error?: string; ok?: string };

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 헷갈리는 0,O,1,I 제외
function genCode(len = 6): string {
  let s = "";
  for (let i = 0; i < len; i++)
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

export async function createClass(
  _prev: ClassState,
  formData: FormData,
): Promise<ClassState> {
  const { supabase, user } = await requireTeacher("/teacher/classes");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "학급 이름을 입력하세요." };

  // 코드 충돌 시 몇 번 재시도
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = genCode();
    const { error } = await supabase
      .from("classes")
      .insert({ teacher_id: user.id, name, join_code: code });
    if (!error) {
      revalidatePath("/teacher/classes");
      return { ok: `학급 '${name}' 생성 완료 (코드 ${code})` };
    }
    if (!error.message.toLowerCase().includes("duplicate")) {
      return { error: `생성 실패: ${error.message}` };
    }
  }
  return { error: "코드 생성에 실패했어요. 다시 시도해 주세요." };
}

export async function deleteClass(formData: FormData): Promise<void> {
  const { supabase } = await requireTeacher("/teacher/classes");
  const id = String(formData.get("id") ?? "");
  if (id) await supabase.from("classes").delete().eq("id", id);
  revalidatePath("/teacher/classes");
}
