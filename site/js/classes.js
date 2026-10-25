import { STAT, TOWER } from './balance.js';

export const PERKS = [10, 30, 50];
export const RUNE_CAPS = { rot: 0.6, thorn: 40, shatter: 40 };
export const PRIMARY = { str: 'сила', agi: 'ловкость', int: 'интеллект' };
export const STAT_IDS = ['str', 'agi', 'int', 'mas'];

export const MARKS = /\{(hit|dmg|mas|int)\}/;
const mark = (value) => (value && value.mark ? '{' + value.mark + '}' : '');
const plain = (value) => String(Math.round(value * 10) / 10).replace('.', ',');
const pct = (value) => Math.round(value * 100) + '%' + mark(value);
export const num = (value) => plain(value) + mark(value);
const sec = (value) => plain(value) + ' с' + mark(value);

function cellWord(value, one, few, many) {
  const n = Math.round(value * 10) / 10, units = n % 10, tens = n % 100;
  if (n % 1) return few;
  return units === 1 && tens !== 11 ? one : units >= 2 && units <= 4 && (tens < 12 || tens > 14) ? few : many;
}

export function cells(value) {
  return plain(value) + ' ' + cellWord(value, 'клетка', 'клетки', 'клеток') + mark(value);
}

const around = (value) => 'на ' + plain(value) + ' ' + cellWord(value, 'клетку', 'клетки', 'клеток') + mark(value)
  + ' вокруг';

