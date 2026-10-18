import { test, eq, ok, no } from './harness.js';
import { PLAIN, makeGame, memoryStorage, runFor, seeded, until } from './fixtures.js';
import { CARD_MIN, CARD_ROOM, CARD_TIME, OVER_TIME, Profiles, QUICK_PAUSE, QUICK_WAVE, SPIN_LIMIT, nextReset }
  from '../../site/js/engine.js';
import { TICK, xpForLevel } from '../../site/js/balance.js';
import { PRICE, RARITIES, SHOW_FAST, SHOW_TIME, SPIN_TIME, WEAPONS, makeWeapon, weaponName }
  from '../../site/js/gacha.js';
import { ODDS, effectOf, rollEvent } from '../../site/js/events.js';
import { cellName } from '../../site/js/field.js';

const MOD = { mod: true };
const say = (game, user, text, details = {}) => game.feed(user, text, Object.assign({ login: user.toLowerCase() },
  details));
const event = (kind, id) => Object.assign({ kind }, effectOf(kind, id));

function drop(game, login, weapon) {
  const slot = { id: 99, login, outcome: { kind: 'weapon', weapon }, phase: 'spin', left: 0 };
  const free = game.slots.indexOf(null);
  game.slots[free >= 0 ? free : 0] = slot;
  game._apply(slot);
  return slot;
}

function toWave(game) {
  ok(until(game, () => game.state === 'wave', 600), 'дождались волны');
}

function nearPath(game, tower) {
  return game.battle.road.some(([x, y]) => (x - tower.x) ** 2 + (y - tower.y) ** 2 <= 1.5 * 1.5);
}

test('игра: лобби, карта, подготовка, волна, снова подготовка', () => {
  const { game } = makeGame();
  ok(game.open());
  eq(game.state, 'lobby');
  eq(game.left, PLAIN.lobby);
  eq(say(game, 'Анна', 'привет'), null);
  ok(game.members.get('анна').cls, 'вступила, просто написав');
  runFor(game, PLAIN.lobby - 1);
  eq(game.state, 'lobby');
  runFor(game, 1.1);
  eq(game.state, 'placing');
  ok(game.battle);
  const tower = game.members.get('анна').tower;
  ok(tower, 'стоит на поле');
  ok(nearPath(game, tower), 'у дорожки');
  runFor(game, PLAIN.first_wave);
  eq(game.state, 'wave');
  eq(game.wave, 1);
  ok(until(game, () => game.state === 'break'));
  eq(game.left, PLAIN.wave_pause);
  runFor(game, PLAIN.wave_pause + 0.1);
  eq(game.state, 'wave');
  eq(game.wave, 2);
});

test('игра: волна кончилась быстрее десяти секунд после последнего моба — следующая через пять секунд', () => {
  const { game } = makeGame({ settings: { wave_pause: 20 } });
  game.open();
  say(game, 'Анна', 'привет');
  toWave(game);
  const finish = (since) => {
    const battle = game.battle;
    battle.spawns = [];
    battle.mobs = [];
    battle.births = [];
    battle.lastSpawn = battle.time - since;
    game.step(TICK);
    eq(game.state, 'break');
  };
  finish(QUICK_WAVE - 1);
  eq(game.left, QUICK_PAUSE, 'простая волна — короткий перерыв');
  runFor(game, QUICK_PAUSE + 0.1);
  eq(game.state, 'wave');
  finish(QUICK_WAVE + 1);
  eq(game.left, 20, 'долгая — обычный');
});

test('игра: любое сообщение в любой момент — сразу на поле у дорожки, второй раз не дублирует', () => {
  const { game } = makeGame();
  game.open();
  toWave(game);
  say(game, 'Боря', 'всем привет');
  const member = game.members.get('боря');
  ok(member.tower);
  ok(game.battle.towers.includes(member.tower));
  ok(nearPath(game, member.tower));
  say(game, 'Боря', 'ещё раз');
  eq(game.battle.towers.length, 1);
});

test('игра: при старте все встают в случайные клетки у дорожки', () => {
  const spots = new Set();
  for (let seed = 1; seed <= 4; seed++) {
    const { game } = makeGame({ seed });
    game.open();
    for (let i = 0; i < 6; i++) say(game, 'Игрок' + i, 'го');
    ok(until(game, () => game.state === 'placing'));
    for (const member of game.members.values()) {
      ok(nearPath(game, member.tower));
      spots.add(seed + ':' + member.tower.x + ',' + member.tower.y);
    }
  }
  eq(spots.size, 24, 'все клетки разные');
});

