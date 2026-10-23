// Task mini-games, played with a controller inside a player's own screen.
// Each mini-game: update(dt, inp) and draw(ctx, box). `done` when finished.
// inp: { sx, sy, a, aP, bP, upP, downP, leftP, rightP }  (P = pressed this frame)

import { text, panel } from './draw.js';

const rand = (a, b) => a + Math.random() * (b - a);
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const TAU = Math.PI * 2;

class MiniGame {
  constructor(title, hint) { this.title = title; this.hint = hint; this.done = false; this.doneT = 0; this.msg = ''; this.msgT = 0; }
  flash(msg) { this.msg = msg; this.msgT = 1.6; }
  tick(dt, inp) {
    this.msgT = Math.max(0, this.msgT - dt);
    if (this.done) { this.doneT += dt; return; }
    this.update(dt, inp);
  }
  /** Shared frame: dark panel, title, hint, message, "done" stamp. Returns the inner box. */
  frame(ctx, box) {
    const { x, y, w, h } = box;
    panel(ctx, x, y, w, h, w * 0.03, '#1f242e', '#8a93a6', w * 0.008);
    text(ctx, this.title, x + w / 2, y + h * 0.055, w * 0.045, '#fff', { weight: 900 });
    text(ctx, this.hint, x + w / 2, y + h * 0.955, w * 0.03, '#b8c0d0', { weight: 600 });
    return { x: x + w * 0.06, y: y + h * 0.11, w: w * 0.88, h: h * 0.78 };
  }
  overlay(ctx, box) {
    const { x, y, w, h } = box;
    if (this.msgT > 0) text(ctx, this.msg, x + w / 2, y + h * 0.5, w * 0.06, '#ff6b6b', { weight: 900, stroke: w * 0.012 });
    if (this.done) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(x, y, w, h);
      text(ctx, 'TASK COMPLETE!', x + w / 2, y + h * 0.5, w * 0.075, '#5dff6a', { weight: 900, stroke: w * 0.012 });
    }
  }
}

// ---------------------------------------------------------------------------

class Swipe extends MiniGame {
  constructor() { super('Swipe Card', 'Push the stick from left to right at a steady speed'); this.pos = 0; this.armed = false; this.t = 0; }
  update(dt, inp) {
    this.pos = (inp.sx + 1) / 2;
    if (inp.sx < -0.6) { this.armed = true; this.t = 0; return; }
    if (this.armed) {
      this.t += dt;
      if (inp.sx > 0.85) {
        this.armed = false;
        if (this.t < 0.35) this.flash('Too fast. Try again.');
        else if (this.t > 1.3) this.flash('Too slow. Try again.');
        else this.done = true;
      } else if (Math.abs(inp.sx) < 0.05 && this.t > 0.6) { this.armed = false; this.flash('Bad read. Try again.'); }
    }
  }
  draw(ctx, box) {
    const b = this.frame(ctx, box);
    ctx.fillStyle = '#3a414f';
    ctx.fillRect(b.x, b.y + b.h * 0.42, b.w, b.h * 0.16);
    ctx.fillStyle = this.done ? '#5dff6a' : this.armed ? '#ffd84a' : '#ff6b6b';
    ctx.beginPath(); ctx.arc(b.x + b.w * 0.95, b.y + b.h * 0.3, b.w * 0.025, 0, TAU); ctx.fill();
    const cx = b.x + b.w * (0.05 + 0.75 * (this.done ? 1 : this.pos));
    const cw = b.w * 0.18, ch = b.h * 0.3;
    ctx.fillStyle = '#e8eef8';
    ctx.fillRect(cx, b.y + b.h * 0.35, cw, ch);
    ctx.fillStyle = '#5fd4ff';
    ctx.fillRect(cx + cw * 0.08, b.y + b.h * 0.39, cw * 0.35, ch * 0.45);
    text(ctx, 'ID', cx + cw * 0.72, b.y + b.h * 0.47, cw * 0.18, '#333', { weight: 900 });
    this.overlay(ctx, box);
  }
}

class HoldFill extends MiniGame { // Fuel Engines
  constructor() { super('Fuel Engines', 'Hold A to fill'); this.v = 0; this.holding = false; }
  update(dt, inp) {
    this.holding = inp.a;
    if (inp.a) this.v = Math.min(1, this.v + dt / 3);
    if (this.v >= 1) this.done = true;
  }
  draw(ctx, box) {
    const b = this.frame(ctx, box);
    const tw = b.w * 0.36, th = b.h * 0.8, tx = b.x + b.w / 2 - tw / 2, ty = b.y + b.h * 0.08;
    ctx.fillStyle = '#2b313c'; ctx.fillRect(tx, ty, tw, th);
    ctx.fillStyle = '#ffbf3a'; ctx.fillRect(tx, ty + th * (1 - this.v), tw, th * this.v);
    ctx.strokeStyle = '#8a93a6'; ctx.lineWidth = b.w * 0.01; ctx.strokeRect(tx, ty, tw, th);
    text(ctx, `${Math.round(this.v * 100)}%`, b.x + b.w / 2, ty + th / 2, b.w * 0.07, '#fff', { weight: 900, stroke: b.w * 0.01 });
    this.overlay(ctx, box);
  }
}

