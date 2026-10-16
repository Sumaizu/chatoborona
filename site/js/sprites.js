const OUTLINE = '#15111d';
const SKIN = ['#f2c29b', '#c98e6b'];
const WOOD = ['#a8723f', '#6e4524'];
const METAL = ['#d4dae1', '#8e98a5', '#545d6b'];
const STONE = ['#9a8f80', '#8a7f70', '#a89c8a'];

class Pix {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.data = new Array(w * h).fill(null);
  }

  px(x, y, c) {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.data[y * this.w + x] = c;
  }

  rect(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c);
  }

  ellipse(cx, cy, rx, ry, c, dark = null, light = null) {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy > 1) continue;
        let color = c;
        if (dark && dx + dy > 0.55) color = dark;
        else if (light && dx + dy < -0.75) color = light;
        this.data[y * this.w + x] = color;
      }
    }
  }

  disc(cx, cy, r, c, dark = null, light = null) {
    this.ellipse(cx, cy, r, r, c, dark, light);
  }

  line(x0, y0, x1, y1, c, width = 1) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      if (width > 1) this.rect(x0, y0, width, width, c);
      else this.px(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  oval(cx, cy, rx, ry, c, dark = null, light = null) {
    this.ellipse(cx, cy, rx + 1, ry + 1, OUTLINE);
    this.ellipse(cx, cy, rx, ry, c, dark, light);
  }

  ball(cx, cy, r, c, dark = null, light = null) {
    this.oval(cx, cy, r, r, c, dark, light);
  }

  bar(x0, y0, x1, y1, c, width = 2) {
    this.line(x0 - 1, y0 - 1, x1 - 1, y1 - 1, OUTLINE, width + 2);
    this.line(x0, y0, x1, y1, c, width);
  }

  box(x, y, w, h, c) {
    this.rect(x - 1, y - 1, w + 2, h + 2, OUTLINE);
    this.rect(x, y, w, h, c);
  }

  outline(c = OUTLINE) {
    const marks = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.data[y * this.w + x]) continue;
        const filled = (i, j) => i >= 0 && j >= 0 && i < this.w && j < this.h && this.data[j * this.w + i]
          && this.data[j * this.w + i] !== c;
        if (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)) marks.push(y * this.w + x);
      }
    }
    for (const at of marks) this.data[at] = c;
    return this;
  }

  canvas() {
    const canvas = document.createElement('canvas'), pixels = [];
    canvas.width = this.w;
    canvas.height = this.h;
    const ctx = canvas.getContext('2d');
    this.data.forEach((c, at) => {
      if (!c) return;
      const x = at % this.w, y = Math.floor(at / this.w);
      ctx.fillStyle = c;
      ctx.fillRect(x, y, 1, 1);
      pixels.push({ x, y, color: c });
    });
    own(canvas, 'pixels', () => pixels);
    return canvas;
  }
}

export const HERO_SIZE = 16;

const LOOKS = {
  sniper: { coat: ['#5b7a3a', '#3f5628', '#78994d'], hat: 'hood', hatColor: ['#6d8f45', '#4a6430'], weapon: 'rifle' },
  gunner: { coat: ['#6b7280', '#4b5563', '#8b93a0'], hat: 'helmet', hatColor: ['#4d6b1f', '#344a14'], weapon: 'gun' },
  bomber: { coat: ['#9a3b16', '#6e2a10', '#b8521f'], hat: 'helmet', hatColor: ['#f5a524', '#b87412'],
    weapon: 'launcher' },
  thunder: { coat: ['#2848a8', '#1b3378', '#3d63cf'], hat: 'wizard', hatColor: ['#2f5bd6', '#1e3d99'],
    glow: '#ffe14d', weapon: 'staff' },
  alchemist: { coat: ['#dfe4ea', '#9aa4b1', '#ffffff'], hat: 'goggles', hatColor: ['#7a3e1d', '#552a13'],
    glow: '#9be22d', weapon: 'flask' },
  pyro: { coat: ['#8a1c1c', '#5c1010', '#b02a2a'], hat: 'mask', hatColor: ['#d93025', '#9b1f17'], glow: '#ffc233',
    weapon: 'flamer', back: 'tanks' },
  hunter: { coat: ['#7a4a1e', '#523113', '#9a6330'], hat: 'ranger', hatColor: ['#a8792e', '#73501b'],
    glow: '#c0392b', weapon: 'crossbow' },
  frost: { coat: ['#bfefff', '#6cc6e3', '#ffffff'], hat: 'wizard', hatColor: ['#e2f6ff', '#8fd3ec'],
    glow: '#5ee7ff', weapon: 'wand' },
  shaman: { coat: ['#13665e', '#0c4640', '#1b8a7f'], hat: 'feathers', hatColor: ['#2b2118', '#16100a'],
    glow: '#f08a24', weapon: 'totem' },
  banner: { coat: ['#b3175f', '#7c0f42', '#d8307c'], hat: 'plume', hatColor: METAL, glow: '#ff5fb0',
    weapon: 'flag' },
  healer: { coat: ['#eef7f0', '#a9c9b2', '#ffffff'], hat: 'cap', hatColor: ['#ffffff', '#c8d6cc'], glow: '#22c55e',
    weapon: 'amulet' },
  sage: { coat: ['#5b1d8f', '#3b0f63', '#7a34b5'], hat: 'hood', hatColor: ['#7e2bc4', '#561b8a'], glow: '#e9c8ff',
    weapon: 'book' },
  earth: { coat: ['#8a6a44', '#5e4a30', '#a8875a'], hat: 'stone', hatColor: ['#9a8f80', '#6b6258'], glow: '#c08a4a',
    weapon: 'hammer' },
  miner: { coat: ['#3b4a6b', '#28334d', '#55668f'], hat: 'lamp', hatColor: ['#e0b43a', '#a88220'], glow: '#fff3b0',
    weapon: 'detonator' },
};

function heldWeapon(p, kind, look) {
  const g = look.glow || '#ffffff';
  if (kind === 'rifle') {
    p.box(7, 0, 1, 7, METAL[2]);
    p.box(7, 3, 2, 2, '#2a2f38');
    p.px(8, 3, '#7fd4ff');
  } else if (kind === 'gun') {
    p.box(7, 0, 2, 3, METAL[2]);
    p.box(6, 3, 4, 4, METAL[1]);
    p.rect(6, 3, 4, 1, METAL[0]);
    p.box(10, 5, 2, 2, '#e3b341');
  } else if (kind === 'launcher') {
    p.box(6, 0, 4, 7, '#5b7330');
    p.rect(6, 0, 4, 1, '#2a2f38');
    p.rect(9, 1, 1, 6, '#3d4f20');
    p.px(7, 3, '#ff7a1f');
  } else if (kind === 'staff' || kind === 'wand') {
    p.box(7, 2, 2, 6, kind === 'wand' ? '#d6f4ff' : WOOD[0]);
    p.rect(8, 2, 1, 6, kind === 'wand' ? '#8fd3ec' : WOOD[1]);
    if (kind === 'staff') {
      p.ball(8, 1.5, 1.7, g, '#c9a10f', '#ffffff');
    } else {
      p.box(7, 0, 2, 2, g);
      p.px(7, 0, '#ffffff');
    }
  } else if (kind === 'flask') {
    p.box(7, 0, 2, 2, '#e8eef4');
    p.ball(8, 3.8, 2.2, g, '#5b9a12', '#d9ff8f');
    p.px(7, 3, '#ffffff');
  } else if (kind === 'flamer') {
    p.box(7, 1, 2, 6, METAL[2]);
    p.rect(7, 2, 1, 4, METAL[1]);
    p.rect(7, 0, 2, 1, g);
  } else if (kind === 'crossbow') {
    p.bar(3, 3, 7, 1, WOOD[1], 1);
    p.bar(9, 1, 13, 3, WOOD[1], 1);
    p.box(7, 0, 2, 7, WOOD[0]);
    p.rect(8, 1, 1, 6, WOOD[1]);
    p.px(7, 0, METAL[0]);
    p.px(8, 0, METAL[0]);
  } else if (kind === 'totem') {
    p.box(7, 0, 2, 8, WOOD[0]);
    p.rect(8, 0, 1, 8, WOOD[1]);
    p.rect(7, 1, 2, 1, '#e6c87a');
    p.px(6, 0, g);
    p.px(9, 0, '#1fb5a5');
  } else if (kind === 'flag') {
    p.box(7, 0, 1, 8, WOOD[0]);
    p.box(8, 1, 4, 3, g);
    p.rect(8, 3, 4, 1, '#c2307e');
    p.px(7, 0, '#ffd84a');
  } else if (kind === 'amulet') {
    p.ball(8, 3, 2, g, '#15803d', '#bbf7d0');
    p.px(7, 2, '#ffffff');
  } else if (kind === 'hammer') {
    p.box(7, 2, 2, 6, WOOD[0]);
    p.rect(8, 2, 1, 6, WOOD[1]);
    p.box(5, 0, 6, 3, STONE[0]);
    p.rect(5, 0, 6, 1, STONE[2]);
    p.px(10, 2, '#6b6258');
    p.px(6, 1, g);
  } else if (kind === 'detonator') {
    p.box(5, 2, 6, 4, '#c0392b');
    p.rect(5, 2, 6, 1, '#e2574c');
    p.box(7, 0, 2, 2, METAL[1]);
    p.rect(6, 0, 4, 1, METAL[0]);
    p.px(9, 4, '#ffd84a');
  } else if (kind === 'book') {
    p.box(4, 2, 8, 4, '#f3e9d2');
    p.rect(4, 2, 8, 1, '#5b1d8f');
    p.rect(7, 2, 2, 4, '#c9b48a');
    p.rect(5, 3, 2, 1, '#8a6fb0');
    p.rect(9, 4, 2, 1, '#8a6fb0');
  }
}