export const CLASSES = [
  {
    id: 'sniper',
    name: 'Снайпер',
    color: '#e5e7eb',
    primary: 'str',
    earn: { xp: 1.15, coins: 1.14 },
    weapon: 'карабин',
    stats: { str: 'high', agi: 'low', int: 'low' },
    base: { damage: 2.6, interval: 2.6, range: 5, target: 'strongest', skyFirst: true },
    summary: 'Бьёт дальше всех, сперва по летучим; с уровнем — сквозные и заряженные выстрелы',
    main: (b) => 'Бьёт на ' + cells(b.range) + ' — дальше всех: сперва по летучим, потом по самому крепкому. Стреляет '
      + 'редко, но сильно: урон ×' + num(b.damage),
    skills: [
      { name: 'Сквозная пуля', v: { ramp: 0.08 }, scale: { ramp: 'power' },
        text: (v) => 'пуля прошивает всех на линии с одинаковым уроном, а за каждого задетого урон выстрела растёт на '
          + pct(v.ramp) },
      { name: 'Заряженная пуля', v: { chance: 0.1, charge: 1, bonus: 6 }, scale: { chance: 'luck', bonus: 'dmg' },
        text: (v) => 'с шансом ' + pct(v.chance) + ' секунду заряжает пулю и стреляет толстой и яркой: урон ещё ×'
          + num(v.bonus) + ', всегда крит' },
      { name: 'Наповал', v: { every: 20, charge: 3, bonus: 24, mark: 0.25, markTime: 5 },
        scale: { every: 'haste', bonus: 'dmg', markTime: 'time' },
        text: (v) => 'раз в ' + sec(v.every) + ' три секунды целится в одного моба — сперва в босса или элитного — и '
          + 'бьёт: урон ещё ×' + num(v.bonus) + ', всегда крит, не прошивает. Метка висит ' + sec(v.markTime)
          + ': цель получает +' + pct(v.mark) + ' урона от всех' },
    ],
    runes: [
      { id: 'twin', name: 'Двойной выстрел', text: 'обычная атака стреляет сразу в двух мобов' },
      { id: 'burst', name: 'Разрывная пуля', text: 'с шансом 5% пуля разрывается: всем на клетку вокруг 25% её '
        + 'урона (мастерство расширяет)' },
    ],
  },
  {
    id: 'gunner',
    name: 'Пулемётчик',
    color: '#eab308',
    primary: 'agi',
    earn: { xp: 1.18, coins: 1.12 },
    weapon: 'пулемёт',
    stats: { str: 'low', agi: 'high', int: 'low' },
    base: { damage: 0.42, interval: 0.3, range: 3, ramp: 0.08, rampMax: 1, burst: 7, reload: 3 },
    summary: 'Строчит без остановки, разгоняется на одной цели; потом перезарядка',
    main: (b) => 'Очень часто стреляет на ' + cells(b.range) + ' — по всем подряд, боссов не выделяет. Держит одну '
      + 'цель и разгоняется на ней до +' + pct(b.rampMax) + ' скорости; после ' + sec(b.burst) + ' стрельбы — '
      + sec(b.reload) + ' перезарядки',
    skills: [
      { name: 'Перегрев', v: { after: 3, fire: 1.8 }, scale: { fire: 'dmg' },
        text: (v) => 'после ' + sec(v.after) + ' стрельбы ствол раскаляется: каждая пуля ещё жжёт огнём, урон ×'
          + num(v.fire) },
      { name: 'Рикошет', v: { chance: 0.2, bonus: 0.1, radius: 2 }, scale: { chance: 'luck', bonus: 'power' },
        text: (v) => 'с шансом ' + pct(v.chance) + ' пуля отскакивает в моба рядом с целью: ' + pct(0.5 + v.bonus)
          + ' урона, огонь тоже' },
      { name: 'Берсерк', v: { after: 5, time: 2, damage: 0.7, crit: 0.5 }, scale: { damage: 'power', crit: 'power' },
        text: (v) => 'после ' + sec(v.after) + ' стрельбы на ' + sec(v.time) + ' — предельная скорость, +'
          + pct(v.damage) + ' урона и +' + pct(v.crit) + ' к силе крита' },
    ],
    runes: [
      { id: 'drum', name: 'Бесконечный барабан', text: 'перезарядка не нужна: строчит без остановки' },
      { id: 'plasma', name: 'Плазменные пули', text: 'огненные пули пробивают броню и любые щиты' },
    ],
  },
  {
    id: 'bomber',
    name: 'Подрывник',
    color: '#f97316',
    primary: 'str',
    earn: { xp: 1.05, coins: 1.05 },
    weapon: 'гранатомёт',
    stats: { str: 'mid', agi: 'mid', int: 'low' },
    base: { damage: 1.2, interval: 1.5, range: 3, splash: 1 },
    summary: 'Снаряд взрывается и бьёт всех вокруг одинаково',
    main: (b) => 'Стреляет на ' + cells(b.range) + ': снаряд взрывается и бьёт всех ' + around(b.splash)
      + ' одинаково, урон ×' + num(b.damage),
    skills: [
      { name: 'Горящая земля', v: { time: 3, dps: 2.1, radius: 0.8 }, scale: { time: 'time', dps: 'dmg' },
        text: (v) => 'после взрыва земля горит ' + sec(v.time) + ' и жжёт: урон ×' + num(v.dps)
          + ' в секунду; летучих не жжёт' },
      { name: 'Детонация', v: { chance: 0.25 }, scale: { chance: 'luck' },
        text: (v) => 'с шансом ' + pct(v.chance) + ' через 0,3 с взрыв повторяется — и повтор может повториться, '
          + 'каждый раз вдвое реже' },
      { name: 'РПГ', v: { every: 25, charge: 2, bonus: 36, radius: 2, stun: 1.5 },
        scale: { every: 'haste', bonus: 'dmg', stun: 'time' },
        text: (v) => 'раз в ' + sec(v.every) + ' две секунды заряжает ракету и бьёт в ближайшего босса или элитного: '
          + 'всем ' + around(v.radius) + ' урон ×' + num(v.bonus) + ' и оглушение на ' + sec(v.stun) },
    ],
    runes: [
      { id: 'napalm', name: 'Напалм', text: 'огонь растекается дальше: горящая земля вдвое шире' },
      { id: 'cluster', name: 'Кассетный выстрел', text: 'стреляет сразу двумя снарядами в разные цели' },
    ],
  },
  {
    id: 'thunder',
    name: 'Громовержец',
    color: '#3b82f6',
    element: 'storm',
    primary: 'int',
    earn: { xp: 0.89, coins: 0.77 },
    weapon: 'посох',
    stats: { str: 'low', agi: 'mid', int: 'mid' },
    base: { damage: 0.9, interval: 1.3, range: 3.5, jumps: 9, jumpRange: 2, falloff: 0.1 },
    summary: 'Молния перескакивает с моба на моба',
    main: (b) => 'Молния бьёт цель на ' + cells(b.range) + ' и перескакивает назад по дороге ещё до ' + b.jumps
      + ' мобов, каждому следующему на 10% меньше; урон ×' + num(b.damage),
    skills: [
      { name: 'Заряд', v: { bonus: 0.15, time: 5 }, scale: { bonus: 'power' },
        text: (v) => 'задетые молнией заряжены: получают +' + pct(v.bonus) + ' урона от всех, пока молния бьёт их '
          + 'хотя бы раз в ' + sec(v.time) },
      { name: 'Вспышка', v: { chance: 0.12, radius: 1 }, scale: { chance: 'luck' },
        text: (v) => 'с шансом ' + pct(v.chance) + ' удар молнии разряжается вспышкой: всем ' + around(v.radius)
          + ' тот же урон' },
      { name: 'Удар грома', v: { every: 15, bonus: 12, radius: 1, stun: 1.5 },
        scale: { every: 'haste', bonus: 'dmg', stun: 'time' },
        text: (v) => 'раз в ' + sec(v.every) + ' бьёт молнией в первого моба на дороге, где бы он ни был: '
          + 'критический урон ×' + num(v.bonus) + ' ему и всем ' + around(v.radius) + ', оглушение на ' + sec(v.stun) },
    ],
    runes: [
      { id: 'chain', name: 'Цепная молния', text: 'молния не слабеет, перескакивает ещё на 5 мобов и может идти '
        + 'в обе стороны' },
      { id: 'discharge', name: 'Разрядка', text: 'заряженный, по которому молния не била 5 с, разряжается: огромный '
        + 'урон и оглушение на 5 с' },
    ],
  },
  {
    id: 'alchemist',
    name: 'Алхимик',
    color: '#84cc16',
    element: 'poison',
    primary: 'int',
    earn: { xp: 1.3, coins: 1.35 },
    weapon: 'флакон',
    stats: { str: 'low', agi: 'mid', int: 'mid' },
    base: { damage: 2.1, interval: 1.6, range: 3.5, target: 'potion', flight: 0.5 },
    summary: 'Кидает ядовитые зелья, оставляет лужи яда',
    main: (b) => 'Кидает ядовитые зелья на ' + cells(b.range) + ': урон ядом ×' + num(b.damage)
      + '. Летучих не бьёт, нежить яд не берёт',
    skills: [
      { name: 'Ядовитая лужа', v: { time: 4, dps: 1.8, radius: 0.9 }, scale: { time: 'time', dps: 'dmg' },
        text: (v) => 'зелье оставляет лужу на ' + sec(v.time) + ': кто в ней, травится, урон ядом ×' + num(v.dps)
          + ' в секунду; летучих не травит' },
      { name: 'Отрава', v: { chance: 0.25, time: 5, dps: 0.9 },
        scale: { chance: 'luck', time: 'time', dps: 'dmg' },
        text: (v) => 'с шансом ' + pct(v.chance) + ' яд въедается: ещё ' + sec(v.time) + ', урон ×' + num(v.dps)
          + ' в секунду' },
      { name: 'Ядовитый туман', v: { every: 20, radius: 1.5, time: 5, dps: 2.4 },
        scale: { every: 'haste', radius: 'power', dps: 'dmg' },
        text: (v) => 'раз в ' + sec(v.every) + ' кидает гранату: туман ' + around(v.radius) + ' на ' + sec(v.time)
          + ' глушит все навыки мобов и травит, урон ×' + num(v.dps) + ' в секунду' },
    ],
    runes: [
      { id: 'infection', name: 'Инфекция', text: 'отравленные гниют ещё 5 с после яда: теряют 1% здоровья в секунду '
        + '(боссы — 0,3%), но не больше урона ×' + num(RUNE_CAPS.rot) + ' в секунду' },
      { id: 'plague', name: 'Чума', text: 'яд чернеет: берёт и нежить, пробивает броню и бьёт на 25% сильнее' },
    ],
  },
  {
    id: 'pyro',
    name: 'Огнемётчик',
    color: '#ef4444',
    element: 'fire',
    primary: 'int',
    earn: { xp: 1.2, coins: 1.18 },
    weapon: 'огнемёт',
    stats: { str: 'low', agi: 'mid', int: 'mid' },
    base: { damage: 0.15, interval: 0.2, range: 2.5, target: 'small', cone: 0.35, undead: 1.5 },
    summary: 'Жжёт струёй огня, мобы горят',
    main: (b) => 'Без остановки жжёт узкой струёй огня на ' + cells(b.range) + ', сперва мелочь; нежить горит в '
      + num(b.undead) + ' раза сильнее',
    skills: [
      { name: 'Горение', v: { time: 3, dps: 12 }, scale: { time: 'time', dps: 'dmg' },
        text: (v) => 'задетый огнём горит ещё ' + sec(v.time) + ', теряя в секунду ×' + num(v.dps) + ' урона струи' },
      { name: 'Вспыхнуть', v: { chance: 0.1, bonus: 18, radius: 1 },
        scale: { chance: 'luck', bonus: 'dmg', radius: 'power' },
        text: (v) => 'горящий с шансом ' + pct(v.chance) + ' в секунду вспыхивает: урон ×' + num(v.bonus)
          + ' ему и огненному кольцу ' + around(v.radius) },
      { name: 'Нефть', v: { every: 20, radius: 1.5, time: 3, dps: 27, keep: 20 },
        scale: { every: 'haste', time: 'time', dps: 'dmg' },
        text: (v) => 'раз в ' + sec(v.every) + ' разливает нефть на дорогу рядом с собой; от огня она горит '
          + sec(v.time) + ' и жжёт всех в ней на ×' + num(v.dps) + ' урона струи в секунду' },
    ],
    runes: [
      { id: 'nozzle', name: 'Широкое сопло', text: 'струя огня вдвое шире' },
      { id: 'blue', name: 'Синее пламя', text: 'огонь синеет: урон и горение вдвое сильнее' },
    ],
  },
  {
    id: 'hunter',
    name: 'Охотник',
    color: '#b45309',
    primary: 'agi',
    earn: { xp: 1.1, coins: 1.04 },
    weapon: 'арбалет',
    stats: { str: 'mid', agi: 'mid', int: 'low' },
    base: { damage: 1, interval: 1, range: 3.5, target: 'bigFirst', big: 5 },
    summary: 'Бьёт крупную дичь первой, ставит капканы, метит добычу',
    main: (b) => 'Из арбалета на ' + cells(b.range) + ' слабо бьёт всех, а элитных и боссов — первыми и с уроном ×'
      + num(b.big),
    skills: [
      { name: 'Капканы', v: { count: 3, every: 4, hold: 1.5, bonus: 0.5 }, scale: { hold: 'time', bonus: 'power' },
        text: (v) => 'ставит до ' + v.count + ' капканов в своём радиусе: попавший стоит ' + sec(v.hold)
          + ' и получает +' + pct(v.bonus) + ' урона' },
      { name: 'Сеть', v: { chance: 0.12, time: 2, bonus: 0.4 }, scale: { chance: 'luck', bonus: 'power' },
        text: (v) => 'с шансом ' + pct(v.chance) + ' набрасывает сеть: моб — даже босс — стоит ' + sec(v.time)
          + ' и получает +' + pct(v.bonus) + ' урона' },
      { name: 'Добыча', v: { every: 30, time: 10, bounty: 40, window: 10 },
        scale: { every: 'haste', time: 'time', bounty: 'power' },
        text: (v) => 'раз в ' + sec(v.every) + ' метит ближайшего босса или элитного на ' + sec(v.time)
          + ': все бьют его первым. Убьют за ' + sec(v.window) + ' — охотнику ' + Math.round(v.bounty)
          + ' монет, остальным вдвое меньше' },
    ],
    runes: [
      { id: 'ambush', name: 'Засада', text: 'никого не бьёт 10 с — прыгает к первому мобу на дороге' },
      { id: 'master', name: 'Мастер ловушек', text: 'капканов вдвое больше, капканы и сеть действуют вдвое сильнее' },
    ],
  },
  {
    id: 'parasite',
    name: 'Паразит',
    color: '#d946ef',
    primary: 'agi',
    earn: { xp: 1.1, coins: 1 },
    weapon: 'шип',
    rider: true,
    stats: { str: 'low', agi: 'high', int: 'low' },
    base: { damage: 0.25, interval: 0.8, leap: 0.6, cocoon: 10, gold: [1, 200] },
    summary: 'Десять волн зреет в коконе, потом грызёт самого крепкого моба',
    main: (b) => 'Первые ' + b.cocoon + ' волн — личинка в коконе на клетке: не бьёт, зато каждую волну получает от '
      + b.gold[0] + ' до ' + b.gold[1] + ' монет. Потом цепляется к самому крепкому мобу и грызёт его, убил — прыгает '
      + 'на следующего',
    skills: [
      { name: 'Шок', v: { stun: 0.5, share: 0.1, elite: 0.05, boss: 0.03, cap: 25 },
        scale: { stun: 'time', cap: 'dmg' },
        text: (v) => 'крит оглушает на ' + sec(v.stun) + ' и отнимает ещё ' + pct(v.share) + ' здоровья (у элитных '
          + pct(v.elite) + ', у боссов ' + pct(v.boss) + '), но не больше урона ×' + num(v.cap) },
      { name: 'Пир', v: { chance: 0.3, bonus: 1 }, scale: { chance: 'luck', bonus: 'power' },
        text: (v) => 'добив моба, с шансом ' + pct(v.chance) + ' получает на ' + pct(v.bonus)
          + ' больше опыта и монет' },
      { name: 'Налёт', v: { every: 60, rich: 1000, nap: 10, sleep: 60 },
        text: (v) => 'раз в минуту прыгает на голову союзнику, у которого больше ' + v.rich + ' монет, и забирает все '
          + 'его монеты себе; потом ' + sec(v.nap) + ' спит у него на голове, а союзник спит ' + sec(v.sleep)
          + '. Когда '
          + 'у самого паразита больше ' + v.rich + ' монет, он раздаёт все свои монеты случайно всем, себе тоже' },
    ],
    runes: [
      { id: 'frenzy', name: 'Бешенство', text: 'кусает втрое чаще' },
      { id: 'thorn', name: 'Смертельный шип', text: 'с шансом 3% добивает моба, у которого меньше 30% здоровья; '
        + 'слишком крепкому наносит урон ×' + num(RUNE_CAPS.thorn) },
    ],
  },
  {
    id: 'miner',
    name: 'Минёр',
    color: '#6366f1',
    element: 'blast',
    primary: 'int',
    earn: { xp: 0.85, coins: 0.8 },
    weapon: 'детонатор',
    passive: true,
    stats: { str: 'low', agi: 'low', int: 'high' },
    base: { damage: 0.95, interval: 3, range: 2, cap: 10, mine: 2.5, touch: 0.5 },
    summary: 'Не стреляет: ставит мины, кидает гранаты, а потом и ядерку',
    main: (b) => 'Не стреляет: раз в ' + sec(b.interval) + ' (с ловкостью — чаще) ставит мину на дорогу в '
      + cells(b.range) + ' от себя, до ' + b.cap + ' сразу. Мина рвётся под мобом, урон ×' + num(b.mine)
      + '; летучих мины не задевают',
    skills: [
      { name: 'Граната', v: { every: 6, bonus: 4.6, radius: 0.6 }, scale: { every: 'haste', bonus: 'dmg' },
        text: (v) => 'раз в ' + sec(v.every) + ' кидает гранату в случайного моба на поле: урон ×' + num(v.bonus) },
      { name: 'Усиленная мина', v: { chance: 0.12, cap: 5, range: 10, bonus: 3.8, radius: 0.9 },
        scale: { chance: 'luck', bonus: 'dmg' },
        text: (v) => 'с шансом ' + pct(v.chance) + ' вместо обычной ставит усиленную в ' + v.range + ' клетках от '
          + 'себя (до ' + v.cap + ' сразу, а когда обычных полный запас — всегда): урон ×' + num(v.bonus * 4) },
      { name: 'Ядерка', v: { every: 120, range: 5, radius: 2, cap: 200 }, scale: { cap: 'dmg' },
        text: (v) => 'раз в 2 минуты, если моб ближе ' + cells(v.range) + ', запускает в него ядерку: она убивает '
          + 'его и всех мобов ' + around(v.radius) + ', а слишком крепким наносит урон ×' + num(v.cap) },
    ],
    runes: [
      { id: 'fusion', name: 'Ядерный синтез', text: 'граната иногда оказывается маленькой ядеркой: огромный урон '
        + 'на 2 клетки вокруг и оглушение на 10 с всем рядом, и мобам, и защитникам' },
      { id: 'stock', name: 'Большой запас', text: 'все запасы мин вдвое больше' },
    ],
  },
  {
    id: 'frost',
    name: 'Ледяной маг',
    color: '#67e8f9',
    element: 'ice',
    primary: 'int',
    earn: { xp: 0.82, coins: 0.96 },
    weapon: 'жезл',
    stats: { str: 'low', agi: 'low', int: 'high' },
    base: { damage: 0.55, interval: 1, range: 2.7 },
    summary: 'Ледяная буря вокруг: бьёт льдом, замедляет, замораживает',
    main: (b) => 'Вокруг него ледяная буря на ' + cells(b.range) + ' (интеллект её расширяет): раз в секунду бьёт '
      + 'льдом всех в ней, урон ×' + num(b.damage),
    skills: [
      { name: 'Стужа', v: { slow: 0.35, time: 3 }, scale: { slow: 'power', time: 'time' },
        text: (v) => 'в буре мобы медленнее на ' + pct(Math.min(0.8, v.slow)) + ', а вышедшие ещё ' + sec(v.time)
          + ' идут подмороженными' },
      { name: 'Заморозка', v: { chance: 0.08, time: 1.5 }, scale: { chance: 'luck', time: 'time' },
        text: (v) => 'с шансом ' + pct(v.chance) + ' удар льдом замораживает на ' + sec(v.time) },
      { name: 'Снегопад', v: { every: 30, time: 3, chance: 0.15, slow: 0.3 },
        scale: { every: 'haste', time: 'time', chance: 'luck' },
        text: (v) => 'раз в ' + sec(v.every) + ' снег на всё поле: все мобы ' + sec(v.time) + ' подморожены, а с '
          + 'шансом ' + pct(v.chance) + ' — заморожены' },
    ],
    runes: [
      { id: 'permafrost', name: 'Вечная мерзлота', text: 'подморозка и заморозка вдвое дольше' },
      { id: 'brittle', name: 'Хрупкость', text: 'замороженный моб с шансом 0,5% гибнет от любого удара; слишком '
        + 'крепкий получает урон ×' + num(RUNE_CAPS.shatter) },
    ],
  },
  {
    id: 'shaman',
    name: 'Шаман ветра',
    color: '#14b8a6',
    primary: 'int',
    earn: { xp: 1.18, coins: 1.2 },
    weapon: 'тотем',
    stats: { str: 'low', agi: 'mid', int: 'mid' },
    base: { damage: 1.85, interval: 2, range: 3, whirlSpeed: 2, whirlTime: 0.6 },
    summary: 'Пускает вихри сквозь броню, отбрасывает, ускоряет союзников',
    main: (b) => 'Пускает по дороге вихри на ' + cells(b.range) + ': вихрь катится назад и бьёт всех на пути сквозь '
      + 'броню, урон ×' + num(b.damage),
    skills: [
      { name: 'Порыв', v: { chance: 0.2, radius: 1, push: 1 }, scale: { chance: 'luck' },
        text: (v) => 'с шансом ' + pct(v.chance) + ' вихрь стягивает обычных мобов ' + around(v.radius)
          + ' и отбрасывает их на клетку назад' },
      { name: 'Отброс', v: { chance: 0.15, push: 1 }, scale: { push: 'power' },
        text: (v) => 'с шансом ' + pct(v.chance) + ' удар отбрасывает задетых на ' + cells(v.push) },
      { name: 'Пронзающий ветер', v: { every: 25, radius: 2.5, haste: 0.4, time: 6 },
        scale: { every: 'haste', radius: 'power', haste: 'power', time: 'time' },
        text: (v) => 'раз в ' + sec(v.every) + ' ветер ' + around(v.radius) + ': союзники ' + sec(v.time)
          + ' бьют на ' + pct(v.haste) + ' быстрее, сам он — на ' + pct(v.haste * 2) },
    ],
    runes: [
      { id: 'tornado', name: 'Торнадо', text: 'вихри становятся торнадо: впитывают огонь, яд, лёд и молнию по '
        + 'пути — с земли, из бури и с задетых мобов — и бьют всеми стихиями' },
      { id: 'headwind', name: 'Встречный ветер', text: 'все мобы на поле на 20% медленнее' },
    ],
  },
  {
    id: 'earth',
    name: 'Маг земли',
    color: '#c08a4a',
    element: 'earth',
    primary: 'int',
    earn: { xp: 0.98, coins: 1.02 },
    weapon: 'каменная рука',
    her: true,
    stats: { str: 'low', agi: 'low', int: 'high' },
    base: { damage: 0.95, interval: 1.3, range: 3, target: 'land', spikes: 2, rebuild: 7 },
    summary: 'Шипы из-под земли, каменная стена, метеорит',
    main: (b) => 'На ' + cells(b.range) + ' бьёт шипами из-под земли — сразу две клетки дороги, урон ×'
      + num(b.damage),
    skills: [
      { name: 'Каменная стена', v: { wall: 2.4 }, scale: { wall: 'power' },
        text: (v) => 'ставит на ближайшую клетку дороги стену прочностью ' + num(v.wall) + ' зомби: мобы стоят и '
          + 'грызут её, боссы — сильнее' },
      { name: 'Шипастая стена', v: { chance: 0.5, bonus: 6 }, scale: { bonus: 'dmg' },
        text: (v) => 'грызущий стену с шансом ' + pct(v.chance) + ' в секунду получает урон ×' + num(v.bonus) },
      { name: 'Метеорит', v: { every: 35, radius: 2, bonus: 26, stun: 10 },
        scale: { every: 'haste', radius: 'power', bonus: 'dmg' },
        text: (v) => 'раз в ' + sec(v.every) + ' на дорогу падает метеорит: всем ' + around(v.radius) + ' урон ×'
          + num(v.bonus) + ' землёй и огнём и оглушение на ' + sec(v.stun) },
    ],
    runes: [
      { id: 'steel', name: 'Стальная стена', text: 'стена из стали, втрое прочнее' },
      { id: 'stone', name: 'Каменные шипы', text: 'шипы бьют сразу на пять клеток' },
    ],
  },
  {
    id: 'banner',
    name: 'Знаменосец',
    color: '#ec4899',
    primary: 'str',
    earn: { xp: 0.8, coins: 0.8 },
    weapon: 'штандарт',
    stats: { str: 'high', agi: 'mid', int: 'low' },
    base: { damage: 1, interval: 1.2, range: 1.5, banner: 3.2, haste: 0.35, reach: 0.2 },
    summary: 'Бьёт древком рядом; под его знаменем союзники бьют быстрее и дальше',
    main: (b) => 'Бьёт древком на ' + cells(b.range) + ', урон ×' + num(b.damage) + '. Над ним знамя на '
      + cells(b.banner) + ': все под знаменем, и он сам, бьют на ' + pct(b.haste) + ' быстрее и на ' + pct(b.reach)
      + ' дальше',
    skills: [
      { name: 'Боевой клич', v: { every: 10, time: 4, damage: 0.5 },
        scale: { every: 'haste', time: 'time', damage: 'buff' },
        text: (v) => 'раз в ' + sec(v.every) + ' все под знаменем ' + sec(v.time) + ' бьют на ' + pct(v.damage)
          + ' сильнее' },
      { name: 'Натиск', v: { chance: 0.1 }, scale: { chance: 'luck' },
        text: (v) => 'с шансом ' + pct(v.chance) + ' удар союзника под знаменем — критический' },
      { name: 'Знамя победы', v: { every: 35, time: 8, haste: 0.4 },
        scale: { every: 'haste', time: 'time', haste: 'buff' },
        text: (v) => 'раз в ' + sec(v.every) + ' поднимает знамя над полем: весь отряд ' + sec(v.time) + ' бьёт на '
          + pct(v.haste) + ' быстрее' },
    ],
    runes: [
      { id: 'crimson', name: 'Багровый стяг', text: 'во время боевого клича союзники ещё и бьют на 20% быстрее' },
      { id: 'planted', name: 'Знамя в землю', text: '«Знамя победы» держится на 3 секунды дольше и отбрасывает '
        + 'мобов вокруг знаменосца на клетку' },
    ],
  },
  {
    id: 'healer',
    name: 'Лекарь',
    color: '#22c55e',
    element: 'holy',
    primary: 'int',
    earn: { xp: 1, coins: 1.05 },
    weapon: 'святой посох',
    stats: { str: 'low', agi: 'mid', int: 'high' },
    base: { damage: 0.85, interval: 1.2, range: 3, undead: 2.5, heal: 1, healCap: 2, mend: 0.04 },
    summary: 'Святой свет по нежити, жизни сердцу после волны, щит и святая земля',
    main: (b) => 'Бьёт святым светом на ' + cells(b.range) + ', урон ×' + num(b.damage) + ', по нежити в '
      + num(b.undead) + ' раза сильнее, и убитая им нежить больше не встаёт. После волны возвращает сердцу '
      + b.heal + ' жизнь (все лекари вместе — не больше ' + b.healCap + '), каменные стены рядом чинит',
    skills: [
      { name: 'Щит', v: { chance: 0.15 }, scale: { chance: 'luck' },
        text: (v) => 'с шансом ' + pct(v.chance) + ' дошедший до сердца моб не отнимает жизнь; боссы отнимают '
          + 'всегда' },
      { name: 'Очищение', v: { every: 15, radius: 3.2, time: 4 }, scale: { every: 'haste', time: 'time' },
        text: (v) => 'раз в ' + sec(v.every) + ' союзники ' + around(v.radius) + ' стряхивают оглушение, сглаз, '
          + 'паутину и сон и ' + sec(v.time) + ' ничего не боятся' },
      { name: 'Святая земля', v: { every: 30, time: 8, radius: 2.2, dps: 3, vuln: 0.4 },
        scale: { every: 'haste', time: 'time', dps: 'dmg', vuln: 'buff' },
        text: (v) => 'раз в ' + sec(v.every) + ' освящает дорогу ' + around(v.radius) + ' там, где мобов больше '
          + 'всего: ' + sec(v.time) + ' нежить на ней горит — урон ×' + num(v.dps) + ' в секунду, — а все мобы '
          + 'получают на ' + pct(v.vuln) + ' больше урона' },
    ],
    runes: [
      { id: 'guardian', name: 'Ангел-хранитель', text: '«Щит» спасает и от боссов' },
      { id: 'second', name: 'Второй шанс', text: 'раз за игру, когда у сердца кончаются жизни, лекарь возвращает 5 '
        + '— один раз на весь отряд' },
    ],
  },
  {
    id: 'sage',
    name: 'Мудрец',
    color: '#a855f7',
    element: 'arcane',
    primary: 'int',
    earn: { xp: 0.75, coins: 1.1 },
    weapon: 'фолиант',
    stats: { str: 'low', agi: 'low', int: 'high' },
    base: { damage: 0.8, interval: 1.3, range: 3, sparks: 2, circle: 3.2, wisdom: 0.25 },
    summary: 'Искры сразу в двух мобов; рядом с ним больше опыта, вдохновляет союзников',
    main: (b) => 'Пускает из книги искры сразу в ' + b.sparks + ' мобов на ' + cells(b.range) + ', урон ×'
      + num(b.damage) + ' каждой. Все ' + around(b.circle) + ', и он сам, получают +' + pct(b.wisdom) + ' опыта',
    skills: [
      { name: 'Вдохновение', v: { every: 6, time: 7, bonus: 0.5 },
        scale: { every: 'haste', time: 'time', bonus: 'buff' },
        text: (v) => 'раз в ' + sec(v.every) + ' выбирает союзника рядом — тот ' + sec(v.time) + ' бьёт на '
          + pct(v.bonus) + ' сильнее и быстрее' },
      { name: 'Озарение', v: { chance: 0.2 }, scale: { chance: 'luck' },
        text: (v) => 'с шансом ' + pct(v.chance) + ' вдохновлённый сразу перезаряжает свою способность — ракету, '
          + 'метеорит, удар молнии и другие' },
      { name: 'Слабое место', v: { every: 22, time: 8, vuln: 0.7, xp: 2 },
        scale: { every: 'haste', time: 'time', vuln: 'buff' },
        text: (v) => 'раз в ' + sec(v.every) + ' метит самого сильного моба — сперва босса или элитного: '
          + sec(v.time) + ' весь урон по нему на ' + pct(v.vuln) + ' больше, а за его убийство каждый, кто его бил, '
          + 'получает вдвое больше опыта' },
    ],
    runes: [
      { id: 'pupil', name: 'Ученик', text: 'вдохновение достаётся сразу двоим' },
      { id: 'omniscience', name: 'Всеведение', text: '«Слабое место» метит трёх самых сильных' },
    ],
  },
];

