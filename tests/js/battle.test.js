import { test, eq, ok, no } from './harness.js';
import { STRAIGHT, makeBattle, player, runFor, seeded } from './fixtures.js';
import { BITE_TIME, Battle, MOVE_PAUSE, NUKE_FLIGHT, NUKE_STUN, OVERTIME } from '../../site/js/battle.js';
import { SIZE } from '../../site/js/field.js';
import { BOSSES, ELITES, HEAL_CAP, LIVES, LOOKS, MIMIC, MOBS, POWERS, TERRAIN, TICK, waveSpawns, xpForLevel }
  from '../../site/js/balance.js';
import { ASSIST_COINS, KILL_COINS, UNIQUES } from '../../site/js/gacha.js';
import { CLASSES } from '../../site/js/classes.js';

const ATTACK = (battle, t, target) => {
  battle.time = Math.max(battle.time, t.leapUntil);
  t.host = target;
  battle._fire(t, battle.time);
};
const leakOf = (wave) => waveSpawns(wave).reduce((sum, s) => sum + MOBS[s.type].leak, 0);

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
  const battle = makeBattle(), hero = player(xpForLevel(40));
  battle.place(hero, 'gunner', 2, 4);
  battle.startWave(1, 1);
  finish(battle);
  eq(battle.lives, LIVES);
  const count = waveSpawns(1).length;
  eq(hero.kills, count);
  ok(hero.xp >= xpForLevel(40) + count);
  eq(hero.coins, KILL_COINS * MOBS.normal.coins * count);
});

test('бой: опыт и монеты за помощь, убийство — добившему', () => {
  const battle = makeBattle(), a = player(xpForLevel(20)), b = player(xpForLevel(20));
  const ta = battle.place(a, 'gunner', 2, 4), tb = battle.place(b, 'gunner', 2, 6);
  battle.startWave(1, 2);
  finish(battle);
  const count = waveSpawns(1).length;
  eq(a.kills + b.kills, count);
  eq(a.kills + a.assists, count);
  eq(b.kills + b.assists, count);
  eq(a.coins, (a.kills * KILL_COINS + a.assists * ASSIST_COINS) * MOBS.normal.coins);
  eq(ta.run.kills, a.kills);
  eq(tb.run.assists, b.assists);
});

test('бой: знамя ускоряет соседей, дальних — нет, и даёт знаменосцу помощь', () => {
  const battle = makeBattle();
  const flag = battle.place(player(), 'banner', 5, 3);
  const close = battle.place(player(), 'gunner', 6, 3);
  const far = battle.place(player(), 'gunner', 15, 3);
  battle.step(TICK);
  ok(close.buff.haste > 0);
  eq(far.buff.haste, 0);
  ok(flag.buff.haste > 0, 'и себя');
  ok(close.helpers.includes(flag));
  eq(flag.helpers, []);
});

test('бой: шаман не отбросит моба дальше предела, оглушение не чаще, чем позволяет передышка', () => {
  const battle = makeBattle(), shaman = battle.place(player(xpForLevel(100)), 'shaman', 10, 4);
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
  const battle = makeBattle(), hero = player(xpForLevel(30)), tower = battle.place(hero, 'gunner', 1, 4);
  no(battle.move(tower, 1, 5), 'на дорогу');
  ok(battle.move(tower, 4, 4));
  eq(battle.byCell.has(4 * 20 + 1), false);
  battle.startWave(1, 1);
  runFor(battle, MOVE_PAUSE - 0.1);
  eq(tower.run.damage, 0);
  runFor(battle, 8);
  ok(tower.run.damage > 0);
});

test('бой: лекарь возвращает жизни после волны, но не выше начальных', () => {
  const battle = makeBattle();
  for (let i = 0; i < 5; i++) battle.place(player(), 'healer', i * 2, 0);
  battle.lives = LIVES - 10;
  eq(battle.endWave(), HEAL_CAP);
  eq(battle.lives, LIVES - 10 + HEAL_CAP);
  battle.lives = LIVES - 1;
  eq(battle.endWave(), 1);
  eq(battle.lives, LIVES);
});

