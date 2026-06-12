// ====================================================================
// Hero FX — four swappable backdrop "experiences" for the hero section.
// The site advances to the next one on every page load (position kept in
// localStorage — see main.jsx). Each mode is a self-contained initializer
// that owns its own canvas drawing, listeners, observers and rAF loop,
// and returns a single cleanup function. createHeroFX() is the small
// controller that swaps between them.
//
//   dots      — a dot-matrix field across the hero; cursor scatters it
//   topo      — topographic contour field, cursor repels the lines
//   spotlight — dark hero; cursor is a soft light revealing texture
//   magnetic  — title letters are pulled toward the cursor (kinetic type)
//
// Everything degrades gracefully: prefers-reduced-motion paints one calm
// static frame and skips loops/pointer reactivity; coarse pointers skip
// cursor interaction. No third-party libs required (magnetic uses GSAP
// when present, falls back to inline transforms otherwise).
// ====================================================================

// Per-refresh cycle order: dots → topo → spotlight → magnetic → (repeat).
export const HERO_MODES = ['dots', 'topo', 'spotlight', 'magnetic'];
export const HERO_LABELS = {
  topo: 'Topographic',
  magnetic: 'Magnetic Type',
  spotlight: 'Spotlight',
  dots: 'Dot Matrix',
};

// ── Shared helpers ────────────────────────────────────────────────────
const prefersReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = () => window.matchMedia('(pointer: fine)').matches;
const isDark = () => document.documentElement.getAttribute('data-theme') !== 'light';

const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const rgbOf = (name, fb) => {
  const m = cssVar(name).match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  return m ? [+m[1], +m[2], +m[3]] : fb;
};

// Size the canvas to the host (with a DPR cap) and call onBuild(W,H,DPR)
// in CSS pixels; re-runs on resize. Returns a disconnect fn.
function observeSize(host, canvas, onBuild, cap = 1.75) {
  const fit = () => {
    const W = host.clientWidth, H = host.clientHeight;
    if (!W || !H) return;
    const DPR = Math.min(window.devicePixelRatio || 1, cap);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    onBuild(W, H, DPR);
  };
  fit();
  const ro = new ResizeObserver(fit);
  ro.observe(host);
  return () => ro.disconnect();
}

// Re-run cb whenever the theme flips.
function observeTheme(cb) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => mo.disconnect();
}

// Track whether the host is on-screen; cb(visible) on change.
function observeVisible(host, cb) {
  let vis = true;
  const io = new IntersectionObserver(([e]) => { vis = e.isIntersecting; cb(vis); });
  io.observe(host);
  return { get: () => vis, stop: () => io.disconnect() };
}

