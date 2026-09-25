# docs/architecture.md — 시스템 설계

> 단일 출처(source of truth). 변경 시 [plan.md](../plan.md)·[AGENTS.md](../AGENTS.md)와 동기화.

## 1. 구성 요소
```
Vercel (Next.js App Router)
  ├─ 학생 읽기/주석 UI
  ├─ 교사 대시보드
  └─ Route Handlers (BFF, 서버 전용 시크릿 사용)
        │
        ├──► Supabase Postgres (RLS) — 지문/세션/주석/진단
        ├──► Supabase Auth — 학생/교사 role
        └──► OpenAI API (서버에서만 호출)
```

## 2. 레이어
- **프론트엔드**: Next.js(App Router), 서버 컴포넌트 우선. 주석 에디터는 클라이언트 컴포넌트.
- **BFF**: Next.js Route Handler — 클라이언트는 여기까지만 호출, 시크릿은 서버에만.
- **데이터**: Supabase Postgres + RLS.
- **AI**: OpenAI. 진단/피드백 로직은 서버(아래 미결정 참조).

## 3. AI 호출 위치 (⚠️ 미결정 — plan.md 12.2 질문1)
- 1안: Supabase Edge Function 집중 (백엔드 일원화)
- 2안: Next.js Route Handler (프론트와 동일 저장소, 디버깅 용이)
- **현재 문서 기준**: 2안(Route Handler)을 잠정 기본으로 스캐폴딩하되, 진단 로직을 `lib/agent/`로 분리해 나중에 Edge Function으로 이식 가능하게 설계.

## 4. 데이터 흐름 (읽기 세션)
1. 학생 로그인(Auth) → 배정 지문 목록 조회(RLS)
2. 세션 생성 → 단계 S1 안내(정답 없음)
3. 학생이 주석/자기설명 제출 → Route Handler
4. 서버가 정답 핵심정보(`passage_key_info`)+학습자 산출물+이력을 OpenAI에 전달
5. 구조화 JSON 진단 수신 → `diagnoses`·`agent_messages` 저장
6. 충분→다음 단계 / 부족→비계 후 재시도
7. 종료 → 확인 문항 + 리포트

## 5. 보안
- 시크릿: 서버 전용 env. 클라이언트 번들 검사(CI).
- RLS: 학생=자기 데이터, 교사=자기 학급.
- 프롬프트 인젝션: 학습자/지문 텍스트는 시스템 규칙 변경 불가.

## 6. 폴더 구조(목표)
```
app/            라우트(학생/교사) + route handlers
components/      주석 에디터, 화살표 오버레이, 자기설명 패널
lib/            supabase(client/server), openai(server), agent(진단 로직)
supabase/
  migrations/   스키마 SQL
  functions/    (선택) Edge Functions
docs/           설계·검증·진행 문서
```

## 7. 열린 결정 (plan.md 12.2)
1. OpenAI 호출 위치 확정
2. 승급 모델명 확정
3. 교사 계정 생성/학급 배정 흐름
4. 지문 저작권/출처 정책
5. 단원 지문 개수·유형
6. 모바일/다국어 우선순위
7. 파일럿 일정·규모
