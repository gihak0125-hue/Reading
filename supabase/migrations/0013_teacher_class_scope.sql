-- 교사 열람을 '자기 학급 학생'으로 좁힌다(헌법 3.2). 파일럿의 전체 열람 정책 제거.
-- 코치가 쓰는 service-role 클라이언트는 RLS를 우회하므로 진단은 영향 없음.

-- 1) 광범위(is_teacher) 열람 정책 제거
drop policy if exists sessions_teacher_all on sessions;        -- 0006
drop policy if exists profiles_teacher_read on profiles;        -- 0006
drop policy if exists anno_teacher_read on annotations;         -- 0006
drop policy if exists selfexp_teacher_read on self_explanations; -- 0006
drop policy if exists agentmsg_teacher_read on agent_messages;  -- 0006
drop policy if exists diag_teacher_read on diagnoses;           -- 0011
-- 참고: sessions 는 0001 의 sessions_teacher_read(학급 범위)가 이미 있어 그대로 둔다.

-- 2) 학급 범위 열람 정책 추가
--    (학생 프로필의 class_id 가 '현재 교사의 학급'에 속할 때만 열람)

create policy profiles_teacher_class_read on profiles
  for select using (
    is_teacher()
    and class_id in (select id from classes where teacher_id = auth.uid())
  );

create policy anno_teacher_class_read on annotations
  for select using (
    is_teacher()
    and session_id in (
      select s.id
      from sessions s
      join profiles p on p.id = s.student_id
      where p.class_id in (select id from classes where teacher_id = auth.uid())
    )
  );

create policy selfexp_teacher_class_read on self_explanations
  for select using (
    is_teacher()
    and session_id in (
      select s.id
      from sessions s
      join profiles p on p.id = s.student_id
      where p.class_id in (select id from classes where teacher_id = auth.uid())
    )
  );

create policy agentmsg_teacher_class_read on agent_messages
  for select using (
    is_teacher()
    and session_id in (
      select s.id
      from sessions s
      join profiles p on p.id = s.student_id
      where p.class_id in (select id from classes where teacher_id = auth.uid())
    )
  );

create policy diag_teacher_class_read on diagnoses
  for select using (
    is_teacher()
    and session_id in (
      select s.id
      from sessions s
      join profiles p on p.id = s.student_id
      where p.class_id in (select id from classes where teacher_id = auth.uid())
    )
  );
