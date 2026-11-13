import { MIGHT, STAT, TOWER } from './balance.js';

export const PERKS = [10, 30, 50];
export const STONES = [1, 10, 30, 50, 70, 100];
export const STONE_CHANCE = { first: 0.2, next: 0.03 };
export const RUNE_CAPS = { rot: 0.6, thorn: 40, shatter: 40 };

const pct = (value) => Math.round(value * 100) + '%';
export const num = (value) => String(Math.round(value * 10) / 10).replace('.', ',');
const sec = (value) => num(value) + ' с';

function cellWord(value, one, few, many) {
  const n = Math.round(value * 10) / 10, units = n % 10, tens = n % 100;
  if (n % 1) return few;
  return units === 1 && tens !== 11 ? one : units >= 2 && units <= 4 && (tens < 12 || tens > 14) ? few : many;
}

export function cells(value) {
  return num(value) + ' ' + cellWord(value, 'клетка', 'клетки', 'клеток');
}

const by = (value) => 'на ' + num(value) + ' ' + cellWord(value, 'клетку', 'клетки', 'клеток');
const around = (value) => by(value) + ' вокруг';

export const CLASSES = [
  {
    id: 'sniper',
    name: 'Стрелок',
    color: '#e5e7eb',
    primary: 'str',
    earn: { xp: 1.15, coins: 1.14 },
    weapon: 'карабин',
    stats: { str: 'high', agi: 'low', int: 'low' },
    base: { damage: 2.6, interval: 2.6, range: 5, target: 'strongest' },
    summary: 'Редкий дальний выстрел в самого крепкого; первый камень даёт стиль: снайпер, штурмовик или марксман',
    main: (b) => 'Редко стреляет на ' + cells(b.range) + ' — дальше всех — в самого крепкого моба: урон ×'
      + num(b.damage),
    styles: [
      { id: 'scope', name: 'Снайпер', text: 'бьёт через всю карту, но только элитных (и серебряных) и боссов: '
        + 'долго целится, стреляет очень сильно и после выстрела перезаряжается' },
      { id: 'assault', name: 'Штурмовик', text: 'средняя дальность, стреляет часто и часто критом — сперва в '
        + 'ближайших элитных и боссов; перезарядка после 30 пуль' },
      { id: 'marksman', name: 'Марксман', text: 'стреляет далеко, редко и сильно, часто критом — сперва в ближайших '
        + 'элитных и боссов; перезарядка после 5 пуль' },
    ],
    upgrades: [
      { id: 'steady', style: 'scope', name: 'Донаводка', text: 'целится вдвое дольше, зато каждый выстрел — крит' },
      { id: 'quick', style: 'scope', name: 'Быстрые руки', text: 'целится вдвое быстрее' },
      { id: 'breaker', style: 'scope', name: 'Бронебой', text: 'пули не замечают брони и щитов' },
      { id: 'scopeRicochet', style: 'scope', name: 'Рикошет', text: 'пуля отскакивает в случайного моба позади '
        + 'цели — вдвое слабее, но со всеми навыками' },
      { id: 'burstFire', style: 'assault', name: 'Очередь', text: 'вместо одной пули три — в случайных мобов в '
        + 'клетке вокруг цели, бывает и все три в одного' },
      { id: 'ricochet', style: 'assault', name: 'Рикошет', text: 'каждая пуля отскакивает в случайного моба позади '
        + 'цели — вдвое слабее, но со всеми навыками' },
      { id: 'flashbang', style: 'assault', name: 'Шумовая граната', text: 'после каждых 30 пуль бросает гранату: '
        + 'все в клетке вокруг цели оглушены, элитные тоже, боссы — нет' },
      { id: 'support', style: 'assault', name: 'Отряд поддержки', text: 'когда другой стрелок попадает в моба, '
        + 'до которого он достаёт, стреляет в того же' },
      { id: 'pierce', style: 'marksman', name: 'Пробивная пуля', text: 'пуля прошивает всех на пути и летит до конца '
        + 'дальности' },
      { id: 'double', style: 'marksman', name: 'Двойной выстрел', text: 'две пули в разных мобов в одну сторону — '
        + 'между ними не больше 30 градусов' },
      { id: 'sixth', style: 'marksman', name: 'Шестое чувство', text: 'видит и бьёт невидимых и подземных — их '
        + 'первыми' },
      { id: 'antiair', style: 'marksman', name: 'Воздушная оборона', text: 'летучих бьёт первыми и втрое сильнее' },
    ],
    abilities: [
      { id: 'lastRound', name: 'Последний патрон', text: 'если после выстрела у моба меньше здоровья, чем этот выстрел '
        + 'снял, — моб гибнет, даже элитный и босс' },
      { id: 'spotter', name: 'Наводчик', text: 'цель получает метку: весь урон по ней — и его, и союзников — '
        + 'сильнее' },
      { id: 'goldRounds', name: 'Золотые пули', text: 'криты намного сильнее, а трассеры золотые' },
      { id: 'endless', name: 'Бесконечный магазин', text: 'стреляет без перезарядки' },
    ],
    skills: [],
    runes: [],
  },
  {
    id: 'mechanic',
    name: 'Механик',
    color: '#f43f5e',
    primary: 'agi',
    earn: { xp: 1.15, coins: 1.14 },
    weapon: 'пистолет',
    stats: { str: 'mid', agi: 'high', int: 'low' },
    base: { damage: 2.6, interval: 2.6, range: 5 },
    summary: 'Пистолет и гаечный ключ; первый камень даёт стиль: турельщик, подрывник или ракетчик',
    main: (b) => 'Редко стреляет из пистолета на ' + cells(b.range) + ' — в того, кто ближе к сердцу: урон ×'
      + num(b.damage),
    styles: [
      { id: 'turret', name: 'Турельщик', text: 'пистолет-пулемёт бьёт очередями по 3 пули в одну цель; после 15 пуль '
        + '— 3 секунды перезарядки' },
      { id: 'demo', name: 'Подрывник', text: 'стреляет из РПГ: снаряд взрывается и бьёт всех в клетке вокруг цели' },
      { id: 'mortar', name: 'Ракетчик', text: 'бьёт из миномёта через всю карту по тому, кто впереди всех: ракета '
        + 'летит навесом, догоняет цель и взрывается, задевая всех рядом; цель погибла — ракета падает на землю там же' },
    ],
    upgrades: [],
    abilities: [],
    skills: [],
    runes: [],
  },
  {
    id: 'gunner',
    name: 'Пулемётчик',
    color: '#eab308',
    primary: 'agi',
    earn: { xp: 1.18, coins: 1.12 },
    weapon: 'пулемёт',
    stats: { str: 'low', agi: 'high', int: 'low' },
    base: { damage: 0.46, interval: 0.3, range: 3, ramp: 0.08, rampMax: 1, burst: 7, reload: 2 },
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
      { name: 'Длинная лента', v: { max: 1.5 },
        text: (v) => 'разгон не сбрасывается при смене цели и доходит до +' + pct(v.max) + ' скорости' },
      { name: 'Подавление', v: { slow: 0.04, max: 0.4, time: 1.5 },
        text: (v) => 'каждая пуля замедляет цель ещё на ' + pct(v.slow) + ', всего до ' + pct(v.max) + '; '
          + 'замедление держится ' + sec(v.time) },
      { name: 'Шквал свинца', v: { every: 35, time: 4, share: 0.6 }, scale: { every: 'haste', time: 'time' },
        text: (v) => 'раз в ' + sec(v.every) + ' на ' + sec(v.time) + ' переходит на веер: каждая очередь бьёт '
          + 'всех в радиусе, по ' + pct(v.share) + ' урона' },
      { name: 'Трассеры', v: { mark: 0.15 }, scale: { mark: 'power' },
        text: (v) => 'его цель подсвечена: весь отряд бьёт её на ' + pct(v.mark) + ' сильнее' },
    ],
    pool: ['perk0', 'perk3', 'perk1', 'perk4', 'perk2', 'perk5', 'perk6'],
    runes: [
      { id: 'drum', name: 'Бесконечный барабан', text: 'перезарядка не нужна: строчит без остановки' },
      { id: 'plasma', name: 'Плазменные пули', text: 'огненные пули пробивают броню и любые щиты' },
    ],
  },
  {
    id: 'thunder',
    name: 'Маг молнии',
    color: '#3b82f6',
    element: 'storm',
    primary: 'int',
    earn: { xp: 0.89, coins: 0.77 },
    weapon: 'посох',
    stats: { str: 'low', agi: 'mid', int: 'mid' },
    base: { damage: 1.04, interval: 1.3, range: 3.5, jumps: 9, jumpRange: 2, falloff: 0.1 },
    summary: 'Молния перескакивает с моба на моба, мокрых бьёт вдвое',
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
      { name: 'Грозовая реакция', v: {},
        text: () => 'его удары накладывают на мобов стихию молнии — для реакций с другими стихиями' },
      { name: 'Грозовая туча', v: { every: 20, time: 8, radius: 1, bonus: 2 },
        scale: { every: 'haste', time: 'time', bonus: 'dmg' },
        text: (v) => 'раз в ' + sec(v.every) + ' над дорогой встаёт грозовая туча на ' + sec(v.time) + ': дважды в '
          + 'секунду бьёт молнией всех под собой, ' + around(v.radius) + ', урон ×' + num(v.bonus) },
      { name: 'Гроза над полем', v: { every: 60, time: 4, bonus: 1.5 },
        scale: { every: 'haste', time: 'time', bonus: 'dmg' },
        text: (v) => 'раз в ' + sec(v.every) + ' на ' + sec(v.time) + ' молнии дважды в секунду бьют по всем мобам на '
          + 'поле: урон ×' + num(v.bonus) },
    ],
    pool: ['perk0', 'perk1', 'perk3', 'perk2', 'perk4', 'perk5', 'chain'],
    react: { skill: 'perk3', element: 'lightning' },
    runes: [
      { id: 'chain', name: 'Живая цепь', text: 'молния не слабеет, перескакивает ещё на 5 мобов и может идти '
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
    base: { damage: 1.9, interval: 1.6, range: 3.5, target: 'potion', flight: 0.5 },
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
      { name: 'Кислота', v: { cut: 0.3, time: 5 }, scale: { time: 'time' },
        text: (v) => 'зелье разъедает броню на ' + sec(v.time) + ': брони у задетых на ' + pct(v.cut) + ' меньше, а у '
          + 'кого её нет — урон по ним на столько же больше' },
      { name: 'Зелье безумия', v: { chance: 0.1, time: 3, bite: 1.5 }, scale: { chance: 'luck', time: 'time' },
        text: (v) => 'с шансом ' + pct(v.chance) + ' задетый сходит с ума на ' + sec(v.time) + ': идёт назад и кусает '
          + 'своих — урон ×' + num(v.bite) + ' в секунду; боссам нипочём' },
      { name: 'Философский камень', v: { chance: 0.15, coins: 3 }, scale: { chance: 'luck' },
        text: (v) => 'моб, погибший отравленным, с шансом ' + pct(v.chance) + ' рассыпается золотом: каждому в '
          + 'отряде +' + v.coins + ' монеты' },
      { name: 'Ядовитая реакция', v: {},
        text: () => 'его удары накладывают на мобов стихию яда — для реакций с другими стихиями' },
    ],
    pool: ['perk0', 'perk3', 'perk1', 'perk4', 'perk2', 'epidemic', 'perk5', 'perk6'],
    react: { skill: 'perk6', element: 'poison' },
    runes: [
      { id: 'epidemic', name: 'Чёрный мор', text: 'яд чернеет: берёт и нежить, пробивает броню и щиты, бьёт на 25% '
        + 'сильнее; отравленный, умирая, заражает соседей на клетку вокруг' },
      { id: 'infection', name: 'Инфекция', text: 'отравленные гниют ещё 5 с после яда: теряют 1% здоровья в секунду '
        + '(боссы — 0,3%), но не больше урона ×' + num(RUNE_CAPS.rot) + ' в секунду' },
      { id: 'plague', name: 'Чума', text: 'яд чернеет: берёт и нежить, пробивает броню и бьёт на 25% сильнее' },
    ],
  },
  {
    id: 'pyro',
    name: 'Маг огня',
    color: '#ef4444',
    element: 'fire',
    primary: 'int',
    earn: { xp: 1.2, coins: 1.18 },
    weapon: 'посох',
    stats: { str: 'low', agi: 'mid', int: 'mid' },
    base: { damage: 0.8, interval: 1, range: 3 },
    summary: 'Огненные шары; первый камень даёт стиль: огненный шар, дракон или возгорание',
    main: (b) => 'Бросает огненные шары на ' + cells(b.range) + ', урон огнём ×' + num(b.damage),
    styles: [
      { id: 'fireball', name: 'Огненный шар', marks: ['twin'], text: 'шары крупнее, летят дальше и бьют '
        + 'сильнее, а у цели взрываются на клетку вокруг' },
      { id: 'dragon', name: 'Дракон', text: 'маг становится драконом: вместо шаров дышит струёй пламени — раз в тик '
        + 'жжёт всех в конусе' },
      { id: 'ignite', name: 'Возгорание', text: 'не стреляет, зато каждый тик любой моб на карте может вспыхнуть от '
        + 'его огня — у каждого свой шанс' },
    ],
    upgrades: [
      { id: 'giant', style: 'fireball', name: 'Гигантский шар', text: 'шар ещё больше: сильнее, дальше, чаще бьёт '
        + 'критом, взрыв шире' },
      { id: 'twin', style: 'fireball', name: 'Двойной каст', text: 'вместе с шаром летит второй такой же — '
        + 'в случайного моба в радиусе' },
      { id: 'rain', style: 'fireball', name: 'Огненный дождь', text: 'раз в несколько секунд на мобов вокруг одной из '
        + 'целей сыплются огненные шары, на 3 клетки вокруг' },
      { id: 'vent', style: 'fireball', name: 'Жерло', text: 'рядом с магом открывается жерло вулкана до конца игры: '
        + 'раз в несколько секунд плюётся огненным шаром в моба в 5 клетках' },
      { id: 'wide', style: 'dragon', name: 'Широкое дыхание', text: 'струя пламени шире' },
      { id: 'lungs', style: 'dragon', name: 'Большие лёгкие', text: 'струя вдвое длиннее, и дракон достаёт вдвое '
        + 'дальше' },
      { id: 'flight', style: 'dragon', name: 'Перелёт', text: 'если 3 секунды некого жечь, дракон перелетает к первому '
        + 'мобу на карте' },
      { id: 'beam', style: 'dragon', name: 'Заряженное дыхание', text: 'раз в несколько секунд секунду набирает '
        + 'пламя и бьёт лучом в ближайшего — сперва в элитных и боссов' },
      { id: 'flameRing', style: 'ignite', name: 'Кольцо пламени', text: 'вокруг мага горит кольцо пламени: каждый тик '
        + 'жжёт всех внутри' },
      { id: 'fireWall', style: 'ignite', name: 'Стена огня', text: 'на ближайшей клетке дороги рядом с магом '
        + '(сперва на общей дороге) горит стена пламени в 3 клетки: каждый тик сильно жжёт всех в ней' },
      { id: 'amaterasu', style: 'ignite', name: 'Аматерасу', text: 'возгорание оставляет чёрное пламя: этот моб чаще '
        + 'вспыхивает от мага и получает больше урона от всех его навыков' },
      { id: 'phoenix', style: 'ignite', name: 'Феникс', text: 'раз в несколько секунд феникс летит по дороге от сердца '
        + 'к случайному выходу и прожигает всех на пути очень сильным огнём' },
    ],
    abilities: [
      { id: 'smolder', name: 'Тление', text: 'кого задел его огонь, тот ещё несколько секунд горит и теряет здоровье '
        + 'каждый тик' },
      { id: 'fireReact', name: 'Огненная реакция', text: 'его огонь накладывает на мобов стихию огня — для реакций с '
        + 'другими стихиями' },
      { id: 'torch', name: 'Факел', text: 'стрелок, пулемётчик и охотник в клетке от мага добавляют к ударам огонь, '
        + 'а с «Огненной реакцией» — и стихию огня' },
      { id: 'blue', name: 'Синее пламя', text: 'его огонь синеет: бьёт сильнее, горит дольше, а реакции с его огнём '
        + 'сильнее' },
    ],
    react: { skill: 'fireReact', element: 'fire' },
    skills: [],
    runes: [],
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
      { name: 'Кровопускание', v: { share: 0.04, boss: 0.01, time: 5, cap: 0.6 },
        text: (v) => 'болт по элитному или боссу открывает рану: за ' + sec(v.time) + ' она отнимает ' + pct(v.share)
          + ' здоровья (у босса ' + pct(v.boss) + '), но не больше урона ×' + num(v.cap) + ' в секунду' },
      { name: 'Гроза чудовищ', v: { bonus: 0.6 }, scale: { bonus: 'power' },
        text: (v) => 'по боссам и элитным все его удары на ' + pct(v.bonus) + ' сильнее' },
      { name: 'Медвежий капкан', v: { every: 40, hold: 4, bonus: 50 }, scale: { every: 'haste', hold: 'time' },
        text: (v) => 'раз в ' + sec(v.every) + ' кидает медвежий капкан под самого крепкого моба на земле в радиусе: '
          + 'тот стоит ' + sec(v.hold) + ' — даже босс — и получает урон ×' + num(v.bonus) },
    ],
    pool: ['perk0', 'perk1', 'perk3', 'perk2', 'perk4', 'perk5'],
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
    base: { damage: 0.6, interval: 0.8, leap: 0.6, cocoon: 10, gold: [1, 200] },
    summary: 'Десять волн зреет в коконе, потом грызёт самого крепкого моба',
    main: (b) => 'Первые ' + b.cocoon + ' волн — личинка в коконе на клетке: не бьёт, зато каждую волну получает от '
      + b.gold[0] + ' до ' + b.gold[1] + ' монет. Потом цепляется к самому крепкому мобу и грызёт его, убил — прыгает '
      + 'на следующего',
    skills: [
      { name: 'Шок', v: { stun: 0.5, share: 0.1, elite: 0.05, boss: 0.03, cap: 25 },
        scale: { stun: 'time', cap: 'dmg' },
        text: (v) => 'крит оглушает на ' + sec(v.stun) + ' и отнимает ещё ' + pct(v.share) + ' здоровья (у элитных '
          + pct(v.elite) + ', у боссов ' + pct(v.boss) + '), но не больше урона ×' + num(v.cap) },
      { name: 'Заражение', v: { vuln: 0.3 }, scale: { vuln: 'power' },
        text: (v) => 'моб, в которого он вгрызся, получает на ' + pct(v.vuln) + ' больше урона от всех' },
      { name: 'Налёт', v: { every: 30, rich: 1000, nap: 10, sleep: 60 },
        text: (v) => 'раз в ' + sec(v.every) + ' прыгает на голову союзнику, у которого больше ' + v.rich + ' монет, '
          + 'забирает все его монеты и раздаёт их случайно всем, себе тоже; потом ' + sec(v.nap) + ' спит у него на '
          + 'голове, а союзник спит ' + sec(v.sleep) + '. Свои монеты паразит держит до ' + v.rich
          + ', лишние тоже раздаёт' },
      { name: 'Липкий кокон', v: { radius: 1.5, slow: 0.3 },
        text: (v) => 'пока в коконе, мобы ' + around(v.radius) + ' медленнее на ' + pct(v.slow) },
      { name: 'Пожиратель', v: { bonus: 0.05 }, scale: { bonus: 'power' },
        text: (v) => 'каждое его убийство — +' + pct(v.bonus) + ' урона до конца волны' },
      { name: 'Королева роя', v: { every: 20, count: 5, slow: 0.1, vuln: 0.2, time: 8 },
        scale: { every: 'haste', time: 'time' },
        text: (v) => 'раз в ' + sec(v.every) + ' рой облепляет ' + v.count + ' самых крепких мобов на поле на '
          + sec(v.time) + ': они медленнее на ' + pct(v.slow) + ' и получают на ' + pct(v.vuln) + ' больше урона' },
      { name: 'Захват разума', v: { every: 60, time: 10, bite: 3 }, scale: { every: 'haste', time: 'time' },
        text: (v) => 'раз в ' + sec(v.every) + ' носитель (не босс) на ' + sec(v.time) + ' сходит с ума: идёт назад и '
          + 'кусает своих — урон ×' + num(v.bite) + ' в секунду' },
    ],
    pool: ['perk0', 'perk3', 'perk1', 'perk2', 'perk4', 'perk5', 'perk6'],
    runes: [
      { id: 'frenzy', name: 'Бешенство', text: 'кусает втрое чаще' },
      { id: 'thorn', name: 'Смертельный шип', text: 'с шансом 3% добивает моба, у которого меньше 30% здоровья; '
        + 'слишком крепкому наносит урон ×' + num(RUNE_CAPS.thorn) },
    ],
  },
  {
    id: 'frost',
    name: 'Маг воды',
    color: '#38bdf8',
    element: 'water',
    through: true,
    primary: 'int',
    earn: { xp: 0.82, coins: 0.96 },
    weapon: 'посох',
    stats: { str: 'low', agi: 'low', int: 'high' },
    base: { damage: 0.75, interval: 1, range: 2.7, wet: 5, storm: 0.55 },
    summary: 'Струя воды: мокрые мобы — для реакций других магов',
    main: (b) => 'Бьёт струёй воды на ' + cells(b.range) + ', урон ×' + num(b.damage) + ': цель ' + sec(b.wet)
      + ' мокрая — молния бьёт её вдвое и оглушает, лёд сразу замораживает, огонь превращает воду в пар',
    skills: [
      { name: 'Ледяная буря', v: { slow: 0.35, time: 3 }, scale: { slow: 'power', time: 'time' },
        text: (v) => 'вместо струи вокруг него ледяная буря: раз в секунду бьёт льдом всех в ней, даже за горами и в '
          + 'тоннелях; в буре мобы медленнее на ' + pct(Math.min(0.8, v.slow)) + ', а вышедшие ещё ' + sec(v.time)
          + ' подморожены' },
      { name: 'Заморозка', v: { chance: 0.08, time: 1.5 }, scale: { chance: 'luck', time: 'time' },
        text: (v) => 'с шансом ' + pct(v.chance) + ' его удар замораживает на ' + sec(v.time) },
      { name: 'Снегопад', v: { every: 30, time: 3, chance: 0.15, slow: 0.3 },
        scale: { every: 'haste', time: 'time', chance: 'luck' },
        text: (v) => 'раз в ' + sec(v.every) + ' снег на всё поле: все мобы ' + sec(v.time) + ' подморожены, а с '
          + 'шансом ' + pct(v.chance) + ' — заморожены' },
      { name: 'Волна', v: { every: 6, push: 1 }, scale: { every: 'haste' },
        text: (v) => 'раз в ' + sec(v.every) + ' пускает волну: все мобы в его радиусе отброшены ' + by(v.push)
          + ' назад; боссов не сдвинуть' },
      { name: 'Водоворот', v: { every: 15, time: 3, radius: 1, dps: 3 },
        scale: { every: 'haste', time: 'time', dps: 'dmg' },
        text: (v) => 'раз в ' + sec(v.every) + ' на дороге воронка на ' + sec(v.time) + ': мобы ' + around(v.radius)
          + ' крутятся на месте и получают урон ×' + num(v.dps) + ' в секунду; боссов не держит' },
      { name: 'Цунами', v: { every: 40, push: 3 }, scale: { every: 'haste' },
        text: (v) => 'раз в ' + sec(v.every) + ' волна от сердца к порталам отбрасывает всех, кроме боссов, '
          + by(v.push) + ' назад' },
      { name: 'Водная реакция', v: {},
        text: () => 'его удары накладывают на мобов стихию воды — для реакций с другими стихиями' },
    ],
    pool: ['perk0', 'perk3', 'perk1', 'perk4', 'perk2', 'perk5', 'permafrost', 'perk6'],
    react: { skill: 'perk6', element: 'water' },
    runes: [
      { id: 'permafrost', name: 'Вечная мерзлота', text: 'подморозка и заморозка вдвое дольше' },
      { id: 'brittle', name: 'Хрупкость', text: 'замороженный моб с шансом 0,5% гибнет от любого удара; слишком '
        + 'крепкий получает урон ×' + num(RUNE_CAPS.shatter) },
    ],
  },
  {
    id: 'shaman',
    name: 'Маг ветра',
    color: '#14b8a6',
    primary: 'int',
    earn: { xp: 1.18, coins: 1.2 },
    weapon: 'посох',
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
        text: (v) => 'с шансом ' + pct(v.chance) + ' удар отбрасывает задетых ' + by(v.push) + ' назад' },
      { name: 'Пронзающий ветер', v: { every: 25, radius: 2.5, haste: 0.4, time: 6 },
        scale: { every: 'haste', radius: 'power', haste: 'power', time: 'time' },
        text: (v) => 'раз в ' + sec(v.every) + ' ветер ' + around(v.radius) + ': союзники ' + sec(v.time)
          + ' бьют на ' + pct(v.haste) + ' быстрее, сам он — на ' + pct(v.haste * 2) },
      { name: 'Попутный ветер', v: { haste: 0.15, radius: 2.5 },
        text: (v) => 'союзники ' + around(v.radius) + ' всегда бьют на ' + pct(v.haste) + ' быстрее' },
      { name: 'Ураган', v: { every: 25, time: 2, vuln: 0.5 }, scale: { every: 'haste', time: 'time' },
        text: (v) => 'раз в ' + sec(v.every) + ' поднимает в воздух всех лёгких мобов в радиусе — кроме элитных и '
          + 'боссов: ' + sec(v.time) + ' они не идут и получают на ' + pct(v.vuln) + ' больше урона' },
      { name: 'Око бури', v: { every: 60, push: 4 }, scale: { every: 'haste' },
        text: (v) => 'раз в ' + sec(v.every) + ' смерч проходит по всей дороге и отбрасывает всех, кроме боссов, '
          + by(v.push) + ' назад' },
      { name: 'Воздушная реакция', v: {},
        text: () => 'его удары накладывают на мобов стихию воздуха — для реакций с другими стихиями' },
    ],
    pool: ['perk0', 'perk3', 'perk1', 'tornado', 'perk2', 'perk4', 'perk5', 'headwind', 'perk6'],
    react: { skill: 'perk6', element: 'air' },
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
    weapon: 'посох',
    stats: { str: 'low', agi: 'low', int: 'high' },
    base: { damage: 0.95, interval: 1.3, range: 3, target: 'land', spikes: 2, rebuild: 9 },
    summary: 'Шипы из-под земли, каменная стена, землетрясение',
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
      { name: 'Землетрясение', v: { every: 12, stun: 0.8 }, scale: { every: 'haste', stun: 'time' },
        text: (v) => 'раз в ' + sec(v.every) + ' земля дрожит: все мобы в его радиусе оглушены на ' + sec(v.stun) },
      { name: 'Разлом', v: { every: 45, count: 6, share: 0.5, elite: 0.2, boss: 0.05, cap: 60 },
        scale: { every: 'haste' },
        text: (v) => 'раз в ' + sec(v.every) + ' земля раскалывается вдоль ' + v.count + ' клеток дороги: обычные мобы '
          + 'теряют ' + pct(v.share) + ' здоровья, элитные ' + pct(v.elite) + ', боссы ' + pct(v.boss)
          + ', но не больше урона ×' + num(v.cap) },
      { name: 'Зыбучий песок', v: { every: 10, time: 6, radius: 1, slow: 0.5 }, scale: { every: 'haste', time: 'time' },
        text: (v) => 'раз в ' + sec(v.every) + ' клетка дороги перед мобами на ' + sec(v.time) + ' становится '
          + 'трясиной: мобы ' + around(v.radius) + ' медленнее на ' + pct(v.slow) },
      { name: 'Земляная реакция', v: {},
        text: () => 'его удары накладывают на мобов стихию земли — для реакций с другими стихиями' },
    ],
    pool: ['perk0', 'perk5', 'perk1', 'perk3', 'perk2', 'perk4', 'steel', 'perk6'],
    react: { skill: 'perk6', element: 'earth' },
    runes: [
      { id: 'steel', name: 'Стальная крепость', text: 'стена из стали, втрое прочнее, а рухнув, взрывается камнями '
        + 'и оглушает всех вокруг' },
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
      { name: 'Стяг стойкости', v: {},
        text: () => 'под знаменем никого из отряда не оглушить' },
      { name: 'Длинное древко', v: { wide: 1, range: 0.4 },
        text: (v) => 'знамя ' + by(v.wide) + ' шире, а все под ним бьют на ' + pct(v.range) + ' дальше' },
      { name: 'Легион', v: { every: 60, time: 8 }, scale: { every: 'haste', time: 'time' },
        text: (v) => 'раз в ' + sec(v.every) + ' всё поле на ' + sec(v.time) + ' под его знаменем' },
      { name: 'Знамя героя', v: { bonus: 0.5 }, scale: { bonus: 'power' },
        text: (v) => 'лучший по убийствам в отряде бьёт на ' + pct(v.bonus) + ' сильнее' },
    ],
    pool: ['perk0', 'perk3', 'perk1', 'perk4', 'perk2', 'perk5', 'perk6'],
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
      { name: 'Обновление', v: { lives: 2 },
        text: (v) => 'после каждой волны сердцу ещё +' + v.lives + ' жизни, а первый укус в каждой волне жизнь не '
          + 'отнимает' },
      { name: 'Благословение', v: { every: 10, time: 8, bonus: 0.3, radius: 3.2 },
        scale: { every: 'haste', time: 'time', bonus: 'power' },
        text: (v) => 'раз в ' + sec(v.every) + ' благословляет союзника ' + around(v.radius) + ': тот ' + sec(v.time)
          + ' бьёт на ' + pct(v.bonus) + ' сильнее' },
      { name: 'Свет небес', v: { every: 30, undead: 30, bonus: 10, stun: 1 }, scale: { every: 'haste', stun: 'time' },
        text: (v) => 'раз в ' + sec(v.every) + ' луч с неба бьёт самого крепкого моба в радиусе: нежити урон ×'
          + num(v.undead) + ', остальным ×' + num(v.bonus) + ', и оглушает на ' + sec(v.stun) },
    ],
    pool: ['perk0', 'perk3', 'perk1', 'perk4', 'perk2', 'perk5', 'second', 'guardian'],
    runes: [
      { id: 'guardian', name: 'Ангел-хранитель', text: '«Щит» спасает и от боссов и срабатывает вдвое чаще' },
      { id: 'second', name: 'Второй шанс', text: 'раз за игру, когда у сердца кончаются жизни, лекарь возвращает 5 '
        + 'и стирает всю волну — один раз на весь отряд' },
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
      { name: 'Ясность', v: { haste: 0.3 },
        text: (v) => 'союзники в его круге перезаряжают способности на ' + pct(v.haste) + ' быстрее' },
      { name: 'Петля времени', v: { time: 10 },
        text: (v) => 'раз за игру, когда первый моб доходит до сердца, время отматывается: все мобы возвращаются на '
          + sec(v.time) + ' пути назад' },
      { name: 'Просветление', v: { every: 60 }, scale: { every: 'haste' },
        text: (v) => 'раз в ' + sec(v.every) + ' все способности отряда сразу перезаряжаются' },
    ],
    pool: ['perk0', 'perk3', 'perk1', 'pupil', 'perk2', 'omniscience', 'perk4', 'perk5'],
    runes: [
      { id: 'pupil', name: 'Ученик', text: 'вдохновение достаётся сразу двоим' },
      { id: 'omniscience', name: 'Всеведение', text: '«Слабое место» метит трёх самых сильных' },
    ],
  },
];

