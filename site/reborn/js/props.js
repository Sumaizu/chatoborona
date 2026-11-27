import { GOLD, METAL, Model, STEEL } from './models.js';

const BRASS = '#c99a2e';

function around(count, turn, cx, cy, rx, ry, each) {
  for (let i = 0; i < count; i++) {
    const a = turn + i * Math.PI * 2 / count;
    each(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, a, i);
  }
}

const GRENADES = {
  flash(m, lit) {
    m.limb(11, 15.5, 3.5, 11, 7.5, 3.5, 3.4, '#6b7280', 0.4);
    for (const y of [9.5, 13.5]) m.limb(11, y, 3.6, 11, y - 0.6, 3.6, 3.6, '#facc15', 0.3);
    m.limb(11, 7.5, 4, 11, 5.6, 4.4, 1.4, METAL, 0.6);
    m.limb(12.2, 6, 5.2, 15.4, 12.8, 5.2, 0.6, STEEL, 0.6);
    if (lit) m.ball(11, 5, 6, 0.9, '#ffffff', 1);
  },
  emp(m, lit) {
    m.egg(11, 12, 2, 5.4, 5.4, 4.4, '#1f2937', 0.5);
    m.limb(5.8, 12, 5, 16.2, 12, 5, 1.2, lit ? '#22d3ee' : '#0e7490', 0.6);
    for (const x of [8, 14]) m.ball(x, 9.4, 6.4, 0.8, lit ? '#a5f3fc' : '#155e75', 1);
    m.limb(11, 7.2, 5.6, 11, 4.6, 6, 1.3, METAL, 0.6);
    if (lit) m.ball(11, 4.2, 7, 0.9, '#67e8f9', 1);
  },
};

const DRONES = { attack: ['#57534e', '#f97316'], laser: ['#1e3a8a', '#22d3ee'], air: ['#3f6212', '#a3e635'] };

export function drawDrone(kind, frame) {
  const m = new Model(18, 1), [body, light] = DRONES[kind];
  for (const [x, y] of [[3.6, 3.6], [14.4, 3.6], [3.6, 14.4], [14.4, 14.4]]) {
    m.limb(9, 9, 3, x, y, 3.4, 0.7, '#3f3f46');
    m.egg(x, y, 3.6, 2.9, 2.9, 0.3, '#6b7280');
    const [ax, ay] = frame ? [2.6, 0] : [0, 2.6];
    m.limb(x - ax, y - ay, 4.1, x + ax, y + ay, 4.1, 0.4, '#e5e7eb');
    m.ball(x, y, 4.3, 0.6, '#27272a');
  }
  m.egg(9, 9.4, 3.4, 3.4, 4.2, 2.2, body, 0.5);
  if (kind === 'attack') m.limb(9, 7, 3.6, 9, 2.6, 3.6, 0.55, '#1f2937', 0.5);
  if (kind === 'laser') m.ball(9, 5.6, 4.4, 1.3, light, 1);
  if (kind === 'air') m.egg(9, 12.4, 4.6, 2, 1.4, 1, '#d6b478');
  m.ball(9, 7.4, 5.4, 0.8, light, 1);
  return m.paint();
}


const BIRD = { flap: [1, 0.72, 0.42], lift: [0, 1, 2], feathers: ['#5a3a1e', '#7c4a22', '#94602f', '#7c4a22', '#a0703e'] };

export function drawBird(frame) {
  const m = new Model(40, 0.5), open = BIRD.flap[frame], lift = BIRD.lift[frame];
  for (let i = 0; i < 5; i++) {
    const dx = (i - 2) * 1.3;
    m.limb(20, 24, 3, 20 + dx * 1.4, 32.5 - Math.abs(i - 2) * 0.6, 2.6, 1.1, i % 2 ? '#5a3a1e' : '#6b4423', 0, 0.8);
  }
  for (const side of [-1, 1]) {
    const sx = 20 + side * 3, sy = 17, z = 4 + lift * 0.5;
    for (let i = 0; i < 6; i++) {
      const a = -0.42 + i * 0.22, len = (12.5 - i * 1.1) * (0.55 + open * 0.45);
      const tx = sx + side * Math.cos(a) * len * (0.4 + open * 0.6), ty = sy + Math.sin(a) * len + (1 - open) * 3;
      const mx = sx + (tx - sx) * 0.72, my = sy + (ty - sy) * 0.72;
      m.limb(sx, sy, z, mx, my, z + lift * 0.5, 2.2, BIRD.feathers[i % 5], 0.2, 1.5);
      m.limb(mx, my, z + lift * 0.5, tx, ty, z + lift * 0.6, 1.4, i % 2 ? '#3f2a18' : '#4a2f17', 0.2, 0.45);
    }
    m.limb(sx, sy - 0.6, z + 1, sx + side * 5.2 * (0.4 + open * 0.6), sy - 1.2 + (1 - open) * 2, z + 1 + lift * 0.4,
      2.4, '#a0703e', 0.3, 1.2);
  }
  m.egg(20, 19.5, 4.6, 4.2, 6.6, 3, '#8b5a2b', 0.3);
  for (const [x, y] of [[18.6, 18], [21.4, 18.6], [19.2, 21.4], [20.8, 22]]) {
    m.limb(x, y - 1, 7.4, x + 0.3, y + 1, 7.2, 0.45, '#4a2f17');
  }
  m.egg(20, 12, 6.4, 3.4, 3.6, 2.6, '#7c4a22', 0.3);
  m.egg(20, 11.2, 8, 2.2, 2.4, 1.4, '#94602f', 0.4);
  for (const side of [-1, 1]) m.egg(20 + side * 2.6, 12.6, 6.8, 1.1, 1.6, 1, '#e7d3b0');
  m.limb(20, 8.8, 7, 20, 6, 6.6, 0.9, '#f59e0b', 0.3, 0.2);
  for (const side of [-1, 1]) {
    m.ball(20 + side * 1.8, 10.2, 8.4, 0.75, '#111827', 0.8);
    m.dot(20 + side * 1.8 - 0.4, 9.6, '#f8fafc');
  }
  return m.paint();
}

const HAWK = { flap: [1, 0.7, 0.4], lift: [0, 1, 2], feathers: ['#3b2414', '#4a2c17', '#5c371c', '#4a2c17', '#6b4423'] };

export function drawHawk(frame) {
  const m = new Model(52, 0.5), open = HAWK.flap[frame], lift = HAWK.lift[frame], c = 26;
  for (let i = 0; i < 7; i++) {
    const dx = (i - 3) * 1.15;
    m.limb(c, 30, 3, c + dx * 1.9, 41 - Math.abs(i - 3) * 0.5, 2.4, 1.2, i % 2 ? '#7c3f1d' : '#9a4f24', 0, 0.8);
  }
  for (const x of [c - 2.6, c, c + 2.6]) m.limb(x, 37, 3.4, x + (x - c) * 0.3, 39.6, 3.2, 0.4, '#3b2414');
  for (const side of [-1, 1]) {
    const sx = c + side * 3.4, sy = 22, z = 4 + lift * 0.5;
    for (let i = 0; i < 8; i++) {
      const a = -0.5 + i * 0.17, len = (18 - i * 1.2) * (0.55 + open * 0.45);
      const tx = sx + side * Math.cos(a) * len * (0.4 + open * 0.6), ty = sy + Math.sin(a) * len + (1 - open) * 4;
      const mx = sx + (tx - sx) * 0.7, my = sy + (ty - sy) * 0.7;
      m.limb(sx, sy, z, mx, my, z + lift * 0.5, 2.4, HAWK.feathers[i % 5], 0.2, 1.5);
      m.limb(mx, my, z + lift * 0.5, tx, ty, z + lift * 0.6, i < 3 ? 1.1 : 1.5, i < 3 ? '#1c1209' : '#2e1c0f', 0.2,
        0.45);
    }
    m.limb(sx, sy - 0.8, z + 1, sx + side * 7.5 * (0.4 + open * 0.6), sy - 1.6 + (1 - open) * 2.4,
      z + 1 + lift * 0.4, 2.6, '#7a5230', 0.3, 1.2);
    for (let k = 0; k < 3; k++) {
      const px = sx + side * (2.4 + k * 2) * (0.4 + open * 0.6), py = sy - 0.6 + (1 - open) * k * 0.6;
      m.dot(px, py, '#c9a46a');
    }
  }
  m.egg(c, 24.5, 4.6, 5, 7.8, 3.2, '#5c371c', 0.3);
  for (const [x, y] of [[c - 1.6, 22], [c + 1.6, 23], [c - 1, 26.4], [c + 1.2, 27.4]]) {
    m.limb(x, y - 1.2, 7.8, x + 0.2, y + 1.2, 7.6, 0.5, '#d9c29a');
  }
  m.egg(c, 16, 6.6, 3.8, 4.2, 2.8, '#6b4423', 0.3);
  m.egg(c, 15.2, 8.4, 2.6, 2.8, 1.5, '#e8dcc0', 0.4);
  for (const side of [-1, 1]) m.limb(c + side * 2.2, 15.4, 8.2, c + side * 3.4, 17.4, 7.4, 0.55, '#3b2414');
  m.limb(c, 12.6, 7.6, c, 10, 7.2, 1.1, '#facc15', 0.3, 0.3);
  m.limb(c, 10.2, 7.2, c, 9, 6.6, 0.5, '#1f2937');
  for (const side of [-1, 1]) {
    m.ball(c + side * 2.1, 13.6, 8.8, 0.95, '#fbbf24', 0.8);
    m.ball(c + side * 2.1, 13.6, 9.4, 0.5, '#111827', 0.8);
    m.dot(c + side * 2.1 - 0.4, 13.2, '#f8fafc');
  }
  return m.paint();
}

