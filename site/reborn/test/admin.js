import { allowed, remember, remembered } from './gate.js';

const REFRESH_MS = 400;
const WAIT_MS = 50;
const SPEEDS = [1, 2, 3, 5, 10];
const STATES = { stopped: 'остановлена', lobby: 'набор', placing: 'подготовка', wave: 'идёт волна', break: 'перерыв',
  summit: 'сотая волна', over: 'итоги', ascend: 'парагон' };
const KIND_NAMES = { style: 'стиль', upgrade: 'усиление', ability: 'способность' };
const QUICK = ['привет', 'гача', 'гача 10', 'улучшить', 'улучшить все', 'профиль', 'проф', 'реролл', 'ускорить',
  'замедлить', '1', '2', '3', '4', '5'];
const OWNER_COMMANDS = [['пауза', '!чатоборона-пауза'], ['дальше', '!чатоборона-дальше'],
  ['заново', '!чатоборона-заново'], ['сброс', '!чатоборона-сброс'], ['правила', '!чатоборона'],
  ['ускорить', '!чатоборона-ускорить'], ['замедлить', '!чатоборона-замедлить']];

const $ = (id) => document.getElementById(id);
let lab = null;
let catalog = null;
let chosen = '';
const marks = new Map();

function el(tag, props = {}, ...kids) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...kids);
  return node;
}

function act(text, name, run, className = '') {
  const node = el('button', { type: 'button', textContent: text, className });
  node.dataset.act = name;
  node.addEventListener('click', () => {
    run();
    update();
  });
  return node;
}

function choose(pairs, id = '') {
  const node = el('select', id ? { id } : {});
  for (const [value, text] of pairs) node.append(el('option', { value: String(value), textContent: text }));
  return node;
}

const number = (value, id, step = 1) => el('input', { type: 'number', value: String(value), id, step: String(step) });
const text = (id, placeholder, value = '') => el('input', { type: 'text', id, placeholder, value, spellcheck: false });
const span = (words) => el('span', { textContent: words });
const row = (...kids) => el('div', { className: 'row' }, ...kids);
const rows = (...kids) => el('div', { className: 'rows' }, ...kids);
const section = (title, open, ...kids) => el('details', { open }, el('summary', { textContent: title }), rows(...kids));

function tick(words, id, onChange = null) {
  const box = el('input', { type: 'checkbox', id });
  if (onChange) box.addEventListener('change', () => onChange(box.checked));
  return { box, label: el('label', { className: 'tick' }, box, words) };
}

function changed(key, value) {
  if (marks.get(key) === value) return false;
  marks.set(key, value);
  return true;
}

function facts(node, pairs) {
  node.textContent = '';
  pairs.filter(([, value]) => value !== null && value !== '').forEach(([label, value], i) => {
    if (i) node.append(' · ');
    node.append(label ? label + ' ' : '', el('b', { textContent: String(value) }));
  });
}

const className = (id) => (catalog.classes.find((cls) => cls.id === id) || { name: id }).name;
const rarityName = (id) => (catalog.rarities.find((rarity) => rarity.id === id) || { name: id }).name;
const player = (info) => info.players.find((item) => item.login === chosen) || null;

function weaponText(weapon) {
  if (!weapon) return 'без оружия';
  const boon = weapon.boon ? catalog.boons.find((item) => item.id === weapon.boon) : null;
  return rarityName(weapon.rarity) + ', мощь ' + weapon.power + (weapon.plus ? ', +' + weapon.plus : '')
    + (boon ? ', ' + boon.name : '');
}

function gameSection() {
  const speed = choose(SPEEDS.map((value) => [value, '×' + value]), 'a-speed');
  speed.addEventListener('change', () => lab.setSpeed(Number(speed.value)));
  const timer = number(10, 'a-timer'), lives = number(20, 'a-lives'), wave = number(1, 'a-wave');
  const immortal = tick('бессмертие', 'a-immortal', (on) => lab.setImmortal(on));
  const biome = choose([['', 'случайная']].concat(catalog.biomes.map((item) => [item.id, item.name])), 'a-biome');
  const family = choose(catalog.families.map((item) => [item.id, item.name]), 'a-family');
  return section('Игра', true,
    el('p', { className: 'state', id: 'a-state' }),
    row(act('Старт', 'start', () => lab.start(), 'primary'), act('Стоп', 'stop', () => lab.stop()),
      act('Пауза', 'pause', () => lab.pause()), act('Дальше', 'next', () => lab.next()),
      act('Заново', 'restart', () => lab.restart())),
    row(span('Скорость'), speed, span('Таймер'), timer, act('Задать', 'timer', () => lab.setTimer(timer.value))),
    row(span('Жизни'), lives, act('Задать', 'lives', () => lab.setLives(lives.value)), immortal.label),
    row(span('Волна №'), wave, act('Начать волну', 'wave', () => lab.startWave(Number(wave.value)))),
    row(span('Карта'), biome, act('Новая карта', 'map', () => lab.newMap(biome.value))),
    row(span('Мобы волны'), family, act('На следующую', 'family', () => lab.setFamily(family.value))),
    row(act('Поражение', 'lose', () => lab.lose()), act('Обнулить уровни', 'levels', () => lab.resetLevels())));
}

