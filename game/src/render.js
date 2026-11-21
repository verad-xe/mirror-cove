// render.js — draws both panels (scene + found markers + effects + reticle)
// onto the single game canvas. Layout constants are shared with input.js so
// pointer coordinates map exactly onto what is drawn.

import { PANEL_W, PANEL_H, LEVELS, ALL_DIFF_IDS, EMPTY_SET, paintScene } from './scenes.js';

export const LAYOUT = {
  pad: 10,
  gap: 20,
  top: 10,
  panelW: PANEL_W,
  panelH: PANEL_H,
};

export const CANVAS_W = LAYOUT.pad * 2 + PANEL_W * 2 + LAYOUT.gap;
export const CANVAS_H = LAYOUT.top * 2 + PANEL_H;

// Canvas x of a panel's left edge.
export function panelOriginX(panel) {
  return LAYOUT.pad + panel * (PANEL_W + LAYOUT.gap);
}

// Convert canvas coordinates to { panel, x, y } in panel space, or null.
export function canvasToPanel(cx, cy) {
  const y = cy - LAYOUT.top;
  if (y < 0 || y > PANEL_H) return null;
  for (let panel = 0; panel < 2; panel++) {
    const x = cx - panelOriginX(panel);
    if (x >= 0 && x <= PANEL_W) return { panel, x, y };
  }
  return null;
}

// Convert panel space back to canvas coordinates.
export function panelToCanvas(panel, x, y) {
  return { x: panelOriginX(panel) + x, y: LAYOUT.top + y };
}

function drawPanelBackdrop(ctx, panel) {
  const ox = panelOriginX(panel);
  const oy = LAYOUT.top;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = '#10131f';
  ctx.fillRect(ox - 3, oy - 3, PANEL_W + 6, PANEL_H + 6);
  ctx.restore();
}

function drawPanelFrame(ctx, panel) {
  const ox = panelOriginX(panel);
  const oy = LAYOUT.top;
  ctx.strokeStyle = panel === 0 ? '#8fa3c8' : '#e8b04b';
  ctx.lineWidth = 2;
  ctx.strokeRect(ox - 1.5, oy - 1.5, PANEL_W + 3, PANEL_H + 3);
  // Panel caption.
  ctx.fillStyle = 'rgba(10,12,22,0.72)';
  ctx.fillRect(ox + 8, oy + 8, panel === 0 ? 86 : 92, 20);
  ctx.fillStyle = '#f2ead2';
  ctx.font = 'bold 11px Verdana, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(panel === 0 ? 'ORIGINAL' : 'CHANGED', ox + 14, oy + 18.5);
}

function drawFoundMarker(ctx, panel, diff, now) {
  const { x, y } = panelToCanvas(panel, diff.x, diff.y);
  const pulse = 1 + Math.sin(now * 3.2) * 0.05;
  const r = (diff.r + 5) * pulse;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(30,200,120,0.95)';
  ctx.lineWidth = 3.4;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, r - 4.5, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(220,255,235,0.85)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Small check badge at the top-right of the ring.
  ctx.beginPath();
  ctx.arc(x + r * 0.72, y - r * 0.72, 7.5, 0, Math.PI * 2);
  ctx.fillStyle = '#1ec878';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + r * 0.72 - 3.6, y - r * 0.72);
  ctx.lineTo(x + r * 0.72 - 1, y - r * 0.72 + 2.8);
  ctx.lineTo(x + r * 0.72 + 3.8, y - r * 0.72 - 2.8);
  ctx.stroke();
  ctx.restore();
}

function drawEffects(ctx, engine) {
  for (const fx of engine.effects) {
    for (let panel = 0; panel < 2; panel++) {
      const { x, y } = panelToCanvas(panel, fx.x, fx.y);
      if (fx.kind === 'found') {
        const p = fx.t / 0.9;
        const r = (fx.r + 5) + p * 26;
        ctx.save();
        ctx.globalAlpha = 1 - p;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffd76a';
        ctx.lineWidth = 3 * (1 - p) + 0.6;
        ctx.stroke();
        ctx.restore();
      } else if (fx.kind === 'miss' && panel === (fx.panel ?? 0)) {
        // Miss crosses are drawn only on the clicked panel; fx.panel is set
        // by main.js when it forwards the click position.
        const s = 9;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - fx.t / 0.6);
        ctx.strokeStyle = '#ff5148';
        ctx.lineWidth = 3.4;
        ctx.beginPath();
        ctx.moveTo(x - s, y - s);
        ctx.lineTo(x + s, y + s);
        ctx.moveTo(x + s, y - s);
        ctx.lineTo(x - s, y + s);
        ctx.stroke();
        ctx.restore();
      }
    }
  }
}

function drawHintPulse(ctx, engine, now) {
  if (!engine.hintTarget) return;
  const h = engine.hintTarget;
  const wave = (Math.sin(now * 10) + 1) / 2;
  for (let panel = 0; panel < 2; panel++) {
    const { x, y } = panelToCanvas(panel, h.x, h.y);
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, h.r + 6 + wave * 7, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(120,220,255,${0.55 + wave * 0.45})`;
    ctx.lineWidth = 3.2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, h.r + 16 + wave * 10, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(120,220,255,${0.25 + wave * 0.3})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

function drawReticle(ctx, reticle) {
  if (!reticle || !reticle.visible) return;
  const { x, y } = panelToCanvas(reticle.panel, reticle.x, reticle.y);
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  const r = 13;
  const gap = 5;
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    ctx.beginPath();
    ctx.moveTo(x + dx * gap, y + dy * gap);
    ctx.lineTo(x + dx * r, y + dy * r);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(x, y, 2.2, 0, Math.PI * 2);
  ctx.fillStyle = '#ffd76a';
  ctx.fill();
  ctx.restore();
}

// Main draw: both scenes (with shake on a miss), markers, effects, overlays
// that belong on the canvas (pause veil). DOM overlays are handled in main.js.
export function drawGame(ctx, engine, reticle, now) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = '#171a29';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  const level = LEVELS[engine.levelIndex];
  const shakeAmp = engine.shake > 0 ? Math.sin(now * 70) * engine.shake * 9 : 0;
  for (let panel = 0; panel < 2; panel++) {
    const ox = panelOriginX(panel);
    const oy = LAYOUT.top;
    drawPanelBackdrop(ctx, panel);
    ctx.save();
    ctx.translate(ox + shakeAmp, oy);
    const active = panel === 0 ? EMPTY_SET : ALL_DIFF_IDS[engine.levelIndex];
    paintScene(ctx, engine.levelIndex, active);
    ctx.restore();
    drawPanelFrame(ctx, panel);
  }
  // Found markers on both panels.
  for (const diff of level.diffs) {
    if (!engine.found.has(diff.id)) continue;
    drawFoundMarker(ctx, 0, diff, now);
    drawFoundMarker(ctx, 1, diff, now);
  }
  drawEffects(ctx, engine);
  drawHintPulse(ctx, engine, now);
  drawReticle(ctx, reticle);
  if (engine.screen === 'paused') {
    ctx.fillStyle = 'rgba(8,10,20,0.55)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = '#f2ead2';
    ctx.font = 'bold 34px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PAUSED', CANVAS_W / 2, CANVAS_H / 2 - 12);
    ctx.font = '15px Verdana, sans-serif';
    ctx.fillText('Press P to resume', CANVAS_W / 2, CANVAS_H / 2 + 24);
  }
}
