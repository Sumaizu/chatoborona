import { test, eq, ok, no } from './harness.js';
import { playNote, reportPlay } from '../../site/reborn/js/stats.js';
import { seeded } from './fixtures.js';
import { BIOMES, SIZE, cellName, coverage, makeMap, parseCell } from '../../site/reborn/js/field.js';
import { LEVEL_MAX, MIGHT, MOBS, STAT, TEMPO, WAVE, crowdFactor, eliteCount, levelOf, rollTempo, waveHp, waveReward,
  waveSpawns, xpForLevel } from '../../site/reborn/js/balance.js';
import { CLASSES, CLASS_BY_ID, PERKS, STONES, STONE_CHANCE, choiceOf, describe, mastery, mightOf, poolOf, scaled,
  skinOf, stonesAt, styleOf }
  from '../../site/reborn/js/classes.js';
import { ASCEND_AT, BOONS, DIVINE, OUTCOMES, RARITIES, TIER_STEPS, boonMods, boonOf, makeWeapon, spin, upgrade,
  weaponPower, weaponTitle } from '../../site/reborn/js/gacha.js';
import { clean, fromQuery, toQuery, DEFAULTS } from '../../site/reborn/js/config.js';

test('клетка: буква и число в любом порядке, латинские двойники', () => {
  eq(parseCell('к7'), { x: 9, y: 6 });
  eq(parseCell('!К7'), { x: 9, y: 6 });
  eq(parseCell('k7'), { x: 9, y: 6 });
  eq(parseCell('7к'), { x: 9, y: 6 });
  eq(parseCell(' б 3 '), { x: 1, y: 2 });
  eq(parseCell('ф20'), { x: 19, y: 19 });
  eq(parseCell('A1'), { x: 0, y: 0 });
  eq(cellName(9, 6), 'К7');
});

test('клетка: чужое не принимается', () => {
  for (const text of ['а0', 'а21', 'й5', 'ё3', 'привет', 'к', '7', 'к7 привет', '!играть', '']) {
    eq(parseCell(text), null, text);
  }
});

const edge = ([x, y]) => x === 0 || y === 0 || x === SIZE - 1 || y === SIZE - 1;
const key = ([x, y]) => y * SIZE + x;
const touching = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;

test('карта: главная дорога от края до края, без самопересечений и касаний, длина в пределах', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const { path } = makeMap(seeded(seed)), seen = new Set();
    ok(path.length >= 66 && path.length <= 74, 'длина ' + path.length);
    ok(edge(path[0]) && edge(path[path.length - 1]), 'концы у края');
    path.forEach(([x, y], i) => {
      ok(x >= 0 && y >= 0 && x < SIZE && y < SIZE, 'внутри поля');
      no(seen.has(y * SIZE + x), 'клетка дважды');
      seen.add(y * SIZE + x);
      if (i) eq(Math.abs(x - path[i - 1][0]) + Math.abs(y - path[i - 1][1]), 1, 'шаг в соседнюю клетку');
    });
    const index = new Map(path.map(([x, y], i) => [y * SIZE + x, i]));
    path.forEach(([x, y], i) => {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const j = index.get((y + dy) * SIZE + x + dx);
        if (j !== undefined && x + dx >= 0 && x + dx < SIZE) eq(Math.abs(i - j), 1, 'касание дороги');
      }
    });
  }
});

test('карта: второй вход — от другого края, вливается в главную дорогу примерно посередине', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const { path, branch, merge } = makeMap(seeded(seed)), main = new Set(path.map(key));
    ok(branch.length >= 7, 'вторая дорога не короче семи клеток: ' + branch.length);
    ok(edge(branch[0]) && key(branch[0]) !== key(path[0]), 'начало у края, не там же, где первая');
    ok(merge >= path.length * 0.3 && merge <= path.length * 0.65, 'слияние посередине: ' + merge);
    ok(touching(branch[branch.length - 1], path[merge]), 'упирается в главную дорогу');
    branch.forEach((cell, i) => {
      no(main.has(key(cell)), 'по главной не идёт');
      if (i) ok(touching(cell, branch[i - 1]), 'шаг в соседнюю клетку');
      if (i < branch.length - 1) no(path.some((other) => touching(other, cell)), 'главную не задевает');
    });
  }
});

