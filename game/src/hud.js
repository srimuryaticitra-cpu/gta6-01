// The HUD: cash, health, ammo, wanted stars, the objective banner, the speedometer,
// the minimap and the menu panels. Everything here is screen space (1280 x 720),
// drawn after the world, so it never scrolls with the camera.

import { PALETTE, VIEW, WORLD } from './config.js';
import { ROADS_X, ROADS_Y } from './city.js';
import { objectiveText } from './missions.js';

const fonts = new Map();

function font(size, bold) {
  const key = `${bold ? 'b' : ''}${size}`;
  if (!fonts.has(key)) fonts.set(key, `${bold ? '700 ' : ''}${size}px ${'system-ui, -apple-system, "Segoe UI", sans-serif'}`);
  return fonts.get(key);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, value, x, y, size, color, align, bold) {
  ctx.font = font(size, bold);
  ctx.fillStyle = color;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(value, x, y);
}

/** The minimap: the whole city shrunk into the corner — roads, beach, police dots,
 *  the mission target in gold and the player in white. */
export function drawMinimap(ctx, state) {
  const size = 196;
  const mx = VIEW.width - size - 16;
  const my = 16;
  const sx = size / WORLD.width;
  const sy = size / WORLD.height;
  const mh = size * (WORLD.height / WORLD.width);
  ctx.fillStyle = 'rgba(10,16,28,0.78)';
  ctx.fillRect(mx - 6, my - 6, size + 12, mh + 34);
  ctx.fillStyle = '#4c8340';
  ctx.fillRect(mx, my, size, mh);
  ctx.fillStyle = '#2e7fa8';
  ctx.fillRect(mx + size - 12, my, 12, mh * 0.3);
  ctx.fillStyle = '#e8d29a';
  ctx.fillRect(mx + size - 12, my + mh * 0.3, 12, mh * 0.7);
  ctx.fillStyle = '#3a3f47';
  for (const rx of ROADS_X) ctx.fillRect(mx + rx * sx - 1, my, 2, mh);
  for (const ry of ROADS_Y) ctx.fillRect(mx, my + ry * sy - 1, size, 2);
  const active = state.missions.active;
  let target = null;
  if (active) {
    const def = active.def;
    target = def.stops ? def.stops[Math.min(active.stopIndex, def.stops.length - 1)] : def.target;
  }
  if (target) {
    ctx.fillStyle = '#f2c94c';
    ctx.beginPath();
    ctx.arc(mx + target.x * sx, my + target.y * sy, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const car of state.police.cars) {
    ctx.fillStyle = '#3d7dff';
    ctx.beginPath();
    ctx.arc(mx + car.x * sx, my + car.y * sy, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  const p = state.player;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(mx + p.x * sx, my + p.y * sy, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1f8a70';
  ctx.beginPath();
  ctx.arc(mx + p.x * sx, my + p.y * sy, 3, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, 'N ↑', mx, my + mh + 20, 13, PALETTE.text, 'left', true);
  text(ctx, state.district || '', mx + size, my + mh + 20, 13, PALETTE.text, 'right', true);
}

/** The full in-game HUD, drawn in screen space over the world. */
export function drawHud(ctx, state) {
  const p = state.player;
  ctx.fillStyle = PALETTE.hudPanel;
  roundRect(ctx, 14, 14, 250, 108, 10);
  ctx.fill();
  text(ctx, `$${state.money}`, 28, 44, 30, PALETTE.gold, 'left', true);
  text(ctx, `♥ ${Math.ceil(p.health)}`, 28, 72, 20, p.health > 40 ? '#7ddb8a' : PALETTE.red, 'left', true);
  text(ctx, `Ammo ${p.ammo}   ◆ ${state.shells}/24`, 28, 98, 18, PALETTE.text, 'left');
  text(ctx, `Jobs done: ${state.missions.done.length}/3`, 28, 118, 16, PALETTE.muted, 'left');
  for (let i = 0; i < 5; i += 1) {
    text(ctx, '★', VIEW.width / 2 - 70 + i * 30, 52, 30, i < state.wanted ? '#ffd94d' : 'rgba(10,16,28,0.55)', 'left', true);
  }
  if (state.wanted > 0) text(ctx, 'WANTED', VIEW.width / 2, 78, 15, '#ff8080', 'center', true);
  drawMinimap(ctx, state);
  const objective = objectiveText(state);
  ctx.font = font(18, true);
  const ow = ctx.measureText(objective).width + 28;
  ctx.fillStyle = PALETTE.hudPanel;
  roundRect(ctx, (VIEW.width - ow) / 2, 88, ow, 34, 8);
  ctx.fill();
  text(ctx, objective, VIEW.width / 2, 111, 18, PALETTE.text, 'center', true);
  if (p.car) {
    const speed = Math.round(Math.hypot(p.car.vx || 0, p.car.vy || 0) * 0.12);
    text(ctx, `${speed} km/h`, VIEW.width - 24, VIEW.height - 64, 30, PALETTE.text, 'right', true);
    text(ctx, `Car ♥ ${Math.max(0, Math.ceil(p.car.health))}`, VIEW.width - 24, VIEW.height - 36, 18, p.car.health > 40 ? '#7ddb8a' : PALETTE.red, 'right', true);
  } else {
    text(ctx, 'WASD move · Mouse aim · Click shoot · F punch · E steal car · R job · P pause · Q save', VIEW.width / 2, VIEW.height - 16, 15, 'rgba(244,241,230,0.75)', 'center');
  }
  if (state.messageTimer > 0 && state.message) {
    ctx.font = font(19, true);
    const mw = ctx.measureText(state.message).width + 30;
    ctx.fillStyle = 'rgba(10,16,28,0.8)';
    roundRect(ctx, (VIEW.width - mw) / 2, VIEW.height - 118, mw, 36, 8);
    ctx.fill();
    text(ctx, state.message, VIEW.width / 2, VIEW.height - 93, 19, '#ffe9a8', 'center', true);
  }
  if (state.police.bustProgress > 0) {
    text(ctx, 'BUSTED INCOMING — MOVE!', VIEW.width / 2, 150, 22, '#ff8080', 'center', true);
  }
  const hour = Math.floor(state.timeOfDay * 24);
  const minute = Math.floor((state.timeOfDay * 24 - hour) * 60);
  const clock = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  const dayPart = state.timeOfDay < 0.12 || state.timeOfDay > 0.88 ? 'NIGHT' : state.timeOfDay < 0.22 || state.timeOfDay > 0.78 ? 'DUSK' : 'DAY';
  text(ctx, `${clock} · ${dayPart}`, 24, VIEW.height - 36, 18, PALETTE.text, 'left', true);
}

/** A centred menu panel: title, lines and a prompt — title, pause and game over. */
export function drawPanel(ctx, title, lines, prompt) {
  const width = 640;
  const height = 150 + lines.length * 36;
  const x = (VIEW.width - width) / 2;
  const y = (VIEW.height - height) / 2;
  ctx.fillStyle = 'rgba(10,16,28,0.88)';
  roundRect(ctx, x, y, width, height, 14);
  ctx.fill();
  ctx.strokeStyle = '#f2c94c';
  ctx.lineWidth = 3;
  roundRect(ctx, x, y, width, height, 14);
  ctx.stroke();
  text(ctx, title, VIEW.width / 2, y + 72, 52, PALETTE.gold, 'center', true);
  lines.forEach((line, i) => text(ctx, line, VIEW.width / 2, y + 118 + i * 36, 21, PALETTE.muted, 'center'));
  text(ctx, prompt, VIEW.width / 2, y + height - 30, 22, PALETTE.text, 'center', true);
}
