import { SFX_GAPS, SOUNDS, measure } from '../../site/js/sound.js';
import { CLASSES } from '../../site/js/classes.js';
import { BOSSES, ELITES, LEVEL_MAX, xpForLevel } from '../../site/js/balance.js';
import { NUKE_FLIGHT } from '../../site/js/battle.js';
import { HERO_SIZE, MOB_KINDS, coinUrl, heroSprite, heroUrl, mobSprite, prizeUrl } from '../../site/js/sprites.js';
import { PAGES } from '../../site/js/guide.js';
import { DEFAULTS } from '../../site/js/config.js';
import { SIZE } from '../../site/js/field.js';
import { RARITIES, ascend, makeWeapon } from '../../site/js/gacha.js';
import { eq, no, ok, test } from './harness.js';

const SITE = '/site/';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function until(check, note = 'условие', ms = 15000) {
  const deadline = Date.now() + ms;
  for (;;) {
    let value = null;
    try {
      value = check();
    } catch (error) {
      value = null;
    }
    if (value) return value;
    if (Date.now() > deadline) throw new Error('не дождались: ' + note);
    await wait(30);
  }
}

async function open(path, ready) {
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;left:0;top:0;width:1280px;height:720px;border:0;background:#333';
  frame.src = SITE + path;
  document.body.append(frame);
  await until(() => ready(frame.contentWindow), 'страница ' + path + ' не поднялась');
  return frame;
}

function fresh() {
  for (const key of Object.keys(localStorage)) if (key.startsWith('chatoborona')) localStorage.removeItem(key);
}

const element = (w, id) => w.document.getElementById(id);
const text = (w, id) => element(w, id).textContent;
const overlay = (query = '') => open('overlay.html' + (query ? '?' + query : ''), (w) => w.chatoborona);
const join = (game, name) => game.feed(name, 'привет', { login: name.toLowerCase() });

test('страницы: пример в рамке — середина волны, гача, отряд и эффекты слева, чата нет', async () => {
  fresh();
  const frame = await overlay('embed=1');
  const w = frame.contentWindow;
  await until(() => !element(w, 'stage').hidden, 'пример на экране');
  await wait(300);
  eq(text(w, 'wave'), '8');
  ok(element(w, 'lobby').hidden && element(w, 'over').hidden);
  ok(text(w, 'slot-0').includes('надевает'), 'выпавшее оружие на месте карусели: ' + text(w, 'slot-0'));
  ok(w.document.querySelector('#slot-0 .stats .might-icon'), 'у оружия видна мощь');
  no(w.document.getElementById('chat'), 'чата на экране нет');
  eq(w.document.querySelectorAll('#slot-1 .cell').length, 26, 'вторая карусель крутится');
  eq(w.document.querySelectorAll('.side .slot:not([hidden])').length, 3, 'три окна гачи');
  ok(w.document.querySelectorAll('#left #players li').length >= 5, 'отряд слева');
  ok(w.document.querySelectorAll('#left #effects .effect').length >= 3, 'эффекты слева');
  const effects = element(w, 'effects').getBoundingClientRect();
  const players = element(w, 'players').getBoundingClientRect();
  ok(effects.bottom <= players.top, 'эффекты над отрядом');
  ok(w.document.querySelector('#cards .profile'), 'карточка игрока справа');
  no(w.chatoborona.live);
  frame.remove();
});

test('страницы: оверлей сам открывает набор, чат вступает, карта, волна', async () => {
  fresh();
  const frame = await overlay('lobby=10&first_wave=5');
  const w = frame.contentWindow, game = w.chatoborona.game;
  await until(() => game.state === 'lobby', 'набор');
  for (const name of ['Аня', 'Боря', 'Вика']) join(game, name);
  await until(() => text(w, 'players').includes('Вика'), 'трое в отряде');
  ok(text(w, 'players').includes('Боря'));
  game.next();
  await until(() => game.state === 'placing', 'расстановка');
  await until(() => element(w, 'lobby').hidden, 'карта на экране');
  const family = game.battle.nextFamily;
  await until(() => text(w, 'status') === 'Дальше — ' + family.name, 'какой вид мобов будет, видно заранее');
  game.next();
  await until(() => game.state === 'wave', 'волна');
  await until(() => element(w, 'clock').textContent.includes('моб'), 'счётчик мобов');
  eq(game.battle.family, family, 'вышли те, кого объявили');
  eq(text(w, 'status'), 'Волна ' + family.of);
  game.feed('Аня', 'профиль', { login: 'аня' });
  await until(() => w.document.querySelector('#cards .profile'), 'карточка');
  const card = w.document.querySelector('#cards .profile');
  await wait(800);
  eq(w.document.querySelector('#cards .profile'), card, 'карточка не пересоздаётся — не мигает');
  no(card.classList.contains('pop'), 'анимация появления отыграла один раз');
  const watched = [];
  const watcher = new w.MutationObserver((changes) => watched.push(...changes));
  watcher.observe(w.document.getElementById('cards'), { childList: true });
  await wait(600);
  watcher.disconnect();
  eq(watched.length, 0, 'карточку не переставляют в разметке');
  frame.remove();
});

