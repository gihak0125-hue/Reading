-- 0019_freehand.sql
-- 학생 자유 필기(손그림) 저장. 본문 위에 그린 획을 그대로 보존한다.
create table if not exists freehand_strokes (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  d          text not null,                 -- SVG path (본문 컨테이너 기준 좌표)
  color      text not null default '#1d4ed8',
  created_at timestamptz not null default now()
);
alter table freehand_strokes enable row level security;

-- 학생: 자기 세션의 필기만
create policy freehand_owner on freehand_strokes
  for all
  using (session_id in (select id from sessions where student_id = auth.uid()))
  with check (session_id in (select id from sessions where student_id = auth.uid()));

-- 교사: 자기 학급 학생의 필기 열람(teacher_class_ids는 0016에서 정의, RLS 우회)
create policy freehand_teacher_read on freehand_strokes
  for select
  using (
    session_id in (
      select s.id from sessions s
      join profiles p on p.id = s.student_id
      where p.class_id in (select teacher_class_ids())
    )
  );
