"use client";

import { useEffect, useRef, useState, type ReactNode, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";
import type { DocumentFile } from "@/lib/macbook-shell";

interface Safari01Props {
  image?: string | { src: string };
  className?: string;
  children?: ReactNode;
  onClose?: () => void;
  headerProps?: HTMLAttributes<HTMLElement>;
}

export default function Safari_01({ image, className, children, onClose, headerProps }: Safari01Props) {
  return (
    <div className={cn("min-w-[700px] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-muted shadow-md overflow-hidden", className)}>
      <header {...headerProps} className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center space-x-2">
          {onClose
            ? <button type="button" className="mac-preview-close w-3 h-3 rounded-full bg-red-400" aria-label="Close document" title="Close document" onClick={onClose} />
            : <span className="w-3 h-3 rounded-full bg-red-400" />}
          <span className="w-3 h-3 rounded-full bg-yellow-400" />
          <span className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <div aria-hidden="true" className="flex-1 mx-4 bg-gray-200 dark:bg-zinc-800 rounded-md h-5 max-w-md" />
        <div aria-hidden="true" className="w-4 h-4" />
      </header>
      <div className="bg-gray-100 dark:bg-zinc-800 aspect-video flex items-center justify-center">
        {children ?? (image
          ? <img src={typeof image === "string" ? image : image.src} alt="Preview" width={800} height={450} className="object-contain max-h-full max-w-full" />
          : <span className="text-sm text-gray-500 dark:text-gray-400">No preview image</span>)}
      </div>
    </div>
  );
}

function bounds() {
  const width = Math.min(700, window.innerWidth - 16);
  const minY = Math.max(8, Math.ceil(document.getElementById("portfolio-path")?.getBoundingClientRect().bottom ?? 0) + 8);
  // Keep the supplied 16:9 preview on desktop and leave room to read pages on phones.
  const height = Math.min(window.innerHeight - minY - 8, width < 500 ? Math.round(window.innerHeight * .78) : Math.round((width - 2) * 9 / 16) + 39);
  return { width, height, minY, maxX: window.innerWidth - width - 8, maxY: window.innerHeight - height - 8 };
}

const clamp = (value: number, max: number) => Math.max(8, Math.min(value, max));

export function DocumentWindow({ file, onClose }: { file: DocumentFile; onClose: () => void }) {
  const title = file.path.split("/").pop()!;
  const [size, setSize] = useState(bounds);
  const [position, setPosition] = useState(() => ({
    x: 8 + Math.random() * (size.maxX - 8), y: size.minY + Math.random() * (size.maxY - size.minY),
  }));
  const [zoom, setZoom] = useState(100);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const windowRef = useRef<HTMLElement>(null);
  useEffect(() => {
    windowRef.current?.focus({ preventScroll: true });
    function resize() {
      const next = bounds(); setSize(next);
      setPosition(p => ({ x: clamp(p.x, next.maxX), y: Math.max(next.minY, clamp(p.y, next.maxY)) }));
    }
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  return createPortal(<section role="dialog" aria-label={title} tabIndex={-1} ref={windowRef} className="mac-preview dark"
    style={{ left: position.x, top: position.y, width: size.width, height: size.height }}
    onKeyDown={e => { if (e.key === "Escape") onClose(); }}>
    <Safari_01 className="mac-preview-frame min-w-0" onClose={onClose} headerProps={{
      onPointerDown(e) {
        if (e.button !== 0 || (e.target as Element).closest("button")) return;
        drag.current = { x: e.clientX - position.x, y: e.clientY - position.y };
        e.currentTarget.setPointerCapture(e.pointerId);
      },
      onPointerMove(e) {
        if (drag.current) setPosition({ x: clamp(e.clientX - drag.current.x, size.maxX), y: clamp(e.clientY - drag.current.y, size.maxY) });
      },
      onLostPointerCapture() { drag.current = null; },
    }}>
      <div className="mac-preview-pages" tabIndex={0} aria-label="Document pages">
        <div className="mac-preview-paper" style={{ width: zoom + "%" }}>
          {Array.from({ length: file.pages }, (_, i) => <img key={i} src={file.url + "/" + (i + 1) + ".svg"} loading={i ? "lazy" : "eager"} alt={title + ", page " + (i + 1)} />)}
        </div>
      </div>
      <div className="mac-preview-footer">
        <span className="mac-preview-filename">{title}</span>
        <div className="mac-preview-tools">
          <button aria-label="Zoom out" disabled={zoom <= 50} onClick={() => setZoom(z => z - 25)}>−</button>
          <button aria-label="Fit to width" title="Fit to width" onClick={() => setZoom(100)}>{zoom}%</button>
          <button aria-label="Zoom in" disabled={zoom >= 300} onClick={() => setZoom(z => z + 25)}>+</button>
          <a href={file.url + "/original.pdf"} target="_blank" rel="noreferrer" aria-label="Open original PDF in a new tab" title="Open original PDF">↗</a>
        </div>
      </div>
    </Safari_01>
  </section>, document.body);
}