function chatSection() {
  const nick = text('a-nick', 'ник', 'Тестер'), message = text('a-text', 'сообщение в чат');
  const mod = tick('модератор', 'a-mod'), owner = tick('стример', 'a-owner');
  const send = (words, asOwner = owner.box.checked) => {
    lab.say(nick.value, words, { mod: mod.box.checked, owner: asOwner });
    update();
  };
  const form = el('form', { className: 'row', id: 'a-chat' }, message,
    el('button', { type: 'submit', textContent: 'Отправить' }));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (message.value.trim()) send(message.value);
    message.value = '';
  });
  const quick = row(...QUICK.map((words) => {
    const node = el('button', { type: 'button', textContent: words });
    node.addEventListener('click', () => send(words));
    return node;
  }));
  const commands = row(span('Стример:'), ...OWNER_COMMANDS.map(([label, words]) => {
    const node = el('button', { type: 'button', textContent: label, title: words });
    node.addEventListener('click', () => send(words, true));
    return node;
  }));
  return section('Чат', true, row(nick, mod.label, owner.label), form, quick, commands,
    el('ul', { className: 'log', id: 'a-log' }));
}

function playersSection() {
  const classes = catalog.classes.map((cls) => [cls.id, cls.name]);
  const count = number(5, 'a-count'), cls = choose([['', 'случайный класс']].concat(classes), 'a-class');
  const pick = el('select', { id: 'a-player' });
  pick.addEventListener('change', () => {
    chosen = pick.value;
    update();
  });
  const klass = choose(classes, 'a-set-class'), level = number(1, 'a-level'), paragon = number(0, 'a-paragon');
  const rarity = choose(catalog.rarities.map((item) => [item.id, item.name]), 'a-rarity');
  const boon = choose([['', 'без свойства']].concat(catalog.boons.map((item) => [item.id, item.name])), 'a-boon');
  const power = number(0, 'a-power'), cell = text('a-cell', 'К7');
  cell.size = 4;
  const add = act('Добавить', 'add', () => {
    const made = lab.addPlayers(Math.max(1, Number(count.value) || 1), cls.value);
    if (made.length) chosen = made[made.length - 1];
  }, 'primary');
  return section('Игроки', true,
    row(span('Сколько'), count, cls, add),
    row(span('Игрок'), pick),
    el('p', { className: 'state', id: 'a-player-info' }),
    row(klass, act('Сменить класс', 'set-class', () => lab.setClass(chosen, klass.value)),
      act('Реролл', 'reroll', () => lab.reroll(chosen))),
    row(span('Уровень'), level, act('Задать', 'level', () => lab.setLevel(chosen, level.value)),
      span('Парагон'), paragon, act('Задать', 'paragon', () => lab.setParagon(chosen, paragon.value))),
    row(span('Монеты'), act('+100', 'coins-100', () => lab.addCoins(chosen, 100)),
      act('+1000', 'coins-1000', () => lab.addCoins(chosen, 1000)),
      act('+10000', 'coins-10000', () => lab.addCoins(chosen, 10000)),
      act('0', 'coins-zero', () => lab.clearCoins(chosen)),
      act('Всем +1000', 'coins-all', () => lab.addCoins('', 1000))),
    row(rarity, boon, span('мощь'), power),
    row(act('Выдать оружие', 'weapon', () => lab.giveWeapon(chosen, rarity.value, boon.value, power.value)),
      act('Забрать', 'unarm', () => lab.takeWeapon(chosen)),
      act('Частица бога', 'particle', () => lab.giveParticle(chosen))),
    el('div', { className: 'skills', id: 'a-skills' }),
    row(act('Все навыки стиля', 'skills-all', () => lab.setSkills(chosen, fullSet())),
      act('Снять все', 'skills-none', () => lab.setSkills(chosen, [])),
      act('Камень навыка', 'stone', () => lab.giveStone(chosen))),
    row(cell, act('Перейти', 'move', () => lab.moveTo(chosen, cell.value)),
      act('Усыпить', 'sleep', () => lab.sleep(chosen)),
      act('Разбудить', 'wake', () => lab.wake(chosen)), act('Убрать', 'remove', () => lab.remove(chosen))));
}

