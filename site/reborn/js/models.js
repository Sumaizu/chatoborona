const OUT = [18, 12, 28];
const SHADE = [44, 26, 86];
const DEEP = [22, 14, 52];
const WARM = [255, 238, 196];
const SHINE = [255, 252, 238];
const SKIN = '#e8b890';
const METAL = '#9aa3ad';
const STEEL = '#5d6670';
const WOOD = '#8a5a2e';
const GOLD = '#e0b43a';
const PAD = 0.3;

const unit = (v) => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const LIGHT = unit([-0.42, -0.58, 0.9]);
const mix = (a, b, t) => [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t)];
const ramps = new Map();

function ramp(color) {
  if (ramps.has(color)) return ramps.get(color);
  const base = [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)];
  const tones = [mix(base, DEEP, 0.55), mix(base, SHADE, 0.28), base, mix(base, WARM, 0.26), mix(base, SHINE, 0.6)];
  ramps.set(color, tones);
  return tones;
}

class Model {
  constructor(size, k, center = size / 2, centerY = center) {
    this.reload = -1;
    this.w = size;
    this.h = size;
    this.k = k;
    this.center = center;
    this.centerY = centerY;
    this.pad = Math.ceil(size * PAD);
    this.side = size + this.pad * 2;
    const cells = this.side * this.side;
    this.c = new Array(cells).fill(null);
    this.z = new Float32Array(cells).fill(-1e9);
    this.n = new Array(cells).fill(null);
    this.flat = new Uint8Array(cells);
    this.gloss = new Float32Array(cells);
  }

  place(x, y) {
    return [this.pad + this.w / 2 + (x - this.center) * this.k, this.pad + this.h / 2 + (y - this.centerY) * this.k];
  }

  plot(x, y, z, color, n, flat, gloss) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.side || y >= this.side) return;
    const i = y * this.side + x;
    if (z <= this.z[i]) return;
    this.z[i] = z;
    this.c[i] = color;
    this.n[i] = n;
    this.flat[i] = flat;
    this.gloss[i] = gloss;
  }

  egg(cx, cy, cz, rx, ry, rz, color, gloss = 0) {
    [cx, cy] = this.place(cx, cy);
    const k = this.k;
    rx *= k;
    ry *= k;
    rz *= k;
    cz *= k;
    for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) {
      for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, q = 1 - dx * dx - dy * dy;
        if (q < 0) continue;
        const dz = Math.sqrt(q);
        this.plot(x, y, cz + dz * rz, color, unit([dx / rx, dy / ry, dz / rz]), 0, gloss);
      }
    }
  }

  ball(cx, cy, cz, r, color, gloss = 0) {
    this.egg(cx, cy, cz, r, r, r, color, gloss);
  }

  limb(x0, y0, z0, x1, y1, z1, r, color, gloss = 0, r1 = r) {
    [x0, y0] = this.place(x0, y0);
    [x1, y1] = this.place(x1, y1);
    const k = this.k;
    r *= k;
    r1 *= k;
    z0 *= k;
    z1 *= k;
    const big = Math.max(r, r1), vx = x1 - x0, vy = y1 - y0, len2 = vx * vx + vy * vy || 1;
    for (let y = Math.floor(Math.min(y0, y1) - big - 1); y <= Math.max(y0, y1) + big + 1; y++) {
      for (let x = Math.floor(Math.min(x0, x1) - big - 1); x <= Math.max(x0, x1) + big + 1; x++) {
        const px = x + 0.5, py = y + 0.5;
        const t = Math.max(0, Math.min(1, ((px - x0) * vx + (py - y0) * vy) / len2)), rr = r + (r1 - r) * t;
        const dx = px - (x0 + vx * t), dy = py - (y0 + vy * t), d2 = dx * dx + dy * dy;
        if (d2 > rr * rr) continue;
        const dz = Math.sqrt(rr * rr - d2);
        this.plot(x, y, z0 + (z1 - z0) * t + dz, color, unit([dx / rr, dy / rr, dz / rr]), 0, gloss);
      }
    }
  }

  sheet(points, z, color, n = [0, 0, 1]) {
    const spots = points.map(([x, y]) => this.place(x, y)), normal = unit(n);
    const xs = spots.map((spot) => spot[0]), ys = spots.map((spot) => spot[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.max(...ys); y++) {
      for (let x = Math.floor(Math.min(...xs)); x <= Math.max(...xs); x++) {
        const px = x + 0.5, py = y + 0.5;
        let inside = false;
        for (let i = 0, j = spots.length - 1; i < spots.length; j = i++) {
          const [xi, yi] = spots[i], [xj, yj] = spots[j];
          if (yi > py !== yj > py && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
        }
        if (inside) this.plot(x, y, z * this.k, color, normal, 0, 0);
      }
    }
  }

  dot(x, y, color, z = 99) {
    [x, y] = this.place(x + 0.5, y + 0.5);
    this.plot(x, y, z * this.k, color, [0, 0, 1], 1, 0);
  }

  paint() {
    const w = this.side, h = this.side, canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.fine = 2;
    canvas.span = this.w;
    const g = canvas.getContext('2d'), image = g.createImageData(w, h), data = image.data;
    const put = (x, y, rgb) => {
      const i = (y * w + x) * 4;
      data[i] = rgb[0];
      data[i + 1] = rgb[1];
      data[i + 2] = rgb[2];
      data[i + 3] = 255;
    };
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x, color = this.c[i];
        if (!color) continue;
        const tones = ramp(color);
        if (this.flat[i]) {
          put(x, y, tones[2]);
          continue;
        }
        const n = this.n[i], d = n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2];
        let tone = d < 0.05 ? 0 : d < 0.42 ? 1 : d < 0.86 ? 2 : 3;
        if (2 * d * n[2] - LIGHT[2] > 0.97 - this.gloss[i] * 0.12 && d > 0.85) tone = 4;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const a = x + dx, b = y + dy, j = b * w + a;
          if (a >= 0 && b >= 0 && a < w && b < h && this.c[j] && this.z[j] > this.z[i] + 1.5) {
            tone = Math.max(0, Math.min(tone, 2) - 1);
            break;
          }
        }
        put(x, y, tones[tone]);
      }
    }
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (this.c[y * w + x]) continue;
        for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
          const a = x + dx, b = y + dy;
          if (a < 0 || b < 0 || a >= w || b >= h || !this.c[b * w + a]) continue;
          put(x, y, mix(ramp(this.c[b * w + a])[0], OUT, 0.55));
          break;
        }
      }
    }
    g.putImageData(image, 0, 0);
    return canvas;
  }
}

function legs(m, cx, y, color, f, spread = 3.4, rx = 2.5, ry = 3.2) {
  const step = f ? 1.4 : 0;
  m.egg(cx - spread, y - step, 1, rx, ry, 2.2, color);
  m.egg(cx + spread, y + step, 1, rx, ry, 2.2, color);
}

const RELOAD = { frames: 3, tilt: [0.3, 0.55, 0.7], reach: 4.4, belt: [-6, 8.4] };

function swing(m, cx, cy) {
  return m.reload < 0 ? m : turned(m, cx, cy, RELOAD.tilt[m.reload]);
}

function turned(m, cx, cy, angle) {
  const c = Math.cos(angle), s = Math.sin(angle);
  const turn = (x, y) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c];
  return {
    at: turn,
    egg: (x, y, ...rest) => m.egg(...turn(x, y), ...rest),
    ball: (x, y, ...rest) => m.ball(...turn(x, y), ...rest),
    limb: (x0, y0, z0, x1, y1, ...rest) => m.limb(...turn(x0, y0), z0, ...turn(x1, y1), ...rest),
    dot: (x, y, ...rest) => m.dot(...turn(x, y), ...rest),
    sheet: (points, ...rest) => m.sheet(points.map(([x, y]) => turn(x, y)), ...rest),
  };
}

function reloadHands(m, [lx, ly, rx, ry]) {
  if (m.reload < 0) return [lx, ly, rx, ry];
  const tilt = RELOAD.tilt[m.reload], s = Math.sin(tilt), c = Math.cos(tilt), k = m.reload / (RELOAD.frames - 1);
  const mx = rx + RELOAD.reach * s, my = ry - RELOAD.reach * c, bx = rx + RELOAD.belt[0], by = ry + RELOAD.belt[1];
  return [bx + (mx - bx) * k, by + (my - by) * k + 1.4, rx, ry];
}

function magazine(m, x, y, z) {
  if (m.reload < 0) return;
  m.limb(x, y - 1.4, z + 1, x + 0.5, y + 1.4, z + 0.8, 1, '#475569', 0.6);
  m.ball(x, y - 1.6, z + 1.6, 0.7, '#facc15', 0.8);
}

function hero(m, o) {
  if (o.slim) legs(m, 16, 23.6, o.boots, 0, 2.6, 1.9, 2.2);
  else legs(m, 16, 26.5, o.boots || '#3b2c22', 0);
  if (o.back) o.back(m);
  m.egg(16, 18.5, 5, 8.6, 6.2, 4.6, o.coat);
  if (o.chest) o.chest(m);
  const [lx, ly, rx, ry] = reloadHands(m, o.hands || [13, 11, 18.5, 12.3]);
  m.limb(9.5, 17, 8, lx, ly + 0.5, 9, 2.3, o.sleeve || o.coat);
  m.limb(22.5, 17, 8, rx, ry + 0.5, 9, 2.3, o.sleeve || o.coat);
  const shoulder = o.slim ? 2.3 : 3.3, pad = o.slim ? o.coat : o.dark;
  m.ball(9, 17.5, 8.5, shoulder, pad);
  m.ball(23, 17.5, 8.5, shoulder, pad);
  if (o.weapon) o.weapon(swing(m, rx, ry));
  magazine(m, lx, ly, 10);
  m.ball(lx, ly, 10, 2, o.glove || SKIN);
  m.ball(rx, ry, 10, 2, o.glove || SKIN);
  o.head(m);
}

function hat(q, color, band, tip) {
  q.egg(16, 17.2, 12, 5.6, 5.2, 0.8, color);
  q.egg(16, 17.2, 12.6, 3.6, 3.4, 0.6, band);
  q.ball(16, 17.4, 13.4, 3, color);
  q.ball(16.3, 18.3, 15.2, 2.1, color);
  q.ball(16.7, 19.3, 16.7, 1.3, color);
  q.ball(17.1, 20.2, 17.8, 0.8, tip);
}

function robed(m, o) {
  const [lx, ly, rx, ry] = o.hands;
  m.egg(16, 22.4, 1.2, 9.4, 8.2, 0.9, o.dark);
  for (const [x, y] of [[8, 26.6], [11.6, 29.4], [16, 30.2], [20.4, 29.4], [24, 26.6]]) {
    m.limb(16, 19.5, 2.4, x, y, 1.6, 0.7, o.robe, 0, 1.2);
  }
  m.limb(16, 20, 4.4, 16, 29.6, 2.4, 0.6, o.trim);
  m.egg(16, 17.8, 3.4, 6.4, 5, 1.8, o.robe);
  m.egg(16, 15.6, 5.2, 6.8, 3.2, 1, o.dark);
  for (const [sx, hx, hy] of [[10, lx, ly], [22, rx, ry]]) {
    m.limb(sx, 16.4, 5.6, hx, hy + 1.6, 7.6, 1.3, o.sleeve, 0, 2.3);
    m.limb(hx, hy + 2.2, 7.8, hx, hy + 1, 8.2, 2.4, o.dark);
  }
  if (o.weapon) o.weapon(m);
  m.ball(lx, ly, 9.4, 1.7, SKIN);
  m.ball(rx, ry, 9.4, 1.7, SKIN);
  o.head(m);
}

function mage(m, o) {
  robed(m, {
    robe: o.robe, dark: o.dark, sleeve: o.sleeve, trim: o.trim, hands: [12.5, 11.5, 20, 12.5],
    weapon: (q) => {
      q.limb(12.5, 16.5, 10, 12.5, 4.5, 10.8, 1, o.staff || WOOD);
      o.tip(q, 12.5, 3);
    },
    head: (q) => hat(q, o.hat, o.trim, o.glow),
  });
}

const MAGES = {
  frost: (m) => mage(m, {
    robe: '#1d4ed8', dark: '#1e3a8a', sleeve: '#2557e0', hat: '#1e40af', trim: '#7dd3fc',
    glow: '#e0f2fe', staff: '#94a3b8',
    tip: (q, x, y) => {
      q.ball(x, y, 12.6, 2.6, '#38bdf8', 1);
      q.ball(x - 0.7, y - 0.7, 14.2, 1, '#e0f2fe', 1);
      for (const [dx, dy] of [[-2.5, 2.5], [2.6, 1.4], [0.4, -3]]) q.dot(x + dx, y + dy, '#7dd3fc', 50);
    },
  }),
  earth: (m) => mage(m, {
    robe: '#7c5a3a', dark: '#4a3524', sleeve: '#86613f', hat: '#5c4128', trim: '#65a30d',
    glow: '#bef264', staff: '#5c3d22',
    tip: (q, x, y) => {
      q.egg(x, y, 13.4, 1.8, 1.4, 3.4, '#b45309', 1);
      q.egg(x - 1.3, y + 0.8, 12.4, 1.1, 0.9, 2.2, '#d97706', 1);
      q.egg(x + 1.3, y + 0.6, 12.4, 1, 0.9, 2, '#92400e', 1);
      q.dot(x - 0.4, y - 1, '#fde68a', 60);
    },
  }),
  shaman: (m) => mage(m, {
    robe: '#0d9488', dark: '#115e59', sleeve: '#14a39a', hat: '#0f766e', trim: '#ccfbf1',
    glow: '#ecfeff',
    tip: (q, x, y) => {
      q.ball(x, y, 12.6, 1.4, '#a7f3d0', 1);
      for (let k = 0; k < 7; k++) {
        const a = k * 0.95, b = a + 0.8, r = 2 + k * 0.3, s = r + 0.3;
        q.limb(x + Math.cos(a) * r, y + Math.sin(a) * r, 12 + k * 0.4, x + Math.cos(b) * s, y + Math.sin(b) * s,
          12.3 + k * 0.4, 0.45, k % 2 ? '#ffffff' : '#99f6e4');
      }
    },
  }),
};

const STORM_ROBE = { robe: '#1e2a78', dark: '#141b52', sleeve: '#26338e', hat: '#172066', trim: '#facc15', glow: '#fef08a' };

function stormTip(q, x, y) {
  q.ball(x, y, 12.6, 2.3, '#fde047', 1);
  q.ball(x - 0.6, y - 0.6, 14, 0.9, '#ffffff', 1);
  q.limb(x - 2.6, y - 1.2, 12.4, x - 3.6, y + 0.4, 12.4, 0.35, '#fef9c3');
  q.limb(x + 2.4, y - 1.6, 12.4, x + 3.4, y - 3, 12.4, 0.35, '#fef9c3');
  q.limb(x + 1.6, y + 2.4, 12.4, x + 2.8, y + 3.2, 12.4, 0.35, '#fef9c3');
  for (const [dx, dy] of [[-3, -3], [3, 0], [-1, 3.5]]) q.dot(x + dx, y + dy, '#ffffff', 60);
}

