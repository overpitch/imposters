// Shared drawing helpers: text, panels, controller button glyphs, and the crew characters.

export const FONT = 'system-ui, "Segoe UI", -apple-system, sans-serif';

export function text(ctx, str, x, y, size, color, { align = 'center', weight = 800, stroke = 0, base = 'middle' } = {}) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = base;
  if (stroke) {
    ctx.lineWidth = stroke;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.strokeText(str, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

export function panel(ctx, x, y, w, h, r, fill, border, lw = 2) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (border) { ctx.strokeStyle = border; ctx.lineWidth = lw; ctx.stroke(); }
}

const BTN = { A: '#3fbf3f', B: '#e04848', X: '#3a7be0', Y: '#f0c020', LB: '#5a6170', RB: '#5a6170', menu: '#5a6170' };

/** An Xbox button glyph. */
export function button(ctx, label, x, y, r) {
  const wide = label === 'LB' || label === 'RB';
  ctx.beginPath();
  if (wide) ctx.roundRect(x - r * 1.4, y - r * 0.75, r * 2.8, r * 1.5, r * 0.5);
  else ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = BTN[label] ?? '#5a6170';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = Math.max(1.5, r * 0.12);
  ctx.stroke();
  if (label === 'menu') {
    ctx.fillStyle = '#fff';
    for (let k = -1; k <= 1; k++) ctx.fillRect(x - r * 0.45, y + k * r * 0.32 - r * 0.07, r * 0.9, r * 0.14);
  } else {
    text(ctx, label, x, y + r * 0.04, r * (wide ? 0.85 : 1.15), label === 'Y' ? '#3a2a00' : '#fff', { weight: 900 });
  }
}

/** Text with inline button glyphs, centered. parts: string | { btn } */
export function rich(ctx, parts, cx, cy, size, color) {
  ctx.font = `800 ${size}px ${FONT}`;
  const br = size * 0.6, gap = size * 0.25;
  const widths = parts.map((p) => (typeof p === 'string' ? ctx.measureText(p).width : (p.btn.length > 1 && p.btn !== 'menu' ? br * 2.8 : br * 2) + gap * 2));
  let x = cx - widths.reduce((a, b) => a + b, 0) / 2;
  parts.forEach((p, i) => {
    if (typeof p === 'string') text(ctx, p, x, cy, size, color, { align: 'left' });
    else button(ctx, p.btn, x + widths[i] / 2, cy, br);
    x += widths[i];
  });
}

// ---------------------------------------------------------------------------
// Crew characters (an original astronaut: round helmet with a glass visor, separate body).
// Drawn around their feet point; `s` = height in pixels.

export function drawCrew(ctx, x, y, s, color, { facing = 1, walk = 0, moving = false, alpha = 1, shadow = true } = {}) {
  const u = s / 48;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(u * facing, u);
  ctx.globalAlpha *= alpha;
  if (shadow) {
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath(); ctx.ellipse(0, 0, 15, 4.5, 0, 0, Math.PI * 2); ctx.fill();
  }
  const step = moving ? Math.sin(walk) * 3 : 0;
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = '#111';
  // Legs.
  ctx.fillStyle = color.shade;
  ctx.beginPath(); ctx.roundRect(-11, -11 - Math.max(0, step), 9, 11 + Math.max(0, step) * 0.3, 3); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(2, -11 - Math.max(0, -step), 9, 11 + Math.max(0, -step) * 0.3, 3); ctx.fill(); ctx.stroke();
  // Backpack.
  ctx.fillStyle = color.shade;
  ctx.beginPath(); ctx.roundRect(-19, -29, 8, 16, 3); ctx.fill(); ctx.stroke();
  // Body.
  const g = ctx.createLinearGradient(0, -32, 0, -8);
  g.addColorStop(0, color.body); g.addColorStop(1, color.shade);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.roundRect(-14, -32, 28, 23, 8); ctx.fill(); ctx.stroke();
  // Belt.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(-13, -15, 26, 3);
  // Helmet shell + glass visor.
  ctx.fillStyle = color.body;
  ctx.beginPath(); ctx.arc(0, -38, 12.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  const v = ctx.createLinearGradient(2, -46, 8, -32);
  v.addColorStop(0, '#c9f1ff'); v.addColorStop(1, '#3d7fa8');
  ctx.fillStyle = v;
  ctx.beginPath(); ctx.ellipse(4, -38, 8.5, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath(); ctx.ellipse(6.5, -41, 3, 1.6, -0.4, 0, Math.PI * 2); ctx.fill();
  // Antenna.
  ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-3, -50); ctx.lineTo(-5, -55); ctx.stroke();
  ctx.fillStyle = color.body; ctx.beginPath(); ctx.arc(-5, -56, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
}

/** A ghost: see-through, no legs, wispy tail. */
export function drawGhost(ctx, x, y, s, color, { facing = 1, t = 0 } = {}) {
  const u = s / 48;
  ctx.save();
  ctx.translate(x, y - Math.sin(t * 2) * 3 * u);
  ctx.scale(u * facing, u);
  ctx.globalAlpha *= 0.5;
  ctx.fillStyle = color.body;
  ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-14, -26);
  ctx.quadraticCurveTo(-14, -34, -6, -34);
  ctx.lineTo(6, -34);
  ctx.quadraticCurveTo(14, -34, 14, -26);
  ctx.lineTo(14, -14);
  for (let i = 0; i <= 4; i++) ctx.lineTo(14 - i * 7, -10 + (i % 2 ? -5 : 2) + Math.sin(t * 6 + i) * 1.5);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, -38, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#c9f1ff';
  ctx.beginPath(); ctx.ellipse(4, -38, 8, 6.5, 0, 0, Math.PI * 2); ctx.fill();
  // Halo.
  ctx.strokeStyle = '#ffe680'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.ellipse(0, -55, 9, 3, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

/** What's left after a kill: the bottom half, with a bone sticking out. */
export function drawBody(ctx, x, y, s, color, facing = 1) {
  const u = s / 48;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(u * facing, u);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath(); ctx.ellipse(0, 0, 16, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#111'; ctx.lineWidth = 2.2;
  // Bone.
  ctx.fillStyle = '#f4f1e6';
  ctx.beginPath(); ctx.roundRect(-2.5, -30, 5, 14, 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(-3, -31, 3.5, 0, Math.PI * 2); ctx.arc(3, -31, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // Legs + lower body.
  ctx.fillStyle = color.shade;
  ctx.beginPath(); ctx.roundRect(-11, -11, 9, 11, 3); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(2, -11, 9, 11, 3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = color.body;
  ctx.beginPath();
  ctx.moveTo(-14, -20);
  for (let i = 0; i <= 6; i++) ctx.lineTo(-14 + i * (28 / 6), -20 + (i % 2 ? -3 : 1)); // torn edge
  ctx.lineTo(14, -12);
  ctx.quadraticCurveTo(14, -8, 8, -8);
  ctx.lineTo(-8, -8);
  ctx.quadraticCurveTo(-14, -8, -14, -12);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(-13, -15, 26, 3);
  ctx.restore();
}
