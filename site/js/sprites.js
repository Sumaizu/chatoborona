import { HERO_IDS, drawHero } from './models.js';
import { MOB_IDS, drawMob } from './monsters.js';

const OUTLINE = '#15111d';
const METAL = ['#d4dae1', '#8e98a5', '#545d6b'];
const STONE = ['#9a8f80', '#8a7f70', '#a89c8a'];

class Pix {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.data = new Array(w * h).fill(null);
  }

  px(x, y, c) {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.data[y * this.w + x] = c;
  }

  rect(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c);
  }

  ellipse(cx, cy, rx, ry, c, dark = null, light = null) {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy > 1) continue;
        let color = c;
        if (dark && dx + dy > 0.55) color = dark;
        else if (light && dx + dy < -0.75) color = light;
        this.data[y * this.w + x] = color;
      }
    }
  }

  disc(cx, cy, r, c, dark = null, light = null) {
    this.ellipse(cx, cy, r, r, c, dark, light);
  }

  line(x0, y0, x1, y1, c, width = 1) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      if (width > 1) this.rect(x0, y0, width, width, c);
      else this.px(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  oval(cx, cy, rx, ry, c, dark = null, light = null) {
    this.ellipse(cx, cy, rx + 1, ry + 1, OUTLINE);
    this.ellipse(cx, cy, rx, ry, c, dark, light);
  }

  ball(cx, cy, r, c, dark = null, light = null) {
    this.oval(cx, cy, r, r, c, dark, light);
  }

  bar(x0, y0, x1, y1, c, width = 2) {
    this.line(x0 - 1, y0 - 1, x1 - 1, y1 - 1, OUTLINE, width + 2);
    this.line(x0, y0, x1, y1, c, width);
  }

  box(x, y, w, h, c) {
    this.rect(x - 1, y - 1, w + 2, h + 2, OUTLINE);
    this.rect(x, y, w, h, c);
  }

  outline(c = OUTLINE) {
    const marks = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.data[y * this.w + x]) continue;
        const filled = (i, j) => i >= 0 && j >= 0 && i < this.w && j < this.h && this.data[j * this.w + i]
          && this.data[j * this.w + i] !== c;
        if (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)) marks.push(y * this.w + x);
      }
    }
    for (const at of marks) this.data[at] = c;
    return this;
  }

  canvas() {
    const canvas = document.createElement('canvas'), pixels = [];
    canvas.width = this.w;
    canvas.height = this.h;
    const ctx = canvas.getContext('2d');
    this.data.forEach((c, at) => {
      if (!c) return;
      const x = at % this.w, y = Math.floor(at / this.w);
      ctx.fillStyle = c;
      ctx.fillRect(x, y, 1, 1);
      pixels.push({ x, y, color: c });
    });
    own(canvas, 'pixels', () => pixels);
    return canvas;
  }
}

export const HERO_SIZE = 16;

const cache = new Map();
const owned = new WeakMap();

function remember(key, make) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}

function own(image, key, make) {
  if (!owned.has(image)) owned.set(image, new Map());
  const list = owned.get(image);
  if (!list.has(key)) list.set(key, make());
  return list.get(key);
}

export const heroSprite = (id) => remember('hero:' + id, () => drawHero(id));

export const mobSprite = (id, frame = 0) => remember('mob:' + id + ':' + frame, () => drawMob(id, frame ? 1 : 0));

export const mobUrl = (id) => remember('mobUrl:' + id, () => mobSprite(id).toDataURL());

export function tintSprite(image, color) {
  return own(image, color, () => {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    canvas.fine = image.fine;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return canvas;
  });
}

function mapSprite(rows, colors) {
  const p = new Pix(rows[0].length, rows.length);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (colors[row[x]]) p.px(x, y, colors[row[x]]);
  });
  return p.outline().canvas();
}

export const starSprite = () => remember('star', () => mapSprite([
  '...Y...',
  '..YyY..',
  'YYYyYYY',
  '.YyyyY.',
  '..YyY..',
  '.YY.YY.',
  '.Y...Y.',
], { Y: '#ffd43b', y: '#fff7c2' }));