export function drawGrenade(kind, lit) {
  const m = new Model(22, 1);
  GRENADES[kind](m, lit);
  return m.paint();
}

const FIREBALL = { width: 16, height: 26, head: 7, radius: 5.5,
  tones: { warm: ['#fffbe6', '#fde68a', '#fbbf24', '#f97316', '#dc2626', '#7f1d1d'],
    blue: ['#f0f9ff', '#bae6fd', '#7dd3fc', '#3b82f6', '#1d4ed8', '#1e3a8a'],
    toxic: ['#f7fee7', '#d9f99d', '#a3e635', '#65a30d', '#3f6212', '#1a2e05'],
    plague: ['#ede9fe', '#a78bfa', '#6d28d9', '#3b0764', '#1e1033', '#09090b'],
    holy: ['#fffef7', '#fffbe0', '#fef3b4', '#fde68a', '#facc15', '#ca8a04'],
    azure: ['#f0fbff', '#c7f0ff', '#7dd3fc', '#38bdf8', '#0284c7', '#0c4a6e'],
    earth: ['#fef3c7', '#e7c9a0', '#b08356', '#7c5a3a', '#4a3426', '#241811'],
    lava: ['#fff1a8', '#ffd166', '#ff8a1f', '#e2531f', '#8a2a12', '#2a1210'],
    storm: ['#ffffff', '#fefce8', '#fef08a', '#facc15', '#ca8a04', '#713f12'] } };

const grain = (x, y, frame) => {
  const v = Math.sin(x * 12.9898 + y * 78.233 + frame * 37.719) * 43758.5453;
  return v - Math.floor(v);
};

export function drawFireball(tone, frame) {
  const { width, height, head, radius } = FIREBALL, tones = FIREBALL.tones[tone];
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const g = canvas.getContext('2d'), tail = height - head;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x + 0.5 - width / 2, dy = y + 0.5 - head, back = Math.max(0, dy) / tail;
      const sway = Math.sin(back * 9 + frame * 2.1) * back * 2.2;
      const span = radius * Math.pow(Math.max(0, 1 - back), 0.75);
      const ball = 1 - Math.hypot(dx, dy) / radius;
      const plume = dy > 0 && span > 0 ? (1 - Math.abs(dx - sway) / span) * (1 - back) * 0.9 : 0;
      const base = Math.max(ball, plume), heat = base + (grain(x, y, frame) - 0.5) * 0.22 * Math.min(1, base * 3);
      if (base <= 0.06 || heat <= 0.06) continue;
      g.fillStyle = tones[heat > 0.72 ? 0 : heat > 0.56 ? 1 : heat > 0.42 ? 2 : heat > 0.28 ? 3 : heat > 0.14 ? 4 : 5];
      g.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

const ORB = { tones: ['#f0fbff', '#c7f0ff', '#7dd3fc', '#38bdf8', '#0284c7', '#075985', '#0c4a6e'], light: [-0.5, -0.6, 0.62],
  drops: [0, 2, 3, 4, 6], frames: 4 };

export function drawWaterOrb(radius, stage, frame) {
  const side = Math.ceil(radius * 2 + 10), canvas = document.createElement('canvas'), mid = side / 2;
  canvas.width = canvas.height = side;
  const g = canvas.getContext('2d'), [lx, ly, lz] = ORB.light, t = frame / ORB.frames * Math.PI * 2;
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      const dx = x + 0.5 - mid, dy = y + 0.5 - mid, a = Math.atan2(dy, dx);
      const edge = radius * (1 + 0.045 * Math.sin(a * 5 + t) + 0.03 * Math.sin(a * 3 - t * 2));
      const d = Math.hypot(dx, dy) / edge;
      if (d > 1) continue;
      const nz = Math.sqrt(1 - d * d), nx = dx / edge, ny = dy / edge, lit = nx * lx + ny * ly + nz * lz;
      const deep = 0.5 + 0.5 * Math.sin(dx * 0.55 + t) * Math.sin(dy * 0.5 - t * 1.3);
      let v = 0.42 + lit * 0.5 - d * 0.18 + (deep - 0.5) * 0.22 + (grain(x, y, frame) - 0.5) * 0.12;
      if (d > 0.86 && nx + ny > 0.3) v += 0.25;
      const tone = lit > 0.9 && d < 0.6 ? 0 : v > 0.82 ? 1 : v > 0.66 ? 2 : v > 0.5 ? 3 : v > 0.36 ? 4 : v > 0.22 ? 5 : 6;
      g.fillStyle = ORB.tones[tone];
      g.fillRect(x, y, 1, 1);
    }
  }
  for (let i = 0; i < ORB.drops[stage]; i++) {
    const a = i * Math.PI * 2 / ORB.drops[stage] + t * 0.5 + (i % 2) * 0.4, d = radius + 2.5 + (i % 2) * 1.5;
    const x = Math.round(mid + Math.cos(a) * d), y = Math.round(mid + Math.sin(a) * d);
    g.fillStyle = ORB.tones[3];
    g.fillRect(x - 1, y, 2, 1);
    g.fillRect(x, y - 1, 1, 2);
    g.fillStyle = ORB.tones[1];
    g.fillRect(x, y, 1, 1);
  }
  return canvas;
}

export const ORB_FRAMES = ORB.frames;

const SPRING = { frames: 6, stamps: [[0, 0, 9, 1], [-6, 3, 8, 0.8], [7, -2, 7, 0.7], [2, 5, 6, 0.55], [-3, -4, 5, 0.45]],
  stones: [[-13, -3, 4, 3], [-10, 6, 3, 2], [12, 5, 4, 3], [9, -8, 3, 2], [-3, -10, 3, 2]] };

const hexRgb = (hex) => [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16));

function shade(a, b, k) {
  const [x, y] = [hexRgb(a), hexRgb(b)];
  return 'rgb(' + x.map((v, n) => Math.round(v + (y[n] - v) * k)).join(', ') + ')';
}

function pond(g, w, h, stamps, style, seed, ripple, shallow = false) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 0;
      for (const [sx, sy, r, lift] of stamps) {
        const dx = x + 0.5 - w / 2 - sx, dy = (y + 0.5 - h / 2 - sy) * 1.15;
        v += lift * Math.exp(-(dx * dx + dy * dy) / (r * r));
      }
      const noise = grain(x, y, seed);
      v *= 0.92 + 0.16 * noise;
      if (v < 0.2) continue;
      if (v < 0.36) {
        const fade = (v - 0.2) / 0.16;
        if (noise > fade) continue;
        g.globalAlpha = (60 + 90 * fade) / 255;
        g.fillStyle = style.wet;
        g.fillRect(x, y, 1, 1);
        g.globalAlpha = 1;
        continue;
      }
      if (v < 0.48 && !shallow) {
        g.fillStyle = shade(style.shore, style.wet, noise * 0.3);
        g.fillRect(x, y, 1, 1);
        continue;
      }
      const depth = Math.min(1, (v - 0.48) / 0.5), top = shallow ? 1 : 3;
      const step = Math.max(0, Math.min(top, Math.floor(depth * 4 + (noise - 0.5) * 0.9)));
      let color = shade(style.shallow, style.deep, step / 3);
      const wave = ripple(x - w / 2, y - h / 2);
      if (wave > 0) color = shade(style.shallow, style.shine, wave * 0.7);
      g.fillStyle = color;
      g.fillRect(x, y, 1, 1);
    }
  }
}

