// Missions and the story of Kura Bay. Rani "Shell" Kartika, a courier who owes the
// wrong people money, works her way out through three jobs for fixer Uncle Bowo,
// then a free-roam finale. Each mission has a start marker, an objective the HUD
// shows, a target on the minimap and a cash payout.

import { MONEY } from './config.js';
import { distance } from './random.js';
import { addWanted } from './police.js';

export const MISSION_DEFS = [
  {
    id: 0, title: 'M1 · First Wheels',
    giver: 'Uncle Bowo',
    brief: 'Steal any car and bring it to the Marina drop-off. No questions, no cops.',
    start: { x: 1240, y: 1070, label: 'Tortoise Plaza' },
    target: { x: 320, y: 300, label: 'Marina drop-off' },
    pay: MONEY.missionPay[0],
    needsCar: true,
  },
  {
    id: 1, title: 'M2 · The Tortoise Run',
    giver: 'Uncle Bowo',
    brief: 'Hot parcels for three buyers, 150 seconds. Drive fast, drive clean.',
    start: { x: 480, y: 1070, label: 'Market Row' },
    stops: [
      { x: 2100, y: 1000, label: 'Old Docks' },
      { x: 2600, y: 1900, label: 'Palm Court' },
      { x: 3050, y: 1500, label: 'Sunset Beach' },
    ],
    pay: MONEY.missionPay[1],
    timeLimit: 150,
  },
  {
    id: 2, title: 'M3 · Cordon Break',
    giver: 'Rani herself',
    brief: 'The heat is on — 3 stars and a cordon around Downtown. Reach the Safehouse alive.',
    start: { x: 1440, y: 560, label: 'Downtown' },
    target: { x: 480, y: 1750, label: 'Safehouse' },
    pay: MONEY.missionPay[2],
    wantedOnStart: 3,
    timeLimit: 120,
  },
];

export function createMissions() {
  return {
    active: null, // { def, stopIndex, timer, stage }
    available: 0,
    done: [],
  };
}

export function missionMarker(state) {
  const def = MISSION_DEFS[state.missions.available];
  return def || null;
}

/** Start the next unplayed mission when the player stands on its marker. */
export function tryStartMission(state, audio) {
  const def = missionMarker(state);
  if (!def) return false;
  if (distance(state.player.x, state.player.y, def.start.x, def.start.y) > 90) return false;
  state.missions.active = { def, stopIndex: 0, timer: def.timeLimit || 0, stage: 'go' };
  if (def.wantedOnStart) addWanted(state, def.wantedOnStart, 'The cordon is up! Lose the cops and reach the Safehouse!');
  state.message = `${def.title} — ${def.brief}`;
  state.messageTimer = 5;
  if (audio) audio.mission();
  return true;
}

function finishMission(state, audio, won, reason) {
  const active = state.missions.active;
  if (!active) return;
  state.missions.active = null;
  if (won) {
    state.money += active.def.pay;
    state.missions.done.push(active.def.id);
    state.missions.available = Math.min(MISSION_DEFS.length, state.missions.available + 1);
    state.message = `Mission complete! +$${active.def.pay} — ${active.def.title}`;
    state.messageTimer = 4;
    if (audio) audio.mission();
  } else {
    state.message = `Mission failed: ${reason}. Talk to Bowo and try again (R).`;
    state.messageTimer = 4;
  }
}

/** Advance the active mission: timers, arrivals, payouts. Returns nothing. */
export function stepMissions(state, dt, audio) {
  const active = state.missions.active;
  if (!active) return;
  const def = active.def;
  if (active.timer > 0) {
    active.timer -= dt;
    if (active.timer <= 0) {
      finishMission(state, audio, false, 'out of time');
      return;
    }
  }
  const p = state.player;
  if (def.stops) {
    const stop = def.stops[active.stopIndex];
    if (distance(p.x, p.y, stop.x, stop.y) < 80) {
      active.stopIndex += 1;
      state.money += 50;
      if (audio) audio.coin();
      if (active.stopIndex >= def.stops.length) {
        finishMission(state, audio, true);
      } else {
        state.message = `Drop ${active.stopIndex} done (+$50). Next: ${def.stops[active.stopIndex].label}`;
        state.messageTimer = 3;
      }
    }
    return;
  }
  if (def.target && distance(p.x, p.y, def.target.x, def.target.y) < 90) {
    if (def.needsCar && !p.car) {
      state.message = 'You need a car for the drop-off — steal one (E near a car)!';
      state.messageTimer = 3;
      return;
    }
    finishMission(state, audio, true);
  }
}

/** Current objective text for the HUD, or null when free roaming. */
export function objectiveText(state) {
  const active = state.missions.active;
  if (active) {
    const def = active.def;
    if (def.stops) {
      const stop = def.stops[Math.min(active.stopIndex, def.stops.length - 1)];
      return `${def.title}: deliver to ${stop.label} (${active.stopIndex + 1}/${def.stops.length})${active.timer > 0 ? ` — ${Math.ceil(active.timer)}s` : ''}`;
    }
    return `${def.title}: reach ${def.target.label}${active.timer > 0 ? ` — ${Math.ceil(active.timer)}s` : ''}`;
  }
  const next = missionMarker(state);
  if (next) return `Next job: ${next.title} — go to ${next.start.label} and press R`;
  return 'Free roam — steal a car (E), collect shells, cause trouble';
}
