-- 0022_scoring_rubric.sql
-- 서술형 채점 루브릭(교사 작성, 학생 비노출). 독해 확인/관점 평가 채점 기준.
alter table passage_checks   add column if not exists rubric text;
alter table passage_critique add column if not exists rubric text;
