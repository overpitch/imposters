import { COLORS, SETTINGS as S } from './config.js';
import { ShipMap, VENTS, SABOTAGES } from './map.js';
import { Game } from './game.js';
import { Input } from './input.js';
import { drawWorld, drawHud, drawKillSplash } from './render.js';
import { drawLobby, drawReveal, drawMap, drawMeeting, drawEject, drawOver, drawControllerHelp, chatOptions } from './ui.js';
import { makeMiniGame } from './tasks.js';
import { text, setGlyphs } from './draw.js';
import { settings, saveSettings, ROLE_CHOICES } from './settings.js';
import { sfx } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W = 0, H = 0, dpr = 1;
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
}
addEventListener('resize', resize);
resize();

const map = new ShipMap();
const input = new Input();

let screen = 'lobby';                  // lobby | game
const slots = [null, null, null, null]; // { device, color, ready, missingSince }
let startAt = null;
let game = null;
let humans = [];                        // { player, ui }

// ---------------------------------------------------------------------------
// Controllers that vanish / get taken over (same rules as Snakes)

const TAKEOVER_AFTER = 4;
function trackMissing(owners, devOf) {
  const now = performance.now() / 1000;
  for (const o of owners) o.missingSince = input.state(devOf(o)) ? null : (o.missingSince ?? now);
}
function takeOver(owners, devOf, setDev) {
  const taken = [];
  const now = performance.now() / 1000;
  for (const id of input.ids()) {
    if (owners.some((o) => devOf(o) === id) || !input.pressed(id, 'a')) continue;
    const orphan = owners.find((o) => o.missingSince !== null && o.missingSince !== undefined && now - o.missingSince > TAKEOVER_AFTER);
    if (!orphan) break;
    setDev(orphan, id);
    taken.push(id);
  }
  return taken;
}

// ---------------------------------------------------------------------------
// Lobby

function freeColor(from, dir, mine) {
  const used = new Set(slots.filter((s) => s && s !== mine).map((s) => s.color));
  let c = from;
  for (let i = 0; i < COLORS.length; i++) {
    c = (c + dir + COLORS.length) % COLORS.length;
    if (!used.has(c)) return c;
  }
  return from;
}

function setComputer(on) {
  settings.computer = on;
  saveSettings();
  // The arrow-keys player only exists without computer controls.
  if (on) for (let i = 0; i < slots.length; i++) if (slots[i]?.device === 'kb2') slots[i] = null;
  sfx('blip');
}

function updateLobby() {
  if (input.keysPressed?.has('KeyC')) setComputer(!settings.computer);
  const owners = slots.filter(Boolean);
  trackMissing(owners, (s) => s.device);
  const taken = slots.includes(null) ? [] : takeOver(owners, (s) => s.device, (s, id) => { s.device = id; });
  for (const id of input.ids()) {
    if (taken.includes(id)) continue;
    const i = slots.findIndex((s) => s?.device === id);
    if (i < 0) {
      if (input.pressed(id, 'a')) {
        const free = slots.indexOf(null);
        if (free >= 0) {
          slots[free] = { device: id, color: 0, ready: false, missingSince: null };
          slots[free].color = freeColor([0, 1, 2, 3][free] * 3 - 1, 1, slots[free]);
          input.rumble(id, 120, 0.2, 0.5);
          sfx('blip');
        }
      }
      continue;
    }
    const s = slots[i];
    if (input.pressed(id, 'b')) { if (s.ready) s.ready = false; else slots[i] = null; continue; }
    if (!s.ready) {
      if (input.pressed(id, 'left')) { s.color = freeColor(s.color, -1, s); sfx('blip'); }
      if (input.pressed(id, 'right')) { s.color = freeColor(s.color, 1, s); sfx('blip'); }
    }
    if (input.pressed(id, 'a')) { s.ready = !s.ready; sfx('blip'); }
  }
  // Settings: anyone (joined or not) can change them.
  if (input.ids().some((id) => input.pressed(id, 'x'))) setComputer(!settings.computer);
  if (input.ids().some((id) => input.pressed(id, 'y'))) {
    settings.role = ROLE_CHOICES[(ROLE_CHOICES.indexOf(settings.role) + 1) % ROLE_CHOICES.length];
    saveSettings();
    sfx('blip');
  }
  const joined = slots.filter(Boolean);
  const now = performance.now() / 1000;
  if (!joined.length || !joined.every((s) => s.ready)) startAt = null;
  else if (startAt === null) startAt = now + 3;
  else if (now >= startAt) { startAt = null; startGame(); }
}

