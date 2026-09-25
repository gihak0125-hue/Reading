# docs/progress.md — 진행 현황

> 마일스톤 단위로 갱신. 각 항목은 `계획→합의→설계→구현→검토→검증→진화` 사이클을 거친다.

## 현재 상태: **M2 시작 (학생 읽기 화면) — M0·M1 완료**

### M0 하네스 셋업
- [x] plan.md 작성
- [x] 교육학 헌법 `설계원리.md`
- [x] CLAUDE.md / AGENTS.md
- [x] docs/architecture.md / verification-rubric.md / progress.md
- [x] HARNESS_CHANGELOG.md
- [x] .gitignore / .env.example / README.md
- [x] CI(.github/workflows/ci.yml) / pre-commit / 실행 루프 스킬 초안
- [x] supabase/migrations 초기 스키마 SQL
- [x] git/Node 설치 + 저장소 초기화·첫 푸시 (GitHub: gihak0125-hue/Reading, main)
- [ ] Vercel·Supabase 프로젝트 연결

### M1 데이터 기반 (진행 중)
- [x] Next.js 앱 스캐폴딩 (Next 16, TS, Tailwind4, App Router)
- [x] 라이브러리 설치: @supabase/ssr, @supabase/supabase-js, openai
- [x] lib/env, lib/supabase(client/server), lib/openai(모델 라우팅)
- [x] 랜딩 페이지 + /api/health (env 존재여부만 노출)
- [x] 빌드/타입체크 통과, 로컬 실행 확인
- [x] Supabase 프로젝트 생성 + 키 발급 → .env.local (URL/anon 적용, 연결 확인)
- [x] 마이그레이션 적용(0001_init.sql) — 10개 테이블 + RLS + 프로필 자동생성
- [x] Auth 로그인/회원가입 화면 + 세션 미들웨어 + 대시보드
- [x] 로그인 실제 검증 완료(사용자 계정 로그인 성공) — intent 통합으로 로그인/가입 버그 수정
- [x] 교사 지문 관리 화면: 지문 등록(문단 자동 분리) + 목록/삭제 + 문단별 핵심어/핵심문장 태깅
- [x] 0003 적용(교사 문단·핵심정보 쓰기 RLS) + 지문 등록/태깅 실제 검증 ✅ **M1 완료**

### M2 통합 읽기 워크스페이스 (진행 중, 태블릿 터치 우선 / 단계 강제 없음)
> 설계 방향: 학생이 쭉 읽으며 표시 → AI 코치가 어려움에 피드백. (목업 기반, [[reading-ux-non-linear]])
- [x] 학생 지문 목록 + 세션 생성
- [x] 읽기 뷰(문단 표시, 태블릿 레이아웃) — ※ 초기 5단계 gating 버전은 폐기, 통합 워크스페이스로 재설계
- [ ] 3분할 레이아웃: 본문 / 사고 패드 / AI 코치 바
- [x] 도구 팔레트 + 밑줄·동그라미 터치 표시 저장/렌더/지우기(annotations) + 핵심정보 자동수집
- [x] 화살표 관계 연결(표시 두 개 → 관계유형) + 관계·구조 탭 관계도
- [ ] 자기설명 입력 저장(내 설명 탭)
- [ ] (선택) 본문 위 SVG 곡선 화살표 시각화
- [ ] AI 코치(OpenAI, M3): 관찰 기반 질문·힌트·피드백
- [ ] AI 코치 바(질문·힌트·설명 입력) — 실제 코칭은 M3(OpenAI)

## 중요 제약
- **학생 사용 기기 = 태블릿(아이패드/삼성패드), 터치 우선.** 주석 UI(M2)는 마우스 아닌 손가락 터치 기준으로 설계·검증. (교사 화면은 PC 가능)

## 확정된 결정
- OpenAI 호출 위치: **Next.js Route Handler** (lib/agent 로 분리, 추후 Edge Function 이식 가능)
- 모델: 기본 **gpt-4o-mini** + 복잡 진단/반복 실패 시 **gpt-4o** 승급

### M2 읽기 세션 + 주석 UI (예정)
### M3 에이전트 진단·피드백 (예정)
### M4 교사 대시보드 (예정)
### M5 검증·튜닝 (예정)
### M6 배포·파일럿 (예정)

## 블로커
- (해결됨) git·node·npm·gh 설치 완료 및 첫 푸시 완료.

## 열린 결정 (plan.md 12.2)
1. OpenAI 호출 위치(Edge Function vs Route Handler)
2. 승급 모델명
3. 교사 계정/학급 배정 흐름
4. 지문 저작권/출처
5. 단원 지문 개수·유형
6. 모바일/다국어 우선순위
7. 파일럿 일정·규모
