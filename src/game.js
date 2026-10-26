// Game rules and state. Humans and bots act through the same methods.

import { SETTINGS as S, COLORS } from './config.js';
import { STATIONS, VENTS, SPAWN, TASKS, DOWNLOAD_STATIONS, SABOTAGES, WORLD } from './map.js';
import * as Bots from './bots.js';

const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a) => a[(Math.random() * a.length) | 0];

export class Game {
  /** humans: [{ slot, device, color }] (color = index into COLORS) */
  /** opts.role: 'random' | 'crew' | 'imp' (lobby setting for the humans' role) */
  constructor(map, humans, opts = {}) {
    this.map = map;
    this.roleChoice = opts.role ?? 'random';
    this.time = 0;
    this.state = 'reveal';       // reveal | play | meeting | eject | over
    this.stateTime = 0;
    this.events = [];
    this.bodies = [];
    this.sabotage = null;        // { type, timer, fixed: Set, held: Map(station -> time) }
    this.sabotageCd = 10;
    this.buttonCd = S.emergencyCooldown;
    this.meeting = null;
    this.eject = null;
    this.winner = null;          // 'crew' | 'imp'
    this.winReason = '';

    // ---- Players: humans first, then bots in the remaining colors.
    const used = new Set(humans.map((h) => h.color));
    const botColors = shuffle(COLORS.map((_, i) => i).filter((i) => !used.has(i)));
    this.players = [];
    for (const h of humans) this.players.push(this.makePlayer(h.color, { slot: h.slot, device: h.device }));
    while (this.players.length < S.players) this.players.push(this.makePlayer(botColors.shift(), {}));

    this.assignRoles();
    this.assignTasks();
    this.placeAroundTable();
    for (const p of this.players) if (!p.human) p.bot = Bots.newBrain(this, p);
  }

  makePlayer(colorIdx, { slot = null, device = null }) {
    const color = COLORS[colorIdx];
    return {
      id: this.players.length, colorIdx, color, name: color.name,
      human: slot !== null, slot, device,
      role: 'crew', alive: true,
      x: 0, y: 0, facing: 1, moving: false, walk: 0,
      tasks: [], emergencies: S.emergencyPerPlayer,
      killCd: S.firstKillCooldown, vent: null, ventCd: 0,
      busy: null,           // what a human is doing: a mini-game, menu, etc. (they stand still)
      scanning: 0,          // seconds left of a visible MedBay scan
      bot: null,
      diedAt: 0,
    };
  }

  // ---- Setup

  assignRoles() {
    const humans = this.players.filter((p) => p.human);
    const bots = this.players.filter((p) => !p.human);
    let imps = [];
    const choice = this.roleChoice;
    if (choice === 'crew' || !humans.length) {
      imps = shuffle([...bots]).slice(0, S.impostors);               // every human is crew
    } else if (humans.length >= 3) {
      imps = shuffle([...humans]).slice(0, S.impostors);             // split teams (only 2 Imposters per game)
    } else if (choice === 'imp' || Math.random() < S.humanImpostorChance) {
      imps = [...humans, ...shuffle([...bots]).slice(0, S.impostors - humans.length)]; // humans share Imposter
    } else {
      imps = shuffle([...bots]).slice(0, S.impostors);               // humans share Crewmate
    }
    for (const p of imps) p.role = 'imp';
  }

  assignTasks() {
    const commons = Object.keys(TASKS).filter((k) => TASKS[k].kind === 'common');
    const longs = Object.keys(TASKS).filter((k) => TASKS[k].kind === 'long');
    const shorts = Object.keys(TASKS).filter((k) => TASKS[k].kind === 'short');
    const common = shuffle([...commons]).slice(0, S.tasks.common);
    for (const p of this.players) {
      const keys = [...common, ...shuffle([...longs]).slice(0, S.tasks.long), ...shuffle([...shorts]).slice(0, S.tasks.short)];
      p.tasks = keys.map((key) => {
        const def = TASKS[key];
        const steps = def.steps.map(([st, game]) => [st === '*download' ? pick(DOWNLOAD_STATIONS) : st, game]);
        if (key === 'wires') shuffle(steps);
        return { key, name: def.name, steps, step: 0, fake: p.role === 'imp' };
      });
    }
  }

