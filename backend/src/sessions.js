/**
 * Sessions aur tokens -- dono email ke hisaab se.
 *
 * Browser ke pass sirf ek random session id (cookie) jaati hai.
 * Google ka token server par rehta hai, kabhi browser tak nahi jaata.
 */
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { DATA_DIR, dataFile } from './paths.js';

const DIR = DATA_DIR;
const SESSIONS_FILE = dataFile('sessions.json');
const TOKENS_FILE = dataFile('tokens.json');

const DAYS = Number(process.env.SESSION_DAYS || 30);

async function read(file) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return {};
  }
}

async function write(file, value) {
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(file, JSON.stringify(value, null, 2));
}

export const newId = () => crypto.randomBytes(24).toString('hex');

/* ---------- sessions ---------- */

export async function emailForSession(sid) {
  if (!sid) return null;
  const all = await read(SESSIONS_FILE);
  const row = all[sid];
  if (!row) return null;

  if (Date.now() - new Date(row.at).getTime() > DAYS * 86400000) {
    delete all[sid];
    await write(SESSIONS_FILE, all);
    return null;
  }
  return row.email;
}

export async function startSession(sid, email) {
  const all = await read(SESSIONS_FILE);
  all[sid] = { email, at: new Date().toISOString() };
  await write(SESSIONS_FILE, all);
}

export async function endSession(sid) {
  const all = await read(SESSIONS_FILE);
  delete all[sid];
  await write(SESSIONS_FILE, all);
}

/* ---------- tokens ---------- */

export async function tokenFor(email) {
  return (await read(TOKENS_FILE))[email] || null;
}

export async function saveToken(email, tokens) {
  const all = await read(TOKENS_FILE);
  // dobara login par refresh_token nahi aata -- purana bacha lo
  if (!tokens.refresh_token && all[email]?.refresh_token) {
    tokens.refresh_token = all[email].refresh_token;
  }
  all[email] = tokens;
  await write(TOKENS_FILE, all);
}

export async function dropToken(email) {
  const all = await read(TOKENS_FILE);
  delete all[email];
  await write(TOKENS_FILE, all);
}

/** Kitne log jud chuke hain. */
export async function knownUsers() {
  return Object.keys(await read(TOKENS_FILE));
}
