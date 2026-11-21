// scenes.js — Level data, difference definitions and the three scene painters.
// Every scene is drawn from scratch with Canvas 2D calls: no images, no assets.
// A painter receives (ctx, activeDiffs): when a difference id is in the set it
// draws the altered version, otherwise the original. The left panel is painted
// with an empty set, the right panel with the full set of difference ids.
// Decorative randomness uses a seeded PRNG so both panels always match.

export const PANEL_W = 520;
export const PANEL_H = 360;

// Deterministic PRNG (mulberry32) for decoration placement.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- small drawing helpers -------------------------------------------------

export function circle(ctx, x, y, r, fill) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

export function ellipse(ctx, x, y, rx, ry, fill) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

export function rect(ctx, x, y, w, h, fill) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
}

export function roundRect(ctx, x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

export function line(ctx, x1, y1, x2, y2, stroke, width = 2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.stroke();
}

export function poly(ctx, points, fill) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

export function gradient(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [at, colour] of stops) g.addColorStop(at, colour);
  return g;
}

export function drawBird(ctx, x, y, s, colour) {
  ctx.beginPath();
  ctx.moveTo(x - 9 * s, y);
  ctx.quadraticCurveTo(x - 4 * s, y - 6 * s, x, y);
  ctx.quadraticCurveTo(x + 4 * s, y - 6 * s, x + 9 * s, y);
  ctx.strokeStyle = colour;
  ctx.lineWidth = 2 * s;
  ctx.stroke();
}

export function drawStar(ctx, x, y, r, fill) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const px = x + Math.cos(a) * rad;
    const py = y + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

export function drawPine(ctx, x, baseY, h, trunk, leaf) {
  rect(ctx, x - 3, baseY - h * 0.18, 6, h * 0.18, trunk);
  const tiers = 3;
  for (let i = 0; i < tiers; i++) {
    const w = (h * 0.34) * (1 - i * 0.22);
    const yTop = baseY - h * 0.14 - i * h * 0.26;
    poly(ctx, [[x - w / 2, yTop + h * 0.3], [x + w / 2, yTop + h * 0.3], [x, yTop - h * 0.16]], leaf);
  }
}

export function drawRoundTree(ctx, x, baseY, h, trunk, leafA, leafB, rng) {
  rect(ctx, x - 4, baseY - h * 0.34, 8, h * 0.34, trunk);
  line(ctx, x, baseY - h * 0.3, x - h * 0.16, baseY - h * 0.52, trunk, 5);
  line(ctx, x, baseY - h * 0.3, x + h * 0.15, baseY - h * 0.55, trunk, 5);
  circle(ctx, x, baseY - h * 0.68, h * 0.3, leafA);
  circle(ctx, x - h * 0.2, baseY - h * 0.55, h * 0.2, leafB);
  circle(ctx, x + h * 0.2, baseY - h * 0.56, h * 0.21, leafA);
  for (let i = 0; i < 7; i++) {
    const a = rng() * Math.PI * 2;
    const d = rng() * h * 0.24;
    circle(ctx, x + Math.cos(a) * d, baseY - h * 0.66 + Math.sin(a) * d * 0.7, 3.2, leafB);
  }
}

// =============================================================================
// LEVEL 1 — Sunrise Harbor
// Differences:
//  harbor-birds   one of three gulls is gone
//  harbor-sail    the small boat's sail changes colour (white -> red)
//  harbor-lamp    the lighthouse lamp goes dark
//  harbor-sign    the harbour sign's letters are reversed
//  harbor-buoy    the red buoy is missing
// =============================================================================

