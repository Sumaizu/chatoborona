import { SFX_GAPS, SOUNDS, measure } from '../../site/js/sound.js';
import { CLASSES } from '../../site/js/classes.js';
import { BOSSES, ELITES, LEVEL_MAX, xpForLevel } from '../../site/js/balance.js';
import { NUKE_FLIGHT } from '../../site/js/battle.js';
import { HERO_SIZE, MOB_KINDS, coinUrl, heroSprite, heroUrl, mobSprite, prizeUrl } from '../../site/js/sprites.js';
import { PAGES } from '../../site/js/guide.js';
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
  ok(w.document.querySelector('#slot-0 .unique'), 'у легендарного видно особое свойство');
  no(w.document.getElementById('chat'), 'чата на экране нет');
  eq(w.document.querySelectorAll('#slot-1 .cell').length, 26, 'вторая карусель крутится');
  eq(w.document.querySelectorAll('.side .slot').length, 3, 'три окна гачи');
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
  await until(() => w.document.querySelectorAll('#roster .who').length === 3, 'трое в отряде');
  ok(text(w, 'roster').includes('Боря'));
  game.next();
  await until(() => game.state === 'placing', 'расстановка');
  await until(() => element(w, 'lobby').hidden, 'карта на экране');
  game.next();
  await until(() => game.state === 'wave', 'волна');
  await until(() => element(w, 'clock').textContent.includes('моб'), 'счётчик мобов');
  eq(text(w, 'status'), 'Идёт волна');
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
  game.next();
  await until(() => game.state === 'placing', 'расстановка');
  const battle = game.battle, tower = game.members.get('аня').tower;
  const mob = battle._spawn({ type: 'normal', hp: 1e6 }, 3);
  battle._event({ kind: 'toss', tower, mob, mine: 'nuke', time: NUKE_FLIGHT });
  await until(() => view.heard.includes('fall'), 'свист падающей бомбы');
  no(element(w, 'blackout').classList.contains('on'));
  battle._nuke(tower, mob.x, mob.y);
  await until(() => view.heard.includes('nuke'), 'звук взрыва');
  ok(element(w, 'blackout').classList.contains('on'), 'экран темнеет');
  ok(element(w, 'board').classList.contains('shake'), 'поле трясёт');
  frame.remove();
});

test('страницы: сотый уровень — поздравление с конфетти, вместо числа корона', async () => {
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
  await until(() => w.document.querySelector('#players .lvl img.crown'), 'корона в отряде');
  frame.remove();
});

test('страницы: в наборе сменяются страницы правил, отряда и классов', async () => {
  fresh();
  const frame = await overlay('lobby=300');
  const w = frame.contentWindow, game = w.chatoborona.game;
  await until(() => game.state === 'lobby', 'набор');
  await until(() => w.document.querySelectorAll('#lobby-tabs span').length === PAGES.length, 'вкладки');
  ok(!element(w, 'lobby-guide').hidden && text(w, 'lobby-guide').includes('к7'), 'сначала — как играть');
  const start = (id) => PAGES.slice(0, PAGES.findIndex((page) => page.id === id)).reduce((t, page) => t + page.time, 0);
  join(game, 'Аня');
  game.left = game.s.lobby - start('squad') - 1;
  await until(() => !element(w, 'lobby-squad').hidden && element(w, 'lobby-guide').hidden, 'отряд');
  ok(text(w, 'roster').includes('Аня'));
  game.left = game.s.lobby - start('classes') - 1;
  await until(() => !element(w, 'lobby-classes').hidden && element(w, 'lobby-squad').hidden, 'классы');
  game.left = game.s.lobby - start('coins') - 1;
  await until(() => text(w, 'lobby-guide').includes('улучшить'), 'монеты и гача');
  eq(w.document.querySelector('#lobby-tabs .on').textContent, 'Монеты и гача');
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
  element(w, 'rules-close').click();
  no(element(w, 'rules').open, 'кнопка «Закрыть» закрывает');
  w.document.getElementById('rules').showModal();
  element(w, 'rules-x').click();
  no(element(w, 'rules').open, 'и крестик тоже');
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

test('спрайты: герои, мобы, оружие и монета рисуются', () => {
  for (const cls of CLASSES) {
    ok(heroUrl(cls.id).startsWith('data:image/png'), cls.id);
    eq(heroSprite(cls.id).width / heroSprite(cls.id).fine, HERO_SIZE);
  }
  for (const kind of MOB_KINDS) ok(mobSprite(kind).width >= 8, kind);
  for (const kind of ELITES.concat(BOSSES)) ok(MOB_KINDS.includes(kind.id), kind.id);
  ok(coinUrl().startsWith('data:image/png'));
  for (const kind of ['weapon', 'void', 'coins']) ok(prizeUrl(kind, '#facc15').startsWith('data:image/png'), kind);
});