test('игра: клетка в чате переводит защитника, на дорогу нельзя', () => {
  let game = null;
  for (let seed = 1; !game; seed++) {
    const made = makeGame({ seed }).game;
    made.open();
    say(made, 'Вика', 'привет');
    ok(until(made, () => made.state === 'placing'));
    if (!made.members.get('вика').tower.rider) game = made;
  }
  const free = game.battle.bestCell(2.5);
  eq(say(game, 'Вика', cellName(free.x, free.y).toLowerCase()), 'move');
  const tower = game.members.get('вика').tower;
  eq([tower.x, tower.y], [free.x, free.y]);
  const [px, py] = game.battle.path[3];
  eq(say(game, 'Вика', cellName(px, py)), null, 'на дорогу нельзя');
  eq([tower.x, tower.y], [free.x, free.y]);
});

test('игра: перебежка во время волны ждёт подготовки, в подготовку — сразу', () => {
  const { game } = makeGame();
  game.open();
  say(game, 'Гена', 'я тут');
  toWave(game);
  const tower = game.members.get('гена').tower, spot = game.battle.bestCell(2.5);
  eq(say(game, 'Гена', cellName(spot.x, spot.y)), 'later');
  ok(tower.x !== spot.x || tower.y !== spot.y, 'пока волна — стоит');
  eq(game.members.get('гена').pendingMove, { x: spot.x, y: spot.y });
  eq(say(game, 'Дина', cellName(spot.x, spot.y)), 'later', 'новичок встаёт сам, а перебежит после волны');
  ok(game.members.get('дина').tower, 'но в отряд вступила');
  ok(until(game, () => game.state === 'break'));
  eq([tower.x, tower.y], [spot.x, spot.y], 'после волны перебежал');
  eq(game.members.get('гена').pendingMove, null);
  const free = game.battle.bestCell(2.5);
  eq(say(game, 'Гена', cellName(free.x, free.y)), 'move', 'в подготовку можно');
});

test('игра: в лобби клетка ничего не двигает, но в отряд принимает', () => {
  const { game } = makeGame();
  game.open();
  eq(say(game, 'Гоша', 'к7'), null);
  ok(game.members.has('гоша'));
});

test('игра: паразит не встаёт на клетку и не переставляется', () => {
  const { game } = makeGame();
  game.open();
  say(game, 'Жук', 'привет');
  game.members.get('жук').cls = 'parasite';
  ok(until(game, () => game.state === 'placing'));
  const tower = game.members.get('жук').tower;
  ok(tower.rider);
  eq([tower.x, tower.y], game.battle.path[game.battle.gate], 'ждёт у выхода из пещеры');
  no(game.battle.covered(tower.cx, tower.cy), 'не в горе');
  const free = game.battle.bestCell(2.5);
  eq(say(game, 'Жук', cellName(free.x, free.y)), null);
  no(game.battle.byCell.has(free.y * 20 + free.x));
});

test('гача: команда без восклицательного знака, оружие под класс игрока', () => {
  const { game } = makeGame();
  game.open();
  say(game, 'Нина', 'привет');
  toWave(game);
  const member = game.members.get('нина');
  member.coins = 60;
  eq(say(game, 'Нина', 'гача'), 'queued');
  game.step(TICK);
  const slot = game.slots[0];
  eq(slot.login, 'нина');
  ok(['weapon', 'void', 'coins'].includes(slot.outcome.kind));
  if (slot.outcome.kind === 'weapon') eq(slot.outcome.weapon.cls, member.cls);
  for (const cls of Object.keys(WEAPONS)) {
    ok(weaponName(makeWeapon(() => 0.5, cls, RARITIES[3])).endsWith(WEAPONS[cls]), cls);
  }
});

test('гача: «!гача» тоже работает, старых команд больше нет', () => {
  const { game } = makeGame();
  game.open();
  toWave(game);
  say(game, 'Олег', 'тут');
  game.members.get('олег').coins = 100;
  eq(say(game, 'Олег', '!гача'), 'queued');
  for (const old of ['!играть', '!взять', '!оставить', '!я', 'взять', 'скип']) {
    eq(say(game, 'Олег', old), null, old);
  }
});

