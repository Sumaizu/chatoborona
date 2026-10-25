import { SIZE, inside } from './field.js';
import { WATCH_TOP, drawRelic, drawRuin, drawWatch } from './props.js';

export const CELL = 30;
export const EDGE = 16;

const at = (v) => EDGE + v * CELL;
const BOARD_SIDE = EDGE * 2 + CELL * SIZE;
const ROUND = 0.9;
const SLAB = 10;

const LOOKS = {
  grass: {
    ground: ['#2f4a2b', '#33502e', '#2b4528'], specks: ['#3f6534', '#4f7a3a', '#26401f'], tuft: '#5e8c43',
    bloom: ['#e8d96a', '#f4f4f4'], grid: 'rgba(0, 0, 0, .14)', road: 'dirt', water: 'water', worn: '#4a4630',
    bits: { colors: ['#f4f4f4', '#f7e08a', '#f7a8c8', '#6fa84a', '#6fa84a'], share: 0.35 },
    rock: { color: '#7d7468', foot: '#4f7a3a' }, hill: { color: '#5d8f42', decor: 'tufts', tuft: '#8fc35a' },
    ruin: { stones: ['#8d877c', '#9a9284', '#7f786c'], gap: '#3d5a30' },
    chasm: { wall: '#6b5a44', deep: '#0a0807', lip: '#3f6a2f' },
    crater: { rim: '#6b5a3c', floor: '#4a3b28', scorch: '#1d2416' },
  },
  volcano: {
    ground: ['#2b2326', '#30272a', '#272022'], specks: ['#3a3032', '#463a3b', '#1f191b'], tuft: null,
    bloom: ['#ff6a1f'], grid: 'rgba(0, 0, 0, .2)', road: 'basalt', water: 'lava', cracks: '#ff6a1f', worn: '#3d3639',
    bits: { colors: ['#5a5052', '#4a4043', '#6b5f60', '#ff7a1f'], share: 0.45 },
    rock: { color: '#3d3336', lava: true }, hill: { color: '#4a4043', decor: 'embers', tuft: '#ff7a1f' },
    ruin: { stones: ['#4a4143', '#544a4c', '#3f3739'], gap: '#7a2a10' },
    chasm: { wall: '#3d3336', deep: '#1a0d0a', lip: '#1f191b', glow: '#ff6a1f' },
    crater: { rim: '#3d3336', floor: '#2a2224', core: '#ff6a1f', scorch: '#120d0e' },
  },
  swamp: {
    ground: ['#27342b', '#2c3a2f', '#232f27'], specks: ['#344636', '#3d5238', '#1e2a22'], tuft: '#6b7f3f',
    bloom: ['#9fbf5a'], grid: 'rgba(0, 0, 0, .16)', road: 'mire', water: 'bog', worn: '#1c2620',
    bits: { colors: ['#c8d86a', '#4f6a36', '#5f7f3a', '#2a3a2a'], share: 0.4 },
    rock: { color: '#676b5f', foot: '#3d5a36' }, hill: { color: '#3d5c35', decor: 'reeds', tuft: '#8a9a4a' },
    ruin: { stones: ['#6e7262', '#7a7e6c', '#63675a'], gap: '#3d5a2c' },
    chasm: { wall: '#4f4a36', deep: '#0b100b', lip: '#4f6a30', glow: '#5f8a3e' },
    crater: { rim: '#4a4a30', floor: '#33331f', core: '#2f4a2a', scorch: '#161f17' },
  },
  snow: {
    ground: ['#aebdd0', '#b7c5d7', '#a7b6c9'], specks: ['#c9d5e4', '#ffffff', '#95a6bb'], tuft: null,
    bloom: ['#ffffff'], grid: 'rgba(40, 60, 90, .16)', road: 'trail', water: 'ice', worn: '#d3dde9',
    bits: { colors: ['#ffffff', '#ffffff', '#95a6bb', '#dfe9f5'], share: 0.4 }, drifts: ['#f4f8ff', '#94a5ba'],
    rock: { color: '#6d7888', cap: '#f2f6fc' }, hill: { color: '#e4edf8', decor: 'sparkle', tuft: '#ffffff' },
    ruin: { stones: ['#9aa7b8', '#a7b4c4', '#8d9aac'], gap: '#e4edf8' },
    chasm: { wall: '#7d97b8', deep: '#0e1a2e', lip: '#f2f6fc', glow: '#7fd4ff' },
    crater: { rim: '#c6d3e3', floor: '#9fb0c6', core: '#c4e3f6', scorch: '#8fa1b7' },
  },
  desert: {
    ground: ['#b08a54', '#b9935b', '#a7824e'], specks: ['#c7a46a', '#987443', '#d2b27a'], tuft: '#7a8a3f',
    bloom: ['#8e6c3d'], grid: 'rgba(60, 40, 10, .16)', road: 'flag', water: 'oasis', ripples: '#9c7a46',
    worn: '#c7a46a', bits: { colors: ['#8d7a5c', '#a8957a', '#7a6548', '#d9bd86'], share: 0.4 },
    rock: { color: '#b4683e', bands: ['#a85c35', '#c47a48', '#9a5230'] },
    hill: { color: '#c7a265', decor: 'ripples', tuft: '#a8854d' },
    ruin: { stones: ['#c9a66c', '#bf9b60', '#d1b07a'], gap: '#8a6a40' },
    chasm: { wall: '#b4683e', deep: '#1a0f08', lip: '#d2b27a' },
    crater: { rim: '#c49a5e', floor: '#9c7a46', scorch: '#8a6a40' },
  },
  graveyard: {
    ground: ['#27242d', '#2c2832', '#232029'], specks: ['#343a33', '#3a3542', '#1d1b22'], tuft: '#4d5a45',
    bloom: ['#8b8597'], grid: 'rgba(0, 0, 0, .2)', road: 'cobble', water: 'tar', graves: true, worn: '#2f2a2a',
    bits: { colors: ['#8a5a2e', '#a8662a', '#6b4a2b', '#4d5a45'], share: 0.4, w: 2 },
    rock: { color: '#cfc6ae', bones: true }, hill: { color: '#4b3e35', decor: 'cross', tuft: '#8a6a44' },
    ruin: { stones: ['#57525e', '#615c69', '#4d4954'], gap: '#3a3060' },
    chasm: { wall: '#4b4554', deep: '#07050b', lip: '#3a3542', glow: '#8b5cf6' },
    crater: { rim: '#463c35', floor: '#29231f', core: '#17131e', scorch: '#18151c' },
  },
};

const ROADS = {
  dirt: { base: '#6b5236', stones: ['#7d6343', '#735a3c', '#86704f'], size: 0, curb: '#4a3a28' },
  basalt: { base: '#2a2224', stones: ['#4a4043', '#544a4c', '#433a3c'], size: 7, curb: '#1c1617',
    glow: '#ff6a1f' },
  mire: { base: '#2c3324', stones: ['#6e7262', '#7a7e6c', '#63675a', '#6a7158'], size: 0, curb: '#232a1c',
    slabs: true, moss: '#4f6a36' },
  trail: { base: '#7f92ab', stones: ['#8c9fb8', '#95a8c0'], size: 0, curb: '#62748c', steps: true },
  flag: { base: '#8a6a40', stones: ['#c9a66c', '#bf9b60', '#d1b07a'], size: 11, curb: '#7a5c36' },
  cobble: { base: '#2f2b35', stones: ['#57525e', '#4d4954', '#615c69'], size: 6, curb: '#1d1b22',
    moss: '#4d5a45' },
};

const LIQUIDS = {
  water: { shore: '#6b5a3c', deep: '#173f66', shallow: '#3b82b6', shine: '#cfeaff', wet: '#1d2b1a' },
  lava: { shore: '#1f191b', deep: '#b8320f', shallow: '#ff8a1f', shine: '#ffe08a', mark: '#3a2522', wet: '#160f10' },
  bog: { shore: '#3a3a26', deep: '#1f2a1a', shallow: '#3f5230', shine: '#9fbf5a', mark: '#5f8a3e', wet: '#18211a' },
  ice: { shore: '#9fb0c6', deep: '#7fb2d8', shallow: '#c4e3f6', shine: '#ffffff', mark: '#eaf6ff', wet: '#8597ae' },
  oasis: { shore: '#d2b27a', deep: '#17606e', shallow: '#3fb6b0', shine: '#d6fff6', wet: '#8a6a40' },
  tar: { shore: '#3a3542', deep: '#050408', shallow: '#17131e', shine: '#8b5cf6', wet: '#15131a' },
};

const lookOf = (biome) => LOOKS[biome] || LOOKS.grass;

function hash(x, y, i) {
  const v = Math.sin(x * 127.1 + y * 311.7 + i * 74.7) * 43758.5453;
  return v - Math.floor(v);
}

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

function stone(ctx, x, y, w, h, color, light, dark) {
  px(ctx, x + 1, y, w - 2, h, color);
  px(ctx, x, y + 1, w, h - 2, color);
  px(ctx, x + 1, y, w - 2, 1, light);
  px(ctx, x, y + 1, 1, h - 3, light);
  px(ctx, x + 1, y + h - 1, w - 2, 1, dark);
  px(ctx, x + w - 1, y + 2, 1, h - 3, dark);
}

function shade(color, amount) {
  const n = parseInt(color.slice(1), 16), c = [n >> 16, n >> 8 & 255, n & 255];
  const out = c.map((v) => Math.max(0, Math.min(255, Math.round(amount > 0 ? v + (255 - v) * amount
    : v * (1 + amount)))));
  return '#' + out.map((v) => v.toString(16).padStart(2, '0')).join('');
}

