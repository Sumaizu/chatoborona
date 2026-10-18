const D3 = 146.8, A3 = 220, D4 = 293.7, FS4 = 370, A4 = 440;
const D5 = 587.3, E5 = 659.3, FS5 = 740, A5 = 880, B5 = 987.8, D6 = 1174.7, E6 = 1318.5, FS6 = 1480, A6 = 1760;
const LOUDNESS = 1.3;
const REVERB_SECONDS = 1.6;
const REVERB_LEVEL = 0.3;
const ECHO_SECONDS = 0.19;
const ECHO_LEVEL = 0.18;

const spread = () => (Math.random() - 0.5) * 0.6;

const RECIPES = {
  tick(s, at) {
    s.pluck(at, 1046.5, 0.14, 0.2, 0, 0.5);
    s.pop(at, 2100, 1400, 0.012, 0.12);
  },
  wave(s, at) {
    s.thump(at, 150, 45, 0.55, 0.5);
    s.horn(at + 0.02, D3, 0.95, 0.15, -0.25);
    s.horn(at + 0.02, A3, 0.95, 0.11, 0.25);
    s.horn(at + 0.42, D4, 0.9, 0.13, 0);
    s.hiss(at + 0.25, 0.8, 0.07, 5000, 9000);
  },
  boss(s, at) {
    [0, 0.4, 0.8].forEach((delay, i) => s.thump(at + delay, 115 - i * 5, 34, 0.7, 0.6 + i * 0.06));
    s.horn(at, 73.4, 1.8, 0.18, -0.15);
    s.horn(at + 0.05, 77.8, 1.8, 0.1, 0.25);
    s.swish(at + 0.2, 220, 70, 1.3, 0.2);
  },
  level(s, at) {
    [D5, FS5, A5, D6].forEach((note, i) => s.pluck(at + i * 0.055, note, 0.5, 0.15, -0.3 + i * 0.2, 1.2));
    s.chime(at + 0.24, 2349, 0.9, 0.06, 0.2);
    s.chime(at + 0.3, 2960, 0.7, 0.04, -0.2);
  },
  spin(s, at) {
    s.pluck(at, B5, 0.08, 0.14, 0, 1.4);
    s.pluck(at + 0.07, E6, 0.3, 0.14, 0, 1.4);
    let time = at + 0.25, gap = 0.045;
    while (time < at + 3.7) {
      s.pop(time, 1700, 1000, 0.012, 0.1);
      s.hiss(time, 0.02, 0.05, 4000, 4000);
      time += gap;
      gap *= 1.17;
    }
  },
  prize(s, at) {
    [A5, E6].forEach((note, i) => s.pluck(at + i * 0.07, note, 0.7, 0.18, i ? 0.25 : -0.25, 1.3));
    s.chime(at + 0.12, 2637, 0.9, 0.06, 0);
  },
  meh(s, at) {
    s.pluck(at, A4, 0.25, 0.14, -0.1, 0.4);
    s.pluck(at + 0.13, FS4, 0.4, 0.13, 0.1, 0.4);
  },
  win(s, at) {
    s.thump(at, 160, 50, 0.4, 0.4);
    s.horn(at, D4, 1.4, 0.12, -0.3);
    s.horn(at, FS4, 1.4, 0.09, 0.3);
    s.horn(at, A4, 1.4, 0.09, 0);
    [D5, FS5, A5, D6, FS6].forEach((note, i) => s.pluck(at + 0.1 + i * 0.06, note, 0.8, 0.16, -0.4 + i * 0.2, 1.4));
    s.hiss(at + 0.1, 1.2, 0.08, 6000, 10000);
    [A6, 2349, 2960, 3520].forEach((note, i) => s.chime(at + 0.55 + i * 0.08, note, 1, 0.05, spread()));
  },
  leak(s, at) {
    s.thump(at, 95, 38, 0.4, 0.7);
    s.crunch(at, 0.3, 0.22);
    s.pad(at + 0.02, [110, 130.8], 0.5, 0.06);
  },
  over(s, at) {
    [A3, 174.6, D3].forEach((note, i) => {
      s.horn(at + i * 0.38, note, 0.9, 0.14, 0);
      s.thump(at + i * 0.38, 100, 40, 0.5, 0.45);
    });
    s.pad(at + 1.1, [73.4, 110, 146.8], 1.8, 0.07);
  },
  join(s, at) {
    const pan = spread();
    s.pluck(at, E5, 0.16, 0.08, pan, 1.1);
    s.pluck(at + 0.06, B5, 0.24, 0.08, pan, 1.1);
  },
  buff(s, at) {
    [D5, A5, D6].forEach((note, i) => s.chime(at + i * 0.08, note * 2, 0.8, 0.06, -0.3 + i * 0.3));
    s.swish(at, 800, 4000, 0.4, 0.06);
  },
  debuff(s, at) {
    s.horn(at, 155.6, 0.7, 0.1, 0);
    s.horn(at + 0.18, 146.8, 0.8, 0.1, 0);
    s.swish(at, 1500, 300, 0.5, 0.06);
  },
  card(s, at) {
    s.swish(at, 2500, 6000, 0.12, 0.07);
    s.chime(at + 0.05, 1975.5, 0.5, 0.05, 0);
  },
  crack(s, at) {
    s.swish(at, 3000, 900, 0.09, 0.25);
    s.pop(at, 180, 60, 0.08, 0.3);
  },
  gun(s, at) {
    s.swish(at, 2500, 1200, 0.04, 0.12);
    s.pop(at, 300, 150, 0.03, 0.12);
  },
  launch(s, at) {
    s.pop(at, 150, 70, 0.12, 0.3);
    s.swish(at, 600, 300, 0.1, 0.08);
  },
  rock(s, at) {
    s.pop(at, 120, 60, 0.1, 0.3);
    s.crunch(at, 0.08, 0.1);
  },
  boom(s, at) {
    s.swish(at, 900, 120, 0.35, 0.35);
    s.thump(at, 120, 40, 0.3, 0.45);
  },
  mine(s, at) {
    s.pop(at, 2400, 2400, 0.02, 0.08);
    s.swish(at + 0.03, 1200, 100, 0.45, 0.4);
    s.thump(at + 0.03, 100, 32, 0.4, 0.55);
  },
  nuke(s, at) {
    s.hiss(at, 0.3, 0.25, 2000, 9000);
    s.crunch(at, 0.5, 0.4);
    s.thump(at + 0.02, 70, 18, 3.2, 0.62);
    s.thump(at + 0.4, 55, 20, 2.4, 0.36);
    s.rumble(at + 0.05, 4.2, 0.4);
    s.swish(at + 0.05, 1600, 40, 3.4, 0.3);
    for (let i = 0; i < 4; i++) s.crunch(at + 0.6 + i * 0.45, 0.6, 0.16 - i * 0.03);
    s.pad(at + 0.2, [41.2, 55, 61.7], 3.6, 0.07);
  },
  fall(s, at, length = 7) {
    s.whistle(at, 2600, 420, length, 0.18);
    s.swish(at + length * 0.3, 2400, 600, length * 0.7, 0.07);
  },
  plant(s, at) {
    s.pop(at, 900, 700, 0.02, 0.08);
    s.pop(at + 0.06, 2200, 2200, 0.03, 0.05);
  },
  build(s, at) {
    s.swish(at, 150, 900, 0.3, 0.25);
    s.thump(at + 0.25, 110, 45, 0.25, 0.4);
  },
  crumble(s, at) {
    s.crunch(at, 0.5, 0.3);
    for (let i = 0; i < 4; i++) s.pop(at + i * 0.07, 180 - i * 20, 60, 0.08, 0.15);
  },
  execute(s, at) {
    s.swish(at, 500, 5200, 0.13, 0.2);
    s.hiss(at + 0.11, 0.07, 0.18, 7000, 3500);
    s.bell(at + 0.13, 523, 0.7, 0.18, 2.76, 2);
    s.bell(at + 0.13, 784, 0.5, 0.1, 3.1, 1.6);
    s.thump(at + 0.13, 150, 38, 0.55, 0.42);
    s.crunch(at + 0.14, 0.3, 0.16);
  },
  void(s, at) {
    s.horn(at, 196, 0.5, 0.08, 0);
    s.swish(at, 900, 200, 0.5, 0.06);
  },
  jackpot(s, at) {
    const notes = [1318.5, 1568, 1975.5];
    for (let i = 0; i < 9; i++) s.pluck(at + i * 0.05, notes[i % 3], 0.25, 0.08, (i % 3 - 1) * 0.4, 1.6);
    s.chime(at + 0.45, 2637, 1, 0.07, 0);
  },
  upgrade(s, at) {
    s.bell(at, 880, 0.5, 0.16, 2.76, 1.8);
    s.bell(at + 0.12, 1318.5, 0.7, 0.13, 2.76, 1.4);
    s.chime(at + 0.25, 2637, 0.6, 0.05, 0);
  },
  reward(s, at) {
    [D5, FS5, A5].forEach((note, i) => s.pluck(at + i * 0.08, note, 0.5, 0.12, -0.2 + i * 0.2, 1.2));
    s.pop(at + 0.2, 1300, 1700, 0.05, 0.06);
  },
  clink(s, at) {
    s.chime(at, 2093 + Math.random() * 400, 0.25, 0.05, spread());
  },
  treasure(s, at) {
    for (let i = 0; i < 16; i++) {
      s.chime(at + i * 0.035 + Math.random() * 0.03, 1800 + Math.random() * 1600, 0.3, 0.035, spread());
    }
    s.thump(at, 120, 50, 0.3, 0.3);
  },
  rattle(s, at) {
    for (let i = 0; i < 6; i++) s.chime(at + i * 0.045, 2400 + Math.random() * 900, 0.12, 0.025, spread());
  },
  rise(s, at) {
    s.crunch(at, 0.2, 0.12);
    s.swish(at, 300, 1400, 0.35, 0.1);
    s.bell(at + 0.2, 330, 0.5, 0.06, 1.5, 0.8);
  },
  hex(s, at) {
    s.swish(at, 2500, 600, 0.3, 0.1);
    s.bell(at, 466, 0.4, 0.08, 1.41, 1.6);
  },
  burrow(s, at) {
    s.crunch(at, 0.4, 0.14);
    s.swish(at, 500, 150, 0.4, 0.1);
  },
  holy(s, at) {
    s.chime(at, 1568, 0.4, 0.07, 0);
    s.swish(at, 3000, 6000, 0.15, 0.05);
  },
  splash(s, at) {
    s.swish(at, 1800, 500, 0.18, 0.12);
    s.pop(at, 600, 300, 0.06, 0.08);
  },
  snap(s, at) {
    s.pop(at, 1600, 500, 0.03, 0.18);
    s.crunch(at, 0.08, 0.12);
  },
  bite(s, at) {
    s.swish(at, 900, 300, 0.07, 0.14);
    s.pop(at, 260, 140, 0.05, 0.1);
  },
  leap(s, at) {
    s.swish(at, 400, 2200, 0.2, 0.1);
  },
  chomp(s, at) {
    s.crunch(at, 0.14, 0.16);
    s.pop(at, 160, 70, 0.08, 0.2);
  },
  zap(s, at) {
    s.swish(at, 4000, 1500, 0.12, 0.18);
    s.pop(at, 1600, 300, 0.1, 0.12);
  },
  flask(s, at) {
    s.bell(at, A6, 0.15, 0.1, 2.1, 0.5);
    s.pop(at + 0.02, 500, 900, 0.05, 0.08);
  },
  flame(s, at) {
    s.swish(at, 450, 1200, 0.45, 0.1);
    s.hiss(at, 0.45, 0.03, 2600, 1800);
  },
  bolt(s, at) {
    s.pop(at, 700, 350, 0.06, 0.18);
    s.swish(at, 2000, 800, 0.05, 0.06);
  },
  ice(s, at) {
    s.bell(at, 2350, 0.2, 0.1, 3.5, 0.8);
  },
  wind(s, at) {
    s.swish(at, 300, 1200, 0.3, 0.12);
  },
  cast(s, at) {
    s.bell(at, E6, 0.15, 0.07, 2, 0.4);
  },
  hit(s, at) {
    s.pop(at, 220, 110, 0.04, 0.12);
  },
  kill(s, at) {
    s.crunch(at, 0.12, 0.1);
    s.pop(at + 0.03, 300, 90, 0.08, 0.12);
  },
  crit(s, at) {
    s.bell(at, 2640, 0.25, 0.14, 3.5, 1);
    s.pop(at, 900, 400, 0.05, 0.12);
  },
  freeze(s, at) {
    s.bell(at, 2093, 0.4, 0.12, 3.5, 0.9);
    s.bell(at + 0.05, 2637, 0.35, 0.1);
  },
  stun(s, at) {
    s.pop(at, 1200, 600, 0.08, 0.15);
    s.bell(at + 0.03, 1568, 0.2, 0.08);
  },
  storm(s, at) {
    s.swish(at, 5000, 200, 0.5, 0.3);
    s.thump(at, 100, 40, 0.4, 0.4);
  },
  rally(s, at) {
    s.horn(at, A4, 0.4, 0.07, 0);
    s.horn(at + 0.1, 659.3, 0.4, 0.06, 0);
  },
  heal(s, at) {
    [D6, FS6, A6].forEach((note, i) => s.chime(at + i * 0.06, note, 0.5, 0.06, -0.2 + i * 0.2));
  },
  block(s, at) {
    s.bell(at, 700, 0.3, 0.14, 2.76, 1.4);
    s.pop(at, 1500, 800, 0.04, 0.1);
  },
  roar(s, at) {
    s.horn(at, 55, 1.2, 0.2, 0);
    s.swish(at, 200, 80, 0.8, 0.2);
  },
  growl(s, at) {
    s.horn(at, 82.4, 0.6, 0.12, 0);
    s.pop(at, 140, 70, 0.3, 0.2);
  },
  summon(s, at) {
    for (let i = 0; i < 3; i++) s.pop(at + i * 0.07, 1800, 2400, 0.05, 0.08);
  },
  chain(s, at) {
    s.swish(at, 300, 2400, 0.5, 0.14);
    for (let i = 0; i < 10; i++) s.chime(at + 0.05 + i * 0.07, 1500 + (i % 3) * 420, 0.08, 0.03, spread());
  },
  yank(s, at) {
    s.pop(at, 900, 300, 0.05, 0.18);
    for (let i = 0; i < 6; i++) s.chime(at + i * 0.05, 1900 + (i % 2) * 500, 0.07, 0.035, spread());
    s.swish(at + 0.05, 2400, 400, 0.6, 0.1);
    s.thump(at + 0.05, 120, 50, 0.3, 0.3);
  },
  relic(s, at) {
    s.pad(at, [D4, A4, D5], 1.6, 0.06);
    s.swish(at, 400, 6000, 0.8, 0.07);
    [D6, FS6, A6, 2349, 2960].forEach((note, i) => s.chime(at + 0.1 + i * 0.09, note, 1.1, 0.05, -0.4 + i * 0.2));
    s.bell(at + 0.5, D5, 1.6, 0.12, 2.76, 1.2);
  },
  divine(s, at) {
    s.thump(at, 140, 40, 0.5, 0.4);
    s.pad(at, [D4, FS4, A4, D5], 2.4, 0.07);
    s.horn(at + 0.05, D4, 1.6, 0.09, -0.3);
    s.horn(at + 0.05, A4, 1.6, 0.07, 0.3);
    s.bell(at + 0.2, D6, 1.4, 0.11, 2.76, 1.4);
    [A5, D6, FS6, A6].forEach((note, i) => s.chime(at + 0.35 + i * 0.1, note, 1.2, 0.05, spread()));
    s.hiss(at + 0.2, 1.4, 0.05, 6000, 11000);
  },
  charge(s, at) {
    s.swish(at, 200, 4800, 1.6, 0.12);
    s.whistle(at, 300, 1600, 1.6, 0.05);
  },
  merge(s, at) {
    s.thump(at, 160, 40, 0.6, 0.5);
    s.crunch(at, 0.25, 0.12);
    s.bell(at, A5, 1.4, 0.15, 2.76, 1.6);
    s.chime(at + 0.05, 2637, 1, 0.06, 0);
  },
  flash(s, at) {
    s.hiss(at, 0.25, 0.12, 5000, 12000);
    s.chime(at, 3520, 0.4, 0.05, spread());
  },
  quake(s, at) {
    s.rumble(at, 1, 0.3);
    s.thump(at, 90, 40, 0.8, 0.3);
  },
  flip(s, at) {
    s.pop(at, 1400, 900, 0.04, 0.12);
    s.bell(at + 0.02, E6, 0.8, 0.12, 2.76, 1.6);
    [D6, A6].forEach((note, i) => s.chime(at + 0.1 + i * 0.07, note, 0.7, 0.05, spread()));
  },
  drop(s, at) {
    s.swish(at, 3000, 500, 0.6, 0.12);
    s.thump(at + 0.55, 130, 50, 0.3, 0.35);
  },
  paragon(s, at) {
    s.thump(at, 150, 45, 0.6, 0.28);
    [D4, FS4, A4].forEach((note, i) => s.horn(at, note, 1.8, 0.07, -0.3 + i * 0.3));
    s.horn(at + 0.45, D5, 1.6, 0.07, 0);
    [D5, FS5, A5, D6, FS6, A6].forEach((note, i) => s.pluck(at + 0.1 + i * 0.07, note, 0.9, 0.1, -0.5 + i * 0.2,
      1.4));
    s.hiss(at + 0.1, 1.6, 0.06, 6000, 11000);
    [2349, 2960, 3520, 2960, 3520].forEach((note, i) => s.chime(at + 0.7 + i * 0.09, note, 1, 0.05, spread()));
    for (let i = 0; i < 3; i++) s.pop(at + 0.5 + i * 0.12, 600, 200, 0.06, 0.1);
  },
};