test('игра: опыт сохраняется между играми, после игры отряд пустеет, класс выпадает заново', () => {
  const storage = memoryStorage();
  const { game, profiles } = makeGame({ storage });
  game.open();
  say(game, 'Даша', 'привет');
  toWave(game);
  ok(until(game, () => game.state === 'break'));
  const member = game.members.get('даша');
  ok(member.xp > 0);
  const saved = new Profiles(storage, 'chatoborona.players.test');
  eq(saved.get('даша').xp, Math.round(member.xp * 100) / 100);
  const classes = new Set();
  for (let i = 0; i < 12; i++) {
    game.restart();
    eq(game.members.size, 0, 'отряд пуст до первого сообщения');
    say(game, 'Даша', 'снова я');
    classes.add(game.members.get('даша').cls);
    eq(game.members.get('даша').xp, member.xp, 'опыт тот же');
  }
  ok(classes.size > 3, 'классы меняются');
  eq(profiles.get('даша').xp, member.xp);
});

test('игра: поражение — итоги, рекорд, через время новое лобби', () => {
  const { game, profiles } = makeGame();
  game.open();
  toWave(game);
  ok(until(game, () => game.state === 'over', 4 * 3600), 'без защитников база падает');
  ok(game.results);
  eq(game.results.passed, game.wave - 1);
  eq(profiles.best.waves, game.results.passed);
  say(game, 'Поздний', 'ой, всё');
  no(game.members.has('поздний'), 'после поражения не вступить');
  runFor(game, OVER_TIME + 0.1);
  eq(game.state, 'lobby');
  eq(game.games, 2);
});

test('гача: без монет нельзя, крутят трое сразу, место — сперва тому, кто не крутит, докупка — в конец очереди', () => {
  const { game } = makeGame();
  game.open();
  for (const name of ['Ева', 'Жора', 'Зина', 'Ия']) say(game, name, 'привет');
  toWave(game);
  eq(say(game, 'Ева', 'гача'), 'poor');
  ok(game.notes.some((n) => n.kind === 'poor' && n.login === 'ева'));
  for (const login of ['ева', 'жора', 'зина', 'ия']) game.members.get(login).coins = 500;
  eq(say(game, 'Ева', 'гача 2'), 'queued');
  for (const name of ['Жора', 'Зина', 'Ия']) eq(say(game, name, 'гача'), 'queued');
  eq(game.members.get('ева').coins, 500 - 2 * PRICE, 'монеты списаны сразу');
  game.step(TICK);
  eq(game.slots.map((slot) => slot && slot.login), ['ева', 'жора', 'зина'], 'места — сперва тем, кто не крутит');
  const queue = () => game.queue.map((entry) => [entry.login, entry.count]);
  eq(queue(), [['ева', 1], ['ия', 1]]);
  eq(say(game, 'Ева', 'гача'), 'queued', 'пока крутится — можно ещё');
  eq(queue(), [['ева', 1], ['ия', 1], ['ева', 1]], 'докупка — новой записью в конец');
  runFor(game, SPIN_TIME - 0.2);
  eq(game.slots[0].phase, 'spin');
  runFor(game, 0.4);
  eq(game.slots[0].phase, 'show');
  const kind = game.slots[0].outcome.kind;
  eq(game.slots[0].took, kind !== 'void', 'оружие надето или монеты удвоены, пустота — ничего');
  runFor(game, SHOW_FAST + 0.2);
  eq(game.slots.map((slot) => slot && slot.login), ['ева', 'ия', 'ева'], 'освободились места — крутят ждавшие');
});

test('гача: один игрок занимает все свободные места, за раз — не больше пяти круток', () => {
  const { game } = makeGame();
  game.open();
  say(game, 'Ося', 'привет');
  toWave(game);
  const member = game.members.get('ося');
  member.coins = PRICE * 3 + 10;
  eq(say(game, 'Ося', 'гача 3'), 'queued');
  eq(say(game, 'Ося', 'гача'), 'poor', 'на четвёртую не хватает');
  game.step(TICK);
  eq(game.slots.map((slot) => slot && slot.login), ['ося', 'ося', 'ося']);
  eq(game.queue.length, 0);
  member.coins = PRICE * 100;
  eq(say(game, 'Ося', 'гача 9'), 'queued');
  eq(game.queue.map((entry) => entry.count), [SPIN_LIMIT]);
});

