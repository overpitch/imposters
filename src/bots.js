// Bot players. They only act on what they could actually see (same vision rules as humans).

import { SETTINGS as S, TASK_SECONDS } from './config.js';
import { STATIONS, VENTS, ROOMS, SABOTAGES } from './map.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[(Math.random() * a.length) | 0];

export function newBrain(game, p) {
  return {
    state: 'idle', timer: rand(0.5, 2), path: null, target: null, onArrive: null,
    sus: new Map(), seen: new Map(), knownImp: new Set(), cleared: new Set(),
    lastWith: new Map(),  // victimId -> { o: otherId, t }: "I last saw X with Y"
    standingOver: null,   // { o, body } someone right next to a body when I found it
    perceiveT: Math.random() * 0.25, stuckT: 0, lastX: p.x, lastY: p.y,
    pendingReport: null, wantButton: false,
    killReadyAt: game.time + rand(2, 10), sabT: rand(10, 25), hunt: null,
    lines: [], voteAt: null, lastRoom: null, lastTask: null,
  };
}

const addSus = (b, id, n) => b.sus.set(id, (b.sus.get(id) ?? 0) + n);

// ---------------------------------------------------------------------------
// Movement

function goTo(game, p, x, y, onArrive) {
  const b = p.bot;
  b.target = { x, y };
  b.path = p.alive ? (game.map.path(p.x, p.y, x, y) ?? [{ x, y }]) : [{ x, y }];
  b.onArrive = onArrive;
  b.state = 'move';
  b.stuckT = 0;
}

function followPath(game, p, dt) {
  const b = p.bot;
  if (!b.path || !b.path.length) { arrive(game, p); return; }
  const w = b.path[0];
  const dx = w.x - p.x, dy = w.y - p.y, d = Math.hypot(dx, dy);
  if (d < 8) { b.path.shift(); if (!b.path.length) arrive(game, p); return; }
  game.moveIntent(p, dx / d, dy / d, dt);
  // Stuck? Re-plan.
  b.stuckT += dt;
  if (b.stuckT > 1) {
    if (Math.hypot(p.x - b.lastX, p.y - b.lastY) < 20 && b.target) {
      b.path = game.map.path(p.x, p.y, b.target.x, b.target.y) ?? [b.target];
    }
    b.stuckT = 0; b.lastX = p.x; b.lastY = p.y;
  }
}

function arrive(game, p) {
  const b = p.bot;
  b.path = null;
  b.state = 'idle';
  p.moving = false;
  const cb = b.onArrive;
  b.onArrive = null;
  if (cb) cb();
}

function wait(p, seconds, then) {
  p.bot.state = 'wait';
  p.bot.timer = seconds;
  p.bot.onDone = then;
  p.moving = false;
}

// ---------------------------------------------------------------------------
// Perception

function perceive(game, p) {
  const b = p.bot;
  const room = game.map.roomAt(p.x, p.y);
  if (room) b.lastRoom = room.name;
  const visible = [];
  for (const o of game.players) {
    if (o === p || !o.alive || !game.sees(p, o)) continue;
    visible.push(o);
    b.seen.set(o.id, { t: game.time, x: o.x, y: o.y, room: game.map.roomName(o.x, o.y) });
    if (o.scanning > 0 && p.role === 'crew') b.cleared.add(o.id);
  }
  // Who's walking around with whom (pairs close together, nobody else near).
  for (const v of visible) {
    const close = visible.filter((o) => o !== v && Math.hypot(o.x - v.x, o.y - v.y) < 220);
    if (close.length === 1) b.lastWith.set(v.id, { o: close[0].id, t: game.time });
  }
  if (p.alive && p.role === 'crew' && !b.pendingReport) {
    for (const body of game.bodies) {
      if (game.canSee(p, body.x, body.y)) {
        b.pendingReport = { body, at: game.time + rand(0.3, 1.2) };
        // Whoever's standing near a fresh body looks bad.
        for (const o of game.players) {
          if (o === p || !o.alive || !game.sees(p, o)) continue;
          const d = Math.hypot(o.x - body.x, o.y - body.y);
          if (d < 260) addSus(b, o.id, 15);
          if (d < 140 && game.time - body.at < 3) { addSus(b, o.id, 40); b.standingOver = { o: o.id, body: body.id }; }
        }
        break;
      }
    }
  }
}