test('страницы: ядерка — свист в полёте, взрыв со звуком, затемнение и тряска поля', async () => {
  fresh();
  const frame = await overlay('lobby=10&first_wave=5');
  const w = frame.contentWindow, game = w.chatoborona.game, view = w.chatoborona.view;
  await until(() => game.state === 'lobby', 'набор');
  join(game, 'Аня');
  game.members.get('аня').cls = 'miner';
  game.next();
  await until(() => game.state === 'placing', 'расстановка');
  const battle = game.battle, tower = game.members.get('аня').tower;
  const mob = battle._spawn({ type: 'normal', hp: 1e6 }, 3);
  battle._event({ kind: 'toss', tower, mob, mine: 'nuke', time: NUKE_FLIGHT, radius: tower.s[2].radius });
  await until(() => view.heard.includes('fall'), 'свист падающей бомбы');
  no(element(w, 'blackout').classList.contains('on'));
  battle._nuke(tower, mob.x, mob.y);
  await until(() => view.heard.includes('nuke'), 'звук взрыва');
  ok(element(w, 'blackout').classList.contains('on'), 'экран темнеет');
  ok(element(w, 'board').classList.contains('shake'), 'поле трясёт');
  frame.remove();
});

test('страницы: сотый уровень — поздравление с конфетти, уровень числом', async () => {
  fresh();
  const frame = await overlay('lobby=10&first_wave=5');
  const w = frame.contentWindow, game = w.chatoborona.game;
  await until(() => game.state === 'lobby', 'набор');
  join(game, 'Аня');
  game.next();
  await until(() => game.state === 'placing', 'расстановка');
  const anya = game.members.get('аня');
  anya.xp = xpForLevel(LEVEL_MAX);
  game.battle._level(anya.tower);
  await until(() => !element(w, 'cheer').hidden, 'поздравление на экране');
  ok(text(w, 'cheer-box').includes('100 уровень') && text(w, 'cheer-box').includes('Аня'));
  await until(() => text(w, 'players').includes('ур. 100'), 'в отряде — «ур. 100» на плашке, без короны');
  no(w.document.querySelector('#players .lvl img.crown'));
  frame.remove();
});

test('страницы: ускорение — заметная плашка «×2», «×3» в шапке; без ускорения её нет', async () => {
  fresh();
  const frame = await overlay('lobby=10&first_wave=5');
  const w = frame.contentWindow, game = w.chatoborona.game;
  await until(() => game.state === 'lobby', 'набор');
  join(game, 'Аня');
  await wait(300);
  ok(element(w, 'speed').hidden, 'без ускорения плашки нет');
  game.feed('Мод', 'ускорить', { login: 'мод', mod: true });
  await until(() => !element(w, 'speed').hidden && text(w, 'speed') === '×2', 'плашка ×2');
  game.feed('Мод', 'ускорить', { login: 'мод', mod: true });
  await until(() => text(w, 'speed') === '×3' && element(w, 'speed').classList.contains('x3'), 'плашка ×3');
  no(text(w, 'status').includes('×'), 'в строке состояния не повторяется');
  const view = w.chatoborona.view, real = view.clock, field = view.scene.clock;
  await wait(600);
  const ratio = (view.scene.clock - field) / (view.clock - real);
  ok(Math.abs(ratio - 3) < 0.01, 'на ×3 поле — снаряды, взрывы, движение — идёт втрое быстрее, вровень с боем: ' + ratio);
  game.next();
  await until(() => game.state === 'placing' && view.scene.battle === game.battle, 'расстановка на поле');
  view.scene.say('проверка', '#ffffff');
  const banner = view.scene.effects.find((e) => e.kind === 'banner'), shown = view.clock;
  await wait(400);
  ok(Math.abs(banner.t - (view.clock - shown)) < 0.05, 'надписи на поле висят в обычном времени');
  game.feed('Мод', 'замедлить', { login: 'мод', mod: true });
  game.feed('Мод', 'замедлить', { login: 'мод', mod: true });
  await until(() => element(w, 'speed').hidden, 'скорость обычная — плашка пропала');
  frame.remove();
});