function stormMage(m) {
  robed(m, {
    robe: STORM_ROBE.robe, dark: STORM_ROBE.dark, sleeve: STORM_ROBE.sleeve, trim: STORM_ROBE.trim,
    hands: [12.5, 14.5, 20.5, 12],
    weapon: (q) => {
      q.ball(20.5, 11, 12, 2.4, '#fde047', 1);
      q.ball(20.2, 10.5, 13.6, 1.2, '#ffffff', 1);
      for (const [dx, dy] of [[-2.2, -1.4], [2.1, -0.6], [0.4, 2.2]]) q.dot(20.5 + dx, 11 + dy, '#fef9c3', 60);
    },
    head: (q) => hat(q, STORM_ROBE.hat, STORM_ROBE.trim, STORM_ROBE.glow),
  });
}

function stormCaller(m, strike = false) {
  const lift = strike ? 2.6 : 0;
  robed(m, {
    robe: STORM_ROBE.robe, dark: STORM_ROBE.dark, sleeve: STORM_ROBE.sleeve, trim: STORM_ROBE.trim,
    hands: [12.5, 11.5 - lift, 20, 12.5],
    weapon: (q) => {
      q.limb(12.5, 16.5 - lift, 10, 12.5, 4.5 - lift, 10.8, 1, WOOD);
      stormTip(q, 12.5, 3 - lift);
    },
    head: (q) => hat(q, STORM_ROBE.hat, STORM_ROBE.trim, STORM_ROBE.glow),
  });
}

const RAIJU = { fur: '#b8913f', light: '#e3c27a', dark: '#7a5a22', belly: '#efe0b8', spike: '#a5f3fc', glint: '#e0f2fe',
  claw: '#bae6fd', eye: '#fef9c3', mouth: '#5b1a1a' };

function raiju(m, swipe = false) {
  const c = RAIJU;
  for (let i = 0; i < 8; i++) {
    const f = i / 7, y = 25 + f * 7.4, x = 16 + Math.sin(f * 2.6) * 2.2, r = 2.8 - f * 1.2;
    m.ball(x, y, 4.4 - f * 0.8, r, f > 0.7 ? c.belly : i % 2 ? c.fur : c.light, 0.2);
    for (const side of [-1, 1]) m.limb(x, y, 4, x + side * (r + 0.6), y + 1, 3.6, 0.5, c.light, 0.1, 0.15);
  }
  for (const side of [-1, 1]) {
    m.egg(16 + side * 3.6, 23.2, 3.6, 2.4, 3, 2, c.fur, 0.2);
    m.limb(16 + side * 4.4, 24.4, 3, 16 + side * 6, 28.4, 1.4, 1.5, c.fur, 0.1, 1);
    for (const t of [-0.6, 0, 0.6]) m.limb(16 + side * 6, 28.4, 1.4, 16 + side * (6.2 + t), 29.8, 1.1, 0.28, c.claw, 0.6);
  }
  m.egg(16, 19.6, 4.4, 5.4, 7.4, 3.4, c.fur, 0.2);
  m.egg(16, 20.4, 2.6, 4, 5.8, 1.6, c.belly, 0.1);
  for (let i = 0; i < 18; i++) {
    const a = Math.PI * 2 * i / 18, x = 16 + Math.cos(a) * 5.2, y = 19.6 + Math.sin(a) * 7.2;
    m.limb(x, y, 4.6, x + Math.cos(a) * 1.4, y + Math.sin(a) * 1.4 + 0.6, 4, 0.7, i % 2 ? c.fur : c.light, 0.1, 0.2);
  }
  for (let i = 0; i < 6; i++) {
    const y = 15.6 + i * 1.8;
    for (const side of [-1, 1]) m.limb(16 + side * 1.4, y, 7.6, 16 + side * 4.6, y + 0.9, 6.8, 0.38, c.dark, 0, 0.15);
  }
  const fore = swipe ? [[12, 13.6, 10.6, 9.4], [20, 13.6, 24, 6.8]] : [[12, 13.6, 10.6, 9.4], [20, 13.6, 21.4, 9.4]];
  for (const [sx, sy, hx, hy] of fore) {
    m.limb(sx, sy, 4.4, hx, hy, 2.4, 1.9, c.fur, 0.1, 1.2);
    const side = Math.sign(hx - 16), spread = swipe && side > 0 ? 1 : 0.6;
    for (const t of [-1, 0, 1]) m.limb(hx, hy, 2.4, hx + t * spread + side * 0.3, hy - 1.9, 2.6, 0.3, c.claw, 0.7);
  }
  m.egg(16, 12.8, 7, 4.6, 3.8, 3, c.light, 0.2);
  for (let i = 0; i < 12; i++) {
    const a = Math.PI * (0.9 + 1.2 * i / 11), x = 16 + Math.cos(a) * 4.6, y = 13.4 + Math.sin(a) * 3.4;
    m.limb(x, y, 7.4, x + Math.cos(a) * 1.3, y + Math.sin(a) * 1.1 + 0.8, 7, 0.65, i % 2 ? c.light : c.fur, 0.1, 0.2);
  }
  for (let i = 0; i < 5; i++) {
    const y = 13 + i * 2.6, long = 4.4 - i * 0.5;
    for (const side of [-1, 1]) {
      m.limb(16 + side * 0.9, y, 9.6, 16 + side * (1.8 + long * 0.6), y + long * 0.75, 11, 0.7, c.spike, 0.8, 0.18);
      m.limb(16 + side * (1.3 + long * 0.45), y + long * 0.55, 10.6, 16 + side * (1.8 + long * 0.6), y + long * 0.75, 11,
        0.3, c.glint, 1, 0.1);
    }
  }
  m.egg(16, 8.4, 8.6, 3.4, 3.4, 2.6, c.fur, 0.2);
  for (const side of [-1, 1]) {
    m.limb(16 + side * 2, 9.4, 10, 16 + side * 3.4, 11.8, 11, 1.05, c.fur, 0.1, 0.25);
    m.limb(16 + side * 2.4, 8.4, 9.2, 16 + side * 3.6, 9.6, 8.6, 0.7, c.light, 0.1, 0.2);
    m.ball(16 + side * 1.4, 6.8, 10.2, 0.5, c.eye, 1);
  }
  m.limb(16, 7, 8.8, 16, 3.4, 7.8, 1.45, c.light, 0.2, 1);
  m.egg(16, 3.9, 7.2, 1.1, 1.6, 0.7, c.mouth);
  for (const side of [-1, 1]) m.limb(16 + side * 0.7, 3.7, 7.6, 16 + side * 0.6, 2.6, 7.2, 0.22, '#ffffff', 0.8);
  m.ball(16, 2.5, 8.2, 0.55, '#1c1408', 0.8);
}

const THOR = { cape: '#991b1b', capeDark: '#6b1111', steel: '#4b5563', plate: '#9ca3af', dark: '#1f2937',
  hair: '#e2bd5a', hairDark: '#b48a32', leather: '#5b3a22', head: '#a5c8f0', rune: '#e0f2fe' };

function hammer(q, x, y) {
  const w = 2.6, h = 1.55, b = 0.55, top = 12.2;
  q.limb(x, y + 7.4, 10.2, x, y + h, 11, 0.4, THOR.leather, 0.3, 0.46);
  for (let k = 0; k < 6; k++) q.limb(x - 0.44, y + 2.4 + k * 0.85, 10.9, x + 0.44, y + 2.75 + k * 0.85, 10.9, 0.13, '#3b2414');
  q.ball(x, y + 7.6, 10.1, 0.5, THOR.steel, 0.9);
  q.limb(x, y + 7.9, 10, x - 0.8, y + 9, 9.6, 0.12, THOR.leather);
  q.sheet([[x - w, y - h], [x + w, y - h], [x + w, y + h], [x - w, y + h]], top - 1.2, '#3e5470', [0, 0.6, 1]);
  q.sheet([[x - w, y - h], [x + w, y - h], [x + w - b, y - h + b], [x - w + b, y - h + b]], top - 0.4, '#b7cde8', [0, -1, 1]);
  q.sheet([[x - w, y + h], [x + w, y + h], [x + w - b, y + h - b], [x - w + b, y + h - b]], top - 0.4, '#465d7a', [0, 1, 1]);
  q.sheet([[x - w, y - h], [x - w + b, y - h + b], [x - w + b, y + h - b], [x - w, y + h]], top - 0.4, '#7f9bbd', [-1, 0, 1]);
  q.sheet([[x + w, y - h], [x + w - b, y - h + b], [x + w - b, y + h - b], [x + w, y + h]], top - 0.4, '#56708f', [1, 0, 1]);
  q.sheet([[x - w + b, y - h + b], [x + w - b, y - h + b], [x + w - b, y + h - b], [x - w + b, y + h - b]], top, '#93b0d2');
  for (const side of [-1, 1]) {
    q.sheet([[x + side * (w - b), y - h + b], [x + side * (w - b - 0.5), y - h + b], [x + side * (w - b - 0.5), y + h - b],
      [x + side * (w - b), y + h - b]], top + 0.1, '#6b86a8');
  }
  q.limb(x - 0.9, y - 0.6, top + 0.3, x - 0.2, y + 0.4, top + 0.3, 0.12, THOR.rune, 1);
  q.limb(x - 0.2, y + 0.4, top + 0.3, x + 0.3, y - 0.5, top + 0.3, 0.12, THOR.rune, 1);
  q.limb(x + 0.3, y - 0.5, top + 0.3, x + 0.9, y + 0.5, top + 0.3, 0.12, THOR.rune, 1);
}

function cape(m, c) {
  const top = 16.6, folds = 6;
  for (let i = 0; i < folds; i++) {
    const f0 = i / folds, f1 = (i + 1) / folds, wave = (f) => Math.sin(f * Math.PI * 3) * 0.35;
    const tx = (f) => 13 + f * 6, bx = (f) => 11.6 + f * 8.8;
    const by = (f) => 25.4 - Math.abs(f - 0.5) * 1.6 + wave(f);
    m.sheet([[tx(f0), top], [tx(f1), top], [bx(f1), by(f1)], [bx(f0), by(f0)]], 3.2 + (i % 2) * 0.3,
      i % 2 ? c.capeDark : c.cape, [i % 2 ? 0.45 : -0.45, 0.2, 1]);
  }
  m.limb(12.8, top + 0.2, 6.4, 19.2, top + 0.2, 6.4, 0.55, c.capeDark, 0.2);
  for (const side of [-1, 1]) m.ball(16 + side * 3.2, top + 0.3, 6.8, 0.42, '#d4a017', 1);
}

function thor(m, pose = '') {
  const c = THOR;
  cape(m, c);
  m.egg(16, 18.4, 6, 3.1, 3.2, 2.4, c.steel, 0.4);
  m.limb(16, 15.8, 8.2, 16, 20.8, 7.6, 0.38, c.dark, 0.3);
  for (const [x, y] of [[14.7, 17.6], [17.3, 17.6], [14.9, 19.6], [17.1, 19.6]]) m.ball(x, y, 8.2, 0.42, c.plate, 0.9);
  m.limb(13.4, 21, 7.2, 18.6, 21, 7.2, 0.35, c.leather, 0.3);
  for (const side of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      m.limb(16 + side * (2 + k * 0.15), 15.6 + k * 1, 8.6 - k * 0.3, 16 + side * (3.9 + k * 0.1), 16.3 + k * 1.1,
        8.2 - k * 0.3, 0.55 - k * 0.1, k % 2 ? c.steel : c.plate, 0.9, 0.4);
    }
  }
  m.limb(12.4, 16.8, 7.8, 11.9, 20.8, 7.4, 0.7, c.steel, 0.4, 0.6);
  m.ball(11.8, 21.2, 7.6, 0.68, SKIN);
  const hand = pose === 'throw' ? [19.8, 10.4] : pose === 'empty' ? [20.2, 20.4] : pose === 'catch' ? [20.4, 12.2] : [21, 17.4];
  m.limb(19.6, 16.8, 7.8, hand[0], hand[1] + 0.4, 8.8, 0.7, c.steel, 0.4, 0.6);
  if (pose !== 'throw' && pose !== 'empty') hammer(m, hand[0], hand[1] - 4.4);
  m.ball(hand[0], hand[1], 11.4, 0.7, SKIN);
  m.egg(16, 13.7, 10.4, 1.2, 0.8, 0.8, SKIN);
  m.egg(16, 15.4, 11, 2.1, 2.2, 1.9, c.hair, 0.3);
  for (let k = -3; k <= 3; k++) {
    m.limb(16 + k * 0.42, 14.4, 12.6 - Math.abs(k) * 0.35, 16 + k * 0.65, 19 + Math.abs(k) * 0.2, 8.8, 0.4,
      k % 2 ? c.hair : c.hairDark, 0.3, 0.26);
  }
}

function ragged(m) {
  robed(m, {
    robe: '#9b2c2c', dark: '#6b1d1d', sleeve: '#a33232', trim: '#7f1d1d', hands: [12.5, 11.5, 20, 12.5],
    weapon: (q) => {
      q.limb(12.5, 16.5, 10, 12.1, 10, 10.4, 0.8, '#6b4a2b');
      q.limb(12.1, 10, 10.4, 12.9, 6.5, 10.6, 0.7, '#7a5a35');
      q.limb(12.9, 6.5, 10.6, 12.4, 3.2, 10.8, 0.6, '#6b4a2b');
      q.ball(12.1, 10, 10.6, 0.9, '#5c3d22');
    },
    head: (q) => {
      q.ball(16, 17, 11.2, 4.3, SKIN);
      q.ball(16, 18.4, 12.4, 3.4, '#3b2a1a');
      for (const [x, y] of [[13.6, 15.6], [18.4, 16], [16, 14.6]]) q.dot(x, y, '#3b2a1a', 60);
    },
  });
  for (const [x, y, c] of [[10.5, 26, '#7c3a1f'], [21, 24.5, '#5c1515'], [14, 28.6, '#6b1d1d']]) {
    m.egg(x, y, 2.6, 1.3, 1, 0.4, c);
  }
  for (const [ax, ay, bx, by] of [[11.2, 23.4, 12.6, 25.2], [19.6, 27, 21.2, 25.6], [15.4, 27.6, 16.4, 29.4],
    [8.8, 21.8, 9.6, 23.6], [22.6, 21.6, 23.4, 23.2]]) {
    m.limb(ax, ay, 2.6, bx, by, 2.6, 0.45, '#3b0d0d');
  }
  for (let i = 0; i < 13; i++) {
    const a = Math.PI * (0.06 + 0.88 * i / 12), x = 16 + Math.cos(a) * 9.2, y = 22.4 + Math.sin(a) * 8;
    const length = 1 + (i * 7 % 5) * 0.45, side = x < 16 ? -0.6 : 0.6;
    m.limb(x, y, 1.9, x + side * (i % 3), y + length, 1.4, 0.5, i % 2 ? '#7f1d1d' : '#9b2c2c', 0, 0.2);
  }
  for (const [x, y] of [[12.5, 13.9], [20, 14.9]]) {
    for (const dx of [-1.2, 0, 1.2]) m.limb(x + dx, y, 8, x + dx * 1.4, y + 1.4, 7.4, 0.35, '#7f1d1d', 0, 0.15);
  }
}

