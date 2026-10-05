-- 0023_check_detail_main.sql
-- 독해 확인 점수를 세부·중심·추론 3개로 세분. detail/main 컬럼 추가.
alter table session_scores add column if not exists detail int;
alter table session_scores add column if not exists main   int;
