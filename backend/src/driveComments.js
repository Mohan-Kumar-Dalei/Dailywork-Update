/**
 * Asli Google Sheets comment (Ctrl+Alt+M wala) — cell par anchored.
 *
 * Kaise: Sheets ka comment anchor coordinates nahi leta, wo ek internal
 * "range object" ka id leta hai. Aisa id API se bhi ban sakta hai —
 * ek protected range banao, uska protectedRangeId lo, aur wahi id
 * comment ke anchor me daal do. Comment us cell par ja lagta hai.
 *
 * (Coordinate wale anchor "0.148.22.148.22" Google chupchaap store to kar
 * leta hai lekin cell se jodta nahi — pehchan: quotedFileContent khaali.)
 */
import fs from 'node:fs/promises';
import { dataFile } from './paths.js';
import { google } from 'googleapis';
import { getAuthClient } from './googleAuth.js';

const MAP_FILE = dataFile('comments.json');

async function clients() {
  const auth = await getAuthClient();
  return {
    drive: google.drive({ version: 'v3', auth }),
    sheets: google.sheets({ version: 'v4', auth })
  };
}

/* ---------- date -> comment id yaad rakhna ---------- */

async function readMap() {
  try {
    return JSON.parse(await fs.readFile(MAP_FILE, 'utf8'));
  } catch {
    return {};
  }
}

async function writeMap(map) {
  await fs.mkdir(path.dirname(MAP_FILE), { recursive: true });
  await fs.writeFile(MAP_FILE, JSON.stringify(map, null, 2));
}

const key = (fileId, gid, rowIdx, colIdx) => [fileId, gid, rowIdx, colIdx].join(':');

/* ---------- anchor ---------- */

/** Cell ke liye ek naya anchor id banata hai. */
async function mintAnchorId(sheets, fileId, gid, rowIdx, colIdx) {
  const res = await sheets.spreadsheets.batchUpdate({
    spreadsheetId: fileId,
    requestBody: {
      requests: [{
        addProtectedRange: {
          protectedRange: {
            range: {
              sheetId: gid,
              startRowIndex: rowIdx,
              endRowIndex: rowIdx + 1,
              startColumnIndex: colIdx,
              endColumnIndex: colIdx + 1
            },
            description: 'comment-anchor',
            warningOnly: true   // kisi ko sach me block nahi karta
          }
        }
      }]
    }
  });
  return res.data.replies[0].addProtectedRange.protectedRange.protectedRangeId;
}

async function dropProtectedRange(sheets, fileId, id) {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: fileId,
    requestBody: { requests: [{ deleteProtectedRange: { protectedRangeId: id } }] }
  });
}

/**
 * Cell par asli comment lagata hai.
 * Usi cell ka purana comment (jo app ne banaya tha) hata deta hai,
 * taaki roz-roz duplicate na bane.
 */
export async function addCellComment({ fileId, gid, rowIdx, colIdx, text, cleanupAnchor = false }) {
  const { drive, sheets } = await clients();
  const map = await readMap();
  const k = key(fileId, gid, rowIdx, colIdx);

  // purana comment hata do
  if (map[k]?.commentId) {
    try {
      await drive.comments.delete({ fileId, commentId: map[k].commentId });
    } catch {
      // pehle se delete ho chuka hoga -- koi baat nahi
    }
  }

  // usi cell ka purana anchor phir se kaam aa jaata hai -- naya banane ki zarurat nahi
  const anchorId = map[k]?.anchorId
    ? map[k].anchorId
    : await mintAnchorId(sheets, fileId, gid, rowIdx, colIdx);

  const res = await drive.comments.create({
    fileId,
    fields: 'id,anchor',
    requestBody: {
      content: text,
      anchor: JSON.stringify({ type: 'workbook-range', uid: 0, range: String(anchorId) })
    }
  });

  if (cleanupAnchor) {
    try {
      await dropProtectedRange(sheets, fileId, anchorId);
    } catch {
      // rah gaya to bhi comment to lag hi chuka hai
    }
  }

  map[k] = { commentId: res.data.id, anchorId, at: new Date().toISOString() };
  await writeMap(map);

  return { id: res.data.id, anchored: true, anchorId };
}

export async function listComments(fileId) {
  const { drive } = await clients();
  const res = await drive.comments.list({
    fileId,
    fields: 'comments(id,content,anchor,resolved,createdTime,quotedFileContent)',
    pageSize: 100
  });
  return res.data.comments || [];
}

export async function deleteComment(fileId, commentId) {
  const { drive } = await clients();
  await drive.comments.delete({ fileId, commentId });
}

/**
 * "comment-anchor" protected ranges hata deta hai.
 *
 * SAVDHAAN: protected range hatate hi us par tika comment cell se alag ho
 * jaata hai (test kiya gaya). Isliye normal chalne me ye NAHI chalana --
 * sirf tab jab aap sab comments bhi hata rahe ho.
 */
export async function cleanupAnchors(fileId) {
  const { sheets } = await clients();
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: fileId,
    fields: 'sheets(protectedRanges(protectedRangeId,description))'
  });
  const ids = (meta.data.sheets || [])
    .flatMap((s) => s.protectedRanges || [])
    .filter((p) => p.description === 'comment-anchor')
    .map((p) => p.protectedRangeId);

  for (const id of ids) await dropProtectedRange(sheets, fileId, id);
  return ids.length;
}
