-- 진단 저장/열람 정책 (설계지침6.1·6.2 4영역 진단)
-- step는 영역 기준 진단이라 선택값으로
alter table diagnoses alter column step drop not null;

-- 학생: 자기 세션 진단 insert 허용(코치가 서버에서 학생 권한으로 기록)
create policy diag_owner_insert on diagnoses
  for insert with check (
    session_id in (select id from sessions where student_id = auth.uid())
  );

-- 교사: 학생 진단 읽기(파일럿: 모든 교사)
create policy diag_teacher_read on diagnoses
  for select using (is_teacher());
