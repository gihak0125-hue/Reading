-- 지문별 '독해 확인 문항'(세부·중심·추론, 교사 작성). 모범답안 가이드는 학생 비노출.
create table if not exists passage_checks (
  passage_id   uuid primary key references passages(id) on delete cascade,
  detail_q     text,
  detail_a     text,
  main_q       text,
  main_a       text,
  inference_q  text,
  inference_a  text,
  updated_at   timestamptz not null default now()
);
alter table passage_checks enable row level security;

create policy checks_teacher_all on passage_checks
  for all
  using (
    is_teacher()
    and passage_id in (select id from passages where created_by = auth.uid())
  )
  with check (
    is_teacher()
    and passage_id in (select id from passages where created_by = auth.uid())
  );