function paintSoil(ctx, look) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIDE;
  const g = canvas.getContext('2d'), image = g.createImageData(SIDE, SIDE), data = image.data;
  const [base, light, dark] = look.ground.map(rgb), specks = look.specks.map(rgb), worn = look.worn && rgb(look.worn);
  for (let y = 0; y < SIDE; y++) {
    for (let x = 0; x < SIDE; x++) {
      const n = 0.55 * smooth(x, y, 46, 800) + 0.3 * smooth(x, y, 15, 801) + 0.15 * smooth(x, y, 5, 802);
      const t = Math.max(0, Math.min(1, (n - 0.25) * 2 + (DITHER[(x & 3) + (y & 1) * 4] - 0.5) * 0.18));
      const step = Math.round(t * 4) / 4;
      let color = step < 0.5 ? mixed(dark, base, step * 2) : mixed(base, light, step * 2 - 1);
      const patch = smooth(x, y, 38, 805) + (DITHER[(x & 3) + (y & 1) * 4] - 0.5) * 0.06;
      if (worn && patch > 0.7) color = mixed(color, worn, patch > 0.76 ? 0.75 : 0.4);
      if (hash(x, y, 803) < 0.018) color = specks[Math.floor(hash(x, y, 804) * specks.length)];
      const k = (y * SIDE + x) * 4;
      data[k] = color[0];
      data[k + 1] = color[1];
      data[k + 2] = color[2];
      data[k + 3] = 255;
    }
  }
  g.putImageData(image, 0, 0);
  ctx.drawImage(canvas, EDGE, EDGE);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const x0 = at(x), y0 = at(y);
      if (look.tuft && hash(x, y, 40) < 0.8) {
        const tufts = 2 + Math.floor(hash(x, y, 39) * 4), lit = shade(look.tuft, 0.25), low = shade(look.tuft, -0.3);
        for (let i = 0; i < tufts; i++) {
          const tx = x0 + 3 + hash(x, y, 41 + i) * (CELL - 8), ty = y0 + 5 + hash(x, y, 51 + i) * (CELL - 9);
          const tall = 2 + Math.floor(hash(x, y, 61 + i) * 3);
          px(ctx, tx - 2, ty + 2, 5, 1, low);
          px(ctx, tx, ty - tall + 3, 1, tall, look.tuft);
          px(ctx, tx - 1, ty + 1, 1, 2, look.tuft);
          px(ctx, tx + 1, ty + 4 - tall, 1, tall - 1, lit);
          if (tall > 3) px(ctx, tx - 2, ty, 1, 2, low);
        }
      }
      if (look.bits) {
        const { colors, share, w = 1 } = look.bits;
        for (let i = 0; i < 6; i++) {
          if (hash(x, y, 90 + i) > share) continue;
          const bx = x0 + 2 + hash(x, y, 100 + i) * (CELL - 4), by = y0 + 2 + hash(x, y, 110 + i) * (CELL - 4);
          px(ctx, bx, by, w, 1, colors[Math.floor(hash(x, y, 120 + i) * colors.length)]);
        }
      }
      if (look.drifts && hash(x, y, 130) < 0.45) {
        const dx = x0 + 3 + hash(x, y, 131) * 12, dy = y0 + 6 + hash(x, y, 132) * 18, len = 8 + hash(x, y, 133) * 8;
        for (let k = 0; k < len; k++) {
          const lift = Math.round(Math.sin(k / len * Math.PI) * 2);
          px(ctx, dx + k, dy - lift, 1, 1, look.drifts[0]);
          px(ctx, dx + k, dy - lift + 1, 1, 1, look.drifts[1]);
        }
      }
      if (look.cracks && hash(x, y, 70) < 0.3) {
        let cx = x0 + 6 + hash(x, y, 71) * 16, cy = y0 + 6 + hash(x, y, 72) * 16;
        ctx.globalAlpha = 0.55;
        for (let i = 0; i < 6; i++) {
          px(ctx, cx, cy, 1, 1, look.cracks);
          cx += hash(x, y, 73 + i) < 0.5 ? 1 : 0;
          cy += 1;
        }
        ctx.globalAlpha = 1;
      }
      if (look.ripples) {
        for (let row = 0; row < 3; row++) {
          for (let k = 0; k < CELL; k += 2) {
            const ry = y0 + 6 + row * 9 + Math.round(Math.sin((x0 + k) * 0.25 + row) * 1.5);
            if (hash(x, y, 80 + row) < 0.6) px(ctx, x0 + k, ry, 2, 1, look.ripples);
          }
        }
      }
    }
  }
}

function grave(ctx, x, y) {
  px(ctx, x - 1, y + 9, 9, 2, 'rgba(0, 0, 0, .35)');
  px(ctx, x + 1, y, 5, 10, '#6b6676');
  px(ctx, x, y + 1, 7, 9, '#6b6676');
  px(ctx, x + 1, y, 5, 1, '#8b8597');
  px(ctx, x, y + 1, 1, 8, '#8b8597');
  px(ctx, x + 6, y + 2, 1, 8, '#4b4655');
  px(ctx, x + 3, y + 2, 1, 5, '#3a3542');
  px(ctx, x + 2, y + 3, 3, 1, '#3a3542');
}

const DECOR_SHARE = 0.36;

function blob(ctx, x, y, rx, ry, color) {
  for (let dy = -ry; dy <= ry; dy++) {
    const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / (ry + 0.5)) ** 2)));
    if (half > 0) px(ctx, x - half, y + dy, half * 2, 1, color);
  }
}

function rock(color, moss) {
  const light = shade(color, 0.22), dark = shade(color, -0.32);
  return (ctx, x, y) => {
    shadow(ctx, x + 1, y + 2, 6);
    stone(ctx, x - 5, y - 4, 10, 6, color, light, dark);
    stone(ctx, x + 2, y - 1, 5, 3, color, light, dark);
    px(ctx, x - 3, y - 4, 4, 1, light);
    if (moss) px(ctx, x - 4, y - 3, 3, 1, moss);
  };
}

function shadow(ctx, x, y, rx) {
  ctx.globalAlpha = 0.22;
  blob(ctx, x, y, rx, Math.max(1, Math.round(rx / 3)), '#000000');
  ctx.globalAlpha = 1;
}