function head(p, look) {
  const [c, d] = look.hatColor, g = look.glow || '#ffffff', x = 8, y = 10;
  if (look.hat === 'hood') {
    p.ball(x, y, 2.5, c, d);
    p.rect(7, 12, 2, 1, d);
    p.rect(7, 8, 2, 1, '#2a1e18');
  } else if (look.hat === 'helmet') {
    p.ball(x, y, 2.6, c, d, '#ffffff');
    p.rect(6, 8, 4, 1, d);
  } else if (look.hat === 'wizard') {
    p.ball(x, y, 3.3, c, d);
    p.ball(x, y, 1.5, d);
    p.disc(x, y, 0.8, g);
  } else if (look.hat === 'goggles') {
    p.ball(x, y, 2.4, c, d);
    p.box(6, 8, 4, 1, '#3a3a46');
    p.px(6, 8, g);
    p.px(9, 8, g);
  } else if (look.hat === 'mask') {
    p.ball(x, y, 2.5, c, d);
    p.box(6, 8, 4, 1, g);
  } else if (look.hat === 'ranger') {
    p.ball(x, y, 3.4, c, d);
    p.ball(x, y, 1.7, d);
    p.rect(7, 9, 2, 1, g);
  } else if (look.hat === 'feathers') {
    for (const [fx, fy] of [[4, 8], [5, 7], [11, 8], [10, 7]]) p.box(fx, fy, 1, 1, g);
    p.ball(x, y, 2.4, c, d);
    p.rect(6, 10, 5, 1, '#1fb5a5');
  } else if (look.hat === 'plume') {
    p.ball(x, y, 2.5, METAL[0], METAL[1], '#ffffff');
    p.box(7, 7, 2, 6, g);
    p.rect(7, 7, 1, 6, '#ff9fd0');
  } else if (look.hat === 'stone') {
    p.ball(x, y, 2.7, c, d, STONE[2]);
    p.px(7, 9, d);
    p.px(9, 11, d);
    p.rect(7, 7, 2, 1, g);
  } else if (look.hat === 'lamp') {
    p.ball(x, y, 2.6, c, d, '#fff2a8');
    p.rect(6, 10, 5, 1, d);
    p.box(7, 7, 2, 1, g);
  } else if (look.hat === 'cap') {
    p.ball(x, y, 2.5, c, d);
    p.rect(7, 8, 2, 4, g);
    p.rect(6, 9, 4, 2, g);
  }
}

function makeHero(id) {
  if (ART[id]) return artSprite(id, 0);
  const look = LOOKS[id], p = new Pix(HERO_SIZE, HERO_SIZE), [coat, dark, light] = look.coat;
  if (look.back === 'tanks') {
    p.box(4, 12, 3, 4, '#c0392b');
    p.box(9, 12, 3, 4, '#c0392b');
    p.rect(4, 12, 1, 4, '#e2574c');
    p.rect(9, 12, 1, 4, '#e2574c');
  }
  p.oval(8, 11, 6.3, 3.1, coat, dark, light);
  heldWeapon(p, look.weapon, look);
  p.bar(3, 10, 5, 7, dark, 2);
  p.bar(12, 10, 10, 7, dark, 2);
  p.box(6, 6, 1, 1, SKIN[0]);
  p.box(9, 6, 1, 1, SKIN[0]);
  head(p, look);
  return p.outline().canvas();
}