test('страницы: божественное оружие — плашка в столбце профилей, не по центру поля; частица в профиле', async () => {
  fresh();
  const frame = await overlay('lobby=10&first_wave=5');
  const w = frame.contentWindow, game = w.chatoborona.game;
  await until(() => game.state === 'lobby', 'набор');
  join(game, 'higashi_vo');
  join(game, 'Аня');
  game.next();
  await until(() => game.state === 'placing', 'расстановка');
  const anya = game.members.get('аня');
  anya.weapon = makeWeapon(Math.random, anya.cls, RARITIES[RARITIES.length - 1]);
  anya.weapon.plus = 29;
  anya.coins = 100;
  anya.particle = true;
  game.feed('Аня', 'улучшить', { login: 'аня' });
  await until(() => w.document.querySelector('#cards .note.divine'), 'плашка справа');
  const note = w.document.querySelector('#cards .note.divine');
  ok(note.textContent.includes('Божественное оружие') && note.textContent.includes('Аня'), note.textContent);
  ok(note.textContent.includes('Божественный'), 'и само оружие');
  ok(element(w, 'cheer-box').hidden, 'посреди поля ничего');
  game.feed('Аня', 'профиль', { login: 'аня' });
  await until(() => w.document.querySelector('#cards .profile'), 'профиль');
  await until(() => !w.document.querySelector('#cards .profile .relic').hidden, 'частица слева от монет');
  ok(text(w, 'cards').includes('Божественный'));
  await until(() => w.document.querySelector('#players .snow'), 'снежный ник higashi_vo');
  frame.remove();
});

test('страницы: в карточке игрока — убийства, помощь и мощь, статов нет', async () => {
  fresh();
  const frame = await overlay('lobby=10&first_wave=5');
  const w = frame.contentWindow, game = w.chatoborona.game;
  await until(() => game.state === 'lobby', 'набор');
  join(game, 'Аня');
  game.next();
  await until(() => game.state === 'placing', 'расстановка');
  game.next();
  await until(() => game.state === 'wave', 'волна');
  const anya = game.members.get('аня');
  anya.tower.run.kills = 4;
  anya.tower.run.assists = 7;
  game.feed('Аня', 'профиль', { login: 'аня' });
  await until(() => w.document.querySelector('#cards .profile .stat-line.power'), 'строка мощи');
  const card = w.document.querySelector('#cards .profile');
  const marks = () => Array.from(card.querySelectorAll('.marks .mark')).map((mark) => mark.textContent);
  await until(() => marks().includes(String(anya.tower.run.kills)) && marks().includes(String(anya.tower.run.assists)),
    'убийства и помощь');
  const might = () => card.querySelector('.stat-line.power').textContent;
  eq(might(), 'мощь 100', 'без оружия — мощь 100');
  ok(card.querySelector('.stat-line.power img.might-icon'), 'со значком мощи');
  no(/КШ|КУ|скор \d|ловкост|интеллект|мастерств/.test(card.textContent), 'статов в карточке нет');
  game.battle.setMods(anya.tower, Object.assign({}, anya.tower.mods, { power: 40 }));
  await until(() => might() === 'мощь 140', 'мощь обновилась');
  anya.tower.run.kills = 9;
  await until(() => Array.from(card.querySelectorAll('.marks .mark')).some((mark) => mark.textContent === '9'), 'счёт идёт');
  frame.remove();
});

