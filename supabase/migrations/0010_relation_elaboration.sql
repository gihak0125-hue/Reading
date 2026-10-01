-- 관계 유형에 '상술'(elaboration) 추가 (설계지침4.2)
alter type relation_type add value if not exists 'elaboration';
