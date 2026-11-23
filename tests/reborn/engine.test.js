import { test, eq, ok, no } from './harness.js';
import { PLAIN, makeGame, memoryStorage, runFor, seeded, until } from './fixtures.js';
import { ASCEND_TIME, CARD_MIN, CARD_ROOM, CARD_TIME, DIVINE_TIME, HOLD_SHOW, OVER_TIME, PICK_TIME, Profiles, QUICK_PAUSE,
  QUICK_WAVE, SKILL_TIME, SKILLS_TIME, SPEED_MAX, SPIN_LIMIT, SUMMIT_EVERY, SUMMIT_TIME }
  from '../../site/reborn/js/engine.js';
import { FAMILY_BY_ID, LEVEL_MAX, MIGHT, REWARD, SLEEP_AFTER, TEMPO, TICK, waveReward, xpForLevel }
  from '../../site/reborn/js/balance.js';
import { ASCEND_AT, PRICE, QUEUE_CAP, RARITIES, RUSH, SHOW_FAST, SHOW_TIME, SLOTS, SPIN_TIME, ascend,
  makeWeapon, WEAPON } from '../../site/reborn/js/gacha.js';
import { CLASSES, CLASS_BY_ID, STONE_CHANCE, poolOf } from '../../site/reborn/js/classes.js';
import { ODDS, effectOf, rollEvent } from '../../site/reborn/js/events.js';
import { SIZE, cellName } from '../../site/reborn/js/field.js';

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

function stone(game, login) {
  const slot = { id: 97, login, outcome: { kind: 'stone' }, phase: 'spin', left: 0 };
  game.slots[0] = slot;
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
    game = made;
  }
  const free = game.battle.bestCell(2.5);
  eq(say(game, 'Вика', cellName(free.x, free.y).toLowerCase()), 'move');
  const tower = game.members.get('вика').tower;
  eq([tower.x, tower.y], [free.x, free.y]);
  const [px, py] = game.battle.path[3];
  eq(say(game, 'Вика', cellName(px, py)), null, 'на дорогу нельзя');
  eq([tower.x, tower.y], [free.x, free.y]);
});

test('игра: перебежка сразу — и во время волны, и в подготовку', () => {
  const { game } = makeGame();
  game.open();
  say(game, 'Гена', 'я тут');
  toWave(game);
  const tower = game.members.get('гена').tower, spot = game.battle.bestCell(2.5);
  eq(say(game, 'Гена', cellName(spot.x, spot.y)), 'move', 'во время волны — сразу');
  eq([tower.x, tower.y], [spot.x, spot.y]);
  ok(tower.busy > game.battle.time, 'после перебежки секунду не стреляет');
  eq(say(game, 'Дина', cellName(spot.x, spot.y)), null, 'занятая клетка');
  ok(game.members.get('дина').tower, 'но в отряд вступила');
  ok(until(game, () => game.state === 'break'));
  const free = game.battle.bestCell(2.5);
  eq(say(game, 'Гена', cellName(free.x, free.y)), 'move', 'в подготовку тоже');
});

test('игра: ангел встаёт с поля в клетку над горой или озером, обычный герой — нет', () => {
  let game = null, spot = null;
  for (let seed = 1; !game; seed++) {
    const made = makeGame({ seed }).game;
    made.open();
    say(made, 'Вика', 'привет');
    say(made, 'Гена', 'привет');
    ok(until(made, () => made.state === 'placing'));
    const b = made.battle, at = Array.from(b.rough).find((cell) => b.free(cell % SIZE, Math.floor(cell / SIZE), true));
    if (at === undefined) continue;
    game = made;
    spot = { x: at % SIZE, y: Math.floor(at / SIZE) };
  }
  const vika = game.members.get('вика'), gena = game.members.get('гена');
  no(game.battle.free(spot.x, spot.y), 'для обычного героя клетка закрыта');
  game.battle.remove(gena.tower);
  gena.tower = null;
  eq(game._place(gena, spot), null, 'обычный герой туда не встаёт');
  game.battle.remove(vika.tower);
  vika.cls = 'priest';
  vika.skills = ['angel'];
  vika.tower = null;
  const angel = game._place(vika, spot);
  ok(angel && angel.x === spot.x && angel.y === spot.y, 'ангел встал');
});

