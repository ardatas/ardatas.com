import { useCallback, useEffect, useLayoutEffect, useRef, type KeyboardEvent, type PointerEvent, type MouseEvent } from 'react';

export type PaperGesture = { fold: number; pitch: number; roll: number; leaving: boolean; wake?: () => void };
type Point = { x: number; y: number };
type Position = Point & { space?: 'page' };
type Drag = { pointer: number; start: Point; origin: Point; client: Point; previous: Position | null; moved: boolean };
const clamp = (v: number, hi: number) => Math.max(0, Math.min(v, hi));
// A moved note can overlap the sticky navigation as well as the footer.
let stack = 101;
function pagePoint(el: HTMLElement): Point {
  const rect = el.getBoundingClientRect();
  return { x: rect.left + window.scrollX, y: rect.top + window.scrollY };
}

export function useNoteMovement(id: string, index: number, activate: () => void) {
  const slot = useRef<HTMLLIElement>(null);
  const position = useRef<Position | null>(null);
  const drag = useRef<Drag | null>(null);
  const last = useRef({ x: 0, y: 0, t: 0 });
  const timer = useRef(0);
  const scrollFrame = useRef(0);
  const suppressClick = useRef(false);
  const gesture = useRef<PaperGesture>({ fold: 0, pitch: 0, roll: 0, leaving: false });
  const key = 'links-position:' + id;

  const place = useCallback((pixel?: Point) => {
    const el = slot.current;
    if (!el) return;
    if (!pixel && !position.current) {
      el.style.removeProperty('--note-x');
      el.style.removeProperty('--note-y');
      return;
    }
    const board = el.parentElement!;
    const base = pagePoint(board);
    const width = Math.max(0, document.documentElement.clientWidth - el.offsetWidth);
    // Layout height excludes overflow from the translated notes themselves.
    const height = Math.max(0, Math.max(document.documentElement.clientHeight, document.body.offsetHeight) - el.offsetHeight);
    if (pixel) position.current = {
      space: 'page',
      x: width ? clamp(pixel.x, width) / width : 0,
      y: height ? clamp(pixel.y, height) / height : 0,
    };
    const saved = position.current!;
    // Older saved placements use the grid as their coordinate system until moved again.
    const page = saved.space === 'page';
    const x = (page ? saved.x * width - base.x : saved.x * (board.clientWidth - el.offsetWidth)) - el.offsetLeft;
    const y = (page ? saved.y * height - base.y : saved.y * (board.clientHeight - el.offsetHeight)) - el.offsetTop;
    el.style.setProperty('--note-x', x + 'px');
    el.style.setProperty('--note-y', y + 'px');
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
      if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) {
        position.current = { space: p.space === 'page' ? 'page' : undefined, x: clamp(p.x, 1), y: clamp(p.y, 1) };
        slot.current!.style.zIndex ||= String(++stack);
      }
    } catch { /* Start in the grid. */ }
    const observer = new ResizeObserver(() => place());
    observer.observe(slot.current!);
    observer.observe(slot.current!.parentElement!);
    // Font loading and navbar initialization can move the grid without resizing it.
    const header = slot.current!.closest('.board-desk')?.querySelector('.board-head');
    const nav = document.getElementById('portfolio-path');
    if (header) observer.observe(header);
    if (nav) observer.observe(nav);
    observer.observe(document.body);
    place();
    return () => observer.disconnect();
  }, [key, index, place]);
  useEffect(() => () => { window.clearTimeout(timer.current); cancelAnimationFrame(scrollFrame.current); }, []);

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
  function followPointer(d: Drag) {
    place({ x: d.origin.x + d.client.x + window.scrollX - d.start.x,
      y: d.origin.y + d.client.y + window.scrollY - d.start.y });
  }
  function scrollAtEdge() {
    scrollFrame.current = 0;
    const d = drag.current;
    if (!d?.moved) return;
    const edge = 54;
    const fromBottom = window.innerHeight - d.client.y;
    const speed = d.client.y < edge ? -1 + clamp(d.client.y / edge, 1)
      : fromBottom < edge ? 1 - clamp(fromBottom / edge, 1) : 0;
    if (!speed) return;
    const before = window.scrollY;
    window.scrollBy({ top: Math.sign(speed) * Math.ceil(Math.abs(speed) * 14), behavior: 'instant' });
    if (window.scrollY !== before) {
      followPointer(d);
      scrollFrame.current = requestAnimationFrame(scrollAtEdge);
    }
  }
  function down(e: PointerEvent<HTMLLIElement>) {
    if (!e.isPrimary || e.button !== 0 || (e.target as Element).closest('.icon-btn')) return;
    suppressClick.current = false;
    drag.current = { pointer: e.pointerId, start: { x: e.pageX, y: e.pageY }, origin: pagePoint(e.currentTarget),
      client: { x: e.clientX, y: e.clientY }, previous: position.current, moved: false };
    last.current = { x: e.clientX, y: e.clientY, t: e.timeStamp };
    // Capture on the pressed element so taps still activate their link, including on touch.
    (e.target as Element).setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent<HTMLLIElement>) {
    if (!e.isPrimary) return;
    const el = e.currentTarget;
    const d = drag.current;
    if (d && d.pointer === e.pointerId) {
      d.client = { x: e.clientX, y: e.clientY };
      const dx = e.pageX - d.start.x, dy = e.pageY - d.start.y;
      if (!d.moved && Math.hypot(dx, dy) >= 5) {
        d.moved = true;
        suppressClick.current = true;
        el.dataset.dragging = 'true';
        el.style.zIndex = String(++stack);
      }
      if (d.moved) {
        followPointer(d);
        if (!scrollFrame.current) scrollFrame.current = requestAnimationFrame(scrollAtEdge);
      }
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
    cancelAnimationFrame(scrollFrame.current);
    scrollFrame.current = 0;
    if (d.moved) {
      if (e.type === 'pointercancel') { position.current = d.previous; place(); }
      else persist();
      delete e.currentTarget.dataset.dragging;
    }
    settle(true);
  }
  function keyboard(e: KeyboardEvent<HTMLButtonElement>) {
    const steps: Record<string, Point> = { ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 } };
    if (e.key === 'Home') { e.preventDefault(); position.current = null; slot.current!.style.removeProperty('z-index'); place(); persist(); return; }
    const step = steps[e.key];
    if (!step) return;
    e.preventDefault();
    const current = pagePoint(slot.current!), distance = e.shiftKey ? 48 : 12;
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
