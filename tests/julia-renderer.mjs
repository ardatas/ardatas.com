import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const upstream = readFileSync('src/julia/vendor/julia.c', 'utf8')
  .replace('#if defined(__SSE2__)\nstatic __m128i calculate_channel4', 'static __m128i calculate_channel4')
  .replace('#endif\n\nstatic unsigned julia_iterations', 'static unsigned julia_iterations');
assert.equal(createHash('sha256').update(upstream).digest('hex'),
  'e7cdf0089317c8de18fa2316ff299f3ab25e68e41d25018d323d26a28cc58b1d',
  'The vendored kernel must match the pinned upstream except for the documented SIMD guard.');

const scratch = mkdtempSync(join(tmpdir(), 'julia-parity-'));
const native = join(scratch, 'reference');
const build = spawnSync(process.env.CC || 'cc', ['-std=c17', '-O3', '-ffp-contract=off', '-U__SSE2__',
  'tests/julia-reference.c', 'src/julia/vendor/julia.c', '-o', native], { encoding: 'utf8' });
assert.equal(build.status, 0, build.stderr);

// Includes defaults, both palettes, SIMD remainders, radius-2 equality, no
// iterations, all-interior points, immediate escape, and a close view.
const cases = [
  [-0.5125, 0.5213, -2, 1.5, 800, -600, 0.005, 100, 0],
  [-0.5125, 0.5213, -2, 1.5, 800, -600, 0.005, 100, 1],
  ...[1, 2, 3, 4, 5, 7, 65].flatMap(width => [0, 1].map(color =>
    [-0.8, 0.156, -1.6, 1.2, width, -31, 0.04, 200, color])),
  [0, 0, -2, 0, 7, -3, 0.5, 0, 0],
  [0, 0, -2, 0, 7, -3, 0.5, 0, 1],
  [0, 0, 2, 0, 7, -3, 0.5, 1, 1],
  [0, 0, -0.1, 0.1, 100, -100, 0.002, 2000, 0],
  [10, 10, -2, 1.5, 64, -64, 0.005, 100, 1],
  [-0.5125, 0.5213, -0.243, 0.411, 127, -95, 0.00002, 600, 1],
  [-0.5125, 0.5213, -2, 1.5, 65, 33, 0.05, 100, 1],
];

try {
  for (const mode of ['scalar', 'simd']) {
    const url = pathToFileURL(resolve(`public/julia/renderer-${mode}.js`));
    const { default: factory } = await import(url.href);
    const renderer = await factory({ wasmBinary: readFileSync(`public/julia/renderer-${mode}.wasm`) });
    for (const args of cases) {
      const [cr, ci, sr, si, width, signedHeight, res, n, color] = args;
      const height = Math.abs(signedHeight);
      const ref = spawnSync(native, args.map(String), { maxBuffer: 32 * 1024 * 1024 });
      assert.equal(ref.status, 0, ref.stderr.toString());
      assert.equal(renderer._prepare(width, height), 1);
      for (let y = 0; y < height; y += 7) {
        assert.equal(renderer._render_rows(cr, ci, sr, si, res, n, color, y, Math.min(7, height - y)), 1);
      }
      const address = renderer._get_pixels();
      const actual = Buffer.from(renderer.HEAPU8.slice(address, address + width * height * 4));
      assert.deepEqual(actual, ref.stdout, `${mode}: ${JSON.stringify(args)}`);
    }
    assert.equal(renderer._prepare(0, 600), 0);
    assert.equal(renderer._prepare(2049, 600), 0);
    assert.equal(renderer._render_rows(NaN, 0, 0, 0, 0.005, 100, 0, 0, 1), 0);
    assert.equal(renderer._render_rows(0, 0, 0, 0, 0.005, 2001, 0, 0, 1), 0);
    assert.equal(renderer._render_rows(0, 0, 0, 0, 0.005, 100, 0, -1, 1), 0);
    console.log(`${mode}: ${cases.length} native-reference images match byte for byte; input bounds pass.`);
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

const { DEFAULTS, readParameters, parameterURL, zoomAt, renderParameters } = await import('../public/julia/state.js');
assert.deepEqual(readParameters(new URL(parameterURL(DEFAULTS, 'https://ardatas.com')).search), DEFAULTS);
assert.deepEqual(readParameters('?cr=NaN&width=0&iterations=Infinity&res=&si=1e99'), DEFAULTS);
const zoom = zoomAt(DEFAULTS, 0.5, 0.3, 0.7);
assert.ok(Math.abs(zoom.sr + 0.3 * zoom.width * zoom.res - (DEFAULTS.sr + 0.3 * DEFAULTS.width * DEFAULTS.res)) < 1e-12);
assert.ok(Math.abs(zoom.si - 0.7 * zoom.height * zoom.res - (DEFAULTS.si - 0.7 * DEFAULTS.height * DEFAULTS.res)) < 1e-12);
const preview = renderParameters(DEFAULTS, 400);
assert.equal(preview.width * preview.res, DEFAULTS.width * DEFAULTS.res);
assert.equal(preview.height * preview.res, DEFAULTS.height * DEFAULTS.res);
console.log('Parameter sharing, invalid URLs, cursor-anchored zoom, and preview extent checks pass.');
