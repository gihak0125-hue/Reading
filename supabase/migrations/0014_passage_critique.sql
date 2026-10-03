-- 지문별 '관점 평가 가이드'(교사 작성, 학생 비노출). 코치의 비판적 독해 내부 근거용.
create table if not exists passage_critique (
  passage_id uuid primary key references passages(id) on delete cascade,
  note       text,
  updated_at timestamptz not null default now()
);
alter table passage_critique enable row level security;

-- 교사(소유자)만 읽기/쓰기. 학생은 접근 불가(코치는 service-role로 우회해 읽음).
create policy critique_teacher_all on passage_critique
  for all
  using (
    is_teacher()
    and passage_id in (select id from passages where created_by = auth.uid())
  )
  with check (
    is_teacher()
    and passage_id in (select id from passages where created_by = auth.uid())
  );
