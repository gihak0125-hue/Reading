"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";

/** 교사 가입 신청 승인: role=teacher, teacher_status=approved. 관리자 전용. */
export async function approveTeacher(
  userId: string,
): Promise<{ error?: string; ok?: boolean }> {
  const admin = await getAdminUser();
  if (!admin) return { error: "권한이 없습니다." };
  const svc = createServiceClient();
  if (!svc) return { error: "서버 설정 오류(service role 키 없음)." };

  const { error } = await svc
    .from("profiles")
    .update({ role: "teacher", teacher_status: "approved" })
    .eq("id", userId);
  if (error) return { error: `승인 실패: ${error.message}` };

  revalidatePath("/admin/teachers");
  return { ok: true };
}

/** 교사 가입 신청 반려: teacher_status=none(학생으로 유지). 관리자 전용. */
export async function rejectTeacher(
  userId: string,
): Promise<{ error?: string; ok?: boolean }> {
  const admin = await getAdminUser();
  if (!admin) return { error: "권한이 없습니다." };
  const svc = createServiceClient();
  if (!svc) return { error: "서버 설정 오류(service role 키 없음)." };

  const { error } = await svc
    .from("profiles")
    .update({ teacher_status: "none" })
    .eq("id", userId);
  if (error) return { error: `반려 실패: ${error.message}` };

  revalidatePath("/admin/teachers");
  return { ok: true };
}