function glowAt(ctx, x, y, r, color) {
  const fill = ctx.createRadialGradient(x, y, 0, x, y, r);
  fill.addColorStop(0, color);
  fill.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = fill;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

const DECOR = {
  flowers(ctx, x, y, h) {
    const petals = ['#f5f5f5', '#f7a8c8', '#a8c8f7', '#f7e08a'];
    for (let k = 0; k < 4; k++) {
      const fx = x + Math.round((hash(h, k, 1) - 0.5) * 12), fy = y + Math.round((hash(h, k, 2) - 0.5) * 6);
      const color = petals[Math.floor(hash(h, k, 3) * petals.length)];
      px(ctx, fx, fy + 1, 1, 3, '#3f6a2f');
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) px(ctx, fx + dx, fy + dy - 1, 1, 1, color);
      px(ctx, fx, fy - 1, 1, 1, '#f2c94c');
    }
  },
  bush(ctx, x, y) {
    shadow(ctx, x, y + 3, 6);
    blob(ctx, x, y, 6, 4, '#2c5226');
    blob(ctx, x - 1, y - 1, 5, 3, '#3d7333');
    blob(ctx, x - 2, y - 2, 3, 2, '#5c9645');
    px(ctx, x + 2, y - 1, 1, 1, '#c0392b');
    px(ctx, x - 3, y + 1, 1, 1, '#c0392b');
  },
  mushroom(ctx, x, y) {
    shadow(ctx, x, y + 2, 3);
    px(ctx, x - 1, y - 2, 2, 4, '#e8dcc8');
    blob(ctx, x, y - 3, 3, 1, '#b83227');
    px(ctx, x - 1, y - 4, 1, 1, '#ffffff');
    px(ctx, x + 1, y - 3, 1, 1, '#ffffff');
  },
  pebbles(ctx, x, y, h) {
    for (let k = 0; k < 3; k++) {
      const sx = x + Math.round((hash(h, k, 4) - 0.5) * 10), sy = y + Math.round((hash(h, k, 5) - 0.5) * 5);
      stone(ctx, sx, sy, 3 + (k % 2), 2 + (k % 2), '#8d877c', '#aca598', '#5f5a50');
    }
  },
  ember(ctx, x, y, h) {
    glowAt(ctx, x, y, 7, 'rgba(255, 110, 30, .28)');
    let cx = x - 4, cy = y;
    for (let k = 0; k < 9; k++) {
      px(ctx, cx, cy, 1, 1, k % 3 ? '#ff7a1f' : '#ffc04a');
      cx += 1;
      cy += hash(h, k, 6) < 0.5 ? -1 : 1;
    }
  },
  shard(ctx, x, y) {
    shadow(ctx, x, y + 2, 4);
    for (let k = 0; k < 7; k++) px(ctx, x - Math.floor((7 - k) / 3), y - k, 1 + Math.floor((7 - k) / 2), 1, '#2a1f2e');
    px(ctx, x, y - 6, 1, 5, '#6b5a7a');
  },
  vent(ctx, x, y) {
    glowAt(ctx, x, y, 6, 'rgba(255, 90, 20, .3)');
    blob(ctx, x, y, 4, 2, '#140e10');
    px(ctx, x - 4, y, 1, 1, '#ff7a1f');
    px(ctx, x + 3, y - 1, 1, 1, '#ff9a3a');
    ctx.globalAlpha = 0.35;
    blob(ctx, x + 1, y - 6, 3, 2, '#8a8086');
    blob(ctx, x + 3, y - 10, 2, 2, '#8a8086');
    ctx.globalAlpha = 1;
  },
  reeds(ctx, x, y, h) {
    for (let k = 0; k < 4; k++) {
      const rx = x - 4 + k * 3, tall = 6 + Math.floor(hash(h, k, 7) * 4);
      px(ctx, rx, y - tall, 1, tall, '#6b8a3a');
      if (k % 2 === 0) px(ctx, rx, y - tall - 2, 1, 3, '#6b4a2b');
    }
  },
  puddle(ctx, x, y) {
    blob(ctx, x, y, 6, 2, '#1c2a1c');
    px(ctx, x - 3, y - 1, 3, 1, '#7a9a4a');
    blob(ctx, x + 3, y, 2, 1, '#4f7a3a');
  },
  log(ctx, x, y) {
    shadow(ctx, x, y + 2, 7);
    px(ctx, x - 6, y - 2, 12, 3, '#5a4028');
    px(ctx, x - 6, y - 2, 12, 1, '#7a5a38');
    blob(ctx, x + 6, y - 1, 1, 1, '#8a6a44');
    px(ctx, x - 3, y - 3, 3, 1, '#4f7a3a');
  },
  pine(ctx, x, y) {
    shadow(ctx, x, y + 1, 5);
    px(ctx, x - 1, y - 2, 2, 3, '#5a4028');
    for (let k = 0; k < 3; k++) {
      const w = 5 - k, top = y - 4 - k * 3;
      for (let r = 0; r < 3; r++) px(ctx, x - w + r, top + r, (w - r) * 2, 1, '#2f5a3a');
      px(ctx, x - w + 1, top + 2, (w - 1) * 2, 1, '#f4f8ff');
    }
  },
  crystal(ctx, x, y) {
    shadow(ctx, x, y + 2, 3);
    for (let k = 0; k < 4; k++) px(ctx, x - k, y - 6 + k, k * 2 + 1, 1, '#bfe6ff');
    for (let k = 0; k < 3; k++) px(ctx, x - 2 + k, y - 2 + k, 5 - k * 2, 1, '#9fd2f4');
    px(ctx, x, y - 5, 1, 2, '#ffffff');
  },
  snowrock(ctx, x, y) {
    stone(ctx, x - 4, y - 3, 8, 5, '#6d7888', '#8a96a6', '#4f5866');
    px(ctx, x - 3, y - 4, 6, 2, '#f4f8ff');
  },
  tracks(ctx, x, y) {
    for (let k = 0; k < 3; k++) {
      px(ctx, x - 6 + k * 5, y - (k % 2) * 3, 2, 3, '#8fa1b7');
    }
  },
  cactus(ctx, x, y) {
    shadow(ctx, x, y + 1, 4);
    px(ctx, x - 1, y - 10, 3, 11, '#4f9a3a');
    px(ctx, x - 4, y - 6, 3, 2, '#4f9a3a');
    px(ctx, x - 4, y - 9, 2, 4, '#4f9a3a');
    px(ctx, x + 2, y - 5, 3, 2, '#4f9a3a');
    px(ctx, x + 3, y - 7, 2, 3, '#4f9a3a');
    px(ctx, x, y - 9, 1, 9, '#7fc35a');
  },
  skull(ctx, x, y) {
    shadow(ctx, x, y + 1, 4);
    blob(ctx, x, y - 2, 3, 2, '#efe8d4');
    px(ctx, x - 5, y - 4, 3, 1, '#efe8d4');
    px(ctx, x + 3, y - 4, 3, 1, '#efe8d4');
    px(ctx, x - 2, y - 2, 1, 1, '#3a3028');
    px(ctx, x + 1, y - 2, 1, 1, '#3a3028');
  },
  twigs(ctx, x, y, h) {
    for (let k = 0; k < 5; k++) {
      let tx = x, ty = y;
      for (let n = 0; n < 5; n++) {
        px(ctx, tx, ty, 1, 1, '#8a6a44');
        tx += Math.round((hash(h, k * 7 + n, 8) - 0.5) * 2.4);
        ty -= 1;
      }
    }
  },
  grave(ctx, x, y) {
    grave(ctx, x - 3, y - 9);
  },
  cross(ctx, x, y) {
    shadow(ctx, x, y + 1, 3);
    px(ctx, x, y - 9, 2, 10, '#6b5040');
    px(ctx, x - 2, y - 7, 6, 2, '#6b5040');
    px(ctx, x, y - 9, 1, 10, '#8a6a54');
  },
  deadtree(ctx, x, y) {
    shadow(ctx, x, y + 1, 4);
    px(ctx, x, y - 10, 2, 11, '#3a3036');
    for (const [dx, dy, len] of [[-1, -7, 4], [2, -9, 3], [-1, -4, 3], [2, -5, 4]]) {
      for (let k = 0; k < len; k++) px(ctx, x + dx + (dx < 0 ? -k : k), y + dy - k, 1, 1, '#3a3036');
    }
  },
  candle(ctx, x, y) {
    glowAt(ctx, x, y - 5, 7, 'rgba(255, 190, 80, .3)');
    px(ctx, x - 1, y - 4, 2, 5, '#e8dcc8');
    px(ctx, x - 1, y - 6, 2, 2, '#ffb020');
    px(ctx, x, y - 7, 1, 1, '#fff2a8');
  },
  bones(ctx, x, y) {
    px(ctx, x - 4, y, 7, 1, '#e7dfc8');
    px(ctx, x - 5, y - 1, 2, 3, '#efe8d4');
    px(ctx, x + 3, y - 1, 2, 3, '#efe8d4');
  },
  tree(ctx, x, y) {
    shadow(ctx, x + 3, y + 2, 7);
    px(ctx, x - 1, y - 3, 3, 5, '#5a4028');
    px(ctx, x - 1, y - 3, 1, 5, '#7a5a38');
    blob(ctx, x, y - 6, 6, 4, '#24481f');
    blob(ctx, x - 1, y - 7, 5, 3, '#2f5a28');
    blob(ctx, x - 2, y - 8, 3, 2, '#3f7333');
    px(ctx, x - 3, y - 9, 2, 1, '#5c9645');
    px(ctx, x + 3, y - 5, 1, 1, '#1b3a18');
    px(ctx, x - 4, y - 4, 1, 1, '#1b3a18');
  },
  stump(ctx, x, y) {
    shadow(ctx, x, y + 2, 5);
    px(ctx, x - 5, y + 1, 2, 1, '#5a4028');
    px(ctx, x + 4, y + 1, 2, 1, '#5a4028');
    blob(ctx, x, y, 4, 2, '#5a4028');
    blob(ctx, x, y - 1, 3, 1, '#a07a4c');
    px(ctx, x - 1, y - 1, 2, 1, '#7a5634');
    px(ctx, x + 2, y + 1, 2, 1, '#4f7a3a');
  },
  ferns(ctx, x, y) {
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI * (0.12 + k * 0.19);
      for (let n = 1; n <= 5; n++) {
        px(ctx, x + Math.cos(a) * n * 1.4, y + Math.sin(a) * n, 1, 1, n % 2 ? '#3f7a33' : '#5c9645');
      }
    }
  },
  boulder: rock('#8d877c', '#4f7a3a'),
  basalt: rock('#3a3032', null),
  sandstone: rock('#c49a5e', null),
  obsidian(ctx, x, y) {
    shadow(ctx, x, y + 2, 5);
    for (const [dx, tall] of [[-3, 5], [0, 8], [3, 4]]) {
      for (let k = 0; k < tall; k++) {
        px(ctx, x + dx - Math.floor((tall - k) / 3), y - k, 1 + Math.floor((tall - k) / 2), 1, '#1a1420');
      }
      px(ctx, x + dx, y - tall + 1, 1, tall - 2, '#6b5a8a');
    }
    px(ctx, x, y - 7, 1, 1, '#ffffff');
  },
  charred(ctx, x, y) {
    shadow(ctx, x, y + 1, 4);
    px(ctx, x - 1, y - 7, 3, 8, '#1f1a1c');
    px(ctx, x - 3, y - 5, 2, 1, '#1f1a1c');
    px(ctx, x + 2, y - 6, 2, 1, '#1f1a1c');
    px(ctx, x, y - 3, 1, 1, '#ff7a1f');
    px(ctx, x + 1, y - 6, 1, 1, '#ffb020');
  },
  magma(ctx, x, y, h) {
    glowAt(ctx, x, y, 9, 'rgba(255, 90, 20, .25)');
    let cx = x - 6, cy = y;
    for (let k = 0; k < 12; k++) {
      px(ctx, cx, cy, 2, 1, '#c2410c');
      px(ctx, cx, cy, 1, 1, k % 4 ? '#ff6a1f' : '#ffd84a');
      cx += 1;
      cy += hash(h, k, 9) < 0.5 ? -1 : 1;
    }
  },
  lily(ctx, x, y) {
    blob(ctx, x, y, 7, 3, '#1c2a1c');
    blob(ctx, x - 3, y, 2, 1, '#4f8a3a');
    blob(ctx, x + 3, y - 1, 2, 1, '#5c9645');
    px(ctx, x - 3, y - 1, 1, 1, '#1c2a1c');
    px(ctx, x + 3, y - 2, 1, 1, '#f7a8c8');
    px(ctx, x + 4, y - 2, 1, 1, '#ffffff');
  },
  cattail(ctx, x, y, h) {
    for (let k = 0; k < 3; k++) {
      const cx = x - 3 + k * 3, tall = 7 + Math.floor(hash(h, k, 10) * 4);
      px(ctx, cx, y - tall, 1, tall, '#6b8a3a');
      px(ctx, cx - 1 + k % 2 * 2, y - 3, 1, 3, '#7f9a46');
      px(ctx, cx, y - tall - 1, 2, 4, '#6b4a2b');
      px(ctx, cx, y - tall - 1, 1, 4, '#8a6a44');
    }
  },
  toadstools(ctx, x, y, h) {
    for (let k = 0; k < 3; k++) {
      const cx = x - 4 + k * 4, cy = y - Math.floor(hash(h, k, 11) * 3);
      px(ctx, cx, cy - 2, 1, 3, '#d8ccb4');
      blob(ctx, cx, cy - 3, 2, 1, '#8a5a2e');
      px(ctx, cx - 1, cy - 4, 1, 1, '#b07a44');
    }
  },
  drift(ctx, x, y) {
    blob(ctx, x + 1, y + 1, 7, 2, '#95a6bb');
    blob(ctx, x, y, 7, 2, '#ffffff');
    px(ctx, x - 4, y - 2, 5, 1, '#f4f8ff');
  },
  frostbush(ctx, x, y, h) {
    shadow(ctx, x, y + 1, 4);
    for (let k = 0; k < 5; k++) {
      let tx = x, ty = y;
      for (let n = 0; n < 5; n++) {
        px(ctx, tx, ty, 1, 1, n === 4 ? '#ffffff' : '#5c4a3e');
        tx += Math.round((hash(h, k * 7 + n, 12) - 0.5) * 2.6);
        ty -= 1;
      }
    }
  },
  tumbleweed(ctx, x, y, h) {
    shadow(ctx, x, y + 4, 4);
    for (let k = 0; k < 18; k++) {
      const a = k / 18 * Math.PI * 2, r = 3 + hash(h, k, 13) * 1.5;
      px(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, 1, 1, k % 3 ? '#a8854d' : '#7a5c36');
    }
    px(ctx, x - 2, y - 1, 4, 1, '#8a6a40');
    px(ctx, x - 1, y + 1, 3, 1, '#8a6a40');
  },
  agave(ctx, x, y) {
    shadow(ctx, x, y + 1, 4);
    for (let k = 0; k < 6; k++) {
      const a = -Math.PI * (0.05 + k * 0.18);
      for (let n = 1; n <= 4; n++) px(ctx, x + Math.cos(a) * n * 1.3, y + Math.sin(a) * n, 1, 1, n < 4 ? '#6f8f4a'
        : '#9fbf6a');
    }
  },
  tomb(ctx, x, y) {
    shadow(ctx, x + 1, y + 2, 6);
    stone(ctx, x - 5, y - 3, 10, 6, '#5f5a69', '#7a7584', '#45404c');
    px(ctx, x, y - 2, 1, 4, '#3a3542');
    px(ctx, x - 1, y - 1, 3, 1, '#3a3542');
  },
  fence(ctx, x, y, h) {
    px(ctx, x - 6, y - 4, 13, 1, '#2a2730');
    for (let k = 0; k < 5; k++) {
      if (hash(h, k, 14) < 0.25) continue;
      const bx = x - 6 + k * 3, tall = 6 + Math.floor(hash(h, k, 15) * 2);
      px(ctx, bx, y - tall, 1, tall, '#2a2730');
      px(ctx, bx, y - tall - 1, 1, 1, '#5f5a69');
    }
  },
  pumpkin(ctx, x, y) {
    glowAt(ctx, x, y - 2, 8, 'rgba(255, 150, 40, .25)');
    shadow(ctx, x, y + 1, 4);
    blob(ctx, x, y - 2, 4, 3, '#d9731f');
    px(ctx, x - 2, y - 4, 1, 5, '#a8561a');
    px(ctx, x + 1, y - 4, 1, 5, '#a8561a');
    px(ctx, x, y - 6, 1, 2, '#4f6a36');
    px(ctx, x - 2, y - 3, 1, 1, '#ffd84a');
    px(ctx, x + 2, y - 3, 1, 1, '#ffd84a');
    px(ctx, x - 1, y - 1, 3, 1, '#ffd84a');
  },
  glowshroom(ctx, x, y, h) {
    glowAt(ctx, x, y - 3, 7, 'rgba(160, 120, 255, .3)');
    for (let k = 0; k < 3; k++) {
      const cx = x - 3 + k * 3, cy = y - Math.floor(hash(h, k, 16) * 2);
      px(ctx, cx, cy - 3, 1, 3, '#d8d0e8');
      blob(ctx, cx, cy - 4, 2, 1, '#8b5cf6');
      px(ctx, cx - 1, cy - 5, 1, 1, '#c4b5fd');
    }
  },
};