function startGame() {
  const list = slots.map((s, i) => (s ? { slot: i, device: s.device, color: s.color } : null)).filter(Boolean);
  game = new Game(map, list, { role: settings.role });
  humans = game.players.filter((p) => p.human).map((player) => ({ player, ui: newUi(player) }));
  screen = 'game';
  sfx('meeting');
}

function newUi(player) {
  return {
    cam: { x: player.x, y: player.y, z: 1 },
    mini: null, miniUse: null, menu: null, sabSel: 0, ventSel: null, ventStickWas: false,
    splash: null, toast: '', toastT: 0,
    cursor: player.id, confirm: false, chat: false, chatSel: 0,
    missingSince: null,
  };
}

function toLobby() {
  for (const s of slots) if (s) s.ready = false;
  screen = 'lobby';
  game = null;
  humans = [];
}

// ---------------------------------------------------------------------------
// Playing

const keySmooth = new Map();
function miniInput(id, dt) {
  const st = input.state(id) ?? {};
  let sx = st.stickX ?? 0, sy = st.stickY ?? 0;
  if (input.isKeyboard(id)) {
    // Keys are all-or-nothing; ease them so stick-style tasks (like swiping a card) work.
    const s = keySmooth.get(id) ?? { x: 0, y: 0 };
    const k = 2.4 * dt;
    s.x += Math.max(-k, Math.min(k, sx - s.x));
    s.y += Math.max(-k, Math.min(k, sy - s.y));
    keySmooth.set(id, s);
    sx = s.x; sy = s.y;
  }
  return {
    sx, sy, a: !!st.a,
    aP: input.pressed(id, 'a'), bP: input.pressed(id, 'b'),
    upP: input.pressed(id, 'up'), downP: input.pressed(id, 'down'), leftP: input.pressed(id, 'left'), rightP: input.pressed(id, 'right'),
  };
}

function toast(h, msg) { h.ui.toast = msg; h.ui.toastT = 2; }

function closeMini(h) {
  const p = h.player;
  if (h.ui.miniUse?.game === 'scan' && !h.ui.mini?.done) p.scanning = 0;
  h.ui.mini = null; h.ui.miniUse = null;
  p.busy = null;
}

