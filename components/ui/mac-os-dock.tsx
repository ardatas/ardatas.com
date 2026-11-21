"use client";

import { useState, type CSSProperties } from "react";

export interface DockApp {
  id: string;
  name: string;
  running?: boolean;
  badge?: number;
  utility?: boolean;
}

export default function MacOSDock({ apps, onFinder }: { apps: DockApp[]; onFinder?: () => void }) {
  const [running, setRunning] = useState(() => new Set(apps.filter(app => app.running).map(app => app.id)));
  const [pointed, setPointed] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const active = apps.findIndex(app => app.id === (pointed ?? focused));

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
      <div className="mac-dock" role="group" aria-label="Arda’s Mac Dock" onPointerLeave={() => setPointed(null)}>
        {apps.map((app, index) => {
          const distance = active < 0 ? 2 : Math.min(Math.abs(index - active), 2);
          const scale = 1 + 0.22 * (1 + Math.cos(distance * Math.PI / 2));
          return (
            <button type="button" key={app.id} className="mac-dock-item" aria-label={app.name}
              aria-pressed={running.has(app.id)} data-utility={app.utility || undefined}
              style={{ "--dock-scale": scale } as CSSProperties}
              onPointerEnter={event => { if (event.pointerType !== "touch") setPointed(app.id); }}
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
  );
}
