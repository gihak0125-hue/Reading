-- 0016_fix_profiles_rls_recursion.sql
-- 0013의 profiles_teacher_class_read 가 is_teacher()를 호출하고, is_teacher()가 다시
-- profiles 를 조회하면서 profiles 정책이 자기 자신을 무한 호출 → "infinite recursion
-- detected in policy for relation profiles". 모든 프로필 읽기가 실패해 역할 판별 불가.
-- 해결: RLS를 우회하는 SECURITY DEFINER 함수(plpgsql — 인라인되지 않아 정의자 권한 유지)로
--       교체해 재귀 고리를 끊는다.

-- 1) is_teacher: sql→plpgsql SECURITY DEFINER (정의자 권한으로 RLS 우회, 인라인 방지)
create or replace function is_teacher() returns boolean
language plpgsql stable security definer set search_path = public as $$
declare r boolean;
begin
  select (role = 'teacher') into r from profiles where id = auth.uid();
  return coalesce(r, false);
end;
$$;

-- 2) 내가 가르치는 학급 id 집합 (RLS 우회)
create or replace function teacher_class_ids() returns setof uuid
language plpgsql stable security definer set search_path = public as $$
begin
  return query select id from classes where teacher_id = auth.uid();
end;
$$;

-- 3) profiles 교사 열람 정책을 재귀 없는 버전으로 교체
--    (is_teacher() 없이도 '내 학급 소속'이라는 조건만으로 교사에게만 적용됨)
drop policy if exists profiles_teacher_class_read on profiles;
create policy profiles_teacher_class_read on profiles
  for select using (class_id in (select teacher_class_ids()));
