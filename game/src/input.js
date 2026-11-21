// input.js — pointer and keyboard input for Mirror Cove.
// Pointer clicks are converted from client coordinates through the canvas
// bounding rect into logical canvas coordinates, then into panel space.
// Keyboard control moves a reticle: arrows move, Tab switches panel,
// Enter/Space judges the reticle position, H hint, P pause, M mute, R restart.

import { PANEL_W, PANEL_H } from './scenes.js';
import { canvasToPanel } from './render.js';

export const RETICLE_STEP = 14;
export const RETICLE_STEP_FAST = 34;

export function createReticle() {
  return { panel: 1, x: PANEL_W / 2, y: PANEL_H / 2, visible: false };
}

// Attach all listeners. handlers: { onPanelClick(panel, x, y), onHint(),
// onPause(), onMute(), onRestart(), onAnyKey() }.
// Returns a detach function.
export function attachInput(canvas, reticle, handlers) {
  const disposers = [];

  function listen(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    disposers.push(() => target.removeEventListener(type, fn, opts));
  }

  function toLogical(evt) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      cx: (evt.clientX - rect.left) * scaleX,
      cy: (evt.clientY - rect.top) * scaleY,
    };
  }

  listen(canvas, 'pointerdown', (evt) => {
    evt.preventDefault();
    const { cx, cy } = toLogical(evt);
    const hit = canvasToPanel(cx, cy);
    if (!hit) return;
    reticle.panel = hit.panel;
    reticle.x = hit.x;
    reticle.y = hit.y;
    handlers.onPanelClick(hit.panel, hit.x, hit.y);
  });

  listen(canvas, 'pointermove', (evt) => {
    const { cx, cy } = toLogical(evt);
    const hit = canvasToPanel(cx, cy);
    canvas.style.cursor = hit ? 'crosshair' : 'default';
  });

  listen(window, 'keydown', (evt) => {
    const key = evt.key;
    handlers.onAnyKey();
    if (key === 'Tab') {
      evt.preventDefault();
      reticle.panel = reticle.panel === 0 ? 1 : 0;
      reticle.visible = true;
      return;
    }
    const step = evt.shiftKey ? RETICLE_STEP_FAST : RETICLE_STEP;
    switch (key) {
      case 'ArrowLeft':
        evt.preventDefault();
        reticle.x = Math.max(4, reticle.x - step);
        reticle.visible = true;
        break;
      case 'ArrowRight':
        evt.preventDefault();
        reticle.x = Math.min(PANEL_W - 4, reticle.x + step);
        reticle.visible = true;
        break;
      case 'ArrowUp':
        evt.preventDefault();
        reticle.y = Math.max(4, reticle.y - step);
        reticle.visible = true;
        break;
      case 'ArrowDown':
        evt.preventDefault();
        reticle.y = Math.min(PANEL_H - 4, reticle.y + step);
        reticle.visible = true;
        break;
      case 'Enter':
      case ' ':
        evt.preventDefault();
        if (reticle.visible) handlers.onPanelClick(reticle.panel, reticle.x, reticle.y);
        break;
      case 'h':
      case 'H':
        handlers.onHint();
        break;
      case 'p':
      case 'P':
        handlers.onPause();
        break;
      case 'm':
      case 'M':
        handlers.onMute();
        break;
      case 'r':
      case 'R':
        handlers.onRestart();
        break;
      default:
        break;
    }
  });

  return function detach() {
    for (const dispose of disposers) dispose();
  };
}
