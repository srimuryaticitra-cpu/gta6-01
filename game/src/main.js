// Boot and the one loop for Kura Bay: input is read every frame, the world advances
// in fixed 1/60 s steps, and the renderer paints what is there. Screens: title,
// play, paused and game over. A save loads on boot when one exists.
//
// ?seed=N fixes the city's traffic and layout. ?shot=cover|chase|mission|night (with
// &seed=N) stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.

import { STEP } from './config.js';
import { createRandom } from './random.js';
import { createGame, stepGame, applySave } from './world.js';
import { ACT_CONFIRM, ACT_ENTER, ACT_MISSION, ACT_MUTE, ACT_PAUSE, ACT_PUNCH, ACT_SAVE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { createAudio } from './audio.js';
import { loadSave, writeSave, loadBest, writeBest } from './save.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const state = createGame(seed);
const renderer = createRenderer(canvas);
const audio = createAudio();

const saved = loadSave();
if (saved) applySave(state, saved);
let best = loadBest();
if (state.money > best) {
  best = state.money;
  writeBest(best);
}

function announce(message) {
  status.textContent = message;
}

function runShot(name) {
  const scene = stageShot(name, state);
  let painted = 0;
  function paint() {
    renderer.draw(state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();

  function startGame() {
    state.gameOver = false;
    state.player.health = 100;
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    announce('Playing Kura Bay. Steal a car, run jobs, stay ahead of the law.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (state.money > best) {
      best = state.money;
      writeBest(best);
    }
    announce(`Wasted. You held $${state.money}. Best $${best}.`);
  }

  function saveNow() {
    if (writeSave(state)) {
      state.message = 'Game saved.';
      state.messageTimer = 2;
    } else {
      state.message = 'Save failed — storage is off in this browser.';
      state.messageTimer = 2;
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    const clicked = input.takeClick();
    if (actions & ACT_MUTE) {
      const muted = audio.toggleMute();
      state.message = muted ? 'Sound off (M to turn back on).' : 'Sound on.';
      state.messageTimer = 2;
    }
    if (actions & ACT_SAVE && screen === SCREEN_PLAY) saveNow();
    if (actions & ACT_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) startGame();
    else if (actions & ACT_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACT_PAUSE | ACT_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
    if (screen === SCREEN_PLAY) {
      // Aim follows the mouse: screen point back into world coordinates.
      const rect = canvas.getBoundingClientRect();
      const scaleX = 1280 / rect.width;
      const scaleY = 720 / rect.height;
      const worldX = state.camera.x + input.mouse.x * scaleX;
      const worldY = state.camera.y + input.mouse.y * scaleY;
      const aimAngle = Math.atan2(worldY - state.player.y, worldX - state.player.x);
      // One-shot presses and the click belong to the first step of this frame only.
      let stepActions = actions;
      let stepClick = clicked;
      while (accumulator >= STEP) {
        stepGame(state, {
          axes: input.axes(),
          actions: stepActions,
          clicked: stepClick,
          aimAngle,
        }, STEP, audio);
        stepActions = 0;
        stepClick = false;
        accumulator -= STEP;
        if (state.gameOver) {
          endGame();
          break;
        }
      }
      audio.music(STEP, state.wanted);
    } else {
      accumulator = 0;
    }
    renderer.draw(state, screen, best);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Kura Bay. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