class Transfer extends MiniGame { // Download / Upload
  constructor(upload) { super(upload ? 'Upload Data' : 'Download Data', upload ? 'Press A to upload' : 'Press A to download'); this.upload = upload; this.v = -1; }
  update(dt, inp) {
    if (this.v < 0) { if (inp.aP) this.v = 0; return; }
    this.v = Math.min(1, this.v + dt / 6);
    if (this.v >= 1) this.done = true;
  }
  draw(ctx, box, t = performance.now() / 1000) {
    const b = this.frame(ctx, box);
    const fy = b.y + b.h * 0.35;
    text(ctx, '🗂️', b.x + b.w * 0.15, fy, b.w * 0.12, '#fff');
    text(ctx, this.upload ? '🌐' : '📁', b.x + b.w * 0.85, fy, b.w * 0.12, '#fff');
    if (this.v >= 0 && !this.done) {
      const k = (t * 1.5) % 1;
      text(ctx, '📄', b.x + b.w * (0.2 + 0.6 * k), fy - Math.sin(k * Math.PI) * b.h * 0.12, b.w * 0.06, '#fff');
    }
    const bx = b.x + b.w * 0.1, bw = b.w * 0.8, by = b.y + b.h * 0.65, bh = b.h * 0.09;
    ctx.fillStyle = '#2b313c'; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = '#5dff6a'; ctx.fillRect(bx, by, bw * Math.max(0, this.v), bh);
    if (this.v < 0) text(ctx, this.upload ? 'UPLOAD' : 'DOWNLOAD', b.x + b.w / 2, by + bh * 2.2, b.w * 0.06, '#ffd84a', { weight: 900 });
    else text(ctx, `${Math.round(this.v * 100)}%   ${Math.ceil((1 - this.v) * 6)}s left`, b.x + b.w / 2, by + bh * 2.2, b.w * 0.045, '#fff');
    this.overlay(ctx, box);
  }
}

class Scan extends MiniGame { // MedBay scan: the game counts it down; others can see you being scanned
  constructor(game, player) { super('Submit Scan', 'Stand still while scanning (B to stop)'); this.game = game; this.p = player; game.startScan(player); this.total = player.scanning; }
  update() {
    if (this.p.scanning <= 0) this.done = true;
  }
  draw(ctx, box) {
    const b = this.frame(ctx, box);
    const k = this.done ? 1 : 1 - this.p.scanning / this.total;
    text(ctx, '🧍', b.x + b.w / 2, b.y + b.h * 0.4, b.w * 0.25, '#fff');
    const sy = b.y + b.h * (0.15 + 0.5 * ((performance.now() / 700) % 1));
    ctx.fillStyle = 'rgba(93,255,106,0.45)'; ctx.fillRect(b.x + b.w * 0.25, sy, b.w * 0.5, b.h * 0.02);
    const lines = ['ID: OK', 'HEIGHT: 3\'6"', 'WEIGHT: 92lb', 'BLOOD TYPE: O-'];
    lines.forEach((l, i) => { if (k > (i + 1) / 5) text(ctx, l, b.x + b.w * 0.05, b.y + b.h * (0.7 + i * 0.06), b.w * 0.035, '#5dff6a', { align: 'left' }); });
    const bx = b.x + b.w * 0.55, bw = b.w * 0.4, by = b.y + b.h * 0.8, bh = b.h * 0.06;
    ctx.fillStyle = '#2b313c'; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = '#5dff6a'; ctx.fillRect(bx, by, bw * k, bh);
    this.overlay(ctx, box);
  }
}

class Divert extends MiniGame {
  constructor() { super('Divert Power', 'Push the stick up on the glowing slider'); this.target = (Math.random() * 8) | 0; this.v = 0; }
  update(dt, inp) {
    if (inp.sy < -0.5) this.v = Math.min(1, this.v + dt * 1.4);
    if (this.v >= 1) this.done = true;
  }
  draw(ctx, box) {
    const b = this.frame(ctx, box);
    const ROOMS = ['Weapons', 'Shields', 'Nav', 'Comms', 'O2', 'Engines', 'Security', 'Reactor'];
    for (let i = 0; i < 8; i++) {
      const sx = b.x + b.w * (0.06 + i * 0.12), top = b.y + b.h * 0.1, hgt = b.h * 0.65;
      ctx.fillStyle = '#2b313c'; ctx.fillRect(sx, top, b.w * 0.04, hgt);
      const v = i === this.target ? this.v : 0;
      const glow = i === this.target && !this.done;
      ctx.fillStyle = glow ? '#ffd84a' : '#8a93a6';
      ctx.fillRect(sx - b.w * 0.02, top + hgt * (1 - v) - b.h * 0.03, b.w * 0.08, b.h * 0.06);
      text(ctx, ROOMS[i], sx + b.w * 0.02, top + hgt + b.h * 0.07, b.w * 0.022, glow ? '#ffd84a' : '#b8c0d0');
    }
    this.overlay(ctx, box);
  }
}

