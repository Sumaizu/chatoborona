import { LETTERS, SIZE } from './field.js';
import { HERO_SIZE, coinSprite, flaskSprite, heartSprite, heroSprite, mineSprite, mobSprite, pixelsOf, tintSprite,
  trapSprite, wallSprite } from './sprites.js';
import { rarityOf } from './gacha.js';

export const CELL = 30;
export const EDGE = 16;
export const BOARD = EDGE + CELL * SIZE;

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
const TINTS = { poison: '#4ade80', burn: '#ff7a1f', chill: '#8ee6ff', fury: '#ff4d1f' };
const HIT_FLASH = 0.15;
const ELEMENT_BITS = {
  fire: ['#ffd84a', '#ff7a1f', '#ff4d1f'], ice: ['#f0fdff', '#a5f3fc', '#67e8f9'],
  storm: ['#fef9c3', '#facc15', '#ffffff'],
  poison: ['#d9f99d', '#a3e635', '#7c3aed'],
};
const MINE_LIGHTS = {
  strong: 'rgba(255, 59, 59, .9)', wide: 'rgba(255, 176, 32, .9)', stun: 'rgba(127, 227, 255, .9)',
};
const MINE_BLASTS = {
  strong: { sparks: ['#ffffff', '#ffd84a', '#ff4d1f'], ring: '#ff6a1f' },
  wide: { sparks: ['#ffd84a', '#ff8a1f', '#c2410c'], ring: '#ffb020' },
  stun: { sparks: ['#ffffff', '#7fe3ff', '#3b82f6'], ring: '#7fe3ff' },
};
const AURAS = {
  chill: { color: [103, 232, 249], spark: '#e0fbff', waves: 2, period: 2.6, particles: 8, spin: 0.5, cross: true },
  haste: { color: [236, 72, 153], spark: '#ffc2e2', waves: 3, period: 1.6, particles: 6, spin: -1.1, rise: true },
  wisdom: { color: [168, 85, 247], spark: '#ead6ff', waves: 1, period: 3.2, particles: 10, spin: 0.7, runes: true },
  blessing: { color: [34, 197, 94], spark: '#bbf7d0', waves: 2, period: 2.2, particles: 6, spin: -0.6, cross: true,
    rise: true },
};
const INK = '#f4f0e8';
const MUTED = 'rgba(166, 162, 189, .85)';
const DARK = '#100e1f';
const ROAD = 'rgba(255, 255, 255, .08)';
const ROAD_EDGE = 'rgba(255, 255, 255, .14)';
const BOLTS = {
  sniper: { look: 'tracer', color: '#fff3b0', width: 2 },
  gunner: { look: 'dot', color: '#ffd84a', size: 2 },
  bomber: { look: 'lob', color: '#5b7330', size: 4 },
  earth: { look: 'lob', color: '#9a8f80', size: 4 },
  alchemist: { look: 'dot', color: '#9be22d', size: 3 },
  hunter: { look: 'bolt', color: '#e8d9b5', width: 2 },
  healer: { look: 'holy', color: '#fde68a', width: 3 },
  frost: { look: 'shard', color: '#9ff3ff', size: 3 },
  shaman: { look: 'dot', color: '#5eead4', size: 3 },
  miner: { look: 'dot', color: '#c7d2fe', size: 2 },
};
const FLAME = ['#fff3b0', '#ffd84a', '#ff9a1f', '#ff5a1f', '#b8320f'];
const FLAME_HOLD = 0.3;
const FLAME_BITS = 34;
const BADGE_HALF = 16;
const RESOLUTION_MAX = 2.5;
const HERO_TURN_STEPS = 16;
const LABELS_MAX = 400;
const piles = new WeakMap();
const glows = new Map();
const discs = new Map();

const at = (v) => EDGE + v * CELL;
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
  const w = image.width * zoom, h = image.height * zoom;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.rotate(turnOf(angle, steps) * (Math.PI * 2 / steps));
  ctx.drawImage(image, -w / 2, -h / 2 + lift, w, h);
  ctx.restore();
}

const puddleShapes = new Map();