test('карта: мобы выходят из гор — первые клетки обеих дорог в тоннеле; на дороге нет гор и озёр', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const { path, branch, tiles, biome } = makeMap(seeded(seed));
    ok(BIOMES.includes(biome));
    for (const start of [path, branch]) {
      eq([tiles[key(start[0])], tiles[key(start[1])]], ['tunnel', 'tunnel']);
      ok([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => tiles[key([start[1][0] + dx, start[1][1] + dy])]
        === 'mountain'), 'у входа гора');
    }
    for (const cell of path.concat(branch)) ok(['', 'tunnel', 'bridge'].includes(tiles[key(cell)]), 'дорога свободна');
    const road = new Set(path.concat(branch).map(key)), hills = [];
    tiles.forEach((tile, at) => {
      if (tile === 'hill') hills.push(at);
      if (tile === 'tunnel') ok(road.has(at), 'тоннель — только на дороге');
    });
    ok(hills.length >= 3 && hills.length <= 32, 'холмы — группами: ' + hills.length);
    ok(hills.some((at) => path.concat(branch).some(([x, y]) => Math.abs(x - at % SIZE) <= 1
      && Math.abs(y - Math.floor(at / SIZE)) <= 1)), 'холм у дороги');
    ok(tiles.includes('lake') && tiles.includes('mountain'));
  }
});

test('карта: расщелины, руины, кратеры и древности — изредка, не на дороге; мост через расщелину — поперёк дороги', () => {
  const seen = new Map(), relics = { desert: 'bones', volcano: 'bones', graveyard: 'crypt' };
  for (let seed = 1; seed <= 120; seed++) {
    const { path, branch, tiles, biome } = makeMap(seeded(seed)), road = new Set(path.concat(branch).map(key));
    const tile = (x, y) => (x >= 0 && y >= 0 && x < SIZE && y < SIZE ? tiles[y * SIZE + x] : '');
    tiles.forEach((kind, at) => {
      if (!kind) return;
      seen.set(kind, (seen.get(kind) || 0) + 1);
      const x = at % SIZE, y = Math.floor(at / SIZE);
      if (['chasm', 'ruin', 'crater', 'stones', 'bones', 'crypt'].includes(kind)) no(road.has(at), kind + ' на дороге');
      if (['stones', 'bones', 'crypt'].includes(kind)) eq(kind, relics[biome] || 'stones', 'древность своего края');
      if (kind !== 'bridge') return;
      ok(road.has(at), 'мост — только на дороге');
      const gap = ['chasm', 'river', 'lake'];
      ok(gap.includes(tile(x - 1, y)) && gap.includes(tile(x + 1, y)) || gap.includes(tile(x, y - 1))
        && gap.includes(tile(x, y + 1)), 'мост перекрывает расщелину или реку с обеих сторон');
    });
  }
  for (const kind of ['chasm', 'ruin', 'crater']) ok(seen.get(kind) > 0, 'встречается: ' + kind);
  ok(seen.get('stones') + (seen.get('bones') || 0) + (seen.get('crypt') || 0) > 0, 'встречаются древности');
});

test('карта: одна и та же при одном зерне, биомы встречаются все', () => {
  eq(makeMap(seeded(5)), makeMap(seeded(5)));
  const seen = new Set();
  for (let seed = 1; seed <= 60; seed++) seen.add(makeMap(seeded(seed)).biome);
  eq(seen.size, BIOMES.length);
});

test('охват клетки: сколько клеток дороги в радиусе', () => {
  const score = coverage([[5, 5]], 1);
  eq(score[5 * SIZE + 5], 1);
  eq(score[5 * SIZE + 6], 1);
  eq(score[6 * SIZE + 6], 0);
});

test('уровни: каждый следующий дороже, до сотого', () => {
  eq(levelOf(0), 1);
  eq(levelOf(1e9), LEVEL_MAX);
  for (let level = 2; level <= LEVEL_MAX; level++) {
    eq(levelOf(xpForLevel(level)), level);
    eq(levelOf(xpForLevel(level) - 0.01), level - 1);
    if (level > 2) ok(xpForLevel(level) - xpForLevel(level - 1) > xpForLevel(level - 1) - xpForLevel(level - 2));
  }
});

