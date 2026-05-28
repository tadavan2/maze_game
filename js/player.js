// player.js — Movement logic, collision detection, boost mechanics.

import { state } from './state.js';
import { playEngineSound, playBoostSound, playStarSound, playSkidSound, playBonkSound, playSirenSound } from './sound.js';
import { spawnParticles, spawnFloatingText } from './renderer.js';
import { MODES } from './modes.js';

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
  if (state.spinOutUntil > Date.now()) return; // can't move while spinning/busted

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

    // Check boost pad — push along the straightaway direction, not player direction
    const onBoost = state.boostPads.find(b => b.x === player.x && b.y === player.y);
    if (onBoost) {
      playBoostSound();
      spawnFloatingText(player.x * CELL + CELL / 2, player.y * CELL, 'TURBO!', '#ff8c00');
      spawnParticles(player.x * CELL + CELL / 2, player.y * CELL + CELL / 2, '#ff8c00', 20);

      // Determine boost direction from the pad's orientation + player entry direction
      let boostDir = dir;
      if (onBoost.dir === 'horizontal' && (dir === 'up' || dir === 'down')) {
        // Entered a horizontal straightaway from above/below — pick whichever horizontal dir is open
        boostDir = canMove(player.x, player.y, 'right') ? 'right' : 'left';
      } else if (onBoost.dir === 'vertical' && (dir === 'left' || dir === 'right')) {
        // Entered a vertical straightaway from the side — pick whichever vertical dir is open
        boostDir = canMove(player.x, player.y, 'down') ? 'down' : 'up';
      }
      player.facing = boostDir;

      for (let i = 0; i < 3; i++) {
        if (state.spinOutUntil > Date.now()) break; // stop boost if spun out
        let bx = player.x, by = player.y;
        if (boostDir === 'up' && canMove(player.x, player.y, 'up')) by--;
        else if (boostDir === 'down' && canMove(player.x, player.y, 'down')) by++;
        else if (boostDir === 'left' && canMove(player.x, player.y, 'left')) bx--;
        else if (boostDir === 'right' && canMove(player.x, player.y, 'right')) bx++;
        if (bx !== player.x || by !== player.y) {
          state.playerTrail.push({ x: player.x, y: player.y });
          if (state.playerTrail.length > 30) state.playerTrail.shift();
          player.x = bx;
          player.y = by;
          collectStarAt(player.x, player.y);
          collectRescueAt(player.x, player.y);
          checkHazards(player);
        } else break;
      }
    }

    collectStarAt(player.x, player.y);
    collectRescueAt(player.x, player.y);

    // Check hazards (challenge mode)
    if (checkHazards(player)) return; // hazard triggered, skip exit check

    // Check exit
    if (player.x === state.exit.x && player.y === state.exit.y && onWinLevel) {
      // In rescue mode the exit is locked until every friend is picked up.
      if (state.currentMode === 'rescue' && !state.allRescued) {
        nudgeRescueReminder(player);
        return;
      }
      onWinLevel();
    }
  }
}

function nudgeRescueReminder(player) {
  const { CELL } = state;
  const remaining = state.rescues.filter(r => !r.collected).length;
  if (!_msgEl) _msgEl = document.getElementById('message');
  _msgEl.textContent = remaining === 1
    ? 'One more friend to find!'
    : `Find your friends! (${remaining} left)`;
  spawnFloatingText(player.x * CELL + CELL / 2, player.y * CELL, 'Not yet!', '#b48cff');
}

