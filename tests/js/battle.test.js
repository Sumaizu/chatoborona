import { test, eq, ok, no } from './harness.js';
import { STRAIGHT, makeBattle, player, runFor, seeded } from './fixtures.js';
import { BITE_TIME, BURST, Battle, CRIMSON, DISCHARGE, FUSION, HEADWIND, MOVE_PAUSE, NUKE_FLIGHT, OVERTIME, PLAGUE,
  PLANTED, ROT, SECOND, SPLIT_TIME, THORN } from '../../site/js/battle.js';
import { SIZE } from '../../site/js/field.js';
import { AFFIXES, BOSSES, ELITES, FAMILIES, FAMILY_BY_ID, LIVES, LOOKS, MIMIC, MOBS, POWERS, SILVER, STAT, TERRAIN,
  TICK, TOWER, familyPool, resistOf, silverChance, waveSpawns, xpForLevel } from '../../site/js/balance.js';
import { ASSIST_COINS, KILL_COINS } from '../../site/js/gacha.js';
import { CLASSES, CLASS_BY_ID, RUNE_CAPS } from '../../site/js/classes.js';

const ATTACK = (battle, t, target) => {
  battle.time = Math.max(battle.time, t.leapUntil);
  t.host = target;
  battle._fire(t, battle.time);
};
const leakOf = (wave) => waveSpawns(wave).reduce((sum, s) => sum + MOBS[s.type].leak, 0);
const near = (actual, expected, note = '') => ok(Math.abs(actual - expected) < 1e-6 * Math.max(1, Math.abs(expected)),
  (note ? note + ': ' : '') + actual + ' вместо ' + expected);
const hit = (mob) => mob.max - mob.hp;
const still = (...mobs) => mobs.forEach((mob) => {
  mob.speed = 0;
});
const level = (n) => player(xpForLevel(n));

function finish(battle, limit = 600) {
  for (let i = 0; i < limit / TICK && !battle.cleared; i++) battle.step(TICK);
}

test('бой: мобы без защиты доходят до базы и отнимают жизни', () => {
  const battle = makeBattle();
  battle.startWave(1, 1);
  finish(battle);
  ok(battle.cleared);
  eq(battle.lives, LIVES - leakOf(1));
  eq(battle.leaked, leakOf(1));
});

test('бой: дорогу и чужую клетку занять нельзя', () => {
  const battle = makeBattle();
  no(battle.place(player(), 'gunner', 3, 5), 'дорога');
  ok(battle.place(player(), 'gunner', 3, 4));
  no(battle.place(player(), 'gunner', 3, 4), 'занято');
  no(battle.place(player(), 'gunner', 20, 4), 'за полем');
});

test('бой: защитник у дороги убивает, получает опыт, монеты и убийства', () => {
  const battle = makeBattle(), hero = level(40), earn = CLASS_BY_ID.get('gunner').earn;
  battle.place(hero, 'gunner', 2, 4);
  battle.startWave(1, 1);
  finish(battle);
  eq(battle.lives, LIVES);
  const count = waveSpawns(1).length;
  eq(hero.kills, count);
  ok(hero.xp >= xpForLevel(40) + count);
  near(hero.coins, KILL_COINS * MOBS.normal.coins * earn.coins * count);
});

test('бой: опыт и монеты за помощь, убийство — добившему', () => {
  const battle = makeBattle(), a = level(20), b = level(20), earn = CLASS_BY_ID.get('gunner').earn;
  const ta = battle.place(a, 'gunner', 2, 4), tb = battle.place(b, 'gunner', 2, 6);
  battle.startWave(1, 2);
  finish(battle);
  const count = waveSpawns(1).length;
  eq(a.kills + b.kills, count);
  eq(a.kills + a.assists, count);
  eq(b.kills + b.assists, count);
  near(a.coins, (a.kills * KILL_COINS + a.assists * ASSIST_COINS) * MOBS.normal.coins * earn.coins);
  eq(ta.run.kills, a.kills);
  eq(tb.run.assists, b.assists);
});

test('бой: у каждого класса свой множитель опыта и монет за моба — так классы получают поровну', () => {
  for (const cls of CLASSES) {
    const battle = makeBattle(), hero = player(), tower = battle.place(hero, cls.id, 2, 4);
    const mob = battle._spawn({ type: 'normal', hp: 10 }, 3);
    battle._hurt(mob, 1e6, tower, null);
    ok(mob.dead, cls.id);
    near(hero.xp, MOBS.normal.xp * cls.earn.xp, cls.id + ' опыт');
    near(hero.coins, KILL_COINS * MOBS.normal.coins * cls.earn.coins, cls.id + ' монеты');
  }
});

test('статы: от уровня не растут; сила — урон и сила крита, ловкость — скорость и шанс крита', () => {
  const battle = makeBattle(), cls = CLASS_BY_ID.get('gunner');
  const young = battle.place(player(), 'gunner', 2, 4), old = battle.place(level(100), 'gunner', 4, 4);
  eq([old.damage, old.interval, old.critChance, old.critMul], [young.damage, young.interval, young.critChance,
    young.critMul], 'уровень статы не меняет');
  eq(young.stats, { str: STAT.grades.low, agi: STAT.grades.high, int: STAT.grades.low, mas: STAT.mastery });
  near(young.damage, TOWER.damage * cls.base.damage * (1 + STAT.damage * STAT.grades.low));
  near(young.critChance, STAT.critChance * STAT.grades.high);
  near(young.critMul, STAT.critBase + STAT.critPower * STAT.grades.low);
  const strong = battle.place(player(), 'gunner', 6, 4);
  battle.setMods(strong, { stats: { str: 10, agi: 10 } });
  ok(strong.damage > young.damage && strong.critMul > young.critMul, 'сила');
  ok(strong.interval < young.interval && strong.critChance > young.critChance, 'ловкость');
});

test('статы: интеллект — стихии и радиус ауры, основной стат и мастерство — способности, парагон — +5% ко всем', () => {
  const battle = makeBattle(), mage = battle.place(level(30), 'frost', 2, 4), cls = CLASS_BY_ID.get('frost');
  const range = mage.range, damage = mage.damage, skill = mage.skill, slow = mage.s[0].slow, chance = mage.s[1].chance;
  near(damage, TOWER.damage * cls.base.damage * (1 + STAT.damage * STAT.grades.low)
    * (1 + STAT.element * STAT.grades.high), 'удар льдом — от силы и интеллекта');
  eq(cls.primary, 'int');
  battle.setMods(mage, { stats: { int: 10, mas: 10 } });
  near(mage.range, range + STAT.reach * 10, 'буря шире');
  ok(mage.damage > damage, 'лёд сильнее');
  ok(mage.skill > skill * (1 + STAT.skill * 10) / (1 + STAT.skill * STAT.grades.high) + 1e-9,
    'способности сильнее: и от интеллекта, и от мастерства');
  ok(mage.s[0].slow > slow && mage.s[1].chance > chance, 'замедление сильнее, шанс выше');
  const sniper = battle.place(player(), 'sniper', 4, 2), before = sniper.skill;
  battle.setMods(sniper, { stats: { int: 50 } });
  near(sniper.skill, before, 'у снайпера способности от силы, интеллект им не помогает');
  const hero = battle.place(player(), 'gunner', 6, 4);
  battle.setMods(hero, { paragon: 2 });
  eq(hero.stats, { str: STAT.grades.low * 1.1, agi: STAT.grades.high * 1.1, int: STAT.grades.low * 1.1,
    mas: STAT.mastery * 1.1 });
});

test('закалка: каждые 10 волн контроль и уязвимость действуют на мобов слабее, но не до нуля', () => {
  const effect = (wave) => {
    const battle = makeBattle(), t = battle.place(player(), 'gunner', 2, 4);
    battle.wave = wave;
    const mob = walker(battle, 6, 1e9);
    battle._hold(mob, 2, t);
    battle._slow(mob, 0.5, 2);
    mob.vuln = 0.5;
    mob.vulnUntil = 1e9;
    const hp = mob.hp;
    battle._hurt(mob, 100, t, null);
    battle._push(mob, 1, t);
    return { hold: mob.holdUntil - battle.time, slow: mob.slow, extra: hp - mob.hp - 100, push: mob.pushed };
  };
  const fresh = effect(9), hard = effect(50), harder = effect(300);
  near(fresh.hold, 2);
  near(fresh.slow, 0.5);
  near(fresh.extra, 50);
  near(fresh.push, 1);
  for (const key of ['hold', 'slow', 'extra', 'push']) ok(hard[key] < fresh[key] && harder[key] < hard[key], key);
  ok(harder.hold > 0 && harder.slow > 0, 'контроль всё равно действует');
  near(hard.hold / fresh.hold, 1 - resistOf(50));
});

test('бой: шаман не отбросит моба дальше предела, оглушение не чаще, чем позволяет передышка', () => {
  const battle = makeBattle(), shaman = battle.place(level(100), 'shaman', 10, 4);
  battle.startWave(1, 1);
  runFor(battle, 0.1);
  const mob = battle.mobs[0];
  mob.d = 10;
  for (let i = 0; i < 200; i++) battle._push(mob, 1, shaman);
  ok(mob.pushed <= 8 + 1e-9);
  ok(mob.d >= 2 - 1e-9);
  battle._hold(mob, 2, shaman);
  const first = mob.holdUntil;
  battle.time = first + 0.5;
  battle._hold(mob, 2, shaman);
  eq(mob.holdUntil, first, 'во время передышки');
  battle.time = first + 1.5;
  battle._hold(mob, 2, shaman);
  ok(mob.holdUntil > first, 'после передышки');
});

test('бой: после перехода на другую клетку защитник секунду не стреляет', () => {
  const battle = makeBattle(), hero = level(30), tower = battle.place(hero, 'gunner', 1, 4);
  no(battle.move(tower, 1, 5), 'на дорогу');
  ok(battle.move(tower, 4, 4));
  eq(battle.byCell.has(4 * 20 + 1), false);
  battle.startWave(1, 1);
  runFor(battle, MOVE_PAUSE - 0.1);
  eq(tower.run.damage, 0);
  runFor(battle, 8);
  ok(tower.run.damage > 0);
});

test('бой: прибавки событий меняют урон, дальность и скорость', () => {
  const battle = makeBattle(), tower = battle.place(player(), 'gunner', 2, 4);
  const damage = tower.damage, range = tower.range, interval = tower.interval;
  battle.setMods(tower, { damage: 1, rate: 1, range: 1, crit: 0, xp: 0, coins: 0 });
  eq(Math.round(tower.damage * 1000), Math.round(damage * 2000));
  eq(tower.range, range + 1);
  eq(Math.round(tower.interval * 1000), Math.round(interval * 500));
  battle.setMods(tower, { damage: -5, rate: 0, range: -9, crit: 0, xp: 0, coins: 0 });
  ok(tower.damage > 0 && tower.range >= 1);
});

test('бой: проклятие врагу делает мобов крепче', () => {
  const plain = makeBattle(), cursed = makeBattle();
  cursed.foe.hp = 0.2;
  plain.startWave(3, 5);
  cursed.startWave(3, 5);
  eq(Math.round(cursed.spawns[0].hp * 100), Math.round(plain.spawns[0].hp * 120));
});

test('бой: уровень растёт прямо в бою и открывает способности на 10, 30 и 50', () => {
  const battle = makeBattle(), hero = player(0);
  const tower = battle.place(hero, 'gunner', 2, 4);
  eq(tower.level, 1);
  hero.xp = xpForLevel(12);
  battle._grant(tower, 0);
  eq(tower.level, 12);
  ok(battle.events.some((e) => e.kind === 'level' && e.level === 12));
});

test('бой: каждый класс без ошибок отбивает волны, бьёт и получает опыт', () => {
  for (const cls of CLASSES) {
    const battle = makeBattle();
    const tower = battle.place(level(100), cls.id, 3, 4);
    battle.place(level(100), cls.id, 3, 6);
    battle.place(level(100), 'gunner', 4, 4);
    for (let wave = 1; wave <= 12; wave++) {
      battle.startWave(wave, 3);
      finish(battle);
      battle.endWave();
    }
    ok(tower.run.xp > 0, cls.id);
    ok(tower.run.damage > 0, cls.id);
  }
});

test('бой: с обеими рунами каждый класс без ошибок отбивает волны', () => {
  for (const cls of CLASSES) {
    const battle = makeBattle(), runes = cls.runes.map((rune) => rune.id);
    const tower = battle.place(level(100), cls.id, 3, 4);
    battle.setMods(tower, { runes });
    if (tower.cocoon) battle._hatch(tower);
    battle.place(level(100), 'gunner', 4, 4);
    for (let wave = 8; wave <= 11; wave++) {
      battle.startWave(wave, 2);
      finish(battle);
      battle.endWave();
    }
    eq(Array.from(tower.runes), runes, cls.id);
    ok(tower.run.damage > 0, cls.id);
  }
});

const special = (battle, type, id, hp = 1000) => {
  const kind = (type === 'boss' ? BOSSES : ELITES).find((k) => k.id === id);
  return battle._spawn({ type, hp, kind }, 5);
};
const put = (battle, mob, d) => {
  mob.d = d;
  battle._locate(mob);
  return mob;
};

test('мобы: элитные и боссы появляются с навыком и объявляются', () => {
  const battle = makeBattle();
  battle.startWave(10, 3);
  for (let i = 0; i < 2000 && battle.spawns.length; i++) battle.step(TICK);
  const boss = battle.mobs.find((m) => m.type === 'boss');
  ok(boss && boss.kind && boss.power, 'у босса есть вид и навык');
  ok(battle.events.some((e) => e.kind === 'arrive' && e.mob === boss));
  for (const kind of ELITES.concat(BOSSES)) ok(POWERS[kind.power], kind.id);
});

test('мобы: броня режет урон, щит не пускает урон совсем', () => {
  const battle = makeBattle(), t = battle.place(player(), 'gunner', 2, 4);
  const knight = special(battle, 'elite', 'knight');
  battle._hurt(knight, 100, t);
  eq(Math.round(knight.max - knight.hp), Math.round(100 * (1 - POWERS.armor.cut)));
  const warden = special(battle, 'boss', 'warden');
  warden.powerUntil = battle.time + 1;
  battle._hurt(warden, 100, t);
  eq(warden.hp, warden.max);
  warden.powerUntil = 0;
  battle._hurt(warden, 100, t);
  ok(warden.hp < warden.max);
});

test('мобы: король крыс зовёт крыс, чумной лечит соседей, мясник лечит себя', () => {
  const battle = makeBattle();
  battle.startWave(5, 3);
  battle.spawns = [];
  const king = special(battle, 'elite', 'ratking');
  runFor(battle, 2.2);
  const rats = battle.mobs.filter((m) => m.summoned);
  eq(rats.length, POWERS.brood.count);
  ok(rats.every((r) => r.d <= king.d));
  const plague = special(battle, 'elite', 'plague'), hurt = battle._spawn({ type: 'normal', hp: 100 }, plague.d);
  hurt.hp = 50;
  runFor(battle, 1);
  ok(hurt.hp > 51, 'сосед подлечился');
  const butcher = special(battle, 'boss', 'butcher');
  butcher.hp = 500;
  runFor(battle, 1);
  ok(butcher.hp > 505);
});

test('мобы: вожак делает рывок, костолом ускоряется от ран', () => {
  const battle = makeBattle();
  const leader = special(battle, 'elite', 'leader'), plain = battle._spawn({ type: 'elite', hp: 1000 }, 5);
  runFor(battle, 2.3);
  ok(leader.d - plain.d > 0.3, 'рывок');
  const crusher = special(battle, 'boss', 'crusher'), calm = special(battle, 'boss', 'crusher');
  crusher.hp = crusher.max * 0.2;
  runFor(battle, 1);
  ok(crusher.d > calm.d + 0.3, 'раненый бежит быстрее');
});

