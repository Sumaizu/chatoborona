import { CLASS_BY_ID, cells, num } from './classes.js';

export const PRICE = 50;
export const UPGRADE_PRICE = 100;
export const UPGRADE_SHARE = 0.2;
export const KILL_COINS = 3;
export const ASSIST_COINS = 2;
export const SLOTS = 3;
export const SPIN_TIME = 2;
export const SHOW_TIME = 7;
export const SHOW_FAST = 4;
export const CRIT_MUL = 2;
export const ASCEND_AT = 30;
export const DIVINE_SHARE = 0.05;
export const DIVINE_POWER = 1.5;

export const OUTCOMES = [
  { id: 'void', name: 'Пустота', color: '#6b7280', chance: 0.149 },
  { id: 'handful', name: 'Горстка монет', color: '#facc15', chance: 0.075, coins: [1, 50] },
  { id: 'bag', name: 'Мешок монет', color: '#e8a33d', chance: 0.0675, coins: [51, 150] },
  { id: 'chest', name: 'Сундук монет', color: '#ffb020', chance: 0.0075, coins: [151, 500] },
  { id: 'particle', name: 'Частица бога', color: '#ff2e4d', chance: 0.001 },
];

export const RARITIES = [
  { id: 'common', name: 'Обычный', color: '#4ade80', chance: 0.3, good: 1, bad: 1, power: 1.2 },
  { id: 'rare', name: 'Редкий', color: '#60a5fa', chance: 0.2, good: 2, bad: 0, power: 1.5 },
  { id: 'mythic', name: 'Мифический', color: '#c084fc', chance: 0.1, good: 3, bad: 0, power: 2.2 },
  { id: 'epic', name: 'Эпический', color: '#facc15', chance: 0.07, good: 4, bad: 0, power: 3 },
  { id: 'legendary', name: 'Легендарный', color: '#f97316', chance: 0.03, good: 5, bad: 0, power: 4, unique: true },
];

export const DIVINE = { id: 'divine', name: 'Божественный', color: '#ff2e4d' };

const FORMATS = {
  pct: (v) => Math.round(v * 100) + '%',
  up: (v) => Math.round((v - 1) * 100) + '%',
  often: (v) => Math.round((1 / v - 1) * 100) + '%',
  times: (v) => 'в ' + num(v) + ' раза',
  num: (v) => num(v),
  int: (v) => String(Math.round(v)),
  cells: (v) => cells(v),
};
const FIXED = new Set(['time', 'stacks', 'range', 'radius', 'mul', 'hold', 'exposeTime', 'snareTime', 'pierce',
  'falloff', 'contagion', 'ward']);
const SECONDS = new Set(['stormEvery', 'burstEvery', 'rallyEvery', 'toss']);
const OFTEN = new Set(['interval', 'mineEvery']);
const TIMES = new Set(['holdMul', 'big']);
const empowered = new Map();

export const STATS = [
  { id: 'damage', name: 'урона', step: 0.06, worth: 1 },
  { id: 'rate', name: 'скорости атаки', step: 0.05, worth: 1 },
  { id: 'range', name: 'к радиусу', step: 0.2, worth: 0.5, cells: true },
  { id: 'crit', name: 'шанса крита', step: 0.03, worth: 1, good: true },
  { id: 'power', name: 'силы приёма', step: 0.08, worth: 1 },
  { id: 'xp', name: 'опыта', step: 0.08, worth: 0.2 },
  { id: 'coins', name: 'монет', step: 0.1, worth: 0.2 },
];

