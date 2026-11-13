import { Battle } from '../js/battle.js';
import { BIOMES, cellName, makeMap, parseCell } from '../js/field.js';
import { CLASSES, CLASS_BY_ID, choiceOf, poolOf } from '../js/classes.js';
import { AFFIXES, BIOME_RULES, BOSSES, DIABLO, ELITES, FAMILIES, FAMILY_BY_ID, LOOKS, MIMIC, SILVER, levelOf,
  rollTempo, xpForLevel } from '../js/balance.js';
import { BOONS, DIVINE, OUTCOMES, RARITIES, SPIN_TIME, ascend, makeWeapon } from '../js/gacha.js';
import { LASTING, POOLS, effectOf } from '../js/events.js';
import { PICK_TIME, Profiles } from '../js/engine.js';

const STORE = 'reborn.test.players';
const OWNER = 'test_streamer';
const LOG_SIZE = 40;
const SPAWN_GAP = 0.5;
const GUARD_MS = 250;
const MAP_TRIES = 300;
const TYPES = [['normal', 'Обычные'], ['fast', 'Быстрые'], ['tough', 'Крепкие'], ['swarm', 'Мелочь'],
  ['elite', 'Элитные'], ['boss', 'Боссы']];
const KINDS = [['buff', 'Усиление'], ['debuff', 'Ослабление'], ['blessing', 'Благословение'], ['curse', 'Проклятие']];
const COIN_PRIZES = new Set(OUTCOMES.filter((outcome) => outcome.coins).map((outcome) => outcome.id));

const api = () => window.chatoborona;
const game = () => api().game;
const member = (login) => game().members.get(login) || null;
const brief = (item) => ({ id: item.id, name: item.name });
let log = [];
let immortal = false;
let added = 0;

function storage() {
  try {
    localStorage.getItem(STORE);
    return localStorage;
  } catch (error) {
    return null;
  }
}

function seat(m) {
  const g = game();
  if (!g.battle) return;
  const cell = m.tower && !m.tower.rider ? { x: m.tower.x, y: m.tower.y } : null;
  if (m.tower) g.battle.remove(m.tower);
  m.tower = null;
  if (!m.asleep) g._place(m, cell);
}

function weaponOf(m, rarityId, boonId = '', power = 0) {
  const divine = rarityId === DIVINE.id;
  const rarity = RARITIES.find((item) => item.id === (divine ? 'legendary' : rarityId)) || RARITIES[0];
  const weapon = makeWeapon(Math.random, m.cls, rarity);
  if (boonId && rarity.id === 'legendary') weapon.boon = boonId;
  if (divine) ascend(weapon);
  if (power > 0) weapon.power = power;
  return weapon;
}

function mobKind(type, id) {
  if (type === 'boss') return id === DIABLO.id ? DIABLO : BOSSES.find((boss) => boss.id === id) || BOSSES[0];
  if (type === 'elite') return id === MIMIC.id ? MIMIC : ELITES.find((elite) => elite.id === id) || ELITES[0];
  return null;
}

function refreshAll() {
  const g = game();
  for (const m of g.members.values()) g._refresh(m);
}