const DECORS = {
  grass: ['flowers', 'flowers', 'bush', 'mushroom', 'pebbles', 'tree', 'tree', 'stump', 'boulder', 'ferns'],
  volcano: ['ember', 'shard', 'vent', 'pebbles', 'obsidian', 'charred', 'magma', 'basalt'],
  swamp: ['reeds', 'reeds', 'puddle', 'mushroom', 'log', 'lily', 'cattail', 'toadstools'],
  snow: ['pine', 'pine', 'crystal', 'snowrock', 'tracks', 'drift', 'frostbush'],
  desert: ['cactus', 'cactus', 'skull', 'twigs', 'pebbles', 'tumbleweed', 'agave', 'sandstone'],
  graveyard: ['grave', 'grave', 'cross', 'deadtree', 'candle', 'bones', 'tomb', 'fence', 'pumpkin', 'glowshroom'],
};

function paintDecor(ctx, battle) {
  const kinds = DECORS[battle.biome] || DECORS.grass, road = new Set(battle.road.map(([x, y]) => y * SIZE + x));
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const cell = y * SIZE + x;
      if (road.has(cell) || battle.tiles && battle.tiles[cell] || hash(x, y, 900) > DECOR_SHARE) continue;
      const kind = kinds[Math.floor(hash(x, y, 901) * kinds.length)];
      DECOR[kind](ctx, Math.round(at(x) + 8 + hash(x, y, 902) * 14), Math.round(at(y) + 12 + hash(x, y, 903) * 12),
        x * 31 + y);
    }
  }
}

function links(battle) {
  const index = new Map(), joined = new Map(), key = ([x, y]) => y * SIZE + x;
  const join = (a, b) => {
    for (const [from, to] of [[a, b], [b, a]]) {
      if (!joined.has(from)) joined.set(from, []);
      joined.get(from).push(to);
    }
  };
  for (const route of [battle.path, battle.branch]) {
    route.forEach((cell, i) => {
      index.set(key(cell), cell);
      if (i) join(key(cell), key(route[i - 1]));
    });
    if (route.length > 1) {
      const [a, b] = route, out = [2 * a[0] - b[0], 2 * a[1] - b[1]];
      join(key(a), key(out));
    }
  }
  const last = battle.path[battle.path.length - 1], before = battle.path[battle.path.length - 2];
  join(key(last), key([2 * last[0] - before[0], 2 * last[1] - before[1]]));
  if (battle.branch.length) join(key(battle.branch[battle.branch.length - 1]), key(battle.path[battle.merge]));
  return { index, joined };
}

function trace(g, points, place) {
  const p = [];
  for (const [x, y] of points) {
    const q = [place(x), place(y)], a = p[p.length - 2], b = p[p.length - 1];
    if (a && (b[0] - a[0]) * (q[1] - b[1]) === (b[1] - a[1]) * (q[0] - b[0])) p[p.length - 1] = q;
    else p.push(q);
  }
  g.moveTo(p[0][0], p[0][1]);
  for (let i = 1; i < p.length - 1; i++) {
    const [ax, ay] = p[i - 1], [bx, by] = p[i], [cx, cy] = p[i + 1];
    g.arcTo(bx, by, cx, cy, Math.min(CELL * ROUND, Math.hypot(bx - ax, by - ay) / 2, Math.hypot(cx - bx, cy - by) / 2));
  }
  g.lineTo(p[p.length - 1][0], p[p.length - 1][1]);
}

function strokes(g, lines, place, widths) {
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const [width, color] of widths) {
    g.lineWidth = width;
    g.strokeStyle = color;
    g.beginPath();
    for (const line of lines) trace(g, line, place);
    g.stroke();
  }
}

