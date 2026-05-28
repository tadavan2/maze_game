// menu.js — Home screen, pause menu, level select, scoreboard, car picker.

import { state } from './state.js';
import { startLevel } from './levels.js';
import { stopMoveRepeat } from './input.js';
import { showProfileScreen, getHighestLevel, saveCarChoice, saveChallengeMode } from './profiles.js';
import { drawCarPreview, CAR_DECALS, CAR_COLORS } from './renderer.js';
import { MODES } from './modes.js';

// Call when the active mode changes. Keeps the HUD label + instruction text
// in sync so players always see the right objective wording.
export function applyModeToUI() {
  const mode = MODES[state.currentMode];
  const labelEl = document.getElementById('stars-label');
  if (labelEl) labelEl.textContent = mode.statLabel;
  const starsEl = document.getElementById('stars');
  if (starsEl) {
    starsEl.textContent = mode.showRescues
      ? `${state.rescuedCount}/${state.rescues.length || 0}`
      : state.starCount;
  }
  const instructionsEl = document.getElementById('instructions');
  if (instructionsEl) instructionsEl.textContent = mode.instructions;
}

const CAR_STRIPES = [
  { id: 'center', name: 'Racing' },
  { id: 'double', name: 'Double' },
  { id: 'none', name: 'Clean' },
];

// Temp car config for the picker (before saving)
let pickerCar = {};

// Tracks whether sub-screens were opened from 'home' or 'pause'
let menuContext = 'pause';

// Callback for when game should start (set by initMenu)
let onStartGame = null;

function hideAll() {
  document.getElementById('home-screen').classList.add('hidden');
  document.getElementById('menu-screen').classList.add('hidden');
  document.getElementById('level-screen').classList.add('hidden');
  document.getElementById('scoreboard-screen').classList.add('hidden');
  document.getElementById('car-screen').classList.add('hidden');
  document.getElementById('newprofile-screen').classList.add('hidden');
}

// Return to whichever parent screen we came from
function goBack() {
  hideAll();
  if (menuContext === 'home') {
    document.getElementById('home-screen').classList.remove('hidden');
  } else {
    document.getElementById('menu-screen').classList.remove('hidden');
  }
}

// --- Challenge Mode Toggle ---

function updateChallengeModeButtons() {
  const on = state.challengeMode;
  const label = on ? '\u2620\uFE0F Danger Mode: ON' : '\uD83D\uDE07 Danger Mode: OFF';
  const homeBtn = document.getElementById('home-challenge');
  const menuBtn = document.getElementById('menu-challenge');
  homeBtn.textContent = label;
  menuBtn.textContent = label;
  homeBtn.classList.toggle('danger-on', on);
  menuBtn.classList.toggle('danger-on', on);
}

function toggleChallengeMode() {
  state.challengeMode = !state.challengeMode;
  saveChallengeMode(state.challengeMode);
  updateChallengeModeButtons();
}

// --- Home Screen ---

export function showHomeScreen() {
  hideAll();
  menuContext = 'home';

  // Populate player info
  const emoji = (state.profileData && state.profileData.emoji) || '';
  const name = (state.profileData && state.profileData.name) || '';
  document.getElementById('home-emoji').textContent = emoji;
  document.getElementById('home-name').textContent = name;

  // Tint the Start Racing button with profile color
  const accentColor = (state.profileData && state.profileData.color) || '#e94560';
  const playBtn = document.getElementById('home-play');
  playBtn.style.borderColor = accentColor;
  playBtn.style.background = accentColor + '40';

  updateChallengeModeButtons();
  document.getElementById('home-screen').classList.remove('hidden');
}

function startFromHome() {
  startInMode('racer');
}

function startRescueFromHome() {
  startInMode('rescue');
}

function startInMode(modeId) {
  // Switching modes resets level progression — rescue and racer track their
  // own best times via mode:level keys, so a fresh start-from-1 is simplest.
  if (state.currentMode !== modeId) {
    state.currentMode = modeId;
    state.level = 1;
    const levelEl = document.getElementById('level');
    if (levelEl) levelEl.textContent = state.level;
  }
  applyModeToUI();
  hideAll();
  menuContext = 'pause';
  if (onStartGame) onStartGame();
}

// --- Open / Close Pause Menu ---