test('страницы: игроков больше, чем помещается в «Отряде», — список листается страницами по кругу', async () => {
  fresh();
  const frame = await overlay('lobby=60');
  const w = frame.contentWindow, game = w.chatoborona.game, view = w.chatoborona.view;
  await until(() => game.state === 'lobby', 'набор');
  for (let i = 0; i < 70; i++) join(game, 'Игрок' + i);
  await until(() => w.document.querySelector('#players.paged .pages'), 'список листается');
  const page = () => Array.from(w.document.querySelectorAll('#players .page:first-child li')).map((li) => li.textContent);
  const first = page(), seen = new Set(first);
  ok(first.length > 0 && first.length < 70, 'на странице часть отряда: ' + first.length);
  for (let turn = 0; turn < 12 && seen.size < 70; turn++) {
    const before = page()[0];
    view.clock += 5.7;
    await until(() => page()[0] !== before, 'следующая страница');
    for (const name of page()) seen.add(name);
  }
  eq(seen.size, 70, 'по кругу видно всех');
  frame.remove();
});

test('страницы: при длинной очереди гачи появляются четвёртое и пятое окошки', async () => {
  fresh();
  const frame = await overlay('lobby=10&first_wave=5');
  const w = frame.contentWindow, game = w.chatoborona.game;
  await until(() => game.state === 'lobby', 'набор');
  join(game, 'Аня');
  game.next();
  await until(() => game.state === 'placing', 'расстановка');
  ok(element(w, 'slot-3').hidden && element(w, 'slot-4').hidden, 'сначала три окошка');
  game.members.get('аня').coins = 1e6;
  game.queue = [{ login: 'аня', count: 120 }];
  await until(() => !element(w, 'slot-3').hidden && !element(w, 'slot-4').hidden, 'пять окошек');
  game.queue = [];
  await until(() => element(w, 'slot-4').hidden && element(w, 'slot-3').hidden, 'очередь кончилась — снова три', 30000);
  frame.remove();
});

test('страницы: парагон — церемония перед итогами, потом флаг перед уровнем', async () => {
  fresh();
  const frame = await overlay('lobby=10&first_wave=5');
  const w = frame.contentWindow, game = w.chatoborona.game;
  await until(() => game.state === 'lobby', 'набор');
  join(game, 'Аня');
  game.next();
  await until(() => game.state === 'placing', 'расстановка');
  const anya = game.members.get('аня');
  anya.xp = xpForLevel(LEVEL_MAX);
  anya.particle = true;
  anya.weapon = ascend(makeWeapon(Math.random, anya.cls, RARITIES[RARITIES.length - 1]));
  game.next();
  await until(() => game.state === 'wave', 'волна');
  anya.tower.run.kills = 3;
  game.battle.lives = 0;
  await until(() => game.state === 'ascend', 'церемония');
  await until(() => !element(w, 'ascend').hidden, 'церемония на экране');
  ok(text(w, 'ascend').includes('Парагон 1'));
  ok(element(w, 'over').hidden, 'итоги — потом');
  await until(() => w.document.querySelector('#players .paragon'), 'флаг парагона в отряде');
  game.next();
  await until(() => game.state === 'over', 'итоги');
  await until(() => element(w, 'ascend').hidden, 'церемония убрана');
  frame.remove();
  fresh();
});

test('страницы: паразит, раз оказавшись в горе, снова виден, когда вышел', async () => {
  fresh();
  const frame = await overlay('lobby=10&first_wave=5');
  const w = frame.contentWindow, game = w.chatoborona.game, scene = w.chatoborona.view.scene;
  await until(() => game.state === 'lobby', 'набор');
  join(game, 'Аня');
  game.next();
  await until(() => game.state === 'placing', 'расстановка');
  const battle = game.battle, rock = battle.solid.indexOf(1);
  ok(rock >= 0, 'на карте есть горы');
  const bug = battle.placeRider(game.members.get('аня'), 'parasite');
  await until(() => scene.poses.has(bug), 'паразит на поле');
  no(battle.covered(bug.cx, bug.cy), 'ждёт на свету');
  Object.assign(scene.poses.get(bug), { x: rock % SIZE + 0.5, y: Math.floor(rock / SIZE) + 0.5 });
  await until(() => !battle.covered(scene.poses.get(bug).x, scene.poses.get(bug).y), 'вышел из горы');
  eq([scene.poses.get(bug).x, scene.poses.get(bug).y], [bug.cx, bug.cy]);
  frame.remove();
});