test('гача: та же редкость или выше — меняется само, ниже — остаётся своё; без оружия надевается любое', () => {
  const { game } = makeGame();
  game.open();
  say(game, 'Зоя', 'привет');
  toWave(game);
  const member = game.members.get('зоя'), make = (i) => makeWeapon(seeded(i + 1), member.cls, RARITIES[i]);
  const first = make(0), mythic = make(2), common = make(0), other = make(2), legendary = make(4);
  ok(drop(game, 'зоя', first).took);
  eq(member.weapon, first);
  ok(drop(game, 'зоя', mythic).took);
  eq(member.weapon, mythic);
  ok(Object.keys(mythic.stats).some((key) => member.tower.mods[key] !== 0), 'свойства дошли до бойца');
  game.events.length = 0;
  const slot = drop(game, 'зоя', common);
  no(slot.took);
  eq(member.weapon, mythic);
  eq(slot.phase, 'show');
  ok(game.events.some((e) => e.kind === 'kept' && e.login === 'зоя'));
  ok(drop(game, 'зоя', other).took, 'та же редкость меняется');
  eq(member.weapon, other);
  ok(drop(game, 'зоя', legendary).took);
  ok(legendary.unique, 'у легендарного есть особое свойство');
  eq(member.tower.unique, legendary.unique);
  runFor(game, SHOW_TIME + 0.2);
  eq(game.slots.filter(Boolean).length, 0, 'места освободились');
});

test('события: перед каждой волной может выпасть одно на всех, доли как заявлены', () => {
  const random = seeded(11), counts = new Map();
  for (let i = 0; i < 20000; i++) {
    const rolled = rollEvent(random), kind = rolled ? rolled.kind : null;
    counts.set(kind, (counts.get(kind) || 0) + 1);
    if (rolled) ok(effectOf(rolled.kind, rolled.id), rolled.id);
  }
  for (const odd of ODDS) {
    const share = (counts.get(odd.kind) || 0) / 20000;
    ok(Math.abs(share - odd.chance) < 0.01 + odd.chance * 0.15, odd.kind + ' ' + share);
  }
  const { game } = makeGame();
  game.open();
  ok(until(game, () => game.state === 'placing'));
  let seen = 0;
  for (let i = 0; i < 40; i++) {
    game.events.length = 0;
    game._planEvent();
    ok(game.run.next.length <= 1);
    seen += game.run.next.length;
    eq(game.events.filter((e) => e.kind === 'event').length, game.run.next.length);
  }
  ok(seen > 15, 'события выпадают');
});

test('события: бафф действует на всех и только в свою волну', () => {
  const { game } = makeGame();
  game.open();
  say(game, 'Ира', 'привет');
  say(game, 'Ян', 'привет');
  ok(until(game, () => game.state === 'placing'));
  game.run.next = [event('buff', 'fury')];
  for (const m of game.members.values()) eq(m.tower.mods.damage, 0, 'не сразу');
  toWave(game);
  for (const m of game.members.values()) eq(m.tower.mods.damage, 0.3);
  eq(game.run.now.map((e) => e.id), ['fury']);
  ok(until(game, () => game.state === 'break'));
  for (const m of game.members.values()) eq(m.tower.mods.damage, 0);
  eq(game.run.now, []);
});

test('события: сонливость — первые секунды волны не стреляет никто', () => {
  const { game } = makeGame();
  game.open();
  say(game, 'Кира', 'привет');
  say(game, 'Лиза', 'привет');
  ok(until(game, () => game.state === 'placing'));
  game.run.next = [event('debuff', 'sleep')];
  toWave(game);
  for (const m of game.members.values()) ok(m.tower.busy >= game.battle.time + 4.9);
});

test('события: благословение — всем до конца игры, в новой игре его нет', () => {
  const { game } = makeGame();
  game.open();
  say(game, 'Лёва', 'привет');
  say(game, 'Майя', 'привет');
  ok(until(game, () => game.state === 'placing'));
  game.run.next = [event('blessing', 'wrath')];
  toWave(game);
  for (const m of game.members.values()) eq(m.tower.mods.damage, 0.2);
  ok(until(game, () => game.state === 'break'));
  for (const m of game.members.values()) eq(m.tower.mods.damage, 0.2, 'и после волны');
  const lives = game.battle.lives;
  game._lasting(event('curse', 'breach'));
  eq(game.battle.lives, lives - 3);
  game.restart();
  say(game, 'Лёва', 'снова');
  const lev = game.members.get('лёва');
  eq(lev.weapon, null);
  eq(lev.coins, 0);
  ok(until(game, () => game.state === 'placing'));
  eq(lev.tower.mods.damage, 0);
  eq(game.battle.lives, 20);
});