const ART = {
  zombie: {
    colors: { g: '#8fb35e', G: '#5f7f3a', L: '#b8d98a', h: '#3a2b20', H: '#5a4330', s: '#6b4f8a', S: '#4b3563',
      t: '#8d6db0', p: '#3c4250', P: '#2a2e3a', r: '#9b2226', b: '#ddd6c1' },
    rows: [
      '...............',
      '..Lg.......gL..',
      '..gG..hhh..Gg..',
      '..gG.hHhHh.Gg..',
      '..tS.hhLhh.St..',
      '..tSGhggghGSt..',
      '.StsSGgggGSstS.',
      '.SsssSGgGSsssS.',
      '.SsstsssssrssS.',
      '..SrstssstsrS..',
      '..SsrststsSsS..',
      '..S.SsSsSsS.S..',
      '....pP...Pp....',
      '....pP...Pp....',
      '...............',
    ],
    walk: {
      1: '..Lg...........',
      2: '..gG..hhh..Lg..',
      3: '..gG.hHhHh.gG..',
      13: '....pP.........',
    },
  },
  skeleton: {
    colors: { w: '#ebe5d6', W: '#b0a690', k: '#2b2633', m: '#9aa3ad', M: '#e3e8ee', x: '#7a4a22', K: '#4a4452' },
    rows: [
      '...........M...',
      '...........m...',
      '...w..www.xwx..',
      '...W.wwwww.x...',
      '...W.wkwkw.W...',
      '...w..WWW..w...',
      '...WwwwwwwwW...',
      '....wwwwwww....',
      '....wkkwkkw....',
      '....wwwwwww....',
      '....wkkwkkw....',
      '.....wwwww.....',
      '.....WKWKW.....',
      '.....w...w.....',
      '...............',
    ],
    walk: {
      13: '.....w.........',
    },
  },
  imp: {
    colors: { r: '#d6453d', R: '#9b2a24', o: '#f2786a', h: '#f1e3c4', H: '#b9a684', y: '#ffd84a', w: '#7a2430',
      W: '#4a1218', k: '#2a0d0d' },
    rows: [
      '...............',
      '....h.....h....',
      '....HyrrryH....',
      '.W...roror...W.',
      '.Ww..RrRrR..wW.',
      'WwwWrrrrrrrWwwW',
      'WwwwRrrorrRwwwW',
      '.WwwRrrrrrRwwW.',
      '..W.RrrrrrR.W..',
      '.....RrRrR.....',
      '.....R.R.R.....',
      '.....k.R.k.....',
      '......RRR......',
      '......krk......',
      '...............',
    ],
    walk: {
      3: '.W...rorr...W..',
      4: '.W...RrRrR..W..',
      5: 'WwW.rrrrrrr.WwW',
      6: 'WwwWRrrorrRWwwW',
      8: '..WwRrrrrrRwW..',
    },
  },
  dog: {
    colors: { f: '#9a7552', F: '#5e4430', l: '#c2a07a', e: '#ff3b3b', n: '#2a1a12' },
    rows: [
      '...............',
      '...............',
      '......FnF......',
      '......lll......',
      '....FfefefF....',
      '....FfffffF....',
      '......fff......',
      '....FFfffFF....',
      '....nflllfn....',
      '.....flllf.....',
      '.....flllf.....',
      '....FFfffFF....',
      '....n.FfF.n....',
      '.......f.......',
      '...............',
    ],
    walk: {
      6: '....n.fff......',
      7: '....FFfffF.....',
      8: '.....flllfFF...',
      9: '.....flllf.n...',
      10: '.....flllfFF...',
      11: '....FFfffF.n...',
      12: '....FF.FfF.....',
      13: '....n..f.......',
    },
  },
  hellhound: {
    colors: { f: '#3a3036', F: '#1c161a', l: '#ff7a1f', e: '#ffe14d', n: '#120c0f', k: '#d9c9b8', o: '#ff7a1f',
      O: '#ffc233' },
    rows: [
      '...............',
      '...............',
      '......FnF......',
      '......lll......',
      '....FfefefF....',
      '....FfffffF....',
      '......fff......',
      '....FFfffFF....',
      '....nfoOofn....',
      '.....flolf.....',
      '.....foOof.....',
      '....FFfffFF....',
      '....n.FfF.n....',
      '.......O.......',
      '...............',
    ],
    walk: {
      6: '....n.fff......',
      7: '....FFfffF.....',
      8: '.....fooOfFF...',
      9: '.....flllf.n...',
      10: '.....flllfFF...',
      11: '....FFfffF.n...',
      12: '....FF.FfF.....',
      13: '....n..f.......',
    },
  },
  crow: {
    colors: { b: '#2a2733', B: '#16141c', s: '#45425e', S: '#6b6890', y: '#f2b33d', Y: '#b97c1c', w: '#e6e6f0' },
    rows: [
      '...............',
      '.......y.......',
      '......bYb......',
      '......wbw......',
      '......bsb......',
      'BBbbbbbsbbbbbBB',
      '.BbsSsbbbsSsbB.',
      '..BBbsbsbsbBB..',
      '....BBbbbBB....',
      '.....bbbbb.....',
      '......BbB......',
      '.....BbBbB.....',
      '.....B.B.B.....',
      '...............',
      '...............',
    ],
    walk: {
      2: '..B...bYb...B..',
      3: '..Bb..wbw..bB..',
      4: '...Bb.bsb.bB...',
      5: '...BbsbsbsbB...',
      6: '....Bbbsbbb....',
      7: '.....bbsbb.....',
      8: '.....Bbbbb.....',
    },
  },
  bat: {
    colors: { p: '#5b3a6e', P: '#3a2347', m: '#8a68a0', e: '#ff5a5a', f: '#f1e9f7', k: '#241532' },
    rows: [
      '...............',
      '...............',
      '......P.P......',
      'P.....ppp.....P',
      'PP...PepeP...PP',
      'PmPPPpppppPPPmP',
      'PmmmmPpfpPmmmmP',
      'Pmm.mPpppPm.mmP',
      'P...P.ppp.P...P',
      '.......P.......',
      '...............',
      '...............',
      '...............',
      '...............',
      '...............',
    ],
    walk: {
      3: '...............',
      4: '...P.Pepep.P...',
      5: '..PmPPpppPPmP..',
      6: '..PmmPppfpPmmP.',
      7: '...PmPpppppPmP.',
      8: '....P..ppp..P..',
    },
  },
  rat: {
    colors: { f: '#8d8d96', F: '#5f5f69', l: '#b4b4be', p: '#e58fa5', e: '#141414' },
    rows: [
      '...........',
      '.....p.....',
      '....fff....',
      '..FpefepF..',
      '...fffff...',
      '..FfflffF..',
      '..FfflffF..',
      '..FfflffF..',
      '...FFfFF...',
      '.....p.....',
      '......p....',
    ],
    walk: {
      9: '......p....',
      10: '......pp...',
    },
  },
  brute: {
    colors: { g: '#7f9a5c', G: '#566b3d', L: '#a3c27a', c: '#5a4a3a', C: '#3d3127', d: '#8a7457', m: '#9aa3ad',
      k: '#2a0d0d', s: '#c2786a', n: '#e8dcc8' },
    rows: [
      '...................',
      '..nn...........nn..',
      '.gLgG.........GgLg.',
      '.gggG...ggg...Gggg.',
      '.GgGG..gLgLg..GGgG.',
      '..GG...ggsgg...GG..',
      '..gGgggGgsgGgggGg..',
      '.gGgLggGgggGggLgGg.',
      '.gGggggGGgGGggggGg.',
      '..GgggcCgggCcgggG..',
      '..GgggcgggggcgggG..',
      '...GgcgggggggcgG...',
      '...GcgggggggggcG...',
      '...CcdcCcdcCcdcC...',
      '....cCcCcccCcCc....',
      '.....GgG...GgG.....',
      '.....GG.....GG.....',
      '...................',
      '...................',
    ],
    walk: {
      1: '..............nn...',
      2: '..nn.........GgLg..',
      3: '.gLgG...ggg..Gggg..',
      4: '.gggG..gLLg..GGgG..',
      15: '.....GgG...........',
      16: '.....GG............',
    },
  },
  demon: {
    colors: { r: '#b8322c', R: '#7c1d19', o: '#e05a4a', h: '#2b2430', H: '#5a4f62', y: '#ffe14d', w: '#5e1a2a',
      W: '#3a0d16', n: '#f1e3c4', k: '#1a0507' },
    rows: [
      '...................',
      '...h...........h...',
      '...Hh...rrr...hH...',
      '.nn.Hh.ryryr.hH.nn.',
      '.rR..hrrororrh..Rr.',
      '.rR..RrrRrRrrR..Rr.',
      '..rR.RRrrrrrRR.Rr..',
      'W..RrrrrRrRrrrrR..W',
      'Ww.RrrrRrorRrrrR.wW',
      'WwWRrrrrRrRrrrrRWwW',
      'WwwWRrrRrorRrrRWwwW',
      '.WwwRrrrRrRrrrRwwW.',
      '..WwRrrrrRrrrrRwW..',
      '...WRRrrrrrrrRRW...',
      '.....RrR.R.RrR.....',
      '.....RR..R..RR.....',
      '........RRR........',
      '........krk........',
      '...................',
    ],
    walk: {
      15: '.....RR..R.........',
      16: '........RR..RR.....',
    },
  },
  leader: {
    colors: { f: '#2f2f38', F: '#1b1b22', l: '#4a4a58', e: '#ffdf3a', n: '#0c0c10', k: '#5a5a68', c: '#a83232',
      m: '#d4dae1' },
    rows: [
      '...................',
      '........nnn........',
      '........lll........',
      '......FfflffF......',
      '......FeflfeF......',
      '.....F.fffff.F.....',
      '......cmcmcmc......',
      '....FFfffffffFF....',
      '...FFffflllfffFF...',
      '...k..fflllff..k...',
      '......ffflfff......',
      '......ffflfff......',
      '....FFfffffffFF....',
      '...FFfFfffffFfFF...',
      '...k...FfFfF...k...',
      '.........F.........',
      '.........f.........',
      '.........F.........',
      '...................',
    ],
    walk: {
      7: '....FFffffffffFF...',
      8: '...FFfffllfffff....',
      9: '...k..fflllffFF....',
      10: '......ffflfff.k....',
      12: '....FFffffffff.....',
      14: '...k...FfFfF....k..',
    },
  },
  plague: {
    colors: { g: '#a8c95a', G: '#74913a', r: '#4a6b30', R: '#2a3e1c', o: '#6a8f46', b: '#efe6cf', B: '#b9ab88',
      p: '#d6ff4a', k: '#151a0e', h: '#5a4330' },
    rows: [
      '...................',
      '.........b.........',
      '........bBb........',
      '......RrbbbrR......',
      '.....RrorrrorR.....',
      '.....RrrrrrrrR.....',
      '..gp.RRrrrrrRR.pg..',
      '..GRRrrRrrrRrrRRG..',
      '.RrrrrRrrrrrRrrrrR.',
      '.RrorrRrorprRrrorR.',
      '.RrrrprRrrrRrrrrrR.',
      '.RrorrrrRrRrrrrorR.',
      '..RrrrrRrrrRprrrR..',
      '..RrRrrrRrRrrrRrR..',
      '..R.Rr.R.r.R.rR.R..',
      '...................',
      '...................',
      '...................',
      '...................',
    ],
    walk: {
      6: '..gp.RRrrrrRR..p...',
      7: '..GRRrrRrrrRrRRgG..',
    },
  },
  knight: {
    colors: { m: '#9aa3ad', M: '#d4dae1', D: '#5d6672', k: '#1d222a', g: '#a8c95a', r: '#a52a2a', b: '#3b4a63',
      B: '#283247', y: '#ffd84a', s: '#c9ced6' },
    rows: [
      '...................',
      '.........r......M..',
      '........rrr.....s..',
      '......DmMmMmD...s..',
      '......mkkkkkm...s..',
      '.....DmmMmMmmD.kkk.',
      '.BbbMmDmmMmmDmMMD..',
      '.BbymDmmmmmmmDmmM..',
      '.BbbmmmDmmmDmmmmD..',
      '.BbDmmmmMmMmmmmD...',
      '..BDmmDmmmmmDmmD...',
      '....DmmmmDmmmmD....',
      '....DDmmmmmmmDD....',
      '.....Dm.DmD.mD.....',
      '.....D..D.D..D.....',
      '...................',
      '...................',
      '...................',
      '...................',
    ],
  },
  ratking: {
    colors: { f: '#7d7d88', F: '#55555f', l: '#a3a3ae', p: '#e58fa5', e: '#ff4040', y: '#ffd84a', Y: '#c99a1a',
      r: '#7a2ad0' },
    rows: [
      '...................',
      '.........p.........',
      '........fff........',
      '......y.yYy.y......',
      '......YyYrYyY......',
      '....Fp.efffe.pF....',
      '....FpfffffffpF....',
      '......fffffff......',
      '....FFffflfffFF....',
      '...FfFffflfffFfF...',
      '...FffFfflffFffF...',
      '...FfffFflfFfffF...',
      '....FfffffffffF....',
      '.....FFfffffFF.....',
      '........FfF........',
      '.........p.........',
      '.........p.........',
      '...................',
      '...................',
    ],
    walk: {
      16: '..........p........',
    },
  },
  blazer: {
    colors: { r: '#e0542a', R: '#9b2a14', o: '#ff8a3d', O: '#ffd84a', h: '#2b2430', y: '#ffffff', w: '#b8321c',
      W: '#5e1a10', k: '#2a0d0d', f: '#ffc233' },
    rows: [
      '........O.O........',
      '.......fOfOf.......',
      '....h..ofofo..h....',
      '....hRyrOrOryRh....',
      '......ror.ror......',
      '..W...rorrror...W..',
      '.Ww.RrrrrOrrrrR.wW.',
      'Wwww.RrorfrorR.wwwW',
      'WwwwWRrrrorrrRWwwwW',
      '.WwwRrrrOrOrrrRwwW.',
      '.WwwRrrrrrrrrrRwwW.',
      '..WwRrrrrorrrrRwW..',
      '...W.RrrrOrrrR.W...',
      '......RrrRrrR......',
      '......R..R..R......',
      '......k..R..k......',
      '.........R.........',
      '........ofo........',
      '.........O.........',
    ],
    walk: {
      0: '.......O..O........',
      1: '........fOf........',
    },
  },
  butcher: {
    colors: { s: '#d9a58e', S: '#a8735f', L: '#efc4b0', a: '#ece6d8', A: '#b9af9b', r: '#a61b1b', R: '#6e1010',
      m: '#c9ced6', M: '#eef1f5', D: '#6d7684', w: '#6e4524', k: '#2a0d0d', h: '#3a2b20' },
    rows: [
      '.........................',
      '...................MMm...',
      '...sLs.............rmm...',
      '..sssSs...........smmDs..',
      '..SssSS...........SmDrS..',
      '...SSS....hhhhh....SwS...',
      '...SsS...hsshssh...SwS...',
      '...sSs..hsLsssLsh..sws...',
      '..SssSsssSsssssSsssSssS..',
      '.SsssssSsSSsssSSsSsssssS.',
      '.SssssssaaSSaSSaassssssS.',
      '.SsssSsaaaaaaaaaaasSsssS.',
      '.SSsssaaAaaaraaaAaasssSS.',
      '..SsssaaaaarRraaaaasssS..',
      '..SSssaAaaaaraaaaAassSS..',
      '...SSsaaaraaaaaraaasSS...',
      '....SsaaaRRaaaRRaaasS....',
      '....SsaAaarararaaAasS....',
      '.....SaaaaaaAaaaaaaS.....',
      '.....SAaAaAaAaAaAaAS.....',
      '......SSs..SsS..sSS......',
      '......SSs..SsS..sSS......',
      '......kk...kkk...kk......',
      '.........................',
      '.........................',
    ],
    walk: {
      21: '......SSs..SsS...........',
      22: '......kk...kk............',
    },
  },
  crusher: {
    colors: { g: '#6f8f4f', G: '#4b6334', L: '#93b56c', c: '#4a3b2e', C: '#30261d', d: '#665241', m: '#c9ced6',
      M: '#eef1f5', D: '#6d7684', w: '#7a4a22', W: '#4e2e14', k: '#2a0d0d', r: '#8a2b0f', s: '#c2786a' },
    rows: [
      '.........................',
      '..M...M...........M...M..',
      '..mDMDm...........mDMDm..',
      '..DwWwD...........DwWwD..',
      '...wWw.............wWw...',
      '..gwWwg.....g.....gwWwg..',
      '.gLgggGg...gsg...gGgggLg.',
      '.gggggGG..gLsLg..GGggggg.',
      'M.GgggG..ggLgLgg..GgggG.M',
      'mDDDDGgg.ggggggg.ggGDDDDm',
      'MDmmmDDGgggGgGgggGDDmmmDM',
      '.DDDDDDgggggggggggDDDDDD.',
      '..GDDDGggLgggggLggGDDDG..',
      '...GggggggggGggggggggG...',
      '...GgggggggGgGgggggggG...',
      '....GgggrgggggggrgggG....',
      '....GCccdcCcdcCcdccCG....',
      '.....CcCcCcCcCcCcCcC.....',
      '.....cCcdcCcdcCcdcCc.....',
      '......GgG..GGG..GgG......',
      '......GgG..GgG..GgG......',
      '......GG....G....GG......',
      '.........................',
      '.........................',
      '.........................',
    ],
    walk: {
      20: '......GgG..GgG...........',
      21: '......GG....G............',
    },
  },
  mother: {
    colors: { f: '#6e6676', F: '#4a4452', l: '#948b9c', p: '#e58fa5', P: '#b8607a', e: '#ff4040', b: '#9c94a6',
      B: '#7a7286' },
    rows: [
      '.........................',
      '.........................',
      '............p............',
      '...........FfF...........',
      '..........FfffF..........',
      '..........fefef..........',
      '.........pFfffFp.........',
      '........pPfffffPp........',
      '.........FfffffF.........',
      '......FFFfffffffFFF......',
      '...FFFfffffffffffffFFF...',
      '...FfffffpfffffffffffF...',
      '..FfffffbbbfffffffffffF..',
      '..FfffffBbBlllffffffffF..',
      '..FffffffBflllfpffffffF..',
      '..FffffffffflfbbbfffffF..',
      '...FffffffffffBbBffffF...',
      '...FFffffffffffBffffFF...',
      '....FFfffffffffffffFF....',
      '...F.FFFfffffffffFFF.F...',
      '........FFFFfFFFF........',
      '............p............',
      '............p............',
      '............p............',
      '.........................',
    ],
    walk: {
      22: '.............p...........',
      23: '..............p..........',
    },
  },
  warden: {
    colors: { m: '#8f99a8', M: '#c9ced6', D: '#4f5866', k: '#1d222a', b: '#3b4a63', B: '#283247', y: '#ffd84a',
      Y: '#c99a1a', c: '#67e8f9', g: '#a3a3ae', r: '#5b1d8f', R: '#3b0f63' },
    rows: [
      '.........................',
      '.........................',
      '..........DmMmD..........',
      '.........DmMMMmD...Yy....',
      '.........mkkckkm...ycy...',
      '.Bbbbbb..DmmMmmD....Y....',
      '.BYyYbb.DmmMmMmmD........',
      '.BbybbbMDmmmmmmmDMM......',
      '.BbybbbmDmmMmMmmDmmM.....',
      '.BYyYbbmmmDmmmDmmmmD.....',
      '.BbybbbmmmmMmMmmmmD......',
      '.BbybbbmmDmmmmmDmmD......',
      '.BbybbbmmmmDmDmmmmD......',
      '.BbYbbbDrmrmrmrmrDD......',
      '.BbbbbbDrrrrrrrrrD.......',
      '.BbbbbbDrrRrrrRrrD.......',
      '.Bbbbbb.DrrrrrrrD........',
      '.BBBBBB.Dr.DrD.rD........',
      '........D..D.D..D........',
      '.........................',
      '.........................',
      '.........................',
      '.........................',
      '.........................',
      '.........................',
    ],
  },
  archdemon: {
    colors: { r: '#b8322c', R: '#7c1d19', o: '#e05a4a', h: '#2b2430', H: '#5a4f62', y: '#ffe14d', w: '#7a1f2c',
      W: '#3a0d16', v: '#a33042', n: '#f1e3c4', f: '#ff8a3d', F: '#ffd84a', k: '#1a0507' },
    rows: [
      '..........f.F.f..........',
      '........h.fFfFf.h........',
      '.......Hh.FfFfF.hH.......',
      '........HhfFfFfhH........',
      'W.........hyryh.........W',
      'WW......nn.rrr.nn......WW',
      'WvW....rRRrrrrrRRr....WvW',
      'WwvW..rRrrrrorrrrRr..WvwW',
      'WwwvW.RrrrRrrrRrrrR.WvwwW',
      'WwwwvWRrrrrrrrrrrrRWvwwwW',
      'WwwwwvRrrrrororrrrRvwwwwW',
      'WwwwwWRrRrrrrrrrRrRWwwwwW',
      'WwwwWW.RrrrRrRrrrR.WWwwwW',
      'WwwW...RrrrRoRrrrR...WwwW',
      'WwW....RrrrRrRrrrR....WwW',
      'WW......RrrRrRrrR......WW',
      'W.......RrRrRrRrR.......W',
      '........RR..R..RR........',
      '........RR..R..RR........',
      '............R............',
      '...........RRR...........',
      '...........krk...........',
      '.........................',
      '.........................',
      '.........................',
    ],
    walk: {
      18: '........RR..R...RR.......',
    },
  },
  parasite: {
    colors: { p: '#d946ef', P: '#a21caf', o: '#f5b8ff', d: '#701a75', h: '#4a1450', H: '#2e0b33', n: '#f1e3c4',
      e: '#ffe14d', l: '#3b1240' },
    rows: [
      '................',
      '................',
      '................',
      '......n..n......',
      '......hhhh......',
      '...l.HheehH.l...',
      '....lPppppPl....',
      '...lPppooppPl...',
      '....PpdppdpP....',
      '...lPppppppPl...',
      '....PpPddPpP....',
      '.....PPppPP.....',
      '................',
      '................',
      '................',
      '................',
    ],
    walk: {
      5: '....l.Hheehh.l..',
      7: '....lPpppoppP...',
      9: '....lPppppppPl..',
    },
  },
  slime1: {
    colors: { g: '#4ade80', G: '#16a34a', L: '#86efac', W: '#f0fdf4', e: '#0f172a', y: '#facc15', Y: '#ca8a04',
      r: '#ef4444' },
    rows: [
      '.........',
      '...LLg...',
      '..WLggg..',
      '.LLggggg.',
      '.LgegegG.',
      '.ggggggG.',
      '..ggggG..',
      '...gGG...',
      '.........',
    ],
    walk: {
      1: '.........',
      2: '...LLg...',
      3: '.LWggggg.',
      4: '.Lgegegg.',
      6: '.gggggGG.',
    },
  },
  slime2: {
    colors: { g: '#4ade80', G: '#16a34a', L: '#86efac', W: '#f0fdf4', e: '#0f172a', y: '#facc15', Y: '#ca8a04',
      r: '#ef4444' },
    rows: [
      '.............',
      '.....LLg.....',
      '...LLLgggg...',
      '..LLWWggggg..',
      '..LLWgggggg..',
      '.LLggggggggG.',
      '.LggegggegGG.',
      '.gggggggggGG.',
      '..gggggggGG..',
      '..ggggggGGG..',
      '...gggGGGG...',
      '.....GGG.....',
      '.............',
    ],
    walk: {
      1: '.............',
      2: '.....LLg.....',
      3: '...LLLgggg...',
      4: '..LWWgggggg..',
      5: '.LLWgggggggg.',
      6: '.Lggegggeggg.',
      8: '.gggggggggGG.',
      9: '..gggggggGG..',
      10: '...ggggGGG...',
    },
  },
  slime3: {
    colors: { g: '#4ade80', G: '#16a34a', L: '#86efac', W: '#f0fdf4', e: '#0f172a', y: '#facc15', Y: '#ca8a04',
      r: '#ef4444' },
    rows: [
      '.................',
      '.......LLg.......',
      '.....LLLgggg.....',
      '...LLLLggggggg...',
      '...LLWWggggggg...',
      '..LLLWggggggggg..',
      '..LLggggggggggg..',
      '.LLggggggggggggG.',
      '.LgggegggggeggGG.',
      '.ggggegggggegGGG.',
      '..gggggggggggGG..',
      '..ggggggggggGGG..',
      '...ggggggggGGG...',
      '...ggggggGGGGG...',
      '.....gggGGGG.....',
      '.......GGG.......',
      '.................',
    ],
    walk: {
      1: '.................',
      2: '.......LLL.......',
      3: '....LLLLggggg....',
      4: '...LLLLggggggg...',
      5: '..LLWWggggggggg..',
      6: '.LLLWggggggggggg.',
      7: '.LLLgggggggggggg.',
      8: '.LgggegggggegggG.',
      9: '.ggggegggggeggGG.',
      10: '.ggggggggggggGGG.',
      11: '.ggggggggggggGGG.',
      12: '..ggggggggggGGG..',
      14: '....ggggGGGGG....',
    },
  },
  slimeking: {
    colors: { g: '#4ade80', G: '#16a34a', L: '#86efac', W: '#f0fdf4', e: '#0f172a', y: '#facc15', Y: '#ca8a04',
      r: '#ef4444' },
    rows: [
      '........Y..r..Y........',
      '........y..y..y........',
      '........yyyyyyy........',
      '.......................',
      '........LLLLggg........',
      '......LLLLLgggggg......',
      '.....LLLLLgggggggg.....',
      '....LLLLLgggggggggg....',
      '...LLLLWWggggggggggg...',
      '...LLLLWgggggggggggg...',
      '...LLLgggggggggggggg...',
      '..LLLgggggggggggggggG..',
      '..LLggggegggggeggggGG..',
      '..LgggggegggggegggGGG..',
      '..gggggggggggggggGGGG..',
      '...ggggggggggggggGGG...',
      '...ggggggggggggggGGG...',
      '...gggggggggggggGGGG...',
      '....ggggggggggGGGGG....',
      '.....gggggggGGGGGG.....',
      '......gggggGGGGGG......',
      '........ggGGGGG........',
      '.......................',
    ],
    walk: {
      0: '.......................',
      1: '........Y..r..Y........',
      2: '........y..y..y........',
      3: '........yyyyyyy........',
      4: '.......................',
      5: '........LLLLggg........',
      6: '......LLLLLgggggg......',
      7: '....LLLLLLggggggggg....',
      8: '....LLLLLgggggggggg....',
      9: '...LLLLWWggggggggggg...',
      10: '..LLLLLWggggggggggggg..',
      11: '..LLLgggggggggggggggg..',
      12: '..LLggggggggggggggggG..',
      13: '..LgggggegggggeggggGG..',
      14: '..ggggggegggggegggGGG..',
      15: '..ggggggggggggggggGGG..',
      16: '..gggggggggggggggGGGG..',
      18: '....gggggggggggGGGG....',
      19: '....ggggggggGGGGGGG....',
    },
  },
  ember: {
    colors: { y: '#fff7c2', o: '#ffd84a', O: '#ff9a1f', r: '#ff5a1f', R: '#b8320f', k: '#3a0d06' },
    rows: [
      '...............',
      '...r...r...r...',
      '...rO.rOr.Or...',
      '..rOOrOoOrOOr..',
      '..rOoooooooOr..',
      '.rOooyyyyyooOr.',
      '.rOokyyyyykoOr.',
      '.rOoyyyyyyyoOr.',
      '.rOooyyyyyooOr.',
      '..rOoooooooOr..',
      '..RrOOOoOOOrR..',
      '...RrrOOOrrR...',
      '....RRrrrRR....',
      '......RRR......',
      '...............',
    ],
    walk: {
      1: '..r......r..r..',
      2: '..rO..r..rOrO..',
      3: '..rOOrOrOOOOr..',
    },
  },
  frostling: {
    colors: { w: '#f0fdff', c: '#a5f3fc', C: '#22d3ee', b: '#0e7490', B: '#164e63', y: '#e0f2fe' },
    rows: [
      '...............',
      '...w...w...w...',
      '...cw..c..wc...',
      '....cwcCcwc....',
      '.w..CcCbCcC..w.',
      '.cw.CbbBbbC.wc.',
      '..cCbyBbBybCc..',
      '...CbBBbBBbC...',
      '..wcCbBbBbCcw..',
      '.wc.CbbBbbC.cw.',
      '.c..cCbbbCc..c.',
      '....cwcCcwc....',
      '...cw..c..wc...',
      '...w...w...w...',
      '...............',
    ],
    walk: {
      1: '...............',
      2: '...w.......w...',
    },
  },
  stormling: {
    colors: { g: '#64748b', G: '#334155', l: '#94a3b8', y: '#facc15', Y: '#fef9c3', k: '#0f172a' },
    rows: [
      '...............',
      '...............',
      '....lll.lll....',
      '...lgglllggl...',
      '..lgggGgGgggl..',
      '.lggGGGgGGGggl.',
      '.lgGGkGGGkGGgl.',
      '.lgGGGYyYGGGgl.',
      '..gGGyYGYyGGg..',
      '.lgGGGyGyGGGgl.',
      '.lggGGGyGGGggl.',
      '..lggGGGGGggl..',
      '...gggGgGggg...',
      '....ggg.ggg....',
      '...............',
    ],
    walk: {
      7: '.lgGGGGGYGGGgl.',
      8: '..gGGGGYYGGGg..',
      9: '.lgGGGGYGGGGgl.',
      10: '.lggGGyGGGGggl.',
    },
  },
  sludge: {
    colors: { g: '#4d7c0f', G: '#1a2e05', L: '#84cc16', W: '#d9f99d', e: '#fde047', p: '#a855f7', b: '#bef264',
      y: '#facc15', Y: '#ca8a04', r: '#ef4444' },
    rows: [
      '...................',
      '..........b........',
      '.......LbLgg.......',
      '.....LLLLggggg.....',
      '....LLLLggggggg....',
      '...LLLWpgggggggg...',
      '...LLLWgggggpggg...',
      '..LLLgggggggggggg..',
      '..LLbgggggggggggG..',
      '..LgggegggggeggGG..',
      '..ggggegggggebGGG..',
      '..ggggpgggggggGGG..',
      '...ggggggggpggGG...',
      '...ggggggbgggGGG...',
      '....ggggggGGGGG....',
      '.....ggggGGGGG.....',
      '.......gGGGG.......',
      '......L.....L......',
      '............L......',
    ],
    walk: {
      2: '........b..........',
      3: '......LLLLggg......',
      4: '....LLLLLgggggg....',
      5: '...LLLLpgggggggg...',
      6: '..LLLWWgggggpgggg..',
      7: '..LLLWggggggggggg..',
      8: '.LLLbggggggggggggG.',
      9: '.LLgggegggggegggGG.',
      10: '.LggggegggggebgGGG.',
      11: '.gggggpggggggggGGG.',
      12: '..gggggggggpggGGG..',
      13: '..gggggggbgggGGGG..',
      14: '...gggggggGGGGGG...',
      17: '.....L.......L.....',
      18: '.....L.............',
    },
  },
  bonehound: {
    colors: { f: '#ebe5d6', F: '#a8a090', l: '#2b2633', e: '#ef4444', n: '#4a4452' },
    rows: [
      '...............',
      '...............',
      '......FnF......',
      '......fff......',
      '....FfefefF....',
      '....FfffffF....',
      '......fff......',
      '....FFflfFF....',
      '....nflflfn....',
      '.....flflf.....',
      '.....flflf.....',
      '....FFflfFF....',
      '....n.FfF.n....',
      '.......f.......',
      '...............',
    ],
    walk: {
      6: '....n.fff......',
      7: '....FFflfF.....',
      8: '.....fflffFF...',
      9: '.....fflff.n...',
      10: '.....fflffFF...',
      11: '....FFflfF.n...',
      12: '....FF.FfF.....',
      13: '....n..f.......',
    },
  },
  skelwarrior: {
    colors: { w: '#ebe5d6', W: '#b0a690', k: '#2b2633', m: '#9aa3ad', M: '#d4dae1', D: '#5d6672', r: '#7f1d1d',
      b: '#78350f', B: '#451a03', y: '#facc15' },
    rows: [
      '...................',
      '...................',
      '......DmMmMmD......',
      '......mkmkmkm...M..',
      '......DmMmMmD...m..',
      '...MM.DmmmmmD.MMm..',
      '.BBBBBwwwwwwwMmmm..',
      '.BbbbBwkkwkkwWmrrr.',
      '.BbybBwwwwwwwWwWB..',
      '.ByyyBwkkwkkww.W...',
      '.BbybBwwwwwwww.W...',
      '.BbbbBwkkwkkw......',
      '.BbbbBWWWWWWW......',
      '.BBBBBw..W..w......',
      '......w.....w......',
      '...................',
      '...................',
      '...................',
      '...................',
    ],
  },
  lich: {
    colors: { w: '#ebe5d6', W: '#b0a690', k: '#1c1917', p: '#581c87', P: '#3b0764', q: '#7e22ce', g: '#a3e635',
      G: '#4d7c0f', y: '#facc15', Y: '#a16207', b: '#78350f' },
    rows: [
      '.........................',
      '.........y.y.y.y.........',
      '.........yYyyyYy.........',
      '..G.......yyyyy..........',
      '..gG.....wwwwwww.........',
      '...b....wkwkwkwkw........',
      '...b....WwwwwwwwW........',
      '....b.PpppWWwWWpppP......',
      '....bPpppppppppppppP.....',
      '....PwpqpppppppppqpwP....',
      '...PpwpqpppppppppqpwpP...',
      '...PppppppppppppppppwP...',
      '...PppppqpppppppqppppP...',
      '..PpppppqpppppppqpppppP..',
      '..PpppppppppppppppppppP..',
      '..PppppppppqpqppppppppP..',
      '...PpppppppqpqpppppppP...',
      '...PPpppppppppppppppPP...',
      '....PPPpppppppppppPPP....',
      '......PPPPPPPPPPPPP......',
      '.........................',
      '.........................',
      '.........................',
      '.........................',
      '.........................',
    ],
    walk: {
      20: '.......P.P.P.P.P.P.......',
    },
  },
  mimic: {
    colors: { b: '#92400e', B: '#5b2a06', l: '#b45309', y: '#facc15', Y: '#a16207', k: '#1c0a04', r: '#b91c1c',
      R: '#7f1d1d', w: '#f5f5f4', e: '#fde047' },
    rows: [
      '...................',
      '...................',
      '..yBBBBBBBBBBBBBy..',
      '..yllllllllllllly..',
      '..yBbebbbbbbbebBy..',
      '..ybbkbbbbbbbkbby..',
      '..yBbbbYyyyYbbbBy..',
      '..ybbbbYkykYbbbby..',
      '..yyyyyyyyyyyyyyy..',
      '..kwkwkwkwkwkwkwk..',
      '..rRrrrrrrrrrrrRr..',
      '..rrRrrrrrrrrrRrr..',
      '..kwkwkwkwkwkwkwk..',
      '..yyyyyyyyyyyyyyy..',
      '..ybbbbbbbbbbbbby..',
      '..yBBBBBBBBBBBBBy..',
      '...................',
      '...................',
      '...................',
    ],
    walk: {
      11: '..kwkwkwkwkwkwkwk..',
      12: '..yyyyyyyyyyyyyyy..',
    },
  },
  shade: {
    colors: { p: '#4c1d95', P: '#2e1065', q: '#7c3aed', k: '#0b0618', e: '#e9d5ff', w: '#c4b5fd' },
    rows: [
      '...................',
      '...................',
      '.......PPPPP.......',
      '......PpqqqpP......',
      '......PkkkkkP......',
      '.....PkekkkekP.....',
      '.....PkkkkkkkP.....',
      '...P.PpkkkkkpP.P...',
      '..Pp.PppqpqppP.pP..',
      '..Pp.PpppppppP.pP..',
      '...PPppqpppqppPP...',
      '....PpppqpqpppP....',
      '....PpppppppppP....',
      '....PpPpPpPpPpP....',
      '.....P.P.p.P.P.....',
      '......P..P..P......',
      '...................',
      '...................',
      '...................',
    ],
    walk: {
      14: '....P.P.p.P.P.P....',
      15: '...P..P....P..P....',
    },
  },
  necro: {
    colors: { g: '#365314', G: '#1a2e05', q: '#4d7c0f', w: '#ebe5d6', k: '#1c1917', e: '#a3e635', b: '#78350f',
      c: '#d9f99d' },
    rows: [
      '...................',
      '...................',
      '........GGG....e...',
      '.......GgqgG..ece..',
      '......GgwqwgG..b...',
      '......GwewewG..b...',
      '......GwwwwwG..b...',
      '....GGgggggggGGb...',
      '...Ggggggqgggggb...',
      '...Gggqgggggqggb...',
      '...GggggqgqggggG...',
      '....GgggqgqgggG....',
      '....GgggggggggG....',
      '....GgGgGgGgGgG....',
      '.....G.G.g.G.G.....',
      '...................',
      '...................',
      '...................',
      '...................',
    ],
  },
  berserk: {
    colors: { s: '#c2410c', S: '#7c2d12', L: '#ea580c', h: '#fbbf24', H: '#b45309', f: '#78350f', F: '#451a03',
      m: '#d4dae1', M: '#9aa3ad', k: '#1c1917', r: '#dc2626' },
    rows: [
      '...................',
      '.mM.............Mm.',
      'mMMM...........MMMm',
      '.mMk...hhhhh...kMm.',
      '...k..hHhhhHh..k...',
      '...k.hHhhhhhHh.k...',
      '...SsSsssssssSsS...',
      '..SsssLsssssLsssS..',
      '.SsssssLsssLsssssS.',
      '.SssrsssLsLsssrssS.',
      '.SsssssssssssssssS.',
      '..SsffffSfSffffsS..',
      '...fFffFfffFffFf...',
      '....SsS.SsS.SsS....',
      '....SS..SSS..SS....',
      '...................',
      '...................',
      '...................',
      '...................',
    ],
  },
  golem: {
    colors: { g: '#78716c', G: '#44403c', l: '#a8a29e', c: '#22d3ee', C: '#0e7490', m: '#4d7c0f' },
    rows: [
      '...................',
      '...................',
      '......GGGGGGG......',
      '.....GglllllgG.....',
      '.GG..GgcGcGcgG..GG.',
      'GllG.GglllllgG.GllG',
      'GlgGGGGgggggGGGGglG',
      '.GgGglggggggglgGgG.',
      '..GGggmCgggClggGG..',
      '...GgggcgggcgggG...',
      '...GgglgCgCglggG...',
      '...GGgggggggmgGG...',
      '....GgGGgggGGgG....',
      '....Ggl.GgG.lgG....',
      '....GG..GGG..GG....',
      '...................',
      '...................',
      '...................',
      '...................',
    ],
  },
  witch: {
    colors: { p: '#7e22ce', P: '#4c1d95', q: '#a855f7', k: '#1c1917', K: '#3f3f46', g: '#86efac', y: '#facc15',
      h: '#4ade80' },
    rows: [
      '...................',
      '...................',
      '....KKKKKKKKKKK....',
      '...KKkkkkkkkkkKK...',
      '..KKkkPPPPPPPkkKK..',
      '..KkkkpppqpppkkkK..',
      '..KkkkppyPyppkkkK..',
      '..KKkkppgpgppkkKK..',
      '...KKkkPhPhPkkKK...',
      '....KKKKKKKKKKK....',
      '.....PpppppppP.....',
      '.....PpqpppqpP.....',
      '....PpppppppppP....',
      '....PpPpPpPpPpP....',
      '.....P.P.P.P.P.....',
      '...................',
      '...................',
      '...................',
      '...................',
    ],
  },
  vampire: {
    colors: { k: '#0c0a09', K: '#292524', r: '#991b1b', R: '#dc2626', w: '#e7e5e4', W: '#a8a29e', e: '#f87171',
      h: '#1c1917' },
    rows: [
      '...................',
      '...................',
      '.......hhhhh.......',
      '......hwwwwwh......',
      '......WwewewW......',
      '......WwwwwwW......',
      '....rRRWwwwWRRr....',
      '..KKrRRRrrrRRRrKK..',
      '.KkkKrrrrrrrrrKkkK.',
      'Kkk.KkkKkkkKkkK.kkK',
      'Kk..KkkkKkKkkkK..kK',
      'Kk..KkkkkkkkkkK..kK',
      'Kk...KkkkkkkkK...kK',
      '.K...KkKkKkKkK...K.',
      '......K.K.K.K......',
      '...................',
      '...................',
      '...................',
      '...................',
    ],
    walk: {
      10: '.Kk.KkkkKkKkkkK.kK.',
      11: '..K.KkkkkkkkkkK.K..',
      12: '.....KkkkkkkkK.....',
    },
  },
  blinker: {
    colors: { c: '#22d3ee', C: '#0e7490', w: '#cffafe', k: '#082f49', y: '#fef08a', b: '#155e75' },
    rows: [
      '...................',
      '...................',
      '......c.....c......',
      '......Cc...cC......',
      '.......wcccw.......',
      '......cyCcCyc......',
      '......cccwccc......',
      '....CccCcccCccC....',
      '...C.ccccccccc.C...',
      '..C..CcwCcCwcC..C..',
      '......ccccccc......',
      '......CcccccC......',
      '.......C.c.C.......',
      '......C..C..C......',
      '...................',
      '...................',
      '...................',
      '...................',
      '...................',
    ],
    walk: {
      9: '....C.CcwCcwcC.C...',
      10: '......cccccccc.....',
    },
  },
  thief: {
    colors: { g: '#7cc242', G: '#4d8a24', h: '#5b3a29', H: '#3b2418', e: '#ffef5a', s: '#c8a165', S: '#8f6b3a',
      y: '#facc15', k: '#1c1917' },
    rows: [
      '...............',
      '...............',
      '....hhhhhhh....',
      '...hHhhhhhHh...',
      '...hgegggegh...',
      '...hgggggggh...',
      '..g.hhhhhhh.g..',
      '.gG.hHhhhHh.Gg.',
      '....hhhhhhh....',
      '...SsssSsssS...',
      '...SsysssysS...',
      '...SsssSsssS...',
      '....SSSSSSS....',
      '....k..k..k....',
      '...............',
    ],
    walk: {
      6: '.g..hhhhhhh..g.',
      7: '..G.hHhhhHh.Gg.',
      13: '...k.......k...',
    },
  },
  mole: {
    colors: { b: '#8b5e3c', B: '#5c3d26', p: '#f9a8d4', k: '#1c1917', w: '#e7e5e4' },
    rows: [
      '...............',
      '......ppp......',
      '.....bBbBb.....',
      '....bbbbbbb....',
      '...bbkbbbkbb...',
      '...bbbbbbbbb...',
      '..wbbbbbbbbbw..',
      '.wwbbbbbbbbbww.',
      '..bbbbbbbbbbb..',
      '...bBbbbbbBb...',
      '...bbbbBbbbb...',
      '....bbbbbbb....',
      '.....bbbbb.....',
      '.......B.......',
      '...............',
    ],
    walk: {
      6: '...wbbbbbbbbw..',
      7: '..ww.bbbbbbb.ww',
    },
  },
  ghost: {
    colors: { w: '#e0f2fe', W: '#93c5fd', k: '#1e3a8a', b: '#bfdbfe' },
    rows: [
      '...............',
      '...............',
      '.....wwwww.....',
      '....wwwwwww....',
      '...wwwwwwwww...',
      '...wkkwwwkkw...',
      '...wkkwwwkkw...',
      '..bwwwwwwwwwb..',
      '..bwwwWwWwwwb..',
      '..bwwwwwwwwwb..',
      '..bwwWwwwWwwb..',
      '..bwwwwwwwwwb..',
      '..w.ww.w.ww.w..',
      '...............',
      '...............',
    ],
    walk: {
      12: '..ww.ww.ww.ww..',
    },
  },
  shieldbearer: {
    colors: { m: '#9aa3ad', M: '#d4dae1', y: '#facc15', s: '#64748b', S: '#94a3b8', c: '#475569', C: '#334155',
      k: '#1c1917' },
    rows: [
      '...............',
      '..mmmmmmmmmmm..',
      '.mMMMMMMMMMMMm.',
      '.mMMMyMMMyMMMm.',
      '.mMMyyyMyyyMMm.',
      '.mMMMMMMMMMMMm.',
      '..mmmmmmmmmmm..',
      '....sssssss....',
      '...sSsssssSs...',
      '..cCcccccccCc..',
      '..cccccCccccc..',
      '..ccCcccccCcc..',
      '...ccccccccc...',
      '....kk.k.kk....',
      '...............',
    ],
    walk: {
      13: '....k.....kk...',
    },
  },
  harpy: {
    colors: { F: '#a16207', f: '#ca8a04', o: '#d97706', h: '#7c2d12', e: '#fcd9b6', y: '#fde047', k: '#1c1917' },
    rows: [
      '...............',
      '...............',
      '......hhh......',
      '.....heheh.....',
      'F....heeeh....F',
      'FF...eeeee...FF',
      'FFF.ooooooo.FFF',
      '.FfFoooooooFfF.',
      '..FFoooooooFF..',
      '...FoooooooF...',
      '.....ooooo.....',
      '......yyy......',
      '...............',
      '...............',
      '...............',
    ],
    walk: {
      3: '.F...heheh...F.',
      4: 'FF...heeeh...FF',
      5: 'FfF..eeeee..FfF',
      6: '.FfF.ooooo.FfF.',
      7: '..FFfooooofFF..',
      8: '....Fooooo.F...',
      9: '.....ooooo.....',
    },
  },
  mirage: {
    colors: { c: '#22d3ee', C: '#a78bfa', w: '#e0e7ff', k: '#312e81', p: '#c084fc' },
    rows: [
      '...............',
      '.......c.......',
      '......cCc......',
      '.....cCwCc.....',
      '....cCwwwCc....',
      '....cwkwkwc....',
      '....cwwwwwc....',
      '...pcwwwwwcp...',
      '..pp.cwwwc.pp..',
      '.pp..cCwCc..pp.',
      '......cCc......',
      '.......c.......',
      '......p.p......',
      '...............',
      '...............',
    ],
    walk: {
      12: '.....p...p.....',
      13: '......p.p......',
    },
  },
  goblin: {
    colors: { g: '#7cc242', G: '#4d8a24', e: '#ffef5a', l: '#78350f', L: '#451a03', k: '#1c1917' },
    rows: [
      '...............',
      '...............',
      '...............',
      '..g...ggg...g..',
      '..gG.ggggg.Gg..',
      '....gegggeg....',
      '....ggggggg....',
      '...lllllllll...',
      '..gllLlllLllg..',
      '..g.lllllll.g..',
      '....lllllll....',
      '....k..k..k....',
      '...............',
      '...............',
      '...............',
    ],
    walk: {
      11: '...k.......k...',
    },
  },
  goblinshaman: {
    colors: { g: '#65a30d', G: '#3f6212', e: '#fde047', y: '#fde047', r: '#7c2d12', R: '#9a3412', b: '#78350f',
      w: '#f5f5f4', k: '#1c1917', q: '#ef4444' },
    rows: [
      '...................',
      '.w....y.yyy.y......',
      'www..yqyqyqyqy.....',
      'kbk...ggggggg......',
      '.bG..gGgggggGg..G..',
      '.bgg.ggegggegg.gg..',
      '.b...ggggggggg.....',
      '.b..rrrrrrrrrrr....',
      '.b.rrRrrrrrrrRrr...',
      '.b.rrrrrRrRrrrrr...',
      '.b.rrRrrrrrrrRrr...',
      '.b..rrrrrrrrrrr....',
      '.b..rrrr.r.rrrr....',
      '.b...k..k.k..k.....',
      '...................',
      '...................',
      '...................',
      '...................',
      '...................',
    ],
    walk: {
      13: '.b..k.......k......',
    },
  },
  ogre: {
    colors: { o: '#6b8e5a', O: '#4a6b3c', k: '#1c1917', b: '#92400e', B: '#78350f', g: '#84cc16', t: '#f5f5f4' },
    rows: [
      '...................',
      '...................',
      '......ooooooo......',
      '.....oOoooooOo.....',
      '.....okootooko.....',
      '......ooooooo......',
      '..oo.ooooooooo.oo..',
      '.oOoooooooooooooOo.',
      '.oo.oooOoooOooo.oo.',
      '.oo.ooooooooooo.oo.',
      '....BBgBBgBBgBB....',
      '....BbgbbgbbgbB....',
      '....BbbbbBbbbbB....',
      '.....oo.ooo.oo.....',
      '.....OO.OOO.OO.....',
      '...................',
      '...................',
      '...................',
      '...................',
    ],
    walk: {
      13: '.....oo......oo....',
      14: '.....OO......OO....',
    },
  },
  mirrorknight: {
    colors: { m: '#94a3b8', w: '#e0f2fe', c: '#ffffff', s: '#cbd5e1', S: '#64748b', p: '#6d28d9', P: '#4c1d95',
      k: '#1c1917' },
    rows: [
      '...................',
      '.......mmmmm.......',
      '......mwwwwwm......',
      '.....mwcwwwcwm.....',
      '.....mwwwwwwwm.....',
      '......mwwwwwm......',
      '.......mmmmm.......',
      '......sssssss......',
      '.....sSsssssSs.....',
      '...ppppppppppppp...',
      '..pppPpppppppPppp..',
      '..pppppPpppPppppp..',
      '...ppppppppppppp...',
      '....ppppppppppp....',
      '.....k..k.k..k.....',
      '...................',
      '...................',
      '...................',
      '...................',
    ],
    walk: {
      14: '....k.......k......',
    },
  },
  armadillo: {
    colors: { a: '#d6a35c', A: '#a16207', h: '#b45309', k: '#1c1917', t: '#92400e', c: '#fde68a' },
    rows: [
      '...................',
      '...................',
      '........hhh........',
      '.......hkhkh.......',
      '......aaaaaaa......',
      '.....aAAAAAAAa.....',
      '...caaaaaaaaaaac...',
      '....aAAAAAAAAAa....',
      '....aaaaaaaaaaa....',
      '....aAAAAAAAAAa....',
      '...caaaaaaaaaaac...',
      '.....aAAAAAAAa.....',
      '......aaaaaaa......',
      '........ttt........',
      '.........t.........',
      '...................',
      '...................',
      '...................',
      '...................',
    ],
    walk: {
      6: '....caaaaaaaaaaac..',
      10: '..c.aaaaaaaaaaa.c..',
    },
  },
  worm: {
    colors: { m: '#b45309', r: '#7f1d1d', w: '#f5f5f4', k: '#1c1917', s: '#c2410c', S: '#9a3412' },
    rows: [
      '.........................',
      '.........................',
      '.........mmmmmmm.........',
      '........mrrrrrrrm........',
      '.......mrwkwkwkwrm.......',
      '.......mrkkkkkkkrm.......',
      '........mrwrwrwrm........',
      '.........mmmmmmm.........',
      '........sssssssss........',
      '.......sSsssssssSs.......',
      '........sssssssss........',
      '.......sSsssssssSs.......',
      '........sssssssss........',
      '.......sSsssssssSs.......',
      '........sssssssss........',
      '........sSsssssSs........',
      '.........sssssss.........',
      '..........sssss..........',
      '...........sss...........',
      '.........................',
      '.........................',
      '.........................',
      '.........................',
      '.........................',
      '.........................',
    ],
    walk: {
      9: '........sSssssSs.........',
      11: '......sSssssssSs.........',
      13: '........sSssssSs.........',
      15: '......sSsssssSs..........',
    },
  },
  dragon: {
    colors: { r: '#dc2626', R: '#991b1b', e: '#fde047', y: '#fef3c7', W: '#7f1d1d', w: '#f87171' },
    rows: [
      '.........................',
      '..........y...y..........',
      '..........rrrrr..........',
      '.........rrererr.........',
      '..........rrrrr..........',
      '...........rrr...........',
      'W.........rrrrr.........W',
      'WW.......rrrrrrr.......WW',
      'WWW.....rrRrrrRrr.....WWW',
      'WwWW...rrrrrrrrrrr...WWwW',
      '.WwWW.rrrrRrrrRrrrr.WWwW.',
      '..WwWWrrrrrrrrrrrrrWWwW..',
      '...WWWrrrRrrrrrRrrrWWW...',
      '.....WrrrrrrrrrrrrrW.....',
      '......rrrrrrrrrrrrr......',
      '.......rrrRrrrRrrr.......',
      '........rrrrrrrrr........',
      '.........rrrrrrr.........',
      '..........rrrrr..........',
      '...........rrr...........',
      '............r............',
      '.........................',
      '.........................',
      '.........................',
      '.........................',
    ],
    walk: {
      6: '...........rrr...........',
      7: '.W.......rrrrrrr.......W.',
      9: 'WwWWW..rrrrrrrrrrr..WWWwW',
      10: 'WwwWWWrrrrRrrrRrrrrWWWwwW',
      11: '.WwWWWrrrrrrrrrrrrrWWWwW.',
      12: '..WWWWrrrRrrrrrRrrrWWWW..',
    },
  },
  spiderqueen: {
    colors: { P: '#6b21a8', p: '#9333ea', y: '#facc15', k: '#1c1917', e: '#f87171', l: '#3b0764', m: '#c084fc' },
    rows: [
      '.........................',
      '...........y.y...........',
      '..........yyyyy..........',
      '..........ppppp..........',
      '.........pkekekp.........',
      '..l.......ppppp.......l..',
      '...l.....ppppppp.....l...',
      '....l...PPPPPPPPP...l....',
      'l....l.PPPPPPPPPPP.l....l',
      '.l....lPPPmPPPmPPPl....l.',
      '..l..lPPPmmmPmmmPPPl..l..',
      '...lllPPPPmPPPmPPPPlll...',
      '......PPPPPPPPPPPPP......',
      '...lllPPPPPPPPPPPPPlll...',
      '..l..lPPPPPPPPPPPPPl..l..',
      '.l....lPPPPPPPPPPPl....l.',
      'l......PPPPPPPPPPP......l',
      '.........PPPPPPP.........',
      '..........PPPPP..........',
      '.........................',
      '.........................',
      '.........................',
      '.........................',
      '.........................',
      '.........................',
    ],
    walk: {
      5: '.l.........ppp.........l.',
      6: '..l.......ppppp.......l..',
      13: '....lllPPPPPPPPPPPlll....',
      14: '...l..lPPPPPPPPPPPl..l...',
    },
  },
  spiderling: {
    colors: { p: '#9333ea', P: '#6b21a8', e: '#f87171', l: '#3b0764' },
    rows: [
      '...............',
      '...............',
      '...............',
      '...............',
      '......ppp......',
      '..l..pepep..l..',
      '.l.lpppppppl.l.',
      'l..lPPPPPPPl..l',
      '.l.lPPPPPPPl.l.',
      '..l.lPPPPPl.l..',
      '.....lPPPl.....',
      '...............',
      '...............',
      '...............',
      '...............',
    ],
    walk: {
      6: 'l..lpppppppl..l',
      8: '..l.PPPPPPPP.l.',
    },
  },
};

