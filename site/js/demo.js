import { clean } from './config.js';
import { Game, Profiles } from './engine.js';
import { TICK, xpForLevel } from './balance.js';
import { RARITIES, makeWeapon } from './gacha.js';
import { effectOf } from './events.js';

const PLAYERS = [['Ветерок', 34], ['kotoboy', 12], ['Mira_Lis', 57], ['Тихоня', 8], ['pixel_hunter', 23], ['Сова', 71],
  ['dr_Groove', 3], ['Лёша_К', 41], ['NightOwl77', 16], ['Марго', 29], ['bublik', 5], ['Gera', 88], ['Ёжик', 19],
  ['sunny_day', 46]];
const CLASSES = [['Тихоня', 'earth'], ['kotoboy', 'miner'], ['bublik', 'parasite'], ['sunny_day', 'pyro'],
  ['dr_Groove', 'frost'], ['NightOwl77', 'alchemist']];
const WAVE = 8;
const INTO_WAVE = 9;
const SEED = 29;

function addMods(total, mods) {
  for (const key of Object.keys(mods)) total[key] += mods[key];
}

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function demoGame(settings) {
  const random = seeded(SEED), profiles = new Profiles();
  for (const [name, level] of PLAYERS) {
    profiles.data.set(name.toLowerCase(), { name, xp: xpForLevel(level), kills: level * 13, assists: level * 31 });
  }
  profiles.best = { waves: 31, at: 0, players: PLAYERS.length };
  const game = new Game(clean(Object.assign({}, settings, { lobby: 10, first_wave: 5 })), profiles,
    { random, clock: () => 0 });
  game.open();
  for (const [name] of PLAYERS) game.join(name.toLowerCase(), name);
  for (const [name, cls] of CLASSES) game.members.get(name.toLowerCase()).cls = cls;
  while (!(game.state === 'wave' && game.wave === WAVE)) game.step(TICK);
  for (let t = 0; t < INTO_WAVE; t += TICK) game.step(TICK);
  const member = (name) => game.members.get(name.toLowerCase());
  for (const [name, rarity] of [['Gera', 4], ['Сова', 3], ['Ветерок', 2], ['Лёша_К', 1], ['sunny_day', 0]]) {
    member(name).weapon = makeWeapon(random, member(name).cls, RARITIES[rarity]);
    game._refresh(member(name));
  }
  member('Ёжик').coins = 85;
  member('Ёжик').weapon = makeWeapon(random, member('Ёжик').cls, RARITIES[1]);
  member('Gera').weapon = makeWeapon(random, member('Gera').cls, RARITIES[RARITIES.length - 1]);
  game._refresh(member('Gera'));
  game.slots = [
    { id: 1, login: 'gera', outcome: { kind: 'weapon', weapon: member('Gera').weapon }, phase: 'show', left: 5,
      took: true },
    { id: 2, login: 'марго', outcome: { kind: 'weapon', weapon: makeWeapon(random, member('Марго').cls) },
      phase: 'spin', left: 1.4 },
    null,
  ];
  game.run.now = [Object.assign({ kind: 'buff' }, effectOf('buff', 'fury'))];
  game.run.next = [Object.assign({ kind: 'debuff' }, effectOf('debuff', 'tired'))];
  game.run.effects = [{ kind: 'blessing', id: 'wrath' }];
  addMods(game.run.mods, effectOf('blessing', 'wrath').mods);
  for (const m of game.members.values()) game._refresh(m);
  game.queue = [{ login: 'kotoboy', count: 2 }];
  game.notes = [{ kind: 'card', login: 'ёжик', left: 8, since: 0, detail: { brief: false }, id: 1 }];
  game.events.length = 0;
  game.battle.events.length = 0;
  return game;
}