function fullSet() {
  const info = lab.info(), who = player(info);
  if (!who) return [];
  const pool = catalog.pools[who.cls], styles = pool.filter((skill) => skill.kind === 'style');
  const style = styles.find((skill) => who.skills.includes(skill.id)) || styles[0] || null;
  return pool.filter((skill) => (skill.kind !== 'style' || skill === style)
    && (!skill.style || style && skill.style === style.id)).flatMap((skill) => Array(skill.max).fill(skill.id));
}

function gachaSection() {
  const spins = number(1, 'a-spins');
  const prizes = catalog.outcomes.map((item) => [item.id, item.name])
    .concat(catalog.rarities.map((item) => ['weapon:' + item.id, 'Оружие: ' + item.name]));
  const prize = choose(prizes, 'a-prize');
  return section('Гача', false,
    el('p', { className: 'state', id: 'a-gacha-who' }),
    row(span('Круток'), spins, act('Крутить за монеты', 'spin', () => lab.spin(chosen, spins.value))),
    row(prize, act('Выпало', 'force', () => lab.forceSpin(chosen, prize.value))));
}

function choiceSection() {
  return section('Выбор навыка', true,
    el('p', { className: 'state', id: 'a-choice-who' }),
    el('div', { className: 'options', id: 'a-choice' }),
    row(act('Случайно', 'pick-random', () => lab.pickRandom()),
      act('Закрыть выбор', 'pick-drop', () => lab.dropChoice())));
}

function mobsSection() {
  const type = choose(catalog.types, 'a-mob-type'), look = el('select', { id: 'a-mob' });
  const count = number(1, 'a-mob-count'), hp = number(1, 'a-mob-hp', 0.1);
  const affix = choose([['', 'не серебряный']].concat(catalog.affixes.map((item) => [item.id, item.name])), 'a-affix');
  const route = choose([[0, 'вход 1'], [1, 'вход 2']], 'a-route');
  const fill = () => {
    look.textContent = '';
    for (const item of catalog.mobs[type.value]) look.append(el('option', { value: item.id, textContent: item.name }));
    affix.disabled = type.value === 'elite' || type.value === 'boss';
  };
  type.addEventListener('change', fill);
  fill();
  return section('Мобы', true,
    row(type, look),
    row(span('Сколько'), count, span('Здоровье ×'), hp),
    row(affix, route),
    row(act('Выпустить', 'spawn', () => lab.spawn({ type: type.value, id: look.value, count: Number(count.value) || 1,
      affix: affix.value, hp: Number(hp.value) || 1, route: Number(route.value) }), 'primary'),
    act('Убить всех', 'kill', () => lab.killAll()), act('Очистить очередь', 'queue', () => lab.clearQueue())));
}

function eventsSection() {
  const pick = el('select', { id: 'a-event' });
  for (const group of catalog.events) {
    const part = el('optgroup', { label: group.name });
    for (const item of group.list) {
      part.append(el('option', { value: group.kind + ':' + item.id, textContent: item.name }));
    }
    pick.append(part);
  }
  const parts = () => pick.value.split(':');
  return section('События', false,
    row(pick),
    row(act('На следующую волну', 'event-next', () => lab.eventNext(...parts())),
      act('Сейчас', 'event-now', () => lab.eventNow(...parts())),
      act('Снять все', 'event-clear', () => lab.clearEvents())),
    el('p', { className: 'state', id: 'a-effects' }));
}

function drawPlayers(info) {
  if (!info.players.some((item) => item.login === chosen)) chosen = info.players.length ? info.players[0].login : '';
  const list = info.players.map((item) => item.login + ':' + item.name + ':' + item.cls + ':' + item.level).join('|');
  if (changed('players', list + '#' + chosen)) {
    const pick = $('a-player');
    pick.textContent = '';
    for (const item of info.players) {
      pick.append(el('option', { value: item.login, textContent: item.name + ' — ' + className(item.cls)
        + ', ур. ' + item.level }));
    }
    pick.value = chosen;
  }
  const who = player(info);
  facts($('a-player-info'), who ? [['', className(who.cls)], ['ур.', who.level], ['монеты', who.coins],
    ['', weaponText(who.weapon)], ['клетка', who.cell || (who.asleep ? 'спит' : '—')],
    ['парагон', who.paragon || null], ['', who.particle ? 'частица бога' : null]] : [['', 'игроков нет']]);
  $('a-gacha-who').textContent = who ? 'Игрок: ' + who.name + ', монет ' + who.coins : 'Сначала добавь игрока';
  drawSkills(who);
}

