import { Scene } from './draw.js';
import { CLASSES, CLASS_BY_ID, ROLES, describe, num } from './classes.js';
import { coinUrl, crownUrl, effectUrl, heroUrl, markUrl, prizeUrl, shieldUrl } from './sprites.js';
import { OUTCOMES, PRICE, RARITIES, SPIN_TIME, UPGRADE_PRICE, amountText, gearColor, outcomeOf, rarityOf, statName,
  statText, uniqueOf, weaponName } from './gacha.js';
import { effectOf } from './events.js';
import { BIOME_RULES, LEVEL_MAX, LIVES, levelOf, tierOf, towerBase } from './balance.js';
import { SIZE, cellName } from './field.js';
import { SFX_GAPS, play } from './sound.js';
import { PAGES, pageAt } from './guide.js';
import { RULES_TITLE, renderRules } from './rules.js';

const STAGE_WIDTH = 1280, STAGE_HEIGHT = 720;
const PAINT_EVERY = 0.15;
const NAME_TIME = 6;
const RANGE_TIME = 30;
const HERALD_TIME = 10;
const CHEER_TIME = 7;
const CONFETTI = ['#ff6b6b', '#ffd43b', '#69db7c', '#4dabf7', '#da77f2', '#ffa94d', '#ffffff'];
const BIOME_GLOW = { grass: '#4ade80', volcano: '#fb923c', swamp: '#a3e635', snow: '#bae6fd', desert: '#fbbf24',
  graveyard: '#c4b5fd' };
const MAP_TIPS = 'Мобы выходят из двух тоннелей. Горы закрывают выстрел, с холмов бьют дальше, '
  + 'на горы и в воду не встать'
const LOW_LIVES = 5;
const BOSS_EVERY = 10;
const FINAL_SECONDS = 3;
const ROWS = { over: 5, roster: 30, pause: 10, pauseShort: 8, queue: 3, cards: 4, player: 22 };
const CARD_GAP = 6;
const REEL = { cells: 26, result: 21, width: 34 };
const BIG_PRIZES = new Set(['epic', 'legendary']);
const CYCLES = new Map([['rainbow', 2400]]);
const SOUND_PRIORITY = ['over', 'win', 'boss', 'wave', 'jackpot', 'prize', 'upgrade', 'reward', 'meh', 'void', 'level',
  'buff', 'debuff', 'spin', 'leak', 'card', 'tick'];
const SFX_PER_FRAME = 4;
const SHOTS = { sniper: 'crack', gunner: 'gun', bomber: 'launch', hunter: 'bolt', healer: 'holy', parasite: 'bite' };
const BATTLE_SOUNDS = { wall: 'build', crumble: 'crumble', plant: 'plant', mine: 'mine', nuke: 'nuke', leap: 'leap',
  bite: 'chomp', toss: 'launch', flask: 'flask', splash: 'splash', trap: 'plant', snap: 'snap', nova: 'ice',
  muse: 'cast', spikes: 'rock', whirl: 'wind', clink: 'clink', treasure: 'treasure', rattle: 'rattle', rise: 'rise',
  hex: 'hex', blink: 'leap', burrow: 'burrow', leech: 'summon', steal: 'clink', loot: 'treasure', reflect: 'block',
  swallow: 'burrow', breath: 'flame', web: 'hex', ward: 'block', mirage: 'summon', dig: 'burrow', drop: 'summon' };
const GOOD_EVENTS = new Set(['buff', 'blessing']);
const NOTE_KINDS = new Set(['card', 'poor', 'bare', 'upgrade']);
const NEWCOMER_GLOW = { fire: '#f97316', ice: '#67e8f9', storm: '#facc15', poison: '#a3e635' };
const NICK_COLORS = ['#ff8f85', '#ffb547', '#f2dd6e', '#8fe3ae', '#7fd4ff', '#b7a6ff', '#ff9ad5', '#8fe0d2'];
const STATUS = {
  lobby: 'Набор в отряд',
  placing: 'Подготовка',
  break: 'Подготовка',
  over: 'Оборона пала',
};
const RULES = [
  ['Напиши что угодно', '— и ты в отряде'],
  ['К7', '— встать на клетку'],
  ['гача', '— оружие за ' + PRICE + ' монет'],
  ['профиль', '— твоя карточка, проф — короткая'],
  ['улучшить', '— +20% к случайному свойству оружия за ' + UPGRADE_PRICE + ' монет'],
  ['реролл', '— другой класс, один раз до первой волны'],
];

const $ = (id) => document.getElementById(id);

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function guidePart(part) {
  if (typeof part === 'string') return part;
  if (part.role) return el('i', 'role ' + part.role, ROLES[part.role]);
  const node = el(part.bold ? 'b' : 'span', '', part.text);
  if (part.color) node.style.color = part.color;
  return node;
}

function image(src, className = '') {
  const node = el('img', className);
  node.src = src;
  node.alt = '';
  return node;
}

function plural(n, one, few, many) {
  const units = n % 10, tens = n % 100;
  if (units === 1 && tens !== 11) return one;
  return units >= 2 && units <= 4 && (tens < 12 || tens > 14) ? few : many;
}

function clockText(seconds) {
  const whole = Math.max(0, Math.ceil(seconds - 0.05));
  return Math.floor(whole / 60) + ':' + String(whole % 60).padStart(2, '0');
}

