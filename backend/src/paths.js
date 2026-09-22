/**
 * Saare folder yahin se tay hote hain.
 *
 * Jagah file ki apni jagah se nikalte hain, cwd se nahi -- kyunki Render par
 * start command repo ke root se chalti hai, aur cwd par bharosa karne se
 * data folder galat jagah ban jaata.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));   // backend/src

export const BACKEND_DIR = path.join(HERE, '..');
export const REPO_DIR = path.join(BACKEND_DIR, '..');

/** Tokens, sessions, team settings, history. Render ke disk ke liye DATA_DIR. */
export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(BACKEND_DIR, 'data');

/** React ka build -- yahi Express serve karta hai. */
export const CLIENT_DIST = path.join(REPO_DIR, 'frontend', 'dist');

export const dataFile = (name) => path.join(DATA_DIR, name);
