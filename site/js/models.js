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
    this.c = new Array(size * size).fill(null);
    this.z = new Float32Array(size * size).fill(-1e9);
    this.n = new Array(size * size).fill(null);
    this.flat = new Uint8Array(size * size);
    this.gloss = new Float32Array(size * size);
  }

  place(x, y) {
    return [this.w / 2 + (x - this.w / 2) * this.k, this.h / 2 + (y - this.h / 2) * this.k];
  }

  plot(x, y, z, color, n, flat, gloss) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x;
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
    const w = this.w, h = this.h, canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.fine = 2;
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
    coat: '#6b7280', dark: '#4b5563', boots: '#2d3036', hands: [13.5, 12.5, 18.5, 13], glove: '#3a3d44',
    chest: (q) => {
      q.limb(10, 21, 9, 22, 15, 9, 0.9, '#8a6a2c');
      for (let i = 0; i < 5; i++) q.dot(11 + i * 2.2, 20.4 - i * 1.2, GOLD, 30);
    },
    weapon: (q) => {
      q.egg(16, 13, 10.5, 3.4, 4.2, 2.4, '#3f444d', 0.4);
      q.limb(16, 10, 11.5, 16, 2, 11.5, 1.2, STEEL, 0.6);
      q.limb(14.4, 10, 11, 14.4, 4, 11, 0.7, '#2d323b');
      q.limb(17.6, 10, 11, 17.6, 4, 11, 0.7, '#2d323b');
      q.dot(16, 1, '#ffd84a');
    },
    head: (q) => {
      q.ball(16, 17.6, 11.6, 5.2, '#4d6b1f');
      q.egg(16, 17.6, 11, 6, 6, 1.2, '#3b5317');
      q.ball(16, 17.6, 11.8, 5, '#56782a', 0.3);
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
  thunder: (m) => hero(m, {
    coat: '#1e40af', dark: '#1e3a8a', sleeve: '#2448b8', hands: [12.5, 11, 19, 12.5],
    chest: (q) => q.limb(11, 22, 9.4, 21, 22, 9.4, 0.8, GOLD),
    weapon: (q) => {
      q.limb(12.5, 16, 10, 12.5, 3.5, 10.5, 1, WOOD);
      q.ball(12.5, 3, 12.5, 2.6, '#facc15', 1);
      for (const [x, y] of [[10, 1], [15, 2], [11, 6]]) q.dot(x, y, '#fef9c3', 60);
    },
    head: (q) => {
      q.egg(16, 18, 10.4, 7.2, 6.6, 1.2, '#1d3592');
      q.ball(16, 17.5, 11.2, 4.5, '#2b4fc4');
      q.ball(16, 17.5, 15, 2.2, '#3b63d6');
      q.dot(16, 16, '#facc15', 60);
      q.dot(14, 19, '#fef08a', 60);
      q.dot(18, 18, '#fef08a', 60);
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
  pyro: (m) => hero(m, {
    coat: '#8f2b17', dark: '#5e1b0d', sleeve: '#7a2412', boots: '#2c2226', glove: '#3a2a22',
    hands: [13.5, 11.2, 18.5, 11.6],
    back: (q) => {
      q.limb(12, 22, 6, 12, 26, 6, 2.6, '#c0392b', 0.5);
      q.limb(20, 22, 6, 20, 26, 6, 2.6, '#c0392b', 0.5);
    },
    chest: (q) => q.egg(16, 20, 8, 5, 2, 2, '#5b1d10'),
    weapon: (q) => {
      q.limb(16, 13, 10.5, 16, 3, 10.5, 1.6, '#6b7280', 0.6);
      q.limb(16, 4, 10.5, 16, 1.6, 10.5, 1.9, '#3f4450', 0.6);
      q.dot(16, 1, '#ffd84a');
      q.dot(15, 1, '#ff7a1f');
      q.dot(17, 1, '#ff7a1f');
    },
    head: (q) => {
      q.ball(16, 17, 11.5, 4.8, '#3d3f46', 0.6);
      q.egg(16, 13.6, 14.6, 3.2, 1.4, 1, '#ff9b3d');
      q.dot(14, 13, '#ffe08a');
      q.dot(18, 13, '#ffe08a');
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
  frost: (m) => hero(m, {
    coat: '#2f6ea8', dark: '#1f4f7a', sleeve: '#2a6198', boots: '#2f3b57', hands: [12, 12, 20.5, 12.5],
    back: (q) => q.egg(16, 21, 3, 9, 7.5, 3.5, '#1f4f7a'),
    chest: (q) => q.egg(16, 21.5, 8, 6.5, 1.6, 1.4, '#d6f4ff'),
    weapon: (q) => {
      q.limb(12, 14, 10.5, 12, 3, 10.5, 1.1, '#cbeeff', 0.4);
      q.ball(12, 2.6, 12, 2.4, '#7fe8ff', 1);
      q.dot(11, 1, '#ffffff');
      q.ball(20.5, 9.5, 11, 1.3, '#a5f3fc', 1);
    },
    head: (q) => {
      q.ball(16, 16.5, 11.5, 5.2, '#3a86c9');
      q.ball(16, 16, 15.5, 2.6, '#5aa5e0');
      for (const [x, y] of [[13, 13], [16, 12], [19, 13]]) q.dot(x, y, '#e0fbff', 60);
    },
  }),
  shaman: (m) => hero(m, {
    coat: '#0f766e', dark: '#115e59', boots: '#3b2a1e', hands: [12.5, 11.5, 19.5, 13],
    chest: (q) => {
      q.limb(10.5, 20, 9.5, 21.5, 20, 9.5, 0.8, '#e6c87a');
      for (const x of [12, 16, 20]) q.dot(x, 21, '#1fb5a5', 30);
    },
    weapon: (q) => {
      q.limb(12.5, 16, 10, 12.5, 2.5, 10.5, 1.2, WOOD);
      q.egg(12.5, 3.5, 12, 2, 2.4, 1.6, '#e6c87a');
      q.dot(11, 2, '#22d3ee', 40);
      q.dot(14, 2, '#f472b6', 40);
      q.limb(12.5, 5, 12, 10, 8, 12, 0.5, '#f8fafc');
    },
    head: (q) => {
      for (const [x, y, c] of [[11, 15, '#22d3ee'], [13, 13, '#f472b6'], [16, 12.4, '#facc15'], [19, 13, '#f472b6'],
        [21, 15, '#22d3ee']]) {
        q.limb(16, 17, 12, x, y, 12.5, 0.9, c);
      }
      q.ball(16, 17, 12, 4.4, '#7c4a2a');
      q.egg(16, 15, 15, 3, 1.2, 1, '#e6c87a');
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
  earth: (m) => hero(m, {
    coat: '#8a6a44', dark: '#5e4a30', sleeve: '#7d603d', boots: '#3b2a1e', hands: [14, 11.5, 18.5, 11.5],
    chest: (q) => q.limb(10, 20.5, 9.2, 22, 20.5, 9.2, 0.9, '#5b3d22'),
    weapon: (q) => {
      q.limb(16, 15, 10.5, 16, 5, 10.5, 1.1, WOOD);
      q.egg(16, 3.6, 12, 5.2, 2.8, 2.6, '#9a8f80');
      q.dot(13, 3, '#c08a4a', 30);
      q.dot(18, 4, '#6b6258', 30);
    },
    head: (q) => {
      q.ball(16, 17, 11.6, 4.9, '#8a7f70');
      q.ball(14.4, 15.4, 14, 1.6, '#a89c8a');
      q.ball(18, 18.4, 13.6, 1.4, '#6b6258');
      q.dot(16, 13, '#c08a4a', 60);
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

export const HERO_IDS = Object.keys(HEROES);

export function drawHero(id) {
  const m = new Model(32, 1.08);
  HEROES[id](m);
  return m.paint();
}

export { Model, legs, SKIN, METAL, STEEL, WOOD, GOLD };