function drawSkills(who) {
  const box = $('a-skills');
  if (!changed('skills', who ? who.login + ':' + who.cls + ':' + who.skills.join() : '')) return;
  box.textContent = '';
  if (!who) return;
  const pool = catalog.pools[who.cls];
  for (const skill of pool) {
    const count = who.skills.filter((id) => id === skill.id).length;
    const check = skill.max > 1 ? el('input', { type: 'number', min: 0, max: skill.max, value: count })
      : el('input', { type: 'checkbox', checked: count > 0 });
    check.dataset.skill = skill.id;
    check.addEventListener('change', () => {
      const now = lab.info(), current = player(now);
      if (!current) return;
      const want = skill.max > 1 ? Math.max(0, Math.min(skill.max, Math.round(Number(check.value) || 0)))
        : check.checked ? 1 : 0;
      const next = current.skills.filter((id) => id !== skill.id).concat(Array(want).fill(skill.id));
      lab.setSkills(chosen, next);
      update();
    });
    const style = skill.style ? pool.find((item) => item.id === skill.style) : null;
    box.append(el('label', {}, check, skill.name, el('small', { textContent: KIND_NAMES[skill.kind]
      + (style ? ' · ' + style.name : '') })));
  }
}

function drawChoice(info) {
  const choice = info.choice, who = choice ? info.players.find((item) => item.login === choice.login) : null;
  $('a-choice-who').textContent = choice ? 'Выбирает ' + (who ? who.name : choice.login) + ', осталось '
    + choice.left + ' с' : 'Сейчас никто не выбирает';
  const key = choice ? choice.login + ':' + choice.options.map((option) => option.id + option.state).join() : '';
  if (!changed('choice', key)) return;
  const box = $('a-choice');
  box.textContent = '';
  if (!choice) return;
  choice.options.forEach((option, i) => {
    const node = act(i + 1 + '. ' + option.name + ' (' + KIND_NAMES[option.kind] + ')', 'pick-' + i, () => lab.pick(i));
    node.disabled = option.state !== 'open';
    box.append(node);
  });
}

function drawLog(info) {
  if (!changed('log', info.log.length + ':' + (info.log.length ? info.log[info.log.length - 1].text : ''))) return;
  const list = $('a-log');
  list.textContent = '';
  for (const entry of info.log.slice().reverse()) {
    list.append(el('li', {}, el('b', { textContent: entry.name }), ': ' + entry.text + ' ',
      el('i', { textContent: '→ ' + entry.result })));
  }
}

function update() {
  if (!lab) return;
  const info = lab.info();
  facts($('a-state'), [['', STATES[info.state] + (info.paused ? ', пауза' : '')], ['волна', info.wave],
    ['таймер', info.state === 'wave' ? null : info.left], ['жизни', info.lives === null ? null
      : info.lives + '/' + info.maxLives], ['мобов', info.mobs + (info.queued ? ' +' + info.queued : '')],
    ['карта', info.biome], ['дальше', info.family], ['скорость', '×' + info.speed]]);
  $('a-immortal').checked = info.immortal;
  $('a-route').disabled = info.routes < 2;
  $('a-effects').textContent = info.effects.length ? 'Действуют и ждут: ' + info.effects.join(', ') : 'Событий нет';
  drawPlayers(info);
  drawChoice(info);
  drawLog(info);
}

function waitFor(check) {
  return new Promise((resolve) => {
    const look = () => {
      let value = null;
      try {
        value = check();
      } catch (error) {
        value = null;
      }
      if (value) resolve(value);
      else setTimeout(look, WAIT_MS);
    };
    look();
  });
}

async function enter() {
  $('gate').hidden = true;
  $('lab').hidden = false;
  const frame = $('game');
  frame.src = '../overlay.html?embed=1&webcam=none';
  await waitFor(() => frame.contentWindow.chatoborona);
  const script = frame.contentDocument.createElement('script');
  script.type = 'module';
  script.src = 'test/lab.js';
  frame.contentDocument.head.append(script);
  lab = await waitFor(() => frame.contentWindow.rebornLab);
  catalog = lab.catalog();
  $('admin').append(gameSection(), chatSection(), playersSection(), choiceSection(), gachaSection(), mobsSection(),
    eventsSection());
  update();
  setInterval(update, REFRESH_MS);
}

$('gate').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (await allowed($('nick').value)) {
    remember();
    enter();
  } else $('gate-status').textContent = 'Нет доступа';
});

if (remembered()) enter();
else $('enter').disabled = false;
