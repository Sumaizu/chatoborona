import { SIZE, inside, pathCells, reach } from './field.js';
import { BIOME_RULES, BOSSES, ELITES, HEAL_CAP, LIVES, LOOKS, MIMIC, MOBS, POWERS, SLIMES, TERRAIN, WAVE, eliteCount,
  levelOf, lookOf, tierOf, towerBase, waveHp, waveSpawns } from './balance.js';
import { CLASS_BY_ID } from './classes.js';
import { ASSIST_COINS, CRIT_MUL, KILL_COINS, uniqueFor } from './gacha.js';

export const MOVE_PAUSE = 1;
export const BITE_TIME = 1;
export const NUKE_STUN = 5;
export const NUKE_RADIUS = 3;
export const NUKE_FLIGHT = 7;

const NUKE_SHARE = { elite: 0.4, boss: 0.15 };
const SHOTS_PER_TICK = 6;
const BOSS_HOLD = 0.3;
const ELITE_HOLD = 0.6;
const BOSS_SLOW = 0.7;
const ELITE_PUSH = 0.5;
const PUSH_LIMIT = 5;
const HOLD_GAP = 1;
const RICOCHET_RANGE = 1.5;
const CONTAGION_RANGE = 2;
const CLUSTER = { count: 3, spread: 1.5, radius: 0.8, share: 0.5 };
const NO_MODS = { damage: 0, rate: 0, range: 0, crit: 0, power: 0, xp: 0, coins: 0, unique: null };
const NO_BUFF = { haste: 0, damage: 0, xp: 0, range: 0, coins: 0, ward: 0 };
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
const TOSS_FLIGHT = 0.6;
const TOSS_POWER = 0.5;
const FLASK_FLIGHT = 0.5;
const TRAP_TOUCH = 0.45;
const WHIRL_REACH = 0.5;
const PIERCE_REACH = 1.4;
const PIERCE_WIDTH = 0.4;
const SHOOTERS = new Set(['gunner', 'bomber', 'hunter', 'healer', 'parasite']);
const MUSE_TIME = 5;
const WALL_REST = 3;
export const OVERTIME = 120;
const OVERTIME_SPEED = 0.5;
const REVIVE_TIME = 1.5;
const CLINK_GAP = 0.25;
const RATTLE = { min: 3, spread: 3 };
const CHILL_MAX = 0.85;
const AURA_KEYS = ['aura', 'chillRange'];
const TIMER_KEYS = ['mineEvery', 'toss', 'trapEvery', 'wallEvery'];
const MINES = {
  strong: { radius: 0.7, mul: 3.5 },
  wide: { radius: 1.6, mul: 1.2 },
  stun: { radius: 1.1, mul: 0.8, hold: 1.2 },
};
const MINE_KINDS = Object.keys(MINES);

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
const SOLID = new Set(['mountain', 'tunnel']);
const UNSAFE = new Set(['mountain', 'tunnel', 'lake', 'river']);

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
const STEAL_RANGE = 1.2;
const GHOST_CUT = 0.5;
const MIRAGE_GAP = 0.35;
const big = (mob) => mob.info.elite || mob.info.boss;
const lookOfMob = (mob) => Object.values(LOOKS).flat().find((look) => look.id === mob.look) || null;
const steady = (mob, now) => mob.wild || Boolean(mob.power) && (mob.power.id === 'steadfast'
  || mob.power.steady && mob.powerUntil > now);
const veiled = (mob, now) => Boolean(mob.power) && mob.power.id === 'veil' && mob.powerUntil > now;
const underground = (mob, now) => mob.underUntil > now
  || Boolean(mob.power) && mob.power.id === 'tunnel' && mob.powerUntil <= now;