export const reticleSprite = () => remember('reticle', () => mapSprite([
  'RRR.......RRR',
  'R...........R',
  'R.....R.....R',
  '......R......',
  '.............',
  '.............',
  '..RR..r..RR..',
  '.............',
  '.............',
  '......R......',
  'R.....R.....R',
  'R...........R',
  'RRR.......RRR',
], { R: '#ef4444', r: '#fecaca' }));

export const bubbleSprite = () => remember('bubble', () => mapSprite([
  '.ggg.',
  'g..wg',
  'g...g',
  'g...g',
  '.ggg.',
], { g: '#bef264', w: '#f7fee7' }));

const SHELLS = {
  ice: { fill: 'rgba(165, 243, 252, .55)', edge: 'rgba(236, 254, 255, .95)', glint: '#ffffff' },
  shield: { fill: 'rgba(103, 232, 249, .22)', edge: 'rgba(165, 243, 252, .95)', glint: '' },
  ward: { fill: 'rgba(74, 222, 128, .2)', edge: 'rgba(187, 247, 208, .95)', glint: '' },
};

export function shellSprite(image, look) {
  return own(image, 'shell:' + look, () => {
    const colors = SHELLS[look], pad = 2 * (image.fine || 1), w = image.width + pad * 2, h = image.height + pad * 2;
    const data = image.getContext('2d').getImageData(0, 0, image.width, image.height).data;
    const solid = (x, y) => x >= 0 && y >= 0 && x < image.width && y < image.height
      && data[(y * image.width + x) * 4 + 3] >= 128;
    const inside = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let hit = false;
        for (let dy = -pad; dy <= pad && !hit; dy++) {
          for (let dx = -pad; dx <= pad && !hit; dx++) {
            if (dx * dx + dy * dy <= pad * pad + 1 && solid(x - pad + dx, y - pad + dy)) hit = true;
          }
        }
        inside[y * w + x] = hit ? 1 : 0;
      }
    }
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.fine = image.fine;
    const ctx = canvas.getContext('2d');
    let top = null;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!inside[y * w + x]) continue;
        const edge = !(x > 0 && inside[y * w + x - 1] && x < w - 1 && inside[y * w + x + 1] && y > 0
          && inside[(y - 1) * w + x] && y < h - 1 && inside[(y + 1) * w + x]);
        ctx.fillStyle = edge ? colors.edge : colors.fill;
        ctx.fillRect(x, y, 1, 1);
        if (!edge && !top) top = [x, y];
      }
    }
    if (colors.glint && top) {
      ctx.fillStyle = colors.glint;
      ctx.fillRect(top[0] + 1, top[1] + 1, 1, 1);
      ctx.fillRect(top[0] + 2, top[1] + 2, 1, 1);
      ctx.fillRect(top[0] + 1, top[1] + 3, 1, 1);
    }
    return canvas;
  });
}

export function pixelsOf(image) {
  return own(image, 'pixels', () => {
    const data = image.getContext('2d').getImageData(0, 0, image.width, image.height).data, list = [];
    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        const at = (y * image.width + x) * 4;
        if (data[at + 3] < 128) continue;
        list.push({ x, y, color: 'rgb(' + data[at] + ',' + data[at + 1] + ',' + data[at + 2] + ')' });
      }
    }
    return list;
  });
}

const ROCKS = [
  [9.5, 5, 4.6, 3.8, 0], [4.5, 6.5, 3.6, 3.2, 1], [14.5, 6.8, 3.4, 3, 2], [7, 9, 2.8, 2.1, 1], [12.5, 9.3, 2.6, 1.9, 0],
];
const CRACKS = [[[8, 3, 10, 6], [10, 6, 9, 8]], [[3, 5, 5, 8], [14, 5, 15, 8], [12, 8, 13, 10]]];