export const UNIQUES = [
  { id: 'midas', name: 'Мидас', text: '+{values.coins:pct} монет', values: { coins: 1 } },
  { id: 'scholar', name: 'Мудрость', text: '+{values.xp:pct} опыта', values: { xp: 0.6 } },
  { id: 'reach', name: 'Простор', text: '+{mods.range:cells} к радиусу атаки и аур', mods: { range: 1 } },
  { id: 'ignite', name: 'Поджог', text: 'удары поджигают: {values.dps:pct} урона в секунду, {values.time:num} с',
    attack: true, values: { dps: 0.3, time: 3 } },
  { id: 'frostbite', name: 'Обморожение', text: 'удары замедляют на {values.slow:pct} на {values.time:num} с',
    attack: true, values: { slow: 0.3, time: 2 } },
  { id: 'venom', name: 'Яд', text: 'удары отравляют: {values.dps:pct} урона в секунду, {values.time:num} с',
    attack: true, values: { dps: 0.25, time: 4, stacks: 3 } },
  { id: 'deadeye', name: 'Меткость', text: '{values.chance:pct} шанс урона ×{values.mul:num}', attack: true,
    values: { chance: 0.15, mul: 4 } },
  { id: 'thunderclap', name: 'Оглушение', text: '{values.chance:pct} шанс оглушить на {values.hold:num} с',
    attack: true, values: { chance: 0.1, hold: 0.8 } },
  { id: 'spark', name: 'Искра', text: 'удар перескакивает на соседа: {values.share:pct} урона', attack: true,
    values: { range: 1.6, share: 0.5 } },
  { id: 'blast', name: 'Взрыв', text: 'удар взрывается: соседям {values.share:pct} урона', attack: true,
    values: { radius: 1, share: 0.4 } },
  { id: 'reaper', name: 'Жнец', text: 'моб (не босс) с запасом меньше {values.below:pct} умирает от удара',
    attack: true, values: { below: 0.12 } },
  { id: 'breaker', name: 'Бронебой', text: 'сквозь броню и щиты, +{values.big:up} урона по элитным и боссам',
    attack: true, values: { big: 1.3 } },
  { id: 'echo', name: 'Эхо', text: '{values.chance:pct} шанс ударить второй раз', attack: true,
    values: { chance: 0.2 } },
  { id: 'fury', name: 'Ярость', text: '+{mul.damage:up} урона', role: 'damage', mul: { damage: 1.4 } },
  { id: 'quick', name: 'Скорострел', text: '+{mods.rate:pct} скорости атаки', role: 'damage', mods: { rate: 0.35 } },
  { id: 'keen', name: 'Хищник', text: '+{mods.crit:pct} шанса крита (урон ×2)', role: 'damage', attack: true,
    mods: { crit: 0.2 } },
  { id: 'expose', name: 'Уязвимость', text: 'задетые им мобы {set.exposeTime:num} с получают +{set.expose:pct} '
    + 'урона от всех', role: 'control', set: { expose: 0.15, exposeTime: 3 } },
  { id: 'fetters', name: 'Оковы', text: '{set.snare:pct} шанс задержать задетого моба на {set.snareTime:num} с, '
    + 'все его задержки на {set.holdMul:up} дольше', role: 'control',
    set: { snare: 0.12, snareTime: 1, holdMul: 1.5 } },
  { id: 'ward', name: 'Стойкость', text: 'его и соседей мобы не оглушают и не опутывают', role: 'support',
    set: { ward: 1 } },
  { id: 'tithe', name: 'Казна', text: 'он и соседи получают +{set.tithe:pct} монет', role: 'support',
    set: { tithe: 0.3 } },
  { id: 'twin', name: 'Двойной выстрел', text: 'стреляет сразу в двух мобов', cls: 'sniper', set: { twin: true } },
  { id: 'bore', name: 'Сквозная пуля', text: 'пуля не слабеет, прошивая мобов на линии', cls: 'sniper',
    set: { pierce: 1 } },
  { id: 'brand', name: 'Клеймо', text: 'метка на {add.mark:pct} сильнее и держится {mul.markTime:times} дольше; есть '
    + 'и до 50-го уровня', cls: 'sniper', add: { mark: 0.3 }, mul: { markTime: 2 } },
  { id: 'drum', name: 'Барабанный магазин', text: 'разгоняется {mul.rampMax:times} сильнее', cls: 'gunner',
    mul: { rampMax: 2 } },
  { id: 'hail', name: 'Свинцовый град', text: 'рикошет на {add.ricochet:pct} чаще; есть и до 10-го уровня',
    cls: 'gunner', add: { ricochet: 0.35 } },
  { id: 'overdrive', name: 'Перегрев', text: 'шквал раз в {set.burstEvery:num} с и на {mul.burstTime:up} дольше; '
    + 'есть и до 50-го уровня', cls: 'gunner', set: { burstEvery: 6 }, mul: { burstTime: 1.4 } },
  { id: 'sticky', name: 'Липкие гранаты', text: 'взрыв на {mul.splash:up} шире', cls: 'bomber',
    mul: { splash: 1.5 } },
  { id: 'cluster', name: 'Кассетные бомбы', text: 'кассета на {add.cluster:pct} чаще; есть и до 10-го уровня',
    cls: 'bomber', add: { cluster: 0.3 } },
  { id: 'inferno', name: 'Горючая смесь', text: 'напалм на {add.napalm:pct} сильнее и на {mul.napalmRadius:up} '
    + 'шире; есть и до 50-го уровня', cls: 'bomber', add: { napalm: 0.25 }, mul: { napalmRadius: 1.5 } },
  { id: 'tempest', name: 'Буря', text: 'молния перескакивает ещё на {add.jumps:int} мобов', cls: 'thunder',
    add: { jumps: 3 } },
  { id: 'overload', name: 'Перегрузка', text: 'молния не слабеет, перескакивая', cls: 'thunder', set: { falloff: 1 } },
  { id: 'stormcaller', name: 'Повелитель гроз', text: 'гроза раз в {set.stormEvery:num} с и на {mul.stormMul:up} '
    + 'сильнее; есть и до 50-го уровня', cls: 'thunder', set: { stormEvery: 3.5 }, mul: { stormMul: 1.5 } },
  { id: 'acid', name: 'Кислота', text: 'лужи на {mul.puddle:up} шире и стоят на {mul.puddleTime:up} дольше',
    cls: 'alchemist', mul: { puddle: 1.5, puddleTime: 1.6 } },
  { id: 'plague', name: 'Чума', text: 'яд держится {mul.linger:times} дольше и всегда переходит с умершего на '
    + 'соседа', cls: 'alchemist', set: { contagion: 1 }, mul: { linger: 2 } },
  { id: 'corrosive', name: 'Едкий яд', text: 'отравленные получают ещё +{add.corrode:pct} урона от всех',
    cls: 'alchemist', add: { corrode: 0.3 } },
  { id: 'blue', name: 'Синее пламя', text: 'горение {mul.burn:times} сильнее', cls: 'pyro', mul: { burn: 2 } },
  { id: 'nozzle', name: 'Широкое сопло', text: 'струя огня {mul.cone:times} шире', cls: 'pyro', mul: { cone: 2 } },
  { id: 'ashes', name: 'Пепелище', text: 'пепел: взрыв сильнее (урон ещё ×{add.ash:num}) и на {mul.ashRange:up} '
    + 'шире; есть и до 50-го уровня', cls: 'pyro', add: { ash: 2 }, mul: { ashRange: 1.6 } },
  { id: 'bear', name: 'Медвежьи капканы', text: '+{add.traps:int} капкана, держат {mul.trapHold:times} дольше',
    cls: 'hunter', add: { traps: 2 }, mul: { trapHold: 2 } },
  { id: 'dragnet', name: 'Ловчая сеть', text: 'сеть капкана: +{add.net:cells} к радиусу; есть и до 10-го уровня',
    cls: 'hunter', add: { net: 1 } },
  { id: 'biggame', name: 'Крупная дичь', text: 'по элитным и боссам бьёт на {mul.bigMul:up} сильнее', cls: 'hunter',
    mul: { bigMul: 1.6 } },
  { id: 'leech', name: 'Кровопийца', text: 'укусы на {mul.damage:up} сильнее', cls: 'parasite',
    mul: { damage: 1.6 } },
  { id: 'frenzy', name: 'Бешенство', text: 'кусает на {mul.interval:often} чаще', cls: 'parasite',
    mul: { interval: 0.625 } },
  { id: 'deathgrip', name: 'Мёртвая хватка', text: 'смертельный укус на {add.oneshot:pct} чаще; есть и до 50-го '
    + 'уровня', cls: 'parasite', add: { oneshot: 0.02 } },
  { id: 'depot', name: 'Склад', text: '+{add.mineCap:int} мин, ставит их на {mul.mineEvery:often} чаще',
    cls: 'miner', add: { mineCap: 15 }, mul: { mineEvery: 0.5 } },
  { id: 'tosser', name: 'Метатель', text: 'бросок мины раз в {set.toss:num} с; есть и до 10-го уровня',
    cls: 'miner', set: { toss: 3.5 } },
  { id: 'shrapnel', name: 'Шрапнель', text: 'мины задевают и летучих', cls: 'miner', set: { airMines: true } },
  { id: 'permafrost', name: 'Вечная мерзлота', text: 'холод держится {mul.linger:times} дольше, волна морозит на '
    + '{add.freeze:pct} чаще', cls: 'frost', mul: { linger: 2 }, add: { freeze: 0.1 } },
  { id: 'glacier', name: 'Ледник', text: '+{add.chillRange:cells} к радиусу холода и морозной волны', cls: 'frost',
    add: { chillRange: 1, range: 1 } },
  { id: 'shatter', name: 'Хрупкий лёд', text: 'замедленные им получают ещё +{add.brittle:pct} урона от всех',
    cls: 'frost', add: { brittle: 0.25 } },
  { id: 'hurricane', name: 'Ураган', text: 'вихрь катится {mul.whirlTime:times} дольше', cls: 'shaman',
    mul: { whirlTime: 2 } },
  { id: 'twister', name: 'Торнадо', text: 'смерч на {add.tornado:pct} чаще; есть и до 10-го уровня', cls: 'shaman',
    add: { tornado: 0.2 } },
  { id: 'gale', name: 'Шторм', text: 'унесённые оглушены ещё на {add.gust:num} с; есть и до 50-го уровня',
    cls: 'shaman', add: { gust: 1 } },
  { id: 'granite', name: 'Гранит', text: 'стена {mul.wallHp:times} прочнее', cls: 'earth', mul: { wallHp: 2 } },
  { id: 'quake', name: 'Землетрясение', text: 'шипы бьют на {mul.spikes:up} шире', cls: 'earth',
    mul: { spikes: 1.8 } },
  { id: 'briar', name: 'Терновник', text: 'шипы у стены ранят сильнее: ещё ×{add.thorns:num} его урона в секунду; '
    + 'есть и до 10-го уровня', cls: 'earth', add: { thorns: 2 } },
  { id: 'victory', name: 'Знамя победы', text: 'аура шире на {add.aura:cells}, скорость ещё +{add.haste:pct}',
    cls: 'banner', add: { aura: 1.5, haste: 0.2 } },
  { id: 'warhorn', name: 'Боевой рог', text: 'клич раз в {set.rallyEvery:num} с и на {add.rally:pct} сильнее; есть '
    + 'и до 10-го уровня', cls: 'banner', set: { rallyEvery: 6 }, add: { rally: 0.3 } },
  { id: 'phalanx', name: 'Фаланга', text: 'соседям постоянно ещё +{add.formation:pct} урона', cls: 'banner',
    add: { formation: 0.2 } },
  { id: 'holywater', name: 'Святая вода', text: 'свет бьёт всех, а не только нежить', cls: 'healer',
    set: { holyAll: true } },
  { id: 'aegis', name: 'Эгида', text: '+{add.shield:pct} шанс, что дошедший до базы моб не отнимет жизнь',
    cls: 'healer', add: { shield: 0.15 } },
  { id: 'radiance', name: 'Сияние', text: 'аура шире на {add.aura:cells}, благодать соседям {mul.grace:times} '
    + 'сильнее', cls: 'healer', add: { aura: 1.5 }, mul: { grace: 2 } },
  { id: 'muses', name: 'Ученики', text: 'вдохновляет сразу нескольких: {set.muses:int}', cls: 'sage',
    set: { muses: 2 } },
  { id: 'enlighten', name: 'Просветление', text: 'он и соседи получают ещё +{add.wisdom:pct} опыта', cls: 'sage',
    add: { wisdom: 0.5 } },
  { id: 'insight', name: 'Озарение', text: 'вдохновлённый бьёт ещё на {add.muse:pct} сильнее, быстрее и дальше; '
    + 'есть и до 10-го уровня', cls: 'sage', add: { muse: 0.25 } },
];

