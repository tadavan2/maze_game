// maze.js — Maze generation (recursive backtracker) + star/boost placement.

import { state } from './state.js';

export function getMazeSize() {
  return Math.min(25, 11 + (state.level - 1) * 2);
}

export function updateGridSize() {
  state.COLS = getMazeSize();
  state.ROWS = state.COLS;
  state.CELL = state.canvas.width / state.COLS;
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
  const { COLS, ROWS, level } = state;
  state.boostPads = [];
  const count = 2 + Math.floor(level / 2);

  const candidates = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (x === 0 && y === 0) continue;
      if (x === state.exit.x && y === state.exit.y) continue;
      if (x < 2 && y < 2) continue;
      const dir = isStraightaway(x, y);
      if (dir) candidates.push({ x, y, dir });
    }
  }

  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  for (let i = 0; i < candidates.length && state.boostPads.length < count; i++) {
    const c = candidates[i];
    if (!state.boostPads.some(b => Math.abs(b.x - c.x) + Math.abs(b.y - c.y) < 3)) {
      state.boostPads.push({ x: c.x, y: c.y, dir: c.dir });
    }
  }
}

export function placeStars() {
  const { COLS, ROWS, level, boostPads } = state;
  state.stars = [];
  const count = 3 + level;
  let attempts = 0;
  while (state.stars.length < count && attempts < 500) {
    const sx = Math.floor(Math.random() * COLS);
    const sy = Math.floor(Math.random() * ROWS);
    if ((sx === 0 && sy === 0) || (sx === state.exit.x && sy === state.exit.y)) { attempts++; continue; }
    if (boostPads.some(b => b.x === sx && b.y === sy)) { attempts++; continue; }
    if (!state.stars.some(s => s.x === sx && s.y === sy)) {
      state.stars.push({ x: sx, y: sy, collected: false, sparkle: Math.random() * Math.PI * 2 });
    }
    attempts++;
  }
}
