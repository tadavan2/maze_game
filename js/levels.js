// levels.js — Level lifecycle: start, countdown, win, timer.

import { state } from './state.js';
import { updateGridSize, generateMaze, placeBoostPads, placeStars } from './maze.js';
import { playCountdownBeep, playWinSound } from './sound.js';
import { spawnParticles } from './renderer.js';
import { setWinCallback } from './player.js';
import { saveBestTime, addStars } from './profiles.js';

let msgEl, levelEl, timerEl, bestEl;

export function initUI() {
  msgEl = document.getElementById('message');
  levelEl = document.getElementById('level');
  timerEl = document.getElementById('timer');
  bestEl = document.getElementById('best');
}

function winLevel() {
  state.won = true;
  clearInterval(state.timerInterval);
  playWinSound();

  const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
  if (!state.bestTimes[state.level] || elapsed < state.bestTimes[state.level]) {
    state.bestTimes[state.level] = elapsed;
    bestEl.textContent = elapsed + 's';
  }
  // Save to localStorage
  saveBestTime(state.level, elapsed);
  // Save stars collected this level
  const starsThisLevel = state.stars.filter(s => s.collected).length;
  if (starsThisLevel > 0) addStars(starsThisLevel);

  state.checkeredFlag = true;
  state.checkeredFlagTime = Date.now();

  for (let i = 0; i < 5; i++) {
    setTimeout(() => {
      spawnParticles(
        Math.random() * state.canvas.width,
        Math.random() * state.canvas.height,
        ['#f5c518', '#e94560', '#00ff64', '#ff8c00', '#00b4ff'][i],
        20
      );
    }, i * 200);
  }

  msgEl.textContent = `Level ${state.level} complete in ${elapsed}s!`;

  state.autoAdvanceTimer = setTimeout(() => {
    state.autoAdvanceTimer = null;
    state.level++;
    levelEl.textContent = state.level;
    startLevel();
  }, 3000);
}

function runCountdown(callback) {
  state.countdown = 3;
  playCountdownBeep(false);
  state.countdownTimer = setInterval(() => {
    state.countdown--;
    if (state.countdown > 0) {
      playCountdownBeep(false);
    } else if (state.countdown === 0) {
      playCountdownBeep(true);
      setTimeout(() => {
        state.countdown = -1;
        callback();
      }, 500);
      clearInterval(state.countdownTimer);
    }
  }, 800);
}

export function startLevel() {
  state.won = false;
  state.paused = false;
  state.checkeredFlag = false;
  if (state.autoAdvanceTimer) {
    clearTimeout(state.autoAdvanceTimer);
    state.autoAdvanceTimer = null;
  }
  updateGridSize();
  state.player = { x: 0, y: 0, facing: 'right' };
  state.exit = { x: state.COLS - 1, y: state.ROWS - 1 };
  state.playerTrail = [];
  state.particles = [];
  state.floatingTexts = [];
  generateMaze();
  placeBoostPads();
  placeStars();

  if (state.bestTimes[state.level]) {
    bestEl.textContent = state.bestTimes[state.level] + 's';
  } else {
    bestEl.textContent = '--';
  }

  msgEl.textContent = state.level === 1 ? 'Get ready...' : `Level ${state.level} — bigger maze!`;

  runCountdown(() => {
    msgEl.textContent = 'GO GO GO!';
    state.startTime = Date.now();
    clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
      timerEl.textContent = Math.floor((Date.now() - state.startTime) / 1000) + 's';
    }, 500);
    setTimeout(() => { if (!state.won) msgEl.textContent = ''; }, 1500);
  });
}

// Register the win callback with player.js (avoids circular import)
setWinCallback(winLevel);
