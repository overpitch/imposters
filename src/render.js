// Drawing the ship from one player's point of view, plus their HUD.

import { SETTINGS as S } from './config.js';
import { ROOMS, HALLS, FURNITURE, STATIONS, VENTS, SABOTAGES, WORLD } from './map.js';
import { text, panel, button, drawCrew, drawGhost, drawBody, FONT } from './draw.js';

const TAU = Math.PI * 2;
const WALL = 26;
const SPRITE = 58; // crewmate height in world units

let floorPattern = null;
function tilePattern(ctx) {
  if (!floorPattern) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    g.strokeStyle = 'rgba(0,0,0,0.22)';
    g.lineWidth = 2;
    g.strokeRect(1, 1, 62, 62);
    g.fillStyle = 'rgba(255,255,255,0.05)';
    g.fillRect(3, 3, 58, 4);
    floorPattern = c;
  }
  return ctx.createPattern(floorPattern, 'repeat');
}

let stars = null;
function starfield() {
  if (!stars) stars = Array.from({ length: 220 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.6 + 0.3, a: Math.random() * 0.7 + 0.3 }));
  return stars;
}

const masks = new Map();
function maskCanvas(key, w, h) {
  let c = masks.get(key);
  if (!c) { c = document.createElement('canvas'); masks.set(key, c); }
  if (c.width !== Math.ceil(w) || c.height !== Math.ceil(h)) { c.width = Math.ceil(w); c.height = Math.ceil(h); }
  return c;
}

/** World -> screen for a view. */
export function toScreen(view, cam, x, y) {
  return [view.x + view.w / 2 + (x - cam.x) * cam.z, view.y + view.h / 2 + (y - cam.y) * cam.z];
}