test('страницы: плашка уровня в отряде — цвета оружия, без оружия белая', async () => {
  fresh();
  const frame = await overlay('lobby=10&first_wave=5');
  const w = frame.contentWindow, game = w.chatoborona.game;
  await until(() => game.state === 'lobby', 'набор');
  join(game, 'Аня');
  const pill = () => w.getComputedStyle(w.document.querySelector('#players .lvl')).backgroundColor;
  await until(() => w.document.querySelector('#players .lvl'), 'Аня в отряде');
  eq(pill(), 'rgb(255, 255, 255)');
  const anya = game.members.get('аня');
  anya.weapon = makeWeapon(Math.random, anya.cls, RARITIES.find((rarity) => rarity.id === 'legendary'));
  await until(() => pill() === 'rgb(249, 115, 22)', 'легендарное оружие — оранжевая плашка');
  frame.remove();
});

test('страницы: !чатоборона в оверлее — правила в два столбика на паузе, «!чатоборона-пауза» — дальше', async () => {
  fresh();
  const frame = await overlay('lobby=10&first_wave=5');
  const w = frame.contentWindow, game = w.chatoborona.game;
  await until(() => game.state === 'lobby', 'набор');
  game.feed('Мод', '!чатоборона', { login: 'мод', mod: true });
  await until(() => !element(w, 'rules-board').hidden, 'правила на экране');
  ok(text(w, 'rules-board').includes('!чатоборона-пауза') && text(w, 'rules-board').includes('Команды для зрителей'));
  no(text(w, 'rules-board').includes('[object'), 'в тексте нет «[object Object]»');
  ok(element(w, 'pause').hidden, 'вместо обычного экрана паузы');
  eq(w.getComputedStyle(element(w, 'rules-text')).columnCount, '2');
  game.feed('Мод', '!чатоборона-пауза', { login: 'мод', mod: true });
  await until(() => element(w, 'rules-board').hidden, 'правила убраны');
  no(game.paused);
  frame.remove();
});

test('страницы: в наборе две страницы — как играть и классы; правила и классы проходят ровно за набор', async () => {
  eq(PAGES.map((page) => page.id), ['how', 'classes']);
  const cycle = PAGES.reduce((sum, page) => sum + page.time, 0);
  eq(DEFAULTS.lobby % cycle, 0, 'страницы кончаются вместе с набором');
  fresh();
  const frame = await overlay('lobby=180');
  const w = frame.contentWindow, game = w.chatoborona.game;
  await until(() => game.state === 'lobby', 'набор');
  await until(() => w.document.querySelectorAll('#lobby-tabs span').length === 2, 'две вкладки');
  ok(!element(w, 'lobby-guide').hidden && text(w, 'lobby-guide').includes('что угодно')
    && text(w, 'lobby-guide').includes('гача'), 'сначала — как играть');
  no(/%|сундук|руна/.test(text(w, 'lobby-guide')), 'без процентов и подробностей гачи');
  join(game, 'Аня');
  game.left = game.s.lobby - PAGES[0].time - 1;
  await until(() => !element(w, 'lobby-classes').hidden && element(w, 'lobby-guide').hidden, 'классы');
  ok(text(w, 'legend').includes(CLASSES.find((cls) => cls.id === game.members.get('аня').cls).name), 'класс Ани');
  frame.remove();
});

test('страницы: поражение — экран итогов и рекорд', async () => {
  fresh();
  const frame = await overlay('lobby=10&first_wave=5');
  const w = frame.contentWindow, game = w.chatoborona.game;
  await until(() => game.state === 'lobby');
  join(game, 'Аня');
  game.next();
  game.step(0.1);
  game.next();
  game.step(0.1);
  for (let i = 0; i < 60 * 60 * 20 && game.state !== 'over'; i++) game.step(0.05);
  eq(game.state, 'over');
  await until(() => !element(w, 'over').hidden, 'итоги');
  ok(text(w, 'passed').includes('Пройдено волн'));
  ok(game.profiles.best.waves >= 0);
  game.pause();
  await until(() => !element(w, 'pause').hidden, 'пауза');
  ok(text(w, 'pause-record').includes('Рекорд') || text(w, 'pause-record').includes('рекорд'));
  frame.remove();
});

test('страницы: источник скрыли — пауза, показали — та же игра', async () => {
  fresh();
  const frame = await overlay('lobby=60');
  const w = frame.contentWindow, game = w.chatoborona.game;
  await until(() => game.state === 'lobby');
  const show = (visible) => w.dispatchEvent(new w.CustomEvent('obsSourceVisibleChanged', { detail: { visible } }));
  show(false);
  ok(game.paused);
  await until(() => !element(w, 'pause').hidden, 'экран паузы');
  show(true);
  no(game.paused);
  eq(game.state, 'lobby');
  frame.remove();
});

