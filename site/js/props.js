import { GOLD, METAL, Model, STEEL } from './models.js';

const BRASS = '#c99a2e';
const LAMPS = { strong: ['#ff3b3b', '#6b1414'], wide: ['#ffb020', '#6b4410'], stun: ['#9ff0ff', '#2c5c8a'] };

function around(count, turn, cx, cy, rx, ry, each) {
  for (let i = 0; i < count; i++) {
    const a = turn + i * Math.PI * 2 / count;
    each(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, a, i);
  }
}

const MINES = {
  strong(m, lit) {
    m.ball(11, 12, 0, 6.2, '#4d535e', 0.5);
    around(6, Math.PI / 6, 11, 12, 1, 0.86, (x, y, a) => {
      const ex = 11 + Math.cos(a) * 8.2, ey = 12 + Math.sin(a) * 7;
      m.limb(11 + (x - 11) * 4.8, 12 + (y - 12) * 4.8, 3, ex, ey, 3.4, 1.15, METAL, 0.5, 0.8);
      m.ball(ex, ey, 3.6, 1.2, BRASS, 0.7);
    });
    m.egg(11, 12.4, 1.5, 6.5, 2, 4.6, '#3a3f48', 0.4);
    m.ball(11, 9.4, 5.4, 2, BRASS, 0.8);
    m.ball(11, 9, 6.8, 1.4, LAMPS.strong[lit ? 0 : 1], 1);
  },
  wide(m, lit) {
    m.egg(11, 12, 0, 9, 7.6, 2.4, '#5f6136');
    around(16, 0, 11, 12, 8.2, 6.9, (x, y, a, i) => m.ball(x, y, 1.6, 0.95, i % 4 < 2 ? '#e0b43a' : '#2a2a20'));
    m.egg(11, 11.6, 1.8, 5.2, 4.4, 1.4, '#8a8752');
    around(3, -Math.PI / 2, 11, 11.6, 3.4, 2.8, (x, y) => m.ball(x, y, 3, 0.8, STEEL, 0.6));
    m.egg(11, 11.6, 3, 1.6, 1.4, 0.8, LAMPS.wide[lit ? 0 : 1], 1);
  },
  stun(m, lit) {
    m.egg(11, 16.5, 0, 6.6, 3.8, 2, '#2d3a55');
    around(4, 0, 11, 16.5, 5.2, 2.9, (x, y) => m.ball(x, y, 1.6, 0.8, METAL, 0.5));
    m.limb(11, 16, 2, 11, 8.5, 5, 1.5, STEEL, 0.4);
    for (let i = 0; i < 4; i++) m.egg(11, 14.6 - i * 1.7, 2.6 + i * 0.8, 2.6, 0.9, 1.2, '#c87a3c', 0.6);
    m.ball(11, 6.4, 5.6, 3.2, LAMPS.stun[lit ? 0 : 1], 1);
    if (lit) for (const [x, y] of [[6.5, 4], [15.5, 5], [7.5, 9], [14.5, 2.5]]) m.dot(x, y, '#ffffff');
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
