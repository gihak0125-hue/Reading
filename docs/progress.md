# docs/progress.md — 진행 현황

> 마일스톤 단위로 갱신. 각 항목은 `계획→합의→설계→구현→검토→검증→진화` 사이클을 거친다.

## 현재 상태: **M0 진행 중 (하네스 스캐폴딩)**

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
- [ ] **Supabase 프로젝트 생성 + 키 발급** (사용자) → .env.local 작성
- [ ] 마이그레이션 적용(0001_init.sql)
- [ ] Auth(학생/교사 role) 로그인 화면 + RLS 검증
- [ ] 교사 지문 등록·문단/핵심정보 태깅 화면

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