export function observeKill(game, killer, victim) {
  for (const p of game.players) {
    if (!p.bot || !p.alive || p === killer || p.role !== 'crew') continue;
    if (game.canSee(p, killer.x, killer.y)) {
      p.bot.knownImp.add(killer.id);
      p.bot.sus.set(killer.id, 1000);
      (p.bot.sawKill ??= new Map()).set(killer.id, victim.name);
      const body = game.bodies.find((bd) => bd.id === victim.id);
      p.bot.pendingReport = { body, at: game.time + rand(0.2, 0.6), witnessed: killer.id };
    }
  }
}

export function observeVent(game, venter, vent) {
  for (const p of game.players) {
    if (!p.bot || !p.alive || p === venter || p.role !== 'crew') continue;
    if (game.canSee(p, vent.x, vent.y)) {
      p.bot.knownImp.add(venter.id);
      p.bot.sus.set(venter.id, 1000);
      p.bot.sawVent = venter.id;
      if (p.emergencies > 0) p.bot.wantButton = true;
    }
  }
}

export function observeScan(game, scanner) {
  for (const p of game.players) {
    if (!p.bot || p.role !== 'crew' || p === scanner) continue;
    if (game.sees(p, scanner)) { p.bot.cleared.add(scanner.id); addSus(p.bot, scanner.id, -60); }
  }
}

// ---------------------------------------------------------------------------
// Decisions

function nextTask(game, p) {
  for (const t of p.tasks) {
    const step = game.nextStep(t);
    if (step) return { task: t, station: step[0], game: step[1] };
  }
  return null;
}

function doTasks(game, p) {
  const b = p.bot;
  const nt = nextTask(game, p);
  if (!nt) { wander(game, p); return; }
  const st = STATIONS[nt.station];
  goTo(game, p, st.stand.x, st.stand.y, () => {
    if (game.nextStep(nt.task)?.[0] !== nt.station) return;
    b.lastTask = { name: nt.task.name, room: game.map.roomName(st.x, st.y) };
    if (nt.game === 'scan' && p.alive) { game.startScan(p); wait(p, 9.2, null); return; }
    wait(p, TASK_SECONDS[nt.game] ?? 4, () => game.completeStep(p, nt.task));
  });
}

function fakeTask(game, p) {
  const b = p.bot;
  const t = pick(p.tasks);
  const st = STATIONS[pick(t.steps)[0]];
  goTo(game, p, st.stand.x, st.stand.y, () => {
    b.lastTask = { name: t.name, room: game.map.roomName(st.x, st.y) };
    wait(p, rand(2.5, 6), null);
  });
}

function wander(game, p) {
  const r = pick(ROOMS);
  const [x1, y1, x2, y2] = r.rect;
  const pos = game.map.nearestStandable(rand(x1 + 60, x2 - 60), rand(y1 + 60, y2 - 60));
  goTo(game, p, pos.x, pos.y, () => wait(p, rand(1.5, 5), null));
}

/** Crew bots answer sabotages: nearest ones go fix. */
function sabotageDuty(game, p) {
  const sab = game.sabotage;
  if (!sab || !p.alive || p.role !== 'crew') return null;
  const def = SABOTAGES[sab.type];
  sab.assigned ??= new Map();
  if (!def.critical && game.time - (sab.startedAt ??= game.time) < 4) return null; // give humans a moment
  for (const [st] of def.fix) {
    if (sab.fixed.has(st)) continue;
    const who = sab.assigned.get(st);
    if (who === p.id) return st;
    if (who !== undefined && game.players[who].alive) continue;
    // Am I the closest free crew bot?
    const s = STATIONS[st];
    const free = game.players.filter((o) => o.bot && o.alive && o.role === 'crew' && ![...sab.assigned.values()].includes(o.id));
    free.sort((a, c) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(c.x - s.x, c.y - s.y));
    if (free[0] === p) { sab.assigned.set(st, p.id); return st; }
  }
  return null;
}

