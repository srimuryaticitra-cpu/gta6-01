// Keyboard and mouse input. Held keys give movement and driving; one-shot presses
// (enter a car, punch, pause, start a mission, mute) are queued as flags and taken
// once by the loop, so a press between two frames is never lost or counted twice.
// The mouse aims on foot and fires with a click.

export const ACT_ENTER = 1;
export const ACT_PUNCH = 2;
export const ACT_PAUSE = 4;
export const ACT_CONFIRM = 8;
export const ACT_MISSION = 16;
export const ACT_MUTE = 32;
export const ACT_SAVE = 64;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const SPRINT = new Set(['ShiftLeft', 'ShiftRight']);
const ENTER = new Set(['KeyE']);
const PUNCH = new Set(['KeyF']);
const PAUSE = new Set(['KeyP', 'Escape']);
const CONFIRM = new Set(['Space', 'Enter']);
const MISSION = new Set(['KeyR']);
const MUTE = new Set(['KeyM']);
const SAVE = new Set(['KeyQ']);

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  const mouse = { x: 0, y: 0, down: false, clicked: false };

  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code) || DOWN.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code) || SPRINT.has(event.code)) {
      held.add(event.code);
      event.preventDefault();
      return;
    }
    if (event.repeat) return;
    if (ENTER.has(event.code)) actions |= ACT_ENTER;
    else if (PUNCH.has(event.code)) actions |= ACT_PUNCH;
    else if (PAUSE.has(event.code)) actions |= ACT_PAUSE;
    else if (CONFIRM.has(event.code)) actions |= ACT_CONFIRM;
    else if (MISSION.has(event.code)) actions |= ACT_MISSION;
    else if (MUTE.has(event.code)) actions |= ACT_MUTE;
    else if (SAVE.has(event.code)) actions |= ACT_SAVE;
    else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  window.addEventListener('blur', () => held.clear());

  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
    mouse.down = true;
    mouse.clicked = true;
    if (event.target === canvas) actions |= ACT_CONFIRM;
  });
  window.addEventListener('pointerup', () => {
    mouse.down = false;
  });

  function anyHeld(set) {
    for (const code of set) if (held.has(code)) return true;
    return false;
  }

  return {
    mouse,
    /** -1/0/1 steering and throttle axes from the held keys. */
    axes() {
      return {
        x: (anyHeld(RIGHT) ? 1 : 0) - (anyHeld(LEFT) ? 1 : 0),
        y: (anyHeld(DOWN) ? 1 : 0) - (anyHeld(UP) ? 1 : 0),
        sprint: anyHeld(SPRINT),
      };
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    takeClick() {
      const clicked = mouse.clicked;
      mouse.clicked = false;
      return clicked;
    },
  };
}
