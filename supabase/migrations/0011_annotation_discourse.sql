-- 표시 유형에 '담화표지'(discourse) 추가 (설계지침4.3)
alter type annotation_type add value if not exists 'discourse';
