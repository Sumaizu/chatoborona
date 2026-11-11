export const SIZE = 20;
export const LETTERS = 'АБВГДЕЖЗИКЛМНОПРСТУФ';

const NODES = SIZE / 2;
const STEPS_MIN = 32;
const STEPS_MAX = 36;
const BUDGET = 4000;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const FORK = { min: 3, good: 5, max: 9 };
const RIVER = { chance: 0.65, bridge: 6, length: 10, bridges: 3 };
const TERRAIN = { tunnel: 0.6, patches: [['mountain', [0, 3], 3, 8], ['lake', [1, 2], 3, 6]], hills: [2, 5, 2, 5],
  ridge: { chance: 0.45, length: [6, 10], turn: 0.3, wide: 0.35 }, foothills: { chance: 0.7, count: [2, 5] },
  chasm: { chance: 0.5, length: [5, 9], turn: 0.25 }, ruins: { chance: 0.35, size: [2, 4] },
  craters: { chance: 0.4, count: [1, 3] }, relic: 0.35, watches: [1, 3], watchGap: 3, spots: 120 };
const RELICS = { grass: 'stones', snow: 'stones', swamp: 'stones', desert: 'bones', volcano: 'bones',
  graveyard: 'crypt' };
export const BIOMES = ['grass', 'volcano', 'swamp', 'snow', 'desert', 'graveyard'];
const LOOKALIKE = new Map([['a', 'а'], ['b', 'в'], ['e', 'е'], ['k', 'к'], ['m', 'м'], ['h', 'н'], ['o', 'о'],
  ['p', 'р'], ['c', 'с'], ['t', 'т'], ['y', 'у']]);
const LOWER = LETTERS.toLowerCase();

export const cellName = (x, y) => LETTERS[x] + (y + 1);
export const inside = (x, y) => x >= 0 && y >= 0 && x < SIZE && y < SIZE;

export function parseCell(text) {
  const raw = String(text == null ? '' : text).trim().toLowerCase().replace(/^!/, '').replace(/\s+/g, '');
  const match = /^(\D)(\d{1,2})$/u.exec(raw) || /^(\d{1,2})(\D)$/u.exec(raw);
  if (!match) return null;
  const letter = /\d/.test(match[1]) ? match[2] : match[1];
  const number = Number(/\d/.test(match[1]) ? match[1] : match[2]);
  const x = LOWER.indexOf(LOOKALIKE.has(letter) ? LOOKALIKE.get(letter) : letter);
  if (x < 0 || number < 1 || number > SIZE) return null;
  return { x, y: number - 1 };
}

export function parseMove(text) {
  const parts = String(text == null ? '' : text).trim().split(/\s+/);
  if (parts.length !== 2) return null;
  const from = parseCell(parts[0]), to = parseCell(parts[1]);
  return from && to ? { from, to } : null;
}

function shuffled(items, random) {
  const list = items.slice();
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function reachesEnd(seen, from) {
  const queue = [from], marked = new Uint8Array(NODES * NODES);
  marked[from] = 1;
  while (queue.length) {
    const at = queue.pop(), x = at % NODES, y = (at - x) / NODES;
    if (x === NODES - 1) return true;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy, next = ny * NODES + nx;
      if (nx < 0 || ny < 0 || nx >= NODES || ny >= NODES || seen[next] || marked[next]) continue;
      marked[next] = 1;
      queue.push(next);
    }
  }
  return false;
}

function walk(random) {
  const seen = new Uint8Array(NODES * NODES), route = [Math.floor(random() * NODES) * NODES];
  seen[route[0]] = 1;
  let budget = BUDGET;
  const go = () => {
    if (--budget < 0) return false;
    const at = route[route.length - 1], x = at % NODES, y = (at - x) / NODES, steps = route.length - 1;
    if (x === NODES - 1) return steps >= STEPS_MIN;
    if (steps + NODES - 1 - x > STEPS_MAX) return false;
    for (const [dx, dy] of shuffled(DIRS, random)) {
      const nx = x + dx, ny = y + dy, next = ny * NODES + nx;
      if (nx < 0 || ny < 0 || nx >= NODES || ny >= NODES || seen[next]) continue;
      if (nx === NODES - 1 && steps + 1 < STEPS_MIN) continue;
      seen[next] = 1;
      route.push(next);
      if ((nx === NODES - 1 || reachesEnd(seen, next)) && go()) return true;
      seen[next] = 0;
      route.pop();
    }
    return false;
  };
  return go() ? route.map((at) => [at % NODES, (at - at % NODES) / NODES]) : null;
}

