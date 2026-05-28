// levels.js — Level lifecycle: start, countdown, win, timer.

import { state } from './state.js';
import { updateGridSize, generateMaze, addExtraPassages, pickStartAndExit, placeBoostPads, placeStars, placeRescues, placeOilSlicks, placeTrafficCones, placeSpeedTraps } from './maze.js';
import { playCountdownBeep, playWinSound } from './sound.js';
import { spawnParticles } from './renderer.js';
import { setWinCallback } from './player.js';
import { saveBestTime, addStars } from './profiles.js';
import { MODES } from './modes.js';
import { applyModeToUI } from './menu.js';

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

  const mode = MODES[state.currentMode];
  const elapsed = Math.floor((Date.now() - state.startTime) / 1000);

  // Best times are keyed by mode so Racer and Rescue don't trample each other.
  const bestKey = state.currentMode + ':' + state.level;
  if (!state.bestTimes[bestKey] || elapsed < state.bestTimes[bestKey]) {
    state.bestTimes[bestKey] = elapsed;
    bestEl.textContent = elapsed + 's';
  }
  saveBestTime(bestKey, elapsed);

  // Rescue mode doesn't have stars; only tally racer star pickups.
  if (mode.showStars) {
    const starsThisLevel = state.stars.filter(s => s.collected).length;
    if (starsThisLevel > 0) addStars(starsThisLevel);
  }

  state.checkeredFlag = true;
  state.checkeredFlagTime = Date.now();

  for (let i = 0; i < 5; i++) {
    setTimeout(() => {
      spawnParticles(
        Math.random() * state.canvasCssSize,
        Math.random() * state.canvasCssSize,
        ['#f5c518', '#e94560', '#00ff64', '#ff8c00', '#00b4ff'][i],
        20
      );
    }, i * 200);
  }

  msgEl.textContent = mode.winMessage(state.level, elapsed);

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
  state.spinOutUntil = 0;
  if (state.autoAdvanceTimer) {
    clearTimeout(state.autoAdvanceTimer);
    state.autoAdvanceTimer = null;
  }
  // Clear any running countdown from a previous level (prevents double countdowns)
  if (state.countdownTimer) {
    clearInterval(state.countdownTimer);
    state.countdownTimer = null;
  }
  clearInterval(state.timerInterval);
  updateGridSize();

  // Pick randomized start and exit positions
  const { start, exit } = pickStartAndExit();
  state.player = { x: start.x, y: start.y, facing: 'right' };
  state.exit = exit;

  state.playerTrail = [];
  state.particles = [];
  state.floatingTexts = [];
  state.oilSlicks = [];
  state.trafficCones = [];
  state.speedTraps = [];

  generateMaze();
  addExtraPassages();
  placeBoostPads();
  placeStars();
  placeRescues(); // no-op outside rescue mode

  // Place hazards (only populates if challenge mode AND mode allows hazards)
  placeOilSlicks();
  placeTrafficCones();
  placeSpeedTraps();

  const mode = MODES[state.currentMode];
  const bestKey = state.currentMode + ':' + state.level;
  if (state.bestTimes[bestKey]) {
    bestEl.textContent = state.bestTimes[bestKey] + 's';
  } else {
    bestEl.textContent = '--';
  }

  msgEl.textContent = mode.startMessage(state.level);
  // Refresh HUD label + counter after placements so "Rescued: 0/N" shows
  // correct totals for rescue mode.
  applyModeToUI();

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
