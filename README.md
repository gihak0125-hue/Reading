# Reading — 추론적 독해 AI 에이전트

고등학교 3학년 **추론적 독해** 단원에서 학생의 독서를 돕는 AI 에이전트.
정답을 즉답하지 않고, 학습자가 스스로 핵심정보를 선별·연결·추론·자기설명하도록 유도하며, 과정을 진단해 개별화된 비계를 제공한다.

## 문서 지도
- 📜 [CLAUDE.md](CLAUDE.md) — 프로젝트 헌법(절대 규칙)
- 🎓 [설계원리.md](설계원리.md) — 교육학 헌법(6원리·31지침)
- 🤖 [AGENTS.md](AGENTS.md) — 에이전트 역할·단계 상태기계
- 🏗 [plan.md](plan.md) — 작업 계획
- 🏛 [docs/architecture.md](docs/architecture.md) — 시스템 설계
- ✅ [docs/verification-rubric.md](docs/verification-rubric.md) — 6차원 검증 기준
- 📈 [docs/progress.md](docs/progress.md) — 진행 현황
- 🔄 [HARNESS_CHANGELOG.md](HARNESS_CHANGELOG.md) — 하네스 진화 로그

## 스택
Next.js(Vercel) · Supabase(Postgres/Auth/Edge Functions) · OpenAI API · GitHub

## 개발 준비 (필수 도구)
이 저장소를 다루려면 아래가 설치돼 있어야 한다.
- [Git](https://git-scm.com/download/win)
- [Node.js LTS](https://nodejs.org/) (npm 포함)
- (선택) [GitHub CLI](https://cli.github.com/)

## 시작하기 (도구 설치 후)
```bash
npm install
cp .env.example .env.local   # 값 채우기 (커밋 금지)
npm run dev
```

## 환경변수
[.env.example](.env.example) 참고. `OPENAI_API_KEY`와 `SUPABASE_SERVICE_ROLE_KEY`는 **서버 전용**이며 절대 커밋하지 않는다.

## 상태
초기 스캐폴딩(M0) 단계. 진행 현황은 [docs/progress.md](docs/progress.md) 참고.
