import { Battle } from './battle.js';
import { makeMap, parseCell, parseMove } from './field.js';
import { CLASSES, CLASS_BY_ID } from './classes.js';
import { LEVEL_MAX, TICK, levelOf, waveReward } from './balance.js';
import { DIVINE, PRICE, SHOW_FAST, SHOW_TIME, SLOTS, SPIN_TIME, UPGRADE_PRICE, rankOf, spin, upgrade,
  weaponStats } from './gacha.js';
import { LASTING, effectOf, rollEvent } from './events.js';

export const COMMANDS = new Map([
  ['!чатоборона-пауза', 'pause'],
  ['!чатоборона-дальше', 'next'],
  ['!чатоборона-заново', 'restart'],
  ['!чатоборона-сброс', 'reset'],
  ['!чатоборона', 'rules'],
]);
export const ACTIONS = new Map([
  ['гача', 'spin'],
  ['профиль', 'card'],
  ['проф', 'brief'],
  ['улучшить', 'upgrade'],
  ['реролл', 'reroll'],
]);
export const STARS = new Map([
  ['sumaizu', 'rainbow'],
  ['sukoshissrb', 'white'],
  ['fra3a', 'thyme'],
  ['welovegames', 'heart'],
  ['higashi_vo', 'snow'],
]);
export const BOTS = [
  'nightbot', 'streamelements', 'streamlabs', 'moobot', 'fossabot', 'wizebot', 'jeetbot', 'soundalerts', 'sery_bot',
  'kofistreambot', 'tangiabot', 'botisimo', 'lumiastream', 'streamstickers', 'creatisbot', 'own3d', 'dixperbro',
  'pokemoncommunitygame', 'songlistbot', 'pretzelrocks', 'restreambot', 'commanderroot', 'frostytoolsdotcom',
];
export const OVER_TIME = 15;
export const CARD_TIME = 24;
export const CARD_MIN = 10;
export const CARD_ROOM = 2;
export const SPIN_LIMIT = 5;
export const NOTE_TIME = 4;
export const QUICK_WAVE = 10;
export const QUICK_PAUSE = 5;
export const ASCEND_TIME = 16;

const STEP_MAX = 1;
const EVENTS_MAX = 500;
const NO_MODS = { damage: 0, rate: 0, range: 0, crit: 0, xp: 0, coins: 0 };
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const INVISIBLE = /[\u200B\u200C\u200D\u2060\uFEFF\u00AD\u034F\u2800\u{E0000}]/gu;
const IGNORED = new Set(BOTS);
const NEAR_PATH = 1.5;

const byText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

function addMods(total, mods) {
  if (!mods) return total;
  for (const key of Object.keys(NO_MODS)) total[key] += mods[key] || 0;
  return total;
}

export function nextReset(since, mode, hour = 0, hours = 12) {
  if (mode === 'timer') return since + Math.max(1, hours) * 3600;
  if (mode !== 'day' && mode !== 'week' && mode !== 'month') return null;
  const from = new Date(since * 1000);
  if (isNaN(from.getTime())) return null;
  const year = from.getFullYear(), month = from.getMonth(), day = from.getDate();
  let due;
  if (mode === 'day') {
    due = new Date(year, month, day, hour);
    if (due <= from) due = new Date(year, month, day + 1, hour);
  } else if (mode === 'week') {
    const monday = day - (from.getDay() + 6) % 7;
    due = new Date(year, month, monday, hour);
    if (due <= from) due = new Date(year, month, monday + 7, hour);
  } else {
    due = new Date(year, month, 1, hour);
    if (due <= from) due = new Date(year, month + 1, 1, hour);
  }
  return due.getTime() / 1000;
}