function expand(nodes) {
  const cells = [[0, nodes[0][1] * 2 + 1]];
  nodes.forEach(([x, y], i) => {
    cells.push([x * 2 + 1, y * 2 + 1]);
    const next = nodes[i + 1];
    if (next) cells.push([x * 2 + 1 + next[0] - x, y * 2 + 1 + next[1] - y]);
  });
  return cells;
}

function turner(random) {
  const swap = random() < 0.5, flipX = random() < 0.5, flipY = random() < 0.5;
  return (cells) => cells.map(([x, y]) => {
    let a = swap ? y : x, b = swap ? x : y;
    if (flipX) a = SIZE - 1 - a;
    if (flipY) b = SIZE - 1 - b;
    return [a, b];
  });
}

function forkOf(nodes, random) {
  const key = ([x, y]) => y * NODES + x, used = new Set(nodes.map(key));
  const from = Math.floor(nodes.length * 0.35), to = Math.floor(nodes.length * 0.6);
  for (const at of shuffled(Array.from({ length: to - from + 1 }, (_, i) => from + i), random)) {
    const start = nodes[at], parent = new Map([[key(start), null]]), queue = [start], ends = [];
    while (queue.length) {
      const node = queue.shift(), depth = node[2] || 0;
      if (depth >= FORK.min && (node[0] === 0 || node[1] === 0 || node[1] === NODES - 1) && node[0] < NODES - 1) {
        ends.push(node);
      }
      if (depth >= FORK.max) continue;
      for (const [dx, dy] of shuffled(DIRS, random)) {
        const next = [node[0] + dx, node[1] + dy, depth + 1], k = key(next);
        if (next[0] < 0 || next[1] < 0 || next[0] >= NODES || next[1] >= NODES || used.has(k) || parent.has(k)) {
          continue;
        }
        parent.set(k, node);
        queue.push(next);
      }
    }
    if (!ends.length) continue;
    const longest = Math.max(...ends.map((node) => node[2]));
    const fits = ends.filter((node) => node[2] >= Math.min(longest, FORK.good));
    let node = fits[Math.floor(random() * fits.length)];
    const list = [];
    while (node && key(node) !== key(start)) {
      list.push([node[0], node[1]]);
      node = parent.get(key(node));
    }
    return { at, nodes: list };
  }
  return null;
}

function forkCells(fork, merge) {
  const first = fork.nodes[0], cells = [];
  if (first[1] === 0) cells.push([first[0] * 2 + 1, 0]);
  else if (first[0] === 0) cells.push([0, first[1] * 2 + 1]);
  fork.nodes.forEach(([x, y], i) => {
    cells.push([x * 2 + 1, y * 2 + 1]);
    const next = fork.nodes[i + 1] || merge;
    cells.push([x * 2 + 1 + next[0] - x, y * 2 + 1 + next[1] - y]);
  });
  return cells;
}

function grow(tiles, seed, size, kind, open, random) {
  const grown = [seed];
  tiles[seed] = kind;
  for (let tries = 0; grown.length < size && tries < size * 12; tries++) {
    const at = grown[Math.floor(random() * grown.length)], [dx, dy] = DIRS[Math.floor(random() * 4)];
    const x = at % SIZE + dx, y = Math.floor(at / SIZE) + dy, next = y * SIZE + x;
    if (!inside(x, y) || !open(next)) continue;
    tiles[next] = kind;
    grown.push(next);
  }
  return grown;
}

function around(at, each) {
  const x0 = at % SIZE, y0 = Math.floor(at / SIZE);
  for (let y = y0 - 1; y <= y0 + 1; y++) {
    for (let x = x0 - 1; x <= x0 + 1; x++) if (inside(x, y) && (x !== x0 || y !== y0)) each(y * SIZE + x);
  }
}

