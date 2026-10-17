import { SIZE } from './field.js';

export const CELL = 30;
export const EDGE = 16;

const at = (v) => EDGE + v * CELL;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

const LOOKS = {
  grass: {
    ground: ['#2f4a2b', '#33502e', '#2b4528'], specks: ['#3f6534', '#4f7a3a', '#26401f'], tuft: '#5e8c43',
    bloom: ['#e8d96a', '#f4f4f4'], grid: 'rgba(0, 0, 0, .14)', road: 'dirt', water: 'water',
    rock: { color: '#7d7468', foot: '#4f7a3a' }, hill: { color: '#5d8f42', decor: 'tufts', tuft: '#8fc35a' },
  },
  volcano: {
    ground: ['#2b2326', '#30272a', '#272022'], specks: ['#3a3032', '#463a3b', '#1f191b'], tuft: null,
    bloom: ['#ff6a1f'], grid: 'rgba(0, 0, 0, .2)', road: 'basalt', water: 'lava', cracks: '#ff6a1f',
    rock: { color: '#3d3336', lava: true }, hill: { color: '#4a4043', decor: 'embers', tuft: '#ff7a1f' },
  },
  swamp: {
    ground: ['#27342b', '#2c3a2f', '#232f27'], specks: ['#344636', '#3d5238', '#1e2a22'], tuft: '#6b7f3f',
    bloom: ['#9fbf5a'], grid: 'rgba(0, 0, 0, .16)', road: 'planks', water: 'bog',
    rock: { color: '#676b5f', foot: '#3d5a36' }, hill: { color: '#3d5c35', decor: 'reeds', tuft: '#8a9a4a' },
  },
  snow: {
    ground: ['#aebdd0', '#b7c5d7', '#a7b6c9'], specks: ['#c9d5e4', '#ffffff', '#95a6bb'], tuft: null,
    bloom: ['#ffffff'], grid: 'rgba(40, 60, 90, .16)', road: 'trail', water: 'ice',
    rock: { color: '#6d7888', cap: '#f2f6fc' }, hill: { color: '#e4edf8', decor: 'sparkle', tuft: '#ffffff' },
  },
  desert: {
    ground: ['#b08a54', '#b9935b', '#a7824e'], specks: ['#c7a46a', '#987443', '#d2b27a'], tuft: '#7a8a3f',
    bloom: ['#8e6c3d'], grid: 'rgba(60, 40, 10, .16)', road: 'flag', water: 'oasis', ripples: '#9c7a46',
    rock: { color: '#b4683e', bands: ['#a85c35', '#c47a48', '#9a5230'] },
    hill: { color: '#c7a265', decor: 'ripples', tuft: '#a8854d' },
  },
  graveyard: {
    ground: ['#27242d', '#2c2832', '#232029'], specks: ['#343a33', '#3a3542', '#1d1b22'], tuft: '#4d5a45',
    bloom: ['#8b8597'], grid: 'rgba(0, 0, 0, .2)', road: 'cobble', water: 'tar', graves: true,
    rock: { color: '#cfc6ae', bones: true }, hill: { color: '#4b3e35', decor: 'cross', tuft: '#8a6a44' },
  },
};

const ROADS = {
  dirt: { base: '#6b5236', stones: ['#7d6343', '#735a3c', '#86704f'], size: 0, curb: '#4a3a28' },
  basalt: { base: '#2a2224', stones: ['#4a4043', '#544a4c', '#433a3c'], size: 7, curb: '#1c1617',
    glow: '#ff6a1f' },
  planks: { base: '#3b2c1e', stones: ['#7a5a36', '#6e5030', '#856440'], size: 0, curb: '#2a1f15',
    planks: true },
  trail: { base: '#7f92ab', stones: ['#8c9fb8', '#95a8c0'], size: 0, curb: '#62748c', steps: true },
  flag: { base: '#8a6a40', stones: ['#c9a66c', '#bf9b60', '#d1b07a'], size: 11, curb: '#7a5c36' },
  cobble: { base: '#2f2b35', stones: ['#57525e', '#4d4954', '#615c69'], size: 6, curb: '#1d1b22',
    moss: '#4d5a45' },
};