test('волны: босс на десятой, мобов больше со временем, элитные — случайно и чем дальше, тем чаще', () => {
  ok(waveSpawns(10).some((s) => s.type === 'boss'));
  no(waveSpawns(5).some((s) => s.type === 'elite'), 'элитные в плане волны больше не стоят');
  const average = (wave) => {
    const random = seeded(wave);
    let sum = 0, many = 0;
    for (let i = 0; i < 4000; i++) {
      const count = eliteCount(wave, random);
      sum += count;
      if (count >= 2) many += 1;
    }
    return { mean: sum / 4000, many: many / 4000 };
  };
  eq(average(1).mean, 0, 'на первых волнах элитных нет');
  ok(average(5).mean > 0.1 && average(5).mean < average(40).mean, 'с каждой волной чаще');
  ok(average(40).many > 0.1, 'бывает и по двое-трое');
  ok(waveReward(20).coins > waveReward(1).coins && waveReward(20).xp > waveReward(1).xp, 'награда за волну растёт');
  no(waveSpawns(1).some((s) => s.type === 'boss' || s.type === 'elite'));
  ok(waveSpawns(41).length > waveSpawns(1).length);
  for (const s of waveSpawns(7)) ok(MOBS[s.type], s.type);
  const delays = waveSpawns(9).map((s) => s.delay);
  eq(delays, delays.slice().sort((a, b) => a - b));
});

test('здоровье мобов растёт с волной и с числом игроков', () => {
  for (let wave = 2; wave < 80; wave++) ok(waveHp(wave, 'normal', 10) > waveHp(wave - 1, 'normal', 10));
  for (let players = 2; players < 200; players++) ok(crowdFactor(players) > crowdFactor(players - 1));
  const step = (wave) => waveHp(wave + 1, 'normal', 10) / waveHp(wave, 'normal', 10);
  ok(step(85) > step(55) * 1.15, 'после 60-й волны мобы крепчают заметно быстрее — дальше не прорваться');
  ok(Math.abs(step(30) - WAVE.growth * Math.exp(WAVE.accel * 59)) < 1e-9, 'до стены — как раньше');
  ok(waveHp(10, 'boss', 1) > waveHp(10, 'elite', 1));
});

test('крутизна волн у каждой игры своя: обычный отряд кончается где-то между 30-й и 70-й, стена у 100-й — общая', () => {
  const near = (a, b, note = '') => ok(Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(b)), note + ' ' + a + ' ≈ ' + b);
  eq([TEMPO.low, TEMPO.mid, TEMPO.high, TEMPO.from], [30, 50, 70, 10]);
  const gentle = rollTempo(() => 1), steep = rollTempo(() => 0);
  near(gentle, 40 / 60);
  near(steep, 2);
  const end = (tempo) => TEMPO.from + (TEMPO.mid - TEMPO.from) / tempo;
  const games = Array.from({ length: 1000 }, (_, i) => end(rollTempo(() => (i + 0.5) / 1000)));
  const third = (TEMPO.high - TEMPO.low) / 3, count = (from, to) => games.filter((at) => at >= from && at < to).length;
  eq([count(30, 30 + third), count(30 + third, 30 + third * 2), count(30 + third * 2, 71)], [250, 250, 500],
    'тяжёлых — четверть, средних — четверть, лёгких — половина');
  near(waveHp(41, 'normal', 10, gentle), waveHp(31, 'normal', 10), 'пологая: 41-я — как обычная 31-я');
  near(waveHp(31, 'normal', 10, steep), waveHp(51, 'normal', 10), 'крутая: 31-я — как обычная 51-я');
  for (const wave of [1, 5, 11]) near(waveHp(wave, 'normal', 10, steep), waveHp(wave, 'normal', 10), 'начало общее');
  near(waveHp(40, 'normal', 10, 1), waveHp(40, 'normal', 10));
  ok(waveHp(90, 'normal', 10, gentle) > waveHp(68, 'normal', 10) * 5, 'стена до 90-й не пологеет');
});