function axes(path, branch) {
  const axis = new Map();
  for (const route of [path, branch]) {
    route.forEach(([x, y], i) => {
      const a = route[i - 1], b = route[i + 1], at = y * SIZE + x;
      if (!a || !b || axis.has(at)) {
        axis.set(at, '');
        return;
      }
      axis.set(at, a[1] === y && b[1] === y ? 'x' : a[0] === x && b[0] === x ? 'y' : '');
    });
  }
  return axis;
}

function riverOf(tiles, road, axis, calm, random) {
  const side = Math.floor(random() * 4), edge = (at, s) => {
    const x = at % SIZE, y = Math.floor(at / SIZE);
    return [y === 0, y === SIZE - 1, x === 0, x === SIZE - 1][s];
  };
  const flows = (at) => !road.has(at) && calm(at) && (!tiles[at] || tiles[at] === 'lake');
  const starts = [];
  for (let at = 0; at < SIZE * SIZE; at++) if (edge(at, side) && flows(at)) starts.push(at);
  if (!starts.length) return null;
  const weight = Array.from({ length: SIZE * SIZE }, () => 1 + random() * 3);
  const cost = new Float64Array(SIZE * SIZE).fill(Infinity), from = new Int32Array(SIZE * SIZE).fill(-1);
  const over = new Int32Array(SIZE * SIZE).fill(-1), done = new Uint8Array(SIZE * SIZE);
  const start = starts[Math.floor(random() * starts.length)];
  cost[start] = 0;
  for (;;) {
    let at = -1;
    for (let i = 0; i < SIZE * SIZE; i++) {
      if (!done[i] && cost[i] < Infinity && (at < 0 || cost[i] < cost[at])) at = i;
    }
    if (at < 0) break;
    done[at] = 1;
    const x = at % SIZE, y = Math.floor(at / SIZE);
    for (const [dx, dy] of DIRS) {
      let nx = x + dx, ny = y + dy, bridge = -1, extra = 0;
      if (!inside(nx, ny)) continue;
      if (road.has(ny * SIZE + nx)) {
        const cross = ny * SIZE + nx;
        if (axis.get(cross) !== (dx ? 'y' : 'x') || tiles[cross]) continue;
        bridge = cross;
        nx += dx;
        ny += dy;
        extra = RIVER.bridge;
        if (!inside(nx, ny)) continue;
      }
      const next = ny * SIZE + nx;
      if (done[next] || !flows(next)) continue;
      const value = cost[at] + weight[next] + extra;
      if (value < cost[next]) {
        cost[next] = value;
        from[next] = at;
        over[next] = bridge;
      }
    }
  }
  const opposite = [1, 0, 3, 2][side];
  let end = -1;
  for (let at = 0; at < SIZE * SIZE; at++) {
    if (edge(at, opposite) && cost[at] < Infinity && (end < 0 || cost[at] < cost[end])) end = at;
  }
  if (end < 0) return null;
  const cells = [], bridges = [];
  for (let at = end; at >= 0; at = from[at]) {
    cells.push(at);
    if (over[at] >= 0) {
      cells.push(over[at]);
      bridges.push(over[at]);
    }
  }
  cells.reverse();
  if (cells.length < RIVER.length || bridges.length > RIVER.bridges) return null;
  return { cells, bridges };
}

function ridgeOf(tiles, start, open, random) {
  const { length, turn, wide } = TERRAIN.ridge, size = length[0] + Math.floor(random() * (length[1] - length[0] + 1));
  let at = start, [dx, dy] = DIRS[Math.floor(random() * 4)];
  tiles[at] = 'mountain';
  for (let n = 1; n < size; n++) {
    if (random() < turn) [dx, dy] = random() < 0.5 ? [dy, -dx] : [-dy, dx];
    const x = at % SIZE + dx, y = Math.floor(at / SIZE) + dy, next = y * SIZE + x;
    if (!inside(x, y) || !open(next)) break;
    tiles[next] = 'mountain';
    at = next;
    if (random() < wide) {
      const sx = x + dy, sy = y + dx, side = sy * SIZE + sx;
      if (inside(sx, sy) && open(side)) tiles[side] = 'mountain';
    }
  }
}

