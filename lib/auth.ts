import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** 로그인 사용자 + 프로필(역할) 조회. 미로그인 시 /login 으로. */
export async function getSessionProfile(next = "/dashboard") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("id", user.id)
    .single();

  return { supabase, user, profile };
}

/** 교사 전용 페이지 가드. 교사가 아니면 대시보드로. */
export async function requireTeacher(next = "/teacher") {
  const ctx = await getSessionProfile(next);
  if (ctx.profile?.role !== "teacher") redirect("/dashboard");
  return ctx;
}
