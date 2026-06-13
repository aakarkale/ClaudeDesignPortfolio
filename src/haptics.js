// ====================================================================
// Haptic vocabulary — one helper, one place.
//
// All vibration calls in the site go through buzz(kind). The kinds are
// designed to feel distinct rather than uniform: routine taps are short
// single pulses; rewards and section-lands are short patterns with a
// rhythm; ball thuds are tight and tightly throttled so a long roll
// doesn't continuously buzz.
//
// Platform reality: navigator.vibrate is implemented by Android Chrome
// / Firefox / Edge (typically the device's Advanced Haptics motor). iOS
// Safari does not expose the Taptic Engine to the web at all, so every
// call no-ops cleanly on iPhone — this is a platform/browser policy,
// not something the page can work around. (The iOS 17.4 switch-haptic
// trick was explored in commit 5ef6490 and reverted: Apple gates it
// behind real toggle of a visible switch, so the synthetic .click()
// approach does not fire on real devices.) Desktop and reduced-motion
// visitors are skipped via the (pointer: fine) and prefers-reduced-
// motion media queries.
//
// Cooldowns: per-kind so rapid-fire events (carousel snaps, ball
// bounces) don't merge into one long buzz, while one-shot rewards
// (egg, win, unlock) get a longer guard so accidental retriggers
// don't double-fire.
// ====================================================================

const PAT = {
  click:   24,                            // interactive tap — buttons, links, chips
  snap:    16,                            // detents — carousel snap, nav scroll-spy
  thud:    14,                            // labyrinth ball impacting a wall
  section: [14, 70, 26],                  // section lands in the middle band
  egg:     [18, 55, 26, 55, 36],          // easter egg discovery — 3-beat sting
  unlock:  [12, 75, 26],                  // long-press success
  win:     [22, 60, 28, 60, 44, 80, 70],  // labyrinth solved — rising celebration
};

const COOLDOWN = {
  click:    60,
  snap:     60,
  thud:     90,
  section: 250,
  egg:     800,
  unlock:  800,
  win:     800,
};

let supported = null;
function can() {
  if (supported != null) return supported;
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return (supported = false);
  if (typeof window === 'undefined') return (supported = false);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return (supported = false);
  // Mobile-only: a fine pointer means a mouse, not a phone.
  if (window.matchMedia('(pointer: fine)').matches) return (supported = false);
  return (supported = true);
}

const last = Object.create(null);

export function buzz(kind) {
  if (!can()) return false;
  const pat = PAT[kind];
  if (pat == null) return false;
  const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  if (now - (last[kind] || 0) < (COOLDOWN[kind] || 60)) return false;
  last[kind] = now;
  try { navigator.vibrate(pat); return true; } catch (e) { return false; }
}

// Side-effect: surface a global so non-module callers (easter-eggs.js
// runs as a side-effect IIFE; hero-modes.js is plain ESM but is loaded
// after main.jsx) can join the party without a circular import.
if (typeof window !== 'undefined') {
  window.__buzz = buzz;
}
