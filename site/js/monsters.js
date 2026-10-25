import { GOLD, METAL, Model, STEEL, WOOD, legs } from './models.js';

const BONE = '#ece6d6';
const BONE_DARK = '#cfc6b0';

function walker(m, f, o) {
  const c = m.w / 2, s = o.s || 1, y = c + (o.dy || 0), step = f ? 1 : -1;
  if (!o.noLegs) legs(m, c, y + 8 * s, o.legs, f, 3.4 * s, 2.5 * s, 3.2 * s);
  if (o.back) o.back(c, y, s, step);
  m.egg(c, y + 3 * s, 4 * s, (o.wide || 7.6) * s, 5.8 * s, 4.4 * s, o.body, o.gloss || 0);
  if (o.chest) o.chest(c, y, s, step);
  const reach = o.reach === undefined ? 9 : o.reach, spread = o.spread === undefined ? 6.6 : o.spread;
  const sway = o.sway === undefined ? 1.2 : o.sway;
  const hands = [[c - spread * s, y - reach * s + step * sway * s], [c + spread * s, y - reach * s - step * sway * s]];
  if (o.hands) o.hands(hands, c, y, s);
  if (!o.noArms) {
    [-1, 1].forEach((side, i) => {
      m.limb(c + side * 6.6 * s, y + s, 7 * s, hands[i][0], hands[i][1], 8 * s, (o.arm || 2.2) * s, o.skin, 0,
        (o.wrist || 2) * s);
      m.ball(c + side * 6.6 * s, y + 1.4 * s, 8 * s, (o.shoulder || 2.9) * s, o.shoulderColor || o.body);
      m.ball(hands[i][0], hands[i][1], 8.6 * s, (o.hand || 2.2) * s, o.handColor || o.skin);
    });
  }
  if (o.held) o.held(hands, c, y, s, step);
  if (!o.noHead) m.ball(c, y - 2 * s, 10 * s, (o.head || 4.7) * s, o.headColor || o.skin, o.headGloss || 0);
  if (o.face) o.face(c, y, s, step);
}

function chain(m, x0, y0, x1, y1, z, links) {
  for (let k = 0; k <= links; k++) {
    const t = k / links, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
    m.egg(x, y, z, k % 2 ? 0.9 : 1.3, k % 2 ? 1.3 : 0.9, 0.6, k % 2 ? '#8b939c' : '#b8c0c8', 0.6);
  }
}

function butcher(m, f, armed) {
  walker(m, f, {
    s: 1.5, legs: '#57534e', body: '#f2c2b0', skin: '#f2b8a2', shoulderColor: '#e8a690', headColor: '#f2b8a2',
    wide: 9.6, reach: 5.6, spread: 7.4, sway: 0.9,
    chest: (c, y, s) => {
      m.egg(c, y + 4 * s, 16, 6.4, 5.4, 1.2, '#f5f5f4');
      for (const [dx, dy] of [[-3, 2], [2, 5], [4, 1], [-1, 7]]) m.dot(c + dx * s, y + dy * s, '#b91c1c', 40);
    },
    held: (hands) => {
      const [lx, ly] = hands[0], [rx, ry] = hands[1];
      m.limb(lx, ly + 1.5, 15, lx - 1, ly - 2.5, 15, 0.9, WOOD);
      m.egg(lx - 3.6, ly - 3, 16, 3.2, 3.6, 0.9, '#d4dae1', 1);
      m.dot(lx - 4.4, ly - 4.6, '#b91c1c', 60);
      if (!armed) {
        chain(m, rx, ry, rx + 1.5, ry - 3, 16, 3);
        return;
      }
      chain(m, rx, ry, rx + 3, ry + 1.5, 16, 3);
      m.limb(rx + 3.4, ry + 2, 16, rx + 3.4, ry - 3.4, 16.5, 0.8, '#9aa3ad', 0.7);
      m.ball(rx + 3.4, ry + 2.4, 16.5, 1, '#cbd2d9', 0.8);
      for (let k = 0; k <= 5; k++) {
        const a = Math.PI * (0.05 + k * 0.19), hx = rx + 3.4 + Math.cos(a) * 2.6, hy = ry - 3.4 - Math.sin(a) * 2.6;
        m.ball(hx, hy, 17, 0.9, k === 5 ? '#e5e9ee' : '#9aa3ad', 0.8);
      }
      m.limb(rx + 0.8, ry - 4.2, 17, rx + 1.6, ry - 2.6, 17, 0.55, '#e5e9ee', 0.8, 0.2);
    },
    face: (c, y) => {
      m.dot(c - 2.6, y - 7, '#1c1917', 60);
      m.dot(c + 2.6, y - 7, '#1c1917', 60);
      m.dot(c, y - 4, '#d97757', 60);
    },
  });
}

function beast(m, f, o) {
  const c = m.w / 2, s = o.s || 1, y = c + (o.dy || 0), step = f ? 1.6 : -1.6;
  if (o.tail) m.limb(c, y + 8 * s, 4 * s, c + step * s, y + 14 * s, 3 * s, (o.tail || 1.4) * s, o.tailColor || o.fur, 0,
    0.6 * s);
  [[-1, -5, 1], [1, -5, -1], [-1, 5, -1], [1, 5, 1]].forEach(([side, ly, phase]) => {
    const fy = y + ly * s + phase * step * 0.8 * s;
    const leg = (o.leg || 1.7) * s;
    m.limb(c + side * 4 * s, y + ly * s, 3 * s, c + side * 5.6 * s, fy, 1 * s, leg, o.legColor || o.dark);
  });
  m.egg(c, y + s, 5 * s, (o.wide || 6) * s, 9.2 * s, 4.8 * s, o.fur);
  if (o.belly) m.egg(c, y, 9.2 * s, 2.6 * s, 6 * s, 1.2 * s, o.belly);
  if (o.back) o.back(c, y, s, step);
  m.ball(c, y - 8 * s, 9 * s, (o.head || 4.4) * s, o.headColor || o.fur);
  m.egg(c, y - 12 * s, 8.5 * s, 2.4 * s, 2.8 * s, 2.2 * s, o.snout || o.belly || o.fur);
  m.ball(c, y - 14.2 * s, 10 * s, 1.1 * s, '#1c1917', 0.8);
  if (o.ears !== false) {
    m.egg(c - 4.4 * s, y - 7.4 * s, 10 * s, 1.8 * s, 2.6 * s, 1.4 * s, o.ear || o.dark);
    m.egg(c + 4.4 * s, y - 7.4 * s, 10 * s, 1.8 * s, 2.6 * s, 1.4 * s, o.ear || o.dark);
  }
  m.dot(c - 2 * s, y - 10 * s, o.eye || '#1c1917', 40);
  m.dot(c + 2 * s, y - 10 * s, o.eye || '#1c1917', 40);
  if (o.face) o.face(c, y, s, step);
}

function wings(m, f, o) {
  const c = m.w / 2, s = o.s || 1, y = c + (o.dy || 0), up = f ? -2.5 : 1.5;
  [-1, 1].forEach((side) => {
    const sx = c + side * 3 * s, sy = y, ex = c + side * 7.5 * s, ey = y + (up - 1.6) * s;
    const hx = c + side * 11.5 * s, hy = y + (up - 1) * s;
    if (o.feather) {
      for (let i = 0; i < 7; i++) {
        const t = i / 6, bx = hx + (sx - hx) * t * 0.9, by = hy + (sy - hy) * t * 0.9;
        const a = 0.15 + t * 1.25, len = (7.2 - t * 3.2) * s;
        m.limb(bx, by, 2.4 + t, bx + side * Math.cos(a) * len, by + Math.sin(a) * len, 2, 1.45 * s,
          i % 2 ? o.wing : o.tip || o.wing, 0, 0.3 * s);
      }
      m.limb(sx, sy, 4.4, ex, ey, 4.6, 1.6 * s, o.wing);
      m.limb(ex, ey, 4.6, hx, hy, 4.2, 1.3 * s, o.wing, 0, 0.7 * s);
      for (let i = 0; i < 5; i++) {
        const t = (i + 0.5) / 5, x = sx + (hx - sx) * t, yy = sy + (hy - sy) * t + 1.2 * s;
        m.egg(x, yy, 4.8, 1.3 * s, 1.6 * s, 0.6 * s, o.light || o.tip || o.wing);
      }
      return;
    }
    const tips = [[hx + side * 4.5 * s, hy - 2.2 * s], [hx + side * 3.4 * s, hy + 4.2 * s],
      [hx + side * 0.2 * s, hy + 7.4 * s], [sx + side * 0.6 * s, sy + 5 * s]];
    for (let k = 0; k < tips.length - 1; k++) {
      const [px, py] = tips[k], [qx, qy] = tips[k + 1];
      for (let j = 0; j <= 6; j++) {
        const u = j / 6, pull = 0.3 * Math.sin(Math.PI * u), x = px + (qx - px) * u, yy = py + (qy - py) * u;
        m.limb(hx, hy, 2.6, x + (hx - x) * pull, yy + (hy - yy) * pull, 2.4, 1.1 * s, k % 2 ? o.wing : o.tip || o.wing,
          0, 0.7 * s);
      }
    }
    for (let j = 0; j <= 4; j++) {
      const u = j / 4, x = sx + (hx - sx) * u, yy = sy + (hy - sy) * u;
      m.limb(x, yy, 2.6, tips[3][0] + (tips[2][0] - tips[3][0]) * u, tips[3][1] + (tips[2][1] - tips[3][1]) * u, 2.4,
        1.1 * s, o.wing, 0, 0.8 * s);
    }
    const bone = o.bones || o.tip || o.wing;
    m.limb(sx, sy, 4, ex, ey, 4.4, 0.9 * s, bone);
    m.limb(ex, ey, 4.4, hx, hy, 4.2, 0.8 * s, bone);
    for (const [tx, ty] of tips.slice(0, 3)) m.limb(hx, hy, 4.2, tx, ty, 3.4, 0.55 * s, bone, 0, 0.25 * s);
    m.ball(hx, hy, 4.6, 0.9 * s, o.claw || '#e7e2cf');
  });
}

function blob(m, f, o) {
  const c = m.w / 2, s = o.s || 1, r = o.r * s, squash = f ? 1.08 : 1;
  m.egg(c, c + 2 * s, 4 * s, r * squash, r / squash, r * 0.8, o.color, 0.8);
  m.egg(c - r * 0.45, c - r * 0.45, 4 * s + r * 0.6, r * 0.22, r * 0.14, r * 0.1, o.shine || '#ffffff', 1);
  if (o.eyes !== false) {
    for (const side of [-1, 1]) {
      m.egg(c + side * r * 0.32, c - r * 0.02, 4 * s + r * 0.78, r * 0.17, r * 0.22, r * 0.1, '#1c1917', 0.4);
      m.dot(c + side * r * 0.32 - 0.5, c - r * 0.12, '#ffffff', 99);
    }
  }
  if (o.top) o.top(c, s);
}