export const WEAPONS = {
  sniper: 'карабин', gunner: 'пулемёт', bomber: 'гранатомёт', thunder: 'посох', alchemist: 'флакон', pyro: 'огнемёт',
  hunter: 'арбалет', frost: 'жезл', shaman: 'тотем', banner: 'штандарт', healer: 'амулет', sage: 'фолиант',
  earth: 'молот', parasite: 'шип', miner: 'детонатор',
};

function pick(list, random) {
  let roll = random() * list.reduce((sum, item) => sum + item.chance, 0);
  for (const item of list) {
    roll -= item.chance;
    if (roll < 0) return item;
  }
  return list[list.length - 1];
}

const round = (value, step) => Math.round(value / step) * step;
const unitOf = (stat) => (stat.cells ? 0.1 : 0.01);
export const statOf = (id) => STATS.find((stat) => stat.id === id);

function shuffled(list, random) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function gearOf(cls) {
  const info = CLASS_BY_ID.get(cls);
  return info ? info.gear : STATS.map((stat) => stat.id);
}

export function uniquesFor(cls) {
  const info = CLASS_BY_ID.get(cls) || {};
  return {
    general: UNIQUES.filter((u) => !u.cls && !u.role && (!u.attack || info.hits)),
    own: UNIQUES.filter((u) => (u.cls === cls || !u.cls && u.role === info.role) && (!u.attack || info.hits)),
  };
}

