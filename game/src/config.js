// Every tuning number for Kura Bay in one place. The world is a fixed 3200 x 2400
// city; the camera shows a 1280 x 720 window of it and scales to the browser window,
// so no rule here depends on the screen size.

export const WORLD = { width: 3200, height: 2400 };
export const VIEW = { width: 1280, height: 720 };

/** Fixed simulation step: 60 updates a second whatever the display rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 13,
  walkSpeed: 230,
  sprintSpeed: 330,
  health: 100,
  punchDamage: 25,
  punchRange: 46,
  punchCooldown: 0.45,
  shootCooldown: 0.22,
  bulletSpeed: 900,
  bulletDamage: 34,
  startAmmo: 48,
  maxAmmo: 120,
};

export const CAR = {
  length: 64,
  width: 32,
  accel: 420,
  brake: 620,
  maxSpeed: 560,
  reverseSpeed: 200,
  turnRate: 2.9,
  grip: 3.2,
  health: 100,
};

export const POLICE = {
  maxStars: 5,
  chaseSpeed: 500,
  bustRange: 30,
  bustTime: 1.6,
  spawnDistance: 620,
  heatPerCrime: 1,
  coolDown: 26,
};

export const TRAFFIC = { cars: 16, peds: 26 };
export const MONEY = { start: 120, missionPay: [400, 650, 900], shell: 25, fare: 60 };

/** Seconds of daylight in one full day cycle; the light overlay follows it. */
export const DAY_LENGTH = 240;

export const SAVE_KEY = 'kura-bay.save.v1';
export const BEST_KEY = 'kura-bay.best.v1';

export const PALETTE = {
  backdrop: '#0c1420',
  grass: '#5d9b4a',
  grassDark: '#4c8340',
  park: '#6fae57',
  sand: '#e8d29a',
  water: '#2e7fa8',
  waterDeep: '#1f5f86',
  road: '#3a3f47',
  roadLine: '#d8c95a',
  sidewalk: '#8d929b',
  building: '#b08954',
  building2: '#7d8aa0',
  building3: '#a06a5e',
  roof: '#5e4a38',
  glass: '#9fd8e8',
  text: '#f4f1e6',
  muted: '#c9c4ae',
  gold: '#f2c94c',
  red: '#e5534b',
  blue: '#4fc3f7',
  police: '#2f6fd0',
  hudPanel: 'rgba(10, 16, 28, 0.72)',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

// District names, in world order: each one paints its own flavour on the map.
export const DISTRICTS = [
  { name: 'MARINA', x: 0, y: 0, w: 800, h: 700, tint: '#7fb8c9' },
  { name: 'DOWNTOWN', x: 800, y: 0, w: 900, h: 900, tint: '#c9a86a' },
  { name: 'OLD TOWN', x: 1700, y: 0, w: 800, h: 800, tint: '#b98a6a' },
  { name: 'HARBOR', x: 2500, y: 0, w: 700, h: 800, tint: '#8aa8b8' },
  { name: 'MARKET ROW', x: 0, y: 700, w: 900, h: 800, tint: '#a8b06a' },
  { name: 'TORTOISE PARK', x: 900, y: 900, w: 900, h: 700, tint: '#7fae57' },
  { name: 'DOCKS', x: 1800, y: 800, w: 800, h: 700, tint: '#9a8a7a' },
  { name: 'SUNSET BEACH', x: 2600, y: 800, w: 600, h: 700, tint: '#e8d29a' },
  { name: 'HILLSIDE', x: 0, y: 1500, w: 1100, h: 900, tint: '#8a9a6a' },
  { name: 'INDUSTRIAL', x: 1100, y: 1600, w: 1100, h: 800, tint: '#7a7a72' },
  { name: 'PALM COURT', x: 2200, y: 1500, w: 1000, h: 900, tint: '#c9b06a' },
];