function spikes(m, c, cy, z, r, count, color, len, spin = 0) {
  for (let i = 0; i < count; i++) {
    const a = spin + i * Math.PI * 2 / count;
    m.limb(c + Math.cos(a) * r * 0.6, cy + Math.sin(a) * r * 0.6, z, c + Math.cos(a) * (r + len),
      cy + Math.sin(a) * (r + len), z - 1, 1.3, color, 0.4, 0.3);
  }
}

function spider(m, f, o) {
  const c = m.w / 2, s = o.s || 1, step = f ? 1 : -1;
  [-1, 1].forEach((side) => {
    [-6, -2, 2, 6].forEach((ly, i) => {
      const knee = [c + side * 7 * s, c + ly * s - 1 * s], foot = [c + side * 11 * s, c + ly * 1.5 * s
        + (i % 2 ? step : -step) * s];
      m.limb(c + side * 2 * s, c + ly * 0.4 * s, 5 * s, knee[0], knee[1], 7 * s, 0.9 * s, o.leg);
      m.limb(knee[0], knee[1], 7 * s, foot[0], foot[1], 2 * s, 0.8 * s, o.leg, 0, 0.5 * s);
    });
  });
  m.egg(c, c + 5 * s, 6 * s, 5.6 * s, 6.4 * s, 5 * s, o.body, 0.5);
  m.egg(c, c - 3 * s, 7 * s, 3.8 * s, 3.4 * s, 3.4 * s, o.head);
  if (o.mark) m.egg(c, c + 5 * s, 11 * s, 1.6 * s, 2.6 * s, 0.6 * s, o.mark);
  for (const dx of [-1.6, -0.6, 0.6, 1.6]) m.dot(c + dx * s - 0.5, c - 5.4 * s, o.eye || '#f87171', 60);
}

const GOOS = {
  slime1: { r: 6.2, color: '#4ade80' },
  slime2: { r: 9, color: '#34c76e' },
  slime3: { r: 11.6, color: '#22a95c' },
  hopper: { r: 7.6, color: '#a3e635', shine: '#f7fee7' },
  wingslime: { r: 6.8, color: '#2dd4bf', shine: '#ccfbf1' },
  magmaslime: { r: 10.4, color: '#ea580c', shine: '#fed7aa' },
  frostslime: { r: 8.6, color: '#7dd3fc', shine: '#f0f9ff' },
  stormslime: { r: 7.8, color: '#facc15', shine: '#fef9c3' },
  sludge: { r: 9.6, color: '#65a30d', shine: '#d9f99d' },
  slimeking: { r: 13, color: '#22c55e' },
  slimemother: { r: 18.5, color: '#15803d', shine: '#dcfce7' },
  slimegiant: { r: 19.5, color: '#0f766e', shine: '#ccfbf1' },
};