function chasmOf(tiles, road, axis, open, random) {
  const { length, turn } = TERRAIN.chasm, size = length[0] + Math.floor(random() * (length[1] - length[0] + 1));
  const starts = [];
  for (let at = 0; at < SIZE * SIZE; at++) if (open(at)) starts.push(at);
  if (!starts.length) return;
  let at = starts[Math.floor(random() * starts.length)], [dx, dy] = DIRS[Math.floor(random() * 4)];
  const cells = [at], bridges = [];
  while (cells.length < size) {
    if (random() < turn) [dx, dy] = random() < 0.5 ? [dy, -dx] : [-dy, dx];
    let x = at % SIZE + dx, y = Math.floor(at / SIZE) + dy;
    if (!inside(x, y)) break;
    if (road.has(y * SIZE + x)) {
      const cross = y * SIZE + x;
      if (bridges.length || axis.get(cross) !== (dx ? 'y' : 'x') || tiles[cross]) break;
      x += dx;
      y += dy;
      if (!inside(x, y) || !open(y * SIZE + x)) break;
      bridges.push(cross);
    }
    const next = y * SIZE + x;
    if (!open(next)) break;
    cells.push(next);
    at = next;
  }
  if (cells.length < 4) return;
  for (const cell of cells) tiles[cell] = 'chasm';
  for (const cell of bridges) tiles[cell] = 'bridge';
}

function terrain(path, branch, merge, random, biome) {
  const tiles = new Array(SIZE * SIZE).fill(''), road = new Set(path.concat(branch).map(([x, y]) => y * SIZE + x));
  const heart = path[path.length - 1], near = new Set();
  road.forEach((at) => around(at, (next) => near.add(next)));
  const calm = (at) => Math.max(Math.abs(at % SIZE - heart[0]), Math.abs(Math.floor(at / SIZE) - heart[1])) > 2;
  const open = (at) => !road.has(at) && !tiles[at] && calm(at);
  const tunnel = (cells) => {
    for (const [x, y] of cells) tiles[y * SIZE + x] = 'tunnel';
    for (const [x, y] of cells) around(y * SIZE + x, (at) => {
      if (open(at)) tiles[at] = 'mountain';
    });
  };
  tunnel(path.slice(0, 2));
  if (branch.length) tunnel(branch.slice(0, 2));
  const straight = [];
  for (let i = merge + 3; i < path.length - 6; i++) {
    const [a, b, c] = [path[i - 1], path[i], path[i + 1]];
    if (a[0] - b[0] === b[0] - c[0] && a[1] - b[1] === b[1] - c[1]) straight.push(i);
  }
  if (straight.length && random() < TERRAIN.tunnel) {
    const i = straight[Math.floor(random() * straight.length)];
    tunnel(path.slice(i - 1, i + 2));
  }
  const free = () => {
    const cells = [];
    for (let at = 0; at < SIZE * SIZE; at++) if (open(at)) cells.push(at);
    return cells;
  };
  const pick = (list) => list[Math.floor(random() * list.length)];
  for (const [kind, count, low, high] of TERRAIN.patches) {
    const times = count[0] + Math.floor(random() * (count[1] - count[0] + 1));
    for (let n = 0; n < times; n++) {
      const cells = free();
      if (cells.length) grow(tiles, pick(cells), low + Math.floor(random() * (high - low + 1)), kind, open, random);
    }
  }
  if (random() < TERRAIN.ridge.chance) {
    const cells = free();
    if (cells.length) ridgeOf(tiles, pick(cells), open, random);
  }
  if (random() < TERRAIN.foothills.chance) {
    const [few, many] = TERRAIN.foothills.count, slopes = [];
    const rocky = (x, y) => inside(x, y) && tiles[y * SIZE + x] === 'mountain';
    for (let at = 0; at < SIZE * SIZE; at++) {
      const x = at % SIZE, y = Math.floor(at / SIZE);
      if (open(at) && DIRS.some(([dx, dy]) => rocky(x + dx, y + dy))) slopes.push(at);
    }
    for (let n = few + Math.floor(random() * (many - few + 1)); n > 0 && slopes.length; n--) {
      tiles[slopes.splice(Math.floor(random() * slopes.length), 1)[0]] = 'hill';
    }
  }
  const rivers = [];
  if (random() < RIVER.chance) {
    const river = riverOf(tiles, road, axes(path, branch), calm, random);
    if (river) {
      for (const at of river.cells) if (!road.has(at) && tiles[at] !== 'lake') tiles[at] = 'river';
      for (const at of river.bridges) tiles[at] = 'bridge';
      rivers.push(river.cells.map((at) => [at % SIZE, Math.floor(at / SIZE)]));
    }
  }
  if (random() < TERRAIN.chasm.chance) chasmOf(tiles, road, axes(path, branch), open, random);
  if (random() < TERRAIN.ruins.chance) {
    const cells = free(), [small, big] = TERRAIN.ruins.size;
    if (cells.length) grow(tiles, pick(cells), small + Math.floor(random() * (big - small + 1)), 'ruin', open, random);
  }
  if (random() < TERRAIN.craters.chance) {
    const [few, many] = TERRAIN.craters.count;
    for (let n = few + Math.floor(random() * (many - few + 1)); n > 0; n--) {
      const cells = free();
      if (cells.length) tiles[pick(cells)] = 'crater';
    }
  }
  if (random() < TERRAIN.relic) {
    const cells = free();
    if (cells.length) tiles[pick(cells)] = RELICS[biome] || 'stones';
  }
  const [fewest, most, low, high] = TERRAIN.hills, count = fewest + Math.floor(random() * (most - fewest + 1));
  for (let n = 0; n < count; n++) {
    const seeds = free().filter((at) => near.has(at));
    if (seeds.length) grow(tiles, pick(seeds), low + Math.floor(random() * (high - low + 1)), 'hill', open, random);
  }
  const [few, many] = TERRAIN.watches, watches = few + Math.floor(random() * (many - few + 1)), placed = [];
  const apart = (at) => placed.every((other) => Math.max(Math.abs(other % SIZE - at % SIZE),
    Math.abs(Math.floor(other / SIZE) - Math.floor(at / SIZE))) > TERRAIN.watchGap);
  for (let n = 0; n < watches; n++) {
    const seeds = free().filter((at) => near.has(at) && apart(at));
    if (!seeds.length) break;
    const at = pick(seeds);
    tiles[at] = 'watch';
    placed.push(at);
  }
  return { tiles, rivers };
}

