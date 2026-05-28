// main.js — Entry point. Wires everything together.

import { state } from './state.js';
import { draw, updateParticles, updateFloatingTexts } from './renderer.js';
import { initKeyboard } from './input.js';
import { createDpad, isTouchDevice } from './dpad.js';
import { initUI, startLevel } from './levels.js';
import { showProfileScreen } from './profiles.js';
import { initMenu, showHomeScreen } from './menu.js';
import { ensureAudio } from './sound.js';

let gameRunning = false;

// --- Responsive canvas sizing ---
// Sets the backing store to CSS-size * devicePixelRatio so strokes/text are
// crisp on retina/iPad, then scales the context so all game code can keep
// drawing in logical CSS pixels. Game code must read state.canvasCssSize,
// never state.canvas.width (which is now in device pixels).
function resizeCanvas() {
  if (!state.canvas || !state.ctx) return; // safe to call before init

  const header = document.getElementById('header');
  const headerHeight = header ? header.offsetHeight : 60;
  const dpadHeight = isTouchDevice() ? 250 : 0;
  const padding = 20;

  const maxWidth = window.innerWidth - padding * 2;
  const maxHeight = window.innerHeight - headerHeight - dpadHeight - padding * 2;

  const size = Math.min(maxWidth, maxHeight);
  const clamped = Math.max(280, Math.min(size, 700));
  const dpr = window.devicePixelRatio || 1;

  state.canvasCssSize = clamped;
  state.canvas.width = Math.round(clamped * dpr);
  state.canvas.height = Math.round(clamped * dpr);
  state.canvas.style.width = clamped + 'px';
  state.canvas.style.height = clamped + 'px';

  // Setting canvas.width wipes the context state, so re-apply the transform
  // every resize. After this, drawing coordinates are in CSS pixels.
  state.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (state.COLS > 0) {
    state.CELL = clamped / state.COLS;
  }
}

// --- Game loop ---
function gameLoop() {
  // Single monotonic clock per frame — all purely visual animations read this
  // (not Date.now()) so every shape drawn in the same frame agrees on time.
  state.now = performance.now();

  // Skip update/draw when paused (menu/overlay) or when the tab is hidden.
  // The rAF itself is cheap, so we keep it ticking rather than wiring
  // kick/resume into every menu close path — less risk of a dead loop.
  if (!state.paused && !document.hidden) {
    updateParticles();
    updateFloatingTexts();
    draw();
  }
  requestAnimationFrame(gameLoop);
}

// --- iOS Web Audio unlock ---
// Safari on iOS refuses to play audio until an AudioContext is created or
// resumed inside a real user-gesture handler. Profile/home-screen taps need
// a one-shot unlock so the countdown beeps and win chime work on iPad.
function unlockAudioOnFirstGesture() {
  ensureAudio();
  window.removeEventListener('touchstart', unlockAudioOnFirstGesture);
  window.removeEventListener('mousedown', unlockAudioOnFirstGesture);
  window.removeEventListener('keydown', unlockAudioOnFirstGesture);
}

// --- Ensure game engine is ready (canvas, loop, input) ---
function ensureGameReady() {
  if (!state.canvas) {
    state.canvas = document.getElementById('game');
    state.ctx = state.canvas.getContext('2d');
  }
  resizeCanvas();
  initUI();

  if (!gameRunning) {
    initKeyboard();
    createDpad();
  }
}

// --- Launch into a level (called from home screen or after profile switch) ---
function launchGame() {
  ensureGameReady();

  document.getElementById('stars').textContent = state.starCount;
  document.getElementById('level').textContent = state.level;

  // startLevel MUST run before gameLoop so state is initialized for draw()
  startLevel();

  if (!gameRunning) {
    gameRunning = true;
    gameLoop();
  }
}

// --- Init ---
function init() {
  // Unlock audio on the very first user gesture, wherever it happens
  // (profile card tap, menu button click, or first keypress on desktop).
  window.addEventListener('touchstart', unlockAudioOnFirstGesture, { passive: true });
  window.addEventListener('mousedown', unlockAudioOnFirstGesture);
  window.addEventListener('keydown', unlockAudioOnFirstGesture);

  // Wire up the menu system (only once)
  initMenu(
    // startGameCallback — called when "Start Racing" or "Pick Level" from home
    launchGame,
    // onProfileSwitch — called when "Switch Player" from pause menu picks new profile
    () => {
      resizeCanvas();
      document.getElementById('stars').textContent = state.starCount;
      document.getElementById('level').textContent = state.level;
      startLevel();
    }
  );

  // Show profile picker → then home screen (not game directly)
  showProfileScreen((profileKey) => {
    ensureGameReady();
    showHomeScreen();
  });
}

// --- Resize handling ---
let resizeTimeout = null;
window.addEventListener('resize', () => {
  if (!state.canvas) return;
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    resizeCanvas();
  }, 150);
});
window.addEventListener('orientationchange', () => {
  if (!state.canvas) return;
  setTimeout(resizeCanvas, 200);
});

// --- Visibility change (pause timer when hidden) ---
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    hiddenAt = Date.now();
  } else if (hiddenAt > 0) {
    // Tab is visible again — offset startTime so hidden duration doesn't count
    const away = Date.now() - hiddenAt;
    if (state.startTime && !state.won && !state.paused && away > 500) {
      state.startTime += away;
    }
    hiddenAt = 0;
  }
});

// --- Start ---
init();
