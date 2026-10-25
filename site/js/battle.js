import { SIZE, inside, pathCells, reach } from './field.js';
import { AFFIXES, BIOME_RULES, BOSSES, ELITES, FAMILIES, LIVES, LOOKS, MIMIC, MOBS, POWERS, SILVER, SLIMES, STAT,
  TERRAIN, TOWER, WAVE, eliteCount, familyPool, levelOf, lookOf, resistOf, silverChance, waveHp, waveSpawns }
  from './balance.js';
import { CLASS_BY_ID, PERKS, RUNE_CAPS, gradeOf, masteryOf, powerOf, scaled, statsOf } from './classes.js';
import { ASSIST_COINS, KILL_COINS } from './gacha.js';

export const MOVE_PAUSE = 1;
export const BITE_TIME = 1;
export const NUKE_FLIGHT = 7;
export const STREAK_GAP = 0.6;
export const AMBUSH = 10;
export const HEADWIND = 0.2;
export const FUSION = { chance: 0.25, mul: 60, radius: 2, hold: 10, flight: 1.5 };
export const BURST = { chance: 0.05, share: 0.25, radius: 1 };
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
const MINE_TOUCH = 0.45;
const MINES_PER_CELL = 10;
const MINE_SPREAD = { along: 0.6, side: 0.24 };
const TOSS_FLIGHT = 0.6;
const TRAP_TOUCH = 0.45;
const WHIRL_REACH = 0.5;
const PIERCE_REACH = 1.4;
const PIERCE_WIDTH = 0.4;
const ECHO_DELAY = 0.3;
const ROCKET_FLIGHT = 0.6;
export const SHELL_FLIGHT = 0.25;
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
const BEND = 0.9;
const JOIN_FADE = 6;
const SOLID = new Set(['mountain', 'tunnel', 'ruin', 'stones', 'crypt']);
const UNSAFE = new Set(['mountain', 'tunnel', 'lake', 'river', 'chasm', 'ruin', 'crater', 'stones', 'bones', 'crypt']);
const FROZEN = new Set(['lake', 'river']);

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
const steady = (mob, now) => mob.wild || Boolean(mob.power) && (mob.power.id === 'steadfast'
  || mob.power.steady && mob.powerUntil > now);
const veiled = (mob, now) => Boolean(mob.power) && mob.power.id === 'veil' && mob.powerUntil > now;
const underground = (mob, now) => mob.underUntil > now
  || Boolean(mob.power) && mob.power.id === 'tunnel' && mob.powerUntil <= now;
const ghostly = (mob, now) => mob.phaseUntil > now;
const hidden = (mob, now) => veiled(mob, now) || underground(mob, now);
const grounded = (mob, now) => !mob.flying && !underground(mob, now) && !ghostly(mob, now);

const open = (t, i) => t.level >= PERKS[i];