export const CLASS_BY_ID = new Map(CLASSES.map((c) => [c.id, c]));

export const runeOf = (id) => CLASSES.flatMap((cls) => cls.runes).find((rune) => rune.id === id) || null;

export function gradeOf(cls, stat) {
  return stat === 'mas' ? STAT.mastery : STAT.grades[cls.stats[stat]];
}

export function statsOf(cls, gear = null, paragon = 0) {
  const lift = 1 + STAT.paragon * paragon, out = {};
  for (const id of STAT_IDS) out[id] = Math.max(0, (gradeOf(cls, id) + (gear && gear[id] || 0)) * lift);
  return out;
}

export function scaled(skill, { power = 1, luck = 1, haste = 1 } = {}) {
  const out = {};
  for (const [key, value] of Object.entries(skill.v)) {
    const how = skill.scale && skill.scale[key];
    out[key] = how === 'power' || how === 'buff' || how === 'time' ? value * power : how === 'luck'
      ? 1 - Math.pow(1 - value, luck) : how === 'haste' ? value / haste : value;
  }
  return out;
}

export function masteryOf(mas) {
  const gain = STAT.masteryMax * mas / (mas + STAT.masteryHalf);
  return { power: 1 + gain, haste: 1 + gain, luck: 1 + mas / STAT.luckHalf };
}