export function drawSpring(frame, style) {
  const w = 40, h = 34, canvas = document.createElement('canvas'), t = frame / SPRING.frames;
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');
  pond(g, w, h, SPRING.stamps, style, 3, (dx, dy) => {
    if (Math.hypot(dx, dy) < 2.6 && grain(dx + 40, dy + 40, frame) > 0.55) return 0.55;
    return grain(dx + 80, dy + 80, frame) > 0.985 ? 0.6 : 0;
  });
  for (const [sx, sy, sw, sh] of SPRING.stones) {
    const x = Math.round(w / 2 + sx), y = Math.round(h / 2 + sy);
    g.fillStyle = shade(style.shore, '#000000', 0.35);
    g.fillRect(x, y + 1, sw, sh);
    g.fillStyle = shade(style.shore, '#ffffff', 0.12);
    g.fillRect(x, y, sw, sh);
    g.fillStyle = shade(style.shore, '#ffffff', 0.32);
    g.fillRect(x + 1, y, sw - 2, 1);
  }
  for (let k = 0; k < 3; k++) {
    const phase = (t + k / 3) % 1, x = Math.round(w / 2 + (k - 1) * 2), y = Math.round(h / 2 - 1 - phase * 4);
    g.globalAlpha = 1 - phase;
    g.fillStyle = style.shine;
    g.fillRect(x, y, 1, 1);
  }
  g.globalAlpha = 1;
  return canvas;
}

export const SPRING_FRAMES = SPRING.frames;

const PUDDLE = { frames: 4 };

export function drawPuddle(seed, frame, style) {
  const w = 40, h = 26, canvas = document.createElement('canvas'), t = frame / PUDDLE.frames;
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d'), turn = seed * 1.7;
  const stamps = [[0, 0, 12, 1], [Math.cos(turn) * 7, Math.sin(turn) * 3, 8, 0.7], [-Math.cos(turn) * 6, 2, 7, 0.55]];
  pond(g, w, h, stamps, style, seed + 11, (dx, dy) => {
    const ring = Math.abs(Math.hypot(dx, dy * 1.6) - (2 + t * 8));
    return ring < 0.5 && grain(Math.round(dx), Math.round(dy), seed) > 0.4 ? 0.6 * (1 - t) : 0;
  }, true);
  return canvas;
}

export const PUDDLE_FRAMES = PUDDLE.frames;

const LAVA_POOL = { w: 46, h: 30, frames: 6, tones: ['#1f1412', '#4a1a10', '#8a2a12', '#d2461a', '#ff7a1f', '#ffb347',
  '#ffe08a', '#fff6cf'], crust: ['#2b211f', '#3d302c', '#55443e'] };

export function drawLavaPool(seed, frame) {
  const s = LAVA_POOL, canvas = document.createElement('canvas'), t = frame / s.frames * Math.PI * 2;
  canvas.width = s.w;
  canvas.height = s.h;
  const g = canvas.getContext('2d'), cx = s.w / 2, cy = s.h / 2, turn = seed * 1.3;
  const blobs = [[0, 0, 1], [Math.cos(turn) * 7, Math.sin(turn) * 3, 0.62], [-Math.cos(turn + 1) * 8, Math.sin(turn + 2) * 2.5, 0.55]];
  for (let y = 0; y < s.h; y++) {
    for (let x = 0; x < s.w; x++) {
      let fill = -1;
      for (const [bx, by, r] of blobs) {
        const dx = (x + 0.5 - cx - bx) / (19 * r), dy = (y + 0.5 - cy - by) / (12 * r);
        fill = Math.max(fill, 1 - Math.hypot(dx, dy));
      }
      if (fill <= -0.06) continue;
      fill += (grain(x, y, seed) - 0.5) * 0.06 + 0.04 * Math.sin(x * 0.7 + seed) * Math.sin(y * 0.9);
      if (fill <= 0) continue;
      let tone;
      if (fill < 0.08) tone = 0;
      else if (fill < 0.16) tone = 1;
      else if (fill < 0.26) tone = 2;
      else {
        const vein = Math.sin(x * 0.55 + y * 0.35 + t + Math.sin(y * 0.6 - t) * 1.4);
        const heat = fill * 1.3 + vein * 0.3 + (grain(x, y, seed + 7) - 0.5) * 0.15;
        tone = heat > 1.42 ? 7 : heat > 1.2 ? 6 : heat > 0.95 ? 5 : heat > 0.62 ? 4 : 3;
      }
      g.fillStyle = s.tones[tone];
      g.fillRect(x, y, 1, 1);
    }
  }
  for (let k = 0; k < 2; k++) {
    const a = seed * 2.1 + k * 2.9 + t * 0.08, px = cx + Math.cos(a) * (7 + k * 3), py = cy + Math.sin(a) * (3 + k);
    const rw = 1 + k, rh = 1;
    for (let y = -rh; y <= rh; y++) {
      for (let x = -rw; x <= rw; x++) {
        if ((x / (rw + 0.5)) ** 2 + (y / (rh + 0.5)) ** 2 > 1) continue;
        g.fillStyle = s.crust[(x + y + k + 9) % 3];
        g.fillRect(Math.round(px + x), Math.round(py + y), 1, 1);
      }
    }
  }
  for (let k = 0; k < 3; k++) {
    const life = (frame / s.frames + k / 3) % 1, bx = cx + Math.cos(seed + k * 2.4) * 8, by = cy + Math.sin(seed + k * 1.9) * 4;
    if (life > 0.6) continue;
    g.fillStyle = s.tones[7];
    g.fillRect(Math.round(bx), Math.round(by - life * 2), 1, 1);
    g.fillStyle = s.tones[6];
    if (life > 0.3) g.fillRect(Math.round(bx) - 1, Math.round(by - life * 2), 3, 1);
  }
  return canvas;
}

export const LAVA_POOL_FRAMES = LAVA_POOL.frames;

const ROOTS = { bark: ['#5b3a22', '#6b4a2c', '#4e3220', '#7a5636', '#644024'], soil: '#3a2a1b', hole: '#1c130b',
  thorn: '#e3d4b0', leaf: ['#4d7c0f', '#65a30d'], drop: 3 };

function arch(m, roll, from, to, high, r) {
  const steps = 10, point = (f) => [from[0] + (to[0] - from[0]) * f, from[1] + (to[1] - from[1]) * f - high * Math.sin(f * Math.PI),
    high * Math.sin(f * Math.PI)];
  const bark = ROOTS.bark[Math.floor(roll() * ROOTS.bark.length) % ROOTS.bark.length];
  for (const [x, y] of [from, to]) {
    m.egg(x, y + 0.5, 0, r + 2, (r + 2) * 0.6, 1.2, ROOTS.soil);
    m.egg(x, y + 0.5, 1, r * 0.9, r * 0.55, 0.3, ROOTS.hole);
  }
  for (let k = 0; k < steps; k++) {
    const p = point(k / steps), q = point((k + 1) / steps), w = (f) => r * (1.15 - 0.3 * Math.sin(f * Math.PI));
    m.limb(p[0], p[1], p[2] + 1.5, q[0], q[1], q[2] + 1.5, w(k / steps), bark, 0.2, w((k + 1) / steps));
  }
  for (const f of [0.3, 0.5, 0.7]) {
    if (roll() > 0.55) continue;
    const [x, y, z] = point(f), out = roll() < 0.5 ? 1 : -1;
    m.limb(x, y - r * 0.6, z + r + 1.5, x + out * 1.4, y - r - 1.8, z + r + 2.5, 0.75, ROOTS.thorn, 0.3, 0.12);
  }
  if (roll() < 0.3) {
    const [x, y, z] = point(0.35 + roll() * 0.3);
    m.egg(x + 1, y - r, z + r + 2, 1.8, 1.2, 0.7, ROOTS.leaf[Math.floor(roll() * 2) % 2], 0.2);
  }
}

