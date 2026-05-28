// maze.js — Maze generation (recursive backtracker) + star/boost/hazard placement.

import { state } from './state.js';
import { MODES, RESCUE_TARGETS, rescueCountForLevel } from './modes.js';

// Fisher-Yates shuffle (in-place)
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export function getMazeSize() {
  const { level } = state;
  if (level <= 8) {
    return 11 + (level - 1) * 2; // 11 to 25
  }
  // Levels 9+: slower growth, cap at 35
  return Math.min(35, 25 + (level - 8));
}

export function updateGridSize() {
  state.COLS = getMazeSize();
  state.ROWS = state.COLS;
  // Use the CSS-pixel size, not canvas.width — after DPR scaling,
  // canvas.width is in device pixels and would produce a CELL that's dpr× too big.
  state.CELL = state.canvasCssSize / state.COLS;
}

export function pickStartAndExit() {
  const { COLS, ROWS, level } = state;

  function randomOnEdge(edges) {
    const edge = edges[Math.floor(Math.random() * edges.length)];
    switch (edge) {
      case 'top':    return { x: Math.floor(Math.random() * COLS), y: 0 };
      case 'right':  return { x: COLS - 1, y: Math.floor(Math.random() * ROWS) };
      case 'bottom': return { x: Math.floor(Math.random() * COLS), y: ROWS - 1 };
      case 'left':   return { x: 0, y: Math.floor(Math.random() * ROWS) };
    }
  }

  let start, exit;

  if (level <= 3) {
    // Easy: start top-left, exit on bottom or right edge
    start = { x: 0, y: 0 };
    exit = randomOnEdge(['bottom', 'right']);
  } else if (level <= 6) {
    // Medium: start on top/left edge, exit on bottom/right edge, minimum distance apart
    let attempts = 0;
    do {
      start = randomOnEdge(['top', 'left']);
      exit = randomOnEdge(['bottom', 'right']);
      attempts++;
    } while (
      (Math.abs(start.x - exit.x) + Math.abs(start.y - exit.y) < 3 ||
       (start.x === exit.x && start.y === exit.y)) &&
      attempts < 50
    );
  } else {
    // Hard: both random edges, minimum distance apart
    const minDist = Math.floor((COLS + ROWS) / 2);
    let attempts = 0;
    do {
      start = randomOnEdge(['top', 'right', 'bottom', 'left']);
      exit = randomOnEdge(['top', 'right', 'bottom', 'left']);
      attempts++;
    } while (
      (Math.abs(start.x - exit.x) + Math.abs(start.y - exit.y) < minDist ||
       (start.x === exit.x && start.y === exit.y)) &&
      attempts < 100
    );
  }

  return { start, exit };
}

export function generateMaze() {
  const { COLS, ROWS } = state;
  state.maze = [];
  for (let y = 0; y < ROWS; y++) {
    state.maze[y] = [];
    for (let x = 0; x < COLS; x++) {
      state.maze[y][x] = { top: true, right: true, bottom: true, left: true, visited: false };
    }
  }

  const stack = [];
  let current = { x: 0, y: 0 };
  state.maze[0][0].visited = true;
  let visitedCount = 1;
  const total = COLS * ROWS;

  while (visitedCount < total) {
    const neighbors = [];
    const { x, y } = current;
    if (y > 0 && !state.maze[y - 1][x].visited) neighbors.push({ x, y: y - 1, dir: 'top' });
    if (x < COLS - 1 && !state.maze[y][x + 1].visited) neighbors.push({ x: x + 1, y, dir: 'right' });
    if (y < ROWS - 1 && !state.maze[y + 1][x].visited) neighbors.push({ x, y: y + 1, dir: 'bottom' });
    if (x > 0 && !state.maze[y][x - 1].visited) neighbors.push({ x: x - 1, y, dir: 'left' });

    if (neighbors.length > 0) {
      const next = neighbors[Math.floor(Math.random() * neighbors.length)];
      stack.push(current);
      if (next.dir === 'top') { state.maze[y][x].top = false; state.maze[next.y][next.x].bottom = false; }
      if (next.dir === 'right') { state.maze[y][x].right = false; state.maze[next.y][next.x].left = false; }
      if (next.dir === 'bottom') { state.maze[y][x].bottom = false; state.maze[next.y][next.x].top = false; }
      if (next.dir === 'left') { state.maze[y][x].left = false; state.maze[next.y][next.x].right = false; }
      state.maze[next.y][next.x].visited = true;
      visitedCount++;
      current = { x: next.x, y: next.y };
    } else {
      current = stack.pop();
    }
  }
}

