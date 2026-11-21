import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { HomeEntry } from "@/lib/macbook-shell";

interface MenuItem { label: string; run?: () => void; checked?: boolean }
interface Menu { name: string; face?: ReactNode; items: MenuItem[]; className?: string }
interface Props {
  app: "Finder" | "Terminal"; clock: string; files: HomeEntry[]; icons: boolean;
  go: (path: string) => void; search: () => void; showTerminal: () => void;
  setView: (icons: boolean) => void; closeWindow: () => void; lock: () => void;
}

function glyph(name: string, width: number, alt = "") {
  return <img className="mac-menu-glyph" alt={alt} draggable={false}
    style={{ width: width / 28 + "em" }} src={"/macbook/menu/" + name + ".webp"} />;
}

export function MacOSMenuBar({ app, clock, files, icons, go, search, showTerminal, setView, closeWindow, lock }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const [left, setLeft] = useState(0);
  const [wifi, setWifi] = useState(true);
  const [muted, setMuted] = useState(true);
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const triggers = useRef(new Map<string, HTMLButtonElement>());

  const focusMenuItems = useRef(false);
  useLayoutEffect(() => {
    if (focusMenuItems.current) panel.current?.querySelector("button")?.focus({ preventScroll: true });
    focusMenuItems.current = false;
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const dismiss = (event: Event) => {
      if (!root.current?.contains(event.target as Node)) setActive(null);
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("focusin", dismiss);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("focusin", dismiss);
    };
  }, [active]);

  const home = { label: "Home", run: () => go("/") };
  const newFinder = { label: "New Finder Window", run: home.run };
  const find = { label: "Find…", run: search };
  const terminal = { label: "Show Terminal", run: showTerminal };
  const close = { label: "Close Window", run: closeWindow };
  const radio = { label: "Wi-Fi", checked: wifi, run: () => setWifi(!wifi) };
  const sound = { label: "Mute Sound", checked: muted, run: () => setMuted(!muted) };
  const spotlight = { name: "Spotlight", face: glyph("spotlight", 32), items: [find] };
  const control = { name: "Control Center", face: glyph("controls", 32), items: [radio, sound] };
  const apple = <svg viewBox="0 0 110 140" width="1em" height="1.22em" aria-hidden="true"><use href="/macbook/menu-icons.svg#apple" /></svg>;
  const menus: Menu[] = [
    { name: "Apple", face: apple, items: [{ label: "Lock Screen", run: lock }] },
    { name: app, className: "mac-menu-app", items: app === "Finder" ? [newFinder, terminal] : [terminal, newFinder] },
    { name: app === "Finder" ? "File" : "Shell", items: [newFinder, terminal, find, close] },
    { name: "Edit", items: [find] },
    { name: "View", items: [
      { label: "as Icons", checked: icons, run: () => setView(true) },
      { label: "as List", checked: !icons, run: () => setView(false) },
    ] },
    ...(app === "Finder" ? [{ name: "Go", items: [home, ...files.filter(f => f.kind === "directory" && f.path.lastIndexOf("/") === 0)
      .map(f => ({ label: f.path.slice(1), run: () => go(f.path) }))] }] : []),
    { name: "Window", items: [newFinder, terminal, close] },
    { name: "Help", items: [
      { label: "Browse folders in Go. Select a PDF to open it." },
      { label: "In Terminal, type help for commands." }, terminal,
    ] },
  ];

  function openMenu(name: string, focusItems = false) {
    const button = triggers.current.get(name);
    if (!button || !root.current) return;
    button.scrollIntoView({ block: "nearest", inline: "nearest" });
    const box = root.current.getBoundingClientRect();
    setLeft(Math.max(2, Math.min(button.getBoundingClientRect().left - box.left, box.width - Math.min(200, box.width - 4) - 2)));
    if (active === name && focusItems) panel.current?.querySelector("button")?.focus({ preventScroll: true });
    focusMenuItems.current = focusItems;
    setActive(name);
  }

  const status: Menu[] = [
    { name: "Sound", face: muted ? glyph("muted", 32) : <span aria-hidden="true">♪</span>, items: [sound] },
    { name: "Battery", face: <>69 % {glyph("battery", 56)}</>, items: [{ label: "Battery level · 69%" }] },
    { name: "Wi-Fi", face: <span style={{ opacity: wifi ? 1 : .45 }}>{glyph("wifi", 38)}</span>, items: [radio] },
    spotlight, control,
    { name: "Date and time", face: <time>{clock}</time>, items: [{ label: clock }, { label: "Berlin time" }] },
  ];
  const current = [...menus, ...status].find(menu => menu.name === active);

  function keys(event: KeyboardEvent<HTMLDivElement>) {
    if (!active) return;
    const buttons = Array.from(panel.current?.querySelectorAll("button") ?? []);
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    switch (event.key) {
      case "Escape": setActive(null); triggers.current.get(active)?.focus(); break;
      case "ArrowDown": buttons[(index + 1) % buttons.length]?.focus(); break;
      case "ArrowUp": buttons[(index <= 0 ? buttons.length : index) - 1]?.focus(); break;
      case "ArrowLeft":
      case "ArrowRight": {
        const names = [...menus, ...status].map(menu => menu.name);
        const next = names[(names.indexOf(active) + (event.key === "ArrowRight" ? 1 : names.length - 1)) % names.length];
        triggers.current.get(next)?.focus(); openMenu(next, true); break;
      }
      default: return;
    }
    event.preventDefault();
  }

  function trigger(menu: Menu) {
    return <button key={menu.name} ref={node => {
      if (node) triggers.current.set(menu.name, node); else triggers.current.delete(menu.name);
    }} className={menu.className} aria-label={menu.name} aria-expanded={active === menu.name}
      onPointerMove={e => { if (e.pointerType === "mouse" && active && active !== menu.name) openMenu(menu.name); }}
      onKeyDown={e => { if (e.key === "ArrowDown") { e.preventDefault(); e.stopPropagation(); openMenu(menu.name, true); } }}
      onClick={e => {
        e.currentTarget.focus({ preventScroll: true });
        if (menu.name === "Spotlight") { setActive(null); search(); }
        else if (active === menu.name) setActive(null);
        else openMenu(menu.name);
      }}>{menu.face ?? menu.name}</button>;
  }

  return <div ref={root} className="mac-menu-bar" role="group" aria-label="Mac menu bar" onKeyDown={keys}>
    <div className="mac-menu-strip">
      <div className="mac-menu-group">{menus.map(trigger)}</div>
      <div className="mac-menu-group mac-menu-status">
        {glyph("extras", 191, "Mistral, ChatGPT and Notion")}
        {trigger(status[0])}
        {glyph("utilities", 180, "Utilities and input source A")}
        {status.slice(1).map(trigger)}
      </div>
    </div>
    {current && <div className="mac-menu-items" ref={panel} style={{ left }} aria-label={current.name + " options"}>
      {current.items.map(item => item.run
        ? <button key={item.label} aria-pressed={item.checked} onClick={() => { setActive(null); triggers.current.get(current.name)?.focus(); item.run?.(); }}>
            <span aria-hidden="true">{item.checked ? "✓" : ""}</span>{item.label}
          </button>
        : <p key={item.label}>{item.label}</p>)}
    </div>}
  </div>;
}
