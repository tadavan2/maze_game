// modes.js — Lightweight mode registry. Keeps Maze Racer and Midnight Rescue
// declarative so gameplay modules can branch on config, not hardcoded ids.

export const RESCUE_LEVEL_NAMES = [
  'Backyard Rescue',
  'Garden Rescue',
  'Forest Path',
  'Old Barn',
  'Moonlit Castle',
];

export const RESCUE_TARGETS = [
  { id: 'bunny',  emoji: '\uD83D\uDC30', label: 'bunny' },
  { id: 'kitten', emoji: '\uD83D\uDC31', label: 'kitten' },
  { id: 'puppy',  emoji: '\uD83D\uDC36', label: 'puppy' },
  { id: 'teddy',  emoji: '\uD83E\uDDF8', label: 'teddy bear' },
  { id: 'duck',   emoji: '\uD83E\uDD86', label: 'duck' },
  { id: 'robot',  emoji: '\uD83E\uDD16', label: 'robot toy' },
];

function rescueLevelName(n) {
  return RESCUE_LEVEL_NAMES[(n - 1) % RESCUE_LEVEL_NAMES.length];
}

export const MODES = {
  racer: {
    id: 'racer',
    title: 'Maze Racer',
    instructions: 'Use arrow keys or WASD to drive. Hold to go faster! Hit orange boost pads for TURBO!',
    statLabel: 'Stars:',
    levelName: (n) => `Level ${n}`,
    startMessage: (n) => n === 1 ? 'Get ready...' : `Level ${n} — bigger maze!`,
    winMessage: (n, elapsed) => `Level ${n} complete in ${elapsed}s!`,
    hazardsActive: true,       // oil slicks / cones / speed traps can affect the player
    showStars: true,           // collectible stars spawn
    showRescues: false,        // rescue targets spawn
    exitStyle: 'flag',         // checkered flag at exit
  },
  rescue: {
    id: 'rescue',
    title: 'Midnight Rescue',
    instructions: 'Find your lost friends and bring everyone home!',
    statLabel: 'Rescued:',
    levelName: rescueLevelName,
    startMessage: (n) => `${rescueLevelName(n)} \u2014 find your friends!`,
    winMessage: (n, elapsed) => `Everyone\u2019s home in ${elapsed}s!`,
    hazardsActive: false,      // no death state / no spin-out in Phase 1
    showStars: false,
    showRescues: true,
    exitStyle: 'house',        // glowing home base at exit
  },
};

// How many rescue targets to place for a given level number.
export function rescueCountForLevel(level) {
  if (level <= 1) return 1;
  if (level <= 3) return 2;
  return 3;
}