export function makeWeapon(random, cls, rarity = pick(RARITIES, random)) {
  const gear = shuffled(gearOf(cls).map(statOf), random), stats = {};
  const good = gear.slice(0, Math.min(rarity.good, gear.length));
  const bad = gear.slice(good.length).filter((stat) => !stat.good).slice(0, rarity.bad);
  for (const stat of good) {
    stats[stat.id] = Math.max(unitOf(stat), round(stat.step * rarity.power * (0.6 + 0.4 * random()), unitOf(stat)));
  }
  for (const stat of bad) {
    stats[stat.id] = -Math.max(unitOf(stat), round(stat.step * (0.6 + 0.6 * random()), unitOf(stat)));
  }
  const weapon = { rarity: rarity.id, cls: WEAPONS[cls] ? cls : 'sniper', stats, ups: {} };
  if (rarity.unique) {
    const pools = uniquesFor(cls), pool = pools.own.length && random() < 0.5 ? pools.own : pools.general;
    weapon.unique = pool[Math.floor(random() * pool.length)].id;
  }
  return weapon;
}

export function weaponStats(weapon) {
  const total = Object.assign({}, weapon.stats);
  for (const [id, value] of Object.entries(weapon.ups || {})) total[id] = (total[id] || 0) + value;
  return total;
}

