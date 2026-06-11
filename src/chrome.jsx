// ====================================================================
// Chrome + Hero + shared components (ES module)
// ====================================================================
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

// ─── Theme hook ──────────────────────────────────────────────────────
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('ak_theme') || 'dark';
    } catch (e) { return 'dark'; }
  });
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('ak_theme', theme); } catch (e) {}
  }, [theme]);
  const toggle = useCallback(() => {
    const next = (t) => (t === 'dark' ? 'light' : 'dark');
    // Prefer the View Transitions API for a synchronized cross-fade.
    // Falls back to a plain state update on older browsers.
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        // Apply the attribute synchronously inside the transition so the
        // browser snapshots old + new states correctly.
        setTheme(prev => {
          const n = next(prev);
          document.documentElement.setAttribute('data-theme', n);
          return n;
        });
      });
    } else {
      setTheme(next);
    }
  }, []);
  return [theme, toggle];
}

// ─── Intersection reveal hook ────────────────────────────────────────
export function useReveal() {
  useEffect(() => {
    let cancelled = false;
    let io;
    let mo;

    const inView = (el) => {
      const r = el.getBoundingClientRect();
      return r.top < window.innerHeight * 1.1 && r.bottom > -40;
    };

    const observeLate = (el) => {
      if (!el || el.classList.contains('in')) return;
      if (inView(el)) { el.classList.add('in'); return; }
      if (io) io.observe(el);
    };

    const run = () => {
      if (cancelled) return;
      const all = document.querySelectorAll('.reveal');
      if (!('IntersectionObserver' in window)) {
        all.forEach(e => e.classList.add('in'));
        return;
      }
      if (!io) {
        io = new IntersectionObserver((entries) => {
          entries.forEach(e => {
            if (e.isIntersecting) {
              e.target.classList.add('in');
              io.unobserve(e.target);
            }
          });
        }, { threshold: 0.05, rootMargin: '0px 0px -30px 0px' });
      }
      let i = 0;
      all.forEach((el) => {
        if (el.classList.contains('in')) return;
        if (inView(el)) {
          setTimeout(() => el.classList.add('in'), i * 70);
          i++;
        } else {
          io.observe(el);
        }
      });
      // Pick up .reveal nodes added later (e.g. after a media-query swap).
      if (!mo) {
        mo = new MutationObserver((muts) => {
          muts.forEach((m) => {
            m.addedNodes.forEach((n) => {
              if (n.nodeType !== 1) return;
              if (n.classList && n.classList.contains('reveal')) observeLate(n);
              if (n.querySelectorAll) n.querySelectorAll('.reveal:not(.in)').forEach(observeLate);
            });
          });
        });
        mo.observe(document.body, { childList: true, subtree: true });
      }
    };
    const t1 = setTimeout(run, 50);
    const t2 = setTimeout(run, 500);
    return () => {
      cancelled = true;
      clearTimeout(t1); clearTimeout(t2);
      if (io) io.disconnect();
      if (mo) mo.disconnect();
    };
  }, []);
}

// ─── Custom cursor (dark only, pointer devices only) ─────────────────
export function CustomCursor({ theme }) {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  useEffect(() => {
    if (theme !== 'dark') return;
    if (window.matchMedia('(pointer: coarse)').matches) return;
    let rx = 0, ry = 0, x = 0, y = 0;
    const onMove = (e) => { x = e.clientX; y = e.clientY; };
    const step = () => {
      rx += (x - rx) * 0.18;
      ry += (y - ry) * 0.18;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      }
      raf = requestAnimationFrame(step);
    };
    let raf = requestAnimationFrame(step);
    window.addEventListener('mousemove', onMove);

    const onOver = (e) => {
      const link = e.target.closest('a, button, .logo-btn, .theme-toggle, .proj-card, .swipe-card, .chip, [data-cursor="on"]');
      if (ringRef.current) ringRef.current.classList.toggle('on-link', !!link);
    };
    document.addEventListener('mouseover', onOver);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseover', onOver);
    };
  }, [theme]);

  if (theme !== 'dark') return null;
  return (
    <>
      <div ref={dotRef} className="cursor-dot" />
      <div ref={ringRef} className="cursor-ring" />
    </>
  );
}