const MOBS = {
  zombie: [30, (m, f) => walker(m, f, {
    legs: '#3c4250', body: '#6b4f8a', skin: '#8fb35e', handColor: '#7aa04c', shoulderColor: '#5d4378', reach: 11,
    spread: 6, chest: (c, y) => {
      m.ball(c - 3.8, y + 5.3, 7, 1.9, '#8fb35e');
      for (let i = 0; i < 3; i++) {
        m.limb(c - 5.4, y + 4 + i * 1.3, 8.6, c - 2.6, y + 4.3 + i * 1.3, 8.6, 0.4, '#e7e2cf');
      }
      m.ball(c + 3.8, y + 1.2, 7.4, 1.6, '#8fb35e');
      for (const [x0, y0, x1, y1] of [[c + 1, y + 7, c + 5, y + 6], [c - 1, y - 0.5, c + 1.5, y + 1]]) {
        m.limb(x0, y0, 8.4, x1, y1, 8.4, 0.35, '#3b2a4a');
      }
      for (const [dx, dy] of [[-2, 6], [3, 4], [0, 2], [5, 7]]) m.dot(c + dx, y + dy, '#9b2226', 30);
      m.dot(c + 2, y + 8, '#4c3566', 40);
      m.dot(c - 4, y + 8.6, '#4c3566', 40);
    },
    held: (hands) => {
      for (const [x, y] of hands) {
        m.dot(x - 1, y - 2.6, '#e7e2cf', 40);
        m.dot(x + 1, y - 2.6, '#e7e2cf', 40);
        m.dot(x, y + 1.6, '#5d7a3c', 40);
      }
    },
    face: (c, y) => {
      m.ball(c - 1.4, y - 0.2, 13.6, 2.1, '#3a2b20');
      m.ball(c + 1.8, y + 0.6, 13.4, 1.7, '#3a2b20');
      m.limb(c + 2.2, y - 6.6, 14.6, c + 3.4, y - 3.4, 14.6, 0.3, '#3b2a20');
      for (const k of [0, 1, 2]) m.dot(c + 2.3 + k * 0.5, y - 5.8 + k * 1.1, '#e7e2cf', 60);
      m.dot(c - 2, y - 6, '#f8f6a0', 40);
      m.dot(c + 2, y - 6, '#f8f6a0', 40);
      m.dot(c - 0.6, y - 3.4, '#5d7a3c', 40);
    },
  })],
  skeleton: [30, (m, f) => walker(m, f, {
    legs: BONE_DARK, body: '#2b2633', skin: BONE, wide: 5.6, arm: 1.2, wrist: 1.2, shoulder: 2.3, hand: 1.5,
    shoulderColor: BONE, headColor: BONE, head: 4.4, spread: 6, reach: 7,
    chest: (c, y) => {
      for (let i = 0; i < 4; i++) m.limb(c - 5, y + 0.5 + i * 2.2, 6, c + 5, y + 0.5 + i * 2.2, 6, 0.9, BONE);
      m.limb(c, y - 1, 7, c, y + 9, 7, 1.1, BONE_DARK);
    },
    held: (hands) => {
      const [x, y] = hands[1];
      m.limb(x, y + 1.5, 9.5, x, y - 9, 9.5, 0.9, METAL, 0.6);
      m.limb(x - 1.8, y, 9.6, x + 1.8, y, 9.6, 0.8, '#7a4a22');
    },
    face: (c, y) => {
      for (const [dx, dy] of [[-2, -5], [2, -5], [-2, -4], [2, -4]]) m.dot(c + dx, y + dy, '#2b2633', 40);
      m.dot(c, y - 2, '#b8ae96', 40);
    },
  })],
  imp: [30, (m, f) => {
    wings(m, f, { wing: '#6b1414', tip: '#4c0e0e', s: 0.85, dy: 1, bones: '#3b0a0a' });
    walker(m, f, {
      s: 0.82, dy: 1, legs: '#5b1414', body: '#c8352a', skin: '#c8352a', reach: 7, head: 4.6,
      back: (c, y, s, step) => {
        m.limb(c, y + 8 * s, 3, c + step * 2, y + 14 * s, 2, 0.8, '#7f1d1d', 0, 0.5);
        m.ball(c + step * 2, y + 14.5 * s, 2.5, 1.2, '#7f1d1d');
      },
      face: (c, y, s) => {
        m.limb(c - 2.6 * s, y - 4 * s, 12, c - 4.6 * s, y - 8 * s, 13, 1, '#f1e4c8', 0, 0.35);
        m.limb(c + 2.6 * s, y - 4 * s, 12, c + 4.6 * s, y - 8 * s, 13, 1, '#f1e4c8', 0, 0.35);
        m.dot(c - 2, y - 5, '#ffd84a', 40);
        m.dot(c + 2, y - 5, '#ffd84a', 40);
      },
    });
  }],
  dog: [30, (m, f) => beast(m, f, {
    fur: '#b07a48', dark: '#6e4a2e', belly: '#e3c08f', tail: 1.3,
    face: (c, y) => {
      m.dot(c - 2, y - 11, '#fde68a', 40);
      m.dot(c + 2, y - 11, '#fde68a', 40);
    },
  })],
  hellhound: [30, (m, f) => beast(m, f, {
    fur: '#2f2224', dark: '#1a1213', belly: '#4a2a22', snout: '#3a2a2a', tail: 1.3, tailColor: '#ff7a1f',
    eye: '#ff4d1f', ear: '#1a1213',
    back: (c, y) => {
      for (let i = 0; i < 5; i++) {
        m.ball(c + (i % 2 ? 1 : -1), y - 5 + i * 3, 10.5, 1.5, i % 2 ? '#ff7a1f' : '#ffd84a', 0.6);
      }
    },
  })],
  crow: [30, (m, f) => {
    wings(m, f, { wing: '#25212b', tip: '#16131b', light: '#3a3442', s: 0.9, feather: true });
    const c = 15;
    m.limb(c, c + 4, 4, c, c + 11, 3, 2.2, '#1f1b24', 0, 0.8);
    m.egg(c, c + 1, 6, 3.6, 6, 3.6, '#2b2633');
    m.ball(c, c - 5, 8, 3.1, '#2b2633');
    m.limb(c, c - 7.6, 8, c, c - 11, 8, 1.2, '#f59e0b', 0.5, 0.3);
    m.dot(c - 2, c - 6, '#e5e7eb', 40);
    m.dot(c + 2, c - 6, '#e5e7eb', 40);
  }],
  bat: [30, (m, f) => {
    wings(m, f, { wing: '#6d3a8f', tip: '#4c1d6b', s: 0.75, bones: '#2e1440' });
    const c = 15;
    m.egg(c, c + 1, 5, 3.2, 4.2, 3, '#4c2a63');
    m.ball(c, c - 3.4, 7, 2.6, '#5b3474');
    m.egg(c - 2, c - 6, 7, 1, 1.8, 1, '#5b3474');
    m.egg(c + 2, c - 6, 7, 1, 1.8, 1, '#5b3474');
    m.dot(c - 1, c - 4, '#f87171', 40);
    m.dot(c + 1, c - 4, '#f87171', 40);
  }],
  rat: [30, (m, f) => beast(m, f, {
    s: 0.6, fur: '#8e8e9a', dark: '#5f5f6b', belly: '#c7c7cf', ear: '#f9a8d4', tail: 0.9, tailColor: '#f9a8d4',
    eye: '#1c1917', dy: 2,
  })],
  brute: [30, (m, f) => walker(m, f, {
    s: 1.08, legs: '#4a3a2a', body: '#6f8f4f', skin: '#7fa05a', arm: 2.9, wrist: 2.6, hand: 3.1, shoulder: 3.8,
    shoulderColor: '#5b7a3e', head: 3.6, reach: 8, spread: 8, wide: 8.6,
    chest: (c, y) => m.limb(c - 7, y + 6, 8, c + 7, y + 6, 8, 1, '#6b4423'),
    face: (c, y) => {
      m.dot(c - 1.5, y - 4.6, '#fde047', 40);
      m.dot(c + 1.5, y - 4.6, '#fde047', 40);
      m.dot(c - 1, y - 2, '#f5f5f4', 40);
      m.dot(c + 1, y - 2, '#f5f5f4', 40);
    },
  })],
  demon: [30, (m, f) => {
    wings(m, f, { wing: '#6b1414', tip: '#4c0e0e', s: 1.15, bones: '#3b0a0a' });
    walker(m, f, {
      legs: '#5b1414', body: '#c8352a', skin: '#c8352a', reach: 8, head: 4.3, sway: 0.6,
      back: (c, y, s, step) => {
        m.limb(c, y + 8, 3, c + step, y + 13.4, 2, 1, '#7f1d1d', 0, 0.5);
        m.limb(c + step - 1.2, y + 13.4, 2.4, c + step + 1.2, y + 13.4, 2.4, 0.7, '#450a0a');
        m.limb(c + step, y + 13, 2.4, c + step, y + 15.4, 2.4, 0.8, '#450a0a', 0, 0.2);
      },
      chest: (c, y) => {
        m.egg(c - 2.6, y + 1.4, 8.8, 2.4, 1.8, 0.7, '#d9473a');
        m.egg(c + 2.6, y + 1.4, 8.8, 2.4, 1.8, 0.7, '#d9473a');
        for (const dy of [4, 5.8, 7.6]) {
          for (const dx of [-1.1, 1.1]) m.egg(c + dx, y + dy, 8.6, 0.9, 0.7, 0.4, '#b02a20');
        }
        m.dot(c, y + 2.6, '#ffb020', 70);
      },
      held: (hands) => {
        for (const [x, y] of hands) {
          m.dot(x - 1, y - 2.6, '#f5f5f4', 40);
          m.dot(x + 1, y - 2.6, '#f5f5f4', 40);
        }
      },
      face: (c, y) => {
        for (const side of [-1, 1]) {
          m.limb(c + side * 3, y - 3.5, 12, c + side * 5, y - 7.5, 13, 1.1, '#f1e4c8', 0, 0.4);
          m.limb(c + side * 3.6, y - 4.6, 12.3, c + side * 4, y - 5.4, 12.4, 0.5, '#8a6a3c');
        }
        m.egg(c, y - 5.6, 14.2, 2.2, 0.5, 0.3, '#7f1d1d');
        m.dot(c - 2, y - 5, '#ffd84a', 40);
        m.dot(c + 2, y - 5, '#ffd84a', 40);
      },
    });
  }],
  slime1: [30, (m, f) => blob(m, f, GOOS.slime1)],
  slime2: [30, (m, f) => blob(m, f, GOOS.slime2)],
  slime3: [30, (m, f) => blob(m, f, GOOS.slime3)],
  ember: [30, (m, f) => {
    const sway = f ? 1.4 : -1.4;
    m.limb(15, 14, 3, 15 + sway, 26.5, 2, 6.6, '#e8341a', 0.5, 0.5);
    for (const side of [-1, 1]) {
      m.limb(15 + side * 4, 17, 3, 15 + side * 7 - sway * 0.6, 24.5, 2, 2.4, '#e8341a', 0.5, 0.4);
    }
    m.ball(15, 13, 4, 7.2, '#e8341a', 0.6);
    m.limb(15, 13.5, 7, 15 + sway * 0.7, 24.5, 6, 5.2, '#ff7a1f', 0.8, 0.5);
    m.ball(15, 13, 7, 6, '#ff7a1f', 0.8);
    m.limb(15, 13.5, 10, 15 + sway * 0.4, 21.5, 9, 3.6, '#ffc93f', 1, 0.5);
    m.ball(15, 13, 10, 4.3, '#ffc93f', 1);
    m.ball(15, 12.6, 13, 2.6, '#fff6c8', 1);
    m.dot(13, 11, '#7c2d12', 60);
    m.dot(17, 11, '#7c2d12', 60);
  }],
  frostling: [30, (m, f) => {
    spikes(m, 15, 16, 7, 7.4, 6, '#a5f3fc', 5.6, f ? 0.5 : 0);
    m.ball(15, 16, 8, 7, '#38bdf8', 1);
    spikes(m, 15, 16, 13, 3.6, 4, '#e0fbff', 2.8, Math.PI / 4);
    m.dot(13, 14, '#0c4a6e', 60);
    m.dot(17, 14, '#0c4a6e', 60);
  }],
  stormling: [30, (m, f) => {
    for (const [x, y, r] of [[10, 17, 4.2], [20, 17, 4.2], [15, 12, 4.8], [15, 19, 5.2]]) m.ball(x, y, 6, r, '#64748b');
    m.ball(15, 16, 10, 4.4, '#7c8aa0', 0.4);
    const bolt = f ? [[13, 22], [15, 25], [13, 27]] : [[17, 22], [15, 25], [17, 27]];
    bolt.forEach(([x, y], i) => {
      if (i) m.limb(bolt[i - 1][0], bolt[i - 1][1], 12, x, y, 12, 0.6, '#facc15');
    });
    m.dot(13, 14, '#fef08a', 60);
    m.dot(17, 14, '#fef08a', 60);
  }],
  sludge: [30, (m, f) => blob(m, f, {
    ...GOOS.sludge,
    top: (c, s) => {
      for (const [dx, dy, r] of [[-5, 4, 1.6], [4, 5, 1.2], [5, -4, 1]]) m.ball(c + dx, c + dy, 10, r, '#a855f7', 0.8);
    },
  })],
  bonehound: [30, (m, f) => beast(m, f, {
    fur: BONE, dark: BONE_DARK, belly: '#2b2633', snout: BONE, tail: 1, eye: '#ef4444', ear: BONE_DARK,
    back: (c, y) => {
      for (let i = 0; i < 5; i++) m.limb(c - 3.4, y - 4 + i * 2.4, 10, c + 3.4, y - 4 + i * 2.4, 10, 0.6, BONE_DARK);
    },
  })],
  skelwarrior: [30, (m, f) => walker(m, f, {
    legs: BONE_DARK, body: '#4a4452', skin: BONE, wide: 6.4, arm: 1.3, wrist: 1.2, shoulder: 2.8, hand: 1.6,
    shoulderColor: METAL, headColor: METAL, headGloss: 0.6, head: 4.6, spread: 6.4, reach: 7,
    chest: (c, y) => {
      for (let i = 0; i < 3; i++) m.limb(c - 4, y + 1 + i * 2.4, 6, c + 4, y + 1 + i * 2.4, 6, 0.8, BONE);
    },
    held: (hands) => {
      const [lx, ly] = hands[0], [rx, ry] = hands[1];
      m.egg(lx - 0.5, ly + 1, 11, 4.2, 4.4, 1.2, '#78350f');
      m.ball(lx - 0.5, ly + 1, 12.3, 1.3, GOLD, 1);
      m.limb(rx, ry + 1.5, 9.5, rx, ry - 9, 9.5, 0.9, METAL, 0.6);
      m.limb(rx - 1.8, ry, 9.6, rx + 1.8, ry, 9.6, 0.8, '#7f1d1d');
    },
    face: (c, y) => {
      m.limb(c, y - 6.6, 15, c, y + 2, 15, 0.8, '#991b1b');
      m.dot(c - 2, y - 5, '#2b2633', 60);
      m.dot(c + 2, y - 5, '#2b2633', 60);
    },
  })],
  thief: [30, (m, f) => walker(m, f, {
    s: 0.9, legs: '#3b2418', body: '#5b3a29', skin: '#7cc242', shoulderColor: '#4a2f22', headColor: '#5b3a29',
    reach: 7.5, spread: 6.4,
    back: (c, y) => {
      m.egg(c, y + 10, 6, 4.6, 3.8, 4.4, '#c8a165');
      m.ball(c, y + 9, 11, 1.4, GOLD, 1);
    },
    held: (hands) => m.limb(hands[1][0], hands[1][1], 10, hands[1][0] + 0.5, hands[1][1] - 4, 10, 0.6, METAL, 0.6),
    face: (c, y, s) => {
      m.egg(c, y - 5.2 * s, 12, 2.4, 1.4, 1.4, '#7cc242');
      m.dot(c - 1.5, y - 5.4, '#ffef5a', 60);
      m.dot(c + 1.5, y - 5.4, '#ffef5a', 60);
    },
  })],
  mole: [30, (m, f) => {
    const c = 15, step = f ? 1.4 : -1.4;
    [-1, 1].forEach((side) => {
      m.limb(c + side * 5, c - 2, 5, c + side * 8, c - 6 + side * step * 0.5, 5, 2, '#5c3d26');
      for (const dx of [-1, 0, 1]) m.dot(c + side * 8.5 + dx, c - 8.4 + side * step * 0.5, '#f5f5f4', 30);
    });
    m.egg(c, c + 2, 5, 7.4, 9, 6, '#7a5233', 0.3);
    m.ball(c, c - 5, 9, 4.2, '#8b5e3c');
    m.ball(c, c - 9, 10, 1.6, '#f9a8d4', 0.8);
    m.dot(c - 2, c - 6, '#1c1917', 40);
    m.dot(c + 2, c - 6, '#1c1917', 40);
  }],
  ghost: [30, (m, f) => {
    const c = 15, wave = f ? 1 : -1;
    for (let i = 0; i < 4; i++) m.ball(c - 4.5 + i * 3, c + 9 + (i % 2 ? wave : -wave), 4, 2.2, '#bfdbfe');
    m.egg(c, c + 3, 6, 7, 8, 5.4, '#e0f2fe', 0.6);
    m.limb(c - 6, c, 6, c - 9, c - 5 + wave, 6, 1.6, '#dbeafe', 0, 0.8);
    m.limb(c + 6, c, 6, c + 9, c - 5 - wave, 6, 1.6, '#dbeafe', 0, 0.8);
    m.ball(c, c - 3, 9, 5, '#f0f9ff', 0.8);
    m.egg(c - 2, c - 4, 13, 1.1, 1.6, 0.8, '#1e3a8a');
    m.egg(c + 2, c - 4, 13, 1.1, 1.6, 0.8, '#1e3a8a');
  }],
  shieldbearer: [30, (m, f) => walker(m, f, {
    legs: '#334155', body: '#475569', skin: '#64748b', shoulderColor: '#94a3b8', headColor: '#94a3b8', headGloss: 0.6,
    head: 4.2, reach: 7, spread: 5,
    held: (hands, c, y) => {
      m.egg(c, y - 9, 14, 10, 2.8, 2.6, '#cbd5e1', 0.7);
      m.egg(c, y - 9.4, 16.2, 8.4, 1.8, 0.8, '#94a3b8', 0.6);
      m.ball(c, y - 9.6, 17, 1.5, GOLD, 1);
    },
  })],
  harpy: [30, (m, f) => {
    wings(m, f, { wing: '#a16207', tip: '#78350f', light: '#ca8a04', feather: true });
    const c = 15;
    m.limb(c - 2, c + 6, 4, c - 2, c + 10, 4, 0.9, '#fde047');
    m.limb(c + 2, c + 6, 4, c + 2, c + 10, 4, 0.9, '#fde047');
    m.egg(c, c + 2, 6, 3.6, 5.4, 3.6, '#d97706');
    m.egg(c, c - 3, 8, 3.6, 3, 2.8, '#fcd9b6');
    m.ball(c, c - 4.4, 10, 3, '#7c2d12');
    m.dot(c - 1.4, c - 6.4, '#1c1917', 40);
    m.dot(c + 1.4, c - 6.4, '#1c1917', 40);
  }],
  mirage: [30, (m, f) => {
    const c = 15, drift = f ? 1 : -1;
    for (let i = 0; i < 4; i++) m.ball(c + (i % 2 ? drift : -drift), c + 4 + i * 2.6, 3, 3 - i * 0.6, '#a78bfa', 0.5);
    m.egg(c, c, 6, 5.4, 6.4, 4.6, '#22d3ee', 1);
    m.egg(c, c - 1, 9.6, 3.2, 4, 2, '#e0e7ff', 1);
    m.dot(c - 1.6, c - 3, '#312e81', 60);
    m.dot(c + 1.6, c - 3, '#312e81', 60);
  }],
  goblin: [30, (m, f) => walker(m, f, {
    s: 0.82, dy: 1, legs: '#451a03', body: '#78350f', skin: '#7cc242', shoulderColor: '#5b2a0a', reach: 7.5,
    held: (hands) => m.limb(hands[1][0], hands[1][1], 10, hands[1][0], hands[1][1] - 4.4, 10, 0.6, METAL, 0.6),
    face: (c, y, s) => {
      m.egg(c - 5 * s, y - 2 * s, 9, 2.4, 1, 0.8, '#7cc242');
      m.egg(c + 5 * s, y - 2 * s, 9, 2.4, 1, 0.8, '#7cc242');
      m.dot(c - 1.5, y - 5.2, '#ffef5a', 60);
      m.dot(c + 1.5, y - 5.2, '#ffef5a', 60);
    },
  })],
  spiderling: [30, (m, f) => spider(m, f, { s: 0.78, leg: '#3b0764', body: '#7e22ce', head: '#9333ea' })],
  boar: [30, (m, f) => beast(m, f, {
    s: 0.98, dy: 1, fur: '#6f5a4c', dark: '#3b2a22', belly: '#8a7262', snout: '#e3a3a3', head: 4.8, wide: 6.6,
    ear: '#3b2a22', eye: '#1c1917', tail: 0.7, tailColor: '#3b2a22',
    back: (c, y, s) => {
      for (let i = 0; i < 6; i++) m.limb(c, y - 6 * s + i * 2.8 * s, 12 * s, c, y - 5 * s + i * 2.8 * s, 13.4 * s, 1,
        '#2a1d17', 0, 0.3);
    },
    face: (c, y, s) => {
      m.egg(c, y - 14.4 * s, 12.6 * s, 1.8 * s, 1.1 * s, 0.9 * s, '#f0b3b3');
      m.dot(c - 0.7, y - 14.6 * s, '#7f1d1d', 70);
      m.dot(c + 0.7, y - 14.6 * s, '#7f1d1d', 70);
      for (const side of [-1, 1]) m.limb(c + side * 2.2 * s, y - 12 * s, 13 * s, c + side * 3.8 * s, y - 15 * s,
        14 * s, 0.75, '#fffbeb', 0, 0.3);
    },
  })],
  bear: [30, (m, f) => beast(m, f, {
    s: 1.04, dy: 1.2, fur: '#6b4423', dark: '#3f2814', belly: '#8a5c36', snout: '#c9a27a', head: 5.4, wide: 7.6,
    leg: 2.4, ears: false, eye: '#1c1917',
    face: (c, y, s, step) => {
      for (const side of [-1, 1]) {
        m.ball(c + side * 4 * s, y - 6.4 * s, 13 * s, 1.7 * s, '#3f2814');
        m.ball(c + side * 4 * s, y - 6.6 * s, 13.8 * s, 0.9 * s, '#8a5c36');
        const foot = y - 5 * s - side * step * 0.8 * s;
        for (const dx of [-0.9, 0, 0.9]) m.limb(c + side * 5.6 * s + dx, foot, 2, c + side * 5.6 * s + dx * 1.3,
          foot - 1.6, 2, 0.35, '#f5f0e1', 0, 0.2);
      }
      m.ball(c, y - 13.6 * s, 12 * s, 1.1 * s, '#1c1917', 0.8);
    },
  })],
  orc: [30, (m, f) => walker(m, f, {
    s: 1, legs: '#3f2d1d', body: '#5c4a32', skin: '#6f9a4a', shoulderColor: '#3f3324', head: 4.4, reach: 8,
    chest: (c, y) => m.limb(c - 6, y + 2, 8, c + 6, y + 7, 8, 0.9, '#3f3324'),
    held: (hands) => {
      const [x, y] = hands[1];
      m.limb(x, y + 2, 9, x, y - 6, 9.5, 0.7, WOOD);
      m.egg(x + 1.8, y - 5.4, 10, 2.2, 1.6, 0.8, METAL, 0.7);
    },
    face: (c, y) => {
      for (const side of [-1, 1]) {
        m.limb(c + side * 1.4, y - 2.2, 12, c + side * 1.9, y - 4, 12.5, 0.5, '#f1e4c8', 0, 0.2);
      }
      m.dot(c - 1.6, y - 5, '#ef4444', 60);
      m.dot(c + 1.6, y - 5, '#ef4444', 60);
    },
  })],
  wolfrider: [30, (m, f) => beast(m, f, {
    s: 0.95, fur: '#6b7280', dark: '#374151', belly: '#9ca3af', snout: '#9ca3af', tail: 1.2, tailColor: '#4b5563',
    eye: '#fde047', ear: '#374151',
    back: (c, y) => {
      m.egg(c, y + 1, 10, 2.8, 3.2, 2, '#78350f');
      m.ball(c, y - 2.6, 12.5, 2.4, '#7cc242');
      m.egg(c - 2.6, y - 2.8, 12.5, 1.4, 0.6, 0.6, '#7cc242');
      m.egg(c + 2.6, y - 2.8, 12.5, 1.4, 0.6, 0.6, '#7cc242');
      m.limb(c + 2.4, y + 2, 12, c + 2.8, y - 9, 12, 0.4, WOOD);
      m.limb(c + 2.8, y - 9, 12.2, c + 2.8, y - 10.6, 12.2, 0.5, METAL, 0.6, 0.1);
    },
  })],
  troll: [30, (m, f) => walker(m, f, {
    s: 1.12, legs: '#334e4a', body: '#4f7a73', skin: '#6a9a92', shoulderColor: '#3f6560', arm: 2.7, wrist: 2.4,
    hand: 3, shoulder: 3.4, head: 3.8, reach: 9.5, spread: 8, wide: 8.4,
    chest: (c, y, s) => {
      for (const [dx, dy] of [[-3, 2], [3, 5], [0, 7]]) m.ball(c + dx * s, y + dy * s, 9, 1.3, '#65a30d');
    },
    held: (hands) => {
      const [x, y] = hands[0];
      m.limb(x, y + 3, 9, x - 1, y - 4.5, 10, 1.2, '#5b4636', 0, 1.7);
    },
    face: (c, y) => {
      m.egg(c, y - 6.4, 12, 1.6, 1.2, 1, '#7aa8a0');
      m.dot(c - 1.5, y - 4.6, '#fde047', 60);
      m.dot(c + 1.5, y - 4.6, '#fde047', 60);
    },
  })],
  wingslime: [30, (m, f) => {
    wings(m, f, { wing: '#99f6e4', tip: '#5eead4', light: '#ccfbf1', s: 0.9, dy: -2, feather: true });
    blob(m, f, GOOS.wingslime);
  }],
  magmaslime: [30, (m, f) => blob(m, f, {
    ...GOOS.magmaslime,
    top: (c) => {
      for (const [dx, dy, r] of [[-4, 4, 2.2], [4, 3, 1.8], [1, -5, 1.6], [-5, -2, 1.2]]) {
        m.ball(c + dx, c + dy, 11, r, '#431407', 0.2);
      }
      for (const [dx, dy] of [[-2, 2], [3, 0], [0, 6], [-4, -5]]) m.dot(c + dx, c + dy, '#fde047', 90);
    },
  })],
  frostslime: [30, (m, f) => blob(m, f, {
    ...GOOS.frostslime,
    top: (c) => spikes(m, c, c - 2, 11, 4.4, 5, '#e0f2fe', 2.6, f ? 0.3 : 0),
  })],
  stormslime: [30, (m, f) => blob(m, f, {
    ...GOOS.stormslime,
    top: (c) => {
      const bolt = f ? [[c - 3, c - 4], [c, c - 1], [c - 2, c + 1], [c + 2, c + 5]]
        : [[c + 3, c - 4], [c, c - 1], [c + 2, c + 1], [c - 2, c + 5]];
      bolt.forEach(([x, y], i) => {
        if (i) m.limb(bolt[i - 1][0], bolt[i - 1][1], 11, x, y, 11, 0.55, '#a16207');
      });
    },
  })],
  hand: [30, (m, f) => {
    const c = 15, step = f ? 1 : -1;
    m.egg(c, c + 7.4, 4, 3.6, 2.6, 2, '#6b4f8a');
    m.dot(c - 1.5, c + 8.4, '#9b2226', 40);
    m.egg(c, c + 2.6, 5, 4.6, 4.4, 2.4, '#8fb35e', 0.3);
    [-3.2, -1.1, 1.1, 3.2].forEach((dx, i) => {
      const lift = (i % 2 ? step : -step) * 0.9;
      m.limb(c + dx * 0.8, c - 0.6, 6, c + dx * 1.15, c - 6.4 + lift, 4, 1.1, '#8fb35e', 0, 0.8);
      m.dot(c + dx * 1.15, c - 7 + lift, '#e7e2cf', 50);
    });
    m.limb(c + 4, c + 3, 5, c + 7.4, c - 0.2 - step * 0.6, 4, 1.2, '#8fb35e', 0, 0.9);
    m.dot(c - 1, c + 1.6, '#9b2226', 35);
    m.dot(c + 2, c + 3.4, '#5d7a3c', 35);
  }],
  goblinkid: [30, (m, f) => walker(m, f, {
    s: 0.64, dy: 2, legs: '#451a03', body: '#a16207', skin: '#86d24a', shoulderColor: '#854d0e', reach: 7, head: 5.2,
    held: (hands) => {
      const [x, y] = hands[1];
      m.limb(x, y + 1, 8, x, y - 3.6, 8, 0.45, WOOD);
      m.limb(x, y - 3.6, 8.2, x - 1.2, y - 5.2, 8.2, 0.35, WOOD);
      m.limb(x, y - 3.6, 8.2, x + 1.2, y - 5.2, 8.2, 0.35, WOOD);
    },
    face: (c, y) => {
      m.egg(c - 4.6, y - 1.6, 8, 2, 0.8, 0.7, '#86d24a');
      m.egg(c + 4.6, y - 1.6, 8, 2, 0.8, 0.7, '#86d24a');
      m.dot(c - 1.2, y - 3.6, '#ffef5a', 60);
      m.dot(c + 1.2, y - 3.6, '#ffef5a', 60);
    },
  })],
  devilkin: [30, (m, f) => walker(m, f, {
    s: 0.62, dy: 2, legs: '#5b1414', body: '#e0453a', skin: '#e0453a', reach: 7, head: 5,
    back: (c, y, s, step) => {
      m.limb(c, y + 8 * s, 3, c + step * 1.6, y + 13 * s, 2, 0.6, '#7f1d1d', 0, 0.4);
      m.egg(c + step * 1.6, y + 13.6 * s, 2.4, 1.1, 1.3, 0.6, '#7f1d1d');
    },
    held: (hands) => {
      const [x, y] = hands[1];
      m.limb(x, y + 2, 8, x, y - 5, 8, 0.45, '#52525b', 0.4);
      for (const dx of [-1.2, 0, 1.2]) m.limb(x + dx, y - 5, 8.2, x + dx, y - 7.2, 8.2, 0.3, '#a1a1aa', 0.7, 0.15);
      m.limb(x - 1.2, y - 5, 8.2, x + 1.2, y - 5, 8.2, 0.3, '#a1a1aa', 0.7);
    },
    face: (c, y) => {
      m.limb(c - 1.8, y - 3.4, 8, c - 3, y - 6, 9, 0.7, '#f1e4c8', 0, 0.25);
      m.limb(c + 1.8, y - 3.4, 8, c + 3, y - 6, 9, 0.7, '#f1e4c8', 0, 0.25);
      m.dot(c - 1.2, y - 3.2, '#ffd84a', 60);
      m.dot(c + 1.2, y - 3.2, '#ffd84a', 60);
    },
  })],
  hopper: [30, (m, f) => {
    const c = 15, up = f ? -1.6 : 0.4;
    m.ball(c, c + 10.5, 2, 1.4, '#84cc16', 0.6);
    m.ball(c + (f ? 1 : -1), c + 13.2, 2, 0.9, '#84cc16', 0.6);
    m.egg(c, c + 1 + up, 4, f ? 7 : 7.8, f ? 8 : 7, 6, '#a3e635', 0.8);
    m.egg(c - 3.2, c - 2.4 + up, 9, 1.7, 1.1, 0.7, '#f7fee7', 1);
    for (const side of [-1, 1]) {
      m.egg(c + side * 2.4, c + up, 10, 1.3, 1.7, 0.7, '#1c1917', 0.4);
      m.dot(c + side * 2.4 - 0.5, c - 0.8 + up, '#ffffff', 99);
    }
    m.limb(c - 1.6, c + 3 + up, 10, c + 1.6, c + 3 + up, 10, 0.5, '#365314');
  }],
  spark: [30, (m, f) => {
    const c = 15, turn = f ? 0.6 : 0;
    for (let i = 0; i < 5; i++) {
      const a = turn + i * Math.PI * 2 / 5, bend = a + 0.45, tip = a - 0.15;
      m.limb(c + Math.cos(a) * 3.4, c + Math.sin(a) * 3.4, 7, c + Math.cos(bend) * 6, c + Math.sin(bend) * 6, 7, 0.55,
        '#facc15', 1, 0.4);
      m.limb(c + Math.cos(bend) * 6, c + Math.sin(bend) * 6, 7, c + Math.cos(tip) * 9, c + Math.sin(tip) * 9, 6, 0.45,
        '#fde047', 1, 0.2);
    }
    m.ball(c, c, 6, 4.4, '#eab308', 1);
    m.ball(c, c - 0.4, 8, 3, '#fde047', 1);
    m.ball(c - 0.8, c - 1.4, 10, 1.2, '#fefce8', 1);
    m.dot(c - 1.3, c - 0.4, '#713f12', 70);
    m.dot(c + 1.3, c - 0.4, '#713f12', 70);
  }],
  leader: [38, (m, f) => walker(m, f, {
    s: 1.22, legs: '#1f1d24', body: '#2f2d38', skin: '#3a3846', handColor: '#2a2833', shoulderColor: '#25232d',
    headColor: '#34323f', reach: 8.4, spread: 6.8, wide: 8.2,
    back: (c, y, s, step) => m.limb(c, y + 9 * s, 4, c + step * 1.5, y + 15 * s, 3, 1.8, '#25232d', 0, 0.7),
    held: (hands) => {
      for (const [x, y] of hands) for (const dx of [-1.4, 0, 1.4]) m.dot(x + dx, y - 3, '#e5e7eb', 40);
    },
    face: (c, y, s) => {
      m.egg(c, y - 7 * s, 11, 2.6, 3, 2.2, '#3a3846');
      m.egg(c - 4.6 * s, y - 3 * s, 12, 1.6, 2.6, 1.2, '#1f1d24');
      m.egg(c + 4.6 * s, y - 3 * s, 12, 1.6, 2.6, 1.2, '#1f1d24');
      m.dot(c - 2.4, y - 5.4, '#ef4444', 60);
      m.dot(c + 2.4, y - 5.4, '#ef4444', 60);
    },
  })],
  plague: [38, (m, f) => walker(m, f, {
    s: 1.2, legs: '#3f4a1f', body: '#4d7c0f', skin: '#6b8e23', shoulderColor: '#3f6212', headColor: '#365314',
    wide: 9, reach: 7.5, spread: 7.4,
    chest: (c, y, s) => {
      for (const [dx, dy, r] of [[-4, 2, 1.6], [3, 0, 1.3], [1, 6, 1.8], [-2, 8, 1.1], [5, 6, 1.2]]) {
        m.ball(c + dx * s, y + dy * s, 9.6 * s, r, '#d9f99d', 0.9);
      }
    },
    face: (c, y, s) => {
      m.egg(c, y - 5.6 * s, 13, 2.8, 1.8, 1.4, '#a3e635');
      m.dot(c - 1.6, y - 6, '#fef08a', 60);
      m.dot(c + 1.6, y - 6, '#fef08a', 60);
    },
  })],
  knight: [38, (m, f) => walker(m, f, {
    s: 1.2, legs: '#4b5563', body: '#9aa3ad', skin: '#cbd5e1', handColor: '#6b7280', shoulderColor: '#d4dae1',
    headColor: '#c4ccd6', headGloss: 0.8, gloss: 0.6, reach: 7, spread: 6.8,
    held: (hands) => {
      const [lx, ly] = hands[0], [rx, ry] = hands[1];
      m.egg(lx - 1, ly + 2, 12, 4.6, 5.2, 1.4, '#1e3a8a', 0.4);
      m.limb(lx - 1, ly - 2, 13.6, lx - 1, ly + 6, 13.6, 0.6, GOLD);
      m.limb(lx - 4, ly + 2, 13.6, lx + 2, ly + 2, 13.6, 0.6, GOLD);
      m.limb(rx, ry + 2, 12, rx, ry - 11, 12, 1, '#e5e7eb', 0.8);
      m.limb(rx - 2.4, ry, 12.2, rx + 2.4, ry, 12.2, 0.9, GOLD);
    },
    face: (c, y, s) => {
      m.limb(c, y - 7 * s, 18, c, y + 3 * s, 17, 1.2, '#dc2626');
      m.limb(c - 2.6, y - 6.2, 14.6, c + 2.6, y - 6.2, 14.6, 0.5, '#1f2937');
    },
  })],
  ratking: [38, (m, f) => beast(m, f, {
    s: 1.08, fur: '#8e8e9a', dark: '#5f5f6b', belly: '#c7c7cf', ear: '#f9a8d4', tail: 1.1, tailColor: '#f9a8d4',
    face: (c, y, s) => {
      for (const dx of [-2.6, 0, 2.6]) m.limb(c + dx, y - 6 * s, 16, c + dx, y - 9.4 * s, 16.5, 0.8, GOLD, 1, 0.5);
      m.egg(c, y - 6 * s, 15, 3.4, 1.2, 0.8, GOLD, 1);
      m.dot(c, y - 6.6 * s, '#ef4444', 80);
      m.dot(c - 2, y - 11, '#ef4444', 60);
      m.dot(c + 2, y - 11, '#ef4444', 60);
    },
  })],
  blazer: [38, (m, f) => {
    wings(m, f, { s: 1.1, wing: '#ff7a1f', tip: '#ffd84a', bones: '#b8320f', claw: '#fff7c2' });
    walker(m, f, {
      s: 1.05, legs: '#7c2d12', body: '#ea580c', skin: '#f97316', shoulderColor: '#c2410c', headColor: '#fb923c',
      reach: 8,
      face: (c, y, s) => {
        spikes(m, c, y - 2 * s, 12 * s, 4.2 * s, 5, '#ffd84a', 2.6, -Math.PI / 2);
        m.dot(c - 2, y - 5, '#fff7c2', 80);
        m.dot(c + 2, y - 5, '#fff7c2', 80);
      },
    });
  }],
  slimeking: [38, (m, f) => blob(m, f, {
    ...GOOS.slimeking,
    top: (c) => {
      for (const dx of [-3.6, 0, 3.6]) m.limb(c + dx, c - 8, 24, c + dx, c - 12, 25, 1, GOLD, 1, 0.5);
      m.egg(c, c - 8, 23, 5, 1.6, 1, GOLD, 1);
      m.dot(c, c - 9, '#ef4444', 80);
    },
  })],
  shade: [38, (m, f) => {
    const c = 19, wave = f ? 1 : -1;
    for (let i = 0; i < 5; i++) m.ball(c - 6 + i * 3, c + 11 + (i % 2 ? wave : -wave), 4, 2.4, '#2e1065');
    m.egg(c, c + 4, 6, 8.4, 9, 5, '#4c1d95');
    m.limb(c - 7, c, 7, c - 10, c - 6 + wave, 7, 2, '#3b0764', 0, 1);
    m.limb(c + 7, c, 7, c + 10, c - 6 - wave, 7, 2, '#3b0764', 0, 1);
    m.ball(c, c - 3, 11, 6, '#5b21b6');
    m.egg(c, c - 4.4, 14.5, 3.8, 3, 1.2, '#0b0618');
    m.dot(c - 1.6, c - 5, '#e9d5ff', 80);
    m.dot(c + 1.6, c - 5, '#e9d5ff', 80);
  }],
  blinker: [38, (m, f) => {
    const c = 19;
    spikes(m, c, c + 2, 6, 6, 6, '#0e7490', 6, f ? 0.3 : -0.3);
    m.egg(c, c + 2, 7, 6.6, 8, 6, '#22d3ee', 1);
    m.egg(c, c - 2, 12, 4, 4, 3, '#a5f3fc', 1);
    m.limb(c - 3, c - 6, 13, c - 5, c - 12, 13, 0.8, '#cffafe', 0, 0.3);
    m.limb(c + 3, c - 6, 13, c + 5, c - 12, 13, 0.8, '#cffafe', 0, 0.3);
    m.dot(c - 2, c - 4, '#082f49', 80);
    m.dot(c + 2, c - 4, '#082f49', 80);
  }],
  necro: [38, (m, f) => walker(m, f, {
    s: 1.15, legs: '#1a2e05', body: '#365314', skin: '#4d7c0f', handColor: '#d6d3d1', shoulderColor: '#1a2e05',
    headColor: '#3f6212', wide: 8.6, reach: 8,
    back: (c, y, s) => m.egg(c, y + 7 * s, 3, 9, 7, 3, '#1a2e05'),
    held: (hands) => {
      const [rx, ry] = hands[1];
      m.limb(rx, ry + 3, 10, rx, ry - 11, 10.5, 0.9, '#78350f');
      m.ball(rx, ry - 11.6, 12, 2.3, '#ebe5d6', 0.6);
      m.dot(rx - 1, ry - 12, '#a3e635', 80);
      m.dot(rx + 1, ry - 12, '#a3e635', 80);
    },
    face: (c, y, s) => {
      m.egg(c, y - 5 * s, 13, 3, 2, 1.2, '#ebe5d6');
      m.dot(c - 1.4, y - 5.6, '#a3e635', 80);
      m.dot(c + 1.4, y - 5.6, '#a3e635', 80);
    },
  })],
  witch: [38, (m, f) => walker(m, f, {
    s: 1.12, legs: '#3b0764', body: '#7e22ce', skin: '#86efac', shoulderColor: '#6b21a8', headColor: '#86efac',
    reach: 7.5,
    held: (hands) => {
      const [lx, ly] = hands[0];
      m.limb(lx, ly + 6, 9, lx, ly - 9, 9.5, 0.9, '#78350f');
      m.egg(lx, ly + 8, 9, 2.4, 3, 1.4, '#a16207');
    },
    face: (c, y, s) => {
      m.egg(c, y - 2 * s, 14, 8.6, 8, 1.2, '#27272a');
      m.ball(c, y - 2 * s, 16, 4, '#3f3f46', 0.4);
      m.limb(c, y - 2 * s, 18, c + 2, y - 4 * s, 22, 2, '#27272a', 0, 0.5);
      m.egg(c, y - 2 * s, 15.6, 4.6, 4.6, 0.6, '#a855f7');
    },
  })],
  berserk: [38, (m, f) => walker(m, f, {
    s: 1.2, legs: '#451a03', body: '#c2410c', skin: '#e9a06b', shoulderColor: '#7c2d12', headColor: '#fbbf24',
    reach: 9, spread: 7.6, wide: 8.4,
    chest: (c, y, s) => m.limb(c - 7, y + 7 * s, 9, c + 7, y - 1 * s, 9, 1, '#78350f'),
    held: (hands) => {
      for (const [x, y] of hands) {
        m.limb(x, y + 3, 10, x, y - 6, 10, 0.8, WOOD);
        m.egg(x + (x < 19 ? -2 : 2), y - 5, 11, 2.4, 2, 0.8, '#d4dae1', 0.8);
      }
    },
    face: (c, y, s) => {
      m.egg(c, y + 1 * s, 14, 3.4, 2.4, 1.4, '#f59e0b');
      m.dot(c - 2, y - 6, '#1c1917', 60);
      m.dot(c + 2, y - 6, '#1c1917', 60);
    },
  })],
  golem: [38, (m, f) => walker(m, f, {
    s: 1.25, legs: '#57534e', body: '#78716c', skin: '#8a837c', shoulderColor: '#a8a29e', headColor: '#8a837c',
    arm: 2.8, wrist: 2.6, hand: 3, shoulder: 3.6, reach: 7, spread: 8, head: 4, wide: 8.4,
    chest: (c, y, s) => {
      m.ball(c, y + 3 * s, 10 * s, 2.2, '#22d3ee', 1);
      m.dot(c - 4, y + 7, '#4d7c0f', 60);
      m.dot(c + 5, y + 1, '#4d7c0f', 60);
    },
    face: (c, y) => {
      m.dot(c - 2, y - 5, '#22d3ee', 80);
      m.dot(c + 2, y - 5, '#22d3ee', 80);
    },
  })],
  vampire: [38, (m, f) => {
    const c = 19, flap = f ? 1 : -1;
    m.egg(c, c + 4, 3, 13, 10 + flap, 2, '#991b1b');
    m.egg(c, c + 3.4, 4.6, 12, 9 + flap, 2, '#0c0a09');
    walker(m, f, {
      s: 1.05, legs: '#0c0a09', body: '#1c1917', skin: '#292524', handColor: '#e7e5e4', shoulderColor: '#0c0a09',
      headColor: '#e7e5e4', reach: 7, spread: 6,
      face: (cx, y) => {
        m.ball(cx, y - 1, 15, 3, '#1c1917');
        m.dot(cx - 1.8, y - 5, '#ef4444', 80);
        m.dot(cx + 1.8, y - 5, '#ef4444', 80);
      },
    });
  }],
  goblinshaman: [38, (m, f) => walker(m, f, {
    s: 1.05, legs: '#451a03', body: '#7c2d12', skin: '#65a30d', shoulderColor: '#5b2a0a', headColor: '#65a30d',
    reach: 8,
    held: (hands) => {
      const [lx, ly] = hands[0];
      m.limb(lx, ly + 4, 10, lx, ly - 10, 10.5, 0.9, '#78350f');
      m.ball(lx, ly - 11, 12, 2.2, '#f5f5f4', 0.6);
      m.dot(lx - 1, ly - 11.4, '#1c1917', 80);
      m.dot(lx + 1, ly - 11.4, '#1c1917', 80);
    },
    face: (c, y, s) => {
      for (const [x, yy, col] of [[-5, -3, '#ef4444'], [-3, -7, '#fde047'], [0, -8, '#22d3ee'], [3, -7, '#fde047'],
        [5, -3, '#ef4444']]) {
        m.limb(c, y - 2 * s, 14, c + x * s, y + yy * s, 14.5, 1, col);
      }
      m.dot(c - 1.6, y - 5, '#fde047', 80);
      m.dot(c + 1.6, y - 5, '#fde047', 80);
    },
  })],
  ogre: [38, (m, f) => walker(m, f, {
    s: 1.25, legs: '#4a6b3c', body: '#6b8e5a', skin: '#7a9d68', shoulderColor: '#5a7d4a', headColor: '#7a9d68',
    arm: 2.6, wrist: 2.4, hand: 2.8, shoulder: 3.4, reach: 7.5, spread: 7.6, wide: 8.4, head: 4.2,
    back: (c, y, s) => {
      m.egg(c, y + 8 * s, 6, 7, 4.6, 5, '#92400e');
      for (const dx of [-4, 0, 4]) {
        m.ball(c + dx, y + 8 * s, 12, 2, '#84cc16');
        m.dot(c + dx - 1, y + 7 * s, '#fde047', 80);
      }
    },
    face: (c, y) => {
      m.dot(c - 1.6, y - 5, '#1c1917', 60);
      m.dot(c + 1.6, y - 5, '#1c1917', 60);
      m.dot(c - 1.4, y - 2, '#f5f5f4', 60);
      m.dot(c + 1.4, y - 2, '#f5f5f4', 60);
    },
  })],
  mirrorknight: [38, (m, f) => walker(m, f, {
    s: 1.15, legs: '#2e1065', body: '#6d28d9', skin: '#94a3b8', shoulderColor: '#cbd5e1', headColor: '#cbd5e1',
    headGloss: 0.8, reach: 7, spread: 5,
    held: (hands, c, y, s) => {
      m.egg(c, y - 10 * s, 15, 6.4, 3.4, 1.6, '#94a3b8', 0.6);
      m.egg(c, y - 10 * s, 16.6, 5.2, 2.6, 0.6, '#e0f2fe', 1);
      m.dot(c - 2, y - 11 * s, '#ffffff', 80);
    },
  })],
  armadillo: [38, (m, f) => {
    const c = 19, step = f ? 1.4 : -1.4;
    [[-1, -4], [1, -4], [-1, 5], [1, 5]].forEach(([side, ly], i) => {
      m.limb(c + side * 6, c + ly, 3, c + side * 9, c + ly + (i % 2 ? step : -step), 2, 1.5, '#92400e');
    });
    m.limb(c, c + 9, 4, c + step, c + 15, 3, 1.4, '#92400e', 0, 0.6);
    m.egg(c, c + 1, 6, 8.4, 10, 6.4, '#d6a35c', 0.4);
    for (let i = 0; i < 5; i++) m.limb(c - 7.6 + Math.abs(i - 2), c - 6 + i * 3.4, 11.5, c + 7.6 - Math.abs(i - 2),
      c - 6 + i * 3.4, 11.5, 0.7, '#a16207');
    m.egg(c, c - 10, 7, 3, 3.6, 2.8, '#b45309');
    m.dot(c - 1.5, c - 11, '#1c1917', 60);
    m.dot(c + 1.5, c - 11, '#1c1917', 60);
  }],
  mimic: [38, (m, f) => {
    const c = 19, open = f ? 1.5 : 0;
    m.egg(c, c + 5, 4, 10, 6, 4, '#92400e', 0.2);
    m.limb(c - 10, c + 5, 8, c + 10, c + 5, 8, 0.9, GOLD, 0.6);
    m.egg(c, c - 1 - open, 9, 9.2, 3 + open, 2, '#7f1d1d');
    for (let i = 0; i < 7; i++) {
      m.limb(c - 8 + i * 2.7, c - 3.4 - open, 11, c - 8 + i * 2.7, c - 1.4 - open, 11, 0.7, '#f5f5f4', 0, 0.2);
      m.limb(c - 6.6 + i * 2.2, c + 1 + open, 11, c - 6.6 + i * 2.2, c - 0.6 + open, 11, 0.7, '#f5f5f4', 0, 0.2);
    }
    m.egg(c, c + open, 10.6, 3, 1.6, 0.8, '#dc2626');
    m.egg(c, c - 8 - open, 7, 10, 4.4, 4, '#a1520f', 0.2);
    m.limb(c - 10, c - 8 - open, 10, c + 10, c - 8 - open, 10, 0.9, GOLD, 0.6);
    m.ball(c - 4.5, c - 9 - open, 12, 1.4, '#fde047', 1);
    m.ball(c + 4.5, c - 9 - open, 12, 1.4, '#fde047', 1);
    m.dot(c - 4.5, c - 9 - open, '#1c1917', 90);
    m.dot(c + 4.5, c - 9 - open, '#1c1917', 90);
  }],
  butcher: [50, (m, f) => butcher(m, f, true)],
  butcherbare: [50, (m, f) => butcher(m, f, false)],
  crusher: [50, (m, f) => walker(m, f, {
    s: 1.6, legs: '#3f6212', body: '#4d7c0f', skin: '#65a30d', shoulderColor: '#3f6212', headColor: '#65a30d',
    arm: 2.6, wrist: 2.4, hand: 2.8, shoulder: 3.4, reach: 8, spread: 7.6, wide: 8.6,
    held: (hands) => {
      const [rx, ry] = hands[1];
      m.limb(rx, ry + 3, 14, rx, ry - 9, 15, 1.6, WOOD);
      m.ball(rx, ry - 11, 16, 3.6, '#57534e');
      spikes(m, rx, ry - 11, 17, 3.4, 6, '#d4dae1', 2);
    },
    face: (c, y, s) => {
      m.limb(c - 3 * s, y - 4 * s, 17, c - 6 * s, y - 9 * s, 18, 1.6, '#f1e4c8', 0, 0.5);
      m.limb(c + 3 * s, y - 4 * s, 17, c + 6 * s, y - 9 * s, 18, 1.6, '#f1e4c8', 0, 0.5);
      m.dot(c - 2.6, y - 7, '#fde047', 80);
      m.dot(c + 2.6, y - 7, '#fde047', 80);
    },
  })],
  mother: [50, (m, f) => beast(m, f, {
    s: 1.55, fur: '#7c7c88', dark: '#55555f', belly: '#b9b9c3', ear: '#f9a8d4', tail: 1.2, tailColor: '#f9a8d4',
    eye: '#ef4444', head: 4.6,
    back: (c, y, s) => {
      for (const [dx, dy] of [[-3, -2], [3, 0], [-2, 4], [2, 6]]) m.ball(c + dx * s, y + dy * s, 11 * s, 1.4 * s,
        '#f9a8d4');
    },
  })],
  warden: [50, (m, f) => walker(m, f, {
    s: 1.5, legs: '#334155', body: '#64748b', skin: '#94a3b8', shoulderColor: '#cbd5e1', headColor: '#cbd5e1',
    headGloss: 0.7, gloss: 0.5, reach: 7, spread: 7,
    held: (hands) => {
      const [lx, ly] = hands[0];
      m.egg(lx - 2, ly + 1, 16, 5, 7, 1.6, '#334155');
      m.limb(lx - 2, ly - 3, 18, lx - 2, ly + 5, 18, 0.8, GOLD);
      m.limb(lx - 4.6, ly - 1, 18, lx + 0.6, ly - 1, 18, 0.8, GOLD);
    },
    face: (c, y, s) => {
      m.limb(c, y - 7 * s, 22, c, y + 4 * s, 21, 1.6, '#7c3aed');
      m.dot(c - 2.4, y - 7, '#67e8f9', 80);
      m.dot(c + 2.4, y - 7, '#67e8f9', 80);
    },
  })],
  archdemon: [50, (m, f) => {
    wings(m, f, { s: 1.8, wing: '#7f1d1d', tip: '#450a0a', bones: '#2b0505' });
    walker(m, f, {
      s: 1.45, legs: '#450a0a', body: '#b91c1c', skin: '#dc2626', shoulderColor: '#991b1b', headColor: '#dc2626',
      reach: 8, spread: 7,
      back: (c, y, s, step) => {
        m.limb(c, y + 9 * s, 4, c + step, y + 17 * s, 3, 1.4, '#7f1d1d', 0, 0.6);
        m.limb(c + step - 2, y + 17 * s, 3.4, c + step + 2, y + 17 * s, 3.4, 1, '#450a0a');
        m.limb(c + step, y + 16.6 * s, 3.4, c + step, y + 20 * s, 3.4, 1.2, '#450a0a', 0, 0.2);
      },
      chest: (c, y, s) => {
        m.egg(c - 3.6 * s, y + 1.6 * s, 13, 3.4, 2.6, 1, '#e23a2f');
        m.egg(c + 3.6 * s, y + 1.6 * s, 13, 3.4, 2.6, 1, '#e23a2f');
        for (const dy of [4.4, 6.4, 8.4]) {
          for (const dx of [-1.6, 1.6]) m.egg(c + dx * s, y + dy * s, 12.6, 1.4, 1, 0.6, '#a11d1d');
        }
        m.ball(c, y + 2.4 * s, 14.4, 1.6, '#ff7a1f', 1);
        m.ball(c, y + 2.4 * s, 15.4, 0.8, '#fff3b0', 1);
      },
      hands: (hands, c, y, s) => {
        for (const side of [-1, 1]) {
          for (const k of [0, 1, 2]) m.limb(c + side * (7 + k) * s, y - 1 * s, 14, c + side * (8 + k) * s, y - 3.6 * s,
            15, 0.6, '#f1e4c8', 0, 0.2);
        }
      },
      face: (c, y, s) => {
        for (const side of [-1, 1]) {
          m.limb(c + side * 3 * s, y - 4 * s, 16, c + side * 6 * s, y - 10 * s, 17, 1.4, GOLD, 1, 0.4);
          for (const k of [0.35, 0.65]) {
            const x = c + side * (3 + 3 * k) * s, yy = y - (4 + 6 * k) * s;
            m.limb(x - 0.8, yy, 16.6, x + 0.8, yy, 16.6, 0.5, '#8a5a12');
          }
        }
        m.egg(c, y - 6.4 * s, 18.2, 2.8, 0.7, 0.4, '#7f1d1d');
        m.dot(c - 2.6, y - 7, '#ffd84a', 80);
        m.dot(c + 2.6, y - 7, '#ffd84a', 80);
      },
    });
  }],
  lich: [50, (m, f) => walker(m, f, {
    s: 1.45, legs: '#2e1065', body: '#6b21a8', skin: '#ebe5d6', handColor: '#ebe5d6', shoulderColor: '#4c1d95',
    headColor: '#ebe5d6', wide: 9, reach: 7.5, arm: 1.6, wrist: 1.3, hand: 1.7,
    back: (c, y, s) => m.egg(c, y + 7 * s, 3, 12, 9, 3, '#3b0764'),
    held: (hands) => {
      const [rx, ry] = hands[1];
      m.limb(rx, ry + 5, 14, rx, ry - 12, 15, 1, '#78350f');
      m.ball(rx, ry - 13.4, 17, 2.8, '#a3e635', 1);
    },
    face: (c, y, s) => {
      for (const dx of [-3, -1, 1, 3]) m.limb(c + dx * s, y - 4 * s, 18, c + dx * s, y - 8 * s, 19, 0.8, GOLD, 1, 0.5);
      m.egg(c, y - 3.6 * s, 17, 4.6, 1.4, 1, GOLD, 1);
      m.dot(c - 2.2, y - 6, '#a3e635', 90);
      m.dot(c + 2.2, y - 6, '#a3e635', 90);
    },
  })],
  worm: [50, (m, f) => {
    const c = 25, wave = f ? 1.6 : -1.6;
    for (let i = 7; i >= 0; i--) {
      const y = c - 10 + i * 4.4, x = c + Math.sin(i * 0.9) * wave, r = 8.2 - i * 0.55;
      m.ball(x, y, 6 + (8 - i) * 0.6, r, i % 2 ? '#c2410c' : '#b45309', 0.3);
    }
    m.egg(c, c - 12, 13, 7, 6, 3, '#7f1d1d');
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      m.limb(c + Math.cos(a) * 6, c - 12 + Math.sin(a) * 5.2, 15, c + Math.cos(a) * 3.4, c - 12 + Math.sin(a) * 2.8, 16,
        0.8, '#f5f5f4', 0, 0.2);
    }
    m.egg(c, c - 12, 15.6, 2.6, 2.2, 0.6, '#1c1917');
  }],
  dragon: [50, (m, f) => {
    wings(m, f, { s: 1.6, wing: '#991b1b', tip: '#7f1d1d', bones: '#450a0a' });
    const c = 25, sway = f ? 1.5 : -1.5;
    for (const [side, ly] of [[-1, -1], [1, -1], [-1, 7], [1, 7]]) {
      m.limb(c + side * 4, c + ly, 6, c + side * 8, c + ly + 2, 4, 1.4, '#991b1b', 0, 1);
      for (const k of [-0.8, 0, 0.8]) m.dot(c + side * 8.6 + k, c + ly + 3, '#fef3c7', 60);
    }
    m.limb(c, c + 8, 5, c + sway, c + 20, 3, 2.4, '#b91c1c', 0, 0.8);
    m.limb(c + sway - 2.4, c + 20, 3.6, c + sway + 2.4, c + 20, 3.6, 0.9, '#7f1d1d');
    m.limb(c + sway, c + 19.4, 3.6, c + sway, c + 23, 3.6, 1.1, '#7f1d1d', 0, 0.2);
    m.egg(c, c + 2, 8, 6.4, 9, 5.4, '#dc2626', 0.4);
    for (let row = 0; row < 7; row++) {
      const dy = -6 + row * 2.2, half = 6.4 * Math.sqrt(Math.max(0, 1 - (dy / 9) ** 2));
      for (let dx = -half + 1.2 + (row % 2) * 1.1; dx <= half - 1.2; dx += 2.2) {
        if (Math.abs(dx) < 2.2) continue;
        const z = 8 + 5.4 * Math.sqrt(Math.max(0, 1 - (dx / 6.4) ** 2 - (dy / 9) ** 2));
        m.egg(c + dx, c + 2 + dy, z - 0.3, 1.1, 0.9, 0.5, row % 2 ? '#b91c1c' : '#ef4444', 0.4);
      }
    }
    for (let i = 0; i < 7; i++) {
      const y = c - 5.5 + i * 2.3;
      m.limb(c, y, 14.2 - Math.abs(i - 2.5) * 0.25, c, y + 2, 13.4, 1.25, '#7f1d1d', 0, 0.12);
      m.dot(c, y, '#f87171', 70);
    }
    m.limb(c, c - 5, 10, c, c - 12, 11, 2.6, '#dc2626');
    for (const dy of [-6.5, -9, -11.5]) m.limb(c, c + dy, 13.3, c, c + dy - 0.8, 14.4, 0.6, '#7f1d1d', 0, 0.15);
    m.egg(c, c - 14, 12, 3.6, 4.4, 3, '#dc2626', 0.4);
    for (const side of [-1, 1]) {
      m.limb(c + side * 2.6, c - 15, 14, c + side * 4, c - 19, 14, 0.8, '#fef3c7', 0, 0.3);
      m.limb(c + side * 3, c - 13, 13.6, c + side * 4.6, c - 15.6, 13.6, 0.5, '#fde68a', 0, 0.2);
      m.dot(c + side * 0.8, c - 17.8, '#450a0a', 80);
    }
    m.dot(c - 1.6, c - 15, '#fde047', 90);
    m.dot(c + 1.6, c - 15, '#fde047', 90);
  }],
  slimemother: [50, (m, f) => {
    const c = 25, r = GOOS.slimemother.r;
    const top = (dx, dy) => 4 + r * 0.8 * Math.sqrt(Math.max(0, 1 - (dx * dx + dy * dy) / (r * r)));
    blob(m, f, GOOS.slimemother);
    for (const [dx, dy, size, color] of [[-8, 7, 3.4, '#4ade80'], [7.5, 8, 2.8, '#86efac'], [0, 13, 2.2, '#4ade80'],
      [10, -6, 2.4, '#86efac']]) {
      const z = top(dx, dy - 2) + size * 0.4, bob = f ? -0.5 : 0.5;
      m.ball(c + dx, c + dy + bob, z, size, color, 0.9);
      m.dot(c + dx - size * 0.35, c + dy - size * 0.25 + bob, '#14532d', 80);
      m.dot(c + dx + size * 0.35, c + dy - size * 0.25 + bob, '#14532d', 80);
    }
    for (const [dx, dy] of [[-11, -2], [-4, 4], [4, -11], [12, 3]]) m.ball(c + dx, c + dy, top(dx, dy - 2) + 0.6, 0.9,
      '#bbf7d0', 1);
  }],
  slimegiant: [50, (m, f) => blob(m, f, {
    ...GOOS.slimegiant,
    top: (c) => {
      m.egg(c, c + 7, 20, 7, 2.6, 1, '#042f2e');
      for (const dx of [-4.5, -1.5, 1.5, 4.5]) m.limb(c + dx, c + 5.6, 21, c + dx, c + 7.6, 21, 0.7, '#f0fdfa', 0, 0.2);
      for (const side of [-1, 1]) m.limb(c + side * 3, c - 3.6, 26, c + side * 8, c - 1.6, 26, 0.9, '#042f2e');
      for (const [dx, dy] of [[-12, 2], [10, 6], [6, -10], [-7, -11]]) m.ball(c + dx, c + dy, 16, 1.2, '#99f6e4', 1);
    },
  })],
  gatekeeper: [50, (m, f) => {
    const c = 25, spin = f ? 0.4 : 0;
    for (let i = 0; i < 10; i++) {
      const a = spin + i * Math.PI / 5;
      m.ball(c + Math.cos(a) * 13, c + 6 + Math.sin(a) * 9, 3, 2, i % 2 ? '#f97316' : '#7c2d12', 0.6);
    }
    m.egg(c, c + 6, 2, 10, 7, 1, '#1c0a05');
    walker(m, f, {
      s: 1.4, legs: '#3b0a0a', body: '#7f1d1d', skin: '#991b1b', shoulderColor: '#450a0a', headColor: '#991b1b',
      reach: 7.5, spread: 7,
      held: (hands) => {
        const [x, y] = hands[1];
        m.limb(x, y + 2, 15, x + 1, y - 9, 15, 0.9, '#a16207', 0.6);
        m.ball(x + 1, y - 10.5, 16, 2, GOLD, 1);
      },
      face: (c2, y, s) => {
        for (const side of [-1, 1]) m.limb(c2 + side * 3 * s, y - 4 * s, 16, c2 + side * 7 * s, y - 9 * s, 17, 1.3,
          '#1c1917', 0, 0.4);
        m.dot(c2 - 2.4, y - 7, '#fb923c', 90);
        m.dot(c2 + 2.4, y - 7, '#fb923c', 90);
      },
    });
  }],
  elemlord: [50, (m, f) => {
    const c = 25, turn = f ? Math.PI / 4 : 0;
    m.ball(c, c, 8, 8.5, '#e0f2fe', 0.9);
    m.ball(c, c - 1, 12, 5.4, '#ffffff', 1);
    m.dot(c - 2.2, c - 2, '#1e3a8a', 90);
    m.dot(c + 2.2, c - 2, '#1e3a8a', 90);
    [['#f97316', '#fde047'], ['#38bdf8', '#e0f2fe'], ['#facc15', '#fffbeb'], ['#65a30d', '#d9f99d']]
      .forEach(([tone, light], i) => {
        const a = turn + i * Math.PI / 2, x = c + Math.cos(a) * 15, y = c + Math.sin(a) * 15;
        m.limb(c + Math.cos(a) * 8, c + Math.sin(a) * 8, 8, x, y, 9, 0.6, tone, 1, 0.3);
        m.ball(x, y, 10, 4.2, tone, 0.9);
        m.ball(x - 1, y - 1, 13, 1.6, light, 1);
      });
  }],
  banshee: [50, (m, f) => {
    const c = 25, wave = f ? 1.4 : -1.4;
    for (let i = 0; i < 7; i++) m.ball(c - 9 + i * 3, c + 15 + (i % 2 ? wave : -wave), 4, 3, '#a5b4fc', 0.4);
    m.egg(c, c + 6, 6, 11, 12, 6, '#c7d2fe', 0.5);
    for (const side of [-1, 1]) {
      m.limb(c + side * 9, c + 1, 9, c + side * 15, c - 7 + side * wave, 9, 2.2, '#e0e7ff', 0, 1);
    }
    m.egg(c, c - 4, 12, 7, 8, 5, '#eef2ff', 0.6);
    for (const dx of [-5, -2.5, 0, 2.5, 5]) m.limb(c + dx, c - 9, 15, c + dx * 1.4, c + 4, 13, 1, '#ddd6fe', 0, 0.6);
    m.egg(c, c - 4, 17.5, 2.4, 3.2, 1, '#1e1b4b');
    m.dot(c - 2.6, c - 7.6, '#a78bfa', 90);
    m.dot(c + 2.6, c - 7.6, '#a78bfa', 90);
  }],
  shatun: [50, (m, f) => beast(m, f, {
    s: 1.6, fur: '#4a2f1b', dark: '#2b1a0e', belly: '#6b4423', snout: '#8a6a4a', head: 5.2, wide: 7.4, leg: 2.4,
    ears: false, eye: '#ef4444',
    face: (c, y, s) => {
      for (const side of [-1, 1]) m.ball(c + side * 4 * s, y - 6.4 * s, 13 * s, 1.6 * s, '#2b1a0e');
      for (const [dx, dy] of [[-3, -2], [2, 1], [-1, 4]]) m.limb(c + dx * s, y + dy * s, 11 * s, c + (dx + 2) * s,
        y + (dy + 2) * s, 11 * s, 0.5, '#d6b48a');
    },
  })],
  warlord: [50, (m, f) => walker(m, f, {
    s: 1.55, legs: '#3f2d1d', body: '#7f1d1d', skin: '#65a30d', shoulderColor: '#57534e', headColor: '#65a30d',
    arm: 2.5, wrist: 2.3, hand: 2.7, shoulder: 3.4, reach: 8, spread: 7.6, wide: 8.4,
    back: (c, y, s, step) => m.egg(c + step * 0.6, y + 7 * s, 3, 9 * s, 7 * s, 1.6, '#991b1b'),
    held: (hands) => {
      const [rx, ry] = hands[1];
      m.limb(rx, ry + 3, 14, rx, ry - 9, 15, 1.2, WOOD);
      m.egg(rx + 2.4, ry - 8, 16, 3.2, 2.2, 1, METAL, 0.8);
      m.egg(rx - 2.4, ry - 8, 16, 3.2, 2.2, 1, METAL, 0.8);
    },
    face: (c, y, s) => {
      for (const side of [-1, 1]) m.limb(c + side * 3 * s, y - 6 * s, 18, c + side * 6.5 * s, y - 11 * s, 19, 1.2,
        '#f1e4c8', 0, 0.4);
      m.dot(c - 2.6, y - 7, '#fde047', 90);
      m.dot(c + 2.6, y - 7, '#fde047', 90);
    },
  })],
  spiderqueen: [50, (m, f) => {
    spider(m, f, { s: 1.6, leg: '#3b0764', body: '#6b21a8', head: '#7e22ce', mark: '#c084fc' });
    const c = 25;
    for (const dx of [-2.6, 0, 2.6]) m.limb(c + dx, c - 6, 20, c + dx, c - 10, 21, 0.8, GOLD, 1, 0.5);
    m.egg(c, c - 6, 19, 3.8, 1.2, 0.8, GOLD, 1);
  }],
};

