// The ship: rooms, hallways, furniture, task consoles, vents, plus the geometry the game needs
// (collision, line of sight, vision polygons and bot path-finding).

export const WORLD = { w: 3600, h: 2200 };

// Rooms: [x1, y1, x2, y2]. Walkable space is the union of rooms and halls.
export const ROOMS = [
  { id: 'upperEngine', name: 'Upper Engine',   rect: [250, 200, 750, 650],    floor: '#5b6372' },
  { id: 'reactor',     name: 'Reactor',        rect: [40, 800, 430, 1400],    floor: '#4f5a6e' },
  { id: 'security',    name: 'Security',       rect: [650, 850, 950, 1250],   floor: '#55606f' },
  { id: 'lowerEngine', name: 'Lower Engine',   rect: [250, 1550, 750, 2000],  floor: '#5b6372' },
  { id: 'medbay',      name: 'MedBay',         rect: [1000, 480, 1350, 850],  floor: '#6d8592' },
  { id: 'cafeteria',   name: 'Cafeteria',      rect: [1450, 100, 2250, 800],  floor: '#7a8696' },
  { id: 'weapons',     name: 'Weapons',        rect: [2600, 150, 3050, 600],  floor: '#5d6878' },
  { id: 'o2',          name: 'O2',             rect: [2350, 850, 2700, 1100], floor: '#5f7a76' },
  { id: 'navigation',  name: 'Navigation',     rect: [3150, 750, 3550, 1300], floor: '#56677d' },
  { id: 'admin',       name: 'Admin',          rect: [1950, 1000, 2350, 1350], floor: '#6c7486' },
  { id: 'storage',     name: 'Storage',        rect: [1350, 1350, 1850, 2050], floor: '#6b6658' },
  { id: 'electrical',  name: 'Electrical',     rect: [950, 1350, 1250, 1640], floor: '#5e5a52' },
  { id: 'comms',       name: 'Communications', rect: [2050, 1880, 2450, 2150], floor: '#596273' },
  { id: 'shields',     name: 'Shields',        rect: [2650, 1500, 3100, 1950], floor: '#5d6878' },
];

export const HALLS = [
  [740, 330, 1460, 470],    // upper hall: Upper Engine - Cafeteria
  [1120, 460, 1230, 490],   //   MedBay door
  [440, 640, 590, 1560],    // left hall: Upper Engine - Lower Engine
  [420, 1030, 450, 1170],   //   Reactor door
  [580, 980, 660, 1120],    //   Security door
  [740, 1690, 1360, 1830],  // lower hall: Lower Engine - Storage
  [1050, 1630, 1160, 1700], //   Electrical door
  [1560, 790, 1700, 1360],  // Cafeteria - Storage
  [1690, 1110, 1960, 1240], //   Admin hall
  [2240, 300, 2610, 440],   // Cafeteria - Weapons
  [2700, 590, 2840, 1510],  // right hall: Weapons - Shields
  [2690, 920, 2710, 1030],  //   O2 door
  [2830, 960, 3160, 1090],  //   Navigation hall
  [1840, 1700, 2660, 1840], // lower right hall: Storage - Shields
  [2200, 1830, 2310, 1890], //   Comms door
];

// Furniture blocks walking but not vision.
export const FURNITURE = [
  { kind: 'table', x: 1650, y: 290, r: 62 }, { kind: 'table', x: 2050, y: 290, r: 62 },
  { kind: 'table', x: 1650, y: 630, r: 62 }, { kind: 'table', x: 2050, y: 630, r: 62 },
  { kind: 'button', x: 1850, y: 460, r: 70 },           // emergency table
  { kind: 'crate', rect: [1440, 1440, 1550, 1550] }, { kind: 'crate', rect: [1700, 1880, 1800, 1980] },
  { kind: 'crate', rect: [1560, 1470, 1640, 1550] },
  { kind: 'desk', rect: [2080, 1120, 2230, 1230] },     // admin map table
  { kind: 'bed', rect: [1020, 700, 1100, 830] }, { kind: 'bed', rect: [1250, 700, 1330, 830] },
  { kind: 'engine', rect: [290, 320, 480, 520] }, { kind: 'engine', rect: [290, 1690, 480, 1880] },
  { kind: 'core', rect: [110, 1020, 290, 1180] },
  { kind: 'desk', rect: [3420, 960, 3520, 1100] },      // navigation console
  { kind: 'table', x: 2850, y: 380, r: 42 },             // weapons seat
  { kind: 'desk', rect: [700, 1150, 900, 1240] },       // security monitors
  { kind: 'desk', rect: [2300, 1990, 2420, 2130] },     // comms rack
];