export function paintHarbor(ctx, diffs) {
  const rng = mulberry32(1101);
  // Sky: dawn gradient.
  ctx.fillStyle = gradient(ctx, 0, 0, 0, 250, [
    [0, '#2e4a7a'], [0.35, '#7a6a9e'], [0.62, '#e8907c'], [0.85, '#ffc98a'], [1, '#ffe3ae'],
  ]);
  ctx.fillRect(0, 0, PANEL_W, 250);
  // Sun low on the horizon.
  const sunGrad = ctx.createRadialGradient(268, 218, 4, 268, 218, 60);
  sunGrad.addColorStop(0, 'rgba(255,244,200,0.95)');
  sunGrad.addColorStop(0.35, 'rgba(255,205,120,0.75)');
  sunGrad.addColorStop(1, 'rgba(255,180,110,0)');
  ctx.fillStyle = sunGrad;
  ctx.fillRect(190, 140, 160, 110);
  circle(ctx, 268, 218, 27, '#fff3c4');
  circle(ctx, 268, 218, 21, '#ffe9a3');
  // Far clouds tinted pink.
  for (const [cx, cy, s] of [[70, 52, 1], [180, 34, 0.7], [392, 46, 0.9], [462, 84, 0.6]]) {
    ctx.fillStyle = 'rgba(255,205,190,0.55)';
    ellipse(ctx, cx, cy, 34 * s, 9 * s, 'rgba(255,205,190,0.55)');
    ellipse(ctx, cx + 22 * s, cy + 3 * s, 24 * s, 7 * s, 'rgba(255,190,180,0.45)');
    ellipse(ctx, cx - 24 * s, cy + 3 * s, 20 * s, 6 * s, 'rgba(255,215,200,0.4)');
  }
  // Birds: three gulls, or two when the difference is active.
  drawBird(ctx, 120, 62, 1, '#2c3550');
  drawBird(ctx, 158, 82, 0.8, '#2c3550');
  if (!diffs.has('harbor-birds')) drawBird(ctx, 306, 58, 0.9, '#2c3550');
  // Distant headland on the left.
  poly(ctx, [[0, 218], [0, 168], [52, 150], [110, 176], [138, 218]], '#5d5470');
  poly(ctx, [[0, 218], [0, 190], [60, 178], [120, 200], [138, 218]], '#6f6284');
  // Rocky point on the right carrying the lighthouse.
  poly(ctx, [[382, 250], [404, 196], [452, 178], [520, 196], [520, 250]], '#57506b');
  poly(ctx, [[404, 210], [452, 192], [520, 210], [520, 250], [420, 250]], '#665c7d');
  for (let i = 0; i < 9; i++) {
    circle(ctx, 400 + rng() * 112, 216 + rng() * 28, 2 + rng() * 3, 'rgba(30,26,48,0.35)');
  }
  // Lighthouse tower.
  const lx = 446;
  poly(ctx, [[lx - 15, 196], [lx + 15, 196], [lx + 11, 128], [lx - 11, 128]], '#f2ede2');
  poly(ctx, [[lx - 13.4, 172], [lx + 13.4, 172], [lx + 12.2, 152], [lx - 12.2, 152]], '#c8453c');
  poly(ctx, [[lx - 11.8, 132], [lx + 11.8, 132], [lx + 12.6, 148], [lx - 12.6, 148]], '#c8453c');
  rect(ctx, lx - 4, 176, 8, 14, '#4a3b2c');
  circle(ctx, lx, 183, 1.6, '#ffd76a');
  // Lamp room: lit warm, or dark when the difference is active.
  rect(ctx, lx - 12, 112, 24, 16, '#333a4d');
  if (diffs.has('harbor-lamp')) {
    rect(ctx, lx - 8, 115, 16, 10, '#596273');
  } else {
    rect(ctx, lx - 8, 115, 16, 10, '#ffd76a');
    const beam = ctx.createRadialGradient(lx, 120, 2, lx, 120, 42);
    beam.addColorStop(0, 'rgba(255,215,106,0.55)');
    beam.addColorStop(1, 'rgba(255,215,106,0)');
    ctx.fillStyle = beam;
    ctx.fillRect(lx - 44, 76, 88, 88);
    circle(ctx, lx, 120, 5, '#fff3b0');
  }
  poly(ctx, [[lx - 16, 112], [lx + 16, 112], [lx, 98]], '#8c2f28');
  // Sea.
  ctx.fillStyle = gradient(ctx, 0, 248, 0, 360, [
    [0, '#e8a37c'], [0.18, '#7d7ba6'], [0.5, '#3d5a86'], [1, '#27436e'],
  ]);
  ctx.fillRect(0, 248, PANEL_W, 112);
  // Sun glitter path on the water.
  for (let i = 0; i < 26; i++) {
    const y = 254 + rng() * 96;
    const w = 6 + rng() * 30 * (0.4 + (y - 254) / 110);
    const x = 268 - w / 2 + (rng() - 0.5) * 44;
    ctx.fillStyle = `rgba(255,214,150,${0.16 + rng() * 0.3})`;
    ctx.fillRect(x, y, w, 2);
  }
  // General wave strokes.
  for (let i = 0; i < 34; i++) {
    const x = rng() * 500;
    const y = 256 + rng() * 96;
    ctx.strokeStyle = `rgba(210,228,255,${0.1 + rng() * 0.16})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 8, y - 2.4, x + 16, y);
    ctx.stroke();
  }
  // Fishing boat with a sail whose colour is a difference.
  const bx = 128;
  const by = 262;
  poly(ctx, [[bx - 46, by + 14], [bx + 46, by + 14], [bx + 32, by + 30], [bx - 34, by + 30]], '#7a4a2b');
  rect(ctx, bx - 46, by + 10, 92, 5, '#96603a');
  line(ctx, bx, by + 12, bx, by - 52, '#5d4028', 3.4);
  const sailColour = diffs.has('harbor-sail') ? '#d84f43' : '#f6f1e3';
  poly(ctx, [[bx + 4, by - 50], [bx + 4, by + 8], [bx + 38, by + 8]], sailColour);
  poly(ctx, [[bx - 4, by - 44], [bx - 4, by + 8], [bx - 30, by + 8]], '#e9dfc8');
  line(ctx, bx, by - 52, bx + 16, by - 58, '#5d4028', 2);
  poly(ctx, [[bx + 16, by - 58], [bx + 30, by - 54], [bx + 16, by - 50]], '#d84f43');
  ellipse(ctx, bx, by + 34, 44, 5, 'rgba(20,30,55,0.35)');
  // Rowboat on the right.
  const rx2 = 348;
  const ry2 = 292;
  poly(ctx, [[rx2 - 30, ry2], [rx2 + 30, ry2], [rx2 + 20, ry2 + 12], [rx2 - 22, ry2 + 12]], '#3f6d5a');
  rect(ctx, rx2 - 30, ry2 - 3, 60, 4, '#578a72');
  line(ctx, rx2 + 4, ry2 - 2, rx2 + 26, ry2 - 16, '#6b4e30', 2.6);
  circle(ctx, rx2 - 8, ry2 - 8, 5, '#e8b04b');
  rect(ctx, rx2 - 12, ry2 - 6, 9, 6, '#b8452f');
  ellipse(ctx, rx2, ry2 + 15, 30, 4, 'rgba(20,30,55,0.3)');
  // Buoy: present normally, gone when the difference is active.
  if (!diffs.has('harbor-buoy')) {
    poly(ctx, [[372, 268], [388, 268], [384, 252], [376, 252]], '#d84f43');
    rect(ctx, 371, 268, 18, 4, '#a33327');
    line(ctx, 380, 252, 380, 244, '#5d4028', 2);
    circle(ctx, 380, 242, 3, '#ffd76a');
    ellipse(ctx, 380, 274, 15, 3, 'rgba(255,255,255,0.28)');
  }
  // Quay in the foreground.
  poly(ctx, [[0, 360], [0, 306], [150, 296], [196, 312], [210, 360]], '#4c4238');
  poly(ctx, [[0, 312], [150, 302], [192, 316], [196, 326], [148, 312], [0, 322]], '#5f5245');
  for (let i = 0; i < 6; i++) {
    line(ctx, 12 + i * 30, 318 + i * 1.4, 12 + i * 30, 352, 'rgba(20,16,12,0.4)', 2);
  }
  // Crates and a barrel on the quay.
  rect(ctx, 22, 276, 30, 28, '#8a6238');
  line(ctx, 22, 290, 52, 290, '#6f4c28', 2.4);
  line(ctx, 37, 276, 37, 304, '#6f4c28', 2.4);
  rect(ctx, 56, 284, 24, 20, '#9c7040');
  line(ctx, 56, 294, 80, 294, '#75522c', 2.2);
  ellipse(ctx, 108, 292, 10, 13, '#7d5a34');
  ellipse(ctx, 108, 280, 10, 3.4, '#96703f');
  line(ctx, 98, 290, 118, 290, '#5f4525', 2);
  // Mooring posts with rope.
  rect(ctx, 168, 292, 7, 26, '#3d332a');
  rect(ctx, 20, 300, 7, 24, '#3d332a');
  ctx.beginPath();
  ctx.moveTo(24, 302);
  ctx.quadraticCurveTo(96, 318, 171, 296);
  ctx.strokeStyle = '#c9b18a';
  ctx.lineWidth = 2.4;
  ctx.stroke();
  // Harbour sign: its word flips when the difference is active.
  rect(ctx, 62, 250, 5, 28, '#4a3826');
  rect(ctx, 108, 250, 5, 28, '#4a3826');
  roundRect(ctx, 52, 232, 72, 20, 3, '#2f4d6e');
  ctx.strokeStyle = '#d9b96a';
  ctx.lineWidth = 1.6;
  ctx.strokeRect(55, 235, 66, 14);
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 11px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(diffs.has('harbor-sign') ? 'ROBRAH' : 'HARBOR', 88, 242.5);
  // Foreground grass tufts on the right bank.
  for (let i = 0; i < 12; i++) {
    const gx = 452 + rng() * 62;
    const gy = 330 + rng() * 26;
    line(ctx, gx, gy, gx - 3, gy - 9 - rng() * 5, '#3c5a34', 1.8);
    line(ctx, gx, gy, gx + 3, gy - 8 - rng() * 5, '#4a6d3e', 1.8);
  }
  // Soft vignette.
  const vg = ctx.createRadialGradient(260, 180, 210, 260, 180, 380);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(10,10,30,0.22)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, PANEL_W, PANEL_H);
}

// =============================================================================
// LEVEL 2 — Autumn Cabin
// Differences:
//  cabin-smoke     the chimney smoke is gone
//  cabin-pumpkins  three pumpkins become two
//  cabin-window    one lit window goes dark (two lit -> one lit)
//  cabin-hat       the scarecrow's hat changes colour (brown -> purple)
//  cabin-cat       the cat on the porch is gone
//  cabin-fence     one fence slat is missing
//  cabin-apples    the apple tree loses its apples
// =============================================================================

export function paintCabin(ctx, diffs) {
  const rng = mulberry32(2202);
  // Late-afternoon sky.
  ctx.fillStyle = gradient(ctx, 0, 0, 0, 240, [
    [0, '#7fa8c9'], [0.5, '#bcd3e2'], [0.8, '#f2d8a8'], [1, '#f7e3b5'],
  ]);
  ctx.fillRect(0, 0, PANEL_W, 240);
  circle(ctx, 452, 52, 24, '#fff0bc');
  circle(ctx, 452, 52, 17, '#ffe98f');
  // Clouds.
  for (const [cx, cy, s] of [[90, 44, 1], [250, 66, 0.75], [360, 30, 0.6]]) {
    ellipse(ctx, cx, cy, 36 * s, 10 * s, 'rgba(255,255,255,0.8)');
    ellipse(ctx, cx + 24 * s, cy + 4 * s, 24 * s, 8 * s, 'rgba(255,255,255,0.65)');
    ellipse(ctx, cx - 26 * s, cy + 4 * s, 20 * s, 7 * s, 'rgba(255,255,255,0.6)');
  }
  drawBird(ctx, 150, 88, 0.9, '#4a5468');
  drawBird(ctx, 196, 104, 0.7, '#4a5468');
  // Distant hills.
  poly(ctx, [[0, 226], [0, 178], [90, 148], [180, 182], [250, 226]], '#8d9a72');
  poly(ctx, [[250, 226], [330, 160], [420, 150], [520, 190], [520, 226]], '#7d8c64');
  for (let i = 0; i < 14; i++) {
    drawPine(ctx, 16 + rng() * 490, 196 + rng() * 22, 26 + rng() * 18, '#5d4630', '#5d7350');
  }
  // Meadow.
  ctx.fillStyle = gradient(ctx, 0, 224, 0, 360, [[0, '#b5a05e'], [0.4, '#a3863f'], [1, '#7d652e']]);
  ctx.fillRect(0, 224, PANEL_W, 136);
  // Fallen-leaf speckle across the meadow.
  const leafColours = ['#c96f2e', '#d99a35', '#b84e28', '#e0b84e', '#9c6b30'];
  for (let i = 0; i < 130; i++) {
    const x = rng() * 520;
    const y = 232 + rng() * 122;
    ellipse(ctx, x, y, 2.6 + rng() * 2, 1.4 + rng() * 1.2, leafColours[(rng() * leafColours.length) | 0]);
  }
  // Winding dirt path to the cabin door.
  poly(ctx, [[238, 360], [258, 300], [266, 268], [282, 268], [282, 300], [286, 360]], '#c9ad76');
  poly(ctx, [[246, 360], [262, 304], [268, 272], [276, 272], [278, 304], [280, 360]], '#dcc08a');
  for (let i = 0; i < 8; i++) {
    ellipse(ctx, 258 + rng() * 18, 282 + rng() * 70, 3.4, 2, 'rgba(120,95,55,0.5)');
  }
  // ---- the cabin ----
  const cx0 = 168;
  const cy0 = 148;
  // Log walls.
  roundRect(ctx, cx0, cy0, 196, 118, 4, '#8a5f36');
  for (let i = 0; i < 7; i++) {
    const y = cy0 + 8 + i * 16;
    line(ctx, cx0 + 3, y + 8, cx0 + 193, y + 8, '#6f4a28', 2.4);
    circle(ctx, cx0 + 8, y + 4, 3, '#a3763f');
    circle(ctx, cx0 + 188, y + 4, 3, '#a3763f');
  }
  // Stone foundation.
  rect(ctx, cx0 - 4, cy0 + 116, 204, 12, '#8d8578');
  for (let i = 0; i < 9; i++) {
    rect(ctx, cx0 + 2 + i * 22, cy0 + 119, 16, 6, '#9c9484');
  }
  // Roof.
  poly(ctx, [[cx0 - 22, cy0 + 6], [cx0 + 218, cy0 + 6], [cx0 + 168, cy0 - 52], [cx0 + 28, cy0 - 52]], '#6e3b2a');
  poly(ctx, [[cx0 - 22, cy0 + 6], [cx0 + 218, cy0 + 6], [cx0 + 206, cy0 - 6], [cx0 - 10, cy0 - 6]], '#7d4630');
  for (let i = 0; i < 10; i++) {
    line(ctx, cx0 + 6 + i * 19, cy0 - 44 + (i % 2) * 4, cx0 - 2 + i * 19, cy0 + 2, 'rgba(50,22,14,0.35)', 2);
  }
  // Chimney + smoke (smoke is a difference).
  rect(ctx, 306, cy0 - 66, 24, 40, '#8d8578');
  rect(ctx, 302, cy0 - 72, 32, 8, '#766e60');
  rect(ctx, 310, cy0 - 62, 7, 10, '#9c9484');
  rect(ctx, 320, cy0 - 62, 7, 10, '#9c9484');
  if (!diffs.has('cabin-smoke')) {
    const smoke = [[318, 66], [310, 50], [322, 36], [314, 20]];
    smoke.forEach(([sx, sy], i) => {
      ellipse(ctx, sx, sy, 7 + i * 3.4, 5.4 + i * 2.4, `rgba(245,245,248,${0.75 - i * 0.13})`);
    });
  }
  // Door.
  roundRect(ctx, 252, cy0 + 52, 34, 66, 3, '#5d3d22');
  line(ctx, 252, cy0 + 74, 286, cy0 + 74, '#4a3018', 2.2);
  line(ctx, 252, cy0 + 96, 286, cy0 + 96, '#4a3018', 2.2);
  circle(ctx, 280, cy0 + 86, 2.8, '#d9b96a');
  poly(ctx, [[248, cy0 + 52], [290, cy0 + 52], [269, cy0 + 38]], '#4a3018');
  // Left window: always lit.
  rect(ctx, cx0 + 22, cy0 + 34, 38, 36, '#5d3d22');
  rect(ctx, cx0 + 26, cy0 + 38, 30, 28, '#ffd76a');
  line(ctx, cx0 + 41, cy0 + 38, cx0 + 41, cy0 + 66, '#5d3d22', 3);
  line(ctx, cx0 + 26, cy0 + 52, cx0 + 56, cy0 + 52, '#5d3d22', 3);
  // Right window: lit normally, dark when the difference is active.
  rect(ctx, cx0 + 136, cy0 + 34, 38, 36, '#5d3d22');
  rect(ctx, cx0 + 140, cy0 + 38, 30, 28, diffs.has('cabin-window') ? '#3c4654' : '#ffd76a');
  line(ctx, cx0 + 155, cy0 + 38, cx0 + 155, cy0 + 66, '#5d3d22', 3);
  line(ctx, cx0 + 140, cy0 + 52, cx0 + 170, cy0 + 52, '#5d3d22', 3);
  if (!diffs.has('cabin-window')) {
    ellipse(ctx, cx0 + 155, cy0 + 52, 26, 20, 'rgba(255,215,106,0.14)');
  }
  // Window boxes with flowers.
  rect(ctx, cx0 + 20, cy0 + 70, 42, 8, '#6e3b2a');
  rect(ctx, cx0 + 134, cy0 + 70, 42, 8, '#6e3b2a');
  for (let i = 0; i < 5; i++) {
    circle(ctx, cx0 + 27 + i * 8, cy0 + 69, 2.6, i % 2 ? '#d84f43' : '#e88bb0');
    circle(ctx, cx0 + 141 + i * 8, cy0 + 69, 2.6, i % 2 ? '#e88bb0' : '#d84f43');
  }
  // Porch.
  rect(ctx, cx0 - 10, cy0 + 118, 216, 8, '#6f4a28');
  for (let i = 0; i < 11; i++) {
    line(ctx, cx0 - 4 + i * 20, cy0 + 119, cx0 - 4 + i * 20, cy0 + 125, '#54381d', 2);
  }
  rect(ctx, cx0 - 6, cy0 + 96, 6, 24, '#5d3d22');
  rect(ctx, cx0 + 196, cy0 + 96, 6, 24, '#5d3d22');
  // Rocking chair on the porch.
  line(ctx, 196, 250, 196, 232, '#4a3018', 3);
  line(ctx, 214, 250, 214, 232, '#4a3018', 3);
  rect(ctx, 194, 230, 22, 4, '#6b4a2a');
  rect(ctx, 194, 218, 4, 14, '#6b4a2a');
  rect(ctx, 212, 218, 4, 14, '#6b4a2a');
  ctx.beginPath();
  ctx.arc(205, 254, 12, 0.25, Math.PI - 0.25);
  ctx.strokeStyle = '#4a3018';
  ctx.lineWidth = 2.6;
  ctx.stroke();
  // Cat on the porch: present normally, gone with the difference.
  if (!diffs.has('cabin-cat')) {
    ellipse(ctx, 330, 258, 13, 7, '#3a3a42');
    circle(ctx, 342, 251, 6.4, '#3a3a42');
    poly(ctx, [[338, 247], [340, 240], [343, 246]], '#3a3a42');
    poly(ctx, [[344, 246], [347, 240], [348, 247]], '#3a3a42');
    circle(ctx, 340, 250, 1.2, '#ffd76a');
    circle(ctx, 345, 250, 1.2, '#ffd76a');
    ctx.beginPath();
    ctx.moveTo(318, 256);
    ctx.quadraticCurveTo(306, 250, 310, 240);
    ctx.strokeStyle = '#3a3a42';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  // Pumpkins by the steps: three, or two with the difference.
  const pumpkins = [[232, 282, 11], [300, 284, 9]];
  if (!diffs.has('cabin-pumpkins')) pumpkins.push([266, 290, 12.5]);
  for (const [px, py, pr] of pumpkins) {
    ellipse(ctx, px, py, pr, pr * 0.82, '#d8722c');
    ellipse(ctx, px, py, pr * 0.5, pr * 0.8, '#e07f36');
    rect(ctx, px - 1.6, py - pr * 0.98, 3.2, 5, '#5d6d35');
    line(ctx, px - pr * 0.45, py - pr * 0.5, px - pr * 0.45, py + pr * 0.5, 'rgba(150,70,20,0.5)', 1.6);
    line(ctx, px + pr * 0.45, py - pr * 0.5, px + pr * 0.45, py + pr * 0.5, 'rgba(150,70,20,0.5)', 1.6);
  }
  // Wood pile.
  for (let r = 0; r < 3; r++) {
    for (let i = 0; i < 4 - r; i++) {
      const wx = 386 + i * 17 + r * 8;
      const wy = 258 - r * 11;
      ellipse(ctx, wx, wy, 9, 5.6, '#8a5f36');
      circle(ctx, wx - 6.4, wy, 3.4, '#c9a06a');
    }
  }
  line(ctx, 428, 232, 428, 262, '#6b4a2a', 4);
  ellipse(ctx, 428, 230, 12, 4, '#9c9484');
  // Apple tree on the left: apples vanish with the difference.
  drawRoundTree(ctx, 76, 268, 118, '#6b4a2a', '#c96f2e', '#d98a35', rng);
  if (!diffs.has('cabin-apples')) {
    const appleSpots = [[58, 196], [84, 186], [96, 210], [66, 222], [44, 214], [90, 232]];
    for (const [ax, ay] of appleSpots) {
      circle(ctx, ax, ay, 4, '#c22f2f');
      circle(ctx, ax - 1.2, ay - 1.4, 1.3, '#e88a8a');
    }
  }
  // Bare tree on the right.
  line(ctx, 470, 272, 470, 208, '#5d4630', 7);
  line(ctx, 470, 232, 448, 210, '#5d4630', 4.4);
  line(ctx, 470, 224, 494, 204, '#5d4630', 4.4);
  line(ctx, 448, 210, 438, 196, '#5d4630', 3);
  line(ctx, 494, 204, 500, 188, '#5d4630', 3);
  // Tire swing from the bare tree.
  line(ctx, 482, 214, 482, 240, '#8a7a5c', 2);
  ellipse(ctx, 482, 246, 10, 5, '#33333c');
  ellipse(ctx, 482, 246, 4.6, 2, '#a3863f');
  // Scarecrow in the field: hat colour is a difference.
  const sx = 428;
  const sy = 300;
  line(ctx, sx, sy, sx, sy + 34, '#6b4a2a', 4);
  line(ctx, sx - 20, sy + 8, sx + 20, sy + 2, '#6b4a2a', 4);
  rect(ctx, sx - 11, sy + 2, 22, 24, '#7a6aa8');
  line(ctx, sx - 11, sy + 10, sx + 11, sy + 10, '#5d4f85', 2);
  line(ctx, sx, sy + 2, sx, sy + 26, '#5d4f85', 2);
  circle(ctx, sx, sy - 6, 9, '#e8cf9e');
  circle(ctx, sx - 3, sy - 8, 1.4, '#333');
  circle(ctx, sx + 3, sy - 8, 1.4, '#333');
  ctx.beginPath();
  ctx.arc(sx, sy - 4, 4, 0.3, Math.PI - 0.3);
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  const hatColour = diffs.has('cabin-hat') ? '#7a3d8c' : '#8a5f2e';
  ellipse(ctx, sx, sy - 13, 15, 3.6, hatColour);
  rect(ctx, sx - 7, sy - 24, 14, 11, hatColour);
  rect(ctx, sx - 7, sy - 16, 14, 3, '#5d4020');
  for (const dx of [-20, 20]) {
    line(ctx, sx + dx, sy + (dx < 0 ? 8 : 2), sx + dx + (dx < 0 ? -4 : 4), sy + 14, '#d9b96a', 2.4);
  }
  // Fence across the front: one slat missing with the difference.
  const fenceY = 322;
  line(ctx, 0, fenceY + 6, 520, fenceY + 6, '#77572f', 4);
  line(ctx, 0, fenceY + 20, 520, fenceY + 20, '#77572f', 4);
  for (let i = 0; i < 18; i++) {
    if (diffs.has('cabin-fence') && i === 13) continue;
    const fx = 8 + i * 29;
    poly(ctx, [[fx, fenceY + 26], [fx, fenceY], [fx + 6, fenceY - 6], [fx + 12, fenceY], [fx + 12, fenceY + 26]], '#8f6a38');
    circle(ctx, fx + 6, fenceY + 8, 1.4, '#5d4020');
    circle(ctx, fx + 6, fenceY + 19, 1.4, '#5d4020');
  }
  // Falling leaves drifting.
  for (let i = 0; i < 16; i++) {
    const x = rng() * 520;
    const y = 30 + rng() * 200;
    ellipse(ctx, x, y, 3.4, 2, leafColours[(rng() * leafColours.length) | 0]);
  }
  // Vignette.
  const vg = ctx.createRadialGradient(260, 180, 210, 260, 180, 380);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(30,18,4,0.2)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, PANEL_W, PANEL_H);
}

// =============================================================================
// LEVEL 3 — Lantern Festival Night
// Differences:
//  fest-lantern    a paper lantern changes colour (red -> teal)
//  fest-moon       the full moon becomes a crescent
//  fest-firework   the firework changes colour (gold -> violet)
//  fest-boat       the boat loses one of its two lanterns
//  fest-banner     the festival banner's letters are reversed
//  fest-bridge     one bridge lantern is missing
//  fest-star       a bright star is missing from the sky
//  fest-awning     the stall awning changes colour (red/white -> blue/white)
//  fest-owl        the owl on the branch is gone
// =============================================================================

export function drawLantern(ctx, x, y, s, colour, glow = true) {
  if (glow) {
    const g = ctx.createRadialGradient(x, y, 1, x, y, 20 * s);
    g.addColorStop(0, 'rgba(255,200,110,0.4)');
    g.addColorStop(1, 'rgba(255,200,110,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 22 * s, y - 22 * s, 44 * s, 44 * s);
  }
  ellipse(ctx, x, y, 8.4 * s, 10.4 * s, colour);
  ellipse(ctx, x, y, 4.6 * s, 10 * s, 'rgba(255,235,180,0.35)');
  rect(ctx, x - 3.6 * s, y - 12.2 * s, 7.2 * s, 2.6 * s, '#8c2f28');
  rect(ctx, x - 3.6 * s, y + 9.6 * s, 7.2 * s, 2.6 * s, '#8c2f28');
  line(ctx, x, y + 12 * s, x, y + 17 * s, '#d9b96a', 1.6 * s);
  line(ctx, x - 2.4 * s, y + 12 * s, x - 3.4 * s, y + 16 * s, '#d9b96a', 1.2 * s);
  line(ctx, x + 2.4 * s, y + 12 * s, x + 3.4 * s, y + 16 * s, '#d9b96a', 1.2 * s);
}

export function drawFirework(ctx, x, y, r, colour, rng) {
  for (let i = 0; i < 14; i++) {
    const a = (Math.PI * 2 * i) / 14 + rng() * 0.2;
    const len = r * (0.7 + rng() * 0.35);
    line(ctx, x + Math.cos(a) * r * 0.22, y + Math.sin(a) * r * 0.22, x + Math.cos(a) * len, y + Math.sin(a) * len, colour, 2.2);
    circle(ctx, x + Math.cos(a) * len, y + Math.sin(a) * len, 1.8, colour);
  }
  circle(ctx, x, y, 2.6, '#fff6d8');
}

export function paintFestival(ctx, diffs) {
  const rng = mulberry32(3303);
  // Night sky.
  ctx.fillStyle = gradient(ctx, 0, 0, 0, 250, [
    [0, '#0d1330'], [0.55, '#1c2450'], [0.85, '#33356e'], [1, '#453a78'],
  ]);
  ctx.fillRect(0, 0, PANEL_W, 250);
  // Stars.
  for (let i = 0; i < 90; i++) {
    const x = rng() * 520;
    const y = rng() * 190;
    const r = rng() * 1.3 + 0.4;
    ctx.fillStyle = `rgba(255,250,225,${0.35 + rng() * 0.6})`;
    ctx.fillRect(x, y, r, r);
  }
  // The bright star that can vanish.
  if (!diffs.has('fest-star')) drawStar(ctx, 388, 44, 7, '#fff3b0');
  drawStar(ctx, 92, 30, 4.4, 'rgba(255,243,176,0.8)');
  drawStar(ctx, 486, 96, 4, 'rgba(255,243,176,0.7)');
  // Moon: full, or crescent with the difference.
  const moonGlow = ctx.createRadialGradient(70, 56, 6, 70, 56, 62);
  moonGlow.addColorStop(0, 'rgba(255,244,200,0.5)');
  moonGlow.addColorStop(1, 'rgba(255,244,200,0)');
  ctx.fillStyle = moonGlow;
  ctx.fillRect(0, 0, 140, 126);
  circle(ctx, 70, 56, 21, '#fdf3c8');
  circle(ctx, 63, 50, 4, 'rgba(210,195,150,0.5)');
  circle(ctx, 78, 64, 3, 'rgba(210,195,150,0.45)');
  circle(ctx, 74, 46, 2.2, 'rgba(210,195,150,0.4)');
  if (diffs.has('fest-moon')) {
    circle(ctx, 82, 48, 18, '#141a42');
  }
  // Fireworks: the big one's colour is a difference.
  drawFirework(ctx, 300, 62, 30, diffs.has('fest-firework') ? '#b78ae8' : '#ffd76a', rng);
  drawFirework(ctx, 448, 120, 19, '#7ad0c9', rng);
  drawFirework(ctx, 168, 96, 15, '#e88bb0', rng);
  // Far shore silhouette with pagoda roofs.
  poly(ctx, [[0, 236], [0, 204], [70, 196], [130, 206], [200, 192], [280, 204], [360, 194], [440, 206], [520, 198], [520, 236]], '#232046');
  poly(ctx, [[96, 202], [96, 178], [122, 178], [122, 202]], '#2a2454');
  poly(ctx, [[84, 178], [134, 178], [109, 160]], '#332b66');
  poly(ctx, [[92, 164], [126, 164], [109, 150]], '#3a3172');
  rect(ctx, 104, 186, 8, 8, '#ffd76a');
  poly(ctx, [[392, 204], [392, 182], [416, 182], [416, 204]], '#2a2454');
  poly(ctx, [[382, 182], [426, 182], [404, 166]], '#332b66');
  rect(ctx, 400, 189, 7, 7, '#ffb35c');
  // String lights along the far shore.
  for (let i = 0; i < 22; i++) {
    const x = 12 + i * 23.4;
    const y = 208 + Math.sin(i * 0.9) * 4;
    circle(ctx, x, y, 1.9, i % 3 === 0 ? '#ffd76a' : i % 3 === 1 ? '#ff9d7a' : '#9adbe8');
  }
  // Lake.
  ctx.fillStyle = gradient(ctx, 0, 234, 0, 360, [[0, '#2c2a5e'], [0.4, '#1e2050'], [1, '#12122e']]);
  ctx.fillRect(0, 234, PANEL_W, 126);
  // Moon path shimmer.
  for (let i = 0; i < 18; i++) {
    const y = 240 + rng() * 108;
    const w = 5 + rng() * 22;
    ctx.fillStyle = `rgba(250,240,190,${0.08 + rng() * 0.16})`;
    ctx.fillRect(70 - w / 2 + (rng() - 0.5) * 26, y, w, 1.8);
  }
  // Lantern reflections.
  for (let i = 0; i < 20; i++) {
    const x = rng() * 520;
    const y = 244 + rng() * 104;
    ctx.fillStyle = `rgba(255,${170 + ((rng() * 50) | 0)},90,${0.06 + rng() * 0.13})`;
    ctx.fillRect(x, y, 2 + rng() * 9, 1.8);
  }
  // ---- arched bridge across the middle ----
  ctx.beginPath();
  ctx.moveTo(120, 262);
  ctx.quadraticCurveTo(260, 196, 400, 262);
  ctx.lineTo(400, 276);
  ctx.quadraticCurveTo(260, 214, 120, 276);
  ctx.closePath();
  ctx.fillStyle = '#7a3038';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(120, 262);
  ctx.quadraticCurveTo(260, 196, 400, 262);
  ctx.strokeStyle = '#a34a52';
  ctx.lineWidth = 5;
  ctx.stroke();
  // Bridge posts.
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    const x = 128 + t * 264;
    const y = 258 - Math.sin(t * Math.PI) * 42;
    line(ctx, x, y + 8, x, y - 10, '#5d242c', 4);
    circle(ctx, x, y - 12, 3.2, '#d9b96a');
  }
  // Bridge lanterns: three hang under the arch; one can be missing.
  line(ctx, 196, 232, 196, 240, '#d9b96a', 1.6);
  drawLantern(ctx, 196, 250, 0.72, '#e8574a');
  line(ctx, 324, 232, 324, 240, '#d9b96a', 1.6);
  drawLantern(ctx, 324, 250, 0.72, '#f2a541');
  if (!diffs.has('fest-bridge')) {
    line(ctx, 260, 224, 260, 232, '#d9b96a', 1.6);
    drawLantern(ctx, 260, 242, 0.72, '#e8574a');
  }
  // Bridge reflection.
  ctx.beginPath();
  ctx.moveTo(130, 292);
  ctx.quadraticCurveTo(260, 330, 390, 292);
  ctx.strokeStyle = 'rgba(190,90,100,0.3)';
  ctx.lineWidth = 4;
  ctx.stroke();
  // ---- festival boat ----
  const bx = 92;
  const by = 292;
  poly(ctx, [[bx - 58, by + 10], [bx + 58, by + 10], [bx + 40, by + 26], [bx - 42, by + 26]], '#4a2e20');
  rect(ctx, bx - 58, by + 6, 116, 5, '#6b4630');
  poly(ctx, [[bx - 34, by + 6], [bx + 34, by + 6], [bx + 24, by - 16], [bx - 24, by - 16]], '#5d3a28');
  poly(ctx, [[bx - 40, by - 16], [bx + 40, by - 16], [bx, by - 34]], '#8c2f28');
  poly(ctx, [[bx - 40, by - 16], [bx + 40, by - 16], [bx + 30, by - 21], [bx - 30, by - 21]], '#a83a32');
  // Boat lanterns: two normally, one with the difference.
  line(ctx, bx - 30, by - 20, bx - 30, by - 12, '#d9b96a', 1.4);
  drawLantern(ctx, bx - 30, by - 3, 0.62, '#e8574a');
  if (!diffs.has('fest-boat')) {
    line(ctx, bx + 30, by - 20, bx + 30, by - 12, '#d9b96a', 1.4);
    drawLantern(ctx, bx + 30, by - 3, 0.62, '#f2a541');
  }
  // Boatman silhouette with a pole.
  circle(ctx, bx + 44, by - 8, 5.4, '#14101e');
  rect(ctx, bx + 40, by - 4, 8, 13, '#14101e');
  line(ctx, bx + 47, by - 2, bx + 58, by + 22, '#14101e', 2.6);
  ellipse(ctx, bx, by + 30, 52, 4.6, 'rgba(0,0,0,0.4)');
  // ---- near shore, bottom right: stall + banner + lantern pole ----
  poly(ctx, [[330, 360], [356, 306], [520, 300], [520, 360]], '#1d1836');
  poly(ctx, [[356, 306], [520, 300], [520, 312], [362, 318]], '#28224a');
  // Food stall.
  rect(ctx, 418, 282, 74, 44, '#4a2e20');
  rect(ctx, 418, 282, 74, 6, '#6b4630');
  for (let i = 0; i < 4; i++) {
    rect(ctx, 426 + i * 17, 296, 11, 12, '#ffd76a');
  }
  line(ctx, 418, 326, 492, 326, '#2e1c12', 4);
  rect(ctx, 424, 326, 5, 16, '#2e1c12');
  rect(ctx, 481, 326, 5, 16, '#2e1c12');
  // Stall awning: red/white, or blue/white with the difference.
  const awnA = diffs.has('fest-awning') ? '#3f6db8' : '#c23b31';
  for (let i = 0; i < 6; i++) {
    poly(ctx, [[410 + i * 15, 282], [425 + i * 15, 282], [429 + i * 15, 268], [414 + i * 15, 268]], i % 2 ? '#f2ede2' : awnA);
  }
  line(ctx, 412, 268, 500, 268, '#2e1c12', 2.4);
  // Banner pole with the festival word: letters flip with the difference.
  rect(ctx, 356, 236, 5, 76, '#3a2a1c');
  roundRect(ctx, 338, 210, 96, 24, 4, '#f2ede2');
  ctx.strokeStyle = '#c23b31';
  ctx.lineWidth = 2;
  ctx.strokeRect(341, 213, 90, 18);
  ctx.fillStyle = '#a82c24';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(diffs.has('fest-banner') ? 'LAVITSEF' : 'FESTIVAL', 386, 222.5);
  // Lantern pole on the left shore.
  poly(ctx, [[0, 360], [0, 300], [70, 306], [96, 360]], '#1d1836');
  rect(ctx, 34, 238, 5, 72, '#3a2a1c');
  line(ctx, 36, 240, 78, 240, '#3a2a1c', 4);
  // Hanging lanterns; the middle one's colour is a difference.
  line(ctx, 46, 240, 46, 248, '#d9b96a', 1.4);
  drawLantern(ctx, 46, 258, 0.85, '#e8574a');
  line(ctx, 62, 240, 62, 248, '#d9b96a', 1.4);
  drawLantern(ctx, 62, 258, 0.85, diffs.has('fest-lantern') ? '#3fa8a0' : '#e8574a');
  line(ctx, 78, 240, 78, 248, '#d9b96a', 1.4);
  drawLantern(ctx, 78, 258, 0.85, '#f2a541');
  // Tree branch top-right with an owl.
  ctx.beginPath();
  ctx.moveTo(520, 18);
  ctx.quadraticCurveTo(452, 30, 414, 58);
  ctx.strokeStyle = '#17122c';
  ctx.lineWidth = 9;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(468, 28);
  ctx.quadraticCurveTo(458, 44, 442, 52);
  ctx.strokeStyle = '#17122c';
  ctx.lineWidth = 5;
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const x = 424 + rng() * 88;
    const y = 16 + rng() * 40;
    ellipse(ctx, x, y, 6.4, 3.6, '#241d4d');
  }
  if (!diffs.has('fest-owl')) {
    ellipse(ctx, 446, 44, 8, 10.4, '#6b543a');
    circle(ctx, 446, 33, 6.8, '#7d6547');
    poly(ctx, [[441, 29], [442, 23], [445, 28]], '#7d6547');
    poly(ctx, [[447, 28], [450, 23], [451, 29]], '#7d6547');
    circle(ctx, 443.4, 33, 2.4, '#ffd76a');
    circle(ctx, 448.6, 33, 2.4, '#ffd76a');
    circle(ctx, 443.4, 33, 1.1, '#14101e');
    circle(ctx, 448.6, 33, 1.1, '#14101e');
    poly(ctx, [[444, 37], [448, 37], [446, 39.4]], '#e8a13c');
    line(ctx, 441, 53, 438, 57, '#e8a13c', 1.8);
    line(ctx, 451, 53, 454, 57, '#e8a13c', 1.8);
  }
  // Floating sky lanterns rising.
  for (const [fx, fy, fs] of [[150, 150, 0.5], [238, 128, 0.38], [352, 158, 0.44], [492, 168, 0.36], [56, 168, 0.4]]) {
    drawLantern(ctx, fx, fy, fs, '#f2a541');
  }
  // Foreground reeds at the bottom-left.
  for (let i = 0; i < 10; i++) {
    const x = 6 + i * 13 + rng() * 5;
    line(ctx, x, 360, x - 4 + rng() * 8, 322 + rng() * 12, '#141b38', 3);
  }
  // Vignette.
  const vg = ctx.createRadialGradient(260, 180, 200, 260, 180, 380);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(2,2,12,0.4)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, PANEL_W, PANEL_H);
}

// =============================================================================
// Level table
// =============================================================================

export const LEVELS = [
  {
    name: 'Sunrise Harbor',
    subtitle: 'A quiet port at dawn',
    timeLimit: 180,
    painter: paintHarbor,
    diffs: [
      { id: 'harbor-birds', x: 306, y: 58, r: 26, label: 'One seagull is missing' },
      { id: 'harbor-sail', x: 150, y: 232, r: 30, label: "The boat's sail changed colour" },
      { id: 'harbor-lamp', x: 446, y: 118, r: 24, label: 'The lighthouse lamp went dark' },
      { id: 'harbor-sign', x: 88, y: 242, r: 30, label: 'The harbour sign reads backwards' },
      { id: 'harbor-buoy', x: 380, y: 260, r: 22, label: 'The red buoy is missing' },
    ],
  },
  {
    name: 'Autumn Cabin',
    subtitle: 'A log cabin in the fall woods',
    timeLimit: 210,
    painter: paintCabin,
    diffs: [
      { id: 'cabin-smoke', x: 316, y: 42, r: 26, label: 'The chimney smoke is gone' },
      { id: 'cabin-pumpkins', x: 266, y: 288, r: 24, label: 'One pumpkin is missing' },
      { id: 'cabin-window', x: 323, y: 200, r: 26, label: 'A lit window went dark' },
      { id: 'cabin-hat', x: 428, y: 286, r: 24, label: "The scarecrow's hat changed colour" },
      { id: 'cabin-cat', x: 332, y: 254, r: 22, label: 'The porch cat is gone' },
      { id: 'cabin-fence', x: 390, y: 322, r: 22, label: 'A fence slat is missing' },
      { id: 'cabin-apples', x: 72, y: 208, r: 30, label: 'The apple tree lost its apples' },
    ],
  },
  {
    name: 'Lantern Festival Night',
    subtitle: 'A lakeside festival after dark',
    timeLimit: 240,
    painter: paintFestival,
    diffs: [
      { id: 'fest-lantern', x: 62, y: 258, r: 22, label: 'A lantern changed colour' },
      { id: 'fest-moon', x: 70, y: 56, r: 26, label: 'The full moon became a crescent' },
      { id: 'fest-firework', x: 300, y: 62, r: 32, label: 'The firework changed colour' },
      { id: 'fest-boat', x: 122, y: 288, r: 22, label: 'The boat lost a lantern' },
      { id: 'fest-banner', x: 386, y: 222, r: 32, label: 'The festival banner reads backwards' },
      { id: 'fest-bridge', x: 260, y: 242, r: 22, label: 'A bridge lantern is missing' },
      { id: 'fest-star', x: 388, y: 44, r: 20, label: 'A bright star is missing' },
      { id: 'fest-awning', x: 455, y: 275, r: 28, label: "The stall's awning changed colour" },
      { id: 'fest-owl', x: 446, y: 42, r: 22, label: 'The owl left its branch' },
    ],
  },
];

// Paint one panel of a level: empty diff set = original, full set = altered.
export function paintScene(ctx, levelIndex, activeDiffs) {
  const level = LEVELS[levelIndex];
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, PANEL_W, PANEL_H);
  ctx.clip();
  level.painter(ctx, activeDiffs);
  ctx.restore();
}

export const ALL_DIFF_IDS = LEVELS.map((l) => new Set(l.diffs.map((d) => d.id)));
export const EMPTY_SET = new Set();
