// renderer.js — All canvas drawing: maze, car, effects, overlays.

import { state } from './state.js';

// --- Particles ---
export function spawnParticles(px, py, color, count) {
  for (let i = 0; i < count; i++) {
    state.particles.push({
      x: px, y: py,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: 1,
      color: color,
      size: Math.random() * 4 + 2
    });
  }
}

export function updateParticles() {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.02;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
}

// --- Floating text ---
export function spawnFloatingText(x, y, text, color) {
  state.floatingTexts.push({ x, y, text, color, life: 1, vy: -1.5 });
}

export function updateFloatingTexts() {
  for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
    const ft = state.floatingTexts[i];
    ft.y += ft.vy;
    ft.life -= 0.02;
    if (ft.life <= 0) state.floatingTexts.splice(i, 1);
  }
}

// --- Internal draw helpers ---
function drawParticles() {
  const { ctx } = state;
  state.particles.forEach(p => {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawFloatingTexts() {
  const { ctx, canvas } = state;
  state.floatingTexts.forEach(ft => {
    ctx.globalAlpha = ft.life;
    ctx.fillStyle = ft.color;
    ctx.font = `bold ${canvas.width * 0.03 + (1 - ft.life) * 10}px 'Segoe UI', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(ft.text, ft.x, ft.y);
  });
  ctx.globalAlpha = 1;
}

function drawCheckeredFlag() {
  if (!state.checkeredFlag) return;
  const { ctx, canvas } = state;
  const elapsed = (Date.now() - state.checkeredFlagTime) / 1000;
  if (elapsed > 2.5) { state.checkeredFlag = false; return; }

  const alpha = elapsed < 0.3 ? elapsed / 0.3 : elapsed > 2 ? (2.5 - elapsed) / 0.5 : 1;
  ctx.globalAlpha = alpha * 0.85;

  const flagW = canvas.width * 0.6;
  const flagH = canvas.height * 0.35;
  const fx = (canvas.width - flagW) / 2;
  const fy = (canvas.height - flagH) / 2 - 20;
  const squareSize = flagW / 10;

  for (let row = 0; row < Math.ceil(flagH / squareSize); row++) {
    for (let col = 0; col < 10; col++) {
      const wave = Math.sin(elapsed * 4 + col * 0.5) * 4;
      ctx.fillStyle = (row + col) % 2 === 0 ? '#222' : '#fff';
      ctx.fillRect(fx + col * squareSize, fy + row * squareSize + wave, squareSize, squareSize);
    }
  }

  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#f5c518';
  const fontSize = canvas.width * 0.078;
  ctx.font = `bold ${fontSize}px "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4;
  ctx.strokeText('FINISH!', canvas.width / 2, fy + flagH + 45);
  ctx.fillText('FINISH!', canvas.width / 2, fy + flagH + 45);
  ctx.globalAlpha = 1;
}

function drawCountdown() {
  if (state.countdown < 0) return;
  const { ctx, canvas } = state;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (state.countdown > 0) {
    const scale = 1 + Math.sin(Date.now() / 100) * 0.1;
    ctx.fillStyle = state.countdown === 1 ? '#e94560' : '#f5c518';
    const fontSize = canvas.width * 0.148 * scale;
    ctx.font = `bold ${fontSize}px "Segoe UI", sans-serif`;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 5;
    ctx.strokeText(state.countdown, canvas.width / 2, canvas.height / 2);
    ctx.fillText(state.countdown, canvas.width / 2, canvas.height / 2);
  } else {
    ctx.fillStyle = '#00ff64';
    const fontSize = canvas.width * 0.167;
    ctx.font = `bold ${fontSize}px "Segoe UI", sans-serif`;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 5;
    ctx.strokeText('GO!', canvas.width / 2, canvas.height / 2);
    ctx.fillText('GO!', canvas.width / 2, canvas.height / 2);
  }
  ctx.textBaseline = 'alphabetic';
}

// --- Car drawing (reusable for game + preview) ---

// Decal options (shared with menu.js)
export const CAR_DECALS = [
  { id: 'none', emoji: '' },
  { id: 'star', emoji: '\u2B50' },
  { id: 'heart', emoji: '\u2764\uFE0F' },
  { id: 'lightning', emoji: '\u26A1' },
  { id: 'fire', emoji: '\uD83D\uDD25' },
  { id: 'rainbow', emoji: '\uD83C\uDF08' },
];

export function drawCar(ctx, x, y, S, facing, carConfig) {
  const cfg = carConfig || {};
  const carColor = cfg.color || '#e94560';
  const stripe = cfg.stripe || 'center';
  const decal = cfg.decal || 'none';

  ctx.save();
  ctx.translate(x, y);

  const angles = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
  ctx.rotate(angles[facing] || 0);

  // Headlight glow
  const hlGlow = ctx.createRadialGradient(S * 0.8, 0, 0, S * 0.8, 0, S * 0.7);
  hlGlow.addColorStop(0, 'rgba(255, 255, 150, 0.25)');
  hlGlow.addColorStop(1, 'rgba(255, 255, 150, 0)');
  ctx.fillStyle = hlGlow;
  ctx.beginPath();
  ctx.arc(S * 0.8, 0, S * 0.7, 0, Math.PI * 2);
  ctx.fill();

  // Car body
  ctx.fillStyle = carColor;
  ctx.beginPath();
  ctx.moveTo(-S, -S * 0.5);
  ctx.lineTo(S * 0.5, -S * 0.5);
  ctx.quadraticCurveTo(S, -S * 0.4, S, 0);
  ctx.quadraticCurveTo(S, S * 0.4, S * 0.5, S * 0.5);
  ctx.lineTo(-S, S * 0.5);
  ctx.quadraticCurveTo(-S * 0.85, 0, -S, -S * 0.5);
  ctx.closePath();
  ctx.fill();

  // Windshield
  ctx.fillStyle = '#7ec8e3';
  ctx.beginPath();
  ctx.moveTo(S * 0.05, -S * 0.38);
  ctx.lineTo(S * 0.4, -S * 0.32);
  ctx.lineTo(S * 0.4, S * 0.32);
  ctx.lineTo(S * 0.05, S * 0.38);
  ctx.closePath();
  ctx.fill();

  // Racing stripe
  if (stripe !== 'none') {
    ctx.fillStyle = '#f5c518';
    if (stripe === 'double') {
      ctx.fillRect(-S * 0.8, -S * 0.3, S * 1.2, S * 0.08);
      ctx.fillRect(-S * 0.8, S * 0.22, S * 1.2, S * 0.08);
    } else {
      // 'center' (default)
      ctx.fillRect(-S * 0.8, -S * 0.08, S * 1.2, S * 0.16);
    }
  }

  // Decal
  if (decal && decal !== 'none') {
    const decalObj = CAR_DECALS.find(d => d.id === decal);
    if (decalObj && decalObj.emoji) {
      ctx.font = `${S * 0.4}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(decalObj.emoji, -S * 0.3, 0);
    }
  }

  // Wheels
  ctx.fillStyle = '#222';
  ctx.fillRect(-S * 0.65, -S * 0.58, S * 0.3, S * 0.12);
  ctx.fillRect(-S * 0.65, S * 0.46, S * 0.3, S * 0.12);
  ctx.fillRect(S * 0.3, -S * 0.58, S * 0.3, S * 0.12);
  ctx.fillRect(S * 0.3, S * 0.46, S * 0.3, S * 0.12);

  // Headlights
  ctx.fillStyle = '#ffffaa';
  ctx.beginPath();
  ctx.arc(S * 0.85, -S * 0.25, S * 0.1, 0, Math.PI * 2);
  ctx.arc(S * 0.85, S * 0.25, S * 0.1, 0, Math.PI * 2);
  ctx.fill();

  // Tail lights
  ctx.fillStyle = '#ff3333';
  ctx.beginPath();
  ctx.arc(-S * 0.9, -S * 0.3, S * 0.08, 0, Math.PI * 2);
  ctx.arc(-S * 0.9, S * 0.3, S * 0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawCarPreview(canvas, carConfig) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#16213e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const size = canvas.width * 0.35;
  drawCar(ctx, canvas.width / 2, canvas.height / 2, size, 'right', carConfig);
}

// --- Main draw ---
export function draw() {
  const { ctx, canvas, ROWS, COLS, CELL, maze, boostPads, stars, player, playerTrail } = state;

  ctx.fillStyle = '#16213e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Boost pads
  boostPads.forEach(b => {
    const bpx = b.x * CELL;
    const bpy = b.y * CELL;
    const pulse = 0.5 + Math.sin(Date.now() / 200) * 0.3;

    const glow = ctx.createRadialGradient(bpx + CELL / 2, bpy + CELL / 2, 0, bpx + CELL / 2, bpy + CELL / 2, CELL * 0.6);
    glow.addColorStop(0, `rgba(255, 140, 0, ${pulse * 0.4})`);
    glow.addColorStop(1, 'rgba(255, 140, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(bpx - CELL * 0.1, bpy - CELL * 0.1, CELL * 1.2, CELL * 1.2);

    ctx.fillStyle = `rgba(255, 140, 0, ${0.3 + pulse * 0.2})`;
    ctx.fillRect(bpx + 2, bpy + 2, CELL - 4, CELL - 4);

    ctx.fillStyle = `rgba(255, 200, 50, ${pulse})`;
    ctx.font = `bold ${CELL * 0.5}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (b.dir === 'vertical') {
      ctx.save();
      ctx.translate(bpx + CELL / 2, bpy + CELL / 2);
      ctx.rotate(Math.PI / 2);
      ctx.fillText('\u00BB', 0, 0);
      ctx.restore();
    } else {
      ctx.fillText('\u00BB', bpx + CELL / 2, bpy + CELL / 2);
    }
    ctx.textBaseline = 'alphabetic';
  });

  // Maze walls
  ctx.strokeStyle = '#e94560';
  ctx.lineWidth = 2;

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const cell = maze[y][x];
      const px = x * CELL;
      const py = y * CELL;
      if (cell.top) { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + CELL, py); ctx.stroke(); }
      if (cell.right) { ctx.beginPath(); ctx.moveTo(px + CELL, py); ctx.lineTo(px + CELL, py + CELL); ctx.stroke(); }
      if (cell.bottom) { ctx.beginPath(); ctx.moveTo(px, py + CELL); ctx.lineTo(px + CELL, py + CELL); ctx.stroke(); }
      if (cell.left) { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + CELL); ctx.stroke(); }
    }
  }

  // Exit (checkered finish)
  const exPx = state.exit.x * CELL;
  const exPy = state.exit.y * CELL;
  const sq = CELL / 4;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)';
      ctx.fillRect(exPx + c * sq, exPy + r * sq, sq, sq);
    }
  }
  const exitGlow = ctx.createRadialGradient(exPx + CELL / 2, exPy + CELL / 2, 0, exPx + CELL / 2, exPy + CELL / 2, CELL * 0.6);
  exitGlow.addColorStop(0, `rgba(0, 255, 100, ${0.2 + Math.sin(Date.now() / 300) * 0.15})`);
  exitGlow.addColorStop(1, 'rgba(0, 255, 100, 0)');
  ctx.fillStyle = exitGlow;
  ctx.beginPath();
  ctx.arc(exPx + CELL / 2, exPy + CELL / 2, CELL * 0.6, 0, Math.PI * 2);
  ctx.fill();

  // Stars
  const time = Date.now() / 1000;
  stars.forEach(s => {
    if (s.collected) return;
    const sx = s.x * CELL + CELL / 2;
    const sy = s.y * CELL + CELL / 2;
    const twinkle = 0.7 + Math.sin(time * 3 + s.sparkle) * 0.3;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(time + s.sparkle);
    ctx.globalAlpha = twinkle;
    ctx.fillStyle = '#f5c518';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const r = CELL * 0.25;
      if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
      else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  });

  // Player trail (tire marks)
  playerTrail.forEach((t, i) => {
    const alpha = (i / playerTrail.length) * 0.25;
    ctx.fillStyle = `rgba(100, 100, 100, ${alpha})`;
    const tx = t.x * CELL + CELL / 2;
    const ty = t.y * CELL + CELL / 2;
    ctx.fillRect(tx - 2, ty - 1, 4, 2);
    ctx.fillRect(tx - 2, ty + 1, 4, 2);
  });

  // Player (sports car)
  const ppx = player.x * CELL + CELL / 2;
  const ppy = player.y * CELL + CELL / 2;
  drawCar(ctx, ppx, ppy, CELL * 0.42, player.facing, state.car);

  drawParticles();
  drawFloatingTexts();
  drawCheckeredFlag();
  drawCountdown();
}
