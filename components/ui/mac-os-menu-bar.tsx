import { useEffect, useRef } from "react";

export function MacOSMenuBar({ time, visible, toggleTerminal, lock }: {
  time: string; visible: boolean; toggleTerminal: () => void; lock: () => void;
}) {
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    function dismiss(event: PointerEvent) {
      if (menu.current && !menu.current.contains(event.target as Node)) menu.current.open = false;
    }
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, []);
  return <div className="mac-menu-bar">
    <svg width="12" height="14" aria-hidden="true"><use href="/macbook/menu-icons.svg#apple" /></svg>
    <b>{visible ? "Terminal" : "Finder"}</b>
    <details ref={menu} onKeyDown={event => {
      if (event.key === "Escape") {
        event.currentTarget.open = false;
        event.currentTarget.querySelector("summary")?.focus();
      }
    }}>
      <summary>Session</summary>
      <div className="mac-menu-items">
        <button onClick={() => { menu.current!.open = false; toggleTerminal(); }}>{visible ? "Hide Terminal" : "Show Terminal"}</button>
        <button onClick={lock}>Lock screen</button>
      </div>
    </details>
    <span className="mac-menu-status" aria-hidden="true">
      <svg width="20" height="12"><use href="/macbook/menu-icons.svg#battery" /></svg>
      <svg width="14" height="11"><use href="/macbook/menu-icons.svg#wifi" /></svg>
    </span>
    <time>{time}</time>
  </div>;
}