// Consoles. Stations sit on or near walls; bots stand at the nearest free spot.
export const STATIONS = {
  emergency:     { x: 1850, y: 460, range: 135 },
  caf_garbage:   { x: 2200, y: 740 },
  caf_download:  { x: 1500, y: 150 },
  wpn_asteroids: { x: 2930, y: 200 },
  wpn_download:  { x: 2650, y: 560 },
  o2_filter:     { x: 2400, y: 900 },
  o2_pad:        { x: 2650, y: 890 },
  nav_chart:     { x: 3500, y: 800 },
  nav_steer:     { x: 3395, y: 1030 },
  nav_download:  { x: 3200, y: 1250 },
  sh_prime:      { x: 2900, y: 1550 },
  sh_accept:     { x: 3050, y: 1900 },
  comms_panel:   { x: 2100, y: 2100 },
  comms_download:{ x: 2400, y: 1925 },
  st_fuel:       { x: 1400, y: 2000 },
  st_wires:      { x: 1810, y: 1400 },
  adm_swipe:     { x: 2300, y: 1050 },
  adm_upload:    { x: 2000, y: 1300 },
  admin_pad:     { x: 2320, y: 1310 },
  el_wires:      { x: 1000, y: 1400 },
  el_divert:     { x: 1100, y: 1395 },
  el_calibrate:  { x: 1200, y: 1400 },
  el_panel:      { x: 1205, y: 1595 },
  le_align:      { x: 700, y: 1600 },
  le_fuel:       { x: 300, y: 1950 },
  ue_align:      { x: 700, y: 250 },
  ue_fuel:       { x: 300, y: 600 },
  re_manifold:   { x: 100, y: 850 },
  reactor_top:   { x: 380, y: 850 },
  reactor_bot:   { x: 380, y: 1350 },
  sec_wires:     { x: 900, y: 900 },
  med_scan:      { x: 1175, y: 640, floor: true },
};

// Vents: same-group vents connect.
export const VENTS = [
  { id: 'v_ue',  x: 640, y: 560,  links: ['v_re', 'v_le'] },
  { id: 'v_re',  x: 330, y: 900,  links: ['v_ue', 'v_le'] },
  { id: 'v_le',  x: 640, y: 1630, links: ['v_ue', 'v_re'] },
  { id: 'v_med', x: 1300, y: 560, links: ['v_sec', 'v_el'] },
  { id: 'v_sec', x: 900, y: 1100, links: ['v_med', 'v_el'] },
  { id: 'v_el',  x: 1000, y: 1580, links: ['v_med', 'v_sec'] },
  { id: 'v_caf', x: 2180, y: 150,  links: ['v_adm', 'v_hall'] },
  { id: 'v_adm', x: 2290, y: 1180, links: ['v_caf', 'v_hall'] },
  { id: 'v_hall',x: 1630, y: 1300, links: ['v_caf', 'v_adm'] },
  { id: 'v_wpn', x: 2700, y: 250,  links: ['v_nav'] },
  { id: 'v_nav', x: 3230, y: 820,  links: ['v_wpn', 'v_sh'] },
  { id: 'v_sh',  x: 2720, y: 1850, links: ['v_nav'] },
];

