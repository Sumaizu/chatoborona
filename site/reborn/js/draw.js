import { LETTERS, SIZE } from './field.js';
import { CELL, EDGE, MOUTH, mouthPath, mouthsOf, paintGround, paintPeaks, paintRoadMask, paintRoof } from './terrain.js';
import { FIRE, HOLY, MANTRAS, MECH, SPELL, STORM, WOLF, WOOD, flightAt, hammerAt, heavyGun, roadCurve } from './battle.js';
import { FIREBALL_FRAMES, PHOENIX_FRAMES, bubbleSprite, bulletSprite, clodSprite,
  coinSprite, fireballSprite, heartSprite, gooColor, heroSprite, hookSprite, linkSprite, meltSprite,
  meteorSprite, grenadeSprite, droneSprite, birdSprite, hawkSprite, snareSprite, trapSprite, cauldronSprite, mobSprite, moundSprite, nukeSprite, phoenixSprite, pixelsOf,
  rocketSprite, shellSprite, splitSprite, starSprite, tintSprite, ventSprite, wallSprite } from './sprites.js';
import { BREWS, SOILS, drawRootWall } from './props.js';
import { ANGEL_BODY, FINE_HEROES, HERO, MUZZLES, RELOAD_FRAMES, sizeOf } from './models.js';
import { gearColor } from './gacha.js';

export const BOARD = EDGE * 2 + CELL * SIZE;
const FIELD = 640;

const ZOOM = 2;
const SMOOTH = 28;
const TURN = 14;
const TURN_EASE = 30;
const TURN_MIN = 2;
const AIM_SLACK = Math.PI / 8;
const SHOT_HOLD = 0.15;
const SHOT_WAIT = 0.5;
const SHOT_QUEUE = 4;
const FLIGHT_MIN = 0.05;
const COG = ['.#.#.', '#####', '##.##', '#####', '.#.#.'];
const SHELL = ['oo', '##', '##', '##', '##'];
const LEAF = ['.#', '##', '#o', 'o.'];
const AURAS = { team: { glow: 'rgba(100, 116, 139, 1)', tones: ['#64748b', '#475569', '#7c8a9e'], shape: COG },
  tuning: { glow: 'rgba(250, 204, 21, 1)', tones: ['#facc15', '#eab308', '#d4a017'], shape: SHELL, tip: '#b45309' },
  grace: { glow: 'rgba(132, 204, 22, 1)', tones: ['#84cc16', '#65a30d', '#a3e635'], shape: LEAF, tip: '#3f6212' } };
const RETICLES = { red: { line: '#b91c1c', dot: '#fca5a5' }, green: { line: '#16a34a', eye: true } };
const BLAST_TONES = { warm: ['#fff3b0', '#ffd84a', '#ff9a1f', '#e2531f', '#6b5a50'],
  blue: ['#f0f9ff', '#bae6fd', '#4aa3ff', '#2563eb', '#4b5563'],
  earth: ['#fef3c7', '#e7c9a0', '#b08356', '#7c5a3a', '#4a3426'] };
const DRONE_LIFT = 18;
const AIRBURST = 22;
const NUKE_ARC = 90;
const SHARD_ARC = 12;
const LEAF_TONES = ['#86efac', '#4ade80', '#bbf7d0'];
const SMOG = ['rgba(122, 140, 98, 1)', 'rgba(150, 160, 120, 1)', 'rgba(96, 112, 80, 1)', 'rgba(132, 150, 90, 1)'];
const ARC = { base: 24, per: 9, max: 110 };
const TURN_STEPS = 8;
const KICK = 0.1;
const FLASH = 0.06;
const TRAVEL = 0.1;
const MODEL_UNIT = 1.08 * HERO.scale;
const [HERO_X, HERO_Y] = HERO.center;
const LASER = { life: 0.45, layers: [[11, 4, 0.55], [8, 3, 0.9], [5, 2, 1], [2.5, 0, 1]] };
const WALK = 7;
const BEAT = 1.1;
const BEAT_FAST = 0.5;
const HEART_ROOM = 19;
const FLAP = 9;
const LIFT = 7;
const RISE = 0.3;
const TRAIL_STEP = 0.2;
const CORPSE = { fall: 0.45, lie: 1, fade: 1.1, max: 60 };
const DECALS_MAX = 300;
const TINTS = { burn: '#ff7a1f', blue: '#4aa3ff', black: '#1c1917',
  chill: '#8ee6ff',
  fury: '#ff4d1f', steam: '#f1f5f9', mud: '#8a5a2b', corrosion: '#a3e635', disease: '#7c3aed',
  epidemic: '#4c1d95' };
const STATE_TINTS = ['steam', 'mud', 'corrosion', 'disease', 'epidemic'];
const MARK_COLORS = { fire: '#ff7a1f', water: '#38bdf8', earth: '#c08a4a', air: '#ccfbf1', lightning: '#facc15',
  poison: '#84cc16' };
const ZONE_LOOKS = { pool: ['#38bdf8', '#e0f2fe', '#7dd3fc'], sand: ['#c9a66b', '#e7cf9b', '#8a6a3a'],
  gas: ['#84cc16', '#d9f99d', '#4d7c0f'],
  lava: ['#ef4444', '#fb923c', '#7f1d1d'] };
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
const CHARGES = {
  heavy: { glow: 'rgba(255, 243, 176, .95)', sparks: ['#ffffff', '#fff3b0'] },
  aim: { glow: 'rgba(255, 90, 90, .95)', sparks: ['#fecaca', '#ef4444'] },
  beam: { glow: 'rgba(255, 138, 31, .95)', sparks: ['#ffd84a', '#ff5a1f'] },
};
const ELEMENT_TONES = { fire: '#ff8a1f', poison: '#a3e635', ice: '#a5f3fc', storm: '#fde047' };
const STORM_GUSTS = 14;
const SNOWFLAKES = 90;
const INK = '#f4f0e8';
const MUTED = 'rgba(166, 162, 189, .85)';
const DARK = '#100e1f';
const STYLE_BOLTS = { hunter: { look: 'bolt', color: '#e7e5e4', width: 3 },
  witch: { look: 'fireball', color: '#84cc16', size: 11, tone: 'toxic' },
  inquisitor: { look: 'fireball', color: '#fde68a', size: 11, tone: 'holy' },
  enchantress: { look: 'fireball', color: '#7dd3fc', size: 11, tone: 'azure' } };
const BOLTS = {
  sniper: { look: 'tracer', color: '#fff3b0', width: 2, bullet: true },
  mechanic: { look: 'tracer', color: '#ffe8a3', width: 1.5, bullet: true },
  forester: { look: 'bolt', color: '#c8a26a', width: 2 },
  earth: { look: 'lob', color: '#9a8f80', size: 4 },
  frost: { look: 'dot', color: '#38bdf8', size: 3 },
  pyro: { look: 'fireball', color: '#ff7a1f', size: 7 },
  shaman: { look: 'dot', color: '#5eead4', size: 3 },
  priest: { look: 'light', color: '#fde68a', size: 3 },
  sorceress: { look: 'wisp', color: '#c4b5fd', size: 3 },
  thunder: { look: 'fireball', color: '#fde047', size: 9, tone: 'storm' },
};
const FLAME = ['#fff3b0', '#ffd84a', '#ff9a1f', '#ff5a1f', '#b8320f'];
const BLUE_FLAME = ['#e0f2ff', '#9bd5ff', '#4aa3ff', '#2563eb', '#1e3a8a'];
const FLAME_TONES = { warm: FLAME, blue: BLUE_FLAME, toxic: ['#f7fee7', '#d9f99d', '#a3e635', '#65a30d', '#3f6212'],
  holy: ['#fffef5', '#fff7cc', '#fde68a', '#facc15', '#d4a017'],
  azure: ['#f0fbff', '#c7f0ff', '#7dd3fc', '#38bdf8', '#0284c7'],
  plague: ['#ede9fe', '#a78bfa', '#6d28d9', '#3b0764', '#1e1033'],
  earth: ['#fef3c7', '#e7c9a0', '#b08356', '#7c5a3a', '#4a3426'],
  storm: ['#ffffff', '#fef9c3', '#fde047', '#facc15', '#ca8a04'] };
const BALL_TONES = { fire: 'warm', poison: 'toxic', holy: 'holy', earth: 'earth', lightning: 'storm' };
const BEAMS = { arcane: ['56, 189, 248', '224, 247, 255'], fire: ['249, 115, 22', '255, 237, 213'],
  poison: ['132, 204, 22', '236, 252, 203'], holy: ['253, 224, 120', '255, 251, 235'],
  earth: ['176, 120, 66', '254, 243, 199'], lightning: ['250, 230, 60', '255, 255, 255'] };
const UNBIND = { edge: 40, inner: 16,
  tones: ['255, 140, 60', '125, 211, 252', '163, 230, 53', '250, 204, 21', '196, 181, 253'] };
const STONES = { count: 5, spread: 3.6, size: 2.2, glow: '232, 170, 90' };
const ROAD_AURA = { zoom: 2, motes: 5, reach: 1.12 };
const SHOCK = { grow: 0.3, tail: 0.18, zoom: 2, bands: [[0.3, 1, 0.12], [0.15, 0.55, 0.2], [0.05, 0.22, 0.5]] };
const ZAP = { glow: '96, 165, 250', mid: '191, 219, 254', core: '255, 255, 255', jag: 0.42, steps: 11 };
const RAIJU_FX = { rgb: '125, 211, 252', core: '240, 249, 255', reach: 1.5, every: 0.9 };
const ROD = { tall: 26, coil: 5, bolts: 7 };
const CLAW = { cut: 0.12, lag: 0.035, thick: 3.2, side: 0.72, layers: 6 };
const GLOBE_FX = { size: 10, grow: 0.15, melt: 0.3, lift: 6, bolts: 4, rate: 16 };
const DASH_FX = { size: 13, inhale: 0.18 };
const STAFF_ZAP = { rate: 14, bolts: 3, long: 11, lit: 0.7 };
const STORM_FX = { strike: 0.25, swipe: 0.25, throw: 0.18, catch: 0.22, spin: 16 };
const BEAM = { core: 2.6, mid: 6, outer: 12, twist: 0.11, spin: 7, coil: 5.5, flare: 11 };
const VENOM = { toxic: 'rgba(132, 204, 22, .9)', plague: 'rgba(91, 33, 182, .9)' };
const GAS = { toxic: ['rgba(201, 246, 120, .8)', 'rgba(101, 163, 13, .45)'],
  plague: ['rgba(180, 160, 255, .75)', 'rgba(46, 16, 101, .5)'] };
const NET = { bend: 0.55 };
const POT_SCALE = 0.95 / 2 * 3;
const STEAM = { toxic: ['rgba(236, 255, 214, .8)', 'rgba(163, 230, 53, .35)'],
  plague: ['rgba(237, 233, 254, .75)', 'rgba(124, 58, 237, .35)'] };
const HAIL = { count: 60, drop: 80, fall: 0.3, slant: 0.3, shaft: '#8b5a2b', head: '#d1d5db', fletch: '#f3f4f6', tip: '#84cc16' };
const BOOM = { heat: 'rgba(255, 200, 80, .9)', core: '#ffd84a' };
const BLACK_FLAME = ['#c084fc', '#7e22ce', '#3b0764', '#1c1917', '#0a0a0a'];
const FIRE_SPARKS = new Set(FLAME.concat(BLUE_FLAME, BLACK_FLAME, ['#ffd84a', '#ff8a1f', '#ff4d1f', '#ff5a1f',
  '#ff9a1f']));
const HEAT = { warm: ['rgba(255, 110, 30, .9)', 'rgba(255, 220, 120, .9)'],
  blue: ['rgba(74, 163, 255, .9)', 'rgba(224, 242, 255, .9)'],
  toxic: ['rgba(132, 204, 22, .9)', 'rgba(217, 249, 157, .9)'],
  plague: ['rgba(91, 33, 182, .9)', 'rgba(196, 181, 253, .9)'],
  holy: ['rgba(250, 204, 21, .9)', 'rgba(255, 251, 230, .95)'],
  azure: ['rgba(56, 189, 248, .9)', 'rgba(224, 247, 255, .95)'],
  earth: ['rgba(176, 120, 66, .9)', 'rgba(254, 243, 199, .9)'],
  storm: ['rgba(250, 204, 21, .9)', 'rgba(255, 255, 240, .95)'] };
const TOTEM_LOOKS = {
  slow: { aura: '244, 114, 182', tint: '150, 96, 48', fill: 0.3, mote: '200, 128, 60', core: '255, 220, 170',
    drift: 0.25, cloth: ['#fbcfe8', '#ec4899', '#9d174d'], shade: '80, 7, 36', deep: '#500724',
    trim: '#fdf2f8', edge: '#fce7f3', feather: ['#fdf2f8', '#f472b6'], gem: ['#fbcfe8', '#be185d'] },
  purge: { aura: '226, 232, 240', tint: '255, 248, 225', fill: 0.26, mote: '255, 250, 228', core: '255, 255, 255',
    drift: 0.5, cloth: ['#ffffff', '#e2e8f0', '#94a3b8'], shade: '30, 41, 59', deep: '#334155',
    trim: '#93c5fd', edge: '#ffffff', feather: ['#ffffff', '#cbd5e1'], gem: ['#e0f2fe', '#0ea5e9'] },
  power: { aura: '220, 38, 38', rim: '248, 113, 113', trail: '#fca5a5', cloth: ['#f87171', '#dc2626', '#7f1d1d'], shade: '50, 4, 4', deep: '#450a0a',
    trim: '#fbbf24', edge: '#fca5a5', feather: ['#fca5a5', '#991b1b'], gem: ['#fecaca', '#b91c1c'] } };
const SPELLS = { wave: 7, chord: '94, 234, 212', shock: '251, 191, 36', lute: 'rgba(45, 212, 191, 1)',
  wisp: 'rgba(196, 181, 253, 1)', chevron: 9, act: 0.32, strum: 0.3, beat: 0.28, play: 5,
  songs: { siren: 'rgba(244, 114, 182, 1)', dirge: 'rgba(185, 28, 28, 1)' },
  notes: { siren: '#f9a8d4', dirge: '#dc2626', anthem: '#fde68a' } };
const HOLY_LIGHT = { core: 'rgba(255, 251, 230, 1)', warm: 'rgba(253, 224, 120, 1)', ray: 'rgba(255, 244, 200, ',
  motes: 5, wave: 4 };
const HOVER = { lift: 4, bob: 1.5, rate: 1.2, frames: [2, 1, 0, 1], shadow: 0.45 };
const MANTRA_LOOKS = { mantraSpeed: '251, 146, 60', mantraPower: '239, 68, 68', mantraRange: '244, 114, 182' };
const STAFF_ROD = { rear: [21.4, 18.6], wide: 1.4, cap: 3.2, reach: 0.4, back: 0.3, lunge: 2.2 };
const HOLY_BLADE = ['#8a6410', '#e0b43a', '#fffbe6', '#f5d77a', '#8a6410'];
const RED_BLADE = ['#7f1d1d', '#dc2626', '#fecaca', '#ef4444', '#7f1d1d'];
const SWORD = { hand: [21, 12.8], blade: 14.6, grip: 3, wide: 2.6, guard: 3.2, ring: 2.3, life: 0.36, wind: 0.25,
  cut: 0.55, back: 0.9, sweep: 1.3, drift: [0.05, 0.04] };
const JUDGEMENT = { life: 1.6, reach: 30, band: 1.4 };
const HOLY_RING = { life: 0.9, band: 0.7 };
const AEGIS_SHOW = 0.6;
const STAFF_HIT = { life: 0.3 };
const FLAME_HOLD = 0.3;
const FLAME_BITS = 34;
const BADGE_HALF = 16;
const OUTLINE = [[-2, 0], [2, 0], [0, -2], [0, 2]];
const SPLIT_LIFE = 0.35;
const SPLIT_APART = 9;
const MELT_LIFE = 0.45;
const GOO_LIFE = 5;
const RESOLUTION_MAX = 2.5;
const HERO_TURN_STEPS = 32;
const LABELS_MAX = 400;
const piles = new WeakMap();
const FLAG = { q: 4, margin: 4, strip: 1 };
const WRAPS = { slow: ['#3f0d24', '#9d4b6e'], purge: ['#1e293b', '#94a3b8'], power: ['#2a0606', '#8b2c2c'] };
const flagCloths = new Map();
const flagSheets = new Map();

function smoothNoise(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const h = (a, b) => noise(a * 57 + b * 131, seed);
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const upper = h(xi, yi) + (h(xi + 1, yi) - h(xi, yi)) * sx;
  const lower = h(xi, yi + 1) + (h(xi + 1, yi + 1) - h(xi, yi + 1)) * sx;
  return upper + (lower - upper) * sy;
}

const FLAG_SHAPES = {
  slow: { w: 13, h: 20, edge: (g) => {
    g.moveTo(0, 0);
    g.lineTo(13, 0);
    g.quadraticCurveTo(13.4, 8, 12.6, 15);
    const tears = [[12.9, 19.4], [11.6, 15.8], [10.6, 18.8], [9.7, 16.4], [8.4, 20.2], [7.1, 15.6], [6.2, 17.9],
      [5.2, 15.4], [4, 19.6], [2.9, 16.2], [1.6, 18.4], [0.6, 15.6]];
    for (const [tx, ty] of tears) g.lineTo(tx, ty);
    g.quadraticCurveTo(-0.4, 8, 0, 0);
  }, holes: [[3.4, 11.6, 0.7, 0.45], [9.8, 13.2, 0.5, 0.8]] },
  purge: { w: 12, h: 21, edge: (g) => {
    g.moveTo(0, 0);
    g.lineTo(12, 0);
    g.bezierCurveTo(12.4, 6, 11.4, 13, 11.8, 21);
    g.quadraticCurveTo(8.2, 16.8, 6, 13.4);
    g.quadraticCurveTo(3.8, 16.8, 0.2, 21);
    g.bezierCurveTo(0.6, 13, -0.4, 6, 0, 0);
  }, holes: [] },
  power: { w: 14, h: 20, edge: (g) => {
    g.moveTo(0, 0);
    g.lineTo(14, 0);
    g.quadraticCurveTo(15.2, 8, 14.2, 14.6);
    g.quadraticCurveTo(14.8, 18, 13.2, 20.2);
    g.quadraticCurveTo(12.6, 16.4, 10.4, 15.2);
    g.quadraticCurveTo(9.4, 18.6, 7.2, 21);
    g.quadraticCurveTo(6.2, 17, 3.8, 15.2);
    g.quadraticCurveTo(2.4, 17.4, 0.8, 20.2);
    g.quadraticCurveTo(-0.8, 17, -0.2, 14.6);
    g.quadraticCurveTo(-1.2, 8, 0, 0);
  }, holes: [[11.2, 6.4, 0.45, 0.6]] },
};

function flagCloth(kind) {
  if (flagCloths.has(kind)) return flagCloths.get(kind);
  const look = TOTEM_LOOKS[kind], shape = FLAG_SHAPES[kind], q = FLAG.q, pad = 2 * q;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(shape.w * q) + pad * 2;
  canvas.height = Math.ceil((shape.h + 1.5) * q);
  canvas.w = shape.w;
  canvas.h = shape.h + 1.5;
  canvas.pad = pad;
  canvas.shade = look.shade;
  const g = canvas.getContext('2d');
  g.setTransform(q, 0, 0, q, pad, 0);
  g.beginPath();
  shape.edge(g);
  g.closePath();
  g.save();
  g.clip();
  const body = g.createLinearGradient(0, 0, 0, shape.h);
  body.addColorStop(0, look.cloth[0]);
  body.addColorStop(0.7, look.cloth[1]);
  body.addColorStop(1, look.cloth[2]);
  g.fillStyle = body;
  g.fillRect(-2, 0, shape.w + 4, shape.h + 2);
  const sleeve = g.createLinearGradient(0, 0, 0, 2.6);
  sleeve.addColorStop(0, 'rgba(' + look.shade + ', .55)');
  sleeve.addColorStop(1, 'rgba(' + look.shade + ', .15)');
  g.fillStyle = sleeve;
  g.fillRect(-2, 0, shape.w + 4, 2.6);
  g.strokeStyle = look.trim;
  g.lineWidth = 0.45;
  g.beginPath();
  g.moveTo(-1, 2.8);
  g.lineTo(shape.w + 1, 2.8);
  g.stroke();
  g.setLineDash([0.6, 0.5]);
  g.strokeStyle = 'rgba(' + look.shade + ', .8)';
  g.lineWidth = 0.22;
  g.stroke();
  g.setLineDash([]);
  EMBLEMS[kind](g, shape.w / 2, shape.h * 0.45);
  g.restore();
  g.save();
  g.globalCompositeOperation = 'destination-out';
  for (const [hx, hy, rx, ry] of shape.holes) {
    g.beginPath();
    g.ellipse(hx, hy, rx, ry, 0.6, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
  const image = g.getImageData(0, 0, canvas.width, canvas.height), data = image.data;
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4;
      if (!data[i + 3]) continue;
      const broad = smoothNoise(x / (2.2 * q), y / (2.2 * q), 3), fine = smoothNoise(x / (0.6 * q), y / (0.6 * q), 5);
      const weave = ((x >> 1) + (y >> 1)) % 2 ? 0.035 : -0.035, wear = y / canvas.height;
      const k = 0.86 + broad * 0.22 + (fine - 0.5) * 0.12 + weave - wear * wear * 0.18;
      for (let c = 0; c < 3; c++) data[i + c] = Math.max(0, Math.min(255, data[i + c] * k));
    }
  }
  g.putImageData(image, 0, 0);
  g.setTransform(q, 0, 0, q, pad, 0);
  g.beginPath();
  shape.edge(g);
  g.closePath();
  g.strokeStyle = look.deep;
  g.lineWidth = 0.4;
  g.stroke();
  if (kind === 'slow') {
    g.strokeStyle = 'rgba(' + look.shade + ', .7)';
    g.lineWidth = 0.16;
    for (const [tx, ty, dx, dy] of [[8.4, 20.2, -0.3, 1.2], [4, 19.6, 0.4, 1.1], [12.9, 19.4, 0.2, 1], [1.6, 18.4, -0.4, 0.9]]) {
      g.beginPath();
      g.moveTo(tx, ty - 0.3);
      g.quadraticCurveTo(tx + dx, ty + dy * 0.5, tx + dx * 0.4, ty + dy);
      g.stroke();
    }
  }
  flagCloths.set(kind, canvas);
  return canvas;
}

function flagSheet(cloth) {
  if (!flagSheets.has(cloth)) {
    const sheet = document.createElement('canvas');
    sheet.width = cloth.width + FLAG.margin * 2 * FLAG.q;
    sheet.height = cloth.height;
    flagSheets.set(cloth, sheet);
  }
  return flagSheets.get(cloth);
}

