// Screens: lobby, role reveal, meeting, ejection, game over, map and sabotage menus.

import { COLORS, SLOT_COLORS, SETTINGS as S } from './config.js';
import { ROOMS, HALLS, STATIONS, SABOTAGES, WORLD } from './map.js';
import { text, panel, button, rich, drawCrew, drawBody } from './draw.js';

const TAU = Math.PI * 2;
export const uOf = (w, h) => Math.min(w / 1920, h / 1080);

// ---------------------------------------------------------------------------
// Lobby

export function drawLobby(ctx, W, H, st) {
  const u = uOf(W, H);
  const t = st.t;
  ctx.fillStyle = '#070912';
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 120; i++) {
    const x = ((i * 977) % W + t * (8 + (i % 5) * 6)) % W, y = (i * 613) % H;
    ctx.fillStyle = `rgba(255,255,255,${0.2 + (i % 7) / 10})`;
    ctx.fillRect(x, y, 2, 2);
  }
  // A few crewmates floating by.
  for (let i = 0; i < 5; i++) {
    const c = COLORS[(i * 5 + 2) % COLORS.length];
    const x = ((t * 40 + i * 420) % (W + 300)) - 150;
    const y = H * (0.2 + (i % 3) * 0.28) + Math.sin(t + i) * 30 * u;
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 0.5 + i) * 0.6);
    drawCrew(ctx, 0, 0, 70 * u, c, { shadow: false, alpha: 0.35 });
    ctx.restore();
  }

  ctx.save();
  ctx.shadowColor = '#ff2a2a'; ctx.shadowBlur = 30 * u;
  text(ctx, 'IMPOSTERS', W / 2, H * 0.11, 140 * u, '#ff3b3b', { weight: 900, stroke: 10 * u });
  ctx.restore();
  text(ctx, '8 players · 2 Imposters · who is it?', W / 2, H * 0.2, 30 * u, '#c9d1e0', { weight: 700 });

  const n = 4, cw = 400 * u, ch = 520 * u, gap = 40 * u;
  const x0 = W / 2 - (n * cw + (n - 1) * gap) / 2, cy = H * 0.27;
  for (let i = 0; i < n; i++) drawSlotCard(ctx, x0 + i * (cw + gap), cy, cw, ch, u, i, st);

  const joined = st.slots.filter(Boolean).length;
  const pulse = 1 + Math.sin(t * 5) * 0.04;
  if (st.needHelp) drawControllerHelp(ctx, W / 2, H * 0.9, u);
  else if (st.countdown !== null) text(ctx, `Starting in ${Math.ceil(st.countdown)}…`, W / 2, H * 0.9, 60 * u, '#fff', { weight: 900 });
  else if (joined) rich(ctx, ['Press ', { btn: 'A' }, ' when you\'re ready!'], W / 2, H * 0.9, 50 * u * pulse, '#fff');
  else rich(ctx, ['Press ', { btn: 'A' }, ' to join'], W / 2, H * 0.9, 54 * u * pulse, '#fff');
  const rule = joined >= 3 ? '3–4 players: 2 of you will secretly be the Imposters!' : 'Everyone on the couch gets the same role: all Crewmates or all Imposters';
  text(ctx, rule, W / 2, H * 0.965, 24 * u, 'rgba(201,209,224,0.8)', { weight: 600 });
}