export class Battle {
  constructor(map, { random = Math.random, lives = LIVES, quiet = false } = {}) {
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
    this.sight = null;
    if (this.tiles) {
      this.solid = new Uint8Array(SIZE * SIZE);
      this.sight = new Uint8Array(SIZE * SIZE * SIZE * SIZE);
      this.tiles.forEach((tile, at) => {
        if (SOLID.has(tile)) this.solid[at] = 1;
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
    this.mines = [];
    this.tosses = [];
    this.puddles = [];
    this.fogs = [];
    this.oils = [];
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
    return inside(x, y) && !this.blocked.has(y * SIZE + x) && !this.byCell.has(y * SIZE + x);
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
          const x = at % SIZE + 0.5, y = Math.floor(at / SIZE) + 0.5;
          lists[at] = list.filter((i) => lineClear(this.solid, x, y, this.road[i][0] + 0.5, this.road[i][1] + 0.5));
        });
      }
      this._scores.set(key, lists);
    }
    return this._scores.get(key);
  }

  _tower(player, classId, x, y, mods) {
    return {
      player, cls: CLASS_BY_ID.get(classId), x, y, cx: x + 0.5, cy: y + 0.5, level: 0, mods, s: [], runes: new Set(),
      stats: null, damage: 0, skill: 0, interval: 1, range: 0, baseRange: 0, critChance: 0, critMul: STAT.critBase,
      reach: 0, cone: 0, power: 1, luck: 1, haste: 1, cooldown: 0, busy: 0, napUntil: 0, stunUntil: 0, webUntil: 0,
      web: 1, windUntil: 0, wind: 0, windBy: null, rider: false, host: null, leapUntil: 0, cocoon: 0, perch: null,
      waveXp: 0, aim: null, ramp: 0, streak: -1e9, lastShot: -1e9, reloadUntil: 0, hot: false, berserk: false,
      charge: null,
      nextActive: 0, nextTrap: 0, nextMine: 0, nextGrenade: 0, nextWall: 0, lastHit: this.time, pull: null,
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

  sees(t, mob) {
    if (this.covered(mob.x, mob.y)) return false;
    if (!this.solid || this.onWatch(t)) return true;
    const x = Math.floor(mob.x), y = Math.floor(mob.y);
    if (!inside(x, y)) return false;
    const key = (t.y * SIZE + t.x) * SIZE * SIZE + y * SIZE + x;
    if (!this.sight[key]) this.sight[key] = lineClear(this.solid, t.cx, t.cy, x + 0.5, y + 0.5) ? 1 : 2;
    return this.sight[key] === 1;
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
    for (const list of ['walls', 'mines', 'tosses', 'puddles', 'fogs', 'oils', 'traps', 'whirls', 'patches',
      'grounds']) {
      this[list] = this[list].filter((item) => item.tower !== tower);
    }
    if (this.prey && this.prey.by === tower) this.prey = null;
    for (const t of this.towers) if (t.perch && t.perch.tower === tower) t.perch = null;
    this._flags();
  }

  get kin() {
    return this.family ? this.family.hp : 1;
  }

  planFamily(wave) {
    const open = FAMILIES.filter((family) => !family.from || family.from <= wave);
    const fresh = open.filter((family) => family !== this.family);
    const pool = fresh.length ? fresh : open;
    this.nextFamily = pool[Math.floor(this.random() * pool.length)];
    return this.nextFamily;
  }

  startWave(wave, players = this.towers.length) {
    this.wave = wave;
    this.players = players;
    const start = this.time, toughness = Math.max(FLOOR, 1 + this.foe.hp);
    const family = this.nextFamily || this.planFamily(wave);
    this.family = family;
    this.nextFamily = null;
    const pick = (list) => list[Math.floor(this.random() * list.length)];
    const elites = familyPool(family, ELITES, wave), boss = pick(familyPool(family, BOSSES, wave));
    const plan = waveSpawns(wave, family.count || 1), length = plan.length ? plan[plan.length - 1].delay : 0;
    for (let i = eliteCount(wave, this.random); i > 0; i--) plan.push({ type: 'elite', delay: this.random() * length });
    if (wave >= MIMIC.from && this.random() < MIMIC.chance) {
      plan.push({ type: 'elite', delay: this.random() * length, kind: MIMIC });
    }
    this.wild = false;
    this.spawns = plan.map((s) => {
      const spawn = { type: s.type, at: start + s.delay, hp: waveHp(wave, s.type, players) * toughness, kind: null,
        r: 0 };
      if (s.kind) {
        spawn.kind = s.kind;
        spawn.hp *= s.kind.hp || 1;
        return spawn;
      }
      spawn.hp *= family.hp;
      if (s.type === 'boss') spawn.kind = boss;
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
    const fighters = this.towers.filter((t) => !t.cocoon);
    const share = fighters.reduce((sum, t) => sum + t.run.xp - t.waveXp, 0) / Math.max(1, fighters.length);
    for (const t of this.towers.slice()) {
      if (!t.cocoon) continue;
      if (share > 0) this._grant(t, share);
      const [low, high] = t.cls.base.gold, coins = low + Math.floor(this.random() * (high - low + 1));
      t.player.coins += coins;
      t.run.coins += coins;
      this._event({ kind: 'cocoon', tower: t, coins });
      t.cocoon -= 1;
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
      fireproof: kind && kind.fireproof || 0, curlReady: 0,
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
    const child = this._spawn({ type, look, hp: waveHp(Math.max(1, this.wave), type, this.players || 1) * share
      * this.kin },
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
    const eaten = this.mines.filter(close).length + this.traps.filter(close).length + this.puddles.filter(close).length
      + this.oils.filter(close).length;
    for (const list of ['mines', 'traps', 'puddles', 'oils']) this[list] = this[list].filter((item) => !close(item));
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
    for (const list of ['mines', 'traps', 'puddles', 'oils']) this[list] = this[list].filter((item) => !burnt(item));
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
      const hp = waveHp(Math.max(1, this.wave), 'normal', this.players || 1) * mob.power.hp;
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
    const cls = tower.cls, mods = tower.mods, b = cls.base, stats = statsOf(cls, mods.stats, mods.paragon || 0);
    const mastery = masteryOf(stats.mas);
    tower.stats = stats;
    tower.power = mastery.power;
    tower.luck = mastery.luck;
    tower.haste = mastery.haste;
    tower.s = cls.skills.map((skill) => scaled(skill, mastery));
    tower.runes = new Set(mods.runes || []);
    const boost = Math.max(FLOOR, 1 + (mods.damage || 0)), power = powerOf(cls, stats);
    tower.damage = power.damage * boost;
    tower.skill = TOWER.damage * b.damage * boost * power.skill;
    tower.interval = power.interval / (Math.max(FLOOR, 1 + (mods.rate || 0)) * (tower.runes.has('frenzy') ? 3 : 1));
    tower.critChance = Math.min(STAT.critMax, power.crit + (mods.crit || 0));
    tower.critMul = power.critMul;
    tower.reach = power.reach;
    tower.cone = (b.cone || 0) * (tower.runes.has('nozzle') ? 2 : 1);
    tower.baseRange = Math.max(RANGE_MIN, (b.range || 0) + (mods.range || 0)) + (this.onHill(tower) ? TERRAIN.hill : 0)
      + (this.onWatch(tower) ? TERRAIN.watch : 0);
    tower.ownRange = tower.baseRange + tower.reach;
    tower.range = tower.ownRange * (1 + tower.boost.range);
    tower.lift = (1 + STAT.skill * stats[cls.primary]) / (1 + STAT.skill * gradeOf(cls, cls.primary));
    this._flags();
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
    if (this.oils.length) this._oils(dt, now);
    if (this.fogs.length) this._fogs(dt, now);
    if (this.puddles.length) this._puddles(dt, now);
    if (this.mines.length) this._mines(now);
    if (this.tosses.length) this._tosses(now);
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
      if (mob.burn && !mob.dead) this._burning(mob, dt, now);
      if (mob.rot && !mob.dead && mob.rot.until <= now) mob.rot = null;
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

  _burning(mob, dt, now) {
    let roll = false;
    if (now >= mob.rollAt) {
      mob.rollAt = now + ROLL_EVERY;
      roll = true;
    }
    for (const [key, fire] of mob.burn) {
      if (fire.until <= now) {
        mob.burn.delete(key);
        continue;
      }
      const t = fire.tower;
      this._hurt(mob, fire.dps * dt, t, 'fire', true);
      if (mob.dead) return;
      if (roll && open(t, 1) && this.random() < t.s[1].chance) this._flare(t, mob);
      if (mob.dead) return;
    }
    if (!mob.burn.size) mob.burn = null;
  }

  _flare(t, mob) {
    const s = t.s[1], damage = t.skill * s.bonus * (t.runes.has('blue') ? 2 : 1), x = mob.x, y = mob.y;
    this._event({ kind: 'ignite', tower: t, x, y, radius: s.radius, blue: t.runes.has('blue') });
    for (const other of this.mobs.slice()) {
      if (!other.dead && near(other, x, y, s.radius)) this._hurt(other, damage, t, 'fire');
    }
  }

  _oils(dt, now) {
    this.oils = this.oils.filter((oil) => (oil.lit ? oil.burnUntil > now : oil.until > now));
    for (const oil of this.oils) {
      const inside = (item) => near(item, oil.x, oil.y, oil.radius);
      if (!oil.lit) {
        const burning = this.mobs.some((mob) => !mob.dead && mob.burn && inside(mob))
          || this.patches.some((patch) => near(patch, oil.x, oil.y, oil.radius + patch.radius))
          || this.oils.some((other) => other.lit && near(other, oil.x, oil.y, oil.radius + other.radius));
        if (burning) this._light(oil);
        continue;
      }
      for (const mob of this.mobs) {
        if (!mob.dead && grounded(mob, now) && inside(mob)) this._hurt(mob, oil.dps * dt, oil.tower, 'fire', true);
      }
    }
  }

  _light(oil) {
    if (oil.lit) return;
    const t = oil.tower;
    oil.lit = this.time;
    oil.burnUntil = this.time + t.s[2].time * (t.runes.has('blue') ? 2 : 1);
    this._event({ kind: 'oilfire', tower: t, x: oil.x, y: oil.y, radius: oil.radius });
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

  _mines(now) {
    const left = [];
    for (const mine of this.mines) {
      const victim = this.mobs.find((mob) => !mob.dead && grounded(mob, now) && near(mob, mine.x, mine.y, MINE_TOUCH));
      if (!victim) {
        left.push(mine);
        continue;
      }
      const t = mine.tower, big = mine.kind === 'big', base = t.cls.base;
      const radius = big ? t.s[1].radius : base.touch, crit = this.random() < t.critChance;
      const damage = (big ? t.skill * t.s[1].bonus : t.damage) * base.mine * (crit ? t.critMul : 1);
      this._event({ kind: 'mine', tower: t, x: mine.x, y: mine.y, radius, mine: mine.kind });
      for (const mob of this.mobs) {
        if (!mob.dead && grounded(mob, now) && near(mob, mine.x, mine.y, radius)) this._hurt(mob, damage, t);
      }
    }
    this.mines = left;
  }

  _tosses(now) {
    for (const toss of this.tosses) {
      if (toss.mob.dead) continue;
      toss.x = toss.mob.x;
      toss.y = toss.mob.y;
    }
    const due = this.tosses.filter((toss) => toss.at <= now);
    if (!due.length) return;
    this.tosses = this.tosses.filter((toss) => toss.at > now);
    for (const toss of due) {
      const x = toss.x, y = toss.y, t = toss.tower;
      if (toss.kind === 'nuke') this._nuke(t, x, y);
      else if (toss.kind === 'fusion') this._fusion(t, x, y);
      else {
        const s = t.s[0], crit = this.random() < t.critChance;
        this._event({ kind: 'mine', tower: t, x, y, radius: s.radius, mine: 'grenade' });
        for (const other of this.mobs) {
          if (!other.dead && near(other, x, y, s.radius)) {
            this._hurt(other, t.skill * s.bonus * (crit ? t.critMul : 1), t);
          }
        }
      }
    }
  }

  _nuke(t, x, y) {
    const radius = t.s[2].radius;
    this._event({ kind: 'nuke', tower: t, x, y, radius });
    for (const mob of this.mobs.slice()) {
      if (!mob.dead && near(mob, x, y, radius)) this._execute(mob, t, t.skill * t.s[2].cap);
    }
  }

  _execute(mob, t, cap) {
    if (mob.hp <= cap) this._slay(mob, t);
    else this._hurt(mob, cap, t, null, true, ARMOR);
  }

  _fusion(t, x, y) {
    this._event({ kind: 'nuke', tower: t, x, y, radius: FUSION.radius, small: true });
    for (const mob of this.mobs.slice()) {
      if (mob.dead || !near(mob, x, y, FUSION.radius)) continue;
      this._hurt(mob, t.skill * FUSION.mul, t);
      this._hold(mob, FUSION.hold, t);
    }
    for (const tower of this.towers) {
      if (!tower.rider && near({ x: tower.cx, y: tower.cy }, x, y, FUSION.radius)) this._daze(tower, FUSION.hold);
    }
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
    if (this.patches.some((patch) => touch(patch, patch.radius)) || this.oils.some((oil) => oil.lit
      && touch(oil, oil.radius)) || met.some((mob) => mob.burn)) whirl.elements.add('fire');
    const toxic = this.puddles.concat(this.fogs);
    if (toxic.some((cloud) => touch(cloud, cloud.radius)) || met.some((mob) => mob.poison)) {
      whirl.elements.add('poison');
    }
    if (this.towers.some((t) => t.cls.id === 'frost' && !t.cocoon && near(at, t.cx, t.cy, t.range))) {
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
        const shield = this._shield(mob);
        if (shield) {
          this._event({ kind: 'shield', mob, tower: shield });
          continue;
        }
        this.lives -= mob.leak;
        this.leaked += mob.leak;
        this._event({ kind: 'leak', mob });
        if (this.lives <= 0) this._rescue();
        continue;
      }
      mob.wall = null;
      if (mob.holdUntil > now && !steady(mob, now)) continue;
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
      }
    }
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
    t.nextWall = now + t.cls.base.rebuild;
    this._event({ kind: 'crumble', tower: t, x: wall.x, y: wall.y });
  }

  _intervalOf(t, now) {
    return t.interval * (t.webUntil > now ? t.web : 1) / ((1 + (t.windUntil > now ? t.wind : 0)) * (1 + t.ramp)
      * (1 + t.boost.rate));
  }

  _bannerOf(t) {
    return t.cls.base.banner + t.reach;
  }

  _circleOf(t) {
    return t.cls.base.circle + t.reach;
  }

  _buffs(now) {
    const banners = [], sages = [];
    for (const t of this.towers) {
      if (t.cocoon || t.rider) continue;
      if (t.cls.id === 'banner') banners.push(t);
      else if (t.cls.id === 'sage') sages.push(t);
    }
    const close = (a, b, radius) => (a.cx - b.cx) * (a.cx - b.cx) + (a.cy - b.cy) * (a.cy - b.cy) <= radius * radius;
    for (const t of this.towers) {
      const boost = t.boost, by = t.boostBy;
      let aura = null, cheer = null, rally = null, crit = 0, wisdom = 0, muse = 0;
      by.clear();
      for (const flag of banners) {
        if (flag.rallyUntil > now && (!rally || flag.s[2].haste * flag.lift > rally.s[2].haste * rally.lift)) {
          rally = flag;
        }
        if (t.rider || !close(flag, t, this._bannerOf(flag))) continue;
        if (!aura || flag.lift > aura.lift) aura = flag;
        if (flag.cheerUntil > now && (!cheer || flag.s[0].damage * flag.lift > cheer.s[0].damage * cheer.lift)) {
          cheer = flag;
        }
        if (open(flag, 1)) crit = Math.max(crit, flag.s[1].chance);
      }
      for (const sage of sages) {
        if (!t.rider && close(sage, t, this._circleOf(sage))) {
          wisdom = Math.max(wisdom, sage.cls.base.wisdom * sage.lift);
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
        boost.range = aura.cls.base.reach * aura.lift;
        by.add(aura);
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
      boost.cheer = Boolean(cheer);
      boost.muse = muse > 0;
      by.delete(t);
      const range = t.ownRange * (1 + boost.range);
      if (range !== t.range) t.range = range;
    }
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
    return waveHp(Math.max(1, this.wave), 'normal', this.players || this.towers.length || 1);
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

  _plant(t, only = null) {
    const base = t.cls.base, stock = t.runes.has('stock') ? 2 : 1, cap = base.cap * stock;
    const own = this.mines.filter((mine) => mine.tower === t && mine.kind === 'mine');
    const bigs = this.mines.filter((mine) => mine.tower === t && mine.kind === 'big');
    const strong = open(t, 1) && (own.length >= cap || this.random() < t.s[1].chance);
    const range = strong ? t.s[1].range : t.range, cells = only || this._reach(range)[t.y * SIZE + t.x];
    if (!cells.length) return;
    if (strong && bigs.length >= t.s[1].cap * stock) this.mines.splice(this.mines.indexOf(bigs[0]), 1);
    if (!strong && own.length >= cap) this.mines.splice(this.mines.indexOf(own[0]), 1);
    const count = new Map();
    for (const mine of this.mines) count.set(mine.i, (count.get(mine.i) || 0) + 1);
    const fewest = Math.min(...cells.map((i) => count.get(i) || 0));
    const free = cells.filter((i) => (count.get(i) || 0) === fewest && fewest < MINES_PER_CELL);
    if (!free.length) return;
    const i = free[Math.floor(this.random() * free.length)], { r, d } = this._spot(i);
    const along = d + (this.random() - 0.5) * MINE_SPREAD.along, side = (this.random() - 0.5) * MINE_SPREAD.side;
    const at = this._roadPoint(r, along), ahead = this._roadPoint(r, along + 0.05);
    const dx = ahead.x - at.x, dy = ahead.y - at.y, length = Math.hypot(dx, dy) || 1;
    const mine = { tower: t, i, x: at.x - dy / length * side, y: at.y + dx / length * side,
      kind: strong ? 'big' : 'mine' };
    this.mines.push(mine);
    this._event({ kind: 'plant', tower: t, x: mine.x, y: mine.y, mine: mine.kind });
  }

  _targetable(t, mob, range = t.range, mode = t.cls.base.target) {
    if (mob.dead || hidden(mob, this.time) || !near(mob, t.cx, t.cy, range) || !this.sees(t, mob)) return false;
    if (mode === 'potion' && (mob.flying || mob.undead && !t.runes.has('plague'))) return false;
    if (mode === 'land' && mob.flying) return false;
    return true;
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
      if (mode === 'strongest') score = mob.hp + (t.cls.base.skyFirst && mob.flying ? 1e12 : 0);
      else if (mode === 'bigFirst' && prized(mob)) score += big(mob) ? 2e6 : 1e6;
      else if (mode === 'small' && prized(mob)) score -= 1e6;
      if (immune(mob, t.cls.element)) score -= 1e15;
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
    if (mob.dead || amount <= 0 || underground(mob, this.time)) return;
    if (!dot && !t.rider && this.covered(mob.x, mob.y)) return;
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
    let dealt = amount * (1 + vulnerable) * (1 + t.boost.damage);
    const cut = Math.max(power && power.cut || 0, mob.armor);
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
    let feast = 1;
    if (killer && killer.cls.id === 'parasite' && open(killer, 1) && this.random() < killer.s[1].chance) {
      feast = 1 + killer.s[1].bonus;
      this._event({ kind: 'feast', tower: killer, mob });
    }
    const insight = mob.weakUntil > this.time && mob.weakBy && open(mob.weakBy, 2) ? mob.weakBy.s[2].xp : 1;
    const prize = mob.silver ? SILVER.xp : 1, purse = mob.silver ? SILVER.coins : 1;
    for (const t of mob.helpers) {
      const earn = t.cls.earn || NO_EARN, bonus = t === killer ? feast : 1;
      this._grant(t, mob.info.xp * earn.xp * bonus * insight * prize);
      const coins = (t === killer ? KILL_COINS : ASSIST_COINS) * mob.info.coins * earn.coins * bonus * purse
        * Math.max(0, 1 + (t.mods.coins || 0));
      t.player.coins += coins;
      t.run.coins += coins;
      if (t === killer) {
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
      const hp = waveHp(Math.max(1, this.wave), 'swarm', this.players || 1) * mob.power.hp;
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
      const hp = waveHp(Math.max(1, this.wave), type, this.players || 1) * TERRAIN.grave * Math.max(FLOOR,
        1 + this.foe.hp);
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
        const hp = waveHp(Math.max(1, this.wave), type, this.players || 1) * Math.max(FLOOR, 1 + this.foe.hp)
          * this.kin, d = Math.max(0, mob.d + shift), spot = { d, r: mob.r, sx: 0, sy: 0, placed: false };
        this._locate(spot);
        spots.push([spot.x, spot.y]);
        this.births.push({ spawn: { type, look, hp }, d, r: mob.r, at: this.time + SPLIT_TIME });
      }
      this._event({ kind: 'split', mob, spots });
    }
  }

  _shield(mob) {
    let best = null;
    for (const t of this.towers) {
      if (t.cls.id !== 'healer' || t.cocoon || !open(t, 0) || mob.info.boss && !t.runes.has('guardian')) continue;
      if (!best || t.s[0].chance > best.s[0].chance) best = t;
    }
    return best && this.random() < best.s[0].chance ? best : null;
  }

  _rescue() {
    if (this.rescued) return;
    const savior = this.towers.find((t) => t.cls.id === 'healer' && !t.cocoon && t.runes.has('second'));
    if (!savior) return;
    this.rescued = true;
    this.lives = SECOND;
    this._event({ kind: 'rescue', tower: savior, lives: SECOND });
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

  _blast(t, x, y, radius, damage, skip) {
    this._event({ kind: 'boom', tower: t, x, y, radius });
    for (const mob of this.mobs) {
      if (mob !== skip && !mob.dead && near(mob, x, y, radius)) this._hurt(mob, damage, t);
    }
  }

  _heist(t, victim, now) {
    const s = t.s[2], coins = Math.floor(victim.player.coins);
    victim.player.coins -= coins;
    t.player.coins += coins;
    t.perch = { tower: victim, until: now + s.nap };
    t.busy = Math.max(t.busy, now + s.nap);
    t.napUntil = now + s.nap;
    victim.busy = Math.max(victim.busy, now + s.sleep);
    victim.napUntil = Math.max(victim.napUntil, now + s.sleep);
    this._event({ kind: 'heist', tower: t, victim, coins });
  }

  _share(t) {
    const coins = Math.floor(t.player.coins), all = this.towers.slice();
    const weights = all.map(() => this.random()), sum = weights.reduce((total, w) => total + w, 0) || 1;
    let left = coins;
    t.player.coins -= coins;
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

const rollCrit = (b, t) => b.random() < 1 - (1 - t.critChance) * (1 - t.boost.crit);

function snipe(b, t, target, { base = t.damage, mul = 1, crit = false, heavy = '', pierce = true } = {}) {
  const head = crit || rollCrit(b, t), damage = base * mul * (head ? t.critMul : 1);
  const dx = target.x - t.cx, dy = target.y - t.cy, length = Math.hypot(dx, dy) || 1;
  const ux = dx / length, uy = dy / length, through = pierce && open(t, 0);
  const reach = through ? Math.max(length, t.range * PIERCE_REACH) : length;
  const along = (mob) => (mob.x - t.cx) * ux + (mob.y - t.cy) * uy;
  const line = through ? b.mobs.filter((mob) => !mob.dead && mob !== target && !hidden(mob, b.time)
    && along(mob) >= 0.3 && along(mob) <= reach && Math.abs((mob.x - t.cx) * uy - (mob.y - t.cy) * ux) <= PIERCE_WIDTH)
    : [];
  const struck = [target].concat(line), power = damage * (1 + (through ? t.s[0].ramp * (struck.length - 1) : 0));
  b._event({ kind: 'shot', tower: t, x: t.cx + ux * reach, y: t.cy + uy * reach, crit: head, mob: target, heavy });
  for (const mob of struck) {
    const x = mob.x, y = mob.y;
    b._hurt(mob, power, t);
    if (t.runes.has('burst') && b.random() < BURST.chance) {
      const radius = BURST.radius * t.power;
      b._event({ kind: 'burst', tower: t, x, y, radius });
      for (const other of b._around(x, y, radius, mob)) b._hurt(other, power * BURST.share, t);
    }
  }
  return struck;
}

function explode(b, t, x, y, crit, chance) {
  const radius = t.cls.base.splash, damage = t.damage * (crit ? t.critMul : 1);
  b._blast(t, x, y, radius, damage, null);
  if (open(t, 0)) {
    const s = t.s[0], wide = t.runes.has('napalm') ? 2 : 1;
    b.patches = b.patches.filter((patch) => patch.tower !== t || !near(patch, x, y, 0.2));
    b.patches.push({ tower: t, x, y, radius: s.radius * wide, dps: t.skill * s.dps, until: b.time + s.time,
      born: b.time });
  }
  if (open(t, 1) && b.random() < chance) b._later(ECHO_DELAY, () => explode(b, t, x, y, crit, chance / 2), t);
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
    if (!mob.dead) b._toxin(t, mob);
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
      const target = b._target(t);
      if (!target) return false;
      if (open(t, 1) && b.random() < t.s[1].chance) {
        b._charge(t, now, 'heavy', t.s[1].charge, target);
        return true;
      }
      snipe(b, t, target);
      const second = t.runes.has('twin') ? b._target(t, { skip: target }) : null;
      if (second) snipe(b, t, second);
      return true;
    },
    every(b, t, now, alive) {
      if (!open(t, 2) || !alive || t.charge || now < t.nextActive) return;
      const lead = b._target(t, { mode: 'bigFirst' }), target = lead && prized(lead) ? lead : b._target(t);
      if (!target) return;
      t.nextActive = now + t.s[2].every;
      b._charge(t, now, 'aim', t.s[2].charge, target);
    },
    charged(b, t, now, charge) {
      const ready = (mob) => mob && b._targetable(t, mob, t.range * PIERCE_REACH);
      const target = ready(charge.target) ? charge.target : b._target(t);
      if (!target) return;
      if (charge.kind === 'heavy') {
        snipe(b, t, target, { base: t.skill, mul: t.s[1].bonus, crit: true, heavy: 'heavy' });
        return;
      }
      snipe(b, t, target, { base: t.skill, mul: t.s[2].bonus, crit: true, heavy: 'mega', pierce: false });
      if (target.dead) return;
      const s = t.s[2];
      if (target.markUntil <= now || s.mark >= target.mark) target.mark = s.mark;
      target.markUntil = now + s.markTime;
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
      if (target !== t.aim) {
        t.aim = target;
        t.ramp = 0;
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
      t.ramp = t.berserk ? base.rampMax : Math.min(base.rampMax, t.ramp + base.ramp);
      const crit = rollCrit(b, t), critMul = t.critMul + (t.berserk ? s2.crit : 0);
      const damage = t.damage * (t.berserk ? 1 + s2.damage : 1) * (crit ? critMul : 1);
      const fire = t.hot ? t.skill * t.s[0].fire : 0, pierce = t.hot && t.runes.has('plasma') ? SHIELDS : 0;
      b._event({ kind: 'shot', tower: t, x: target.x, y: target.y, crit, mob: target, hot: t.hot });
      const x = target.x, y = target.y;
      b._hurt(target, damage, t, null, false, pierce);
      if (fire) b._hurt(target, fire, t, 'fire', false, pierce);
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
  },
  bomber: {
    fire(b, t, now) {
      const target = b._target(t);
      if (!target) return false;
      const second = t.runes.has('cluster') ? b._target(t, { skip: target }) : null;
      for (const mob of second ? [target, second] : [target]) {
        const x = mob.x, y = mob.y, crit = rollCrit(b, t);
        b._event({ kind: 'shot', tower: t, x, y, mob, time: SHELL_FLIGHT });
        b._later(SHELL_FLIGHT, () => explode(b, t, x, y, crit, open(t, 1) ? t.s[1].chance : 0), t);
      }
      return true;
    },
    every(b, t, now, alive) {
      if (!open(t, 2) || !alive || t.charge || now < t.nextActive) return;
      const target = b._closestBig(t);
      if (!target) return;
      t.nextActive = now + t.s[2].every;
      b._charge(t, now, 'rpg', t.s[2].charge, target);
    },
    charged(b, t, now, charge) {
      const target = charge.target && !charge.target.dead ? charge.target : b._closestBig(t);
      if (!target) return;
      const s = t.s[2], crit = rollCrit(b, t);
      b._event({ kind: 'rocket', tower: t, mob: target, x: target.x, y: target.y, time: ROCKET_FLIGHT });
      b._later(ROCKET_FLIGHT, () => {
        const x = target.x, y = target.y;
        b._event({ kind: 'boom', tower: t, x, y, radius: s.radius, rocket: true });
        for (const mob of b._around(x, y, s.radius)) {
          b._hurt(mob, t.skill * s.bonus * (crit ? t.critMul : 1), t);
          b._hold(mob, s.stun, t);
        }
      }, t);
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
      const target = b._target(t);
      if (!target) return false;
      const angle = Math.atan2(target.y - t.cy, target.x - t.cx), blue = t.runes.has('blue') ? 2 : 1;
      const crit = rollCrit(b, t), damage = t.damage * blue * (crit ? t.critMul : 1), base = t.cls.base;
      const inCone = (x, y) => {
        if (!near({ x, y }, t.cx, t.cy, t.range)) return false;
        let delta = Math.atan2(y - t.cy, x - t.cx) - angle;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        return Math.abs(delta) <= t.cone;
      };
      b._event({ kind: 'flame', tower: t, angle, x: target.x, y: target.y, blue: blue > 1, cone: t.cone });
      for (const mob of b.mobs.slice()) {
        if (mob.dead || hidden(mob, now) || mob !== target && !inCone(mob.x, mob.y)) continue;
        b._hurt(mob, damage * (mob.undead ? base.undead : 1), t);
        if (open(t, 0) && !mob.dead) {
          const s = t.s[0];
          b._ignite(mob, t, t.skill * s.dps * blue, s.time * blue);
        }
      }
      for (const oil of b.oils) if (!oil.lit && oil.tower === t && inCone(oil.x, oil.y)) b._light(oil);
      return true;
    },
    every(b, t, now) {
      if (!open(t, 2) || now < t.nextActive) return;
      const cells = b._reach(t.range)[t.y * SIZE + t.x];
      if (!cells.length) return;
      const gap = (i) => (b.road[i][0] + 0.5 - t.cx) ** 2 + (b.road[i][1] + 0.5 - t.cy) ** 2;
      const least = Math.min(...cells.map(gap)), close = cells.filter((i) => gap(i) <= least + 1e-9);
      const s = t.s[2], i = close[Math.floor(b.random() * close.length)], { r, d } = b._spot(i);
      const at = b._roadPoint(r, d), blue = t.runes.has('blue') ? 2 : 1;
      t.nextActive = now + s.every;
      b.oils = b.oils.filter((oil) => oil.tower !== t || oil.lit);
      b.oils.push({ tower: t, i, x: at.x, y: at.y, radius: s.radius, until: now + s.keep, dps: t.skill * s.dps * blue,
        lit: 0, burnUntil: 0, born: now });
      b._event({ kind: 'oil', tower: t, x: at.x, y: at.y, radius: s.radius });
    },
  },
  hunter: {
    fire(b, t) {
      const target = b._target(t);
      if (!target) return false;
      const crit = rollCrit(b, t), damage = t.damage * (prized(target) ? t.cls.base.big : 1) * (crit ? t.critMul : 1);
      t.lastHit = b.time;
      b._event({ kind: 'shot', tower: t, x: target.x, y: target.y, crit, mob: target });
      b._hurt(target, damage, t);
      if (open(t, 1) && !target.dead && b.random() < t.s[1].chance) b._net(t, target);
      return true;
    },
    every(b, t, now, alive) {
      if (open(t, 0) && now >= t.nextTrap) {
        t.nextTrap = now + t.s[0].every;
        b._setTrap(t);
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
      b._hurt(target, t.damage * (crit ? t.critMul : 1), t);
      if (crit && open(t, 0) && !target.dead) {
        const s = t.s[0], share = target.info.boss ? s.boss : target.info.elite ? s.elite : s.share;
        b._hold(target, s.stun, t);
        b._hurt(target, Math.min(target.max * share, t.skill * s.cap), t, null, false, ARMOR);
      }
      return true;
    },
    every(b, t, now) {
      if (!open(t, 2) || t.cocoon || t.perch || now < t.nextActive) return;
      const s = t.s[2], rich = b.towers.filter((other) => other !== t && !other.rider && other.player.coins > s.rich);
      if (!rich.length && t.player.coins <= s.rich) return;
      t.nextActive = now + s.every;
      if (rich.length) b._heist(t, rich[Math.floor(b.random() * rich.length)], now);
      if (t.player.coins > s.rich) b._share(t);
    },
  },
  miner: {
    every(b, t, now, alive) {
      if (now >= t.nextMine) {
        t.nextMine = now + t.interval;
        b._plant(t);
      }
      if (open(t, 0) && alive && now >= t.nextGrenade) {
        const living = b.mobs.filter((mob) => !mob.dead && !hidden(mob, now) && !b.covered(mob.x, mob.y));
        if (living.length) {
          const mob = living[Math.floor(b.random() * living.length)];
          const fusion = t.runes.has('fusion') && b.random() < FUSION.chance;
          const time = fusion ? FUSION.flight : TOSS_FLIGHT;
          t.nextGrenade = now + t.s[0].every;
          b.tosses.push({ tower: t, mob, kind: fusion ? 'fusion' : 'grenade', at: now + time, x: mob.x, y: mob.y });
          b._event({ kind: 'toss', tower: t, mob, mine: fusion ? 'fusion' : 'grenade', time,
            radius: fusion ? FUSION.radius : t.s[0].radius });
        }
      }
      if (!open(t, 2) || !alive || now < t.nextActive) return;
      const s = t.s[2], target = b._target(t, { range: s.range, mode: 'any' });
      if (!target) return;
      t.nextActive = now + s.every;
      b.tosses.push({ tower: t, mob: target, kind: 'nuke', at: now + NUKE_FLIGHT, x: target.x, y: target.y });
      b._event({ kind: 'toss', tower: t, mob: target, mine: 'nuke', time: NUKE_FLIGHT, radius: s.radius });
    },
  },
  frost: {
    fire(b, t) {
      const caught = b.mobs.filter((mob) => b._targetable(t, mob));
      if (!caught.length) return false;
      const crit = rollCrit(b, t), damage = t.damage * (crit ? t.critMul : 1), long = t.runes.has('permafrost') ? 2 : 1;
      b._event({ kind: 'nova', tower: t, radius: t.range });
      for (const mob of caught) {
        b._hurt(mob, damage, t);
        if (open(t, 1) && !mob.dead && !immune(mob, 'ice') && b.random() < t.s[1].chance) {
          b._hold(mob, t.s[1].time * long, t);
        }
      }
      return true;
    },
    every(b, t, now, alive) {
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