export class Profiles {
  constructor(storage = null, key = 'chatoborona.players') {
    this.storage = storage;
    this.key = key;
    this.data = new Map();
    this.best = { waves: 0, at: null, players: 0 };
    this.since = null;
    if (!storage) return;
    try {
      const saved = JSON.parse(storage.getItem(key) || '{}');
      for (const [login, entry] of Object.entries(saved.players || {})) {
        if (!entry || typeof entry !== 'object') continue;
        this.data.set(login, {
          name: String(entry.name || login),
          xp: Math.max(0, Number(entry.xp) || 0),
          kills: Math.max(0, Math.trunc(Number(entry.kills) || 0)),
          assists: Math.max(0, Math.trunc(Number(entry.assists) || 0)),
          paragon: Math.max(0, Math.trunc(Number(entry.paragon) || 0)),
          particle: entry.particle === true,
        });
      }
      const best = saved.best || {};
      this.best = { waves: Math.max(0, Math.trunc(Number(best.waves) || 0)), at: Number(best.at) || null,
        players: Math.max(0, Math.trunc(Number(best.players) || 0)) };
      const since = Number(storage.getItem(key + '.since'));
      this.since = Number.isFinite(since) && since > 0 ? since : null;
    } catch (error) {
      this.data = new Map();
      this.best = { waves: 0, at: null, players: 0 };
      this.since = null;
    }
  }

  get size() {
    return this.data.size;
  }

  get(login) {
    return this.data.get(login) || null;
  }

  update(member) {
    this.data.set(member.login, { name: member.name, xp: member.xp, kills: member.kills, assists: member.assists,
      paragon: member.paragon || 0, particle: Boolean(member.particle) });
  }

  record(waves, players, at) {
    if (waves <= this.best.waves) return false;
    this.best = { waves, at, players };
    return true;
  }

  reset(now) {
    this.data = new Map();
    this.best = { waves: 0, at: null, players: 0 };
    if (now !== undefined && now !== null) this.since = now;
    this.save();
  }

  mark(now) {
    this.since = now;
    this.save();
  }

  top(field, count) {
    const rows = Array.from(this.data, ([login, entry]) => ({ login, name: entry.name, value: entry[field] }))
      .filter((row) => row.value > 0)
      .sort((a, b) => b.value - a.value || byText(a.name.toLowerCase(), b.name.toLowerCase()));
    return count === undefined ? rows : rows.slice(0, count);
  }

  save() {
    if (!this.storage) return;
    try {
      const players = {};
      for (const [login, entry] of this.data) {
        players[login] = { name: entry.name, xp: Math.round(entry.xp * 100) / 100, kills: entry.kills,
          assists: entry.assists };
        if (entry.paragon) players[login].paragon = entry.paragon;
        if (entry.particle) players[login].particle = true;
      }
      this.storage.setItem(this.key, JSON.stringify({ players, best: this.best }));
      if (this.since === null) this.storage.removeItem(this.key + '.since');
      else this.storage.setItem(this.key + '.since', String(this.since));
    } catch (error) {
      this.storage = null;
    }
  }
}

export class Game {
  constructor(settings, profiles = null, { random = Math.random, clock = () => Date.now() / 1000,
    quiet = false } = {}) {
    this.s = Object.assign({}, settings);
    this.profiles = profiles || new Profiles();
    this.random = random;
    this.clock = clock;
    this.quiet = quiet;
    this.state = 'stopped';
    this.paused = false;
    this.left = 0;
    this.members = new Map();
    this.battle = null;
    this.wave = 0;
    this.games = 0;
    this.run = null;
    this.results = null;
    this.ascents = [];
    this.queue = [];
    this.slots = Array(SLOTS).fill(null);
    this.notes = [];
    this.cards = [];
    this.rulesShown = false;
    this.cardRoom = CARD_ROOM;
    this.events = [];
    this._noteNo = 0;
    this._spinNo = 0;
    this._carry = 0;
    this._resetDue = null;
    this._planReset();
  }

  open() {
    if (this.state !== 'stopped') return false;
    this.paused = false;
    this._lobby();
    return true;
  }

  stop() {
    if (this.state === 'stopped') return;
    this._saveAll();
    this.state = 'stopped';
    this.paused = false;
    this.battle = null;
    this.queue = [];
    this.slots = Array(SLOTS).fill(null);
    this._emit('stopped');
  }

  pause() {
    return this.setPaused(!this.paused);
  }

  showRules() {
    if (this.state === 'stopped') return false;
    this.rulesShown = true;
    this.setPaused(true);
    return true;
  }

  setPaused(paused) {
    if (this.state === 'stopped' || this.paused === paused) return false;
    this.paused = paused;
    if (!paused) this.rulesShown = false;
    this._emit(paused ? 'paused' : 'resumed');
    return true;
  }

