// A small seeded generator (xorshift32): the same seed always deals the same city
// traffic and the same screenshot scenes, which is what makes the staged shots
// repeatable from one run to the next.

export function createRandom(seed) {
  let state = (seed | 0) || 0x9e3779b9;
  return function random() {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

/** Pick one entry of an array with the seeded generator. */
export function pick(random, list) {
  return list[Math.floor(random() * list.length)];
}

/** A number between low and high, from the seeded generator. */
export function range(random, low, high) {
  return low + random() * (high - low);
}

export function clamp(value, low, high) {
  return value < low ? low : value > high ? high : value;
}

export function distance(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}

export function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

/** Shortest signed turn from angle a toward angle b, in radians. */
export function turnToward(a, b, maxStep) {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (diff > maxStep) return maxStep;
  if (diff < -maxStep) return -maxStep;
  return diff;
}
