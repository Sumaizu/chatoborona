import { test, eq, ok, no } from './harness.js';
import { STRAIGHT, makeBattle, player, runFor, seeded } from './fixtures.js';
import { AIM, BITE_TIME, Battle, CRIMSON, WOOD, DISCHARGE, GRENADE, HEADWIND, MECH, MOVE_PAUSE, OVERTIME, FIRE,
  PLANTED, PULSE, REACTIONS, ROT, SECOND, SHOT, SPLIT_TIME, THORN }
  from '../../site/reborn/js/battle.js';
import { SIZE } from '../../site/reborn/js/field.js';
import { AFFIXES, BOSSES, DIABLO, ELITES, FAMILIES, FAMILY_BY_ID, FINALE, LIVES, LOOKS, MIGHT, MIMIC, MOBS, POWERS,
  SILVER, TERRAIN, TICK, familyPool, resistOf, silverChance, waveHp, waveSpawns, xpForLevel }
  from '../../site/reborn/js/balance.js';
import { ASSIST_COINS, KILL_COINS } from '../../site/reborn/js/gacha.js';
import { CLASSES, CLASS_BY_ID, RUNE_CAPS, baseOf } from '../../site/reborn/js/classes.js';

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
  no(battle.place(player(), 'mechanic', 3, 5), 'дорога');
  ok(battle.place(player(), 'mechanic', 3, 4));
  no(battle.place(player(), 'mechanic', 3, 4), 'занято');
  no(battle.place(player(), 'mechanic', 20, 4), 'за полем');
});

test('бой: защитник у дороги убивает, получает опыт, монеты и убийства', () => {
  const battle = makeBattle(), hero = level(40), earn = CLASS_BY_ID.get('mechanic').earn;
  battle.setMods(battle.place(hero, 'mechanic', 2, 4), { runes: ['turret'] });
  battle.startWave(1, 1);
  finish(battle);
  eq(battle.lives, LIVES);
  const count = waveSpawns(1).length;
  eq(hero.kills, count);
  ok(hero.xp >= xpForLevel(40) + count);
  near(hero.coins, KILL_COINS * MOBS.normal.coins * earn.coins * count);
});

