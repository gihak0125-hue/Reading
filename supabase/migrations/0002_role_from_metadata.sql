-- 0002_role_from_metadata.sql
-- 회원가입 시 선택한 역할(student/teacher)을 프로필에 반영한다.
-- 0001 의 handle_new_user 를 교체(역할을 metadata 에서 읽음).

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'student'),
    coalesce(new.raw_user_meta_data->>'display_name', new.email)
  );
  return new;
end;
$$;
