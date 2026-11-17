// The game state and its one fixed step: the player on foot or behind the wheel,
// car physics, shell pickups, the day cycle and the wiring between traffic, police,
// missions and combat. No drawing and no browser here — the renderer reads this state.

import { CAR, DAY_LENGTH, MONEY, PLAYER, STEP, WORLD } from './config.js';
import { createCity, collideBuildings, districtAt, onRoad } from './city.js';
import { createRandom, clamp, distance, range } from './random.js';
import { createTraffic, parkedCars, nearestStealable, stepTraffic, scarePeds } from './traffic.js';
import { createPolice, stepPolice, addWanted } from './police.js';
import { createMissions, stepMissions, tryStartMission } from './missions.js';
import { createCombat, playerPunch, playerShoot, stepCombat } from './combat.js';

export const EVENT_NONE = 0;

export function createGame(seed) {
  const random = createRandom(seed);
  const city = createCity(random);
  const state = {
    seed,
    city,
    random,
    time: 0,
    timeOfDay: 0.32,
    money: MONEY.start,
    shells: 0,
    wanted: 0,
    gameOver: false,
    paused: false,
    message: 'Welcome to Kura Bay. Steal a car, run jobs, stay ahead of the law.',
    messageTimer: 5,
    camera: { x: 1240, y: 1070 },
    player: {
      x: 1240, y: 1070, angle: -Math.PI / 2, health: PLAYER.health,
      ammo: PLAYER.startAmmo, car: null, moving: false,
    },
    traffic: createTraffic(random, city),
    parked: parkedCars(random, city),
    police: createPolice(),
    missions: createMissions(),
    combat: createCombat(random),
    effects: [],
    bustedCount: 0,
    missionsDone: [],
    stats: { carsStolen: 0, shellsFound: 0, thugsDown: 0, distanceDriven: 0 },
  };
  return state;
}

/** Put a loaded save back into a fresh state. */
export function applySave(state, save) {
  state.money = save.money;
  state.player.health = save.health;
  state.missions.done = save.missionsDone.slice();
  state.missions.available = Math.min(3, save.missionsDone.length);
  state.shells = save.shells;
  state.player.x = save.x;
  state.player.y = save.y;
  state.timeOfDay = save.timeOfDay;
  state.camera.x = save.x;
  state.camera.y = save.y;
  state.message = 'Save loaded. Welcome back to Kura Bay.';
  state.messageTimer = 3;
}

function driveCar(state, car, axes, dt, audio) {
  const forward = Math.cos(car.angle);
  const right = Math.sin(car.angle);
  const speedAlong = car.vx * forward + car.vy * right;
  const speedSide = -car.vx * right + car.vy * forward;
  let throttle = 0;
  if (axes.y < 0) throttle = CAR.accel;
  else if (axes.y > 0) throttle = speedAlong > 10 ? -CAR.brake : -CAR.accel * 0.6;
  const steer = axes.x * CAR.turnRate * clamp(Math.abs(speedAlong) / 120, 0, 1) * (speedAlong < 0 ? -1 : 1);
  car.angle += steer * dt;
  const f2 = Math.cos(car.angle);
  const r2 = Math.sin(car.angle);
  car.vx += f2 * throttle * dt;
  car.vy += r2 * throttle * dt;
  // Grip bleeds off sideways slide; drag caps top speed.
  const along2 = car.vx * f2 + car.vy * r2;
  const side2 = -car.vx * r2 + car.vy * f2;
  const keptSide = side2 * Math.max(0, 1 - CAR.grip * dt);
  car.vx = f2 * along2 - r2 * keptSide;
  car.vy = r2 * along2 + f2 * keptSide;
  car.vx *= 1 - 0.25 * dt;
  car.vy *= 1 - 0.25 * dt;
  const speed = Math.hypot(car.vx, car.vy);
  if (speed > CAR.maxSpeed) {
    car.vx *= CAR.maxSpeed / speed;
    car.vy *= CAR.maxSpeed / speed;
  }
  car.x += car.vx * dt;
  car.y += car.vy * dt;
  car.x = clamp(car.x, 50, WORLD.width - 210);
  car.y = clamp(car.y, 50, WORLD.height - 50);
  state.stats.distanceDriven += Math.abs(along2) * dt;
  // Buildings stop the car hard; traffic bumps slow it down.
  const fixed = collideBuildings(state.city, car.x, car.y, 26);
  if (fixed.hit && speed > 200) {
    car.health -= 12;
    if (audio) audio.crash();
    state.effects.push({ kind: 'crash', x: car.x, y: car.y, life: 0.4, max: 0.4 });
    car.vx *= -0.25;
    car.vy *= -0.25;
  }
  car.x = fixed.x;
  car.y = fixed.y;
  if (car.health <= 0) {
    state.player.car = null;
    state.message = 'Your car is wrecked! Bail out!';
    state.messageTimer = 3;
  }
}

