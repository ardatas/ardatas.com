"use client";

import { useEffect, useState } from "react";

const chevron = Array.from({ length: 9 }, (_, i) => {
  const r = Math.floor(i / 3), c = i % 3;
  return (c + Math.abs(r - 1)) * 90;
});
const ORBIT_ORDER = [0, 1, 2, 5, 8, 7, 6, 3];
const orbit = Array.from({ length: 9 }, (_, i) => {
  const k = ORBIT_ORDER.indexOf(i);
  return k === -1 ? null : k * 110;
});
const PATTERNS: Record<string, { delays: (number | null)[]; dur: number; round: boolean }> = {
  Drive: { delays: chevron, dur: 650, round: false },
  Dots: { delays: chevron, dur: 650, round: true },
  Orbit: { delays: orbit, dur: 950, round: false },
};

function useElapsed(enabled: boolean) {
  const [ds, setDs] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const start = performance.now();
    const t = setInterval(() => setDs(Math.floor((performance.now() - start) / 100)), 100);
    return () => clearInterval(t);
  }, [enabled]);
  const total = ds / 10;
  return total < 60 ? `${total.toFixed(1)}s` : `${Math.floor(total / 60)}m ${(total % 60).toFixed(1)}s`;
}

export default function LoadingState({ label = "Churning", variant = "Drive", showElapsed = true }: {
  label?: string;
  variant?: string;
  showElapsed?: boolean;
}) {
  const elapsed = useElapsed(showElapsed);
  const { delays, dur, round } = PATTERNS[variant] ?? PATTERNS.Drive;
  return (
    <div className="loading-state flex w-fit items-center gap-2.5">
      <span aria-hidden="true" className="grid shrink-0 grid-cols-[repeat(3,4px)] gap-[1.5px]">
        {delays.map((d, i) => (
          <span key={i} className={`loading-pixel size-[4px] bg-foreground ${round ? "rounded-full" : "rounded-[1px]"}`}
            style={{ opacity: d === null ? 0.07 : 0.15, animation: d === null ? "none" : `pixel-on ${dur}ms ease-in-out ${d}ms infinite` }} />
        ))}
      </span>
      <span className="loading-label bg-clip-text text-[13px] font-medium text-transparent"
        style={{ backgroundImage: "linear-gradient(90deg, var(--muted-foreground) 35%, var(--foreground) 50%, var(--muted-foreground) 65%)", backgroundSize: "200% 100%", animation: "shimmer-text 1.4s linear infinite" }}>
        {label}
      </span>
      {showElapsed && <span className="font-mono text-[12px] text-muted-foreground tabular-nums" aria-live="off">{elapsed}</span>}
    </div>
  );
}
