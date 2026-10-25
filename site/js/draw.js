import { LETTERS, SIZE } from './field.js';
import { CELL, EDGE, paintGround, paintPeaks, paintRoof } from './terrain.js';
import { HERO_SIZE, bubbleSprite, bulletSprite, clodSprite, cocoonSprite, coinSprite, flaskSprite, heartSprite,
  gooColor, heroSprite, hookSprite, linkSprite, meltSprite, meteorSprite, mineSprite, mobSprite, moundSprite,
  nukeSprite, pixelsOf, reticleSprite, rocketSprite, shellSprite, splitSprite, starSprite, tintSprite, trapSprite,
  wallSprite } from './sprites.js';
import { SOILS } from './props.js';
import { gearColor } from './gacha.js';

export const BOARD = EDGE * 2 + CELL * SIZE;
const FIELD = 640;

const ZOOM = 2;
const SMOOTH = 28;
const TURN = 9;
const TURN_STEPS = 8;
const KICK = 0.1;
const FLASH = 0.06;
const TRAVEL = 0.1;
const WALK = 7;
const BEAT = 1.1;
const BEAT_FAST = 0.5;
const FLAP = 9;
const LIFT = 7;
const RISE = 0.3;
const TRAIL_STEP = 0.2;
const CORPSE = { fall: 0.45, lie: 1, fade: 1.1, max: 60 };
const DECALS_MAX = 300;
const TINTS = { poison: '#4ade80', plague: '#6d28d9', burn: '#ff7a1f', blue: '#4aa3ff', chill: '#8ee6ff',
  fury: '#ff4d1f' };
const HIT_FLASH = 0.15;
const ELEMENT_BITS = {
  fire: ['#ffd84a', '#ff7a1f', '#ff4d1f'], ice: ['#f0fdff', '#a5f3fc', '#67e8f9'],
  storm: ['#fef9c3', '#facc15', '#ffffff'],
  poison: ['#d9f99d', '#a3e635', '#7c3aed'],
};
const DIG = { sink: 0.3, rise: 0.3, trail: 0.12, fade: 1.4, wiggle: 7 };
const HOOKLESS = { butcher: 'butcherbare' };
const HAND = { x: 13, y: -11, link: 4.5 };
const NUKE_LIFE = 3.4;
const SIGHT_RAYS = 180;
const MINE_LIGHTS = { big: 'rgba(255, 59, 59, .9)', mine: 'rgba(255, 176, 32, .9)' };
const MINE_BLASTS = {
  big: { sparks: ['#ffffff', '#ffd84a', '#ff4d1f'], ring: '#ff6a1f' },
  mine: { sparks: ['#ffd84a', '#ff8a1f', '#c2410c'], ring: '#ffb020' },
  grenade: { sparks: ['#fff3b0', '#ffb020', '#5f6b3a'], ring: '#ffd84a' },
};
const CHARGES = {
  heavy: { ring: '#fff3b0', glow: 'rgba(255, 243, 176, .95)', sparks: ['#ffffff', '#fff3b0'] },
  aim: { ring: '#ef4444', glow: 'rgba(255, 90, 90, .95)', sparks: ['#fecaca', '#ef4444'] },
  rpg: { ring: '#ffb020', glow: 'rgba(255, 176, 32, .95)', sparks: ['#ffd84a', '#ff8a1f'] },
};
const ELEMENT_TONES = { fire: '#ff8a1f', poison: '#a3e635', ice: '#a5f3fc', storm: '#fde047' };
const STORM_GUSTS = 14;
const SNOWFLAKES = 90;
const INK = '#f4f0e8';
const MUTED = 'rgba(166, 162, 189, .85)';
const DARK = '#100e1f';
const BOLTS = {
  sniper: { look: 'tracer', color: '#fff3b0', width: 2, bullet: true },
  gunner: { look: 'dot', color: '#ffd84a', size: 2 },
  bomber: { look: 'lob', color: '#5b7330', size: 4 },
  earth: { look: 'lob', color: '#9a8f80', size: 4 },
  alchemist: { look: 'dot', color: '#9be22d', size: 3 },
  hunter: { look: 'bolt', color: '#e8d9b5', width: 2 },
  frost: { look: 'shard', color: '#9ff3ff', size: 3 },
  shaman: { look: 'dot', color: '#5eead4', size: 3 },
  miner: { look: 'dot', color: '#c7d2fe', size: 2 },
  banner: { look: 'dot', color: '#ff5fb0', size: 3 },
  healer: { look: 'tracer', color: '#fde68a', width: 2 },
  sage: { look: 'dot', color: '#d8b4fe', size: 3 },
};
const FLAME = ['#fff3b0', '#ffd84a', '#ff9a1f', '#ff5a1f', '#b8320f'];
const BLUE_FLAME = ['#e0f2ff', '#9bd5ff', '#4aa3ff', '#2563eb', '#1e3a8a'];
const PUDDLES = {
  poison: { tones: ['#2f4f0e', '#3f6212', '#4d7c0f', '#65a30d', '#84cc16'], shine: ['#d9f99d', '#bef264'] },
  plague: { tones: ['#0b0a10', '#17141f', '#231d2e', '#2f2540', '#4c1d95'], shine: ['#a78bfa', '#7c3aed'] },
  oil: { tones: ['#08070a', '#121016', '#1a171f', '#24202b', '#3b3550'], shine: ['#8b7fd0', '#5eead4'] },
};
const FLAME_HOLD = 0.3;
const FLAME_BITS = 34;
const BADGE_HALF = 16;
const OUTLINE = [[-2, 0], [2, 0], [0, -2], [0, 2]];
const SPLIT_LIFE = 0.35;
const SPLIT_APART = 9;
const MELT_LIFE = 0.45;
const GOO_LIFE = 5;
const RESOLUTION_MAX = 2.5;
const HERO_TURN_STEPS = 16;
const LABELS_MAX = 400;
const piles = new WeakMap();
const glows = new Map();

const at = (v) => EDGE + v * CELL;
const AMBIENT = { grass: 'butterflies', swamp: 'fireflies', snow: 'snow', desert: 'dust', volcano: 'embers',
  graveyard: 'wisps' };
const GLINTS = { grass: { color: '#cfeaff' }, swamp: { color: '#9fbf5a', bubble: true }, snow: { color: '#ffffff' },
  desert: { color: '#d6fff6' }, volcano: { color: '#ffe08a', bubble: true }, graveyard: { color: '#8b5cf6' } };
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const ease = (from, to, rate, dt) => from + (to - from) * (1 - Math.exp(-rate * dt));
const noise = (i, seed) => {
  const v = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

function shortTurn(from, to, max) {
  let delta = to - from;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return from + Math.max(-max, Math.min(max, delta));
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function square(ctx, x, y, size, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size);
}

const turnOf = (angle, steps = TURN_STEPS) => Math.round(angle / (Math.PI * 2 / steps));

function sprite(ctx, image, x, y, angle, zoom = ZOOM, lift = 0, steps = TURN_STEPS) {
  const scale = zoom / (image.fine || 1), w = image.width * scale, h = image.height * scale;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.rotate(turnOf(angle, steps) * (Math.PI * 2 / steps));
  ctx.drawImage(image, -w / 2, -h / 2 + lift, w, h);
  ctx.restore();
}

const puddleShapes = new Map();

function puddleShape(radius, seed, look = 'poison') {
  const size = Math.max(4, Math.round(radius)), key = size + ':' + seed + ':' + look, { tones, shine } = PUDDLES[look];
  if (puddleShapes.has(key)) return puddleShapes.get(key);
  const canvas = document.createElement('canvas'), side = size * 2 + 2;
  canvas.width = canvas.height = side;
  const ctx = canvas.getContext('2d'), c = side / 2;
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      const dx = x + 0.5 - c, dy = (y + 0.5 - c) * 1.2, a = Math.atan2(dy, dx), d = Math.hypot(dx, dy);
      const edge = size * (0.82 + 0.1 * Math.sin(3 * a + seed) + 0.06 * Math.sin(5 * a + seed * 2)
        + 0.04 * Math.sin(7 * a + seed * 3));
      if (d > edge) continue;
      const k = d / edge;
      let color = k > 0.86 ? tones[0] : k > 0.7 ? tones[1] : k > 0.35 ? tones[2] : tones[3];
      if (k < 0.55 && Math.sin(x * 1.7 + seed) + Math.cos(y * 2.1 + seed) > 1.4) color = tones[4];
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.fillStyle = shine[0];
  ctx.fillRect(Math.round(c - size * 0.35), Math.round(c - size * 0.35), 2, 1);
  ctx.fillRect(Math.round(c - size * 0.35), Math.round(c - size * 0.35) + 1, 1, 1);
  ctx.fillStyle = shine[1];
  ctx.fillRect(Math.round(c + size * 0.25), Math.round(c - size * 0.1), 1, 1);
  puddleShapes.set(key, canvas);
  return canvas;
}

const gooShapes = new Map();

function tone(hex, target, t) {
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 'rgb(' + v.map((c, i) => Math.round(c + (target[i] - c) * t)).join(',') + ')';
}

function gooShape(radius, seed, color) {
  const size = Math.max(3, Math.round(radius)), key = size + ':' + seed + ':' + color;
  if (gooShapes.has(key)) return gooShapes.get(key);
  const dark = [10, 8, 20], light = [255, 255, 255];
  const tones = [tone(color, dark, 0.55), tone(color, dark, 0.3), tone(color, dark, 0.1), color,
    tone(color, light, 0.35), tone(color, light, 0.7)];
  const canvas = document.createElement('canvas'), side = size * 2 + 10;
  canvas.width = canvas.height = side;
  const ctx = canvas.getContext('2d'), c = side / 2, put = (x, y, fill) => {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, 1, 1);
  };
  const lobes = [0, 1, 2, 3, 4].map((i) => {
    const a = noise(i, seed) * Math.PI * 2, d = size * (0.72 + 0.12 * noise(i + 20, seed));
    return [Math.cos(a) * d, Math.sin(a) * d, size * (0.22 + 0.14 * noise(i + 10, seed))];
  });
  const depth = (dx, dy) => {
    const a = Math.atan2(dy, dx), d = Math.hypot(dx, dy);
    const edge = size * (0.74 + 0.07 * Math.sin(2 * a + seed) + 0.05 * Math.sin(5 * a + seed * 1.7)
      + 0.035 * Math.sin(9 * a + seed * 2.3));
    if (d <= edge) return d / edge;
    for (const [lx, ly, lr] of lobes) {
      const q = Math.hypot(dx - lx, dy - ly);
      if (q <= lr) return 0.75 + 0.2 * q / lr;
    }
    return null;
  };
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      const dx = x + 0.5 - c, dy = (y + 0.5 - c) * 1.45, k = depth(dx, dy);
      if (k === null) continue;
      const ripple = Math.sin(Math.hypot(dx, dy) * 1.3 - Math.atan2(dy, dx) * 2 + seed) > 0.6;
      put(x, y, k > 0.88 ? tones[0] : k > 0.72 ? tones[1] : ripple && k > 0.3 ? tones[2] : tones[3]);
    }
  }
  for (let i = 0; i < 5; i++) {
    const a = seed * 1.3 + i * 1.37, d = size * (1.05 + 0.18 * Math.sin(i * 3 + seed));
    const x = Math.round(c + Math.cos(a) * d), y = Math.round(c + Math.sin(a) * d / 1.45), big = i % 2 === 0;
    put(x, y, tones[1]);
    if (big) {
      put(x + 1, y, tones[3]);
      put(x, y + 1, tones[0]);
      put(x + 1, y + 1, tones[1]);
    }
  }
  for (let i = 0; i < 3; i++) put(Math.round(c - size * 0.42) + i, Math.round(c - size * 0.22), tones[5]);
  put(Math.round(c - size * 0.46), Math.round(c - size * 0.22) + 1, tones[4]);
  put(Math.round(c + size * 0.2), Math.round(c + size * 0.02), tones[4]);
  put(Math.round(c + size * 0.24), Math.round(c + size * 0.02), tones[5]);
  gooShapes.set(key, canvas);
  return canvas;
}

function softCircle(cache, key, size, paint) {
  if (!cache.has(key)) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    paint(canvas.getContext('2d'), size / 2);
    cache.set(key, canvas);
  }
  return cache.get(key);
}

function glow(ctx, x, y, r, color, strength) {
  const image = softCircle(glows, color, 64, (g, half) => {
    const fill = g.createRadialGradient(half, half, 0, half, half, half);
    fill.addColorStop(0, color);
    fill.addColorStop(1, 'rgba(0, 0, 0, 0)');
    g.fillStyle = fill;
    g.fillRect(0, 0, half * 2, half * 2);
  });
  ctx.globalAlpha = strength;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(image, x - r, y - r, r * 2, r * 2);
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = 1;
}

function sparkle(ctx, x, y, arm, color) {
  square(ctx, x, y, 2, color);
  for (let i = 1; i <= arm; i++) {
    square(ctx, x - i * 2, y, 2, color);
    square(ctx, x + i * 2, y, 2, color);
    square(ctx, x, y - i * 2, 2, color);
    square(ctx, x, y + i * 2, 2, color);
  }
}

function stars(ctx, x, y, r, spin) {
  const image = starSprite();
  for (let i = 0; i < 3; i++) {
    const a = spin + i * Math.PI * 2 / 3;
    ctx.drawImage(image, Math.round(x + Math.cos(a) * r - image.width / 2), Math.round(y + Math.sin(a) * r * 0.45
      - image.height / 2));
  }
}

function burst(ctx, x, y, r, count, spin, arm, color) {
  for (let i = 0; i < count; i++) {
    const a = spin + i * Math.PI * 2 / count;
    sparkle(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, arm, color);
  }
}

function orbit(ctx, x, y, r, count, spin, color, size, cross = false) {
  for (let i = 0; i < count; i++) {
    const a = spin + i * Math.PI * 2 / count, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    if (cross) {
      square(ctx, px, py - size, size, color);
      square(ctx, px, py + size, size, color);
      square(ctx, px - size, py, size, color);
      square(ctx, px + size, py, size, color);
    }
    square(ctx, px, py, size, color);
  }
}

function pileOf(image, angle) {
  if (!piles.has(image)) piles.set(image, new Map());
  const known = piles.get(image), step = ((turnOf(angle) % TURN_STEPS) + TURN_STEPS) % TURN_STEPS;
  if (known.has(step)) return known.get(step);
  const a = step * Math.PI * 2 / TURN_STEPS, cos = Math.cos(a), sin = Math.sin(a);
  const cx = image.width / 2, cy = image.height / 2;
  const grains = pixelsOf(image).map((px) => {
    const ox = px.x + 0.5 - cx, oy = px.y + 0.5 - cy;
    return { sx: ox * cos - oy * sin, sy: ox * sin + oy * cos, color: px.color };
  }).sort((p, q) => q.sy - p.sy);
  const width = Math.ceil(image.width * 1.6), heights = new Array(width).fill(0), floor = image.height * 0.3;
  for (const g of grains) {
    let col = Math.max(0, Math.min(width - 1, Math.round(g.sx * 1.35 + width / 2)));
    for (let k = 0; k < 6; k++) {
      if (col > 0 && heights[col - 1] + 1 < heights[col]) col -= 1;
      else if (col < width - 1 && heights[col + 1] + 1 < heights[col]) col += 1;
      else break;
    }
    g.col = col;
    g.level = heights[col];
    heights[col] += 1;
    g.delay = Math.max(0, Math.min(0.2, (floor - g.sy) / image.height * 0.18));
  }
  const tall = Math.max(1, ...heights), left = -width / 2, top = floor - tall + 0.5;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = tall;
  const ctx = canvas.getContext('2d');
  for (const g of grains) {
    g.tx = left + g.col + 0.5;
    g.ty = floor - g.level;
    ctx.fillStyle = g.color;
    ctx.fillRect(g.col, tall - 1 - g.level, 1, 1);
  }
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = 'rgba(25, 12, 16, .35)';
  ctx.fillRect(0, 0, width, tall);
  const pile = { grains, canvas, left, top, scale: ZOOM / (image.fine || 1) };
  known.set(step, pile);
  return pile;
}

