-- 0018_passage_category.sql
-- 지문 분야 구분(학생 선택 화면 분류용): 인문·예술/사회/과학·기술.
alter table passages add column if not exists category text
  check (category in ('humanities', 'social', 'science'));

-- 기존 '인격 동일성' 지문은 인문·예술로 분류.
update passages set category = 'humanities'
where category is null
  and (title ilike '%인격%동일성%' or title ilike '%인격 동일성%');