// ─── Topbar ──────────────────────────────────────────────────────────
export function Topbar({ theme, onToggleTheme, onLogoLongPress, onLogoHoverChange }) {
  const pressTimer = useRef(null);
  const [pressing, setPressing] = useState(false);

  const startPress = (e) => {
    setPressing(true);
    pressTimer.current = setTimeout(() => {
      onLogoLongPress();
      setPressing(false);
    }, 800);
  };
  const cancelPress = () => {
    clearTimeout(pressTimer.current);
    setPressing(false);
  };
  const handleLogoEnter = () => onLogoHoverChange?.(true);
  const handleLogoLeave = () => {
    cancelPress();
    onLogoHoverChange?.(false);
  };

  const [active, setActive] = useState('home');
  useEffect(() => {
    const ids = ['home', 'about', 'work', 'experience', 'skills', 'contact'];
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) setActive(e.target.id);
      });
    }, { rootMargin: '-40% 0px -50% 0px' });
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  return (
    <div className="topbar">
      <button
        className={`logo-btn ${pressing ? 'pressing' : ''}`}
        onClick={onToggleTheme}
        onMouseEnter={handleLogoEnter}
        onMouseLeave={handleLogoLeave}
        onMouseDown={startPress} onMouseUp={cancelPress}
        onTouchStart={startPress} onTouchEnd={cancelPress} onTouchCancel={cancelPress}
        aria-label="Toggle theme"
      >
        <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          {theme === 'dark' ? 'AK.' : 'AK.'}
          <span className="long-press-ring" />
        </span>
      </button>

      <div className="topbar-right">
        <nav className="top-nav" aria-label="Primary">
          <a href="#about" className={active === 'about' ? 'active' : ''}>About</a>
          <a href="#work" className={active === 'work' ? 'active' : ''}>Work</a>
          <a href="#experience" className={active === 'experience' ? 'active' : ''}>Experience</a>
          <a href="#skills" className={active === 'skills' ? 'active' : ''}>Arsenal</a>
          <a href="#contact" className={active === 'contact' ? 'active' : ''}>Contact</a>
        </nav>
        <button className="theme-toggle" onClick={onToggleTheme} aria-label="Toggle theme">
          <span className="swatch" />
          <span>{theme === 'dark' ? 'Night' : 'Day'}</span>
        </button>
      </div>
    </div>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────
export function Hero({ theme, data }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const i = setInterval(() => setTime(new Date()), 1000 * 30);
    return () => clearInterval(i);
  }, []);
  const sfTime = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit' }).format(time);
    } catch (e) { return '—'; }
  }, [time]);

  return (
    <section id="home" data-section="hero" data-screen-label="01 Hero">
      <HeroBackdrop />
      <div className="hero-wrap">
        <div className="hero-meta reveal">
          <div className="eyebrow">Available for the right problem</div>
          <div className="hero-time">
            <span className="live-dot" /> SF · {sfTime}
          </div>
        </div>

        <h1 className="hero-title reveal">
          {theme === 'dark' ? <DarkHeroTitle /> : <LightHeroTitle />}
        </h1>

        <div className="hero-sub reveal">
          <p className="hero-tagline">{data.tagline}</p>
        </div>

        <div className="hero-actions reveal">
          <a href="#work" className="btn btn-primary" data-cursor="on">
            Explore Work <span aria-hidden>→</span>
          </a>
          <a href="#contact" className="btn btn-ghost" data-cursor="on">Get in Touch</a>
        </div>

        <div className="hero-scroll reveal">
          <span className="hero-scroll-line" />
          <span className="hero-scroll-label">scroll</span>
        </div>
      </div>
    </section>
  );
}

