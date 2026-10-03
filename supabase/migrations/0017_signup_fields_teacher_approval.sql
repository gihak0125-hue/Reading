-- 0017_signup_fields_teacher_approval.sql
-- 가입 확장: 학생 출석번호, 교사 소속 학교명, 교사 '승인 대기→승인' 흐름.
--  · 교사로 신청해도 승인 전까지는 role='student' 로 두고 teacher_status='pending'.
--  · 관리자(앱 내)가 승인하면 role='teacher', teacher_status='approved'.

alter table profiles add column if not exists school       text;
alter table profiles add column if not exists student_no   int;
alter table profiles add column if not exists teacher_status text
  not null default 'none'
  check (teacher_status in ('none', 'pending', 'approved'));

-- 가입 트리거 교체: 메타데이터에서 이름/학교/번호/신청역할을 읽어 프로필 구성.
-- 교사 신청(requested_role='teacher')은 승인 전이라 role 은 student, teacher_status='pending'.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  req text := coalesce(new.raw_user_meta_data->>'requested_role',
                       new.raw_user_meta_data->>'role', 'student');
begin
  insert into public.profiles (id, role, display_name, school, student_no, teacher_status)
  values (
    new.id,
    'student',
    coalesce(new.raw_user_meta_data->>'display_name', new.email),
    nullif(new.raw_user_meta_data->>'school', ''),
    nullif(new.raw_user_meta_data->>'student_no', '')::int,
    case when req = 'teacher' then 'pending' else 'none' end
  );
  return new;
end;
$$;
