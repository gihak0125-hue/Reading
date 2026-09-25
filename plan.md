# 추론적 독해 AI 에이전트 — 작업 계획 (plan.md)

> 고등학교 3학년 대상 **추론적 독해** 단원 독서 보조 AI 에이전트
> 문서 버전: v0.1 · 작성일: 2026-09-23

---

## 0. 한눈에 보기

| 항목 | 결정 |
|---|---|
| 대상 | 고3, 추론적 독해 단원 |
| 사용 기기 | **학생 = 태블릿(아이패드/삼성패드), 터치 우선.** 교사 = PC 가능 |
| 교육학 근거 | [`설계원리.md`](설계원리.md) 6개 원리·31개 지침 |
| 지문 공급 | **교사 지문 은행** (사전 등록 + 문단 구조·핵심어 태깅) |
| 상호작용 | **주석 UI** (지문 위 밑줄·동그라미·화살표 직접 표시 + 자기설명 입력) |
| 인증·대시보드 | **학생 로그인(Supabase Auth) + 교사 진단 대시보드** |
| 프론트엔드 | Vercel (Next.js App Router) |
| 백엔드 | Supabase (Postgres + Auth + RLS + Edge Functions) |
| AI | OpenAI API — 기본 `gpt-4o-mini`, 필요 시 상위 모델 승급 |
| 형상관리 | GitHub (main 보호 + PR + pre-commit 검증) |
| 방법론 | **하네스 엔지니어링** (헌법·작업구조·검증·실행루프 4대 요소) |

---

## 1. 목표와 완료 조건(Definition of Done)

### 1.1 제품 목표
학습자가 **정답을 받기 전에 스스로** 핵심정보를 선별하고, 정보 간 관계를 외현적으로 연결하고, 글의 구조를 추론하고, 자기설명을 하도록 유도하는 에이전트. 에이전트는 정답을 즉답하지 않고 **과정을 진단**하여 **개별화된 비계**를 제공한다.

### 1.2 MVP 완료 조건
- [ ] 학생이 로그인 → 교사가 등록한 지문 선택 → 읽기 세션 진행 가능
- [ ] 지문 위에서 밑줄/동그라미(핵심정보 표시), 화살표(관계 연결) 주석 가능
- [ ] 각 단계에서 에이전트가 **정답 즉답 없이** 자기설명을 먼저 요구
- [ ] 학습자 표시·설명을 `설계원리.md` 기준으로 진단 → 개별화 피드백 반환
- [ ] 세션 기록이 Supabase에 저장되고 교사 대시보드에서 과정별 진단 열람 가능
- [ ] Vercel 배포 + GitHub main 브랜치 CI 통과

### 1.3 완료 조건 합의 규칙(하네스)
"완료"는 위 체크리스트 + [`docs/verification-rubric.md`](docs/verification-rubric.md)의 6차원 점수 기준을 통과했을 때만 인정한다. 코드 수정은 AI에 위임하되 **루브릭 변경은 사람이 최종 승인**한다.

---

## 2. 하네스 구조 적용

tigerjk9/Harness-Engineering의 4대 요소를 본 프로젝트에 매핑한다.

| 요소 | 역할 | 본 프로젝트 구현 파일 |
|---|---|---|
| 📜 **헌법** | AI가 따를 규칙·원칙 | `CLAUDE.md`, `AGENTS.md`, `설계원리.md`(교육학 헌법) |
| 🏗 **작업 구조** | 무엇을 어떻게 만들지 설계도 | `plan.md`(본 문서), `docs/architecture.md`, `docs/progress.md` |
| ✅ **검증** | 결과물 품질 기준 | `.husky/pre-commit`, `docs/verification-rubric.md`, 자동 테스트 |
| 🔄 **실행 루프** | 수정→검증→반복 자동화 | `.claude/skills/execution-loop/`, CI(GitHub Actions) |

### 2.1 교육학 헌법 = `설계원리.md`
`설계원리.md`의 6개 원리는 에이전트 프롬프트와 검증 루브릭에 그대로 이식된다. 에이전트의 모든 응답은 이 헌법을 위반해선 안 된다(예: "정답 즉답 금지", "자기설명 우선").

### 2.2 하네스 진화 규칙
운영 중 루브릭 허점(예: 에이전트가 정답을 흘리는 패턴)을 발견하면 `HARNESS_CHANGELOG.md`에 규칙을 누적하고, 그 규칙을 프롬프트/검증에 반영한다. Goodhart 함정 방지를 위해 루브릭은 사람이 승인한다.

---

## 3. 시스템 아키텍처

