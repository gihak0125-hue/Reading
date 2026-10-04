-- 0020_session_scores.sql
-- 읽기 결과 점수 저장(형성 평가). stage: reading(표시)·review(독해확인+관점평가).
create table if not exists session_scores (
  session_id uuid not null references sessions(id) on delete cascade,
  stage      text not null check (stage in ('reading', 'review')),
  fact       int,
  inference  int,
  critique   int,
  comment    text,
  updated_at timestamptz not null default now(),
  primary key (session_id, stage)
);
alter table session_scores enable row level security;

-- 학생: 자기 세션 점수 읽기/쓰기(채점은 서버에서 학생 권한으로 기록)
create policy scores_owner on session_scores
  for all
  using (session_id in (select id from sessions where student_id = auth.uid()))
  with check (session_id in (select id from sessions where student_id = auth.uid()));

-- 교사: 자기 학급 학생 점수 열람(teacher_class_ids는 0016)
create policy scores_teacher_read on session_scores
  for select
  using (
    session_id in (
      select s.id from sessions s
      join profiles p on p.id = s.student_id
      where p.class_id in (select teacher_class_ids())
    )
  );