function fireballMage(m, fire, core, twin) {
  robed(m, {
    robe: '#b91c1c', dark: '#7f1d1d', sleeve: '#c42828', trim: '#f59e0b',
    hands: twin ? [11.5, 12, 20.5, 12] : [12.5, 14.5, 20.5, 12],
    weapon: (q) => {
      for (const [x, y] of twin ? [[11.5, 11], [20.5, 11]] : [[20.5, 11]]) {
        q.ball(x, y, 12, 2.5, fire, 1);
        q.ball(x - 0.3, y - 0.5, 13.6, 1.3, core, 1);
      }
    },
    head: (q) => hat(q, '#991b1b', '#f59e0b', core),
  });
}

function igniteMage(m, fire, core) {
  robed(m, {
    robe: '#9a3412', dark: '#5c1a0a', sleeve: '#a63b17', trim: '#fbbf24', hands: [12, 13, 20.5, 11],
    weapon: (q) => {
      q.ball(20.5, 9.8, 12, 2.1, fire, 1);
      q.ball(20.6, 8.4, 13.8, 1.4, fire, 1);
      q.ball(20.4, 7.3, 15.2, 0.8, core, 1);
    },
    head: (q) => {
      q.ball(16, 17.5, 11.6, 5, '#7c2d12');
      q.ball(16, 18.6, 13.4, 3.4, '#5c1a0a');
      q.dot(16, 14.4, core, 60);
    },
  });
}

const DRAGONS = {
  red: { scale: '#c2410c', light: '#fb923c', dark: '#7c2d12', skin: '#7f1d1d', fold: '#9a3412', spine: '#fbbf24',
    eye: '#fde047' },
  blue: { scale: '#1d4ed8', light: '#60a5fa', dark: '#1e3a8a', skin: '#172554', fold: '#1e40af', spine: '#93c5fd',
    eye: '#e0f2ff' },
};
const HORN = '#f5e6c8';
const AWAY = [0.4, 0.4, 1];

function scales(m, cx, cy, rx, ry, cz, rz, color) {
  for (let y = cy - ry + 1, row = 0; y < cy + ry - 0.5; y += 1.5, row++) {
    for (let x = cx - rx + (row % 2 ? 1.5 : 0.75); x < cx + rx; x += 1.5) {
      const q = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      if (q < 0.75) m.dot(x - 0.5, y - 0.5, color, cz + rz * Math.sqrt(1 - q) + 0.3);
    }
  }
}

function chain(m, points, z, r0, r1, color) {
  const last = points.length - 1;
  for (let i = 0; i < last; i++) {
    const [ax, ay] = points[i], [bx, by] = points[i + 1];
    m.limb(ax, ay, z, bx, by, z, r0 + (r1 - r0) * i / last, color, 0, r0 + (r1 - r0) * (i + 1) / last);
  }
}

function dragonHead(m, c, y, z) {
  m.limb(16, y + 6.5, z - 0.6, 16, y + 2, z, 2, c.scale, 0, 1.7);
  m.egg(16, y, z, 2.7, 3.1, 2.2, c.scale);
  m.egg(16, y - 2.8, z - 0.3, 1.8, 1.9, 1.6, c.scale);
  m.limb(14.4, y + 0.6, z + 1.4, 12.6, y + 3.8, z + 2.4, 0.65, HORN, 0, 0.2);
  m.limb(17.6, y + 0.6, z + 1.4, 19.4, y + 3.8, z + 2.4, 0.65, HORN, 0, 0.2);
  m.limb(14.2, y - 0.6, z + 1.6, 14.6, y - 2, z + 1.4, 0.4, c.light);
  m.limb(17.8, y - 0.6, z + 1.6, 17.4, y - 2, z + 1.4, 0.4, c.light);
  m.dot(14, y - 1.2, c.eye, z + 3);
  m.dot(17, y - 1.2, c.eye, z + 3);
  m.dot(15, y - 4.2, c.dark, z + 3);
  m.dot(16, y - 4.2, c.dark, z + 3);
}

function spine(m, c, from, to, z) {
  for (let y = from; y <= to; y += 1.6) m.ball(16, y, z, 0.55, c.spine, 0.6);
}

function dragon(m, c) {
  chain(m, [[16, 23], [19.4, 26.6], [23.2, 27.6], [26.2, 25.6], [27.2, 22], [26.2, 18.8]], 4, 2, 0.6, c.scale);
  m.sheet([[26.2, 19.6], [24.6, 17.6], [26.2, 15.4], [27.8, 17.6]], 4.8, c.dark);
  for (const [x, y] of [[19.4, 26.6], [23.2, 27.6], [26.2, 25.6]]) m.ball(x, y, 6, 0.45, c.spine, 0.6);
  for (const side of [-1, 1]) {
    m.egg(16 + side * 4.8, 22.6, 4, 3, 3.4, 2.6, c.scale);
    m.egg(16 + side * 6, 19.6, 3.6, 1.4, 2, 1.2, c.dark);
    m.egg(16 + side * 4.4, 12.6, 4.6, 1.5, 2.3, 1.4, c.scale);
    for (const dx of [-0.8, 0.8]) {
      m.dot(16 + side * 6 + dx - 0.5, 17.4, HORN, 6);
      m.dot(16 + side * 4.4 + dx - 0.5, 10.2, HORN, 7);
    }
  }
  m.egg(16, 18.6, 7.5, 5.2, 6.6, 4, c.scale);
  scales(m, 16, 18.6, 5.2, 6.6, 7.5, 4, c.light);
  scales(m, 11.2, 22.6, 3, 3.4, 4, 2.6, c.light);
  scales(m, 20.8, 22.6, 3, 3.4, 4, 2.6, c.light);
  for (const side of [-1, 1]) {
    const x = (dx) => 16 + side * dx;
    m.sheet([[x(3), 13.2], [x(6.6), 14.6], [x(7.8), 20], [x(6.8), 26.6], [x(4.2), 24], [x(2.6), 19]], 12, c.skin);
    m.sheet([[x(3), 14.6], [x(5.4), 15.8], [x(6.2), 20.6], [x(5.6), 24.2], [x(4.2), 22.4]], 12.2, c.fold, AWAY);
    chain(m, [[x(3), 13.2], [x(6.8), 15.2], [x(7.6), 20.4], [x(6.8), 26.4]], 12.6, 0.9, 0.5, c.scale);
    m.limb(x(6.8), 15.2, 13, x(7.6), 13.6, 13.2, 0.45, HORN, 0, 0.15);
  }
  spine(m, c, 11.6, 23, 11.4);
  dragonHead(m, c, 7.4, 10.4);
}

function dragonFly(m, c, span) {
  chain(m, [[16, 22], [17.2, 25.4], [16.6, 28.6], [15, 31.6], [15.6, 33.6]], 5, 1.9, 0.4, c.scale);
  m.sheet([[15.6, 32.8], [13.6, 35], [15.6, 37], [17.6, 35]], 5.6, c.dark);
  for (const side of [-1, 1]) {
    const sx = 16 + side * 3.4, wing = (dx, y) => [sx + side * (dx - 3.4) * span, y];
    const S = [sx, 14.4], W = wing(12.4, 9.6), tips = [wing(17.6, 6.6), wing(18.6, 12.6), wing(16.6, 18.6),
      wing(11.6, 22.6)], B = [sx, 21.2];
    const dip = (a, b) => [W[0] + ((a[0] + b[0]) / 2 - W[0]) * 0.7, W[1] + ((a[1] + b[1]) / 2 - W[1]) * 0.7];
    for (let i = 0; i < 3; i++) {
      const panel = [W, tips[i], dip(tips[i], tips[i + 1]), tips[i + 1]];
      m.sheet(panel, 6.4, i % 2 ? c.fold : c.skin, i % 2 ? AWAY : [0, 0, 1]);
    }
    m.sheet([S, W, tips[3], dip(tips[3], B), B], 6.4, c.fold, AWAY);
    m.limb(S[0], S[1], 7.2, W[0], W[1], 7.6, 1.1, c.scale, 0, 0.75);
    for (const tip of tips) m.limb(W[0], W[1], 7.4, tip[0], tip[1], 7, 0.55, c.dark, 0, 0.2);
    m.limb(W[0], W[1], 7.8, W[0] + side * 0.6, W[1] - 1.8, 8, 0.45, HORN, 0, 0.15);
    m.egg(16 + side * 3.4, 22.4, 4.4, 1.5, 2.2, 1.2, c.scale);
    m.dot(16 + side * 3.4 - 0.5, 24.2, HORN, 6);
  }
  m.egg(16, 17.4, 7, 4, 6.4, 3.4, c.scale);
  scales(m, 16, 17.4, 4, 6.4, 7, 3.4, c.light);
  spine(m, c, 11, 30, 9.6);
  dragonHead(m, c, 6.4, 9.6);
}

function phoenix(m, deep, plume, flare, core, span) {
  for (const [x, y, r] of [[10.5, 30, 1.1], [16, 31.5, 1.3], [21.5, 30, 1.1]]) {
    m.limb(16, 20, 5, x, y, 4, 1.9, deep, 0, r);
  }
  for (const [x, y] of [[11.5, 29], [16, 30.5], [20.5, 29]]) m.ball(x, y, 6, 1.1, flare, 1);
  const out = (dx) => 16 + Math.sign(dx) * (3 + (Math.abs(dx) - 3) * span), drop = (1 - span) * 3;
  for (const side of [-1, 1]) {
    m.egg(out(side * 6.5), 15.5 + drop * 0.5, 6, 5.6 * span, 3.8, 1.2, deep);
    for (const [x, y, r] of [[15, 10.5, 1.1], [15.5, 13.6, 1.2], [14.8, 17, 1.1], [12.6, 20.2, 0.9]]) {
      m.limb(out(side * 8.5), 15.5, 6.4, out(side * x), y + drop, 6.8, 1.5, plume, 0, r);
      m.ball(out(side * x), y + drop, 7.4, r, flare, 1);
    }
  }
  m.egg(16, 17.5, 7.5, 3.4, 6, 3.4, plume);
  m.egg(16, 16.5, 9.6, 2, 3.4, 1.8, flare, 0.5);
  m.ball(16, 9.6, 10.2, 2.5, plume);
  m.limb(16, 7.8, 10.6, 16, 5.4, 10.2, 0.75, '#fde68a', 0, 0.3);
  m.limb(16, 10.8, 12.2, 14.8, 13.4, 12.8, 0.5, flare);
  m.limb(16, 10.8, 12.2, 17.2, 13.4, 12.8, 0.5, flare);
  m.dot(14.9, 9, core, 60);
  m.dot(17.1, 9, core, 60);
}

function seated(m, o) {
  if (o.kneel) {
    m.limb(13, 21, 4.5, 11.8, 14.6, 7, 2.2, o.legs, 0, 1.9);
    m.limb(11.8, 14.6, 7, 11.8, 13.4, 2.6, 1.7, o.legs, 0, 1.5);
    m.egg(11.8, 12.4, 1.8, 1.6, 2.2, 1.3, o.boots);
    m.limb(19, 21, 4.5, 19.8, 18.4, 2.6, 2.1, o.legs, 0, 1.8);
    m.limb(19.8, 18.4, 2.6, 19.8, 26, 2, 1.7, o.legs, 0, 1.4);
    m.egg(19.8, 27.2, 1.6, 1.4, 1.9, 1.2, o.boots);
  }
  for (const side of o.kneel ? [] : [-1, 1]) {
    m.limb(16 + side * 3.2, 21.5, 4.5, 16 + side * 7.6, 14.2, 6.4, 2.2, o.legs, 0, 1.9);
    m.limb(16 + side * 7.6, 14.2, 6.4, 16 + side * 4.2, 10, 3, 1.8, o.legs, 0, 1.5);
    m.egg(16 + side * 3.9, 9.4, 2.2, 1.6, 2.1, 1.4, o.boots);
  }
  m.egg(16, 21.8, 5, 5.9, 5, 4.2, o.coat);
  if (o.chest) o.chest(m);
  const [lx, ly, rx, ry] = reloadHands(m, o.hands);
  m.limb(11.2, 20.8, 7.5, lx, ly + 0.5, 8.5, 1.9, o.sleeve);
  m.limb(20.8, 20.8, 7.5, rx, ry + 0.5, 8.5, 1.9, o.sleeve);
  m.ball(11, 21.2, 8, 2.6, o.dark);
  m.ball(21, 21.2, 8, 2.6, o.dark);
  o.weapon(swing(m, rx, ry));
  magazine(m, lx, ly, 9.4);
  m.ball(lx, ly, 9.4, 1.9, o.glove);
  m.ball(rx, ry, 9.4, 1.9, o.glove);
  o.head(m);
}

function recruit(m) {
  hero(m, {
    coat: '#5b6b3a', dark: '#4a5a2c', sleeve: SKIN, boots: '#3b3326', slim: true, hands: [14.9, 11.6, 17.1, 11.6],
    chest: (q) => q.dot(16, 14.4, METAL, 30),
    weapon: (q) => {
      q.limb(16, 12.6, 10.4, 16, 11, 10.4, 0.8, '#3f444d');
      q.limb(16, 11.6, 11.2, 16, 7, 11.4, 0.85, '#4b5563', 0.7);
      q.dot(15.5, 6.8, '#cbd5e1', 40);
    },
    head: (q) => {
      q.ball(16, 17, 11.2, 4.4, SKIN);
      q.ball(16, 18.4, 12.3, 3.5, '#4a3524');
    },
  });
}

const GHILLIE = ['#4d6b2f', '#6b7d3a', '#3f5626', '#7a6a3a', '#5a7a35', '#8a7d45'];

