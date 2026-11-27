import { SIZE, inside, pathCells, reach } from './field.js';
import { AFFIXES, BIOME_RULES, BOSSES, DIABLO, ELITES, FAMILIES, FINALE, LIVES, LOOKS, MIGHT, MIMIC, MOBS, POWERS,
  SILVER, SLIMES, STAT, TERRAIN, WAVE, eliteCount, familyPool, levelOf, lookOf, resistOf, silverChance, waveHp,
  waveSpawns } from './balance.js';
import { CLASS_BY_ID, PERKS, RUNE_CAPS, baseOf, mastery, mightOf, scaled } from './classes.js';
import { FARM } from './gacha.js';

export const MOVE_PAUSE = 1;
export const BITE_TIME = 1;
export const ROT = { share: 0.01, boss: 0.003, time: 5 };

const SHOTS_PER_TICK = 6;
const BOSS_HOLD = 0.3;
const ELITE_HOLD = 0.6;
const BOSS_SLOW = 0.7;
const ELITE_PUSH = 0.5;
const PUSH_LIMIT = 5;
const HOLD_GAP = 1;
const NO_MODS = { damage: 0, rate: 0, range: 0, crit: 0, xp: 0, coins: 0, stats: null, runes: null, paragon: 0 };
const NO_EARN = { xp: 1, coins: 1 };
const FLOOR = 0.1;
const SPREAD = 0.35;
const EVENTS_MAX = 2000;
const RANGE_MIN = 1;
const HEART_GAP = 1.6;
const WALL_GAP = 0.5;
const WALL_BITE = 0.125;
const WALL_MARGIN = 2;
const PIERCE_WIDTH = 0.4;
const FAR_REACH = SIZE * 1.5;
const COOLDOWNS = ['nextActive', 'nextBlaze',
  'nextFar', 'nextInferno', 'nextLight', 'nextPhoenix', 'nextPool',
  'nextEmp', 'nextNuke', 'nextStorm', 'nextTsunami',
  'nextWall', 'nextWave', 'nextHail', 'nextHoly', 'nextBeam', 'nextRain', 'nextSiren', 'nextDirge',
  'nextGlobe', 'nextTempest', 'nextMeteor', 'nextQuake', 'nextStones', 'nextBubble', 'nextVortex', 'nextInk',
  'nextRoar', 'nextIceWall'];
const WARD_AURA = 0.25;
const FIREBALL_FLIGHT = 0.3;
const ZONE_PULSE = 0.5;
export const PULSE = 0.5;
export const MARK_TIME = 4;
export const STRONG = 3;
export const REACTIONS = {
  steam: { name: 'Пар', color: '#e2e8f0', fire: 3, time: 1 },
  blast: { name: 'Взрыв', color: '#fb923c', fire: 3, radius: 1 },
  corrosion: { name: 'Коррозия', color: '#a3e635', dot: 0.5, time: 4, weak: 0.25 },
  mud: { name: 'Грязь', color: '#a16207', slow: 0.3, time: 4 },
  discharge: { name: 'Разряд', color: '#facc15', stun: 1 },
  disease: { name: 'Болезнь', color: '#a78bfa', dot: 0.4, time: 4, armor: 0.3 },
  gas: { name: 'Газ', color: '#84cc16', radius: 2, time: 4, dot: 0.6 },
  nuke: { name: 'Ядерный взрыв', color: '#f97316', radius: 2, mul: 15 },
  epidemic: { name: 'Эпидемия', color: '#7c3aed', dot: 0.8, time: 10, weak: 0.5 },
  lava: { name: 'Лава', color: '#ef4444', radius: 1, time: 4, dot: 0.6, slow: 0.4 },
};
const PAIRS = [['fire', 'water', 'steam'], ['fire', 'lightning', 'blast'], ['fire', 'poison', 'corrosion'],
  ['water', 'earth', 'mud'], ['water', 'lightning', 'discharge'], ['earth', 'poison', 'disease']];
const BLUE_REACT = 1.5;
export const FIRE = { styled: 1.5, giant: 1.5, splash: 1, wide: 1.5, breath: 0.6, cone: 0.35, coneWide: 1.6,
  ignite: 0.06, igniteMul: 1.2, smolder: 0.3, burn: 3, blue: 1.3, blueBurn: 1.5, crit: 0.15, twin: 1,
  rain: { every: 8, count: 6, radius: 3, gap: 0.15 }, vent: { every: 3, reach: 5 }, idle: 3, soar: 7,
  beam: { every: 10, charge: 1, mul: 8 }, torch: { radius: 1, share: 0.25 },
  ring: { radius: 2, mul: 0.5, grow: 1 },
  wall: { mul: 1.5, reach: 0.7 }, black: { chance: 1, damage: 0.2, max: 5 },
  phoenix: { every: 15, speed: 8, mul: 10, reach: 0.9, step: 0.25 } };
const TORCH_USERS = new Set(['sniper', 'mechanic', 'forester']);
const LOFTY = new Set(['scope', 'mortar']);
export const SHOT = { scope: { mul: 9, aim: 2, reload: 3 }, assault: { range: -1, interval: 0.55, mul: 0.47,
  crit: 0.25, mag: 30, reload: 3 }, marksman: { range: 1.5, interval: 2.2, mul: 2.15, crit: 0.25, mag: 5, reload: 3 },
  gold: 2, mark: { bonus: 0.25, time: 4 }, ricochet: { share: 0.5, arc: 75, reach: 3 },
  burst: { count: 3, radius: 1, gap: 0.08 },
  flash: { every: 30, radius: 1, stun: 1.5 }, double: { arc: 30 }, air: 3 };
export const MECH = { turret: { range: -1.5, interval: 1, mul: 0.39, count: 3, gap: 0.08, radius: 1, mag: 15,
  reload: 3 }, demo: { range: 0, interval: 3, mul: 1.6, radius: 1, flight: 0.25, pace: 0.12 },
  mortar: { interval: 2.4, mul: 1.1, radius: 0.8, flight: 0.7, pace: 0.06 },
  team: { radius: 1.5, per: 0.1 }, tuning: { radius: 1.5, haste: 0.3 },
  emp: { every: 8, radius: 2, stun: 1.5, mute: 4, drop: 0.35 },
  cluster: { count: 2, share: 0.5, reach: 1, radius: 0.9, flight: 0.35 }, caliber: 2, salvo: { chance: 0.3, gap: 0.25 },
  aimed: { idle: 5 }, napalm: { radius: 0.8, time: 2, dps: 0.5, mark: 2 },
  shrapnel: { count: 8, spread: 2, side: 0.3, mul: 0.35, hit: 0.45, fall: 0.3, fire: 0.35 },
  nuke: { every: 20, radius: 3, mul: 12, stun: 2, poison: 5, flight: 1.8 },
  giant: { gap: 0.07 }, drone: { speed: 4, hover: 0.6, reach: 1.6, spin: 1.3 },
  droneAttack: { every: 1.2, count: 3, gap: 0.08, mul: 0.6 }, droneLaser: { every: 1.5, mul: 1.7 },
  droneAir: { every: 1.5, mul: 0.35, slow: 0.6, time: 2 } };
const DAMAGE_UP = { pyro: 1.25, thunder: 1.25, sorceress: 1.25 };
const DRONE_KINDS = [['droneAttack', 'attack'], ['droneLaser', 'laser'], ['droneAir', 'air']];
export const WOOD = { bow: { reload: 0.8 }, grace: { radius: 2.5, haste: 0.15 }, hunter: { range: 2, interval: 0.4, mul: 3.4, reload: 2.4 },
  witch: { range: 0, interval: 1.8, mul: 1.75, flight: FIREBALL_FLIGHT }, bird: { every: 0.9, mul: 0.45, speed: 5, orbit: 0.7 },
  hawk: { every: 1.4, mul: 1.6, speed: 5.5, poison: 0.5, orbit: 0.95 }, flock: { birds: [1, 2, 4], poison: 0.5 },
  roots: { cells: 5, reach: 0.7, slow: 0.4, mul: 0.15 }, snare: { chance: 0.15, time: 2.5, gap: 3 },
  catcher: { chance: 0.3, time: 2.5, dps: 0.25 }, trophy: { radius: 4.5, bonus: 0.25 },
  beartrap: { time: 3, reopen: 10, dps: 0.3, reach: 0.45 }, hail: { every: 10, radius: 4, fall: 0.6, poison: 0.5 },
  venomBurst: { radius: 1, time: 4, dps: 0.4 }, plague: 0.1, absorb: { time: 0.35, size: 1.5 },
  cauldron: { every: 2.5, reach: 5, flight: 0.7, mul: 0.8, radius: 0.8, time: 8, dps: 0.3 } };
export const HOLY = { angel: { reach: 1, interval: 1, mul: 2.6 }, monk: { reach: 1.5, interval: 0.4, mul: 0.8 },
  inquisitor: { reach: 4, interval: 1.45, mul: 3, flight: FIREBALL_FLIGHT }, smite: { every: 5, mul: 11, below: 0.3 },
  mercy: { reach: 1, lives: 1 }, second: { charge: 1, awe: 10, lives: 10 },
  holyGround: { every: 6, radius: 4, mul: 2, flight: 0.8 }, heavy: { chance: 0.15, stun: 1 },
  mantra: { radius: 3, haste: 0.15, damage: 0.15, range: 0.15, might: 0.2 }, burst: { radius: 2, share: 0.5 },
  repose: 3, chain: { jumps: 2, reach: 2 }, aegis: 0.2, blessing: 0.1, insight: 0.1 };
export const SPELL = { wisp: 0.45, minstrel: { reach: 3.5, interval: 1.6, mul: 1.3, wide: 0.5, speed: 7 },
  enchantress: { reach: 4, interval: 1.45, mul: 2.2, wind: 0.3, speed: 5, curve: 1.15 },
  shamaness: { reach: 2, interval: 1.8, mul: 1.2 }, resonance: { reach: 5, mul: 1.5 },
  totem: { radius: 3, slow: 0.1, power: 0.1, hold: 0.3, spot: [0.5, 0.35] }, courses: 0.2, catalyst: 0.15, unbind: 3, circle: 0.5 };
export const ARCANE = { control: { count: 3, mul: 1.25, spread: 0.6 }, splash: 1, cloud: 0.6, holy: 2, stun: 0.6,
  elements: ['fire', 'poison', 'holy', 'earth', 'lightning'],
  rain: { every: 8, count: 6, radius: 3, gap: 0.15, drop: 0.7, fall: 0.5, meteor: 1.6, heavy: 3 },
  beam: { mul: 1.6, tick: 0.25, cloud: 1 } };
const MARKED = new Set(['fire', 'poison', 'earth', 'lightning']);
export const STORM = { orb: 5, caller: { reach: 3.5, interval: 1, mul: 1.2 }, raiju: { reach: 2, interval: 1.2, mul: 1.1, arc: 1.3 },
  thor: { reach: 4, interval: 1.6, mul: 1.8, out: 0.55, back: 0.55, bend: 0.35, touch: 0.6, steps: 10 },
  quake: { every: 10, cells: 4, step: 0.1, touch: 0.75, stun: 1 }, god: { damage: 0.01, per: 10, haste: 0.02, stage: 12.5 },
  son: { damage: 0.05, haste: 0.05, kin: ['thunder'] },
  frenzy: { time: 3, haste: 2 }, spark: { mul: 4, reach: 2 },
  chain: { reach: 2, sure: 2, chance: 0.5, gap: 0.08 }, fork: { chance: 0.5, reach: 3, mul: 0.5 },
  globe: { every: 6, speed: 1.2, mul: 4, touch: 0.7, zap: 1, reach: 1, bolts: 3 }, tempest: { every: 8, radius: 2, mul: 3, stun: 3 },
  rod: { chance: 0.02, gap: 1, radius: 3, wave: 5, link: 3, time: 1, touch: 0.5, spot: [0.84, 0.3] } };
export const WOLF = { dash: { idle: 2, speed: 10, touch: 0.8, mul: 1 },
  howl: { idle: 3, self: 0.2, team: 0.1, share: 0.5, time: [2, 5], rest: [5, 10] },
  rage: { steps: [[10, 0.03], [10, 0.02]], rest: 0.01, max: 3 }, pack: { boost: 0.3, per: 0.01 } };
export const WATER = { drop: 9,
  hydro: { reach: 3, interval: 1.1, mul: 3, speed: 11, touch: 0.25, turn: 9 }, triple: { count: 3, spread: 0.7 },
  kraken: { reach: 2, interval: 1.3, mul: 4, sea: 3, arm: 1.5 },
  cryo: { reach: 3.5, interval: 1.1, mul: 3.6, speed: 9, big: 2, stock: 3, refill: 2 },
  slap: { chance: 0.1, hold: 2, elite: 1, boss: 0.5 }, drown: 0.1,
  ink: { every: 15, reach: 5, time: 10, slow: 0.5, boss: 0.25, mul: 2, speed: 6 },
  roar: { every: 12, reach: 3, time: 10, per: 0.3 },
  frostRing: { radius: 2, grow: 1, tick: 0.5, mul: 0.5, slow: 0.2, snow: 0.1 },
  iceBurst: { chance: 0.25, radius: 0.5, hold: 3, elite: 2, boss: 1 },
  iceWall: { time: 5, hits: 10, rest: 5, bite: 1 },
  iceGod: { stock: 5, refill: 1, count: 3, spread: 0.7 },
  bubble: { every: 30, per: 0.5, max: 200, speed: 2.25, chase: 1.5, touch: 0.5, radius: 3, orbit: 0.8, spin: 1.3,
    stages: [0, 20, 50, 100, 150] },
  vortex: { chance: 0.08, gap: 4, radius: 3, time: 1 }, spring: { radius: 3, heal: 0.01, undead: 3, clarity: 0.1 },
  home: 0.25, tide: 0.1, rain: { chance: 0.01, radius: 0.6, time: 3, slow: 0.3, rods: 2 },
  snow: { slow: [0.1, 0.15, 0.2, 0.25, 0.4], from: 3, freeze: 0.01, hold: 4, max: 5 } };
export const ARM_SPOTS = [[0.5, 0.5], [0.22, 0.22], [0.78, 0.22], [0.22, 0.78], [0.78, 0.78]];
export const SONG = { every: 15, time: 3, back: 1, dirge: 0.5, anthem: 0.3, ultrasound: 0.2 };
export const TOTEMS = { totemSlow: 'slow', totemPurge: 'purge', totemPower: 'power' };
export const HELP = { assist: 1, control: 1, react: 2, heart: 10, heal: 10, save: 50 };
export const EARN = { scope: { big: 3 }, marksman: { big: 1.6 }, hunter: { big: 1.6 }, cryo: { help: 2 }, kraken: { help: 1.5 },
  angel: { help: 2, aura: 1.5 }, monk: { aura: 2 }, shamaness: { aura: 2 }, minstrel: { aura: 2, help: 1.5 },
  earth: { help: 1.5 } };
const NO_PROFILE = {};
export const earnOf = (t) => EARN[t.style] || EARN[t.cls.id] || NO_PROFILE;
const LEFT_ITEMS = ['vents', 'cauldrons', 'banners', 'rods', 'traps', 'walls', 'patches', 'clouds', 'puddles'];
const DEMONS = new Set(['imp', 'hellhound', 'demon', 'devilkin', 'gatekeeper', 'archdemon', 'diablo']);
export const MANTRAS = ['mantraSpeed', 'mantraPower', 'mantraRange'];
export const FLIERS = new Set(['angel', 'dragon']);
export const flier = (runes) => {
  const list = Array.from(runes || []);
  if (list.some((id) => FLIERS.has(id))) return true;
  return list.includes('kraken') ? 'sea' : list.includes('serpent') ? 'lava' : false;
};
const STYLE_ELEMENTS = { witch: 'poison', cryo: 'ice' };
const STYLE_BALL = 11;
const ROAD_ROUND = 0.9;
const DRONE_SHOTS = { attack: MECH.droneAttack, laser: MECH.droneLaser, air: MECH.droneAir, bird: WOOD.bird,
  hawk: WOOD.hawk };
export const EARTH = { pile: { speed: 7 }, keeper: { mul: 1 }, serpent: { mul: 1, speed: 6 }, geo: { mul: 1.3, speed: 5 },
  wall: { might: 1, rebuild: 9, heal: 10, steel: 2 }, sharp: { mul: 1, every: 1 }, collapse: { radius: 1.5, stun: 2 },
  barricade: { reach: 2 }, hydra: { heads: 2 }, spatter: { chance: 0.25, reach: 3, mul: 0.3 },
  pool: { radius: 0.6, time: 2, dot: 0.3 }, burn: 0.5,
  meteor: { every: 15, mul: 8, radius: 3, stun: 3, fall: 1, size: 24 }, shards: { count: 2, reach: 2, size: 5 },
  quake: { every: 20, stun: 2 }, stones: { every: 10, mul: 1, stun: 1, fall: 0.5, size: 6 }, petrify: { time: 3, elite: 2, boss: 1 } };
export const AIM = { turn: 8, slack: Math.PI / 12, hold: 0.15, heavy: { turn: 2.5, slack: Math.PI / 36 } };
export const heavyGun = (t) => t.style === 'turret' && t.runes.has('giant');
export const GRENADE = { flight: 0.5, pace: 0.05 };
const ROLL_EVERY = 1;
const MUTE_HOLD = 0.25;
const PULL_TIME = 0.6;
const POTION_SPLASH = 0.8;
const ARMOR = 1;
const SHIELDS = 2;
export const OVERTIME = 120;
export const RAGE = { step: 0.2, every: 10, max: 10 };
const REVIVE_TIME = 1.5;
const CLINK_GAP = 0.25;
const RATTLE = { min: 3, spread: 3 };
const CHILL_MAX = 0.85;
const SEAS = new Set(['lake', 'river']);

function bendsOf(route) {
  const turns = [], bends = new Map();
  for (let i = 1; i < route.length - 1; i++) {
    const [a, b, c] = [route[i - 1], route[i], route[i + 1]];
    if ((b[0] - a[0]) * (c[1] - b[1]) !== (b[1] - a[1]) * (c[0] - b[0])) turns.push(i);
  }
  turns.forEach((i, k) => {
    const before = k ? i - turns[k - 1] : i, after = k + 1 < turns.length ? turns[k + 1] - i : route.length - 1 - i;
    bends.set(i, Math.min(BEND, before / 2, after / 2));
  });
  return bends;
}

function routeOf(path) {
  const first = path[0], second = path[1] || first;
  const last = path[path.length - 1], before = path[path.length - 2] || last;
  const cells = [[2 * first[0] - second[0], 2 * first[1] - second[1]]].concat(path,
    [[2 * last[0] - before[0], 2 * last[1] - before[1]]]);
  return cells.map(([x, y]) => [x + 0.5, y + 0.5]);
}

const BODILESS = new Set(TERRAIN.bodiless);
const GATE_SHIFT = 0.6;
const BEND = 0.9;
const JOIN_FADE = 6;
const SOLID = new Set(['mountain', 'tunnel', 'ruin', 'stones', 'crypt']);
const UNSAFE = new Set(['mountain', 'tunnel', 'lake', 'river', 'chasm', 'ruin', 'crater', 'stones', 'bones', 'crypt']);
const FROZEN = new Set(['lake', 'river']);
const TALL = new Set(['mountain', 'tunnel']);

function lineClear(solid, x0, y0, x1, y1) {
  const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 4), own = Math.floor(y0) * SIZE + Math.floor(x0);
  for (let k = 1; k <= steps; k++) {
    const x = x0 + (x1 - x0) * k / steps, y = y0 + (y1 - y0) * k / steps, at = Math.floor(y) * SIZE + Math.floor(x);
    if (at !== own && solid[at]) return false;
  }
  return true;
}

const near = (a, x, y, range) => (a.x - x) * (a.x - x) + (a.y - y) * (a.y - y) <= range * range;
const immune = (mob, element) => Boolean(element) && mob.element === element && !mob.exposed;
const alongside = (mob, p, q, reach) => {
  const dx = q.cx - p.cx, dy = q.cy - p.cy, len = dx * dx + dy * dy || 1;
  const k = Math.max(0, Math.min(1, ((mob.x - p.cx) * dx + (mob.y - p.cy) * dy) / len));
  return (mob.x - p.cx - dx * k) ** 2 + (mob.y - p.cy - dy * k) ** 2 <= reach * reach;
};
const wicked = (mob) => mob.undead || DEMONS.has(mob.look) || Boolean(mob.kind && DEMONS.has(mob.kind.id));
const IMMUNE_GAP = 0.6;
const SPLIT_GAP = 0.3;
export const SPLIT_TIME = 0.35;
const STEAL_RANGE = 1.2;
const GHOST_CUT = 0.5;
const MIRAGE_GAP = 0.35;
const elite = (mob) => mob.info.elite || Boolean(mob.silver);
const big = (mob) => elite(mob) || mob.info.boss;
const lookOfMob = (mob) => Object.values(LOOKS).flat().find((look) => look.id === mob.look) || null;
const steady = (mob, now) => mob.rage >= 1 || Boolean(mob.power) && (Boolean(mob.power.firm)
  || mob.power.steady && mob.powerUntil > now);
const veiled = (mob, now) => Boolean(mob.power) && mob.power.id === 'veil' && mob.powerUntil > now;
const underground = (mob, now) => !mob.solid && (mob.underUntil > now
  || Boolean(mob.power) && mob.power.id === 'tunnel' && mob.powerUntil <= now);
const ghostly = (mob, now) => mob.phaseUntil > now;
const hidden = (mob, now) => veiled(mob, now) || underground(mob, now);
const grounded = (mob, now) => !mob.flying && !underground(mob, now) && !ghostly(mob, now);

const open = (t, i) => (t.mods.perks ? t.mods.perks.includes(i) : t.level >= PERKS[i]);

export class Battle {
  constructor(map, { random = Math.random, lives = LIVES, quiet = false, tempo = 1 } = {}) {
    const plan = Array.isArray(map) ? { path: map } : map;
    this.path = plan.path;
    this.branch = plan.branch || [];
    this.merge = this.branch.length ? plan.merge : -1;
    this.tiles = plan.tiles || null;
    this.rivers = plan.rivers || [];
    this.biome = plan.biome || 'grass';
    this.rules = BIOME_RULES[this.biome];
    this.road = this.path.concat(this.branch);
    this.routes = [routeOf(this.path)];
    if (this.branch.length) this.routes.push(routeOf(this.branch.concat([this.path[this.merge]])));
    this.route = this.routes[0];
    this.length = this.route.length - 1;
    this.joinAt = this.branch.length + 1;
    this.joinShift = this.merge - this.branch.length;
    this.bends = this.routes.map((route, r) => bendsOf(r ? route.slice(0, -1) : route));
    this.gates = [this.path, this.branch].slice(0, this.routes.length).map((cells) => {
      const open = cells.findIndex(([x, y]) => !this.tiles || this.tiles[y * SIZE + x] !== 'tunnel');
      return open > 0 ? open + 0.5 : 0;
    });
    this.blocked = pathCells(this.road);
    this.rough = new Set();
    this.seaOf = new Int16Array(SIZE * SIZE).fill(-1);
    this.seaCells = [];
    this.arms = [];
    this.armKey = '';
    this.frozen = false;
    this.cooled = false;
    this.liquid = null;
    this.rain = null;
    this.snow = 0;
    this.weather = 0;
    this.roarUntil = 0;
    this.roarBoost = 0;
    this.solid = null;
    this.tall = null;
    this.sight = null;
    this.highSight = null;
    if (this.tiles) {
      this.solid = new Uint8Array(SIZE * SIZE);
      this.tall = new Uint8Array(SIZE * SIZE);
      this.sight = new Uint8Array(SIZE * SIZE * SIZE * SIZE);
      this.highSight = new Uint8Array(SIZE * SIZE * SIZE * SIZE);
      this.tiles.forEach((tile, at) => {
        if (SOLID.has(tile)) this.solid[at] = 1;
        if (TALL.has(tile)) this.tall[at] = 1;
      });
      this._terrain();
    }
    this.starts = this.routes.map((route) => {
      let i = 1;
      while (i < route.length - 1 && this.covered(route[i][0], route[i][1])) i++;
      return i > 1 ? i - GATE_SHIFT : 0;
    });
    this.gate = Math.max(0, Math.ceil(this.starts[0]) - 1);
    this.random = random;
    this.tempo = tempo;
    this.quiet = quiet;
    this.lives = lives;
    this.maxLives = lives;
    this.time = 0;
    this.wave = 0;
    this.towers = [];
    this.byCell = new Map();
    this.mobs = [];
    this.spawns = [];
    this.patches = [];
    this.walls = [];
    this.mounds = [];
    this.zones = [];
    this.vents = [];
    this.cauldrons = [];
    this.traps = [];
    this.clouds = [];
    this.puddles = [];
    this.phoenixes = [];
    this.drones = [];
    this.steel = 0;
    this.pulseAt = 0;
    this.births = [];
    this.delayed = [];
    this.arrows = [];
    this.springs = [];
    this.treasures = 0;
    this.ward = null;
    this.banners = [];
    this.rods = [];
    this.links = [];
    this.globes = [];
    this.rodAt = 0;
    this.left = [];
    this.catalyst = 0;
    this.sirenUntil = 0;
    this.steeled = new Map();
    this.stood = new Set();
    this.shields = [];
    this.lastSpawn = 0;
    this.wild = false;
    this.family = null;
    this.nextFamily = null;
    this.met = new Set();
    this.events = [];
    this.leaked = 0;
    this.foe = { hp: 0, speed: 0 };
    this._mobId = 0;
    this._scores = new Map();
  }

  _terrain() {
    const firm = this.rules.ice || this.frozen || this.cooled;
    this.rough = new Set();
    this.tiles.forEach((tile, at) => {
      if (UNSAFE.has(tile) && !(firm && FROZEN.has(tile))) this.rough.add(at);
    });
    this.seaOf.fill(-1);
    this.seaCells = [];
    this.armKey = '';
    this.arms = [];
    if (!this.rules.ice && !this.rules.dry && !this.frozen) this._seas();
    this.liquid = this.cooled ? 'basalt' : this.frozen ? 'ice' : null;
  }