export function upgrade(random, weapon) {
  const ids = Object.keys(weapon.stats), id = ids[Math.floor(random() * ids.length)], stat = statOf(id);
  const share = weapon.rarity === DIVINE.id ? DIVINE_SHARE : UPGRADE_SHARE;
  const amount = Math.max(unitOf(stat), round(Math.abs(weapon.stats[id]) * share, unitOf(stat)));
  weapon.ups = Object.assign({}, weapon.ups);
  weapon.ups[id] = round((weapon.ups[id] || 0) + amount, unitOf(stat) / 10);
  weapon.plus = (weapon.plus || 0) + 1;
  const ascended = weapon.rarity === 'legendary' && weapon.plus >= ASCEND_AT;
  if (ascended) ascend(weapon);
  return { id, amount, ascended };
}

export function ascend(weapon) {
  const total = weaponStats(weapon);
  weapon.stats = {};
  for (const [id, value] of Object.entries(total)) weapon.stats[id] = Math.round(value * 1000) / 1000;
  weapon.ups = {};
  weapon.plus = 0;
  weapon.rarity = DIVINE.id;
  return weapon;
}

function boost(key, value) {
  if (typeof value !== 'number' || FIXED.has(key)) return value;
  if (SECONDS.has(key)) return value / DIVINE_POWER;
  if (TIMES.has(key)) return 1 + (value - 1) * DIVINE_POWER;
  return value * DIVINE_POWER;
}