export function openMenu() {
  state.paused = true;
  state.pauseTime = Date.now();
  stopMoveRepeat();

  // Cancel auto-advance if we're in post-win state
  if (state.autoAdvanceTimer) {
    clearTimeout(state.autoAdvanceTimer);
    state.autoAdvanceTimer = null;
  }

  // Stop countdown if it's running (prevents it from ticking in the background)
  if (state.countdownTimer) {
    clearInterval(state.countdownTimer);
    state.countdownTimer = null;
  }

  menuContext = 'pause';
  hideAll();
  document.getElementById('menu-screen').classList.remove('hidden');
}

function closeMenu() {
  hideAll();
  // Adjust timer to account for pause duration
  if (state.pauseTime && state.startTime && !state.won) {
    state.startTime += (Date.now() - state.pauseTime);
  }
  state.paused = false;
  state.pauseTime = 0;
}

// --- Restart ---

function restartLevel() {
  closeMenu();
  startLevel();
}

// --- Level Select ---

function showLevelSelect() {
  hideAll();
  const grid = document.getElementById('level-grid');
  grid.innerHTML = '';

  const highest = getHighestLevel(state.currentProfile);
  const maxUnlocked = Math.max(highest + 1, state.level);
  const totalShow = Math.max(maxUnlocked + 2, 10); // show a few locked ones too

  const accentColor = (state.profileData && state.profileData.color) || '#e94560';

  for (let i = 1; i <= totalShow; i++) {
    const btn = document.createElement('button');
    btn.className = 'level-btn';
    btn.textContent = i;

    if (i <= maxUnlocked) {
      btn.classList.add('unlocked');
      btn.style.borderColor = accentColor;
      btn.style.background = accentColor + '30';
      if (i === state.level) {
        btn.classList.add('current');
      }
      btn.addEventListener('click', () => goToLevel(i));
    } else {
      btn.classList.add('locked');
      btn.textContent = '\uD83D\uDD12'; // lock emoji
    }

    grid.appendChild(btn);
  }

  document.getElementById('level-screen').classList.remove('hidden');
}

function goToLevel(n) {
  state.level = n;
  document.getElementById('level').textContent = n;

  if (menuContext === 'home') {
    // Coming from home screen — need to start the game
    hideAll();
    menuContext = 'pause';
    if (onStartGame) onStartGame();
  } else {
    // Coming from pause menu — just restart into the level
    closeMenu();
    startLevel();
  }
}

// --- Scoreboard ---

function showScoreboard() {
  hideAll();
  const list = document.getElementById('scoreboard-list');
  const summary = document.getElementById('scoreboard-summary');
  list.innerHTML = '';

  const accentColor = (state.profileData && state.profileData.color) || '#e94560';
  const bestTimes = state.bestTimes || {};
  const levels = Object.keys(bestTimes).map(Number).sort((a, b) => a - b);

  if (levels.length === 0) {
    list.innerHTML = '<p style="color:#666;text-align:center;padding:20px;">No times yet! Go race!</p>';
  } else {
    levels.forEach(lv => {
      const row = document.createElement('div');
      row.className = 'scoreboard-row';
      row.style.borderLeftColor = accentColor;

      const levelSpan = document.createElement('span');
      levelSpan.className = 'scoreboard-level';
      levelSpan.textContent = `Level ${lv}`;
      row.appendChild(levelSpan);

      const timeSpan = document.createElement('span');
      timeSpan.className = 'scoreboard-time';
      timeSpan.textContent = `${bestTimes[lv]}s`;
      row.appendChild(timeSpan);

      list.appendChild(row);
    });
  }

  const totalStars = (state.profileData && state.profileData.totalStars) || 0;
  const highestLv = levels.length > 0 ? Math.max(...levels) : 0;
  summary.textContent = `Total \u2B50 ${totalStars}  \u00B7  Best Level: ${highestLv || '--'}`;

  document.getElementById('scoreboard-screen').classList.remove('hidden');
}

// --- Car Picker ---

