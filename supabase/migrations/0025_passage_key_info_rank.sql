-- 0025_passage_key_info_rank.sql
-- 중심문장(key_sentence)의 문단 내 중요도 순위(1=가장 중요)를 저장.
-- AI 추천 저장 시 순위를 함께 기록해, 본문·기록 목록에서 1·2·3 순위로 보이게 한다.
-- nullable: 수동 태깅이나 중심화제(keyword)에는 순위가 없을 수 있다.
alter table passage_key_info add column if not exists rank smallint;