```
┌────────────────────────────┐        ┌──────────────────────────────┐
│  Vercel (Next.js)          │        │  Supabase                    │
│  - 학생 읽기/주석 UI        │  HTTPS │  - Postgres (지문/세션/주석)  │
│  - 교사 대시보드            │◄──────►│  - Auth (학생/교사 role)      │
│  - Route Handlers (BFF)     │        │  - RLS 정책                   │
└──────────┬─────────────────┘        │  - Edge Function (진단/피드백)│
           │ 서버 사이드에서만 호출     └───────────────┬──────────────┘
           ▼                                            ▼
   ┌─────────────────┐                          OpenAI API 호출은
   │  OpenAI API      │◄─────────────────────── 서버(Edge Fn 또는
   │  gpt-4o-mini /   │                          Next 서버라우트)에서만
   │  상위 모델 승급   │                          → API 키 노출 방지
   └─────────────────┘
```

**핵심 보안 원칙**: OpenAI API 키·Supabase service_role 키는 **클라이언트에 절대 노출 금지**. 모든 AI 호출은 서버 사이드(Edge Function 또는 Next.js Route Handler)에서만 수행.

### 3.1 OpenAI 호출 위치 결정
- 1안(추천): **Supabase Edge Function**에 진단·피드백 로직 집중 → 백엔드 일원화, RLS와 자연스럽게 결합
- 2안: **Next.js Route Handler**에서 호출 → 프론트와 동일 저장소, Vercel 로그로 디버깅 용이
- ⚠️ **미결정**: 둘 중 하나 확정 필요 (아래 9절 미결정 사항 참조)

---

## 4. 설계원리 → 에이전트 동작 매핑

에이전트는 아래 **읽기 진행 단계**를 순서대로 안내하며, 각 단계에서 해당 원리·지침을 적용한다.

| 단계 | 근거 원리 | 에이전트 행동 | UI 요소 |
|---|---|---|---|
| ① 핵심정보 선별 | 원리1 (1.1~1.4) | 문단별로 핵심어·핵심문장을 학습자가 직접 표시하게 유도. 과잉/저중요 표시 시 재선택 피드백 | 밑줄·동그라미 도구 |
| ② 관계 연결 외현화 | 원리2 (2.1~2.6) | 관련 문장에 화살표 연결, 관계 유형(비교·대조/인과/문제-해결/나열) 기호 표시 유도. 오연결 시 정답 대신 재탐색 유도 | 화살표 도구 + 관계 라벨 |
| ③ 구조 기반 추론 | 원리3 (3.1~3.5) | 문단 조직 방식 파악 → 거시구조 구성 → 이어질 내용 예측 유도 | 구조 선택 패널 |
| ④ 자기설명 | 원리4 (4.1~4.5) | **정답 제시 전** 학습자가 먼저 추론 결과·이유를 자기 표현으로 설명. 단순 반복 시 후속 질문 | 자기설명 입력창 |
| ⑤ 과정 중심 진단 | 원리5 (5.1~5.5) | 표시 개수가 아닌 '무엇을 선택했는지'로 진단. 어느 과정(선별/통합/구조/추론)에서 막혔는지 구분 | (백엔드 진단, 교사 대시보드 노출) |
| ⑥ 개별화 비계 | 원리6 (6.1~6.6) | 학습자 수준·막힌 지점에 따라 단서 구체성·유형을 조절. 잘하는 학습자에겐 일률적 밑줄 제공 금지 | 적응형 힌트 표시 |

> 이 표는 `docs/architecture.md`와 에이전트 시스템 프롬프트의 단일 출처(source of truth)가 된다.

---

## 5. 데이터 모델 (Supabase Postgres)

MVP 기준 초안 스키마. 모든 표에 RLS 적용.

```
profiles            (id[uuid, auth.users FK], role['student'|'teacher'], display_name, class_id)
classes             (id, teacher_id, name, join_code)
passages            (id, title, body, difficulty, source, created_by)        -- 교사 지문 은행
passage_paragraphs  (id, passage_id, seq, text, structure_type)              -- 문단 구조 태깅
passage_key_info    (id, paragraph_id, span_start, span_end, kind['keyword'|'key_sentence'])  -- 정답 핵심정보(진단 기준)
sessions            (id, student_id, passage_id, status, started_at, ended_at)
annotations         (id, session_id, paragraph_id, type['underline'|'circle'|'arrow'],
                     span_start, span_end, target_ref, relation_type, note)   -- 학습자 표시
self_explanations   (id, session_id, step, learner_text, created_at)          -- 자기설명 기록
diagnoses           (id, session_id, step, difficulty_area, evidence, created_at)  -- 원리5 진단 결과
agent_messages      (id, session_id, role['agent'|'student'], step, content, model_used, tokens)
```