test('события: проклятие не опускает жизни ниже одной', () => {
  const { game } = makeGame();
  game.open();
  toWave(game);
  game.battle.lives = 2;
  game._lasting(event('curse', 'breach'));
  eq(game.battle.lives, 1);
});

test('команды стримера: только модераторам и только с включённой галочкой', () => {
  const { game } = makeGame();
  game.open();
  eq(say(game, 'Олег', '!чатоборона-пауза'), null);
  no(game.paused);
  eq(say(game, 'Олег', '!чатоборона-пауза', MOD), 'pause');
  ok(game.paused);
  const left = game.left;
  runFor(game, 5);
  eq(game.left, left, 'на паузе время стоит');
  eq(say(game, 'Олег', '!ЧАТОБОРОНА-ПАУЗА', MOD), 'pause');
  no(game.paused);
  eq(say(game, 'Олег', '!чатоборона-дальше', MOD), 'next');
  game.step(TICK * 2);
  eq(game.state, 'placing');
  game.configure(Object.assign({}, game.s, { chat_commands: false }));
  eq(say(game, 'Олег', '!чатоборона-пауза', MOD), null);
});

test('команды стримера: сброс обнуляет уровни и рекорд', () => {
  const { game, profiles } = makeGame();
  game.open();
  say(game, 'Петя', 'привет');
  game.members.get('петя').xp = xpForLevel(30);
  toWave(game);
  eq(game.members.get('петя').tower.level, 30);
  profiles.best = { waves: 9, at: 1, players: 3 };
  eq(say(game, 'Стример', '!чатоборона-сброс', MOD), 'reset');
  eq(game.members.get('петя').xp, 0);
  eq(game.members.get('петя').tower.level, 1);
  eq(profiles.best.waves, 0);
});

test('чат: боты не играют, обычное сообщение — не команда', () => {
  const { game } = makeGame();
  game.open();
  eq(say(game, 'Nightbot', 'гача'), null);
  eq(game.members.size, 0);
  eq(say(game, 'Тоня', 'первое'), null);
  ok(game.members.has('тоня'), 'но в отряд вступила');
});

test('профиль показывает карточку игрока секунд десять', () => {
  const { game } = makeGame();
  game.open();
  say(game, 'Уля', 'привет');
  game.events.length = 0;
  eq(say(game, 'Уля', 'профиль'), 'card');
  ok(game.notes.some((n) => n.kind === 'card' && n.login === 'уля'));
  ok(game.events.some((e) => e.kind === 'card' && e.login === 'уля'));
  runFor(game, 10);
  ok(game.notes.some((n) => n.kind === 'card'), 'через 10 секунд ещё видна');
  eq(say(game, 'Федя', 'Профиль'), 'card', 'новичок вступает и сразу видит карточку');
});

test('сброс по расписанию: раз в день в заданный час', () => {
  const base = new Date(2026, 9, 14, 12, 0, 0).getTime() / 1000;
  eq(nextReset(base, 'day', 6), new Date(2026, 9, 15, 6).getTime() / 1000);
  eq(nextReset(base, 'week', 6), new Date(2026, 9, 19, 6).getTime() / 1000);
  eq(nextReset(base, 'month', 6), new Date(2026, 10, 1, 6).getTime() / 1000);
  eq(nextReset(base, 'timer', 0, 5), base + 5 * 3600);
  eq(nextReset(base, 'never'), null);
  const { game, clock, profiles } = makeGame({ settings: { reset_mode: 'timer', reset_hours: 1 }, at: base });
  game.open();
  say(game, 'Яна', 'привет');
  game.members.get('яна').xp = 50;
  game._saveAll();
  clock.t = base + 3601;
  game.step(TICK);
  eq(game.members.get('яна').xp, 0);
  eq(profiles.since, base + 3601);
});

