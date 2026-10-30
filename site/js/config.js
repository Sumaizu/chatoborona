export const DEFAULTS = {
  channel: '',
  lobby: 180,
  first_wave: 60,
  wave_pause: 20,
  chat_commands: true,
  sound: true,
  volume: 100,
  webcam: 'cam',
};

const LOGIN_RE = /^[a-z0-9_]{1,25}$/;

function int(value, fallback, min, max) {
  const n = typeof value === 'boolean' || value === null || value === '' ? NaN : Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.trunc(n))) : fallback;
}

const CAMERAS = ['none', 'cam', 'vtuber'];

function flag(value, fallback) {
  if (value === undefined) return fallback;
  if (typeof value === 'string') return !['', '0', 'false', 'no', 'off'].includes(value.trim().toLowerCase());
  return Boolean(value);
}

function camera(value, fallback) {
  if (value === undefined) return fallback;
  const name = String(value).trim().toLowerCase();
  if (CAMERAS.includes(name)) return name;
  return flag(value, true) ? 'cam' : 'none';
}

function channel(value) {
  let name = String(value == null ? '' : value).trim().toLowerCase().replace(/^[#@]+/, '');
  name = name.split(/[?#]/, 1)[0].replace(/\/+$/, '');
  name = name.slice(name.lastIndexOf('/') + 1).replace(/^@+/, '');
  return LOGIN_RE.test(name) ? name : '';
}

export function clean(raw) {
  raw = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const d = DEFAULTS, s = {};
  s.channel = channel(raw.channel);
  s.lobby = int(raw.lobby, d.lobby, 10, 900);
  s.first_wave = int(raw.first_wave, d.first_wave, 5, 600);
  s.wave_pause = int(raw.wave_pause, d.wave_pause, 3, 300);
  s.chat_commands = flag(raw.chat_commands, d.chat_commands);
  s.sound = flag(raw.sound, d.sound);
  s.volume = int(raw.volume, d.volume, 0, 100);
  s.webcam = camera(raw.webcam, d.webcam);
  return s;
}

export function toQuery(settings) {
  const s = clean(settings), params = new URLSearchParams();
  for (const key of Object.keys(DEFAULTS)) {
    const value = s[key];
    if (value === DEFAULTS[key]) continue;
    params.set(key, typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
  }
  return params.toString();
}

export function fromQuery(search) {
  const params = new URLSearchParams(search), raw = {};
  for (const key of Object.keys(DEFAULTS)) if (params.has(key)) raw[key] = params.get(key);
  return clean(raw);
}