export function drawRootWall(spots, length, size, half) {
  const m = new Model(size, 1), seed = Math.round(length * 13 + spots[0].x * 7 + spots[0].y * 3);
  let n = 0;
  const roll = () => grain(n++, seed, 7), ease = half * 2.2;
  const at = (s, u) => {
    let lo = 0, hi = spots.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (spots[mid].s <= s) lo = mid;
      else hi = mid;
    }
    const a = spots[lo], b = spots[hi], f = b.s > a.s ? Math.max(0, Math.min(1, (s - a.s) / (b.s - a.s))) : 0;
    const nx = a.nx + (b.nx - a.nx) * f, ny = a.ny + (b.ny - a.ny) * f;
    return [a.x + (b.x - a.x) * f + nx * u, a.y + (b.y - a.y) * f + ny * u + ROOTS.drop];
  };
  for (let s = 5, k = 0; s < length - 5; s += 6 + roll() * 2, k++) {
    const f = Math.min(1, Math.min(s, length - s) / ease), grow = f * f * (3 - 2 * f);
    if (grow < 0.3) continue;
    const span = (11 + roll() * 5) * grow, u = (k % 2 ? 1 : -1) * half * (0.35 + roll() * 0.2) * grow;
    const tilt = (roll() - 0.5) * 4;
    const a = Math.max(1, s - span / 2), b = Math.min(length - 1, s + span / 2);
    arch(m, roll, at(a, u - tilt), at(b, u + tilt), (6 + roll() * 4) * grow, (1.7 + roll() * 0.7) * (0.7 + 0.3 * grow));
  }
  return m.paint();
}

export function drawSnare(r) {
  const size = Math.ceil(r * 3 + 10), m = new Model(size, 1), c = size / 2, foot = c + r * 0.55;
  let n = 0;
  const roll = () => grain(n++, r, 11);
  for (let i = 0; i < 3; i++) {
    const a = 0.35 + i * 1.05, dx = Math.cos(a) * r, dy = Math.sin(a) * r * 0.35;
    arch(m, roll, [c - dx, foot - dy], [c + dx, foot + dy], r * (0.9 + 0.2 * i), 1.7);
  }
  return m.paint();
}

const TRAP = { steel: '#7d8792', jaw: '#8f98a3', tooth: '#e8edf2', pan: '#a9b2bc', spring: '#5d6670',
  ground: '#2f343c', pin: '#c3cad2' };

export function drawTrap(closed) {
  const m = new Model(48, 2), cx = 24, cy = 24, ring = 8;
  for (const side of [-1, 1]) {
    for (let k = 0; k < 8; k++) {
      const a0 = (k / 8 - 0.5) * 1.5, a1 = ((k + 1) / 8 - 0.5) * 1.5, r0 = ring + 1.7, r1 = ring + 1.7;
      m.limb(cx + side * Math.cos(a0) * r0, cy + Math.sin(a0) * r0, 0.9, cx + side * Math.cos(a1) * r1,
        cy + Math.sin(a1) * r1, 0.9, 0.85, TRAP.spring, 0.5);
    }
    m.ball(cx + side * ring, cy, 1.6, 1.25, TRAP.pin, 0.7);
  }
  if (!closed) {
    m.egg(cx, cy, 0, ring - 0.4, ring - 0.4, 0.4, TRAP.ground, 0.1);
    m.egg(cx, cy, 0.6, 3, 3, 0.55, TRAP.pan, 0.7);
    m.limb(cx - 2.2, cy + 0.4, 1.2, cx + 2.2, cy + 0.4, 1.2, 0.32, TRAP.spring, 0.6);
    around(56, 0, cx, cy, ring, ring, (x, y) => m.ball(x, y, 1, 0.9, TRAP.jaw, 0.6));
    around(18, 0.17, cx, cy, ring - 0.3, ring - 0.3, (x, y, a, i) => {
      const len = i % 2 ? 2.4 : 3.3;
      m.limb(x, y, 1.6, x - Math.cos(a) * len, y - Math.sin(a) * len, 2.4, 0.7, TRAP.tooth, 0.85, 0.06);
    });
    return m.paint();
  }
  for (let i = 0; i <= 30; i++) {
    const t = i / 30, x = cx - ring + t * ring * 2, lift = Math.sin(t * Math.PI);
    m.ball(x, cy - 1.1 - lift * 2.2, 2.4 + lift * 3, 0.9, TRAP.jaw, 0.6);
    m.ball(x, cy + 1.1 + lift * 2.2, 2.4 + lift * 3, 0.9, '#7b848e', 0.55);
  }
  for (let i = 0; i < 10; i++) {
    const x = cx - 6.3 + i * 1.4, up = i % 2 === 0, lift = Math.sin((x - cx + ring) / (ring * 2) * Math.PI);
    m.limb(x, up ? cy - 2.6 : cy + 2.6, 3 + lift * 3, x + 0.15, up ? cy + 0.9 : cy - 0.9, 3.6 + lift * 3, 0.5,
      TRAP.tooth, 0.85, 0.06);
  }
  return m.paint();
}

export const BREWS = { toxic: ['#365314', '#65a30d', '#a3e635', '#ecfccb'], plague: ['#1e1033', '#4c1d95', '#8b5cf6',
  '#ddd6fe'] };

const POT = { iron: '#2c2e35', band: '#454a54', rim: '#3d414a', rivet: '#8b929c', leg: '#1f2127', handle: '#5b616b' };

export function drawCauldron(plague) {
  const m = new Model(72, 3), c = 36, brew = BREWS[plague ? 'plague' : 'toxic'];
  for (const a of [Math.PI * 0.2, Math.PI * 0.8, Math.PI * 1.5]) {
    m.limb(c + Math.cos(a) * 7.6, c + 1 + Math.sin(a) * 6.8, 1.5, c + Math.cos(a) * 9.6, c + 1.6 + Math.sin(a) * 8.6, 0.2,
      1.05, POT.leg, 0.4, 0.75);
  }
  m.egg(c, c + 2.2, 1, 9.6, 8.8, 7, POT.iron, 0.6);
  around(30, 0, c, c + 2.4, 9.5, 8.7, (x, y) => m.ball(x, y, 5, 0.6, POT.band, 0.5));
  around(8, 0.35, c, c + 2.4, 9.6, 8.8, (x, y) => m.ball(x, y, 5.4, 0.42, POT.rivet, 0.9));
  for (const side of [-1, 1]) {
    const hx = c + side * 8.6;
    m.limb(hx, c - 1.6, 8.6, hx + side * 2.4, c - 0.6, 8, 0.6, POT.handle, 0.7);
    m.limb(hx + side * 2.4, c - 0.6, 8, hx + side * 2.3, c + 1.6, 7.6, 0.6, POT.handle, 0.7);
    m.limb(hx + side * 2.3, c + 1.6, 7.6, hx + side * 0.2, c + 2.2, 7.6, 0.6, POT.handle, 0.7);
  }
  around(52, 0, c, c - 1.2, 8.3, 7.3, (x, y) => m.ball(x, y, 9.6, 1.15, POT.rim, 0.75));
  m.egg(c, c - 1.2, 9.2, 7.2, 6.2, 0.6, brew[0], 0.2);
  m.egg(c - 0.3, c - 1.4, 9.6, 6.1, 5.2, 0.5, brew[1], 0.5);
  m.egg(c - 2.2, c - 3, 10, 2.4, 1.3, 0.3, brew[2], 0.8);
  for (const [dx, dy, len] of [[-5.6, 5.2, 2.2], [4.2, 6, 1.6]]) {
    m.limb(c + dx, c + dy, 9.2, c + dx * 1.08, c + dy + len, 7.6, 0.55, brew[1], 0.6, 0.4);
    m.ball(c + dx * 1.08, c + dy + len + 0.2, 7.4, 0.55, brew[2], 0.8);
  }
  return m.paint();
}

const LAVA = {
  warm: ['#fff3b0', '#ffd84a', '#f97316', '#c2410c', '#7c2d12'],
  blue: ['#e0f2ff', '#9bd5ff', '#3b82f6', '#1d4ed8', '#1e3a8a'],
};