test('гача: пустота ничего не даёт, удвоение — возвращает потраченное вдвое', () => {
  const { game } = makeGame();
  game.open();
  say(game, 'Ося', 'привет');
  toWave(game);
  const member = game.members.get('ося');
  member.coins = 70;
  const empty = { id: 1, login: 'ося', outcome: { kind: 'void' }, phase: 'spin', left: 0 };
  game.slots[0] = empty;
  game._apply(empty);
  eq(member.coins, 70);
  eq(member.weapon, null);
  const lucky = { id: 2, login: 'ося', outcome: { kind: 'coins' }, phase: 'spin', left: 0 };
  game.slots[1] = lucky;
  game._apply(lucky);
  eq(member.coins, 70 + PRICE * 2);
  eq(lucky.coins, PRICE * 2);
});

test('улучшить: за 100 монет +20% к случайному свойству, без оружия и без денег — нельзя', () => {
  const { game } = makeGame();
  game.open();
  say(game, 'Рита', 'привет');
  toWave(game);
  const member = game.members.get('рита');
  member.coins = 500;
  eq(say(game, 'Рита', 'улучшить'), 'poor', 'без оружия нечего улучшать');
  ok(game.notes.some((n) => n.kind === 'bare'));
  member.weapon = makeWeapon(seeded(3), member.cls, RARITIES[2]);
  game._refresh(member);
  const before = JSON.stringify(member.tower.mods);
  eq(say(game, 'Рита', 'улучшить'), 'upgraded');
  eq(member.coins, 400);
  ok(Object.keys(member.weapon.ups).length === 1);
  ok(JSON.stringify(member.tower.mods) !== before, 'свойство дошло до бойца');
  member.coins = 50;
  eq(say(game, 'Рита', '!улучшить'), 'poor');
  ok(game.notes.some((n) => n.kind === 'poor' && n.detail.price === 100));
});

test('за пройденную волну всем — монеты и опыт', () => {
  const { game } = makeGame();
  game.open();
  say(game, 'Тёма', 'привет');
  toWave(game);
  const member = game.members.get('тёма');
  ok(until(game, () => game.state === 'break'));
  game.events.length = 0;
  runFor(game, PLAIN.wave_pause + 0.1);
  member.tower.busy = 1e9;
  const coins = member.coins, xp = member.xp;
  ok(until(game, () => game.state === 'break' || game.state === 'over', 3600));
  if (game.state === 'break') {
    const cleared = game.events.find((e) => e.kind === 'cleared');
    ok(cleared && cleared.coins > 0 && cleared.xp > 0);
    ok(member.coins >= coins + cleared.coins);
    ok(member.xp >= xp + cleared.xp);
  }
});

test('число и «все» в команде: «гача 3», «гача все» — до пяти, «улучшить 5», «улучшить всё» — на все монеты', () => {
  const { game } = makeGame();
  game.open();
  say(game, 'Гена', 'привет');
  toWave(game);
  const gena = game.members.get('гена'), queue = () => game.queue.map((entry) => entry.count);
  gena.coins = PRICE * 3 + 10;
  eq(say(game, 'Гена', 'гача 3'), 'queued');
  eq([queue(), gena.coins], [[3], 10]);
  gena.coins = PRICE * 2;
  eq(say(game, 'Гена', 'гача 5'), 'queued', 'сколько хватило');
  eq(queue(), [3, 2], 'новой записью, а не к старой');
  gena.coins = PRICE * 7;
  eq(say(game, 'Гена', 'гача все'), 'queued');
  eq([queue(), gena.coins], [[3, 2, 5], PRICE * 2]);
  eq(say(game, 'Гена', '!гача всё'), 'queued');
  eq([queue(), gena.coins], [[3, 2, 5, 2], 0]);
  gena.weapon = makeWeapon(seeded(3), gena.cls, RARITIES[2]);
  gena.coins = 550;
  eq(say(game, 'Гена', 'улучшить 5'), 'upgraded');
  eq(gena.coins, 50);
  const note = game.notes.find((n) => n.kind === 'upgrade' && n.login === 'гена');
  eq(note.detail.times, 5);
  eq(note.detail.ups.map((up) => up.id).sort(), Object.keys(gena.weapon.ups).sort(), 'в карточке все улучшения');
  gena.coins = 350;
  eq(say(game, 'Гена', 'улучшить всё'), 'upgraded');
  eq(gena.coins, 50);
  eq(say(game, 'Гена', 'улучшить 3'), 'poor');
});

