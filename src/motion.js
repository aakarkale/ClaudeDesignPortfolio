// ====================================================================
// Motion layer — GSAP + ScrollTrigger + Lenis choreography.
// Libraries are bundled (pinned npm versions — no runtime CDN), so the
// page renders without waiting on third-party scripts. When reduced
// motion is requested everything here bails and the existing .reveal
// IntersectionObserver system takes over untouched.
// ====================================================================
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

export function initMotion() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    // No animation will run — just lift the CSS pre-hide.
    document.documentElement.classList.remove('pre-intro');
    // Tell the magnetic hero mode the title is settled (it never animates).
    document.documentElement.dataset.heroIntro = 'done';
    return () => {};
  }

  gsap.registerPlugin(ScrollTrigger);
  const killers = [];

  // ── Lenis smooth scroll, driven by the GSAP ticker ──────────────────
  // Lenis takes over easing; native smooth would double-ease anchors.
  document.documentElement.style.scrollBehavior = 'auto';
  const lenis = new Lenis({ lerp: 0.2, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  const raf = (time) => lenis.raf(time * 1000);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);
  killers.push(() => { gsap.ticker.remove(raf); lenis.destroy(); });

  const onClick = (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { offset: -16, duration: 1.3, easing: (t) => 1 - Math.pow(1 - t, 4) });
  };
  document.addEventListener('click', onClick);
  killers.push(() => document.removeEventListener('click', onClick));

  // Take an element away from the .reveal observer: mark it revealed and
  // kill the CSS transition so GSAP's inline styles are the only driver.
  const own = (el) => {
    if (!el) return;
    el.classList.add('in');
    el.style.transition = 'none';
  };

  // ── Hero entrance ────────────────────────────────────────────────────
  const heroBits = ['.hero-meta', '.hero-title', '.hero-sub', '.hero-actions', '.hero-scroll']
    .map((s) => document.querySelector(s)).filter(Boolean);
  heroBits.forEach(own);

  const lines = gsap.utils.toArray('.hero-title .hero-line');
  const words = gsap.utils.toArray(
    '.hero-title .hero-word, .hero-title .hero-word-ghost, .hero-title .hero-mag-title, .hero-title .hero-mag-sub'
  );
  // Swap the .pre-intro CSS hide for an equivalent GSAP-owned yPercent.
  // The class must go FIRST: gsap.set parses the element's computed
  // transform as a px baseline, so reading it while the stylesheet's
  // translateY(130%) applies would bake a permanent px offset under the
  // yPercent tween. Both statements run in the same synchronous
  // pre-paint block (useLayoutEffect), so nothing can flash between.
  document.documentElement.classList.remove('pre-intro');
  if (words.length) gsap.set(words, { yPercent: 130 });

  const heroDot = document.querySelector('#hero-dot');
  if (heroDot) gsap.set(heroDot, { scale: 0, display: 'inline-block', transformOrigin: '50% 70%' });
  gsap.set('.hero-meta',         { autoAlpha: 0, y: -16 });
  gsap.set('.hero-sub',          { autoAlpha: 0, y: 22 });
  gsap.set('.hero-actions .btn', { autoAlpha: 0, y: 14, scale: 0.94 });
  gsap.set('.hero-scroll',       { autoAlpha: 0, y: -10 });

  const intro = gsap.timeline({
    defaults: { ease: 'power4.out' },
    onComplete: () => {
      lines.forEach((l) => { l.style.overflow = 'visible'; });
      // Title is settled — magnetic hero mode may now split it into letters.
      document.documentElement.dataset.heroIntro = 'done';
    },
  });
  if (words.length) intro.to(words, { yPercent: 0, duration: 1.1, stagger: 0.09 }, 0);
  if (heroDot) intro.to(heroDot, {
    scale: 1, ease: 'elastic.out(1, 0.45)', duration: 0.9,
  }, 0.42);
  intro
    .to('.hero-meta',  { autoAlpha: 1, y: 0, duration: 0.55 }, 0.18)
    .to('.hero-sub',   { autoAlpha: 1, y: 0, duration: 0.65 }, 0.32)
    .to('.hero-actions .btn', {
      autoAlpha: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.07, ease: 'back.out(1.6)',
    }, 0.46)
    .to('.hero-scroll', { autoAlpha: 1, y: 0, duration: 0.45 }, 0.7);
  killers.push(() => intro.kill());

  // Hero (copy + backdrop) drifts up and fades as you scroll into About.
  const heroDrift = gsap.to('.hero-wrap', {
    yPercent: -10, opacity: 0.2, ease: 'none',
    scrollTrigger: { trigger: '#home', start: 'top top', end: 'bottom 30%', scrub: true },
  });
  killers.push(() => heroDrift.scrollTrigger && heroDrift.scrollTrigger.kill());

  const backdropDrift = gsap.to('.hero-backdrop', {
    yPercent: -8, opacity: 0, ease: 'none',
    scrollTrigger: { trigger: '#home', start: 'top top', end: 'bottom 20%', scrub: true },
  });
  killers.push(() => backdropDrift.scrollTrigger && backdropDrift.scrollTrigger.kill());

  // ── Section heads slide in on scroll ─────────────────────────────────
  gsap.utils.toArray('.section-head').forEach((el) => {
    own(el);
    gsap.from(el, {
      y: 48, autoAlpha: 0, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });

  // ── Work grid: staggered entrance + pointer tilt ─────────────────────
  const tiltCard = (card) => {
    if (card.dataset.tilt) return;
    card.dataset.tilt = '1';
    const qx = gsap.quickTo(card, 'rotationX', { duration: 0.45, ease: 'power3.out' });
    const qy = gsap.quickTo(card, 'rotationY', { duration: 0.45, ease: 'power3.out' });
    // Card face counter-shifts against the rotation — fakes translateZ
    // depth (real preserve-3d is flattened by the card's overflow:hidden).
    const face = card.querySelector('.proj-face');
    const fx = face ? gsap.quickTo(face, 'x', { duration: 0.6, ease: 'power3.out' }) : null;
    const fy = face ? gsap.quickTo(face, 'y', { duration: 0.6, ease: 'power3.out' }) : null;
    card.addEventListener('pointerenter', () => {
      // Drop transform from the CSS transition so quickTo isn't double-eased.
      card.style.transition = 'border-color 300ms, box-shadow 300ms';
      gsap.set(card, { transformPerspective: 850 });
      gsap.to(card, { y: -8, scale: 1.02, duration: 0.4, ease: 'power3.out' });
    });
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      qy((px - 0.5) * 14);
      qx((0.5 - py) * 11);
      if (fx) fx((px - 0.5) * -10);
      if (fy) fy((py - 0.5) * -8);
      card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
      card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
    });
    card.addEventListener('pointerleave', () => {
      gsap.to(card, {
        rotationX: 0, rotationY: 0, y: 0, scale: 1, duration: 0.7, ease: 'elastic.out(1, 0.55)',
        onComplete: () => { card.style.transition = ''; gsap.set(card, { clearProps: 'transform' }); },
      });
      if (face) gsap.to(face, {
        x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.55)',
        onComplete: () => gsap.set(face, { clearProps: 'transform' }),
      });
    });
  };

  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const setupGrid = (animateIn) => {
    const grid = document.querySelector('.work-grid');
    if (!grid) return;
    own(grid);
    const cards = gsap.utils.toArray(grid.querySelectorAll('.proj-card'));
    if (animateIn && cards.length) {
      gsap.set(cards, { autoAlpha: 0, y: 64, rotateX: 6, transformPerspective: 900, transformOrigin: '50% 100%' });
      ScrollTrigger.batch(cards, {
        start: 'top 92%',
        once: true,
        onEnter: (batch) => gsap.to(batch, {
          autoAlpha: 1, y: 0, rotateX: 0, duration: 0.9, stagger: 0.1, ease: 'power3.out',
          clearProps: 'transform,opacity,visibility',
        }),
      });
    }
    if (finePointer) cards.forEach(tiltCard);
  };
  setupGrid(true);

  // Re-attach tilt when the grid remounts after a breakpoint swap
  // (entrance is skipped — mid-page pop-in would look broken).
  const bp = window.matchMedia('(max-width: 768px)');
  const onBp = () => setTimeout(() => setupGrid(false), 120);
  bp.addEventListener('change', onBp);
  killers.push(() => bp.removeEventListener('change', onBp));

  // ── Stats count up when scrolled into view ───────────────────────────
  // The Stat component already counts on mouseenter; fire it via a
  // synthetic event so React's handler does the work.
  const stats = gsap.utils.toArray('.about-stats-grid .stat');
  if (stats.length) {
    ScrollTrigger.create({
      trigger: '.about-stats-grid', start: 'top 85%', once: true,
      onEnter: () => stats.forEach((el, i) => {
        setTimeout(() => el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })), i * 140);
      }),
    });
  }

  killers.push(() => ScrollTrigger.getAll().forEach((st) => st.kill()));
  return () => killers.forEach((k) => k());
}