export function drawVent(lit, blue) {
  const m = new Model(44, 1.22), lava = LAVA[blue ? 'blue' : 'warm'], c = 22;
  m.egg(c, c + 0.6, 0, 13.4, 12.4, 2.4, '#3b3430');
  around(11, 0.3, c, c + 0.6, 12.4, 11.4, (x, y, a, i) => {
    m.egg(x, y, 1, 2.3 - (i % 3) * 0.45, 1.9 - (i % 2) * 0.35, 1.6, i % 2 ? '#4f4741' : '#5f5650');
  });
  m.egg(c, c, 1, 10.4, 9.6, 5.2, '#4a413a');
  around(6, 0.5, c, c, 1, 1, (x, y, a, i) => {
    const bend = a + (i % 2 ? 0.2 : -0.15), reach = 11.6 + (i % 3) * 0.6;
    const x0 = c + Math.cos(a) * 7, y0 = c + Math.sin(a) * 6.4;
    const x1 = c + Math.cos(bend) * reach, y1 = c + Math.sin(bend) * reach * 0.93;
    m.limb(x0, y0, 4.9, x1, y1, 1.8, 1.1, lava[lit ? 3 : 4], 0.2, 0.5);
    m.limb(x0, y0, 5.3, (x0 * 2 + x1) / 3, (y0 * 2 + y1) / 3, 4.4, 0.55, lava[lit ? 1 : 2], 0.2, 0.3);
  });
  around(18, 0, c, c, 6.2, 5.7, (x, y) => m.ball(x, y, 5.2, 0.9, lava[3], 0.2));
  around(14, 0.1, c, c, 7.5, 6.9, (x, y, a, i) => m.ball(x, y, 5, 1.6 - (i % 3) * 0.3, i % 2 ? '#5c544d' : '#433b35'));
  m.egg(c, c, 5.6, 5.6, 5, 0.6, lava[lit ? 3 : 4], 0.2);
  m.egg(c - 0.3, c - 0.2, 5.8, 4.3, 3.8, 0.5, lava[lit ? 2 : 3], 0.2);
  m.egg(c - 0.6, c - 0.5, 6, 2.6, 2.2, 0.4, lava[lit ? 1 : 2], 0.2);
  const [bx, by] = lit ? [c + 1.4, c - 1.2] : [c - 1.6, c + 1.2];
  m.ball(bx, by, 6, lit ? 1.2 : 0.8, lava[0], 0.6);
  return m.paint();
}

export function drawNuke() {
  const m = new Model(30, 1);
  m.limb(15, 10, 3, 15, 3.5, 3, 2.2, '#4b5563', 0.4, 1.6);
  for (const side of [-1, 1]) m.egg(15 + side * 4.4, 4.6, 3, 2.4, 3.6, 0.9, '#3f4651', 0.5);
  m.egg(15, 2.6, 3.4, 5.4, 1.3, 2, '#5d6670', 0.6);
  m.egg(15, 16.5, 5, 8.4, 9.6, 7, '#e2c23a', 0.6);
  m.egg(15, 11.4, 9.6, 7.4, 1.4, 2.4, '#2d2f36', 0.5);
  around(3, -Math.PI / 2, 15, 18, 3, 3, (x, y) => {
    m.ball(x, y, 11.6, 1.9, '#1d1f26', 0.2);
  });
  m.ball(15, 18, 12.4, 1, '#1d1f26', 0.2);
  m.ball(15, 25.4, 4, 2, GOLD, 0.8);
  return m.paint();
}

export function drawRocket() {
  const m = new Model(20, 1);
  for (const side of [-1, 1]) m.limb(10 + side * 1.4, 15, 3, 10 + side * 4.4, 18.6, 3, 0.8, '#3f4651', 0.4);
  m.limb(10, 17, 3.5, 10, 7, 3.5, 2.2, '#5f6b3a', 0.5);
  m.limb(10, 11.6, 5.6, 10, 10.4, 5.6, 0.5, '#e0b43a', 0.6);
  m.egg(10, 5.4, 4, 2.7, 4, 2.7, '#c0392b', 0.6);
  m.ball(10, 2.2, 4.4, 1.1, GOLD, 0.8);
  return m.paint();
}

export function drawBoulder() {
  const m = new Model(24, 1);
  m.ball(12, 12, 4, 7.4, '#6b5d4d', 0.2);
  for (const [x, y, r, c] of [[8.4, 9, 3.2, '#8a7a66'], [15.4, 13.6, 3.4, '#7a6b58'], [10, 16, 2.4, '#5e5142'],
    [15.6, 7.8, 2.6, '#958672']]) {
    m.ball(x, y, 7, r, c, 0.2);
  }
  for (const [x0, y0, x1, y1] of [[7, 12, 11.6, 10.6], [12.4, 11, 15.4, 12.2], [11, 14, 13.4, 17.4]]) {
    m.limb(x0, y0, 10.6, x1, y1, 10.6, 0.35, '#3b3128');
  }
  for (const [x, y] of [[8, 8], [15, 7], [16, 13]]) m.dot(x, y, '#c4b6a0');
  return m.paint();
}

const HILLOCK = { dark: '#5e4630', soil: '#8a6a44', light: '#a8855a', stone: '#8c8580', stoneLit: '#aaa298',
  slab: '#b5aca0', seam: '#6f6862' };

export function drawHillock() {
  const c = HILLOCK, m = new Model(40, 1);
  m.egg(20, 22, 0, 17, 13, 1.2, c.dark);
  m.egg(20, 21, 1, 14.6, 11, 4.6, c.soil, 0.1);
  m.egg(20, 19.6, 4.6, 11.2, 8.4, 3.6, c.light, 0.1);
  around(13, 0.2, 20, 22, 15, 11.4, (x, y, a, i) => m.egg(x, y, 1.6, 2.2 + (i % 3) * 0.4, 1.6, 1.6,
    i % 2 ? c.stone : c.stoneLit, 0.15));
  around(9, 0.5, 20, 19.6, 10.6, 8, (x, y, a, i) => m.egg(x, y, 6.4, 1.6, 1.2, 1.2, i % 2 ? c.seam : c.stone, 0.1));
  m.egg(20, 18.6, 8.4, 7.4, 5.4, 1, c.slab, 0.15);
  for (const [x0, y0, x1, y1] of [[14, 18.6, 26, 18.6], [20, 14, 20, 23.2], [16, 15.6, 18.4, 17], [22.4, 20.4, 24.6, 22]]) {
    m.limb(x0, y0, 9.5, x1, y1, 9.5, 0.3, c.seam);
  }
  return m.paint();
}

const WATCHES = {
  grass: { post: '#6e4a2c', plank: '#a87a4a', seam: '#7c5634', face: '#5e3d22', flag: '#e23b3b' },
  swamp: { post: '#4e4129', plank: '#83704a', seam: '#5f5034', face: '#43381f', flag: '#a3e635' },
  desert: { post: '#8a5d33', plank: '#d1a46a', seam: '#a77b48', face: '#7a5030', flag: '#2563eb' },
  snow: { post: '#5c4a38', plank: '#8f7a63', seam: '#6c5a47', face: '#4f3f30', flag: '#38bdf8', snow: '#f2f8ff' },
  volcano: { post: '#2f2a28', plank: '#5a524d', seam: '#3f3936', face: '#26211f', flag: '#f97316', stone: true },
  graveyard: { post: '#4f4957', plank: '#8d8697', seam: '#6a6474', face: '#45404c', flag: '#a78bfa', stone: true },
};

export const WATCH_TOP = 11.5;

