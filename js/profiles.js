// profiles.js — Profile selection UI + localStorage persistence.

import { state } from './state.js';
import { CAR_COLORS } from './renderer.js';

const STORAGE_KEY = 'mazeracer_profiles';

const DEFAULT_PROFILES = {
  luella: {
    name: 'Luella',
    emoji: '\uD83E\uDD84',
    color: '#e94560',
    bestTimes: {},
    totalStars: 0,
    car: { color: '#e94560', stripe: 'center', decal: 'none' },
    isDefault: true,
  },
  aden: {
    name: 'Aden',
    emoji: '\uD83E\uDD96',
    color: '#00b4ff',
    bestTimes: {},
    totalStars: 0,
    car: { color: '#00b4ff', stripe: 'center', decal: 'none' },
    isDefault: true,
  },
};

const PROFILE_EMOJIS = [
  '\uD83E\uDD84', '\uD83E\uDD96', '\uD83D\uDC31', '\uD83D\uDC36',
  '\uD83E\uDD8A', '\uD83D\uDC3B', '\uD83D\uDC3C', '\uD83D\uDC38',
  '\uD83E\uDD8B', '\uD83D\uDC22', '\uD83E\uDD88', '\uD83D\uDC19',
  '\uD83E\uDD81', '\uD83D\uDC2F', '\uD83D\uDC32', '\uD83E\uDD87',
  '\uD83D\uDE80', '\u2B50', '\uD83C\uDF08', '\uD83C\uDFAE',
  '\uD83D\uDC7E', '\uD83E\uDD16', '\uD83D\uDC7D', '\uD83C\uDFAF',
];

export function loadAllProfiles() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const profiles = JSON.parse(raw);
      // Migrate old profiles: add isDefault flag
      if (profiles.luella && profiles.luella.isDefault === undefined) profiles.luella.isDefault = true;
      if (profiles.aden && profiles.aden.isDefault === undefined) profiles.aden.isDefault = true;
      return profiles;
    }
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
  state.challengeMode = profile.challengeMode || false;
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

export function saveChallengeMode(enabled) {
  if (!state.currentProfile) return;
  const profiles = loadAllProfiles();
  const p = profiles[state.currentProfile];
  if (!p) return;
  p.challengeMode = enabled;
  saveAllProfiles(profiles);
}

export function getHighestLevel(key) {
  const profiles = loadAllProfiles();
  const p = profiles[key];
  if (!p || !p.bestTimes) return 0;
  const levels = Object.keys(p.bestTimes).map(Number);
  return levels.length > 0 ? Math.max(...levels) : 0;
}

function createProfile(name, emoji, color) {
  const profiles = loadAllProfiles();
  const key = 'custom_' + Date.now();
  profiles[key] = {
    name: name.trim(),
    emoji,
    color,
    bestTimes: {},
    totalStars: 0,
    car: { color, stripe: 'center', decal: 'none' },
    isDefault: false,
  };
  saveAllProfiles(profiles);
  return key;
}

function editProfile(key, name, emoji, color) {
  const profiles = loadAllProfiles();
  const p = profiles[key];
  if (!p) return;
  p.name = name.trim();
  p.emoji = emoji;
  p.color = color;
  // Also update car color to match new profile color
  if (p.car) p.car.color = color;
  saveAllProfiles(profiles);
  // Update live state if this is the active profile
  if (state.currentProfile === key) {
    state.profileData.name = p.name;
    state.profileData.emoji = p.emoji;
    state.profileData.color = p.color;
    if (state.car) state.car.color = color;
  }
}

function deleteProfile(key) {
  const profiles = loadAllProfiles();
  if (profiles[key] && !profiles[key].isDefault) {
    delete profiles[key];
    saveAllProfiles(profiles);
  }
}

// Track active editor handlers so we can clean up stale ones
let _editorCleanup = null;

