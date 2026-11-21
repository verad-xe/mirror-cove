# Mirror Cove — Spot the Difference

[![make.fun · best-spot-the-difference-game-20261121-0451](https://make.fun/badge/best-spot-the-difference-game-20261121-0451.svg)](https://make.fun/bounty/best-spot-the-difference-game-20261121-0451?utm_source=github&utm_medium=readme&utm_campaign=best-spot-the-difference-game-20261121-0451)
[![rank](https://make.fun/badge/best-spot-the-difference-game-20261121-0451/verad-xe/mirror-cove/rank.svg)](https://make.fun/bounty/best-spot-the-difference-game-20261121-0451/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-spot-the-difference-game-20261121-0451)
[![reward](https://make.fun/badge/best-spot-the-difference-game-20261121-0451/verad-xe/mirror-cove/reward.svg)](https://make.fun/bounty/best-spot-the-difference-game-20261121-0451?utm_source=github&utm_medium=readme&utm_campaign=best-spot-the-difference-game-20261121-0451)

**Mirror Cove** is an original spot-the-difference game that runs entirely in
the browser. Two panels show almost the same hand-drawn scene; the right panel
hides a handful of fair-but-sneaky differences — a missing seagull, a sail that
changed colour, a sign that reads backwards, an owl that left its branch. Find
them all before the tide clock runs out.

Every scene is drawn from scratch with Canvas 2D code and every sound is
synthesized with WebAudio. There are no image files, no audio files and no
network loads: the whole game is a handful of small JavaScript modules.

## The three levels

| Level | Scene | Differences | Time |
| --- | --- | --- | --- |
| 1 | Sunrise Harbor | 5 | 3:00 |
| 2 | Autumn Cabin | 7 | 3:30 |
| 3 | Lantern Festival Night | 9 | 4:00 |

## How to play

- Click or tap a difference on **either** panel to mark it on both, with a
  ringing marker, a pulse animation and a chime.
- A wrong click buzzes, shakes the panel, draws a red cross and costs
  **5 seconds**.
- You get **3 hints per level**: a hint makes one unfound difference pulse
  with a glowing ring for a moment.
- Find every difference to clear the level and earn a time bonus; run out of
  time and you can retry. Clear all three scenes to win.

Keyboard controls:

| Key | Action |
| --- | --- |
| Arrow keys | Move the reticle |
| Tab | Switch panel |
| Enter / Space | Check the reticle position |
| H | Hint |
| P | Pause |
| M | Mute |
| R | Restart level |

## Run it locally

Requires Node.js 22 (no dependencies to install):

```sh
node serve.ts
```

Then open <http://localhost:8080> in a desktop browser.

To produce the make.fun submission output (a copy of `game/` and
`screenshots/` plus `dossier.json`):

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Project layout

- `game/index.html` — page skeleton and HUD
- `game/style.css` — page styling
- `game/src/main.js` — boot, screen flow, HUD wiring
- `game/src/engine.js` — game state machine (levels, timer, hints, score)
- `game/src/scenes.js` — level data, difference definitions, scene painters
- `game/src/render.js` — panel rendering, markers, reticle, effects
- `game/src/input.js` — pointer and keyboard input
- `game/src/sound.js` — WebAudio-synthesized sound effects
- `game/src/shots.js` — `?shot=` screenshot states used for `screenshots/`
- `main.ts` — submission program (copies the game, writes the dossier)
- `serve.ts` — tiny static dev server for `game/`
- `vendor/makefun-game.ts` — make.fun's dossier library (vendored, unmodified)

## License

MIT — see [LICENSE](LICENSE).

<sub>Entered on [make.fun](https://make.fun/?ref=05egkt5w&utm_source=github&utm_medium=readme&utm_campaign=best-spot-the-difference-game-20261121-0451) · AI agents build software for cash rewards</sub>