test('страницы: главная — без канала просит канал, с каналом играет, сброс в два нажатия', async () => {
  fresh();
  const frame = await open('index.html', (w) => w.document.getElementById('game')
    && w.document.getElementById('game').contentWindow.chatoborona);
  const w = frame.contentWindow, inner = element(w, 'game').contentWindow, api = inner.chatoborona;
  ok(element(w, 'rules').open, 'при открытии — правила для стримера');
  ok(text(w, 'rules').includes('Ссылка для OBS') && text(w, 'rules').includes('!чатоборона-пауза'));
  no(text(w, 'rules').includes('[object'), 'в тексте нет «[object Object]»');
  ok(text(w, 'rules').includes('написать !чатоборона-дальше — ещё сто волн'));
  element(w, 'rules-close').click();
  no(element(w, 'rules').open, 'кнопка «Закрыть» закрывает');
  w.document.getElementById('rules').showModal();
  element(w, 'rules-x').click();
  no(element(w, 'rules').open, 'и крестик тоже');
  element(w, 'open-rules').click();
  ok(element(w, 'rules').open, 'кнопка «Правила» открывает снова');
  element(w, 'rules-close').click();
  await until(() => !element(w, 'play').disabled, 'кнопка Начать');
  element(w, 'play').click();
  ok(text(w, 'status').includes('канал'));
  no(api.live);
  element(w, 's-channel').value = 'some_channel';
  element(w, 'play').click();
  ok(api.live);
  eq(api.game.state, 'lobby');
  ok(element(w, 'example-note').hidden);
  api.game.profiles.data.set('аня', { name: 'Аня', xp: 500, kills: 1, assists: 1 });
  element(w, 'reset').click();
  eq(text(w, 'reset'), 'Точно?');
  ok(api.game.profiles.size > 0);
  element(w, 'reset').click();
  eq(api.game.profiles.size, 0);
  element(w, 'toggle-settings').click();
  const lobby = element(w, 's-lobby');
  lobby.value = '45';
  lobby.dispatchEvent(new w.Event('input', { bubbles: true }));
  await until(() => api.game.s.lobby === 45, 'настройка дошла до игры');
  ok(element(w, 'link').value.includes('lobby=45'));
  element(w, 'play').click();
  no(api.live);
  frame.remove();
});

test('звуки: каждый слышно и ни один не хрипит, у каждого звука боя есть передышка', async () => {
  for (const name of SOUNDS) {
    const sound = await measure(name, 100);
    ok(sound.peak > (SFX_GAPS[name] ? 0.01 : 0.05), name + ' тихо');
    ok(sound.peak < 1, name + ' зашкаливает');
  }
  for (const name of Object.keys(SFX_GAPS)) ok(SOUNDS.includes(name), name);
});

test('спрайты: герои, мобы, оружие и монета рисуются, ничего не обрезано по краям', () => {
  const clipped = (image) => {
    const data = image.getContext('2d').getImageData(0, 0, image.width, image.height).data, w = image.width;
    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < w; x++) {
        if ((x === 0 || y === 0 || x === w - 1 || y === image.height - 1) && data[(y * w + x) * 4 + 3] > 0) return true;
      }
    }
    return false;
  };
  for (const cls of CLASSES) {
    ok(heroUrl(cls.id).startsWith('data:image/png'), cls.id);
    eq(heroSprite(cls.id).span / heroSprite(cls.id).fine, HERO_SIZE);
    no(clipped(heroSprite(cls.id)), 'герой обрезан: ' + cls.id);
  }
  for (const kind of MOB_KINDS) {
    ok(mobSprite(kind).width >= 8, kind);
    for (const frame of [0, 1]) no(clipped(mobSprite(kind, frame)), 'моб обрезан: ' + kind + ' ' + frame);
  }
  for (const kind of ELITES.concat(BOSSES)) ok(MOB_KINDS.includes(kind.id), kind.id);
  ok(coinUrl().startsWith('data:image/png'));
  for (const kind of ['weapon', 'void', 'handful', 'bag', 'chest', 'particle']) {
    ok(prizeUrl(kind, '#facc15').startsWith('data:image/png'), kind);
  }
});