export const SFX_GAPS = {
  gun: 0.07, hit: 0.05, kill: 0.07, crack: 0.15, launch: 0.12, rock: 0.12, boom: 0.12, mine: 0.15, zap: 0.12,
  flask: 0.1, flame: 0.3, bolt: 0.08, ice: 0.1, wind: 0.2, cast: 0.12, crit: 0.15, freeze: 0.25, stun: 0.2,
  storm: 0.3, rally: 0.5, heal: 0.5, block: 0.3, roar: 1, growl: 0.8, summon: 0.4, plant: 0.3, build: 0.4,
  crumble: 0.4, bite: 0.15, leap: 0.3, chomp: 0.25, nuke: 2, fall: 1, join: 0.4, card: 0.3, holy: 0.12, splash: 0.15,
  snap: 0.15, execute: 0.3, clink: 0.2, treasure: 1, rattle: 1, rise: 0.4, hex: 0.4, burrow: 0.5, chain: 1, yank: 1,
};

export const SOUNDS = Object.keys(RECIPES);

function reverbImpulse(context) {
  const rate = context.sampleRate;
  const impulse = context.createBuffer(2, Math.floor(rate * REVERB_SECONDS), rate);
  for (let channel = 0; channel < 2; channel++) {
    const samples = impulse.getChannelData(channel);
    let smooth = 0;
    for (let i = 0; i < samples.length; i++) {
      smooth = smooth * 0.65 + (Math.random() * 2 - 1) * 0.35;
      samples[i] = smooth * Math.pow(1 - i / samples.length, 3);
    }
  }
  return impulse;
}