const walker = (battle, d, hp = 100, look = null) => battle._spawn({ type: look && look.flying ? 'swarm' : 'normal',
  hp, look }, d);
const bat = () => LOOKS.swarm.find((l) => l.id === 'bat');

test('бой: моб доходит до сердца, секунду грызёт его и только потом отнимает жизнь', () => {
  const battle = makeBattle(), mob = walker(battle, battle.length - 3);
  for (let i = 0; i < 200 && !mob.biting; i++) battle.step(TICK);
  ok(mob.biting, 'дошёл и грызёт');
  ok(mob.d < battle.length - 1, 'стоит перед сердцем, а не на нём');
  eq(battle.lives, LIVES);
  ok(battle.events.some((e) => e.kind === 'bite' && e.mob === mob));
  runFor(battle, BITE_TIME - 0.1);
  eq(battle.lives, LIVES, 'пока грызёт — жизни целы');
  runFor(battle, 0.2);
  eq(battle.lives, LIVES - 1);
  ok(mob.dead);
});

const ofFamily = (family, spawn) => spawn.kind === MIMIC || (spawn.kind
  ? family.elites.includes(spawn.kind.id) || family.bosses.includes(spawn.kind.id) : family.looks.includes(spawn.look.id));

function waveOf(familyId, wave, seed = 1) {
  const battle = makeBattle({ random: seeded(seed) });
  battle.nextFamily = FAMILY_BY_ID.get(familyId);
  battle.startWave(wave, 3);
  return battle;
}

test('мобы: новые виды появляются со своей волны, а пока их нет — первый вид той же роли; летучие летают', () => {
  for (const family of FAMILIES) {
    const wave = family.from || 1, battle = waveOf(family.id, wave);
    for (const s of battle.spawns.filter((spawn) => spawn.look)) {
      const own = LOOKS[s.type].filter((look) => family.looks.includes(look.id));
      const first = Math.min(...own.map((look) => look.from || 0));
      ok(!s.look.from || s.look.from <= wave || s.look.from === first, family.id + ': ' + s.look.id);
    }
  }
  const looks = new Set();
  for (const id of ['beasts', 'demons', 'undead']) {
    for (let wave = 21; wave <= 29; wave++) {
      for (let seed = 1; seed <= 2; seed++) for (const s of waveOf(id, wave, seed).spawns) if (s.look) looks.add(s.look.id);
    }
  }
  for (const id of ['crow', 'hellhound', 'demon', 'skeleton', 'imp', 'bat', 'bear', 'hand', 'devilkin']) {
    ok(looks.has(id), id);
  }
  const battle = makeBattle(), flyer = walker(battle, 2, 100, bat());
  ok(flyer.flying);
  eq(flyer.look, 'bat');
});

test('виды волн: в волне мобы одного вида — и обычные, и элитные, и босс', () => {
  for (const family of FAMILIES) {
    for (const wave of [Math.max(3, family.from || 1), 30, 70]) {
      for (let seed = 1; seed <= 4; seed++) {
        const battle = waveOf(family.id, wave, seed);
        eq(battle.family, family);
        for (const spawn of battle.spawns) ok(ofFamily(family, spawn), family.id + ' ' + wave + ': '
          + (spawn.kind ? spawn.kind.id : spawn.look.id));
      }
    }
    const boss = waveOf(family.id, 30).spawns.filter((spawn) => spawn.type === 'boss');
    ok(boss.length && boss.every((spawn) => family.bosses.includes(spawn.kind.id)), family.id + ': свой босс');
  }
});

test('виды волн: у каждого вида с его первой волны есть все роли, элитные и босс; два раза подряд вид не идёт', () => {
  for (const family of FAMILIES) {
    const wave = family.from || 1;
    for (const type of ['normal', 'fast', 'tough', 'swarm']) ok(familyPool(family, LOOKS[type], wave).length,
      family.id + ': ' + type);
    ok(familyPool(family, ELITES, wave).length, family.id + ': элитные');
    ok(familyPool(family, BOSSES, wave).length, family.id + ': босс');
  }
  const battle = makeBattle({ random: seeded(11) }), seen = new Map();
  let last = null;
  for (let wave = 1; wave <= 60; wave++) {
    const family = battle.planFamily(wave);
    ok(!family.from || family.from <= wave, family.id + ' на ' + wave + '-й');
    ok(family !== last, 'не подряд: ' + wave);
    seen.set(family.id, (seen.get(family.id) || 0) + 1);
    battle.startWave(wave, 3);
    eq(battle.family, family, 'выходит тот вид, что объявлен');
    battle.spawns = [];
    last = family;
  }
  eq(seen.size, FAMILIES.length, 'выходят все виды');
  const slime = waveOf('slimes', 30);
  slime.spawns = [];
  const mother = slime._spawn({ type: 'boss', kind: BOSSES.find((kind) => kind.id === 'slimemother'), hp: 100 }, 4);
  runFor(slime, 2.5);
  ok(slime.mobs.some((mob) => mob.look === 'slime1'), 'праматерь выпускает слизнят');
  slime._hurt(mother, 1e9, slime.place(player(), 'gunner', 2, 4));
  runFor(slime, SPLIT_TIME + TICK);
  ok(slime.mobs.filter((mob) => mob.look === 'slime2').length >= 2, 'и распадается на слизней');
});

test('снайпер: бьёт дальше всех, сперва летучих, потом самого крепкого', () => {
  const battle = makeBattle(), sniper = battle.place(player(), 'sniper', 10, 4);
  ok(CLASSES.every((cls) => (cls.base.range || 0) <= sniper.cls.base.range));
  const strong = walker(battle, 10, 1e6), flyer = walker(battle, 12, 100, bat());
  ok(battle._target(sniper) === flyer);
  flyer.dead = true;
  ok(battle._target(sniper) === strong);
});

test('снайпер: до 10-го бьёт одного, с 10-го пуля прошивает всю линию поровну, за каждого задетого сильнее', () => {
  const setup = (n) => {
    const battle = makeBattle(), sniper = battle.place(level(n), 'sniper', 2, 4);
    sniper.cx = 0.5;
    sniper.cy = 5.5;
    sniper.critChance = 0;
    battle.random = () => 0.99;
    const mobs = [walker(battle, 3, 1e6), walker(battle, 5, 1e6), walker(battle, 4, 2e6)];
    battle._fire(sniper);
    return { sniper, mobs };
  };
  const young = setup(1);
  eq(young.mobs.map(hit).map((v) => v > 0), [false, false, true], 'только цель');
  const { sniper, mobs } = setup(10);
  for (const mob of mobs) near(hit(mob), sniper.damage * (1 + sniper.s[0].ramp * 2), 'вся линия поровну');
});

test('снайпер: с 30-го иногда секунду заряжает толстую пулю — урон выше и всегда крит', () => {
  const battle = makeBattle(), sniper = battle.place(level(30), 'sniper', 10, 4), mob = walker(battle, 11, 1e9);
  still(mob);
  battle.random = () => 0;
  ok(battle._fire(sniper));
  eq(mob.hp, mob.max, 'сначала заряжает');
  ok(sniper.charge && sniper.charge.kind === 'heavy');
  ok(battle.events.some((e) => e.kind === 'charge' && e.charge === 'heavy'));
  runFor(battle, sniper.s[1].charge - 0.1);
  eq(mob.hp, mob.max, 'заряжает секунду');
  runFor(battle, 0.2);
  ok(battle.events.some((e) => e.kind === 'shot' && e.heavy === 'heavy' && e.crit), 'толстая пуля, крит');
  near(hit(mob), sniper.skill * sniper.s[1].bonus * sniper.critMul);
});

test('снайпер: с 50-го три секунды целится в элитного, бьёт критом без пробития и метит его', () => {
  const battle = makeBattle(), sniper = battle.place(level(50), 'sniper', 10, 4), gun = battle.place(player(), 'gunner',
    18, 0);
  battle.random = () => 0.99;
  const plain = walker(battle, 12, 1e9), elite = put(battle, special(battle, 'elite', 'vampire', 1e9), 9);
  still(plain, elite);
  battle.step(TICK);
  ok(sniper.charge && sniper.charge.kind === 'aim' && sniper.charge.target === elite, 'целится в элитного');
  runFor(battle, sniper.s[2].charge - 0.2);
  eq(elite.hp, elite.max, 'пока целится — не стреляет');
  runFor(battle, 0.3);
  ok(battle.events.some((e) => e.kind === 'shot' && e.heavy === 'mega' && e.crit));
  near(hit(elite), sniper.skill * sniper.s[2].bonus * sniper.critMul);
  eq(plain.hp, plain.max, 'не прошивает');
  ok(elite.markUntil > battle.time + sniper.s[2].markTime - 0.2, 'метка');
  const before = elite.hp;
  battle._hurt(elite, 100, gun, null);
  near(before - elite.hp, 100 * (1 + sniper.s[2].mark), 'меченый получает больше от всех');
});

test('снайпер: руна «Двойной выстрел» — обычная атака сразу по двум мобам', () => {
  const battle = makeBattle(), sniper = battle.place(player(), 'sniper', 10, 4);
  battle.random = () => 0.99;
  const a = walker(battle, 9, 1e6), b = walker(battle, 13, 2e6);
  battle._fire(sniper);
  eq([hit(a) > 0, hit(b) > 0], [false, true], 'без руны — один');
  battle.setMods(sniper, { runes: ['twin'] });
  battle._fire(sniper);
  ok(hit(a) > 0, 'с руной — оба');
});

test('снайпер: руна «Разрывная пуля» — пуля иногда рвётся и задевает соседей четвертью урона', () => {
  const battle = makeBattle(), sniper = battle.place(player(), 'sniper', 10, 4);
  battle.setMods(sniper, { runes: ['burst'] });
  sniper.critChance = 0;
  battle.random = () => BURST.chance / 2;
  const target = walker(battle, 10, 2e6), side = walker(battle, 10.7, 1e6);
  still(target, side);
  battle._fire(sniper);
  ok(battle.events.some((e) => e.kind === 'burst'));
  near(hit(side), sniper.damage * BURST.share, 'сосед получил четверть');
});

test('пулемётчик: боссов не выделяет и не обходит', () => {
  const battle = makeBattle(), gun = battle.place(player(), 'gunner', 10, 4);
  const plain = walker(battle, 10, 1e9), boss = put(battle, special(battle, 'boss', 'crusher', 1e9), 12);
  still(plain, boss);
  ok(battle._target(gun) === boss, 'бьёт первого по дороге, хоть это и босс');
});

test('пулемётчик: держит одну цель и разгоняется на ней, через 7 секунд стрельбы — перезарядка', () => {
  const battle = makeBattle(), gun = battle.place(player(), 'gunner', 10, 4);
  battle.random = () => 0.99;
  const a = walker(battle, 10, 1e9), b = walker(battle, 12, 1e9);
  still(a, b);
  runFor(battle, 1);
  const first = gun.aim;
  ok(first === b && gun.ramp > 0, 'разгоняется на цели');
  const c = walker(battle, 12.8, 1e9);
  still(c);
  runFor(battle, 1);
  ok(gun.aim === first, 'цель не меняет, пока она в радиусе');
  eq(c.hp, c.max);
  runFor(battle, gun.cls.base.burst - 1.8);
  ok(gun.reloadUntil > battle.time, 'перезарядка');
  ok(battle.events.some((e) => e.kind === 'reload'));
  eq(gun.ramp, 0, 'разгон сбросился');
  const hp = first.hp;
  runFor(battle, gun.cls.base.reload - 0.5);
  eq(first.hp, hp, 'пока перезаряжает — не стреляет');
});

test('пулемётчик: руна «Бесконечный барабан» — без перезарядки', () => {
  const battle = makeBattle(), gun = battle.place(player(), 'gunner', 10, 4), mob = walker(battle, 11, 1e9);
  still(mob);
  battle.setMods(gun, { runes: ['drum'] });
  runFor(battle, 15);
  no(battle.events.some((e) => e.kind === 'reload'));
});

test('пулемётчик: с 10-го через три секунды стрельбы ствол раскаляется, плазменные пули пробивают щит', () => {
  const battle = makeBattle(), gun = battle.place(level(10), 'gunner', 10, 4), mob = walker(battle, 11, 1e9);
  still(mob);
  battle.random = () => 0.99;
  runFor(battle, gun.s[0].after - 0.5);
  no(gun.hot);
  runFor(battle, 1);
  ok(gun.hot && battle.events.some((e) => e.kind === 'shot' && e.hot), 'огненные пули');
  const shielded = (runes) => {
    const field = makeBattle(), t = field.place(level(10), 'gunner', 10, 4);
    field.setMods(t, { runes });
    const warden = put(field, special(field, 'boss', 'warden', 1e9), 11);
    still(warden);
    warden.powerAt = 1e9;
    warden.powerUntil = 1e9;
    runFor(field, t.s[0].after + 1);
    return hit(warden);
  };
  eq(shielded([]), 0, 'щит держит');
  ok(shielded(['plasma']) > 0, 'плазма пробивает');
});

test('пулемётчик: с 30-го пуля отскакивает в соседа цели, с 50-го — берсерк после пяти секунд стрельбы', () => {
  const battle = makeBattle(), gun = battle.place(level(50), 'gunner', 10, 4);
  gun.critChance = 0;
  battle.random = () => 0.01;
  const a = walker(battle, 11, 1e9), b = walker(battle, 12, 1e9);
  still(a, b);
  battle._fire(gun);
  ok(hit(a) > 0 && hit(b) > 0, 'досталось обоим');
  ok(battle.events.some((e) => e.kind === 'ricochet'));
  runFor(battle, gun.s[2].after + 0.5);
  ok(gun.berserk, 'берсерк');
  ok(gun.ramp >= gun.cls.base.rampMax, 'на предельной скорости');
});

test('подрывник: взрыв бьёт всех рядом одинаково; с 10-го горит земля, летучих не жжёт', () => {
  const battle = makeBattle(), bomber = battle.place(level(10), 'bomber', 10, 4);
  bomber.critChance = 0;
  battle.random = () => 0.99;
  const a = walker(battle, 11, 1e6), b = walker(battle, 11.6, 1e6), far = walker(battle, 14, 1e6);
  const flyer = walker(battle, 11.3, 1e6, bat());
  still(a, b, far, flyer);
  battle._fire(bomber);
  bomber.busy = 1e9;
  for (const mob of [a, b, flyer]) near(hit(mob), bomber.damage, 'поровну');
  eq(far.hp, far.max);
  eq(battle.patches.length, 1, 'земля горит');
  const flown = hit(flyer), walked = hit(a);
  runFor(battle, 1);
  ok(hit(a) > walked, 'стоящие в огне горят');
  eq(hit(flyer), flown, 'летучих не жжёт');
});

test('подрывник: с 30-го взрыв повторяется, и повтор может повториться — каждый раз вдвое реже', () => {
  const battle = makeBattle(), bomber = battle.place(level(30), 'bomber', 10, 4), mob = walker(battle, 11, 1e9);
  still(mob);
  bomber.critChance = 0;
  const chance = bomber.s[1].chance;
  battle.random = () => chance * 0.4;
  battle._fire(bomber);
  bomber.busy = 1e9;
  runFor(battle, 1.5);
  eq(battle.events.filter((e) => e.kind === 'boom').length, 3, 'взрыв и два повтора');
});