export const CLASS_BY_ID = new Map(CLASSES.map((c) => [c.id, c]));

const grade = (cls, id) => STAT.grades[cls.stats[id]];

export function scaled(skill, { power = 1, luck = 1, haste = 1 } = {}) {
  const out = {};
  for (const [key, value] of Object.entries(skill.v)) {
    const how = skill.scale && skill.scale[key];
    out[key] = how === 'power' || how === 'buff' || how === 'time' ? value * power : how === 'luck'
      ? 1 - Math.pow(1 - value, luck) : how === 'haste' ? value / haste : value;
  }
  return out;
}

export function mastery() {
  const gain = STAT.masteryMax * STAT.mastery / (STAT.mastery + STAT.masteryHalf);
  return { power: 1 + gain, haste: 1 + gain, luck: 1 + STAT.mastery / STAT.luckHalf };
}

export function baseOf(cls) {
  const b = cls.base, str = grade(cls, 'str'), agi = grade(cls, 'agi'), int = grade(cls, 'int');
  return {
    damage: TOWER.damage * b.damage * (1 + STAT.damage * str) * (cls.element ? 1 + STAT.element * int : 1),
    skill: TOWER.damage * b.damage * (1 + STAT.skill * grade(cls, cls.primary)) * mastery().power,
    interval: (b.interval || 1) / (1 + STAT.speed * agi),
    crit: Math.min(STAT.critMax, STAT.critChance * agi),
    critMul: STAT.critBase + STAT.critPower * str,
    reach: STAT.reach * int,
  };
}

