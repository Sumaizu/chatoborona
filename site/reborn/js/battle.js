import { SIZE, inside, pathCells, reach } from './field.js';
import { AFFIXES, BIOME_RULES, BOSSES, DIABLO, ELITES, FAMILIES, FINALE, LIVES, LOOKS, MIGHT, MIMIC, MOBS, POWERS,
  SILVER, SLIMES, STAT, TERRAIN, WAVE, eliteCount, familyPool, levelOf, lookOf, resistOf, silverChance, waveHp,
  waveSpawns } from './balance.js';
import { CLASS_BY_ID, PERKS, RUNE_CAPS, baseOf, mastery, mightOf, scaled } from './classes.js';
import { ASSIST_COINS, KILL_COINS } from './gacha.js';

export const MOVE_PAUSE = 1;
export const BITE_TIME = 1;
export const STREAK_GAP = 0.6;
export const AMBUSH = 10;
export const HEADWIND = 0.2;
export const THORN = { chance: 0.03, below: 0.3 };
export const DISCHARGE = { mul: 18, hold: 5 };
export const ROT = { share: 0.01, boss: 0.003, time: 5 };
export const PLAGUE = 0.25;
export const BRITTLE = 0.005;
export const PLANTED = { time: 3, radius: 1, push: 1 };
export const CRIMSON = 0.2;
export const SECOND = 5;

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
const TRAP_TOUCH = 0.45;
const WHIRL_REACH = 0.5;
const PIERCE_WIDTH = 0.4;
const FAR_REACH = SIZE * 1.5;
const MAD_BITE = 0.7;
const STICKY_SLOW = 0.3;
const EPIDEMIC = 1;
const COOLDOWNS = ['nextActive', 'nextBear', 'nextBlaze', 'nextBless', 'nextCheer', 'nextCleanse', 'nextCloud',
  'nextEye', 'nextFar', 'nextGale', 'nextInferno', 'nextLegion', 'nextLight', 'nextMind', 'nextMuse', 'nextPhoenix',
  'nextPool', 'nextQuake', 'nextRift', 'nextSand', 'nextStorm', 'nextSwarm', 'nextTempest', 'nextTrap', 'nextTsunami',
  'nextWall', 'nextWave'];
const TRACE_TIME = 1;
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
  frost: { name: 'Мороз', color: '#a5f3fc', slow: 0.3, time: 4, ice: 0.3 },
  discharge: { name: 'Разряд', color: '#facc15', stun: 1 },
  disease: { name: 'Болезнь', color: '#a78bfa', dot: 0.4, time: 4, armor: 0.3 },
  charge: { name: 'Заряд', color: '#fde047', bonus: 0.3, time: 4 },
  gas: { name: 'Газ', color: '#84cc16', radius: 2, time: 4, dot: 0.6 },
  ice: { name: 'Лёд', color: '#e0f2fe', time: 2, keep: 0.5 },
  thaw: { name: 'Пар', color: '#e2e8f0' },
  nuke: { name: 'Ядерный взрыв', color: '#f97316', radius: 2, mul: 15 },
  epidemic: { name: 'Эпидемия', color: '#7c3aed', dot: 0.8, time: 10, weak: 0.5 },
  overload: { name: 'Перегрузка', color: '#fef08a', mul: 6, stun: 5 },
  lava: { name: 'Лава', color: '#ef4444', radius: 1, time: 4, dot: 0.6, slow: 0.4 },
};
const PAIRS = [['fire', 'water', 'steam'], ['fire', 'lightning', 'blast'], ['fire', 'poison', 'corrosion'],
  ['water', 'earth', 'mud'], ['water', 'air', 'frost'], ['water', 'lightning', 'discharge'],
  ['earth', 'poison', 'disease'], ['air', 'lightning', 'charge']];
const BLUE_REACT = 1.5;
export const FIRE = { styled: 1.5, giant: 1.5, splash: 1, wide: 1.5, breath: 0.6, cone: 0.35, coneWide: 1.6,
  ignite: 0.06, igniteMul: 1.2, smolder: 0.3, burn: 3, blue: 1.3, blueBurn: 1.5, crit: 0.15, twin: 1,
  rain: { every: 8, count: 6, radius: 3, gap: 0.15 }, vent: { every: 3, reach: 5 }, idle: 3, soar: 7,
  beam: { every: 10, charge: 1, mul: 8 }, torch: { radius: 1, share: 0.25 },
  ring: { radius: 2, mul: 0.5, grow: 1, max: 4 },
  wall: { mul: 1.5, reach: 0.7 }, black: { chance: 1, damage: 0.2, max: 5 },
  phoenix: { every: 15, speed: 8, mul: 10, reach: 0.9, step: 0.25 } };
const TORCH_USERS = new Set(['sniper', 'gunner', 'hunter']);
export const SHOT = { scope: { mul: 5, aim: 2, reload: 3 }, assault: { range: -1, interval: 0.55, mul: 0.35,
  crit: 0.25, mag: 30, reload: 3 }, marksman: { range: 1.5, interval: 2.2, mul: 1.6, crit: 0.25, mag: 5, reload: 3 },
  gold: 2, mark: { bonus: 0.25, time: 4 }, ricochet: { share: 0.5, arc: 75, reach: 3 },
  burst: { count: 3, radius: 1, gap: 0.08 },
  flash: { every: 30, radius: 1, stun: 1.5 }, double: { arc: 30 }, air: 3 };
export const MECH = { turret: { range: -1.5, interval: 1, mul: 0.3, count: 3, gap: 0.08, radius: 1, mag: 15,
  reload: 3 }, demo: { range: 0, interval: 3, mul: 1.6, radius: 1, flight: 0.6 },
  mortar: { interval: 2.4, mul: 1.1, radius: 0.8, flight: 0.7, pace: 0.06 } };
const STEEL_BLAST = { radius: 1.5, mul: 8, stun: 1 };
const METEOR_FLIGHT = 1.2;
const FOG_FLIGHT = 0.6;
const SPIKE_TOUCH = 0.55;
const ROLL_EVERY = 1;
const MUTE_HOLD = 0.25;
const TORNADO_SHARE = 0.5;
const PULL_TIME = 0.6;
const POTION_SPLASH = 0.8;
const STONE_SPIKES = 5;
const RICOCHET = 0.5;
const ARMOR = 1;
const SHIELDS = 2;
export const OVERTIME = 120;
const OVERTIME_SPEED = 0.5;
const REVIVE_TIME = 1.5;
const CLINK_GAP = 0.25;
const RATTLE = { min: 3, spread: 3 };
const CHILL_MAX = 0.85;

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
const INFECT_HOLD = 0.25;
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
const immune = (mob, element) => Boolean(element) && mob.element === element;
const IMMUNE_GAP = 0.6;
const SPLIT_GAP = 0.3;
export const SPLIT_TIME = 0.35;
const STEAL_RANGE = 1.2;
const GHOST_CUT = 0.5;
const MIRAGE_GAP = 0.35;
const big = (mob) => mob.info.elite || mob.info.boss;
const prized = (mob) => big(mob) || Boolean(mob.silver);
const lookOfMob = (mob) => Object.values(LOOKS).flat().find((look) => look.id === mob.look) || null;
const steady = (mob, now) => mob.wild || Boolean(mob.power) && (Boolean(mob.power.firm)
  || mob.power.steady && mob.powerUntil > now);