class Accept extends MiniGame {
  constructor() { super('Accept Diverted Power', 'Press A to flip the switch'); }
  update(dt, inp) { if (inp.aP) this.done = true; }
  draw(ctx, box) {
    const b = this.frame(ctx, box);
    ctx.fillStyle = '#2b313c'; ctx.fillRect(b.x + b.w * 0.4, b.y + b.h * 0.2, b.w * 0.2, b.h * 0.5);
    ctx.fillStyle = this.done ? '#5dff6a' : '#ffd84a';
    ctx.fillRect(b.x + b.w * 0.42, b.y + b.h * (this.done ? 0.22 : 0.45), b.w * 0.16, b.h * 0.23);
    text(ctx, '⚡', b.x + b.w / 2, b.y + b.h * 0.85, b.w * 0.1, '#ffd84a');
    this.overlay(ctx, box);
  }
}

const WIRE_COLORS = ['#ff3b3b', '#3b7bff', '#ffd83b', '#ff3bd8'];
class Wires extends MiniGame {
  constructor() {
    super('Fix Wiring', 'Pick a wire with ↕ + A, then its matching end');
    this.right = shuffle([0, 1, 2, 3]);
    this.left = shuffle([0, 1, 2, 3]);
    this.links = new Map(); // left index -> right index
    this.side = 'L'; this.cur = 0; this.grab = null;
  }
  update(dt, inp) {
    if (inp.upP) this.cur = (this.cur + 3) % 4;
    if (inp.downP) this.cur = (this.cur + 1) % 4;
    if (inp.bP && this.side === 'R') { this.side = 'L'; this.cur = this.grab; this.grab = null; inp.bP = false; }
    if (!inp.aP) return;
    if (this.side === 'L') {
      if (this.links.has(this.cur)) return;
      this.grab = this.cur; this.side = 'R';
    } else {
      if (this.left[this.grab] === this.right[this.cur] && ![...this.links.values()].includes(this.cur)) {
        this.links.set(this.grab, this.cur);
        if (this.links.size === 4) this.done = true;
      } else this.flash('Wrong color!');
      this.side = 'L';
      this.cur = [0, 1, 2, 3].find((i) => !this.links.has(i)) ?? 0;
      this.grab = null;
    }
  }
  draw(ctx, box) {
    const b = this.frame(ctx, box);
    const ry = (i) => b.y + b.h * (0.12 + i * 0.25);
    const lx = b.x + b.w * 0.08, rx = b.x + b.w * 0.92;
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = WIRE_COLORS[this.left[i]]; ctx.fillRect(b.x, ry(i) - b.h * 0.03, b.w * 0.1, b.h * 0.06);
      ctx.fillStyle = WIRE_COLORS[this.right[i]]; ctx.fillRect(b.x + b.w * 0.9, ry(i) - b.h * 0.03, b.w * 0.1, b.h * 0.06);
    }
    ctx.lineWidth = b.h * 0.035;
    for (const [l, r] of this.links) {
      ctx.strokeStyle = WIRE_COLORS[this.left[l]];
      ctx.beginPath(); ctx.moveTo(lx, ry(l)); ctx.lineTo(rx, ry(r)); ctx.stroke();
    }
    if (this.grab !== null) {
      ctx.strokeStyle = WIRE_COLORS[this.left[this.grab]];
      ctx.globalAlpha = 0.6;
      ctx.beginPath(); ctx.moveTo(lx, ry(this.grab)); ctx.lineTo(rx, ry(this.cur)); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (!this.done) {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = b.w * 0.008;
      const cx = this.side === 'L' ? b.x - b.w * 0.01 : b.x + b.w * 0.89;
      ctx.strokeRect(cx, ry(this.cur) - b.h * 0.05, b.w * 0.12, b.h * 0.1);
    }
    this.overlay(ctx, box);
  }
}