// ─── HeroBackdrop — topographic contour field that repels the cursor ──
// Contour polylines are generated once (value noise + marching squares)
// and redrawn each frame with vertices pushed away from the pointer.
// Idle = static canvas, zero work. Theme colors re-read on data-theme
// changes. Distortion skipped on touch devices and reduced motion.
function HeroBackdrop() {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const canvas = host.querySelector('canvas');
    const ctx = canvas.getContext('2d');

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = window.matchMedia('(pointer: fine)').matches;

    // Seeded value noise → organic scalar field for the contours
    const mulberry32 = (a) => () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const rand = mulberry32(20260611);
    const LAT = 11; // lattice resolution per axis
    const lattice = Array.from({ length: (LAT + 1) * (LAT + 1) }, () => rand());
    const smooth = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    const latAt = (ix, iy) => lattice[(iy % LAT) * (LAT + 1) + (ix % LAT)];
    const noise = (x, y) => {
      const ix = Math.floor(x), iy = Math.floor(y);
      const fx = smooth(x - ix), fy = smooth(y - iy);
      const a = latAt(ix, iy),     b = latAt(ix + 1, iy);
      const c = latAt(ix, iy + 1), d = latAt(ix + 1, iy + 1);
      return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
    };
    const field = (x, y) =>
      noise(x * 2.6, y * 2.6) * 0.62 +
      noise(x * 5.2 + 7.3, y * 5.2 + 3.1) * 0.26 +
      noise(x * 10.4 + 2.9, y * 10.4 + 8.7) * 0.12;

    // State rebuilt on resize: marching-squares segments in two buckets
    let base = [];    // Float32Array [x1,y1,x2,y2 ...]
    let accent = [];
    let W = 0, H = 0, DPR = 1;

    const build = () => {
      W = host.clientWidth; H = host.clientHeight;
      if (!W || !H) return;
      DPR = Math.min(window.devicePixelRatio || 1, 1.75);
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);

      const CELL = 12;
      const nx = Math.ceil(W / CELL) + 1;
      const ny = Math.ceil(H / CELL) + 1;
      const grid = new Float32Array(nx * ny);
      const span = Math.max(W, H);
      for (let j = 0; j < ny; j++)
        for (let i = 0; i < nx; i++)
          grid[j * nx + i] = field((i * CELL) / span, (j * CELL) / span);

      const LEVELS = 15;
      const ACCENT_LEVEL = 7; // one contour ring drawn in the theme accent
      const baseSegs = [], accentSegs = [];
      const lerp = (la, lb, va, vb, L) => la + ((L - va) / (vb - va)) * (lb - la);

      for (let lv = 0; lv < LEVELS; lv++) {
        const L = 0.18 + (lv / (LEVELS - 1)) * 0.64; // skip flat extremes
        const out = lv === ACCENT_LEVEL ? accentSegs : baseSegs;
        for (let j = 0; j < ny - 1; j++) {
          for (let i = 0; i < nx - 1; i++) {
            const x = i * CELL, y = j * CELL;
            const a = grid[j * nx + i],       b = grid[j * nx + i + 1];
            const c = grid[(j + 1) * nx + i + 1], d = grid[(j + 1) * nx + i];
            let idx = 0;
            if (a > L) idx |= 8; if (b > L) idx |= 4;
            if (c > L) idx |= 2; if (d > L) idx |= 1;
            if (idx === 0 || idx === 15) continue;
            // Edge crossings: top, right, bottom, left
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
              case 5:          push(T, Lf); push(B, R); break;
              case 6: case 9:  push(T, B); break;
              case 7: case 8:  push(T, Lf); break;
              case 10:         push(T, R);  push(Lf, B); break;
            }
          }
        }
      }
      base = new Float32Array(baseSegs);
      accent = new Float32Array(accentSegs);
    };

    // Theme-aware stroke colors, refreshed when data-theme flips
    let baseColor = '', accentColor = '';
    const readColors = () => {
      const dark = document.documentElement.getAttribute('data-theme') !== 'light';
      baseColor = dark ? 'rgba(255,255,255,0.085)' : 'rgba(20,20,20,0.10)';
      const acc = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
      accentColor = acc || 'rgb(255,107,53)';
    };

    // Pointer state — eased; repel falls off as a gaussian
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
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      for (let k = 0; k < segs.length; k += 4) {
        const p = warp(segs[k], segs[k + 1]);
        const q = warp(segs[k + 2], segs[k + 3]);
        ctx.moveTo(p[0], p[1]);
        ctx.lineTo(q[0], q[1]);
      }
      ctx.stroke();
    };

    const draw = () => {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, W, H);
      drawBucket(base, baseColor, 1);
      drawBucket(accent, accentColor, 1.4);
    };

    // rAF loop runs only while the pointer is settling; idle = static
    let raf = 0, running = false;
    const step = () => {
      ptr.x += (ptr.tx - ptr.x) * 0.16;
      ptr.y += (ptr.ty - ptr.y) * 0.16;
      draw();
      const settled = Math.abs(ptr.tx - ptr.x) < 0.3 && Math.abs(ptr.ty - ptr.y) < 0.3;
      if (settled) { running = false; return; }
      raf = requestAnimationFrame(step);
    };
    const wake = () => {
      if (!running) { running = true; raf = requestAnimationFrame(step); }
    };

    const onMove = (e) => {
      const r = host.getBoundingClientRect();
      ptr.tx = e.clientX - r.left;
      ptr.ty = e.clientY - r.top;
      wake();
    };
    const onLeave = () => { ptr.tx = -9999; ptr.ty = -9999; wake(); };

    let ro = null;
    const rebuild = () => { build(); readColors(); draw(); };
    rebuild();
    ro = new ResizeObserver(() => rebuild());
    ro.observe(host);

    const mo = new MutationObserver(() => { readColors(); draw(); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    if (fine && !reduced) {
      window.addEventListener('mousemove', onMove);
      document.documentElement.addEventListener('mouseleave', onLeave);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      ro.disconnect();
      mo.disconnect();
    };
  }, []);

  return (
    <div ref={hostRef} className="hero-backdrop" aria-hidden="true">
      <canvas className="hero-topo" />
    </div>
  );
}

