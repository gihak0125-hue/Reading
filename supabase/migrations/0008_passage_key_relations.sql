-- 0008_passage_key_relations.sql
-- 교사(또는 AI 추천→교사 승인)가 지정하는 '정답 관계' 저장 테이블.
-- 두 핵심 구간(from/to) 사이의 관계 유형을 담는다.

create table passage_key_relations (
  id                uuid primary key default gen_random_uuid(),
  passage_id        uuid not null references passages(id) on delete cascade,
  from_paragraph_id uuid not null references passage_paragraphs(id) on delete cascade,
  from_start        int  not null,
  from_end          int  not null,
  to_paragraph_id   uuid not null references passage_paragraphs(id) on delete cascade,
  to_start          int  not null,
  to_end            int  not null,
  relation_type     relation_type not null,
  created_at        timestamptz not null default now()
);

alter table passage_key_relations enable row level security;

create policy keyrel_teacher_write on passage_key_relations
  for all
  using (
    is_teacher()
    and passage_id in (select id from passages where created_by = auth.uid())
  )
  with check (
    is_teacher()
    and passage_id in (select id from passages where created_by = auth.uid())
  );

create policy keyrel_teacher_read on passage_key_relations
  for select using (is_teacher());