test('с 91-й волны мобы крепчают спокойно — на 10% за волну, иначе до Диабло не дойти', () => {
  eq([WAVE.calm, WAVE.calmGrowth], [90, 1.1]);
  for (const tempo of [rollTempo(() => 0), 1, rollTempo(() => 1)]) {
    const step = (wave) => waveHp(wave + 1, 'normal', 10, tempo) / waveHp(wave, 'normal', 10, tempo);
    ok(step(89) > 1.2, 'до 90-й — круто: ' + step(89));
    for (let wave = 90; wave < 100; wave++) ok(Math.abs(step(wave) - 1.1) < 1e-9, wave + 1 + '-я: ' + step(wave));
  }
});

test('классы: девять, у каждого свой склад и набор навыков; у стрелков — по плану Реборна', () => {
  eq(CLASSES.length, 9);
  eq(new Set(CLASSES.map((c) => c.id)).size, 9);
  eq(PERKS, [10, 30, 50]);
  const runes = CLASSES.flatMap((cls) => cls.runes.map((rune) => rune.id));
  eq(new Set(runes).size, runes.length, 'руны не повторяются');
  for (const cls of CLASSES) {
    ok(cls.name && ['str', 'agi', 'int'].includes(cls.primary), cls.id);
    for (const stat of ['str', 'agi', 'int']) ok(STAT.grades[cls.stats[stat]], cls.id + ' ' + stat);
    if (!cls.styles) ok(cls.skills.length >= 3 && cls.runes.length >= 2, cls.id);
    ok(cls.earn.xp > 0 && cls.earn.coins > 0, cls.id);
    const pool = poolOf(cls.id);
    ok(pool.every(Boolean), cls.id + ': все навыки набора есть');
    eq(new Set(pool.map((skill) => skill.id)).size, pool.length, cls.id + ': без повторов');
    for (const skill of pool) {
      ok(skill.name && skill.text && !/undefined|NaN/.test(skill.text), cls.id + ' ' + skill.id);
      ok(skill.perk === null ? Boolean(cls.styles) || cls.runes.some((rune) => rune.id === skill.id)
        : skill.id === 'perk' + skill.perk);
    }
    if (!cls.pool && !cls.styles) eq(pool.length, 5, cls.id);
    const chosen = Array.from(new Set([pool[2].id, pool[pool.length - 1].id]));
    const info = describe(cls.id, chosen.concat('чужое'));
    ok(info.main && !/undefined|NaN/.test(info.main), cls.id);
    eq(info.skills.map((skill) => skill.id), chosen, cls.id);
  }
  const names = (id) => poolOf(id).map((skill) => skill.name);
  eq(names('sniper'), ['Снайпер', 'Штурмовик', 'Марксман', 'Донаводка', 'Быстрые руки', 'Бронебой', 'Рикошет',
    'Очередь', 'Рикошет', 'Шумовая граната', 'Отряд поддержки', 'Пробивная пуля', 'Двойной выстрел', 'Шестое чувство',
    'Воздушная оборона', 'Последний патрон', 'Наводчик', 'Золотые пули', 'Бесконечный магазин']);
  eq(choiceOf('sniper', ['assault']).map((option) => option.skill.id), ['burstFire', 'ricochet', 'flashbang', 'support',
    'lastRound', 'spotter', 'goldRounds', 'endless'], 'у штурмовика — только свои усиления');
  eq(['sniper-ragged', 'sniper-scope', 'sniper-assault', 'sniper-marksman'],
    [[], ['scope'], ['assault'], ['marksman']].map((taken) => skinOf('sniper', taken)));
  eq(names('forester'), ['Друид', 'Охотник', 'Ведьма', 'Стена корней', 'Ястреб', 'Путы', 'Стая', 'Ловчий', 'Трофей',
    'Медвежий капкан', 'Град стрел', 'Ядовитый взрыв', 'Котёл яда', 'Чума', 'Поглощение', 'Ядовитая реакция',
    'Зов природы', 'Зоркий глаз', 'Природная ловкость']);
  eq(skinOf('forester', ['witch', 'plague']), 'forester-witch-plague', 'с чумой у ведьмы чёрный яд в руке');
  eq(['forester-ragged', 'forester-druid', 'forester-hunter', 'forester-witch'],
    [[], ['druid'], ['hunter'], ['witch']].map((taken) => skinOf('forester', taken)));
  eq(names('mechanic'), ['Турельщик', 'Подрывник', 'Ракетчик', 'Гигантская турель', 'Атакующий дрон', 'Лазерный дрон',
    'Противовоздушный дрон', 'Кассетный снаряд', 'Большой калибр', 'Залп', 'Прицельный выстрел', 'Напалм',
    'Корректировка', 'Шрапнель', 'Ядерка', 'Команда поддержки', 'ЭМИ-граната', 'Стальной щит', 'Тюнинг']);
  eq(['mechanic-ragged', 'mechanic-turret', 'mechanic-turret-giant', 'mechanic-demo', 'mechanic-mortar'],
    [[], ['turret'], ['turret', 'giant'], ['demo'], ['mortar']].map((taken) => skinOf('mechanic', taken)));
  const drones = (taken) => choiceOf('mechanic', taken).find((option) => option.skill.id === 'droneAttack');
  eq([drones(['turret']).count, drones(['turret']).state], [0, 'open']);
  eq([drones(['turret', 'droneAttack', 'droneAttack']).count, drones(['turret', 'droneAttack', 'droneAttack']).state],
    [2, 'open'], 'дрона можно взять ещё раз');
  eq(drones(['turret', 'droneAttack', 'droneAttack', 'droneAttack']).state, 'taken', 'больше трёх — нельзя');
  eq(choiceOf('mechanic', ['turret', 'giant']).find((option) => option.skill.id === 'giant').state, 'taken');
  eq(describe('mechanic', ['turret', 'droneAir', 'droneAir']).skills.map((skill) => [skill.id, skill.count]),
    [['turret', 1], ['droneAir', 2]], 'в профиле дрон один раз, с числом');
  for (const id of ['bomber', 'miner', 'gunner', 'hunter', 'alchemist', 'healer', 'banner', 'sage']) no(CLASS_BY_ID.has(id), 'старого класса больше нет: ' + id);
});