const LIQUIDS = {
  water: { shore: '#6b5a3c', deep: '#173f66', shallow: '#3b82b6', shine: '#cfeaff', wet: '#1d2b1a' },
  lava: { shore: '#1f191b', deep: '#b8320f', shallow: '#ff8a1f', shine: '#ffe08a', mark: '#3a2522', wet: '#160f10' },
  bog: { shore: '#3a3a26', deep: '#1f2a1a', shallow: '#3f5230', shine: '#9fbf5a', mark: '#5f8a3e', wet: '#18211a' },
  ice: { shore: '#9fb0c6', deep: '#7fb2d8', shallow: '#c4e3f6', shine: '#ffffff', mark: '#eaf6ff', wet: '#8597ae' },
  oasis: { shore: '#d2b27a', deep: '#17606e', shallow: '#3fb6b0', shine: '#d6fff6', wet: '#8a6a40' },
  tar: { shore: '#3a3542', deep: '#050408', shallow: '#17131e', shine: '#8b5cf6', wet: '#15131a' },
};

const lookOf = (biome) => LOOKS[biome] || LOOKS.grass;

function hash(x, y, i) {
  const v = Math.sin(x * 127.1 + y * 311.7 + i * 74.7) * 43758.5453;
  return v - Math.floor(v);
}

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

function stone(ctx, x, y, w, h, color, light, dark) {
  px(ctx, x + 1, y, w - 2, h, color);
  px(ctx, x, y + 1, w, h - 2, color);
  px(ctx, x + 1, y, w - 2, 1, light);
  px(ctx, x, y + 1, 1, h - 3, light);
  px(ctx, x + 1, y + h - 1, w - 2, 1, dark);
  px(ctx, x + w - 1, y + 2, 1, h - 3, dark);
}

function shade(color, amount) {
  const n = parseInt(color.slice(1), 16), c = [n >> 16, n >> 8 & 255, n & 255];
  const out = c.map((v) => Math.max(0, Math.min(255, Math.round(amount > 0 ? v + (255 - v) * amount
    : v * (1 + amount)))));
  return '#' + out.map((v) => v.toString(16).padStart(2, '0')).join('');
}

function paintSoil(ctx, look, tiles) {
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const x0 = at(x), y0 = at(y);
      px(ctx, x0, y0, CELL, CELL, look.ground[Math.floor(hash(x, y, 0) * look.ground.length)]);
      for (let i = 0; i < 9; i++) {
        const sx = x0 + hash(x, y, i + 1) * (CELL - 3), sy = y0 + hash(x, y, i + 20) * (CELL - 3);
        px(ctx, sx, sy, 2 + (i % 2), 2, look.specks[i % look.specks.length]);
      }
      if (look.tuft && hash(x, y, 40) < 0.7) {
        for (let i = 0; i < 3; i++) {
          const tx = x0 + 3 + hash(x, y, 41 + i) * (CELL - 8), ty = y0 + 5 + hash(x, y, 51 + i) * (CELL - 9);
          px(ctx, tx, ty, 1, 3, look.tuft);
          px(ctx, tx - 1, ty + 1, 1, 2, look.tuft);
          px(ctx, tx + 1, ty + 1, 1, 2, shade(look.tuft, 0.25));
        }
      }
      if (hash(x, y, 60) < 0.18) {
        px(ctx, x0 + 4 + hash(x, y, 61) * 20, y0 + 4 + hash(x, y, 62) * 20, 2, 2,
          look.bloom[Math.floor(hash(x, y, 63) * look.bloom.length)]);
      }
      if (look.cracks && hash(x, y, 70) < 0.3) {
        let cx = x0 + 6 + hash(x, y, 71) * 16, cy = y0 + 6 + hash(x, y, 72) * 16;
        ctx.globalAlpha = 0.55;
        for (let i = 0; i < 6; i++) {
          px(ctx, cx, cy, 1, 1, look.cracks);
          cx += hash(x, y, 73 + i) < 0.5 ? 1 : 0;
          cy += 1;
        }
        ctx.globalAlpha = 1;
      }
      if (look.ripples) {
        for (let row = 0; row < 3; row++) {
          for (let k = 0; k < CELL; k += 2) {
            const ry = y0 + 6 + row * 9 + Math.round(Math.sin((x0 + k) * 0.25 + row) * 1.5);
            if (hash(x, y, 80 + row) < 0.6) px(ctx, x0 + k, ry, 2, 1, look.ripples);
          }
        }
      }
      if (look.graves && !tiles[y * SIZE + x] && hash(x, y, 90) < 0.12) grave(ctx, x0 + 7 + hash(x, y, 91) * 14,
        y0 + 6 + hash(x, y, 92) * 12);
    }
  }
}

