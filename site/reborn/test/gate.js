export const GATE = 'a6c79a27049109e472b246b5dfbe08aedff1e9e2259597e54032dbad4958d4ad';
const KEY = 'reborn.test.pass';

export async function digest(text) {
  const bytes = new TextEncoder().encode(String(text).trim().toLowerCase());
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function allowed(nick) {
  return (await digest(nick)) === GATE;
}

export function remembered() {
  try {
    return localStorage.getItem(KEY) === GATE;
  } catch (error) {
    return false;
  }
}

export function remember() {
  try {
    localStorage.setItem(KEY, GATE);
  } catch (error) {
    return;
  }
}