  next() {
    if (this.state === 'stopped' || this.state === 'wave') return false;
    this.left = 0;
    return true;
  }

  restart() {
    if (this.state === 'stopped') return false;
    this._saveAll();
    this.paused = false;
    this._lobby();
    return true;
  }

  resetScores(now = this.clock()) {
    this.profiles.reset(now);
    for (const member of this.members.values()) {
      member.xp = 0;
      member.kills = 0;
      member.assists = 0;
      member.paragon = 0;
      member.particle = false;
      if (member.tower && this.battle) this.battle.refresh(member.tower);
    }
    this._planReset();
    this._emit('reset');
  }

  configure(settings) {
    const before = this.s;
    this.s = Object.assign({}, settings);
    const changed = (...keys) => keys.some((key) => before[key] !== this.s[key]);
    if (changed('reset_mode', 'reset_hour', 'reset_hours') && this.profiles.since !== null) {
      this.profiles.mark(this.clock());
    }
    this._planReset();
  }

  step(dt) {
    if (this._resetDue !== null && this.clock() >= this._resetDue) this.resetScores();
    if (this.state === 'stopped' || this.paused) return;
    this._carry += Math.min(Math.max(0, dt), STEP_MAX);
    while (this._carry >= TICK) {
      this._carry -= TICK;
      this._tick(TICK);
      if (this.state === 'stopped' || this.paused) {
        this._carry = 0;
        break;
      }
    }
  }

  join(login, name = login, { color = null, cell = null } = {}) {
    if (this.state === 'stopped' || this.state === 'over' || this.state === 'ascend') return null;
    login = String(login || '').toLowerCase();
    if (!login) return null;
    let member = this.members.get(login);
    if (member) {
      member.name = name;
      return member;
    }
    const saved = this.profiles.get(login);
    member = {
      login, name, color: COLOR_RE.test(String(color || '')) ? color : null,
      star: STARS.has(login) ? STARS.get(login) : null,
      xp: saved ? saved.xp : 0, kills: saved ? saved.kills : 0, assists: saved ? saved.assists : 0,
      paragon: saved ? saved.paragon : 0, particle: saved ? saved.particle : false, coins: 0,
      cls: this._randomClass(), weapon: null, runes: [], tower: null, pendingMove: null,
    };
    this.members.set(login, member);
    this.profiles.update(member);
    if (this.battle) this._place(member, cell && this.movable && this.battle.free(cell.x, cell.y) ? cell : null);
    this._emit('join', { login, name });
    return member;
  }

  feed(user, text, { mod = false, login = null, color = null } = {}) {
    const name = String(user || '').trim();
    const message = String(text || '').normalize('NFC').replace(INVISIBLE, '').trim();
    login = String(login || name).toLowerCase();
    if (!name || !message || IGNORED.has(login)) return null;
    if (this.state === 'stopped') return null;
    const words = message.toLowerCase().split(/\s+/), word = words[0];
    const action = ACTIONS.get(word.replace(/^!/, '')), cell = action ? null : parseCell(message);
    const move = action || cell ? null : parseMove(message);
    const amount = words.slice(1).find((part) => /^\d+$/.test(part) || part === 'все' || part === 'всё');
    const all = amount === 'все' || amount === 'всё', count = all ? Infinity : Math.max(1, Number(amount) || 1);
    const member = this.join(login, name, { color, cell: cell && this.movable ? cell : null });
    let done = null;
    if (COMMANDS.has(word)) {
      done = mod && this.s.chat_commands ? this._control(COMMANDS.get(word)) : null;
    } else if (action === 'spin') {
      done = this.order(member, Math.min(SPIN_LIMIT, count));
    } else if (action === 'card' || action === 'brief') {
      done = member ? this._card(member, action === 'brief') : null;
    } else if (action === 'reroll') {
      done = this.reroll(member);
    } else if (action === 'upgrade') {
      done = this.improve(member, count);
    } else if (cell) {
      done = this.goTo(member, cell.x, cell.y) ? 'move' : this._later(member, cell);
    } else if (move && this.s.channel && login === this.s.channel) {
      done = this._shift(move.from, move.to);
    }
    return done;
  }