export const wallSprite = (stage) => remember('wall:' + stage, () => {
  const p = new Pix(20, 13), rocks = stage >= 2 ? ROCKS.slice(0, 4) : ROCKS;
  for (const [cx, cy, rx, ry, tone] of rocks.slice().sort((a, b) => a[1] - b[1])) {
    p.oval(cx, cy, rx, ry, STONE[tone], '#5c564d', '#c9bfad');
    p.px(cx - rx * 0.45, cy - ry * 0.5, '#e2d9c8');
  }
  for (let i = 0; i < stage && i < CRACKS.length; i++) {
    for (const [x0, y0, x1, y1] of CRACKS[i]) p.line(x0, y0, x1, y1, '#2b2620');
  }
  if (stage >= 2) {
    p.px(16, 10, '#8a7f70');
    p.px(17, 11, '#6b6258');
    p.px(2, 10, '#8a7f70');
  }
  p.px(6, 4, '#6f8a3e');
  p.px(7, 4, '#86a34c');
  p.px(15, 5, '#6f8a3e');
  return p.outline().canvas();
});

export const trapSprite = (closed) => remember('trap:' + closed, () => {
  const p = new Pix(13, 11), jaw = closed ? 2 : 0;
  p.ball(6, 5.5, 2.2, '#6b7280', '#374151', '#9ca3af');
  for (const side of [-1, 1]) {
    const x = 6 + side * (5 - jaw);
    p.bar(x, 1 + jaw, x, 9 - jaw, '#9ca3af', 1);
    for (let y = 2 + jaw; y <= 8 - jaw; y += 2) p.px(x - side, y, '#e5e7eb');
  }
  p.px(6, 5, '#b91c1c');
  return p.outline().canvas();
});

export const flaskSprite = () => remember('flask', () => {
  const p = new Pix(7, 9);
  p.box(3, 0, 1, 2, '#e8eef4');
  p.ball(3.5, 5, 2.4, '#9be22d', '#5b9a12', '#d9ff8f');
  return p.outline().canvas();
});

const MINE_LOOKS = {
  strong: { body: ['#4a4f5a', '#2e323a', '#7a808c'], light: '#ff3b3b', spikes: true },
  wide: { body: ['#7a5a2a', '#54401c', '#a07a3a'], light: '#ffb020', ring: true },
  stun: { body: ['#2d4a7a', '#1d3050', '#4a6fa8'], light: '#7fe3ff', bolt: true },
};

export const mineSprite = (kind, lit) => remember('mine:' + kind + ':' + lit, () => {
  const look = MINE_LOOKS[kind], p = new Pix(11, 11), [c, d, l] = look.body;
  if (look.spikes) for (const [x, y] of [[5, 1], [1, 5], [9, 5], [5, 9]]) p.px(x, y, METAL[1]);
  p.ball(5.5, 5.5, look.ring ? 3.6 : 3, c, d, l);
  if (look.ring) {
    p.px(3, 5, d);
    p.px(7, 5, d);
    p.px(5, 3, d);
    p.px(5, 7, d);
  }
  if (look.bolt) {
    p.px(6, 3, lit ? look.light : d);
    p.px(5, 4, lit ? look.light : d);
    p.px(4, 5, lit ? '#ffffff' : d);
    p.px(5, 6, lit ? look.light : d);
    p.px(4, 7, lit ? look.light : d);
  } else p.rect(5, 5, 1, 1, lit ? look.light : d);
  return p.canvas();
});

const COMMAND_ICONS = {
  move(p) {
    p.rect(1, 4, 5, 2, '#ffe08a');
    for (let i = 0; i < 4; i++) p.rect(5 + i, 1 + i, 1, 8 - i * 2, '#ffe08a');
  },
  upgrade(p) {
    for (let i = 0; i < 4; i++) p.rect(4 - i, 1 + i, 2 + i * 2, 1, '#86efac');
    p.rect(4, 5, 2, 4, '#86efac');
  },
  card(p) {
    p.ball(5, 3, 1.8, '#c4b5fd', '#8b7fd0');
    p.oval(5, 8, 3.4, 1.6, '#c4b5fd', '#8b7fd0');
  },
  control(p) {
    const teeth = [[4, 0], [0, 4], [8, 4], [4, 8], [1, 1], [7, 1], [1, 7], [7, 7]];
    for (const [x, y] of teeth) p.rect(x, y, 2, 2, '#cbd5e1');
    p.ball(5, 5, 3, '#cbd5e1', '#94a3b8');
    p.disc(5, 5, 1.2, '#15111d');
  },
};

