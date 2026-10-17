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
  elite: { name: 'Элитный', hp: 4.5, speed: 0.85, xp: 5, coins: 3, leak: 3, elite: true },
  boss: { name: 'Босс', hp: 6, speed: 0.6, xp: 20, coins: 10, leak: 6, boss: true },
};

export const BIOME_RULES = {
  grass: { name: 'Луг', text: 'обычная карта' },
  volcano: { name: 'Вулкан', text: 'лёд слабее', weak: 'ice' },
  swamp: { name: 'Болото', text: 'ходячие мобы медленнее, но их больше', ground: 0.8, more: 'ground' },
  snow: { name: 'Снега', text: 'огонь слабее', weak: 'fire' },
  desert: { name: 'Пустыня', text: 'летучие мобы быстрее, и их больше', air: 1.25, more: 'air' },
  graveyard: { name: 'Кладбище', text: 'павшие мобы встают скелетами', rise: true },
};

export const TERRAIN = { weak: 0.75, more: 0.25, hill: 0.8, grave: 0.2,
  bodiless: ['ember', 'frostling', 'stormling', 'sludge', 'slime1', 'slime2', 'slime3', 'ghost', 'mirage', 'golem',
    'mimic', 'shade', 'slimeking'] };

export const POWERS = {
  dash: { id: 'dash', name: 'Рывок', text: 'временами бежит вдвое быстрее', every: 6, time: 1.5, boost: 1 },
  mend: { id: 'mend', name: 'Лечение', text: 'лечит мобов вокруг себя', range: 4, heal: 0.015 },
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
  veil: { id: 'veil', name: 'Невидимость', text: 'раз в 6 секунд на 2 секунды пропадает из прицелов', every: 6,
    time: 2 },
  raise: { id: 'raise', name: 'Поднять мёртвых', text: 'раз в 7 секунд поднимает двух скелетов', every: 7, count: 2,
    hp: 0.8, summon: 'normal', look: 'skeleton' },
  frenzy: { id: 'frenzy', name: 'Неистовство', text: 'раз в 8 секунд на 3 секунды несётся почти вдвое быстрее, '
    + 'и его не остановить', every: 8, time: 3, boost: 0.8, steady: true },
  steadfast: { id: 'steadfast', name: 'Каменная кожа', text: 'не замедляется, не оглушается, не отбрасывается '
    + 'и получает на 20% меньше урона', cut: 0.2, steady: true },
  hex: { id: 'hex', name: 'Сглаз', text: 'раз в 6 секунд оглушает ближайшего защитника на 1,5 секунды', every: 6,
    range: 3, hold: 1.5 },
  leech: { id: 'leech', name: 'Кровосос', text: 'лечится, когда рядом гибнут мобы', range: 2.5, drain: 0.1 },
  blink: { id: 'blink', name: 'Скачок', text: 'раз в 6 секунд прыгает на 2,5 клетки вперёд', every: 6, jump: 2.5 },
  undying: { id: 'undying', name: 'Бессмертие', text: 'после смерти встаёт с полным здоровьем и поднимает трёх '
    + 'скелетов; лекарь упокаивает его насовсем', revive: 1, raise: 3 },
  swoop: { id: 'swoop', name: 'Пике', text: 'раз в 8 секунд пикирует на ближайшего защитника и оглушает его на секунду',
    every: 8, range: 3, hold: 1 },
  ward: { id: 'ward', name: 'Оберег', text: 'раз в 10 секунд даёт мобам вокруг щит на 10% их здоровья', every: 10,
    range: 2.5, ward: 0.1 },
  carry: { id: 'carry', name: 'Носильщик', text: 'несёт трёх гоблинов: теряя здоровье, роняет их по одному', cargo: 3,
    hp: 0.6 },
  mirror: { id: 'mirror', name: 'Зеркало', text: 'раз в 6 секунд поднимает зеркало: удар отражается, стрелявший '
    + 'оглушён на 1,5 секунды', every: 6, time: 2, hold: 1.5 },
  curl: { id: 'curl', name: 'Клубок', text: 'от сильного удара сворачивается: 2 секунды неуязвим и катится вдвое '
    + 'быстрее', share: 0.15, time: 2, boost: 1, rest: 6 },
  tunnel: { id: 'tunnel', name: 'Подкоп', text: 'ползёт под землёй и выныривает раз в 6 секунд на 2 — только тогда его '
    + 'можно бить; вынырнув, глотает мины, капканы и лужи', every: 6, time: 2, reach: 1.5 },
  breath: { id: 'breath', name: 'Огненное дыхание', text: 'раз в 10 секунд дышит огнём по прямой: защитники на линии '
    + 'оглушены на 2 секунды, мины и лужи сгорают; огонь его жжёт вдвое слабее', every: 10, length: 6, width: 0.7,
    hold: 2 },
  web: { id: 'web', name: 'Паутина', text: 'раз в 7 секунд опутывает защитника — 5 секунд он бьёт вдвое медленнее; '
    + 'при смерти выпускает восемь паучат', every: 7, range: 3, time: 5, slow: 2, brood: 8, hp: 0.5 },
  treasure: { id: 'treasure', name: 'Сокровище', text: 'за убийство — золото всем, кто бил, и двойные монеты '
    + 'в следующей волне; дойдя до сердца, зарывается в землю' },
};

