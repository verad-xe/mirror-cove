// main.js — boot and screen flow for Mirror Cove.
// Wires the engine, renderer, input and sound together, owns the HUD and the
// DOM overlays (start / clear / failed / victory), and runs the frame loop.

import { GameEngine, SCREEN, formatTime } from './engine.js';
import { LEVELS } from './scenes.js';
import { drawGame, CANVAS_W, CANVAS_H } from './render.js';
import { attachInput, createReticle } from './input.js';
import { SoundFX } from './sound.js';
import { parseShotParams, applyShot } from './shots.js';

const $ = (id) => document.getElementById(id);

const canvas = $('game-canvas');
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;
const ctx = canvas.getContext('2d');

const sfx = new SoundFX();
const reticle = createReticle();

const engine = new GameEngine((kind) => {
  switch (kind) {
    case 'found': sfx.found(); break;
    case 'miss': sfx.miss(); break;
    case 'hint': sfx.hint(); break;
    case 'clear': sfx.clear(); break;
    case 'victory': sfx.victory(); break;
    case 'fail': sfx.fail(); break;
    case 'tick': sfx.tick(); break;
    case 'pause': sfx.pause(); break;
    default: break;
  }
  refreshOverlays();
});

// ---- HUD -------------------------------------------------------------------

const hud = {
  levelName: $('hud-level'),
  left: $('hud-left'),
  found: $('hud-found'),
  misses: $('hud-misses'),
  time: $('hud-time'),
  timeBar: $('hud-timebar-fill'),
  score: $('hud-score'),
  hintBtn: $('btn-hint'),
  muteBtn: $('btn-mute'),
};

function refreshHud() {
  const level = LEVELS[engine.levelIndex];
  hud.levelName.textContent = `Level ${engine.levelIndex + 1} · ${level.name}`;
  hud.left.textContent = `Differences left: ${engine.remaining}`;
  hud.found.textContent = `Found: ${engine.found.size} / ${engine.totalDiffs}`;
  hud.misses.textContent = `Misses: ${engine.misses}`;
  hud.time.textContent = formatTime(engine.timeLeft);
  const frac = Math.max(0, Math.min(1, engine.timeLeft / level.timeLimit));
  hud.timeBar.style.width = `${(frac * 100).toFixed(1)}%`;
  hud.timeBar.style.background = frac <= 10 / level.timeLimit || engine.timeLeft <= 10 ? '#e5484d' : frac < 0.3 ? '#e8a13c' : '#57c785';
  hud.score.textContent = `Score: ${engine.totalScore + (engine.screen === 'clear' || engine.screen === 'victory' ? 0 : engine.score)}`;
  hud.hintBtn.textContent = `Hint (${engine.hintsLeft})`;
  hud.hintBtn.disabled = engine.hintsLeft <= 0 || engine.screen !== SCREEN.PLAYING;
  hud.muteBtn.textContent = sfx.muted ? 'Sound: Off (M)' : 'Sound: On (M)';
}

// ---- Overlays ---------------------------------------------------------------

const overlays = {
  start: $('overlay-start'),
  clear: $('overlay-clear'),
  failed: $('overlay-failed'),
  victory: $('overlay-victory'),
};

function showOverlay(el, visible) {
  el.classList.toggle('hidden', !visible);
}

function refreshOverlays() {
  const s = engine.summary();
  showOverlay(overlays.start, engine.screen === SCREEN.START);
  showOverlay(overlays.clear, engine.screen === SCREEN.CLEAR);
  showOverlay(overlays.failed, engine.screen === SCREEN.FAILED);
  showOverlay(overlays.victory, engine.screen === SCREEN.VICTORY);
  if (engine.screen === SCREEN.CLEAR) {
    $('clear-title').textContent = `${s.levelName} — Clear!`;
    $('clear-stats').textContent =
      `Found all ${s.total} differences with ${s.misses} miss${s.misses === 1 ? '' : 'es'}. ` +
      `Time bonus: +${s.bonus}. Level score: ${s.levelScore}. Total: ${s.totalScore}.`;
    $('btn-next').textContent = `Next Level: ${LEVELS[engine.levelIndex + 1].name}`;
  }
  if (engine.screen === SCREEN.FAILED) {
    $('failed-stats').textContent =
      `Time ran out on ${s.levelName}. You found ${s.found} of ${s.total} differences.`;
  }
  if (engine.screen === SCREEN.VICTORY) {
    $('victory-stats').textContent =
      `You cleared every scene! Final total score: ${s.totalScore}.`;
  }
  refreshHud();
}

