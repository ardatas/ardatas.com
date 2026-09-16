let renderer;
let mode;
let pending;
let running = false;
let generation = 0;

const yieldTask = () => new Promise(resolve => setTimeout(resolve, 0));

async function initialize(versions, forceScalar) {
  const simd = !forceScalar && WebAssembly.validate(new Uint8Array([
    0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,
    10,10,1,8,0,65,0,253,15,253,98,11,
  ]));
  const candidates = simd ? ['simd', 'scalar'] : ['scalar'];
  for (const candidate of candidates) {
    try {
      const name = `renderer-${candidate}`;
      const { default: createRenderer } = await import(`./${name}.js?v=${versions[`${name}.js`]}`);
      renderer = await createRenderer({
        locateFile: file => new URL(`${file}?v=${versions[file]}`, import.meta.url).href,
      });
      mode = candidate;
      postMessage({ type: 'ready', mode });
      return;
    } catch (error) {
      if (candidate === 'scalar') throw error;
    }
  }
}

async function drain() {
  if (running || !renderer) return;
  running = true;
  try {
    while (pending) {
      const job = pending;
      pending = null;
      const token = generation;
      const p = job.params;
      const started = performance.now();
      if (!Number.isInteger(p.width) || !Number.isInteger(p.height) ||
          !Number.isInteger(p.iterations) || p.iterations < 0 || p.iterations > 2000 ||
          !renderer._prepare(p.width, p.height)) throw new Error('Invalid image dimensions.');
      let y = 0;
      while (y < p.height && token === generation) {
        const deadline = performance.now() + 8;
        do {
          const rows = Math.min(4, p.height - y);
          if (!renderer._render_rows(p.cr, p.ci, p.sr, p.si, p.res, p.iterations, Number(p.color), y, rows)) {
            throw new Error('Invalid rendering parameters.');
          }
          y += rows;
        } while (y < p.height && performance.now() < deadline);
        if (y < p.height) await yieldTask();
      }
      if (token !== generation) continue;
      const address = renderer._get_pixels();
      const rgba = renderer.HEAPU8.slice(address, address + p.width * p.height * 4);
      postMessage({ type: 'frame', id: job.id, width: p.width, height: p.height,
        elapsed: performance.now() - started, mode, buffer: rgba.buffer }, [rgba.buffer]);
    }
  } catch (error) {
    postMessage({ type: 'error', message: error.message });
  } finally {
    running = false;
  }
}

self.onmessage = async ({ data }) => {
  if (data.type === 'init') {
    try {
      await initialize(data.versions, data.forceScalar);
      drain();
    } catch (error) {
      postMessage({ type: 'error', message: 'The renderer could not load. Reload the page to try again.' });
    }
  } else if (data.type === 'render') {
    generation++;
    pending = data;
    drain();
  } else if (data.type === 'cancel') {
    generation++;
    pending = null;
  }
};
