-- 0009_relation_similarity_contrast.sql
-- 비교 관계를 공통점/차이점으로 세분하기 위한 관계 유형 추가.
--   similarity = 공통점(비교), contrast = 차이점(대조)

alter type relation_type add value if not exists 'similarity';
alter type relation_type add value if not exists 'contrast';