function puddleShape(radius, seed) {
  const size = Math.max(4, Math.round(radius)), key = size + ':' + seed;
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
      let color = k > 0.86 ? '#2f4f0e' : k > 0.7 ? '#3f6212' : k > 0.35 ? '#4d7c0f' : '#65a30d';
      if (k < 0.55 && Math.sin(x * 1.7 + seed) + Math.cos(y * 2.1 + seed) > 1.4) color = '#84cc16';
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.fillStyle = '#d9f99d';
  ctx.fillRect(Math.round(c - size * 0.35), Math.round(c - size * 0.35), 2, 1);
  ctx.fillRect(Math.round(c - size * 0.35), Math.round(c - size * 0.35) + 1, 1, 1);
  ctx.fillStyle = '#bef264';
  ctx.fillRect(Math.round(c + size * 0.25), Math.round(c - size * 0.1), 1, 1);
  puddleShapes.set(key, canvas);
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
  const pile = { grains, canvas, left, top };
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
    this.poses = new Map();
    this.effects = [];
    this.decals = [];
    this.corpses = [];
    this.built = new WeakMap();
    this.battle = null;
    this.clock = 0;
    this.impacts = 0;
    this.labels = new Map();
  }

  resize(scale) {
    const k = Math.min(RESOLUTION_MAX, Math.max(0.5, scale) * (window.devicePixelRatio || 1));
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
    this._auras(ctx, battle);
    if (ranges && ranges.size) this._ranges(ctx, battle, ranges);
    this._patches(ctx, battle);
    this._puddles(ctx, battle);
    this._decals(ctx, step);
    this._corpses(ctx, step);
    this._mines(ctx, battle);
    this._traps(ctx, battle);
    this._walls(ctx, battle, still);
    this._base(ctx, battle);
    this._mobs(ctx, battle, dt, still);
    this._flames(ctx, battle);
    this._whirls(ctx, battle);
    this._muses(ctx, battle);
    this._towers(ctx, battle, dt, highlight, still);
    this._effects(ctx, step);
    if (names) this._names(ctx, battle, names, highlight);
    this._mobTops(ctx, battle);
    return fresh;
  }

  _ground(battle) {
    const key = (battle ? battle.path.map((c) => c.join(',')).join(';') : '') + '@' + this.k;
    if (key === this.groundKey) return;
    this.groundKey = key;
    if (!this.ground) this.ground = document.createElement('canvas');
    this.ground.width = this.canvas.width;
    this.ground.height = this.canvas.height;
    const ctx = this.ground.getContext('2d');
    ctx.setTransform(this.k, 0, 0, this.k, 0, 0);
    ctx.clearRect(0, 0, BOARD, BOARD);
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        ctx.fillStyle = (x + y) % 2 ? 'rgba(255, 255, 255, .025)' : 'rgba(255, 255, 255, .045)';
        ctx.fillRect(at(x), at(y), CELL, CELL);
        const seed = (x * 7 + y * 13) % 11;
        if (seed < 3) {
          ctx.fillStyle = 'rgba(255, 255, 255, .05)';
          ctx.fillRect(at(x) + 6 + seed * 6, at(y) + 8 + seed * 4, 2, 2);
        }
      }
    }
    ctx.fillStyle = MUTED;
    ctx.font = '700 10px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < SIZE; i++) {
      ctx.fillText(LETTERS[i], at(i + 0.5), EDGE / 2);
      ctx.fillText(String(i + 1), EDGE / 2, at(i + 0.5));
    }
    if (!battle) return;
    const route = battle.route.map(([x, y]) => [at(x), at(y)]);
    for (const [width, color] of [[CELL * 0.86, ROAD_EDGE], [CELL * 0.8, '#1b1830'], [CELL * 0.8, ROAD]]) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(EDGE, EDGE, CELL * SIZE, CELL * SIZE);
      ctx.clip();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      route.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
      ctx.restore();
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, .12)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 7]);
    ctx.beginPath();
    route.slice(1, -1).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  _gate(ctx, battle) {
    const [sx, sy] = battle.path[0], x = at(sx + 0.5), y = at(sy + 0.5);
    glow(ctx, x, y, CELL * 0.75, 'rgba(192, 132, 252, .95)', 0.85);
    orbit(ctx, x, y, CELL * 0.36, 5, this.clock * 2.4, '#e9d5ff', 2);
    orbit(ctx, x, y, CELL * 0.2, 3, -this.clock * 3.1, '#c084fc', 2);
  }

  _aura(ctx, x, y, r, look, seed) {
    const [red, green, blue] = look.color, rgba = (a) => 'rgba(' + red + ', ' + green + ', ' + blue + ', ' + a + ')';
    const breath = 0.75 + 0.25 * Math.sin(this.clock * 2.2 + seed);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const disc = softCircle(discs, look.color.join(), 256, (g, half) => {
      const fill = g.createRadialGradient(half, half, 0, half, half, half);
      fill.addColorStop(0, rgba(0.16));
      fill.addColorStop(0.55, rgba(0.05));
      fill.addColorStop(0.86, rgba(0.1));
      fill.addColorStop(0.97, rgba(0.32));
      fill.addColorStop(1, rgba(0));
      g.fillStyle = fill;
      g.fillRect(0, 0, half * 2, half * 2);
    });
    ctx.globalAlpha = breath;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(disc, x - r, y - r, r * 2, r * 2);
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1;
    for (let i = 0; i < look.waves; i++) {
      const phase = ((this.clock + seed) / look.period + i / look.waves) % 1;
      ctx.strokeStyle = rgba(0.45 * (1 - phase));
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, r * (0.25 + 0.75 * phase), 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let i = 0; i < look.particles; i++) {
      const a = this.clock * look.spin + seed + i * Math.PI * 2 / look.particles;
      const twinkle = 0.45 + 0.55 * Math.abs(Math.sin(this.clock * 3 + i * 1.7 + seed));
      let d = r * (0.62 + 0.3 * ((i * 37) % 10) / 10), px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
      if (look.rise) {
        const lift = ((this.clock * 0.45 + i / look.particles + seed) % 1);
        d = r * 0.75 * Math.sqrt((i * 53 % 97) / 97);
        px = x + Math.cos(i * 2.4 + seed) * d;
        py = y + Math.sin(i * 2.4 + seed) * d - lift * 14;
        ctx.globalAlpha = twinkle * (1 - lift);
      } else ctx.globalAlpha = twinkle;
      if (look.runes) {
        ctx.fillStyle = look.spark;
        const k = (i * 7) % 4;
        ctx.fillRect(Math.round(px) - 1, Math.round(py) - 2, 1 + (k & 1), 4);
        ctx.fillRect(Math.round(px) - 2, Math.round(py) - (k > 1 ? 1 : -1), 4, 1);
      } else orbit(ctx, px, py, 0, 1, 0, look.spark, look.cross ? 1 : 2, look.cross);
    }
    ctx.restore();
  }

  _auras(ctx, battle) {
    this._gate(ctx, battle);
    for (const t of battle.towers) {
      if (t.rider) continue;
      const x = at(t.cx), y = at(t.cy), p = t.p, seed = (t.x * 7 + t.y * 3) % 10;
      if (p.chillRange) this._aura(ctx, x, y, p.chillRange * CELL, AURAS.chill, seed);
      if (p.haste) this._aura(ctx, x, y, p.aura * CELL, AURAS.haste, seed);
      if (p.wisdom) this._aura(ctx, x, y, p.aura * CELL, AURAS.wisdom, seed);
      if (p.grace || p.blessing) this._aura(ctx, x, y, p.aura * CELL, AURAS.blessing, seed);
    }
  }

  _ranges(ctx, battle, ranges) {
    for (const t of battle.towers) {
      if (t.rider || !ranges.has(t.player.login)) continue;
      const x = at(t.cx), y = at(t.cy), r = t.range * CELL;
      ctx.fillStyle = 'rgba(255, 255, 255, .05)';
      ctx.strokeStyle = 'rgba(255, 255, 255, .75)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
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
      const x = at(c.x), y = at(c.y), pile = c.pile;
      if (c.t < CORPSE.fall) {
        for (const g of pile.grains) {
          const k = Math.max(0, Math.min(1, (c.t - g.delay) / (CORPSE.fall - g.delay)));
          const fall = k * k, sy = g.sy - c.lift;
          const gx = g.sx + (g.tx - g.sx) * fall, gy = sy + (g.ty - sy) * fall;
          ctx.fillStyle = g.color;
          ctx.fillRect(Math.round(x + (gx - 0.5) * ZOOM), Math.round(y + (gy - 0.5) * ZOOM), ZOOM, ZOOM);
        }
        continue;
      }
      const fading = c.t - CORPSE.fall - CORPSE.lie;
      ctx.globalAlpha = fading > 0 ? Math.max(0, 1 - fading / CORPSE.fade) : 1;
      ctx.drawImage(pile.canvas, Math.round(x + pile.left * ZOOM), Math.round(y + pile.top * ZOOM),
        pile.canvas.width * ZOOM, pile.canvas.height * ZOOM);
      ctx.globalAlpha = 1;
    }
    this.corpses = next;
  }

  _point(battle, d) {
    const i = Math.max(0, Math.min(battle.length - 1, Math.floor(d))), f = Math.max(0, Math.min(1, d - i));
    const a = battle.route[i], b = battle.route[i + 1];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  }

  _puddles(ctx, battle) {
    const now = battle.time;
    for (const puddle of battle.puddles) {
      const grow = Math.min(1, (now - puddle.born) / 0.25), fade = Math.min(1, (puddle.until - now) / 0.8);
      const x = at(puddle.x), y = at(puddle.y), r = puddle.radius * CELL;
      const seed = Math.round(puddle.x * 7 + puddle.y * 13) % 9, shape = puddleShape(r / ZOOM, seed);
      const w = shape.width * ZOOM * grow, h = shape.height * ZOOM * grow;
      ctx.globalAlpha = 0.9 * fade;
      ctx.drawImage(shape, Math.round(x - w / 2), Math.round(y - h / 2), Math.round(w), Math.round(h));
      for (let i = 0; i < 4; i++) {
        const phase = (this.clock * 0.7 + i * 0.29 + puddle.x * 0.37) % 1, a = i * 1.9 + puddle.y * 3;
        const bx = x + Math.cos(a) * r * 0.45, by = y + Math.sin(a) * r * 0.35, size = 1 + Math.round(phase * 3);
        ctx.globalAlpha = fade * (phase < 0.85 ? 0.9 : 0.3);
        ctx.strokeStyle = '#bef264';
        ctx.lineWidth = 1;
        ctx.strokeRect(Math.round(bx - size), Math.round(by - size), size * 2, size * 2);
        if (phase > 0.85) square(ctx, bx, by - 4 - (phase - 0.85) * 30, 2, '#d9f99d');
      }
      for (let i = 0; i < 3; i++) {
        const rise = (this.clock * 0.35 + i / 3 + puddle.y * 0.21) % 1;
        ctx.globalAlpha = fade * 0.35 * (1 - rise);
        square(ctx, x + Math.sin(i * 2.3 + this.clock) * r * 0.3, y - rise * 18, 3, '#a3e635');
      }
      ctx.globalAlpha = 1;
    }
  }

  _traps(ctx, battle) {
    for (const trap of battle.traps) sprite(ctx, trapSprite(false), at(trap.x), at(trap.y), 0, 1.6);
  }

  _whirls(ctx, battle) {
    for (const whirl of battle.whirls) {
      const [wx, wy] = this._point(battle, whirl.d), x = at(wx), y = at(wy);
      const fade = Math.min(1, (whirl.until - battle.time) / 0.2);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 14; i++) {
        const a = this.clock * 9 + i * 0.9, r = 3 + (i % 5) * 2.6;
        ctx.globalAlpha = fade * (0.9 - (i % 5) * 0.12);
        square(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.6 - (i % 5) * 2, 2, i % 3 ? '#99f6e4' : '#f0fdfa');
      }
      ctx.restore();
    }
  }

  _muses(ctx, battle) {
    for (const t of battle.towers) {
      for (const ally of t.muses) this._muse(ctx, battle, t, ally);
    }
  }

  _muse(ctx, battle, t, ally) {
    if (!battle.towers.includes(ally)) return;
    const x1 = at(t.cx), y1 = at(t.cy), x2 = at(ally.cx), y2 = at(ally.cy);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.35 + 0.15 * Math.sin(this.clock * 4);
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2;
    ctx.setLineDash([2, 4]);
    ctx.lineDashOffset = -this.clock * 12;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    glow(ctx, x2, y2, 18, 'rgba(253, 224, 71, .9)', 0.35 + 0.1 * Math.sin(this.clock * 5));
    orbit(ctx, x2, y2 - 2, 13, 3, -this.clock * 2, '#fef08a', 2);
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
      const a = battle.route[Math.max(0, wall.d - 1)], b = battle.route[Math.min(battle.length, wall.d + 1)];
      const turn = Math.atan2(b[0] - a[0], -(b[1] - a[1])), share = Math.max(0, wall.hp / wall.max);
      const angle = Math.round(turn / (Math.PI / 2)) * (Math.PI / 2);
      const image = wallSprite(share > 0.66 ? 0 : share > 0.33 ? 1 : 2), x = at(wall.x), y = at(wall.y);
      ctx.fillStyle = 'rgba(0, 0, 0, .35)';
      ctx.beginPath();
      ctx.ellipse(x, y + 6, 17, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = rise;
      sprite(ctx, image, x, y + (1 - rise) * 10, angle);
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
      if (still && mob.d < battle.length) {
        const i = Math.min(battle.length - 1, Math.floor(mob.d)), a = battle.route[i], b = battle.route[i + 1];
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
      const image = mobSprite(mob.look, held ? 0 : frame), size = image.width * ZOOM;
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
      if (mob.power && (mob.power.id === 'mend' || mob.power.id === 'fury')) {
        ctx.strokeStyle = mob.power.id === 'mend' ? 'rgba(74, 222, 128, .35)' : 'rgba(249, 115, 22, .4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, mob.power.range * CELL, 0, Math.PI * 2);
        ctx.stroke();
      }
      const buried = mob.underUntil > now || Boolean(mob.power) && mob.power.id === 'tunnel' && mob.powerUntil <= now;
      if (buried) {
        this._mound(ctx, x, y, size, mob);
        spot.screenX = x;
        spot.top = top;
        spot.size = size;
        continue;
      }
      const veil = mob.power && mob.power.id === 'veil' && mob.powerUntil > now;
      if (veil) ctx.globalAlpha = 0.28 + 0.12 * Math.sin(this.clock * 12 + mob.id);
      else if (mob.phase) ctx.globalAlpha = mob.phaseUntil > now ? 0.3 : 0.8;
      if (mob.wild || mob.power && mob.power.steady && mob.powerUntil > now) {
        glow(ctx, x, y - lift, size * 0.9, 'rgba(239, 68, 68, .95)', 0.55);
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
      if (frozen) {
        ctx.fillStyle = 'rgba(160, 235, 255, .32)';
        ctx.strokeStyle = 'rgba(224, 251, 255, .9)';
        ctx.lineWidth = 1.5;
        roundRect(ctx, x - size * 0.5, y - lift - size * 0.5, size, size, 4);
        ctx.fill();
        ctx.stroke();
        square(ctx, x - size * 0.3, y - lift - size * 0.3, 2, '#ffffff');
        square(ctx, x - size * 0.2, y - lift - size * 0.36, 2, '#ffffff');
      } else if (held) orbit(ctx, x, top - 2, 6, 3, this.clock * 6, '#ffe14d', 2);
      if (mob.power && mob.power.id === 'shield' && mob.powerUntil > now) {
        ctx.strokeStyle = 'rgba(103, 232, 249, .9)';
        ctx.fillStyle = 'rgba(103, 232, 249, .18)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y - lift, size * 0.62, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      if (mob.ward > 0) {
        ctx.strokeStyle = 'rgba(74, 222, 128, .85)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y - lift, size * 0.58, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (mob.stolen > 0) {
        const bag = Math.min(4, 2 + Math.floor(mob.stolen / 10));
        square(ctx, x + size * 0.32, top + 2, bag + 1, '#8f6b3a');
        square(ctx, x + size * 0.32, top + 1, bag, '#facc15');
      }
      if (mob.markUntil > now) {
        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = 1;
        ctx.strokeRect(Math.round(x - size * 0.4), Math.round(y - lift - size * 0.4), Math.round(size * 0.8),
          Math.round(size * 0.8));
      }
      spot.screenX = x;
      spot.top = top;
      spot.size = size;
    }
    for (const id of Array.from(this.shown.keys())) if (!alive.has(id)) this.shown.delete(id);
  }

  _mound(ctx, x, y, size, mob) {
    const w = size * 0.42;
    ctx.fillStyle = '#4a3322';
    ctx.beginPath();
    ctx.ellipse(x, y + 2, w, w * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a5235';
    ctx.beginPath();
    ctx.ellipse(x, y, w * 0.8, w * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 3; i++) {
      const a = this.clock * 3 + i * 2.1 + mob.id;
      square(ctx, x + Math.cos(a) * w * 0.7, y - 2 + Math.sin(a * 1.3) * 3, 2, '#a07850');
    }
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
    if (mob.poison) layers.push(['poison', 0.34 + 0.1 * Math.sin(this.clock * 5 + mob.id)]);
    if (mob.burn) layers.push(['burn', 0.3 + 0.12 * Math.sin(this.clock * 17 + mob.id)]);
    if (slowed) layers.push(['chill', frozen ? 0.5 : 0.26]);
    if (mob.fury && !mob.kind) layers.push(['fury', 0.22]);
    for (const [kind, strength] of layers) {
      ctx.globalAlpha = strength;
      sprite(ctx, tintSprite(image, TINTS[kind]), x, y, angle);
    }
    ctx.globalAlpha = 1;
    if (mob.poison) {
      const rise = (this.clock * 10 + mob.id * 3) % 9;
      square(ctx, x + 4, y - rise, 2, '#9be22d');
      square(ctx, x - 4, y - ((rise + 4) % 9), 2, '#c7f36b');
      square(ctx, x + 1, y - ((rise + 7) % 9) - 2, 1, '#e3ff9e');
    }
    if (mob.burn) {
      for (let i = 0; i < 4; i++) {
        const rise = (this.clock * 14 + i * 2.7 + mob.id) % 10, side = Math.sin(i * 2.1 + mob.id) * 6;
        square(ctx, x + side, y - 2 - rise, rise < 4 ? 3 : 2, rise < 3 ? '#ffd84a' : rise < 7 ? '#ff7a1f' : '#b8320f');
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
      pose.x = spot.x;
      pose.y = spot.y;
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
      if (t.burstUntil > now || t.rallyUntil > now) glow(ctx, x, y, 20, t.cls.color, 0.45);
      ctx.globalAlpha = t.busy > now ? 0.5 : 1;
      const lift = pose.kick > 0 ? Math.round(pose.kick / KICK * 2) : 0;
      sprite(ctx, heroSprite(t.cls.id), x, y, pose.angle, ZOOM, lift, HERO_TURN_STEPS);
      if (pose.flash > 0 && !t.rider) {
        const a = pose.angle, d = HERO_SIZE * ZOOM / 2 + 1;
        const fx = x + Math.sin(a) * d, fy = y - Math.cos(a) * d;
        glow(ctx, fx, fy, 7, 'rgba(255, 236, 160, .95)', 0.9);
        square(ctx, fx, fy, 3, '#ffffff');
      }
      ctx.globalAlpha = 1;
      if (t.webUntil > now) this._webOn(ctx, x, y);
      if (t.stunUntil > now) orbit(ctx, x, y - 14, 7, 3, this.clock * 6, '#ffe14d', 2);
      else if (t.napUntil > now) {
        ctx.fillStyle = '#c4b5fd';
        ctx.font = '900 9px "Segoe UI", system-ui, sans-serif';
        ctx.fillText('z', x + 9, y - 10 - (this.clock * 6 % 4));
      }
      this._stamp(ctx, this._badge(t), x - BADGE_HALF, y + 8);
      if (t.player.pendingMove) this._pending(ctx, t, x, y);
    }
  }

  _pending(ctx, t, x, y) {
    const cell = t.player.pendingMove, tx = at(cell.x + 0.5), ty = at(cell.y + 0.5);
    ctx.save();
    ctx.globalAlpha = 0.65 + 0.25 * Math.sin(this.clock * 5);
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.lineDashOffset = -this.clock * 10;
    ctx.strokeRect(at(cell.x) + 2, at(cell.y) + 2, CELL - 4, CELL - 4);
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
    const level = String(t.level), gem = t.player.weapon ? rarityOf(t.player.weapon.rarity).color : '';
    return this._label('lv:' + level + ':' + t.cls.color + ':' + gem, BADGE_HALF * 2 + 12, 12, (g) => {
      g.font = '800 8.5px "Segoe UI", system-ui, sans-serif';
      const w = Math.max(11, g.measureText(level).width + 5), x = BADGE_HALF;
      g.fillStyle = t.cls.color;
      roundRect(g, x - w / 2, 1, w, 10, 4);
      g.fill();
      g.fillStyle = DARK;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(level, x, 6.3);
      if (!gem) return;
      g.fillStyle = gem;
      g.strokeStyle = DARK;
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(x + w / 2 + 5, 1);
      g.lineTo(x + w / 2 + 9, 6);
      g.lineTo(x + w / 2 + 5, 11);
      g.lineTo(x + w / 2 + 1, 6);
      g.closePath();
      g.fill();
      g.stroke();
    });
  }

  _names(ctx, battle, names, highlight) {
    const named = (t) => names !== true && names.has(t.player.login);
    const first = (t) => (highlight && highlight.has(t.player.login) ? 0 : named(t) ? 1 : 2);
    const taken = [];
    for (const t of battle.towers.slice().sort((a, b) => first(a) - first(b))) {
      const pose = this._pose(t), image = this._nameLabel(t), w = image.width / this.k;
      const riding = t.rider && t.host && !t.host.dead;
      const x = at(pose.x) - w / 2, y = at(pose.y) + (riding ? 31 : -23);
      const box = [x - 1, y - 7, x + w + 1, y + 7];
      if (taken.some((o) => box[0] < o[2] && o[0] < box[2] && box[1] < o[3] && o[1] < box[3])) continue;
      taken.push(box);
      this._stamp(ctx, image, x, y - 6.5);
    }
  }

  _nameLabel(t) {
    const text = t.player.name.length > 12 ? t.player.name.slice(0, 11) + '…' : t.player.name;
    const coins = String(Math.floor(t.player.coins || 0)), font = '700 9.5px "Segoe UI", system-ui, sans-serif';
    const key = 'name:' + text + ':' + coins;
    if (!this.labels.has(key)) this.ctx.font = font;
    const nameWidth = this.labels.has(key) ? 0 : this.ctx.measureText(text).width;
    const coinWidth = this.labels.has(key) ? 0 : this.ctx.measureText(coins).width;
    return this._label(key, nameWidth + coinWidth + 22, 13, (g) => {
      g.font = font;
      g.textAlign = 'left';
      g.textBaseline = 'middle';
      g.fillStyle = 'rgba(16, 14, 31, .88)';
      roundRect(g, 0, 0, nameWidth + coinWidth + 22, 13, 6);
      g.fill();
      g.fillStyle = INK;
      g.fillText(text, 4, 7);
      g.drawImage(coinSprite(), Math.round(8 + nameWidth), 3, 7, 7);
      g.fillStyle = '#ffd86b';
      g.fillText(coins, 17 + nameWidth, 7);
    });
  }

  _mobTops(ctx, battle) {
    for (const mob of battle.mobs) {
      const spot = this.shown.get(mob.id);
      if (mob.dead || !mob.kind || !spot || spot.top === undefined) continue;
      const x = spot.screenX, top = spot.top, w = Math.max(16, spot.size * 0.9), share = Math.max(0, mob.hp / mob.max);
      ctx.fillStyle = '#15111d';
      ctx.fillRect(Math.round(x - w / 2) - 1, Math.round(top) - 1, Math.round(w) + 2, 5);
      ctx.fillStyle = share > 0.6 ? '#4ade80' : share > 0.3 ? '#facc15' : '#f87171';
      ctx.fillRect(Math.round(x - w / 2), Math.round(top), Math.round(w * share), 3);
      const name = mob.kind.name, font = '800 9px "Segoe UI", system-ui, sans-serif';
      if (!this.labels.has('mob:' + name)) this.ctx.font = font;
      const width = this.labels.has('mob:' + name) ? 0 : this.ctx.measureText(name).width + 8;
      const image = this._label('mob:' + name, width, 14, (g) => {
        g.font = font;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.lineWidth = 3;
        g.strokeStyle = 'rgba(0, 0, 0, .85)';
        g.strokeText(name, width / 2, 7);
        g.fillStyle = mob.kind.glow;
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
    this.corpses.push({ t: 0, x: spot.x, y: spot.y, pile: pileOf(spot.image, spot.angle), lift: spot.lift / ZOOM });
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
      const bolt = BOLTS[t.cls.id] || { look: 'dot', color: t.cls.color, size: 2 };
      add({ kind: 'shot', life: TRAVEL * (bolt.look === 'lob' ? 2.5 : 1), x1: t.cx, y1: t.cy, x2: event.x, y2: event.y,
        bolt, crit: event.crit });
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
      add({ kind: 'boom', life: 0.35, x: event.x, y: event.y, r: event.radius, ring: '#ff6a1f' });
      this._sparks(event.x, event.y, ['#ffd84a', '#ff8a1f', '#ff4d1f'], 9, event.radius * 4.5, 0.4, 3);
    } else if (event.kind === 'flame') {
      const pose = this._pose(t);
      pose.aim = Math.atan2(event.x - t.cx, -(event.y - t.cy));
      pose.flame = { until: this.clock + FLAME_HOLD, angle: event.angle, flash: event.flash ? this.clock + 0.15 : 0 };
    } else if (event.kind === 'storm') {
      add({ kind: 'storm', life: 0.3, x: event.x, y: event.y });
      this._sparks(event.x, event.y, ['#bfdbfe', '#ffffff', '#60a5fa'], 8, 3, 0.35);
    } else if (event.kind === 'kill') {
      this._corpse(event.mob);
      const spot = this.shown.get(event.mob.id) || event.mob;
      this._sparks(spot.x, spot.y, ['#7a1f1f', '#3b2f2f'], event.mob.kind ? 8 : 3, 1.4, 0.35, 2);
    } else if (event.kind === 'hold') {
      const ice = event.by === 'frost';
      this._sparks(event.mob.x, event.mob.y, ice ? ['#e0fbff', '#67e8f9'] : ['#ffe14d', '#ffffff'], 6, 1.8, 0.35);
    } else if (event.kind === 'tornado') {
      add({ kind: 'ring', life: 0.5, x: t.cx, y: t.cy, r: t.range, color: '#5eead4', width: 3 });
    } else if (event.kind === 'rally') {
      add({ kind: 'ring', life: 0.6, x: t.cx, y: t.cy, r: t.p.aura, color: '#ec4899', width: 2 });
    } else if (event.kind === 'dig' || event.kind === 'drop' || event.kind === 'swallow') {
      const spot = this.shown.get(event.mob.id) || event.mob;
      add({ kind: 'puff', life: 0.5, x: spot.x, y: spot.y });
      this._sparks(spot.x, spot.y, ['#7a5235', '#a07850', '#4a3322'], event.kind === 'swallow' ? 14 : 6, 1.6, 0.4, 2);
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
      this._pose(t).leap = { x: event.x, y: event.y, until: t.leapUntil, time: t.p.leap };
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
        mine: event.mine });
    } else if (event.kind === 'immune') {
      const spot = this.shown.get(event.mob.id) || event.mob;
      add({ kind: 'ring', life: 0.35, x: spot.x, y: spot.y, r: 0.55, color: 'rgba(226, 232, 240, .8)', width: 1.5 });
    } else if (event.kind === 'flask') {
      this._aim(t, event.x, event.y);
      add({ kind: 'lob', life: event.time, x1: t.cx, y1: t.cy, x2: event.x, y2: event.y });
    } else if (event.kind === 'splash') {
      this._sparks(event.x, event.y, ['#d9f99d', '#84cc16', '#3f6212'], 8, 2, 0.35, 2);
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
    } else if (event.kind === 'muse') {
      this._aim(t, event.ally.cx, event.ally.cy);
      this._sparks(event.ally.cx, event.ally.cy, ['#fde047', '#fff3b0', '#e9d5ff'], 8, 1.6, 0.6, 2);
    } else if (event.kind === 'spikes') {
      this._aim(t, event.x, event.y);
      add({ kind: 'spikes', life: 0.4, x: event.x, y: event.y, r: event.radius });
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
      add({ kind: 'nuke', life: 1.8, x: event.x, y: event.y });
      this._sparks(event.x, event.y, ['#ffffff', '#fff3b0', '#ffd84a', '#ff8a1f'], 40, 9, 0.9, 3);
    } else if (event.kind === 'leak' || event.kind === 'shield' || event.kind === 'heal') {
      const [bx, by] = this.battle.path[this.battle.path.length - 1];
      if (event.kind !== 'heal') {
        const spot = this.shown.get(event.mob.id) || event.mob;
        add({ kind: 'puff', life: 0.5, x: spot.x, y: spot.y });
      }
      if (event.kind === 'leak') this._hurtAt = this.clock;
      if (event.kind === 'heal') {
        add({ kind: 'text', life: 1.4, x: bx + 0.5, y: by - 0.2, text: '+' + event.amount + ' ♥', color: '#4ade80' });
        for (const healer of this.battle.towers.filter((tw) => tw.p.heal)) {
          this._sparks(healer.cx, healer.cy, ['#86efac', '#ffffff'], 6, 1.4, 0.7);
        }
      } else {
        add({ kind: 'ring', life: 0.5, x: bx + 0.5, y: by + 0.5, r: 1.1,
          color: event.kind === 'leak' ? '#ef4444' : '#7dd3fc', width: 2 });
      }
    }
  }

  _flames(ctx, battle) {
    for (const t of battle.towers) {
      const pose = this.poses.get(t), flame = pose && pose.flame;
      if (!flame || flame.until <= this.clock) continue;
      const fade = Math.min(1, (flame.until - this.clock) / 0.12), spread = t.p.cone || 0.4;
      const nozzle = HERO_SIZE * ZOOM / 2, ox = at(t.cx) + Math.cos(flame.angle) * nozzle;
      const oy = at(t.cy) + Math.sin(flame.angle) * nozzle, reach = t.range * CELL - nozzle;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, ox + Math.cos(flame.angle) * reach * 0.35, oy + Math.sin(flame.angle) * reach * 0.35, reach * 0.55,
        'rgba(255, 140, 40, .9)', 0.35 * fade);
      const hot = flame.flash > this.clock;
      for (let i = 0; i < FLAME_BITS; i++) {
        const travel = (this.clock * 2.6 + noise(i, t.x * 31 + t.y)) % 1;
        const a = flame.angle + (noise(i + 50, t.x + t.y * 17) * 2 - 1) * spread * (0.2 + 0.8 * travel);
        const d = travel * reach, px = ox + Math.cos(a) * d, py = oy + Math.sin(a) * d - travel * travel * 6;
        const tone = FLAME[Math.min(FLAME.length - 1, Math.floor(travel * FLAME.length))];
        ctx.globalAlpha = fade * (1 - travel * 0.7);
        square(ctx, px, py, 2 + Math.round(travel * 3), hot && travel < 0.6 ? '#ffffff' : tone);
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
          ctx.strokeStyle = b.color;
          ctx.lineWidth = b.width * (e.crit ? 1.5 : 1);
          ctx.globalAlpha = 0.9;
          ctx.beginPath();
          ctx.moveTo(at(e.x1), at(e.y1));
          ctx.lineTo(at(e.x2), at(e.y2));
          ctx.stroke();
          ctx.globalAlpha = 1;
        } else if (b.look === 'holy') {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.85 * fade;
          ctx.strokeStyle = b.color;
          ctx.lineWidth = b.width;
          ctx.beginPath();
          ctx.moveTo(at(e.x1), at(e.y1));
          ctx.lineTo(at(e.x2), at(e.y2));
          ctx.stroke();
          ctx.restore();
          glow(ctx, at(e.x2), at(e.y2), 8, 'rgba(253, 230, 138, .9)', 0.7 * fade);
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
        sprite(ctx, flaskSprite(), x, y, share * Math.PI * 3, 1.6);
      } else if (e.kind === 'snapped') {
        ctx.globalAlpha = Math.min(1, fade * 2);
        sprite(ctx, trapSprite(true), at(e.x), at(e.y), 0, 1.6);
        ctx.globalAlpha = 1;
      } else if (e.kind === 'spikes') {
        const rise = Math.sin(Math.min(1, share * 2.5) * Math.PI / 2) * (1 - Math.max(0, share - 0.6) / 0.4);
        for (let i = 0; i < 6; i++) {
          const a = i * 1.05 + e.x, d = e.r * CELL * (i % 2 ? 0.6 : 0.25);
          const x = at(e.x) + Math.cos(a) * d, y = at(e.y) + Math.sin(a) * d * 0.7, h = (6 + (i % 3) * 2) * rise;
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
      } else if (e.kind === 'toss') {
        const spot = e.mob.dead ? null : this.shown.get(e.mob.id);
        if (spot) {
          e.x2 = spot.x;
          e.y2 = spot.y;
        }
        const x = at(e.x1 + (e.x2 - e.x1) * share);
        const y = at(e.y1 + (e.y2 - e.y1) * share) - Math.sin(share * Math.PI) * 26;
        sprite(ctx, mineSprite(e.mine, true), x, y, share * Math.PI * 4, 1.6);
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
        ctx.strokeStyle = share < 0.5 ? '#ffd84a' : e.ring;
        ctx.lineWidth = 3 * fade + 1;
        ctx.beginPath();
        ctx.arc(at(e.x), at(e.y), r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (e.kind === 'nuke') {
        const x = at(e.x), y = at(e.y);
        ctx.globalAlpha = Math.pow(fade, 2.5) * 0.85;
        ctx.fillStyle = share < 0.12 ? '#ffffff' : '#ffe9b0';
        ctx.fillRect(EDGE, EDGE, CELL * SIZE, CELL * SIZE);
        ctx.globalAlpha = 1;
        glow(ctx, x, y, CELL * (2 + 3 * share), 'rgba(255, 170, 60, .95)', fade);
        ctx.strokeStyle = '#ffd84a';
        ctx.lineWidth = 6 * fade + 1;
        ctx.globalAlpha = fade;
        ctx.beginPath();
        ctx.arc(x, y, BOARD * 1.3 * Math.sqrt(share), 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
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
      } else if (e.kind === 'ring') {
        ctx.globalAlpha = fade;
        ctx.strokeStyle = e.color;
        ctx.lineWidth = e.width || 2;
        ctx.beginPath();
        ctx.arc(at(e.x), at(e.y), Math.max(1, e.r * CELL * share), 0, Math.PI * 2);
        ctx.stroke();
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