  _seas() {
    const tile = (at) => this.tiles[at];
    for (let start = 0; start < SIZE * SIZE; start++) {
      if (!SEAS.has(tile(start)) || this.seaOf[start] >= 0) continue;
      const id = this.seaCells.length, cells = [], queue = [start], seen = new Set([start]);
      while (queue.length) {
        const at = queue.pop(), x = at % SIZE, y = (at - x) / SIZE;
        if (SEAS.has(tile(at))) {
          this.seaOf[at] = id;
          cells.push(at);
        }
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy, next = ny * SIZE + nx;
          if (!inside(nx, ny) || seen.has(next) || !SEAS.has(tile(next)) && tile(next) !== 'bridge') continue;
          seen.add(next);
          queue.push(next);
        }
      }
      this.seaCells.push(cells);
    }
  }

  sea(x, y) {
    return inside(x, y) ? this.seaOf[y * SIZE + x] : -1;
  }

  swims(t) {
    return t.style === 'kraken' && this.sea(t.x, t.y) >= 0;
  }

  molten(x, y) {
    return Boolean(this.rules.lava && !this.cooled && this.tiles && inside(x, y) && SEAS.has(this.tiles[y * SIZE + x]));
  }

  bathes(t) {
    return t.style === 'serpent' && this.molten(t.x, t.y);
  }

  _seaArms() {
    const wet = this.towers.filter((t) => this.sea(t.x, t.y) >= 0);
    const key = wet.map((t) => t.x + ',' + t.y + (t.style === 'kraken' ? 'k' : '')).join(';');
    if (key === this.armKey) return;
    this.armKey = key;
    this.arms = [];
    const used = new Map();
    for (const t of wet) {
      if (t.style !== 'kraken') continue;
      for (const at of this.seaCells[this.sea(t.x, t.y)]) {
        if (this.byCell.has(at)) continue;
        const taken = used.get(at) || [], open = ARM_SPOTS.map((spot, i) => i).filter((i) => !taken.includes(i));
        if (!open.length) continue;
        const pick = open[Math.floor(this.random() * open.length)], x = at % SIZE, y = (at - x) / SIZE;
        used.set(at, taken.concat(pick));
        this.arms.push({ tower: t, x: x + ARM_SPOTS[pick][0], y: y + ARM_SPOTS[pick][1], seed: this.random() });
      }
    }
  }

  free(x, y, over = false) {
    const at = y * SIZE + x;
    return inside(x, y) && !this.blocked.has(at) && (over === true || !this.rough.has(at)
      || over === 'sea' && this.seaOf[at] >= 0 || over === 'lava' && this.molten(x, y)) && !this.byCell.has(at)
      && !this.vents.some((vent) => vent.x === x && vent.y === y)
      && !this.springs.some((spring) => spring.x === x && spring.y === y)
      && !this.cauldrons.some((pot) => pot.x === x && pot.y === y);
  }

  bestCell(range) {
    const lists = this._reach(range), guarded = new Float64Array(this.road.length);
    for (const t of this.towers) {
      for (const i of this._reach(t.range)[t.y * SIZE + t.x]) guarded[i] += 1;
    }
    let best = -1, picks = [];
    for (let at = 0; at < SIZE * SIZE; at++) {
      const x = at % SIZE, y = (at - x) / SIZE;
      if (!this.free(x, y)) continue;
      let score = 0;
      for (const i of lists[at]) score += 1 / (1 + SPREAD * guarded[i]);
      score = Math.round(score * 1000) / 1000;
      if (score > best) {
        best = score;
        picks = [at];
      } else if (score === best) picks.push(at);
    }
    if (!picks.length) return null;
    const at = picks[Math.floor(this.random() * picks.length)];
    return { x: at % SIZE, y: Math.floor(at / SIZE) };
  }

  randomCell(range = 2) {
    const lists = this._reach(range), picks = [];
    for (let at = 0; at < SIZE * SIZE; at++) {
      const x = at % SIZE, y = (at - x) / SIZE;
      if (this.free(x, y) && lists[at].length) picks.push(at);
    }
    if (!picks.length) return this.bestCell(range);
    const at = picks[Math.floor(this.random() * picks.length)];
    return { x: at % SIZE, y: Math.floor(at / SIZE) };
  }

  _reach(range) {
    const key = range.toFixed(1);
    if (!this._scores.has(key)) {
      const lists = reach(this.road, Number(key));
      if (this.solid) {
        lists.forEach((list, at) => {
          const x = at % SIZE + 0.5, y = Math.floor(at / SIZE) + 0.5, screen = this.tiles[at] === 'hill' ? this.tall
            : this.solid;
          lists[at] = list.filter((i) => lineClear(screen, x, y, this.road[i][0] + 0.5, this.road[i][1] + 0.5));
        });
      }
      this._scores.set(key, lists);
    }
    return this._scores.get(key);
  }

  _tower(player, classId, x, y, mods) {
    return {
      player, cls: CLASS_BY_ID.get(classId), x, y, cx: x + 0.5, cy: y + 0.5, level: 0, mods, s: [], runes: new Set(),
      might: MIGHT.base, damage: 0, skill: 0, interval: 1, range: 0, baseRange: 0, critChance: 0,
      critMul: STAT.critBase, reach: 0, cone: 0, power: 1, luck: 1, haste: 1, cooldown: 0, busy: 0, napUntil: 0,
      stunUntil: 0, webUntil: 0,
      web: 1,
      reloadUntil: 0, angle: this._homeAngle(x, y), aimMob: null, aimHold: 0,
      charge: null,
      nextActive: 0, nextWall: 0, pull: null,
      wardUntil: 0, lift: 1,
      ownRange: 0, boost: { rate: 0, range: 0, damage: 0, might: 0 },
      boostBy: new Set(), torch: null, torches: [],
      run: { damage: 0, kills: 0, assists: 0, xp: 0, coins: 0 },
    };
  }

  _homeAngle(x, y) {
    const [bx, by] = this.path[Math.floor(this.path.length / 2)];
    return Math.atan2(bx - x, -(by - y));
  }

  _turn(t, dt, now) {
    if (t.cls.passive) return true;
    const charge = t.charge && t.charge.target && !t.charge.target.dead ? t.charge.target : null;
    const held = t.aimHold > now && t.aimMob && !t.aimMob.dead ? t.aimMob : null;
    const mob = charge || held || this.facing(t);
    if (!mob) return true;
    t.aimMob = mob;
    const s = heavyGun(t) ? AIM.heavy : AIM, want = Math.atan2(mob.x - t.cx, -(mob.y - t.cy)), gap = bend(want, t.angle);
    t.angle += Math.sign(gap) * Math.min(Math.abs(gap), s.turn * dt);
    return Math.abs(bend(want, t.angle)) <= s.slack;
  }

  place(player, classId, x, y, mods = NO_MODS) {
    if (!this.free(x, y, flier(mods.runes))) return null;
    const tower = this._tower(player, classId, x, y, mods);
    this.byCell.set(y * SIZE + x, tower);
    this.towers.push(tower);
    this._level(tower);
    if (this.stood.has(player) && tower.style === 'angel') tower.planted = true;
    return tower;
  }

  aloft(t) {
    return this.rough.has(t.y * SIZE + t.x);
  }

  covered(x, y) {
    const cx = Math.floor(x), cy = Math.floor(y);
    return Boolean(this.solid && inside(cx, cy) && this.solid[cy * SIZE + cx]);
  }

  onHill(tower) {
    return Boolean(this.tiles && this.tiles[tower.y * SIZE + tower.x] === 'hill');
  }

  onWatch(tower) {
    return Boolean(this.tiles && this.tiles[tower.y * SIZE + tower.x] === 'watch')
      || this.mounds.some((mound) => mound.x === tower.x && mound.y === tower.y);
  }

  _mound(t) {
    const made = this.mounds.filter((mound) => mound.player === t.player).length;
    if (made >= (t.stacks.get('terraform') || 0)) return;
    const taken = (x, y) => this.mounds.some((mound) => mound.x === x && mound.y === y)
      || Boolean(this.tiles && this.tiles[y * SIZE + x] === 'watch');
    const land = (x, y) => inside(x, y) && !this.blocked.has(y * SIZE + x) && !this.rough.has(y * SIZE + x)
      && !this.molten(x, y) && !taken(x, y);
    let spot = taken(t.x, t.y) || this.molten(t.x, t.y) ? null : { x: t.x, y: t.y };
    if (!spot && this.molten(t.x, t.y)) {
      let best = Infinity;
      for (let at = 0; at < SIZE * SIZE; at++) {
        const x = at % SIZE, y = (at - x) / SIZE, gap = Math.hypot(x - t.x, y - t.y) + this.random() * 0.01;
        if (land(x, y) && gap < best) {
          best = gap;
          spot = { x, y };
        }
      }
      if (!spot) return;
    }
    if (!spot) {
      const near = [];
      for (const [dx, dy] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]) {
        const x = t.x + dx, y = t.y + dy, at = y * SIZE + x;
        if (inside(x, y) && !this.blocked.has(at) && !this.rough.has(at) && !taken(x, y)) near.push({ x, y });
      }
      if (!near.length) return;
      spot = near[Math.floor(this.random() * near.length)];
    }
    this.mounds.push({ player: t.player, x: spot.x, y: spot.y });
    this._event({ kind: 'mound', tower: t, x: spot.x + 0.5, y: spot.y + 0.5 });
    const there = this.towerAt(spot.x, spot.y);
    if (there) this._stats(there);
  }

  screen(t) {
    if (!this.solid || t.cls.through || LOFTY.has(t.style) || this.onWatch(t) || this.aloft(t)) return null;
    return this.onHill(t) ? this.tall : this.solid;
  }

  sees(t, mob) {
    if (t.cls.through) return true;
    if (this.covered(mob.x, mob.y)) return false;
    const screen = this.screen(t);
    if (!screen) return true;
    const x = Math.floor(mob.x), y = Math.floor(mob.y);
    if (!inside(x, y)) return false;
    const key = (t.y * SIZE + t.x) * SIZE * SIZE + y * SIZE + x, known = screen === this.tall ? this.highSight
      : this.sight;
    if (!known[key]) known[key] = lineClear(screen, t.cx, t.cy, x + 0.5, y + 0.5) ? 1 : 2;
    return known[key] === 1;
  }

  ahead(mob) {
    return mob.d + (mob.r ? this.joinShift : 0);
  }

  _weak(element) {
    return element && element === this.rules.weak ? TERRAIN.weak : 1;
  }

  towerAt(x, y) {
    return this.byCell.get(y * SIZE + x) || null;
  }

  move(tower, x, y) {
    if (!this.free(x, y, flier(tower.runes))) return false;
    this._relocate(tower, x, y);
    tower.busy = this.time + MOVE_PAUSE;
    return true;
  }

  _relocate(tower, x, y) {
    this.byCell.delete(tower.y * SIZE + tower.x);
    this.byCell.set(y * SIZE + x, tower);
    tower.x = x;
    tower.y = y;
    tower.cx = x + 0.5;
    tower.cy = y + 0.5;
    this._stats(tower);
    if (tower.style === 'keeper' && this.walls.some((wall) => wall.tower === tower)) {
      this.walls = this.walls.filter((wall) => wall.tower !== tower);
      this._raiseWall(tower, this.time);
    }
  }

  refresh(tower) {
    tower.level = 0;
    this._level(tower);
  }

  setMods(tower, mods) {
    tower.mods = mods;
    this._stats(tower);
    this._ground(tower);
  }

  _ground(tower) {
    const over = flier(tower.runes);
    if (this.aloft(tower) && over !== true && !(over === 'sea' && this.sea(tower.x, tower.y) >= 0)
      && !(over === 'lava' && this.molten(tower.x, tower.y))) this._land(tower);
  }

  _land(tower) {
    let best = null;
    for (let at = 0; at < SIZE * SIZE; at++) {
      const x = at % SIZE, y = (at - x) / SIZE, gap = (x - tower.x) ** 2 + (y - tower.y) ** 2;
      if (this.free(x, y) && (!best || gap < best.gap)) best = { x, y, gap };
    }
    if (best) this._relocate(tower, best.x, best.y);
  }

  remove(tower) {
    const at = this.towers.indexOf(tower);
    if (at < 0) return;
    this.towers.splice(at, 1);
    this.byCell.delete(tower.y * SIZE + tower.x);
    for (const list of ['walls', 'patches', 'banners', 'rods', 'arrows', 'springs',
      'zones', 'phoenixes', 'drones', 'globes', 'traps', 'clouds', 'puddles']) {
      this[list] = this[list].filter((item) => item.tower !== tower);
    }
    this._flags();
  }

  _plantRod(t) {
    const [dx, dy] = STORM.rod.spot, taken = (x, y) => this.rods.some((rod) => rod.x === x && rod.y === y);
    let cell = taken(t.x, t.y) ? null : { x: t.x, y: t.y };
    if (!cell) {
      const cells = [];
      for (let y = t.y - 1; y <= t.y + 1; y++) {
        for (let x = t.x - 1; x <= t.x + 1; x++) {
          if (inside(x, y) && !this.blocked.has(y * SIZE + x) && !taken(x, y)) cells.push({ x, y });
        }
      }
      cell = cells.length ? cells[Math.floor(this.random() * cells.length)] : null;
    }
    if (!cell) return false;
    this.rods.push({ tower: t, x: cell.x, y: cell.y, cx: cell.x + dx, cy: cell.y + dy, seed: this.random(), readyAt: 0 });
    this._event({ kind: 'rod', tower: t, x: cell.x + dx, y: cell.y + dy });
    return true;
  }

  _storms(now) {
    const s = STORM.rod;
    this.links = this.links.filter((link) => link.until > now);
    for (const link of this.links) {
      for (const mob of this.mobs) {
        if (mob.dead || link.struck.has(mob) || hidden(mob, now) || this.covered(mob.x, mob.y)) continue;
        if (!link.pairs.some(([p, q]) => alongside(mob, p, q, s.touch))) continue;
        link.struck.add(mob);
        this._hurt(mob, link.damage, link.tower, 'storm');
      }
    }
    if (now < this.rodAt) return;
    this.rodAt = now + PULSE;
    const chance = s.chance * (this.rain ? WATER.rain.rods : 1);
    for (const rod of this.rods) if (this.random() < chance) this._strikeRod(rod, now);
  }

  _strikeRod(rod, now) {
    if (now < rod.readyAt) return;
    const s = STORM.rod, all = [rod].concat(this.rods.filter((other) => other !== rod && now >= other.readyAt)), pairs = [];
    for (const one of all) one.readyAt = now + s.gap;
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) pairs.push([all[i], all[j]]);
    this._event({ kind: 'skybolt', tower: rod.tower, x: rod.cx, y: rod.cy });
    for (const at of all) this._discharge(at);
    if (!pairs.length) return;
    this.links.push({ tower: rod.tower, pairs, until: now + s.time, damage: rod.tower.damage * s.link, struck: new Set() });
    this._event({ kind: 'links', tower: rod.tower, pairs: pairs.map(([p, q]) => [p.cx, p.cy, q.cx, q.cy]), time: s.time });
  }

  _arc(mob, by) {
    if (by.cls.id !== 'thunder' || !by.runes.has('spark')) return;
    const s = STORM.spark, x = mob.x, y = mob.y;
    this._event({ kind: 'skybolt', tower: by, x, y, mob, ground: true });
    this._hurt(mob, by.damage * s.mul, by, 'storm');
    for (const rod of this.rods.slice()) {
      if ((rod.cx - x) ** 2 + (rod.cy - y) ** 2 <= s.reach * s.reach) this._strikeRod(rod, this.time);
    }
  }

  _dashes(now) {
    const s = WOLF.dash;
    for (const t of this.towers) {
      const pull = t.pull;
      if (!pull || !pull.dash || pull.done) continue;
      const spot = pullAt(t, now);
      for (const mob of this._around(spot.x, spot.y, s.touch)) {
        if (pull.hit.has(mob)) continue;
        pull.hit.add(mob);
        this._hurt(mob, t.damage * s.mul, t);
      }
      if (now >= pull.end) pull.done = true;
    }
  }

  _globes(now) {
    const s = STORM.globe;
    this.globes = this.globes.filter((globe) => {
      const age = Math.min(now - globe.born, globe.life);
      globe.x = globe.sx + globe.dx * age * s.speed;
      globe.y = globe.sy + globe.dy * age * s.speed;
      for (const mob of this._around(globe.x, globe.y, s.touch)) {
        if (globe.hit.has(mob)) continue;
        globe.hit.add(mob);
        this._hurt(mob, globe.tower.damage * s.mul, globe.tower);
      }
      if (now >= globe.zapAt) {
        globe.zapAt = now + PULSE;
        const prey = this._around(globe.x, globe.y, s.reach).filter((mob) => !this.covered(mob.x, mob.y));
        const zapped = new Set();
        for (let k = 0; k < s.bolts && prey.length; k++) {
          const fresh = prey.filter((mob) => !zapped.has(mob)), from = fresh.length ? fresh : prey;
          const mob = from[Math.floor(this.random() * from.length)];
          zapped.add(mob);
          this._event({ kind: 'jolt', tower: globe.tower, x: globe.x, y: globe.y, mob, thin: true });
          this._hurt(mob, globe.tower.damage * s.zap, globe.tower);
        }
      }
      return now - globe.born < globe.life;
    });
  }

  _discharge(rod) {
    const s = STORM.rod;
    this._event({ kind: 'surge', tower: rod.tower, x: rod.cx, y: rod.cy, radius: s.radius });
    for (const mob of this._around(rod.cx, rod.cy, s.radius)) {
      if (!this.covered(mob.x, mob.y)) this._hurt(mob, rod.tower.damage * s.wave, rod.tower, 'storm');
    }
  }

  leave(tower) {
    this.towers.splice(this.towers.indexOf(tower), 1);
    this.byCell.delete(tower.y * SIZE + tower.x);
    for (const list of ['zones', 'phoenixes', 'drones', 'globes', 'arrows', 'springs']) {
      this[list] = this[list].filter((item) => item.tower !== tower);
    }
    if (LEFT_ITEMS.some((list) => this[list].some((item) => item.tower === tower))) this.left.push(tower);
    this._flags();
  }

  adopt(old, tower) {
    this.left = this.left.filter((t) => t !== old);
    for (const list of LEFT_ITEMS) for (const item of this[list]) if (item.tower === old) item.tower = tower;
  }

  _leftovers(now) {
    this.left = this.left.filter((t) => LEFT_ITEMS.some((list) => this[list].some((item) => item.tower === t)));
    for (const t of this.left) {
      erupt(this, t, now);
      brew(this, t, now);
    }
  }

  _waveHp(type, players = this.players || 1, wave = Math.max(1, this.wave)) {
    return waveHp(wave, type, players, this.tempo);
  }

  get kin() {
    return this.family ? this.family.hp : 1;
  }

  planFamily(wave) {
    if (wave % FINALE.every === 0) {
      this.nextFamily = FINALE;
      return FINALE;
    }
    const open = FAMILIES.filter((family) => !family.from || family.from <= wave);
    const fresh = open.filter((family) => family !== this.family);
    const pool = fresh.length ? fresh : open;
    this.nextFamily = pool[Math.floor(this.random() * pool.length)];
    return this.nextFamily;
  }

  startWave(wave, players = this.towers.length) {
    this.wave = wave;
    for (const t of this.towers) t.godThrows = 0;
    this.players = players;
    this.steel = 0;
    this.shields = [];
    for (const t of this.towers) this._steelOf(t);
    const start = this.time, toughness = Math.max(FLOOR, 1 + this.foe.hp);
    const family = this.nextFamily || this.planFamily(wave);
    this.family = family;
    this.nextFamily = null;
    const pick = (list) => list[Math.floor(this.random() * list.length)], finale = family === FINALE;
    const elites = familyPool(family, ELITES, wave), boss = finale ? DIABLO : pick(familyPool(family, BOSSES, wave));
    const plan = finale ? [{ type: 'boss', delay: 0 }] : waveSpawns(wave, family.count || 1);
    const length = plan.length ? plan[plan.length - 1].delay : 0;
    for (let i = finale ? 0 : eliteCount(wave, this.random); i > 0; i--) {
      plan.push({ type: 'elite', delay: this.random() * length });
    }
    if (!finale && wave >= MIMIC.from && this.random() < MIMIC.chance) {
      plan.push({ type: 'elite', delay: this.random() * length, kind: MIMIC });
    }
    this.wild = false;
    this.spawns = plan.map((s) => {
      const spawn = { type: s.type, at: start + s.delay, hp: this._waveHp(s.type) * toughness, kind: null, r: 0 };
      if (s.kind) {
        spawn.kind = s.kind;
        spawn.hp *= s.kind.hp || 1;
        return spawn;
      }
      spawn.hp *= family.hp;
      if (s.type === 'boss') {
        spawn.kind = boss;
        spawn.hp *= boss.hp || 1;
      }
      else if (s.type === 'elite') spawn.kind = pick(elites);
      else {
        spawn.look = pick(familyPool(family, LOOKS[s.type], wave));
        spawn.hp *= spawn.look.hp || 1;
        if (this.random() < silverChance(wave)) {
          spawn.silver = pick(AFFIXES.filter((affix) => !(affix.power && spawn.look.power)
            && !(affix.element && spawn.look.element)));
          spawn.hp *= SILVER.hp * (spawn.silver.hp || 1);
        }
      }
      return spawn;
    });
    const more = this.rules.more, flies = (spawn) => Boolean((spawn.kind || spawn.look || {}).flying);
    if (more) {
      const kin = this.spawns.filter((spawn) => !spawn.kind && flies(spawn) === (more === 'air'));
      for (let i = Math.round(kin.length * TERRAIN.more); i > 0; i--) {
        const copy = Object.assign({}, kin[Math.floor(this.random() * kin.length)]);
        copy.at = start + this.random() * length;
        this.spawns.push(copy);
      }
    }
    this.spawns.sort((a, b) => a.at - b.at);
    this._eyes();
    if (this.branch.length) {
      this.spawns.forEach((spawn, i) => {
        spawn.r = i % 2;
        if (spawn.r) spawn.at = this.spawns[i - 1].at;
      });
    }
    this.lastSpawn = this.spawns.length ? this.spawns[this.spawns.length - 1].at : start;
    for (const wall of this.walls) {
      if (wall.ice) continue;
      const max = this._wallMax(wall.tower);
      wall.hp = max * wall.hp / wall.max;
      wall.max = max;
    }
  }

  _eyes() {
    const eyes = this.towers.filter((t) => t.cls.id === 'forester' && t.runes.has('eye'));
    const prey = this.spawns.slice().sort((a, b) => b.hp - a.hp);
    eyes.forEach((t, i) => {
      if (prey[i]) prey[i].eyed = t;
    });
  }

  get cleared() {
    return !this.spawns.length && !this.mobs.length && !this.births.length;
  }

  endWave() {
    this.patches = [];
    this.clouds = [];
    this.puddles = [];
    for (const trap of this.traps) trap.openAt = 0;
    if (this.ward) {
      this.lives = Math.min(this.maxLives, Math.max(0, this.lives) + HOLY.second.lives);
      if (this.towers.includes(this.ward.tower)) this._help(this.ward.tower, HOLY.second.lives * HELP.heal);
      this._event({ kind: 'heal', tower: this.ward.tower, lives: HOLY.second.lives });
      this.ward = null;
    }
    const [hx, hy] = this.path[this.path.length - 1];
    const menders = this.towers.filter((t) => t.style === 'angel' && t.runes.has('mercy')
      && Math.abs(t.x - hx) <= HOLY.mercy.reach && Math.abs(t.y - hy) <= HOLY.mercy.reach);
    if (menders.length && this.lives < this.maxLives) {
      const heal = Math.min(menders.length * HOLY.mercy.lives, this.maxLives - this.lives);
      this.lives += heal;
      for (const t of menders) this._help(t, heal / menders.length * HELP.heal);
      this._event({ kind: 'heal', tower: menders[0], lives: heal });
    }
  }

  step(dt) {
    this.time += dt;
    const now = this.time;
    while (this.spawns.length && this.spawns[0].at <= now) {
      const spawn = this.spawns.shift();
      this._spawn(spawn, this.starts[spawn.r], spawn.r);
    }
    if (!this.wild && this.mobs.length && now - this.lastSpawn > OVERTIME) {
      this.wild = true;
      this.wildAt = now;
      for (const mob of this.mobs) mob.wild = true;
      this._event({ kind: 'wild' });
    }
    this._jobs(now);
    this._powers(dt, now);
    this._effects(dt, now);
    if (now >= this.pulseAt) {
      this.pulseAt = now + PULSE;
      this._pulse(now);
    }
    this._walk(dt, now);
    this._buffs(now);
    this._shoot(dt, now);
    this._leftovers(now);
    this._storms(now);
    this._drones(dt, now);
    if (this.mobs.some((m) => m.dead)) this.mobs = this.mobs.filter((m) => !m.dead);
    if (this.births.some((birth) => birth.at <= now)) {
      const ready = this.births.filter((birth) => birth.at <= now);
      this.births = this.births.filter((birth) => birth.at > now);
      for (const birth of ready) {
        const mob = this._spawn(birth.spawn, birth.d, birth.r);
        mob.split = !birth.risen;
        mob.risen = Boolean(birth.risen);
        if (birth.risen) {
          mob.revive = 0;
          this._event({ kind: 'rise', mob });
          for (let i = 0; i < (birth.raise || 0); i++) this._summon(mob, 'normal', 'skeleton', 0.8, i);
        }
      }
    }
  }

  _later(delay, run, t = null) {
    this.delayed.push({ at: this.time + delay, run, tower: t, striking: t ? t.striking : false });
  }

  _jobs(now) {
    if (!this.delayed.some((job) => job.at <= now)) return;
    const due = this.delayed.filter((job) => job.at <= now);
    this.delayed = this.delayed.filter((job) => job.at > now);
    for (const job of due) {
      if (job.tower) job.tower.striking = job.striking;
      job.run();
    }
  }

  _event(event) {
    if (this.quiet) return;
    this.events.push(event);
    if (this.events.length > EVENTS_MAX) this.events.splice(0, this.events.length - EVENTS_MAX / 2);
  }

  _spawn(spawn, d = 0, r = 0) {
    const info = MOBS[spawn.type], kind = spawn.kind || null, shape = kind || spawn.look || null;
    const silver = spawn.silver || null;
    const power = shape && shape.power ? POWERS[shape.power] : silver && silver.power ? POWERS[silver.power] : null;
    const fallback = LOOKS[spawn.type] || (info.boss ? BOSSES : ELITES);
    const look = kind ? kind.id : spawn.look ? spawn.look.id : fallback[0].id;
    const mob = {
      id: ++this._mobId, type: spawn.type, info, kind, power, look, name: kind ? kind.name : spawn.look
        ? spawn.look.name : info.name, flying: Boolean(shape && shape.flying),
      burrow: shape && shape.burrow || null, phase: shape && shape.phase || null, burrowAt: this.time + 2,
      phaseAt: this.time + 1, underUntil: 0, phaseUntil: 0, thief: shape && shape.thief || 0, stolen: 0,
      robbed: null, mirage: Boolean(shape && shape.mirage), fake: Boolean(spawn.fake), front: shape && shape.front
        || 0, ward: 0, cargo: power && power.cargo || 0, leak: kind && kind.leak || info.leak,
      fireproof: kind && kind.fireproof || 0, curlReady: 0, fatal: Boolean(kind && kind.fatal),
      element: shape && shape.element || silver && silver.element || null, slime: shape && shape.slime || 0,
      immuneAt: 0, silver, undead: Boolean(shape && shape.undead), eyed: spawn.eyed || null,
      armor: Math.max(shape && shape.armor || 0, silver && silver.armor || 0),
      revive: shape && shape.revive || power && power.revive || 0, treasure: Boolean(kind && kind.treasure),
      clinkAt: 0, rattleAt: this.time + RATTLE.min, wild: this.wild, hitAt: -1e9,
      powerAt: this.time + (power && power.every ? 2 : 0), powerUntil: 0, hp: spawn.hp, max: spawn.hp, d, r, x: 0,
      skill: kind && kind.skill ? POWERS[kind.skill] : null, skillAt: this.time + (kind && kind.skill
        ? POWERS[kind.skill].first : 0), hook: null,
      y: 0, speed: WAVE.speed * info.speed * Math.max(FLOOR, 1 + this.foe.speed) * ((shape && shape.flying
        ? this.rules.air : this.rules.ground) || 1) * (1 + (silver && silver.speed || 0)) * (kind && kind.pace || 1),
      slow: 0, slowUntil: 0,
      mark: 0, markUntil: 0, vuln: 0, vulnUntil: 0, rush: 0, rushUntil: 0,
      charge: null, rot: null,
      muteUntil: 0, purgeUntil: 0, exposed: false, netUntil: 0, rootAt: 0, rootUntil: 0, rootFree: 0, stuck: null, thicketUntil: 0,
      rollAt: this.time + ROLL_EVERY, sharpAt: 0, stoneUntil: 0, stoned: null, rage: 0, solid: false, resist: resistOf(this.wave), holdUntil: 0, holdFree: 0,
      holdBy: '', pushed: 0, poison: null, burn: null, helpers: new Set(), dealt: new Map(), last: null, dead: false, biting: 0,
      wall: null, fury: 0, sx: 0, sy: 0, placed: false,
    };
    this._locate(mob);
    this.mobs.push(mob);
    if (kind) {
      if (mob.info.boss || !this.met.has('kind:' + kind.id)) this._event({ kind: 'arrive', mob });
      this.met.add('kind:' + kind.id);
    } else if (silver && !this.met.has('silver:' + silver.id)) {
      this.met.add('silver:' + silver.id);
      this._event({ kind: 'silver', mob, affix: silver });
    } else if (spawn.look && spawn.look.text && !this.met.has(spawn.look.id)) {
      this.met.add(spawn.look.id);
      this._event({ kind: 'newcomer', mob, look: spawn.look });
    }
    return mob;
  }

  _powers(dt, now) {
    const breakers = this.towers.filter((t) => t.cls.id === 'sorceress' && t.runes.has('unbind'));
    for (const mob of this.mobs) {
      mob.fury = 0;
      mob.exposed = breakers.some((t) => near(mob, t.cx, t.cy, SPELL.unbind));
    }
    for (const banner of this.banners) {
      if (banner.kind !== 'purge') continue;
      for (const mob of this.mobs) {
        if (mob.dead || !near(mob, banner.cx, banner.cy, SPELL.totem.radius)) continue;
        mob.muteUntil = Math.max(mob.muteUntil, now + SPELL.totem.hold);
        mob.purgeUntil = mob.muteUntil;
        mob.rushUntil = 0;
        mob.ward = 0;
      }
    }
    const solid = this.towers.some((t) => t.runes.has('solid')), rage = this.rage;
    for (const mob of this.mobs) {
      if (mob.dead) continue;
      mob.solid = solid;
      mob.rage = mob.wild ? rage : 0;
      if (mob.burrow && now >= mob.burrowAt && !solid) {
        mob.burrowAt = now + mob.burrow.every;
        mob.underUntil = now + mob.burrow.time;
        this._event({ kind: 'dig', mob });
      }
      if (mob.phase && now >= mob.phaseAt) {
        mob.phaseAt = now + mob.phase.every;
        mob.phaseUntil = now + mob.phase.time;
      }
      if (mob.skill && mob.skill.id === 'hook') this._hookStep(mob, mob.skill, now);
      const power = mob.power;
      if (!power) continue;
      if (mob.muteUntil > now) {
        if (power.every && now >= mob.powerAt) mob.powerAt = now + MUTE_HOLD;
        continue;
      }
      if (power.every && now >= mob.powerAt) {
        mob.powerAt = now + power.every;
        mob.powerUntil = now + (power.time || 0);
        this._event({ kind: 'power', mob });
        if (!mob.banished) for (let i = 0; i < (power.count || 0); i++) this._summon(mob, power.summon, power.look, power.hp, i);
        if (power.id === 'blink' && !mob.biting) {
          const from = [mob.x, mob.y];
          mob.d = Math.min(this.length - HEART_GAP, mob.d + power.jump);
          this._locate(mob);
          this._event({ kind: 'blink', mob, x: from[0], y: from[1] });
        }
        if (power.id === 'hex' || power.id === 'swoop') this._hex(mob, power);
        if (power.id === 'ward') this._ward(mob, power);
        if (power.id === 'breath') this._breathe(mob, power);
        if (power.id === 'web') this._web(mob, power);
        if (power.id === 'wail') this._wail(mob, power);
        if (power.id === 'roar') this._roar(mob, power, now);
        if (power.id === 'shift') {
          mob.element = power.cycle[(power.cycle.indexOf(mob.element) + 1) % power.cycle.length];
          this._event({ kind: 'shift', mob, element: mob.element });
        }
      }
      if (mob.treasure && now >= mob.rattleAt) {
        mob.rattleAt = now + RATTLE.min + this.random() * RATTLE.spread;
        this._event({ kind: 'rattle', mob });
      }
      if (power.id === 'fury') {
        for (const other of this.mobs) {
          if (other !== mob && !other.dead && !(other.muteUntil > now) && near(other, mob.x, mob.y, power.range)) {
            other.fury = power.boost;
          }
        }
      }
      if (power.heal && power.range) {
        for (const other of this.mobs) {
          if (!other.dead && near(other, mob.x, mob.y, power.range)) {
            other.hp = Math.min(other.max, other.hp + other.max * power.heal * dt);
          }
        }
      } else if (power.heal) mob.hp = Math.min(mob.max, mob.hp + mob.max * power.heal * dt);
    }
  }

  _hookStep(mob, skill, now) {
    const hook = mob.hook;
    if (!hook) {
      if (now < mob.skillAt || mob.biting || mob.muteUntil > now || this.covered(mob.x, mob.y)) return;
      mob.skillAt = now + skill.every;
      const targets = this.towers.filter((t) => (!t.pull || t.pull.end <= now));
      if (!targets.length) return;
      const tower = targets[Math.floor(this.random() * targets.length)];
      mob.hook = { tower, at: now, lands: now + skill.fly, ends: now + skill.fly + skill.pull, caught: false };
      this._event({ kind: 'hook', mob, tower });
      return;
    }
    const t = hook.tower;
    if (!this.towers.includes(t)) {
      mob.hook = null;
      return;
    }
    if (!hook.caught && now >= hook.lands) {
      const cell = this._hookCell(mob, t);
      if (!cell) {
        mob.hook = null;
        return;
      }
      hook.caught = true;
      t.pull = { fx: t.cx, fy: t.cy, start: now, end: hook.ends };
      if (cell.x !== t.x || cell.y !== t.y) this._relocate(t, cell.x, cell.y);
      t.busy = Math.max(t.busy, hook.ends);
      this._event({ kind: 'yank', mob, tower: t });
    }
    if (hook.caught && now >= hook.ends) mob.hook = null;
  }

  _hookCell(mob, t) {
    const mx = Math.floor(mob.x), my = Math.floor(mob.y);
    let best = null, gap = Infinity;
    for (let y = my - 1; y <= my + 1; y++) {
      for (let x = mx - 1; x <= mx + 1; x++) {
        if (x === mx && y === my) continue;
        const own = x === t.x && y === t.y;
        if (!own && !this.free(x, y)) continue;
        const d = (x + 0.5 - t.cx) ** 2 + (y + 0.5 - t.cy) ** 2;
        if (d < gap) {
          gap = d;
          best = { x, y };
        }
      }
    }
    return best;
  }

  _summon(mob, type, id, share, i) {
    const look = LOOKS[type].find((item) => item.id === id);
    const child = this._spawn({ type, look, hp: this._waveHp(type) * share * this.kin },
      Math.max(0, mob.d - 0.3 - i * 0.25), mob.r);
    child.summoned = true;
    return child;
  }

  _hex(mob, power) {
    let target = null, best = power.range * power.range;
    for (const t of this.towers) {
      const d2 = (t.cx - mob.x) * (t.cx - mob.x) + (t.cy - mob.y) * (t.cy - mob.y);
      if (d2 <= best) {
        best = d2;
        target = t;
      }
    }
    if (!target) return;
    if (this._daze(target, power.hold)) this._event({ kind: 'hex', mob, tower: target });
  }

  _wail(mob, power) {
    const dazed = this.towers.filter((t) => near({ x: t.cx, y: t.cy }, mob.x, mob.y, power.range)
      && this._daze(t, power.hold));
    this._event({ kind: 'wail', mob, radius: power.range, towers: dazed });
  }

  _roar(mob, power, now) {
    for (const other of this.mobs) {
      if (other.dead || !near(other, mob.x, mob.y, power.range)) continue;
      other.rush = power.boost;
      other.rushUntil = now + power.time;
    }
    this._event({ kind: 'roar', mob, radius: power.range });
  }

  _ward(mob, power) {
    for (const other of this.mobs) {
      if (other.dead || !near(other, mob.x, mob.y, power.range)) continue;
      other.ward = Math.max(other.ward, other.max * power.ward);
    }
    this._event({ kind: 'ward', mob });
  }

  _breathe(mob, power) {
    let target = null, best = power.length * power.length;
    for (const t of this.towers) {
      const d2 = (t.cx - mob.x) * (t.cx - mob.x) + (t.cy - mob.y) * (t.cy - mob.y);
      if (d2 <= best) {
        best = d2;
        target = t;
      }
    }
    if (!target) return;
    const length = Math.sqrt(best) || 1, dx = (target.cx - mob.x) / length, dy = (target.cy - mob.y) / length;
    const burnt = (item) => {
      const along = (item.x - mob.x) * dx + (item.y - mob.y) * dy;
      const aside = Math.abs((item.x - mob.x) * dy - (item.y - mob.y) * dx);
      return along >= 0 && along <= power.length && aside <= power.width;
    };
    for (const t of this.towers) {
      if (burnt({ x: t.cx, y: t.cy })) this._daze(t, power.hold);
    }
    this._event({ kind: 'breath', mob, x: mob.x + dx * power.length, y: mob.y + dy * power.length });
  }

  _web(mob, power) {
    let target = null, best = power.range * power.range;
    for (const t of this.towers) {
      const d2 = (t.cx - mob.x) * (t.cx - mob.x) + (t.cy - mob.y) * (t.cy - mob.y);
      if (d2 <= best) {
        best = d2;
        target = t;
      }
    }
    if (!target || target.wardUntil > this.time) return;
    target.webUntil = this.time + power.time;
    target.web = power.slow;
    this._event({ kind: 'web', mob, tower: target });
  }

  _facing(mob, t) {
    const route = this.routes[mob.r], i = Math.max(0, Math.min(route.length - 2, Math.floor(mob.d)));
    const a = route[i], b = route[i + 1];
    return (b[0] - a[0]) * (t.cx - mob.x) + (b[1] - a[1]) * (t.cy - mob.y) > 0;
  }

  _mirage(mob) {
    mob.mirage = false;
    for (const shift of [-MIRAGE_GAP, MIRAGE_GAP]) {
      const spawn = { type: mob.type, look: lookOfMob(mob), hp: 1, fake: true };
      this.births.push({ spawn, d: Math.max(0, mob.d + shift), r: mob.r, at: this.time });
    }
    this._event({ kind: 'mirage', mob });
  }

  _unload(mob, all) {
    const total = mob.power.cargo;
    while (mob.cargo > 0 && (all || mob.hp / mob.max < mob.cargo / (total + 1))) {
      mob.cargo -= 1;
      const hp = this._waveHp('normal') * mob.power.hp;
      const spawn = { type: 'normal', look: lookOf('goblin'), hp };
      this.births.push({ spawn, d: Math.max(0, mob.d - 0.3 - mob.cargo * 0.25), r: mob.r, at: this.time });
      this._event({ kind: 'drop', mob });
    }
  }

  _steal(mob) {
    for (const t of this.towers) {
      if (mob.robbed && mob.robbed.has(t) || !near(mob, t.cx, t.cy, STEAL_RANGE)) continue;
      mob.robbed = mob.robbed || new Set();
      mob.robbed.add(t);
      const coins = Math.min(mob.thief, Math.floor(t.player.coins));
      if (coins <= 0) continue;
      t.player.coins -= coins;
      mob.stolen += coins;
      this._event({ kind: 'steal', mob, tower: t, coins });
    }
  }

  _locate(mob) {
    const was = mob.placed ? [mob.x, mob.y] : null;
    if (mob.r && mob.d >= this.joinAt) {
      mob.r = 0;
      mob.d += this.joinShift;
      this._onRoute(mob);
      if (was) {
        mob.sx = was[0] - mob.x;
        mob.sy = was[1] - mob.y;
      }
    } else this._onRoute(mob);
    mob.placed = true;
    mob.x += mob.sx;
    mob.y += mob.sy;
  }

  _onRoute(mob) {
    const route = this.routes[mob.r], length = route.length - 1, bends = this.bends[mob.r];
    const d = Math.max(0, Math.min(length, mob.d)), i = Math.min(length - 1, Math.floor(d)), f = d - i;
    for (const k of [i, i + 1]) {
      const bend = bends.get(k);
      if (!bend || Math.abs(d - k) >= bend) continue;
      const [a, p, c] = [route[k - 1], route[k], route[k + 1]], t = (d - k + bend) / (bend * 2);
      const from = [p[0] - (p[0] - a[0]) * bend, p[1] - (p[1] - a[1]) * bend];
      const to = [p[0] + (c[0] - p[0]) * bend, p[1] + (c[1] - p[1]) * bend];
      mob.x = (1 - t) * (1 - t) * from[0] + 2 * (1 - t) * t * p[0] + t * t * to[0];
      mob.y = (1 - t) * (1 - t) * from[1] + 2 * (1 - t) * t * p[1] + t * t * to[1];
      return;
    }
    const a = route[i], b = route[i + 1];
    mob.x = a[0] + (b[0] - a[0]) * f;
    mob.y = a[1] + (b[1] - a[1]) * f;
  }

  _level(tower) {
    const level = levelOf(tower.player.xp);
    if (level === tower.level) return;
    const raised = tower.level > 0;
    tower.level = level;
    this._stats(tower);
    if (raised) this._event({ kind: 'level', tower, level });
  }

  _stats(tower) {
    const cls = tower.cls, mods = tower.mods, b = cls.base, base = baseOf(cls);
    const skill = mastery(), haste = skill.haste * (1 + (mods.haste || 0));
    tower.might = mightOf(mods.power || 0, mods.paragon || 0);
    tower.power = skill.power;
    tower.luck = skill.luck;
    tower.haste = haste;
    tower.s = cls.skills.map((item) => scaled(item, { power: skill.power, luck: skill.luck, haste }));
    tower.runes = new Set(mods.runes || []);
    tower.stacks = new Map();
    for (const id of mods.runes || []) tower.stacks.set(id, (tower.stacks.get(id) || 0) + 1);
    tower.look = mods.look || cls.id;
    tower.style = cls.styles ? (cls.styles.find((item) => tower.runes.has(item.id)) || {}).id || null : null;
    tower.react = cls.react && (cls.react.skill.startsWith('perk') ? open(tower, Number(cls.react.skill.slice(4)))
      : tower.runes.has(cls.react.skill)) ? cls.react.element : null;
    const boost = Math.max(FLOOR, 1 + (mods.damage || 0)) * tower.might / MIGHT.base * (DAMAGE_UP[cls.id] || 1);
    tower.damage = base.damage * boost;
    tower.skill = base.skill * boost;
    tower.element = STYLE_ELEMENTS[tower.style] || cls.element || null;
    const shot = cls.id === 'sniper' && SHOT[tower.style] || cls.id === 'mechanic' && MECH[tower.style]
      || cls.id === 'forester' && WOOD[tower.style] || cls.id === 'priest' && HOLY[tower.style]
      || cls.id === 'sorceress' && SPELL[tower.style] || cls.id === 'thunder' && STORM[tower.style]
      || cls.id === 'frost' && WATER[tower.style] || cls.id === 'earth' && EARTH[tower.style] || null;
    if (shot) tower.damage *= shot.mul;
    if (tower.style === 'shamaness' && tower.runes.has('resonance')) tower.damage *= SPELL.resonance.mul;
    tower.interval = (shot && shot.interval || base.interval) / Math.max(FLOOR, 1 + (mods.rate || 0));
    if (tower.style === 'dragon') tower.interval = PULSE / Math.max(FLOOR, 1 + (mods.rate || 0));
    if (tower.style === 'angel' && tower.runes.has('smite')) tower.interval = HOLY.smite.every;
    if (tower.style === 'turret' && tower.runes.has('giant')) {
      tower.interval = MECH.giant.gap / Math.max(FLOOR, 1 + (mods.rate || 0));
    }
    tower.critChance = Math.min(STAT.critMax, base.crit + (mods.crit || 0)
      + (tower.style === 'fireball' && tower.runes.has('giant') ? FIRE.crit : 0) + (shot && shot.crit || 0));
    tower.critMul = base.critMul * (cls.id === 'sniper' && tower.runes.has('goldRounds') ? SHOT.gold : 1);
    tower.deep = tower.style === 'marksman' && tower.runes.has('sixth');
    tower.reach = base.reach;
    tower.cone = tower.style === 'dragon' ? FIRE.cone * (tower.runes.has('wide') ? FIRE.coneWide : 1) : 0;
    tower.ring = tower.style === 'ignite' && tower.runes.has('flameRing')
      ? FIRE.ring.radius + FIRE.ring.grow * Math.max(0, tower.might / MIGHT.base - 1) : 0;
    tower.frost = tower.style === 'cryo' && tower.runes.has('frostRing')
      ? WATER.frostRing.radius + WATER.frostRing.grow * Math.max(0, tower.might / MIGHT.base - 1) : 0;
    tower.baseRange = Math.max(RANGE_MIN, this._reachOf(tower, b) + (mods.range || 0))
      + (this.onHill(tower) ? TERRAIN.hill : 0) + (this.onWatch(tower) ? TERRAIN.watch : 0);
    tower.ownRange = tower.baseRange + tower.reach;
    if (tower.style === 'angel') tower.baseRange = tower.ownRange = HOLY.angel.reach;
    if (tower.style === 'raiju') tower.baseRange = tower.ownRange = STORM.raiju.reach;
    if (tower.style === 'kraken') tower.baseRange = tower.ownRange = WATER.kraken.reach;
    if (tower.style === 'hydro' && tower.runes.has('bubble') && !tower.bubble) {
      tower.bubble = { charges: 0, fly: null };
      tower.nextBubble = this.time + WATER.bubble.every;
    }
    if (tower.style === 'cryo' && tower.icicles === undefined) Object.assign(tower, { icicles: WATER.cryo.stock, refillAt: 0 });
    tower.range = fixedRange(tower) ? tower.ownRange : tower.ownRange * (1 + tower.boost.range);
    tower.lift = 1 + (tower.might / MIGHT.base - 1) * MIGHT.lift;
    this._steelOf(tower);
    this._plant(tower);
    this._flags();
  }

  _reachOf(tower, b) {
    if (tower.style === 'fireball') return b.range + 1 + (tower.runes.has('giant') ? 0.5 : 0);
    if (tower.style === 'dragon') return (b.range - 0.5) * (tower.runes.has('lungs') ? 2 : 1);
    if (tower.style === 'ignite') return 0;
    if (tower.style === 'scope' || tower.style === 'mortar') return FAR_REACH;
    if (tower.style === 'assault' || tower.style === 'marksman') return b.range + SHOT[tower.style].range;
    if (tower.style === 'turret' || tower.style === 'demo') return b.range + MECH[tower.style].range;
    if (tower.style === 'hunter' || tower.style === 'witch') return b.range + WOOD[tower.style].range;
    if (tower.cls.id === 'priest' && HOLY[tower.style]) return HOLY[tower.style].reach;
    if (tower.style === 'shamaness' && tower.runes.has('resonance')) return SPELL.resonance.reach;
    if (tower.cls.id === 'sorceress' && SPELL[tower.style]) return SPELL[tower.style].reach;
    if (tower.cls.id === 'thunder' && STORM[tower.style]) return STORM[tower.style].reach;
    if (tower.cls.id === 'frost' && WATER[tower.style]) return WATER[tower.style].reach;
    return b.range || 0;
  }

  _flags() {
    const rune = (cls, id) => this.towers.some((t) => t.cls.id === cls && t.runes.has(id));
    this.packLead = rune('thunder', 'pack');
  }

  _hold(mob, seconds, tower, full = false) {
    if (mob.dead || steady(mob, this.time) || !full && this.time < mob.holdFree) return;
    const time = (full ? seconds : seconds * (mob.info.boss ? BOSS_HOLD : elite(mob) ? ELITE_HOLD : 1))
      * (1 - this._resistOf(mob));
    mob.holdUntil = Math.max(mob.holdUntil, this.time + time);
    mob.holdFree = mob.holdUntil + HOLD_GAP;
    if (tower && tower.run) this._help(tower, HELP.control);
    mob.holdBy = tower ? (tower.style === 'kraken' ? 'kraken' : tower.cls.id) : '';
    this._event({ kind: 'hold', mob, by: mob.holdBy });
  }

  _slow(mob, amount, seconds, element = null) {
    if (immune(mob, element) || steady(mob, this.time)) return;
    amount *= this._weak(element) * (1 - this._resistOf(mob));
    if (mob.slowUntil <= this.time || amount > mob.slow) mob.slow = amount;
    mob.slowUntil = Math.max(mob.slowUntil, this.time + seconds);
  }

  _push(mob, distance, tower) {
    if (mob.info.boss || mob.dead || mob.biting || steady(mob, this.time)) return;
    const shift = Math.min(distance * (elite(mob) ? ELITE_PUSH : 1) * (1 - this._resistOf(mob)),
      PUSH_LIMIT - mob.pushed,
      mob.d - this.gates[mob.r]);
    if (shift <= 0) return;
    mob.pushed += shift;
    mob.d -= shift;
    this._locate(mob);
    mob.helpers.add(tower);
  }

  _vulnerable(mob, bonus, seconds) {
    if (mob.vulnUntil <= this.time || bonus >= mob.vuln) mob.vuln = bonus;
    mob.vulnUntil = Math.max(mob.vulnUntil, this.time + seconds);
  }

  _ignite(mob, tower, dps, seconds) {
    if (mob.dead || immune(mob, 'fire')) return;
    if (!mob.burn) mob.burn = new Map();
    mob.burn.set(tower, { tower, dps, until: this.time + seconds });
  }

  _effects(dt, now) {
    this.patches = this.patches.filter((patch) => patch.until > now);
    for (const patch of this.patches) {
      for (const mob of this.mobs) {
        if (!mob.dead && grounded(mob, now) && near(mob, patch.x, patch.y, patch.radius)) {
          this._hurt(mob, patch.dps * dt, patch.tower, 'fire', true);
          if (patch.mark && !immune(mob, 'fire')) this._mark(mob, 'fire', patch.tower, patch.mark);
        }
      }
    }
    if (this.phoenixes.length) this._phoenixes(now);
    if (this.globes.length) this._globes(now);
    this._dashes(now);
    if (this.zones.length) this._zones(dt, now);
    if (this.seaCells.length) this._seaArms();
    if (this.arrows.length) this._arrows(dt);
    this._drags(now);
    this._venom(dt, now);
    if (this.ward) this._judge(now);
    for (const mob of this.mobs) {
      if (mob.dead) continue;
      if (mob.rot && !mob.dead && mob.rot.until <= now) mob.rot = null;
      if (mob.rot && !mob.dead) {
        const share = mob.info.boss ? ROT.boss : ROT.share;
        const rot = Math.min(mob.max * share, mob.rot.by.skill * RUNE_CAPS.rot);
        this._hurt(mob, rot * dt, mob.rot.by, null, true, SHIELDS);
      }
    }
  }

  _burning(mob, now) {
    for (const [key, fire] of mob.burn) {
      if (fire.until <= now) {
        mob.burn.delete(key);
        continue;
      }
      this._hurt(mob, fire.dps, fire.tower, 'fire', true);
      if (mob.dead || !mob.burn) return;
    }
    if (!mob.burn.size) mob.burn = null;
  }

  _pulse(now) {
    this._weather();
    if (this.springs.length) this._springs();
    for (const mob of this.mobs) {
      if (mob.dead) continue;
      if (mob.burn) this._burning(mob, now);
      if (!mob.dead && (mob.marks || mob.states)) this._reactions(mob, now);
      if (!mob.dead && mob.states) this._afflict(mob, now);
    }
  }

  _weather() {
    const rainers = this.towers.filter((t) => t.runes.has('rain')), snowers = this.towers.filter((t) => t.runes.has('snow'));
    const s = WATER.snow, stacks = snowers.length ? Math.min(s.max, snowers.length + rainers.length) : 0;
    this.snow = stacks;
    this.rain = !stacks && rainers.length ? rainers : null;
    this.weather = stacks || Math.min(s.max, rainers.length);
    const cooled = this.cooled || Boolean(this.rules.lava && (stacks || this.rain));
    const frozen = stacks > 0 && !this.rules.ice && !this.rules.dry;
    if (this.tiles && (cooled !== this.cooled || frozen !== this.frozen)) {
      this.cooled = cooled;
      this.frozen = frozen;
      this._terrain();
      for (const t of this.towers.slice()) this._ground(t);
    }
    if (this.rain) {
      const r = WATER.rain, by = this.rain.find((t) => t.react === 'water') || this.rain[0];
      for (const mob of this.mobs) {
        if (mob.dead || !grounded(mob, this.time) || this.random() >= r.chance) continue;
        this._zone('puddle', by, mob.x, mob.y, r.radius, r.time, { slow: r.slow, mark: by.react === 'water' });
      }
    }
    if (!stacks) return;
    for (const mob of this.mobs) {
      if (mob.dead || immune(mob, 'ice')) continue;
      this._slow(mob, s.slow[stacks - 1], PULSE * 2, 'ice');
      if (stacks >= s.from && this.random() < s.freeze) this._hold(mob, s.hold, snowers[0]);
    }
  }

  roaring() {
    return this.roarUntil > this.time ? 1 + this.roarBoost : 1;
  }

  nearWater(t) {
    for (let y = t.y - 1; y <= t.y + 1; y++) for (let x = t.x - 1; x <= t.x + 1; x++) if (this.sea(x, y) >= 0) return true;
    return false;
  }

  _arrows(dt) {
    const s = WATER.hydro;
    this.arrows = this.arrows.filter((arrow) => {
      const t = arrow.tower;
      const lost = (mob) => !mob || mob.dead || hidden(mob, this.time) || this.covered(mob.x, mob.y);
      if (lost(arrow.mob)) arrow.mob = nextPrey(this, t, arrow);
      if (!arrow.mob) return false;
      const mob = arrow.mob, gap = Math.hypot(mob.x - arrow.x, mob.y - arrow.y), step = s.speed * dt;
      if (gap > step + s.touch) {
        const want = Math.atan2(mob.y - arrow.y, mob.x - arrow.x), turn = bend(want, arrow.heading);
        const most = dt * Math.max(s.turn, s.speed / Math.max(0.35, gap) * 1.2);
        arrow.heading += Math.sign(turn) * Math.min(Math.abs(turn), most);
        arrow.x += Math.cos(arrow.heading) * step;
        arrow.y += Math.sin(arrow.heading) * step;
        return true;
      }
      arrow.x = mob.x;
      arrow.y = mob.y;
      arrow.hit.add(mob);
      const crit = rollCrit(this, t);
      this._event({ kind: 'splash', tower: t, x: mob.x, y: mob.y, crit });
      this._hurt(mob, t.damage * (crit ? t.critMul : 1), t);
      if (t.bubble) t.bubble.charges = Math.min(WATER.bubble.max, t.bubble.charges + 1);
      if (t.runes.has('vortex') && this.time >= (t.nextVortex || 0) && this.random() < WATER.vortex.chance) {
        t.nextVortex = this.time + WATER.vortex.gap;
        this._vortex(t, mob.x, mob.y);
      }
      arrow.mob = nextPrey(this, t, arrow);
      return Boolean(arrow.mob);
    });
  }

  _vortex(t, x, y) {
    const s = WATER.vortex, now = this.time;
    this._event({ kind: 'vortex', tower: t, x, y, radius: s.radius, time: s.time });
    for (const mob of this._around(x, y, s.radius)) {
      if (hidden(mob, now) || this.covered(mob.x, mob.y)) continue;
      const to = Math.max(this.gates[mob.r], this._closestD(mob.r, x, y));
      mob.drag = { from: mob.d, to, sx: mob.x, sy: mob.y, x, y, start: now, end: now + s.time };
      mob.biting = 0;
    }
  }

  _closestD(r, x, y) {
    let best = 0, gap = Infinity;
    for (let d = 0; d <= this.routes[r].length - 1; d += 0.1) {
      const at = this._roadPoint(r, d), far = (at.x - x) ** 2 + (at.y - y) ** 2;
      if (far < gap) [best, gap] = [d, far];
    }
    return best;
  }

  _drags(now) {
    for (const mob of this.mobs) {
      if (!mob.drag || mob.dead) continue;
      const drag = mob.drag, k = Math.min(1, (now - drag.start) / (drag.end - drag.start)), ease = k * k * (3 - 2 * k);
      mob.d = drag.from + (drag.to - drag.from) * ease;
      mob.x = drag.sx + (drag.x - drag.sx) * ease;
      mob.y = drag.sy + (drag.y - drag.sy) * ease;
      if (k >= 1) {
        mob.drag = null;
        this._locate(mob);
      }
    }
  }

  _plantSpring(t) {
    const cells = [];
    for (let y = t.y - 1; y <= t.y + 1; y++) {
      for (let x = t.x - 1; x <= t.x + 1; x++) if ((x !== t.x || y !== t.y) && this.free(x, y)) cells.push({ x, y });
    }
    if (!cells.length) return;
    const cell = cells[Math.floor(this.random() * cells.length)];
    this.springs.push({ tower: t, x: cell.x, y: cell.y, cx: cell.x + 0.5, cy: cell.y + 0.5 });
    this._event({ kind: 'spring', tower: t, x: cell.x + 0.5, y: cell.y + 0.5 });
  }

  _springs() {
    const s = WATER.spring;
    for (const spring of this.springs) {
      for (const wall of this.walls) {
        if (!wall.ice && near(wall, spring.cx, spring.cy, s.radius)) wall.hp = Math.min(wall.max, wall.hp + wall.max * s.heal);
      }
      for (const mob of this._around(spring.cx, spring.cy, s.radius)) {
        if (mob.undead) this._hurt(mob, spring.tower.damage * s.undead, spring.tower, 'water', true);
      }
    }
  }

  _mark(mob, element, t, time = MARK_TIME) {
    if (mob.dead) return;
    if (!mob.marks) mob.marks = new Map();
    if (!mob.marks.has(element)) mob.marks.set(element, new Map());
    mob.marks.get(element).set(t, this.time + time);
  }

  state(mob, name) {
    const item = mob.states && mob.states.get(name);
    return item && item.until > this.time ? item : null;
  }

  _setState(mob, name, time, by, extra = {}) {
    if (!mob.states) mob.states = new Map();
    const old = this.state(mob, name);
    const item = Object.assign({ until: Math.max(old ? old.until : 0, this.time + time), by: new Set(by) }, extra);
    if (old) for (const t of old.by) item.by.add(t);
    mob.states.set(name, item);
    return item;
  }

  _reactions(mob, now) {
    if (mob.marks) {
      for (const [element, list] of mob.marks) {
        for (const [t, until] of list) if (until <= now || !this.towers.includes(t)) list.delete(t);
        if (!list.size) mob.marks.delete(element);
      }
      if (!mob.marks.size) mob.marks = null;
    }
    if (mob.states) {
      for (const [name, item] of mob.states) if (item.until <= now) mob.states.delete(name);
      if (!mob.states.size) mob.states = null;
    }
    const count = (element) => (mob.marks && mob.marks.has(element) ? mob.marks.get(element).size : 0);
    const has = (name) => Boolean(this.state(mob, name));
    if (has('corrosion') && has('disease')) this._react(mob, 'epidemic', [], ['corrosion', 'disease']);
    if (has('mud') && count('fire')) {
      this._react(mob, 'lava', ['fire'], ['mud']);
      if (count('water')) this._react(mob, 'steam', ['water'], []);
    }
    const options = [];
    for (const [a, b, name] of PAIRS) {
      if (count(a) && count(b)) options.push({ name, marks: [a, b], states: [], weight: count(a) + count(b) });
    }
    const strong = (name, marks, states) => options.push({ name, marks, states, weight: STRONG * (1
      + marks.reduce((sum, element) => sum + count(element), 0)) });
    if (has('steam') && count('poison')) strong('gas', ['poison'], ['steam']);
    if (has('corrosion') && count('poison')) strong('corrosion', ['poison'], []);
    for (const element of ['water', 'earth']) if (has('mud') && count(element)) strong('mud', [element], []);
    while (options.length) {
      let roll = this.random() * options.reduce((sum, option) => sum + option.weight, 0), pick = options[0];
      for (const option of options) {
        roll -= option.weight;
        if (roll < 0) {
          pick = option;
          break;
        }
      }
      this._react(mob, pick.name, pick.marks, pick.states);
      if (mob.dead) return;
      const used = new Set(pick.marks.concat(pick.states));
      for (let i = options.length - 1; i >= 0; i--) {
        if (options[i].marks.concat(options[i].states).some((key) => used.has(key))) options.splice(i, 1);
      }
    }
  }

  _react(mob, name, marks, states) {
    const party = new Set();
    for (const element of marks) {
      if (mob.marks && mob.marks.has(element)) for (const t of mob.marks.get(element).keys()) party.add(t);
    }
    for (const key of states) {
      const item = this.state(mob, key);
      if (item) for (const t of item.by) if (this.towers.includes(t)) party.add(t);
    }
    if (!party.size) return;
    let caster = null, latest = -Infinity;
    if (marks.includes('lightning') && mob.marks && mob.marks.has('lightning')) {
      for (const [t, until] of mob.marks.get('lightning')) if (until > latest) [caster, latest] = [t, until];
    }
    for (const t of party) this._help(t, HELP.react);
    const towers = Array.from(party), lead = towers[0], blue = towers.some((t) => t.runes.has('blue'));
    const fiery = marks.includes('fire') || name === 'blast' || name === 'lava';
    const power = towers.reduce((sum, t) => sum + t.skill, 0) * (blue && fiery ? BLUE_REACT : 1);
    for (const element of marks) if (mob.marks) mob.marks.delete(element);
    if (mob.marks && !mob.marks.size) mob.marks = null;
    for (const key of states) if (mob.states) mob.states.delete(key);
    const r = REACTIONS[name], x = mob.x, y = mob.y;
    this._event({ kind: 'react', mob, name: r.name, color: blue && fiery ? '#7cc4ff' : r.color });
    if (caster) this._arc(mob, caster);
    const hit = (target, amount, element) => {
      target.party = towers;
      this._hurt(target, amount, lead, element, true, ARMOR);
      target.party = null;
    };
    if (name === 'steam') {
      hit(mob, power * r.fire, 'fire');
      this._setState(mob, 'steam', r.time, towers);
    } else if (name === 'blast') {
      const cloud = this.zones.find((zone) => zone.kind === 'gas' && near(mob, zone.x, zone.y, zone.radius));
      if (cloud) {
        this.zones.splice(this.zones.indexOf(cloud), 1);
        const nuke = REACTIONS.nuke;
        this._event({ kind: 'react', mob, name: nuke.name, color: nuke.color });
        this._event({ kind: 'nuke', tower: lead, x: cloud.x, y: cloud.y, radius: nuke.radius });
        for (const target of this._around(cloud.x, cloud.y, nuke.radius)) {
          hit(target, power * nuke.mul / 2, 'fire');
          if (!target.dead) hit(target, power * nuke.mul / 2, 'poison');
        }
        return;
      }
      this._event({ kind: 'boom', tower: lead, x, y, radius: r.radius });
      for (const target of this._around(x, y, r.radius)) hit(target, power * r.fire, 'fire');
    } else if (name === 'corrosion') {
      if (!this.state(mob, 'epidemic')) this._setState(mob, 'corrosion', r.time, towers, { dot: power * r.dot });
    } else if (name === 'mud') {
      if (!(mob.lavaUntil > this.time)) this._setState(mob, 'mud', r.time, towers);
    } else if (name === 'discharge') {
      this._hold(mob, r.stun, lead);
    } else if (name === 'disease') {
      if (!this.state(mob, 'epidemic')) this._setState(mob, 'disease', r.time, towers, { dot: power * r.dot });
    } else if (name === 'gas') {
      this._zone('gas', lead, x, y, r.radius, r.time, { dot: power * r.dot, party: towers });
    } else if (name === 'epidemic') {
      this._setState(mob, 'epidemic', r.time, towers, { dot: power * r.dot });
    } else if (name === 'lava') {
      this._zone('lava', lead, x, y, r.radius, r.time, { dot: power * r.dot, party: towers });
    }
  }

  _afflict(mob, now) {
    let slow = 0;
    if (this.state(mob, 'mud')) slow += REACTIONS.mud.slow;
    if (slow) this._slow(mob, Math.min(CHILL_MAX, slow), PULSE * 2);
    for (const name of ['corrosion', 'disease', 'epidemic']) {
      const item = this.state(mob, name);
      if (!item || !item.dot) continue;
      const towers = Array.from(item.by).filter((t) => this.towers.includes(t));
      if (!towers.length) continue;
      mob.party = towers;
      this._hurt(mob, item.dot, towers[0], name === 'disease' ? null : 'poison', true, SHIELDS);
      mob.party = null;
      if (mob.dead) return;
    }
  }

  _zones(dt, now) {
    this.zones = this.zones.filter((zone) => zone.until > now && this.towers.includes(zone.tower));
    for (const zone of this.zones) {
      const pulse = now >= zone.pulse;
      if (pulse) {
        zone.pulse = now + ZONE_PULSE;
        if (zone.kind !== 'puddle') this._event({ kind: 'zone', zone });
      }
      for (const mob of this._around(zone.x, zone.y, zone.radius)) {
        if (zone.kind === 'puddle') {
          if (!grounded(mob, now)) continue;
          this._slow(mob, zone.slow, ZONE_PULSE);
          if (zone.mark && pulse) this._mark(mob, 'water', zone.tower);
        } else if (zone.kind === 'sand') {
          if (grounded(mob, now)) this._slow(mob, zone.slow, ZONE_PULSE);
        } else if (zone.kind === 'gas' || zone.kind === 'lava') {
          if (!pulse) continue;
          mob.party = zone.party;
          this._hurt(mob, zone.dot, zone.tower, zone.kind === 'gas' ? 'poison' : 'fire', true);
          mob.party = null;
          if (zone.kind === 'lava' && !mob.dead) {
            mob.lavaUntil = now + ZONE_PULSE * 2;
            this._slow(mob, REACTIONS.lava.slow, ZONE_PULSE * 2);
          }
        }
      }
    }
  }

  _zone(kind, t, x, y, radius, time, extra) {
    this.zones.push(Object.assign({ kind, tower: t, x, y, radius, until: this.time + time, pulse: this.time }, extra));
  }

  _execute(mob, t, cap) {
    if (mob.hp <= cap) this._slay(mob, t);
    else this._hurt(mob, cap, t, null, true, ARMOR);
  }

  _walk(dt, now) {
    const stop = this.length - HEART_GAP;
    for (const mob of this.mobs) {
      if (mob.dead) continue;
      if (mob.aweUntil > now) continue;
      if (mob.biting && this.sirenUntil > now && !mob.info.boss) mob.biting = 0;
      if (mob.biting) {
        if (now - mob.biting < BITE_TIME) continue;
        if (mob.fatal && !this.ward && this._lastStand(mob)) continue;
        mob.dead = true;
        if (this.ward && !mob.fatal) {
          if (this.towers.includes(this.ward.tower)) this._help(this.ward.tower, HELP.heart);
          this._event({ kind: 'warded', mob });
          continue;
        }
        const aegis = mob.fatal ? 0 : this._aegis();
        if (aegis > 0 && this.random() < aegis) {
          const guard = this.towers.find((t) => t.cls.id === 'priest' && t.runes.has('aegis'));
          if (guard) this._help(guard, HELP.heart);
          this._event({ kind: 'aegis', mob });
          continue;
        }
        if (mob.fatal) this.ward = null;
        if (!mob.fatal && this.steel > 0) {
          this.steel -= 1;
          const keeper = this.shields.shift();
          if (keeper && this.towers.includes(keeper)) this._help(keeper, HELP.heart);
          this._event({ kind: 'steel', mob, left: this.steel });
          continue;
        }
        const lost = mob.fatal ? Math.max(0, this.lives) : mob.leak;
        this.lives -= lost;
        this.leaked += lost;
        this._event({ kind: 'leak', mob });
        if (this.lives <= 0 && !mob.fatal) this._lastStand(null);
        continue;
      }
      mob.wall = null;
      if (mob.drag || mob.holdUntil > now && !steady(mob, now)) continue;
      if (mob.rootUntil > now && !steady(mob, now)) continue;
      if (mob.stuck && mob.stuck.until > now && (!steady(mob, now) || mob.stuck.kind === 'net')) continue;
      let slow = steady(mob, now) || !(mob.slowUntil > now) ? 0 : mob.slow;
      if (this.banners.length && !steady(mob, now)) slow = 1 - (1 - slow) * (1 - this._totems(mob, 'slow'));
      if (mob.info.boss) slow *= BOSS_SLOW;
      let speed = mob.speed * (1 + mob.fury) * (1 + (mob.rage || 0))
        * (mob.rushUntil > now ? 1 + mob.rush : 1);
      const power = mob.muteUntil > now ? null : mob.power;
      if (power && power.boost && power.time && mob.powerUntil > now) speed *= 1 + power.boost;
      if (power && power.id === 'rage') speed *= 1 + power.boost * (1 - mob.hp / mob.max);
      const back = this.sirenUntil > now && !mob.info.boss;
      let next = mob.d + speed * (1 - slow) * dt * (back ? -SONG.back : 1);
      if (back && !this._retreats(mob, next)) next = mob.d;
      if (grounded(mob, now) && this.walls.length) {
        let wall = null, at = Infinity;
        for (const w of this.walls) {
          const spot = w.r === mob.r ? w.d : mob.r && w.i === this.merge ? this.joinAt : -1;
          if (spot > mob.d && spot < at) {
            wall = w;
            at = spot;
          }
        }
        if (wall && next >= at - WALL_GAP) {
          next = Math.max(mob.d, at - WALL_GAP);
          mob.wall = wall;
          this._batter(wall, mob, dt, now);
        }
      }
      mob.d = Math.min(next, stop);
      if (mob.sx || mob.sy) {
        const fade = Math.exp(-dt * JOIN_FADE);
        mob.sx = Math.abs(mob.sx) < 0.01 ? 0 : mob.sx * fade;
        mob.sy = Math.abs(mob.sy) < 0.01 ? 0 : mob.sy * fade;
      }
      this._locate(mob);
      if (mob.thief) this._steal(mob);
      if (mob.d >= stop && (mob.treasure || mob.fake)) {
        mob.dead = true;
        this._event({ kind: 'burrow', mob });
      } else if (mob.d >= stop) {
        mob.biting = now;
        this._event({ kind: 'bite', mob });
      }
    }
  }

  _pets(t) {
    if (t.cls.id === 'forester' && t.style === 'druid') {
      return [['bird', 'bird', WOOD.flock.birds[t.stacks.get('flock') || 0], null],
        ['hawk', 'hawk', t.stacks.get('hawk') || 0, null]];
    }
    if (t.cls.id !== 'mechanic' || t.style !== 'turret') return [];
    return DRONE_KINDS.map(([rune, kind]) => [rune, kind, t.stacks.get(rune) || 0, null]);
  }

  _crew(t) {
    const own = this._pets(t);
    if (t.cls.id !== 'forester' || !t.runes.has('call')) return own;
    const others = this.towers.filter((o) => o !== t && o.cls.id === 'forester');
    return own.concat(others.flatMap((o) => this._pets(o).map(([rune, kind, want]) => [rune, kind, want, o])));
  }

  _drones(dt, now) {
    for (const t of this.towers) {
      for (const [rune, kind, want, source] of this._crew(t)) {
        const own = this.drones.filter((drone) => drone.tower === t && drone.rune === rune
          && drone.source === source).length;
        for (let n = own; n < want; n++) {
          this.drones.push({ tower: t, source, kind, rune, n, x: t.cx, y: t.cy, target: null, next: now });
        }
      }
    }
    const wanted = (drone) => (this._crew(drone.tower).find(([rune, , , source]) => rune === drone.rune
      && source === drone.source) || [0, 0, 0])[2];
    this.drones = this.drones.filter((drone) => this.towers.includes(drone.tower) && drone.n < wanted(drone));
    for (const t of this.towers) {
      const flock = this.drones.filter((drone) => drone.tower === t && WOOD[drone.kind]);
      flock.forEach((drone, i) => {
        drone.slot = i / flock.length;
      });
    }
    this._assign();
    for (const drone of this.drones) this._pilot(drone, dt, now);
  }

  _assign() {
    for (const kind of new Set(this.drones.map((drone) => drone.kind))) {
      const crew = this.drones.filter((drone) => drone.kind === kind);
      const sky = (mob) => (kind === 'hawk' && mob.flying ? 1 : 0);
      const pool = this.mobs.filter((mob) => this._droneCan(crew[0], mob))
        .sort((a, b) => sky(b) - sky(a) || this.ahead(b) - this.ahead(a));
      const front = new Set(pool.slice(0, crew.length)), kept = new Set(), idle = [];
      for (const drone of crew) {
        if (drone.target && front.has(drone.target) && !kept.has(drone.target)) kept.add(drone.target);
        else idle.push(drone);
      }
      const open = pool.filter((mob) => front.has(mob) && !kept.has(mob));
      let extra = 0;
      for (const drone of idle) drone.target = open.shift() || (pool.length ? pool[extra++ % pool.length] : null);
    }
  }

  _droneCan(drone, mob) {
    return !mob.dead && !hidden(mob, this.time) && !this.covered(mob.x, mob.y)
      && (drone.kind !== 'laser' || big(mob)) && (drone.kind !== 'air' || Boolean(mob.flying));
  }

  _pilot(drone, dt, now) {
    const s = MECH.drone, t = drone.tower;
    const shot = DRONE_SHOTS[drone.kind], goal = drone.target || { x: t.cx, y: t.cy };
    const pet = WOOD[drone.kind], hover = pet ? pet.orbit : s.hover, lead = this.packLead ? 1 + WOLF.pack.boost : 1;
    const a = now * s.spin + (pet ? drone.slot * Math.PI * 2
      : drone.n * 2.1 + DRONE_KINDS.findIndex(([rune]) => rune === drone.rune) * 0.7);
    const dx = goal.x + Math.cos(a) * hover - drone.x, dy = goal.y + Math.sin(a) * hover - drone.y;
    const gap = Math.hypot(dx, dy), step = (shot.speed || s.speed) * lead * dt;
    drone.x += gap <= step ? dx : dx / gap * step;
    drone.y += gap <= step ? dy : dy / gap * step;
    const target = drone.target;
    if (!target || now < drone.next || !near(target, drone.x, drone.y, s.reach)) return;
    drone.next = now + shot.every / lead;
    t.striking = false;
    const from = () => ({ x: drone.x, y: drone.y, high: true });
    if (drone.kind === 'attack') {
      const one = () => {
        const mob = target.dead ? drone.target : target;
        if (mob && !mob.dead && this.drones.includes(drone)) shoot(this, t, mob, { mul: shot.mul * lead, from: from() });
      };
      one();
      for (let k = 1; k < shot.count; k++) this._later(k * shot.gap, one);
    } else if (drone.kind === 'bird' || drone.kind === 'hawk') {
      const owner = drone.source || t, peck = owner.damage * shot.mul * lead * this.roaring(), hawk = drone.kind === 'hawk';
      const toxic = !hawk && owner.runes.has('flock');
      this._event({ kind: 'peck', tower: t, mob: target, x: target.x, y: target.y, hawk, toxic });
      if (hawk) {
        this._hurt(target, peck * (1 - WOOD.hawk.poison), t);
        this._hurt(target, peck * WOOD.hawk.poison, t, 'poison');
      } else {
        this._hurt(target, peck, t);
        if (toxic) this._hurt(target, peck * WOOD.flock.poison, t, 'poison');
      }
      this._torchHit(t, target, peck);
      this._snare(owner, target, t);
    } else if (drone.kind === 'laser') {
      this._event({ kind: 'ray', tower: t, sx: drone.x, sy: drone.y, x: target.x, y: target.y, mob: target });
      this._hurt(target, t.damage * shot.mul * lead, t, null, false, ARMOR);
      this._torchHit(t, target, t.damage * shot.mul * lead);
    } else {
      this._event({ kind: 'net', tower: t, mob: target, sx: drone.x, sy: drone.y });
      this._hurt(target, t.damage * shot.mul * lead, t);
      this._torchHit(t, target, t.damage * shot.mul * lead);
      if (!target.dead) {
        this._slow(target, shot.slow, shot.time);
        target.netUntil = Math.max(target.netUntil, now + shot.time);
      }
    }
  }

  _snare(owner, mob, t) {
    const now = this.time, s = WOOD.snare;
    if (!owner.runes.has('snare') || mob.dead || mob.info.boss || mob.flying || steady(mob, now)
      || now < mob.rootFree) return;
    if (this.random() >= s.chance) return;
    mob.rootAt = now;
    mob.rootUntil = now + s.time * (1 - this._resistOf(mob));
    mob.rootFree = mob.rootUntil + s.gap;
    mob.helpers.add(t);
    this._event({ kind: 'snare', tower: t, mob });
  }

  _steelOf(t) {
    if (t.cls.id !== 'mechanic' || !t.runes.has('bulwark') || this.steeled.get(t.player) === this.wave) return;
    this.steeled.set(t.player, this.wave);
    this.steel += 1;
    this.shields.push(t);
  }

  _batter(wall, mob, dt, now) {
    if (wall.ice) {
      if (now < (mob.iceBite || 0)) return;
      mob.iceBite = now + WATER.iceWall.bite;
      wall.hp -= 1 + (mob.rage || 0);
      wall.hitAt = now;
      if (wall.hp <= 0) this._melt(wall, now);
      return;
    }
    const bite = this._wallUnit() * mob.info.leak * WALL_BITE * dt * (1 + (mob.rage || 0));
    const t = wall.tower, group = this._barricade(wall), total = group.reduce((sum, w) => sum + Math.max(0, w.hp), 0);
    for (const w of group) {
      w.hp -= total > 0 ? bite * Math.max(0, w.hp) / total : bite;
      w.hitAt = now;
    }
    mob.helpers.add(t);
    if (t.runes.has('sharp') && now >= mob.sharpAt) {
      mob.sharpAt = now + EARTH.sharp.every;
      this._event({ kind: 'thorns', tower: t, mob });
      this._hurt(mob, t.damage * EARTH.sharp.mul, t, 'earth');
    }
    if (total - bite > 0) return;
    for (const w of group) this._crumble(w, now);
  }

  _crumble(wall, now) {
    const t = wall.tower;
    this.walls = this.walls.filter((known) => known !== wall);
    t.nextWall = now + EARTH.wall.rebuild;
    this._event({ kind: 'crumble', tower: t, x: wall.x, y: wall.y });
    if (!t.runes.has('collapse')) return;
    const s = EARTH.collapse;
    this._event({ kind: 'boom', tower: t, x: wall.x, y: wall.y, radius: s.radius, tone: 'earth' });
    for (const mob of this._around(wall.x, wall.y, s.radius)) this._hold(mob, s.stun, t, true);
  }

  _barricade(wall) {
    const stone = this.walls.filter((w) => !w.ice), group = [wall];
    for (let k = 0; k < group.length; k++) {
      const from = group[k];
      for (const w of stone) {
        if (group.includes(w) || w.tower === from.tower) continue;
        if (Math.hypot(w.x - from.x, w.y - from.y) <= EARTH.barricade.reach + 1e-9) group.push(w);
      }
    }
    return group.some((w) => w.tower.runes.has('barricade')) ? group : [wall];
  }

  _melt(wall, now) {
    this.walls = this.walls.filter((known) => known !== wall);
    wall.tower.nextIceWall = now + WATER.iceWall.rest;
    this._event({ kind: 'crumble', tower: wall.tower, x: wall.x, y: wall.y, ice: true });
  }

  _iceWall(t, now) {
    const lead = this.mobs.filter((mob) => grounded(mob, now) && !mob.r && this._targetable(t, mob))
      .sort((x, y) => y.d - x.d)[0];
    if (!lead) return;
    const d = Math.ceil(lead.d + 0.6), i = d - 1;
    if (i < 0 || i >= this.path.length || d > this.length - HEART_GAP - 1 || this.walls.some((w) => w.i === i)) return;
    const { x, y } = this._roadPoint(0, d);
    this.walls.push({ tower: t, i, r: 0, d, x, y, hp: WATER.iceWall.hits, max: WATER.iceWall.hits,
      hitAt: -1e9, ice: true, until: now + WATER.iceWall.time });
    this._event({ kind: 'wall', tower: t, x, y, ice: true });
  }

  _intervalOf(t, now) {
    return t.interval * (t.webUntil > now ? t.web : 1) / ((1 + t.boost.rate) * (t.frenzyUntil > now ? STORM.frenzy.haste : 1) * (t.style === 'raiju' ? this._wolfRate(t) : 1)
      * (1 + godHaste(t)));
  }

  _wolfRate(t) {
    return (1 + (t.runes.has('rage') ? rageOf(t.rageHits || 0) : 0)) * (1 + this._packOf(t));
  }

  _packOf(t) {
    return t.runes.has('pack') ? WOLF.pack.per * this.drones.length : 0;
  }

  _buffs(now) {
    const pyros = [], mechanics = [], teams = [], tuners = [], graces = [], monks = [], bards = [];
    const priests = this.towers.filter((t) => t.cls.id === 'priest');
    const graced = (id) => priests.filter((t) => t.runes.has(id)).length;
    const bless = 1 + HOLY.blessing * graced('blessing'), sanctity = graced('sanctity') > 0;
    const insight = fade(priests.filter((t) => t.runes.has('insight')).map(() => HOLY.insight));
    const springs = this.springs;
    this.blessed = bless;
    this.catalyst = this._sorcery('catalyst', SPELL.catalyst);
    const circles = this.towers.filter((t) => t.cls.id === 'sorceress' && t.runes.has('circle'));
    this.deafen = fade(this.towers.filter((t) => t.style === 'minstrel' && t.runes.has('ultrasound'))
      .map(() => SONG.ultrasound));
    for (const t of this.towers) {
      if (t.cls.id === 'mechanic') {
        mechanics.push(t);
        if (t.runes.has('team')) teams.push(t);
        if (t.runes.has('tuning')) tuners.push(t);
      }
      if (t.cls.id === 'forester' && t.runes.has('grace')) graces.push(t);
      if (t.style === 'monk' && MANTRAS.some((id) => t.runes.has(id))) monks.push(t);
      if (t.style === 'minstrel' && t.runes.has('anthem')) bards.push(t);
      if (t.cls.id === 'pyro' && t.runes.has('torch')) pyros.push(t);
    }
    const close = (a, b, radius) => (a.cx - b.cx) * (a.cx - b.cx) + (a.cy - b.cy) * (a.cy - b.cy) <= radius * radius;
    const heard = new Map();
    for (const bard of bards) {
      const pool = this.towers.filter((ally) => ally !== bard && ally.style !== 'minstrel'
        && Math.max(Math.abs(ally.x - bard.x), Math.abs(ally.y - bard.y)) <= 1);
      bard.muse = pool.length ? pool.reduce((a, b) => (b.might > a.might ? b : a)) : null;
      if (bard.muse) heard.set(bard.muse, (heard.get(bard.muse) || []).concat(bard));
    }
    for (const t of this.towers) {
      const boost = t.boost, by = t.boostBy;
      const team = [], grace = [], tuning = [], mantras = { mantraSpeed: [], mantraPower: [], mantraRange: [] };
      const might = [];
      by.clear();
      for (const g of graces) {
        if (!close(g, t, WOOD.grace.radius)) continue;
        grace.push(WOOD.grace.haste);
        by.add(g);
      }
      for (const monk of monks) {
        if (!close(monk, t, HOLY.mantra.radius)) continue;
        for (const id of MANTRAS) if (monk.runes.has(id)) mantras[id].push(1);
        if (MANTRAS.every((id) => monk.runes.has(id))) might.push(HOLY.mantra.might);
        by.add(monk);
      }
      if (t.cls.id === 'mechanic') {
        for (const head of teams) {
          if (!close(head, t, MECH.team.radius)) continue;
          team.push(MECH.team.per * mechanics.filter((m) => close(head, m, MECH.team.radius)).length);
          by.add(head);
        }
      }
      if (t.cls.id === 'sniper') {
        for (const m of tuners) {
          if (!close(m, t, MECH.tuning.radius)) continue;
          tuning.push(MECH.tuning.haste);
          by.add(m);
        }
      }
      const chant = (id, value) => fade(mantras[id].map(() => value));
      const howls = [], son = STORM.son, kin = (o) => o !== t && son.kin.includes(o.cls.id);
      const sons = this.towers.filter((o) => o !== t && o.style === 'thor' && o.runes.has('stormSon') && son.kin.includes(t.cls.id));
      const kinship = t.style === 'thor' && t.runes.has('stormSon') ? this.towers.filter(kin).length : 0;
      for (const o of sons) by.add(o);
      for (const wolf of this.towers) {
        if (wolf === t ? wolf.howlUntil > now : wolf.packUntil > now) {
          howls.push(wolf === t ? WOLF.howl.self : WOLF.howl.team);
          if (wolf !== t) by.add(wolf);
        }
      }
      const home = t.runes.has('home') && this.nearWater(t) ? WATER.home : 0;
      const tide = t.runes.has('tide') ? WATER.tide * this.weather : 0;
      boost.rate = bless * (fade(team) + fade(grace) + fade(tuning) + chant('mantraSpeed', HOLY.mantra.haste)
        + fade(howls) + son.haste * (kinship + sons.length)) + home;
      boost.damage = bless * (chant('mantraPower', HOLY.mantra.damage) + fade(howls) + son.damage * kinship
        + this._totems({ x: t.cx, y: t.cy }, 'power')) + home + tide;
      boost.range = bless * chant('mantraRange', HOLY.mantra.range);
      boost.might = bless * fade(might);
      for (const bard of heard.get(t) || []) {
        boost.might += SONG.anthem * bard.might / Math.max(1, t.might);
        by.add(bard);
      }
      if (sanctity) t.wardUntil = Math.max(t.wardUntil, now + WARD_AURA);
      boost.clarity = insight + fade(springs.filter((spring) => close(spring, t, WATER.spring.radius))
        .map(() => WATER.spring.clarity));
      t.torches = TORCH_USERS.has(t.cls.id) ? pyros.filter((pyro) => close(pyro, t, FIRE.torch.radius + pyro.reach))
        .sort((x, y) => torchPower(y) - torchPower(x)) : [];
      t.torch = t.torches[0] || null;
      const rings = circles.filter((c) => Math.max(Math.abs(c.x - t.x), Math.abs(c.y - t.y)) <= 1);
      for (const c of rings) by.add(c);
      by.delete(t);
      const reach = fixedRange(t) ? t.ownRange : t.ownRange * (1 + boost.range) + rings.length * SPELL.circle;
      if (reach !== t.range) t.range = reach;
    }
  }

  _blazeOf(t, size = 3) {
    const key = t.x + ':' + t.y + ':' + size;
    if (t.blaze && t.blaze.key === key) return t.blaze;
    const trunk = (i) => i < this.path.length && i >= Math.max(0, this.merge);
    let best = 0, low = Infinity;
    this.road.forEach(([x, y], i) => {
      const far = (x - t.x) ** 2 + (y - t.y) ** 2;
      const rank = Math.max(Math.abs(x - t.x), Math.abs(y - t.y)) <= 1 ? far + (trunk(i) ? 0 : 10) : 100 + far;
      if (rank < low) {
        low = rank;
        best = i;
      }
    });
    const main = best < this.path.length, line = main ? this.path : this.branch.concat([this.path[this.merge]]);
    const k = main ? best : best - this.path.length;
    const from = Math.max(0, Math.min(k - Math.floor(size / 2), line.length - size));
    const cells = line.slice(from, from + size).map(([x, y]) => ({ x: x + 0.5, y: y + 0.5 }));
    t.blaze = { key, line, from, size, cells, k };
    return t.blaze;
  }

  _sendPhoenix(t) {
    const exits = [this.path.slice().reverse()];
    if (this.branch.length) exits.push(this.path.slice(this.merge).reverse().concat(this.branch.slice().reverse()));
    const cells = exits[Math.floor(this.random() * exits.length)].map(([x, y]) => ({ x: x + 0.5, y: y + 0.5 }));
    const bird = { tower: t, cells, born: this.time, s: 0, hit: new Set(), blue: t.runes.has('blue') };
    Object.assign(bird, flightAt(bird, 0));
    this.phoenixes.push(bird);
    this._event({ kind: 'phoenix', tower: t, x: bird.x, y: bird.y });
  }

  _phoenixes(now) {
    const s = FIRE.phoenix;
    this.phoenixes = this.phoenixes.filter((bird) => {
      const end = Math.min((now - bird.born) * s.speed, bird.cells.length - 1);
      for (let at = bird.s; at < end + s.step; at += s.step) {
        Object.assign(bird, flightAt(bird, Math.min(at, end)));
        for (const mob of this._around(bird.x, bird.y, s.reach)) {
          if (bird.hit.has(mob) || this.covered(mob.x, mob.y)) continue;
          bird.hit.add(mob);
          scorch(this, bird.tower, mob, bird.tower.damage * s.mul);
        }
      }
      bird.s = end;
      return end < bird.cells.length - 1;
    });
  }

  _openCauldron(t) {
    const spots = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if ((dx || dy) && this.free(t.x + dx, t.y + dy)) spots.push([t.x + dx, t.y + dy]);
      }
    }
    if (!spots.length) return;
    const [x, y] = spots[Math.floor(this.random() * spots.length)];
    this.cauldrons.push({ tower: t, x, y, cx: x + 0.5, cy: y + 0.5, next: this.time + WOOD.cauldron.every,
      born: this.time });
    this._event({ kind: 'cauldron', tower: t, x: x + 0.5, y: y + 0.5 });
  }

  _setTraps(t) {
    const count = t.style === 'hunter' && t.runes.has('beartrap') ? 3 : 0, key = t.x + ':' + t.y + ':' + count;
    if (t.trapKey === key) return;
    t.trapKey = key;
    this.traps = this.traps.filter((trap) => trap.tower !== t);
    const cells = this.road.filter(([x, y]) => near({ x: x + 0.5, y: y + 0.5 }, t.cx, t.cy, t.range));
    for (let k = 0; k < count && cells.length; k++) {
      const [x, y] = cells.splice(Math.floor(this.random() * cells.length), 1)[0], spot = this._roadSpot(x + 0.5, y + 0.5);
      this.traps.push({ tower: t, x: spot.x, y: spot.y, angle: spot.angle, openAt: 0 });
    }
  }

  _roadSpot(x, y) {
    if (!this.curves) {
      const lines = [this.path].concat(this.branch.length ? [this.branch.concat([this.path[this.merge]])] : []);
      this.curves = lines.map(roadCurve);
    }
    let best = null, low = Infinity;
    for (const curve of this.curves) {
      curve.forEach(([px, py], j) => {
        const d = (px - x) ** 2 + (py - y) ** 2;
        if (d < low) {
          low = d;
          best = [curve, j];
        }
      });
    }
    const [curve, j] = best, a = curve[Math.max(0, j - 1)], b = curve[Math.min(curve.length - 1, j + 1)];
    return { x: curve[j][0], y: curve[j][1], angle: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  }

  _stick(mob, t, kind, time, dps, boss = false) {
    const now = this.time;
    const nettable = kind === 'net' && Boolean(mob.kind && mob.kind.nettable);
    if (mob.dead || steady(mob, now) && !nettable || mob.info.boss && !boss && !nettable) return false;
    mob.stuck = { until: now + time, by: t, dps, kind };
    if (kind === 'net') mob.netUntil = Math.max(mob.netUntil, mob.stuck.until);
    mob.helpers.add(t);
    return true;
  }

  _cloud(t, x, y, mul) {
    const s = WOOD.venomBurst;
    this.clouds.push({ tower: t, x, y, radius: s.radius, until: this.time + s.time, born: this.time,
      dps: t.damage * s.dps * mul, plague: t.runes.has('plague') });
  }

  _drain(t) {
    const taken = this.clouds.concat(this.puddles);
    if (!taken.length) return 0;
    this.clouds = [];
    this.puddles = [];
    this._event({ kind: 'absorb', tower: t, points: taken.map((pool) => [pool.x, pool.y, pool.plague]),
      time: WOOD.absorb.time });
    return taken.length;
  }

  _venom(dt, now) {
    this.clouds = this.clouds.filter((cloud) => cloud.until > now);
    this.puddles = this.puddles.filter((puddle) => puddle.until > now);
    const s = WOOD.beartrap;
    for (const trap of this.traps) {
      if (now < trap.openAt) continue;
      const prey = this.mobs.find((mob) => !mob.dead && grounded(mob, now) && !(mob.stuck && mob.stuck.until > now)
        && near(mob, trap.x, trap.y, s.reach));
      if (!prey || !this._stick(prey, trap.tower, 'trap', s.time, trap.tower.damage * s.dps, true)) continue;
      trap.openAt = now + s.reopen;
      this._event({ kind: 'trap', tower: trap.tower, x: trap.x, y: trap.y, mob: prey });
    }
    for (const mob of this.mobs) {
      if (mob.dead) continue;
      if (mob.stuck && mob.stuck.until > now) this._dose(mob, mob.stuck.by, mob.stuck.dps * dt);
      if (mob.dead || hidden(mob, now)) continue;
      for (const cloud of this.clouds) {
        if (!mob.dead && near(mob, cloud.x, cloud.y, cloud.radius)) this._dose(mob, cloud.tower, cloud.dps * dt);
      }
      if (mob.dead || !grounded(mob, now)) continue;
      let pool = null;
      for (const puddle of this.puddles) {
        if (near(mob, puddle.x, puddle.y, puddle.radius) && (!pool || puddle.dps > pool.dps)) pool = puddle;
      }
      if (pool) this._dose(mob, pool.tower, pool.dps * dt);
    }
  }

  _dose(mob, t, amount) {
    this._hurt(mob, amount, t, 'poison', true);
    if (t.react && !mob.dead && !immune(mob, 'poison') && (!mob.undead || t.runes.has('plague'))) {
      this._mark(mob, 'poison', t);
    }
  }

  _openVent(t) {
    const spots = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if ((dx || dy) && this.free(t.x + dx, t.y + dy)) spots.push([t.x + dx, t.y + dy]);
      }
    }
    if (!spots.length) return;
    const [x, y] = spots[Math.floor(this.random() * spots.length)];
    this.vents.push({ tower: t, x, y, cx: x + 0.5, cy: y + 0.5, next: this.time + FIRE.vent.every, born: this.time });
    this._event({ kind: 'vent', tower: t, x: x + 0.5, y: y + 0.5 });
  }

  _fly(t, now) {
    const lead = this._leader((mob) => !immune(mob, t.element));
    if (!lead) return;
    const cx = Math.floor(lead.x), cy = Math.floor(lead.y);
    let best = null;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = cx + dx, y = cy + dy;
        if (!this.free(x, y, true)) continue;
        const gap = (x + 0.5 - lead.x) ** 2 + (y + 0.5 - lead.y) ** 2;
        if (!best || gap < best.gap) best = { x, y, gap };
      }
    }
    if (!best) return;
    const from = { x: t.cx, y: t.cy };
    this._relocate(t, best.x, best.y);
    const time = Math.max(PULL_TIME, Math.hypot(t.cx - from.x, t.cy - from.y) / FIRE.soar);
    t.pull = { fx: from.x, fy: from.y, start: now, end: now + time, fly: true };
    t.busy = Math.max(t.busy, now + time);
    t.lastFire = now;
    this._event({ kind: 'flight', tower: t, x1: from.x, y1: from.y, x: t.cx, y: t.cy });
  }

  _backup(t, target) {
    if (t.cls.id !== 'sniper' || target.dead) return;
    for (const u of this.towers) {
      if (u === t || u.cls.id !== 'sniper' || u.style !== 'assault' || !u.runes.has('support')
        || u.busy > this.time || u.reloadUntil > this.time || !canShoot(this, u, target)) continue;
      shoot(this, u, target, { relay: true });
      if (target.dead) return;
    }
  }

  _torchHit(t, mob, damage) {
    t.torches.filter((pyro) => this.towers.includes(pyro)).forEach((pyro, i) => {
      if (mob.dead || immune(mob, 'fire')) return;
      this._hurt(mob, damage * FIRE.torch.share * torchPower(pyro) / 2 ** i * (this.blessed || 1), t, 'fire', true);
      if (pyro.react && mob.hp > 0) this._mark(mob, 'fire', pyro);
    });
  }

  _daze(t, seconds) {
    if (t.wardUntil > this.time) return false;
    t.busy = Math.max(t.busy, this.time + seconds);
    t.stunUntil = Math.max(t.stunUntil, this.time + seconds);
    return true;
  }

  _shoot(dt, now) {
    const alive = this.mobs.some((m) => !m.dead);
    for (const t of this.towers) {
      if (t.boost.clarity) {
        for (const key of COOLDOWNS) if (t[key] > now) t[key] -= dt * t.boost.clarity;
      }
      if (t.busy > now) continue;
      const skill = SKILLS[t.cls.id];
      if (skill.every) skill.every(this, t, now, alive);
      const aligned = this._turn(t, dt, now);
      if (t.charge) {
        if (now >= t.charge.until) {
          const charge = t.charge;
          t.charge = null;
          skill.charged(this, t, now, charge);
          t.cooldown = this._intervalOf(t, now);
        }
        continue;
      }
      if (t.cls.passive) continue;
      t.cooldown -= dt;
      if (!aligned) {
        t.cooldown = Math.max(t.cooldown, 0);
        continue;
      }
      let shots = 0;
      while (t.cooldown <= 0 && shots < SHOTS_PER_TICK) {
        if (!this._fire(t, now)) {
          t.cooldown = 0;
          break;
        }
        t.aimHold = now + AIM.hold;
        t.cooldown += this._intervalOf(t, now);
        shots += 1;
      }
    }
  }

  _fire(t, now = this.time) {
    return SKILLS[t.cls.id].fire(this, t, now);
  }

  _charge(t, now, kind, time, target) {
    t.charge = { kind, at: now, until: now + time, target };
    this._event({ kind: 'charge', tower: t, charge: kind, time, mob: target });
  }

  _wallSpot(t) {
    const taken = new Set(this.walls.map((w) => w.i));
    let best = null, gap = Infinity, rest = Infinity;
    this.road.forEach(([x, y], i) => {
      const { r, d } = this._spot(i);
      if (taken.has(i) || d < WALL_MARGIN || !r && d > this.length - HEART_GAP - WALL_MARGIN) return;
      const far = (x + 0.5 - t.cx) ** 2 + (y + 0.5 - t.cy) ** 2, left = this.length - (r ? d + this.joinShift : d);
      if (far < gap || far === gap && left < rest) {
        gap = far;
        rest = left;
        best = i;
      }
    });
    return best;
  }

  _wallUnit() {
    return this._waveHp('normal', this.players || this.towers.length || 1);
  }

  _wallMax(t) {
    return t.might * EARTH.wall.might * (t.runes.has('steelWall') ? EARTH.wall.steel : 1);
  }

  _raiseWall(t, now) {
    t.nextWall = now + 1;
    const i = this._wallSpot(t);
    if (i === null) return;
    const [x, y] = this.road[i], hp = this._wallMax(t), { r, d } = this._spot(i);
    this.walls.push({ tower: t, i, r, d, x: x + 0.5, y: y + 0.5, hp, max: hp, hitAt: -1e9,
      steel: t.runes.has('steelWall') });
    this._event({ kind: 'wall', tower: t, x: x + 0.5, y: y + 0.5 });
  }

  _spot(i) {
    return i < this.path.length ? { r: 0, d: i + 1 } : { r: 1, d: i - this.path.length + 1 };
  }

  _roadPoint(r, d) {
    const point = { r, d, x: 0, y: 0 };
    this._onRoute(point);
    return point;
  }

  _targetable(t, mob, range = t.range, mode = t.cls.base.target) {
    if (mob.dead || hidden(mob, this.time) || immune(mob, t.element) || !reaches(t, mob, range)
      || !this.sees(t, mob)) return false;
    if (mode === 'land' && mob.flying) return false;
    if (mode === 'toxic' && mob.undead) return false;
    return true;
  }

  facing(t) {
    if (t.style === 'mortar') return leading(this, t);
    if (t.style === 'turret' && t.runes.has('giant')) return skyFirst(this, t);
    if (t.cls.id === 'forester') return woodTarget(this, t);
    return t.cls.id === 'sniper' ? aimOf(this, t) : this._target(t);
  }

  _target(t, { skip = null, range = t.range, mode = t.cls.base.target } = {}) {
    let best = null, bestScore = -Infinity;
    for (const mob of this.mobs) {
      if (mob === skip || !this._targetable(t, mob, range, mode)) continue;
      let score = this.ahead(mob);
      if (mode === 'strongest') score = mob.hp;
      else if (mode === 'bigFirst' && big(mob)) score += big(mob) ? 2e6 : 1e6;
      else if (mode === 'small' && big(mob)) score -= 1e6;
      if (score > bestScore) {
        bestScore = score;
        best = mob;
      }
    }
    return best;
  }

  _leader(filter = () => true) {
    let best = null;
    for (const mob of this.mobs) {
      if (mob.dead || hidden(mob, this.time) || this.covered(mob.x, mob.y) || !filter(mob)) continue;
      if (!best || this.ahead(mob) > this.ahead(best)) best = mob;
    }
    return best;
  }

  _closestBig(t) {
    let best = null, gap = Infinity;
    for (const mob of this.mobs) {
      if (mob.dead || !big(mob) || hidden(mob, this.time) || this.covered(mob.x, mob.y)) continue;
      const far = (mob.x - t.cx) ** 2 + (mob.y - t.cy) ** 2 - (big(mob) ? 1e6 : 0);
      if (far < gap) {
        gap = far;
        best = mob;
      }
    }
    return best;
  }

  _around(x, y, radius, skip = null) {
    return this.mobs.filter((mob) => mob !== skip && !mob.dead && !hidden(mob, this.time) && near(mob, x, y, radius));
  }

  _hurt(mob, amount, t, element = t.element || null, dot = false, pierce = 0, deep = false) {
    if (mob.dead || amount <= 0 || underground(mob, this.time) && !t.deep && !deep) return;
    if (!dot && !t.cls.through && this.covered(mob.x, mob.y)) return;
    const now = this.time;
    const plague = element === 'poison' && t.runes.has('plague');
    if (element === 'poison' && mob.undead && !plague) return;
    if (plague && !mob.undead) amount *= 1 + WOOD.plague;
    amount *= this._weak(element);
    if (element) amount *= 1 + this.catalyst;
    if (t.style === 'inquisitor' && t.runes.has('repose') && wicked(mob)) amount *= HOLY.repose;
    if (immune(mob, element)) {
      mob.helpers.add(t);
      if (now >= mob.immuneAt) {
        mob.immuneAt = now + IMMUNE_GAP;
        this._event({ kind: 'immune', mob });
      }
      return;
    }
    const power = mob.muteUntil > now ? null : mob.power, guard = pierce >= SHIELDS;
    if (power && power.id === 'shield' && mob.powerUntil > now && !guard) return;
    if (power && power.id === 'curl' && mob.powerUntil > now && !guard) return;
    if (power && power.id === 'mirror' && mob.powerUntil > now && !dot && !guard) {
      mob.powerUntil = 0;
      this._daze(t, power.hold);
      this._event({ kind: 'reflect', mob, tower: t });
      return;
    }
    const vulnerable = ((mob.markUntil > now ? mob.mark : 0) + (mob.vulnUntil > now ? mob.vuln : 0))
      * (1 - this._resistOf(mob));
    let dealt = amount * (1 + vulnerable) * (1 + t.boost.damage) * (1 + t.boost.might) * this._frailty(mob, element)
      * (1 + FIRE.black.damage * stacksOf(mob, t));
    const cut = Math.max(power && power.cut || 0, mob.armor) - (this.state(mob, 'disease') ? REACTIONS.disease.armor : 0);
    if (cut && !pierce) dealt *= 1 - cut;
    if (mob.eyed && !dot && !t.striking) dealt *= t.critMul;
    if (mob.front && !dot && !pierce && this._facing(mob, t)) dealt *= 1 - mob.front;
    if (ghostly(mob, now) && element !== 'holy') dealt *= GHOST_CUT;
    if (element === 'fire' && mob.fireproof) dealt *= 1 - mob.fireproof;
    if (mob.ward > 0 && !guard) {
      const kept = Math.min(mob.ward, dealt);
      mob.ward -= kept;
      dealt -= kept;
      if (dealt <= 0) {
        mob.helpers.add(t);
        return;
      }
    }
    if (mob.treasure && now >= mob.clinkAt) {
      mob.clinkAt = now + CLINK_GAP;
      this._event({ kind: 'clink', mob });
    }
    const share = Math.min(dealt, mob.hp);
    if (mob.party && mob.party.length) for (const ally of mob.party) ally.run.damage += share / mob.party.length;
    else t.run.damage += share;
    this._credit(mob, t, share);
    mob.hp -= dealt;
    if (t.style === 'inquisitor' && t.runes.has('banish')) mob.banished = true;
    if (!dot) mob.hitAt = now;
    mob.helpers.add(t);
    if (mob.party) for (const ally of mob.party) mob.helpers.add(ally);
    if (!dot && t.react && mob.hp > 0 && (!t.cls.react.strict || element === t.react)) this._mark(mob, t.react, t);
    for (const by of t.boostBy) mob.helpers.add(by);
    mob.last = t;
    if (element === 'poison' && t.runes.has('infection')) mob.rot = { by: t, until: now + ROT.time };
    if (mob.mirage && !mob.fake && !dot) this._mirage(mob);
    if (mob.cargo && mob.hp > 0) this._unload(mob, false);
    if (power && power.id === 'curl' && !dot && mob.hp > 0 && dealt >= mob.max * power.share
      && now >= mob.curlReady) {
      mob.powerUntil = now + power.time;
      mob.curlReady = now + power.rest;
      this._event({ kind: 'power', mob });
    }
    if (mob.hp <= 0) {
      this._kill(mob);
      return;
    }
  }

  _frailty(mob, element) {
    if (!mob.states) return 1;
    let mul = 1;
    if (element && this.state(mob, 'corrosion')) mul += REACTIONS.corrosion.weak;
    if (this.state(mob, 'epidemic')) mul += REACTIONS.epidemic.weak;
    return mul;
  }

  _slay(mob, t) {
    if (mob.dead) return;
    t.run.damage += mob.hp;
    this._credit(mob, t, mob.hp);
    mob.helpers.add(t);
    mob.last = t;
    this._kill(mob);
  }

  _kill(mob) {
    mob.dead = true;
    mob.hp = 0;
    const killer = mob.last;
    if (mob.fake) {
      this._event({ kind: 'kill', mob, by: killer });
      return;
    }
    const prize = mob.silver ? SILVER.xp : 1, purse = mob.silver ? SILVER.coins : 1;
    const killers = new Set(mob.party || [killer]);
    const trophy = fade(this.towers.filter((h) => h.cls.id === 'forester' && h.style === 'hunter'
      && h.runes.has('trophy') && near(mob, h.cx, h.cy, WOOD.trophy.radius)).map(() => WOOD.trophy.bonus))
      * (this.blessed || 1);
    if (trophy) this._event({ kind: 'trophy', x: mob.x, y: mob.y });
    const total = Array.from(mob.dealt.values()).reduce((sum, value) => sum + value, 0) || 1;
    for (const t of mob.helpers) {
      const earn = t.cls.earn || NO_EARN, profile = earnOf(t), big = mob.info.elite || mob.info.boss ? profile.big || 1 : 1;
      const part = (FARM.part + FARM.damage * (mob.dealt.get(t) || 0) / total + (killers.has(t) ? FARM.killer : 0)) * big;
      this._grant(t, mob.info.xp * earn.xp * prize * part);
      const coins = FARM.coins * part * mob.info.coins * earn.coins * purse * Math.max(0, 1 + (t.mods.coins || 0))
        * (1 + trophy);
      t.player.coins += coins;
      t.run.coins += coins;
      if (t === killer) {
        t.run.kills += 1;
        t.player.kills += 1;
        if (t.cls.id === 'thunder' && t.runes.has('frenzy')) {
          t.frenzyUntil = this.time + STORM.frenzy.time;
          t.cooldown = Math.min(t.cooldown, this._intervalOf(t, this.time));
        }
      } else this._help(t, HELP.assist, false);
    }
    for (const t of this.towers) {
      if (mob.helpers.has(t)) continue;
      const coins = FARM.coins * FARM.squad * mob.info.coins * (t.cls.earn || NO_EARN).coins * purse
        * Math.max(0, 1 + (t.mods.coins || 0));
      t.player.coins += coins;
      t.run.coins += coins;
    }
    this._event({ kind: 'kill', mob, by: killer });
    if (mob.stolen && killer) {
      killer.player.coins += mob.stolen;
      killer.run.coins += mob.stolen;
      this._event({ kind: 'loot', mob, tower: killer, coins: mob.stolen });
    }
    if (mob.cargo) this._unload(mob, true);
    if (mob.silver && mob.silver.burst) {
      this._event({ kind: 'boom', x: mob.x, y: mob.y, radius: SILVER.burst });
      for (const t of this.towers) {
        if (near({ x: t.cx, y: t.cy }, mob.x, mob.y, SILVER.burst)) this._daze(t, SILVER.daze);
      }
    }
    if (mob.silver && mob.silver.split && !mob.banished) {
      for (const shift of [-0.3, 0.3]) {
        this.births.push({ spawn: { type: mob.type, look: lookOfMob(mob), hp: mob.max * SILVER.split / SILVER.hp },
          d: Math.max(0, mob.d + shift), r: mob.r, at: this.time });
      }
    }
    if (mob.power && mob.power.brood && !mob.banished) {
      const hp = this._waveHp('swarm') * mob.power.hp;
      for (let i = 0; i < mob.power.brood; i++) {
        this.births.push({ spawn: { type: 'swarm', look: lookOf('spiderling'), hp }, d: Math.max(0, mob.d - i * 0.2),
          r: mob.r, at: this.time });
      }
    }
    if (mob.banished) {
      this._event({ kind: 'banished', mob });
    } else if (mob.revive > 0 && !(killer && killer.cls.id === 'priest' && mob.undead)) {
      const spawn = { type: mob.type, kind: mob.kind, look: mob.kind ? null : lookOfMob(mob), hp: mob.max };
      this.births.push({ spawn, d: mob.d, r: mob.r, at: this.time + REVIVE_TIME, risen: true,
        raise: mob.power && mob.power.raise || 0 });
    } else if (this.rules.rise && !mob.risen && !mob.fake && !BODILESS.has(mob.look)) {
      const type = mob.type === 'tough' || big(mob) ? 'tough' : 'normal';
      const hp = this._waveHp(type) * TERRAIN.grave * Math.max(FLOOR, 1 + this.foe.hp);
      const look = lookOf(type === 'tough' ? 'skelwarrior' : 'skeleton');
      this.births.push({ spawn: { type, look, hp }, d: mob.d, r: mob.r, at: this.time + REVIVE_TIME, risen: true });
    }
    for (const other of this.mobs) {
      if (other.dead || !other.power || other.power.id !== 'leech' || !near(other, mob.x, mob.y, other.power.range)) {
        continue;
      }
      other.hp = Math.min(other.max, other.hp + other.max * other.power.drain);
      this._event({ kind: 'leech', mob: other });
    }
    if (mob.treasure) {
      const coins = Math.round(MIMIC.coins + MIMIC.coinsStep * this.wave);
      for (const t of mob.helpers) {
        t.player.coins += coins;
        t.run.coins += coins;
      }
      this.treasures += 1;
      this._event({ kind: 'treasure', mob, coins });
    }
    const pieces = mob.banished ? 0 : mob.power && mob.power.id === 'split' ? 3 : mob.slime > 1 ? mob.slime - 1 : 0;
    if (pieces) {
      const type = SLIMES[pieces - 1], look = LOOKS[type].find((item) => item.slime === pieces), spots = [];
      for (const shift of [-SPLIT_GAP, SPLIT_GAP]) {
        const hp = this._waveHp(type) * Math.max(FLOOR, 1 + this.foe.hp) * this.kin, d = Math.max(0, mob.d + shift);
        const spot = { d, r: mob.r, sx: 0, sy: 0, placed: false };
        this._locate(spot);
        spots.push([spot.x, spot.y]);
        this.births.push({ spawn: { type, look, hp }, d, r: mob.r, at: this.time + SPLIT_TIME });
      }
      this._event({ kind: 'split', mob, spots });
    }
  }

  _help(t, points, paid = true) {
    points = Math.round(points);
    t.run.assists += points;
    t.player.assists += points;
    if (!paid || !points) return;
    const pay = points * (earnOf(t).help || 1), coins = pay * FARM.helpCoins * Math.max(0, 1 + (t.mods.coins || 0));
    t.player.coins += coins;
    t.run.coins += coins;
    this._grant(t, pay * FARM.helpXp);
  }

  _credit(mob, t, amount) {
    if (amount <= 0) return;
    const party = mob.party && mob.party.length ? mob.party : [t];
    for (const ally of party) mob.dealt.set(ally, (mob.dealt.get(ally) || 0) + amount / party.length);
    if (!t.boostBy || !t.boostBy.size) return;
    const cut = amount * FARM.boost / t.boostBy.size;
    for (const by of t.boostBy) mob.dealt.set(by, (mob.dealt.get(by) || 0) + cut * (earnOf(by).aura || 1));
  }

  _plant(t) {
    if (t.style !== 'shamaness' || !this.towers.includes(t)) return;
    for (const [id, kind] of Object.entries(TOTEMS)) {
      let have = this.banners.filter((banner) => banner.tower === t && banner.kind === kind).length;
      for (; have < (t.stacks.get(id) || 0); have++) {
        const cell = this._bannerCell(t);
        if (!cell) return;
        const [dx, dy] = SPELL.totem.spot;
        this.banners.push({ tower: t, kind, x: cell.x, y: cell.y, cx: cell.x + dx, cy: cell.y + dy, seed: this.random() });
        this._event({ kind: 'totem', tower: t, totem: kind, x: cell.x + dx, y: cell.y + dy });
      }
    }
  }

  _bannerCell(t) {
    const taken = (x, y) => this.banners.some((banner) => banner.x === x && banner.y === y);
    let best = Infinity, cells = [];
    for (const [x, y] of this.road) {
      if (taken(x, y) || cells.some((cell) => cell.x === x && cell.y === y)) continue;
      const gap = (x - t.x) ** 2 + (y - t.y) ** 2;
      if (gap < best) {
        best = gap;
        cells = [{ x, y }];
      } else if (gap === best) cells.push({ x, y });
    }
    return cells.length ? cells[Math.floor(this.random() * cells.length)] : null;
  }

  _totems(mob, kind) {
    return fade(this.banners.filter((banner) => banner.kind === kind && near(mob, banner.cx, banner.cy,
      SPELL.totem.radius)).map(() => SPELL.totem[kind]));
  }

  _retreats(mob, d) {
    if (d < 0) return false;
    const spot = this._roadPoint(mob.r, d);
    return spot.x >= 0 && spot.y >= 0 && spot.x < SIZE && spot.y < SIZE && !this.covered(spot.x, spot.y);
  }

  _resistOf(mob) {
    return Math.min(1, Math.max(0, mob.resist - (this.deafen || 0)) + (mob.rage || 0));
  }

  get rage() {
    if (!this.wild) return 0;
    return Math.min(RAGE.max, RAGE.step * (1 + Math.floor((this.time - this.wildAt) / RAGE.every)));
  }

  _sorcery(id, value) {
    return fade(this.towers.filter((t) => t.cls.id === 'sorceress' && t.runes.has(id)).map(() => value));
  }

  _aegis() {
    return fade(this.towers.filter((t) => t.cls.id === 'priest' && t.runes.has('aegis'))
      .map(() => HOLY.aegis));
  }

  _lastStand(diablo) {
    const angel = this.towers.find((t) => t.style === 'angel' && t.runes.has('lastStand') && !t.planted
      && !this.stood.has(t.player));
    if (!angel) return false;
    this.stood.add(angel.player);
    this._help(angel, HELP.save);
    const s = HOLY.second;
    angel.planted = true;
    angel.charge = null;
    this.lives = diablo ? 0 : Math.max(0, this.lives);
    this.ward = { tower: angel, blastAt: this.time + s.charge };
    if (diablo) {
      diablo.biting = 0;
      diablo.aweUntil = this.time + s.charge + s.awe;
      diablo.holdUntil = diablo.aweUntil;
    }
    this._event({ kind: 'lastStand', tower: angel, time: s.charge });
    return true;
  }

  _judge(now) {
    const ward = this.ward;
    if (!ward.blastAt || now < ward.blastAt) return;
    ward.blastAt = 0;
    const wiped = this.mobs.filter((mob) => !mob.dead && !mob.fatal);
    for (const mob of wiped) {
      mob.dead = true;
      mob.hp = 0;
    }
    this.spawns = [];
    this.births = [];
    this._event({ kind: 'judgement', tower: ward.tower, wiped });
  }

  reward(t, xp) {
    this._grant(t, xp);
  }

  _grant(t, xp) {
    const amount = xp * Math.max(0, 1 + (t.mods.xp || 0)) * (1 + this._sorcery('courses', SPELL.courses));
    t.player.xp += amount;
    t.run.xp += amount;
    if (this.towers.includes(t)) this._level(t);
  }

  _nearest(x, y, range, skip, filter = null) {
    let best = null, bestDistance = range * range;
    for (const mob of this.mobs) {
      if (mob.dead || skip.has(mob) || hidden(mob, this.time) || filter && !filter(mob)) continue;
      const d = (mob.x - x) * (mob.x - x) + (mob.y - y) * (mob.y - y);
      if (d <= bestDistance) {
        bestDistance = d;
        best = mob;
      }
    }
    return best;
  }

  _blast(t, x, y, radius, damage, skip, pierce = 0) {
    this._event({ kind: 'boom', tower: t, x, y, radius });
    for (const mob of this.mobs.slice()) {
      if (mob === skip || mob.dead || !near(mob, x, y, radius)) continue;
      this._hurt(mob, damage, t, null, false, pierce);
      this._torchHit(t, mob, damage);
    }
  }

  _toughest(t, ground = false) {
    const now = this.time;
    let best = null;
    for (const mob of this.mobs) {
      if (mob.dead || ground && !grounded(mob, now) || !this._targetable(t, mob)) continue;
      if (!best || mob.hp > best.hp) best = mob;
    }
    return best;
  }
}


