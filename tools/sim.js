import { Game, Profiles } from '../site/js/engine.js';
import { CLASSES } from '../site/js/classes.js';
import { UPGRADE_PRICE, weaponScore } from '../site/js/gacha.js';
import * as gachaRules from '../site/js/gacha.js';
import * as balance from '../site/js/balance.js';

export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SETTINGS = { lobby: 1, first_wave: 1, wave_pause: 20, chat_commands: true, reset_mode: 'never' };
const THINK = 1;
const LIMIT = 4 * 3600;

export function tune(changes) {
  const undo = [];
  for (const [group, values] of Object.entries(changes || {})) {
    const target = group in balance ? balance[group] : gachaRules[group];
    undo.push([target, Object.fromEntries(Object.keys(values).map((key) => [key, target[key]]))]);
    Object.assign(target, values);
  }
  return () => undo.reverse().forEach(([target, values]) => Object.assign(target, values));
}

export function runGame({ seed = 1, levels = [1], classes = [], pause = 20, gacha = true }) {
  const random = seeded(seed);
  const profiles = new Profiles();
  const game = new Game(Object.assign({}, SETTINGS, { wave_pause: pause }), profiles,
    { random, clock: () => 0, quiet: true });
  levels.forEach((level, i) => profiles.data.set('p' + i, { name: 'p' + i, xp: balance.xpForLevel(level), kills: 0,
    assists: 0 }));
  game.open();
  const members = levels.map((level, i) => game.join('p' + i));
  members.forEach((m, i) => {
    m.cls = classes[i] || m.cls;
  });
  const start = members.map((m) => ({ xp: m.xp, level: balance.levelOf(m.xp) }));
  let clock = 0, spins = 0, upgrades = 0, thought = 0, wave = 0, waveStart = 0, longest = 0;
  const bosses = new Map(), log = [];
  let row = null;
  while (game.state !== 'over' && clock < LIMIT) {
    game.step(balance.TICK);
    clock += balance.TICK;
    if (game.battle) {
      for (const mob of game.battle.mobs) if (mob.info.boss && !bosses.has(mob)) bosses.set(mob, game.wave);
    }
    if (game.state === 'wave' && game.wave !== wave) {
      wave = game.wave;
      waveStart = clock;
      row = { wave, time: 0, lives: game.battle.lives, lost: 0, alive: 0, held: 0, wild: false, seen: new Set() };
      log.push(row);
    }
    if (row && game.state === 'wave') {
      row.time = clock - waveStart;
      row.lost = row.lives - game.battle.lives;
      row.wild = row.wild || game.battle.wild;
      for (const mob of game.battle.mobs) {
        if (mob.dead) continue;
        row.seen.add(mob.id);
        row.alive += balance.TICK;
        if (mob.wall) row.held += balance.TICK;
      }
    }
    if (game.state === 'wave') longest = Math.max(longest, clock - waveStart);
    if (!gacha || clock - thought < THINK) continue;
    thought = clock;
    for (const m of members) {
      if (m.weapon && m.coins >= UPGRADE_PRICE + game.price && game.improve(m) === 'upgraded') upgrades += 1;
      if (m.coins >= game.price && game.order(m) === 'queued') spins += 1;
    }
  }
  const r = game.results || { passed: game.wave - 1, time: clock };
  return {
    passed: r.passed,
    duration: r.time,
    spins,
    upgrades,
    longest,
    log: log.map((item) => Object.assign({}, item, { seen: undefined, mobs: item.seen.size })),
    bosses: Array.from(bosses, ([mob, at]) => ({ wave: at, killed: mob.dead && mob.hp <= 0,
      risen: Boolean(mob.risen) })),
    effects: game.run.effects.map((e) => e.id),
    weapons: members.map((m) => (m.weapon ? weaponScore(m.weapon) : 0)),
    players: members.map((m, i) => ({
      cls: m.cls, from: start[i].level, to: balance.levelOf(m.xp), xp: m.xp - start[i].xp,
      kills: m.tower ? m.tower.run.kills : 0, assists: m.tower ? m.tower.run.assists : 0,
      damage: m.tower ? m.tower.run.damage : 0, coins: m.tower ? m.tower.run.coins : 0,
    })),
  };
}

export function batch({ seeds = [1], levels, classes = [], pause = 20, gacha = true, changes = null, detail = false }) {
  const undo = tune(changes);
  const started = performance.now();
  const games = seeds.map((seed) => runGame({ seed, levels, classes, pause, gacha }));
  undo();
  const mean = (pick) => games.reduce((sum, g) => sum + pick(g), 0) / games.length;
  const perPlayer = (pick) => mean((g) => g.players.reduce((s, p) => s + pick(p), 0) / g.players.length);
  const result = {
    games: games.length,
    passed: mean((g) => g.passed),
    passedMin: Math.min(...games.map((g) => g.passed)),
    passedMax: Math.max(...games.map((g) => g.passed)),
    minutes: mean((g) => g.duration) / 60,
    xpPerHour: mean((g) => g.players.reduce((s, p) => s + p.xp, 0) / g.players.length / (g.duration / 3600)),
    coinsPerHour: mean((g) => g.players.reduce((s, p) => s + p.coins, 0) / g.players.length / (g.duration / 3600)),
    spinsPerPlayer: mean((g) => g.spins / g.players.length),
    levelUp: perPlayer((p) => p.to - p.from),
    ms: performance.now() - started,
  };
  if (detail) result.list = games;
  return result;
}

export function compare({ seeds = [1], level = 1, size = 10, forced = 3, gacha = false, changes = null }) {
  const undo = tune(changes);
  const rows = [];
  for (const cls of CLASSES) {
    const games = seeds.map((seed) => runGame({ seed, levels: Array(size).fill(level),
      classes: Array(forced).fill(cls.id), gacha }));
    const mine = games.flatMap((g) => g.players.filter((p, i) => i < forced));
    const all = games.flatMap((g) => g.players);
    const share = (pick) => mine.reduce((s, p) => s + pick(p), 0) / Math.max(1e-9, all.reduce((s, p) => s + pick(p), 0))
      * size / forced;
    rows.push({
      cls: cls.id,
      passed: games.reduce((s, g) => s + g.passed, 0) / games.length,
      minutes: games.reduce((s, g) => s + g.duration, 0) / games.length / 60,
      damageShare: share((p) => p.damage),
      xpShare: share((p) => p.xp),
      killShare: share((p) => p.kills),
    });
  }
  undo();
  return rows;
}

window.sim = { batch, compare, runGame, tune, seeded, balance, CLASSES };
window.__simReady = true;