  placeAroundTable() {
    const living = this.players.filter((p) => p.alive);
    living.forEach((p, i) => {
      const a = (i / living.length) * Math.PI * 2 - Math.PI / 2;
      const pos = this.map.nearestStandable(SPAWN.x + Math.cos(a) * SPAWN.r, SPAWN.y + Math.sin(a) * SPAWN.r);
      p.x = pos.x; p.y = pos.y; p.vent = null; p.busy = null; p.scanning = 0;
      p.facing = Math.cos(a) > 0 ? -1 : 1;
    });
  }

  // ---- Queries

  get crew() { return this.players.filter((p) => p.role === 'crew'); }
  get imps() { return this.players.filter((p) => p.role === 'imp'); }
  aliveCrew() { return this.players.filter((p) => p.alive && p.role === 'crew'); }
  aliveImps() { return this.players.filter((p) => p.alive && p.role === 'imp'); }

  visionOf(p) {
    if (!p.alive) return Infinity;
    if (p.role === 'imp') return S.impostorVision;
    return this.sabotage?.type === 'lights' ? S.lightsOutVision : S.crewVision;
  }

  /** Can `viewer` currently see point (x, y)? */
  canSee(viewer, x, y) {
    if (!viewer.alive) return true;
    if (viewer.vent) return false;
    const r = this.visionOf(viewer);
    if (Math.hypot(x - viewer.x, y - viewer.y) > r) return false;
    return this.map.los(viewer.x, viewer.y, x, y);
  }

  /** Is `target` visible to `viewer` (not hidden in a vent, ghosts only to the dead)? */
  sees(viewer, target) {
    if (viewer === target) return true;
    if (target.vent) return false;
    if (!target.alive && viewer.alive) return false;
    return this.canSee(viewer, target.x, target.y);
  }

  taskProgress() {
    let done = 0, total = 0;
    for (const p of this.crew) for (const t of p.tasks) { total += t.steps.length; done += t.step; }
    return total ? done / total : 0;
  }

  nextStep(task) { return task.step < task.steps.length ? task.steps[task.step] : null; }

  /** What the A button would do for `p` right now. */
  usable(p) {
    if (this.state !== 'play' || p.busy) return null;
    if (p.vent) return { kind: 'vent', vent: VENTS.find((v) => v.id === p.vent) };
    const near = (st) => Math.hypot(p.x - st.x, p.y - st.y) <= (st.range ?? S.useRange) + 10
      && (st.floor || !p.alive || this.map.los(p.x, p.y, st.x, st.y));

    // Sabotage fixes come first (crew, and Imposters can fix too).
    if (this.sabotage && p.alive) {
      for (const [st, game] of SABOTAGES[this.sabotage.type].fix) {
        if (!this.sabotage.fixed.has(st) && near(STATIONS[st])) return { kind: 'fix', station: st, game };
      }
    }
    if (p.role === 'crew') {
      for (const t of p.tasks) {
        const step = this.nextStep(t);
        if (step && near(STATIONS[step[0]])) return { kind: 'task', task: t, station: step[0], game: step[1] };
      }
    }
    if (p.alive && near(STATIONS.emergency)) return { kind: 'emergency' };
    if (p.alive && p.role === 'imp') {
      const v = VENTS.find((v) => Math.hypot(p.x - v.x, p.y - v.y) < 60);
      if (v) return { kind: 'vent', vent: v };
    }
    return null;
  }

  killTarget(p) {
    if (this.state !== 'play' || p.role !== 'imp' || !p.alive || p.vent || p.busy) return null;
    let best = null, bestD = S.killRange;
    for (const o of this.players) {
      if (!o.alive || o.role === 'imp' || o.vent) continue;
      const d = Math.hypot(o.x - p.x, o.y - p.y);
      if (d <= bestD && this.map.los(p.x, p.y, o.x, o.y)) { best = o; bestD = d; }
    }
    return best;
  }