/**
 * Crewmates the Imposter *thinks* could see the kill. Like a person, it misjudges: anyone near
 * the edge of their vision gets overlooked, so sometimes there IS a witness.
 */
function witnesses(game, imp, target) {
  const sloppy = game.visionOf({ alive: true, role: 'crew' }) * 0.7;
  return game.players.filter((o) => o.alive && o !== target && o !== imp && o.role === 'crew'
    && [imp, target].some((q) => Math.hypot(q.x - o.x, q.y - o.y) < sloppy && game.map.los(o.x, o.y, q.x, q.y)));
}

function impostorThink(game, p) {
  const b = p.bot;
  // Sabotage now and then (ghost Imposters too).
  b.sabT -= 0.25;
  if (b.sabT <= 0) {
    b.sabT = rand(8, 18);
    if (!game.sabotage && game.sabotageCd <= 0 && Math.random() < 0.35) {
      const r = Math.random();
      game.startSabotage(p, r < 0.4 ? 'lights' : r < 0.6 ? 'comms' : r < 0.8 ? 'reactor' : 'o2');
    }
  }
  if (!p.alive || p.vent) return;

  // Hunt someone who's alone.
  if (!b.hunt && p.killCd <= 0 && game.time >= b.killReadyAt) {
    const targets = game.players.filter((o) => o.alive && o.role === 'crew' && !o.vent && game.sees(p, o));
    targets.sort((a, c) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(c.x - p.x, c.y - p.y));
    for (const t of targets) {
      if (Math.hypot(t.x - p.x, t.y - p.y) < 420 && witnesses(game, p, t).length === 0) {
        b.hunt = { target: t, until: game.time + 7 };
        break;
      }
    }
  }
}

function hunt(game, p, dt) {
  const b = p.bot, t = b.hunt.target;
  if (!t.alive || game.time > b.hunt.until || game.state !== 'play') { b.hunt = null; b.killReadyAt = game.time + rand(2, 6); b.state = 'idle'; return; }
  const d = Math.hypot(t.x - p.x, t.y - p.y);
  if (d <= S.killRange - 5 && game.map.los(p.x, p.y, t.x, t.y)) {
    if (witnesses(game, p, t).length === 0) {
      game.kill(p, t);
      b.hunt = null;
      b.killReadyAt = game.time + S.killCooldown + rand(10, 28);
      escape(game, p);
    } else {
      b.hunt = null;
      b.killReadyAt = game.time + rand(3, 6);
      b.state = 'idle';
    }
    return;
  }
  if (!b.path || !b.path.length || (b.repathT = (b.repathT ?? 0) - dt) <= 0) {
    b.path = game.map.path(p.x, p.y, t.x, t.y) ?? [{ x: t.x, y: t.y }];
    b.repathT = 0.4;
    b.target = { x: t.x, y: t.y };
  }
  followPath(game, p, dt);
  b.state = 'hunt';
}

function escape(game, p) {
  const b = p.bot;
  const near = VENTS.filter((v) => Math.hypot(v.x - p.x, v.y - p.y) < 320);
  if (near.length && Math.random() < 0.6) {
    const v = near[0];
    goTo(game, p, v.x, v.y, () => {
      if (game.state !== 'play') return;
      game.enterVent(p, v);
      wait(p, rand(1.5, 3), () => {
        if (!p.vent) return;
        game.moveVent(p, pick(v.links));
        wait(p, rand(1, 2.5), () => { if (p.vent) game.exitVent(p); });
      });
    });
    return;
  }
  // Self-report sometimes, otherwise walk away.
  if (Math.random() < 0.12) {
    wait(p, rand(1.5, 3), () => {
      const body = game.reportTarget(p);
      if (body && game.state === 'play' && game.players.filter((o) => o.alive && o !== p && game.sees(p, o)).length === 0) game.report(p, body);
    });
    return;
  }
  wander(game, p);
}

