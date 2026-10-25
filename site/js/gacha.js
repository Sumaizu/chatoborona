import { CLASS_BY_ID, CLASSES, num } from './classes.js';

export const PRICE = 50;
export const UPGRADE_PRICE = 100;
export const UPGRADE_SHARE = 0.2;
export const KILL_COINS = 3;
export const ASSIST_COINS = 2;
export const SLOTS = 3;
export const SPIN_TIME = 2;
export const SHOW_TIME = 7;
export const SHOW_FAST = 4;
export const RUSH = { queue: 12, spin: 0.8, show: 1.2 };
export const QUEUE_CAP = 5;
export const EXTRA_SLOTS = [30, 100];
export const ASCEND_AT = 30;
export const DIVINE_SHARE = 0.05;

export const OUTCOMES = [
  { id: 'void', name: 'Пустота', color: '#6b7280', chance: 0.133 },
  { id: 'handful', name: 'Горстка монет', color: '#facc15', chance: 0.075, coins: [1, 50] },
  { id: 'bag', name: 'Мешок монет', color: '#e8a33d', chance: 0.0675, coins: [51, 150] },
  { id: 'chest', name: 'Сундук монет', color: '#ffb020', chance: 0.0075, coins: [151, 500] },
  { id: 'particle', name: 'Частица бога', color: '#ff2e4d', chance: 0.002 },
  { id: 'rune', name: 'Руна способности', color: '#ff2e4d', chance: 0.015 },
];

export const RARITIES = [
  { id: 'common', name: 'Обычный', her: 'Обычная', color: '#4ade80', chance: 0.27, good: 1, bad: 1, power: 1.2 },
  { id: 'rare', name: 'Редкий', her: 'Редкая', color: '#60a5fa', chance: 0.2, good: 2, bad: 0, power: 1.5 },
  { id: 'mythic', name: 'Мифический', her: 'Мифическая', color: '#c084fc', chance: 0.1, good: 3, bad: 0, power: 2.2 },
  { id: 'epic', name: 'Эпический', her: 'Эпическая', color: '#facc15', chance: 0.07, good: 4, bad: 0, power: 3 },
  { id: 'legendary', name: 'Легендарный', her: 'Легендарная', color: '#f97316', chance: 0.06, good: 4, bad: 0,
    power: 4 },
];

export const DIVINE = { id: 'divine', name: 'Божественный', her: 'Божественная', color: '#ff2e4d' };

export const STATS = [
  { id: 'str', step: 2.5 },
  { id: 'agi', step: 2.5 },
  { id: 'int', step: 2.5 },
  { id: 'mas', step: 2 },
];

const UNIT = 0.1;

function pick(list, random) {
  let roll = random() * list.reduce((sum, item) => sum + item.chance, 0);
  for (const item of list) {
    roll -= item.chance;
    if (roll < 0) return item;
  }
  return list[list.length - 1];
}

const round = (value, step = UNIT) => Math.round(value / step) * step;
export const statOf = (id) => STATS.find((stat) => stat.id === id);

function shuffled(list, random) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function makeWeapon(random, cls, rarity = pick(RARITIES, random)) {
  const gear = shuffled(STATS, random), stats = {};
  const good = gear.slice(0, Math.min(rarity.good, gear.length));
  const bad = gear.slice(good.length).slice(0, rarity.bad);
  for (const stat of good) stats[stat.id] = Math.max(UNIT, round(stat.step * rarity.power * (0.6 + 0.4 * random())));
  for (const stat of bad) stats[stat.id] = -Math.max(UNIT, round(stat.step * (0.4 + 0.4 * random())));
  return { rarity: rarity.id, cls: CLASS_BY_ID.has(cls) ? cls : CLASSES[0].id, stats, ups: {} };
}

export function weaponStats(weapon) {
  const total = Object.assign({}, weapon.stats);
  for (const [id, value] of Object.entries(weapon.ups || {})) total[id] = round((total[id] || 0) + value, UNIT / 10);
  return total;
}

export function upgrade(random, weapon, chosen = null) {
  const ids = Object.keys(weapon.stats).filter((key) => weapon.stats[key] > 0);
  const id = chosen || ids[Math.floor(random() * ids.length)];
  const share = weapon.rarity === DIVINE.id ? DIVINE_SHARE : UPGRADE_SHARE;
  const power = (RARITIES.find((rarity) => rarity.id === weapon.rarity) || RARITIES[RARITIES.length - 1]).power;
  const base = weapon.stats[id] > 0 ? weapon.stats[id] : statOf(id).step * power * 0.8;
  const amount = Math.max(UNIT, round(base * share));
  weapon.ups = Object.assign({}, weapon.ups);
  weapon.ups[id] = round((weapon.ups[id] || 0) + amount, UNIT / 10);
  weapon.plus = (weapon.plus || 0) + 1;
  const ascended = weapon.rarity === 'legendary' && weapon.plus >= ASCEND_AT;
  if (ascended) ascend(weapon);
  return { id, amount, ascended };
}

export function ascend(weapon) {
  weapon.stats = weaponStats(weapon);
  weapon.ups = {};
  weapon.plus = 0;
  weapon.rarity = DIVINE.id;
  return weapon;
}

export function weaponScore(weapon) {
  if (!weapon) return 0;
  const stats = weaponStats(weapon);
  return STATS.reduce((score, stat) => score + (stats[stat.id] || 0) / stat.step, 0);
}

export function spin(random, cls, { particle = false, runes = 0 } = {}) {
  const info = CLASS_BY_ID.get(cls), full = !info || runes >= info.runes.length;
  const pool = OUTCOMES.filter((outcome) => !(particle && outcome.id === 'particle')
    && !(full && outcome.id === 'rune'));
  const roll = pick(pool.concat(RARITIES), random);
  if (roll.coins) {
    const [low, high] = roll.coins;
    return { kind: roll.id, coins: low + Math.floor(random() * (high - low + 1)) };
  }
  if (OUTCOMES.includes(roll)) return { kind: roll.id };
  return { kind: 'weapon', weapon: makeWeapon(random, cls, roll) };
}

export const amountText = (id, value) => num(Math.abs(value));

export const rarityOf = (id) => (id === DIVINE.id ? DIVINE : RARITIES.find((rarity) => rarity.id === id)
  || RARITIES[0]);

export const weaponName = (weapon) => {
  const rarity = rarityOf(weapon.rarity), cls = CLASS_BY_ID.get(weapon.cls);
  return (cls && cls.her ? rarity.her : rarity.name) + ' ' + (cls ? cls.weapon : '');
};

export const rankOf = (weapon) => (weapon.rarity === DIVINE.id ? RARITIES.length
  : RARITIES.findIndex((rarity) => rarity.id === weapon.rarity));

export const weaponTitle = (weapon) => weaponName(weapon) + (weapon.plus ? ' +' + weapon.plus : '');

export const gearColor = (weapon) => (weapon ? rarityOf(weapon.rarity).color : '#ffffff');

export const outcomeOf = (id) => OUTCOMES.find((outcome) => outcome.id === id) || null;