function grave(ctx, x, y) {
  px(ctx, x - 1, y + 9, 9, 2, 'rgba(0, 0, 0, .35)');
  px(ctx, x + 1, y, 5, 10, '#6b6676');
  px(ctx, x, y + 1, 7, 9, '#6b6676');
  px(ctx, x + 1, y, 5, 1, '#8b8597');
  px(ctx, x, y + 1, 1, 8, '#8b8597');
  px(ctx, x + 6, y + 2, 1, 8, '#4b4655');
  px(ctx, x + 3, y + 2, 1, 5, '#3a3542');
  px(ctx, x + 2, y + 3, 3, 1, '#3a3542');
}

function links(battle) {
  const index = new Map(), joined = new Map(), key = ([x, y]) => y * SIZE + x;
  const join = (a, b) => {
    for (const [from, to] of [[a, b], [b, a]]) {
      if (!joined.has(from)) joined.set(from, []);
      joined.get(from).push(to);
    }
  };
  for (const route of [battle.path, battle.branch]) {
    route.forEach((cell, i) => {
      index.set(key(cell), cell);
      if (i) join(key(cell), key(route[i - 1]));
    });
    if (route.length > 1) {
      const [a, b] = route, out = [2 * a[0] - b[0], 2 * a[1] - b[1]];
      join(key(a), key(out));
    }
  }
  const last = battle.path[battle.path.length - 1], before = battle.path[battle.path.length - 2];
  join(key(last), key([2 * last[0] - before[0], 2 * last[1] - before[1]]));
  if (battle.branch.length) join(key(battle.branch[battle.branch.length - 1]), key(battle.path[battle.merge]));
  return { index, joined };
}

function roadShape(battle) {
  const { index, joined } = links(battle), shape = new Path2D(), inset = CELL * 0.1;
  for (const [at0, [x, y]] of index) {
    const x0 = at(x), y0 = at(y);
    shape.rect(x0 + inset, y0 + inset, CELL - inset * 2, CELL - inset * 2);
    for (const to of joined.get(at0) || []) {
      const dx = to % SIZE - x, dy = Math.floor(to / SIZE) - y;
      const dir = DIRS.find(([a, b]) => a === Math.sign(dx) && b === Math.sign(dy)) || [0, 0];
      if (dir[0] > 0) shape.rect(x0 + CELL - inset, y0 + inset, inset, CELL - inset * 2);
      if (dir[0] < 0) shape.rect(x0, y0 + inset, inset, CELL - inset * 2);
      if (dir[1] > 0) shape.rect(x0 + inset, y0 + CELL - inset, CELL - inset * 2, inset);
      if (dir[1] < 0) shape.rect(x0 + inset, y0, CELL - inset * 2, inset);
    }
  }
  return { shape, index, joined };
}

