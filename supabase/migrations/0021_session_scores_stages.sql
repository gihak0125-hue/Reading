-- 0021_session_scores_stages.sql
-- 점수 단계를 reading/check/critique로 세분(리뷰를 독해확인·관점평가로 분리).
alter table session_scores drop constraint if exists session_scores_stage_check;
alter table session_scores
  add constraint session_scores_stage_check
  check (stage in ('reading', 'check', 'critique', 'review'));
