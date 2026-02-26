// state.js — Single shared state object for the entire game.
// Every module imports this and reads/writes to it.

export const state = {
  // Grid dimensions (recalculated per level)
  maze: [],
  COLS: 0,
  ROWS: 0,
  CELL: 0,

  // Player
  player: { x: 0, y: 0, facing: 'right' },
  playerTrail: [],

  // Level objects
  exit: {},
  stars: [],
  boostPads: [],
  starCount: 0,
  level: 1,

  // Timing
  startTime: 0,
  timerInterval: null,
  won: false,

  // Effects
  particles: [],
  floatingTexts: [],

  // Countdown
  countdown: -1,
  countdownTimer: null,

  // Best times (loaded per profile)
  bestTimes: {},

  // Checkered flag
  checkeredFlag: false,
  checkeredFlagTime: 0,

  // Profile
  currentProfile: null, // 'luella' or 'aden'
  profileData: null,    // the full profile object for current user

  // Canvas (set during init)
  canvas: null,
  ctx: null,

  // Input state
  keysDown: {},
  moveRepeatTimer: null,
  moveRepeatCount: 0,
};