function paintRoad(ctx, battle, look) {
  const style = ROADS[look.road], { shape, index, joined } = roadShape(battle);
  ctx.save();
  ctx.clip(shape);
  px(ctx, EDGE, EDGE, CELL * SIZE, CELL * SIZE, style.base);
  for (const [key, [x, y]] of index) {
    const x0 = at(x), y0 = at(y), ends = joined.get(key) || [];
    const across = ends.every((to) => Math.floor(to / SIZE) === y);
    if (style.planks) {
      for (let k = 0; k < CELL; k += 5) {
        const color = style.stones[Math.floor(hash(x, y, k) * style.stones.length)];
        if (across) stone(ctx, x0 + k, y0, 4, CELL, color, shade(color, 0.18), shade(color, -0.3));
        else stone(ctx, x0, y0 + k, CELL, 4, color, shade(color, 0.18), shade(color, -0.3));
        px(ctx, across ? x0 + k + 1 : x0 + 4, across ? y0 + 4 : y0 + k + 1, 1, 1, '#2a1f15');
        px(ctx, across ? x0 + k + 1 : x0 + CELL - 5, across ? y0 + CELL - 5 : y0 + k + 1, 1, 1, '#2a1f15');
      }
    } else if (style.size) {
      const n = Math.max(2, Math.round(CELL / style.size));
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          const w = CELL / n, shift = j % 2 ? w / 2 : 0;
          const sx = x0 + i * w + shift - 1, sy = y0 + j * w, color = style.stones[Math.floor(hash(x * n + i, y * n
            + j, 3) * style.stones.length)];
          const side = Math.round(w) - 1;
          stone(ctx, sx + 1, sy + 1, side, side, color, shade(color, 0.2), shade(color, -0.35));
          if (style.moss && hash(x * n + i, y * n + j, 5) < 0.2) px(ctx, sx + 2, sy + w - 3, 2, 1, style.moss);
          if (style.glow && hash(x * n + i, y * n + j, 6) < 0.12) {
            ctx.globalAlpha = 0.7;
            px(ctx, sx, sy + w / 2, 1, 2, style.glow);
            ctx.globalAlpha = 1;
          }
        }
      }
    } else {
      for (let i = 0; i < 10; i++) {
        const color = style.stones[i % style.stones.length];
        px(ctx, x0 + hash(x, y, i + 100) * (CELL - 4), y0 + hash(x, y, i + 120) * (CELL - 3), 3, 2, color);
      }
      for (let i = 0; i < 4; i++) {
        const sx = x0 + 3 + hash(x, y, i + 140) * (CELL - 8), sy = y0 + 3 + hash(x, y, i + 150) * (CELL - 7);
        stone(ctx, sx, sy, 4, 3, '#8a8478', '#a8a296', '#5f5a50');
      }
      if (style.steps) {
        for (let i = 0; i < 3; i++) {
          const sx = x0 + (across ? i * 10 + 3 : 10 + (i % 2) * 6), sy = y0 + (across ? 10 + (i % 2) * 6 : i * 10 + 3);
          px(ctx, sx, sy, 2, 3, style.curb);
        }
      }
    }
  }
  ctx.restore();
  ctx.fillStyle = style.curb;
  const inset = CELL * 0.1;
  for (const [key, [x, y]] of index) {
    const x0 = at(x), y0 = at(y);
    const ends = (joined.get(key) || []).map((to) => [to % SIZE - x, Math.floor(to / SIZE) - y]);
    const open = (dx, dy) => ends.some(([a, b]) => a === dx && b === dy);
    if (!open(0, -1)) ctx.fillRect(x0 + inset, y0 + inset, CELL - inset * 2, 2);
    if (!open(0, 1)) ctx.fillRect(x0 + inset, y0 + CELL - inset - 2, CELL - inset * 2, 2);
    if (!open(-1, 0)) ctx.fillRect(x0 + inset, y0 + inset, 2, CELL - inset * 2);
    if (!open(1, 0)) ctx.fillRect(x0 + CELL - inset - 2, y0 + inset, 2, CELL - inset * 2);
  }
}

const SIDE = CELL * SIZE;
const LIGHT = (() => {
  const v = [-0.45, -0.62, 0.64], l = Math.hypot(v[0], v[1], v[2]);
  return v.map((c) => c / l);
})();

function rgb(color) {
  const n = parseInt(color.slice(1), 16);
  return [n >> 16, n >> 8 & 255, n & 255];
}

const mixed = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const ramps = new Map();

function ramp(color) {
  if (!ramps.has(color)) {
    const base = rgb(color);
    ramps.set(color, [mixed(base, [22, 14, 40], 0.6), mixed(base, [44, 26, 86], 0.3), base,
      mixed(base, [255, 238, 196], 0.24), mixed(base, [255, 252, 238], 0.55)]);
  }
  return ramps.get(color);
}

