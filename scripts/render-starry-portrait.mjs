// Rebuild the looping portrait after changing the photo. Requires ffmpeg and img2webp.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, copyFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const columns = 240;
const rows = 320;
const pitch = 3;
const width = columns * pitch;
const height = rows * pitch;
const frames = 25;
const frameDurationMs = 100;
const tau = 2 * Math.PI;
const output = "public/portrait";

// Area sampling keeps the highlights, glasses and building legible at mobile size.
const samples = execFileSync("ffmpeg", [
  "-v", "error", "-i", "public/assets/arda-portrait.jpg",
  "-vf", `scale=${columns}:${rows}:flags=area`, "-frames:v", "1",
  "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1",
]);

// Coverage for one softly rounded square on the reference's dark grid.
const coverage = Array.from({ length: pitch * pitch }, (_, index) => {
  const x = Math.abs(index % pitch + 0.5 - pitch / 2);
  const y = Math.abs(Math.floor(index / pitch) + 0.5 - pitch / 2);
  const corner = Math.hypot(Math.max(0, x - pitch * 0.27), Math.max(0, y - pitch * 0.27));
  return Math.min(1, 0.5 + pitch * 0.18 - corner);
});

const phases = Array.from({ length: columns * rows }, (_, cell) => {
  const seed = Math.sin((cell + 1) * 78.233) * 43758.5453;
  return tau * (seed - Math.floor(seed));
});

function render(frame) {
  const pixels = Buffer.alloc(width * height * 3);
  const progress = frame / frames;
  for (let cell = 0; cell < phases.length; cell++) {
    const x = cell % columns;
    const y = Math.floor(cell / columns);
    // A narrow band lights successive rows. Tiles outside the band stay identical
    // between frames so the animated WebP can reuse them.
    const phase = y / rows + 0.035 * Math.sin(tau * x / columns) - progress;
    const distance = Math.abs(phase - Math.round(phase));
    const band = Math.max(0, 1 - distance * 8);
    const glint = (1 + Math.cos(phases[cell])) / 2;
    const exposure = 1.04 + band ** 2 * (0.12 + 0.23 * glint);
    const rgb = samples.subarray(cell * 3, cell * 3 + 3);

    for (let dy = 0; dy < pitch; dy++) {
      let offset = ((y * pitch + dy) * width + x * pitch) * 3;
      for (let dx = 0; dx < pitch; dx++) {
        const ink = coverage[dy * pitch + dx];
        for (const channel of rgb) {
          pixels[offset++] = Math.round(5 + (Math.min(255, channel * exposure) - 5) * ink);
        }
      }
    }
  }
  return pixels;
}

const temp = mkdtempSync(join(tmpdir(), "starry-portrait-"));
try {
  const paths = [];
  const header = Buffer.from(`P6\n${width} ${height}\n255\n`);
  for (let frame = 0; frame < frames; frame++) {
    const path = join(temp, `${frame}.ppm`);
    writeFileSync(path, Buffer.concat([header, render(frame)]));
    paths.push(path);
  }
  const artwork = "arda-tiles.webp";
  execFileSync("img2webp", [
    "-loop", "0", "-min_size", "-lossy", "-q", "78",
    "-d", String(frameDurationMs), ...paths, "-o", join(temp, artwork),
  ]);

  mkdirSync(output, { recursive: true });
  copyFileSync(join(temp, artwork), join(output, artwork));
} finally {
  rmSync(temp, { recursive: true, force: true });
}