function artSprite(id, frame) {
  const look = ART[id], walk = look.walk || {}, rows = look.rows;
  const p = new Pix(rows[0].length, rows.length);
  rows.forEach((row, y) => {
    const line = frame && walk[y] ? walk[y] : row;
    for (let x = 0; x < line.length; x++) if (line[x] !== '.') p.px(x, y, look.colors[line[x]]);
  });
  return p.outline().canvas();
}


const cache = new Map();
const owned = new WeakMap();

function remember(key, make) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}

function own(image, key, make) {
  if (!owned.has(image)) owned.set(image, new Map());
  const list = owned.get(image);
  if (!list.has(key)) list.set(key, make());
  return list.get(key);
}

export const heroSprite = (id) => remember('hero:' + id, () => makeHero(id));

export const mobSprite = (id, frame = 0) => remember('mob:' + id + ':' + frame, () => artSprite(id, frame ? 1 : 0));

export const mobUrl = (id) => remember('mobUrl:' + id, () => mobSprite(id).toDataURL());

export function tintSprite(image, color) {
  return own(image, color, () => {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return canvas;
  });
}

export function pixelsOf(image) {
  return own(image, 'pixels', () => {
    const data = image.getContext('2d').getImageData(0, 0, image.width, image.height).data, list = [];
    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        const at = (y * image.width + x) * 4;
        if (data[at + 3] < 128) continue;
        list.push({ x, y, color: 'rgb(' + data[at] + ',' + data[at + 1] + ',' + data[at + 2] + ')' });
      }
    }
    return list;
  });
}