export function addExtraPassages() {
  const { COLS, ROWS, level, maze } = state;
  if (level <= 3) return;

  const area = COLS * ROWS;
  const count = Math.floor(area * Math.min(0.15, 0.03 + level * 0.01));

  let added = 0;
  let attempts = 0;

  while (added < count && attempts < count * 10) {
    attempts++;
    const x = Math.floor(Math.random() * COLS);
    const y = Math.floor(Math.random() * ROWS);

    const dirs = [];
    if (y > 0 && maze[y][x].top) dirs.push('top');
    if (x < COLS - 1 && maze[y][x].right) dirs.push('right');
    if (y < ROWS - 1 && maze[y][x].bottom) dirs.push('bottom');
    if (x > 0 && maze[y][x].left) dirs.push('left');

    if (dirs.length === 0) continue;

    const dir = dirs[Math.floor(Math.random() * dirs.length)];

    if (dir === 'top')    { maze[y][x].top = false; maze[y - 1][x].bottom = false; }
    if (dir === 'right')  { maze[y][x].right = false; maze[y][x + 1].left = false; }
    if (dir === 'bottom') { maze[y][x].bottom = false; maze[y + 1][x].top = false; }
    if (dir === 'left')   { maze[y][x].left = false; maze[y][x - 1].right = false; }

    added++;
  }
}

function isStraightaway(x, y) {
  const { maze, COLS, ROWS } = state;
  const cell = maze[y][x];

  if (!cell.left && !cell.right) {
    let runH = 0;
    let cx = x;
    while (cx < COLS - 1 && !maze[y][cx].right) { runH++; cx++; }
    let runLeft = 0;
    cx = x;
    while (cx > 0 && !maze[y][cx].left) { runLeft++; cx--; }
    if (runH >= 2 || runLeft >= 2) return 'horizontal';
  }

  if (!cell.top && !cell.bottom) {
    let runDown = 0;
    let cy = y;
    while (cy < ROWS - 1 && !maze[cy][x].bottom) { runDown++; cy++; }
    let runUp = 0;
    cy = y;
    while (cy > 0 && !maze[cy][x].top) { runUp++; cy--; }
    if (runDown >= 2 || runUp >= 2) return 'vertical';
  }

  return null;
}

export function placeBoostPads() {
  const { COLS, ROWS, level, player, exit } = state;
  state.boostPads = [];
  const count = 2 + Math.floor(level / 2);

  const candidates = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (x === player.x && y === player.y) continue;
      if (x === exit.x && y === exit.y) continue;
      if (Math.abs(x - player.x) + Math.abs(y - player.y) < 2) continue;
      const dir = isStraightaway(x, y);
      if (dir) candidates.push({ x, y, dir });
    }
  }

  shuffle(candidates);

  for (let i = 0; i < candidates.length && state.boostPads.length < count; i++) {
    const c = candidates[i];
    if (!state.boostPads.some(b => Math.abs(b.x - c.x) + Math.abs(b.y - c.y) < 3)) {
      state.boostPads.push({ x: c.x, y: c.y, dir: c.dir });
    }
  }
}

export function placeStars() {
  const { COLS, ROWS, level, boostPads, player, exit } = state;
  state.stars = [];
  // Rescue mode keeps the slot empty — its collectibles are the rescue targets.
  if (!MODES[state.currentMode].showStars) return;
  const count = 3 + level;
  let attempts = 0;
  while (state.stars.length < count && attempts < 500) {
    const sx = Math.floor(Math.random() * COLS);
    const sy = Math.floor(Math.random() * ROWS);
    if (sx === player.x && sy === player.y) { attempts++; continue; }
    if (sx === exit.x && sy === exit.y) { attempts++; continue; }
    if (boostPads.some(b => b.x === sx && b.y === sy)) { attempts++; continue; }
    if (!state.stars.some(s => s.x === sx && s.y === sy)) {
      state.stars.push({ x: sx, y: sy, collected: false, sparkle: Math.random() * Math.PI * 2 });
    }
    attempts++;
  }
}

// --- Rescue target placement (Midnight Rescue only) ---