export const commandUrl = (kind) => remember('command:' + kind, () => {
  if (kind === 'spin') return coinUrl();
  const p = new Pix(10, 10);
  COMMAND_ICONS[kind](p);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 20;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(p.outline().canvas(), 0, 0, 20, 20);
  return canvas.toDataURL();
});

const PRIZES = {
  weapon(p, tone) {
    p.bar(3, 12, 11, 4, '#e5e7eb', 2);
    p.line(4, 12, 11, 5, '#9ca3af', 1);
    p.px(12, 3, '#ffffff');
    p.bar(3, 9, 6, 12, '#8a5a2b', 1);
    p.box(2, 12, 2, 2, tone);
  },
  void(p) {
    p.ball(8, 8, 5, '#374151', '#1f2937', '#4b5563');
    p.disc(8, 8, 2.6, '#111827');
    p.line(4, 12, 12, 4, '#9ca3af', 1);
  },
  coins(p) {
    for (const [x, y] of [[5, 11], [10, 11], [7.5, 8], [7.5, 4.5]]) {
      p.oval(x, y, 3, 1.6, '#ffcd38', '#c98a12', '#fff2a8');
    }
    p.px(12, 3, '#ffffff');
  },
};

export function prizeIcon(kind, color, size = 40) {
  return remember('prize:' + kind + ':' + color + ':' + size, () => {
    const p = new Pix(16, 16);
    PRIZES[kind](p, color);
    const symbol = p.outline().canvas(), canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d'), pad = Math.round(size * 0.1), r = Math.round(size * 0.18);
    ctx.fillStyle = color + '33';
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, Math.round(size / 18));
    const x = ctx.lineWidth / 2, w = size - ctx.lineWidth;
    ctx.beginPath();
    ctx.moveTo(x + r, x);
    ctx.arcTo(x + w, x, x + w, x + w, r);
    ctx.arcTo(x + w, x + w, x, x + w, r);
    ctx.arcTo(x, x + w, x, x, r);
    ctx.arcTo(x, x, x + w, x, r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(symbol, pad, pad, size - pad * 2, size - pad * 2);
    return canvas;
  });
}

export const coinSprite = () => remember('coin', () => {
  const p = new Pix(7, 7);
  p.disc(3.5, 3.5, 3.4, '#ffcd38', '#c98a12', '#fff2a8');
  p.rect(3, 2, 1, 3, '#b77a0c');
  return p.outline('#5a3a06').canvas();
});

export function heroUrl(id, size = 48) {
  return remember('heroUrl:' + id + ':' + size, () => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(heroSprite(id), 0, 0, size, size);
    return canvas.toDataURL();
  });
}

export const prizeUrl = (kind, color, size = 40) => remember('prizeUrl:' + kind + ':' + color + ':' + size,
  () => prizeIcon(kind, color, size).toDataURL());

export const coinUrl = () => remember('coinUrl', () => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 14;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(coinSprite(), 0, 0, 14, 14);
  return canvas.toDataURL();
});

function shape(p, inside, color, dark, light) {
  for (let y = 0; y < p.h; y++) {
    for (let x = 0; x < p.w; x++) {
      const v = inside(x + 0.5, y + 0.5);
      if (v === false) continue;
      p.px(x, y, v === 'dark' ? dark : v === 'light' ? light : color);
    }
  }
}

