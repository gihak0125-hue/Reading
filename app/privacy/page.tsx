import Link from "next/link";
import { Wordmark } from "@/app/brand";

export const metadata = {
  title: "개인정보 처리방침 · 북돋움",
  description: "북돋움 서비스의 개인정보 수집·이용 및 처리에 관한 방침",
};

const SHINHAENG = "2026년 10월 19일";

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
        제{n}조 ({title})
      </h2>
      <div className="flex flex-col gap-1.5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <Link href="/" aria-label="홈으로">
          <Wordmark size="sm" />
        </Link>
        <Link
          href="/"
          className="rounded-full border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          홈
        </Link>
      </header>

      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          개인정보 처리방침
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          시행일: {SHINHAENG}
        </p>
      </div>

      <p className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-sm leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
        북돋움(이하 &lsquo;서비스&rsquo;)은 「개인정보 보호법」 등 관련 법령을
        준수하며, 이용자의 개인정보를 소중히 보호합니다. 본 방침은 서비스가
        어떤 개인정보를 어떤 목적으로 수집·이용하며 어떻게 보호하는지를 안내합니다.
        <br />
        <span className="text-amber-700/90 dark:text-amber-300/80">
          ※ 아래 〔 〕 안의 항목은 서비스 운영자의 실제 정보로 채워 사용하세요.
        </span>
      </p>

      <div className="flex flex-col gap-6">
        <Section n={1} title="수집하는 개인정보 항목">
          <p>서비스는 회원가입과 서비스 제공을 위해 다음의 개인정보를 수집합니다.</p>
          <p className="font-medium text-gray-800 dark:text-gray-200">① 회원가입 시</p>
          <ul className="list-disc pl-5">
            <li>공통: 이메일 주소, 비밀번호(암호화 저장), 이름 또는 닉네임</li>
            <li>학생: 출석번호, 학급 참여 코드</li>
            <li>교사: 소속 학교명</li>
          </ul>
          <p className="font-medium text-gray-800 dark:text-gray-200">② 서비스 이용 과정에서 생성·수집</p>
          <ul className="list-disc pl-5">
            <li>학습 활동 기록: 지문 표시(밑줄·동그라미·관계), 자기설명·대화 내용, 독해 확인·관점 평가 응답, 채점 결과·점수</li>
            <li>서비스 이용 기록, 접속 로그, 쿠키(로그인 유지 목적)</li>
          </ul>
        </Section>

        <Section n={2} title="개인정보의 수집·이용 목적">
          <ul className="list-disc pl-5">
            <li>회원 식별 및 로그인 등 서비스 제공</li>
            <li>읽기 학습 지원(AI 코치 피드백) 및 학습 기록·점수 제공</li>
            <li>교사의 학급 관리 및 학습 지도(교사 계정 승인 포함)</li>
            <li>서비스 운영·개선 및 오류 대응</li>
          </ul>
        </Section>

        <Section n={3} title="개인정보의 보유 및 이용 기간">
          <p>
            원칙적으로 개인정보 수집·이용 목적이 달성되거나 회원이 탈퇴하면 지체 없이
            파기합니다. 다만 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안
            보관합니다.
          </p>
          <ul className="list-disc pl-5">
            <li>회원 정보: 회원 탈퇴 시까지</li>
            <li>학습 활동 기록: 회원 탈퇴 또는 〔보존 기간: 예) 학년도 종료 후 1년〕 경과 시까지</li>
          </ul>
        </Section>

        <Section n={4} title="개인정보 처리의 위탁 및 국외 이전">
          <p>
            서비스는 안정적 운영을 위해 아래와 같이 개인정보 처리를 위탁하며, 일부
            수탁사는 해외에 서버를 둘 수 있습니다(국외 이전). 위탁 계약 시 개인정보가
            안전하게 관리되도록 합니다.
          </p>
          <ul className="list-disc pl-5">
            <li>
              Supabase (데이터 저장·회원 인증): 회원·학습 데이터 보관 — 서버 위치
              미국 등 국외
            </li>
            <li>
              OpenAI (AI 코치·지문 분석): 학습 피드백 생성을 위해 지문·학생 입력
              텍스트가 전송·처리됨 — 서버 위치 미국 등 국외
            </li>
            <li>Vercel (서비스 호스팅): 서비스 구동 — 국외 포함</li>
          </ul>
          <p className="text-gray-500 dark:text-gray-400">
            ※ AI 피드백 생성 과정에서 학생이 입력한 자기설명·대화 등이 위 수탁사로
            전송될 수 있습니다. 민감정보나 불필요한 개인 식별정보는 입력하지 않도록
            안내합니다.
          </p>
        </Section>

        <Section n={5} title="개인정보의 제3자 제공">
          <p>
            서비스는 이용자의 개인정보를 본 방침에서 고지한 범위를 넘어 외부에
            제공하지 않습니다. 다만 법령에 근거하거나 수사기관의 적법한 요청이 있는
            경우는 예외로 합니다.
          </p>
        </Section>

        <Section n={6} title="만 14세 미만 아동의 개인정보">
          <p>
            만 14세 미만 아동이 가입·이용하는 경우 법정대리인(보호자)의 동의가
            필요합니다. 서비스는 법정대리인의 동의 없이 수집된 아동의 개인정보를
            확인하면 지체 없이 파기합니다.
          </p>
        </Section>

        <Section n={7} title="정보주체의 권리와 행사 방법">
          <p>
            이용자(법정대리인 포함)는 언제든지 자신의 개인정보에 대해 열람·정정·삭제·
            처리정지를 요청할 수 있습니다. 요청은 아래 개인정보 보호책임자에게 하실 수
            있으며, 서비스는 지체 없이 조치합니다. 동의 철회(회원 탈퇴)도 가능합니다.
          </p>
        </Section>

        <Section n={8} title="개인정보의 파기 절차 및 방법">
          <ul className="list-disc pl-5">
            <li>전자적 파일: 복구·재생이 불가능한 방법으로 영구 삭제</li>
            <li>종이 문서: 분쇄 또는 소각</li>
          </ul>
        </Section>

        <Section n={9} title="개인정보의 안전성 확보 조치">
          <ul className="list-disc pl-5">
            <li>비밀번호 등 중요정보 암호화 저장·전송</li>
            <li>데이터베이스 접근 권한 관리 및 최소 수집 원칙 적용</li>
            <li>학생 식별정보를 URL·로그에 노출하지 않도록 관리</li>
          </ul>
        </Section>

        <Section n={10} title="개인정보 보호책임자">
          <ul className="list-disc pl-5">
            <li>서비스명: 북돋움</li>
            <li>운영자/보호책임자: 〔성명·직위 기재〕</li>
            <li>문의처(이메일): 〔연락 가능한 이메일 기재〕</li>
          </ul>
        </Section>

        <Section n={11} title="개인정보 처리방침의 변경">
          <p>
            본 방침의 내용이 변경되는 경우 시행일 및 변경 사항을 서비스 내 공지를 통해
            안내합니다. 본 방침은 {SHINHAENG}부터 시행합니다.
          </p>
        </Section>
      </div>
    </main>
  );
}
