import { useEffect, useRef, useState } from "react";
import { MacOSMenuBar } from "@/components/ui/mac-os-menu-bar";
import { Terminal } from "@/components/ui/terminal";
import DocumentWindow from "@/components/ui/safari-01";
import type { DocumentFile, HomeEntry } from "@/lib/macbook-shell";
import { MacbookPro } from "@/components/ui/macbook-pro";
import MacOSDock, { type DockApp } from "@/components/ui/mac-os-dock";

// One row per Dock item, in screen order. Its id names public/macbook/icons/<id>.webp.
// Set running or badge to reproduce the starting Dock. utility separates the trailing items.
const apps: DockApp[] = [
  { id: "finder", name: "Finder", running: true },
  { id: "launchpad", name: "Launchpad" },
  { id: "safari", name: "Safari", running: true },
  { id: "notion", name: "Notion", running: true },
  { id: "chatgpt", name: "ChatGPT", badge: 1 },
  { id: "claude", name: "Claude" },
  { id: "vscode", name: "Visual Studio Code", running: true },
  { id: "vibe", name: "Mistral Vibe", running: true },
  { id: "teams", name: "Microsoft Teams" },
  { id: "slack", name: "Slack", running: true },
  { id: "whatsapp", name: "WhatsApp", badge: 35, running: true },
  { id: "folder", name: "Folder", utility: true },
  { id: "trash", name: "Trash", utility: true },
];

const dateFormat = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Berlin", weekday: "long", month: "long", day: "numeric" });
const timeFormat = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" });

export function MacbookDesktop({ files = [] }: { files?: HomeEntry[] }) {
  const [locked, setLocked] = useState(true);
  const [visible, setVisible] = useState(true);
  const [now, setNow] = useState<Date | null>(null);
  const [file, setFile] = useState<DocumentFile | null>(null);
  const enter = useRef<HTMLButtonElement>(null);
  const time = now ? timeFormat.format(now) : "–:––";
  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 15000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!locked) return;
    function keydown(event: KeyboardEvent) {
      if (event.key !== "Enter" || event.repeat || event.target !== document.body) return;
      const box = enter.current?.getBoundingClientRect();
      if (box && box.top >= 0 && box.bottom <= window.innerHeight) {
        event.preventDefault();
        enter.current?.click();
      }
    }
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [locked]);

  return (
    <div className="macbook-desktop">
      <MacbookPro src="/macbook/wallpaper.webp" role="img" aria-label="Arda’s MacBook Pro with the wallpaper “do first, perfect later.”" />
      <div className="macbook-screen">
        {locked ? <div className="mac-lock">
          <div className="mac-lock-clock"><span>{now && dateFormat.format(now)}</span><strong>{time}</strong></div>
          <button ref={enter} className="mac-unlock" onClick={() => { setVisible(true); setLocked(false); }}>
            <span className="mac-avatar" style={{ backgroundImage: "url(/portrait/arda-tiles.webp)" }} /><b>Arda Taş</b><span>Press Enter to unlock ↵</span>
          </button>
        </div> : <>
          <MacOSMenuBar time={time} visible={visible} toggleTerminal={() => setVisible(v => !v)}
            lock={() => { setFile(null); setLocked(true); requestAnimationFrame(() => enter.current?.focus({ preventScroll: true })); }} />
          <Terminal files={files} visible={visible} onHide={() => setVisible(false)} onOpen={setFile} />
          <MacOSDock apps={apps} />
        </>}
      </div>
      {file && <DocumentWindow key={file.path} file={file} onClose={() => {
        setFile(null); document.getElementById("mac-command")?.focus({ preventScroll: true });
      }} />}
    </div>
  );
}