const flame = (t) => (t.runes.has('blue') ? FIRE.blue : 1);

const stacksOf = (mob, t) => (mob.black && mob.black.get(t)) || 0;

export function flightAt(bird, s) {
  const last = bird.cells.length - 1, i = Math.max(0, Math.min(last - 1, Math.floor(s))), f = Math.min(1, s - i);
  const a = bird.cells[i], b = bird.cells[i + 1] || a;
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, angle: Math.atan2(b.x - a.x, -(b.y - a.y)) };
}

function kindle(b, t, mob) {
  const black = t.runes.has('amaterasu');
  b._event({ kind: 'ignite', tower: t, x: mob.x, y: mob.y, radius: 0.5, blue: t.runes.has('blue'), black });
  scorch(b, t, mob, t.damage * FIRE.igniteMul);
  if (!black || mob.dead) return;
  if (!mob.black) mob.black = new Map();
  mob.black.set(t, Math.min(FIRE.black.max, stacksOf(mob, t) + 1));
}

function scorch(b, t, mob, damage) {
  if (immune(mob, 'fire')) return;
  b._hurt(mob, damage * flame(t), t, 'fire');
  if (mob.dead || !t.runes.has('smolder')) return;
  b._ignite(mob, t, t.damage * FIRE.smolder * flame(t), FIRE.burn * (t.runes.has('blue') ? FIRE.blueBurn : 1));
}