export const MOB_IDS = Object.keys(MOBS);
export const gooColor = (id) => (GOOS[id] ? GOOS[id].color : null);
const scaleOf = (size) => (size >= 50 ? 1.22 : size >= 38 ? 1.14 : 1.1);

export function drawMob(id, frame = 0) {
  const [size, draw] = MOBS[id], m = new Model(size, scaleOf(size));
  draw(m, frame);
  return m.paint();
}

export function drawMelt(id, stage) {
  const o = GOOS[id], size = MOBS[id][0], m = new Model(size, scaleOf(size)), c = size / 2, t = stage / 3, r = o.r;
  const y = c + 2 + t, dome = r * (1 - 0.42 * t), height = r * 0.8 * (1 - 0.62 * t), shine = o.shine || '#ffffff';
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4 + 0.35 * Math.sin(i * 1.7), wobble = 0.8 + 0.25 * Math.sin(i * 2.3 + 1);
    const reach = r * (0.55 + 0.7 * t) * wobble, lobe = r * (0.24 + 0.16 * t) * (0.75 + 0.3 * Math.cos(i * 1.3));
    const lx = c + Math.cos(a) * reach, ly = y + Math.sin(a) * reach * 0.8;
    m.limb(c + Math.cos(a) * dome * 0.7, y + Math.sin(a) * dome * 0.56, 1.6 + height * 0.5, lx, ly, 1.2, lobe * 0.7,
      o.color, 0.5, lobe * 0.5);
    m.egg(lx, ly, 1, lobe * 1.25, lobe, lobe * 0.35, o.color, 0.4);
    if (stage > 1 && i % 2 === 0) {
      const far = reach + lobe * (1.6 + t);
      m.ball(c + Math.cos(a + 0.3) * far, y + Math.sin(a + 0.3) * far * 0.8, 0.8, lobe * 0.38, o.color, 0.6);
    }
  }
  m.egg(c, y, 2.6 - t, dome * 1.06, dome, height, o.color, 0.8);
  m.egg(c - dome * 0.38, y - dome * 0.34, 2.6 + height * 0.95, dome * 0.24, dome * 0.13, dome * 0.08, shine, 1);
  m.dot(c + dome * 0.3, y + dome * 0.12, shine, 40);
  if (stage === 1) {
    for (const side of [-1, 1]) {
      m.limb(c + side * dome * 0.32 - dome * 0.13, y, 3 + height, c + side * dome * 0.32 + dome * 0.13, y + dome * 0.04,
        3 + height, dome * 0.06, '#1c1917');
    }
  } else if (stage === 2) {
    for (const side of [-1, 1]) m.dot(c + side * dome * 0.3, y + dome * 0.1, '#1c1917', 40);
  }
  return m.paint();
}