test('классы: описания — простой текст, без меток и значков', () => {
  for (const cls of CLASSES) {
    const info = describe(cls.id);
    for (const text of [info.main].concat(poolOf(cls.id).map((skill) => skill.text))) {
      no(/[{}]/.test(text), cls.id + ': ' + text);
    }
  }
});

test('классы: мастерство одно на всех и постоянное, шанс способности никогда не 100%', () => {
  const skill = mastery();
  ok(skill.power > 1 && skill.haste > 1 && skill.luck > 1);
  for (const cls of CLASSES) {
    for (const item of cls.skills) {
      for (const [key, how] of Object.entries(item.scale || {})) {
        if (how === 'luck') ok(scaled(item, skill)[key] < 1, cls.id + ' ' + item.name + ': шанс не 100%');
      }
    }
  }
  eq(new Set(CLASSES.map((cls) => cls.primary)), new Set(['str', 'agi', 'int']));
});

test('мощь: 100 без оружия, оружие прибавляет свою мощь, парагон — +5% за каждый', () => {
  eq(mightOf(), MIGHT.base);
  eq(mightOf(40), 140);
  eq(mightOf(40, 2), Math.round(140 * 1.1));
  eq(MIGHT.paragon, 0.05);
});

test('гача: горстка — остальное, мешок 10%, сундук 3%, частица бога 0,5%; цвета редкости', () => {
  const random = seeded(11), counts = new Map(), money = { handful: [1, 50], bag: [51, 200], chest: [201, 1000] };
  for (let i = 0; i < 20000; i++) {
    const outcome = spin(random, 'sniper');
    counts.set(outcome.kind, (counts.get(outcome.kind) || 0) + 1);
    if (money[outcome.kind]) {
      ok(outcome.coins >= money[outcome.kind][0] && outcome.coins <= money[outcome.kind][1], outcome.kind + ' ' + outcome.coins);
    }
  }
  eq([...counts.keys()].sort(), ['bag', 'chest', 'handful', 'particle'], 'только монеты и частица');
  eq(OUTCOMES.reduce((sum, item) => sum + item.chance, 0).toFixed(6), '1.000000');
  for (const item of OUTCOMES) {
    const share = (counts.get(item.id) || 0) / 20000;
    ok(Math.abs(share - item.chance) < 0.005 + item.chance * 0.15, item.id + ' ' + share);
  }
  no(OUTCOMES.some((item) => item.id === 'void'), 'пустоты нет');
  const color = (id) => OUTCOMES.find((item) => item.id === id).color;
  eq([color('handful'), color('bag'), color('chest'), color('particle')], ['#ffffff', '#60a5fa', '#facc15', '#ff2e4d']);
  eq([chanceOf('bag'), chanceOf('chest'), chanceOf('particle')], [0.1, 0.03, 0.005]);
});