// ---------------------------------------------------------------------------
// Per-frame update

export function update(game, dt) {
  for (const p of game.players) {
    const b = p.bot;
    if (!b) continue;

    b.perceiveT -= dt;
    if (b.perceiveT <= 0) {
      b.perceiveT = 0.25;
      if (p.alive) perceive(game, p);
      if (p.role === 'imp') impostorThink(game, p);
    }
    if (game.state !== 'play') return;

    // Urgent crew business interrupts whatever they're doing.
    if (p.role === 'crew' && p.alive && crewUrgent(game, p, dt)) {
      if (game.state !== 'play') return;
      continue;
    }
    if (p.role === 'imp' && b.hunt) { b.onDone = null; hunt(game, p, dt); continue; }

    if (b.state === 'wait') {
      b.timer -= dt;
      if (b.timer <= 0) { b.state = 'idle'; const f = b.onDone; b.onDone = null; f?.(); }
      continue;
    }
    if (b.state === 'move') { followPath(game, p, dt); continue; }

    // Idle: pick something to do.
    if (p.role === 'crew') doTasks(game, p);
    else if (p.alive) (Math.random() < 0.7 ? fakeTask : wander)(game, p);
    else wander(game, p);
  }
}

/** Reports, emergency button, sabotage duty. Returns true if it used this frame. */
function crewUrgent(game, p, dt) {
  const b = p.bot;
  // Report a body (walk up to it first).
  if (b.pendingReport && game.time >= b.pendingReport.at) {
    const body = game.bodies.find((bd) => bd === b.pendingReport.body);
    if (!body) b.pendingReport = null;
    else if (Math.hypot(body.x - p.x, body.y - p.y) < S.reportRange && game.map.los(p.x, p.y, body.x, body.y)) {
      b.pendingReport = null;
      game.report(p, body);
      return true;
    } else if (b.state !== 'move' || b.target?.x !== body.x) {
      b.onDone = null;
      goTo(game, p, body.x, body.y, null);
    }
    return false;
  }
  // Saw someone vent: call a meeting.
  if (b.wantButton === true) {
    b.wantButton = 'going';
    b.onDone = null;
    const st = STATIONS.emergency;
    goTo(game, p, st.stand.x, st.stand.y, () => { game.pressEmergency(p); b.wantButton = false; });
    return false;
  }
  // Sabotage duty.
  if (!game.sabotage) { b.duty = null; b.atDuty = null; return false; }
  const duty = sabotageDuty(game, p);
  if (duty && b.duty !== duty) {
    b.duty = duty;
    b.atDuty = null;
    b.onDone = null;
    const st = STATIONS[duty];
    const game_ = SABOTAGES[game.sabotage.type].fix.find(([s]) => s === duty)[1];
    goTo(game, p, st.stand.x, st.stand.y, () => { b.atDuty = duty; b.dutyT = TASK_SECONDS[game_] ?? 4; });
    return false;
  }
  if (b.atDuty) {
    p.moving = false;
    if (game.sabotage.fixed.has(b.atDuty)) { b.atDuty = null; b.duty = null; b.state = 'idle'; return false; }
    if (game.sabotage.type === 'reactor') { game.holdStation(b.atDuty); return true; }
    b.dutyT -= dt;
    if (b.dutyT <= 0) { const st = b.atDuty; b.atDuty = null; b.duty = null; b.state = 'idle'; game.fixStation(st); }
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Meetings: what bots say and how they vote

const ROOM_OF = (game, p) => p.bot?.lastTask?.room ?? p.bot?.lastRoom ?? 'the hallway';

function queue(b, at, text, meta) { b.lines.push({ at, text, meta }); }

export function onMeeting(game) {
  const m = game.meeting;
  const talkEnd = S.discussionTime + 6;
  m.accused = new Map();
  m.elapsed = 0;
  for (const p of game.players) {
    const b = p.bot;
    if (!b) continue;
    b.lines = []; b.voteAt = null; b.state = 'idle'; b.path = null; b.hunt = null; b.atDuty = null; b.duty = null;
    b.pendingReport = null; b.wantButton = false; b.onDone = null; b.onArrive = null;
    if (!p.alive) continue;
    const t0 = 2.8; // after the intro splash
    const at = () => t0 + 0.4 + Math.random() ** 1.6 * talkEnd; // most chatter early, like real players

    if (m.caller === p) {
      if (m.body) queue(b, t0 + 0.3, `${m.body.name} was dead in ${m.bodyRoom}.`, null);
      else if (b.sawVent !== undefined && game.players[b.sawVent].alive) {
        const v = game.players[b.sawVent];
        queue(b, t0 + 0.3, `I saw ${v.name} vent!`, { kind: 'vent', target: v.id });
      } else queue(b, t0 + 0.3, 'I called this meeting.', null);
    }
    if (p.role === 'crew') {
      let said = false;
      for (const id of b.knownImp) {
        const imp = game.players[id];
        if (!imp.alive) continue;
        const victim = b.sawKill?.get(id);
        const how = victim ? `I saw ${imp.name} kill ${victim}!` : b.sawVent === id ? `I saw ${imp.name} vent!` : `${imp.name} is the Imposter!`;
        queue(b, t0 + rand(0.5, 2), how, { kind: victim ? 'kill' : 'vent', target: id });
        said = true;
      }
      if (!said && m.body && b.standingOver?.body === m.body.id && game.players[b.standingOver.o].alive) {
        const o = game.players[b.standingOver.o];
        queue(b, t0 + rand(0.5, 2.5), `${o.name} was standing right by the body!`, { kind: 'with', target: o.id });
        said = true;
      }
      if (!said && m.body) {
        // Who did I see near where the body was found, recently?
        const near = m.bodyRoom === 'the hallway' ? [] : [...b.seen.entries()].filter(([id, s]) => game.players[id].alive && s.room === m.bodyRoom && game.time - s.t < 15 && id !== p.id);
        if (near.length) {
          const [id] = pick(near);
          queue(b, at(), `I saw ${game.players[id].name} near ${m.bodyRoom}.`, { kind: 'sus', target: id });
          said = true;
        }
      }
      if (!said) {
        const top = topSuspect(game, p);
        if (top && (b.sus.get(top.id) ?? 0) >= 80) queue(b, at(), `${top.name} is sus.`, { kind: 'sus', target: top.id });
        else queue(b, at(), pick(m.caller === p
          ? [`I was in ${ROOM_OF(game, p)} doing tasks.`, 'I have no info.']
          : [`I was in ${ROOM_OF(game, p)} doing tasks.`, 'Where?', 'Who?', 'I have no info.', 'I was doing tasks.']), null);
      }
      for (const id of b.cleared) {
        if (game.players[id].alive && Math.random() < 0.5) queue(b, at(), `${game.players[id].name} scanned, they're safe.`, { kind: 'safe', target: id });
      }
    } else {
      // Imposter: alibi, maybe frame someone.
      queue(b, at(), pick([`I was in ${ROOM_OF(game, p)}.`, `I was doing ${b.lastTask?.name ?? 'tasks'}.`, 'Where was the body?']), null);
      if (Math.random() < 0.45) {
        const victims = game.players.filter((o) => o.alive && o.role === 'crew');
        if (victims.length) {
          const v = pick(victims);
          queue(b, at(), Math.random() < 0.5 ? `${v.name} is sus.` : `I saw ${v.name} near ${m.bodyRoom ?? 'Electrical'}.`, { kind: 'sus', target: v.id });
        }
      }
    }
    b.voteAt = t0 + S.discussionTime + rand(2.5, 16);
  }
}

function topSuspect(game, p) {
  let best = null, bestS = -Infinity;
  for (const o of game.players) {
    if (o === p || !o.alive) continue;
    const s = p.bot.sus.get(o.id) ?? 0;
    if (s > bestS) { bestS = s; best = o; }
  }
  return best;
}

/** Someone said something in a meeting; bots weigh it. */
export function hearChat(game, speaker, meta) {
  const m = game.meeting;
  if (!m || !meta || meta.target === undefined) return;
  const target = game.players[meta.target];
  const weight = { kill: 70, vent: 65, with: 25, sus: 10, safe: -40 }[meta.kind] ?? 0;
  if (weight >= 25) m.accused.set(target.id, (m.accused.get(target.id) ?? 0) + weight);
  for (const p of game.players) {
    const b = p.bot;
    if (!b || !p.alive || p === speaker) continue;
    if (p === target && weight > 0) {
      // I know whether that's true. (Answer at most twice per meeting, or it never ends.)
      m.replies ??= new Map();
      const n = m.replies.get(p.id) ?? 0;
      if (p.role === 'crew') addSus(b, speaker.id, meta.kind === 'kill' || meta.kind === 'vent' ? 60 : 15);
      if (n >= 2) continue;
      m.replies.set(p.id, n + 1);
      if (p.role === 'crew') {
        queue(b, game.meeting.elapsed + rand(1, 3), pick([`It wasn't me! I was in ${ROOM_OF(game, p)}.`, `${speaker.name} is lying!`, `Why me? I was doing tasks.`]), null);
      } else {
        queue(b, game.meeting.elapsed + rand(1, 3), pick(['It wasn\'t me!', `${speaker.name} is sus for saying that.`, 'I was doing tasks!']), null);
      }
      continue;
    }
    if (p.role !== 'crew') continue;
    if (b.knownImp.has(speaker.id)) continue;                 // don't trust a known Imposter
    if ((b.sus.get(speaker.id) ?? 0) >= 100) continue;
    if (b.cleared.has(target.id) && weight > 0) { addSus(b, speaker.id, 25); continue; }
    addSus(b, target.id, weight * (b.knownImp.size ? 0.5 : 1));
  }
}

export function updateMeeting(game, dt) {
  const m = game.meeting;
  m.elapsed = (m.elapsed ?? 0) + dt;
  for (const p of game.players) {
    const b = p.bot;
    if (!b || !p.alive) continue;
    for (const line of b.lines) {
      if (!line.done && m.elapsed >= line.at) {
        line.done = true;
        game.say(p, line.text, line.meta);
      }
    }
    if (m.phase === 'vote' && b.voteAt !== null && m.elapsed >= b.voteAt && !m.votes.has(p.id)) {
      game.vote(p, decideVote(game, p));
    }
  }
}

function decideVote(game, p) {
  const b = p.bot, m = game.meeting;
  const alive = game.players.filter((o) => o.alive && o !== p);
  const tally = new Map();
  for (const v of m.votes.values()) if (v !== 'skip') tally.set(v, (tally.get(v) ?? 0) + 1);

  if (p.role === 'imp') {
    const crewTargets = alive.filter((o) => o.role === 'crew');
    // Pile on whoever's being accused or voted, as long as it's crew.
    let best = null, bestS = 0;
    for (const o of crewTargets) {
      const s = (m.accused.get(o.id) ?? 0) + (tally.get(o.id) ?? 0) * 40;
      if (s > bestS) { bestS = s; best = o; }
    }
    if (best && bestS >= 30) return best;
    return Math.random() < 0.5 ? 'skip' : (pick(crewTargets) ?? 'skip');
  }
  for (const id of b.knownImp) if (game.players[id].alive) return game.players[id];
  // Bandwagon a little on what others voted.
  for (const [id, n] of tally) addSus(b, id, n * 5);
  const top = topSuspect(game, p);
  if (top && (b.sus.get(top.id) ?? 0) >= 75) return top;
  return 'skip';
}

export function afterMeeting(game) {
  for (const p of game.players) {
    const b = p.bot;
    if (!b) continue;
    b.state = 'idle'; b.timer = rand(0.5, 2); b.path = null; b.hunt = null;
    b.killReadyAt = game.time + S.firstKillCooldown + rand(5, 18);
    b.sawVent = undefined;
    b.standingOver = null;
    for (const [id, s] of b.sus) b.sus.set(id, s * 0.6); // suspicion cools between meetings
  }
}