export function placeRescues() {
  const { COLS, ROWS, level, boostPads, stars, player, exit } = state;
  state.rescues = [];
  state.rescuedCount = 0;
  state.allRescued = false;
  if (!MODES[state.currentMode].showRescues) return;

  const count = rescueCountForLevel(level);
  const targets = [...RESCUE_TARGETS];
  shuffle(targets);

  let attempts = 0;
  while (state.rescues.length < count && attempts < 500) {
    attempts++;
    const x = Math.floor(Math.random() * COLS);
    const y = Math.floor(Math.random() * ROWS);
    if (x === player.x && y === player.y) continue;
    if (x === exit.x && y === exit.y) continue;
    // Keep the first rescue a couple of cells away so level 1 isn't trivial.
    if (Math.abs(x - player.x) + Math.abs(y - player.y) < 2) continue;
    if (boostPads.some(b => b.x === x && b.y === y)) continue;
    if (stars.some(s => s.x === x && s.y === y)) continue;
    if (state.rescues.some(r => r.x === x && r.y === y)) continue;
    const t = targets[state.rescues.length % targets.length];
    state.rescues.push({ x, y, type: t.id, emoji: t.emoji, label: t.label, collected: false });
  }
}

// --- Hazard placement (only when challenge mode is on AND the mode allows hazards) ---

export function placeOilSlicks() {
  const { COLS, ROWS, level, boostPads, stars, player, exit } = state;
  state.oilSlicks = [];
  if (!state.challengeMode) return;
  if (!MODES[state.currentMode].hazardsActive) return;

  const count = 3 + Math.floor(level / 2);
  let attempts = 0;
  while (state.oilSlicks.length < count && attempts < 500) {
    const x = Math.floor(Math.random() * COLS);
    const y = Math.floor(Math.random() * ROWS);
    if (x === player.x && y === player.y) { attempts++; continue; }
    if (x === exit.x && y === exit.y) { attempts++; continue; }
    if (Math.abs(x - player.x) + Math.abs(y - player.y) < 3) { attempts++; continue; }
    if (boostPads.some(b => b.x === x && b.y === y)) { attempts++; continue; }
    if (stars.some(s => s.x === x && s.y === y)) { attempts++; continue; }
    if (state.oilSlicks.some(o => o.x === x && o.y === y)) { attempts++; continue; }
    state.oilSlicks.push({ x, y, activeAt: Date.now() + Math.random() * 3000 });
    attempts++;
  }
}

export function placeTrafficCones() {
  const { COLS, ROWS, level, player, exit, boostPads, stars } = state;
  state.trafficCones = [];
  if (!state.challengeMode || level < 3) return;
  if (!MODES[state.currentMode].hazardsActive) return;

  const count = 2 + Math.floor(level / 3);
  const candidates = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (x === player.x && y === player.y) continue;
      if (x === exit.x && y === exit.y) continue;
      if (Math.abs(x - player.x) + Math.abs(y - player.y) < 3) continue;
      if (boostPads.some(b => b.x === x && b.y === y)) continue;
      if (stars.some(s => s.x === x && s.y === y)) continue;
      if (state.oilSlicks.some(o => o.x === x && o.y === y)) continue;
      if (isStraightaway(x, y)) candidates.push({ x, y });
    }
  }

  shuffle(candidates);

  for (let i = 0; i < candidates.length && state.trafficCones.length < count; i++) {
    const c = candidates[i];
    if (!state.trafficCones.some(t => Math.abs(t.x - c.x) + Math.abs(t.y - c.y) < 3)) {
      state.trafficCones.push({ x: c.x, y: c.y, hit: false });
    }
  }
}

export function placeSpeedTraps() {
  const { COLS, ROWS, level, player, exit, maze, boostPads, stars } = state;
  state.speedTraps = [];
  if (!state.challengeMode || level < 5) return;
  if (!MODES[state.currentMode].hazardsActive) return;

  const count = 1 + Math.floor(level / 4);
  const candidates = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (x === player.x && y === player.y) continue;
      if (x === exit.x && y === exit.y) continue;
      if (Math.abs(x - player.x) + Math.abs(y - player.y) < 4) continue;
      if (boostPads.some(b => b.x === x && b.y === y)) continue;
      if (stars.some(s => s.x === x && s.y === y)) continue;
      if (state.oilSlicks.some(o => o.x === x && o.y === y)) continue;
      if (state.trafficCones.some(t => t.x === x && t.y === y)) continue;

      const cell = maze[y][x];
      const openWalls = (!cell.top ? 1 : 0) + (!cell.right ? 1 : 0) + (!cell.bottom ? 1 : 0) + (!cell.left ? 1 : 0);
      if (openWalls >= 3) candidates.push({ x, y });
    }
  }

  shuffle(candidates);

  for (let i = 0; i < candidates.length && state.speedTraps.length < count; i++) {
    state.speedTraps.push({ x: candidates[i].x, y: candidates[i].y, activeAt: Date.now() + Math.random() * 4000 });
  }
}