function slabs(style) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIDE;
  const g = canvas.getContext('2d'), image = g.createImageData(SIDE, SIDE), data = image.data;
  const step = SLAB, cols = Math.ceil(SIDE / step) + 1, seeds = [];
  for (let j = 0; j < cols; j++) {
    for (let i = 0; i < cols; i++) {
      seeds.push([(i + 0.15 + hash(i, j, 950) * 0.7) * step, (j + 0.15 + hash(i, j, 951) * 0.7) * step]);
    }
  }
  const tones = style.stones.map(rgb), moss = rgb(style.moss), dark = rgb(style.base);
  for (let y = 0; y < SIDE; y++) {
    for (let x = 0; x < SIDE; x++) {
      const ci = Math.floor(x / step), cj = Math.floor(y / step);
      let best = Infinity, next = Infinity, near = 0;
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          const i = ci + di, j = cj + dj;
          if (i < 0 || j < 0 || i >= cols || j >= cols) continue;
          const seed = seeds[j * cols + i], d = Math.hypot(x - seed[0], y - seed[1]);
          if (d < best) {
            next = best;
            best = d;
            near = j * cols + i;
          } else if (d < next) next = d;
        }
      }
      const gap = next - best, seed = seeds[near], k = (y * SIDE + x) * 4;
      let color = tones[near % tones.length];
      if (gap < 1.3) color = hash(x, y, 952) < 0.5 ? moss : dark;
      else if (gap < 3) color = mixed(color, x < seed[0] && y < seed[1] ? [255, 248, 230] : [20, 24, 16], 0.22);
      else if (hash(near, 0, 953) < 0.3 && smooth(x, y, 4, 954) > 0.68) color = mixed(color, moss, 0.6);
      data[k] = color[0];
      data[k + 1] = color[1];
      data[k + 2] = color[2];
      data[k + 3] = 255;
    }
  }
  g.putImageData(image, 0, 0);
  return canvas;
}

function paintRoad(ctx, battle, look) {
  const style = ROADS[look.road], { joined } = links(battle), width = CELL * 0.8;
  const lines = roadLines(battle);
  ctx.save();
  ctx.beginPath();
  ctx.rect(EDGE, EDGE, CELL * SIZE, CELL * SIZE);
  ctx.clip();
  strokes(ctx, lines, at, [[width + 8, 'rgba(0, 0, 0, .14)'], [width + 3, style.curb]]);
  ctx.restore();
  const layer = document.createElement('canvas');
  layer.width = layer.height = BOARD_SIDE * 2;
  const g = layer.getContext('2d');
  g.scale(2, 2);
  px(g, EDGE, EDGE, CELL * SIZE, CELL * SIZE, style.base);
  if (style.slabs) g.drawImage(slabs(style), EDGE, EDGE);
  for (let key = 0; key < SIZE * SIZE && !style.slabs; key++) {
    const x = key % SIZE, y = Math.floor(key / SIZE), x0 = at(x), y0 = at(y), ends = joined.get(key) || [];
    const across = ends.every((to) => Math.floor(to / SIZE) === y);
    if (style.size) {
      const n = Math.max(2, Math.round(CELL / style.size));
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          const w = CELL / n, shift = j % 2 ? w / 2 : 0;
          const sx = x0 + i * w + shift - 1, sy = y0 + j * w, color = style.stones[Math.floor(hash(x * n + i, y * n
            + j, 3) * style.stones.length)];
          const side = Math.round(w) - 1;
          stone(g, sx + 1, sy + 1, side, side, color, shade(color, 0.2), shade(color, -0.35));
          if (style.moss && hash(x * n + i, y * n + j, 5) < 0.2) px(g, sx + 2, sy + w - 3, 2, 1, style.moss);
          if (style.glow && hash(x * n + i, y * n + j, 6) < 0.12) {
            g.globalAlpha = 0.7;
            px(g, sx, sy + w / 2, 1, 2, style.glow);
            g.globalAlpha = 1;
          }
        }
      }
    } else {
      for (let i = 0; i < 10; i++) {
        const color = style.stones[i % style.stones.length];
        px(g, x0 + hash(x, y, i + 100) * (CELL - 4), y0 + hash(x, y, i + 120) * (CELL - 3), 3, 2, color);
      }
      for (let i = 0; i < 4; i++) {
        const sx = x0 + 3 + hash(x, y, i + 140) * (CELL - 8), sy = y0 + 3 + hash(x, y, i + 150) * (CELL - 7);
        stone(g, sx, sy, 4, 3, '#8a8478', '#a8a296', '#5f5a50');
      }
      if (style.steps) {
        for (let i = 0; i < 3; i++) {
          const sx = x0 + (across ? i * 10 + 3 : 10 + (i % 2) * 6), sy = y0 + (across ? 10 + (i % 2) * 6 : i * 10 + 3);
          px(g, sx, sy, 2, 3, style.curb);
        }
      }
    }
  }
  g.globalCompositeOperation = 'destination-in';
  strokes(g, lines, at, [[width, '#000000']]);
  ctx.drawImage(layer, 0, 0, BOARD_SIDE, BOARD_SIDE);
}

const SIDE = CELL * SIZE;
const RIVER_SPREAD = 0.42;
const RIVER_STEP = 5;
const LIGHT = (() => {
  const v = [-0.45, -0.62, 0.64], l = Math.hypot(v[0], v[1], v[2]);
  return v.map((c) => c / l);
})();

function rgb(color) {
  const n = parseInt(color.slice(1), 16);
  return [n >> 16, n >> 8 & 255, n & 255];
}

const mixed = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const ramps = new Map();

function ramp(color) {
  if (!ramps.has(color)) {
    const base = rgb(color);
    ramps.set(color, [mixed(base, [22, 14, 40], 0.6), mixed(base, [44, 26, 86], 0.3), base,
      mixed(base, [255, 238, 196], 0.24), mixed(base, [255, 252, 238], 0.55)]);
  }
  return ramps.get(color);
}