const chanceOf = (id) => OUTCOMES.find((item) => item.id === id).chance;

test('оружие: у всех с начала белое; 10 улучшений — следующая редкость и снова +0, мощь +1 на белом … +6 на оранжевом', () => {
  eq(RARITIES.map((rarity) => [rarity.id, rarity.gain]), [['plain', 1], ['common', 2], ['rare', 3], ['mythic', 4],
    ['epic', 5], ['legendary', 6]]);
  eq(TIER_STEPS, 10);
  const weapon = makeWeapon(seeded(4), 'frost');
  eq([weapon.rarity, weapon.power, weapon.plus], ['plain', 0, 0], 'белое, без мощи');
  eq(weaponPower(weapon), 0);
  eq(weaponPower(null), 0);
  let power = 0;
  for (const rarity of RARITIES.slice(0, -1)) {
    for (let k = 0; k < TIER_STEPS; k++) {
      eq(weapon.rarity, rarity.id);
      const up = upgrade(weapon, seeded(k + 1));
      eq(up.amount, rarity.gain);
      power += rarity.gain;
    }
  }
  eq([weapon.rarity, weapon.power, weapon.plus], ['legendary', power, 0], 'оранжевое после 50 улучшений, счёт с нуля');
  eq(weaponTitle(weapon), 'Оружие');
  upgrade(weapon);
  eq(weaponTitle(weapon), 'Оружие +1');
  ok(boonOf(weapon.boon), 'оранжевое даёт свойство');
  eq(makeWeapon(seeded(1), 'frost', RARITIES[3]).power, 10 + 20 + 30, 'готовое фиолетовое — как после 30 улучшений');
});

test('оружие: красное — после 30 улучшений оранжевого, дальше +10 мощи без конца; свойство на красном ×1,5', () => {
  const weapon = makeWeapon(seeded(4), 'sniper', RARITIES[RARITIES.length - 1]), start = weapon.power, boon = weapon.boon;
  eq(ASCEND_AT, 30);
  for (let i = 1; i < ASCEND_AT; i++) {
    const up = upgrade(weapon);
    no(up.ascended);
    eq(up.amount, 6);
  }
  const last = upgrade(weapon);
  ok(last.ascended, 'десятое улучшение оранжевого');
  eq([weapon.rarity, weapon.boon], [DIVINE.id, boon], 'свойство осталось');
  eq(weapon.power, start + ASCEND_AT * 6);
  const before = weapon.power;
  for (let i = 0; i < 500; i++) eq(upgrade(weapon).amount, 10);
  eq(weapon.power, before + 5000, 'растёт без предела');
  const mods = boonMods(weapon), plain = boonOf(boon).mods, key = Object.keys(plain)[0];
  ok(Math.abs(mods[key] - plain[key] * 1.5) < 1e-9, 'на красном свойство сильнее в полтора раза');
  const orange = makeWeapon(seeded(4), 'sniper', RARITIES[RARITIES.length - 1]);
  eq(boonMods(orange), boonOf(orange.boon).mods, 'на оранжевом — как есть');
  eq(boonMods(makeWeapon(seeded(4), 'sniper')), null, 'у остальных свойства нет');
});

test('свойство оранжевого: одно из пяти, случайное', () => {
  const random = seeded(9), seen = new Set();
  eq(BOONS.map((boon) => boon.id), ['rapid', 'long', 'keen', 'swift', 'rich']);
  for (const boon of BOONS) ok(boon.name && boon.text && Object.keys(boon.mods).length === 1, boon.id);
  for (let i = 0; i < 400; i++) seen.add(makeWeapon(random, 'sniper', RARITIES[RARITIES.length - 1]).boon);
  eq(seen.size, BOONS.length, 'выпадают все пять');
  for (const rarity of RARITIES.slice(0, -1)) no(makeWeapon(random, 'sniper', rarity).boon, rarity.id);
});

