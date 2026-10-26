import { HERO_IDS, drawHero } from './models.js';
import { MOB_IDS, drawMelt, drawMob, drawSplit, gooColor } from './monsters.js';
import { drawClod, drawCocoon, drawCoinIcon, drawEmblem, drawHeart, drawMeteor, drawMine, drawMound, drawNuke,
  drawRocket, drawTrap, drawWall } from './props.js';

const OUTLINE = '#15111d';

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

export const emblemUrl = (size = 96) => remember('emblemUrl:' + size, () => fitted(drawEmblem(), size).toDataURL());
export const coinIconUrl = (size = 80) => remember('coinIconUrl:' + size,
  () => fitted(drawCoinIcon(), size).toDataURL());
export const heartIconUrl = (size = 80) => remember('heartIconUrl:' + size,
  () => fitted(heartSprite(), size).toDataURL());

export const mobSprite = (id, frame = 0) => remember('mob:' + id + ':' + frame, () => drawMob(id, frame ? 1 : 0));

function fitted(image, size) {
  const pixels = pixelsOf(image), xs = pixels.map((px) => px.x), ys = pixels.map((px) => px.y);
  const left = Math.min(...xs), right = Math.max(...xs) + 1, top = Math.min(...ys), bottom = Math.max(...ys) + 1;
  const span = Math.max(right - left, bottom - top, image.span || 0), cx = (left + right) / 2, cy = (top + bottom) / 2;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size || span;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const scale = canvas.width / span;
  ctx.drawImage(image, canvas.width / 2 - cx * scale, canvas.height / 2 - cy * scale, image.width * scale,
    image.height * scale);
  return canvas;
}

export const mobUrl = (id) => remember('mobUrl:' + id, () => fitted(mobSprite(id)).toDataURL());
export const meltSprite = (id, stage) => remember('melt:' + id + ':' + stage, () => drawMelt(id, stage));
export const splitSprite = (id, stage, apart) => remember('split:' + id + ':' + stage + ':' + apart,
  () => drawSplit(id, stage, apart));
export { gooColor };

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

export const wallSprite = (stage) => remember('wall:' + stage, () => drawWall(stage));

export const hookSprite = () => remember('hook', () => mapSprite([
  '...........',
  '....OO.....',
  '...O..O....',
  '....OO.....',
  '....Ls.....',
  '....Ls.....',
  '....Ls.....',
  '.W..Ls..W..',
  '.Ls.Ls..sL.',
  '.Ls.Ls..sL.',
  '..LsLsssL..',
  '...LLLLL...',
  '...........',
], { O: '#b8c0c8', L: '#e5e9ee', s: '#8b939c', W: '#ffffff' }));

export const linkSprite = (turned) => remember('link:' + turned, () => mapSprite(turned ? [
  '.....',
  '.LLL.',
  '.L.s.',
  '.L.s.',
  '.Lss.',
  '.....',
] : [
  '......',
  '.LLLL.',
  '.L..s.',
  '.Lsss.',
  '......',
], { L: '#cbd2d9', s: '#7d858f' }));

export const moundSprite = (biome, frame, claws) => remember('mound:' + biome + ':' + frame + ':' + claws,
  () => drawMound(biome, frame, claws));

export const clodSprite = (biome, seed) => remember('clod:' + biome + ':' + seed, () => drawClod(biome, seed));

export const trapSprite = (closed) => remember('trap:' + closed, () => drawTrap(closed));
export const nukeSprite = () => remember('nuke', () => drawNuke());

export const flaskSprite = () => remember('flask', () => {
  const p = new Pix(7, 9);
  p.box(3, 0, 1, 2, '#e8eef4');
  p.ball(3.5, 5, 2.4, '#9be22d', '#5b9a12', '#d9ff8f');
  return p.outline().canvas();
});

export const mineSprite = (kind, lit) => remember('mine:' + kind + ':' + lit, () => drawMine(kind, lit));
export const rocketSprite = () => remember('rocket', () => drawRocket());
export const meteorSprite = () => remember('meteor', () => drawMeteor());
export const cocoonSprite = (frame) => remember('cocoon:' + frame, () => drawCocoon(frame));