export function drawWatch(biome) {
  const look = WATCHES[biome] || WATCHES.grass, m = new Model(44, 1);
  for (const [x0, x1] of [[9.5, 17], [34.5, 27]]) {
    m.limb(x0, 23, 9, x1, 31, 2, 0.6, look.post, 0.2);
    m.limb(x1, 23, 9, x0, 31, 2, 0.6, look.post, 0.2);
  }
  for (const x of [8, 36]) {
    m.limb(x, 21, 13, x, 32, 0, 1.7, look.post, 0.25);
    m.egg(x, 32.5, 0, 2.2, 1.1, 0.8, look.face);
  }
  for (const x of [19.5, 24.5]) m.limb(x, 21, 14, x, 33, 1, 0.7, look.post, 0.3);
  for (let k = 0; k < 3; k++) {
    m.limb(19.5, 24 + k * 3.2, 11 - k * 3.6, 24.5, 24 + k * 3.2, 11 - k * 3.6, 0.55, look.seam);
  }
  m.egg(22, 20.2, 13, 16, 1.4, 1.4, look.face, 0.1);
  for (let y = 5; y <= 18; y += 3.25) {
    m.egg(22, y, 18, 15.6, 1.6, 1.1, Math.round(y * 4) % 2 ? look.plank : look.seam, look.stone ? 0.1 : 0.25);
  }
  if (look.stone) for (const [x, y] of [[13, 6], [28, 9], [17, 15], [31, 16], [11, 12]]) m.dot(x, y, look.seam, 20);
  else for (let y = 6.6; y <= 18; y += 3.25) for (const x of [13, 22, 31]) m.dot(x, y, look.seam, 20);
  const corners = [[6.5, 3.5], [37.5, 3.5], [6.5, 19], [37.5, 19]];
  for (const [[x0, y0], [x1, y1]] of [[corners[0], corners[1]], [corners[0], corners[2]], [corners[1], corners[3]]]) {
    m.limb(x0, y0, 22, x1, y1, 22, 0.9, look.post, 0.4);
  }
  for (const [x0, x1] of [[6.5, 17], [27, 37.5]]) m.limb(x0, 19, 22, x1, 19, 22, 0.9, look.post, 0.4);
  for (const [x, y] of corners) {
    m.limb(x, y, 17, x, y, 23, 1.5, look.post, 0.3);
    m.ball(x, y, 23.5, 1.9, look.face, 0.5);
  }
  m.limb(6.5, 3.5, 24, 6.5, 0, 30, 0.6, look.post);
  for (let k = 0; k < 4; k++) {
    m.egg(8.2 + k * 1.4, 0.6 + k * 0.35, 30 - k * 0.7, 1.5, 1.2 - k * 0.15, 0.6, look.flag, 0.3);
  }
  if (look.snow) {
    for (const [x, y] of [[11, 5], [30, 8], [16, 13], [28, 16], [9, 17], [35, 6], [22, 5]]) m.dot(x, y, look.snow, 21);
  }
  return m.paint();
}

export const SOILS = {
  grass: { soil: '#7a5235', light: '#a07850', dark: '#4a3322', stone: '#8c8a84', tuft: '#5fa83a' },
  swamp: { soil: '#4f4a2e', light: '#6f6a42', dark: '#2f2c1a', stone: '#6f7466', tuft: '#8fbf3a' },
  desert: { soil: '#c99a58', light: '#e3bd7c', dark: '#8f6a3a', stone: '#a8957a' },
  snow: { soil: '#dfe9f5', light: '#ffffff', dark: '#a9bccf', stone: '#8d9aa8' },
  volcano: { soil: '#4a403b', light: '#6a5d55', dark: '#2a2421', stone: '#33302e', ember: '#ff7a1f' },
  graveyard: { soil: '#463c35', light: '#62564c', dark: '#29231f', stone: '#7a7480', bone: '#ece6d6' },
};

export function drawMound(biome, frame, claws) {
  const soil = SOILS[biome] || SOILS.grass, m = new Model(30, 1), c = 15, turn = frame ? 0.45 : 0;
  m.egg(c, 17, 0, 12.5, 8.6, 1.2, soil.dark, 0);
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2 + turn * 0.6, r = 10.6 + (i % 3) * 0.7;
    m.egg(c + Math.cos(a) * r, 17 + Math.sin(a) * r * 0.66, 0.5, 1.9, 1.4, 1, i % 2 ? soil.soil : soil.dark);
  }
  m.egg(c, 15.5, 1, 9, 7, 5.4, soil.soil, 0.1);
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2 + turn, r = 4.4 + (i % 2) * 1.6;
    m.ball(c + Math.cos(a) * r, 15 + Math.sin(a) * r * 0.75, 4.4 + (i % 3), 2 + (i % 2) * 0.5,
      i % 3 ? soil.light : soil.soil, 0.1);
  }
  m.ball(c, 14 - (frame ? 0.6 : 0), 6.4, 2.6, soil.light, 0.1);
  for (const [x, y] of [[13, 11], [12, 10], [17, 12], [18, 11], [19, 10], [15, 18], [14, 19], [11, 15]]) {
    m.dot(x, y, soil.dark, 30);
  }
  for (const [x, y] of [[6.5, 19.5], [23.5, 20], [21, 9.5]]) m.ball(x, y, 1.6, 1.1, soil.stone, 0.4);
  if (soil.tuft) for (const [x, y] of [[5, 15], [25, 16], [9, 23], [22, 23]]) m.dot(x, y, soil.tuft, 4);
  if (soil.ember) for (const [x, y] of [[12, 13], [18, 16], [15, 9]]) m.dot(x, y, soil.ember, 31);
  if (soil.bone) m.limb(20, 20, 2, 23, 19, 2, 0.5, soil.bone, 0.3);
  if (claws) {
    const reach = frame ? 1.2 : 0;
    for (const side of [-1, 1]) {
      for (let k = -1; k <= 1; k++) {
        m.limb(c + side * 3 + k * 0.9, 9.5, 5, c + side * 3.4 + k * 1.1, 6.6 - reach + Math.abs(k) * 0.6, 6, 0.55,
          '#f5f5f4', 0.6, 0.3);
      }
    }
    m.ball(c, 8.8 - reach, 6.5, 1.4, '#f9a8d4', 0.8);
  }
  return m.paint();
}

export function drawClod(biome, seed) {
  const soil = SOILS[biome] || SOILS.grass, m = new Model(12, 1);
  m.egg(6, 6.5, 0, 4.6, 3.4, 1.4, soil.dark);
  m.ball(5 + seed % 2, 6, 1, 2.2, soil.soil, 0.1);
  m.ball(7.4 - seed % 2, 6.8, 1, 1.6, seed % 3 ? soil.light : soil.soil, 0.1);
  return m.paint();
}

const WALL_TOP = '#b2a794';
const WALL_FACE = '#83796b';
const WALL_EDGE = '#bdb3a0';

function wallModel(stage, c) {
  const m = new Model(36, 1), broken = stage >= 2;
  m.egg(18, 28, 0, 15.5, 5.5, 2, c.base);
  [[30.5, 2, 0], [26.5, 5, 1], [22.5, 8, 0]].forEach(([y, z, shift]) => {
    for (let x = 4 + shift * 3.5; x < 33; x += 7) {
      m.egg(Math.min(31.5, x + 3), y, z, 3.4, 1.9, 1.6, (x + y) % 3 < 1.5 ? c.face : c.alt, c.gloss);
    }
  });
  for (const [x, y] of [[11, 12.5], [25, 12.5], [11, 17.5], [25, 17.5]]) {
    m.egg(x, y, 10, 7.6, 3.6, 1.4, broken ? c.worn : c.top, c.gloss);
  }
  for (let k = 0; k <= 24; k++) m.dot(6 + k, 15, c.seam, 13);
  for (const x of [12, 24]) for (let y = 10; y <= 20; y++) m.dot(x + (y > 15 ? 2 : 0), y, c.seam, 13);
  const rim = [];
  for (let x = 5; x <= 31; x += 4.33) rim.push([x, 8.6], [x, 21.2]);
  for (let y = 12.8; y <= 17.5; y += 4.2) rim.push([4.6, y], [31.4, y]);
  rim.forEach(([x, y], k) => {
    if (broken && k % 3) return;
    m.egg(x, y, k % 2 ? 12 : 13.5, 2.1, 1.7, 2.6, c.edge, c.gloss + 0.1);
  });
  const cracks = [[[17, 11], [19, 13], [18, 15]], [[12, 23], [13, 25], [12, 27]], [[25, 27], [26, 29], [25, 31]],
    [[27, 17], [25, 19]]];
  for (const line of cracks.slice(0, stage * 2)) {
    for (let k = 0; k + 1 < line.length; k++) {
      const [x0, y0] = line[k], [x1, y1] = line[k + 1], steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let t = 0; t <= steps; t++) m.dot(x0 + (x1 - x0) * t / steps, y0 + (y1 - y0) * t / steps, c.crack);
    }
  }
  if (broken) for (const [x, y] of [[3, 32], [11, 33.5], [26, 33], [33, 31.5]]) m.egg(x, y, 1, 2, 1.4, 1.2, c.face);
  else if (c.moss) for (const [x, y] of [[8, 13], [9, 13], [28, 18], [17, 20.5]]) m.dot(x, y, c.moss, 30);
  return m.paint();
}

const STONE_WALL = { base: '#5c564d', face: WALL_FACE, alt: '#8b8172', top: WALL_TOP, worn: '#a39885', seam: '#8f8574',
  edge: WALL_EDGE, crack: '#2b2620', moss: '#6f8a3e', gloss: 0.1 };
