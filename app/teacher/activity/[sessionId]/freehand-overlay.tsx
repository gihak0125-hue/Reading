"use client";

import { useEffect, useRef, useState } from "react";

/** 학생 자유 필기(본문 폭 기준 비율 좌표)를 교사 화면 본문 위에 겹쳐 렌더. */
export function FreehandOverlay({
  strokes,
}: {
  strokes: { id: string; d: string; color: string }[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setW(el.getBoundingClientRect().width);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!strokes.length) return null;
  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 z-10">
      {w > 0 && (
        <svg className="h-full w-full overflow-visible">
          <g transform={"scale(" + w + ")"}>
            {strokes.map((f) => (
              <path
                key={f.id}
                d={f.d}
                fill="none"
                stroke={f.color}
                strokeWidth={2.5}
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </g>
        </svg>
      )}
    </div>
  );
}