function ghillie(m) {
  seated(m, {
    coat: '#556b2f', dark: '#3f5626', sleeve: '#4d6b2f', legs: '#4d6b2f', boots: '#3a3326', glove: '#3f4a2a',
    kneel: true, hands: [15.2, 17, 16.7, 11.5],
    weapon: (q) => {
      q.limb(16, 23, 8, 16, 17, 8.3, 1.5, '#4b3f2a');
      q.limb(16, 17.5, 8.6, 16, 9, 8.6, 1.1, '#2d323b', 0.5);
      q.limb(16, 9, 8.6, 16, -5.5, 8.6, 0.6, '#3f444d', 0.7);
      q.limb(16, -5, 8.7, 16, -7, 8.7, 0.95, '#1f2937');
      for (const side of [-1, 1]) q.limb(16, 1.5, 8.2, 16 + side * 2, -0.4, 6.6, 0.35, '#2d323b');
      q.limb(16, 16, 11.4, 16, 7, 11.4, 1.35, '#1f2937', 0.9);
      q.ball(16, 6.8, 11.4, 2, '#1f2937', 0.9);
      q.egg(16, 5.4, 11.6, 1.5, 0.6, 1.5, '#38bdf8', 1);
      q.limb(14, 11.5, 11.2, 18, 11.5, 11.2, 0.7, '#4b5563', 0.6);
      q.limb(16, 11.5, 12.4, 16, 10.3, 12.4, 0.6, '#4b5563', 0.6);
    },
    head: (q) => q.ball(16, 20.5, 10.6, 4.4, '#4d6b2f'),
  });
  let seed = 11;
  const roll = () => {
    seed = seed * 16807 % 2147483647;
    return seed / 2147483647;
  };
  const surface = (x, y) => {
    const head = Math.hypot(x - 16, y - 20.5), body = ((x - 16) / 6.8) ** 2 + ((y - 21.5) / 5.4) ** 2;
    if (head < 4.4) return 10.6 + Math.sqrt(4.4 * 4.4 - head * head);
    if (body < 1) return 5 + 4.2 * Math.sqrt(1 - body);
    return 6.5;
  };
  for (let k = 0; k < 90; k++) {
    const a = roll() * Math.PI * 2, r = Math.sqrt(roll()), x = 16 + Math.cos(a) * r * 8.5;
    const y = 18.5 + Math.sin(a) * r * 7.5;
    if (Math.abs(x - 16) < 2.4 && y < 17.5) continue;
    const turn = roll() * Math.PI * 2, length = 1 + roll() * 1.4, z = surface(x, y) + 0.4;
    m.limb(x, y, z, x + Math.cos(turn) * length, y + Math.sin(turn) * length, z + 0.3, 0.5,
      GHILLIE[Math.floor(roll() * GHILLIE.length)], 0, 0.2);
  }
}

const CAMO = ['#2f4a22', '#7a8b4a', '#5b4a2a', '#3d5229'];

function assault(m) {
  hero(m, {
    coat: '#4f6b35', dark: '#3d5229', sleeve: '#557538', boots: '#3a3326', glove: '#2f3a24', slim: true,
    hands: [17, 7.2, 15, 10.6],
    chest: (q) => {
      const spots = [[11, 16], [13.5, 21], [19, 15.5], [21, 20], [16.5, 23], [10.5, 20.5], [20, 23], [12.5, 17.5]];
      spots.forEach(([x, y], i) => q.egg(x, y, 9.1, 1.5, 1.1, 0.5, CAMO[i % CAMO.length]));
    },
    weapon: (q) => {
      q.limb(16, 15, 11.8, 16, 11.5, 12.0, 1.35, '#2d323b');
      q.limb(16, 11.5, 12.2, 16, 6, 12.3, 1.15, '#3f444d', 0.5);
      q.limb(16, 11, 13.2, 16, 6.4, 13.2, 0.4, '#6b7280', 0.6);
      q.ball(16, 9, 13.6, 0.9, '#111827', 0.8);
      q.dot(15.5, 8.4, '#ef4444', 60);
      q.limb(17.1, 8.6, 11.6, 18.2, 9.6, 11.3, 0.75, '#2d323b');
      q.limb(18.2, 9.6, 11.3, 18.9, 11, 11.0, 0.7, '#2d323b');
      q.limb(16, 6, 12.3, 16, 0.5, 12.4, 0.95, '#4b5563', 0.4);
      for (const y of [4.6, 3, 1.4]) q.dot(15.5, y - 0.5, '#1f2937', 40);
      q.limb(16, 0.8, 12.5, 16, -3.6, 12.5, 0.65, METAL, 0.6);
      q.limb(16, -3.4, 12.6, 16, -4.9, 12.6, 0.6, '#6b7280', 0.6);
    },
    head: (q) => {
      q.egg(16, 17.2, 11.4, 6.1, 5.9, 0.7, '#3d4b2a');
      q.egg(16, 17.2, 12, 5.4, 5.2, 3.2, '#4b5d33', 0.3);
      for (const [x, y, c] of [[14.2, 15.6, CAMO[0]], [17.8, 18.6, CAMO[2]], [15.6, 19.4, CAMO[1]]]) {
        q.egg(x, y, 14.6, 1.1, 0.9, 0.5, c);
      }
    },
  });
}

function marksman(m) {
  seated(m, {
    coat: '#8a6a3c', dark: '#6b5230', sleeve: '#94723f', legs: '#4f3d24', boots: '#2a2018', glove: '#4a3b26',
    kneel: true,
    hands: [15.2, 16.5, 16.7, 10.5],
    weapon: (q) => {
      q.limb(16, 23, 8, 16, 17.5, 8.2, 1.5, WOOD);
      q.limb(16, 17.5, 8.4, 16, 5, 8.4, 0.95, '#5c3d22');
      q.limb(16, 5, 8.5, 16, -6, 8.5, 0.5, STEEL, 0.6);
      q.dot(15.5, -5.5, '#cbd5e1', 40);
    },
    head: (q) => {
      q.egg(16, 21, 11, 4.6, 4.5, 3, '#6b5a3a', 0.3);
      q.limb(16, 18, 13.4, 16, 17, 13.4, 0.8, '#3f444d');
      for (const x of [15, 17]) {
        q.limb(x, 17.2, 13.2, x, 15.4, 13.2, 0.6, '#1f2937');
        q.dot(x - 0.5, 14.8, '#4ade80', 60);
      }
    },
  });
}

const TORSO = '#dfa97f';

function surface(x, y) {
  const q = 1 - ((x - 16) / 8.6) ** 2 - ((y - 18.5) / 6.2) ** 2;
  return q > 0 ? 5 + 4.6 * Math.sqrt(q) : -1;
}

function pistol(q, x) {
  q.limb(x, 12.6, 10.4, x, 11, 10.4, 0.8, '#3f444d');
  q.limb(x, 11.6, 11.2, x, 7, 11.4, 0.85, '#4b5563', 0.7);
  q.dot(x - 0.5, 6.8, '#cbd5e1', 40);
}

function wrench(m) {
  hero(m, {
    coat: TORSO, sleeve: SKIN, boots: '#b91c1c', slim: true, hands: [12.2, 13, 19.2, 11.6],
    chest: (q) => {
      q.egg(16, 24.8, 4.8, 7.2, 2.6, 2.8, '#b91c1c');
      q.limb(9.6, 23.2, 7.4, 22.4, 23.2, 7.4, 0.8, '#7f1d1d');
      for (const x of [13.2, 18.8]) q.egg(x, 15.2, 8.6, 2.6, 1.8, 1.2, '#d39a70');
      for (const [x, y] of [[11.4, 19.6], [20.4, 17.4], [14.6, 21.4]]) q.dot(x, y, '#5b4a3a', surface(x, y) + 1);
    },
    weapon: (q) => {
      q.limb(12.2, 14, 10.4, 10.2, 8.2, 10.8, 0.65, METAL, 0.6);
      q.egg(9.8, 7, 11, 1.8, 1.5, 0.9, METAL, 0.6);
      q.egg(9.4, 5.9, 11.7, 0.7, 0.8, 0.5, '#2a2f36');
      pistol(q, 19.2);
    },
    head: (q) => {
      q.ball(16, 17, 11.2, 4.4, SKIN);
      q.egg(16, 16.9, 11.9, 4.6, 4.6, 4.1, '#2563eb');
      q.limb(11.8, 14.2, 13.6, 20.2, 14.2, 13.6, 0.75, '#1e40af');
      for (const [x, y] of [[14.2, 16.6], [17.8, 18], [15.4, 19.6], [18.2, 15.6]]) q.dot(x, y, '#dbeafe', 60);
      q.ball(16, 21.6, 13, 1.1, '#1e40af');
      q.limb(16, 21.8, 12.8, 14.8, 24, 11.6, 0.65, '#2563eb', 0, 0.4);
      q.limb(16, 21.8, 12.8, 17.4, 23.8, 11.6, 0.65, '#1e40af', 0, 0.4);
    },
  });
}

function shaggy(m, cx, cy, z, r) {
  m.ball(cx, cy, z, r, '#c9971f');
  for (let i = 0; i < 16; i++) {
    const a = i * 2.4, reach = r * (0.95 + (i % 4) * 0.12), top = z + r;
    m.limb(cx + Math.cos(a) * r * 0.25, cy + Math.sin(a) * r * 0.25, top, cx + Math.cos(a) * reach,
      cy + Math.sin(a) * reach, z + r * 0.35, r * 0.2, i % 3 ? '#f2c94c' : '#a87b12', 0, r * 0.08);
  }
}

function turreteer(m) {
  legs(m, 16, 22.8, '#3b2c22', 0, 2.4, 1.8, 2);
  m.egg(16, 25, 4.4, 4.4, 3.6, 4.6, '#57534e');
  m.egg(16, 27.2, 6.4, 3.4, 1.2, 2.4, '#44403c');
  m.limb(13.8, 24.6, 8.8, 13.4, 26.8, 9.6, 0.5, METAL, 0.6);
  m.egg(13.3, 27.2, 10, 1.2, 1, 0.6, METAL, 0.6);
  m.limb(18.2, 24.8, 8.8, 18.6, 26.8, 9.6, 0.5, '#facc15');
  m.ball(18.7, 27.2, 10, 0.7, '#ef4444');
  m.egg(16, 19.4, 5, 5.8, 5.2, 4.2, '#f97316');
  for (const x of [13.2, 18.8]) m.limb(x, 15.4, 8.6, x + (x < 16 ? 0.4 : -0.4), 23, 7.6, 0.6, '#44403c');
  m.dot(16, 18.6, '#fde68a', 30);
  const [lx, ly, rx, ry] = m.reload < 0 ? [10, 21.6, 19.6, 13.4] : reloadHands(m, [10, 21.6, 19.6, 13.4]);
  m.limb(10.6, 17.4, 7.6, lx, ly, 7.4 + (m.reload < 0 ? 0 : 2), 1.45, '#fb923c');
  m.limb(21.4, 17.4, 7.6, rx, ry, 8.6, 1.45, '#fb923c');
  const q = swing(m, rx, ry);
  q.limb(19.6, 14.6, 10.2, 19.6, 9.6, 10.6, 1, '#2d323b');
  if (m.reload < 0) q.limb(20.4, 12.2, 9.6, 22, 12.8, 8.8, 0.55, '#1f2937');
  q.limb(19.6, 9.6, 11, 19.6, 6.6, 11, 0.5, METAL, 0.6);
  q.dot(19.1, 10.6, '#facc15', 40);
  magazine(m, lx, ly, 10);
  m.ball(lx, ly, m.reload < 0 ? 8 : 10, 1.4, '#44403c');
  m.ball(rx, ry, 9.6, 1.4, '#44403c');
  m.ball(16, 14.4, 10.6, 3.8, SKIN);
  shaggy(m, 16, 14.6, 10.8, 3.9);
}

function demoman(m) {
  seated(m, {
    coat: '#3f3f46', dark: '#27272a', sleeve: '#52525b', legs: '#3f3f46', boots: '#18181b', glove: '#27272a',
    kneel: true, hands: [20, 10.6, 20.8, 16.4],
    weapon: (q) => {
      q.limb(21.2, 26, 12.6, 21.2, 5.6, 12.8, 1.8, '#4d5a2a', 0.3);
      q.limb(21.2, 25.4, 12.6, 21.2, 28.4, 12.6, 1.8, '#3f3f46', 0, 2.3);
      q.ball(21.2, 28, 12.8, 1.25, '#111827');
      for (const y of [20.4, 11.6]) q.limb(21.2, y, 12.8, 21.2, y - 1, 12.8, 2, '#3a4422');
      q.limb(21.2, 5.8, 12.8, 21.2, 3.8, 12.8, 1.5, '#556b2f', 0.3, 1.7);
      q.limb(21.2, 3.8, 12.8, 21.2, 1.2, 12.8, 1.7, '#6b7f3a', 0.3, 0.3);
      q.limb(19.2, 14, 14, 19.2, 12.4, 14, 0.55, '#1f2937');
      q.dot(18.7, 12, '#4ade80', 60);
    },
    head: (q) => {
      q.egg(16, 21, 10.6, 5.2, 5, 1.2, '#374151');
      q.egg(16, 21, 11, 4.5, 4.4, 3.2, '#4b5563', 0.4);
      q.limb(11.2, 21, 13.4, 20.8, 21, 13.4, 0.7, '#1f2937');
      for (const x of [11.2, 20.8]) q.egg(x, 21, 11.8, 1.4, 2, 1.8, '#111827', 0.5);
    },
  });
}

const KHAKI = '#a08c5b';

function mortarman(m) {
  m.egg(16, 12.6, 0.5, 4.4, 3.8, 0.7, '#3a4426');
  for (const side of [-1, 1]) m.limb(16, 10.2, 7, 16 + side * 3.4, 7.8, 0.4, 0.5, STEEL);
  m.limb(16, 13, 1.6, 16, 8.8, 13.4, 2.2, '#4d6b2f', 0.5);
  m.limb(16, 11.6, 5.4, 16, 11, 6.6, 2.5, '#3f5626');
  m.egg(16, 8.6, 14, 2, 2, 0.4, '#5b7a3a', 0.4);
  m.ball(16, 8.6, 14.2, 1.45, '#151a10');
  legs(m, 16, 23.2, '#2a2018', 0, 2.2, 1.6, 1.8);
  m.limb(10.6, 18, 7, 21.4, 18, 7, 2.1, SKIN);
  m.egg(16, 24, 4.6, 3.4, 1.6, 2.2, KHAKI);
  m.limb(13.4, 24.2, 6.4, 18.6, 24.2, 6.4, 0.45, '#3b2c22');
  const back = [[16, 18.6], [16, 20.4], [16, 22.2]];
  back.forEach(([x, y], i) => {
    const half = 4.6 - i * 0.7;
    m.limb(x - half, y, 8.4 - i * 0.5, x + half, y, 8.4 - i * 0.5, 1, i % 2 ? '#1e3a8a' : '#f8fafc');
  });
  for (const [x, y, i] of [[16, 19.5, 0], [16, 21.3, 1]]) {
    const half = 4.2 - i * 0.7;
    m.limb(x - half, y, 8.2 - i * 0.5, x + half, y, 8.2 - i * 0.5, 0.9, i ? '#f8fafc' : '#1e3a8a');
  }
  m.limb(10.8, 18.2, 7.4, 13.2, 14.6, 8.4, 1.4, SKIN);
  m.limb(21.2, 18.2, 7.4, 18.8, 14.2, 8.6, 1.4, SKIN);
  m.limb(18.8, 14.6, 9.6, 18.8, 11.6, 9.8, 0.9, '#6b7f3a', 0.4);
  m.ball(18.8, 11.4, 10, 0.85, '#d4a017', 0.8);
  m.ball(13.2, 14.6, 9.2, 1.4, SKIN);
  m.ball(18.8, 14.2, 9.4, 1.4, SKIN);
  m.ball(16, 15.6, 10.6, 3.7, SKIN);
  m.ball(16, 16.3, 11.6, 3.1, '#3b2a1a');
}

