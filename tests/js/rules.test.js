import { test, eq, ok, no } from './harness.js';
import { seeded } from './fixtures.js';
import { BIOMES, SIZE, cellName, coverage, makeMap, parseCell } from '../../site/js/field.js';
import { LEVEL_MAX, MOBS, STAT, crowdFactor, eliteCount, levelOf, waveHp, waveReward, waveSpawns, xpForLevel }
  from '../../site/js/balance.js';
import { CLASSES, CLASS_BY_ID, MARKS, PERKS, PRIMARY, describe, gradeOf, masteryOf, plainText, scaled }
  from '../../site/js/classes.js';
import { ASCEND_AT, DIVINE, OUTCOMES, RARITIES, STATS, makeWeapon, rankOf, spin, upgrade, weaponScore, weaponStats,
  weaponTitle } from '../../site/js/gacha.js';
import { clean, fromQuery, toQuery, DEFAULTS } from '../../site/js/config.js';

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
    ok(hills.length >= 3 && hills.length <= 12, 'холмы — группами: ' + hills.length);
    ok(hills.some((at) => path.concat(branch).some(([x, y]) => Math.abs(x - at % SIZE) <= 1
      && Math.abs(y - Math.floor(at / SIZE)) <= 1)), 'холм у дороги');
    ok(tiles.includes('lake') && tiles.includes('mountain'));
  }
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
  ok(waveHp(10, 'boss', 1) > waveHp(10, 'elite', 1));
});

test('классы: пятнадцать, у каждого оружие, статы, три способности на 10, 30 и 50 уровне и две руны', () => {
  eq(CLASSES.length, 15);
  eq(new Set(CLASSES.map((c) => c.id)).size, 15);
  eq(PERKS, [10, 30, 50]);
  const runes = CLASSES.flatMap((cls) => cls.runes.map((rune) => rune.id));
  eq(new Set(runes).size, CLASSES.length * 2, 'руны не повторяются');
  for (const cls of CLASSES) {
    ok(cls.weapon && cls.name && PRIMARY[cls.primary], cls.id);
    for (const stat of ['str', 'agi', 'int']) ok(STAT.grades[cls.stats[stat]], cls.id + ' ' + stat);
    eq(cls.skills.length, 3, cls.id);
    eq(cls.runes.length, 2, cls.id);
    ok(cls.earn.xp > 0 && cls.earn.coins > 0, cls.id);
    const info = describe(cls.id, 30);
    ok(info.main && !/undefined|NaN/.test(info.main), cls.id);
    eq(info.perks.map((perk) => perk.open), [true, true, false], cls.id);
    for (const perk of info.perks) ok(perk.text && !/undefined|NaN/.test(perk.text), cls.id + ' ' + perk.name);
  }
  for (const id of ['banner', 'healer', 'sage']) ok(CLASSES.some((cls) => cls.id === id), 'поддержка вернулась: ' + id);
});