test('подрывник: с 50-го две секунды заряжает РПГ и бьёт в ближайшего элитного — урон и оглушение вокруг', () => {
  const battle = makeBattle(), bomber = battle.place(level(50), 'bomber', 10, 4);
  battle.random = () => 0.99;
  const elite = put(battle, special(battle, 'elite', 'vampire', 1e9), 3), side = walker(battle, 3.5, 1e9);
  still(elite, side);
  battle.step(TICK);
  ok(bomber.charge && bomber.charge.kind === 'rpg' && bomber.charge.target === elite);
  runFor(battle, bomber.s[2].charge + 0.8);
  ok(battle.events.some((e) => e.kind === 'rocket'));
  ok(battle.events.some((e) => e.kind === 'boom' && e.rocket));
  ok(hit(elite) >= bomber.damage * bomber.s[2].bonus - 1e-6);
  ok(elite.holdUntil > battle.time && side.holdUntil > battle.time, 'оглушены');
});

test('подрывник: руна «Кассетный выстрел» — два снаряда в разные цели, «Напалм» — огонь вдвое шире', () => {
  const battle = makeBattle(), bomber = battle.place(level(10), 'bomber', 10, 4);
  battle.setMods(bomber, { runes: ['cluster', 'napalm'] });
  battle.random = () => 0.99;
  const a = walker(battle, 9, 1e6), b = walker(battle, 13, 1e6);
  still(a, b);
  battle._fire(bomber);
  ok(hit(a) > 0 && hit(b) > 0, 'оба');
  near(battle.patches[0].radius, bomber.s[0].radius * 2);
});

test('громовержец: молния прыгает назад по дороге ещё на девять мобов, каждому на 10% меньше', () => {
  const battle = makeBattle(), thunder = battle.place(player(), 'thunder', 10, 4);
  thunder.critChance = 0;
  battle.random = () => 0.99;
  const mobs = [];
  for (let d = 13; d >= 0; d--) mobs.push(walker(battle, d, 1e6));
  still(...mobs);
  battle._fire(thunder);
  mobs.forEach((mob, k) => near(hit(mob), k < 10 ? thunder.damage * (1 - 0.1 * k) : 0, 'моб ' + k));
  ok(battle.events.some((e) => e.kind === 'chain' && e.points.length === 11));
});

test('громовержец: руна «Цепная молния» — без ослабления, ещё пять прыжков и в обе стороны', () => {
  const battle = makeBattle(), thunder = battle.place(player(), 'thunder', 10, 4);
  battle.setMods(thunder, { runes: ['chain'] });
  thunder.critChance = 0;
  battle.random = () => 0.99;
  const mobs = [];
  for (let d = 14; d >= 0; d--) mobs.push(walker(battle, d, 1e6));
  const ahead = walker(battle, 14.6, 1e6);
  still(ahead, ...mobs);
  battle._fire(thunder);
  const struck = mobs.concat([ahead]).filter((mob) => hit(mob) > 0);
  eq(struck.length, 15);
  for (const mob of struck) near(hit(mob), thunder.damage);
  ok(hit(ahead) > 0, 'и вперёд');
});

test('громовержец: с 10-го задетые заряжены и получают больше от всех; с 30-го — вспышка вокруг', () => {
  const battle = makeBattle(), thunder = battle.place(level(30), 'thunder', 10, 4);
  const gun = battle.place(player(), 'gunner', 18, 0);
  thunder.critChance = 0;
  battle.random = () => 0;
  const target = walker(battle, 13, 1e6), side = walker(battle, 13.6, 1e6);
  still(target, side);
  battle._fire(thunder);
  ok(target.charge && target.charge.by === thunder, 'заряжен');
  ok(battle.events.some((e) => e.kind === 'flash'));
  ok(hit(side) > 0, 'вспышка задела соседа');
  const before = target.hp;
  battle._hurt(target, 100, gun, null);
  near(before - target.hp, 100 * (1 + thunder.s[0].bonus));
});

test('громовержец: с 50-го бьёт громом первого моба на дороге, где бы он ни был', () => {
  const battle = makeBattle(), thunder = battle.place(level(50), 'thunder', 2, 4), lead = walker(battle, 18, 1e9);
  still(lead);
  battle.random = () => 0.99;
  battle.step(TICK);
  ok(battle.events.some((e) => e.kind === 'thunderbolt' && e.mob === lead));
  ok(hit(lead) >= thunder.skill * thunder.s[2].bonus * thunder.critMul - 1e-6, 'критический урон');
  ok(lead.holdUntil > battle.time, 'оглушён');
});

test('громовержец: руна «Разрядка» — заряженный без молнии пять секунд получает огромный урон и оглушение', () => {
  const battle = makeBattle(), thunder = battle.place(level(10), 'thunder', 10, 4), mob = walker(battle, 11, 1e9);
  still(mob);
  battle.setMods(thunder, { runes: ['discharge'] });
  thunder.critChance = 0;
  battle.random = () => 0.99;
  battle._fire(thunder);
  thunder.busy = 1e9;
  const after = hit(mob);
  runFor(battle, thunder.s[0].time + 0.1);
  ok(battle.events.some((e) => e.kind === 'discharge'));
  near(hit(mob) - after, thunder.skill * DISCHARGE.mul);
  ok(mob.holdUntil > battle.time + DISCHARGE.hold - 0.5);
  eq(mob.charge, null);
});

const lookOf = (id) => Object.values(LOOKS).flat().find((look) => look.id === id);
const typeOf = (id) => Object.keys(LOOKS).find((type) => LOOKS[type].some((look) => look.id === id));
const creature = (battle, id, d = 5, hp = 1e6) => battle._spawn({ type: typeOf(id), look: lookOf(id), hp }, d);

test('алхимик: зелье не летит в летучих и нежить; летит полсекунды и травит рядом с местом падения', () => {
  const battle = makeBattle(), alchemist = battle.place(player(), 'alchemist', 10, 4);
  battle.random = () => 0.99;
  const flyer = walker(battle, 11, 1e6, bat()), zombie = creature(battle, 'zombie', 11);
  still(flyer, zombie);
  no(battle._fire(alchemist), 'летучих и нежить не бьёт');
  const rat = creature(battle, 'rat', 11.4);
  still(rat);
  ok(battle._fire(alchemist));
  alchemist.busy = 1e9;
  eq(rat.hp, rat.max, 'зелье ещё летит');
  runFor(battle, alchemist.cls.base.flight + 0.1);
  ok(hit(rat) > 0);
  eq(zombie.hp, zombie.max, 'нежить яд не берёт');
  eq(flyer.hp, flyer.max, 'летучих не задевает');
});

test('алхимик: с 10-го лужа травит стоящих в ней, летучих — нет; с 30-го яд въедается', () => {
  const battle = makeBattle(), alchemist = battle.place(level(30), 'alchemist', 10, 4);
  battle.random = () => 0;
  const mob = walker(battle, 11, 1e6), flyer = walker(battle, 11, 1e6, bat());
  still(mob, flyer);
  battle._fire(alchemist);
  alchemist.busy = 1e9;
  runFor(battle, alchemist.cls.base.flight + 0.1);
  eq(battle.puddles.length, 1);
  ok(mob.poison && mob.poison.has(alchemist), 'яд въелся');
  const before = hit(mob);
  runFor(battle, 1);
  ok(hit(mob) > before, 'в луже травится');
  eq(flyer.hp, flyer.max, 'летучих не травит');
});

test('алхимик: с 50-го туман глушит навыки мобов в нём', () => {
  const battle = makeBattle(), alchemist = battle.place(level(50), 'alchemist', 10, 4);
  battle.random = () => 0.99;
  const leader = put(battle, special(battle, 'elite', 'leader', 1e9), 11);
  still(leader);
  battle.step(TICK);
  ok(battle.events.some((e) => e.kind === 'fogtoss'));
  alchemist.busy = 1e9;
  runFor(battle, 0.7);
  eq(battle.fogs.length, 1);
  ok(leader.muteUntil > battle.time, 'заглушён');
  battle.events.length = 0;
  leader.powerAt = battle.time;
  runFor(battle, 1);
  no(battle.events.some((e) => e.kind === 'power' && e.mob === leader), 'рывка нет');
});

test('алхимик: руна «Инфекция» — отравленный гниёт, «Чума» — берёт нежить, броню и бьёт сильнее', () => {
  const battle = makeBattle(), alchemist = battle.place(player(), 'alchemist', 10, 4);
  battle.setMods(alchemist, { runes: ['infection'] });
  alchemist.critChance = 0;
  battle.random = () => 0.99;
  const mob = walker(battle, 11, 1e6);
  still(mob);
  battle._fire(alchemist);
  alchemist.busy = 1e9;
  runFor(battle, alchemist.cls.base.flight + 0.1);
  ok(mob.rot && mob.rot.by === alchemist, 'гниёт');
  const before = hit(mob);
  runFor(battle, 2);
  const rate = Math.min(mob.max * ROT.share, alchemist.skill * RUNE_CAPS.rot);
  ok(rate < mob.max * ROT.share, 'у очень крепкого — не больше предела от силы алхимика');
  ok(hit(mob) - before >= rate * 1.9, 'гниёт каждую секунду');
  runFor(battle, ROT.time);
  eq(mob.rot, null, 'без нового яда гниение проходит');
  const field = makeBattle(), black = field.place(player(), 'alchemist', 10, 4);
  black.critChance = 0;
  field.random = () => 0.99;
  const knight = put(field, special(field, 'elite', 'knight', 1e6), 11);
  still(knight);
  no(field._fire(black), 'нежить не трогает');
  field.setMods(black, { runes: ['plague'] });
  black.critChance = 0;
  ok(field._fire(black));
  black.busy = 1e9;
  runFor(field, black.cls.base.flight + 0.1);
  near(hit(knight), black.damage * (1 + PLAGUE), 'сквозь броню и на 25% сильнее');
});

test('огнемётчик: жжёт узкой струёй в сторону цели, за спиной никого; с 10-го задетые горят', () => {
  const battle = makeBattle(), pyro = battle.place(level(10), 'pyro', 10, 4);
  const front = walker(battle, 12, 1e6), back = walker(battle, 10, 1e6);
  still(front, back);
  ok(pyro.cone > 0 && pyro.cone <= 0.45, 'струя узкая');
  ok(pyro.interval <= 0.2, 'огонь идёт без остановки');
  battle._fire(pyro);
  ok(front.hp < front.max && front.burn, 'цель горит');
  eq(back.hp, back.max, 'за спиной не горит');
  ok(battle.events.some((e) => e.kind === 'flame' && Math.abs(e.angle) < 0.8));
  const burnt = hit(front);
  pyro.busy = 1e9;
  runFor(battle, 1);
  ok(hit(front) > burnt * 2, 'и горит после');
});

test('огнемётчик: с 30-го горящий иногда вспыхивает — огненное кольцо задевает соседей', () => {
  const battle = makeBattle(), pyro = battle.place(level(30), 'pyro', 10, 4);
  battle.random = () => 0;
  const mob = walker(battle, 12, 1e6), side = walker(battle, 11.2, 1e6);
  still(mob, side);
  battle._fire(pyro);
  pyro.busy = 1e9;
  eq(side.hp, side.max, 'вне струи');
  runFor(battle, 1.1);
  ok(battle.events.some((e) => e.kind === 'ignite'));
  ok(hit(side) > 0, 'кольцо задело соседа');
});

test('огнемётчик: с 50-го разливает нефть; от огня она загорается и жжёт', () => {
  const battle = makeBattle(), pyro = battle.place(level(50), 'pyro', 10, 4);
  battle.random = () => 0.5;
  battle.step(TICK);
  eq(battle.oils.length, 1, 'разлил нефть');
  pyro.busy = 1e9;
  const oil = battle.oils[0], spot = battle._spot(oil.i), mob = walker(battle, spot.d, 1e6);
  still(mob);
  no(oil.lit);
  battle._ignite(mob, pyro, 1, 5);
  battle.step(TICK);
  ok(oil.lit, 'загорелась от горящего');
  const before = hit(mob);
  runFor(battle, 1);
  ok(hit(mob) - before > pyro.damage * pyro.s[2].dps * 0.5);
});

test('огнемётчик: нежить горит сильнее; руна «Широкое сопло» — струя вдвое шире, «Синее пламя» — вдвое сильнее', () => {
  const battle = makeBattle(), pyro = battle.place(player(), 'pyro', 10, 4);
  pyro.critChance = 0;
  battle.random = () => 0.99;
  const zombie = creature(battle, 'zombie', 12, 1e6);
  still(zombie);
  battle._fire(pyro);
  near(hit(zombie), pyro.damage * pyro.cls.base.undead);
  const cone = pyro.cone;
  battle.setMods(pyro, { runes: ['nozzle', 'blue'] });
  pyro.critChance = 0;
  near(pyro.cone, cone * 2);
  const before = hit(zombie);
  battle._fire(pyro);
  near(hit(zombie) - before, before * 2);
});

test('охотник: из арбалета бьёт всех, элитных и боссов — первыми и в пять раз сильнее', () => {
  const battle = makeBattle(), hunter = battle.place(player(), 'hunter', 10, 4);
  hunter.critChance = 0;
  battle.random = () => 0.99;
  const plain = walker(battle, 9, 1e6);
  still(plain);
  ok(battle._fire(hunter), 'по обычным тоже стреляет');
  near(hit(plain), hunter.damage);
  const elite = put(battle, special(battle, 'elite', 'vampire', 1e6), 8.5);
  still(elite);
  ok(battle._target(hunter) === elite, 'элитный — первым, хоть и позади');
  battle._fire(hunter);
  near(hit(elite), hunter.damage * hunter.cls.base.big);
});

test('охотник: с 10-го ставит до трёх капканов; попавший стоит и получает больше урона', () => {
  const battle = makeBattle(), hunter = battle.place(level(10), 'hunter', 10, 4);
  const gun = battle.place(player(), 'gunner', 18, 0);
  runFor(battle, 12);
  eq(battle.traps.length, hunter.s[0].count);
  hunter.busy = 1e9;
  const trap = battle.traps[0], mob = walker(battle, battle._spot(trap.i).d - 0.1, 1e6);
  battle.step(TICK);
  ok(mob.holdUntil > battle.time, 'попался');
  eq(battle.traps.length, hunter.s[0].count - 1);
  const before = mob.hp;
  battle._hurt(mob, 100, gun, null);
  near(before - mob.hp, 100 * (1 + hunter.s[0].bonus));
});

test('охотник: с 30-го иногда набрасывает сеть — стоит даже босс и получает больше урона', () => {
  const battle = makeBattle(), hunter = battle.place(level(30), 'hunter', 10, 4);
  battle.random = () => 0;
  const boss = put(battle, special(battle, 'boss', 'crusher', 1e9), 11);
  battle._fire(hunter);
  ok(battle.events.some((e) => e.kind === 'net' && e.mob === boss));
  ok(boss.holdUntil >= battle.time + hunter.s[1].time - 1e-9, 'держит босса полностью');
  ok(boss.vulnUntil > battle.time && boss.vuln >= hunter.s[1].bonus - 1e-9);
  const d = boss.d;
  runFor(battle, hunter.s[1].time - 0.2);
  eq(boss.d, d, 'стоит');
});

test('охотник: с 50-го метит добычу — все бьют её первой; убили вовремя — награда охотнику, остальным половина', () => {
  const battle = makeBattle(), hunter = battle.place(level(50), 'hunter', 2, 1);
  const gun = battle.place(player(), 'gunner', 10, 4);
  battle.random = () => 0.99;
  const elite = put(battle, special(battle, 'elite', 'vampire', 1e9), 10), runner = walker(battle, 12, 1e9);
  still(elite, runner);
  battle.step(TICK);
  ok(battle.prey && battle.prey.mob === elite, 'добыча помечена');
  ok(battle._target(gun) === elite, 'пулемётчик бьёт добычу, хоть обычно крупных не любит');
  const mine = hunter.player.coins, theirs = gun.player.coins;
  battle._hurt(elite, 1e12, gun, null);
  ok(battle.events.some((e) => e.kind === 'bounty'));
  ok(hunter.player.coins - mine >= Math.round(hunter.s[2].bounty) - 1e-9, 'охотнику награда');
  ok(gun.player.coins - theirs >= Math.round(hunter.s[2].bounty / 2), 'остальным половина');
});

