// Saving and loading through localStorage: money, health, missions finished, shells
// collected, the player's spot on the map and the best score. Nothing leaves the
// browser; a missing or broken save simply starts a fresh game.

import { BEST_KEY, SAVE_KEY } from './config.js';

function readJson(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadSave() {
  const data = readJson(SAVE_KEY);
  if (!data || typeof data !== 'object') return null;
  return {
    money: typeof data.money === 'number' ? data.money : 120,
    health: typeof data.health === 'number' ? data.health : 100,
    missionsDone: Array.isArray(data.missionsDone) ? data.missionsDone : [],
    shells: typeof data.shells === 'number' ? data.shells : 0,
    x: typeof data.x === 'number' ? data.x : 1240,
    y: typeof data.y === 'number' ? data.y : 1070,
    timeOfDay: typeof data.timeOfDay === 'number' ? data.timeOfDay : 0.3,
  };
}

export function writeSave(state) {
  return writeJson(SAVE_KEY, {
    money: state.money,
    health: state.player.health,
    missionsDone: state.missionsDone,
    shells: state.shells,
    x: state.player.x,
    y: state.player.y,
    timeOfDay: state.timeOfDay,
  });
}

export function loadBest() {
  const data = readJson(BEST_KEY);
  return data && typeof data.money === 'number' ? data.money : 0;
}

export function writeBest(money) {
  writeJson(BEST_KEY, { money });
}