function smooth(x, y, scale, seed) {
  const fx = x / scale, fy = y / scale, ix = Math.floor(fx), iy = Math.floor(fy);
  const tx = fx - ix, ty = fy - iy, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
  const a = hash(ix, iy, seed), b = hash(ix + 1, iy, seed), c = hash(ix, iy + 1, seed), d = hash(ix + 1, iy + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

const rough = (x, y, seed) => 0.55 * smooth(x, y, 16, seed) + 0.3 * smooth(x, y, 7, seed + 1)
  + 0.15 * smooth(x, y, 3, seed + 2);

function cellsOf(battle, kinds) {
  const list = [];
  battle.tiles.forEach((tile, i) => {
    if (kinds.includes(tile)) list.push([i % SIZE, Math.floor(i / SIZE)]);
  });
  return list;
}

function heights(cells, spread, seed) {
  const h = new Float32Array(SIDE * SIDE), sigma = CELL * spread, reach = Math.ceil(sigma * 2.8);
  const box = [SIDE, SIDE, 0, 0];
  for (const [x, y] of cells) {
    const lift = 0.8 + 0.45 * hash(x, y, seed), cx = (x + 0.5) * CELL + (hash(x, y, seed + 1) - 0.5) * 8;
    const cy = (y + 0.5) * CELL + (hash(x, y, seed + 2) - 0.5) * 8;
    const x0 = Math.max(0, Math.floor(cx - reach)), x1 = Math.min(SIDE, Math.ceil(cx + reach));
    const y0 = Math.max(0, Math.floor(cy - reach)), y1 = Math.min(SIDE, Math.ceil(cy + reach));
    for (let py = y0; py < y1; py++) {
      for (let px0 = x0; px0 < x1; px0++) {
        const dx = px0 + 0.5 - cx, dy = py + 0.5 - cy;
        h[py * SIDE + px0] += lift * Math.exp(-(dx * dx + dy * dy) / (sigma * sigma));
      }
    }
    box[0] = Math.min(box[0], x0);
    box[1] = Math.min(box[1], y0);
    box[2] = Math.max(box[2], x1);
    box[3] = Math.max(box[3], y1);
  }
  return { h, box };
}

function keepRoad(h, box, battle) {
  const band = 7, near = new Float32Array(SIDE * SIDE).fill(band);
  for (const [x, y] of battle.road) {
    if (battle.tiles[y * SIZE + x] === 'tunnel') continue;
    const left = x * CELL + 3, top = y * CELL + 3, right = left + CELL - 6, bottom = top + CELL - 6;
    for (let py = Math.max(box[1], top - band); py < Math.min(box[3], bottom + band); py++) {
      for (let px0 = Math.max(box[0], left - band); px0 < Math.min(box[2], right + band); px0++) {
        const dx = Math.max(left - px0, 0, px0 - right), dy = Math.max(top - py, 0, py - bottom);
        const d = Math.hypot(dx, dy), i = py * SIDE + px0;
        if (d < near[i]) near[i] = d;
      }
    }
  }
  for (let i = 0; i < h.length; i++) if (near[i] < band) h[i] *= near[i] / band;
}

function put(data, i, color, alpha = 255) {
  const k = i * 4;
  if (alpha < 255 && data[k + 3]) {
    const t = alpha / 255;
    data[k] += (color[0] - data[k]) * t;
    data[k + 1] += (color[1] - data[k + 1]) * t;
    data[k + 2] += (color[2] - data[k + 2]) * t;
    data[k + 3] = Math.max(data[k + 3], alpha);
    return;
  }
  data[k] = color[0];
  data[k + 1] = color[1];
  data[k + 2] = color[2];
  data[k + 3] = alpha;
}

function lit(h, i, scale) {
  const dx = (h[i + 1] - h[i - 1]) * scale, dy = (h[i + SIDE] - h[i - SIDE]) * scale, l = Math.hypot(dx, dy, 1);
  return (-dx * LIGHT[0] - dy * LIGHT[1] + LIGHT[2]) / l;
}

const DITHER = [0, 0.5, 0.125, 0.625, 0.75, 0.25, 0.875, 0.375];
const toneOf = (light, x, y) => {
  const step = Math.max(0, Math.min(4, light * 4.6 - 0.4 + (DITHER[(x & 3) + (y & 1) * 4] - 0.5) * 0.7));
  return Math.round(step);
};

function castShadow(data, h, box, edge, dx, dy, alpha) {
  const dark = [8, 6, 14];
  for (let y = Math.max(dy, box[1]); y < Math.min(SIDE, box[3] + dy); y++) {
    for (let x = Math.max(dx, box[0]); x < Math.min(SIDE, box[2] + dx); x++) {
      const i = y * SIDE + x;
      if (h[i] >= edge * 0.7 || h[i - dy * SIDE - dx] < edge) continue;
      if ((x + y) % 2 || alpha > 80) put(data, i, dark, alpha);
    }
  }
}

function paintMountains(data, battle, look) {
  const cells = cellsOf(battle, ['mountain', 'tunnel']);
  if (!cells.length) return;
  const { h, box } = heights(cells, 0.6, 500), style = look.rock, edge = 0.42;
  let top = 0;
  for (let y = box[1]; y < box[3]; y++) {
    for (let x = box[0]; x < box[2]; x++) {
      const i = y * SIDE + x;
      if (h[i] < 0.05) continue;
      const ridge = 1 - Math.abs(2 * smooth(x, y, 14, 510) - 1), crag = 1 - Math.abs(2 * smooth(x, y, 6, 511) - 1);
      h[i] = Math.pow(h[i], 1.25) * (0.7 + 0.4 * ridge + 0.15 * crag);
      top = Math.max(top, h[i]);
    }
  }
  keepRoad(h, box, battle);
  castShadow(data, h, box, edge, 5, 7, 95);
  const shadow = [10, 8, 14], cap = top * 0.66;
  for (let y = Math.max(1, box[1]); y < Math.min(SIDE - 1, box[3]); y++) {
    for (let x = Math.max(1, box[0]); x < Math.min(SIDE - 1, box[2]); x++) {
      const i = y * SIDE + x, v = h[i], grain = hash(x, y, 520);
      if (v < edge * 0.5) continue;
      if (v < edge) {
        const fade = (v - edge * 0.5) / (edge * 0.5);
        if (grain < fade) put(data, i, style.foot ? rgb(style.foot) : shadow, Math.round(70 + 120 * fade));
        continue;
      }
      let tone = toneOf(lit(h, i, 26), x, y);
      if (v < edge * 1.12) tone = Math.max(0, tone - 1);
      let color = style.color;
      if (style.foot && v < edge * 1.45 && grain < (edge * 1.45 - v) / (edge * 0.45)) color = style.foot;
      if (style.bands) color = style.bands[Math.floor(v * 9 + rough(x, y, 530) * 0.6) % style.bands.length];
      if (style.cap && v > cap + (grain - 0.5) * 0.08) color = style.cap;
      let tint = ramp(color)[tone];
      if (style.lava) {
        const vein = Math.abs(smooth(x, y, 11, 540) - 0.5);
        if (vein < 0.025 && v > edge * 1.3) tint = grain < 0.5 ? rgb('#ff6a1f') : rgb('#ffb020');
        if (v > top * 0.9) tint = mixed(rgb('#ff4d1f'), rgb('#ffd84a'), (v - top * 0.9) / (top * 0.1));
      }
      if (style.bones && smooth(x, y, 3, 550) < 0.28) tint = ramp('#3a3542')[Math.min(tone, 2)];
      put(data, i, tint);
    }
  }
  if (style.bones) bones(data, h, box, edge * 1.3);
}

const SKULL = ['.###.', '#####', '#.#.#', '#####', '.#.#.'];

function bones(data, h, box, floor) {
  const ivory = rgb('#f1ead6'), dark = rgb('#2a2530'), shadowed = rgb('#bdb39a');
  for (let y = box[1] + 3; y < box[3] - 6; y += 7) {
    for (let x = box[0] + 3; x < box[2] - 6; x += 7) {
      const ox = x + Math.floor(hash(x, y, 560) * 5), oy = y + Math.floor(hash(x, y, 561) * 5);
      if (h[oy * SIDE + ox] < floor) continue;
      if (hash(x, y, 562) < 0.3) {
        SKULL.forEach((row, dy) => [...row].forEach((c, dx) => {
          if (c !== '.') put(data, (oy + dy) * SIDE + ox + dx, dy === 0 ? ivory : dy > 2 ? shadowed : ivory);
          else if (dy === 2) put(data, (oy + dy) * SIDE + ox + dx, dark);
        }));
      } else {
        const across = hash(x, y, 563) < 0.5;
        for (let k = 0; k < 6; k++) put(data, across ? oy * SIDE + ox + k : (oy + k) * SIDE + ox, ivory);
        for (const end of [0, 5]) {
          put(data, across ? (oy - 1) * SIDE + ox + end : (oy + end) * SIDE + ox - 1, shadowed);
          put(data, across ? (oy + 1) * SIDE + ox + end : (oy + end) * SIDE + ox + 1, shadowed);
        }
      }
    }
  }
}

function paintHills(data, battle, look) {
  const cells = cellsOf(battle, ['hill']);
  if (!cells.length) return;
  const { h, box } = heights(cells, 0.62, 600), style = look.hill, edge = 0.3;
  for (let y = box[1]; y < box[3]; y++) {
    for (let x = box[0]; x < box[2]; x++) {
      const i = y * SIDE + x;
      if (h[i] > 0.05) h[i] = Math.pow(h[i], 1.4) * (0.75 + 0.5 * smooth(x, y, 9, 605));
    }
  }
  keepRoad(h, box, battle);
  castShadow(data, h, box, edge + 0.08, 3, 4, 110);
  const tuft = rgb(style.tuft);
  for (let y = Math.max(1, box[1]); y < Math.min(SIDE - 1, box[3]); y++) {
    for (let x = Math.max(1, box[0]); x < Math.min(SIDE - 1, box[2]); x++) {
      const i = y * SIDE + x, v = h[i], grain = hash(x, y, 610);
      if (v < edge) continue;
      const fade = Math.min(1, (v - edge) / 0.3);
      if (grain > fade * 1.4) continue;
      let tone = toneOf(lit(h, i, 34), x, y);
      if (v < edge + 0.06) tone = Math.max(0, tone - 1);
      if (style.decor === 'ripples' && Math.sin(y * 0.9 + Math.sin(x * 0.2) * 2) > 0.85) tone = Math.max(0, tone - 1);
      put(data, i, ramp(style.color)[tone], Math.round(255 * Math.min(1, fade * 1.6)));
      if (v < edge + 0.25 || grain > 0.04) continue;
      if (style.decor === 'tufts' || style.decor === 'reeds') {
        for (let k = 0; k < (style.decor === 'reeds' ? 5 : 3); k++) put(data, (y - k) * SIDE + x, tuft);
        put(data, (y - 1) * SIDE + x - 1, tuft);
      } else if (style.decor === 'sparkle' || style.decor === 'embers') put(data, i, tuft);
    }
  }
  if (style.decor !== 'cross') return;
  for (const [x, y] of cells) {
    if (hash(x, y, 620) > 0.5) continue;
    const cx = x * CELL + 14, cy = y * CELL + 6;
    for (let k = 0; k < 11; k++) put(data, (cy + k) * SIDE + cx, tuft);
    for (let k = -3; k <= 3; k++) put(data, (cy + 3) * SIDE + cx + k, tuft);
  }
}

function paintLakes(data, battle, look) {
  const style = LIQUIDS[look.water], cells = cellsOf(battle, ['lake']);
  if (!cells.length) return;
  const { h, box } = heights(cells, 0.6, 700);
  const tones = { wet: rgb(style.wet), shore: rgb(style.shore), shallow: rgb(style.shallow), deep: rgb(style.deep),
    shine: rgb(style.shine), mark: rgb(style.mark || style.shine) };
  for (let y = box[1]; y < box[3]; y++) {
    for (let x = box[0]; x < box[2]; x++) {
      const i = y * SIDE + x, v = h[i] * (0.9 + 0.2 * smooth(x, y, 9, 710)), grain = hash(x, y, 720);
      if (v < 0.2) continue;
      if (v < 0.36) {
        const fade = (v - 0.2) / 0.16;
        if (grain < fade) put(data, i, tones.wet, Math.round(60 + 90 * fade));
        continue;
      }
      if (v < 0.48) {
        put(data, i, mixed(tones.shore, tones.wet, grain * 0.3));
        continue;
      }
      const depth = Math.min(1, (v - 0.48) / 0.7), step = Math.floor(depth * 4 + (grain - 0.5) * 0.9);
      let color = mixed(tones.shallow, tones.deep, Math.max(0, Math.min(3, step)) / 3);
      if (Math.sin(x * 0.45 + y * 0.12 + smooth(x, y, 13, 730) * 6) > 0.985 && grain < 0.6 && depth > 0.1) {
        color = mixed(color, tones.shine, 0.7);
      }
      if (style.mark && smooth(x, y, 5, 740) > 0.8 && depth > 0.15) color = tones.mark;
      put(data, i, color);
    }
  }
}

function relief(battle, look) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIDE;
  const g = canvas.getContext('2d'), image = g.createImageData(SIDE, SIDE);
  paintLakes(image.data, battle, look);
  paintHills(image.data, battle, look);
  paintMountains(image.data, battle, look);
  g.putImageData(image, 0, 0);
  return canvas;
}

const reliefs = new WeakMap();

function reliefOf(battle) {
  if (!reliefs.has(battle)) reliefs.set(battle, relief(battle, lookOf(battle.biome)));
  return reliefs.get(battle);
}

export function paintGround(ctx, battle) {
  const look = lookOf(battle.biome), tiles = battle.tiles || new Array(SIZE * SIZE).fill('');
  paintSoil(ctx, look, tiles);
  ctx.strokeStyle = look.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i < SIZE; i++) {
    ctx.moveTo(at(i), EDGE);
    ctx.lineTo(at(i), EDGE + CELL * SIZE);
    ctx.moveTo(EDGE, at(i));
    ctx.lineTo(EDGE + CELL * SIZE, at(i));
  }
  ctx.stroke();
  paintRoad(ctx, battle, look);
  if (battle.tiles) ctx.drawImage(reliefOf(battle), EDGE, EDGE);
}