// ---- Actions -----------------------------------------------------------------

function nowSeconds() {
  return performance.now() / 1000;
}

function handlePanelClick(panel, x, y) {
  if (engine.screen === SCREEN.START) return;
  if (engine.screen !== SCREEN.PLAYING) return;
  sfx.unlock();
  const before = engine.effects.length;
  const result = engine.clickAt(x, y);
  if (result === 'found') {
    // click sound is replaced by the chime via the engine event.
  } else if (result === 'miss') {
    for (let i = before; i < engine.effects.length; i++) {
      if (engine.effects[i].kind === 'miss') engine.effects[i].panel = panel;
    }
  } else if (result === 'already') {
    sfx.click();
  }
  refreshOverlays();
  refreshHud();
}

function handleHint() {
  if (engine.useHint(nowSeconds())) refreshHud();
}

function handleMute() {
  sfx.unlock();
  sfx.toggleMuted();
  refreshHud();
}

attachInput(canvas, reticle, {
  onPanelClick: handlePanelClick,
  onHint: handleHint,
  onPause: () => { engine.togglePause(); refreshOverlays(); },
  onMute: handleMute,
  onRestart: () => {
    if (engine.screen === SCREEN.PLAYING || engine.screen === SCREEN.PAUSED ||
        engine.screen === SCREEN.FAILED || engine.screen === SCREEN.CLEAR) {
      engine.retryLevel();
      refreshOverlays();
    }
  },
  onAnyKey: () => {},
});

// ---- Buttons -----------------------------------------------------------------

$('btn-start').addEventListener('click', () => {
  sfx.unlock();
  sfx.click();
  engine.startGame();
  refreshOverlays();
});
$('btn-next').addEventListener('click', () => {
  sfx.unlock();
  sfx.click();
  engine.nextLevel();
  refreshOverlays();
});
$('btn-retry').addEventListener('click', () => {
  sfx.unlock();
  sfx.click();
  engine.retryLevel();
  refreshOverlays();
});
$('btn-again').addEventListener('click', () => {
  sfx.unlock();
  sfx.click();
  engine.startGame();
  refreshOverlays();
});
hud.hintBtn.addEventListener('click', () => { sfx.unlock(); handleHint(); });
hud.muteBtn.addEventListener('click', handleMute);
$('btn-pause').addEventListener('click', () => { engine.togglePause(); refreshOverlays(); });
$('btn-restart').addEventListener('click', () => {
  if (engine.screen !== SCREEN.START) {
    engine.retryLevel();
    refreshOverlays();
  }
});

// ---- Frame loop ---------------------------------------------------------------

let lastTimestamp = null;

function frame(timestamp) {
  if (lastTimestamp === null) lastTimestamp = timestamp;
  const dt = Math.min(0.05, (timestamp - lastTimestamp) / 1000);
  lastTimestamp = timestamp;
  engine.tick(dt, timestamp / 1000);
  drawGame(ctx, engine, reticle, timestamp / 1000);
  refreshHud();
  requestAnimationFrame(frame);
}

// ---- Boot ----------------------------------------------------------------------

const shotInfo = parseShotParams(window.location.search);
if (shotInfo) {
  applyShot(engine, shotInfo);
} else {
  engine.screen = SCREEN.START;
}
refreshOverlays();
requestAnimationFrame(frame);