const ROCKS = [
  [9.5, 5, 4.6, 3.8, 0], [4.5, 6.5, 3.6, 3.2, 1], [14.5, 6.8, 3.4, 3, 2], [7, 9, 2.8, 2.1, 1], [12.5, 9.3, 2.6, 1.9, 0],
];
const CRACKS = [[[8, 3, 10, 6], [10, 6, 9, 8]], [[3, 5, 5, 8], [14, 5, 15, 8], [12, 8, 13, 10]]];

export const wallSprite = (stage) => remember('wall:' + stage, () => {
  const p = new Pix(20, 13), rocks = stage >= 2 ? ROCKS.slice(0, 4) : ROCKS;
  for (const [cx, cy, rx, ry, tone] of rocks.slice().sort((a, b) => a[1] - b[1])) {
    p.oval(cx, cy, rx, ry, STONE[tone], '#5c564d', '#c9bfad');
    p.px(cx - rx * 0.45, cy - ry * 0.5, '#e2d9c8');
  }
  for (let i = 0; i < stage && i < CRACKS.length; i++) {
    for (const [x0, y0, x1, y1] of CRACKS[i]) p.line(x0, y0, x1, y1, '#2b2620');
  }
  if (stage >= 2) {
    p.px(16, 10, '#8a7f70');
    p.px(17, 11, '#6b6258');
    p.px(2, 10, '#8a7f70');
  }
  p.px(6, 4, '#6f8a3e');
  p.px(7, 4, '#86a34c');
  p.px(15, 5, '#6f8a3e');
  return p.outline().canvas();
});

