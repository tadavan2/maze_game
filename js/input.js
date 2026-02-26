// input.js — Keyboard handlers + key-repeat system.
// Also exports movement functions for D-pad to use.

import { state } from './state.js';
import { movePlayer } from './player.js';
import { ensureAudio } from './sound.js';

const MOVE_INITIAL_DELAY = 150;
const MOVE_REPEAT_RATE = 90;

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
  state.moveRepeatCount = 0;
  movePlayer(dir);
  state.moveRepeatTimer = setTimeout(function repeatMove() {
    const currentDir = getCurrentDir();
    if (!currentDir) { stopMoveRepeat(); return; }
    state.moveRepeatCount++;
    movePlayer(currentDir);
    const rate = Math.max(45, MOVE_REPEAT_RATE - state.moveRepeatCount * 8);
    state.moveRepeatTimer = setTimeout(repeatMove, rate);
  }, MOVE_INITIAL_DELAY);
}

export function stopMoveRepeat() {
  if (state.moveRepeatTimer) {
    clearTimeout(state.moveRepeatTimer);
    state.moveRepeatTimer = null;
  }
  state.moveRepeatCount = 0;
}

export function initKeyboard() {
  document.addEventListener('keydown', (e) => {
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