test('охотник: руна «Засада» — без дела 10 секунд прыгает к первому мобу; «Мастер ловушек» — капканов вдвое', () => {
  const battle = makeBattle(), hunter = battle.place(level(10), 'hunter', 2, 1);
  battle.setMods(hunter, { runes: ['ambush', 'master'] });
  const mob = walker(battle, 15, 1e9);
  still(mob);
  runFor(battle, 10.5);
  ok(battle.events.some((e) => e.kind === 'ambush'));
  ok(Math.abs(hunter.x - Math.floor(mob.x)) <= 1 && Math.abs(hunter.y - Math.floor(mob.y)) <= 1, 'рядом с мобом');
  mob.dead = true;
  runFor(battle, 30);
  eq(battle.traps.length, hunter.s[0].count * 2);
});

test('паразит: первые 10 волн — кокон на клетке: не кусает, за волну 1–500 монет и опыт наравне с отрядом', () => {
  const battle = makeBattle(), larva = player(), bug = battle.place(larva, 'parasite', 3, 4);
  battle.place(level(30), 'gunner', 2, 6);
  eq(bug.cocoon, CLASS_BY_ID.get('parasite').base.cocoon);
  ok(battle.towerAt(3, 4) === bug, 'занимает клетку');
  no(battle.move(bug, 5, 4), 'с места не сходит');
  for (let wave = 1; wave <= 10; wave++) {
    const coins = larva.coins;
    battle.startWave(wave, 2);
    finish(battle);
    eq(bug.run.damage, 0, 'не кусает');
    battle.endWave();
    ok(larva.coins - coins >= 1 && larva.coins - coins <= 500, 'монеты: ' + (larva.coins - coins));
  }
  ok(larva.xp > 0, 'опыт отряда');
  eq(bug.cocoon, 0);
  ok(bug.rider, 'вылупился');
  no(battle.towerAt(3, 4), 'клетку освободил');
  ok(battle.events.some((e) => e.kind === 'hatch'));
});

test('паразит: цепляется к самому крепкому, после убийства прыгает на следующего', () => {
  const battle = makeBattle(), bug = battle.placeRider(level(5), 'parasite');
  eq([bug.x, bug.y], battle.path[0]);
  eq(battle.byCell.size, 0, 'клетку не занимает');
  no(battle.move(bug, 3, 4));
  const weak = walker(battle, 6, 50), strong = walker(battle, 2, 500);
  battle.step(TICK);
  eq(bug.host, strong);
  runFor(battle, bug.cls.base.leap + 0.1);
  eq([bug.cx, bug.cy], [strong.x, strong.y], 'сидит на нём');
  ok(strong.hp < strong.max, 'грызёт');
  eq(weak.hp, weak.max);
  battle._hurt(strong, 1e6, bug);
  battle.step(TICK);
  eq(bug.host, weak);
  ok(battle.events.some((e) => e.kind === 'leap' && e.mob === weak));
  runFor(battle, bug.cls.base.leap + 0.1);
  battle._hurt(weak, 1e6, bug);
  const spot = [weak.x, weak.y];
  runFor(battle, 1);
  eq(bug.host, null);
  eq([bug.cx, bug.cy], spot, 'ждёт там, где убил');
});

test('паразит: с 10-го крит оглушает и отнимает ещё долю здоровья — у боссов меньше', () => {
  const battle = makeBattle(), bug = battle.placeRider(level(10), 'parasite');
  battle.random = () => 0;
  const mob = walker(battle, 5, 1000), boss = special(battle, 'boss', 'crusher', 1e6);
  still(mob, boss);
  const cap = bug.skill * bug.s[0].cap;
  ATTACK(battle, bug, mob);
  near(hit(mob), bug.damage * bug.critMul + Math.min(1000 * bug.s[0].share, cap));
  ok(mob.holdUntil > battle.time, 'оглушён');
  ATTACK(battle, bug, boss);
  near(hit(boss), bug.damage * bug.critMul + Math.min(1e6 * bug.s[0].boss, cap), 'у очень крепкого — не больше предела');
  ok(cap < 1e6 * bug.s[0].boss);
});

test('паразит: с 30-го, добив моба, иногда пирует — больше опыта и монет', () => {
  const battle = makeBattle(), bug = battle.placeRider(level(30), 'parasite');
  battle.random = () => 0;
  const mob = walker(battle, 5, 1);
  still(mob);
  const xp = bug.player.xp, earn = bug.cls.earn;
  ATTACK(battle, bug, mob);
  ok(mob.dead && battle.events.some((e) => e.kind === 'feast'));
  near(bug.player.xp - xp, MOBS.normal.xp * earn.xp * (1 + bug.s[1].bonus));
});

test('паразит: с 50-го забирает монеты богатого союзника себе, а набрав больше 1000 — раздаёт всем и себе', () => {
  const battle = makeBattle(), bug = battle.placeRider(level(50), 'parasite');
  const rich = battle.place(player(), 'gunner', 2, 4), poor = battle.place(player(), 'gunner', 2, 6);
  rich.player.coins = 2000;
  battle.step(TICK);
  const heist = battle.events.find((e) => e.kind === 'heist'), share = battle.events.find((e) => e.kind === 'share');
  ok(heist && heist.victim === rich && heist.coins === 2000, 'забрал всё себе');
  ok(share && share.coins === 2000, 'и раздал, раз стало больше 1000');
  eq(share.shares.map((part) => part.tower).sort(), [bug, rich, poor].sort(), 'всем, себе тоже');
  near(rich.player.coins + poor.player.coins + bug.player.coins, 2000, 'ни одна монета не пропала');
  ok(bug.perch && bug.perch.tower === rich, 'спит у него на голове');
  ok(rich.napUntil >= battle.time + bug.s[2].sleep - 1, 'союзник спит минуту');
  rich.player.coins = 5000;
  runFor(battle, 30);
  eq(rich.player.coins, 5000, 'не чаще раза в минуту');
  const field = makeBattle(), alone = field.placeRider(level(50), 'parasite'), mate = field.place(player(), 'gunner',
    2, 4);
  alone.player.coins = 1500;
  field.step(TICK);
  no(field.events.some((e) => e.kind === 'heist'), 'богатых нет — не прыгает');
  ok(field.events.some((e) => e.kind === 'share'), 'но свои больше 1000 раздаёт');
  near(alone.player.coins + mate.player.coins, 1500);
  no(alone.perch);
});

test('паразит: руна «Бешенство» — кусает втрое чаще, «Смертельный шип» — иногда добивает раненого', () => {
  const battle = makeBattle(), bug = battle.placeRider(player(), 'parasite'), interval = bug.interval;
  battle.setMods(bug, { runes: ['frenzy', 'thorn'] });
  near(bug.interval, interval / 3);
  battle.random = () => THORN.chance / 2;
  const weak = walker(battle, 5, 100), cap = bug.skill * RUNE_CAPS.thorn;
  still(weak);
  weak.hp = Math.min(weak.max * (THORN.below - 0.05), cap * 0.9);
  ATTACK(battle, bug, weak);
  ok(weak.dead, 'добит');
  const boss = special(battle, 'boss', 'crusher', 1e6);
  boss.hp = boss.max * (THORN.below - 0.05);
  const left = boss.hp;
  ATTACK(battle, bug, boss);
  ok(!boss.dead && left - boss.hp >= cap - 1e-6, 'слишком крепкий — получает урон, но жив');
});

test('минёр: не стреляет, ставит до 10 мин на дорогу рядом; мина рвётся под мобом, летучих не замечает', () => {
  const battle = makeBattle(), miner = battle.place(level(5), 'miner', 10, 4), cap = miner.cls.base.cap;
  ok(miner.cls.passive, 'не стреляет');
  runFor(battle, 40);
  eq(battle.mines.length, cap);
  for (const mine of battle.mines) ok(Math.hypot(mine.x - miner.cx, mine.y - miner.cy) <= miner.range + 0.5);
  miner.busy = 1e9;
  const flyer = walker(battle, 0, 1e6, bat());
  for (let i = 0; i < 600 && flyer.d < 18; i++) battle.step(TICK);
  eq(battle.mines.length, cap, 'летучая прошла, мины целы');
  const mob = walker(battle, 0, 1e6);
  for (let i = 0; i < 600 && mob.d < 18; i++) battle.step(TICK);
  ok(battle.mines.length < cap, 'мины сработали');
  ok(mob.hp < mob.max);
  ok(battle.events.some((e) => e.kind === 'mine'));
});

test('минёр: сверх предела новая мина заменяет самую старую', () => {
  const battle = makeBattle(), miner = battle.place(level(5), 'miner', 10, 4);
  runFor(battle, 40);
  eq(battle.mines.length, miner.cls.base.cap);
  const oldest = battle.mines[0];
  runFor(battle, miner.interval + 0.1);
  eq(battle.mines.length, miner.cls.base.cap);
  no(battle.mines.includes(oldest), 'старая заменена новой');
});

test('минёр: с 10-го кидает гранату в случайного моба на любом конце поля, и в летучих тоже', () => {
  const battle = makeBattle(), miner = battle.place(level(10), 'miner', 10, 4);
  const far = walker(battle, 18, 1e6), flyer = walker(battle, 1, 1e6, bat());
  still(far, flyer);
  for (let i = 0; i < 1200 && (far.hp === far.max || flyer.hp === flyer.max); i++) battle.step(TICK);
  ok(battle.events.some((e) => e.kind === 'toss' && e.mine === 'grenade'));
  ok(hit(far) > 0, 'досталось дальнему');
  ok(hit(flyer) > 0, 'граната задевает и летучих');
});

test('минёр: с 30-го иногда ставит усиленную мину далеко от себя, при полном запасе обычных — всегда', () => {
  const battle = makeBattle(), miner = battle.place(level(30), 'miner', 10, 4);
  battle.random = () => 0.99;
  runFor(battle, 45);
  const plain = battle.mines.filter((mine) => mine.kind === 'mine');
  const big = battle.mines.filter((mine) => mine.kind === 'big');
  eq(plain.length, miner.cls.base.cap);
  eq(big.length, miner.s[1].cap, 'усиленных — до пяти');
  ok(big.every((mine) => Math.hypot(mine.x - miner.cx, mine.y - miner.cy) <= miner.s[1].range + 0.5));
});

test('минёр: с 50-го, если моб ближе пяти клеток, — ядерка: убивает всех рядом, слишком крепких сильно ранит', () => {
  const battle = makeBattle(), miner = battle.place(level(50), 'miner', 10, 4);
  battle.random = () => 0.99;
  const far = walker(battle, 17, 1e6);
  still(far);
  runFor(battle, 1);
  no(battle.tosses.some((toss) => toss.kind === 'nuke'), 'далеко — не кидает');
  const cap = miner.skill * miner.s[2].cap;
  const boss = put(battle, special(battle, 'boss', 'crusher', 1e9), 12), close = walker(battle, 13, cap * 0.9);
  still(boss, close);
  battle.step(TICK);
  const nuke = battle.tosses.find((toss) => toss.kind === 'nuke');
  ok(nuke && Math.abs(nuke.at - battle.time - NUKE_FLIGHT) < TICK * 1.5, 'летит долго');
  runFor(battle, NUKE_FLIGHT + TICK);
  ok(close.dead, 'убила тех, кто слабее предела');
  ok(!boss.dead && hit(boss) >= cap * 0.99, 'босса с огромным здоровьем — сильно ранила');
  no(far.dead);
  const nukes = () => battle.events.filter((e) => e.kind === 'nuke').length, count = nukes();
  still(put(battle, special(battle, 'boss', 'crusher', 1e12), 12));
  runFor(battle, 60);
  eq(nukes(), count, 'следующая — не раньше, чем через две минуты');
});

test('минёр: руна «Большой запас» — мин вдвое больше, «Ядерный синтез» — граната бывает маленькой ядеркой', () => {
  const battle = makeBattle(), miner = battle.place(level(10), 'miner', 10, 4);
  battle.setMods(miner, { runes: ['stock', 'fusion'] });
  battle.random = () => 0;
  const ally = battle.place(player(), 'gunner', 5, 4), mob = walker(battle, 6, 1e9);
  still(mob);
  for (let i = 0; i < 200 && !battle.events.some((e) => e.kind === 'nuke'); i++) battle.step(TICK);
  ok(battle.events.some((e) => e.kind === 'toss' && e.mine === 'fusion'));
  ok(battle.events.some((e) => e.kind === 'nuke' && e.small));
  ok(hit(mob) >= miner.damage * FUSION.mul - 1e-6, 'огромный урон');
  ok(mob.holdUntil > battle.time + FUSION.hold - 1, 'моб оглушён');
  ok(ally.stunUntil > battle.time + FUSION.hold - 1, 'и защитник рядом тоже');
  const field = makeBattle(), stock = field.place(level(5), 'miner', 10, 4);
  field.setMods(stock, { runes: ['stock'] });
  runFor(field, 80);
  eq(field.mines.length, stock.cls.base.cap * 2);
});

test('ледяной маг: буря вокруг бьёт льдом всех в радиусе', () => {
  const battle = makeBattle(), frost = battle.place(player(), 'frost', 10, 4);
  battle.random = () => 0.99;
  const mobs = [walker(battle, 9, 1e6), walker(battle, 11, 1e6), walker(battle, 12, 1e6)];
  battle._fire(frost);
  for (const mob of mobs) ok(mob.hp < mob.max);
  ok(battle.events.some((e) => e.kind === 'nova'));
});

test('ледяной маг: с 10-го в буре мобы медленнее, а вышедшие ещё несколько секунд идут подмороженными', () => {
  const battle = makeBattle(), frost = battle.place(level(10), 'frost', 10, 4);
  frost.busy = 1e9;
  const mob = walker(battle, 10, 1e6);
  battle.step(TICK);
  ok(mob.chill > 0);
  mob.d = 17;
  battle._locate(mob);
  runFor(battle, 1);
  ok(mob.slowUntil > battle.time && mob.slow > 0, 'след холода держится');
  runFor(battle, frost.s[0].time);
  ok(mob.slowUntil <= battle.time);
});

test('ледяной маг: с 30-го удар льдом иногда замораживает, руна «Вечная мерзлота» — вдвое дольше', () => {
  const freeze = (runes) => {
    const battle = makeBattle(), frost = battle.place(level(30), 'frost', 10, 4);
    battle.setMods(frost, { runes });
    battle.random = () => 0;
    const mob = walker(battle, 11, 1e9);
    battle._fire(frost);
    ok(mob.holdBy === 'frost');
    return { time: mob.holdUntil - battle.time, s: frost.s[1] };
  };
  const plain = freeze([]), long = freeze(['permafrost']);
  near(plain.time, plain.s.time);
  near(long.time, plain.s.time * 2);
});

test('ледяной маг: с 50-го снег по всему полю подмораживает всех мобов, некоторых замораживает', () => {
  const battle = makeBattle(), frost = battle.place(level(50), 'frost', 2, 4), far = walker(battle, 18, 1e9);
  still(far);
  battle.random = () => 0;
  battle.step(TICK);
  ok(battle.events.some((e) => e.kind === 'snow'));
  ok(far.slowUntil > battle.time && far.slow > 0, 'подморожен');
  ok(far.holdUntil > battle.time, 'заморожен');
});

