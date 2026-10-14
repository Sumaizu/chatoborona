import { clean } from '../../site/js/config.js';
import { Game, Profiles } from '../../site/js/engine.js';
import { Battle } from '../../site/js/battle.js';
import { TICK } from '../../site/js/balance.js';

export const PLAIN = { lobby: 30, first_wave: 10, wave_pause: 5 };
export const STRAIGHT = Array.from({ length: 20 }, (_, x) => [x, 5]);

export function seeded(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function fakeClock(start = 1000) {
  const clock = () => clock.t;
  clock.t = start;
  return clock;
}

export function memoryStorage() {
  const data = new Map();
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => { data.set(key, String(value)); },
    removeItem: (key) => { data.delete(key); },
  };
}

export const player = (xp = 0) => ({ xp, kills: 0, assists: 0, coins: 0 });

export function makeBattle(options = {}) {
  return new Battle(options.path || STRAIGHT, Object.assign({ random: seeded(7) }, options));
}

export function runFor(target, seconds) {
  const steps = Math.round(seconds / TICK);
  for (let i = 0; i < steps; i++) target.step(TICK);
}

export function makeGame({ settings = {}, storage = null, seed = 3, at = 1000 } = {}) {
  const clock = fakeClock(at);
  const profiles = new Profiles(storage, 'chatoborona.players.test');
  const game = new Game(clean(Object.assign({}, PLAIN, settings)), profiles, { random: seeded(seed), clock });
  return { game, clock, profiles };
}

export function until(game, check, limit = 3600) {
  const steps = Math.round(limit / TICK);
  for (let i = 0; i < steps; i++) {
    if (check()) return true;
    game.step(TICK);
  }
  return check();
}