export const SPAWN = { x: 1850, y: 460, r: 150 }; // around the emergency table

// ---- Tasks. Each has steps: [station, mini-game].

export const TASKS = {
  swipe:     { name: 'Swipe Card',             kind: 'common', steps: [['adm_swipe', 'swipe']] },
  fuel:      { name: 'Fuel Engines',           kind: 'long',   steps: [['st_fuel', 'fuel'], ['ue_fuel', 'fuel'], ['st_fuel', 'fuel'], ['le_fuel', 'fuel']] },
  upload:    { name: 'Upload Data',            kind: 'long',   steps: [['*download', 'download'], ['adm_upload', 'upload']] },
  scan:      { name: 'Submit Scan',            kind: 'long',   steps: [['med_scan', 'scan']] },
  divert:    { name: 'Divert Power',           kind: 'long',   steps: [['el_divert', 'divert'], ['sh_accept', 'accept']] },
  wires:     { name: 'Fix Wiring',             kind: 'short',  steps: [['el_wires', 'wires'], ['st_wires', 'wires'], ['sec_wires', 'wires']] },
  asteroids: { name: 'Clear Asteroids',        kind: 'short',  steps: [['wpn_asteroids', 'asteroids']] },
  filter:    { name: 'Clean O2 Filter',        kind: 'short',  steps: [['o2_filter', 'filter']] },
  prime:     { name: 'Prime Shields',          kind: 'short',  steps: [['sh_prime', 'prime']] },
  garbage:   { name: 'Empty Garbage',          kind: 'short',  steps: [['caf_garbage', 'garbage']] },
  calibrate: { name: 'Calibrate Distributor',  kind: 'short',  steps: [['el_calibrate', 'calibrate']] },
  align:     { name: 'Align Engine Output',    kind: 'short',  steps: [['ue_align', 'align'], ['le_align', 'align']] },
  chart:     { name: 'Chart Course',           kind: 'short',  steps: [['nav_chart', 'chart']] },
  steer:     { name: 'Stabilize Steering',     kind: 'short',  steps: [['nav_steer', 'steer']] },
  manifold:  { name: 'Unlock Manifolds',       kind: 'short',  steps: [['re_manifold', 'manifold']] },
};
export const DOWNLOAD_STATIONS = ['caf_download', 'wpn_download', 'nav_download', 'comms_download'];

// ---- Sabotages: where each is fixed and with which mini-game.
export const SABOTAGES = {
  lights:  { name: 'Lights',  icon: '💡', critical: false, fix: [['el_panel', 'lights']] },
  comms:   { name: 'Comms',   icon: '📡', critical: false, fix: [['comms_panel', 'comms']] },
  reactor: { name: 'Reactor', icon: '☢️', critical: true,  fix: [['reactor_top', 'reactor'], ['reactor_bot', 'reactor']] },
  o2:      { name: 'O2',      icon: '🫧', critical: true,  fix: [['o2_pad', 'o2code'], ['admin_pad', 'o2code']] },
};

// ---------------------------------------------------------------------------
// Geometry

const CELL = 10;      // collision / sight grid
const NAV = 20;       // bot path-finding grid