function updateHuman(h, dt) {
  const p = h.player, ui = h.ui, id = p.device;
  ui.toastT = Math.max(0, ui.toastT - dt);
  const st = input.state(id);
  if (!st) { p.moving = false; return; }
  if (ui.splash && game.time - ui.splash.t < 1.8) { p.moving = false; return; }

  // Mini-game open.
  if (ui.mini) {
    const use = ui.miniUse;
    // A sabotage fix that got fixed by someone else (or ended) closes itself.
    if (use.kind === 'fix' && (!game.sabotage || game.sabotage.fixed.has(use.station)) && !ui.mini.done) { closeMini(h); return; }
    const inp = miniInput(id, dt);
    ui.mini.tick(dt, inp);
    if (ui.mini.done) {
      if (!ui.mini.finished) {
        ui.mini.finished = true;
        if (use.kind === 'task' && use.game !== 'scan') game.completeStep(p, use.task);
        if (use.kind === 'fix' && use.game !== 'reactor') game.fixStation(use.station);
      }
      if (ui.mini.doneT > 0.7) closeMini(h);
    } else if (inp.bP) closeMini(h);
    return;
  }

  // Map / sabotage menus.
  if (ui.menu) {
    p.moving = false;
    if (input.pressed(id, 'b') || (ui.menu === 'map' && input.pressed(id, 'lb')) || (ui.menu === 'sabotage' && input.pressed(id, 'rb'))) { ui.menu = null; return; }
    if (ui.menu === 'sabotage') {
      const n = Object.keys(SABOTAGES).length;
      if (input.pressed(id, 'left')) ui.sabSel = (ui.sabSel + n - 1) % n;
      if (input.pressed(id, 'right')) ui.sabSel = (ui.sabSel + 1) % n;
      if (input.pressed(id, 'a') && game.startSabotage(p, Object.keys(SABOTAGES)[ui.sabSel])) ui.menu = null;
    }
    return;
  }

  // In a vent: pick a connected vent with the stick, A to climb out.
  if (p.vent) {
    const v = VENTS.find((q) => q.id === p.vent);
    const mag = Math.hypot(st.stickX, st.stickY);
    if (mag > 0.5) {
      const a = Math.atan2(st.stickY, st.stickX);
      let best = null, bd = 1.2;
      for (const lid of v.links) {
        const o = VENTS.find((q) => q.id === lid);
        const d = Math.abs(Math.atan2(Math.sin(Math.atan2(o.y - v.y, o.x - v.x) - a), Math.cos(Math.atan2(o.y - v.y, o.x - v.x) - a)));
        if (d < bd) { bd = d; best = lid; }
      }
      ui.ventSel = best;
      if (best && !ui.ventStickWas) { game.moveVent(p, best); sfx('vent'); }
      ui.ventStickWas = true;
    } else { ui.ventStickWas = false; ui.ventSel = null; }
    if (input.pressed(id, 'a')) game.exitVent(p);
    return;
  }

  game.moveIntent(p, st.stickX, st.stickY, dt);

  if (input.pressed(id, 'a')) {
    const use = game.usable(p);
    if (use?.kind === 'task' || use?.kind === 'fix') {
      ui.mini = makeMiniGame(use.game, game, p, use.station);
      ui.miniUse = use;
      p.busy = { kind: use.game, sabotage: use.kind === 'fix' };
      p.moving = false;
    } else if (use?.kind === 'emergency') {
      if (!game.pressEmergency(p)) {
        toast(h, p.emergencies <= 0 ? 'You have no emergency meetings left.'
          : game.buttonCd > 0 ? `Emergency button ready in ${Math.ceil(game.buttonCd)}s` : 'Can\'t call a meeting during a crisis!');
      }
    } else if (use?.kind === 'vent') { game.enterVent(p, use.vent); sfx('vent'); }
  }
  if (input.pressed(id, 'x')) { const t = game.killTarget(p); if (t && p.killCd <= 0) game.kill(p, t); }
  if (input.pressed(id, 'y')) { const b = game.reportTarget(p); if (b) game.report(p, b); }
  if (input.pressed(id, 'lb')) ui.menu = 'map';
  if (input.pressed(id, 'rb') && p.role === 'imp') ui.menu = 'sabotage';
}

function updateMeetingInput() {
  const m = game.meeting;
  if (m.phase !== 'discuss' && m.phase !== 'vote') return;
  for (const h of humans) {
    const p = h.player, ui = h.ui, id = p.device;
    if (!p.alive || !input.state(id)) continue;
    if (ui.chat) {
      const opts = chatOptions(game, h);
      if (input.pressed(id, 'up')) ui.chatSel = (ui.chatSel + opts.length - 1) % opts.length;
      if (input.pressed(id, 'down')) ui.chatSel = (ui.chatSel + 1) % opts.length;
      if (input.pressed(id, 'b')) ui.chat = false;
      if (input.pressed(id, 'a')) { const o = opts[ui.chatSel]; game.say(p, o.text, o.meta); ui.chat = false; }
      continue;
    }
    // Cursor over the 2x4 grid + Skip (index 8).
    const c = ui.cursor;
    if (input.pressed(id, 'left') && c < 8) ui.cursor = c % 2 ? c - 1 : c;
    if (input.pressed(id, 'right') && c < 8) ui.cursor = c % 2 ? c : c + 1;
    if (input.pressed(id, 'up')) ui.cursor = c === 8 ? 6 : c >= 2 ? c - 2 : c;
    if (input.pressed(id, 'down')) ui.cursor = c >= 6 ? 8 : c + 2;
    if (ui.cursor !== c) { ui.confirm = false; sfx('blip'); }
    if (input.pressed(id, 'x')) { ui.chat = true; ui.chatSel = 0; ui.confirm = false; }
    if (input.pressed(id, 'b')) ui.confirm = false;
    if (input.pressed(id, 'a') && m.phase === 'vote' && !m.votes.has(p.id)) {
      const target = ui.cursor === 8 ? 'skip' : game.players[ui.cursor];
      if (target !== 'skip' && !target.alive) continue;
      if (!ui.confirm) ui.confirm = true;
      else { game.vote(p, target); ui.confirm = false; }
    }
  }
}