### 5.1 RLS 정책(요지)
- 학생: 자기 `sessions/annotations/self_explanations`만 read/write
- 교사: 자기 `class_id`에 속한 학생 데이터 read
- `passages`: 교사만 write, 학생은 배정된 것 read
- OpenAI 호출 결과 저장은 service_role(서버)만 write

---

## 6. 에이전트 실행 루프 (학습자 상호작용 루프)

하네스의 "실행 루프"를 **학습자 세션 루프**로 구체화.

```
지문 선택
  └─► [단계 s] 안내 제시 (원리 s 기반, 정답 없음)
        └─► 학습자 표시/설명 입력
              └─► 서버: 진단 (설계원리.md 기준으로 학습자 산출물 평가)
                    ├─ 충분 → 다음 단계 s+1 로 진행
                    └─ 부족 → 개별화 비계(원리6) 제공, 같은 단계 재시도
  └─► 세션 종료: 독해 확인 문항(원리5.5) + 요약 리포트 저장
```

- 에이전트는 **정답을 먼저 주지 않는다**(원리4.1). 진단→비계→재시도 사이클을 돈다.
- 비계 강도는 학습자 이력(이전 세션 진단)에 따라 조절(원리6.1).

---

## 7. 주석 UI 명세 (프론트엔드)

- **텍스트 선택 → 밑줄/동그라미**: 문단 텍스트에서 드래그로 span 선택 → `annotations`에 저장
- **화살표 연결**: 두 표시(또는 두 span)를 선택해 관계선 그리기 → 관계 유형 라벨(비교·대조/인과/문제-해결/나열) 선택
- **관계 오류 시**: 정답을 표시하지 않고 "두 정보를 다시 살펴보세요" 식 재탐색 단서(원리2.5)
- **자기설명 패널**: 각 단계 우측에 입력창, 제출 전에는 에이전트 해석 비공개
- 후보 라이브러리: 텍스트 하이라이트/주석은 커스텀 렌더링(span 오프셋 기반) 권장. SVG 오버레이로 화살표 렌더링.
- **터치 우선(태블릿)**: 학생은 아이패드/삼성패드로 사용 → 손가락 드래그로 텍스트 선택·밑줄, 탭으로 동그라미, 두 지점 터치로 화살표 연결. 마우스 hover 의존 금지, 탭 타깃 ≥44px, 지문 스크롤/핀치 확대와 주석 제스처 충돌 방지. Apple Pencil/S펜 지원은 추후 검토.
- 접근성: 키보드 조작·스크린리더 라벨 포함(검증 루브릭 항목).

---

## 8. OpenAI 통합

### 8.1 이중 모델 라우팅
- **기본 `gpt-4o-mini`**: 자기설명 간단 진단, 정형 피드백, 단서 생성
- **상위 모델 승급 조건**: (a) 복잡한 추론 관계 진단, (b) mini 신뢰도 낮음, (c) 반복 실패 학습자 심층 진단
- 승급 로직·모델명은 환경변수로 관리(하드코딩 금지)

### 8.2 프롬프트 구조
- **시스템 프롬프트 = 교육학 헌법**: `설계원리.md` 요약 + "정답 즉답 금지, 자기설명 우선, 과정 진단, 개별화 비계" 불변 규칙
- **입력**: 지문 문단, 정답 핵심정보(`passage_key_info`), 학습자 표시/설명, 학습자 이력 요약
- **출력**: 구조화 JSON(`diagnosis`, `difficulty_area`, `scaffold`, `next_step`, `student_facing_message`)
- JSON 스키마 강제(structured output)로 파싱 안정성 확보

### 8.3 비용·안전
- 토큰·비용 로깅(`agent_messages.tokens`, `model_used`)
- 프롬프트 인젝션 방어: 학습자 입력은 데이터로만 취급, 시스템 규칙 override 불가
- 레이트리밋·재시도·타임아웃 처리

---

## 9. 저장소·환경 구성

### 9.1 리포지토리 파일 구조(초안)
```
/                     (Next.js 앱 루트, Vercel 배포)
  app/                학생 UI · 교사 대시보드 · route handlers
  components/         주석 에디터, 화살표 오버레이 등
  lib/                supabase client, openai client(서버 전용)
  supabase/
    migrations/       DB 스키마 SQL
    functions/        Edge Functions(진단/피드백)
  CLAUDE.md           헌법(AI 규칙)
  AGENTS.md           에이전트 역할 정의
  설계원리.md          교육학 헌법
  plan.md             본 문서
  HARNESS_CHANGELOG.md 하네스 진화 로그
  docs/
    architecture.md   시스템 설계 상세
    progress.md       진행 현황
    verification-rubric.md  6차원 검증 기준
  .husky/pre-commit   커밋 전 검증 훅
  .github/workflows/  CI(빌드/테스트/린트)
  .claude/skills/execution-loop/  실행 루프 스킬
```

