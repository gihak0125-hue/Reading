-- 0026_session_scores_mark_stats.sql
-- 학생 '표시량'을 채점 기준이 아닌 연구용 데이터로만 수집.
-- reading 단계 채점 시 함께 기록: 표시 비율·개수·정확도·포괄도.
-- (채점 점수 fact/inference 산정에는 '양'을 쓰지 않음 — 정확도만 사용)
alter table session_scores add column if not exists mark_ratio     real;
alter table session_scores add column if not exists mark_count     smallint;
alter table session_scores add column if not exists mark_precision real;
alter table session_scores add column if not exists mark_recall    real;
