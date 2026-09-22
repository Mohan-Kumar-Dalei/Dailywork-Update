import { Router } from 'express';
import { config } from './config.js';
import { buildReport, todayStr } from './report.js';
import { store, activeStore } from './store/index.js';
import { getSettings, saveSettings, sheetUrl } from './settings.js';
import { currentUser } from './context.js';
import { sessionId, setSessionCookie } from './middleware.js';
import { startSession, endSession, knownUsers } from './sessions.js';
import {
  authKind, authUrl, exchangeCode, logout, whoami, oauthConfigured,
  availableClients, parseState, redirectUriFor
} from './googleAuth.js';
import { composeUrl, recipients, forgetSignature } from './gmail.js';
import { makeReport, sendReport } from './sendReport.js';
import { listJobs, addJob, cancelJob } from './scheduler.js';
import { searchPeople, namesFor } from './contacts.js';

export const router = Router();

/**
 * Har route ka error 400 ban jaata hai. Jo error humne khud phenke hain
 * (jaise "Pick your name first") wo user ke liye hain -- unka stack bekaar
 * hai. Baaki sab asli bug hai, isliye poora stack server log me jaata hai,
 * warna Render par kuch pata hi nahi chalta.
 */
const wrap = (fn) => (req, res) => {
  Promise.resolve(fn(req, res)).catch((err) => {
    if (!(err instanceof Error) || err.name !== 'Error') {
      console.error(`${req.method} ${req.originalUrl} failed:`, err);
    }
    res.status(400).json({ error: err.message || String(err) });
  });
};

/** Sign in kiye bina aage mat jaane do. */
const guard = (fn) => wrap(async (req, res) => {
  if (!currentUser()) {
    res.status(401).json({ error: 'Please sign in with Google first.' });
    return;
  }
  return fn(req, res);
});

async function resolveTarget(date) {
  return store.locate(date);
}

/* ---------- Google login ---------- */

router.get('/auth/url', wrap(async (req, res) => {
  const sid = sessionId(req, res);        // cookie yahin set hoti hai
  const kind = req.query.as === 'work' ? 'work' : 'personal';
  res.json({ url: authUrl(sid, kind, redirectUriFor(req)) });
}));

/** Google yahan wapas bhejta hai. */
router.get('/auth/callback', async (req, res) => {
  const back = config.clientOrigins[0];   // login ke baad frontend par wapas
  if (req.query.error) {
    res.redirect(back + '/?auth=' + encodeURIComponent(req.query.error));
    return;
  }
  try {
    const { sid, kind } = parseState(req.query.state);
    if (!sid) throw new Error('Session missing. Please try signing in again.');

    const { email } = await exchangeCode(req.query.code, kind, redirectUriFor(req));
    await startSession(sid, email);
    setSessionCookie(req, res, sid);
    res.redirect(back + '/?auth=ok');
  } catch (err) {
    res.redirect(back + '/?auth=' + encodeURIComponent(err.message));
  }
});

router.post('/auth/logout', wrap(async (req, res) => {
  const email = currentUser();
  if (req.sid) await endSession(req.sid);
  if (email) { forgetSignature(email); await logout(email); }
  res.json({ ok: true });
}));

/* ---------- app config ---------- */

/** Sheet ka naam pata karke team settings me bhar do (ek hi baar). */
async function ensureTitle(s) {
  if (s.sheetTitle || !currentUser()) return s;
  try {
    return await saveSettings({ sheetTitle: await store.title() });
  } catch {
    return s;
  }
}

router.get('/config', wrap(async (_req, res) => {
  const kind = await authKind();
  const s = kind === 'none' ? await getSettings() : await ensureTitle(await getSettings());

  res.json({
    today: todayStr(),
    auth: kind,
    oauthConfigured: oauthConfigured(),
    recipients: kind === 'none' ? { to: [], cc: [] } : await recipients(),
    signInOptions: availableClients(),
    account: await whoami(),
    canWrite: kind !== 'none' && activeStore().name === 'sheets',
    store: activeStore().name,
    settings: { ...s, url: s.sheetId ? sheetUrl(s) : '' },
    totalPendingRule: config.totalPendingRule,
    mailEnabled: config.mailEnabled,
    teamSize: (await knownUsers()).length
  });
}));

