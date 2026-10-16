import { test, eq, ok, no } from './harness.js';
import { PLAIN, makeGame, memoryStorage, runFor, seeded, until } from './fixtures.js';
import { OVER_TIME, Profiles, nextReset } from '../../site/js/engine.js';
import { TICK, xpForLevel } from '../../site/js/balance.js';
import { PRICE, RARITIES, SHOW_FAST, SHOW_TIME, SPIN_TIME, WEAPONS, makeWeapon, weaponName }
  from '../../site/js/gacha.js';
import { ODDS, effectOf, rollEvent } from '../../site/js/events.js';
import { cellName } from '../../site/js/field.js';

const MOD = { mod: true };
const say = (game, user, text, details = {}) => game.feed(user, text, Object.assign({ login: user.toLowerCase() },
  details));
const last = (game) => game.chat[game.chat.length - 1];
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
  return game.battle.path.some(([x, y]) => (x - tower.x) ** 2 + (y - tower.y) ** 2 <= 1.5 * 1.5);
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
  const { game } = makeGame();
  game.open();
  ok(until(game, () => game.state === 'placing'));
  const free = game.battle.bestCell(2.5);
  eq(say(game, 'Вика', cellName(free.x, free.y).toLowerCase()), 'move');
  eq([last(game).command, last(game).ok], ['move', true]);
  const tower = game.members.get('вика').tower;
  eq([tower.x, tower.y], [free.x, free.y]);
  const [px, py] = game.battle.path[3];
  eq(say(game, 'Вика', cellName(px, py)), null, 'на дорогу нельзя');
  eq([last(game).command, last(game).ok], ['move', false]);
  eq([tower.x, tower.y], [free.x, free.y]);
});

test('игра: перебежка во время волны ждёт подготовки, в подготовку — сразу', () => {
  const { game } = makeGame();
  game.open();
  say(game, 'Гена', 'я тут');
  toWave(game);
  const tower = game.members.get('гена').tower, spot = game.battle.bestCell(2.5);
  eq(say(game, 'Гена', cellName(spot.x, spot.y)), 'later');
  eq([last(game).command, last(game).ok], ['move', true]);
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
  eq([tower.x, tower.y], game.battle.path[0], 'ждёт на старте');
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
  eq([last(game).command, last(game).ok], ['spin', true]);
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
    eq(last(game).command, null, old);
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
  eq(saved.get('даша').xp, member.xp);
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

test('гача: без монет нельзя, крутят двое сразу, место — сперва тому, кто не крутит, остальные ждут', () => {
  const { game } = makeGame();
  game.open();
  for (const name of ['Ева', 'Жора', 'Зина']) say(game, name, 'привет');
  toWave(game);
  eq(say(game, 'Ева', 'гача'), 'poor');
  eq([last(game).command, last(game).ok], ['spin', false]);
  ok(game.notes.some((n) => n.kind === 'poor' && n.login === 'ева'));
  for (const login of ['ева', 'жора', 'зина']) game.members.get(login).coins = 500;
  eq(say(game, 'Ева', 'гача'), 'queued');
  eq(say(game, 'Ева', 'гача'), 'queued', 'второй раз — тоже в очередь');
  eq(say(game, 'Жора', 'гача'), 'queued');
  eq(say(game, 'Зина', 'гача'), 'queued');
  eq(game.members.get('ева').coins, 500 - 2 * PRICE, 'монеты списаны сразу');
  game.step(TICK);
  eq(game.slots.map((slot) => slot && slot.login), ['ева', 'жора'], 'второе место — тому, кто ещё не крутит');
  eq(game.queue, ['ева', 'зина']);
  eq(say(game, 'Ева', 'гача'), 'queued', 'пока крутится — можно ещё');
  runFor(game, SPIN_TIME - 0.2);
  eq(game.slots[0].phase, 'spin');
  runFor(game, 0.4);
  eq(game.slots[0].phase, 'show');
  const kind = game.slots[0].outcome.kind;
  eq(game.slots[0].took, kind !== 'void', 'оружие надето или монеты удвоены, пустота — ничего');
  runFor(game, SHOW_FAST + 0.2);
  eq(game.slots.map((slot) => slot && slot.login), ['ева', 'зина'], 'освободились места — крутят ждавшие');
});

test('гача: один игрок занимает оба свободных места и стоит в очереди, пока хватает монет', () => {
  const { game } = makeGame();
  game.open();
  say(game, 'Ося', 'привет');
  toWave(game);
  const member = game.members.get('ося');
  member.coins = PRICE * 3 + 10;
  for (let i = 0; i < 3; i++) eq(say(game, 'Ося', 'гача'), 'queued');
  eq(say(game, 'Ося', 'гача'), 'poor', 'на четвёртую не хватает');
  game.step(TICK);
  eq(game.slots.map((slot) => slot && slot.login), ['ося', 'ося']);
  eq(game.queue, ['ося']);
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
  eq([last(game).command, last(game).ok], ['control', false]);
  no(game.paused);
  eq(say(game, 'Олег', '!чатоборона-пауза', MOD), 'pause');
  eq([last(game).command, last(game).ok], ['control', true]);
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

test('чат: боты не играют, удалённое модератором убирается, обычное сообщение — не команда', () => {
  const { game } = makeGame();
  game.open();
  eq(say(game, 'Nightbot', 'гача'), null);
  eq(game.members.size, 0);
  say(game, 'Тоня', 'первое', { msgId: 'a1' });
  eq([last(game).command, last(game).ok], [null, false]);
  say(game, 'Тоня', 'второе', { msgId: 'a2' });
  eq(game.chat.map((c) => c.text), ['первое', 'второе']);
  eq(game.unsay({ msgId: 'a1' }), 1);
  eq(game.chat.map((c) => c.text), ['второе']);
  eq(game.unsay({ user: 'тоня' }), 1);
  eq(game.chat.length, 0);
});

test('профиль показывает карточку игрока секунд десять', () => {
  const { game } = makeGame();
  game.open();
  say(game, 'Уля', 'привет');
  game.events.length = 0;
  eq(say(game, 'Уля', 'профиль'), 'card');
  eq([last(game).command, last(game).ok], ['card', true]);
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
  eq([last(game).command, last(game).ok], ['upgrade', true]);
  eq(member.coins, 400);
  ok(Object.keys(member.weapon.ups).length === 1);
  ok(JSON.stringify(member.tower.mods) !== before, 'свойство дошло до бойца');
  member.coins = 50;
  eq(say(game, 'Рита', '!улучшить'), 'poor');
  ok(game.notes.some((n) => n.kind === 'poor' && n.detail.price === 100));
});

test('классы не повторяются, пока не выпадут все', () => {
  const { game } = makeGame();
  game.open();
  for (let i = 0; i < 15; i++) say(game, 'Игрок' + i, 'привет');
  eq(new Set(Array.from(game.members.values()).map((m) => m.cls)).size, 15);
  say(game, 'Шестнадцатый', 'привет');
  ok(game.members.get('шестнадцатый').cls);
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
