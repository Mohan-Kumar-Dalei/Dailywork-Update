/**
 * Chhota in-memory cache.
 *
 * Google ki har call ~1 second leti hai, aur ek page load par kai calls
 * jaati hain (naam, tabs, target cell, title). Wahi data thodi der ke liye
 * yaad rakh lete hain taaki app turant khule.
 */

const store = new Map();

export const TTL = Number(process.env.CACHE_TTL_MS || 45000);

export async function cached(key, fn, ttl = TTL) {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.value;

  const value = await fn();
  store.set(key, { at: Date.now(), value });
  return value;
}

/** Kisi cheez ke badalne par uska cache hata do. */
export function invalidate(prefix = '') {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