class Asteroids extends MiniGame {
  constructor() { super('Clear Asteroids', 'Aim with the stick, A to shoot'); this.cx = 0.5; this.cy = 0.5; this.rocks = []; this.left = 12; this.shots = []; for (let i = 0; i < 4; i++) this.spawn(true); }
  spawn(any) { this.rocks.push({ x: any ? rand(0.4, 1) : 1.1, y: rand(0.1, 0.9), vx: -rand(0.12, 0.25), vy: rand(-0.05, 0.05), r: rand(0.04, 0.07) }); }
  update(dt, inp) {
    this.cx = clamp(this.cx + inp.sx * dt * 0.9, 0, 1);
    this.cy = clamp(this.cy + inp.sy * dt * 0.9, 0, 1);
    for (const r of this.rocks) { r.x += r.vx * dt; r.y += r.vy * dt; }
    this.rocks = this.rocks.filter((r) => r.x > -0.1);
    while (this.rocks.length < 4) this.spawn(false);
    this.shots = this.shots.filter((s) => (s.t -= dt) > 0);
    if (inp.aP) {
      this.shots.push({ x: this.cx, y: this.cy, t: 0.15 });
      const hit = this.rocks.find((r) => Math.hypot(r.x - this.cx, r.y - this.cy) < r.r + 0.03);
      if (hit) { this.rocks.splice(this.rocks.indexOf(hit), 1); this.left--; if (this.left <= 0) this.done = true; }
    }
  }
  draw(ctx, box) {
    const b = this.frame(ctx, box);
    ctx.fillStyle = '#0a1a10'; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.save(); ctx.beginPath(); ctx.rect(b.x, b.y, b.w, b.h); ctx.clip();
    ctx.fillStyle = '#7d8b6a';
    for (const r of this.rocks) { ctx.beginPath(); ctx.arc(b.x + r.x * b.w, b.y + r.y * b.h, r.r * b.w, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = '#5dff6a'; ctx.lineWidth = b.w * 0.005;
    for (const s of this.shots) { ctx.beginPath(); ctx.moveTo(b.x + b.w * 0.5, b.y + b.h); ctx.lineTo(b.x + s.x * b.w, b.y + s.y * b.h); ctx.stroke(); }
    const x = b.x + this.cx * b.w, y = b.y + this.cy * b.h, r = b.w * 0.04;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.moveTo(x - r * 1.5, y); ctx.lineTo(x + r * 1.5, y); ctx.moveTo(x, y - r * 1.5); ctx.lineTo(x, y + r * 1.5); ctx.stroke();
    ctx.restore();
    text(ctx, `Destroyed: ${12 - this.left}/12`, b.x + b.w / 2, b.y + b.h * 0.05, b.w * 0.04, '#5dff6a', { weight: 800 });
    this.overlay(ctx, box);
  }
}

class Filter extends MiniGame {
  constructor() {
    super('Clean O2 Filter', 'Hold A on a leaf and drag it into the vent on the left');
    this.cx = 0.6; this.cy = 0.5; this.held = null;
    this.leaves = Array.from({ length: 6 }, () => ({ x: rand(0.35, 0.95), y: rand(0.1, 0.9), a: rand(0, TAU) }));
  }
  update(dt, inp) {
    this.cx = clamp(this.cx + inp.sx * dt * 0.9, 0, 1);
    this.cy = clamp(this.cy + inp.sy * dt * 0.9, 0, 1);
    if (inp.a && !this.held) this.held = this.leaves.find((l) => Math.hypot(l.x - this.cx, l.y - this.cy) < 0.08) ?? null;
    if (!inp.a) this.held = null;
    if (this.held) { this.held.x = this.cx; this.held.y = this.cy; }
    this.leaves = this.leaves.filter((l) => l.x > 0.12);
    if (this.held && !this.leaves.includes(this.held)) this.held = null;
    if (!this.leaves.length) this.done = true;
  }
  draw(ctx, box) {
    const b = this.frame(ctx, box);
    ctx.fillStyle = '#2b313c'; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = '#11151c'; ctx.fillRect(b.x, b.y + b.h * 0.25, b.w * 0.12, b.h * 0.5);
    for (const l of this.leaves) text(ctx, '🍃', b.x + l.x * b.w, b.y + l.y * b.h, b.w * 0.08, '#fff');
    ctx.strokeStyle = '#fff'; ctx.lineWidth = b.w * 0.006;
    ctx.beginPath(); ctx.arc(b.x + this.cx * b.w, b.y + this.cy * b.h, b.w * 0.035, 0, TAU); ctx.stroke();
    this.overlay(ctx, box);
  }
}

class Prime extends MiniGame {
  constructor() {
    super('Prime Shields', 'Move between the shields, A on the red ones');
    this.hex = [[0, 0], ...Array.from({ length: 6 }, (_, i) => [Math.cos(i * TAU / 6 - Math.PI / 2), Math.sin(i * TAU / 6 - Math.PI / 2)])]
      .map(([x, y]) => ({ x, y, red: Math.random() < 0.5 }));
    if (!this.hex.some((h) => h.red)) this.hex[3].red = true;
    this.cur = 0;
  }
  update(dt, inp) {
    const dir = inp.upP ? [0, -1] : inp.downP ? [0, 1] : inp.leftP ? [-1, 0] : inp.rightP ? [1, 0] : null;
    if (dir) {
      const c = this.hex[this.cur];
      let best = this.cur, bs = 0.3;
      this.hex.forEach((h, i) => {
        const dx = h.x - c.x, dy = h.y - c.y, d = Math.hypot(dx, dy);
        if (!d) return;
        const s = (dx * dir[0] + dy * dir[1]) / d - d * 0.1;
        if (s > bs) { bs = s; best = i; }
      });
      this.cur = best;
    }
    if (inp.aP) this.hex[this.cur].red = !this.hex[this.cur].red;
    if (!this.hex.some((h) => h.red)) this.done = true;
  }
  draw(ctx, box) {
    const b = this.frame(ctx, box);
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2, R = b.w * 0.27, r = b.w * 0.13;
    this.hex.forEach((h, i) => {
      const x = cx + h.x * R, y = cy + h.y * R;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) ctx.lineTo(x + Math.cos(k * TAU / 6) * r, y + Math.sin(k * TAU / 6) * r);
      ctx.closePath();
      ctx.fillStyle = h.red ? '#d84848' : '#e8eef8'; ctx.fill();
      ctx.strokeStyle = i === this.cur && !this.done ? '#ffd84a' : '#2b313c'; ctx.lineWidth = b.w * (i === this.cur ? 0.012 : 0.006); ctx.stroke();
    });
    this.overlay(ctx, box);
  }
}

class Garbage extends MiniGame {
  constructor() { super('Empty Garbage', 'Hold the stick down to pull the lever'); this.v = 0; }
  update(dt, inp) {
    if (inp.sy > 0.6) this.v = Math.min(1, this.v + dt / 2.5); else this.v = Math.max(0, this.v - dt);
    if (this.v >= 1) this.done = true;
  }
  draw(ctx, box) {
    const b = this.frame(ctx, box);
    ctx.fillStyle = '#2b313c'; ctx.fillRect(b.x + b.w * 0.2, b.y, b.w * 0.45, b.h);
    const fill = 1 - this.v;
    for (let i = 0; i < 14; i++) {
      const k = (i * 37 % 100) / 100;
      text(ctx, ['🍌', '🥫', '📦', '🍂'][i % 4], b.x + b.w * (0.25 + k * 0.35), b.y + b.h * (1 - fill * (0.15 + (i / 14) * 0.8)) + this.v * b.h * 0.6, b.w * 0.06, '#fff');
    }
    ctx.fillStyle = '#8a93a6'; ctx.fillRect(b.x + b.w * 0.82, b.y + b.h * 0.1, b.w * 0.03, b.h * 0.7);
    ctx.fillStyle = '#ff6b6b'; ctx.beginPath(); ctx.arc(b.x + b.w * 0.835, b.y + b.h * (0.15 + this.v * 0.6), b.w * 0.05, 0, TAU); ctx.fill();
    this.overlay(ctx, box);
  }
}

class Calibrate extends MiniGame {
  constructor() { super('Calibrate Distributor', 'Press A when the spinner lines up with the notch'); this.row = 0; this.a = [0, 0, 0]; this.target = [rand(0, TAU), rand(0, TAU), rand(0, TAU)]; }
  update(dt, inp) {
    this.a[this.row] = (this.a[this.row] + dt * (2.2 + this.row * 0.6)) % TAU;
    if (inp.aP) {
      const d = Math.abs(((this.a[this.row] - this.target[this.row] + Math.PI * 3) % TAU) - Math.PI);
      if (d < 0.35) { this.row++; if (this.row >= 3) this.done = true; }
      else { this.flash('Missed! Start over.'); this.row = 0; }
    }
  }
  draw(ctx, box) {
    const b = this.frame(ctx, box);
    const cols = ['#ffd84a', '#5fd4ff', '#9dff5f'];
    for (let i = 0; i < 3; i++) {
      const cx = b.x + b.w * 0.3, cy = b.y + b.h * (0.17 + i * 0.33), R = b.h * 0.13;
      ctx.strokeStyle = '#8a93a6'; ctx.lineWidth = b.w * 0.01;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
      ctx.fillStyle = cols[i];
      ctx.beginPath(); ctx.arc(cx + Math.cos(this.target[i]) * R, cy + Math.sin(this.target[i]) * R, b.w * 0.02, 0, TAU); ctx.fill();
      ctx.strokeStyle = i < this.row ? '#5dff6a' : i === this.row ? '#fff' : '#555';
      ctx.lineWidth = b.w * 0.012;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(this.a[i]) * R, cy + Math.sin(this.a[i]) * R); ctx.stroke();
      ctx.fillStyle = i < this.row ? '#5dff6a' : '#2b313c';
      ctx.fillRect(b.x + b.w * 0.55, cy - b.h * 0.04, b.w * 0.4, b.h * 0.08);
    }
    this.overlay(ctx, box);
  }
}

