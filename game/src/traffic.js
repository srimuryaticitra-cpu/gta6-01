// Traffic and pedestrians: the city breathing. Cars follow the road grid in lanes,
// slow for the car ahead and turn at intersections; pedestrians stroll the sidewalks,
// cross at corners and scatter when a car or a gunshot comes too close.

import { CAR, TRAFFIC, WORLD } from './config.js';
import { ROADS_X, ROADS_Y, ROAD_HALF, insideBuilding, nearestRoadX, nearestRoadY, onRoad } from './city.js';
import { clamp, distance, pick, range, turnToward } from './random.js';

export const CAR_COLORS = ['#d94f3d', '#3d7dd9', '#e8c33d', '#4fae5a', '#e8e8e8', '#2b2b2e', '#c97ad9', '#e88a3d'];
export const PED_COLORS = ['#e8b88a', '#8a5a3b', '#5a3b2b', '#d9a06a', '#b98a5a'];

function makeTrafficCar(random, city) {
  const alongX = random() < 0.5;
  const road = alongX ? pick(random, ROADS_X) : pick(random, ROADS_Y);
  const pos = alongX ? range(random, 100, WORLD.width - 100) : range(random, 100, WORLD.height - 100);
  const dir = random() < 0.5 ? 1 : -1;
  const lane = (random() < 0.5 ? -1 : 1) * 13;
  return {
    x: alongX ? pos : road + lane,
    y: alongX ? road + lane : pos,
    angle: alongX ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2),
    speed: range(random, 110, 190),
    cruise: range(random, 130, 200),
    color: pick(random, CAR_COLORS),
    alongX,
    dir,
    wobble: random() * Math.PI * 2,
    honk: 0,
  };
}

function makePed(random) {
  const road = Math.random() < 0.5;
  return {
    x: range(random, 120, WORLD.width - 220),
    y: range(random, 120, WORLD.height - 120),
    angle: random() * Math.PI * 2,
    speed: range(random, 45, 85),
    color: pick(random, PED_COLORS),
    shirt: pick(random, ['#d94f3d', '#3d7dd9', '#e8c33d', '#4fae5a', '#c97ad9', '#e8e8e8']),
    panic: 0,
    walkPhase: random() * Math.PI * 2,
    retarget: 0,
  };
}

export function createTraffic(random, city) {
  const cars = [];
  const peds = [];
  for (let i = 0; i < TRAFFIC.cars; i += 1) cars.push(makeTrafficCar(random, city));
  for (let i = 0; i < TRAFFIC.peds; i += 1) peds.push(makePed(random));
  return { cars, peds };
}

/** A traffic car is also a car the player can steal: park a few by the kerb. */
export function parkedCars(random, city) {
  const parked = [];
  const spots = [
    { x: 640, y: 260, angle: 0 }, { x: 1040, y: 600, angle: Math.PI / 2 },
    { x: 1440, y: 940, angle: 0 }, { x: 1840, y: 1280, angle: Math.PI / 2 },
    { x: 2240, y: 560, angle: 0 }, { x: 1240, y: 1620, angle: Math.PI / 2 },
    { x: 640, y: 1960, angle: 0 }, { x: 2640, y: 1240, angle: Math.PI / 2 },
    { x: 480, y: 900, angle: 0 }, { x: 2040, y: 1960, angle: Math.PI / 2 },
  ];
  for (const spot of spots) {
    parked.push({
      x: spot.x, y: spot.y, angle: spot.angle, speed: 0,
      color: pick(random, CAR_COLORS), parked: true, health: CAR.health,
      driver: null, police: false,
    });
  }
  return parked;
}

function aheadBlocked(car, cars, playerCar) {
  const nx = car.x + Math.cos(car.angle) * 70;
  const ny = car.y + Math.sin(car.angle) * 70;
  for (const other of cars) {
    if (other === car) continue;
    if (distance(nx, ny, other.x, other.y) < 52) return true;
  }
  if (playerCar && distance(nx, ny, playerCar.x, playerCar.y) < 56) return true;
  return false;
}

export function stepTraffic(state, dt) {
  const { cars, peds } = state.traffic;
  const playerCar = state.player.car;
  for (const car of cars) {
    // Turn at an intersection now and then; otherwise hold the lane.
    const nearX = nearestRoadX(car.x);
    const nearY = nearestRoadY(car.y);
    const atCross = Math.abs(car.x - nearX) < 40 && Math.abs(car.y - nearY) < 40;
    if (atCross && Math.random() < dt * 0.25) {
      car.alongX = !car.alongX;
      car.angle = car.alongX ? (car.dir > 0 ? 0 : Math.PI) : (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    }
    const blocked = aheadBlocked(car, cars, playerCar);
    const target = blocked ? 0 : car.cruise;
    car.speed += clamp(target - car.speed, -260 * dt, 180 * dt);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    // Wrap around the far edge so the streets never empty out.
    if (car.x < 60) car.x = WORLD.width - 80;
    if (car.x > WORLD.width - 60) car.x = 80;
    if (car.y < 60) car.y = WORLD.height - 80;
    if (car.y > WORLD.height - 60) car.y = 80;
    // Keep on the road: drift back toward the nearest lane line.
    if (car.alongX) car.y += clamp(nearestRoadY(car.y) + (car.dir > 0 ? -13 : 13) - car.y, -40 * dt, 40 * dt);
    else car.x += clamp(nearestRoadX(car.x) + (car.dir > 0 ? -13 : 13) - car.x, -40 * dt, 40 * dt);
  }

  for (const ped of peds) {
    ped.walkPhase += dt * 8;
    ped.retarget -= dt;
    if (ped.panic > 0) {
      ped.panic -= dt;
      const away = Math.atan2(ped.y - state.player.y, ped.x - state.player.x);
      ped.angle = away;
      ped.x += Math.cos(away) * 190 * dt;
      ped.y += Math.sin(away) * 190 * dt;
    } else {
      if (ped.retarget <= 0) {
        ped.retarget = 2 + Math.random() * 4;
        ped.angle += -1.2 + Math.random() * 2.4;
      }
      ped.x += Math.cos(ped.angle) * ped.speed * dt;
      ped.y += Math.sin(ped.angle) * ped.speed * dt;
      if (insideBuilding(state.city, ped.x, ped.y, 10)) {
        ped.angle += Math.PI / 2;
        ped.x -= Math.cos(ped.angle) * ped.speed * dt * 2;
        ped.y -= Math.sin(ped.angle) * ped.speed * dt * 2;
      }
    }
    ped.x = clamp(ped.x, 60, WORLD.width - 260);
    ped.y = clamp(ped.y, 60, WORLD.height - 60);
  }
}

/** Pedestrians near a gunshot or a speeding car panic and run. */
export function scarePeds(state, x, y, radius) {
  for (const ped of state.traffic.peds) {
    if (distance(ped.x, ped.y, x, y) < radius) ped.panic = 2.5;
  }
}

/** The nearest parked or traffic car within reach of a point, for stealing. */
export function nearestStealable(state, x, y, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of state.parked) {
    if (car.taken) continue;
    const d = distance(x, y, car.x, car.y);
    if (d < bestD) { bestD = d; best = car; }
  }
  for (const car of state.traffic.cars) {
    const d = distance(x, y, car.x, car.y);
    if (d < bestD && Math.abs(car.speed) < 40) { bestD = d; best = car; }
  }
  return best;
}