function checkHazards(player) {
  if (!state.challengeMode) return false;
  // Rescue mode is deliberately non-punishing in Phase 1 — no spin-outs / bonks.
  if (!MODES[state.currentMode].hazardsActive) return false;
  const { CELL } = state;

  // Oil slick — spin out (only when slick is "active" in its blink cycle)
  const onOil = state.oilSlicks.find(o => o.x === player.x && o.y === player.y);
  if (onOil && state.spinOutUntil <= Date.now()) {
    const oilCycle = ((Date.now() - onOil.activeAt) % 3000);
    const oilActive = oilCycle < 1500; // 1.5s on, 1.5s off
    if (oilActive) {
      state.spinOutUntil = Date.now() + 1500;
      playSkidSound();
      spawnFloatingText(player.x * CELL + CELL / 2, player.y * CELL, 'SPIN OUT!', '#ff69b4');
      spawnParticles(player.x * CELL + CELL / 2, player.y * CELL + CELL / 2, '#444', 12);
      return true;
    }
  }

  // Traffic cone — bump back + time penalty
  const cone = state.trafficCones.find(c => c.x === player.x && c.y === player.y && !c.hit);
  if (cone) {
    cone.hit = true;
    // Find a trail entry that's a different cell to bounce back to
    let bounceTarget = null;
    for (let i = state.playerTrail.length - 1; i >= 0; i--) {
      const t = state.playerTrail[i];
      if (t.x !== player.x || t.y !== player.y) {
        bounceTarget = t;
        break;
      }
    }
    if (bounceTarget) {
      player.x = bounceTarget.x;
      player.y = bounceTarget.y;
    }
    state.startTime -= 2000; // adds 2 seconds to displayed time
    playBonkSound();
    spawnFloatingText(cone.x * CELL + CELL / 2, cone.y * CELL, 'BONK! +2s', '#ff8c00');
    spawnParticles(cone.x * CELL + CELL / 2, cone.y * CELL + CELL / 2, '#ff8c00', 10);
    return true;
  }

  // Speed trap — freeze if active
  const trap = state.speedTraps.find(t => t.x === player.x && t.y === player.y);
  if (trap) {
    const cycleTime = ((Date.now() - trap.activeAt) % 4000);
    const isActive = cycleTime < 2000;
    if (isActive) {
      state.spinOutUntil = Date.now() + 3000;
      playSirenSound();
      spawnFloatingText(player.x * CELL + CELL / 2, player.y * CELL, 'BUSTED!', '#ff0000');
      spawnParticles(player.x * CELL + CELL / 2, player.y * CELL + CELL / 2, '#ff0000', 15);
      return true;
    }
  }

  return false;
}

let _msgEl = null;
let _starsEl = null;

function collectStarAt(x, y) {
  const { CELL } = state;
  if (!_msgEl) _msgEl = document.getElementById('message');
  if (!_starsEl) _starsEl = document.getElementById('stars');

  state.stars.forEach(s => {
    if (!s.collected && s.x === x && s.y === y) {
      s.collected = true;
      state.starCount++;
      _starsEl.textContent = state.starCount;
      playStarSound();
      spawnParticles(x * CELL + CELL / 2, y * CELL + CELL / 2, '#f5c518', 15);
      _msgEl.textContent = 'Got a star!';
      setTimeout(() => { if (!state.won) _msgEl.textContent = ''; }, 1000);
    }
  });
}

function collectRescueAt(x, y) {
  if (!state.rescues.length) return;
  const { CELL } = state;
  if (!_msgEl) _msgEl = document.getElementById('message');
  if (!_starsEl) _starsEl = document.getElementById('stars');

  state.rescues.forEach(r => {
    if (r.collected || r.x !== x || r.y !== y) return;
    r.collected = true;
    state.rescuedCount++;
    // Reuse the stars HUD slot — label is already toggled to "Rescued:" in rescue mode.
    _starsEl.textContent = state.rescuedCount + '/' + state.rescues.length;
    playStarSound();
    spawnParticles(x * CELL + CELL / 2, y * CELL + CELL / 2, '#b48cff', 18);
    spawnFloatingText(x * CELL + CELL / 2, y * CELL, 'Rescued ' + r.label + '!', '#b48cff');

    if (state.rescuedCount >= state.rescues.length) {
      state.allRescued = true;
      _msgEl.textContent = 'Now return home!';
    } else {
      const remaining = state.rescues.length - state.rescuedCount;
      _msgEl.textContent = remaining === 1 ? 'One more friend!' : `${remaining} more to find!`;
      setTimeout(() => {
        if (!state.won && !state.allRescued) _msgEl.textContent = '';
      }, 1200);
    }
  });
}
