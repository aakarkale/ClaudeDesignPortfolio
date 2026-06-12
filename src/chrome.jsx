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
    if (sessionStorage.getItem('ak_motion_asked') === '1') return;
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
export function Hero({ theme, data, heroMode }) {
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
            ? <DarkHeroTitle split={heroMode === 'magnetic'} />
            : <LightHeroTitle split={heroMode === 'magnetic'} />}
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
        <span className="hero-word hero-word-accent">{wordContent('Kale', split)}<span id="hero-dot">.</span></span>
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
