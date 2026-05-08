// ====================================================================
// Main entry — mounts the app
// ====================================================================
import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';

import { AK_DATA } from './data.js';
import { useTheme, useReveal, CustomCursor, Topbar, Hero, Footer } from './chrome.jsx';
import { About, Work, Experience, Skills, TechReel, Contact } from './sections.jsx';
import './easter-eggs.js';  // side-effect: sets window.initEasterEggs

function App() {
  const [theme, toggleTheme] = useTheme();
  const [konami, setKonami] = useState(false);
  const [konamiToast, setKonamiToast] = useState(false);
  const [lpToast, setLpToast] = useState(false);
  const [logoHover, setLogoHover] = useState(false);
  const data = AK_DATA;

  useReveal();

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

  const handleLongPress = useCallback(() => {
    setLpToast(true);
    setTimeout(() => setLpToast(false), 2200);
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
        <Hero theme={theme} data={data} />
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
        Hi there 👋 · thanks for the squeeze
      </div>
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);
setTimeout(() => window.initEasterEggs && window.initEasterEggs(), 1200);