export const MIMIC = { id: 'mimic', name: 'Мимик', power: 'treasure', glow: '#facc15', treasure: true, hp: 1.6,
  chance: 0.05, from: 3, coins: 20, coinsStep: 1 };

export const ELITE_ODDS = { from: 3, base: 0.15, step: 0.012, top: 0.7, fall: 0.45, max: 4 };

export const REWARD = { coins: 4, coinsStep: 0.4, xp: 1, xpStep: 0.1 };

export const ELITES = [
  { id: 'leader', name: 'Вожак', power: 'dash', glow: '#facc15' },
  { id: 'plague', name: 'Чумной', power: 'mend', glow: '#4ade80', undead: true },
  { id: 'knight', name: 'Латник', power: 'armor', glow: '#93c5fd', undead: true },
  { id: 'ratking', name: 'Крысиный король', power: 'brood', glow: '#c084fc' },
  { id: 'blazer', name: 'Огненный бес', power: 'fury', glow: '#f97316', from: 15 },
  { id: 'slimeking', name: 'Слизень-король', power: 'split', glow: '#4ade80', from: 30, slime: 4 },
  { id: 'shade', name: 'Тень', power: 'veil', glow: '#a78bfa', from: 6 },
  { id: 'blinker', name: 'Прыгун', power: 'blink', glow: '#22d3ee', from: 8 },
  { id: 'necro', name: 'Некромант', power: 'raise', glow: '#a3e635', from: 9, undead: true },
  { id: 'witch', name: 'Ведьма', power: 'hex', glow: '#e879f9', from: 10 },
  { id: 'berserk', name: 'Берсерк', power: 'frenzy', glow: '#ef4444', from: 12 },
  { id: 'golem', name: 'Каменный голем', power: 'steadfast', glow: '#a8a29e', from: 14 },
  { id: 'vampire', name: 'Вампир', power: 'leech', glow: '#dc2626', from: 18 },
  { id: 'goblinshaman', name: 'Гоблин-шаман', power: 'ward', glow: '#4ade80', from: 11 },
  { id: 'ogre', name: 'Огр-носильщик', power: 'carry', glow: '#84cc16', from: 20 },
  { id: 'mirrorknight', name: 'Зеркальщик', power: 'mirror', glow: '#e2e8f0', from: 28 },
  { id: 'armadillo', name: 'Броненосец', power: 'curl', glow: '#d6a35c', from: 33 },
];

export const BOSSES = [
  { id: 'butcher', name: 'Мясник', power: 'regen', glow: '#ef4444' },
  { id: 'crusher', name: 'Костолом', power: 'rage', glow: '#fb923c' },
  { id: 'mother', name: 'Крысиная матка', power: 'horde', glow: '#c084fc' },
  { id: 'warden', name: 'Страж склепа', power: 'shield', glow: '#67e8f9', undead: true },
  { id: 'archdemon', name: 'Архидемон', power: 'imps', glow: '#ef4444', from: 20 },
  { id: 'lich', name: 'Король-лич', power: 'undying', glow: '#a3e635', from: 30, undead: true },
  { id: 'worm', name: 'Червь-пожиратель', power: 'tunnel', glow: '#c2410c', from: 40, leak: 10 },
  { id: 'dragon', name: 'Дракон', power: 'breath', glow: '#f97316', from: 50, flying: true, fireproof: 0.5 },
  { id: 'spiderqueen', name: 'Матка пауков', power: 'web', glow: '#a855f7', from: 60 },
];

