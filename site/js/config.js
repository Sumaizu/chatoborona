export const DEFAULTS = {
  channel: '',
  lobby: 180,
  first_wave: 60,
  wave_pause: 20,
  chat_commands: true,
  reset_mode: 'never',
  reset_hour: 6,
  reset_hours: 12,
  sound: true,
  volume: 100,
  webcam: true,
  chat: true,
  side: true,
  bg: true,
};

const RESET_MODES = ['never', 'day', 'week', 'month', 'timer'];
const LOGIN_RE = /^[a-z0-9_]{1,25}$/;

function int(value, fallback, min, max) {
  const n = typeof value === 'boolean' || value === null || value === '' ? NaN : Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.trunc(n))) : fallback;
}

function flag(value, fallback) {
  if (value === undefined) return fallback;
  if (typeof value === 'string') return !['', '0', 'false', 'no', 'off'].includes(value.trim().toLowerCase());
  return Boolean(value);
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
  s.reset_mode = RESET_MODES.includes(raw.reset_mode) ? raw.reset_mode : d.reset_mode;
  s.reset_hour = int(raw.reset_hour, d.reset_hour, 0, 23);
  s.reset_hours = int(raw.reset_hours, d.reset_hours, 1, 720);
  s.sound = flag(raw.sound, d.sound);
  s.volume = int(raw.volume, d.volume, 0, 100);
  s.webcam = flag(raw.webcam, d.webcam);
  s.chat = flag(raw.chat, d.chat);
  s.side = flag(raw.side, d.side);
  s.bg = flag(raw.bg, d.bg);
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
