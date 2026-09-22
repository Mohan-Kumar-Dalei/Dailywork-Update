/**
 * Dev me Vite khud /api ko backend par bhej deta hai, isliye base khali hai.
 * Render par dono alag domain par hote hain, to VITE_API_URL me backend ka
 * pura URL daalna padta hai.
 */
const BASE = (() => {
  const raw = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');
  if (!raw) return '';                          // dev: Vite khud proxy karta hai
  if (/^https?:\/\//i.test(raw)) return raw;
  return 'https://' + raw;                      // Render sirf hostname deta hai
})();

async function call(path, options) {
  // cookie hamesha saath jaaye -- server isi se pehchanta hai ki kaun hai
  const res = await fetch(`${BASE}/api${path}`, { credentials: 'include', ...options });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

const body = (method) => (path, payload) =>
  call(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

const post = body('POST');
const put = body('PUT');

export const api = {
  config: () => call('/config'),
  authUrl: (as) => call('/auth/url' + (as ? '?as=' + as : '')),
  logout: () => post('/auth/logout', {}),
  health: () => call('/health'),
  history: () => call('/history'),
  names: () => call('/names'),
  tabs: () => call('/tabs'),
  settings: () => call('/settings'),
  saveSettings: (payload) => put('/settings', payload),
  locate: (date) => call('/sheet/locate?date=' + encodeURIComponent(date)),
  preview: (form) => post('/preview', form),
  saveNote: (form) => post('/save-note', form),
  send: (form) => post('/send', form),
  composeUrl: (form) => post('/mail/compose-url', form),

  schedule: () => call('/schedule'),
  addSchedule: (payload) => post('/schedule', payload),
  cancelSchedule: (id) => call('/schedule/' + id, { method: 'DELETE' })
};

