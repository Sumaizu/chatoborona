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
  constructor(size, k) {
    this.w = size;
    this.h = size;
    this.k = k;
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
    return [this.pad + this.w / 2 + (x - this.w / 2) * this.k, this.pad + this.h / 2 + (y - this.h / 2) * this.k];
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

function hero(m, o) {
  legs(m, 16, 26.5, o.boots || '#3b2c22', 0);
  if (o.back) o.back(m);
  m.egg(16, 18.5, 5, 8.6, 6.2, 4.6, o.coat);
  if (o.chest) o.chest(m);
  const [lx, ly, rx, ry] = o.hands || [13, 11, 18.5, 12.3];
  m.limb(9.5, 17, 8, lx, ly + 0.5, 9, 2.3, o.sleeve || o.coat);
  m.limb(22.5, 17, 8, rx, ry + 0.5, 9, 2.3, o.sleeve || o.coat);
  m.ball(9, 17.5, 8.5, 3.3, o.dark);
  m.ball(23, 17.5, 8.5, 3.3, o.dark);
  if (o.weapon) o.weapon(m);
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

function mage(m, o) {
  hero(m, {
    coat: o.robe, dark: o.dark, sleeve: o.sleeve, boots: o.boots, hands: [12.5, 11.5, 20, 12.5],
    back: (q) => q.egg(16, 23, 2.6, 8.2, 6, 3, o.dark),
    chest: (q) => {
      q.limb(16, 13.5, 9.6, 16, 23.5, 9.6, 0.8, o.trim);
      q.dot(16, 18, o.glow, 30);
    },
    weapon: (q) => {
      q.limb(12.5, 16.5, 10, 12.5, 4.5, 10.8, 1, o.staff || WOOD);
      o.tip(q, 12.5, 3);
    },
    head: (q) => hat(q, o.hat, o.trim, o.glow),
  });
}

const MAGES = {
  pyro: (m) => mage(m, {
    robe: '#b91c1c', dark: '#7f1d1d', sleeve: '#c42828', boots: '#3b1a14', hat: '#991b1b', trim: '#f59e0b',
    glow: '#fde047',
    tip: (q, x, y) => {
      q.ball(x, y + 0.4, 12, 2.4, '#ea580c', 1);
      q.ball(x, y - 0.2, 13.6, 1.8, '#f97316', 1);
      q.ball(x - 0.2, y - 0.8, 15, 1.1, '#fde047', 1);
      for (const [dx, dy] of [[-2, -2], [2, -1], [1, -3]]) q.dot(x + dx, y + dy, '#fff1c2', 60);
    },
  }),
  frost: (m) => mage(m, {
    robe: '#1d4ed8', dark: '#1e3a8a', sleeve: '#2557e0', boots: '#1e2a52', hat: '#1e40af', trim: '#7dd3fc',
    glow: '#e0f2fe', staff: '#94a3b8',
    tip: (q, x, y) => {
      q.ball(x, y, 12.6, 2.6, '#38bdf8', 1);
      q.ball(x - 0.7, y - 0.7, 14.2, 1, '#e0f2fe', 1);
      for (const [dx, dy] of [[-2.5, 2.5], [2.6, 1.4], [0.4, -3]]) q.dot(x + dx, y + dy, '#7dd3fc', 50);
    },
  }),
  earth: (m) => mage(m, {
    robe: '#7c5a3a', dark: '#4a3524', sleeve: '#86613f', boots: '#33251a', hat: '#5c4128', trim: '#65a30d',
    glow: '#bef264', staff: '#5c3d22',
    tip: (q, x, y) => {
      q.egg(x, y, 13.4, 1.8, 1.4, 3.4, '#b45309', 1);
      q.egg(x - 1.3, y + 0.8, 12.4, 1.1, 0.9, 2.2, '#d97706', 1);
      q.egg(x + 1.3, y + 0.6, 12.4, 1, 0.9, 2, '#92400e', 1);
      q.dot(x - 0.4, y - 1, '#fde68a', 60);
    },
  }),
  shaman: (m) => mage(m, {
    robe: '#0d9488', dark: '#115e59', sleeve: '#14a39a', boots: '#183b37', hat: '#0f766e', trim: '#ccfbf1',
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
  thunder: (m) => mage(m, {
    robe: '#1e2a78', dark: '#141b52', sleeve: '#26338e', boots: '#151a3d', hat: '#172066', trim: '#facc15',
    glow: '#fef08a',
    tip: (q, x, y) => {
      q.ball(x, y, 12.6, 2.3, '#fde047', 1);
      q.ball(x - 0.6, y - 0.6, 14, 0.9, '#ffffff', 1);
      q.limb(x - 2.6, y - 1.2, 12.4, x - 3.6, y + 0.4, 12.4, 0.35, '#fef9c3');
      q.limb(x + 2.4, y - 1.6, 12.4, x + 3.4, y - 3, 12.4, 0.35, '#fef9c3');
      q.limb(x + 1.6, y + 2.4, 12.4, x + 2.8, y + 3.2, 12.4, 0.35, '#fef9c3');
      for (const [dx, dy] of [[-3, -3], [3, 0], [-1, 3.5]]) q.dot(x + dx, y + dy, '#ffffff', 60);
    },
  }),
};

function ragged(m) {
  hero(m, {
    coat: '#7d6b52', dark: '#5b4c39', sleeve: '#6f5f48', boots: '#3b2c22', hands: [12.5, 12, 19.5, 12.5],
    chest: (q) => {
      q.limb(12, 23, 9.2, 15, 21, 9.2, 0.5, '#4a3d2e');
      q.dot(19, 22, '#a08a68', 30);
      q.dot(13, 19, '#4a3d2e', 30);
    },
    weapon: (q) => q.limb(12.5, 16.5, 10, 12, 5.5, 10.6, 0.8, '#7a5a35'),
    head: (q) => {
      q.ball(16, 17, 11.2, 4.3, SKIN);
      q.ball(16, 18.6, 12.4, 3.2, '#5a4632');
      for (const [x, y] of [[13.6, 15.4], [18.4, 15.8], [16, 14.2]]) q.dot(x, y, '#3b2f22', 60);
    },
  });
}

function fireballMage(m, fire, core) {
  hero(m, {
    coat: '#b91c1c', dark: '#7f1d1d', sleeve: '#c42828', boots: '#3b1a14', hands: [11.5, 12, 20.5, 12],
    back: (q) => q.egg(16, 23, 2.6, 8.2, 6, 3, '#7f1d1d'),
    chest: (q) => q.limb(16, 13.5, 9.6, 16, 23.5, 9.6, 0.8, '#f59e0b'),
    weapon: (q) => {
      for (const [x, y] of [[11.5, 11], [20.5, 11]]) {
        q.ball(x, y, 12, 2.5, fire, 1);
        q.ball(x - 0.3, y - 0.5, 13.6, 1.3, core, 1);
      }
    },
    head: (q) => hat(q, '#991b1b', '#f59e0b', core),
  });
}

function igniteMage(m, fire, core) {
  hero(m, {
    coat: '#9a3412', dark: '#5c1a0a', sleeve: '#a63b17', boots: '#2b1610', hands: [12, 13, 20.5, 11],
    back: (q) => q.egg(16, 23, 2.6, 8.2, 6, 3, '#5c1a0a'),
    chest: (q) => q.limb(16, 13.5, 9.6, 16, 23.5, 9.6, 0.8, '#fbbf24'),
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

function dragon(m, scale, wing, fire) {
  m.limb(16, 22, 6, 16, 29.5, 4, 1.8, scale, 0, 0.6);
  m.egg(7, 17, 6.5, 6.5, 4.4, 1, wing);
  m.egg(25, 17, 6.5, 6.5, 4.4, 1, wing);
  m.limb(12, 15, 7.5, 2, 13, 8, 0.7, scale);
  m.limb(20, 15, 7.5, 30, 13, 8, 0.7, scale);
  m.egg(16, 18, 7, 4.8, 6.4, 4, scale);
  for (const y of [15, 18, 21]) m.ball(16, y, 11.2, 0.9, wing);
  m.egg(16, 10.5, 9, 3.4, 3.8, 3, scale);
  m.egg(16, 7.4, 9.4, 2.2, 2.4, 2.2, scale);
  m.limb(14, 11, 11, 12.2, 13.6, 12.6, 0.6, '#f5e6c8');
  m.limb(18, 11, 11, 19.8, 13.6, 12.6, 0.6, '#f5e6c8');
  m.dot(14.6, 9.4, '#fde047', 60);
  m.dot(17.4, 9.4, '#fde047', 60);
  m.dot(15.4, 5.6, fire, 60);
  m.dot(16.6, 5.6, fire, 60);
}

const SKINS = {
  'pyro-ragged': ragged,
  'pyro-fireball': (m) => fireballMage(m, '#f97316', '#fde047'),
  'pyro-fireball-blue': (m) => fireballMage(m, '#3b82f6', '#e0f2ff'),
  'pyro-dragon': (m) => dragon(m, '#c2410c', '#7c2d12', '#fde047'),
  'pyro-dragon-blue': (m) => dragon(m, '#1d4ed8', '#1e3a8a', '#9bd5ff'),
  'pyro-ignite': (m) => igniteMage(m, '#f97316', '#fde047'),
  'pyro-ignite-blue': (m) => igniteMage(m, '#3b82f6', '#e0f2ff'),
};

const HEROES = {
  sniper: (m) => hero(m, {
    coat: '#5f7f3c', dark: '#4a6430', sleeve: '#557235',
    back: (q) => {
      q.egg(16, 23.6, 4, 5.4, 3.2, 4.2, '#6b4a2b');
      q.dot(14, 23, GOLD, 12);
      q.dot(18, 23, GOLD, 12);
    },
    weapon: (q) => {
      q.limb(16, 18, 10, 16, 13.5, 10.5, 1.8, WOOD);
      q.limb(16, 13.5, 11, 16, 2, 11, 1.1, STEEL, 0.6);
      q.limb(16, 12, 12.6, 16, 7, 12.6, 1.5, '#2d323b', 0.8);
      q.dot(16, 6, '#7fd4ff');
    },
    head: (q) => {
      q.ball(16, 17, 11.5, 4.9, '#6d8f45');
      q.egg(16, 13.4, 14.5, 3.3, 1.3, 1, '#2a3022');
      q.dot(15, 13, '#9be7ff');
    },
  }),
  gunner: (m) => hero(m, {
    coat: '#b39b68', dark: '#6b737d', sleeve: '#a58d5c', boots: '#3a2f25', hands: [13, 12.5, 19, 13], glove: '#3a3d44',
    back: (q) => {
      q.egg(16, 24, 4, 5.8, 3.4, 4.4, '#56606c', 0.3);
      q.limb(11.5, 24, 8.6, 20.5, 24, 8.6, 0.6, GOLD);
    },
    chest: (q) => {
      q.limb(10, 21, 9, 22, 15, 9, 0.9, '#5b4a2a');
      for (let i = 0; i < 5; i++) q.dot(11 + i * 2.2, 20.4 - i * 1.2, GOLD, 30);
    },
    weapon: (q) => {
      q.egg(16, 12.5, 10.5, 4.6, 4, 2.6, '#2d323b', 0.4);
      for (const x of [13.7, 16, 18.3]) q.limb(x, 10, 11.5, x, 3.2, 11.5, 0.9, STEEL, 0.6);
      q.limb(13, 6.5, 12.4, 19, 6.5, 12.4, 0.7, '#3f444d');
      q.limb(13, 4, 12.4, 19, 4, 12.4, 0.7, '#3f444d');
      q.dot(16, 2, '#ffd84a');
    },
    head: (q) => {
      q.egg(16, 17.6, 11, 6, 6, 1.2, '#7d6a42');
      q.ball(16, 17.6, 11.8, 5.1, '#a68d58', 0.5);
      q.egg(16, 13.9, 15, 3.6, 1.2, 1, '#f97316', 0.6);
    },
  }),
  bomber: (m) => hero(m, {
    coat: '#9a3b16', dark: '#6e2a10', hands: [12.5, 11.5, 19.5, 12.5],
    back: (q) => {
      for (const x of [11, 14, 18, 21]) q.ball(x, 24, 5, 1.8, '#4d7c2f', 0.4);
    },
    weapon: (q) => {
      q.limb(16, 16, 10.5, 16, 3.5, 10.5, 2.6, '#5b7330', 0.3);
      q.limb(16, 4, 11, 16, 2.6, 11, 2.9, '#3d4f20');
      q.dot(16, 2, '#1c1917');
      q.dot(17, 12, '#ff7a1f');
    },
    head: (q) => {
      q.egg(16, 17.5, 10.6, 6.2, 6, 1.4, '#c98316');
      q.ball(16, 17.5, 11.8, 4.8, '#f5a524', 0.6);
      q.dot(16, 14, '#fff3b0', 40);
    },
  }),
  alchemist: (m) => hero(m, {
    coat: '#a3acb8', dark: '#6b7280', boots: '#2f2a26', hands: [12, 11.5, 19.5, 13],
    chest: (q) => q.egg(16, 20.5, 9, 5, 4, 0.8, '#7c4a1e'),
    weapon: (q) => {
      q.limb(12, 10, 11.5, 12, 7.4, 11.5, 0.9, '#e8eef4');
      q.ball(12, 11.5, 11.6, 2.3, '#84cc16', 1);
      q.ball(19.5, 14.5, 10.5, 1.5, '#a855f7', 1);
    },
    head: (q) => {
      q.ball(16, 17, 11.4, 4.6, '#d6a77a');
      q.egg(16, 18.6, 12, 4.4, 2.8, 2.2, '#5b4636');
      q.limb(11.6, 15.6, 13.5, 20.4, 15.6, 13.5, 0.7, '#3a3d44');
      q.ball(14, 14.8, 14.6, 1.4, '#84cc16', 1);
      q.ball(18, 14.8, 14.6, 1.4, '#84cc16', 1);
    },
  }),
  hunter: (m) => hero(m, {
    coat: '#7c4a1e', dark: '#5b3414', boots: '#3b2a1e', hands: [13, 12, 19, 12],
    back: (q) => {
      q.limb(19, 26, 5, 22, 19, 9, 1.6, '#6b4423');
      for (const x of [21, 22.5]) q.limb(x, 19, 10, x + 0.6, 16.5, 10, 0.5, '#e7e5e4');
    },
    weapon: (q) => {
      q.limb(16, 15, 10.5, 16, 5, 10.5, 1.2, WOOD);
      q.limb(10.5, 7.5, 11, 21.5, 7.5, 11, 0.9, '#6e4524');
      q.limb(10.5, 7.5, 11.2, 16, 10.5, 11.2, 0.35, '#f5f5f4');
      q.limb(21.5, 7.5, 11.2, 16, 10.5, 11.2, 0.35, '#f5f5f4');
      q.dot(16, 3, METAL);
    },
    head: (q) => {
      q.egg(16, 17.5, 11, 7, 6.4, 1.2, '#5b3a1e');
      q.ball(16, 17.5, 12.4, 3.8, '#6e4524');
      q.limb(19, 15, 14, 22, 12.5, 14, 0.5, '#dc2626');
    },
  }),
  banner: (m) => hero(m, {
    coat: '#b3175f', dark: METAL, sleeve: '#9b1452', boots: '#4a2238', hands: [19, 11, 19.5, 14],
    chest: (q) => q.egg(16, 18.5, 8.6, 5.2, 4, 1.6, '#d4dae1', 0.6),
    weapon: (q) => {
      q.limb(19.5, 18, 10, 19.5, 1.5, 10.5, 0.9, WOOD);
      q.egg(23.5, 4.5, 12, 4.4, 3, 0.6, '#ff5fb0');
      q.egg(24.5, 6.5, 12.2, 3, 1.2, 0.4, '#c2307e');
      q.ball(19.5, 1.5, 12, 1.2, GOLD, 1);
    },
    head: (q) => {
      q.ball(16, 17, 11.5, 4.8, '#c4ccd6', 0.8);
      q.limb(16, 13.5, 15.5, 16, 21, 15, 1.4, '#ff5fb0');
      q.dot(16, 13, '#ffd1e8', 60);
    },
  }),
  healer: (m) => hero(m, {
    coat: '#eef4f1', dark: '#c9d6cf', sleeve: '#dfe8e3', boots: '#c7cfd6', hands: [12.5, 10.5, 19.5, 10.5],
    chest: (q) => {
      q.limb(16, 13, 9.6, 16, 25, 9.6, 1.1, '#22c55e');
      q.limb(12, 17.5, 9.6, 20, 17.5, 9.6, 1.1, '#22c55e');
    },
    weapon: (q) => {
      q.ball(16, 9, 11, 2.6, '#34d399', 1);
      q.dot(15, 8, '#ecfdf5');
    },
    head: (q) => {
      q.ball(16, 16.5, 11.5, 4.8, '#d9b77a');
      q.egg(16, 17.5, 14.8, 3.2, 2.4, 1.3, '#f8fafc');
      for (const [x, y] of [[16, 17], [15, 17], [17, 17], [16, 16], [16, 18]]) q.dot(x, y, '#22c55e', 120);
    },
  }),
  sage: (m) => hero(m, {
    coat: '#5b1d8f', dark: '#3b0f63', sleeve: '#6a2aa3', boots: '#2e1065', hands: [12, 11.5, 20, 11.5],
    back: (q) => q.egg(16, 21.5, 3, 9, 7, 3.5, '#4c1d7a'),
    weapon: (q) => {
      q.egg(16, 11.5, 11, 4.6, 3, 1.2, '#7e2bc4');
      q.egg(16, 11.2, 12.1, 4, 2.4, 0.5, '#f3e9d2');
      q.limb(16, 9, 12.6, 16, 13.5, 12.6, 0.3, '#c9b48a');
      for (const [x, y] of [[13.5, 10.5], [14, 12], [18, 10.5], [18.5, 12]]) q.dot(x, y, '#8a6fb0', 60);
    },
    head: (q) => {
      q.ball(16, 17.5, 11.4, 5, '#7e2bc4');
      q.egg(16, 14.6, 13, 3.4, 2.6, 2, '#f1f5f9');
      q.ball(16, 17.8, 14.4, 2.3, '#9b4fe0');
      q.dot(16, 17, '#e9d5ff', 60);
    },
  }),
  miner: (m) => hero(m, {
    coat: '#3b4a6b', dark: '#28334d', sleeve: '#33405d', boots: '#2a2620', hands: [13.5, 11.5, 18.5, 11.5],
    glove: '#6b4a2b',
    chest: (q) => q.limb(11, 22, 9.2, 21, 22, 9.2, 0.8, '#f59e0b'),
    weapon: (q) => {
      q.egg(16, 10.5, 11, 3.6, 2.6, 2, '#c0392b', 0.4);
      q.limb(16, 9, 13, 16, 6, 13.5, 0.6, METAL);
      q.ball(16, 5.6, 14, 1, '#ef4444', 1);
      q.dot(17, 11, '#ffd84a', 60);
    },
    head: (q) => {
      q.egg(16, 17.4, 10.6, 6.4, 6, 1.3, '#c99a21');
      q.ball(16, 17.4, 11.8, 4.8, '#e0b43a', 0.7);
      q.ball(16, 13.2, 14, 1.4, '#fff3b0', 1);
    },
  }),
  parasite: (m) => {
    for (const s of [-1, 1]) {
      for (const [a, b] of [[6, 9], [7, 15], [6, 21]]) {
        m.limb(16 + s * 4, b, 4, 16 + s * (a + 6), b + (b - 15) * 0.4, 2, 1.1, '#86198f', 0, 0.6);
      }
    }
    m.egg(16, 18, 5, 7.4, 8, 5, '#c026d3');
    m.egg(16, 12, 7, 5.2, 4.6, 4.2, '#d946ef', 0.5);
    for (const [x, y] of [[13, 19], [18, 17], [16, 22]]) m.ball(x, y, 9, 1.2, '#f0abfc', 0.8);
    m.ball(14, 10, 10.2, 1.3, '#fde047', 1);
    m.ball(18, 10, 10.2, 1.3, '#fde047', 1);
    m.limb(14, 8, 9, 13, 5, 9, 0.6, '#f5d0fe');
    m.limb(18, 8, 9, 19, 5, 9, 0.6, '#f5d0fe');
  },
};

Object.assign(HEROES, MAGES, SKINS);
export const HERO_IDS = Object.keys(HEROES);

export function drawHero(id) {
  const m = new Model(32, 1.08);
  HEROES[id](m);
  return m.paint();
}

export { Model, legs, SKIN, METAL, STEEL, WOOD, GOLD };
