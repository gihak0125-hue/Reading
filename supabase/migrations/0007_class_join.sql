-- 0007_class_join.sql
-- 학급 참여: 학생이 참여코드로 학급에 들어가는 안전한 함수 + 학생의 학급 열람 정책.

-- 학생이 참여코드로 자기 학급을 설정(본인 프로필만 수정). security definer 로 RLS 우회하되
-- auth.uid() 본인 프로필만 건드리므로 안전.
create or replace function join_class(p_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid;
  cname text;
begin
  select id, name into cid, cname
  from classes
  where join_code = upper(btrim(p_code));

  if cid is null then
    return null;
  end if;

  update profiles set class_id = cid where id = auth.uid();
  return cname;
end;
$$;

grant execute on function join_class(text) to anon, authenticated;

-- 학생이 '자기가 속한 학급' 행을 읽을 수 있게(학급 이름 표시용). (classes_teacher 에 additive)
create policy classes_member_read on classes
  for select using (
    id in (select class_id from profiles where id = auth.uid())
  );
