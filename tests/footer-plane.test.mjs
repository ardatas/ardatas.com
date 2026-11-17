import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../public/footer-plane.js', import.meta.url), 'utf8');
function fixture({ reduced = false, webgl = true } = {}) {
  const listeners = new Map(), frames = new Map(), observers = [];
  let id = 0, draws = 0;
  const gl = new Proxy({ getProgramParameter: () => true, drawArrays: () => draws++ }, {
    get(target, key) { return target[key] ?? (() => ({})); },
  });
  const listen = (prefix) => ({
    addEventListener: (name, fn) => listeners.set(prefix + name, fn),
    removeEventListener: (name) => listeners.delete(prefix + name),
  });
  const canvas = { ...listen('canvas:'), clientWidth: 200, clientHeight: 100, dataset: {},
    setAttribute() {}, toggleAttribute() {}, getContext: () => webgl ? gl : null };
  const host = { append(node) { assert.equal(node, canvas); this.child = node; } };
  const document = { ...listen('document:'), hidden: false,
    getElementById: () => host, createElement: () => canvas };
  const motion = { ...listen('motion:'), matches: reduced };
  class Observer {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe() {}
    disconnect() {}
  }
  vm.runInNewContext(source, { document, window: { devicePixelRatio: 3 },
    matchMedia: () => motion, getComputedStyle: () => ({ getPropertyValue: () => '#ffffff' }),
    IntersectionObserver: Observer, ResizeObserver: Observer,
    requestAnimationFrame: fn => { frames.set(++id, fn); return id; },
    cancelAnimationFrame: key => frames.delete(key),
  });
  const step = () => { const next = frames.entries().next().value; assert.ok(next); frames.delete(next[0]); next[1](1000); };
  return { canvas, host, document, motion, listeners, frames, observers, step, draws: () => draws };
}

test('footer waits for visibility, caps resolution and pauses hidden animation', () => {
  const f = fixture();
  assert.equal(f.frames.size, 0);
  f.observers[0].callback([{ isIntersecting: true }]);
  f.step();
  assert.equal(f.draws(), 1);
  assert.equal(f.canvas.width, 400);
  assert.equal(f.canvas.height, 200);
  assert.equal(f.frames.size, 1);
  f.document.hidden = true;
  f.listeners.get('document:visibilitychange')();
  assert.equal(f.frames.size, 0);
  f.document.hidden = false;
  f.listeners.get('document:visibilitychange')();
  assert.equal(f.frames.size, 1);
  f.observers[0].callback([{ isIntersecting: false }]);
  assert.equal(f.frames.size, 0);
});

test('reduced motion draws one frame and WebGL failure leaves a harmless canvas', () => {
  const f = fixture({ reduced: true });
  f.observers[0].callback([{ isIntersecting: true }]);
  f.step();
  assert.equal(f.draws(), 1);
  assert.equal(f.frames.size, 0);
  const unavailable = fixture({ webgl: false });
  assert.equal(unavailable.host.child, unavailable.canvas);
  assert.equal(unavailable.observers.length, 0);
});

test('context loss cancels frames and restoration resumes only when visible', () => {
  const f = fixture();
  f.observers[0].callback([{ isIntersecting: true }]);
  let prevented = false;
  f.listeners.get('canvas:webglcontextlost')({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(f.frames.size, 0);
  f.listeners.get('canvas:webglcontextrestored')();
  assert.equal(f.frames.size, 1);
});