function DarkHeroTitle() {
  return (
    <>
      <span className="hero-line">
        <span className="hero-word">Aakar</span>{' '}
        <span className="hero-word hero-word-accent">Kale<span id="hero-dot">.</span></span>
      </span>
      <span className="hero-line hero-line-sub">
        <span className="hero-word-ghost">Senior Product Manager,</span>
        <br />
        <span className="hero-word-ghost">shipping with clarity.</span>
      </span>
    </>
  );
}

function LightHeroTitle() {
  return (
    <>
      <span className="hero-line hero-mag-title">Aakar Kale</span>
      <span className="hero-line hero-mag-sub">Senior Product Manager</span>
    </>
  );
}

// ─── Section header ──────────────────────────────────────────────────
export function SectionHead({ index, title, sub }) {
  return (
    <div className="section-head reveal">
      <div className="eyebrow">{index} — {title}</div>
      {sub && <h2 className="section-sub">{sub}</h2>}
    </div>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────
export function Footer({ data }) {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-left">
          <div className="footer-sig">AK.</div>
          <div className="footer-meta">© 2026 Aakar Kale. All rights reserved.</div>
        </div>
        <div className="footer-right">
          <a href={`mailto:${data.contact.email}`} className="footer-link" data-cursor="on">Email</a>
          <a href={data.contact.linkedin} className="footer-link" data-cursor="on">LinkedIn</a>
          <a href={data.contact.x} className="footer-link" data-cursor="on">X</a>
        </div>
      </div>
    </footer>
  );
}
