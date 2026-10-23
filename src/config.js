// Game settings (Among Us-style defaults for an 8-player game with 2 Imposters).
export const SETTINGS = {
  players: 8,
  impostors: 2,
  humanImpostorChance: 0.25, // with 1–2 humans (they share a role): chance they're the Imposters

  speed: 175,                // units / second
  radius: 16,                // collision radius of a crewmate
  crewVision: 380,           // vision radius (world units)
  impostorVision: 560,
  lightsOutVision: 120,      // crewmate vision while Lights are sabotaged

  killCooldown: 30,          // seconds
  firstKillCooldown: 12,     // at game start and after each meeting
  killRange: 85,
  useRange: 75,
  reportRange: 140,
  ventCooldown: 1,

  emergencyPerPlayer: 1,
  emergencyCooldown: 15,     // seconds after a meeting before the button works again
  discussionTime: 12,
  votingTime: 40,
  ejectTime: 6,

  sabotageCooldown: 30,
  reactorTime: 40,           // seconds to fix Reactor before Imposters win
  o2Time: 40,
  doorTime: 10,

  tasks: { common: 1, long: 1, short: 2 },
};

export const COLORS = [
  { name: 'Red',    body: '#c51111', shade: '#7a0838' },
  { name: 'Blue',   body: '#132ed1', shade: '#09158e' },
  { name: 'Green',  body: '#117f2d', shade: '#0a4d2e' },
  { name: 'Pink',   body: '#ed54ba', shade: '#ab2bad' },
  { name: 'Orange', body: '#ef7d0d', shade: '#b33e15' },
  { name: 'Yellow', body: '#f5f557', shade: '#c38823' },
  { name: 'Black',  body: '#3f474e', shade: '#1e1f26' },
  { name: 'White',  body: '#d6e0f0', shade: '#8394bf' },
  { name: 'Purple', body: '#6b2fbb', shade: '#3b177c' },
  { name: 'Brown',  body: '#71491e', shade: '#5e2615' },
  { name: 'Cyan',   body: '#38fedc', shade: '#24a8be' },
  { name: 'Lime',   body: '#50ef39', shade: '#15a742' },
];

export const SLOT_COLORS = ['#ffd84a', '#5fd4ff', '#ff7ac8', '#9dff5f']; // P1–P4 accent (cursors, labels)

// Bot "thinking" time (seconds) at each task type.
export const TASK_SECONDS = {
  swipe: 3, fuel: 4, download: 7, upload: 7, scan: 9, divert: 2, accept: 2, wires: 4, asteroids: 8,
  filter: 5, prime: 3, garbage: 4, calibrate: 5, align: 3, chart: 4, steer: 3, manifold: 4,
  lights: 4, comms: 4, o2code: 4, reactor: 0,
};
