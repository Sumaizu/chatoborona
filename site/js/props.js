import { GOLD, METAL, Model, STEEL } from './models.js';

const BRASS = '#c99a2e';
const LAMPS = { big: ['#ff3b3b', '#6b1414'], mine: ['#ffb020', '#6b4410'] };

function around(count, turn, cx, cy, rx, ry, each) {
  for (let i = 0; i < count; i++) {
    const a = turn + i * Math.PI * 2 / count;
    each(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, a, i);
  }
}

const MINES = {
  big(m, lit) {
    m.ball(11, 12, 0, 6.2, '#4d535e', 0.5);
    around(6, Math.PI / 6, 11, 12, 1, 0.86, (x, y, a) => {
      const ex = 11 + Math.cos(a) * 8.2, ey = 12 + Math.sin(a) * 7;
      m.limb(11 + (x - 11) * 4.8, 12 + (y - 12) * 4.8, 3, ex, ey, 3.4, 1.15, METAL, 0.5, 0.8);
      m.ball(ex, ey, 3.6, 1.2, BRASS, 0.7);
    });
    m.egg(11, 12.4, 1.5, 6.5, 2, 4.6, '#3a3f48', 0.4);
    m.ball(11, 9.4, 5.4, 2, BRASS, 0.8);
    m.ball(11, 9, 6.8, 1.4, LAMPS.big[lit ? 0 : 1], 1);
  },
  mine(m, lit) {
    m.egg(11, 12, 0, 9, 7.6, 2.4, '#5f6136');
    around(16, 0, 11, 12, 8.2, 6.9, (x, y, a, i) => m.ball(x, y, 1.6, 0.95, i % 4 < 2 ? '#e0b43a' : '#2a2a20'));
    m.egg(11, 11.6, 1.8, 5.2, 4.4, 1.4, '#8a8752');
    around(3, -Math.PI / 2, 11, 11.6, 3.4, 2.8, (x, y) => m.ball(x, y, 3, 0.8, STEEL, 0.6));
    m.egg(11, 11.6, 3, 1.6, 1.4, 0.8, LAMPS.mine[lit ? 0 : 1], 1);
  },
  grenade(m, lit) {
    m.egg(11, 13, 0, 5.6, 6.8, 4.8, '#55642f', 0.3);
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 3; col++) m.ball(8.2 + col * 2.8, 8.6 + row * 2.9, 3.4, 1.25, '#6f8040', 0.4);
    }
    m.limb(11, 6.8, 4, 11, 3.6, 4.6, 1.5, METAL, 0.6);
    m.limb(12.4, 4, 5.2, 15.8, 13.4, 5.4, 0.7, STEEL, 0.6);
    around(8, 0, 7.6, 3.6, 1.7, 1.7, (x, y) => m.ball(x, y, 5, 0.45, METAL, 0.8));
    if (lit) m.ball(11, 3, 6.4, 0.9, '#ffd84a', 1);
  },
};

export function drawMine(kind, lit) {
  const m = new Model(22, 1);
  MINES[kind](m, lit);
  return m.paint();
}