function fireball(b, t, target, from = null, hand = 0) {
  const styled = t.style === 'fireball', giant = styled && t.runes.has('giant');
  const crit = rollCrit(b, t), damage = t.damage * (styled ? FIRE.styled : 1) * (giant ? FIRE.giant : 1)
    * (crit ? t.critMul : 1);
  const radius = styled ? FIRE.splash * (giant ? FIRE.wide : 1) : 0, x = target.x, y = target.y;
  const event = { kind: 'shot', tower: t, x, y, crit, mob: target.dead ? null : target, time: FIREBALL_FLIGHT,
    size: giant ? 13 : styled ? 10 : 7, blue: t.runes.has('blue'), hand };
  if (from) Object.assign(event, { sx: from.x, sy: from.y });
  b._event(event);
  b._later(FIREBALL_FLIGHT, () => {
    if (radius) b._event({ kind: 'boom', tower: t, x, y, radius, blue: t.runes.has('blue'), fireball: true });
    const hit = radius ? b._around(x, y, radius) : target.dead ? [] : [target];
    for (const mob of hit) scorch(b, t, mob, damage);
  }, t);
}

function breathe(b, t, target) {
  const angle = Math.atan2(target.y - t.cy, target.x - t.cx), blue = t.runes.has('blue');
  const inCone = (mob) => {
    if (!near(mob, t.cx, t.cy, t.range)) return false;
    let delta = Math.atan2(mob.y - t.cy, mob.x - t.cx) - angle;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    return Math.abs(delta) <= t.cone;
  };
  b._event({ kind: 'flame', tower: t, angle, x: target.x, y: target.y, blue, cone: t.cone, breath: true });
  const crit = rollCrit(b, t), damage = t.damage * FIRE.breath * (crit ? t.critMul : 1);
  for (const mob of b.mobs.slice()) {
    if (mob.dead || hidden(mob, b.time) || mob !== target && !inCone(mob)) continue;
    scorch(b, t, mob, damage);
  }
  return true;
}

