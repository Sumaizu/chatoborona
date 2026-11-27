import { test, eq, ok, no } from './harness.js';
import { STRAIGHT, makeBattle, player, runFor, seeded } from './fixtures.js';
import { AIM, ARCANE, BITE_TIME, Battle, EARN, EARTH, RAGE, WOLF, flier, godStage, hammerAt, HELP, HOLY, SONG, SPELL, STORM, WATER, WOOD, GRENADE, MECH, MOVE_PAUSE, OVERTIME, FIRE,
  PULSE, REACTIONS, ROT, SHOT, SPLIT_TIME }
  from '../../site/reborn/js/battle.js';
import { SIZE } from '../../site/reborn/js/field.js';
import { AFFIXES, BOSSES, DIABLO, ELITES, FAMILIES, FAMILY_BY_ID, FINALE, LIVES, LOOKS, MIGHT, MIMIC, MOBS, POWERS,
  SILVER, TERRAIN, TICK, familyPool, resistOf, silverChance, waveHp, waveSpawns, xpForLevel }
  from '../../site/reborn/js/balance.js';
import { FARM } from '../../site/reborn/js/gacha.js';
import { CLASSES, CLASS_BY_ID, RUNE_CAPS, baseOf, choiceOf, describe } from '../../site/reborn/js/classes.js';

const leakOf = (wave) => waveSpawns(wave).reduce((sum, s) => sum + MOBS[s.type].leak, 0);
const near = (actual, expected, note = '') => ok(Math.abs(actual - expected) < 1e-6 * Math.max(1, Math.abs(expected)),
  (note ? note + ': ' : '') + actual + ' вместо ' + expected);
const hit = (mob) => mob.max - mob.hp;
const near2 = (zone, mob) => Math.hypot(zone.x - mob.x, zone.y - mob.y) < 0.01;
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
  const solo = FARM.part + FARM.damage + FARM.killer;
  ok(hero.xp >= xpForLevel(40) + count * solo * 0.99);
  near(hero.coins, FARM.coins * solo * MOBS.normal.coins * earn.coins * count);
});

test('бой: награда за моба — каждому, кто бил, поровну за участие, остальное — по доле урона и добившему', () => {
  const battle = makeBattle(), a = level(20), b = level(20), earn = CLASS_BY_ID.get('frost').earn;
  const ta = battle.place(a, 'frost', 2, 4), tb = battle.place(b, 'frost', 2, 6);
  battle.startWave(1, 2);
  finish(battle);
  const count = waveSpawns(1).length;
  eq(a.kills + b.kills, count);
  eq(a.kills + a.assists, count);
  eq(b.kills + b.assists, count);
  near(a.coins + b.coins, FARM.coins * (2 * FARM.part + FARM.damage + FARM.killer) * MOBS.normal.coins * earn.coins * count,
    'на двоих — участие обоим, урон делится, добившему сверху');
  eq(ta.run.kills, a.kills);
  eq(tb.run.assists, b.assists);
});

test('бой: у каждого класса свой множитель опыта и монет за моба — так классы получают поровну', () => {
  for (const cls of CLASSES) {
    const battle = makeBattle(), hero = player(), tower = battle.place(hero, cls.id, 2, 4);
    const mob = battle._spawn({ type: 'normal', hp: 10 }, 3);
    battle._hurt(mob, 1e6, tower, null);
    ok(mob.dead, cls.id);
    const solo = FARM.part + FARM.damage + FARM.killer;
    near(hero.xp, MOBS.normal.xp * cls.earn.xp * solo, cls.id + ' опыт');
    near(hero.coins, FARM.coins * solo * MOBS.normal.coins * cls.earn.coins, cls.id + ' монеты');
  }
});

test('награда: кто нанёс больше урона, тому больше; снайпер за элитных и боссов — втрое', () => {
  const battle = makeBattle(), big = player(), small = player();
  const a = battle.place(big, 'pyro', 2, 4), b = battle.place(small, 'pyro', 2, 6);
  const mob = battle._spawn({ type: 'normal', hp: 100 }, 3);
  battle._hurt(mob, 10, b, null);
  battle._hurt(mob, 1e6, a, null);
  ok(mob.dead);
  ok(big.coins > small.coins * 2, 'больше урона — больше монет: ' + big.coins + ' / ' + small.coins);
  ok(small.coins >= FARM.coins * FARM.part * CLASS_BY_ID.get('pyro').earn.coins - 1e-9, 'за участие — всегда');
  const field = makeBattle(), sniper = player(), gunner = player();
  const s = field.place(sniper, 'sniper', 2, 4, { runes: ['scope'] }), g = field.place(gunner, 'sniper', 2, 6, { runes: ['assault'] });
  const boss = put(field, special(field, 'boss', BOSSES[0].id, 1e6), 3);
  field._hurt(boss, 5e5, s, null);
  field._hurt(boss, 1e9, g, null);
  ok(boss.dead);
  ok(sniper.coins > gunner.coins * 1.5, 'снайпер за босса получает больше: ' + sniper.coins + ' / ' + gunner.coins);
  eq(EARN.scope.big, 3);
});

test('награда: помощь — контроль, лечение, спасение сердца — платит монетами и опытом', () => {
  const battle = makeBattle(), hero = player(), t = battle.place(hero, 'frost', 2, 4, { runes: ['cryo'] });
  const coins = hero.coins, xp = hero.xp;
  battle._help(t, HELP.save);
  ok(hero.coins > coins && hero.xp > xp, 'помощь оплачена');
  near(hero.coins - coins, HELP.save * EARN.cryo.help * FARM.helpCoins, 'криоманту — вдвое');
  const plain = battle.place(player(), 'pyro', 2, 6), before = plain.player.coins;
  battle._help(plain, HELP.assist, false);
  eq(plain.player.coins, before, 'простое участие в убийстве не платит второй раз');
});

