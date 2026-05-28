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

  // Mode — 'racer' (Maze Racer) or 'rescue' (Midnight Rescue).
  // Mode-specific gameplay lives in modes.js; most modules just branch on this.
  currentMode: 'racer',

  // Rescue mode — collectible NPCs the player must pick up before the exit
  // will complete the level. Empty in racer mode.
  rescues: [],
  rescuedCount: 0,
  allRescued: false,

  // Timing
  startTime: 0,
  timerInterval: null,
  won: false,
  paused: false,
  pauseTime: 0,
  autoAdvanceTimer: null,

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

  // Car customization
  car: { color: '#e94560', stripe: 'center', decal: 'none' },

  // Challenge mode
  challengeMode: false,
  oilSlicks: [],
  trafficCones: [],
  speedTraps: [],
  spinOutUntil: 0,

  // Canvas (set during init)
  canvas: null,
  ctx: null,
  canvasCssSize: 0, // CSS-pixel size of game canvas (drawing uses these units after DPR scale)

  // Monotonic clock captured once per frame by the game loop; used for purely
  // visual animations so every shape drawn in the same frame sees the same time.
  now: 0,

  // Input state
  keysDown: {},
  moveRepeatTimer: null,
  moveRepeatCount: 0,
};
