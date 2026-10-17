import { HEAL_CAP, tierOf } from './balance.js';

export const PERKS = [10, 50];
export const ROLES = { damage: 'урон', control: 'контроль', support: 'поддержка' };

const has = (level, perk) => level >= PERKS[perk];
const pct = (value) => Math.round(value * 100) + '%';
export const num = (value) => String(Math.round(value * 10) / 10).replace('.', ',');

export function cells(value) {
  const n = Math.round(value * 10) / 10, units = n % 10, tens = n % 100;
  if (n % 1) return num(n) + ' клетки';
  return num(n) + (units === 1 && tens !== 11 ? ' клетка' : units >= 2 && units <= 4 && (tens < 12 || tens > 14)
    ? ' клетки' : ' клеток');
}

export const CLASSES = [
  {
    id: 'sniper',
    name: 'Снайпер',
    color: '#e5e7eb',
    role: 'damage',
    gear: ['damage', 'rate', 'range', 'crit', 'xp', 'coins'],
    hits: true,
    summary: 'Бьёт на полполя — сперва летучих, потом самого крепкого; пуля прошивает всех на линии',
    perks: ['Выстрел в голову — шанс тройного урона', 'Метка — цель получает больше урона от всех'],
    details: (p) => [
      'Бьёт на ' + cells(p.range) + ', сперва летучих, потом самого крепкого, редко и сильно: урон ×'
        + num(p.damage) + '; пуля летит дальше и прошивает всех на линии, каждому следующему — ' + pct(p.pierce),
      'Выстрел в голову: ' + pct(p.crit) + ' шанс на урон ×' + num(p.critMul),
      'Метка: цель ' + p.markTime + ' с получает +' + pct(p.mark) + ' урона от всех',
    ],
    params: (level, tier) => ({
      range: 4.5 + 0.015 * (level - 1),
      interval: 2.7,
      damage: 2.2,
      target: 'strongest',
      skyFirst: true,
      pierce: 0.6,
      crit: has(level, 0) ? 0.08 + 0.012 * tier : 0,
      critMul: 3 + 0.1 * tier,
      mark: has(level, 1) ? 0.2 + 0.01 * tier : 0,
      markTime: 3,
    }),
  },
  {
    id: 'gunner',
    name: 'Пулемётчик',
    color: '#eab308',
    role: 'damage',
    gear: ['damage', 'rate', 'range', 'crit', 'xp', 'coins'],
    hits: true,
    summary: 'Очень частая стрельба, разгоняется на одной цели',
    perks: ['Рикошет — пуля может отскочить в соседа', 'Шквал — раз в 8 секунд двойная скорость'],
    details: (p) => [
      'Стреляет втрое чаще слабыми пулями; на одной цели разгоняется до +' + pct(p.rampMax) + ' скорости',
      'Рикошет: ' + pct(p.ricochet) + ' шанс, что пуля попадёт ещё и в соседа',
      'Шквал: раз в ' + p.burstEvery + ' с на ' + num(p.burstTime) + ' с стреляет вдвое быстрее',
    ],
    params: (level, tier) => ({
      interval: 0.3,
      damage: 0.32,
      ramp: 0.1,
      rampMax: 0.6 + 0.008 * (level - 1),
      ricochet: has(level, 0) ? 0.15 + 0.025 * tier : 0,
      burstEvery: has(level, 1) ? 8 : 0,
      burstTime: 2 + 0.15 * tier,
      burstMul: 2,
    }),
  },
  {
    id: 'bomber',
    name: 'Подрывник',
    color: '#f97316',
    role: 'damage',
    gear: ['damage', 'rate', 'range', 'crit', 'xp', 'coins'],
    hits: true,
    summary: 'Снаряд взрывается и задевает всех рядом',
    perks: ['Кассета — шанс трёх добавочных взрывов', 'Напалм — после взрыва горит земля'],
    details: (p) => [
      'Снаряд взрывается: радиус ' + cells(p.splash) + ', соседи цели получают ' + pct(p.splashShare) + ' урона',
      'Кассета: ' + pct(p.cluster) + ' шанс на ещё три взрыва вокруг цели',
      'Напалм: земля горит ' + p.napalmTime + ' с и жжёт на ' + pct(p.napalm) + ' урона в секунду',
    ],
    params: (level, tier) => ({
      interval: 1.4,
      damage: 1.15,
      splash: 1 + 0.008 * (level - 1),
      splashShare: 0.6,
      cluster: has(level, 0) ? 0.15 + 0.015 * tier : 0,
      napalm: has(level, 1) ? 0.2 + 0.01 * tier : 0,
      napalmTime: 3,
      napalmRadius: 1,
    }),
  },
  {
    id: 'thunder',
    name: 'Громовержец',
    color: '#3b82f6',
    element: 'storm',
    role: 'damage',
    gear: ['damage', 'rate', 'range', 'crit', 'xp', 'coins'],
    hits: true,
    summary: 'Молния перескакивает с моба на моба',
    perks: ['Разряд — шанс оглушить', 'Гроза — молния в любого моба на поле'],
    details: (p) => [
      'Молния бьёт цель и перескакивает ещё на ' + p.jumps + ' мобов, каждый следующий получает меньше',
      'Разряд: ' + pct(p.stun) + ' шанс оглушить на ' + num(p.stunTime) + ' с',
      'Гроза: раз в ' + num(p.stormEvery) + ' с бьёт молнией любого моба на поле, урон ×' + num(p.stormMul),
    ],
    params: (level, tier) => ({
      interval: 1.2,
      damage: 0.95,
      jumps: 2 + Math.floor((level - 1) / 25),
      jumpRange: 2,
      falloff: 0.75,
      stun: has(level, 0) ? 0.1 + 0.01 * tier : 0,
      stunTime: 0.6,
      stormEvery: has(level, 1) ? 7 - 0.2 * tier : 0,
      stormMul: 2.2,
    }),
  },
  {
    id: 'alchemist',
    name: 'Алхимик',
    color: '#84cc16',
    element: 'poison',
    role: 'damage',
    gear: ['damage', 'rate', 'range', 'crit', 'power', 'xp', 'coins'],
    labels: { power: 'силы яда' },
    power: ['poison'],
    hits: true,
    summary: 'Кидает зелья: на дороге остаются лужи яда',
    perks: ['Зараза — яд переходит с умершего на соседа', 'Разъедание — отравленные получают больше урона'],
    details: (p) => [
      'Кидает на дорогу зелья — лужи яда на ' + p.puddleTime + ' с (до ' + p.puddles + ' сразу): кто в луже, '
        + 'травится на ' + pct(p.poison) + ' урона в секунду и ещё ' + num(p.linger) + ' с после. Летучих не травит',
      'Зараза: ' + pct(p.contagion) + ' шанс, что яд перейдёт с умершего на соседа',
      'Разъедание: отравленные получают +' + pct(p.corrode) + ' урона от всех',
    ],
    params: (level, tier) => ({
      interval: 1.6,
      damage: 1,
      target: 'puddle',
      poison: 1.1,
      puddle: 0.9 + 0.003 * (level - 1),
      puddleTime: 5,
      puddles: 3 + Math.floor(level / 34),
      linger: 2,
      contagion: has(level, 0) ? 0.2 + 0.02 * tier : 0,
      corrode: has(level, 1) ? 0.2 + 0.015 * tier : 0,
    }),
  },
  {
    id: 'pyro',
    name: 'Огнемётчик',
    color: '#ef4444',
    element: 'fire',
    role: 'damage',
    gear: ['damage', 'rate', 'range', 'crit', 'power', 'xp', 'coins'],
    labels: { power: 'силы огня' },
    power: ['burn', 'burnTime'],
    hits: true,
    summary: 'Без остановки жжёт струёй огня, мобы медленно выгорают',
    perks: ['Вспышка — шанс, что пламя на миг жжёт втрое сильнее', 'Пепел — сгоревший моб взрывается'],
    details: (p) => [
      'Без остановки жжёт узкой струёй огня на ' + cells(p.range) + ': всё в ней горит и выгорает ещё '
        + p.burnTime + ' с',
      'Вспышка: ' + pct(p.flash) + ' шанс, что пламя на миг жжёт ×' + p.flashMul,
      'Пепел: сгоревший моб взрывается, урон ×' + num(p.ash),
    ],
    params: (level, tier) => ({
      range: 2.2 + 0.008 * (level - 1),
      interval: 0.2,
      damage: 0.08,
      cone: 0.4,
      burn: 5,
      burnTime: 3,
      flash: has(level, 0) ? 0.05 + 0.005 * tier : 0,
      flashMul: 3,
      ash: has(level, 1) ? 2 + 0.1 * tier : 0,
      ashRange: 1,
    }),
  },
  {
    id: 'hunter',
    name: 'Охотник',
    color: '#b45309',
    role: 'damage',
    gear: ['damage', 'rate', 'range', 'crit', 'power', 'xp', 'coins'],
    labels: { power: 'силы капканов' },
    power: ['trapMul', 'trapHold'],
    hits: true,
    summary: 'Ставит на дорогу капканы, из арбалета слабо бьёт всех, а крупную дичь — первой и в разы сильнее',
    perks: ['Сеть — капкан ловит всех рядом', 'Добивание — слабый моб умирает сразу'],
    details: (p) => [
      'Ставит капканы (до ' + p.traps + ', раз в ' + num(p.trapEvery) + ' с): попавший моб стоит ' + num(p.trapHold)
        + ' с и получает урон ×' + num(p.trapMul) + '. Из арбалета слабо бьёт всех, а элитных и боссов — в первую '
        + 'очередь и с уроном ×' + num(p.bigMul),
      'Сеть: капкан ловит всех в ' + cells(p.net) + ' вокруг',
      'Добивание: моб (не босс), у которого меньше ' + pct(p.execute) + ' здоровья, умирает сразу',
    ],
    params: (level, tier) => ({
      interval: 1,
      damage: 0.6,
      target: 'bigFirst',
      bigMul: 6 + 0.03 * (level - 1),
      trapEvery: 4 - 0.1 * tier,
      traps: 3 + Math.floor(level / 34),
      trapHold: 1.5,
      trapMul: 2.5,
      net: has(level, 0) ? 1 + 0.02 * tier : 0,
      execute: has(level, 1) ? 0.12 + 0.01 * tier : 0,
    }),
  },
  {
    id: 'frost',
    name: 'Ледяной маг',
    color: '#67e8f9',
    element: 'ice',
    role: 'control',
    gear: ['damage', 'rate', 'range', 'power', 'xp', 'coins'],
    labels: { rate: 'частоты волны', power: 'замедления' },
    power: ['chill', 'brittle'],
    hits: true,
    summary: 'Замедляет всех вокруг и бьёт морозной волной',
    perks: ['Заморозка — волна может заморозить', 'Хрупкость — замедленные получают больше урона'],
    details: (p) => [
      'Замедляет всех в радиусе ' + cells(p.chillRange) + ' на ' + pct(p.chill) + ', вышедшие ещё '
        + num(p.linger) + ' с идут медленнее на ' + pct(p.chill * p.lingerShare) + '; раз в ' + num(p.interval)
        + ' с бьёт морозной волной всех вокруг',
      'Заморозка: ' + pct(p.freeze) + ' шанс, что волна заморозит моба на ' + num(p.freezeTime) + ' с',
      'Хрупкость: замедленные им получают +' + pct(p.brittle) + ' урона от всех',
    ],
    params: (level, tier) => ({
      range: 2.5 + 0.01 * (level - 1),
      interval: 2,
      damage: 0.5,
      chillRange: 2.5 + 0.01 * (level - 1),
      chill: 0.4 + 0.0015 * (level - 1),
      linger: 4,
      lingerShare: 0.75,
      freeze: has(level, 0) ? 0.1 + 0.01 * tier : 0,
      freezeTime: 1.5,
      brittle: has(level, 1) ? 0.25 + 0.01 * tier : 0,
    }),
  },
  {
    id: 'shaman',
    name: 'Шаман ветра',
    color: '#14b8a6',
    role: 'control',
    gear: ['damage', 'rate', 'range', 'power', 'xp', 'coins'],
    labels: { rate: 'частоты вихрей', power: 'силы вихря' },
    power: ['whirlTime', 'headwind'],
    hits: true,
    summary: 'Пускает по дороге вихри, они уносят мобов назад',
    perks: ['Смерч — шанс отбросить всех вокруг', 'Буря — унесённые оглушены'],
    details: (p) => [
      'Пускает вихрь: он катится по дороге назад ' + num(p.whirlTime) + ' с и уносит с собой всех, кого '
        + 'заденет; боссов не уносит, а тормозит на ' + pct(p.headwind),
      'Смерч: ' + pct(p.tornado) + ' шанс отбросить всех вокруг на ' + cells(p.tornadoPush),
      'Буря: унесённые оглушены на ' + num(p.gust) + ' с',
    ],
    params: (level, tier) => ({
      interval: 2,
      damage: 0.9,
      whirlSpeed: 2,
      whirlTime: 0.4 + 0.003 * (level - 1),
      headwind: 0.45 + 0.003 * (level - 1),
      headwindTime: 1.5,
      tornado: has(level, 0) ? 0.1 + 0.01 * tier : 0,
      tornadoPush: 1.5,
      gust: has(level, 1) ? 0.6 + 0.04 * tier : 0,
    }),
  },
  {
    id: 'banner',
    name: 'Знаменосец',
    color: '#ec4899',
    role: 'support',
    gear: ['range', 'power', 'xp', 'coins'],
    labels: { range: 'к радиусу знамени', power: 'силы знамени' },
    power: ['haste', 'reach', 'rally', 'formation'],
    hits: false,
    summary: 'Не стреляет: под его знаменем все стреляют быстрее и дальше',
    perks: ['Боевой клич — раз в 10 секунд соседи бьют сильнее', 'Строй — соседям постоянная прибавка урона'],
    details: (p) => [
      'Не стреляет. Он и все в радиусе ' + cells(p.aura) + ' стреляют на ' + pct(p.haste) + ' быстрее и на '
        + pct(p.reach) + ' дальше',
      'Боевой клич: раз в ' + p.rallyEvery + ' с соседи ' + p.rallyTime + ' с бьют на ' + pct(p.rally) + ' сильнее',
      'Строй: соседям постоянно +' + pct(p.formation) + ' урона',
    ],
    params: (level, tier) => ({
      interval: 1,
      damage: 0.35,
      passive: true,
      aura: 3.5 + 0.01 * (level - 1),
      haste: 0.8 + 0.003 * (level - 1),
      reach: 0.15 + 0.001 * (level - 1),
      rallyEvery: has(level, 0) ? 10 : 0,
      rally: 0.5 + 0.02 * tier,
      rallyTime: 3,
      formation: has(level, 1) ? 0.15 + 0.01 * tier : 0,
    }),
  },
  {
    id: 'healer',
    name: 'Лекарь',
    color: '#22c55e',
    role: 'support',
    gear: ['damage', 'rate', 'range', 'power', 'xp', 'coins'],
    labels: { power: 'благодати' },
    power: ['grace', 'blessing', 'shield', 'wallHeal'],
    hits: true,
    summary: 'Возвращает базе жизни, святым светом бьёт только нежить',
    perks: ['Щит — шанс, что дошедший моб не отнимет жизнь', 'Благословение — соседям прибавка урона сильнее'],
    details: (p) => [
      'После каждой волны возвращает базе ' + p.heal + ' жизнь (все лекари вместе — до ' + HEAL_CAP + '), соседям '
        + 'в радиусе ' + cells(p.aura) + ' +' + pct(p.grace) + ' урона, каменные стены рядом чинит на '
        + pct(p.wallHeal) + ' в секунду. Святым светом бьёт только нежить, зато ×' + num(p.holyMul)
        + '; убитая им нежить больше не встаёт',
      'Щит: ' + pct(p.shield) + ' шанс, что дошедший до базы моб не отнимет жизнь',
      'Благословение: соседям +' + pct(p.blessing) + ' урона',
    ],
    params: (level, tier) => ({
      interval: 1,
      damage: 0.35,
      target: 'undead',
      holyMul: 3,
      heal: 1,
      aura: 2 + 0.01 * (level - 1),
      shield: has(level, 0) ? 0.08 + 0.008 * tier : 0,
      grace: 0.08,
      wallHeal: 0.04,
      blessing: has(level, 1) ? 0.25 + 0.01 * tier : 0,
    }),
  },
  {
    id: 'sage',
    name: 'Мудрец',
    color: '#a855f7',
    role: 'support',
    gear: ['range', 'power', 'xp', 'coins'],
    labels: { range: 'к радиусу ауры', power: 'мудрости' },
    power: ['wisdom', 'muse'],
    hits: false,
    summary: 'Не бьёт: рядом с ним все получают больше опыта',
    perks: ['Вдохновение — одному соседу больше урона, скорости и дальности',
      'Ученик — свой добавочный опыт отдаёт и вдохновлённому'],
    details: (p) => [
      'Не бьёт. Он и все в радиусе ' + cells(p.aura) + ' получают +' + pct(p.wisdom) + ' опыта; за каждого моба, '
        + 'убитого рядом, ему засчитывается помощь',
      'Вдохновение: раз в 5 с выбирает случайного соседа — тот бьёт на ' + pct(p.muse) + ' сильнее, быстрее и '
        + 'дальше',
      'Ученик: весь добавочный опыт мудреца получает и вдохновлённый',
    ],
    params: (level, tier) => ({
      interval: 1,
      damage: 0.4,
      passive: true,
      aura: 3.5 + 0.01 * (level - 1),
      wisdom: 0.5 + 0.002 * (level - 1),
      muse: has(level, 0) ? 0.2 + 0.015 * tier : 0,
      share: has(level, 1),
    }),
  },
  {
    id: 'earth',
    name: 'Маг земли',
    color: '#c08a4a',
    role: 'control',
    gear: ['damage', 'rate', 'range', 'power', 'xp', 'coins'],
    labels: { power: 'прочности стен' },
    power: ['wallHp', 'thorns', 'collapse'],
    hits: true,
    summary: 'Ставит на дорогу каменную стену, бьёт шипами из-под земли',
    perks: ['Шипы — мобы у стены ранятся', 'Обвал — разрушенная стена взрывается и оглушает'],
    details: (p) => [
      'Ставит рядом на дорогу стену прочностью ' + num(p.wallHp) + ' зомби: мобы стоят и грызут её, босс — '
        + 'вшестеро сильнее; разбили — новая через ' + num(p.wallEvery) + ' с. Летучих не держит. Бьёт шипами '
        + 'из-под земли всех в ' + cells(p.spikes) + ' от цели',
      'Шипы: мобы у стены получают ×' + num(p.thorns) + ' его урона в секунду',
      'Обвал: разрушенная стена взрывается (урон ×' + num(p.collapse) + ') и оглушает на ' + num(p.collapseStun) + ' с',
    ],
    params: (level, tier) => ({
      range: 2.4,
      interval: 1.1,
      damage: 0.35,
      spikes: 0.7,
      wallHp: 3 + 0.03 * (level - 1),
      wallEvery: 7 - 0.2 * tier,
      thorns: has(level, 0) ? 1.5 + 0.15 * tier : 0,
      collapse: has(level, 1) ? 8 + 0.5 * tier : 0,
      collapseRange: 1.6,
      collapseStun: 1.5,
    }),
  },
  {
    id: 'parasite',
    name: 'Паразит',
    color: '#d946ef',
    role: 'damage',
    gear: ['damage', 'rate', 'crit', 'xp', 'coins'],
    labels: { rate: 'скорости укусов' },
    hits: true,
    summary: 'Сидит на самом крепком мобе и грызёт его весь раунд',
    rider: true,
    perks: ['Крит — шанс тройного укуса', 'Смертельный укус — шанс убить моба сразу'],
    details: (p) => [
      'Не стоит на клетке: цепляется к самому крепкому мобу и грызёт его, после убийства прыгает на следующего',
      'Крит: ' + pct(p.crit) + ' шанс на урон ×' + num(p.critMul),
      'Смертельный укус: ' + num(p.oneshot * 100) + '% шанс убить моба с одного укуса (босса — вдвое реже)',
    ],
    params: (level, tier) => ({
      interval: 0.5,
      damage: 0.2,
      leap: 0.6,
      crit: has(level, 0) ? 0.08 + 0.01 * tier : 0,
      critMul: 3,
      oneshot: has(level, 1) ? 0.01 + 0.0005 * (tier - 5) : 0,
    }),
  },
  {
    id: 'miner',
    name: 'Минёр',
    color: '#6366f1',
    role: 'damage',
    gear: ['damage', 'rate', 'range', 'power', 'xp', 'coins'],
    labels: { damage: 'урона мин', rate: 'частоты мин', power: 'запаса мин' },
    power: ['mineCap'],
    hits: false,
    summary: 'Не стреляет: копит мины на дороге и ловит тех, кто прорвался',
    perks: ['Бросок — мина в любого моба на поле, взрывается сразу',
      'Ядерный взрыв — изредка вместо мины летит ядерная бомба'],
    details: (p) => [
      'Не стреляет. Раз в ' + num(p.mineEvery) + ' с ставит мину в радиусе ' + cells(p.range) + ' и копит до '
        + p.mineCap + ': мощные, широкие и оглушающие. Летучих они не задевают',
      'Бросок: раз в ' + num(p.toss) + ' с кидает мину в любого моба на поле, она сразу взрывается вполсилы',
      'Ядерный взрыв: ' + num(p.nuke * 100) + '% шанс бросить вместо мины ядерную бомбу. Она летит медленно и '
        + 'убивает всех обычных мобов в ' + cells(3) + ' вокруг, элитных и боссов сильно ранит; всех защитников и '
        + 'боссов рядом оглушает на 5 с',
    ],
    params: (level, tier) => ({
      range: 1.68 + 0.007 * (level - 1),
      interval: 1,
      damage: 0.28,
      passive: true,
      mineEvery: 3 - 0.08 * tier,
      mineCap: 20 + Math.floor(level / 5),
      toss: has(level, 0) ? 7 - 0.2 * tier : 0,
      nuke: has(level, 1) ? 0.01 : 0,
    }),
  },
];

export const CLASS_BY_ID = new Map(CLASSES.map((c) => [c.id, c]));

export function describe(id, level) {
  const cls = CLASS_BY_ID.get(id), now = cls.details(cls.params(level, tierOf(level)));
  return {
    main: now[0],
    perks: PERKS.map((at, i) => {
      if (level >= at) return { at, open: true, text: now[i + 1] };
      return { at, open: false, text: cls.details(cls.params(at, tierOf(at)))[i + 1] };
    }),
  };
}
