import axios from 'axios';

/**
 * Backend se baat karne ka ek hi rasta.
 *
 * Yahi UI do jagah chalti hai:
 *   - Express wala web app  -> HTTP par axios se
 *   - Google Apps Script    -> google.script.run se, bina kisi server ke
 *
 * Dono ke function naam aur return shape ek jaise rakhe gaye hain, isliye
 * baaki components ko pata bhi nahi chalta ki wo kahan chal rahe hain.
 */

/* ---------- Apps Script ---------- */

const insideAppsScript =
  typeof window !== 'undefined' &&
  Boolean(window.google && window.google.script && window.google.script.run);

/** Ek .gs function ko Promise ki tarah bulata hai. */
function run(name, ...args) {
  return new Promise((resolve, reject) => {
    window.google.script.run
      .withSuccessHandler(resolve)
      .withFailureHandler((err) => {
        reject(new Error((err && err.message) || String(err)));
      })[name](...args);
  });
}

const scriptApi = {
  config: () => run('getConfig'),
  health: () => run('getConfig'),

  // Apps Script me user hamesha signed in hota hai -- login/logout ka kaam hi nahi
  authUrl: () => Promise.resolve({ url: '' }),
  logout: () => Promise.resolve({ ok: true }),

  settings: () => run('getConfig'),
  saveSettings: (payload) => run('saveSettingsApi', payload),
  names: () => run('listNames'),
  contacts: (q) => run('searchContacts', q),
  contactNames: (emails) => run('contactNames', emails),
  tabs: () => run('listTabs'),

  locate: (date) => run('locateTarget', date),
  preview: (form) => run('previewReport', form),
  saveNote: (form) => run('saveNoteOnly', form),
  history: () => run('listHistory', 30),

  send: (form) => run('sendReportNow', form),
  composeUrl: (form) => run('composeUrl', form),

  schedule: () => run('listSchedules'),
  addSchedule: (payload) => run('addSchedule', payload),
  cancelSchedule: (id) => run('cancelSchedule', id)
};

/* ---------- Express ---------- */

/**
 * Dev me Vite khud /api ko backend par bhej deta hai, isliye baseURL khali
 * rehti hai. Alag domain par host ho to VITE_API_URL me backend ka URL aata
 * hai (Render sirf hostname deta hai, scheme nahi).
 */
const baseURL = (() => {
  const raw = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');
  if (!raw) return '/api';
  return (/^https?:\/\//i.test(raw) ? raw : 'https://' + raw) + '/api';
})();

export const http = axios.create({
  baseURL,
  withCredentials: true,        // session cookie har request ke saath
  timeout: 60000,               // free instance neend se uthne me time leta hai
  headers: { 'Content-Type': 'application/json' }
});

/**
 * Har jagah `res.data.data` likhne se bachne ke liye seedha data lautate hain,
 * aur error ko wahi message dete hain jo server ne bheja hai.
 */
http.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const fromServer = err.response?.data?.error;
    const message =
      fromServer ||
      (err.code === 'ECONNABORTED' ? 'The server took too long to answer.' : null) ||
      (err.response ? `Request failed (${err.response.status})` : 'Cannot reach the server.');

    return Promise.reject(new Error(message));
  }
);

const httpApi = {
  config: () => http.get('/config'),
  health: () => http.get('/health'),

  authUrl: (as) => http.get('/auth/url', { params: as ? { as } : {} }),
  logout: () => http.post('/auth/logout'),

  settings: () => http.get('/settings'),
  saveSettings: (payload) => http.put('/settings', payload),
  names: () => http.get('/names'),
  contacts: (q) => http.get('/contacts', { params: { q } }),
  contactNames: (emails) => http.post('/contacts/names', { emails }),
  tabs: () => http.get('/tabs'),

  locate: (date) => http.get('/sheet/locate', { params: { date } }),
  preview: (form) => http.post('/preview', form),
  saveNote: (form) => http.post('/save-note', form),
  history: () => http.get('/history'),

  send: (form) => http.post('/send', form),
  composeUrl: (form) => http.post('/mail/compose-url', form),

  schedule: () => http.get('/schedule'),
  addSchedule: (payload) => http.post('/schedule', payload),
  cancelSchedule: (id) => http.delete('/schedule/' + id)
};

export const isAppsScript = insideAppsScript;
export const api = insideAppsScript ? scriptApi : httpApi;
