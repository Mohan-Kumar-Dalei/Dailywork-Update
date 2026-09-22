/**
 * Mail Gmail API se jaata hai -- usi account se jisse aap logged in ho.
 * Isliye mail aapke apne Sent folder me bhi dikhta hai, aur SMTP ya
 * App Password ki koi zarurat nahi.
 */
import { google } from 'googleapis';
import { getAuthClient, whoami } from './googleAuth.js';
import { getSettings } from './settings.js';

/** Mail kisko jaayega -- jo settings me likha hai, wahi. */
export async function recipients() {
  const s = await getSettings();
  return { to: s.mailTo || [], cc: s.mailCc || [] };
}

const b64 = (text) => Buffer.from(text).toString('base64');

/**
 * Gmail signature ke images ka asli link nikalo.
 *
 * Gmail signature me images ka src uske apne proxy ka hota hai
 * (ci3.googleusercontent.com/meips/...), jo sirf aapke apne mailbox me
 * chalta hai -- doosron ko photo nahi dikhti. Asli public link usi URL me
 * "#" ke baad chhupa hota hai, wahi laga dete hain.
 */
function fixSignatureImages(html) {
  return html.replace(/src="[^"]*#(https?:[^"]+)"/gi, 'src="$1"');
}

/**
 * Gmail ka apna signature.
 *
 * Gmail signature sirf compose window me apne aap lagta hai -- API se
 * bheje mail me nahi. Isliye settings se padh kar khud jodte hain.
 * Ek baar padh kar yaad rakh lete hain, har mail par nahi poochhte.
 */
const signatures = new Map();

export async function signatureFor(email) {
  if (signatures.has(email)) return signatures.get(email);

  let html = '';
  try {
    const gmail = google.gmail({ version: 'v1', auth: await getAuthClient() });
    const res = await gmail.users.settings.sendAs.list({ userId: 'me' });
    const mine = (res.data.sendAs || []).find((a) => a.isDefault) || res.data.sendAs?.[0];
    html = fixSignatureImages(mine?.signature || '');
  } catch {
    html = '';   // permission na ho to bina signature ke bhej do
  }

  signatures.set(email, html);
  return html;
}

export function forgetSignature(email) {
  signatures.delete(email);
}

/** RFC 2822 message -> base64url. HTML aur plain text dono bhejte hain. */
function encodeMessage({ from, to, cc, subject, text, html }) {
  const boundary = 'dwr_' + Date.now().toString(36);

  const headers = [
    `From: ${from}`,
    `To: ${to.join(', ')}`,
    cc.length ? `Cc: ${cc.join(', ')}` : null,
    `Subject: =?UTF-8?B?${b64(subject)}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`
  ].filter(Boolean);

  const parts = [
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    b64(text),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    b64(html),
    `--${boundary}--`
  ];

  const raw = headers.join('\r\n') + '\r\n\r\n' + parts.join('\r\n');
  return Buffer.from(raw)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * From header standard tareeke se.
 * Display name quotes me aur non-ASCII ho to RFC 2047 encoding --
 * bina iske kuch mail clients naam/address ko theek se nahi padhte.
 */
function formatFrom(me) {
  if (!me?.name) return me?.email || '';

  const ascii = /^[ -~]*$/.test(me.name);
  const name = ascii
    ? '"' + me.name.replace(/"/g, '') + '"'
    : '=?UTF-8?B?' + Buffer.from(me.name).toString('base64') + '?=';

  return `${name} <${me.email}>`;
}

export async function sendReportMail({ subject, text, html }) {
  const me = await whoami();
  const { to, cc } = await recipients();
  if (!to.length) throw new Error('No recipients set. Add them in Mail settings.');

  const gmail = google.gmail({ version: 'v1', auth: await getAuthClient() });
  const from = formatFrom(me);

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encodeMessage({ from, to, cc, subject, text, html }) }
  });

  return { id: res.data.id, to, cc };
}

/**
 * Gmail ka compose window kholne wala link -- bina kisi permission ke.
 * Ismein sirf plain text jaata hai, table nahi (Gmail link HTML nahi leta).
 */
export async function composeUrl({ subject, text }) {
  const { to, cc } = await recipients();
  const params = new URLSearchParams({
    view: 'cm', fs: '1', to: to.join(','), su: subject, body: text
  });
  if (cc.length) params.set('cc', cc.join(','));
  return 'https://mail.google.com/mail/?' + params.toString();
}
