// ====================================================================
// Chrome + Hero + shared components (ES module)
// ====================================================================
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createHeroFX } from './hero-modes.js';

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
      const link = e.target.closest('a, button, .logo-btn, .theme-toggle, .proj-card, .wc-card, .chip, [data-cursor="on"]');
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

// ─── Motion hint (iOS only) ─────────────────────────────────────────
// iOS Safari only honours DeviceOrientationEvent.requestPermission() when
// it's called synchronously from a click on an actual interactive element
// — a document-level "first tap anywhere" listener is unreliable. This
// small mono-caps line in the hero meta strip is that explicit element;
// it sits in the same visual register as the SF time indicator. Once
// granted/denied it briefly confirms then dismisses for the session.
export function GyroPrompt() {
  const [state, setState] = useState('init');
  useEffect(() => {
    if (state !== 'init') return;
    const DOE = typeof DeviceOrientationEvent !== 'undefined' ? DeviceOrientationEvent : null;
    if (!DOE || typeof DOE.requestPermission !== 'function') return;
    if (window.matchMedia('(pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Guarded: with cookies blocked (Safari "Block All Cookies", Chrome
    // site settings) storage access throws, and an uncaught throw here
    // unmounted the whole app — a blank page.
    let asked = false;
    try { asked = sessionStorage.getItem('ak_motion_asked') === '1'; } catch (e) {}
    if (asked) return;
    const t = setTimeout(() => setState('ask'), 1500);
    return () => clearTimeout(t);
  }, [state]);

  const onTap = async () => {
    // requestPermission must be invoked from inside this click handler
    // for iOS to treat it as user-activated.
    let result = 'denied';
    try { result = await DeviceOrientationEvent.requestPermission(); } catch (e) {}
    try { sessionStorage.setItem('ak_motion_asked', '1'); } catch (e) {}
    setState(result === 'granted' ? 'granted' : 'denied');
    // Keep "motion on" visible as a status indicator alongside the SF
    // time — reads as page furniture once it's there. Only the denied
    // state auto-dismisses so it doesn't linger as a complaint.
    if (result !== 'granted') {
      setTimeout(() => setState('hidden'), 1800);
    }
  };

  if (state === 'init' || state === 'hidden') return null;
  const label = state === 'granted' ? 'motion on'
    : state === 'denied'             ? 'motion off'
    :                                  'tap for motion';
  return (
    <button className={`motion-hint on-${state}`} onClick={onTap} aria-label={label}>
      <span className="motion-hint-dot" aria-hidden="true" />
      {label}
    </button>
  );
}

// ─── Topbar ──────────────────────────────────────────────────────────
export function Topbar({ theme, onToggleTheme, onLogoLongPress, onLogoHoverChange }) {
  const pressTimer = useRef(null);
  const [pressing, setPressing] = useState(false);

  const startPress = (e) => {
    // Mobile: long-press egg disabled — desktop mousedown path only.
    if (e && e.type && e.type.startsWith('touch')) return;
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

  // Transparent over the hero backdrop at the top; frosted once scrolled.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className={`topbar ${scrolled ? '' : 'at-top'}`}>
      <button
        className={`logo-btn ${pressing ? 'pressing' : ''}`}
        onMouseEnter={handleLogoEnter}
        onMouseLeave={handleLogoLeave}
        onMouseDown={startPress} onMouseUp={cancelPress}
        onTouchStart={startPress} onTouchEnd={cancelPress} onTouchCancel={cancelPress}
        aria-label="AK logo"
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
// One-time caption telling a new visitor the hero backdrop changes on
// refresh. Rendered only on a fresh landing (after a refresh they've found
// it): it fades in once the hero entrance has settled, holds, then fades
// out and unmounts. The clock starts only while the tab is visible, so a
// site opened in a background tab still shows it when it's looked at.
// Decorative, so aria-hidden; it sits outside the blocks the labyrinth
// measures, so the maze never routes around it.
const HINT_DELAY = 2600, HINT_HOLD = 5200, HINT_FADE = 700;

// Where the pill shows, decided against the real layout just before it
// fades in. Its CSS home (bottom-right, level with the scroll cue; under
// the CTAs on phones) can fall below the fold on short laptops, with the
// taller light-theme title, or on small phones. So each candidate must sit
// on the first screen, below the nav, and clear of the copy and buttons:
//   wide screens — the CSS home, else lifted to the bottom of the screen
//                  (the right of the column is empty below the title)
//   phones       — centered in the gap between tagline and CTAs, else
//                  just above the CTAs, else just below them
// If the hero's own copy overflows the first screen and nothing fits, it
// falls back to the home spot (on phones, centered in the strip under the
// CTAs) and RefreshHint waits for that to be scrolled into view.
// Returns a hero-wrap-local top in px, or null to keep the CSS home.
function placeRefreshHint(el) {
  const wrap = el.offsetParent;
  if (!wrap) return null;
  const lift = el.style.transform;
  el.style.transform = 'none';                 // measure without the lift-in offset
  const me = el.getBoundingClientRect();
  el.style.transform = lift;
  const W = wrap.getBoundingClientRect();
  const nav = document.querySelector('.topbar');
  const minTop = Math.max(W.top, nav ? nav.getBoundingClientRect().bottom : 0) + 8;
  const maxBottom = Math.min(window.innerHeight, W.bottom) - 8;

  // Obstacles: tight per-line boxes for the copy, whole boxes for controls.
  const blocks = [];
  const add = (r) => { if (r.width > 1 && r.height > 1) blocks.push(r); };
  let subBottom = -Infinity;
  wrap.querySelectorAll('.hero-title, .hero-sub').forEach((n) => {
    const range = document.createRange();
    range.selectNodeContents(n);
    for (const r of range.getClientRects()) {
      add(r);
      if (n.classList.contains('hero-sub')) subBottom = Math.max(subBottom, r.bottom);
    }
  });
  const ctas = Array.from(wrap.querySelectorAll('.hero-actions .btn'), (n) => n.getBoundingClientRect());
  ctas.forEach(add);
  wrap.querySelectorAll('.hero-meta > *, .hero-scroll').forEach((n) => add(n.getBoundingClientRect()));

  const CLEAR = 10;
  const fits = (t) => t >= minTop && t + me.height <= maxBottom && !blocks.some((r) =>
    me.left < r.right + CLEAR && r.left - CLEAR < me.right &&
    t < r.bottom + CLEAR && r.top - CLEAR < t + me.height);

  const phone = window.matchMedia('(max-width: 640px)').matches && ctas.length > 0;
  const ctaTop = phone ? Math.min(...ctas.map((r) => r.top)) : 0;
  const ctaBottom = phone ? Math.max(...ctas.map((r) => r.bottom)) : 0;
  const tries = phone
    ? [(subBottom + ctaTop - me.height) / 2, ctaTop - 14 - me.height, ctaBottom + 12]
    : [me.top, maxBottom - me.height];
  for (const t of tries) {
    if (Number.isFinite(t) && fits(t)) return Math.abs(t - me.top) < 0.5 ? null : Math.round(t - W.top);
  }
  return phone ? Math.round((ctaBottom + W.bottom - me.height) / 2 - W.top) : null;
}

function RefreshHint() {
  const ref = useRef(null);
  const [phase, setPhase] = useState('wait'); // wait → on → off → done
  useEffect(() => {
    const timers = [];
    let io = null;
    const show = () => {
      setPhase('on');
      timers.push(setTimeout(() => setPhase('off'), HINT_HOLD));
      timers.push(setTimeout(() => setPhase('done'), HINT_HOLD + HINT_FADE));
    };
    const run = () => timers.push(setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      // Applied directly (not via state) so the observer below measures
      // the final spot, not the home one.
      const top = placeRefreshHint(el);
      if (top != null) { el.style.top = `${top}px`; el.style.bottom = 'auto'; }
      // Fade in once the spot is fully on screen: at once in practice; on
      // a layout with no room on the first screen, when it's scrolled in.
      io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.intersectionRatio >= 0.99)) { io.disconnect(); io = null; show(); }
      }, { threshold: 0.99 });
      io.observe(el);
    }, HINT_DELAY));
    const onVisible = () => {
      if (document.visibilityState === 'hidden') return;
      document.removeEventListener('visibilitychange', onVisible);
      run();
    };
    if (document.visibilityState === 'hidden') document.addEventListener('visibilitychange', onVisible);
    else run();
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      if (io) io.disconnect();
      timers.forEach(clearTimeout);
    };
  }, []);

  if (phase === 'done') return null;
  return (
    <div ref={ref} className={`refresh-hint${phase === 'on' ? ' on' : ''}`} aria-hidden="true">
      <svg className="refresh-hint-icon" viewBox="0 0 24 24" width="12" height="12" fill="none"
           stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 1 1-2.64-6.36L21 8" />
        <path d="M21 3v5h-5" />
      </svg>
      Refresh for a new background
    </div>
  );
}