function smooth(x, y, scale, seed) {
  const fx = x / scale, fy = y / scale, ix = Math.floor(fx), iy = Math.floor(fy);
  const tx = fx - ix, ty = fy - iy, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
  const a = hash(ix, iy, seed), b = hash(ix + 1, iy, seed), c = hash(ix, iy + 1, seed), d = hash(ix + 1, iy + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

const rough = (x, y, seed) => 0.55 * smooth(x, y, 16, seed) + 0.3 * smooth(x, y, 7, seed + 1)
  + 0.15 * smooth(x, y, 3, seed + 2);

function cellsOf(battle, kinds) {
  const list = [];
  battle.tiles.forEach((tile, i) => {
    if (kinds.includes(tile)) list.push([i % SIZE, Math.floor(i / SIZE)]);
  });
  return list;
}

function heights(cells, spread, seed) {
  const h = new Float32Array(SIDE * SIDE), sigma = CELL * spread, reach = Math.ceil(sigma * 2.8);
  const box = [SIDE, SIDE, 0, 0];
  for (const [x, y] of cells) {
    const lift = 0.8 + 0.45 * hash(x, y, seed), cx = (x + 0.5) * CELL + (hash(x, y, seed + 1) - 0.5) * 8;
    const cy = (y + 0.5) * CELL + (hash(x, y, seed + 2) - 0.5) * 8;
    const x0 = Math.max(0, Math.floor(cx - reach)), x1 = Math.min(SIDE, Math.ceil(cx + reach));
    const y0 = Math.max(0, Math.floor(cy - reach)), y1 = Math.min(SIDE, Math.ceil(cy + reach));
    for (let py = y0; py < y1; py++) {
      for (let px0 = x0; px0 < x1; px0++) {
        const dx = px0 + 0.5 - cx, dy = py + 0.5 - cy;
        h[py * SIDE + px0] += lift * Math.exp(-(dx * dx + dy * dy) / (sigma * sigma));
      }
    }
    box[0] = Math.min(box[0], x0);
    box[1] = Math.min(box[1], y0);
    box[2] = Math.max(box[2], x1);
    box[3] = Math.max(box[3], y1);
  }
  return { h, box };
}

function keepRoad(h, box, battle) {
  const band = 7, near = new Float32Array(SIDE * SIDE).fill(band);
  for (const [x, y] of battle.road) {
    if (battle.tiles[y * SIZE + x] === 'tunnel' || battle.tiles[y * SIZE + x] === 'bridge') continue;
    const left = x * CELL + 3, top = y * CELL + 3, right = left + CELL - 6, bottom = top + CELL - 6;
    for (let py = Math.max(box[1], top - band); py < Math.min(box[3], bottom + band); py++) {
      for (let px0 = Math.max(box[0], left - band); px0 < Math.min(box[2], right + band); px0++) {
        const dx = Math.max(left - px0, 0, px0 - right), dy = Math.max(top - py, 0, py - bottom);
        const d = Math.hypot(dx, dy), i = py * SIDE + px0;
        if (d < near[i]) near[i] = d;
      }
    }
  }
  for (let i = 0; i < h.length; i++) if (near[i] < band) h[i] *= near[i] / band;
}

function put(data, i, color, alpha = 255) {
  const k = i * 4;
  if (alpha < 255 && data[k + 3]) {
    const t = alpha / 255;
    data[k] += (color[0] - data[k]) * t;
    data[k + 1] += (color[1] - data[k + 1]) * t;
    data[k + 2] += (color[2] - data[k + 2]) * t;
    data[k + 3] = Math.max(data[k + 3], alpha);
    return;
  }
  data[k] = color[0];
  data[k + 1] = color[1];
  data[k + 2] = color[2];
  data[k + 3] = alpha;
}

function lit(h, i, scale) {
  const dx = (h[i + 1] - h[i - 1]) * scale, dy = (h[i + SIDE] - h[i - SIDE]) * scale, l = Math.hypot(dx, dy, 1);
  return (-dx * LIGHT[0] - dy * LIGHT[1] + LIGHT[2]) / l;
}

const DITHER = [0, 0.5, 0.125, 0.625, 0.75, 0.25, 0.875, 0.375];
const toneOf = (light, x, y) => {
  const step = Math.max(0, Math.min(4, light * 4.6 - 0.4 + (DITHER[(x & 3) + (y & 1) * 4] - 0.5) * 0.7));
  return Math.round(step);
};

function castShadow(data, h, box, edge, dx, dy, alpha) {
  const dark = [8, 6, 14];
  for (let y = Math.max(dy, box[1]); y < Math.min(SIDE, box[3] + dy); y++) {
    for (let x = Math.max(dx, box[0]); x < Math.min(SIDE, box[2] + dx); x++) {
      const i = y * SIDE + x;
      if (h[i] >= edge * 0.7 || h[i - dy * SIDE - dx] < edge) continue;
      if ((x + y) % 2 || alpha > 80) put(data, i, dark, alpha);
    }
  }
}

function paintMountains(data, battle, look) {
  const cells = cellsOf(battle, ['mountain', 'tunnel']);
  if (!cells.length) return;
  const { h, box } = heights(cells, 0.6, 500), style = look.rock, edge = 0.42;
  let top = 0;
  for (let y = box[1]; y < box[3]; y++) {
    for (let x = box[0]; x < box[2]; x++) {
      const i = y * SIDE + x;
      if (h[i] < 0.05) continue;
      const ridge = 1 - Math.abs(2 * smooth(x, y, 14, 510) - 1), crag = 1 - Math.abs(2 * smooth(x, y, 6, 511) - 1);
      h[i] = Math.pow(h[i], 1.25) * (0.7 + 0.4 * ridge + 0.15 * crag);
      top = Math.max(top, h[i]);
    }
  }
  keepRoad(h, box, battle);
  castShadow(data, h, box, edge, 5, 7, 95);
  const shadow = [10, 8, 14], cap = top * 0.66;
  for (let y = Math.max(1, box[1]); y < Math.min(SIDE - 1, box[3]); y++) {
    for (let x = Math.max(1, box[0]); x < Math.min(SIDE - 1, box[2]); x++) {
      const i = y * SIDE + x, v = h[i], grain = hash(x, y, 520);
      if (v < edge * 0.5) continue;
      if (v < edge) {
        const fade = (v - edge * 0.5) / (edge * 0.5);
        if (grain < fade) put(data, i, style.foot ? rgb(style.foot) : shadow, Math.round(70 + 120 * fade));
        continue;
      }
      let tone = toneOf(lit(h, i, 26), x, y);
      if (v < edge * 1.12) tone = Math.max(0, tone - 1);
      let color = style.color;
      if (style.foot && v < edge * 1.45 && grain < (edge * 1.45 - v) / (edge * 0.45)) color = style.foot;
      if (style.bands) color = style.bands[Math.floor(v * 9 + rough(x, y, 530) * 0.6) % style.bands.length];
      if (style.cap && v > cap + (grain - 0.5) * 0.08) color = style.cap;
      let tint = ramp(color)[tone];
      if (style.lava) {
        const vein = Math.abs(smooth(x, y, 11, 540) - 0.5);
        if (vein < 0.025 && v > edge * 1.3) tint = grain < 0.5 ? rgb('#ff6a1f') : rgb('#ffb020');
        if (v > top * 0.9) tint = mixed(rgb('#ff4d1f'), rgb('#ffd84a'), (v - top * 0.9) / (top * 0.1));
      }
      if (style.bones && smooth(x, y, 3, 550) < 0.28) tint = ramp('#3a3542')[Math.min(tone, 2)];
      put(data, i, tint);
    }
  }
  if (style.bones) bones(data, h, box, edge * 1.3);
}

const SKULL = ['.###.', '#####', '#.#.#', '#####', '.#.#.'];

function bones(data, h, box, floor) {
  const ivory = rgb('#f1ead6'), dark = rgb('#2a2530'), shadowed = rgb('#bdb39a');
  for (let y = box[1] + 3; y < box[3] - 6; y += 7) {
    for (let x = box[0] + 3; x < box[2] - 6; x += 7) {
      const ox = x + Math.floor(hash(x, y, 560) * 5), oy = y + Math.floor(hash(x, y, 561) * 5);
      if (h[oy * SIDE + ox] < floor) continue;
      if (hash(x, y, 562) < 0.3) {
        SKULL.forEach((row, dy) => [...row].forEach((c, dx) => {
          if (c !== '.') put(data, (oy + dy) * SIDE + ox + dx, dy === 0 ? ivory : dy > 2 ? shadowed : ivory);
          else if (dy === 2) put(data, (oy + dy) * SIDE + ox + dx, dark);
        }));
      } else {
        const across = hash(x, y, 563) < 0.5;
        for (let k = 0; k < 6; k++) put(data, across ? oy * SIDE + ox + k : (oy + k) * SIDE + ox, ivory);
        for (const end of [0, 5]) {
          put(data, across ? (oy - 1) * SIDE + ox + end : (oy + end) * SIDE + ox - 1, shadowed);
          put(data, across ? (oy + 1) * SIDE + ox + end : (oy + end) * SIDE + ox + 1, shadowed);
        }
      }
    }
  }
}

function paintHills(data, battle, look) {
  const cells = cellsOf(battle, ['hill']);
  if (!cells.length) return;
  const { h, box } = heights(cells, 0.62, 600), style = look.hill, edge = 0.3;
  for (let y = box[1]; y < box[3]; y++) {
    for (let x = box[0]; x < box[2]; x++) {
      const i = y * SIDE + x;
      if (h[i] > 0.05) h[i] = Math.pow(h[i], 1.4) * (0.75 + 0.5 * smooth(x, y, 9, 605));
    }
  }
  keepRoad(h, box, battle);
  castShadow(data, h, box, edge + 0.08, 3, 4, 110);
  const tuft = rgb(style.tuft);
  for (let y = Math.max(1, box[1]); y < Math.min(SIDE - 1, box[3]); y++) {
    for (let x = Math.max(1, box[0]); x < Math.min(SIDE - 1, box[2]); x++) {
      const i = y * SIDE + x, v = h[i], grain = hash(x, y, 610);
      if (v < edge) continue;
      const fade = Math.min(1, (v - edge) / 0.3);
      if (grain > fade * 1.4) continue;
      let tone = toneOf(lit(h, i, 34), x, y);
      if (v < edge + 0.06) tone = Math.max(0, tone - 1);
      if (style.decor === 'ripples' && Math.sin(y * 0.9 + Math.sin(x * 0.2) * 2) > 0.85) tone = Math.max(0, tone - 1);
      put(data, i, ramp(style.color)[tone], Math.round(255 * Math.min(1, fade * 1.6)));
      if (v < edge + 0.25 || grain > 0.04) continue;
      if (style.decor === 'tufts' || style.decor === 'reeds') {
        for (let k = 0; k < (style.decor === 'reeds' ? 5 : 3); k++) put(data, (y - k) * SIDE + x, tuft);
        put(data, (y - 1) * SIDE + x - 1, tuft);
      } else if (style.decor === 'sparkle' || style.decor === 'embers') put(data, i, tuft);
    }
  }
  if (style.decor !== 'cross') return;
  for (const [x, y] of cells) {
    if (hash(x, y, 620) > 0.5) continue;
    const cx = x * CELL + 14, cy = y * CELL + 6;
    for (let k = 0; k < 11; k++) put(data, (cy + k) * SIDE + cx, tuft);
    for (let k = -3; k <= 3; k++) put(data, (cy + 3) * SIDE + cx + k, tuft);
  }
}

function paintLakes(data, battle, look) {
  const style = LIQUIDS[look.water], cells = cellsOf(battle, ['lake']);
  if (!cells.length && !(battle.rivers || []).length) return;
  const { h, box } = heights(cells, 0.6, 700);
  for (const river of battle.rivers || []) flow(h, box, river);
  const tones = { wet: rgb(style.wet), shore: rgb(style.shore), shallow: rgb(style.shallow), deep: rgb(style.deep),
    shine: rgb(style.shine), mark: rgb(style.mark || style.shine) };
  for (let y = box[1]; y < box[3]; y++) {
    for (let x = box[0]; x < box[2]; x++) {
      const i = y * SIDE + x, v = h[i] * (0.9 + 0.2 * smooth(x, y, 9, 710)), grain = hash(x, y, 720);
      if (v < 0.2) continue;
      if (v < 0.36) {
        const fade = (v - 0.2) / 0.16;
        if (grain < fade) put(data, i, tones.wet, Math.round(60 + 90 * fade));
        continue;
      }
      if (v < 0.48) {
        put(data, i, mixed(tones.shore, tones.wet, grain * 0.3));
        continue;
      }
      const depth = Math.min(1, (v - 0.48) / 0.7), step = Math.floor(depth * 4 + (grain - 0.5) * 0.9);
      let color = mixed(tones.shallow, tones.deep, Math.max(0, Math.min(3, step)) / 3);
      if (Math.sin(x * 0.45 + y * 0.12 + smooth(x, y, 13, 730) * 6) > 0.985 && grain < 0.6 && depth > 0.1) {
        color = mixed(color, tones.shine, 0.7);
      }
      if (style.mark && smooth(x, y, 5, 740) > 0.8 && depth > 0.15) color = tones.mark;
      put(data, i, color);
    }
  }
}

function jagged(points, a, b, depth, seed) {
  if (!depth) {
    points.push(b);
    return;
  }
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]), turn = (hash(a[0] + b[0], a[1] + b[1], seed) - 0.5) * len * 0.45;
  const mid = [(a[0] + b[0]) / 2 + (a[1] - b[1]) / len * turn, (a[1] + b[1]) / 2 + (b[0] - a[0]) / len * turn];
  jagged(points, a, mid, depth - 1, seed + 1);
  jagged(points, mid, b, depth - 1, seed + 1);
}

