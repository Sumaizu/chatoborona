import { TwitchChat } from './chat.js';
import { clean, fromQuery } from './config.js';
import { demoGame } from './demo.js';
import { Game, Profiles } from './engine.js';
import { playAll } from './sound.js';
import { View } from './view.js';

const CODE_FILES = ['overlay.html', 'css/overlay.css', 'js/overlay.js', 'js/view.js', 'js/draw.js', 'js/sprites.js',
  'js/engine.js', 'js/battle.js', 'js/balance.js', 'js/classes.js', 'js/field.js', 'js/gacha.js', 'js/chat.js',
  'js/config.js', 'js/demo.js', 'js/sound.js', 'js/events.js', 'js/models.js', 'js/monsters.js', 'js/props.js',
  'js/guide.js', 'js/rules.js'];
const LOCAL = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
const UPDATE_CHECK_SECONDS = LOCAL ? 5 : 300;
const RELOAD_PAUSE_SECONDS = LOCAL ? 0 : 600;
const STEP_MS = 50;
const RELOAD_CHECK_MS = 500;
const FRAME_MAX = 0.1;
const FRAME_MIN_MS = 12;
const EMBEDDED = new URLSearchParams(location.search).get('embed') === '1';

const fileUrl = (name) => new URL(name, location.href).href;

function browserStorage() {
  try {
    localStorage.getItem('chatoborona');
    return localStorage;
  } catch (error) {
    return null;
  }
}

function watchVisibility(onShow, onHide) {
  const pageShown = () => document.visibilityState !== 'hidden';
  const report = (shown) => (shown ? onShow() : onHide());
  document.addEventListener('visibilitychange', () => report(pageShown()));
  window.addEventListener('obsSourceVisibleChanged', (event) => report(Boolean(event.detail && event.detail.visible)));
  if (pageShown()) onShow();
}

async function filesFingerprint() {
  const marks = await Promise.all(CODE_FILES.map(async (name) => {
    const response = await fetch(fileUrl(name), { method: 'HEAD', cache: 'no-store' });
    if (!response.ok) throw new Error(name);
    return response.headers.get('etag') || response.headers.get('last-modified') || '';
  }));
  return marks.join('|');
}

function refreshCache() {
  return Promise.all(CODE_FILES.map((name) => fetch(fileUrl(name), { cache: 'reload' })));
}

function watchUpdates(canReload) {
  let fingerprint = null, fetching = false, ready = false;
  const prepare = () => {
    if (fetching) return;
    fetching = true;
    const done = () => {
      ready = true;
    };
    refreshCache().then(done, done);
  };
  const reload = () => {
    const storage = browserStorage();
    const last = storage ? Number(storage.getItem('chatoborona.reloaded')) || 0 : 0;
    if (!ready || !canReload() || Date.now() - last < RELOAD_PAUSE_SECONDS * 1000) return;
    if (storage) storage.setItem('chatoborona.reloaded', String(Date.now()));
    location.reload();
  };
  const check = async () => {
    try {
      const current = await filesFingerprint();
      if (fingerprint === null) fingerprint = current;
      if (current !== fingerprint) prepare();
    } catch (error) {
      return;
    }
  };
  check();
  setInterval(check, UPDATE_CHECK_SECONDS * 1000);
  setInterval(reload, RELOAD_CHECK_MS);
}

function run(view) {
  let settings = fromQuery(location.search);
  let live = !EMBEDDED;
  let demo = null;
  let pausedByHiding = false;
  const storage = browserStorage();
  const profilesFor = (channel) => new Profiles(storage, 'chatoborona.players.' + (channel || '_'));
  const game = new Game(settings, profilesFor(settings.channel));
  const chat = new TwitchChat({
    channel: settings.channel,
    onMessage: (name, text, mod, details) => game.feed(name, text, Object.assign({ mod }, details)),
  });
  view.use(settings);
  if (!live) demo = demoGame(settings);

  let stepped = performance.now();
  setInterval(() => {
    const now = performance.now();
    if (live) game.step((now - stepped) / 1000);
    stepped = now;
  }, STEP_MS);
  let drawn = performance.now();
  const frame = (now) => {
    if (now - drawn < FRAME_MIN_MS) {
      requestAnimationFrame(frame);
      return;
    }
    const dt = Math.max(0, Math.min(FRAME_MAX, (now - drawn) / 1000));
    drawn = now;
    view.frame(live ? game : demo, dt, !live);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  const show = () => {
    if (game.state === 'stopped') game.open();
    else if (pausedByHiding) game.setPaused(false);
    pausedByHiding = false;
  };
  const hide = () => {
    if (game.setPaused(true)) pausedByHiding = true;
  };

  window.chatoborona = {
    game,
    chat,
    view,
    playSounds: playAll,
    get live() {
      return live;
    },
    apply(next) {
      next = clean(next);
      if (next.channel !== settings.channel) {
        chat.setChannel(next.channel);
        game.profiles = profilesFor(next.channel);
      }
      settings = next;
      game.configure(settings);
      view.use(settings);
      if (!live) demo = demoGame(settings);
    },
    start() {
      live = true;
      chat.start();
      game.stop();
      game.open();
    },
    stop() {
      live = false;
      game.stop();
      chat.stop();
      demo = demoGame(settings);
    },
    pause() {
      return game.pause();
    },
    reset() {
      game.resetScores();
    },
  };
  if (EMBEDDED) return;
  chat.start();
  watchVisibility(show, hide);
  watchUpdates(() => game.state === 'over' || game.state === 'stopped' || game.state === 'lobby'
    && game.members.size === 0);
}

run(new View());