export const heartSprite = () => remember('heart', () => {
  const p = new Pix(15, 14);
  shape(p, (x, y) => {
    const u = (x - 7.5) / 6.3, v = (7.6 - y) / 6.1;
    const f = Math.pow(u * u + v * v - 1, 3) - u * u * v * v * v;
    if (f > 0) return false;
    if (u - v * 0.5 > 0.45 || v < -0.6) return 'dark';
    if (u < -0.2 && v > 0.45) return 'light';
    return 'base';
  }, '#e8344e', '#9e1730', '#ff8a9a');
  p.rect(3, 2, 2, 1, '#ffd2d9');
  p.px(2, 3, '#ffd2d9');
  return p.outline('#2a0710').canvas();
});

export const heartUrl = () => remember('heartUrl', () => heartSprite().toDataURL());

export const shieldSprite = () => remember('shield', () => {
  const p = new Pix(16, 18);
  shape(p, (x, y) => {
    const half = y < 9 ? 6.6 : 6.6 * (1 - (y - 9) / 8.4);
    if (Math.abs(x - 8) > half || y < 1 || y > 17) return false;
    if (Math.abs(x - 8) < 0.6) return 'dark';
    return x < 8 ? 'light' : 'base';
  }, '#1d4fd6', '#0b1530', '#4f9cf9');
  p.rect(3, 2, 1, 6, '#bfe2ff');
  p.px(4, 2, '#bfe2ff');
  return p.outline('#0b1530').canvas();
});

const KIND_COLORS = { buff: '#4ade80', debuff: '#f87171', blessing: '#fbbf24', curse: '#c084fc' };

