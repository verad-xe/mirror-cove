// shots.js — screenshot mode driven by URL parameters, for reproducible
// renders of real game states (used to produce the entry's screenshots).
//   ?shot=start                     the start screen
//   ?shot=play&level=2&found=3      level 2 running, first 3 differences found
//                                   through the normal find path, timer frozen
//   ?shot=clear&level=1             the level-clear overlay for level 1
// Every state is produced with the real engine and rendering code.

import { LEVELS } from './scenes.js';
import { SCREEN } from './engine.js';

export function parseShotParams(search) {
  const params = new URLSearchParams(search);
  const shot = params.get('shot');
  if (!shot) return null;
  const levelRaw = parseInt(params.get('level') || '1', 10);
  const foundRaw = parseInt(params.get('found') || '0', 10);
  const level = Number.isFinite(levelRaw) ? Math.min(Math.max(levelRaw, 1), LEVELS.length) : 1;
  const found = Number.isFinite(foundRaw) ? Math.max(foundRaw, 0) : 0;
  return { shot, level, found };
}

// Put the engine into the requested screenshot state.
// sfx is accepted so callers can keep sounds consistent; shot mode stays silent.
export function applyShot(engine, shotInfo) {
  if (!shotInfo) return false;
  const { shot, level, found } = shotInfo;
  const index = level - 1;
  if (shot === 'start') {
    engine.screen = SCREEN.START;
    engine.levelIndex = 0;
    return true;
  }
  if (shot === 'play') {
    engine.startLevel(index);
    engine.frozen = true;
    const diffs = engine.level.diffs;
    const count = Math.min(found, diffs.length - 1 >= 0 ? diffs.length : 0);
    // Find through the normal path, but never complete the level in a
    // play shot: cap at all-but-one when asked for everything.
    const n = Math.min(count, Math.max(0, diffs.length - 1));
    for (let i = 0; i < n; i++) engine.findDiff(diffs[i].id, 1);
    engine.effects = [];
    engine.screen = SCREEN.PLAYING;
    // A fixed, tidy timer value for the render.
    engine.timeLeft = Math.min(engine.level.timeLimit, 137);
    return true;
  }
  if (shot === 'clear') {
    engine.startLevel(index);
    engine.frozen = true;
    for (const diff of engine.level.diffs) engine.found.add(diff.id);
    engine.score = engine.level.diffs.length * 100;
    engine.lastBonus = 240;
    engine.score += engine.lastBonus;
    engine.totalScore = engine.score;
    engine.timeLeft = 120;
    engine.screen = engine.isLastLevel ? SCREEN.VICTORY : SCREEN.CLEAR;
    if (engine.screen === SCREEN.VICTORY) engine.screen = SCREEN.CLEAR;
    return true;
  }
  return false;
}