export const skillOf = (cls, stats) => (1 + STAT.skill * stats[cls.primary]) * masteryOf(stats.mas).power;

export function powerOf(cls, stats) {
  const b = cls.base, agi = gradeOf(cls, 'agi');
  return {
    damage: TOWER.damage * b.damage * (1 + STAT.damage * stats.str) * (cls.element ? 1 + STAT.element * stats.int : 1),
    interval: (b.interval || 1) / (1 + STAT.speed * Math.min(stats.agi, agi) + STAT.speedExtra * Math.max(0,
      stats.agi - agi)),
    crit: Math.min(STAT.critMax, STAT.critChance * stats.agi),
    critMul: STAT.critBase + STAT.critPower * stats.str,
    reach: STAT.reach * stats.int,
    skill: skillOf(cls, stats),
    haste: masteryOf(stats.mas).haste,
  };
}

const marked = (value, how) => Object.assign(Object(value), { mark: how });

function markedBase(cls) {
  const base = Object.assign({}, cls.base, { damage: marked(cls.base.damage, 'hit') });
  for (const key of ['range', 'banner', 'circle']) if (key in base) base[key] = marked(base[key], 'int');
  return base;
}

function markedSkill(skill, mastery) {
  const values = scaled(skill, mastery);
  for (const [key, how] of Object.entries(skill.scale || {})) {
    values[key] = marked(values[key], how === 'dmg' || how === 'buff' ? 'dmg' : 'mas');
  }
  return values;
}

export function describe(id, level, mas = STAT.mastery) {
  const cls = CLASS_BY_ID.get(id), mastery = masteryOf(mas);
  return {
    main: cls.main(markedBase(cls)),
    perks: PERKS.map((at, i) => ({ at, open: level >= at, name: cls.skills[i].name,
      text: cls.skills[i].text(markedSkill(cls.skills[i], mastery)) })),
  };
}

export const plainText = (text) => text.split(new RegExp(MARKS.source, 'g')).filter((part, i) => i % 2 === 0).join('');
