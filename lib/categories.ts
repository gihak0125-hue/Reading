/** 지문 분야(학생 선택 화면·교사 등록에서 공용). 서버·클라이언트 모두 사용. */
export const CATEGORIES = [
  { id: "humanities", label: "인문·예술" },
  { id: "social", label: "사회" },
  { id: "science", label: "과학·기술" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export const CATEGORY_IDS: readonly string[] = CATEGORIES.map((c) => c.id);

export const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.label]),
);
