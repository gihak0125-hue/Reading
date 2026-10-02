// 페이지 전환·데이터 로딩 중 표시(멈춘 게 아니라 불러오는 중임을 알림)
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-1 items-center justify-center px-6 py-16">
      <div className="flex flex-col items-center gap-3">
        <span className="h-10 w-10 animate-spin rounded-full border-[3px] border-amber-200 border-t-amber-600 dark:border-amber-900 dark:border-t-amber-400" />
        <span className="text-sm text-gray-500 dark:text-gray-400">
          불러오는 중…
        </span>
      </div>
    </div>
  );
}