test('ледяной маг: руна «Хрупкость» — замороженный иногда гибнет от любого удара любого игрока', () => {
  const battle = makeBattle(), frost = battle.place(level(30), 'frost', 10, 4), gun = battle.place(player(), 'gunner',
    2, 4);
  battle.setMods(frost, { runes: ['brittle'] });
  const cap = gun.skill * RUNE_CAPS.shatter, mob = walker(battle, 6, cap * 0.8), big = walker(battle, 7, 1e9);
  battle._hold(mob, 3, frost);
  battle._hold(big, 3, frost);
  battle.random = () => 0;
  battle._hurt(mob, 1, gun);
  ok(mob.dead, 'рассыпался');
  ok(battle.events.some((e) => e.kind === 'shatter'));
  battle._hurt(big, 1, gun);
  ok(!big.dead && hit(big) >= cap, 'слишком крепкий — получает урон, но жив');
});

test('шаман: вихрь катится назад по дороге и бьёт всех на пути сквозь броню', () => {
  const battle = makeBattle(), shaman = battle.place(player(), 'shaman', 10, 4);
  shaman.critChance = 0;
  battle.random = () => 0.99;
  const knight = put(battle, special(battle, 'elite', 'knight', 1e6), 11), mob = walker(battle, 10.4, 1e6);
  still(knight, mob);
  battle._fire(shaman);
  shaman.busy = 1e9;
  runFor(battle, shaman.cls.base.whirlTime + 0.1);
  near(hit(knight), shaman.damage, 'броня не режет');
  near(hit(mob), shaman.damage, 'задет и тот, кто позади');
});

test('шаман: с 10-го порыв отбрасывает обычных рядом с целью, с 30-го отбрасывает задетых, но не боссов', () => {
  const battle = makeBattle(), shaman = battle.place(level(30), 'shaman', 10, 4);
  battle.random = () => 0;
  const mob = walker(battle, 11, 1e6), boss = put(battle, special(battle, 'boss', 'crusher', 1e6), 11.3);
  still(mob, boss);
  battle._fire(shaman);
  shaman.busy = 1e9;
  runFor(battle, shaman.cls.base.whirlTime + 0.1);
  ok(battle.events.some((e) => e.kind === 'gust'));
  ok(mob.pushed > 0 && mob.d < 11, 'отброшен');
  eq(boss.pushed, 0, 'босса не отбрасывает');
});

test('серебряные элитные: обычный моб с шансом становится серебряным — крепче, со свойством, дороже; объявляется раз', () => {
  eq(silverChance(1), 0, 'в первых волнах их нет');
  ok(silverChance(30) > silverChance(5) && silverChance(500) === SILVER.max, 'чем дальше, тем чаще, но не больше предела');
  let silvers = 0, plain = 0;
  for (let seed = 1; seed <= 6; seed++) {
    const battle = makeBattle({ random: seeded(seed) });
    battle.startWave(40, 5);
    for (const spawn of battle.spawns) {
      if (spawn.kind) continue;
      if (spawn.silver) silvers++;
      else plain++;
    }
  }
  ok(silvers > 0 && plain > silvers * 3, 'серебряных меньшинство: ' + silvers + ' из ' + (silvers + plain));
  const battle = makeBattle(), t = battle.place(player(), 'gunner', 3, 4);
  t.busy = 1e9;
  const affix = (id) => AFFIXES.find((a) => a.id === id);
  const swift = battle._spawn({ type: 'normal', look: lookOf('zombie'), hp: 100, silver: affix('swift') }, 5);
  const usual = battle._spawn({ type: 'normal', look: lookOf('zombie'), hp: 100 }, 5);
  near(swift.speed, usual.speed * 1.4, 'быстрый');
  ok(battle.events.filter((e) => e.kind === 'silver').length === 1);
  battle._spawn({ type: 'normal', look: lookOf('zombie'), hp: 100, silver: affix('swift') }, 6);
  eq(battle.events.filter((e) => e.kind === 'silver').length, 1, 'то же свойство второй раз не объявляют');
  const fireproof = battle._spawn({ type: 'normal', look: lookOf('zombie'), hp: 100, silver: affix('fireproof') }, 7);
  battle._hurt(fireproof, 50, t, 'fire');
  eq(fireproof.hp, 100, 'огонь не берёт');
  const regen = battle._spawn({ type: 'normal', look: lookOf('zombie'), hp: 100, silver: affix('regen') }, 7);
  eq(regen.power.id, 'regen', 'свойство-навык');
  const xp = t.player.xp;
  battle._hurt(usual, 1e9, t);
  const plainXp = t.player.xp - xp;
  battle._hurt(swift, 1e9, t);
  near(t.player.xp - xp - plainXp, plainXp * SILVER.xp, 'опыта втрое больше');
  const bomb = battle._spawn({ type: 'normal', look: lookOf('zombie'), hp: 10, silver: affix('burst') }, 3.6);
  battle._hurt(bomb, 1e9, t);
  ok(t.stunUntil > battle.time, 'взрывной оглушает защитников рядом');
  const twin = battle._spawn({ type: 'normal', look: lookOf('zombie'), hp: 250, silver: affix('split') }, 9);
  battle._hurt(twin, 1e9, t);
  battle.step(TICK);
  eq(battle.mobs.filter((m) => m.look === 'zombie' && !m.silver && !m.dead && m.max < 100).length, 2, 'делящийся — на двух');
});

test('новые боссы: банши оглушает, шатун ускоряет зверей, владыка стихий меняет стихию, привратник и вождь призывают', () => {
  const kind = (id) => BOSSES.find((k) => k.id === id);
  const banshee = makeBattle(), tower = banshee.place(player(), 'gunner', 5, 4), far = banshee.place(player(), 'gunner', 18, 8);
  const wail = banshee._spawn({ type: 'boss', kind: kind('banshee'), hp: 1e9 }, 6);
  wail.speed = 0;
  runFor(banshee, 2.2);
  ok(tower.stunUntil > banshee.time - 1 && far.stunUntil === 0, 'оглушает только тех, кто рядом');
  ok(wail.flying, 'летает');
  const bear = makeBattle(), shatun = bear._spawn({ type: 'boss', kind: kind('shatun'), hp: 1e9 }, 6);
  const pup = walker(bear, 6.5, 1e9);
  still(shatun, pup);
  runFor(bear, 2.2);
  ok(pup.rushUntil > bear.time && pup.rush > 0, 'рёв ускоряет соседей');
  const lord = makeBattle(), elem = lord._spawn({ type: 'boss', kind: kind('elemlord'), hp: 1e9 }, 6);
  still(elem);
  const first = elem.element;
  runFor(lord, 2.2);
  ok(elem.element && elem.element !== first, 'сменил стихию');
  const t = lord.place(player(), 'gunner', 5, 4), hp = elem.hp;
  lord._hurt(elem, 100, t, elem.element);
  eq(elem.hp, hp, 'своя стихия его не берёт');
  for (const [id, look] of [['gatekeeper', 'hellhound'], ['warlord', 'goblin']]) {
    const field = makeBattle(), boss = field._spawn({ type: 'boss', kind: kind(id), hp: 1e9 }, 6);
    still(boss);
    runFor(field, 2.2);
    ok(field.mobs.some((mob) => mob.look === look), id + ' призывает: ' + look);
  }
});

test('орда: в волне орды мобов больше, чем у других видов, но каждый слабее', () => {
  ok(Math.abs(waveSpawns(12, 1.6).length - waveSpawns(12).length * 1.6) <= 1);
  const count = (id) => {
    const battle = makeBattle({ random: seeded(2) });
    battle.nextFamily = FAMILY_BY_ID.get(id);
    battle.startWave(12, 5);
    return battle.spawns.filter((spawn) => !spawn.kind);
  };
  const horde = count('horde'), undead = count('undead');
  ok(horde.length > undead.length * 1.4, 'орда многочисленнее');
  ok(FAMILY_BY_ID.get('horde').count > 1);
});

test('интеллект: дальность атаки у всех классов растёт от интеллекта', () => {
  const battle = makeBattle();
  for (const id of ['sniper', 'gunner', 'frost', 'banner']) {
    const t = battle.place(player(), id, 2 + ['sniper', 'gunner', 'frost', 'banner'].indexOf(id) * 3, 2), range = t.range;
    battle.setMods(t, { stats: { int: 25 } });
    near(t.range - range, STAT.reach * 25, id);
  }
});

test('знаменосец: под знаменем бьют быстрее и дальше, два знамени не складываются, за добычу под знаменем — помощь', () => {
  const battle = makeBattle(), flag = battle.place(player(), 'banner', 4, 4), b = flag.cls.base;
  const ally = battle.place(player(), 'gunner', 5, 4), far = battle.place(player(), 'gunner', 14, 4);
  const range = far.range;
  battle.step(TICK);
  near(ally.range, range * (1 + b.reach), 'дальше');
  near(far.range, range, 'вне знамени — как было');
  near(battle._intervalOf(ally, battle.time), ally.interval / (1 + b.haste), 'быстрее');
  near(flag.boost.rate, b.haste, 'и сам знаменосец');
  ok(ally.boostBy.has(flag) && !flag.boostBy.has(flag));
  battle.place(player(), 'banner', 6, 4);
  battle.step(TICK);
  near(battle._intervalOf(ally, battle.time), ally.interval / (1 + b.haste), 'второе знамя не прибавляет');
  const mob = walker(battle, 12, 10);
  still(mob);
  battle._hurt(mob, 100, ally);
  ok(mob.dead && flag.run.assists >= 1, 'знаменосцу — помощь');
});

test('знаменосец: с 10-го боевой клич, с 30-го натиск, с 50-го знамя победы на весь отряд', () => {
  const battle = makeBattle(), flag = battle.place(level(50), 'banner', 4, 4);
  const ally = battle.place(player(), 'sniper', 5, 4), far = battle.place(player(), 'gunner', 16, 6);
  const mob = walker(battle, 19, 1e9);
  still(mob);
  runFor(battle, 2 * TICK);
  ok(battle.events.some((e) => e.kind === 'cheer') && battle.events.some((e) => e.kind === 'rally'));
  near(ally.boost.damage, flag.s[0].damage, 'клич');
  near(ally.boost.crit, flag.s[1].chance, 'натиск');
  near(far.boost.rate, flag.s[2].haste, 'знамя победы — и дальним');
  near(ally.boost.rate, flag.cls.base.haste + flag.s[2].haste);
  const target = walker(battle, 18, 1e9);
  still(target);
  ally.critChance = 0;
  battle.random = () => 0.99;
  battle._hurt(target, 100, ally);
  near(hit(target), 100 * (1 + flag.s[0].damage), 'урон под кличем');
  battle.random = () => flag.s[1].chance / 2;
  ok(battle.random() < 1 - (1 - ally.critChance) * (1 - ally.boost.crit), 'натиск даёт крит');
  runFor(battle, Math.max(flag.s[0].time, flag.s[2].time) + 0.1);
  near(far.boost.rate, 0, 'знамя победы кончилось');
  near(ally.boost.damage, 0, 'клич кончился');
});

test('знаменосец: руны — багровый стяг ускоряет под кличем, знамя в землю дольше и отбрасывает', () => {
  const battle = makeBattle(), flag = battle.place(level(50), 'banner', 4, 4);
  battle.setMods(flag, { runes: ['crimson', 'planted'] });
  const ally = battle.place(player(), 'gunner', 5, 4), mob = walker(battle, 5, 1e9);
  still(mob);
  runFor(battle, 2 * TICK);
  near(ally.boost.rate, flag.cls.base.haste + CRIMSON + flag.s[2].haste);
  near(flag.rallyUntil - battle.time + TICK, flag.s[2].time + PLANTED.time, 'дольше');
  ok(mob.pushed > 0, 'отбросило');
});

test('лекарь: святой свет по нежити сильнее, убитая им нежить не встаёт, призрака бьёт в полную силу', () => {
  const battle = makeBattle(), healer = battle.place(player(), 'healer', 10, 4);
  healer.critChance = 0;
  const zombie = creature(battle, 'zombie', 11), rat = creature(battle, 'rat', 11);
  still(zombie, rat);
  ATTACK(battle, healer, zombie);
  battle._hurt(rat, healer.damage, healer, 'holy');
  near(hit(rat), healer.damage);
  ok(hit(zombie) >= healer.damage * healer.cls.base.undead - 1e-6, 'нежить — в 2,5 раза');
  const skeleton = creature(battle, 'skeleton', 12, 10);
  still(skeleton);
  battle._hurt(skeleton, 100, healer, 'holy');
  runFor(battle, 3);
  no(battle.mobs.some((mob) => mob.look === 'skeleton' && !mob.dead), 'упокоен');
  const ghost = creature(battle, 'ghost', 13);
  still(ghost);
  ghost.phaseUntil = battle.time + 10;
  battle._hurt(ghost, 100, healer, 'holy');
  near(hit(ghost), 100, 'свет не режется');
});

test('лекарь: после волны возвращает сердцу жизнь, все лекари вместе — не больше двух', () => {
  const battle = makeBattle();
  battle.place(player(), 'healer', 2, 4);
  battle.lives = 10;
  battle.endWave();
  eq(battle.lives, 11);
  battle.place(player(), 'healer', 3, 4);
  battle.place(player(), 'healer', 4, 4);
  battle.endWave();
  eq(battle.lives, 13, 'трое — всё равно две');
  battle.lives = battle.maxLives;
  battle.endWave();
  eq(battle.lives, battle.maxLives, 'сверх полного не лечит');
});

test('лекарь: с 10-го щит — дошедший моб не отнимает жизнь, боссов держит только руна', () => {
  const battle = makeBattle(), healer = battle.place(level(10), 'healer', 2, 6);
  healer.busy = 1e9;
  battle.random = () => 0;
  const mob = walker(battle, battle.length - 2, 1e9);
  runFor(battle, 5);
  ok(mob.dead && battle.lives === LIVES, 'щит спас');
  ok(battle.events.some((e) => e.kind === 'shield'));
  const boss = put(battle, special(battle, 'boss', 'crusher', 1e9), battle.length - 2);
  runFor(battle, 5);
  ok(boss.dead && battle.lives < LIVES, 'босса щит не держит');
  battle.setMods(healer, { runes: ['guardian'] });
  const lives = battle.lives, again = put(battle, special(battle, 'boss', 'crusher', 1e9), battle.length - 2);
  runFor(battle, 5);
  ok(again.dead && battle.lives === lives, 'с ангелом-хранителем — держит');
});

test('лекарь: руна «второй шанс» — раз за игру возвращает сердцу пять жизней', () => {
  const battle = makeBattle(), healer = battle.place(player(), 'healer', 2, 6);
  battle.setMods(healer, { runes: ['second'] });
  healer.busy = 1e9;
  battle.lives = 1;
  walker(battle, battle.length - 2, 1e9);
  runFor(battle, 5);
  eq(battle.lives, SECOND);
  ok(battle.events.some((e) => e.kind === 'rescue'));
  battle.lives = 1;
  walker(battle, battle.length - 2, 1e9);
  runFor(battle, 5);
  ok(battle.lives <= 0, 'второй раз — нет');
});

test('лекарь: с 30-го очищение будит оглушённых и усыплённых, и потом их не оглушить', () => {
  const battle = makeBattle(), healer = battle.place(level(30), 'healer', 4, 4);
  const ally = battle.place(player(), 'gunner', 5, 4), mob = walker(battle, 19, 1e9);
  still(mob);
  battle._daze(ally, 10);
  ally.napUntil = battle.time + 10;
  battle.step(TICK);
  ok(battle.events.some((e) => e.kind === 'cleanse'));
  ok(ally.stunUntil <= battle.time && ally.napUntil <= battle.time && ally.busy <= battle.time, 'проснулся');
  no(battle._daze(ally, 5), 'сглаз не берёт');
  runFor(battle, healer.s[1].time + 0.1);
  ok(battle._daze(ally, 1), 'защита прошла');
});

