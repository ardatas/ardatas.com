import { useEffect, useRef, type KeyboardEvent, type PointerEvent, type MouseEvent } from 'react';

export type PaperGesture = { fold: number; pitch: number; roll: number; leaving: boolean; wake?: () => void };
type Drag = { pointer: number; x: number; y: number; moved: boolean };
const clamp = (v: number, hi: number) => Math.max(0, Math.min(v, hi));

export function useNoteMovement(moveTo: (target: string) => void, activate: () => void) {
  const slot = useRef<HTMLLIElement>(null);
  const drag = useRef<Drag | null>(null);
  const last = useRef({ x: 0, y: 0, t: 0 });
  const timer = useRef(0);
  const suppressClick = useRef(false);
  const gesture = useRef<PaperGesture>({ fold: 0, pitch: 0, roll: 0, leaving: false });
  const target = useRef<HTMLElement | null>(null);
  function highlight(next: HTMLElement | null) {
    if (target.current) delete target.current.dataset.dropTarget;
    target.current = next;
    if (next) next.dataset.dropTarget = 'true';
  }
  useEffect(() => () => { clearTimeout(timer.current); highlight(null); }, []);

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
  function targetAt(x: number, y: number) {
    const hit = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-note-id]');
    return hit && hit !== slot.current && hit.parentElement === slot.current?.parentElement ? hit : null;
  }
  function down(e: PointerEvent<HTMLLIElement>) {
    if (!e.isPrimary || e.button !== 0 || (e.target as Element).closest('.icon-btn')) return;
    suppressClick.current = false;
    drag.current = { pointer: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
    last.current = { x: e.clientX, y: e.clientY, t: e.timeStamp };
    // Capture on the pressed element so taps still activate their link, including on touch.
    (e.target as Element).setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent<HTMLLIElement>) {
    if (!e.isPrimary) return;
    const el = e.currentTarget;
    const d = drag.current;
    if (d && d.pointer === e.pointerId) {
      const dx = e.clientX - d.x, dy = e.clientY - d.y;
      if (!d.moved && Math.hypot(dx, dy) >= 5) {
        d.moved = true;
        suppressClick.current = true;
        el.dataset.dragging = 'true';
      }
      if (d.moved) {
        highlight(targetAt(e.clientX, e.clientY));
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
    highlight(null);
    if (d.moved) {
      delete e.currentTarget.dataset.dragging;
      const id = e.type === 'pointerup' && targetAt(e.clientX, e.clientY)?.dataset.noteId;
      if (id) moveTo(id);
    }
    settle(true);
  }
  function keyboard(e: KeyboardEvent<HTMLButtonElement>) {
    const grid = slot.current?.parentElement;
    if (!grid) return;
    const columns = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns };
    if (!(e.key in steps)) return;
    e.preventDefault();
    const siblings = Array.from(grid.children);
    const destination = siblings[siblings.indexOf(slot.current!) + steps[e.key]] as HTMLElement | undefined;
    if (destination?.dataset.noteId) moveTo(destination.dataset.noteId);
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