export function drawTrap(closed) {
  const m = new Model(24, 1), cx = 12, cy = 12.5;
  if (!closed) {
    m.egg(cx, cy, 0, 3.4, 3, 0.8, STEEL, 0.4);
    m.ball(cx, cy, 1, 1, '#c0262d', 0.8);
    around(14, 0, cx, cy, 7.6, 6.6, (x, y, a) => {
      m.limb(x, y, 1.2, cx + Math.cos(a) * 4.6, cy + Math.sin(a) * 4, 2, 0.95, '#dfe5ea', 0.8, 0.15);
    });
    around(40, 0, cx, cy, 8.4, 7.4, (x, y) => m.ball(x, y, 1.2, 1.15, '#8b939c', 0.5));
    for (const side of [-1, 1]) m.egg(cx + side * 10, cy, 1, 1.6, 2.6, 1.4, STEEL, 0.4);
    return m.paint();
  }
  for (const side of [-1, 1]) m.egg(cx + side * 9.6, cy + 1, 1, 1.8, 2.8, 1.6, STEEL, 0.4);
  for (let i = 0; i <= 18; i++) {
    const t = i / 18, x = cx - 8.5 + t * 17, lift = Math.sin(t * Math.PI);
    m.ball(x, cy - 1.6 - lift * 2.4, 4 + lift * 2, 1.2, '#8b939c', 0.5);
    m.ball(x, cy + 2.2 + lift * 1.2, 3 + lift * 1.6, 1.2, '#7a828b', 0.5);
  }
  for (let i = 0; i < 8; i++) {
    const x = cx - 6.3 + i * 1.8, up = i % 2 === 0;
    m.limb(x, up ? cy - 2.6 : cy + 2, 5, x, up ? cy + 0.8 : cy - 1.4, 5.5, 0.85, '#dfe5ea', 0.8, 0.15);
  }
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

export function drawMeteor() {
  const m = new Model(24, 1);
  m.ball(12, 12, 4, 8, '#4a3a30', 0.2);
  for (const [x, y, r] of [[8, 9, 3.2], [15.5, 14, 3.4], [10, 16.5, 2.4], [16, 7.5, 2.6]]) {
    m.ball(x, y, 7.6, r, '#5e4a3c', 0.2);
  }
  for (const [x0, y0, x1, y1] of [[7, 12, 12, 10], [12, 10, 16, 12], [11, 14, 14, 18], [9, 7, 12, 10]]) {
    m.limb(x0, y0, 11.4, x1, y1, 11.4, 0.45, '#ff7a1f', 0.9);
  }
  for (const [x, y] of [[12, 10], [14, 13], [9, 12]]) m.dot(x, y, '#ffd84a');
  return m.paint();
}

export function drawCocoon(frame) {
  const m = new Model(32, 1.08), swell = frame ? 0.5 : 0;
  m.egg(16, 18, 3.5, 6.6 + swell, 10 + swell, 5.4 + swell, '#ece0ef', 0.3);
  for (let i = 0; i < 6; i++) {
    const y = 11 + i * 3, tilt = i % 2 ? 1 : -1;
    m.limb(9.6 - swell, y + tilt, 7.4, 22.4 + swell, y - tilt, 7.4, 0.45, '#c9b0d2');
  }
  m.egg(16, 8.6, 6.4, 3.6, 3.2, 3.4, '#c026d3', 0.5);
  m.ball(14.6, 7.6, 9.4, 1, '#fde047', 1);
  m.ball(17.4, 7.6, 9.4, 1, '#fde047', 1);
  m.limb(14.8, 5.8, 8.4, 13.6, 3.6, 8.4, 0.4, '#f5d0fe');
  m.limb(17.2, 5.8, 8.4, 18.4, 3.6, 8.4, 0.4, '#f5d0fe');
  for (const [x, y] of [[13, 20], [19, 16], [15, 24]]) m.dot(x, y, '#f5d0fe');
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

export function drawWall(stage) {
  const m = new Model(36, 1), broken = stage >= 2;
  m.egg(18, 28, 0, 15.5, 5.5, 2, '#5c564d');
  [[30.5, 2, 0], [26.5, 5, 1], [22.5, 8, 0]].forEach(([y, z, shift]) => {
    for (let x = 4 + shift * 3.5; x < 33; x += 7) {
      m.egg(Math.min(31.5, x + 3), y, z, 3.4, 1.9, 1.6, (x + y) % 3 < 1.5 ? WALL_FACE : '#8b8172', 0.1);
    }
  });
  for (const [x, y] of [[11, 12.5], [25, 12.5], [11, 17.5], [25, 17.5]]) {
    m.egg(x, y, 10, 7.6, 3.6, 1.4, broken ? '#a39885' : WALL_TOP, 0.1);
  }
  for (let k = 0; k <= 24; k++) m.dot(6 + k, 15, '#8f8574', 13);
  for (const x of [12, 24]) for (let y = 10; y <= 20; y++) m.dot(x + (y > 15 ? 2 : 0), y, '#8f8574', 13);
  const rim = [];
  for (let x = 5; x <= 31; x += 4.33) rim.push([x, 8.6], [x, 21.2]);
  for (let y = 12.8; y <= 17.5; y += 4.2) rim.push([4.6, y], [31.4, y]);
  rim.forEach(([x, y], k) => {
    if (broken && k % 3) return;
    m.egg(x, y, k % 2 ? 12 : 13.5, 2.1, 1.7, 2.6, WALL_EDGE, 0.2);
  });
  const cracks = [[[17, 11], [19, 13], [18, 15]], [[12, 23], [13, 25], [12, 27]], [[25, 27], [26, 29], [25, 31]],
    [[27, 17], [25, 19]]];
  for (const line of cracks.slice(0, stage * 2)) {
    for (let k = 0; k + 1 < line.length; k++) {
      const [x0, y0] = line[k], [x1, y1] = line[k + 1], steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let t = 0; t <= steps; t++) m.dot(x0 + (x1 - x0) * t / steps, y0 + (y1 - y0) * t / steps, '#2b2620');
    }
  }
  if (broken) for (const [x, y] of [[3, 32], [11, 33.5], [26, 33], [33, 31.5]]) m.egg(x, y, 1, 2, 1.4, 1.2, WALL_FACE);
  else for (const [x, y] of [[8, 13], [9, 13], [28, 18], [17, 20.5]]) m.dot(x, y, '#6f8a3e', 30);
  return m.paint();
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

export function drawHeartIcon() {
  const m = new Model(32, 1);
  m.ball(10.5, 11.5, 2, 7.2, '#e11d48', 0.5);
  m.ball(21.5, 11.5, 2, 7.2, '#e11d48', 0.5);
  m.limb(16, 16.5, 1.5, 16, 29, 0.5, 8.4, '#e11d48', 0.5, 0.8);
  m.ball(9.5, 9, 7, 2.2, '#fda4af', 0.9);
  return m.paint();
}