export function makeMap(random = Math.random) {
  for (;;) {
    const nodes = walk(random);
    const fork = nodes && forkOf(nodes, random);
    if (!fork) continue;
    const path = expand(nodes), mergeCell = [nodes[fork.at][0] * 2 + 1, nodes[fork.at][1] * 2 + 1];
    const merge = path.findIndex(([x, y]) => x === mergeCell[0] && y === mergeCell[1]);
    const biome = BIOMES[Math.floor(random() * BIOMES.length)];
    const branch = forkCells(fork, nodes[fork.at]), { tiles, rivers } = terrain(path, branch, merge, random, biome);
    const spots = new Set();
    const road = new Set(path.concat(branch).map(([x, y]) => y * SIZE + x));
    const stand = (tile) => !tile || tile === 'hill' || tile === 'watch' || biome === 'snow'
      && (tile === 'lake' || tile === 'river');
    road.forEach((at) => around(at, (next) => {
      if (!road.has(next) && stand(tiles[next])) spots.add(next);
    }));
    if (spots.size < TERRAIN.spots) continue;
    const turn = turner(random);
    const flat = turn(Array.from({ length: SIZE * SIZE }, (_, at) => [at % SIZE, Math.floor(at / SIZE)]));
    const turned = new Array(SIZE * SIZE).fill('');
    flat.forEach(([x, y], at) => {
      turned[y * SIZE + x] = tiles[at];
    });
    return { path: turn(path), branch: turn(branch), merge, tiles: turned, biome, rivers: rivers.map(turn) };
  }
}

export function pathCells(path) {
  return new Set(path.map(([x, y]) => y * SIZE + x));
}

export function coverage(path, range) {
  const score = new Float64Array(SIZE * SIZE);
  reach(path, range).forEach((list, at) => {
    score[at] = list.length;
  });
  return score;
}

export function reach(path, range) {
  const lists = Array.from({ length: SIZE * SIZE }, () => []), r2 = range * range, from = Math.floor(range);
  path.forEach(([px, py], i) => {
    for (let y = py - from; y <= py + from; y++) {
      for (let x = px - from; x <= px + from; x++) {
        if (inside(x, y) && (x - px) * (x - px) + (y - py) * (y - py) <= r2) lists[y * SIZE + x].push(i);
      }
    }
  });
  return lists;
}
