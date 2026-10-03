import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { PendingRow } from "./row";

export default async function TeacherApprovalsPage() {
  const admin = await getAdminUser();
  if (!admin) redirect("/dashboard");

  const svc = createServiceClient();

  let rows: { id: string; name: string; school: string; email: string }[] = [];
  let configError = false;

  if (!svc) {
    configError = true;
  } else {
    const { data: pending } = await svc
      .from("profiles")
      .select("id, display_name, school")
      .eq("teacher_status", "pending");

    // 이메일은 auth.users 에서(서비스 전용) 매핑
    const emailById = new Map<string, string>();
    const { data: list } = await svc.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    for (const u of list?.users ?? []) emailById.set(u.id, u.email ?? "");

    rows = (pending ?? []).map((p) => ({
      id: p.id,
      name: p.display_name ?? "(이름 없음)",
      school: p.school ?? "",
      email: emailById.get(p.id) ?? "",
    }));
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-12">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">교사 가입 승인</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            교사로 신청한 계정을 검토하고 승인합니다.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          대시보드
        </Link>
      </header>

      {configError ? (
        <p className="rounded-lg border border-dashed border-red-300 p-6 text-center text-sm text-red-500 dark:border-red-800">
          서버에 service role 키가 설정되지 않아 신청 목록을 읽을 수 없어요.
          (배포 환경에서만 동작)
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700">
          대기 중인 교사 신청이 없습니다.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <PendingRow
              key={r.id}
              id={r.id}
              name={r.name}
              school={r.school}
              email={r.email}
            />
          ))}
        </ul>
      )}
    </main>
  );
}