test('бой: опыт и монеты за помощь, убийство — добившему', () => {
  const battle = makeBattle(), a = level(20), b = level(20), earn = CLASS_BY_ID.get('frost').earn;
  const ta = battle.place(a, 'frost', 2, 4), tb = battle.place(b, 'frost', 2, 6);
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

test('мощь: от уровня не растёт; урон и способности — в мощь раз, скорость, крит и дальность — свои у класса', () => {
  const battle = makeBattle(), cls = CLASS_BY_ID.get('mechanic'), base = baseOf(cls);
  const young = battle.place(player(), 'mechanic', 2, 4), old = battle.place(level(100), 'mechanic', 4, 4);
  eq([old.might, old.damage, old.interval, old.critChance], [young.might, young.damage, young.interval,
    young.critChance], 'уровень мощь не меняет');
  eq(young.might, MIGHT.base);
  near(young.damage, base.damage);
  near(young.skill, base.skill);
  near(young.interval, base.interval);
  near(young.critChance, base.crit);
  const strong = battle.place(player(), 'mechanic', 6, 4);
  battle.setMods(strong, { power: 50 });
  eq(strong.might, 150);
  near(strong.damage, young.damage * 1.5, 'урон — в полтора раза');
  near(strong.skill, young.skill * 1.5, 'способности — тоже');
  eq([strong.interval, strong.critChance, strong.critMul, strong.range], [young.interval, young.critChance,
    young.critMul, young.range], 'скорость, крит и дальность от оружия не меняются');
  battle.setMods(strong, { power: 50, paragon: 2 });
  eq(strong.might, Math.round(150 * (1 + 2 * MIGHT.paragon)), 'парагон — +5% мощи за каждый');
});

test('мощь: баффы саппортов растут от мощи мягче, чем урон', () => {
  const battle = makeBattle(), flag = battle.place(player(), 'banner', 4, 4);
  eq(flag.lift, 1);
  battle.setMods(flag, { power: 100 });
  near(flag.lift, 1 + MIGHT.lift);
  ok(flag.lift < flag.might / MIGHT.base);
});

test('закалка: каждые 10 волн контроль и уязвимость действуют на мобов слабее, но не до нуля', () => {
  const effect = (wave) => {
    const battle = makeBattle(), t = battle.place(player(), 'mechanic', 2, 4);
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

test('бой: боец не стреляет, пока не повернётся к мобу, и после выстрела миг держит прицел', () => {
  const battle = makeBattle(), t = battle.place(player(), 'mechanic', 10, 4);
  const mob = walker(battle, 12, 1e9);
  still(mob);
  const want = Math.atan2(mob.x - t.cx, -(mob.y - t.cy));
  t.angle = want + Math.PI;
  const shots = () => battle.events.filter((e) => e.kind === 'shot').length;
  battle.step(TICK);
  eq(shots(), 0, 'отвернулся — сначала поворачивается');
  ok(Math.abs(Math.atan2(Math.sin(t.angle - want), Math.cos(t.angle - want))) > AIM.slack, 'поворот не мгновенный');
  let spent = TICK;
  while (!shots() && spent < 2) {
    battle.step(TICK);
    spent += TICK;
  }
  ok(shots() === 1, 'выстрелил, когда повернулся');
  ok(spent >= (Math.PI - AIM.slack) / AIM.turn - TICK, 'не раньше, чем довернулся: ' + spent.toFixed(2));
  ok(Math.abs(Math.atan2(Math.sin(t.angle - want), Math.cos(t.angle - want))) <= AIM.slack);
  ok(t.aimHold > battle.time && t.aimMob === mob, 'после выстрела держит прицел на нём');
});

test('бой: после перехода на другую клетку защитник секунду не стреляет', () => {
  const battle = makeBattle(), hero = level(30), tower = battle.place(hero, 'mechanic', 1, 4);
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
  const battle = makeBattle(), tower = battle.place(player(), 'mechanic', 2, 4);
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
  const tower = battle.place(hero, 'mechanic', 2, 4);
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
    battle.place(level(100), 'mechanic', 4, 4);
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
    battle.place(level(100), 'mechanic', 4, 4);
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

test('мобы: босс объявляется всегда, золотой элитный — при первой встрече вида, серебряный — при первом свойстве', () => {
  const battle = makeBattle(), arrived = () => battle.events.filter((e) => e.kind === 'arrive').length;
  special(battle, 'elite', 'vampire');
  special(battle, 'elite', 'vampire');
  eq(arrived(), 1, 'второй такой же элитный — без объявления');
  special(battle, 'elite', ELITES.find((k) => k.id !== 'vampire').id);
  eq(arrived(), 2, 'новый вид — с объявлением');
  special(battle, 'boss', 'crusher');
  special(battle, 'boss', 'crusher');
  eq(arrived(), 4, 'босс — каждый раз');
  const silvers = () => battle.events.filter((e) => e.kind === 'silver').length;
  for (let i = 0; i < 2; i++) battle._spawn({ type: 'normal', hp: 100, silver: AFFIXES[0] }, 3);
  eq(silvers(), 1, 'свойство серебряного — один раз');
});

test('мобы: броня режет урон, щит не пускает урон совсем', () => {
  const battle = makeBattle(), t = battle.place(player(), 'mechanic', 2, 4);
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
  slime._hurt(mother, 1e9, slime.place(player(), 'mechanic', 2, 4));
  runFor(slime, SPLIT_TIME + TICK);
  ok(slime.mobs.filter((mob) => mob.look === 'slime2').length >= 2, 'и распадается на слизней');
});

const quiet = (mob) => {
  mob.power = null;
  mob.speed = 0;
  return mob;
};

function shooter(battle, x, y, runes) {
  const t = battle.place(player(), 'sniper', x, y);
  battle.setMods(t, { runes });
  t.critChance = 0;
  battle.random = () => 0.99;
  return t;
}

function mechanic(battle, x, y, runes) {
  const t = battle.place(player(), 'mechanic', x, y);
  battle.setMods(t, { runes });
  t.critChance = 0;
  t.cooldown = 1e9;
  battle.random = () => 0.99;
  return t;
}

const near1 = (drone, mob) => Math.hypot(drone.x - mob.x, drone.y - mob.y) < MECH.drone.hover + 0.2;

const firedBy = (battle, kind) => {
  const start = battle.events.length;
  return () => battle.events.slice(start).filter((e) => e.kind === kind);
};

test('механик: без стиля — пистолет, по пуле в того, кто ближе к сердцу', () => {
  const battle = makeBattle(), t = mechanic(battle, 10, 4, []);
  eq(t.cls.name, 'Механик');
  const back = walker(battle, 9, 1e9), front = walker(battle, 12, 1e9), shots = firedBy(battle, 'shot');
  still(back, front);
  ok(battle._fire(t));
  eq(shots().length, 1);
  near(hit(front), t.damage, 'в того, кто впереди');
  eq(hit(back), 0);
});

test('механик-турельщик: очередь по 3 пули в одну цель, после 15 пуль — 3 секунды перезарядки', () => {
  const battle = makeBattle(), t = mechanic(battle, 10, 4, ['turret']);
  near(t.baseRange, t.cls.base.range + MECH.turret.range);
  near(t.interval, MECH.turret.interval);
  near(t.damage / baseOf(t.cls).damage, MECH.turret.mul);
  const target = walker(battle, 12, 1e9), other = walker(battle, 11.6, 1e9), shots = firedBy(battle, 'shot');
  still(target, other);
  battle._fire(t);
  eq(shots().length, 1, 'первая пуля — сразу');
  runFor(battle, MECH.turret.gap + 0.01);
  eq(shots().length, 2, 'вторая — чуть позже');
  runFor(battle, MECH.turret.gap);
  eq(shots().length, MECH.turret.count, 'очередь — три пули друг за другом');
  ok(shots().every((e) => e.mob === target), 'все три — в одну цель');
  near(hit(target), t.damage * MECH.turret.count);
  for (let i = 1; i < MECH.turret.mag / MECH.turret.count; i++) ok(battle._fire(t));
  ok(t.reloadUntil >= battle.time + MECH.turret.reload - 1e-9, '15-я пуля — перезарядка');
  no(battle._fire(t), 'перезаряжается');
  const lone = makeBattle(), u = mechanic(lone, 10, 4, ['turret']);
  const first = walker(lone, 12, 1e9), next = walker(lone, 11.6, 1e9);
  still(first, next);
  lone._fire(u);
  first.dead = true;
  runFor(lone, MECH.turret.gap * 2 + 0.1);
  near(hit(next), u.damage * (MECH.turret.count - 1), 'цель погибла — остаток очереди в соседа');
});

test('механик-подрывник: РПГ — снаряд долетает и взрывается, бьёт всех в клетке вокруг цели', () => {
  const battle = makeBattle(), t = mechanic(battle, 10, 4, ['demo']);
  near(t.damage / baseOf(t.cls).damage, MECH.demo.mul);
  const target = walker(battle, 13, 1e9), close = walker(battle, 12.4, 1e9), far = walker(battle, 10, 1e9);
  still(target, close, far);
  const rockets = firedBy(battle, 'rocket');
  battle._fire(t);
  const shell = rockets()[0];
  ok(shell && shell.mob === target, 'снаряд пущен в того, кто впереди');
  near(shell.time, MECH.demo.flight + Math.hypot(target.x - t.cx, target.y - t.cy) * MECH.demo.pace,
    'чем дальше, тем дольше летит');
  eq(hit(target), 0, 'пока летит — урона нет');
  runFor(battle, shell.time + 0.05);
  near(hit(target), t.damage);
  near(hit(close), t.damage, 'сосед в клетке задет');
  eq(hit(far), 0, 'дальний цел');
});

test('механик-ракетчик: через всю карту в того, кто впереди всех; ракета догоняет цель и взрывается вокруг', () => {
  const battle = makeBattle(), t = mechanic(battle, 1, 4, ['mortar']);
  ok(t.range >= SIZE, 'вся карта');
  near(t.interval, MECH.mortar.interval);
  const lead = walker(battle, 14, 1e9), side = walker(battle, 13.4, 1e9), close = walker(battle, 2, 1e9);
  still(side, close);
  lead.power = null;
  const shells = firedBy(battle, 'mortar');
  ok(battle._fire(t));
  const shell = shells()[0];
  ok(shell && shell.mob === lead, 'в того, кто впереди всех, хоть он и далеко');
  near(shell.time, MECH.mortar.flight + Math.hypot(lead.x - t.cx, lead.y - t.cy) * MECH.mortar.pace,
    'чем дальше, тем дольше летит');
  const from = lead.d;
  runFor(battle, shell.time + 0.05);
  ok(lead.d - from > MECH.mortar.radius, 'цель успела уйти: ' + (lead.d - from));
  near(hit(lead), t.damage, 'ракета догнала цель');
  eq(hit(side), 0, 'туда, где цель была, не упала');
  eq(hit(close), 0);
  const fall = makeBattle(), u = mechanic(fall, 1, 4, ['mortar']);
  const doomed = walker(fall, 14, 1e9), buddy = walker(fall, 13.6, 1e9);
  still(doomed, buddy);
  fall._fire(u);
  doomed.dead = true;
  runFor(fall, MECH.mortar.flight + 1);
  near(hit(buddy), u.damage, 'цель погибла — ракета упала там же и задела соседа');
});

test('механик: команда поддержки — механики рядом стреляют быстрее, тем быстрее, чем их больше', () => {
  const battle = makeBattle(), lead = mechanic(battle, 10, 2, ['team']), mate = mechanic(battle, 11, 2, ['turret']);
  const far = mechanic(battle, 14, 2, []), gun = battle.place(player(), 'frost', 10, 3);
  battle.step(TICK);
  near(lead.boost.rate, MECH.team.per * 2, 'двое механиков — каждому по двойной прибавке');
  near(mate.boost.rate, MECH.team.per * 2);
  ok(mate.boostBy.has(lead));
  eq(far.boost.rate, 0, 'дальний — без прибавки');
  eq(gun.boost.rate, 0, 'не механик — без прибавки');
  mechanic(battle, 9, 3, ['mortar']);
  battle.step(TICK);
  near(lead.boost.rate, MECH.team.per * 3, 'трое — ещё быстрее, и по диагонали тоже');
  ok(battle._intervalOf(lead, battle.time) < lead.interval);
});

test('механик: тюнинг — стрелки в клетке вокруг стреляют быстрее, другие классы — нет', () => {
  const battle = makeBattle(), tuner = mechanic(battle, 10, 2, ['tuning']);
  const near1 = battle.place(player(), 'sniper', 11, 3), far = battle.place(player(), 'sniper', 14, 2);
  const gun = battle.place(player(), 'frost', 9, 2);
  battle.step(TICK);
  near(near1.boost.rate, MECH.tuning.haste);
  ok(near1.boostBy.has(tuner));
  eq(far.boost.rate, 0);
  eq(gun.boost.rate, 0);
  eq(tuner.boost.rate, 0, 'себе — нет');
});

test('механик: стальной щит — за волну принимает один удар по сердцу, щиты механиков складываются', () => {
  const battle = makeBattle();
  mechanic(battle, 10, 2, ['bulwark']);
  mechanic(battle, 12, 2, ['demo', 'bulwark']);
  battle.startWave(1, 2);
  eq(battle.steel, 2, 'два механика — два щита');
  battle.spawns = [];
  const lives = battle.lives, bite = () => {
    const mob = walker(battle, battle.length - 1, 1e9);
    mob.leak = 3;
    for (let i = 0; i < 200 && !mob.dead; i++) battle.step(TICK);
  };
  bite();
  eq(battle.lives, lives, 'первый удар, хоть и на 3 жизни, — в щит');
  eq(battle.steel, 1);
  ok(battle.events.some((e) => e.kind === 'steel'));
  bite();
  eq(battle.lives, lives, 'второй — во второй щит');
  bite();
  eq(battle.lives, lives - 3, 'щиты кончились — удар по сердцу');
  battle.endWave();
  battle.startWave(2, 2);
  eq(battle.steel, 2, 'новая волна — щиты снова целы');
  const late = makeBattle();
  late.startWave(1, 1);
  eq(late.steel, 0);
  mechanic(late, 10, 2, ['bulwark']);
  eq(late.steel, 1, 'взял навык посреди волны — щит сразу');
});

test('механик: ЭМИ-граната — навесом в моба, оглушает всех на 2 клетки и отключает способности', () => {
  const battle = makeBattle(), t = mechanic(battle, 10, 4, ['emp']);
  const target = walker(battle, 13.5, 1e9), side = walker(battle, 12, 1e9), far = walker(battle, 9, 1e9);
  still(target, side, far);
  battle.step(TICK);
  const thrown = battle.events.find((e) => e.kind === 'grenade' && e.grenade === 'emp');
  ok(thrown && thrown.mob === target, 'в того, кто впереди');
  ok(thrown && !thrown.drone, 'граната полетела навесом');
  ok(t.nextEmp > battle.time + MECH.emp.every - 1, 'следующая — через 8 секунд');
  no(target.muteUntil > battle.time, 'пока летит — ничего');
  runFor(battle, thrown.time + 0.05);
  ok(battle.events.some((e) => e.kind === 'emp'));
  for (const mob of [target, side]) {
    ok(mob.holdUntil > battle.time, 'оглушён');
    ok(mob.muteUntil > battle.time + MECH.emp.mute - 1, 'способности отключены');
  }
  no(far.muteUntil > battle.time, 'дальше 2 клеток — нет');
});

test('механик-подрывник: снаряд наводится на цель — догоняет её, куда бы она ни ушла', () => {
  const battle = makeBattle(), t = mechanic(battle, 10, 4, ['demo']);
  const target = walker(battle, 13, 1e9), shells = firedBy(battle, 'rocket');
  target.power = null;
  battle._fire(t);
  const from = target.d;
  runFor(battle, shells()[0].time + 0.05);
  ok(target.d - from > MECH.demo.radius * 0.3, 'цель сдвинулась: ' + (target.d - from));
  near(hit(target), t.damage, 'снаряд догнал');
});

test('механик-подрывник: кассетный снаряд, большой калибр, залп, прицельный выстрел', () => {
  const battle = makeBattle(), t = mechanic(battle, 10, 4, ['demo', 'cluster']);
  const target = walker(battle, 13, 1e9), close = walker(battle, 13.6, 1e9);
  still(target, close);
  const shards = firedBy(battle, 'shard');
  battle._fire(t);
  runFor(battle, MECH.demo.flight + 3 * MECH.demo.pace + 0.1);
  eq(shards().length, MECH.cluster.count, 'два осколка');
  ok(shards().every((e) => e.mob === target || e.mob === close), 'в мобов рядом');
  runFor(battle, MECH.cluster.flight + 0.05);
  near(hit(target) + hit(close), t.damage * 2 + t.damage * MECH.cluster.share * MECH.cluster.count * 2,
    'каждый осколок — половина урона по всем рядом');
  const heavy = makeBattle(), h = mechanic(heavy, 10, 4, ['demo', 'caliber']);
  const aim = walker(heavy, 13, 1e9), wide = walker(heavy, 11.4, 1e9);
  still(aim, wide);
  heavy._fire(h);
  runFor(heavy, 1);
  near(hit(aim), h.damage * MECH.caliber, 'вдвое сильнее');
  near(hit(wide), h.damage * MECH.caliber, 'и вдвое шире: задел того, кто в полутора клетках');
  const twice = makeBattle(), s = mechanic(twice, 10, 4, ['demo', 'salvo']), shot = firedBy(twice, 'rocket');
  still(walker(twice, 13, 1e9));
  twice.random = () => 0;
  twice._fire(s);
  runFor(twice, MECH.salvo.gap + 0.05);
  eq(shot().length, 2, 'залп: вдогонку второй снаряд');
  const far = makeBattle(), a = mechanic(far, 1, 4, ['demo', 'aimed']), shots = firedBy(far, 'rocket');
  const lead = walker(far, 17, 1e9);
  still(lead);
  a.cooldown = 0;
  far.step(TICK);
  eq(shots().length, 0, 'до цели не достаёт и ещё не заскучал');
  runFor(far, MECH.aimed.idle + 0.2);
  ok(shots().some((e) => e.mob === lead), 'прицельный выстрел через всю карту');
});

test('механик-ракетчик: напалм, корректировка, шрапнель, ядерка', () => {
  const battle = makeBattle(), t = mechanic(battle, 1, 4, ['mortar', 'napalm']);
  const mob = walker(battle, 10, 1e9);
  still(mob);
  battle._fire(t);
  runFor(battle, MECH.mortar.flight + 10 * MECH.mortar.pace + 0.1);
  const fire = battle.patches.find((patch) => patch.tower === t);
  ok(fire && fire.mark, 'напалм: земля горит');
  ok(fire.until - battle.time <= MECH.napalm.time + 1e-9);
  const before = hit(mob);
  runFor(battle, 0.5);
  ok(hit(mob) > before, 'огонь жжёт');
  ok(mob.marks && mob.marks.has('fire'), 'метка огня для реакций');
  const pick = makeBattle(), p = mechanic(pick, 1, 4, ['mortar', 'adjust']), shells = firedBy(pick, 'mortar');
  const front = walker(pick, 15, 1e9), elite = quiet(put(pick, special(pick, 'elite', 'vampire', 1e9), 9));
  still(front);
  pick._fire(p);
  ok(shells()[0].mob === elite, 'корректировка: сперва элитный, хоть он и позади');
  const shine = makeBattle(), q = mechanic(shine, 1, 4, ['mortar', 'adjust']), aimed = firedBy(shine, 'mortar');
  const lead = walker(shine, 15, 1e9), silver = walker(shine, 9, 1e9);
  silver.silver = AFFIXES[0];
  still(lead, silver);
  shine._fire(q);
  ok(aimed()[0].mob === silver, 'и серебряный элитный тоже');
  const rain = makeBattle(), r = mechanic(rain, 1, 4, ['mortar', 'shrapnel', 'napalm']);
  const bursts = firedBy(rain, 'airburst'), aim = walker(rain, 10, 1e9), side = walker(rain, 11.5, 1e9);
  still(aim, side);
  rain._fire(r);
  runFor(rain, MECH.mortar.flight + 10 * MECH.mortar.pace + 0.1);
  const burst = bursts()[0];
  ok(burst && burst.points.length === MECH.shrapnel.count, 'рвётся в воздухе на осколки');
  ok(burst.points.every(([x, y]) => Math.hypot(x - burst.x, y - burst.y) <= MECH.shrapnel.spread + 1e-9));
  runFor(rain, MECH.shrapnel.fall + 0.05);
  eq(rain.patches.filter((patch) => patch.tower === r).length, MECH.shrapnel.count, 'каждый осколок поджёг землю');
  ok(rain.patches.every((patch) => patch.radius === MECH.shrapnel.fire));
  const bomb = makeBattle(), n = mechanic(bomb, 1, 4, ['mortar', 'nuke']), launched = firedBy(bomb, 'mortar');
  const mole = walker(bomb, 13.5, 1e9), buddy = walker(bomb, 12, 1e9);
  still(mole, buddy);
  mole.underUntil = 1e9;
  bomb.step(TICK);
  const big = launched().find((e) => e.nuke);
  ok(big && big.mob === mole, 'ядерка — и в того, кто под землёй');
  ok(n.nextNuke > bomb.time + MECH.nuke.every - 1, 'следующая — через 20 секунд');
  runFor(bomb, big.time + 0.05);
  ok(bomb.events.some((e) => e.kind === 'nuke' && e.radius === MECH.nuke.radius && e.poison === MECH.nuke.poison),
    'ядовитое облако на всё время яда');
  near(hit(mole), n.damage * MECH.nuke.mul, 'огромный урон и под землёй');
  near(hit(buddy), n.damage * MECH.nuke.mul, 'на 3 клетки вокруг');
  ok(buddy.holdUntil > bomb.time, 'оглушение');
  ok(buddy.marks && buddy.marks.has('poison'), 'метка яда для реакций');
});

test('механик-турельщик: гигантская турель — строчит без перерывов и перезарядки, веером по разным мобам', () => {
  const battle = makeBattle(), t = mechanic(battle, 10, 4, ['turret', 'giant']);
  near(t.interval, MECH.giant.gap, 'пуля за пулей, без пауз между очередями');
  const a = walker(battle, 12.5, 1e9), b = walker(battle, 11.9, 1e9), c = walker(battle, 11.3, 1e9);
  still(a, b, c);
  const shots = firedBy(battle, 'shot');
  for (let i = 0; i < 40; i++) ok(battle._fire(t));
  eq(shots().length, 40);
  ok(shots().slice(1).every((e, i) => e.mob !== shots()[i].mob), 'каждая следующая — в другого');
  eq(t.reloadUntil, 0, 'без перезарядки');
  const sky = makeBattle(), g = mechanic(sky, 10, 4, ['turret', 'giant']);
  const ground = walker(sky, 13, 1e9), flyer = walker(sky, 9, 1e9, bat());
  still(ground, flyer);
  ok(sky._targetable(g, flyer), 'летучий в досягаемости');
  const first = firedBy(sky, 'shot');
  sky._fire(g);
  ok(first()[0].mob === flyer, 'первая пуля — в летучего, хоть он и позади');
  ok(sky.facing(g) === flyer);
});

test('механик-турельщик: дроны ПВО держат каждый своего летучего; вырвался вперёд — к нему летит тот, кто держал последнего', () => {
  const battle = makeBattle(), t = mechanic(battle, 1, 4, ['turret', 'droneAir', 'droneAir']);
  const front = walker(battle, 14, 1e9, bat()), back = walker(battle, 10, 1e9, bat()), last = walker(battle, 6, 1e9, bat());
  still(front, back, last);
  battle.step(TICK);
  const guards = battle.drones.filter((d) => d.kind === 'air');
  eq(guards.map((d) => d.target.id).sort((m, n) => m - n), [front.id, back.id].sort((m, n) => m - n),
    'двое передних — у каждого свой дрон');
  const holder = guards.find((d) => d.target === back), keeper = guards.find((d) => d.target === front);
  last.d = 17;
  battle._locate(last);
  battle.step(TICK);
  ok(holder.target === last, 'дрон отставшего полетел к вырвавшемуся');
  ok(keeper.target === front, 'второй остался при своём');
  runFor(battle, 4);
  for (const mob of [front, last]) ok(mob.slowUntil > battle.time, 'оба держатся сетями');
});

test('механик-турельщик: дроны — до трёх каждого вида, летают по всей карте и бьют своих целей', () => {
  const battle = makeBattle(), t = mechanic(battle, 1, 4, ['turret', 'droneAttack', 'droneAttack', 'droneLaser',
    'droneAir']);
  const lead = walker(battle, 17, 1e9), elite = quiet(put(battle, special(battle, 'elite', 'vampire', 1e9), 12));
  const flyer = walker(battle, 8, 1e9, bat());
  still(lead, flyer);
  elite.armor = 0.5;
  battle.step(TICK);
  eq(battle.drones.map((d) => d.kind).sort(), ['air', 'attack', 'attack', 'laser'], 'два атакующих, лазерный, ПВО');
  runFor(battle, 6);
  const of = (kind) => battle.drones.filter((d) => d.kind === kind);
  const hunted = of('attack').map((d) => d.target);
  ok(hunted.includes(lead) && hunted.includes(elite), 'у каждого атакующего свой моб из передних');
  ok(of('attack').every((d) => near1(d, d.target)), 'и каждый у своей цели');
  ok(of('laser')[0].target === elite && near1(of('laser')[0], elite), 'лазерный — у элитного');
  ok(of('air')[0].target === flyer, 'ПВО — у летучего');
  ok(hit(lead) > 0, 'атакующие бьют');
  ok(battle.events.some((e) => e.kind === 'ray' && e.mob === elite), 'лазер');
  ok(hit(elite) >= t.damage * MECH.droneLaser.mul - 1e-6, 'лазер сквозь броню');
  ok(flyer.slowUntil > battle.time && flyer.slow >= MECH.droneAir.slow * (1 - flyer.resist) - 1e-6, 'сеть замедляет');
  ok(flyer.netUntil > battle.time);
  const pair = makeBattle();
  mechanic(pair, 1, 4, ['turret', 'droneAttack', 'droneAttack', 'droneAttack']);
  const only = walker(pair, 15, 1e9);
  still(only);
  pair.step(TICK);
  ok(pair.drones.every((d) => d.target === only), 'цель одна — бьют её втроём');
  const second = walker(pair, 12, 1e9);
  still(second);
  pair.step(TICK);
  ok(pair.drones.filter((d) => d.target === second).length === 1, 'появилась вторая — к ней уходит один');
  const silverField = makeBattle(), s = mechanic(silverField, 1, 4, ['turret', 'droneLaser']);
  const shiny = walker(silverField, 9, 1e9), plain = walker(silverField, 15, 1e9);
  shiny.silver = AFFIXES[0];
  still(shiny, plain);
  runFor(silverField, 4);
  ok(silverField.drones[0].target === shiny, 'лазерный дрон бьёт и серебряного элитного');
  ok(s.damage > 0 && hit(shiny) > 0);
  battle.setMods(t, { runes: ['turret', 'droneAttack'] });
  battle.step(TICK);
  eq(battle.drones.length, 1, 'навыков меньше — дронов меньше');
  battle.remove(t);
  battle.step(TICK);
  eq(battle.drones.length, 0, 'ушёл — и дроны с ним');
});

test('механик: ЭМИ-гранату сбрасывает дрон под себя, если у турельщика есть атакующие или лазерные дроны', () => {
  const battle = makeBattle(), t = mechanic(battle, 1, 4, ['turret', 'droneAttack', 'emp']);
  const lead = walker(battle, 15, 1e9);
  still(lead);
  t.nextEmp = 1e9;
  runFor(battle, 5);
  t.nextEmp = 0;
  battle.step(TICK);
  const drop = battle.events.find((e) => e.kind === 'grenade' && e.grenade === 'emp');
  ok(drop && drop.drone && drop.drone.kind === 'attack', 'сбросил дрон');
  ok(Math.hypot(drop.x - lead.x, drop.y - lead.y) < MECH.drone.hover + 0.3, 'под собой, у цели');
  runFor(battle, MECH.emp.drop + 0.05);
  ok(lead.muteUntil > battle.time, 'и сработала');
});

const offRoad = (battle, x, y) => {
  let best = Infinity;
  for (let d = 0; d <= battle.length; d += 0.05) {
    const point = battle._roadPoint(0, d);
    best = Math.min(best, Math.hypot(point.x - x, point.y - y));
  }
  return best;
};

test('механик: осколки кассетного снаряда и шрапнели падают на дорогу, а не мимо неё', () => {
  const battle = makeBattle(), t = mechanic(battle, 10, 4, ['demo', 'cluster']), lone = walker(battle, 13, 1e9);
  still(lone);
  const shards = firedBy(battle, 'shard');
  battle._fire(t);
  runFor(battle, 1.2);
  eq(shards().length, MECH.cluster.count);
  ok(shards().every((e) => offRoad(battle, e.x, e.y) < 0.05), 'рядом мобов нет — осколки на дорогу');
  const rain = makeBattle(), r = mechanic(rain, 1, 4, ['mortar', 'shrapnel']), aim = walker(rain, 10, 1e9);
  still(aim);
  const bursts = firedBy(rain, 'airburst');
  rain._fire(r);
  runFor(rain, MECH.mortar.flight + 10 * MECH.mortar.pace + 0.1);
  const points = bursts()[0].points;
  ok(points.every(([x, y]) => offRoad(rain, x, y) <= MECH.shrapnel.side + 0.05), 'шрапнель — вдоль дороги');
  runFor(rain, MECH.shrapnel.fall + 0.05);
  ok(hit(aim) > 0, 'и попадает');
});

test('механик-подрывник: прицельный выстрел — после 5 секунд без стрельбы, и отсчёт идёт заново', () => {
  const far = makeBattle(), a = mechanic(far, 1, 4, ['demo', 'aimed']), shots = firedBy(far, 'rocket');
  still(walker(far, 17, 1e9));
  a.cooldown = 0;
  far.step(TICK);
  runFor(far, MECH.aimed.idle - 0.3);
  eq(shots().length, 0, 'раньше 5 секунд — нет');
  runFor(far, 0.5);
  eq(shots().length, 1, 'через 5 секунд — выстрел');
  runFor(far, MECH.aimed.idle - 0.5);
  eq(shots().length, 1, 'после выстрела отсчёт заново');
  runFor(far, 0.7);
  eq(shots().length, 2);
});

function forester(battle, x, y, runes) {
  const t = battle.place(player(), 'forester', x, y);
  battle.setMods(t, { runes });
  t.critChance = 0;
  t.cooldown = 1e9;
  battle.random = () => 0.99;
  return t;
}

test('лесник: без стиля — лук, стрела в того, кто ближе к сердцу; после выстрела накладывает новую стрелу', () => {
  const battle = makeBattle(), t = forester(battle, 10, 4, []);
  eq(t.cls.name, 'Лесник');
  const back = walker(battle, 9, 1e9), front = walker(battle, 12, 1e9);
  still(back, front);
  ok(battle._fire(t));
  near(hit(front), t.damage);
  eq(hit(back), 0);
  ok(t.reloadUntil > battle.time, 'перезарядка видна в модельке');
  ok(t.reloadUntil - battle.time <= battle._intervalOf(t, battle.time) / 2, 'и не медленнее выстрелов');
});

test('лесник-друид: сам не стреляет, птица летит через всю карту и клюёт того, кто впереди', () => {
  const battle = makeBattle(), t = forester(battle, 1, 4, ['druid']);
  const lead = walker(battle, 17, 1e9), close = walker(battle, 2, 1e9);
  still(lead, close);
  no(battle._fire(t), 'друид сам не атакует');
  battle.step(TICK);
  const bird = battle.drones.find((d) => d.tower === t);
  ok(bird && bird.kind === 'bird', 'рядом птица');
  ok(bird.target === lead, 'летит к тому, кто впереди всех');
  runFor(battle, 5);
  ok(Math.hypot(bird.x - lead.x, bird.y - lead.y) < MECH.drone.hover + 0.3, 'долетела');
  ok(hit(lead) > 0 && battle.events.some((e) => e.kind === 'peck'), 'клюёт');
  eq(hit(close), 0, 'ближнего друид не трогает');
});

test('лесник-охотник: тяжёлый арбалет — далеко, очень сильно, сперва элитные и боссы, после выстрела перезарядка', () => {
  const battle = makeBattle(), t = forester(battle, 10, 4, ['hunter']);
  near(t.baseRange, t.cls.base.range + WOOD.hunter.range);
  near(t.damage / baseOf(t.cls).damage, WOOD.hunter.mul);
  const plain = walker(battle, 14, 1e9), elite = quiet(put(battle, special(battle, 'elite', 'vampire', 1e9), 11));
  still(plain);
  ok(battle._fire(t));
  ok(hit(elite) > 0 && hit(plain) === 0, 'сперва элитный, хоть обычный и впереди');
  ok(t.reloadUntil >= battle.time + WOOD.hunter.reload - 1e-9, 'перезарядка');
  no(battle._fire(t), 'пока перезаряжается — не стреляет');
});

test('лесник-ведьма: ядовитые шары — урон ядом, без меток для реакций; нежить и неуязвимых к яду не трогает', () => {
  const battle = makeBattle(), t = forester(battle, 10, 4, ['witch']);
  eq(t.element, 'poison');
  const bone = walker(battle, 13, 1e9), mob = walker(battle, 11, 1e9);
  bone.undead = true;
  still(bone, mob);
  ok(battle._fire(t));
  ok(hit(mob) > 0, 'бьёт живого');
  eq(hit(bone), 0, 'нежить не трогает');
  no(mob.marks && mob.marks.has('poison'), 'без метки яда для реакций');
  mob.dead = true;
  no(battle._fire(t), 'остался только скелет — ждёт');
});

test('стрелок: без стиля — редкий дальний выстрел в самого крепкого, дальше всех', () => {
  const battle = makeBattle(), t = battle.place(player(), 'sniper', 10, 4);
  eq(t.cls.name, 'Стрелок');
  ok(CLASSES.every((cls) => (cls.base.range || 0) <= t.cls.base.range));
  const strong = walker(battle, 10, 1e6), flyer = walker(battle, 12, 100, bat());
  still(strong, flyer);
  ok(battle._target(t) === strong, 'самого крепкого, летучих не выделяет');
});

test('стрелок-снайпер: через всю карту, только элитных, серебряных и боссов; целится, бьёт сильно, перезарядка', () => {
  const battle = makeBattle(), t = shooter(battle, 1, 4, ['scope']);
  const plain = walker(battle, 2, 1e9), elite = quiet(put(battle, special(battle, 'elite', 'vampire', 1e9), 18));
  still(plain);
  ok(t.range >= SIZE, 'достаёт через всю карту');
  near(t.damage / baseOf(t.cls).damage, SHOT.scope.mul);
  battle.step(TICK);
  ok(t.charge && t.charge.kind === 'aim' && t.charge.target === elite, 'целится в элитного, обычного не замечает');
  near(t.charge.until - t.charge.at, SHOT.scope.aim);
  runFor(battle, SHOT.scope.aim + 0.1);
  near(hit(elite), t.damage, 'попал');
  eq(plain.hp, plain.max, 'обычного не трогает');
  ok(t.reloadUntil > battle.time + SHOT.scope.reload - 0.3, 'после выстрела — перезарядка');
  const before = hit(elite);
  runFor(battle, SHOT.scope.reload - 0.4);
  eq(hit(elite), before, 'пока перезаряжается — не стреляет');
  const empty = makeBattle(), e = shooter(empty, 1, 4, ['scope']);
  still(walker(empty, 3, 1e9));
  empty.step(TICK);
  eq(e.charge, null, 'нет элитных и боссов — ждёт');
  const silver = makeBattle(), s = shooter(silver, 1, 4, ['scope']);
  const shiny = walker(silver, 12, 1e9), boss = quiet(put(silver, special(silver, 'boss', 'crusher', 1e6), 16));
  shiny.silver = AFFIXES[0];
  still(shiny);
  silver.step(TICK);
  ok(s.charge && s.charge.target === shiny, 'серебряный — такой же элитный: из элитных и боссов — самый крепкий');
  shiny.dead = true;
  s.charge = null;
  silver._fire(s);
  ok(s.charge && s.charge.target === boss);
});

test('стрелок-снайпер: донаводка, быстрые руки, бронебой, рикошет', () => {
  const battle = makeBattle(), t = shooter(battle, 1, 4, ['scope', 'steady']);
  const elite = quiet(put(battle, special(battle, 'elite', 'vampire', 1e9), 10));
  battle.step(TICK);
  near(t.charge.until - t.charge.at, SHOT.scope.aim * 2, 'донаводка — вдвое дольше');
  runFor(battle, SHOT.scope.aim * 2 + 0.1);
  near(hit(elite), t.damage * t.critMul, 'и всегда крит');
  const fast = makeBattle(), q = shooter(fast, 1, 4, ['scope', 'quick']);
  quiet(put(fast, special(fast, 'boss', 'crusher', 1e9), 10));
  fast.step(TICK);
  near(q.charge.until - q.charge.at, SHOT.scope.aim / 2, 'быстрые руки — вдвое быстрее');
  const armor = makeBattle(), a = shooter(armor, 1, 4, ['scope', 'breaker']);
  const knight = quiet(put(armor, special(armor, 'elite', 'vampire', 1e9), 10));
  knight.armor = 0.5;
  armor.step(TICK);
  runFor(armor, SHOT.scope.aim + 0.1);
  near(hit(knight), a.damage, 'бронебой: броня не режет');
  const bounce = makeBattle(), r = shooter(bounce, 1, 4, ['scope', 'scopeRicochet']);
  quiet(put(bounce, special(bounce, 'elite', 'vampire', 1e9), 8));
  const back = walker(bounce, 10, 1e9);
  still(back);
  bounce.step(TICK);
  runFor(bounce, SHOT.scope.aim + 0.1);
  near(hit(back), r.damage * SHOT.ricochet.share, 'рикошет в того, кто позади, — вдвое слабее');
});

test('стрелок-штурмовик: средняя дальность, часто, критом, сперва ближайший элитный; 30 пуль — перезарядка', () => {
  const battle = makeBattle(), t = shooter(battle, 10, 4, ['assault']);
  near(t.baseRange, t.cls.base.range + SHOT.assault.range);
  near(t.interval, SHOT.assault.interval);
  battle.setMods(t, { runes: ['assault'] });
  ok(t.critChance >= SHOT.assault.crit, 'часто бьёт критом');
  t.critChance = 0;
  const close = walker(battle, 11, 1e9), far = walker(battle, 13, 1e9);
  const elite = quiet(put(battle, special(battle, 'elite', 'vampire', 1e9), 14));
  still(close, far);
  battle._fire(t);
  ok(hit(elite) > 0 && hit(close) === 0, 'сперва элитный');
  elite.dead = true;
  battle._fire(t);
  ok(hit(close) > 0 && hit(far) === 0, 'потом ближайший');
  for (let i = 2; i < SHOT.assault.mag; i++) ok(battle._fire(t));
  ok(t.reloadUntil >= battle.time + SHOT.assault.reload - 1e-9, '30-я пуля — перезарядка');
  no(battle._fire(t), 'перезаряжается');
  battle.setMods(t, { runes: ['assault', 'endless'] });
  t.reloadUntil = 0;
  for (let i = 0; i < SHOT.assault.mag * 2; i++) battle._fire(t);
  ok(t.reloadUntil <= battle.time, 'бесконечный магазин — без перезарядки');
});

test('стрелок-штурмовик: очередь, рикошет, шумовая граната, отряд поддержки', () => {
  const battle = makeBattle(), t = shooter(battle, 10, 4, ['assault', 'burstFire']);
  still(walker(battle, 12, 1e9), walker(battle, 12.5, 1e9));
  const shots = battle.events.length, fired = () => battle.events.slice(shots).filter((e) => e.kind === 'shot').length;
  t.cooldown = 1e9;
  battle._fire(t);
  eq(fired(), 1, 'первая пуля — сразу');
  eq(t.bullets, SHOT.burst.count, 'в магазине считаются все три');
  runFor(battle, SHOT.burst.gap + 0.01);
  eq(fired(), 2, 'вторая — чуть позже');
  runFor(battle, SHOT.burst.gap);
  eq(fired(), SHOT.burst.count, 'очередь — три пули друг за другом');
  const r = makeBattle(), u = shooter(r, 10, 4, ['assault', 'ricochet']);
  const front = walker(r, 12, 1e9), back = walker(r, 14, 1e9);
  still(front, back);
  r._fire(u);
  near(hit(back), u.damage * SHOT.ricochet.share, 'рикошет в того, кто позади');
  const f = makeBattle(), g = shooter(f, 10, 4, ['assault', 'flashbang', 'endless']);
  const boss = quiet(put(f, special(f, 'boss', 'crusher', 1e9), 11.2));
  const a = walker(f, 11, 1e9), b = walker(f, 11.5, 1e9);
  still(a, b);
  for (let i = 1; i < SHOT.flash.every; i++) f._fire(g);
  no(f.events.some((e) => e.kind === 'flashbang'));
  f._fire(g);
  const thrown = f.events.find((e) => e.kind === 'grenade');
  ok(thrown && thrown.grenade === 'flash' && thrown.mob, 'после 30 пуль — граната летит навесом');
  near(thrown.time, GRENADE.flight + Math.hypot(thrown.x - g.cx, thrown.y - g.cy) * GRENADE.pace);
  no(f.events.some((e) => e.kind === 'flashbang'), 'пока летит — никого не оглушила');
  runFor(f, thrown.time + 0.05);
  ok(f.events.some((e) => e.kind === 'flashbang'), 'упала и взорвалась');
  ok(a.holdUntil > f.time && b.holdUntil > f.time, 'все рядом оглушены');
  ok(boss.holdUntil <= f.time, 'босс — нет');
  const s = makeBattle(), main = shooter(s, 10, 4, ['marksman']), mate = shooter(s, 12, 4, ['assault', 'support']);
  const mob = walker(s, 12, 1e9);
  still(mob);
  s._fire(main);
  near(hit(mob), main.damage + mate.damage, 'штурмовик поддержал выстрел марксмана');
  const before = hit(mob);
  s._fire(mate);
  near(hit(mob) - before, mate.damage, 'свой выстрел поддержку не зовёт');
});

test('стрелок-марксман: далеко, редко, сильно; 5 пуль — перезарядка; пробивная и двойной выстрел', () => {
  const battle = makeBattle(), t = shooter(battle, 1, 4, ['marksman', 'pierce']);
  near(t.baseRange, t.cls.base.range + SHOT.marksman.range);
  near(t.interval, SHOT.marksman.interval);
  near(t.damage / baseOf(t.cls).damage, SHOT.marksman.mul);
  t.cx = 0.5;
  t.cy = 5.5;
  const line = [walker(battle, 3, 1e9), walker(battle, 4, 1e9), walker(battle, 5, 1e9)];
  still(...line);
  battle._fire(t);
  ok(line.every((mob) => hit(mob) > 0), 'пробивная — прошивает всех на пути');
  for (let i = 1; i < SHOT.marksman.mag; i++) battle._fire(t);
  ok(t.reloadUntil > battle.time, 'пятая пуля — перезарядка');
  const two = makeBattle(), d = shooter(two, 3, 4, ['marksman', 'double']);
  d.cx = 3.5;
  d.cy = 5.5;
  const first = walker(two, 6, 1e9), ahead = walker(two, 8, 1e9), rear = walker(two, 1, 1e9);
  still(first, ahead, rear);
  two._fire(d);
  ok(hit(first) > 0 && hit(ahead) > 0, 'две пули в одну сторону');
  eq(hit(rear), 0, 'в другую сторону — нет');
  eq(d.bullets, 2);
});

test('стрелок-марксман: шестое чувство — подземных первыми; воздушная оборона — летучих первыми, втрое сильнее', () => {
  const blind = makeBattle(), plainShot = shooter(blind, 10, 4, ['marksman']);
  const mole = creature(blind, 'mole', 13, 1e9), plain = walker(blind, 11, 1e9);
  still(mole, plain);
  mole.underUntil = 1e9;
  blind._fire(plainShot);
  ok(hit(plain) > 0 && hit(mole) === 0, 'без навыка подземного не видно');
  const sense = makeBattle(), m = shooter(sense, 10, 4, ['marksman', 'sixth']);
  const deep = creature(sense, 'mole', 13, 1e9), near1 = walker(sense, 11, 1e9);
  still(deep, near1);
  deep.underUntil = 1e9;
  sense._fire(m);
  ok(hit(deep) > 0 && hit(near1) === 0, 'с навыком — подземного первым и бьёт');
  const sky = makeBattle(), aa = shooter(sky, 10, 4, ['marksman', 'antiair']);
  const ground = walker(sky, 11, 1e9), flyer = walker(sky, 13, 1e9, bat());
  still(ground, flyer);
  sky._fire(aa);
  near(hit(flyer), aa.damage * SHOT.air, 'летучего — первым и втрое сильнее');
  eq(hit(ground), 0);
});

test('стрелок: последний патрон, наводчик, золотые пули', () => {
  const battle = makeBattle(), t = shooter(battle, 10, 4, ['marksman', 'lastRound', 'spotter', 'goldRounds']);
  near(t.critMul, baseOf(t.cls).critMul * SHOT.gold, 'золотые пули — криты сильнее');
  t.critChance = 0;
  const boss = quiet(put(battle, special(battle, 'boss', 'crusher', 1e9), 11));
  boss.hp = t.damage * 1.5;
  battle._fire(t);
  ok(boss.dead, 'осталось меньше, чем снял выстрел, — гибнет даже босс');
  ok(battle.events.some((e) => e.kind === 'shot' && e.gold), 'трассеры золотые');
  const mob = walker(battle, 12, 1e9), gun = battle.place(player(), 'mechanic', 16, 6);
  still(mob);
  t.reloadUntil = 0;
  battle._fire(t);
  ok(mob.markUntil > battle.time && mob.mark === SHOT.mark.bonus, 'метка наводчика');
  const before = hit(mob);
  battle._hurt(mob, 100, gun, null);
  near(hit(mob) - before, 100 * (1 + SHOT.mark.bonus), 'меченого бьют сильнее и союзники');
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
  const gun = battle.place(player(), 'mechanic', 18, 0);
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

test('паразит: первые 10 волн — кокон на клетке: не кусает, за волну 1–500 монет и опыт наравне с отрядом', () => {
  const battle = makeBattle(), larva = player(), bug = battle.place(larva, 'parasite', 3, 4);
  battle.place(level(30), 'mechanic', 2, 6);
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

test('паразит: с 30-го «Заражение» — моб, в которого он вгрызся, получает больше урона от всех', () => {
  const battle = makeBattle(), bug = battle.placeRider(level(30), 'parasite');
  const gun = battle.place(level(30), 'mechanic', 2, 4);
  const weak = walker(battle, 5, 1e6), host = walker(battle, 6, 1e9);
  still(weak, host);
  for (let i = 0; i < 100 && !(bug.host === host && battle.time > bug.leapUntil + TICK); i++) battle.step(TICK);
  ok(bug.host === host, 'сидит на самом крепком');
  const hit = (mob) => {
    const before = mob.hp;
    battle._hurt(mob, 100, gun);
    return before - mob.hp;
  };
  near(hit(host) / hit(weak), 1 + bug.s[1].vuln, 'на ' + Math.round(bug.s[1].vuln * 100) + '% больше');
  ok(host.helpers.has(bug), 'паразиту засчитывается помощь');
  const young = makeBattle(), larva = young.placeRider(level(29), 'parasite'), mob = walker(young, 5, 1e9);
  still(mob);
  for (let i = 0; i < 40; i++) young.step(TICK);
  ok(larva.host === mob);
  eq(mob.vuln, 0, 'до 30-го уровня — нет');
});

test('паразит: с 50-го раз в 30 с забирает монеты богатого союзника и раздаёт их всем, свои держит до 1000', () => {
  const battle = makeBattle(), bug = battle.placeRider(level(50), 'parasite');
  const rich = battle.place(player(), 'mechanic', 2, 4), poor = battle.place(player(), 'mechanic', 2, 6);
  eq(bug.s[2].every, 30);
  bug.player.coins = 600;
  rich.player.coins = 2000;
  battle.step(TICK);
  const heist = battle.events.find((e) => e.kind === 'heist'), share = battle.events.find((e) => e.kind === 'share');
  ok(heist && heist.victim === rich && heist.coins === 2000, 'забрал всё');
  ok(share && share.coins === 2000, 'раздал только украденное');
  eq(share.shares.map((part) => part.tower).sort(), [bug, rich, poor].sort(), 'всем, себе тоже');
  eq(bug.player.coins, 600 + share.shares.find((part) => part.tower === bug).coins, 'свои 600 остались при нём');
  near(rich.player.coins + poor.player.coins + bug.player.coins, 2600, 'ни одна монета не пропала');
  ok(bug.perch && bug.perch.tower === rich, 'спит у него на голове');
  ok(rich.napUntil >= battle.time + bug.s[2].sleep - 1, 'союзник спит минуту');
  rich.player.coins = 5000;
  runFor(battle, 25);
  eq(rich.player.coins, 5000, 'раньше 30 секунд не прыгает');
  runFor(battle, 6);
  eq(battle.events.filter((e) => e.kind === 'heist').length, 2, 'через 30 секунд — снова');
  const field = makeBattle(), alone = field.placeRider(level(50), 'parasite'), mate = field.place(player(), 'mechanic',
    2, 4);
  alone.player.coins = 1500;
  field.step(TICK);
  no(field.events.some((e) => e.kind === 'heist'), 'богатых нет — не прыгает');
  const spare = field.events.find((e) => e.kind === 'share');
  ok(spare && spare.coins === 500, 'свои сверх 1000 раздаёт');
  near(alone.player.coins + mate.player.coins, 1500);
  ok(alone.player.coins >= 1000, 'тысячу оставил себе');
  no(alone.perch);
});

test('Диабло: на 100-й волне выходит один, без мобов, крепче обычного босса вчетверо, огонь его не берёт', () => {
  const battle = makeBattle();
  eq(battle.planFamily(99) === FINALE, false);
  eq(battle.planFamily(100), FINALE);
  battle.startWave(100, 10);
  eq(battle.spawns.length, 1, 'один');
  const spawn = battle.spawns[0];
  eq([spawn.type, spawn.kind], ['boss', DIABLO]);
  near(spawn.hp, waveHp(100, 'boss', 10) * DIABLO.hp);
  eq(DIABLO.hp, 4);
  const before = makeBattle();
  before.startWave(99, 10);
  const wave99 = before.spawns.reduce((sum, s) => sum + s.hp, 0);
  ok(spawn.hp > wave99, 'крепче всей 99-й волны: ' + Math.round(spawn.hp) + ' > ' + Math.round(wave99));
  ok(spawn.hp < wave99 * 2, 'но не неуязвим');
  ok(BOSSES.every((boss) => boss.id !== DIABLO.id), 'в обычные волны не попадает');
  const fire = battle.place(level(50), 'pyro', 3, 4), devil = battle._spawn(spawn, 5);
  still(devil);
  battle._hurt(devil, 1000, fire, 'fire');
  eq(devil.hp, devil.max, 'огонь не берёт');
  battle._hold(devil, 5, fire);
  ok(!(devil.holdUntil > battle.time), 'не оглушается');
  battle.planFamily(200);
  eq(battle.nextFamily, FINALE, 'и на 200-й');
});

test('Диабло у сердца разбивает его одним ударом: щит и второй шанс лекаря не спасают', () => {
  const battle = makeBattle(), healer = battle.place(level(50), 'healer', 3, 4);
  battle.setMods(healer, { runes: ['guardian', 'second'] });
  battle.random = () => 0;
  const devil = battle._spawn({ type: 'boss', kind: DIABLO, hp: 1e12 }, battle.length - 2);
  for (let i = 0; i < 400 && battle.lives > 0; i++) battle.step(TICK);
  eq(battle.lives, 0, 'сердце разбито');
  ok(devil.dead);
  no(battle.events.some((e) => e.kind === 'shield' || e.kind === 'rescue'), 'лекарь не спас');
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

test('ледяной маг: буря вокруг бьёт льдом всех в радиусе', () => {
  const battle = makeBattle(), frost = battle.place(player(), 'frost', 10, 4);
  battle.setMods(frost, { perks: [0] });
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
  const battle = makeBattle(), frost = battle.place(level(30), 'frost', 10, 4), gun = battle.place(player(), 'mechanic',
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
  const battle = makeBattle(), t = battle.place(player(), 'mechanic', 3, 4);
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
  const banshee = makeBattle(), tower = banshee.place(player(), 'mechanic', 5, 4), far = banshee.place(player(), 'mechanic', 18, 8);
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
  const t = lord.place(player(), 'mechanic', 5, 4), hp = elem.hp;
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

test('знаменосец: под знаменем бьют быстрее и дальше, два знамени не складываются, за добычу под знаменем — помощь', () => {
  const battle = makeBattle(), flag = battle.place(player(), 'banner', 4, 4), b = flag.cls.base;
  const ally = battle.place(player(), 'mechanic', 5, 4), far = battle.place(player(), 'mechanic', 14, 4);
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
  const ally = battle.place(player(), 'sniper', 5, 4), far = battle.place(player(), 'mechanic', 16, 6);
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
  let cheerOff = false, rallyOff = false;
  for (let i = 0; i < 20 / TICK && !(cheerOff && rallyOff); i++) {
    battle.step(TICK);
    cheerOff = cheerOff || ally.boost.damage === 0;
    rallyOff = rallyOff || far.boost.rate === 0;
  }
  ok(rallyOff, 'знамя победы кончается');
  ok(cheerOff, 'клич кончается');
});

test('знаменосец: руны — багровый стяг ускоряет под кличем, знамя в землю дольше и отбрасывает', () => {
  const battle = makeBattle(), flag = battle.place(level(50), 'banner', 4, 4);
  battle.setMods(flag, { runes: ['crimson', 'planted'] });
  const ally = battle.place(player(), 'mechanic', 5, 4), mob = walker(battle, 5, 1e9);
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

test('маг огня без стиля и в стиле огненного шара: шар, взрыв, гигантский шар, двойной каст', () => {
  const battle = makeBattle(), t = battle.place(player(), 'pyro', 10, 4), base = t.cls.base;
  battle.random = () => 0.99;
  t.critChance = 0;
  t.cooldown = 1e9;
  const a = walker(battle, 10, 1e6), b = walker(battle, 9.3, 1e6);
  still(a, b);
  near(t.baseRange, base.range);
  battle._fire(t);
  runFor(battle, 0.35);
  near(hit(a), t.damage, 'обычный шар — одна цель');
  eq(hit(b), 0);
  battle.setMods(t, { runes: ['fireball'] });
  eq(t.style, 'fireball');
  near(t.baseRange, base.range + 1, 'стиль — дальше');
  t.critChance = 0;
  t.cooldown = 1e9;
  const before = hit(a);
  battle._fire(t);
  runFor(battle, 0.35);
  near(hit(a) - before, t.damage * FIRE.styled, 'сильнее');
  ok(hit(b) > 0, 'взрыв на клетку вокруг');
  battle.setMods(t, { runes: ['fireball', 'giant', 'twin'] });
  ok(t.critChance >= FIRE.crit, 'гигантский шар чаще бьёт критом');
  near(t.baseRange, base.range + 1.5);
  t.critChance = 0;
  t.cooldown = 1e9;
  const shots = battle.events.filter((e) => e.kind === 'shot').length;
  battle._fire(t);
  eq(battle.events.filter((e) => e.kind === 'shot').length - shots, 2, 'двойной каст — два шара');
});

test('маг огня: огненный дождь и жерло вулкана', () => {
  const battle = makeBattle(), t = battle.place(player(), 'pyro', 10, 4);
  battle.setMods(t, { runes: ['fireball', 'rain', 'vent'] });
  t.cooldown = 1e9;
  const mob = walker(battle, 10, 1e6);
  still(mob);
  battle.step(TICK);
  eq(battle.vents.length, 1, 'жерло открылось');
  const vent = battle.vents[0];
  ok(Math.abs(vent.x - t.x) <= 1 && Math.abs(vent.y - t.y) <= 1, 'рядом');
  no(battle.free(vent.x, vent.y), 'клетка занята');
  runFor(battle, FIRE.vent.every + 0.5);
  const shots = battle.events.filter((e) => e.kind === 'shot' && e.sx !== undefined);
  ok(shots.some((e) => e.sx === vent.cx), 'жерло плюётся шарами');
  ok(shots.some((e) => e.sy < e.y), 'дождь: шары падают сверху');
  ok(hit(mob) > 0);
  eq(battle.vents.length, 1, 'жерло одно на мага');
});

test('маг огня: дракон дышит струёй раз в тик; широкое дыхание, большие лёгкие, перелёт, заряженное дыхание', () => {
  const battle = makeBattle(), t = battle.place(player(), 'pyro', 10, 4), base = t.cls.base;
  battle.setMods(t, { runes: ['dragon'] });
  eq(t.style, 'dragon');
  near(t.interval, PULSE, 'раз в тик');
  near(t.baseRange, base.range - 0.5);
  const cone = t.cone;
  battle.setMods(t, { runes: ['dragon', 'wide', 'lungs'] });
  ok(t.cone > cone, 'шире');
  near(t.baseRange, (base.range - 0.5) * 2, 'вдвое дальше');
  battle.random = () => 0.99;
  t.critChance = 0;
  const a = walker(battle, 12, 1e6), b = walker(battle, 13, 1e6);
  still(a, b);
  battle._fire(t);
  ok(hit(a) > 0 && hit(b) > 0 && battle.events.some((e) => e.kind === 'flame'), 'струя по всем в конусе');

  const fly = makeBattle(), d = fly.place(player(), 'pyro', 2, 4);
  fly.setMods(d, { runes: ['dragon', 'flight'] });
  const far = walker(fly, 16, 1e6);
  still(far);
  runFor(fly, FIRE.idle + 0.2);
  ok(Math.abs(d.cx - far.x) < 1.6 && Math.abs(d.cy - far.y) < 1.6, 'перелетел к первому мобу');
  ok(fly.events.some((e) => e.kind === 'flight'));
  ok(d.pull && d.pull.fly && d.pull.end > fly.time, 'летит, а не прыгает');
  near(d.pull.end - d.pull.start, Math.max(0.6, Math.hypot(d.cx - d.pull.fx, d.cy - d.pull.fy) / FIRE.soar));

  const beam = makeBattle(), e = beam.place(player(), 'pyro', 10, 4);
  beam.setMods(e, { runes: ['dragon', 'beam'] });
  const boss = put(beam, special(beam, 'boss', 'crusher', 1e9), 11), plain = walker(beam, 10, 1e9);
  still(boss, plain);
  beam.step(TICK);
  ok(e.charge && e.charge.kind === 'beam' && e.charge.target === boss, 'набирает пламя — сперва в босса');
  runFor(beam, FIRE.beam.charge + 0.1);
  ok(hit(boss) >= e.damage * FIRE.beam.mul, 'луч');
  ok(beam.events.some((ev) => ev.kind === 'beam' && ev.mob === boss), 'луч изо рта');
});

test('маг огня: возгорание — не стреляет, каждый тик у каждого моба свой шанс вспыхнуть', () => {
  const battle = makeBattle(), t = battle.place(player(), 'pyro', 10, 4);
  battle.setMods(t, { runes: ['ignite'] });
  eq(battle._fire(t), false, 'не стреляет');
  const far = walker(battle, 1, 1e6), other = walker(battle, 18, 1e6);
  still(far, other);
  battle.random = () => 0.01;
  battle.step(TICK);
  ok(hit(far) > 0 && hit(other) > 0, 'вспыхнули в любом конце карты');
  const was = hit(far);
  battle.random = () => 0.99;
  runFor(battle, 1);
  eq(hit(far), was, 'не повезло — не вспыхнул');
});

test('маг огня: тление, огненная реакция, факел, синее пламя', () => {
  const battle = makeBattle(), t = battle.place(player(), 'pyro', 10, 4);
  battle.setMods(t, { runes: ['smolder', 'fireReact'] });
  battle.random = () => 0.99;
  t.critChance = 0;
  t.cooldown = 1e9;
  const mob = walker(battle, 10, 1e6);
  still(mob);
  battle._fire(t);
  runFor(battle, 0.35);
  ok(mob.burn && mob.burn.has(t), 'тление');
  ok(mob.marks && mob.marks.get('fire').has(t), 'стихия огня');
  const was = hit(mob);
  runFor(battle, 1.1);
  ok(hit(mob) > was, 'горит каждый тик');

  const torch = makeBattle(), p = torch.place(player(), 'pyro', 10, 4), s = torch.place(player(), 'sniper', 11, 4);
  const far = torch.place(player(), 'mechanic', 2, 4);
  torch.setMods(p, { runes: ['torch', 'fireReact'] });
  still(walker(torch, 0, 1e6));
  torch.step(TICK);
  ok(s.torch === p && !far.torch, 'факел — соседям-стрелкам');
  const target = walker(torch, 13, 1e7);
  still(target);
  s.critChance = 0;
  torch.random = () => 0.99;
  torch._fire(s);
  ok(hit(target) > s.damage, 'к выстрелу добавился огонь');
  ok(target.marks && target.marks.get('fire').has(p), 'и стихия огня от мага');

  const blue = makeBattle(), q = blue.place(player(), 'pyro', 10, 4);
  blue.setMods(q, { runes: ['blue'] });
  q.critChance = 0;
  q.cooldown = 1e9;
  blue.random = () => 0.99;
  const m = walker(blue, 10, 1e6);
  still(m);
  blue._fire(q);
  runFor(blue, 0.35);
  near(hit(m), q.damage * FIRE.blue, 'синее пламя сильнее');
  ok(blue.events.some((e) => e.kind === 'shot' && e.blue), 'и синее');
});

test('маг воды: струя; заморозка, волна, водоворот, цунами', () => {
  const battle = makeBattle(), t = battle.place(player(), 'frost', 10, 4);
  battle.random = () => 0.99;
  t.critChance = 0;
  const mob = walker(battle, 10, 1e6);
  still(mob);
  battle._fire(t);
  near(hit(mob), t.damage, 'струя бьёт одного');
  no(mob.marks, 'стихию сама не накладывает');
  battle.setMods(t, { perks: [1] });
  battle.random = () => 0.01;
  battle._fire(t);
  ok(mob.holdUntil > battle.time, 'заморозка');

  const waves = makeBattle(), w = waves.place(player(), 'frost', 10, 4), boss = put(waves,
    special(waves, 'boss', 'crusher', 1e9), 12);
  waves.setMods(w, { perks: [3, 4, 5] });
  w.cooldown = 1e9;
  const a = walker(waves, 10, 1e6), b = walker(waves, 3, 1e6);
  still(a, b, boss);
  const da = a.d, db = b.d, dboss = boss.d;
  waves.step(TICK);
  ok(waves.events.some((e) => e.kind === 'wave') && waves.events.some((e) => e.kind === 'tsunami'));
  ok(a.d <= da - 3.9, 'волна и цунами отбросили');
  ok(b.d <= db - 2.9, 'цунами — по всему полю');
  near(boss.d, dboss, 'босса не сдвинуть');
  ok(waves.zones.some((zone) => zone.kind === 'pool' && zone.tower === w), 'водоворот');
});

function lab() {
  const battle = makeBattle(), at = (cls, x, mods) => {
    const t = battle.place(player(), cls, x, 3);
    battle.setMods(t, mods);
    return t;
  };
  const towers = {
    fire: at('pyro', 1, { runes: ['fireReact'] }), fire2: at('pyro', 3, { runes: ['fireReact'] }),
    fire3: at('pyro', 17, { runes: ['fireReact'] }),
    water: at('frost', 5, { perks: [6] }), earth: at('earth', 7, { perks: [6] }), air: at('shaman', 9, { perks: [6] }),
    lightning: at('thunder', 11, { perks: [3] }), poison: at('forester', 13, { runes: ['witch'] }),
  };
  return { battle, towers };
}

test('реакции: стихию накладывают только «… реакция»; две стихии — реакция в тик, урон от суммы мощи', () => {
  const { battle, towers } = lab(), plain = battle.place(player(), 'thunder', 15, 3);
  eq([towers.fire.react, towers.water.react, towers.air.react], ['fire', 'water', 'air']);
  eq(plain.react, null, 'без способности стихия не накладывается');
  const mob = walker(battle, 2, 1e6);
  still(mob);
  battle._hurt(mob, 10, plain);
  no(mob.marks);
  battle._hurt(mob, 10, towers.fire);
  battle._hurt(mob, 10, towers.water);
  eq(Array.from(mob.marks.keys()).sort(), ['fire', 'water']);
  const was = hit(mob);
  battle._pulse(battle.time);
  ok(!mob.marks, 'стихии ушли в реакцию');
  ok(battle.state(mob, 'steam'), 'пар');
  near(hit(mob) - was, (towers.fire.skill + towers.water.skill) * REACTIONS.steam.fire, 'урон — от суммы мощи');
  ok(battle.events.some((e) => e.kind === 'react' && e.name === 'Пар'));
  const weak = walker(battle, 4, 1e6);
  still(weak);
  for (const key of ['fire', 'fire2', 'water']) battle._mark(weak, towers[key].react, towers[key]);
  weak.hp = 1;
  battle._pulse(battle.time);
  ok(weak.dead);
  eq([towers.fire.run.kills, towers.fire2.run.kills, towers.water.run.kills], [1, 1, 1], 'убийство — всем участникам');
});

test('реакции: шанс выше у стихии, наложенной чаще; несколько реакций сразу, если не мешают', () => {
  const { battle, towers } = lab();
  battle.random = seeded(5);
  let steam = 0, frost = 0;
  for (let i = 0; i < 300; i++) {
    const mob = walker(battle, 2, 1e9);
    still(mob);
    for (const key of ['fire', 'fire2', 'fire3', 'water', 'air']) battle._mark(mob, towers[key].react, towers[key]);
    battle._pulse(battle.time);
    if (battle.state(mob, 'steam')) steam += 1;
    if (battle.state(mob, 'frost')) frost += 1;
    mob.dead = true;
  }
  ok(steam > frost * 1.3, 'огня больше — пар чаще: ' + steam + ' против ' + frost);
  const both = walker(battle, 6, 1e9);
  still(both);
  for (const key of ['fire', 'water', 'air', 'lightning']) battle._mark(both, towers[key].react, towers[key]);
  battle._pulse(battle.time);
  ok(!both.marks, 'две реакции сразу');
});

test('реакции: мороз продлевается и может заморозить; огонь по льду — пар втрое сильнее', () => {
  const { battle, towers } = lab();
  const mob = walker(battle, 2, 1e9);
  still(mob);
  battle._mark(mob, 'water', towers.water);
  battle._mark(mob, 'air', towers.air);
  battle._pulse(battle.time);
  ok(battle.state(mob, 'frost'), 'мороз');
  ok(mob.slowUntil > battle.time, 'замедляет');
  battle.random = () => 0.01;
  battle._mark(mob, 'water', towers.water);
  battle._pulse(battle.time);
  ok(battle.state(mob, 'ice') && mob.holdUntil > battle.time, 'лёд');
  const was = hit(mob);
  battle._mark(mob, 'fire', towers.fire);
  battle._pulse(battle.time);
  no(battle.state(mob, 'ice'), 'лёд растаял');
  const power = towers.fire.skill + towers.water.skill + towers.air.skill;
  near(hit(mob) - was, power * REACTIONS.steam.fire * 3, 'пар третьей степени — от мощи всех участников');
  ok(battle.state(mob, 'steam').until >= battle.time + 2.9);
});

test('реакции: гарантированные — лава, перегрузка, эпидемия, ядерный взрыв; газ из пара и яда', () => {
  const { battle, towers } = lab();
  const mud = walker(battle, 2, 1e9);
  still(mud);
  battle._mark(mud, 'water', towers.water);
  battle._mark(mud, 'earth', towers.earth);
  battle._pulse(battle.time);
  ok(battle.state(mud, 'mud'), 'грязь');
  battle._mark(mud, 'fire', towers.fire);
  battle._mark(mud, 'air', towers.air);
  battle._pulse(battle.time);
  ok(battle.zones.some((zone) => zone.kind === 'lava') && !battle.state(mud, 'mud'), 'лава');

  const charged = walker(battle, 5, 1e9);
  still(charged);
  battle._mark(charged, 'air', towers.air);
  battle._mark(charged, 'lightning', towers.lightning);
  battle._pulse(battle.time);
  ok(battle.state(charged, 'charge'), 'заряд');
  battle._mark(charged, 'water', towers.water);
  battle._mark(charged, 'lightning', towers.lightning);
  battle._pulse(battle.time);
  ok(battle.events.some((e) => e.kind === 'react' && e.name === 'Перегрузка'), 'перегрузка');
  ok(charged.holdUntil >= battle.time + 2, 'надолго оглушён');

  const sick = walker(battle, 8, 1e9);
  still(sick);
  battle._setState(sick, 'corrosion', 4, [towers.fire], { dot: 1 });
  battle._setState(sick, 'disease', 4, [towers.earth], { dot: 1 });
  battle._pulse(battle.time);
  ok(battle.state(sick, 'epidemic') && !battle.state(sick, 'corrosion'), 'эпидемия');

  const gas = walker(battle, 11, 1e9);
  still(gas);
  battle._setState(gas, 'steam', 2, [towers.water]);
  battle._mark(gas, 'poison', towers.poison);
  battle._pulse(battle.time);
  const cloud = battle.zones.find((zone) => zone.kind === 'gas');
  ok(cloud, 'облако газа');
  battle._mark(gas, 'fire', towers.fire);
  battle._mark(gas, 'lightning', towers.lightning);
  battle._pulse(battle.time);
  ok(battle.events.some((e) => e.kind === 'react' && e.name === 'Ядерный взрыв'), 'взрыв в газе — ядерный');
  ok(!battle.zones.includes(cloud), 'облако сгорело');
});

test('маг молнии: грозовая туча и гроза над полем', () => {
  const battle = makeBattle(), t = battle.place(player(), 'thunder', 10, 4);
  battle.setMods(t, { perks: [4, 5] });
  t.cooldown = 1e9;
  const close = walker(battle, 10, 1e6), far = walker(battle, 2, 1e6);
  still(close, far);
  battle.step(TICK);
  ok(battle.zones.some((zone) => zone.kind === 'cloud'), 'туча над дорогой');
  ok(battle.events.some((e) => e.kind === 'tempest'));
  runFor(battle, 0.6);
  ok(hit(far) >= t.skill * t.s[5].bonus, 'гроза бьёт по всему полю');
  ok(hit(close) > hit(far), 'под тучей — ещё и туча');
});

test('маг ветра: попутный ветер, ураган, око бури', () => {
  const battle = makeBattle(), t = battle.place(player(), 'shaman', 10, 4), ally = battle.place(player(), 'sniper', 11, 4);
  still(walker(battle, 0, 1e6));
  battle.step(TICK);
  const plain = ally.boost.rate;
  battle.setMods(t, { perks: [3] });
  battle.step(TICK);
  near(ally.boost.rate - plain, t.s[3].haste, 'попутный ветер всегда');

  const gale = makeBattle(), g = gale.place(player(), 'shaman', 10, 4);
  gale.setMods(g, { perks: [4, 5] });
  g.cooldown = 1e9;
  const light = walker(gale, 10, 1e6), elite = put(gale, special(gale, 'elite', 'leader', 1e6), 9), far = walker(gale, 6, 1e6);
  still(light, elite, far);
  const dfar = far.d;
  gale.step(TICK);
  ok(light.holdUntil > gale.time && light.vuln >= g.s[4].vuln, 'ураган поднял лёгкого');
  ok(!(elite.vulnUntil > gale.time), 'элитного — нет');
  ok(far.d <= dfar - g.s[5].push + 0.01, 'око бури отбросило всех');
});

test('маг земли: землетрясение, разлом, зыбучий песок, стальная крепость', () => {
  const battle = makeBattle(), t = battle.place(player(), 'earth', 10, 4);
  battle.setMods(t, { perks: [3, 4, 5] });
  t.cooldown = 1e9;
  const a = walker(battle, 10, 1000), b = walker(battle, 9.5, 1000);
  still(a, b);
  battle.step(TICK);
  ok(a.holdUntil > battle.time && b.holdUntil > battle.time, 'землетрясение оглушает');
  ok(a.hp <= 500 + 1e-6 && b.hp <= 500 + 1e-6, 'разлом: половина здоровья');
  ok(battle.zones.some((zone) => zone.kind === 'sand'), 'зыбучий песок');

  const fort = makeBattle(), f = fort.place(level(10), 'earth', 10, 4);
  fort.setMods(f, { perks: [0], runes: ['steel'] });
  fort.step(TICK);
  const wall = fort.walls[0], mob = walker(fort, 3, 1e6);
  ok(wall, 'стена стоит');
  wall.hp = 1e-9;
  put(fort, mob, wall.d - 0.6);
  fort._batter(wall, mob, TICK, fort.time);
  ok(fort.events.some((e) => e.kind === 'boom' && e.tower === f), 'рухнув, взрывается');
  ok(mob.holdUntil > fort.time, 'и оглушает');
});

test('паразит, навыки Реборна: липкий кокон, пожиратель, королева роя, захват разума', () => {
  const battle = makeBattle(), p = battle.place(player(), 'parasite', 10, 4);
  battle.setMods(p, { perks: [3] });
  ok(p.cocoon > 0);
  const slow = walker(battle, 10, 1e9);
  still(slow);
  battle.step(TICK);
  near(slow.slow, p.s[3].slow, 'кокон липкий');

  const nest = makeBattle(), q = nest.placeRider(player(), 'parasite');
  nest.setMods(q, { perks: [4, 5, 6] });
  const weak = walker(nest, 10, 0.01);
  still(weak);
  ATTACK(nest, q, weak);
  ok(weak.dead);
  near(q.feast, q.s[4].bonus, 'пожиратель: +5% за убийство');
  nest.startWave(2, 1);
  eq(q.feast, 0, 'до конца волны');
  const herd = [1, 2, 3, 4, 5, 6].map((k) => walker(nest, 3 + k, 1e6 * k));
  still(...herd);
  q.host = herd[0];
  nest.step(TICK);
  ok(herd.slice(1).every((mob) => mob.vuln >= q.s[5].vuln && mob.slow > 0), 'рой облепил пятерых самых крепких');
  ok(!(herd[0].vulnUntil > nest.time), 'шестой — нет');
  ok(q.host && q.host.madUntil > nest.time, 'носитель сошёл с ума');
});

test('знаменосец, навыки Реборна: стяг стойкости, длинное древко, легион, знамя героя', () => {
  const battle = makeBattle(), flag = battle.place(player(), 'banner', 10, 4);
  const ally = battle.place(player(), 'sniper', 12, 4), far = battle.place(player(), 'sniper', 1, 4);
  battle.setMods(flag, { perks: [3, 4] });
  still(walker(battle, 0, 1e9));
  battle.step(TICK);
  no(battle._daze(ally, 2), 'под знаменем не оглушить');
  near(battle._bannerOf(flag), flag.cls.base.banner + flag.reach + flag.s[4].wide);
  ok(ally.boost.range >= flag.s[4].range, 'под знаменем бьют дальше');
  no(far.boostBy.has(flag));
  battle.setMods(flag, { perks: [5, 6] });
  ally.run.kills = 5;
  battle.step(TICK);
  battle.step(TICK);
  ok(flag.legionUntil > battle.time && far.boostBy.has(flag), 'легион: всё поле под знаменем');
  ok(ally.boost.damage >= flag.s[6].bonus, 'знамя героя — лучшему по убийствам');
});

test('лекарь, навыки Реборна: обновление, благословение, свет небес', () => {
  const battle = makeBattle(), h = battle.place(player(), 'healer', 10, 4), ally = battle.place(player(), 'sniper', 11, 3);
  battle.setMods(h, { perks: [3] });
  battle.lives = 10;
  battle.endWave();
  ok(battle.lives >= 10 + h.s[3].lives, 'после волны — ещё две жизни');
  battle.startWave(2, 2);
  battle.spawns = [];
  const biter = walker(battle, battle.length - 2);
  const lives = battle.lives;
  for (let i = 0; i < 200 && !biter.dead; i++) battle.step(TICK);
  eq(battle.lives, lives, 'первый укус волны не отнял жизнь');

  const holy = makeBattle(), k = holy.place(player(), 'healer', 10, 4), friend = holy.place(player(), 'sniper', 11, 3);
  holy.setMods(k, { perks: [4, 5] });
  holy.random = () => 0.99;
  const zombie = walker(holy, 10, 1e9, LOOKS.normal.find((l) => l.id === 'zombie'));
  still(zombie);
  holy.step(TICK);
  ok(friend.blessUntil > holy.time, 'союзник благословлён');
  holy.step(TICK);
  ok(friend.boost.damage >= k.s[4].bonus, 'и бьёт сильнее');
  ok(hit(zombie) >= k.skill * k.s[5].undead, 'свет небес: нежити ×30');
  ok(zombie.holdUntil > holy.time, 'и оглушение');
  ok(!ally.blessUntil, 'в первой битве благословлять было некому');
});

test('мудрец, навыки Реборна: ясность, петля времени, просветление', () => {
  const battle = makeBattle(), sage = battle.place(player(), 'sage', 10, 4), ally = battle.place(player(), 'sniper', 11, 4);
  battle.setMods(sage, { perks: [3] });
  still(walker(battle, 0, 1e9));
  battle.step(TICK);
  ally.nextActive = battle.time + 10;
  const start = ally.nextActive;
  runFor(battle, 1);
  near(start - ally.nextActive, sage.s[3].haste, 'ясность: за секунду на 0,3 с ближе');

  const loop = makeBattle(), s = loop.place(player(), 'sage', 2, 4);
  loop.setMods(s, { perks: [4] });
  const runner = walker(loop, loop.length - 2);
  for (let i = 0; i < 100 && !loop.events.some((e) => e.kind === 'rewind'); i++) loop.step(TICK);
  ok(s.looped, 'петля сработала');
  ok(runner.d < loop.length - 5 && !runner.biting, 'моб отброшен назад и не грызёт');
  for (let i = 0; i < 400 && !runner.dead; i++) loop.step(TICK);
  eq(loop.events.filter((e) => e.kind === 'rewind').length, 1, 'один раз за игру');

  const wise = makeBattle(), w = wise.place(player(), 'sage', 10, 4), friend = wise.place(player(), 'sniper', 11, 4);
  wise.setMods(w, { perks: [5] });
  still(walker(wise, 10, 1e9));
  friend.nextActive = wise.time + 50;
  wise.step(TICK);
  ok(friend.nextActive <= wise.time, 'просветление перезарядило способности');
});

test('лекарь: руна «второй шанс» — раз за игру возвращает сердцу пять жизней и стирает всю волну', () => {
  const battle = makeBattle(), healer = battle.place(player(), 'healer', 2, 6);
  battle.setMods(healer, { runes: ['second'] });
  healer.busy = 1e9;
  battle.startWave(20, 5);
  ok(battle.spawns.length > 5, 'волна ещё выходит');
  battle.lives = 1;
  const others = [walker(battle, 3, 1e9), walker(battle, 8, 1e9)];
  walker(battle, battle.length - 2, 1e9);
  runFor(battle, 5);
  eq(battle.lives, SECOND);
  const rescue = battle.events.find((e) => e.kind === 'rescue');
  ok(rescue && rescue.wiped.length >= 2, 'стёрты все, кто был на поле');
  ok(others.every((mob) => mob.dead), 'и те, кто ещё далеко');
  ok(battle.cleared, 'волна кончилась: больше никто не выйдет');
  battle.lives = 1;
  walker(battle, battle.length - 2, 1e9);
  runFor(battle, 5);
  ok(battle.lives <= 0, 'второй раз — нет');
});

test('лекарь: с 30-го очищение будит оглушённых и усыплённых, и потом их не оглушить', () => {
  const battle = makeBattle(), healer = battle.place(level(30), 'healer', 4, 4);
  const ally = battle.place(player(), 'mechanic', 5, 4), mob = walker(battle, 19, 1e9);
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
  const ally = battle.place(player(), 'mechanic', 11, 4), far = battle.place(player(), 'mechanic', 2, 6);
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
  const ally = battle.place(level(50), 'frost', 11, 4), mob = walker(battle, 1, 1e9);
  still(mob);
  ally.nextActive = 1e9;
  battle.random = () => 0;
  battle.step(TICK);
  ok(battle.events.some((e) => e.kind === 'muse' && e.ally === ally && e.flash));
  ok(ally.nextActive < 1e9, 'перезарядилось');
  ally.busy = 1e9;
  battle.step(TICK);
  near(ally.boost.damage, sage.s[0].bonus);
  near(ally.boost.rate, sage.s[0].bonus);
  ok(ally.boostBy.has(sage), 'мудрецу — помощь');
  runFor(battle, sage.s[0].time + 0.1);
  const other = makeBattle(), wise = other.place(level(10), 'sage', 10, 4);
  other.setMods(wise, { runes: ['pupil'] });
  other.place(player(), 'mechanic', 11, 4);
  other.place(player(), 'mechanic', 9, 4);
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
  const gunner = battle.place(player(), 'mechanic', 16, 4);
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
  const ally = battle.place(player(), 'mechanic', 11, 4), far = battle.place(player(), 'mechanic', 2, 4);
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
  const pyro = battle.place(level(10), 'pyro', 3, 4), gunner = battle.place(player(), 'mechanic', 3, 6);
  const frost = battle.place(level(10), 'frost', 5, 4), witch = forester(battle, 5, 6, ['witch']);
  const thunder = battle.place(player(), 'thunder', 7, 4);
  const ember = creature(battle, 'ember'), ice = creature(battle, 'frostling'), sludge = creature(battle, 'sludge');
  const storm = creature(battle, 'stormling');
  battle._hurt(ember, 50, pyro);
  battle._ignite(ember, pyro, 10, 3);
  eq(ember.hp, ember.max, 'огонь не берёт');
  no(ember.burn);
  battle._hurt(ember, 50, gunner);
  ok(ember.hp < ember.max, 'пули берут');
  battle._hurt(sludge, 50, witch);
  eq(sludge.hp, sludge.max, 'яд не берёт');
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
  const battle = makeBattle(), t = battle.place(player(), 'mechanic', 3, 4);
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
  const battle = makeBattle(), gun = battle.place(player(), 'mechanic', 2, 4);
  gun.busy = 1e9;
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
  const ta = battle.place(a, 'mechanic', 2, 4), tb = battle.place(b, 'mechanic', 2, 6);
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
  const battle = makeBattle(), gun = battle.place(player(), 'mechanic', 2, 4);
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
  const gun = battle.place(player(), 'mechanic', 2, 6);
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
  const battle = makeBattle(), gun = battle.place(player(), 'mechanic', 6, 4), mole = creature(battle, 'mole', 5);
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
  const battle = makeBattle(), gun = battle.place(player(), 'mechanic', 3, 4), ghost = creature(battle, 'ghost', 5);
  ok(ghost.undead);
  ghost.phaseUntil = 1e9;
  battle._hurt(ghost, 100, gun);
  ok(Math.abs(1e6 - ghost.hp - 50) < 1e-6);
});

test('новые мобы: щитоносец держит удар спереди, сбоку и сзади — полный урон', () => {
  const battle = makeBattle();
  const ahead = battle.place(player(), 'mechanic', 9, 4);
  const behind = battle.place(player(), 'mechanic', 2, 4);
  const knight = creature(battle, 'shieldbearer', 6);
  battle._hurt(knight, 100, ahead);
  ok(Math.abs(1e6 - knight.hp - 40) < 1e-6, 'спереди — 40%');
  const hp = knight.hp;
  battle._hurt(knight, 100, behind);
  ok(Math.abs(hp - knight.hp - 100) < 1e-6, 'сзади — полностью');
});

test('новые мобы: гарпия летает и оглушает ближайшего защитника', () => {
  const battle = makeBattle(), gun = battle.place(player(), 'mechanic', 5, 4), harpy = creature(battle, 'harpy', 5);
  ok(harpy.flying && harpy.power.id === 'swoop');
  harpy.powerAt = battle.time;
  battle.step(TICK);
  ok(gun.stunUntil > battle.time);
});

test('новые мобы: мираж от первого удара распадается, копии пустые и сердцу не вредят', () => {
  const battle = makeBattle(), gun = battle.place(player(), 'mechanic', 3, 4), mirage = creature(battle, 'mirage', 6);
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
  const battle = makeBattle(), gun = battle.place(player(), 'mechanic', 3, 4);
  const shaman = special(battle, 'elite', 'goblinshaman', 1000), other = walker(battle, 5, 1000);
  shaman.powerAt = battle.time;
  battle.step(TICK);
  ok(other.ward > 0);
  const hp = other.hp;
  battle._hurt(other, other.ward / 2, gun);
  eq(other.hp, hp, 'щит принял удар');
  const field = makeBattle(), axe = field.place(player(), 'mechanic', 3, 4), ogre = special(field, 'elite', 'ogre', 1000);
  field._hurt(ogre, 300, axe);
  field.step(TICK);
  eq(field.mobs.filter((m) => m.look === 'goblin').length, 1, 'потерял четверть — уронил одного');
  field._hurt(ogre, 1e6, axe);
  field.step(TICK);
  eq(field.mobs.filter((m) => m.look === 'goblin').length, 3, 'умер — спрыгнули остальные');
});

test('новые элитные: зеркальщик отражает удар, броненосец сворачивается', () => {
  const battle = makeBattle(), gun = battle.place(player(), 'mechanic', 3, 4);
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

test('новые боссы: червь под землёй; дракон жжёт линию; матка опутывает', () => {
  const battle = makeBattle();
  const gun = battle.place(player(), 'mechanic', 6, 4);
  const worm = special(battle, 'boss', 'worm', 1000);
  eq(worm.leak, 10);
  eq(battle._target(gun), null, 'под землёй');
  battle._hurt(worm, 100, gun);
  eq(worm.hp, 1000);
  worm.powerAt = battle.time;
  battle.step(TICK);
  ok(battle._target(gun) === worm);
  const sky = makeBattle(), a = sky.place(player(), 'mechanic', 7, 4), b = sky.place(player(), 'mechanic', 9, 3);
  const c = sky.place(player(), 'mechanic', 2, 9), dragon = special(sky, 'boss', 'dragon', 1000);
  for (const t of [a, b, c]) t.busy = 1e9;
  ok(dragon.flying);
  dragon.powerAt = sky.time;
  sky.step(TICK);
  ok(a.stunUntil > sky.time && b.stunUntil > sky.time, 'на линии оглушены');
  ok(c.stunUntil <= sky.time, 'в стороне — нет');
  sky._hurt(dragon, 100, a, 'fire');
  near(hit(dragon), 50, 'огонь вдвое слабее');
  const lair = makeBattle();
  const web = lair.place(player(), 'mechanic', 5, 4);
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

test('мясник: раз в 10 секунд крюк летит пару секунд и пару секунд тащит защитника на клетку рядом с собой', () => {
  const battle = makeBattle(), far = battle.place(player(), 'mechanic', 15, 1);
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
  const gun = battle.place(player(), 'mechanic', 3, 3);
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
  const close = battle.place(player(), 'mechanic', 1, 4);
  eq(battle._target(close), null, 'в тоннеле не видно');
});

test('карта: с вышки видно поверх гор, но моба в тоннеле не достать ничем — ни выстрелом, ни взрывом рядом', () => {
  const battle = mapWith({ watch: [[2, 4]], tunnel: [[0, 5], [1, 5]] });
  const tower = battle.place(player(), 'mechanic', 2, 4);
  ok(battle.onWatch(tower));
  const deep = walker(battle, 1.6, 1e6), outside = walker(battle, 3.5, 1e6);
  still(deep, outside);
  ok(battle._target(tower) === outside, 'бьёт того, кто снаружи');
  put(battle, outside, 30);
  eq(battle._target(tower), null, 'в тоннеле не видно и с вышки');
  battle._hurt(deep, 500, tower);
  eq(hit(deep), 0, 'взрыв рядом не задевает моба в тоннеле');
});

test('бой: неуязвимого к своей стихии не бьют вовсе', () => {
  const battle = makeBattle(), pyro = battle.place(player(), 'pyro', 10, 4);
  const ember = creature(battle, 'ember', 11.2), zombie = creature(battle, 'zombie', 10.4);
  still(ember, zombie);
  ok(battle._target(pyro) === zombie, 'огонь не берёт элементаля — бьёт зомби, хоть элементаль и впереди');
  zombie.dead = true;
  eq(battle._target(pyro), null, 'других нет — не бьёт никого');
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
    const battle = mapWith({ [tile]: [[3, 4]] }), gun = battle.place(player(), 'mechanic', 3, 3);
    gun.range = 4;
    const mob = walker(battle, 4, 1e6);
    still(mob);
    eq(battle._target(gun) === mob, !hides, tile);
  }
  const battle = mapWith({ ruin: [[3, 4]], watch: [[3, 3]] }), tower = battle.place(player(), 'mechanic', 3, 3);
  const mob = walker(battle, 4, 1e6);
  still(mob);
  ok(battle._target(tower) === mob, 'с вышки видно и поверх руин');
});

test('карта: буря ледяного мага бьёт сквозь горы и мобов в тоннеле, обычный выстрел — нет', () => {
  const battle = mapWith({ mountain: [[14, 4]], tunnel: [[13, 5]] }), frost = battle.place(player(), 'frost', 14, 3);
  battle.setMods(frost, { perks: [0] });
  const gun = battle.place(player(), 'mechanic', 15, 3);
  gun.range = 4;
  battle.random = () => 0.99;
  const hidden = walker(battle, 14, 1e6), behind = walker(battle, 15, 1e6);
  still(hidden, behind);
  eq([Math.floor(hidden.x), Math.floor(behind.x)], [13, 14]);
  ok(battle.covered(hidden.x, hidden.y), 'один в тоннеле');
  no(battle.sees(gun, hidden), 'обычный выстрел в тоннель не достаёт');
  battle._fire(frost);
  ok(hidden.hp < hidden.max, 'в тоннеле задет');
  ok(behind.hp < behind.max, 'за горой задет');
});

test('карта: с холма бьют поверх руин, круга камней и склепа, но не поверх гор', () => {
  for (const [tile, hides] of [['ruin', false], ['stones', false], ['crypt', false], ['mountain', true]]) {
    const battle = mapWith({ [tile]: [[3, 4]], hill: [[3, 3]] }), gun = battle.place(player(), 'mechanic', 3, 3);
    gun.range = 4;
    const mob = walker(battle, 4, 1e6);
    still(mob);
    eq(battle._target(gun) === mob, !hides, tile);
    const cell = battle.road.findIndex(([x, y]) => x === Math.floor(mob.x) && y === Math.floor(mob.y));
    eq(battle._reach(gun.range)[3 * SIZE + 3].includes(cell), !hides, 'и при выборе клетки: ' + tile);
  }
});

test('серебряные — тоже элитные: охотник бьёт их первым, наравне с золотыми, РПГ их видит', () => {
  const battle = makeBattle(), hunter = forester(battle, 10, 4, ['hunter']);
  const plain = walker(battle, 12, 1e9), silver = walker(battle, 9, 1e9);
  silver.silver = AFFIXES[0];
  still(plain, silver);
  ok(battle._fire(hunter));
  ok(hit(silver) > 0 && hit(plain) === 0, 'серебряного — первым, хоть обычный и впереди');
  ok(battle._closestBig(hunter) === silver, 'РПГ метит серебряного');
  const gold = walker(battle, 8, 1e9);
  gold.info = MOBS.elite;
  still(gold);
  hunter.reloadUntil = 0;
  ok(battle._fire(hunter));
  ok(hit(gold) === 0, 'золотой элитный — наравне: бьёт того, кто впереди');
  for (const mob of [silver, gold]) battle._hold(mob, 2, hunter);
  ok(Math.abs(silver.holdUntil - gold.holdUntil) < 1e-9, 'оглушение — как у элитного');
});

test('карта: снайпер с прицелом и ракетчик бьют поверх гор — и радиус у них без теней от гор', () => {
  const battle = mapWith({ mountain: [[3, 4]] });
  const gun = battle.place(player(), 'mechanic', 3, 3), mortar = battle.place(player(), 'mechanic', 4, 3);
  battle.setMods(mortar, { runes: ['mortar'] });
  const scope = battle.place(player(), 'sniper', 2, 3);
  battle.setMods(scope, { runes: ['scope'] });
  const behind = walker(battle, 3, 1e6);
  behind.holdUntil = 1e9;
  put(battle, behind, 30);
  ok(battle.screen(gun), 'у обычного стрелка горы закрывают обзор');
  for (const t of [mortar, scope]) {
    eq(battle.screen(t), null, t.style + ': радиус без теней');
    ok(battle.sees(t, behind), t.style + ': видит за горой');
  }
});

test('карта: с холма бьют дальше', () => {
  const battle = mapWith({ hill: [[6, 4]] });
  const flat = battle.place(player(), 'mechanic', 2, 4), high = battle.place(player(), 'mechanic', 6, 4);
  ok(Math.abs(high.range - flat.range - TERRAIN.hill) < 1e-9);
  battle.move(flat, 6, 3);
  battle.move(high, 7, 3);
  ok(Math.abs(high.range - flat.range) < 1e-9, 'сошёл с холма — как все');
});

test('биомы: в вулкане лёд слабее, в снегах — огонь', () => {
  const blow = (biome, cls) => {
    const battle = mapWith({}, biome), t = battle.place(player(), cls, 3, 4), mob = walker(battle, 4, 1e6);
    battle._hurt(mob, 100, t, cls === 'frost' ? 'ice' : t.cls.element);
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
  const battle = mapWith({}, 'graveyard'), gun = battle.place(player(), 'mechanic', 18, 0);
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
  plain._hurt(mob, 100, plain.place(player(), 'mechanic', 3, 4));
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

test('маг огня, возгорание: кольцо пламени жжёт всех рядом каждый тик', () => {
  const battle = makeBattle(), t = battle.place(player(), 'pyro', 10, 4);
  battle.setMods(t, { runes: ['ignite', 'flameRing'] });
  near(t.ring, FIRE.ring.radius);
  battle.random = () => 0.99;
  const close = walker(battle, 10, 1e6), far = walker(battle, 16, 1e6);
  still(close, far);
  runFor(battle, PULSE * 2 + 0.01);
  ok(hit(close) > 0, 'внутри кольца');
  eq(hit(far), 0, 'снаружи — нет');
  battle.setMods(t, { runes: ['ignite', 'flameRing'], power: 100 });
  near(t.ring, Math.min(FIRE.ring.max, FIRE.ring.radius + FIRE.ring.grow), 'радиус растёт с мощью');
  battle.setMods(t, { runes: ['ignite', 'flameRing'], power: 5000 });
  near(t.ring, FIRE.ring.max, 'но не больше предела');
  battle.setMods(t, { runes: ['fireball', 'flameRing'] });
  eq(t.ring, 0, 'только у стиля «Возгорание»');
});

test('маг огня, возгорание: стена огня — 3 клетки у ближайшей дороги, сперва общей', () => {
  const battle = mapWith(), t = battle.place(player(), 'pyro', 9, 4);
  battle.setMods(t, { runes: ['ignite', 'fireWall'] });
  const cells = battle._blazeOf(t).cells.map((cell) => [cell.x - 0.5, cell.y - 0.5]);
  eq(cells, [[9, 5], [10, 5], [11, 5]], 'эпицентр на общей дороге, по клетке в обе стороны');
  battle.random = () => 0.99;
  const inside = walker(battle, 12, 1e6), outside = walker(battle, 16, 1e6);
  still(inside, outside);
  runFor(battle, PULSE + 0.01);
  ok(hit(inside) >= t.damage * FIRE.wall.mul * 0.99, 'сильно жжёт в стене');
  eq(hit(outside), 0);
  const moved = battle.place(player(), 'pyro', 4, 4);
  battle.setMods(moved, { runes: ['ignite', 'fireWall'] });
  eq(battle._blazeOf(moved).cells.map((cell) => cell.x - 0.5), [3, 4, 5], 'без общей рядом — ближайшая');
});

test('маг огня, возгорание: аматерасу — чёрное пламя, вспыхивает чаще, урон мага по нему больше', () => {
  const battle = makeBattle(), t = battle.place(player(), 'pyro', 10, 4), other = battle.place(player(), 'pyro', 2, 2);
  battle.setMods(t, { runes: ['ignite', 'amaterasu'] });
  battle.setMods(other, { runes: ['ignite'] });
  const mob = walker(battle, 5, 1e9);
  still(mob);
  battle.random = () => 0.01;
  battle.step(TICK);
  eq(mob.black.get(t), 1, 'чёрное пламя');
  eq(mob.black.has(other), false, 'без аматерасу — обычное');
  ok(battle.events.some((e) => e.kind === 'ignite' && e.black));
  const plain = walker(battle, 15, 1e9);
  still(plain);
  battle.random = () => FIRE.ignite * 1.5;
  const was = hit(mob);
  runFor(battle, PULSE + 0.1);
  ok(hit(mob) > was, 'с чёрным пламенем вспыхивает чаще');
  eq(hit(plain), 0, 'без него — нет');
  eq(mob.black.get(t), 2);
  let before = hit(mob);
  battle._hurt(mob, 10, t, 'fire', true);
  const own = hit(mob) - before;
  before = hit(mob);
  battle._hurt(mob, 10, other, 'fire', true);
  near(own / (hit(mob) - before), 1 + FIRE.black.damage * 2, 'урон мага больше, урон других — как был');
});

test('маг огня, возгорание: феникс летит от сердца к случайному выходу и жжёт каждого по разу', () => {
  const battle = makeBattle(), t = battle.place(player(), 'pyro', 10, 2);
  battle.setMods(t, { runes: ['ignite', 'phoenix'] });
  battle.random = () => 0.99;
  const a = walker(battle, 3, 1e9), b = walker(battle, 12, 1e9);
  still(a, b);
  battle.step(TICK);
  eq(battle.phoenixes.length, 1, 'вылетел');
  const way = battle.phoenixes[0].cells;
  eq([way[0].x, way[0].y], [19.5, 5.5], 'от сердца');
  runFor(battle, way.length / FIRE.phoenix.speed + 0.5);
  eq(battle.phoenixes.length, 0, 'долетел до выхода');
  ok(hit(a) > 0 && Math.abs(hit(a) - hit(b)) < 1e-6 * hit(a), 'каждого по разу');
  ok(hit(a) >= t.damage * FIRE.phoenix.mul * 0.99, 'очень сильный огонь');
  runFor(battle, FIRE.phoenix.every);
  eq(battle.events.filter((e) => e.kind === 'phoenix').length, 2, 'снова через несколько секунд');

  const fork = mapWith(), f = fork.place(player(), 'pyro', 12, 2);
  fork.setMods(f, { runes: ['ignite', 'phoenix'] });
  still(walker(fork, 3, 1e9));
  fork.random = () => 0.99;
  fork.step(TICK);
  const exit = fork.phoenixes[0].cells;
  eq([exit[exit.length - 1].x, exit[exit.length - 1].y], [10.5, 0.5], 'ко второму выходу');
});

test('стихии: мага огня не тянет к мобам с иммунитетом к огню — не бьёт, не поджигает, не жжёт кольцом', () => {
  const battle = makeBattle(), t = battle.place(player(), 'pyro', 10, 4);
  battle.setMods(t, { runes: ['fireball'] });
  battle.random = () => 0.99;
  t.critChance = 0;
  const ember = creature(battle, 'ember', 11);
  still(ember);
  eq(battle._target(t), null, 'одна цель, и та с иммунитетом — целиться не во что');
  eq(battle._fire(t), false, 'шар не летит');
  const plain = creature(battle, 'zombie', 12);
  still(plain);
  eq(battle._target(t), plain, 'берёт того, кого огонь берёт');
  battle.setMods(t, { runes: ['ignite', 'flameRing', 'fireWall', 'phoenix'] });
  battle.random = () => 0.01;
  const before = battle.events.length;
  runFor(battle, PULSE * 4);
  eq(ember.hp, ember.max, 'возгорание, кольцо, стена и феникс его не трогают');
  no(battle.events.slice(before).some((e) => e.mob === ember && e.kind === 'immune'), 'и не показывают «иммунитет»');
  no(battle.events.slice(before).some((e) => e.kind === 'ignite' && e.x === ember.x && e.y === ember.y));
  ok(hit(plain) > 0, 'остальных жжёт');
  const sky = makeBattle(), d = sky.place(player(), 'pyro', 2, 4);
  sky.setMods(d, { runes: ['dragon', 'flight'] });
  const front = creature(sky, 'ember', 16), back = creature(sky, 'zombie', 10);
  still(front, back);
  runFor(sky, FIRE.idle + 0.2);
  ok(Math.abs(d.cx - back.x) < 1.6 && Math.abs(d.cy - back.y) < 1.6, 'дракон летит к первому, кого может жечь');
  const thunder = battle.place(player(), 'thunder', 12, 4), storm = creature(battle, 'stormling', 13);
  still(storm);
  no(battle._targetable(thunder, storm), 'маг молнии тоже не целится в грозового элементаля');
  ok(battle._targetable(thunder, ember), 'а в огненного — да');
});