export function drawWorld(ctx, game, view, cam, viewer, opts = {}) {
  const t = game.time;
  const { x, y, w, h } = view;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();

  // Space.
  ctx.fillStyle = '#05070d';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#fff';
  for (const s of starfield()) {
    ctx.globalAlpha = s.a;
    const sx = x + ((s.x * 1600 - cam.x * 0.05) % w + w) % w, sy = y + ((s.y * 1000 - cam.y * 0.05) % h + h) % h;
    ctx.fillRect(sx, sy, s.r, s.r);
  }
  ctx.globalAlpha = 1;

  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(cam.z, cam.z);
  ctx.translate(-cam.x, -cam.y);

  // Walls (thick outlines), then floors.
  const all = [...ROOMS.map((r) => r.rect), ...HALLS];
  ctx.fillStyle = '#1b1f28';
  for (const [x1, y1, x2, y2] of all) ctx.fillRect(x1 - WALL, y1 - WALL * 1.6, x2 - x1 + WALL * 2, y2 - y1 + WALL * 2.6);
  ctx.fillStyle = '#3a4150';
  for (const [x1, y1, x2, y2] of all) ctx.fillRect(x1 - WALL * 0.5, y1 - WALL * 1.2, x2 - x1 + WALL, WALL * 1.2);
  ctx.fillStyle = '#4a5160';
  for (const [x1, y1, x2, y2] of HALLS) ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
  for (const r of ROOMS) {
    const [x1, y1, x2, y2] = r.rect;
    ctx.fillStyle = r.floor;
    ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
  }
  ctx.fillStyle = tilePattern(ctx);
  for (const [x1, y1, x2, y2] of all) ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
  // Room names, painted on the floor.
  for (const r of ROOMS) {
    const [x1, y1, x2] = r.rect;
    text(ctx, r.name.toUpperCase(), (x1 + x2) / 2, y1 + 34, 30, 'rgba(255,255,255,0.13)', { weight: 900 });
  }

  // Furniture.
  for (const f of FURNITURE) drawFurniture(ctx, f, t);

  // Vents.
  for (const v of VENTS) {
    ctx.fillStyle = '#2a2f3a';
    ctx.beginPath(); ctx.roundRect(v.x - 26, v.y - 16, 52, 32, 5); ctx.fill();
    ctx.strokeStyle = '#7d8596'; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = '#11151c'; ctx.lineWidth = 3;
    for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(v.x + k * 9, v.y - 11); ctx.lineTo(v.x + k * 9, v.y + 11); ctx.stroke(); }
  }

  // Consoles. Yours glow yellow; sabotage fixes flash red.
  const mine = new Set();
  if (viewer.role === 'crew') for (const tk of viewer.tasks) { const st = game.nextStep(tk); if (st) mine.add(st[0]); }
  const fixes = game.sabotage ? new Set(SABOTAGES[game.sabotage.type].fix.map(([s]) => s).filter((s) => !game.sabotage.fixed.has(s))) : new Set();
  for (const s of Object.values(STATIONS)) {
    if (s.id === 'emergency' || s.floor) continue;
    const glow = fixes.has(s.id) ? (Math.sin(t * 8) > 0 ? '#ff3b3b' : null) : mine.has(s.id) ? '#ffd84a' : null;
    ctx.fillStyle = '#2b313c';
    ctx.beginPath(); ctx.roundRect(s.x - 20, s.y - 16, 40, 30, 4); ctx.fill();
    ctx.fillStyle = '#5fd4ff';
    ctx.fillRect(s.x - 14, s.y - 11, 28, 14);
    if (glow) { ctx.strokeStyle = glow; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(s.x - 23, s.y - 19, 46, 36, 6); ctx.stroke(); }
  }
  // MedBay scanner pad.
  const sc = STATIONS.med_scan;
  ctx.fillStyle = '#2f6b4a';
  ctx.beginPath(); ctx.ellipse(sc.x, sc.y, 42, 26, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = mine.has('med_scan') ? '#ffd84a' : '#5dff6a'; ctx.lineWidth = 4; ctx.stroke();

  // Bodies.
  for (const b of game.bodies) {
    if (viewer.alive && !game.canSee(viewer, b.x, b.y)) continue;
    drawBody(ctx, b.x, b.y, SPRITE, b.color, b.facing);
  }

  // Players, back to front.
  const vis = game.players.filter((p) => game.sees(viewer, p)).sort((a, b) => a.y - b.y);
  for (const p of vis) {
    if (!p.alive) { if (!p.ejected) drawGhost(ctx, p.x, p.y, SPRITE, p.color, { facing: p.facing, t: t + p.id }); continue; }
    if (p.scanning > 0) {
      ctx.strokeStyle = 'rgba(93,255,106,0.8)'; ctx.lineWidth = 3;
      const k = (t * 1.2) % 1;
      ctx.beginPath(); ctx.ellipse(p.x, p.y - SPRITE * 1.2 * k, 24, 8, 0, 0, TAU); ctx.stroke();
    }
    drawCrew(ctx, p.x, p.y, SPRITE, p.color, { facing: p.facing, walk: p.walk, moving: p.moving });
  }
  // Names.
  for (const p of vis) {
    if (!p.alive && p.ejected) continue;
    const red = viewer.role === 'imp' && p.role === 'imp';
    const label = p.human ? `P${p.slot + 1}` : p.name;
    text(ctx, label, p.x, p.y - SPRITE * 1.32, 19, red ? '#ff4d4d' : p.human ? '#fff' : '#e6e9ee', { weight: 800, stroke: 4 });
  }

  // Vent travel arrows.
  if (viewer.vent) {
    const v = VENTS.find((q) => q.id === viewer.vent);
    for (const id of v.links) {
      const o = VENTS.find((q) => q.id === id);
      const a = Math.atan2(o.y - v.y, o.x - v.x);
      const sel = opts.ventSel === id;
      ctx.save();
      ctx.translate(v.x + Math.cos(a) * 90, v.y + Math.sin(a) * 90);
      ctx.rotate(a);
      ctx.fillStyle = sel ? '#ffd84a' : 'rgba(255,255,255,0.8)';
      ctx.beginPath(); ctx.moveTo(28, 0); ctx.lineTo(-14, -20); ctx.lineTo(-14, 20); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  ctx.restore();

  // Darkness outside your vision (ghosts see everything).
  if (viewer.alive) drawVisionMask(ctx, game, view, cam, viewer);
}

function drawFurniture(ctx, f, t) {
  if (f.kind === 'table' || f.kind === 'button') {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(f.x, f.y + 10, f.r, f.r * 0.8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#b9c2d0';
    ctx.beginPath(); ctx.arc(f.x, f.y, f.r - 4, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#6c7486'; ctx.lineWidth = 5; ctx.stroke();
    if (f.kind === 'button') {
      ctx.fillStyle = '#8a8f99';
      ctx.beginPath(); ctx.arc(f.x, f.y, 26, 0, TAU); ctx.fill();
      ctx.fillStyle = '#e02828';
      ctx.beginPath(); ctx.arc(f.x, f.y - 4, 20, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath(); ctx.ellipse(f.x - 6, f.y - 10, 7, 4, -0.5, 0, TAU); ctx.fill();
    }
    return;
  }
  const [x1, y1, x2, y2] = f.rect;
  const w = x2 - x1, h = y2 - y1;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(x1 + 6, y1 + 10, w, h);
  switch (f.kind) {
    case 'crate':
      ctx.fillStyle = '#8a6a3c'; ctx.fillRect(x1, y1, w, h);
      ctx.strokeStyle = '#5e4524'; ctx.lineWidth = 5; ctx.strokeRect(x1 + 3, y1 + 3, w - 6, h - 6);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.moveTo(x2, y1); ctx.lineTo(x1, y2); ctx.stroke();
      break;
    case 'bed':
      ctx.fillStyle = '#d6e0f0'; ctx.fillRect(x1, y1, w, h);
      ctx.fillStyle = '#8fb6d8'; ctx.fillRect(x1, y1 + h * 0.3, w, h * 0.7);
      break;
    case 'engine':
      ctx.fillStyle = '#6c7486'; ctx.beginPath(); ctx.roundRect(x1, y1, w, h, 30); ctx.fill();
      ctx.fillStyle = '#ff8a3d'; ctx.globalAlpha = 0.6 + Math.sin(t * 6) * 0.2;
      ctx.beginPath(); ctx.arc(x1 + 30, (y1 + y2) / 2, 30, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      break;
    case 'core':
      ctx.fillStyle = '#3a4150'; ctx.beginPath(); ctx.roundRect(x1, y1, w, h, 20); ctx.fill();
      ctx.fillStyle = '#5fd4ff'; ctx.globalAlpha = 0.6 + Math.sin(t * 3) * 0.3;
      ctx.beginPath(); ctx.arc((x1 + x2) / 2, (y1 + y2) / 2, Math.min(w, h) * 0.3, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      break;
    default: // desks and consoles
      ctx.fillStyle = '#3a4150'; ctx.beginPath(); ctx.roundRect(x1, y1, w, h, 8); ctx.fill();
      ctx.fillStyle = '#5fd4ff'; ctx.globalAlpha = 0.7;
      ctx.fillRect(x1 + 10, y1 + 10, w - 20, Math.min(30, h - 20)); ctx.globalAlpha = 1;
  }
}

function drawVisionMask(ctx, game, view, cam, viewer) {
  const { x, y, w, h } = view;
  const r = game.visionOf(viewer);
  const m = maskCanvas('v' + viewer.id, w, h);
  const g = m.getContext('2d');
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, m.width, m.height);
  g.fillStyle = 'rgba(4,6,12,0.86)';
  g.fillRect(0, 0, m.width, m.height);
  g.globalCompositeOperation = 'destination-out';
  const pts = game.map.visibility(viewer.x, viewer.y, r);
  const cx = w / 2 + (viewer.x - cam.x) * cam.z, cy = h / 2 + (viewer.y - cam.y) * cam.z;
  const grad = g.createRadialGradient(cx, cy, r * cam.z * 0.75, cx, cy, r * cam.z);
  grad.addColorStop(0, 'rgba(0,0,0,1)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.beginPath();
  for (let i = 0; i < pts.length; i += 2) g.lineTo(w / 2 + (pts[i] - cam.x) * cam.z, h / 2 + (pts[i + 1] - cam.y) * cam.z);
  g.closePath();
  g.fill();
  g.globalCompositeOperation = 'source-over';
  ctx.drawImage(m, x, y, w, h);
}

// ---------------------------------------------------------------------------
// HUD

export function drawHud(ctx, game, view, viewer, ui) {
  const { x, y, w, h } = view;
  // Readable from the couch, but smaller in quarter screens so the HUD doesn't cover the view.
  const quarter = w < innerWidth * 0.6 && h < innerHeight * 0.6;
  const u = Math.max(Math.min(w / 1280, h / 720) * 1.2, Math.min(innerWidth / 1920, innerHeight / 1080) * (quarter ? 0.8 : 1.1));
  const m = 18 * u;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();

  // Task bar.
  const comms = game.sabotage?.type === 'comms';
  const bw = Math.min(w * 0.46, 480 * u), bh = 30 * u;
  panel(ctx, x + m, y + m, bw, bh, 6 * u, '#20262f', '#000', 3 * u);
  if (!comms) {
    ctx.fillStyle = '#44d62c';
    ctx.fillRect(x + m + 3 * u, y + m + 3 * u, (bw - 6 * u) * game.taskProgress(), bh - 6 * u);
  }
  text(ctx, comms ? 'COMMS SABOTAGED' : 'TOTAL TASKS COMPLETED', x + m + bw / 2, y + m + bh / 2 + u, 16 * u, '#fff', { weight: 900, stroke: 3 * u });

  // Task list.
  const lines = [];
  if (viewer.role === 'imp') {
    lines.push({ t: viewer.alive ? 'Sabotage and kill the crew.' : 'You\'re dead. You can still sabotage.', c: '#ff4d4d' });
    lines.push({ t: 'Fake Tasks:', c: '#ff9a9a' });
  } else if (!viewer.alive) lines.push({ t: 'You\'re dead. Finish your tasks!', c: '#9fd8ff' });
  if (game.sabotage) {
    const sab = SABOTAGES[game.sabotage.type];
    const where = sab.fix.filter(([st]) => !game.sabotage.fixed.has(st)).map(([st]) => game.map.roomName(STATIONS[st].x, STATIONS[st].y)).join(' + ');
    lines.push({ t: `${sab.icon} Fix ${sab.name}: ${where}${sab.critical ? ` (${Math.ceil(game.sabotage.timer)})` : ''}`, c: Math.sin(game.time * 8) > 0 ? '#ff4d4d' : '#ffb0b0' });
  }
  if (comms && viewer.role === 'crew') lines.push({ t: 'Comms sabotaged — tasks hidden', c: '#ffb0b0' });
  else {
    for (const tk of viewer.tasks) {
      const st = game.nextStep(tk);
      const room = st ? game.map.roomName(STATIONS[st[0]].x, STATIONS[st[0]].y) : '';
      const prog = tk.steps.length > 1 ? ` (${tk.step}/${tk.steps.length})` : '';
      lines.push({ t: st ? `${room}: ${tk.name}${prog}` : `${tk.name}${prog}`, c: !st && !tk.fake ? '#5dff6a' : tk.step > 0 && !tk.fake ? '#ffd84a' : '#fff' });
    }
  }
  const lh = 27 * u;
  const lw = Math.min(w * 0.55, 470 * u);
  panel(ctx, x + m, y + m + bh + 8 * u, lw, lines.length * lh + 14 * u, 8 * u, 'rgba(10,12,18,0.55)');
  lines.forEach((l, i) => text(ctx, l.t, x + m + 10 * u, y + m + bh + 15 * u + lh / 2 + i * lh, 19 * u, l.c, { align: 'left', weight: 700, stroke: 3 * u }));

  // Role badge.
  const role = viewer.role === 'imp' ? 'Imposter' : 'Crewmate';
  text(ctx, `P${viewer.slot + 1} · ${role}${viewer.alive ? '' : ' (ghost)'}`, x + w - m, y + m + 14 * u, 22 * u, viewer.role === 'imp' ? '#ff4d4d' : '#8fe3ff', { align: 'right', weight: 900, stroke: 4 * u });

  // Critical sabotage alarm.
  if (game.sabotage && SABOTAGES[game.sabotage.type].critical) {
    const k = (Math.sin(game.time * 6) + 1) / 2;
    ctx.strokeStyle = `rgba(255,30,30,${0.3 + k * 0.5})`;
    ctx.lineWidth = 14 * u;
    ctx.strokeRect(x + 7 * u, y + 7 * u, w - 14 * u, h - 14 * u);
    const label = game.sabotage.type === 'reactor' ? 'REACTOR MELTDOWN' : 'OXYGEN DEPLETED';
    text(ctx, `${label} IN ${Math.ceil(game.sabotage.timer)}`, x + w / 2, y + h * 0.16, 30 * u, '#ff3b3b', { weight: 900, stroke: 6 * u });
  } else if (game.sabotage?.type === 'lights') {
    text(ctx, '💡 Lights out! Fix them in Electrical', x + w / 2, y + h * 0.16, 22 * u, '#ffd84a', { weight: 900, stroke: 5 * u });
  }

  // Arrows to your tasks / sabotage fixes.
  if (viewer.alive || viewer.role === 'crew') drawArrows(ctx, game, view, ui.cam, viewer, u);

  // Action buttons.
  drawButtons(ctx, game, view, viewer, u);

  if (viewer.vent) rich(ctx, ['Stick: next vent   ', { btn: 'A' }, ' climb out'], x + w / 2, y + h - 40 * u, 20 * u, '#fff');
  ctx.restore();
}

function drawArrows(ctx, game, view, cam, viewer, u) {
  const targets = [];
  if (game.sabotage) for (const [st] of SABOTAGES[game.sabotage.type].fix) if (!game.sabotage.fixed.has(st)) targets.push({ s: STATIONS[st], c: '#ff3b3b' });
  if (viewer.role === 'crew' && game.sabotage?.type !== 'comms') {
    for (const tk of viewer.tasks) { const st = game.nextStep(tk); if (st) targets.push({ s: STATIONS[st[0]], c: '#ffd84a' }); }
  }
  const { x, y, w, h } = view;
  const cx = x + w / 2, cy = y + h / 2, pad = 46 * u;
  for (const { s, c } of targets) {
    const [sx, sy] = toScreen(view, cam, s.x, s.y);
    if (sx > x + pad && sx < x + w - pad && sy > y + pad && sy < y + h - pad) continue;
    const a = Math.atan2(sy - cy, sx - cx);
    const hw = w / 2 - pad, hh = h / 2 - pad;
    const k = Math.min(hw / Math.abs(Math.cos(a) || 1e-6), hh / Math.abs(Math.sin(a) || 1e-6));
    ctx.save();
    ctx.translate(cx + Math.cos(a) * k, cy + Math.sin(a) * k);
    ctx.rotate(a);
    ctx.fillStyle = c;
    ctx.strokeStyle = '#000'; ctx.lineWidth = 3 * u;
    ctx.beginPath(); ctx.moveTo(18 * u, 0); ctx.lineTo(-10 * u, -13 * u); ctx.lineTo(-4 * u, 0); ctx.lineTo(-10 * u, 13 * u); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }
}

function actionButton(ctx, x, y, s, label, glyph, active, extra) {
  ctx.globalAlpha = active ? 1 : 0.35;
  panel(ctx, x - s / 2, y - s / 2, s, s, s * 0.2, active ? 'rgba(25,30,40,0.85)' : 'rgba(25,30,40,0.6)', active ? '#fff' : '#777', s * 0.04);
  text(ctx, label, x, y + s * 0.12, s * 0.19, '#fff', { weight: 900 });
  if (extra) text(ctx, extra, x, y - s * 0.16, s * 0.34, '#fff', { weight: 900, stroke: s * 0.05 });
  ctx.globalAlpha = 1;
  button(ctx, glyph, x + s * 0.38, y - s * 0.38, s * 0.15);
}

function drawButtons(ctx, game, view, viewer, u) {
  const { x, y, w, h } = view;
  const s = 84 * u, gap = 14 * u;
  let bx = x + w - 30 * u - s / 2;
  const by = y + h - 30 * u - s / 2;
  const use = game.usable(viewer);
  const useLabel = !use ? 'USE' : use.kind === 'vent' ? 'VENT' : use.kind === 'emergency' ? 'MEETING' : 'USE';
  actionButton(ctx, bx, by, s, useLabel, 'A', !!use, use?.kind === 'emergency' ? '🚨' : use?.kind === 'vent' ? '🕳️' : '✋');
  bx -= s + gap;
  if (viewer.alive) {
    actionButton(ctx, bx, by, s, 'REPORT', 'Y', !!game.reportTarget(viewer), '📢');
    bx -= s + gap;
  }
  if (viewer.role === 'imp') {
    if (viewer.alive) {
      const cd = Math.ceil(viewer.killCd);
      actionButton(ctx, bx, by, s, 'KILL', 'X', !!game.killTarget(viewer) && viewer.killCd <= 0, viewer.killCd > 0 ? String(cd) : '🔪');
      bx -= s + gap;
    }
    const sabOk = !game.sabotage && game.sabotageCd <= 0;
    actionButton(ctx, bx, by, s, 'SABOTAGE', 'RB', sabOk, sabOk ? '☢️' : game.sabotage ? '⏳' : String(Math.ceil(game.sabotageCd)));
    bx -= s + gap;
  }
  actionButton(ctx, x + 30 * u + s / 2, by, s, 'MAP', 'LB', true, '🗺️');
}

function rich(ctx, parts, cx, cy, size, color) {
  ctx.font = `800 ${size}px ${FONT}`;
  const br = size * 0.6, gap = size * 0.25;
  const widths = parts.map((p) => (typeof p === 'string' ? ctx.measureText(p).width : br * 2 + gap * 2));
  let px = cx - widths.reduce((a, b) => a + b, 0) / 2;
  parts.forEach((p, i) => {
    if (typeof p === 'string') text(ctx, p, px, cy, size, color, { align: 'left', stroke: size * 0.2 });
    else button(ctx, p.btn, px + gap + br, cy, br);
    px += widths[i];
  });
}

// ---------------------------------------------------------------------------
// The victim's kill cut-in.

export function drawKillSplash(ctx, view, killer, victim, k) {
  const { x, y, w, h } = view;
  const u = Math.min(w / 1280, h / 720);
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(x, y, w, h);
  const bandH = h * 0.5;
  ctx.fillStyle = '#5a0b14';
  ctx.fillRect(x, y + h / 2 - bandH / 2, w, bandH);
  const s = bandH * 0.75;
  const vx = x + w * 0.6, gy = y + h / 2 + bandH * 0.35;
  const lunge = Math.min(1, k * 3);
  drawCrew(ctx, x + w * 0.25 + lunge * w * 0.12, gy, s, killer.color, { facing: 1, shadow: false });
  if (k < 0.35) drawCrew(ctx, vx, gy, s, victim.color, { facing: -1, shadow: false });
  else {
    const f = Math.min(1, (k - 0.35) * 3);
    drawBody(ctx, vx, gy, s, victim.color, -1);
    ctx.save(); // the top half flies off
    ctx.translate(vx + f * w * 0.12, gy - s * 0.4 - Math.sin(f * Math.PI) * s * 0.5);
    ctx.rotate(f * 2.5);
    drawCrew(ctx, 0, s * 0.4, s, victim.color, { facing: -1, shadow: false });
    ctx.restore();
    if (k < 0.5) {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 10 * u;
      ctx.beginPath(); ctx.moveTo(vx - s * 0.5, gy - s * 0.9); ctx.lineTo(vx + s * 0.4, gy - s * 0.2); ctx.stroke();
    }
  }
  ctx.restore();
}