export class Scene {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.k = 0;
    this.ground = null;
    this.groundKey = '';
    this.shown = new Map();
    this.trails = new Map();
    this.poses = new Map();
    this.effects = [];
    this.decals = [];
    this.corpses = [];
    this.built = new WeakMap();
    this.battle = null;
    this.clock = 0;
    this.impacts = 0;
    this.labels = new Map();
    this.sights = new Map();
  }

  resize(scale) {
    const k = Math.min(RESOLUTION_MAX, Math.max(0.5, scale) * (window.devicePixelRatio || 1)) * FIELD / BOARD;
    if (Math.abs(k - this.k) < 0.01) return;
    this.k = k;
    this.canvas.width = Math.round(BOARD * k);
    this.canvas.height = Math.round(BOARD * k);
    this.groundKey = '';
    this.labels.clear();
  }

  _label(key, w, h, paint) {
    let image = this.labels.get(key);
    if (!image) {
      if (this.labels.size > LABELS_MAX) this.labels.clear();
      image = document.createElement('canvas');
      image.width = Math.ceil(w * this.k);
      image.height = Math.ceil(h * this.k);
      const g = image.getContext('2d');
      g.scale(this.k, this.k);
      paint(g);
      this.labels.set(key, image);
    }
    return image;
  }

  _stamp(ctx, image, x, y) {
    ctx.drawImage(image, Math.round(x * this.k) / this.k, Math.round(y * this.k) / this.k, image.width / this.k,
      image.height / this.k);
  }

  draw(battle, dt, { names = null, highlight = null, still = false, ranges = null } = {}) {
    const ctx = this.ctx;
    this.impacts = 0;
    if (battle !== this.battle) {
      this.battle = battle;
      this.shown.clear();
      this.poses.clear();
      this.effects = [];
      this.decals = [];
      this.corpses = [];
      this.built = new WeakMap();
    }
    this.clock += still ? 0 : dt;
    this._ground(battle);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.drawImage(this.ground, 0, 0);
    if (!battle) return [];
    ctx.setTransform(this.k, 0, 0, this.k, 0, 0);
    ctx.imageSmoothingEnabled = false;
    const fresh = still ? [] : battle.events.splice(0);
    for (const event of fresh) this._effect(event);
    const step = still ? 0 : dt;
    this._storms(ctx, battle);
    this._patches(ctx, battle);
    this._grounds(ctx, battle);
    this._oils(ctx, battle);
    this._puddles(ctx, battle);
    this._decals(ctx, step);
    this._corpses(ctx, step);
    this._mines(ctx, battle);
    this._traps(ctx, battle);
    this._layer(ctx, this.peaks);
    this._glints(ctx, battle);
    if (ranges && ranges.size) this._ranges(ctx, battle, ranges);
    this._walls(ctx, battle, still);
    this._base(ctx, battle);
    this._mobs(ctx, battle, dt, still);
    this._fogs(ctx, battle);
    this._layer(ctx, this.roof);
    this._gates(ctx, battle);
    this._flames(ctx, battle);
    this._whirls(ctx, battle);
    this._towers(ctx, battle, dt, highlight, still);
    this._charges(ctx, battle);
    this._hooks(ctx, battle);
    this._effects(ctx, step);
    this._ambient(ctx, battle);
    if (names) this._names(ctx, battle, names, highlight);
    this._mobTops(ctx, battle);
    return fresh;
  }

  _glints(ctx, battle) {
    if (!battle.tiles) return;
    const look = GLINTS[battle.biome] || GLINTS.grass;
    battle.tiles.forEach((tile, cell) => {
      if (tile !== 'lake' && tile !== 'river') return;
      for (let k = 0; k < 2; k++) {
        const t = (this.clock * 0.3 + noise(cell, k + 20)) % 1;
        if (t > 0.2) continue;
        const x = at(cell % SIZE) + 6 + noise(cell, k + 22) * 18;
        const y = at(Math.floor(cell / SIZE)) + 6 + noise(cell, k + 24) * 18;
        const share = t / 0.2;
        ctx.fillStyle = look.color;
        if (look.bubble) {
          const r = 1 + share * 3;
          ctx.globalAlpha = 0.85 * (1 - share);
          for (let a = 0; a < 8; a++) ctx.fillRect(Math.round(x + Math.cos(a * Math.PI / 4) * r), Math.round(y
            + Math.sin(a * Math.PI / 4) * r * 0.7), 1, 1);
        } else {
          ctx.globalAlpha = Math.sin(share * Math.PI) * 0.85;
          ctx.fillRect(Math.round(x) - 2, Math.round(y), 5, 1);
          ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
        }
      }
    });
    ctx.globalAlpha = 1;
  }

  _ambient(ctx, battle) {
    const kind = AMBIENT[battle.biome], c = this.clock;
    if (!kind) return;
    if (kind === 'snow') {
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.7;
      for (let i = 0; i < 46; i++) {
        const x = (noise(i, 40) * BOARD + c * (6 + noise(i, 41) * 8) + Math.sin(c * 1.3 + i) * 5) % BOARD;
        const y = (noise(i, 42) * BOARD + c * (16 + noise(i, 43) * 14)) % BOARD, size = noise(i, 44) < 0.3 ? 2 : 1;
        ctx.fillRect(Math.round(x), Math.round(y), size, size);
      }
    } else if (kind === 'dust') {
      const gust = 0.5 + 0.5 * Math.sin(c * 0.4);
      ctx.fillStyle = '#ead39e';
      ctx.globalAlpha = 0.18 + 0.3 * gust;
      for (let i = 0; i < 18; i++) {
        const x = (noise(i, 50) * BOARD + c * (40 + noise(i, 51) * 50)) % BOARD;
        const y = noise(i, 52) * BOARD + Math.sin(c * 2 + i) * 3;
        ctx.fillRect(Math.round(x), Math.round(y), 3 + Math.round(gust * 2), 1);
      }
    } else if (kind === 'embers') {
      const fires = this._fires(battle);
      for (let i = 0; i < 22 && fires.length; i++) {
        const t = (c * 0.32 + noise(i, 60)) % 1, from = fires[Math.floor(noise(i, 61) * fires.length)];
        const x = from[0] + (noise(i, 62) - 0.5) * 24 + Math.sin(c * 2 + i) * 3 * t, y = from[1] - t * 46;
        ctx.globalAlpha = 0.9 * (1 - t);
        ctx.fillStyle = t < 0.4 ? '#ffd84a' : '#ff6a1f';
        ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
    } else {
      const count = { butterflies: 3, fireflies: 10, wisps: 5 }[kind];
      for (let i = 0; i < count; i++) {
        const slow = kind === 'wisps' ? 0.5 : 1, phase = noise(i, 70) * 6.28;
        const spot = (time) => [EDGE + (0.5 + 0.42 * Math.sin(time * 0.05 * slow + phase)) * (BOARD - EDGE * 2)
          + Math.sin(time * 0.7 * slow + i) * 12, EDGE + (0.5 + 0.42 * Math.cos(time * 0.037 * slow + phase * 1.7))
          * (BOARD - EDGE * 2) + Math.sin(time * 1.1 * slow + i * 2) * 8];
        const [x, y] = spot(c);
        if (kind === 'butterflies') {
          const color = ['#f4f4f4', '#f7e08a', '#9fd4ff'][i % 3], open = Math.sin(c * 16 + i) > 0;
          ctx.globalAlpha = 1;
          ctx.fillStyle = color;
          if (open) {
            ctx.fillRect(Math.round(x) - 2, Math.round(y) - 1, 2, 2);
            ctx.fillRect(Math.round(x) + 1, Math.round(y) - 1, 2, 2);
          } else {
            ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 1, 2);
            ctx.fillRect(Math.round(x) + 1, Math.round(y) - 1, 1, 2);
          }
          ctx.fillStyle = '#2a2018';
          ctx.fillRect(Math.round(x), Math.round(y) - 1, 1, 2);
          continue;
        }
        const blink = kind === 'wisps' ? 0.6 + 0.4 * Math.sin(c * 1.5 + phase) : Math.max(0, Math.sin(c * 1.8 + phase));
        if (blink <= 0.02) continue;
        const color = kind === 'wisps' ? '#b4a0ff' : '#d2ff78', size = kind === 'wisps' ? 7 : 4;
        if (kind === 'wisps') {
          for (let k = 1; k <= 3; k++) {
            const [tx, ty] = spot(c - k * 0.35);
            ctx.globalAlpha = blink * (0.4 - k * 0.1);
            ctx.fillStyle = '#d8d0ff';
            ctx.fillRect(Math.round(tx), Math.round(ty), 1, 1);
          }
        }
        glow(ctx, x, y, size, color, blink * 0.8);
        ctx.globalAlpha = blink;
        ctx.fillStyle = kind === 'wisps' ? '#f1edff' : '#f2ffb8';
        ctx.fillRect(Math.round(x), Math.round(y), kind === 'wisps' ? 2 : 1, kind === 'wisps' ? 2 : 1);
      }
    }
    ctx.globalAlpha = 1;
  }

  _fires(battle) {
    if (this.fireKey !== battle) {
      this.fireKey = battle;
      this.fireSpots = [];
      (battle.tiles || []).forEach((tile, cell) => {
        if (tile === 'lake' || tile === 'river' || tile === 'chasm' || tile === 'crater') {
          this.fireSpots.push([at(cell % SIZE + 0.5), at(Math.floor(cell / SIZE) + 0.5)]);
        }
      });
    }
    return this.fireSpots;
  }

  _layer(ctx, image) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(image, 0, 0);
    ctx.setTransform(this.k, 0, 0, this.k, 0, 0);
  }

  _ground(battle) {
    const key = (battle ? battle.road.map((c) => c.join(',')).join(';') + battle.biome
      + (battle.tiles || []).join() : '') + '@' + this.k;
    if (key === this.groundKey) return;
    this.groundKey = key;
    if (!this.ground) {
      this.ground = document.createElement('canvas');
      this.roof = document.createElement('canvas');
      this.peaks = document.createElement('canvas');
    }
    for (const layer of [this.ground, this.roof, this.peaks]) {
      layer.width = this.canvas.width;
      layer.height = this.canvas.height;
    }
    const ctx = this.ground.getContext('2d'), roof = this.roof.getContext('2d'), peaks = this.peaks.getContext('2d');
    for (const g of [ctx, roof, peaks]) {
      g.setTransform(this.k, 0, 0, this.k, 0, 0);
      g.imageSmoothingEnabled = false;
    }
    ctx.clearRect(0, 0, BOARD, BOARD);
    if (battle) {
      paintGround(ctx, battle);
      paintRoof(roof, battle);
      paintPeaks(peaks, battle);
    } else {
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          ctx.fillStyle = (x + y) % 2 ? 'rgba(255, 255, 255, .025)' : 'rgba(255, 255, 255, .045)';
          ctx.fillRect(at(x), at(y), CELL, CELL);
        }
      }
    }
    ctx.fillStyle = MUTED;
    ctx.font = '700 10px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < SIZE; i++) {
      ctx.fillText(LETTERS[i], at(i + 0.5), EDGE / 2);
      ctx.fillText(LETTERS[i], at(i + 0.5), BOARD - EDGE / 2);
      ctx.fillText(String(i + 1), EDGE / 2, at(i + 0.5));
      ctx.fillText(String(i + 1), BOARD - EDGE / 2, at(i + 0.5));
    }
  }

  _gates(ctx, battle) {
    for (const route of battle.routes) {
      const [x, y] = route[battle.tiles ? 3 : 1].map((v, i) => (v + route[2][i]) / 2).map(at);
      glow(ctx, x, y, CELL * 0.75, 'rgba(192, 132, 252, .95)', 0.55 + 0.2 * Math.sin(this.clock * 3));
      orbit(ctx, x, y, CELL * 0.3, 4, this.clock * 2.4, '#e9d5ff', 1, true);
    }
  }

  _storms(ctx, battle) {
    const now = battle.time;
    for (const t of battle.towers) {
      if (t.rider || t.cocoon) continue;
      if (t.cls.id === 'frost') this._frostStorm(ctx, t);
      if (t.cls.id === 'banner') this._bannerOn(ctx, t, now);
      if (t.cls.id === 'sage') this._circleOn(ctx, t);
      if (t.windUntil > now) this._windOn(ctx, t);
    }
  }

  _bannerOn(ctx, t, now) {
    const x = at(t.cx), y = at(t.cy), r = (t.cls.base.banner + t.reach) * CELL, cheer = t.cheerUntil > now;
    const pulse = 0.5 + 0.5 * Math.sin(this.clock * (cheer ? 7 : 2) + t.x);
    glow(ctx, x, y, r, cheer ? 'rgba(255, 70, 140, .9)' : 'rgba(236, 72, 153, .7)', (cheer ? 0.22 : 0.08)
      + 0.05 * pulse);
    ctx.save();
    ctx.globalAlpha = cheer ? 0.75 : 0.35;
    ctx.strokeStyle = cheer ? '#ff8ac4' : '#f472b6';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 7]);
    ctx.lineDashOffset = -this.clock * 12;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  _circleOn(ctx, t) {
    const x = at(t.cx), y = at(t.cy), r = (t.cls.base.circle + t.reach) * CELL;
    glow(ctx, x, y, r, 'rgba(168, 85, 247, .7)', 0.07 + 0.03 * Math.sin(this.clock * 1.5 + t.y));
    for (let i = 0; i < 5; i++) {
      const a = this.clock * 0.5 + i * Math.PI * 2 / 5, k = (this.clock * 0.3 + i / 5) % 1;
      ctx.globalAlpha = 0.6 * Math.sin(k * Math.PI);
      square(ctx, x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.85 - k * 8, 2, i % 2 ? '#e9d5ff' : '#c084fc');
    }
    ctx.globalAlpha = 1;
  }

  _grounds(ctx, battle) {
    const now = battle.time;
    for (const ground of battle.grounds) {
      const x = at(ground.x), y = at(ground.y), r = ground.radius * CELL;
      const fade = Math.max(0, Math.min(1, (now - ground.born) / 0.4, (ground.until - now) / 0.6));
      glow(ctx, x, y, r * 1.15, 'rgba(253, 224, 71, .9)', 0.4 * fade);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.6 * fade;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) {
        const a = this.clock * 0.7 + i * Math.PI / 4;
        ctx.globalAlpha = (0.2 + 0.15 * Math.sin(this.clock * 3 + i)) * fade;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2);
        ctx.lineTo(x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 0.95);
        ctx.stroke();
      }
      for (let i = 0; i < 12; i++) {
        const k = (this.clock * 0.6 + noise(i, 5)) % 1, a = i * 2.4 + ground.x, d = r * (0.15 + 0.75 * noise(i + 9, 5));
        ctx.globalAlpha = fade * Math.sin(k * Math.PI);
        square(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d - k * 16, 2, i % 2 ? '#fffbeb' : '#fde047');
      }
      ctx.restore();
    }
  }

  _frostStorm(ctx, t) {
    const x = at(t.cx), y = at(t.cy), r = t.range * CELL, seed = (t.x * 7 + t.y * 3) % 10;
    glow(ctx, x, y, r, 'rgba(103, 232, 249, .55)', 0.16 + 0.04 * Math.sin(this.clock * 2 + seed));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (let i = 0; i < STORM_GUSTS; i++) {
      const lane = 0.3 + 0.68 * noise(i, seed), speed = 1.6 + 1.2 * noise(i + 20, seed);
      const a = this.clock * speed / (0.4 + lane) + i * 2.39, sweep = 0.5 + 0.35 * noise(i + 40, seed);
      ctx.globalAlpha = 0.25 + 0.35 * noise(i + 60, seed);
      ctx.strokeStyle = i % 3 ? '#a5f3fc' : '#f0fdff';
      ctx.lineWidth = i % 4 ? 1.5 : 2.5;
      ctx.beginPath();
      ctx.arc(x, y, r * lane, a, a + sweep);
      ctx.stroke();
    }
    for (let i = 0; i < 16; i++) {
      const k = (this.clock * 0.35 + noise(i, seed + 3)) % 1, a = this.clock * 2.4 + i * 1.7 + k * 3;
      const d = r * (1 - k * 0.85);
      ctx.globalAlpha = Math.sin(k * Math.PI) * 0.9;
      square(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, i % 3 ? 2 : 3, '#f0fdff');
    }
    ctx.restore();
  }

  _windOn(ctx, t) {
    const x = at(t.cx), y = at(t.cy);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      const a = -this.clock * 5 + i * Math.PI / 3, lift = (this.clock * 8 + i * 3) % 12;
      ctx.globalAlpha = 0.75 - lift / 20;
      ctx.strokeStyle = i % 2 ? '#5eead4' : '#ccfbf1';
      ctx.beginPath();
      ctx.ellipse(x, y + 5 - lift, 12 + (i % 2) * 3, 5, 0, a, a + 0.9);
      ctx.stroke();
    }
    ctx.restore();
  }

  _ranges(ctx, battle, ranges) {
    for (const t of battle.towers) {
      if (t.rider || t.cocoon || !ranges.has(t.player.login)) continue;
      const outline = this._sight(battle, t);
      ctx.save();
      ctx.beginPath();
      ctx.rect(EDGE, EDGE, CELL * SIZE, CELL * SIZE);
      ctx.clip();
      ctx.fillStyle = 'rgba(255, 255, 255, .07)';
      ctx.strokeStyle = 'rgba(255, 255, 255, .8)';
      ctx.lineWidth = 1.2;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      outline.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  _sight(battle, t) {
    const range = t.range, key = t.x + ',' + t.y + ',' + range.toFixed(2);
    if (this.sights.has(key)) return this.sights.get(key);
    const outline = [], solid = battle.onWatch(t) ? null : battle.solid, own = t.y * SIZE + t.x;
    for (let i = 0; i < SIGHT_RAYS; i++) {
      const a = i / SIGHT_RAYS * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a);
      let reach = range;
      if (solid) {
        for (let d = 0.05; d <= range; d += 0.05) {
          const x = t.cx + dx * d, y = t.cy + dy * d, cell = Math.floor(y) * SIZE + Math.floor(x);
          if (x >= 0 && y >= 0 && x < SIZE && y < SIZE && cell !== own && solid[cell]) {
            reach = d;
            break;
          }
        }
      }
      outline.push([at(t.cx + dx * reach), at(t.cy + dy * reach)]);
    }
    if (this.sights.size > 200) this.sights.clear();
    this.sights.set(key, outline);
    return outline;
  }

  _patches(ctx, battle) {
    for (const patch of battle.patches) {
      const x = at(patch.x), y = at(patch.y), r = patch.radius * CELL;
      glow(ctx, x, y, r, 'rgba(251, 146, 60, .8)', 0.45);
      for (let i = 0; i < 7; i++) {
        const a = i * 2.4 + patch.x * 3, d = r * (0.25 + (i % 3) * 0.22);
        const flicker = Math.sin(this.clock * 14 + i * 2) > 0;
        square(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d - (flicker ? 1 : 0), 2, flicker ? '#ffd84a' : '#ff6a1f');
      }
    }
  }

  _oils(ctx, battle) {
    const now = battle.time;
    for (const oil of battle.oils) {
      const x = at(oil.x), y = at(oil.y), r = oil.radius * CELL, grow = Math.min(1, (now - oil.born) / 0.4);
      const seed = Math.round(oil.x * 5 + oil.y * 11) % 9, shape = puddleShape(r / ZOOM, seed, 'oil');
      const fade = Math.min(1, ((oil.lit ? oil.burnUntil : oil.until) - now) / 0.8);
      const w = shape.width * ZOOM * grow, h = shape.height * ZOOM * grow;
      ctx.globalAlpha = 0.92 * fade;
      ctx.drawImage(shape, Math.round(x - w / 2), Math.round(y - h / 2), Math.round(w), Math.round(h));
      if (!oil.lit) {
        for (let i = 0; i < 3; i++) {
          const a = this.clock * 0.6 + i * 2.1 + seed, d = r * 0.4;
          ctx.globalAlpha = fade * (0.35 + 0.25 * Math.sin(this.clock * 2 + i));
          square(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, 2, i % 2 ? '#8b7fd0' : '#5eead4');
        }
        ctx.globalAlpha = 1;
        continue;
      }
      const blue = oil.tower.runes.has('blue'), tones = blue ? BLUE_FLAME : FLAME;
      glow(ctx, x, y, r * 1.1, blue ? 'rgba(74, 163, 255, .9)' : 'rgba(255, 120, 30, .9)', 0.8 * fade);
      glow(ctx, x, y, r * 0.6, blue ? 'rgba(200, 230, 255, .9)' : 'rgba(255, 220, 120, .9)', 0.45 * fade);
      for (let i = 0; i < 48; i++) {
        const a = i * 2.39 + seed, d = r * 0.85 * Math.sqrt(noise(i, seed));
        const rise = (this.clock * 1.8 + noise(i + 9, seed)) % 1;
        ctx.globalAlpha = fade * (1 - rise * 0.8);
        square(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8 - rise * 16, rise < 0.4 ? 4 : 3,
          tones[Math.min(tones.length - 1, Math.floor(rise * tones.length))]);
      }
      ctx.globalAlpha = 1;
    }
  }

  _fogs(ctx, battle) {
    const now = battle.time;
    for (const fog of battle.fogs) {
      const x = at(fog.x), y = at(fog.y), r = fog.radius * CELL, grow = Math.min(1, (now - fog.born) / 0.5);
      const fade = Math.min(1, (fog.until - now) / 1), black = fog.tower.runes.has('plague');
      const tone = black ? 'rgba(40, 24, 60, 1)' : 'rgba(74, 110, 40, 1)';
      for (let i = 0; i < 9; i++) {
        const a = i * 0.7 + this.clock * (0.25 + (i % 3) * 0.1), d = r * 0.55 * grow * (0.4 + 0.6 * noise(i, fog.x));
        glow(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8, r * 0.6 * grow, tone, 0.42 * fade);
      }
      glow(ctx, x, y, r * grow, black ? 'rgba(124, 58, 237, 1)' : 'rgba(163, 230, 53, 1)', 0.12 * fade);
      for (let i = 0; i < 10; i++) {
        const rise = (this.clock * 0.5 + i / 10) % 1, a = i * 2.1 + fog.y, d = r * 0.7 * noise(i, fog.x + 1);
        ctx.globalAlpha = fade * Math.sin(rise * Math.PI) * 0.9;
        square(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8 - rise * 12, 2, black ? '#a78bfa' : '#d9f99d');
      }
      ctx.globalAlpha = 1;
    }
  }

  _decals(ctx, dt) {
    const next = [];
    for (const d of this.decals) {
      d.t += dt;
      if (d.t >= d.life) continue;
      next.push(d);
      const fade = 1 - d.t / d.life, x = at(d.x), y = at(d.y);
      ctx.globalAlpha = Math.min(1, fade * 1.6) * 0.85;
      if (d.kind === 'ice') {
        square(ctx, x, y, 2, '#e0fbff');
        square(ctx, x - 2, y, 2, '#7fdcff');
        square(ctx, x + 2, y, 2, '#7fdcff');
        square(ctx, x, y - 2, 2, '#bff3ff');
        square(ctx, x, y + 2, 2, '#bff3ff');
      } else if (d.kind === 'rubble') {
        square(ctx, x, y, d.size, d.color);
        square(ctx, x + 1, y - 1, Math.max(1, d.size - 2), '#c4b8a6');
      } else if (d.kind === 'scorch') {
        glow(ctx, x, y, d.r * CELL, 'rgba(20, 10, 6, .9)', 0.55 * fade);
      } else if (d.kind === 'goo') {
        const grow = Math.min(1, d.t / 0.4), dry = Math.max(0, (d.t - d.life + 2.5) / 2.5);
        const shape = gooShape(d.r * CELL / ZOOM, d.seed, d.color), scale = ZOOM * grow;
        const w = shape.width * scale, h = shape.height * scale;
        ctx.globalAlpha = 0.95 * (1 - dry);
        ctx.drawImage(shape, Math.round(x - w / 2), Math.round(y - h / 2 + 3), Math.round(w), Math.round(h));
        if (d.t < d.life - 2) {
          const pop = (d.t * 0.9 + d.seed * 0.13) % 1, bubble = bubbleSprite();
          const bx = x + Math.cos(d.seed * 2 + Math.floor(d.t * 0.9)) * d.r * CELL * 0.35, by = y + 3;
          const side = Math.round(bubble.width * (0.4 + pop * 0.6));
          ctx.globalAlpha = pop < 0.85 ? 0.85 : 0.3;
          ctx.drawImage(bubble, Math.round(bx - side / 2), Math.round(by - side / 2), side, side);
        }
      } else if (d.kind === 'crater') {
        glow(ctx, x, y, d.r * CELL * 1.6, 'rgba(14, 8, 6, .95)', 0.8 * fade);
        glow(ctx, x, y, d.r * CELL * 0.7, 'rgba(255, 106, 31, .9)', 0.5 * fade * fade);
      }
    }
    ctx.globalAlpha = 1;
    this.decals = next.length > DECALS_MAX ? next.slice(-DECALS_MAX) : next;
  }

  _corpses(ctx, dt) {
    const next = [];
    for (const c of this.corpses) {
      c.t += dt;
      if (c.t >= CORPSE.fall + CORPSE.lie + CORPSE.fade) continue;
      next.push(c);
      const x = at(c.x), y = at(c.y), pile = c.pile, z = pile.scale;
      if (c.t < CORPSE.fall) {
        for (const g of pile.grains) {
          const k = Math.max(0, Math.min(1, (c.t - g.delay) / (CORPSE.fall - g.delay)));
          const fall = k * k, sy = g.sy - c.lift;
          const gx = g.sx + (g.tx - g.sx) * fall, gy = sy + (g.ty - sy) * fall;
          ctx.fillStyle = g.color;
          ctx.fillRect(Math.round(x + (gx - 0.5) * z), Math.round(y + (gy - 0.5) * z), Math.ceil(z), Math.ceil(z));
        }
        continue;
      }
      const fading = c.t - CORPSE.fall - CORPSE.lie;
      ctx.globalAlpha = fading > 0 ? Math.max(0, 1 - fading / CORPSE.fade) : 1;
      ctx.drawImage(pile.canvas, Math.round(x + pile.left * z), Math.round(y + pile.top * z), pile.canvas.width * z,
        pile.canvas.height * z);
      ctx.globalAlpha = 1;
    }
    this.corpses = next;
  }

  _point(battle, d, r) {
    const route = battle.routes[r || 0], last = route.length - 1;
    const i = Math.max(0, Math.min(last - 1, Math.floor(d))), f = Math.max(0, Math.min(1, d - i));
    const a = route[i], b = route[i + 1];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  }

  _puddles(ctx, battle) {
    const now = battle.time;
    for (const puddle of battle.puddles) {
      const grow = Math.min(1, (now - puddle.born) / 0.25), fade = Math.min(1, (puddle.until - now) / 0.8);
      const x = at(puddle.x), y = at(puddle.y), r = puddle.radius * CELL;
      const seed = Math.round(puddle.x * 7 + puddle.y * 13) % 9, black = puddle.tower.runes.has('plague');
      const shape = puddleShape(r / ZOOM, seed, black ? 'plague' : 'poison');
      const w = shape.width * ZOOM * grow, h = shape.height * ZOOM * grow;
      ctx.globalAlpha = 0.9 * fade;
      ctx.drawImage(shape, Math.round(x - w / 2), Math.round(y - h / 2), Math.round(w), Math.round(h));
      for (let i = 0; i < 4; i++) {
        const phase = (this.clock * 0.7 + i * 0.29 + puddle.x * 0.37) % 1, a = i * 1.9 + puddle.y * 3;
        const bx = x + Math.cos(a) * r * 0.45, by = y + Math.sin(a) * r * 0.35, size = 1 + Math.round(phase * 3);
        ctx.globalAlpha = fade * (phase < 0.85 ? 0.9 : 0.3);
        const bubble = bubbleSprite(), side = Math.round(bubble.width * (0.5 + size * 0.25));
        ctx.drawImage(bubble, Math.round(bx - side / 2), Math.round(by - side / 2), side, side);
        if (phase > 0.85) square(ctx, bx, by - 4 - (phase - 0.85) * 30, 2, black ? '#a78bfa' : '#d9f99d');
      }
      for (let i = 0; i < 3; i++) {
        const rise = (this.clock * 0.35 + i / 3 + puddle.y * 0.21) % 1;
        ctx.globalAlpha = fade * 0.35 * (1 - rise);
        square(ctx, x + Math.sin(i * 2.3 + this.clock) * r * 0.3, y - rise * 18, 3, black ? '#7c3aed' : '#a3e635');
      }
      ctx.globalAlpha = 1;
    }
  }

  _traps(ctx, battle) {
    for (const trap of battle.traps) sprite(ctx, trapSprite(false), at(trap.x), at(trap.y), 0, 1.8);
  }

  _whirls(ctx, battle) {
    for (const whirl of battle.whirls) {
      const [wx, wy] = this._point(battle, whirl.d, whirl.r), x = at(wx), y = at(wy);
      const fade = Math.min(1, (whirl.until - battle.time) / 0.2);
      ctx.save();
      if (whirl.tornado) this._tornado(ctx, whirl, x, y, fade);
      else {
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 14; i++) {
          const a = this.clock * 9 + i * 0.9, r = 3 + (i % 5) * 2.6;
          ctx.globalAlpha = fade * (0.9 - (i % 5) * 0.12);
          square(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.6 - (i % 5) * 2, 2, i % 3 ? '#99f6e4' : '#f0fdfa');
        }
      }
      ctx.restore();
    }
  }

  _tornado(ctx, whirl, x, y, fade) {
    const tones = ['#99f6e4', '#f0fdfa'].concat(Array.from(whirl.elements, (id) => ELEMENT_TONES[id]));
    if (whirl.elements.size) {
      glow(ctx, x, y - 10, 18, 'rgba(255, 255, 255, .6)', 0.25 * fade);
    }
    for (let level = 0; level < 7; level++) {
      const r = 3 + level * 2.8, lift = level * 4, count = 6 + level * 2;
      for (let i = 0; i < count; i++) {
        const a = this.clock * (11 - level) + i * Math.PI * 2 / count + level, tone = tones[(i + level) % tones.length];
        ctx.globalAlpha = fade * (0.95 - level * 0.07);
        square(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.45 - lift, tone === tones[0] || tone === tones[1]
          ? 2 : 3, tone);
      }
    }
  }

  _nukeBlast(ctx, e, share) {
    const x = at(e.x), y = at(e.y), r = e.radius * CELL, time = share * NUKE_LIFE;
    const dark = time < 0.15 ? time / 0.15 : time < 1.2 ? 1 : Math.max(0, 1 - (time - 1.2) / (NUKE_LIFE - 1.2));
    ctx.fillStyle = 'rgba(4, 3, 10, ' + ((e.small ? 0.25 : 0.62) * dark).toFixed(3) + ')';
    ctx.fillRect(EDGE, EDGE, CELL * SIZE, CELL * SIZE);
    if (time < 0.25) glow(ctx, x, y, r * 1.6, 'rgba(255, 255, 255, 1)', 1 - time / 0.25);
    for (const [delay, width, color] of [[0, 9, [255, 236, 200]], [0.18, 5, [255, 150, 60]]]) {
      const wave = Math.max(0, Math.min(1, (time - delay) / 0.75));
      if (wave <= 0 || wave >= 1) continue;
      const radius = r * (1 - Math.pow(1 - wave, 2.2)), alpha = (1 - wave) * 0.9, tone = color.join(', ');
      const ring = ctx.createRadialGradient(x, y, Math.max(0, radius - width * 2), x, y, radius + width);
      ring.addColorStop(0, 'rgba(' + tone + ', 0)');
      ring.addColorStop(0.65, 'rgba(' + tone + ', ' + alpha.toFixed(3) + ')');
      ring.addColorStop(1, 'rgba(' + tone + ', 0)');
      ctx.fillStyle = ring;
      ctx.beginPath();
      ctx.arc(x, y, radius + width, 0, Math.PI * 2);
      ctx.fill();
      if (delay) continue;
      for (let i = 0; i < 42; i++) {
        const a = i / 42 * Math.PI * 2 + noise(i, 3) * 0.2, d = radius * (0.92 + noise(i, 5) * 0.16);
        glow(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.95, 5 + noise(i, 7) * 5, 'rgba(176, 156, 128, 1)',
          (1 - wave) * 0.7);
      }
    }
    const grow = Math.min(1, time / 0.4), cool = Math.min(1, Math.max(0, (time - 0.3) / 1.6));
    const fire = mix([255, 170, 60], [120, 60, 40], cool), ball = r * (0.25 + 0.3 * grow);
    glow(ctx, x, y, ball * 1.5, 'rgba(' + fire.join(', ') + ', 1)', 1 - cool * 0.8);
    glow(ctx, x, y, ball * 0.7, 'rgba(255, 244, 214, 1)', Math.max(0, 1 - time / 0.8));
    const rise = Math.min(1, time / 1.3), top = y - r * 1.05 * rise, smoke = Math.max(0, 1 - Math.max(0, time - 1.6)
      / (NUKE_LIFE - 1.6));
    for (let i = 0; i < 7; i++) {
      const k = i / 6, py = y - (y - top) * k, lit = mix([255, 120, 40], [96, 88, 86], Math.min(1, cool + k * 0.4));
      glow(ctx, x + (noise(i, 11) - 0.5) * 6, py, 10 + k * 6, 'rgba(' + lit.join(', ') + ', 1)', 0.95 * smoke * rise);
    }
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2, spread = r * (0.25 + 0.4 * rise), wobble = noise(i, 13) * 6;
      const px = x + Math.cos(a) * spread * (0.6 + noise(i, 17) * 0.5), py = top + Math.sin(a) * spread * 0.32;
      const lit = mix([255, 150, 60], [118, 108, 104], Math.min(1, cool + (Math.sin(a) < 0 ? 0.5 : 0)));
      glow(ctx, px, py - wobble, 15 + noise(i, 19) * 10, 'rgba(' + lit.join(', ') + ', 1)', smoke * rise);
    }
  }

  _nukeFlight(ctx, e, share) {
    const small = e.mine === 'fusion', height = small ? 50 : 90;
    const point = (s) => [at(e.x1 + (e.x2 - e.x1) * s), at(e.y1 + (e.y2 - e.y1) * s) - Math.sin(s * Math.PI) * height];
    const [x, y] = point(share), [nx, ny] = point(Math.min(1, share + 0.02)), tx = at(e.x2), ty = at(e.y2);
    const pulse = 0.5 + 0.5 * Math.sin(this.clock * 12);
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.4 * pulse;
    ctx.strokeStyle = '#ff3b3b';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.lineDashOffset = -this.clock * 20;
    ctx.beginPath();
    ctx.ellipse(tx, ty, e.radius * CELL, e.radius * CELL * 0.92, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    sprite(ctx, reticleSprite(), tx, ty, 0, 2 + pulse);
    ctx.fillStyle = 'rgba(0, 0, 0, ' + (0.15 + 0.25 * share) + ')';
    ctx.beginPath();
    ctx.ellipse(at(e.x1 + (e.x2 - e.x1) * share), at(e.y1 + (e.y2 - e.y1) * share) + 4, 6 + 6 * share,
      2 + 2 * share, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 1; i <= 8; i++) {
      const back = Math.max(0, share - i * 0.012), [sx, sy] = point(back);
      glow(ctx, sx + noise(i, Math.floor(this.clock * 6)) * 4 - 2, sy, 3 + i * 0.9, 'rgba(190, 190, 200, 1)',
        0.35 * (1 - i / 9));
    }
    glow(ctx, x, y - 12, 10, 'rgba(255, 216, 74, .9)', 0.25 + 0.2 * pulse);
    sprite(ctx, nukeSprite(), x, y, Math.atan2(-(nx - x), ny - y + 1e-6), small ? 1.3 : 2.2, 0, 64);
  }

  _mines(ctx, battle) {
    for (const mine of battle.mines) {
      const lit = Math.floor(this.clock * 2.5 + mine.x * 1.7 + mine.y) % 2 === 0;
      const image = mineSprite(mine.kind, lit), x = at(mine.x), y = at(mine.y);
      ctx.fillStyle = 'rgba(0, 0, 0, .3)';
      ctx.beginPath();
      ctx.ellipse(x, y + 4, 8, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      sprite(ctx, image, x, y, 0);
      if (lit) glow(ctx, x, y, 7, MINE_LIGHTS[mine.kind], 0.7);
    }
  }

  _walls(ctx, battle, still) {
    for (const wall of battle.walls) {
      if (!this.built.has(wall)) this.built.set(wall, this.clock - (still ? RISE : 0));
      const rise = Math.min(1, (this.clock - this.built.get(wall)) / RISE);
      const share = Math.max(0, wall.hp / wall.max), x = at(wall.x), y = at(wall.y);
      const image = wallSprite(share > 0.66 ? 0 : share > 0.33 ? 1 : 2);
      ctx.fillStyle = 'rgba(0, 0, 0, .35)';
      roundRect(ctx, x - 14, y + 6, 30, 9, 4);
      ctx.fill();
      ctx.globalAlpha = rise;
      sprite(ctx, image, x, y - 2 + (1 - rise) * 10, 0);
      if (wall.steel) {
        ctx.globalAlpha = rise * 0.55;
        sprite(ctx, tintSprite(image, '#b8c7d6'), x, y - 2 + (1 - rise) * 10, 0);
      }
      ctx.globalAlpha = 1;
      if (share < 1) {
        ctx.fillStyle = '#15111d';
        ctx.fillRect(Math.round(x - 12) - 1, Math.round(y - 19) - 1, 26, 5);
        ctx.fillStyle = '#c4b8a6';
        ctx.fillRect(Math.round(x - 12), Math.round(y - 19), Math.round(24 * share), 3);
      }
    }
  }

  _mobs(ctx, battle, dt, still) {
    const alive = new Set(), now = battle.time;
    const follow = still ? 1 : 1 - Math.exp(-dt * SMOOTH);
    const [hx, hy] = battle.path[battle.path.length - 1];
    for (const mob of battle.mobs) {
      if (mob.dead) continue;
      alive.add(mob.id);
      let spot = this.shown.get(mob.id);
      if (!spot) {
        spot = { x: mob.x, y: mob.y, dx: 0, dy: -1, walk: mob.id * 1.7, trail: 0, angle: 0, image: null, lift: 0 };
        this.shown.set(mob.id, spot);
      }
      const nx = spot.x + (mob.x - spot.x) * follow, ny = spot.y + (mob.y - spot.y) * follow;
      const moved = Math.abs(nx - spot.x) + Math.abs(ny - spot.y);
      if (moved > 1e-4) {
        spot.dx = ease(spot.dx, nx - spot.x, 20, dt || 1);
        spot.dy = ease(spot.dy, ny - spot.y, 20, dt || 1);
        spot.walk += moved * WALK;
        spot.trail += moved;
      }
      const route = battle.routes[mob.r || 0];
      if (still && mob.d < route.length - 1) {
        const i = Math.min(route.length - 2, Math.floor(mob.d)), a = route[i], b = route[i + 1];
        spot.dx = b[0] - a[0];
        spot.dy = b[1] - a[1];
      }
      spot.x = nx;
      spot.y = ny;
      const held = mob.holdUntil > now, frozen = held && mob.holdBy === 'frost';
      const slowed = mob.chill > 0 || mob.slowUntil > now || frozen;
      if (slowed && !mob.flying && !still && spot.trail > TRAIL_STEP) {
        spot.trail = 0;
        this.decals.push({ kind: 'ice', t: 0, life: 1.6, x: spot.x + (Math.random() - 0.5) * 0.3,
          y: spot.y + (Math.random() - 0.5) * 0.3 });
      }
      const frame = mob.flying ? Math.floor(this.clock * FLAP + mob.id) % 2 : Math.floor(spot.walk / Math.PI) % 2;
      const look = mob.hook && HOOKLESS[mob.look] ? HOOKLESS[mob.look] : mob.look;
      const image = mobSprite(look, held ? 0 : frame), size = (image.span || image.width) * ZOOM / (image.fine || 1);
      let x = at(spot.x), y = at(spot.y);
      let angle = Math.atan2(spot.dx, -spot.dy) + (held || mob.flying ? 0 : Math.sin(spot.walk) * 0.08);
      if (mob.biting) {
        angle = Math.atan2(at(hx + 0.5) - x, -(at(hy + 0.5) - y));
        const lunge = Math.max(0, Math.sin((now - mob.biting) * Math.PI * 4)) * 5;
        x += Math.sin(angle) * lunge;
        y -= Math.cos(angle) * lunge;
      } else if (mob.wall) {
        x += Math.sin(this.clock * 30 + mob.id) * 1.2;
        if (!still && Math.random() < dt * 3) {
          this._sparks(mob.wall.x, mob.wall.y, ['#9a8f80', '#c4b8a6', '#6b6258'], 2, 1.4, 0.3);
        }
      }
      const lift = mob.flying ? LIFT + Math.sin(this.clock * 4 + mob.id) * 1.5 : 0, top = y - lift - size / 2 - 3;
      spot.angle = angle;
      spot.image = image;
      spot.lift = lift;
      ctx.fillStyle = mob.flying ? 'rgba(0, 0, 0, .2)' : 'rgba(0, 0, 0, .3)';
      ctx.beginPath();
      ctx.ellipse(x, y + size * (mob.flying ? 0.2 : 0.28), size * (mob.flying ? 0.26 : 0.36), size * 0.13, 0, 0,
        Math.PI * 2);
      ctx.fill();
      if (mob.kind) glow(ctx, x, y - lift, size * 0.85, mob.kind.glow, 0.45 + 0.2 * Math.sin(this.clock * 4 + mob.id));
      if (mob.power && (mob.power.id === 'mend' || mob.power.id === 'fury')) this._motes(ctx, mob, x, y);
      const buried = mob.underUntil > now || Boolean(mob.power) && mob.power.id === 'tunnel' && mob.powerUntil <= now;
      const soil = SOILS[battle.biome] || SOILS.grass, dirt = [soil.soil, soil.light, soil.dark];
      if (spot.buried !== undefined && buried !== spot.buried && !still) {
        this._sparks(spot.x, spot.y, dirt, 9, 1.8, 0.45, 2);
      }
      spot.buried = buried;
      this._trail(ctx, mob, battle, x, y, buried, still);
      const dug = mob.burrow ? now - (mob.underUntil - mob.burrow.time) : 1, risen = now - mob.underUntil;
      if (buried) {
        const sink = still ? 1 : Math.min(1, dug / DIG.sink);
        if (sink < 1) {
          ctx.globalAlpha = 1 - sink;
          sprite(ctx, image, x, y + sink * 4, angle, ZOOM * (1 - 0.35 * sink));
        }
        ctx.globalAlpha = sink;
        this._mound(ctx, x, y, size, mob, battle);
        ctx.globalAlpha = 1;
        spot.screenX = x;
        spot.top = top;
        spot.size = size;
        continue;
      }
      if (mob.burrow && risen >= 0 && risen < DIG.rise && !still) {
        ctx.globalAlpha = 1 - risen / DIG.rise;
        this._mound(ctx, x, y, size, mob, battle);
        ctx.globalAlpha = 1;
      }
      const veil = mob.power && mob.power.id === 'veil' && mob.powerUntil > now;
      if (veil) ctx.globalAlpha = 0.28 + 0.12 * Math.sin(this.clock * 12 + mob.id);
      else if (mob.phase) ctx.globalAlpha = mob.phaseUntil > now ? 0.3 : 0.8;
      if (mob.wild || mob.power && mob.power.steady && mob.powerUntil > now) {
        glow(ctx, x, y - lift, size * 0.9, 'rgba(239, 68, 68, .95)', 0.55);
      }
      const rim = mob.info.boss ? '#ef4444' : mob.kind ? '#facc15' : mob.silver ? '#e2e8f0' : null;
      if (rim) {
        const ring = tintSprite(image, rim);
        for (const [ox, oy] of OUTLINE) sprite(ctx, ring, x + ox, y - lift + oy, angle);
      }
      sprite(ctx, image, x, y - lift, angle);
      ctx.globalAlpha = 1;
      if (!veil) this._tint(ctx, mob, image, x, y - lift, angle, slowed, frozen);
      if (now - mob.hitAt < HIT_FLASH) {
        ctx.globalAlpha = 0.65 * (1 - (now - mob.hitAt) / HIT_FLASH);
        sprite(ctx, tintSprite(image, '#ffffff'), x, y - lift, angle);
        ctx.globalAlpha = 1;
      }
      if (mob.element) this._elementBits(ctx, mob, x, y - lift, size);
      if (frozen) sprite(ctx, shellSprite(image, 'ice'), x, y - lift, angle);
      else if (held) stars(ctx, x, top - 4, 8, this.clock * 5);
      if (mob.power && mob.power.id === 'shield' && mob.powerUntil > now) {
        ctx.globalAlpha = 0.7 + 0.3 * Math.sin(this.clock * 10 + mob.id);
        sprite(ctx, shellSprite(image, 'shield'), x, y - lift, angle);
        ctx.globalAlpha = 1;
      }
      if (mob.ward > 0) {
        ctx.globalAlpha = 0.75 + 0.2 * Math.sin(this.clock * 6 + mob.id);
        sprite(ctx, shellSprite(image, 'ward'), x, y - lift, angle);
        ctx.globalAlpha = 1;
      }
      if (mob.stolen > 0) {
        const bag = Math.min(4, 2 + Math.floor(mob.stolen / 10));
        square(ctx, x + size * 0.32, top + 2, bag + 1, '#8f6b3a');
        square(ctx, x + size * 0.32, top + 1, bag, '#facc15');
      }
      if (mob.markUntil > now) {
        const reticle = reticleSprite(), zoom = Math.max(2, Math.round(size / reticle.width + 0.4));
        const side = reticle.width * zoom + 2 * Math.round(Math.sin(this.clock * 6 + mob.id) + 1);
        ctx.globalAlpha = 0.85 + 0.15 * Math.sin(this.clock * 6);
        ctx.drawImage(reticle, Math.round(x - side / 2), Math.round(y - lift - side / 2), side, side);
        ctx.globalAlpha = 1;
      }
      if (mob.charge && mob.charge.until > now) this._chargedOn(ctx, mob, x, y - lift, size);
      if (mob.netUntil > now) this._netOn(ctx, x, y - lift, size);
      if (mob.rot) this._rotOn(ctx, mob, x, y - lift, size);
      if (battle.prey && battle.prey.mob === mob && battle.prey.until > now) this._preyOn(ctx, x, y - lift, size, top);
      if (mob.weakUntil > now) this._weakOn(ctx, x, y - lift, size, top);
      spot.screenX = x;
      spot.top = top;
      spot.size = size;
    }
    for (const id of Array.from(this.shown.keys())) if (!alive.has(id)) this.shown.delete(id);
    for (const id of Array.from(this.trails.keys())) if (!alive.has(id)) this.trails.delete(id);
  }

  _motes(ctx, mob, x, y) {
    const mend = mob.power.id === 'mend', r = mob.power.range * CELL;
    for (let i = 0; i < 6; i++) {
      const cycle = this.clock * 0.5 + i / 6 + mob.id * 0.13, phase = cycle % 1, round = Math.floor(cycle);
      const a = i * 2.4 + mob.id + round * 1.7, far = r * (0.25 + 0.7 * ((Math.sin(round * 12.9 + i * 7.1) + 1) / 2));
      ctx.globalAlpha = Math.sin(phase * Math.PI) * 0.8;
      const px = x + Math.cos(a) * far, py = y + Math.sin(a) * far - phase * 10;
      if (mend) sparkle(ctx, px, py, 1, '#4ade80');
      else square(ctx, px, py, 2 + (i % 2), i % 3 ? '#fb923c' : '#fde047');
    }
    ctx.globalAlpha = 1;
  }

  _mound(ctx, x, y, size, mob, battle) {
    const frame = Math.floor(this.clock * DIG.wiggle + mob.id) % 2, image = moundSprite(battle.biome, frame,
      mob.look === 'mole');
    const spot = this.shown.get(mob.id), angle = spot && spot.angle !== undefined ? spot.angle : 0;
    sprite(ctx, image, x, y, angle, ZOOM * Math.max(1, size / 30));
  }

  _hooks(ctx, battle) {
    const now = battle.time;
    for (const mob of battle.mobs) {
      const hook = mob.hook, spot = this.shown.get(mob.id);
      if (!hook || mob.dead || !spot) continue;
      const pose = this._pose(hook.tower), angle = spot.angle || 0, scale = mob.info.boss ? 1 : 0.6;
      const cos = Math.cos(angle), sin = Math.sin(angle);
      const hx = at(spot.x) + (HAND.x * cos - HAND.y * sin) * scale;
      const hy = at(spot.y) + (HAND.x * sin + HAND.y * cos) * scale;
      const tx = at(pose.x), ty = at(pose.y);
      const k = hook.caught ? 1 : 1 - Math.pow(1 - Math.min(1, (now - hook.at) / (hook.lands - hook.at)), 2);
      const ex = hx + (tx - hx) * k, ey = hy + (ty - hy) * k, length = Math.hypot(ex - hx, ey - hy);
      const turn = Math.atan2(ey - hy, ex - hx), links = Math.floor(length / HAND.link);
      for (let i = 0; i < links; i++) {
        const lx = hx + (ex - hx) * i / links;
        const ly = hy + (ey - hy) * i / links + Math.sin(i * 0.9 + this.clock * 9) * 0.6;
        ctx.save();
        ctx.translate(Math.round(lx), Math.round(ly));
        ctx.rotate(turn);
        const link = linkSprite(i % 2 === 1);
        ctx.drawImage(link, -link.width / 2, -link.height / 2);
        ctx.restore();
      }
      const head = hookSprite();
      ctx.save();
      ctx.translate(Math.round(ex), Math.round(ey));
      ctx.rotate(turn - Math.PI / 2);
      ctx.drawImage(head, -head.width * 0.75, -3, head.width * 1.5, head.height * 1.5);
      ctx.restore();
    }
  }

  _trail(ctx, mob, battle, x, y, buried, still) {
    let trail = this.trails.get(mob.id);
    if (!trail) {
      if (!buried) return;
      trail = [];
      this.trails.set(mob.id, trail);
    }
    const last = trail[trail.length - 1];
    if (buried && !still && (!last || this.clock - last.t >= DIG.trail)) {
      trail.push({ x, y, t: this.clock, seed: trail.length % 4 });
    }
    while (trail.length && this.clock - trail[0].t > DIG.fade) trail.shift();
    if (!trail.length) {
      this.trails.delete(mob.id);
      return;
    }
    const scale = ZOOM * Math.max(1, (mob.info.boss ? 50 : 30) / 30);
    for (const bit of trail) {
      ctx.globalAlpha = Math.max(0, 1 - (this.clock - bit.t) / DIG.fade);
      sprite(ctx, clodSprite(battle.biome, bit.seed), bit.x, bit.y + 3, 0, scale);
    }
    ctx.globalAlpha = 1;
  }

  _webOn(ctx, x, y) {
    ctx.save();
    ctx.strokeStyle = 'rgba(241, 245, 249, .8)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(a) * 14, y - Math.sin(a) * 14);
      ctx.lineTo(x + Math.cos(a) * 14, y + Math.sin(a) * 14);
      ctx.stroke();
    }
    for (const r of [6, 11]) {
      ctx.beginPath();
      for (let i = 0; i <= 8; i++) {
        const a = i * Math.PI / 4;
        if (i) ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
        else ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  _chargedOn(ctx, mob, x, y, size) {
    const flick = Math.floor(this.clock * 14 + mob.id) % 3;
    glow(ctx, x, y, size * 0.7, 'rgba(250, 204, 21, .9)', 0.14 + (flick ? 0.08 : 0));
    if (flick === 2) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = flick ? '#fde047' : '#fef9c3';
    ctx.lineWidth = 1.2;
    for (let k = 0; k < 2; k++) {
      const a = noise(Math.floor(this.clock * 9) + k * 7, mob.id) * Math.PI * 2, r = size * 0.42;
      ctx.beginPath();
      for (let j = 0; j <= 4; j++) {
        const b = a + j * 0.35, d = r * (0.85 + (j % 2) * 0.3), px = x + Math.cos(b) * d, py = y + Math.sin(b) * d;
        if (j) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  _netOn(ctx, x, y, size) {
    const r = Math.max(10, size * 0.5);
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = 'rgba(214, 180, 120, .95)';
    ctx.lineWidth = 1;
    for (let i = -3; i <= 3; i++) {
      const o = i * r / 2.6;
      ctx.beginPath();
      ctx.moveTo(x + o - r, y - r);
      ctx.lineTo(x + o + r, y + r);
      ctx.moveTo(x + o + r, y - r);
      ctx.lineTo(x + o - r, y + r);
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = '#8a6a3c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3 + 0.3;
      square(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, 3, '#d6b478');
    }
  }

  _rotOn(ctx, mob, x, y, size) {
    for (let i = 0; i < 3; i++) {
      const drip = (this.clock * 1.2 + i / 3 + mob.id * 0.17) % 1, side = (i - 1) * size * 0.22;
      ctx.globalAlpha = 1 - drip;
      square(ctx, x + side, y + size * 0.1 + drip * 8, 2, i % 2 ? '#3f6212' : '#1a2e05');
    }
    ctx.globalAlpha = 1;
  }

  _preyOn(ctx, x, y, size, top) {
    const pulse = 0.5 + 0.5 * Math.sin(this.clock * 8), ay = top - 26 - pulse * 3;
    glow(ctx, x, y, size * 0.95, 'rgba(239, 68, 68, 1)', 0.22 + 0.2 * pulse);
    ctx.fillStyle = DARK;
    ctx.beginPath();
    ctx.moveTo(x - 7, ay - 6);
    ctx.lineTo(x + 7, ay - 6);
    ctx.lineTo(x, ay + 3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(x - 5, ay - 4.8);
    ctx.lineTo(x + 5, ay - 4.8);
    ctx.lineTo(x, ay + 1.2);
    ctx.closePath();
    ctx.fill();
  }

  _weakOn(ctx, x, y, size, top) {
    const pulse = 0.5 + 0.5 * Math.sin(this.clock * 6), ay = top - 24 - pulse * 2;
    glow(ctx, x, y, size * 0.9, 'rgba(168, 85, 247, 1)', 0.2 + 0.15 * pulse);
    ctx.fillStyle = DARK;
    ctx.beginPath();
    ctx.ellipse(x, ay, 9, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e9d5ff';
    ctx.beginPath();
    ctx.ellipse(x, ay, 7.5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a855f7';
    ctx.beginPath();
    ctx.arc(x, ay, 3, 0, Math.PI * 2);
    ctx.fill();
    square(ctx, x, ay, 2, DARK);
    square(ctx, x - 1, ay - 1.5, 1, '#ffffff');
  }

  _elementBits(ctx, mob, x, y, size) {
    const colors = ELEMENT_BITS[mob.element];
    for (let i = 0; i < 4; i++) {
      const phase = (this.clock * 0.9 + i / 4 + mob.id * 0.37) % 1, a = i * 1.7 + mob.id + this.clock * 0.8;
      const r = size * (0.3 + 0.2 * phase);
      ctx.globalAlpha = 1 - phase;
      square(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r - phase * 8, 2, colors[i % colors.length]);
    }
    ctx.globalAlpha = 1;
  }

  _tint(ctx, mob, image, x, y, angle, slowed, frozen) {
    const layers = [];
    const plague = mob.poison && Array.from(mob.poison.values()).some((dose) => dose.tower.runes.has('plague'));
    const blue = mob.burn && Array.from(mob.burn.values()).some((fire) => fire.tower.runes.has('blue'));
    if (mob.poison) layers.push([plague ? 'plague' : 'poison', 0.34 + 0.1 * Math.sin(this.clock * 5 + mob.id)]);
    if (mob.burn) layers.push([blue ? 'blue' : 'burn', 0.3 + 0.12 * Math.sin(this.clock * 17 + mob.id)]);
    if (slowed) layers.push(['chill', frozen ? 0.5 : 0.26]);
    if (mob.fury && !mob.kind) layers.push(['fury', 0.22]);
    for (const [kind, strength] of layers) {
      ctx.globalAlpha = strength;
      sprite(ctx, tintSprite(image, TINTS[kind]), x, y, angle);
    }
    ctx.globalAlpha = 1;
    if (mob.poison) {
      const rise = (this.clock * 10 + mob.id * 3) % 9;
      square(ctx, x + 4, y - rise, 2, plague ? '#7c3aed' : '#9be22d');
      square(ctx, x - 4, y - ((rise + 4) % 9), 2, plague ? '#a78bfa' : '#c7f36b');
      square(ctx, x + 1, y - ((rise + 7) % 9) - 2, 1, plague ? '#ddd6fe' : '#e3ff9e');
    }
    if (mob.burn) {
      const tones = blue ? BLUE_FLAME : FLAME;
      for (let i = 0; i < 6; i++) {
        const rise = (this.clock * 14 + i * 2.7 + mob.id) % 12, side = Math.sin(i * 2.1 + mob.id) * 7;
        square(ctx, x + side, y - 2 - rise, rise < 4 ? 3 : 2, tones[Math.min(4, Math.floor(rise / 2.6))]);
      }
    }
  }

  _pose(t) {
    let pose = this.poses.get(t);
    if (!pose) {
      const [bx, by] = this.battle.path[Math.floor(this.battle.path.length / 2)];
      const aim = Math.atan2(bx - t.x, -(by - t.y));
      pose = { angle: aim, aim, kick: 0, flash: 0, leap: null, x: t.cx, y: t.cy };
      this.poses.set(t, pose);
    }
    return pose;
  }

  _riderSpot(t, pose, now) {
    if (t.perch && t.perch.until > now) {
      const seat = this._pose(t.perch.tower);
      return { x: seat.x, y: seat.y, lift: 13, riding: true };
    }
    const host = t.host && !t.host.dead ? this.shown.get(t.host.id) : null;
    let x = t.cx, y = t.cy, lift = 0;
    if (host && now >= t.leapUntil) {
      x = host.x;
      y = host.y;
      lift = host.lift + 3;
      pose.aim = Math.atan2(host.dx, -host.dy);
    }
    const leap = pose.leap;
    if (leap && host && now < leap.until) {
      const k = 1 - (leap.until - now) / leap.time;
      x = leap.x + (host.x - leap.x) * k;
      y = leap.y + (host.y - leap.y) * k;
      lift = Math.sin(k * Math.PI) * 16;
      pose.aim = Math.atan2(host.x - leap.x, -(host.y - leap.y));
    }
    return { x, y, lift, riding: Boolean(host) };
  }

  _towers(ctx, battle, dt, highlight, still) {
    const now = battle.time;
    for (const t of battle.towers) {
      const pose = this._pose(t), lit = highlight && highlight.has(t.player.login);
      let spot = { x: t.cx, y: t.cy, lift: 0, riding: false };
      if (t.rider) spot = this._riderSpot(t, pose, now);
      else if (t.pull && now < t.pull.end) {
        const k = 1 - Math.pow(1 - Math.max(0, (now - t.pull.start) / (t.pull.end - t.pull.start)), 2);
        spot = { x: t.pull.fx + (t.cx - t.pull.fx) * k, y: t.pull.fy + (t.cy - t.pull.fy) * k,
          lift: Math.sin(k * Math.PI) * 10, riding: false };
      }
      pose.x = spot.x;
      pose.y = spot.y;
      if (t.rider && battle.covered(spot.x, spot.y)) continue;
      const x = at(spot.x), y = at(spot.y) - spot.lift;
      if (!still) {
        pose.angle = shortTurn(pose.angle, pose.aim, TURN * dt);
        pose.kick = Math.max(0, pose.kick - dt);
        pose.flash = Math.max(0, pose.flash - dt);
      }
      if (!spot.riding || spot.lift > 6) {
        ctx.fillStyle = 'rgba(0, 0, 0, .32)';
        ctx.beginPath();
        ctx.ellipse(at(spot.x), at(spot.y) + 7, 12, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      if (lit) glow(ctx, x, y, 22, 'rgba(255, 255, 255, .9)', 0.5);
      if (t.boost.cheer) glow(ctx, x, y, 20, 'rgba(255, 70, 140, .95)', 0.3 + 0.15 * Math.sin(this.clock * 7));
      if (t.boost.muse) glow(ctx, x, y, 20, 'rgba(168, 85, 247, .95)', 0.3 + 0.12 * Math.sin(this.clock * 5));
      const firing = now - t.lastShot < 0.4;
      if (t.berserk && firing) glow(ctx, x, y, 22, 'rgba(239, 68, 68, .95)', 0.45 + 0.2 * Math.sin(this.clock * 14));
      ctx.globalAlpha = t.busy > now && !t.perch ? 0.5 : 1;
      const lift = pose.kick > 0 ? Math.round(pose.kick / KICK * 2) : 0;
      if (t.cocoon) sprite(ctx, cocoonSprite(Math.floor(this.clock * 1.6 + t.x) % 2), x, y, 0, ZOOM, 0);
      else sprite(ctx, heroSprite(t.cls.id), x, y, pose.angle, ZOOM, lift, HERO_TURN_STEPS);
      if (t.berserk && firing) {
        ctx.globalAlpha = 0.35 + 0.2 * Math.sin(this.clock * 14);
        sprite(ctx, tintSprite(heroSprite(t.cls.id), '#ff2a2a'), x, y, pose.angle, ZOOM, lift, HERO_TURN_STEPS);
        ctx.globalAlpha = 1;
        for (let i = 0; i < 6; i++) {
          const rise = (this.clock * 2.2 + i / 6) % 1, a = i * 1.05 + t.x;
          ctx.globalAlpha = 1 - rise;
          square(ctx, x + Math.cos(a) * 12, y + Math.sin(a) * 9 - rise * 12, 2, i % 2 ? '#ff4d4d' : '#ffb020');
        }
        ctx.globalAlpha = 1;
      }
      if (t.hot && firing) this._muzzleFire(ctx, x, y, pose.angle);
      if (t.reloadUntil > now) this._progress(ctx, x, y - 2, 1 - (t.reloadUntil - now) / t.cls.base.reload, '#e5e7eb');
      if (t.charge) {
        const share = (now - t.charge.at) / (t.charge.until - t.charge.at);
        this._progress(ctx, x, y - 2, share, CHARGES[t.charge.kind].ring);
      }
      if (pose.flash > 0 && !t.rider && !t.cocoon) {
        const a = pose.angle, d = HERO_SIZE * ZOOM / 2 + 1;
        const fx = x + Math.sin(a) * d, fy = y - Math.cos(a) * d;
        glow(ctx, fx, fy, 7, 'rgba(255, 236, 160, .95)', 0.9);
        square(ctx, fx, fy, 3, '#ffffff');
      }
      ctx.globalAlpha = 1;
      if (t.webUntil > now) this._webOn(ctx, x, y);
      if (t.stunUntil > now) stars(ctx, x, y - 16, 9, this.clock * 5);
      else if (t.napUntil > now) {
        ctx.fillStyle = '#c4b5fd';
        ctx.font = '900 9px "Segoe UI", system-ui, sans-serif';
        ctx.fillText('z', x + 9, y - 10 - (this.clock * 6 % 4));
      }
      this._stamp(ctx, this._badge(t), x - BADGE_HALF, y + 8);
      if (t.player.pendingMove) this._pending(ctx, t, x, y);
    }
  }

  _muzzleFire(ctx, x, y, angle) {
    const d = HERO_SIZE * ZOOM / 2 + 2, fx = x + Math.sin(angle) * d, fy = y - Math.cos(angle) * d;
    glow(ctx, fx, fy, 8, 'rgba(255, 120, 30, .95)', 0.7);
    for (let i = 0; i < 5; i++) {
      const rise = (this.clock * 6 + i / 5) % 1;
      square(ctx, fx + Math.sin(i * 2.3 + this.clock * 9) * 2, fy - rise * 9, rise < 0.4 ? 3 : 2,
        FLAME[Math.min(FLAME.length - 1, Math.floor(rise * FLAME.length))]);
    }
  }

  _progress(ctx, x, y, share, color) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(16, 14, 31, .85)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 15, -Math.PI / 2, -Math.PI / 2 + Math.max(0, Math.min(1, share)) * Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  _charges(ctx, battle) {
    const now = battle.time;
    for (const t of battle.towers) {
      const charge = t.charge;
      if (!charge) continue;
      const share = Math.max(0, Math.min(1, (now - charge.at) / (charge.until - charge.at)));
      const look = CHARGES[charge.kind], pose = this._pose(t), x = at(pose.x), y = at(pose.y);
      const target = charge.target && !charge.target.dead ? charge.target : null;
      if (target) pose.aim = Math.atan2(target.x - t.cx, -(target.y - t.cy));
      const d = HERO_SIZE * ZOOM / 2 + 2, fx = x + Math.sin(pose.angle) * d, fy = y - Math.cos(pose.angle) * d;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, fx, fy, 4 + 9 * share, look.glow, 0.45 + 0.45 * share);
      for (let i = 0; i < 6; i++) {
        const k = (this.clock * 2.5 + i / 6) % 1, a = i * 1.05 + this.clock, r = 14 * (1 - k);
        ctx.globalAlpha = k;
        square(ctx, fx + Math.cos(a) * r, fy + Math.sin(a) * r, 2, look.sparks[i % look.sparks.length]);
      }
      ctx.restore();
      if (charge.kind !== 'aim' || !target) continue;
      const spot = this.shown.get(target.id) || target, mx = at(spot.x), my = at(spot.y) - (spot.lift || 0);
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.3 * share;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.lineDashOffset = -this.clock * 18;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(mx, my);
      ctx.stroke();
      ctx.restore();
      const reticle = reticleSprite(), side = Math.round(reticle.width * (5 - 2.6 * share));
      ctx.save();
      ctx.translate(Math.round(mx), Math.round(my));
      ctx.rotate((1 - share) * Math.PI);
      ctx.globalAlpha = 0.75 + 0.25 * share;
      ctx.drawImage(reticle, -side / 2, -side / 2, side, side);
      ctx.restore();
    }
  }

  _pending(ctx, t, x, y) {
    const cell = t.player.pendingMove, tx = at(cell.x + 0.5), ty = at(cell.y + 0.5);
    ctx.save();
    ctx.globalAlpha = 0.65 + 0.25 * Math.sin(this.clock * 5);
    const inset = 2 + Math.round(1 + Math.sin(this.clock * 5));
    const left = at(cell.x) + inset, right = at(cell.x + 1) - inset, top = at(cell.y) + inset;
    const bottom = at(cell.y + 1) - inset;
    ctx.fillStyle = '#fde047';
    const corners = [[left, top, 1, 1], [right, top, -1, 1], [left, bottom, 1, -1], [right, bottom, -1, -1]];
    for (const [cx, cy, sx, sy] of corners) {
      ctx.fillRect(sx > 0 ? cx : cx - 6, sy > 0 ? cy : cy - 2, 6, 2);
      ctx.fillRect(sx > 0 ? cx : cx - 2, sy > 0 ? cy : cy - 6, 2, 6);
    }
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.lineDashOffset = -this.clock * 10;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.restore();
  }

  say(text, color) {
    this.effects = this.effects.filter((e) => e.kind !== 'banner');
    this.effects.push({ kind: 'banner', t: 0, life: 4, text, color });
  }

  _badge(t) {
    const level = String(t.level), fill = gearColor(t.player.weapon);
    return this._label('lv:' + level + ':' + fill, BADGE_HALF * 2, 12, (g) => {
      g.font = '800 8.5px "Segoe UI", system-ui, sans-serif';
      const x = BADGE_HALF, w = Math.max(11, g.measureText(level).width + 5);
      g.fillStyle = fill;
      roundRect(g, x - w / 2, 1, w, 10, 4);
      g.fill();
      g.fillStyle = DARK;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(level, x, 6.3);
    });
  }

  _names(ctx, battle, names, highlight) {
    const named = (t) => names !== true && names.has(t.player.login);
    const first = (t) => (highlight && highlight.has(t.player.login) ? 0 : named(t) ? 1 : 2);
    const taken = [];
    for (const t of battle.towers.slice().sort((a, b) => first(a) - first(b))) {
      const pose = this._pose(t);
      if (t.rider && battle.covered(pose.x, pose.y)) continue;
      const marked = Boolean(highlight && highlight.has(t.player.login)), on = Math.floor(this.clock * 4) % 2 === 0;
      const image = this._nameLabel(t, marked ? (on ? 'on' : 'off') : '');
      const w = image.width / this.k, h = image.height / this.k;
      const riding = t.rider && t.host && !t.host.dead;
      const x = Math.max(1, Math.min(BOARD - w - 1, at(pose.x) - w / 2));
      let y = at(pose.y) + (riding ? 31 : -23) - (marked ? 2 : 0);
      if (y - h / 2 < EDGE) y = at(pose.y) + 31;
      const box = [x - 1, y - h / 2, x + w + 1, y + h / 2];
      if (taken.some((o) => box[0] < o[2] && o[0] < box[2] && box[1] < o[3] && o[1] < box[3])) continue;
      taken.push(box);
      if (marked) glow(ctx, at(pose.x), y, w * 0.75, 'rgba(255, 40, 40, 1)', on ? 0.75 : 0.3);
      this._stamp(ctx, image, x, y - h / 2);
    }
  }

  _nameLabel(t, mark) {
    const text = t.player.name.length > 12 ? t.player.name.slice(0, 11) + '…' : t.player.name;
    const coins = String(Math.floor(t.player.coins || 0)), size = mark ? 11.5 : 9.5, h = mark ? 16 : 13;
    const font = (mark ? '900 ' : '700 ') + size + 'px "Segoe UI", system-ui, sans-serif';
    const key = 'name:' + mark + ':' + text + ':' + coins;
    if (!this.labels.has(key)) this.ctx.font = font;
    const nameWidth = this.labels.has(key) ? 0 : this.ctx.measureText(text).width;
    const coinWidth = this.labels.has(key) ? 0 : this.ctx.measureText(coins).width;
    const coin = mark ? 9 : 7, w = nameWidth + coinWidth + coin + 15;
    return this._label(key, w, h, (g) => {
      g.font = font;
      g.textAlign = 'left';
      g.textBaseline = 'middle';
      g.fillStyle = mark === 'on' ? '#e11d2a' : 'rgba(16, 14, 31, .9)';
      roundRect(g, 0, 0, w, h, h / 2 - 0.5);
      g.fill();
      if (mark) {
        g.lineWidth = 1.5;
        g.strokeStyle = mark === 'on' ? '#ffd0d0' : '#ff3b3b';
        roundRect(g, 0.75, 0.75, w - 1.5, h - 1.5, h / 2 - 1.25);
        g.stroke();
      }
      g.fillStyle = mark === 'on' ? '#fff' : mark ? '#ff4545' : INK;
      g.fillText(text, 4.5, h / 2 + 0.5);
      g.drawImage(coinSprite(), Math.round(8 + nameWidth), Math.round((h - coin) / 2), coin, coin);
      g.fillStyle = mark === 'on' ? '#fff3b0' : '#ffd86b';
      g.fillText(coins, 10 + coin + nameWidth, h / 2 + 0.5);
    });
  }

  _mobTops(ctx, battle) {
    for (const mob of battle.mobs) {
      const spot = this.shown.get(mob.id);
      if (mob.dead || !mob.kind && !mob.silver || !spot || spot.top === undefined || battle.covered(mob.x, mob.y)) {
        continue;
      }
      const x = spot.screenX, top = spot.top, w = Math.max(16, spot.size * 0.9), share = Math.max(0, mob.hp / mob.max);
      ctx.fillStyle = '#15111d';
      ctx.fillRect(Math.round(x - w / 2) - 1, Math.round(top) - 1, Math.round(w) + 2, 5);
      ctx.fillStyle = share > 0.6 ? '#4ade80' : share > 0.3 ? '#facc15' : '#f87171';
      ctx.fillRect(Math.round(x - w / 2), Math.round(top), Math.round(w * share), 3);
      const name = mob.kind ? mob.kind.name : mob.silver.name, font = '800 9px "Segoe UI", system-ui, sans-serif';
      const color = mob.kind ? mob.kind.glow : '#e2e8f0';
      if (!this.labels.has('mob:' + name)) this.ctx.font = font;
      const width = this.labels.has('mob:' + name) ? 0 : this.ctx.measureText(name).width + 8;
      const image = this._label('mob:' + name, width, 14, (g) => {
        g.font = font;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.lineWidth = 3;
        g.strokeStyle = 'rgba(0, 0, 0, .85)';
        g.strokeText(name, width / 2, 7);
        g.fillStyle = color;
        g.fillText(name, width / 2, 7);
      });
      this._stamp(ctx, image, x - image.width / this.k / 2, top - 14);
    }
  }

  _base(ctx, battle) {
    const [bx, by] = battle.path[battle.path.length - 1], x = at(bx + 0.5), y = at(by + 0.5);
    const low = battle.lives <= battle.maxLives / 4, period = low ? BEAT_FAST : BEAT;
    const phase = (this.clock % period) / period;
    const beat = Math.exp(-phase * 9) + 0.6 * Math.exp(-Math.max(0, phase - 0.22) * 12) * (phase > 0.22 ? 1 : 0);
    const hit = this._hurtAt !== undefined && this.clock - this._hurtAt < 0.35;
    const bitten = battle.mobs.some((mob) => mob.biting && !mob.dead);
    const shake = bitten ? Math.sin(this.clock * 40) * 1.2 : 0;
    const image = heartSprite(), scale = ZOOM * (1 + 0.1 * beat), w = image.width * scale, h = image.height * scale;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, x, y, 26 + 6 * beat, hit ? 'rgba(255, 255, 255, .9)' : 'rgba(255, 70, 100, .9)', 0.35 + 0.25 * beat);
    ctx.restore();
    ctx.drawImage(image, Math.round(x - w / 2 + shake), Math.round(y - h / 2), Math.round(w), Math.round(h));
    if (hit || bitten) {
      ctx.globalAlpha = hit ? 0.6 * (1 - (this.clock - this._hurtAt) / 0.35) : 0.25 + 0.2 * Math.sin(this.clock * 20);
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(image, Math.round(x - w / 2 + shake), Math.round(y - h / 2), Math.round(w), Math.round(h));
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
    ctx.font = '900 12px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#2a0710';
    const text = String(Math.max(0, battle.lives));
    ctx.strokeText(text, x + shake, y - 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, x + shake, y - 1);
  }

  _aim(tower, x, y) {
    const pose = this._pose(tower);
    pose.aim = Math.atan2(x - tower.cx, -(y - tower.cy));
    pose.kick = KICK;
    pose.flash = FLASH;
  }

  _sparks(x, y, colors, count, speed, life = 0.35, size = 2) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random() * 0.8);
      this.effects.push({ kind: 'spark', t: 0, life: life * (0.7 + Math.random() * 0.5), x, y, vx: Math.cos(a) * v,
        vy: Math.sin(a) * v, color: colors[i % colors.length], size });
    }
  }

  _corpse(mob) {
    const spot = this.shown.get(mob.id);
    if (!spot || !spot.image) return;
    if (this.corpses.length >= CORPSE.max) this.corpses.shift();
    const pile = pileOf(spot.image, spot.angle);
    this.corpses.push({ t: 0, x: spot.x, y: spot.y, pile, lift: spot.lift / pile.scale });
  }

  _effect(event) {
    const add = (effect) => this.effects.push(Object.assign({ t: 0 }, effect));
    const t = event.tower;
    if (event.kind === 'shot') {
      if (t.rider) {
        this._pose(t).kick = KICK;
        this._sparks(event.x, event.y, ['#f5b8ff', '#d946ef', '#701a75'], event.crit ? 6 : 3, 1.3, 0.25);
        return;
      }
      this._aim(t, event.x, event.y);
      let bolt = BOLTS[t.cls.id] || { look: 'dot', color: t.cls.color, size: 2 };
      if (event.heavy) bolt = Object.assign({}, bolt, { width: event.heavy === 'mega' ? 5 : 3.5, color: '#ffffff' });
      else if (event.hot) bolt = Object.assign({}, bolt, { color: '#ff9a1f', size: 3 });
      add({ kind: 'shot', life: TRAVEL * (bolt.look === 'lob' ? 2.5 : 1), x1: t.cx, y1: t.cy, x2: event.x, y2: event.y,
        bolt, crit: event.crit, heavy: event.heavy });
      if (event.heavy) {
        this._pose(t).flash = FLASH * 3;
        this._sparks(t.cx, t.cy, CHARGES.heavy.sparks, event.heavy === 'mega' ? 14 : 8, 2.4, 0.35);
      }
    } else if (event.kind === 'ricochet') {
      const bolt = event.hot ? { look: 'dot', color: '#ff9a1f', size: 3 } : BOLTS.gunner;
      add({ kind: 'shot', life: TRAVEL, x1: event.x, y1: event.y, x2: event.mob.x, y2: event.mob.y, bolt });
      this._sparks(event.x, event.y, ['#ffffff', '#ffd84a'], 3, 1.6, 0.2);
    } else if (event.kind === 'burst') {
      add({ kind: 'boom', life: 0.3, x: event.x, y: event.y, r: event.radius, ring: '#e5e7eb' });
      this._sparks(event.x, event.y, ['#e5e7eb', '#9ca3af', '#fff3b0', '#d6a72e'], 14, event.radius * 5, 0.35, 2);
    } else if (event.kind === 'charge') {
      this._sparks(t.cx, t.cy, CHARGES[event.charge].sparks, 6, 1.4, 0.4);
    } else if (event.kind === 'reload') {
      this._sparks(t.cx, t.cy, ['#d6a72e', '#a37a1a', '#fff3b0'], 5, 1.2, 0.5, 2);
    } else if (event.kind === 'rocket') {
      this._aim(t, event.x, event.y);
      add({ kind: 'rocket', life: event.time, x1: t.cx, y1: t.cy, x2: event.x, y2: event.y, mob: event.mob });
    } else if (event.kind === 'chain') {
      this._aim(t, event.points[1][0], event.points[1][1]);
      const points = [];
      event.points.forEach(([x, y], i) => {
        if (i) {
          const [px, py] = event.points[i - 1];
          for (let k = 1; k < 4; k++) {
            points.push([px + (x - px) * k / 4 + (Math.random() - 0.5) * 0.35,
              py + (y - py) * k / 4 + (Math.random() - 0.5) * 0.35]);
          }
        }
        points.push([x, y]);
      });
      add({ kind: 'chain', life: 0.2, points });
      for (const [x, y] of event.points.slice(1)) this._sparks(x, y, ['#bfdbfe', '#ffffff'], 3, 1.6, 0.25);
    } else if (event.kind === 'boom') {
      const big = event.rocket || event.meteor;
      add({ kind: 'boom', life: big ? 0.6 : 0.35, x: event.x, y: event.y, r: event.radius,
        ring: event.meteor ? '#c08a4a' : '#ff6a1f' });
      this._sparks(event.x, event.y, event.meteor ? ['#ffd84a', '#ff8a1f', '#8a7f70', '#4a3a30']
        : ['#ffd84a', '#ff8a1f', '#ff4d1f'], big ? 26 : 9, event.radius * 4.5, big ? 0.6 : 0.4, 3);
      if (big) {
        this.decals.push({ kind: 'crater', t: 0, life: 4, x: event.x, y: event.y, r: event.radius * 0.35 });
      }
      if (event.meteor) {
        for (let i = 0; i < 8; i++) {
          this.decals.push({ kind: 'rubble', t: 0, life: 3, x: event.x + (Math.random() - 0.5) * event.radius * 1.4,
            y: event.y + (Math.random() - 0.5) * event.radius * 1.4, size: 2 + Math.floor(Math.random() * 3),
            color: '#6b5a48' });
        }
      }
    } else if (event.kind === 'flame') {
      const pose = this._pose(t);
      pose.aim = Math.atan2(event.x - t.cx, -(event.y - t.cy));
      pose.flame = { until: this.clock + FLAME_HOLD, angle: event.angle, blue: event.blue };
    } else if (event.kind === 'flash') {
      add({ kind: 'ring', life: 0.35, x: event.x, y: event.y, r: event.radius, color: '#fde047', width: 2 });
      this._sparks(event.x, event.y, ['#fef9c3', '#facc15', '#ffffff'], 8, event.radius * 3, 0.3);
    } else if (event.kind === 'thunderbolt' || event.kind === 'discharge') {
      const x = event.mob ? event.mob.x : event.x, y = event.mob ? event.mob.y : event.y;
      add({ kind: 'storm', life: 0.35, x, y });
      add({ kind: 'ring', life: 0.5, x, y, r: event.radius || 1, color: '#facc15', width: 3 });
      this._sparks(x, y, ['#fef9c3', '#facc15', '#ffffff'], 14, 3.2, 0.4);
    } else if (event.kind === 'kill') {
      const mob = event.mob, spot = this.shown.get(mob.id) || mob, goo = gooColor(mob.look);
      if (!goo || mob.fake) {
        this._corpse(mob);
        this._sparks(spot.x, spot.y, ['#7a1f1f', '#3b2f2f'], mob.kind ? 8 : 3, 1.4, 0.35, 2);
      } else if (!(mob.slime > 1 || mob.power && mob.power.id === 'split')) {
        add({ kind: 'melt', life: MELT_LIFE, x: spot.x, y: spot.y, id: mob.look, lift: spot.lift || 0 });
        const size = spot.image ? (spot.image.span || spot.image.width) / (spot.image.fine || 1) / CELL * ZOOM : 0.5;
        this.decals.push({ kind: 'goo', t: 0, life: GOO_LIFE, x: spot.x, y: spot.y + 0.05,
          r: Math.max(0.25, size * 0.55), color: goo, seed: mob.id % 7 });
        this._sparks(spot.x, spot.y, [goo, tone(goo, [255, 255, 255], 0.5)], 6, 1.6, 0.4, 2);
      }
    } else if (event.kind === 'split') {
      const spot = this.shown.get(event.mob.id) || event.mob, [[ax, ay], [bx, by]] = event.spots;
      const goo = gooColor(event.mob.look) || '#4ade80';
      add({ kind: 'split', life: SPLIT_LIFE, x: (ax + bx) / 2, y: (ay + by) / 2, id: event.mob.look,
        angle: Math.atan2(bx - ax, -(by - ay)) });
      this._sparks(spot.x, spot.y, [goo, tone(goo, [255, 255, 255], 0.5)], 10, 2, 0.45, 2);
    } else if (event.kind === 'hold') {
      const ice = event.by === 'frost';
      this._sparks(event.mob.x, event.mob.y, ice ? ['#e0fbff', '#67e8f9'] : ['#ffe14d', '#ffffff'], 6, 1.8, 0.35);
    } else if (event.kind === 'shatter') {
      const spot = this.shown.get(event.mob.id) || event.mob;
      this._sparks(spot.x, spot.y, ['#ffffff', '#e0fbff', '#67e8f9', '#0ea5e9'], 18, 2.6, 0.5, 3);
    } else if (event.kind === 'snow') {
      add({ kind: 'snow', life: event.time });
    } else if (event.kind === 'gust') {
      add({ kind: 'ring', life: 0.4, x: event.x, y: event.y, r: event.radius, color: '#5eead4', width: 2 });
      this._sparks(event.x, event.y, ['#ccfbf1', '#5eead4'], 8, 2.4, 0.35);
    } else if (event.kind === 'wind') {
      add({ kind: 'pulse', life: 0.7, x: t.cx, y: t.cy, r: event.radius, color: '#5eead4', width: 3 });
    } else if (event.kind === 'cheer') {
      add({ kind: 'pulse', life: 0.6, x: t.cx, y: t.cy, r: event.radius, color: '#ff5fb0', width: 3 });
      this._sparks(t.cx, t.cy, ['#ffd1e8', '#ff5fb0', '#be185d'], 12, 2.2, 0.45, 2);
    } else if (event.kind === 'rally') {
      add({ kind: 'pulse', life: 0.9, x: t.cx, y: t.cy, r: 4, color: '#facc15', width: 4 });
      for (const ally of this.battle.towers) {
        if (ally.rider || ally.cocoon) continue;
        const pose = this._pose(ally);
        this._sparks(pose.x, pose.y, ['#fff7c2', '#facc15', '#ff5fb0'], 6, 1.6, 0.6, 2);
      }
    } else if (event.kind === 'cleanse') {
      add({ kind: 'pulse', life: 0.6, x: t.cx, y: t.cy, r: event.radius, color: '#4ade80', width: 3 });
      for (const ally of event.freed) {
        const pose = this._pose(ally);
        this._sparks(pose.x, pose.y, ['#ecfdf5', '#86efac', '#22c55e'], 8, 1.6, 0.5, 2);
      }
    } else if (event.kind === 'hallow') {
      add({ kind: 'pulse', life: 0.7, x: event.x, y: event.y, r: event.radius, color: '#fde047', width: 4 });
      this._sparks(event.x, event.y, ['#fffbeb', '#fde047', '#f59e0b'], 18, event.radius * 3, 0.6, 2);
    } else if (event.kind === 'muse') {
      const pose = this._pose(event.ally);
      add({ kind: 'chain', life: 0.4, points: [[t.cx, t.cy], [pose.x, pose.y]], color: 'rgba(216, 180, 254, .85)' });
      this._sparks(pose.x, pose.y, event.flash ? ['#fff7c2', '#facc15', '#e9d5ff'] : ['#f3e8ff', '#c084fc', '#7e22ce'],
        event.flash ? 14 : 8, 1.8, 0.5, 2);
      if (event.flash) {
        add({ kind: 'text', life: 1.4, x: pose.x, y: pose.y - 0.7, text: 'озарение!', color: '#fde047' });
      }
    } else if (event.kind === 'expose') {
      const mob = event.mob;
      add({ kind: 'pulse', life: 0.7, x: mob.x, y: mob.y, r: 1.2, color: '#a855f7', width: 3 });
      add({ kind: 'text', life: 1.6, x: mob.x, y: mob.y - 0.9, text: 'слабое место!', color: '#d8b4fe' });
    } else if (event.kind === 'meteor') {
      add({ kind: 'meteor', life: event.time, x: event.x, y: event.y, r: event.radius });
    } else if (event.kind === 'thorns') {
      const spot = this.shown.get(event.mob.id) || event.mob;
      this._sparks(spot.x, spot.y, ['#c4b8a6', '#8a7f70', '#7a1f1f'], 6, 1.6, 0.35, 2);
    } else if (event.kind === 'ignite') {
      const tones = event.blue ? BLUE_FLAME : FLAME;
      add({ kind: 'ring', life: 0.45, x: event.x, y: event.y, r: event.radius, color: tones[2], width: 3 });
      this._sparks(event.x, event.y, tones.slice(0, 3), 14, event.radius * 4, 0.45, 3);
    } else if (event.kind === 'oil') {
      this._sparks(event.x, event.y, ['#24202b', '#3b3550', '#8b7fd0'], 10, 2, 0.4, 2);
    } else if (event.kind === 'oilfire') {
      add({ kind: 'ring', life: 0.5, x: event.x, y: event.y, r: event.radius, color: '#ff7a1f', width: 3 });
      this._sparks(event.x, event.y, FLAME.slice(0, 3), 18, event.radius * 3, 0.5, 3);
    } else if (event.kind === 'net') {
      add({ kind: 'chain', life: 0.3, points: [[t.cx, t.cy], [event.mob.x, event.mob.y]],
        color: 'rgba(214, 180, 120, .7)' });
      this._sparks(event.mob.x, event.mob.y, ['#d6b478', '#8a6a3c'], 8, 1.6, 0.4, 2);
    } else if (event.kind === 'prey') {
      const mob = event.mob;
      add({ kind: 'ring', life: 0.7, x: mob.x, y: mob.y, r: 1.2, color: '#ef4444', width: 3 });
      add({ kind: 'text', life: 1.6, x: mob.x, y: mob.y - 0.9, text: 'добыча!', color: '#f87171' });
    } else if (event.kind === 'bounty') {
      const pose = this._pose(t);
      add({ kind: 'text', life: 1.8, x: pose.x, y: pose.y - 0.7, text: '+' + event.coins, color: '#fde047' });
      this._sparks(event.mob.x, event.mob.y, ['#facc15', '#fff7c2', '#ca8a04'], 14, 2.4, 0.6, 2);
    } else if (event.kind === 'ambush') {
      const pose = this._pose(t);
      this._sparks(pose.x, pose.y, ['#e8d9b5', '#b45309'], 8, 1.8, 0.4, 2);
      this._sparks(t.cx, t.cy, ['#e8d9b5', '#b45309'], 8, 1.8, 0.4, 2);
    } else if (event.kind === 'cocoon') {
      add({ kind: 'text', life: 1.6, x: t.cx, y: t.cy - 0.7, text: '+' + event.coins, color: '#fde047' });
      this._sparks(t.cx, t.cy, ['#facc15', '#fff7c2'], 6, 1.4, 0.5, 2);
    } else if (event.kind === 'hatch') {
      add({ kind: 'ring', life: 0.6, x: t.cx, y: t.cy, r: 1, color: '#e879f9', width: 3 });
      this._sparks(t.cx, t.cy, ['#ece0ef', '#f5d0fe', '#d946ef', '#86198f'], 22, 2.6, 0.6, 3);
    } else if (event.kind === 'heist') {
      const victim = this._pose(event.victim);
      add({ kind: 'text', life: 2, x: victim.x, y: victim.y - 0.8, text: '−' + event.coins, color: '#f87171' });
      add({ kind: 'ring', life: 0.6, x: victim.x, y: victim.y, r: 0.8, color: '#e879f9', width: 2 });
      this._sparks(victim.x, victim.y, ['#facc15', '#fff7c2', '#d946ef'], 12, 2, 0.6, 2);
    } else if (event.kind === 'share') {
      for (const share of event.shares) {
        if (share.coins <= 0) continue;
        const pose = this._pose(share.tower);
        add({ kind: 'text', life: 1.8, x: pose.x, y: pose.y - 0.7, text: '+' + share.coins, color: '#fde047' });
        this._sparks(pose.x, pose.y, ['#facc15', '#fff7c2'], 5, 1.4, 0.5, 2);
      }
    } else if (event.kind === 'feast' || event.kind === 'execute') {
      const spot = this.shown.get(event.mob.id) || event.mob;
      this._sparks(spot.x, spot.y, event.kind === 'feast' ? ['#facc15', '#fff7c2', '#d946ef']
        : ['#ffffff', '#ef4444', '#7a1f1f'], 10, 2, 0.45, 2);
    } else if (event.kind === 'dig' || event.kind === 'drop' || event.kind === 'swallow') {
      const spot = this.shown.get(event.mob.id) || event.mob;
      add({ kind: 'puff', life: 0.5, x: spot.x, y: spot.y });
      if (event.kind !== 'dig') {
        this._sparks(spot.x, spot.y, ['#7a5235', '#a07850', '#4a3322'], event.kind === 'swallow' ? 14 : 6, 1.6, 0.4, 2);
      }
    } else if (event.kind === 'steal') {
      const pose = this._pose(t);
      add({ kind: 'text', life: 1.2, x: pose.x, y: pose.y - 0.6, text: '−' + event.coins, color: '#f87171' });
      this._sparks(pose.x, pose.y, ['#facc15', '#fff7c2'], 4, 1.4, 0.35, 2);
    } else if (event.kind === 'loot') {
      const pose = this._pose(t);
      add({ kind: 'text', life: 1.4, x: pose.x, y: pose.y - 0.7, text: '+' + event.coins, color: '#fde047' });
      this._sparks(event.mob.x, event.mob.y, ['#facc15', '#fff7c2', '#ca8a04'], 10, 2.2, 0.6, 2);
    } else if (event.kind === 'reflect' || event.kind === 'web') {
      const mob = event.mob;
      add({ kind: 'chain', life: 0.45, points: [[mob.x, mob.y], [t.cx, t.cy]], color: '#e2e8f0' });
      add({ kind: 'ring', life: 0.5, x: t.cx, y: t.cy, r: 0.6, color: '#ffffff', width: 2 });
    } else if (event.kind === 'breath') {
      const mob = event.mob;
      add({ kind: 'chain', life: 0.6, points: [[mob.x, mob.y], [event.x, event.y]], color: '#f97316' });
      for (let i = 1; i <= 6; i++) {
        const f = i / 6;
        this._sparks(mob.x + (event.x - mob.x) * f, mob.y + (event.y - mob.y) * f, ['#ffd84a', '#ff7a1f', '#ff4d1f'], 4,
          1.6, 0.5, 3);
      }
    } else if (event.kind === 'ward') {
      const mob = event.mob;
      add({ kind: 'ring', life: 0.7, x: mob.x, y: mob.y, r: mob.power.range, color: '#4ade80', width: 2 });
    } else if (event.kind === 'mirage') {
      this._sparks(event.mob.x, event.mob.y, ['#22d3ee', '#c084fc', '#e0e7ff'], 10, 1.8, 0.4, 2);
    } else if (event.kind === 'level') {
      const pose = this._pose(t);
      add({ kind: 'text', life: 1.6, x: pose.x, y: pose.y - 0.7, text: 'ур. ' + event.level, color: '#fde047' });
      this._sparks(pose.x, pose.y, ['#fde047', '#ffffff'], 8, 2, 0.5);
    } else if (event.kind === 'arrive') {
      add({ kind: 'ring', life: 0.8, x: event.mob.x, y: event.mob.y, r: 1.4, color: event.mob.kind.glow, width: 3 });
    } else if (event.kind === 'power') {
      const mob = event.mob;
      add({ kind: 'ring', life: 0.5, x: mob.x, y: mob.y, r: 1, color: mob.kind ? mob.kind.glow : '#e879f9', width: 2 });
    } else if (event.kind === 'leap') {
      this._pose(t).leap = { x: event.x, y: event.y, until: t.leapUntil, time: t.cls.base.leap };
    } else if (event.kind === 'wall') {
      this._sparks(event.x, event.y, ['#c4b8a6', '#9a8f80', '#6b6258'], 8, 1.6, 0.45, 2);
      add({ kind: 'ring', life: 0.45, x: event.x, y: event.y, r: 0.9, color: '#c4b8a6', width: 2 });
    } else if (event.kind === 'crumble') {
      this._sparks(event.x, event.y, ['#c4b8a6', '#9a8f80', '#6b6258', '#3d362f'], 14, 2.6, 0.55, 3);
      for (let i = 0; i < 6; i++) {
        this.decals.push({ kind: 'rubble', t: 0, life: 2.5, x: event.x + (Math.random() - 0.5) * 0.9,
          y: event.y + (Math.random() - 0.5) * 0.9, size: 2 + Math.floor(Math.random() * 3), color: '#8a7f70' });
      }
    } else if (event.kind === 'toss') {
      add({ kind: 'toss', life: event.time, x1: t.cx, y1: t.cy, x2: event.mob.x, y2: event.mob.y, mob: event.mob,
        mine: event.mine, radius: event.radius });
    } else if (event.kind === 'immune') {
      const spot = this.shown.get(event.mob.id) || event.mob;
      add({ kind: 'ring', life: 0.35, x: spot.x, y: spot.y, r: 0.55, color: 'rgba(226, 232, 240, .8)', width: 1.5 });
    } else if (event.kind === 'flask' || event.kind === 'fogtoss') {
      this._aim(t, event.x, event.y);
      add({ kind: 'lob', life: event.time, x1: t.cx, y1: t.cy, x2: event.x, y2: event.y, fog: event.kind === 'fogtoss',
        black: t.runes.has('plague') });
    } else if (event.kind === 'splash') {
      this._sparks(event.x, event.y, t.runes.has('plague') ? ['#a78bfa', '#4c1d95', '#17141f']
        : ['#d9f99d', '#84cc16', '#3f6212'], 8, 2, 0.35, 2);
    } else if (event.kind === 'fog') {
      add({ kind: 'puff', life: 0.6, x: event.x, y: event.y });
      this._sparks(event.x, event.y, t.runes.has('plague') ? ['#a78bfa', '#2f2540'] : ['#d9f99d', '#4d7c0f'], 12,
        event.radius * 3, 0.5, 2);
    } else if (event.kind === 'trap') {
      add({ kind: 'ring', life: 0.35, x: event.x, y: event.y, r: 0.4, color: '#d6d3d1', width: 1.5 });
    } else if (event.kind === 'snap') {
      add({ kind: 'snapped', life: 0.7, x: event.x, y: event.y });
      this._sparks(event.x, event.y, ['#e5e7eb', '#9ca3af', '#7a1f1f'], 6, 1.6, 0.3, 2);
      if (event.radius > 0.6) {
        add({ kind: 'ring', life: 0.4, x: event.x, y: event.y, r: event.radius, color: '#d6d3d1' });
      }
    } else if (event.kind === 'nova') {
      this._pose(t).flash = FLASH;
      add({ kind: 'ring', life: 0.45, x: t.cx, y: t.cy, r: event.radius, color: '#a5f3fc', width: 3 });
      this._sparks(t.cx, t.cy, ['#f0fdff', '#a5f3fc'], 10, event.radius * 3, 0.45, 2);
    } else if (event.kind === 'spikes') {
      this._aim(t, event.x, event.y);
      add({ kind: 'spikes', life: 0.4, points: event.points });
    } else if (event.kind === 'whirl') {
      this._aim(t, event.mob.x, event.mob.y);
    } else if (event.kind === 'rise') {
      const mob = event.mob;
      add({ kind: 'ring', life: 0.6, x: mob.x, y: mob.y, r: 0.9, color: '#a3e635', width: 2 });
      this._sparks(mob.x, mob.y, ['#ebe5d6', '#b0a690', '#a3e635'], 10, 1.8, 0.5, 2);
    } else if (event.kind === 'hex') {
      const mob = event.mob, tower = event.tower;
      const bend = [(mob.x + tower.cx) / 2 + 0.3, (mob.y + tower.cy) / 2 - 0.3];
      add({ kind: 'chain', life: 0.35, points: [[mob.x, mob.y], bend, [tower.cx, tower.cy]], color: '#e879f9' });
      this._sparks(tower.cx, tower.cy, ['#e879f9', '#f5d0fe'], 8, 1.6, 0.4, 2);
    } else if (event.kind === 'blink') {
      const mob = event.mob;
      add({ kind: 'ring', life: 0.4, x: event.x, y: event.y, r: 0.6, color: '#22d3ee', width: 2 });
      this._sparks(event.x, event.y, ['#cffafe', '#22d3ee'], 6, 1.2, 0.35, 2);
      this._sparks(mob.x, mob.y, ['#cffafe', '#22d3ee'], 6, 1.6, 0.35, 2);
    } else if (event.kind === 'burrow') {
      const spot = this.shown.get(event.mob.id) || event.mob;
      add({ kind: 'puff', life: 0.7, x: spot.x, y: spot.y });
      this._sparks(spot.x, spot.y, ['#a16207', '#78350f', '#facc15'], 10, 1.4, 0.5, 2);
    } else if (event.kind === 'treasure') {
      const spot = this.shown.get(event.mob.id) || event.mob;
      this._sparks(spot.x, spot.y, ['#facc15', '#fde047', '#fff7c2', '#ca8a04'], 26, 3.2, 0.9, 3);
      add({ kind: 'text', life: 1.8, x: spot.x, y: spot.y - 0.6, text: '+' + event.coins + ' всем!',
        color: '#fde047' });
    } else if (event.kind === 'clink') {
      const spot = this.shown.get(event.mob.id) || event.mob;
      this._sparks(spot.x, spot.y, ['#facc15', '#fff7c2'], 2, 1.4, 0.3, 2);
    } else if (event.kind === 'leech') {
      this._sparks(event.mob.x, event.mob.y, ['#dc2626', '#fca5a5'], 6, 1.2, 0.4, 2);
    } else if (event.kind === 'plant') {
      add({ kind: 'ring', life: 0.35, x: event.x, y: event.y, r: 0.45, color: '#c7d2fe', width: 1.5 });
    } else if (event.kind === 'mine') {
      const look = MINE_BLASTS[event.mine];
      add({ kind: 'boom', life: 0.4, x: event.x, y: event.y, r: event.radius, ring: look.ring });
      this._sparks(event.x, event.y, look.sparks, 12, event.radius * 4, 0.45, 3);
      this.decals.push({ kind: 'scorch', t: 0, life: 3, x: event.x, y: event.y, r: Math.min(1, event.radius * 0.6) });
      if (event.mine === 'stun') {
        add({ kind: 'ring', life: 0.6, x: event.x, y: event.y, r: event.radius, color: '#7fe3ff', width: 3 });
      }
    } else if (event.kind === 'nuke') {
      add({ kind: 'nuke', life: NUKE_LIFE, x: event.x, y: event.y, radius: event.radius, small: event.small });
      this._sparks(event.x, event.y, ['#ffffff', '#ffe08a', '#ff9a1f', '#5a4a40'], event.small ? 30 : 60,
        event.small ? 7 : 12, 1.3, 3);
      this.decals.push({ kind: 'crater', t: 0, life: 7, x: event.x, y: event.y, r: event.radius * 0.45 });
    } else if (event.kind === 'heal' || event.kind === 'shield' || event.kind === 'rescue') {
      const [bx, by] = this.battle.path[this.battle.path.length - 1], x = bx + 0.5, y = by + 0.5;
      const look = { heal: ['#4ade80', '+' + event.lives + ' ♥'], shield: ['#fde047', 'щит!'],
        rescue: ['#4ade80', '+' + event.lives + ' ♥'] }[event.kind];
      add({ kind: 'pulse', life: 0.7, x, y, r: event.kind === 'rescue' ? 2.4 : 1.2, color: look[0], width: 3 });
      add({ kind: 'text', life: 1.8, x, y: y - 0.9, text: look[1], color: look[0] });
      this._sparks(x, y, [look[0], '#ffffff'], event.kind === 'rescue' ? 30 : 10, 2, 0.6, 2);
      if (event.kind === 'rescue') this.say('Второй шанс!', '#4ade80');
    } else if (event.kind === 'leak') {
      const [bx, by] = this.battle.path[this.battle.path.length - 1];
      const spot = this.shown.get(event.mob.id) || event.mob;
      add({ kind: 'puff', life: 0.5, x: spot.x, y: spot.y });
      this._hurtAt = this.clock;
      add({ kind: 'ring', life: 0.5, x: bx + 0.5, y: by + 0.5, r: 1.1, color: '#ef4444', width: 2 });
    }
  }

  _flames(ctx, battle) {
    for (const t of battle.towers) {
      const pose = this.poses.get(t), flame = pose && pose.flame;
      if (!flame || flame.until <= this.clock) continue;
      const fade = Math.min(1, (flame.until - this.clock) / 0.12), spread = t.cone || 0.4;
      const tones = flame.blue ? BLUE_FLAME : FLAME;
      const nozzle = HERO_SIZE * ZOOM / 2, ox = at(t.cx) + Math.cos(flame.angle) * nozzle;
      const oy = at(t.cy) + Math.sin(flame.angle) * nozzle, reach = t.range * CELL - nozzle;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, ox + Math.cos(flame.angle) * reach * 0.35, oy + Math.sin(flame.angle) * reach * 0.35, reach * 0.55,
        flame.blue ? 'rgba(74, 163, 255, .9)' : 'rgba(255, 140, 40, .9)', 0.35 * fade);
      for (let i = 0; i < FLAME_BITS; i++) {
        const travel = (this.clock * 2.6 + noise(i, t.x * 31 + t.y)) % 1;
        const a = flame.angle + (noise(i + 50, t.x + t.y * 17) * 2 - 1) * spread * (0.2 + 0.8 * travel);
        const d = travel * reach, px = ox + Math.cos(a) * d, py = oy + Math.sin(a) * d - travel * travel * 6;
        const tone = tones[Math.min(tones.length - 1, Math.floor(travel * tones.length))];
        ctx.globalAlpha = fade * (1 - travel * 0.7);
        square(ctx, px, py, 2 + Math.round(travel * 3), tone);
      }
      ctx.restore();
    }
  }

  _effects(ctx, dt) {
    const next = [];
    for (const e of this.effects) {
      e.t += dt;
      if (e.t >= e.life) {
        if (e.kind === 'shot') {
          this.impacts += 1;
          this._sparks(e.x2, e.y2, [e.crit ? '#ffffff' : e.bolt.color], e.crit ? 5 : 2, 1.2, 0.18);
        }
        continue;
      }
      next.push(e);
      const share = e.t / e.life, fade = 1 - share;
      if (e.kind === 'shot') {
        const b = e.bolt, x = at(e.x1 + (e.x2 - e.x1) * share), y = at(e.y1 + (e.y2 - e.y1) * share);
        if (b.look === 'tracer') {
          if (e.heavy) glow(ctx, x, y, b.width * 3, 'rgba(255, 243, 176, .95)', 0.8);
          ctx.strokeStyle = b.color;
          ctx.lineWidth = b.width * (e.crit && !e.heavy ? 1.5 : 1);
          ctx.globalAlpha = 0.9;
          ctx.beginPath();
          ctx.moveTo(at(e.x1), at(e.y1));
          ctx.lineTo(x, y);
          ctx.stroke();
          ctx.globalAlpha = 1;
          if (b.bullet) {
            sprite(ctx, bulletSprite(), x, y, Math.atan2(e.x2 - e.x1, -(e.y2 - e.y1)), e.heavy ? 1.6 : 1, 0, 64);
          }
        } else if (b.look === 'bolt') {
          const dx = e.x2 - e.x1, dy = e.y2 - e.y1, len = Math.hypot(dx, dy) || 1;
          ctx.strokeStyle = b.color;
          ctx.lineWidth = b.width;
          ctx.beginPath();
          ctx.moveTo(x - dx / len * 7, y - dy / len * 7);
          ctx.lineTo(x, y);
          ctx.stroke();
        } else if (b.look === 'lob') {
          const arc = Math.sin(share * Math.PI) * 10;
          square(ctx, x, y - arc, b.size + 2, '#15111d');
          square(ctx, x, y - arc, b.size, b.color);
        } else if (b.look === 'shard') {
          ctx.save();
          ctx.translate(Math.round(x), Math.round(y));
          ctx.rotate(Math.PI / 4);
          ctx.fillStyle = b.color;
          ctx.fillRect(-b.size / 2, -b.size / 2, b.size, b.size);
          ctx.restore();
        } else {
          square(ctx, x, y, (b.size || 2) + 2, 'rgba(0, 0, 0, .5)');
          square(ctx, x, y, b.size || 2, e.crit ? '#ffffff' : b.color);
        }
      } else if (e.kind === 'lob') {
        const x = at(e.x1 + (e.x2 - e.x1) * share);
        const y = at(e.y1 + (e.y2 - e.y1) * share) - Math.sin(share * Math.PI) * 22;
        const image = e.fog ? mineSprite('grenade', true) : flaskSprite();
        sprite(ctx, image, x, y, share * Math.PI * 3, e.fog ? 1.2 : 1.6);
        if (e.black) {
          ctx.globalAlpha = 0.7;
          sprite(ctx, tintSprite(image, '#2e1065'), x, y, share * Math.PI * 3, e.fog ? 1.2 : 1.6);
          ctx.globalAlpha = 1;
        }
      } else if (e.kind === 'rocket') {
        const spot = e.mob.dead ? null : this.shown.get(e.mob.id);
        if (spot) {
          e.x2 = spot.x;
          e.y2 = spot.y;
        }
        const x = at(e.x1 + (e.x2 - e.x1) * share), y = at(e.y1 + (e.y2 - e.y1) * share);
        const angle = Math.atan2(e.x2 - e.x1, -(e.y2 - e.y1)), bx = -Math.sin(angle), by = Math.cos(angle);
        for (let i = 1; i <= 7; i++) {
          glow(ctx, x + bx * i * 5 + noise(i, Math.floor(this.clock * 8)) * 3 - 1.5, y + by * i * 5, 3 + i,
            'rgba(200, 196, 210, 1)', 0.4 * (1 - i / 8));
        }
        glow(ctx, x + bx * 7, y + by * 7, 7, 'rgba(255, 160, 40, .95)', 0.85);
        sprite(ctx, rocketSprite(), x, y, angle, 1.6, 0, 64);
      } else if (e.kind === 'meteor') {
        const tx = at(e.x), ty = at(e.y), k = share * share, mx = tx - 150 * (1 - k), my = ty - 210 * (1 - k);
        ctx.save();
        ctx.globalAlpha = 0.4 + 0.3 * Math.sin(this.clock * 12);
        ctx.strokeStyle = '#ff7a1f';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.lineDashOffset = -this.clock * 20;
        ctx.beginPath();
        ctx.ellipse(tx, ty, e.r * CELL, e.r * CELL * 0.92, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = 'rgba(0, 0, 0, ' + (0.15 + 0.35 * share).toFixed(3) + ')';
        ctx.beginPath();
        ctx.ellipse(tx, ty + 3, 6 + 14 * share, 3 + 6 * share, 0, 0, Math.PI * 2);
        ctx.fill();
        for (let i = 1; i <= 12; i++) {
          glow(ctx, mx - i * 8 * (150 / 210), my - i * 8, 16 - i * 0.8, i < 6 ? 'rgba(255, 140, 40, 1)'
            : 'rgba(120, 100, 90, 1)', 0.75 * (1 - i / 13));
        }
        glow(ctx, mx, my, 26, 'rgba(255, 120, 30, .95)', 0.9);
        sprite(ctx, meteorSprite(), mx, my, this.clock * 3, 2.6, 0, 64);
      } else if (e.kind === 'snow') {
        const alpha = Math.min(1, e.t * 2, (e.life - e.t) * 1.5), width = CELL * SIZE;
        ctx.fillStyle = 'rgba(224, 242, 254, ' + (0.12 * alpha).toFixed(3) + ')';
        ctx.fillRect(EDGE, EDGE, width, width);
        for (let i = 0; i < SNOWFLAKES; i++) {
          const fall = (e.t * (0.12 + 0.1 * noise(i, 1)) + noise(i, 2)) % 1;
          const x = EDGE + (noise(i, 3) * width + Math.sin(e.t * 2 + i) * 6 + width) % width;
          ctx.globalAlpha = alpha * (0.6 + 0.4 * noise(i, 4));
          square(ctx, x, EDGE + fall * width, i % 4 ? 2 : 3, '#f0f9ff');
        }
        ctx.globalAlpha = 1;
      } else if (e.kind === 'snapped') {
        ctx.globalAlpha = Math.min(1, fade * 2);
        sprite(ctx, trapSprite(true), at(e.x), at(e.y), 0, 1.8);
        ctx.globalAlpha = 1;
      } else if (e.kind === 'spikes') {
        const rise = Math.sin(Math.min(1, share * 2.5) * Math.PI / 2) * (1 - Math.max(0, share - 0.6) / 0.4);
        e.points.forEach(([px, py], k) => {
          for (let i = 0; i < 4; i++) {
            const a = i * 1.6 + k * 0.7, d = CELL * (i ? 0.3 : 0);
            const x = at(px) + Math.cos(a) * d, y = at(py) + Math.sin(a) * d * 0.7, h = (7 + (i % 3) * 2) * rise;
            ctx.fillStyle = '#8a7f70';
            ctx.beginPath();
            ctx.moveTo(x - 3, y + 2);
            ctx.lineTo(x, y + 2 - h);
            ctx.lineTo(x + 3, y + 2);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#c4b8a6';
            ctx.fillRect(Math.round(x - 1), Math.round(y + 1 - h), 1, Math.max(0, Math.round(h - 2)));
          }
        });
      } else if (e.kind === 'toss') {
        const spot = e.mob.dead ? null : this.shown.get(e.mob.id);
        if (spot) {
          e.x2 = spot.x;
          e.y2 = spot.y;
        }
        if (e.mine === 'nuke' || e.mine === 'fusion') this._nukeFlight(ctx, e, share);
        else {
          const x = at(e.x1 + (e.x2 - e.x1) * share);
          const y = at(e.y1 + (e.y2 - e.y1) * share) - Math.sin(share * Math.PI) * 26;
          sprite(ctx, mineSprite(e.mine, true), x, y, share * Math.PI * 4, 1.6);
        }
      } else if (e.kind === 'chain') {
        ctx.globalAlpha = fade;
        for (const [width, color] of [[4, e.color || 'rgba(96, 165, 250, .6)'], [1.5, '#ffffff']]) {
          ctx.strokeStyle = color;
          ctx.lineWidth = width;
          ctx.beginPath();
          e.points.forEach(([x, y], i) => (i ? ctx.lineTo(at(x), at(y)) : ctx.moveTo(at(x), at(y))));
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      } else if (e.kind === 'boom') {
        const r = e.r * CELL * (0.5 + 0.6 * share);
        glow(ctx, at(e.x), at(e.y), r * 1.2, 'rgba(255, 200, 80, .9)', fade * 0.8);
        ctx.globalAlpha = fade;
        burst(ctx, at(e.x), at(e.y), r, Math.max(8, Math.round(e.r * 10)), e.y * 2 + share, share < 0.5 ? 1 : 0,
          share < 0.5 ? '#ffd84a' : e.ring);
        ctx.globalAlpha = 1;
      } else if (e.kind === 'nuke') {
        this._nukeBlast(ctx, e, share);
      } else if (e.kind === 'storm') {
        ctx.globalAlpha = fade;
        for (const [width, color] of [[5, 'rgba(96, 165, 250, .55)'], [2, '#ffffff']]) {
          ctx.strokeStyle = color;
          ctx.lineWidth = width;
          ctx.beginPath();
          ctx.moveTo(at(e.x), EDGE);
          for (let k = 1; k <= 6; k++) {
            ctx.lineTo(at(e.x) + (k < 6 ? (k % 2 ? 7 : -7) : 0), EDGE + (at(e.y) - EDGE) * k / 6);
          }
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      } else if (e.kind === 'spark') {
        ctx.globalAlpha = fade;
        square(ctx, at(e.x + e.vx * e.t), at(e.y + e.vy * e.t), e.size, e.color);
        ctx.globalAlpha = 1;
      } else if (e.kind === 'puff') {
        ctx.globalAlpha = fade * 0.55;
        ctx.fillStyle = '#c9c4d8';
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(at(e.x) + (i - 1) * 5 * share, at(e.y) - share * (6 + i * 2), 3 + share * (5 + i), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      } else if (e.kind === 'melt') {
        const stage = Math.min(3, 1 + Math.floor(share * 3));
        ctx.globalAlpha = stage === 3 ? Math.min(1, fade * 3) : 1;
        sprite(ctx, meltSprite(e.id, stage), at(e.x), at(e.y) - e.lift * fade, 0);
        ctx.globalAlpha = 1;
      } else if (e.kind === 'split') {
        sprite(ctx, splitSprite(e.id, Math.min(3, 1 + Math.floor(share * 3)), SPLIT_APART), at(e.x), at(e.y), e.angle);
      } else if (e.kind === 'pulse') {
        const x = at(e.x), y = at(e.y), r = Math.max(4, e.r * CELL * (0.2 + 0.8 * (1 - fade * fade)));
        glow(ctx, x, y, r * 1.1, e.color, 0.3 * fade);
        ctx.strokeStyle = e.color;
        for (const [scale, width, alpha] of [[1, e.width || 3, 0.9], [0.86, 1.5, 0.45]]) {
          ctx.globalAlpha = fade * alpha;
          ctx.lineWidth = Math.max(1, width * (0.4 + 0.6 * fade));
          ctx.beginPath();
          ctx.arc(x, y, r * scale, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      } else if (e.kind === 'ring') {
        const r = Math.max(4, e.r * CELL * (0.3 + 0.7 * share)), count = Math.max(6, Math.min(20, Math.round(e.r * 9)));
        if (share < 0.3) glow(ctx, at(e.x), at(e.y), r * 1.2, e.color, (0.3 - share) * 1.5);
        ctx.globalAlpha = fade;
        const arm = share < 0.5 && (e.width || 2) > 1.5 ? 1 : 0;
        burst(ctx, at(e.x), at(e.y), r, count, e.x * 3 + share * 0.8, arm, e.color);
        ctx.globalAlpha = 1;
      } else if (e.kind === 'banner') {
        ctx.globalAlpha = Math.min(1, fade * 3, e.t * 4);
        ctx.font = '900 14px "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const width = ctx.measureText(e.text).width + 24, cx = EDGE + CELL * SIZE / 2, cy = EDGE + CELL * 1.2;
        ctx.fillStyle = 'rgba(16, 14, 31, .9)';
        roundRect(ctx, cx - width / 2, cy - 13, width, 26, 9);
        ctx.fill();
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = e.color;
        ctx.fillText(e.text, cx, cy + 1);
        ctx.globalAlpha = 1;
      } else if (e.kind === 'text') {
        ctx.globalAlpha = Math.min(1, fade * 2);
        ctx.fillStyle = e.color;
        ctx.strokeStyle = 'rgba(0, 0, 0, .85)';
        ctx.lineWidth = 3;
        ctx.font = '900 12px "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const y = at(e.y) - 14 * share;
        ctx.strokeText(e.text, at(e.x), y);
        ctx.fillText(e.text, at(e.x), y);
        ctx.globalAlpha = 1;
      }
    }
    this.effects = next;
  }
}