export const bulletSprite = () => remember('bullet', () => mapSprite([
  '.C.',
  'CCc',
  'BBb',
  'BBb',
  'bBb',
], { C: '#f0a060', c: '#b8602a', B: '#e8c050', b: '#a07a20' }));

const SPARK = { core: '#ffffff', glow: '#ffd1dc', hot: '#ff5c7c', body: '#e0103a', ring: '#ffd38a',
  ringDark: '#c9853a' };

function drawParticle(p, size) {
  const c = size / 2, body = size * 0.23, tilt = -0.42, reach = size * 0.5;
  const ring = (x, y) => {
    const dx = x + 0.5 - c, dy = y + 0.5 - c;
    const u = dx * Math.cos(tilt) + dy * Math.sin(tilt), v = -dx * Math.sin(tilt) + dy * Math.cos(tilt);
    return { on: Math.abs(Math.hypot(u / (size * 0.42), v / (size * 0.16)) - 1) < 0.13, front: v > 0 };
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const r = ring(x, y), d = Math.hypot(x + 0.5 - c, y + 0.5 - c);
      if (r.on && !r.front && d > body + 0.5) p.px(x, y, SPARK.ringDark);
    }
  }
  for (let k = -reach; k <= reach; k += 0.5) {
    const fade = Math.abs(k) / reach;
    const color = fade < 0.35 ? SPARK.core : fade < 0.6 ? SPARK.glow : fade < 0.85 ? SPARK.hot : SPARK.body;
    p.px(c - 0.5 + k, c - 0.5, color);
    p.px(c - 0.5, c - 0.5 + k, color);
    if (Math.abs(k) < reach * 0.45) {
      const tip = fade < 0.3 ? SPARK.glow : SPARK.hot;
      p.px(c - 0.5 + k * 0.7, c - 0.5 + k * 0.7, tip);
      p.px(c - 0.5 + k * 0.7, c - 0.5 - k * 0.7, tip);
    }
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - c, dy = y + 0.5 - c, d = Math.hypot(dx, dy);
      if (d > body) continue;
      const light = (dx + dy) / body;
      let color = d < body * 0.4 ? SPARK.core : d < body * 0.7 ? SPARK.glow : SPARK.hot;
      if (light > 0.6 && d >= body * 0.7) color = SPARK.body;
      p.px(x, y, color);
    }
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const r = ring(x, y);
      if (r.on && r.front) p.px(x, y, (x + y) % 3 ? SPARK.ring : SPARK.ringDark);
    }
  }
  const sparks = [[0.18, 0.2, SPARK.glow], [0.83, 0.78, SPARK.core], [0.2, 0.84, SPARK.hot], [0.86, 0.16, SPARK.glow]];
  for (const [fx, fy, color] of sparks) p.px(fx * size, fy * size, color);
}

export const particleSprite = (size = 17) => remember('particle:' + size, () => {
  const p = new Pix(size, size);
  drawParticle(p, size);
  return p.outline('#2a0610').canvas();
});

export const particleUrl = (size = 14) => remember('particleUrl:' + size, () => {
  const image = mapSprite([
    '.........',
    '....W....',
    '...rpr...',
    '..rpWpr..',
    '.WpWWWpW.',
    '..rpWpr..',
    '...rpr...',
    '....W....',
    '.........',
  ], { W: SPARK.core, p: SPARK.hot, r: SPARK.body });
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, 0, 0, size, size);
  return canvas.toDataURL();
});

const FLAG = { rod: '#8a5a12', rodLight: '#e6b54a', knob: '#ffe08a', edge: '#6b4106', top: '#ffe58a', mid: '#f5b82e',
  low: '#c98a12', seam: '#fff4c2' };