function handleEvents() {
  for (const e of game.events) {
    switch (e.type) {
      case 'kill': {
        sfx('kill');
        const h = humans.find((q) => q.player === e.victim);
        if (h) { closeMini(h); h.ui.menu = null; h.ui.splash = { killer: e.killer, victim: e.victim, t: game.time }; input.rumble(h.player.device, 600, 1, 1); }
        const k = humans.find((q) => q.player === e.killer);
        if (k) input.rumble(k.player.device, 200, 0.6, 0.3);
        break;
      }
      case 'report': case 'emergency':
        sfx(e.type === 'report' ? 'report' : 'meeting');
        for (const h of humans) {
          closeMini(h); h.ui.menu = null; h.ui.confirm = false; h.ui.chat = false; h.ui.cursor = h.player.id;
          input.rumble(h.player.device, 300, 0.5, 0.5);
        }
        break;
      case 'task': if (e.p.human) sfx('task'); break;
      case 'sabotage': sfx('sabotage'); break;
      case 'fixed': sfx('fixed'); break;
      case 'chat': sfx('blip'); break;
      case 'vote': sfx('vote'); break;
      case 'eject': sfx('eject'); break;
      case 'win': {
        const humanWon = humans.some((h) => (h.player.role === 'crew') === (e.team === 'crew'));
        sfx(humanWon ? 'win' : 'lose');
        break;
      }
    }
  }
  game.events.length = 0;
}

function updateGame(dt) {
  // Controllers: hold the game while one is missing; another can take it over.
  trackMissing(humans.map((h) => h.ui), (ui) => humans.find((h) => h.ui === ui).player.device);
  takeOver(humans.map((h) => h.ui), (ui) => humans.find((h) => h.ui === ui).player.device, (ui, id) => { humans.find((h) => h.ui === ui).player.device = id; });
  if (humans.some((h) => !input.state(h.player.device))) return;

  if (game.state === 'over') {
    if (game.stateTime > 2 && humans.some((h) => input.pressed(h.player.device, 'a'))) { toLobby(); return; }
  }
  if (game.state === 'play') for (const h of humans) updateHuman(h, dt);
  if (game.state === 'meeting') updateMeetingInput();

  const steps = Math.ceil(dt / (1 / 30));
  for (let i = 0; i < steps; i++) game.update(dt / steps);
  handleEvents();
}

// ---------------------------------------------------------------------------
// Rendering

function views(n) {
  if (n <= 1) return [{ x: 0, y: 0, w: W, h: H }];
  if (n === 2) return [{ x: 0, y: 0, w: W / 2, h: H }, { x: W / 2, y: 0, w: W / 2, h: H }];
  return [0, 1, 2, 3].map((i) => ({ x: (i % 2) * W / 2, y: ((i / 2) | 0) * H / 2, w: W / 2, h: H / 2 }));
}

function updateCam(ui, p, view, dt) {
  const z = Math.min(view.w / 1000, view.h / 820); // vision circle ≈ screen height, like the original
  const k = 1 - Math.exp(-dt * 10);
  ui.cam.x += (p.x - ui.cam.x) * k;
  ui.cam.y += (p.y - ui.cam.y) * k;
  ui.cam.z = z;
}

