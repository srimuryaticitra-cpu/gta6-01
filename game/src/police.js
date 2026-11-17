// The wanted level and the Kura Bay police. Crimes raise stars; police cars spawn
// off-screen, chase the player, ram their car and try to bust them on foot. Stars
// cool down when the player stays out of sight, and a bust costs money and the car.

import { POLICE, WORLD } from './config.js';
import { clamp, distance, turnToward } from './random.js';
import { onRoad } from './city.js';

export function createPolice() {
  return { cars: [], bustProgress: 0, cooldown: 0, sirenTimer: 0 };
}

export function addWanted(state, stars, reason) {
  const before = state.wanted;
  state.wanted = clamp(state.wanted + stars, 0, POLICE.maxStars);
  state.police.cooldown = POLICE.coolDown;
  if (state.wanted > before) {
    state.message = reason || 'The police are onto you!';
    state.messageTimer = 3;
  }
}

function spawnPoliceCar(state) {
  const p = state.player;
  const angle = Math.random() * Math.PI * 2;
  let x = p.x + Math.cos(angle) * POLICE.spawnDistance;
  let y = p.y + Math.sin(angle) * POLICE.spawnDistance;
  x = clamp(x, 80, WORLD.width - 260);
  y = clamp(y, 80, WORLD.height - 80);
  state.police.cars.push({
    x, y, angle: Math.atan2(p.y - y, p.x - x), speed: 0,
    color: '#2f6fd0', police: true, health: 100, siren: Math.random() * 2,
  });
}

export function stepPolice(state, dt, audio) {
  const police = state.police;
  const p = state.player;
  police.sirenTimer -= dt;
  if (state.wanted > 0 && police.sirenTimer <= 0) {
    police.sirenTimer = 1.1;
    if (audio) audio.siren();
  }
  // Wanted strength sets how many cruisers hunt at once: one per star, up to five.
  const wantedCount = state.wanted;
  while (police.cars.length < wantedCount) spawnPoliceCar(state);
  while (police.cars.length > wantedCount) police.cars.pop();

  const target = p.car || p;
  let nearest = Infinity;
  for (const car of police.cars) {
    const dist = distance(car.x, car.y, target.x, target.y);
    nearest = Math.min(nearest, dist);
    const wantAngle = Math.atan2(target.y - car.y, target.x - car.x);
    car.angle += turnToward(car.angle, wantAngle, 2.4 * dt);
    const cruise = Math.min(POLICE.chaseSpeed, 260 + state.wanted * 60);
    car.speed += clamp(cruise - car.speed, -500 * dt, 420 * dt);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    car.siren += dt;
    // Ramming the player's car damages it; touching the player on foot busts them.
    if (p.car) {
      if (distance(car.x, car.y, p.car.x, p.car.y) < 58) {
        p.car.health -= 26 * dt;
        p.car.x += Math.cos(car.angle) * 30 * dt;
        p.car.y += Math.sin(car.angle) * 30 * dt;
        if (p.car.health <= 0) {
          state.message = 'Your car is wrecked! Bail out!';
          state.messageTimer = 3;
          state.player.car = null;
          if (audio) audio.crash();
        }
      }
    } else if (dist < POLICE.bustRange && car.speed < 260) {
      police.bustProgress += dt;
      state.message = 'BUSTED — hold still... no, RUN! (move to break free)';
      state.messageTimer = 0.5;
      if (police.bustProgress >= POLICE.bustTime) {
        bustPlayer(state, audio);
      }
    } else {
      police.bustProgress = Math.max(0, police.bustProgress - dt * 2);
    }
  }

  // Cooling off: no police in sight and no fresh crime, stars bleed away.
  if (state.wanted > 0) {
    police.cooldown -= dt;
    if (police.cooldown <= 0 && nearest > 700) {
      state.wanted -= 1;
      police.cooldown = POLICE.coolDown;
      state.message = state.wanted === 0 ? 'You lost them. The heat is off.' : 'Heat dropping...';
      state.messageTimer = 2.5;
    }
  }
  return nearest;
}

export function bustPlayer(state, audio) {
  const fine = Math.min(state.money, 150);
  state.money -= fine;
  state.wanted = 0;
  state.police.cars = [];
  state.police.bustProgress = 0;
  state.player.health = Math.max(30, state.player.health - 10);
  state.player.car = null;
  // Waking up at the station steps the player back to the plaza.
  state.player.x = 1240;
  state.player.y = 1070;
  state.message = `BUSTED! Fined $${fine}. Released at Tortoise Plaza.`;
  state.messageTimer = 4;
  state.bustedCount = (state.bustedCount || 0) + 1;
  if (audio) audio.busted();
}

export function wantedStars(state) {
  return state.wanted;
}