router.get('/health', guard(async (_req, res) => {
  res.json({ auth: await authKind(), store: { name: activeStore().name, ...(await store.health()) } });
}));

/* ---------- settings ---------- */

router.get('/settings', guard(async (_req, res) => {
  const s = await getSettings();
  res.json({ ...s, url: s.sheetId ? sheetUrl(s) : '' });
}));

router.put('/settings', guard(async (req, res) => {
  let s = await saveSettings(req.body);
  let target = null;
  try {
    target = await resolveTarget(todayStr());
    if (target.tab && target.tab !== s.tab) s = await saveSettings({ tab: target.tab });
    if (!s.sheetTitle) s = await saveSettings({ sheetTitle: await store.title() });
  } catch (err) {
    target = { error: err.message };
  }
  res.json({ ok: true, settings: { ...s, url: sheetUrl(s) }, target });
}));

router.get('/tabs', guard(async (_req, res) => res.json(await store.tabs())));
router.get('/names', guard(async (_req, res) => res.json(await store.names())));

/* ---------- mail recipients ke naam ---------- */

router.get('/contacts', guard(async (req, res) => {
  res.json(await searchPeople(req.query.q));
}));

router.post('/contacts/names', guard(async (req, res) => {
  res.json(await namesFor(req.body?.emails || []));
}));

/* ---------- report ---------- */

router.get('/sheet/locate', guard(async (req, res) => {
  res.json(await resolveTarget(req.query.date || todayStr()));
}));

/** Kuch likhe bina sirf text. withTarget:false -> sheet padhi hi nahi jaati. */
router.post('/preview', guard(async (req, res) => {
  const report = await makeReport(req.body);

  if (req.body.withTarget === false) {
    res.json(report);
    return;
  }

  let target;
  try {
    target = await resolveTarget(report.data.date);
  } catch (err) {
    target = { error: err.message };
  }
  res.json({ ...report, target });
}));

/** Cell me value + uspe comment. */
router.post('/save-note', guard(async (req, res) => {
  const s = await getSettings();
  if (!s.personName) throw new Error('Pick your name in the Sheet settings first.');

  const report = await makeReport(req.body);
  const result = await store.saveNote(report.data.date, report.note, report.data);
  await store.log({
    ...report.data,
    cell: result.target,
    status: 'Saved',
    savedAt: new Date().toISOString()
  });

  const prev = result.previousValue ? ' (was ' + result.previousValue + ')' : '';
  res.json({
    ok: true,
    message: 'Saved to ' + result.target + prev,
    target: await resolveTarget(report.data.date),
    ...report
  });
}));

/* ---------- mail ---------- */

/** Gmail compose link -- bina kuch bheje, sirf plain text. */
router.post('/mail/compose-url', guard(async (req, res) => {
  const report = await makeReport(req.body);
  res.json({ url: await composeUrl(report) });
}));

/** Mail bhejo. saveNote:true ho to sheet bhi update karo. */
router.post('/send', guard(async (req, res) => {
  if (!config.mailEnabled) throw new Error('Mail is turned off on the server.');

  const result = await sendReport(req.body);
  res.json({ ok: true, message: result.message, ...result.report });
}));

/* ---------- schedule ---------- */

router.get('/schedule', guard(async (_req, res) => {
  res.json(await listJobs(currentUser()));
}));

/** Baad me bhejne ke liye rakh do. */
router.post('/schedule', guard(async (req, res) => {
  const { when, ...payload } = req.body;
  const job = await addJob(currentUser(), when, payload);
  res.json({ ok: true, job });
}));

router.delete('/schedule/:id', guard(async (req, res) => {
  await cancelJob(currentUser(), req.params.id);
  res.json({ ok: true });
}));

router.get('/history', guard(async (_req, res) => res.json(await store.history(30))));

router.get('/sheet/comments', guard(async (_req, res) => res.json(await store.comments())));

router.delete('/sheet/comments/:id', guard(async (req, res) => {
  await store.deleteComment(req.params.id);
  res.json({ ok: true });
}));