test('гача: частица бога — 0,5%, у кого она есть, тому не выпадает', () => {
  const particle = OUTCOMES.find((outcome) => outcome.id === 'particle');
  eq(particle.chance, 0.005);
  const total = OUTCOMES.reduce((sum, item) => sum + item.chance, 0);
  let seen = 0;
  for (let i = 0; i < 2000; i++) {
    const before = OUTCOMES.slice(0, OUTCOMES.indexOf(particle)).reduce((sum, item) => sum + item.chance, 0);
    const at = (before + particle.chance * (i + 0.5) / 2000) / total;
    if (spin(() => at, 'sniper').kind === 'particle') seen += 1;
    no(spin(() => at, 'sniper', { particle: true }).kind === 'particle', 'уже есть — не выпадает');
  }
  eq(seen, 2000);
});

test('гача: камень класса 30%, первый после стиля 20%, следующие 10% — вместо части горстки, только тому, кому положен', () => {
  eq([STONE_CHANCE.first, STONE_CHANCE.second, STONE_CHANCE.next], [0.3, 0.2, 0.1]);
  eq(OUTCOMES.find((outcome) => outcome.id === 'stone').color, '#ff2e4d', 'цвет — божественный');
  eq(OUTCOMES.find((outcome) => outcome.id === 'stone').chance, 0, 'в общей таблице камня нет');
  const random = seeded(5), counts = new Map();
  for (let i = 0; i < 20000; i++) {
    const kind = spin(random, 'sniper', { stone: 0.3 }).kind;
    counts.set(kind, (counts.get(kind) || 0) + 1);
  }
  const share = (id) => (counts.get(id) || 0) / 20000;
  ok(Math.abs(share('stone') - 0.3) < 0.015, 'камень 30%: ' + share('stone'));
  ok(Math.abs(share('handful') - (chanceOf('handful') - 0.3)) < 0.015, 'забран у горстки: ' + share('handful'));
  for (const id of ['bag', 'chest']) ok(Math.abs(share(id) - chanceOf(id)) < 0.01, id + ' не изменился: ' + share(id));
  const first = spin(() => 0.99, 'sniper', { stone: 0.3, first: true });
  eq([first.kind, first.first], ['stone', true], 'первый камень — камень класса');
  eq(OUTCOMES.find((outcome) => outcome.id === 'stone').first, 'Камень класса');
  no(spin(() => 0.99, 'sniper').kind === 'stone', 'не положен — не выпадает');
});

test('камни навыков: первый — с 1 уровня, дальше на 10, 20, 30, 50, 75 и 100', () => {
  eq(STONES, [1, 10, 20, 30, 50, 75, 100]);
  eq([1, 9, 10, 19, 20, 29, 30, 50, 74, 75, 99, 100].map(stonesAt), [1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6, 7]);
});

test('маг огня: первый камень — только стиль; дальше — усиления своего стиля и способности; скин по стилю', () => {
  eq(choiceOf('pyro', []).map((option) => option.skill.id), ['fireball', 'dragon', 'ignite']);
  const after = choiceOf('pyro', ['dragon']);
  eq(after.map((option) => option.skill.id),
    ['wide', 'lungs', 'flight', 'beam', 'smolder', 'fireReact', 'torch', 'blue'], 'чужих усилений нет');
  ok(after.every((option) => option.state === 'open'));
  eq(choiceOf('pyro', ['ignite', 'torch']).map((option) => [option.skill.id, option.state]),
    [['flameRing', 'open'], ['fireWall', 'open'], ['amaterasu', 'open'], ['phoenix', 'open'], ['smolder', 'open'],
      ['fireReact', 'open'], ['torch', 'taken'], ['blue', 'open']]);
  eq([skinOf('pyro', []), skinOf('pyro', ['dragon']), skinOf('pyro', ['fireball', 'blue']),
    skinOf('pyro', ['twin', 'fireball', 'blue'])], ['pyro-ragged', 'pyro-dragon', 'pyro-fireball-blue',
    'pyro-fireball-twin-blue'], 'двойной каст — второй шар во второй руке');
  eq([skinOf('earth', []), skinOf('earth', ['keeper']), skinOf('earth', ['serpent', 'solid'])],
    ['earth-ragged', 'earth-keeper', 'earth-serpent']);
  eq(styleOf('pyro', ['twin', 'fireball']).name, 'Огненный шар');
  for (const option of choiceOf('pyro', [])) ok(option.skill.text.length < 140, 'коротко: ' + option.skill.name);
});

