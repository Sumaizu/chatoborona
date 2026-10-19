import { test, eq, ok, no } from './harness.js';
import { seeded } from './fixtures.js';
import { BIOMES, SIZE, cellName, coverage, makeMap, parseCell } from '../../site/js/field.js';
import { LEVEL_MAX, MOBS, crowdFactor, eliteCount, levelOf, waveHp, waveReward, waveSpawns, xpForLevel }
  from '../../site/js/balance.js';
import { CLASSES, PERKS, ROLES } from '../../site/js/classes.js';
import { ASCEND_AT, DIVINE, OUTCOMES, RARITIES, UNIQUES, makeWeapon, rankOf, spin, uniqueFor, uniqueText, upgrade,
  uniquesFor, weaponScore, weaponStats, weaponTitle }
  from '../../site/js/gacha.js';
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

test('классы: приёмы открываются на своих уровнях', () => {
  eq(CLASSES.length, 15);
  eq(new Set(CLASSES.map((c) => c.id)).size, 15);
  const sniper = CLASSES.find((c) => c.id === 'sniper');
  eq(sniper.params(PERKS[0] - 1, 0).crit, 0);
  ok(sniper.params(PERKS[0], 1).crit > 0);
  eq(sniper.params(PERKS[1] - 1, 4).mark, 0);
  ok(sniper.params(PERKS[1], 5).mark > 0);
  ok(sniper.params(100, 10).range > sniper.params(1, 0).range);
  for (const cls of CLASSES) {
    const p = cls.params(100, 10);
    ok(p.interval > 0 && p.damage > 0, cls.id);
  }
});

test('классы: у каждого роль, контроль и поддержка бьют слабее бойцов', () => {
  const dps = (cls) => {
    const p = cls.params(1, 0);
    return p.damage / p.interval + p.damage * (p.cone ? p.burn : 0) + p.damage * (p.poison || 0);
  };
  const shooters = CLASSES.filter((cls) => cls.role === 'damage' && !cls.params(1, 0).passive);
  const weakest = Math.min(...shooters.filter((cls) => !cls.rider).map(dps));
  for (const cls of CLASSES) {
    ok(ROLES[cls.role], cls.id);
    if (cls.role !== 'damage') ok(dps(cls) < weakest, cls.id + ' слабее любого бойца');
  }
  eq(new Set(CLASSES.map((cls) => cls.role)).size, 3);
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

test('гача: обычное — плюс и минус, дальше только плюсы и всё больше; свойства — под класс', () => {
  const random = seeded(4), scores = [];
  for (const rarity of RARITIES) {
    let sum = 0;
    for (let i = 0; i < 300; i++) {
      const weapon = makeWeapon(random, 'frost', rarity), values = Object.entries(weapon.stats);
      const gear = CLASSES.find((c) => c.id === 'frost').gear;
      eq(weapon.rarity, rarity.id);
      for (const [stat] of values) ok(gear.includes(stat), stat);
      eq(values.filter(([, v]) => v > 0).length, Math.min(rarity.good, gear.length), rarity.id);
      eq(values.filter(([, v]) => v < 0).length, rarity.bad, rarity.id);
      for (const [stat, value] of values) if (stat === 'crit') ok(value > 0, 'крит не бывает минусом');
      eq(Boolean(weapon.unique), Boolean(rarity.unique), rarity.id);
      if (weapon.unique) ok(UNIQUES.some((u) => u.id === weapon.unique));
      sum += weaponScore(weapon);
    }
    scores.push(sum / 300);
  }
  for (let i = 1; i < scores.length; i++) ok(scores[i] > scores[i - 1], RARITIES[i].id + ' лучше предыдущего');
  for (let i = 0; i < 200; i++) {
    const banner = makeWeapon(random, 'banner', RARITIES[3]);
    no('damage' in banner.stats || 'crit' in banner.stats, 'знаменосцу урон и крит не выпадают');
  }
});

test('гача: легендарные свойства — общие и под свой класс, чужие не выпадают', () => {
  const random = seeded(9), seen = new Set();
  for (let i = 0; i < 600; i++) seen.add(makeWeapon(random, 'miner', RARITIES[RARITIES.length - 1]).unique);
  ok(seen.has('depot'), 'своё для минёра');
  ok(seen.has('midas'), 'общее');
  no(seen.has('twin') || seen.has('ignite'), 'ни чужого, ни ударного у того, кто не стреляет');
  const pools = uniquesFor('sniper');
  ok(pools.own.some((u) => u.id === 'twin') && pools.own.some((u) => u.id === 'fury'), 'снайперу — своё и урон');
  ok(pools.general.some((u) => u.id === 'ignite'), 'стрелку — ударные');
});

test('гача: у каждого класса от трёх своих легендарных свойств, у каждой роли — от двух общих', () => {
  eq(new Set(UNIQUES.map((u) => u.id)).size, UNIQUES.length, 'имена не повторяются');
  for (const cls of CLASSES) ok(UNIQUES.filter((u) => u.cls === cls.id).length >= 3, cls.id);
  for (const role of Object.keys(ROLES)) ok(UNIQUES.filter((u) => u.role === role).length >= 2, role);
  ok(uniquesFor('frost').own.some((u) => u.id === 'fetters'), 'контролю — свои общие');
  ok(uniquesFor('healer').own.some((u) => u.id === 'ward'), 'поддержке — свои');
  no(uniquesFor('sniper').own.some((u) => u.role === 'support'), 'чужая роль не выпадает');
  no(uniquesFor('miner').own.some((u) => u.id === 'keen'), 'крит не выпадает тому, кто не бьёт');
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

test('божественное оружие усиливает особое свойство в полтора раза, где это возможно', () => {
  eq(uniqueFor('fury', true).mul.damage, 1.6);
  eq(uniqueText(uniqueFor('fury', true)), '+60% урона');
  eq(uniqueText(uniqueFor('fury')), '+40% урона');
  ok(Math.abs(1 / uniqueFor('frenzy', true).mul.interval - 1.9) < 1e-5, 'кусает на 90% чаще');
  eq(uniqueText(uniqueFor('frenzy', true)), 'кусает на 90% чаще');
  ok(Math.abs(uniqueFor('stormcaller', true).set.stormEvery - 3.5 / 1.5) < 1e-5, 'гроза чаще');
  eq(uniqueFor('ignite', true).values, { dps: 0.45, time: 3 });
  eq(uniqueFor('bore', true).set, { pierce: 1 }, 'сквозную пулю усиливать некуда');
  eq(uniqueText(uniqueFor('twin', true)), 'стреляет сразу в двух мобов');
  eq(uniqueText(uniqueFor('reach', true)), '+1,5 клетки к радиусу атаки и аур');
  for (const u of UNIQUES) ok(!/[{}]/.test(uniqueText(uniqueFor(u.id, true))), u.id);
});

test('гача: частица бога — 0,1%, у кого она есть, тому не выпадает', () => {
  const particle = OUTCOMES.find((outcome) => outcome.id === 'particle');
  eq(particle.chance, 0.001);
  const total = OUTCOMES.concat(RARITIES).reduce((sum, item) => sum + item.chance, 0);
  let seen = 0;
  for (let i = 0; i < 2000; i++) {
    const before = OUTCOMES.slice(0, OUTCOMES.indexOf(particle)).reduce((sum, item) => sum + item.chance, 0);
    const at = (before + particle.chance * (i + 0.5) / 2000) / total;
    if (spin(() => at, 'sniper').kind === 'particle') seen += 1;
    no(spin(() => at, 'sniper', true).kind === 'particle', 'уже есть — не выпадает');
  }
  eq(seen, 2000);
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
