// ====================================================================
// Main entry — mounts the app
// ====================================================================
import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';

import { AK_DATA } from './data.js';
import { useTheme, useReveal, CustomCursor, Topbar, Hero, Footer } from './chrome.jsx';
import { HERO_MODES, HERO_LABELS } from './hero-modes.js';
import { About, Work, Experience, Skills, TechReel, Contact } from './sections.jsx';
import { initMotion } from './motion.js';
import './easter-eggs.js';  // side-effect: sets window.initEasterEggs

function App() {
  const [theme, toggleTheme] = useTheme();
  const [konami, setKonami] = useState(false);
  const [konamiToast, setKonamiToast] = useState(false);
  const [lpToast, setLpToast] = useState('');
  const [logoHover, setLogoHover] = useState(false);
  // Hero "experience" cycled by long-pressing the AK. logo; persisted.
  const [heroMode, setHeroMode] = useState(() => {
    try {
      const v = localStorage.getItem('ak_hero_mode');
      return HERO_MODES.includes(v) ? v : 'topo';
    } catch (e) { return 'topo'; }
  });
  const heroModeRef = useRef(heroMode);
  const data = AK_DATA;

  useReveal();

  useEffect(() => {
    heroModeRef.current = heroMode;
    try { localStorage.setItem('ak_hero_mode', heroMode); } catch (e) {}
  }, [heroMode]);

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

  // Long-press the logo → advance to the next hero experience.
  const handleLongPress = useCallback(() => {
    const cur = heroModeRef.current;
    const next = HERO_MODES[(HERO_MODES.indexOf(cur) + 1) % HERO_MODES.length];
    setHeroMode(next);
    setLpToast(`Hero · ${HERO_LABELS[next]}`);
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
