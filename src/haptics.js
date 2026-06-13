// ====================================================================
// Haptic vocabulary — one helper, one place.
//
// All vibration calls in the site go through buzz(kind). The kinds are
// designed to feel distinct rather than uniform: routine taps are short
// single pulses; rewards and section-lands are short patterns with a
// rhythm; ball thuds are tight and tightly throttled so a long roll
// doesn't continuously buzz.
//
// Two delivery backends, chosen once per device:
//
//   'vibrate' — navigator.vibrate (Android Chrome / Firefox / Edge,
//               typically the device's Advanced Haptics motor). Plays
//               the full per-kind pattern, fires from any context
//               (scroll, motion, timers, taps).
//
//   'switch'  — iOS Safari 17.4+ has no Vibration API, but toggling a
//               <input type="checkbox" switch> plays the system switch
//               haptic. We keep one hidden switch and click() it. Hard
//               limits, by Apple's design: a single fixed-strength tap
//               (the rhythm of a pattern is lost), and it only fires
//               while a user gesture is active — so it covers taps and
//               tap/gesture-triggered eggs, but NOT scroll-, motion- or
//               timer-driven kinds (section lands, ball thuds, the gyro
//               hero). Older iOS just toggles a hidden checkbox: no
//               haptic, no harm.
//
// Desktop (pointer: fine) and reduced-motion visitors get neither.
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

// 'vibrate' | 'switch' | 'none', decided once.
let backend = null;
function mode() {
  if (backend != null) return backend;
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return (backend = 'none');
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return (backend = 'none');
  // A fine pointer means a mouse, not a phone — desktops don't buzz.
  if (window.matchMedia && window.matchMedia('(pointer: fine)').matches) return (backend = 'none');
  if (typeof navigator.vibrate === 'function') return (backend = 'vibrate');
  // No Vibration API on a touch device → iOS. Try the switch trick.
  return (backend = 'switch');
}

// Lazily-built hidden <label><input type="checkbox" switch></label>.
// Programmatically clicking the label toggles the switch; that state
// change is what makes iOS 17.4+ play its switch haptic. It must stay
// rendered (off-screen + transparent, NOT display:none / visibility:
// hidden) or the control produces no feedback.
let switchLabel = null;
function fireSwitch() {
  if (!switchLabel) {
    if (typeof document === 'undefined' || !document.body) return;
    const label = document.createElement('label');
    label.className = 'ios-haptic-switch';
    label.setAttribute('aria-hidden', 'true');
    label.style.cssText =
      'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden;';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');     // iOS 17.4+ switch control
    input.tabIndex = -1;
    label.appendChild(input);
    document.body.appendChild(label);
    switchLabel = label;
  }
  // Synchronous click inside the caller's user-gesture handler. Bubbles
  // to document but matches no haptic selector, so it can't re-enter buzz.
  try { switchLabel.click(); } catch (e) {}
}

const last = Object.create(null);

export function buzz(kind) {
  const m = mode();
  if (m === 'none') return false;
  const pat = PAT[kind];
  if (pat == null) return false;
  const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  if (now - (last[kind] || 0) < (COOLDOWN[kind] || 60)) return false;
  last[kind] = now;
  if (m === 'vibrate') {
    try { navigator.vibrate(pat); return true; } catch (e) { return false; }
  }
  // 'switch' (iOS): one fixed-strength tap regardless of the pattern;
  // only actually fires when a user gesture is in flight.
  fireSwitch();
  return true;
}

// Side-effect: surface a global so non-module callers (easter-eggs.js
// runs as a side-effect IIFE; hero-modes.js is plain ESM but is loaded
// after main.jsx) can join the party without a circular import.
if (typeof window !== 'undefined') {
  window.__buzz = buzz;
}
