export const SIZE = 20;
export const LETTERS = 'АБВГДЕЖЗИКЛМНОПРСТУФ';

const NODES = SIZE / 2;
const STEPS_MIN = 32;
const STEPS_MAX = 36;
const BUDGET = 4000;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
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

function turn(cells, random) {
  const swap = random() < 0.5, flipX = random() < 0.5, flipY = random() < 0.5;
  return cells.map(([x, y]) => {
    let a = swap ? y : x, b = swap ? x : y;
    if (flipX) a = SIZE - 1 - a;
    if (flipY) b = SIZE - 1 - b;
    return [a, b];
  });
}

export function makePath(random = Math.random) {
  for (;;) {
    const nodes = walk(random);
    if (nodes) return turn(expand(nodes), random);
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
