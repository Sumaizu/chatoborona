import { MIGHT } from './balance.js';
import { CLASS_BY_ID, CLASSES } from './classes.js';

export const PRICE = 50;
export const UPGRADE_PRICE = 100;
export const KILL_COINS = 3;
export const ASSIST_COINS = 2;
export const SLOTS = 3;
export const SPIN_TIME = 2;
export const SHOW_TIME = 7;
export const SHOW_FAST = 4;
export const RUSH = { queue: 12, spin: 0.8, show: 1.2 };
export const QUEUE_CAP = 10;
export const EXTRA_SLOTS = [30, 100];
export const ASCEND_AT = 30;

export const OUTCOMES = [
  { id: 'void', name: 'Пустота', color: '#6b7280', chance: 0.132 },
  { id: 'handful', name: 'Горстка монет', color: '#facc15', chance: 0.075, coins: [1, 50] },
  { id: 'bag', name: 'Мешок монет', color: '#e8a33d', chance: 0.0675, coins: [51, 150] },
  { id: 'chest', name: 'Сундук монет', color: '#ffb020', chance: 0.0075, coins: [151, 500] },
  { id: 'particle', name: 'Частица бога', color: '#ff2e4d', chance: 0.003 },
  { id: 'rune', name: 'Руна способности', color: '#ff2e4d', chance: 0.015 },
];

export const RARITIES = [
  { id: 'common', name: 'Обычный', her: 'Обычная', color: '#4ade80', chance: 0.27 },
  { id: 'rare', name: 'Редкий', her: 'Редкая', color: '#60a5fa', chance: 0.2 },
  { id: 'mythic', name: 'Мифический', her: 'Мифическая', color: '#c084fc', chance: 0.1 },
  { id: 'epic', name: 'Эпический', her: 'Эпическая', color: '#facc15', chance: 0.07 },
  { id: 'legendary', name: 'Легендарный', her: 'Легендарная', color: '#f97316', chance: 0.06 },
];

export const DIVINE = { id: 'divine', name: 'Божественный', her: 'Божественная', color: '#ff2e4d' };

export const BOONS = [
  { id: 'rapid', name: 'Скорострельность', text: 'атака на 15% чаще', mods: { rate: 0.15 } },
  { id: 'long', name: 'Дальнобойность', text: '+0,5 клетки дальности', mods: { range: 0.5 }, skip: ['parasite'] },
  { id: 'keen', name: 'Меткость', text: '+10% шанса крита', mods: { crit: 0.1 } },
  { id: 'swift', name: 'Быстрота', text: 'способности на 15% чаще', mods: { haste: 0.15 } },
  { id: 'rich', name: 'Щедрость', text: '+15% монет', mods: { coins: 0.15 } },
];

export const boonOf = (id) => BOONS.find((boon) => boon.id === id) || null;

function pick(list, random) {
  let roll = random() * list.reduce((sum, item) => sum + item.chance, 0);
  for (const item of list) {
    roll -= item.chance;
    if (roll < 0) return item;
  }
  return list[list.length - 1];
}

export function makeWeapon(random, cls, rarity = pick(RARITIES, random)) {
  const roll = 1 - MIGHT.spread + 2 * MIGHT.spread * random();
  const power = Math.max(1, Math.round(MIGHT.rarity[rarity.id] * roll));
  const owner = CLASS_BY_ID.has(cls) ? cls : CLASSES[0].id;
  const weapon = { rarity: rarity.id, cls: owner, power, plus: 0 };
  if (rarity.id === 'legendary') {
    const boons = BOONS.filter((boon) => !(boon.skip && boon.skip.includes(owner)));
    weapon.boon = boons[Math.floor(random() * boons.length)].id;
  }
  return weapon;
}

export function upgrade(weapon) {
  const amount = weapon.rarity === DIVINE.id ? MIGHT.divine : MIGHT.upgrade;
  weapon.power += amount;
  weapon.plus = (weapon.plus || 0) + 1;
  const ascended = weapon.rarity === 'legendary' && weapon.plus >= ASCEND_AT;
  if (ascended) ascend(weapon);
  return { amount, ascended };
}

export function ascend(weapon) {
  weapon.plus = 0;
  weapon.rarity = DIVINE.id;
  return weapon;
}

export const weaponPower = (weapon) => (weapon ? weapon.power : 0);

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