export function Hero({ theme, data, heroMode, showRefreshHint }) {
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
      <HeroBackdrop mode={heroMode} />
      <div className="hero-wrap">
        <div className="hero-meta reveal">
          <div className="eyebrow">Available for the right problem</div>
          <GyroPrompt />
          <div className="hero-time">
            <span className="live-dot" /> SF · {sfTime}
          </div>
        </div>

        <h1 className="hero-title reveal">
          {theme === 'dark'
            ? <DarkHeroTitle split={false} />
            : <LightHeroTitle split={false} />}
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

        {showRefreshHint && <RefreshHint />}
      </div>
    </section>
  );
}

// ─── HeroBackdrop — swappable hero "experience" (see hero-modes.js) ───
// Renders one shared <canvas>; createHeroFX owns the active effect and
// swaps it whenever `mode` changes. Fully cleans up on unmount.
function HeroBackdrop({ mode }) {
  const hostRef = useRef(null);
  const fxRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const canvas = host.querySelector('canvas');
    fxRef.current = createHeroFX(host, canvas);
    fxRef.current.setMode(mode);
    return () => { if (fxRef.current) fxRef.current.destroy(); fxRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (fxRef.current) fxRef.current.setMode(mode);
  }, [mode]);

  return (
    <div ref={hostRef} className="hero-backdrop" aria-hidden="true">
      <canvas className="hero-topo" />
    </div>
  );
}

// Render a word's text as either a plain string or per-letter spans (the
// latter only while the magnetic hero mode is active). Keeping the split
// in React — rather than mutating the DOM from the FX layer — means React
// owns these nodes and won't clobber them on re-render.
function wordContent(text, split) {
  if (!split) return text;
  return [...text].map((ch, i) =>
    ch === ' '
      ? ' '
      : <span key={i} className="hero-letter">{ch}</span>
  );
}

function DarkHeroTitle({ split }) {
  return (
    <>
      <span className="hero-line">
        <span className="hero-word">{wordContent('Aakar', split)}</span>{' '}
        <span className="hero-word hero-word-accent">{wordContent('Kale', split)}</span>
      </span>
      <span className="hero-line hero-line-sub">
        <span className="hero-word-ghost">{wordContent('Senior Product Manager,', split)}</span>
        <br />
        <span className="hero-word-ghost">{wordContent('shipping with clarity.', split)}</span>
      </span>
    </>
  );
}

function LightHeroTitle({ split }) {
  return (
    <>
      <span className="hero-line hero-mag-title">{wordContent('Aakar Kale', split)}</span>
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