test('лекарь: с 50-го святая земля — нежить на ней горит, все мобы получают больше урона, летучих не берёт', () => {
  const battle = makeBattle(), healer = battle.place(level(50), 'healer', 10, 2);
  healer.critChance = 0;
  battle.random = () => 0.99;
  const zombie = creature(battle, 'zombie', 15), dog = creature(battle, 'dog', 15.3), flyer = walker(battle, 15.2, 1e6,
    bat());
  still(zombie, dog, flyer);
  healer.cooldown = 1e9;
  battle.step(TICK);
  ok(battle.events.some((e) => e.kind === 'hallow'));
  healer.busy = 1e9;
  runFor(battle, 2);
  ok(hit(zombie) > 0 && hit(dog) === 0, 'горит только нежить');
  ok(dog.vuln > 0 && dog.vulnUntil > battle.time, 'уязвим');
  eq(flyer.vuln, 0, 'летучих не берёт');
});

test('мудрец: искры в двух мобов, рядом с ним больше опыта', () => {
  const battle = makeBattle(), sage = battle.place(player(), 'sage', 10, 4);
  sage.critChance = 0;
  const a = walker(battle, 10, 1e6), b = walker(battle, 11, 1e6);
  still(a, b);
  battle._fire(sage);
  near(hit(a), sage.damage);
  near(hit(b), sage.damage);
  const ally = battle.place(player(), 'gunner', 11, 4), far = battle.place(player(), 'gunner', 2, 6);
  battle.step(TICK);
  near(ally.boost.wisdom, sage.cls.base.wisdom);
  eq(far.boost.wisdom, 0);
  const before = ally.player.xp, outside = far.player.xp;
  battle.reward(ally, 100);
  battle.reward(far, 100);
  near(ally.player.xp - before, 100 * (1 + sage.cls.base.wisdom));
  near(far.player.xp - outside, 100);
});

test('мудрец: с 10-го вдохновение, с 30-го озарение перезаряжает способность, руна «ученик» — двоим', () => {
  const battle = makeBattle(), sage = battle.place(level(30), 'sage', 10, 4);
  const ally = battle.place(level(50), 'bomber', 11, 4), mob = walker(battle, 1, 1e9);
  still(mob);
  ally.nextActive = 1e9;
  battle.random = () => 0;
  battle.step(TICK);
  ok(battle.events.some((e) => e.kind === 'muse' && e.ally === ally && e.flash));
  ok(ally.nextActive <= battle.time, 'перезарядилось');
  ally.busy = 1e9;
  battle.step(TICK);
  near(ally.boost.damage, sage.s[0].bonus);
  near(ally.boost.rate, sage.s[0].bonus);
  ok(ally.boostBy.has(sage), 'мудрецу — помощь');
  runFor(battle, sage.s[0].time + 0.1);
  const other = makeBattle(), wise = other.place(level(10), 'sage', 10, 4);
  other.setMods(wise, { runes: ['pupil'] });
  other.place(player(), 'gunner', 11, 4);
  other.place(player(), 'gunner', 9, 4);
  still(walker(other, 1, 1e9));
  other.step(TICK);
  eq(other.events.filter((e) => e.kind === 'muse').length, 2, 'двоим сразу');
});

test('мудрец: с 50-го слабое место — сперва босс: урон по нему больше, за убийство вдвое больше опыта', () => {
  const battle = makeBattle(), sage = battle.place(level(50), 'sage', 2, 4);
  const boss = put(battle, special(battle, 'boss', 'crusher', 1e9), 14), mob = walker(battle, 15, 1e9);
  still(boss, mob);
  sage.busy = 1e9;
  battle.step(TICK);
  sage.busy = 0;
  battle._shoot(0, battle.time);
  ok(battle.events.some((e) => e.kind === 'expose' && e.mob === boss), 'метит босса');
  const gunner = battle.place(player(), 'gunner', 16, 4);
  gunner.critChance = 0;
  battle._hurt(boss, 100, gunner);
  near(hit(boss), 100 * (1 + sage.s[2].vuln), 'урон больше');
  const xp = gunner.player.xp;
  boss.hp = 1;
  battle._hurt(boss, 10, gunner);
  near(gunner.player.xp - xp, boss.info.xp * gunner.cls.earn.xp * sage.s[2].xp, 'вдвое больше опыта');
});

test('шаман: с 50-го ветер ускоряет союзников рядом, самого шамана — вдвое', () => {
  const battle = makeBattle(), shaman = battle.place(level(50), 'shaman', 10, 4);
  const ally = battle.place(player(), 'gunner', 11, 4), far = battle.place(player(), 'gunner', 2, 4);
  const mob = walker(battle, 18, 1e9);
  still(mob);
  const plain = battle._intervalOf(ally, battle.time);
  battle.step(TICK);
  ok(battle.events.some((e) => e.kind === 'wind'));
  near(ally.wind, shaman.s[2].haste);
  near(shaman.wind, shaman.s[2].haste * 2);
  eq(far.windUntil, 0, 'дальний — нет');
  near(battle._intervalOf(ally, battle.time), plain / (1 + shaman.s[2].haste));
});

test('шаман: руна «Встречный ветер» — все мобы на 20% медленнее, «Торнадо» впитывает стихии и бьёт ими', () => {
  const pace = (runes) => {
    const battle = makeBattle(), shaman = battle.place(player(), 'shaman', 2, 0);
    battle.setMods(shaman, { runes });
    shaman.busy = 1e9;
    const mob = walker(battle, 1, 1e9);
    runFor(battle, 2);
    return mob.d - 1;
  };
  near(pace(['headwind']), pace([]) * (1 - HEADWIND));
  const battle = makeBattle(), shaman = battle.place(player(), 'shaman', 10, 4);
  battle.setMods(shaman, { runes: ['tornado'] });
  battle.random = () => 0.99;
  const mob = walker(battle, 11, 1e6);
  still(mob);
  battle.patches.push({ tower: shaman, x: mob.x, y: mob.y, radius: 0.5, dps: 0, until: 1e9 });
  battle._fire(shaman);
  shaman.busy = 1e9;
  battle.step(TICK);
  ok(battle.whirls[0].elements.has('fire'), 'впитал огонь');
  ok(hit(mob) > shaman.damage * 1.2, 'бьёт и огнём');
});

test('маг земли: шипы бьют сразу две клетки дороги, руна «Каменные шипы» — пять; летучих не задевают', () => {
  const battle = makeBattle(), mage = battle.place(player(), 'earth', 10, 4);
  battle.random = () => 0.99;
  const target = walker(battle, 11, 1e6), behind = walker(battle, 10, 1e6), far = walker(battle, 9, 1e6);
  const flyer = walker(battle, 11, 1e6, bat());
  still(target, behind, far, flyer);
  battle._fire(mage);
  ok(hit(target) > 0 && hit(behind) > 0, 'две клетки');
  eq([far.hp, flyer.hp], [far.max, flyer.max]);
  battle.setMods(mage, { runes: ['stone'] });
  battle._fire(mage);
  ok(hit(far) > 0, 'пять клеток');
  eq(flyer.hp, flyer.max, 'летучих не задевают');
});

test('маг земли: с 10-го стена на ближайшей клетке дороги держит мобов, пока её не разобьют; летучих не держит', () => {
  const battle = makeBattle(), mage = battle.place(level(10), 'earth', 10, 4);
  battle.startWave(1, 1);
  battle.spawns = [];
  runFor(battle, 1.2);
  eq(battle.walls.length, 1, 'стена поставлена');
  const wall = battle.walls[0];
  ok(Math.hypot(wall.x - mage.cx, wall.y - mage.cy) <= 1.01, 'на ближайшей клетке дороги');
  mage.busy = 1e9;
  const mob = walker(battle, wall.d - 3, 30), flyer = walker(battle, wall.d - 3, 30, bat());
  runFor(battle, 3);
  ok(mob.d < wall.d, 'стоит у стены');
  ok(mob.wall === wall);
  ok(flyer.d > wall.d, 'летучая пролетела');
  ok(wall.hp < wall.max, 'стену грызут');
  for (let i = 0; i < 4000 && battle.walls.includes(wall); i++) battle.step(TICK);
  no(battle.walls.includes(wall), 'стену пробили');
  ok(battle.events.some((e) => e.kind === 'crumble'));
  runFor(battle, 1);
  ok(mob.d > wall.d, 'моб пошёл дальше');
});

test('маг земли: босс грызёт стену быстрее обычного моба; сломанная стена встаёт снова через несколько секунд', () => {
  const battle = makeBattle(), mage = battle.place(level(10), 'earth', 10, 4);
  battle.startWave(10, 1);
  battle.spawns = [];
  runFor(battle, 1.2);
  const wall = battle.walls[0];
  mage.busy = 1e9;
  const before = wall.hp;
  battle._batter(wall, walker(battle, 2, 100), 1, battle.time);
  const byZombie = before - wall.hp, boss = special(battle, 'boss', 'crusher', 1e6);
  still(boss, ...battle.mobs);
  battle._batter(wall, boss, 1, battle.time);
  ok(before - byZombie - wall.hp > byZombie * 5, 'босс — в разы сильнее');
  mage.busy = 0;
  battle._batter(wall, battle.mobs[0], 1e9, battle.time);
  eq(battle.walls.length, 0, 'сломали');
  runFor(battle, mage.cls.base.rebuild - 0.5);
  eq(battle.walls.length, 0);
  runFor(battle, 1);
  eq(battle.walls.length, 1, 'встала снова');
});

test('маг земли: с 30-го грызущий стену то и дело напарывается на шипы, руна «Стальная стена» — втрое прочнее', () => {
  const battle = makeBattle(), mage = battle.place(level(30), 'earth', 10, 4);
  runFor(battle, 0.2);
  const wall = battle.walls[0], max = wall.max;
  mage.busy = 1e9;
  battle.random = () => 0;
  const mob = walker(battle, wall.d - 1, 1e9);
  runFor(battle, 3);
  ok(mob.wall === wall);
  ok(battle.events.some((e) => e.kind === 'thorns'));
  ok(hit(mob) >= mage.damage * mage.s[1].bonus - 1e-6);
  const field = makeBattle(), steel = field.place(level(30), 'earth', 10, 4);
  field.setMods(steel, { runes: ['steel'] });
  runFor(field, 0.2);
  near(field.walls[0].max, max * 3);
  ok(field.walls[0].steel);
});

test('маг земли: с 50-го метеорит — урон землёй и огнём и долгое оглушение вокруг', () => {
  const battle = makeBattle(), mage = battle.place(level(50), 'earth', 2, 0), mob = walker(battle, 15, 1e9);
  still(mob);
  battle.random = () => 0.99;
  battle.step(TICK);
  ok(battle.events.some((e) => e.kind === 'meteor'));
  eq(mob.hp, mob.max, 'ещё летит');
  runFor(battle, 1.3);
  ok(battle.events.some((e) => e.kind === 'boom' && e.meteor));
  ok(hit(mob) >= mage.damage * mage.s[2].bonus * 0.9);
  ok(mob.holdUntil > battle.time + mage.s[2].stun - 2, 'надолго оглушён');
});

test('элементали: своя стихия их не берёт, остальное — как обычно', () => {
  const battle = makeBattle();
  const pyro = battle.place(level(10), 'pyro', 3, 4), gunner = battle.place(player(), 'gunner', 3, 6);
  const frost = battle.place(level(10), 'frost', 5, 4), alchemist = battle.place(player(), 'alchemist', 5, 6);
  const thunder = battle.place(player(), 'thunder', 7, 4);
  const ember = creature(battle, 'ember'), ice = creature(battle, 'frostling'), sludge = creature(battle, 'sludge');
  const storm = creature(battle, 'stormling');
  battle._hurt(ember, 50, pyro);
  battle._ignite(ember, pyro, 10, 3);
  eq(ember.hp, ember.max, 'огонь не берёт');
  no(ember.burn);
  battle._hurt(ember, 50, gunner);
  ok(ember.hp < ember.max, 'пули берут');
  battle._poison(sludge, alchemist, alchemist, 10, 3);
  no(sludge.poison, 'яд не берёт');
  battle._hurt(storm, 50, thunder);
  eq(storm.hp, storm.max, 'молния не берёт');
  ice.x = frost.cx;
  ice.y = frost.cy;
  battle._effects(TICK, battle.time);
  eq(ice.chill, 0, 'лёд не замедляет');
  battle._slow(ice, 0.5, 2, 'ice');
  eq(ice.slow, 0);
  ok(battle.events.some((e) => e.kind === 'immune'));
});

test('слизни: большой делится на двух средних, те — на маленьких; король — на двух больших; деление видно', () => {
  const battle = makeBattle(), t = battle.place(player(), 'gunner', 3, 4);
  battle.startWave(30, 3);
  battle.spawns = [];
  t.busy = 1e9;
  const big = creature(battle, 'slime3', 8, 10);
  battle._hurt(big, 100, t);
  const split = battle.events.find((e) => e.kind === 'split' && e.mob === big);
  ok(split && split.spots.length === 2, 'событие деления с местами детей');
  battle.step(TICK);
  eq(battle.mobs.filter((m) => m.split).length, 0, 'дети появляются, когда деление доиграло');
  runFor(battle, SPLIT_TIME);
  let pieces = battle.mobs.filter((m) => m.split);
  eq(pieces.map((m) => m.look), ['slime2', 'slime2']);
  for (const piece of pieces) {
    ok(split.spots.some(([x, y]) => Math.hypot(piece.x - x, piece.y - y) < 0.2), 'там, куда уехала половинка');
  }
  for (const piece of pieces) battle._hurt(piece, 1e9, t);
  runFor(battle, SPLIT_TIME + TICK);
  pieces = battle.mobs.filter((m) => m.split);
  eq(pieces.map((m) => m.look), ['slime1', 'slime1', 'slime1', 'slime1']);
  for (const piece of pieces) battle._hurt(piece, 1e9, t);
  runFor(battle, SPLIT_TIME + TICK);
  eq(battle.mobs.filter((m) => m.split).length, 0, 'маленькие умирают насовсем');
  const king = special(battle, 'elite', 'slimeking', 10);
  battle._hurt(king, 1e9, t);
  runFor(battle, SPLIT_TIME + TICK);
  eq(battle.mobs.filter((m) => m.split).map((m) => m.look), ['slime3', 'slime3']);
});

test('новые враги: появляются со своей волны и объявляются один раз', () => {
  const battle = makeBattle();
  for (const id of ['ember', 'frostling', 'stormling', 'sludge', 'slime1', 'slime2', 'slime3']) ok(lookOf(id).from, id);
  creature(battle, 'ember');
  creature(battle, 'ember');
  creature(battle, 'slime2');
  eq(battle.events.filter((e) => e.kind === 'newcomer').map((e) => e.look.id), ['ember', 'slime2']);
});

test('мобы: огненный бес разгоняет соседей, архидемон зовёт бесят', () => {
  const battle = makeBattle();
  battle.startWave(25, 3);
  battle.spawns = [];
  const blazer = special(battle, 'elite', 'blazer'), close = walker(battle, blazer.d - 0.5, 1e6);
  battle.step(TICK);
  eq(close.fury, POWERS.fury.boost);
  special(battle, 'boss', 'archdemon');
  runFor(battle, 2.2);
  const imps = battle.mobs.filter((m) => m.summoned && m.look === 'imp');
  eq(imps.length, POWERS.imps.count);
  ok(imps.every((m) => m.type === 'normal'));
});

test('скелеты: встают после смерти с полным здоровьем, второй раз — нет', () => {
  const battle = makeBattle(), gun = battle.place(player(), 'gunner', 2, 4);
  const skeleton = creature(battle, 'skeleton', 6, 100);
  battle._hurt(skeleton, 1e6, gun);
  battle.step(TICK);
  eq(battle.mobs.filter((m) => m.look === 'skeleton').length, 0, 'лежит');
  runFor(battle, 1.6);
  const risen = battle.mobs.find((m) => m.look === 'skeleton');
  ok(risen && risen.risen, 'встал');
  eq(risen.hp, risen.max);
  battle._hurt(risen, 1e6, gun);
  runFor(battle, 2);
  eq(battle.mobs.filter((m) => m.look === 'skeleton').length, 0, 'второй раз не встаёт');
});

