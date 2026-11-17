// Drawing only: the city, the cars, the people, the day light and the particles,
// painted from the game state onto the canvas. The camera window is 1280 x 720 in
// world units, scaled to fit the browser window. The HUD and menus live in hud.js.

import { CAR, PALETTE, PLAYER, VIEW, WORLD } from './config.js';
import { ROADS_X, ROADS_Y, ROAD_HALF, districtAt } from './city.js';
import { drawHud, drawPanel } from './hud.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const fonts = new Map();

function font(size, bold) {
  const key = `${bold ? 'b' : ''}${size}`;
  if (!fonts.has(key)) fonts.set(key, `${bold ? '700 ' : ''}${size}px ${'system-ui, -apple-system, "Segoe UI", sans-serif'}`);
  return fonts.get(key);
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    view.scale = Math.min(canvas.width / VIEW.width, canvas.height / VIEW.height);
    view.x = (canvas.width - VIEW.width * view.scale) / 2;
    view.y = (canvas.height - VIEW.height * view.scale) / 2;
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawCarShape(x, y, angle, color, police) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    roundRect(-CAR.length / 2 + 3, -CAR.width / 2 + 4, CAR.length, CAR.width, 10);
    ctx.fill();
    ctx.fillStyle = color;
    roundRect(-CAR.length / 2, -CAR.width / 2, CAR.length, CAR.width, 10);
    ctx.fill();
    ctx.fillStyle = '#1d2733';
    roundRect(-12, -CAR.width / 2 + 5, 22, CAR.width - 10, 5);
    ctx.fill();
    ctx.fillStyle = police ? '#e8e8e8' : '#cfe8f2';
    roundRect(10, -CAR.width / 2 + 6, 12, CAR.width - 12, 4);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(CAR.length / 2 - 4, -CAR.width / 2 + 4, 3, 7);
    ctx.fillRect(CAR.length / 2 - 4, CAR.width / 2 - 11, 3, 7);
    ctx.fillStyle = '#e5534b';
    ctx.fillRect(-CAR.length / 2 + 1, -CAR.width / 2 + 4, 3, 7);
    ctx.fillRect(-CAR.length / 2 + 1, CAR.width / 2 - 11, 3, 7);
    if (police) {
      const flash = Math.floor(performance.now() / 260) % 2 === 0;
      ctx.fillStyle = flash ? '#ff4040' : '#3d7dff';
      ctx.beginPath();
      ctx.arc(-4, -CAR.width / 2 + 2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = flash ? '#3d7dff' : '#ff4040';
      ctx.beginPath();
      ctx.arc(6, -CAR.width / 2 + 2, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawCity(state) {
    const cam = state.camera;
    const city = state.city;
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(cam.x - 20, cam.y - 20, VIEW.width + 40, VIEW.height + 40);
    ctx.fillStyle = PALETTE.waterDeep;
    ctx.fillRect(city.water.x, city.water.y, city.water.w, city.water.h);
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(city.water.x, city.water.y, city.water.w, city.water.h - 6);
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(city.beach.x, city.beach.y, city.beach.w, city.beach.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(city.beach.x, city.beach.y);
    ctx.lineTo(city.beach.x, city.beach.y + city.beach.h);
    ctx.stroke();
    for (const park of city.parks) {
      ctx.fillStyle = PALETTE.park;
      ctx.fillRect(park.x, park.y, park.w, park.h);
    }
    ctx.fillStyle = PALETTE.road;
    for (const rx of ROADS_X) ctx.fillRect(rx - ROAD_HALF, 0, ROAD_HALF * 2, WORLD.height);
    for (const ry of ROADS_Y) ctx.fillRect(0, ry - ROAD_HALF, WORLD.width, ROAD_HALF * 2);
    ctx.fillStyle = PALETTE.roadLine;
    for (const rx of ROADS_X) {
      for (let y = 0; y < WORLD.height; y += 64) ctx.fillRect(rx - 2, y, 4, 30);
    }
    for (const ry of ROADS_Y) {
      for (let x = 0; x < WORLD.width; x += 64) ctx.fillRect(x, ry - 2, 30, 4);
    }
    for (const b of city.buildings) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(b.x + 5, b.y + 6, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.tall ? '#5e4a38' : '#7a5a40';
      ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
      ctx.fillStyle = PALETTE.glass;
      const cols = b.windows;
      for (let i = 0; i < cols; i += 1) {
        for (let j = 0; j < 2; j += 1) {
          ctx.fillRect(b.x + 12 + i * ((b.w - 24) / cols), b.y + 14 + j * (b.h / 2 - 10), (b.w - 24) / cols - 8, 12);
        }
      }
    }
    for (const tree of city.trees) {
      ctx.fillStyle = '#4c7a3a';
      ctx.beginPath();
      ctx.arc(tree.x, tree.y, tree.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6fae57';
      ctx.beginPath();
      ctx.arc(tree.x - 3, tree.y - 3, tree.r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.font = font(52, true);
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.textAlign = 'center';
    ctx.fillText(districtAt(cam.x + VIEW.width / 2, cam.y + VIEW.height / 2), cam.x + VIEW.width / 2, cam.y + 150);
    for (const shell of city.shells) {
      if (shell.taken) continue;
      const bob = Math.sin(shell.bob) * 3;
      ctx.fillStyle = PALETTE.gold;
      ctx.beginPath();
      ctx.arc(shell.x, shell.y + bob, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8a6a20';
      ctx.beginPath();
      ctx.arc(shell.x, shell.y + bob, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPeople(state) {
    const p = state.player;
    for (const ped of state.traffic.peds) {
      const bob = Math.sin(ped.walkPhase) * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(ped.x, ped.y + 10, 9, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ped.shirt;
      ctx.beginPath();
      ctx.arc(ped.x, ped.y + bob, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ped.color;
      ctx.beginPath();
      ctx.arc(ped.x, ped.y - 8 + bob, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const thug of state.combat.thugs) {
      if (thug.health <= 0) continue;
      ctx.fillStyle = thug.hitFlash > 0 ? '#ffffff' : '#3b2b3b';
      ctx.beginPath();
      ctx.arc(thug.x, thug.y, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d9a06a';
      ctx.beginPath();
      ctx.arc(thug.x, thug.y - 9, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e5534b';
      ctx.fillRect(thug.x - 14, thug.y - 26, 28 * Math.max(0, thug.health / 60), 4);
    }
    if (!p.car) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 11, 11, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1f8a70';
      ctx.beginPath();
      ctx.arc(p.x, p.y, PLAYER.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f2c94c';
      ctx.beginPath();
      ctx.arc(p.x, p.y - 4, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(244,241,230,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x + Math.cos(p.angle) * 16, p.y + Math.sin(p.angle) * 16);
      ctx.lineTo(p.x + Math.cos(p.angle) * 44, p.y + Math.sin(p.angle) * 44);
      ctx.stroke();
    }
  }

  function drawVehicles(state) {
    for (const car of state.parked) {
      if (car.taken) continue;
      drawCarShape(car.x, car.y, car.angle, car.color, false);
    }
    for (const car of state.traffic.cars) drawCarShape(car.x, car.y, car.angle, car.color, false);
    for (const car of state.police.cars) drawCarShape(car.x, car.y, car.angle, car.color, true);
    if (state.player.car) drawCarShape(state.player.car.x, state.player.car.y, state.player.car.angle, state.player.car.color, false);
  }

  function drawBulletsAndEffects(state) {
    for (const bullet of state.combat.bullets) {
      if (!bullet.active) continue;
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const effect of state.effects) {
      const a = Math.max(0, effect.life / effect.max);
      if (effect.kind === 'muzzle') {
        ctx.fillStyle = `rgba(255,233,168,${a})`;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, 12 * a + 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (effect.kind === 'crash') {
        ctx.fillStyle = `rgba(229,83,75,${a})`;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, 26 * (1 - a) + 8, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = `rgba(255,255,255,${a})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, 18 * (1 - a) + 6, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  function drawMarker(state) {
    const active = state.missions.active;
    let target = null;
    let color = '#f2c94c';
    let label = '';
    if (active) {
      const def = active.def;
      if (def.stops) {
        const stop = def.stops[Math.min(active.stopIndex, def.stops.length - 1)];
        target = stop;
        label = stop.label;
      } else if (def.target) {
        target = def.target;
        label = def.target.label;
      }
      color = '#4fc3f7';
    } else {
      const starts = [{ x: 1240, y: 1070 }, { x: 480, y: 1070 }, { x: 1440, y: 560 }];
      if (state.missions.available < 3) {
        target = starts[state.missions.available];
        label = 'Next job (R)';
      }
    }
    if (!target) return;
    const pulse = 26 + Math.sin(state.time * 4) * 6;
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(target.x, target.y, pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(target.x, target.y - pulse - 14);
    ctx.lineTo(target.x - 8, target.y - pulse + 2);
    ctx.lineTo(target.x + 8, target.y - pulse + 2);
    ctx.closePath();
    ctx.fill();
    ctx.font = font(20, true);
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(label, target.x, target.y - pulse - 22);
  }

  function drawDaylight(state) {
    const t = state.timeOfDay;
    let color = null;
    if (t < 0.12 || t > 0.88) color = 'rgba(8,12,34,0.55)';
    else if (t < 0.22) color = 'rgba(255,140,60,0.18)';
    else if (t > 0.78) color = 'rgba(255,110,60,0.22)';
    if (color) {
      ctx.fillStyle = color;
      ctx.fillRect(state.camera.x - 20, state.camera.y - 20, VIEW.width + 40, VIEW.height + 40);
    }
  }

  /** Paint one frame: the world, then the HUD or a menu panel for the screen. */
  function draw(state, screen, best) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    // The world transform scrolls with the camera; the HUD draws in screen space.
    ctx.save();
    ctx.translate(-state.camera.x, -state.camera.y);
    drawCity(state);
    drawMarker(state);
    drawVehicles(state);
    drawPeople(state);
    drawBulletsAndEffects(state);
    drawDaylight(state);
    ctx.restore();
    if (screen === SCREEN_TITLE) {
      drawPanel(ctx, 'KURA BAY', [
        'An open-world crime story in a sun-soaked coastal city.',
        'Steal cars, outrun the police, run jobs for Uncle Bowo.',
        'WASD move / drive · Mouse aim · Click shoot · F punch · E steal · R job',
        best > 0 ? `Best fortune so far: $${best}` : '',
      ], 'Press Space or click to start');
      return;
    }
    drawHud(ctx, state);
    if (screen === SCREEN_PAUSED) {
      drawPanel(ctx, 'PAUSED', ['The city waits for you.', 'Q saves your game. M mutes the sound.'], 'Press P to keep playing');
    } else if (screen === SCREEN_OVER) {
      drawPanel(ctx, 'WASTED', [`You held $${state.money} and finished ${state.missions.done.length}/3 jobs.`, 'The tortoise always gets up again.'], 'Press Space to play again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, view };
}
