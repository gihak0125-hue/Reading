-- 0004_relation_notation.sql
-- 관계 표기 확장: '과정(process)', '문답(question_answer)' 관계 유형 추가 +
-- 관계의 시작 표시를 가리키는 from_ref 컬럼 추가.

alter type relation_type add value if not exists 'process';
alter type relation_type add value if not exists 'question_answer';

alter table annotations
  add column if not exists from_ref uuid references annotations(id) on delete cascade;
