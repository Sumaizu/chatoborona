import { CLASS_BY_ID, CLASSES } from './classes.js';

export const PRICE = 50;
export const UPGRADE_PRICE = 100;
export const KILL_COINS = 3;
export const ASSIST_COINS = 2;
export const SLOTS = 4;
export const SPIN_TIME = 2;
export const SHOW_TIME = 7;
export const SHOW_FAST = 4;
export const RUSH = { queue: 12, spin: 0.8, show: 1.2 };
export const QUEUE_CAP = 10;
export const ASCEND_AT = 10;
export const TIER_STEPS = 5;

export const OUTCOMES = [
  { id: 'handful', name: 'Горстка монет', color: '#facc15', chance: 0.692, coins: [1, 50] },
  { id: 'bag', name: 'Мешок монет', color: '#e8a33d', chance: 0.2375, coins: [51, 150] },
  { id: 'chest', name: 'Сундук монет', color: '#ffb020', chance: 0.0675, coins: [151, 500] },
  { id: 'particle', name: 'Частица бога', color: '#ff2e4d', chance: 0.003 },
  { id: 'stone', name: 'Камень навыка', color: '#ff2e4d', chance: 0 },
];

export const RARITIES = [
  { id: 'plain', name: 'Простой', color: '#ffffff', gain: 1 },
  { id: 'common', name: 'Обычный', color: '#4ade80', gain: 2 },
  { id: 'rare', name: 'Редкий', color: '#60a5fa', gain: 3 },
  { id: 'mythic', name: 'Мифический', color: '#c084fc', gain: 4 },
  { id: 'epic', name: 'Эпический', color: '#facc15', gain: 5 },
  { id: 'legendary', name: 'Легендарный', color: '#f97316', gain: 6 },
];

export const DIVINE = { id: 'divine', name: 'Божественный', color: '#ff2e4d', gain: 10, boon: 1.5 };

export const BOONS = [
  { id: 'rapid', name: 'Скорострельность', text: 'атака на 15% чаще', mods: { rate: 0.15 } },
  { id: 'long', name: 'Дальнобойность', text: '+0,5 клетки дальности', mods: { range: 0.5 } },
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

const randomBoon = (random) => BOONS[Math.floor(random() * BOONS.length)].id;

export function makeWeapon(random, cls, rarity = RARITIES[0]) {
  const owner = CLASS_BY_ID.has(cls) ? cls : CLASSES[0].id, tier = Math.max(0, RARITIES.indexOf(rarity));
  const power = RARITIES.slice(0, tier).reduce((sum, item) => sum + item.gain * TIER_STEPS, 0);
  const weapon = { rarity: RARITIES[tier].id, cls: owner, power, plus: tier * TIER_STEPS, step: 0 };
  if (weapon.rarity === 'legendary') weapon.boon = randomBoon(random);
  return weapon;
}

export function upgrade(weapon, random = Math.random) {
  const rarity = rarityOf(weapon.rarity), amount = rarity.gain;
  weapon.power += amount;
  weapon.plus = (weapon.plus || 0) + 1;
  if (weapon.rarity === DIVINE.id) return { amount, ascended: false, rose: null };
  weapon.step = (weapon.step || 0) + 1;
  if (weapon.step < (weapon.rarity === 'legendary' ? ASCEND_AT : TIER_STEPS)) return { amount, ascended: false, rose: null };
  weapon.step = 0;
  if (weapon.rarity === 'legendary') {
    ascend(weapon);
    return { amount, ascended: true, rose: DIVINE.id };
  }
  weapon.rarity = RARITIES[RARITIES.indexOf(rarity) + 1].id;
  if (weapon.rarity === 'legendary') weapon.boon = randomBoon(random);
  return { amount, ascended: false, rose: weapon.rarity };
}

export function ascend(weapon) {
  weapon.step = 0;
  weapon.rarity = DIVINE.id;
  return weapon;
}

export const weaponPower = (weapon) => (weapon ? weapon.power : 0);

export function boonMods(weapon) {
  const boon = weapon && weapon.boon ? boonOf(weapon.boon) : null;
  if (!boon) return null;
  const scale = weapon.rarity === DIVINE.id ? DIVINE.boon : 1, mods = {};
  for (const key of Object.keys(boon.mods)) mods[key] = boon.mods[key] * scale;
  return mods;
}

export function spin(random, cls, { particle = false, stone = 0 } = {}) {
  if (stone && random() < stone) return { kind: 'stone' };
  const roll = pick(OUTCOMES.filter((outcome) => outcome.chance > 0 && !(particle && outcome.id === 'particle')), random);
  if (roll.coins) {
    const [low, high] = roll.coins;
    return { kind: roll.id, coins: low + Math.floor(random() * (high - low + 1)) };
  }
  return { kind: roll.id };
}

export const rarityOf = (id) => (id === DIVINE.id ? DIVINE : RARITIES.find((rarity) => rarity.id === id)
  || RARITIES[0]);

export const WEAPON = 'Оружие';

export const weaponTitle = (weapon) => WEAPON + (weapon.plus ? ' +' + weapon.plus : '');

export const gearColor = (weapon) => (weapon ? rarityOf(weapon.rarity).color : '#ffffff');

export const outcomeOf = (id) => OUTCOMES.find((outcome) => outcome.id === id) || null;