function farthestPrey(b, t) {
  let best = null, gap = -1;
  for (const mob of b.mobs) {
    if (!b._targetable(t, mob)) continue;
    const d = (mob.x - t.cx) ** 2 + (mob.y - t.cy) ** 2;
    if (d > gap) {
      gap = d;
      best = mob;
    }
  }
  return best;
}

function hammerAt(t, x, y, k, back) {
  const s = STORM.thor, dx = x - t.cx, dy = y - t.cy, len = Math.hypot(dx, dy) || 1, side = back ? -1 : 1;
  const kx = t.cx + dx / 2 - dy / len * len * s.bend * side, ky = t.cy + dy / 2 + dx / len * len * s.bend * side;
  const [ax, ay, bx, by] = back ? [x, y, t.cx, t.cy] : [t.cx, t.cy, x, y], u = 1 - k;
  return { x: u * u * ax + 2 * u * k * kx + k * k * bx, y: u * u * ay + 2 * u * k * ky + k * k * by };
}

export const godStage = (t) => (t.runes.has('godRage') ? Math.min(5, 1 + Math.floor((t.godThrows || 0) / STORM.god.stage)) : 1);

function godHaste(t) {
  return t.style === 'thor' && t.runes.has('godRage') ? STORM.god.haste * Math.floor((t.godThrows || 0) / STORM.god.per) : 0;
}

