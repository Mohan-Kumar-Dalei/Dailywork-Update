import { config } from '../config.js';
import { jsonStore } from './jsonStore.js';
import { sheetsStore } from './sheetsStore.js';

/**
 * STORE=json rakho to sheet ko haath nahi lagta (sirf local file).
 * Warna sab kuch sheet me jaata hai -- login na ho to request khud error degi.
 */
export function activeStore() {
  return config.store === 'json' ? jsonStore : sheetsStore;
}

export const store = new Proxy({}, {
  get(_t, prop) {
    const s = activeStore();
    const value = s[prop];
    return typeof value === 'function' ? value.bind(s) : value;
  }
});