  get movable() {
    return Boolean(this.battle) && (this.state === 'placing' || this.state === 'break');
  }

  goTo(member, x, y) {
    if (!member || !this.movable || member.cls && CLASS_BY_ID.get(member.cls).rider) return false;
    if (member.tower && member.tower.x === x && member.tower.y === y) return true;
    if (member.tower) return this.battle.move(member.tower, x, y);
    return Boolean(this._place(member, { x, y }));
  }

  improve(member, times = 1) {
    if (!member || !this.battle) return null;
    if (!member.weapon) {
      this._note('bare', member);
      return 'poor';
    }
    if (member.coins < UPGRADE_PRICE) {
      this._note('poor', member, NOTE_TIME, { price: UPGRADE_PRICE });
      return 'poor';
    }
    const ups = new Map();
    let done = 0, ascended = false;
    for (; done < times && member.coins >= UPGRADE_PRICE; done++) {
      member.coins -= UPGRADE_PRICE;
      const up = upgrade(this.random, member.weapon);
      if (up.ascended) ascended = true;
      ups.set(up.id, Math.round(((ups.get(up.id) || 0) + up.amount) * 100) / 100);
    }
    this._refresh(member);
    const list = Array.from(ups, ([id, amount]) => ({ id, amount }));
    this._note('upgrade', member, NOTE_TIME, { ups: list, times: done });
    this._emit('upgraded', { login: member.login, ups: list });
    if (ascended) this._emit('divine', { login: member.login });
    return ascended ? 'divine' : 'upgraded';
  }

  _shift(from, to) {
    const tower = this.battle ? this.battle.towerAt(from.x, from.y) : null;
    if (!tower) return null;
    return this.goTo(tower.player, to.x, to.y) ? 'move' : this._later(tower.player, to);
  }

  reroll(member) {
    if (!member || member.rerolled || this.state !== 'lobby' && this.state !== 'placing') return null;
    let cls = member.cls;
    while (cls === member.cls) cls = this._randomClass();
    member.cls = cls;
    member.rerolled = true;
    member.runes = [];
    if (member.tower) {
      const cell = member.tower.rider ? null : { x: member.tower.x, y: member.tower.y };
      this.battle.remove(member.tower);
      member.tower = null;
      this._place(member, cell);
    }
    this._emit('rerolled', { login: member.login, cls });
    return this._card(member, false) && 'reroll';
  }

  _later(member, cell) {
    if (!member || !member.tower || this.state !== 'wave' || member.tower.rider) return null;
    if (!this.battle.free(cell.x, cell.y)) return null;
    member.pendingMove = { x: cell.x, y: cell.y };
    return 'later';
  }

  order(member, count = 1) {
    if (!member || !this.battle) return null;
    const spins = Math.min(count, Math.floor(member.coins / PRICE));
    if (spins < 1) {
      this._note('poor', member, NOTE_TIME, { price: PRICE });
      return 'poor';
    }
    member.coins -= spins * PRICE;
    this.queue.push({ login: member.login, count: spins });
    this._emit('queued', { login: member.login });
    return 'queued';
  }

  get price() {
    return PRICE;
  }

  modsOf(member) {
    const total = Object.assign({}, NO_MODS);
    if (this.run) {
      for (const effect of this.run.now) addMods(total, effect.mods);
      addMods(total, this.run.mods);
    }
    total.stats = member.weapon ? weaponStats(member.weapon) : null;
    total.runes = (member.runes || []).slice();
    total.paragon = member.paragon || 0;
    return total;
  }

  _control(command) {
    if (command === 'pause') return this.pause() ? 'pause' : null;
    if (command === 'rules') return this.showRules() ? 'rules' : null;
    if (command === 'next') return this.next() ? 'next' : null;
    if (command === 'restart') return this.restart() ? 'restart' : null;
    if (command === 'reset') {
      this.resetScores();
      return 'reset';
    }
    return null;
  }

  _randomClass() {
    return CLASSES[Math.floor(this.random() * CLASSES.length)].id;
  }