export const mightOf = (power = 0, paragon = 0) => Math.round((MIGHT.base + power) * (1 + MIGHT.paragon * paragon));

export function poolOf(id) {
  const cls = CLASS_BY_ID.get(id);
  if (!cls) return [];
  if (cls.styles) {
    const tag = (kind) => (skill) => Object.assign({ kind, perk: null }, skill);
    return cls.styles.map(tag('style')).concat(cls.upgrades.map(tag('upgrade')), cls.abilities.map(tag('ability')));
  }
  const all = cls.skills.map((skill, i) => ({ id: 'perk' + i, perk: i, kind: 'ability', name: skill.name,
    text: skill.text(scaled(skill, mastery())) }))
    .concat(cls.runes.map((rune) => ({ id: rune.id, perk: null, kind: 'ability', name: rune.name, text: rune.text })));
  return cls.pool ? cls.pool.map((key) => all.find((skill) => skill.id === key)) : all;
}

export function choiceOf(id, taken) {
  const pool = poolOf(id), style = pool.find((skill) => skill.kind === 'style' && taken.includes(skill.id));
  if (!style && pool.some((skill) => skill.kind === 'style')) {
    return pool.filter((skill) => skill.kind === 'style').map((skill) => ({ skill, state: 'open' }));
  }
  return pool.filter((skill) => skill.kind !== 'style' && (!skill.style || style && skill.style === style.id))
    .map((skill) => ({ skill, state: taken.includes(skill.id) ? 'taken' : 'open' }));
}

export function styleOf(id, taken) {
  const cls = CLASS_BY_ID.get(id);
  return cls && cls.styles ? cls.styles.find((item) => taken.includes(item.id)) || null : null;
}

export function skinOf(id, taken = []) {
  const cls = CLASS_BY_ID.get(id);
  if (!cls || !cls.styles) return id;
  const style = cls.styles.find((item) => taken.includes(item.id));
  if (!style) return id + '-ragged';
  const marks = (style.marks || []).filter((mark) => taken.includes(mark)).map((mark) => '-' + mark).join('');
  return id + '-' + style.id + marks + (taken.includes('blue') ? '-blue' : '');
}

export const skillOf = (cls, id) => poolOf(cls).find((skill) => skill.id === id) || null;

export const stonesAt = (level) => STONES.filter((at) => level >= at).length;

export function describe(id, skills = []) {
  const cls = CLASS_BY_ID.get(id), style = styleOf(id, skills);
  const main = style ? style.text[0].toUpperCase() + style.text.slice(1) : cls.main(cls.base);
  return { main, skills: skills.map((skill) => skillOf(id, skill)).filter(Boolean) };
}