### 9.2 환경변수(시크릿) — 값은 커밋 금지
```
NEXT_PUBLIC_SUPABASE_URL          (공개 가능)
NEXT_PUBLIC_SUPABASE_ANON_KEY     (공개 가능)
SUPABASE_SERVICE_ROLE_KEY         (서버 전용, 절대 노출 금지)
OPENAI_API_KEY                    (서버 전용, 절대 노출 금지)
OPENAI_MODEL_DEFAULT=gpt-4o-mini
OPENAI_MODEL_ESCALATION=<상위 모델명>
```
Vercel Project Settings와 Supabase Secrets에 각각 등록. `.env.local`은 `.gitignore` 처리.

---

## 10. 검증 루브릭 (6차원) — `docs/verification-rubric.md` 요지

에이전트/코드 결과물은 아래 차원으로 자동·수동 측정하여 점수 판정한다.

1. **교육학 충실도** — 정답 즉답 안 함, 자기설명 우선, 6원리 반영 여부
2. **진단 정확도** — 막힌 과정(선별/통합/구조/추론) 구분 정확성
3. **비계 적절성** — 학습자 수준 대비 단서 구체성 조절 여부(원리6)
4. **기능 정확성** — 주석 저장/렌더/세션 흐름 단위·통합 테스트
5. **접근성·UX** — 키보드/스크린리더/모바일 대응
6. **보안·비용** — 키 노출 없음, RLS 유효, 토큰·비용 로깅

---

## 11. 단계별 마일스톤 (하네스 7단계 사이클 반영)

각 마일스톤은 `계획 → 완료조건 합의 → 교육 설계 → 구현 → 교육학 검토 → 검증 → 하네스 진화` 순으로 진행.

- **M0 하네스 셋업**: 저장소 초기화, `CLAUDE.md`/`AGENTS.md`/`docs/*`/pre-commit/CI, Supabase·Vercel 프로젝트 연결
- **M1 데이터 기반**: 스키마 마이그레이션, RLS, Auth(학생/교사 role), 교사 지문 등록·태깅 화면
- **M2 읽기 세션 + 주석 UI**: 지문 선택, 밑줄/동그라미/화살표, 자기설명 입력, 저장
- **M3 에이전트 진단·피드백**: OpenAI 연동(서버), 설계원리 기반 진단, 개별화 비계, 정답 즉답 금지 검증
- **M4 교사 대시보드**: 학급별 과정 진단 열람, 어려움 영역 집계
- **M5 검증·튜닝**: 6차원 루브릭 통과, 프롬프트 튜닝, `HARNESS_CHANGELOG.md` 누적
- **M6 배포·파일럿**: Vercel 프로덕션, 소규모 파일럿, 피드백 반영

---

## 12. 리스크 & 열린 질문(다음 확인 필요)

### 12.1 리스크
- **에이전트 정답 유출**: mini 모델이 힌트에 정답을 흘릴 수 있음 → 출력 검사 가드 + 루브릭 항목화
- **주석 UI 복잡도**: 화살표/관계 표시가 구현 난이도 높음 → M2에서 밑줄·동그라미 먼저, 화살표는 반복 개선
- **진단 신뢰도**: 자유 서술 진단의 일관성 → structured output + 정답 핵심정보 대조로 보완
- **비용**: 상위 모델 승급 남용 → 승급 조건·상한 설정

### 12.2 다음에 확정할 질문
1. OpenAI 호출을 **Supabase Edge Function**과 **Next.js Route Handler** 중 어디에 둘지? (3.1)
2. 상위 승급 모델을 구체적으로 어떤 것으로? (예: gpt-4o / 최신 상위 모델)
3. 교사 계정 생성 방식(초대 코드? 관리자 수동?)과 학급 배정 흐름
4. 지문 저작권/출처 정책 — 교과서 지문 사용 범위, 자체 제작 여부
5. 단원 범위: 대상 지문 개수·유형(설명문 위주? 실제 수능형 비문학?)
6. 다국어/모바일 우선순위, 오프라인 대비 필요 여부
7. 파일럿 일정·규모(학급 수, 시점)

---

## 13. 다음 액션
- [ ] 위 12.2 질문 확정
- [ ] M0 하네스 셋업 착수(리포 스캐폴딩 + `CLAUDE.md` 초안)
- [ ] `docs/architecture.md`, `docs/verification-rubric.md` 세부 작성