const veiled = (mob, now) => Boolean(mob.power) && mob.power.id === 'veil' && mob.powerUntil > now;
const underground = (mob, now) => mob.underUntil > now
  || Boolean(mob.power) && mob.power.id === 'tunnel' && mob.powerUntil <= now;
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
    this.blocked = pathCells(this.road);
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
        if (UNSAFE.has(tile) && !(this.rules.ice && FROZEN.has(tile))) this.blocked.add(at);
      });
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
    this.puddles = [];
    this.fogs = [];
    this.zones = [];
    this.vents = [];
    this.phoenixes = [];
    this.pulseAt = 0;
    this.traps = [];
    this.whirls = [];
    this.grounds = [];
    this.births = [];
    this.delayed = [];
    this.prey = null;
    this.headwind = false;
    this.brittle = false;
    this.treasures = 0;
    this.rescued = false;
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

  free(x, y) {
    return inside(x, y) && !this.blocked.has(y * SIZE + x) && !this.byCell.has(y * SIZE + x)
      && !this.vents.some((vent) => vent.x === x && vent.y === y);
  }

  bestCell(range) {
    const lists = this._reach(range), guarded = new Float64Array(this.road.length);
    for (const t of this.towers) {
      if (!t.rider) for (const i of this._reach(t.range)[t.y * SIZE + t.x]) guarded[i] += 1;
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
      stunUntil: 0, webUntil: 0, perch: null,
      web: 1, windUntil: 0, wind: 0, windBy: null, rider: false, host: null, leapUntil: 0, cocoon: 0, late: false,
      waveXp: 0, aim: null, ramp: 0, streak: -1e9, lastShot: -1e9, reloadUntil: 0, hot: false, berserk: false,
      charge: null,
      nextActive: 0, nextTrap: 0, nextWall: 0, lastHit: this.time, pull: null,
      nextCheer: 0, nextCleanse: 0, nextMuse: 0, cheerUntil: 0, rallyUntil: 0, wardUntil: 0, muses: [], lift: 1,
      ownRange: 0, boost: { rate: 0, range: 0, damage: 0, crit: 0, wisdom: 0, cheer: false, muse: false },
      boostBy: new Set(),
      run: { damage: 0, kills: 0, assists: 0, xp: 0, coins: 0 },
    };
  }

  place(player, classId, x, y, mods = NO_MODS) {
    if (!this.free(x, y)) return null;
    const tower = this._tower(player, classId, x, y, mods);
    if (tower.cls.rider) tower.cocoon = tower.cls.base.cocoon;
    this.byCell.set(y * SIZE + x, tower);
    this.towers.push(tower);
    this._level(tower);
    return tower;
  }

  placeRider(player, classId, mods = NO_MODS) {
    const [x, y] = this.path[this.gate], tower = this._tower(player, classId, x, y, mods);
    tower.rider = true;
    this.towers.push(tower);
    this._level(tower);
    return tower;
  }

  _hatch(t) {
    this.byCell.delete(t.y * SIZE + t.x);
    t.cocoon = 0;
    t.rider = true;
    t.host = null;
    t.nextActive = this.time + (t.s[2] ? t.s[2].every : 0);
    this._event({ kind: 'hatch', tower: t });
  }

  covered(x, y) {
    const cx = Math.floor(x), cy = Math.floor(y);
    return Boolean(this.solid && inside(cx, cy) && this.solid[cy * SIZE + cx]);
  }

  onHill(tower) {
    return Boolean(this.tiles && !tower.rider && this.tiles[tower.y * SIZE + tower.x] === 'hill');
  }

  onWatch(tower) {
    return Boolean(this.tiles && !tower.rider && this.tiles[tower.y * SIZE + tower.x] === 'watch');
  }

  screen(t) {
    if (!this.solid || t.cls.through || this.onWatch(t)) return null;
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
    if (tower.rider || tower.cocoon || !this.free(x, y)) return false;
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
    tower.aim = null;
    tower.ramp = 0;
    this._stats(tower);
    if (this.walls.some((wall) => wall.tower === tower)) {
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
  }

  remove(tower) {
    const at = this.towers.indexOf(tower);
    if (at < 0) return;
    this.towers.splice(at, 1);
    if (!tower.rider) this.byCell.delete(tower.y * SIZE + tower.x);
    for (const list of ['walls', 'puddles', 'fogs', 'traps', 'whirls', 'patches', 'grounds',
      'zones', 'phoenixes']) {
      this[list] = this[list].filter((item) => item.tower !== tower);
    }
    if (this.prey && this.prey.by === tower) this.prey = null;
    for (const t of this.towers) if (t.perch && t.perch.tower === tower) t.perch = null;
    this._flags();
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
    this.players = players;
    for (const t of this.towers) t.feast = 0;
    this.spare = this.towers.find((t) => t.cls.id === 'healer' && !t.cocoon && open(t, 3)) || null;
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
    if (this.branch.length) {
      this.spawns.forEach((spawn, i) => {
        spawn.r = i % 2;
        if (spawn.r) spawn.at = this.spawns[i - 1].at;
      });
    }
    this.lastSpawn = this.spawns.length ? this.spawns[this.spawns.length - 1].at : start;
    for (const t of this.towers) t.waveXp = t.run.xp;
    for (const wall of this.walls) {
      const max = this._wallMax(wall.tower);
      wall.hp = max * wall.hp / wall.max;
      wall.max = max;
    }
  }

  get cleared() {
    return !this.spawns.length && !this.mobs.length && !this.births.length;
  }

  endWave() {
    this.patches = [];
    const healers = this.towers.filter((t) => t.cls.id === 'healer' && !t.cocoon);
    if (healers.length && this.lives < this.maxLives) {
      const base = healers[0].cls.base, heal = Math.min(base.healCap, base.heal * healers.length,
        this.maxLives - this.lives);
      this.lives += heal;
      this._event({ kind: 'heal', tower: healers[0], lives: heal });
    }
    const renew = healers.find((t) => open(t, 3));
    if (renew && this.lives < this.maxLives) {
      const extra = Math.min(renew.s[3].lives, this.maxLives - this.lives);
      this.lives += extra;
      this._event({ kind: 'heal', tower: renew, lives: extra });
    }
    const fighters = this.towers.filter((t) => !t.cocoon);
    const share = fighters.reduce((sum, t) => sum + t.run.xp - t.waveXp, 0) / Math.max(1, fighters.length);
    for (const t of this.towers.slice()) {
      if (!t.cocoon) continue;
      if (share > 0) this._grant(t, share);
      const [low, high] = t.cls.base.gold, coins = low + Math.floor(this.random() * (high - low + 1));
      t.player.coins += coins;
      t.run.coins += coins;
      this._event({ kind: 'cocoon', tower: t, coins });
      if (t.late) t.late = false;
      else t.cocoon -= 1;
      if (!t.cocoon) this._hatch(t);
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

  _later(delay, run) {
    this.delayed.push({ at: this.time + delay, run });
  }

  _jobs(now) {
    if (!this.delayed.some((job) => job.at <= now)) return;
    const due = this.delayed.filter((job) => job.at <= now);
    this.delayed = this.delayed.filter((job) => job.at > now);
    for (const job of due) job.run();
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
      immuneAt: 0, silver, undead: Boolean(shape && shape.undead),
      armor: Math.max(shape && shape.armor || 0, silver && silver.armor || 0),
      revive: shape && shape.revive || power && power.revive || 0, treasure: Boolean(kind && kind.treasure),
      clinkAt: 0, rattleAt: this.time + RATTLE.min, wild: this.wild, hitAt: -1e9,
      powerAt: this.time + (power && power.every ? 2 : 0), powerUntil: 0, hp: spawn.hp, max: spawn.hp, d, r, x: 0,
      skill: kind && kind.skill ? POWERS[kind.skill] : null, skillAt: this.time + (kind && kind.skill
        ? POWERS[kind.skill].first : 0), hook: null,
      y: 0, speed: WAVE.speed * info.speed * Math.max(FLOOR, 1 + this.foe.speed) * ((shape && shape.flying
        ? this.rules.air : this.rules.ground) || 1) * (1 + (silver && silver.speed || 0)), slow: 0, slowUntil: 0,
      chill: 0,
      mark: 0, markUntil: 0, vuln: 0, vulnUntil: 0, weak: 0, weakUntil: 0, weakBy: null, rush: 0, rushUntil: 0,
      charge: null, rot: null,
      muteUntil: 0, netUntil: 0,
      rollAt: this.time + ROLL_EVERY, thornAt: 0, resist: resistOf(this.wave), holdUntil: 0, holdFree: 0,
      holdBy: '', pushed: 0, poison: null, burn: null, helpers: new Set(), last: null, dead: false, biting: 0,
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
    for (const mob of this.mobs) mob.fury = 0;
    for (const mob of this.mobs) {
      if (mob.dead) continue;
      if (mob.burrow && now >= mob.burrowAt) {
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
        for (let i = 0; i < (power.count || 0); i++) this._summon(mob, power.summon, power.look, power.hp, i);
        if (power.id === 'blink' && !mob.biting) {
          const from = [mob.x, mob.y];
          mob.d = Math.min(this.length - HEART_GAP, mob.d + power.jump);
          this._locate(mob);
          this._event({ kind: 'blink', mob, x: from[0], y: from[1] });
        }
        if (power.id === 'hex' || power.id === 'swoop') this._hex(mob, power);
        if (power.id === 'ward') this._ward(mob, power);
        if (power.id === 'tunnel') this._swallow(mob, power);
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
          if (other !== mob && !other.dead && near(other, mob.x, mob.y, power.range)) other.fury = power.boost;
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
      const targets = this.towers.filter((t) => !t.rider && (!t.pull || t.pull.end <= now));
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
      if (!t.rider && d2 <= best) {
        best = d2;
        target = t;
      }
    }
    if (!target) return;
    if (this._daze(target, power.hold)) this._event({ kind: 'hex', mob, tower: target });
  }

  _wail(mob, power) {
    const dazed = this.towers.filter((t) => !t.rider && near({ x: t.cx, y: t.cy }, mob.x, mob.y, power.range)
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

  _swallow(mob, power) {
    const close = (item) => near(item, mob.x, mob.y, power.reach);
    const eaten = this.traps.filter(close).length + this.puddles.filter(close).length;
    for (const list of ['traps', 'puddles']) this[list] = this[list].filter((item) => !close(item));
    this._event({ kind: 'swallow', mob, eaten });
  }

  _breathe(mob, power) {
    let target = null, best = power.length * power.length;
    for (const t of this.towers) {
      const d2 = (t.cx - mob.x) * (t.cx - mob.x) + (t.cy - mob.y) * (t.cy - mob.y);
      if (!t.rider && d2 <= best) {
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
      if (!t.rider && burnt({ x: t.cx, y: t.cy })) this._daze(t, power.hold);
    }
    for (const list of ['traps', 'puddles']) this[list] = this[list].filter((item) => !burnt(item));
    this._event({ kind: 'breath', mob, x: mob.x + dx * power.length, y: mob.y + dy * power.length });
  }

  _web(mob, power) {
    let target = null, best = power.range * power.range;
    for (const t of this.towers) {
      const d2 = (t.cx - mob.x) * (t.cx - mob.x) + (t.cy - mob.y) * (t.cy - mob.y);
      if (!t.rider && d2 <= best) {
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
      if (t.rider || mob.robbed && mob.robbed.has(t) || !near(mob, t.cx, t.cy, STEAL_RANGE)) continue;
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
    if (tower.runes.has('epidemic')) tower.runes.add('plague');
    tower.look = mods.look || cls.id;
    tower.style = cls.styles ? (cls.styles.find((item) => tower.runes.has(item.id)) || {}).id || null : null;
    tower.react = cls.react && (cls.react.skill.startsWith('perk') ? open(tower, Number(cls.react.skill.slice(4)))
      : tower.runes.has(cls.react.skill)) ? cls.react.element : null;
    const boost = Math.max(FLOOR, 1 + (mods.damage || 0)) * tower.might / MIGHT.base;
    tower.damage = base.damage * boost;
    tower.skill = base.skill * boost;
    const shot = cls.id === 'sniper' && SHOT[tower.style] || cls.id === 'mechanic' && MECH[tower.style] || null;
    if (shot) tower.damage *= shot.mul;
    tower.interval = (shot && shot.interval || base.interval) / (Math.max(FLOOR, 1 + (mods.rate || 0))
      * (tower.runes.has('frenzy') ? 3 : 1));
    if (tower.style === 'dragon') tower.interval = PULSE / Math.max(FLOOR, 1 + (mods.rate || 0));
    tower.critChance = Math.min(STAT.critMax, base.crit + (mods.crit || 0)
      + (tower.style === 'fireball' && tower.runes.has('giant') ? FIRE.crit : 0) + (shot && shot.crit || 0));
    tower.critMul = base.critMul * (cls.id === 'sniper' && tower.runes.has('goldRounds') ? SHOT.gold : 1);
    tower.deep = tower.style === 'marksman' && tower.runes.has('sixth');
    tower.reach = base.reach;
    tower.cone = tower.style === 'dragon' ? FIRE.cone * (tower.runes.has('wide') ? FIRE.coneWide : 1) : 0;
    tower.ring = tower.style === 'ignite' && tower.runes.has('flameRing') ? Math.min(FIRE.ring.max,
      FIRE.ring.radius + FIRE.ring.grow * Math.max(0, tower.might / MIGHT.base - 1)) : 0;
    tower.baseRange = Math.max(RANGE_MIN, this._reachOf(tower, b) + (mods.range || 0))
      + (this.onHill(tower) ? TERRAIN.hill : 0) + (this.onWatch(tower) ? TERRAIN.watch : 0);
    tower.ownRange = tower.baseRange + tower.reach;
    tower.range = tower.ownRange * (1 + tower.boost.range);
    tower.lift = 1 + (tower.might / MIGHT.base - 1) * MIGHT.lift;
    this._flags();
  }

  _reachOf(tower, b) {
    if (tower.style === 'fireball') return b.range + 1 + (tower.runes.has('giant') ? 0.5 : 0);
    if (tower.style === 'dragon') return (b.range - 0.5) * (tower.runes.has('lungs') ? 2 : 1);
    if (tower.style === 'ignite') return 0;
    if (tower.style === 'scope' || tower.style === 'mortar') return FAR_REACH;
    if (tower.style === 'assault' || tower.style === 'marksman') return b.range + SHOT[tower.style].range;
    if (tower.style === 'turret' || tower.style === 'demo') return b.range + MECH[tower.style].range;
    return b.range || 0;
  }

  _flags() {
    const rune = (cls, id) => this.towers.some((t) => t.cls.id === cls && t.runes.has(id));
    this.headwind = rune('shaman', 'headwind');
    this.brittle = rune('frost', 'brittle');
  }

  _hold(mob, seconds, tower, full = false) {
    if (mob.dead || steady(mob, this.time) || !full && this.time < mob.holdFree) return;
    const time = (full ? seconds : seconds * (mob.info.boss ? BOSS_HOLD : mob.info.elite ? ELITE_HOLD : 1))
      * (1 - mob.resist);
    mob.holdUntil = Math.max(mob.holdUntil, this.time + time);
    mob.holdFree = mob.holdUntil + HOLD_GAP;
    mob.holdBy = tower ? tower.cls.id : '';
    this._event({ kind: 'hold', mob, by: mob.holdBy });
  }

  _slow(mob, amount, seconds, element = null) {
    if (immune(mob, element) || steady(mob, this.time)) return;
    amount *= this._weak(element) * (1 - mob.resist);
    if (mob.slowUntil <= this.time || amount > mob.slow) mob.slow = amount;
    mob.slowUntil = Math.max(mob.slowUntil, this.time + seconds);
  }

  _push(mob, distance, tower) {
    if (mob.info.boss || mob.dead || mob.biting || steady(mob, this.time)) return;
    const shift = Math.min(distance * (mob.info.elite ? ELITE_PUSH : 1) * (1 - mob.resist), PUSH_LIMIT - mob.pushed,
      mob.d);
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

  _poison(mob, tower, key, dps, seconds) {
    if (mob.dead || immune(mob, 'poison') || mob.undead && !tower.runes.has('plague')) return;
    if (!mob.poison) mob.poison = new Map();
    mob.poison.set(key, { tower, dps, until: this.time + seconds });
  }

  _ignite(mob, tower, dps, seconds) {
    if (mob.dead || immune(mob, 'fire')) return;
    if (!mob.burn) mob.burn = new Map();
    mob.burn.set(tower, { tower, dps, until: this.time + seconds });
  }

  _charged(t, mob) {
    if (!open(t, 0) || mob.dead) return;
    const s = t.s[0];
    if (mob.charge && mob.charge.until > this.time && mob.charge.bonus > s.bonus) {
      mob.charge.until = this.time + s.time;
      return;
    }
    mob.charge = { by: t, bonus: s.bonus, until: this.time + s.time };
  }

  _effects(dt, now) {
    for (const mob of this.mobs) mob.chill = 0;
    for (const t of this.towers) {
      if (t.cls.id !== 'frost' || !open(t, 0) || t.cocoon) continue;
      const s = t.s[0], slow = Math.min(CHILL_MAX, s.slow) * this._weak('ice');
      for (const mob of this.mobs) {
        if (mob.dead || immune(mob, 'ice') || steady(mob, now) || !near(mob, t.cx, t.cy, t.range)) continue;
        if (slow * (1 - mob.resist) > mob.chill) mob.chill = slow * (1 - mob.resist);
        this._slow(mob, Math.min(CHILL_MAX, s.slow), s.time * (t.runes.has('permafrost') ? 2 : 1), 'ice');
        mob.helpers.add(t);
      }
    }
    this.patches = this.patches.filter((patch) => patch.until > now);
    for (const patch of this.patches) {
      for (const mob of this.mobs) {
        if (!mob.dead && grounded(mob, now) && near(mob, patch.x, patch.y, patch.radius)) {
          this._hurt(mob, patch.dps * dt, patch.tower, 'fire', true);
        }
      }
    }
    if (this.phoenixes.length) this._phoenixes(now);
    if (this.zones.length) this._zones(dt, now);
    if (this.fogs.length) this._fogs(dt, now);
    if (this.puddles.length) this._puddles(dt, now);
    if (this.traps.length) this._traps(now);
    if (this.whirls.length) this._whirls(dt, now);
    if (this.grounds.length) this._grounds(dt, now);
    if (this.walls.length) this._mend(dt);
    for (const mob of this.mobs) {
      if (mob.dead) continue;
      if (mob.poison) {
        for (const [key, dose] of mob.poison) {
          if (dose.until <= now) {
            mob.poison.delete(key);
            continue;
          }
          this._hurt(mob, dose.dps * dt, dose.tower, 'poison', true);
          if (mob.dead) break;
        }
        if (!mob.dead && !mob.poison.size) mob.poison = null;
      }
      if (mob.rot && !mob.dead && mob.rot.until <= now) mob.rot = null;
      if (mob.wound && !mob.dead && mob.wound.until <= now) mob.wound = null;
      if (mob.wound && !mob.dead) this._hurt(mob, mob.wound.dps * dt, mob.wound.by, null, true, SHIELDS);
      if (mob.rot && !mob.dead) {
        const share = mob.info.boss ? ROT.boss : ROT.share;
        const rot = Math.min(mob.max * share, mob.rot.by.skill * RUNE_CAPS.rot);
        this._hurt(mob, rot * dt, mob.rot.by, null, true, SHIELDS);
      }
      if (mob.charge && !mob.dead && mob.charge.until <= now) {
        const by = mob.charge.by;
        mob.charge = null;
        if (by.runes.has('discharge') && this.towers.includes(by)) {
          this._event({ kind: 'discharge', tower: by, mob });
          this._hurt(mob, by.skill * DISCHARGE.mul, by, 'storm');
          this._hold(mob, DISCHARGE.hold, by);
        }
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
    for (const mob of this.mobs) {
      if (mob.dead) continue;
      if (mob.burn) this._burning(mob, now);
      if (!mob.dead && (mob.marks || mob.states)) this._reactions(mob, now);
      if (!mob.dead && mob.states) this._afflict(mob, now);
    }
  }

  _mark(mob, element, t) {
    if (mob.dead) return;
    if (!mob.marks) mob.marks = new Map();
    if (!mob.marks.has(element)) mob.marks.set(element, new Map());
    mob.marks.get(element).set(t, this.time + MARK_TIME);
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
      if (has('frost') || has('ice')) this._react(mob, 'thaw', [], [has('ice') ? 'ice' : 'frost']);
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
    for (const element of ['water', 'air']) {
      if (has('frost') && count(element)) strong('frost', [element], []);
      if (has('ice') && count(element)) strong('ice', [element], []);
    }
    const cold = ['ice', 'frost'].filter(has);
    if (cold.length && count('fire')) strong('thaw', ['fire'], cold);
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
    const towers = Array.from(party), lead = towers[0], blue = towers.some((t) => t.runes.has('blue'));
    const fiery = marks.includes('fire') || name === 'blast' || name === 'lava';
    const power = towers.reduce((sum, t) => sum + t.skill, 0) * (blue && fiery ? BLUE_REACT : 1);
    for (const element of marks) if (mob.marks) mob.marks.delete(element);
    if (mob.marks && !mob.marks.size) mob.marks = null;
    for (const key of states) if (mob.states) mob.states.delete(key);
    const r = REACTIONS[name], x = mob.x, y = mob.y;
    this._event({ kind: 'react', mob, name: r.name, color: blue && fiery ? '#7cc4ff' : r.color });
    const hit = (target, amount, element) => {
      target.party = towers;
      this._hurt(target, amount, lead, element, true, ARMOR);
      target.party = null;
    };
    if (name === 'steam') {
      hit(mob, power * r.fire, 'fire');
      this._setState(mob, 'steam', r.time, towers);
    } else if (name === 'thaw') {
      const degree = states.includes('ice') ? 3 : 2;
      if (degree === 3) mob.holdUntil = Math.min(mob.holdUntil, this.time);
      hit(mob, power * REACTIONS.steam.fire * degree, 'fire');
      this._setState(mob, 'steam', degree, towers);
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
    } else if (name === 'frost') {
      this._setState(mob, 'frost', r.time, towers);
      if (states.length === 0 && marks.length === 1 && this.random() < r.ice) this._freeze(mob, towers);
    } else if (name === 'ice') {
      if (this.random() < r.keep) this._freeze(mob, towers);
    } else if (name === 'discharge') {
      const charge = this.state(mob, 'charge');
      if (charge) {
        mob.states.delete('charge');
        mob.charge = null;
        const overload = REACTIONS.overload;
        this._event({ kind: 'react', mob, name: overload.name, color: overload.color });
        hit(mob, power * overload.mul, 'storm');
        if (!mob.dead) this._hold(mob, overload.stun, lead);
        return;
      }
      this._hold(mob, r.stun, lead);
    } else if (name === 'disease') {
      if (!this.state(mob, 'epidemic')) this._setState(mob, 'disease', r.time, towers, { dot: power * r.dot });
    } else if (name === 'charge') {
      this._setState(mob, 'charge', r.time, towers);
      mob.charge = { by: lead, bonus: r.bonus, until: this.time + r.time };
    } else if (name === 'gas') {
      this._zone('gas', lead, x, y, r.radius, r.time, { dot: power * r.dot, party: towers });
    } else if (name === 'epidemic') {
      this._setState(mob, 'epidemic', r.time, towers, { dot: power * r.dot });
    } else if (name === 'lava') {
      this._zone('lava', lead, x, y, r.radius, r.time, { dot: power * r.dot, party: towers });
    }
  }

  _freeze(mob, towers) {
    const ice = REACTIONS.ice;
    this._setState(mob, 'ice', ice.time, towers);
    mob.holdUntil = Math.max(mob.holdUntil, this.time + ice.time * (mob.info.boss ? BOSS_HOLD : 1));
    mob.holdBy = 'frost';
    this._event({ kind: 'react', mob, name: ice.name, color: ice.color });
  }

  _afflict(mob, now) {
    let slow = 0;
    if (this.state(mob, 'mud')) slow += REACTIONS.mud.slow;
    if (this.state(mob, 'frost')) slow += REACTIONS.frost.slow;
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
        this._event({ kind: 'zone', zone });
      }
      for (const mob of this._around(zone.x, zone.y, zone.radius)) {
        if (zone.kind === 'sand') {
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
        } else if (zone.kind === 'pool') {
          if (!mob.info.boss) mob.holdUntil = Math.max(mob.holdUntil, now + dt * 2);
          this._hurt(mob, zone.dps * dt, zone.tower, 'water', true);
        } else if (pulse) {
          this._event({ kind: 'thunderbolt', tower: zone.tower, mob, radius: 0.5 });
          this._hurt(mob, zone.damage, zone.tower, 'storm');
        }
      }
    }
  }

  _zone(kind, t, x, y, radius, time, extra) {
    this.zones.push(Object.assign({ kind, tower: t, x, y, radius, until: this.time + time, pulse: this.time }, extra));
  }

  _sweep(push) {
    for (const mob of this.mobs) {
      if (mob.dead || mob.info.boss) continue;
      mob.d = Math.max(0, mob.d - push);
      mob.biting = 0;
      this._locate(mob);
    }
  }

  _fogs(dt, now) {
    this.fogs = this.fogs.filter((fog) => fog.until > now);
    for (const fog of this.fogs) {
      for (const mob of this.mobs) {
        if (mob.dead || !near(mob, fog.x, fog.y, fog.radius)) continue;
        mob.muteUntil = Math.max(mob.muteUntil, now + MUTE_HOLD);
        this._hurt(mob, fog.dps * dt, fog.tower, 'poison', true);
      }
    }
  }

  _puddles(dt, now) {
    this.puddles = this.puddles.filter((puddle) => puddle.until > now);
    for (const puddle of this.puddles) {
      const t = puddle.tower;
      for (const mob of this.mobs) {
        if (mob.dead || !grounded(mob, now) || !near(mob, puddle.x, puddle.y, puddle.radius)) continue;
        this._hurt(mob, puddle.dps * dt, t, 'poison', true);
        if (!mob.dead && now >= mob.rollAt) {
          mob.rollAt = now + ROLL_EVERY;
          this._toxin(t, mob);
        }
      }
    }
  }

  _toxin(t, mob) {
    if (!open(t, 1) || this.random() >= t.s[1].chance) return;
    this._poison(mob, t, t, t.skill * t.s[1].dps, t.s[1].time);
  }

  _execute(mob, t, cap) {
    if (mob.hp <= cap) this._slay(mob, t);
    else this._hurt(mob, cap, t, null, true, ARMOR);
  }

  _traps(now) {
    const left = [];
    for (const trap of this.traps) {
      const victim = this.mobs.find((mob) => !mob.dead && grounded(mob, now) && near(mob, trap.x, trap.y, TRAP_TOUCH));
      if (!victim) {
        left.push(trap);
        continue;
      }
      const t = trap.tower, s = t.s[0], twice = t.runes.has('master') ? 2 : 1;
      this._event({ kind: 'snap', tower: t, x: trap.x, y: trap.y, radius: TRAP_TOUCH });
      this._hold(victim, s.hold * twice, t);
      this._vulnerable(victim, s.bonus * twice, s.hold * twice);
      victim.helpers.add(t);
    }
    this.traps = left;
  }

  _net(t, mob) {
    const s = t.s[1], twice = t.runes.has('master') ? 2 : 1, time = s.time * twice;
    this._hold(mob, time, t, true);
    this._vulnerable(mob, s.bonus * twice, time);
    mob.netUntil = this.time + time;
    this._event({ kind: 'net', tower: t, mob });
  }

  _whirls(dt, now) {
    this.whirls = this.whirls.filter((whirl) => whirl.until > now);
    for (const whirl of this.whirls) {
      whirl.d = Math.max(0, whirl.d - whirl.speed * dt);
      const t = whirl.tower, at = this._roadPoint(whirl.r, whirl.d);
      if (whirl.tornado) this._absorb(whirl, at, now);
      for (const mob of this.mobs) {
        if (mob.dead || mob.r !== whirl.r || Math.abs(mob.d - whirl.d) > WHIRL_REACH || whirl.hit.has(mob)) continue;
        whirl.hit.add(mob);
        this._hurt(mob, whirl.damage, t, null, false, ARMOR);
        for (const element of whirl.elements) {
          if (!mob.dead) this._hurt(mob, whirl.damage * TORNADO_SHARE, t, element, false, ARMOR);
        }
        if (!mob.dead && open(t, 1) && this.random() < t.s[1].chance) this._push(mob, t.s[1].push, t);
      }
    }
  }

  _absorb(whirl, at, now) {
    const touch = (item, radius) => near(item, at.x, at.y, radius + WHIRL_REACH);
    const met = this.mobs.filter((mob) => !mob.dead && touch(mob, 0));
    if (this.patches.some((patch) => touch(patch, patch.radius)) || met.some((mob) => mob.burn)) {
      whirl.elements.add('fire');
    }
    const toxic = this.puddles.concat(this.fogs);
    if (toxic.some((cloud) => touch(cloud, cloud.radius)) || met.some((mob) => mob.poison)) {
      whirl.elements.add('poison');
    }
    if (this.towers.some((t) => t.cls.id === 'frost' && open(t, 0) && !t.cocoon && near(at, t.cx, t.cy, t.range))) {
      whirl.elements.add('ice');
    }
    if (met.some((mob) => mob.charge && mob.charge.until > now)) whirl.elements.add('storm');
  }

  _walk(dt, now) {
    const stop = this.length - HEART_GAP, wind = this.headwind ? 1 - HEADWIND : 1;
    for (const mob of this.mobs) {
      if (mob.dead) continue;
      if (mob.biting) {
        if (now - mob.biting < BITE_TIME) continue;
        mob.dead = true;
        const shield = mob.fatal ? null : this._shield(mob) || this._spared();
        if (shield) {
          this._event({ kind: 'shield', mob, tower: shield });
          continue;
        }
        const lost = mob.fatal ? Math.max(0, this.lives) : mob.leak;
        this.lives -= lost;
        this.leaked += lost;
        this._event({ kind: 'leak', mob });
        if (this.lives <= 0 && !mob.fatal) this._rescue();
        continue;
      }
      mob.wall = null;
      if (mob.holdUntil > now && !steady(mob, now)) continue;
      if (mob.madUntil > now) {
        this._rave(mob, dt);
        continue;
      }
      let slow = steady(mob, now) ? 0 : Math.max(mob.slowUntil > now ? mob.slow : 0, mob.chill);
      if (mob.info.boss) slow *= BOSS_SLOW;
      let speed = mob.speed * (1 + mob.fury) * (mob.wild ? 1 + OVERTIME_SPEED : 1) * wind
        * (mob.rushUntil > now ? 1 + mob.rush : 1);
      const power = mob.muteUntil > now ? null : mob.power;
      if (power && power.boost && power.time && mob.powerUntil > now) speed *= 1 + power.boost;
      if (power && power.id === 'rage') speed *= 1 + power.boost * (1 - mob.hp / mob.max);
      let next = mob.d + speed * (1 - slow) * dt;
      if (grounded(mob, now) && !mob.wild && this.walls.length) {
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
        this._rewind();
      }
    }
  }

  _rave(mob, dt) {
    mob.d = Math.max(0, mob.d - mob.speed * dt);
    this._locate(mob);
    for (const other of this.mobs) {
      if (other !== mob && !other.dead && near(other, mob.x, mob.y, MAD_BITE)) {
        this._hurt(other, mob.mad.dps * dt, mob.mad.by, null, true);
      }
    }
  }

  _madden(mob, seconds, t, dps) {
    if (mob.dead || mob.info.boss || mob.fatal) return;
    mob.madUntil = Math.max(mob.madUntil || 0, this.time + seconds * (1 - mob.resist));
    mob.mad = { by: t, dps };
    this._event({ kind: 'mad', mob, tower: t });
  }

  _spared() {
    const t = this.spare;
    if (!t || !this.towers.includes(t)) return null;
    this.spare = null;
    return t;
  }

  _rewind() {
    const t = this.towers.find((sage) => sage.cls.id === 'sage' && !sage.looped && open(sage, 4));
    if (!t) return;
    t.looped = true;
    for (const mob of this.mobs) {
      if (mob.dead) continue;
      mob.biting = 0;
      mob.d = Math.max(0, mob.d - mob.speed * t.s[4].time);
      this._locate(mob);
    }
    this._event({ kind: 'rewind', tower: t });
  }

  _batter(wall, mob, dt, now) {
    wall.hp -= this._wallUnit() * mob.info.leak * WALL_BITE * dt;
    wall.hitAt = now;
    const t = wall.tower;
    mob.helpers.add(t);
    if (open(t, 1) && now >= mob.thornAt) {
      mob.thornAt = now + ROLL_EVERY;
      if (this.random() < t.s[1].chance) {
        this._event({ kind: 'thorns', tower: t, mob });
        this._hurt(mob, t.skill * t.s[1].bonus, t);
      }
    }
    if (wall.hp > 0) return;
    this.walls = this.walls.filter((known) => known !== wall);
    if (t.runes.has('steel')) {
      this._event({ kind: 'boom', tower: t, x: wall.x, y: wall.y, radius: STEEL_BLAST.radius });
      for (const other of this._around(wall.x, wall.y, STEEL_BLAST.radius)) {
        this._hurt(other, t.skill * STEEL_BLAST.mul, t, 'earth');
        this._hold(other, STEEL_BLAST.stun, t);
      }
    }
    t.nextWall = now + t.cls.base.rebuild;
    this._event({ kind: 'crumble', tower: t, x: wall.x, y: wall.y });
  }

  _intervalOf(t, now) {
    return t.interval * (t.webUntil > now ? t.web : 1) / ((1 + (t.windUntil > now ? t.wind : 0)) * (1 + t.ramp)
      * (1 + t.boost.rate));
  }

  _bannerOf(t) {
    return t.cls.base.banner + t.reach + (open(t, 4) ? t.s[4].wide : 0);
  }

  _circleOf(t) {
    return t.cls.base.circle + t.reach;
  }

  _buffs(now) {
    const banners = [], sages = [], winds = [], pyros = [];
    for (const t of this.towers) {
      if (t.cocoon || t.rider) continue;
      if (t.cls.id === 'banner') banners.push(t);
      else if (t.cls.id === 'sage') sages.push(t);
      else if (t.cls.id === 'shaman' && open(t, 3)) winds.push(t);
      else if (t.cls.id === 'pyro' && t.runes.has('torch')) pyros.push(t);
    }
    const close = (a, b, radius) => (a.cx - b.cx) * (a.cx - b.cx) + (a.cy - b.cy) * (a.cy - b.cy) <= radius * radius;
    const herald = banners.find((flag) => open(flag, 6)), hero = herald ? this._hero() : null;
    for (const t of this.towers) {
      const boost = t.boost, by = t.boostBy;
      let aura = null, cheer = null, rally = null, crit = 0, wisdom = 0, muse = 0, clarity = 0;
      by.clear();
      for (const flag of banners) {
        if (flag.rallyUntil > now && (!rally || flag.s[2].haste * flag.lift > rally.s[2].haste * rally.lift)) {
          rally = flag;
        }
        if (t.rider || !(flag.legionUntil > now) && !close(flag, t, this._bannerOf(flag))) continue;
        if (!aura || flag.lift > aura.lift) aura = flag;
        if (flag.cheerUntil > now && (!cheer || flag.s[0].damage * flag.lift > cheer.s[0].damage * cheer.lift)) {
          cheer = flag;
        }
        if (open(flag, 1)) crit = Math.max(crit, flag.s[1].chance);
      }
      for (const sage of sages) {
        if (!t.rider && close(sage, t, this._circleOf(sage))) {
          wisdom = Math.max(wisdom, sage.cls.base.wisdom * sage.lift);
          if (open(sage, 3) && sage !== t) clarity = Math.max(clarity, sage.s[3].haste);
        }
        sage.muses = sage.muses.filter((item) => item.until > now);
        for (const item of sage.muses) {
          if (item.tower !== t || item.bonus <= muse) continue;
          muse = item.bonus;
          by.add(sage);
        }
      }
      boost.rate = muse;
      boost.damage = muse;
      boost.range = 0;
      if (aura) {
        boost.rate += aura.cls.base.haste * aura.lift;
        boost.range = aura.cls.base.reach * aura.lift + (open(aura, 4) ? aura.s[4].range : 0);
        if (open(aura, 3)) t.wardUntil = Math.max(t.wardUntil, now + WARD_AURA);
        by.add(aura);
      }
      for (const wind of winds) {
        if (wind !== t && !t.rider && close(wind, t, wind.s[3].radius + wind.reach)) {
          boost.rate += wind.s[3].haste;
          by.add(wind);
          break;
        }
      }
      if (t.blessUntil > now) {
        boost.damage += t.bless.bonus;
        by.add(t.bless.by);
      }
      if (hero === t) {
        boost.damage += herald.s[6].bonus;
        by.add(herald);
      }
      if (cheer) {
        boost.damage += cheer.s[0].damage * cheer.lift;
        if (cheer.runes.has('crimson')) boost.rate += CRIMSON;
        by.add(cheer);
      }
      if (rally && !t.rider) {
        boost.rate += rally.s[2].haste * rally.lift;
        by.add(rally);
      }
      boost.crit = crit;
      boost.wisdom = wisdom;
      boost.clarity = clarity;
      t.torch = TORCH_USERS.has(t.cls.id) ? pyros.find((pyro) => close(pyro, t, FIRE.torch.radius + pyro.reach))
        || null : null;
      boost.cheer = Boolean(cheer);
      boost.muse = muse > 0;
      by.delete(t);
      const range = t.ownRange * (1 + boost.range);
      if (range !== t.range) t.range = range;
    }
  }

  _blazeOf(t) {
    const key = t.x + ':' + t.y;
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
    const k = main ? best : best - this.path.length, from = Math.max(0, Math.min(k - 1, line.length - 3));
    t.blaze = { key, cells: line.slice(from, from + 3).map(([x, y]) => ({ x: x + 0.5, y: y + 0.5 })) };
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
    const lead = this._leader((mob) => !immune(mob, t.cls.element));
    if (!lead) return;
    const cx = Math.floor(lead.x), cy = Math.floor(lead.y);
    let best = null;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = cx + dx, y = cy + dy;
        if (!this.free(x, y)) continue;
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
      if (u === t || u.cls.id !== 'sniper' || u.style !== 'assault' || !u.runes.has('support') || u.cocoon
        || u.busy > this.time || u.reloadUntil > this.time || !canShoot(this, u, target)) continue;
      shoot(this, u, target, { relay: true });
      if (target.dead) return;
    }
  }

  _torchHit(t, mob, damage) {
    const pyro = t.torch;
    if (!pyro || mob.dead || immune(mob, 'fire') || !this.towers.includes(pyro)) return;
    this._hurt(mob, damage * FIRE.torch.share * (pyro.runes.has('blue') ? FIRE.blue : 1), t, 'fire', true);
    if (pyro.react && mob.hp > 0) this._mark(mob, 'fire', pyro);
  }

  _hero() {
    let best = null;
    for (const t of this.towers) if (t.run.kills > 0 && (!best || t.run.kills > best.run.kills)) best = t;
    return best;
  }

  _daze(t, seconds) {
    if (t.wardUntil > this.time) return false;
    t.busy = Math.max(t.busy, this.time + seconds);
    t.stunUntil = Math.max(t.stunUntil, this.time + seconds);
    return true;
  }

  _cleanse(t, now) {
    const s = t.s[1], radius = s.radius + t.reach;
    t.nextCleanse = now + s.every;
    const freed = [];
    for (const ally of this.towers) {
      if (ally.rider || (ally.cx - t.cx) ** 2 + (ally.cy - t.cy) ** 2 > radius * radius) continue;
      if (ally.stunUntil > now || ally.napUntil > now) ally.busy = Math.min(ally.busy, now);
      if (ally.stunUntil > now || ally.napUntil > now || ally.webUntil > now) freed.push(ally);
      ally.stunUntil = Math.min(ally.stunUntil, now);
      ally.napUntil = Math.min(ally.napUntil, now);
      ally.webUntil = Math.min(ally.webUntil, now);
      ally.wardUntil = now + s.time;
    }
    this._event({ kind: 'cleanse', tower: t, radius, freed });
  }

  _hallow(t, now) {
    const s = t.s[2];
    let best = null, most = 0;
    for (const mob of this.mobs) {
      if (mob.dead || !grounded(mob, now) || this.covered(mob.x, mob.y)) continue;
      let count = 0;
      for (const other of this.mobs) {
        if (!other.dead && grounded(other, now) && near(other, mob.x, mob.y, s.radius)) count++;
      }
      if (count > most) {
        most = count;
        best = mob;
      }
    }
    if (!best) return;
    t.nextActive = now + s.every;
    this.grounds.push({ tower: t, x: best.x, y: best.y, radius: s.radius, until: now + s.time, born: now,
      dps: t.skill * s.dps, vuln: s.vuln * t.lift });
    this._event({ kind: 'hallow', tower: t, x: best.x, y: best.y, radius: s.radius, time: s.time });
  }

  _grounds(dt, now) {
    this.grounds = this.grounds.filter((ground) => ground.until > now);
    for (const ground of this.grounds) {
      for (const mob of this.mobs) {
        if (mob.dead || mob.flying || underground(mob, now) || !near(mob, ground.x, ground.y, ground.radius)) continue;
        this._vulnerable(mob, ground.vuln, 0.25);
        mob.helpers.add(ground.tower);
        if (mob.undead) this._hurt(mob, ground.dps * dt, ground.tower, 'holy', true);
      }
    }
  }

  _mend(dt) {
    for (const t of this.towers) {
      if (t.cls.id !== 'healer' || t.cocoon) continue;
      for (const wall of this.walls) {
        if (wall.hp < wall.max && near(wall, t.cx, t.cy, t.range)) {
          wall.hp = Math.min(wall.max, wall.hp + wall.max * t.cls.base.mend * dt);
        }
      }
    }
  }

  _bless(t, now) {
    const s = t.s[4], radius = s.radius + t.reach;
    const pool = this.towers.filter((ally) => ally !== t && !ally.rider && !ally.cocoon && !(ally.blessUntil > now)
      && (ally.cx - t.cx) ** 2 + (ally.cy - t.cy) ** 2 <= radius * radius);
    if (!pool.length) return;
    t.nextBless = now + s.every;
    const ally = pool[Math.floor(this.random() * pool.length)];
    ally.blessUntil = now + s.time;
    ally.bless = { by: t, bonus: s.bonus * t.lift };
    this._event({ kind: 'muse', tower: t, ally, flash: false });
  }

  _inspire(t, now) {
    const s = t.s[0], radius = this._circleOf(t);
    t.nextMuse = now + s.every;
    const taken = new Set(t.muses.map((item) => item.tower));
    const pool = this.towers.filter((ally) => ally !== t && !ally.rider && !ally.cocoon && !taken.has(ally)
      && (ally.cx - t.cx) ** 2 + (ally.cy - t.cy) ** 2 <= radius * radius);
    for (let n = t.runes.has('pupil') ? 2 : 1; n > 0 && pool.length; n--) {
      const ally = pool.splice(Math.floor(this.random() * pool.length), 1)[0];
      t.muses.push({ tower: ally, until: now + s.time, bonus: s.bonus * t.lift });
      const flash = open(t, 1) && this.random() < t.s[1].chance;
      if (flash) ally.nextActive = Math.min(ally.nextActive, now);
      this._event({ kind: 'muse', tower: t, ally, flash });
    }
  }

  _expose(t, now) {
    const s = t.s[2];
    const living = this.mobs.filter((mob) => !mob.dead && !mob.fake && !hidden(mob, now));
    if (!living.length) return;
    living.sort((a, b) => (prized(b) ? 1 : 0) - (prized(a) ? 1 : 0) || (b.info.boss ? 1 : 0) - (a.info.boss ? 1 : 0)
      || b.hp - a.hp);
    t.nextActive = now + s.every;
    for (const mob of living.slice(0, t.runes.has('omniscience') ? 3 : 1)) {
      mob.weak = s.vuln * t.lift;
      mob.weakUntil = now + s.time;
      mob.weakBy = t;
      mob.helpers.add(t);
      this._event({ kind: 'expose', tower: t, mob, time: s.time });
    }
  }

  _shoot(dt, now) {
    const alive = this.mobs.some((m) => !m.dead);
    for (const t of this.towers) {
      if (t.rider) this._ride(t, now);
      if (t.boost.clarity) {
        for (const key of COOLDOWNS) if (t[key] > now) t[key] -= dt * t.boost.clarity;
      }
      if (t.cocoon && t.cls.id === 'parasite' && open(t, 3)) {
        for (const mob of this._around(t.cx, t.cy, t.s[3].radius)) this._slow(mob, t.s[3].slow, STICKY_SLOW);
      }
      if (t.cocoon || t.busy > now) continue;
      const skill = SKILLS[t.cls.id];
      if (skill.every) skill.every(this, t, now, alive);
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
      let shots = 0;
      while (t.cooldown <= 0 && shots < SHOTS_PER_TICK) {
        if (!this._fire(t, now)) {
          t.cooldown = 0;
          break;
        }
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

  _ride(t, now) {
    if (t.perch) {
      if (t.perch.until > now && this.towers.includes(t.perch.tower)) {
        t.cx = t.perch.tower.cx;
        t.cy = t.perch.tower.cy;
        return;
      }
      t.perch = null;
    }
    if (t.host && !t.host.dead) {
      if (now >= t.leapUntil) {
        t.cx = t.host.x;
        t.cy = t.host.y;
        if (open(t, 1)) {
          this._vulnerable(t.host, t.s[1].vuln, INFECT_HOLD);
          t.host.helpers.add(t);
        }
      }
      return;
    }
    t.host = null;
    const taken = new Set(this.towers.filter((other) => other.rider && other.host && !other.host.dead)
      .map((other) => other.host));
    let best = null;
    for (const mob of this.mobs) {
      if (mob.dead || taken.has(mob) || this.covered(mob.x, mob.y)) continue;
      if (!best || mob.hp > best.hp) best = mob;
    }
    if (!best) return;
    t.host = best;
    t.leapUntil = now + t.cls.base.leap;
    this._event({ kind: 'leap', tower: t, mob: best, x: t.cx, y: t.cy });
  }

  _wallSpot(t) {
    const taken = new Set(this.walls.map((w) => w.i));
    let best = null, gap = Infinity;
    this.road.forEach(([x, y], i) => {
      const { r, d } = this._spot(i);
      if (taken.has(i) || d < WALL_MARGIN || !r && d > this.length - HEART_GAP - WALL_MARGIN) return;
      const far = (x + 0.5 - t.cx) ** 2 + (y + 0.5 - t.cy) ** 2;
      if (far < gap) {
        gap = far;
        best = i;
      }
    });
    return best;
  }

  _wallUnit() {
    return this._waveHp('normal', this.players || this.towers.length || 1);
  }

  _wallMax(t) {
    return this._wallUnit() * t.s[0].wall * (t.runes.has('steel') ? 3 : 1);
  }

  _raiseWall(t, now) {
    t.nextWall = now + 1;
    const i = this._wallSpot(t);
    if (i === null) return;
    const [x, y] = this.road[i], hp = this._wallMax(t), { r, d } = this._spot(i);
    this.walls.push({ tower: t, i, r, d, x: x + 0.5, y: y + 0.5, hp, max: hp, hitAt: -1e9,
      steel: t.runes.has('steel') });
    this._event({ kind: 'wall', tower: t, x: x + 0.5, y: y + 0.5 });
  }

  _spot(i) {
    return i < this.path.length ? { r: 0, d: i + 1 } : { r: 1, d: i - this.path.length + 1 };
  }

  _setTrap(t) {
    const cap = t.s[0].count * (t.runes.has('master') ? 2 : 1);
    const own = this.traps.filter((trap) => trap.tower === t);
    if (own.length >= cap) this.traps.splice(this.traps.indexOf(own[0]), 1);
    const taken = new Set(this.traps.map((trap) => trap.i));
    const cells = this._reach(t.range)[t.y * SIZE + t.x].filter((i) => !taken.has(i) && i > 0);
    if (!cells.length) return;
    const i = cells[Math.floor(this.random() * cells.length)], { r, d } = this._spot(i), at = this._roadPoint(r, d);
    this.traps.push({ tower: t, i, x: at.x, y: at.y });
    this._event({ kind: 'trap', tower: t, x: at.x, y: at.y });
  }

  _roadPoint(r, d) {
    const point = { r, d, x: 0, y: 0 };
    this._onRoute(point);
    return point;
  }

  _targetable(t, mob, range = t.range, mode = t.cls.base.target) {
    if (mob.dead || hidden(mob, this.time) || immune(mob, t.cls.element) || !near(mob, t.cx, t.cy, range)
      || !this.sees(t, mob)) return false;
    if (mode === 'potion' && (mob.flying || mob.undead && !t.runes.has('plague'))) return false;
    if (mode === 'land' && mob.flying) return false;
    return true;
  }

  facing(t) {
    if (t.aim && this._targetable(t, t.aim)) return t.aim;
    if (t.style === 'mortar') return this._leader();
    return t.cls.id === 'sniper' ? aimOf(this, t) : this._target(t);
  }

  _target(t, { skip = null, range = t.range, mode = t.cls.base.target } = {}) {
    if (t.rider) {
      const host = t.host;
      return host && !host.dead && this.time >= t.leapUntil && !this.covered(host.x, host.y) ? host : null;
    }
    const prey = this.prey && this.prey.until > this.time ? this.prey.mob : null;
    if (prey && prey !== skip && this._targetable(t, prey, range, mode)) return prey;
    let best = null, bestScore = -Infinity;
    for (const mob of this.mobs) {
      if (mob === skip || !this._targetable(t, mob, range, mode)) continue;
      let score = this.ahead(mob);
      if (mode === 'strongest') score = mob.hp;
      else if (mode === 'bigFirst' && prized(mob)) score += big(mob) ? 2e6 : 1e6;
      else if (mode === 'small' && prized(mob)) score -= 1e6;
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
      if (mob.dead || !prized(mob) || hidden(mob, this.time) || this.covered(mob.x, mob.y)) continue;
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

  _hurt(mob, amount, t, element = t.cls.element || null, dot = false, pierce = 0) {
    if (mob.dead || amount <= 0 || underground(mob, this.time) && !t.deep) return;
    if (!dot && !t.rider && !t.cls.through && this.covered(mob.x, mob.y)) return;
    const now = this.time;
    if (element === 'poison') {
      if (mob.undead && !t.runes.has('plague')) return;
      if (t.runes.has('plague')) {
        amount *= 1 + PLAGUE;
        pierce = SHIELDS;
      }
    }
    amount *= this._weak(element);
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
    if (power && power.id === 'mirror' && mob.powerUntil > now && !dot && !t.rider && !guard) {
      mob.powerUntil = 0;
      this._daze(t, power.hold);
      this._event({ kind: 'reflect', mob, tower: t });
      return;
    }
    const vulnerable = ((mob.markUntil > now ? mob.mark : 0) + (mob.charge && mob.charge.until > now
      ? mob.charge.bonus : 0) + (mob.vulnUntil > now ? mob.vuln : 0) + (mob.weakUntil > now ? mob.weak : 0))
      * (1 - mob.resist);
    let dealt = amount * (1 + vulnerable) * (1 + t.boost.damage) * this._frailty(mob, element)
      * (1 + FIRE.black.damage * stacksOf(mob, t));
    const cut = Math.max(power && power.cut || 0, mob.armor) - (mob.acidUntil > now ? mob.acid : 0)
      - (this.state(mob, 'disease') ? REACTIONS.disease.armor : 0);
    if (cut && !pierce) dealt *= 1 - cut;
    if (mob.front && !dot && !t.rider && !pierce && this._facing(mob, t)) dealt *= 1 - mob.front;
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
    t.run.damage += Math.min(dealt, mob.hp);
    mob.hp -= dealt;
    if (!dot) mob.hitAt = now;
    mob.helpers.add(t);
    if (mob.party) for (const ally of mob.party) mob.helpers.add(ally);
    if (!dot && t.react && mob.hp > 0) this._mark(mob, t.react, t);
    if (t.windBy && t.windUntil > now && t.windBy !== t) mob.helpers.add(t.windBy);
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
    if (!dot && this.brittle && mob.holdUntil > now && mob.holdBy === 'frost' && this.random() < BRITTLE) {
      this._event({ kind: 'shatter', mob });
      this._execute(mob, t, t.skill * RUNE_CAPS.shatter);
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
    if (killer && killer.cls.id === 'parasite' && open(killer, 4)) {
      killer.feast = (killer.feast || 0) + killer.s[4].bonus;
    }
    if (mob.poison) this._alchemy(mob);
    const insight = mob.weakUntil > this.time && mob.weakBy && open(mob.weakBy, 2) ? mob.weakBy.s[2].xp : 1;
    const prize = mob.silver ? SILVER.xp : 1, purse = mob.silver ? SILVER.coins : 1;
    const killers = new Set(mob.party || [killer]);
    for (const t of mob.helpers) {
      const earn = t.cls.earn || NO_EARN;
      this._grant(t, mob.info.xp * earn.xp * insight * prize);
      const coins = (killers.has(t) ? KILL_COINS : ASSIST_COINS) * mob.info.coins * earn.coins * purse
        * Math.max(0, 1 + (t.mods.coins || 0));
      t.player.coins += coins;
      t.run.coins += coins;
      if (killers.has(t)) {
        t.run.kills += 1;
        t.player.kills += 1;
      } else {
        t.run.assists += 1;
        t.player.assists += 1;
      }
    }
    this._event({ kind: 'kill', mob, by: killer });
    if (this.prey && this.prey.mob === mob) this._bounty();
    if (mob.stolen && killer) {
      killer.player.coins += mob.stolen;
      killer.run.coins += mob.stolen;
      this._event({ kind: 'loot', mob, tower: killer, coins: mob.stolen });
    }
    if (mob.cargo) this._unload(mob, true);
    if (mob.silver && mob.silver.burst) {
      this._event({ kind: 'boom', x: mob.x, y: mob.y, radius: SILVER.burst });
      for (const t of this.towers) {
        if (!t.rider && near({ x: t.cx, y: t.cy }, mob.x, mob.y, SILVER.burst)) this._daze(t, SILVER.daze);
      }
    }
    if (mob.silver && mob.silver.split) {
      for (const shift of [-0.3, 0.3]) {
        this.births.push({ spawn: { type: mob.type, look: lookOfMob(mob), hp: mob.max * SILVER.split / SILVER.hp },
          d: Math.max(0, mob.d + shift), r: mob.r, at: this.time });
      }
    }
    if (mob.power && mob.power.brood) {
      const hp = this._waveHp('swarm') * mob.power.hp;
      for (let i = 0; i < mob.power.brood; i++) {
        this.births.push({ spawn: { type: 'swarm', look: lookOf('spiderling'), hp }, d: Math.max(0, mob.d - i * 0.2),
          r: mob.r, at: this.time });
      }
    }
    if (mob.revive > 0 && !(killer && killer.cls.id === 'healer' && mob.undead)) {
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
    const pieces = mob.power && mob.power.id === 'split' ? 3 : mob.slime > 1 ? mob.slime - 1 : 0;
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

  _alchemy(mob) {
    const seen = new Set();
    for (const dose of mob.poison.values()) {
      const t = dose.tower;
      if (seen.has(t) || t.cls.id !== 'alchemist' || !this.towers.includes(t)) continue;
      seen.add(t);
      if (open(t, 5) && this.random() < t.s[5].chance) {
        for (const ally of this.towers) {
          ally.player.coins += t.s[5].coins;
          ally.run.coins += t.s[5].coins;
        }
        this._event({ kind: 'gold', mob, tower: t, coins: t.s[5].coins });
      }
      if (!t.runes.has('epidemic')) continue;
      for (const other of this._around(mob.x, mob.y, EPIDEMIC, mob)) {
        this._poison(other, t, t, t.skill * t.s[1].dps, t.s[1].time);
      }
    }
  }

  _shield(mob) {
    let best = null;
    for (const t of this.towers) {
      if (t.cls.id !== 'healer' || t.cocoon || !open(t, 0) || mob.info.boss && !t.runes.has('guardian')) continue;
      if (!best || guard(t) > guard(best)) best = t;
    }
    return best && this.random() < guard(best) ? best : null;
  }

  _rescue() {
    if (this.rescued) return;
    const savior = this.towers.find((t) => t.cls.id === 'healer' && !t.cocoon && t.runes.has('second'));
    if (!savior) return;
    this.rescued = true;
    this.lives = SECOND;
    const wiped = this.mobs.filter((mob) => !mob.dead);
    for (const mob of wiped) {
      mob.dead = true;
      mob.hp = 0;
    }
    this.spawns = [];
    this.births = [];
    this._event({ kind: 'rescue', tower: savior, lives: SECOND, wiped });
  }

  _bounty() {
    const prey = this.prey;
    this.prey = null;
    if (this.time - prey.at > prey.window || !this.towers.includes(prey.by)) return;
    for (const t of this.towers) {
      const coins = Math.round(t === prey.by ? prey.bounty : prey.bounty / 2);
      t.player.coins += coins;
      t.run.coins += coins;
    }
    this._event({ kind: 'bounty', tower: prey.by, mob: prey.mob, coins: Math.round(prey.bounty) });
  }

  reward(t, xp) {
    this._grant(t, xp);
  }

  _grant(t, xp) {
    const amount = xp * Math.max(0, 1 + (t.mods.xp || 0)) * (1 + t.boost.wisdom);
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
      if (mob !== skip && !mob.dead && near(mob, x, y, radius)) this._hurt(mob, damage, t, null, false, pierce);
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

  _heist(t, victim, now) {
    const s = t.s[2], coins = Math.floor(victim.player.coins);
    victim.player.coins -= coins;
    t.perch = { tower: victim, until: now + s.nap };
    t.busy = Math.max(t.busy, now + s.nap);
    t.napUntil = now + s.nap;
    victim.busy = Math.max(victim.busy, now + s.sleep);
    victim.napUntil = Math.max(victim.napUntil, now + s.sleep);
    this._event({ kind: 'heist', tower: t, victim, coins });
    return coins;
  }

  _share(t, coins) {
    const all = this.towers.slice();
    const weights = all.map(() => this.random()), sum = weights.reduce((total, w) => total + w, 0) || 1;
    let left = coins;
    const shares = all.map((other, i) => {
      const part = i === all.length - 1 ? left : Math.min(left, Math.floor(coins * weights[i] / sum));
      left -= part;
      other.player.coins += part;
      return { tower: other, coins: part };
    });
    this._event({ kind: 'share', tower: t, coins, shares });
  }

  _ambush(t, now) {
    t.lastHit = now;
    const leader = this._leader();
    const cell = leader ? this._hookCell(leader, t) : null;
    if (!cell || cell.x === t.x && cell.y === t.y) return;
    const fx = t.cx, fy = t.cy;
    this._relocate(t, cell.x, cell.y);
    t.pull = { fx, fy, start: now, end: now + PULL_TIME };
    t.busy = Math.max(t.busy, now + PULL_TIME);
    this._event({ kind: 'ambush', tower: t, mob: leader });
  }
}

const guard = (t) => t.s[0].chance * (t.runes.has('guardian') ? 2 : 1);

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
    if (radius) b._event({ kind: 'boom', tower: t, x, y, radius, blue: t.runes.has('blue') });
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

function closestPrey(b, t) {
  const prey = b.mobs.filter((mob) => b._targetable(t, mob));
  prey.sort((a, c) => (big(c) ? 1 : 0) - (big(a) ? 1 : 0)
    || Math.hypot(a.x - t.cx, a.y - t.cy) - Math.hypot(c.x - t.cx, c.y - t.cy));
  return prey[0] || null;
}

const monster = (t, mob) => (open(t, 4) && big(mob) ? 1 + t.s[4].bonus : 1);

const rollCrit = (b, t) => b.random() < 1 - (1 - t.critChance) * (1 - t.boost.crit);

const canShoot = (b, t, mob, range = t.range) => !mob.dead && !immune(mob, t.cls.element)
  && !b.covered(mob.x, mob.y) && (t.deep || !hidden(mob, b.time)) && near(mob, t.cx, t.cy, range)
  && (t.style === 'scope' || b.sees(t, mob));

function aimOf(b, t) {
  if (!t.style) return b._target(t);
  const air = t.style === 'marksman' && t.runes.has('antiair');
  let best = null, rank = -Infinity;
  for (const mob of b.mobs) {
    if (!canShoot(b, t, mob) || t.style === 'scope' && !prized(mob)) continue;
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
  t.reloadSpan = time;
}

function behind(b, t, target, ux, uy) {
  const s = SHOT.ricochet, cos = Math.cos(s.arc * Math.PI / 180);
  const pool = b.mobs.filter((mob) => {
    if (mob === target || mob.dead || immune(mob, t.cls.element) || b.covered(mob.x, mob.y)) return false;
    if (!t.deep && hidden(mob, b.time)) return false;
    const dx = mob.x - target.x, dy = mob.y - target.y, far = Math.hypot(dx, dy);
    return far > 0 && far <= s.reach && (dx * ux + dy * uy) / far >= cos;
  });
  return pool.length ? pool[Math.floor(b.random() * pool.length)] : null;
}

function shoot(b, t, target, { mul = 1, crit = false, heavy = '', from = null, relay = false } = {}) {
  const head = crit || rollCrit(b, t), damage = t.damage * mul * (head ? t.critMul : 1);
  const ox = from ? from.x : t.cx, oy = from ? from.y : t.cy, tx = target.x, ty = target.y;
  const length = Math.hypot(tx - ox, ty - oy) || 1, ux = (tx - ox) / length, uy = (ty - oy) / length;
  const through = !from && t.style === 'marksman' && t.runes.has('pierce');
  const reach = through ? Math.max(length, t.range) : length;
  const along = (mob) => (mob.x - ox) * ux + (mob.y - oy) * uy;
  const line = through ? b.mobs.filter((mob) => mob !== target && canShoot(b, t, mob, Infinity) && along(mob) >= 0.3
    && along(mob) <= reach && Math.abs((mob.x - ox) * uy - (mob.y - oy) * ux) <= PIERCE_WIDTH) : [];
  const event = { kind: 'shot', tower: t, x: ox + ux * reach, y: oy + uy * reach, crit: head, mob: target, heavy,
    gold: t.runes.has('goldRounds') };
  if (from) Object.assign(event, { sx: from.x, sy: from.y });
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
  const s = MECH.demo, crit = rollCrit(b, t);
  b._event({ kind: 'rocket', tower: t, mob: target, x: target.x, y: target.y, time: s.flight, crit });
  b._later(s.flight, () => b._blast(t, target.x, target.y, s.radius, t.damage * (crit ? t.critMul : 1), null));
}

function mortar(b, t) {
  const s = MECH.mortar, target = b._leader();
  if (!target) return false;
  const crit = rollCrit(b, t), time = s.flight + Math.hypot(target.x - t.cx, target.y - t.cy) * s.pace;
  b._event({ kind: 'mortar', tower: t, mob: target, x: target.x, y: target.y, time, crit });
  b._later(time, () => b._blast(t, target.x, target.y, s.radius, t.damage * (crit ? t.critMul : 1), null));
  return true;
}

function flashbang(b, t, target) {
  const s = SHOT.flash, x = target.x, y = target.y;
  b._event({ kind: 'flashbang', tower: t, x, y, radius: s.radius });
  for (const mob of b._around(x, y, s.radius)) if (!mob.info.boss) b._hold(mob, s.stun, t, true);
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

function bolt(b, t, target) {
  const crit = rollCrit(b, t), chain = t.runes.has('chain'), base = t.cls.base;
  const jumps = base.jumps + (chain ? 5 : 0), struck = new Set(), points = [[t.cx, t.cy]];
  let mob = target;
  for (let jump = 0; mob && jump <= jumps; jump++) {
    struck.add(mob);
    points.push([mob.x, mob.y]);
    const damage = t.damage * (crit ? t.critMul : 1) * (chain ? 1 : Math.max(0, 1 - base.falloff * jump));
    const x = mob.x, y = mob.y, from = b.ahead(mob);
    b._hurt(mob, damage, t);
    b._charged(t, mob);
    if (open(t, 1) && b.random() < t.s[1].chance) {
      b._event({ kind: 'flash', tower: t, x, y, radius: t.s[1].radius });
      for (const other of b._around(x, y, t.s[1].radius, mob)) {
        b._hurt(other, damage, t);
        b._charged(t, other);
      }
    }
    mob = b._nearest(x, y, base.jumpRange, struck, chain ? null : (other) => b.ahead(other) <= from);
  }
  b._event({ kind: 'chain', tower: t, points });
}

function potion(b, t, x, y, crit) {
  const radius = POTION_SPLASH, damage = t.damage * (crit ? t.critMul : 1);
  b._event({ kind: 'splash', tower: t, x, y, radius: open(t, 0) ? t.s[0].radius : radius });
  for (const mob of b._around(x, y, radius)) {
    if (mob.flying) continue;
    b._hurt(mob, damage, t);
    if (mob.dead) continue;
    b._toxin(t, mob);
    if (open(t, 3)) {
      mob.acid = t.s[3].cut;
      mob.acidUntil = b.time + t.s[3].time;
    }
    if (open(t, 4) && b.random() < t.s[4].chance) b._madden(mob, t.s[4].time, t, t.skill * t.s[4].bite);
  }
  if (open(t, 0)) {
    const s = t.s[0];
    b.puddles.push({ tower: t, x, y, radius: s.radius, until: b.time + s.time, dps: t.skill * s.dps, born: b.time });
  }
}

function spikes(b, t, target) {
  const crit = rollCrit(b, t), damage = t.damage * (crit ? t.critMul : 1), base = t.cls.base;
  const count = t.runes.has('stone') ? STONE_SPIKES : base.spikes, first = -Math.floor((count - 1) / 2);
  const points = [], hit = new Set();
  for (let k = 0; k < count; k++) points.push(b._roadPoint(target.r, Math.max(0, target.d - first - k)));
  b._event({ kind: 'spikes', tower: t, x: target.x, y: target.y, points: points.map((p) => [p.x, p.y]) });
  for (const point of points) {
    for (const mob of b._around(point.x, point.y, SPIKE_TOUCH)) {
      if (hit.has(mob) || !grounded(mob, b.time)) continue;
      hit.add(mob);
      b._hurt(mob, damage, t);
    }
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
  mechanic: {
    fire(b, t, now) {
      if (t.reloadUntil > now) return false;
      if (t.style === 'mortar') return mortar(b, t);
      const target = b._target(t);
      if (!target) return false;
      if (t.style === 'turret') {
        volley(b, t, target, MECH.turret, true);
        spend(b, t, now, MECH.turret.count, target);
      } else if (t.style === 'demo') rocket(b, t, target);
      else shoot(b, t, target);
      return true;
    },
  },
  gunner: {
    fire(b, t, now) {
      const base = t.cls.base;
      if (t.reloadUntil > now) return false;
      const keep = t.aim && b._targetable(t, t.aim) ? t.aim : null, target = keep || b._target(t);
      if (!target) {
        t.aim = null;
        t.hot = false;
        t.berserk = false;
        return false;
      }
      if (now - t.lastShot > STREAK_GAP) {
        t.streak = now;
        t.ramp = 0;
      }
      const belt = open(t, 3), rampMax = belt ? t.s[3].max : base.rampMax;
      if (target !== t.aim) {
        t.aim = target;
        if (!belt) t.ramp = 0;
      }
      t.lastShot = now;
      const firing = now - t.streak;
      if (!t.runes.has('drum') && firing >= base.burst) {
        t.reloadUntil = now + base.reload;
        t.streak = -1e9;
        t.ramp = 0;
        t.hot = false;
        t.berserk = false;
        b._event({ kind: 'reload', tower: t, time: base.reload });
        return false;
      }
      t.hot = open(t, 0) && firing >= t.s[0].after;
      const cycle = firing % base.burst, s2 = t.s[2];
      t.berserk = open(t, 2) && cycle >= s2.after && cycle < s2.after + s2.time;
      t.ramp = t.berserk ? rampMax : Math.min(rampMax, t.ramp + base.ramp);
      const crit = rollCrit(b, t), critMul = t.critMul + (t.berserk ? s2.crit : 0);
      const damage = t.damage * (t.berserk ? 1 + s2.damage : 1) * (crit ? critMul : 1);
      const fire = t.hot ? t.skill * t.s[0].fire : 0, pierce = t.hot && t.runes.has('plasma') ? SHIELDS : 0;
      b._event({ kind: 'shot', tower: t, x: target.x, y: target.y, crit, mob: target, hot: t.hot });
      const x = target.x, y = target.y;
      b._hurt(target, damage, t, null, false, pierce);
      if (fire) b._hurt(target, fire, t, 'fire', false, pierce);
      b._torchHit(t, target, damage);
      if (open(t, 4) && !target.dead) {
        const s = t.s[4];
        target.lead = Math.min(s.max, (target.leadUntil > now ? target.lead : 0) + s.slow);
        target.leadUntil = now + s.time;
        b._slow(target, target.lead, s.time);
      }
      if (open(t, 6) && !target.dead && (target.markUntil <= now || target.mark <= t.s[6].mark)) {
        target.mark = t.s[6].mark;
        target.markUntil = Math.max(target.markUntil, now + TRACE_TIME);
      }
      if (t.stormUntil > now) {
        for (const mob of b.mobs.slice()) {
          if (mob === target || mob.dead || !b._targetable(t, mob)) continue;
          b._event({ kind: 'shot', tower: t, x: mob.x, y: mob.y, crit, mob, hot: t.hot, spray: true });
          b._hurt(mob, damage * t.s[5].share, t, null, false, pierce);
        }
      }
      if (open(t, 1) && b.random() < t.s[1].chance) {
        const around = b._around(x, y, t.s[1].radius, target);
        const next = around.length ? around[Math.floor(b.random() * around.length)] : null;
        if (next) {
          const share = RICOCHET + t.s[1].bonus;
          b._event({ kind: 'ricochet', tower: t, x, y, mob: next, hot: t.hot });
          b._hurt(next, damage * share, t, null, false, pierce);
          if (fire) b._hurt(next, fire * share, t, 'fire', false, pierce);
        }
      }
      return true;
    },
    every(b, t, now, alive) {
      if (!open(t, 5) || !alive || now < (t.nextStorm || 0) || !b._target(t)) return;
      t.nextStorm = now + t.s[5].every;
      t.stormUntil = now + t.s[5].time;
    },
  },
  thunder: {
    fire(b, t) {
      const target = b._target(t);
      if (!target) return false;
      bolt(b, t, target);
      return true;
    },
    every(b, t, now, alive) {
      if (open(t, 4) && alive && now >= (t.nextCloud || 0)) {
        const lead = b._target(t), s = t.s[4];
        if (lead) {
          t.nextCloud = now + s.every;
          b._zone('cloud', t, lead.x, lead.y, s.radius, s.time, { damage: t.skill * s.bonus });
        }
      }
      if (open(t, 5) && alive && now >= (t.nextTempest || 0)) {
        t.nextTempest = now + t.s[5].every;
        t.tempestUntil = now + t.s[5].time;
        b._event({ kind: 'tempest', tower: t });
      }
      if (t.tempestUntil > now && now >= (t.nextStrike || 0)) {
        t.nextStrike = now + ZONE_PULSE;
        for (const mob of b.mobs.slice()) {
          if (mob.dead || hidden(mob, now)) continue;
          b._event({ kind: 'thunderbolt', tower: t, mob, radius: 0.5 });
          b._hurt(mob, t.skill * t.s[5].bonus, t, 'storm', false, 0);
        }
      }
      if (!open(t, 2) || !alive || now < t.nextActive) return;
      const target = b._leader();
      if (!target) return;
      const s = t.s[2], x = target.x, y = target.y;
      t.nextActive = now + s.every;
      b._event({ kind: 'thunderbolt', tower: t, x, y, radius: s.radius, mob: target });
      for (const mob of b._around(x, y, s.radius)) {
        b._hurt(mob, t.skill * s.bonus * t.critMul, t);
        if (!immune(mob, 'storm')) b._hold(mob, s.stun, t);
        b._charged(t, mob);
      }
    },
  },
  alchemist: {
    fire(b, t) {
      const target = b._target(t);
      if (!target) return false;
      const x = target.x, y = target.y, crit = rollCrit(b, t), flight = t.cls.base.flight;
      b._event({ kind: 'flask', tower: t, x, y, time: flight });
      b._later(flight, () => potion(b, t, x, y, crit), t);
      return true;
    },
    every(b, t, now, alive) {
      if (!open(t, 2) || !alive || now < t.nextActive) return;
      const target = b._target(t, { mode: 'any' });
      if (!target) return;
      const s = t.s[2], x = target.x, y = target.y;
      t.nextActive = now + s.every;
      b._event({ kind: 'fogtoss', tower: t, x, y, time: FOG_FLIGHT });
      b._later(FOG_FLIGHT, () => {
        b.fogs.push({ tower: t, x, y, radius: s.radius, until: b.time + s.time, dps: t.skill * s.dps, born: b.time });
        b._event({ kind: 'fog', tower: t, x, y, radius: s.radius });
      }, t);
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
      for (const vent of b.vents) {
        if (vent.tower !== t || now < vent.next) continue;
        const prey = b.mobs.filter((mob) => !mob.dead && !hidden(mob, now) && !immune(mob, 'fire')
          && !b.covered(mob.x, mob.y) && near(mob, vent.cx, vent.cy, FIRE.vent.reach));
        if (!prey.length) continue;
        vent.next = now + FIRE.vent.every;
        fireball(b, t, prey[Math.floor(b.random() * prey.length)], { x: vent.cx, y: vent.cy });
      }
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
  hunter: {
    fire(b, t) {
      const target = b._target(t);
      if (!target) return false;
      const crit = rollCrit(b, t), damage = t.damage * (prized(target) ? t.cls.base.big : 1) * (crit ? t.critMul : 1)
        * monster(t, target);
      t.lastHit = b.time;
      b._event({ kind: 'shot', tower: t, x: target.x, y: target.y, crit, mob: target });
      b._hurt(target, damage, t);
      b._torchHit(t, target, damage);
      if (open(t, 3) && big(target) && !target.dead) {
        const s = t.s[3], share = target.info.boss ? s.boss : s.share;
        target.wound = { by: t, until: b.time + s.time, dps: Math.min(target.max * share / s.time, t.skill * s.cap) };
      }
      if (open(t, 1) && !target.dead && b.random() < t.s[1].chance) b._net(t, target);
      return true;
    },
    every(b, t, now, alive) {
      if (open(t, 0) && now >= t.nextTrap) {
        t.nextTrap = now + t.s[0].every;
        b._setTrap(t);
      }
      if (open(t, 5) && alive && now >= (t.nextBear || 0)) {
        const target = b._toughest(t, true), s = t.s[5];
        if (target) {
          t.nextBear = now + s.every;
          b._event({ kind: 'snap', tower: t, x: target.x, y: target.y, radius: TRAP_TOUCH });
          b._hold(target, s.hold, t, true);
          b._hurt(target, t.skill * s.bonus * monster(t, target), t);
        }
      }
      if (t.runes.has('ambush') && alive && now - t.lastHit >= AMBUSH) b._ambush(t, now);
      if (!open(t, 2) || !alive || now < t.nextActive) return;
      const target = b._closestBig(t);
      if (!target) return;
      const s = t.s[2];
      t.nextActive = now + s.every;
      b.prey = { mob: target, by: t, at: now, until: now + s.time, window: s.window, bounty: s.bounty };
      b._event({ kind: 'prey', tower: t, mob: target, time: s.time });
    },
  },
  parasite: {
    fire(b, t) {
      const target = b._target(t);
      if (!target) return false;
      const crit = rollCrit(b, t);
      b._event({ kind: 'shot', tower: t, x: target.x, y: target.y, crit, mob: target });
      if (t.runes.has('thorn') && target.hp < target.max * THORN.below && b.random() < THORN.chance) {
        b._event({ kind: 'execute', mob: target, tower: t });
        b._execute(target, t, t.skill * RUNE_CAPS.thorn);
        return true;
      }
      b._hurt(target, t.damage * (crit ? t.critMul : 1) * (1 + (t.feast || 0)), t);
      if (crit && open(t, 0) && !target.dead) {
        const s = t.s[0], share = target.info.boss ? s.boss : target.info.elite ? s.elite : s.share;
        b._hold(target, s.stun, t);
        b._hurt(target, Math.min(target.max * share, t.skill * s.cap), t, null, false, ARMOR);
      }
      return true;
    },
    every(b, t, now) {
      if (open(t, 5) && now >= (t.nextSwarm || 0)) {
        const s = t.s[5], heavy = b.mobs.filter((mob) => !mob.dead && !hidden(mob, now))
          .sort((a, c) => c.hp - a.hp).slice(0, s.count);
        if (heavy.length) {
          t.nextSwarm = now + s.every;
          for (const mob of heavy) {
            b._slow(mob, s.slow, s.time);
            b._vulnerable(mob, s.vuln, s.time);
          }
          b._event({ kind: 'swarm', tower: t, mobs: heavy });
        }
      }
      if (open(t, 6) && t.host && !t.host.dead && !t.host.info.boss && now >= (t.nextMind || 0)) {
        t.nextMind = now + t.s[6].every;
        b._madden(t.host, t.s[6].time, t, t.skill * t.s[6].bite);
      }
      if (!open(t, 2) || t.cocoon || t.perch || now < t.nextActive) return;
      const s = t.s[2], rich = b.towers.filter((other) => other !== t && !other.rider && other.player.coins > s.rich);
      if (!rich.length && t.player.coins <= s.rich) return;
      t.nextActive = now + s.every;
      let loot = rich.length ? b._heist(t, rich[Math.floor(b.random() * rich.length)], now) : 0;
      const spare = Math.floor(t.player.coins) - s.rich;
      if (spare > 0) {
        t.player.coins -= spare;
        loot += spare;
      }
      if (loot > 0) b._share(t, loot);
    },
  },
  frost: {
    fire(b, t) {
      const base = t.cls.base, crit = rollCrit(b, t), long = t.runes.has('permafrost') ? 2 : 1;
      const freeze = (mob) => {
        if (open(t, 1) && !mob.dead && !immune(mob, 'ice') && b.random() < t.s[1].chance) {
          b._hold(mob, t.s[1].time * long, t);
        }
      };
      if (open(t, 0)) {
        const caught = b.mobs.filter((mob) => b._targetable(t, mob));
        if (!caught.length) return false;
        const damage = t.damage * base.storm / base.damage * (crit ? t.critMul : 1);
        b._event({ kind: 'nova', tower: t, radius: t.range });
        for (const mob of caught) {
          b._hurt(mob, damage, t, 'ice');
          freeze(mob);
        }
        return true;
      }
      const target = b._target(t);
      if (!target) return false;
      b._event({ kind: 'shot', tower: t, x: target.x, y: target.y, crit, mob: target });
      b._hurt(target, t.damage * (crit ? t.critMul : 1), t);
      freeze(target);
      return true;
    },
    every(b, t, now, alive) {
      if (open(t, 3) && alive && now >= (t.nextWave || 0)) {
        const caught = b.mobs.filter((mob) => b._targetable(t, mob));
        if (caught.length) {
          t.nextWave = now + t.s[3].every;
          b._event({ kind: 'wave', tower: t, radius: t.range });
          for (const mob of caught) b._push(mob, t.s[3].push, t);
        }
      }
      if (open(t, 4) && alive && now >= (t.nextPool || 0)) {
        const lead = b._target(t), s = t.s[4];
        if (lead) {
          t.nextPool = now + s.every;
          b._zone('pool', t, lead.x, lead.y, s.radius, s.time, { dps: t.skill * s.dps });
        }
      }
      if (open(t, 5) && alive && now >= (t.nextTsunami || 0)) {
        t.nextTsunami = now + t.s[5].every;
        b._event({ kind: 'tsunami', tower: t });
        b._sweep(t.s[5].push);
      }
      if (!open(t, 2) || !alive || now < t.nextActive) return;
      const s = t.s[2], long = t.runes.has('permafrost') ? 2 : 1;
      t.nextActive = now + s.every;
      b._event({ kind: 'snow', tower: t, time: s.time * long });
      for (const mob of b.mobs) {
        if (mob.dead || immune(mob, 'ice')) continue;
        b._slow(mob, s.slow, s.time * long, 'ice');
        mob.helpers.add(t);
        if (b.random() < s.chance) b._hold(mob, s.time * long, t);
      }
    },
  },
  shaman: {
    fire(b, t, now) {
      const target = b._target(t);
      if (!target) return false;
      const base = t.cls.base, crit = rollCrit(b, t), tornado = t.runes.has('tornado');
      b.whirls.push({ tower: t, d: target.d, r: target.r, speed: base.whirlSpeed, until: now + base.whirlTime,
        damage: t.damage * (crit ? t.critMul : 1), hit: new Set(), tornado, elements: new Set(), born: now });
      b._event({ kind: 'whirl', tower: t, mob: target, tornado });
      if (open(t, 0) && b.random() < t.s[0].chance) {
        const s = t.s[0];
        b._event({ kind: 'gust', tower: t, x: target.x, y: target.y, radius: s.radius });
        for (const mob of b._around(target.x, target.y, s.radius)) if (!big(mob)) b._push(mob, s.push, t);
      }
      return true;
    },
    every(b, t, now, alive) {
      if (open(t, 4) && alive && now >= (t.nextGale || 0)) {
        const light = b.mobs.filter((mob) => !big(mob) && b._targetable(t, mob)), s = t.s[4];
        if (light.length) {
          t.nextGale = now + s.every;
          for (const mob of light) {
            b._hold(mob, s.time, t, true);
            b._vulnerable(mob, s.vuln, s.time);
            b._event({ kind: 'lift', tower: t, mob });
          }
        }
      }
      if (open(t, 5) && alive && now >= (t.nextEye || 0)) {
        t.nextEye = now + t.s[5].every;
        b._event({ kind: 'eye', tower: t });
        b._sweep(t.s[5].push);
      }
      if (!open(t, 2) || !alive || now < t.nextActive) return;
      const s = t.s[2], radius = s.radius + t.reach;
      t.nextActive = now + s.every;
      b._event({ kind: 'wind', tower: t, radius });
      for (const ally of b.towers) {
        if (ally !== t && (ally.rider || (ally.cx - t.cx) ** 2 + (ally.cy - t.cy) ** 2 > radius * radius)) continue;
        const haste = ally === t ? s.haste * 2 : s.haste;
        if (ally.windUntil <= now || haste >= ally.wind) {
          ally.wind = haste;
          ally.windBy = t;
        }
        ally.windUntil = now + s.time;
      }
    },
  },
  banner: {
    fire(b, t) {
      const target = b._target(t);
      if (!target) return false;
      const crit = rollCrit(b, t);
      b._event({ kind: 'shot', tower: t, x: target.x, y: target.y, crit, mob: target });
      b._hurt(target, t.damage * (crit ? t.critMul : 1), t);
      return true;
    },
    every(b, t, now, alive) {
      if (!alive) return;
      if (open(t, 0) && now >= t.nextCheer) {
        const s = t.s[0];
        t.nextCheer = now + s.every;
        t.cheerUntil = now + s.time;
        b._event({ kind: 'cheer', tower: t, radius: b._bannerOf(t), time: s.time });
      }
      if (open(t, 5) && now >= (t.nextLegion || 0)) {
        t.nextLegion = now + t.s[5].every;
        t.legionUntil = now + t.s[5].time;
        b._event({ kind: 'legion', tower: t, time: t.s[5].time });
      }
      if (!open(t, 2) || now < t.nextActive) return;
      const s = t.s[2], planted = t.runes.has('planted');
      t.nextActive = now + s.every;
      t.rallyUntil = now + s.time + (planted ? PLANTED.time : 0);
      b._event({ kind: 'rally', tower: t, time: t.rallyUntil - now });
      if (planted) for (const mob of b._around(t.cx, t.cy, PLANTED.radius)) b._push(mob, PLANTED.push, t);
    },
  },
  healer: {
    fire(b, t) {
      const target = b._target(t);
      if (!target) return false;
      const crit = rollCrit(b, t);
      const damage = t.damage * (target.undead ? t.cls.base.undead : 1) * (crit ? t.critMul : 1);
      b._event({ kind: 'shot', tower: t, x: target.x, y: target.y, crit, mob: target, holy: target.undead });
      b._hurt(target, damage, t, 'holy');
      return true;
    },
    every(b, t, now, alive) {
      if (open(t, 1) && now >= t.nextCleanse && b.towers.some((ally) => !ally.rider && (ally.stunUntil > now
        || ally.napUntil > now || ally.webUntil > now) && (ally.cx - t.cx) ** 2 + (ally.cy - t.cy) ** 2
        <= (t.s[1].radius + t.reach) ** 2)) {
        b._cleanse(t, now);
      }
      if (open(t, 2) && alive && now >= t.nextActive) b._hallow(t, now);
      if (open(t, 4) && now >= (t.nextBless || 0)) b._bless(t, now);
      if (open(t, 5) && alive && now >= (t.nextLight || 0)) {
        const target = b._toughest(t), s = t.s[5];
        if (target) {
          t.nextLight = now + s.every;
          b._event({ kind: 'shot', tower: t, x: target.x, y: target.y, crit: true, mob: target, holy: true,
            heavy: 'heavy' });
          b._hurt(target, t.skill * (target.undead ? s.undead : s.bonus), t, 'holy');
          if (!target.dead) b._hold(target, s.stun, t);
        }
      }
    },
  },
  sage: {
    fire(b, t) {
      const first = b._target(t);
      if (!first) return false;
      const targets = [first], second = b._target(t, { skip: first });
      if (second && t.cls.base.sparks > 1) targets.push(second);
      for (const target of targets) {
        const crit = rollCrit(b, t);
        b._event({ kind: 'shot', tower: t, x: target.x, y: target.y, crit, mob: target });
        b._hurt(target, t.damage * (crit ? t.critMul : 1), t);
      }
      return true;
    },
    every(b, t, now, alive) {
      if (!alive) return;
      if (open(t, 0) && now >= t.nextMuse) b._inspire(t, now);
      if (open(t, 2) && now >= t.nextActive) b._expose(t, now);
      if (open(t, 5) && now >= (t.nextEnlight || 0)) {
        t.nextEnlight = now + t.s[5].every;
        for (const ally of b.towers) {
          for (const key of COOLDOWNS) if (ally[key] > now) ally[key] = now;
        }
        b._event({ kind: 'enlight', tower: t });
      }
    },
  },
  earth: {
    fire(b, t) {
      const target = b._target(t);
      if (!target) return false;
      spikes(b, t, target);
      return true;
    },
    every(b, t, now, alive) {
      if (open(t, 0) && now >= t.nextWall && !b.walls.some((wall) => wall.tower === t)) b._raiseWall(t, now);
      if (open(t, 3) && alive && now >= (t.nextQuake || 0)) {
        const caught = b.mobs.filter((mob) => grounded(mob, now) && b._targetable(t, mob));
        if (caught.length) {
          t.nextQuake = now + t.s[3].every;
          b._event({ kind: 'quake', tower: t, radius: t.range });
          for (const mob of caught) b._hold(mob, t.s[3].stun, t);
        }
      }
      if (open(t, 4) && alive && now >= (t.nextRift || 0)) {
        const lead = b._target(t), s = t.s[4];
        if (lead) {
          t.nextRift = now + s.every;
          const points = [], hit = new Set();
          for (let k = 0; k < s.count; k++) points.push(b._roadPoint(lead.r, Math.max(0, lead.d + 1 - k)));
          b._event({ kind: 'spikes', tower: t, x: lead.x, y: lead.y, points: points.map((p) => [p.x, p.y]) });
          for (const point of points) {
            for (const mob of b._around(point.x, point.y, SPIKE_TOUCH)) {
              if (hit.has(mob) || !grounded(mob, now)) continue;
              hit.add(mob);
              const share = mob.info.boss ? s.boss : mob.info.elite ? s.elite : s.share;
              b._hurt(mob, Math.min(mob.hp * share, t.skill * s.cap), t, 'earth', false, ARMOR);
            }
          }
        }
      }
      if (open(t, 5) && alive && now >= (t.nextSand || 0)) {
        const lead = b._target(t), s = t.s[5];
        if (lead) {
          const at = b._roadPoint(lead.r, lead.d + 1);
          t.nextSand = now + s.every;
          b._zone('sand', t, at.x, at.y, s.radius, s.time, { slow: s.slow });
        }
      }
      if (!open(t, 2) || !alive || now < t.nextActive) return;
      const living = b.mobs.filter((mob) => !mob.dead && !hidden(mob, now) && !b.covered(mob.x, mob.y));
      if (!living.length) return;
      const s = t.s[2], mob = living[Math.floor(b.random() * living.length)], x = mob.x, y = mob.y;
      t.nextActive = now + s.every;
      b._event({ kind: 'meteor', tower: t, x, y, radius: s.radius, time: METEOR_FLIGHT });
      b._later(METEOR_FLIGHT, () => {
        b._event({ kind: 'boom', tower: t, x, y, radius: s.radius, meteor: true });
        for (const other of b._around(x, y, s.radius)) {
          const crit = rollCrit(b, t), damage = t.skill * s.bonus * (crit ? t.critMul : 1) / 2;
          b._hurt(other, damage, t, 'earth');
          b._hurt(other, damage, t, 'fire');
          b._hold(other, s.stun, t);
        }
      }, t);
    },
  },
};