export const trapSprite = (closed) => remember('trap:' + closed, () => {
  const p = new Pix(13, 11), jaw = closed ? 2 : 0;
  p.ball(6, 5.5, 2.2, '#6b7280', '#374151', '#9ca3af');
  for (const side of [-1, 1]) {
    const x = 6 + side * (5 - jaw);
    p.bar(x, 1 + jaw, x, 9 - jaw, '#9ca3af', 1);
    for (let y = 2 + jaw; y <= 8 - jaw; y += 2) p.px(x - side, y, '#e5e7eb');
  }
  p.px(6, 5, '#b91c1c');
  return p.outline().canvas();
});

export const flaskSprite = () => remember('flask', () => {
  const p = new Pix(7, 9);
  p.box(3, 0, 1, 2, '#e8eef4');
  p.ball(3.5, 5, 2.4, '#9be22d', '#5b9a12', '#d9ff8f');
  return p.outline().canvas();
});

const MINE_LOOKS = {
  strong: { body: ['#4a4f5a', '#2e323a', '#7a808c'], light: '#ff3b3b', spikes: true },
  wide: { body: ['#7a5a2a', '#54401c', '#a07a3a'], light: '#ffb020', ring: true },
  stun: { body: ['#2d4a7a', '#1d3050', '#4a6fa8'], light: '#7fe3ff', bolt: true },
};