test('игра: механик с гигантской турелью на другую клетку не переходит', () => {
  const { game } = makeGame();
  game.open();
  say(game, 'Гена', 'я тут');
  toWave(game);
  const member = game.members.get('гена'), tower = member.tower, from = [tower.x, tower.y];
  member.cls = 'mechanic';
  member.skills = ['turret', 'giant'];
  game._refresh(member);
  const spot = game.battle.bestCell(2.5);
  eq(say(game, 'Гена', cellName(spot.x, spot.y)), null, 'турель стоит на месте');
  eq([member.tower.x, member.tower.y], from);
  ok(game.notes.some((note) => note.kind === 'fixed' && note.login === 'гена'), 'ему сказано почему');
  member.cls = 'pyro';
  member.skills = ['fireball', 'giant'];
  game._refresh(member);
  eq(say(game, 'Гена', cellName(spot.x, spot.y)), 'move', 'маг огня с «Гигантским шаром» ходит как обычно');
  eq([member.tower.x, member.tower.y], [spot.x, spot.y]);
});

test('игра: в лобби клетка ничего не двигает, но в отряд принимает', () => {
  const { game } = makeGame();
  game.open();
  eq(say(game, 'Гоша', 'к7'), null);
  ok(game.members.has('гоша'));
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
  eq(WEAPON, 'Оружие', 'у оружия нет названий — только «Оружие» цветом редкости');
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
  const saved = new Profiles(storage, 'reborn.players.test');
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

test('гача: без монет нельзя, крутят четверо сразу, место — сперва тому, кто не крутит, докупка — в конец очереди', () => {
  const { game } = makeGame();
  game._stoneDue = () => 0;
  game.open();
  for (const name of ['Ева', 'Жора', 'Зина', 'Ия', 'Йод']) say(game, name, 'привет');
  toWave(game);
  eq(say(game, 'Ева', 'гача'), 'poor');
  ok(game.notes.some((n) => n.kind === 'poor' && n.login === 'ева'));
  for (const login of ['ева', 'жора', 'зина', 'ия', 'йод']) game.members.get(login).coins = 500;
  eq(say(game, 'Ева', 'гача 2'), 'queued');
  for (const name of ['Жора', 'Зина', 'Ия', 'Йод']) eq(say(game, name, 'гача'), 'queued');
  eq(game.members.get('ева').coins, 500 - 2 * PRICE, 'монеты списаны сразу');
  game.step(TICK);
  eq(game.slots.map((slot) => slot && slot.login), ['ева', 'жора', 'зина', 'ия'], 'места — сперва тем, кто не крутит');
  const queue = () => game.queue.map((entry) => [entry.login, entry.count]);
  eq(queue(), [['ева', 1], ['йод', 1]]);
  eq(say(game, 'Ева', 'гача'), 'queued', 'пока крутится — можно ещё');
  eq(queue(), [['ева', 1], ['йод', 1], ['ева', 1]], 'докупка — новой записью в конец');
  runFor(game, SPIN_TIME - 0.2);
  eq(game.slots[0].phase, 'spin');
  runFor(game, 0.4);
  eq(game.slots[0].phase, 'show');
  const kind = game.slots[0].outcome.kind;
  eq(game.slots[0].took, kind !== 'void', 'оружие надето или монеты удвоены, пустота — ничего');
  runFor(game, SHOW_FAST + 0.2);
  eq(game.slots.map((slot) => slot && slot.login), ['ева', 'йод', 'ева', null], 'освободились места — крутят ждавшие');
});

test('гача: один игрок занимает все свободные места, за раз — не больше десяти круток', () => {
  const { game } = makeGame();
  game.open();
  say(game, 'Ося', 'привет');
  toWave(game);
  const member = game.members.get('ося');
  member.coins = PRICE * 4 + 10;
  eq(say(game, 'Ося', 'гача 4'), 'queued');
  eq(say(game, 'Ося', 'гача'), 'poor', 'на пятую не хватает');
  game.step(TICK);
  eq(game.slots.map((slot) => slot && slot.login), ['ося', 'ося', 'ося', 'ося']);
  eq(game.queue.length, 0);
  member.coins = PRICE * 100;
  eq(say(game, 'Ося', 'гача 15'), 'queued');
  eq(game.queue.map((entry) => entry.count), [SPIN_LIMIT]);
  eq(SPIN_LIMIT, 10);
});

test('гача: в очереди у игрока не больше десяти круток, монеты за лишние не списываются; длинная очередь крутится быстрее', () => {
  const { game } = makeGame();
  game.open();
  for (let i = 0; i < 6; i++) say(game, 'Игрок' + i, 'привет');
  toWave(game);
  const members = Array.from(game.members.values());
  for (const member of members) member.coins = PRICE * 50;
  const first = members[0];
  game.slots = game.slots.map(() => ({ id: 0, login: 'занято', outcome: { kind: 'void' }, phase: 'show', left: 1e9 }));
  eq(say(game, first.name, 'гача 3'), 'queued');
  eq(say(game, first.name, 'гача 9'), 'queued', 'ещё семь до десяти');
  eq(game.queue.reduce((sum, entry) => sum + entry.count, 0), QUEUE_CAP);
  const coins = first.coins;
  eq(say(game, first.name, 'гача'), 'full', 'одиннадцатую не берёт');
  eq(first.coins, coins, 'монеты целы');
  ok(game.notes.some((note) => note.kind === 'queue'));
  for (const member of members.slice(1)) say(game, member.name, 'гача 5');
  ok(game.pending >= RUSH.queue);
  game.slots = game.slots.map(() => null);
  game.step(TICK);
  ok(game.slots.every((slot) => slot && slot.left <= RUSH.spin), 'крутится быстрее');
});

test('гача: окошек всегда четыре — над картой, во всю её ширину', () => {
  const { game } = makeGame();
  game._stoneDue = () => 0;
  game.open();
  for (let i = 0; i < 25; i++) say(game, 'Игрок' + i, 'привет');
  toWave(game);
  const members = Array.from(game.members.values());
  for (const member of members) member.coins = PRICE * 10;
  eq(SLOTS, 4);
  for (const member of members) say(game, member.name, 'гача 5');
  game.step(TICK);
  eq(game.slots.length, SLOTS, 'очередь большая — окошек столько же');
  ok(game.slots.every(Boolean), 'все крутят');
});

test('гача: первое легендарное у игрока и камень навыка видны 5 настоящих секунд, даже на ×3', () => {
  const { game } = makeGame();
  game._stoneDue = () => 0;
  game.open();
  say(game, 'Ося', 'привет');
  toWave(game);
  const member = game.members.get('ося');
  game.speed = 3;
  const legend = drop(game, 'ося', makeWeapon(seeded(3), member.cls, RARITIES[RARITIES.length - 1]));
  ok(legend.real && legend.left === HOLD_SHOW, 'первое легендарное — на 5 секунд');
  ok(game.notes.some((n) => n.kind === 'legend' && n.login === 'ося' && n.detail.boon === legend.outcome.weapon.boon),
    'надел легендарное — в «События», с аспектом');
  runFor(game, HOLD_SHOW - 0.2);
  ok(game.slots.includes(legend), 'не ускоряется вместе с игрой');
  runFor(game, 0.3);
  no(game.slots.includes(legend), 'через 5 настоящих секунд ушло');
  const again = drop(game, 'ося', makeWeapon(seeded(4), member.cls, RARITIES[RARITIES.length - 1]));
  no(again.real, 'второе легендарное — как обычно');
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

test('профиль показывает карточку игрока 20 секунд, повторный — ещё 20; без очереди две последние остаются', () => {
  const { game } = makeGame();
  game.open();
  say(game, 'Уля', 'привет');
  game.events.length = 0;
  eq(say(game, 'Уля', 'профиль'), 'card');
  ok(game.notes.some((n) => n.kind === 'card' && n.login === 'уля'));
  ok(game.events.some((e) => e.kind === 'card' && e.login === 'уля'));
  eq(CARD_TIME, 20);
  runFor(game, 10);
  ok(game.notes.some((n) => n.kind === 'card'), 'через 10 секунд ещё видна');
  say(game, 'Уля', 'профиль');
  runFor(game, CARD_TIME - 1);
  ok(game.notes.some((n) => n.kind === 'card'), 'повторный профиль продлил показ');
  runFor(game, 60);
  ok(game.notes.some((n) => n.kind === 'card' && n.login === 'уля'), 'других нет — последний профиль остаётся');
  eq(say(game, 'Федя', 'Профиль'), 'card', 'новичок вступает и сразу видит карточку');
  runFor(game, 60);
  eq(game.notes.filter((n) => n.kind === 'card').map((n) => n.login), ['уля', 'федя'], 'обе остаются, пока не позовут третью');
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
  member.cls = 'earth';
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

test('у каждой игры своя крутизна волн', () => {
  const tempos = [1, 2, 3, 4, 5, 6].map((seed) => {
    const { game } = makeGame({ seed });
    game.open();
    say(game, 'Тёма', 'привет');
    game.next();
    game.step(0.1);
    return game.battle.tempo;
  });
  const range = (end) => (TEMPO.mid - TEMPO.from) / (end - TEMPO.from);
  ok(tempos.every((t) => t >= range(TEMPO.high) - 1e-9 && t <= range(TEMPO.low) + 1e-9), String(tempos));
  ok(new Set(tempos).size > 3, 'разная: ' + tempos.map((t) => t.toFixed(2)).join(' '));
});

test('за волну — только награда волны, дохода от своих монет нет', () => {
  const { game } = makeGame();
  game.open();
  say(game, 'Тёма', 'привет');
  say(game, 'Паша', 'привет');
  const tema = game.members.get('тёма'), pasha = game.members.get('паша');
  tema.cls = 'sniper';
  pasha.cls = 'mechanic';
  toWave(game);
  pasha.coins = 100;
  tema.coins = 5000;
  const reward = waveReward(game.wave).coins;
  game.events.length = 0;
  game.battle.events.length = 0;
  game._endWave();
  eq(tema.coins, 5000 + reward);
  eq(pasha.coins, 100 + reward);
  no('income' in REWARD);
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

test('число и «все» в команде: «гача 3», «гача все» — до десяти, «улучшить 5», «улучшить всё» — на все монеты', () => {
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
  gena.coins = PRICE * 5;
  eq(say(game, 'Гена', 'гача 5'), 'queued');
  gena.coins = PRICE * 7;
  eq(say(game, 'Гена', 'гача все'), 'full', 'в очереди уже десять');
  eq(gena.coins, PRICE * 7, 'монеты целы');
  game.queue = [];
  gena.coins = PRICE * 12;
  eq(say(game, 'Гена', 'гача все'), 'queued');
  eq([queue(), gena.coins], [[10], PRICE * 2]);
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

test('профиль: две карточки сразу, третья ждёт десять секунд старшей; без очереди остаются; «проф» — то же, что «профиль»', () => {
  const { game } = makeGame();
  game.open();
  for (const name of ['Аня', 'Боря', 'Вика', 'Гоша']) say(game, name, 'привет');
  toWave(game);
  const shown = () => game.notes.filter((n) => n.kind === 'card').map((n) => n.login);
  eq(game.cardRoom, CARD_ROOM);
  eq(say(game, 'Аня', 'профиль'), 'card');
  eq(say(game, 'Боря', 'проф'), 'card');
  eq(say(game, 'Вика', 'профиль'), 'card');
  eq(shown(), ['аня', 'боря'], 'двое сразу, Вика ждёт');
  runFor(game, CARD_MIN - 1);
  eq(shown(), ['аня', 'боря']);
  runFor(game, 1.2);
  eq(shown(), ['боря', 'вика'], 'уходит только старшая — по одной на каждого ждущего');
  game.cardRoom = 1;
  game.step(TICK);
  eq(shown(), ['боря'], 'места на одну — младшая вернулась в очередь');
  say(game, 'Гоша', 'проф');
  game.step(TICK);
  eq(shown(), ['вика'], 'Боря своё отвисел — сразу следующая');
  runFor(game, CARD_MIN + 0.2);
  eq(shown(), ['гоша']);
  game.cardRoom = 2;
  runFor(game, CARD_TIME * 3);
  eq(shown(), ['гоша'], 'очередь пуста — остаётся, пока не позовут другую');
});

test('реролл: сколько угодно раз, пока не выбран первый навык; на поле — новый класс на той же клетке', () => {
  const { game } = makeGame();
  game.open();
  say(game, 'Рома', 'привет');
  const member = game.members.get('рома');
  for (let i = 0; i < 3; i++) {
    const was = member.cls;
    eq(say(game, 'Рома', 'реролл'), 'reroll', 'раз ' + (i + 1));
    ok(member.cls !== was);
  }
  const other = makeGame().game;
  other.open();
  say(other, 'Лиза', 'привет');
  ok(until(other, () => other.state === 'placing'));
  const lisa = other.members.get('лиза');
  const tower = lisa.tower;
  const cell = [tower.x, tower.y];
  eq(say(other, 'Лиза', 'реролл'), 'reroll');
  ok(lisa.tower && lisa.tower.cls.id === lisa.cls, 'новый защитник нового класса');
  eq([lisa.tower.x, lisa.tower.y], cell, 'на той же клетке');
  toWave(other);
  eq(say(other, 'Лиза', 'реролл'), 'reroll', 'и во время волн');
  ok(lisa.tower && lisa.tower.cls.id === lisa.cls);
  lisa.skills = [poolOf(lisa.cls)[0].id];
  eq(say(other, 'Лиза', 'реролл'), null, 'после первого навыка — нельзя');
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
  const note = game.notes.find((n) => n.login === 'рая' && n.kind === 'divine');
  ok(note && note.left === DIVINE_TIME && note.detail.weapon.rarity === 'divine', 'плашка на 5 секунд');
  eq(DIVINE_TIME, 5);
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
  ok(new Profiles(storage, 'reborn.players.test').get('лия').particle, 'и после перезагрузки');
  game.resetScores();
  no(game.members.get('лия').particle, 'сброс уровней забирает и частицу');
});

function earth(game, name) {
  say(game, name, 'привет');
  game.members.get(name.toLowerCase()).cls = 'earth';
}

test('камень навыка: первый после выбора стиля — 10%, дальше — 5%', () => {
  const { game } = makeGame();
  game.open();
  say(game, 'Рина', 'привет');
  const member = game.members.get('рина');
  member.cls = 'thunder';
  toWave(game);
  member.xp = xpForLevel(LEVEL_MAX);
  member.skills = ['caller'];
  eq(game._stoneDue(member), STONE_CHANCE.second, 'стиль взят — 10%');
  member.skills = ['caller', 'chain'];
  eq(game._stoneDue(member), STONE_CHANCE.next, 'дальше — 5%');
});

test('камень навыка: первый с 1 уровня (20%), дальше по ступеням 10, 20, 30, 50, 75, 100', () => {
  const { game } = makeGame();
  game.open();
  earth(game, 'Рина');
  toWave(game);
  const member = game.members.get('рина');
  member.xp = 0;
  eq(game._stoneDue(member), STONE_CHANCE.first, 'с первого уровня — 20%');
  stone(game, 'рина');
  eq(game._stoneDue(member), 0, 'пока выбор открыт, второй не выпадает');
  game.choices = [];
  member.skills = ['perk0'];
  eq(game._stoneDue(member), 0, 'за первую ступень уже взят');
  member.xp = xpForLevel(10);
  eq(game._stoneDue(member), STONE_CHANCE.next, 'на 10-м — 3%');
  member.xp = xpForLevel(LEVEL_MAX);
  member.skills = poolOf('earth').map((skill) => skill.id).slice(0, 7);
  eq(game._stoneDue(member), 0, 'семь ступеней — семь камней');
  member.skills = [];
  no(game.modsOf(member).perks.length, 'уровень сам приёмов не открывает');
});

test('камень навыка: игра идёт дальше, игрок пишет цифру — навык его до конца игры', () => {
  const { game } = makeGame();
  game.open();
  earth(game, 'Рина');
  say(game, 'Лев', 'привет');
  toWave(game);
  const member = game.members.get('рина'), pool = poolOf('earth'), second = pool[1], fourth = pool[3];
  member.xp = xpForLevel(30);
  ok(stone(game, 'рина').took);
  const choice = game.choice;
  eq(game.optionsOf(choice).map((option) => option.skill.id), pool.map((skill) => skill.id), 'все навыки класса');
  const time = game.battle.time;
  runFor(game, 5);
  ok(game.battle.time > time, 'бой идёт');
  ok(Math.abs(choice.left - (PICK_TIME - 5)) < 1e-6, 'отсчёт выбора идёт');
  eq(say(game, 'Лев', '2'), null, 'чужая цифра не считается');
  eq(say(game, 'Рина', '9'), null, 'такого номера нет');
  eq(say(game, 'Рина', '2'), 'skill');
  eq(game.choice, null);
  eq(member.skills, [second.id]);
  eq(member.tower.mods.perks, [second.perk], 'дошёл до бойца');
  ok(game.notes.some((n) => n.kind === 'skill' && n.detail.skill === second.id && !n.detail.auto));
  stone(game, 'рина');
  eq(game.optionsOf(game.choice)[1].state, 'taken', 'взятый — отмечен');
  eq(say(game, 'Рина', '2'), null, 'и второй раз не берётся');
  eq(say(game, 'Рина', '4'), 'skill', 'номера на своих местах');
  eq(member.skills, [second.id, fourth.id]);
  game.restart();
  say(game, 'Рина', 'снова');
  eq(game.members.get('рина').skills, [], 'в новой игре навыков нет');
});

test('камень навыка: маг огня сперва выбирает стиль — меняется скин и набор навыков', () => {
  const { game } = makeGame();
  game.open();
  say(game, 'Рина', 'привет');
  game.members.get('рина').cls = 'pyro';
  toWave(game);
  const member = game.members.get('рина');
  eq(member.tower.look, 'pyro-ragged', 'без стиля — оборванец');
  stone(game, 'рина');
  eq(game.optionsOf(game.choice).map((option) => option.skill.kind), ['style', 'style', 'style']);
  eq(say(game, 'Рина', '2'), 'skill');
  eq(member.skills, ['dragon']);
  eq([member.tower.style, member.tower.look], ['dragon', 'pyro-dragon']);
  ok(game.notes.some((n) => n.kind === 'skill' && n.detail.style), 'плашка «Новый стиль»');
  member.xp = xpForLevel(10);
  stone(game, 'рина');
  eq(game.optionsOf(game.choice).map((option) => option.skill.id),
    ['wide', 'lungs', 'flight', 'beam', 'smolder', 'fireReact', 'torch', 'blue']);
  eq(say(game, 'Рина', '8'), 'skill');
  eq(member.tower.look, 'pyro-dragon-blue', 'синее пламя — синий дракон');
});

test('камень навыка: не выбрал за 45 секунд — в конец очереди, второй раз — случайный; хозяин канала выбирает за игрока; пауза держит отсчёт', () => {
  const { game } = makeGame({ settings: { channel: 'streamer' } });
  game.open();
  earth(game, 'Рина');
  toWave(game);
  const member = game.members.get('рина');
  member.xp = xpForLevel(50);
  stone(game, 'рина');
  game.pause();
  runFor(game, PICK_TIME + 5);
  ok(game.choice, 'на паузе выбор ждёт');
  game.pause();
  runFor(game, PICK_TIME - 1);
  ok(game.choice, '45 секунд ещё не прошло');
  runFor(game, 1.1);
  ok(game.choice && game.choice.late, 'первый раз не успел — снова ждёт, теперь в конце очереди');
  ok(game.events.some((e) => e.kind === 'late' && e.login === 'рина'));
  runFor(game, PICK_TIME + 0.1);
  eq(game.choice, null);
  eq(member.skills.length, 1, 'навык выпал сам');
  ok(game.notes.some((n) => n.kind === 'skill' && n.detail.auto), 'с пометкой «случайно»');
  stone(game, 'рина');
  const free = game.optionsOf(game.choice).findIndex((option) => option.state === 'open');
  eq(say(game, 'Лев', '@рина ' + (free + 1)), null, 'зрителю нельзя');
  eq(game.feed('Streamer', '@Рина ' + (free + 1), { login: 'streamer' }), 'skill');
  eq(member.skills[1], poolOf('earth')[free].id);
  const other = makeGame().game;
  other.open();
  earth(other, 'Лев');
  ok(until(other, () => other.state === 'placing'));
  stone(other, 'лев');
  eq(say(other, 'Лев', 'реролл'), 'reroll');
  eq(other.choice, null, 'реролл закрывает выбор старого класса');
  eq(other.members.get('лев').skills, []);
});

test('камень навыка: опоздавший уходит в конец очереди, следующий выбирает сразу', () => {
  const { game } = makeGame();
  game.open();
  earth(game, 'Рина');
  earth(game, 'Лев');
  toWave(game);
  for (const login of ['рина', 'лев']) game.members.get(login).xp = xpForLevel(50);
  stone(game, 'рина');
  stone(game, 'лев');
  eq(game.choices.map((c) => c.login), ['рина', 'лев']);
  runFor(game, PICK_TIME + 0.1);
  eq(game.choices.map((c) => c.login), ['лев', 'рина'], 'Рина — в конец, теперь выбирает Лев');
  eq(say(game, 'Лев', '1'), 'skill');
  eq(game.choice.login, 'рина');
  eq(say(game, 'Рина', '2'), 'skill', 'со второго раза успела');
});

test('поражение: скорость снова обычная, итоги — минуту', () => {
  const { game } = makeGame();
  game.open();
  say(game, 'Рина', 'привет');
  toWave(game);
  game.speed = 3;
  game.battle.lives = 0;
  game.step(TICK);
  eq(game.state, 'over');
  eq(game.speed, 1);
  eq(OVER_TIME, 60);
  runFor(game, 59);
  eq(game.state, 'over', 'итоги висят минуту');
});

test('навыки: «навыки» показывает навыки игрока в общей очереди с камнями навыка; цифры в это время не выбирают', () => {
  const { game } = makeGame();
  game.open();
  earth(game, 'Рина');
  earth(game, 'Лев');
  toWave(game);
  const rina = game.members.get('рина');
  rina.xp = xpForLevel(50);
  rina.skills = ['perk0'];
  eq(say(game, 'Лев', 'навыки'), 'skills');
  eq(say(game, 'Лев', 'навыки'), null, 'второй раз в очередь не встаёт');
  stone(game, 'рина');
  eq(game.choices.map((c) => [c.login, c.kind || 'stone']), [['лев', 'skills'], ['рина', 'stone']], 'общая очередь');
  eq(say(game, 'Рина', '2'), null, 'пока показаны навыки Льва — выбора нет');
  runFor(game, SKILLS_TIME + 0.1);
  eq(game.choice.login, 'рина', 'показали — дальше камень Рины');
  eq(say(game, 'Рина', '2'), 'skill');
});

test('сон: ' + SLEEP_AFTER + ' волн без команд — уходит с карты, монеты поровну отряду; любая команда будит', () => {
  const { game } = makeGame();
  game.open();
  for (const name of ['Соня', 'Лев', 'Ира']) say(game, name, 'привет');
  toWave(game);
  const sonya = game.members.get('соня'), lev = game.members.get('лев'), ira = game.members.get('ира');
  sonya.quiet = SLEEP_AFTER - 1;
  lev.quiet = SLEEP_AFTER - 2;
  ok(until(game, () => game.state === 'break', 900), 'волна пройдена');
  ok(sonya.asleep && !sonya.tower, 'Соня уснула');
  no(game.battle.towers.some((t) => t.player === sonya), 'её нет на карте');
  ok(game.events.some((e) => e.kind === 'sleep' && e.login === 'соня'));
  no(lev.asleep, 'Лев ещё нет');
  eq(lev.quiet, SLEEP_AFTER - 1);
  eq(sonya.coins, 0, 'монеты отданы');
  toWave(game);
  eq(game.battle.players, 2, 'волна считает тех, кто на карте');
  lev.quiet = 5;
  say(game, 'Лев', 'проф');
  eq(lev.quiet, 0, 'команда обнуляет счёт');
  game._sleep(lev);
  lev.coins = 0;
  ira.coins = 10;
  sonya.coins = 0;
  game._wake(sonya);
  sonya.coins = 90;
  game._sleep(sonya);
  eq([ira.coins, sonya.coins], [100, 0], 'весь запас тому, кто на карте');
  say(game, 'Соня', 'всем привет');
  ok(sonya.asleep, 'просто сообщение не будит');
  const seat = sonya.seat;
  say(game, 'Соня', 'гача');
  ok(!sonya.asleep && sonya.tower, 'команда будит');
  eq(sonya.quiet, 0);
  if (seat) eq([sonya.tower.x, sonya.tower.y], [seat.x, seat.y], 'на прежней клетке');
  ok(game.events.some((e) => e.kind === 'awake' && e.login === 'соня'));
});

test('сон: монеты делятся поровну между всеми, кто на карте; уровень, оружие и навыки остаются', () => {
  const { game } = makeGame();
  game.open();
  for (const name of ['Соня', 'Лев', 'Ира']) say(game, name, 'привет');
  ok(until(game, () => game.state === 'placing'));
  const sonya = game.members.get('соня'), lev = game.members.get('лев'), ira = game.members.get('ира');
  sonya.coins = 90;
  lev.coins = 10;
  ira.coins = 0;
  sonya.xp = xpForLevel(30);
  sonya.skills = ['perk0'];
  sonya.tower.run.kills = 7;
  game._sleep(sonya);
  eq([sonya.coins, lev.coins, ira.coins], [0, 55, 45]);
  say(game, 'Соня', 'к7');
  ok(sonya.tower, 'проснулась');
  eq(sonya.xp, xpForLevel(30));
  eq(sonya.skills, ['perk0']);
  eq(sonya.tower.mods.perks, [0], 'навык при ней');
  eq(sonya.tower.run.kills, 7, 'счёт этой игры не пропал');
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
  best.cls = 'thunder';
  best.skills = ['thor'];
  toWave(game);
  for (const member of [best, bare, plain, young]) member.tower.run.kills = 5;
  game.battle.lives = 0;
  game.step(TICK);
  eq(game.state, 'ascend', 'перед итогами — церемония');
  eq(game.ascents.map((a) => [a.login, a.from, a.to]), [['вера', 0, 1]]);
  eq(game.ascents[0].skin, 'thunder-thor', 'в церемонии — моделька подкласса');
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
  const saved = new Profiles(storage, 'reborn.players.test').get('вера');
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
  const tower = gosha.tower, spot = game.battle.bestCell(2.5);
  const order = cellName(tower.x, tower.y) + ' ' + cellName(spot.x, spot.y);
  eq(say(game, 'Гоша', order), null, 'зрителю нельзя');
  eq(game.feed('Streamer', order, { login: 'streamer' }), 'move');
  eq([tower.x, tower.y], [spot.x, spot.y]);
  toWave(game);
  const next = game.battle.bestCell(2.5);
  const late = cellName(tower.x, tower.y) + ' ' + cellName(next.x, next.y);
  eq(game.feed('Streamer', late, { login: 'streamer' }), 'move', 'и во время волны — сразу');
  eq([tower.x, tower.y], [next.x, next.y]);
});

test('стример открывает чужую карточку и навыки: «@ник профиль», «@ник проф», «@ник навыки»; зрителям так нельзя', () => {
  const { game } = makeGame({ settings: { channel: 'streamer' } });
  game.open();
  say(game, 'Гоша', 'привет');
  say(game, 'Лиза', 'привет');
  const shown = () => game.notes.filter((n) => n.kind === 'card').map((n) => n.login);
  eq(say(game, 'Лиза', '@Гоша профиль'), null, 'зрителю нельзя');
  eq(shown(), []);
  eq(game.feed('Streamer', '@Гоша профиль', { login: 'streamer' }), 'card');
  eq(shown(), ['гоша']);
  eq(game.feed('Streamer', '@лиза, проф', { login: 'streamer' }), 'card');
  eq(shown(), ['гоша', 'лиза']);
  eq(game.feed('Streamer', '@Гоша навыки', { login: 'streamer' }), 'skills');
  eq(game.choice.kind, 'skills');
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