function luminance(red, green, blue) {
  return (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
}

function reachOf(member) {
  const cls = CLASS_BY_ID.get(member.cls), tower = member.tower;
  const level = levelOf(member.xp), p = tower && tower.p ? tower.p : cls.params(level, tierOf(level));
  if (cls.role === 'support' && p.aura) return p.aura;
  return tower ? tower.range : p.range || towerBase(level).range;
}

function levelTag(className, level, prefix = '') {
  const top = level >= LEVEL_MAX, node = el('span', className + (top ? ' crown-slot' : ''));
  if (top) node.append(el('span', 'ghost', prefix + '00'), image(crownUrl(), 'crown'));
  else node.textContent = prefix + level;
  return node;
}

function prizeCell(prize) {
  const cell = el('div', 'cell');
  cell.style.setProperty('--tone', prize.color);
  cell.append(image(prizeUrl(OUTCOMES.includes(prize) ? prize.id : 'weapon', prize.color)));
  return cell;
}

function nickColor(name, color) {
  if (!/^#[0-9a-f]{6}$/i.test(color || '')) {
    let hash = 0;
    for (const ch of name.toLowerCase()) hash = (hash * 31 + ch.codePointAt(0)) >>> 0;
    return NICK_COLORS[hash % NICK_COLORS.length];
  }
  const value = parseInt(color.slice(1), 16);
  let rgb = [value >> 16 & 255, value >> 8 & 255, value & 255];
  const light = luminance(...rgb);
  if (light < 0.45) {
    const lift = (0.45 - light) / (1 - light);
    rgb = rgb.map((channel) => Math.round(channel + (255 - channel) * lift));
  }
  return 'rgb(' + rgb.join(',') + ')';
}

function keepInStep(event) {
  const cycle = CYCLES.get(event.animationName);
  if (cycle) event.target.style.setProperty('--phase', -(Date.now() % cycle) + 'ms');
}

function pick(list) {
  let roll = Math.random() * list.reduce((sum, item) => sum + item.chance, 0);
  for (const item of list) {
    roll -= item.chance;
    if (roll < 0) return item;
  }
  return list[list.length - 1];
}

function statLine(weapon, cls) {
  const line = el('div', 'stats'), ups = weapon.ups || {};
  Object.entries(weapon.stats).forEach(([stat, value], i) => {
    if (i) line.append(', ');
    line.append(el('span', value < 0 ? 'down' : 'up', statText(stat, value, cls)));
    if (ups[stat]) line.append(el('span', 'more', ' +' + amountText(stat, ups[stat])));
  });
  return line;
}

const PRIZES = OUTCOMES.concat(RARITIES);
const prizeOf = (outcome) => (outcome.kind === 'weapon' ? rarityOf(outcome.weapon.rarity) : outcomeOf(outcome.kind));

function uniqueLine(weapon) {
  const unique = weapon.unique ? uniqueOf(weapon.unique) : null;
  if (!unique) return null;
  const line = el('div', 'unique');
  line.append(el('b', '', '★ ' + unique.name), ': ' + unique.text);
  return line;
}

export class View {
  constructor() {
    this.scene = new Scene($('field'));
    this.settings = null;
    this.heard = [];
    this.scale = 1;
    this.clock = 0;
    this._game = null;
    this._paintIn = 0;
    this._keys = {};
    this._cues = [];
    this._names = new Map();
    this._ranges = new Map();
    this._lives = null;
    this._tickAt = null;
    this._rosterSeen = new Set();
    this._sfx = [];
    this._sfxAt = new Map();
    this._herald = null;
    this._mapSeen = null;
    this._cheers = [];
    this._cheer = null;
    this._slots = [];
    this._cards = new Map();
    this._cardTall = 0;
    $('rules-board-title').textContent = RULES_TITLE;
    renderRules($('rules-text'));
    $('emblem-left').src = shieldUrl(64);
    $('emblem-right').src = shieldUrl(64);
    window.addEventListener('resize', () => this._fitStage());
    document.addEventListener('animationstart', keepInStep);
    this._fitStage();
  }

  use(settings) {
    this.settings = settings;
    const body = document.body;
    body.classList.toggle('nocam', !settings.webcam);
    body.classList.toggle('nochat', !settings.chat);
    body.classList.toggle('noside', !settings.side);
    body.classList.toggle('nobg', !settings.bg);
    const rules = $('lobby-rules');
    rules.textContent = '';
    for (const [command, text] of RULES) {
      const item = el('li');
      item.append(el('b', '', command), ' ' + text);
      rules.append(item);
    }
    const hint = $('hint');
    hint.textContent = 'Пиши в чат — и ты в игре:';
    const line = el('span', 'group');
    RULES.slice(1).forEach(([command], i) => line.append(i ? ' · ' : '', el('b', '', command)));
    hint.append(line);
    this._keys = {};
  }

  frame(game, dt, still = false) {
    if (game !== this._game) {
      this._game = game;
      this._keys = {};
      this._lives = null;
      this._names.clear();
      this._ranges.clear();
      this._rosterSeen = new Set();
      this._slots = [];
      this._cards.forEach((card) => card.node.remove());
      this._cards.clear();
    }
    this.clock += dt;
    const stage = $('stage');
    stage.hidden = !game || game.state === 'stopped';
    if (stage.hidden) return;
    if (!still) this._listen(game);
    if (game.battle && game.battle !== this._mapSeen && game.state === 'placing') {
      const rules = BIOME_RULES[game.battle.biome], text = rules.text.charAt(0).toUpperCase() + rules.text.slice(1);
      this._mapSeen = game.battle;
      this._herald = { id: 'map', left: HERALD_TIME, title: 'Карта', name: rules.name,
        glow: BIOME_GLOW[game.battle.biome], text: text + '. ' + MAP_TIPS, boss: false };
      this._keys.herald = '';
    }
    for (const timers of [this._names, this._ranges]) {
      for (const [login, left] of timers) {
        if (left - dt <= 0) timers.delete(login);
        else timers.set(login, left - dt);
      }
    }
    const showField = game.state !== 'lobby' && game.battle;
    const names = game.state === 'placing' ? true : this._namesShown(game);
    const ranges = new Set(this._ranges.keys());
    for (const note of game.notes) if (note.kind === 'card') ranges.add(note.login);
    const fresh = this.scene.draw(showField ? game.battle : null, dt,
      { names, highlight: this._lit(game), still, ranges });
    for (const event of fresh) this._battleEvent(event);
    if (this.scene.impacts) this._sound('hit');
    this._paintHerald(dt);
    this._paintCheer(dt);
    this._turnReels(game);
    this._paintIn -= dt;
    if (this._paintIn <= 0 || still) {
      this._paintIn = PAINT_EVERY;
      this._paint(game, still);
    }
    if (!still) {
      this._playCues();
      this._playSfx();
    }
  }

  _fitStage() {
    this.scale = Math.min(window.innerWidth / STAGE_WIDTH, window.innerHeight / STAGE_HEIGHT);
    $('stage').style.setProperty('--k', this.scale);
    this.scene.resize(this.scale);
  }

  _namesShown(game) {
    const shown = new Set(this._names.keys());
    for (const note of game.notes) shown.add(note.login);
    for (const slot of game.slots) if (slot) shown.add(slot.login);
    return shown;
  }

  _lit(game) {
    const lit = new Set();
    for (const note of game.notes) if (note.kind === 'card') lit.add(note.login);
    return lit;
  }

  _cue(name) {
    this._cues.push(name);
  }

  _playCues() {
    const name = SOUND_PRIORITY.find((sound) => this._cues.includes(sound));
    this._cues = [];
    if (!name || !this.settings || !this.settings.sound) return;
    this.heard.push(name);
    if (this.heard.length > 80) this.heard.shift();
    play(name, this.settings.volume);
  }

  _sound(name, length) {
    this._sfx.push([name, length]);
  }

  _playSfx() {
    const now = this.clock, picked = [];
    for (const [name, length] of this._sfx) {
      if (picked.length >= SFX_PER_FRAME || picked.some((sound) => sound[0] === name)) continue;
      if (this._sfxAt.has(name) && now - this._sfxAt.get(name) < (SFX_GAPS[name] || 0.12)) continue;
      this._sfxAt.set(name, now);
      picked.push([name, length]);
    }
    this._sfx = [];
    if (!this.settings || !this.settings.sound) return;
    for (const [name, length] of picked) {
      this.heard.push(name);
      play(name, this.settings.volume, length);
    }
    if (this.heard.length > 80) this.heard.splice(0, this.heard.length - 80);
  }

  _listen(game) {
    for (const event of game.events) {
      if (event.kind === 'join' || event.kind === 'queued' || event.kind === 'spin') {
        this._names.set(event.login, NAME_TIME);
      }
      if (event.kind === 'join') this._sound('join');
      if (event.kind === 'card') {
        this._ranges.set(event.login, RANGE_TIME);
        this._names.set(event.login, NAME_TIME);
        this._cue('card');
      }
      if (event.kind === 'took') {
        const member = game.members.get(event.login);
        this._cue(member && member.weapon && BIG_PRIZES.has(member.weapon.rarity) ? 'win' : 'prize');
      }
      if (event.kind === 'kept') this._cue('meh');
      if (event.kind === 'void') this._cue('void');
      if (event.kind === 'jackpot') this._cue('jackpot');
      if (event.kind === 'upgraded') {
        this._cue('upgrade');
        this._names.set(event.login, NAME_TIME);
      }
      if (event.kind === 'cleared') {
        this._cue('reward');
        const coins = plural(event.coins, 'монета', 'монеты', 'монет');
        this.scene.say('Волна ' + event.wave + ' пройдена: всем +' + event.coins + ' ' + coins + ' и +'
          + String(event.xp).replace('.', ',') + ' опыта', '#fde047');
      }
      if (event.kind === 'event') this._cue(GOOD_EVENTS.has(event.type) ? 'buff' : 'debuff');
      if (event.kind === 'wave') this._cue(event.wave % BOSS_EVERY === 0 ? 'boss' : 'wave');
      if (event.kind === 'over') this._cue('over');
      if (event.kind === 'spin') this._cue('spin');
    }
    game.events.length = 0;
    const timed = game.state === 'placing' || game.state === 'break';
    const seconds = timed && !game.paused ? Math.ceil(game.left - 0.05) : null;
    if (seconds !== null && seconds <= FINAL_SECONDS && seconds > 0 && seconds !== this._tickAt) this._cue('tick');
    this._tickAt = seconds;
  }

  _battleEvent(event) {
    const kind = event.kind;
    if (kind === 'level') {
      this._cue(event.level >= LEVEL_MAX ? 'win' : 'level');
      this._names.set(event.tower.player.login, NAME_TIME);
      if (event.level >= LEVEL_MAX) this._cheers.push(event.tower.player);
    } else if (kind === 'leak') {
      this._cue('leak');
    } else if (kind === 'shot') {
      this._sound(SHOTS[event.tower.cls.id] || 'cast');
      if (event.crit) this._sound('crit');
    } else if (kind === 'chain') {
      this._sound('zap');
    } else if (kind === 'flame') {
      this._sound(event.flash ? 'crit' : 'flame');
    } else if (kind === 'boom' || kind === 'storm') {
      this._sound(kind);
    } else if (kind === 'kill') {
      this._sound('kill');
    } else if (kind === 'hold') {
      this._sound(event.by === 'frost' ? 'freeze' : 'stun');
    } else if (kind === 'tornado') {
      this._sound('wind');
    } else if (kind === 'execute') {
      this._sound('execute');
    } else if (kind === 'rally') {
      this._sound('rally');
    } else if (kind === 'heal') {
      this._sound('heal');
    } else if (kind === 'shield') {
      this._sound('block');
    } else if (kind === 'arrive') {
      this._sound(event.mob.info.boss ? 'roar' : 'growl');
      const mob = event.mob;
      this._herald = { mob, left: HERALD_TIME, title: mob.info.boss ? 'Босс' : 'Элитный', name: mob.kind.name,
        text: mob.power.name + ': ' + mob.power.text, glow: mob.kind.glow, boss: mob.info.boss };
      this._keys.herald = '';
    } else if (kind === 'wild') {
      this._sound('roar');
      this.scene.say('Мобы рассвирепели: бегут быстрее, сквозь стены и оковы', '#ef4444');
    } else if (kind === 'newcomer') {
      if (this._herald && this._herald.left > HERALD_TIME / 2 && !this._herald.fresh) return;
      const look = event.look;
      this._herald = { mob: event.mob, left: HERALD_TIME, title: 'Новый враг', name: look.name, text: look.text,
        glow: NEWCOMER_GLOW[look.element] || '#4ade80', boss: false, fresh: true };
      this._keys.herald = '';
      this._sound('growl');
    } else if (kind === 'toss' && event.mine === 'nuke') {
      this._sound('fall', event.time);
    } else if (kind === 'nuke') {
      this._sound('nuke');
      const box = $('blackout'), board = $('board');
      for (const [node, name] of [[box, 'on'], [board, 'shake']]) {
        node.classList.remove(name);
        void node.offsetWidth;
        node.classList.add(name);
      }
    } else if (kind === 'power') {
      const id = event.mob.power.id;
      this._sound(id === 'shield' ? 'block' : id === 'dash' ? 'wind' : 'summon');
    } else if (BATTLE_SOUNDS[kind]) {
      this._sound(BATTLE_SOUNDS[kind]);
    }
  }

  _paintHerald(dt) {
    const box = $('herald'), herald = this._herald;
    if (herald) herald.left -= dt;
    const state = this._game ? this._game.state : '';
    if (!herald || herald.left <= 0 || state !== 'wave' && !(herald.id && state === 'placing')) {
      this._herald = null;
      box.hidden = true;
      return;
    }
    this._once('herald', herald.id || String(herald.mob.id), () => {
      const mob = herald.mob || { y: SIZE / 2 };
      box.hidden = false;
      const battle = this._game.battle, base = battle.path[battle.path.length - 1][1] + 0.5;
      const band = (y) => (y < SIZE / 3 ? 0 : y < SIZE * 2 / 3 ? 1 : 2);
      const free = [0, 2, 1].find((b) => b !== band(mob.y) && b !== band(base));
      const place = ['', ' middle', ' low'][free === undefined ? 0 : free];
      box.className = 'herald' + (herald.boss ? ' boss' : '') + place;
      box.style.setProperty('--glow', herald.glow);
      box.textContent = '';
      box.append(el('span', 'what', herald.title), el('b', '', herald.name), el('span', 'power', herald.text));
    });
  }

  _paintCheer(dt) {
    const box = $('cheer');
    if (!this._cheer && this._cheers.length) {
      const player = this._cheers.shift(), card = $('cheer-box');
      this._cheer = { left: CHEER_TIME, bits: [] };
      card.textContent = '';
      card.append(image(crownUrl(), 'crown-big'), image(heroUrl(player.cls, 96), 'face'), el('h2', '', '100 уровень!'),
        this._starName(player.name, player.star, player.color, 'who'),
        el('span', 'wish', 'Поздравляем! Это самый высокий уровень в игре'));
      card.style.animation = 'none';
      void card.offsetWidth;
      card.style.animation = '';
      for (let i = 0; i < 160; i++) {
        const side = i % 2 ? 1 : -1, cannon = i < 90;
        this._cheer.bits.push({
          x: cannon ? (side < 0 ? 20 : 620) : Math.random() * 640, y: cannon ? 350 : -Math.random() * 160,
          vx: cannon ? -side * (60 + Math.random() * 140) : (Math.random() - 0.5) * 40,
          vy: cannon ? -(180 + Math.random() * 160) : 40 + Math.random() * 60,
          turn: Math.random() * 6, spin: (Math.random() - 0.5) * 12, flip: Math.random() * 6,
          w: 3 + Math.random() * 3, h: 2 + Math.random() * 1.5, color: CONFETTI[i % CONFETTI.length],
        });
      }
    }
    const cheer = this._cheer;
    box.hidden = !cheer;
    $('cheer-box').hidden = !cheer;
    if (!cheer) return;
    cheer.left -= dt;
    const canvas = $('confetti'), ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = Math.max(0, Math.min(1, cheer.left));
    for (const bit of cheer.bits) {
      bit.vy += 140 * dt;
      bit.vx *= 1 - 0.8 * dt;
      bit.vy = Math.min(bit.vy, 90);
      bit.x += (bit.vx + Math.sin(bit.flip * 2) * 12) * dt;
      bit.y += bit.vy * dt;
      bit.turn += bit.spin * dt;
      bit.flip += 7 * dt;
      ctx.save();
      ctx.translate(bit.x, bit.y);
      ctx.rotate(bit.turn);
      ctx.scale(1, Math.cos(bit.flip));
      ctx.fillStyle = bit.color;
      ctx.fillRect(-bit.w / 2, -bit.h / 2, bit.w, bit.h);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    if (cheer.left <= 0) this._cheer = null;
  }

  _once(id, key, paint) {
    if (this._keys[id] === key) return;
    this._keys[id] = key;
    paint();
  }

  _paint(game, still) {
    const state = game.paused ? 'paused' : game.state;
    const battle = game.battle;
    $('wave').textContent = game.wave || '—';
    const status = $('status');
    const fighting = game.state === 'wave', boss = fighting && game.wave % BOSS_EVERY === 0;
    let text = STATUS[game.state] || '';
    if (fighting) text = 'Идёт волна';
    if (boss) {
      const giant = battle.mobs.concat(battle.spawns).find((m) => m.kind && m.type === 'boss');
      text = giant ? giant.kind.name : 'Босс!';
    }
    if (game.paused) text = 'Пауза';
    status.textContent = text;
    status.classList.toggle('boss', boss);
    const clock = $('clock');
    clock.classList.toggle('mobs', fighting);
    if (fighting) {
      const left = battle.mobs.length + battle.spawns.length;
      clock.textContent = left + ' ' + plural(left, 'моб', 'моба', 'мобов');
    } else clock.textContent = clockText(game.left);
    if (game.paused) clock.textContent = '';
    const lives = battle ? Math.max(0, battle.lives) : LIVES, box = $('lives-box');
    $('lives').textContent = lives;
    box.classList.toggle('low', battle && lives <= LOW_LIVES);
    if (this._lives !== null && lives < this._lives && !still) {
      box.classList.remove('hit');
      void box.offsetWidth;
      box.classList.add('hit');
    }
    this._lives = lives;
    $('lobby').hidden = game.state !== 'lobby';
    $('over').hidden = game.state !== 'over';
    const rules = state === 'paused' && game.rulesShown;
    $('pause').hidden = state !== 'paused' || rules;
    $('rules-board').hidden = !rules;
    if (game.state === 'lobby') this._paintLobby(game, still);
    if (game.state === 'over') this._paintOver(game);
    if (state === 'paused' && !rules) this._paintPause(game);
    this._paintSlots(game);
    this._paintEffects(game);
    this._paintPlayers(game);
    this._paintCards(game, still);
  }

  _starName(name, star, color, className = 'name') {
    const node = el('span', className + (star ? ' ' + star : ''), name);
    if (!star && color !== undefined) node.style.color = nickColor(name, color);
    return node;
  }

  _coins(amount) {
    const box = el('span', 'coins');
    box.append(image(coinUrl()), el('span', 'sum', String(Math.floor(amount))));
    return box;
  }

  _paintLobby(game, still) {
    $('lobby-clock').textContent = clockText(game.left);
    this._paintGuide(game, still);
    const members = Array.from(game.members.values());
    const rosterKey = JSON.stringify(members.map((m) => [m.login, m.cls, levelOf(m.xp)]));
    this._once('roster', rosterKey, () => {
      const box = $('roster');
      box.textContent = '';
      if (!members.length) box.append(el('div', 'none', 'Пока никого — напиши что-нибудь в чат!'));
      for (const m of members.slice(0, ROWS.roster)) {
        const item = el('div', 'who' + (!still && !this._rosterSeen.has(m.login) ? ' pop' : ''));
        item.append(image(heroUrl(m.cls)), this._starName(m.name, m.star), levelTag('lvl', levelOf(m.xp), 'ур. '));
        box.append(item);
        this._rosterSeen.add(m.login);
      }
      const more = members.length - ROWS.roster;
      if (more > 0) box.append(el('div', 'more', 'и ещё ' + more + ' ' + plural(more, 'игрок', 'игрока', 'игроков')));
    });
    const present = new Set(members.map((m) => m.cls));
    const shown = CLASSES.filter((c) => !present.size || present.has(c.id));
    this._once('legend', shown.map((c) => c.id).join(), () => {
      const box = $('legend');
      box.textContent = '';
      for (const cls of shown) {
        const item = el('div', 'cls'), text = el('div'), name = el('b', '', cls.name);
        name.style.color = cls.color;
        name.append(el('i', 'role ' + cls.role, ROLES[cls.role]));
        text.append(name, cls.summary);
        item.append(image(heroUrl(cls.id)), text);
        box.append(item);
      }
    });
  }

  _paintGuide(game, still) {
    const { page, part } = pageAt(Math.max(0, game.s.lobby - game.left));
    this._once('tabs', page.id, () => {
      const box = $('lobby-tabs');
      box.textContent = '';
      for (const item of PAGES) {
        const tab = el('span', item === page ? 'on' : '', item.title);
        if (item === page) tab.append(el('i'));
        box.append(tab);
      }
    });
    const fill = $('lobby-tabs').querySelector('i');
    if (fill) fill.style.width = (part * 100).toFixed(1) + '%';
    $('lobby-squad').hidden = page.id !== 'squad';
    $('lobby-classes').hidden = page.id !== 'classes';
    $('lobby-guide').hidden = !page.points;
    if (!page.points) return;
    this._once('guide', page.id, () => {
      const box = $('lobby-guide');
      box.textContent = '';
      page.points().forEach(([icon, parts], i) => {
        const item = el('li', still ? '' : 'pop'), text = el('span');
        item.style.animationDelay = (i * 0.08).toFixed(2) + 's';
        for (const part of parts) text.append(guidePart(part));
        item.append(image(icon), text);
        box.append(item);
      });
    });
  }

  _paintOver(game) {
    const results = game.results;
    $('over-next').textContent = 'Новая игра через ' + clockText(game.left);
    this._once('over', JSON.stringify(results), () => {
      const passed = $('passed');
      passed.textContent = 'Пройдено волн: ' + results.passed;
      if (results.record) passed.append(el('span', 'badge', 'Новый рекорд!'));
      for (const [id, field] of [['over-kills', 'kills'], ['over-assists', 'assists']]) {
        const rows = results.rows.filter((r) => r[field] > 0).sort((a, b) => b[field] - a[field]).slice(0, ROWS.over);
        this._fillList($(id), rows.map((r) => ({ name: r.name, login: r.login, value: r[field] })), 'никого');
      }
    });
  }

  _fillList(list, rows, emptyText, unit = '') {
    list.textContent = '';
    if (!rows.length) list.append(el('li', 'empty', emptyText));
    rows.forEach((row, i) => {
      const member = this._game.members.get(row.login);
      const item = el('li', i === 0 ? 'first' : '');
      item.append(el('span', 'place', i + 1), this._starName(row.name, member ? member.star : ''),
        unit === 'ур. ' ? levelTag('points', row.value, unit) : el('span', 'points', unit + row.value));
      list.append(item);
    });
  }

  _people(game) {
    const people = new Map();
    for (const [login, entry] of game.profiles.data) people.set(login, Object.assign({ login }, entry));
    for (const m of game.members.values()) {
      people.set(m.login, { login: m.login, name: m.name, xp: m.xp, kills: m.kills, assists: m.assists });
    }
    return Array.from(people.values());
  }

  _paintPause(game) {
    const people = this._people(game);
    const best = (field, count) => people.filter((p) => p[field] > 0).sort((a, b) => b[field] - a[field]
      || (a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1)).slice(0, count);
    const top = best('xp', ROWS.pause).map((p) => ({ login: p.login, name: p.name, value: levelOf(p.xp) }));
    const kills = best('kills', ROWS.pauseShort).map((p) => ({ login: p.login, name: p.name, value: p.kills }));
    const assists = best('assists', ROWS.pauseShort).map((p) => ({ login: p.login, name: p.name, value: p.assists }));
    const record = game.profiles.best;
    this._once('pause', JSON.stringify([top, kills, assists, record]), () => {
      $('pause-record').textContent = record.waves
        ? 'Рекорд канала: ' + record.waves + ' ' + plural(record.waves, 'волна', 'волны', 'волн')
          + (record.players ? ' · в отряде было ' + record.players : '')
        : 'Рекорда пока нет';
      this._fillList($('pause-top'), top, 'пока никого', 'ур. ');
      this._fillList($('pause-kills'), kills, 'пока никого');
      this._fillList($('pause-assists'), assists, 'пока никого');
    });
  }

  _slotView(index, slot, game) {
    let view = this._slots[index];
    if (view && view.id === slot.id) return view;
    const box = $('slot-' + index), member = game.members.get(slot.login), cls = member ? member.cls : 'sniper';
    box.className = 'slot busy';
    box.textContent = '';
    const who = el('div', 'who'), reel = el('div', 'reel'), strip = el('div', 'strip'), result = el('div', 'result');
    const cells = [];
    for (let i = 0; i < REEL.cells; i++) {
      const cell = prizeCell(i === REEL.result ? prizeOf(slot.outcome) : pick(PRIZES));
      strip.append(cell);
      cells.push(cell);
    }
    reel.append(strip, el('i', 'mark'));
    box.append(who, reel, result);
    const width = box.clientWidth || 262;
    const stop = REEL.result * REEL.width + REEL.width / 2 - width / 2 + (Math.random() - 0.5) * REEL.width * 0.5;
    view = { id: slot.id, box, who, strip, result, cells, stop, key: '' };
    this._slots[index] = view;
    return view;
  }

  _turnReels(game) {
    game.slots.forEach((slot, i) => {
      if (!slot) return;
      const view = this._slotView(i, slot, game);
      const progress = slot.phase === 'spin' ? Math.max(0, Math.min(1, 1 - slot.left / SPIN_TIME)) : 1;
      const eased = 1 - Math.pow(1 - progress, 3);
      view.strip.style.transform = 'translateX(' + (-view.stop * eased).toFixed(1) + 'px)';
      view.cells[REEL.result].classList.toggle('won', slot.phase !== 'spin');
    });
  }

  _paintSlots(game) {
    $('price').textContent = PRICE + ' ' + plural(PRICE, 'монета', 'монеты', 'монет');
    game.slots.forEach((slot, i) => {
      const box = $('slot-' + i);
      if (!slot) {
        this._slots[i] = null;
        this._once('slot' + i, 'idle', () => {
          box.className = 'slot';
          box.textContent = '';
          const idle = el('div', 'idle');
          idle.append('Свободно — пиши ', el('b', '', 'гача'));
          box.append(idle);
        });
        return;
      }
      const view = this._slotView(i, slot, game), member = game.members.get(slot.login);
      const key = [slot.id, slot.phase, slot.took].join();
      if (view.key === key) return;
      view.key = key;
      this._keys['slot' + i] = '';
      view.who.textContent = '';
      const name = member ? this._starName(member.name, member.star, member.color, 'nick') : el('span', '', slot.login);
      const kind = slot.outcome.kind;
      const verb = slot.phase === 'spin' ? ' крутит гачу…' : kind === 'void' ? ': пусто' : kind === 'coins'
        ? ' возвращает вдвое' : slot.took ? ' надевает' : ' оставляет своё';
      view.who.append(name, verb);
      view.result.textContent = '';
      view.box.classList.toggle('shown', slot.phase !== 'spin');
      if (slot.phase === 'spin') return;
      view.result.append(prizeCell(prizeOf(slot.outcome)));
      if (kind !== 'weapon') {
        const prize = outcomeOf(kind), title = el('b', 'prize', prize.name);
        title.style.color = prize.color;
        const what = kind === 'void' ? 'ничего не выпало — повезёт в другой раз'
          : '+' + slot.coins + ' монет: потраченные ' + slot.coins / 2 + ' вернулись вдвое';
        view.result.append(title, el('div', 'now', what));
        return;
      }
      const weapon = slot.outcome.weapon, title = el('b', 'prize', weaponName(weapon));
      title.style.color = rarityOf(weapon.rarity).color;
      view.result.append(title, statLine(weapon, weapon.cls));
      const unique = uniqueLine(weapon);
      if (unique) view.result.append(unique);
      if (!slot.took && member && member.weapon) {
        const now = el('div', 'now'), old = el('b', '', weaponName(member.weapon));
        old.style.color = rarityOf(member.weapon.rarity).color;
        now.append('у него ', old, ' — редкость не ниже');
        view.result.append(now);
      }
    });
    const queue = game.queue.filter((entry) => game.members.has(entry.login))
      .map((entry) => [entry.login, entry.count]);
    this._once('queue', JSON.stringify(queue), () => {
      const line = $('queue');
      line.textContent = '';
      if (!queue.length) return;
      line.append('Дальше: ');
      queue.slice(0, ROWS.queue).forEach(([login, count], i) => {
        if (i) line.append(', ');
        line.append(el('b', '', game.members.get(login).name));
        if (count > 1) line.append(' ×' + count);
      });
      const more = queue.length - ROWS.queue;
      if (more > 0) line.append(' и ещё ' + more);
    });
  }

  _paintEffects(game) {
    const run = game.run || { now: [], next: [], effects: [] };
    const lasting = run.effects.map((e) => Object.assign({ kind: e.kind }, effectOf(e.kind, e.id)));
    const biome = game.battle && game.state !== 'over' ? game.battle.biome : '', rules = BIOME_RULES[biome];
    const rows = (rules ? [['карта', { kind: 'biome', id: biome, name: rules.name, text: rules.text }]] : [])
      .concat(run.now.map((e) => ['сейчас', e]), run.next.map((e) => ['дальше', e]),
        lasting.map((e) => ['до конца', e]));
    this._once('effects', JSON.stringify(rows.map(([when, e]) => when + e.kind + e.id)), () => {
      const box = $('effects');
      box.textContent = '';
      for (const [when, effect] of rows) {
        const row = el('div', 'effect ' + effect.kind), text = el('span'), name = el('b', '', effect.name);
        if (effect.kind === 'biome') name.style.color = BIOME_GLOW[effect.id];
        text.append(name, ' ' + effect.text);
        row.append(image(effectUrl(effect.kind, effect.id, 36)), el('i', 'when', when), text);
        box.append(row);
      }
      if (!rows.length) box.append(el('div', 'empty', 'Пока нет. Перед волной может выпасть бафф или дебафф на всех.'));
    });
  }

  _paintPlayers(game) {
    const members = Array.from(game.members.values()).sort((a, b) => b.xp - a.xp
      || (a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1));
    const list = $('players'), rows = Math.max(1, Math.floor((list.clientHeight || 200) / ROWS.player));
    const two = members.length > rows, fit = two ? rows * 2 : rows;
    const shown = members.length > fit ? members.slice(0, fit - 1) : members;
    const key = JSON.stringify([fit, members.length, shown.map((m) => [m.login, m.cls, levelOf(m.xp),
      Math.floor(m.coins), m.weapon ? m.weapon.rarity : ''])]);
    $('players-count').textContent = members.length ? String(members.length) : '';
    this._once('players', key, () => {
      list.textContent = '';
      list.classList.toggle('two', two);
      if (!members.length) list.append(el('li', 'empty', 'Пока никого — напиши что-нибудь в чат'));
      for (const m of shown) {
        const row = el('li'), level = levelTag('lvl', levelOf(m.xp), two ? '' : 'ур. ');
        if (levelOf(m.xp) < LEVEL_MAX || !two) level.style.background = gearColor(m.weapon);
        level.title = 'уровень';
        row.append(image(heroUrl(m.cls), 'face'), this._starName(m.name, m.star, m.color), level, this._coins(m.coins));
        list.append(row);
      }
      const more = members.length - shown.length;
      if (more > 0) list.append(el('li', 'empty', 'и ещё ' + more + ' ' + plural(more, 'игрок', 'игрока', 'игроков')));
    });
  }

  _paintCards(game, still) {
    const notes = game.notes.filter((note) => NOTE_KINDS.has(note.kind)).slice(-ROWS.cards);
    const box = document.body.classList.contains('noside') ? $('board-cards') : $('cards');
    const wanted = new Set();
    for (const note of notes) {
      const member = game.members.get(note.login);
      if (!member) continue;
      const key = note.kind + ':' + note.login;
      wanted.add(key);
      let card = this._cards.get(key);
      if (!card || card.node.parentNode !== box || note.kind !== 'card' && card.id !== note.id) {
        if (card) card.node.remove();
        card = note.kind === 'card' ? this._profileCard(member) : this._shortCard(member, note);
        card.id = note.id;
        if (!still) {
          card.node.classList.add('pop');
          card.node.addEventListener('animationend', () => card.node.classList.remove('pop'), { once: true });
        }
        this._cards.set(key, card);
        box.append(card.node);
      }
      card.update(member, game, note);
    }
    for (const [key, card] of this._cards) {
      if (wanted.has(key)) continue;
      card.node.remove();
      this._cards.delete(key);
    }
    this._fitCards(game, box);
  }

  _fitCards(game, box) {
    const shown = Array.from(box.querySelectorAll('.profile')), last = box.lastElementChild;
    for (const card of shown) this._cardTall = Math.max(this._cardTall, card.offsetHeight);
    if (box.id !== 'cards' || !box.clientHeight) {
      game.cardRoom = 1;
      return;
    }
    const used = last ? last.offsetTop + last.offsetHeight - box.offsetTop : 0;
    if (used > box.clientHeight + 1) game.cardRoom = Math.max(1, shown.length - 1);
    else if (shown.length < 2) game.cardRoom = box.clientHeight - used - CARD_GAP >= this._cardTall ? 2 : 1;
  }

  _shortCard(member, note) {
    const node = el('div', 'note poor'), has = el('b'), nick = this._starName(member.name, member.star, member.color,
      'nick');
    const detail = note.detail || {};
    if (note.kind === 'poor') {
      node.append(nick, detail.price === UPGRADE_PRICE ? ': на улучшение нужно ' : ': на крутку нужно ',
        el('b', '', String(detail.price || PRICE)), ', у тебя ', has);
    } else if (note.kind === 'bare') {
      node.append(nick, ': улучшать нечего — сначала выбей оружие в гаче');
    } else {
      node.className = 'note upgrade';
      const ups = (detail.ups || []).map((up) => '+' + amountText(up.id, up.amount) + ' '
        + statName(up.id, member.cls));
      node.append(nick, ' улучшает оружие' + (detail.times > 1 ? ' ×' + detail.times : '') + ': ',
        el('b', 'up', ups.join(', ')));
    }
    return {
      node,
      update: (m) => {
        has.textContent = String(Math.floor(m.coins));
      },
    };
  }

  _profileCard(member) {
    const node = el('div', 'note profile'), top = el('div', 'top'), lvl = el('span', 'lvl');
    const coins = this._coins(0), body = el('div', 'body'), gear = el('div', 'gear-box'), marks = el('div', 'marks');
    const spot = el('span', 'mark'), reach = el('span', 'mark'), spotText = el('span'), reachText = el('span');
    spot.append(image(markUrl('spot')), spotText);
    reach.append(image(markUrl('reach')), reachText);
    marks.append(lvl, spot, reach);
    top.append(this._starName(member.name, member.star, member.color, 'nick'), coins);
    const face = image(heroUrl(member.cls, 64));
    node.append(face, top, marks, body, gear);
    const state = { level: 0, cls: '', gear: null, brief: null };
    return {
      node,
      update: (m, game, note) => {
        const brief = Boolean(note && note.detail && note.detail.brief), tower = m.tower;
        const rider = Boolean(tower && tower.rider), seat = rider ? tower.host : tower;
        spot.hidden = !seat;
        spotText.textContent = seat ? cellName(Math.floor(seat.x), Math.floor(seat.y)) : '';
        reachText.textContent = num(reachOf(m));
        const level = levelOf(m.xp);
        lvl.textContent = '';
        lvl.append(levelTag('', level, 'ур. '));
        coins.querySelector('.sum').textContent = String(Math.floor(m.coins));
        if (state.level !== level || state.cls !== m.cls || state.brief !== brief) {
          state.level = level;
          state.cls = m.cls;
          state.brief = brief;
          face.src = heroUrl(m.cls, 64);
          const cls = CLASS_BY_ID.get(m.cls), info = describe(m.cls, level), kind = el('div', 'line');
          const clsName = el('b', '', cls.name);
          clsName.style.color = cls.color;
          kind.append(clsName, el('i', 'role ' + cls.role, ROLES[cls.role]), brief ? '' : ' ' + info.main);
          body.textContent = '';
          body.append(kind);
          if (!brief) for (const perk of info.perks) {
            const line = el('div', 'perk' + (perk.open ? '' : ' locked'));
            line.append(el('i', '', perk.open ? '★' : perk.at + ' ур.'), ' ' + perk.text);
            body.append(line);
          }
        }
        const gearKey = m.weapon ? JSON.stringify([m.weapon.rarity, m.weapon.stats, m.weapon.ups]) : '';
        if (state.gear !== gearKey) {
          state.gear = gearKey;
          gear.textContent = '';
          if (m.weapon) {
            const line = el('div', 'gear'), name = el('b', '', weaponName(m.weapon));
            name.style.color = rarityOf(m.weapon.rarity).color;
            line.append(name, statLine(m.weapon, m.cls));
            const unique = uniqueLine(m.weapon);
            if (unique) line.append(unique);
            gear.append(line);
          } else gear.append(el('div', 'line', 'Оружия нет — пиши гача'));
        }
      },
    };
  }
}
