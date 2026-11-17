// The city of Kura Bay: its road grid, buildings, parks, beach and harbour, all
// generated once from a seed. Roads run on a regular grid so traffic, police and the
// minimap can all read the same streets; blocks between them hold buildings, trees
// and plazas. Nothing here draws or moves — it only answers questions about the map.

import { WORLD } from './config.js';
import { clamp, range } from './random.js';

// Avenue and street centre lines, in world coordinates.
export const ROADS_X = [240, 640, 1040, 1440, 1840, 2240, 2640, 2960];
export const ROADS_Y = [220, 560, 900, 1240, 1580, 1920, 2180];
export const ROAD_HALF = 34;

export const BUILDING_COLORS = ['#b08954', '#7d8aa0', '#a06a5e', '#8a7a9a', '#6a8a7a', '#c2a06a', '#9a6a5a'];

export function createCity(random) {
  const buildings = [];
  const trees = [];
  const shells = [];
  const parks = [];

  // Beach along the east edge and the harbour water along the north-east corner.
  const beach = { x: WORLD.width - 190, y: 700, w: 190, h: 1700 };
  const water = { x: WORLD.width - 190, y: 0, w: 190, h: 700 };

  // Buildings fill every block between neighbouring roads, with a gap for the street.
  for (let gx = 0; gx < ROADS_X.length - 1; gx += 1) {
    for (let gy = 0; gy < ROADS_Y.length - 1; gy += 1) {
      const bx0 = ROADS_X[gx] + ROAD_HALF + 14;
      const bx1 = ROADS_X[gx + 1] - ROAD_HALF - 14;
      const by0 = ROADS_Y[gy] + ROAD_HALF + 14;
      const by1 = ROADS_Y[gy + 1] - ROAD_HALF - 14;
      if (bx1 - bx0 < 90 || by1 - by0 < 90) continue;
      // One block in three is a park or plaza instead of buildings.
      if (random() < 0.22) {
        parks.push({ x: bx0, y: by0, w: bx1 - bx0, h: by1 - by0 });
        const count = 4 + Math.floor(random() * 6);
        for (let t = 0; t < count; t += 1) {
          trees.push({ x: range(random, bx0 + 16, bx1 - 16), y: range(random, by0 + 16, by1 - 16), r: 10 + random() * 8 });
        }
        continue;
      }
      const cols = bx1 - bx0 > 260 ? 2 : 1;
      const rows = by1 - by0 > 240 ? 2 : 1;
      for (let cx = 0; cx < cols; cx += 1) {
        for (let cy = 0; cy < rows; cy += 1) {
          const w = (bx1 - bx0) / cols - 18;
          const h = (by1 - by0) / rows - 18;
          const x = bx0 + cx * ((bx1 - bx0) / cols) + 9;
          const y = by0 + cy * ((by1 - by0) / rows) + 9;
          buildings.push({
            x, y, w, h,
            color: BUILDING_COLORS[Math.floor(random() * BUILDING_COLORS.length)],
            tall: random() < 0.3,
            windows: 2 + Math.floor(random() * 4),
          });
        }
      }
    }
  }

  // Golden tortoise shells to collect, scattered on sidewalks and parks.
  for (let s = 0; s < 24; s += 1) {
    shells.push({
      x: range(random, 120, WORLD.width - 260),
      y: range(random, 120, WORLD.height - 120),
      taken: false,
      bob: random() * Math.PI * 2,
    });
  }

  // Landmarks the missions and the HUD name.
  const landmarks = [
    { name: 'Tortoise Plaza', x: 1240, y: 1070 },
    { name: 'Marina', x: 320, y: 300 },
    { name: 'Sunset Beach', x: 3050, y: 1500 },
    { name: 'Old Docks', x: 2100, y: 1000 },
    { name: 'Safehouse', x: 480, y: 1750 },
    { name: 'Market Row', x: 480, y: 1070 },
    { name: 'Palm Court', x: 2600, y: 1900 },
  ];

  return { buildings, trees, shells, parks, beach, water, landmarks };
}

/** True when the point sits on a road (within half a road width of a centre line). */
export function onRoad(x, y) {
  for (const rx of ROADS_X) if (Math.abs(x - rx) < ROAD_HALF) return true;
  for (const ry of ROADS_Y) if (Math.abs(y - ry) < ROAD_HALF) return true;
  return false;
}

/** Nearest road centre line to a point, for snapping traffic onto streets. */
export function nearestRoadX(x) {
  let best = ROADS_X[0];
  for (const rx of ROADS_X) if (Math.abs(rx - x) < Math.abs(best - x)) best = rx;
  return best;
}

export function nearestRoadY(y) {
  let best = ROADS_Y[0];
  for (const ry of ROADS_Y) if (Math.abs(ry - y) < Math.abs(best - y)) best = ry;
  return best;
}

/** Push a circle out of every building it overlaps; returns true when it hit one. */
export function collideBuildings(city, x, y, radius) {
  let hit = false;
  for (const b of city.buildings) {
    const cx = clamp(x, b.x, b.x + b.w);
    const cy = clamp(y, b.y, b.y + b.h);
    const dx = x - cx;
    const dy = y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius) {
      hit = true;
      const d = Math.sqrt(d2) || 0.001;
      const push = radius - d;
      // Caller re-reads the position, so nudge along the shallowest axis instead.
      if (Math.abs(dx) > Math.abs(dy)) x += (dx / d) * push;
      else y += (dy / d) * push;
    }
  }
  return { x, y, hit };
}

/** True when a circle overlaps any building (cheap test for spawns). */
export function insideBuilding(city, x, y, radius) {
  for (const b of city.buildings) {
    if (x + radius > b.x && x - radius < b.x + b.w && y + radius > b.y && y - radius < b.y + b.h) return true;
  }
  return false;
}

/** Name of the district a point stands in, for the HUD location line. */
export function districtAt(x, y) {
  if (x > WORLD.width - 200 && y > 700) return 'SUNSET BEACH';
  if (x > WORLD.width - 200) return 'HARBOR';
  if (x < 800 && y < 700) return 'MARINA';
  if (x < 900 && y < 1500) return y < 700 ? 'MARINA' : 'MARKET ROW';
  if (x < 1800 && y < 900) return 'DOWNTOWN';
  if (x >= 1800 && y < 800) return 'OLD TOWN';
  if (x >= 900 && x < 1800 && y >= 900 && y < 1600) return 'TORTOISE PARK';
  if (x >= 1800 && y >= 800 && y < 1500) return 'DOCKS';
  if (y >= 1500 && x < 1100) return 'HILLSIDE';
  if (y >= 1600 && x < 2200) return 'INDUSTRIAL';
  return 'PALM COURT';
}
