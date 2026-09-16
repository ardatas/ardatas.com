export const DEFAULTS = Object.freeze({
  cr: -0.5125, ci: 0.5213, sr: -2, si: 1.5,
  width: 800, height: 600, res: 0.005, iterations: 100, color: false,
});

export const LIMITS = Object.freeze({
  cr: [-10, 10], ci: [-10, 10], sr: [-100, 100], si: [-100, 100],
  width: [64, 2048], height: [64, 2048], res: [0.0000001, 1],
  iterations: [0, 2000],
});

export function validValue(key, value) {
  const bounds = LIMITS[key];
  return bounds && Number.isFinite(value) && value >= bounds[0] && value <= bounds[1]
    && (!['width', 'height', 'iterations'].includes(key) || Number.isInteger(value));
}

export function readParameters(search) {
  const state = { ...DEFAULTS };
  const params = new URLSearchParams(search);
  for (const key of Object.keys(LIMITS)) {
    const raw = params.get(key);
    if (raw !== null && raw.trim() !== '' && validValue(key, Number(raw))) state[key] = Number(raw);
  }
  if (params.has('color')) state.color = params.get('color') === '1';
  return state;
}

export function parameterURL(state, base) {
  const url = new URL('/julia/', base);
  for (const key of Object.keys(DEFAULTS)) url.searchParams.set(key, key === 'color' ? Number(state[key]) : state[key]);
  return url.href;
}

// A uniform scale preserves the complex plane's proportions during previews.
export function renderParameters(state, previewWidth) {
  if (!previewWidth || state.width <= previewWidth) return { ...state };
  const width = Math.round(previewWidth);
  const scale = state.width / width;
  return { ...state, width, height: Math.max(1, Math.round(state.height / scale)), res: state.res * scale };
}

export function zoomAt(state, factor, x = 0.5, y = 0.5) {
  const res = Math.min(LIMITS.res[1], Math.max(LIMITS.res[0], state.res * factor));
  const sr = state.sr + x * state.width * (state.res - res);
  const si = state.si - y * state.height * (state.res - res);
  return { ...state, res, sr: Math.max(-100, Math.min(100, sr)), si: Math.max(-100, Math.min(100, si)) };
}