  _emit(kind, details = {}) {
    if (this.quiet) return;
    this.events.push(Object.assign({ kind }, details));
    if (this.events.length > EVENTS_MAX) this.events.splice(0, this.events.length - EVENTS_MAX / 2);
  }

  _note(kind, member, time = NOTE_TIME, detail = null) {
    if (this.quiet) return;
    this.notes = this.notes.filter((note) => note.login !== member.login || note.kind !== kind);
    this.notes.push({ kind, login: member.login, left: time, detail, id: ++this._noteNo });
  }

  _card(member, brief) {
    const shown = this._shownCards(), own = shown.find((note) => note.login === member.login);
    const waiting = this.cards.find((card) => card.login === member.login);
    if (own) Object.assign(own, { left: CARD_TIME, since: 0, detail: { brief } });
    else if (waiting) waiting.brief = brief;
    else if (shown.length >= this.cardRoom) this.cards.push({ login: member.login, brief });
    else this._showCard(member.login, brief);
    this._emit('card', { login: member.login });
    return 'card';
  }

  _showCard(login, brief) {
    const note = { kind: 'card', login, left: CARD_TIME, since: 0, detail: { brief }, id: ++this._noteNo };
    this.notes.push(note);
    return note;
  }

  _shownCards() {
    return this.notes.filter((note) => note.kind === 'card');
  }

  _turnCards() {
    const shown = this._shownCards(), room = Math.max(1, this.cardRoom);
    while (shown.length > room) {
      const last = shown.pop();
      this.notes.splice(this.notes.indexOf(last), 1);
      this.cards.unshift({ login: last.login, brief: last.detail.brief });
    }
    while (this.cards.length && shown.length < room) {
      const next = this.cards.shift();
      if (this.members.has(next.login)) shown.push(this._showCard(next.login, next.brief));
    }
  }

  _planReset() {
    const since = this.profiles.since;
    if (this.s.reset_mode === 'never' || !this.s.reset_mode) {
      this._resetDue = null;
      return;
    }
    if (since === null) {
      this.profiles.mark(this.clock());
      this._resetDue = nextReset(this.profiles.since, this.s.reset_mode, this.s.reset_hour, this.s.reset_hours);
      return;
    }
    this._resetDue = nextReset(since, this.s.reset_mode, this.s.reset_hour, this.s.reset_hours);
  }

  _saveAll() {
    for (const member of this.members.values()) this.profiles.update(member);
    this.profiles.save();
  }

  _lobby() {
    this.games += 1;
    this.state = 'lobby';
    this.left = this.s.lobby;
    this.battle = null;
    this.wave = 0;
    this.results = null;
    this.ascents = [];
    this.queue = [];
    this.slots = Array(SLOTS).fill(null);
    this.run = { number: this.games, mods: Object.assign({}, NO_MODS), foe: { hp: 0, speed: 0 }, lives: 0,
      effects: [], now: [], next: [], started: null };
    this.members = new Map();
    this._emit('lobby');
  }

  _placing() {
    this.battle = new Battle(makeMap(this.random), { random: this.random, quiet: this.quiet });
    this.battle.foe = this.run.foe;
    this._shiftLives(this.run.lives);
    for (const member of this.members.values()) this._place(member);
    this.state = 'placing';
    this.left = this.s.first_wave;
    this._planEvent();
    this._emit('map');
  }

  _place(member, cell = null) {
    if (cell && !this.battle.free(cell.x, cell.y)) return null;
    const spot = cell || this.battle.randomCell(NEAR_PATH);
    if (!spot) return null;
    member.tower = this.battle.place(member, member.cls, spot.x, spot.y, this.modsOf(member));
    return member.tower;
  }

  _refresh(member) {
    if (member.tower && this.battle) this.battle.setMods(member.tower, this.modsOf(member));
  }

  _shiftLives(amount) {
    if (!amount || !this.battle) return;
    if (amount > 0) this.battle.maxLives += amount;
    this.battle.lives = Math.max(1, Math.min(this.battle.maxLives, this.battle.lives + amount));
  }

