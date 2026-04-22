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
  const toggle = useCallback(() => setTheme(t => t === 'dark' ? 'light' : 'dark'), []);
  return [theme, toggle];
}

// ─── Intersection reveal hook ────────────────────────────────────────
export function useReveal() {
  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      const all = document.querySelectorAll('.reveal');
      if (!('IntersectionObserver' in window)) {
        all.forEach(e => e.classList.add('in'));
        return;
      }
      let i = 0;
      all.forEach((el) => {
        if (el.classList.contains('in')) return;
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 1.1 && r.bottom > -40) {
          setTimeout(() => el.classList.add('in'), i * 70);
          i++;
        }
      });
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.05, rootMargin: '0px 0px -30px 0px' });
      document.querySelectorAll('.reveal:not(.in)').forEach(el => io.observe(el));
    };
    const t1 = setTimeout(run, 50);
    const t2 = setTimeout(run, 500);
    return () => { cancelled = true; clearTimeout(t1); clearTimeout(t2); };
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
export function Topbar({ theme, onToggleTheme, onLogoLongPress }) {
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
        onMouseDown={startPress} onMouseUp={cancelPress} onMouseLeave={cancelPress}
        onTouchStart={startPress} onTouchEnd={cancelPress} onTouchCancel={cancelPress}
        aria-label="Toggle theme (long-press for a surprise)"
        title="Toggle theme · long-press for a surprise"
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

function DarkHeroTitle() {
  return (
    <>
      <span className="hero-line">
        <span className="hero-word">Aakar</span>{' '}
        <span className="hero-word hero-word-accent">Kale<span id="hero-dot" title="hover me...">.</span></span>
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