  reportTarget(p) {
    if (this.state !== 'play' || !p.alive || p.vent || p.busy) return null;
    for (const b of this.bodies) {
      if (Math.hypot(b.x - p.x, b.y - p.y) <= S.reportRange && this.map.los(p.x, p.y, b.x, b.y)) return b;
    }
    return null;
  }

  // ---- Actions

  moveIntent(p, ix, iy, dt) {
    if (this.state !== 'play' || p.vent || p.busy) { p.moving = false; return; }
    const mag = Math.hypot(ix, iy);
    if (mag < 0.05) { p.moving = false; return; }
    p.scanning = 0; // walking off the scanner cancels the scan
    const sp = S.speed * Math.min(1, mag) * dt;
    const dx = (ix / Math.max(1, mag)) * sp, dy = (iy / Math.max(1, mag)) * sp;
    if (!p.alive) { // ghosts float through walls
      p.x = Math.max(0, Math.min(WORLD.w, p.x + dx));
      p.y = Math.max(0, Math.min(WORLD.h, p.y + dy));
    } else {
      const n = this.map.move(p.x, p.y, dx, dy, S.radius);
      p.x = n.x; p.y = n.y;
    }
    if (Math.abs(dx) > 0.01) p.facing = dx > 0 ? 1 : -1;
    p.moving = true;
    p.walk += dt * 10;
  }

  kill(imp, victim) {
    if (imp.killCd > 0 || !victim.alive || victim.role === 'imp') return false;
    victim.alive = false;
    victim.diedAt = this.time;
    victim.busy = null;
    victim.scanning = 0;
    this.bodies.push({ id: victim.id, x: victim.x, y: victim.y, color: victim.color, facing: victim.facing, at: this.time });
    imp.x = victim.x; imp.y = victim.y; // the killer lands on the body, like the original
    imp.killCd = S.killCooldown;
    this.events.push({ type: 'kill', killer: imp, victim });
    Bots.observeKill(this, imp, victim);
    this.checkWin();
    return true;
  }

  report(p, body) {
    if (this.state !== 'play') return;
    this.startMeeting(p, body);
  }

  pressEmergency(p) {
    if (this.state !== 'play' || p.emergencies <= 0 || this.buttonCd > 0) return false;
    if (this.sabotage && SABOTAGES[this.sabotage.type].critical) return false;
    p.emergencies--;
    this.startMeeting(p, null);
    return true;
  }

  enterVent(p, vent) {
    if (p.role !== 'imp' || !p.alive || p.ventCd > 0) return;
    p.vent = vent.id; p.x = vent.x; p.y = vent.y; p.ventCd = S.ventCooldown; p.moving = false;
    this.events.push({ type: 'vent', p, vent, enter: true });
    Bots.observeVent(this, p, vent);
  }
  moveVent(p, toId) {
    const v = VENTS.find((v) => v.id === toId);
    if (!v) return;
    p.vent = v.id; p.x = v.x; p.y = v.y;
    this.events.push({ type: 'ventMove', p, vent: v });
  }
  exitVent(p) {
    if (!p.vent) return;
    const v = VENTS.find((v) => v.id === p.vent);
    p.vent = null; p.ventCd = S.ventCooldown;
    const pos = this.map.nearestStandable(v.x, v.y + 10);
    p.x = pos.x; p.y = pos.y;
    this.events.push({ type: 'vent', p, vent: v, enter: false });
    Bots.observeVent(this, p, v);
  }

  startSabotage(p, type) {
    if (this.state !== 'play' || p.role !== 'imp' || this.sabotage || this.sabotageCd > 0) return false;
    const def = SABOTAGES[type];
    this.sabotage = {
      type, timer: type === 'reactor' ? S.reactorTime : type === 'o2' ? S.o2Time : 0, fixed: new Set(), held: new Map(),
      code: String(Math.floor(Math.random() * 100000)).padStart(5, '0'), startedAt: this.time,
    };
    this.sabotageCd = S.sabotageCooldown;
    this.events.push({ type: 'sabotage', sab: type, critical: def.critical });
    return true;
  }