test('бой: прибавки оружия и гачи меняют урон, дальность и скорость', () => {
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

test('бой: уровень растёт прямо в бою', () => {
  const battle = makeBattle(), hero = player(0);
  const tower = battle.place(hero, 'gunner', 2, 4);
  eq(tower.level, 1);
  hero.xp = xpForLevel(12);
  battle._grant(tower, 0);
  eq(tower.level, 12);
  ok(tower.p.ricochet > 0, 'приём десятого уровня');
});

test('бой: каждый класс без ошибок отбивает волны и получает опыт', () => {
  for (const cls of CLASSES) {
    const battle = makeBattle();
    const tower = cls.rider ? battle.placeRider(player(xpForLevel(100)), cls.id)
      : battle.place(player(xpForLevel(100)), cls.id, 3, 4);
    if (cls.rider) battle.placeRider(player(xpForLevel(100)), cls.id);
    else battle.place(player(xpForLevel(100)), cls.id, 3, 6);
    battle.place(player(xpForLevel(100)), 'gunner', 4, 4);
    for (let wave = 1; wave <= 10; wave++) {
      battle.startWave(wave, 2);
      finish(battle);
      battle.endWave();
    }
    ok(tower.run.xp > 0, cls.id);
    if (cls.id !== 'banner' && cls.id !== 'sage') ok(tower.run.damage > 0, cls.id);
  }
});

const special = (battle, type, id, hp = 1000) => {
  const kind = (type === 'boss' ? BOSSES : ELITES).find((k) => k.id === id);
  return battle._spawn({ type, hp, kind }, 5);
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

test('мобы: новые виды появляются со своей волны, летучие летают', () => {
  const early = makeBattle();
  early.startWave(1, 3);
  for (const s of early.spawns) ok(!s.look.from || s.look.from <= 1, s.look.id);
  const looks = new Set();
  for (let wave = 21; wave <= 30; wave++) {
    for (let seed = 1; seed <= 3; seed++) {
      const battle = makeBattle({ random: seeded(seed) });
      battle.startWave(wave, 3);
      for (const s of battle.spawns) if (s.look) looks.add(s.look.id);
    }
  }
  for (const id of ['crow', 'hellhound', 'demon']) ok(looks.has(id), id);
  for (const id of ['skeleton', 'imp', 'bat']) ok(looks.has(id), id);
  const battle = makeBattle(), flyer = walker(battle, 2, 100, bat());
  ok(flyer.flying);
  eq(flyer.look, 'bat');
});

test('маг земли: стена держит мобов, пока её не разобьют; летучих не держит', () => {
  const battle = makeBattle(), mage = battle.place(player(xpForLevel(5)), 'earth', 10, 4);
  battle.startWave(1, 1);
  battle.spawns = [];
  runFor(battle, 1.2);
  eq(battle.walls.length, 1, 'стена поставлена');
  const wall = battle.walls[0];
  ok(Math.abs(wall.x - mage.cx) <= mage.range + 0.5, 'рядом с магом');
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

test('минёр: мины копятся до предела и рвутся под мобом, летучих не замечают', () => {
  const battle = makeBattle(), miner = battle.place(player(xpForLevel(5)), 'miner', 10, 4);
  ok(miner.p.mineCap >= 20 && miner.p.passive, 'копит не меньше двадцати и не стреляет');
  runFor(battle, 70);
  eq(battle.mines.length, miner.p.mineCap);
  for (const mine of battle.mines) ok(Math.hypot(mine.x - miner.cx, mine.y - miner.cy) <= miner.range + 0.5);
  miner.busy = 1e9;
  const flyer = walker(battle, 0, 1e6, bat());
  for (let i = 0; i < 600 && flyer.d < 18; i++) battle.step(TICK);
  eq(battle.mines.length, miner.p.mineCap, 'летучая прошла, мины целы');
  const mob = walker(battle, 0, 1e6);
  for (let i = 0; i < 600 && mob.d < 18; i++) battle.step(TICK);
  ok(battle.mines.length < miner.p.mineCap, 'мины сработали');
  ok(mob.hp < mob.max);
  ok(battle.events.some((e) => e.kind === 'mine'));
});

test('минёр: с десятого уровня кидает мину в моба на любом конце поля, даже когда мин полно', () => {
  const battle = makeBattle(), miner = battle.place(player(xpForLevel(30)), 'miner', 10, 4);
  ok(miner.p.toss > 0);
  runFor(battle, 90);
  eq(battle.mines.length, miner.p.mineCap, 'мин полно');
  const far = walker(battle, 18, 1e6), flyer = walker(battle, 1, 1e6, bat());
  far.holdUntil = flyer.holdUntil = 1e9;
  for (let i = 0; i < 400 && (far.hp === far.max || flyer.hp === flyer.max); i++) battle.step(TICK);
  ok(battle.events.some((e) => e.kind === 'toss'));
  ok(far.hp < far.max, 'досталось дальнему');
  ok(flyer.hp < flyer.max, 'брошенная мина задевает и летучих');
  eq(battle.mines.length, miner.p.mineCap, 'свои мины целы');
  eq(miner.run.kills + miner.run.assists, 0);
  ok(miner.run.damage > 0);
});

test('минёр: вместо мины изредка летит ядерная бомба — медленно, и рвётся там, где цель', () => {
  const battle = makeBattle(), miner = battle.place(player(xpForLevel(60)), 'miner', 10, 4);
  eq(miner.p.nuke, 0.01, 'один шанс из ста');
  miner.p = Object.assign({}, miner.p, { nuke: 1 });
  const target = walker(battle, 15, 1e6);
  target.holdUntil = 1e9;
  for (let i = 0; i < 400 && !battle.tosses.length; i++) battle.step(TICK);
  const toss = battle.tosses[0];
  eq(toss.kind, 'nuke');
  ok(Math.abs(toss.at - battle.time - NUKE_FLIGHT) < TICK * 1.5 && NUKE_FLIGHT >= 6, 'летит долго');
  ok(battle.events.some((e) => e.kind === 'toss' && e.mine === 'nuke' && e.time === NUKE_FLIGHT));
  runFor(battle, NUKE_FLIGHT + TICK);
  ok(battle.events.some((e) => e.kind === 'nuke' && Math.abs(e.x - target.x) < 1e-9));
});

test('минёр: ядерка убивает обычных в трёх клетках, крупных ранит, оглушает защитников и боссов рядом', () => {
  const battle = makeBattle(), miner = battle.place(player(xpForLevel(60)), 'miner', 10, 4);
  const near = battle.place(player(), 'gunner', 5, 4), far = battle.place(player(), 'gunner', 15, 4);
  const place = (mob, d) => {
    mob.d = d;
    battle._locate(mob);
    return mob;
  };
  const close = walker(battle, 4), distant = walker(battle, 12);
  const elite = place(special(battle, 'elite', 'vampire', 1000), 5);
  const boss = place(special(battle, 'boss', 'butcher', 1e4), 6);
  battle._nuke(miner, 5.5, 5.5);
  ok(close.dead, 'обычный рядом погиб');
  no(distant.dead, 'дальний цел');
  no(elite.dead);
  ok(elite.hp <= elite.max * 0.7, 'элитный сильно ранен');
  ok(boss.hp < boss.max && !boss.dead);
  ok(boss.holdUntil >= battle.time + NUKE_STUN - 1e-9, 'босс оглушён');
  ok(near.stunUntil >= battle.time + NUKE_STUN - 1e-9 && near.busy >= near.stunUntil, 'защитник рядом оглушён');
  eq([miner.stunUntil, far.stunUntil], [0, 0], 'дальние — нет');
});

test('паразит: на старте, цепляется к самому крепкому, после убийства прыгает на следующего', () => {
  const battle = makeBattle(), bug = battle.placeRider(player(xpForLevel(20)), 'parasite');
  eq([bug.x, bug.y], battle.path[0]);
  eq(battle.byCell.size, 0, 'клетку не занимает');
  no(battle.move(bug, 3, 4));
  const weak = walker(battle, 6, 50), strong = walker(battle, 2, 500);
  battle.step(TICK);
  eq(bug.host, strong);
  runFor(battle, bug.p.leap + 0.1);
  eq([bug.cx, bug.cy], [strong.x, strong.y], 'сидит на нём');
  ok(strong.hp < strong.max, 'грызёт');
  eq(weak.hp, weak.max);
  battle._hurt(strong, 1e6, bug);
  battle.step(TICK);
  eq(bug.host, weak);
  ok(battle.events.some((e) => e.kind === 'leap' && e.mob === weak));
  runFor(battle, bug.p.leap + 0.1);
  battle._hurt(weak, 1e6, bug);
  const spot = [weak.x, weak.y];
  runFor(battle, 1);
  eq(bug.host, null);
  eq([bug.cx, bug.cy], spot, 'ждёт там, где убил');
});

test('паразит: смертельный укус с пятидесятого уровня, кроме боссов', () => {
  const battle = makeBattle(), bug = battle.placeRider(player(xpForLevel(50)), 'parasite');
  ok(bug.p.oneshot >= 0.01 && bug.p.oneshot < 0.02);
  bug.p = Object.assign({}, bug.p, { oneshot: 0.6, crit: 0 });
  battle.random = () => 0.4;
  const boss = special(battle, 'boss', 'butcher', 1e6), elite = special(battle, 'elite', 'knight', 1e6);
  ATTACK(battle, bug, boss);
  ok(boss.hp > boss.max * 0.99, 'у босса шанс вдвое ниже');
  ATTACK(battle, bug, elite);
  ok(elite.dead, 'элитного можно');
  battle.random = () => 0.2;
  ATTACK(battle, bug, boss);
  ok(boss.dead, 'босса — реже, но тоже можно');
});

test('огнемётчик: жжёт конусом в сторону цели, за спиной никого не трогает', () => {
  const battle = makeBattle(), pyro = battle.place(player(xpForLevel(5)), 'pyro', 10, 4);
  const front = walker(battle, 12, 1e6), back = walker(battle, 10, 1e6);
  ok(pyro.p.cone > 0 && pyro.p.cone <= 0.45, 'конус узкий');
  ok(pyro.p.interval <= 0.25, 'пламя идёт без остановки');
  battle._fire(pyro, battle.time);
  ok(front.hp < front.max && front.burn, 'цель горит');
  eq(back.hp, back.max, 'за спиной не горит');
  ok(battle.events.some((e) => e.kind === 'flame' && Math.abs(e.angle) < 0.8));
  const burnt = front.max - front.hp;
  front.x += 5;
  runFor(battle, 1);
  ok(front.max - front.hp > burnt * 2, 'и выгорает после');
});

test('оружие: особые свойства легендарного работают', () => {
  const battle = makeBattle(), t = battle.place(player(), 'gunner', 2, 4);
  const use = (unique) => battle.setMods(t, { damage: 0, rate: 0, range: 0, crit: 0, xp: 0, coins: 0, unique });
  use('ignite');
  const a = walker(battle, 2, 1e6);
  battle._unique(t, a, 10, battle.time);
  ok(a.burn && a.burn.has('unique'));
  use('frostbite');
  battle._unique(t, a, 10, battle.time);
  ok(a.slowUntil > battle.time && a.slow > 0);
  use('reaper');
  const b = walker(battle, 2, 100);
  b.hp = 5;
  battle._unique(t, b, 1, battle.time);
  ok(b.dead);
  use('breaker');
  const knight = special(battle, 'elite', 'knight');
  battle._hurt(knight, 100, t);
  ok(knight.max - knight.hp > 100, 'броня не помогает, по элитным сильнее');
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

test('знаменосец и мудрец: знамя — быстрее и дальше всем рядом, мудрец вдохновляет одного соседа', () => {
  const battle = makeBattle(), banner = battle.place(player(), 'banner', 5, 3);
  const ally = battle.place(player(), 'gunner', 6, 4), plain = battle.place(player(), 'gunner', 15, 3);
  battle.step(TICK);
  ok(ally.range > plain.range * 1.1, 'знамя даёт дальность');
  ok(ally.buff.haste > 0);
  const quiet = makeBattle(), young = quiet.place(player(xpForLevel(5)), 'sage', 10, 4);
  quiet.place(player(), 'gunner', 11, 4);
  quiet.step(TICK);
  eq(young.muses.length, 0, 'до десятого уровня не вдохновляет');
  const field = makeBattle(), sage = field.place(player(xpForLevel(12)), 'sage', 10, 4);
  const a = field.place(player(), 'gunner', 11, 4), b2 = field.place(player(), 'gunner', 9, 4);
  const far = field.place(player(), 'gunner', 18, 3);
  field.step(TICK);
  field.step(TICK);
  ok(sage.muses[0] === a || sage.muses[0] === b2, 'вдохновлён сосед');
  const lucky = sage.muses[0], other = lucky === a ? b2 : a;
  ok(lucky.buff.damage >= sage.p.muse && lucky.buff.haste >= sage.p.muse && lucky.buff.range >= sage.p.muse);
  eq(other.buff.damage, 0, 'только один');
  eq(far.buff.damage, 0);
  const seen = new Set();
  for (let i = 0; i < 12; i++) {
    runFor(field, 5);
    seen.add(sage.muses[0]);
  }
  eq(seen.size, 2, 'цель меняется');
});

test('мудрец: с пятидесятого уровня добавочный опыт уходит и вдохновлённому', () => {
  const battle = makeBattle(), sage = battle.place(player(xpForLevel(55)), 'sage', 10, 4);
  const ally = battle.place(player(), 'gunner', 11, 4);
  battle.step(TICK);
  battle.step(TICK);
  ok(sage.muses[0] === ally);
  ok(sage.p.share);
  const before = ally.player.xp;
  battle._grant(sage, 10);
  ok(ally.player.xp - before >= 10 * sage.buff.xp - 1e-9, 'получил добавочный опыт мудреца');
});

test('ледяной маг: вышедший из ауры моб ещё несколько секунд идёт медленнее', () => {
  const battle = makeBattle(), frost = battle.place(player(), 'frost', 10, 4);
  frost.busy = 1e9;
  const mob = walker(battle, 10, 1e6);
  battle.step(TICK);
  ok(mob.chill > 0);
  mob.d = 17;
  battle._locate(mob);
  runFor(battle, 1);
  ok(mob.slowUntil > battle.time && mob.slow > 0, 'след холода держится');
  runFor(battle, frost.p.linger);
  ok(mob.slowUntil <= battle.time);
});

test('маг земли: босс грызёт стену быстрее обычного моба', () => {
  const battle = makeBattle(), mage = battle.place(player(xpForLevel(5)), 'earth', 10, 4);
  battle.startWave(10, 1);
  battle.spawns = [];
  runFor(battle, 1.2);
  const wall = battle.walls[0];
  mage.busy = 1e9;
  const before = wall.hp;
  battle._batter(wall, walker(battle, 2, 100), 1, battle.time);
  const byZombie = before - wall.hp;
  battle._batter(wall, special(battle, 'boss', 'butcher', 1e6), 1, battle.time);
  ok(before - byZombie - wall.hp > byZombie * 5, 'босс — в разы сильнее');
});

const lookOf = (id) => Object.values(LOOKS).flat().find((look) => look.id === id);
const typeOf = (id) => Object.keys(LOOKS).find((type) => LOOKS[type].some((look) => look.id === id));
const creature = (battle, id, d = 5, hp = 1e6) => battle._spawn({ type: typeOf(id), look: lookOf(id), hp }, d);

test('элементали: своя стихия их не берёт, остальное — как обычно', () => {
  const battle = makeBattle();
  const pyro = battle.place(player(xpForLevel(5)), 'pyro', 3, 4), gunner = battle.place(player(), 'gunner', 3, 6);
  const frost = battle.place(player(), 'frost', 5, 4), alchemist = battle.place(player(), 'alchemist', 5, 6);
  const thunder = battle.place(player(), 'thunder', 7, 4);
  const ember = creature(battle, 'ember'), ice = creature(battle, 'frostling'), sludge = creature(battle, 'sludge');
  const storm = creature(battle, 'stormling');
  battle._hurt(ember, 50, pyro);
  battle._ignite(ember, pyro, pyro, 10, 3);
  eq(ember.hp, ember.max, 'огонь не берёт');
  no(ember.burn);
  battle._hurt(ember, 50, gunner);
  ok(ember.hp < ember.max, 'пули берут');
  battle._poison(sludge, alchemist, alchemist, 10, 3, 3);
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

test('слизни: большой делится на двух средних, те — на маленьких; король — на двух больших', () => {
  const battle = makeBattle(), t = battle.place(player(), 'gunner', 3, 4);
  battle.startWave(30, 3);
  battle.spawns = [];
  const big = creature(battle, 'slime3', 8, 10);
  battle._hurt(big, 100, t);
  battle.step(TICK);
  let pieces = battle.mobs.filter((m) => m.split);
  eq(pieces.map((m) => m.look), ['slime2', 'slime2']);
  for (const piece of pieces) battle._hurt(piece, 1e9, t);
  battle.step(TICK);
  pieces = battle.mobs.filter((m) => m.split);
  eq(pieces.map((m) => m.look), ['slime1', 'slime1', 'slime1', 'slime1']);
  for (const piece of pieces) battle._hurt(piece, 1e9, t);
  battle.step(TICK);
  eq(battle.mobs.filter((m) => m.split).length, 0, 'маленькие умирают насовсем');
  const king = special(battle, 'elite', 'slimeking', 10);
  battle._hurt(king, 1e9, t);
  battle.step(TICK);
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

test('алхимик: кидает зелье, на дороге лужа; в ней травятся, выйдя — ещё немного, летучие — нет', () => {
  const battle = makeBattle(), alchemist = battle.place(player(), 'alchemist', 10, 4);
  const mob = walker(battle, 11, 1e6), flyer = walker(battle, 11, 1e6, bat());
  mob.holdUntil = flyer.holdUntil = 1e9;
  ok(battle._fire(alchemist, battle.time));
  alchemist.busy = 1e9;
  eq(mob.hp, mob.max, 'зелье ещё летит');
  runFor(battle, 0.7);
  eq(battle.puddles.length, 1);
  ok(mob.poison, 'в луже травится');
  no(flyer.poison, 'летучих не травит');
  mob.holdUntil = 0;
  mob.d = 17;
  battle._locate(mob);
  mob.holdUntil = 1e9;
  runFor(battle, alchemist.p.linger - 0.3);
  ok(mob.poison, 'выйдя, ещё отравлен');
  runFor(battle, 1);
  no(mob.poison);
});

test('лекарь: святым светом бьёт только нежить', () => {
  const battle = makeBattle(), healer = battle.place(player(), 'healer', 10, 4);
  const rat = creature(battle, 'rat', 11);
  rat.holdUntil = 1e9;
  no(battle._fire(healer, battle.time), 'крысу не бьёт');
  const zombie = creature(battle, 'zombie', 10);
  ok(zombie.undead);
  ok(battle._fire(healer, battle.time));
  ok(zombie.hp < zombie.max);
  eq(rat.hp, rat.max);
});

test('охотник: ставит капканы, капкан держит и ранит; из арбалета бьёт всех, крупных — первыми и сильнее', () => {
  const battle = makeBattle(), hunter = battle.place(player(), 'hunter', 10, 4);
  runFor(battle, 12);
  eq(battle.traps.length, hunter.p.traps);
  const plain = walker(battle, 9, 1e6);
  plain.holdUntil = 1e9;
  ok(battle._fire(hunter, battle.time), 'по обычным тоже стреляет');
  const weak = plain.max - plain.hp;
  ok(weak > 0);
  const knight = special(battle, 'elite', 'vampire', 1e6);
  knight.d = 11;
  battle._locate(knight);
  ok(battle._target(hunter) === knight, 'элитный — в первую очередь, хоть и позади');
  hunter.mods = Object.assign({}, hunter.mods, { crit: 0 });
  battle._fire(hunter, battle.time);
  ok(knight.max - knight.hp > weak * hunter.p.bigMul * 0.9, 'по крупным — с умножением');
  plain.holdUntil = 0;
  const trap = battle.traps[0];
  plain.d = trap.i + 1;
  battle._locate(plain);
  const before = plain.hp;
  battle.step(TICK);
  ok(plain.holdUntil > battle.time, 'попался');
  ok(plain.hp < before);
  eq(battle.traps.length, hunter.p.traps - 1);
});

test('шаман: вихрь катится назад и уносит мобов, боссов только тормозит', () => {
  const battle = makeBattle(), shaman = battle.place(player(), 'shaman', 10, 4);
  const mob = walker(battle, 11, 1e6), boss = special(battle, 'boss', 'butcher', 1e6);
  boss.d = 11.2;
  battle._locate(boss);
  battle._fire(shaman, battle.time);
  shaman.busy = 1e9;
  runFor(battle, shaman.p.whirlTime);
  ok(mob.d < 11, 'унесло назад');
  ok(boss.d >= 11.2, 'босса не уносит');
});

test('ледяной маг: морозная волна бьёт всех вокруг', () => {
  const battle = makeBattle(), frost = battle.place(player(), 'frost', 10, 4);
  const mobs = [walker(battle, 9, 1e6), walker(battle, 11, 1e6), walker(battle, 12, 1e6)];
  battle._fire(frost, battle.time);
  for (const mob of mobs) ok(mob.hp < mob.max);
  ok(battle.events.some((e) => e.kind === 'nova'));
});

test('снайпер: пуля прошивает всех на линии за целью', () => {
  const battle = makeBattle(), sniper = battle.place(player(), 'sniper', 2, 5 - 1);
  sniper.cx = 0.5;
  sniper.cy = 5.5;
  const near = walker(battle, 3, 1e6), far = walker(battle, 5, 1e6), strong = walker(battle, 4, 2e6);
  battle._fire(sniper, battle.time);
  ok(strong.hp < strong.max, 'цель');
  ok(far.hp < far.max, 'за целью');
  eq(near.hp, near.max, 'перед целью — нет');
});

test('знаменосец: не стреляет, только ускоряет', () => {
  const battle = makeBattle(), banner = battle.place(player(), 'banner', 10, 4);
  walker(battle, 11, 1e6);
  runFor(battle, 3);
  eq(banner.run.damage, 0);
  ok(banner.p.passive);
});

test('снайпер: сперва летучих, потом самого крепкого', () => {
  const battle = makeBattle(), sniper = battle.place(player(), 'sniper', 10, 4);
  const strong = walker(battle, 10, 1e6), flyer = walker(battle, 12, 100, bat());
  ok(battle._target(sniper) === flyer);
  flyer.dead = true;
  ok(battle._target(sniper) === strong);
});

test('скелеты: встают после смерти с полным здоровьем, лекарь упокаивает насовсем', () => {
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
  const healer = battle.place(player(), 'healer', 4, 4), other = creature(battle, 'skeleton', 6, 100);
  battle._hurt(other, 1e6, healer);
  runFor(battle, 2);
  eq(battle.mobs.filter((m) => m.look === 'skeleton').length, 0, 'упокоен лекарем');
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
  const shade = special(battle, 'elite', 'shade', 1e6);
  shade.d = 10;
  battle._locate(shade);
  shade.powerUntil = battle.time + 2;
  eq(battle._target(sniper), null, 'невидимую не видно');
  shade.powerUntil = 0;
  ok(battle._target(sniper) === shade);
  const golem = special(battle, 'elite', 'golem', 1e6);
  battle._hold(golem, 3, sniper);
  battle._slow(golem, 0.5, 3);
  battle._push(golem, 2, sniper);
  eq(golem.holdUntil, 0);
  eq(golem.slow, 0);
  eq(golem.pushed, 0);
  const witch = special(battle, 'elite', 'witch', 1e6);
  witch.d = 10;
  battle._locate(witch);
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

test('паразит: верхом на мобе получает ауры соседей — ускорение знамени и опыт мудреца', () => {
  const battle = makeBattle(), bug = battle.placeRider(player(xpForLevel(20)), 'parasite');
  const banner = battle.place(player(xpForLevel(20)), 'banner', 6, 4);
  const sage = battle.place(player(xpForLevel(20)), 'sage', 6, 6);
  const host = walker(battle, 6, 1e6);
  host.holdUntil = 1e9;
  runFor(battle, bug.p.leap + 0.3);
  ok(bug.host === host, 'сидит на нём');
  ok(bug.buff.haste > 0, 'знамя ускоряет');
  ok(bug.buff.xp > 0, 'мудрец даёт опыт');
  ok(banner.player && sage.player);
  host.holdUntil = 0;
  host.d = 18;
  battle._locate(host);
  host.holdUntil = 1e9;
  runFor(battle, 0.3);
  eq([bug.buff.haste, bug.buff.xp], [0, 0], 'уехал из аур');
});

test('мины и капканы сверх предела заменяют старые, стена обновляется только после передышки', () => {
  const battle = makeBattle(), miner = battle.place(player(xpForLevel(5)), 'miner', 10, 4);
  runFor(battle, 90);
  eq(battle.mines.length, miner.p.mineCap);
  const oldest = battle.mines[0];
  runFor(battle, miner.p.mineEvery + 0.1);
  eq(battle.mines.length, miner.p.mineCap);
  no(battle.mines.includes(oldest), 'старая заменена новой');
  const field = makeBattle(), mage = field.place(player(xpForLevel(5)), 'earth', 10, 4);
  runFor(field, 1.2);
  const wall = field.walls[0];
  wall.hp = wall.max / 2;
  wall.hitAt = field.time;
  mage.nextWall = field.time;
  field.step(TICK);
  ok(field.walls.includes(wall), 'под ударами не меняется');
  wall.hitAt = field.time - 3.1;
  mage.nextWall = field.time;
  field.step(TICK);
  no(field.walls.includes(wall), 'после передышки — новая');
  eq(field.walls[0].hp, field.walls[0].max);
});

test('каменный маг перебежал — новая стена встаёт сразу, старая убрана', () => {
  const battle = makeBattle(), mage = battle.place(player(xpForLevel(5)), 'earth', 10, 4);
  runFor(battle, 1.2);
  const old = battle.walls[0], spot = battle.bestCell(mage.range);
  ok(old);
  ok(battle.move(mage, spot.x, spot.y));
  eq(battle.walls.filter((wall) => wall.tower === mage).length, 1);
  const wall = battle.walls[0];
  no(wall === old, 'стена новая');
  ok(battle._inReach(mage, wall.i), 'рядом с новым местом');
  eq(wall.hp, wall.max);
});

test('затянувшаяся волна: через две минуты после последнего моба выжившие звереют и идут сквозь стены', () => {
  const battle = makeBattle();
  battle.place(player(xpForLevel(5)), 'earth', 10, 4);
  runFor(battle, 1.2);
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

test('лекарь чинит каменные стены рядом, но не под ударами', () => {
  const battle = makeBattle();
  battle.place(player(xpForLevel(5)), 'earth', 10, 4);
  runFor(battle, 1.2);
  const wall = battle.walls[0];
  battle.place(player(), 'healer', Math.floor(wall.x), 6);
  wall.hp = wall.max / 2;
  runFor(battle, 2);
  ok(wall.hp > wall.max / 2);
  wall.hp = wall.max / 2;
  wall.hitAt = battle.time;
  runFor(battle, 1);
  eq(wall.hp, wall.max / 2, 'под ударами не чинит');
});

const withUnique = (unique) => ({ damage: 0, rate: 0, range: 0, crit: 0, power: 0, xp: 0, coins: 0, unique });
const ownersOf = (u) => CLASSES.filter((cls) => u.cls ? cls.id === u.cls : !u.role || cls.role === u.role);
const placeAs = (battle, cls, level = 1) => (cls.rider ? battle.placeRider(player(xpForLevel(level)), cls.id)
  : battle.place(player(xpForLevel(level)), cls.id, 3, 4));

test('оружие: каждое свойство класса и роли меняет то, что обещает', () => {
  for (const u of UNIQUES.filter((item) => item.cls || item.role)) {
    for (const cls of ownersOf(u)) {
      const battle = makeBattle(), t = placeAs(battle, cls), base = Object.assign({}, t.p);
      battle.setMods(t, withUnique(u.id));
      for (const [key, value] of Object.entries(u.mul || {})) {
        ok(typeof base[key] === 'number' && Math.abs(t.p[key] - base[key] * value) < 1e-9, u.id + ' ' + key);
      }
      for (const [key, value] of Object.entries(u.add || {})) {
        ok(key in base && Math.abs(t.p[key] - (base[key] + value)) < 1e-9, u.id + ' ' + key);
      }
      for (const [key, value] of Object.entries(u.set || {})) eq(t.p[key], value, u.id + ' ' + key);
    }
  }
});

test('оружие: со свойством класса или роли каждый класс без ошибок отбивает волны', () => {
  for (const u of UNIQUES.filter((item) => item.cls || item.role)) {
    for (const cls of ownersOf(u)) {
      if (u.attack && !cls.hits) continue;
      const battle = makeBattle(), t = placeAs(battle, cls, 100);
      battle.setMods(t, Object.assign(withUnique(u.id), u.mods || {}));
      battle.place(player(xpForLevel(100)), 'gunner', 4, 4);
      for (let wave = 4; wave <= 5; wave++) {
        battle.startWave(wave, 2);
        finish(battle);
        battle.endWave();
      }
      ok(t.run.xp > 0, u.id + ' ' + cls.id);
      if (cls.id !== 'banner' && cls.id !== 'sage') ok(t.run.damage > 0, u.id + ' ' + cls.id);
    }
  }
});

test('оружие: шрапнель задевает летучих, уязвимость и оковы — всех, кого задел маг', () => {
  const battle = makeBattle(), miner = battle.place(player(), 'miner', 3, 4);
  const flyer = walker(battle, 4, 1e6, bat());
  battle._detonate(miner, flyer.x, flyer.y, 'strong', false, battle.time);
  eq(flyer.hp, flyer.max, 'без шрапнели летучих мины не задевают');
  battle.setMods(miner, withUnique('shrapnel'));
  battle._detonate(miner, flyer.x, flyer.y, 'strong', false, battle.time);
  ok(flyer.hp < flyer.max, 'со шрапнелью задевают');
  const mage = battle.place(player(), 'frost', 6, 4), gun = battle.place(player(), 'gunner', 6, 6);
  battle.setMods(mage, withUnique('expose'));
  const mob = walker(battle, 7, 1e6);
  battle._hurt(mob, 1, mage);
  const before = mob.hp;
  battle._hurt(mob, 100, gun);
  ok(Math.abs(before - mob.hp - 115) < 1e-6, 'задетый магом получает на 15% больше: ' + (before - mob.hp));
  battle.time += 3.1;
  const later = mob.hp;
  battle._hurt(mob, 100, gun);
  ok(Math.abs(later - mob.hp - 100) < 1e-6, 'через 3 секунды — как обычно');
  battle.setMods(mage, withUnique('fetters'));
  const held = walker(battle, 8, 1e6);
  battle._hold(held, 1, mage);
  ok(Math.abs(held.holdUntil - battle.time - 1.5) < 1e-9, 'задержки на 50% дольше');
  let caught = 0;
  for (let i = 0; i < 200; i++) {
    const other = walker(battle, 9, 1e6);
    battle._hurt(other, 1, mage);
    if (other.holdUntil > battle.time) caught += 1;
  }
  ok(caught > 10 && caught < 40, 'примерно каждого восьмого задержал: ' + caught);
});

test('оружие: оберег защищает соседей от оглушения и паутины, казна прибавляет монет', () => {
  const battle = makeBattle(), banner = battle.place(player(), 'banner', 5, 3);
  const sniper = battle.place(player(), 'sniper', 6, 4), far = battle.place(player(), 'sniper', 15, 3);
  battle.setMods(banner, withUnique('ward'));
  battle._refreshAuras();
  const witch = special(battle, 'elite', 'witch', 1e6);
  witch.d = 7;
  battle._locate(witch);
  battle._hex(witch, POWERS.hex);
  eq(sniper.stunUntil, 0, 'сосед знаменосца не оглушён');
  battle._web(witch, POWERS.web);
  eq(sniper.webUntil, 0, 'и не опутан');
  witch.d = 16;
  battle._locate(witch);
  battle._hex(witch, POWERS.hex);
  ok(far.stunUntil > battle.time, 'далёкого оглушают как обычно');
  battle.setMods(banner, withUnique('tithe'));
  battle._refreshAuras();
  const mob = walker(battle, 7, 10), coins = sniper.player.coins;
  battle._hurt(mob, 1e6, sniper);
  eq(sniper.player.coins - coins, Math.round(KILL_COINS * mob.info.coins * 1.3), 'соседу +30% монет');
});

test('оружие: сила приёма и легендарное свойство класса меняют сам приём', () => {
  const battle = makeBattle(), mage = battle.place(player(), 'earth', 10, 4);
  const plain = mage.p.wallHp;
  battle.setMods(mage, { damage: 0, rate: 0, range: 0, crit: 0, power: 0.5, xp: 0, coins: 0, unique: null });
  ok(Math.abs(mage.p.wallHp - plain * 1.5) < 1e-9, 'сила приёма — прочность стен');
  battle.setMods(mage, { damage: 0, rate: 0, range: 0, crit: 0, power: 0, xp: 0, coins: 0, unique: 'granite' });
  ok(Math.abs(mage.p.wallHp - plain * 2) < 1e-9, 'Гранит — вдвое прочнее');
  const banner = battle.place(player(), 'banner', 3, 4), aura = banner.p.aura;
  battle.setMods(banner, { damage: 0, rate: 0, range: 1, crit: 0, power: 0, xp: 0, coins: 0, unique: null });
  eq(banner.p.aura, aura + 1, 'радиус — у ауры');
});

test('новые мобы: воришка крадёт монеты, добивший забирает украденное', () => {
  const battle = makeBattle();
  const rich = battle.place(player(), 'banner', 6, 4);
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

test('новые мобы: призрак бесплотен — урон вдвое слабее, свет лекаря — полностью', () => {
  const battle = makeBattle();
  const gun = battle.place(player(), 'gunner', 3, 4);
  const healer = battle.place(player(), 'healer', 3, 6);
  const ghost = creature(battle, 'ghost', 5);
  ok(ghost.undead);
  ghost.phaseUntil = 1e9;
  battle._hurt(ghost, 100, gun);
  ok(Math.abs(1e6 - ghost.hp - 50) < 1e-6);
  const hp = ghost.hp;
  battle._hurt(ghost, 100, healer);
  ok(Math.abs(hp - ghost.hp - 100) < 1e-6);
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
  battle.mines.push({ tower: gun, i: 4, x: worm.x, y: worm.y, kind: 'strong' });
  battle.step(TICK);
  eq(battle.mines.length, 1, 'под землёй мины не рвёт');
  worm.powerAt = battle.time;
  battle.step(TICK);
  eq(battle.mines.length, 0, 'вынырнул — проглотил');
  ok(battle._target(gun) === worm);
  const sky = makeBattle(), a = sky.place(player(), 'gunner', 7, 4), b = sky.place(player(), 'gunner', 9, 3);
  const c = sky.place(player(), 'gunner', 2, 9), dragon = special(sky, 'boss', 'dragon', 1000);
  ok(dragon.flying);
  sky.mines.push({ tower: a, i: 5, x: 6, y: 5, kind: 'strong' });
  dragon.powerAt = sky.time;
  sky.step(TICK);
  ok(a.stunUntil > sky.time && b.stunUntil > sky.time, 'на линии оглушены');
  ok(c.stunUntil <= sky.time, 'в стороне — нет');
  eq(sky.mines.length, 0, 'мина на линии сгорела');
  sky._hurt(dragon, 100, a, 'fire');
  eq(dragon.hp, 950, 'огонь вдвое слабее');
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

test('карта: с вышки бьют на 2,5 клетки дальше и поверх гор, на вышке — один защитник', () => {
  const battle = mapWith({ watch: [[6, 3]], mountain: [[6, 4]] });
  const plain = battle.place(player(), 'sniper', 12, 3), high = battle.place(player(), 'sniper', 6, 3);
  ok(Math.abs(high.range - plain.range - TERRAIN.watch) < 1e-9, 'дальше на ' + TERRAIN.watch);
  no(battle.free(6, 3), 'вышка занята');
  const below = walker(battle, 7, 1e6);
  ok(battle.covered(6.5, 4.5) && battle.sees(high, below), 'гора между ними не мешает');
  const banner = battle.place(player(), 'banner', 8, 3), aura = banner.p.aura;
  battle.move(banner, 8, 4);
  battle.move(high, 7, 3);
  battle.move(banner, 6, 3);
  ok(Math.abs(banner.p.aura - aura - TERRAIN.watch) < 1e-9, 'и аура шире');
  battle.move(banner, 8, 3);
  ok(Math.abs(banner.p.aura - aura) < 1e-9, 'сошёл — как было');
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
  open.d = 30;
  battle._locate(open);
  eq(battle._target(gun), null, 'за горой не видно');
  hidden.d = 30;
  battle._locate(hidden);
  const deep = walker(battle, 1.6, 1e6);
  deep.holdUntil = 1e9;
  const near = battle.place(player(), 'gunner', 1, 4);
  eq(battle._target(near), null, 'в тоннеле не видно');
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
  const hit = (biome, cls) => {
    const battle = mapWith({}, biome), t = battle.place(player(), cls, 3, 4), mob = walker(battle, 4, 1e6);
    battle._hurt(mob, 100, t);
    return mob.max - mob.hp;
  };
  eq(hit('volcano', 'frost'), 100 * TERRAIN.weak);
  eq(hit('volcano', 'pyro'), 100);
  eq(hit('snow', 'pyro'), 100 * TERRAIN.weak);
  eq(hit('grass', 'frost'), 100);
  const battle = mapWith({}, 'volcano'), mob = walker(battle, 4, 1e6);
  battle._slow(mob, 0.5, 2, 'ice');
  eq(mob.slow, 0.5 * TERRAIN.weak, 'и замедляет слабее');
});

test('биомы: в болоте ходячие медленнее и их больше, в пустыне — летучие', () => {
  const count = (biome, wave, test) => {
    const battle = mapWith({}, biome);
    battle.startWave(wave, 4);
    return battle.spawns.filter((spawn) => test(Boolean((spawn.kind || spawn.look || {}).flying))).length;
  };
  ok(count('swamp', 12, (fly) => !fly) > count('grass', 12, (fly) => !fly), 'ходячих больше');
  ok(count('desert', 12, (fly) => fly) > count('grass', 12, (fly) => fly), 'летучих больше');
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
  const bug = battle.placeRider(player(xpForLevel(20)), 'parasite');
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
  const first = battle.placeRider(player(xpForLevel(20)), 'parasite');
  const second = battle.placeRider(player(xpForLevel(20)), 'parasite');
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
    mob.d = d;
    battle._locate(mob);
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