const ICE_WALL = { base: '#4f86ad', face: '#9fd4f2', alt: '#7fbde6', top: '#d8f3ff', worn: '#aedbf3', seam: '#6aa8d2',
  edge: '#e8f9ff', crack: '#24557a', moss: null, gloss: 0.5 };

export const drawWall = (stage) => wallModel(stage, STONE_WALL);
export const drawIceWall = (stage) => wallModel(stage, ICE_WALL);

const ICICLE = { outline: '#1e5f8c', top: ['#ffffff', '#e4f8ff', '#bfeaff'], low: ['#8fd3f5', '#5fb2e3', '#3f8cc4'] };

export function drawIcicle(length) {
  const w = length, h = 13, mid = h / 2, canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.fine = 2;
  const g = canvas.getContext('2d'), widest = Math.round(length * 0.24), put = (x, y, color) => {
    g.fillStyle = color;
    g.fillRect(x, y, 1, 1);
  };
  const halfAt = (x) => (x < widest ? 2.2 + 3.6 * Math.sqrt(x / widest) + (x < 3 ? grain(x, 1, 3) * 1.4 : 0)
    : 5.8 * Math.pow(1 - (x - widest) / (w - widest), 0.85));
  for (let x = 0; x < w; x++) {
    const half = halfAt(x + 0.5);
    for (let y = 0; y < h; y++) {
      const dy = y + 0.5 - mid;
      if (Math.abs(dy) > half) continue;
      const edge = Math.abs(dy) > half - 1.05;
      let color;
      if (edge) color = ICICLE.outline;
      else if (dy < -0.2) color = ICICLE.top[Math.min(2, Math.floor((1 + dy / half) * 3))];
      else color = ICICLE.low[Math.min(2, Math.floor(dy / half * 3))];
      if (!edge && Math.abs(dy + 0.6) < 0.6 && x > 3 && x < w - 4) color = '#ffffff';
      if (!edge && x > 2 && grain(x, y, 7) > 0.93) color = ICICLE.top[0];
      put(x, y, color);
    }
  }
  put(w - 1, Math.floor(mid), '#ffffff');
  return canvas;
}



const RUINS = {
  grass: { stone: '#9a9284', light: '#b3ab9c', dark: '#6f685d', floor: '#7d766a', moss: '#5f8f3a' },
  swamp: { stone: '#7f8473', light: '#959a87', dark: '#5a5f50', floor: '#666b5a', moss: '#7fa03a' },
  snow: { stone: '#8592a3', light: '#a3afbf', dark: '#5f6b7b', floor: '#9aa7b8', moss: '#f4f8ff' },
  desert: { stone: '#d1a86c', light: '#e2bd84', dark: '#a37b46', floor: '#c49a5e', moss: '#f0dcab' },
  volcano: { stone: '#4f4648', light: '#665b5d', dark: '#342d2f', floor: '#3e3537', moss: '#ff7a1f', glow: true },
  graveyard: { stone: '#8a8495', light: '#a29cad', dark: '#5f5a69', floor: '#6f6979', moss: '#a78bfa', glow: true },
};

