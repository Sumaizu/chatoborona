import { CLASS_BY_ID, cells } from './classes.js';

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

export const OUTCOMES = [
  { id: 'void', name: 'Пустота', color: '#6b7280', chance: 0.15 },
  { id: 'coins', name: 'Удвоение монет', color: '#facc15', chance: 0.15 },
];

export const RARITIES = [
  { id: 'common', name: 'Обычный', color: '#4ade80', chance: 0.3, good: 1, bad: 1, power: 1.2 },
  { id: 'rare', name: 'Редкий', color: '#60a5fa', chance: 0.2, good: 2, bad: 0, power: 1.5 },
  { id: 'mythic', name: 'Мифический', color: '#c084fc', chance: 0.1, good: 3, bad: 0, power: 2.2 },
  { id: 'epic', name: 'Эпический', color: '#facc15', chance: 0.07, good: 4, bad: 0, power: 3 },
  { id: 'legendary', name: 'Легендарный', color: '#f97316', chance: 0.03, good: 5, bad: 0, power: 4, unique: true },
];

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
  { id: 'midas', name: 'Мидас', text: 'вдвое больше монет' },
  { id: 'scholar', name: 'Мудрость', text: '+60% опыта' },
  { id: 'reach', name: 'Простор', text: '+1 клетка к радиусу атаки и аур', mods: { range: 1 } },
  { id: 'ignite', name: 'Поджог', text: 'удары поджигают: 30% урона в секунду, 3 с', attack: true },
  { id: 'frostbite', name: 'Обморожение', text: 'удары замедляют на 30% на 2 с', attack: true },
  { id: 'venom', name: 'Яд', text: 'удары отравляют: 25% урона в секунду, 4 с', attack: true },
  { id: 'deadeye', name: 'Меткость', text: '15% шанс урона ×4', attack: true },
  { id: 'thunderclap', name: 'Оглушение', text: '10% шанс оглушить на 0,8 с', attack: true },
  { id: 'spark', name: 'Искра', text: 'удар перескакивает на соседа с половиной урона', attack: true },
  { id: 'blast', name: 'Взрыв', text: 'удар взрывается: соседям 40% урона', attack: true },
  { id: 'reaper', name: 'Жнец', text: 'моб (не босс) с запасом меньше 12% умирает от удара', attack: true },
  { id: 'breaker', name: 'Бронебой', text: 'сквозь броню и щиты, +30% урона по элитным и боссам', attack: true },
  { id: 'echo', name: 'Эхо', text: '20% шанс ударить второй раз', attack: true },
  { id: 'fury', name: 'Ярость', text: '+40% урона', role: 'damage', mul: { damage: 1.4 } },
  { id: 'twin', name: 'Двойной выстрел', text: 'стреляет сразу в двух мобов', cls: 'sniper', set: { twin: true } },
  { id: 'drum', name: 'Барабанный магазин', text: 'разгоняется вдвое сильнее', cls: 'gunner', mul: { rampMax: 2 } },
  { id: 'sticky', name: 'Липкие гранаты', text: 'взрыв на 50% шире', cls: 'bomber', mul: { splash: 1.5 } },
  { id: 'tempest', name: 'Буря', text: 'молния перескакивает ещё на 3 мобов', cls: 'thunder', add: { jumps: 3 } },
  { id: 'acid', name: 'Кислота', text: 'лужи на 50% шире и стоят на 60% дольше', cls: 'alchemist',
    mul: { puddle: 1.5, puddleTime: 1.6 } },
  { id: 'blue', name: 'Синее пламя', text: 'горение вдвое сильнее', cls: 'pyro', mul: { burn: 2 } },
  { id: 'bear', name: 'Медвежьи капканы', text: '+2 капкана, держат вдвое дольше', cls: 'hunter', add: { traps: 2 },
    mul: { trapHold: 2 } },
  { id: 'leech', name: 'Кровопийца', text: 'укусы на 60% сильнее', cls: 'parasite', mul: { damage: 1.6 } },
  { id: 'depot', name: 'Склад', text: '+15 мин, ставит их вдвое чаще', cls: 'miner', add: { mineCap: 15 },
    mul: { mineEvery: 0.5 } },
  { id: 'permafrost', name: 'Вечная мерзлота', text: 'холод держится вдвое дольше, волна чаще морозит', cls: 'frost',
    mul: { linger: 2 }, add: { freeze: 0.1 } },
  { id: 'hurricane', name: 'Ураган', text: 'вихрь катится вдвое дольше', cls: 'shaman', mul: { whirlTime: 2 } },
  { id: 'granite', name: 'Гранит', text: 'стена вдвое прочнее', cls: 'earth', mul: { wallHp: 2 } },
  { id: 'victory', name: 'Знамя победы', text: 'аура на 1,5 клетки шире, скорость ещё +20%', cls: 'banner',
    add: { aura: 1.5, haste: 0.2 } },
  { id: 'holywater', name: 'Святая вода', text: 'свет бьёт всех, а не только нежить', cls: 'healer',
    set: { holyAll: true } },
  { id: 'muses', name: 'Два ученика', text: 'вдохновляет сразу двоих', cls: 'sage', set: { muses: 2 } },
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
    own: UNIQUES.filter((u) => u.cls === cls || !u.cls && u.role && u.role === info.role),
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
  const amount = Math.max(unitOf(stat), round(Math.abs(weapon.stats[id]) * UPGRADE_SHARE, unitOf(stat)));
  weapon.ups = Object.assign({}, weapon.ups);
  weapon.ups[id] = round((weapon.ups[id] || 0) + amount, unitOf(stat) / 10);
  return { id, amount };
}

export function weaponScore(weapon) {
  if (!weapon) return 0;
  const stats = weaponStats(weapon);
  let score = weapon.unique ? 4 : 0;
  for (const stat of STATS) score += (stats[stat.id] || 0) / stat.step * stat.worth;
  return score;
}

export function spin(random, cls) {
  const roll = pick(OUTCOMES.concat(RARITIES), random);
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

export const rarityOf = (id) => RARITIES.find((rarity) => rarity.id === id) || RARITIES[0];

export const gearColor = (weapon) => (weapon ? rarityOf(weapon.rarity).color : '#ffffff');

export const outcomeOf = (id) => OUTCOMES.find((outcome) => outcome.id === id) || null;