  _startWave() {
    this.wave += 1;
    this.state = 'wave';
    if (this.run.started === null) this.run.started = this.battle.time;
    this.run.now = this.run.next.filter((effect) => !LASTING.has(effect.kind));
    for (const effect of this.run.next.filter((known) => LASTING.has(known.kind))) this._lasting(effect);
    this.run.next = [];
    const sleep = Math.max(0, ...this.run.now.map((effect) => effect.sleep || 0));
    for (const member of this.members.values()) {
      if (!member.tower) continue;
      this._refresh(member);
      if (!sleep) continue;
      member.tower.busy = Math.max(member.tower.busy, this.battle.time + sleep);
      member.tower.napUntil = this.battle.time + sleep;
    }
    this.battle.startWave(this.wave, this.battle.towers.length);
    this._emit('wave', { wave: this.wave });
  }

  _endWave() {
    this.battle.endWave();
    if (this.run.now.length) {
      this.run.now = [];
      for (const member of this.members.values()) this._refresh(member);
    }
    const reward = waveReward(this.wave);
    for (const member of this.members.values()) {
      if (!member.tower) continue;
      member.coins += reward.coins;
      member.tower.run.coins += reward.coins;
      this.battle.reward(member.tower, reward.xp);
    }
    this._saveAll();
    this.state = 'break';
    const quick = this.battle.time - this.battle.lastSpawn < QUICK_WAVE;
    this.left = quick ? Math.min(QUICK_PAUSE, this.s.wave_pause) : this.s.wave_pause;
    this._planEvent();
    if (this.battle.treasures) {
      this.battle.treasures = 0;
      this.run.next.push(Object.assign({ kind: 'buff', treasure: true }, effectOf('buff', 'gold')));
      this._emit('event', { type: 'buff', id: 'gold' });
    }
    for (const member of this.members.values()) {
      if (!member.pendingMove) continue;
      this.goTo(member, member.pendingMove.x, member.pendingMove.y);
      member.pendingMove = null;
    }
    this._emit('cleared', { wave: this.wave, coins: reward.coins, xp: reward.xp });
  }

  _over() {
    const passed = this.wave - 1, players = this.battle.towers.length;
    const record = this.profiles.record(passed, players, this.clock());
    this._saveAll();
    const rows = Array.from(this.members.values()).filter((m) => m.tower).map((m) => ({
      login: m.login, name: m.name, cls: m.cls, kills: m.tower.run.kills, assists: m.tower.run.assists,
      damage: m.tower.run.damage,
    }));
    this.results = { passed, players, record, time: this.battle.time - this.run.started, rows };
    this.ascents = this._ascents();
    this._saveAll();
    this.state = this.ascents.length ? 'ascend' : 'over';
    this.left = this.ascents.length ? ASCEND_TIME * this.ascents.length : OVER_TIME;
    this.queue = [];
    this.slots = Array(SLOTS).fill(null);
    for (const member of this.members.values()) member.pendingMove = null;
    this._emit('over', { passed, record });
    for (const ascent of this.ascents) this._emit('paragon', { login: ascent.login, paragon: ascent.to });
  }

  _ascents() {
    const ascents = [];
    for (const member of this.members.values()) {
      const weapon = member.weapon;
      if (levelOf(member.xp) < LEVEL_MAX || !member.particle || !weapon || weapon.rarity !== DIVINE.id) continue;
      ascents.push({ login: member.login, name: member.name, star: member.star, color: member.color, cls: member.cls,
        from: member.paragon, to: member.paragon + 1 });
      member.paragon += 1;
      member.xp = 0;
      member.particle = false;
      this.profiles.update(member);
    }
    if (ascents.length) this.profiles.save();
    return ascents;
  }

  get ascent() {
    if (this.state !== 'ascend' || !this.ascents.length) return null;
    const count = this.ascents.length, elapsed = Math.max(0, ASCEND_TIME * count - this.left);
    const index = Math.min(count - 1, Math.floor(elapsed / ASCEND_TIME));
    return Object.assign({ index, t: elapsed - index * ASCEND_TIME }, this.ascents[index]);
  }

