-- 0003_teacher_content_write.sql
-- 교사가 자기 지문의 문단(passage_paragraphs)과 핵심정보(passage_key_info)를
-- 쓰기(insert/update/delete)할 수 있도록 RLS 정책 추가.
-- (0001의 select 정책에 더해 additive 로 적용된다.)

-- 문단: 교사가 자기(created_by) 지문의 문단을 쓰기 가능
create policy paragraphs_teacher_write on passage_paragraphs
  for all
  using (
    is_teacher()
    and passage_id in (select id from passages where created_by = auth.uid())
  )
  with check (
    is_teacher()
    and passage_id in (select id from passages where created_by = auth.uid())
  );

-- 핵심정보: 교사가 자기 지문에 속한 문단의 핵심정보를 쓰기 가능
create policy keyinfo_teacher_write on passage_key_info
  for all
  using (
    is_teacher()
    and paragraph_id in (
      select pp.id
      from passage_paragraphs pp
      join passages p on p.id = pp.passage_id
      where p.created_by = auth.uid()
    )
  )
  with check (
    is_teacher()
    and paragraph_id in (
      select pp.id
      from passage_paragraphs pp
      join passages p on p.id = pp.passage_id
      where p.created_by = auth.uid()
    )
  );
