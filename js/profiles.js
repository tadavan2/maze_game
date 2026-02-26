// profiles.js — Profile selection UI + localStorage persistence.

import { state } from './state.js';

const STORAGE_KEY = 'mazeracer_profiles';

const DEFAULT_PROFILES = {
  luella: {
    name: 'Luella',
    emoji: '\uD83E\uDD84',
    color: '#e94560',
    bestTimes: {},
    totalStars: 0,
    car: { color: '#e94560', stripe: 'center', decal: 'none' },
  },
  aden: {
    name: 'Aden',
    emoji: '\uD83E\uDD96',
    color: '#00b4ff',
    bestTimes: {},
    totalStars: 0,
    car: { color: '#00b4ff', stripe: 'center', decal: 'none' },
  },
};

export function loadAllProfiles() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // corrupted data — reset
  }
  return JSON.parse(JSON.stringify(DEFAULT_PROFILES));
}

export function saveAllProfiles(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadProfile(key) {
  const profiles = loadAllProfiles();
  const profile = profiles[key] || DEFAULT_PROFILES[key];
  // Migrate old saves that don't have car config
  if (!profile.car) {
    profile.car = { color: profile.color, stripe: 'center', decal: 'none' };
  }
  state.currentProfile = key;
  state.profileData = profile;
  state.bestTimes = profile.bestTimes || {};
  state.car = { ...profile.car };
  state.starCount = 0; // reset session star count (totalStars is cumulative)
  state.level = 1;
  return profile;
}

export function saveCarChoice(carConfig) {
  if (!state.currentProfile) return;
  const profiles = loadAllProfiles();
  const p = profiles[state.currentProfile];
  if (!p) return;
  p.car = { ...carConfig };
  state.car = { ...carConfig };
  state.profileData.car = { ...carConfig };
  saveAllProfiles(profiles);
}

export function saveBestTime(level, elapsed) {
  if (!state.currentProfile) return;
  const profiles = loadAllProfiles();
  const p = profiles[state.currentProfile];
  if (!p) return;
  if (!p.bestTimes[level] || elapsed < p.bestTimes[level]) {
    p.bestTimes[level] = elapsed;
    state.bestTimes[level] = elapsed;
  }
  saveAllProfiles(profiles);
}

export function addStars(count) {
  if (!state.currentProfile) return;
  const profiles = loadAllProfiles();
  const p = profiles[state.currentProfile];
  if (!p) return;
  p.totalStars = (p.totalStars || 0) + count;
  saveAllProfiles(profiles);
}

export function getHighestLevel(key) {
  const profiles = loadAllProfiles();
  const p = profiles[key];
  if (!p || !p.bestTimes) return 0;
  const levels = Object.keys(p.bestTimes).map(Number);
  return levels.length > 0 ? Math.max(...levels) : 0;
}

export function showProfileScreen(onSelect) {
  const profiles = loadAllProfiles();
  const screen = document.getElementById('profile-screen');
  const container = screen.querySelector('.profile-cards');

  // Populate stats
  Object.keys(DEFAULT_PROFILES).forEach(key => {
    const p = profiles[key] || DEFAULT_PROFILES[key];
    const card = container.querySelector(`[data-profile="${key}"]`);
    if (!card) return;
    const statsEl = card.querySelector('.profile-stats');
    const highest = getHighestLevel(key);
    const stars = p.totalStars || 0;
    if (highest > 0) {
      statsEl.textContent = `Best: Level ${highest} \u00B7 \u2B50 ${stars}`;
    } else {
      statsEl.textContent = 'New racer!';
    }
  });

  screen.classList.remove('hidden');
  document.getElementById('game-container').classList.add('hidden');

  // Click handlers
  const cards = container.querySelectorAll('.profile-card');
  cards.forEach(card => {
    const handler = () => {
      const key = card.dataset.profile;
      loadProfile(key);
      screen.classList.add('hidden');
      document.getElementById('game-container').classList.remove('hidden');
      // Update header with profile info
      const nameEl = document.getElementById('profile-name');
      if (nameEl) {
        nameEl.textContent = `${state.profileData.emoji} ${state.profileData.name}`;
      }
      cards.forEach(c => c.removeEventListener('click', handler));
      onSelect(key);
    };
    card.addEventListener('click', handler);
  });
}