export class ShipMap {
  constructor() {
    this.cols = Math.ceil(WORLD.w / CELL);
    this.rows = Math.ceil(WORLD.h / CELL);
    this.walk = new Uint8Array(this.cols * this.rows);
    this.sight = new Uint8Array(this.cols * this.rows);
    const fill = (grid, [x1, y1, x2, y2], v) => {
      for (let cy = Math.floor(y1 / CELL); cy < Math.ceil(y2 / CELL); cy++) {
        for (let cx = Math.floor(x1 / CELL); cx < Math.ceil(x2 / CELL); cx++) grid[cy * this.cols + cx] = v;
      }
    };
    for (const r of [...ROOMS.map((r) => r.rect), ...HALLS]) { fill(this.walk, r, 1); fill(this.sight, r, 1); }
    for (const f of FURNITURE) {
      if (f.rect) fill(this.walk, f.rect, 0);
      else {
        for (let cy = Math.floor((f.y - f.r) / CELL); cy <= Math.ceil((f.y + f.r) / CELL); cy++) {
          for (let cx = Math.floor((f.x - f.r) / CELL); cx <= Math.ceil((f.x + f.r) / CELL); cx++) {
            if (Math.hypot(cx * CELL + CELL / 2 - f.x, cy * CELL + CELL / 2 - f.y) < f.r) this.walk[cy * this.cols + cx] = 0;
          }
        }
      }
    }
    this.buildNav();
    for (const [id, s] of Object.entries(STATIONS)) {
      s.id = id;
      s.room = this.roomAt(s.x, s.y)?.id;
      s.stand = this.nearestStandable(s.x, s.y);
    }
    for (const v of VENTS) v.room = this.roomAt(v.x, v.y)?.id;
  }