function cracks(cells) {
  const h = new Float32Array(SIDE * SIDE), box = [SIDE, SIDE, 0, 0], sigma = CELL * 0.36, step = 2;
  const reach = Math.ceil(sigma * 2.6), lift = step / (sigma * Math.sqrt(Math.PI)), set = new Set(cells.map(String));
  const stamp = (cx, cy) => {
    const left = Math.max(0, Math.floor(cx - reach)), right = Math.min(SIDE, Math.ceil(cx + reach));
    const top = Math.max(0, Math.floor(cy - reach)), bottom = Math.min(SIDE, Math.ceil(cy + reach));
    for (let y = top; y < bottom; y++) {
      for (let x = left; x < right; x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
        h[y * SIDE + x] += lift * Math.exp(-(dx * dx + dy * dy) / (sigma * sigma));
      }
    }
    box[0] = Math.min(box[0], left);
    box[1] = Math.min(box[1], top);
    box[2] = Math.max(box[2], right);
    box[3] = Math.max(box[3], bottom);
  };
  for (const [x, y] of cells) {
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      if (!set.has([x + dx, y + dy].join())) continue;
      const a = [(x + 0.5) * CELL, (y + 0.5) * CELL], b = [(x + dx + 0.5) * CELL, (y + dy + 0.5) * CELL];
      const points = [a];
      jagged(points, a, b, 3, 870);
      for (let i = 0; i + 1 < points.length; i++) {
        const [x0, y0] = points[i], [x1, y1] = points[i + 1];
        const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
        for (let k = 0; k < n; k++) stamp(x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n);
      }
    }
  }
  return { h, box };
}

function paintChasms(data, battle, look) {
  const chasm = new Set();
  battle.tiles.forEach((tile, cell) => {
    if (tile === 'chasm') chasm.add(cell);
  });
  if (!chasm.size) return;
  const cells = [];
  battle.tiles.forEach((tile, cell) => {
    const x = cell % SIZE, y = Math.floor(cell / SIZE);
    const touches = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => inside(x + dx, y + dy)
      && chasm.has((y + dy) * SIZE + x + dx));
    if (chasm.has(cell) || tile === 'bridge' && touches) cells.push([x, y]);
  });
  const { h, box } = cracks(cells), style = look.chasm, wall = ramp(style.wall);
  const deep = rgb(style.deep), lip = rgb(style.lip), glow = style.glow && rgb(style.glow);
  for (let y = box[1]; y < box[3]; y++) {
    for (let x = box[0]; x < box[2]; x++) h[y * SIDE + x] *= 0.78 + 0.44 * rough(x, y, 810);
  }
  for (let y = Math.max(1, box[1]); y < Math.min(SIDE - 1, box[3]); y++) {
    for (let x = Math.max(1, box[0]); x < Math.min(SIDE - 1, box[2]); x++) {
      const i = y * SIDE + x, v = h[i], grain = hash(x, y, 820);
      if (v < 0.36) continue;
      if (v < 0.45) {
        put(data, i, grain < (v - 0.36) * 11 ? lip : mixed(lip, deep, 0.4));
        continue;
      }
      const depth = Math.min(1, (v - 0.45) / 0.5);
      let tone = toneOf(lit(h, i, -34), x, y);
      if (Math.floor(v * 18 + rough(x, y, 830) * 2) % 3 === 0) tone = Math.max(0, tone - 1);
      let color = mixed(wall[Math.min(3, tone)], deep, Math.min(1, Math.pow(depth, 1.6) * 1.15));
      if (glow && depth > 0.72) color = mixed(color, glow, (depth - 0.72) / 0.28 * (0.4 + 0.6 * smooth(x, y, 6, 840)));
      put(data, i, color);
    }
  }
}

function paintRuinFloors(data, battle, look) {
  const ruin = (x, y) => inside(x, y) && battle.tiles[y * SIZE + x] === 'ruin', cells = cellsOf(battle, ['ruin']);
  if (!cells.length) return;
  const style = look.ruin, tones = style.stones.map(rgb), gap = rgb(style.gap), step = 7;
  const seedOf = (i, j) => [(i + 0.15 + hash(i, j, 960) * 0.7) * step, (j + 0.15 + hash(i, j, 961) * 0.7) * step];
  for (const [cx, cy] of cells) {
    const open = [!ruin(cx, cy - 1), !ruin(cx + 1, cy), !ruin(cx, cy + 1), !ruin(cx - 1, cy)];
    for (let y = cy * CELL; y < (cy + 1) * CELL; y++) {
      for (let x = cx * CELL; x < (cx + 1) * CELL; x++) {
        const edge = Math.min(open[0] ? y - cy * CELL : CELL, open[1] ? (cx + 1) * CELL - 1 - x : CELL,
          open[2] ? (cy + 1) * CELL - 1 - y : CELL, open[3] ? x - cx * CELL : CELL);
        if (edge < 1 + smooth(x, y, 4, 962) * 5) continue;
        const ci = Math.floor(x / step), cj = Math.floor(y / step);
        let best = Infinity, next = Infinity, near = [0, 0];
        for (let dj = -1; dj <= 1; dj++) {
          for (let di = -1; di <= 1; di++) {
            const [sx, sy] = seedOf(ci + di, cj + dj), d = Math.hypot(x - sx, y - sy);
            if (d < best) {
              next = best;
              best = d;
              near = [ci + di, cj + dj];
            } else if (d < next) next = d;
          }
        }
        if (hash(near[0], near[1], 963) < 0.16) continue;
        const i = y * SIDE + x, split = next - best, [sx, sy] = seedOf(near[0], near[1]);
        let color = tones[Math.floor(hash(near[0], near[1], 964) * tones.length)];
        if (split < 1.2) color = hash(x, y, 965) < 0.6 ? gap : mixed(color, [10, 8, 14], 0.5);
        else if (split < 2.6) color = mixed(color, x < sx && y < sy ? [255, 248, 230] : [20, 24, 16], 0.22);
        put(data, i, color);
      }
    }
  }
}

function paintCraters(data, battle, look) {
  const cells = cellsOf(battle, ['crater']);
  if (!cells.length) return;
  const style = look.crater, h = new Float32Array(SIDE * SIDE), rim = ramp(style.rim), floor = ramp(style.floor);
  const core = style.core && rgb(style.core), scorch = rgb(style.scorch);
  for (const [x0, y0] of cells) {
    const cx = (x0 + 0.5) * CELL + (hash(x0, y0, 850) - 0.5) * 3;
    const cy = (y0 + 0.5) * CELL + (hash(x0, y0, 851) - 0.5) * 3;
    const r0 = 9.5 + hash(x0, y0, 852) * 2, left = Math.max(1, x0 * CELL - 2), top = Math.max(1, y0 * CELL - 2);
    const right = Math.min(SIDE - 1, (x0 + 1) * CELL + 2), bottom = Math.min(SIDE - 1, (y0 + 1) * CELL + 2);
    const ring = [];
    for (let y = top - 1; y <= bottom; y++) {
      for (let x = left - 1; x <= right; x++) {
        const d = Math.hypot(x + 0.5 - cx, (y + 0.5 - cy) * 1.12) * (0.84 + 0.32 * rough(x, y, 853));
        h[y * SIDE + x] = 0.55 * Math.exp(-(((d - r0) / 3) ** 2)) - (d < r0 ? 1.2 * (1 - (d / r0) ** 2) : 0);
        ring.push(d);
      }
    }
    let n = 0;
    for (let y = top - 1; y <= bottom; y++) {
      for (let x = left - 1; x <= right; x++, n++) {
        if (y < top || x < left || y >= bottom || x >= right) continue;
        const i = y * SIDE + x, v = h[i], d = ring[n], grain = hash(x, y, 860);
        if (v > 0.1) {
          put(data, i, rim[toneOf(lit(h, i, 7), x, y)], v > 0.2 || grain < 0.6 ? 255 : 150);
        } else if (v < -0.04) {
            let color = floor[Math.min(2, toneOf(lit(h, i, 7), x, y))];
          if (v < -0.55) color = mixed(color, floor[0], Math.min(0.7, (-v - 0.55) * 1.2));
          if (core && v < -0.8) color = mixed(color, core, Math.min(1, (-v - 0.8) / 0.2));
          put(data, i, color);
        } else if (d > r0 && d < r0 + 9 && grain < 0.035) put(data, i, rim[3]);
        else if (d > r0 && d < r0 + 6 && (x + y) % 2) put(data, i, scorch, 70);
      }
    }
  }
}

const STRUCTURES = new Set(['ruin', 'stones', 'bones', 'crypt']);
const structureImages = new Map();