test('классы: у чисел, которые растут от статов, стоит метка значка — урон, способности, мастерство', () => {
  const sniper = describe('sniper', 50), charged = sniper.perks[1].text, aim = sniper.perks[2].text;
  ok(/×\d+(,\d)?\{hit\}/.test(sniper.main), 'обычный урон — от силы: ' + sniper.main);
  ok(/шансом \d+%\{mas\}/.test(charged), 'шанс — от мастерства: ' + charged);
  ok(/×6\{dmg\}/.test(charged), 'урон способности — от основного стата и мастерства: ' + charged);
  ok(/раз в [\d,]+ с\{mas\}/.test(aim), 'перезарядка — от мастерства: ' + aim);
  ok(describe('frost', 1).main.includes('{int}'), 'буря шире от интеллекта');
  ok(describe('banner', 10).perks[0].text.includes('{dmg}'), 'сила клича — от силы и мастерства');
  const pierce = describe('sniper', 10).perks[0].text;
  eq(plainText(charged).match(MARKS), null, 'без меток — чистый текст');
  for (const cls of CLASSES) {
    const info = describe(cls.id, 50);
    for (const text of [info.main].concat(info.perks.map((perk) => perk.text))) {
      eq((text.match(/\{/g) || []).length, (text.match(new RegExp(MARKS.source, 'g')) || []).length, cls.id);
    }
  }
  ok(pierce.includes('{mas}'));
});

test('классы: мастерство у всех низкое, усиливает способности с убывающей отдачей, шанс никогда не 100%', () => {
  for (const cls of CLASSES) eq(gradeOf(cls, 'mas'), STAT.mastery, cls.id);
  const strong = masteryOf(20), weak = masteryOf(STAT.mastery), aim = CLASS_BY_ID.get('sniper').skills[2];
  ok(scaled(aim, strong).markTime > scaled(aim, weak).markTime, 'дольше');
  eq(scaled(aim, strong).bonus, scaled(aim, weak).bonus, 'урон способности растёт от основного стата, а не здесь');
  ok(scaled(aim, strong).every < scaled(aim, weak).every, 'чаще');
  for (const id of ['parasite', 'miner']) {
    const skill = CLASS_BY_ID.get(id).skills[2];
    eq(scaled(skill, strong), scaled(skill, weak), id);
  }
  const huge = masteryOf(1e6);
  ok(huge.power < 1 + STAT.masteryMax + 1e-9 && huge.haste < 1 + STAT.masteryMax + 1e-9,
    'отдача от мастерства убывает');
  for (const cls of CLASSES) {
    for (const skill of cls.skills) {
      for (const [key, how] of Object.entries(skill.scale || {})) {
        if (how === 'luck') ok(scaled(skill, masteryOf(500))[key] < 1, cls.id + ' ' + skill.name + ': шанс не 100%');
      }
    }
  }
  eq(new Set(CLASSES.map((cls) => cls.primary)), new Set(['str', 'agi', 'int']));
});

test('гача: пустота, монеты (горстка 50%, мешок 45%, сундук 5% от 15%), остальное — оружие по редкостям', () => {
  const random = seeded(11), counts = new Map(), money = { handful: [1, 50], bag: [51, 150], chest: [151, 500] };
  for (let i = 0; i < 20000; i++) {
    const outcome = spin(random, 'sniper'), key = outcome.kind === 'weapon' ? outcome.weapon.rarity : outcome.kind;
    counts.set(key, (counts.get(key) || 0) + 1);
    if (money[key]) ok(outcome.coins >= money[key][0] && outcome.coins <= money[key][1], key + ' ' + outcome.coins);
  }
  const chance = (id) => OUTCOMES.find((outcome) => outcome.id === id).chance;
  ok(Math.abs(chance('handful') + chance('bag') + chance('chest') - 0.15) < 1e-9, 'монеты вместе — 15%');
  eq([chance('handful') / 0.15, chance('bag') / 0.15, chance('chest') / 0.15].map((v) => v.toFixed(3)),
    ['0.500', '0.450', '0.050']);
  const all = OUTCOMES.concat(RARITIES);
  eq(all.map((r) => r.chance).reduce((a, b) => a + b, 0).toFixed(6), '1.000000');
  for (const item of all) {
    const share = (counts.get(item.id) || 0) / 20000;
    ok(Math.abs(share - item.chance) < 0.005 + item.chance * 0.15, item.id + ' ' + share);
  }
  no(counts.has('poor'), 'плохого оружия больше нет');
});

test('гача: обычное — плюс и минус, дальше только плюсы и всё больше; прибавки — к четырём статам', () => {
  const random = seeded(4), scores = [], ids = STATS.map((stat) => stat.id);
  eq(ids, ['str', 'agi', 'int', 'mas']);
  for (const rarity of RARITIES) {
    let sum = 0;
    for (let i = 0; i < 300; i++) {
      const weapon = makeWeapon(random, 'frost', rarity), values = Object.entries(weapon.stats);
      eq(weapon.rarity, rarity.id);
      for (const [stat] of values) ok(ids.includes(stat), stat);
      eq(values.filter(([, v]) => v > 0).length, Math.min(rarity.good, ids.length), rarity.id);
      eq(values.filter(([, v]) => v < 0).length, rarity.bad, rarity.id);
      no('unique' in weapon, 'особых свойств больше нет');
      sum += weaponScore(weapon);
    }
    scores.push(sum / 300);
  }
  for (let i = 1; i < scores.length; i++) ok(scores[i] > scores[i - 1], RARITIES[i].id + ' лучше предыдущего');
  const legendary = RARITIES.find((rarity) => rarity.id === 'legendary');
  eq(legendary.chance, 0.06, 'легендарное — вдвое чаще прежнего');
});

test('улучшение: легендарное на +30 становится божественным, дальше по 5% от сложенных свойств', () => {
  const weapon = makeWeapon(seeded(4), 'sniper', RARITIES[RARITIES.length - 1]), random = seeded(5);
  for (let i = 1; i < ASCEND_AT; i++) {
    no(upgrade(random, weapon).ascended);
    eq(weapon.plus, i);
  }
  eq(weaponTitle(weapon), 'Легендарный карабин +29');
  const total = weaponStats(weapon), last = upgrade(random, weapon);
  ok(last.ascended, 'тридцатое улучшение');
  eq(weapon.rarity, DIVINE.id);
  eq(weapon.plus, 0, 'счёт улучшений сначала');
  eq(weapon.ups, {}, 'прибавки перешли в основные свойства');
  total[last.id] += last.amount;
  for (const [id, value] of Object.entries(total)) ok(Math.abs(weapon.stats[id] - value) < 1e-6, id);
  ok(rankOf(weapon) > rankOf({ rarity: 'legendary' }), 'выше легендарного');
  const next = upgrade(random, weapon);
  eq(weapon.plus, 1);
  ok(Math.abs(next.amount - weapon.stats[next.id] * 0.05) < 0.011, 'по 5%: ' + next.amount);
  eq(weaponTitle(weapon), 'Божественный карабин +1');
});

test('гача: частица бога — 0,2%, у кого она есть, тому не выпадает', () => {
  const particle = OUTCOMES.find((outcome) => outcome.id === 'particle');
  eq(particle.chance, 0.002);
  const total = OUTCOMES.concat(RARITIES).reduce((sum, item) => sum + item.chance, 0);
  let seen = 0;
  for (let i = 0; i < 2000; i++) {
    const before = OUTCOMES.slice(0, OUTCOMES.indexOf(particle)).reduce((sum, item) => sum + item.chance, 0);
    const at = (before + particle.chance * (i + 0.5) / 2000) / total;
    if (spin(() => at, 'sniper').kind === 'particle') seen += 1;
    no(spin(() => at, 'sniper', { particle: true }).kind === 'particle', 'уже есть — не выпадает');
  }
  eq(seen, 2000);
});

test('гача: руна способности — 0,8%, у кого обе руны класса, тому не выпадает', () => {
  const rune = OUTCOMES.find((outcome) => outcome.id === 'rune');
  eq(rune.chance, 0.008);
  const total = OUTCOMES.concat(RARITIES).reduce((sum, item) => sum + item.chance, 0);
  const before = OUTCOMES.slice(0, OUTCOMES.indexOf(rune)).reduce((sum, item) => sum + item.chance, 0);
  for (let i = 0; i < 500; i++) {
    const at = (before + rune.chance * (i + 0.5) / 500) / total;
    eq(spin(() => at, 'sniper').kind, 'rune');
    eq(spin(() => at, 'sniper', { runes: 1 }).kind, 'rune', 'одна есть — вторая выпадает');
    no(spin(() => at, 'sniper', { runes: 2 }).kind === 'rune', 'обе есть — не выпадает');
  }
});

test('улучшение: +20% от начального значения случайного свойства, бесконечно', () => {
  const weapon = makeWeapon(seeded(2), 'sniper', RARITIES[2]), before = Object.assign({}, weapon.stats);
  for (let i = 0; i < 10; i++) {
    const up = upgrade(seeded(i + 1), weapon);
    ok(up.id in before);
    ok(Math.abs(up.amount - Math.max(0.01, Math.round(Math.abs(before[up.id]) * 0.2 * 100) / 100)) < 0.051);
  }
  eq(weapon.stats, before, 'начальные свойства не меняются');
  const total = weaponStats(weapon);
  ok(Object.keys(before).some((id) => total[id] > before[id]), 'прибавки складываются');
});

test('настройки: по умолчанию, границы, адрес туда и обратно', () => {
  eq(clean({}), DEFAULTS);
  eq(clean({ lobby: 5, first_wave: 9999, wave_pause: 'abc' }).lobby, 10);
  eq(clean({ first_wave: 9999 }).first_wave, 600);
  eq(clean({ wave_pause: 'abc' }).wave_pause, 20);
  eq(clean({ channel: 'https://www.twitch.tv/Some_One/' }).channel, 'some_one');
  const s = clean({ channel: 'someone', lobby: 60, chat: false });
  eq(toQuery(s), 'channel=someone&lobby=60&chat=0');
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