function hammerFree(t, now) {
  return (t.hammers || []).filter((until) => until > now).length < (t.runes.has('twin') ? 2 : 1);
}

function hurl(b, t, target, hit, crit, now) {
  const s = STORM.thor, aim = { x: target.x, y: target.y };
  t.hammers = (t.hammers || []).filter((until) => until > now).concat(now + s.out + s.back);
  if (t.runes.has('godRage')) {
    hit *= 1 + STORM.god.damage * (t.godThrows || 0);
    t.godThrows = (t.godThrows || 0) + 1;
  }
  b._event({ kind: 'hammer', tower: t, x: aim.x, y: aim.y, mob: target, out: s.out, back: s.back, crit, stage: godStage(t) });
  const struck = new Set();
  for (const back of [false, true]) {
    for (let k = 1; k <= s.steps; k++) {
      b._later((back ? s.out : 0) + (back ? s.back : s.out) * k / s.steps, () => {
        if (!back && !target.dead) Object.assign(aim, { x: target.x, y: target.y });
        const spot = hammerAt(t, aim.x, aim.y, k / s.steps, back);
        for (const mob of b._around(spot.x, spot.y, s.touch)) {
          if (struck.has(mob) || mob === target && !back && k < s.steps) continue;
          struck.add(mob);
          b._hurt(mob, hit / 2, t, null);
          b._hurt(mob, hit / 2, t, 'storm');
        }
      }, t);
    }
  }
  return true;
}

function quake(b, t, now) {
  const s = STORM.quake;
  t.nextQuake = now + s.every;
  let best = null;
  for (const route of [b.path, b.branch]) {
    route.forEach(([x, y], i) => {
      const gap = (x + 0.5 - t.cx) ** 2 + (y + 0.5 - t.cy) ** 2;
      if (!best || gap < best.gap) best = { route, i, gap };
    });
  }
  if (!best) return;
  const lines = [-1, 1].map((way) => {
    const cells = [];
    for (let k = 0; k <= s.cells; k++) {
      const cell = best.route[best.i + way * k];
      if (cell) cells.push([cell[0] + 0.5, cell[1] + 0.5]);
    }
    return cells;
  });
  b._event({ kind: 'thunderquake', tower: t, lines, step: s.step });
  const struck = new Set();
  for (const cells of lines) {
    cells.forEach(([x, y], k) => {
      b._later(k * s.step, () => {
        for (const mob of b._around(x, y, s.touch)) {
          if (struck.has(mob)) continue;
          struck.add(mob);
          b._hurt(mob, t.damage, t);
          b._hold(mob, s.stun, t, true);
        }
      }, t);
    });
  }
}

export function pullAt(t, now) {
  const pull = t.pull, f = Math.max(0, Math.min(1, (now - pull.start) / (pull.end - pull.start))), k = 1 - (1 - f) ** 2;
  return { x: pull.fx + (t.cx - pull.fx) * k, y: pull.fy + (t.cy - pull.fy) * k, k };
}

function rageOf(hits) {
  const s = WOLF.rage;
  let left = hits, bonus = 0;
  for (const [count, each] of s.steps) {
    const used = Math.min(left, count);
    bonus += used * each;
    left -= used;
  }
  return Math.min(s.max, bonus + left * s.rest);
}

function wolf(b, t, now, alive) {
  if (t.lastFire === undefined) t.lastFire = now;
  const prey = b._target(t), idle = now - t.lastFire, s = WOLF.howl;
  const dashed = t.runes.has('dash') && alive && !prey && idle >= WOLF.dash.idle && dash(b, t, now);
  if (t.howlAt !== undefined && t.howlAt !== null) {
    if (prey || dashed) {
      const long = now - t.howlAt;
      Object.assign(t, { howlAt: null, howlUntil: now + long, packUntil: now + long * s.share });
    } else if (now >= t.howlNext) cry(b, t, now);
  } else if (t.runes.has('howl') && !dashed && !prey && idle >= s.idle) {
    t.howlAt = now;
    cry(b, t, now);
  }
}

function cry(b, t, now) {
  const s = WOLF.howl, pick = ([low, high]) => low + b.random() * (high - low), time = pick(s.time), rest = pick(s.rest);
  Object.assign(t, { cryAt: now, cryUntil: now + time, howlNext: now + time + rest });
  b._event({ kind: 'howl', tower: t, time });
}

function dash(b, t, now) {
  const s = WOLF.dash, lead = b._leader((mob) => !immune(mob, t.element));
  if (!lead) return false;
  const cx = Math.floor(lead.x), cy = Math.floor(lead.y);
  let best = null;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = cx + dx, y = cy + dy;
      if (!b.free(x, y) && !(x === t.x && y === t.y)) continue;
      const gap = (x + 0.5 - lead.x) ** 2 + (y + 0.5 - lead.y) ** 2;
      if (!best || gap < best.gap) best = { x, y, gap };
    }
  }
  if (!best || best.x === t.x && best.y === t.y) return false;
  const from = { cx: t.cx, cy: t.cy };
  b._relocate(t, best.x, best.y);
  const time = Math.hypot(t.cx - from.cx, t.cy - from.cy) / s.speed;
  t.pull = { fx: from.cx, fy: from.cy, start: now, end: now + time, dash: true, hit: new Set() };
  t.busy = Math.max(t.busy, now + time);
  t.lastFire = now;
  b._event({ kind: 'dash', tower: t, x1: from.cx, y1: from.cy, x: t.cx, y: t.cy, time });
  return true;
}

function jolt(b, t, mob, hit, struck, jumps) {
  const x = mob.x, y = mob.y, s = STORM.chain;
  b._hurt(mob, hit, t);
  if (t.runes.has('fork')) fork(b, t, x, y, mob, hit);
  if (!t.runes.has('chain') || jumps <= 0 && b.random() >= s.chance) return;
  const pool = b._around(x, y, s.reach).filter((other) => !struck.has(other) && !b.covered(other.x, other.y));
  if (!pool.length) return;
  pool.sort((a, c) => Math.hypot(a.x - x, a.y - y) - Math.hypot(c.x - x, c.y - y));
  const next = pool[0];
  struck.add(next);
  b._event({ kind: 'jolt', tower: t, x, y, mob: next });
  b._later(s.gap, () => {
    if (!next.dead) jolt(b, t, next, hit, struck, jumps - 1);
  }, t);
}

function fork(b, t, x, y, from, hit) {
  const s = STORM.fork;
  if (b.random() >= s.chance) return;
  const prey = b._around(x, y, s.reach, from).filter((mob) => !b.covered(mob.x, mob.y));
  const rods = b.rods.filter((rod) => (rod.cx - x) ** 2 + (rod.cy - y) ** 2 <= s.reach * s.reach);
  const pick = Math.floor(b.random() * (prey.length + rods.length));
  if (pick < prey.length) {
    const mob = prey[pick];
    b._event({ kind: 'jolt', tower: t, x, y, mob, thin: true });
    b._hurt(mob, hit * s.mul, t);
  } else if (rods.length) {
    const rod = rods[pick - prey.length];
    b._event({ kind: 'jolt', tower: t, x, y, x2: rod.cx, y2: rod.cy, rod: true, thin: true });
    b._strikeRod(rod, b.time);
  }
}

function nextPrey(b, t, from) {
  let best = null, gap = Infinity;
  for (const mob of b.mobs) {
    if (from.hit.has(mob) || !b._targetable(t, mob)) continue;
    const d = (mob.x - from.x) ** 2 + (mob.y - from.y) ** 2;
    if (d < gap) [best, gap] = [mob, d];
  }
  return best;
}

function loose(b, t) {
  const first = b._target(t);
  if (!first) return false;
  const aims = [first];
  if (t.runes.has('triple')) {
    const others = b.mobs.filter((mob) => mob !== first && b._targetable(t, mob));
    while (aims.length < WATER.triple.count) {
      aims.push(others.length ? others.splice(Math.floor(b.random() * others.length), 1)[0] : first);
    }
  }
  aims.forEach((mob, i) => {
    const bend = i ? (i % 2 ? 1 : -1) * WATER.triple.spread : 0;
    b.arrows.push({ tower: t, x: t.cx, y: t.cy, mob, hit: new Set(),
      heading: Math.atan2(mob.y - t.cy, mob.x - t.cx) + bend });
  });
  b._event({ kind: 'arrow', tower: t, mob: first, count: aims.length });
  return true;
}

export function bubbleAt(t, now) {
  const s = WATER.bubble, a = now * s.spin + t.x * 1.7 + t.y;
  return { x: t.cx + Math.cos(a) * s.orbit, y: t.cy + Math.sin(a) * s.orbit };
}

export const bubbleStage = (charges) => WATER.bubble.stages.filter((at) => charges >= at).length - 1;

function bigPrey(b, t, now) {
  let best = null, gap = Infinity;
  for (const mob of b.mobs) {
    if (mob.dead || !big(mob) || hidden(mob, now) || immune(mob, t.element) || b.covered(mob.x, mob.y)) continue;
    const d = (mob.x - t.cx) ** 2 + (mob.y - t.cy) ** 2;
    if (d < gap) [best, gap] = [mob, d];
  }
  return best;
}

function bubble(b, t, now) {
  const s = WATER.bubble, ball = t.bubble;
  if (!ball.fly) {
    if (now < t.nextBubble) return;
    const prey = bigPrey(b, t, now);
    if (!prey) return;
    ball.fly = Object.assign({ mob: prey, at: now }, bubbleAt(t, now));
    b._event({ kind: 'bubble', tower: t, mob: prey });
    return;
  }
  const fly = ball.fly, dt = now - fly.at;
  fly.at = now;
  if (fly.mob.dead || hidden(fly.mob, now)) fly.mob = bigPrey(b, t, now);
  if (!fly.mob) {
    ball.fly = null;
    return;
  }
  const step = Math.max(s.speed, (fly.mob.speed || 0) * s.chase) * dt, gap = Math.hypot(fly.mob.x - fly.x, fly.mob.y - fly.y);
  if (gap > step + s.touch) {
    fly.x += (fly.mob.x - fly.x) / gap * step;
    fly.y += (fly.mob.y - fly.y) / gap * step;
    return;
  }
  const x = fly.mob.x, y = fly.mob.y, hit = t.damage * s.per * ball.charges;
  b._event({ kind: 'pop', tower: t, x, y, radius: s.radius, stage: bubbleStage(ball.charges) });
  for (const mob of b._around(x, y, s.radius)) b._hurt(mob, hit, t);
  Object.assign(ball, { charges: 0, fly: null });
  t.nextBubble = now + s.every;
}

const inked = (b, mob) => Boolean(mob.ink && mob.ink.until > b.time);

function slap(b, t, mob) {
  const s = WATER.slap;
  if (!t.runes.has('slap') || mob.dead || b.random() >= s.chance) return;
  b._hold(mob, mob.info.boss ? s.boss : elite(mob) ? s.elite : s.hold, t, true);
  b._event({ kind: 'slap', tower: t, mob });
}

function lashHurt(b, t, mob, amount) {
  b._hurt(mob, amount / 2, t, null);
  b._hurt(mob, amount / 2, t, 'water');
}

function lashOf(b, t, mob, hit) {
  return hit * (inked(b, mob) ? WATER.ink.mul : 1) * b.roaring();
}

function grab(b, t) {
  const crit = rollCrit(b, t), hit = t.damage * (crit ? t.critMul : 1);
  if (!b.swims(t)) {
    const marked = b.mobs.find((mob) => inked(b, mob) && b._targetable(t, mob));
    const target = marked || b._target(t);
    if (!target) return false;
    b._event({ kind: 'tentacle', tower: t, mob: target, x: t.cx, y: t.cy, crit });
    lashHurt(b, t, target, lashOf(b, t, target, hit));
    slap(b, t, target);
    return true;
  }
  const s = WATER.kraken, now = b.time;
  let struck = false;
  for (const arm of b.arms) {
    if (arm.tower !== t) continue;
    let mob = null, gap = s.sea * s.sea;
    for (const other of b.mobs) {
      if (other.dead || hidden(other, now) || immune(other, t.element) || b.covered(other.x, other.y)) continue;
      const d = (other.x - arm.x) ** 2 + (other.y - arm.y) ** 2 - (inked(b, other) ? 1e6 : 0);
      if (d <= gap && (other.x - arm.x) ** 2 + (other.y - arm.y) ** 2 <= s.sea * s.sea) [mob, gap] = [other, d];
    }
    if (!mob) continue;
    struck = true;
    if (t.runes.has('drown') && !big(mob) && mob.hp <= mob.max * WATER.drown) {
      mob.drowned = true;
      b._event({ kind: 'drown', tower: t, mob, x: arm.x, y: arm.y, arm });
      b._slay(mob, t);
      continue;
    }
    b._event({ kind: 'tentacle', tower: t, mob, x: arm.x, y: arm.y, arm, crit });
    lashHurt(b, t, mob, lashOf(b, t, mob, hit * s.arm / s.mul));
    slap(b, t, mob);
  }
  return struck;
}

export const iceStock = (t) => (t.runes.has('iceGod') ? WATER.iceGod.stock : WATER.cryo.stock);
const iceRefill = (t) => (t.runes.has('iceGod') ? WATER.iceGod.refill : WATER.cryo.refill);

function shatter(b, t, mob) {
  const s = WATER.iceBurst;
  if (immune(mob, 'ice') || b.time < mob.holdFree || b.random() >= s.chance) return;
  b._event({ kind: 'iceBurst', tower: t, x: mob.x, y: mob.y, radius: s.radius });
  b._hold(mob, mob.info.boss ? s.boss : elite(mob) ? s.elite : s.hold, t, true);
}

function icicles(b, t, target, hit, crit, now) {
  const s = WATER.cryo, aims = [target];
  if (t.runes.has('iceGod')) {
    const others = b.mobs.filter((mob) => mob !== target && b._targetable(t, mob));
    while (aims.length < WATER.iceGod.count) {
      aims.push(others.length ? others.splice(Math.floor(b.random() * others.length), 1)[0] : target);
    }
  }
  aims.forEach((mob, i) => {
    const bend = i ? (i % 2 ? 1 : -1) * WATER.iceGod.spread : 0;
    const flight = Math.hypot(mob.x - t.cx, mob.y - t.cy) / s.speed * (bend ? 1.15 : 1);
    b._event({ kind: 'icicle', tower: t, mob, x: mob.x, y: mob.y, time: flight, crit, bend });
    b._later(flight, () => {
      if (!mob.dead) b._hurt(mob, hit, t);
    }, t);
    if (t.icicles <= 0) return;
    t.icicles -= 1;
    if (!t.refillAt) t.refillAt = now + iceRefill(t);
    b._event({ kind: 'icicle', tower: t, mob, x: mob.x, y: mob.y, time: flight, crit, big: true, slot: t.icicles, bend });
    b._later(flight, () => {
      if (mob.dead) return;
      b._hurt(mob, hit * s.big, t);
      if (t.runes.has('iceBurst')) shatter(b, t, mob);
    }, t);
  });
  return true;
}

function regrow(t, now) {
  const stock = iceStock(t);
  if (t.icicles >= stock) {
    t.refillAt = 0;
    return;
  }
  if (!t.refillAt) t.refillAt = now + iceRefill(t);
  if (now < t.refillAt) return;
  t.icicles += 1;
  t.refillAt = t.icicles < stock ? now + iceRefill(t) : 0;
}

function frostRing(b, t, now) {
  const s = WATER.frostRing;
  if (now < (t.nextFrost || 0)) return;
  t.nextFrost = now + s.tick;
  for (const mob of b._around(t.cx, t.cy, t.frost)) {
    if (immune(mob, 'ice')) continue;
    b._hurt(mob, t.damage * s.mul * (1 + s.snow * b.snow), t, 'ice');
    if (!mob.dead) b._slow(mob, s.slow, s.tick * 2, 'ice');
  }
}

function spit(b, t, now) {
  const s = WATER.ink;
  let prey = null;
  for (const mob of b.mobs) {
    if (mob.dead || !big(mob) || hidden(mob, now) || immune(mob, t.element) || b.covered(mob.x, mob.y)
      || !near(mob, t.cx, t.cy, s.reach)) {
      continue;
    }
    if (!prey || mob.hp > prey.hp) prey = mob;
  }
  if (!prey) return;
  t.nextInk = now + s.every;
  const flight = Math.hypot(prey.x - t.cx, prey.y - t.cy) / s.speed;
  b._event({ kind: 'ink', tower: t, mob: prey, x: prey.x, y: prey.y, time: flight });
  b._later(flight, () => {
    if (prey.dead) return;
    prey.ink = { until: b.time + s.time, by: t };
    b._slow(prey, prey.info.boss ? s.boss : s.slow, s.time);
    b._event({ kind: 'inked', tower: t, mob: prey });
  }, t);
}

function roar(b, t, now) {
  const s = WATER.roar;
  if (now < (t.nextRoar || 0) || !b.mobs.some((mob) => !mob.dead && near(mob, t.cx, t.cy, s.reach))) return;
  t.nextRoar = now + s.every;
  const boost = s.per * t.might / MIGHT.base;
  b.roarBoost = b.roarUntil > now ? Math.max(b.roarBoost, boost) : boost;
  b.roarUntil = now + s.time;
  b._event({ kind: 'bellow', tower: t, x: t.cx, y: t.cy });
}

