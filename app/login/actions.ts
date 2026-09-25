"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string };

function safeNext(next: FormDataEntryValue | null): string {
  const s = typeof next === "string" ? next : "";
  // 오픈 리다이렉트 방지: 내부 경로만 허용
  return s.startsWith("/") && !s.startsWith("//") ? s : "/dashboard";
}

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));
  if (!email || !password) return { error: "이메일과 비밀번호를 입력하세요." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "로그인 실패: 이메일 또는 비밀번호를 확인하세요." };

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signup(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();
  const roleRaw = String(formData.get("role") ?? "student");
  const role = roleRaw === "teacher" ? "teacher" : "student";
  const next = safeNext(formData.get("next"));

  if (!email || !password) return { error: "이메일과 비밀번호를 입력하세요." };
  if (password.length < 6)
    return { error: "비밀번호는 6자 이상이어야 합니다." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName || email, role } },
  });
  if (error) return { error: `가입 실패: ${error.message}` };

  // 이메일 확인이 켜져 있으면 세션이 없다 → 안내 메시지
  if (!data.session) {
    return {
      message:
        "가입 완료! 이메일로 온 확인 링크를 클릭한 뒤 로그인하세요. (이메일 확인이 꺼져 있으면 바로 로그인됩니다)",
    };
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
