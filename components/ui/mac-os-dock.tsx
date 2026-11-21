"use client";

import { useState, type CSSProperties, type PointerEvent } from "react";

export interface DockApp {
  id: string;
  name: string;
  running?: boolean;
  badge?: number;
  utility?: boolean;
}

export default function MacOSDock({ apps, onFinder }: { apps: DockApp[]; onFinder?: () => void }) {
  const [running, setRunning] = useState(() => new Set(apps.filter(app => app.running).map(app => app.id)));
  const [pointerPosition, setPointerPosition] = useState<number | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const position = pointerPosition ?? apps.findIndex(app => app.id === focused);
  const active = position < 0 ? -1 : Math.round(position);

  function trackPointer(event: PointerEvent<HTMLButtonElement>, index: number) {
    if (event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const offset = (event.clientX - bounds.left) / bounds.width - 0.5;
    setPointerPosition(Math.max(0, Math.min(apps.length - 1, index + offset)));
  }

  function toggleApp(id: string) {
    setRunning(previous => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="mac-dock-area">
      {active >= 0 && <span className="mac-dock-name" aria-hidden="true">{apps[active].name}</span>}
      <div className="mac-dock" role="group" aria-label="Arda’s Mac Dock"
        onPointerLeave={() => setPointerPosition(null)}>
        <div className="mac-dock-scroll">
          {apps.map((app, index) => {
            const distance = position < 0 ? 2 : Math.min(Math.abs(index - position), 2);
            const scale = 1 + 0.22 * (1 + Math.cos(distance * Math.PI / 2));
            return (
              <button type="button" key={app.id} className="mac-dock-item" aria-label={app.name}
                aria-pressed={running.has(app.id)} data-utility={app.utility || undefined}
                style={{ "--dock-scale": scale } as CSSProperties}
                onPointerEnter={event => trackPointer(event, index)} onPointerMove={event => trackPointer(event, index)}
                onFocus={() => setFocused(app.id)} onBlur={() => setFocused(null)}
                onClick={() => { setFocused(app.id); if (app.id === "finder" && onFinder) onFinder(); else toggleApp(app.id); }}>
                <span className="mac-dock-icon">
                  <img src={`/macbook/icons/${app.id}.webp`} alt="" loading="lazy" decoding="async" draggable={false} />
                  {app.badge && <span className="mac-dock-badge" aria-hidden="true">{app.badge}</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
