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
import './easter-eggs.js';  // side-effect: sets window.initEasterEggs

// Lightweight haptic tap on every press of an interactive control —
// theme toggle, nav links, hero CTAs, project cards, chips, etc. Uses
// the same Vibration API as useSectionHaptics, with the same platform
// behaviour: Android fires the haptic motor, iOS Safari no-ops (no
// public Taptic Engine binding on the web).
function useClickHaptics() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(pointer: fine)').matches) return;
    const SEL = 'button, a, .btn, .chip, .proj-card, .swipe-card, [data-cursor="on"]';
    const onTap = (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (!t.closest(SEL)) return;
      try { navigator.vibrate(8); } catch (err) {}
    };
    document.addEventListener('click', onTap, { passive: true });
    return () => document.removeEventListener('click', onTap);
  }, []);
}

// Subtle haptic tick on the visitor's first arrival into each main
// section while scrolling. Uses navigator.vibrate (Android Chrome /
// Firefox / Edge fire the device's haptic motor — typically Android's
// Advanced Haptics on newer hardware). iOS Safari does not expose the
// Taptic Engine to the web at all, so the call no-ops cleanly there.
// Desktop and reduced-motion visitors are skipped.
function useSectionHaptics() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(pointer: fine)').matches) return; // mobile only
    const ids = ['about', 'work', 'experience', 'skills', 'contact'];
    const seen = new Set();
    let lastAt = 0;
    // rootMargin shrinks the bottom half of the viewport — a section is
    // considered "appearing" the moment any pixel of it crosses into the
    // top half of the screen. Works equally well for short and tall
    // sections (Experience is ~3600px; a percentage threshold would
    // never trip cleanly on it).
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        if (seen.has(e.target.id)) continue;
        seen.add(e.target.id);
        // Throttle in case two sections enter back-to-back during a fast flick.
        const now = performance.now();
        if (now - lastAt < 250) continue;
        lastAt = now;
        try { navigator.vibrate(12); } catch (e) {}
      }
    }, { rootMargin: '0px 0px -50% 0px', threshold: 0 });
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
  // dots → topo → spotlight → magnetic → (repeat). Decided synchronously
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
