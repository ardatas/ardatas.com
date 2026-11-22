import { useCallback, useEffect, useLayoutEffect, useRef, type KeyboardEvent, type PointerEvent, type MouseEvent } from 'react';

export type PaperGesture = { fold: number; pitch: number; roll: number; leaving: boolean; wake?: () => void };
type Point = { x: number; y: number };
type Drag = { pointer: number; start: Point; origin: Point; moved: boolean };
const clamp = (v: number, hi: number) => Math.max(0, Math.min(v, hi));
let stack = 1;

export function useNoteMovement(id: string, index: number, activate: () => void) {
  const slot = useRef<HTMLLIElement>(null);
  const position = useRef<Point | null>(null); // Fractions of the available board, independent of viewport size.
  const drag = useRef<Drag | null>(null);
  const last = useRef({ x: 0, y: 0, t: 0 });
  const timer = useRef(0);
  const suppressClick = useRef(false);
  const gesture = useRef<PaperGesture>({ fold: 0, pitch: 0, roll: 0, leaving: false });
  const key = 'links-position:' + id;

  const place = useCallback((pixel?: Point) => {
    const el = slot.current;
    if (!el) return;
    const board = el.parentElement!;
    const width = Math.max(0, board.clientWidth - el.offsetWidth);
    const height = Math.max(0, board.clientHeight - el.offsetHeight);
    if (pixel) position.current = {
      x: width ? clamp(pixel.x, width) / width : 0,
      y: height ? clamp(pixel.y, height) / height : 0,
    };
    const saved = position.current;
    el.style.setProperty('--note-x', (saved ? saved.x * width - el.offsetLeft : 0) + 'px');
    el.style.setProperty('--note-y', (saved ? saved.y * height - el.offsetTop : 0) + 'px');
  }, []);
  function persist() {
    try {
      if (position.current) localStorage.setItem(key, JSON.stringify(position.current));
      else localStorage.removeItem(key);
    } catch { /* Moving still works when browser storage is unavailable. */ }
  }
  useLayoutEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem(key) || 'null');
      if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) position.current = { x: clamp(p.x, 1), y: clamp(p.y, 1) };
    } catch { /* Start in the grid. */ }
    const observer = new ResizeObserver(() => place());
    observer.observe(slot.current!);
    observer.observe(slot.current!.parentElement!);
    place();
    return () => observer.disconnect();
  }, [key, index, place]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  function signal(fold: number, pitch: number, roll: number, leaving = false) {
    const motion = gesture.current;
    Object.assign(motion, { fold, pitch, roll, leaving });
    slot.current?.style.setProperty('--flex', String(fold));
    motion.wake?.();
  }
  function settle(leaving = false) {
    clearTimeout(timer.current);
    signal(0, 0, 0, leaving);
  }
  function origin() {
    const el = slot.current!;
    const rect = el.getBoundingClientRect(), board = el.parentElement!.getBoundingClientRect();
    return { x: rect.left - board.left, y: rect.top - board.top };
  }
  function down(e: PointerEvent<HTMLLIElement>) {
    if (!e.isPrimary || e.button !== 0 || (e.target as Element).closest('.icon-btn')) return;
    suppressClick.current = false;
    drag.current = { pointer: e.pointerId, start: { x: e.clientX, y: e.clientY }, origin: origin(), moved: false };
    last.current = { x: e.clientX, y: e.clientY, t: e.timeStamp };
    // Capture on the pressed element so taps still activate their link, including on touch.
    (e.target as Element).setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent<HTMLLIElement>) {
    if (!e.isPrimary) return;
    const el = e.currentTarget;
    const d = drag.current;
    if (d && d.pointer === e.pointerId) {
      const dx = e.clientX - d.start.x, dy = e.clientY - d.start.y;
      if (!d.moved && Math.hypot(dx, dy) >= 5) {
        d.moved = true;
        suppressClick.current = true;
        el.dataset.dragging = 'true';
        el.style.zIndex = String(++stack);
      }
      if (d.moved) place({ x: d.origin.x + dx, y: d.origin.y + dy });
    }
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const prev = last.current;
    const dt = Math.max(8, e.timeStamp - prev.t);
    const vx = prev.t ? (e.clientX - prev.x) / dt : 0, vy = prev.t ? (e.clientY - prev.y) / dt : 0;
    last.current = { x: e.clientX, y: e.clientY, t: e.timeStamp };
    const rect = el.getBoundingClientRect();
    const nx = clamp((e.clientX - rect.left) / rect.width, 1) - .5;
    const ny = clamp((e.clientY - rect.top) / rect.height, 1) - .5;
    const speed = Math.min(1, Math.hypot(vx, vy));
    signal((d?.moved ? .32 : .09) + .26 * speed, -.15 * ny - .045 * Math.tanh(vy), .15 * nx + .045 * Math.tanh(vx));
    activate();
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => signal(drag.current?.moved ? .25 : 0, 0, 0), 130);
  }
  function finish(e: PointerEvent<HTMLLIElement>) {
    const d = drag.current;
    if (!d || d.pointer !== e.pointerId) return;
    drag.current = null;
    if (d.moved) {
      if (e.type === 'pointercancel') place(d.origin);
      else persist();
      delete e.currentTarget.dataset.dragging;
    }
    settle(true);
  }
  function keyboard(e: KeyboardEvent<HTMLButtonElement>) {
    const steps: Record<string, Point> = { ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 } };
    if (e.key === 'Home') { e.preventDefault(); position.current = null; place(); persist(); return; }
    const step = steps[e.key];
    if (!step) return;
    e.preventDefault();
    const current = origin(), distance = e.shiftKey ? 48 : 12;
    slot.current!.style.zIndex = String(++stack);
    place({ x: current.x + step.x * distance, y: current.y + step.y * distance });
    persist();
  }
  return { slot, gesture, keyboard, events: {
    onPointerDown: down, onPointerMove: move, onPointerUp: finish, onPointerCancel: finish,
    onLostPointerCapture: finish,
    onPointerLeave: () => {
      if (drag.current) return;
      last.current.t = 0; settle(true);
    },
    onDragStart: (e: MouseEvent) => e.preventDefault(),
    onClickCapture: (e: MouseEvent) => {
      if (suppressClick.current && e.detail !== 0) { e.preventDefault(); e.stopPropagation(); suppressClick.current = false; }
    },
  } };
}
