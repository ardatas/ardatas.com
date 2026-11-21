import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { DocumentFile } from "@/lib/macbook-shell";

function bounds() {
  const width = Math.min(700, window.innerWidth - 16);
  const height = Math.min(780, Math.round(window.innerHeight * .78));
  return { width, height, maxX: window.innerWidth - width - 8, maxY: window.innerHeight - height - 8 };
}

const clamp = (value: number, max: number) => Math.max(8, Math.min(value, max));

export default function DocumentWindow({ file, onClose }: { file: DocumentFile; onClose: () => void }) {
  const title = file.path.split("/").pop()!;
  const [size, setSize] = useState(bounds);
  const [position, setPosition] = useState(() => ({
    x: 8 + Math.random() * (size.maxX - 8), y: 8 + Math.random() * (size.maxY - 8),
  }));
  const [zoom, setZoom] = useState(100);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const windowRef = useRef<HTMLElement>(null);
  useEffect(() => {
    windowRef.current?.focus({ preventScroll: true });
    function resize() {
      const next = bounds(); setSize(next);
      setPosition(p => ({ x: clamp(p.x, next.maxX), y: clamp(p.y, next.maxY) }));
    }
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  return createPortal(<section role="dialog" aria-label={title} tabIndex={-1} ref={windowRef} className="mac-preview"
    style={{ left: position.x, top: position.y, width: size.width, height: size.height }}
    onKeyDown={e => { if (e.key === "Escape") onClose(); }}>
    <header className="mac-preview-header" onPointerDown={e => {
      if (e.button !== 0 || (e.target as Element).closest("button, a")) return;
      drag.current = { x: e.clientX - position.x, y: e.clientY - position.y };
      e.currentTarget.setPointerCapture(e.pointerId);
    }} onPointerMove={e => {
      if (drag.current) setPosition({ x: clamp(e.clientX - drag.current.x, size.maxX), y: clamp(e.clientY - drag.current.y, size.maxY) });
    }} onLostPointerCapture={() => { drag.current = null; }}>
      <button className="mac-preview-close" aria-label="Close document" title="Close document" onClick={onClose}>×</button>
      <div className="mac-preview-filename"><strong>{title}</strong><small>{file.pages} {file.pages === 1 ? "page" : "pages"}</small></div>
      <div className="mac-preview-tools">
        <button aria-label="Zoom out" disabled={zoom <= 50} onClick={() => setZoom(z => z - 25)}>−</button>
        <button aria-label="Fit to width" title="Fit to width" onClick={() => setZoom(100)}>{zoom}%</button>
        <button aria-label="Zoom in" disabled={zoom >= 300} onClick={() => setZoom(z => z + 25)}>+</button>
        <a href={file.url + "/original.pdf"} target="_blank" rel="noreferrer" aria-label="Open original PDF in a new tab" title="Open original PDF">↗</a>
      </div>
    </header>
    <div className="mac-preview-pages" tabIndex={0} aria-label="Document pages">
      <div className="mac-preview-paper" style={{ width: zoom + "%" }}>
        {Array.from({ length: file.pages }, (_, i) => <img key={i} src={file.url + "/" + (i + 1) + ".svg"} loading={i ? "lazy" : "eager"} alt={title + ", page " + (i + 1)} />)}
      </div>
    </div>
  </section>, document.body);
}