class Align extends MiniGame {
  constructor() { super('Align Engine Output', 'Move the stick up/down to line it up'); this.v = rand(-0.9, 0.9); if (Math.abs(this.v) < 0.3) this.v = 0.6; this.hold = 0; }
  update(dt, inp) {
    this.v = clamp(this.v + inp.sy * dt * 0.9, -1, 1);
    if (Math.abs(this.v) < 0.06) { this.hold += dt; if (this.hold > 0.7) this.done = true; } else this.hold = 0;
  }
  draw(ctx, box) {
    const b = this.frame(ctx, box);
    const cy = b.y + b.h / 2;
    ctx.strokeStyle = '#5dff6a'; ctx.setLineDash([b.w * 0.02, b.w * 0.02]); ctx.lineWidth = b.w * 0.006;
    ctx.beginPath(); ctx.moveTo(b.x, cy); ctx.lineTo(b.x + b.w, cy); ctx.stroke(); ctx.setLineDash([]);
    const y = cy + this.v * b.h * 0.42;
    ctx.fillStyle = Math.abs(this.v) < 0.06 ? '#5dff6a' : '#ffd84a';
    ctx.beginPath(); ctx.moveTo(b.x + b.w * 0.9, y); ctx.lineTo(b.x + b.w * 0.75, y - b.h * 0.06); ctx.lineTo(b.x + b.w * 0.75, y + b.h * 0.06); ctx.fill();
    ctx.strokeStyle = '#8a93a6'; ctx.lineWidth = b.w * 0.004;
    ctx.beginPath(); ctx.moveTo(b.x + b.w * 0.1, cy); ctx.lineTo(b.x + b.w * 0.75, y); ctx.stroke();
    this.overlay(ctx, box);
  }
}

