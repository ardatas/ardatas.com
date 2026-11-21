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

export function MacbookDesktop() {
  return (
    <div className="macbook-desktop">
      <MacbookPro src="/macbook/wallpaper.webp" role="img" aria-label="Arda’s MacBook Pro with the wallpaper “do first, perfect later.”" />
      <div className="macbook-screen"><MacOSDock apps={apps} /></div>
    </div>
  );
}