const lab = {
  catalog() {
    const mobs = {};
    for (const [type] of TYPES.slice(0, 4)) mobs[type] = LOOKS[type].map(brief);
    mobs.elite = ELITES.concat([MIMIC]).map(brief);
    mobs.boss = BOSSES.concat([DIABLO]).map(brief);
    const pools = {};
    for (const cls of CLASSES) {
      pools[cls.id] = poolOf(cls.id).map((skill) => ({ id: skill.id, name: skill.name, kind: skill.kind,
        style: skill.style || null, max: skill.max || 1 }));
    }
    return {
      classes: CLASSES.map((cls) => ({ id: cls.id, name: cls.name, color: cls.color })), pools, types: TYPES, mobs,
      affixes: AFFIXES.map(brief), rarities: RARITIES.concat([DIVINE]).map(brief), boons: BOONS.map(brief),
      outcomes: OUTCOMES.map(brief), biomes: BIOMES.map((id) => ({ id, name: BIOME_RULES[id].name })),
      families: FAMILIES.map(brief),
      events: KINDS.map(([kind, name]) => ({ kind, name, list: POOLS[kind].map(brief) })),
    };
  },

  info() {
    const g = game(), b = g.battle, choice = g.choice;
    return {
      state: g.state, paused: g.paused, wave: g.wave, left: Math.max(0, Math.ceil(g.left)), speed: g.speed,
      lives: b ? b.lives : null, maxLives: b ? b.maxLives : null, biome: b ? BIOME_RULES[b.biome].name : null,
      mobs: b ? b.mobs.filter((mob) => !mob.dead).length : 0, queued: b ? b.spawns.length : 0,
      routes: b ? b.starts.length : 1, family: b && b.nextFamily ? b.nextFamily.name : null, immortal,
      choice: choice ? { login: choice.login, left: Math.ceil(choice.left), options: g.optionsOf(choice)
        .map((option) => ({ id: option.skill.id, name: option.skill.name, kind: option.skill.kind,
          state: option.state })) } : null,
      effects: g.run ? g.run.now.concat(g.run.next).map((effect) => effect.name).concat(g.run.effects
        .map((effect) => (effectOf(effect.kind, effect.id) || {}).name)) : [],
      players: Array.from(g.members.values()).map((m) => ({
        login: m.login, name: m.name, cls: m.cls, level: levelOf(m.xp), coins: Math.floor(m.coins),
        paragon: m.paragon, particle: m.particle, asleep: m.asleep, skills: m.skills.slice(),
        weapon: m.weapon ? { rarity: m.weapon.rarity, power: m.weapon.power, plus: m.weapon.plus || 0,
          boon: m.weapon.boon || null } : null,
        cell: m.tower && !m.tower.rider ? cellName(m.tower.x, m.tower.y) : null,
      })),
      log: log.slice(),
    };
  },

  start() {
    const g = game();
    g.profiles = new Profiles(storage(), STORE);
    api().start();
    g.s = Object.assign({}, g.s, { channel: OWNER });
    log = [];
  },
  stop: () => api().stop(),
  pause: () => game().pause(),
  next: () => game().next(),
  restart: () => game().restart(),
  resetLevels: () => game().resetScores(),
  setSpeed(speed) {
    game().speed = Math.max(1, Number(speed) || 1);
  },
  setTimer(seconds) {
    game().left = Math.max(0, Number(seconds) || 0);
  },
  setLives(lives) {
    const b = game().battle;
    if (!b) return;
    b.lives = Math.max(1, Math.round(Number(lives) || 1));
    b.maxLives = Math.max(b.maxLives, b.lives);
  },
  setImmortal(on) {
    immortal = Boolean(on);
  },
  startWave(number) {
    const g = game();
    if (number > 0) g.wave = Math.round(number) - 1;
    if (g.state === 'placing' || g.state === 'break') g.left = 0;
  },
  setFamily(id) {
    const b = game().battle;
    if (b) b.nextFamily = FAMILY_BY_ID.get(id) || null;
  },
  lose() {
    const g = game();
    if (!g.battle) return;
    g.battle.lives = 0;
    if (g.state !== 'wave') g._over();
  },
  newMap(biome) {
    const g = game();
    if (g.state === 'stopped' || g.state === 'over' || g.state === 'ascend') return false;
    let plan = makeMap(g.random);
    for (let i = 0; biome && plan.biome !== biome && i < MAP_TRIES; i++) plan = makeMap(g.random);
    g.battle = new Battle(plan, { random: g.random, quiet: g.quiet, tempo: rollTempo(g.random) });
    g.battle.foe = g.run.foe;
    g._shiftLives(g.run.lives);
    for (const m of g.members.values()) {
      m.tower = null;
      if (!m.asleep) g._place(m);
    }
    g.state = 'placing';
    g.left = g.s.first_wave;
    g._planEvent();
    g._emit('map');
    return true;
  },

  say(name, text, { mod = false, owner = false } = {}) {
    const g = game(), nick = owner ? OWNER : String(name || '').trim();
    const result = g.feed(nick, text, { mod: mod || owner, login: nick.toLowerCase() });
    log.push({ name: nick, text: String(text), result: result || '—' });
    if (log.length > LOG_SIZE) log = log.slice(-LOG_SIZE);
    return result;
  },

  addPlayers(count, cls) {
    const g = game(), made = [];
    for (let i = 0; i < count; i++) {
      added += 1;
      const m = g.join('tester_' + added, 'Тестер ' + added);
      if (!m) break;
      if (CLASS_BY_ID.has(cls)) {
        m.cls = cls;
        seat(m);
      }
      made.push(m.login);
    }
    return made;
  },
  setClass(login, cls) {
    const m = member(login);
    if (!m || !CLASS_BY_ID.has(cls)) return;
    m.cls = cls;
    m.skills = [];
    game().choices = game().choices.filter((choice) => choice.login !== login);
    seat(m);
  },
  reroll(login) {
    const m = member(login), g = game();
    if (!m) return null;
    m.skills = [];
    return g.reroll(m);
  },
  setLevel(login, level) {
    const m = member(login), g = game();
    if (!m) return;
    m.xp = xpForLevel(Math.round(Number(level) || 1));
    if (m.tower && g.battle) g.battle.refresh(m.tower);
    g.profiles.update(m);
  },
  setParagon(login, paragon) {
    const m = member(login), g = game();
    if (!m) return;
    m.paragon = Math.max(0, Math.round(Number(paragon) || 0));
    g._refresh(m);
    g.profiles.update(m);
  },
  addCoins(login, amount) {
    const list = login ? [member(login)].filter(Boolean) : Array.from(game().members.values());
    for (const m of list) m.coins = Math.max(0, m.coins + Number(amount || 0));
  },
  clearCoins(login) {
    const m = member(login);
    if (m) m.coins = 0;
  },
  giveWeapon(login, rarity, boon, power) {
    const m = member(login);
    if (!m) return;
    m.weapon = weaponOf(m, rarity, boon, Number(power) || 0);
    game()._refresh(m);
  },
  takeWeapon(login) {
    const m = member(login);
    if (!m) return;
    m.weapon = null;
    game()._refresh(m);
  },
  giveParticle(login) {
    const m = member(login);
    if (m) m.particle = true;
  },
  setSkills(login, ids) {
    const m = member(login);
    if (!m) return;
    const known = new Set(poolOf(m.cls).map((skill) => skill.id));
    m.skills = Array.from(ids).filter((id) => known.has(id));
    game()._refresh(m);
  },
  giveStone(login) {
    const m = member(login), g = game();
    if (!m || !choiceOf(m.cls, m.skills).some((option) => option.state === 'open')) return false;
    g.choices.push({ id: ++g._choiceNo, login, cls: m.cls, left: PICK_TIME, span: PICK_TIME });
    g._emit('stone', { login });
    return true;
  },
  pick(index) {
    const g = game();
    return g.choice ? g._choose(g.choice, index) : null;
  },
  pickRandom() {
    const g = game();
    if (g.choice) g.choice.left = 0;
  },
  dropChoice() {
    game().choices.shift();
  },
  moveTo(login, text) {
    const m = member(login), cell = parseCell(text);
    return Boolean(m && cell && game().goTo(m, cell.x, cell.y));
  },
  sleep(login) {
    const m = member(login), g = game();
    if (m && m.tower && g.battle) g._sleep(m);
  },
  wake(login) {
    const m = member(login);
    if (m) game()._wake(m);
  },
  remove(login) {
    const m = member(login), g = game();
    if (!m) return;
    if (m.tower && g.battle) g.battle.remove(m.tower);
    g.members.delete(login);
    g.choices = g.choices.filter((choice) => choice.login !== login);
  },

  spin(login, count) {
    const m = member(login);
    return m ? game().order(m, Math.max(1, Math.round(Number(count) || 1))) : null;
  },
  forceSpin(login, prize) {
    const m = member(login), g = game();
    if (!m) return false;
    let outcome = { kind: prize };
    if (COIN_PRIZES.has(prize)) {
      const [low, high] = OUTCOMES.find((item) => item.id === prize).coins;
      outcome = { kind: prize, coins: low + Math.floor(Math.random() * (high - low + 1)) };
    } else if (prize.startsWith('weapon:')) {
      outcome = { kind: 'weapon', weapon: weaponOf(m, prize.slice(7)) };
    }
    let slot = g.slots.findIndex((item) => !item);
    if (slot < 0) slot = g.slots.push(null) - 1;
    g.slots[slot] = { id: ++g._spinNo, login, outcome, phase: 'spin', left: SPIN_TIME, span: SPIN_TIME };
    g._emit('spin', { login });
    return true;
  },

  spawn({ type, id, count = 1, affix = '', hp = 1, route = 0 }) {
    const b = game().battle;
    if (!b) return 0;
    const kind = mobKind(type, id), looks = LOOKS[type] || LOOKS.normal;
    const look = kind ? null : looks.find((item) => item.id === id) || looks[0];
    const silver = kind ? null : AFFIXES.find((item) => item.id === affix) || null;
    const r = Math.min(Math.max(0, Math.round(Number(route) || 0)), b.starts.length - 1);
    for (let i = 0; i < count; i++) {
      const spawn = { type, at: b.time + i * SPAWN_GAP, kind, look, r,
        hp: b._waveHp(type) * (kind ? kind.hp || 1 : look.hp || 1) * Math.max(0.01, Number(hp) || 1) };
      if (silver) {
        spawn.silver = silver;
        spawn.hp *= SILVER.hp * (silver.hp || 1);
      }
      b.spawns.push(spawn);
    }
    b.spawns.sort((a, c) => a.at - c.at);
    return count;
  },
  killAll() {
    const b = game().battle;
    if (!b) return;
    for (const mob of b.mobs) {
      mob.dead = true;
      mob.hp = 0;
    }
    b.spawns = [];
    b.births = [];
  },
  clearQueue() {
    const b = game().battle;
    if (b) b.spawns = [];
  },

  eventNext(kind, id) {
    const g = game(), effect = effectOf(kind, id);
    if (!effect || !g.run) return;
    g.run.next = [Object.assign({ kind }, effect)];
    g._emit('event', { type: kind, id });
  },
  eventNow(kind, id) {
    const g = game(), effect = effectOf(kind, id);
    if (!effect || !g.run) return;
    if (LASTING.has(kind)) g._lasting(Object.assign({ kind }, effect));
    else {
      g.run.now.push(Object.assign({ kind }, effect));
      refreshAll();
    }
  },
  clearEvents() {
    const g = game();
    if (!g.run) return;
    g.run.now = [];
    g.run.next = [];
    refreshAll();
  },
};

setInterval(() => {
  const b = api() && game().battle;
  if (immortal && b) b.lives = b.maxLives;
}, GUARD_MS);

window.rebornLab = lab;