function drawSlotCard(ctx, x, y, w, h, u, i, st) {
  const slot = st.slots[i];
  const accent = SLOT_COLORS[i];
  panel(ctx, x, y, w, h, 24 * u, slot ? 'rgba(16,20,30,0.9)' : 'rgba(16,20,30,0.5)', slot ? accent : 'rgba(255,255,255,0.15)', slot ? 4 * u : 2 * u);
  text(ctx, `P${i + 1}`, x + 30 * u, y + 44 * u, 48 * u, accent, { align: 'left', weight: 900 });
  if (!slot) {
    drawCrew(ctx, x + w / 2, y + h * 0.62, 150 * u, { body: '#3a4150', shade: '#262b36' }, { alpha: 0.5 });
    rich(ctx, ['Press ', { btn: 'A' }], x + w / 2, y + h * 0.78, 44 * u, '#fff');
    return;
  }
  text(ctx, st.deviceLabel(slot.device), x + w - 24 * u, y + 44 * u, 18 * u, 'rgba(220,228,240,0.6)', { align: 'right', weight: 600 });
  const c = COLORS[slot.color];
  drawCrew(ctx, x + w / 2, y + h * 0.62, 190 * u, c, { facing: 1, walk: st.t * 8, moving: true });
  text(ctx, '◀', x + 40 * u, y + h * 0.5, 40 * u, accent);
  text(ctx, '▶', x + w - 40 * u, y + h * 0.5, 40 * u, accent);
  text(ctx, c.name, x + w / 2, y + h * 0.72, 34 * u, '#fff', { weight: 900 });
  if (slot.ready) {
    panel(ctx, x + w / 2 - 110 * u, y + h * 0.82, 220 * u, 56 * u, 28 * u, '#3fbf3f', '#fff', 3 * u);
    text(ctx, '✓ READY!', x + w / 2, y + h * 0.82 + 29 * u, 30 * u, '#fff', { weight: 900 });
  } else {
    rich(ctx, [{ btn: 'A' }, ' Ready'], x + w / 2 - 50 * u, y + h * 0.87, 30 * u, '#fff');
    rich(ctx, [{ btn: 'B' }, ' leave'], x + w / 2 + 95 * u, y + h * 0.87, 22 * u, 'rgba(220,228,240,0.6)');
  }
}

export function drawControllerHelp(ctx, cx, cy, u) {
  const w = 1180 * u, h = 132 * u;
  panel(ctx, cx - w / 2, cy - h / 2, w, h, 24 * u, 'rgba(12,16,26,0.92)', '#ffe14d', 3 * u);
  text(ctx, '🎮 Controller not working?', cx, cy - 30 * u, 34 * u, '#ffe14d', { weight: 900 });
  rich(ctx, ['Hold ', { btn: 'menu' }, ' until a menu pops up, pick “Use game controls”, then press ', { btn: 'A' }], cx, cy + 28 * u, 30 * u, '#fff');
}

// ---------------------------------------------------------------------------
// Role reveal (per player view)

