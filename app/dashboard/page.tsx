import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signout } from "@/app/login/actions";
import { startSession } from "@/app/read/actions";
import { SubmitButton } from "@/app/submit-button";
import { ADMIN_EMAIL } from "@/lib/admin";
import { CATEGORY_LABEL } from "@/lib/categories";

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden
    >
      {children}
    </svg>
  );
}
const IconRead = (
  <Svg>
    <path d="M4 5a2 2 0 0 1 2-2h12v15H6a2 2 0 0 0-2 2z" />
    <path d="M4 20a2 2 0 0 1 2-2h12" />
    <path d="M9 7h6M9 11h6" />
  </Svg>
);
const IconChart = (
  <Svg>
    <path d="M4 20V11M10 20V4M16 20v-6" />
    <path d="M3 20h18" />
  </Svg>
);
const IconDoc = (
  <Svg>
    <path d="M7 3h7l4 4v14H7z" />
    <path d="M14 3v4h4" />
    <path d="M9 12h6M9 16h4" />
  </Svg>
);
const IconActivity = (
  <Svg>
    <path d="M3 12h4l2 6 4-15 2 9h6" />
  </Svg>
);
const IconClass = (
  <Svg>
    <circle cx="9" cy="8" r="3" />
    <path d="M4 20a5 5 0 0 1 10 0" />
    <path d="M16 5.5a3 3 0 0 1 0 5.6" />
    <path d="M20 20a5 5 0 0 0-4-4.9" />
  </Svg>
);

const CAT_BAR: Record<string, string> = {
  humanities: "bg-rose-400",
  social: "bg-emerald-400",
  science: "bg-sky-400",
  _none: "bg-gray-300 dark:bg-gray-600",
};

