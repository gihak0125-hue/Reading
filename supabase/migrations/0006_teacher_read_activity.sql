-- 0006_teacher_read_activity.sql
-- 교사 대시보드: 교사가 학생 활동(세션/표시/설명/코치대화/프로필)을 읽을 수 있게 한다.
-- 파일럿 단계 — 교사는 모든 학생 활동을 읽음. 추후 학급(class) 범위로 좁힐 수 있다.
-- (0001의 소유자 정책들에 additive)

create policy profiles_teacher_read on profiles
  for select using (is_teacher());

create policy sessions_teacher_all on sessions
  for select using (is_teacher());

create policy anno_teacher_read on annotations
  for select using (is_teacher());

create policy selfexp_teacher_read on self_explanations
  for select using (is_teacher());

create policy agentmsg_teacher_read on agent_messages
  for select using (is_teacher());
