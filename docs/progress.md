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
- [ ] **git/Node 설치** (사용자) → 저장소 초기화·첫 푸시
- [ ] Vercel·Supabase 프로젝트 연결

### M1 데이터 기반 (예정)
- [ ] Next.js 앱 스캐폴딩(`npm create next-app` 또는 수동)
- [ ] Supabase 프로젝트 생성 + 마이그레이션 적용
- [ ] Auth(학생/교사 role) + RLS
- [ ] 교사 지문 등록·문단/핵심정보 태깅 화면

### M2 읽기 세션 + 주석 UI (예정)
### M3 에이전트 진단·피드백 (예정)
### M4 교사 대시보드 (예정)
### M5 검증·튜닝 (예정)
### M6 배포·파일럿 (예정)

## 블로커
- ⛔ 로컬에 git·node·npm 미설치 → 커밋/푸시·빌드 불가. 설치 필요.

## 열린 결정 (plan.md 12.2)
1. OpenAI 호출 위치(Edge Function vs Route Handler)
2. 승급 모델명
3. 교사 계정/학급 배정 흐름
4. 지문 저작권/출처
5. 단원 지문 개수·유형
6. 모바일/다국어 우선순위
7. 파일럿 일정·규모