  _tick(dt) {
    this._gacha(dt);
    if (this.notes.length) {
      for (const note of this.notes) {
        note.left -= dt;
        if (note.kind === 'card') note.since += dt;
      }
      const shown = this._shownCards();
      if (this.cards.length && shown.length >= this.cardRoom) {
        shown.filter((note) => note.since >= CARD_MIN).sort((a, b) => b.since - a.since).slice(0, this.cards.length)
          .forEach((note) => {
            note.left = 0;
          });
      }
      this.notes = this.notes.filter((note) => note.left > 0);
    }
    this._turnCards();
    if (this.battle && this.state !== 'over' && this.state !== 'ascend') this.battle.step(dt);
    if (this.state === 'wave') {
      if (this.battle.lives <= 0) this._over();
      else if (this.battle.cleared) this._endWave();
      return;
    }
    this.left -= dt;
    if (this.left > 0) return;
    if (this.state === 'lobby') this._placing();
    else if (this.state === 'placing' || this.state === 'break') this._startWave();
    else if (this.state === 'ascend') {
      this.state = 'over';
      this.left = OVER_TIME;
    } else if (this.state === 'over') this._lobby();
  }

  _gacha(dt) {
    this.slots.forEach((slot, i) => {
      if (!slot) return;
      slot.left -= dt;
      if (slot.phase === 'spin') {
        if (slot.left <= 0) this._apply(slot);
        return;
      }
      if (slot.left <= 0) this.slots[i] = null;
    });
    for (let i = 0; i < this.slots.length && this.queue.length && this.battle; i++) {
      if (this.slots[i]) continue;
      const spinning = new Set(this.slots.filter(Boolean).map((slot) => slot.login));
      const next = Math.max(0, this.queue.findIndex((entry) => !spinning.has(entry.login)));
      const entry = this.queue[next], member = this.members.get(entry.login);
      entry.count -= 1;
      if (entry.count <= 0) this.queue.splice(next, 1);
      if (!member) continue;
      this.slots[i] = { id: ++this._spinNo, login: member.login, outcome: spin(this.random, member.cls,
        { particle: member.particle, runes: member.runes.length }), phase: 'spin', left: SPIN_TIME };
      this._emit('spin', { login: member.login });
    }
  }

  _planEvent() {
    const event = rollEvent(this.random);
    this.run.next = event ? [event] : [];
    if (event) this._emit('event', { type: event.kind, id: event.id });
  }

  _apply(slot) {
    const member = this.members.get(slot.login), outcome = slot.outcome, weapon = outcome.weapon;
    slot.phase = 'show';
    slot.left = this.queue.length ? SHOW_FAST : SHOW_TIME;
    if (!member) return;
    if (outcome.kind === 'void') {
      slot.took = false;
      this._emit('void', { login: member.login });
      return;
    }
    if (outcome.kind === 'particle') {
      slot.took = true;
      member.particle = true;
      this.profiles.update(member);
      this.profiles.save();
      this._emit('particle', { login: member.login });
      return;
    }
    if (outcome.kind === 'rune') {
      const missing = CLASS_BY_ID.get(member.cls).runes.filter((rune) => !member.runes.includes(rune.id));
      slot.took = missing.length > 0;
      if (!slot.took) return;
      slot.rune = missing[Math.floor(this.random() * missing.length)].id;
      member.runes.push(slot.rune);
      this._refresh(member);
      this._emit('rune', { login: member.login, rune: slot.rune });
      return;
    }
    if (outcome.coins) {
      slot.took = true;
      slot.coins = outcome.coins;
      member.coins += slot.coins;
      this._emit('jackpot', { login: member.login, coins: slot.coins, prize: outcome.kind });
      return;
    }
    slot.took = !member.weapon || rankOf(weapon) >= rankOf(member.weapon);
    if (slot.took) {
      member.weapon = weapon;
      this._refresh(member);
    }
    this._emit(slot.took ? 'took' : 'kept', { login: member.login });
  }

  _lasting(effect) {
    this.run.effects.push({ kind: effect.kind, id: effect.id });
    if (effect.mods) addMods(this.run.mods, effect.mods);
    if (effect.foe) {
      this.run.foe.hp += effect.foe.hp || 0;
      this.run.foe.speed += effect.foe.speed || 0;
    }
    if (effect.lives) {
      if (this.battle) this._shiftLives(effect.lives);
      else this.run.lives += effect.lives;
    }
    for (const m of this.members.values()) this._refresh(m);
    this._emit('global', { kind: effect.kind, id: effect.id });
  }
}