function structureOf(battle, tile, cell) {
  const x = cell % SIZE, y = Math.floor(cell / SIZE), biome = battle.biome || 'grass';
  const ruin = (dx, dy) => inside(x + dx, y + dy) && battle.tiles[(y + dy) * SIZE + x + dx] === 'ruin';
  const mask = tile === 'ruin' ? (ruin(0, -1) ? 0 : 1) | (ruin(1, 0) ? 0 : 2) | (ruin(0, 1) ? 0 : 4)
    | (ruin(-1, 0) ? 0 : 8) : 0, key = [tile, biome, mask, tile === 'ruin' ? cell : 0].join(':');
  if (!structureImages.has(key)) {
    const image = tile === 'ruin' ? drawRuin(biome, mask, cell) : drawRelic(tile, biome);
    const shade = document.createElement('canvas');
    shade.width = image.width;
    shade.height = image.height;
    const g = shade.getContext('2d');
    g.drawImage(image, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = 'rgba(0, 0, 0, .3)';
    g.fillRect(0, 0, shade.width, shade.height);
    structureImages.set(key, { image, shade });
  }
  return structureImages.get(key);
}

function paintStructures(ctx, battle) {
  ctx.imageSmoothingEnabled = false;
  battle.tiles.forEach((tile, cell) => {
    if (!STRUCTURES.has(tile)) return;
    const { image, shade } = structureOf(battle, tile, cell), w = image.width, h = image.height;
    const x = Math.round(at(cell % SIZE + 0.5) - w / 2), y = Math.round(at(Math.floor(cell / SIZE) + 0.5) - h / 2);
    ctx.drawImage(shade, x + 3, y + 3);
    ctx.drawImage(image, x, y);
  });
}

function layer(painters, battle, look) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIDE;
  const g = canvas.getContext('2d'), image = g.createImageData(SIDE, SIDE);
  for (const paint of painters) paint(image.data, battle, look);
  g.putImageData(image, 0, 0);
  return canvas;
}

function relief(battle, look) {
  const water = layer([paintLakes, paintChasms], battle, look), high = document.createElement('canvas');
  high.width = high.height = SIDE;
  const g = high.getContext('2d'), w = water.getContext('2d');
  w.globalCompositeOperation = 'destination-out';
  strokes(w, roadLines(battle), (v) => v * CELL, [[CELL * 0.8 + 3, '#000000']]);
  g.drawImage(water, 0, 0);
  g.drawImage(layer([paintMountains], battle, look), 0, 0);
  paintRivers(g, battle);
  return { low: layer([paintHills, paintCraters, paintRuinFloors], battle, look), high };
}

function roadLines(battle) {
  return [battle.routes[0]].concat(battle.branch.length ? [battle.routes[1].slice(0, -1)] : []);
}

function flow(h, box, cells) {
  const points = cells.map(([x, y]) => [(x + 0.5) * CELL, (y + 0.5) * CELL]), [a, b] = points;
  const [z, y] = points.slice(-2).reverse();
  points.unshift([2 * a[0] - b[0], 2 * a[1] - b[1]]);
  points.push([2 * z[0] - y[0], 2 * z[1] - y[1]]);
  const sigma = CELL * RIVER_SPREAD, reach = Math.ceil(sigma * 2.8), lift = RIVER_STEP / (sigma * Math.sqrt(Math.PI));
  for (let i = 0; i + 1 < points.length; i++) {
    const [x0, y0] = points[i], [x1, y1] = points[i + 1], steps = Math.round(Math.hypot(x1 - x0, y1 - y0) / RIVER_STEP);
    for (let k = 0; k < steps; k++) {
      const cx = x0 + (x1 - x0) * k / steps, cy = y0 + (y1 - y0) * k / steps;
      const left = Math.max(0, Math.floor(cx - reach)), right = Math.min(SIDE, Math.ceil(cx + reach));
      const top = Math.max(0, Math.floor(cy - reach)), bottom = Math.min(SIDE, Math.ceil(cy + reach));
      for (let py = top; py < bottom; py++) {
        for (let px0 = left; px0 < right; px0++) {
          const dx = px0 + 0.5 - cx, dy = py + 0.5 - cy;
          h[py * SIDE + px0] += lift * Math.exp(-(dx * dx + dy * dy) / (sigma * sigma));
        }
      }
      box[0] = Math.min(box[0], left);
      box[1] = Math.min(box[1], top);
      box[2] = Math.max(box[2], right);
      box[3] = Math.max(box[3], bottom);
    }
  }
}

function paintRivers(g, battle) {
  const place = (v) => v * CELL;
  battle.tiles.forEach((tile, cell) => {
    if (tile !== 'bridge') return;
    const [left, top, w, h] = footprint(battle, cell, place);
    g.clearRect(left, top, w, h);
  });
}

function footprint(battle, cell, place) {
  const x = cell % SIZE, y = Math.floor(cell / SIZE), road = new Set(battle.road.map(([a, b]) => b * SIZE + a));
  const across = road.has(cell - 1) || road.has(cell + 1), x0 = place(x), y0 = place(y);
  return across ? [x0 - 3, y0 + 1, CELL + 6, CELL - 2, across] : [x0 + 1, y0 - 3, CELL - 2, CELL + 6, across];
}

function bridge(g, battle, cell, look) {
  const across = footprint(battle, cell, at)[4], x0 = at(cell % SIZE), y0 = at(Math.floor(cell / SIZE));
  const stone = Boolean(look.cracks || look.graves), deck = stone ? '#7d7468' : '#8a6a44';
  const board = stone ? '#968c7e' : '#a07a4c', rail = stone ? '#5d564d' : '#5a4028';
  const span = (a, b, w, h, color) => px(g, across ? x0 + a : x0 + b, across ? y0 + b : y0 + a, across ? w : h,
    across ? h : w, color);
  span(-2, 3, CELL + 4, CELL - 6, deck);
  for (let k = 0; k < CELL + 4; k += 4) span(k - 2, 4, 3, CELL - 8, board);
  for (const edge of [2, CELL - 4]) {
    span(-3, edge, CELL + 6, 2, rail);
    for (let k = 0; k <= CELL; k += 10) span(k - 1, edge - 1, 3, 4, shade(rail, 0.2));
  }
}

const reliefs = new WeakMap();

function reliefOf(battle) {
  if (!reliefs.has(battle)) reliefs.set(battle, relief(battle, lookOf(battle.biome)));
  return reliefs.get(battle);
}

export function paintGround(ctx, battle) {
  const look = lookOf(battle.biome);
  paintSoil(ctx, look);
  ctx.strokeStyle = look.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i < SIZE; i++) {
    ctx.moveTo(at(i), EDGE);
    ctx.lineTo(at(i), EDGE + CELL * SIZE);
    ctx.moveTo(EDGE, at(i));
    ctx.lineTo(EDGE + CELL * SIZE, at(i));
  }
  ctx.stroke();
  paintDecor(ctx, battle);
  paintRoad(ctx, battle, look);
  if (!battle.tiles) return;
  battle.tiles.forEach((tile, cell) => {
    if (tile === 'bridge') bridge(ctx, battle, cell, look);
  });
  ctx.drawImage(reliefOf(battle).low, EDGE, EDGE);
  ctx.drawImage(reliefOf(battle).high, EDGE, EDGE);
}

const watchImages = new Map();

function paintWatches(ctx, battle) {
  if (!watchImages.has(battle.biome)) watchImages.set(battle.biome, drawWatch(battle.biome));
  const image = watchImages.get(battle.biome), w = image.width, h = image.height;
  battle.tiles.forEach((tile, cell) => {
    if (tile !== 'watch') return;
    const x = at(cell % SIZE + 0.5), y = at(Math.floor(cell / SIZE) + 0.5);
    ctx.fillStyle = 'rgba(0, 0, 0, .28)';
    ctx.beginPath();
    ctx.moveTo(x - 14, y + 20);
    ctx.lineTo(x + 16, y + 21);
    ctx.lineTo(x + 27, y + 11);
    ctx.lineTo(x + 24, y - 5);
    ctx.lineTo(x + 2, y + 4);
    ctx.closePath();
    ctx.fill();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, Math.round(x - w / 2), Math.round(y - WATCH_TOP - (h - (image.span || h)) / 2), w, h);
  });
}

export function paintPeaks(ctx, battle) {
  if (!battle.tiles) return;
  ctx.drawImage(reliefOf(battle).high, EDGE, EDGE);
  paintStructures(ctx, battle);
  paintWatches(ctx, battle);
}

function mouths(battle) {
  const list = [];
  const tunnel = (cell) => battle.tiles[cell[1] * SIZE + cell[0]] === 'tunnel';
  for (const route of [battle.path, battle.branch]) {
    for (let i = 0; i + 1 < route.length; i++) {
      if (tunnel(route[i]) && !tunnel(route[i + 1])) list.push([route[i], route[i + 1]]);
      if (!tunnel(route[i]) && tunnel(route[i + 1])) list.push([route[i + 1], route[i]]);
    }
  }
  return list;
}

export function paintRoof(ctx, battle) {
  if (!battle.tiles) return;
  const image = reliefOf(battle).high;
  ctx.save();
  ctx.beginPath();
  for (const [x, y] of cellsOf(battle, ['tunnel'])) ctx.rect(at(x) - 3, at(y) - 3, CELL + 6, CELL + 6);
  ctx.clip();
  ctx.drawImage(image, EDGE, EDGE);
  ctx.restore();
  for (const [[x, y], [nx, ny]] of mouths(battle)) {
    const cx = at(x + 0.5 + (nx - x) * 0.42), cy = at(y + 0.5 + (ny - y) * 0.42), across = nx !== x;
    const w = across ? CELL * 0.34 : CELL * 0.86, h = across ? CELL * 0.86 : CELL * 0.34;
    const fill = ctx.createRadialGradient(cx, cy, 1, cx, cy, CELL * 0.5);
    fill.addColorStop(0, '#05040a');
    fill.addColorStop(0.7, '#0b0912');
    fill.addColorStop(1, 'rgba(11, 9, 18, 0)');
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(cx, cy, w / 2 + 3, h / 2 + 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}
