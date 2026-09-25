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

/**
 * 로그인/회원가입을 하나의 액션으로 처리한다.
 * 어떤 동작인지는 폼의 hidden input `intent` 로 명확히 전달받는다
 * (mode 상태에 의존하지 않아 안전).
 */
export async function authenticate(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const intent = String(formData.get("intent") ?? "login");
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!email || !password) return { error: "이메일과 비밀번호를 입력하세요." };

  const supabase = await createClient();

  if (intent === "signup") {
    if (password.length < 6)
      return { error: "비밀번호는 6자 이상이어야 합니다." };
    const displayName = String(formData.get("display_name") ?? "").trim();
    const role =
      String(formData.get("role") ?? "student") === "teacher"
        ? "teacher"
        : "student";

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName || email, role } },
    });
    if (error) return { error: `가입 실패: ${error.message}` };
    if (!data.session) {
      return {
        message:
          "가입 완료! 이메일 확인이 켜져 있어요. 확인 링크를 누르거나, 설정에서 이메일 확인을 끄면 바로 로그인됩니다.",
      };
    }
    revalidatePath("/", "layout");
    redirect(next);
  }

  // intent === "login"
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return {
        error:
          "이메일 미확인 상태입니다. SQL로 확인 처리했는지 확인하거나 다시 시도하세요.",
      };
    }
    return { error: "로그인 실패: 이메일 또는 비밀번호를 확인하세요." };
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
