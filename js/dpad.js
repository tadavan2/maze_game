// dpad.js — Touch D-pad creation + touch event handling.
// Only shown on touch-capable devices.

import { state } from './state.js';
import { startMoveRepeat, stopMoveRepeat, getCurrentDir } from './input.js';
import { ensureAudio } from './sound.js';

let dpadEl = null;
const activeTouches = new Map(); // touchId -> dir

export function isTouchDevice() {
  return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
}

export function createDpad() {
  if (!isTouchDevice()) return;

  dpadEl = document.getElementById('dpad-container');
  if (!dpadEl) return;
  dpadEl.classList.remove('hidden');

  const buttons = dpadEl.querySelectorAll('.dpad-btn');
  buttons.forEach(btn => {
    btn.addEventListener('touchstart', onTouchStart, { passive: false });
    btn.addEventListener('touchend', onTouchEnd, { passive: false });
    btn.addEventListener('touchcancel', onTouchEnd, { passive: false });
  });

  // Prevent scrolling/zooming when touching the dpad area
  dpadEl.addEventListener('touchmove', (e) => {
    e.preventDefault();
  }, { passive: false });
}

export function removeDpad() {
  if (dpadEl) {
    dpadEl.classList.add('hidden');
  }
  activeTouches.clear();
}

function onTouchStart(e) {
  e.preventDefault();
  ensureAudio();

  const btn = e.currentTarget;
  const dir = btn.dataset.dir;
  if (!dir) return;

  // Track this touch
  for (const touch of e.changedTouches) {
    activeTouches.set(touch.identifier, dir);
  }

  btn.classList.add('active');
  state.keysDown[dir] = true;
  startMoveRepeat(dir);
}

function onTouchEnd(e) {
  e.preventDefault();

  for (const touch of e.changedTouches) {
    const dir = activeTouches.get(touch.identifier);
    if (dir) {
      activeTouches.delete(touch.identifier);

      // Only release this direction if no other touch is holding it
      let stillHeld = false;
      for (const [, d] of activeTouches) {
        if (d === dir) { stillHeld = true; break; }
      }
      if (!stillHeld) {
        delete state.keysDown[dir];
        const btn = dpadEl.querySelector(`[data-dir="${dir}"]`);
        if (btn) btn.classList.remove('active');
      }
    }
  }

  const nextDir = getCurrentDir();
  if (nextDir) {
    startMoveRepeat(nextDir);
  } else {
    stopMoveRepeat();
  }
}