const roll = (seed, k) => {
  const v = Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

const SIDES = [[1, true, 7.5], [4, true, 26], [8, false, 4], [2, false, 26]];

function rubble(m, x, y, look, seed, spread) {
  for (let k = 0; k < 4; k++) {
    const size = 1.5 - k * 0.25;
    m.ball(x + (roll(seed, k) - 0.5) * spread, y + (roll(seed, k + 4) - 0.5) * spread, size * 0.6, size,
      k % 2 ? look.dark : look.stone, 0.1);
  }
}

export function drawRuin(biome, mask, seed) {
  const look = RUINS[biome] || RUINS.grass, m = new Model(30, 1), r = (k) => roll(seed, k);
  SIDES.forEach(([bit, across, base], s) => {
    if (!(mask & bit)) return;
    let high = 2 + Math.floor(r(60 + s) * 3);
    for (let c = 0; c < 5; c++) {
      if (!across && ((c === 0 && mask & 1) || (c === 4 && mask & 4))) continue;
      const along = 4.2 + c * 5.4, x = across ? along : base, y = across ? base : along;
      const corner = across && ((c === 0 && mask & 8) || (c === 4 && mask & 2));
      high = corner ? 3 + Math.floor(r(61 + s * 5 + c) * 2)
        : Math.max(0, Math.min(4, high + Math.floor(r(62 + s * 5 + c) * 4) - 2));
      if (bit === 1) high = Math.min(high, 4);
      if (!high) {
        rubble(m, x, y + (across ? (bit === 1 ? 2 : -2) : 0), look, seed * 7 + s * 5 + c, 4);
        continue;
      }
      const wide = corner ? 3.3 : across ? 2.8 : 2, deep = corner ? 3.1 : across ? 1.9 : 2.8;
      for (let level = 0; level < high; level++) {
        const top = level === high - 1;
        const color = top ? look.light : r(80 + s * 20 + c * 4 + level) < 0.4 ? look.dark : look.stone;
        m.egg(x, y - level * 2.4, 1.8 + level * 3, wide, deep, 1.7, color, 0.1);
      }
      if (r(70 + s * 5 + c) < 0.6) m.dot(x - 1 + r(75 + s * 5 + c) * 2, y - (high - 1) * 2.4 - 1, look.moss, 30);
      if (!corner && high <= 1 && r(78 + s * 5 + c) < 0.5) rubble(m, x + 1, y + 2, look, seed * 3 + c, 3);
    }
  });
  const cx = 15 + (r(90) - 0.5) * 7, cy = 16 + (r(91) - 0.5) * 6;
  if (r(92) < 0.45) {
    const tall = 6 + r(93) * 6;
    m.limb(cx, cy, 0.5, cx, cy - tall * 0.8, tall + 1, 1.9, look.stone, 0.2, 1.7);
    m.egg(cx, cy - tall * 0.8, tall + 1.6, 2.3, 1.5, 1, look.light, 0.2);
    rubble(m, cx + 2.5, cy + 2, look, seed * 11, 3);
  } else if (r(92) < 0.8) {
    m.limb(cx - 5, cy + 1, 1.6, cx + 4, cy - 1, 1.6, 1.6, look.stone, 0.2);
    m.egg(cx + 6.5, cy - 1.5, 1.6, 1.8, 1.5, 1.5, look.light, 0.2);
  } else rubble(m, cx, cy, look, seed * 13, 6);
  return m.paint();
}

const RELICS = {
  stones(m, look) {
    m.egg(15, 17, 0, 6.5, 4.6, 0.6, look.floor, 0.1);
    m.egg(15, 16.6, 1.2, 4, 2.4, 1.2, look.light, 0.2);
    around(6, -Math.PI / 2, 15, 17, 10.4, 8, (x, y, a, i) => {
      const high = 2 + (i % 3 ? 1 : 0);
      for (let level = 0; level < high; level++) {
        const size = 1 - level * 0.16, top = level === high - 1;
        m.egg(x, y + 2 - level * 2.3, 2 + level * 3, 2.5 * size, 2.1 * size, 1.9, top ? look.light : look.stone, 0.15);
      }
      m.dot(x - 1, y + 2 - (high - 1) * 2.3, look.moss, 30);
      if (i % 2) m.dot(x + 1, y + 2, look.moss, 30);
    });
  },
  bones(m, look) {
    const ivory = '#eee3c6', worn = '#c9bc9c', socket = '#2a2018';
    m.egg(15, 18, 0, 12.5, 6.5, 0.6, look.floor, 0.05);
    const spine = (t) => [4 + t * 19, 20 - t * 7 + Math.sin(t * 3.2) * 1.5];
    for (let k = 0; k <= 12; k++) {
      const [x, y] = spine(k / 12);
      m.ball(x, y, 1.5, 1.2, k % 2 ? ivory : worn, 0.3);
    }
    for (let k = 1; k <= 4; k++) {
      const [x, y] = spine(0.2 + k * 0.13);
      m.limb(x, y, 2, x - 2, y - 5, 6, 0.75, ivory, 0.3);
      m.limb(x - 2, y - 5, 6, x - 0.5, y - 8, 3.5, 0.65, ivory, 0.3);
      m.limb(x, y, 2, x + 2.5, y + 4.5, 5, 0.75, ivory, 0.3);
      m.limb(x + 2.5, y + 4.5, 5, x + 4, y + 6.5, 2.5, 0.65, worn, 0.3);
    }
    m.egg(24.5, 12.5, 3, 3.6, 3, 2.8, ivory, 0.4);
    m.egg(27.2, 11.6, 2.6, 2, 1.6, 1.8, worn, 0.3);
    m.dot(23.5, 11.5, socket, 30);
    m.dot(25.5, 12.5, socket, 30);
    m.limb(23.6, 10, 5, 21, 5.5, 7.5, 0.8, worn, 0.4, 0.3);
    m.limb(26, 9.8, 5, 27.5, 5.5, 7.5, 0.8, worn, 0.4, 0.3);
    m.dot(9, 22, look.moss, 30);
  },
  crypt(m, look) {
    m.egg(15, 21.5, 0, 12.5, 5.5, 1, look.dark, 0.1);
    for (let row = 0; row < 3; row++) {
      for (let x = 7; x <= 23; x += 4) {
        const color = (x + row) % 3 ? look.stone : look.light;
        m.egg(x + (row % 2) * 2 - 1, 24 - row * 2.6, 2 + row * 3.2, 2.2, 1.4, 1.6, color, 0.1);
      }
    }
    for (let y = 18; y >= 6; y -= 1.5) {
      const z = y >= 12 ? 10 + (18 - y) * 0.83 : 15 - (12 - y) * 0.67;
      m.limb(5.5, y, z, 24.5, y, z, 1.1, Math.round(y / 1.5) % 2 ? look.dark : look.stone, 0.15);
    }
    m.limb(5, 12, 15.6, 25, 12, 15.6, 0.9, look.light, 0.3);
    m.egg(15, 22.4, 11, 2.4, 2.8, 0.4, '#141019');
    m.limb(15, 12, 16, 15, 5.5, 22, 0.6, METAL, 0.6);
    m.limb(12.6, 7.8, 20, 17.4, 7.8, 20, 0.55, METAL, 0.6);
    for (const x of [9.5, 20.5]) {
      m.limb(x, 26.5, 0.5, x, 25, 2.5, 0.6, '#e8dcc8');
      m.dot(x, 24.5, look.moss, 30);
    }
    for (const [x, y] of [[8, 16], [21, 9], [18, 15], [10, 10]]) m.dot(x, y, '#4d5a45', 30);
  },
};

export function drawRelic(kind, biome) {
  const look = RUINS[biome] || RUINS.grass, m = new Model(30, 1);
  RELICS[kind](m, look);
  return m.paint();
}

function crest(m, top, width, height, z, depth, color, gloss) {
  for (let y = top; y <= top + height; y += 0.5) {
    const t = (y - top) / height, half = t < 0.42 ? width : width * Math.pow(Math.max(0, 1 - (t - 0.42) / 0.58), 0.8);
    for (let x = 24 - half; x <= 24 + half; x += 0.5) {
      const nx = (x - 24) / (width * 1.15), ny = (y - top - height * 0.4) / (height * 0.95);
      const nz = Math.sqrt(Math.max(0.08, 1 - nx * nx - ny * ny)), [px, py] = m.place(x, y);
      m.plot(px, py, (z + depth * nz) * m.k, color, [nx, ny, nz], 0, gloss);
    }
  }
}

export function drawEmblem() {
  const m = new Model(48, 1);
  crest(m, 4, 19, 40, 0, 3, '#1e3a8a', 0.2);
  crest(m, 6.5, 16.5, 35, 2, 3, '#2563eb', 0.4);
  crest(m, 8.5, 12, 14, 4, 1.5, '#60a5fa', 0.6);
  const sword = (tx, ty, hx, hy) => {
    const len = Math.hypot(hx - tx, hy - ty), gx = tx + (hx - tx) * 0.72, gy = ty + (hy - ty) * 0.72;
    const px = -(hy - ty) / len * 5, py = (hx - tx) / len * 5;
    m.limb(tx, ty, 10, gx, gy, 10, 1.2, '#f1f5f9', 0.9, 2);
    m.limb(gx - px, gy - py, 11, gx + px, gy + py, 11, 1.4, '#facc15', 0.8);
    m.limb(gx, gy, 10.5, hx, hy, 10.5, 1.4, '#7c2d12', 0.3);
    m.ball(hx, hy, 11, 2, '#facc15', 0.8);
  };
  sword(7, 3, 36, 40);
  sword(41, 3, 12, 40);
  m.ball(24, 22, 12, 3.6, '#facc15', 0.9);
  m.ball(23, 21, 15, 1.3, '#fff7c2', 1);
  return m.paint();
}

export function drawCoinIcon() {
  const m = new Model(32, 1);
  m.egg(16, 16, 0, 14, 14, 3.5, '#b7791f', 0.3);
  m.egg(16, 16, 2.5, 12, 12, 2.5, '#f2b632', 0.5);
  m.egg(16, 16, 4.5, 7.5, 7.5, 1.5, '#fbd25a', 0.6);
  around(14, 0, 16, 16, 12.6, 12.6, (x, y) => m.ball(x, y, 3.6, 0.9, '#d69e2e', 0.4));
  m.ball(12.5, 12, 6.5, 1.7, '#fff4c2', 1);
  return m.paint();
}

const HEART_GLINTS = new Set(['14,14', '13,14', '15,14', '14,13', '14,15', '14,12', '14,16', '12,14', '16,14',
  '31,12']);

function scaleAt(x, y) {
  const w = 9, h = 6.2, radius = 6, row = Math.floor(y / h);
  let best = null;
  for (const r of [row - 1, row, row + 1]) {
    const off = r % 2 ? w / 2 : 0, col = Math.round((x - off) / w), cy = r * h;
    for (const k of [col - 1, col, col + 1]) {
      const reach = Math.hypot(x - (k * w + off), (y - cy) * 1.15) / radius;
      if (reach < 1 && (!best || cy < best.cy)) best = { cy, reach };
    }
  }
  return best ? best.reach : 1;
}

export function drawHeart(look = '') {
  const armored = look !== '';
  const m = new Model(48, 1), side = m.side, shift = m.pad - 0.5;
  const inside = (px, py) => {
    const u = (px - shift - 24) / 17.5, v = (26 - (py - shift)) / 16.5, q = u * u + v * v - 1;
    return q * q * q - u * u * v * v * v <= 0;
  };
  const cells = [], rim = [];
  for (let py = 0; py < side; py++) {
    for (let px = 0; px < side; px++) {
      if (inside(px, py)) cells.push([px, py]);
      else if (inside(px + 1, py) || inside(px - 1, py) || inside(px, py + 1) || inside(px, py - 1)) rim.push([px, py]);
    }
  }
  const height = new Map();
  for (const [px, py] of cells) {
    const d = Math.min(...rim.map(([x, y]) => Math.hypot(px - x, py - y)));
    const z = d <= 3.2 ? 3 + 1.8 * Math.sin(Math.PI * d / 3.2) : 2 + 8 * Math.pow((d - 3.2) / 10, 0.7);
    const reach = armored && d > 3.2 ? scaleAt(px - shift, py - shift) : 1;
    height.set(py * side + px, [z + (reach < 1 ? 2.2 * Math.sqrt(1 - reach * reach) : 0), d, reach]);
  }
  const zAt = (px, py, z) => (height.has(py * side + px) ? height.get(py * side + px)[0] : z - 2);
  for (const [px, py] of cells) {
    const [z, d, reach] = height.get(py * side + px), gold = d <= 3.2;
    const dx = (zAt(px + 1, py, z) - zAt(px - 1, py, z)) / 2, dy = (zAt(px, py + 1, z) - zAt(px, py - 1, z)) / 2;
    const n = [-dx, -dy, 1], l = Math.hypot(n[0], n[1], n[2]);
    const face = gold ? GOLD : !armored ? '#e11d48' : look === 'holy' ? (reach > 0.86 ? '#d9a521' : '#ffeeb8')
      : reach > 0.86 ? '#3f4856' : '#aab5c3';
    if (!armored && HEART_GLINTS.has((px - m.pad) + ',' + (py - m.pad))) m.plot(px, py, z, '#fff1f2', [0, 0, 1], 1, 0);
    else m.plot(px, py, z, face, [n[0] / l, n[1] / l, n[2] / l], 0, gold || armored ? 0.8 : 0.7);
  }
  return m.paint();
}
