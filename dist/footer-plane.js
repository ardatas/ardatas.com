// Decorative footer renderer; no framework runtime is needed.
const vertexSource = `#version 300 es
void main() {
  // One oversized triangle covers the canvas without a vertex buffer.
  vec2 corner = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}`;

const fragmentSource = `#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform float u_time, u_planeHeight, u_epsilon;
uniform vec3 u_light, u_dark;
out vec4 fragColor;

void main() {
  vec2 uv = (gl_FragCoord.xy - vec2(0.5, 0.76) * u_resolution) / u_resolution.y;
  fragColor = vec4(0.0);
  if (uv.y >= -u_epsilon) return;

  // Intersect the view ray with the flat floor directly.
  float depth = (u_planeHeight - 1.5) / uv.y;
  if (depth <= 0.0 || depth >= 22.0) return;
  vec2 tile = vec2(uv.x * depth, depth - 1.5 - u_time);
  vec2 stripe = sin(3.141593 * tile);
  vec2 edge = max(fwidth(stripe), vec2(0.001));
  vec2 parity = smoothstep(-edge, edge, stripe);
  float checker = parity.x + parity.y - 2.0 * parity.x * parity.y;
  float opacity = 1.0 - smoothstep(3.0, 22.0, depth);
  fragColor = vec4(mix(u_light, u_dark, checker), opacity);
}`;

function createProgram(gl) {
  const program = gl.createProgram();
  if (!program) return null;
  for (const [type, source] of [
    [gl.VERTEX_SHADER, vertexSource],
    [gl.FRAGMENT_SHADER, fragmentSource],
  ]) {
    const shader = gl.createShader(type);
    if (!shader) {
      gl.deleteProgram(program);
      return null;
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
  gl.deleteProgram(program);
  return null;
}

// Notebook colors are six-digit hex tokens in src/index.css.
function tokenColor(style, token) {
  const rgb = parseInt(style.getPropertyValue(token).trim().slice(1), 16);
  return [(rgb >> 16) & 255, (rgb >> 8) & 255, rgb & 255].map(
    (channel) => channel / 255,
  );
}

function observePlane(
  canvas,
  gl,
  planeHeight,
  epsilon,
  speed,
) {
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  let visible = false;
  let program = null;
  let resolution = null;
  let time = null;
  let frame = 0;
  let elapsed = 0;
  let previous;

  function initialize() {
    program = createProgram(gl);
    if (!program) return;
    gl.useProgram(program);
    resolution = gl.getUniformLocation(program, "u_resolution");
    time = gl.getUniformLocation(program, "u_time");
    const style = getComputedStyle(canvas);
    gl.uniform3fv(
      gl.getUniformLocation(program, "u_light"),
      tokenColor(style, "--notebook-card"),
    );
    gl.uniform3fv(
      gl.getUniformLocation(program, "u_dark"),
      tokenColor(style, "--notebook-border"),
    );
    gl.uniform1f(gl.getUniformLocation(program, "u_planeHeight"), planeHeight);
    gl.uniform1f(gl.getUniformLocation(program, "u_epsilon"), epsilon);
    schedule();
  }

  function draw(now) {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.round(canvas.clientWidth * ratio);
    const height = Math.round(canvas.clientHeight * ratio);
    if (!width || !height) return;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    if (previous !== undefined) elapsed += (now - previous) / 1000;
    previous = now;
    gl.viewport(0, 0, width, height);
    gl.uniform2f(resolution, width, height);
    gl.uniform1f(time, (elapsed * speed) % 2);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    canvas.toggleAttribute("data-ready", true);
    if (!motion.matches && speed !== 0) frame = requestAnimationFrame(draw);
  }

  function schedule() {
    cancelAnimationFrame(frame);
    previous = undefined;
    if (program && visible && !document.hidden)
      frame = requestAnimationFrame(draw);
  }

  function contextLost(event) {
    event.preventDefault();
    program = null;
    delete canvas.dataset.ready;
    schedule();
  }

  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    schedule();
  });
  const resize = new ResizeObserver(schedule);
  intersection.observe(canvas);
  resize.observe(canvas);
  motion.addEventListener("change", schedule);
  document.addEventListener("visibilitychange", schedule);
  canvas.addEventListener("webglcontextlost", contextLost);
  canvas.addEventListener("webglcontextrestored", initialize);
  initialize();

  return () => {
    cancelAnimationFrame(frame);
    intersection.disconnect();
    resize.disconnect();
    motion.removeEventListener("change", schedule);
    document.removeEventListener("visibilitychange", schedule);
    canvas.removeEventListener("webglcontextlost", contextLost);
    canvas.removeEventListener("webglcontextrestored", initialize);
    delete canvas.dataset.ready;
    gl.deleteProgram(program);
  };
}

const host = document.getElementById("footer-plane");
if (host) {
  const canvas = document.createElement("canvas");
  canvas.className = "block h-full w-full";
  canvas.setAttribute("aria-hidden", "true");
  host.append(canvas);
  const gl = canvas.getContext("webgl2", {
    antialias: false,
    depth: false,
    premultipliedAlpha: false,
  });
  if (gl) observePlane(canvas, gl, 0, 0.001, 0.42);
}