function globe(b, t, now) {
  const target = farthestPrey(b, t);
  if (!target) return;
  const s = STORM.globe, long = Math.hypot(target.x - t.cx, target.y - t.cy) || 1;
  t.nextGlobe = now + s.every;
  b.globes.push({ tower: t, sx: t.cx, sy: t.cy, x: t.cx, y: t.cy, dx: (target.x - t.cx) / long,
    dy: (target.y - t.cy) / long, born: now, life: t.range / s.speed, zapAt: now + PULSE, hit: new Set() });
  b._event({ kind: 'globe', tower: t, mob: target });
}

function tempest(b, t, now) {
  const prey = b.mobs.filter((mob) => !mob.dead && !hidden(mob, now) && !b.covered(mob.x, mob.y));
  if (!prey.length) return;
  const s = STORM.tempest, target = prey[Math.floor(b.random() * prey.length)], x = target.x, y = target.y;
  t.nextTempest = now + s.every;
  b._event({ kind: 'skybolt', tower: t, x, y, mob: target, ground: true });
  b._event({ kind: 'thunderclap', tower: t, x, y, radius: s.radius });
  for (const mob of b._around(x, y, s.radius)) {
    b._hurt(mob, t.damage * s.mul, t);
    if (!mob.info.boss) b._hold(mob, s.stun, t, true);
  }
  for (const rod of b.rods.slice()) {
    if ((rod.cx - x) ** 2 + (rod.cy - y) ** 2 <= s.radius * s.radius) b._strikeRod(rod, now);
  }
}

function closestPrey(b, t) {
  const prey = b.mobs.filter((mob) => b._targetable(t, mob));
  prey.sort((a, c) => (big(c) ? 1 : 0) - (big(a) ? 1 : 0)
    || Math.hypot(a.x - t.cx, a.y - t.cy) - Math.hypot(c.x - t.cx, c.y - t.cy));
  return prey[0] || null;
}


function fade(values) {
  return values.sort((a, b) => b - a).reduce((sum, value, i) => sum + value / 2 ** i, 0);
}

const torchPower = (pyro) => (pyro.runes.has('blue') ? FIRE.blue : 1);

const fixedRange = (t) => t.style === 'angel' || t.style === 'raiju' || t.style === 'kraken';
const reaches = (t, mob, range) => near(mob, t.cx, t.cy, t.style === 'angel' ? range + 0.5 : range);

function rollCrit(b, t) {
  t.striking = b.random() < t.critChance;
  return t.striking;
}

const canShoot = (b, t, mob, range = t.range) => !mob.dead && !immune(mob, t.element)
  && !b.covered(mob.x, mob.y) && (t.deep || !hidden(mob, b.time)) && reaches(t, mob, range)
  && b.sees(t, mob);

function aimOf(b, t) {
  if (!t.style) return b._target(t);
  const air = t.style === 'marksman' && t.runes.has('antiair');
  let best = null, rank = -Infinity;
  for (const mob of b.mobs) {
    if (!canShoot(b, t, mob) || t.style === 'scope' && !big(mob)) continue;
    let score = t.style === 'scope' ? mob.hp + (big(mob) ? 1e15 : 0)
      : -Math.hypot(mob.x - t.cx, mob.y - t.cy) + (big(mob) ? 1e7 : 0);
    if (air && mob.flying) score += 1e8;
    if (t.deep && hidden(mob, b.time)) score += 1e9;
    if (score > rank) {
      rank = score;
      best = mob;
    }
  }
  return best;
}

function reload(t, now, time) {
  if (t.runes.has('endless')) return;
  t.reloadUntil = now + time;
}

function behind(b, t, target, ux, uy) {
  const s = SHOT.ricochet, cos = Math.cos(s.arc * Math.PI / 180);
  const pool = b.mobs.filter((mob) => {
    if (mob === target || mob.dead || immune(mob, t.element) || b.covered(mob.x, mob.y)) return false;
    if (!t.deep && hidden(mob, b.time)) return false;
    const dx = mob.x - target.x, dy = mob.y - target.y, far = Math.hypot(dx, dy);
    return far > 0 && far <= s.reach && (dx * ux + dy * uy) / far >= cos;
  });
  return pool.length ? pool[Math.floor(b.random() * pool.length)] : null;
}

function shoot(b, t, target, { mul = 1, crit = false, heavy = '', from = null, relay = false } = {}) {
  const head = crit || rollCrit(b, t), damage = t.damage * mul * (head ? t.critMul : 1);
  t.striking = head;
  const ox = from ? from.x : t.cx, oy = from ? from.y : t.cy, tx = target.x, ty = target.y;
  const length = Math.hypot(tx - ox, ty - oy) || 1, ux = (tx - ox) / length, uy = (ty - oy) / length;
  const through = !from && t.style === 'marksman' && t.runes.has('pierce');
  const reach = through ? Math.max(length, t.range) : length;
  const along = (mob) => (mob.x - ox) * ux + (mob.y - oy) * uy;
  const line = through ? b.mobs.filter((mob) => mob !== target && canShoot(b, t, mob, Infinity) && along(mob) >= 0.3
    && along(mob) <= reach && Math.abs((mob.x - ox) * uy - (mob.y - oy) * ux) <= PIERCE_WIDTH) : [];
  const event = { kind: 'shot', tower: t, x: ox + ux * reach, y: oy + uy * reach, crit: head, mob: target, heavy,
    gold: t.runes.has('goldRounds') };
  if (from) Object.assign(event, { sx: from.x, sy: from.y, high: Boolean(from.high) });
  b._event(event);
  const air = t.style === 'marksman' && t.runes.has('antiair'), pierce = t.style === 'scope' && t.runes.has('breaker');
  for (const mob of [target].concat(line)) {
    const hp = mob.hp, hit = damage * (air && mob.flying ? SHOT.air : 1);
    b._hurt(mob, hit, t, null, false, pierce ? SHIELDS : 0);
    b._torchHit(t, mob, hit);
    const dealt = hp - mob.hp;
    if (mob.dead) continue;
    if (t.runes.has('spotter')) {
      if (mob.markUntil <= b.time || SHOT.mark.bonus >= mob.mark) mob.mark = SHOT.mark.bonus;
      mob.markUntil = b.time + SHOT.mark.time;
    }
    if (t.runes.has('lastRound') && dealt > 0 && mob.hp < dealt) {
      b._event({ kind: 'execute', mob, tower: t });
      b._slay(mob, t);
    }
  }
  if (!from && !relay) b._backup(t, target);
  const bounce = t.runes.has(t.style === 'scope' ? 'scopeRicochet' : 'ricochet');
  const next = !from && bounce && (t.style === 'scope' || t.style === 'assault') ? behind(b, t, target, ux, uy) : null;
  if (next) {
    shoot(b, t, next, { mul: mul * SHOT.ricochet.share, crit: head, heavy, from: { x: tx, y: ty }, relay: true });
  }
}

function spend(b, t, now, count, target) {
  const shot = SHOT[t.style] || MECH[t.style];
  if (!shot || !shot.mag) return;
  if (t.style === 'assault' && t.runes.has('flashbang')) {
    t.thrown = (t.thrown || 0) + count;
    if (t.thrown >= SHOT.flash.every) {
      t.thrown -= SHOT.flash.every;
      flashbang(b, t, target);
    }
  }
  t.bullets = (t.bullets || 0) + count;
  if (t.bullets < shot.mag) return;
  t.bullets = 0;
  reload(t, now, shot.reload);
}

export { hammerAt };

export function roadCurve(line) {
  const corners = [];
  for (const [x, y] of line) {
    const q = [x + 0.5, y + 0.5], a = corners[corners.length - 2], b = corners[corners.length - 1];
    if (a && (b[0] - a[0]) * (q[1] - b[1]) === (b[1] - a[1]) * (q[0] - b[0])) corners[corners.length - 1] = q;
    else corners.push(q);
  }
  const points = [corners[0]], step = 0.04;
  const line2 = (p, q) => {
    const n = Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / step));
    for (let k = 1; k <= n; k++) points.push([p[0] + (q[0] - p[0]) * k / n, p[1] + (q[1] - p[1]) * k / n]);
  };
  for (let i = 1; i < corners.length - 1; i++) {
    const a = corners[i - 1], b = corners[i], c = corners[i + 1];
    const la = Math.hypot(b[0] - a[0], b[1] - a[1]), lc = Math.hypot(c[0] - b[0], c[1] - b[1]);
    const r = Math.min(ROAD_ROUND, la / 2, lc / 2);
    const u = [(b[0] - a[0]) / la, (b[1] - a[1]) / la], v = [(c[0] - b[0]) / lc, (c[1] - b[1]) / lc];
    const t1 = [b[0] - u[0] * r, b[1] - u[1] * r], center = [t1[0] + v[0] * r, t1[1] + v[1] * r];
    line2(points[points.length - 1], t1);
    const from = Math.atan2(t1[1] - center[1], t1[0] - center[0]), turn = u[0] * v[1] - u[1] * v[0] > 0 ? 1 : -1;
    const n = Math.ceil(r * Math.PI / 2 / step);
    for (let k = 1; k <= n; k++) {
      const a2 = from + turn * Math.PI / 2 * k / n;
      points.push([center[0] + Math.cos(a2) * r, center[1] + Math.sin(a2) * r]);
    }
  }
  line2(points[points.length - 1], corners[corners.length - 1]);
  return points;
}

function witchThrow(b, t, target) {
  const pools = t.runes.has('absorb') ? b._drain(t) : 0, mul = Math.max(1, pools), tone = t.runes.has('plague');
  const toss = () => {
    const mob = target.dead ? woodTarget(b, t) : target;
    if (!mob) return;
    const crit = rollCrit(b, t);
    b._event({ kind: 'shot', tower: t, x: mob.x, y: mob.y, crit, mob, time: WOOD.witch.flight,
      tone: tone ? 'plague' : '', size: pools ? STYLE_BALL * WOOD.absorb.size : 0 });
    b._later(WOOD.witch.flight, () => {
      if (!mob.dead) b._hurt(mob, t.damage * mul * (crit ? t.critMul : 1), t, 'poison');
      if (t.runes.has('venomBurst')) b._cloud(t, mob.x, mob.y, mul);
    }, t);
  };
  if (pools) b._later(WOOD.absorb.time, toss, t);
  else toss();
  return true;
}

function smite(b, t, target) {
  const s = HOLY.smite, weak = b.mobs.filter((mob) => mob.hp <= mob.max * s.below && b._targetable(t, mob))
    .sort((p, q) => q.max - p.max)[0], prey = weak || target;
  b._event({ kind: 'strike', tower: t, x: prey.x, y: prey.y, crit: true, mob: prey, smite: true });
  b._hurt(prey, weak ? prey.hp * 1e3 + 1e6 : t.damage * s.mul, t, 'holy', false, SHIELDS, true);
  return true;
}

function holyGround(b, t, now) {
  const pool = b.mobs.filter((mob) => !mob.dead && !hidden(mob, now) && !b.covered(mob.x, mob.y));
  if (!pool.length) return;
  const s = HOLY.holyGround, mob = pool[Math.floor(b.random() * pool.length)];
  t.nextHoly = now + s.every;
  b._event({ kind: 'holyOrb', tower: t, mob, x: mob.x, y: mob.y, time: s.flight });
  b._later(s.flight, () => {
    const x = mob.x, y = mob.y, crit = rollCrit(b, t);
    b._event({ kind: 'holyRing', tower: t, x, y, radius: s.radius });
    for (const other of b._around(x, y, s.radius)) b._hurt(other, t.damage * s.mul * (crit ? t.critMul : 1), t);
  }, t);
}

function sing(b, t, now, alive) {
  if (alive && !(t.songUntil > now)) {
    for (const [id, key] of [['siren', 'nextSiren'], ['dirge', 'nextDirge']]) {
      if (!t.runes.has(id) || now < (t[key] || 0)) continue;
      t[key] = now + SONG.every;
      t.songUntil = now + SONG.time;
      t.song = id;
      t.dirgeAt = now;
      if (id === 'siren') b.sirenUntil = Math.max(b.sirenUntil, t.songUntil);
      b._event({ kind: 'song', tower: t, song: id, time: SONG.time });
      break;
    }
  }
  if (t.song !== 'dirge' || !(t.songUntil > now) || now < t.dirgeAt) return;
  t.dirgeAt = now + PULSE;
  for (const mob of b.mobs.slice()) if (!mob.dead) b._hurt(mob, t.damage * SONG.dirge, t, null, true);
}

function chord(b, t, target, crit, hit) {
  const s = SPELL.minstrel, angle = Math.atan2(target.y - t.cy, target.x - t.cx);
  b._event({ kind: 'chord', tower: t, mob: target, x: target.x, y: target.y, angle, reach: t.range,
    time: t.range / s.speed, crit });
  const ax = Math.cos(angle), ay = Math.sin(angle);
  for (const mob of b.mobs) {
    if (!b._targetable(t, mob)) continue;
    const along = (mob.x - t.cx) * ax + (mob.y - t.cy) * ay, aside = Math.abs((mob.y - t.cy) * ax - (mob.x - t.cx) * ay);
    if (along < 0 || aside > s.wide) continue;
    b._later(along / s.speed, () => {
      if (!mob.dead) b._hurt(mob, hit, t);
    }, t);
  }
  return true;
}

function echoes(b, t) {
  const centers = [{ x: t.cx, y: t.cy }], rung = new Set();
  for (let k = 0; k < centers.length; k++) {
    const { x, y } = centers[k];
    for (const banner of b.banners) {
      if (rung.has(banner) || (banner.cx - x) ** 2 + (banner.cy - y) ** 2 > t.range * t.range) continue;
      rung.add(banner);
      centers.push({ x: banner.cx, y: banner.cy });
    }
  }
  return centers;
}

function conjure(b, t, target, crit, hit) {
  const s = SPELL.enchantress, control = t.runes.has('arcaneControl');
  b._event({ kind: 'conjure', tower: t, mob: target, x: target.x, y: target.y, time: s.wind });
  b._later(s.wind, () => {
    const first = target.dead ? b._target(t) : target;
    if (!first) return;
    const aims = control ? spread(b, t, first) : [first], damage = hit * (control ? ARCANE.control.mul : 1);
    aims.forEach((mob, i) => {
      const element = t.runes.has('elements') ? elementFor(b, mob) : null;
      const bend = i ? (i % 2 ? 1 : -1) * ARCANE.control.spread : 0;
      const flight = Math.hypot(mob.x - t.cx, mob.y - t.cy) / s.speed * (bend ? s.curve : 1);
      b._event({ kind: 'shot', tower: t, x: mob.x, y: mob.y, crit, mob, time: flight, element, bend, lead: first });
      b._later(flight, () => {
        if (mob.dead) return;
        if (element === 'fire') landing(b, t, mob.x, mob.y, element, damage, ARCANE.splash);
        else {
          touch(b, t, mob, element, damage);
          if (element === 'poison') b._cloud(t, mob.x, mob.y, ARCANE.cloud);
        }
      }, t);
    });
  }, t);
  return true;
}

function spread(b, t, first) {
  const others = b.mobs.filter((mob) => mob !== first && b._targetable(t, mob)), aims = [first];
  while (aims.length < ARCANE.control.count) {
    aims.push(others.length ? others.splice(Math.floor(b.random() * others.length), 1)[0] : first);
  }
  return aims;
}

const damageOf = (element) => (element === 'lightning' ? 'storm' : element);

function elementFor(b, mob) {
  const fits = ARCANE.elements.filter((element) => !immune(mob, damageOf(element)) && !(element === 'poison' && mob.undead));
  return fits.length ? fits[Math.floor(b.random() * fits.length)] : null;
}

function touch(b, t, mob, element, damage) {
  const bonus = element === 'holy' && wicked(mob) ? ARCANE.holy : 1;
  b._hurt(mob, damage * bonus, t, damageOf(element), false, element === 'earth' ? 1 : 0);
  if (mob.dead) return;
  if (element === 'lightning') b._hold(mob, ARCANE.stun, t);
  if (MARKED.has(element)) b._mark(mob, element, t);
}

function landing(b, t, x, y, element, damage, radius) {
  if (element === 'fire') b._event({ kind: 'boom', tower: t, x, y, radius, fireball: true });
  else if (element === 'earth') b._event({ kind: 'boom', tower: t, x, y, radius, fireball: true, tone: 'earth' });
  else if (element === 'lightning') b._event({ kind: 'thunderbolt', tower: t, x, y, radius });
  else if (element === 'holy') b._event({ kind: 'holyRing', tower: t, x, y, radius });
  if (element === 'poison') b._cloud(t, x, y, ARCANE.cloud);
  for (const mob of b._around(x, y, radius)) touch(b, t, mob, element, damage);
}

function downpour(b, t, now, alive) {
  if (!t.runes.has('arcaneRain') || !alive || t.beam || now < (t.nextRain || 0)) return;
  const target = b._target(t, { mode: 'any' }), s = ARCANE.rain;
  if (!target) return;
  t.nextRain = now + s.every;
  const element = t.runes.has('elements') ? ARCANE.elements[Math.floor(b.random() * ARCANE.elements.length)] : null;
  if (element === 'earth') {
    const x = target.x, y = target.y, fall = s.fall * 1.6;
    b._event({ kind: 'shot', tower: t, x, y, mob: null, time: fall, sx: x, sy: y - 5, element, size: 22 });
    b._later(fall, () => landing(b, t, x, y, element, t.damage * s.heavy, s.meteor), t);
    return;
  }
  for (let k = 0; k < s.count; k++) {
    const a = b.random() * Math.PI * 2, r = Math.sqrt(b.random()) * s.radius;
    const x = target.x + Math.cos(a) * r, y = target.y + Math.sin(a) * r;
    if (element === 'lightning') {
      b._later(k * s.gap, () => landing(b, t, x, y, element, t.damage, s.drop), t);
      continue;
    }
    b._later(k * s.gap, () => {
      b._event({ kind: 'shot', tower: t, x, y, mob: null, time: s.fall, sx: x, sy: y - 3, element });
      b._later(s.fall, () => landing(b, t, x, y, element, t.damage, element === 'fire' ? ARCANE.splash : s.drop), t);
    }, t);
  }
}

function usual(b, t, now) {
  const volley = t.runes.has('arcaneControl') ? ARCANE.control.count * ARCANE.control.mul : 1;
  const crits = 1 + t.critChance * (t.critMul - 1), rain = ARCANE.rain;
  return t.damage * (volley * crits / b._intervalOf(t, now) + (t.runes.has('arcaneRain') ? rain.count / rain.every : 0));
}

function focus(b, t, now, alive) {
  if (!t.runes.has('focusBeam')) return;
  const s = ARCANE.beam, old = t.beam;
  const kept = old && !old.mob.dead && b._targetable(t, old.mob) ? old.mob : null;
  const boss = alive ? kept || b.mobs.find((mob) => mob.info.boss && b._targetable(t, mob)) || null : null;
  if (!boss) {
    t.beam = null;
    return;
  }
  if (!old || old.mob !== boss) {
    t.beam = { mob: boss, element: t.runes.has('elements') ? elementFor(b, boss) : null, next: now, cloudAt: now };
    b._event({ kind: 'focus', tower: t, mob: boss, element: t.beam.element });
  }
  const beam = t.beam;
  if (now < beam.next) return;
  beam.next = now + s.tick;
  touch(b, t, boss, beam.element, usual(b, t, now) * s.mul * s.tick);
  if (beam.element === 'poison' && now >= beam.cloudAt) {
    beam.cloudAt = now + s.cloud;
    b._cloud(t, boss.x, boss.y, ARCANE.cloud);
  }
}

function holyThrow(b, t, target) {
  holyBall(b, t, target, rollCrit(b, t), null, t.runes.has('chainLight') ? HOLY.chain.jumps : 0, new Set());
  return true;
}

function holyBall(b, t, mob, crit, from, jumps, struck) {
  const flight = HOLY.inquisitor.flight, hit = t.damage * (crit ? t.critMul : 1);
  struck.add(mob);
  b._event(Object.assign({ kind: 'shot', tower: t, x: mob.x, y: mob.y, crit, mob, time: flight },
    from ? { sx: from.x, sy: from.y } : {}));
  b._later(flight, () => {
    const x = mob.x, y = mob.y;
    if (!mob.dead) b._hurt(mob, hit, t);
    if (t.runes.has('holyBurst')) {
      const s = HOLY.burst;
      b._event({ kind: 'holyRing', tower: t, x, y, radius: s.radius });
      for (const other of b._around(x, y, s.radius, mob)) b._hurt(other, hit * s.share, t);
    }
    if (jumps <= 0) return;
    const pool = b.mobs.filter((other) => !other.dead && !struck.has(other) && !hidden(other, b.time)
      && !b.covered(other.x, other.y) && near(other, x, y, HOLY.chain.reach));
    if (pool.length) holyBall(b, t, pool[Math.floor(b.random() * pool.length)], crit, { x, y }, jumps - 1, struck);
  }, t);
}

function throwNet(b, t, mob) {
  if (!t.runes.has('catcher') || mob.dead || b.random() >= WOOD.catcher.chance) return;
  if (b._stick(mob, t, 'net', WOOD.catcher.time, t.damage * WOOD.catcher.dps)) b._event({ kind: 'net', tower: t, mob });
}

function hail(b, t, now, alive) {
  if (!t.runes.has('hail') || !alive || now < (t.nextHail || 0)) return;
  const target = woodTarget(b, t), s = WOOD.hail;
  if (!target) return;
  const x = target.x, y = target.y;
  t.nextHail = now + s.every;
  b._event({ kind: 'hail', tower: t, x, y, radius: s.radius, time: s.fall });
  b._later(s.fall, () => {
    const crit = rollCrit(b, t), hit = t.damage * (crit ? t.critMul : 1);
    for (const mob of b._around(x, y, s.radius)) {
      b._hurt(mob, hit, t);
      b._torchHit(t, mob, hit);
      b._hurt(mob, t.damage * s.poison, t, 'poison');
      throwNet(b, t, mob);
    }
  }, t);
}

function erupt(b, t, now) {
  for (const vent of b.vents) {
    if (vent.tower !== t || now < vent.next) continue;
    const prey = b.mobs.filter((mob) => !mob.dead && !hidden(mob, now) && !immune(mob, 'fire')
      && !b.covered(mob.x, mob.y) && near(mob, vent.cx, vent.cy, FIRE.vent.reach));
    if (!prey.length) continue;
    vent.next = now + FIRE.vent.every;
    fireball(b, t, prey[Math.floor(b.random() * prey.length)], { x: vent.cx, y: vent.cy });
  }
}

function brew(b, t, now) {
  if (!t.runes.has('cauldron')) return;
  if (b.towers.includes(t) && !b.cauldrons.some((pot) => pot.tower === t)) b._openCauldron(t);
  const s = WOOD.cauldron, plague = t.runes.has('plague');
  for (const pot of b.cauldrons) {
    if (pot.tower !== t || now < pot.next) continue;
    const prey = b.mobs.filter((mob) => !mob.dead && !hidden(mob, now) && !b.covered(mob.x, mob.y)
      && !immune(mob, 'poison') && (!mob.undead || plague) && near(mob, pot.cx, pot.cy, s.reach));
    if (!prey.length) continue;
    pot.next = now + s.every;
    const mob = prey[Math.floor(b.random() * prey.length)];
    b._event({ kind: 'blob', tower: t, sx: pot.cx, sy: pot.cy, mob, time: s.flight, plague });
    b._later(s.flight, () => {
      if (!mob.dead) b._hurt(mob, t.damage * s.mul, t, 'poison');
      const spot = b._roadSpot(mob.x, mob.y);
      b.puddles.push({ tower: t, x: spot.x, y: spot.y, angle: spot.angle, radius: s.radius, until: b.time + s.time,
        born: b.time, dps: t.damage * s.dps, plague });
    }, t);
  }
}

function woodTarget(b, t) {
  if (t.style === 'druid') return null;
  const toxic = t.style === 'witch' && !t.runes.has('plague');
  return b._target(t, { mode: t.style === 'hunter' ? 'bigFirst' : toxic ? 'toxic' : '' });
}