function walkPlayer(state, axes, dt, aimAngle) {
  const p = state.player;
  const speed = axes.sprint ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
  const mx = axes.x;
  const my = axes.y;
  const len = Math.hypot(mx, my) || 1;
  p.moving = mx !== 0 || my !== 0;
  p.x += (mx / len) * speed * dt * (p.moving ? 1 : 0);
  p.y += (my / len) * speed * dt * (p.moving ? 1 : 0);
  p.angle = aimAngle;
  const fixed = collideBuildings(state.city, p.x, p.y, PLAYER.radius);
  p.x = clamp(fixed.x, 40, WORLD.width - 30);
  p.y = clamp(fixed.y, 40, WORLD.height - 40);
}

function collectShells(state, audio) {
  const p = state.player;
  for (const shell of state.city.shells) {
    if (shell.taken) continue;
    if (distance(p.x, p.y, shell.x, shell.y) < 34) {
      shell.taken = true;
      state.shells += 1;
      state.money += MONEY.shell;
      state.stats.shellsFound += 1;
      state.message = `Golden shell! +$${MONEY.shell} (${state.shells}/24)`;
      state.messageTimer = 2;
      if (audio) audio.coin();
    }
  }
}

function enterOrExitCar(state, audio) {
  const p = state.player;
  if (p.car) {
    const car = p.car;
    p.car = null;
    p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 44;
    p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 44;
    if (audio) audio.click();
    return;
  }
  const car = nearestStealable(state, p.x, p.y, 70);
  if (!car) return;
  if (car.police) return;
  if (car.parked) {
    car.parked = false;
    car.taken = true;
  } else {
    // Stealing a moving traffic car: its driver bails and the law notices.
    const index = state.traffic.cars.indexOf(car);
    if (index >= 0) state.traffic.cars.splice(index, 1);
    state.traffic.peds.push({ x: car.x + 40, y: car.y + 30, angle: 0, speed: 90, color: '#d9a06a', shirt: '#e8e8e8', panic: 3, walkPhase: 0, retarget: 0 });
    addWanted(state, 1, 'Car stolen! Witnesses called it in.');
    state.stats.carsStolen += 1;
  }
  car.vx = 0;
  car.vy = 0;
  if (car.health === undefined) car.health = CAR.health;
  p.car = car;
  if (audio) audio.click();
  state.message = 'Nice wheels. W/S to drive, E to get out.';
  state.messageTimer = 3;
}

/** One fixed step of the whole game. `input` carries axes, aim and one-shot actions. */
export function stepGame(state, input, dt, audio) {
  state.time += dt;
  state.timeOfDay = (state.timeOfDay + dt / DAY_LENGTH) % 1;
  state.messageTimer = Math.max(0, state.messageTimer - dt);
  for (const effect of state.effects) effect.life -= dt;
  state.effects = state.effects.filter((e) => e.life > 0);
  for (const shell of state.city.shells) shell.bob += dt;

  const p = state.player;
  if (state.gameOver) return EVENT_NONE;

  const actions = input.actions || 0;
  if (actions & 1) enterOrExitCar(state, audio);
  if (actions & 2 && !p.car) playerPunch(state, audio);
  if (actions & 16) tryStartMission(state, audio);
  if (input.clicked && !p.car) playerShoot(state, audio);

  if (p.car) {
    driveCar(state, p.car, input.axes, dt, audio);
    p.x = p.car.x;
    p.y = p.car.y;
    p.angle = p.car.angle;
    if (input.axes.y !== 0 && Math.random() < dt * 2) {
      if (audio) audio.engine();
    }
  } else {
    walkPlayer(state, input.axes, dt, input.aimAngle);
  }

  stepTraffic(state, dt);
  stepPolice(state, dt, audio);
  stepMissions(state, dt, audio);
  stepCombat(state, dt, audio);
  collectShells(state, audio);

  // Slow health regen out of combat keeps a long session playable.
  if (state.wanted === 0 && p.health > 0 && p.health < PLAYER.health) {
    p.health = Math.min(PLAYER.health, p.health + 1.5 * dt);
  }

  // Camera chases the player with a soft lag and stays inside the world.
  const tx = clamp(p.x - 640, 0, WORLD.width - 1280);
  const ty = clamp(p.y - 360, 0, WORLD.height - 720);
  state.camera.x += (tx - state.camera.x) * Math.min(1, dt * 4);
  state.camera.y += (ty - state.camera.y) * Math.min(1, dt * 4);
  state.district = districtAt(p.x, p.y);
  return EVENT_NONE;
}
