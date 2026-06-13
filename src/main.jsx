// ====================================================================
// Main entry — mounts the app
// ====================================================================
import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';

import { AK_DATA } from './data.js';
import { useTheme, useReveal, CustomCursor, Topbar, Hero, Footer } from './chrome.jsx';
import { HERO_MODES } from './hero-modes.js';
import { About, Work, Experience, Skills, TechReel, Contact } from './sections.jsx';
import { initMotion } from './motion.js';
import { buzz } from './haptics.js';
import './easter-eggs.js';  // side-effect: sets window.initEasterEggs

// Lightweight haptic tap on every press of an interactive control —
// theme toggle, nav links, hero CTAs, project cards, chips, etc. Routes
// through buzz('click') in haptics.js, which handles the platform gates
// (Android Chrome/Firefox/Edge only — iOS Safari has no Vibration API).
function useClickHaptics() {
  useEffect(() => {
    const SEL = 'button, a, .btn, .chip, .proj-card, .wc-card, [data-cursor="on"]';
    const onTap = (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (!t.closest(SEL)) return;
      buzz('click');
    };
    document.addEventListener('click', onTap, { passive: true });
    return () => document.removeEventListener('click', onTap);
  }, []);
}

// Distinct three-pulse haptic each time the visitor lands in a new main
// section while scrolling — in either direction. The middle-band IO
// (rootMargin shrinks the root to a 10%-tall slice around the viewport
// midline) treats "currently active" as whichever observed section
// occupies that band; transitioning between sections fires buzz once,
// scrolling within a single section fires nothing. Symmetric for
// scroll-up vs scroll-down — the old "seen-once Set" only fired the
// first time, this re-fires on every land. Per-kind cooldown in
// haptics.js (250ms) absorbs any boundary oscillation.
function useSectionHaptics() {
  useEffect(() => {
    const ids = ['about', 'work', 'experience', 'skills', 'contact'];
    let activeId = null;
    const io = new IntersectionObserver((entries) => {
      let best = null;
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        if (!best || e.intersectionRatio > best.intersectionRatio) best = e;
      }
      if (!best) return;
      const id = best.target.id;
      if (id !== activeId) { activeId = id; buzz('section'); }
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
    ids.forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);
}

function App() {
  const [theme, toggleTheme] = useTheme();
  const [konami, setKonami] = useState(false);
  const [konamiToast, setKonamiToast] = useState(false);
  const [lpToast, setLpToast] = useState('');
  const [logoHover, setLogoHover] = useState(false);
  // Hero "experience" advances one step on every page load:
  // labyrinth → dots → topo → spotlight → magnetic → (repeat). Decided synchronously
  // in the initializer so the right mode mounts on the first render —
  // no flicker, no double init. Stale/unknown stored values (e.g. the
  // removed 'aurora') resolve to index -1 and wrap to the first mode.
  const [heroMode] = useState(() => {
    try {
      const prev = localStorage.getItem('ak_hero_mode');
      // Magnetic is dropped from the mobile rotation — without a real
      // cursor it never gets to feel as kinetic as it does on desktop,
      // and the other three look better on a small screen.
      const isMobile = window.matchMedia('(pointer: coarse)').matches;
      const cycle = isMobile ? HERO_MODES.filter(m => m !== 'magnetic') : HERO_MODES;
      const next = cycle[(cycle.indexOf(prev) + 1) % cycle.length];
      localStorage.setItem('ak_hero_mode', next);
      return next;
    } catch (e) { return HERO_MODES[0]; }
  });
  const data = AK_DATA;

  useReveal();
  useSectionHaptics();
  useClickHaptics();

  // useLayoutEffect so GSAP stamps the hero entrance's initial state
  // before the browser's first paint — avoids the rest-position flash
  // that useEffect (post-paint) would let through.
  useLayoutEffect(() => initMotion(), []);

  useEffect(() => {
    const seq = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
    let i = 0;
    const onKey = (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === seq[i]) {
        i++;
        if (i === seq.length) {
          i = 0;
          setKonami(true);
          setKonamiToast(true);
          buzz('egg');
          document.body.classList.add('konami-pulse');
          setTimeout(() => document.body.classList.remove('konami-pulse'), 900);
          setTimeout(() => setKonamiToast(false), 2800);
        }
      } else {
        i = (k === seq[0]) ? 1 : 0;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Long-press the logo → just the friendly easter-egg toast. (Hero
  // experiences now cycle on every page refresh, not via this gesture.)
  const handleLongPress = useCallback(() => {
    setLpToast('Hi there 👋 · thanks for the squeeze');
    buzz('unlock');
    setTimeout(() => setLpToast(''), 2200);
  }, []);

  const projectList = konami
    ? [data.secretProject, ...data.projects]
    : data.projects;

  return (
    <>
      <CustomCursor theme={theme} />
      <div className={`logo-glow ${logoHover ? 'on' : ''}`} aria-hidden="true" />
      <Topbar
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogoLongPress={handleLongPress}
        onLogoHoverChange={setLogoHover}
      />
      <main>
        <Hero theme={theme} data={data} heroMode={heroMode} />
        <About data={data} />
        <Work data={data} projects={projectList} unlocked={konami} />
        <Experience data={data} />
        <Skills data={data} />
        <TechReel data={data} />
        <Contact data={data} />
      </main>
      <Footer data={data} />

      <div className={`konami-toast ${konamiToast ? 'on' : ''}`}>
        ↑↑↓↓←→←→BA · Secret Project Unlocked
      </div>
      <div className={`lp-toast ${lpToast ? 'on' : ''}`}>
        {lpToast || 'Hi there 👋'}
      </div>
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);
setTimeout(() => window.initEasterEggs && window.initEasterEggs(), 1200);