const ghostly = (mob, now) => mob.phaseUntil > now;
const hidden = (mob, now) => veiled(mob, now) || underground(mob, now);
const grounded = (mob, now) => !mob.flying && !underground(mob, now) && !ghostly(mob, now);

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
        if (UNSAFE.has(tile)) this.blocked.add(at);
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
    this.flasks = [];
    this.puddles = [];
    this.traps = [];
    this.whirls = [];
    this.births = [];
    this.treasures = 0;
    this.lastSpawn = 0;
    this.wild = false;
    this.met = new Set();
    this.events = [];
    this.leaked = 0;
    this.healed = 0;
    this.blockedLeaks = 0;
    this.foe = { hp: 0, speed: 0 };
    this._mobId = 0;
    this._auras = true;
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
      player, cls: CLASS_BY_ID.get(classId), x, y, cx: x + 0.5, cy: y + 0.5, level: 0, p: null, mods,
      damage: 0, interval: 1, range: 0, cooldown: 0, busy: 0, napUntil: 0, stunUntil: 0,
      buff: Object.assign({}, NO_BUFF),
      helpers: [], rally: 0, rallyUntil: 0, nextRally: 0, burstUntil: 0, nextBurst: 0, nextStorm: 0, rampTarget: null,
      webUntil: 0, web: 1,
      ramp: 0, rider: false, host: null, leapUntil: 0, nextWall: 0, nextMine: 0, nextToss: 0, nextTrap: 0,
      muses: [], nextMuse: 0,
      run: { damage: 0, kills: 0, assists: 0, xp: 0, coins: 0 },
    };
  }

  place(player, classId, x, y, mods = NO_MODS) {
    if (!this.free(x, y)) return null;
    const tower = this._tower(player, classId, x, y, mods);
    this.byCell.set(y * SIZE + x, tower);
    this.towers.push(tower);
    this._level(tower);
    this._auras = true;
    return tower;
  }

  placeRider(player, classId, mods = NO_MODS) {
    const [x, y] = this.path[this.gate], tower = this._tower(player, classId, x, y, mods);
    tower.rider = true;
    this.towers.push(tower);
    this._level(tower);
    this._auras = true;
    return tower;
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
    if (tower.rider || !this.free(x, y)) return false;
    this.byCell.delete(tower.y * SIZE + tower.x);
    this.byCell.set(y * SIZE + x, tower);
    tower.x = x;
    tower.y = y;
    tower.cx = x + 0.5;
    tower.cy = y + 0.5;
    tower.busy = this.time + MOVE_PAUSE;
    tower.rampTarget = null;
    tower.ramp = 0;
    this._stats(tower);
    if (tower.p.wallHp) {
      this.walls = this.walls.filter((wall) => wall.tower !== tower);
      this._raiseWall(tower, this.time);
    }
    return true;
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
    this.walls = this.walls.filter((wall) => wall.tower !== tower);
    this.mines = this.mines.filter((mine) => mine.tower !== tower);
    for (const list of ['tosses', 'flasks', 'puddles', 'traps', 'whirls']) {
      this[list] = this[list].filter((item) => item.tower !== tower);
    }
    this._auras = true;
  }

  startWave(wave, players = this.towers.length) {
    this.wave = wave;
    this.players = players;
    const start = this.time, toughness = Math.max(FLOOR, 1 + this.foe.hp);
    const fits = (kind) => !kind.only && (!kind.from || kind.from <= wave);
    const bosses = BOSSES.filter(fits), elites = ELITES.filter(fits);
    const boss = bosses[Math.floor(this.random() * bosses.length)];
    const plan = waveSpawns(wave), length = plan.length ? plan[plan.length - 1].delay : 0;
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
      } else if (s.type === 'boss') spawn.kind = boss;
      else if (s.type === 'elite') spawn.kind = elites[Math.floor(this.random() * elites.length)];
      else {
        const looks = LOOKS[s.type].filter(fits);
        spawn.look = looks[Math.floor(this.random() * looks.length)];
        spawn.hp *= spawn.look.hp || 1;
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
    let heal = 0;
    for (const t of this.towers) heal += t.p.heal || 0;
    heal = Math.min(HEAL_CAP, heal, this.maxLives - this.lives);
    if (heal > 0) {
      this.lives += heal;
      this.healed += heal;
      this._event({ kind: 'heal', amount: heal });
    }
    return heal;
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
    this._powers(dt, now);
    if (this._auras) this._refreshAuras();
    if (this.towers.some((t) => t.rider)) this._riderAuras();
    this._effects(dt, now);
    this._walk(dt, now);
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

  _event(event) {
    if (this.quiet) return;
    this.events.push(event);
    if (this.events.length > EVENTS_MAX) this.events.splice(0, this.events.length - EVENTS_MAX / 2);
  }

  _spawn(spawn, d = 0, r = 0) {
    const info = MOBS[spawn.type], kind = spawn.kind || null, shape = kind || spawn.look || null;
    const power = shape && shape.power ? POWERS[shape.power] : null;
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
      element: shape && shape.element || null, slime: shape && shape.slime || 0, immuneAt: 0,
      undead: Boolean(shape && shape.undead), armor: shape && shape.armor || 0,
      revive: shape && shape.revive || power && power.revive || 0, treasure: Boolean(kind && kind.treasure),
      clinkAt: 0, rattleAt: this.time + RATTLE.min, wild: this.wild, hitAt: -1e9,
      powerAt: this.time + (power && power.every ? 2 : 0), powerUntil: 0, hp: spawn.hp, max: spawn.hp, d, r, x: 0,
      y: 0, speed: WAVE.speed * info.speed * Math.max(FLOOR, 1 + this.foe.speed) * ((shape && shape.flying
        ? this.rules.air : this.rules.ground) || 1), slow: 0, slowUntil: 0, chill: 0,
      brittle: 0, corrode: 0, mark: 0, markUntil: 0, exposed: 0, exposedUntil: 0, holdUntil: 0, holdFree: 0,
      holdBy: '', pushed: 0, poison: null, burn: null, helpers: new Set(), last: null, dead: false, biting: 0,
      wall: null, fury: 0, sx: 0, sy: 0, placed: false,
    };
    this._locate(mob);
    this.mobs.push(mob);
    if (kind) this._event({ kind: 'arrive', mob });
    else if (spawn.look && spawn.look.text && !this.met.has(spawn.look.id)) {
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
      const power = mob.power;
      if (!power) continue;
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

  _summon(mob, type, id, share, i) {
    const look = LOOKS[type].find((item) => item.id === id);
    const child = this._spawn({ type, look, hp: waveHp(Math.max(1, this.wave), type, this.players || 1) * share },
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
    if (!target || target.buff.ward) return;
    target.busy = Math.max(target.busy, this.time + power.hold);
    target.stunUntil = Math.max(target.stunUntil, this.time + power.hold);
    this._event({ kind: 'hex', mob, tower: target });
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
    const eaten = this.mines.filter(close).length + this.traps.filter(close).length + this.puddles.filter(close).length;
    this.mines = this.mines.filter((item) => !close(item));
    this.traps = this.traps.filter((item) => !close(item));
    this.puddles = this.puddles.filter((item) => !close(item));
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
      if (t.rider || t.buff.ward || !burnt({ x: t.cx, y: t.cy })) continue;
      t.busy = Math.max(t.busy, this.time + power.hold);
      t.stunUntil = Math.max(t.stunUntil, this.time + power.hold);
    }
    this.mines = this.mines.filter((item) => !burnt(item));
    this.traps = this.traps.filter((item) => !burnt(item));
    this.puddles = this.puddles.filter((item) => !burnt(item));
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
    if (!target || target.buff.ward) return;
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

  _params(tower) {
    const mods = tower.mods, p = Object.assign({}, tower.cls.params(tower.level, tierOf(tower.level)));
    const unique = mods.unique ? uniqueFor(mods.unique, mods.divine) : null;
    if (unique && (unique.cls || unique.role)) {
      for (const [key, value] of Object.entries(unique.mul || {})) p[key] *= value;
      for (const [key, value] of Object.entries(unique.add || {})) p[key] = (p[key] || 0) + value;
      Object.assign(p, unique.set || {});
    }
    for (const key of tower.cls.power || []) if (typeof p[key] === 'number') p[key] *= Math.max(FLOOR, 1 + mods.power);
    const lift = this.onWatch(tower) ? TERRAIN.watch : 0;
    for (const key of AURA_KEYS) if (p[key]) p[key] = Math.max(0.5, p[key] + mods.range) + lift;
    for (const key of TIMER_KEYS) if (p[key]) p[key] /= Math.max(FLOOR, 1 + mods.rate);
    if (p.mineCap) p.mineCap = Math.round(p.mineCap);
    if (p.traps) p.traps = Math.round(p.traps);
    if (p.jumps) p.jumps = Math.round(p.jumps);
    if (p.chill) p.chill = Math.min(CHILL_MAX, p.chill);
    return p;
  }

  _stats(tower) {
    tower.p = this._params(tower);
    const base = towerBase(tower.level), mods = tower.mods;
    tower.damage = base.damage * tower.p.damage * Math.max(FLOOR, 1 + mods.damage);
    tower.interval = base.interval * tower.p.interval / Math.max(FLOOR, 1 + mods.rate);
    tower.baseRange = Math.max(RANGE_MIN, (tower.p.range || base.range) + mods.range) + (this.onHill(tower)
      ? TERRAIN.hill : 0) + (this.onWatch(tower) ? TERRAIN.watch : 0);
    tower.range = tower.baseRange * (1 + tower.buff.range);
    tower.unique = mods.unique || null;
    tower.boon = mods.unique ? uniqueFor(mods.unique, mods.divine) : null;
    this._auras = true;
  }

  _refreshAuras() {
    this._auras = false;
    for (const t of this.towers) {
      t.buff = Object.assign({}, NO_BUFF);
      t.helpers = [];
    }
    for (const a of this.towers) {
      if (a.p.aura) for (const t of this.towers) this._aura(a, t);
    }
    for (const t of this.towers) t.range = t.baseRange * (1 + t.buff.range);
  }

  _aura(a, t) {
    const p = a.p, d2 = (t.cx - a.cx) * (t.cx - a.cx) + (t.cy - a.cy) * (t.cy - a.cy);
    if (d2 > p.aura * p.aura) return;
    let helped = false;
    const raise = (field, value) => {
      if (!value) return;
      helped = true;
      if (value > t.buff[field]) t.buff[field] = value;
    };
    raise('haste', p.haste);
    raise('range', p.reach);
    raise('damage', p.formation);
    raise('damage', p.grace);
    raise('damage', p.blessing);
    raise('xp', p.wisdom);
    raise('coins', p.tithe);
    raise('ward', p.ward);
    if (a.muses.includes(t)) {
      raise('damage', p.muse);
      raise('haste', p.muse);
      raise('range', p.muse);
    }
    if (helped && t !== a) t.helpers.push(a);
  }

  _riderAuras() {
    for (const t of this.towers) {
      if (!t.rider) continue;
      t.buff = Object.assign({}, NO_BUFF);
      t.helpers = [];
      for (const a of this.towers) if (a.p.aura && a !== t) this._aura(a, t);
    }
  }

  _hold(mob, seconds, tower) {
    if (mob.dead || this.time < mob.holdFree || steady(mob, this.time)) return;
    const time = seconds * (mob.info.boss ? BOSS_HOLD : mob.info.elite ? ELITE_HOLD : 1)
      * (tower && tower.p.holdMul || 1);
    mob.holdUntil = this.time + time;
    mob.holdFree = mob.holdUntil + HOLD_GAP;
    mob.holdBy = tower ? tower.cls.id : '';
    this._event({ kind: 'hold', mob, by: mob.holdBy });
  }

  _slow(mob, amount, seconds, element = null) {
    if (immune(mob, element) || steady(mob, this.time)) return;
    amount *= this._weak(element);
    if (mob.slowUntil <= this.time || amount > mob.slow) mob.slow = amount;
    mob.slowUntil = Math.max(mob.slowUntil, this.time + seconds);
  }

  _push(mob, distance, tower) {
    if (mob.info.boss || mob.dead || mob.biting || steady(mob, this.time)) return;
    const shift = Math.min(distance * (mob.info.elite ? ELITE_PUSH : 1), PUSH_LIMIT - mob.pushed, mob.d);
    if (shift <= 0) return;
    mob.pushed += shift;
    mob.d -= shift;
    this._locate(mob);
    mob.helpers.add(tower);
    if (tower.p.gust) this._hold(mob, tower.p.gust, tower);
  }

  _poison(mob, tower, key, dps, seconds, stacks) {
    if (mob.dead || immune(mob, 'poison')) return;
    if (!mob.poison) mob.poison = new Map();
    const dose = mob.poison.get(key);
    const layers = Math.min(stacks, dose ? dose.stacks + 1 : 1);
    mob.poison.set(key, { tower, dps, stacks: layers, until: this.time + seconds });
  }

  _ignite(mob, tower, key, dps, seconds) {
    if (mob.dead || immune(mob, 'fire')) return;
    if (!mob.burn) mob.burn = new Map();
    mob.burn.set(key, { tower, dps, until: this.time + seconds });
  }

  _effects(dt, now) {
    for (const mob of this.mobs) {
      mob.chill = 0;
      mob.brittle = 0;
    }
    for (const t of this.towers) {
      if (!t.p.chillRange) continue;
      for (const mob of this.mobs) {
        if (mob.dead || immune(mob, 'ice') || steady(mob, now) || !near(mob, t.cx, t.cy, t.p.chillRange)) continue;
        if (t.p.chill * this._weak('ice') > mob.chill) mob.chill = t.p.chill * this._weak('ice');
        if (t.p.brittle > mob.brittle) mob.brittle = t.p.brittle;
        if (t.p.linger) this._slow(mob, t.p.chill * t.p.lingerShare, t.p.linger, 'ice');
        mob.helpers.add(t);
      }
    }
    for (const t of this.towers) {
      if (!t.p.wallHeal) continue;
      for (const wall of this.walls) {
        if ((wall.x - t.cx) ** 2 + (wall.y - t.cy) ** 2 > t.p.aura * t.p.aura) continue;
        if (now - (wall.hitAt || -1e9) < WALL_REST) continue;
        wall.hp = Math.min(wall.max, wall.hp + wall.max * t.p.wallHeal * dt);
      }
    }
    if (this.patches.length) {
      this.patches = this.patches.filter((patch) => patch.until > now);
      for (const patch of this.patches) {
        for (const mob of this.mobs) {
          if (!mob.dead && near(mob, patch.x, patch.y, patch.radius)) {
            this._hurt(mob, patch.dps * dt, patch.tower, 'fire', true);
          }
        }
      }
    }
    if (this.mines.length) this._mines(now);
    if (this.tosses.length) this._tosses(now);
    if (this.flasks.length) this._flasks(now);
    if (this.puddles.length) this._puddles(now);
    if (this.traps.length) this._traps(now);
    if (this.whirls.length) this._whirls(dt, now);
    for (const mob of this.mobs) {
      mob.corrode = 0;
      if (mob.poison && !mob.dead) {
        for (const [key, dose] of mob.poison) {
          if (dose.until <= now) {
            mob.poison.delete(key);
            continue;
          }
          if (dose.tower.p.corrode > mob.corrode) mob.corrode = dose.tower.p.corrode;
          this._hurt(mob, dose.dps * dose.stacks * dt, dose.tower, 'poison', true);
          if (mob.dead) break;
        }
        if (!mob.dead && !mob.poison.size) mob.poison = null;
      }
      if (mob.burn && !mob.dead) {
        for (const [key, fire] of mob.burn) {
          if (fire.until <= now) {
            mob.burn.delete(key);
            continue;
          }
          this._hurt(mob, fire.dps * dt, fire.tower, 'fire', true);
          if (mob.dead) break;
        }
        if (!mob.dead && !mob.burn.size) mob.burn = null;
      }
    }
  }

  _mines(now) {
    const left = [];
    for (const mine of this.mines) {
      const victim = this.mobs.find((mob) => !mob.dead && grounded(mob, now) && near(mob, mine.x, mine.y, MINE_TOUCH));
      if (!victim) {
        left.push(mine);
        continue;
      }
      this._detonate(mine.tower, mine.x, mine.y, mine.kind, false, now);
    }
    this.mines = left;
  }

  _tosses(now) {
    const due = this.tosses.filter((toss) => toss.at <= now);
    if (!due.length) return;
    this.tosses = this.tosses.filter((toss) => toss.at > now);
    for (const toss of due) {
      const mob = toss.mob, x = mob.dead ? toss.x : mob.x, y = mob.dead ? toss.y : mob.y;
      if (toss.kind === 'nuke') this._nuke(toss.tower, x, y);
      else this._detonate(toss.tower, x, y, toss.kind, true, now, TOSS_POWER);
    }
  }

  _flasks(now) {
    const due = this.flasks.filter((flask) => flask.at <= now);
    if (!due.length) return;
    this.flasks = this.flasks.filter((flask) => flask.at > now);
    for (const flask of due) {
      const t = flask.tower, own = this.puddles.filter((puddle) => puddle.tower === t);
      if (own.length >= t.p.puddles) this.puddles.splice(this.puddles.indexOf(own[0]), 1);
      this.puddles.push({ tower: t, x: flask.x, y: flask.y, radius: t.p.puddle, until: now + t.p.puddleTime,
        dps: flask.dps, born: now });
      this._event({ kind: 'splash', tower: t, x: flask.x, y: flask.y, radius: t.p.puddle });
    }
  }

  _puddles(now) {
    this.puddles = this.puddles.filter((puddle) => puddle.until > now);
    for (const puddle of this.puddles) {
      for (const mob of this.mobs) {
        if (mob.dead || !grounded(mob, now) || !near(mob, puddle.x, puddle.y, puddle.radius)) continue;
        this._poison(mob, puddle.tower, puddle.tower, puddle.dps, puddle.tower.p.linger, 1);
      }
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
      const t = trap.tower, p = t.p, damage = this._damageOf(t, now) * p.trapMul;
      const caught = p.net
        ? this.mobs.filter((mob) => !mob.dead && grounded(mob, now) && near(mob, trap.x, trap.y, p.net)) : [victim];
      this._event({ kind: 'snap', tower: t, x: trap.x, y: trap.y, radius: p.net || TRAP_TOUCH });
      for (const mob of caught) {
        this._hurt(mob, damage, t);
        if (mob.dead) continue;
        this._hold(mob, p.trapHold, t);
        if (p.execute && !mob.info.boss && mob.hp <= mob.max * p.execute) this._slay(mob, t);
      }
    }
    this.traps = left;
  }

  _whirls(dt, now) {
    this.whirls = this.whirls.filter((whirl) => whirl.until > now);
    for (const whirl of this.whirls) {
      whirl.d = Math.max(0, whirl.d - whirl.speed * dt);
      const t = whirl.tower;
      for (const mob of this.mobs) {
        if (mob.dead || mob.r !== whirl.r || Math.abs(mob.d - whirl.d) > WHIRL_REACH) continue;
        if (!whirl.hit.has(mob)) {
          whirl.hit.add(mob);
          this._hurt(mob, whirl.damage, t);
          if (mob.dead) continue;
        }
        if (mob.info.boss) this._slow(mob, t.p.headwind, t.p.headwindTime);
        else if (mob.d > whirl.d) this._push(mob, mob.d - whirl.d, t);
      }
    }
  }

  _detonate(t, x, y, kind, air, now, power = 1) {
    const look = MINES[kind], damage = this._damageOf(t, now) * look.mul * power;
    this._event({ kind: 'mine', tower: t, x, y, radius: look.radius, mine: kind });
    for (const mob of this.mobs) {
      if (mob.dead || mob.flying && !air && !t.p.airMines || !near(mob, x, y, look.radius)) continue;
      this._hurt(mob, damage, t);
      if (look.hold) this._hold(mob, look.hold, t);
    }
  }

  _nuke(t, x, y) {
    this._event({ kind: 'nuke', tower: t, x, y, radius: NUKE_RADIUS });
    for (const mob of this.mobs) {
      if (mob.dead || !near(mob, x, y, NUKE_RADIUS)) continue;
      if (!big(mob)) {
        this._slay(mob, t);
        continue;
      }
      this._hurt(mob, mob.max * NUKE_SHARE[mob.info.boss ? 'boss' : 'elite'], t);
      if (mob.dead || !mob.info.boss) continue;
      mob.holdUntil = Math.max(mob.holdUntil, this.time + NUKE_STUN);
      mob.holdBy = 'miner';
      this._event({ kind: 'hold', mob, by: 'miner' });
    }
    for (const tower of this.towers) {
      if (tower.buff.ward || !near({ x: tower.cx, y: tower.cy }, x, y, NUKE_RADIUS)) continue;
      tower.busy = Math.max(tower.busy, this.time + NUKE_STUN);
      tower.stunUntil = Math.max(tower.stunUntil, this.time + NUKE_STUN);
    }
  }

  _walk(dt, now) {
    let shield = 0;
    for (const t of this.towers) if (t.p.shield > shield) shield = t.p.shield;
    const stop = this.length - HEART_GAP;
    for (const mob of this.mobs) {
      if (mob.dead) continue;
      if (mob.biting) {
        if (now - mob.biting < BITE_TIME) continue;
        mob.dead = true;
        if (shield && this.random() < shield) {
          this.blockedLeaks += 1;
          this._event({ kind: 'shield', mob });
          continue;
        }
        this.lives -= mob.leak;
        this.leaked += mob.leak;
        this._event({ kind: 'leak', mob });
        continue;
      }
      mob.wall = null;
      if (mob.holdUntil > now && !steady(mob, now)) continue;
      let slow = steady(mob, now) ? 0 : Math.max(mob.slowUntil > now ? mob.slow : 0, mob.chill);
      if (mob.info.boss) slow *= BOSS_SLOW;
      let speed = mob.speed * (1 + mob.fury) * (mob.wild ? 1 + OVERTIME_SPEED : 1);
      if (mob.power && mob.power.boost && mob.power.time && mob.powerUntil > now) speed *= 1 + mob.power.boost;
      if (mob.power && mob.power.id === 'rage') speed *= 1 + mob.power.boost * (1 - mob.hp / mob.max);
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
    if (t.p.thorns) this._hurt(mob, this._damageOf(t, now) * t.p.thorns * dt, t, t.cls.element || null, true);
    if (wall.hp > 0) return;
    this.walls = this.walls.filter((known) => known !== wall);
    t.nextWall = now + t.p.wallEvery;
    this._event({ kind: 'crumble', tower: t, x: wall.x, y: wall.y });
    if (!t.p.collapse) return;
    this._blast(t, wall.x, wall.y, t.p.collapseRange, this._damageOf(t, now) * t.p.collapse, null);
    for (const other of this.mobs) {
      if (!other.dead && near(other, wall.x, wall.y, t.p.collapseRange)) this._hold(other, t.p.collapseStun, t);
    }
  }

  _damageOf(t, now) {
    return t.damage * (1 + t.buff.damage) * (t.rallyUntil > now ? 1 + t.rally : 1);
  }

  _intervalOf(t, now) {
    return t.interval * (t.webUntil > now ? t.web : 1) / ((1 + t.buff.haste) * (1 + t.ramp)
      * (t.burstUntil > now ? t.p.burstMul : 1));
  }

  _shoot(dt, now) {
    const alive = this.mobs.some((m) => !m.dead);
    for (const t of this.towers) {
      if (t.rider) this._ride(t, now);
      if (t.busy > now) continue;
      this._periodic(t, now, alive);
      if (t.p.passive) continue;
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

  _ride(t, now) {
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
    t.leapUntil = now + t.p.leap;
    this._event({ kind: 'leap', tower: t, mob: best, x: t.cx, y: t.cy });
  }

  _wallSpot(t) {
    const lists = this._reach(t.range), cells = lists[t.y * SIZE + t.x], taken = new Set(this.walls.map((w) => w.i));
    let best = null, score = -1;
    for (const i of cells) {
      const { r, d } = this._spot(i);
      if (taken.has(i) || d < WALL_MARGIN || !r && d > this.length - HEART_GAP - WALL_MARGIN) continue;
      const [px, py] = this.road[i];
      let guard = 0;
      for (const other of this.towers) {
        if (!other.rider && (other.cx - px - 0.5) ** 2 + (other.cy - py - 0.5) ** 2 <= other.range * other.range) {
          guard += 1;
        }
      }
      if (guard > score) {
        score = guard;
        best = i;
      }
    }
    return best;
  }

  _wallUnit() {
    return waveHp(Math.max(1, this.wave), 'normal', this.players || this.towers.length || 1);
  }

  _wallMax(t) {
    return this._wallUnit() * t.p.wallHp;
  }

  _periodic(t, now, alive) {
    const p = t.p;
    if (p.wallHp && now >= t.nextWall) this._raiseWall(t, now);
    if (p.mineEvery && now >= t.nextMine) {
      t.nextMine = now + p.mineEvery;
      this._plant(t, this._reach(t.range)[t.y * SIZE + t.x]);
    }
    const living = p.toss && alive && now >= t.nextToss ? this.mobs.filter((m) => !m.dead) : [];
    if (living.length) {
      const mob = living[Math.floor(this.random() * living.length)], nuke = p.nuke && this.random() < p.nuke;
      const kind = nuke ? 'nuke' : MINE_KINDS[Math.floor(this.random() * MINE_KINDS.length)];
      const time = nuke ? NUKE_FLIGHT : TOSS_FLIGHT;
      t.nextToss = now + p.toss;
      this.tosses.push({ tower: t, mob, kind, at: now + time, x: mob.x, y: mob.y });
      this._event({ kind: 'toss', tower: t, mob, mine: kind, time });
    }
    if (p.muse && now >= t.nextMuse) {
      const near2 = p.aura * p.aura, allies = this.towers.filter((ally) => ally !== t && !ally.rider
        && (ally.cx - t.cx) * (ally.cx - t.cx) + (ally.cy - t.cy) * (ally.cy - t.cy) <= near2);
      t.nextMuse = now + MUSE_TIME;
      t.muses = [];
      while (allies.length && t.muses.length < (p.muses || 1)) {
        t.muses.push(allies.splice(Math.floor(this.random() * allies.length), 1)[0]);
      }
      this._auras = true;
      for (const ally of t.muses) this._event({ kind: 'muse', tower: t, ally });
    }
    if (p.trapEvery && now >= t.nextTrap) {
      t.nextTrap = now + p.trapEvery;
      this._setTrap(t);
    }
    if (p.burstEvery && alive && now >= t.nextBurst) {
      t.nextBurst = now + p.burstEvery;
      t.burstUntil = now + p.burstTime;
    }
    if (p.rallyEvery && alive && now >= t.nextRally) {
      t.nextRally = now + p.rallyEvery;
      for (const ally of this.towers) {
        if ((ally.cx - t.cx) * (ally.cx - t.cx) + (ally.cy - t.cy) * (ally.cy - t.cy) > p.aura * p.aura) continue;
        if (ally.rallyUntil <= now || p.rally > ally.rally) ally.rally = p.rally;
        ally.rallyUntil = now + p.rallyTime;
      }
      this._event({ kind: 'rally', tower: t });
    }
    if (p.stormEvery && alive && now >= t.nextStorm) {
      const living = this.mobs.filter((m) => !m.dead);
      if (!living.length) return;
      const mob = living[Math.floor(this.random() * living.length)];
      t.nextStorm = now + p.stormEvery;
      this._event({ kind: 'storm', tower: t, x: mob.x, y: mob.y });
      this._hurt(mob, this._damageOf(t, now) * p.stormMul, t);
    }
  }

  _raiseWall(t, now) {
    const old = this.walls.find((wall) => wall.tower === t);
    t.nextWall = now + t.p.wallEvery;
    if (old && (now - (old.hitAt || -1e9) < WALL_REST || old.hp >= old.max && this._inReach(t, old.i))) return;
    if (old) this.walls = this.walls.filter((wall) => wall !== old);
    const i = this._wallSpot(t);
    if (i === null) {
      if (old) this.walls.push(old);
      else t.nextWall = now + 1;
      return;
    }
    const [x, y] = this.road[i], hp = this._wallMax(t), { r, d } = this._spot(i);
    this.walls.push({ tower: t, i, r, d, x: x + 0.5, y: y + 0.5, hp, max: hp, hitAt: -1e9 });
    this._event({ kind: 'wall', tower: t, x: x + 0.5, y: y + 0.5, renew: Boolean(old) });
  }

  _spot(i) {
    return i < this.path.length ? { r: 0, d: i + 1 } : { r: 1, d: i - this.path.length + 1 };
  }

  _inReach(t, i) {
    return this._reach(t.range)[t.y * SIZE + t.x].includes(i);
  }

  _setTrap(t) {
    const own = this.traps.filter((trap) => trap.tower === t);
    if (own.length >= t.p.traps) this.traps.splice(this.traps.indexOf(own[0]), 1);
    const taken = new Set(this.traps.map((trap) => trap.i));
    const cells = this._reach(t.range)[t.y * SIZE + t.x].filter((i) => !taken.has(i) && i > 0);
    if (!cells.length) return;
    const i = cells[Math.floor(this.random() * cells.length)], [x, y] = this.road[i];
    this.traps.push({ tower: t, i, x: x + 0.5, y: y + 0.5 });
    this._event({ kind: 'trap', tower: t, x: x + 0.5, y: y + 0.5 });
  }

  _plant(t, cells) {
    const own = this.mines.filter((mine) => mine.tower === t);
    if (own.length >= t.p.mineCap) this.mines.splice(this.mines.indexOf(own[0]), 1);
    const count = new Map();
    for (const mine of this.mines) count.set(mine.i, (count.get(mine.i) || 0) + 1);
    const fewest = Math.min(...cells.map((i) => count.get(i) || 0));
    const free = cells.filter((i) => (count.get(i) || 0) === fewest && fewest < MINES_PER_CELL);
    if (!free.length) return;
    const i = free[Math.floor(this.random() * free.length)], [x, y] = this.road[i];
    const kind = MINE_KINDS[Math.floor(this.random() * MINE_KINDS.length)];
    const shift = () => 0.5 + (this.random() - 0.5) * 0.6;
    const mine = { tower: t, i, x: x + shift(), y: y + shift(), kind };
    this.mines.push(mine);
    this._event({ kind: 'plant', tower: t, x: mine.x, y: mine.y, mine: kind });
  }

  _target(t, skip = null) {
    if (t.rider) {
      const host = t.host;
      return host && !host.dead && this.time >= t.leapUntil && !this.covered(host.x, host.y) ? host : null;
    }
    let best = null, bestScore = -Infinity;
    const mode = t.p.target;
    const puddles = mode === 'puddle' ? this.puddles.filter((puddle) => puddle.tower === t) : null;
    for (const mob of this.mobs) {
      if (mob.dead || mob === skip || hidden(mob, this.time) || !near(mob, t.cx, t.cy, t.range)) continue;
      if (mode === 'undead' && !mob.undead && !t.p.holyAll || !this.sees(t, mob)) continue;
      let score = this.ahead(mob) + (mode === 'bigFirst' && big(mob) ? 1e6 : 0);
      if (mode === 'strongest') score = mob.hp + (t.p.skyFirst && mob.flying ? 1e12 : 0);
      else if (mode === 'puddle' && puddles.some((puddle) => near(mob, puddle.x, puddle.y, puddle.radius))) {
        score -= 1e3;
      }
      if (score > bestScore) {
        bestScore = score;
        best = mob;
      }
    }
    return best;
  }

  _nearest(x, y, range, skip) {
    let best = null, bestDistance = range * range;
    for (const mob of this.mobs) {
      if (mob.dead || skip.has(mob) || hidden(mob, this.time)) continue;
      const d = (mob.x - x) * (mob.x - x) + (mob.y - y) * (mob.y - y);
      if (d <= bestDistance) {
        bestDistance = d;
        best = mob;
      }
    }
    return best;
  }

  _fire(t, now) {
    const p = t.p, crit = t.mods.crit > 0 && this.random() < t.mods.crit;
    const damage = this._damageOf(t, now) * (crit ? CRIT_MUL : 1);
    const target = this._target(t);
    if (!target) return false;
    if (p.cone) {
      const angle = Math.atan2(target.y - t.cy, target.x - t.cx);
      const flash = p.flash && this.random() < p.flash ? p.flashMul : 1;
      this._event({ kind: 'flame', tower: t, angle, flash: flash > 1, x: target.x, y: target.y });
      for (const mob of this.mobs) {
        if (mob.dead || !near(mob, t.cx, t.cy, t.range)) continue;
        let delta = Math.atan2(mob.y - t.cy, mob.x - t.cx) - angle;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        if (Math.abs(delta) > p.cone && mob !== target) continue;
        this._ignite(mob, t, t, damage * p.burn, p.burnTime);
        this._hurt(mob, damage * flash, t);
      }
      this._unique(t, target, damage, now);
      return true;
    }
    if (SHOOTERS.has(t.cls.id)) this._event({ kind: 'shot', tower: t, x: target.x, y: target.y, crit, mob: target });
    ATTACKS[t.cls.id](this, t, target, damage, now);
    this._unique(t, target, damage, now);
    return true;
  }

  _unique(t, target, damage, now) {
    const id = t.unique;
    if (!id || target.dead && id !== 'spark' && id !== 'blast') return;
    const u = t.boon.values;
    if (id === 'ignite') this._ignite(target, t, 'unique', damage * u.dps, u.time);
    else if (id === 'frostbite') this._slow(target, u.slow, u.time, 'ice');
    else if (id === 'venom') this._poison(target, t, 'unique', damage * u.dps, u.time, u.stacks);
    else if (id === 'deadeye' && this.random() < u.chance) this._hurt(target, damage * (u.mul - 1), t);
    else if (id === 'thunderclap' && this.random() < u.chance) {
      if (!immune(target, 'storm')) this._hold(target, u.hold, t);
    }
    else if (id === 'spark') {
      const next = this._nearest(target.x, target.y, u.range, new Set([target]));
      if (next) this._hurt(next, damage * u.share, t, 'storm');
    } else if (id === 'blast') this._blast(t, target.x, target.y, u.radius, damage * u.share, target);
    else if (id === 'reaper' && !target.info.boss && target.hp <= target.max * u.below) this._slay(target, t);
    else if (id === 'echo' && this.random() < u.chance) this._hurt(target, damage, t);
  }

  _hurt(mob, amount, t, element = t.cls.element || null, dot = false) {
    if (mob.dead || amount <= 0 || underground(mob, this.time)) return;
    amount *= this._weak(element);
    if (immune(mob, element)) {
      mob.helpers.add(t);
      if (this.time >= mob.immuneAt) {
        mob.immuneAt = this.time + IMMUNE_GAP;
        this._event({ kind: 'immune', mob });
      }
      return;
    }
    const power = mob.power, breaker = t.unique === 'breaker';
    if (power && power.id === 'shield' && mob.powerUntil > this.time && !breaker) return;
    if (power && power.id === 'curl' && mob.powerUntil > this.time) return;
    if (power && power.id === 'mirror' && mob.powerUntil > this.time && !dot && !t.rider) {
      mob.powerUntil = 0;
      if (!t.buff.ward) {
        t.busy = Math.max(t.busy, this.time + power.hold);
        t.stunUntil = Math.max(t.stunUntil, this.time + power.hold);
      }
      this._event({ kind: 'reflect', mob, tower: t });
      return;
    }
    const vulnerable = (mob.markUntil > this.time ? mob.mark : 0) + (mob.exposedUntil > this.time ? mob.exposed : 0)
      + mob.brittle + mob.corrode;
    let dealt = amount * (1 + vulnerable);
    const cut = Math.max(power && power.cut || 0, mob.armor);
    if (cut && !breaker) dealt *= 1 - cut;
    if (mob.front && !dot && !t.rider && this._facing(mob, t)) dealt *= 1 - mob.front;
    if (ghostly(mob, this.time) && t.cls.id !== 'healer') dealt *= GHOST_CUT;
    if (element === 'fire' && mob.fireproof) dealt *= 1 - mob.fireproof;
    if (mob.ward > 0) {
      const kept = Math.min(mob.ward, dealt);
      mob.ward -= kept;
      dealt -= kept;
      if (dealt <= 0) {
        mob.helpers.add(t);
        return;
      }
    }
    if (mob.treasure && this.time >= mob.clinkAt) {
      mob.clinkAt = this.time + CLINK_GAP;
      this._event({ kind: 'clink', mob });
    }
    if (breaker && big(mob)) dealt *= t.boon.values.big;
    t.run.damage += Math.min(dealt, mob.hp);
    mob.hp -= dealt;
    if (!dot) mob.hitAt = this.time;
    mob.helpers.add(t);
    for (const helper of t.helpers) mob.helpers.add(helper);
    mob.last = t;
    if (mob.mirage && !mob.fake && !dot) this._mirage(mob);
    if (mob.cargo && mob.hp > 0) this._unload(mob, false);
    if (!dot && mob.hp > 0) this._afflict(mob, t);
    if (power && power.id === 'curl' && !dot && mob.hp > 0 && dealt >= mob.max * power.share
      && this.time >= mob.curlReady) {
      mob.powerUntil = this.time + power.time;
      mob.curlReady = this.time + power.rest;
      this._event({ kind: 'power', mob });
    }
    if (mob.hp <= 0) this._kill(mob);
  }

  _afflict(mob, t) {
    const p = t.p;
    if (p.expose) {
      if (mob.exposedUntil <= this.time || p.expose >= mob.exposed) mob.exposed = p.expose;
      if (mob.exposed === p.expose) mob.exposedUntil = this.time + p.exposeTime;
    }
    if (p.snare && this.random() < p.snare) this._hold(mob, p.snareTime, t);
  }

  _slay(mob, t) {
    if (mob.dead) return;
    t.run.damage += mob.hp;
    mob.helpers.add(t);
    for (const helper of t.helpers) mob.helpers.add(helper);
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
    const xp = mob.info.xp;
    for (const t of this.towers) if (t.p.wisdom && near(mob, t.cx, t.cy, t.p.aura)) mob.helpers.add(t);
    for (const t of mob.helpers) {
      this._grant(t, xp);
      const bonus = t.unique === 'midas' ? t.boon.values.coins : 0;
      const coins = Math.round((t === killer ? KILL_COINS : ASSIST_COINS) * mob.info.coins
        * Math.max(0, 1 + t.mods.coins + t.buff.coins + bonus));
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
    if (mob.stolen && killer) {
      killer.player.coins += mob.stolen;
      killer.run.coins += mob.stolen;
      this._event({ kind: 'loot', mob, tower: killer, coins: mob.stolen });
    }
    if (mob.cargo) this._unload(mob, true);
    if (mob.power && mob.power.brood) {
      const hp = waveHp(Math.max(1, this.wave), 'swarm', this.players || 1) * mob.power.hp;
      for (let i = 0; i < mob.power.brood; i++) {
        this.births.push({ spawn: { type: 'swarm', look: lookOf('spiderling'), hp }, d: Math.max(0, mob.d - i * 0.2),
          r: mob.r, at: this.time });
      }
    }
    if (mob.revive > 0 && !(killer && killer.cls.id === 'healer')) {
      const spawn = { type: mob.type, kind: mob.kind, look: mob.kind ? null : lookOfMob(mob), hp: mob.max };
      this.births.push({ spawn, d: mob.d, r: mob.r, at: this.time + REVIVE_TIME, risen: true,
        raise: mob.power && mob.power.raise || 0 });
    } else if (this.rules.rise && !mob.risen && !mob.fake && !BODILESS.has(mob.look)
      && !(killer && killer.cls.id === 'healer')) {
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
      const type = SLIMES[pieces - 1], look = LOOKS[type].find((item) => item.slime === pieces);
      for (const shift of [-SPLIT_GAP, SPLIT_GAP]) {
        const hp = waveHp(Math.max(1, this.wave), type, this.players || 1) * Math.max(FLOOR, 1 + this.foe.hp);
        this.births.push({ spawn: { type, look, hp }, d: Math.max(0, mob.d + shift), r: mob.r, at: this.time });
      }
    }
    if (mob.poison) {
      for (const dose of mob.poison.values()) {
        const t = dose.tower;
        if (!t.p.contagion || this.random() >= t.p.contagion) continue;
        const next = this._nearest(mob.x, mob.y, CONTAGION_RANGE, new Set([mob]));
        if (!next) continue;
        if (!next.poison) next.poison = new Map();
        next.poison.set(t, { tower: t, dps: dose.dps, stacks: dose.stacks, until: this.time + t.p.puddleTime });
      }
    }
    if (mob.burn) {
      for (const fire of mob.burn.values()) {
        const t = fire.tower;
        if (!t.p.ash) continue;
        this._event({ kind: 'boom', tower: t, x: mob.x, y: mob.y, radius: t.p.ashRange });
        for (const other of this.mobs) {
          if (!other.dead && near(other, mob.x, mob.y, t.p.ashRange)) this._hurt(other, t.damage * t.p.ash, t, 'fire');
        }
      }
    }
  }

  reward(t, xp) {
    this._grant(t, xp);
  }

  _grant(t, xp) {
    const bonus = t.unique === 'scholar' ? t.boon.values.xp : 0;
    const amount = xp * Math.max(0, 1 + t.buff.xp + t.mods.xp + bonus);
    t.player.xp += amount;
    t.run.xp += amount;
    if (this.towers.includes(t)) this._level(t);
    if (!t.p.share || amount <= xp) return;
    for (const muse of t.muses) {
      if (!this.towers.includes(muse)) continue;
      muse.player.xp += amount - xp;
      muse.run.xp += amount - xp;
      this._level(muse);
    }
  }

  _blast(t, x, y, radius, damage, skip) {
    this._event({ kind: 'boom', tower: t, x, y, radius });
    for (const mob of this.mobs) {
      if (mob !== skip && !mob.dead && near(mob, x, y, radius)) this._hurt(mob, damage, t);
    }
  }
}

const plain = (b, t, target, damage) => b._hurt(target, damage, t);

function snipe(b, t, target, damage, now) {
  const p = t.p, dx = target.x - t.cx, dy = target.y - t.cy, length = Math.hypot(dx, dy) || 1;
  const ux = dx / length, uy = dy / length, reach = Math.max(length, t.range * PIERCE_REACH);
  const along = (mob) => (mob.x - t.cx) * ux + (mob.y - t.cy) * uy;
  const line = b.mobs.filter((mob) => !mob.dead && along(mob) >= length - 0.05 && along(mob) <= reach
    && Math.abs((mob.x - t.cx) * uy - (mob.y - t.cy) * ux) <= PIERCE_WIDTH).sort((m, n) => along(m) - along(n));
  const head = p.crit && b.random() < p.crit;
  b._event({ kind: 'shot', tower: t, x: t.cx + ux * reach, y: t.cy + uy * reach, crit: head, mob: target });
  let power = head ? damage * p.critMul : damage;
  for (const mob of line.includes(target) ? line : [target].concat(line)) {
    b._hurt(mob, power, t);
    power *= p.pierce;
  }
  if (p.mark && !target.dead) {
    if (target.markUntil <= now || p.mark > target.mark) target.mark = p.mark;
    target.markUntil = now + p.markTime;
  }
}

function gun(b, t, target, damage) {
  const p = t.p;
  if (t.rampTarget === target) t.ramp = Math.min(p.rampMax, t.ramp + p.ramp);
  else {
    t.rampTarget = target;
    t.ramp = 0;
  }
  b._hurt(target, damage, t);
  if (p.ricochet && b.random() < p.ricochet) {
    const next = b._nearest(target.x, target.y, RICOCHET_RANGE, new Set([target]));
    if (next) b._hurt(next, damage, t);
  }
}

const ATTACKS = {
  sniper(b, t, target, damage, now) {
    snipe(b, t, target, damage, now);
    const second = t.p.twin ? b._target(t, target) : null;
    if (second) snipe(b, t, second, damage, now);
  },
  gunner: gun,
  bomber(b, t, target, damage, now) {
    const p = t.p, x = target.x, y = target.y;
    b._hurt(target, damage, t);
    b._blast(t, x, y, p.splash, damage * p.splashShare, target);
    if (p.cluster && b.random() < p.cluster) {
      for (let i = 0; i < CLUSTER.count; i++) {
        const angle = b.random() * Math.PI * 2, distance = b.random() * CLUSTER.spread;
        b._blast(t, x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, CLUSTER.radius,
          damage * CLUSTER.share, null);
      }
    }
    if (p.napalm) {
      b.patches.push({ x, y, radius: p.napalmRadius, dps: damage * p.napalm, until: now + p.napalmTime, tower: t });
    }
  },
  thunder(b, t, target, damage) {
    const p = t.p, struck = new Set(), points = [[t.cx, t.cy]];
    let mob = target, power = damage;
    for (let jump = 0; mob && jump <= p.jumps; jump++) {
      struck.add(mob);
      points.push([mob.x, mob.y]);
      b._hurt(mob, power, t);
      if (p.stun && !mob.dead && !immune(mob, 'storm') && b.random() < p.stun) b._hold(mob, p.stunTime, t);
      power *= p.falloff;
      mob = b._nearest(mob.x, mob.y, p.jumpRange, struck);
    }
    b._event({ kind: 'chain', tower: t, points });
  },
  alchemist(b, t, target, damage, now) {
    b.flasks.push({ tower: t, x: target.x, y: target.y, at: now + FLASK_FLIGHT, dps: damage * t.p.poison });
    b._event({ kind: 'flask', tower: t, x: target.x, y: target.y, time: FLASK_FLIGHT });
  },
  hunter(b, t, target, damage) {
    const p = t.p;
    b._hurt(target, damage * (big(target) ? p.bigMul : 1), t);
    if (p.execute && !target.dead && !target.info.boss && target.hp <= target.max * p.execute) {
      b._event({ kind: 'execute', mob: target, tower: t });
      b._slay(target, t);
    }
  },
  healer(b, t, target, damage) {
    b._hurt(target, damage * (target.undead ? t.p.holyMul : 1), t);
  },
  frost(b, t, target, damage) {
    const p = t.p;
    b._event({ kind: 'nova', tower: t, radius: p.chillRange });
    for (const mob of b.mobs) {
      if (mob.dead || !near(mob, t.cx, t.cy, p.chillRange)) continue;
      b._hurt(mob, damage, t);
      if (p.freeze && !mob.dead && !immune(mob, 'ice') && b.random() < p.freeze) b._hold(mob, p.freezeTime, t);
    }
  },
  earth(b, t, target, damage) {
    const p = t.p;
    b._event({ kind: 'spikes', tower: t, x: target.x, y: target.y, radius: p.spikes });
    for (const mob of b.mobs) {
      if (!mob.dead && !mob.flying && near(mob, target.x, target.y, p.spikes)) b._hurt(mob, damage, t);
    }
  },
  shaman(b, t, target, damage, now) {
    const p = t.p;
    b.whirls.push({ tower: t, d: target.d, r: target.r, speed: p.whirlSpeed, until: now + p.whirlTime, damage,
      hit: new Set() });
    b._event({ kind: 'whirl', tower: t, mob: target });
    if (p.tornado && b.random() < p.tornado) {
      b._event({ kind: 'tornado', tower: t });
      for (const mob of b.mobs) if (!mob.dead && near(mob, t.cx, t.cy, t.range)) b._push(mob, p.tornadoPush, t);
    }
  },
  parasite(b, t, target, damage) {
    const p = t.p;
    if (p.oneshot && b.random() < p.oneshot * (target.info.boss ? 0.5 : 1)) {
      b._event({ kind: 'execute', mob: target, tower: t });
      b._slay(target, t);
      return;
    }
    b._hurt(target, p.crit && b.random() < p.crit ? damage * p.critMul : damage, t);
  },
  pyro: plain,
};