  /** A fix station was completed (lights, comms, O2 keypads). */
  fixStation(station) {
    const sab = this.sabotage;
    if (!sab) return;
    sab.fixed.add(station);
    if (SABOTAGES[sab.type].fix.every(([st]) => sab.fixed.has(st))) this.endSabotage();
  }
  /** Reactor: someone is holding a hand scanner this tick. */
  holdStation(station) {
    if (this.sabotage?.type === 'reactor') this.sabotage.held.set(station, this.time);
  }
  endSabotage() {
    const type = this.sabotage.type;
    this.sabotage = null;
    this.sabotageCd = S.sabotageCooldown;
    for (const p of this.players) if (p.busy?.sabotage) p.busy = null;
    this.events.push({ type: 'fixed', sab: type });
  }

  completeStep(p, task) {
    if (task.step >= task.steps.length) return;
    task.step++;
    this.events.push({ type: 'task', p, task, done: task.step >= task.steps.length });
    this.checkWin();
  }

  startScan(p) { p.scanning = 9; Bots.observeScan(this, p); }

  // ---- Meetings

  startMeeting(caller, body) {
    for (const p of this.players) { p.busy = null; p.vent = null; p.scanning = 0; p.moving = false; }
    if (this.sabotage) { this.sabotage = null; }
    const bodyPlayer = body ? this.players[body.id] : null;
    this.meeting = {
      caller, body: bodyPlayer, bodyRoom: body ? this.map.roomName(body.x, body.y) : null,
      phase: 'intro', timer: 2.6, votes: new Map(), chat: [], cursors: new Map(),
    };
    this.bodies = [];
    this.state = 'meeting';
    this.stateTime = 0;
    this.events.push({ type: body ? 'report' : 'emergency', by: caller, body: bodyPlayer });
    Bots.onMeeting(this);
  }

  /** meta: { kind: 'kill'|'vent'|'sus'|'safe', target: playerId } for statements bots should weigh. */
  say(p, text, meta = null) {
    if (!this.meeting || !p.alive) return;
    this.meeting.chat.push({ from: p, text, t: this.time });
    if (this.meeting.chat.length > 60) this.meeting.chat.shift();
    this.events.push({ type: 'chat', p, text });
    Bots.hearChat(this, p, meta);
  }

  vote(p, target) { // target: player or 'skip'
    const m = this.meeting;
    if (!m || m.phase !== 'vote' || !p.alive || m.votes.has(p.id)) return false;
    if (target !== 'skip' && !target.alive) return false;
    m.votes.set(p.id, target === 'skip' ? 'skip' : target.id);
    this.events.push({ type: 'vote', p });
    return true;
  }

  updateMeeting(dt) {
    const m = this.meeting;
    m.timer -= dt;
    Bots.updateMeeting(this, dt);
    const voters = this.players.filter((p) => p.alive);
    if (m.phase === 'vote' && voters.every((p) => m.votes.has(p.id))) m.timer = Math.min(m.timer, 0);
    if (m.timer > 0) return;
    if (m.phase === 'intro') { m.phase = 'discuss'; m.timer = S.discussionTime; }
    else if (m.phase === 'discuss') { m.phase = 'vote'; m.timer = S.votingTime; }
    else if (m.phase === 'vote') { m.phase = 'results'; m.timer = 4; }
    else if (m.phase === 'results') this.resolveVotes();
  }