function showProfileEditor(onSelect, editKey) {
  // Clean up any stale handlers from a previous editor session
  if (_editorCleanup) {
    _editorCleanup();
    _editorCleanup = null;
  }

  document.getElementById('profile-screen').classList.add('hidden');
  const screen = document.getElementById('newprofile-screen');
  const titleEl = document.getElementById('newprofile-title');

  // If editing, load existing profile data
  const isEditing = !!editKey;
  let existingProfile = null;
  if (isEditing) {
    const profiles = loadAllProfiles();
    existingProfile = profiles[editKey];
  }

  titleEl.textContent = isEditing ? '\uD83D\uDD27 Edit Racer' : '\uD83C\uDFCE\uFE0F New Racer';

  let selectedEmoji = isEditing ? existingProfile.emoji : PROFILE_EMOJIS[2];
  let selectedColor = isEditing ? existingProfile.color : CAR_COLORS[2].hex;

  // Build emoji grid
  const emojiGrid = document.getElementById('emoji-grid');
  emojiGrid.innerHTML = '';
  PROFILE_EMOJIS.forEach(emoji => {
    const btn = document.createElement('button');
    btn.className = 'emoji-btn';
    btn.textContent = emoji;
    if (emoji === selectedEmoji) btn.classList.add('selected');
    btn.addEventListener('click', () => {
      selectedEmoji = emoji;
      emojiGrid.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
    emojiGrid.appendChild(btn);
  });

  // Build color swatches
  const colorContainer = document.getElementById('newprofile-colors');
  colorContainer.innerHTML = '';
  CAR_COLORS.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'color-swatch';
    btn.style.backgroundColor = c.hex;
    if (c.hex === selectedColor) btn.classList.add('selected');
    btn.addEventListener('click', () => {
      selectedColor = c.hex;
      colorContainer.querySelectorAll('.color-swatch').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
    colorContainer.appendChild(btn);
  });

  const nameInput = document.getElementById('newprofile-name');
  const createBtn = document.getElementById('newprofile-create');
  const cancelBtn = document.getElementById('newprofile-cancel');

  // Update button text
  createBtn.textContent = isEditing ? '\u2705 Save' : '\u2705 Create!';

  const handleSave = () => {
    const name = nameInput.value.trim().slice(0, 12);
    if (!name) {
      nameInput.placeholder = 'Type a name!';
      nameInput.classList.add('error');
      return;
    }
    if (isEditing) {
      editProfile(editKey, name, selectedEmoji, selectedColor);
    } else {
      createProfile(name, selectedEmoji, selectedColor);
    }
    screen.classList.add('hidden');
    showProfileScreen(onSelect);
    cleanup();
  };

  const handleCancel = () => {
    screen.classList.add('hidden');
    showProfileScreen(onSelect);
    cleanup();
  };

  function cleanup() {
    createBtn.removeEventListener('click', handleSave);
    cancelBtn.removeEventListener('click', handleCancel);
    _editorCleanup = null;
  }

  createBtn.addEventListener('click', handleSave);
  cancelBtn.addEventListener('click', handleCancel);
  _editorCleanup = cleanup;

  // Pre-fill name for edit, clear for new
  nameInput.value = isEditing ? existingProfile.name : '';
  nameInput.classList.remove('error');
  nameInput.placeholder = 'Your name...';
  screen.classList.remove('hidden');
  nameInput.focus();
}

export function showProfileScreen(onSelect) {
  const profiles = loadAllProfiles();
  const screen = document.getElementById('profile-screen');
  const container = screen.querySelector('.profile-cards');
  container.innerHTML = '';

  // Build cards for all profiles
  Object.keys(profiles).forEach(key => {
    const p = profiles[key];
    const card = document.createElement('button');
    card.className = 'profile-card';
    card.dataset.profile = key;
    card.style.borderColor = (p.color || '#888') + '50';
    card.style.position = 'relative';

    const highest = getHighestLevel(key);
    const stars = p.totalStars || 0;
    const statsText = highest > 0 ? `Best: Level ${highest} \u00B7 \u2B50 ${stars}` : 'New racer!';

    const emojiSpan = document.createElement('span');
    emojiSpan.className = 'profile-emoji';
    emojiSpan.textContent = p.emoji;
    card.appendChild(emojiSpan);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'profile-name';
    nameSpan.textContent = p.name;
    card.appendChild(nameSpan);

    const statsSpan = document.createElement('span');
    statsSpan.className = 'profile-stats';
    statsSpan.textContent = statsText;
    card.appendChild(statsSpan);

    // Edit button for all profiles
    const editBtn = document.createElement('button');
    editBtn.className = 'profile-edit';
    editBtn.textContent = '\u270F\uFE0F';
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showProfileEditor(onSelect, key);
    });
    card.appendChild(editBtn);

    // Delete button for custom profiles
    if (!p.isDefault) {
      const delBtn = document.createElement('button');
      delBtn.className = 'profile-delete';
      delBtn.textContent = '\u2715';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Delete ${p.name}'s profile? This can't be undone!`)) {
          deleteProfile(key);
          showProfileScreen(onSelect);
        }
      });
      card.appendChild(delBtn);
    }

    card.addEventListener('click', () => {
      loadProfile(key);
      screen.classList.add('hidden');
      document.getElementById('game-container').classList.remove('hidden');
      const nameEl = document.getElementById('profile-name');
      if (nameEl) nameEl.textContent = `${p.emoji} ${p.name}`;
      onSelect(key);
    });

    // Hover/active color effect
    card.addEventListener('pointerenter', () => {
      card.style.borderColor = p.color || '#888';
      card.style.boxShadow = `0 0 25px ${(p.color || '#888')}40`;
    });
    card.addEventListener('pointerleave', () => {
      card.style.borderColor = (p.color || '#888') + '50';
      card.style.boxShadow = 'none';
    });

    container.appendChild(card);
  });

  // "Add Player" card
  const addCard = document.createElement('button');
  addCard.className = 'profile-card profile-add';
  const addEmoji = document.createElement('span');
  addEmoji.className = 'profile-emoji';
  addEmoji.textContent = '\u2795';
  addCard.appendChild(addEmoji);

  const addName = document.createElement('span');
  addName.className = 'profile-name';
  addName.textContent = 'Add Player';
  addCard.appendChild(addName);

  const addStats = document.createElement('span');
  addStats.className = 'profile-stats';
  addStats.textContent = 'Create new racer!';
  addCard.appendChild(addStats);
  addCard.addEventListener('click', () => {
    showProfileEditor(onSelect);
  });
  container.appendChild(addCard);

  screen.classList.remove('hidden');
  document.getElementById('game-container').classList.add('hidden');
}
