// Tiny synthesized sound effects (no audio files). Browsers only allow sound after a user
// gesture, so we (re)start the audio engine on any key/pointer press.

let ac = null;
let master = null;

function engine() {
  if (!ac) {
    try {
      ac = new AudioContext();
      master = ac.createGain();
      master.gain.value = 0.35;
      master.connect(ac.destination);
    } catch { return null; }
  }
  if (ac.state === 'suspended') ac.resume().catch(() => {});
  return ac;
}
addEventListener('keydown', engine);
addEventListener('pointerdown', engine);

function tone(freq, start, dur, { type = 'sine', vol = 0.5, slide = 0 } = {}) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, ac.currentTime + start);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), ac.currentTime + start + dur);
  g.gain.setValueAtTime(0.0001, ac.currentTime + start);
  g.gain.exponentialRampToValueAtTime(vol, ac.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + dur);
  o.connect(g).connect(master);
  o.start(ac.currentTime + start);
  o.stop(ac.currentTime + start + dur + 0.05);
}

function noise(start, dur, { vol = 0.4, freq = 1200, q = 1 } = {}) {
  const len = Math.ceil(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  src.buffer = buf;
  f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  g.gain.value = vol;
  src.connect(f).connect(g).connect(master);
  src.start(ac.currentTime + start);
}

export function sfx(name) {
  const a = engine();
  if (!a || a.state !== 'running') return;
  switch (name) {
    case 'kill': noise(0, 0.25, { vol: 0.8, freq: 2500, q: 0.7 }); tone(90, 0.05, 0.4, { type: 'square', vol: 0.4, slide: 0.5 }); break;
    case 'report': for (let i = 0; i < 3; i++) { tone(880, i * 0.32, 0.16, { type: 'square', vol: 0.25 }); tone(660, i * 0.32 + 0.16, 0.16, { type: 'square', vol: 0.25 }); } break;
    case 'meeting': tone(523, 0, 0.5, { type: 'triangle', vol: 0.4 }); tone(392, 0.25, 0.7, { type: 'triangle', vol: 0.4 }); break;
    case 'task': tone(880, 0, 0.12, { vol: 0.3 }); tone(1320, 0.1, 0.25, { vol: 0.3 }); break;
    case 'vent': noise(0, 0.35, { vol: 0.5, freq: 400, q: 0.8 }); break;
    case 'sabotage': for (let i = 0; i < 4; i++) tone(440, i * 0.25, 0.2, { type: 'sawtooth', vol: 0.15, slide: 1.5 }); break;
    case 'fixed': tone(660, 0, 0.1, { vol: 0.3 }); tone(990, 0.08, 0.2, { vol: 0.3 }); break;
    case 'blip': tone(1200, 0, 0.05, { type: 'square', vol: 0.08 }); break;
    case 'vote': tone(300, 0, 0.08, { type: 'square', vol: 0.2 }); break;
    case 'eject': noise(0, 1.2, { vol: 0.35, freq: 300, q: 0.5 }); break;
    case 'win': [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.15, 0.4, { type: 'triangle', vol: 0.35 })); break;
    case 'lose': [392, 330, 262].forEach((f, i) => tone(f, i * 0.25, 0.5, { type: 'triangle', vol: 0.35 })); break;
  }
}