export function drawReveal(ctx, view, game, viewer, k) {
  const { x, y, w, h } = view;
  const u = Math.min(w / 1280, h / 720);
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = '#000';
  ctx.fillRect(x, y, w, h);
  const imp = viewer.role === 'imp';
  const a = Math.min(1, k * 2);
  ctx.globalAlpha = a;
  const g = ctx.createRadialGradient(x + w / 2, y + h * 0.65, 10, x + w / 2, y + h * 0.65, h * 0.6);
  g.addColorStop(0, imp ? 'rgba(160,0,0,0.6)' : 'rgba(0,90,160,0.6)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  text(ctx, imp ? 'Imposter' : 'Crewmate', x + w / 2, y + h * 0.2, 96 * u, imp ? '#ff2a2a' : '#8fe3ff', { weight: 900, stroke: 6 * u });
  if (!imp) text(ctx, `There ${S.impostors === 1 ? 'is' : 'are'} ${S.impostors} Imposter${S.impostors === 1 ? '' : 's'} on the ship.`, x + w / 2, y + h * 0.33, 30 * u, '#fff', { weight: 700 });
  else text(ctx, 'Kill the crew without getting caught.', x + w / 2, y + h * 0.33, 30 * u, '#ffb0b0', { weight: 700 });
  const team = imp ? game.players.filter((p) => p.role === 'imp') : game.players;
  const s = Math.min(150 * u, (w * 0.9) / (team.length + 1) * 1.6);
  const ordered = [viewer, ...team.filter((p) => p !== viewer)];
  ordered.forEach((p, i) => {
    const side = i === 0 ? 0 : (i % 2 ? -1 : 1) * Math.ceil(i / 2);
    const px = x + w / 2 + side * s * 0.62;
    const scale = i === 0 ? 1 : 0.8 - Math.abs(side) * 0.04;
    drawCrew(ctx, px, y + h * 0.85 - Math.abs(side) * 6 * u, s * scale, p.color, { facing: side > 0 ? -1 : 1 });
    if (imp) text(ctx, p.human ? `P${p.slot + 1}` : p.name, px, y + h * 0.92, 20 * u, '#ff6b6b', { weight: 800 });
  });
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Map (LB) and sabotage menu (RB)

export function drawMap(ctx, view, game, viewer, mode, sel) {
  const { x, y, w, h } = view;
  const u = Math.min(w / 1280, h / 720);
  ctx.save();
  ctx.fillStyle = 'rgba(0,10,30,0.82)';
  ctx.fillRect(x, y, w, h);
  const k = Math.min((w * 0.86) / WORLD.w, (h * 0.78) / WORLD.h);
  const ox = x + w / 2 - (WORLD.w * k) / 2, oy = y + h * 0.1;
  const P = (px, py) => [ox + px * k, oy + py * k];
  ctx.fillStyle = '#2d5b8a';
  for (const [x1, y1, x2, y2] of HALLS) { const [a, b] = P(x1, y1); ctx.fillRect(a, b, (x2 - x1) * k, (y2 - y1) * k); }
  for (const r of ROOMS) {
    const [x1, y1, x2, y2] = r.rect;
    const [a, b] = P(x1, y1);
    ctx.fillStyle = '#3d78b3'; ctx.fillRect(a, b, (x2 - x1) * k, (y2 - y1) * k);
    ctx.strokeStyle = '#8fc6ff'; ctx.lineWidth = 2 * u; ctx.strokeRect(a, b, (x2 - x1) * k, (y2 - y1) * k);
    const [cx, cy] = P((x1 + x2) / 2, (y1 + y2) / 2);
    text(ctx, r.name, cx, cy, 15 * u, '#fff', { weight: 800, stroke: 3 * u });
  }
  // Your tasks / sabotage fixes.
  const marks = [];
  if (viewer.role === 'crew' && game.sabotage?.type !== 'comms') for (const tk of viewer.tasks) { const s = game.nextStep(tk); if (s) marks.push([STATIONS[s[0]], '#ffd84a']); }
  if (game.sabotage) for (const [st] of SABOTAGES[game.sabotage.type].fix) if (!game.sabotage.fixed.has(st)) marks.push([STATIONS[st], '#ff3b3b']);
  for (const [s, c] of marks) {
    const [a, b] = P(s.x, s.y);
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(a, b, 7 * u, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2 * u; ctx.stroke();
  }
  // You.
  const [px, py] = P(viewer.x, viewer.y);
  if (Math.sin(game.time * 8) > -0.5) {
    ctx.fillStyle = viewer.color.body; ctx.beginPath(); ctx.arc(px, py, 10 * u, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3 * u; ctx.stroke();
  }

  if (mode === 'sabotage') {
    const types = Object.keys(SABOTAGES);
    const ready = !game.sabotage && game.sabotageCd <= 0;
    const bw = 230 * u, bh = 74 * u, gap = 16 * u;
    const bx0 = x + w / 2 - (types.length * bw + (types.length - 1) * gap) / 2, by = y + h * 0.86;
    types.forEach((tp, i) => {
      const def = SABOTAGES[tp];
      const bx = bx0 + i * (bw + gap);
      panel(ctx, bx, by, bw, bh, 14 * u, ready ? '#7a1010' : '#3a2020', i === sel ? '#ffd84a' : '#ff6b6b', (i === sel ? 5 : 2) * u);
      text(ctx, `${def.icon} ${def.name}`, bx + bw / 2, by + bh / 2, 26 * u, ready ? '#fff' : '#a88', { weight: 900 });
    });
    text(ctx, ready ? 'SABOTAGE: ←/→ to choose, A to start, B to close' : game.sabotage ? 'A sabotage is already happening' : `Sabotage ready in ${Math.ceil(game.sabotageCd)}s`,
      x + w / 2, y + h * 0.06, 24 * u, '#ff9a9a', { weight: 800, stroke: 4 * u });
  } else {
    text(ctx, 'MAP  (B to close)', x + w / 2, y + h * 0.05, 24 * u, '#fff', { weight: 900, stroke: 4 * u });
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Meeting

export const CHAT_GENERAL = ['Where?', 'Who?', 'I was doing tasks.', 'I don\'t know.', 'Skip this one.'];
export const CHAT_ABOUT = [
  { text: (n) => `${n} is sus.`, kind: 'sus' },
  { text: (n) => `I saw ${n} vent!`, kind: 'vent' },
  { text: (n) => `I saw ${n} kill!`, kind: 'kill' },
  { text: (n) => `${n} is safe.`, kind: 'safe' },
];

export function meetingLayout(W, H) {
  const u = uOf(W, H);
  const pw = 1700 * u, ph = 960 * u;
  const px = W / 2 - pw / 2, py = H / 2 - ph / 2;
  const tileW = 470 * u, tileH = 140 * u, gap = 20 * u;
  const tiles = [];
  for (let i = 0; i < 8; i++) {
    tiles.push({ x: px + 40 * u + (i % 2) * (tileW + gap), y: py + 130 * u + ((i / 2) | 0) * (tileH + gap), w: tileW, h: tileH });
  }
  const skip = { x: px + 40 * u, y: py + 130 * u + 4 * (tileH + gap) + 10 * u, w: 220 * u, h: 70 * u };
  const chat = { x: px + 40 * u + 2 * tileW + gap + 40 * u, y: py + 130 * u, w: pw - (2 * tileW + gap + 120 * u), h: 4 * (tileH + gap) + 80 * u };
  return { u, px, py, pw, ph, tiles, skip, chat };
}

export function drawMeeting(ctx, W, H, game, humans) {
  const m = game.meeting;
  const L = meetingLayout(W, H);
  const { u } = L;
  ctx.fillStyle = '#05070d';
  ctx.fillRect(0, 0, W, H);

  if (m.phase === 'intro') {
    const k = Math.min(1, (2.6 - m.timer) * 2);
    ctx.fillStyle = m.body ? '#3a0a0a' : '#1a1a3a';
    ctx.fillRect(0, H * 0.25, W, H * 0.5 * k);
    if (m.body) drawBody(ctx, W * 0.72, H * 0.66, 260 * u, m.body.color, -1);
    drawCrew(ctx, W * 0.3, H * 0.68, 280 * u, m.caller.color, { facing: 1 });
    text(ctx, m.body ? 'DEAD BODY REPORTED' : 'EMERGENCY MEETING!', W / 2, H * 0.36, 96 * u * k, m.body ? '#ff3b3b' : '#ffd84a', { weight: 900, stroke: 10 * u });
    return;
  }

  panel(ctx, L.px, L.py, L.pw, L.ph, 30 * u, '#c3cad6', '#6c7486', 8 * u);
  panel(ctx, L.px + 20 * u, L.py + 20 * u, L.pw - 40 * u, L.ph - 40 * u, 20 * u, '#8e99ab');
  text(ctx, 'Who is the Imposter?', L.px + L.pw / 2, L.py + 70 * u, 54 * u, '#fff', { weight: 900, stroke: 8 * u });

  const results = m.phase === 'results';
  game.players.forEach((p, i) => {
    const t = L.tiles[i];
    panel(ctx, t.x, t.y, t.w, t.h, 16 * u, p.alive ? '#e6eaf0' : '#7c8494', '#4a5160', 3 * u);
    drawCrew(ctx, t.x + 70 * u, t.y + t.h * 0.9, 110 * u, p.color, { shadow: false, alpha: p.alive ? 1 : 0.5 });
    const label = p.human ? `${p.name} (P${p.slot + 1})` : p.name;
    text(ctx, label, t.x + 140 * u, t.y + 40 * u, 32 * u, p.alive ? '#111' : '#333', { align: 'left', weight: 900 });
    if (m.caller === p) text(ctx, '📢', t.x + t.w - 40 * u, t.y + 38 * u, 40 * u, '#000');
    if (!p.alive) {
      ctx.strokeStyle = '#d02020'; ctx.lineWidth = 10 * u;
      ctx.beginPath(); ctx.moveTo(t.x + 30 * u, t.y + 20 * u); ctx.lineTo(t.x + 110 * u, t.y + t.h - 20 * u);
      ctx.moveTo(t.x + 110 * u, t.y + 20 * u); ctx.lineTo(t.x + 30 * u, t.y + t.h - 20 * u); ctx.stroke();
    }
    if (m.votes.has(p.id) && !results) {
      panel(ctx, t.x + 140 * u, t.y + 70 * u, 130 * u, 44 * u, 10 * u, '#3fbf3f');
      text(ctx, 'I VOTED', t.x + 205 * u, t.y + 93 * u, 22 * u, '#fff', { weight: 900 });
    }
    if (results) drawVoters(ctx, game, p.id, t.x + 140 * u, t.y + 92 * u, u);
  });
  // Skip.
  panel(ctx, L.skip.x, L.skip.y, L.skip.w, L.skip.h, 16 * u, '#e6eaf0', '#4a5160', 3 * u);
  text(ctx, 'SKIP VOTE', L.skip.x + L.skip.w / 2, L.skip.y + L.skip.h / 2, 28 * u, '#111', { weight: 900 });
  if (results) drawVoters(ctx, game, 'skip', L.skip.x + L.skip.w + 20 * u, L.skip.y + L.skip.h / 2, u);

  // Timer.
  const label = m.phase === 'discuss' ? `Discussion: ${Math.ceil(m.timer)}s (voting opens soon)` : m.phase === 'vote' ? `Voting ends in ${Math.ceil(m.timer)}s` : 'Results';
  text(ctx, label, L.px + L.pw - 50 * u, L.py + 70 * u, 30 * u, m.phase === 'vote' && m.timer < 10 ? '#b00000' : '#111', { align: 'right', weight: 900 });

  // Chat.
  panel(ctx, L.chat.x, L.chat.y, L.chat.w, L.chat.h, 16 * u, '#f4f6fa', '#4a5160', 3 * u);
  const lineH = 54 * u;
  const max = Math.floor((L.chat.h - 20 * u) / lineH);
  const shown = m.chat.slice(-max);
  shown.forEach((c, i) => {
    const ly = L.chat.y + 20 * u + i * lineH;
    drawCrew(ctx, L.chat.x + 30 * u, ly + 44 * u, 44 * u, c.from.color, { shadow: false });
    text(ctx, c.from.human ? `${c.from.name} (P${c.from.slot + 1})` : c.from.name, L.chat.x + 60 * u, ly + 12 * u, 17 * u, '#555', { align: 'left', weight: 800 });
    text(ctx, c.text, L.chat.x + 60 * u, ly + 34 * u, 23 * u, '#111', { align: 'left', weight: 700 });
  });

  // Each human's cursor, confirm prompt and chat menu.
  for (const h of humans) {
    const ui = h.ui;
    if (!h.player.alive) {
      text(ctx, `P${h.player.slot + 1} is a ghost: watching`, L.px + L.pw - 30 * u, L.py + L.ph - 30 * u - h.player.slot * 30 * u, 20 * u, '#333', { align: 'right', weight: 700 });
      continue;
    }
    const box = ui.cursor === 8 ? L.skip : L.tiles[ui.cursor];
    const inset = -6 * u - h.player.slot * 7 * u;
    ctx.strokeStyle = SLOT_COLORS[h.player.slot];
    ctx.lineWidth = 6 * u;
    ctx.beginPath(); ctx.roundRect(box.x + inset, box.y + inset, box.w - 2 * inset, box.h - 2 * inset, 18 * u); ctx.stroke();
    text(ctx, `P${h.player.slot + 1}`, box.x + inset + 24 * u, box.y + inset + 2 * u, 22 * u, SLOT_COLORS[h.player.slot], { weight: 900, stroke: 5 * u });
    if (ui.confirm && !m.votes.has(h.player.id)) {
      rich(ctx, [{ btn: 'A' }, ' vote  ', { btn: 'B' }, ' cancel'], box.x + box.w - 140 * u, box.y + box.h - 26 * u, 22 * u, '#111');
    }
    if (ui.chat) drawChatMenu(ctx, game, h, L);
  }
  // Hint bar.
  if (m.phase !== 'results') rich(ctx, ['Stick: pick   ', { btn: 'A' }, ' vote   ', { btn: 'X' }, ' quick chat'], W / 2, L.py + L.ph + 34 * u > H ? H - 20 * u : L.py + L.ph + 34 * u, 26 * u, '#fff');
}

function drawVoters(ctx, game, target, x, y, u) {
  let i = 0;
  for (const [voter, v] of game.meeting.votes) {
    if (v !== target) continue;
    const p = game.players[voter];
    ctx.fillStyle = p.color.body;
    ctx.beginPath(); ctx.arc(x + 20 * u + i * 34 * u, y, 15 * u, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2 * u; ctx.stroke();
    i++;
  }
}

export function chatOptions(game, h) {
  const target = h.ui.cursor < 8 ? game.players[h.ui.cursor] : null;
  const opts = [];
  if (target && target !== h.player && target.alive) for (const c of CHAT_ABOUT) opts.push({ text: c.text(target.name), meta: { kind: c.kind, target: target.id } });
  for (const g of CHAT_GENERAL) opts.push({ text: g, meta: null });
  return opts;
}

function drawChatMenu(ctx, game, h, L) {
  const { u } = L;
  const opts = chatOptions(game, h);
  const w = 420 * u, lh = 46 * u;
  const x = L.px + 30 * u + h.player.slot * (w + 10 * u), y = L.py + L.ph - opts.length * lh - 50 * u;
  panel(ctx, x, y - 50 * u, w, opts.length * lh + 64 * u, 16 * u, 'rgba(20,24,34,0.96)', SLOT_COLORS[h.player.slot], 4 * u);
  text(ctx, `P${h.player.slot + 1} says…  (B close)`, x + w / 2, y - 24 * u, 22 * u, SLOT_COLORS[h.player.slot], { weight: 900 });
  opts.forEach((o, i) => {
    if (i === h.ui.chatSel) panel(ctx, x + 8 * u, y + i * lh, w - 16 * u, lh - 4 * u, 10 * u, 'rgba(255,255,255,0.18)');
    text(ctx, o.text, x + 22 * u, y + i * lh + lh / 2, 22 * u, '#fff', { align: 'left', weight: 700 });
  });
}

// ---------------------------------------------------------------------------
// Ejection

export function drawEject(ctx, W, H, game, t) {
  const u = uOf(W, H);
  const e = game.eject;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 160; i++) {
    const x = (W - ((i * 911 + t * (200 + (i % 4) * 120)) % (W + 40))), y = (i * 577) % H;
    ctx.fillStyle = `rgba(255,255,255,${0.3 + (i % 5) / 8})`;
    ctx.fillRect(x, y, 3, 3);
  }
  if (e.p) {
    ctx.save();
    ctx.translate(-150 * u + (t / S.ejectTime) * (W + 300 * u), H * 0.45);
    ctx.rotate(t * 2.5);
    drawCrew(ctx, 0, 40 * u, 140 * u, e.p.color, { shadow: false });
    ctx.restore();
  }
  const k1 = Math.min(e.line1.length, Math.floor(t * 22));
  text(ctx, e.line1.slice(0, k1), W / 2, H * 0.7, 54 * u, '#fff', { weight: 800 });
  if (k1 >= e.line1.length && t > e.line1.length / 22 + 0.6) text(ctx, e.line2, W / 2, H * 0.78, 36 * u, '#c9d1e0', { weight: 700 });
}

// ---------------------------------------------------------------------------
// Game over

export function drawOver(ctx, W, H, game, humans, t) {
  const u = uOf(W, H);
  const crewWin = game.winner === 'crew';
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W / 2, H * 0.7, 10, W / 2, H * 0.7, H * 0.7);
  g.addColorStop(0, crewWin ? 'rgba(0,90,170,0.7)' : 'rgba(170,0,0,0.7)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  text(ctx, crewWin ? 'CREWMATES WIN' : 'IMPOSTERS WIN', W / 2, H * 0.14, 100 * u, crewWin ? '#8fe3ff' : '#ff2a2a', { weight: 900, stroke: 8 * u });
  text(ctx, game.winReason, W / 2, H * 0.24, 34 * u, '#fff', { weight: 700 });
  const winners = game.players.filter((p) => (crewWin ? p.role === 'crew' : p.role === 'imp'));
  const s = 170 * u;
  winners.forEach((p, i) => {
    const px = W / 2 + (i - (winners.length - 1) / 2) * s * 0.8;
    if (p.alive || p.role === 'imp') drawCrew(ctx, px, H * 0.62, s, p.color, { facing: i < winners.length / 2 ? 1 : -1 });
    else ctx.globalAlpha = 0.5, drawCrew(ctx, px, H * 0.62, s, p.color, {}), ctx.globalAlpha = 1;
    text(ctx, p.human ? `P${p.slot + 1}` : p.name, px, H * 0.66, 24 * u, '#fff', { weight: 800, stroke: 4 * u });
  });
  // Each player's result.
  humans.forEach((h, i) => {
    const won = (h.player.role === 'crew') === crewWin;
    text(ctx, `P${h.player.slot + 1} (${h.player.name}, ${h.player.role === 'imp' ? 'Imposter' : 'Crewmate'}): ${won ? 'VICTORY' : 'Defeat'}`,
      W / 2, H * (0.74 + i * 0.045), 30 * u, won ? '#5dff6a' : '#ff8a8a', { weight: 900 });
  });
  const imps = game.players.filter((p) => p.role === 'imp').map((p) => (p.human ? `${p.name} (P${p.slot + 1})` : p.name)).join(' and ');
  text(ctx, `The Imposters were ${imps}.`, W / 2, H * 0.93, 26 * u, '#c9d1e0', { weight: 700 });
  if (t > 2) rich(ctx, ['Press ', { btn: 'A' }, ' to play again'], W / 2, H * 0.975, 26 * u, '#fff');
}
