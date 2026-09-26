-- 0005_coach_messages.sql
-- AI 코치 대화(agent_messages)를 학생 세션에서 저장할 수 있도록 insert 정책 추가.
-- (0001의 select 정책 agentmsg_owner_read 에 더해 additive)
-- 참고: 지금은 서버가 학생 세션으로 학생/코치 메시지를 모두 기록한다.
--       추후 코치(agent) 메시지 쓰기를 service_role 로 옮길 수 있다.

create policy agentmsg_owner_write on agent_messages
  for insert
  with check (
    session_id in (select id from sessions where student_id = auth.uid())
  );