export const mineSprite = (kind, lit) => remember('mine:' + kind + ':' + lit, () => {
  const look = MINE_LOOKS[kind], p = new Pix(11, 11), [c, d, l] = look.body;
  if (look.spikes) for (const [x, y] of [[5, 1], [1, 5], [9, 5], [5, 9]]) p.px(x, y, METAL[1]);
  p.ball(5.5, 5.5, look.ring ? 3.6 : 3, c, d, l);
  if (look.ring) {
    p.px(3, 5, d);
    p.px(7, 5, d);
    p.px(5, 3, d);
    p.px(5, 7, d);
  }
  if (look.bolt) {
    p.px(6, 3, lit ? look.light : d);
    p.px(5, 4, lit ? look.light : d);
    p.px(4, 5, lit ? '#ffffff' : d);
    p.px(5, 6, lit ? look.light : d);
    p.px(4, 7, lit ? look.light : d);
  } else p.rect(5, 5, 1, 1, lit ? look.light : d);
  return p.canvas();
});

const COMMAND_ICONS = {
  move(p) {
    p.rect(1, 4, 5, 2, '#ffe08a');
    for (let i = 0; i < 4; i++) p.rect(5 + i, 1 + i, 1, 8 - i * 2, '#ffe08a');
  },
  upgrade(p) {
    for (let i = 0; i < 4; i++) p.rect(4 - i, 1 + i, 2 + i * 2, 1, '#86efac');
    p.rect(4, 5, 2, 4, '#86efac');
  },
  card(p) {
    p.ball(5, 3, 1.8, '#c4b5fd', '#8b7fd0');
    p.oval(5, 8, 3.4, 1.6, '#c4b5fd', '#8b7fd0');
  },
  control(p) {
    const teeth = [[4, 0], [0, 4], [8, 4], [4, 8], [1, 1], [7, 1], [1, 7], [7, 7]];
    for (const [x, y] of teeth) p.rect(x, y, 2, 2, '#cbd5e1');
    p.ball(5, 5, 3, '#cbd5e1', '#94a3b8');
    p.disc(5, 5, 1.2, '#15111d');
  },
};

export const commandUrl = (kind) => remember('command:' + kind, () => {
  if (kind === 'spin') return coinUrl();
  const p = new Pix(10, 10);
  COMMAND_ICONS[kind](p);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 20;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(p.outline().canvas(), 0, 0, 20, 20);
  return canvas.toDataURL();
});