function bend(a, b) {
  let delta = a - b;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

function skyFirst(b, t) {
  let best = null;
  for (const mob of b.mobs) {
    if (!b._targetable(t, mob)) continue;
    const air = (mob.flying ? 1 : 0) - (best && best.flying ? 1 : 0);
    if (!best || air > 0 || air === 0 && b.ahead(mob) > b.ahead(best)) best = mob;
  }
  return best;
}

function stream(b, t, first) {
  const barrel = (mob) => Math.abs(bend(Math.atan2(mob.x - t.cx, -(mob.y - t.cy)), t.angle)) <= AIM.heavy.slack * 2;
  const pool = b.mobs.filter((mob) => canShoot(b, t, mob) && barrel(mob) && !(first.flying && !mob.flying)
    && (mob !== t.sweep || mob === first));
  const next = pool.length > 1 ? pool.filter((mob) => mob !== t.sweep) : pool, mob = next.length
    ? next[Math.floor(b.random() * next.length)] : first;
  shoot(b, t, mob);
  t.sweep = mob;
}

function volley(b, t, target, s, stick) {
  const x = target.x, y = target.y;
  const one = () => {
    if (!b.towers.includes(t)) return;
    if (stick && canShoot(b, t, target, Infinity)) {
      shoot(b, t, target);
      return;
    }
    const pool = b.mobs.filter((mob) => canShoot(b, t, mob, Infinity) && near(mob, x, y, s.radius));
    if (pool.length) shoot(b, t, pool[Math.floor(b.random() * pool.length)]);
  };
  one();
  for (let k = 1; k < s.count; k++) b._later(k * s.gap, one);
}

function rocket(b, t, target) {
  const s = MECH.demo, crit = rollCrit(b, t), size = t.runes.has('caliber') ? MECH.caliber : 1;
  const time = s.flight + Math.hypot(target.x - t.cx, target.y - t.cy) * s.pace;
  t.lastFire = b.time;
  b._event({ kind: 'rocket', tower: t, mob: target, x: target.x, y: target.y, time, crit, big: size > 1 });
  b._later(time, () => {
    const x = target.x, y = target.y, damage = t.damage * size * (crit ? t.critMul : 1);
    b._blast(t, x, y, s.radius * size, damage, null);
    if (t.runes.has('cluster')) cluster(b, t, target, damage);
  }, t);
}

function alongRoad(b, mob, offset, side = 0) {
  const route = b.routes[mob.r] || b.route, d = Math.max(0, Math.min(route.length - 1, mob.d + offset));
  const at = b._roadPoint(mob.r, d), next = b._roadPoint(mob.r, Math.min(route.length - 1, d + 0.05));
  const dx = next.x - at.x, dy = next.y - at.y, length = Math.hypot(dx, dy) || 1;
  return { x: at.x - dy / length * side, y: at.y + dx / length * side };
}

function cluster(b, t, target, damage) {
  const s = MECH.cluster, x = target.x, y = target.y, pool = b._around(x, y, s.reach);
  for (let k = 0; k < s.count; k++) {
    const mob = pool.length ? pool[Math.floor(b.random() * pool.length)] : null;
    const spot = mob || alongRoad(b, target, (k % 2 ? 1 : -1) * s.reach * (0.5 + b.random() * 0.5));
    b._event({ kind: 'shard', tower: t, sx: x, sy: y, x: spot.x, y: spot.y, mob, time: s.flight });
    b._later(s.flight, () => b._blast(t, spot.x, spot.y, s.radius, damage * s.share, null), t);
  }
}

function aimed(b, t, now) {
  const target = b._leader();
  if (!target) return;
  rocket(b, t, target);
  t.cooldown = b._intervalOf(t, now);
}

function leading(b, t, deep = false) {
  const pick = (only) => {
    let best = null;
    for (const mob of b.mobs) {
      if (mob.dead || b.covered(mob.x, mob.y) || !deep && hidden(mob, b.time) || only && !big(mob)) continue;
      if (!best || b.ahead(mob) > b.ahead(best)) best = mob;
    }
    return best;
  };
  return t.runes.has('adjust') && pick(true) || pick(false);
}

function mortar(b, t) {
  const s = MECH.mortar, target = leading(b, t);
  if (!target) return false;
  const crit = rollCrit(b, t), time = s.flight + Math.hypot(target.x - t.cx, target.y - t.cy) * s.pace;
  const shards = t.runes.has('shrapnel');
  b._event({ kind: 'mortar', tower: t, mob: target, x: target.x, y: target.y, time, crit, shrapnel: shards });
  b._later(time, () => {
    const x = target.x, y = target.y, damage = t.damage * (crit ? t.critMul : 1);
    if (shards) {
      scatter(b, t, target, damage);
      return;
    }
    b._blast(t, x, y, s.radius, damage, null);
    if (t.runes.has('napalm')) burn(b, t, x, y, MECH.napalm.radius);
  }, t);
  return true;
}

function burn(b, t, x, y, radius) {
  const s = MECH.napalm;
  b.patches.push({ tower: t, x, y, radius, dps: t.damage * s.dps, until: b.time + s.time, born: b.time, mark: s.mark });
}

function scatter(b, t, target, damage) {
  const s = MECH.shrapnel, x = target.x, y = target.y, points = [];
  for (let k = 0; k < s.count; k++) {
    const offset = -s.spread + (k + 0.25 + b.random() * 0.5) * s.spread * 2 / s.count;
    const spot = alongRoad(b, target, offset, (b.random() * 2 - 1) * s.side);
    points.push([spot.x, spot.y]);
  }
  b._event({ kind: 'airburst', tower: t, x, y, points, time: s.fall });
  b._later(s.fall, () => {
    for (const [px, py] of points) {
      let hit = null, gap = Infinity;
      for (const mob of b._around(px, py, s.hit)) {
        const d = Math.hypot(mob.x - px, mob.y - py);
        if (d < gap) {
          gap = d;
          hit = mob;
        }
      }
      if (hit) {
        b._hurt(hit, damage * s.mul, t);
        b._torchHit(t, hit, damage * s.mul);
      }
      if (t.runes.has('napalm')) burn(b, t, px, py, s.fire);
    }
  }, t);
}

function nuke(b, t, now) {
  const s = MECH.nuke, target = leading(b, t, true);
  if (!target) return;
  t.nextNuke = now + s.every;
  t.striking = false;
  const time = s.flight + Math.hypot(target.x - t.cx, target.y - t.cy) * MECH.mortar.pace;
  b._event({ kind: 'mortar', tower: t, mob: target, x: target.x, y: target.y, time, nuke: true, radius: s.radius });
  b._later(time, () => {
    const x = target.x, y = target.y;
    b._event({ kind: 'nuke', tower: t, x, y, radius: s.radius, poison: s.poison });
    for (const mob of b.mobs.slice()) {
      if (mob.dead || !near(mob, x, y, s.radius)) continue;
      b._hurt(mob, t.damage * s.mul, t, null, false, 0, true);
      if (mob.dead) continue;
      b._hold(mob, s.stun, t);
      b._mark(mob, 'poison', t, s.poison);
    }
  }, t);
}

function lob(b, t, target, grenade, land) {
  const time = GRENADE.flight + Math.hypot(target.x - t.cx, target.y - t.cy) * GRENADE.pace;
  b._event({ kind: 'grenade', tower: t, mob: target, x: target.x, y: target.y, time, grenade });
  b._later(time, () => land(target.x, target.y));
}

function emp(b, t, now) {
  const s = MECH.emp, carriers = b.drones.filter((drone) => drone.tower === t && drone.kind !== 'air' && drone.target);
  if (carriers.length) {
    const drone = carriers[Math.floor(b.random() * carriers.length)], x = drone.x, y = drone.y;
    t.nextEmp = now + s.every;
    b._event({ kind: 'grenade', tower: t, x, y, time: s.drop, grenade: 'emp', drone });
    b._later(s.drop, () => pulse(b, t, x, y));
    return;
  }
  const target = b._target(t);
  if (!target) return;
  t.nextEmp = now + s.every;
  lob(b, t, target, 'emp', (x, y) => pulse(b, t, x, y));
}

function pulse(b, t, x, y) {
  const s = MECH.emp;
  b._event({ kind: 'emp', tower: t, x, y, radius: s.radius });
  for (const mob of b._around(x, y, s.radius)) {
    b._hold(mob, s.stun, t);
    mob.muteUntil = Math.max(mob.muteUntil, b.time + s.mute);
  }
}

function flashbang(b, t, target) {
  const s = SHOT.flash;
  lob(b, t, target, 'flash', (x, y) => {
    b._event({ kind: 'flashbang', tower: t, x, y, radius: s.radius });
    for (const mob of b._around(x, y, s.radius)) if (!mob.info.boss) b._hold(mob, s.stun, t, true);
  });
}

function sideShot(b, t, first) {
  const a = Math.atan2(first.y - t.cy, first.x - t.cx), arc = SHOT.double.arc * Math.PI / 180;
  const pool = b.mobs.filter((mob) => {
    if (mob === first || !canShoot(b, t, mob)) return false;
    let delta = Math.atan2(mob.y - t.cy, mob.x - t.cx) - a;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    return Math.abs(delta) <= arc;
  });
  pool.sort((m, n) => (big(n) ? 1 : 0) - (big(m) ? 1 : 0)
    || Math.hypot(m.x - t.cx, m.y - t.cy) - Math.hypot(n.x - t.cx, n.y - t.cy));
  return pool[0] || null;
}

function rocks(b, t, target, from = null) {
  const crit = rollCrit(b, t), hit = t.damage * (crit ? t.critMul : 1);
  const s = EARTH[t.style] && EARTH[t.style].speed ? EARTH[t.style] : EARTH.pile, start = from || { cx: t.cx, cy: t.cy };
  const flight = Math.hypot(target.x - start.cx, target.y - start.cy) / s.speed;
  const shot = { kind: 'shot', tower: t, x: target.x, y: target.y, crit, mob: target, time: flight };
  if (from) Object.assign(shot, { sx: from.cx, sy: from.cy - 0.3 });
  b._event(shot);
  b._later(flight, () => {
    if (target.dead) return;
    if (t.style !== 'serpent') {
      b._hurt(target, hit, t);
      if (t.style === 'geo' && t.runes.has('shards') && !from) shards(b, t, target, hit);
      return;
    }
    lava(b, t, target, hit / 2, 'fire');
    lava(b, t, target, hit / 2, 'earth');
    if (t.runes.has('lavaPool')) {
      const s = EARTH.pool;
      b._zone('lava', t, target.x, target.y, s.radius, s.time, { dot: t.damage * s.dot, party: null });
    }
  }, t);
}

function lava(b, t, mob, amount, element) {
  b._hurt(mob, amount, t, element);
  if (!t.runes.has('burnThrough') || mob.burnt || mob.dead) return;
  mob.burnt = true;
  mob.armor *= 1 - EARTH.burn;
}

function hydra(b, t, now) {
  if (!t.runes.has('hydra') || !b.bathes(t)) {
    t.heads = null;
    return;
  }
  const key = t.x + ',' + t.y;
  if (!t.heads || t.heads.key !== key) {
    const near = [];
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const x = t.x + dx, y = t.y + dy;
      if (!inside(x, y) || b.byCell.has(y * SIZE + x) || b.blocked.has(y * SIZE + x)) continue;
      near.push({ x, y, hot: b.molten(x, y) });
    }
    near.sort((p, q) => Number(q.hot) - Number(p.hot));
    t.heads = near.slice(0, EARTH.hydra.heads).map(({ x, y }) => ({ x, y, cx: x + 0.5, cy: y + 0.5, next: now,
      angle: 0 }));
    t.heads.key = key;
  }
  for (const head of t.heads) {
    if (now < head.next || now < t.busy) continue;
    let prey = null, best = -Infinity;
    for (const mob of b.mobs) {
      if (mob.dead || hidden(mob, now) || b.covered(mob.x, mob.y) || immune(mob, 'fire') && immune(mob, 'earth')
        || Math.hypot(mob.x - head.cx, mob.y - head.cy) > t.range) continue;
      const score = b.ahead(mob);
      if (score > best) {
        best = score;
        prey = mob;
      }
    }
    if (!prey) continue;
    head.next = now + t.interval;
    head.angle = Math.atan2(prey.x - head.cx, -(prey.y - head.cy));
    rocks(b, t, prey, head);
  }
}

function spatter(b, t, now) {
  if (!t.runes.has('spatter') || now < (t.nextSpatter || 0)) return;
  t.nextSpatter = now + PULSE;
  const s = EARTH.spatter, spots = b.vents.map((vent) => ({ cx: vent.cx, cy: vent.cy }));
  for (let at = 0; at < SIZE * SIZE; at++) {
    const x = at % SIZE, y = (at - x) / SIZE;
    if (b.molten(x, y)) spots.push({ cx: x + 0.5, cy: y + 0.5 });
  }
  for (const spot of spots) {
    if (b.random() >= s.chance) continue;
    const prey = b.mobs.filter((mob) => !mob.dead && !hidden(mob, now) && !b.covered(mob.x, mob.y)
      && Math.hypot(mob.x - spot.cx, mob.y - spot.cy) <= s.reach);
    if (!prey.length) continue;
    const mob = prey[Math.floor(b.random() * prey.length)];
    const flight = Math.hypot(mob.x - spot.cx, mob.y - spot.cy) / EARTH.serpent.speed;
    b._event({ kind: 'shot', tower: t, x: mob.x, y: mob.y, mob, time: flight, sx: spot.cx, sy: spot.cy, size: 6 });
    b._later(flight, () => {
      if (!mob.dead) lava(b, t, mob, t.damage * s.mul, 'fire');
    }, t);
  }
}

function shards(b, t, target, hit) {
  const s = EARTH.shards, near = b._around(target.x, target.y, s.reach, target);
  for (let k = 0; k < s.count && near.length; k++) {
    const mob = near.splice(Math.floor(b.random() * near.length), 1)[0];
    const flight = Math.hypot(mob.x - target.x, mob.y - target.y) / EARTH.geo.speed;
    b._event({ kind: 'shot', tower: t, x: mob.x, y: mob.y, mob, time: flight, sx: target.x, sy: target.y, size: s.size });
    b._later(flight, () => {
      if (!mob.dead) b._hurt(mob, hit, t);
    }, t);
  }
}

function geoSkills(b, t, now, alive) {
  if (!alive) return;
  if (t.runes.has('meteor') && now >= (t.nextMeteor || 0)) {
    const lead = b._target(t), s = EARTH.meteor;
    if (lead) {
      t.nextMeteor = now + s.every;
      const x = lead.x, y = lead.y;
      b._event({ kind: 'shot', tower: t, x, y, mob: null, time: s.fall, sx: x - 1.5, sy: y - 6, size: s.size });
      b._later(s.fall, () => {
        b._event({ kind: 'boom', tower: t, x, y, radius: s.radius, tone: 'earth' });
        for (const mob of b._around(x, y, s.radius)) {
          b._hurt(mob, t.damage * s.mul, t, 'earth');
          b._hold(mob, s.stun, t);
        }
      }, t);
    }
  }
  if (t.runes.has('quake') && now >= (t.nextQuake || 0)) {
    const s = EARTH.quake, all = b.mobs.filter((mob) => !mob.dead && !hidden(mob, now));
    if (all.length) {
      t.nextQuake = now + s.every;
      b._event({ kind: 'quake', tower: t });
      for (const mob of all) b._hold(mob, s.stun, t);
    }
  }
  if (t.runes.has('stones') && now >= (t.nextStones || 0)) {
    const s = EARTH.stones, prey = b.mobs.filter((mob) => b._targetable(t, mob));
    if (prey.length) {
      t.nextStones = now + s.every;
      for (const mob of prey) {
        b._event({ kind: 'shot', tower: t, x: mob.x, y: mob.y, mob, time: s.fall, sx: mob.x, sy: mob.y - 4, size: s.size });
        b._later(s.fall, () => {
          if (mob.dead) return;
          b._hurt(mob, t.damage * s.mul, t, 'earth');
          b._hold(mob, s.stun, t);
        }, t);
      }
    }
  }
}

function petrify(b, t, now) {
  const s = EARTH.petrify;
  for (const mob of b.mobs) {
    if (mob.dead || hidden(mob, now) || Math.abs(Math.floor(mob.x) - t.x) > 1 || Math.abs(Math.floor(mob.y) - t.y) > 1) continue;
    if (!mob.stoned) mob.stoned = new Set();
    if (mob.stoned.has(t) || steady(mob, now)) continue;
    mob.stoned.add(t);
    const time = (mob.info.boss ? s.boss : elite(mob) ? s.elite : s.time) * (1 - (mob.rage || 0));
    mob.stoneUntil = mob.stoneUntil > now ? mob.stoneUntil + time : now + time;
    mob.holdUntil = Math.max(mob.holdUntil, mob.stoneUntil);
    mob.holdBy = 'stone';
    b._help(t, HELP.control);
    b._event({ kind: 'hold', mob, by: 'stone' });
  }
}

const SKILLS = {
  sniper: {
    fire(b, t, now) {
      if (t.reloadUntil > now) return false;
      const target = aimOf(b, t);
      if (!target) return false;
      if (t.style === 'scope') {
        const aim = SHOT.scope.aim * (t.runes.has('steady') ? 2 : 1) / (t.runes.has('quick') ? 2 : 1);
        b._charge(t, now, 'aim', aim, target);
        return true;
      }
      if (t.style === 'assault' && t.runes.has('burstFire')) {
        volley(b, t, target, SHOT.burst, false);
        spend(b, t, now, SHOT.burst.count, target);
        return true;
      }
      shoot(b, t, target);
      const second = t.style === 'marksman' && t.runes.has('double') ? sideShot(b, t, target) : null;
      if (second) shoot(b, t, second);
      spend(b, t, now, second ? 2 : 1, target);
      return true;
    },
    charged(b, t, now, charge) {
      const target = charge.target && canShoot(b, t, charge.target) ? charge.target : aimOf(b, t);
      if (!target) return;
      shoot(b, t, target, { crit: t.runes.has('steady'), heavy: 'heavy' });
      reload(t, now, SHOT.scope.reload);
    },
  },
  forester: {
    fire(b, t, now) {
      if (t.style === 'druid' || t.reloadUntil > now) return false;
      const target = woodTarget(b, t);
      if (!target) return false;
      if (t.style === 'witch') return witchThrow(b, t, target);
      shoot(b, t, target);
      if (t.style === 'hunter') {
        throwNet(b, t, target);
        reload(t, now, WOOD.hunter.reload);
      } else reload(t, now, Math.min(WOOD.bow.reload, b._intervalOf(t, now) / 2));
      return true;
    },
    every(b, t, now, alive) {
      b._setTraps(t);
      if (t.style === 'hunter') hail(b, t, now, alive);
      if (t.style === 'witch') brew(b, t, now);
      if (t.style !== 'druid' || !t.runes.has('roots') || !alive || now < (t.nextRoots || 0)) return;
      t.nextRoots = now + PULSE;
      const s = WOOD.roots, cells = b._blazeOf(t, s.cells).cells;
      for (const mob of b.mobs.slice()) {
        if (mob.dead || hidden(mob, now) || !cells.some((cell) => near(mob, cell.x, cell.y, s.reach))) continue;
        b._slow(mob, s.slow, PULSE * 1.5);
        mob.thicketUntil = now + PULSE * 1.5;
        b._hurt(mob, t.damage * s.mul, t, 'poison', true);
        if (t.react && !mob.dead && !mob.undead) b._mark(mob, 'poison', t);
        b._snare(t, mob, t);
      }
    },
  },
  mechanic: {
    fire(b, t, now) {
      if (t.reloadUntil > now) return false;
      if (t.style === 'mortar') return mortar(b, t);
      const giant = t.style === 'turret' && t.runes.has('giant'), target = giant ? skyFirst(b, t) : b._target(t);
      if (!target) return false;
      t.lastFire = now;
      if (giant) stream(b, t, target);
      else if (t.style === 'turret') {
        volley(b, t, target, MECH.turret, true);
        spend(b, t, now, MECH.turret.count, target);
      } else if (t.style === 'demo') {
        rocket(b, t, target);
        if (t.runes.has('salvo') && b.random() < MECH.salvo.chance) {
          b._later(MECH.salvo.gap, () => {
            const next = !target.dead ? target : b._target(t);
            if (next && b.towers.includes(t)) rocket(b, t, next);
          });
        }
      } else shoot(b, t, target);
      return true;
    },
    every(b, t, now, alive) {
      if (t.lastFire === undefined) t.lastFire = now;
      if (!alive) return;
      if (t.runes.has('emp') && now >= (t.nextEmp || 0)) emp(b, t, now);
      if (t.style === 'mortar' && t.runes.has('nuke') && now >= (t.nextNuke || 0)) nuke(b, t, now);
      if (t.style === 'demo' && t.runes.has('aimed') && t.reloadUntil <= now
        && now - t.lastFire >= MECH.aimed.idle) aimed(b, t, now);
    },
  },

  thunder: {
    fire(b, t, now) {
      if (t.style === 'thor' && !hammerFree(t, now)) return false;
      const target = t.style === 'caller' ? closestPrey(b, t) : t.style === 'thor' ? farthestPrey(b, t) : b._target(t);
      if (!target) return false;
      const crit = rollCrit(b, t), hit = t.damage * (crit ? t.critMul : 1);
      if (t.style === 'caller') {
        b._event({ kind: 'chain', tower: t, mob: target });
        jolt(b, t, target, hit, new Set([target]), STORM.chain.sure);
        return true;
      }
      if (t.style === 'raiju') {
        t.lastFire = now;
        if (t.rageOn !== target) Object.assign(t, { rageOn: target, rageHits: 0 });
        else t.rageHits += 1;
        const angle = Math.atan2(target.y - t.cy, target.x - t.cx), arc = STORM.raiju.arc, bite = hit * (1 + b._packOf(t));
        b._event({ kind: 'claw', tower: t, mob: target, x: target.x, y: target.y, radius: t.range, arc, crit });
        for (const mob of b.mobs.filter((other) => b._targetable(t, other))) {
          if (mob === target || Math.abs(bend(Math.atan2(mob.y - t.cy, mob.x - t.cx), angle)) <= arc) b._hurt(mob, bite, t);
        }
        return true;
      }
      if (t.style === 'thor') {
        hurl(b, t, target, hit, crit, now);
        if (t.runes.has('twin')) {
          b._later(b._intervalOf(t, now) / 2, () => {
            const next = farthestPrey(b, t);
            if (!b.towers.includes(t) || !next || !hammerFree(t, b.time)) return;
            const again = rollCrit(b, t);
            hurl(b, t, next, t.damage * (again ? t.critMul : 1), again, b.time);
          }, t);
        }
        return true;
      }
      const flight = Math.hypot(target.x - t.cx, target.y - t.cy) / STORM.orb;
      b._event({ kind: 'shot', tower: t, x: target.x, y: target.y, crit, mob: target, time: flight });
      b._later(flight, () => {
        if (!target.dead) b._hurt(target, hit, t);
      }, t);
      return true;
    },
    every(b, t, now, alive) {
      while (b.rods.filter((rod) => rod.tower === t).length < (t.stacks.get('rod') || 0) && b._plantRod(t));
      if (t.style === 'raiju') wolf(b, t, now, alive);
      if (t.style === 'thor' && alive && t.runes.has('quake') && now >= (t.nextQuake || 0)) quake(b, t, now);
      if (t.style !== 'caller' || !alive) return;
      if (t.runes.has('globe') && now >= (t.nextGlobe || 0)) globe(b, t, now);
      if (t.runes.has('tempest') && now >= (t.nextTempest || 0)) tempest(b, t, now);
    },
  },
  pyro: {
    fire(b, t, now) {
      if (t.style === 'ignite') return false;
      const target = b._target(t);
      if (!target) return false;
      t.lastFire = now;
      if (t.style === 'dragon') return breathe(b, t, target);
      fireball(b, t, target);
      if (t.runes.has('twin')) {
        const other = b._target(t, { skip: target, mode: 'any' });
        if (other) fireball(b, t, other, null, 1);
      }
      return true;
    },
    every(b, t, now, alive) {
      if (t.lastFire === undefined) t.lastFire = now;
      if (t.style === 'ignite' && alive && now >= (t.nextIgnite || 0)) {
        t.nextIgnite = now + PULSE;
        for (const mob of b.mobs.slice()) {
          if (mob.dead || hidden(mob, now) || immune(mob, 'fire') || b.covered(mob.x, mob.y)
            || b.random() >= FIRE.ignite * (1 + FIRE.black.chance * stacksOf(mob, t))) continue;
          kindle(b, t, mob);
        }
        if (t.ring) for (const mob of b._around(t.cx, t.cy, t.ring)) scorch(b, t, mob, t.damage * FIRE.ring.mul);
        if (t.runes.has('fireWall')) {
          const cells = b._blazeOf(t).cells;
          for (const mob of b.mobs.slice()) {
            if (mob.dead || hidden(mob, now) || !cells.some((cell) => near(mob, cell.x, cell.y, FIRE.wall.reach))) {
              continue;
            }
            scorch(b, t, mob, t.damage * FIRE.wall.mul);
          }
        }
      }
      if (t.runes.has('phoenix') && alive && now >= (t.nextPhoenix || 0) && b.mobs.some((mob) => !mob.dead)) {
        t.nextPhoenix = now + FIRE.phoenix.every;
        b._sendPhoenix(t);
      }
      if (t.runes.has('rain') && alive && now >= (t.nextRain || 0)) {
        const target = b._target(t, { mode: 'any' }), s = FIRE.rain;
        if (target) {
          t.nextRain = now + s.every;
          for (let k = 0; k < s.count; k++) {
            const a = b.random() * Math.PI * 2, r = Math.sqrt(b.random()) * s.radius;
            const x = target.x + Math.cos(a) * r, y = target.y + Math.sin(a) * r;
            b._later(k * s.gap, () => fireball(b, t, { x, y, dead: true }, { x, y: y - 3 }), t);
          }
        }
      }
      if (t.runes.has('vent') && !b.vents.some((vent) => vent.tower === t)) b._openVent(t);
      erupt(b, t, now);
      if (t.style !== 'dragon' || !alive) return;
      if (t.runes.has('flight') && now - t.lastFire >= FIRE.idle && !b._target(t)) b._fly(t, now);
      if (t.runes.has('beam') && !t.charge && now >= (t.nextBeam || 0)) {
        const target = closestPrey(b, t);
        if (target) {
          t.nextBeam = now + FIRE.beam.every;
          b._charge(t, now, 'beam', FIRE.beam.charge, target);
        }
      }
    },
    charged(b, t, now, charge) {
      const target = charge.target && b._targetable(t, charge.target) ? charge.target : closestPrey(b, t);
      if (!target) return;
      t.lastFire = now;
      b._event({ kind: 'beam', tower: t, x: target.x, y: target.y, mob: target, blue: t.runes.has('blue') });
      scorch(b, t, target, t.damage * FIRE.beam.mul * t.critMul);
    },
  },
  frost: {
    fire(b, t, now) {
      if (t.style === 'hydro') return loose(b, t);
      if (t.style === 'kraken') return grab(b, t);
      const target = b._target(t);
      if (!target) return false;
      const crit = rollCrit(b, t), hit = t.damage * (crit ? t.critMul : 1);
      if (t.style === 'cryo') return icicles(b, t, target, hit, crit, now);
      const flight = Math.hypot(target.x - t.cx, target.y - t.cy) / WATER.drop;
      b._event({ kind: 'shot', tower: t, x: target.x, y: target.y, crit, mob: target, time: flight });
      b._later(flight, () => {
        if (!target.dead) b._hurt(target, hit, t);
      }, t);
      return true;
    },
    every(b, t, now, alive) {
      if (t.style === 'cryo') {
        regrow(t, now);
        if (t.runes.has('frostRing')) frostRing(b, t, now);
        const wall = b.walls.find((w) => w.tower === t && w.ice);
        if (wall && now >= wall.until) b._melt(wall, now);
        if (t.runes.has('iceWall') && alive && !wall && now >= (t.nextIceWall || 0)) b._iceWall(t, now);
      }
      if (t.style === 'kraken') {
        if (t.runes.has('ink') && alive && now >= (t.nextInk || 0)) spit(b, t, now);
        if (t.runes.has('roar') && alive) roar(b, t, now);
      }
      if (t.style !== 'hydro') return;
      if (t.runes.has('spring') && !b.springs.some((spring) => spring.tower === t)) b._plantSpring(t);
      if (t.bubble) bubble(b, t, now);
    },
  },
  priest: {
    fire(b, t) {
      const target = t.planted ? null : b._target(t);
      if (!target) return false;
      if (t.style === 'inquisitor') return holyThrow(b, t, target);
      if (t.style === 'angel' && t.runes.has('smite')) return smite(b, t, target);
      const heavy = t.style === 'monk' && t.runes.has('heavyShaft') && b.random() < HOLY.heavy.chance;
      const crit = heavy ? (t.striking = true) : rollCrit(b, t);
      if (t.style === 'angel' || t.style === 'monk') {
        b._event({ kind: 'strike', tower: t, x: target.x, y: target.y, crit, mob: target, heavy });
      } else b._event({ kind: 'shot', tower: t, x: target.x, y: target.y, crit, mob: target });
      b._hurt(target, t.damage * (crit ? t.critMul : 1), t);
      if (heavy) b._hold(target, HOLY.heavy.stun, t);
      return true;
    },
    every(b, t, now, alive) {
      if (t.style === 'angel' && t.runes.has('holyGround') && !t.planted && alive && now >= (t.nextHoly || 0)) {
        holyGround(b, t, now);
      }
    },
  },
  sorceress: {
    fire(b, t, now) {
      const target = t.songUntil > now ? null : b._target(t);
      if (!target) return false;
      const crit = rollCrit(b, t), hit = t.damage * (crit ? t.critMul : 1);
      if (t.style === 'minstrel') return chord(b, t, target, crit, hit);
      if (t.style === 'shamaness') {
        const centers = t.runes.has('resonance') ? echoes(b, t) : [{ x: t.cx, y: t.cy }];
        b._event({ kind: 'drum', tower: t, radius: t.range, crit, centers });
        for (const mob of b.mobs.slice()) {
          if (mob.dead || hidden(mob, b.time) || b.covered(mob.x, mob.y)) continue;
          if (b._targetable(t, mob) || centers.some((c, k) => k && near(mob, c.x, c.y, t.range))) b._hurt(mob, hit, t);
        }
        return true;
      }
      if (t.style === 'enchantress') return t.beam ? false : conjure(b, t, target, crit, hit);
      b._event({ kind: 'shot', tower: t, x: target.x, y: target.y, crit, mob: target, time: SPELL.wisp });
      b._later(SPELL.wisp, () => {
        if (!target.dead) b._hurt(target, hit, t);
      }, t);
      return true;
    },
    every(b, t, now, alive) {
      if (t.style === 'minstrel') sing(b, t, now, alive);
      if (t.style === 'enchantress') {
        focus(b, t, now, alive);
        downpour(b, t, now, alive);
      }
    },
  },
  earth: {
    fire(b, t) {
      const target = b._target(t);
      if (!target) return false;
      rocks(b, t, target);
      return true;
    },
    every(b, t, now, alive) {
      if (t.style === 'keeper') {
        const wall = b.walls.find((w) => w.tower === t), max = b._wallMax(t);
        if (!wall && now >= t.nextWall) b._raiseWall(t, now);
        if (wall && wall.max !== max) {
          Object.assign(wall, { hp: wall.hp * max / wall.max, max, steel: t.runes.has('steelWall') });
        }
        if (wall && wall.hp < wall.max && now - wall.hitAt >= EARTH.wall.heal) wall.hp = wall.max;
      }
      if (t.style === 'serpent') {
        hydra(b, t, now);
        spatter(b, t, now);
      }
      if (t.style === 'geo') geoSkills(b, t, now, alive);
      if (t.runes.has('terraform')) b._mound(t);
      if (t.runes.has('petrify') && alive) petrify(b, t, now);
    },
  },
};
