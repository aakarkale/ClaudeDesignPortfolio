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

// ─── HeroLoader — intro loader: 0 → 100% sweep, then reveals hero ────
export function HeroLoader({ onDone }) {
  const [pct, setPct] = useState(0);
  const [exiting, setExiting] = useState(false);
  const rafRef = useRef(0);
  const skippedRef = useRef(false);

  useEffect(() => {
    const DURATION = 2200;
    const HOLD = 280;
    const EXIT = 760;
    const start = performance.now();

    const finish = () => {
      setExiting(true);
      setTimeout(() => onDone(), EXIT);
    };

    const tick = (now) => {
      if (skippedRef.current) return;
      const t = Math.min(1, (now - start) / DURATION);
      // ease-out-quart: fast then luxuriously decelerates to 100
      const eased = 1 - Math.pow(1 - t, 4);
      setPct(Math.round(eased * 100));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else setTimeout(finish, HOLD);
    };
    rafRef.current = requestAnimationFrame(tick);

    const skip = () => {
      if (skippedRef.current) return;
      skippedRef.current = true;
      cancelAnimationFrame(rafRef.current);
      setPct(100);
      finish();
    };
    document.addEventListener('keydown', skip);
    document.addEventListener('pointerdown', skip);
    // Don't let the page scroll while the loader is up
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      cancelAnimationFrame(rafRef.current);
      document.removeEventListener('keydown', skip);
      document.removeEventListener('pointerdown', skip);
      document.body.style.overflow = prev;
    };
  }, [onDone]);

  return (
    <div className={`hero-loader ${exiting ? 'exit' : ''}`} role="status" aria-label="Loading">
      <div className="hero-loader-tl">
        <span className="hero-loader-sig">Aakar Kale</span>
        <sup className="hero-loader-mark">®</sup>
      </div>
      <div className="hero-loader-br">Portfolio — Vol. 01</div>
      <div className="hero-loader-counter">
        <span className="hero-loader-num">{pct}</span>
        <span className="hero-loader-pct">%</span>
      </div>
      <div className="hero-loader-bar" style={{ transform: `scaleX(${pct / 100})` }} />
    </div>
  );
}

function HeroBackdrop() {
  // 8-pointed starburst evoking the Fable 5 set: two long primary rays
  // (vertical + horizontal) and two shorter diagonals. Slow rotation +
  // breathing glow live in CSS so the SVG itself stays static markup.
  const longRay  = 'M 0 -100 Q 3 -40 5 0 Q 3 40 0 100 Q -3 40 -5 0 Q -3 -40 0 -100 Z';
  const shortRay = 'M 0 -62 Q 2 -25 3 0 Q 2 25 0 62 Q -2 25 -3 0 Q -2 -25 0 -62 Z';
  return (
    <div className="hero-backdrop" aria-hidden="true">
      <div className="hero-backdrop-glow" />
      <svg className="hero-burst" viewBox="-110 -110 220 220" xmlns="http://www.w3.org/2000/svg">
        <g className="hero-burst-rays">
          <path d={longRay} />
          <path d={longRay}  transform="rotate(90)" />
          <path d={shortRay} transform="rotate(45)" />
          <path d={shortRay} transform="rotate(135)" />
        </g>
      </svg>
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