class Chart extends MiniGame {
  constructor() { super('Chart Course', 'Push the stick toward the next point'); this.pts = Array.from({ length: 5 }, (_, i) => ({ x: 0.08 + i * 0.21, y: rand(0.2, 0.8) })); this.seg = 0; this.k = 0; }
  update(dt, inp) {
    const a = this.pts[this.seg], b = this.pts[this.seg + 1];
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if ((inp.sx * dx + inp.sy * dy) / d > 0.5) this.k += dt * 0.35 / d;
    if (this.k >= 1) { this.k = 0; this.seg++; if (this.seg >= this.pts.length - 1) this.done = true; }
  }
  draw(ctx, box) {
    const b = this.frame(ctx, box);
    ctx.fillStyle = '#1a2a44'; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = '#5fd4ff'; ctx.setLineDash([b.w * 0.015, b.w * 0.015]); ctx.lineWidth = b.w * 0.005;
    ctx.beginPath(); this.pts.forEach((p) => ctx.lineTo(b.x + p.x * b.w, b.y + p.y * b.h)); ctx.stroke(); ctx.setLineDash([]);
    this.pts.forEach((p, i) => { ctx.fillStyle = i <= this.seg ? '#5dff6a' : '#fff'; ctx.beginPath(); ctx.arc(b.x + p.x * b.w, b.y + p.y * b.h, b.w * 0.015, 0, TAU); ctx.fill(); });
    const s = Math.min(this.seg, this.pts.length - 2);
    const a = this.pts[s], c = this.pts[s + 1], k = this.done ? 1 : this.k;
    text(ctx, '🚀', b.x + (a.x + (c.x - a.x) * k) * b.w, b.y + (a.y + (c.y - a.y) * k) * b.h, b.w * 0.07, '#fff');
    this.overlay(ctx, box);
  }
}

class Steer extends MiniGame {
  constructor() { super('Stabilize Steering', 'Move the crosshair to the center'); const a = rand(0, TAU); this.x = Math.cos(a) * 0.35; this.y = Math.sin(a) * 0.35; this.hold = 0; }
  update(dt, inp) {
    this.x = clamp(this.x + inp.sx * dt * 0.6 + Math.sin(performance.now() / 300) * dt * 0.05, -0.45, 0.45);
    this.y = clamp(this.y + inp.sy * dt * 0.6, -0.45, 0.45);
    if (Math.hypot(this.x, this.y) < 0.04) { this.hold += dt; if (this.hold > 0.5) this.done = true; } else this.hold = 0;
  }
  draw(ctx, box) {
    const b = this.frame(ctx, box);
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    ctx.strokeStyle = '#5fd4ff'; ctx.lineWidth = b.w * 0.004;
    for (const r of [0.1, 0.25, 0.4]) { ctx.beginPath(); ctx.arc(cx, cy, r * b.w, 0, TAU); ctx.stroke(); }
    const x = cx + this.x * b.w, y = cy + this.y * b.w, r = b.w * 0.05;
    ctx.strokeStyle = Math.hypot(this.x, this.y) < 0.04 ? '#5dff6a' : '#ffd84a'; ctx.lineWidth = b.w * 0.008;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.moveTo(x - r * 1.6, y); ctx.lineTo(x + r * 1.6, y); ctx.moveTo(x, y - r * 1.6); ctx.lineTo(x, y + r * 1.6); ctx.stroke();
    this.overlay(ctx, box);
  }
}

