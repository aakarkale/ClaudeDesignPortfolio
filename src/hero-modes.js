// ====================================================================
// Hero FX — five swappable backdrop "experiences" for the hero section.
// The site advances to the next one on every page load (position kept in
// localStorage — see main.jsx). Each mode is a self-contained initializer
// that owns its own canvas drawing, listeners, observers and rAF loop,
// and returns a single cleanup function. createHeroFX() is the small
// controller that swaps between them.
//
//   dots      — a dot-matrix field across the hero; cursor scatters it
//   topo      — topographic contour field, cursor repels the lines
//   spotlight — dark hero; cursor is a soft light revealing texture
//   labyrinth — faint tilt-maze built around the copy; sink the ball
//   magnetic  — title letters are pulled toward the cursor (kinetic type)
//
// Everything degrades gracefully: prefers-reduced-motion paints one calm
// static frame and skips loops/pointer reactivity; coarse pointers skip
// cursor interaction. No third-party libs required (magnetic uses GSAP
// when present, falls back to inline transforms otherwise).
// ====================================================================

// Per-refresh cycle order:
// dots → topo → spotlight → labyrinth → magnetic → (repeat).
export const HERO_MODES = ['dots', 'topo', 'spotlight', 'labyrinth', 'magnetic'];
export const HERO_LABELS = {
  topo: 'Topographic',
  magnetic: 'Magnetic Type',
  spotlight: 'Spotlight',
  dots: 'Dot Matrix',
  labyrinth: 'Labyrinth',
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

  // Mobile turns the light up very slightly — with the pointer wandering
  // on its own (no cursor), a touch more reach + glow makes it clearer
  // that something is alive. Desktop values unchanged.
  const GLOW_A   = fine ? 0.17 : 0.21;  // gradient centre alpha
  const GLOW_MID = fine ? 0.05 : 0.065; // gradient mid-stop alpha
  const DOT_A    = fine ? 0.40 : 0.48;  // revealed dot opacity
  const RAD      = fine ? 0.46 : 0.50;  // light radius (× min(W,H))

  const draw = (now) => {
    ptr.x += (ptr.tx - ptr.x) * 0.12;
    ptr.y += (ptr.ty - ptr.y) * 0.12;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const t = now / 1000;
    const breathe = 1 + Math.sin(t * 1.1) * 0.06;
    const R = Math.min(W, H) * RAD * breathe;
    const cx = ptr.x, cy = ptr.y;
    const [r, g, b] = glow;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    grad.addColorStop(0, `rgba(${r},${g},${b},${GLOW_A})`);
    grad.addColorStop(0.5, `rgba(${r},${g},${b},${GLOW_MID})`);
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
        ctx.globalAlpha = f * DOT_A;
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
    // Mobile is calmer all-round than desktop: resting grid, accent
    // boost near the pointer, and the size bump it gives are all
    // dialled back so the effect is felt rather than displayed.
    const baseA = fine ? (dark ? 0.32 : 0.36) : (dark ? 0.18 : 0.21);
    const NEAR_A = fine ? 0.55 : 0.35; // accent-alpha boost near pointer
    const NEAR_S = fine ? 2.6  : 1.7;  // accent-size bump near pointer
    const ACC_W  = fine ? 1.0  : 0.65; // how much the accent colour wins
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
      const tint = near * ACC_W;
      const r = base[0] + (acc[0] - base[0]) * tint;
      const g = base[1] + (acc[1] - base[1]) * tint;
      const b = base[2] + (acc[2] - base[2]) * tint;
      const a = baseA + near * NEAR_A;
      const s = 2.3 + near * NEAR_S;
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

// ── Mode 5: LABYRINTH ─────────────────────────────────────────────────
// A faint tilt-maze that builds itself AROUND the hero copy — never
// behind it. The grid samples the real DOM rects of the text blocks and
// refuses to place cells there, so the corridors flow around the title
// like a moat. Steering: on mobile the device gyroscope tilts the board
// (same deviceorientation feed as the other modes, ambientDriver's
// Lissajous fallback rolls the ball ambiently when no sensor / no
// permission); on desktop the board tilts toward the cursor. Sink the
// ball into the ringed hole to win — a tiny celebration, then the maze
// quietly deals a new layout. Reduced motion: one calm static frame.
function initLabyrinth(host, canvas, ctx) {
  const reduced = prefersReduced();
  const fine = finePointer();

  let W = 0, H = 0, DPR = 1;

  // Board: cell grid + shared edge arrays (1 = solid wall).
  // edgeV[(cols+1)×rows] are vertical edges, edgeH[cols×(rows+1)] horizontal.
  let cell = 48, cols = 0, rows = 0, offX = 0, offY = 0;
  let openC = new Uint8Array(0);
  let edgeV = new Uint8Array(0), edgeH = new Uint8Array(0);
  let segs = new Float32Array(0);   // drawn segments, for the near-ball tint
  let wallLayer = null;             // offscreen prerender of the resting maze
  let playable = false;
  let start = { x: 0, y: 0 }, hole = { x: 0, y: 0 };
  let wins = 0;

  const ball = { x: 0, y: 0, vx: 0, vy: 0, r: 7 };
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  let sink = null;                  // { t0 } while the ball drops in
  let trail = [];
  let moved = 0;                    // total distance rolled — retires the hint
  const bornAt = performance.now();

  // Desktop autopilot — on a fine pointer the board plays itself: a BFS
  // through the maze from the ball's cell to the hole picks the next
  // waypoint each frame and tilts toward it (easing in near the goal so
  // it actually sinks). The cursor still takes over when moved, then the
  // autopilot resumes ~2.5s after the last move — the same "manual
  // overrides ambient" handoff the gyro/Lissajous uses on mobile.
  let autoPath = [];
  let autoIdx = 1;
  let autoActive = false;
  let lastPointerAt = -1e9;

  const idx = (i, j) => j * cols + i;
  const isOpen = (i, j) => i >= 0 && j >= 0 && i < cols && j < rows && openC[idx(i, j)] === 1;

  // Cells whose core overlaps any hero text are blocked. Rects come from
  // Range.getClientRects() — tight per-line glyph boxes, not full-width
  // block boxes — so the maze reclaims the empty space beside short
  // lines and genuinely hugs the copy. Flex rows (meta, CTAs) measure
  // each child so their gaps stay playable too. The core test (cell
  // inset 25%) keeps slivers usable while the PAD inflation still
  // guarantees a clear moat around the actual glyphs.
  let topSafe = 0; // y below the fixed topbar — keep ball/hole out of it
  const measureBlocked = () => {
    const PAD = fine ? 22 : 14;
    const hostR = host.getBoundingClientRect();
    const section = host.closest('section') || document;
    const ex = [];
    const pushTight = (el) => {
      let list = [];
      try {
        const range = document.createRange();
        range.selectNodeContents(el);
        list = Array.from(range.getClientRects()).filter((r) => r.width > 6 && r.height > 6);
      } catch (e) {}
      if (!list.length) list = [el.getBoundingClientRect()];
      for (const r of list) {
        if (!r.width || !r.height) continue;
        ex.push({
          l: r.left - hostR.left - PAD, t: r.top - hostR.top - PAD,
          r: r.right - hostR.left + PAD, b: r.bottom - hostR.top + PAD,
        });
      }
    };
    for (const sel of ['.hero-meta', '.hero-title', '.hero-sub', '.hero-actions', '.hero-scroll']) {
      section.querySelectorAll(sel).forEach((el) => {
        const flex = /flex/.test(getComputedStyle(el).display);
        if (flex && el.children.length) {
          for (const child of el.children) pushTight(child);
        } else {
          pushTight(el);
        }
      });
    }
    const bar = document.querySelector('.topbar');
    topSafe = bar ? Math.max(0, bar.getBoundingClientRect().bottom - hostR.top + 6) : 0;
    openC = new Uint8Array(cols * rows);
    const inset = cell * 0.25;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const cl = offX + i * cell + inset, ct = offY + j * cell + inset;
        const cr = cl + cell - inset * 2, cb = ct + cell - inset * 2;
        let blocked = false;
        for (const e of ex) {
          if (cl < e.r && cr > e.l && ct < e.b && cb > e.t) { blocked = true; break; }
        }
        openC[idx(i, j)] = blocked ? 0 : 1;
      }
    }
  };

  // Iterative DFS backtracker, run over every open component so each
  // pocket of free space mazifies. Then ~10% of the remaining internal
  // walls are knocked out ("braiding") — a few loops keep the board airy
  // and the ball from feeling trapped in dead ends.
  const carve = () => {
    edgeV = new Uint8Array((cols + 1) * rows);
    edgeH = new Uint8Array(cols * (rows + 1));
    for (let j = 0; j < rows; j++)
      for (let i = 0; i <= cols; i++)
        edgeV[j * (cols + 1) + i] = (isOpen(i - 1, j) || isOpen(i, j)) ? 1 : 0;
    for (let j = 0; j <= rows; j++)
      for (let i = 0; i < cols; i++)
        edgeH[j * cols + i] = (isOpen(i, j - 1) || isOpen(i, j)) ? 1 : 0;

    const visited = new Uint8Array(cols * rows);
    const comp = new Int32Array(cols * rows).fill(-1);
    const compSize = [];
    const stack = [];
    const carveFrom = (s, id) => {
      visited[s] = 1; comp[s] = id; compSize[id] = 1;
      stack.length = 0; stack.push(s);
      while (stack.length) {
        const c = stack[stack.length - 1];
        const ci = c % cols, cj = (c / cols) | 0;
        const cand = [];
        if (isOpen(ci, cj - 1) && !visited[c - cols]) cand.push(0);
        if (isOpen(ci + 1, cj) && !visited[c + 1]) cand.push(1);
        if (isOpen(ci, cj + 1) && !visited[c + cols]) cand.push(2);
        if (isOpen(ci - 1, cj) && !visited[c - 1]) cand.push(3);
        if (!cand.length) { stack.pop(); continue; }
        const dir = cand[(Math.random() * cand.length) | 0];
        let n = c;
        if (dir === 0) { edgeH[cj * cols + ci] = 0; n = c - cols; }
        if (dir === 1) { edgeV[cj * (cols + 1) + ci + 1] = 0; n = c + 1; }
        if (dir === 2) { edgeH[(cj + 1) * cols + ci] = 0; n = c + cols; }
        if (dir === 3) { edgeV[cj * (cols + 1) + ci] = 0; n = c - 1; }
        visited[n] = 1; comp[n] = id; compSize[id]++;
        stack.push(n);
      }
    };
    let nComp = 0;
    for (let c = 0; c < cols * rows; c++) {
      if (openC[c] && !visited[c]) carveFrom(c, nComp++);
    }
    for (let j = 0; j < rows; j++)
      for (let i = 1; i < cols; i++)
        if (isOpen(i - 1, j) && isOpen(i, j) && edgeV[j * (cols + 1) + i] && Math.random() < 0.10)
          edgeV[j * (cols + 1) + i] = 0;
    for (let j = 1; j < rows; j++)
      for (let i = 0; i < cols; i++)
        if (isOpen(i, j - 1) && isOpen(i, j) && edgeH[j * cols + i] && Math.random() < 0.10)
          edgeH[j * cols + i] = 0;
    return { comp, compSize };
  };

  // Start/goal = the two ends of (approximately) the longest corridor in
  // the largest component — classic double-BFS diameter. On desktop that
  // path naturally wraps around the copy; on phones it winds through the
  // biggest free band.
  const passable = (c, dir) => {
    const ci = c % cols, cj = (c / cols) | 0;
    if (dir === 0) return cj > 0 && !edgeH[cj * cols + ci];
    if (dir === 1) return ci < cols - 1 && !edgeV[cj * (cols + 1) + ci + 1];
    if (dir === 2) return cj < rows - 1 && !edgeH[(cj + 1) * cols + ci];
    return ci > 0 && !edgeV[cj * (cols + 1) + ci];
  };
  // Farthest cell by corridor distance — preferring cells that aren't
  // tucked under the fixed topbar, so the ball and the hole never hide
  // behind chrome. Falls back to the absolute farthest if everything
  // reachable sits in that strip.
  const bfsFar = (src) => {
    const dist = new Int32Array(cols * rows).fill(-1);
    const q = [src]; dist[src] = 0;
    let far = src, farPref = -1, farPrefD = -1;
    for (let h = 0; h < q.length; h++) {
      const c = q[h];
      if (dist[c] > dist[far]) far = c;
      const cy = offY + ((c / cols) | 0) * cell + cell / 2;
      if (cy > topSafe && dist[c] > farPrefD) { farPrefD = dist[c]; farPref = c; }
      const nb = [c - cols, c + 1, c + cols, c - 1];
      for (let d = 0; d < 4; d++) {
        const n = nb[d];
        if (passable(c, d) && openC[n] && dist[n] === -1) { dist[n] = dist[c] + 1; q.push(n); }
      }
    }
    return farPref >= 0 ? farPref : far;
  };

  const cellCenter = (c) => ({
    x: offX + (c % cols) * cell + cell / 2,
    y: offY + ((c / cols) | 0) * cell + cell / 2,
  });

  const cellAt = (x, y) => {
    const i = Math.max(0, Math.min(cols - 1, Math.floor((x - offX) / cell)));
    const j = Math.max(0, Math.min(rows - 1, Math.floor((y - offY) / cell)));
    return j * cols + i;
  };

  // BFS the solved corridor from the ball's current cell to the hole.
  // autoPath is a stable list of cell indices [src … dst]; autoIdx is the
  // waypoint we're currently steering toward. Computed once per maze (or
  // on a big stray) — NOT every cell change, which would thrash the ball
  // back and forth at junctions as the re-plan flips direction.
  const computeAutoPath = () => {
    const src = cellAt(ball.x, ball.y);
    const dst = cellAt(hole.x, hole.y);
    const prev = new Int32Array(cols * rows).fill(-2); // -2 = unvisited
    prev[src] = -1;
    const q = [src];
    for (let h = 0; h < q.length; h++) {
      const c = q[h];
      if (c === dst) break;
      const nb = [c - cols, c + 1, c + cols, c - 1];
      for (let d = 0; d < 4; d++) {
        const n = nb[d];
        if (passable(c, d) && openC[n] && prev[n] === -2) { prev[n] = c; q.push(n); }
      }
    }
    const path = [];
    if (prev[dst] !== -2) { for (let c = dst; c !== -1; c = prev[c]) path.push(c); path.reverse(); }
    autoPath = path;
    autoIdx = Math.min(1, path.length - 1);
  };

  // Steer the ball's velocity straight at the active waypoint, advancing
  // the index monotonically. The waypoint scan looks FORWARD from autoIdx
  // so overshooting a junction advances the target rather than aiming the
  // ball back the way it came (the cause of the earlier in-place thrash).
  // On the final cell it eases speed toward zero so the ball settles into
  // the cup instead of skipping past the win radius.
  const AUTO_SPEED = 420;     // px/s glide along the corridor
  const driveAuto = (dt) => {
    if (autoPath.length < 2) computeAutoPath();
    let tx, ty;
    if (autoPath.length < 2) { tx = hole.x; ty = hole.y; }
    else {
      const bc = cellAt(ball.x, ball.y);
      for (let k = autoIdx; k < autoPath.length; k++) {
        if (autoPath[k] === bc) { autoIdx = Math.min(autoPath.length - 1, k + 1); break; }
      }
      const wp = cellCenter(autoPath[autoIdx]);
      if (Math.hypot(wp.x - ball.x, wp.y - ball.y) > cell * 3) { computeAutoPath(); return; }
      const atEnd = autoIdx >= autoPath.length - 1;
      tx = atEnd ? hole.x : wp.x; ty = atEnd ? hole.y : wp.y;
    }
    const dx = tx - ball.x, dy = ty - ball.y, d = Math.hypot(dx, dy) || 1;
    const speed = AUTO_SPEED * Math.min(1, d / (cell * 0.5)); // ease into the cup
    const tvx = (dx / d) * speed, tvy = (dy / d) * speed;
    // Smoothly approach the target velocity — quick enough to track turns,
    // soft enough not to jitter at a junction.
    const k = Math.min(1, 14 * dt);
    ball.vx += (tvx - ball.vx) * k;
    ball.vy += (tvy - ball.vy) * k;
  };

  const renderWalls = () => {
    wallLayer = wallLayer || document.createElement('canvas');
    wallLayer.width = Math.round(W * DPR);
    wallLayer.height = Math.round(H * DPR);
    const w = wallLayer.getContext('2d');
    w.setTransform(DPR, 0, 0, DPR, 0, 0);
    w.clearRect(0, 0, W, H);
    w.strokeStyle = isDark() ? 'rgba(255,255,255,0.10)' : 'rgba(20,20,20,0.12)';
    w.lineWidth = 1;
    w.lineCap = 'round';
    w.beginPath();
    const S = [];
    for (let j = 0; j < rows; j++)
      for (let i = 0; i <= cols; i++)
        if (edgeV[j * (cols + 1) + i]) {
          const x = offX + i * cell, y = offY + j * cell;
          w.moveTo(x, y); w.lineTo(x, y + cell);
          S.push(x, y, x, y + cell);
        }
    for (let j = 0; j <= rows; j++)
      for (let i = 0; i < cols; i++)
        if (edgeH[j * cols + i]) {
          const x = offX + i * cell, y = offY + j * cell;
          w.moveTo(x, y); w.lineTo(x + cell, y);
          S.push(x, y, x + cell, y);
        }
    w.stroke();
    segs = new Float32Array(S);
  };

  const buildBoard = () => {
    measureBlocked();
    const { comp, compSize } = carve();
    let big = -1, bigSize = 0;
    for (let id = 0; id < compSize.length; id++)
      if (compSize[id] > bigSize) { bigSize = compSize[id]; big = id; }
    playable = bigSize >= 8 && !reduced;
    if (big >= 0) {
      let seed = -1;
      for (let c = 0; c < cols * rows; c++) if (comp[c] === big) { seed = c; break; }
      const a = bfsFar(seed);
      const b = bfsFar(a);
      start = cellCenter(a);
      hole = cellCenter(b);
    }
    ball.x = start.x; ball.y = start.y;
    ball.vx = ball.vy = 0;
    ball.r = Math.max(4.5, cell * 0.16);
    trail.length = 0;
    sink = null;
    autoPath = [];
    autoIdx = 1;
    renderWalls();
  };

  const build = (w, h, dpr) => {
    W = w; H = h; DPR = Math.min(dpr, 1.5);
    cell = fine ? Math.max(46, Math.min(60, Math.round(Math.min(W, H) / 11))) : 36;
    cols = Math.max(4, Math.floor((W - 10) / cell));
    rows = Math.max(4, Math.floor((H - 10) / cell));
    offX = (W - cols * cell) / 2;
    offY = (H - rows * cell) / 2;
    buildBoard();
    draw(performance.now());
  };

  // ── Physics ──
  // The board "tilts" toward the pointer (desktop cursor, or the gyro /
  // Lissajous virtual pointer on mobile); the ball accelerates down the
  // tilt, with rolling friction and soft wall bounces. Sub-stepped so a
  // fast roll can't tunnel through a 1px wall.
  // Wall thuds: any collision faster than THUD_V fires buzz('thud').
  // The buzz() cooldown (90ms in haptics.js) keeps a ball rolling fast
  // along a wall from continuously vibrating.
  const THUD_V = 200;
  const thud = (v) => { if (Math.abs(v) > THUD_V && typeof window.__buzz === 'function') window.__buzz('thud'); };
  const collideAxis = (axis) => {
    const ci = Math.max(0, Math.min(cols - 1, Math.floor((ball.x - offX) / cell)));
    const cj = Math.max(0, Math.min(rows - 1, Math.floor((ball.y - offY) / cell)));
    const L = offX + ci * cell, T = offY + cj * cell;
    const REST = -0.32;
    if (axis === 'x') {
      if (edgeV[cj * (cols + 1) + ci] && ball.x - ball.r < L) { thud(ball.vx); ball.x = L + ball.r; ball.vx *= REST; }
      if (edgeV[cj * (cols + 1) + ci + 1] && ball.x + ball.r > L + cell) { thud(ball.vx); ball.x = L + cell - ball.r; ball.vx *= REST; }
    } else {
      if (edgeH[cj * cols + ci] && ball.y - ball.r < T) { thud(ball.vy); ball.y = T + ball.r; ball.vy *= REST; }
      if (edgeH[(cj + 1) * cols + ci] && ball.y + ball.r > T + cell) { thud(ball.vy); ball.y = T + cell - ball.r; ball.vy *= REST; }
    }
  };
  // Wall ends ("posts") at the four lattice corners of the current cell —
  // without these the ball clips corners diagonally through open gaps.
  const collidePosts = () => {
    const ci = Math.max(0, Math.min(cols - 1, Math.floor((ball.x - offX) / cell)));
    const cj = Math.max(0, Math.min(rows - 1, Math.floor((ball.y - offY) / cell)));
    for (let pj = cj; pj <= cj + 1; pj++) {
      for (let pi = ci; pi <= ci + 1; pi++) {
        const hasWall =
          (pj > 0 && edgeV[(pj - 1) * (cols + 1) + pi]) ||
          (pj < rows && edgeV[pj * (cols + 1) + pi]) ||
          (pi > 0 && edgeH[pj * cols + pi - 1]) ||
          (pi < cols && edgeH[pj * cols + pi]);
        if (!hasWall) continue;
        const px = offX + pi * cell, py = offY + pj * cell;
        const dx = ball.x - px, dy = ball.y - py;
        const rr = ball.r + 1.2;
        const d2 = dx * dx + dy * dy;
        if (d2 < rr * rr && d2 > 1e-4) {
          const d = Math.sqrt(d2);
          ball.x = px + (dx / d) * rr;
          ball.y = py + (dy / d) * rr;
          const vn = (ball.vx * dx + ball.vy * dy) / d;
          if (vn < 0) { ball.vx -= ((vn * dx) / d) * 1.32; ball.vy -= ((vn * dy) / d) * 1.32; }
        }
      }
    }
  };

  let last = 0;
  const step = (now) => {
    if (!last) last = now;
    const dt = Math.min((now - last) / 1000, 0.033);
    last = now;
    if (!playable) return;
    if (sink) {
      if (now - sink.t0 > 1500) buildBoard(); // quietly deal a new maze
      return;
    }
    // Desktop plays itself whenever the cursor is idle; moving the cursor
    // hands control back (onMove sets tilt + lastPointerAt) for ~2.5s.
    // Mobile keeps the gyro/Lissajous virtual pointer via onMove, untouched.
    //
    // Two control models: hand/gyro play accelerates a momentum ball down
    // the tilt; the autopilot steers the velocity vector straight at the
    // next path waypoint. Velocity-steering (vs. accelerating) is what
    // keeps the autopilot from arcing and circling in the maze's open,
    // braided pockets — it tracks the corridor deterministically while the
    // wall collisions below still constrain it.
    autoActive = false;
    if (fine && now - lastPointerAt > 2500) { autoActive = true; driveAuto(dt); }
    if (!autoActive) {
      tilt.x += (tilt.tx - tilt.x) * 0.13;
      tilt.y += (tilt.ty - tilt.y) * 0.13;
      const G = 1750;
      ball.vx += tilt.x * G * dt;
      ball.vy += tilt.y * G * dt;
      const f = Math.exp(-2.1 * dt);
      ball.vx *= f; ball.vy *= f;
    }
    const sp = Math.hypot(ball.vx, ball.vy), MAX = autoActive ? 560 : 620;
    if (sp > MAX) { ball.vx *= MAX / sp; ball.vy *= MAX / sp; }
    const steps = Math.max(1, Math.ceil((Math.max(Math.abs(ball.vx), Math.abs(ball.vy)) * dt) / (ball.r * 0.8)));
    for (let s = 0; s < steps; s++) {
      ball.x += (ball.vx * dt) / steps; collideAxis('x');
      ball.y += (ball.vy * dt) / steps; collideAxis('y');
      collidePosts();
    }
    moved += sp * dt;
    if (sp > 30) {
      trail.push({ x: ball.x, y: ball.y });
      if (trail.length > 9) trail.shift();
    }
    if (Math.hypot(ball.x - hole.x, ball.y - hole.y) < cell * 0.30 * 0.62) {
      sink = { t0: now, fx: ball.x, fy: ball.y };
      wins++;
      // Rising success pattern from the haptic vocabulary (Android only).
      if (typeof window.__buzz === 'function') window.__buzz('win');
      const hr = host.getBoundingClientRect();
      if (window.__confettiBurst) window.__confettiBurst(hr.left + hole.x, hr.top + hole.y, 14);
    }
  };

  // ── Drawing ──
  const draw = (now) => {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (wallLayer) ctx.drawImage(wallLayer, 0, 0, W, H);
    const dark = isDark();
    const [ar, ag, ab] = rgbOf('--accent', [255, 221, 85]);

    // Walls within reach of the ball warm toward the accent — the same
    // "the pointer carries a glow" language as the dots grid.
    if (playable) {
      const REACH = cell * 2.2;
      ctx.lineWidth = 1.1;
      ctx.lineCap = 'round';
      for (let k = 0; k < segs.length; k += 4) {
        const mx = (segs[k] + segs[k + 2]) / 2, my = (segs[k + 1] + segs[k + 3]) / 2;
        const d = Math.hypot(mx - ball.x, my - ball.y);
        if (d > REACH) continue;
        const t = 1 - d / REACH;
        ctx.strokeStyle = `rgba(${ar},${ag},${ab},${t * t * 0.30})`;
        ctx.beginPath();
        ctx.moveTo(segs[k], segs[k + 1]);
        ctx.lineTo(segs[k + 2], segs[k + 3]);
        ctx.stroke();
      }
    }

    if (playable || reduced) {
      // Hole: a recessed disc lit like a beacon — a soft accent halo,
      // a breathing ring, and a sonar ping that expands and fades so
      // the goal reads from anywhere on the board.
      const R = cell * 0.30;
      const halo = ctx.createRadialGradient(hole.x, hole.y, 0, hole.x, hole.y, cell * 1.15);
      halo.addColorStop(0, `rgba(${ar},${ag},${ab},0.15)`);
      halo.addColorStop(0.55, `rgba(${ar},${ag},${ab},0.05)`);
      halo.addColorStop(1, `rgba(${ar},${ag},${ab},0)`);
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(hole.x, hole.y, cell * 1.15, 0, Math.PI * 2); ctx.fill();
      const g = ctx.createRadialGradient(hole.x, hole.y, 0, hole.x, hole.y, R);
      g.addColorStop(0, dark ? 'rgba(0,0,0,0.60)' : 'rgba(20,20,20,0.16)');
      g.addColorStop(0.75, dark ? 'rgba(0,0,0,0.35)' : 'rgba(20,20,20,0.10)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(hole.x, hole.y, R, 0, Math.PI * 2); ctx.fill();
      const k = reduced ? 0.5 : 0.5 + 0.5 * Math.sin(now / 700);
      ctx.strokeStyle = `rgba(${ar},${ag},${ab},${0.34 + k * 0.22})`;
      ctx.lineWidth = 1.25;
      ctx.beginPath(); ctx.arc(hole.x, hole.y, R * (0.76 + k * 0.10), 0, Math.PI * 2); ctx.stroke();
      if (!reduced) {
        const ping = (now % 2200) / 2200;
        ctx.strokeStyle = `rgba(${ar},${ag},${ab},${(1 - ping) * (1 - ping) * 0.38})`;
        ctx.lineWidth = 1.25;
        ctx.beginPath(); ctx.arc(hole.x, hole.y, R * 0.9 + ping * cell * 0.95, 0, Math.PI * 2); ctx.stroke();
      }

      // Ball (with sink animation: it slides into the hole and shrinks).
      let bx = ball.x, by = ball.y, br = ball.r, ba = 0.92;
      if (sink) {
        const sk = Math.min(1, (now - sink.t0) / 450);
        bx = sink.fx + (hole.x - sink.fx) * sk;
        by = sink.fy + (hole.y - sink.fy) * sk;
        br = ball.r * (1 - sk * 0.92);
        ba = 0.92 * (1 - sk * 0.5);
        const ringR = cell * (0.3 + sk * 1.25);
        ctx.strokeStyle = `rgba(${ar},${ag},${ab},${(1 - sk) * 0.45})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(hole.x, hole.y, ringR, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = dark ? `rgba(255,255,255,${(1 - sk) * 0.5})` : `rgba(20,20,20,${(1 - sk) * 0.55})`;
        ctx.font = '600 10px Geist, ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('S O L V E D', hole.x, hole.y - cell * 0.62);
      } else {
        for (let i = 0; i < trail.length; i++) {
          const tp = trail[i];
          ctx.fillStyle = `rgba(${ar},${ag},${ab},${(i / trail.length) * 0.10})`;
          ctx.beginPath(); ctx.arc(tp.x, tp.y, br * 0.5, 0, Math.PI * 2); ctx.fill();
        }
      }
      const glow = ctx.createRadialGradient(bx, by, 0, bx, by, br * 3.4);
      glow.addColorStop(0, `rgba(${ar},${ag},${ab},0.16)`);
      glow.addColorStop(1, `rgba(${ar},${ag},${ab},0)`);
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(bx, by, br * 3.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(${ar},${ag},${ab},${ba})`;
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();

      // One-time hint near the starting ball, in the site's mono caption
      // voice. Fades on its own or once the ball has really rolled.
      if (!reduced && wins === 0 && !sink) {
        const age = (now - bornAt) / 1000;
        const a = Math.min(1, Math.max(0, 1 - Math.max(0, age - 8) / 1.6)) * Math.max(0, 1 - moved / 900);
        if (a > 0.02) {
          ctx.fillStyle = dark ? `rgba(255,255,255,${a * 0.38})` : `rgba(20,20,20,${a * 0.42})`;
          ctx.font = '600 10px Geist, ui-monospace, monospace';
          ctx.textAlign = 'center';
          const label = fine ? 'S T E E R · S I N K  T H E  B A L L' : 'T I L T · S I N K  T H E  B A L L';
          // Clamp inside the canvas — start cells often hug a border.
          const tw = ctx.measureText(label).width;
          const hx = Math.max(tw / 2 + 6, Math.min(W - tw / 2 - 6, start.x));
          let hy = start.y - cell * 0.62 > topSafe + 12 ? start.y - cell * 0.62 : start.y + cell * 0.78;
          hy = Math.min(hy, H - 10);
          ctx.fillText(label, hx, hy);
        }
      }
    }
  };

  const frame = (now) => { step(now); draw(now); };

  // ── Input ──
  // Pointer offset from the hero centre = board tilt (−1..1 each axis,
  // small deadzone so a parked cursor reads as a level board).
  const onMove = (e) => {
    // A real cursor move (fine pointer) hands control to the player and
    // pauses the desktop autopilot for ~2.5s. On mobile this is the
    // ambient virtual pointer, where lastPointerAt is moot (autopilot is
    // desktop-only) but harmless.
    if (fine) lastPointerAt = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const r = host.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
    const sx = Math.max(-1, Math.min(1, nx));
    const sy = Math.max(-1, Math.min(1, ny));
    tilt.tx = Math.abs(sx) < 0.05 ? 0 : sx;
    tilt.ty = Math.abs(sy) < 0.05 ? 0 : sy;
  };
  const onLeave = () => { tilt.tx = 0; tilt.ty = 0; };

  const stopSize = observeSize(host, canvas, build, 1.5);
  const stopTheme = observeTheme(() => { renderWalls(); draw(performance.now()); });
  // The entrance animation translates the text blocks; remeasure once it
  // settles so the moat hugs the true resting layout.
  const stopReady = whenHeroReady(() => { if (W && H) { buildBoard(); draw(performance.now()); } });

  let stopLoop = () => {};
  let stopAmbient = () => {};
  if (!reduced) {
    stopLoop = loopWhileVisible(host, frame);
    if (fine) {
      window.addEventListener('mousemove', onMove, { passive: true });
      document.documentElement.addEventListener('mouseleave', onLeave);
    } else {
      stopAmbient = ambientDriver(host, onMove);
    }
  }

  // Test hook for headless verification (state peek + ball warp + kick).
  window.__heroLab = {
    state: () => ({ x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy, tx: tilt.tx, ty: tilt.ty, hole: { ...hole }, start: { ...start }, wins, cols, rows, cell, playable, autoLen: autoPath.length, autoActive }),
    warp: (x, y) => { ball.x = x; ball.y = y; ball.vx = ball.vy = 0; },
    kick: (vx, vy) => { ball.vx = vx; ball.vy = vy; },
  };

  return () => {
    stopLoop(); stopAmbient(); stopSize(); stopTheme(); stopReady();
    window.removeEventListener('mousemove', onMove);
    document.documentElement.removeEventListener('mouseleave', onLeave);
    delete window.__heroLab;
  };
}

const MODES = {
  topo: initTopo,
  magnetic: initMagnetic,
  spotlight: initSpotlight,
  dots: initDots,
  labyrinth: initLabyrinth,
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