const SYMBOLS = {
  fury(p) {
    p.bar(3, 12, 11, 4, '#dfe6ee', 2);
    p.bar(3, 10, 6, 13, '#8a5a2b', 1);
    p.px(12, 3, '#ffffff');
  },
  haste(p) {
    for (const [x0, y0, x1, y1] of [[10, 1, 5, 8], [5, 8, 10, 8], [10, 8, 5, 15]]) p.bar(x0, y0, x1, y1, '#ffd84a', 1);
  },
  eagle(p) {
    p.oval(8, 8, 6, 3.4, '#ffffff');
    p.ball(8, 8, 2.2, '#3b82f6', '#1e3a8a');
    p.px(8, 8, '#0b1530');
  },
  luck(p) {
    for (const [x, y] of [[6, 5], [10, 5], [6, 9], [10, 9]]) p.ball(x, y, 2.2, '#22c55e', '#15803d', '#86efac');
    p.bar(8, 10, 9, 14, '#15803d', 1);
  },
  gold(p) {
    p.ball(8, 8, 5, '#ffcd38', '#c98a12', '#fff2a8');
    p.rect(7, 5, 2, 6, '#b77a0c');
  },
  study(p) {
    p.box(3, 4, 10, 8, '#f3e9d2');
    p.rect(7, 4, 2, 8, '#c9b48a');
    p.rect(4, 6, 2, 1, '#8a6fb0');
    p.rect(10, 8, 2, 1, '#8a6fb0');
  },
  weak(p) {
    p.bar(3, 12, 6, 9, '#dfe6ee', 2);
    p.bar(9, 6, 12, 3, '#dfe6ee', 2);
    p.px(7, 8, '#f87171');
    p.px(8, 7, '#f87171');
  },
  tired(p) {
    p.box(4, 2, 8, 2, '#8a5a2b');
    p.box(4, 12, 8, 2, '#8a5a2b');
    p.bar(5, 4, 10, 11, '#e6d3a3', 1);
    p.bar(10, 4, 5, 11, '#e6d3a3', 1);
    p.rect(7, 9, 2, 2, '#ffd84a');
  },
  blind(p) {
    p.oval(8, 8, 6, 3.4, '#ffffff');
    p.ball(8, 8, 2.2, '#3b82f6', '#1e3a8a');
    p.bar(3, 13, 13, 3, '#ef4444', 1);
  },
  sleep(p) {
    for (const [x, y, s] of [[3, 9, 5], [9, 3, 4]]) {
      p.rect(x, y, s, 1, '#c4b5fd');
      p.line(x + s - 1, y + 1, x, y + s - 2, '#c4b5fd');
      p.rect(x, y + s - 1, s, 1, '#c4b5fd');
    }
  },
  wrath(p) {
    p.bar(3, 12, 11, 4, '#ffd84a', 2);
    p.bar(3, 10, 6, 13, '#8a5a2b', 1);
    for (const [x, y] of [[13, 2], [12, 1], [14, 4]]) p.px(x, y, '#ff6a1f');
  },
  fort(p) {
    shape(p, (x, y) => {
      const u = (x - 8) / 6.2, v = (6 - y) / 5.8, f = Math.pow(u * u + v * v - 1, 3) - u * u * v * v * v;
      return f > 0 ? false : 'base';
    }, '#e8344e');
    p.rect(7, 4, 2, 6, '#ffffff');
    p.rect(5, 6, 6, 2, '#ffffff');
  },
  mire(p) {
    p.oval(8, 11, 6, 3, '#4d7c3a', '#365a28');
    for (const [x, y, r] of [[5, 7, 1.6], [10, 5, 2], [8, 9, 1.2]]) p.ball(x, y, r, '#86efac', '#4d7c3a');
  },
  rush(p) {
    for (const [y, x] of [[11, 6], [8, 9], [5, 6]]) {
      p.oval(x, y, 4, 1.8, '#ffcd38', '#c98a12', '#fff2a8');
    }
  },
  iron(p) {
    p.ball(8, 7, 5, '#e5e7eb', '#9ca3af');
    p.rect(5, 6, 2, 2, '#15111d');
    p.rect(9, 6, 2, 2, '#15111d');
    p.rect(6, 11, 4, 3, '#e5e7eb');
    p.rect(7, 11, 1, 3, '#9ca3af');
  },
  swift(p) {
    for (let i = 0; i < 4; i++) p.bar(3 + i, 4 + i * 2, 12 - i, 3 + i * 2, i % 2 ? '#e0f2fe' : '#ffffff', 1);
  },
  breach(p) {
    shape(p, (x, y) => {
      const u = (x - 8) / 6.2, v = (6 - y) / 5.8, f = Math.pow(u * u + v * v - 1, 3) - u * u * v * v * v;
      return f > 0 ? false : 'base';
    }, '#9e1730');
    p.line(8, 2, 6, 6, '#15111d');
    p.line(6, 6, 9, 9, '#15111d');
    p.line(9, 9, 7, 13, '#15111d');
  },
  fog(p) {
    for (const [x, y, r] of [[5, 9, 3], [9, 7, 3.6], [12, 10, 2.4]]) p.ball(x, y, r, '#cbd5e1', '#94a3b8', '#f1f5f9');
  },
};

export function effectIcon(kind, id, size = 40) {
  return remember('effect:' + kind + ':' + id + ':' + size, () => {
    const color = KIND_COLORS[kind] || '#ffffff', p = new Pix(16, 16);
    SYMBOLS[id](p);
    const symbol = p.outline().canvas(), canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d'), line = Math.max(2, Math.round(size / 18)), r = Math.round(size * 0.5);
    ctx.fillStyle = color + '33';
    ctx.strokeStyle = color;
    ctx.lineWidth = line;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, r - line, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.imageSmoothingEnabled = false;
    const pad = Math.round(size * 0.16);
    ctx.drawImage(symbol, pad, pad, size - pad * 2, size - pad * 2);
    return canvas;
  });
}

export const effectUrl = (kind, id, size = 40) => remember('effectUrl:' + kind + ':' + id + ':' + size,
  () => effectIcon(kind, id, size).toDataURL());

export const shieldUrl = (size = 64) => remember('shieldUrl:' + size, () => {
  const canvas = document.createElement('canvas'), image = shieldSprite();
  canvas.width = size;
  canvas.height = Math.round(size * image.height / image.width);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL();
});

export const EFFECT_IDS = Object.keys(SYMBOLS);
export const MOB_KINDS = MOB_IDS;
export const HEROES = HERO_IDS;