class Manifold extends MiniGame {
  constructor() { super('Unlock Manifolds', 'Press the numbers 1 to 10 in order'); this.nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]); this.next = 1; this.cur = 0; }
  update(dt, inp) {
    if (inp.leftP) this.cur = (this.cur + 9) % 10;
    if (inp.rightP) this.cur = (this.cur + 1) % 10;
    if (inp.upP || inp.downP) this.cur = (this.cur + 5) % 10;
    if (inp.aP) {
      if (this.nums[this.cur] === this.next) { this.next++; if (this.next > 10) this.done = true; }
      else { this.flash('Wrong! Start over.'); this.next = 1; }
    }
  }
  draw(ctx, box) {
    const b = this.frame(ctx, box);
    for (let i = 0; i < 10; i++) {
      const x = b.x + b.w * (0.02 + (i % 5) * 0.196), y = b.y + b.h * (0.2 + ((i / 5) | 0) * 0.35), s = b.w * 0.17;
      const lit = this.nums[i] < this.next;
      ctx.fillStyle = lit ? '#3b7bff' : '#3a414f'; ctx.fillRect(x, y, s, s);
      ctx.strokeStyle = i === this.cur && !this.done ? '#ffd84a' : '#11151c'; ctx.lineWidth = b.w * (i === this.cur ? 0.012 : 0.005); ctx.strokeRect(x, y, s, s);
      text(ctx, String(this.nums[i]), x + s / 2, y + s / 2, s * 0.45, '#fff', { weight: 900 });
    }
    this.overlay(ctx, box);
  }
}

// ---- Sabotage fixes

class Lights extends MiniGame {
  constructor() { super('Fix Lights', '←/→ to pick a switch, A to flip it. All switches up!'); this.on = Array.from({ length: 5 }, () => Math.random() < 0.4); if (this.on.every(Boolean)) this.on[2] = false; this.cur = 0; }
  update(dt, inp) {
    if (inp.leftP) this.cur = (this.cur + 4) % 5;
    if (inp.rightP) this.cur = (this.cur + 1) % 5;
    if (inp.aP) this.on[this.cur] = !this.on[this.cur];
    if (this.on.every(Boolean)) this.done = true;
  }
  draw(ctx, box) {
    const b = this.frame(ctx, box);
    for (let i = 0; i < 5; i++) {
      const x = b.x + b.w * (0.05 + i * 0.19), y = b.y + b.h * 0.25, w = b.w * 0.12, h = b.h * 0.45;
      ctx.fillStyle = '#2b313c'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = this.on[i] ? '#5dff6a' : '#d84848';
      ctx.fillRect(x + w * 0.15, y + (this.on[i] ? h * 0.05 : h * 0.5), w * 0.7, h * 0.45);
      if (i === this.cur && !this.done) { ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = b.w * 0.01; ctx.strokeRect(x - 4, y - 4, w + 8, h + 8); }
    }
    this.overlay(ctx, box);
  }
}

class Comms extends MiniGame {
  constructor() { super('Reset Comms', 'Turn the dial with the stick until the signal is clear'); this.a = rand(0, TAU); this.target = rand(0, TAU); this.hold = 0; }
  update(dt, inp) {
    this.a = (this.a + inp.sx * dt * 1.6 + TAU) % TAU;
    const d = Math.abs(((this.a - this.target + Math.PI * 3) % TAU) - Math.PI);
    if (d < 0.12) { this.hold += dt; if (this.hold > 0.8) this.done = true; } else this.hold = 0;
    this.d = d;
  }
  draw(ctx, box) {
    const b = this.frame(ctx, box);
    const clear = 1 - Math.min(1, (this.d ?? 3) / 1.5);
    ctx.strokeStyle = '#5dff6a'; ctx.lineWidth = b.w * 0.006; ctx.beginPath();
    for (let i = 0; i <= 100; i++) {
      const x = b.x + (i / 100) * b.w;
      const noise = (1 - clear) * (Math.random() - 0.5) * b.h * 0.25;
      ctx.lineTo(x, b.y + b.h * 0.3 + Math.sin(i * 0.4) * b.h * 0.08 + noise);
    }
    ctx.stroke();
    const cx = b.x + b.w / 2, cy = b.y + b.h * 0.72, R = b.h * 0.18;
    ctx.fillStyle = '#3a414f'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = b.w * 0.012;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(this.a) * R, cy + Math.sin(this.a) * R); ctx.stroke();
    this.overlay(ctx, box);
  }
}

