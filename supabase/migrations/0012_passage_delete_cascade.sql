-- 지문 삭제가 세션(학생 읽기 기록) 때문에 막히는 문제 해결: restrict → cascade
-- (지문을 지우면 그 지문의 세션·표시·자기설명·진단·코치대화도 함께 삭제됨)
alter table sessions drop constraint if exists sessions_passage_id_fkey;
alter table sessions
  add constraint sessions_passage_id_fkey
  foreign key (passage_id) references passages(id) on delete cascade;