export function drawSplit(id, stage, apart) {
  const o = GOOS[id], size = MOBS[id][0], k = scaleOf(size), m = new Model(size, k), c = size / 2, t = stage / 3;
  const off = apart / k * t, lobe = o.r * (1 - 0.24 * t), neck = lobe * (0.8 - 0.62 * t), y = c + 2;
  if (neck > 0.5) {
    for (let i = -2; i <= 2; i++) {
      const thin = neck * (1 - 0.25 * Math.abs(i) / 2);
      m.egg(c, y + i * off / 2.4, 3, thin, Math.max(thin, off / 2.2), thin * 0.6, o.color, 0.6);
    }
  }
  for (const side of [-1, 1]) {
    const ly = y + side * off;
    m.egg(c, ly, 4, lobe * (1 - 0.08 * t), lobe * (1 + 0.12 * t), lobe * 0.8, o.color, 0.8);
    m.egg(c - lobe * 0.4, ly - lobe * 0.4, 4 + lobe * 0.66, lobe * 0.22, lobe * 0.14, lobe * 0.1, o.shine || '#ffffff',
      1);
    if (stage >= 2) {
      for (const eye of [-1, 1]) {
        m.egg(c + eye * lobe * 0.3, ly - lobe * 0.05, 4 + lobe * 0.78, lobe * 0.15, lobe * 0.2, lobe * 0.08, '#1c1917',
          0.4);
      }
    }
  }
  return m.paint();
}

export { walker, beast, wings, blob, spikes, spider, MOBS };
