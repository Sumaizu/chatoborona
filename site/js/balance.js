export const LIVES = 20;
export const HEAL_CAP = 2;
export const LEVEL_MAX = 100;
export const TIER_EVERY = 10;
export const TICK = 0.05;

export const TOWER = { damage: 10, interval: 1, range: 2.5, damageGrowth: 0.046, rateGrowth: 0.004 };

export const MOBS = {
  normal: { name: 'Зомби', hp: 1, speed: 1, xp: 1, coins: 1, leak: 1 },
  fast: { name: 'Пёс', hp: 0.6, speed: 1.7, xp: 1, coins: 1, leak: 1 },
  tough: { name: 'Громила', hp: 2.6, speed: 0.7, xp: 2, coins: 1, leak: 2 },
  swarm: { name: 'Крыса', hp: 0.35, speed: 1.25, xp: 1, coins: 1, leak: 1 },
  elite: { name: 'Элитный', hp: 6, speed: 0.85, xp: 5, coins: 3, leak: 3, elite: true },
  boss: { name: 'Босс', hp: 30, speed: 0.6, xp: 20, coins: 10, leak: 6, boss: true },
};

export const POWERS = {
  dash: { id: 'dash', name: 'Рывок', text: 'временами бежит вдвое быстрее', every: 6, time: 1.5, boost: 1 },
  mend: { id: 'mend', name: 'Лечение', text: 'лечит мобов вокруг себя', range: 4, heal: 0.04 },
  armor: { id: 'armor', name: 'Броня', text: 'получает на 35% меньше урона', cut: 0.35 },
  brood: { id: 'brood', name: 'Выводок', text: 'призывает крыс', every: 5, count: 2, hp: 0.7, summon: 'swarm',
    look: 'rat' },
  regen: { id: 'regen', name: 'Регенерация', text: 'постоянно восстанавливает здоровье', heal: 0.012 },
  rage: { id: 'rage', name: 'Ярость', text: 'чем меньше здоровья, тем быстрее бежит', boost: 0.8 },
  horde: { id: 'horde', name: 'Орда', text: 'призывает стаи крыс', every: 5, count: 3, hp: 0.7, summon: 'swarm',
    look: 'rat' },
  fury: { id: 'fury', name: 'Адский жар', text: 'мобы рядом бегут на 30% быстрее', range: 1.8, boost: 0.3 },
  imps: { id: 'imps', name: 'Призыв бесов', text: 'призывает бесят', every: 6, count: 2, hp: 0.8, summon: 'normal',
    look: 'imp' },
  shield: { id: 'shield', name: 'Щит', text: 'раз в 8 секунд неуязвим на 2 секунды', every: 8, time: 2 },
  split: { id: 'split', name: 'Деление', text: 'при смерти распадается на двух больших слизней' },
};

export const ELITES = [
  { id: 'leader', name: 'Вожак', power: 'dash', glow: '#facc15' },
  { id: 'plague', name: 'Чумной', power: 'mend', glow: '#4ade80', undead: true },
  { id: 'knight', name: 'Латник', power: 'armor', glow: '#93c5fd', undead: true },
  { id: 'ratking', name: 'Крысиный король', power: 'brood', glow: '#c084fc' },
  { id: 'blazer', name: 'Огненный бес', power: 'fury', glow: '#f97316', from: 15 },
  { id: 'slimeking', name: 'Слизень-король', power: 'split', glow: '#4ade80', from: 30, slime: 4 },
];

export const BOSSES = [
  { id: 'butcher', name: 'Мясник', power: 'regen', glow: '#ef4444' },
  { id: 'crusher', name: 'Костолом', power: 'rage', glow: '#fb923c' },
  { id: 'mother', name: 'Крысиная матка', power: 'horde', glow: '#c084fc' },
  { id: 'warden', name: 'Страж склепа', power: 'shield', glow: '#67e8f9', undead: true },
  { id: 'archdemon', name: 'Архидемон', power: 'imps', glow: '#ef4444', from: 20 },
];