test('профиль: две карточки сразу, третья ждёт десять секунд старшей; нет места — одна; «проф» — короткая', () => {
  const { game } = makeGame();
  game.open();
  for (const name of ['Аня', 'Боря', 'Вика', 'Гоша']) say(game, name, 'привет');
  toWave(game);
  const shown = () => game.notes.filter((n) => n.kind === 'card').map((n) => [n.login, n.detail.brief]);
  eq(game.cardRoom, CARD_ROOM);
  eq(say(game, 'Аня', 'профиль'), 'card');
  eq(say(game, 'Боря', 'проф'), 'card');
  eq(say(game, 'Вика', 'профиль'), 'card');
  eq(shown(), [['аня', false], ['боря', true]], 'двое сразу, Вика ждёт');
  runFor(game, CARD_MIN - 1);
  eq(shown(), [['аня', false], ['боря', true]]);
  runFor(game, 1.2);
  eq(shown(), [['боря', true], ['вика', false]], 'уходит только старшая — по одной на каждого ждущего');
  game.cardRoom = 1;
  game.step(TICK);
  eq(shown(), [['боря', true]], 'места на одну — младшая вернулась в очередь');
  say(game, 'Гоша', 'проф');
  game.step(TICK);
  eq(shown(), [['вика', false]], 'Боря своё отвисел — сразу следующая');
  runFor(game, CARD_MIN + 0.2);
  eq(shown(), [['гоша', true]]);
  runFor(game, CARD_TIME);
  eq(shown(), [], 'очередь пуста — карточка уходит в своё время');
});

test('реролл: один раз за игру и только до первой волны, на поле — новый класс на той же клетке', () => {
  const { game } = makeGame();
  game.open();
  say(game, 'Рома', 'привет');
  const member = game.members.get('рома'), first = member.cls;
  eq(say(game, 'Рома', 'реролл'), 'reroll');
  ok(member.cls !== first);
  eq(say(game, 'Рома', 'реролл'), null, 'второй раз нельзя');
  const other = makeGame().game;
  other.open();
  say(other, 'Лиза', 'привет');
  ok(until(other, () => other.state === 'placing'));
  const lisa = other.members.get('лиза');
  const tower = lisa.tower;
  const cell = tower.rider ? null : [tower.x, tower.y];
  eq(say(other, 'Лиза', 'реролл'), 'reroll');
  ok(lisa.tower && lisa.tower.cls.id === lisa.cls, 'новый защитник нового класса');
  if (cell && !lisa.tower.rider) eq([lisa.tower.x, lisa.tower.y], cell, 'на той же клетке');
  toWave(other);
  say(other, 'Ян', 'привет');
  eq(say(other, 'Ян', 'реролл'), null, 'после начала волн нельзя');
});

test('стример переставляет защитников «А1 Б2»; зрителям так нельзя', () => {
  const { game } = makeGame({ settings: { channel: 'streamer' } });
  game.open();
  say(game, 'Гоша', 'привет');
  say(game, 'Гоша', 'привет');
  ok(until(game, () => game.state === 'placing'));
  const gosha = game.members.get('гоша');
  if (gosha.tower.rider) return;
  const tower = gosha.tower, spot = game.battle.bestCell(2.5);
  const order = cellName(tower.x, tower.y) + ' ' + cellName(spot.x, spot.y);
  eq(say(game, 'Гоша', order), null, 'зрителю нельзя');
  eq(game.feed('Streamer', order, { login: 'streamer' }), 'move');
  eq([tower.x, tower.y], [spot.x, spot.y]);
  toWave(game);
  const next = game.battle.bestCell(2.5);
  const late = cellName(tower.x, tower.y) + ' ' + cellName(next.x, next.y);
  eq(game.feed('Streamer', late, { login: 'streamer' }), 'later');
  eq(gosha.pendingMove, { x: next.x, y: next.y });
});

test('команда !чатоборона: правила на экране и пауза, «!чатоборона-пауза» продолжает; зрителям нельзя', () => {
  const { game } = makeGame();
  game.open();
  say(game, 'Аня', 'привет');
  toWave(game);
  eq(say(game, 'Аня', '!чатоборона'), null, 'зрителю нельзя');
  no(game.paused);
  eq(say(game, 'Мод', '!чатоборона', MOD), 'rules');
  ok(game.paused && game.rulesShown, 'игра стоит, правила на экране');
  eq(say(game, 'Мод', '!чатоборона-пауза', MOD), 'pause');
  ok(!game.paused && !game.rulesShown, 'игра идёт, правила убраны');
  game.pause();
  no(game.rulesShown, 'обычная пауза — без правил');
});