test('мимик: за убийство — золото всем, кто бил; дошёл до сердца — зарылся без урона', () => {
  const battle = makeBattle(), a = player(), b = player();
  const ta = battle.place(a, 'gunner', 2, 4), tb = battle.place(b, 'gunner', 2, 6);
  const mimic = battle._spawn({ type: 'elite', kind: MIMIC, hp: 1000 }, 6);
  ok(mimic.treasure);
  battle._hurt(mimic, 10, tb);
  battle._hurt(mimic, 1e6, ta);
  ok(a.coins >= MIMIC.coins && b.coins >= MIMIC.coins, 'золото обоим');
  eq(battle.treasures, 1);
  ok(battle.events.some((e) => e.kind === 'clink') && battle.events.some((e) => e.kind === 'treasure'));
  const runner = battle._spawn({ type: 'elite', kind: MIMIC, hp: 1e9 }, battle.length - 2);
  for (let i = 0; i < 200 && !runner.dead; i++) battle.step(TICK);
  ok(runner.dead);
  eq(battle.lives, LIVES, 'жизни целы');
  ok(battle.events.some((e) => e.kind === 'burrow'));
});

test('элитные: выходят случайно и по нескольку, мимик — сверх них', () => {
  let elites = 0, waves = 0, mimics = 0, many = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const battle = makeBattle({ random: seeded(seed) });
    battle.startWave(30, 5);
    const count = battle.spawns.filter((s) => s.type === 'elite' && s.kind !== MIMIC).length;
    elites += count;
    if (count >= 2) many += 1;
    if (battle.spawns.some((s) => s.kind === MIMIC)) mimics += 1;
    waves += 1;
  }
  ok(elites / waves > 0.3, 'элитные частые');
  ok(many > 0, 'бывает по нескольку');
  ok(mimics > 0 && mimics < waves / 2, 'мимик иногда');
});

test('элитные: тень пропадает из прицелов, голема не остановить, ведьма оглушает защитника', () => {
  const battle = makeBattle(), sniper = battle.place(player(), 'sniper', 10, 4);
  const shade = put(battle, special(battle, 'elite', 'shade', 1e6), 10);
  shade.powerUntil = battle.time + 2;
  eq(battle._target(sniper), null, 'невидимую не видно');
  shade.powerUntil = 0;
  ok(battle._target(sniper) === shade);
  const golem = special(battle, 'elite', 'golem', 1e6);
  battle._hold(golem, 3, sniper);
  battle._hold(golem, 3, sniper, true);
  battle._slow(golem, 0.5, 3);
  battle._push(golem, 2, sniper);
  eq(golem.holdUntil, 0, 'даже сеть не держит');
  eq(golem.slow, 0);
  eq(golem.pushed, 0);
  const witch = put(battle, special(battle, 'elite', 'witch', 1e6), 10);
  battle._hex(witch, POWERS.hex);
  ok(sniper.stunUntil > battle.time, 'оглушён');
});

test('элитные: вампир лечится, когда рядом гибнут, прыгун скачет вперёд', () => {
  const battle = makeBattle(), gun = battle.place(player(), 'gunner', 2, 4);
  const vampire = special(battle, 'elite', 'vampire', 1000), victim = walker(battle, 5, 10);
  vampire.hp = 500;
  battle._hurt(victim, 100, gun);
  ok(vampire.hp > 500);
  const blinker = special(battle, 'elite', 'blinker', 1e6), before = blinker.d;
  blinker.powerAt = battle.time;
  battle.step(TICK);
  ok(blinker.d > before + 2, 'прыгнул');
});

test('элитные: вампир сам по себе не лечится и не лечит соседей', () => {
  const battle = makeBattle();
  const vampire = special(battle, 'elite', 'vampire', 1000), friend = walker(battle, 5, 1000);
  vampire.hp = 500;
  friend.hp = 400;
  for (const mob of [vampire, friend]) mob.holdUntil = 1e9;
  runFor(battle, 5);
  eq([vampire.hp, friend.hp], [500, 400]);
});

test('каменный маг перебежал — новая стена встаёт сразу, старая убрана', () => {
  const battle = makeBattle(), mage = battle.place(level(10), 'earth', 10, 4);
  runFor(battle, 1.2);
  const old = battle.walls[0], spot = battle.bestCell(mage.range);
  ok(old);
  ok(battle.move(mage, spot.x, spot.y));
  eq(battle.walls.filter((wall) => wall.tower === mage).length, 1);
  const wall = battle.walls[0];
  no(wall === old, 'стена новая');
  ok(Math.hypot(wall.x - mage.cx, wall.y - mage.cy) <= mage.range, 'рядом с новым местом');
  eq(wall.hp, wall.max);
});

test('затянувшаяся волна: через две минуты после последнего моба выжившие звереют и идут сквозь стены', () => {
  const battle = makeBattle();
  const mage = battle.place(level(10), 'earth', 10, 4);
  runFor(battle, 0.2);
  mage.busy = 1e9;
  const wall = battle.walls[0], mob = walker(battle, Math.max(0, wall.d - 1.5), 1e12);
  wall.hp = wall.max = 1e12;
  runFor(battle, OVERTIME - 10);
  no(mob.wild, 'пока рано');
  ok(mob.wall === wall, 'стоит у стены');
  runFor(battle, 15);
  ok(mob.wild, 'рассвирепел');
  ok(battle.events.some((e) => e.kind === 'wild'));
  battle._hold(mob, 5, null);
  ok(mob.holdUntil <= battle.time, 'оковы не держат');
  for (let i = 0; i < 4000 && battle.lives === LIVES; i++) battle.step(TICK);
  ok(battle.lives < LIVES, 'прошёл сквозь стену к сердцу');
});

test('новые мобы: воришка крадёт монеты, добивший забирает украденное', () => {
  const battle = makeBattle();
  const rich = battle.place(player(), 'frost', 6, 4);
  const gun = battle.place(player(), 'gunner', 2, 6);
  rich.player.coins = 50;
  const thief = creature(battle, 'thief', 4, 1e9);
  runFor(battle, 3);
  eq(rich.player.coins, 47);
  eq(thief.stolen, 3);
  const before = gun.player.coins;
  battle._hurt(thief, 1e12, gun);
  ok(gun.player.coins >= before + 3, 'украденное — добившему');
  ok(battle.events.some((e) => e.kind === 'loot'));
});

test('новые мобы: крот под землёй — не виден, не ранится, проходит под стеной', () => {
  const battle = makeBattle(), gun = battle.place(player(), 'gunner', 6, 4), mole = creature(battle, 'mole', 5);
  mole.underUntil = 1e9;
  mole.burrowAt = 1e9;
  eq(battle._target(gun), null);
  battle._hurt(mole, 100, gun);
  eq(mole.hp, 1e6);
  battle.walls.push({ tower: gun, i: 7, d: 8, x: 7.5, y: 5.5, hp: 1e12, max: 1e12, hitAt: -1e9 });
  runFor(battle, 5);
  ok(mole.d > 8, 'под стеной прошёл');
});

test('новые мобы: призрак бесплотен — урон вдвое слабее', () => {
  const battle = makeBattle(), gun = battle.place(player(), 'gunner', 3, 4), ghost = creature(battle, 'ghost', 5);
  ok(ghost.undead);
  ghost.phaseUntil = 1e9;
  battle._hurt(ghost, 100, gun);
  ok(Math.abs(1e6 - ghost.hp - 50) < 1e-6);
});

test('новые мобы: щитоносец держит удар спереди, сбоку и сзади — полный урон', () => {
  const battle = makeBattle();
  const ahead = battle.place(player(), 'gunner', 9, 4);
  const behind = battle.place(player(), 'gunner', 2, 4);
  const knight = creature(battle, 'shieldbearer', 6);
  battle._hurt(knight, 100, ahead);
  ok(Math.abs(1e6 - knight.hp - 40) < 1e-6, 'спереди — 40%');
  const hp = knight.hp;
  battle._hurt(knight, 100, behind);
  ok(Math.abs(hp - knight.hp - 100) < 1e-6, 'сзади — полностью');
});

test('новые мобы: гарпия летает и оглушает ближайшего защитника', () => {
  const battle = makeBattle(), gun = battle.place(player(), 'gunner', 5, 4), harpy = creature(battle, 'harpy', 5);
  ok(harpy.flying && harpy.power.id === 'swoop');
  harpy.powerAt = battle.time;
  battle.step(TICK);
  ok(gun.stunUntil > battle.time);
});

test('новые мобы: мираж от первого удара распадается, копии пустые и сердцу не вредят', () => {
  const battle = makeBattle(), gun = battle.place(player(), 'gunner', 3, 4), mirage = creature(battle, 'mirage', 6);
  battle._hurt(mirage, 1, gun);
  battle.step(TICK);
  const copies = battle.mobs.filter((m) => m.fake);
  eq(copies.length, 2);
  battle._hurt(mirage, 1, gun);
  battle.step(TICK);
  eq(battle.mobs.filter((m) => m.fake).length, 2, 'второй раз не делится');
  const coins = gun.player.coins;
  battle._hurt(copies[0], 1, gun);
  ok(copies[0].dead);
  eq(gun.player.coins, coins, 'за копию ничего');
  copies[1].d = battle.length - 1;
  for (let i = 0; i < 100 && !copies[1].dead; i++) battle.step(TICK);
  ok(copies[1].dead);
  eq(battle.lives, LIVES);
});

test('новые элитные: гоблин-шаман даёт щит, огр роняет гоблинов', () => {
  const battle = makeBattle(), gun = battle.place(player(), 'gunner', 3, 4);
  const shaman = special(battle, 'elite', 'goblinshaman', 1000), other = walker(battle, 5, 1000);
  shaman.powerAt = battle.time;
  battle.step(TICK);
  ok(other.ward > 0);
  const hp = other.hp;
  battle._hurt(other, other.ward / 2, gun);
  eq(other.hp, hp, 'щит принял удар');
  const field = makeBattle(), axe = field.place(player(), 'gunner', 3, 4), ogre = special(field, 'elite', 'ogre', 1000);
  field._hurt(ogre, 300, axe);
  field.step(TICK);
  eq(field.mobs.filter((m) => m.look === 'goblin').length, 1, 'потерял четверть — уронил одного');
  field._hurt(ogre, 1e6, axe);
  field.step(TICK);
  eq(field.mobs.filter((m) => m.look === 'goblin').length, 3, 'умер — спрыгнули остальные');
});

test('новые элитные: зеркальщик отражает удар, броненосец сворачивается', () => {
  const battle = makeBattle(), gun = battle.place(player(), 'gunner', 3, 4);
  const knight = special(battle, 'elite', 'mirrorknight', 1000);
  knight.powerUntil = battle.time + 2;
  battle._hurt(knight, 100, gun);
  eq(knight.hp, 1000);
  ok(gun.stunUntil > battle.time, 'стрелявший оглушён');
  battle._hurt(knight, 100, gun);
  eq(knight.hp, 900, 'зеркало держит один удар');
  const armadillo = special(battle, 'elite', 'armadillo', 1000);
  battle._hurt(armadillo, 200, gun);
  ok(armadillo.powerUntil > battle.time);
  battle._hurt(armadillo, 200, gun);
  eq(armadillo.hp, 800, 'свернувшись, неуязвим');
});

test('новые боссы: червь под землёй, вынырнув — глотает мины; дракон жжёт линию; матка опутывает', () => {
  const battle = makeBattle();
  const gun = battle.place(player(), 'gunner', 6, 4);
  const worm = special(battle, 'boss', 'worm', 1000);
  eq(worm.leak, 10);
  eq(battle._target(gun), null, 'под землёй');
  battle._hurt(worm, 100, gun);
  eq(worm.hp, 1000);
  battle.mines.push({ tower: gun, i: 4, x: worm.x, y: worm.y, kind: 'mine' });
  battle.step(TICK);
  eq(battle.mines.length, 1, 'под землёй мины не рвёт');
  worm.powerAt = battle.time;
  battle.step(TICK);
  eq(battle.mines.length, 0, 'вынырнул — проглотил');
  ok(battle._target(gun) === worm);
  const sky = makeBattle(), a = sky.place(player(), 'gunner', 7, 4), b = sky.place(player(), 'gunner', 9, 3);
  const c = sky.place(player(), 'gunner', 2, 9), dragon = special(sky, 'boss', 'dragon', 1000);
  ok(dragon.flying);
  sky.mines.push({ tower: a, i: 5, x: 6, y: 5, kind: 'mine' });
  dragon.powerAt = sky.time;
  sky.step(TICK);
  ok(a.stunUntil > sky.time && b.stunUntil > sky.time, 'на линии оглушены');
  ok(c.stunUntil <= sky.time, 'в стороне — нет');
  eq(sky.mines.length, 0, 'мина на линии сгорела');
  sky._hurt(dragon, 100, a, 'fire');
  near(hit(dragon), 50, 'огонь вдвое слабее');
  const lair = makeBattle();
  const web = lair.place(player(), 'gunner', 5, 4);
  const queen = special(lair, 'boss', 'spiderqueen', 1000);
  queen.powerAt = lair.time;
  lair.step(TICK);
  ok(web.webUntil > lair.time);
  const slow = lair._intervalOf(web, lair.time);
  web.webUntil = 0;
  ok(slow > lair._intervalOf(web, lair.time) * 1.9, 'бьёт вдвое медленнее');
  lair._hurt(queen, 1e9, web);
  lair.step(TICK);
  eq(lair.mobs.filter((m) => m.look === 'spiderling').length, 8);
});

test('новые мобы: гоблины и паучата сами в волнах не выходят', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const battle = makeBattle({ random: seeded(seed) });
    battle.startWave(70, 5);
    no(battle.spawns.some((spawn) => spawn.look && spawn.look.only), 'seed ' + seed);
  }
});

const FORK = Array.from({ length: 5 }, (_, y) => [10, y]);
function mapWith(marks = {}, biome = 'grass') {
  const tiles = new Array(SIZE * SIZE).fill('');
  for (const [tile, cells] of Object.entries(marks)) for (const [x, y] of cells) tiles[y * SIZE + x] = tile;
  return new Battle({ path: STRAIGHT, branch: FORK, merge: 10, tiles, biome }, { random: seeded(7) });
}

test('мины и капканы на повороте ложатся на путь мобов, моб на повороте их задевает', () => {
  const bent = Array.from({ length: 7 }, (_, x) => [x, 5]).concat(Array.from({ length: 10 }, (_, k) => [6, 6 + k]));
  const battle = new Battle(bent, { random: seeded(3) }), corner = 6;
  const miner = battle.place(level(30), 'miner', 5, 6), hunter = battle.place(level(10), 'hunter', 7, 4);
  const path = [];
  const probe = { r: 0, d: 0, x: 0, y: 0 };
  for (let d = 0; d <= battle.length; d += 0.02) {
    probe.d = d;
    battle._onRoute(probe);
    path.push([probe.x, probe.y]);
  }
  const gap = (item) => Math.min(...path.map(([x, y]) => Math.hypot(item.x - x, item.y - y)));
  for (let n = 0; n < 60; n++) {
    battle.mines = [];
    battle._plant(miner, [corner]);
    ok(gap(battle.mines[0]) < 0.2, 'мина на пути: ' + gap(battle.mines[0]).toFixed(2));
  }
  battle._setTrap(hunter);
  for (const trap of battle.traps) ok(gap(trap) < 0.05, 'капкан на пути');
  battle.remove(hunter);
  battle.traps = [];
  battle.mines = [];
  battle._plant(miner, [corner]);
  const mine = battle.mines[0], mob = walker(battle, corner - 1, 1e6);
  runFor(battle, 3);
  no(battle.mines.includes(mine), 'моб на повороте подорвался');
  ok(mob.max - mob.hp > 0);
});