export const LOOKS = {
  normal: [{ id: 'zombie', name: 'Зомби', undead: true }, { id: 'skeleton', name: 'Скелет', from: 3, undead: true },
    { id: 'imp', name: 'Бесёнок', from: 8 },
    { id: 'slime2', name: 'Слизень', from: 12, slime: 2, text: 'при смерти делится на двух слизнят' },
    { id: 'ember', name: 'Огненный элементаль', from: 16, element: 'fire', text: 'огонь его не берёт' },
    { id: 'frostling', name: 'Ледяной элементаль', from: 18, element: 'ice',
      text: 'лёд его не берёт: не мёрзнет и не замедляется' }],
  fast: [{ id: 'dog', name: 'Пёс' }, { id: 'crow', name: 'Ворон', from: 4, flying: true },
    { id: 'hellhound', name: 'Адская гончая', from: 12 },
    { id: 'stormling', name: 'Грозовой элементаль', from: 22, element: 'storm', text: 'молнии его не берут' }],
  tough: [{ id: 'brute', name: 'Громила' }, { id: 'demon', name: 'Демон', from: 14 },
    { id: 'slime3', name: 'Большой слизень', from: 20, slime: 3, text: 'при смерти делится на двух слизней' },
    { id: 'sludge', name: 'Ядовитый элементаль', from: 25, element: 'poison', text: 'яд его не берёт' }],
  swarm: [{ id: 'rat', name: 'Крыса' }, { id: 'bat', name: 'Летучая мышь', from: 6, flying: true },
    { id: 'slime1', name: 'Слизнёнок', from: 5, slime: 1 }],
};

export const SLIMES = ['swarm', 'normal', 'tough'];

export const lookOf = (id) => {
  for (const list of Object.values(LOOKS)) {
    const look = list.find((item) => item.id === id);
    if (look) return look;
  }
  return null;
};

export const WAVE = {
  hp: 18,
  growth: 1.05,
  accel: 0.00045,
  players: 0.75,
  crowd: 0.85,
  pivot: 10,
  solo: 0.3,
  speed: 1.4,
  count: 8,
  countStep: 0.4,
  countMax: 24,
  gap: 0.8,
  swarmGap: 0.4,
  bigGap: 1.5,
};

export const XP = { first: 10, step: 3 };

const PATTERN = [
  { cycle: ['normal'] },
  { cycle: ['normal', 'normal', 'fast'] },
  { cycle: ['swarm'], size: 2 },
  { cycle: ['normal', 'normal', 'tough'] },
  { cycle: ['normal'], elites: 1 },
  { cycle: ['fast'] },
  { cycle: ['normal', 'fast', 'tough'] },
  { cycle: ['swarm', 'swarm', 'tough'], size: 1.5 },
  { cycle: ['normal', 'fast', 'tough'], elites: 1 },
  { cycle: ['normal'], size: 0.5, bosses: 1 },
];

export const tierOf = (level) => Math.floor(level / TIER_EVERY);

export function towerBase(level) {
  const n = level - 1;
  return {
    damage: TOWER.damage * (1 + TOWER.damageGrowth * n),
    interval: TOWER.interval / (1 + TOWER.rateGrowth * n),
    range: TOWER.range,
  };
}

let table = null, tableKey = '';

function totals() {
  const key = XP.first + '/' + XP.step;
  if (table && key === tableKey) return table;
  table = [0, 0];
  for (let level = 1; level < LEVEL_MAX; level++) {
    table.push(table[level] + Math.round(XP.first + XP.step * (level - 1)));
  }
  tableKey = key;
  return table;
}

export function levelOf(xp) {
  const t = totals();
  let low = 1, high = LEVEL_MAX;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (t[mid] <= xp) low = mid;
    else high = mid - 1;
  }
  return low;
}

export const xpForLevel = (level) => totals()[Math.max(1, Math.min(LEVEL_MAX, level))];

export function waveHp(wave, type, players) {
  const n = wave - 1;
  return WAVE.hp * MOBS[type].hp * Math.pow(WAVE.growth, n) * Math.exp(WAVE.accel * n * n)
    * crowdFactor(players);
}

export function crowdFactor(players) {
  const p = Math.max(1, players), few = 1 - WAVE.solo * Math.exp((1 - p) / 2);
  if (p <= WAVE.pivot) return Math.pow(p, WAVE.players) * few;
  return Math.pow(WAVE.pivot, WAVE.players) * Math.pow(p / WAVE.pivot, WAVE.crowd) * few;
}

export function waveSpawns(wave) {
  const plan = PATTERN[(wave - 1) % PATTERN.length];
  const count = Math.round(Math.min(WAVE.countMax, WAVE.count + WAVE.countStep * (wave - 1)) * (plan.size || 1));
  const spawns = [];
  let delay = 0;
  for (let i = 0; i < count; i++) {
    const type = plan.cycle[i % plan.cycle.length];
    spawns.push({ type, delay });
    delay += type === 'swarm' ? WAVE.swarmGap : WAVE.gap;
  }
  const big = (type, amount) => {
    for (let i = 0; i < amount; i++) {
      delay += WAVE.bigGap;
      spawns.push({ type, delay });
    }
  };
  if (plan.elites) big('elite', plan.elites + Math.floor(wave / 20));
  if (plan.bosses) big('boss', plan.bosses + Math.floor(wave / 50));
  return spawns;
}