export function flagCanvas(width, height, scale = 2) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const g = canvas.getContext('2d');
  g.scale(scale, scale);
  const rod = Math.max(2, height * 0.1), left = width * 0.13, right = width * 0.87, notch = height * 0.2;
  const line = Math.max(0.8, width / 16);
  g.beginPath();
  g.moveTo(left, rod * 0.6);
  g.lineTo(right, rod * 0.6);
  g.lineTo(right, height - line / 2);
  g.lineTo(width / 2, height - notch);
  g.lineTo(left, height - line / 2);
  g.closePath();
  const cloth = g.createLinearGradient(0, rod, 0, height);
  cloth.addColorStop(0, FLAG.top);
  cloth.addColorStop(0.5, FLAG.mid);
  cloth.addColorStop(1, FLAG.low);
  g.fillStyle = cloth;
  g.fill();
  g.lineJoin = 'round';
  g.lineWidth = line;
  g.strokeStyle = FLAG.edge;
  g.stroke();
  if (width >= 24) {
    const inset = width * 0.12;
    g.beginPath();
    g.moveTo(left + inset, rod + inset * 0.6);
    g.lineTo(right - inset, rod + inset * 0.6);
    g.lineTo(right - inset, height - inset * 1.6);
    g.lineTo(width / 2, height - notch - inset * 1.1);
    g.lineTo(left + inset, height - inset * 1.6);
    g.closePath();
    g.lineWidth = line * 0.6;
    g.strokeStyle = FLAG.seam;
    g.stroke();
  }
  const bar = g.createLinearGradient(0, 0, 0, rod);
  bar.addColorStop(0, FLAG.rodLight);
  bar.addColorStop(1, FLAG.rod);
  g.fillStyle = bar;
  g.strokeStyle = FLAG.edge;
  g.lineWidth = line;
  g.beginPath();
  g.moveTo(line, line / 2);
  g.lineTo(width - line, line / 2);
  g.arcTo(width - line / 2, line / 2, width - line / 2, rod, rod / 2);
  g.arcTo(width - line / 2, rod, line, rod, rod / 2);
  g.lineTo(line, rod);
  g.arcTo(line / 2, rod, line / 2, line / 2, rod / 2);
  g.arcTo(line / 2, line / 2, width - line, line / 2, rod / 2);
  g.closePath();
  g.fill();
  g.stroke();
  for (const x of [line * 1.6, width - line * 1.6]) {
    g.beginPath();
    g.arc(x, rod / 2, rod * 0.32, 0, Math.PI * 2);
    g.fillStyle = FLAG.knob;
    g.fill();
  }
  return canvas;
}

export const flagUrl = (width = 14, height = 19) => remember('flag:' + width + ':' + height,
  () => flagCanvas(width, height, 3).toDataURL());

