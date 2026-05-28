// input.js — Keyboard handlers + key-repeat system.
// Also exports movement functions for D-pad to use.

import { state } from './state.js';
import { movePlayer } from './player.js';
import { ensureAudio } from './sound.js';
import { openMenu } from './menu.js';

const MOVE_INITIAL_DELAY = 150;
const MOVE_REPEAT_RATE = 90;

// Monotonic token incremented on every start/stop. A scheduled repeatMove
// checks this against its captured value and bails if a newer startMoveRepeat
// superseded it, so no zombie callback can schedule its own follow-up timer.
let repeatToken = 0;

function keyToDir(key) {
  switch (key) {
    case 'ArrowUp': case 'w': case 'W': return 'up';
    case 'ArrowDown': case 's': case 'S': return 'down';
    case 'ArrowLeft': case 'a': case 'A': return 'left';
    case 'ArrowRight': case 'd': case 'D': return 'right';
  }
  return null;
}

export function getCurrentDir() {
  if (state.keysDown['up']) return 'up';
  if (state.keysDown['down']) return 'down';
  if (state.keysDown['left']) return 'left';
  if (state.keysDown['right']) return 'right';
  return null;
}

export function startMoveRepeat(dir) {
  stopMoveRepeat();
  const myToken = ++repeatToken;
  state.moveRepeatCount = 0;
  movePlayer(dir);
  state.moveRepeatTimer = setTimeout(function repeatMove() {
    if (myToken !== repeatToken) return; // superseded by a newer start/stop
    const currentDir = getCurrentDir();
    if (!currentDir) { stopMoveRepeat(); return; }
    state.moveRepeatCount++;
    movePlayer(currentDir);
    const rate = Math.max(45, MOVE_REPEAT_RATE - state.moveRepeatCount * 8);
    state.moveRepeatTimer = setTimeout(repeatMove, rate);
  }, MOVE_INITIAL_DELAY);
}

export function stopMoveRepeat() {
  repeatToken++;
  if (state.moveRepeatTimer) {
    clearTimeout(state.moveRepeatTimer);
    state.moveRepeatTimer = null;
  }
  state.moveRepeatCount = 0;
}

export function initKeyboard() {
  document.addEventListener('keydown', (e) => {
    // Escape opens pause menu (desktop shortcut)
    if (e.key === 'Escape') {
      e.preventDefault();
      if (!state.paused && !state.won) openMenu();
      return;
    }
    const dir = keyToDir(e.key);
    if (!dir) return;
    e.preventDefault();
    ensureAudio();
    if (state.keysDown[dir]) return;
    state.keysDown[dir] = true;
    startMoveRepeat(dir);
  });

  document.addEventListener('keyup', (e) => {
    const dir = keyToDir(e.key);
    if (!dir) return;
    delete state.keysDown[dir];
    const nextDir = getCurrentDir();
    if (nextDir) {
      startMoveRepeat(nextDir);
    } else {
      stopMoveRepeat();
    }
  });

  window.addEventListener('blur', () => {
    Object.keys(state.keysDown).forEach(k => delete state.keysDown[k]);
    stopMoveRepeat();
  });
}