function whiteNoise(context) {
  const noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const samples = noise.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  return noise;
}

function createStudio(context) {
  const master = context.createGain(), limiter = context.createDynamicsCompressor();
  const bus = context.createGain(), reverb = context.createConvolver(), wet = context.createGain();
  const echo = context.createDelay(1), feedback = context.createGain(), echoTone = context.createBiquadFilter();
  const echoLevel = context.createGain();
  const noise = whiteNoise(context);
  reverb.buffer = reverbImpulse(context);
  wet.gain.value = REVERB_LEVEL;
  echo.delayTime.value = ECHO_SECONDS;
  feedback.gain.value = 0.3;
  echoTone.type = 'lowpass';
  echoTone.frequency.value = 3000;
  echoLevel.gain.value = ECHO_LEVEL;
  limiter.threshold.value = -12;
  limiter.knee.value = 12;
  limiter.ratio.value = 4;
  bus.connect(master);
  bus.connect(reverb);
  reverb.connect(wet);
  wet.connect(master);
  bus.connect(echo);
  echo.connect(echoTone);
  echoTone.connect(feedback);
  feedback.connect(echo);
  echoTone.connect(echoLevel);
  echoLevel.connect(master);
  master.connect(limiter);
  limiter.connect(context.destination);

  const envelope = (at, duration, level, attack, pan = 0) => {
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(level, at + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    if (pan && context.createStereoPanner) {
      const panner = context.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, pan));
      gain.connect(panner);
      panner.connect(bus);
    } else gain.connect(bus);
    return gain;
  };

  const run = (nodes, at, duration) => {
    for (const node of nodes) {
      node.start(at);
      node.stop(at + duration + 0.05);
    }
  };

  const noiseSource = () => {
    const source = context.createBufferSource();
    source.buffer = noise;
    source.loop = true;
    return source;
  };

  return {
    master,
    bell(at, frequency, duration, level, ratio = 3.5, brightness = 1.1, pan = 0) {
      const carrier = context.createOscillator(), modulator = context.createOscillator();
      const depth = context.createGain();
      const amount = frequency * brightness * Math.min(1, 900 / frequency);
      carrier.frequency.value = frequency;
      modulator.frequency.value = frequency * ratio;
      depth.gain.setValueAtTime(amount, at);
      depth.gain.exponentialRampToValueAtTime(amount * 0.02, at + 0.14);
      modulator.connect(depth);
      depth.connect(carrier.frequency);
      carrier.connect(envelope(at, duration, level, 0.006, pan));
      run([carrier, modulator], at, duration);
    },
    chime(at, frequency, duration, level, pan = 0) {
      [[1, 1], [2.76, 0.5], [5.4, 0.25], [8.93, 0.12]].forEach(([ratio, share]) => {
        const oscillator = context.createOscillator();
        oscillator.frequency.value = frequency * ratio;
        oscillator.connect(envelope(at, duration / Math.sqrt(ratio), level * share, 0.003, pan));
        run([oscillator], at, duration);
      });
    },
    pluck(at, frequency, duration, level, pan = 0, bright = 1) {
      const filter = context.createBiquadFilter(), voices = [-6, 6].map((cents) => {
        const oscillator = context.createOscillator();
        oscillator.type = 'sawtooth';
        oscillator.frequency.value = frequency;
        oscillator.detune.value = cents;
        oscillator.connect(filter);
        return oscillator;
      });
      filter.type = 'lowpass';
      filter.Q.value = 2;
      filter.frequency.setValueAtTime(Math.min(16000, frequency * 9 * bright), at);
      filter.frequency.exponentialRampToValueAtTime(Math.max(80, frequency * 1.2), at + duration);
      filter.connect(envelope(at, duration, level * 0.6, 0.004, pan));
      run(voices, at, duration);
    },
    horn(at, frequency, duration, level, pan = 0) {
      const filter = context.createBiquadFilter(), vibrato = context.createOscillator(), depth = context.createGain();
      vibrato.frequency.value = 5.2;
      depth.gain.value = frequency * 0.006;
      vibrato.connect(depth);
      const voices = [-9, 0, 8].map((cents) => {
        const oscillator = context.createOscillator();
        oscillator.type = 'sawtooth';
        oscillator.frequency.value = frequency;
        oscillator.detune.value = cents;
        depth.connect(oscillator.frequency);
        oscillator.connect(filter);
        return oscillator;
      });
      filter.type = 'lowpass';
      filter.Q.value = 1.2;
      filter.frequency.setValueAtTime(frequency * 1.5, at);
      filter.frequency.linearRampToValueAtTime(frequency * 5, at + Math.min(0.25, duration / 3));
      filter.frequency.exponentialRampToValueAtTime(frequency * 2, at + duration);
      filter.connect(envelope(at, duration, level * 0.5, Math.min(0.08, duration / 4), pan));
      run(voices.concat(vibrato), at, duration);
    },
    thump(at, from, to, duration, level) {
      const oscillator = context.createOscillator();
      oscillator.frequency.setValueAtTime(from, at);
      oscillator.frequency.exponentialRampToValueAtTime(to, at + duration * 0.6);
      oscillator.connect(envelope(at, duration, level, 0.003));
      run([oscillator], at, duration);
      const click = noiseSource(), filter = context.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 3000;
      click.connect(filter);
      filter.connect(envelope(at, 0.02, level * 0.3, 0.001));
      run([click], at, 0.03);
    },
    pop(at, from, to, duration, level, pan = 0) {
      const oscillator = context.createOscillator();
      oscillator.frequency.setValueAtTime(from, at);
      oscillator.frequency.exponentialRampToValueAtTime(to, at + duration);
      oscillator.connect(envelope(at, duration * 1.6, level, 0.004, pan));
      run([oscillator], at, duration * 1.6);
    },
    swish(at, from, to, duration, level, pan = 0) {
      const source = noiseSource(), filter = context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = 0.9;
      filter.frequency.setValueAtTime(from, at);
      filter.frequency.exponentialRampToValueAtTime(to, at + duration);
      source.connect(filter);
      filter.connect(envelope(at, duration, level, duration * 0.4, pan));
      run([source], at, duration);
    },
    hiss(at, duration, level, from, to) {
      const source = noiseSource(), filter = context.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(from, at);
      filter.frequency.exponentialRampToValueAtTime(to, at + duration);
      source.connect(filter);
      filter.connect(envelope(at, duration, level, duration * 0.5));
      run([source], at, duration);
    },
    crunch(at, duration, level) {
      const source = noiseSource(), filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, at);
      filter.frequency.exponentialRampToValueAtTime(200, at + duration);
      source.connect(filter);
      filter.connect(envelope(at, duration, level, 0.003));
      run([source], at, duration);
    },
    whistle(at, from, to, duration, level) {
      const oscillator = context.createOscillator(), vibrato = context.createOscillator(), depth = context.createGain();
      const gain = context.createGain();
      oscillator.frequency.setValueAtTime(from, at);
      oscillator.frequency.exponentialRampToValueAtTime(to, at + duration);
      vibrato.frequency.value = 6;
      depth.gain.value = from * 0.008;
      vibrato.connect(depth);
      depth.connect(oscillator.frequency);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(level, at + duration * 0.92);
      gain.gain.linearRampToValueAtTime(0.0001, at + duration);
      oscillator.connect(gain);
      gain.connect(bus);
      run([oscillator, vibrato], at, duration);
    },
    rumble(at, duration, level) {
      const source = noiseSource(), filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = 3;
      filter.frequency.setValueAtTime(380, at);
      filter.frequency.exponentialRampToValueAtTime(60, at + duration);
      source.connect(filter);
      filter.connect(envelope(at, duration, level, 0.02));
      run([source], at, duration);
    },
    pad(at, frequencies, duration, level) {
      for (const frequency of frequencies) {
        const oscillator = context.createOscillator();
        oscillator.type = 'triangle';
        oscillator.frequency.value = frequency;
        oscillator.connect(envelope(at, duration, level, 0.16));
        run([oscillator], at, duration);
      }
    },
  };
}

