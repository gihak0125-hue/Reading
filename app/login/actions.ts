"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

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
    const school = String(formData.get("school") ?? "").trim();
    const studentNo = String(formData.get("student_no") ?? "").trim();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || email,
          requested_role: role,
          school,
          student_no: studentNo,
        },
      },
    });
    if (error) return { error: `가입 실패: ${error.message}` };

    // 이메일 확인 절차 없이 바로 쓰도록: 가입 즉시 서버(서비스 롤)에서 확인 처리.
    // (Supabase 'Confirm email'이 켜져 있어도 학생이 링크 없이 로그인 가능)
    const svc = createServiceClient();
    if (svc && data.user?.id) {
      try {
        await svc.auth.admin.updateUserById(data.user.id, {
          email_confirm: true,
        });
      } catch {
        // 서비스 롤 없거나 실패 시 아래 폴백 안내로 처리
      }
    }

    // 교사는 승인 전까지 로그인하지 않도록 바로 로그아웃하고 안내만 보여준다.
    if (role === "teacher") {
      await supabase.auth.signOut();
      return {
        message:
          "교사 가입 신청이 접수됐어요. 관리자 승인 후 로그인하면 교사 기능을 사용할 수 있어요.",
      };
    }

    // 학생: 확인이 켜져 있어 세션이 없으면(위에서 확인 처리됨) 지금 바로 로그인시킨다.
    if (!data.session) {
      const { error: siErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (siErr) {
        return {
          message: "가입이 완료됐어요. 로그인 화면에서 로그인해 주세요.",
        };
      }
    }
    const code = String(formData.get("join_code") ?? "")
      .trim()
      .toUpperCase();
    if (code) {
      await supabase.rpc("join_class", { p_code: code });
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
  redirect("/");
}
