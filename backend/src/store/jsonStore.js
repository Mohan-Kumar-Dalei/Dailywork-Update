/**
 * Local file store — bina kisi Google setup ke app chalane ke liye.
 * History data/history.json me rehti hai.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { dataFile } from '../paths.js';

const FILE = dataFile('history.json');

async function readAll() {
  try {
    return JSON.parse(await fs.readFile(FILE, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function writeAll(rows) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(rows, null, 2));
}

export const jsonStore = {
  name: 'json',

  async health() {
    return { ok: true, detail: `Local file: ${FILE}` };
  },

  /** Us date ka pehle se saved record, warna null. */
  async getByDate(dateStr) {
    const rows = await readAll();
    return rows.find((r) => r.date === dateStr) || null;
  },

  /** Note "save" karna — file me hi rakh lete hain. */
  async saveNote(dateStr, note, data) {
    const rows = await readAll();
    const i = rows.findIndex((r) => r.date === dateStr);
    const row = { ...data, date: dateStr, note, savedAt: new Date().toISOString() };
    if (i === -1) rows.push(row);
    else rows[i] = { ...rows[i], ...row };
    await writeAll(rows);
    return { target: `history.json (${dateStr})` };
  },

  async log(entry) {
    const rows = await readAll();
    const i = rows.findIndex((r) => r.date === entry.date);
    if (i === -1) rows.push(entry);
    else rows[i] = { ...rows[i], ...entry };
    await writeAll(rows);
  },

  async history(limit = 30) {
    const rows = await readAll();
    return rows.slice(-limit).reverse();
  }
};