const PRIZES = {
  weapon(p, tone) {
    p.bar(3, 12, 11, 4, '#e5e7eb', 2);
    p.line(4, 12, 11, 5, '#9ca3af', 1);
    p.px(12, 3, '#ffffff');
    p.bar(3, 9, 6, 12, '#8a5a2b', 1);
    p.box(2, 12, 2, 2, tone);
  },
  void(p) {
    p.ball(8, 8, 5, '#374151', '#1f2937', '#4b5563');
    p.disc(8, 8, 2.6, '#111827');
    p.line(4, 12, 12, 4, '#9ca3af', 1);
  },
  coins(p) {
    for (const [x, y] of [[5, 11], [10, 11], [7.5, 8], [7.5, 4.5]]) {
      p.oval(x, y, 3, 1.6, '#ffcd38', '#c98a12', '#fff2a8');
    }
    p.px(12, 3, '#ffffff');
  },
};

export function prizeIcon(kind, color, size = 40) {
  return remember('prize:' + kind + ':' + color + ':' + size, () => {
    const p = new Pix(16, 16);
    PRIZES[kind](p, color);
    const symbol = p.outline().canvas(), canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d'), pad = Math.round(size * 0.1), r = Math.round(size * 0.18);
    ctx.fillStyle = color + '33';
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, Math.round(size / 18));
    const x = ctx.lineWidth / 2, w = size - ctx.lineWidth;
    ctx.beginPath();
    ctx.moveTo(x + r, x);
    ctx.arcTo(x + w, x, x + w, x + w, r);
    ctx.arcTo(x + w, x + w, x, x + w, r);
    ctx.arcTo(x, x + w, x, x, r);
    ctx.arcTo(x, x, x + w, x, r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(symbol, pad, pad, size - pad * 2, size - pad * 2);
    return canvas;
  });
}

export const coinSprite = () => remember('coin', () => {
  const p = new Pix(7, 7);
  p.disc(3.5, 3.5, 3.4, '#ffcd38', '#c98a12', '#fff2a8');
  p.rect(3, 2, 1, 3, '#b77a0c');
  return p.outline('#5a3a06').canvas();
});

export function heroUrl(id, size = 48) {
  return remember('heroUrl:' + id + ':' + size, () => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(heroSprite(id), 0, 0, size, size);
    return canvas.toDataURL();
  });
}

export const prizeUrl = (kind, color, size = 40) => remember('prizeUrl:' + kind + ':' + color + ':' + size,
  () => prizeIcon(kind, color, size).toDataURL());

export const coinUrl = () => remember('coinUrl', () => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 14;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(coinSprite(), 0, 0, 14, 14);
  return canvas.toDataURL();
});

function shape(p, inside, color, dark, light) {
  for (let y = 0; y < p.h; y++) {
    for (let x = 0; x < p.w; x++) {
      const v = inside(x + 0.5, y + 0.5);
      if (v === false) continue;
      p.px(x, y, v === 'dark' ? dark : v === 'light' ? light : color);
    }
  }
}

export const heartSprite = () => remember('heart', () => {
  const p = new Pix(15, 14);
  shape(p, (x, y) => {
    const u = (x - 7.5) / 6.3, v = (7.6 - y) / 6.1;
    const f = Math.pow(u * u + v * v - 1, 3) - u * u * v * v * v;
    if (f > 0) return false;
    if (u - v * 0.5 > 0.45 || v < -0.6) return 'dark';
    if (u < -0.2 && v > 0.45) return 'light';
    return 'base';
  }, '#e8344e', '#9e1730', '#ff8a9a');
  p.rect(3, 2, 2, 1, '#ffd2d9');
  p.px(2, 3, '#ffd2d9');
  return p.outline('#2a0710').canvas();
});

export const heartUrl = () => remember('heartUrl', () => heartSprite().toDataURL());

export const shieldSprite = () => remember('shield', () => {
  const p = new Pix(16, 18);
  shape(p, (x, y) => {
    const half = y < 9 ? 6.6 : 6.6 * (1 - (y - 9) / 8.4);
    if (Math.abs(x - 8) > half || y < 1 || y > 17) return false;
    if (Math.abs(x - 8) < 0.6) return 'dark';
    return x < 8 ? 'light' : 'base';
  }, '#1d4fd6', '#0b1530', '#4f9cf9');
  p.rect(3, 2, 1, 6, '#bfe2ff');
  p.px(4, 2, '#bfe2ff');
  return p.outline('#0b1530').canvas();
});

const KIND_COLORS = { buff: '#4ade80', debuff: '#f87171', blessing: '#fbbf24', curse: '#c084fc' };

const SYMBOLS = {
  fury(p) {
    p.bar(3, 12, 11, 4, '#dfe6ee', 2);
    p.bar(3, 10, 6, 13, '#8a5a2b', 1);
    p.px(12, 3, '#ffffff');
  },
  haste(p) {
    for (const [x0, y0, x1, y1] of [[10, 1, 5, 8], [5, 8, 10, 8], [10, 8, 5, 15]]) p.bar(x0, y0, x1, y1, '#ffd84a', 1);
  },
  eagle(p) {
    p.oval(8, 8, 6, 3.4, '#ffffff');
    p.ball(8, 8, 2.2, '#3b82f6', '#1e3a8a');
    p.px(8, 8, '#0b1530');
  },
  luck(p) {
    for (const [x, y] of [[6, 5], [10, 5], [6, 9], [10, 9]]) p.ball(x, y, 2.2, '#22c55e', '#15803d', '#86efac');
    p.bar(8, 10, 9, 14, '#15803d', 1);
  },
  gold(p) {
    p.ball(8, 8, 5, '#ffcd38', '#c98a12', '#fff2a8');
    p.rect(7, 5, 2, 6, '#b77a0c');
  },
  study(p) {
    p.box(3, 4, 10, 8, '#f3e9d2');
    p.rect(7, 4, 2, 8, '#c9b48a');
    p.rect(4, 6, 2, 1, '#8a6fb0');
    p.rect(10, 8, 2, 1, '#8a6fb0');
  },
  weak(p) {
    p.bar(3, 12, 6, 9, '#dfe6ee', 2);
    p.bar(9, 6, 12, 3, '#dfe6ee', 2);
    p.px(7, 8, '#f87171');
    p.px(8, 7, '#f87171');
  },
  tired(p) {
    p.box(4, 2, 8, 2, '#8a5a2b');
    p.box(4, 12, 8, 2, '#8a5a2b');
    p.bar(5, 4, 10, 11, '#e6d3a3', 1);
    p.bar(10, 4, 5, 11, '#e6d3a3', 1);
    p.rect(7, 9, 2, 2, '#ffd84a');
  },
  blind(p) {
    p.oval(8, 8, 6, 3.4, '#ffffff');
    p.ball(8, 8, 2.2, '#3b82f6', '#1e3a8a');
    p.bar(3, 13, 13, 3, '#ef4444', 1);
  },
  sleep(p) {
    for (const [x, y, s] of [[3, 9, 5], [9, 3, 4]]) {
      p.rect(x, y, s, 1, '#c4b5fd');
      p.line(x + s - 1, y + 1, x, y + s - 2, '#c4b5fd');
      p.rect(x, y + s - 1, s, 1, '#c4b5fd');
    }
  },
  wrath(p) {
    p.bar(3, 12, 11, 4, '#ffd84a', 2);
    p.bar(3, 10, 6, 13, '#8a5a2b', 1);
    for (const [x, y] of [[13, 2], [12, 1], [14, 4]]) p.px(x, y, '#ff6a1f');
  },
  fort(p) {
    shape(p, (x, y) => {
      const u = (x - 8) / 6.2, v = (6 - y) / 5.8, f = Math.pow(u * u + v * v - 1, 3) - u * u * v * v * v;
      return f > 0 ? false : 'base';
    }, '#e8344e');
    p.rect(7, 4, 2, 6, '#ffffff');
    p.rect(5, 6, 6, 2, '#ffffff');
  },
  mire(p) {
    p.oval(8, 11, 6, 3, '#4d7c3a', '#365a28');
    for (const [x, y, r] of [[5, 7, 1.6], [10, 5, 2], [8, 9, 1.2]]) p.ball(x, y, r, '#86efac', '#4d7c3a');
  },
  rush(p) {
    for (const [y, x] of [[11, 6], [8, 9], [5, 6]]) {
      p.oval(x, y, 4, 1.8, '#ffcd38', '#c98a12', '#fff2a8');
    }
  },
  iron(p) {
    p.ball(8, 7, 5, '#e5e7eb', '#9ca3af');
    p.rect(5, 6, 2, 2, '#15111d');
    p.rect(9, 6, 2, 2, '#15111d');
    p.rect(6, 11, 4, 3, '#e5e7eb');
    p.rect(7, 11, 1, 3, '#9ca3af');
  },
  swift(p) {
    for (let i = 0; i < 4; i++) p.bar(3 + i, 4 + i * 2, 12 - i, 3 + i * 2, i % 2 ? '#e0f2fe' : '#ffffff', 1);
  },
  breach(p) {
    shape(p, (x, y) => {
      const u = (x - 8) / 6.2, v = (6 - y) / 5.8, f = Math.pow(u * u + v * v - 1, 3) - u * u * v * v * v;
      return f > 0 ? false : 'base';
    }, '#9e1730');
    p.line(8, 2, 6, 6, '#15111d');
    p.line(6, 6, 9, 9, '#15111d');
    p.line(9, 9, 7, 13, '#15111d');
  },
  fog(p) {
    for (const [x, y, r] of [[5, 9, 3], [9, 7, 3.6], [12, 10, 2.4]]) p.ball(x, y, r, '#cbd5e1', '#94a3b8', '#f1f5f9');
  },
};

export function effectIcon(kind, id, size = 40) {
  return remember('effect:' + kind + ':' + id + ':' + size, () => {
    const color = KIND_COLORS[kind] || '#ffffff', p = new Pix(16, 16);
    SYMBOLS[id](p);
    const symbol = p.outline().canvas(), canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d'), line = Math.max(2, Math.round(size / 18)), r = Math.round(size * 0.5);
    ctx.fillStyle = color + '33';
    ctx.strokeStyle = color;
    ctx.lineWidth = line;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, r - line, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.imageSmoothingEnabled = false;
    const pad = Math.round(size * 0.16);
    ctx.drawImage(symbol, pad, pad, size - pad * 2, size - pad * 2);
    return canvas;
  });
}

export const effectUrl = (kind, id, size = 40) => remember('effectUrl:' + kind + ':' + id + ':' + size,
  () => effectIcon(kind, id, size).toDataURL());

export const shieldUrl = (size = 64) => remember('shieldUrl:' + size, () => {
  const canvas = document.createElement('canvas'), image = shieldSprite();
  canvas.width = size;
  canvas.height = Math.round(size * image.height / image.width);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL();
});

export const EFFECT_IDS = Object.keys(SYMBOLS);
export const MOB_KINDS = Object.keys(ART).filter((id) => !LOOKS[id] && id !== 'parasite');
export const HEROES = Object.keys(LOOKS).concat('parasite');