type CardDef = {
  href: string;
  title: string;
  desc: string;
  icon: ReactNode;
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name, teacher_status")
    .eq("id", user.id)
    .single();

  const role = profile?.role ?? "student";
  const name = profile?.display_name ?? user.email;
  const isTeacher = role === "teacher";
  const isAdmin = (user.email ?? "").toLowerCase() === ADMIN_EMAIL;
  const isPendingTeacher = !isTeacher && profile?.teacher_status === "pending";

  const cards: CardDef[] = isTeacher
    ? [
        { href: "/teacher/dashboard", title: "대시보드", desc: "우리 반 읽기 활동을 지표로 한눈에 봅니다.", icon: IconChart },
        { href: "/teacher", title: "지문 관리", desc: "지문을 등록하고 핵심정보를 태깅합니다.", icon: IconDoc },
        { href: "/teacher/activity", title: "학생 활동", desc: "학생의 표시·연결·자기설명을 확인합니다.", icon: IconActivity },
        { href: "/teacher/classes", title: "학급 관리", desc: "학급을 만들고 참여코드를 나눠줍니다.", icon: IconClass },
        ...(isAdmin
          ? [{ href: "/admin/teachers", title: "교사 승인", desc: "교사 가입 신청을 검토하고 승인합니다.", icon: IconClass }]
          : []),
      ]
    : [];

  let resume: { id: string; title: string } | null = null;
  let recommend: { id: string; title: string; category: string | null } | null =
    null;
  let latest: {
    fact: number | null;
    inference: number | null;
    critique: number | null;
  } | null = null;
  let doneCount = 0;
  if (!isTeacher) {
    const [{ data: mySessions }, { data: passages }] = await Promise.all([
      supabase
        .from("sessions")
        .select("id, passage_id, status, started_at")
        .eq("student_id", user.id)
        .order("started_at", { ascending: false }),
      supabase
        .from("passages")
        .select("id, title, category, created_at")
        .order("created_at", { ascending: false }),
    ]);
    const sess = mySessions ?? [];
    const ps = passages ?? [];
    const pById = new Map(ps.map((p) => [p.id, p]));
    doneCount = sess.filter((s) => s.status === "completed").length;
    const inprog = sess.find((s) => s.status === "in_progress");
    if (inprog)
      resume = {
        id: inprog.id,
        title: pById.get(inprog.passage_id)?.title ?? "지문",
      };
    const startedPids = new Set(sess.map((s) => s.passage_id));
    const completedPids = new Set(
      sess.filter((s) => s.status === "completed").map((s) => s.passage_id),
    );
    const rec =
      ps.find((p) => !startedPids.has(p.id)) ??
      ps.find((p) => !completedPids.has(p.id)) ??
      null;
    if (rec) recommend = { id: rec.id, title: rec.title, category: rec.category };
    const sessionIds = sess.map((s) => s.id);
    if (sessionIds.length) {
      const { data: scoreRows } = await supabase
        .from("session_scores")
        .select("fact, inference, critique, updated_at")
        .in("session_id", sessionIds)
        .order("updated_at", { ascending: false });
      const rows = scoreRows ?? [];
      if (rows.length) {
        const firstOf = (k: "fact" | "inference" | "critique") =>
          rows.find((r) => r[k] != null)?.[k] ?? null;
        latest = {
          fact: firstOf("fact"),
          inference: firstOf("inference"),
          critique: firstOf("critique"),
        };
      }
    }
  }

  return (
    <main className="mx-auto flex min-h-[80vh] w-full max-w-2xl flex-1 flex-col justify-center gap-8 px-6 py-16">
      <header className="flex items-start justify-between gap-4">
        <div>
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            {isTeacher ? "교사" : "학생"}
          </span>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-800 dark:text-gray-100">
            안녕하세요, {name}님
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {isTeacher
              ? "학생들이 얼마나 성장했을까요?"
              : "오늘도 즐겁게 읽어볼까요?"}
          </p>
        </div>
        <form action={signout}>
          <SubmitButton
            pendingText="로그아웃 중…"
            className="rounded-full border border-gray-300 bg-white/80 px-3 py-1.5 text-sm text-gray-600 transition hover:bg-white disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950/70 dark:text-gray-300 dark:hover:bg-gray-950"
          >
            로그아웃
          </SubmitButton>
        </form>
      </header>

      {isPendingTeacher && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
          <p className="font-semibold">교사 승인 대기 중이에요</p>
          <p className="mt-1 text-amber-800/90 dark:text-amber-300/80">
            관리자가 승인하면 교사 기능을 쓸 수 있어요. 승인 전까지는 학생 화면으로 보입니다.
          </p>
        </div>
      )}

      {isTeacher ? (
        <section className="grid gap-4 sm:grid-cols-2">
          {cards.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="group flex items-start gap-4 rounded-2xl border border-white/70 bg-white/85 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-gray-950/80"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                {c.icon}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1 font-semibold text-gray-800 dark:text-gray-100">
                  {c.title}
                  <span className="text-amber-600 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100 dark:text-amber-400">
                    &rarr;
                  </span>
                </span>
                <span className="mt-1 block text-sm text-gray-500 dark:text-gray-400">
                  {c.desc}
                </span>
              </span>
            </Link>
          ))}
        </section>
      ) : (
        <div className="flex flex-col gap-4">
          <Link
            href="/tutorial"
            className="flex items-center gap-3 rounded-2xl border border-dashed border-amber-300 bg-amber-50/60 px-5 py-3 text-sm text-amber-900 transition hover:bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
          >
            <span className="text-base">✏️</span>
            <span>
              처음이신가요? <b>표시(밑줄·동그라미) 연습</b>을 먼저 해보세요
            </span>
            <span className="ml-auto">&rarr;</span>
          </Link>
          {resume && (
            <Link
              href={"/read/" + resume.id}
              className="group flex items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-amber-900 dark:bg-amber-950/50"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-amber-600 text-white">
                {IconRead}
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-medium text-amber-700 dark:text-amber-300">
                  이어 읽기
                </span>
                <span className="block truncate font-semibold text-gray-800 dark:text-gray-100">
                  {resume.title}
                </span>
              </span>
              <span className="ml-auto text-amber-600 transition group-hover:translate-x-0.5 dark:text-amber-400">
                &rarr;
              </span>
            </Link>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-3 rounded-2xl border border-white/70 bg-white/85 p-5 shadow-sm dark:border-white/10 dark:bg-gray-950/80">
              <span className="text-xs font-medium text-gray-400">오늘의 지문</span>
              {recommend ? (
                <>
                  <div className="flex items-start gap-2">
                    <span
                      className={
                        "mt-1 h-3 w-3 shrink-0 rounded-full " +
                        (CAT_BAR[recommend.category ?? "_none"] ?? CAT_BAR._none)
                      }
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 dark:text-gray-100">
                        {recommend.title}
                      </p>
                      <p className="text-xs text-gray-400">
                        {recommend.category
                          ? CATEGORY_LABEL[recommend.category]
                          : "미분류"}
                      </p>
                    </div>
                  </div>
                  <form action={startSession} className="mt-auto">
                    <input type="hidden" name="passage_id" value={recommend.id} />
                    <SubmitButton
                      pendingText="여는 중…"
                      className="w-full rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-60"
                    >
                      읽기 시작
                    </SubmitButton>
                  </form>
                </>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  새 지문이 없어요.{" "}
                  <Link
                    href="/read"
                    className="text-amber-700 hover:underline dark:text-amber-400"
                  >
                    전체 보기
                  </Link>
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-white/70 bg-white/85 p-5 shadow-sm dark:border-white/10 dark:bg-gray-950/80">
              <span className="text-xs font-medium text-gray-400">내 최근 점수</span>
              {latest ? (
                <div className="grid grid-cols-3 gap-2 text-center">
                  {(
                    [
                      ["사실", latest.fact],
                      ["추론", latest.inference],
                      ["비판", latest.critique],
                    ] as [string, number | null][]
                  ).map(([label, v]) => (
                    <div
                      key={label}
                      className="rounded-xl bg-gray-50 py-3 dark:bg-gray-900"
                    >
                      <div className="text-lg font-bold text-gray-800 dark:text-gray-100">
                        {v == null ? "–" : v}
                      </div>
                      <div className="text-[11px] text-gray-400">{label}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  아직 점수가 없어요. 지문을 읽고 확인해 보세요.
                </p>
              )}
              <p className="mt-auto text-[11px] text-gray-400">
                완료한 읽기 {doneCount}개
              </p>
            </div>
          </div>

          <Link
            href="/read"
            className="group flex items-center gap-4 rounded-2xl border border-white/70 bg-white/85 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-gray-950/80"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              {IconRead}
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-gray-800 dark:text-gray-100">
                지문 전체 보기
              </span>
              <span className="mt-1 block text-sm text-gray-500 dark:text-gray-400">
                분야별로 골라 읽어요.
              </span>
            </span>
            <span className="ml-auto text-amber-600 opacity-0 transition group-hover:opacity-100 dark:text-amber-400">
              &rarr;
            </span>
          </Link>
        </div>
      )}

      {!isTeacher && (
        <p className="text-sm text-gray-400">
          반을 바꾸거나 코드를 나중에 입력하려면{" "}
          <Link
            href="/join"
            className="text-amber-700 hover:underline dark:text-amber-400"
          >
            학급 참여 &rarr;
          </Link>
        </p>
      )}
    </main>
  );
}
