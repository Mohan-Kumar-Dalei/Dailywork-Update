/**
 * Do tarah ki settings:
 *
 *  - TEAM  (data/team.json)  -- sheet, tab, history sheet, custom fields.
 *    Ye sabke liye ek jaisi hoti hain, koi bhi badle to sabko lagti hain.
 *  - USER  (data/users.json) -- har aadmi ka apna naam (sheet me uski row).
 */
import fs from 'node:fs/promises';
import { DATA_DIR, dataFile } from './paths.js';

const DIR = DATA_DIR;
const TEAM_FILE = dataFile('team.json');
const USERS_FILE = dataFile('users.json');

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

async function writeJson(file, value) {
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(file, JSON.stringify(value, null, 2));
}

export const readTeam = () => readJson(TEAM_FILE, {});
export const writeTeam = (v) => writeJson(TEAM_FILE, v);

export const readUsers = () => readJson(USERS_FILE, {});

export async function readUser(email) {
  return (await readUsers())[email] || {};
}

export async function writeUser(email, patch) {
  const all = await readUsers();
  all[email] = { ...(all[email] || {}), ...patch, updatedAt: new Date().toISOString() };
  await writeJson(USERS_FILE, all);
  return all[email];
}