// Continuous rAF that only runs while the host is visible (ambient modes).
function loopWhileVisible(host, frame) {
  let stop = null;
  const start = () => {
    if (stop) return;
    let raf;
    const tick = (t) => { frame(t); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    stop = () => cancelAnimationFrame(raf);
  };
  const halt = () => { if (stop) { stop(); stop = null; } };
  const vis = observeVisible(host, (v) => (v ? start() : halt()));
  if (vis.get()) start();
  return () => { halt(); vis.stop(); };
}

// Drive an ambient "virtual pointer" so coarse-pointer (mobile) devices
// still see the hero experiences come alive — there's no cursor to track.
// It calls onMove with a fake { clientX, clientY } in viewport coords, so
// each mode reuses its existing pointer handler unchanged.
//
// Input priority each frame:
//   1. Device gyroscope (deviceorientation events) — tilt the phone to
//      steer the pointer. iOS gates this behind a permission request
//      that must come from an explicit user click on a real interactive
//      element; see GyroPrompt in chrome.jsx. Android grants by default.
//   2. Lissajous fallback — if no tilt data has arrived in the last 2s
//      (no sensor, permission denied, desktop), wander autonomously so
//      the experience never sits still.
//
// Either path bleeds a little scroll position into the pointer so a
// swipe feels intentional. Only runs while the hero is on-screen; skipped
// entirely under reduced motion.

function ambientDriver(host, onMove) {
  if (prefersReduced()) return () => {};
  const t0 = performance.now();

  // Latest tilt sample and when it arrived. Stays null until the device
  // (on Android) or the user-granted permission flow (iOS) starts
  // delivering orientation events.
  let tilt = null;        // { gamma: -90..90, beta: -180..180 }
  let tiltAt = 0;
  const onOrient = (e) => {
    if (e.gamma == null && e.beta == null) return;
    tilt = { gamma: e.gamma || 0, beta: e.beta || 0 };
    tiltAt = performance.now();
  };
  window.addEventListener('deviceorientation', onOrient, { passive: true });

  // Smoothed normalized pointer position (0..1 within the hero rect).
  let cx = 0.5, cy = 0.40;

  const stopLoop = loopWhileVisible(host, (now) => {
    const r = host.getBoundingClientRect();
    if (r.bottom <= 0 || r.top >= window.innerHeight) return;

    let tx, ty;
    if (tilt && now - tiltAt < 2000) {
      // Gyro-driven. ±30° of gamma / beta around a 35° resting beta maps
      // to the same 0.12–0.88 / 0.10–0.72 spread as the Lissajous so the
      // pointer stays within the hero even at extreme tilts.
      const CAP = 30;
      const gx = Math.max(-1, Math.min(1, tilt.gamma / CAP));
      const by = Math.max(-1, Math.min(1, (tilt.beta - 35) / CAP));
      tx = 0.5 + gx * 0.38;
      ty = 0.40 + by * 0.30;
    } else {
      // Autonomous Lissajous fallback.
      const t = (now - t0) / 1000;
      tx = 0.5 + Math.sin(t * 0.78) * 0.38;
      ty = 0.40 + Math.cos(t * 0.55) * 0.30;
    }

    // Critically-damped smoothing — kills sensor jitter and softens the
    // gyro→Lissajous handoff if events stop arriving mid-wander.
    cx += (tx - cx) * 0.14;
    cy += (ty - cy) * 0.14;

    // Each viewport scrolled past the hero nudges the pointer; capped
    // so a fast flick can't fling the pointer off the field.
    const sBleed = Math.max(-0.18, Math.min(0.18,
      (window.scrollY / Math.max(1, r.height)) * 0.22));

    onMove({
      clientX: r.left + cx * r.width,
      clientY: r.top + (cy + sBleed) * r.height,
    });
  });

  return () => {
    window.removeEventListener('deviceorientation', onOrient);
    stopLoop();
  };
}

// ── Mode 1: TOPO (the original) ───────────────────────────────────────
function initTopo(host, canvas, ctx) {
  const reduced = prefersReduced();
  const fine = finePointer();

  const mulberry32 = (a) => () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rand = mulberry32(20260611);
  const LAT = 11;
  const lattice = Array.from({ length: (LAT + 1) * (LAT + 1) }, () => rand());
  const smooth = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const latAt = (ix, iy) => lattice[(iy % LAT) * (LAT + 1) + (ix % LAT)];
  const noise = (x, y) => {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = smooth(x - ix), fy = smooth(y - iy);
    const a = latAt(ix, iy), b = latAt(ix + 1, iy);
    const c = latAt(ix, iy + 1), d = latAt(ix + 1, iy + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
  const field = (x, y) =>
    noise(x * 2.6, y * 2.6) * 0.62 +
    noise(x * 5.2 + 7.3, y * 5.2 + 3.1) * 0.26 +
    noise(x * 10.4 + 2.9, y * 10.4 + 8.7) * 0.12;

  let base = new Float32Array(0), accent = new Float32Array(0);
  let W = 0, H = 0, DPR = 1;

  const build = (w, h, dpr) => {
    W = w; H = h; DPR = dpr;
    const CELL = 12;
    const nx = Math.ceil(W / CELL) + 1;
    const ny = Math.ceil(H / CELL) + 1;
    const grid = new Float32Array(nx * ny);
    const span = Math.max(W, H);
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++)
        grid[j * nx + i] = field((i * CELL) / span, (j * CELL) / span);

    const LEVELS = 15;
    const ACCENT_LEVEL = 7;
    const baseSegs = [], accentSegs = [];
    const lerp = (la, lb, va, vb, L) => la + ((L - va) / (vb - va)) * (lb - la);

    for (let lv = 0; lv < LEVELS; lv++) {
      const L = 0.18 + (lv / (LEVELS - 1)) * 0.64;
      const out = lv === ACCENT_LEVEL ? accentSegs : baseSegs;
      for (let j = 0; j < ny - 1; j++) {
        for (let i = 0; i < nx - 1; i++) {
          const x = i * CELL, y = j * CELL;
          const a = grid[j * nx + i], b = grid[j * nx + i + 1];
          const c = grid[(j + 1) * nx + i + 1], d = grid[(j + 1) * nx + i];
          let idx = 0;
          if (a > L) idx |= 8; if (b > L) idx |= 4;
          if (c > L) idx |= 2; if (d > L) idx |= 1;
          if (idx === 0 || idx === 15) continue;
          const T = [lerp(x, x + CELL, a, b, L), y];
          const R = [x + CELL, lerp(y, y + CELL, b, c, L)];
          const B = [lerp(x, x + CELL, d, c, L), y + CELL];
          const Lf = [x, lerp(y, y + CELL, a, d, L)];
          const push = (p, q) => out.push(p[0], p[1], q[0], q[1]);
          switch (idx) {
            case 1: case 14: push(Lf, B); break;
            case 2: case 13: push(B, R); break;
            case 3: case 12: push(Lf, R); break;
            case 4: case 11: push(T, R); break;
            case 5: push(T, Lf); push(B, R); break;
            case 6: case 9: push(T, B); break;
            case 7: case 8: push(T, Lf); break;
            case 10: push(T, R); push(Lf, B); break;
          }
        }
      }
    }
    base = new Float32Array(baseSegs);
    accent = new Float32Array(accentSegs);
  };

  let baseColor = '', accentColor = '';
  const readColors = () => {
    baseColor = isDark() ? 'rgba(255,255,255,0.085)' : 'rgba(20,20,20,0.10)';
    const [r, g, b] = rgbOf('--accent', [255, 107, 53]);
    accentColor = `rgba(${r},${g},${b},0.42)`;
  };

  const ptr = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
  const RADIUS = 180, PUSH = 48;
  const CUT = RADIUS * RADIUS * 5;
  const warp = (x, y) => {
    const dx = x - ptr.x, dy = y - ptr.y;
    const d2 = dx * dx + dy * dy;
    if (d2 > CUT || d2 < 0.01) return [x, y];
    const f = (PUSH * Math.exp(-d2 / (RADIUS * RADIUS))) / Math.sqrt(d2);
    return [x + dx * f, y + dy * f];
  };
  const drawBucket = (segs, color, width) => {
    ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.beginPath();
    for (let k = 0; k < segs.length; k += 4) {
      const p = warp(segs[k], segs[k + 1]);
      const q = warp(segs[k + 2], segs[k + 3]);
      ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]);
    }
    ctx.stroke();
  };
  const draw = () => {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    drawBucket(base, baseColor, 1);
    drawBucket(accent, accentColor, 1.1);
  };

  let raf = 0, running = false, visible = true;
  const step = () => {
    ptr.x += (ptr.tx - ptr.x) * 0.16;
    ptr.y += (ptr.ty - ptr.y) * 0.16;
    draw();
    const settled = Math.abs(ptr.tx - ptr.x) < 0.3 && Math.abs(ptr.ty - ptr.y) < 0.3;
    if (settled) { running = false; return; }
    raf = requestAnimationFrame(step);
  };
  const wake = () => { if (!running && visible) { running = true; raf = requestAnimationFrame(step); } };

  const onMove = (e) => {
    if (!visible) return;
    const r = host.getBoundingClientRect();
    ptr.tx = e.clientX - r.left; ptr.ty = e.clientY - r.top; wake();
  };
  const onLeave = () => { ptr.tx = -9999; ptr.ty = -9999; wake(); };

  const stopSize = observeSize(host, canvas, (w, h, dpr) => { build(w, h, dpr); readColors(); draw(); });
  const stopTheme = observeTheme(() => { readColors(); draw(); });
  const vis = observeVisible(host, (v) => {
    visible = v;
    if (!v) { ptr.x = ptr.tx = -9999; ptr.y = ptr.ty = -9999; running = false; cancelAnimationFrame(raf); }
    else draw();
  });

  let stopAmbient = () => {};
  if (fine && !reduced) {
    window.addEventListener('mousemove', onMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', onLeave);
  } else if (!reduced) {
    // Mobile / coarse pointer: synthesise a virtual pointer so the
    // contour repel still has something to react to.
    stopAmbient = ambientDriver(host, onMove);
  }

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('mousemove', onMove);
    document.documentElement.removeEventListener('mouseleave', onLeave);
    stopAmbient(); stopSize(); stopTheme(); vis.stop();
  };
}

