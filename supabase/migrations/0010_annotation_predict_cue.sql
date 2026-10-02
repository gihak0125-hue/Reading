-- 표시 유형에 '예측단서'(predict_cue) 추가 (설계지침5.1 예측 자기설명 유도)
alter type annotation_type add value if not exists 'predict_cue';
