// player.js — Movement logic, collision detection, boost mechanics.

import { state } from './state.js';
import { playEngineSound, playBoostSound, playStarSound } from './sound.js';
import { spawnParticles, spawnFloatingText } from './renderer.js';

export function canMove(x, y, dir) {
  if (dir === 'up') return !state.maze[y][x].top;
  if (dir === 'down') return !state.maze[y][x].bottom;
  if (dir === 'left') return !state.maze[y][x].left;
  if (dir === 'right') return !state.maze[y][x].right;
  return false;
}

// winLevel callback — set by levels.js to avoid circular import
let onWinLevel = null;
export function setWinCallback(fn) {
  onWinLevel = fn;
}

export function movePlayer(dir) {
  if (state.won || state.paused || state.countdown >= 0) return;

  const { player, CELL } = state;
  player.facing = dir;

  let nx = player.x;
  let ny = player.y;

  if (dir === 'up' && canMove(player.x, player.y, 'up')) ny--;
  else if (dir === 'down' && canMove(player.x, player.y, 'down')) ny++;
  else if (dir === 'left' && canMove(player.x, player.y, 'left')) nx--;
  else if (dir === 'right' && canMove(player.x, player.y, 'right')) nx++;

  if (nx !== player.x || ny !== player.y) {
    state.playerTrail.push({ x: player.x, y: player.y });
    if (state.playerTrail.length > 30) state.playerTrail.shift();

    player.x = nx;
    player.y = ny;
    playEngineSound();

    // Check boost pad
    const onBoost = state.boostPads.find(b => b.x === player.x && b.y === player.y);
    if (onBoost) {
      playBoostSound();
      spawnFloatingText(player.x * CELL + CELL / 2, player.y * CELL, 'TURBO!', '#ff8c00');
      spawnParticles(player.x * CELL + CELL / 2, player.y * CELL + CELL / 2, '#ff8c00', 20);

      for (let i = 0; i < 3; i++) {
        let bx = player.x, by = player.y;
        if (dir === 'up' && canMove(player.x, player.y, 'up')) by--;
        else if (dir === 'down' && canMove(player.x, player.y, 'down')) by++;
        else if (dir === 'left' && canMove(player.x, player.y, 'left')) bx--;
        else if (dir === 'right' && canMove(player.x, player.y, 'right')) bx++;
        if (bx !== player.x || by !== player.y) {
          state.playerTrail.push({ x: player.x, y: player.y });
          if (state.playerTrail.length > 30) state.playerTrail.shift();
          player.x = bx;
          player.y = by;
          collectStarAt(player.x, player.y);
        } else break;
      }
    }

    collectStarAt(player.x, player.y);

    // Check exit
    if (player.x === state.exit.x && player.y === state.exit.y && onWinLevel) {
      onWinLevel();
    }
  }
}

function collectStarAt(x, y) {
  const { CELL } = state;
  const msgEl = document.getElementById('message');

  state.stars.forEach(s => {
    if (!s.collected && s.x === x && s.y === y) {
      s.collected = true;
      state.starCount++;
      document.getElementById('stars').textContent = state.starCount;
      playStarSound();
      spawnParticles(x * CELL + CELL / 2, y * CELL + CELL / 2, '#f5c518', 15);
      msgEl.textContent = 'Got a star!';
      setTimeout(() => { if (!state.won) msgEl.textContent = ''; }, 1000);
    }
  });
}
