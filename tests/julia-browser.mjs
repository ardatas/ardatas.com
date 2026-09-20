import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.JULIA_TEST_URL || 'http://127.0.0.1:8766';

for (const [name, engine] of [['Chromium', chromium], ['WebKit', webkit]]) {
  const browser = await engine.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/julia/`);
  await page.waitForFunction(() => Number(document.querySelector('[data-julia]').dataset.frames) > 0);
  assert.equal(await page.locator('[data-julia]').getAttribute('data-renderer'), 'simd');
  const image = () => page.locator('canvas').evaluate(canvas => canvas.toDataURL());
  const initial = await image();
  assert.equal(await page.locator('[data-param=cr]').inputValue(), '-0.5125');
  const frames = () => page.locator('[data-julia]').evaluate(el => Number(el.dataset.frames));
  async function changed(action) {
    const before = await frames();
    await action();
    await page.waitForFunction(n => Number(document.querySelector('[data-julia]').dataset.frames) > n, before);
    await page.waitForFunction(() => document.querySelector('canvas').width === 800);
  }

  await changed(() => page.locator('[data-param=cr]').fill('-0.8'));
  assert.notEqual(await image(), initial);
  await changed(() => page.locator('[data-param=color]').check());
  assert.equal(await page.locator('canvas').evaluate(canvas => {
    const bytes = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 0; i < bytes.length; i += 4) if (bytes[i] !== bytes[i+1]) return true;
    return false;
  }), true);
  await page.locator('[data-param=iterations]').fill('999999');
  assert.equal(await page.locator('[data-param=iterations]').getAttribute('aria-invalid'), 'true');
  await changed(() => page.locator('[data-action=reset]').click());

  const box = await page.locator('canvas').boundingBox();
  await changed(async () => {
    await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5, { steps: 5 });
    await page.mouse.up();
  });
  assert.ok(Number(await page.locator('[data-param=sr]').inputValue()) < -2);
  await changed(() => page.locator('[data-action=reset]').click());
  await page.locator('canvas').focus();
  await changed(async () => {
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.mouse.wheel(0, -120);
  });
  assert.ok(Number(await page.locator('[data-param=res]').inputValue()) < 0.005);
  await page.locator('canvas').press('Escape');
  assert.equal(await page.locator('canvas').evaluate(el => document.activeElement === el), false);
  await changed(() => page.locator('[data-action=reset]').click());
  assert.equal(await image(), initial);

  await changed(() => page.locator('[data-action=zoom-in]').click());
  assert.notEqual(await image(), initial);
  await changed(() => page.locator('canvas').press('Home'));
  assert.equal(await image(), initial);
  await changed(() => page.locator('canvas').press('ArrowRight'));
  assert.notEqual(await image(), initial);
  await changed(() => page.locator('[data-action=reset]').click());

  const startFrames = await frames();
  await page.locator('[data-action=animate]').click();
  await page.waitForTimeout(1200);
  const animationFrames = await frames() - startFrames;
  assert.ok(animationFrames >= 10, `${name}: only ${animationFrames} animated frames`);
  await changed(() => page.locator('[data-action=animate]').click());
  assert.equal(await page.locator('[data-action=animate]').getAttribute('aria-pressed'), 'false');
  assert.notEqual(await image(), initial);

  await page.locator('[data-action=animate]').click();
  await page.locator('[data-param=cr]').focus();
  assert.equal(await page.locator('[data-action=animate]').getAttribute('aria-pressed'), 'false');

  await changed(() => page.locator('[data-action=reset]').click());
  const downloading = page.waitForEvent('download');
  await page.locator('[data-action=download]').click();
  const download = await downloading;
  const png = readFileSync(await download.path());
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(png.readUInt32BE(16), 800);
  assert.equal(png.readUInt32BE(20), 600);

  // Clipboard fallback retains a usable, parameter-complete link.
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true }));
  await page.locator('[data-action=share]').click();
  const shareURL = await page.locator('[data-feedback] a').getAttribute('href');
  assert.equal(new URL(shareURL).searchParams.get('cr'), '-0.5125');
  await page.goto(shareURL.replace('cr=-0.5125', 'cr=-0.8'));
  await page.waitForFunction(() => document.querySelector('[data-julia]').dataset.frames);
  assert.equal(await page.locator('[data-param=cr]').inputValue(), '-0.8');
  assert.notEqual(await image(), initial);

  // A new request interrupts a costly old frame between C row batches.
  const cancellation = await page.evaluate(async () => {
    const versions = await (await fetch(document.querySelector('[data-julia]').dataset.manifest)).json();
    const worker = new Worker(`/julia/worker.js?v=${versions['worker.js']}`, { type: 'module' });
    return await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { worker.terminate(); reject(new Error('Cancellation timeout')); }, 5000);
      const start = performance.now();
      worker.onmessage = ({ data }) => {
        if (data.type === 'ready') {
          worker.postMessage({ type: 'render', id: 1, params: { cr: 0, ci: 0, sr: 0, si: 0,
            width: 2048, height: 2048, res: 0.000001, iterations: 2000, color: false } });
          setTimeout(() => worker.postMessage({ type: 'render', id: 2, params: { cr: -0.5, ci: 0.5, sr: -2, si: 1.5,
            width: 64, height: 64, res: 0.05, iterations: 100, color: false } }), 10);
        } else if (data.type === 'frame') {
          clearTimeout(timeout);
          worker.terminate();
          resolve({ id: data.id, ms: performance.now() - start });
        }
      };
      worker.postMessage({ type: 'init', versions });
    });
  });
  assert.equal(cancellation.id, 2);

  // SIMD download failure falls back to the real C scalar build.
  await page.route('**/renderer-simd.wasm*', route => route.abort());
  await page.goto(`${base}/julia/`);
  await page.waitForFunction(() => document.querySelector('[data-julia]').dataset.frames);
  assert.equal(await page.locator('[data-julia]').getAttribute('data-renderer'), 'scalar');
  assert.equal(await image(), initial);
  await page.unroute('**/renderer-simd.wasm*');

  // The homepage presents Julia using the same compact card as other projects.
  await page.goto(`${base}/#projects`);
  assert.equal(await page.locator('[data-julia]').count(), 0);
  const cards = page.locator('#projects a.group');
  assert.equal(await cards.count(), 3);
  const sizes = await cards.evaluateAll(elements => elements.map(element => {
    const { width, height } = element.getBoundingClientRect();
    return { width, height };
  }));
  assert.deepEqual(sizes[2], sizes[0]);
  await page.locator('#projects a[href="/julia/"]').click();
  await page.waitForURL(`${base}/julia/`);
  await page.waitForFunction(() => document.querySelector('[data-julia]').dataset.frames);
  await page.locator('[data-action=animate]').click();
  await page.locator('[data-julia]').evaluate(element => element.style.display = 'none');
  await page.waitForFunction(() => document.querySelector('[data-action=animate]').getAttribute('aria-pressed') === 'false');
  assert.deepEqual(errors, []);
  console.log(`${name}: controls, native defaults, ${animationFrames} frames / 1.2s, PNG, sharing, cancellation (${Math.round(cancellation.ms)}ms), scalar fallback, offscreen pause pass.`);

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  await mobile.goto(`${base}/#projects`);
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await mobile.locator('#projects a[href="/julia/"]').tap();
  await mobile.waitForURL(`${base}/julia/`);
  await mobile.waitForFunction(() => document.querySelector('[data-julia]').dataset.frames);
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.equal(await mobile.locator('[data-action=animate]').getAttribute('aria-pressed'), 'false');
  await mobile.locator('[data-action=touch]').tap();
  assert.equal(await mobile.locator('canvas').evaluate(el => getComputedStyle(el).touchAction), 'none');
  await mobile.locator('[data-action=touch]').tap();
  assert.equal(await mobile.locator('canvas').evaluate(el => getComputedStyle(el).touchAction), 'pan-y');
  if (name === 'Chromium') {
    await mobile.locator('[data-action=touch]').tap();
    await mobile.locator('canvas').scrollIntoViewIfNeeded();
    const box = await mobile.locator('canvas').boundingBox();
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    const session = await mobile.context().newCDPSession(mobile);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [
      { x: x - 30, y, id: 0 }, { x: x + 30, y, id: 1 },
    ] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [
      { x: x - 60, y, id: 0 }, { x: x + 60, y, id: 1 },
    ] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await mobile.waitForFunction(() => Number(document.querySelector('[data-param=res]').value) < 0.005);
    await mobile.locator('[data-action=reset]').tap();
    await mobile.locator('[data-action=touch]').tap();
  }
  await mobile.setViewportSize({ width: 320, height: 700 });
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.screenshot({ path: `/tmp/julia-${name.toLowerCase()}-mobile.png`, fullPage: true });
  await browser.close();
  console.log(`${name}: mobile overflow, reduced-motion start state, and touch exploration controls pass.`);
}
