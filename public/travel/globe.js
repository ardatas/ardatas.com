const section = document.querySelector('#travel');
const stage = document.querySelector('#travel-stage');
const loading = document.querySelector('#travel-loading');
const places = JSON.parse(document.querySelector('#travel-data').textContent);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// Loading is local and deferred until the section approaches the viewport.
const loader = new IntersectionObserver((entries) => {
  if (!entries.some((entry) => entry.isIntersecting)) return;
  loader.disconnect();
  start().catch((error) => {
    console.error('Travel globe:', error);
    loading.hidden = false;
    loading.querySelector('p').textContent = 'The globe couldn’t load. Every stop is listed below.';
    document.querySelector('#travel-places').open = true;
    section.querySelectorAll('button, select').forEach((control) => { control.disabled = true; });
  });
}, { rootMargin: '350px' });
loader.observe(stage);

async function start() {
  const THREE = await import('./vendor/three.module.min.js');
  const host = document.querySelector('#travel-canvas');
  const labels = document.querySelector('#travel-markers');
  const viewLabel = document.querySelector('#travel-view');
  const tooltip = document.querySelector('#travel-tooltip');
  const zoomIn = document.querySelector('#travel-zoom-in');
  const zoomOut = document.querySelector('#travel-zoom-out');
  const reset = document.querySelector('#travel-reset');
  const touchToggle = document.querySelector('#travel-touch-toggle');
  const touchStatus = document.querySelector('#travel-touch-status');
  const countrySelect = document.querySelector('#travel-country-select');
  const citySelect = document.querySelector('#travel-city-select');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.002, 50);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  host.append(renderer.domElement);
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'application');
  canvas.setAttribute('aria-label', '3D travel globe. Arrow keys rotate, plus and minus zoom, Home resets, Escape releases scrolling. Country buttons and a full place list follow the map.');

  let width = 1, height = 1, frame = 0, visible = true, selectedCountry = null;
  let hovered = null, scrollReleased = false, detailRequested = false;
  let selectedCity = null, suppressPinClick = false;
  let borderMaterial, detailMesh, failed = false;
  const MIN_ALTITUDE = 0.065;
  const CITY_ALTITUDE = 0.68;
  const state = { lat: 32, lon: 26, altitude: 2.8 };
  const target = { ...state };
  const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const projected = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const sphere = new THREE.Sphere(new THREE.Vector3(), 1);
  const hit = new THREE.Vector3();
  const toWorld = (lat, lon, radius = 1) => {
    const phi = THREE.MathUtils.degToRad(lat), theta = THREE.MathUtils.degToRad(lon);
    return new THREE.Vector3(Math.cos(phi) * Math.cos(theta), Math.sin(phi), -Math.cos(phi) * Math.sin(theta)).multiplyScalar(radius);
  };
  const clamp = THREE.MathUtils.clamp;
  const worldAltitude = () => Math.sqrt(1 + (height / (2 * tanHalfFov * Math.min(width * 0.41, height * 0.4))) ** 2) - 1;
  const wrapLongitude = (lon) => ((lon + 180) % 360 + 360) % 360 - 180;
  const longitudeDelta = (a, b) => wrapLongitude(b - a);

  // A stationary, distant starfield, naturally occluded by the globe.
  const starCanvas = document.createElement('canvas');
  starCanvas.width = starCanvas.height = 32;
  const starContext = starCanvas.getContext('2d');
  const starGlow = starContext.createRadialGradient(16, 16, 0, 16, 16, 16);
  starGlow.addColorStop(0, 'rgba(255,255,255,1)');
  starGlow.addColorStop(0.2, 'rgba(255,255,255,0.85)');
  starGlow.addColorStop(0.5, 'rgba(255,255,255,0.25)');
  starGlow.addColorStop(1, 'rgba(255,255,255,0)');
  starContext.fillStyle = starGlow;
  starContext.fillRect(0, 0, 32, 32);
  const starTexture = new THREE.CanvasTexture(starCanvas);
  let starSeed = 2026;
  const randomStar = () => {
    starSeed = (Math.imul(starSeed, 1664525) + 1013904223) >>> 0;
    return starSeed / 4294967296;
  };
  for (const [count, size, opacity] of [[3600, 1.8, 0.65], [300, 3.6, 0.9]]) {
    const positions = [], colors = [];
    for (let i = 0; i < count; i++) {
      const latitude = Math.asin(randomStar() * 2 - 1);
      const longitude = randomStar() * Math.PI * 2;
      const radius = 28 + randomStar() * 10;
      positions.push(radius * Math.cos(latitude) * Math.cos(longitude), radius * Math.sin(latitude), radius * Math.cos(latitude) * Math.sin(longitude));
      const tint = randomStar();
      const color = new THREE.Color(tint < 0.15 ? 0xffe2be : tint < 0.4 ? 0xaacbff : 0xe5edff);
      color.multiplyScalar(0.45 + randomStar() * 0.55);
      colors.push(...color.toArray());
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    scene.add(new THREE.Points(geometry, new THREE.PointsMaterial({
      map: starTexture, size, sizeAttenuation: false, vertexColors: true,
      transparent: true, opacity, depthWrite: false, toneMapped: false,
    })));
  }

  scene.add(new THREE.AmbientLight(0xc4daff, 1.2));
  const sun = new THREE.DirectionalLight(0xfff4dd, 3.0);
  const fill = new THREE.DirectionalLight(0x8bbaff, 0.65);
  scene.add(sun, fill);
  const textures = new THREE.TextureLoader();
  const texture = await textures.loadAsync('/travel/earth.webp');
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const earthMaterial = new THREE.MeshPhongMaterial({ map: texture, shininess: 9, specular: 0x142338, bumpScale: 0.008 });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 256, 128), earthMaterial);
  scene.add(earth);
  textures.loadAsync('/travel/elevation.webp').then((bump) => {
    earthMaterial.bumpMap = bump;
    earthMaterial.needsUpdate = true;
    if (detailMesh) applyDetailBump(bump);
    requestRender();
  }).catch(() => { /* Colour imagery is sufficient if relief is unavailable. */ });

  // Thin atmospheric scattering at the limb; never an opaque shell over the map.
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.013, 128, 64), new THREE.ShaderMaterial({
    uniforms: { glow: { value: new THREE.Color('#79b9fa') } },
    vertexShader: `varying vec3 vNormal; varying vec3 vView;
      void main() { vec4 p = modelViewMatrix * vec4(position, 1.0);
      vNormal = normalize(normalMatrix * normal); vView = normalize(-p.xyz);
      gl_Position = projectionMatrix * p; }`,
    fragmentShader: `uniform vec3 glow; varying vec3 vNormal; varying vec3 vView;
      void main() { float rim = pow(1.0 - max(dot(normalize(vNormal), normalize(vView)), 0.0), 5.0);
      gl_FragColor = vec4(glow, rim * 0.32); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  scene.add(atmosphere);

  function applyDetailBump(bump) {
    const croppedBump = bump.clone();
    croppedBump.repeat.set(100 / 360, 37 / 180);
    croppedBump.offset.set(165 / 360, 118 / 180);
    detailMesh.material.bumpMap = croppedBump;
    detailMesh.material.needsUpdate = true;
  }
  function loadDetail() {
    if (detailRequested) return;
    detailRequested = true;
    textures.loadAsync('/travel/earth-detail.webp').then((detail) => {
      detail.colorSpace = THREE.SRGBColorSpace;
      detail.anisotropy = texture.anisotropy;
      const material = earthMaterial.clone();
      material.map = detail;
      material.bumpMap = null;
      // NASA's original 2 km imagery for 15°W–85°E, 28°N–65°N.
      detailMesh = new THREE.Mesh(new THREE.SphereGeometry(1.00012, 320, 160,
        THREE.MathUtils.degToRad(165), THREE.MathUtils.degToRad(100),
        THREE.MathUtils.degToRad(25), THREE.MathUtils.degToRad(37)), material);
      if (earthMaterial.bumpMap) applyDetailBump(earthMaterial.bumpMap);
      scene.add(detailMesh);
      requestRender();
    }).catch(() => { /* Keep the 8K globe usable when the optional detail fails. */ });
  }

  // Small, local 500 m crops keep close views sharp without uploading a 21K texture.
  const closeRegions = [
    ['central-europe', 4, 20, 45, 61], ['italy', 6, 20, 35, 46],
    ['turkey-west', 24, 36, 35, 43], ['turkey-east', 36, 45, 35, 43],
    ['baltics', 20, 29, 54, 61], ['kyrgyzstan', 70, 78, 40, 45],
  ];
  const loadedRegions = new Set();
  function loadCloseRegions() {
    const lon = wrapLongitude(state.lon);
    for (const [name, west, east, south, north] of closeRegions) {
      if (loadedRegions.has(name) || lon < west - 4 || lon > east + 4 || state.lat < south - 4 || state.lat > north + 4) continue;
      loadedRegions.add(name);
      textures.loadAsync(`/travel/detail/${name}.webp`).then((map) => {
        map.colorSpace = THREE.SRGBColorSpace;
        map.anisotropy = texture.anisotropy;
        const material = earthMaterial.clone();
        material.map = map;
        if (earthMaterial.bumpMap) {
          material.bumpMap = earthMaterial.bumpMap.clone();
          material.bumpMap.repeat.set((east - west) / 360, (north - south) / 180);
          material.bumpMap.offset.set((west + 180) / 360, (south + 90) / 180);
        }
        scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.0003, 128, 128,
          THREE.MathUtils.degToRad(west + 180), THREE.MathUtils.degToRad(east - west),
          THREE.MathUtils.degToRad(90 - north), THREE.MathUtils.degToRad(north - south)), material));
        requestRender();
      }).catch(() => { /* The previously loaded regional map remains available. */ });
    }
  }

  fetch('/travel/borders.json').then((response) => {
    if (!response.ok) throw new Error('Borders unavailable');
    return response.json();
  }).then((rings) => {
    const vertices = [];
    for (const ring of rings) {
      for (let i = 1; i < ring.length; i++) {
        vertices.push(...toWorld(ring[i - 1][1], ring[i - 1][0], 1.0005).toArray(), ...toWorld(ring[i][1], ring[i][0], 1.0005).toArray());
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    borderMaterial = new THREE.LineBasicMaterial({ color: 0xd6e1df, transparent: true, opacity: 0.14, depthWrite: false });
    scene.add(new THREE.LineSegments(geometry, borderMaterial));
    requestRender();
  }).catch(() => { /* Borders are an optional orientation aid. */ });

  const gold = new THREE.MeshStandardMaterial({ color: 0xf8cd78, metalness: 0.52, roughness: 0.23 });
  const ice = new THREE.MeshStandardMaterial({ color: 0x93d9e9, metalness: 0.45, roughness: 0.2 });
  const pinRed = new THREE.MeshPhysicalMaterial({ color: 0xf03545, metalness: 0.22, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.12 });
  const silver = new THREE.MeshStandardMaterial({ color: 0xe7f3fa, metalness: 0.7, roughness: 0.2 });
  const red = new THREE.MeshStandardMaterial({ color: 0xf38c8c, metalness: 0.3, roughness: 0.35 });
  // Turned enamel thumbtacks: rounded cap, recessed neck, flared lower rim.
  const pinHead = new THREE.LatheGeometry([
    [0, -0.24], [0.28, -0.24], [0.34, -0.2], [0.34, -0.14],
    [0.23, -0.1], [0.19, -0.04], [0.19, 0.12], [0.25, 0.16],
    [0.34, 0.18], [0.36, 0.24], [0.32, 0.31], [0.2, 0.35], [0, 0.36],
  ].map(([x, y]) => new THREE.Vector2(x, y)), 40);
  const pinStem = new THREE.CylinderGeometry(0.055, 0.008, 1, 16);
  const collarGeometry = new THREE.TorusGeometry(0.315, 0.027, 8, 40);
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 64;
  const shadowContext = shadowCanvas.getContext('2d');
  const shadowGradient = shadowContext.createRadialGradient(32, 32, 2, 32, 32, 32);
  shadowGradient.addColorStop(0, 'rgba(0, 5, 15, 0.65)');
  shadowGradient.addColorStop(0.4, 'rgba(0, 5, 15, 0.28)');
  shadowGradient.addColorStop(1, 'rgba(0, 5, 15, 0)');
  shadowContext.fillStyle = shadowGradient;
  shadowContext.fillRect(0, 0, 64, 64);
  const footGeometry = new THREE.PlaneGeometry(1.1, 0.75);
  const footMaterial = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false });
  const starShape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const angle = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.19 : 0.43;
    const x = Math.cos(angle) * r, y = Math.sin(angle) * r;
    if (i === 0) starShape.moveTo(x, y); else starShape.lineTo(x, y);
  }
  starShape.closePath();
  const starGeometry = new THREE.ExtrudeGeometry(starShape, { depth: 0.1, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.035, bevelThickness: 0.025 });
  starGeometry.center();
  const pins = [];

  function makePin(place, country, kind) {
    const group = new THREE.Group();
    const direction = toWorld(place.lat, place.lon);
    group.position.copy(direction).multiplyScalar(1.001);
    group.quaternion.setFromUnitVectors(up, direction);
    const material = place.base === 'home' ? gold : place.base === 'second' ? ice : pinRed;
    // Lean the tack so its shaft and head thickness remain visible from above.
    const tilt = 0.9;
    const stem = new THREE.Mesh(pinStem, silver);
    stem.rotation.z = -tilt;
    stem.position.set(Math.sin(tilt) * 0.5, Math.cos(tilt) * 0.5, 0);
    group.add(stem);
    const head = new THREE.Mesh(place.base === 'home' ? starGeometry : pinHead, material);
    head.rotation.z = -tilt;
    head.position.set(Math.sin(tilt) * 1.05, Math.cos(tilt) * 1.05, 0);
    group.add(head);
    const collar = new THREE.Mesh(collarGeometry, silver);
    collar.rotation.set(Math.PI / 2, 0, 0);
    const collarMount = new THREE.Group();
    collarMount.rotation.z = -tilt;
    collarMount.position.set(Math.sin(tilt) * 0.85, Math.cos(tilt) * 0.85, 0);
    collarMount.add(collar);
    collarMount.visible = !place.base && kind !== 'egg';
    group.add(collarMount);
    const foot = new THREE.Mesh(footGeometry, footMaterial);
    foot.rotation.x = -Math.PI / 2;
    foot.position.set(0.17, 0.01, 0);
    group.add(foot);
    if (kind === 'egg') {
      stem.visible = false;
      head.visible = false;
      head.position.set(0, 0.55, 0);
      foot.visible = false;
      for (const angle of [-Math.PI / 4, Math.PI / 4]) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.8, 0.1), red);
        bar.rotation.z = angle;
        bar.position.y = 0.55;
        group.add(bar);
      }
    }
    scene.add(group);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `travel-marker${kind === 'egg' ? ' is-egg' : ''}`;
    button.dataset.kind = kind;
    button.dataset.place = place.name;
    if (place.base) button.dataset.base = place.base;
    const description = kind === 'country' ? `${place.cities.length} ${place.cities.length === 1 ? 'place' : 'places'} · Explore` : place.base === 'home' ? 'current base' : place.base === 'second' ? 'Second home base' : kind === 'egg' ? places.easterEgg.message : country.name;
    button.setAttribute('aria-label', `${place.name}, ${description}`);
    const label = document.createElement('span');
    label.className = 'travel-marker-label';
    label.textContent = place.name;
    const small = document.createElement('small');
    small.textContent = description;
    label.append(small);
    button.append(label);
    labels.append(button);
    const pin = { place, country, kind, group, button, head, direction, screen: new THREE.Vector3() };
    pins.push(pin);
    button.addEventListener('pointerenter', () => { hovered = pin; requestRender(); });
    button.addEventListener('pointerleave', () => { hovered = null; requestRender(); });
    button.addEventListener('focus', () => { hovered = pin; requestRender(); });
    button.addEventListener('blur', () => { hovered = null; requestRender(); });
    button.addEventListener('click', (event) => {
      if (suppressPinClick && event.detail > 0) return;
      if (kind === 'country') focusCountry(country);
      else if (kind === 'egg') showMessage('Bielefeld · Does not exist.');
      else focusCity(place, country);
    });
  }
  for (const country of places.countries) {
    makePin(country, country, 'country');
    for (const city of country.cities) makePin(city, country, 'city');
  }
  makePin(places.easterEgg, places.countries.find((country) => country.id === 'de'), 'egg');

  function showMessage(message) {
    tooltip.textContent = message;
    tooltip.hidden = !message;
  }
  function syncControls() {
    section.querySelectorAll('[data-country]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.country === selectedCountry)));
    countrySelect.value = selectedCountry || '';
    if (citySelect.dataset.country !== (selectedCountry || '')) {
      citySelect.dataset.country = selectedCountry || '';
      const country = places.countries.find((item) => item.id === selectedCountry);
      citySelect.replaceChildren(new Option(country ? 'All cities' : '—', ''));
      for (const city of country?.cities || []) citySelect.add(new Option(city.name, city.id));
      citySelect.disabled = !country;
    }
    citySelect.value = selectedCity || '';
  }
  function flyTo(lat, lon, altitude) {
    target.lat = clamp(lat, -80, 80);
    target.lon = state.lon + longitudeDelta(state.lon, lon);
    target.altitude = clamp(altitude, MIN_ALTITUDE, worldAltitude());
    syncControls();
    requestRender();
  }
  function focusCountry(country) {
    selectedCountry = country.id;
    selectedCity = null;
    showMessage('');
    const city = country.cities.length === 1 ? country.cities[0] : country;
    flyTo(city.lat, city.lon, country.altitude);
  }
  function focusCity(city, country) {
    selectedCountry = country.id;
    selectedCity = city.id;
    flyTo(city.lat, city.lon, 0.1);
    showMessage(`${city.name} · ${city.base === 'home' ? 'current base' : city.base === 'second' ? 'Second home base' : country.name}`);
  }
  countrySelect.addEventListener('change', () => {
    const country = places.countries.find((item) => item.id === countrySelect.value);
    if (country) focusCountry(country);
    else resetView();
  });
  citySelect.addEventListener('change', () => {
    const country = places.countries.find((item) => item.id === selectedCountry);
    if (!country) return;
    const city = country.cities.find((item) => item.id === citySelect.value);
    if (city) focusCity(city, country);
    else focusCountry(country);
  });
  section.querySelectorAll('[data-country]').forEach((button) => button.addEventListener('click', () => {
    focusCountry(places.countries.find((country) => country.id === button.dataset.country));
  }));
  section.querySelectorAll('.travel-bases [data-base]').forEach((button) => button.addEventListener('click', () => {
    const pin = pins.find((item) => item.kind === 'city' && item.place.base === button.dataset.base);
    focusCity(pin.place, pin.country);
  }));
  function resetView() {
    selectedCountry = null;
    selectedCity = null;
    showMessage('');
    flyTo(32, 26, worldAltitude());
  }
  reset.addEventListener('click', resetView);
  function zoom(factor) {
    target.altitude = clamp(target.altitude * factor, MIN_ALTITUDE, worldAltitude());
    showMessage('');
    requestRender();
  }
  zoomIn.addEventListener('click', () => zoom(0.65));
  zoomOut.addEventListener('click', () => zoom(1 / 0.65));
  stage.addEventListener('pointerenter', () => { scrollReleased = false; });
  stage.addEventListener('wheel', (event) => {
    if (scrollReleased || (window.matchMedia('(any-pointer: coarse)').matches && !stage.classList.contains('is-exploring')) || event.target.closest('button:not(.travel-marker)')) return;
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1);
    if ((target.altitude >= worldAltitude() - 0.001 && delta < 0) || (target.altitude <= MIN_ALTITUDE + 0.001 && delta > 0)) return;
    // Scrolling forward moves into the world; scroll back pulls away.
    event.preventDefault();
    if (delta > 0) {
      const rect = stage.getBoundingClientRect();
      pointer.set((event.clientX - rect.left) / width * 2 - 1, -(event.clientY - rect.top) / height * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      if (raycaster.ray.intersectSphere(sphere, hit)) {
        const lat = THREE.MathUtils.radToDeg(Math.asin(hit.y));
        const lon = THREE.MathUtils.radToDeg(Math.atan2(-hit.z, hit.x));
        const weight = Math.min(Math.abs(delta) * 0.0015, 0.22);
        target.lat += (lat - target.lat) * weight;
        target.lon += longitudeDelta(target.lon, lon) * weight;
      }
    }
    zoom(Math.exp(-clamp(delta, -180, 180) * 0.0028));
  }, { passive: false });

  const pointers = new Map();
  let previousDistance = 0;
  // Listen on the stage so gestures beginning on a pin behave like the canvas.
  // Capture on the original target to preserve a stationary pin's click.
  stage.addEventListener('pointerdown', (event) => {
    if (event.target !== canvas && !event.target.closest('.travel-marker')) return;
    if (!pointers.size) suppressPinClick = false;
    if (event.pointerType === 'touch' && !stage.classList.contains('is-exploring')) return;
    if (event.button !== 0) return;
    if (event.pointerType !== 'touch' && event.target === canvas) canvas.focus({ preventScroll: true });
    event.target.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, element: event.target });
    if (pointers.size === 2) {
      suppressPinClick = true;
      const [a, b] = [...pointers.values()];
      previousDistance = Math.hypot(a.x - b.x, a.y - b.y);
    }
    showMessage('');
  });
  stage.addEventListener('pointermove', (event) => {
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    if (!suppressPinClick && Math.hypot(event.clientX - previous.startX, event.clientY - previous.startY) < 6) return;
    suppressPinClick = true;
    pointers.set(event.pointerId, { ...previous, x: event.clientX, y: event.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (previousDistance > 0) zoom(previousDistance / Math.max(distance, 1));
      previousDistance = distance;
    } else {
      selectedCountry = null;
      selectedCity = null;
      syncControls();
      const sensitivity = Math.min(target.altitude, 2) * 65 / height;
      target.lon -= (event.clientX - previous.x) * sensitivity;
      target.lat = clamp(target.lat + (event.clientY - previous.y) * sensitivity, -80, 80);
      requestRender();
    }
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) stage.addEventListener(event, (e) => { pointers.delete(e.pointerId); previousDistance = 0; });
  function setTouchMode(active) {
    stage.classList.toggle('is-exploring', active);
    document.querySelector('.travel-mobile-controls').classList.toggle('is-exploring', active);
    touchToggle.setAttribute('aria-pressed', String(active));
    touchToggle.textContent = active ? 'Done' : 'Explore globe';
    touchStatus.textContent = active ? 'Drag to rotate · Pinch to zoom' : 'Swipe to scroll the page';
    if (!active) {
      for (const [id, pointer] of pointers) {
        if (pointer.element.hasPointerCapture(id)) pointer.element.releasePointerCapture(id);
      }
      pointers.clear();
      previousDistance = 0;
    }
  }
  touchToggle.addEventListener('click', () => setTouchMode(!stage.classList.contains('is-exploring')));
  section.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      scrollReleased = true;
      setTouchMode(false);
      canvas.blur();
      showMessage('Page scrolling released. Move away and back to explore again.');
      return;
    }
    if (event.target !== canvas) return;
    const step = Math.max(0.5, target.altitude * 5);
    if (event.key === '+' || event.key === '=') zoom(0.65);
    else if (event.key === '-') zoom(1 / 0.65);
    else if (event.key === 'Home') resetView();
    else if (event.key === 'ArrowLeft') target.lon -= step;
    else if (event.key === 'ArrowRight') target.lon += step;
    else if (event.key === 'ArrowUp') target.lat = clamp(target.lat + step, -80, 80);
    else if (event.key === 'ArrowDown') target.lat = clamp(target.lat - step, -80, 80);
    else return;
    if (event.key.startsWith('Arrow')) {
      selectedCountry = null;
      selectedCity = null;
      syncControls();
    }
    event.preventDefault();
    requestRender();
  });

  function requestRender() {
    if (!frame && visible && !failed && !document.hidden) frame = requestAnimationFrame(render);
  }
  function render() {
    frame = 0;
    const factor = reducedMotion.matches || pointers.size ? 1 : 0.16;
    state.lat += (target.lat - state.lat) * factor;
    state.lon += (target.lon - state.lon) * factor;
    state.altitude += (target.altitude - state.altitude) * factor;
    camera.position.copy(toWorld(state.lat, state.lon, 1 + state.altitude));
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    // Keep the explored hemisphere in daylight while preserving directional relief.
    sun.position.copy(toWorld(state.lat + 25, state.lon - 35, 5));
    fill.position.copy(toWorld(state.lat - 25, state.lon + 60, 4));
    const cityView = state.altitude < CITY_ALTITUDE;
    if (cityView) loadDetail();
    if (state.altitude < 0.24) loadCloseRegions();
    if (borderMaterial) borderMaterial.opacity = cityView ? 0.27 : 0.12;
    atmosphere.visible = state.altitude > 0.4;
    const country = places.countries.find((item) => item.id === selectedCountry);
    viewLabel.textContent = cityView ? `${country ? country.name + ' / ' : ''}City view` : 'The whole picture';
    const zoomLevel = worldAltitude() / state.altitude;
    document.querySelector('#travel-zoom-level').textContent = `${zoomLevel < 10 ? zoomLevel.toFixed(1) : Math.round(zoomLevel)}×`;
    zoomIn.disabled = target.altitude <= MIN_ALTITUDE + 0.001;
    zoomOut.disabled = target.altitude >= worldAltitude() - 0.001;
    stage.dataset.level = cityView ? 'cities' : 'countries';
    const labelCandidates = [];
    for (const pin of pins) {
      const isEgg = pin.kind === 'egg';
      // A hidden easter egg only exists in the close Germany view, never in counts.
      const levelVisible = isEgg ? state.altitude < 0.23 && state.altitude > 0.07 : (pin.kind === 'country' ? !cityView : cityView);
      const facing = pin.direction.dot(camera.position.clone().sub(pin.direction)) > 0.015;
      pin.group.visible = levelVisible && facing;
      pin.button.hidden = !pin.group.visible;
      pin.button.classList.remove('show-label');
      if (!pin.group.visible) continue;
      const distance = camera.position.distanceTo(pin.group.position);
      const pixelScale = 2 * distance * tanHalfFov / height;
      const pinPixels = pin.place.base ? 28 : pin.kind === 'country' ? 24 : 21;
      const scale = pixelScale * pinPixels;
      pin.group.scale.setScalar(scale);
      // Face the extruded home star toward the camera while keeping its stem radial.
      if (pin.place.base === 'home') pin.head.quaternion.copy(pin.group.quaternion.clone().invert().multiply(camera.quaternion));
      pin.group.updateMatrixWorld(true);
      pin.head.getWorldPosition(projected).project(camera);
      const x = (projected.x * 0.5 + 0.5) * width, y = (-projected.y * 0.5 + 0.5) * height;
      pin.screen.set(x, y, projected.z);
      const onScreen = x > 12 && x < width - 15 && y > 66 && y < height - 85 && projected.z < 1;
      pin.button.hidden = !onScreen;
      if (!onScreen) continue;
      pin.button.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      pin.button.style.zIndex = pin === hovered ? '5' : pin.place.base ? '3' : '1';
      if (!isEgg) labelCandidates.push(pin);
    }
    // Labels yield to one another; every pin remains independently selectable.
    labelCandidates.sort((a, b) => (b === hovered ? 100 : b.place.base ? 50 : 0) - (a === hovered ? 100 : a.place.base ? 50 : 0));
    const occupied = [];
    for (const pin of labelCandidates) {
      const x = pin.screen.x + 10, y = pin.screen.y - 22;
      const w = Math.min(170, Math.max(pin.place.name.length * 6.1 + 20, pin.kind === 'country' ? 104 : 115));
      const rect = { x, y, w, h: 38 };
      const overlaps = occupied.some((box) => x < box.x + box.w + 9 && x + w + 9 > box.x && y < box.y + box.h + 8 && y + rect.h + 8 > box.y);
      const fits = x + w < width - 16 && !(x + w > width - 75 && y > height / 2 - 95 && y < height / 2 + 90);
      const show = pin === hovered || (fits && !overlaps);
      if (show) { pin.button.classList.add('show-label'); occupied.push(rect); }
    }
    renderer.render(scene, camera);
    const moving = Math.abs(state.lat - target.lat) + Math.abs(state.lon - target.lon) + Math.abs(state.altitude - target.altitude) > 0.00008;
    if (moving) requestRender();
  }

  function resize() {
    const wasWorld = Math.abs(target.altitude - worldAltitude()) < 0.03;
    width = stage.clientWidth;
    height = stage.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    if (wasWorld || !stage.dataset.ready) state.altitude = target.altitude = worldAltitude();
    else target.altitude = Math.min(target.altitude, worldAltitude());
    requestRender();
  }
  new ResizeObserver(resize).observe(stage);
  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (!visible) setTouchMode(false);
    if (!visible && frame) { cancelAnimationFrame(frame); frame = 0; }
    if (visible) requestRender();
  }).observe(stage);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) setTouchMode(false);
    requestRender();
  });
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    failed = true;
    labels.hidden = true;
    loading.hidden = false;
    loading.querySelector('p').textContent = 'The 3D view paused. Reload to restore it, or browse every place below.';
    document.querySelector('#travel-places').open = true;
    setTouchMode(false);
    section.querySelectorAll('button, select').forEach((control) => { control.disabled = true; });
  });
  resize();
  section.querySelectorAll('button').forEach((button) => { button.disabled = false; });
  countrySelect.disabled = false;
  syncControls();
  document.querySelector('.travel-mobile-controls').classList.add('is-ready');
  loading.hidden = true;
  stage.dataset.ready = 'true';
  requestRender();
}