function render(dt) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  const u = Math.min(W / 1920, H / 1080);

  const keysFor = (p) => settings.computer && input.isKeyboard(p.device);
  for (const h of humans) h.keys = keysFor(h.player);
  setGlyphs(settings.computer && (screen === 'lobby' || humans.some((h) => h.keys)) ? 'keys' : 'pad');

  if (screen === 'lobby') {
    drawLobby(ctx, W, H, {
      settings,
      t: performance.now() / 1000, slots,
      countdown: startAt === null ? null : Math.max(0, startAt - performance.now() / 1000),
      deviceLabel: (id) => input.label(id),
      needHelp: !settings.computer && (input.browsingMode() || slots.some((s) => s && !input.state(s.device)) || (input.padCount() === 0 && !slots.some(Boolean))),
    });
    return;
  }

  if (game.state === 'meeting') { drawMeeting(ctx, W, H, game, humans); return; }
  if (game.state === 'eject') { drawEject(ctx, W, H, game, game.stateTime); return; }
  if (game.state === 'over') { drawOver(ctx, W, H, game, humans, game.stateTime); return; }

  const vs = views(humans.length);
  humans.forEach((h, i) => {
    const view = vs[i], p = h.player, ui = h.ui;
    setGlyphs(h.keys ? 'keys' : 'pad');
    if (game.state === 'reveal') { drawReveal(ctx, view, game, p, game.stateTime / 5); return; }
    updateCam(ui, p, view, dt);
    drawWorld(ctx, game, view, ui.cam, p, { ventSel: ui.ventSel });
    drawHud(ctx, game, view, p, ui);
    if (ui.menu) drawMap(ctx, view, game, p, ui.menu, ui.sabSel);
    if (ui.mini) {
      const s = Math.min(view.w, view.h) * 0.86;
      ui.mini.draw(ctx, { x: view.x + view.w / 2 - s / 2, y: view.y + view.h / 2 - s / 2, w: s, h: s });
    }
    if (ui.splash) {
      const k = (game.time - ui.splash.t) / 1.8;
      if (k < 1) drawKillSplash(ctx, view, ui.splash.killer, ui.splash.victim, k);
    }
    if (ui.toastT > 0) {
      const vu = Math.min(view.w / 1280, view.h / 720);
      text(ctx, ui.toast, view.x + view.w / 2, view.y + view.h * 0.3, 26 * vu, '#ffd84a', { weight: 900, stroke: 5 * vu });
    }
    if (!input.state(p.device)) {
      ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(view.x, view.y, view.w, view.h);
      const k = Math.min(1, view.w / (1240 * u));
      ctx.translate(view.x + view.w / 2, view.y + view.h * 0.3); ctx.scale(k, k);
      drawControllerHelp(ctx, 0, 0, u);
      ctx.restore();
    }
  });
  if (humans.length === 3) { // the spare quadrant
    const v = vs[3];
    ctx.fillStyle = '#05070d'; ctx.fillRect(v.x, v.y, v.w, v.h);
    text(ctx, 'IMPOSTERS', v.x + v.w / 2, v.y + v.h * 0.4, 70 * u, '#ff3b3b', { weight: 900 });
    text(ctx, `Tasks: ${Math.round(game.taskProgress() * 100)}%`, v.x + v.w / 2, v.y + v.h * 0.6, 34 * u, '#5dff6a', { weight: 800 });
  }
  // Dividers.
  ctx.fillStyle = '#000';
  if (humans.length >= 2) ctx.fillRect(W / 2 - 3 * u, 0, 6 * u, H);
  if (humans.length >= 3) ctx.fillRect(0, H / 2 - 3 * u, W, 6 * u);
}

// ---------------------------------------------------------------------------

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  input.poll();
  if (screen === 'lobby') updateLobby();
  else updateGame(dt);
  render(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Handy for debugging and the Xbox simulator's scripted tests.
window.imposters = {
  get game() { return game; }, get humans() { return humans; }, slots, input, startGame,
  /** Advance one frame by hand (for scripted tests when the page isn't animating). */
  tick(dt = 1 / 30) { input.poll(); if (screen === 'lobby') updateLobby(); else updateGame(dt); render(dt); },
};
