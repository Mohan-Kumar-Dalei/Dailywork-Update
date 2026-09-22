import axios from 'axios';

/**
 * Backend se baat karne ka ek hi rasta.
 *
 * Dev me Vite khud /api ko backend par bhej deta hai, isliye baseURL khali
 * rehti hai. Render par dono alag domain par hote hain, to VITE_API_URL me
 * backend ka URL aata hai (Render sirf hostname deta hai, scheme nahi).
 */
const baseURL = (() => {
  const raw = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');
  if (!raw) return '/api';
  return (/^https?:\/\//i.test(raw) ? raw : 'https://' + raw) + '/api';
})();

export const http = axios.create({
  baseURL,
  withCredentials: true,        // session cookie har request ke saath
  timeout: 60000,               // Render ka free instance neend se uthne me time leta hai
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

export const api = {
  config: () => http.get('/config'),
  health: () => http.get('/health'),

  authUrl: (as) => http.get('/auth/url', { params: as ? { as } : {} }),
  logout: () => http.post('/auth/logout'),

  settings: () => http.get('/settings'),
  saveSettings: (payload) => http.put('/settings', payload),
  names: () => http.get('/names'),
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
