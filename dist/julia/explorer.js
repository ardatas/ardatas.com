const root = document.querySelector('[data-julia]');

if (root) {
  let initialized = false;
  const lazy = new IntersectionObserver(entries => {
    if (!initialized && entries.some(entry => entry.isIntersecting)) {
      initialized = true;
      lazy.disconnect();
      initialize(root).catch(() => {
        root.querySelector('.julia-loading').textContent = 'The explorer could not load. Reload the page to try again.';
      });
    }
  }, { rootMargin: '250px' });
  lazy.observe(root);
}

async function initialize(root) {
  const controls = [...root.querySelectorAll('input, button')];
  controls.forEach(control => { control.disabled = true; });
  const response = await fetch(root.dataset.manifest);
  if (!response.ok) throw new Error('Could not load manifest');
  const versions = await response.json();
  const { DEFAULTS, LIMITS, validValue, readParameters, parameterURL, renderParameters, zoomAt } =
    await import(`./state.js?v=${versions['state.js']}`);
  let state = readParameters(location.search);
  const canvas = root.querySelector('canvas');
  const context = canvas.getContext('2d', { alpha: false });
  const stage = root.querySelector('.julia-stage');
  const loading = root.querySelector('.julia-loading');
  const feedback = root.querySelector('[data-feedback]');
  const status = root.querySelector('[data-render-status]');
  const animationButton = root.querySelector('[data-action=animate]');
  const worker = new Worker(`/julia/worker.js?v=${versions['worker.js']}`, { type: 'module' });
  let ready = false;
  let id = 0;
  let inFlight = false;
  let renderedFrames = 0;
  let settleTimer;
  let renderRAF;
  let animationRAF;
  let playing = false;
  let phase = 0;
  let animationBase;
  let animationElapsed = 0;
  let lastAnimationTime = 0;
  let nextFrameTime = 0;
  let previewWidth = 400;
  let speed = 1;
  let downloadPending = false;
  let touchExploring = false;

  function sync(except) {
    for (const input of root.querySelectorAll('[data-param]')) {
      const key = input.dataset.param;
      if (input === except) continue;
      if (key === 'color') input.checked = state.color;
      else input.value = Number(state[key].toPrecision(10));
      input.removeAttribute('aria-invalid');
    }
    for (const slider of root.querySelectorAll('[data-slider]')) {
      const value = state[slider.dataset.slider];
      slider.min = Math.min(-2, value);
      slider.max = Math.max(2, value);
      slider.value = value;
    }
    stage.style.aspectRatio = `${state.width} / ${state.height}`;
  }

  function requestRender(preview = false, immediate = false) {
    cancelAnimationFrame(renderRAF);
    const submit = () => {
      if (!ready) return;
      inFlight = true;
      const params = renderParameters(state, preview ? previewWidth : null);
      worker.postMessage({ type: 'render', id: ++id, params });
    };
    if (immediate) submit();
    else renderRAF = requestAnimationFrame(submit);
  }

  function refineSoon() {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => { if (!playing) requestRender(); }, 180);
  }

  function pause(refine = true) {
    playing = false;
    cancelAnimationFrame(animationRAF);
    animationButton.textContent = '▶ Animate';
    animationButton.setAttribute('aria-pressed', 'false');
    if (refine) requestRender();
  }

  function animate(now) {
    if (!playing) return;
    if (lastAnimationTime) {
      const dt = Math.min((now - lastAnimationTime) / 1000, 0.1);
      animationElapsed += dt;
      phase += dt * speed * 0.65;
    }
    lastAnimationTime = now;
    if (!inFlight && now >= nextFrameTime) {
      const radius = 0.12 * Math.min(1, animationElapsed);
      state.cr = Math.max(-10, Math.min(10, animationBase.cr + radius * Math.cos(phase)));
      state.ci = Math.max(-10, Math.min(10, animationBase.ci + radius * Math.sin(phase)));
      sync();
      requestRender(true, true);
      nextFrameTime = Math.max(nextFrameTime + 1000 / 30, now);
    }
    animationRAF = requestAnimationFrame(animate);
  }

  function fail(message) {
    ready = false;
    inFlight = false;
    pause(false);
    clearTimeout(settleTimer);
    controls.forEach(control => { control.disabled = true; });
    loading.hidden = false;
    loading.textContent = message;
    root.dataset.error = 'true';
  }

  worker.onerror = () => fail('The renderer stopped. Reload the page to try again.');
  worker.onmessage = ({ data }) => {
    if (data.type === 'ready') {
      ready = true;
      root.dataset.renderer = data.mode;
      controls.forEach(control => { control.disabled = false; });
      if (!root.requestFullscreen) root.querySelector('[data-action=fullscreen]').hidden = true;
      requestRender();
    } else if (data.type === 'error') {
      fail(data.message);
    } else if (data.type === 'frame' && data.id === id) {
      inFlight = false;
      canvas.width = data.width;
      canvas.height = data.height;
      context.putImageData(new ImageData(new Uint8ClampedArray(data.buffer), data.width, data.height), 0, 0);
      loading.hidden = true;
      root.dataset.frames = String(++renderedFrames);
      status.textContent = `${data.width} × ${data.height} · ${Math.round(data.elapsed)} ms${playing ? ' · animating' : ''}`;
      if (playing) {
        if (data.elapsed > 30) previewWidth = Math.max(160, Math.round(previewWidth * 0.85));
        else if (data.elapsed < 15) previewWidth = Math.min(600, Math.round(previewWidth * 1.05));
      }
      if (downloadPending) {
        downloadPending = false;
        canvas.toBlob(blob => {
          if (!blob) { feedback.textContent = 'The image could not be saved. Please try again.'; return; }
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = 'julia-set.png';
          anchor.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          feedback.textContent = 'PNG ready.';
        }, 'image/png');
      }
    }
  };

  for (const input of root.querySelectorAll('[data-param], [data-slider]')) {
    if (input.type === 'number') input.addEventListener('focus', () => {
      if (playing) pause();
    });
    input.addEventListener('input', () => {
      const key = input.dataset.param || input.dataset.slider;
      const value = key === 'color' ? input.checked : input.value.trim() === '' ? NaN : Number(input.value);
      if (key !== 'color' && !validValue(key, value)) {
        input.setAttribute('aria-invalid', 'true');
        feedback.textContent = `Enter ${['width', 'height', 'iterations'].includes(key) ? 'a whole number' : 'a number'} between ${LIMITS[key][0]} and ${LIMITS[key][1]}.`;
        return;
      }
      input.removeAttribute('aria-invalid');
      feedback.textContent = '';
      if (key === 'cr' || key === 'ci') pause(false);
      state[key] = value;
      sync(input);
      requestRender(true);
      refineSoon();
    });
  }

  root.querySelector('#julia-speed').addEventListener('input', event => {
    speed = Number(event.target.value);
    root.querySelector('[data-speed-label]').textContent = `${speed}×`;
  });

  function resetView() {
    state.sr = DEFAULTS.sr;
    state.si = DEFAULTS.si;
    state.res = DEFAULTS.res;
    state.width = DEFAULTS.width;
    state.height = DEFAULTS.height;
    sync();
    requestRender();
  }

  function zoom(factor, x, y) {
    state = zoomAt(state, factor, x, y);
    sync();
    requestRender(true);
    refineSoon();
  }

  function setTouchExploring(value) {
    touchExploring = value;
    canvas.classList.toggle('is-exploring', value);
    const button = root.querySelector('[data-action=touch]');
    button.textContent = value ? 'Done exploring' : 'Explore image';
    button.setAttribute('aria-pressed', String(value));
  }

  for (const button of root.querySelectorAll('[data-action]')) {
    button.addEventListener('click', async () => {
      feedback.textContent = '';
      switch (button.dataset.action) {
        case 'animate':
          if (playing) pause();
          else {
            playing = true;
            animationBase = { cr: state.cr, ci: state.ci };
            phase = 0;
            animationElapsed = 0;
            lastAnimationTime = 0;
            nextFrameTime = performance.now();
            clearTimeout(settleTimer);
            animationButton.textContent = 'Ⅱ Pause';
            animationButton.setAttribute('aria-pressed', 'true');
            animationRAF = requestAnimationFrame(animate);
          }
          break;
        case 'reset':
          pause(false);
          clearTimeout(settleTimer);
          state = { ...DEFAULTS };
          speed = 1;
          root.querySelector('#julia-speed').value = '1';
          root.querySelector('[data-speed-label]').textContent = '1×';
          sync();
          requestRender();
          break;
        case 'home': resetView(); break;
        case 'zoom-in': zoom(0.8); break;
        case 'zoom-out': zoom(1.25); break;
        case 'touch': setTouchExploring(!touchExploring); break;
        case 'fullscreen':
          try {
            if (document.fullscreenElement) await document.exitFullscreen();
            else await root.requestFullscreen();
          } catch { feedback.textContent = 'Fullscreen is unavailable in this browser.'; }
          break;
        case 'download':
          pause(false);
          clearTimeout(settleTimer);
          downloadPending = true;
          feedback.textContent = 'Preparing full-resolution PNG…';
          requestRender();
          break;
        case 'share': {
          const url = parameterURL(state, location.href);
          try {
            await navigator.clipboard.writeText(url);
            feedback.textContent = 'Link copied with your current parameters.';
          } catch {
            feedback.replaceChildren(document.createTextNode('Copy this link: '));
            const link = document.createElement('a');
            link.href = url;
            link.textContent = url;
            feedback.append(link);
          }
          break;
        }
      }
    });
  }

  document.addEventListener('fullscreenchange', () => {
    root.querySelector('[data-action=fullscreen]').textContent = document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen';
  });

  canvas.addEventListener('wheel', event => {
    if (!ready) return;
    // Require deliberate focus before capturing the page's scroll gesture.
    if (document.activeElement !== canvas) return;
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    zoom(Math.exp(Math.max(-1, Math.min(1, event.deltaY * 0.002))),
      (event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height);
  }, { passive: false });

  const pointers = new Map();
  let gesture;
  let touchStart;

  function beginGesture() {
    const points = [...pointers.values()];
    if (!points.length) { gesture = null; return; }
    const rect = canvas.getBoundingClientRect();
    const center = points.length === 1 ? points[0] : {
      x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2,
    };
    gesture = { state: { ...state }, center, rect,
      distance: points.length > 1 ? Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) : 0 };
  }

  canvas.addEventListener('pointerdown', event => {
    if (!ready || event.button > 0) return;
    if (event.pointerType === 'touch' && !touchExploring) {
      touchStart = { x: event.clientX, y: event.clientY };
      return;
    }
    canvas.focus({ preventScroll: true });
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    beginGesture();
  });

  canvas.addEventListener('pointermove', event => {
    if (!pointers.has(event.pointerId) || !gesture) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...pointers.values()];
    const center = points.length === 1 ? points[0] : {
      x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2,
    };
    let view = { ...gesture.state };
    if (points.length > 1 && gesture.distance) {
      const distance = Math.max(1, Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y));
      view = zoomAt(view, gesture.distance / distance,
        (gesture.center.x - gesture.rect.left) / gesture.rect.width,
        (gesture.center.y - gesture.rect.top) / gesture.rect.height);
    }
    state.res = view.res;
    state.sr = Math.max(-100, Math.min(100, view.sr - (center.x - gesture.center.x) / gesture.rect.width * view.width * view.res));
    state.si = Math.max(-100, Math.min(100, view.si + (center.y - gesture.center.y) / gesture.rect.height * view.height * view.res));
    sync();
    requestRender(true);
    refineSoon();
  });

  function endPointer(event) {
    if (event.type === 'pointerup' && event.pointerType === 'touch' && touchStart && !touchExploring &&
        Math.hypot(event.clientX - touchStart.x, event.clientY - touchStart.y) < 8) setTouchExploring(true);
    touchStart = null;
    pointers.delete(event.pointerId);
    beginGesture();
    refineSoon();
  }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('lostpointercapture', endPointer);

  canvas.addEventListener('keydown', event => {
    if (!ready) return;
    if (event.key === 'Escape') { canvas.blur(); setTouchExploring(false); return; }
    if (event.key === 'Home') resetView();
    else if (event.key === '+' || event.key === '=') zoom(0.8);
    else if (event.key === '-') zoom(1.25);
    else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      const dx = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
      const dy = event.key === 'ArrowUp' ? 1 : event.key === 'ArrowDown' ? -1 : 0;
      state.sr = Math.max(-100, Math.min(100, state.sr + dx * state.width * state.res * 0.08));
      state.si = Math.max(-100, Math.min(100, state.si + dy * state.height * state.res * 0.08));
      sync(); requestRender(true); refineSoon();
    } else return;
    event.preventDefault();
  });

  const visibility = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting && playing) pause(false);
    else if (entries[0].isIntersecting && ready && !playing && canvas.width !== state.width) requestRender();
  });
  visibility.observe(root);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && playing) pause(false);
    else if (!document.hidden && ready && !playing) requestRender();
  });
  window.addEventListener('pagehide', () => {
    pause(false);
    clearTimeout(settleTimer);
    cancelAnimationFrame(renderRAF);
    inFlight = false;
    id++;
    worker.postMessage({ type: 'cancel' });
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted && ready) requestRender();
  });
  sync();
  worker.postMessage({ type: 'init', versions });
}