const LEAVES = ['#4d7c0f', '#65a30d', '#3f6212', '#84cc16'];

function bareBack(m, top, skin, shade) {
  m.limb(10.6, top, 7, 21.4, top, 7, 2.1, skin);
  [[top + 0.6, 4.6], [top + 2.2, 3.9], [top + 3.8, 3.2]].forEach(([y, half], i) => {
    m.limb(16 - half, y, 8.4 - i * 0.5, 16 + half, y, 8.4 - i * 0.5, 1, i % 2 ? shade : skin);
  });
}

function leafSkirt(m, cy) {
  for (let i = 0; i < 11; i++) {
    const a = Math.PI * (-0.15 + 1.3 * i / 10), x = 16 + Math.cos(a) * 4.4, y = cy + Math.sin(a) * 1.8;
    m.limb(x, y, 5.6, x + Math.cos(a) * 1.6, y + Math.sin(a) * 1.4 + 0.8, 4.4, 1, LEAVES[i % 4], 0.3, 0.4);
  }
}

const BOW = { tilt: -0.35, nock: [[21.4, 18.6], [19.6, 16.8], [17.8, 14.2]] };

function arrow(m, tail, head, z) {
  m.limb(tail[0], tail[1], z, head[0], head[1], z + 0.2, 0.35, '#c8a26a');
  m.ball(head[0], head[1], z + 0.2, 0.6, '#9ca3af', 0.6);
  const len = Math.hypot(head[0] - tail[0], head[1] - tail[1]), ux = (head[0] - tail[0]) / len;
  const uy = (head[1] - tail[1]) / len;
  for (const side of [-1, 1]) {
    m.limb(tail[0] + ux * 0.6, tail[1] + uy * 0.6, z, tail[0] - uy * side * 0.9, tail[1] + ux * side * 0.9, z, 0.3,
      side < 0 ? '#ef4444' : '#f5f5f4');
  }
}

function forester(m) {
  const drawn = m.reload < 0, hand = drawn ? [17.2, 15.4] : BOW.nock[m.reload];
  legs(m, 16, 25.8, SKIN, 0, 2.2, 1.6, 1.8);
  leafSkirt(m, 24.6);
  m.limb(19.2, 25, 5.4, 21.4, 19.6, 8, 1.1, '#7a4e26', 0.3, 0.9);
  m.limb(21.2, 20.2, 8.2, 21.6, 19.2, 8.4, 1, '#5c3a1c');
  for (const [x, y, c] of [[21.2, 18.4, '#ef4444'], [22.2, 18.9, '#f5f5f4'], [21.9, 17.9, '#f5f5f4']]) {
    m.egg(x, y, 8.8, 0.6, 0.4, 0.3, c);
  }
  bareBack(m, 19.8, SKIN, '#d39a70');
  m.limb(11.8, 19, 8.9, 19.6, 21.6, 8.5, 0.3, '#5c3a1c');
  m.limb(12.4, 24, 7.2, 19.6, 24, 7.2, 0.5, '#3f6212');
  m.limb(10.8, 20, 7.4, 15.2, 11.4, 8.8, 1.3, SKIN);
  m.limb(21.2, 20, 7.4, hand[0], hand[1], 8.6, 1.3, SKIN);
  const q = turned(m, 16, 10.6, BOW.tilt);
  q.limb(16, 10.6, 9.4, 12.2, 11.2, 9.6, 0.9, '#8a5a2e', 0.2, 0.75);
  q.limb(12.2, 11.2, 9.6, 9.2, 13.6, 9.4, 0.75, '#7a4e26', 0.2, 0.45);
  q.limb(16, 10.6, 9.4, 19.4, 11.2, 9.6, 0.9, '#8a5a2e', 0.2, 0.75);
  q.limb(19.4, 11.2, 9.6, 20.9, 11.6, 9.6, 0.7, '#b07d45', 0, 0.6);
  q.limb(20.9, 11.6, 9.6, 22.8, 13.6, 9.4, 0.6, '#7a4e26', 0.2, 0.4);
  q.ball(20.2, 11.4, 10.2, 0.6, '#3f2a18');
  const tips = [q.at(9.2, 13.6), q.at(22.8, 13.6)];
  const rest = [(tips[0][0] + tips[1][0]) / 2, (tips[0][1] + tips[1][1]) / 2];
  if (drawn) {
    for (const [x, y] of tips) m.limb(x, y, 9.2, 16.8, 15.4, 9.6, 0.22, '#e7e5e4');
    arrow(m, [16.6, 15.2], [16.1, 6.4], 10);
  } else {
    m.limb(tips[0][0], tips[0][1], 9.2, tips[1][0], tips[1][1], 9.2, 0.22, '#e7e5e4');
    if (m.reload === 1) arrow(m, hand, [hand[0] - 2.6, hand[1] - 7.6], 10.2);
    if (m.reload === 2) arrow(m, rest, [16.1, 6.4], 10);
  }
  m.ball(15.2, 11.2, 9.6, 1.25, SKIN);
  m.ball(hand[0], hand[1], 9.8, 1.25, SKIN);
  m.ball(16, 18.2, 10.6, 3.6, SKIN);
  m.ball(16, 18.9, 11.6, 3.1, '#4a3524');
  for (const [x, y, c] of [[14.4, 17.6, LEAVES[1]], [17.8, 19.6, LEAVES[0]]]) m.egg(x, y, 14.4, 1, 0.6, 0.4, c);
}

function druid(m) {
  robed(m, {
    robe: '#5b4a2e', dark: '#3f2f1c', sleeve: '#4d6b2f', trim: '#3f6212', hands: [11.6, 15, 21, 12.6],
    weapon: (q) => {
      q.limb(21, 13, 6, 21.4, 10.4, 15.6, 0.75, '#6b4a2b');
      q.limb(21.4, 10.4, 15.6, 22.8, 8.8, 16.6, 0.65, '#7a5a35');
      q.limb(22.8, 8.8, 16.6, 22.2, 7, 17, 0.6, '#6b4a2b');
      q.limb(22.2, 7, 17, 20.6, 7.4, 16.8, 0.55, '#7a5a35');
      q.ball(21.6, 8.8, 17, 1.2, '#86efac', 1);
      for (const [x, y] of [[20.6, 8.2], [22.2, 9.6], [21.2, 9.8]]) q.egg(x, y, 17.4, 0.6, 0.4, 0.3, '#bbf7d0');
    },
    head: (q) => {
      q.ball(16, 17, 11.2, 4.2, SKIN);
      q.ball(16, 18, 12.2, 3.5, '#5b4a2e');
      for (let i = 0; i < 10; i++) {
        const a = i * Math.PI / 5;
        q.egg(16 + Math.cos(a) * 3.6, 17.6 + Math.sin(a) * 3.4, 13.4, 1.1, 0.7, 0.5, LEAVES[i % 4]);
      }
    },
  });
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (0.1 + 0.8 * i / 8), x = 16 + Math.cos(a) * 7.6, y = 22 + Math.sin(a) * 6.6;
    m.egg(x, y, 4.6, 1.2, 0.8, 0.5, LEAVES[i % 4]);
  }
  for (const [ax, ay, bx, by] of [[11, 25, 9.6, 28.6], [16, 27, 16.4, 30.6], [21, 25, 22.6, 28.4]]) {
    m.limb(ax, ay, 2.6, bx, by, 1, 0.5, '#3f2a18', 0, 0.25);
  }
}

function crossbowman(m) {
  legs(m, 16, 25.6, '#3b2a1a', 0, 2.2, 1.6, 1.8);
  m.limb(10.6, 20, 7, 21.4, 20, 7, 2.1, '#6b4423');
  [[20.6, 4.6], [22.2, 3.9], [23.8, 3.2]].forEach(([y, half], i) => {
    m.limb(16 - half, y, 8.4 - i * 0.5, 16 + half, y, 8.4 - i * 0.5, 1, i % 2 ? '#5a3a1e' : '#7a4f29');
  });
  m.limb(16, 20.4, 9, 16, 24, 7.4, 0.3, '#3b2a1a');
  m.limb(12.4, 24.6, 6.6, 19.6, 24.6, 6.6, 0.5, '#2a1d12');
  const [lx, ly, rx, ry] = reloadHands(m, [15.2, 8.6, 16.8, 13.8]);
  m.limb(10.8, 20.2, 7.4, lx, ly, 8.6, 1.3, '#6b4423');
  m.limb(21.2, 20.2, 7.4, rx, ry, 8.6, 1.3, '#6b4423');
  const q = swing(m, rx, ry);
  q.limb(16, 17, 9.6, 16, 3.4, 9.8, 1, '#5c3d22');
  q.limb(16, 16.4, 10.4, 16, 12.8, 10.4, 0.6, '#3b2a1a');
  for (const side of [-1, 1]) {
    q.limb(16, 4.4, 10, 16 + side * 4.6, 5.2, 10, 0.75, '#2d323b', 0.5);
    q.limb(16 + side * 4.6, 5.2, 10, 16 + side * 7.2, 6.8, 9.8, 0.6, '#2d323b', 0.5, 0.4);
    q.ball(16 + side * 7.2, 6.8, 9.8, 0.55, METAL, 0.7);
    q.limb(16 + side * 7.2, 6.8, 10.2, 16, m.reload < 0 ? 10.4 : 6.2, 10.6, 0.2, '#e7e5e4');
  }
  q.limb(16, 4.6, 10.6, 16, 2.4, 10.6, 0.5, METAL, 0.6);
  q.limb(15, 2.6, 10, 17, 2.6, 10, 0.35, METAL, 0.6);
  if (m.reload < 0) {
    q.limb(16, 10.2, 11, 16, 3.4, 11, 0.32, '#a16207');
    q.ball(16, 3, 11, 0.5, '#cbd5e1', 0.8);
  }
  q.limb(16.8, 13.4, 9.6, 17.4, 14.6, 9.2, 0.35, '#111827');
  if (m.reload >= 0) {
    m.limb(lx - 0.3, ly + 1.6, 10.4, lx + 0.3, ly - 2, 10.6, 0.32, '#a16207');
    m.ball(lx + 0.3, ly - 2.3, 10.8, 0.5, '#cbd5e1', 0.8);
  }
  m.ball(lx, ly, 9.6, 1.2, '#3b2a1a');
  m.ball(rx, ry, 9.6, 1.2, '#3b2a1a');
  m.ball(16, 18.4, 10.6, 3.6, SKIN);
  m.egg(16, 18.8, 11.4, 3.9, 3.8, 3.1, '#3f2a18', 0.2);
  m.limb(16, 21.2, 12, 16, 24.6, 9.8, 1.4, '#3f2a18', 0, 0.4);
  m.limb(13, 15.8, 13.6, 19, 15.8, 13.6, 0.45, '#5a3a1e');
}

const HEX = { toxic: ['#22c55e', '#a3e635', '#ecfccb'], plague: ['#1e1033', '#6d28d9', '#c4b5fd'] };

function witch(m, fire = HEX.toxic) {
  robed(m, {
    robe: '#6b21a8', dark: '#4c1d95', sleeve: '#7e22ce', trim: '#84cc16', hands: [11.6, 15, 20.6, 12],
    weapon: (q) => {
      q.ball(20.6, 10.6, 11.4, 1.6, fire[0], 1);
      q.ball(20.4, 9.4, 12.4, 1.2, fire[1], 1);
      q.ball(20.8, 8.4, 13.2, 0.7, fire[2], 1);
    },
    head: (q) => {
      q.ball(16, 17, 11.2, 4.2, '#c4e7a8');
      q.egg(16, 17.6, 12.2, 6.4, 6, 0.6, '#4c1d95');
      q.egg(16, 17.6, 12.6, 4.2, 4, 0.5, '#84cc16');
      q.limb(16, 17.8, 13, 16.6, 19.6, 15.6, 2.7, '#6b21a8', 0, 1.9);
      q.limb(16.6, 19.6, 15.6, 18, 21.6, 17.4, 1.9, '#7e22ce', 0, 1.1);
      q.limb(18, 21.6, 17.4, 19.8, 22.4, 17.8, 1.1, '#6b21a8', 0, 0.45);
      q.egg(15.2, 18.6, 15.8, 0.9, 0.7, 0.4, '#84cc16');
    },
  });
}

function giantTurret(m) {
  m.egg(16, 20, 0, 8.6, 8, 1.6, '#2f353f');
  m.egg(16, 20, 1, 7.4, 6.9, 1.2, '#4b5361', 0.4);
  for (let i = 0; i < 10; i++) {
    const a = i * Math.PI / 5;
    m.ball(16 + Math.cos(a) * 6.6, 20 + Math.sin(a) * 6.1, 2, 0.45, '#9ca3af', 0.6);
  }
  m.egg(16, 18.6, 2, 2.6, 2.6, 2.4, '#565f6d', 0.5);
  for (const [x, y] of [[21.4, 23.6], [22.4, 22.2], [10.6, 24.4]]) {
    m.limb(x, y, 2.4, x + 0.7, y + 0.3, 2.4, 0.35, '#d4a017', 0.8);
  }
  m.egg(16, 23.4, 3.4, 3.8, 3, 1.6, '#3f3f46', 0.3);
  m.limb(12.2, 25.4, 6, 14.6, 26.8, 6.4, 1.2, '#27272a', 0.3);
  m.limb(14.6, 26.8, 6.4, 17.4, 26.8, 6.4, 1.2, '#27272a', 0.3);
  m.limb(17.4, 26.8, 6.4, 19.8, 25.4, 6, 1.2, '#27272a', 0.3);
  for (const side of [-1, 1]) m.limb(16 + side * 4, 24.8, 5.4, 16 + side * 4.2, 21.4, 5.4, 0.8, '#27272a');
  m.egg(16, 22.6, 5.6, 3.3, 2.6, 2.8, '#f97316');
  for (const side of [-1, 1]) {
    m.limb(16 + side * 2.8, 21.8, 7, 16 + side * 2.2, 18.2, 8.2, 1, '#fb923c');
    m.ball(16 + side * 2.2, 17.8, 8.6, 1.05, '#44403c');
  }
  m.limb(16, 19.4, 7.6, 16, 9.6, 8.2, 2.6, '#323a46', 0.5);
  m.limb(16, 18.6, 10.2, 16, 11, 10.4, 1.3, '#4b5563', 0.6);
  for (const side of [-1, 1]) m.limb(16 + side * 2.2, 18.4, 8.4, 16 + side * 2.2, 17.2, 8.6, 0.55, '#111827');
  m.egg(10.8, 13.8, 6, 2.4, 3, 2.2, '#4d5a2a', 0.3);
  m.limb(9, 13.8, 8.2, 12.6, 13.8, 8.2, 0.4, '#3a4422');
  m.dot(10.2, 12.4, '#a3b36a', 30);
  for (let k = 0; k < 4; k++) {
    m.limb(12.8 + k * 0.7, 13.4 - k * 0.3, 8.4 + k * 0.3, 13.4 + k * 0.7, 13.1 - k * 0.3, 8.6 + k * 0.3, 0.5,
      k % 2 ? '#a16207' : '#facc15', 0.6);
  }
  m.limb(16, 9.8, 8.4, 16, -3.8, 8.4, 1.9, '#1f2937', 0.4);
  for (let y = 8; y > -2.6; y -= 1.3) {
    m.dot(15.3, y, '#6b7280', 20);
    m.dot(16.7, y - 0.6, '#6b7280', 20);
  }
  m.limb(16, -3.6, 8.4, 16, -6.6, 8.4, 2.3, '#111827', 0.5);
  m.ball(16, -6.6, 8.6, 1.1, '#030712');
  m.ball(16, 23.4, 8.2, 2.9, SKIN);
  shaggy(m, 16, 23.6, 8.4, 3);
}