test('награда: поддержка получает долю урона тех, кого усиливает', () => {
  const battle = makeBattle(), monkPlayer = player(), ally = player();
  const monk = battle.place(monkPlayer, 'priest', 4, 3, { runes: ['monk', 'mantraPower'] });
  const gun = battle.place(ally, 'sniper', 5, 3, { runes: ['assault'] });
  battle.step(TICK);
  ok(gun.boostBy.has(monk), 'монах усиливает соседа');
  const mob = battle._spawn({ type: 'normal', hp: 100 }, 3);
  battle._hurt(mob, 1e6, gun, null);
  ok(mob.dead);
  ok(monkPlayer.coins > FARM.coins * FARM.part * CLASS_BY_ID.get('priest').earn.coins, 'монах получил больше, чем за участие');
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
  const battle = makeBattle(), flag = battle.place(player(), 'earth', 4, 4);
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

test('бой: моба не отбросить дальше предела, оглушение не чаще, чем позволяет передышка', () => {
  const battle = makeBattle(), shaman = battle.place(level(100), 'earth', 10, 4);
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

test('гигантская турель поворачивается медленно и стреляет, только когда ствол смотрит на цель', () => {
  const battle = makeBattle(), t = battle.place(player(), 'mechanic', 10, 4);
  battle.setMods(t, { runes: ['turret', 'giant'] });
  const mob = walker(battle, 12, 1e9);
  still(mob);
  const want = Math.atan2(mob.x - t.cx, -(mob.y - t.cy)), off = () => Math.abs(Math.atan2(Math.sin(t.angle - want),
    Math.cos(t.angle - want)));
  t.angle = want + Math.PI;
  const fired = () => battle.events.some((e) => e.tower === t && (e.kind === 'shot' || e.kind === 'burst'));
  let spent = 0;
  while (!fired() && spent < 5) {
    battle.step(TICK);
    spent += TICK;
  }
  ok(fired(), 'выстрелила');
  ok(spent >= (Math.PI - AIM.heavy.slack) / AIM.heavy.turn - TICK, 'не раньше, чем довернулась: ' + spent.toFixed(2));
  ok(AIM.heavy.turn < AIM.turn && off() <= AIM.heavy.slack, 'медленнее остальных и точно в цель');
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
  const a = walker(battle, 13.6, 1e9), b = walker(battle, 13.3, 1e9), c = walker(battle, 13, 1e9);
  still(a, b, c);
  t.angle = Math.atan2(a.x - t.cx, -(a.y - t.cy));
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

test('друид, стена корней: 5 клеток дороги рядом — замедляет и понемногу бьёт ядом', () => {
  const battle = makeBattle(), t = forester(battle, 10, 4, ['druid', 'roots']);
  const cells = battle._blazeOf(t, WOOD.roots.cells).cells;
  eq(cells.map((cell) => cell.x - 0.5), [8, 9, 10, 11, 12], 'по две клетки в стороны');
  const inside = walker(battle, 9, 1e9), out = walker(battle, 15, 1e9), ghost = walker(battle, 13, 1e9);
  ghost.undead = true;
  still(inside, out, ghost);
  runFor(battle, 1);
  ok(inside.slowUntil > battle.time && inside.slow > 0, 'замедляет');
  ok(hit(inside) > 0 && hit(inside) < t.damage * 2, 'ядом — понемногу');
  eq(out.slowUntil, 0, 'вне стены не замедляет');
  eq(hit(ghost), 0, 'нежить яд не берёт');
});

test('друид, ястреб: до трёх, сперва летучих, у каждого своя цель, бьёт сильнее птицы — наполовину ядом', () => {
  const battle = makeBattle(), t = forester(battle, 1, 4, ['druid', 'hawk', 'hawk', 'hawk']);
  const lead = walker(battle, 17, 1e9), flyer = walker(battle, 6, 1e9, bat()), second = walker(battle, 9, 1e9);
  still(lead, flyer, second);
  battle.step(TICK);
  const hawks = battle.drones.filter((d) => d.tower === t && d.kind === 'hawk');
  eq(hawks.length, 3);
  eq(battle.drones.filter((d) => d.tower === t && d.kind === 'bird').length, 1, 'и своя птица');
  ok(hawks[0].target === flyer, 'первый — к летучему, хоть тот и позади');
  eq(new Set(hawks.map((d) => d.target)).size, 3, 'цели разные');
  ok(WOOD.hawk.mul / WOOD.hawk.every > 2 * WOOD.bird.mul / WOOD.bird.every, 'сильнее птицы');
  lead.dead = second.dead = true;
  battle.step(TICK);
  ok(hawks.every((d) => d.target === flyer), 'цель одна — бьют вместе');
  runFor(battle, 6);
  ok(hit(flyer) > 0 && battle.events.some((e) => e.kind === 'peck' && e.hawk), 'долетели и бьют');
  const dead = makeBattle(), d = forester(dead, 16, 4, ['druid', 'hawk']), ghost = walker(dead, 17, 1e9);
  ghost.undead = true;
  still(ghost);
  runFor(dead, 4);
  const claws = dead.events.filter((e) => e.kind === 'peck' && e.hawk).length;
  const pecks = dead.events.filter((e) => e.kind === 'peck' && !e.hawk).length;
  ok(claws > 0, 'нежить ястреб тоже бьёт');
  near(hit(ghost), claws * d.damage * WOOD.hawk.mul * (1 - WOOD.hawk.poison) + pecks * d.damage * WOOD.bird.mul,
    'по нежити — только обычная половина');
});

test('друид: птицы и ястребы кружат вокруг него в разных местах, а не в одной точке', () => {
  const battle = makeBattle(), t = forester(battle, 10, 2, ['druid', 'flock', 'flock', 'hawk', 'hawk', 'hawk']);
  runFor(battle, 3);
  const pets = battle.drones.filter((d) => d.tower === t);
  eq(pets.length, 7);
  let closest = Infinity;
  pets.forEach((a, i) => pets.slice(i + 1).forEach((b) => {
    closest = Math.min(closest, Math.hypot(a.x - b.x, a.y - b.y));
  }));
  ok(closest > 0.25, 'ближайшие двое — ' + closest.toFixed(2) + ' клетки');
  ok(pets.every((d) => Math.hypot(d.x - t.cx, d.y - t.cy) < 1.2), 'все рядом с друидом');
});

test('друид, путы: удары птиц иногда опутывают моба — стоит на месте; элитных тоже, боссов и летучих нет', () => {
  const battle = makeBattle(), t = forester(battle, 1, 4, ['druid', 'snare']);
  const mob = walker(battle, 10, 1e9);
  battle.random = () => 0;
  battle._snare(t, mob, t);
  ok(mob.rootUntil > battle.time, 'опутан');
  const d = mob.d;
  runFor(battle, 1);
  eq(mob.d, d, 'стоит');
  battle.time = mob.rootUntil + 0.1;
  battle._snare(t, mob, t);
  ok(mob.rootUntil < battle.time, 'сразу снова не опутать');
  const chief = special(battle, 'elite', 'vampire', 1e9), boss = special(battle, 'boss', 'crusher');
  battle._snare(t, chief, t);
  battle._snare(t, boss, t);
  ok(chief.rootUntil > battle.time, 'элитного — можно');
  eq(boss.rootUntil, 0, 'босса — нет');
  const bird = walker(battle, 14, 1e9, bat());
  battle._snare(t, bird, t);
  eq(bird.rootUntil, 0, 'летучих — нет');
  const plain = forester(battle, 3, 4, ['druid']), other = walker(battle, 12, 1e9);
  battle.random = () => 0;
  battle._snare(plain, other, plain);
  eq(other.rootUntil, 0, 'без пут — никого');
});

test('друид, стая: ещё птица, второй раз — ещё две; обычные птицы бьют и ядом', () => {
  const count = (runes) => {
    const battle = makeBattle(), t = forester(battle, 1, 4, runes);
    battle.step(TICK);
    return battle.drones.filter((d) => d.tower === t && d.kind === 'bird').length;
  };
  eq([count(['druid']), count(['druid', 'flock']), count(['druid', 'flock', 'flock'])], [1, 2, 4]);
  const battle = makeBattle(), t = forester(battle, 16, 4, ['druid', 'flock']);
  const mob = walker(battle, 17, 1e9);
  still(mob);
  runFor(battle, 4);
  const pecks = battle.events.filter((e) => e.kind === 'peck' && e.tower === t).length;
  ok(pecks > 0);
  near(hit(mob) / pecks, t.damage * WOOD.bird.mul * (1 + WOOD.flock.poison), 'клюёт и травит');
});

test('охотник, ловчий: сеть держит моба на месте и травит ядом; босса не держит', () => {
  const battle = makeBattle(), t = forester(battle, 10, 4, ['hunter', 'catcher']);
  const mob = walker(battle, 12, 1e9);
  battle.random = () => 0;
  ok(battle._fire(t));
  ok(mob.stuck && mob.stuck.kind === 'net' && mob.netUntil > battle.time, 'в сети');
  ok(battle.events.some((e) => e.kind === 'net' && e.tower === t));
  const d = mob.d, was = hit(mob);
  runFor(battle, 1);
  eq(mob.d, d, 'стоит');
  near(hit(mob) - was, t.damage * WOOD.catcher.dps, 'ядом — понемногу');
  const boss = special(battle, 'boss', 'crusher');
  no(battle._stick(boss, t, 'net', 1, 1), 'босса сеть не держит');
});

test('охотник, трофей: за мобов, погибших в ауре, монет на 25% больше; две ауры — ещё вполовину', () => {
  const coins = (count, far) => {
    const battle = makeBattle(), gun = mechanic(battle, 3, 4, []);
    for (let i = 0; i < count; i++) forester(battle, 10 + i, 3, ['hunter', 'trophy']);
    const mob = walker(battle, far ? 1 : 11, 10);
    still(mob);
    battle._hurt(mob, 100, gun);
    ok(mob.dead);
    return gun.run.coins;
  };
  const plain = coins(0, false);
  near(coins(1, false), plain * 1.25);
  near(coins(2, false), plain * 1.375, 'вторая аура — половина');
  near(coins(1, true), plain, 'вне ауры — как обычно');
});

test('охотник, медвежий капкан: сразу три на случайных клетках дороги в радиусе, держит даже босса, травит и снова открыт через 10 секунд', () => {
  const battle = makeBattle(), t = forester(battle, 10, 4, ['hunter', 'beartrap']);
  t.reloadUntil = 1e9;
  battle.step(TICK);
  eq(battle.traps.length, 3, 'одна прокачка — три капкана');
  ok(battle.traps.every((trap) => trap.y === 5.5 && Math.hypot(trap.x - t.cx, trap.y - t.cy) <= t.range + 0.75),
    'на дороге, в радиусе');
  eq(new Set(battle.traps.map((trap) => trap.x)).size, 3, 'на разных клетках');
  const trap = battle.traps[0], boss = special(battle, 'boss', 'crusher');
  const mob = walker(battle, trap.x + 0.1, 1e9);
  runFor(battle, 0.5);
  ok(mob.stuck && mob.stuck.kind === 'trap', 'попал');
  const d = mob.d, was = hit(mob);
  runFor(battle, 1);
  eq(mob.d, d, 'стоит');
  near(hit(mob) - was, t.damage * WOOD.beartrap.dps, 'травит ядом');
  ok(trap.openAt > battle.time + 8, 'закрыт на 10 секунд');
  ok(battle._stick(boss, t, 'trap', 1, 1, true), 'босса держит');
  const left = battle.traps.find((item) => item.openAt === 0), flyer = walker(battle, left.x + 0.5, 1e9, bat());
  still(flyer);
  runFor(battle, 0.3);
  no(flyer.stuck, 'летучего капкан не ловит');
});

test('охотник, град стрел: раз в 10 секунд бьёт всех на 4 клетки вокруг цели как выстрел и ещё ядом', () => {
  const battle = makeBattle(), t = forester(battle, 10, 4, ['hunter', 'hail']);
  t.reloadUntil = 1e9;
  const lead = walker(battle, 12, 1e9), side = walker(battle, 9, 1e9), far = walker(battle, 19, 1e9);
  still(lead, side, far);
  battle.step(TICK);
  ok(battle.events.some((e) => e.kind === 'hail' && e.radius === WOOD.hail.radius));
  runFor(battle, WOOD.hail.fall + 0.05);
  for (const mob of [lead, side]) near(hit(mob), t.damage * (1 + WOOD.hail.poison), 'выстрел и яд');
  eq(hit(far), 0, 'дальше 4 клеток — мимо');
  runFor(battle, 5);
  eq(battle.events.filter((e) => e.kind === 'hail').length, 1, 'следующий — не раньше чем через 10 секунд');
  const nets = makeBattle(), h = forester(nets, 10, 4, ['hunter', 'hail', 'catcher']);
  h.reloadUntil = 1e9;
  const crowd = [12, 11, 9, 8].map((d) => walker(nets, d, 1e9));
  still(...crowd);
  let roll = 0;
  nets.random = () => [0.99, 0.1, 0.99, 0.1, 0.99][roll++ % 5];
  nets.step(TICK);
  runFor(nets, WOOD.hail.fall + 0.05);
  eq(crowd.filter((mob) => mob.stuck && mob.stuck.kind === 'net').length, 2, 'у каждого свой бросок: двое в сетях');
});

test('ведьма, ядовитый взрыв: где упал шар — облако на клетку, травит всех внутри; метит ядом только с реакцией', () => {
  const battle = makeBattle(), t = forester(battle, 10, 4, ['witch', 'venomBurst']);
  const mob = walker(battle, 12, 1e9), other = walker(battle, 12.6, 1e9);
  still(mob, other);
  ok(battle._fire(t));
  runFor(battle, WOOD.witch.flight + 0.05);
  eq(battle.clouds.length, 1);
  const was = hit(other);
  runFor(battle, 1);
  near(hit(other) - was, t.damage * WOOD.venomBurst.dps, 'облако травит соседа');
  no(other.marks && other.marks.has('poison'), 'без реакции — без метки');
  runFor(battle, WOOD.venomBurst.time);
  eq(battle.clouds.length, 0, 'облако рассеялось');
});

test('ведьма, котёл яда: рядом котёл до конца игры, кидает сгустки, лужи травят идущих и не складываются', () => {
  const battle = makeBattle(), t = forester(battle, 10, 3, ['witch', 'cauldron']);
  t.reloadUntil = 1e9;
  const mob = walker(battle, 12, 1e9);
  still(mob);
  battle.step(TICK);
  eq(battle.cauldrons.length, 1);
  const pot = battle.cauldrons[0];
  ok(Math.abs(pot.x - t.x) <= 1 && Math.abs(pot.y - t.y) <= 1 && !battle.free(pot.x, pot.y), 'рядом и занимает клетку');
  runFor(battle, WOOD.cauldron.every + WOOD.cauldron.flight + 0.1);
  ok(battle.events.some((e) => e.kind === 'blob'));
  ok(battle.puddles.length >= 1, 'лужа');
  const ground = walker(battle, 5, 1e9);
  still(ground);
  battle.puddles = [0, 1].map(() => ({ tower: t, x: ground.x, y: ground.y, radius: 0.6, until: battle.time + 5,
    born: battle.time, dps: 10, plague: false }));
  const was = hit(ground);
  battle._venom(1, battle.time);
  near(hit(ground) - was, 10, 'две лужи — как одна');
  battle.endWave();
  eq(battle.cauldrons.length, 1, 'котёл остаётся');
});

test('ведьма, чума: чёрный яд бьёт нежить, остальных — на 10% сильнее', () => {
  const plain = makeBattle(), w = forester(plain, 10, 4, ['witch']), black = forester(plain, 10, 2, ['witch', 'plague']);
  const ghost = walker(plain, 12, 1e9), mob = walker(plain, 11, 1e9);
  ghost.undead = true;
  still(ghost, mob);
  plain._hurt(ghost, 10, w, 'poison');
  eq(hit(ghost), 0, 'обычный яд нежить не берёт');
  plain._hurt(ghost, 10, black, 'poison');
  near(hit(ghost), 10, 'чума — берёт');
  plain._hurt(mob, 10, black, 'poison');
  near(hit(mob), 11);
  plain.random = () => 0.99;
  ok(plain._fire(black));
  ok(plain.events.some((e) => e.kind === 'shot' && e.tower === black && e.tone === 'plague'), 'шар чёрный');
});

test('ведьма, поглощение: втягивает все облака и лужи на карте — шар во столько раз сильнее; бросает так же часто', () => {
  const battle = makeBattle(), t = forester(battle, 10, 4, ['witch', 'absorb', 'venomBurst']);
  const plain = forester(battle, 10, 2, ['witch']);
  near(t.interval, plain.interval);
  plain.reloadUntil = 1e9;
  const mob = walker(battle, 13, 1e9);
  still(mob);
  const pool = (x, list) => battle[list].push({ tower: plain, x, y: 5.5, radius: 0.6, until: 1e9, born: 0, dps: 0,
    plague: false });
  pool(12.5, 'clouds');
  pool(11.5, 'clouds');
  pool(9.5, 'puddles');
  pool(19.5, 'puddles');
  ok(battle._fire(t));
  eq([battle.clouds.length, battle.puddles.length], [0, 0], 'и дальнюю лужу тоже');
  ok(battle.events.some((e) => e.kind === 'absorb' && e.points.length === 4));
  runFor(battle, WOOD.absorb.time + WOOD.witch.flight + 0.05);
  ok(hit(mob) >= t.damage * 4 - 1e-6 && hit(mob) < t.damage * 4.3, 'втянула четыре — ×4');
  ok(battle.events.some((e) => e.kind === 'shot' && e.tower === t && e.size > 11), 'шар крупнее');
  eq(battle.clouds.length, 1);
  near(battle.clouds[0].dps, t.damage * WOOD.venomBurst.dps * 4, 'и облако ×4');
});

function priest(battle, x, y, runes) {
  const t = battle.place(player(), 'priest', x, y);
  battle.setMods(t, { runes });
  t.critChance = 0;
  t.cooldown = 1e9;
  return t;
}

test('жрец: без стиля — светлые частицы из посоха в того, кто ближе к сердцу, нежить упокаивает; лекаря больше нет', () => {
  const battle = makeBattle(), t = priest(battle, 10, 4, []);
  eq(t.cls.name, 'Жрец');
  no(CLASS_BY_ID.has('healer'), 'лекарь заменён жрецом');
  const back = walker(battle, 8, 1e9), front = walker(battle, 14, 1e9), far = walker(battle, 16, 1e9);
  still(back, front, far);
  ok(battle._fire(t));
  near(hit(front), t.damage);
  eq(hit(back) + hit(far), 0);
  ok(battle.events.some((e) => e.kind === 'shot' && e.tower === t && e.mob === front), 'частицы летят в цель');
  const skeleton = creature(battle, 'skeleton', 6, 100);
  battle._hurt(skeleton, 1e6, t);
  runFor(battle, 2);
  eq(battle.mobs.filter((m) => m.look === 'skeleton').length, 0, 'убитая жрецом нежить не встаёт');
});

test('жрец-ангел: рубит мечом только того, кто в клетке вокруг него, и сильнее частиц', () => {
  const battle = makeBattle(), plain = priest(battle, 2, 4, []), t = priest(battle, 10, 4, ['angel']);
  ok(t.range < 1.5, 'бьёт только рядом');
  near(t.damage, plain.damage * HOLY.angel.mul);
  const far = walker(battle, 13, 1e9);
  still(far);
  no(battle._fire(t), 'в двух клетках — не достаёт');
  const close = walker(battle, 11, 1e9);
  still(close);
  ok(battle._fire(t));
  near(hit(close), t.damage);
  eq(hit(far), 0);
  ok(battle.events.some((e) => e.kind === 'strike' && e.tower === t && e.mob === close), 'взмах мечом');
});

test('ангел: бьёт ровно все соседние клетки — ни оружие, ни ауры, ни интеллект это не меняют', () => {
  const battle = makeBattle(), t = priest(battle, 10, 4, ['angel']);
  eq(t.range, HOLY.angel.reach);
  battle.setMods(t, { runes: ['angel'], range: 2 });
  priest(battle, 11, 3, ['monk', 'mantraRange']);
  battle.step(TICK);
  eq(t.range, HOLY.angel.reach, 'мантра дальности и оружие не помогают');
  const corner = walker(battle, 12, 1e9), beyond = walker(battle, 13, 1e9);
  still(corner, beyond);
  ok(battle._targetable(t, corner), 'соседняя клетка по диагонали — достаёт');
  no(battle._targetable(t, beyond), 'через клетку — нет');
});

test('одноразовые навыки — за игроком: заново на карте щит и второй шанс не возвращаются', () => {
  const battle = makeBattle(), smith = player(), saint = player();
  let mech = battle.place(smith, 'mechanic', 2, 6, { runes: ['turret', 'bulwark'] });
  battle.startWave(1, 2);
  eq(battle.steel, 1);
  battle.remove(mech);
  mech = battle.place(smith, 'mechanic', 2, 6, { runes: ['turret', 'bulwark'] });
  eq(battle.steel, 1, 'в той же волне щит второй раз не ставится');
  let angel = battle.place(saint, 'priest', 3, 6, { runes: ['angel', 'lastStand'] });
  battle.lives = 0;
  ok(battle._lastStand(null));
  battle.endWave();
  battle.remove(angel);
  angel = battle.place(saint, 'priest', 3, 6, { runes: ['angel', 'lastStand'] });
  ok(angel.planted, 'так и стоит с мечом в земле');
  no(battle._lastStand(null), 'второй шанс — один раз за игру');
  ok(mech && saint.assists >= HELP.save, 'спасение — очки помощи игроку');
});

test('ангел, кара: раз в 5 секунд добивает врага с 30% здоровья и меньше, а если таких нет — огромный урон', () => {
  const battle = makeBattle(), t = priest(battle, 10, 4, ['angel', 'smite']);
  eq(t.interval, HOLY.smite.every);
  const brute = walker(battle, 11, 1e12);
  still(brute);
  ok(battle._fire(t));
  no(brute.dead, 'здоровый — не добивает');
  near(hit(brute), t.damage * HOLY.smite.mul, 'огромный урон');
  ok(battle.events.some((e) => e.kind === 'strike' && e.smite), 'меч горит');
  const weak = walker(battle, 10.5, 1e12);
  still(weak);
  weak.hp = weak.max * 0.25;
  const was = hit(brute);
  ok(battle._fire(t));
  ok(weak.dead, 'раненого добивает в первую очередь');
  eq(hit(brute), was, 'остальных не трогает');
  const boss = put(battle, special(battle, 'boss', BOSSES[0].id, 1e12), 11);
  still(boss);
  boss.hp = boss.max * 0.2;
  ok(battle._fire(t));
  ok(boss.dead, 'и босса, если у него 30% и меньше');
});

test('баланс: урон снайперов, штурмовиков, марксманов, инквизиторов, турельщиков, ведьм, магов огня и молнии, волшебниц выше', () => {
  const battle = makeBattle(), damage = (cls, runes) => {
    const t = battle.place(player(), cls, 2 + battle.towers.length * 2, 2);
    battle.setMods(t, { runes });
    return t.damage / baseOf(t.cls).damage;
  };
  eq([SHOT.scope.mul, SHOT.assault.mul, SHOT.marksman.mul, HOLY.inquisitor.mul, MECH.turret.mul, WOOD.witch.mul],
    [9, 0.47, 2.15, 3, 0.39, 1.75]);
  eq([MECH.droneAttack.mul, MECH.droneLaser.mul, MECH.droneAir.mul], [0.6, 1.7, 0.35]);
  near(damage('pyro', []), 1.25);
  near(damage('thunder', []), 1.25);
  near(damage('sorceress', []), 1.25);
  near(damage('sniper', []), 1);
  near(damage('pyro', ['dragon']), 1.25, 'и все подклассы класса');
  near(damage('pyro', ['fireball']), 1.25);
  near(damage('thunder', ['caller']) / (STORM.caller ? STORM.caller.mul || 1 : 1), 1.25);
  near(damage('sorceress', ['shamaness']) / (SPELL.shamaness ? SPELL.shamaness.mul || 1 : 1), 1.25);
});

test('ангел, божественная помощь: в клетке от сердца после волны +1 жизнь, у двух ангелов — +2', () => {
  const battle = makeBattle(), [hx] = STRAIGHT[STRAIGHT.length - 1];
  battle.place(player(), 'priest', hx - 1, 4);
  battle.setMods(battle.towers[0], { runes: ['angel', 'mercy'] });
  const far = battle.place(player(), 'priest', 5, 4);
  battle.setMods(far, { runes: ['angel', 'mercy'] });
  battle.lives = battle.maxLives - 5;
  battle.endWave();
  eq(battle.lives, battle.maxLives - 4, 'дальний ангел не лечит');
  const second = battle.place(player(), 'priest', hx, 6);
  battle.setMods(second, { runes: ['angel', 'mercy'] });
  battle.endWave();
  eq(battle.lives, battle.maxLives - 2, 'лечение складывается');
});

test('ангел, второй шанс: сердце под неуязвимостью, волна света стирает волну, потом +10 жизней; ангел стоит до конца', () => {
  const battle = makeBattle(), t = priest(battle, 2, 4, ['angel', 'lastStand']);
  battle.lives = 1;
  const biter = walker(battle, battle.length - 1, 1e9), other = walker(battle, battle.length - 3, 1e9);
  other.speed = 0;
  battle.spawns.push({ type: 'normal', hp: 10, at: battle.time + 100 });
  for (let i = 0; i < 200 && !battle.ward; i++) battle.step(TICK);
  ok(battle.ward, 'неуязвимость на сердце');
  eq(battle.lives, 0);
  ok(t.planted, 'ангел опустился и воткнул меч');
  ok(battle.events.some((e) => e.kind === 'lastStand'));
  runFor(battle, HOLY.second.charge + 0.1);
  ok(other.dead && battle.cleared, 'волна стёрта');
  ok(battle.events.some((e) => e.kind === 'judgement'));
  battle.endWave();
  eq(battle.ward, null);
  eq(battle.lives, HOLY.second.lives);
  const mob = walker(battle, 2, 1e9);
  still(mob);
  no(battle._fire(t), 'атаковать больше не может');
  battle.lives = 1;
  walker(battle, battle.length - 1, 1e9);
  for (let i = 0; i < 200 && battle.lives > 0; i++) battle.step(TICK);
  eq(battle.ward, null, 'второй раз не спасает');
  ok(biter.dead);
});

test('ангел, второй шанс против Диабло: волна его не ранит, но держит 10 секунд, потом он разбивает сердце', () => {
  const battle = makeBattle();
  priest(battle, 2, 4, ['angel', 'lastStand']);
  battle.random = () => 0;
  const devil = battle._spawn({ type: 'boss', kind: DIABLO, hp: 1e12 }, battle.length - 2);
  for (let i = 0; i < 400 && !battle.ward; i++) battle.step(TICK);
  ok(battle.ward && !devil.dead, 'удар Диабло принял ангел');
  runFor(battle, HOLY.second.charge + 0.1);
  no(devil.dead, 'волна его не убила');
  eq(devil.hp, devil.max, 'и не ранила');
  runFor(battle, HOLY.second.awe - 1);
  ok(battle.lives === 0 && battle.ward, 'Диабло ещё стоит, сердце держится');
  for (let i = 0; i < 400 && battle.ward; i++) battle.step(TICK);
  eq(battle.ward, null, 'разбил сердце сквозь неуязвимость');
  eq(battle.lives, 0);
});

test('ангел, святая земля: шар света в случайного врага, кольцо на 4 клетки ранит всех', () => {
  const battle = makeBattle(), t = priest(battle, 2, 4, ['angel', 'holyGround']);
  battle.random = () => 0;
  const target = walker(battle, 14, 1e9), near4 = walker(battle, 17, 1e9), far = walker(battle, 9, 1e9);
  still(target, near4, far);
  battle.mobs.splice(battle.mobs.indexOf(target), 1);
  battle.mobs.unshift(target);
  runFor(battle, 0.1);
  ok(battle.events.some((e) => e.kind === 'holyOrb' && e.mob === target), 'шар летит в моба далеко от ангела');
  eq(hit(target), 0);
  runFor(battle, HOLY.holyGround.flight);
  ok(battle.events.some((e) => e.kind === 'holyRing'));
  ok(hit(target) > 0 && hit(near4) > 0, 'кольцо задело всех рядом');
  eq(hit(far), 0, 'дальше 4 клеток — нет');
});

test('жрец-монах: бьёт посохом на 1,5 клетки и очень часто', () => {
  const battle = makeBattle(), plain = priest(battle, 2, 4, []), t = priest(battle, 10, 4, ['monk']);
  ok(t.range >= 1.5 && t.range < 2.2, 'на 1,5 клетки');
  ok(t.interval < plain.interval / 2, 'бьёт намного чаще');
  const far = walker(battle, 13, 1e9), mob = walker(battle, 12, 1e9);
  still(far, mob);
  ok(battle._fire(t));
  near(hit(mob), t.damage);
  eq(hit(far), 0);
  ok(battle.events.some((e) => e.kind === 'strike' && e.tower === t && e.mob === mob), 'посох вытягивается до врага');
});

test('монах, тяжёлое древко: с шансом удар — критический и оглушает', () => {
  const battle = makeBattle(), t = priest(battle, 10, 4, ['monk', 'heavyShaft']);
  const mob = walker(battle, 12, 1e9);
  still(mob);
  battle.random = () => HOLY.heavy.chance / 2;
  ok(battle._fire(t));
  near(hit(mob), t.damage * t.critMul);
  ok(mob.holdUntil > battle.time, 'оглушён');
  ok(battle.events.some((e) => e.kind === 'strike' && e.heavy));
  const calm = walker(battle, 11, 1e9);
  still(calm);
  battle.random = () => 0.99;
  battle._fire(t);
  no(calm.holdUntil > battle.time, 'без удачи — обычный удар');
});

test('монах, мантры: аура на 3 клетки — быстрее, сильнее, дальше; одинаковые складываются вполовину', () => {
  const battle = makeBattle(), monk = priest(battle, 5, 4, ['monk', 'mantraSpeed', 'mantraPower', 'mantraRange']);
  const ally = battle.place(player(), 'forester', 7, 4), far = battle.place(player(), 'forester', 12, 4);
  battle.step(TICK);
  for (const t of [monk, ally]) {
    near(t.boost.rate, HOLY.mantra.haste);
    near(t.boost.damage, HOLY.mantra.damage);
    near(t.boost.range, HOLY.mantra.range);
    near(t.boost.might, HOLY.mantra.might, 'все три — ещё и мощь');
  }
  eq(far.boost.rate + far.boost.damage + far.boost.range + far.boost.might, 0, 'вне ауры — ничего');
  const second = priest(battle, 6, 6, ['monk', 'mantraSpeed']);
  battle.step(TICK);
  near(ally.boost.rate, HOLY.mantra.haste * 1.5, 'вторая такая же аура — вполовину');
  near(ally.boost.might, HOLY.mantra.might, 'мощь — только у повелителя мантр');
  ok(second.boost.rate > 0);
  const mob = walker(battle, 8, 1e9);
  still(mob);
  ally.critChance = 0;
  battle._hurt(mob, 10, ally);
  near(hit(mob), 10 * (1 + ally.boost.damage) * (1 + ally.boost.might));
});

test('монах, повелитель мантр: в профиле три мантры — одним навыком, а в выборе камня — тремя взятыми', () => {
  const taken = ['monk', 'mantraSpeed', 'mantraPower', 'mantraRange'];
  const info = describe('priest', taken), names = info.skills.map((skill) => skill.name);
  ok(names.includes('Повелитель мантр'));
  no(names.some((name) => name.startsWith('Мантра')), 'мантр по отдельности нет');
  const options = choiceOf('priest', taken);
  no(options.some((option) => option.skill.name === 'Повелитель мантр'), 'в выборе общего навыка нет');
  eq(options.filter((option) => option.skill.name.startsWith('Мантра') && option.state === 'taken').length, 3,
    'три мантры — взятыми');
  ok(options.some((option) => option.skill.id === 'heavyShaft' && option.state === 'open'));
  ok(choiceOf('priest', ['monk', 'mantraSpeed']).some((option) => option.skill.id === 'mantraPower'), 'пока не все три — по одной');
});

function sorc(battle, x, y, runes) {
  const t = battle.place(player(), 'sorceress', x, y);
  battle.setMods(t, { runes });
  t.critChance = 0;
  t.cooldown = 1e9;
  return t;
}

test('волшебница: шар магии летит волной в того, кто ближе к сердцу, и бьёт по прилёту', () => {
  const battle = makeBattle(), t = sorc(battle, 10, 4, []);
  eq(t.cls.name, 'Волшебница');
  const back = walker(battle, 8, 1e9), front = walker(battle, 14, 1e9);
  still(back, front);
  ok(battle._fire(t));
  eq(hit(front), 0, 'шар ещё летит');
  runFor(battle, SPELL.wisp + 0.05);
  near(hit(front), t.damage);
  eq(hit(back), 0);
});

test('менестрель: острая звуковая волна летит во врага насквозь до конца радиуса и ранит всех на линии', () => {
  const battle = mapWith(), t = sorc(battle, 10, 6, ['minstrel']);
  const a = battle._spawn({ type: 'normal', hp: 1e9 }, 5, 1), b = battle._spawn({ type: 'normal', hp: 1e9 }, 4, 1);
  const side = walker(battle, 7.5, 1e9);
  still(a, b, side);
  battle.step(TICK);
  ok(Math.abs(a.x - t.cx) < 0.1 && Math.abs(b.x - t.cx) < 0.1 && b.y < a.y, 'оба на одной линии с ней');
  ok(Math.hypot(side.x - t.cx, side.y - t.cy) < t.range, 'сбоку — тоже в радиусе');
  ok(battle._fire(t));
  ok(battle.events.some((e) => e.kind === 'chord' && e.tower === t));
  runFor(battle, t.range / SPELL.minstrel.speed + 0.05);
  ok(hit(a) > 0 && hit(b) > 0, 'волна прошла насквозь и задела обоих');
  eq(hit(side), 0, 'сбоку от линии — нет');
});

test('чародейка: достаёт сферу из книги, бросает — урон по прилёту', () => {
  const battle = makeBattle(), t = sorc(battle, 10, 4, ['enchantress']), mob = walker(battle, 14, 1e9);
  still(mob);
  ok(battle._fire(t));
  ok(battle.events.some((e) => e.kind === 'conjure'));
  runFor(battle, SPELL.enchantress.wind + 0.02);
  eq(hit(mob), 0, 'сфера ещё летит');
  runFor(battle, 1);
  near(hit(mob), t.damage);
});

test('чародейка, концентрированный луч сильнее её обычных атак по боссу — и с контролем магии, и с критами', () => {
  const dps = (runes) => {
    const battle = makeBattle(), t = sorc(battle, 10, 4, runes);
    t.critChance = 0.3;
    const boss = put(battle, special(battle, 'boss', 'butcher', 1e9), 13);
    still(boss);
    boss.power = null;
    boss.skillAt = 1e9;
    runFor(battle, 30);
    return hit(boss) / 30;
  };
  const volley = dps(['enchantress', 'arcaneControl']), beam = dps(['enchantress', 'arcaneControl', 'focusBeam']);
  ok(beam > volley * 1.4, 'луч ' + beam + ' против залпов ' + volley);
});

test('чародейка, контроль магии: три самонаводящиеся сферы в разных врагов, каждая сильнее; один враг — все в него', () => {
  const battle = makeBattle(), t = sorc(battle, 10, 4, ['enchantress', 'arcaneControl']);
  const mobs = [12, 13, 14].map((d) => walker(battle, d, 1e9));
  still(...mobs);
  ok(battle._fire(t));
  runFor(battle, SPELL.enchantress.wind + 0.02);
  const shots = battle.events.filter((e) => e.kind === 'shot' && e.tower === t);
  eq(shots.length, 3, 'три сферы');
  eq(new Set(shots.map((e) => e.mob)).size, 3, 'в разных врагов');
  eq(shots.filter((e) => e.bend).length, 2, 'боковые летят дугой');
  runFor(battle, 1);
  for (const mob of mobs) near(hit(mob), t.damage * ARCANE.control.mul);
  const lone = makeBattle(), u = sorc(lone, 10, 4, ['enchantress', 'arcaneControl']), mob = walker(lone, 13, 1e9);
  still(mob);
  ok(lone._fire(u));
  runFor(lone, SPELL.enchantress.wind + 1);
  near(hit(mob), u.damage * ARCANE.control.mul * 3, 'все три — в одного');
});

test('чародейка, мастер стихий: случайная стихия, метка для реакции; стихию, к которой у цели иммунитет, не берёт', () => {
  const seen = new Set();
  for (let seed = 1; seed <= 30; seed++) {
    const battle = makeBattle({ random: seeded(seed) }), t = sorc(battle, 10, 4, ['enchantress', 'elements']);
    const mob = walker(battle, 13, 1e9);
    mob.element = 'fire';
    still(mob);
    ok(battle._fire(t));
    runFor(battle, SPELL.enchantress.wind + 1);
    const shot = battle.events.find((e) => e.kind === 'shot' && e.tower === t);
    seen.add(shot.element);
    ok(ARCANE.elements.includes(shot.element) && shot.element !== 'fire', 'seed ' + seed + ': ' + shot.element);
    ok(hit(mob) > 0, 'ранит');
    if (['poison', 'earth', 'lightning'].includes(shot.element)) ok(mob.marks && mob.marks.has(shot.element), 'метка');
    if (shot.element === 'lightning') ok(mob.holdUntil > battle.time - 1, 'молния оглушает');
  }
  eq(seen.size, 4, 'остальные стихии все выпадают: ' + Array.from(seen));
});

test('чародейка, магический дождь: раз в 8 секунд шесть шаров с неба; с мастером стихий — весь дождь одной стихии', () => {
  const battle = makeBattle(), t = sorc(battle, 10, 4, ['enchantress', 'arcaneRain']);
  const crowd = Array.from({ length: 9 }, (_, i) => walker(battle, 10 + i * 0.75, 1e9));
  still(...crowd);
  runFor(battle, 0.1 + ARCANE.rain.count * ARCANE.rain.gap + ARCANE.rain.fall + 0.1);
  const drops = battle.events.filter((e) => e.kind === 'shot' && e.tower === t && e.sy !== undefined);
  eq(drops.length, ARCANE.rain.count, 'шесть шаров');
  ok(drops.every((e) => e.sy < e.y), 'падают сверху');
  ok(crowd.some((mob) => hit(mob) > t.damage * 1.5), 'ранят');
  ok(Math.abs(t.nextRain - ARCANE.rain.every) < 0.2, 'следующий — через 8 секунд');
  const kinds = new Set();
  for (let seed = 1; seed <= 25; seed++) {
    const other = makeBattle({ random: seeded(seed) }), u = sorc(other, 10, 4, ['enchantress', 'arcaneRain', 'elements']);
    walker(other, 13, 1e9).speed = 0;
    runFor(other, 2);
    const fall = other.events.filter((e) => e.tower === u && (e.kind === 'shot' && e.sy !== undefined
      || e.kind === 'thunderbolt'));
    const elements = new Set(fall.map((e) => e.element || 'lightning'));
    eq(elements.size, 1, 'одна стихия на дождь');
    kinds.add(Array.from(elements)[0]);
    if (elements.has('earth')) eq(fall.length, 1, 'земля — один метеорит');
  }
  eq(kinds.size, ARCANE.elements.length, 'выпадают все стихии');
});

test('чародейка, концентрированный луч: босс в радиусе — непрерывный луч только в него, остальное не делает', () => {
  const battle = makeBattle(), t = sorc(battle, 10, 4, ['enchantress', 'focusBeam', 'arcaneRain']);
  const boss = put(battle, special(battle, 'boss', 'butcher', 1e9), 13), small = walker(battle, 11, 1e9);
  still(boss, small);
  boss.power = null;
  battle.step(TICK);
  ok(t.beam && t.beam.mob === boss, 'луч в босса');
  no(battle._fire(t), 'обычной атаки нет');
  runFor(battle, 2);
  const rate = t.damage / battle._intervalOf(t, battle.time) * ARCANE.beam.mul
    + t.damage * ARCANE.rain.count / ARCANE.rain.every * ARCANE.beam.mul;
  ok(Math.abs(hit(boss) / battle.time / rate - 1) < 0.15, 'урон ×1,6: ' + hit(boss) / battle.time + ' вместо ' + rate);
  eq(hit(small), 0, 'других не трогает');
  no(battle.events.some((e) => e.kind === 'shot' && e.tower === t), 'и дождя нет');
  boss.dead = true;
  battle.step(TICK);
  eq(t.beam, null, 'босса нет — луча нет');
});

test('волшебница, ускоренные курсы: всем игрокам на 20% больше опыта, у двух — как ауры', () => {
  const battle = makeBattle(), ally = battle.place(player(), 'sniper', 2, 2), before = ally.player.xp;
  sorc(battle, 10, 4, ['courses']);
  battle.reward(ally, 100);
  near(ally.player.xp - before, 100 * (1 + SPELL.courses));
  sorc(battle, 12, 4, ['courses']);
  const mid = ally.player.xp;
  battle.reward(ally, 100);
  near(ally.player.xp - mid, 100 * (1 + SPELL.courses * 1.5), 'вторая — вполовину');
});

test('волшебница, катализатор: урон союзников от стихий на 15% выше, обычный — как был', () => {
  const battle = makeBattle(), ally = battle.place(player(), 'pyro', 2, 2), shooter = battle.place(player(), 'sniper', 3, 2);
  const mob = walker(battle, 6, 1e9);
  still(mob);
  const dealt = (t, element) => {
    const before = mob.hp;
    battle._hurt(mob, 100, t, element);
    return before - mob.hp;
  };
  battle.step(TICK);
  const fire = dealt(ally, 'fire'), plain = dealt(shooter, null);
  sorc(battle, 10, 4, ['catalyst']);
  battle.step(TICK);
  near(dealt(ally, 'fire') / fire, 1 + SPELL.catalyst);
  near(dealt(shooter, null) / plain, 1, 'без стихии — без прибавки');
});

test('волшебница, разрушение иммунитета: в 3 клетках от неё у врагов нет иммунитета к стихиям', () => {
  const battle = makeBattle(), pyro = battle.place(player(), 'pyro', 2, 2);
  const close = walker(battle, 10, 1e9), far = walker(battle, 18, 1e9);
  close.element = far.element = 'fire';
  still(close, far);
  sorc(battle, 10, 4, ['unbind']);
  battle.step(TICK);
  battle._hurt(close, 100, pyro, 'fire');
  battle._hurt(far, 100, pyro, 'fire');
  ok(hit(close) > 0, 'рядом — горит');
  eq(hit(far), 0, 'далеко — иммунитет');
});

test('волшебница, чародейский круг: она и соседи бьют на 0,5 клетки дальше, от двух — на клетку; ангел — нет', () => {
  const battle = makeBattle(), ally = battle.place(player(), 'sniper', 11, 3), far = battle.place(player(), 'sniper', 15, 3);
  const angel = priest(battle, 9, 3, ['angel']), base = ally.range, wide = far.range, edge = angel.range;
  const mage = sorc(battle, 10, 3, ['circle']), own = mage.ownRange;
  battle.step(TICK);
  near(ally.range - base, SPELL.circle, 'сосед');
  near(mage.range - own, SPELL.circle, 'сама');
  near(far.range, wide, 'дальний — как был');
  near(angel.range, edge, 'ангел — как был');
  sorc(battle, 12, 2, ['circle']);
  battle.step(TICK);
  near(ally.range - base, SPELL.circle * 2, 'от двух волшебниц');
});

function storm(battle, x, y, runes) {
  const t = battle.place(player(), 'thunder', x, y);
  battle.setMods(t, { runes });
  t.critChance = 0;
  t.cooldown = 1e9;
  return t;
}

test('маг молнии: шар молнии летит и бьёт по прилёту, без оглушения; стихию молнии кладёт только с реакциями', () => {
  const battle = makeBattle(), t = storm(battle, 10, 4, []), mob = walker(battle, 13, 1e9);
  still(mob);
  ok(battle._fire(t));
  eq(hit(mob), 0, 'шар ещё летит');
  runFor(battle, 1);
  near(hit(mob), t.damage);
  ok(mob.holdUntil <= battle.time, 'не оглушает');
  no(mob.marks && mob.marks.has('lightning'), 'без «Реакций молнии» стихии нет');
  const marked = storm(battle, 10, 6, ['stormReact']);
  ok(battle._fire(marked));
  runFor(battle, 1);
  ok(mob.marks && mob.marks.has('lightning'), 'с «Реакциями молнии» — есть');
});

test('громовержец: молния из посоха сразу бьёт ближайшего врага', () => {
  const battle = makeBattle(), t = storm(battle, 10, 4, ['caller']);
  const close = walker(battle, 11, 1e9), lead = walker(battle, 13.5, 1e9);
  still(close, lead);
  ok(battle._fire(t));
  near(hit(close), t.damage, 'ближайший — сразу');
  eq(hit(lead), 0, 'первый к сердцу, но дальше — нет');
  ok(battle.events.some((e) => e.kind === 'chain' && e.mob === close));
});

test('райдзю: замах лапой — когти молнии ранят врагов на 2 клетки перед ним, позади — нет', () => {
  const battle = makeBattle(), t = storm(battle, 10, 4, ['raiju']);
  ok(t.range >= STORM.raiju.reach && t.range < STORM.raiju.reach + 1, 'радиус 2 клетки');
  const lead = walker(battle, 11.6, 1e9), beside = walker(battle, 10.6, 1e9), behind = walker(battle, 8.6, 1e9);
  still(lead, beside, behind);
  ok(battle._fire(t));
  near(hit(lead), t.damage, 'цель');
  near(hit(beside), t.damage, 'рядом с ней — тоже');
  eq(hit(behind), 0, 'позади — нет');
  ok(battle.events.some((e) => e.kind === 'claw' && e.tower === t && e.arc === STORM.raiju.arc));
});

test('Тор: молот летит дугой в цель и назад, ранит цель и всех на пути; пока не вернулся — второй не бросает', () => {
  const battle = makeBattle(), t = storm(battle, 10, 4, ['thor']), s = STORM.thor;
  ok(t.range >= s.reach && t.range < s.reach + 1, 'на 4 клетки');
  const target = walker(battle, 13.5, 1e9);
  still(target);
  ok(battle._fire(t));
  no(battle._fire(t), 'молот в полёте');
  const out = hammerAt(t, target.x, target.y, 0.5, false), back = hammerAt(t, target.x, target.y, 0.5, true);
  ok(Math.hypot(out.x - back.x, out.y - back.y) > 0.5, 'туда и обратно — разными дугами');
  runFor(battle, s.out + s.back + 0.05);
  near(hit(target), t.damage, 'цель ранена один раз за бросок');
  ok(battle._fire(t), 'вернулся — снова бросает');
  const path = makeBattle(), u = storm(path, 10, 4, ['thor']), aim = walker(path, 14, 1e9);
  still(aim);
  const mid = hammerAt(u, aim.x, aim.y, 0.5, false), side = walker(path, 3, 1e9);
  still(side);
  side.d = 99;
  Object.assign(side, { x: mid.x, y: mid.y });
  path._locate = () => {};
  ok(path._fire(u));
  runFor(path, s.out + 0.05);
  ok(hit(side) > 0, 'кого задел по пути — тоже ранен');
});

test('громоотвод: стоит до конца игры; удар молнии — волна на 3 клетки, связь со всеми громоотводами и их волны', () => {
  const battle = makeBattle(), a = storm(battle, 4, 4, ['rod']), b = storm(battle, 16, 4, ['rod']), s = STORM.rod;
  battle.step(TICK);
  eq(battle.rods.length, 2, 'по громоотводу у каждого');
  const nearA = walker(battle, 4, 1e9), nearB = walker(battle, 16, 1e9), between = walker(battle, 10, 1e9);
  const far = walker(battle, 10, 1e9);
  still(nearA, nearB, between, far);
  battle.step(TICK);
  far.y += 3;
  between.y = a.cy;
  battle._locate = () => {};
  let fired = false;
  battle.random = () => {
    if (fired) return 0.99;
    fired = true;
    return s.chance / 2;
  };
  battle.rodAt = 0;
  battle.step(TICK);
  ok(battle.events.some((e) => e.kind === 'skybolt'), 'молния ударила');
  eq(battle.events.filter((e) => e.kind === 'surge').length, 2, 'волна и у второго громоотвода');
  near(hit(nearA), a.damage * s.wave);
  near(hit(nearB), b.damage * s.wave);
  battle.step(TICK);
  near(hit(between), a.damage * s.link, 'под связью — тоже');
  eq(hit(far), 0, 'в стороне — нет');
  runFor(battle, s.time + 0.1);
  eq(battle.links.length, 0, 'связь держится секунду');
  battle.leave(a);
  eq(battle.rods.length, 2, 'спящий оставляет громоотвод');
});

test('маг молнии, раж битвы: добил врага — 3 секунды бьёт вдвое быстрее', () => {
  const battle = makeBattle(), t = storm(battle, 10, 4, ['caller', 'frenzy']), base = battle._intervalOf(t, 0);
  const weak = walker(battle, 11, 1);
  still(weak);
  ok(battle._fire(t));
  ok(weak.dead, 'добил');
  near(battle._intervalOf(t, battle.time), base / STORM.frenzy.haste, 'вдвое быстрее');
  near(battle._intervalOf(t, battle.time + STORM.frenzy.time + 0.1), base, 'потом — как было');
  const other = storm(battle, 12, 2, ['caller']), prey = walker(battle, 12, 1);
  still(prey);
  ok(battle._fire(other));
  ok(!(other.frenzyUntil > battle.time), 'без навыка — нет');
});

test('маг молнии, разрядка: реакция с молнией — молния с неба по врагу и громоотводы рядом срабатывают', () => {
  const battle = makeBattle(), t = storm(battle, 10, 4, ['stormReact', 'spark', 'rod']), far = storm(battle, 2, 2, ['rod']);
  const pyro = battle.place(player(), 'pyro', 8, 4, { runes: ['fireReact'] });
  battle.step(TICK);
  const mob = walker(battle, 10, 1e9);
  still(mob);
  battle._mark(mob, 'lightning', t);
  battle._mark(mob, 'fire', pyro);
  const before = mob.hp;
  battle.pulseAt = 0;
  battle.step(TICK);
  ok(battle.events.some((e) => e.kind === 'skybolt' && e.mob === mob), 'молния с неба по врагу');
  ok(before - mob.hp >= t.damage * STORM.spark.mul, 'урон');
  ok(battle.events.some((e) => e.kind === 'links'), 'громоотвод рядом сработал и связал сеть');
  eq(battle.events.filter((e) => e.kind === 'surge').length, 2, 'волна у обоих громоотводов');
});

test('маг молнии, разрядка: только своя молния — реакция с молнией другого мага её не вызывает', () => {
  const battle = makeBattle(), t = storm(battle, 10, 4, ['stormReact', 'spark']), other = storm(battle, 12, 4, ['stormReact']);
  const pyro = battle.place(player(), 'pyro', 8, 4, { runes: ['fireReact'] });
  battle.step(TICK);
  const mob = walker(battle, 10, 1e9);
  still(mob);
  battle._mark(mob, 'lightning', t);
  battle.step(TICK);
  battle._mark(mob, 'lightning', other);
  battle._mark(mob, 'fire', pyro);
  battle.events.length = 0;
  battle.pulseAt = 0;
  battle.step(TICK);
  ok(battle.events.some((e) => e.kind === 'react'), 'реакция была');
  no(battle.events.some((e) => e.kind === 'skybolt' && e.tower === t), 'молнию в реакцию дал другой маг — разрядки нет');
});

test('громоотвод: у одного мага до двух — второй в соседней клетке; громоотводы разных магов работают вместе', () => {
  const battle = makeBattle(), a = storm(battle, 4, 3, ['rod', 'rod']), b = storm(battle, 16, 3, ['rod']);
  battle.step(TICK);
  const own = battle.rods.filter((rod) => rod.tower === a);
  eq(own.length, 2, 'два у одного');
  ok(own[0].x !== own[1].x || own[0].y !== own[1].y, 'в разных клетках');
  ok(own.every((rod) => Math.max(Math.abs(rod.x - a.x), Math.abs(rod.y - a.y)) <= 1), 'рядом с магом');
  ok(own.every((rod) => !battle.road.some(([x, y]) => x === rod.x && y === rod.y)), 'не на дороге');
  let fired = false;
  battle.random = () => {
    if (fired) return 0.99;
    fired = true;
    return STORM.rod.chance / 2;
  };
  battle.rodAt = 0;
  battle.step(TICK);
  eq(battle.events.filter((e) => e.kind === 'surge').length, 3, 'волны у всех трёх');
  const links = battle.events.find((e) => e.kind === 'links');
  eq(links.pairs.length, 3, 'связаны все: и свои, и чужой');
});

test('цепная молния: 2 прыжка к ближайшему в 2 клетках наверняка, дальше по 50%, назад не идёт', () => {
  const line = (luck) => {
    const battle = makeBattle(), t = storm(battle, 10, 4, ['caller', 'chain']);
    const mobs = [11, 12.5, 14, 15.5, 17, 19.4].map((d) => walker(battle, d, 1e9));
    still(...mobs);
    battle.random = () => luck;
    ok(battle._fire(t));
    runFor(battle, 1);
    return mobs.map((mob) => hit(mob) / t.damage);
  };
  eq(line(0.99).map(Math.round), [1, 1, 1, 0, 0, 0], 'не повезло — только два прыжка');
  eq(line(0).map(Math.round), [1, 1, 1, 1, 1, 0], 'везёт — дальше, пока есть кто в 2 клетках, каждого по разу');
});

test('ветвящаяся молния: с шансом 50% разряд вполсилы в другого врага на 3 клетки или в громоотвод', () => {
  const battle = makeBattle(), t = storm(battle, 10, 4, ['caller', 'fork']);
  const target = walker(battle, 10, 1e9), other = walker(battle, 12.5, 1e9), far = walker(battle, 17, 1e9);
  still(target, other, far);
  battle.random = () => 0;
  ok(battle._fire(t));
  near(hit(target), t.damage, 'основная цель — один раз');
  near(hit(other), t.damage * STORM.fork.mul);
  eq(hit(far), 0);
  const unlucky = makeBattle(), u = storm(unlucky, 10, 4, ['caller', 'fork']), a = walker(unlucky, 10, 1e9);
  const b = walker(unlucky, 12, 1e9);
  still(a, b);
  unlucky.random = () => 0.99;
  ok(unlucky._fire(u));
  eq(hit(b), 0, 'не повезло — разряда нет');
  const rodded = makeBattle(), r = storm(rodded, 10, 4, ['caller', 'fork', 'rod']);
  rodded.step(TICK);
  eq(rodded.rods.length, 1);
  rodded.rodAt = 1e9;
  const lone = walker(rodded, 10, 1e9);
  still(lone);
  rodded.random = () => 0;
  const surges = firedBy(rodded, 'surge');
  ok(rodded._fire(r));
  eq(surges().length, 1, 'никого рядом — разряд ушёл в громоотвод, и тот сработал');
});

test('шаровая молния: раз в 6 с медленный шар к самому дальнему, до края радиуса; урон при касании и разряды', () => {
  const battle = makeBattle(), t = storm(battle, 10, 4, ['caller', 'globe']), s = STORM.globe;
  const close = walker(battle, 10, 1e9), far = walker(battle, 13, 1e9);
  still(close, far);
  const jolts = firedBy(battle, 'jolt');
  battle.step(TICK);
  eq(battle.globes.length, 1, 'шар пущен');
  const g = battle.globes[0];
  ok(Math.abs(Math.atan2(g.dy, g.dx) - Math.atan2(far.y - t.cy, far.x - t.cx)) < 1e-9, 'к самому дальнему');
  runFor(battle, t.range / s.speed + 0.05);
  eq(battle.globes.length, 0, 'долетел до края радиуса и растаял');
  ok(hit(far) >= t.damage * s.mul - 1e-6, 'коснулся — сильно ранил');
  ok(jolts().length > 0, 'по пути бил разрядами');
  runFor(battle, s.every - t.range / s.speed - 0.55);
  eq(battle.globes.length, 0, 'раньше 6 секунд второго нет');
  runFor(battle, 0.6);
  eq(battle.globes.length, 1);
});

test('шаровая молния: каждый тик три разряда в разных врагов рядом, а если врагов меньше — кому-то дважды', () => {
  const battle = makeBattle(), t = storm(battle, 10, 4, ['caller', 'globe']), s = STORM.globe;
  const mobs = [10, 10.4, 10.8, 11.2].map((d) => walker(battle, d, 1e9));
  still(...mobs);
  battle._locate = () => {};
  battle.globes.push({ tower: t, sx: 10.9, sy: 5.5, x: 10.9, y: 5.5, dx: 0, dy: 0, born: battle.time, life: 10,
    zapAt: battle.time, hit: new Set(mobs) });
  const jolts = firedBy(battle, 'jolt');
  battle.step(TICK);
  eq(jolts().length, s.bolts);
  eq(new Set(jolts().map((e) => e.mob)).size, s.bolts, 'в разных');
  const lone = makeBattle(), u = storm(lone, 10, 4, ['caller', 'globe']), one = walker(lone, 10, 1e9);
  still(one);
  lone.globes.push({ tower: u, sx: one.x, sy: one.y, x: one.x, y: one.y, dx: 0, dy: 0, born: lone.time, life: 10,
    zapAt: lone.time, hit: new Set([one]) });
  lone.step(TICK);
  near(hit(one), u.damage * s.zap * s.bolts, 'один враг — все три в него');
});

test('гроза: раз в 8 с молния в случайного врага на карте — урон на 2 клетки и оглушение на 3 с, кроме боссов', () => {
  const battle = makeBattle(), t = storm(battle, 10, 4, ['caller', 'tempest']), s = STORM.tempest;
  const target = walker(battle, 2, 1e9), side = walker(battle, 3, 1e9), boss = walker(battle, 1, 1e9);
  const far = walker(battle, 8, 1e9);
  boss.info = Object.assign({}, boss.info, { boss: true });
  still(target, side, boss, far);
  battle.random = () => 0;
  battle.rodAt = 1e9;
  battle.step(TICK);
  ok(battle.events.some((e) => e.kind === 'skybolt' && e.mob === target), 'молния с неба — хоть и далеко от мага');
  near(hit(target), t.damage * s.mul);
  near(hit(side), t.damage * s.mul);
  near(hit(boss), t.damage * s.mul);
  eq(hit(far), 0);
  ok(target.holdUntil >= battle.time + s.stun - 0.1 && side.holdUntil >= battle.time + s.stun - 0.1, 'оглушены на 3 с');
  ok(boss.holdUntil <= battle.time, 'босс — нет');
  runFor(battle, s.every - 0.5);
  near(hit(target), t.damage * s.mul, 'до 8 секунд второй нет');
});

test('райдзю: радиус атаки не растёт ни от чего', () => {
  const battle = makeBattle(), t = battle.place(player(), 'thunder', 10, 4);
  battle.setMods(t, { runes: ['raiju'], range: 3 });
  t.boost.range = 1;
  battle.step(TICK);
  ok(Math.abs(t.range - STORM.raiju.reach) < 1e-9, 'по-прежнему 2 клетки: ' + t.range);
});

test('молниеносный рывок: 2 с без атаки — рывком к клетке у самого первого врага, ранит всех на пути', () => {
  const battle = makeBattle(), t = storm(battle, 10, 1, ['raiju', 'dash']), s = WOLF.dash;
  t.cooldown = 0;
  const lead = walker(battle, 3, 1e9), back = walker(battle, 1, 1e9), path = walker(battle, 0, 1e9);
  still(lead, back, path);
  battle._locate = () => {};
  battle.step(TICK);
  const from = { x: t.cx, y: t.cy };
  runFor(battle, s.idle - 0.2);
  eq([t.cx, t.cy], [from.x, from.y], 'раньше 2 секунд стоит');
  Object.assign(path, { x: 7.2, y: 2.9 });
  for (let i = 0; i < 60 && !t.pull; i++) battle.step(TICK);
  ok(Math.abs(t.cx - lead.x) <= 1.5 && Math.abs(t.cy - lead.y) <= 1.5, 'встал рядом с первым врагом');
  ok(t.pull && t.pull.dash, 'рывок');
  ok(battle.events.some((e) => e.kind === 'dash' && e.tower === t));
  eq(hit(path), 0, 'шар ещё не долетел');
  runFor(battle, t.pull.end - battle.time + 0.05);
  near(hit(path), t.damage * s.mul, 'шар задел по пути — ранен один раз');
});

test('волчий вой: не атакует 3 с — воет; потом +20% себе на столько же, остальным +10% вдвое меньше', () => {
  const battle = makeBattle(), t = storm(battle, 10, 1, ['raiju', 'howl']), s = WOLF.howl;
  const ally = storm(battle, 2, 1, []);
  const mob = walker(battle, 18, 1e9);
  still(mob);
  battle._locate = () => {};
  battle.step(TICK);
  runFor(battle, s.idle + 0.1);
  ok(t.howlAt !== null && t.howlAt !== undefined, 'воет');
  ok(battle.events.some((e) => e.kind === 'howl' && e.tower === t));
  runFor(battle, 1.9);
  const long = battle.time - t.howlAt;
  Object.assign(mob, { x: 10.5, y: 2.5 });
  battle.step(TICK);
  ok(t.howlAt === null, 'враг рядом — замолчал');
  ok(Math.abs(t.howlUntil - battle.time - long) < 3 * TICK, 'себе — сколько выл');
  battle.step(TICK);
  near(t.boost.rate, s.self);
  near(t.boost.damage, s.self);
  near(ally.boost.rate, s.team);
  near(ally.boost.damage, s.team);
  runFor(battle, long * s.share + 0.1);
  near(ally.boost.rate, 0, 'остальным — вдвое меньше времени');
  near(t.boost.rate, s.self, 'себе ещё действует');
});

test('волчий вой: воет и в ожидании волны, а рывок к пришедшим врагам обрывает вой и даёт усиление', () => {
  const battle = makeBattle(), t = storm(battle, 10, 1, ['raiju', 'howl', 'dash']), s = WOLF.howl;
  battle.step(TICK);
  runFor(battle, s.idle + 0.1);
  ok(t.howlAt !== null && t.howlAt !== undefined, 'врагов нет — воет');
  runFor(battle, 1);
  const long = battle.time - t.howlAt, mob = walker(battle, 3, 1e9);
  still(mob);
  battle.step(TICK);
  ok(t.pull && t.pull.dash, 'враг пришёл — рывок');
  ok(t.howlAt === null, 'вой оборван');
  ok(Math.abs(t.howlUntil - battle.time - long) < 3 * TICK, 'усиление — сколько выл');
});

test('волчий вой: вой длится наугад 2–5 секунд, следующий — через 5–10 секунд после конца прошлого', () => {
  const battle = makeBattle(), t = storm(battle, 10, 1, ['raiju', 'howl']), s = WOLF.howl, cries = [];
  for (let i = 0; i < (s.idle + 120) / TICK; i++) {
    const before = battle.events.length;
    battle.step(TICK);
    for (const e of battle.events.slice(before)) if (e.kind === 'howl') cries.push({ at: battle.time, time: e.time });
  }
  ok(cries.every((e) => e.time >= s.time[0] && e.time <= s.time[1]), 'вой 2–5 с');
  ok(Math.max(...cries.map((e) => e.time)) - Math.min(...cries.map((e) => e.time)) > 1, 'вои разной длины');
  for (let i = 0; i < cries.length; i++) {
    const rest = i ? cries[i].at - cries[i - 1].at - cries[i - 1].time : 0;
    if (i) ok(rest > s.rest[0] - 2 * TICK && rest < s.rest[1] + 2 * TICK, 'пауза 5–10 с после конца прошлого: ' + rest);
  }
  const rests = cries.slice(1).map((e, i) => e.at - cries[i].at - cries[i].time);
  ok(Math.max(...rests) - Math.min(...rests) > 1, 'паузы разные');
});

test('ярость: повторные удары по той же цели ускоряют атаку на 3/2/1%, до +300%; смена цели сбрасывает', () => {
  const battle = makeBattle(), t = storm(battle, 10, 4, ['raiju', 'rage']);
  const a = walker(battle, 10, 1e9), b = walker(battle, 11.5, 1e9);
  still(a, b);
  for (let i = 0; i < 11; i++) ok(battle._fire(t));
  eq(t.rageHits, 10);
  near(battle._intervalOf(t, battle.time), t.interval / 1.3, 'десять повторных — +30%');
  t.rageHits = 25;
  near(battle._wolfRate(t), 1.55, '10×3% + 10×2% + 5×1%');
  t.rageHits = 1000;
  near(battle._wolfRate(t), 4, 'не больше +300%');
  t.rageOn.dead = true;
  ok(battle._fire(t));
  eq(t.rageHits, 0, 'новая цель — сначала');
});

test('вожак стаи: питомцы всех +30% к скорости, атаке и урону, не складывается; сам +1% за питомца', () => {
  const peck = (wolves) => {
    const battle = makeBattle(), druid = battle.place(player(), 'forester', 10, 4);
    battle.setMods(druid, { runes: ['druid'] });
    for (let i = 0; i < wolves; i++) storm(battle, 2 + i * 2, 1, ['raiju', 'pack']);
    const mob = walker(battle, 12, 1e9);
    still(mob);
    for (let i = 0; i < 600 && !battle.events.some((e) => e.kind === 'peck'); i++) battle.step(TICK);
    return { battle, mob, druid };
  };
  const plain = peck(0), led = peck(1), two = peck(2);
  near(hit(led.mob), hit(plain.mob) * (1 + WOLF.pack.boost), 'клюёт на 30% сильнее');
  near(hit(two.mob), hit(led.mob), 'два вожака — не сильнее');
  const wolf = led.battle.towers.find((t) => t.style === 'raiju'), pets = led.battle.drones.length;
  ok(pets > 0);
  near(led.battle._packOf(wolf), WOLF.pack.per * pets);
  near(led.battle._wolfRate(wolf), 1 + WOLF.pack.per * pets);
});

test('громоотвод срабатывает не чаще раза в секунду, от чего бы ни ударило', () => {
  const battle = makeBattle(), a = storm(battle, 4, 4, ['rod']), b = storm(battle, 16, 4, ['rod']);
  battle.step(TICK);
  battle.rodAt = 1e9;
  const [one, two] = battle.rods, surges = firedBy(battle, 'surge');
  battle._strikeRod(one, battle.time);
  eq(surges().length, 2, 'волна у обоих');
  battle._strikeRod(one, battle.time);
  battle._strikeRod(two, battle.time);
  eq(surges().length, 2, 'оба ещё не готовы');
  runFor(battle, STORM.rod.gap - 0.1);
  battle._strikeRod(two, battle.time);
  eq(surges().length, 2);
  runFor(battle, 0.2);
  battle._strikeRod(two, battle.time);
  eq(surges().length, 4, 'через секунду — снова');
});

test('Тор: молот бьёт наполовину обычным уроном, наполовину молнией', () => {
  const battle = makeBattle(), t = storm(battle, 10, 4, ['thor']), mob = walker(battle, 13, 1e9), dealt = [];
  still(mob);
  const hurt = battle._hurt.bind(battle);
  battle._hurt = (target, amount, by, element, ...rest) => {
    if (by === t && target === mob) dealt.push([amount, element === undefined ? by.element : element]);
    return hurt(target, amount, by, element, ...rest);
  };
  ok(battle._fire(t));
  runFor(battle, STORM.thor.out + 0.05);
  eq(dealt.map(([, element]) => element).sort(), [null, 'storm'].sort());
  dealt.forEach(([amount]) => near(amount, t.damage / 2));
});

test('два молота: второй летит из той же руки через половину перерыва, с полным уроном; оба в полёте — третьего нет', () => {
  const battle = makeBattle(), t = storm(battle, 10, 4, ['thor', 'twin']), mob = walker(battle, 13, 1e9);
  still(mob);
  const hammers = firedBy(battle, 'hammer'), half = battle._intervalOf(t, battle.time) / 2;
  ok(battle._fire(t));
  runFor(battle, half - 0.05);
  eq(hammers().length, 1, 'раньше половины перерыва — один');
  runFor(battle, 0.1);
  eq(hammers().length, 2, 'через половину — второй');
  no(battle._fire(t), 'оба в полёте');
  runFor(battle, STORM.thor.out + STORM.thor.back + 0.1);
  near(hit(mob), t.damage * 2, 'оба — полным уроном');
  ok(battle._fire(t), 'вернулись — снова');
});

test('громовой толчок: раз в 10 с молнии по дороге на 4 клетки в обе стороны — урон и оглушение всем', () => {
  const battle = makeBattle(), t = storm(battle, 10, 4, ['thor', 'quake']), s = STORM.quake;
  const near1 = walker(battle, 10, 1e9), left = walker(battle, 7, 1e9), right = walker(battle, 13.5, 1e9);
  const far = walker(battle, 16, 1e9), boss = walker(battle, 11, 1e9);
  boss.info = Object.assign({}, boss.info, { boss: true });
  still(near1, left, right, far, boss);
  battle._locate = () => {};
  const quakes = firedBy(battle, 'thunderquake');
  battle.step(TICK);
  eq(quakes().length, 1);
  runFor(battle, s.step * (s.cells + 1));
  for (const mob of [near1, left, right, boss]) {
    near(hit(mob), t.damage);
    ok(mob.holdUntil > battle.time, 'оглушён');
  }
  eq(hit(far), 0, 'дальше 4 клеток — нет');
  runFor(battle, s.every - 1);
  eq(quakes().length, 1, 'раньше 10 секунд второго нет');
  runFor(battle, 1);
  eq(quakes().length, 2);
});

test('ярость бога: каждый бросок за волну +1% урона, каждые 10% — +2% скорости; новая волна — сначала', () => {
  const battle = makeBattle(), t = storm(battle, 10, 4, ['thor', 'godRage']), mob = walker(battle, 13, 1e9);
  still(mob);
  const s = STORM.god, base = t.interval;
  for (let i = 0; i < 25; i++) {
    t.hammers = [];
    const before = hit(mob);
    ok(battle._fire(t));
    runFor(battle, STORM.thor.out + 0.05);
    near(hit(mob) - before, t.damage * (1 + s.damage * i), 'бросок ' + (i + 1));
  }
  eq(t.godThrows, 25);
  near(battle._intervalOf(t, battle.time), base / (1 + 2 * s.haste), '20% — две ступени по 2%');
  eq(godStage(t), 3);
  t.godThrows = 50;
  eq(godStage(t), 5, 'к 50 броскам — пятая стадия');
  battle.startWave(2);
  eq(t.godThrows, 0, 'новая волна');
  eq(godStage(t), 1);
});

test('сын бури: другие маги молнии дают Тору по +5% урона и скорости, а он каждому — +5% скорости', () => {
  const battle = makeBattle(), thor = storm(battle, 10, 4, ['thor', 'stormSon']), mage = storm(battle, 2, 1, ['caller']);
  const fire = battle.place(player(), 'pyro', 6, 1);
  battle.step(TICK);
  near(thor.boost.rate, STORM.son.haste);
  near(thor.boost.damage, STORM.son.damage);
  near(mage.boost.rate, STORM.son.haste);
  near(fire.boost.rate, 0, 'маг огня — нет');
});

test('отброс не загоняет мобов за портал: дальше выхода из тоннеля назад не уходят', () => {
  const tiles = new Array(SIZE * SIZE).fill(null);
  for (const [x, y] of STRAIGHT.slice(0, 3)) tiles[y * SIZE + x] = 'tunnel';
  const battle = new Battle({ path: STRAIGHT, tiles }, { random: seeded(3) }), t = battle.place(player(), 'frost', 10, 4);
  eq(battle.gates[0], 3.5, 'портал — у выхода из тоннеля');
  const mob = walker(battle, 6, 1e9);
  battle._push(mob, 10, t);
  eq(mob.d, 3.5, 'отброшен только до портала');
  const deep = walker(battle, 2, 1e9);
  battle._push(deep, 1, t);
  eq(deep.d, 2, 'кто ещё в тоннеле — назад не толкается');
  still(mob, deep);
  battle._vortex(t, 2.5, 5.5);
  runFor(battle, WATER.vortex.time + 0.1);
  eq([mob.d, deep.d], [3.5, 2], 'водоворот — тоже');
});

test('шаманка: удар в барабан — волна на 2 клетки вокруг ранит всех', () => {
  const battle = makeBattle(), t = sorc(battle, 10, 4, ['shamaness']);
  ok(t.range >= 2 && t.range < 3);
  const a = walker(battle, 10, 1e9), b = walker(battle, 12, 1e9), far = walker(battle, 15, 1e9);
  still(a, b, far);
  ok(battle._fire(t));
  near(hit(a), t.damage);
  near(hit(b), t.damage);
  eq(hit(far), 0);
  ok(battle.events.some((e) => e.kind === 'drum'));
});

test('менестрель, песнь сирен: 3 секунды все враги, кроме боссов, идут назад; пока играет — не атакует', () => {
  const battle = makeBattle(), t = sorc(battle, 2, 2, ['minstrel', 'siren']);
  const mob = walker(battle, 10, 1e9), boss = put(battle, special(battle, 'boss', BOSSES[0].id, 1e12), 10);
  const from = mob.d, bossFrom = boss.d;
  battle.step(TICK);
  ok(battle.events.some((e) => e.kind === 'song' && e.song === 'siren'));
  no(battle._fire(t, battle.time), 'играет — не бьёт');
  runFor(battle, 1);
  ok(mob.d < from, 'идёт назад');
  ok(boss.d > bossFrom, 'босс идёт вперёд');
  runFor(battle, SONG.time);
  const back = mob.d;
  runFor(battle, 1);
  ok(mob.d > back, 'песня кончилась — снова вперёд');
});

test('менестрель, песнь сирен: только что вышедшие не уходят назад в пещеру и за карту', () => {
  const battle = makeBattle();
  sorc(battle, 2, 2, ['minstrel', 'siren']);
  const fresh = walker(battle, 1.2, 1e9);
  runFor(battle, SONG.time);
  ok(fresh.x >= 0 && !battle.covered(fresh.x, fresh.y), 'на поле: ' + fresh.x.toFixed(2));
});

test('менестрель, похоронный марш: 3 секунды все враги на карте теряют здоровье', () => {
  const battle = makeBattle(), t = sorc(battle, 2, 2, ['minstrel', 'dirge']);
  const near1 = walker(battle, 3, 1e9), far = walker(battle, 18, 1e9);
  still(near1, far);
  runFor(battle, SONG.time + 0.2);
  ok(hit(far) > 0 && hit(near1) > 0, 'по всей карте');
  near(hit(far), t.damage * SONG.dirge * Math.round(SONG.time / PULSE + 0.4), 'дважды в секунду');
});

test('менестрель, вдохновение и ультразвук: мощь соседу, сопротивление врагов ниже', () => {
  const battle = makeBattle(), t = sorc(battle, 5, 4, ['minstrel', 'anthem', 'ultrasound']);
  const weak = battle.place(player(), 'mechanic', 6, 4), strong = battle.place(level(50), 'forester', 4, 3, { power: 200 });
  const bard = sorc(battle, 6, 3, ['minstrel']);
  battle.step(TICK);
  ok(t.muse === strong, 'выбран самый сильный сосед');
  near(strong.boost.might, SONG.anthem * t.might / strong.might);
  eq(weak.boost.might, 0);
  ok(bard.boost.might === 0, 'другого менестреля не выбирает');
  const mob = walker(battle, 8, 1e9);
  mob.resist = 0.5;
  near(battle._resistOf(mob), 0.5 - SONG.ultrasound);
  mob.resist = 0.1;
  eq(battle._resistOf(mob), 0, 'не ниже нуля');
});

test('шаманка, знамёна: на ближайшую клетку дороги, следующие — на другие ближайшие, до трёх; замедление, очищение и сила', () => {
  const battle = makeBattle(), t = sorc(battle, 10, 4, ['shamaness', 'totemSlow']);
  eq(battle.banners.length, 1);
  eq([battle.banners[0].x, battle.banners[0].y], [10, 5], 'на ближайшей клетке дороги');
  battle.setMods(t, { runes: ['shamaness', 'totemSlow', 'totemSlow', 'totemSlow', 'totemPurge', 'totemPower'] });
  eq(battle.banners.length, 5);
  eq(new Set(battle.banners.map((b) => b.x + ':' + b.y)).size, 5, 'в одной клетке — одно знамя');
  ok(battle.banners.every((b) => battle.road.some(([x, y]) => x === b.x && y === b.y)), 'все на дороге');
  eq(battle.banners.map((b) => b.x).sort((a, b) => a - b), [8, 9, 10, 11, 12], 'на ближайших');
  const mob = walker(battle, 11, 1e9);
  still(mob);
  const slows = battle.banners.filter((b) => b.kind === 'slow' && Math.hypot(mob.x - b.cx, mob.y - b.cy) <= SPELL.totem.radius);
  near(battle._totems(mob, 'slow'), [0.1, 0.05, 0.025].slice(0, slows.length).reduce((a, b) => a + b, 0), 'складываются, как ауры');
  battle.step(TICK);
  ok(mob.muteUntil > battle.time, 'способности врагов в ауре очищения отключены');
  const ally = battle.place(player(), 'forester', 11, 3);
  battle.step(TICK);
  near(ally.boost.damage, SPELL.totem.power, 'знамя силы');
});

test('шаманка, резонанс: сильнее, бьёт на 5 клеток, вместе с ударом одной волной идёт и от знамён по цепочке', () => {
  const battle = makeBattle(), other = sorc(battle, 14, 2, ['shamaness', 'totemPower']);
  other.busy = 1e9;
  const plain = sorc(battle, 2, 2, ['shamaness']), t = sorc(battle, 10, 2, ['shamaness', 'resonance']);
  ok(t.range >= SPELL.resonance.reach, 'на 5 клеток');
  near(t.damage, plain.damage * SPELL.resonance.mul);
  const close = walker(battle, 12, 1e9), far = walker(battle, 19, 1e9);
  still(close, far);
  ok(Math.hypot(far.x - t.cx, far.y - t.cy) > t.range, 'дальний вне её волны');
  ok(battle._fire(t));
  const drum = battle.events.find((e) => e.kind === 'drum' && e.tower === t);
  ok(drum.centers.length >= 2, 'одна общая волна: от неё и от знамени');
  near(hit(far), t.damage, 'сразу, вместе с ударом, волна от чужого знамени достала дальнего');
  near(hit(close), t.damage, 'кого задело дважды — ранен один раз');
});

test('жрец-инквизитор: светлый шар летит и бьёт по прилёту', () => {
  const battle = makeBattle(), t = priest(battle, 10, 4, ['inquisitor']);
  const mob = walker(battle, 14, 1e9);
  still(mob);
  ok(t.range >= 4, 'бросает дальше частиц');
  ok(battle._fire(t));
  eq(hit(mob), 0, 'шар ещё летит');
  runFor(battle, HOLY.inquisitor.flight + 0.05);
  ok(hit(mob) >= t.damage - 1e-6, 'попал');
  ok(battle.events.some((e) => e.kind === 'shot' && e.tower === t && e.time === HOLY.inquisitor.flight), 'шар');
});

test('лесник, ядовитая реакция: метит ядом только ядовитые атаки — шары ведьмы', () => {
  const battle = makeBattle(), witch = forester(battle, 10, 4, ['witch', 'poisonReact']);
  const bow = forester(battle, 10, 2, ['poisonReact']);
  const mob = walker(battle, 11, 1e9);
  still(mob);
  battle._hurt(mob, 1, bow);
  no(mob.marks && mob.marks.has('poison'), 'удар лука — не яд');
  ok(battle._fire(witch));
  runFor(battle, WOOD.witch.flight + 0.05);
  ok(mob.marks && mob.marks.has('poison'), 'метка яда для реакций');
});

test('лесник, зов природы: копии питомцев других лесников — с их силой; ушёл хозяин — пропала копия', () => {
  const battle = makeBattle(), druid = forester(battle, 1, 4, ['druid']), caller = forester(battle, 3, 4, ['call']);
  druid.damage = 50;
  const mob = walker(battle, 17, 1e9);
  still(mob);
  battle.step(TICK);
  const copy = battle.drones.find((drone) => drone.tower === caller);
  ok(copy && copy.kind === 'bird' && copy.source === druid, 'копия птицы друида');
  eq(battle.drones.filter((drone) => drone.tower === druid).length, 1, 'у друида своя птица осталась');
  runFor(battle, 6);
  ok(caller.run.damage > 0, 'копия клюёт — урон засчитан ему');
  const pecks = battle.events.filter((e) => e.kind === 'peck' && e.tower === caller).length;
  ok(pecks > 0);
  near(caller.run.damage / pecks, druid.damage * WOOD.bird.mul, 'с силой друида');
  battle.remove(druid);
  battle.step(TICK);
  no(battle.drones.some((drone) => drone.tower === caller), 'друида нет — и копии нет');
});

test('лесник, зоркий глаз: перед волной метит самого живучего, удары по нему — критические, у двух лесников — двоих', () => {
  const battle = makeBattle(), one = forester(battle, 10, 4, ['eye']), two = forester(battle, 12, 4, ['eye']);
  battle.startWave(20, 3);
  const order = battle.spawns.slice().sort((a, b) => b.hp - a.hp);
  ok(order[0].eyed === one && order[1].eyed === two, 'по живучести, по одному на лесника');
  eq(battle.spawns.filter((spawn) => spawn.eyed).length, 2);
  const mob = battle._spawn(order[0], 5);
  ok(mob.eyed === one, 'выходит уже с прицелом');
  const gun = mechanic(battle, 6, 4, []);
  still(mob);
  battle._fire(gun);
  near(hit(mob), gun.damage * gun.critMul, 'обычный выстрел — критический');
  const other = walker(battle, 5, 1e9);
  still(other);
  gun.aimMob = null;
  battle._hurt(other, 10, gun);
  near(hit(other), 10, 'по другим — как обычно');
});

test('лесник, природная ловкость: союзники в 2 клетках вокруг атакуют быстрее', () => {
  const battle = makeBattle(), grace = forester(battle, 10, 2, ['grace']);
  const ally = battle.place(player(), 'frost', 12, 2), corner = battle.place(player(), 'frost', 12, 4);
  const far = battle.place(player(), 'frost', 14, 2);
  battle.step(TICK);
  near(ally.boost.rate, WOOD.grace.haste);
  near(corner.boost.rate, 0, 'угол 2×2 — уже дальше двух клеток');
  ok(ally.boostBy.has(grace), 'помощь засчитана леснику');
  near(grace.boost.rate, WOOD.grace.haste, 'и сам тоже');
  eq(far.boost.rate, 0, 'дальний — без прибавки');
  forester(battle, 11, 1, ['grace']);
  forester(battle, 11, 3, ['grace']);
  battle.step(TICK);
  near(ally.boost.rate, WOOD.grace.haste * (1 + 1 / 2 + 1 / 4), 'ауры складываются: каждая следующая — вдвое слабее');
  near(corner.boost.rate, WOOD.grace.haste, 'до угла достаёт только ближний');
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

test('лесник-ведьма: ядовитые шары летят, как огненный шар, — урон ядом, без меток для реакций; нежить и неуязвимых к яду не трогает', () => {
  const battle = makeBattle(), t = forester(battle, 10, 4, ['witch']);
  eq(t.element, 'poison');
  const bone = walker(battle, 13, 1e9), mob = walker(battle, 11, 1e9);
  bone.undead = true;
  still(bone, mob);
  ok(battle._fire(t));
  eq(hit(mob), 0, 'шар ещё летит');
  runFor(battle, WOOD.witch.flight + 0.05);
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

const lookOf = (id) => Object.values(LOOKS).flat().find((look) => look.id === id);
const typeOf = (id) => Object.keys(LOOKS).find((type) => LOOKS[type].some((look) => look.id === id));
const creature = (battle, id, d = 5, hp = 1e6) => battle._spawn({ type: typeOf(id), look: lookOf(id), hp }, d);

test('инквизитор, изгнание: задетый светом не встаёт, не призывает и не делится', () => {
  const battle = makeBattle(), t = priest(battle, 2, 4, ['inquisitor', 'banish']), gun = battle.place(player(), 'mechanic', 2, 6);
  gun.busy = 1e9;
  t.busy = 1e9;
  const skeleton = creature(battle, 'skeleton', 6, 100), slime = creature(battle, 'slime3', 7, 100);
  battle._hurt(skeleton, 1, t);
  battle._hurt(slime, 1, t);
  battle._hurt(skeleton, 1e6, gun);
  battle._hurt(slime, 1e6, gun);
  runFor(battle, 2);
  eq(battle.mobs.filter((m) => m.look === 'skeleton' || m.look === 'slime2').length, 0, 'скелет не встал, слизень цел');
  const boss = special(battle, 'boss', 'archdemon', 1e9);
  battle._hurt(boss, 1, t);
  runFor(battle, 2.2);
  eq(battle.mobs.filter((m) => m.summoned).length, 0, 'бесят не призвал');
});

test('инквизитор, упокоение: нежить и демонов бьёт втрое сильнее', () => {
  const battle = makeBattle(), t = priest(battle, 2, 4, ['inquisitor', 'repose']);
  const zombie = creature(battle, 'zombie', 6, 1e6), imp = creature(battle, 'imp', 7, 1e6), rat = walker(battle, 8, 1e6);
  for (const mob of [zombie, imp, rat]) battle._hurt(mob, 10, t);
  near(hit(rat), 10);
  near(hit(zombie), 10 * HOLY.repose);
  near(hit(imp), 10 * HOLY.repose);
});

test('инквизитор, священный взрыв и цепной свет: волна на 2 клетки, шар дважды перескакивает', () => {
  const battle = makeBattle(), t = priest(battle, 10, 4, ['inquisitor', 'holyBurst', 'chainLight']);
  battle.random = () => 0;
  const first = walker(battle, 15, 1e9), a = walker(battle, 14, 1e9), b = walker(battle, 16, 1e9);
  const far = walker(battle, 20, 1e9);
  still(first, a, b, far);
  ok(battle._fire(t));
  runFor(battle, HOLY.inquisitor.flight * 3 + 0.1);
  for (const mob of [first, a, b]) ok(hit(mob) >= t.damage - 1e-6, 'каждого достал шар');
  eq(hit(far), 0, 'дальний не задет');
  eq(battle.events.filter((e) => e.kind === 'shot' && e.tower === t).length, 3, 'два прыжка');
  eq(battle.events.filter((e) => e.kind === 'holyRing' && e.tower === t).length, 3, 'каждый шар взрывается');
});

test('жрец, общие: благодать, божественная защита, благословение, просветление', () => {
  const battle = makeBattle(), ally = battle.place(player(), 'forester', 5, 4);
  const holy = priest(battle, 2, 6, ['inquisitor', 'sanctity', 'aegis', 'blessing', 'insight']);
  priest(battle, 6, 6, ['monk', 'mantraPower']);
  battle.step(TICK);
  no(battle._daze(ally, 2), 'союзника не оглушить');
  near(ally.boost.damage, HOLY.mantra.damage * (1 + HOLY.blessing), 'аура сильнее на 10%');
  near(ally.boost.clarity, HOLY.insight);
  near(battle._aegis(), HOLY.aegis);
  priest(battle, 3, 6, ['monk', 'blessing', 'insight', 'aegis']);
  battle.step(TICK);
  near(ally.boost.damage, HOLY.mantra.damage * (1 + 2 * HOLY.blessing), 'два жреца — +20%');
  near(ally.boost.clarity, HOLY.insight * 1.5, 'просветление — как ауры');
  near(battle._aegis(), HOLY.aegis * 1.5, 'защита — как ауры');
  battle.random = () => 0.1;
  const lives = battle.lives;
  walker(battle, battle.length - 1, 1e9);
  runFor(battle, 3);
  eq(battle.lives, lives, 'сердце не пострадало');
  ok(battle.events.some((e) => e.kind === 'aegis'));
  ok(holy.runes.has('sanctity'));
});

test('Диабло: на 100-й волне выходит один, без мобов, крепче обычного босса вчетверо, в полтора раза медленнее, огонь и сети его берут', () => {
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
  ok(devil.hp < devil.max, 'огонь берёт');
  battle._hold(devil, 5, fire);
  ok(!(devil.holdUntil > battle.time), 'не оглушается');
  const kin = BOSSES.find((boss) => !boss.flying && !boss.pace);
  const plain = battle._spawn({ type: 'boss', kind: kin, hp: 1e6 }, 4);
  near(battle._spawn(spawn, 3).speed, plain.speed * 2 / 3, 'в полтора раза медленнее');
  const hunter = forester(battle, 3, 2, ['hunter', 'catcher']), walking = battle._spawn(spawn, 6);
  ok(battle._stick(walking, hunter, 'net', 2, 0), 'сеть охотника держит');
  no(battle._stick(battle._spawn({ type: 'boss', kind: BOSSES[0], hp: 1e6 }, 7), hunter, 'net', 2, 0),
    'других боссов — нет');
  const at = walking.d;
  runFor(battle, 0.5);
  eq(walking.d, at, 'в сети стоит');
  battle.planFamily(200);
  eq(battle.nextFamily, FINALE, 'и на 200-й');
});

test('Диабло у сердца разбивает его одним ударом', () => {
  const battle = makeBattle();
  battle.random = () => 0;
  const devil = battle._spawn({ type: 'boss', kind: DIABLO, hp: 1e12 }, battle.length - 2);
  for (let i = 0; i < 400 && battle.lives > 0; i++) battle.step(TICK);
  eq(battle.lives, 0, 'сердце разбито');
  ok(devil.dead);
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
  const p2 = torch.place(player(), 'pyro', 12, 4);
  torch.setMods(p2, { runes: ['torch'] });
  torch.step(TICK);
  eq(s.torches.length, 2);
  const before = hit(target);
  torch.random = () => 0.99;
  s.reloadUntil = 0;
  s.busy = 0;
  torch._fire(s);
  near(hit(target) - before, s.damage * (1 + FIRE.torch.share * 1.5), 'второй факел — вполовину');

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

function water(battle, x, y, runes) {
  const t = battle.place(player(), 'frost', x, y);
  battle.setMods(t, { runes });
  t.critChance = 0;
  t.cooldown = 1e9;
  return t;
}

test('маг воды: частые капли из палочки летят и бьют по прилёту; стихию воды кладёт только с реакцией', () => {
  const battle = makeBattle(), t = water(battle, 10, 4, []);
  const mob = walker(battle, 11, 1e6);
  still(mob);
  ok(t.interval < 0.5, 'часто');
  battle._fire(t);
  eq(mob.hp, mob.max, 'капля ещё летит');
  ok(battle.events.some((e) => e.kind === 'shot' && e.time > 0));
  runFor(battle, 0.3);
  near(hit(mob), t.damage);
  no(mob.marks, 'без реакции стихию не кладёт');
  battle.setMods(t, { runes: ['waterReact'] });
  t.critChance = 0;
  battle._fire(t);
  runFor(battle, 0.3);
  ok(mob.marks && mob.marks.has('water'));
});

test('маг воды: навыки — свои у каждого стиля; дождь у гидроманта и кракена, снег у криоманта', () => {
  const ids = (taken) => choiceOf('frost', taken).map((option) => option.skill.id);
  eq(ids([]), ['hydro', 'kraken', 'cryo']);
  eq(ids(['hydro']), ['triple', 'bubble', 'vortex', 'spring', 'waterReact', 'home', 'rain', 'tide']);
  eq(ids(['kraken']), ['slap', 'ink', 'roar', 'drown', 'waterReact', 'home', 'rain', 'tide']);
  eq(ids(['cryo']), ['frostRing', 'iceBurst', 'iceWall', 'iceGod', 'waterReact', 'home', 'snow', 'tide']);
});

test('гидромант: водяная стрела слетает с тетивы и цепочкой пролетает всех врагов в радиусе по разу, потом пропадает', () => {
  const battle = makeBattle(), t = water(battle, 10, 4, ['hydro']);
  const mobs = [walker(battle, 9, 1e6), walker(battle, 11, 1e6), walker(battle, 12.5, 1e6)], far = walker(battle, 18, 1e6);
  still(...mobs, far);
  ok(battle._fire(t), 'выстрел');
  eq(battle.arrows.length, 1);
  ok(battle.events.some((e) => e.kind === 'arrow'));
  runFor(battle, 2);
  for (const mob of mobs) near(hit(mob), t.damage, 'каждого — по разу');
  eq(far.hp, far.max, 'за радиусом — нет');
  eq(battle.arrows.length, 0, 'пропала');
  eq(battle.events.filter((e) => e.kind === 'splash').length, 3);
});

test('гидромант, тройной выстрел: три стрелы веером — в цель и в других врагов, у каждой своя цепочка; углы плавные', () => {
  const battle = makeBattle(), t = water(battle, 10, 4, ['hydro', 'triple']);
  const mobs = [walker(battle, 9, 1e6), walker(battle, 11, 1e6), walker(battle, 12.5, 1e6)];
  still(...mobs);
  ok(battle._fire(t));
  eq(battle.arrows.length, WATER.triple.count, 'три стрелы');
  const heads = battle.arrows.map((arrow) => arrow.heading), spread = Math.max(...heads) - Math.min(...heads);
  ok(spread > WATER.triple.spread, 'веером');
  ok(new Set(battle.arrows.map((arrow) => arrow.mob)).size > 1, 'в разных врагов');
  let sharp = 0;
  const before = new Map(battle.arrows.map((arrow) => [arrow, arrow.heading]));
  for (let k = 0; k < 60 && battle.arrows.length; k++) {
    battle.step(TICK);
    for (const arrow of battle.arrows) {
      const turn = Math.abs(Math.atan2(Math.sin(arrow.heading - before.get(arrow)), Math.cos(arrow.heading - before.get(arrow))));
      if (turn > 1.6) sharp += 1;
      before.set(arrow, arrow.heading);
    }
  }
  eq(sharp, 0, 'стрела не ломается под углом — поворачивает дугой');
  for (const mob of mobs) near(hit(mob), t.damage * WATER.triple.count, 'каждая стрела — по разу каждого');
});

test('гидромант, пузырь: копит заряд за каждое попадание; раз в 30 секунд летит к элитному или боссу и лопается на 3 клетки', () => {
  const battle = makeBattle(), t = water(battle, 10, 4, ['hydro', 'bubble']);
  eq(t.bubble.charges, 0);
  const mobs = [walker(battle, 9, 1e9), walker(battle, 11, 1e9), walker(battle, 12, 1e9)];
  still(...mobs);
  battle._fire(t);
  runFor(battle, 1.5);
  eq(t.bubble.charges, 3, 'каждое попадание — заряд');
  t.bubble.charges = 100;
  runFor(battle, WATER.bubble.every);
  no(t.bubble.fly, 'нет элитных — ждёт');
  const boss = put(battle, special(battle, 'boss', 'crusher', 1e9), 14), side = walker(battle, 15, 1e9);
  still(boss, side);
  battle.step(TICK);
  ok(t.bubble.fly && t.bubble.fly.mob === boss, 'полетел к боссу');
  runFor(battle, 6);
  ok(battle.events.some((e) => e.kind === 'pop'), 'лопнул');
  eq(t.bubble.charges, 0, 'заряды кончились');
  near(hit(side), t.damage * WATER.bubble.per * 100, 'урон за каждый заряд — и соседям');
});

test('гидромант, пузырь: летит в полтора раза быстрее прежнего и догоняет даже самого быстрого врага', () => {
  eq(WATER.bubble.speed, 2.25);
  const battle = makeBattle(), t = water(battle, 4, 4, ['hydro', 'bubble']);
  t.bubble.charges = 50;
  t.nextBubble = 0;
  const runner = put(battle, special(battle, 'elite', 'leader', 1e9), 8);
  runner.speed = 4;
  battle.step(TICK);
  ok(t.bubble.fly, 'полетел');
  runFor(battle, 4);
  ok(battle.events.some((e) => e.kind === 'pop'), 'догнал и лопнул');
});

test('гидромант, водоворот: от попадания стрелы стягивает за секунду всех на 3 клетки, даже боссов', () => {
  const shot = makeBattle(), h = water(shot, 10, 4, ['hydro', 'vortex']);
  shot.random = () => 0;
  still(walker(shot, 11, 1e9), walker(shot, 12, 1e9));
  shot._fire(h);
  runFor(shot, 0.5);
  eq(shot.events.filter((e) => e.kind === 'vortex').length, 1, 'от попадания — водоворот, не чаще раза в 4 секунды');
  const battle = makeBattle(), t = water(battle, 10, 4, ['hydro', 'vortex']);
  const lead = walker(battle, 11, 1e9), back = walker(battle, 9, 1e9), far = walker(battle, 17, 1e9);
  const boss = put(battle, special(battle, 'boss', 'crusher', 1e9), 13.5);
  still(lead, back, far, boss);
  battle._vortex(t, lead.x, lead.y);
  runFor(battle, WATER.vortex.time - 0.05);
  for (const mob of [back, boss]) ok(Math.hypot(mob.x - lead.x, mob.y - lead.y) < 0.1, 'стянут в одну точку');
  runFor(battle, 0.15);
  for (const mob of [back, boss]) ok(Math.abs(mob.d - 11) < 0.2, 'стянут к точке: ' + mob.d);
  eq(far.d, 17, 'дальний — нет');
});

test('гидромант: стрела догоняет цель, даже если та вышла из радиуса', () => {
  const battle = makeBattle(), t = water(battle, 10, 4, ['hydro']), mob = walker(battle, 12, 1e6);
  still(mob);
  ok(battle._fire(t));
  battle.step(TICK);
  mob.d = 16;
  battle._locate(mob);
  no(battle._targetable(t, mob), 'ушла из радиуса');
  runFor(battle, 1.5);
  ok(hit(mob) > 0, 'попала');
});

test('гидромант, родник: в соседней клетке; на 3 клетки чинит стены, жжёт нежить, союзники перезаряжаются быстрее', () => {
  const battle = makeBattle(), t = water(battle, 10, 3, ['hydro', 'spring']);
  battle.step(TICK);
  eq(battle.springs.length, 1);
  const spring = battle.springs[0];
  eq(Math.max(Math.abs(spring.x - 10), Math.abs(spring.y - 3)), 1, 'в соседней клетке');
  no(battle.free(spring.x, spring.y), 'клетка занята');
  const ally = battle.place(player(), 'sniper', spring.x === 11 ? 12 : 11, 2);
  const ghost = walker(battle, spring.cx + 0.5, 1e9), living = walker(battle, spring.cx + 0.6, 1e9);
  ghost.undead = true;
  still(ghost, living);
  const wall = { tower: t, i: 0, r: 0, d: 0.5, x: spring.cx, y: 5.5, hp: 10, max: 100, hitAt: -1e9 };
  battle.walls.push(wall);
  runFor(battle, PULSE * 2 + 0.05);
  ok(wall.hp > 10, 'стена чинится');
  ok(hit(ghost) >= t.damage * WATER.spring.undead, 'нежить — сильно');
  eq(living.hp, living.max, 'живых — нет');
  near(ally.boost.clarity, WATER.spring.clarity);
});

test('родная стихия: у озера или реки урон и скорость атаки +25%; замёрзшая — не вода', () => {
  const battle = mapWith({ lake: [[6, 3]] }), t = water(battle, 6, 2, ['home']), far = water(battle, 2, 2, ['home']);
  battle.step(TICK);
  near(t.boost.rate, WATER.home);
  near(t.boost.damage, WATER.home);
  eq(far.boost.rate, 0, 'далеко от воды — нет');
  water(battle, 14, 2, ['cryo', 'snow']);
  runFor(battle, PULSE + 0.1);
  eq(t.boost.rate, 0, 'снег заморозил озеро');
});

test('дождь: лужи под ходячими врагами — медленнее, с водной реакцией мокрые; громоотводы вдвое чаще', () => {
  const battle = makeBattle(), t = water(battle, 10, 2, ['hydro', 'rain', 'waterReact']);
  battle.random = () => 0;
  const mob = walker(battle, 12, 1e9), flyer = walker(battle, 13, 1e9, bat());
  still(mob, flyer);
  runFor(battle, PULSE + 0.1);
  ok(battle.rain, 'идёт дождь');
  const puddles = battle.zones.filter((zone) => zone.kind === 'puddle');
  ok(puddles.some((zone) => near2(zone, mob)) && !puddles.some((zone) => near2(zone, flyer)), 'лужа — только под ходячим');
  runFor(battle, 0.6);
  ok(mob.slowUntil > battle.time && mob.marks && mob.marks.has('water'), 'медленнее и мокрый');
  no(flyer.marks, 'летучему лужа не страшна');
  const strikes = (rain) => {
    const b = makeBattle(), mage = storm(b, 4, 2, ['caller', 'rod']);
    if (rain) water(b, 10, 2, ['hydro', 'rain']);
    b.step(TICK);
    b.random = () => STORM.rod.chance * 1.5;
    runFor(b, PULSE * 2);
    return b.events.filter((e) => e.kind === 'surge').length;
  };
  eq(strikes(false), 0);
  ok(strikes(true) > 0, 'в дождь громоотвод срабатывает и с шансом выше обычного');
});

test('сила стихии: в дождь или снег урон +10% за каждый стак погоды', () => {
  const battle = makeBattle(), t = water(battle, 10, 2, ['hydro', 'tide']);
  battle.step(TICK);
  eq(t.boost.damage, 0, 'без погоды — нет');
  water(battle, 12, 2, ['kraken', 'rain']);
  water(battle, 14, 2, ['hydro', 'rain']);
  runFor(battle, PULSE + 0.05);
  eq(battle.weather, 2, 'два дождя — два стака');
  near(t.boost.damage, WATER.tide * 2);
  water(battle, 4, 2, ['cryo', 'snow']);
  runFor(battle, PULSE);
  eq(battle.snow, 3);
  near(t.boost.damage, WATER.tide * 3, 'дожди стали снегом — его сложения');
});

test('кракен: удар щупальца — наполовину обычный урон, наполовину вода', () => {
  const battle = makeBattle(), t = water(battle, 10, 4, ['kraken']), mob = walker(battle, 11, 1e9);
  still(mob);
  const hits = [], hurt = battle._hurt.bind(battle);
  battle._hurt = (target, amount, tower, element = tower.element || null, ...rest) => {
    hits.push([amount, element]);
    return hurt(target, amount, tower, element, ...rest);
  };
  ok(battle._fire(t));
  eq(hits.map(([, element]) => element), [null, 'water']);
  near(hits[0][0], t.damage / 2);
  near(hits[1][0], t.damage / 2);
});

test('водная реакция: и лёд криоманта делает врагов мокрыми', () => {
  const battle = makeBattle(), t = water(battle, 10, 4, ['cryo', 'waterReact']), mob = walker(battle, 11, 1e9);
  still(mob);
  battle._fire(t);
  runFor(battle, 0.4);
  ok(mob.marks && mob.marks.has('water'));
});

test('кракен, оглушающий шлепок: с шансом 10% удар оглушает на 2 секунды, элитного на 1, босса на полсекунды', () => {
  const stun = (make, roll) => {
    const battle = makeBattle(), t = water(battle, 10, 4, ['kraken', 'slap']), mob = make(battle);
    still(mob);
    battle.random = () => roll;
    ok(battle._fire(t));
    if (mob.holdUntil > battle.time) eq(mob.holdBy, 'kraken', 'оглушён, а не заморожен');
    return mob.holdUntil - battle.time;
  };
  near(stun((b) => walker(b, 11, 1e9), 0.05), WATER.slap.hold);
  near(stun((b) => put(b, special(b, 'elite', 'leader', 1e9), 11), 0.05), WATER.slap.elite);
  near(stun((b) => put(b, special(b, 'boss', BOSSES[0].id, 1e9), 11), 0.05), WATER.slap.boss);
  ok(stun((b) => walker(b, 11, 1e9), 0.5) <= 0, 'в остальных 90% — нет');
});

test('кракен, утопление: щупальце из воды утаскивает врага с 10% здоровья и меньше; элитных и боссов — нет', () => {
  const battle = mapWith({ lake: [[6, 4], [7, 4], [8, 4], [6, 3]] }), k = battle.place(player(), 'frost', 6, 3, { runes: ['kraken', 'drown'] });
  k.critChance = 0;
  battle.step(TICK);
  const weak = walker(battle, 8, 1000), elite = put(battle, special(battle, 'elite', 'leader', 1000), 8.2);
  still(weak, elite);
  weak.hp = 90;
  elite.hp = 90;
  battle._fire(k);
  ok(weak.dead && weak.drowned, 'утащил под воду');
  ok(battle.events.some((e) => e.kind === 'drown' && e.mob === weak));
  no(elite.dead && elite.drowned, 'элитного не топит');
});

test('кракен: дальность не меняется ни от холмов и вышек, ни от аур и оружия', () => {
  const battle = mapWith({ hill: [[4, 3]], watch: [[12, 3]] });
  const plain = water(battle, 8, 3, ['kraken']), hill = water(battle, 4, 3, ['kraken']), watch = water(battle, 12, 3, ['kraken']);
  battle.setMods(plain, { runes: ['kraken'], range: 2 });
  battle.place(player(), 'priest', 9, 3, { runes: ['monk', 'mantraRange'] });
  battle.step(TICK);
  eq([plain.range, hill.range, watch.range], [WATER.kraken.reach, WATER.kraken.reach, WATER.kraken.reach]);
});

test('снег: все медленнее; дождь других магов становится снегом; до 5 сложений, с 3 — враги замерзают', () => {
  const battle = makeBattle();
  water(battle, 4, 2, ['cryo', 'snow']);
  const mob = walker(battle, 12, 1e9);
  still(mob);
  runFor(battle, PULSE + 0.05);
  eq(battle.snow, 1);
  near(mob.slow, WATER.snow.slow[0]);
  water(battle, 6, 2, ['hydro', 'rain']);
  water(battle, 8, 2, ['kraken', 'rain']);
  runFor(battle, PULSE);
  eq(battle.snow, 3, 'дожди стали снегом');
  eq(battle.rain, null);
  near(mob.slow, WATER.snow.slow[2]);
  battle.random = () => 0;
  runFor(battle, PULSE);
  ok(mob.holdUntil > battle.time + WATER.snow.hold - 0.6 && mob.holdBy === 'frost', 'замерзает на 4 секунды');
  for (const x of [12, 14, 16]) water(battle, x, 2, ['cryo', 'snow']);
  runFor(battle, PULSE);
  eq(battle.snow, WATER.snow.max, 'больше пяти не бывает');
});

test('кракен: на суше бьёт одним щупальцем одного врага на 2 клетки вокруг; радиус ничем не увеличить', () => {
  const battle = makeBattle(), t = water(battle, 10, 4, ['kraken']);
  eq(t.range, WATER.kraken.reach);
  battle.setMods(t, { runes: ['kraken'], range: 2 });
  eq(t.range, WATER.kraken.reach, 'прибавка радиуса не действует');
  t.critChance = 0;
  const a = walker(battle, 11, 1e6), b = walker(battle, 10, 1e6), far = walker(battle, 14, 1e6);
  still(a, b, far);
  ok(battle._fire(t));
  eq([a, b].filter((mob) => mob.hp < mob.max).length, 1, 'одно щупальце — один враг');
  near(hit(a) + hit(b), t.damage);
  eq(far.hp, far.max);
  ok(battle.events.some((e) => e.kind === 'tentacle' && !e.arm));
});

test('криомант: сосулька из руки и одна из трёх кружащих — вдвое сильнее; потраченные отрастают по одной за 2 секунды', () => {
  const battle = makeBattle(), t = water(battle, 10, 4, ['cryo']);
  eq(t.icicles, WATER.cryo.stock);
  eq(t.element, 'ice', 'бьёт льдом');
  const mob = walker(battle, 11, 1e9);
  still(mob);
  battle._fire(t);
  eq(t.icicles, WATER.cryo.stock - 1);
  eq(battle.events.filter((e) => e.kind === 'icicle').map((e) => Boolean(e.big)), [false, true]);
  runFor(battle, 0.3);
  near(hit(mob), t.damage * (1 + WATER.cryo.big));
  for (let i = 0; i < 3; i++) battle._fire(t);
  eq(t.icicles, 0);
  eq(battle.events.filter((e) => e.kind === 'icicle' && e.big).length, WATER.cryo.stock, 'запаса нет — только из руки');
  runFor(battle, WATER.cryo.refill + 0.1);
  eq(t.icicles, 1, 'отросла одна');
  runFor(battle, WATER.cryo.refill * 2);
  eq(t.icicles, WATER.cryo.stock, 'и остальные, по одной');
  runFor(battle, WATER.cryo.refill * 2);
  eq(t.icicles, WATER.cryo.stock, 'больше трёх не бывает');
});

test('кракен, плевок чернил: раз в 15 секунд в самого живучего элитного на 5 клеток — медленнее вдвое, щупальца бьют его вдвое сильнее', () => {
  const battle = makeBattle(), t = water(battle, 10, 4, ['kraken', 'ink']);
  const small = walker(battle, 11, 1e6), tough = put(battle, special(battle, 'elite', 'leader', 2e6), 10);
  const far = put(battle, special(battle, 'elite', 'leader', 9e6), 17), plain = walker(battle, 10.5, 9e6);
  still(small, tough, far, plain);
  runFor(battle, 1);
  ok(battle.events.some((e) => e.kind === 'ink' && e.mob === tough), 'плюнул в самого живучего рядом');
  ok(tough.ink && tough.ink.until > battle.time + WATER.ink.time - 1.5, 'в чернилах');
  no(far.ink, 'дальше 5 клеток — нет');
  no(plain.ink, 'обычных — нет, хоть он и живучее');
  near(tough.slow, WATER.ink.slow);
  runFor(battle, 2);
  eq(battle.events.filter((e) => e.kind === 'ink').length, 1, 'раз в 15 секунд');
  const was = hit(tough), other = hit(small);
  ok(battle._fire(t));
  eq(hit(small), other, 'щупальце бьёт того, кто в чернилах');
  near(hit(tough) - was, t.damage * WATER.ink.mul);
});

test('кракен, плевок чернил: босс замедляется только на четверть', () => {
  const battle = makeBattle(), t = water(battle, 10, 4, ['kraken', 'ink']);
  const boss = put(battle, special(battle, 'boss', BOSSES[0].id, 1e9), 11);
  still(boss);
  runFor(battle, 1);
  ok(boss.ink);
  near(boss.slow, WATER.ink.boss);
});

test('кракен, рёв чудовища: враг рядом — рёв на всю карту; 10 секунд щупальца и птицы бьют сильнее по силе кракена', () => {
  const battle = makeBattle(), t = water(battle, 10, 4, ['kraken', 'roar']);
  const far = walker(battle, 17, 1e9);
  still(far);
  runFor(battle, 1);
  eq(battle.roaring(), 1, 'никого рядом — не ревёт');
  const mob = walker(battle, 11, 1e9);
  still(mob);
  runFor(battle, 0.3);
  ok(battle.events.some((e) => e.kind === 'bellow'), 'заревел');
  const boost = WATER.roar.per * t.might / MIGHT.base;
  near(battle.roaring(), 1 + boost);
  const was = hit(mob);
  ok(battle._fire(t));
  near(hit(mob) - was, t.damage * (1 + boost), 'щупальце сильнее');
  runFor(battle, WATER.roar.every);
  eq(battle.events.filter((e) => e.kind === 'bellow').length, 2, 'враг всё рядом — ревёт снова');
  battle.remove(t);
  runFor(battle, WATER.roar.time + 0.2);
  eq(battle.roaring(), 1, 'прошло 10 секунд');
});

test('рёв чудовища: птицы друида клюют сильнее', () => {
  const battle = makeBattle(), t = forester(battle, 16, 4, ['druid']);
  battle.roarUntil = 1e9;
  battle.roarBoost = 0.5;
  const mob = walker(battle, 17, 1e9);
  still(mob);
  runFor(battle, 4);
  const pecks = battle.events.filter((e) => e.kind === 'peck' && e.tower === t).length;
  ok(pecks > 0);
  near(hit(mob) / pecks, t.damage * WOOD.bird.mul * 1.5);
});

test('криомант, стужа: ледяное кольцо в 2 клетки ранит и замедляет на 20%; в снег сильнее на 10% за сложение', () => {
  const damage = (snow) => {
    const battle = makeBattle(), t = water(battle, 10, 4, ['cryo', 'frostRing']), mob = walker(battle, 11, 1e9);
    const far = walker(battle, 15, 1e9);
    still(mob, far);
    for (const x of [3, 5]) water(battle, x, 2, snow ? ['cryo', 'snow'] : ['cryo']);
    runFor(battle, PULSE + 0.05);
    eq(battle.snow, snow);
    eq(far.hp, far.max, 'дальше 2 клеток — нет');
    ok(mob.slow >= WATER.frostRing.slow - 1e-9, 'замедлен');
    const was = hit(mob);
    runFor(battle, WATER.frostRing.tick * 2);
    return { hit: hit(mob) - was, t };
  };
  const plain = damage(0);
  near(plain.hit, plain.t.damage * WATER.frostRing.mul * 2, 'ранит');
  near(damage(2).hit / plain.hit, 1 + WATER.frostRing.snow * 2);
});

test('криомант, стужа: радиус растёт на клетку за каждые 100 мощи сверх 100, без предела', () => {
  const battle = makeBattle(), t = water(battle, 10, 4, ['cryo', 'frostRing']);
  near(t.frost, WATER.frostRing.radius);
  battle.setMods(t, { runes: ['cryo', 'frostRing'], power: 100 });
  near(t.frost, WATER.frostRing.radius + WATER.frostRing.grow, 'радиус растёт с мощью');
  battle.setMods(t, { runes: ['cryo', 'frostRing'], power: 500 });
  near(t.frost, WATER.frostRing.radius + WATER.frostRing.grow * 5, 'без предела');
});

test('криомант, заморозка: большая сосулька с шансом 25% морозит только цель — 3 секунды, элитных 2, боссов 1', () => {
  eq(WATER.iceBurst.chance, 0.25);
  const freeze = (make, roll) => {
    const battle = makeBattle(), t = water(battle, 10, 4, ['cryo', 'iceBurst']), mob = make(battle);
    const side = walker(battle, 10.4, 1e9);
    still(mob, side);
    battle.random = () => roll;
    battle._fire(t);
    runFor(battle, 0.4);
    no(side.holdUntil > battle.time, 'соседи не замерзают');
    return mob.holdUntil - battle.time;
  };
  const left = freeze((b) => walker(b, 11, 1e9), 0.1);
  ok(left > WATER.iceBurst.hold - 0.5 && left <= WATER.iceBurst.hold, 'цель — на 3 секунды');
  const elite = freeze((b) => put(b, special(b, 'elite', 'leader', 1e9), 11), 0.1);
  ok(elite > WATER.iceBurst.elite - 0.5 && elite <= WATER.iceBurst.elite, 'элитный — на 2');
  const boss = freeze((b) => put(b, special(b, 'boss', BOSSES[0].id, 1e9), 11), 0.1);
  ok(boss > WATER.iceBurst.boss - 0.5 && boss <= WATER.iceBurst.boss, 'босс — на 1');
  ok(freeze((b) => walker(b, 11, 1e9), 0.5) <= 0, 'в остальных 75% — нет');
});

test('криомант, заморозка: только что оттаявшего сразу не замораживает', () => {
  const battle = makeBattle(), t = water(battle, 10, 4, ['cryo', 'iceBurst']), mob = walker(battle, 11, 1e9);
  still(mob);
  battle.random = () => 0.1;
  battle._fire(t);
  runFor(battle, 0.4);
  const until = mob.holdUntil;
  ok(until > battle.time);
  runFor(battle, until - battle.time + 0.1);
  battle._fire(t);
  runFor(battle, 0.3);
  ok(mob.holdUntil <= battle.time, 'передышка после заморозки');
});

test('криомант, ледяная стена: встаёт перед первым врагом в досягаемости, держит 10 ударов или 5 секунд; через 5 секунд — новая', () => {
  const battle = makeBattle(), t = water(battle, 10, 4, ['cryo', 'iceWall']);
  const flyer = walker(battle, 12, 1e9, bat()), mob = walker(battle, 9, 1e9);
  still(flyer);
  runFor(battle, TICK * 2);
  const wall = battle.walls.find((w) => w.ice);
  ok(wall, 'встала');
  ok(wall.d > mob.d && wall.d < flyer.d, 'перед пешим, не перед летучим');
  eq(wall.max, WATER.iceWall.hits);
  runFor(battle, 3);
  ok(mob.d < wall.d, 'держит');
  ok(wall.hp < wall.max, 'бьют');
  ok(battle.walls.includes(wall), 'ещё стоит');
  runFor(battle, 2.5);
  no(battle.walls.includes(wall), 'растаяла через 5 секунд');
  ok(battle.events.some((e) => e.kind === 'crumble' && e.ice));
  still(walker(battle, 9, 1e9));
  runFor(battle, WATER.iceWall.rest - 1);
  no(battle.walls.some((w) => w.ice), 'отдыхает 5 секунд');
  runFor(battle, 1.5);
  ok(battle.walls.some((w) => w.ice), 'новая');
});

test('ледяная стена: 10 ударов — и рассыпалась; родник её не чинит', () => {
  const battle = makeBattle(), t = water(battle, 10, 4, ['cryo', 'iceWall']);
  const mobs = [9, 8.8, 8.6, 8.4, 8.2, 8, 7.8, 7.6, 7.4, 7.2, 7].map((d) => walker(battle, d, 1e9));
  runFor(battle, TICK * 2);
  const wall = battle.walls.find((w) => w.ice);
  ok(wall);
  runFor(battle, 3);
  no(battle.walls.includes(wall), 'от 10 ударов рассыпалась раньше 5 секунд');
  ok(mobs[0].d > wall.d, 'прошли');
  const healed = makeBattle(), h = water(healed, 10, 3, ['hydro', 'spring']), c = water(healed, 12, 4, ['cryo']);
  healed.step(TICK);
  const spring = healed.springs[0], ice = { tower: c, i: 0, r: 0, d: 0.5, x: spring.cx, y: 5.5, hp: 1, max: 10, hitAt: -1e9,
    ice: true, until: 1e9 };
  healed.walls.push(ice);
  runFor(healed, PULSE * 2 + 0.05);
  eq(ice.hp, 1, 'родник не чинит');
});

test('криомант, бог льда: запас 5 сосулек, отрастают за секунду; каждая атака — 3 сосульки в разных врагов, к каждой большая', () => {
  const battle = makeBattle(), t = water(battle, 10, 4, ['cryo', 'iceGod']);
  const mobs = [walker(battle, 11, 1e9), walker(battle, 10, 1e9), walker(battle, 9, 1e9)];
  still(...mobs);
  runFor(battle, 2.5);
  eq(t.icicles, WATER.iceGod.stock, 'запас 5');
  battle.events.length = 0;
  battle._fire(t);
  const shots = battle.events.filter((e) => e.kind === 'icicle');
  eq(shots.filter((e) => !e.big).length, WATER.iceGod.count, 'три из руки');
  eq(shots.filter((e) => e.big).length, WATER.iceGod.count, 'и к каждой большая');
  eq(new Set(shots.filter((e) => !e.big).map((e) => e.mob)).size, 3, 'в разных врагов');
  eq(t.icicles, WATER.iceGod.stock - 3);
  runFor(battle, WATER.iceGod.refill + 0.1);
  eq(t.icicles, WATER.iceGod.stock - 2, 'отросла за секунду');
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
    water: at('frost', 5, { runes: ['waterReact'] }), earth: at('earth', 7, { runes: ['earthReact'] }),
    lightning: at('thunder', 11, { runes: ['stormReact'] }), poison: at('forester', 13, { runes: ['witch'] }),
  };
  return { battle, towers };
}

test('реакции: стихию накладывают только «… реакция»; две стихии — реакция в тик, урон от суммы мощи', () => {
  const { battle, towers } = lab(), plain = battle.place(player(), 'thunder', 15, 3);
  eq([towers.fire.react, towers.water.react, towers.earth.react], ['fire', 'water', 'earth']);
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
  eq(towers.fire.run.kills + towers.fire2.run.kills + towers.water.run.kills, 1, 'убийство — только добившему');
  ok(towers.fire2.run.assists >= HELP.react && towers.water.run.assists >= HELP.react, 'остальным — очки помощи');
});

test('реакции: шанс выше у стихии, наложенной чаще; несколько реакций сразу, если не мешают', () => {
  const { battle, towers } = lab();
  battle.random = seeded(5);
  let steam = 0, mud = 0;
  for (let i = 0; i < 300; i++) {
    const mob = walker(battle, 2, 1e9);
    still(mob);
    for (const key of ['fire', 'fire2', 'fire3', 'water', 'earth']) battle._mark(mob, towers[key].react, towers[key]);
    battle._pulse(battle.time);
    if (battle.state(mob, 'steam')) steam += 1;
    if (battle.state(mob, 'mud')) mud += 1;
    mob.dead = true;
  }
  ok(steam > mud * 1.3, 'огня больше — пар чаще: ' + steam + ' против ' + mud);
  const both = walker(battle, 6, 1e9);
  still(both);
  for (const key of ['fire', 'water', 'earth', 'poison']) battle._mark(both, key, towers[key]);
  battle._pulse(battle.time);
  ok(!both.marks, 'две реакции сразу');
});

test('реакции: гарантированные — лава, эпидемия, ядерный взрыв; газ из пара и яда', () => {
  const { battle, towers } = lab();
  const mud = walker(battle, 2, 1e9);
  still(mud);
  battle._mark(mud, 'water', towers.water);
  battle._mark(mud, 'earth', towers.earth);
  battle._pulse(battle.time);
  ok(battle.state(mud, 'mud'), 'грязь');
  battle._mark(mud, 'fire', towers.fire);
  battle._pulse(battle.time);
  ok(battle.zones.some((zone) => zone.kind === 'lava') && !battle.state(mud, 'mud'), 'лава');

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

function earth(battle, x, y, runes, xp = 0) {
  const t = battle.place(player(xp), 'earth', x, y);
  battle.setMods(t, { runes });
  t.critChance = 0;
  return t;
}

const beside = (battle, x, hp = 1e6) => {
  const mob = walker(battle, 1, hp);
  for (let d = 0; d < battle.length; d += 0.05) {
    put(battle, mob, d);
    if (Math.floor(mob.x) === x) return mob;
  }
  return mob;
};

test('маг земли: взмахом руки бросает груду камней — урон землёй по прилёту; стихию кладёт только с реакцией', () => {
  const battle = makeBattle(), t = earth(battle, 10, 4, []), mob = walker(battle, 11, 1e6);
  still(mob);
  ok(battle._fire(t));
  eq(mob.hp, mob.max, 'камни ещё летят');
  ok(battle.events.some((e) => e.kind === 'shot' && e.tower === t));
  runFor(battle, 1);
  ok(hit(mob) > 0, 'попали');
  no(mob.marks, 'без реакции стихию не кладёт');
  battle.setMods(t, { runes: ['earthReact'] });
  t.cooldown = 0;
  battle._fire(t);
  runFor(battle, 1);
  ok(mob.marks && mob.marks.has('earth'), 'с «Земляной реакцией» — метка земли');
  eq(choiceOf('earth', []).map((option) => option.skill.id), ['keeper', 'serpent', 'geo'], 'первый камень — подкласс');
  eq(choiceOf('earth', ['geo']).map((option) => option.skill.id), ['earthReact', 'solid', 'terraform', 'petrify']);
});

test('маг земли: лавовый змей — половина урона огнём, половина землёй; геомант бьёт крупным камнем сильнее', () => {
  const battle = makeBattle(), snake = earth(battle, 10, 4, ['serpent']), mob = walker(battle, 11, 1e6);
  still(mob);
  const hits = [], hurt = battle._hurt.bind(battle);
  battle._hurt = (target, amount, t, element, ...rest) => {
    if (t === snake) hits.push([element, amount]);
    return hurt(target, amount, t, element, ...rest);
  };
  battle._fire(snake);
  snake.busy = 1e9;
  runFor(battle, 1);
  eq(hits.map(([element]) => element).sort(), ['earth', 'fire']);
  near(hits[0][1], hits[1][1], 'поровну');
  near(hits[0][1] + hits[1][1], snake.damage);
  const plain = earth(battle, 12, 4, []), geo = earth(battle, 14, 4, ['geo']);
  near(geo.damage / plain.damage, EARTH.geo.mul);
});

test('лавовый змей встаёт в озеро или реку лавы; остыла лава — стоит на камне, без лавы', () => {
  const battle = mapWith({ lake: [[6, 3], [7, 3]], river: [[12, 2]] }, 'volcano');
  eq(flier(['serpent']), 'lava');
  no(battle.place(player(), 'earth', 7, 3, { runes: ['geo'] }), 'в лаву — только змей');
  const snake = battle.place(player(), 'earth', 6, 3, { runes: ['serpent'] });
  ok(snake, 'змей в лаве');
  ok(battle.bathes(snake));
  ok(battle.move(snake, 12, 2), 'и в реку лавы');
  const cold = mapWith({ lake: [[6, 3]] }, 'grass');
  no(cold.place(player(), 'earth', 6, 3, { runes: ['serpent'] }), 'в обычную воду — нет');
  battle.cooled = true;
  battle._terrain();
  no(battle.bathes(snake), 'лава остыла');
});

test('хранитель: стена на ближайшей клетке дороги, из равных — ближе к сердцу; держит мобов; летучих не держит', () => {
  const path = Array.from({ length: 11 }, (_, x) => [x, 5]).concat(Array.from({ length: 9 }, (_, k) => [10, 6 + k]));
  const battle = makeBattle({ path }), keeper = earth(battle, 9, 6, ['keeper']);
  runFor(battle, 0.2);
  eq(battle.walls.length, 1, 'стена поставлена');
  eq([battle.walls[0].x, battle.walls[0].y], [10.5, 6.5], 'из двух ближайших — та, что ближе к сердцу');
  const field = makeBattle(), mage = earth(field, 10, 4, ['keeper']);
  runFor(field, 0.2);
  const wall = field.walls[0];
  ok(Math.hypot(wall.x - mage.cx, wall.y - mage.cy) <= 1.01, 'на ближайшей клетке дороги');
  mage.busy = 1e9;
  const mob = walker(field, wall.d - 3, 30), flyer = walker(field, wall.d - 3, 30, bat());
  runFor(field, 3);
  ok(mob.d < wall.d && mob.wall === wall, 'стоит у стены и грызёт');
  ok(flyer.d > wall.d, 'летучая пролетела');
  ok(wall.hp < wall.max);
  const other = makeBattle();
  earth(other, 10, 4, ['geo']);
  runFor(other, 0.2);
  eq(other.walls.length, 0, 'у других подклассов стены нет');
});

test('хранитель: прочность стены растёт с мощью; 10 секунд без атак — чинится целиком; сломанная встаёт через 9 секунд', () => {
  const battle = makeBattle(), weak = earth(battle, 10, 4, ['keeper']), strong = earth(battle, 4, 4, ['keeper']);
  battle.setMods(strong, { runes: ['keeper'], power: 100 });
  runFor(battle, 0.2);
  const own = (t) => battle.walls.find((wall) => wall.tower === t);
  near(own(strong).max, own(weak).max * 2, 'мощь 200 — вдвое прочнее');
  near(own(weak).max, weak.might * EARTH.wall.might, 'прочность — от мощи');
  const wall = own(weak);
  wall.hp = wall.max / 2;
  wall.hitAt = battle.time;
  runFor(battle, EARTH.wall.heal - 0.5);
  near(wall.hp, wall.max / 2, 'пока чинить рано');
  runFor(battle, 1);
  near(wall.hp, wall.max, 'починилась');
  weak.busy = 1e9;
  battle._batter(wall, walker(battle, 2, 100), 1e9, battle.time);
  no(own(weak), 'сломали');
  weak.busy = 0;
  runFor(battle, EARTH.wall.rebuild - 0.5);
  no(own(weak));
  runFor(battle, 1);
  ok(own(weak), 'встала снова');
});

test('хранитель перебежал — новая стена встаёт сразу, старая убрана', () => {
  const battle = makeBattle(), mage = earth(battle, 10, 4, ['keeper']);
  runFor(battle, 0.2);
  const old = battle.walls[0], spot = battle.bestCell(mage.range);
  ok(old);
  ok(battle.move(mage, spot.x, spot.y));
  eq(battle.walls.filter((wall) => wall.tower === mage).length, 1);
  no(battle.walls[0] === old, 'стена новая');
  eq(battle.walls[0].hp, battle.walls[0].max);
});

test('непригодная почва: пока маг с ней на карте, никто не закапывается — подземных видно и можно бить', () => {
  const battle = makeBattle(), gun = battle.place(player(), 'mechanic', 6, 4), mole = creature(battle, 'mole', 5);
  mole.underUntil = 1e9;
  battle._hurt(mole, 100, gun, null);
  eq(mole.hp, mole.max, 'под землёй не ранится');
  const mage = earth(battle, 14, 4, ['solid']);
  battle.step(TICK);
  battle._hurt(mole, 100, gun, null);
  ok(hit(mole) > 0, 'с непригодной почвой — ранится');
  battle.remove(mage);
  battle.step(TICK);
  const hp = mole.hp;
  battle._hurt(mole, 100, gun, null);
  eq(mole.hp, hp, 'маг ушёл — снова под землёй');
});

test('терраформирование: каждое взятие — холм-вышка до конца игры на клетке мага, занята — на соседней; до 3', () => {
  const battle = makeBattle(), mage = earth(battle, 10, 3, []), range = mage.range;
  battle.setMods(mage, { runes: ['terraform'] });
  battle.step(TICK);
  eq(battle.mounds.map((m) => [m.x, m.y]), [[10, 3]]);
  near(mage.range - range, TERRAIN.watch, 'стоит на холме — как на вышке');
  ok(battle.move(mage, 12, 3));
  runFor(battle, MOVE_PAUSE + 0.1);
  eq(battle.mounds.map((m) => [m.x, m.y]), [[10, 3]], 'перебежал — новый холм не растёт, старый стоит');
  battle.setMods(mage, { runes: ['terraform', 'terraform'] });
  battle.step(TICK);
  eq(battle.mounds.map((m) => [m.x, m.y]), [[10, 3], [12, 3]], 'взял второй раз — второй холм');
  ok(battle.move(mage, 10, 3));
  runFor(battle, MOVE_PAUSE + 0.1);
  battle.setMods(mage, { runes: ['terraform', 'terraform', 'terraform'] });
  battle.step(TICK);
  eq(battle.mounds.length, 3, 'третий');
  const third = battle.mounds[2];
  ok(Math.max(Math.abs(third.x - 10), Math.abs(third.y - 3)) === 1, 'своя клетка занята холмом — на соседней');
  no(battle.road.some(([x, y]) => x === third.x && y === third.y), 'не на дороге');
  runFor(battle, 1);
  eq(battle.mounds.length, 3, 'больше трёх не бывает');
  const gun = battle.place(player(), 'mechanic', 12, 3), other = battle.place(player(), 'mechanic', 2, 3);
  near(gun.range - other.range, TERRAIN.watch, 'чужой на холме тоже как на вышке');
  battle.remove(mage);
  eq(battle.mounds.length, 3, 'холмы стоят до конца игры');
  ok(battle.onWatch(gun));
});

test('окаменение: враг в соседней клетке каменеет — 3 с, элитный 2, босс 1; от одного мага — раз, другой продлевает', () => {
  const battle = makeBattle();
  earth(battle, 10, 4, ['petrify']);
  const mob = beside(battle, 10), far = beside(battle, 4);
  battle.step(TICK);
  near(mob.stoneUntil - battle.time, EARTH.petrify.time, 'обычный — 3 с');
  ok(mob.holdUntil >= mob.stoneUntil, 'стоит');
  eq(far.stoneUntil, 0, 'далеко — нет');
  const until = mob.stoneUntil;
  battle.step(TICK);
  eq(mob.stoneUntil, until, 'от того же мага второй раз — нет');
  earth(battle, 11, 6, ['petrify']);
  battle.step(TICK);
  near(mob.stoneUntil, until + EARTH.petrify.time, 'другой маг, пока каменный, — время складывается');
  const elite = put(battle, special(battle, 'elite', ELITES[0].id, 1e6), mob.d);
  const boss = put(battle, special(battle, 'boss', BOSSES[0].id, 1e6), mob.d);
  battle.step(TICK);
  near(elite.stoneUntil - battle.time, EARTH.petrify.elite * 2, 'элитный — по 2 с от каждого из двух магов');
  near(boss.stoneUntil - battle.time, EARTH.petrify.boss * 2, 'босс — по 1 с от каждого');
});

test('свирепые мобы: через две минуты после последнего — и дальше каждые 10 с на 20% крепче к оковам и сильнее грызут стены', () => {
  const battle = makeBattle(), mage = earth(battle, 10, 4, ['keeper']);
  runFor(battle, 0.2);
  mage.busy = 1e9;
  const wall = battle.walls[0], mob = walker(battle, Math.max(0, wall.d - 1.5), 1e12);
  wall.hp = wall.max = 1e9;
  runFor(battle, OVERTIME - 10);
  no(mob.wild, 'пока рано');
  runFor(battle, 10.5);
  ok(mob.wild, 'рассвирепел');
  ok(battle.events.some((e) => e.kind === 'wild'));
  near(mob.rage, RAGE.step, 'сначала +20%');
  ok(mob.wall === wall, 'стена держит и свирепого');
  battle._hold(mob, 5, null);
  near(mob.holdUntil - battle.time, 5 * (1 - RAGE.step), 'оковы на 20% слабее');
  const bite = (target) => {
    const before = wall.hp;
    battle._batter(wall, target, 1, battle.time);
    return before - wall.hp;
  };
  const calm = walker(battle, 1, 1e12), gnaw = bite(mob);
  near(gnaw, bite(calm) * (1 + RAGE.step), 'стену грызёт на 20% сильнее');
  runFor(battle, RAGE.every);
  near(mob.rage, RAGE.step * 2, 'через 10 с — ещё +20%');
  runFor(battle, RAGE.every * 3);
  near(mob.rage, 1);
  mob.holdUntil = 0;
  battle._hold(mob, 5, null);
  ok(mob.holdUntil <= battle.time, 'на 100% оковы не держат');
  runFor(battle, RAGE.every * 60);
  near(mob.rage, RAGE.max, 'предел — +1000%');
  eq(mob.info.leak, MOBS.normal.leak, 'по сердцу — как прежде');
});

test('свирепые мобы: каждые 10 с на 20% быстрее, до 1000%', () => {
  const battle = makeBattle(), wild = walker(battle, 2, 1e9), calm = walker(battle, 2, 1e9);
  battle.wild = true;
  battle.wildAt = battle.time;
  wild.wild = true;
  const from = [wild.d, calm.d];
  runFor(battle, 1);
  near((wild.d - from[0]) / (calm.d - from[1]), 1 + RAGE.step, 'сначала на 20% быстрее');
  battle.wildAt = battle.time - RAGE.every * 100;
  const again = [wild.d, calm.d];
  runFor(battle, 0.5);
  near((wild.d - again[0]) / (calm.d - again[1]), 1 + RAGE.max, 'предел — на 1000%');
});

test('элементали: своя стихия их не берёт, остальное — как обычно', () => {
  const battle = makeBattle();
  const pyro = battle.place(level(10), 'pyro', 3, 4), gunner = battle.place(player(), 'mechanic', 3, 6);
  const cryo = water(battle, 5, 4, ['cryo']), witch = forester(battle, 5, 6, ['witch']);
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
  battle._hurt(ice, 50, cryo);
  eq(ice.hp, ice.max, 'лёд не берёт');
  no(battle._targetable(cryo, ice), 'криомант в него не целится');
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

test('сон: котёл, жерло и знамя спящего остаются на карте и работают; проснувшийся забирает их себе', () => {
  const battle = makeBattle();
  const witch = forester(battle, 10, 3, ['witch', 'cauldron']), mage = battle.place(player(), 'pyro', 4, 3);
  battle.setMods(mage, { runes: ['fireball', 'vent'] });
  const shaman = sorc(battle, 14, 3, ['shamaness', 'totemSlow']);
  battle.step(TICK);
  eq([battle.cauldrons.length, battle.vents.length, battle.banners.length], [1, 1, 1]);
  for (const t of [witch, mage, shaman]) battle.leave(t);
  eq(battle.towers.length, 0, 'с карты ушли');
  eq([battle.cauldrons.length, battle.vents.length, battle.banners.length], [1, 1, 1], 'вещи на месте');
  const mob = walker(battle, 9, 1e9);
  still(mob);
  runFor(battle, WOOD.cauldron.every + FIRE.vent.every + 1);
  ok(battle.events.some((e) => e.kind === 'blob') && battle.events.some((e) => e.kind === 'shot' && e.tower === mage),
    'котёл и жерло стреляют');
  ok(mob.hp < 1e9, 'и ранят');
  const back = battle.place(player(), 'forester', 9, 2, { runes: ['witch', 'cauldron'] });
  battle.adopt(witch, back);
  battle.step(TICK);
  eq(battle.cauldrons.length, 1, 'второго котла нет');
  ok(battle.cauldrons[0].tower === back, 'котёл снова её');
});

test('полёт: ангел и дракон встают над горами, озёрами, реками и кратерами, но не на дорогу; остальные — нет', () => {
  const battle = mapWith({ mountain: [[6, 3], [6, 4]], lake: [[7, 3]], river: [[8, 3]], crater: [[9, 3]] });
  no(battle.place(player(), 'sniper', 6, 3), 'стрелок на гору не встаёт');
  const angel = battle.place(player(), 'priest', 6, 3, { runes: ['angel'] });
  ok(angel && angel.x === 6 && angel.y === 3, 'ангел — над горой');
  ok(battle.aloft(angel));
  const mob = walker(battle, 6.5, 1e9);
  ok(battle.covered(6.5, 4.5) && battle.sees(angel, mob), 'сверху гора не мешает');
  for (const [x, y] of [[7, 3], [8, 3], [9, 3]]) ok(battle.move(angel, x, y), 'и над ' + battle.tiles[y * SIZE + x]);
  no(battle.move(angel, 5, 5), 'на дорогу нельзя');
  const dragon = battle.place(player(), 'pyro', 2, 2, { runes: ['dragon'] });
  ok(battle.move(dragon, 7, 3), 'дракон над озером');
  battle.setMods(dragon, { runes: [] });
  no(battle.aloft(dragon), 'без полёта спускается на ближайшую обычную клетку');
  ok(Math.abs(dragon.x - 7) + Math.abs(dragon.y - 3) <= 2 && battle.towerAt(dragon.x, dragon.y) === dragon);
});

test('кракен: встаёт в озеро или реку; щупальце — в каждой свободной клетке водоёма, и за мостом; бьют на 3 клетки', () => {
  const lake = [[3, 2], [4, 2], [5, 2], [3, 1], [4, 1]], river = [[6, 2], [7, 2], [8, 2], [8, 3], [8, 4], [8, 6], [8, 7]];
  const battle = mapWith({ lake: lake.concat([[15, 1], [16, 1]]), river, bridge: [[8, 5]] });
  no(battle.free(4, 2), 'в воду — только кракену');
  ok(battle.free(4, 2, 'sea'));
  const t = battle.place(player(), 'frost', 4, 2, { runes: ['kraken'] });
  ok(t && battle.swims(t), 'кракен в озере');
  t.critChance = 0;
  battle.step(TICK);
  const cells = (list) => list.map((arm) => Math.floor(arm.x) + ',' + Math.floor(arm.y)).sort();
  eq(battle.arms.length, lake.length + river.length - 1, 'в каждой клетке водоёма, кроме головы');
  no(cells(battle.arms).includes('4,2'), 'где голова — щупальца нет');
  ok(cells(battle.arms).includes('8,7'), 'река за мостом — тот же водоём');
  no(cells(battle.arms).includes('15,1'), 'другое озеро — нет');
  const other = battle.place(player(), 'frost', 3, 1, { runes: ['kraken'] });
  battle.step(TICK);
  eq(battle.arms.length, 2 * (lake.length + river.length - 2), 'второй кракен — тоже во все клетки, кроме голов');
  const spots = battle.arms.map((arm) => arm.x + ',' + arm.y);
  eq(new Set(spots).size, spots.length, 'в одной клетке щупальца разных кракенов — в разных местах');
  const mob = walker(battle, 9, 1e6), far = walker(battle, 19, 1e6);
  still(mob, far);
  t.cooldown = 1e9;
  other.cooldown = 1e9;
  ok(battle._fire(t));
  const strikes = battle.events.filter((e) => e.kind === 'tentacle' && e.tower === t);
  ok(strikes.length >= 2 && strikes.every((e) => e.arm && Math.hypot(e.mob.x - e.arm.x, e.mob.y - e.arm.y) <= WATER.kraken.sea),
    'бьёт сразу много щупалец, каждое — на 3 клетки');
  near(hit(mob), strikes.length * t.damage * WATER.kraken.arm / WATER.kraken.mul);
  eq(far.hp, far.max);
  ok(battle.move(t, 4, 3), 'вышел на сушу');
  battle.step(TICK);
  no(battle.swims(t));
  no(battle.arms.some((arm) => arm.tower === t), 'на суше щупалец в воде нет');
});

test('снег замораживает озёра и реки — по льду ходят, кракен там как на суше; дождь и снег остужают лаву в камень', () => {
  const battle = mapWith({ lake: [[6, 2], [7, 2], [8, 2]] }), k = battle.place(player(), 'frost', 6, 2, { runes: ['kraken'] });
  ok(battle.swims(k));
  no(battle.free(7, 2));
  const cryo = water(battle, 3, 2, ['cryo', 'snow']);
  runFor(battle, PULSE + 0.05);
  ok(battle.frozen && battle.liquid === 'ice', 'замёрзло');
  no(battle.swims(k), 'кракен на льду — как на суше');
  eq(battle.arms.length, 0);
  ok(battle.free(7, 2), 'по льду можно ходить');
  const gun = battle.place(player(), 'sniper', 8, 2);
  battle.remove(cryo);
  runFor(battle, PULSE + 0.05);
  no(battle.frozen, 'растаяло');
  ok(battle.swims(k), 'кракен снова в воде');
  ok(gun.x !== 8 || gun.y !== 2, 'стрелок со льда сошёл на берег');

  const hot = mapWith({ lake: [[6, 2], [7, 2]] }, 'volcano');
  eq(hot.place(player(), 'frost', 6, 2, { runes: ['kraken'] }), null, 'лава — не вода, кракену туда нельзя');
  const rainer = water(hot, 3, 2, ['hydro', 'rain']);
  runFor(hot, PULSE + 0.05);
  ok(hot.cooled && hot.liquid === 'basalt', 'лава остыла');
  ok(hot.free(6, 2), 'на камне можно стоять');
  hot.remove(rainer);
  runFor(hot, PULSE + 0.05);
  ok(hot.cooled, 'камень остаётся');
  const ice = mapWith({ lake: [[6, 2]] }, 'snow');
  no(ice.place(player(), 'frost', 6, 2, { runes: ['kraken'] }) && ice.swims(ice.towerAt(6, 2)), 'лёд — не вода');
});

test('полёт: дракон с перелётом перелетает и на клетку над водой или горой', () => {
  const water = [11, 12, 13].flatMap((x) => [[x, 4], [x, 6]]);
  const battle = mapWith({ lake: water }), dragon = battle.place(player(), 'pyro', 2, 2, { runes: ['dragon', 'flight'] });
  const lead = walker(battle, 12, 1e9);
  still(lead);
  battle._fly(dragon, battle.time);
  ok(battle.aloft(dragon) && Math.abs(dragon.x - 12) <= 1, 'над озером у первого моба: ' + [dragon.x, dragon.y]);
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
  near(frost.range, radius + TERRAIN.watch, 'и капли дальше');
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

test('карта: мобы появляются у выхода из пещеры', () => {
  const battle = mapWith({ tunnel: [[0, 5], [1, 5], [10, 0], [10, 1], [14, 5], [15, 5]] });
  battle.startWave(1, 1);
  battle.step(TICK);
  const first = battle.mobs.find((mob) => mob.r === 0), second = battle.mobs.find((mob) => mob.r === 1);
  ok(first && second, 'вышли из обоих');
  ok(first.d > 2.2 && first.d < 2.5 && second.d > 2.2 && second.d < 2.5, 'у самого выхода: ' + [first.d, second.d]);
  runFor(battle, 0.3);
  no(battle.covered(first.x, first.y), 'вышел на свет');
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
  near(t.ring, FIRE.ring.radius + FIRE.ring.grow, 'радиус растёт с мощью');
  battle.setMods(t, { runes: ['ignite', 'flameRing'], power: 500 });
  near(t.ring, FIRE.ring.radius + FIRE.ring.grow * 5, 'без предела');
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
