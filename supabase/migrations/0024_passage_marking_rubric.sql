-- 0024_passage_marking_rubric.sql
-- 지문별 '표시(밑줄·동그라미·관계) 채점 루브릭'(교사 작성, 학생 비노출).
-- 학생 표시를 교사 정답 기준(passage_key_info/passage_key_relations)과 비교해
-- 점수를 낼 때 AI가 이 루브릭의 배점·기준을 최우선 적용한다.
-- 코치/채점은 service-role로 우회해 읽고, 학생에게는 노출되지 않는다.
create table if not exists passage_marking (
  passage_id uuid primary key references passages(id) on delete cascade,
  rubric     text,
  updated_at timestamptz not null default now()
);
alter table passage_marking enable row level security;

-- 교사(소유자)만 읽기/쓰기. 재실행 안전하게 drop 후 생성.
drop policy if exists marking_teacher_all on passage_marking;
create policy marking_teacher_all on passage_marking
  for all
  using (
    is_teacher()
    and passage_id in (select id from passages where created_by = auth.uid())
  )
  with check (
    is_teacher()
    and passage_id in (select id from passages where created_by = auth.uid())
  );