const TEMPLE = { robe: '#ece3cc', dark: '#bfae86', sleeve: '#f3ecda', gold: '#d9a521', light: '#fffbe6', glow: '#fde68a' };

function lightTip(q, x, y, z) {
  for (const [dx, dy, long] of [[0, -1, 3.4], [1, 0, 2.6], [-1, 0, 2.6], [0.7, -0.7, 2.2], [-0.7, -0.7, 2.2]]) {
    q.limb(x + dx * 1.2, y + dy * 1.2, z, x + dx * long, y + dy * long, z + 0.2, 0.42, TEMPLE.gold, 1, 0.12);
  }
  q.limb(x, y + 2.6, z - 0.4, x, y + 0.8, z, 0.6, TEMPLE.gold, 1, 0.45);
  q.ball(x, y, z + 0.4, 1.35, TEMPLE.glow, 1);
  q.ball(x - 0.3, y - 0.3, z + 1.4, 0.75, TEMPLE.light, 1);
}

function vTorso(m, cloth, shade, top = 17, waist = 23) {
  m.limb(10.4, top, 7.4, 21.6, top, 7.4, 2.2, cloth, 0.2);
  m.limb(16, top + 0.4, 7.2, 16, waist, 5.6, 4.6, cloth, 0.2, 2.6);
  m.limb(16, top + 1.6, 9.6, 16, waist - 0.6, 7.8, 0.5, shade, 0, 0.3);
}

function pilgrim(m) {
  robed(m, {
    robe: TEMPLE.robe, dark: TEMPLE.dark, sleeve: TEMPLE.sleeve, trim: TEMPLE.gold, hands: [12, 14.6, 20.5, 12.4],
    weapon: (q) => {
      q.limb(20.5, 16.4, 9.6, 20.5, 6.6, 10.8, 0.62, '#8a5a2e', 0.2, 0.55);
      q.limb(20.5, 13.6, 10.2, 20.5, 11.2, 10.4, 0.7, '#5c3d22');
      lightTip(q, 20.5, 4.4, 11.2);
    },
    head: (q) => {
      q.egg(16, 18, 11, 4.4, 5, 3.6, TEMPLE.robe);
      q.limb(16, 20, 12.4, 16, 23.6, 10.4, 1.5, TEMPLE.dark, 0, 0.6);
      q.egg(16, 14.4, 11.8, 2.6, 1.7, 1.6, '#5a4630');
      q.egg(16, 14, 12.1, 1.7, 1.1, 1.1, SKIN);
      q.limb(13, 16, 13.6, 13.6, 21, 12.6, 0.4, TEMPLE.gold, 0.6);
      q.limb(19, 16, 13.6, 18.4, 21, 12.6, 0.4, TEMPLE.gold, 0.6);
    },
  });
  m.limb(11.6, 21.6, 6.4, 20.4, 21.6, 6.4, 0.55, '#a07a42');
  for (const x of [12.4, 13.2]) m.limb(x, 21.8, 6.2, x - 0.3, 25.4, 4.8, 0.35, '#a07a42', 0, 0.25);
}

const WING = { white: '#fffaf0', cream: '#f2e3bd', gold: '#e8c25a', bone: '#f8f0dc' };

const FLAPS = [0.05, 0.45, 0.85, 0.45];
const WING_SPAN = 0.65;

function wing(m, side, flap) {
  const lean = FLAPS[flap], c = Math.cos(lean), rise = Math.sin(lean);
  const at = (x, y, z) => [16 + side * (2 + (x - 2) * c * WING_SPAN), 19.4 + (y - 19.4) * WING_SPAN,
    z + (x - 2) * rise * 1.1 * WING_SPAN];
  const arm = [[2.6, 19.4, 9.6], [7.4, 21.4, 10.4], [12, 24.4, 11], [15.6, 28.6, 11.4]];
  const along = (f) => {
    const k = f * (arm.length - 1), j = Math.min(arm.length - 2, Math.floor(k)), u = k - j;
    return arm[j].map((v, n) => v + (arm[j + 1][n] - v) * u);
  };
  for (let i = 0; i < 18; i++) {
    const f = i / 17, root = along(f), long = 4.6 + f * 6.6, spread = 1.15 - f * 0.75;
    const x = root[0] - Math.cos(spread) * long * 0.35 + f * 1.2, y = root[1] + Math.sin(spread) * long;
    const [ax, ay, az] = at(root[0], root[1], root[2]), [bx, by, bz] = at(x, y, root[2] - 1.2);
    m.limb(ax, ay, az, bx, by, bz, 1.2 - f * 0.25, i % 3 ? WING.white : WING.cream, 0.3, 0.5);
    if (i % 3 === 1) m.egg(bx, by, bz + 0.3, 0.5, 0.7, 0.3, WING.gold, 0.8);
  }
  for (let i = 0; i < 13; i++) {
    const root = along(i / 12);
    const [ax, ay, az] = at(root[0], root[1], root[2] + 0.6), [bx, by, bz] = at(root[0] - 0.4, root[1] + 3, root[2]);
    m.limb(ax, ay, az, bx, by, bz, 1.1, WING.white, 0.4, 0.7);
  }
  for (let i = 0; i < arm.length - 1; i++) {
    const [ax, ay, az] = at(...arm[i]), [bx, by, bz] = at(...arm[i + 1]);
    m.limb(ax, ay, az + 0.8, bx, by, bz + 0.8, 0.85, WING.bone, 0.5, 0.7);
  }
}

function foldedWing(m, side) {
  for (let i = 0; i < 9; i++) {
    const f = i / 8, x = 16 + side * (3.2 + f * 2.4), y = 18.4 + f * 1.4;
    m.limb(x, y, 10.6 - f * 0.6, 16 + side * (2.6 + f * 1.6), 29.4 + f * 2.6, 4 - f, 1.25 - f * 0.3,
      i % 3 ? WING.white : WING.cream, 0.3, 0.5);
    if (i % 3 === 1) m.egg(16 + side * (2.6 + f * 1.6), 30 + f * 2.6, 4.4 - f, 0.5, 0.8, 0.3, WING.gold, 0.8);
  }
  m.limb(16 + side * 3, 18.2, 11.4, 16 + side * 5.6, 22.6, 10.8, 0.9, WING.bone, 0.5, 0.7);
}

function angel(m, o = {}) {
  const kneel = Boolean(o.kneel);
  if (kneel) {
    m.egg(16, 22.4, 1, 8.8, 7.2, 0.8, '#efe5cc');
    for (let i = 0; i < 11; i++) {
      const a = Math.PI * (0.1 + 0.8 * i / 10), x = 16 + Math.cos(a) * 8.2, y = 22.4 + Math.sin(a) * 6.6;
      m.limb(16, 21, 2.4, x, y, 1.2, 0.8, i % 2 ? '#faf5e8' : '#e9dcbc', 0, 1.3);
    }
    foldedWing(m, -1);
    foldedWing(m, 1);
  } else {
    wing(m, -1, o.flap || 0);
    wing(m, 1, o.flap || 0);
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (0.18 + 0.64 * i / 8), x = 16 + Math.cos(a) * 5.4, y = 22 + Math.sin(a) * 6.6;
      m.limb(16, 20.4, 3.6, x, y, 1.8, 0.8, i % 2 ? '#faf5e8' : '#e9dcbc', 0, 1.2);
      if (i % 2 === 0) {
        m.limb(x, y, 1.8, x + Math.cos(a) * 0.6, y + 1.6, 1.4, 0.24, TEMPLE.gold, 0.8);
        m.egg(x + Math.cos(a) * 0.7, y + 2.3, 1.3, 0.5, 0.8, 0.4, '#c98a1b', 0.8);
      }
    }
    m.limb(16, 20.6, 4.8, 16, 28.4, 2.6, 0.8, '#c9a227', 0.8, 0.5);
  }
  vTorso(m, '#d9a521', '#f5d77a');
  m.limb(12.4, 21.6, 6.8, 19.6, 21.6, 6.8, 0.5, '#b8860b', 0.8);
  const [lx, ly, rx, ry] = kneel ? [15, 12.6, 17, 12.6] : [11.6, 13.8, 21, 12.8];
  for (const [sx, hx, hy] of [[10.6, lx, ly], [21.4, rx, ry]]) {
    m.limb(sx, 17.2, 7.6, hx, hy + 1.2, 8.6, 1.4, '#e9dcbc', 0, 1.1);
    m.limb(hx, hy + 2.4, 8.8, hx, hy + 0.8, 9, 1.25, '#d9a521', 0.9);
  }
  for (const side of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      m.limb(16 + side * 4.4, 16.2 + k * 1.1, 9 - k * 0.4, 16 + side * 7, 17 + k * 1.2, 8.4 - k * 0.4, 0.9 - k * 0.15,
        k % 2 ? '#b8860b' : '#e0b43a', 1, 0.5);
    }
  }
  if (kneel) {
    m.limb(13, 10.4, 9.6, 19, 10.4, 9.6, 0.65, '#d9a521', 1, 0.45);
    for (const [a, b] of [[0.3, 1.3], [1.9, 2.9], [3.5, 4.5], [5.1, 6.1]]) {
      m.limb(16 + Math.cos(a) * 2.2, 10.4 + Math.sin(a) * 2.2, 9.8, 16 + Math.cos(b) * 2.2, 10.4 + Math.sin(b) * 2.2,
        9.8, 0.36, '#b91c1c', 0.9);
    }
    m.limb(16, 10.4, 9.8, 16, 12.8, 10.6, 0.55, '#c9a227', 0.9);
    m.ball(16, 13.4, 11.2, 0.8, '#d9a521', 1);
  } else if (o.armed) {
    m.limb(rx, ry + 1, 10, rx, ry - 0.4, 10, 0.55, '#c9a227', 0.9);
    m.limb(rx - 2.8, ry - 0.6, 10.2, rx + 2.8, ry - 0.6, 10.2, 0.6, '#d9a521', 1, 0.45);
    m.ball(rx, ry - 0.6, 10.6, 0.8, '#fbbf24', 1);
    for (const [a, b] of [[0.3, 1.3], [1.9, 2.9], [3.5, 4.5], [5.1, 6.1]]) {
      m.limb(rx + Math.cos(a) * 2.2, ry - 0.6 + Math.sin(a) * 2.2, 10.4, rx + Math.cos(b) * 2.2,
        ry - 0.6 + Math.sin(b) * 2.2, 10.4, 0.36, '#b91c1c', 0.9);
    }
    m.limb(rx, ry - 1.4, 10.4, rx, ry - 13.6, 10.8, 1, '#dc2626', 1, 0.5);
    m.limb(rx, ry - 1.4, 11.2, rx, ry - 12.8, 11.4, 0.32, '#fecaca', 1, 0.15);
    m.limb(rx, ry - 13.4, 10.8, rx, ry - 15, 10.8, 0.5, '#b91c1c', 1, 0.1);
    m.limb(rx - 1.6, ry - 9.6, 10.6, rx + 1.6, ry - 9.6, 10.6, 0.32, '#ef4444', 1);
    m.ball(rx, ry + 2.2, 10.2, 0.75, '#d9a521', 1);
  }
  m.ball(lx, ly, 9.6, 1.4, '#d9a521', 1);
  m.ball(rx, ry, 9.6, 1.4, '#d9a521', 1);
  const bow = kneel ? 1.2 : 0;
  m.egg(16, 17.6 - bow, 11.2 - bow, 3.6, 4, 3.4, '#e0b43a', 1);
  m.egg(16, 14.6 - bow, 11.4 - bow, 1.9, 1.1, 1.6, '#b8860b', 0.8);
  m.egg(16, 14.3 - bow, 12.2 - bow, 1.2, 0.5, 0.6, '#3b2a1a');
  m.limb(16, 13.8 - bow, 14.4 - bow, 16, 21.4 - bow, 14 - bow, 0.6, '#f5d77a', 1, 0.3);
  for (const side of [-1, 1]) {
    m.limb(16 + side * 3, 17.4 - bow, 13 - bow, 16 + side * 4.6, 20.6 - bow, 12.6 - bow, 0.5, '#f8e7a8', 1, 0.2);
  }
}

const MONK = { robe: '#d97706', deep: '#b45309', sash: '#facc15', wrap: '#a8a29e', staff: '#1f2937', cap: '#9ca3af' };