  cellAt(grid, x, y) {
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
    if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) return 0;
    return grid[cy * this.cols + cx];
  }
  isWalkable(x, y) { return this.cellAt(this.walk, x, y) === 1; }
  isOpen(x, y) { return this.cellAt(this.sight, x, y) === 1; }

  canStand(x, y, r) {
    if (!this.isWalkable(x, y)) return false;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      if (!this.isWalkable(x + Math.cos(a) * r, y + Math.sin(a) * r)) return false;
    }
    return true;
  }

  /** Move a circle by (dx, dy), sliding along walls. Returns the new position. */
  move(x, y, dx, dy, r) {
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 6));
    const sx = dx / steps, sy = dy / steps;
    for (let i = 0; i < steps; i++) {
      if (this.canStand(x + sx, y, r)) x += sx;
      if (this.canStand(x, y + sy, r)) y += sy;
    }
    return { x, y };
  }

  /** Clear line of sight (walls only) between two points. */
  los(x1, y1, x2, y2) {
    const d = Math.hypot(x2 - x1, y2 - y1);
    const n = Math.ceil(d / 8);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      if (!this.isOpen(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)) return false;
    }
    return true;
  }

  /** Polygon (flat [x,y,...]) of what's visible from (x, y) within `radius`. */
  visibility(x, y, radius, rays = 200) {
    const pts = new Float32Array(rays * 2);
    const step = 5;
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      let d = 0;
      while (d < radius) {
        const nd = d + step;
        if (!this.isOpen(x + ca * nd, y + sa * nd)) break;
        d = nd;
      }
      // Let walls themselves show a little.
      d = Math.min(radius, d + 14);
      pts[i * 2] = x + ca * d;
      pts[i * 2 + 1] = y + sa * d;
    }
    return pts;
  }

  roomAt(x, y) {
    for (const r of ROOMS) {
      const [x1, y1, x2, y2] = r.rect;
      if (x >= x1 && x <= x2 && y >= y1 && y <= y2) return r;
    }
    return null;
  }
  roomName(x, y) { return this.roomAt(x, y)?.name ?? 'the hallway'; }

  nearestStandable(x, y) {
    const r = 18;
    if (this.canStand(x, y, r)) return { x, y };
    for (let d = 10; d < 200; d += 10) {
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
        if (this.canStand(px, py, r)) return { x: px, y: py };
      }
    }
    return { x, y };
  }

  // ---- Path-finding (A* on a coarse grid, then string-pulled)

  buildNav() {
    this.ncols = Math.ceil(WORLD.w / NAV);
    this.nrows = Math.ceil(WORLD.h / NAV);
    this.nav = new Uint8Array(this.ncols * this.nrows);
    for (let cy = 0; cy < this.nrows; cy++) {
      for (let cx = 0; cx < this.ncols; cx++) {
        this.nav[cy * this.ncols + cx] = this.canStand(cx * NAV + NAV / 2, cy * NAV + NAV / 2, 19) ? 1 : 0;
      }
    }
  }

  navCell(x, y) {
    let cx = Math.max(0, Math.min(this.ncols - 1, Math.floor(x / NAV)));
    let cy = Math.max(0, Math.min(this.nrows - 1, Math.floor(y / NAV)));
    if (this.nav[cy * this.ncols + cx]) return cy * this.ncols + cx;
    // Nearest open cell.
    for (let r = 1; r < 12; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= this.ncols || ny >= this.nrows) continue;
          if (this.nav[ny * this.ncols + nx]) return ny * this.ncols + nx;
        }
      }
    }
    return cy * this.ncols + cx;
  }

  /** Waypoints from (x1,y1) to (x2,y2), or null if unreachable. */
  path(x1, y1, x2, y2) {
    const start = this.navCell(x1, y1), goal = this.navCell(x2, y2);
    const W = this.ncols, N = this.nav.length;
    const g = new Float32Array(N).fill(Infinity);
    const came = new Int32Array(N).fill(-1);
    const closed = new Uint8Array(N);
    const gx = goal % W, gy = (goal / W) | 0;
    const h = (i) => {
      const dx = Math.abs((i % W) - gx), dy = Math.abs(((i / W) | 0) - gy);
      return (dx + dy) + (Math.SQRT2 - 2) * Math.min(dx, dy);
    };
    const heap = new MinHeap();
    g[start] = 0;
    heap.push(start, h(start));
    const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];
    let found = false;
    while (heap.size) {
      const cur = heap.pop();
      if (cur === goal) { found = true; break; }
      if (closed[cur]) continue;
      closed[cur] = 1;
      const cx = cur % W, cy = (cur / W) | 0;
      for (const [dx, dy, cost] of DIRS) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= this.nrows) continue;
        const ni = ny * W + nx;
        if (!this.nav[ni] || closed[ni]) continue;
        if (dx && dy && (!this.nav[cy * W + nx] || !this.nav[ny * W + cx])) continue; // no corner cutting
        const ng = g[cur] + cost;
        if (ng < g[ni]) { g[ni] = ng; came[ni] = cur; heap.push(ni, ng + h(ni)); }
      }
    }
    if (!found) return null;
    const cells = [];
    for (let c = goal; c !== -1; c = came[c]) cells.push(c);
    cells.reverse();
    const pts = cells.map((c) => ({ x: (c % W) * NAV + NAV / 2, y: ((c / W) | 0) * NAV + NAV / 2 }));
    pts.push({ x: x2, y: y2 });
    // String-pull: skip waypoints we can walk straight past.
    const out = [];
    let from = { x: x1, y: y1 }, i = 0;
    while (i < pts.length) {
      let j = pts.length - 1;
      while (j > i && !this.walkLine(from.x, from.y, pts[j].x, pts[j].y)) j--;
      out.push(pts[j]);
      from = pts[j];
      i = j + 1;
    }
    return out;
  }

  walkLine(x1, y1, x2, y2) {
    const d = Math.hypot(x2 - x1, y2 - y1);
    const n = Math.ceil(d / 10);
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      if (!this.canStand(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, 17)) return false;
    }
    return true;
  }
}

class MinHeap {
  constructor() { this.items = []; this.prio = []; }
  get size() { return this.items.length; }
  push(item, p) {
    const a = this.items, q = this.prio;
    a.push(item); q.push(p);
    let i = a.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (q[parent] <= q[i]) break;
      [a[parent], a[i]] = [a[i], a[parent]];
      [q[parent], q[i]] = [q[i], q[parent]];
      i = parent;
    }
  }
  pop() {
    const a = this.items, q = this.prio;
    const top = a[0];
    const lastI = a.pop(), lastP = q.pop();
    if (a.length) {
      a[0] = lastI; q[0] = lastP;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < a.length && q[l] < q[m]) m = l;
        if (r < a.length && q[r] < q[m]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        [q[m], q[i]] = [q[i], q[m]];
        i = m;
      }
    }
    return top;
  }
}