class O2Code extends MiniGame {
  constructor(code) { super('Enter O2 Code', 'Type the code from the note: stick to move, A to press'); this.code = code; this.typed = ''; this.cur = 0; }
  update(dt, inp) {
    if (inp.leftP) this.cur = (this.cur % 3 === 0) ? this.cur + 2 : this.cur - 1;
    if (inp.rightP) this.cur = (this.cur % 3 === 2) ? this.cur - 2 : this.cur + 1;
    if (inp.upP) this.cur = (this.cur + 9) % 12;
    if (inp.downP) this.cur = (this.cur + 3) % 12;
    if (inp.aP) {
      const k = KEYS[this.cur];
      if (k === '✗') this.typed = '';
      else if (k === '✓') { if (this.typed === this.code) this.done = true; else { this.flash('Wrong code!'); this.typed = ''; } }
      else if (this.typed.length < 5) this.typed += k;
    }
  }
  draw(ctx, box) {
    const b = this.frame(ctx, box);
    // The note with today's code.
    ctx.fillStyle = '#fff6b0'; ctx.fillRect(b.x, b.y + b.h * 0.05, b.w * 0.3, b.h * 0.3);
    text(ctx, 'TODAY\'S CODE', b.x + b.w * 0.15, b.y + b.h * 0.12, b.w * 0.025, '#333', { weight: 800 });
    text(ctx, this.code, b.x + b.w * 0.15, b.y + b.h * 0.24, b.w * 0.05, '#333', { weight: 900 });
    ctx.fillStyle = '#11151c'; ctx.fillRect(b.x + b.w * 0.38, b.y, b.w * 0.6, b.h * 0.12);
    text(ctx, this.typed.padEnd(5, '•'), b.x + b.w * 0.68, b.y + b.h * 0.06, b.w * 0.06, '#5dff6a', { weight: 900 });
    for (let i = 0; i < 12; i++) {
      const x = b.x + b.w * (0.4 + (i % 3) * 0.195), y = b.y + b.h * (0.16 + ((i / 3) | 0) * 0.21), s = b.w * 0.17;
      ctx.fillStyle = '#3a414f'; ctx.fillRect(x, y, s, s * 0.95);
      if (i === this.cur && !this.done) { ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = b.w * 0.01; ctx.strokeRect(x, y, s, s * 0.95); }
      text(ctx, KEYS[i], x + s / 2, y + s * 0.47, s * 0.4, KEYS[i] === '✓' ? '#5dff6a' : KEYS[i] === '✗' ? '#ff6b6b' : '#fff', { weight: 900 });
    }
    this.overlay(ctx, box);
  }
}
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '✗', '0', '✓'];

class Reactor extends MiniGame { // two people must hold their hand scanners at the same time
  constructor(game, station) { super('Stop Reactor Meltdown', 'Hold A on the scanner. Someone else must hold the other one!'); this.game = game; this.station = station; this.holding = false; }
  update(dt, inp) {
    this.holding = inp.a;
    if (inp.a) this.game.holdStation(this.station);
    if (!this.game.sabotage || this.game.sabotage.type !== 'reactor') this.done = true;
  }
  draw(ctx, box) {
    const b = this.frame(ctx, box);
    const sab = this.game.sabotage;
    const other = sab && [...sab.held.entries()].some(([st, t]) => st !== this.station && this.game.time - t < 0.3);
    ctx.fillStyle = this.holding ? '#2a4a7a' : '#2b313c';
    ctx.fillRect(b.x + b.w * 0.25, b.y + b.h * 0.1, b.w * 0.5, b.h * 0.6);
    text(ctx, '✋', b.x + b.w / 2, b.y + b.h * 0.4, b.w * 0.25, '#fff');
    if (this.holding) {
      const sy = b.y + b.h * (0.12 + 0.55 * ((performance.now() / 500) % 1));
      ctx.fillStyle = 'rgba(95,212,255,0.6)'; ctx.fillRect(b.x + b.w * 0.25, sy, b.w * 0.5, b.h * 0.02);
    }
    text(ctx, !this.holding ? 'Hold A' : other ? 'Both hands on! Keep holding…' : 'Waiting for second user…', b.x + b.w / 2, b.y + b.h * 0.85, b.w * 0.045, other ? '#5dff6a' : '#ffd84a', { weight: 800 });
    this.overlay(ctx, box);
  }
}

// ---------------------------------------------------------------------------

export function makeMiniGame(kind, game, player, station) {
  switch (kind) {
    case 'swipe': return new Swipe();
    case 'fuel': return new HoldFill();
    case 'download': return new Transfer(false);
    case 'upload': return new Transfer(true);
    case 'scan': return new Scan(game, player);
    case 'divert': return new Divert();
    case 'accept': return new Accept();
    case 'wires': return new Wires();
    case 'asteroids': return new Asteroids();
    case 'filter': return new Filter();
    case 'prime': return new Prime();
    case 'garbage': return new Garbage();
    case 'calibrate': return new Calibrate();
    case 'align': return new Align();
    case 'chart': return new Chart();
    case 'steer': return new Steer();
    case 'manifold': return new Manifold();
    case 'lights': return new Lights();
    case 'comms': return new Comms();
    case 'o2code': return new O2Code(game.sabotage?.code ?? '00000');
    case 'reactor': return new Reactor(game, station);
    default: return new Accept();
  }
}
