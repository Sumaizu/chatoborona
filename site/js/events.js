export const BUFFS = [
  { id: 'fury', name: 'Ярость', text: 'всем +30% урона', mods: { damage: 0.3 } },
  { id: 'haste', name: 'Спешка', text: 'всем +30% скорости атаки', mods: { rate: 0.3 } },
  { id: 'eagle', name: 'Орлиный глаз', text: 'всем +0,7 к дальности', mods: { range: 0.7 } },
  { id: 'luck', name: 'Удача', text: 'всем +15% шанса крита', mods: { crit: 0.15 } },
  { id: 'gold', name: 'Жила', text: 'всем вдвое больше монет', mods: { coins: 1 } },
  { id: 'study', name: 'Прилежание', text: 'всем +50% опыта', mods: { xp: 0.5 } },
];

export const DEBUFFS = [
  { id: 'weak', name: 'Слабость', text: 'всем −25% урона', mods: { damage: -0.25 } },
  { id: 'tired', name: 'Усталость', text: 'всем −25% скорости атаки', mods: { rate: -0.25 } },
  { id: 'blind', name: 'Близорукость', text: 'всем −0,5 к дальности', mods: { range: -0.5 } },
  { id: 'sleep', name: 'Сонливость', text: 'все проспят первые 5 секунд волны', sleep: 5 },
];

export const BLESSINGS = [
  { id: 'wrath', name: 'Гнев богов', text: 'всем +20% урона', mods: { damage: 0.2 } },
  { id: 'fort', name: 'Крепость', text: 'база получает 5 жизней', lives: 5 },
  { id: 'mire', name: 'Трясина', text: 'мобы на 10% медленнее', foe: { speed: -0.1 } },
  { id: 'rush', name: 'Золотая лихорадка', text: 'всем +50% монет', mods: { coins: 0.5 } },
];

export const CURSES = [
  { id: 'iron', name: 'Железная шкура', text: 'мобы на 20% крепче', foe: { hp: 0.2 } },
  { id: 'swift', name: 'Быстрые ноги', text: 'мобы на 10% быстрее', foe: { speed: 0.1 } },
  { id: 'breach', name: 'Пробоина', text: 'база теряет 3 жизни', lives: -3 },
  { id: 'fog', name: 'Туман', text: 'всем −0,5 дальности', mods: { range: -0.5 } },
];

export const ODDS = [
  { kind: 'buff', chance: 0.35 },
  { kind: 'debuff', chance: 0.3 },
  { kind: 'blessing', chance: 0.02 },
  { kind: 'curse', chance: 0.02 },
  { kind: null, chance: 0.31 },
];

export const POOLS = { buff: BUFFS, debuff: DEBUFFS, blessing: BLESSINGS, curse: CURSES };
export const LASTING = new Set(['blessing', 'curse']);

export function rollEvent(random) {
  let roll = random() * ODDS.reduce((sum, odd) => sum + odd.chance, 0), kind = null;
  for (const odd of ODDS) {
    roll -= odd.chance;
    if (roll < 0) {
      kind = odd.kind;
      break;
    }
  }
  if (!kind) return null;
  const pool = POOLS[kind];
  return Object.assign({ kind }, pool[Math.floor(random() * pool.length)]);
}

export const effectOf = (kind, id) => (POOLS[kind] || []).find((effect) => effect.id === id) || null;