function showCarPicker() {
  hideAll();
  pickerCar = { ...state.car };

  // Build color swatches
  const swatchContainer = document.getElementById('color-swatches');
  swatchContainer.innerHTML = '';
  CAR_COLORS.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'color-swatch';
    btn.style.backgroundColor = c.hex;
    if (pickerCar.color === c.hex) btn.classList.add('selected');
    btn.addEventListener('click', () => {
      pickerCar.color = c.hex;
      swatchContainer.querySelectorAll('.color-swatch').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      updatePreview();
    });
    swatchContainer.appendChild(btn);
  });

  // Build stripe options
  const stripeContainer = document.getElementById('stripe-options');
  stripeContainer.innerHTML = '';
  CAR_STRIPES.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'stripe-btn';
    btn.textContent = s.name;
    if (pickerCar.stripe === s.id) btn.classList.add('selected');
    btn.addEventListener('click', () => {
      pickerCar.stripe = s.id;
      stripeContainer.querySelectorAll('.stripe-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      updatePreview();
    });
    stripeContainer.appendChild(btn);
  });

  // Build decal options
  const decalContainer = document.getElementById('decal-options');
  decalContainer.innerHTML = '';
  CAR_DECALS.forEach(d => {
    const btn = document.createElement('button');
    btn.className = 'decal-btn';
    btn.textContent = d.emoji || 'None';
    if (pickerCar.decal === d.id) btn.classList.add('selected');
    btn.addEventListener('click', () => {
      pickerCar.decal = d.id;
      decalContainer.querySelectorAll('.decal-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      updatePreview();
    });
    decalContainer.appendChild(btn);
  });

  updatePreview();
  document.getElementById('car-screen').classList.remove('hidden');
}

function updatePreview() {
  const previewCanvas = document.getElementById('car-preview');
  drawCarPreview(previewCanvas, pickerCar);
}

function saveAndCloseCar() {
  saveCarChoice(pickerCar);
  goBack();
}

// --- Switch Profile ---

function switchProfile(onProfilePicked) {
  hideAll();
  closeMenu();
  clearInterval(state.timerInterval);
  clearInterval(state.countdownTimer);
  state.won = true;
  state.countdown = -1;

  showProfileScreen((profileKey) => {
    state.won = false;
    document.getElementById('stars').textContent = state.starCount;
    document.getElementById('level').textContent = state.level;
    onProfilePicked();
  });
}

// --- Init (wire up all click handlers) ---

export function initMenu(startGameCallback, onProfileSwitch) {
  onStartGame = startGameCallback;

  // Home screen buttons
  document.getElementById('home-play').addEventListener('click', startFromHome);
  const rescueBtn = document.getElementById('home-rescue');
  if (rescueBtn) rescueBtn.addEventListener('click', startRescueFromHome);
  document.getElementById('home-levels').addEventListener('click', () => {
    menuContext = 'home';
    showLevelSelect();
  });
  document.getElementById('home-car').addEventListener('click', () => {
    menuContext = 'home';
    showCarPicker();
  });
  document.getElementById('home-scoreboard').addEventListener('click', () => {
    menuContext = 'home';
    showScoreboard();
  });
  document.getElementById('home-challenge').addEventListener('click', toggleChallengeMode);
  document.getElementById('home-switch').addEventListener('click', () => {
    hideAll();
    switchProfile(() => {
      // After switching profile, go back to home screen
      showHomeScreen();
    });
  });

  // Pause menu buttons
  document.getElementById('menu-btn').addEventListener('click', openMenu);
  document.getElementById('menu-resume').addEventListener('click', closeMenu);
  document.getElementById('menu-restart').addEventListener('click', restartLevel);
  document.getElementById('menu-levels').addEventListener('click', () => {
    menuContext = 'pause';
    showLevelSelect();
  });
  document.getElementById('menu-scoreboard').addEventListener('click', () => {
    menuContext = 'pause';
    showScoreboard();
  });
  document.getElementById('menu-car').addEventListener('click', () => {
    menuContext = 'pause';
    showCarPicker();
  });
  document.getElementById('menu-challenge').addEventListener('click', toggleChallengeMode);
  document.getElementById('menu-switch').addEventListener('click', () => switchProfile(onProfileSwitch));

  // Sub-screen back buttons (context-aware)
  document.getElementById('level-back').addEventListener('click', goBack);
  document.getElementById('scoreboard-back').addEventListener('click', goBack);
  document.getElementById('car-done').addEventListener('click', saveAndCloseCar);
}