function mouths(battle) {
  const list = [];
  const tunnel = (cell) => battle.tiles[cell[1] * SIZE + cell[0]] === 'tunnel';
  for (const route of [battle.path, battle.branch]) {
    for (let i = 0; i + 1 < route.length; i++) {
      if (tunnel(route[i]) && !tunnel(route[i + 1])) list.push([route[i], route[i + 1]]);
      if (!tunnel(route[i]) && tunnel(route[i + 1])) list.push([route[i + 1], route[i]]);
    }
  }
  return list;
}

export function paintRoof(ctx, battle) {
  if (!battle.tiles) return;
  const image = reliefOf(battle);
  ctx.save();
  ctx.beginPath();
  for (const [x, y] of cellsOf(battle, ['tunnel'])) ctx.rect(at(x) - 3, at(y) - 3, CELL + 6, CELL + 6);
  ctx.clip();
  ctx.drawImage(image, EDGE, EDGE);
  ctx.restore();
  for (const [[x, y], [nx, ny]] of mouths(battle)) {
    const cx = at(x + 0.5 + (nx - x) * 0.42), cy = at(y + 0.5 + (ny - y) * 0.42), across = nx !== x;
    const w = across ? CELL * 0.34 : CELL * 0.86, h = across ? CELL * 0.86 : CELL * 0.34;
    const fill = ctx.createRadialGradient(cx, cy, 1, cx, cy, CELL * 0.5);
    fill.addColorStop(0, '#05040a');
    fill.addColorStop(0.7, '#0b0912');
    fill.addColorStop(1, 'rgba(11, 9, 18, 0)');
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(cx, cy, w / 2 + 3, h / 2 + 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}
