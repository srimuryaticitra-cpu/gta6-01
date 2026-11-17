# Kura Bay — an open-world crime game

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/srimuryaticitra-cpu/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/srimuryaticitra-cpu/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Kura Bay** is a complete open-world crime game that runs offline in a desktop
browser from static files — no build step, no network, no libraries. You play
Rani "Shell" Kartika, a courier who owes the wrong people money, in a sun-soaked
coastal city of her own: eleven districts from the Marina and Downtown to Sunset
Beach, the Docks and Tortoise Park.

## What is in the game

- **A city to explore on foot and by car** — 3200×2400 world, road grid, parks,
  beach, harbour, 100+ buildings, traffic and pedestrians who stroll, cross and
  scatter when trouble starts.
- **Cars to steal and drive** — walk up to a parked car or a slow traffic car and
  press E. Driving has acceleration, braking, steering, grip and car damage.
- **A wanted level with police who respond** — crimes raise 1–5 stars; cruisers
  spawn, chase, ram your car and try to bust you on foot. Stay out of sight and
  the heat cools off; a bust costs a fine and drops you at the plaza.
- **Missions and a story** — three jobs for fixer Uncle Bowo: steal a car for a
  Marina drop-off, a timed three-stop delivery run, and an escape from a 3-star
  police cordon to the Safehouse. Each pays cash and unlocks the next.
- **Combat on foot** — punch up close (F) or shoot toward the mouse (click).
  Rival crew thugs wander the Docks and Downtown, chase you when provoked and
  swing back. Ammo and health are on the HUD.
- **HUD with a minimap** — cash, health, ammo, golden shells (24 to collect),
  wanted stars, a live mission objective banner, speedometer, day clock and a
  minimap with roads, police dots, the mission target and your position.
- **Start screen, pause and save** — title screen, P to pause, Q to save your
  money, jobs, shells and position to localStorage and pick up where you left off.
- **Sound and day cycle** — WebAudio-synthesized effects (shots, crashes, sirens,
  pickups) and a bass line that quickens when wanted, plus a full day cycle from
  bright noon through dusk to night.
- **Extras** — golden tortoise shells to collect for cash, health that slowly
  recovers out of trouble, and a best-fortune record.

## How to run it

```sh
node serve.ts
# then open http://localhost:8080 in desktop Chrome
```

Or open `game/index.html` directly from any static file server. The game needs
no network connection.

## Controls

| Key | Action |
| --- | --- |
| W A S D / arrows | Move on foot, drive the car |
| Shift | Sprint on foot |
| Mouse | Aim on foot |
| Click | Shoot |
| F | Punch |
| E | Steal / enter a car, get out |
| R | Start the next job at its marker |
| P / Esc | Pause |
| Q | Save game |
| M | Mute sound |
| Space / click | Start, restart |

## Screenshots

The four shots in `screenshots/` are real renders of this game's own code in
headless Chrome (seed 7): the cover at Tortoise Plaza, a 3-star police chase, the
timed delivery mission, and a night fight on Sunset Beach.

## Tech

Vanilla JavaScript ES modules, 2D canvas, no external library. The source is
split by job: `game/src/city.js` (the map), `traffic.js`, `police.js`,
`missions.js`, `combat.js`, `hud.js`, `render.js`, `audio.js`, `save.js`,
`world.js`, `input.js`, `random.js`, `config.js`, `shots.js`, `main.js`.

MIT licensed. Built for the make.fun gta6-01 bounty — an original game; nothing
in it comes from any commercial game.
