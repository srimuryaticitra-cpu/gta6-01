// The screenshot scenes behind ?shot=cover|chase|mission|night. Each one sets the
// real game state to a fixed, readable moment — a real position, real traffic, real
// police, a real mission — then the renderer paints it twice, so the frame a
// screenshot takes is exactly what a player sees at that moment in a real game.

import { STEP } from './config.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stepGame } from './world.js';
import { addWanted } from './police.js';
import { tryStartMission } from './missions.js';

const IDLE_INPUT = { axes: { x: 0, y: 0, sprint: false }, actions: 0, clicked: false, aimAngle: -Math.PI / 2 };

function driveForward(state, seconds, steer) {
  const input = { axes: { x: steer || 0, y: -1, sprint: false }, actions: 0, clicked: false, aimAngle: 0 };
  for (let i = 0; i < seconds / STEP; i += 1) stepGame(state, input, STEP, null);
}

function walkAbout(state, seconds) {
  for (let i = 0; i < seconds / STEP; i += 1) stepGame(state, IDLE_INPUT, STEP, null);
}

/**
 * Set `state` to the named scene and return the screen to draw over it and the best
 * fortune to show. Unknown names fall back to the cover scene.
 */
export function stageShot(name, state) {
  const p = state.player;
  if (name === 'chase') {
    // Mid-chase on the Downtown avenues: the player in a stolen car, three stars,
    // cruisers closing in, traffic all around.
    p.x = 1440; p.y = 560;
    const car = state.parked[3];
    car.taken = true; car.parked = false; car.vx = 0; car.vy = 0; car.health = 100;
    car.x = 1440; car.y = 560; car.angle = 0;
    p.car = car;
    addWanted(state, 3, '');
    state.message = 'WANTED — lose the cops!';
    state.messageTimer = 5;
    driveForward(state, 2.2, 0);
    state.camera.x = Math.max(0, p.x - 640);
    state.camera.y = Math.max(0, p.y - 360);
    return { screen: SCREEN_PLAY, best: state.money };
  }
  if (name === 'mission') {
    // The Tortoise Run in progress: parcel two of three, timer running, the next
    // drop-off marked on the road ahead.
    p.x = 480; p.y = 1070;
    state.missions.available = 1;
    tryStartMission(state, null);
    state.missions.active.stopIndex = 1;
    state.missions.active.timer = 96;
    const car = state.parked[8];
    car.taken = true; car.parked = false; car.vx = 0; car.vy = 0; car.health = 100;
    // On the avenue at x=640, heading south down a real road, not into a building.
    car.x = 640; car.y = 1000; car.angle = Math.PI / 2;
    p.car = car;
    p.x = car.x; p.y = car.y;
    driveForward(state, 1.2, 0);
    state.camera.x = Math.max(0, p.x - 640);
    state.camera.y = Math.max(0, p.y - 360);
    return { screen: SCREEN_PLAY, best: state.money };
  }
  if (name === 'night') {
    // Night on foot at Sunset Beach: the player facing down a thug, shells on the
    // sand, the sea and the beach behind them.
    state.timeOfDay = 0.95;
    p.x = 3050; p.y = 1450;
    p.car = null;
    p.angle = Math.PI / 2;
    const thug = state.combat.thugs[4];
    thug.x = 3050; thug.y = 1560; thug.health = 60; thug.state = 'chase';
    state.message = 'Night at Sunset Beach — a thug is closing in. Click to shoot, F to punch!';
    state.messageTimer = 5;
    state.camera.x = Math.max(0, p.x - 640);
    state.camera.y = Math.max(0, p.y - 360);
    walkAbout(state, 0.4);
    state.timeOfDay = 0.95;
    return { screen: SCREEN_PLAY, best: state.money };
  }
  // Cover: on foot at Tortoise Plaza at midday, traffic and pedestrians passing,
  // the first job marker glowing, HUD and minimap on full display. The player
  // stands just off the marker so both are visible at once.
  p.x = 1150; p.y = 1180;
  p.car = null;
  p.angle = -Math.PI / 4;
  state.timeOfDay = 0.32;
  state.camera.x = Math.max(0, p.x - 640);
  state.camera.y = Math.max(0, p.y - 360);
  walkAbout(state, 1.2);
  state.timeOfDay = 0.32;
  return { screen: SCREEN_PLAY, best: state.money };
}