test('мясник: раз в 10 секунд крюк летит пару секунд и пару секунд тащит защитника на клетку рядом с собой', () => {
  const battle = makeBattle(), far = battle.place(player(), 'gunner', 15, 1);
  const butcher = put(battle, special(battle, 'boss', 'butcher', 1e9), 4);
  butcher.speed = 0;
  eq(butcher.skill.id, 'hook');
  runFor(battle, POWERS.hook.first + 0.1);
  ok(butcher.hook && butcher.hook.tower === far, 'крюк летит');
  ok(battle.events.some((e) => e.kind === 'hook' && e.tower === far));
  eq([far.x, far.y], [15, 1], 'пока летит — защитник на месте');
  runFor(battle, POWERS.hook.fly);
  const mx = Math.floor(butcher.x), my = Math.floor(butcher.y);
  ok(Math.max(Math.abs(far.x - mx), Math.abs(far.y - my)) === 1, 'на соседней клетке: ' + [far.x, far.y, mx, my]);
  ok(!battle.road.some(([x, y]) => x === far.x && y === far.y), 'не на дороге');
  ok(far.pull && far.busy > battle.time, 'пока тащат — не стреляет');
  runFor(battle, POWERS.hook.pull + 0.1);
  eq(butcher.hook, null, 'дотащил');
  const second = butcher.skillAt;
  ok(Math.abs(second - (POWERS.hook.first + POWERS.hook.every)) < 0.2, 'следующий — через 10 секунд');
});

test('карта: с вышки бьют на 2,5 клетки дальше и поверх гор, на вышке — один защитник', () => {
  const battle = mapWith({ watch: [[6, 3]], mountain: [[6, 4]] });
  const plain = battle.place(player(), 'sniper', 12, 3), high = battle.place(player(), 'sniper', 6, 3);
  ok(Math.abs(high.range - plain.range - TERRAIN.watch) < 1e-9, 'дальше на ' + TERRAIN.watch);
  no(battle.free(6, 3), 'вышка занята');
  const below = walker(battle, 7, 1e6);
  ok(battle.covered(6.5, 4.5) && battle.sees(high, below), 'гора между ними не мешает');
  const frost = battle.place(player(), 'frost', 8, 3), radius = frost.range;
  battle.move(high, 7, 3);
  battle.move(frost, 6, 3);
  near(frost.range, radius + TERRAIN.watch, 'и буря шире');
  battle.move(frost, 8, 3);
  near(frost.range, radius, 'сошёл — как было');
});

test('карта: волна идёт сразу из обоих входов, вторые у слияния встают на общую дорогу и доходят до сердца', () => {
  const battle = mapWith();
  const mob = battle._spawn({ type: 'normal', hp: 1e6 }, 0, 1);
  battle.step(TICK);
  ok(mob.x === 10.5 && mob.y < 1, 'вышел сверху: ' + [mob.x, mob.y]);
  let crossed = false;
  for (let i = 0; i < 4000 && !mob.biting; i++) {
    battle.step(TICK);
    if (mob.r === 0 && !crossed) {
      crossed = true;
      ok(Math.abs(mob.x - 10.5) < 0.2 && Math.abs(mob.y - 5.5) < 0.2, 'на слиянии');
    }
  }
  ok(crossed && mob.biting, 'дошёл до сердца');
  battle.startWave(3, 2);
  const [first, second] = battle.spawns;
  eq([first.r, second.r], [0, 1], 'волна идёт из обоих входов');
  eq(first.at, second.at, 'сразу, парами');
  eq(battle.spawns.filter((spawn) => spawn.r).length, Math.floor(battle.spawns.length / 2), 'поровну');
});

test('карта: гора закрывает выстрел, в тоннеле моба не достать; на горы, озёра, реки и тоннели не встать', () => {
  const battle = mapWith({ mountain: [[3, 4]], tunnel: [[0, 5], [1, 5]], lake: [[7, 4]], river: [[9, 3], [9, 4]],
    bridge: [[9, 5]] });
  const gun = battle.place(player(), 'gunner', 3, 3);
  gun.range = 4;
  for (const [x, y] of [[3, 4], [7, 4], [0, 5], [9, 4]]) no(battle.free(x, y), 'занято: ' + x + ',' + y);
  const hidden = walker(battle, 4, 1e6), open = walker(battle, 7, 1e6);
  for (const mob of [hidden, open]) mob.holdUntil = 1e9;
  ok(battle._target(gun) === open, 'бьёт того, кого видит');
  put(battle, open, 30);
  eq(battle._target(gun), null, 'за горой не видно');
  put(battle, hidden, 30);
  const deep = walker(battle, 1.6, 1e6);
  deep.holdUntil = 1e9;
  const close = battle.place(player(), 'gunner', 1, 4);
  eq(battle._target(close), null, 'в тоннеле не видно');
});

test('карта: с вышки видно поверх гор, но моба в тоннеле не достать ничем — ни выстрелом, ни взрывом рядом', () => {
  const battle = mapWith({ watch: [[2, 4]], tunnel: [[0, 5], [1, 5]] });
  const tower = battle.place(player(), 'gunner', 2, 4);
  ok(battle.onWatch(tower));
  const deep = walker(battle, 1.6, 1e6), outside = walker(battle, 3.5, 1e6);
  still(deep, outside);
  ok(battle._target(tower) === outside, 'бьёт того, кто снаружи');
  put(battle, outside, 30);
  eq(battle._target(tower), null, 'в тоннеле не видно и с вышки');
  battle._hurt(deep, 500, tower);
  eq(hit(deep), 0, 'взрыв рядом не задевает моба в тоннеле');
});

test('бой: неуязвимого к своей стихии бьют в последнюю очередь', () => {
  const battle = makeBattle(), pyro = battle.place(player(), 'pyro', 10, 4);
  const ember = creature(battle, 'ember', 11.2), zombie = creature(battle, 'zombie', 10.4);
  still(ember, zombie);
  ok(battle._target(pyro) === zombie, 'огонь не берёт элементаля — бьёт зомби, хоть элементаль и впереди');
  zombie.dead = true;
  ok(battle._target(pyro) === ember, 'других нет — бьёт кого есть');
});

test('карта: в снегах на льду озёр и рек стоять можно; в расщелину, кратер, руины и древности не встать нигде', () => {
  const marks = { lake: [[7, 4]], river: [[8, 4]], chasm: [[3, 4], [3, 3]], crater: [[5, 6]], ruin: [[12, 4]],
    stones: [[14, 6]], crypt: [[16, 4]], bones: [[18, 6]] };
  const grass = mapWith(marks), snow = mapWith(marks, 'snow');
  for (const [x, y] of [[7, 4], [8, 4]]) {
    no(grass.free(x, y), 'в воду не встать');
    ok(snow.free(x, y), 'на лёд можно');
  }
  for (const [x, y] of [[3, 4], [5, 6], [12, 4], [14, 6], [16, 4], [18, 6]]) {
    no(grass.free(x, y), 'занято: ' + x + ',' + y);
    no(snow.free(x, y), 'и в снегах: ' + x + ',' + y);
  }
});

test('карта: руины, круг камней и склеп закрывают выстрел, как гора; расщелина, кратер и кости — нет', () => {
  for (const [tile, hides] of [['ruin', true], ['stones', true], ['crypt', true], ['chasm', false], ['crater', false],
    ['bones', false]]) {
    const battle = mapWith({ [tile]: [[3, 4]] }), gun = battle.place(player(), 'gunner', 3, 3);
    gun.range = 4;
    const mob = walker(battle, 4, 1e6);
    still(mob);
    eq(battle._target(gun) === mob, !hides, tile);
  }
  const battle = mapWith({ ruin: [[3, 4]], watch: [[3, 3]] }), tower = battle.place(player(), 'gunner', 3, 3);
  const mob = walker(battle, 4, 1e6);
  still(mob);
  ok(battle._target(tower) === mob, 'с вышки видно и поверх руин');
});

test('карта: с холма бьют дальше', () => {
  const battle = mapWith({ hill: [[6, 4]] });
  const flat = battle.place(player(), 'gunner', 2, 4), high = battle.place(player(), 'gunner', 6, 4);
  ok(Math.abs(high.range - flat.range - TERRAIN.hill) < 1e-9);
  battle.move(flat, 6, 3);
  battle.move(high, 7, 3);
  ok(Math.abs(high.range - flat.range) < 1e-9, 'сошёл с холма — как все');
});

test('биомы: в вулкане лёд слабее, в снегах — огонь', () => {
  const blow = (biome, cls) => {
    const battle = mapWith({}, biome), t = battle.place(player(), cls, 3, 4), mob = walker(battle, 4, 1e6);
    battle._hurt(mob, 100, t);
    return hit(mob);
  };
  near(blow('volcano', 'frost'), 100 * TERRAIN.weak);
  near(blow('volcano', 'pyro'), 100);
  near(blow('snow', 'pyro'), 100 * TERRAIN.weak);
  near(blow('grass', 'frost'), 100);
  const battle = mapWith({}, 'volcano'), mob = walker(battle, 4, 1e6);
  battle._slow(mob, 0.5, 2, 'ice');
  eq(mob.slow, 0.5 * TERRAIN.weak, 'и замедляет слабее');
});

test('биомы: в болоте ходячие медленнее и их больше, в пустыне — летучие', () => {
  const count = (biome, wave, check) => {
    const battle = mapWith({}, biome);
    battle.nextFamily = FAMILY_BY_ID.get('beasts');
    battle.startWave(wave, 4);
    return battle.spawns.filter((spawn) => check(Boolean((spawn.kind || spawn.look || {}).flying))).length;
  };
  ok(count('swamp', 12, (fly) => !fly) > count('grass', 12, (fly) => !fly), 'ходячих больше');
  ok(count('desert', 16, (fly) => fly) > count('grass', 16, (fly) => fly), 'летучих больше');
  const speed = (biome, look) => walker(mapWith({}, biome), 4, 100, look).speed;
  ok(speed('swamp', null) < speed('grass', null));
  ok(speed('desert', bat()) > speed('grass', bat()));
  eq(speed('swamp', bat()), speed('grass', bat()), 'летучим болото нипочём');
});

test('биомы: на кладбище павший с телом встаёт скелетом, бестелесный и уже вставший — нет', () => {
  const battle = mapWith({}, 'graveyard'), gun = battle.place(player(), 'gunner', 18, 0);
  const zombie = walker(battle, 4, 10), slime = walker(battle, 5, 10, LOOKS.normal.find((l) => l.id === 'slime2'));
  battle._hurt(zombie, 100, gun);
  battle._hurt(slime, 100, gun);
  runFor(battle, 3);
  const risen = battle.mobs.filter((mob) => mob.risen && mob.look === 'skeleton');
  eq(risen.length, 1, 'встал один');
  ok(risen[0].d >= zombie.d - 1e-9 && risen[0].d < zombie.d + 3, 'там же, где пал');
  battle._hurt(risen[0], 1e6, gun);
  runFor(battle, 3);
  eq(battle.mobs.filter((mob) => mob.look === 'skeleton').length, 0, 'второй раз не встаёт');
  const plain = mapWith(), mob = walker(plain, 4, 10);
  plain._hurt(mob, 100, plain.place(player(), 'gunner', 3, 4));
  runFor(plain, 3);
  eq(plain.mobs.length, 0, 'на других картах не встают');
});

test('карта: мобы появляются у выхода из пещеры, паразит в горе не виден и не кусает', () => {
  const battle = mapWith({ tunnel: [[0, 5], [1, 5], [10, 0], [10, 1], [14, 5], [15, 5]] });
  battle.startWave(1, 1);
  battle.step(TICK);
  const first = battle.mobs.find((mob) => mob.r === 0), second = battle.mobs.find((mob) => mob.r === 1);
  ok(first && second, 'вышли из обоих');
  ok(first.d > 2.2 && first.d < 2.5 && second.d > 2.2 && second.d < 2.5, 'у самого выхода: ' + [first.d, second.d]);
  runFor(battle, 0.3);
  no(battle.covered(first.x, first.y), 'вышел на свет');
  const bug = battle.placeRider(level(20), 'parasite');
  eq([bug.x, bug.y], STRAIGHT[battle.gate]);
  no(battle.covered(bug.cx, bug.cy), 'ждёт не в горе');
  const host = walker(battle, 15.5, 1e6);
  host.holdUntil = 1e9;
  bug.host = host;
  battle.time = Math.max(battle.time, bug.leapUntil);
  ok(battle.covered(host.x, host.y));
  eq(battle._target(bug), null, 'в тоннеле не кусает');
});

test('паразит: на одном мобе только один — второй берёт следующего по силе, свободных нет — ждёт', () => {
  const battle = makeBattle();
  const first = battle.placeRider(level(20), 'parasite');
  const second = battle.placeRider(level(20), 'parasite');
  const strong = walker(battle, 2, 500), weak = walker(battle, 6, 50);
  for (const mob of [strong, weak]) mob.holdUntil = 1e9;
  battle.step(TICK);
  ok(first.host === strong, 'первый — на самого крепкого');
  ok(second.host === weak, 'второй — на следующего, хоть прыгали разом');
  battle._hurt(weak, 1e6, second);
  battle.step(TICK);
  eq(second.host, null, 'свободных мобов нет — ждёт, на занятого не прыгает');
  const fresh = walker(battle, 4, 80);
  fresh.holdUntil = 1e9;
  battle.step(TICK);
  ok(second.host === fresh, 'появился свободный — прыгнул');
});

test('карта: на повороте моб идёт по дуге, как нарисована дорога, а не срезает угол клетки', () => {
  const corner = Array.from({ length: 8 }, (_, x) => [x, 5]).concat(Array.from({ length: 8 }, (_, y) => [7, y + 6]));
  const battle = makeBattle({ path: corner }), mob = walker(battle, 1, 1e6);
  const at = (d) => {
    put(battle, mob, d);
    return [mob.x, mob.y];
  };
  const [x, y] = at(8);
  ok(Math.hypot(x - 7.5, y - 5.5) > 0.25, 'в углу клетки его нет: ' + [x, y]);
  ok(x < 7.5 && y > 5.5, 'проходит внутри поворота');
  const before = at(6.5), after = at(9.5);
  eq([before[1], after[0]], [5.5, 7.5], 'на прямых — по центру дороги');
  let jump = 0, last = at(6);
  for (let d = 6.05; d <= 10; d += 0.05) {
    const next = at(d);
    jump = Math.max(jump, Math.hypot(next[0] - last[0], next[1] - last[1]));
    last = next;
  }
  ok(jump < 0.08, 'без рывков: ' + jump);
});

test('карта: моб второго входа вливается в главную дорогу на повороте без рывка', () => {
  const path = Array.from({ length: 11 }, (_, x) => [x, 5]).concat(Array.from({ length: 10 }, (_, y) => [10, y + 6]));
  const battle = new Battle({ path, branch: FORK, merge: 10, tiles: new Array(SIZE * SIZE).fill(''), biome: 'grass' },
    { random: seeded(7) });
  const mob = battle._spawn({ type: 'normal', hp: 1e6 }, 3, 1);
  let last = [mob.x, mob.y], jump = 0;
  for (let i = 0; i < 200; i++) {
    battle.step(TICK);
    jump = Math.max(jump, Math.hypot(mob.x - last[0], mob.y - last[1]));
    last = [mob.x, mob.y];
  }
  eq(mob.r, 0, 'перешёл на главную');
  ok(jump < 0.15, 'шаг за кадр без скачка: ' + jump.toFixed(3));
});
