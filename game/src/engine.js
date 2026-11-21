// engine.js — the game state machine for Mirror Cove.
// Owns the current screen, level, found set, misses, timer, hints and score.
// Rendering and input live elsewhere; this file is pure game logic plus a
// small event hook the sound layer and renderer subscribe to.

import { LEVELS } from './scenes.js';

export const SCREEN = {
  START: 'start',
  PLAYING: 'playing',
  PAUSED: 'paused',
  CLEAR: 'clear',
  FAILED: 'failed',
  VICTORY: 'victory',
};

export const HINTS_PER_LEVEL = 3;
export const MISS_PENALTY_SECONDS = 5;
export const FOUND_POINTS = 100;
export const HINT_COST_POINTS = 15;

export class GameEngine {
  constructor(onEvent = () => {}) {
    this.onEvent = onEvent;
    this.screen = SCREEN.START;
    this.levelIndex = 0;
    this.found = new Set();
    this.misses = 0;
    this.hintsLeft = HINTS_PER_LEVEL;
    this.hintTarget = null; // { id, until } while a hint pulse is showing
    this.timeLeft = 0;
    this.elapsed = 0;
    this.score = 0; // score for the current level
    this.totalScore = 0; // accumulated across cleared levels
    this.lastBonus = 0;
    this.frozen = false; // screenshot mode freezes the timer
    this.effects = []; // transient visual effects: { kind, x, y, panel, t }
    this.shake = 0; // remaining panel-shake time in seconds
    this.lastTickSecond = -1;
  }

  get level() {
    return LEVELS[this.levelIndex];
  }

  get totalDiffs() {
    return this.level.diffs.length;
  }

  get remaining() {
    return this.totalDiffs - this.found.size;
  }

  get isLastLevel() {
    return this.levelIndex >= LEVELS.length - 1;
  }

  emit(kind, data = {}) {
    this.onEvent(kind, data);
  }

  startGame() {
    this.totalScore = 0;
    this.startLevel(0);
  }

  startLevel(index) {
    this.levelIndex = index;
    this.found = new Set();
    this.misses = 0;
    this.hintsLeft = HINTS_PER_LEVEL;
    this.hintTarget = null;
    this.timeLeft = this.level.timeLimit;
    this.elapsed = 0;
    this.score = 0;
    this.lastBonus = 0;
    this.effects = [];
    this.shake = 0;
    this.lastTickSecond = Math.ceil(this.timeLeft);
    this.screen = SCREEN.PLAYING;
    this.emit('levelstart', { levelIndex: index });
  }

  retryLevel() {
    this.startLevel(this.levelIndex);
  }

  nextLevel() {
    if (this.isLastLevel) {
      this.screen = SCREEN.VICTORY;
      this.emit('victory', { totalScore: this.totalScore });
      return;
    }
    this.startLevel(this.levelIndex + 1);
  }

  togglePause() {
    if (this.screen === SCREEN.PLAYING) {
      this.screen = SCREEN.PAUSED;
      this.emit('pause', {});
    } else if (this.screen === SCREEN.PAUSED) {
      this.screen = SCREEN.PLAYING;
      this.emit('resume', {});
    }
  }

  // Register a found difference through the normal scoring path.
  // Returns true when the id was newly found.
  findDiff(id, panel = 1) {
    if (this.found.has(id)) return false;
    const diff = this.level.diffs.find((d) => d.id === id);
    if (!diff) return false;
    this.found.add(id);
    this.score += FOUND_POINTS;
    this.effects.push({ kind: 'found', x: diff.x, y: diff.y, r: diff.r, t: 0 });
    if (this.hintTarget && this.hintTarget.id === id) this.hintTarget = null;
    this.emit('found', { id, remaining: this.remaining });
    if (this.remaining === 0) this.completeLevel();
    return true;
  }

  completeLevel() {
    this.lastBonus = Math.max(0, Math.round(this.timeLeft)) * 2;
    this.score += this.lastBonus;
    this.totalScore += this.score;
    if (this.isLastLevel) {
      this.screen = SCREEN.VICTORY;
      this.emit('victory', { totalScore: this.totalScore, levelScore: this.score, bonus: this.lastBonus });
    } else {
      this.screen = SCREEN.CLEAR;
      this.emit('clear', { levelScore: this.score, bonus: this.lastBonus, totalScore: this.totalScore });
    }
  }

  // A click at panel coordinates. Returns 'found' | 'already' | 'miss' | null.
  clickAt(x, y) {
    if (this.screen !== SCREEN.PLAYING) return null;
    for (const diff of this.level.diffs) {
      const dx = x - diff.x;
      const dy = y - diff.y;
      if (dx * dx + dy * dy <= diff.r * diff.r) {
        if (this.found.has(diff.id)) return 'already';
        this.findDiff(diff.id);
        return 'found';
      }
    }
    // A miss: time penalty, counter, shake and a red cross effect.
    this.misses += 1;
    if (!this.frozen) this.timeLeft = Math.max(0, this.timeLeft - MISS_PENALTY_SECONDS);
    this.shake = 0.32;
    this.effects.push({ kind: 'miss', x, y, t: 0 });
    this.emit('miss', { misses: this.misses, timeLeft: this.timeLeft });
    if (this.timeLeft <= 0) this.failLevel();
    return 'miss';
  }

  useHint(nowSeconds) {
    if (this.screen !== SCREEN.PLAYING) return null;
    if (this.hintsLeft <= 0) return null;
    const next = this.level.diffs.find((d) => !this.found.has(d.id));
    if (!next) return null;
    this.hintsLeft -= 1;
    this.score = Math.max(0, this.score - HINT_COST_POINTS);
    this.hintTarget = { id: next.id, x: next.x, y: next.y, r: next.r, until: nowSeconds + 1.2 };
    this.emit('hint', { id: next.id, hintsLeft: this.hintsLeft });
    return next;
  }

  // Advance timers and effects. dt in seconds, nowSeconds is a monotonic clock.
  tick(dt, nowSeconds) {
    // Effects always age so pulses finish even while paused.
    for (const fx of this.effects) fx.t += dt;
    this.effects = this.effects.filter((fx) => fx.t < (fx.kind === 'found' ? 0.9 : 0.6));
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt);
    if (this.hintTarget && nowSeconds > this.hintTarget.until) this.hintTarget = null;
    if (this.screen !== SCREEN.PLAYING || this.frozen) return;
    this.timeLeft -= dt;
    this.elapsed += dt;
    const whole = Math.ceil(this.timeLeft);
    if (whole !== this.lastTickSecond) {
      this.lastTickSecond = whole;
      if (whole <= 10 && whole > 0) this.emit('tick', { secondsLeft: whole });
    }
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.failLevel();
    }
  }

  failLevel() {
    if (this.screen !== SCREEN.PLAYING) return;
    this.screen = SCREEN.FAILED;
    this.emit('fail', { levelIndex: this.levelIndex });
  }

  // Score summary for overlays.
  summary() {
    return {
      levelName: this.level.name,
      found: this.found.size,
      total: this.totalDiffs,
      misses: this.misses,
      timeLeft: Math.max(0, Math.ceil(this.timeLeft)),
      levelScore: this.score,
      bonus: this.lastBonus,
      totalScore: this.totalScore,
    };
  }
}

export function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return `${m}:${String(rest).padStart(2, '0')}`;
}