const grow = (key, value) => value * DIVINE_POWER;

function boostMul(key, value) {
  if (OFTEN.has(key)) return 1 / (1 + (1 / value - 1) * DIVINE_POWER);
  return 1 + (value - 1) * DIVINE_POWER;
}

function mapValues(table, change) {
  if (!table) return table;
  const out = {};
  for (const [key, value] of Object.entries(table)) {
    const next = change(key, value);
    out[key] = typeof next === 'number' ? Math.round(next * 1e6) / 1e6 : next;
  }
  return out;
}

export function empower(unique) {
  if (!empowered.has(unique.id)) {
    empowered.set(unique.id, Object.assign({}, unique, {
      mul: mapValues(unique.mul, boostMul),
      add: mapValues(unique.add, grow),
      set: mapValues(unique.set, boost),
      mods: mapValues(unique.mods, grow),
      values: mapValues(unique.values, boost),
      divine: true,
    }));
  }
  return empowered.get(unique.id);
}

export function uniqueFor(id, divine = false) {
  const unique = uniqueOf(id);
  return unique && divine ? empower(unique) : unique;
}

export function uniqueText(unique) {
  return unique.text.replace(/\{(\w+)\.(\w+):(\w+)\}/g,
    (match, table, key, format) => FORMATS[format](unique[table][key]));
}

export function weaponScore(weapon) {
  if (!weapon) return 0;
  const stats = weaponStats(weapon);
  let score = weapon.unique ? 4 : 0;
  for (const stat of STATS) score += (stats[stat.id] || 0) / stat.step * stat.worth;
  return score;
}

export function spin(random, cls, owned = false) {
  const roll = pick(OUTCOMES.filter((outcome) => !owned || outcome.id !== 'particle').concat(RARITIES), random);
  if (roll.coins) {
    const [low, high] = roll.coins;
    return { kind: roll.id, coins: low + Math.floor(random() * (high - low + 1)) };
  }
  if (OUTCOMES.includes(roll)) return { kind: roll.id };
  return { kind: 'weapon', weapon: makeWeapon(random, cls, roll) };
}

export function statName(id, cls) {
  const info = CLASS_BY_ID.get(cls), labels = info && info.labels;
  return labels && labels[id] ? labels[id] : statOf(id).name;
}

export function amountText(id, value) {
  const stat = statOf(id);
  return stat.cells ? cells(Math.abs(value)) : Math.round(Math.abs(value) * 100) + '%';
}

export function statText(id, value, cls) {
  return (value < 0 ? '−' : '+') + amountText(id, value) + ' ' + statName(id, cls);
}

export const uniqueOf = (id) => UNIQUES.find((unique) => unique.id === id) || null;

export const weaponName = (weapon) => rarityOf(weapon.rarity).name + ' ' + WEAPONS[weapon.cls];

export const rarityOf = (id) => (id === DIVINE.id ? DIVINE : RARITIES.find((rarity) => rarity.id === id)
  || RARITIES[0]);

export const rankOf = (weapon) => (weapon.rarity === DIVINE.id ? RARITIES.length
  : RARITIES.findIndex((rarity) => rarity.id === weapon.rarity));

export const weaponTitle = (weapon) => weaponName(weapon) + (weapon.plus ? ' +' + weapon.plus : '');

export const gearColor = (weapon) => (weapon ? rarityOf(weapon.rarity).color : '#ffffff');

export const outcomeOf = (id) => OUTCOMES.find((outcome) => outcome.id === id) || null;