const EMBLEMS = {
  slow: (g, x, y) => {
    g.lineJoin = 'round';
    const glass = g.createLinearGradient(x - 3, 0, x + 3, 0);
    glass.addColorStop(0, 'rgba(255, 240, 250, .5)');
    glass.addColorStop(0.35, 'rgba(255, 255, 255, .85)');
    glass.addColorStop(1, 'rgba(250, 205, 230, .45)');
    const bulb = () => {
      g.beginPath();
      g.moveTo(x - 2.9, y - 4);
      g.bezierCurveTo(x - 2.9, y - 1.6, x - 0.5, y - 0.9, x - 0.5, y);
      g.bezierCurveTo(x - 0.5, y + 0.9, x - 2.9, y + 1.6, x - 2.9, y + 4);
      g.lineTo(x + 2.9, y + 4);
      g.bezierCurveTo(x + 2.9, y + 1.6, x + 0.5, y + 0.9, x + 0.5, y);
      g.bezierCurveTo(x + 0.5, y - 0.9, x + 2.9, y - 1.6, x + 2.9, y - 4);
      g.closePath();
    };
    bulb();
    g.fillStyle = glass;
    g.fill();
    g.save();
    bulb();
    g.clip();
    const sand = g.createLinearGradient(0, y, 0, y + 4);
    sand.addColorStop(0, '#fde68a');
    sand.addColorStop(1, '#d97706');
    g.fillStyle = sand;
    g.beginPath();
    g.moveTo(x - 3, y + 4);
    g.quadraticCurveTo(x, y + 0.9, x + 3, y + 4);
    g.fill();
    g.beginPath();
    g.moveTo(x - 1.7, y - 2.2);
    g.quadraticCurveTo(x, y - 1.6, x + 1.7, y - 2.2);
    g.lineTo(x + 0.6, y - 0.4);
    g.lineTo(x - 0.6, y - 0.4);
    g.closePath();
    g.fill();
    g.fillRect(x - 0.16, y - 0.6, 0.32, 3);
    g.restore();
    bulb();
    g.strokeStyle = '#500724';
    g.lineWidth = 0.4;
    g.stroke();
    for (const cy of [y - 4.4, y + 4.4]) {
      const cap = g.createLinearGradient(0, cy - 0.6, 0, cy + 0.6);
      cap.addColorStop(0, '#c08a4f');
      cap.addColorStop(1, '#3b2410');
      g.fillStyle = cap;
      g.beginPath();
      g.ellipse(x, cy, 3.7, 0.75, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#5a3718';
    for (const side of [-1, 1]) g.fillRect(x + side * 3.2 - 0.25, y - 4.2, 0.5, 8.4);
  },
  purge: (g, x, y) => {
    g.lineJoin = 'round';
    const shield = (dx) => {
      g.beginPath();
      g.moveTo(x + dx - 3.6, y - 4.2);
      g.lineTo(x + dx + 3.6, y - 4.2);
      g.bezierCurveTo(x + dx + 3.6, y + 0.6, x + dx + 2, y + 3.2, x + dx, y + 4.6);
      g.bezierCurveTo(x + dx - 2, y + 3.2, x + dx - 3.6, y + 0.6, x + dx - 3.6, y - 4.2);
      g.closePath();
    };
    const steel = g.createLinearGradient(x - 3.6, y - 4, x + 3.6, y + 4);
    steel.addColorStop(0, '#94a3b8');
    steel.addColorStop(0.4, '#475569');
    steel.addColorStop(1, '#0f172a');
    for (const [side, dx] of [[-1, -0.45], [1, 0.45]]) {
      g.save();
      g.beginPath();
      if (side < 0) {
        g.moveTo(x - 6, y - 6);
        g.lineTo(x + 0.4, y - 6);
        g.lineTo(x - 0.6, y - 2);
        g.lineTo(x + 0.7, y + 0.6);
        g.lineTo(x - 0.4, y + 6);
        g.lineTo(x - 6, y + 6);
      } else {
        g.moveTo(x + 6, y - 6);
        g.lineTo(x + 0.4, y - 6);
        g.lineTo(x - 0.6, y - 2);
        g.lineTo(x + 0.7, y + 0.6);
        g.lineTo(x - 0.4, y + 6);
        g.lineTo(x + 6, y + 6);
      }
      g.closePath();
      g.translate(dx, side * 0.25);
      g.clip();
      shield(0);
      g.fillStyle = steel;
      g.fill();
      g.strokeStyle = '#e2e8f0';
      g.lineWidth = 0.55;
      g.stroke();
      g.restore();
    }
    g.strokeStyle = '#7dd3fc';
    g.lineWidth = 0.35;
    g.beginPath();
    g.moveTo(x + 0.4, y - 4.6);
    g.lineTo(x - 0.6, y - 2);
    g.lineTo(x + 0.7, y + 0.6);
    g.lineTo(x - 0.4, y + 4.8);
    g.stroke();
    g.fillStyle = 'rgba(224, 242, 254, .9)';
    for (const [sx, sy] of [[-1.6, -1.2], [1.8, 1.8], [-1.2, 2.6]]) {
      g.beginPath();
      g.moveTo(x + sx, y + sy - 0.6);
      g.lineTo(x + sx + 0.25, y + sy);
      g.lineTo(x + sx, y + sy + 0.6);
      g.lineTo(x + sx - 0.25, y + sy);
      g.closePath();
      g.fill();
    }
  },
  power: (g, x, y) => {
    g.lineJoin = 'round';
    const rays = g.createRadialGradient(x, y - 1, 0.5, x, y - 1, 6);
    rays.addColorStop(0, 'rgba(255, 236, 170, .55)');
    rays.addColorStop(1, 'rgba(255, 236, 170, 0)');
    g.fillStyle = rays;
    g.beginPath();
    g.arc(x, y - 1, 6, 0, Math.PI * 2);
    g.fill();
    const blade = g.createLinearGradient(x - 1, 0, x + 1, 0);
    blade.addColorStop(0, '#9ca3af');
    blade.addColorStop(0.48, '#ffffff');
    blade.addColorStop(0.52, '#cbd5e1');
    blade.addColorStop(1, '#4b5563');
    g.fillStyle = blade;
    g.beginPath();
    g.moveTo(x, y - 6);
    g.lineTo(x + 1.05, y - 4.4);
    g.lineTo(x + 0.9, y + 2.2);
    g.lineTo(x - 0.9, y + 2.2);
    g.lineTo(x - 1.05, y - 4.4);
    g.closePath();
    g.fill();
    g.strokeStyle = '#1f2937';
    g.lineWidth = 0.3;
    g.stroke();
    const gold = g.createLinearGradient(0, y + 2, 0, y + 3.2);
    gold.addColorStop(0, '#fde68a');
    gold.addColorStop(1, '#b45309');
    g.fillStyle = gold;
    g.beginPath();
    g.moveTo(x - 3.4, y + 2.1);
    g.quadraticCurveTo(x, y + 1.5, x + 3.4, y + 2.1);
    g.lineTo(x + 3, y + 3.1);
    g.quadraticCurveTo(x, y + 2.7, x - 3, y + 3.1);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = '#3b1d0b';
    g.fillRect(x - 0.55, y + 3.1, 1.1, 2.6);
    g.fillStyle = gold;
    g.beginPath();
    g.arc(x, y + 6.2, 0.85, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  },
};

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

function turnGap(from, to) {
  let delta = to - from;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

function turnToward(from, to, dt) {
  const delta = turnGap(from, to), speed = Math.max(TURN_MIN, Math.min(TURN, Math.abs(delta) * TURN_EASE));
  return from + Math.sign(delta) * Math.min(Math.abs(delta), speed * dt);
}

const arcOf = (x1, y1, x2, y2) => Math.min(ARC.max, ARC.base + Math.hypot(x2 - x1, y2 - y1) * ARC.per);
const aimSpot = (entry) => (entry.mob && !entry.mob.dead ? entry.mob : entry);
const bearing = (t, spot) => Math.atan2(spot.x - t.cx, -(spot.y - t.cy));

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function pixels(ctx, x, y, shape, color, tip = color) {
  const left = Math.round(x - shape[0].length / 2), top = Math.round(y - shape.length / 2);
  shape.forEach((row, dy) => {
    for (let dx = 0; dx < row.length; dx++) {
      if (row[dx] === '.') continue;
      ctx.fillStyle = row[dx] === 'o' ? tip : color;
      ctx.fillRect(left + dx, top + dy, 1, 1);
    }
  });
}

const WALL_HALF = CELL * 0.38;
function wallBand(blaze) {
  const { line, from, size } = blaze, last = from + size - 1;
  const mid = (p, q) => [(p[0] + q[0]) / 2 + 0.5, (p[1] + q[1]) / 2 + 0.5];
  const out = (p, q) => [p[0] + (p[0] - q[0]) / 2 + 0.5, p[1] + (p[1] - q[1]) / 2 + 0.5];
  const start = from > 0 ? mid(line[from - 1], line[from]) : out(line[from], line[from + 1]);
  const end = last < line.length - 1 ? mid(line[last], line[last + 1]) : out(line[last], line[last - 1]);
  const curve = roadCurve(line);
  const nearest = (p) => {
    let best = 0, low = Infinity;
    curve.forEach((q, i) => {
      const d = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2;
      if (d < low) {
        low = d;
        best = i;
      }
    });
    return best;
  };
  const i0 = nearest(start), i1 = nearest(end), part = curve.slice(Math.min(i0, i1), Math.max(i0, i1) + 1);
  const spots = [];
  let s = 0;
  part.forEach((p, i) => {
    const a = part[Math.max(0, i - 1)], b = part[Math.min(part.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    if (i) s += Math.hypot(p[0] - part[i - 1][0], p[1] - part[i - 1][1]) * CELL;
    spots.push({ x: at(p[0]), y: at(p[1]), nx: -dy / len, ny: dx / len, s });
  });
  const xs = spots.flatMap((p) => [p.x + p.nx * WALL_HALF, p.x - p.nx * WALL_HALF]);
  const ys = spots.flatMap((p) => [p.y + p.ny * WALL_HALF, p.y - p.ny * WALL_HALF]);
  const left = Math.floor(Math.min(...xs)) - 4, top = Math.floor(Math.min(...ys)) - 4;
  return { spots, length: s, left, top, width: Math.ceil(Math.max(...xs)) + 4 - left,
    height: Math.ceil(Math.max(...ys)) + 4 - top, roots: null };
}

function bandSpot(band, s) {
  const { spots } = band;
  let lo = 0, hi = spots.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (spots[mid].s <= s) lo = mid;
    else hi = mid;
  }
  const a = spots[lo], b = spots[hi], f = b.s > a.s ? Math.max(0, Math.min(1, (s - a.s) / (b.s - a.s))) : 0;
  return [a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f, a.nx + (b.nx - a.nx) * f, a.ny + (b.ny - a.ny) * f];
}

function square(ctx, x, y, size, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size);
}

const BIT_SHAPES = 8;
const bitShapes = new Map();

function shapesOf(size) {
  if (bitShapes.has(size)) return bitShapes.get(size);
  const shapes = [];
  for (let n = 0; n < BIT_SHAPES; n++) {
    let seed = n * 977 + size * 131 + 7;
    const roll = () => {
      seed = seed * 16807 % 2147483647;
      return seed / 2147483647;
    };
    const cells = [];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const corner = (x === 0 || x === size - 1) && (y === 0 || y === size - 1);
        if (roll() >= (corner ? 0.55 : 0.12)) cells.push([x, y]);
      }
    }
    if (cells.length < 2) cells.push([0, 0], [1, 1]);
    const edge = () => {
      const along = Math.floor(roll() * size), side = Math.floor(roll() * 4);
      return side === 0 ? [along, -1] : side === 1 ? [size, along] : side === 2 ? [along, size] : [-1, along];
    };
    if (roll() < 0.6) cells.push(edge());
    if (roll() < 0.35) {
      const [x, y] = edge();
      cells.push([x < 0 ? x - 1 : x >= size ? x + 1 : x, y < 0 ? y - 1 : y >= size ? y + 1 : y]);
    }
    shapes.push(cells);
  }
  bitShapes.set(size, shapes);
  return shapes;
}

function bit(ctx, x, y, size, color, seed) {
  const cells = shapesOf(Math.max(1, Math.round(size)))[Math.abs(Math.floor(seed)) % BIT_SHAPES];
  const left = Math.round(x - size / 2), top = Math.round(y - size / 2);
  ctx.fillStyle = color;
  for (const [dx, dy] of cells) ctx.fillRect(left + dx, top + dy, 1, 1);
}

const turnOf = (angle, steps = TURN_STEPS) => Math.round(angle / (Math.PI * 2 / steps));

const PUDDLES = {
  poison: { tones: ['#2f4f0e', '#3f6212', '#4d7c0f', '#65a30d', '#84cc16'], shine: ['#d9f99d', '#bef264'] },
  plague: { tones: ['#0b0a10', '#17141f', '#231d2e', '#2f2540', '#4c1d95'], shine: ['#a78bfa', '#7c3aed'] },
};
const puddleShapes = new Map();
const PUDDLE_RES = 3;

function puddleShape(long, wide, seed, look) {
  const res = PUDDLE_RES, size = Math.max(4, Math.round(long * res)), across = Math.max(3, Math.round(wide * res));
  const key = size + ':' + across + ':' + seed + ':' + look, { tones, shine } = PUDDLES[look];
  if (puddleShapes.has(key)) return puddleShapes.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = size * 2 + 2;
  canvas.height = across * 2 + 2;
  canvas.res = res;
  const ctx = canvas.getContext('2d'), c = canvas.width / 2, ch = canvas.height / 2;
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const dx = x + 0.5 - c, dy = (y + 0.5 - ch) * size / across, a = Math.atan2(dy, dx), d = Math.hypot(dx, dy);
      const edge = size * (0.82 + 0.1 * Math.sin(3 * a + seed) + 0.06 * Math.sin(5 * a + seed * 2)
        + 0.04 * Math.sin(7 * a + seed * 3));
      if (d > edge) continue;
      const k = d / edge, sx = x / res, sy = y / res;
      let color = k > 0.88 ? tones[0] : k > 0.72 ? tones[1] : k > 0.36 ? tones[2] : tones[3];
      if (k < 0.58 && Math.sin(sx * 1.7 + seed) + Math.cos(sy * 2.1 + seed) > 1.4) color = tones[4];
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  const glint = (gx, gy, w, h, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(gx, gy, w, h, -0.4, 0, Math.PI * 2);
    ctx.fill();
  };
  glint(c - size * 0.35, ch - across * 0.35, res * 1.1, res * 0.55, shine[0]);
  glint(c + size * 0.25, ch - across * 0.1, res * 0.5, res * 0.4, shine[1]);
  puddleShapes.set(key, canvas);
  return canvas;
}

function lump(ctx, x, y, rx, ry, seed, wobble = 0.25, count = 9) {
  const points = [];
  for (let i = 0; i < count; i++) {
    const a = i / count * Math.PI * 2 + seed * 0.7, k = 1 + (noise(i, seed) - 0.5) * 2 * wobble;
    points.push([x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k]);
  }
  const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], start = mid(points[count - 1], points[0]);
  ctx.beginPath();
  ctx.moveTo(start[0], start[1]);
  points.forEach((p, i) => {
    const next = mid(p, points[(i + 1) % count]);
    ctx.quadraticCurveTo(p[0], p[1], next[0], next[1]);
  });
  ctx.closePath();
}

function puff(ctx, x, y, r, inner, outer, alpha) {
  const fill = ctx.createRadialGradient(x, y, 0, x, y, r);
  fill.addColorStop(0, inner);
  fill.addColorStop(0.55, outer);
  fill.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fill;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = 1;
}

function coin(ctx, x, y, r, spin, alpha) {
  if (alpha <= 0) return;
  const face = Math.cos(spin), fill = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
  fill.addColorStop(0, '#fef3c7');
  fill.addColorStop(0.45, face > 0 ? '#facc15' : '#eab308');
  fill.addColorStop(1, '#b45309');
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(Math.max(0.18, Math.abs(face)), 1);
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 0.7;
  ctx.strokeStyle = '#92400e';
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(-r * 0.25, -r * 0.3, r * 0.35, r * 0.2, -0.6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 240, .75)';
  ctx.fill();
  ctx.restore();
}

function twinkle(ctx, x, y, size, alpha) {
  if (alpha <= 0.05) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#fffbe0';
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.quadraticCurveTo(x, y, x + size, y);
  ctx.quadraticCurveTo(x, y, x, y + size);
  ctx.quadraticCurveTo(x, y, x - size, y);
  ctx.quadraticCurveTo(x, y, x, y - size);
  ctx.fill();
  ctx.restore();
  glow(ctx, x, y, size * 1.6, 'rgba(253, 224, 71, 1)', alpha * 0.5);
}

function smooth(ctx, image, x, y, angle, zoom) {
  const scale = zoom / (image.fine || 1), w = image.width * scale, h = image.height * scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function sprite(ctx, image, x, y, angle, zoom = ZOOM, lift = 0, steps = TURN_STEPS) {
  const scale = zoom / (image.fine || 1), w = image.width * scale, h = image.height * scale;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.rotate(turnOf(angle, steps) * (Math.PI * 2 / steps));
  ctx.drawImage(image, -w / 2, -h / 2 + lift, w, h);
  ctx.restore();
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

function rim(ctx, x, y, r, rgb, alpha) {
  const fill = ctx.createRadialGradient(x, y, r * 0.78, x, y, r * 1.04);
  fill.addColorStop(0, 'rgba(' + rgb + ', 0)');
  fill.addColorStop(0.82, 'rgba(' + rgb + ', ' + alpha + ')');
  fill.addColorStop(1, 'rgba(' + rgb + ', 0)');
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.04, 0, Math.PI * 2);
  ctx.fill();
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

function reticle(ctx, x, y, r, alpha, turn = 0, tone = RETICLES.red) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.rotate(turn);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = tone.line;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55);
    ctx.lineTo(Math.cos(a) * r * 1.2, Math.sin(a) * r * 1.2);
    ctx.stroke();
  }
  if (tone.eye) eye(ctx, alpha);
  else {
    ctx.fillStyle = tone.dot;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function eye(ctx, alpha) {
  ctx.globalAlpha = Math.min(1, alpha + 0.3);
  ctx.fillStyle = '#dcfce7';
  ctx.strokeStyle = '#15803d';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-4.5, 0);
  ctx.quadraticCurveTo(0, -3.8, 4.5, 0);
  ctx.quadraticCurveTo(0, 3.8, -4.5, 0);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#14532d';
  ctx.beginPath();
  ctx.arc(0, 0, 0.8, 0, Math.PI * 2);
  ctx.fill();
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
    this.droneSpots = new WeakMap();
    this.bands = new WeakMap();
    this.poses = new Map();
    this.flights = new WeakMap();
    this.effects = [];
    this.decals = [];
    this.corpses = [];
    this.built = new WeakMap();
    this.battle = null;
    this.clock = 0;
    this.pace = 1;
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

  draw(battle, dt, { names = null, highlight = null, still = false, ranges = null, pace = 1 } = {}) {
    const ctx = this.ctx;
    this.pace = pace;
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
    this._onField(ctx, () => {
      this._storms(ctx, battle);
      this._patches(ctx, battle);
      this._blazes(ctx, battle);
      this._vents(ctx, battle);
      this._venoms(ctx, battle);
      this._decals(ctx, step);
    });
    this._corpses(ctx, step);
    this._layer(ctx, this.peaks);
    this._onField(ctx, () => {
      this._glints(ctx, battle);
      if (ranges && ranges.size) this._ranges(ctx, battle, ranges);
    });
    this._roadAuras(ctx, battle);
    this._walls(ctx, battle, still);
    this._base(ctx, battle);
    this._mobs(ctx, battle, dt, still);
    this._layer(ctx, this.roof);
    this._gates(ctx, battle);
    this._onField(ctx, () => {
      this._flames(ctx, battle);
      this._whirls(ctx, battle);
    });
    this._auras(ctx, battle);
    this._towers(ctx, battle, dt, highlight, still);
    this._standards(ctx, battle);
    this._rods(ctx, battle);
    this._hammers(ctx, battle);
    this._beams(ctx, battle);
    this._onField(ctx, () => this._phoenixes(ctx, battle, step));
    this._globes(ctx, battle);
    this._onField(ctx, () => this._drones(ctx, battle, step));
    this._charges(ctx, battle);
    this._hooks(ctx, battle);
    this._onField(ctx, () => {
      this._effects(ctx, step);
      this._ambient(ctx, battle);
    });
    if (names) this._names(ctx, battle, names, highlight);
    this._mobTops(ctx, battle);
    return fresh;
  }

  _onField(ctx, paint) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(EDGE, EDGE, CELL * SIZE, CELL * SIZE);
    ctx.clip();
    paint();
    ctx.restore();
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
    for (const mouth of mouthsOf(battle)) if (mouth.spawn) this._portal(ctx, mouth);
  }

  _portal(ctx, mouth) {
    const { across, deep, ring } = MOUTH, clock = this.clock, middle = -deep * 0.45;
    ctx.save();
    ctx.translate(mouth.x, mouth.y);
    ctx.rotate(mouth.angle);
    ctx.save();
    mouthPath(ctx);
    ctx.clip();
    const core = ctx.createRadialGradient(middle, 0, 0, middle, 0, across * 1.15);
    core.addColorStop(0, '#fdf4ff');
    core.addColorStop(0.18, '#e879f9');
    core.addColorStop(0.5, '#7e22ce');
    core.addColorStop(1, '#1a0833');
    ctx.fillStyle = core;
    ctx.fillRect(-deep - 1, -across - 1, deep + 2, across * 2 + 2);
    ctx.globalCompositeOperation = 'lighter';
    ctx.save();
    ctx.translate(middle, 0);
    ctx.scale(0.8, 1);
    for (let arm = 0; arm < 3; arm++) {
      const spin = -clock * 2.6 + arm * Math.PI * 2 / 3, side = [], back = [];
      for (let k = 0; k <= 16; k++) {
        const f = k / 16, a = spin + f * 3.4, r = 1 + f * across * 1.05, w = 2.2 * (1 - f) + 0.3;
        side.push([Math.cos(a) * (r + w), Math.sin(a) * (r + w)]);
        back.push([Math.cos(a) * (r - w), Math.sin(a) * (r - w)]);
      }
      ctx.globalAlpha = arm ? 0.55 : 0.75;
      ctx.fillStyle = arm ? '#f0abfc' : '#fdf4ff';
      ctx.beginPath();
      side.concat(back.reverse()).forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 0.55 + 0.25 * Math.sin(clock * 4);
    ctx.strokeStyle = '#f5d0fe';
    ctx.lineWidth = 1.6;
    mouthPath(ctx, -0.8);
    ctx.stroke();
    ctx.restore();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, 3, 0, across * 1.5, 'rgba(192, 132, 252, .9)', 0.35 + 0.12 * Math.sin(clock * 3));
    for (let i = 0; i < 10; i++) {
      const k = (clock * 0.55 + noise(i, 41)) % 1, side = (noise(i + 7, 41) - 0.5) * across * 1.5;
      ctx.globalAlpha = 0.9 * Math.sin(k * Math.PI);
      square(ctx, middle * (1 - k) + k * 22, side * (1 - k * 0.3) + Math.sin(clock * 3 + i) * 1.5, 2,
        i % 2 ? '#f5d0fe' : '#c084fc');
    }
    for (let i = 0; i < 3; i++) {
      const a = Math.PI * (0.75 + i * 0.25), x = (deep + ring / 2) * Math.cos(a), y = (across + ring / 2) * Math.sin(a);
      ctx.globalAlpha = 0.45 + 0.4 * Math.sin(clock * 3 + i * 2);
      orbit(ctx, x, y, 0, 1, 0, '#e9d5ff', 1, true);
    }
    ctx.restore();
  }

  _storms(ctx, battle) {
    const now = battle.time;
    for (const t of battle.towers) {
      if (t.cls.id === 'frost') this._frostStorm(ctx, t);
      if (t.windUntil > now) this._windOn(ctx, t);
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
      if (!ranges.has(t.player.login)) continue;
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
    const solid = battle.screen(t), range = t.range;
    const key = t.x + ',' + t.y + ',' + range.toFixed(2) + (solid === battle.tall ? ',high' : '') + (t.style === 'angel'
      ? ',near' : '');
    if (this.sights.has(key)) return this.sights.get(key);
    const outline = [], own = t.y * SIZE + t.x;
    for (let i = 0; i < SIGHT_RAYS; i++) {
      const a = i / SIGHT_RAYS * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a);
      let reach = t.style === 'angel' ? range + 0.5 : range;
      if (solid) {
        for (let d = 0.05; d <= reach; d += 0.05) {
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
    const now = battle.time;
    for (const patch of battle.patches) {
      const x = at(patch.x), y = at(patch.y), r = patch.radius * CELL;
      const seed = Math.round(patch.x * 7 + patch.y * 13) % 9;
      const fade = Math.max(0, Math.min(1, (now - patch.born) / 0.25, (patch.until - now) / 0.8));
      this._blaze(ctx, x, y, r, seed, fade, false, 14);
    }
  }

  _blaze(ctx, x, y, r, seed, fade, blue, tall) {
    const tones = blue ? BLUE_FLAME : FLAME, [warm, core] = HEAT[blue ? 'blue' : 'warm'];
    glow(ctx, x, y, r * 1.05, 'rgba(40, 14, 6, .9)', 0.55 * fade);
    glow(ctx, x, y, r * 1.25, warm, 0.8 * fade);
    glow(ctx, x, y, r * 0.6, core, (0.5 + 0.15 * Math.sin(this.clock * 9 + seed)) * fade);
    for (let i = 0, count = Math.round(20 + r * 0.8); i < count; i++) {
      const a = i * 2.39 + seed, d = r * 0.85 * Math.sqrt(noise(i, seed + 40));
      const rise = (this.clock * 2.2 + noise(i + 9, seed + 40)) % 1;
      ctx.globalAlpha = fade * (1 - rise * 0.7);
      bit(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8 - rise * tall, rise < 0.35 ? 4 : 3,
        tones[Math.min(tones.length - 1, Math.floor(rise * tones.length))], i + this.clock * 9);
    }
    ctx.globalAlpha = 1;
  }

  _muzzle(t, hand = 0) {
    const pose = this._pose(t), points = MUZZLES[pose.look] || MUZZLES[t.look] || MUZZLES[t.cls.id] || [[16, 4]];
    const [mx, my] = points[Math.min(hand, points.length - 1)];
    const a = heavyGun(t) ? pose.angle : turnOf(pose.angle, HERO_TURN_STEPS) * (Math.PI * 2 / HERO_TURN_STEPS);
    const u = MODEL_UNIT * sizeOf(t.look), dx = (mx - HERO_X) * u, dy = (my - HERO_Y) * u;
    return { x: pose.x + (dx * Math.cos(a) - dy * Math.sin(a)) / CELL,
      y: pose.y + (dx * Math.sin(a) + dy * Math.cos(a) - (pose.lift || 0)) / CELL };
  }

  _flightOf(e, share) {
    if (e.head === null || e.head === undefined) {
      return { cx: e.x1 + (e.x2 - e.x1) * share, cy: e.y1 + (e.y2 - e.y1) * share,
        angle: Math.atan2(e.x2 - e.x1, -(e.y2 - e.y1)) };
    }
    const dx = e.x2 - e.x1, dy = e.y2 - e.y1, len = Math.hypot(dx, dy), a = e.head;
    const kx = e.x1 + Math.cos(a) * len * 0.55, ky = e.y1 + Math.sin(a) * len * 0.55, u = share, v = 1 - share;
    const tx = 2 * v * (kx - e.x1) + 2 * u * (e.x2 - kx), ty = 2 * v * (ky - e.y1) + 2 * u * (e.y2 - ky);
    return { cx: v * v * e.x1 + 2 * u * v * kx + u * u * e.x2, cy: v * v * e.y1 + 2 * u * v * ky + u * u * e.y2,
      angle: Math.atan2(tx, -ty) };
  }

  _fireball(ctx, e, share, dt) {
    const b = e.bolt, zoom = b.size / 8, { cx, cy, angle } = this._flightOf(e, share);
    const tone = b.tone || (b.blue ? 'blue' : 'warm'), tones = FLAME_TONES[tone];
    const x = at(cx), y = at(cy);
    glow(ctx, x, y, 9 * zoom + 4, HEAT[tone][0], 0.75);
    sprite(ctx, fireballSprite(tone, Math.floor(this.clock * 14) % FIREBALL_FRAMES), x, y, angle, zoom, 6 * zoom, 64);
    if (tone === 'storm') this._crackle(ctx, x, y, 5 * zoom + 3);
    if (dt > 0 && Math.random() < 0.6) this._sparks(cx, cy, tones.slice(1, 4), 1, 0.5, 0.3, Math.round(1 + zoom * 1.5));
  }

  _crackle(ctx, x, y, r) {
    const tick = Math.floor(this.clock * 20);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(255, 250, 200, .9)';
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 3; i++) {
      let a = noise(i, tick) * Math.PI * 2, d = r * 0.4;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
      for (let k = 0; k < 3; k++) {
        a += (noise(i * 7 + k, tick) - 0.5) * 1.2;
        d += r * 0.25;
        ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  _spear(ctx, e, share) {
    const { cx, cy, angle } = this._flightOf(e, share), x = at(cx), y = at(cy), spin = this.clock * 9;
    glow(ctx, x, y, 11, 'rgba(' + STONES.glow + ', 1)', 0.55);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    for (let i = 0; i < STONES.count; i++) {
      const k = (this.clock * 5 + i / STONES.count) % 1;
      ctx.fillStyle = 'rgba(' + STONES.glow + ', ' + 0.5 * (1 - k) + ')';
      ctx.beginPath();
      ctx.arc((noise(i, 9) - 0.5) * 5, 4 + k * 9, 1.1 * (1 - k * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < STONES.count; i++) {
      const a = i * 2.4, d = STONES.spread * (0.3 + 0.7 * noise(i, 4)), sx = Math.cos(a) * d, sy = Math.sin(a) * d * 1.3;
      const size = STONES.size * (0.7 + 0.5 * noise(i, 6)), turn = spin * (i % 2 ? 1 : -1) + i;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(turn);
      const rock = ctx.createRadialGradient(-size * 0.35, -size * 0.35, 0.2, 0, 0, size * 1.2);
      rock.addColorStop(0, '#f5deb3');
      rock.addColorStop(0.45, '#b08356');
      rock.addColorStop(1, '#3b2a1c');
      ctx.fillStyle = rock;
      ctx.beginPath();
      for (let n = 0; n < 6; n++) {
        const b = n * Math.PI / 3, rr = size * (0.75 + 0.35 * noise(i * 6 + n, 8));
        if (n) ctx.lineTo(Math.cos(b) * rr, Math.sin(b) * rr);
        else ctx.moveTo(Math.cos(b) * rr, Math.sin(b) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(' + STONES.glow + ', .8)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, x, y, 6, 'rgba(255, 214, 150, 1)', 0.45);
    ctx.restore();
  }

  _zap(ctx, x1, y1, x2, y2, width, alpha, seed) {
    const tick = Math.floor(this.clock * 24) + seed * 13, len = Math.hypot(x2 - x1, y2 - y1) || 1;
    const nx = -(y2 - y1) / len, ny = (x2 - x1) / len, points = [[x1, y1]];
    for (let k = 1; k < ZAP.steps; k++) {
      const f = k / ZAP.steps, off = (noise(k, tick) - 0.5) * len * ZAP.jag / Math.sqrt(ZAP.steps) * Math.sin(f * Math.PI);
      points.push([x1 + (x2 - x1) * f + nx * off, y1 + (y2 - y1) * f + ny * off]);
    }
    points.push([x2, y2]);
    const branch = points[Math.floor(ZAP.steps / 2)], fork = (noise(99, tick) - 0.5) * 2;
    const bx = branch[0] + (nx * fork + (x2 - x1) / len * 0.6) * len * 0.22, by = branch[1] + (ny * fork + (y2 - y1) / len * 0.6) * len * 0.22;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const [w, rgb, a] of [[width * 3.2, ZAP.glow, 0.28], [width * 1.4, ZAP.mid, 0.7], [width * 0.5, ZAP.core, 1]]) {
      ctx.strokeStyle = 'rgba(' + rgb + ', ' + a * alpha + ')';
      ctx.lineWidth = w;
      ctx.beginPath();
      points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
      ctx.lineWidth = w * 0.6;
      ctx.beginPath();
      ctx.moveTo(branch[0], branch[1]);
      ctx.lineTo((branch[0] + bx) / 2 + nx * 3, (branch[1] + by) / 2 + ny * 3);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }
    glow(ctx, x2, y2, 6 + width * 2, 'rgba(' + ZAP.glow + ', 1)', 0.6 * alpha);
    ctx.restore();
  }

  _claw(ctx, e, share) {
    const x = at(e.x), y = at(e.y), r = e.radius * CELL, t = share * e.life, fade = t < CLAW.cut ? 1 : 1 - (t - CLAW.cut) / (e.life - CLAW.cut);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const sweep = ctx.createRadialGradient(x, y, r * 0.3, x, y, r);
    sweep.addColorStop(0, 'rgba(' + RAIJU_FX.rgb + ', 0)');
    sweep.addColorStop(0.7, 'rgba(' + RAIJU_FX.rgb + ', ' + 0.035 * fade + ')');
    sweep.addColorStop(1, 'rgba(' + RAIJU_FX.rgb + ', 0)');
    ctx.fillStyle = sweep;
    for (let k = 0; k < CLAW.layers; k++) {
      const arc = e.arc * 1.15 * (1 - k / CLAW.layers);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, r, e.angle - arc, e.angle + arc);
      ctx.closePath();
      ctx.fill();
    }
    for (let n = 0; n < 3; n++) {
      const p = Math.max(0, Math.min(1, (t - n * CLAW.lag) / CLAW.cut));
      if (p <= 0) continue;
      const part = n === 1 ? 1 : CLAW.side, d = r * (0.5 + n * 0.14), from = e.angle - e.arc * 0.92 * part;
      const span = e.arc * 1.84 * part * p, thick = CLAW.thick * (n === 1 ? 1.1 : 0.85);
      const blade = (w) => {
        ctx.beginPath();
        for (let k = 0; k <= 16; k++) {
          const a = from + span * k / 16, u = k / 16, wide = Math.sin(u * Math.PI) * w;
          const px = x + Math.cos(a) * (d + wide), py = y + Math.sin(a) * (d + wide);
          if (k) ctx.lineTo(px, py);
          else ctx.moveTo(px, py);
        }
        for (let k = 16; k >= 0; k--) {
          const a = from + span * k / 16, u = k / 16, wide = Math.sin(u * Math.PI) * w;
          ctx.lineTo(x + Math.cos(a) * (d - wide * 0.4), y + Math.sin(a) * (d - wide * 0.4));
        }
        ctx.closePath();
      };
      ctx.fillStyle = 'rgba(' + RAIJU_FX.rgb + ', ' + 0.12 * fade + ')';
      for (const w of [3, 2.3, 1.6]) {
        blade(thick * w);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(' + RAIJU_FX.rgb + ', ' + 0.8 * fade + ')';
      blade(thick);
      ctx.fill();
      ctx.fillStyle = 'rgba(' + RAIJU_FX.core + ', ' + fade + ')';
      blade(thick * 0.4);
      ctx.fill();
      const tip = from + span, tx = x + Math.cos(tip) * d, ty = y + Math.sin(tip) * d;
      glow(ctx, tx, ty, 6, 'rgba(' + RAIJU_FX.rgb + ', 1)', 0.8 * fade);
      if (p < 1) this._zap(ctx, tx, ty, tx + Math.cos(tip + 1.2) * 8, ty + Math.sin(tip + 1.2) * 8, 0.6, fade, n * 7 + e.x);
    }
    ctx.restore();
  }

  _globes(ctx, battle) {
    const f = GLOBE_FX;
    for (const g of battle.globes) {
      const age = battle.time - g.born, left = g.life - age;
      const size = Math.max(0, Math.min(1, age / f.grow, left / (g.life * f.melt)));
      if (size <= 0) continue;
      this._orb(ctx, at(g.x), at(g.y) - f.lift, f.size * size, size, f.lift);
    }
  }

  _orb(ctx, x, y, r, size, lift) {
    const f = GLOBE_FX, tick = Math.floor(this.clock * f.rate), pulse = 0.85 + 0.15 * Math.sin(this.clock * 23);
    ctx.save();
    const body = ctx.createRadialGradient(x, y, 0, x, y, r * 1.25);
    body.addColorStop(0, 'rgba(255, 255, 255, ' + size + ')');
    body.addColorStop(0.35, 'rgba(186, 230, 253, ' + size + ')');
    body.addColorStop(0.75, 'rgba(59, 130, 246, ' + 0.85 * size + ')');
    body.addColorStop(1, 'rgba(30, 64, 175, 0)');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, x, y + lift, r * 1.6, 'rgba(' + ZAP.glow + ', 1)', 0.25 * size);
    glow(ctx, x, y, r * 2.6 * pulse, 'rgba(' + ZAP.glow + ', 1)', 0.5 * size);
    glow(ctx, x, y, r * 1.3, 'rgba(' + ZAP.mid + ', 1)', 0.85 * size);
    glow(ctx, x, y, r * 0.6, 'rgba(' + ZAP.core + ', 1)', size);
    for (let i = 0; i < f.bolts; i++) {
      const a = noise(tick + i * 17, 3) * Math.PI * 2, long = r * (1.1 + 0.9 * noise(tick + i, 9));
      this._zap(ctx, x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.3, x + Math.cos(a) * long,
        y + Math.sin(a) * long, 0.6, size, i * 7 + tick);
    }
    ctx.restore();
  }

  _staffZap(ctx, t) {
    const tip = this._muzzle(t), x = at(tip.x), y = at(tip.y), seed = t.x * 7 + t.y * 13;
    const tick = Math.floor(this.clock * STAFF_ZAP.rate) + seed, flick = 0.6 + 0.4 * noise(tick, 3);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, x, y, 9 + 3 * flick, 'rgba(' + ZAP.glow + ', 1)', 0.35 * flick);
    glow(ctx, x, y, 3.5, 'rgba(' + ZAP.core + ', 1)', 0.8 * flick);
    for (let i = 0; i < STAFF_ZAP.bolts; i++) {
      if (noise(tick, i + 7) > STAFF_ZAP.lit) continue;
      const a = noise(tick + i * 31, 11) * Math.PI * 2, long = STAFF_ZAP.long * (0.6 + 0.6 * noise(tick + i, 5));
      this._zap(ctx, x, y, x + Math.cos(a) * long, y + Math.sin(a) * long, 0.55, flick, seed + i * 5);
    }
    ctx.restore();
  }

  _furSparks(ctx, t, x, y, facing) {
    const beat = Math.floor(this.clock / RAIJU_FX.every + t.x * 0.7), on = noise(beat, t.y) < 0.55;
    if (!on) return;
    const tick = Math.floor(this.clock * 20);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (let i = 0; i < 2; i++) {
      const along = (noise(beat * 3 + i, 4) - 0.5) * 22, side = (noise(beat * 5 + i, 6) - 0.5) * 12;
      const fx = Math.sin(facing), fy = -Math.cos(facing), sx = -fy, sy = fx;
      let px = x + fx * along + sx * side, py = y + fy * along + sy * side;
      ctx.strokeStyle = 'rgba(' + RAIJU_FX.core + ', .9)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(px, py);
      for (let k = 0; k < 4; k++) {
        px += (noise(i * 9 + k, tick) - 0.5) * 6;
        py += (noise(i * 9 + k + 4, tick) - 0.5) * 6;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
      glow(ctx, px, py, 4, 'rgba(' + RAIJU_FX.rgb + ', 1)', 0.6);
    }
    ctx.restore();
  }

  _hammers(ctx, battle) {
    for (const t of battle.towers) {
      const pose = this.poses.get(t), job = pose && pose.hammer;
      if (t.style !== 'thor' || !job) continue;
      const k = this.clock - job.start;
      if (k >= job.out + job.back) continue;
      const back = k >= job.out, f = back ? (k - job.out) / job.back : k / job.out;
      const seen = !back && job.mob && !job.mob.dead ? this.shown.get(job.mob.id) : null;
      if (seen) Object.assign(job, { x: seen.x, y: seen.y });
      const palm = this._muzzle(t), hand = { cx: palm.x, cy: palm.y };
      const spot = hammerAt(hand, job.x, job.y, f, back);
      const x = at(spot.x), y = at(spot.y), spin = this.clock * STORM_FX.spin;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 1; i <= 4; i++) {
        const past = Math.max(0, f - i * 0.05), trail = hammerAt(hand, job.x, job.y, past, back);
        glow(ctx, at(trail.x), at(trail.y), 7 - i, 'rgba(' + ZAP.glow + ', 1)', 0.35 - i * 0.06);
      }
      glow(ctx, x, y, 11, 'rgba(' + ZAP.glow + ', 1)', 0.55);
      ctx.restore();
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(spin);
      const grip = ctx.createLinearGradient(-1, 0, 1, 0);
      grip.addColorStop(0, '#3b2414');
      grip.addColorStop(0.5, '#8a5a32');
      grip.addColorStop(1, '#3b2414');
      ctx.fillStyle = grip;
      ctx.fillRect(-0.9, -1, 1.8, 8);
      const w = 5.2, h = 3.2, b = 1, cy = -3;
      ctx.fillStyle = '#3e5470';
      ctx.fillRect(-w, cy - h, w * 2, h * 2);
      for (const [pts, color] of [[[[-w, cy - h], [w, cy - h], [w - b, cy - h + b], [-w + b, cy - h + b]], '#c7dbf2'],
        [[[-w, cy + h], [w, cy + h], [w - b, cy + h - b], [-w + b, cy + h - b]], '#465d7a'],
        [[[-w, cy - h], [-w + b, cy - h + b], [-w + b, cy + h - b], [-w, cy + h]], '#8fabcc'],
        [[[w, cy - h], [w - b, cy - h + b], [w - b, cy + h - b], [w, cy + h]], '#56708f']]) {
        ctx.fillStyle = color;
        ctx.beginPath();
        pts.forEach(([px, py], n) => (n ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
        ctx.closePath();
        ctx.fill();
      }
      const face = ctx.createLinearGradient(0, cy - h + b, 0, cy + h - b);
      face.addColorStop(0, '#b7cde8');
      face.addColorStop(1, '#7f9bbd');
      ctx.fillStyle = face;
      ctx.fillRect(-w + b, cy - h + b, (w - b) * 2, (h - b) * 2);
      ctx.strokeStyle = 'rgba(224, 242, 254, .95)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(-2, cy - 0.6);
      ctx.lineTo(-0.6, cy + 0.8);
      ctx.lineTo(0.6, cy - 0.8);
      ctx.lineTo(2, cy + 0.6);
      ctx.stroke();
      ctx.restore();
      if (Math.floor(this.clock * 12) % 3 === 0) {
        this._zap(ctx, x, y, x + (noise(1, Math.floor(this.clock * 12)) - 0.5) * 18,
          y + (noise(2, Math.floor(this.clock * 12)) - 0.5) * 18, 0.8, 0.8, t.x);
      }
    }
  }

  _rods(ctx, battle) {
    for (const rod of battle.rods.slice().sort((a, b) => a.cy - b.cy)) {
      const x = at(rod.cx), foot = at(rod.cy) + 8, top = foot - ROD.tall, pulse = 0.5 + 0.5 * Math.sin(this.clock * 6 + rod.seed * 9);
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, .3)';
      ctx.beginPath();
      ctx.ellipse(x + 2, foot, 5.5, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      const iron = ctx.createLinearGradient(x - 1.2, 0, x + 1.2, 0);
      iron.addColorStop(0, '#1f2328');
      iron.addColorStop(0.45, '#9ca3af');
      iron.addColorStop(1, '#16181c');
      ctx.fillStyle = iron;
      ctx.fillRect(x - 1.1, top + 4, 2.2, ROD.tall - 4);
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = 0; k <= 24; k++) {
        const yy = top + 6 + k * 0.7, xx = x + Math.sin(k * 1.4) * 1.9;
        if (k) ctx.lineTo(xx, yy);
        else ctx.moveTo(xx, yy);
      }
      ctx.stroke();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 0.4;
      ctx.stroke();
      const copper = ctx.createLinearGradient(x - 1.6, 0, x + 1.6, 0);
      copper.addColorStop(0, '#7c2d12');
      copper.addColorStop(0.5, '#f59e0b');
      copper.addColorStop(1, '#78350f');
      ctx.fillStyle = copper;
      ctx.beginPath();
      ctx.moveTo(x, top - 3);
      ctx.lineTo(x + 1.6, top + 4);
      ctx.lineTo(x - 1.6, top + 4);
      ctx.closePath();
      ctx.fill();
      for (const yy of [top + 4.6, foot - 5]) {
        ctx.fillStyle = '#4b5563';
        ctx.fillRect(x - 2.2, yy, 4.4, 1.3);
      }
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, x, top - 2, 5 + 2 * pulse, 'rgba(' + ZAP.glow + ', 1)', 0.35 + 0.3 * pulse);
      if (noise(Math.floor(this.clock * 3), rod.seed * 50) < 0.3) {
        this._zap(ctx, x, top - 2, x + (rod.seed - 0.5) * 10, top + 3, 0.6, 0.7, rod.seed * 10);
      }
      ctx.restore();
    }
  }

  _beams(ctx, battle) {
    for (const t of battle.towers) {
      if (!t.beam || t.beam.mob.dead) continue;
      const tip = this._muzzle(t), spot = this.shown.get(t.beam.mob.id) || t.beam.mob;
      const x1 = at(tip.x), y1 = at(tip.y), x2 = at(spot.x), y2 = at(spot.y) - (spot.lift || 0);
      const [rgb, core] = BEAMS[t.beam.element || 'arcane'], len = Math.hypot(x2 - x1, y2 - y1) || 1;
      const ax = (x2 - x1) / len, ay = (y2 - y1) / len, nx = -ay, ny = ax, pulse = 0.85 + 0.15 * Math.sin(this.clock * 30);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      for (const [width, color, alpha] of [[BEAM.outer, rgb, 0.22], [BEAM.mid, rgb, 0.6], [BEAM.core, core, 0.95]]) {
        ctx.strokeStyle = 'rgba(' + color + ', ' + alpha * pulse + ')';
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      const jag = t.beam.element === 'lightning', tick = Math.floor(this.clock * 24);
      let last = null;
      for (let d = 0; d <= len + 1; d += 1.5) {
        const phase = this.clock * BEAM.spin - d * BEAM.twist, reach = Math.min(1, d / 12);
        const wave = Math.sin(phase) * BEAM.coil * reach + (jag ? (noise(d, tick) - 0.5) * 1.6 : 0);
        const px = x1 + ax * d + nx * wave, py = y1 + ay * d + ny * wave, front = Math.cos(phase);
        if (last) {
          ctx.strokeStyle = 'rgba(' + (front > 0 ? core : rgb) + ', ' + (front > 0 ? 0.95 : 0.3) + ')';
          ctx.lineWidth = front > 0 ? 0.9 : 0.6;
          ctx.beginPath();
          ctx.moveTo(last[0], last[1]);
          ctx.lineTo(px, py);
          ctx.stroke();
        }
        last = [px, py];
      }
      const flare = BEAM.flare * (0.9 + 0.2 * Math.sin(this.clock * 17));
      ctx.fillStyle = 'rgba(' + rgb + ', .45)';
      ctx.beginPath();
      ctx.moveTo(x2 - ax * 12 + nx * BEAM.mid / 2, y2 - ay * 12 + ny * BEAM.mid / 2);
      ctx.lineTo(x2 + nx * flare * 0.6, y2 + ny * flare * 0.6);
      ctx.lineTo(x2 - nx * flare * 0.6, y2 - ny * flare * 0.6);
      ctx.lineTo(x2 - ax * 12 - nx * BEAM.mid / 2, y2 - ay * 12 - ny * BEAM.mid / 2);
      ctx.closePath();
      ctx.fill();
      glow(ctx, x2, y2, flare + 4, 'rgba(' + rgb + ', 1)', 0.55);
      glow(ctx, x2, y2, 4, 'rgba(' + core + ', 1)', 0.9);
      glow(ctx, x1, y1, 7, 'rgba(' + rgb + ', 1)', 0.6);
      ctx.restore();
    }
  }

  _laser(ctx, e, share) {
    const pose = this._pose(e.tower), a = pose.angle, tones = e.blue ? BLUE_FLAME : FLAME;
    const mouth = this._muzzle(e.tower);
    const x1 = at(mouth.x), y1 = at(mouth.y);
    const spot = e.mob && !e.mob.dead ? this.shown.get(e.mob.id) || e.mob : null;
    const x2 = spot ? at(spot.x) : at(e.x2), y2 = spot ? at(spot.y) - (spot.lift || 0) : at(e.y2);
    const power = Math.min(1, share / 0.15, (1 - share) / 0.4) * (1 + 0.2 * Math.sin(this.clock * 70));
    const [warm, core] = HEAT[e.blue ? 'blue' : 'warm'];
    ctx.save();
    for (const [width, tone, alpha] of LASER.layers) {
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = tones[tone];
      ctx.lineWidth = width * power;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, x1, y1, 9 * power, core, 0.9);
    glow(ctx, x2, y2, 16 * power, warm, 0.9);
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 10; i++) {
      const k = (this.clock * 4 + i / 10) % 1, side = Math.sin(i * 2.3 + this.clock * 30) * 4 * power;
      ctx.globalAlpha = 1 - k * 0.6;
      bit(ctx, x1 + (x2 - x1) * k + Math.cos(a) * side, y1 + (y2 - y1) * k + Math.sin(a) * side, 2,
        tones[i % 3], i + this.clock * 9);
    }
    ctx.restore();
  }

  _torch(ctx, t) {
    const blue = t.runes.has('blue'), tones = blue ? BLUE_FLAME : FLAME, x = at(t.cx), y = at(t.cy);
    const zone = (FIRE.torch.radius + 0.45) * CELL, seed = (t.x * 7 + t.y * 13) % 9;
    const [warm, core] = HEAT[blue ? 'blue' : 'warm'];
    glow(ctx, x, y, zone, warm, 0.3 + 0.05 * Math.sin(this.clock * 3 + seed));
    glow(ctx, x, y + 4, CELL * 0.75, core, 0.55);
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2 + this.clock * 0.35, d = zone * (0.78 + 0.18 * noise(i, seed));
      const rise = (this.clock * 1.3 + noise(i + 5, seed)) % 1;
      ctx.globalAlpha = 1 - rise;
      bit(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8 - rise * 10, 3,
        tones[1 + Math.min(3, Math.floor(rise * 4))], i + this.clock * 9);
    }
    for (let i = 0; i < 26; i++) {
      const a = i / 26 * Math.PI * 2, d = CELL * (0.42 + 0.12 * noise(i + 9, seed));
      const rise = (this.clock * 2.6 + noise(i + 2, seed)) % 1;
      ctx.globalAlpha = 1 - rise * 0.8;
      bit(ctx, x + Math.cos(a) * d, y + 5 + Math.sin(a) * d * 0.7 - rise * 18, rise < 0.3 ? 4 : 3,
        tones[Math.min(4, Math.floor(rise * 5))], i + this.clock * 9);
    }
    ctx.globalAlpha = 1;
  }

  _torchLit(ctx, t) {
    const tones = t.torch.runes.has('blue') ? BLUE_FLAME : FLAME, x = at(t.cx), y = at(t.cy);
    for (let i = 0; i < 7; i++) {
      const rise = (this.clock * 2 + i / 7) % 1;
      ctx.globalAlpha = 1 - rise * 0.8;
      bit(ctx, x - 9 + i * 3 + Math.sin(this.clock * 6 + i) * 1.5, y - 4 - rise * 16, rise < 0.4 ? 4 : 3,
        tones[Math.min(4, Math.floor(rise * 5))], i + this.clock * 9);
    }
    ctx.globalAlpha = 1;
  }

  _wallBand(blaze) {
    let band = this.bands.get(blaze);
    if (!band) {
      band = wallBand(blaze);
      this.bands.set(blaze, band);
    }
    return band;
  }

  _wallSpots(blaze) {
    const band = this._wallBand(blaze), spots = [], ease = CELL * 0.6;
    for (let s = 1.5; s < band.length; s += 3) {
      const [x, y, nx, ny] = bandSpot(band, s);
      const f = Math.min(1, Math.min(s, band.length - s) / ease);
      spots.push({ x, y, nx, ny, fade: f * f * (3 - 2 * f) });
    }
    return spots;
  }

  _fireWall(ctx, blaze, blue, seed) {
    const tones = blue ? BLUE_FLAME : FLAME, [warm, core] = HEAT[blue ? 'blue' : 'warm'];
    const spots = this._wallSpots(blaze);
    spots.forEach((spot, i) => {
      if (i % 3 !== 1) return;
      glow(ctx, spot.x, spot.y, CELL * 0.42, 'rgba(40, 14, 6, .9)', 0.35 * spot.fade);
      glow(ctx, spot.x, spot.y, CELL * 0.45, warm, 0.5 * spot.fade);
      glow(ctx, spot.x, spot.y - 6, CELL * 0.28, core, (0.3 + 0.1 * Math.sin(this.clock * 9 + i)) * spot.fade);
    });
    const span = WALL_HALF - 3;
    spots.forEach((spot, i) => {
      if (spot.fade < 0.08) return;
      for (const shift of [0, 1 / 3, 2 / 3]) {
        const rise = (this.clock * 2.2 + noise(i, seed) + shift) % 1, across = noise(i + 7, seed + shift) * 2 - 1;
        const edge = 1 - across * across, side = across * span * spot.fade, high = (0.35 + 0.65 * edge) * spot.fade;
        ctx.globalAlpha = (1 - rise * 0.7) * (0.45 + 0.55 * edge) * spot.fade;
        bit(ctx, spot.x + spot.nx * side, spot.y + spot.ny * side + 3 - rise * 22 * high,
          rise < 0.35 && high > 0.6 ? 4 : 3, tones[Math.min(tones.length - 1, Math.floor(rise * tones.length))],
          i * 3 + shift * 3 + this.clock * 9);
      }
      for (const across of [-0.6, 0, 0.6]) {
        const side = across * span * spot.fade;
        ctx.globalAlpha = 0.9 * spot.fade * (1 - across * across * 0.5);
        bit(ctx, spot.x + spot.nx * side, spot.y + spot.ny * side + 4, 3, tones[(i + Math.round(across * 2)) % 2 ? 1 : 2],
          i + across * 5 + this.clock * 6);
      }
    });
    ctx.globalAlpha = 1;
  }

  _rootWall(ctx, blaze) {
    const band = this._wallBand(blaze);
    if (!band.roots) {
      const size = Math.max(band.width, band.height), local = band.spots.map((p) => ({ x: p.x - band.left,
        y: p.y - band.top, nx: p.nx, ny: p.ny, s: p.s }));
      const image = drawRootWall(local, band.length, size, WALL_HALF);
      band.roots = { image, pad: (image.width - size) / 2 };
    }
    band.spots.forEach((spot, i) => {
      const f = Math.min(1, Math.min(spot.s, band.length - spot.s) / (CELL * 0.6));
      if (i % 8 === 4) glow(ctx, spot.x, spot.y, CELL * 0.42, 'rgba(26, 17, 9, .95)', 0.35 * f * f);
    });
    ctx.drawImage(band.roots.image, band.left - band.roots.pad, band.top - band.roots.pad);
  }

  _blazes(ctx, battle) {
    for (const t of battle.towers) {
      if (t.cls.id === 'pyro' && t.runes.has('torch')) this._torch(ctx, t);
      if (t.torch && battle.towers.includes(t.torch)) this._torchLit(ctx, t);
      if (t.style === 'druid' && t.runes.has('roots')) {
        this._rootWall(ctx, battle._blazeOf(t, WOOD.roots.cells));
      }
      if (t.style !== 'ignite') continue;
      const blue = t.runes.has('blue'), tones = blue ? BLUE_FLAME : FLAME;
      if (t.runes.has('fireWall')) this._fireWall(ctx, battle._blazeOf(t), blue, (t.x * 7 + t.y * 13) % 9);
      if (!t.ring) continue;
      const x = at(t.cx), y = at(t.cy), r = t.ring * CELL, seed = (t.x * 7 + t.y * 13) % 9;
      glow(ctx, x, y, r, HEAT[blue ? 'blue' : 'warm'][0], 0.22);
      for (let i = 0, count = Math.round(r * 1.1); i < count; i++) {
        const a = i / count * Math.PI * 2 + this.clock * 0.7, d = r * (0.86 + 0.14 * noise(i + 3, seed));
        const rise = (this.clock * 2.4 + noise(i, seed)) % 1;
        ctx.globalAlpha = 1 - rise * 0.7;
        bit(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8 - rise * 12, rise < 0.35 ? 4 : 3,
          tones[Math.min(tones.length - 1, Math.floor(rise * tones.length))], i + this.clock * 9);
      }
      ctx.globalAlpha = 1;
    }
  }

  _phoenixes(ctx, battle, step) {
    for (const bird of battle.phoenixes) {
      const last = bird.cells.length - 1, was = this.flights.get(bird);
      const shown = was === undefined ? bird.s : Math.min(last, was + (bird.s - was) * Math.min(1, step * 10));
      this.flights.set(bird, shown);
      const spot = flightAt(bird, shown), back = flightAt(bird, Math.max(0, shown - 0.8));
      const ahead = flightAt(bird, Math.min(last, shown + 0.8)), tones = bird.blue ? BLUE_FLAME : FLAME;
      const x = at(spot.x), y = at(spot.y) - 4 - Math.sin(this.clock * 9) * 1.5;
      glow(ctx, x, y, CELL * 1.3, HEAT[bird.blue ? 'blue' : 'warm'][0], 0.6);
      if (step) this._sparks(spot.x, spot.y, tones.slice(0, 3), 2, 0.7, 0.6, 3);
      sprite(ctx, phoenixSprite(bird.blue, Math.floor(this.clock * 10) % PHOENIX_FRAMES), x, y,
        Math.atan2(ahead.x - back.x, -(ahead.y - back.y)), ZOOM * 1.3, 0, 64);
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

  _rugged(ctx, e, share) {
    const x = at(e.x), y = at(e.y), r = e.r * CELL, fade = 1 - share, grow = 0.45 + 0.55 * Math.min(1, share * 2.5);
    const lobe = (a) => {
      const spot = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2) * 7, j = Math.floor(spot);
      const k = spot - j;
      return (0.55 + 0.45 * noise(j, e.seed)) * (1 - k) + (0.55 + 0.45 * noise((j + 1) % 7, e.seed)) * k;
    };
    const tones = BLAST_TONES[e.tone || (e.blue ? 'blue' : 'warm')];
    glow(ctx, x, y, r * grow, e.tone ? HEAT[e.tone][1] : e.blue ? HEAT.blue[1] : BOOM.heat, fade * 0.6);
    for (let i = 0, count = Math.round(30 + 28 * e.r); i < count; i++) {
      const a = i * 2.39 + e.seed, k = Math.sqrt(noise(i, e.seed + 3)), reach = r * grow * k * lobe(a);
      const tone = Math.min(tones.length - 1, Math.floor(k * 2.2 + share * 3));
      ctx.globalAlpha = fade * (1 - k * 0.25);
      bit(ctx, x + Math.cos(a) * reach, y + Math.sin(a) * reach * 0.9 - share * 5 * k, k < 0.5 ? 4 : 3,
        tones[tone], i + e.seed);
    }
    if (share > 0.35) {
      for (let i = 0; i < 8; i++) {
        const a = i * 0.79 + e.seed, reach = r * lobe(a) * 0.9;
        glow(ctx, x + Math.cos(a) * reach, y + Math.sin(a) * reach * 0.9 - share * 10, 6 + 4 * noise(i, e.seed),
          'rgba(90, 80, 74, 1)', (share - 0.35) * fade * 1.4);
      }
    }
    ctx.globalAlpha = 1;
  }

  _nukeBlast(ctx, e, share) {
    const x = at(e.x), y = at(e.y), r = e.radius * CELL, time = share * NUKE_LIFE;
    const dark = time < 0.15 ? time / 0.15 : time < 1.2 ? 1 : Math.max(0, 1 - (time - 1.2) / (NUKE_LIFE - 1.2));
    ctx.fillStyle = 'rgba(4, 3, 10, ' + (0.62 * dark).toFixed(3) + ')';
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

  _arcAt(e, k) {
    return [at(e.x1 + (e.x2 - e.x1) * k), at(e.y1 + (e.y2 - e.y1) * k) - Math.sin(k * Math.PI) * e.arc];
  }

  _lofted(ctx, e, share) {
    const spot = e.mob && !e.mob.dead ? this.shown.get(e.mob.id) : null;
    if (spot) {
      e.x2 = spot.x;
      e.y2 = spot.y;
    }
    const [x, y] = this._arcAt(e, share), [nx, ny] = this._arcAt(e, Math.min(1, share + 0.03));
    ctx.fillStyle = 'rgba(0, 0, 0, .25)';
    ctx.beginPath();
    ctx.ellipse(at(e.x1 + (e.x2 - e.x1) * share), at(e.y1 + (e.y2 - e.y1) * share) + 2, 4, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    return { x, y, angle: Math.atan2(nx - x, -(ny - y)) };
  }

  _drones(ctx, battle, dt) {
    for (const drone of battle.drones) {
      let spot = this.droneSpots.get(drone);
      if (!spot) {
        spot = { x: drone.x, y: drone.y, angle: 0 };
        this.droneSpots.set(drone, spot);
      }
      spot.x = ease(spot.x, drone.x, SMOOTH, dt);
      spot.y = ease(spot.y, drone.y, SMOOTH, dt);
      const target = drone.target;
      if (target) spot.angle = turnToward(spot.angle, Math.atan2(target.x - spot.x, -(target.y - spot.y)), dt);
      const x = at(spot.x), y = at(spot.y), lift = DRONE_LIFT + Math.sin(this.clock * 3 + drone.n * 1.7) * 2;
      ctx.fillStyle = 'rgba(0, 0, 0, .25)';
      ctx.beginPath();
      const bird = drone.kind === 'bird', hawk = drone.kind === 'hawk';
      ctx.ellipse(x, y + 4, hawk ? 8 : bird ? 6 : 7, hawk ? 3 : bird ? 2 : 3, 0, 0, Math.PI * 2);
      ctx.fill();
      const image = hawk ? hawkSprite(Math.floor(this.clock * 9 + drone.n) % 3)
        : bird ? birdSprite(Math.floor(this.clock * 12 + drone.n) % 3)
          : droneSprite(drone.kind, Math.floor(this.clock * 24) % 2);
      sprite(ctx, image, x, y - lift, spot.angle, bird || hawk ? 2 : 1.5, 0, 64);
      if (bird && (drone.source || drone.tower).runes.has('flock')) {
        const drip = (this.clock * 1.6 + drone.n * 0.37) % 1;
        ctx.globalAlpha = 0.8 * (1 - drip);
        square(ctx, x + Math.sin(drone.n * 2.3) * 2, y - lift + 3 + drip * 8, 2, '#84cc16');
        ctx.globalAlpha = 1;
      }
    }
  }

  _auras(ctx, battle) {
    for (const t of battle.towers) if (t.cls.id === 'sorceress' && t.runes.has('unbind')) this._unbind(ctx, t);
    for (const banner of battle.banners) if (banner.kind === 'power') this._might(ctx, banner);
    for (const t of battle.towers) {
      if (t.style === 'monk') this._mantras(ctx, t);
      if (t.cls.id === 'forester') {
        if (t.runes.has('grace')) this._aura(ctx, t, AURAS.grace, WOOD.grace.radius, 0);
        if (t.style === 'hunter' && t.runes.has('trophy')) this._trophy(ctx, t);
      }
      if (t.cls.id !== 'mechanic') continue;
      const own = ['team', 'tuning'].filter((id) => t.runes.has(id));
      own.forEach((id, n) => this._aura(ctx, t, AURAS[id], MECH[id].radius, n));
    }
  }

  _trophy(ctx, t) {
    const pose = this._pose(t), x = at(pose.x), y = at(pose.y), zone = WOOD.trophy.radius * CELL;
    const seed = (t.x * 7 + t.y * 13) % 9;
    glow(ctx, x, y, zone, 'rgba(250, 204, 21, 1)', 0.3 + 0.06 * Math.sin(this.clock * 2 + seed));
    glow(ctx, x, y, zone * 0.5, 'rgba(254, 240, 138, 1)', 0.2);
    for (let i = 0; i < 28; i++) {
      const a = noise(i, seed) * Math.PI * 2, d = zone * 0.92 * Math.sqrt(noise(i + 30, seed));
      const rise = (this.clock * 0.45 + noise(i + 60, seed)) % 1;
      coin(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8 - rise * 30, 3.4, this.clock * 4 + i * 1.3,
        (1 - rise) * Math.min(1, rise * 5));
    }
    for (let i = 0; i < 30; i++) {
      const a = noise(i + 90, seed) * Math.PI * 2, d = zone * Math.sqrt(noise(i + 120, seed));
      const phase = (this.clock * 0.7 + noise(i + 150, seed)) % 1, shine = Math.sin(phase * Math.PI);
      twinkle(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8, 2 + shine * 4, shine);
    }
  }

  _aura(ctx, t, look, radius, n) {
    const pose = this._pose(t), x = at(pose.x), y = at(pose.y), zone = radius * CELL, seed = (t.x * 7 + t.y * 13) % 9;
    glow(ctx, x, y, zone, look.glow, (0.22 + 0.05 * Math.sin(this.clock * 3 + seed)) / (1 + n));
    for (let i = 0; i < 14; i++) {
      const a = (i + n / 2) / 14 * Math.PI * 2 + this.clock * 0.35 * (n ? -1 : 1);
      const d = zone * (0.8 - n * 0.22 + 0.14 * noise(i + n * 20, seed)), rise = (this.clock * 0.9 + noise(i + 5, seed)
        + n / 2) % 1;
      ctx.globalAlpha = 1 - rise;
      pixels(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8 - rise * 12, look.shape, look.tones[i % 3], look.tip);
    }
    for (let i = 0; i < 9; i++) {
      const a = (i + n / 2) / 9 * Math.PI * 2, d = CELL * (0.46 + n * 0.14 + 0.08 * noise(i + 9 + n * 20, seed));
      const rise = (this.clock * 1.4 + noise(i + 2, seed) + n / 2) % 1;
      ctx.globalAlpha = 1 - rise * 0.8;
      pixels(ctx, x + Math.cos(a) * d, y + 5 + Math.sin(a) * d * 0.7 - rise * 16, look.shape, look.tones[i % 3],
        look.tip);
    }
    ctx.globalAlpha = 1;
  }


  _holyAura(ctx, t, x, y) {
    const pulse = 0.5 + 0.5 * Math.sin(this.clock * 2.4 + t.x);
    if (t.style === 'angel') glow(ctx, x, y - 2, 30, 'rgba(255, 236, 170, 1)', 0.12 + 0.06 * pulse);
    else if (t.style === 'inquisitor') glow(ctx, x, y - 2, 18, HOLY_LIGHT.warm, 0.16 + 0.08 * pulse);
  }

  _halo(ctx, t, x, y) {
    const a = turnOf(this._pose(t).angle, HERO_TURN_STEPS) * Math.PI * 2 / HERO_TURN_STEPS;
    const back = (HERO_Y - 17.8) * MODEL_UNIT * sizeOf(t.look);
    const hx = x - Math.sin(a) * back, hy = y + Math.cos(a) * back, rings = t.style === 'angel' ? [6.5] : [5.5, 8];
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    rings.forEach((r, n) => {
      for (let i = 0; i < 10; i++) {
        const from = i * Math.PI / 5 + this.clock * (n ? -0.7 : 0.9), shine = 0.5 + 0.5 * Math.sin(this.clock * 3 + i * 1.3 + n);
        for (const [width, alpha] of [[3.4, 0.12], [1.6, 0.35], [0.8, 0.6]]) {
          ctx.strokeStyle = HOLY_LIGHT.ray + (alpha * (0.4 + 0.6 * shine)) + ')';
          ctx.lineWidth = width;
          ctx.beginPath();
          ctx.arc(hx, hy, r, from, from + Math.PI / 5 * 0.82);
          ctx.stroke();
        }
      }
    });
    ctx.restore();
  }

  _holyTip(ctx, t) {
    const tip = this._muzzle(t), x = at(tip.x), y = at(tip.y), seed = t.x * 7 + t.y * 13;
    const flash = this._pose(t).flash > 0 ? 1 : 0, beat = 0.5 + 0.5 * Math.sin(this.clock * 3.1 + seed);
    const size = t.style === 'inquisitor' ? 1.25 : 1;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, x, y, (13 + 3 * beat + flash * 6) * size, HOLY_LIGHT.warm, 0.4 + 0.15 * beat);
    glow(ctx, x, y, (6 + 1.5 * beat) * size, HOLY_LIGHT.core, 0.75 + 0.2 * beat);
    ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const a = this.clock * 0.9 + i * Math.PI / 3, long = (7 + 3 * Math.sin(this.clock * 2.3 + i * 1.7)) * size;
      const ray = ctx.createLinearGradient(x, y, x + Math.cos(a) * long, y + Math.sin(a) * long);
      ray.addColorStop(0, HOLY_LIGHT.ray + '0.75)');
      ray.addColorStop(1, HOLY_LIGHT.ray + '0)');
      ctx.strokeStyle = ray;
      ctx.lineWidth = 1.4 * size;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * 2, y + Math.sin(a) * 2);
      ctx.lineTo(x + Math.cos(a) * long, y + Math.sin(a) * long);
      ctx.stroke();
    }
    for (let i = 0; i < 4; i++) {
      const k = (this.clock * 0.6 + i / 4 + seed * 0.01) % 1, a = i * 1.9 + this.clock * 1.3;
      const r = (3 + k * 7) * size;
      glow(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r - k * 6, 2.6, HOLY_LIGHT.core, 0.8 * (1 - k));
    }
    ctx.restore();
  }

  _might(ctx, banner) {
    const look = TOTEM_LOOKS.power, x = at(banner.cx), y = at(banner.cy), r = SPELL.totem.radius * CELL;
    const flash = this._flashOf(banner), seed = banner.seed * 10;
    ctx.save();
    ctx.beginPath();
    ctx.rect(EDGE, EDGE, CELL * SIZE, CELL * SIZE);
    ctx.clip();
    glow(ctx, x, y, r, 'rgba(' + look.aura + ', .8)', 0.14 + 0.05 * Math.sin(this.clock * 1.5 + seed) + 0.15 * flash);
    rim(ctx, x, y, r, look.rim, 0.42);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.strokeStyle = look.trail;
    for (let i = 0; i < 3; i++) {
      const a = this.clock * 0.9 + seed + i * Math.PI * 2 / 3;
      for (let k = 0; k < 6; k++) {
        ctx.globalAlpha = 0.75 * (1 - k / 6);
        ctx.lineWidth = 3 - k * 0.4;
        ctx.beginPath();
        ctx.arc(x, y, r * 0.96, a - (k + 1) * 0.09, a - k * 0.09);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      const ox = x + Math.cos(a) * r * 0.96, oy = y + Math.sin(a) * r * 0.96;
      glow(ctx, ox, oy, 6, 'rgba(' + look.aura + ', 1)', 0.8);
      glow(ctx, ox, oy, 2.4, 'rgba(255, 236, 230, 1)', 1);
    }
    for (let i = 0; i < 12; i++) {
      const k = (this.clock * 0.3 + noise(i, 31 + seed)) % 1, a = i * 2.4 + seed, d = r * (0.2 + 0.75 * noise(i + 5, 31));
      glow(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d - k * 12, 2.6, i % 2 ? 'rgba(255, 220, 210, 1)'
        : 'rgba(' + look.aura + ', 1)', 0.75 * Math.sin(k * Math.PI));
    }
    ctx.restore();
  }

  _unbind(ctx, t) {
    const x = at(t.cx), y = at(t.cy), r = SPELL.unbind * CELL, seed = t.x * 7 + t.y * 3;
    ctx.save();
    ctx.beginPath();
    ctx.rect(EDGE, EDGE, CELL * SIZE, CELL * SIZE);
    ctx.clip();
    for (let i = 0; i < UNBIND.edge; i++) {
      const a = i * Math.PI * 2 / UNBIND.edge + this.clock * 0.25 * (i % 2 ? 1 : -1) + seed;
      const d = r * (0.93 + 0.05 * Math.sin(this.clock * 1.7 + i * 1.3)), px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
      const blink = 0.55 + 0.45 * Math.sin(this.clock * 2.6 + i * 2.1), tone = UNBIND.tones[i % UNBIND.tones.length];
      glow(ctx, px, py, 6, 'rgba(' + tone + ', 1)', 0.8 * blink);
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, px, py, 2, 'rgba(255, 255, 255, 1)', 0.9 * blink);
      ctx.globalCompositeOperation = 'source-over';
    }
    for (let i = 0; i < UNBIND.inner; i++) {
      const k = (this.clock * 0.25 + i / UNBIND.inner + noise(i, seed)) % 1, a = noise(i + 3, seed) * Math.PI * 2 + k * 1.2;
      const d = r * (0.2 + 0.65 * noise(i + 7, seed)), px = x + Math.cos(a) * d, py = y + Math.sin(a) * d - k * 8;
      const fade = Math.sin(k * Math.PI), tone = UNBIND.tones[(i + 2) % UNBIND.tones.length];
      glow(ctx, px, py, 5, 'rgba(' + tone + ', 1)', 0.7 * fade);
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, px, py, 1.2, 'rgba(255, 255, 255, 1)', 0.7 * fade);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }

  _flashOf(banner) {
    return banner.flashAt ? Math.max(0, 1 - (this.clock - banner.flashAt) / 0.5) : 0;
  }

  _roadAuras(ctx, battle) {
    const list = battle.banners.filter((banner) => banner.kind !== 'power');
    if (!list.length) return;
    if (!this._roadLayer) this._roadLayer = document.createElement('canvas');
    const layer = this._roadLayer, side = BOARD * ROAD_AURA.zoom;
    if (layer.width !== side) layer.width = layer.height = side;
    const g = layer.getContext('2d');
    g.setTransform(ROAD_AURA.zoom, 0, 0, ROAD_AURA.zoom, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, BOARD, BOARD);
    for (const banner of list) this._swarm(g, battle, banner);
    g.globalCompositeOperation = 'destination-in';
    g.globalAlpha = 1;
    g.drawImage(this._roadMask(battle), 0, 0, BOARD, BOARD);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(layer, 0, 0, BOARD, BOARD);
    ctx.restore();
  }

  _roadMask(battle) {
    if (this._maskOf !== battle) {
      const mask = document.createElement('canvas');
      mask.width = mask.height = BOARD * ROAD_AURA.zoom;
      const g = mask.getContext('2d');
      g.scale(ROAD_AURA.zoom, ROAD_AURA.zoom);
      paintRoadMask(g, battle);
      this._mask = mask;
      this._maskOf = battle;
    }
    return this._mask;
  }

  _swarm(g, battle, banner) {
    const look = TOTEM_LOOKS[banner.kind], x = at(banner.cx), y = at(banner.cy), r = SPELL.totem.radius * CELL;
    const flash = this._flashOf(banner), seed = banner.seed * 10;
    const fill = g.createRadialGradient(x, y, 0, x, y, r * ROAD_AURA.reach);
    fill.addColorStop(0, 'rgba(' + look.tint + ', ' + (look.fill * 0.5 + 0.1 * flash) + ')');
    fill.addColorStop(0.62, 'rgba(' + look.tint + ', ' + (look.fill + 0.1 * flash) + ')');
    fill.addColorStop(1, 'rgba(' + look.tint + ', 0)');
    g.fillStyle = fill;
    g.beginPath();
    g.arc(x, y, r * ROAD_AURA.reach, 0, Math.PI * 2);
    g.fill();
    const cells = battle.road.filter(([cx, cy]) => Math.hypot(cx + 0.5 - banner.cx, cy + 0.5 - banner.cy) < SPELL.totem.radius + 1);
    g.globalCompositeOperation = 'lighter';
    cells.forEach(([cx, cy], n) => {
      for (let k = 0; k < ROAD_AURA.motes; k++) {
        const id = n * ROAD_AURA.motes + k, drift = this.clock * look.drift;
        const px = at(cx + 0.5 + (noise(id, seed) - 0.5) * 0.9 + (smoothNoise(drift + id, 1, seed) - 0.5) * 0.5);
        const py = at(cy + 0.5 + (noise(id + 50, seed) - 0.5) * 0.9 + (smoothNoise(drift + id, 2, seed) - 0.5) * 0.5);
        const out = Math.hypot(px - x, py - y) / r, u = Math.max(0, Math.min(1, (ROAD_AURA.reach - out) / (ROAD_AURA.reach - 0.75)));
        const edge = u * u * (3 - 2 * u);
        if (edge <= 0) continue;
        const blink = Math.pow(Math.max(0, Math.sin(this.clock * (1.2 + noise(id + 9, seed)) + id * 2.1)), 2);
        glow(g, px, py, (5 + 3 * blink) * (0.6 + 0.4 * edge), 'rgba(' + look.mote + ', 1)', (0.45 + 0.55 * blink) * (1 + flash) * edge);
        glow(g, px, py, 1.8, 'rgba(' + look.core + ', 1)', (0.7 + 0.3 * blink) * edge);
      }
    });
  }

  _standards(ctx, battle) {
    const banners = battle.banners.slice().sort((a, b) => a.cy - b.cy || a.cx - b.cx);
    for (const banner of banners) {
      this._standard(ctx, at(banner.cx), at(banner.cy) + 7, banner, TOTEM_LOOKS[banner.kind], this._flashOf(banner));
    }
  }

  _standard(ctx, x, foot, banner, look, flash) {
    const cloth = flagCloth(banner.kind), top = foot - 32, sway = Math.sin(this.clock * 2.1 + banner.seed * 9);
    const left = x - cloth.w / 2, hang = top + 5.5;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, .32)';
    ctx.beginPath();
    ctx.ellipse(x + 2, foot, 6.5, 2.3, 0, 0, Math.PI * 2);
    ctx.fill();
    this._pole(ctx, x, top, foot, banner.kind);
    const sheet = this._flagSheet(cloth, sway, banner.seed);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(sheet, left - FLAG.margin, hang, sheet.width / FLAG.q, sheet.height / FLAG.q);
    ctx.imageSmoothingEnabled = false;
    this._crossbar(ctx, x, hang + 1.2, cloth.w, sway, look);
    this._finial(ctx, x, top, banner.kind, look, flash);
    ctx.restore();
  }

  _pole(ctx, x, top, foot, kind) {
    const half = 1.15, wood = ctx.createLinearGradient(x - half, 0, x + half, 0);
    wood.addColorStop(0, '#1c1008');
    wood.addColorStop(0.3, '#6b4220');
    wood.addColorStop(0.45, '#b07a42');
    wood.addColorStop(0.62, '#5a3718');
    wood.addColorStop(1, '#140a04');
    ctx.fillStyle = wood;
    ctx.beginPath();
    ctx.moveTo(x - half * 0.85, top + 2);
    ctx.lineTo(x + half * 0.85, top + 2);
    ctx.lineTo(x + half, foot - 3);
    ctx.lineTo(x - half, foot - 3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(30, 14, 4, .55)';
    ctx.lineWidth = 0.25;
    for (const [dx, seed] of [[-0.45, 1], [0.1, 2], [0.5, 3]]) {
      ctx.beginPath();
      for (let yy = top + 3; yy <= foot - 3; yy += 1.5) {
        const wob = (smoothNoise(yy * 0.3, seed, 4) - 0.5) * 0.5;
        if (yy === top + 3) ctx.moveTo(x + dx + wob, yy);
        else ctx.lineTo(x + dx + wob, yy);
      }
      ctx.stroke();
    }
    const strap = WRAPS[kind];
    for (const at0 of [foot - 12, foot - 8.5]) {
      for (let i = 0; i < 3; i++) {
        const yy = at0 + i * 1.05, band = ctx.createLinearGradient(x - half, 0, x + half, 0);
        band.addColorStop(0, strap[0]);
        band.addColorStop(0.45, strap[1]);
        band.addColorStop(1, strap[0]);
        ctx.fillStyle = band;
        ctx.beginPath();
        ctx.moveTo(x - half * 1.15, yy + 0.35);
        ctx.lineTo(x + half * 1.15, yy - 0.25);
        ctx.lineTo(x + half * 1.15, yy + 0.45);
        ctx.lineTo(x - half * 1.15, yy + 1.05);
        ctx.closePath();
        ctx.fill();
      }
    }
    const iron = ctx.createLinearGradient(x - half, 0, x + half, 0);
    iron.addColorStop(0, '#1f2328');
    iron.addColorStop(0.45, '#9ca3af');
    iron.addColorStop(1, '#16181c');
    ctx.fillStyle = iron;
    ctx.beginPath();
    ctx.moveTo(x - half * 1.1, foot - 3.4);
    ctx.lineTo(x + half * 1.1, foot - 3.4);
    ctx.lineTo(x + 0.4, foot + 0.6);
    ctx.lineTo(x, foot + 1.8);
    ctx.lineTo(x - 0.4, foot + 0.6);
    ctx.closePath();
    ctx.fill();
  }

  _flagSheet(cloth, sway, seed) {
    const q = FLAG.q, m = FLAG.margin, sheet = flagSheet(cloth), g = sheet.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, sheet.width, sheet.height);
    const rows = Math.ceil(cloth.h / FLAG.strip), shift = (row) => {
      const f = row / cloth.h;
      return sway * Math.pow(f, 1.5) * 2.4 + Math.sin(this.clock * 3.1 + row * 0.45 + seed * 7) * 0.45 * f;
    };
    for (let i = 0; i < rows; i++) {
      const y0 = i * FLAG.strip, dx = shift(y0 + FLAG.strip / 2);
      g.drawImage(cloth, 0, y0 * q, cloth.width, FLAG.strip * q + 1, (m + dx) * q - cloth.pad, y0 * q, cloth.width,
        FLAG.strip * q + 1);
    }
    g.globalCompositeOperation = 'source-atop';
    g.setTransform(q, 0, sway * 0.09 * q, q, 0, 0);
    const folds = g.createLinearGradient(m - 1, 0, m + cloth.w + 1, 0), phase = this.clock * 0.9 + seed * 5;
    for (let j = 0; j <= 16; j++) {
      const v = Math.sin(j / 16 * Math.PI * 2 * 2.5 + phase + sway * 0.8);
      folds.addColorStop(j / 16, v < 0 ? 'rgba(' + cloth.shade + ', ' + (-v * 0.42) + ')'
        : 'rgba(255, 255, 255, ' + (v * 0.16) + ')');
    }
    g.fillStyle = folds;
    g.fillRect(-4, 0, cloth.w + m * 2 + 8, cloth.h + 2);
    g.setTransform(q, 0, 0, q, 0, 0);
    const light = g.createLinearGradient(m, 0, m + cloth.w, cloth.h);
    light.addColorStop(0, 'rgba(255, 255, 255, .18)');
    light.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
    light.addColorStop(1, 'rgba(' + cloth.shade + ', .3)');
    g.fillStyle = light;
    g.fillRect(0, 0, cloth.w + m * 2, cloth.h + 2);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    return sheet;
  }

  _crossbar(ctx, x, y, w, sway, look) {
    const reach = w / 2 + 1.6, bar = ctx.createLinearGradient(0, y - 1, 0, y + 1);
    bar.addColorStop(0, '#c08a4f');
    bar.addColorStop(0.5, '#6b4220');
    bar.addColorStop(1, '#1c1008');
    ctx.fillStyle = bar;
    ctx.beginPath();
    ctx.moveTo(x - reach, y - 0.7);
    ctx.quadraticCurveTo(x, y - 1.3, x + reach, y - 0.7);
    ctx.lineTo(x + reach, y + 0.8);
    ctx.quadraticCurveTo(x, y + 0.3, x - reach, y + 0.8);
    ctx.closePath();
    ctx.fill();
    for (const side of [-1, 1]) {
      const ex = x + side * reach, knob = ctx.createRadialGradient(ex - 0.4, y - 0.4, 0.1, ex, y, 1.3);
      knob.addColorStop(0, '#e9c08a');
      knob.addColorStop(1, '#3b2410');
      ctx.fillStyle = knob;
      ctx.beginPath();
      ctx.arc(ex, y, 1.25, 0, Math.PI * 2);
      ctx.fill();
      const swing = Math.sin(this.clock * 2.4 + side) * 0.9 + sway * 0.6, cord = 4.5;
      const bx = ex + swing, by = y + cord;
      ctx.strokeStyle = 'rgba(60, 35, 15, .9)';
      ctx.lineWidth = 0.35;
      ctx.beginPath();
      ctx.moveTo(ex, y + 1);
      ctx.quadraticCurveTo(ex + swing * 0.3, y + cord * 0.6, bx, by);
      ctx.stroke();
      this._charm(ctx, bx, by, swing * 0.25, look);
    }
  }

  _charm(ctx, x, y, tilt, look) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    const vane = ctx.createLinearGradient(-1.2, 0, 1.2, 0);
    vane.addColorStop(0, look.feather[1]);
    vane.addColorStop(0.5, look.feather[0]);
    vane.addColorStop(1, look.feather[1]);
    ctx.fillStyle = vane;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(1.6, 1.6, 0.5, 4.6);
    ctx.lineTo(0, 5.4);
    ctx.lineTo(-0.5, 4.6);
    ctx.quadraticCurveTo(-1.6, 1.6, 0, 0);
    ctx.fill();
    ctx.strokeStyle = 'rgba(40, 20, 10, .7)';
    ctx.lineWidth = 0.2;
    ctx.beginPath();
    ctx.moveTo(0, 0.2);
    ctx.lineTo(0, 5.2);
    ctx.stroke();
    ctx.fillStyle = '#e7dcc4';
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.7, 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _finial(ctx, x, top, kind, look, flash) {
    const tint = 'rgba(' + look.aura + ', 1)';
    ctx.lineCap = 'round';
    if (kind === 'slow') {
      ctx.strokeStyle = '#3b2410';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 0; i <= 22; i++) {
        const a = Math.PI * 0.5 - i * 0.42, d = 3.4 - i * 0.13, px = x + 0.2 + Math.cos(a) * d - 0.2, py = top - 1.5 - Math.sin(a) * d;
        if (i) ctx.lineTo(px, py);
        else ctx.moveTo(x, top + 2.5);
      }
      ctx.stroke();
      ctx.strokeStyle = '#a0703c';
      ctx.lineWidth = 0.6;
      ctx.stroke();
      this._gem(ctx, x + 0.2, top - 1.6, 1.3, look.gem, tint, flash);
    } else if (kind === 'purge') {
      const ring = ctx.createLinearGradient(x - 3, top - 5, x + 3, top + 1);
      ring.addColorStop(0, '#ffffff');
      ring.addColorStop(0.5, '#94a3b8');
      ring.addColorStop(1, '#e2e8f0');
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, top - 2, 2.7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = ring;
      ctx.lineWidth = 0.9;
      ctx.stroke();
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(x - 0.5, top + 0.6, 1, 1.6);
      this._gem(ctx, x, top - 2, 1.5, look.gem, tint, flash);
    } else {
      const steel = ctx.createLinearGradient(x - 1.6, 0, x + 1.6, 0);
      steel.addColorStop(0, '#374151');
      steel.addColorStop(0.5, '#f3f4f6');
      steel.addColorStop(0.52, '#6b7280');
      steel.addColorStop(1, '#1f2937');
      ctx.fillStyle = steel;
      ctx.beginPath();
      ctx.moveTo(x, top - 7);
      ctx.quadraticCurveTo(x + 2.2, top - 3, x + 0.6, top + 1);
      ctx.lineTo(x - 0.6, top + 1);
      ctx.quadraticCurveTo(x - 2.2, top - 3, x, top - 7);
      ctx.fill();
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.ellipse(x, top + 1.6, 1.3, 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 5; i++) {
        const swing = Math.sin(this.clock * 2.6 + i) * 0.4;
        ctx.strokeStyle = i % 2 ? '#dc2626' : '#991b1b';
        ctx.lineWidth = 0.55;
        ctx.beginPath();
        ctx.moveTo(x - 0.9 + i * 0.45, top + 2);
        ctx.quadraticCurveTo(x - 1.2 + i * 0.45 + swing, top + 3.6, x - 1.3 + i * 0.5 + swing * 2, top + 5);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, x, top - 3, 4 + 3 * flash, tint, 0.35 + 0.4 * flash);
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  _gem(ctx, x, y, r, tones, tint, flash) {
    const gem = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, 0.1, x, y, r);
    gem.addColorStop(0, '#ffffff');
    gem.addColorStop(0.35, tones[0]);
    gem.addColorStop(1, tones[1]);
    ctx.fillStyle = gem;
    ctx.beginPath();
    ctx.moveTo(x, y - r * 1.25);
    ctx.lineTo(x + r, y);
    ctx.lineTo(x, y + r * 1.25);
    ctx.lineTo(x - r, y);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, x, y, 4 + 3 * flash, tint, 0.5 + 0.4 * flash);
    ctx.globalCompositeOperation = 'source-over';
  }

  _spellGlow(ctx, t) {
    const pose = this._pose(t), act = pose.act && this.clock < pose.act.until ? pose.act : null;
    if (t.style === 'shamaness' || t.style === 'enchantress' && !act) return;
    const tip = this._muzzle(t), x = at(tip.x), y = at(tip.y), beat = 0.5 + 0.5 * Math.sin(this.clock * 2.6 + t.x);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (t.style === 'minstrel') {
      const song = pose.song && this.clock < pose.song.until ? pose.song.kind : null;
      const tint = song ? SPELLS.songs[song] : SPELLS.lute, sparks = song ? 6 : 3;
      glow(ctx, x, y, (song ? 16 : 11) + 3 * beat, tint, 0.28 + 0.14 * beat + (song ? 0.15 : 0));
      for (let i = 0; i < sparks; i++) {
        const k = (this.clock * 0.5 + i / sparks + t.y * 0.1) % 1, a = i * 2.1 + this.clock * 0.7;
        glow(ctx, x + Math.cos(a) * (3 + k * 6), y + Math.sin(a) * (3 + k * 6) - k * 5, 2.4, tint,
          0.8 * Math.sin(k * Math.PI));
      }
      if (song) this._notes(ctx, x, y, song, t.x);
      if (t.muse && this.battle.towers.includes(t.muse)) this._muse(ctx, x, y, t.muse);
    } else if (t.style === 'enchantress') {
      const [hx, hy] = this.clock < act.cast ? this._handAt(t, 14, 10.9) : [x, y];
      glow(ctx, hx, hy, 8, HEAT.azure[0], 0.6);
      glow(ctx, hx, hy, 3.5, HEAT.azure[1], 0.9);
    } else {
      glow(ctx, x, y, 9 + 2 * beat, SPELLS.wisp, 0.4 + 0.15 * beat);
      glow(ctx, x, y, 3.2, 'rgba(255, 255, 255, 1)', 0.8);
    }
    ctx.restore();
  }

  _notes(ctx, x, y, song, seed) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.font = '700 9px "Segoe UI Symbol", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 5; i++) {
      const k = (this.clock * 0.45 + i / 5 + seed * 0.07) % 1, a = i * 1.26 + seed;
      const nx = x + Math.cos(a) * (6 + k * 26), ny = y + Math.sin(a) * (6 + k * 20) - k * 14;
      ctx.globalAlpha = Math.sin(k * Math.PI) * 0.95;
      ctx.fillStyle = 'rgba(20, 10, 20, .55)';
      ctx.fillText(i % 2 ? '♪' : '♫', nx + 0.6, ny + 0.8);
      ctx.fillStyle = SPELLS.notes[song];
      ctx.fillText(i % 2 ? '♪' : '♫', nx, ny);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'lighter';
  }

  _muse(ctx, x, y, ally) {
    const pose = this._pose(ally), tx = at(pose.x), ty = at(pose.y) - (pose.lift || 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.font = '700 8px "Segoe UI Symbol", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 2; i++) {
      const k = (this.clock * 0.6 + i / 2) % 1, lift = Math.sin(k * Math.PI) * 8;
      ctx.globalAlpha = Math.sin(k * Math.PI) * 0.9;
      ctx.fillStyle = SPELLS.notes.anthem;
      ctx.fillText('♪', x + (tx - x) * k, y + (ty - y) * k - lift);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, tx, ty, 14, 'rgba(253, 230, 138, 1)', 0.12 + 0.05 * Math.sin(this.clock * 3));
  }

  _handAt(t, mx, my) {
    const pose = this._pose(t), a = turnOf(pose.angle, HERO_TURN_STEPS) * Math.PI * 2 / HERO_TURN_STEPS;
    const u = MODEL_UNIT * sizeOf(t.look), dx = (mx - HERO_X) * u, dy = (my - HERO_Y) * u;
    return [at(pose.x) + dx * Math.cos(a) - dy * Math.sin(a), at(pose.y) - (pose.lift || 0) + dx * Math.sin(a)
      + dy * Math.cos(a)];
  }

  _wisp(ctx, e, share) {
    const dx = at(e.x2) - at(e.x1), dy = at(e.y2) - at(e.y1), len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    const point = (k) => {
      const side = Math.sin(k * Math.PI * 2) * SPELLS.wave * Math.sin(k * Math.PI);
      return [at(e.x1) + dx * k + nx * side, at(e.y1) + dy * k + ny * side];
    };
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 4; i >= 1; i--) {
      const [tx, ty] = point(Math.max(0, share - i * 0.04));
      glow(ctx, tx, ty, 3.4 - i * 0.5, SPELLS.wisp, 0.35 * (1 - i / 5));
    }
    const [x, y] = point(share);
    glow(ctx, x, y, e.crit ? 8 : 6.5, SPELLS.wisp, 0.75);
    glow(ctx, x, y, 2.6, 'rgba(255, 255, 255, 1)', 1);
    ctx.restore();
  }

  _chord(ctx, e, share) {
    const a = e.angle, fx = Math.cos(a), fy = Math.sin(a), travel = e.reach * CELL * share;
    const fade = share < 0.6 ? Math.min(1, share * 8) : Math.pow((1 - share) / 0.4, 1.2);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let echo = 2; echo >= 0; echo--) {
      const d = travel - echo * SPELLS.chevron * 0.7;
      if (d < 3) continue;
      const size = SPELLS.chevron * (0.85 + 0.35 * share) * (1 - echo * 0.18), thick = size * 0.42;
      const ox = at(e.x) + fx * (d - size), oy = at(e.y) + fy * (d - size), span = 0.75;
      const alpha = fade * (echo ? 0.4 / echo : 1);
      ctx.beginPath();
      for (let k = 0; k <= 12; k++) {
        const b = a - span + span * 2 * k / 12;
        ctx.lineTo(ox + Math.cos(b) * size, oy + Math.sin(b) * size);
      }
      for (let k = 12; k >= 0; k--) {
        const u = k / 6 - 1, b = a - span + span * 2 * k / 12, r = size - thick * (1 - u * u);
        ctx.lineTo(ox + Math.cos(b) * r, oy + Math.sin(b) * r);
      }
      ctx.closePath();
      const fill = ctx.createRadialGradient(ox, oy, size - thick, ox, oy, size);
      fill.addColorStop(0, 'rgba(' + SPELLS.chord + ', 0)');
      fill.addColorStop(0.55, 'rgba(' + SPELLS.chord + ', ' + 0.55 * alpha + ')');
      fill.addColorStop(1, 'rgba(240, 255, 252, ' + 0.95 * alpha + ')');
      ctx.fillStyle = fill;
      ctx.fill();
      if (!echo) {
        glow(ctx, ox + fx * size, oy + fy * size, size * 0.9, 'rgba(' + SPELLS.chord + ', 1)', 0.35 * alpha);
        for (const side of [-1, 1]) {
          const b = a + side * span, tx = ox + Math.cos(b) * size, ty = oy + Math.sin(b) * size;
          glow(ctx, tx, ty, 2.2, 'rgba(240, 255, 252, 1)', 0.8 * alpha);
        }
      }
    }
    ctx.restore();
  }

  _shock(ctx, e, share) {
    const t = share * e.life, k = Math.min(1, t / SHOCK.grow), grow = 1 - Math.pow(1 - k, 2);
    const r = Math.max(3, e.radius * CELL * grow), fade = t < SHOCK.grow ? 1 : Math.max(0, 1 - (t - SHOCK.grow) / SHOCK.tail);
    const band = 0.55 * CELL, rgb = e.rgb || SPELLS.shock, spots = e.centers.map((c) => [at(c.x), at(c.y)]);
    if (!this._shockLayer) this._shockLayer = document.createElement('canvas');
    const layer = this._shockLayer, side = BOARD * SHOCK.zoom;
    if (layer.width !== side) layer.width = layer.height = side;
    const g = layer.getContext('2d');
    g.setTransform(SHOCK.zoom, 0, 0, SHOCK.zoom, 0, 0);
    const discs = (radius) => {
      g.beginPath();
      for (const [x, y] of spots) {
        g.moveTo(x + Math.max(0, radius), y);
        g.arc(x, y, Math.max(0, radius), 0, Math.PI * 2);
      }
      g.fill();
    };
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.imageSmoothingEnabled = true;
    for (const [outer, inner, alpha] of SHOCK.bands) {
      g.globalCompositeOperation = 'source-over';
      g.clearRect(0, 0, BOARD, BOARD);
      g.fillStyle = 'rgba(' + rgb + ', ' + alpha * fade + ')';
      discs(r + band * outer);
      g.globalCompositeOperation = 'destination-out';
      g.fillStyle = '#000';
      discs(r - band * inner);
      ctx.drawImage(layer, 0, 0, BOARD, BOARD);
    }
    ctx.restore();
    ctx.save();
    spots.forEach(([x, y], own) => {
      for (let i = 0; i < 16; i++) {
        const a = i * 0.39 + e.seed + own, d = r * (0.85 + 0.15 * Math.sin(i * 2.3));
        const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * 0.9;
        if (spots.some(([cx, cy], n) => n !== own && Math.hypot(px - cx, py - cy) < r)) continue;
        glow(ctx, px, py, 4, 'rgba(180, 150, 110, 1)', 0.35 * fade);
      }
    });
    ctx.restore();
  }

  _holyMotes(ctx, e, share) {
    const dx = at(e.x2) - at(e.x1), dy = at(e.y2) - at(e.y1), len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < HOLY_LIGHT.motes; i++) {
      const k = Math.max(0, Math.min(1, share * 1.3 - i * 0.075));
      if (k <= 0 || k >= 1) continue;
      const side = (i % 2 ? 1 : -1) * HOLY_LIGHT.wave * (0.5 + i * 0.25) * Math.sin(k * Math.PI);
      const x = at(e.x1) + dx * k + nx * side, y = at(e.y1) + dy * k + ny * side;
      glow(ctx, x, y, e.crit ? 7 : 5.5, HOLY_LIGHT.warm, 0.55);
      glow(ctx, x, y, 2.6, HOLY_LIGHT.core, 0.95);
    }
    ctx.restore();
  }

  _swingOf(t) {
    const swing = this._pose(t).swing, k = swing ? (this.clock - swing.at) / SWORD.life : 1;
    if (k >= 1 || k < 0) return { turn: 0, k: 1 };
    const ease = (v) => v * v * (3 - 2 * v);
    if (k < SWORD.wind) return { turn: SWORD.back * ease(k / SWORD.wind), k };
    if (k < SWORD.cut) return { turn: SWORD.back - (SWORD.back + SWORD.sweep) * ease((k - SWORD.wind) / (SWORD.cut - SWORD.wind)), k };
    return { turn: -SWORD.sweep * (1 - ease((k - SWORD.cut) / (1 - SWORD.cut))), k };
  }

  _hand(t, x, y, facing) {
    const dx = SWORD.hand[0] - HERO_X, dy = SWORD.hand[1] - HERO_Y, u = MODEL_UNIT * ANGEL_BODY;
    return [x + (dx * Math.cos(facing) - dy * Math.sin(facing)) * u, y + (dx * Math.sin(facing) + dy * Math.cos(facing)) * u];
  }

  _bladeTip(t) {
    const pose = this._pose(t), facing = turnOf(pose.angle, HERO_TURN_STEPS) * Math.PI * 2 / HERO_TURN_STEPS;
    const [hx, hy] = this._hand(t, at(pose.x), at(pose.y) - (pose.lift || 0), facing);
    const b = facing + this._swingOf(t).turn, long = SWORD.blade * MODEL_UNIT;
    return { x: (hx + Math.sin(b) * long - EDGE) / CELL, y: (hy - Math.cos(b) * long - EDGE) / CELL };
  }

  _sword(ctx, t, x, y, facing) {
    const [hx, hy] = this._hand(t, x, y, facing), { turn, k } = this._swingOf(t), smite = t.runes.has('smite');
    const b = facing + turn, fx = Math.sin(b), fy = -Math.cos(b), sx = -fy, sy = fx, u = MODEL_UNIT;
    const long = SWORD.blade * u, wide = SWORD.wide * u / 2, gx = hx + fx * 1.2 * u, gy = hy + fy * 1.2 * u;
    const tipX = gx + fx * long, tipY = gy + fy * long;
    ctx.save();
    if (k < SWORD.cut && k > SWORD.wind * 0.6) {
      const from = facing + SWORD.back, inner = long * 0.35, outer = long * 1.08;
      const trail = ctx.createRadialGradient(gx, gy, inner, gx, gy, outer);
      trail.addColorStop(0, 'rgba(255, 245, 210, 0)');
      trail.addColorStop(0.6, smite ? 'rgba(255, 255, 255, .85)' : 'rgba(255, 236, 190, .7)');
      trail.addColorStop(1, 'rgba(255, 200, 120, 0)');
      ctx.fillStyle = trail;
      ctx.beginPath();
      const a0 = from - Math.PI / 2, a1 = b - Math.PI / 2;
      ctx.arc(gx, gy, outer, Math.min(a0, a1), Math.max(a0, a1));
      ctx.arc(gx, gy, inner, Math.max(a0, a1), Math.min(a0, a1), true);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'lighter';
    const shine = 0.5 + 0.5 * Math.sin(this.clock * 3 + t.x), tones = smite ? HOLY_BLADE : RED_BLADE;
    for (let i = 1; i <= 4; i++) {
      const f = i / 5;
      glow(ctx, gx + fx * long * f, gy + fy * long * f, 4.5, smite ? HOLY_LIGHT.warm : 'rgba(255, 90, 70, 1)',
        0.16 + 0.06 * shine);
    }
    ctx.globalCompositeOperation = 'source-over';
    const blade = ctx.createLinearGradient(gx - sx * wide, gy - sy * wide, gx + sx * wide, gy + sy * wide);
    [0, 0.35, 0.5, 0.65, 1].forEach((stop, i) => blade.addColorStop(stop, tones[i]));
    ctx.fillStyle = blade;
    ctx.strokeStyle = smite ? 'rgba(70, 48, 6, .7)' : 'rgba(40, 6, 6, .7)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(gx - sx * wide, gy - sy * wide);
    ctx.lineTo(gx + fx * long * 0.86 - sx * wide * 0.8, gy + fy * long * 0.86 - sy * wide * 0.8);
    ctx.quadraticCurveTo(tipX - sx * wide * 0.3, tipY - sy * wide * 0.3, tipX, tipY);
    ctx.quadraticCurveTo(tipX + sx * wide * 0.3, tipY + sy * wide * 0.3,
      gx + fx * long * 0.86 + sx * wide * 0.8, gy + fy * long * 0.86 + sy * wide * 0.8);
    ctx.lineTo(gx + sx * wide, gy + sy * wide);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.lineCap = 'round';
    ctx.strokeStyle = smite ? '#c9a227' : '#b91c1c';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(gx, gy, SWORD.ring * u, 0, Math.PI * 2);
    ctx.stroke();
    const guard = SWORD.guard * u;
    for (const [width, color] of [[2.6, '#7a5a10'], [1.8, '#e0b43a'], [0.7, '#fff3c4']]) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(gx - sx * guard, gy - sy * guard);
      ctx.lineTo(gx + sx * guard, gy + sy * guard);
      ctx.stroke();
    }
    const px = gx - fx * SWORD.grip * u, py = gy - fy * SWORD.grip * u;
    ctx.strokeStyle = '#8a6418';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(px, py);
    ctx.stroke();
    ctx.fillStyle = '#f5d77a';
    ctx.beginPath();
    ctx.arc(px, py, 1.2, 0, Math.PI * 2);
    ctx.fill();
    if (smite) this._holyFlame(ctx, gx, gy, fx, fy, long, t);
    ctx.restore();
  }

  _holyFlame(ctx, gx, gy, fx, fy, long, t) {
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const k = (this.clock * 0.8 + i / 4 + t.x * 0.13) % 1, along = 0.2 + ((i * 0.37) % 1) * 0.75;
      const x = gx + fx * long * along + (i % 2 ? 1 : -1) * (1 + k * 2), y = gy + fy * long * along - k * 7;
      glow(ctx, x, y, 2.6, HOLY_LIGHT.warm, 0.7 * Math.sin(k * Math.PI));
      glow(ctx, x, y, 1.1, HOLY_LIGHT.core, 0.9 * Math.sin(k * Math.PI));
    }
    ctx.globalCompositeOperation = 'source-over';
  }


  _holyRing(ctx, e, share) {
    const x = at(e.x), y = at(e.y), grow = 1 - Math.pow(1 - share, 2.4), r = Math.max(2, e.radius * CELL * grow);
    const fade = 1 - share, band = HOLY_RING.band * CELL;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, x, y, r, HOLY_LIGHT.warm, 0.18 * fade);
    const ring = ctx.createRadialGradient(x, y, Math.max(0, r - band), x, y, r + band * 0.4);
    ring.addColorStop(0, 'rgba(255, 236, 170, 0)');
    ring.addColorStop(0.7, 'rgba(255, 248, 220, ' + (0.85 * fade) + ')');
    ring.addColorStop(1, 'rgba(255, 210, 120, 0)');
    ctx.fillStyle = ring;
    ctx.beginPath();
    ctx.arc(x, y, r + band * 0.4, 0, Math.PI * 2);
    ctx.arc(x, y, Math.max(0, r - band), 0, Math.PI * 2, true);
    ctx.fill();
    for (let i = 0; i < 18; i++) {
      const a = i * 0.349 + e.seed + Math.sin(this.clock * 2 + i) * 0.1, d = r + Math.sin(i * 2.7 + this.clock * 5) * band * 0.3;
      glow(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, 4, HOLY_LIGHT.core, 0.7 * fade);
    }
    ctx.restore();
  }

  _judgement(ctx, e, share) {
    const pose = this._pose(e.tower), x = at(pose.x), y = at(pose.y), r = JUDGEMENT.reach * CELL * share;
    const band = JUDGEMENT.band * CELL, fade = 1 - share * share;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.25 * (1 - share);
    ctx.fillStyle = '#fff7da';
    ctx.fillRect(0, 0, BOARD, BOARD);
    ctx.globalAlpha = 1;
    const ring = ctx.createRadialGradient(x, y, Math.max(0, r - band), x, y, r + band * 0.3);
    ring.addColorStop(0, 'rgba(255, 236, 170, 0)');
    ring.addColorStop(0.75, 'rgba(255, 255, 245, ' + (0.95 * fade) + ')');
    ring.addColorStop(1, 'rgba(255, 214, 120, 0)');
    ctx.fillStyle = ring;
    ctx.beginPath();
    ctx.arc(x, y, r + band * 0.3, 0, Math.PI * 2);
    ctx.arc(x, y, Math.max(0, r - band), 0, Math.PI * 2, true);
    ctx.fill();
    ctx.restore();
  }

  _vigil(ctx, e, share) {
    const pose = this._pose(e.tower), facing = turnOf(pose.angle, HERO_TURN_STEPS) * Math.PI * 2 / HERO_TURN_STEPS;
    const hilt = (HERO_Y - 10.4) * MODEL_UNIT * ANGEL_BODY;
    const x = at(pose.x) + Math.sin(facing) * hilt, y = at(pose.y) - Math.cos(facing) * hilt;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, x, y, 8 + 26 * share, HOLY_LIGHT.warm, 0.35 + 0.5 * share);
    glow(ctx, x, y, 4 + 8 * share, HOLY_LIGHT.core, 0.9);
    ctx.lineCap = 'round';
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6 + this.clock * 0.6, long = (8 + 30 * share) * (0.7 + 0.3 * Math.sin(this.clock * 7 + i));
      const ray = ctx.createLinearGradient(x, y, x + Math.cos(a) * long, y + Math.sin(a) * long);
      ray.addColorStop(0, HOLY_LIGHT.ray + (0.8 * share + 0.2) + ')');
      ray.addColorStop(1, HOLY_LIGHT.ray + '0)');
      ctx.strokeStyle = ray;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * long, y + Math.sin(a) * long);
      ctx.stroke();
    }
    ctx.restore();
  }

  _thrust(t) {
    const k = (this.clock - this._pose(t).staff.at) / STAFF_HIT.life;
    const ease = (v) => 1 - Math.pow(1 - Math.max(0, Math.min(1, v)), 3);
    return k < STAFF_ROD.reach ? ease(k / STAFF_ROD.reach) : k > 1 - STAFF_ROD.back
      ? 1 - ease((k - 1 + STAFF_ROD.back) / STAFF_ROD.back) : 1;
  }

  _rod(ctx, t, x, y, facing, out) {
    const pose = this._pose(t), job = pose.staff, u = MODEL_UNIT * sizeOf(t.look);
    const rx = STAFF_ROD.rear[0] - HERO_X, ry = STAFF_ROD.rear[1] - HERO_Y, px = x + (rx * Math.cos(facing) - ry * Math.sin(facing)) * u;
    const py = y + (rx * Math.sin(facing) + ry * Math.cos(facing)) * u;
    const spot = job.mob && !job.mob.dead ? this.shown.get(job.mob.id) || job.mob : null;
    const tx = spot ? at(spot.x) : at(job.x2), ty = spot ? at(spot.y) - (spot.lift || 0) : at(job.y2);
    const ax = Math.sin(facing), ay = -Math.cos(facing), full = Math.max(0, (tx - px) * ax + (ty - py) * ay);
    const rest = 22 * u, long = rest + Math.max(0, full - rest) * out, nx = -ay, ny = ax, w = STAFF_ROD.wide * u / 2;
    const ex = px + ax * long, ey = py + ay * long;
    ctx.save();
    const body = ctx.createLinearGradient(px + nx * w, py + ny * w, px - nx * w, py - ny * w);
    body.addColorStop(0, '#0b1220');
    body.addColorStop(0.3, '#4b5563');
    body.addColorStop(0.55, '#1f2937');
    body.addColorStop(1, '#05080f');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(px + nx * w, py + ny * w);
    ctx.lineTo(ex + nx * w, ey + ny * w);
    ctx.lineTo(ex - nx * w, ey - ny * w);
    ctx.lineTo(px - nx * w, py - ny * w);
    ctx.closePath();
    ctx.fill();
    const cap = STAFF_ROD.cap * u;
    for (const [sx, sy, dir] of [[px, py, 1], [ex, ey, -1]]) {
      const fx = sx + ax * cap * dir, fy = sy + ay * cap * dir;
      const metal = ctx.createLinearGradient(sx + nx * w, sy + ny * w, sx - nx * w, sy - ny * w);
      metal.addColorStop(0, '#6b7280');
      metal.addColorStop(0.35, '#f3f4f6');
      metal.addColorStop(1, '#4b5563');
      ctx.fillStyle = metal;
      ctx.beginPath();
      ctx.moveTo(sx + nx * w * 1.05, sy + ny * w * 1.05);
      ctx.quadraticCurveTo(sx - ax * dir * w * 0.9, sy - ay * dir * w * 0.9, sx - nx * w * 1.05, sy - ny * w * 1.05);
      ctx.lineTo(fx - nx * w * 1.05, fy - ny * w * 1.05);
      ctx.lineTo(fx + nx * w * 1.05, fy + ny * w * 1.05);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = '#57534e';
    ctx.lineWidth = 0.7;
    for (const f of [7.5, 8.5, 12.5, 13.5]) {
      const bx = px + ax * f * u, by = py + ay * f * u;
      ctx.beginPath();
      ctx.moveTo(bx + nx * w, by + ny * w);
      ctx.lineTo(bx - nx * w, by - ny * w);
      ctx.stroke();
    }
    ctx.restore();
  }

  _mantras(ctx, t) {
    const own = MANTRAS.filter((id) => t.runes.has(id));
    if (!own.length) return;
    const pose = this._pose(t), x = at(pose.x), y = at(pose.y), r = HOLY.mantra.radius * CELL, seed = t.x * 7 + t.y * 13;
    const master = own.length === MANTRAS.length;
    const tint = (shift) => {
      if (!master) return null;
      const k = ((this.clock * 0.35 + shift) % 1 + 1) % 1 * 3, a = Math.floor(k), f = k - a;
      const from = MANTRA_LOOKS[MANTRAS[a]].split(',').map(Number), to = MANTRA_LOOKS[MANTRAS[(a + 1) % 3]].split(',').map(Number);
      return from.map((v, i) => Math.round(v + (to[i] - v) * f)).join(', ');
    };
    const looks = master ? [tint(0)] : own.map((id) => MANTRA_LOOKS[id]);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    looks.forEach((rgb, n) => {
      glow(ctx, x, y, r, 'rgba(' + rgb + ', 1)', (0.09 + 0.03 * Math.sin(this.clock * 1.6 + seed + n)) / looks.length);
      rim(ctx, x, y, r * (1 - n * 0.025), rgb, 0.32);
    });
    const count = master ? 18 : 8;
    for (let n = 0; n < (master ? 1 : looks.length); n++) {
      for (let i = 0; i < count; i++) {
        const k = (this.clock * 0.22 + noise(i + n * 40, seed) + n / 3) % 1;
        const a = (i + n / looks.length) * Math.PI * 2 / count + noise(i + 7 + n * 40, seed) * 0.5;
        const d = r * (0.25 + 0.68 * noise(i + 19 + n * 40, seed)), px = x + Math.cos(a) * d, py = y + Math.sin(a) * d - k * 16;
        const rgb = master ? tint(i / count) : looks[n], alpha = Math.sin(k * Math.PI);
        glow(ctx, px, py, 6, 'rgba(' + rgb + ', 1)', 0.8 * alpha);
        glow(ctx, px, py, 2.2, 'rgba(255, 245, 235, 1)', 0.85 * alpha);
      }
    }
    if (master) {
      for (let i = 0; i < 8; i++) {
        const phase = (this.clock * 0.5 + noise(i + 90, seed)) % 1, shine = Math.sin(phase * Math.PI);
        const a = noise(i + 120, seed) * Math.PI * 2, d = r * Math.sqrt(noise(i + 150, seed)) * 0.9;
        twinkle(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.85, 2 + shine * 3, shine * 0.8);
      }
    }
    ctx.restore();
  }


  _leafGlow(ctx, t) {
    const tip = this._muzzle(t), x = at(tip.x), y = at(tip.y);
    glow(ctx, x, y, 9, 'rgba(134, 239, 172, 1)', 0.4 + 0.15 * Math.sin(this.clock * 3 + t.x));
    for (let i = 0; i < 3; i++) {
      const a = this.clock * 2 + i * Math.PI * 2 / 3;
      bit(ctx, x + Math.cos(a) * 4, y + Math.sin(a) * 3, 2, LEAF_TONES[i], i + Math.floor(this.clock * 6));
    }
  }

  _mutedOn(ctx, x, y, size) {
    const tick = Math.floor(this.clock * 12);
    for (let i = 0; i < 3; i++) {
      bit(ctx, x + (noise(i, tick) - 0.5) * size, y - size * 0.45 + (noise(i + 5, tick) - 0.5) * size * 0.4, 2,
        i % 2 ? '#a5f3fc' : '#22d3ee', i + tick);
    }
  }

  _nukeFlight(ctx, e, share) {
    const spot = e.mob && !e.mob.dead ? this.shown.get(e.mob.id) : null;
    if (spot) {
      e.x2 = spot.x;
      e.y2 = spot.y;
    }
    const point = (s) => [at(e.x1 + (e.x2 - e.x1) * s), at(e.y1 + (e.y2 - e.y1) * s) - Math.sin(s * Math.PI) * e.arc];
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
    reticle(ctx, tx, ty, 6.5 * (2 + pulse), 0.7);
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
    sprite(ctx, nukeSprite(), x, y, Math.atan2(-(nx - x), ny - y + 1e-6), 2.2, 0, 64);
  }

  _vents(ctx, battle) {
    for (const vent of battle.vents) {
      const lit = Math.floor(this.clock * 3 + vent.x) % 2 === 0, x = at(vent.cx), y = at(vent.cy);
      const blue = vent.tower.runes.has('blue'), tones = blue ? BLUE_FLAME : FLAME;
      glow(ctx, x, y, 22, blue ? 'rgba(74, 163, 255, .9)' : 'rgba(255, 120, 30, .9)',
        0.3 + 0.1 * Math.sin(this.clock * 5 + vent.x));
      sprite(ctx, ventSprite(lit, blue), x, y, 0, 2);
      for (let i = 0; i < 4; i++) {
        const rise = (this.clock * 0.7 + i / 4 + vent.x * 0.37) % 1;
        ctx.globalAlpha = 1 - rise;
        bit(ctx, x + Math.sin(rise * 5 + i * 1.7) * 3, y - 2 - rise * 18, 2, tones[i % 3],
          i + Math.floor(this.clock * 5));
      }
      ctx.globalAlpha = 1;
    }
  }

  _venoms(ctx, battle) {
    const now = battle.time;
    for (const trap of battle.traps) smooth(ctx, trapSprite(now < trap.openAt), at(trap.x), at(trap.y), trap.angle, 1.1);
    for (const puddle of battle.puddles) this._puddle(ctx, puddle, now);
    for (const cloud of battle.clouds) this._gas(ctx, cloud, now);
    for (const pot of battle.cauldrons) this._cauldron(ctx, pot);
  }

  _cauldron(ctx, pot) {
    const tone = pot.tower.runes.has('plague') ? 'plague' : 'toxic', brew = BREWS[tone], x = at(pot.cx), y = at(pot.cy);
    const unit = POT_SCALE, lx = x, ly = y - 1.4 * unit, rx = 6.4 * unit, ry = 5.4 * unit;
    glow(ctx, x, y - 2, 16, VENOM[tone], 0.3 + 0.08 * Math.sin(this.clock * 4 + pot.x));
    smooth(ctx, cauldronSprite(tone === 'plague'), x, y, 0, 0.95);
    ctx.save();
    for (let i = 0; i < 6; i++) {
      const cycle = this.clock * 1.2 + i * 0.41 + pot.x * 0.3, phase = cycle % 1, round = Math.floor(cycle);
      const a = noise(round * 7 + i, pot.y) * Math.PI * 2, d = Math.sqrt(noise(round * 7 + i + 3, pot.x)) * 0.7;
      const bx = lx + Math.cos(a) * rx * d, by = ly + Math.sin(a) * ry * d;
      if (phase < 0.8) {
        const r = 1 + phase * 2.4;
        ctx.globalAlpha = 1;
        lump(ctx, bx, by, r, r * 0.88, i + round, 0.12, 7);
        ctx.fillStyle = brew[2];
        ctx.fill();
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = brew[0];
        ctx.stroke();
        lump(ctx, bx - r * 0.35, by - r * 0.35, r * 0.32, r * 0.24, i + round + 5, 0.1, 6);
        ctx.fillStyle = brew[3];
        ctx.fill();
      } else {
        const pop = (phase - 0.8) / 0.2;
        ctx.globalAlpha = 1 - pop;
        ctx.lineWidth = 0.7;
        ctx.strokeStyle = brew[3];
        lump(ctx, bx, by, 2.2 + pop * 2, 1.9 + pop * 1.6, i + round, 0.18, 7);
        ctx.stroke();
      }
    }
    ctx.restore();
    for (let i = 0; i < 6; i++) {
      const rise = (this.clock * 0.45 + i / 6 + pot.x * 0.31) % 1, drift = Math.sin(rise * 3 + i * 2.1) * 4;
      puff(ctx, lx + drift + (noise(i, pot.x) - 0.5) * rx, ly - rise * 22, 3 + rise * 7, STEAM[tone][0], STEAM[tone][1],
        (1 - rise) * Math.min(1, rise * 5) * 0.95);
    }
  }

  _puddle(ctx, puddle, now) {
    const grow = Math.min(1, (now - puddle.born) / 0.25), fade = Math.min(1, (puddle.until - now) / 0.8);
    const black = puddle.plague, seed = Math.round(puddle.x * 7 + puddle.y * 13) % 9;
    const long = puddle.radius * CELL * 0.95, wide = CELL * 0.47;
    const shape = puddleShape(long / ZOOM, wide / ZOOM, seed, black ? 'plague' : 'poison');
    const x = at(puddle.x), y = at(puddle.y), turn = puddle.angle || 0, cos = Math.cos(turn), sin = Math.sin(turn);
    ctx.globalAlpha = 0.9 * fade;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(turn);
    const scale = ZOOM * grow / shape.res;
    ctx.drawImage(shape, -shape.width * scale / 2, -shape.height * scale / 2, shape.width * scale, shape.height * scale);
    ctx.restore();
    for (let i = 0; i < 7; i++) {
      const phase = (this.clock * 0.7 + i * 0.29 + puddle.x * 0.37) % 1, a = i * 1.9 + puddle.y * 3;
      const u = Math.cos(a) * long * 0.6, v = Math.sin(a) * wide * 0.45, size = 1 + Math.round(phase * 3);
      const bx = x + u * cos - v * sin, by = y + u * sin + v * cos;
      const look = PUDDLES[black ? 'plague' : 'poison'], r = 0.8 + size * 0.55;
      ctx.globalAlpha = fade * (phase < 0.85 ? 0.95 : 0.35 * (1 - (phase - 0.85) / 0.15));
      lump(ctx, bx, by, phase < 0.85 ? r : r + (phase - 0.85) * 12, (phase < 0.85 ? r : r + (phase - 0.85) * 10) * 0.85,
        i, 0.1, 8);
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = look.tones[0];
      if (phase < 0.85) {
        ctx.fillStyle = look.tones[3];
        ctx.fill();
        ctx.stroke();
        lump(ctx, bx - r * 0.35, by - r * 0.35, r * 0.3, r * 0.22, i + 9, 0.1, 6);
        ctx.fillStyle = look.shine[0];
        ctx.fill();
      } else {
        ctx.strokeStyle = look.shine[0];
        ctx.stroke();
      }
    }
    for (let i = 0; i < 4; i++) {
      const rise = (this.clock * 0.35 + i / 4 + puddle.y * 0.21) % 1, u = Math.sin(i * 2.3 + this.clock) * long * 0.5;
      puff(ctx, x + u * cos, y + u * sin - rise * 18, 2.5 + rise * 3, black ? 'rgba(167, 139, 250, .8)'
        : 'rgba(217, 249, 157, .8)', black ? 'rgba(124, 58, 237, .4)' : 'rgba(163, 230, 53, .4)', 0.6 * fade * (1 - rise));
    }
    ctx.globalAlpha = 1;
  }

  _gas(ctx, cloud, now) {
    const show = Math.max(0, Math.min(1, (now - cloud.born) / 0.25, (cloud.until - now) / 0.5));
    const brew = BREWS[cloud.plague ? 'plague' : 'toxic'], x = at(cloud.x), y = at(cloud.y), r = cloud.radius * CELL;
    const seed = Math.round(cloud.born * 53) % 89;
    glow(ctx, x, y, r, VENOM[cloud.plague ? 'plague' : 'toxic'], 0.5 * show);
    for (let i = 0; i < 20; i++) {
      const a = i / 20 * Math.PI * 2 + this.clock * (i % 2 ? 0.5 : -0.4) + seed;
      const d = r * (0.15 + 0.65 * noise(i, seed)), drift = Math.sin(this.clock * 1.3 + i) * 2;
      ctx.globalAlpha = (0.6 + 0.25 * noise(i + 3, seed)) * show;
      bit(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.75 + drift - 3, i % 3 ? 5 : 7, brew[1 + (i % 3)], i + seed);
    }
    ctx.globalAlpha = 1;
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
      const slowed = mob.chill > 0 || mob.slowUntil > now && !(mob.thicketUntil > now) || frozen;
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
      if (mob.markUntil > now || mob.eyed) {
        const side = 13 * Math.max(2, Math.round(size / 13 + 0.4))
          + 2 * Math.round(Math.sin(this.clock * 6 + mob.id) + 1);
        const tone = mob.eyed ? RETICLES.green : RETICLES.red;
        reticle(ctx, x, y - lift, side / 2, 0.55 + 0.1 * Math.sin(this.clock * 6), 0, tone);
      }
      if (mob.charge && mob.charge.until > now) this._chargedOn(ctx, mob, x, y - lift, size);
      if (mob.netUntil > now) this._netOn(ctx, x, y - lift, size);
      if (mob.rootUntil > now) this._rootOn(ctx, mob, x, y - lift, size, now);
      if (mob.muteUntil > now && mob.muteUntil > mob.purgeUntil) this._mutedOn(ctx, x, y - lift, size);
      if (mob.rot) this._rotOn(ctx, mob, x, y - lift, size);
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

  _rootOn(ctx, mob, x, y, size, now) {
    const r = Math.round(Math.max(9, size * 0.45)), image = snareSprite(r), w = image.width, h = image.height;
    const grow = Math.max(0, Math.min(1, (now - mob.rootAt) / 0.3, (mob.rootUntil - now) / 0.3));
    const foot = h / 2 + r * 0.55 + 4, cut = Math.round(foot * (1 - grow));
    glow(ctx, x, y + r * 0.6, r * 1.2, 'rgba(26, 17, 9, .95)', 0.45 * grow);
    if (cut >= h) return;
    ctx.drawImage(image, 0, cut, w, h - cut, Math.round(x - w / 2), Math.round(y - h / 2) + cut, w, h - cut);
  }

  _netOn(ctx, x, y, size) {
    const r = Math.max(9, size * 0.46), ties = [];
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3 + 0.3;
      ties.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
    }
    const outline = () => {
      ctx.beginPath();
      ctx.moveTo(ties[0][0], ties[0][1]);
      ties.forEach((p, i) => {
        const q = ties[(i + 1) % ties.length], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
        ctx.quadraticCurveTo(x + (mx - x) * NET.bend, y + (my - y) * NET.bend, q[0], q[1]);
      });
      ctx.closePath();
    };
    ctx.save();
    outline();
    ctx.clip();
    const fill = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, 0, x, y, r);
    fill.addColorStop(0, 'rgba(255, 240, 200, .18)');
    fill.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
    fill.addColorStop(1, 'rgba(40, 24, 8, .3)');
    ctx.fillStyle = fill;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    for (const [width, color, shift] of [[1.6, 'rgba(30, 18, 6, .45)', 0.8], [1, 'rgba(214, 180, 120, .95)', 0]]) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      for (let i = -3; i <= 3; i++) {
        const o = i * r / 2.6;
        ctx.beginPath();
        ctx.moveTo(x + o - r + shift, y - r + shift);
        ctx.quadraticCurveTo(x + o + shift, y + shift - Math.abs(o) * 0.12, x + o + r + shift, y + r + shift);
        ctx.moveTo(x + o + r + shift, y - r + shift);
        ctx.quadraticCurveTo(x + o + shift, y + shift - Math.abs(o) * 0.12, x + o - r + shift, y + r + shift);
        ctx.stroke();
      }
    }
    ctx.restore();
    ctx.strokeStyle = '#8a6a3c';
    ctx.lineWidth = 2;
    outline();
    ctx.stroke();
    for (const [tx, ty] of ties) square(ctx, tx, ty, 3, '#d6b478');
  }

  _rotOn(ctx, mob, x, y, size) {
    for (let i = 0; i < 3; i++) {
      const drip = (this.clock * 1.2 + i / 3 + mob.id * 0.17) % 1, side = (i - 1) * size * 0.22;
      ctx.globalAlpha = 1 - drip;
      square(ctx, x + side, y + size * 0.1 + drip * 8, 2, i % 2 ? '#3f6212' : '#1a2e05');
    }
    ctx.globalAlpha = 1;
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
    const blue = mob.burn && Array.from(mob.burn.values()).some((fire) => fire.tower.runes.has('blue'));
    const black = Boolean(mob.black && mob.black.size);
    if (mob.burn || black) {
      layers.push([black ? 'black' : blue ? 'blue' : 'burn', 0.3 + 0.12 * Math.sin(this.clock * 17 + mob.id)]);
    }
    if (mob.states) {
      for (const name of STATE_TINTS) if (this.battle.state(mob, name)) layers.push([name, 0.3]);
    }
    if (slowed) layers.push(['chill', frozen ? 0.5 : 0.26]);
    if (mob.fury && !mob.kind) layers.push(['fury', 0.22]);
    for (const [kind, strength] of layers) {
      ctx.globalAlpha = strength;
      sprite(ctx, tintSprite(image, TINTS[kind]), x, y, angle);
    }
    ctx.globalAlpha = 1;
    if (mob.marks) {
      let k = 0;
      for (const element of mob.marks.keys()) {
        square(ctx, x - 5 + k * 3, y - 11 + Math.round(Math.sin(this.clock * 4 + k)), 2, MARK_COLORS[element]);
        k += 1;
      }
    }
    if (mob.burn || black) {
      const tones = black ? BLACK_FLAME : blue ? BLUE_FLAME : FLAME;
      for (let i = 0; i < 6; i++) {
        const rise = (this.clock * 14 + i * 2.7 + mob.id) % 12, side = Math.sin(i * 2.1 + mob.id) * 7;
        bit(ctx, x + side, y - 2 - rise, rise < 4 ? 3 : 2, tones[Math.min(4, Math.floor(rise / 2.6))],
          i + mob.id + this.clock * 9);
      }
    }
  }

  _pose(t) {
    let pose = this.poses.get(t);
    if (!pose) {
      pose = { angle: t.angle, aim: t.angle, kick: 0, flash: 0, x: t.cx, y: t.cy, queue: [], lock: null };
      this.poses.set(t, pose);
    }
    return pose;
  }

  _towers(ctx, battle, dt, highlight, still) {
    const now = battle.time;
    for (const t of battle.towers) {
      const pose = this._pose(t), lit = highlight && highlight.has(t.player.login);
      let spot = { x: t.cx, y: t.cy, lift: 0 }, look = t.look;
      if (t.pull && now < t.pull.end) {
        const k = 1 - Math.pow(1 - Math.max(0, (now - t.pull.start) / (t.pull.end - t.pull.start)), 2);
        spot = { x: t.pull.fx + (t.cx - t.pull.fx) * k, y: t.pull.fy + (t.cy - t.pull.fy) * k,
          lift: Math.sin(k * Math.PI) * (t.pull.fly ? 22 : t.pull.dash ? 0 : 10) };
        if (t.pull.fly) {
          look = t.look + (Math.floor(this.clock * 7) % 2 ? '-flap' : '-fly');
          pose.aim = Math.atan2(t.cx - t.pull.fx, -(t.cy - t.pull.fy));
        }
      }
      if (t.style === 'angel' && t.planted) look = t.look + '-kneel';
      else if (t.style === 'angel' && !(t.pull && now < t.pull.end)) {
        const u = (this.clock * HOVER.rate + t.x * 0.37) % 1, seed = t.x * 1.7 + t.y * 2.3;
        spot.lift = HOVER.lift + HOVER.bob * Math.sin(u * Math.PI * 2);
        spot.x += SWORD.drift[0] * Math.sin(this.clock * 0.55 + seed);
        spot.y += SWORD.drift[1] * Math.sin(this.clock * 0.9 + seed * 1.3);
        look = t.look + '-w' + HOVER.frames[Math.floor(((u + 0.25) % 1) * 4)];
      }
      else if (t.style === 'dragon' && battle.aloft(t) && !(t.pull && now < t.pull.end)) {
        spot.lift = HOVER.lift + HOVER.bob * Math.sin((this.clock * HOVER.rate + t.x * 0.37) * Math.PI * 2);
        look = t.look + (Math.floor(this.clock * 4 + t.x) % 2 ? '-flap' : '-fly');
      }
      if (t.style === 'monk' && pose.staff && this.clock < pose.staff.until) look = t.look + '-strike';
      const act = pose.act && this.clock < pose.act.until ? pose.act : null;
      if (act) look = t.look + '-' + (act.cast && this.clock >= act.cast ? 'cast' : act.frame);
      else if (pose.song && this.clock < pose.song.until && Math.floor(this.clock * SPELLS.play) % 2) {
        look = t.look + '-strum';
      }
      if (t.beam) look = t.look + '-beam';
      if (t.style === 'raiju' && t.howlAt !== undefined && t.howlAt !== null && !act) {
        look = t.look + ((now - t.howlAt) % WOLF.howl.call < DASH_FX.inhale ? '-howl2' : '-howl');
      }
      if (t.style === 'thor' && pose.hammer) {
        const k = this.clock - pose.hammer.start, flight = pose.hammer.out + pose.hammer.back;
        if (k < STORM_FX.throw) look = t.look + '-throw';
        else if (k < flight) look = t.look + '-empty';
        else if (k < flight + STORM_FX.catch) look = t.look + '-catch';
        else pose.hammer = null;
      }
      pose.x = spot.x;
      pose.y = spot.y;
      pose.lift = spot.lift;
      pose.look = look;
      const x = at(spot.x), y = at(spot.y) - spot.lift;
      if (!still) {
        if (!(t.pull && now < t.pull.end)) this._steer(t, pose);
        if (t.beam && !t.beam.mob.dead) pose.aim = Math.atan2(t.beam.mob.x - t.cx, -(t.beam.mob.y - t.cy));
        pose.angle = heavyGun(t) ? t.angle : turnToward(pose.angle, pose.aim, dt);
        this._release(t, pose);
        pose.kick = Math.max(0, pose.kick - dt);
        pose.flash = Math.max(0, pose.flash - dt);
      }
      if (t.pull && now < t.pull.end && t.pull.dash) {
        this._orb(ctx, x, y - 4, DASH_FX.size, 1, 4);
        continue;
      }
      const aloft = t.style === 'angel' || t.style === 'dragon' && spot.lift > 0;
      const hover = aloft ? Math.max(HOVER.shadow, 1 - Math.max(0, spot.lift - HOVER.lift) / (HOVER.bob * 6)) : 1;
      ctx.fillStyle = aloft ? 'rgba(0, 0, 0, .22)' : 'rgba(0, 0, 0, .32)';
      ctx.beginPath();
      ctx.ellipse(at(spot.x), at(spot.y) + 7, 12 * hover, 5 * hover, 0, 0, Math.PI * 2);
      ctx.fill();
      if (lit) glow(ctx, x, y, 22, 'rgba(255, 255, 255, .9)', 0.5);
      ctx.globalAlpha = t.busy > now && look === t.look ? 0.5 : 1;
      const lift = pose.kick > 0 ? Math.round(pose.kick / KICK * 2) : 0;
      const reload = t.reloadUntil > now && look === t.look ? Math.floor(this.clock * 5) % RELOAD_FRAMES : -1;
      if (FINE_HEROES.test(look)) {
        if (t.cls.id === 'priest') this._holyAura(ctx, t, x, y);
        const facing = turnOf(pose.angle, HERO_TURN_STEPS) * Math.PI * 2 / HERO_TURN_STEPS;
        const lunge = t.style === 'monk' && pose.staff && this.clock < pose.staff.until ? this._thrust(t) : -1;
        const reach = lunge * STAFF_ROD.lunge * MODEL_UNIT * sizeOf(t.look);
        const mx = lunge > 0 ? x + Math.sin(facing) * reach : x, my = lunge > 0 ? y - Math.cos(facing) * reach : y;
        if (lunge >= 0) this._rod(ctx, t, mx, my + lift, facing, lunge);
        smooth(ctx, heroSprite(look, -1), mx, my + lift, facing, ZOOM);
        if (t.style === 'angel' && !t.planted) this._sword(ctx, t, x, y + lift, facing);
        if (t.style === 'raiju') this._furSparks(ctx, t, x, y + lift, facing);
      } else if (heavyGun(t)) smooth(ctx, heroSprite(look, reload), x, y + lift, pose.angle, ZOOM);
      else sprite(ctx, heroSprite(look, reload), x, y, pose.angle, ZOOM, lift, HERO_TURN_STEPS);
      if (t.cls.id === 'priest' && t.style !== 'monk' && t.style !== 'angel') this._holyTip(ctx, t);
      if (t.cls.id === 'sorceress') this._spellGlow(ctx, t);
      if (t.style === 'caller') this._staffZap(ctx, t);
      if (t.style === 'angel' || t.style === 'inquisitor') this._halo(ctx, t, x, y);
      if (pose.flash > 0 && t.cls.id !== 'priest' && t.cls.id !== 'sorceress') {
        const tip = this._muzzle(t), fx = at(tip.x), fy = at(tip.y);
        glow(ctx, fx, fy, 7, 'rgba(255, 236, 160, .95)', 0.9);
        square(ctx, fx, fy, 3, '#ffffff');
      }
      ctx.globalAlpha = 1;
      if (t.style === 'druid') this._leafGlow(ctx, t);
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

  _charges(ctx, battle) {
    const now = battle.time;
    for (const t of battle.towers) {
      const charge = t.charge;
      if (!charge) continue;
      const share = Math.max(0, Math.min(1, (now - charge.at) / (charge.until - charge.at)));
      const look = CHARGES[charge.kind], target = charge.target && !charge.target.dead ? charge.target : null;
      const tip = this._muzzle(t), fx = at(tip.x), fy = at(tip.y);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, fx, fy, 4 + 9 * share, look.glow, 0.45 + 0.45 * share);
      for (let i = 0; i < 6; i++) {
        const k = (this.clock * 2.5 + i / 6) % 1, a = i * 1.05 + this.clock, r = 14 * (1 - k);
        ctx.globalAlpha = k;
        bit(ctx, fx + Math.cos(a) * r, fy + Math.sin(a) * r, 2, look.sparks[i % look.sparks.length],
          i + this.clock * 9);
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
      reticle(ctx, mx, my, 6.5 * (5 - 2.6 * share), 0.5 + 0.2 * share, (1 - share) * Math.PI);
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
      const marked = Boolean(highlight && highlight.has(t.player.login));
      const image = this._nameLabel(t, marked ? 'lit' : '');
      const w = image.width / this.k, h = image.height / this.k;
      const x = Math.max(1, Math.min(BOARD - w - 1, at(pose.x) - w / 2));
      let y = at(pose.y) - (pose.lift || 0) - 23 - (marked ? 2 : 0);
      if (y - h / 2 < EDGE) y = at(pose.y) + 31;
      const box = [x - 1, y - h / 2, x + w + 1, y + h / 2];
      if (taken.some((o) => box[0] < o[2] && o[0] < box[2] && box[1] < o[3] && o[1] < box[3])) continue;
      taken.push(box);
      if (marked) glow(ctx, at(pose.x), y, w * 0.7, 'rgba(255, 110, 110, 1)', 0.3 + 0.12 * Math.sin(this.clock * 2.4));
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
      if (mark) {
        g.lineWidth = 3;
        g.lineJoin = 'round';
        g.strokeStyle = 'rgba(40, 8, 12, .85)';
        g.strokeText(text, 4.5, h / 2 + 0.5);
        g.strokeText(coins, 10 + coin + nameWidth, h / 2 + 0.5);
      } else {
        g.fillStyle = 'rgba(16, 14, 31, .9)';
        roundRect(g, 0, 0, w, h, h / 2 - 0.5);
        g.fill();
      }
      g.fillStyle = mark ? '#ffd2d2' : INK;
      g.fillText(text, 4.5, h / 2 + 0.5);
      g.drawImage(coinSprite(), Math.round(8 + nameWidth), Math.round((h - coin) / 2), coin, coin);
      g.fillStyle = mark ? '#ffe9a8' : '#ffd86b';
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
    const [bx, by] = battle.path[battle.path.length - 1], inward = (v) => Math.min(Math.max(at(v + 0.5), EDGE
      + HEART_ROOM), BOARD - EDGE - HEART_ROOM), x = inward(bx), y = inward(by);
    const low = battle.lives <= battle.maxLives / 4, period = low ? BEAT_FAST : BEAT;
    const phase = (this.clock % period) / period;
    const beat = Math.exp(-phase * 9) + 0.6 * Math.exp(-Math.max(0, phase - 0.22) * 12) * (phase > 0.22 ? 1 : 0);
    const hit = this._hurtAt !== undefined && this.clock - this._hurtAt < 0.35;
    const bitten = battle.mobs.some((mob) => mob.biting && !mob.dead);
    const shake = bitten ? Math.sin(this.clock * 40) * 1.2 : 0;
    const holy = battle.ward || this._aegisAt !== undefined && this.clock - this._aegisAt < AEGIS_SHOW;
    const image = heartSprite(holy ? 'holy' : battle.steel > 0 ? 'steel' : ''), scale = ZOOM / (image.fine || 1)
      * (1 + 0.08 * beat);
    const w = image.width * scale, h = image.height * scale;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, x, y, 32 + 6 * beat, hit || holy ? 'rgba(255, 244, 200, .95)' : 'rgba(255, 70, 100, .9)',
      0.35 + 0.25 * beat);
    ctx.restore();
    ctx.drawImage(image, Math.round(x - w / 2 + shake), Math.round(y - h / 2), Math.round(w), Math.round(h));
    if (hit || bitten) {
      ctx.globalAlpha = hit ? 0.6 * (1 - (this.clock - this._hurtAt) / 0.35) : 0.25 + 0.2 * Math.sin(this.clock * 20);
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(image, Math.round(x - w / 2 + shake), Math.round(y - h / 2), Math.round(w), Math.round(h));
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
    ctx.font = '900 14px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#2a0710';
    const text = String(Math.max(0, battle.lives));
    ctx.strokeText(text, x + shake, y - 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, x + shake, y - 2);
  }

  _steer(t, pose) {
    const lock = pose.lock && this.clock < pose.lock.until ? pose.lock : null;
    const spot = lock ? aimSpot(lock) : pose.queue.length ? aimSpot(pose.queue[0]) : null;
    pose.aim = spot ? bearing(t, spot) : t.angle;
  }

  _face(t, x, y, mob = null, hold = SHOT_HOLD) {
    this._pose(t).lock = { x, y, mob, until: this.clock + hold };
  }

  _fire(t, x, y, mob, spawn, hold = 0) {
    const pose = this._pose(t);
    pose.queue.push({ x, y, mob, mx: mob ? mob.x : x, my: mob ? mob.y : y, spawn, hold, at: this.clock });
    this._release(t, pose);
  }

  _release(t, pose) {
    while (pose.queue.length) {
      const next = pose.queue[0], spot = aimSpot(next), late = this.clock - next.at;
      const off = Math.abs(turnGap(pose.angle, bearing(t, spot)));
      if (off > AIM_SLACK && late < SHOT_WAIT && pose.queue.length <= SHOT_QUEUE) return;
      pose.queue.shift();
      if (off > AIM_SLACK) pose.angle = bearing(t, spot);
      pose.kick = KICK;
      pose.flash = FLASH;
      pose.lock = { x: spot.x, y: spot.y, mob: next.mob, until: this.clock + Math.max(SHOT_HOLD, next.hold) };
      next.spawn(next.x + spot.x - next.mx, next.y + spot.y - next.my, late);
    }
  }

  _sparks(x, y, colors, count, speed, life = 0.35, size = 2) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random() * 0.8);
      this.effects.push({ kind: 'spark', t: 0, life: life * (0.7 + Math.random() * 0.5), x, y, vx: Math.cos(a) * v,
        vy: Math.sin(a) * v, color: colors[i % colors.length], size, ember: FIRE_SPARKS.has(colors[0]),
        seed: Math.floor(Math.random() * BIT_SHAPES) });
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
      const away = event.sx !== undefined;
      let bolt = STYLE_BOLTS[t.style] || BOLTS[t.cls.id] || { look: 'dot', color: t.cls.color, size: 2 };
      if (event.size) bolt = Object.assign({}, bolt, { size: event.size });
      if (event.tone) bolt = Object.assign({}, bolt, { tone: event.tone, color: event.tone === 'plague' ? '#7c3aed' : bolt.color });
      if (event.blue) bolt = Object.assign({}, bolt, { color: '#4aa3ff', blue: true });
      if (event.heavy) {
        bolt = Object.assign({}, bolt, { width: event.heavy === 'mega' ? 5 : 3.5,
          color: event.blue ? '#9bd5ff' : t.cls.id === 'pyro' ? '#ff9a1f' : '#ffffff' });
      }
      if (event.gold) bolt = Object.assign({}, bolt, { color: '#facc15' });
      if (event.element) {
        bolt = Object.assign({}, bolt, { tone: BALL_TONES[event.element],
          look: event.element === 'earth' && !event.size ? 'spear' : 'fireball' });
      }
      const flight = event.time || TRAVEL * (bolt.look === 'lob' ? 2.5 : 1);
      const launch = (x2, y2, late = 0, head = null) => {
        const tip = away ? { x: event.sx, y: event.sy - (event.high ? DRONE_LIFT / CELL : 0) }
          : this._muzzle(t, event.hand || 0);
        add({ kind: 'shot', life: Math.max(FLIGHT_MIN, flight - late), x1: tip.x, y1: tip.y, x2, y2, bolt,
          crit: event.crit, heavy: event.heavy, head, track: t.style === 'enchantress' || t.cls.id === 'thunder' ? event.mob : null });
        if (event.heavy) {
          this._pose(t).flash = FLASH * 3;
          this._sparks(tip.x, tip.y, CHARGES.heavy.sparks, event.heavy === 'mega' ? 14 : 8, 2.4, 0.35);
        }
      };
      if (away) launch(event.x, event.y);
      else if (event.lead) {
        const lead = event.lead, tip = this._muzzle(t), head = Math.atan2(lead.y - tip.y, lead.x - tip.x) + event.bend;
        this._fire(t, lead.x, lead.y, lead, (x2, y2, late) => launch(event.x, event.y, late, head));
      } else this._fire(t, event.x, event.y, event.mob, launch);
    } else if (event.kind === 'strike') {
      const monk = t.style === 'monk', life = monk ? STAFF_HIT.life : SWORD.life;
      this._fire(t, event.x, event.y, event.mob, (x2, y2) => {
        if (monk) this._pose(t).staff = { at: this.clock, until: this.clock + life, mob: event.mob, x2, y2 };
        else this._pose(t).swing = { at: this.clock };
        const big = event.smite || event.heavy;
        this._sparks(x2, y2, big ? ['#ffffff', '#fff7cc', '#fde68a'] : ['#fffbe6', '#fde68a',
          event.crit ? '#ffffff' : '#fbbf24'], big ? 16 : event.crit ? 8 : 4, big ? 2.4 : 1.6, 0.35);
        if (event.smite) add({ kind: 'holyRing', life: 0.45, x: x2, y: y2, radius: 0.8, seed: Math.random() * 6 });
      }, life);
    } else if (event.kind === 'chord') {
      this._fire(t, event.x, event.y, event.mob, () => {
        const tip = this._muzzle(t);
        this._pose(t).act = { frame: 'strum', until: this.clock + SPELLS.strum };
        add({ kind: 'chord', life: event.time, x: tip.x, y: tip.y, angle: event.angle, reach: event.reach });
      }, SPELLS.strum);
    } else if (event.kind === 'song') {
      this._pose(t).song = { kind: event.song, until: this.clock + event.time };
    } else if (event.kind === 'totem') {
      this._sparks(event.x, event.y, [TOTEM_LOOKS[event.totem].edge, '#ffffff'], 12, 1.6, 0.5);
    } else if (event.kind === 'drum') {
      this._pose(t).act = { frame: 'beat', until: this.clock + SPELLS.beat };
      for (const banner of this.battle.banners) {
        if (event.centers.some((c) => c.x === banner.cx && c.y === banner.cy)) banner.flashAt = this.clock;
      }
      add({ kind: 'shock', life: SHOCK.grow + SHOCK.tail, centers: event.centers, radius: event.radius,
        seed: Math.random() * 6 });
    } else if (event.kind === 'conjure') {
      this._face(t, event.x, event.y, event.mob, event.time + SPELLS.act);
      this._pose(t).act = { frame: 'draw', cast: this.clock + event.time, until: this.clock + event.time + SPELLS.act };
    } else if (event.kind === 'holyOrb') {
      const tip = this._bladeTip(t);
      add({ kind: 'holyOrb', life: event.time, x1: tip.x, y1: tip.y, x2: event.x, y2: event.y, mob: event.mob });
    } else if (event.kind === 'holyRing') {
      add({ kind: 'holyRing', life: HOLY_RING.life, x: event.x, y: event.y, radius: event.radius,
        seed: Math.random() * 6 });
      this._sparks(event.x, event.y, ['#ffffff', '#fff7cc', '#fde68a'], 16, 3, 0.5);
    } else if (event.kind === 'lastStand') {
      add({ kind: 'vigil', life: event.time, tower: t });
      this.say('Второй шанс! Ангел защищает сердце', '#fde68a');
    } else if (event.kind === 'judgement') {
      add({ kind: 'judgement', life: JUDGEMENT.life, tower: t });
      for (const mob of event.wiped) {
        const spot = this.shown.get(mob.id) || mob;
        this._sparks(spot.x, spot.y, ['#ffffff', '#fff7cc', '#fde68a'], 8, 1.6, 0.6, 2);
      }
    } else if (event.kind === 'aegis') {
      const [bx, by] = this.battle.path[this.battle.path.length - 1];
      this._aegisAt = this.clock;
      this._sparks(bx + 0.5, by + 0.5, ['#ffffff', '#fff7cc', '#fde68a'], 12, 2, 0.5);
    } else if (event.kind === 'banished') {
      const spot = this.shown.get(event.mob.id) || event.mob;
      this._sparks(spot.x, spot.y, ['#fffbe6', '#fde68a'], 6, 1.2, 0.5);
    } else if (event.kind === 'warded') {
      const [bx, by] = this.battle.path[this.battle.path.length - 1];
      this._sparks(bx + 0.5, by + 0.5, ['#ffffff', '#fde68a'], 8, 1.6, 0.4);
    } else if (event.kind === 'beam') {
      this._fire(t, event.x, event.y, event.mob, (x2, y2) => {
        add({ kind: 'laser', life: LASER.life, tower: t, mob: event.mob, x2, y2, blue: event.blue });
        this._sparks(x2, y2, (event.blue ? BLUE_FLAME : FLAME).slice(0, 3), 18, 3, 0.45, 3);
      }, LASER.life);
    } else if (event.kind === 'flashbang') {
      add({ kind: 'ring', life: 0.4, x: event.x, y: event.y, r: event.radius, color: '#ffffff', width: 3 });
      add({ kind: 'pulse', life: 0.5, x: event.x, y: event.y, r: event.radius * 1.3, color: '#fef9c3', width: 2 });
      this._sparks(event.x, event.y, ['#ffffff', '#fef9c3', '#e5e7eb'], 16, event.radius * 4, 0.4, 2);
    } else if (event.kind === 'burst') {
      add({ kind: 'boom', life: 0.3, x: event.x, y: event.y, r: event.radius, ring: '#e5e7eb' });
      this._sparks(event.x, event.y, ['#e5e7eb', '#9ca3af', '#fff3b0', '#d6a72e'], 14, event.radius * 5, 0.35, 2);
    } else if (event.kind === 'charge') {
      const tip = this._muzzle(t);
      this._sparks(tip.x, tip.y, CHARGES[event.charge].sparks, 6, 1.4, 0.4);
    } else if (event.kind === 'reload') {
      this._sparks(t.cx, t.cy, ['#d6a72e', '#a37a1a', '#fff3b0'], 5, 1.2, 0.5, 2);
    } else if (event.kind === 'rocket') {
      this._fire(t, event.x, event.y, event.mob, (x2, y2, late) => {
        const tip = this._muzzle(t);
        add({ kind: 'rocket', life: Math.max(FLIGHT_MIN, event.time - late), x1: tip.x, y1: tip.y, x2, y2,
          mob: event.mob, big: event.big });
      });
    } else if (event.kind === 'shard') {
      add({ kind: 'shard', life: event.time, x1: event.sx, y1: event.sy, x2: event.x, y2: event.y, mob: event.mob,
        arc: SHARD_ARC });
    } else if (event.kind === 'airburst') {
      add({ kind: 'airburst', life: event.time, x: event.x, y: event.y, points: event.points });
      this._sparks(event.x, event.y - AIRBURST / CELL, ['#e5e7eb', '#9ca3af', '#fff3b0'], 10, 2, 0.35, 2);
    } else if (event.kind === 'mortar') {
      this._fire(t, event.x, event.y, event.mob, (x2, y2, late) => {
        const tip = this._muzzle(t);
        add({ kind: 'mortar', life: Math.max(FLIGHT_MIN, event.time - late), x1: tip.x, y1: tip.y, x2, y2,
          mob: event.mob, arc: event.nuke ? NUKE_ARC : arcOf(tip.x, tip.y, x2, y2), nuke: event.nuke,
          radius: event.radius, shrapnel: event.shrapnel });
        this._sparks(tip.x, tip.y, ['#e5e7eb', '#9ca3af', '#fff3b0'], 5, 1.2, 0.35, 2);
      });
    } else if (event.kind === 'chain') {
      this._fire(t, event.mob.x, event.mob.y, event.mob, () => {
        this._pose(t).act = { frame: 'strike', until: this.clock + STORM_FX.strike };
        const tip = this._muzzle(t);
        add({ kind: 'zap', life: 0.2, x1: tip.x, y1: tip.y, mob: event.mob, x2: event.mob.x, y2: event.mob.y, width: 2.2 });
        this._sparks(event.mob.x, event.mob.y, ['#bfdbfe', '#ffffff', '#fde047'], 5, 1.8, 0.3);
      }, STORM_FX.strike);
    } else if (event.kind === 'jolt') {
      const x2 = event.mob ? event.mob.x : event.x2, y2 = event.mob ? event.mob.y : event.y2 - ROD.tall / CELL;
      add({ kind: 'zap', life: event.thin ? 0.18 : 0.24, x1: event.x, y1: event.y, mob: event.mob, x2, y2,
        width: event.thin ? 1.2 : 2, seed: Math.floor(Math.random() * 97) });
      this._sparks(x2, y2, ['#bfdbfe', '#ffffff', '#fde047'], event.thin ? 2 : 4, 1.4, 0.25);
    } else if (event.kind === 'dash') {
      add({ kind: 'zap', life: event.time + 0.25, x1: event.x1, y1: event.y1, x2: event.x, y2: event.y, width: 3.2, seed: 3 });
      this._sparks(event.x, event.y, ['#bfdbfe', '#ffffff', '#fde047'], 10, 2, 0.35);
    } else if (event.kind === 'globe') {
      this._fire(t, event.mob.x, event.mob.y, event.mob, () => {
        this._pose(t).act = { frame: 'strike', until: this.clock + STORM_FX.strike };
        const tip = this._muzzle(t);
        this._sparks(tip.x, tip.y, ['#bfdbfe', '#ffffff'], 8, 1.6, 0.35);
      }, STORM_FX.strike);
    } else if (event.kind === 'thunderclap') {
      const turn = Math.random() * Math.PI * 2;
      for (let i = 0; i < ROD.bolts; i++) {
        const a = turn + i * Math.PI * 2 / ROD.bolts + (Math.random() - 0.5) * 0.5, d = event.radius * (0.7 + Math.random() * 0.3);
        const x2 = event.x + Math.cos(a) * d, y2 = event.y + Math.sin(a) * d;
        add({ kind: 'zap', life: 0.3 + Math.random() * 0.15, x1: event.x, y1: event.y, x2, y2, width: 2, seed: i * 5 });
        this._sparks(x2, y2, ['#bfdbfe', '#ffffff'], 3, 1.4, 0.3);
      }
      add({ kind: 'ring', life: 0.35, x: event.x, y: event.y, r: 0.8, color: '#bfdbfe', width: 2 });
    } else if (event.kind === 'claw') {
      this._fire(t, event.x, event.y, event.mob, () => {
        this._pose(t).act = { frame: 'swipe', until: this.clock + STORM_FX.swipe };
        add({ kind: 'claw', life: 0.4, x: t.cx, y: t.cy, angle: Math.atan2(event.y - t.cy, event.x - t.cx),
          radius: event.radius, arc: event.arc });
      }, STORM_FX.swipe);
    } else if (event.kind === 'hammer') {
      this._face(t, event.x, event.y, event.mob, event.out + event.back);
      this._pose(t).hammer = { start: this.clock, out: event.out, back: event.back, x: event.x, y: event.y, mob: event.mob };
    } else if (event.kind === 'rod') {
      this._sparks(event.x, event.y, ['#bfdbfe', '#ffffff', '#d97706'], 10, 1.6, 0.45);
    } else if (event.kind === 'skybolt') {
      add({ kind: 'zap', life: 0.35, x1: event.x + (Math.random() - 0.5) * 1.5, y1: -0.6, x2: event.x,
        y2: event.y - (event.ground ? 0 : ROD.tall / CELL), width: event.ground ? 3.5 : 5, mob: event.mob });
      if (event.ground) this._sparks(event.x, event.y, ['#bfdbfe', '#ffffff', '#fde047'], 10, 2.2, 0.35);
      add({ kind: 'glare', life: 0.25 });
    } else if (event.kind === 'surge') {
      const turn = Math.random() * Math.PI * 2, top = event.y - (ROD.tall - 2) / CELL;
      for (let i = 0; i < ROD.bolts; i++) {
        const a = turn + i * Math.PI * 2 / ROD.bolts + (Math.random() - 0.5) * 0.5, d = event.radius * (0.75 + Math.random() * 0.25);
        const x2 = event.x + Math.cos(a) * d, y2 = event.y + Math.sin(a) * d;
        add({ kind: 'zap', life: 0.3 + Math.random() * 0.1, x1: event.x, y1: top, x2, y2, width: 2.4, seed: i * 5 });
        this._sparks(x2, y2, ['#bfdbfe', '#ffffff'], 3, 1.4, 0.3);
      }
      add({ kind: 'ring', life: 0.3, x: event.x, y: event.y, r: 0.6, color: '#bfdbfe', width: 2 });
    } else if (event.kind === 'links') {
      add({ kind: 'links', life: event.time, pairs: event.pairs });
    } else if (event.kind === 'boom') {
      const tone = event.tone || (event.meteor ? 'earth' : null), big = event.rocket || event.meteor;
      add({ kind: 'blast', life: big ? 0.65 : 0.55, x: event.x, y: event.y, r: event.radius,
        seed: Math.floor(Math.random() * 97), blue: event.blue, tone });
      this._sparks(event.x, event.y, tone ? BLAST_TONES[tone].slice(1) : event.blue ? BLUE_FLAME.slice(0, 4)
        : ['#ffd84a', '#ff8a1f', '#e2531f', '#5a4a40'], 12, event.radius * 4.5, 0.45, 3);
      if (big) this.decals.push({ kind: 'crater', t: 0, life: 4, x: event.x, y: event.y, r: event.radius * 0.35 });
      else this.decals.push({ kind: 'scorch', t: 0, life: 3, x: event.x, y: event.y, r: Math.min(1, event.radius * 0.6) });
    } else if (event.kind === 'flame') {
      this._fire(t, event.x, event.y, null, () => {
        this._pose(t).flame = { until: this.clock + FLAME_HOLD, blue: event.blue };
      }, FLAME_HOLD);
    } else if (event.kind === 'thunderbolt') {
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
    } else if (event.kind === 'meteor') {
      add({ kind: 'meteor', life: event.time, x: event.x, y: event.y, r: event.radius });
    } else if (event.kind === 'thorns') {
      const spot = this.shown.get(event.mob.id) || event.mob;
      this._sparks(spot.x, spot.y, ['#c4b8a6', '#8a7f70', '#7a1f1f'], 6, 1.6, 0.35, 2);
    } else if (event.kind === 'ignite') {
      const tones = event.black ? BLACK_FLAME : event.blue ? BLUE_FLAME : FLAME;
      add({ kind: 'ring', life: 0.45, x: event.x, y: event.y, r: event.radius, color: tones[2], width: 3 });
      this._sparks(event.x, event.y, tones.slice(0, 3), 14, event.radius * 4, 0.45, 3);
    } else if (event.kind === 'phoenix') {
      this._sparks(event.x, event.y, (event.tower.runes.has('blue') ? BLUE_FLAME : FLAME).slice(0, 3), 22, 3, 0.6, 3);
    } else if (event.kind === 'vent') {
      const blue = t.runes.has('blue');
      add({ kind: 'ring', life: 0.6, x: event.x, y: event.y, r: 0.8, color: blue ? '#4aa3ff' : '#f97316', width: 3 });
      this._sparks(event.x, event.y, (blue ? BLUE_FLAME : FLAME).slice(0, 3), 16, 2.4, 0.6, 3);
    } else if (event.kind === 'flight') {
      this._sparks(event.x1, event.y1, FLAME.slice(0, 3), 14, 2.4, 0.5, 3);
    } else if (event.kind === 'hail') {
      add({ kind: 'hail', life: event.time + HAIL.fall + 0.5, x: event.x, y: event.y, radius: event.radius,
        fall: event.time, seed: (event.x * 13 + event.y * 7) % 91 });
    } else if (event.kind === 'blob') {
      add({ kind: 'blob', life: event.time, sx: event.sx, sy: event.sy, mob: event.mob, x2: event.mob.x, y2: event.mob.y,
        tone: event.plague ? 'plague' : 'toxic' });
    } else if (event.kind === 'absorb') {
      add({ kind: 'absorb', life: event.time, tower: t, points: event.points });
    } else if (event.kind === 'trap') {
      this._sparks(event.x, event.y, ['#dfe5ea', '#8b939c', '#ffffff'], 8, 1.4, 0.3, 2);
    } else if (event.kind === 'trophy') {
      this._sparks(event.x, event.y, ['#facc15', '#fde68a', '#f59e0b'], 9, 1.8, 0.5, 2);
    } else if (event.kind === 'cauldron') {
      this._sparks(event.x, event.y, BREWS[t.runes.has('plague') ? 'plague' : 'toxic'].slice(1), 14, 2, 0.5, 3);
    } else if (event.kind === 'peck') {
      if (event.hawk) this._sparks(event.x, event.y, ['#a3e635', '#65a30d', '#5c371c'], 7, 1.6, 0.35, 2);
      else this._sparks(event.x, event.y, ['#8b5a2b', '#e7c9a0', '#ffffff'], 4, 1.2, 0.3, 2);
      if (event.toxic) this._sparks(event.x, event.y, ['#a3e635', '#65a30d'], 3, 1, 0.3, 2);
    } else if (event.kind === 'snare') {
      this._sparks(event.mob.x, event.mob.y, ['#5e4429', '#4d7c0f', '#84cc16'], 8, 1.4, 0.4, 2);
    } else if (event.kind === 'ray') {
      add({ kind: 'ray', life: 0.18, x1: event.sx, y1: event.sy - DRONE_LIFT / CELL, x2: event.x, y2: event.y });
      this._sparks(event.x, event.y, ['#ecfeff', '#22d3ee'], 4, 1.2, 0.25, 2);
    } else if (event.kind === 'net') {
      const tip = event.sx === undefined ? this._muzzle(t) : { x: event.sx, y: event.sy - DRONE_LIFT / CELL };
      add({ kind: 'chain', life: 0.3, points: [[tip.x, tip.y], [event.mob.x, event.mob.y]],
        color: 'rgba(214, 180, 120, .7)' });
      this._sparks(event.mob.x, event.mob.y, ['#d6b478', '#8a6a3c'], 8, 1.6, 0.4, 2);
    } else if (event.kind === 'execute') {
      const spot = this.shown.get(event.mob.id) || event.mob;
      this._sparks(spot.x, spot.y, ['#ffffff', '#ef4444', '#7a1f1f'], 10, 2, 0.45, 2);
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
    } else if (event.kind === 'wall') {
      this._sparks(event.x, event.y, ['#c4b8a6', '#9a8f80', '#6b6258'], 8, 1.6, 0.45, 2);
      add({ kind: 'ring', life: 0.45, x: event.x, y: event.y, r: 0.9, color: '#c4b8a6', width: 2 });
    } else if (event.kind === 'crumble') {
      this._sparks(event.x, event.y, ['#c4b8a6', '#9a8f80', '#6b6258', '#3d362f'], 14, 2.6, 0.55, 3);
      for (let i = 0; i < 6; i++) {
        this.decals.push({ kind: 'rubble', t: 0, life: 2.5, x: event.x + (Math.random() - 0.5) * 0.9,
          y: event.y + (Math.random() - 0.5) * 0.9, size: 2 + Math.floor(Math.random() * 3), color: '#8a7f70' });
      }
    } else if (event.kind === 'grenade' && event.drone) {
      add({ kind: 'drop', life: event.time, x: event.x, y: event.y, grenade: event.grenade });
    } else if (event.kind === 'grenade') {
      this._fire(t, event.x, event.y, event.mob, (x2, y2, late) => {
        const tip = this._muzzle(t);
        add({ kind: 'grenade', life: Math.max(FLIGHT_MIN, event.time - late), x1: tip.x, y1: tip.y, x2, y2,
          mob: event.mob, arc: arcOf(tip.x, tip.y, x2, y2), grenade: event.grenade });
      });
    } else if (event.kind === 'emp') {
      add({ kind: 'ring', life: 0.5, x: event.x, y: event.y, r: event.radius, color: '#22d3ee', width: 3 });
      add({ kind: 'pulse', life: 0.6, x: event.x, y: event.y, r: event.radius * 1.15, color: '#a5f3fc', width: 2 });
      this._sparks(event.x, event.y, ['#ecfeff', '#67e8f9', '#0891b2'], 18, event.radius * 4, 0.45, 2);
    } else if (event.kind === 'steel') {
      const [bx, by] = this.battle.path[this.battle.path.length - 1];
      this._sparks(bx + 0.5, by + 0.5, ['#f8fafc', '#cbd5e1', '#64748b'], 16, 2.4, 0.5, 2);
      add({ kind: 'ring', life: 0.5, x: bx + 0.5, y: by + 0.5, r: 1, color: '#e2e8f0', width: 3 });
    } else if (event.kind === 'immune') {
      const spot = this.shown.get(event.mob.id) || event.mob;
      add({ kind: 'ring', life: 0.35, x: spot.x, y: spot.y, r: 0.55, color: 'rgba(226, 232, 240, .8)', width: 1.5 });
    } else if (event.kind === 'react') {
      const spot = this.shown.get(event.mob.id) || event.mob;
      add({ kind: 'text', life: 1.2, x: spot.x, y: spot.y - 0.7, text: event.name, color: event.color });
      this._sparks(spot.x, spot.y, [event.color, '#ffffff'], 8, 1.4, 0.35, 2);
    } else if (event.kind === 'zone') {
      const zone = event.zone, look = ZONE_LOOKS[zone.kind];
      add({ kind: 'ring', life: 0.5, x: zone.x, y: zone.y, r: zone.radius, color: look[0], width: 2 });
      this._sparks(zone.x, zone.y, look, 7, zone.radius * 2.4, 0.5, 2);
    } else if (event.kind === 'wave' || event.kind === 'quake') {
      const color = event.kind === 'wave' ? '#38bdf8' : '#a8794a';
      add({ kind: 'ring', life: 0.6, x: t.cx, y: t.cy, r: event.radius, color, width: 3 });
      this._sparks(t.cx, t.cy, event.kind === 'wave' ? ['#e0f2fe', '#7dd3fc'] : ['#c9a66b', '#6b5032'], 12,
        event.radius * 3, 0.5, 2);
    } else if (event.kind === 'lift') {
      const spot = this.shown.get(event.mob.id) || event.mob;
      this._sparks(spot.x, spot.y, ['#ccfbf1', '#5eead4', '#ffffff'], 6, 1.6, 0.5, 2);
    } else if (event.kind === 'nova') {
      this._pose(t).flash = FLASH;
      add({ kind: 'ring', life: 0.45, x: t.cx, y: t.cy, r: event.radius, color: '#a5f3fc', width: 3 });
      this._sparks(t.cx, t.cy, ['#f0fdff', '#a5f3fc'], 10, event.radius * 3, 0.45, 2);
    } else if (event.kind === 'spikes') {
      this._face(t, event.x, event.y);
      add({ kind: 'spikes', life: 0.4, points: event.points });
    } else if (event.kind === 'whirl') {
      this._face(t, event.mob.x, event.mob.y, event.mob);
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
    } else if (event.kind === 'nuke') {
      add({ kind: 'nuke', life: NUKE_LIFE, x: event.x, y: event.y, radius: event.radius });
      if (event.poison) add({ kind: 'smog', life: event.poison, x: event.x, y: event.y, r: event.radius });
      this._sparks(event.x, event.y, ['#ffffff', '#ffe08a', '#ff9a1f', '#5a4a40'], 60, 12, 1.3, 3);
      this.decals.push({ kind: 'crater', t: 0, life: 7, x: event.x, y: event.y, r: event.radius * 0.45 });
    } else if (event.kind === 'heal') {
      const [bx, by] = this.battle.path[this.battle.path.length - 1], x = bx + 0.5, y = by + 0.5;
      add({ kind: 'pulse', life: 0.7, x, y, r: 1.2, color: '#4ade80', width: 3 });
      add({ kind: 'text', life: 1.8, x, y: y - 0.9, text: '+' + event.lives + ' ♥', color: '#4ade80' });
      this._sparks(x, y, ['#4ade80', '#ffffff'], 10, 2, 0.6, 2);
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
      const mouth = this._muzzle(t), ox = at(mouth.x), oy = at(mouth.y);
      const aim = turnOf(pose.angle, HERO_TURN_STEPS) * Math.PI * 2 / HERO_TURN_STEPS - Math.PI / 2;
      const reach = t.range * CELL - Math.hypot(ox - at(t.cx), oy - at(t.cy));
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, ox + Math.cos(aim) * reach * 0.35, oy + Math.sin(aim) * reach * 0.35, reach * 0.55,
        flame.blue ? 'rgba(74, 163, 255, .9)' : 'rgba(255, 140, 40, .9)', 0.35 * fade);
      for (let i = 0; i < FLAME_BITS; i++) {
        const travel = (this.clock * 2.6 + noise(i, t.x * 31 + t.y)) % 1;
        const a = aim + (noise(i + 50, t.x + t.y * 17) * 2 - 1) * spread * (0.2 + 0.8 * travel);
        const d = travel * reach, px = ox + Math.cos(a) * d, py = oy + Math.sin(a) * d - travel * travel * 6;
        const tone = tones[Math.min(tones.length - 1, Math.floor(travel * tones.length))];
        ctx.globalAlpha = fade * (1 - travel * 0.7);
        bit(ctx, px, py, 2 + Math.round(travel * 3), tone, i + this.clock * 9);
      }
      ctx.restore();
    }
  }

  _glob(ctx, e, share) {
    if (!e.mob.dead) {
      e.x2 = e.mob.x;
      e.y2 = e.mob.y;
    }
    const brew = BREWS[e.tone], spot = (f) => [at(e.sx + (e.x2 - e.sx) * f), at(e.sy + (e.y2 - e.sy) * f)
      - Math.sin(f * Math.PI) * 26];
    const [gx, gy] = spot(share), [sx, sy] = [at(e.sx + (e.x2 - e.sx) * share), at(e.sy + (e.y2 - e.sy) * share)];
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#000000';
    lump(ctx, sx, sy + 2, 3.2, 1.4, 3, 0.1, 8);
    ctx.fill();
    for (let k = 1; k <= 3; k++) {
      const [tx, ty] = spot(Math.max(0, share - k * 0.045));
      ctx.globalAlpha = 0.8 - k * 0.2;
      ctx.fillStyle = brew[1 + (k % 2)];
      lump(ctx, tx, ty, 2 - k * 0.4, 2 - k * 0.4, k, 0.1, 7);
      ctx.fill();
    }
    const [ax, ay] = spot(Math.max(0, share - 0.03)), turn = Math.atan2(gy - ay, gx - ax);
    glow(ctx, gx, gy, 9, VENOM[e.tone], 0.45);
    ctx.globalAlpha = 1;
    ctx.translate(gx, gy);
    ctx.rotate(turn);
    const fill = ctx.createRadialGradient(0.8, -1, 0.3, 0, 0, 4.2);
    fill.addColorStop(0, brew[3]);
    fill.addColorStop(0.35, brew[2]);
    fill.addColorStop(1, brew[0]);
    ctx.fillStyle = fill;
    lump(ctx, 0, 0, 4.2, 3, 5, 0.08, 9);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, .55)';
    lump(ctx, 1.2, -1.1, 1.2, 0.6, 7, 0.1, 6);
    ctx.fill();
    ctx.restore();
  }

  _hail(ctx, e) {
    const x0 = at(e.x), y0 = at(e.y), r = e.radius * CELL, rise = Math.min(1, e.t / 0.2);
    glow(ctx, x0, y0, r, 'rgba(0, 0, 0, .9)', 0.14 * rise * Math.max(0, 1 - Math.max(0, e.t - e.fall - HAIL.fall) / 0.5));
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < HAIL.count; i++) {
      const a = noise(i, e.seed) * Math.PI * 2, d = Math.sqrt(noise(i + 50, e.seed)) * r;
      const x = x0 + Math.cos(a) * d, y = y0 + Math.sin(a) * d * 0.8;
      const start = noise(i + 100, e.seed) * e.fall, f = (e.t - start) / HAIL.fall;
      if (f < 0) continue;
      if (f < 1) {
        const lift = (1 - f) * HAIL.drop;
        ctx.globalAlpha = Math.min(1, f * 4);
        this._arrow(ctx, x - lift * HAIL.slant, y - lift, 13, i);
        continue;
      }
      const stay = (e.t - start - HAIL.fall) / 0.6;
      if (stay > 1) continue;
      if (stay < 0.4) puff(ctx, x, y + 1, 5, 'rgba(214, 200, 170, .7)', 'rgba(150, 130, 100, .35)', 1 - stay / 0.4);
      ctx.globalAlpha = 1 - stay * stay;
      this._arrow(ctx, x, y, 7, i);
    }
    ctx.restore();
  }

  _arrow(ctx, x, y, length, i) {
    const len = Math.hypot(HAIL.slant, 1), dx = -HAIL.slant / len, dy = -1 / len, tx = x + dx * length;
    const ty = y + dy * length, nx = -dy, ny = dx;
    ctx.strokeStyle = 'rgba(16, 10, 4, .55)';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.strokeStyle = HAIL.shaft;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.strokeStyle = HAIL.fletch;
    ctx.lineWidth = 1;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(tx - dx * 4, ty - dy * 4);
      ctx.quadraticCurveTo(tx - dx * 2 + nx * side * 1.2, ty - dy * 2 + ny * side * 1.2, tx + nx * side * 2,
        ty + ny * side * 2);
      ctx.stroke();
    }
    const hx = x - dx * 3, hy = y - dy * 3;
    ctx.fillStyle = i % 3 ? HAIL.head : HAIL.tip;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.quadraticCurveTo(x + nx * 1.9, y + ny * 1.9, x + dx, y + dy);
    ctx.quadraticCurveTo(x - nx * 1.9, y - ny * 1.9, hx, hy);
    ctx.fill();
  }

  _effects(ctx, dt) {
    const next = [];
    for (const e of this.effects) {
      e.t += e.kind === 'banner' ? dt / this.pace : dt;
      if (e.t >= e.life) {
        if (e.kind === 'blob') {
          const brew = BREWS[e.tone];
          this._sparks(e.mob.x, e.mob.y, brew.slice(1), 10, 1.6, 0.35, 2);
        }
        if (e.kind === 'shot') {
          this.impacts += 1;
          this._sparks(e.x2, e.y2, [e.crit ? '#ffffff' : e.bolt.color], e.crit ? 5 : 2, 1.2, 0.18);
        }
        continue;
      }
      next.push(e);
      const share = e.t / e.life, fade = 1 - share;
      if (e.kind === 'laser') {
        this._laser(ctx, e, share);
        continue;
      }
      if (e.kind === 'hail') {
        this._hail(ctx, e);
        continue;
      }
      if (e.kind === 'blob') {
        this._glob(ctx, e, share);
        continue;
      }
      if (e.kind === 'holyRing') {
        this._holyRing(ctx, e, share);
        continue;
      }
      if (e.kind === 'chord') {
        this._chord(ctx, e, share);
        continue;
      }
      if (e.kind === 'shock') {
        this._shock(ctx, e, share);
        continue;
      }
      if (e.kind === 'judgement') {
        this._judgement(ctx, e, share);
        continue;
      }
      if (e.kind === 'vigil') {
        this._vigil(ctx, e, share);
        continue;
      }
      if (e.kind === 'holyOrb') {
        const spot = e.mob && !e.mob.dead ? this.shown.get(e.mob.id) || e.mob : null;
        if (spot) {
          e.x2 = spot.x;
          e.y2 = spot.y;
        }
        const ox = at(e.x1 + (e.x2 - e.x1) * share), oy = at(e.y1 + (e.y2 - e.y1) * share) - Math.sin(share * Math.PI) * 26;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        glow(ctx, ox, oy, 14, HOLY_LIGHT.warm, 0.6);
        glow(ctx, ox, oy, 6, HOLY_LIGHT.core, 1);
        ctx.restore();
        continue;
      }
      if (e.kind === 'absorb') {
        const tip = this._muzzle(e.tower), from = (px, py, f, a) => {
          const ease = f * f, off = (1 - f) * 8;
          return [at(px + (tip.x - px) * ease) + Math.cos(a) * off, at(py + (tip.y - py) * ease) + Math.sin(a) * off];
        };
        ctx.save();
        ctx.lineCap = 'round';
        e.points.forEach(([px, py, plague], j) => {
          const brew = BREWS[plague ? 'plague' : 'toxic'], tone = GAS[plague ? 'plague' : 'toxic'];
          for (let k = 0; k < 6; k++) {
            const lag = k * 0.06, f = Math.max(0, Math.min(1, (share - lag) / (1 - lag))), a = k * 1.7 + j;
            const [x, y] = from(px, py, f, a), [bx, by] = from(px, py, Math.max(0, f - 0.12), a);
            puff(ctx, x, y, 5, tone[0], tone[1], 0.5 + 0.4 * f);
            ctx.globalAlpha = 0.6 + 0.4 * f;
            ctx.strokeStyle = brew[2 + (k % 2)];
            ctx.lineWidth = 2.2 - f;
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.lineTo(x, y);
            ctx.stroke();
          }
        });
        ctx.restore();
        glow(ctx, at(tip.x), at(tip.y), 8 + share * 8, VENOM.toxic, 0.4 * share);
        continue;
      }
      if (e.kind === 'shot') {
        const seen = e.track && !e.track.dead ? this.shown.get(e.track.id) : null;
        if (seen) {
          e.x2 = seen.x;
          e.y2 = seen.y - (seen.lift || 0) / CELL;
        }
        const b = e.bolt, x = at(e.x1 + (e.x2 - e.x1) * share), y = at(e.y1 + (e.y2 - e.y1) * share);
        if (b.look === 'fireball') {
          this._fireball(ctx, e, share, dt);
        } else if (b.look === 'spear') {
          this._spear(ctx, e, share);
        } else if (b.look === 'light') {
          this._holyMotes(ctx, e, share);
        } else if (b.look === 'wisp') {
          this._wisp(ctx, e, share);
        } else if (b.look === 'tracer') {
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
        sprite(ctx, rocketSprite(), x, y, angle, e.big ? 2.4 : 1.6, 0, 64);
      } else if (e.kind === 'mortar' && e.nuke) {
        this._nukeFlight(ctx, e, share);
      } else if (e.kind === 'shard') {
        const { x, y } = this._lofted(ctx, e, share);
        glow(ctx, x, y, 4, 'rgba(255, 160, 40, .95)', 0.6);
        square(ctx, x, y, 3, '#3f3f46');
      } else if (e.kind === 'airburst') {
        const top = at(e.y) - AIRBURST;
        glow(ctx, at(e.x), top, 14 * (1 - share) + 4, 'rgba(214, 211, 209, 1)', 0.6 * (1 - share));
        for (const [px, py] of e.points) {
          const k = share * share, x = at(e.x + (px - e.x) * share), y = top + (at(py) - top) * k;
          square(ctx, x, y, 2, '#52525b');
          glow(ctx, x, y, 3, 'rgba(255, 200, 120, 1)', 0.4);
        }
      } else if (e.kind === 'mortar') {
        const { x, y: high, angle } = this._lofted(ctx, e, share), y = high - (e.shrapnel ? share * AIRBURST : 0);
        for (let i = 1; i <= 5; i++) {
          const [px, py] = this._arcAt(e, Math.max(0, share - i * 0.025));
          glow(ctx, px, py, 2 + i, 'rgba(200, 196, 210, 1)', 0.35 * (1 - i / 6));
        }
        glow(ctx, x, y, 5, 'rgba(255, 160, 40, .95)', 0.7);
        sprite(ctx, rocketSprite(), x, y, angle, 1, 0, 64);
      } else if (e.kind === 'smog') {
        const time = share * e.life, fade = Math.min(1, time / 0.6, (e.life - time) / 1.2), r = e.r * CELL;
        for (let i = 0; i < 14; i++) {
          const a = i * 2.39 + this.clock * 0.25 * (i % 2 ? 1 : -1), d = r * 0.75 * Math.sqrt(noise(i, 31));
          const px = at(e.x) + Math.cos(a) * d, py = at(e.y) + Math.sin(a) * d * 0.85;
          glow(ctx, px, py, r * (0.35 + 0.2 * noise(i, 37)), SMOG[i % SMOG.length],
            fade * (0.32 + 0.08 * Math.sin(this.clock * 1.5 + i)));
        }
      } else if (e.kind === 'ray') {
        ctx.save();
        ctx.globalAlpha = fade;
        for (const [width, color] of [[5, 'rgba(34, 211, 238, .45)'], [1.5, '#ecfeff']]) {
          ctx.strokeStyle = color;
          ctx.lineWidth = width;
          ctx.beginPath();
          ctx.moveTo(at(e.x1), at(e.y1));
          ctx.lineTo(at(e.x2), at(e.y2));
          ctx.stroke();
        }
        ctx.restore();
      } else if (e.kind === 'drop') {
        const x = at(e.x), y = at(e.y) - DRONE_LIFT * (1 - share * share);
        ctx.fillStyle = 'rgba(0, 0, 0, .25)';
        ctx.beginPath();
        ctx.ellipse(at(e.x), at(e.y) + 2, 3, 1.5, 0, 0, Math.PI * 2);
        ctx.fill();
        sprite(ctx, grenadeSprite(e.grenade, Math.floor(this.clock * 8) % 2 === 0), x, y, share * Math.PI * 2, 1.3);
      } else if (e.kind === 'grenade') {
        const { x, y } = this._lofted(ctx, e, share);
        sprite(ctx, grenadeSprite(e.grenade, Math.floor(this.clock * 8) % 2 === 0), x, y, share * Math.PI * 4, 1.3);
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
      } else if (e.kind === 'zap') {
        const spot = e.mob && !e.mob.dead ? this.shown.get(e.mob.id) : null;
        if (spot) {
          e.x2 = spot.x;
          e.y2 = spot.y - (spot.lift || 0) / CELL;
        }
        this._zap(ctx, at(e.x1), at(e.y1), at(e.x2), at(e.y2), e.width, fade, e.seed || 0);
      } else if (e.kind === 'links') {
        for (const [x1, y1, x2, y2] of e.pairs) {
          this._zap(ctx, at(x1), at(y1) - ROD.tall, at(x2), at(y2) - ROD.tall, 4, Math.min(1, fade * 3), x1 + y2);
        }
      } else if (e.kind === 'claw') {
        this._claw(ctx, e, share);
      } else if (e.kind === 'glare') {
        ctx.fillStyle = 'rgba(219, 234, 254, ' + 0.18 * fade + ')';
        ctx.fillRect(EDGE, EDGE, CELL * SIZE, CELL * SIZE);
      } else if (e.kind === 'boom') {
        const r = e.r * CELL * (0.5 + 0.6 * share);
        glow(ctx, at(e.x), at(e.y), r * 1.2, e.heat || BOOM.heat, fade * 0.8);
        ctx.globalAlpha = fade;
        burst(ctx, at(e.x), at(e.y), r, Math.max(8, Math.round(e.r * 10)), e.y * 2 + share, share < 0.5 ? 1 : 0,
          share < 0.5 ? e.core || BOOM.core : e.ring);
        ctx.globalAlpha = 1;
      } else if (e.kind === 'blast') {
        this._rugged(ctx, e, share);
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
        if (e.ember) bit(ctx, at(e.x + e.vx * e.t), at(e.y + e.vy * e.t), e.size, e.color, e.seed + e.t * 20);
        else square(ctx, at(e.x + e.vx * e.t), at(e.y + e.vy * e.t), e.size, e.color);
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
