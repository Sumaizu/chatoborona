export const PRICE = 50;
export const KILL_COINS = 3;
export const ASSIST_COINS = 2;
export const SLOTS = 2;
export const SPIN_TIME = 4;
export const SHOW_TIME = 7;
export const SHOW_FAST = 4;
export const CRIT_MUL = 2;

export const RARITIES = [
  { id: 'poor', name: 'Плохой', color: '#9ca3af', chance: 0.3, good: 0, bad: 2, power: 1 },
  { id: 'common', name: 'Обычный', color: '#4ade80', chance: 0.3, good: 1, bad: 1, power: 1.2 },
  { id: 'rare', name: 'Редкий', color: '#60a5fa', chance: 0.2, good: 2, bad: 0, power: 1.5 },
  { id: 'mythic', name: 'Мифический', color: '#c084fc', chance: 0.1, good: 3, bad: 0, power: 2.2 },
  { id: 'epic', name: 'Эпический', color: '#facc15', chance: 0.07, good: 4, bad: 0, power: 3 },
  { id: 'legendary', name: 'Легендарный', color: '#f97316', chance: 0.03, good: 5, bad: 0, power: 4, unique: true },
];

export const STATS = [
  { id: 'damage', name: 'урона', step: 0.06, worth: 1 },
  { id: 'rate', name: 'скорости атаки', step: 0.05, worth: 1 },
  { id: 'range', name: 'дальности', step: 0.2, worth: 0.5, cells: true },
  { id: 'crit', name: 'шанса крита', step: 0.03, worth: 1, good: true },
  { id: 'xp', name: 'опыта', step: 0.08, worth: 0.2 },
  { id: 'coins', name: 'монет', step: 0.1, worth: 0.2 },
];

export const UNIQUES = [
  { id: 'ignite', name: 'Поджог', text: 'удары поджигают: 30% урона в секунду, 3 с' },
  { id: 'frostbite', name: 'Обморожение', text: 'удары замедляют на 30% на 2 с' },
  { id: 'venom', name: 'Яд', text: 'удары отравляют: 25% урона в секунду, 4 с' },
  { id: 'deadeye', name: 'Меткость', text: '15% шанс урона ×4' },
  { id: 'thunderclap', name: 'Оглушение', text: '10% шанс оглушить на 0,8 с' },
  { id: 'spark', name: 'Искра', text: 'удар перескакивает на соседа с половиной урона' },
  { id: 'blast', name: 'Взрыв', text: 'удар взрывается: соседям 40% урона' },
  { id: 'reaper', name: 'Жнец', text: 'моб (не босс) с запасом меньше 12% умирает от удара' },
  { id: 'breaker', name: 'Бронебой', text: 'сквозь броню и щиты, +30% урона по элитным и боссам' },
  { id: 'echo', name: 'Эхо', text: '20% шанс ударить второй раз' },
  { id: 'midas', name: 'Мидас', text: 'вдвое больше монет' },
  { id: 'scholar', name: 'Мудрость', text: '+60% опыта' },
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

function shuffled(list, random) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function makeWeapon(random, cls, rarity = pick(RARITIES, random)) {
  const stats = {}, order = shuffled(STATS, random);
  const good = order.slice(0, rarity.good), bad = order.slice(rarity.good).filter((stat) => !stat.good)
    .slice(0, rarity.bad);
  const unit = (stat) => (stat.cells ? 0.1 : 0.01);
  for (const stat of good) {
    stats[stat.id] = Math.max(unit(stat), round(stat.step * rarity.power * (0.6 + 0.4 * random()), unit(stat)));
  }
  for (const stat of bad) stats[stat.id] = -Math.max(unit(stat), round(stat.step * (0.6 + 0.6 * random()), unit(stat)));
  const weapon = { rarity: rarity.id, cls: WEAPONS[cls] ? cls : 'sniper', stats };
  if (rarity.unique) weapon.unique = UNIQUES[Math.floor(random() * UNIQUES.length)].id;
  return weapon;
}

export function weaponScore(weapon) {
  if (!weapon) return 0;
  let score = weapon.unique ? 4 : 0;
  for (const stat of STATS) score += (weapon.stats[stat.id] || 0) / stat.step * stat.worth;
  return score;
}

export function spin(random, cls) {
  return { kind: 'weapon', weapon: makeWeapon(random, cls) };
}

export function statText(id, value) {
  const stat = STATS.find((item) => item.id === id);
  const size = stat.cells ? String(Math.round(Math.abs(value) * 10) / 10).replace('.', ',')
    : Math.round(Math.abs(value) * 100) + '%';
  return (value < 0 ? '−' : '+') + size + ' ' + stat.name;
}

export const uniqueOf = (id) => UNIQUES.find((unique) => unique.id === id) || null;

export const weaponName = (weapon) => rarityOf(weapon.rarity).name + ' ' + WEAPONS[weapon.cls];

export const rarityOf = (id) => RARITIES.find((rarity) => rarity.id === id) || RARITIES[0];
