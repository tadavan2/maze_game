// main.js — Entry point. Wires everything together.

import { state } from './state.js';
import { draw, updateParticles, updateFloatingTexts } from './renderer.js';
import { initKeyboard, stopMoveRepeat } from './input.js';
import { createDpad, isTouchDevice } from './dpad.js';
import { initUI, startLevel } from './levels.js';
import { showProfileScreen } from './profiles.js';

let gameRunning = false;

// --- Responsive canvas sizing ---
function resizeCanvas() {
  const header = document.getElementById('header');
  const headerHeight = header ? header.offsetHeight : 60;
  const dpadHeight = isTouchDevice() ? 250 : 0;
  const padding = 20;

  const maxWidth = window.innerWidth - padding * 2;
  const maxHeight = window.innerHeight - headerHeight - dpadHeight - padding * 2;

  const size = Math.min(maxWidth, maxHeight);
  const clamped = Math.max(280, Math.min(size, 700));

  state.canvas.width = clamped;
  state.canvas.height = clamped;
  state.canvas.style.width = clamped + 'px';
  state.canvas.style.height = clamped + 'px';

  if (state.COLS > 0) {
    state.CELL = clamped / state.COLS;
  }
}

// --- Game loop ---
function gameLoop() {
  updateParticles();
  updateFloatingTexts();
  draw();
  requestAnimationFrame(gameLoop);
}

// --- Start/restart game for a profile ---
function startGame() {
  state.canvas = document.getElementById('game');
  state.ctx = state.canvas.getContext('2d');

  resizeCanvas();
  initUI();

  if (!gameRunning) {
    initKeyboard();
    createDpad();
  }

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
  showProfileScreen((profileKey) => {
    startGame();
  });

  // Switch profile button
  document.getElementById('switch-profile').addEventListener('click', () => {
    // Stop current game
    clearInterval(state.timerInterval);
    clearInterval(state.countdownTimer);
    stopMoveRepeat();
    state.won = true; // prevent movement
    state.countdown = -1;

    showProfileScreen((profileKey) => {
      state.won = false;
      resizeCanvas();
      document.getElementById('stars').textContent = state.starCount;
      document.getElementById('level').textContent = state.level;
      startLevel();
    });
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
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.timerInterval) {
    // Pause: we don't clear the timer, but we note the pause time
    // Simple approach: just let it run, the timer reads Date.now() on each tick
    // so it stays accurate even if backgrounded
  }
});

// --- Start ---
init();
