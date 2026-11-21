"use client";

import Image, { type StaticImageData } from "next/image";
import { useEffect, useRef, useState, type ReactNode, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";
import type { DocumentFile } from "@/lib/macbook-shell";

interface Safari01Props {
  image?: StaticImageData | string;
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
          ? <Image unoptimized src={image} alt="Preview" width={800} height={450} className="object-contain max-h-full max-w-full" />
          : <span className="text-sm text-gray-500 dark:text-gray-400">No preview image</span>)}
      </div>
    </div>
  );
}

const margin = 8;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));
type WindowRect = { x: number; y: number; width: number; height: number };

function limits() {
  const right = window.innerWidth - margin;
  const bottom = window.innerHeight - margin;
  const top = Math.max(margin, Math.ceil(document.getElementById("portfolio-path")?.getBoundingClientRect().bottom ?? 0) + margin);
  const maxWidth = Math.min(1000, right - margin);
  const maxHeight = Math.min(1200, bottom - top);
  return { right, bottom, top, maxWidth, maxHeight, minWidth: Math.min(320, maxWidth), minHeight: Math.min(360, maxHeight) };
}

function fit(rect: WindowRect, area = limits()): WindowRect {
  const width = clamp(rect.width, area.minWidth, area.maxWidth);
  const height = clamp(rect.height, area.minHeight, area.maxHeight);
  return { width, height, x: clamp(rect.x, margin, area.right - width), y: clamp(rect.y, area.top, area.bottom - height) };
}

function initialWindow(): WindowRect {
  const area = limits();
  const height = Math.round(area.maxHeight * 0.94);
  // Start with an A4-shaped reading area, allowing for the toolbar and page margins.
  const width = clamp(Math.round((height - 68) / Math.SQRT2 + 28), area.minWidth, area.maxWidth);
  return fit({ width, height, x: margin + Math.random() * (area.right - margin - width),
    y: area.top + Math.random() * (area.bottom - area.top - height) }, area);
}

function resizeFromCorner(rect: WindowRect, width: number, height: number) {
  const area = limits();
  return { ...rect,
    width: clamp(width, area.minWidth, Math.min(area.maxWidth, area.right - rect.x)),
    height: clamp(height, area.minHeight, Math.min(area.maxHeight, area.bottom - rect.y)),
  };
}

export function DocumentWindow({ file, onClose }: { file: DocumentFile; onClose: () => void }) {
  const title = file.path.split("/").pop()!;
  const [rect, setRect] = useState(initialWindow);
  const resizeStart = useRef<{ x: number; y: number; rect: WindowRect } | null>(null);
  const [zoom, setZoom] = useState(100);
  const [dark, setDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const windowRef = useRef<HTMLElement>(null);
  useEffect(() => {
    windowRef.current?.focus({ preventScroll: true });
    function resize() {
      setRect(current => fit(current));
    }
    const theme = window.matchMedia("(prefers-color-scheme: dark)");
    const updateTheme = () => setDark(theme.matches);
    theme.addEventListener("change", updateTheme);
    window.addEventListener("resize", resize);
    return () => {
      theme.removeEventListener("change", updateTheme);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return createPortal(<section role="dialog" aria-label={title} tabIndex={-1} ref={windowRef} className={cn("mac-preview", dark && "dark")}
    style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
    onKeyDown={e => { if (e.key === "Escape") onClose(); }}>
    <Safari_01 className="mac-preview-frame min-w-0" onClose={onClose} headerProps={{
      onPointerDown(e) {
        if (e.button !== 0 || (e.target as Element).closest("button")) return;
        drag.current = { x: e.clientX - rect.x, y: e.clientY - rect.y };
        e.currentTarget.setPointerCapture(e.pointerId);
      },
      onPointerMove(e) {
        if (drag.current) setRect(fit({ ...rect, x: e.clientX - drag.current.x, y: e.clientY - drag.current.y }));
      },
      onLostPointerCapture() { drag.current = null; },
    }}>
      <div className="mac-preview-pages" tabIndex={0} aria-label="Document pages">
        <div className="mac-preview-paper" style={{ width: zoom + "%" }}>
          {Array.from({ length: file.pages }, (_, i) => <img key={i} src={file.url + "/" + (i + 1) + ".svg"} loading={i ? "lazy" : "eager"} alt={title + ", page " + (i + 1)} />)}
        </div>
      </div>
      <div className="mac-preview-tools" role="group" aria-label="PDF controls">
        <button aria-label="Zoom out" disabled={zoom <= 50} onClick={() => setZoom(z => z - 25)}>−</button>
        <button aria-label="Fit to width" title="Fit to width" onClick={() => setZoom(100)}>{zoom}%</button>
        <button aria-label="Zoom in" disabled={zoom >= 300} onClick={() => setZoom(z => z + 25)}>+</button>
        <a href={file.url + "/original.pdf"} target="_blank" rel="noreferrer" aria-label="Open original PDF in a new tab" title="Open original PDF">↗</a>
      </div>
      <button type="button" className="mac-preview-resize" aria-label="Resize PDF window"
        title="Drag or use arrow keys to resize. Press Enter to reset the size."
        onPointerDown={e => {
          if (e.button !== 0) return;
          resizeStart.current = { x: e.clientX, y: e.clientY, rect };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={e => {
          const start = resizeStart.current;
          if (start) setRect(resizeFromCorner(start.rect,
            start.rect.width + e.clientX - start.x, start.rect.height + e.clientY - start.y));
        }}
        onLostPointerCapture={() => { resizeStart.current = null; }}
        onKeyDown={e => {
          const dx = Number(e.key === "ArrowRight") - Number(e.key === "ArrowLeft");
          const dy = Number(e.key === "ArrowDown") - Number(e.key === "ArrowUp");
          if (!dx && !dy) return;
          e.preventDefault();
          setRect(resizeFromCorner(rect, rect.width + dx * 24, rect.height + dy * 24));
        }}
        onClick={e => {
          if (e.detail === 0) {
            const { width, height } = initialWindow();
            setRect(fit({ ...rect, width, height }));
          }
        }} />
    </Safari_01>
  </section>, document.body);
}
