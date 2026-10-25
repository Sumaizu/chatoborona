import { test, eq, ok, no } from './harness.js';
import { PLAIN, makeGame, memoryStorage, runFor, seeded, until } from './fixtures.js';
import { ASCEND_TIME, CARD_MIN, CARD_ROOM, OVER_TIME, Profiles, QUICK_PAUSE, QUICK_WAVE, SPEED_MAX,
  SPIN_LIMIT, SUMMIT_EVERY, SUMMIT_TIME, SUPPORTS, SUPPORT_EVERY, TIP_LEVEL, TIP_TIME, nextReset }
  from '../../site/js/engine.js';
import { FAMILY_BY_ID, LEVEL_MAX, MIGHT, REWARD, TICK, waveReward, xpForLevel } from '../../site/js/balance.js';
import { ASCEND_AT, EXTRA_SLOTS, PRICE, QUEUE_CAP, RARITIES, RUSH, SHOW_FAST, SHOW_TIME, SLOTS, SPIN_TIME, ascend,
  makeWeapon, weaponName } from '../../site/js/gacha.js';
import { CLASSES, CLASS_BY_ID } from '../../site/js/classes.js';
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
    const tower = made.members.get('вика').tower;
    if (!tower.rider && !tower.cocoon) game = made;
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

test('игра: паразит встаёт коконом на случайную клетку у дороги, переставить его нельзя', () => {
  const { game } = makeGame();
  game.open();
  say(game, 'Жук', 'привет');
  game.members.get('жук').cls = 'parasite';
  ok(until(game, () => game.state === 'placing'));
  const tower = game.members.get('жук').tower, spot = [tower.x, tower.y];
  ok(tower.cocoon > 0 && !tower.rider, 'кокон');
  ok(nearPath(game, tower), 'у дороги');
  ok(game.battle.towerAt(tower.x, tower.y) === tower, 'занимает клетку');
  const free = game.battle.bestCell(2.5);
  eq(say(game, 'Жук', cellName(free.x, free.y)), null);
  eq([tower.x, tower.y], spot, 'остался на месте');
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
  ok(['weapon', 'void', 'handful', 'bag', 'chest', 'particle', 'rune'].includes(slot.outcome.kind));
  if (slot.outcome.kind === 'weapon') eq(slot.outcome.weapon.cls, member.cls);
  for (const cls of CLASSES) {
    ok(weaponName(makeWeapon(() => 0.5, cls.id, RARITIES[3])).endsWith(cls.weapon), cls.id);
  }
  ok(weaponName(makeWeapon(() => 0.5, 'earth', RARITIES[4])).startsWith('Легендарная'), 'каменная рука — она');
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

test('гача: в очереди у игрока не больше пяти круток, монеты за лишние не списываются; длинная очередь крутится быстрее', () => {
  const { game } = makeGame();
  game.open();
  for (let i = 0; i < 6; i++) say(game, 'Игрок' + i, 'привет');
  toWave(game);
  const members = Array.from(game.members.values());
  for (const member of members) member.coins = PRICE * 50;
  const first = members[0];
  game.slots = game.slots.map(() => ({ id: 0, login: 'занято', outcome: { kind: 'void' }, phase: 'show', left: 1e9 }));
  eq(say(game, first.name, 'гача 3'), 'queued');
  eq(say(game, first.name, 'гача 5'), 'queued', 'ещё две до пяти');
  eq(game.queue.reduce((sum, entry) => sum + entry.count, 0), QUEUE_CAP);
  const coins = first.coins;
  eq(say(game, first.name, 'гача'), 'full', 'шестую не берёт');
  eq(first.coins, coins, 'монеты целы');
  ok(game.notes.some((note) => note.kind === 'queue'));
  for (const member of members.slice(1)) say(game, member.name, 'гача 5');
  ok(game.pending >= RUSH.queue);
  game.slots = game.slots.map(() => null);
  game.step(TICK);
  ok(game.slots.every((slot) => slot && slot.left <= RUSH.spin), 'крутится быстрее');
});

test('гача: при очереди больше 30 круток — четвёртое окошко, больше 100 — пятое; очередь спала — лишние уходят', () => {
  const { game } = makeGame();
  game.open();
  for (let i = 0; i < 25; i++) say(game, 'Игрок' + i, 'привет');
  toWave(game);
  const members = Array.from(game.members.values());
  for (const member of members) member.coins = PRICE * 10;
  eq(game.slots.length, SLOTS);
  for (const member of members.slice(0, 7)) say(game, member.name, 'гача 5');
  game.step(TICK);
  eq(game.slots.length, SLOTS + 1, 'больше 30 — четыре окошка');
  for (const member of members.slice(7)) say(game, member.name, 'гача 5');
  game.step(TICK);
  ok(game.pending > EXTRA_SLOTS[1]);
  eq(game.slots.length, SLOTS + 2, 'больше 100 — пять');
  ok(game.slots.every(Boolean), 'все крутят');
  game.queue = [];
  ok(until(game, () => game.slots.length === SLOTS, 60), 'очередь кончилась — снова три');
});

test('гача: редкость выше — меняется само, та же — если мощь больше, ниже — остаётся своё; без оружия — любое', () => {
  const { game } = makeGame();
  game.open();
  say(game, 'Зоя', 'привет');
  toWave(game);
  const member = game.members.get('зоя'), make = (i, power) => Object.assign(makeWeapon(seeded(i + 1), member.cls,
    RARITIES[i]), power ? { power } : {});
  const first = make(0), mythic = make(2, 20), common = make(0), weaker = make(2, 15), stronger = make(2, 25);
  const legendary = make(4, 30);
  ok(drop(game, 'зоя', first).took);
  eq(member.weapon, first);
  ok(drop(game, 'зоя', mythic).took);
  eq(member.weapon, mythic);
  eq(member.tower.mods.power, mythic.power, 'мощь оружия дошла до бойца');
  eq(member.tower.might, MIGHT.base + mythic.power);
  game.events.length = 0;
  const slot = drop(game, 'зоя', common);
  no(slot.took);
  eq(member.weapon, mythic);
  eq(slot.phase, 'show');
  ok(game.events.some((e) => e.kind === 'kept' && e.login === 'зоя'));
  no(drop(game, 'зоя', weaker).took, 'та же редкость и мощь меньше — остаётся своё');
  ok(drop(game, 'зоя', stronger).took, 'та же редкость и мощь больше — меняется');
  ok(drop(game, 'зоя', legendary).took, 'редкость выше — меняется, даже если мощь меньше');
  eq(member.tower.mods.power, legendary.power);
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

test('гача: пустота ничего не даёт, мешок — монеты', () => {
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
  const lucky = { id: 2, login: 'ося', outcome: { kind: 'bag', coins: 120 }, phase: 'spin', left: 0 };
  game.slots[1] = lucky;
  game._apply(lucky);
  eq(member.coins, 70 + 120);
  eq(lucky.coins, 120);
  ok(game.events.some((e) => e.kind === 'jackpot' && e.prize === 'bag' && e.coins === 120));
});

test('улучшить: за 100 монет +' + MIGHT.upgrade + ' мощи оружию, без оружия и без денег — нельзя', () => {
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
  const power = member.weapon.power, might = member.tower.might;
  eq(say(game, 'Рита', 'улучшить'), 'upgraded');
  eq(member.coins, 400);
  eq(member.weapon.power, power + MIGHT.upgrade);
  eq(member.tower.might, might + MIGHT.upgrade, 'мощь дошла до бойца');
  eq(say(game, 'Рита', 'улучшить сила'), 'upgraded', 'лишние слова не мешают');
  member.coins = 50;
  eq(say(game, 'Рита', '!улучшить'), 'poor');
  ok(game.notes.some((n) => n.kind === 'poor' && n.detail.price === 100));
});

test('свойство легендарного действует на бойца: чаще бьёт, дальше, крит, способности, монеты', () => {
  const { game } = makeGame();
  game.open();
  say(game, 'Ося', 'привет');
  const member = game.members.get('ося');
  member.cls = 'sniper';
  toWave(game);
  game.run.now = [];
  for (const key of Object.keys(game.run.mods)) game.run.mods[key] = 0;
  game._refresh(member);
  const tower = () => member.tower, plain = { interval: tower().interval, range: tower().range,
    crit: tower().critChance, every: tower().s[2].every, coins: tower().mods.coins };
  const wear = (boon) => {
    member.weapon = Object.assign(makeWeapon(seeded(3), member.cls, RARITIES[RARITIES.length - 1]), { boon });
    game._refresh(member);
  };
  wear('rapid');
  ok(Math.abs(tower().interval - plain.interval / 1.15) < 1e-9, 'атака на 15% чаще');
  wear('long');
  ok(Math.abs(tower().range - plain.range - 0.5) < 1e-9, '+0,5 клетки');
  wear('keen');
  ok(Math.abs(tower().critChance - plain.crit - 0.1) < 1e-9, '+10% крита');
  wear('swift');
  ok(Math.abs(tower().s[2].every - plain.every / 1.15) < 1e-9, 'способности на 15% чаще');
  wear('rich');
  ok(Math.abs(tower().mods.coins - plain.coins - 0.15) < 1e-9, '+15% монет');
});

test('улучшить с числом или «все» — нужное число раз или на все монеты', () => {
  const { game } = makeGame();
  game.open();
  say(game, 'Лиза', 'привет');
  toWave(game);
  const member = game.members.get('лиза');
  member.weapon = makeWeapon(seeded(7), member.cls, RARITIES[1]);
  game._refresh(member);
  const tries = [['улучшить все', 750, 7, 50], ['!улучшить 2', 1000, 2, 800], ['улучшить 3', 330, 3, 30],
    ['улучшить всё', 260, 2, 60]];
  for (const [text, coins, times, left] of tries) {
    member.coins = coins;
    const before = member.weapon.plus, power = member.weapon.power;
    eq(say(game, 'Лиза', text), 'upgraded', text);
    eq(member.weapon.plus - before, times, text + ': сколько раз');
    eq(member.weapon.power - power, times * MIGHT.upgrade, text + ': сколько мощи');
    eq(member.coins, left, text + ': сколько монет осталось');
  }
  const note = game.notes.find((n) => n.kind === 'upgrade');
  eq([note.detail.times, note.detail.amount], [2, 2 * MIGHT.upgrade], 'в плашке — сколько раз и сколько мощи');
});

test('ускорить и замедлить: только стример и модераторы, от ×1 до ×3, игра идёт быстрее', () => {
  const { game } = makeGame();
  game.open();
  say(game, 'Зритель', 'привет');
  eq(say(game, 'Зритель', 'ускорить'), null, 'зрителю нельзя');
  eq(game.speed, 1);
  eq(say(game, 'Мод', 'ускорить', MOD), 'faster');
  eq(say(game, 'Мод', '!чатоборона-ускорить', MOD), 'faster');
  eq(game.speed, SPEED_MAX);
  eq(say(game, 'Мод', 'ускорить', MOD), null, 'быстрее ×3 не бывает');
  const left = game.left;
  game.step(1);
  ok(Math.abs(left - game.left - SPEED_MAX) < 0.06, 'за секунду прошло три');
  eq(say(game, 'Мод', '!замедлить', MOD), 'slower');
  eq(game.speed, 2);
  game.restart();
  eq(game.speed, 2, 'скорость остаётся и в новой игре');
});

test('каждая сотая волна — победа: минута на экране, сама заканчивается, «!чатоборона-дальше» — ещё сто волн', () => {
  const { game } = makeGame();
  game.open();
  say(game, 'Вера', 'привет');
  toWave(game);
  game.wave = SUMMIT_EVERY;
  game.battle.spawns = [];
  game.battle.mobs = [];
  game.step(0.1);
  eq(game.state, 'summit', 'после сотой волны — победа');
  ok(game.events.some((e) => e.kind === 'summit' && e.wave === SUMMIT_EVERY));
  ok(Math.abs(game.left - SUMMIT_TIME) < 0.2, 'минута');
  eq(say(game, 'Вера', '!чатоборона-дальше'), null, 'зрителю нельзя');
  eq(say(game, 'Мод', '!чатоборона-дальше', MOD), 'next');
  eq(game.state, 'break', 'игра идёт дальше');
  ok(until(game, () => game.state === 'wave'));
  eq(game.wave, SUMMIT_EVERY + 1);
  const other = makeGame().game;
  other.open();
  say(other, 'Гена', 'привет');
  toWave(other);
  other.wave = SUMMIT_EVERY * 2;
  other.battle.spawns = [];
  other.battle.mobs = [];
  other.step(0.1);
  eq(other.state, 'summit');
  runFor(other, SUMMIT_TIME + 0.2);
  ok(other.state === 'over' || other.state === 'ascend', 'не продолжили — итоги');
  ok(other.results.victory && other.results.passed === SUMMIT_EVERY * 2, 'все двести волн засчитаны');
});

test('подсказки новичкам: при входе, на 50 монетах — «гача», с оружием и 100 монетами — «улучшить»; по одной', () => {
  const { game } = makeGame();
  game.open();
  game.profiles.data.set('вера', { name: 'Вера', xp: xpForLevel(TIP_LEVEL), kills: 0, assists: 0 });
  for (const name of ['Аня', 'Вера', 'Боря']) say(game, name, 'привет');
  const tips = () => game.notes.filter((n) => n.kind === 'tip').map((n) => [n.login, n.detail.tip]);
  runFor(game, 0.6);
  eq(tips(), [['аня', 'hello']], 'по одной: сначала Аня');
  eq(game.notes.find((n) => n.kind === 'tip').detail.cls, game.members.get('аня').cls, 'с её классом');
  runFor(game, TIP_TIME);
  eq(tips(), [['боря', 'hello']], 'потом Боря; Вере (' + TIP_LEVEL + '-й уровень) — нет');
  runFor(game, TIP_TIME);
  eq(tips(), []);
  game.next();
  ok(until(game, () => game.state === 'placing'));
  const anya = game.members.get('аня'), borya = game.members.get('боря');
  borya.tipped.add('spin');
  borya.tipped.add('upgrade');
  anya.coins = PRICE;
  runFor(game, 0.6);
  eq(tips(), [['аня', 'spin']], 'накопила на крутку — «гача»');
  anya.weapon = makeWeapon(seeded(2), anya.cls, RARITIES[0]);
  anya.coins = 100;
  runFor(game, TIP_TIME);
  eq(tips(), [['аня', 'upgrade']], 'с оружием и сотней монет — «улучшить»');
  runFor(game, TIP_TIME * 2);
  eq(tips(), [], 'каждая — один раз за игру');
});

test('доход: после волны — ещё 10% от монет, что были до награды, вниз до целой монеты', () => {
  const { game } = makeGame();
  game.open();
  say(game, 'Тёма', 'привет');
  say(game, 'Яна', 'привет');
  say(game, 'Паша', 'привет');
  const tema = game.members.get('тёма'), yana = game.members.get('яна'), pasha = game.members.get('паша');
  tema.cls = 'sniper';
  yana.cls = 'gunner';
  pasha.cls = 'parasite';
  toWave(game);
  pasha.coins = 100;
  tema.coins = 205;
  yana.coins = 9;
  const reward = waveReward(game.wave).coins;
  game.events.length = 0;
  game.battle.events.length = 0;
  game._endWave();
  eq(tema.coins, 205 + reward + 20);
  eq(yana.coins, 9 + reward, 'меньше 10 монет — дохода нет');
  const cocoon = game.battle.events.find((e) => e.kind === 'cocoon' && e.tower === pasha.tower);
  ok(cocoon, 'паразит в коконе получил монеты за волну');
  eq(pasha.coins, 100 + cocoon.coins + reward + 10, 'доход — с монет до всех начислений за волну');
  eq(REWARD.income, 0.1);
  ok(game.events.some((e) => e.kind === 'cleared' && e.income === REWARD.income));
});

test('за пройденную волну всем — монеты и опыт', () => {
  const { game } = makeGame();
  game.open();
  say(game, 'Тёма', 'привет');
  toWave(game);
  const member = game.members.get('тёма');
  ok(until(game, () => game.state === 'break'));
  game.events.length = 0;
  game.run.next = [];
  game.battle.nextFamily = FAMILY_BY_ID.get('undead');
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
  eq(say(game, 'Гена', 'гача все'), 'full', 'в очереди уже пять');
  eq(gena.coins, PRICE * 7, 'монеты целы');
  game.queue = [];
  eq(say(game, 'Гена', 'гача все'), 'queued');
  eq([queue(), gena.coins], [[5], PRICE * 2]);
  game.queue = [];
  eq(say(game, 'Гена', '!гача всё'), 'queued');
  eq([queue(), gena.coins], [[2], 0]);
  gena.weapon = makeWeapon(seeded(3), gena.cls, RARITIES[2]);
  gena.coins = 550;
  eq(say(game, 'Гена', 'улучшить 5'), 'upgraded');
  eq(gena.coins, 50);
  const note = game.notes.find((n) => n.kind === 'upgrade' && n.login === 'гена');
  eq(note.detail.times, 5);
  eq(note.detail.amount, 5 * MIGHT.upgrade, 'в плашке — вся прибавка мощи');
  gena.coins = 350;
  eq(say(game, 'Гена', 'улучшить всё'), 'upgraded');
  eq(gena.coins, 50);
  eq(say(game, 'Гена', 'улучшить 3'), 'poor');
});

test('профиль: две карточки сразу, третья ждёт десять секунд старшей; без очереди висит сколько угодно; «проф» — короткая', () => {
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
  runFor(game, 600);
  eq(shown(), [['гоша', true]], 'очередь пуста — карточка висит, пока её не сменят');
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

test('улучшение до божественного: событие, свойства бойца, плашка красного цвета', () => {
  const { game } = makeGame();
  game.open();
  say(game, 'Рая', 'привет');
  toWave(game);
  const member = game.members.get('рая');
  drop(game, 'рая', makeWeapon(seeded(3), member.cls, RARITIES[RARITIES.length - 1]));
  member.coins = 100 * (ASCEND_AT - 1);
  eq(say(game, 'Рая', 'улучшить все'), 'upgraded');
  eq(member.weapon.plus, ASCEND_AT - 1);
  game.events.length = 0;
  member.coins = 100;
  eq(say(game, 'Рая', 'улучшить'), 'divine');
  eq(member.weapon.rarity, 'divine');
  ok(game.events.some((e) => e.kind === 'divine' && e.login === 'рая'));
  eq(member.tower.mods.power, member.weapon.power, 'мощь божественного дошла до бойца');
});

test('частица бога: выпадает в гаче, хранится между играми и при перезагрузке', () => {
  const storage = memoryStorage(), { game } = makeGame({ storage });
  game.open();
  say(game, 'Лия', 'привет');
  toWave(game);
  const member = game.members.get('лия');
  const slot = { id: 98, login: 'лия', outcome: { kind: 'particle' }, phase: 'spin', left: 0 };
  game.slots[0] = slot;
  game._apply(slot);
  ok(slot.took && member.particle);
  ok(game.events.some((e) => e.kind === 'particle' && e.login === 'лия'));
  game.restart();
  say(game, 'Лия', 'я тут');
  ok(game.members.get('лия').particle, 'в новой игре частица на месте');
  ok(new Profiles(storage, 'chatoborona.players.test').get('лия').particle, 'и после перезагрузки');
  game.resetScores();
  no(game.members.get('лия').particle, 'сброс уровней забирает и частицу');
});

test('руна: выпадает в гаче — одна из двух рун класса, действует сразу, в новой игре и после реролла их нет', () => {
  const { game } = makeGame();
  game.open();
  say(game, 'Рина', 'привет');
  toWave(game);
  const member = game.members.get('рина'), cls = CLASS_BY_ID.get(member.cls);
  const give = () => {
    const slot = { id: 97, login: 'рина', outcome: { kind: 'rune' }, phase: 'spin', left: 0 };
    game.slots[0] = slot;
    game._apply(slot);
    return slot;
  };
  const first = give();
  ok(first.took && cls.runes.some((rune) => rune.id === first.rune), 'руна своего класса');
  ok(game.events.some((e) => e.kind === 'rune' && e.login === 'рина'));
  eq(member.tower.mods.runes, [first.rune], 'дошла до бойца');
  ok(member.tower.runes.has(first.rune));
  const second = give();
  no(second.rune === first.rune, 'вторая — другая');
  eq(member.runes.slice().sort(), cls.runes.map((rune) => rune.id).sort(), 'собраны обе');
  no(give().took, 'третьей нет');
  game.restart();
  say(game, 'Рина', 'снова');
  eq(game.members.get('рина').runes, [], 'в новой игре рун нет');
  const other = makeGame().game;
  other.open();
  say(other, 'Лев', 'привет');
  other.members.get('лев').runes = ['twin'];
  eq(say(other, 'Лев', 'реролл'), 'reroll');
  eq(other.members.get('лев').runes, [], 'реролл забирает руны');
});

function hero(game, name, { level = LEVEL_MAX, particle = true, divine = true } = {}) {
  say(game, name, 'привет');
  const member = game.members.get(name.toLowerCase());
  member.xp = xpForLevel(level);
  member.particle = particle;
  const weapon = makeWeapon(seeded(name.length), member.cls, RARITIES[RARITIES.length - 1]);
  member.weapon = divine ? ascend(weapon) : weapon;
  return member;
}

test('парагон: сотый уровень, божественное оружие и частица — после игры парагон и снова 1-й уровень', () => {
  const storage = memoryStorage(), { game } = makeGame({ storage });
  game.open();
  const best = hero(game, 'Вера'), bare = hero(game, 'Глеб', { particle: false });
  const plain = hero(game, 'Дина', { divine: false }), young = hero(game, 'Егор', { level: 99 });
  toWave(game);
  for (const member of [best, bare, plain, young]) member.tower.run.kills = 5;
  game.battle.lives = 0;
  game.step(TICK);
  eq(game.state, 'ascend', 'перед итогами — церемония');
  eq(game.ascents.map((a) => [a.login, a.from, a.to]), [['вера', 0, 1]]);
  eq(best.paragon, 1);
  eq(best.xp, 0, 'уровень снова первый');
  no(best.particle, 'частица сгорает');
  eq([bare.paragon, plain.paragon, young.paragon], [0, 0, 0], 'без частицы, без божественного, не сотый — нет');
  eq(game.ascent.login, 'вера');
  ok(game.ascent.t < 0.1);
  runFor(game, ASCEND_TIME - 0.2);
  eq(game.state, 'ascend');
  runFor(game, 0.4);
  eq(game.state, 'over', 'потом итоги как обычно');
  const saved = new Profiles(storage, 'chatoborona.players.test').get('вера');
  eq([saved.paragon, saved.xp, saved.particle], [1, 0, false]);
  game.restart();
  say(game, 'Вера', 'снова');
  eq(game.members.get('вера').paragon, 1, 'парагон остаётся');
});

test('парагон: место в игре не важно — получают все, у кого сошлось, даже без убийств', () => {
  const { game } = makeGame();
  game.open();
  const names = ['Аня', 'Боря', 'Валя', 'Гена', 'Даня', 'Женя', 'Зоя'];
  names.map((name) => hero(game, name));
  toWave(game);
  game.battle.lives = 0;
  game.step(TICK);
  eq(game.ascents.length, names.length, 'все семеро, хотя никто никого не убил');
  eq(game.state, 'ascend');
  runFor(game, ASCEND_TIME * names.length - 0.2);
  eq(game.state, 'ascend', 'по церемонии на каждого');
  runFor(game, 0.4);
  eq(game.state, 'over');
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

test('знаменосцев и мудрецов — не больше одного на каждые 10 игроков, рерол их не добавляет; лекарей — сколько угодно', () => {
  for (let seed = 1; seed <= 6; seed++) {
    const { game } = makeGame({ seed });
    game.open();
    for (let n = 1; n <= 35; n++) {
      say(game, 'Игрок' + n, 'привет');
      for (const id of SUPPORTS) {
        const count = Array.from(game.members.values()).filter((m) => m.cls === id).length;
        ok(count <= Math.ceil(n / SUPPORT_EVERY), seed + ': ' + id + ' ×' + count + ' на ' + n);
      }
    }
  }
  const { game } = makeGame();
  game.open();
  for (let n = 1; n <= 9; n++) say(game, 'Боец' + n, 'привет');
  const members = Array.from(game.members.values());
  members[0].cls = 'banner';
  members[1].cls = 'sage';
  members[2].cls = 'healer';
  members[3].cls = 'sniper';
  const seen = new Set();
  for (let i = 0; i < 300; i++) {
    const cls = game._randomClass(members[3]);
    seen.add(cls);
    no(SUPPORTS.has(cls), 'знаменосцу и мудрецу места нет — рерол их не даёт');
    ok(cls !== 'sniper', 'рерол меняет класс');
  }
  ok(seen.has('healer'), 'второй лекарь — можно');
  eq(Array.from(SUPPORTS).sort(), ['banner', 'sage']);
});

test('стример открывает чужую карточку: «@ник профиль», «@ник проф» — короткую; зрителям так нельзя', () => {
  const { game } = makeGame({ settings: { channel: 'streamer' } });
  game.open();
  say(game, 'Гоша', 'привет');
  say(game, 'Лиза', 'привет');
  const shown = () => game.notes.filter((n) => n.kind === 'card').map((n) => [n.login, n.detail.brief]);
  eq(say(game, 'Лиза', '@Гоша профиль'), null, 'зрителю нельзя');
  eq(shown(), []);
  eq(game.feed('Streamer', '@Гоша профиль', { login: 'streamer' }), 'card');
  eq(shown(), [['гоша', false]]);
  eq(game.feed('Streamer', '@лиза, проф', { login: 'streamer' }), 'card');
  eq(shown(), [['гоша', false], ['лиза', true]]);
  eq(game.feed('Streamer', '@никого профиль', { login: 'streamer' }), null, 'такого игрока нет');
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