test('настройки: по умолчанию, границы, адрес туда и обратно', () => {
  eq(clean({}), DEFAULTS);
  eq(clean({ lobby: 5, first_wave: 9999, wave_pause: 'abc' }).lobby, 10);
  eq(clean({ first_wave: 9999 }).first_wave, 600);
  eq(clean({ wave_pause: 'abc' }).wave_pause, 20);
  eq(clean({ channel: 'https://www.twitch.tv/Some_One/' }).channel, 'some_one');
  const s = clean({ channel: 'someone', lobby: 60, webcam: 'vtuber', chat: false });
  eq(toQuery(s), 'channel=someone&lobby=60&webcam=vtuber');
  eq(fromQuery('?' + toQuery(s)), s);
});

test('карта: одна–три вышки у самой дороги, далеко друг от друга', () => {
  const counts = new Set();
  for (let seed = 1; seed <= 30; seed++) {
    const { path, branch, tiles } = makeMap(seeded(seed)), road = new Set(path.concat(branch).map(key));
    const watches = [];
    tiles.forEach((tile, at) => {
      if (tile === 'watch') watches.push([at % SIZE, Math.floor(at / SIZE)]);
    });
    ok(watches.length >= 1 && watches.length <= 3, 'вышек: ' + watches.length);
    counts.add(watches.length);
    for (const [x, y] of watches) {
      no(road.has(key([x, y])), 'не на дороге');
      ok([-1, 0, 1].some((dx) => [-1, 0, 1].some((dy) => road.has(key([x + dx, y + dy])))), 'у дороги');
    }
    watches.forEach(([x, y], i) => watches.slice(i + 1).forEach(([u, v]) => {
      ok(Math.max(Math.abs(x - u), Math.abs(y - v)) > 3, 'не рядом');
    }));
  }
  ok(counts.size >= 2, 'число вышек разное');
});

test('карта: река течёт от края до края, дорогу пересекает только мостом поперёк прямого участка', () => {
  let seen = 0;
  for (let seed = 1; seed <= 80; seed++) {
    const { path, branch, tiles, rivers } = makeMap(seeded(seed)), road = new Set(path.concat(branch).map(key));
    for (const river of rivers) {
      seen += 1;
      ok(river.length >= 10 && edge(river[0]) && edge(river[river.length - 1]), 'от края до края');
      river.forEach((cell, i) => {
        if (i) ok(touching(cell, river[i - 1]), 'река непрерывна');
        const tile = tiles[key(cell)];
        if (road.has(key(cell))) {
          eq(tile, 'bridge', 'на дороге — мост');
          const [a, b] = [river[i - 1], river[i + 1]];
          ok(a && b && !road.has(key(a)) && !road.has(key(b)) && a[0] - cell[0] === cell[0] - b[0]
            && a[1] - cell[1] === cell[1] - b[1], 'мост поперёк, река прямо под ним');
        } else ok(['river', 'lake'].includes(tile), 'вода: ' + tile);
      });
    }
    tiles.forEach((tile, at) => {
      if (tile === 'bridge') ok(road.has(at), 'мост — только на дороге');
    });
  }
  ok(seen >= 15, 'реки бывают часто: ' + seen);
});

test('статистика: отметка о запуске — только с каналом и только с сайта gamesonstream.ru', () => {
  eq(playNote('chatoborona', { channel: '', webcam: 'cam' }, false), null);
  eq(playNote('chatoborona', { channel: 'some_one', webcam: 'vtuber' }, true),
    { game: 'chatoborona', channel: 'some_one', mode: 'vtuber', place: 'browser' });
  eq(playNote('chatoborona', { channel: 'some_one', webcam: 'none' }, false).place, 'obs');
  eq([reportPlay({ game: 'x' }, '127.0.0.1'), reportPlay({ game: 'x' }, 'sumaizu.github.io'), reportPlay(null, 'gamesonstream.ru')],
    [false, false, false]);
});