function monk(m, strike = false) {
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (0.2 + 0.6 * i / 6), x = 16 + Math.cos(a) * 4.6, y = 22.6 + Math.sin(a) * 4.6;
    m.limb(16, 21.4, 4, x, y, 2.4, 0.9, i % 2 ? MONK.robe : MONK.deep, 0, 1.2);
  }
  vTorso(m, MONK.robe, MONK.deep);
  m.limb(16.4, 17, 7.8, 21.6, 17, 7.6, 2.05, SKIN, 0.3);
  for (const [x, y] of [[20.4, 16.4], [21.4, 17.6]]) m.egg(x, y, 9.7, 0.8, 0.45, 0.25, '#7c4a2a');
  m.limb(11, 16.4, 9.2, 19.6, 22.2, 7.2, 1, MONK.deep, 0, 0.8);
  m.limb(11.8, 22.4, 7.2, 20.2, 22.4, 7.2, 1, MONK.sash, 0.4);
  m.limb(13, 22.8, 7, 12.4, 26.6, 4.6, 0.7, MONK.sash, 0.3, 0.45);
  const [lx, ly, rx, ry] = strike ? [21, 14.6, 21.3, 6.8] : [21.2, 12.4, 21.6, 19.4];
  m.limb(10.6, 17.2, 7.8, lx, ly + 1.4, 8.8, 1.6, MONK.robe, 0, 1.2);
  m.limb(21.4, 17.2, 7.8, rx, ry + 1.4, 8.8, 1.45, SKIN, 0, 1.15);
  for (const [hx, hy, ex] of [[lx, ly, 10.6], [rx, ry, 21.4]]) {
    for (let k = 0; k < 3; k++) {
      const f = 0.45 + k * 0.17, x = ex + (hx - ex) * f, y = 17.2 + (hy + 1.4 - 17.2) * f;
      m.limb(x - 1.2, y + 0.3, 9.4, x + 1.2, y - 0.3, 9.4, 0.4, MONK.wrap, 0.2);
    }
  }
  for (let i = 0; i < 13; i++) {
    const a = Math.PI * (1.1 + 0.8 * i / 12), x = 16 + Math.cos(a) * 4.2, y = 18.4 + Math.sin(a) * 3.2;
    m.egg(x, y, 9.8, i % 4 === 0 ? 0.85 : 0.65, i % 4 === 0 ? 0.75 : 0.6, 0.5, i % 4 === 0 ? '#c9a227' : '#7c4a2a', 0.8);
  }
  if (!strike) {
    m.limb(21.6, 23, 9.6, 21, 3.4, 10.6, 0.7, MONK.staff, 0.6);
    m.limb(21.6, 23, 9.6, 21.55, 21.4, 9.7, 0.78, MONK.cap, 1);
    m.limb(21.05, 5, 10.5, 21, 3.4, 10.6, 0.78, MONK.cap, 1);
    for (const y of [14.8, 15.8, 9.8, 10.8]) {
      const x = 21.55 - (23 - y) * 0.03;
      m.limb(x, y + 0.25, 10.3, x, y - 0.25, 10.3, 0.78, '#44403c', 0.3);
    }
  }
  m.ball(lx, ly, 9.8, 1.4, SKIN);
  m.ball(rx, ry, 9.8, 1.4, SKIN);
  const lean = strike ? 1 : 0;
  m.egg(16 + lean * 0.6, 17.4 - lean, 11, 3.5, 3.8, 3.4, SKIN, 0.6);
  m.limb(16 + lean * 0.6, 15 - lean, 11.6, 16 + lean * 0.6, 12.4 - lean, 10.2, 1.9, '#3b2414', 0, 1.1);
  for (const side of [-1, 1]) {
    m.limb(16 + lean * 0.6 + side * 2.6, 16.4 - lean, 11.4, 16 + lean * 0.6 + side * 1.2, 13.6 - lean, 10.8, 0.7, '#3b2414');
  }
  for (const [x, y] of [[16, 15.6], [15.2, 16.4], [16.8, 16.4]]) m.ball(x + lean * 0.6, y - lean, 14.2, 0.32, '#3b2414');
}

const INQ = { robe: '#f8f6f0', fold: '#ddd6c6', gold: '#d9a521', bright: '#f5d77a', steel: '#cbd5e1', iron: '#94a3b8' };

function inquisitor(m) {
  gown(m, { dress: INQ.robe, fold: INQ.fold, trim: INQ.gold, spread: 7.2 });
  m.limb(16, 21, 4.6, 16, 25.6, 3.4, 1.2, INQ.robe, 0, 0.9);
  m.limb(15, 21.4, 5, 15, 25.4, 3.6, 0.3, INQ.gold, 1);
  m.limb(17, 21.4, 5, 17, 25.4, 3.6, 0.3, INQ.gold, 1);
  vTorso(m, INQ.steel, INQ.iron);
  m.limb(12.8, 16.4, 9.4, 16, 21.6, 8.4, 0.4, INQ.gold, 1);
  m.limb(19.2, 16.4, 9.4, 16, 21.6, 8.4, 0.4, INQ.gold, 1);
  const [lx, ly, rx, ry] = [12, 14.8, 20.6, 12.2];
  for (const [sx, hx, hy] of [[10.6, lx, ly], [21.4, rx, ry]]) {
    m.limb(sx, 17.2, 7.6, hx, hy + 1.4, 8.6, 1.4, INQ.robe, 0, 1.5);
    m.limb(hx, hy + 2.6, 8.8, hx, hy + 1, 9, 1.3, INQ.iron, 0.9);
  }
  for (const side of [-1, 1]) {
    for (let k = 0; k < 2; k++) {
      m.limb(16 + side * 4.4, 16.2 + k * 1.2, 9 - k * 0.4, 16 + side * 6.9, 17 + k * 1.3, 8.4 - k * 0.4, 0.85 - k * 0.15,
        k ? INQ.gold : INQ.bright, 1, 0.5);
    }
  }
  m.limb(rx, ry + 2.2, 10, rx, ry - 6.6, 10.6, 0.55, INQ.gold, 1, 0.48);
  m.limb(rx, ry - 2, 10.3, rx, ry - 3.2, 10.4, 0.7, '#b8860b', 1);
  const hx = rx, hy = ry - 9.2;
  for (const [dx, dy, long] of [[0, -1, 3.8], [1, 0, 3.2], [-1, 0, 3.2], [0, 1, 2.6]]) {
    m.limb(hx + dx * 1.1, hy + dy * 1.1, 11, hx + dx * long, hy + dy * long, 11, 0.55, INQ.gold, 1, 0.2);
  }
  for (const [dx, dy] of [[0.7, -0.7], [-0.7, -0.7], [0.7, 0.7], [-0.7, 0.7]]) {
    m.limb(hx + dx * 1.2, hy + dy * 1.2, 11, hx + dx * 2.3, hy + dy * 2.3, 11, 0.32, INQ.bright, 1, 0.12);
  }
  m.ball(hx, hy, 11.4, 1.3, '#fff3c4', 1);
  m.ball(hx - 0.3, hy - 0.3, 12.4, 0.7, '#fffdf5', 1);
  m.ball(lx, ly, 9.6, 1.4, INQ.iron, 0.9);
  m.ball(rx, ry, 9.6, 1.4, INQ.iron, 0.9);
  m.egg(16, 18, 11, 4.2, 4.8, 3.6, INQ.robe);
  m.limb(16, 20, 12.2, 16, 23.4, 10.4, 1.4, INQ.fold, 0, 0.6);
  m.egg(16, 14.6, 11.8, 2.4, 1.5, 1.8, INQ.gold, 1);
  m.limb(14.8, 14.4, 13.2, 17.2, 14.4, 13.2, 0.26, '#7c5a10');
  m.limb(16, 13.6, 14.6, 16, 21.6, 14.2, 0.5, INQ.gold, 1, 0.3);
}

function gown(m, o) {
  const spread = o.spread || 6.4, wide = spread * 0.98, long = spread * 0.72 + 0.4, cy = 20.6;
  m.egg(16, cy + 0.6, 2.4, wide, long, 2.2, o.dress, 0.2);
  m.egg(16, cy - 0.4, 3.8, wide * 0.72, long * 0.7, 1.6, o.dress, 0.25);
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (0.2 + 0.6 * i / 6), sway = Math.sin(i * 1.7) * 0.3;
    const x = 16 + Math.cos(a) * (wide - 1.1) + sway, y = cy + 0.6 + Math.sin(a) * (long - 1.1);
    m.limb(16 + Math.cos(a) * 1.8, cy - 0.2 + Math.sin(a) * 1.8, 4.2, x, y, 3, 0.45, i % 2 ? o.fold : o.dress, 0.15, 0.9);
  }
  const hem = [];
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI * (0.06 + 0.88 * i / 16), ripple = 0.25 * Math.sin(i * 1.9);
    hem.push([16 + Math.cos(a) * (wide + ripple), cy + 0.6 + Math.sin(a) * (long + ripple)]);
  }
  for (let i = 0; i < hem.length - 1; i++) {
    m.limb(hem[i][0], hem[i][1], 1.6, hem[i + 1][0], hem[i + 1][1], 1.6, 0.55, o.fold, 0.1);
    if (o.trim) m.limb(hem[i][0], hem[i][1], 2.1, hem[i + 1][0], hem[i + 1][1], 2.1, 0.24, o.trim, 0.8);
  }
}

function lady(m, o) {
  gown(m, o);
  m.limb(11.8, 17, 7.2, 20.2, 17, 7.2, 1.7, o.top, 0.2);
  m.limb(16, 17.2, 7, 16, 21.6, 5.8, 3.4, o.top, 0.2, 2.1);
  if (o.belt) m.limb(13.4, 21, 6.6, 18.6, 21, 6.6, 0.5, o.belt, 0.8);
  const [lx, ly, lz, rx, ry, rz] = o.hands;
  for (const [sx, hx, hy, hz] of [[11.8, lx, ly, lz], [20.2, rx, ry, rz]]) {
    if (o.bent) arm(m, sx, hx, hy, hz, o);
    else m.limb(sx, 17.2, 7.6, hx, hy + 1, hz - 0.6, 1.05, o.sleeve, 0.1, o.wide || 1.1);
  }
  if (o.weapon) o.weapon(m);
  m.ball(lx, ly, lz, 1.05, SKIN);
  m.ball(rx, ry, rz, 1.05, SKIN);
  m.egg(16, 15.2, 11.2, 2.1, 1.5, 1.6, SKIN);
  m.egg(16, 17.4, 11.6, 3.3, 3.5, 3.1, o.hair);
  for (let k = -3; k <= 3; k++) {
    m.limb(16 + k * 0.6, 16.6 + Math.abs(k) * 0.3, 13.8 - Math.abs(k) * 0.4, 16 + k * 0.85, 22.4 + Math.abs(k) * 0.3,
      9.4, 0.62, k % 2 ? o.hair : o.shade, 0.3, 0.4);
  }
  m.limb(16, 15.2, 14.6, 16, 18.4, 14.8, 0.3, o.shade);
  if (o.bun) m.egg(16, 19.2, 14.8, 1.7, 1.5, 1.4, o.hair, 0.3);
  if (o.head) o.head(m);
}

function arm(m, sx, hx, hy, hz, o) {
  const side = Math.sign(sx - 16), sy = 17.2, sz = 7.6, reach = Math.hypot(hx - sx, hy - sy);
  const bend = Math.max(0.7, 1.8 - reach * 0.12), ex = (sx + hx) / 2 + side * bend, ey = (sy + hy) / 2 + bend * 0.4;
  const ez = (sz + hz) / 2 - 0.3, wx = ex + (hx - ex) * 0.8, wy = ey + (hy + 0.6 - ey) * 0.8, wz = ez + (hz - ez) * 0.8;
  m.ball(sx, sy, sz + 0.2, 1.2, o.sleeve, 0.1);
  m.limb(sx, sy, sz, ex, ey, ez, 1.1, o.sleeve, 0.1, 0.85);
  m.ball(ex, ey, ez, 0.86, o.sleeve, 0.1);
  m.limb(ex, ey, ez, wx, wy, wz, 0.8, o.sleeve, 0.1, 0.58);
  const cuff = (o.wide || 1.1) * 0.62, bx = ex + (hx - ex) * 0.66, by = ey + (hy + 0.6 - ey) * 0.66;
  m.limb(bx, by, wz - 0.2, wx, wy, wz, 0.6, o.sleeve, 0.15, cuff);
  m.limb(wx, wy, wz + 0.2, hx, hy + 0.4, hz - 0.3, 0.42, SKIN, 0.1, 0.55);
}

function sorceress(m) {
  lady(m, {
    dress: '#8f6fd1', fold: '#6d4fb0', top: '#a58ae0', sleeve: '#9a7fdb', wide: 1.6, belt: '#e2c27a', bent: true,
    hair: '#e6c36a', shade: '#c39a40', trim: '#f0d58a', hands: [10.6, 18.4, 8, 20.6, 10.2, 13],
    weapon: (q) => {
      q.ball(20.6, 8.8, 14.4, 1, '#ede9fe', 1);
      q.ball(20.4, 8.6, 15.2, 0.5, '#ffffff', 1);
    },
  });
}

const LUTE = { wood: '#b8864b', dark: '#7a5230', face: '#d6a866', string: '#efe6d2' };

function minstrel(m, strum = false) {
  lady(m, {
    dress: '#3a5d7d', fold: '#2b465f', top: '#2f5f80', sleeve: '#2f5f80', hair: '#b8622f', shade: '#8a4420',
    bun: true, trim: '#a3c4d8', bent: true,
    hands: strum ? [13.8, 11.2, 10.2, 18.6, 13, 10.6] : [13.8, 11.2, 10.2, 21.2, 15.8, 9.8],
    weapon: (q) => {
      q.egg(19.6, 14.4, 9.2, 2.8, 3, 1.3, LUTE.wood, 0.6);
      q.egg(19.4, 14.1, 10.2, 2.1, 2.3, 0.5, LUTE.face, 0.4);
      q.ball(18.9, 13.4, 10.6, 0.7, '#3b2414');
      q.limb(17.8, 12.6, 10.4, 13.6, 10.2, 10.8, 0.55, LUTE.dark, 0.4, 0.45);
      q.limb(13.6, 10.2, 10.8, 12.4, 9.4, 11, 0.62, LUTE.wood, 0.5, 0.5);
      for (const off of [-0.3, 0.3]) {
        q.limb(20.1 + off, 15.6 + off, 10.7, 13.8 + off, 10.6 - off, 11.1, 0.1, LUTE.string, 1);
      }
      q.limb(13, 21.4, 7.4, 21.4, 13, 9, 0.35, '#5c3d22');
    },
  });
  m.limb(11.4, 16.4, 8.4, 20.6, 16.4, 8.4, 1.1, '#26465f', 0.2);
}

const BOOK = { cover: '#4a2410', edge: '#2a1408', page: '#f3ead6', leaf: '#e8dcc0', spine: '#2a1408', ink: '#9a8a70' };

