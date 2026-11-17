// On-foot combat: fists, a pistol, rival crew thugs and bullets. Thugs wander the
// Docks and Downtown, chase the player when provoked and swing back; the player
// punches up close (F) or shoots toward the mouse (click). Bullets are pooled, like
// everything else that flies.

import { PLAYER, WORLD } from './config.js';
import { clamp, distance, pick, range } from './random.js';
import { addWanted } from './police.js';
import { scarePeds } from './traffic.js';

export function createCombat(random) {
  const thugs = [];
  const spots = [
    { x: 2100, y: 1000 }, { x: 2200, y: 1120 }, { x: 1440, y: 560 },
    { x: 1900, y: 900 }, { x: 2600, y: 1900 }, { x: 1100, y: 1750 },
  ];
  for (const spot of spots) {
    thugs.push({
      x: spot.x + range(random, -60, 60), y: spot.y + range(random, -60, 60),
      angle: random() * Math.PI * 2, health: 60, speed: 120,
      cooldown: 0, state: 'idle', wander: 0, hitFlash: 0,
    });
  }
  const bullets = [];
  for (let i = 0; i < 40; i += 1) bullets.push({ active: false, x: 0, y: 0, angle: 0, speed: 0, life: 0, friendly: true });
  return { thugs, bullets, punchTimer: 0, shootTimer: 0 };
}

/** Player punch: the nearest thug in range and in front takes damage. */
export function playerPunch(state, audio) {
  const combat = state.combat;
  if (combat.punchTimer > 0) return;
  combat.punchTimer = PLAYER.punchCooldown;
  const p = state.player;
  let hitAny = false;
  for (const thug of combat.thugs) {
    if (thug.health <= 0) continue;
    if (distance(p.x, p.y, thug.x, thug.y) < PLAYER.punchRange) {
      thug.health -= PLAYER.punchDamage;
      thug.state = 'chase';
      thug.hitFlash = 0.2;
      hitAny = true;
      if (thug.health <= 0) {
        state.money += 40;
        state.message = 'Thug down! +$40';
        state.messageTimer = 2;
      }
    }
  }
  if (audio) audio.punch();
  if (hitAny) addWanted(state, 0, '');
  state.effects.push({ kind: 'punch', x: p.x + Math.cos(p.angle) * 30, y: p.y + Math.sin(p.angle) * 30, life: 0.18, max: 0.18 });
}

/** Player shot toward the mouse aim: one pooled bullet, one ammo. */
export function playerShoot(state, audio) {
  const combat = state.combat;
  const p = state.player;
  if (combat.shootTimer > 0 || p.ammo <= 0) return;
  combat.shootTimer = PLAYER.shootCooldown;
  p.ammo -= 1;
  const bullet = combat.bullets.find((b) => !b.active);
  if (!bullet) return;
  bullet.active = true;
  bullet.friendly = true;
  bullet.x = p.x + Math.cos(p.angle) * 20;
  bullet.y = p.y + Math.sin(p.angle) * 20;
  bullet.angle = p.angle;
  bullet.speed = PLAYER.bulletSpeed;
  bullet.life = 0.9;
  scarePeds(state, p.x, p.y, 320);
  addWanted(state, 1, 'Shots fired! The police are coming!');
  if (audio) audio.shoot();
  state.effects.push({ kind: 'muzzle', x: bullet.x, y: bullet.y, life: 0.08, max: 0.08 });
}

function thugPunch(state, thug, audio) {
  const p = state.player;
  p.health -= 8;
  thug.cooldown = 0.9;
  if (audio) audio.punch();
  state.effects.push({ kind: 'hit', x: p.x, y: p.y, life: 0.25, max: 0.25 });
  if (p.health <= 0) {
    p.health = 0;
    state.gameOver = true;
    state.message = 'You got beaten down. The city wins this round.';
  }
}

export function stepCombat(state, dt, audio) {
  const combat = state.combat;
  const p = state.player;
  combat.punchTimer = Math.max(0, combat.punchTimer - dt);
  combat.shootTimer = Math.max(0, combat.shootTimer - dt);

  for (const thug of combat.thugs) {
    if (thug.health <= 0) continue;
    thug.hitFlash = Math.max(0, thug.hitFlash - dt);
    thug.cooldown = Math.max(0, thug.cooldown - dt);
    const d = distance(thug.x, thug.y, p.x, p.y);
    if (thug.state === 'chase' || d < 220) thug.state = 'chase';
    if (thug.state === 'chase') {
      const want = Math.atan2(p.y - thug.y, p.x - thug.x);
      thug.angle = want;
      if (d > 34) {
        thug.x += Math.cos(want) * thug.speed * dt;
        thug.y += Math.sin(want) * thug.speed * dt;
      } else if (thug.cooldown <= 0 && !p.car) {
        thugPunch(state, thug, audio);
      }
      if (d > 700) thug.state = 'idle';
    } else {
      thug.wander -= dt;
      if (thug.wander <= 0) {
        thug.wander = 2 + Math.random() * 3;
        thug.angle = Math.random() * Math.PI * 2;
      }
      thug.x = clamp(thug.x + Math.cos(thug.angle) * 55 * dt, 60, WORLD.width - 260);
      thug.y = clamp(thug.y + Math.sin(thug.angle) * 55 * dt, 60, WORLD.height - 60);
    }
  }

  for (const bullet of combat.bullets) {
    if (!bullet.active) continue;
    bullet.life -= dt;
    bullet.x += Math.cos(bullet.angle) * bullet.speed * dt;
    bullet.y += Math.sin(bullet.angle) * bullet.speed * dt;
    if (bullet.life <= 0 || bullet.x < 0 || bullet.x > WORLD.width || bullet.y < 0 || bullet.y > WORLD.height) {
      bullet.active = false;
      continue;
    }
    if (bullet.friendly) {
      for (const thug of combat.thugs) {
        if (thug.health <= 0) continue;
        if (distance(bullet.x, bullet.y, thug.x, thug.y) < 20) {
          thug.health -= PLAYER.bulletDamage;
          thug.state = 'chase';
          thug.hitFlash = 0.2;
          bullet.active = false;
          state.effects.push({ kind: 'hit', x: thug.x, y: thug.y, life: 0.25, max: 0.25 });
          if (thug.health <= 0) {
            state.money += 40;
            state.message = 'Thug down! +$40';
            state.messageTimer = 2;
          }
          break;
        }
      }
    }
  }
}
