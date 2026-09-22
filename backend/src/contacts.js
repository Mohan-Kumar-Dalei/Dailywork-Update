/**
 * Mail ke recipients ke naam dhoondhna -- bilkul waise jaise Gmail me
 * address likhte hi naam dikh jaata hai.
 *
 * Do jagah dekhte hain:
 *  - saved contacts        (people.searchContacts)
 *  - "other contacts"      (otherContacts.search) -- jinhe aapne mail kiya hai
 *
 * Ye dono naye scopes maangte hain. Purane login me wo scopes nahi honge,
 * isliye 403 aane par hum chup-chaap khaali list lauta dete hain aur UI ko
 * bata dete hain ki dobara sign in karna padega. Naam na mile to bhi address
 * haath se likhna chalta rehta hai.
 */
import { google } from 'googleapis';
import { getAuthClient } from './googleAuth.js';
import { cached, invalidate } from './cache.js';
import { currentUser } from './context.js';

const READ_MASK = 'names,emailAddresses';

async function people() {
  return google.people({ version: 'v1', auth: await getAuthClient() });
}

/** Google ka jawaab -> [{ name, email }] */
function flatten(results = []) {
  const out = [];
  for (const { person } of results) {
    const name = person?.names?.[0]?.displayName || '';
    for (const e of person?.emailAddresses || []) {
      if (e.value) out.push({ name, email: e.value });
    }
  }
  return out;
}

/**
 * Sirf "is token me ye scope nahi hai" wali galti pakdo. "People API
 * enabled nahi hai" bhi 403 deta hai, par uska message alag hota hai aur
 * use chupana nahi chahiye -- wo user ko dikhna chahiye.
 */
const isScopeError = (err) => {
  const code = err?.code || err?.response?.status;
  if (code !== 401 && code !== 403) return false;
  const text = JSON.stringify(err?.response?.data || err?.message || '').toLowerCase();
  return text.includes('scope') || text.includes('insufficient');
};

/**
 * Google kehta hai ki search se pehle ek khaali query bhejo taaki uska
 * cache garam ho jaaye. Har user ke liye ek hi baar kaafi hai.
 */
const warmed = new Set();

async function warmUp(api, who) {
  if (warmed.has(who)) return;
  warmed.add(who);
  await Promise.allSettled([
    api.people.searchContacts({ query: '', readMask: READ_MASK }),
    api.otherContacts.search({ query: '', readMask: READ_MASK })
  ]);
}

/**
 * Lautata hai { people: [{name, email}], needsReauth: boolean }.
 * needsReauth true ka matlab: login purana hai, contacts wale scopes nahi hain.
 */
export async function searchPeople(query) {
  const q = String(query || '').trim();
  if (q.length < 2) return { people: [], needsReauth: false };

  const who = currentUser() || 'anon';
  const key = `contacts:${who}:${q.toLowerCase()}`;

  const result = await cached(key, async () => {
    const api = await people();
    await warmUp(api, who);

    const calls = await Promise.allSettled([
      api.people.searchContacts({ query: q, readMask: READ_MASK, pageSize: 10 }),
      api.otherContacts.search({ query: q, readMask: READ_MASK, pageSize: 10 })
    ]);

    const rejected = calls.filter((c) => c.status === 'rejected');
    if (rejected.length === calls.length) {
      if (rejected.every((r) => isScopeError(r.reason))) {
        return { people: [], needsReauth: true };
      }
      throw rejected[0].reason;
    }

    const seen = new Map();
    for (const c of calls) {
      if (c.status !== 'fulfilled') continue;
      for (const hit of flatten(c.value.data.results)) {
        const key = hit.email.toLowerCase();
        // pehla naam jeetta hai, lekin khaali naam ko baad wala bhar sakta hai
        if (!seen.has(key)) seen.set(key, hit);
        else if (!seen.get(key).name && hit.name) seen.set(key, hit);
      }
    }

    return { people: [...seen.values()].slice(0, 8), needsReauth: false };
  });

  // dobara sign in karte hi agli call fresh jaani chahiye
  if (result.needsReauth) invalidate(key);
  return result;
}

/**
 * Jo address pehle se chune hue hain unke naam nikaalo.
 * Lautata hai { "mail@x.com": "Full Name" } -- jo na mile wo chhod diye.
 */
export async function namesFor(emails = []) {
  const list = [...new Set(emails.map((e) => String(e).trim()).filter(Boolean))];
  if (!list.length) return { names: {}, needsReauth: false };

  const found = {};
  let needsReauth = false;

  for (const email of list) {
    try {
      const r = await searchPeople(email);
      if (r.needsReauth) { needsReauth = true; break; }
      const hit = r.people.find((p) => p.email.toLowerCase() === email.toLowerCase());
      if (hit?.name) found[email] = hit.name;
    } catch {
      // ek address na mile to baaki ka kaam rukna nahi chahiye
    }
  }

  return { names: found, needsReauth };
}