// ── Mode 2: MAGNETIC TYPE ─────────────────────────────────────────────
// While this mode is active, React renders the hero title as per-letter
// .hero-letter spans (see chrome.jsx) — we never mutate React-owned DOM
// ourselves. Here we just pull each letter toward the cursor with a
// distance falloff (iron-filings feel); the canvas holds a faint accent
// glow. We wait for the entrance to settle before measuring rest centres.
function whenHeroReady(cb) {
  if (document.documentElement.dataset.heroIntro === 'done' || prefersReduced()) {
    cb(); return () => {};
  }
  let done = false;
  const fire = () => { if (!done) { done = true; teardown(); cb(); } };
  const to = setTimeout(fire, 2200);
  const mo = new MutationObserver(() => {
    if (document.documentElement.dataset.heroIntro === 'done') fire();
  });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-hero-intro'] });
  const teardown = () => { clearTimeout(to); mo.disconnect(); };
  return () => { done = true; teardown(); };
}

function initMagnetic(host, canvas, ctx) {
  const reduced = prefersReduced();
  const fine = finePointer();
  let W = 0, H = 0, DPR = 1;

  const drawGlow = () => {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const [r, g, b] = rgbOf('--accent', [255, 221, 85]);
    const cx = W * 0.5, cy = H * 0.44, R = Math.min(W, H) * 0.75;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    grad.addColorStop(0, `rgba(${r},${g},${b},${isDark() ? 0.1 : 0.07})`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  };

  const stopSize = observeSize(host, canvas, (w, h, dpr) => { W = w; H = h; DPR = Math.min(dpr, 1.5); drawGlow(); }, 1.5);
  const stopTheme = observeTheme(drawGlow);

  // Reduced motion: keep just the static glow. Mobile (coarse) still
  // splits the title and runs the magnetic field — driven by an ambient
  // virtual pointer below, since there's no cursor.
  if (reduced) {
    return () => { stopSize(); stopTheme(); };
  }

  let letters = [], quick = [], moveBound = null, resizeBound = null;
  let stopAmbient = () => {};
  const gsap = window.gsap;
  // Wider radius and a touch more strength on mobile so the ambient
  // virtual pointer visibly affects a swath of letters at a time — a
  // single 150px reach passing slowly across the title is too sparse
  // to read as "alive" without a real cursor.
  const RADIUS = fine ? 150 : 240;
  const STR = fine ? 0.42 : 0.52;

  const measure = () => {
    for (const L of letters) {
      const r = L.el.getBoundingClientRect();
      L.px = r.left + window.scrollX + r.width / 2;
      L.py = r.top + window.scrollY + r.height / 2;
    }
  };

  const wire = () => {
    const els = Array.from(document.querySelectorAll('.hero-title .hero-letter'));
    if (!els.length) return;
    letters = els.map((el) => ({ el, px: 0, py: 0 }));
    measure();
    if (gsap) {
      quick = letters.map((L) => ({
        x: gsap.quickTo(L.el, 'x', { duration: 0.5, ease: 'power3.out' }),
        y: gsap.quickTo(L.el, 'y', { duration: 0.5, ease: 'power3.out' }),
        r: gsap.quickTo(L.el, 'rotation', { duration: 0.6, ease: 'power3.out' }),
      }));
    }
    moveBound = (e) => {
      const sx = window.scrollX, sy = window.scrollY;
      for (let i = 0; i < letters.length; i++) {
        const L = letters[i];
        const dx = e.clientX - (L.px - sx), dy = e.clientY - (L.py - sy);
        const d = Math.hypot(dx, dy);
        let tx = 0, ty = 0, tr = 0;
        if (d < RADIUS) { const f = 1 - d / RADIUS; tx = dx * f * STR; ty = dy * f * STR; tr = dx * 0.04 * f; }
        if (quick[i]) { quick[i].x(tx); quick[i].y(ty); quick[i].r(tr); }
        else L.el.style.transform = `translate(${tx}px,${ty}px) rotate(${tr}deg)`;
      }
    };
    resizeBound = () => {
      if (gsap) gsap.killTweensOf(letters.map((L) => L.el));
      letters.forEach((L) => { L.el.style.transform = ''; });
      measure();
    };
    if (fine) {
      window.addEventListener('mousemove', moveBound, { passive: true });
    } else {
      stopAmbient = ambientDriver(host, moveBound);
    }
    window.addEventListener('resize', resizeBound, { passive: true });
  };

  const stopReady = whenHeroReady(wire);

  return () => {
    stopSize(); stopTheme(); stopReady(); stopAmbient();
    if (moveBound) window.removeEventListener('mousemove', moveBound);
    if (resizeBound) window.removeEventListener('resize', resizeBound);
    if (gsap && letters.length) gsap.killTweensOf(letters.map((L) => L.el));
    letters.forEach((L) => { L.el.style.transform = ''; });
  };
}

// ── Mode 3: SPOTLIGHT ─────────────────────────────────────────────────
// The hero reads dark; a soft accent light follows the cursor and reveals
// a faint dot texture only within its reach. Idle = the light parks center
// and breathes. Title stays fully legible (it sits above the canvas).
function initSpotlight(host, canvas, ctx) {
  const reduced = prefersReduced();
  const fine = finePointer();
  let W = 0, H = 0, DPR = 1, dotColor = '255,255,255', glow = [255, 221, 85];
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };

  const colors = () => {
    dotColor = isDark() ? '255,255,255' : '20,20,20';
    glow = rgbOf('--accent', [255, 221, 85]);
  };

  const draw = (now) => {
    ptr.x += (ptr.tx - ptr.x) * 0.12;
    ptr.y += (ptr.ty - ptr.y) * 0.12;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const t = now / 1000;
    const breathe = 1 + Math.sin(t * 1.1) * 0.06;
    const R = Math.min(W, H) * 0.46 * breathe;
    const cx = ptr.x, cy = ptr.y;
    const [r, g, b] = glow;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    grad.addColorStop(0, `rgba(${r},${g},${b},0.17)`);
    grad.addColorStop(0.5, `rgba(${r},${g},${b},0.05)`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    const SP = 26;
    const x0 = Math.max(0, Math.floor((cx - R) / SP) * SP);
    const y0 = Math.max(0, Math.floor((cy - R) / SP) * SP);
    const x1 = Math.min(W, cx + R), y1 = Math.min(H, cy + R);
    for (let y = y0; y <= y1; y += SP) {
      for (let x = x0; x <= x1; x += SP) {
        const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
        if (d > R) continue;
        const f = 1 - d / R;
        ctx.globalAlpha = f * 0.4;
        const s = 0.6 + f * 1.6;
        ctx.fillStyle = `rgba(${dotColor},1)`;
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
      }
    }
    ctx.globalAlpha = 1;
  };

  const build = (w, h, dpr) => {
    W = w; H = h; DPR = Math.min(dpr, 1.5);
    colors();
    if (!ptr.tx && !ptr.ty) { ptr.x = ptr.tx = W / 2; ptr.y = ptr.ty = H * 0.42; }
    draw(performance.now());
  };

  const stopSize = observeSize(host, canvas, build, 1.5);
  const stopTheme = observeTheme(() => { colors(); draw(performance.now()); });

  const onMove = (e) => {
    const r = host.getBoundingClientRect();
    ptr.tx = e.clientX - r.left; ptr.ty = e.clientY - r.top;
  };
  const onLeave = () => { ptr.tx = W / 2; ptr.ty = H * 0.42; };

  let stopLoop = () => {};
  let stopAmbient = () => {};
  if (!reduced) {
    stopLoop = loopWhileVisible(host, draw);
    if (fine) {
      window.addEventListener('mousemove', onMove, { passive: true });
      document.documentElement.addEventListener('mouseleave', onLeave);
    } else {
      // Mobile: ambient pointer slowly walks the spotlight around the hero.
      stopAmbient = ambientDriver(host, onMove);
    }
  }

  return () => {
    stopLoop(); stopAmbient(); stopSize(); stopTheme();
    window.removeEventListener('mousemove', onMove);
    document.documentElement.removeEventListener('mouseleave', onLeave);
  };
}

// ── Mode 4: DOT MATRIX ────────────────────────────────────────────────
// A dot grid spanning the whole hero. The dots assemble from a scatter on
// load and the cursor pushes the nearby ones aside (they spring back). The
// .hero-backdrop radial mask fades the grid out toward the edges.
function initDots(host, canvas, ctx) {
  const reduced = prefersReduced();
  const fine = finePointer();
  let W = 0, H = 0, DPR = 1, dots = [], base = [255, 255, 255], acc = [255, 221, 85];
  let formStart = performance.now();
  const ptr = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
  const REPEL = 110;
  const SP = 26; // grid spacing in CSS px

  const colors = () => {
    base = isDark() ? [255, 255, 255] : [20, 20, 20];
    acc = rgbOf('--accent', [255, 221, 85]);
  };

  const buildField = () => {
    const cols = Math.ceil(W / SP), rows = Math.ceil(H / SP);
    const offX = (W - (cols - 1) * SP) / 2; // symmetric margins so edges feel intentional
    const offY = (H - (rows - 1) * SP) / 2;
    const next = [];
    let idx = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const prev = dots[idx++];
        next.push({
          tx: offX + c * SP, ty: offY + r * SP,
          x: prev ? prev.x : Math.random() * W,
          y: prev ? prev.y : Math.random() * H,
        });
      }
    }
    dots = next;
  };

  const build = (w, h, dpr) => {
    W = w; H = h; DPR = Math.min(dpr, 1.5);
    colors();
    buildField();
    formStart = performance.now();
    running = false;
    wake();
  };

  const draw = () => {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const dark = isDark();
    const baseA = dark ? 0.32 : 0.36;
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      const dx = d.x - ptr.x, dy = d.y - ptr.y, dd = Math.hypot(dx, dy);
      let near = 0;
      if (dd < REPEL && dd > 0.01) {
        const f = (1 - dd / REPEL);
        d.x += (dx / dd) * f * 14;
        d.y += (dy / dd) * f * 14;
        near = f;
      }
      d.x += (d.tx - d.x) * 0.12;
      d.y += (d.ty - d.y) * 0.12;
      // Dots near the pointer tint toward the theme accent and grow —
      // the disturbance reads as a clear warm glow moving through the
      // grid rather than a subtle shimmer.
      const r = base[0] + (acc[0] - base[0]) * near;
      const g = base[1] + (acc[1] - base[1]) * near;
      const b = base[2] + (acc[2] - base[2]) * near;
      const a = baseA + near * 0.55;
      const s = 2.3 + near * 2.6;
      ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${a})`;
      ctx.fillRect(d.x - s / 2, d.y - s / 2, s, s);
    }
  };

  let raf = 0, running = false, visible = true;
  const step = () => {
    draw();
    // keep looping while still forming or while cursor is engaged
    let moving = (performance.now() - formStart) < 1400;
    if (!moving) {
      for (let i = 0; i < dots.length; i++) {
        if (Math.abs(dots[i].x - dots[i].tx) > 0.4 || Math.abs(dots[i].y - dots[i].ty) > 0.4) { moving = true; break; }
      }
    }
    if (!moving) { running = false; return; }
    raf = requestAnimationFrame(step);
  };
  const wake = () => { if (!running && visible) { running = true; raf = requestAnimationFrame(step); } };

  const onMove = (e) => {
    if (!visible) return;
    const r = host.getBoundingClientRect();
    ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; wake();
  };
  const onLeave = () => { ptr.x = -9999; ptr.y = -9999; wake(); };

  const stopSize = observeSize(host, canvas, build, 1.5);
  const stopTheme = observeTheme(() => { colors(); draw(); });
  const vis = observeVisible(host, (v) => {
    visible = v;
    if (!v) { running = false; cancelAnimationFrame(raf); }
    else { formStart = performance.now(); wake(); }
  });

  let stopAmbient = () => {};
  if (fine && !reduced) {
    window.addEventListener('mousemove', onMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', onLeave);
  } else if (!reduced) {
    // Mobile: ambient pointer scatters the grid as it wanders.
    stopAmbient = ambientDriver(host, onMove);
  }
  if (reduced) {
    // settle straight to formed
    for (const d of dots) { d.x = d.tx; d.y = d.ty; }
    draw();
  }

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('mousemove', onMove);
    document.documentElement.removeEventListener('mouseleave', onLeave);
    stopAmbient(); stopSize(); stopTheme(); vis.stop();
  };
}

const MODES = {
  topo: initTopo,
  magnetic: initMagnetic,
  spotlight: initSpotlight,
  dots: initDots,
};

// ── Controller ────────────────────────────────────────────────────────
export function createHeroFX(host, canvas) {
  const ctx = canvas.getContext('2d');
  let cleanup = null, current = null;

  const setMode = (mode) => {
    if (!MODES[mode]) mode = 'topo';
    if (mode === current) return;
    if (cleanup) { cleanup(); cleanup = null; }
    // hard reset the shared canvas between modes
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    current = mode;
    const section = host.closest('section');
    if (section) section.setAttribute('data-hero-mode', mode);
    cleanup = MODES[mode](host, canvas, ctx) || null;
  };

  const destroy = () => { if (cleanup) cleanup(); cleanup = null; current = null; };
  return { setMode, destroy };
}