  resolveVotes() {
    const counts = new Map();
    for (const v of this.meeting.votes.values()) counts.set(v, (counts.get(v) ?? 0) + 1);
    let top = null, topN = 0, tie = false;
    for (const [k, n] of counts) {
      if (n > topN) { top = k; topN = n; tie = false; } else if (n === topN) tie = true;
    }
    let ejected = null, reason = '';
    if (!top && top !== 0) reason = 'No one was ejected. (Skipped)';
    else if (tie) reason = 'No one was ejected. (Tie)';
    else if (top === 'skip') reason = 'No one was ejected. (Skipped)';
    else ejected = this.players[top];

    if (ejected) { ejected.alive = false; ejected.diedAt = this.time; ejected.ejected = true; }
    const impsLeft = this.aliveImps().length;
    this.eject = {
      p: ejected,
      line1: ejected ? `${ejected.name} was ${ejected.role === 'imp' ? '' : 'not '}An Imposter.` : reason,
      line2: `${impsLeft} Imposter${impsLeft === 1 ? '' : 's'} remain${impsLeft === 1 ? 's' : ''}.`,
    };
    this.state = 'eject';
    this.stateTime = 0;
    this.events.push({ type: 'eject', p: ejected });
  }

  endEject() {
    this.meeting = null;
    this.eject = null;
    if (this.checkWin()) return;
    this.state = 'play';
    this.stateTime = 0;
    this.placeAroundTable();
    for (const p of this.players) { p.killCd = S.firstKillCooldown; p.ventCd = 0; }
    this.buttonCd = S.emergencyCooldown;
    this.sabotageCd = Math.max(this.sabotageCd, 10);
    Bots.afterMeeting(this);
  }

  // ---- Win

  checkWin() {
    if (this.state === 'over') return true;
    const crew = this.aliveCrew().length, imps = this.aliveImps().length;
    if (imps === 0) return this.win('crew', 'All Imposters were ejected');
    if (this.taskProgress() >= 1) return this.win('crew', 'All tasks completed');
    if (this.state !== 'meeting' && imps >= crew) return this.win('imp', 'The Imposters outnumber the crew');
    return false;
  }

  win(team, reason) {
    this.winner = team;
    this.winReason = reason;
    this.state = 'over';
    this.stateTime = 0;
    this.events.push({ type: 'win', team });
    return true;
  }

  // ---- Tick

  update(dt) {
    this.time += dt;
    this.stateTime += dt;
    if (this.state === 'reveal') {
      if (this.stateTime > 5) { this.state = 'play'; this.stateTime = 0; }
      return;
    }
    if (this.state === 'meeting') { this.updateMeeting(dt); return; }
    if (this.state === 'eject') { if (this.stateTime > S.ejectTime) this.endEject(); return; }
    if (this.state !== 'play') return;

    this.buttonCd = Math.max(0, this.buttonCd - dt);
    this.sabotageCd = this.sabotage ? this.sabotageCd : Math.max(0, this.sabotageCd - dt);
    for (const p of this.players) {
      if (p.role === 'imp' && p.alive && !p.vent) p.killCd = Math.max(0, p.killCd - dt);
      p.ventCd = Math.max(0, p.ventCd - dt);
      if (p.scanning > 0) {
        p.scanning -= dt;
        if (p.scanning <= 0) {
          p.scanning = 0;
          const t = p.tasks.find((t) => this.nextStep(t)?.[1] === 'scan');
          if (t) this.completeStep(p, t);
          if (p.busy?.kind === 'scan') p.busy = null;
        }
      }
    }

    // Sabotage timers and the two-handed Reactor fix.
    const sab = this.sabotage;
    if (sab) {
      if (sab.type === 'reactor') {
        const held = SABOTAGES.reactor.fix.every(([st]) => this.time - (sab.held.get(st) ?? -9) < 0.25);
        if (held) { sab.bothHeld = (sab.bothHeld ?? 0) + dt; if (sab.bothHeld > 0.6) this.endSabotage(); }
        else sab.bothHeld = 0;
      }
      if (this.sabotage && sab.timer > 0) {
        sab.timer -= dt;
        if (sab.timer <= 0) { this.win('imp', sab.type === 'reactor' ? 'Reactor meltdown' : 'Oxygen depleted'); return; }
      }
    }

    Bots.update(this, dt);
    this.checkWin();
  }
}