export const LOOKS = {
  normal: [{ id: 'zombie', name: 'Зомби', undead: true },
    { id: 'skeleton', name: 'Скелет', from: 3, undead: true, revive: 1, hp: 0.6,
      text: 'встаёт после смерти, если его не упокоил лекарь' },
    { id: 'imp', name: 'Бесёнок', from: 8 },
    { id: 'slime2', name: 'Слизень', from: 12, slime: 2, text: 'при смерти делится на двух слизнят' },
    { id: 'ember', name: 'Огненный элементаль', from: 16, element: 'fire', text: 'огонь его не берёт' },
    { id: 'frostling', name: 'Ледяной элементаль', from: 18, element: 'ice',
      text: 'лёд его не берёт: не мёрзнет и не замедляется' },
    { id: 'mole', name: 'Крот', from: 9, burrow: { every: 5, time: 1.5 },
      text: 'временами зарывается: под землёй его не достать, мины и стены ему нипочём' },
    { id: 'ghost', name: 'Призрак', from: 13, undead: true, phase: { every: 4, time: 1 },
      text: 'временами бесплотен: проходит сквозь стены и мины, урон по нему вдвое слабее — кроме света лекаря' },
    { id: 'harpy', name: 'Гарпия', from: 19, flying: true, power: 'swoop',
      text: 'летает и раз в 8 секунд оглушает ближайшего защитника на секунду' },
    { id: 'goblin', name: 'Гоблин', only: true }],
  fast: [{ id: 'dog', name: 'Пёс' }, { id: 'crow', name: 'Ворон', from: 4, flying: true },
    { id: 'hellhound', name: 'Адская гончая', from: 12 },
    { id: 'bonehound', name: 'Костяной пёс', from: 9, undead: true, revive: 1, hp: 0.6,
      text: 'встаёт после смерти' },
    { id: 'stormling', name: 'Грозовой элементаль', from: 22, element: 'storm', text: 'молнии его не берут' },
    { id: 'thief', name: 'Воришка', from: 7, thief: 3,
      text: 'крадёт по 3 монеты у тех, мимо кого бежит; кто его добьёт — заберёт всё украденное' },
    { id: 'mirage', name: 'Мираж', from: 24, mirage: true,
      text: 'от первого удара распадается на трёх — настоящий один' }],
  tough: [{ id: 'brute', name: 'Громила' }, { id: 'demon', name: 'Демон', from: 14 },
    { id: 'skelwarrior', name: 'Скелет-латник', from: 11, undead: true, revive: 1, armor: 0.25, hp: 0.6,
      text: 'в броне: на 25% крепче к урону, и встаёт после смерти' },
    { id: 'slime3', name: 'Большой слизень', from: 20, slime: 3, text: 'при смерти делится на двух слизней' },
    { id: 'sludge', name: 'Ядовитый элементаль', from: 25, element: 'poison', text: 'яд его не берёт' },
    { id: 'shieldbearer', name: 'Щитоносец', from: 15, front: 0.6,
      text: 'щит спереди: кто стоит впереди него по дороге, бьёт на 60% слабее — бейте сбоку и сзади' }],
  swarm: [{ id: 'rat', name: 'Крыса' }, { id: 'bat', name: 'Летучая мышь', from: 6, flying: true },
    { id: 'slime1', name: 'Слизнёнок', from: 5, slime: 1 }, { id: 'spiderling', name: 'Паучонок', only: true }],
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
  hp: 21,
  growth: 1.05,
  accel: 0.0007,
  players: 0.75,
  crowd: 0.95,
  pivot: 10,
  solo: 0.6,
  speed: 1.4,
  count: 8,
  countStep: 0.4,
  countMax: 24,
  gap: 0.8,
  swarmGap: 0.4,
  bigGap: 1.5,
};

export const XP = { first: 10, step: 3, bend: 0.05, from: 10 };

const PATTERN = [
  { cycle: ['normal'] },
  { cycle: ['normal', 'normal', 'fast'] },
  { cycle: ['swarm'], size: 2 },
  { cycle: ['normal', 'normal', 'tough'] },
  { cycle: ['normal', 'normal', 'fast', 'swarm'] },
  { cycle: ['fast'] },
  { cycle: ['normal', 'fast', 'tough'] },
  { cycle: ['swarm', 'swarm', 'tough'], size: 1.5 },
  { cycle: ['normal', 'fast', 'tough', 'normal'] },
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
  const key = [XP.first, XP.step, XP.bend, XP.from].join('/');
  if (table && key === tableKey) return table;
  table = [0, 0];
  for (let level = 1; level < LEVEL_MAX; level++) {
    const late = Math.max(0, level - XP.from);
    table.push(table[level] + Math.round(XP.first + XP.step * (level - 1) + XP.bend * late * late));
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
  if (plan.bosses) big('boss', plan.bosses + Math.floor(wave / 50));
  return spawns;
}

export function eliteCount(wave, random) {
  if (wave < ELITE_ODDS.from) return 0;
  let chance = Math.min(ELITE_ODDS.top, ELITE_ODDS.base + ELITE_ODDS.step * wave), count = 0;
  while (count < ELITE_ODDS.max && random() < chance) {
    count += 1;
    chance *= ELITE_ODDS.fall;
  }
  return count;
}

export const waveReward = (wave) => ({
  coins: Math.round(REWARD.coins + REWARD.coinsStep * wave),
  xp: Math.round((REWARD.xp + REWARD.xpStep * wave) * 10) / 10,
});