const gainFor = (volume) => Math.max(0, Math.min(100, Number(volume) || 0)) / 100 * LOUDNESS;

let context = null, studio = null;

export function play(name, volume, length) {
  const recipe = RECIPES[name], gain = gainFor(volume);
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!recipe || !gain || !AudioContext) return;
  try {
    if (!context) {
      context = new AudioContext();
      studio = createStudio(context);
    }
    if (context.state === 'suspended') context.resume().catch(() => {});
    studio.master.gain.value = gain;
    recipe(studio, context.currentTime + 0.03, length);
  } catch (error) {
    context = null;
  }
}

export function playAll(volume) {
  const order = ['wave', 'tick', 'spin', 'prize', 'win', 'level', 'join', 'buff', 'debuff', 'leak', 'execute', 'boss',
    'mine', 'build', 'crumble', 'nuke', 'over'];
  let at = 0;
  order.forEach((name) => {
    setTimeout(() => play(name, volume), at);
    at += name === 'spin' ? 3800 : name === 'nuke' || name === 'boss' || name === 'win' ? 2200 : 900;
  });
}

export async function measure(name, volume) {
  const OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext, rate = 44100;
  const offline = new OfflineContext(2, rate * 5, rate);
  const rendering = createStudio(offline);
  rendering.master.gain.value = gainFor(volume);
  RECIPES[name](rendering, 0.05);
  const samples = (await offline.startRendering()).getChannelData(0);
  let peak = 0, power = 0, end = 0;
  for (let i = 0; i < samples.length; i++) {
    const level = Math.abs(samples[i]);
    if (level > peak) peak = level;
    if (level > 0.002) end = i;
    power += level * level;
  }
  return { peak, rms: Math.sqrt(power / samples.length), seconds: end / rate, samples };
}