function enchantress(m, pose = '') {
  const hands = pose === 'beam' ? [14.5, 10.4, 10.4, 17.5, 10.4, 10.4] : pose === 'cast' ? [11.6, 12.8, 8.2, 20.4, 10.2, 10.6]
    : pose === 'draw' ? [11.6, 12.8, 8.2, 14, 12.2, 10.8] : [11.6, 12.8, 8.2, 20.4, 16.4, 8.6];
  lady(m, {
    dress: '#2a3350', fold: '#1c2336', top: '#efe9dc', sleeve: '#46557a', hair: '#1c1a22', shade: '#3a3646', bun: true,
    trim: '#5b6b8f', belt: '#4b5563', hands, bent: true,
    weapon: (q) => {
      if (pose === 'beam') {
        q.sheet([[8.4, 16.6], [11.6, 16.2], [11.9, 20.6], [8.7, 21]], 6.6, BOOK.cover);
        q.sheet([[8.8, 16.8], [11.4, 16.5], [11.6, 20.3], [9, 20.6]], 6.9, BOOK.edge);
        q.limb(8.5, 16.7, 6.8, 8.8, 20.9, 6.8, 0.3, BOOK.spine, 0.3);
        for (const [x, y] of [[8.4, 16.6], [11.6, 16.2], [11.9, 20.6], [8.7, 21]]) q.ball(x, y, 6.9, 0.4, '#d9a521', 1);
        q.limb(10, 16.5, 7, 10.2, 21, 7, 0.14, '#b91c1c', 0.4);
        q.ball(16, 8.6, 11.2, 0.9, '#e0f7ff', 1);
        return;
      }
      q.sheet([[8.2, 9.9], [15, 9.9], [15.2, 15.3], [8, 15.3]], 9.3, BOOK.cover);
      q.sheet([[8.5, 10.2], [14.7, 10.2], [14.9, 15], [8.3, 15]], 9.6, BOOK.edge);
      q.sheet([[8.7, 10.3], [11.5, 10.7], [11.5, 14.8], [8.6, 14.6]], 10.1, BOOK.page);
      q.sheet([[11.7, 10.7], [14.5, 10.3], [14.6, 14.6], [11.7, 14.8]], 10.1, BOOK.leaf);
      q.limb(11.6, 10.4, 10.2, 11.6, 15, 10.2, 0.2, BOOK.spine, 0.3);
      for (const [x, y] of [[8.2, 9.9], [15, 9.9], [15.2, 15.3], [8, 15.3]]) q.ball(x, y, 9.6, 0.45, '#d9a521', 1);
      for (const y of [11.4, 12.1, 12.8, 13.5]) {
        q.limb(9.1, y, 10.3, 11.1, y + 0.2, 10.3, 0.08, BOOK.ink);
        q.limb(12.1, y + 0.2, 10.3, 14.1, y, 10.3, 0.08, BOOK.ink);
      }
      q.limb(13.2, 10.6, 10.4, 13.4, 16.4, 9.2, 0.16, '#b91c1c', 0.4);
      if (pose) {
        const [x, y, z] = pose === 'cast' ? [20.4, 8.6, 11.6] : [14, 10.9, 11.6];
        q.ball(x, y, z, 1.1, '#38bdf8', 1);
        q.ball(x - 0.3, y - 0.3, z + 0.8, 0.5, '#e0f7ff', 1);
      }
    },
  });
}

const FEATHER = { white: '#f5f3ee', tip: '#1f1b1a', shaft: '#8a8070' };

function shamaness(m, beat = false) {
  lady(m, {
    dress: '#4a3426', fold: '#36261b', top: '#3a2a20', sleeve: '#c9a882', hair: '#6b4a2f', shade: '#4a311d', spread: 6,
    hands: beat ? [11, 13.6, 9.8, 14.4, 12.8, 10.6] : [11, 13.6, 9.8, 21, 12.6, 10],
    weapon: (q) => {
      q.egg(10.8, 13.2, 9.2, 3.4, 3.4, 1, '#7c2d12', 0.5);
      q.egg(10.8, 13.2, 9.9, 2.9, 2.9, 0.5, '#e2d2b0', 0.2);
      for (let i = 0; i < 10; i++) {
        const a = i * Math.PI / 5, x = 10.8 + Math.cos(a) * 3.1, y = 13.2 + Math.sin(a) * 3.1;
        q.limb(x, y, 10, 10.8 + Math.cos(a) * 2.5, 13.2 + Math.sin(a) * 2.5, 10.1, 0.14, '#1f1410');
      }
      for (const a of [2.4, 3.3, 4.1]) {
        const x = 10.8 + Math.cos(a) * 3.4, y = 13.2 + Math.sin(a) * 3.4;
        q.limb(x, y, 9, x + Math.cos(a) * 2.2, y + Math.sin(a) * 2.2 + 0.8, 8, 0.32, FEATHER.white, 0.2, 0.12);
        q.limb(x + Math.cos(a) * 1.6, y + Math.sin(a) * 1.6 + 0.6, 8.3, x + Math.cos(a) * 2.2, y + Math.sin(a) * 2.2 + 0.8,
          8, 0.3, FEATHER.tip, 0.2, 0.1);
      }
      const [hx, hy, tx, ty] = beat ? [14.4, 12.8, 11.6, 12.4] : [21, 12.6, 20.4, 7.6];
      q.limb(hx, hy + 0.8, 10.6, tx, ty, 11.2, 0.42, '#6b4423', 0.3, 0.55);
      q.ball(tx, ty, 11.4, 0.8, '#8a5a2e', 0.3);
      for (const [dx, dy] of [[-0.8, 0.6], [0.8, 0.4], [0, -0.8]]) q.ball(tx + dx, ty + dy, 11.6, 0.42, '#e0b43a', 1);
    },
    head: (q) => {
      for (let i = 0; i < 11; i++) {
        const a = Math.PI * (0.18 + 0.64 * i / 10), long = 3.6 + (i % 3) * 0.4;
        const bx = 16 + Math.cos(a) * 3.2, by = 17.6 + Math.sin(a) * 3.2, ex = 16 + Math.cos(a) * (3.2 + long);
        const ey = 17.6 + Math.sin(a) * (3.2 + long), drop = 4.6;
        q.limb(bx, by, 14.2, ex, ey, 14.2 - drop, 0.75, FEATHER.white, 0.2, 0.4);
        q.limb(bx + (ex - bx) * 0.68, by + (ey - by) * 0.68, 14.2 - drop * 0.68, ex, ey, 14.2 - drop, 0.62, FEATHER.tip,
          0.2, 0.3);
        q.limb(bx, by, 14.6, ex, ey, 14.6 - drop, 0.08, FEATHER.shaft);
      }
      for (let i = 0; i < 14; i++) {
        const a = Math.PI * (1.05 + 0.9 * i / 13);
        const bead = ['#dc2626', '#2563eb', '#f5f3ee', '#f59e0b'][i % 4];
        q.ball(16 + Math.cos(a) * 3.2, 17.4 + Math.sin(a) * 3.3, 14.4, 0.42, bead);
      }
    },
  });
  for (const [x, y] of [[11.6, 18], [13, 20.4], [16, 21.4], [19, 20.4], [20.4, 18]]) {
    m.egg(x, y, 7.8, 1.9, 1.6, 1.4, '#d6c7ad', 0.1);
  }
}

const SKINS = {
  pyro: ragged,
  forester,
  'forester-ragged': forester,
  'forester-druid': druid,
  'forester-hunter': crossbowman,
  'forester-witch': witch,
  'forester-witch-plague': (m) => witch(m, HEX.plague),
  mechanic: wrench,
  'mechanic-ragged': wrench,
  'mechanic-turret': turreteer,
  'mechanic-demo': demoman,
  'mechanic-mortar': mortarman,
  'mechanic-turret-giant': giantTurret,
  sniper: recruit,
  'sniper-ragged': recruit,
  'sniper-scope': ghillie,
  'sniper-assault': assault,
  'sniper-marksman': marksman,
  'pyro-ragged': ragged,
  'pyro-fireball': (m) => fireballMage(m, '#f97316', '#fde047', false),
  'pyro-fireball-blue': (m) => fireballMage(m, '#3b82f6', '#e0f2ff', false),
  'pyro-fireball-twin': (m) => fireballMage(m, '#f97316', '#fde047', true),
  'pyro-fireball-twin-blue': (m) => fireballMage(m, '#3b82f6', '#e0f2ff', true),
  'pyro-dragon': (m) => dragon(m, DRAGONS.red),
  'pyro-dragon-blue': (m) => dragon(m, DRAGONS.blue),
  'pyro-dragon-fly': (m) => dragonFly(m, DRAGONS.red, 1),
  'pyro-dragon-flap': (m) => dragonFly(m, DRAGONS.red, 0.72),
  'pyro-dragon-blue-fly': (m) => dragonFly(m, DRAGONS.blue, 1),
  'pyro-dragon-blue-flap': (m) => dragonFly(m, DRAGONS.blue, 0.72),
  'pyro-ignite': (m) => igniteMage(m, '#f97316', '#fde047'),
  'pyro-ignite-blue': (m) => igniteMage(m, '#3b82f6', '#e0f2ff'),
  thunder: stormMage,
  'thunder-ragged': stormMage,
  'thunder-caller': (m) => stormCaller(m),
  'thunder-caller-strike': (m) => stormCaller(m, true),
  'thunder-raiju': (m) => raiju(m),
  'thunder-raiju-swipe': (m) => raiju(m, true),
  'thunder-thor': (m) => thor(m),
  'thunder-thor-throw': (m) => thor(m, 'throw'),
  'thunder-thor-empty': (m) => thor(m, 'empty'),
  'thunder-thor-catch': (m) => thor(m, 'catch'),
  priest: pilgrim,
  'priest-ragged': pilgrim,
  'priest-angel': (m) => angel(m, { armed: true }),
  'priest-angel-w0': (m) => angel(m, { flap: 0 }),
  'priest-angel-w1': (m) => angel(m, { flap: 1 }),
  'priest-angel-w2': (m) => angel(m, { flap: 2 }),
  'priest-angel-w3': (m) => angel(m, { flap: 3 }),
  'priest-angel-kneel': (m) => angel(m, { kneel: true }),
  'priest-monk': (m) => monk(m),
  'priest-monk-strike': (m) => monk(m, true),
  'priest-inquisitor': inquisitor,
  sorceress,
  'sorceress-ragged': sorceress,
  'sorceress-minstrel': (m) => minstrel(m),
  'sorceress-minstrel-strum': (m) => minstrel(m, true),
  'sorceress-enchantress': (m) => enchantress(m),
  'sorceress-enchantress-draw': (m) => enchantress(m, 'draw'),
  'sorceress-enchantress-cast': (m) => enchantress(m, 'cast'),
  'sorceress-enchantress-beam': (m) => enchantress(m, 'beam'),
  'sorceress-shamaness': (m) => shamaness(m),
  'sorceress-shamaness-beat': (m) => shamaness(m, true),
};

const HEROES = Object.assign({}, MAGES, SKINS);
export const HERO_IDS = Object.keys(HEROES);

const STAFF = [[12.5, 3]];
const PISTOL = [[16, 6.8]];
const STICK = [[12.4, 3]];
const PALM = [[20.5, 10.6]];
const PALMS = [[20.5, 10.6], [11.5, 10.6]];
const MOUTH = [[16, 2.7]];
const HIGH_MOUTH = [[16, 1.7]];

export const MUZZLES = {
  pyro: STICK, 'pyro-ragged': STICK, 'pyro-fireball': PALM, 'pyro-fireball-blue': PALM, 'pyro-fireball-twin': PALMS,
  'pyro-fireball-twin-blue': PALMS, 'pyro-ignite': [[20.5, 7.5]], 'pyro-ignite-blue': [[20.5, 7.5]],
  'pyro-dragon': MOUTH, 'pyro-dragon-blue': MOUTH, 'pyro-dragon-fly': HIGH_MOUTH, 'pyro-dragon-flap': HIGH_MOUTH,
  'pyro-dragon-blue-fly': HIGH_MOUTH, 'pyro-dragon-blue-flap': HIGH_MOUTH, sniper: PISTOL, 'sniper-ragged': PISTOL,
  'sniper-scope': [[16, -7]], 'sniper-assault': [[16, -4.9]], 'sniper-marksman': [[16, -6]],
  forester: [[16.1, 6.4]], 'forester-ragged': [[16.1, 6.4]], 'forester-druid': [[21.6, 8.8]],
  'forester-hunter': [[16, 2.4]], 'forester-witch': [[20.6, 8.6]], 'forester-witch-plague': [[20.6, 8.6]],
  mechanic: [[19.2, 6.8]], 'mechanic-ragged': [[19.2, 6.8]], 'mechanic-turret': [[19.6, 6.4]],
  'mechanic-demo': [[21.2, 1]], 'mechanic-mortar': [[16, 8.6]],
  'mechanic-turret-giant': [[16, -6.6]],
  priest: [[20.5, 4.4]], 'priest-ragged': [[20.5, 4.4]],
  'priest-angel': [[21, -1]], 'priest-monk': [[21, 3.4]], 'priest-inquisitor': [[20.6, 3]],
  sorceress: [[20.6, 8.6]], 'sorceress-ragged': [[20.6, 8.6]], 'sorceress-minstrel': [[19.4, 14]],
  'sorceress-enchantress': [[20.4, 8.6]], 'sorceress-enchantress-beam': [[16, 8.4]], 'sorceress-shamaness': [[10.8, 13.2]],
  frost: STAFF, earth: STAFF, shaman: STAFF, thunder: PALM, 'thunder-ragged': PALM, 'thunder-caller': STAFF,
  'thunder-caller-strike': [[12.5, 0.4]], 'thunder-raiju': [[16, 3.6]], 'thunder-thor': [[21, 13]],
};

export const RELOAD_FRAMES = RELOAD.frames;

export const FINE_HEROES = /^(priest|sorceress|thunder-(raiju|thor))/;
export const ANGEL_BODY = 1.15;
export const HERO = { scale: 1.3, center: [16, 18] };
const BODIES = [[/^priest-angel/, ANGEL_BODY], [/^priest-(monk|inquisitor)/, 1.25], [/^priest/, 1.08],
  [/^sorceress-shamaness/, 1.2], [/^sorceress/, 1.35], [/^forester(-ragged)?$|^forester-hunter/, 1.2],
  [/^mechanic-(turret|mortar)$/, 1.3], [/^mechanic-demo/, 1.2], [/^mechanic-turret-giant/, 1.1], [/^sniper-marksman/, 1.2],
  [/^thunder-raiju/, 0.85], [/^thunder-thor/, 1.55]];
export const sizeOf = (id) => {
  const body = BODIES.find(([kind]) => kind.test(id));
  return body ? body[1] : 1;
};

export function drawHero(id, reload = -1) {
  const fine = FINE_HEROES.test(id) ? 2 : 1, size = sizeOf(id), side = Math.ceil(28 * size) * 2;
  const m = new Model(side * fine, 1.08 * fine * HERO.scale * size, HERO.center[0], HERO.center[1]);
  m.reload = reload;
  HEROES[id](m);
  const canvas = m.paint();
  canvas.fine *= fine;
  canvas.span = 32 * fine * HERO.scale;
  return canvas;
}

export function drawPhoenix(blue, span = 1) {
  const m = new Model(32, 1.08);
  if (blue) phoenix(m, '#1d4ed8', '#3b82f6', '#9bd5ff', '#e0f2ff', span);
  else phoenix(m, '#c2410c', '#f97316', '#fde047', '#fff7ed', span);
  return m.paint();
}

export { Model, legs, SKIN, METAL, STEEL, WOOD, GOLD };
