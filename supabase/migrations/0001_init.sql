-- 0001_init.sql — 초기 스키마 (plan.md §5 기반)
-- 대상: Supabase Postgres. 모든 테이블 RLS 적용.
-- 주의: 이 SQL은 초안이며 Supabase 프로젝트 연결 후 적용/검증한다.

-- ========== ENUM ==========
create type user_role       as enum ('student', 'teacher');
create type key_info_kind   as enum ('keyword', 'key_sentence');
create type annotation_type as enum ('underline', 'circle', 'arrow');
create type relation_type   as enum ('compare_contrast', 'cause_effect', 'problem_solution', 'listing');
create type session_status  as enum ('in_progress', 'completed', 'abandoned');
create type reading_step     as enum ('S1', 'S2', 'S3', 'S4', 'S5');

-- ========== PROFILES ==========
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  role         user_role not null default 'student',
  display_name text,
  class_id     uuid,
  created_at   timestamptz not null default now()
);

-- ========== CLASSES ==========
create table classes (
  id         uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references profiles(id) on delete cascade,
  name       text not null,
  join_code  text unique not null,
  created_at timestamptz not null default now()
);
alter table profiles add constraint profiles_class_fk
  foreign key (class_id) references classes(id) on delete set null;

-- ========== PASSAGES (교사 지문 은행) ==========
create table passages (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text not null,
  difficulty int  check (difficulty between 1 and 5),
  source     text,
  created_by uuid not null references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table passage_paragraphs (
  id             uuid primary key default gen_random_uuid(),
  passage_id     uuid not null references passages(id) on delete cascade,
  seq            int  not null,
  text           text not null,
  structure_type relation_type,
  unique (passage_id, seq)
);

-- 진단 기준이 되는 정답 핵심정보
create table passage_key_info (
  id           uuid primary key default gen_random_uuid(),
  paragraph_id uuid not null references passage_paragraphs(id) on delete cascade,
  span_start   int  not null,
  span_end     int  not null,
  kind         key_info_kind not null
);

-- ========== SESSIONS ==========
create table sessions (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  passage_id uuid not null references passages(id) on delete restrict,
  status     session_status not null default 'in_progress',
  started_at timestamptz not null default now(),
  ended_at   timestamptz
);

-- 학습자 표시(밑줄/동그라미/화살표)
create table annotations (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references sessions(id) on delete cascade,
  paragraph_id  uuid not null references passage_paragraphs(id) on delete cascade,
  type          annotation_type not null,
  span_start    int,
  span_end      int,
  target_ref    uuid,            -- arrow: 연결 대상 annotation id
  relation_type relation_type,   -- arrow: 관계 유형
  note          text,
  created_at    timestamptz not null default now()
);

create table self_explanations (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references sessions(id) on delete cascade,
  step        reading_step not null,
  learner_text text not null,
  created_at  timestamptz not null default now()
);

-- 원리5 진단 결과
create table diagnoses (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references sessions(id) on delete cascade,
  step            reading_step not null,
  difficulty_area text,
  evidence        text,
  created_at      timestamptz not null default now()
);

create table agent_messages (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  role       text not null check (role in ('agent', 'student')),
  step       reading_step,
  content    text not null,
  model_used text,
  tokens     int,
  created_at timestamptz not null default now()
);

-- ========== RLS ==========
alter table profiles           enable row level security;
alter table classes            enable row level security;
alter table passages           enable row level security;
alter table passage_paragraphs enable row level security;
alter table passage_key_info   enable row level security;
alter table sessions           enable row level security;
alter table annotations        enable row level security;
alter table self_explanations  enable row level security;
alter table diagnoses          enable row level security;
alter table agent_messages     enable row level security;

-- 헬퍼: 현재 사용자가 교사인가
create or replace function is_teacher() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from profiles where id = auth.uid() and role = 'teacher');
$$;

-- profiles: 본인 행 접근
create policy profiles_self on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- sessions: 학생=본인, 교사=본인 학급 학생
create policy sessions_student on sessions
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy sessions_teacher_read on sessions
  for select using (
    is_teacher() and student_id in (
      select p.id from profiles p
      join classes c on c.id = p.class_id
      where c.teacher_id = auth.uid()
    )
  );

-- annotations / self_explanations / diagnoses / agent_messages: 세션 소유 학생 기준
--  (교사 읽기 정책은 M4 대시보드 구현 시 세분화한다)
create policy anno_owner on annotations
  for all using (session_id in (select id from sessions where student_id = auth.uid()))
  with check (session_id in (select id from sessions where student_id = auth.uid()));
create policy selfexp_owner on self_explanations
  for all using (session_id in (select id from sessions where student_id = auth.uid()))
  with check (session_id in (select id from sessions where student_id = auth.uid()));
create policy diag_owner_read on diagnoses
  for select using (session_id in (select id from sessions where student_id = auth.uid()));
create policy agentmsg_owner_read on agent_messages
  for select using (session_id in (select id from sessions where student_id = auth.uid()));
-- diagnoses/agent_messages 쓰기는 서버(service_role)만: RLS 우회하므로 별도 정책 불필요.

-- passages: 학생 read, 교사 write (배정 로직은 이후 세분화)
create policy passages_read on passages for select using (true);
create policy passages_teacher_write on passages
  for all using (is_teacher()) with check (is_teacher());
create policy paragraphs_read on passage_paragraphs for select using (true);
create policy keyinfo_teacher_read on passage_key_info
  for select using (is_teacher());  -- 정답 핵심정보는 학생에게 직접 노출 금지

-- classes: 교사 본인 것
create policy classes_teacher on classes
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
