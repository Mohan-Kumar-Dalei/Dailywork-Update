/**
 * Har request ke saath uska user jodta hai.
 * Cookie me sirf session id hoti hai; email server par se nikalte hain.
 */
import { config } from './config.js';
import { runAs } from './context.js';
import { emailForSession, newId } from './sessions.js';

export const COOKIE = 'dwr_sid';

export function readCookie(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

export function setSessionCookie(res, sid) {
  res.cookie(COOKIE, sid, {
    httpOnly: true,
    sameSite: config.cookie.sameSite,
    secure: config.cookie.secure,
    maxAge: config.cookie.days * 86400000
  });
}

/** Session id -- na ho to naya bana kar cookie set kar deta hai. */
export function sessionId(req, res) {
  let sid = readCookie(req, COOKIE);
  if (!sid) {
    sid = newId();
    setSessionCookie(res, sid);
  }
  req.sid = sid;
  return sid;
}

export async function withUser(req, res, next) {
  const sid = readCookie(req, COOKIE);
  req.sid = sid;
  const email = await emailForSession(sid);
  runAs(email, () => next());
}