const PRIZES = {
  particle(p) {
    drawParticle(p, 16);
  },
  weapon(p, tone) {
    p.bar(3, 12, 11, 4, '#e5e7eb', 2);
    p.line(4, 12, 11, 5, '#9ca3af', 1);
    p.px(12, 3, '#ffffff');
    p.bar(3, 9, 6, 12, '#8a5a2b', 1);
    p.box(2, 12, 2, 2, tone);
  },
  rune(p, tone) {
    p.ball(8, 8.5, 6, '#3f3a4a', '#26222e', '#5b5468');
    p.line(8, 4, 8, 13, tone);
    p.line(5, 6, 8, 9, tone);
    p.line(11, 6, 8, 9, tone);
    p.line(5, 12, 7, 10, tone);
    p.line(11, 12, 9, 10, tone);
    p.px(8, 4, '#ffd0d8');
    p.px(5, 6, '#ffd0d8');
    p.px(11, 6, '#ffd0d8');
    for (const [x, y] of [[2, 3], [14, 4], [13, 14]]) p.px(x, y, '#ffffff');
  },
  void(p) {
    p.ball(8, 8, 5, '#374151', '#1f2937', '#4b5563');
    p.disc(8, 8, 2.6, '#111827');
    p.line(4, 12, 12, 4, '#9ca3af', 1);
  },
  handful(p) {
    for (const [x, y] of [[5, 11], [10, 11], [7.5, 8], [7.5, 4.5]]) {
      p.oval(x, y, 3, 1.6, '#ffcd38', '#c98a12', '#fff2a8');
    }
    p.px(12, 3, '#ffffff');
  },
  bag(p) {
    p.ball(8, 10, 5, '#b07a3c', '#7a5023', '#d39b55');
    p.oval(8, 4, 3, 1.5, '#b07a3c', '#7a5023', '#d39b55');
    p.px(5.5, 3, '#d39b55');
    p.px(10.5, 3, '#7a5023');
    p.rect(5, 6, 6, 1, '#f0d08a');
    p.px(11, 7, '#f0d08a');
    p.ball(8, 10.5, 2, '#ffcd38', '#c98a12', '#fff2a8');
    p.px(8, 10.5, '#b77a0c');
    for (const [x, y] of [[2.6, 14], [13.2, 14.2]]) p.oval(x, y, 1.7, 0.9, '#ffcd38', '#c98a12', '#fff2a8');
    p.px(12, 2, '#ffffff');
  },
  chest(p) {
    p.box(3, 1, 10, 4, '#7a4e25');
    p.rect(3, 2, 10, 1, '#5e3a1b');
    for (const x of [5, 10]) p.rect(x, 1, 1, 4, '#d6a72e');
    p.box(2, 9, 12, 5, '#8a5a2b');
    p.rect(2, 11, 12, 1, '#6b4220');
    for (const x of [4, 11]) p.rect(x, 9, 1, 5, '#d6a72e');
    for (const [x, y, c] of [[4, 8.2, '#ffcd38'], [7, 7.4, '#fff2a8'], [9.6, 7.8, '#ffcd38'], [12, 8.4, '#c98a12'],
      [5.6, 6.8, '#ffcd38'], [8.4, 6.2, '#ffcd38'], [11, 6.9, '#fff2a8']]) p.oval(x, y, 1.7, 1.1, c, '#c98a12');
    p.px(8, 6, '#ffffff');
    p.px(10, 7, '#ff4d6d');
    p.px(6, 7, '#60a5fa');
    p.box(7, 10, 2, 2, '#ffd43b');
    p.px(7.5, 11, '#5a3a06');
    for (const [x, y] of [[1, 3], [14, 4], [2, 6]]) p.px(x, y, '#ffffff');
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
    return fitted(heroSprite(id), size).toDataURL();
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

const MARKS = {
  sword(p) {
    for (let i = 0; i < 4; i++) p.px(6 - i, i, i ? '#e2e8f0' : '#ffffff');
    p.px(2, 4, '#cbd5e1');
    for (const [x, y] of [[1, 3], [3, 5]]) p.px(x, y, '#f5c542');
    p.px(1, 5, '#8b5a2b');
    p.px(0, 6, '#f5c542');
  },
  shield(p) {
    const rows = [[1, 5], [0, 6], [0, 6], [0, 6], [1, 5], [2, 4], [3, 3]];
    rows.forEach(([from, to], y) => {
      for (let x = from; x <= to; x++) p.px(x, y, x + y < 4 ? '#bfdbfe' : x - y > 2 || y > 4 ? '#3b6fd6' : '#60a5fa');
    });
    for (let y = 1; y < 6; y++) p.px(3, y, '#1e3a8a');
  },
  spot(p) {
    const rows = [[2, 4], [1, 5], [1, 5], [1, 5], [2, 4], [3, 3]];
    rows.forEach(([from, to], y) => {
      for (let x = from; x <= to; x++) p.px(x, y, x + y < 4 ? '#f3f0fb' : x - y > 2 || y > 3 ? '#8f89aa' : '#c9c4dd');
    });
    p.px(3, 2, '#2a2540');
  },
};

export const markUrl = (kind) => remember('mark:' + kind, () => {
  const p = new Pix(7, 7);
  MARKS[kind](p);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 14;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(p.outline('#1b1830').canvas(), 0, 0, 14, 14);
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

export const heartSprite = () => remember('heart', drawHeart);


const KIND_COLORS = { buff: '#4ade80', debuff: '#f87171', blessing: '#fbbf24', curse: '#c084fc', biome: '#7dd3fc',
  resist: '#94a3b8' };

const SYMBOLS = {
  grass(p) {
    for (const x of [3, 7, 11]) {
      p.bar(x + 1, 14, x, 8, '#4f7a3a', 1);
      p.bar(x + 1, 14, x + 3, 9, '#7fb34f', 1);
    }
    p.rect(9, 5, 2, 2, '#f5e663');
  },
  volcano(p) {
    for (let y = 6; y < 15; y++) {
      p.rect(Math.round(8 - (y - 6) * 0.7), y, Math.round(1 + (y - 6) * 1.4), 1, y < 8 ? '#ff7a1f' : '#5a4648');
    }
    p.bar(7, 9, 6, 13, '#ff6a1f', 1);
    p.rect(6, 2, 2, 2, '#9a9a9a');
    p.rect(9, 1, 2, 2, '#bdbdbd');
  },
  swamp(p) {
    for (const [x, top] of [[4, 4], [8, 2], [12, 5]]) {
      p.bar(x, 14, x, top + 3, '#6b8a3a', 1);
      p.rect(x - 1, top, 2, 3, '#7a4a2a');
    }
    p.rect(1, 13, 14, 2, '#3f5230');
  },
  snow(p) {
    for (const [x0, y0, x1, y1] of [[8, 1, 8, 15], [2, 4, 14, 12], [2, 12, 14, 4]]) p.bar(x0, y0, x1, y1, '#e0f2fe', 1);
    for (const [x, y] of [[6, 2], [10, 2], [6, 14], [10, 14]]) p.px(x, y, '#e0f2fe');
  },
  desert(p) {
    p.rect(6, 3, 4, 12, '#4f9a3a');
    p.rect(2, 6, 3, 2, '#4f9a3a');
    p.rect(2, 4, 2, 3, '#4f9a3a');
    p.rect(11, 8, 3, 2, '#4f9a3a');
    p.rect(12, 5, 2, 4, '#4f9a3a');
    p.rect(7, 4, 1, 10, '#7fc35a');
  },
  graveyard(p) {
    p.rect(4, 3, 8, 12, '#8b8597');
    p.rect(5, 2, 6, 1, '#8b8597');
    p.rect(7, 5, 2, 7, '#3a3542');
    p.rect(5, 7, 6, 2, '#3a3542');
  },
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
  resist(p) {
    shape(p, (x, y) => {
      const half = y < 8 ? 5.8 : 5.8 * (1 - (y - 8) / 7.6);
      if (Math.abs(x - 8) > half || y < 2 || y > 15) return false;
      return x < 8 ? 'light' : 'base';
    }, '#7c6f64', '#3f3833', '#a8998a');
    for (const dx of [-3, 0, 3]) p.line(6 + dx, 4, 9 + dx, 12, '#ef4444');
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

const SWORD = [
  '.........W',
  '........WG',
  '.......WG.',
  '......WG..',
  '.....WG...',
  '..Y.WG....',
  '...YG.....',
  '..B.Y.....',
  '.B........',
  'Y.........',
];
const SWORD_COLORS = { W: '#f8fafc', G: '#94a3b8', Y: '#facc15', B: '#78350f' };

export const mightSprite = () => remember('might', () => {
  const p = new Pix(16, 16);
  p.disc(8, 8, 7.4, '#7f1d1d');
  p.disc(8, 8, 6.4, '#dc2626');
  for (const [x, y] of [[4, 3], [3, 4], [5, 3], [3, 5]]) p.px(x, y, '#fca5a5');
  SWORD.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (SWORD_COLORS[row[x]]) p.px(x + 3, y + 3, SWORD_COLORS[row[x]]);
  });
  return p.outline().canvas();
});

export const mightUrl = (size = 32) => remember('mightUrl:' + size, () => {
  const canvas = document.createElement('canvas'), image = mightSprite();
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, 0, 0, size, size);
  return canvas.toDataURL();
});

export const EFFECT_IDS = Object.keys(SYMBOLS);
export const MOB_KINDS = MOB_IDS;
export const HEROES = HERO_IDS;
