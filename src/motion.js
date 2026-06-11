// ====================================================================
// Motion layer — GSAP + ScrollTrigger + Lenis choreography.
// Libraries are loaded from CDN in index.html; everything here bails
// gracefully when they're missing or reduced motion is requested, in
// which case the existing .reveal IntersectionObserver system takes
// over untouched.
// ====================================================================

export function initMotion() {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!gsap || !ScrollTrigger || reduced) return () => {};

  gsap.registerPlugin(ScrollTrigger);
  const killers = [];

  // ── Lenis smooth scroll, driven by the GSAP ticker ──────────────────
  let lenis = null;
  if (window.Lenis) {
    // Lenis takes over easing; native smooth would double-ease anchors.
    document.documentElement.style.scrollBehavior = 'auto';
    lenis = new window.Lenis({ lerp: 0.12, smoothWheel: true });
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
  }

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
  const intro = gsap.timeline({
    defaults: { ease: 'power4.out' },
    onComplete: () => lines.forEach((l) => { l.style.overflow = ''; }),
  });
  if (words.length) {
    lines.forEach((l) => { l.style.overflow = 'hidden'; });
    gsap.set(words, { display: 'inline-block' });
    intro.from(words, { yPercent: 130, duration: 1.1, stagger: 0.09 }, 0.1);
  }
  const heroDot = document.querySelector('#hero-dot');
  if (heroDot) {
    intro.from(heroDot, {
      scale: 0, display: 'inline-block', transformOrigin: '50% 70%',
      ease: 'elastic.out(1, 0.45)', duration: 1.1,
    }, 0.85);
  }
  intro
    .from('.hero-meta',  { y: -18, autoAlpha: 0, duration: 0.8 }, 0.45)
    .from('.hero-sub',   { y: 26,  autoAlpha: 0, duration: 0.9 }, 0.6)
    .from('.hero-actions .btn', {
      y: 18, autoAlpha: 0, scale: 0.94, duration: 0.7, stagger: 0.1, ease: 'back.out(1.7)',
    }, 0.75)
    .from('.hero-scroll', { autoAlpha: 0, y: -12, duration: 0.6 }, 1.05);
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
    const qx = gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power3.out' });
    const qy = gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power3.out' });
    card.addEventListener('pointerenter', () => {
      // Drop transform from the CSS transition so quickTo isn't double-eased.
      card.style.transition = 'border-color 300ms, box-shadow 300ms';
      gsap.set(card, { transformPerspective: 900 });
      gsap.to(card, { y: -6, scale: 1.015, duration: 0.4, ease: 'power3.out' });
    });
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      qy((px - 0.5) * 10);
      qx((0.5 - py) * 8);
      card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
      card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
    });
    card.addEventListener('pointerleave', () => {
      gsap.to(card, {
        rotationX: 0, rotationY: 0, y: 0, scale: 1, duration: 0.7, ease: 'elastic.out(1, 0.55)',
        onComplete: () => { card.style.transition = ''; gsap.set(card, { clearProps: 'transform' }); },
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
