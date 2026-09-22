/**
 * Google Sheets store.
 *
 * Layout ke liye sheetLayout.js dekho. Chhota version:
 * naam ki row dhoondho -> uske neeche "Daily Achieved" row -> aaj ke date ka column.
 * Us cell me count jaata hai aur usi cell ke NOTE me breakdown.
 *
 * Sheet aur naam settings se aate hain (app ke andar se badalte hain), .env se nahi.
 */
import { google } from 'googleapis';
import { getSettings } from '../settings.js';
import { getAuthClient, authKind } from '../googleAuth.js';
import { locateInGrid } from '../sheetLayout.js';
import { cached, invalidate } from '../cache.js';
import { addCellComment, listComments, deleteComment } from '../driveComments.js';

/** Har baar naya client — re-login ke baad purana token pakde na rahe. */
async function api() {
  return google.sheets({ version: 'v4', auth: await getAuthClient() });
}

/**
 * Tab dhoondho: pehle naam se, phir gid se, warna pehla tab.
 * (Log aksar tab ke naam ki jagah poori file ka naam likh dete hain.)
 */
/** Spreadsheet ka meta (tabs + title) -- cache se. */
async function meta(s) {
  return cached('meta:' + s.sheetId, async () => {
    const sheets = await api();
    const res = await sheets.spreadsheets.get({
      spreadsheetId: s.sheetId,
      fields: 'properties.title,sheets.properties(title,sheetId)'
    });
    return res.data;
  });
}

async function resolveTab(s) {
  const all = (await meta(s)).sheets.map((t) => t.properties);

  const byName = all.find((t) => t.title.trim().toLowerCase() === String(s.tab).trim().toLowerCase());
  const byGid = all.find((t) => String(t.sheetId) === String(s.gid));
  const tab = byName || byGid || all[0];

  if (!tab) throw new Error('This spreadsheet has no tabs.');
  return { id: tab.sheetId, title: tab.title };
}

async function grid(s) {
  const tab = await resolveTab(s);
  return cached('grid:' + s.sheetId + ':' + tab.title, async () => {
    const sheets = await api();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: s.sheetId,
      range: tab.title,
      valueRenderOption: 'FORMATTED_VALUE'
    });
    return res.data.values || [];
  });
}

async function locate(s, dateStr) {
  return locateInGrid(await grid(s), {
    personName: s.personName,
    dataRowLabel: s.dataRowLabel,
    dateHeaderRow: s.dateHeaderRow,
    date: dateStr
  });
}

export const sheetsStore = {
  name: 'sheets',

  async health() {
    const s = await getSettings();
    if (!s.sheetId) return { ok: false, detail: 'No sheet selected yet' };
    try {
      const sheets = await api();
      const m = await meta(s);
      return {
        ok: true,
        auth: await authKind(),
        detail: 'Connected: ' + m.properties.title,
        tabs: m.sheets.map((t) => t.properties.title)
      };
    } catch (err) {
      return { ok: false, auth: await authKind(), detail: err.message };
    }
  },

  /** Kuch likhe bina: kis cell me jaayega aur abhi wahan kya hai. */
  async locate(dateStr) {
    const s = await getSettings();
    const hit = await locate(s, dateStr);
    return {
      tab: (await resolveTab(s)).title,
      cell: hit.a1,
      dateColumn: hit.label,
      personRow: hit.personRow,
      currentValue: hit.currentValue,
      readOnly: false
    };
  },

  /** Spreadsheet ki file ka naam (jo Google Sheets me upar dikhta hai). */
  async title() {
    const s = await getSettings();
    const sheets = await api();
    const meta = await sheets.spreadsheets.get({
      spreadsheetId: s.sheetId,
      fields: 'properties.title'
    });
    return meta.data.properties.title;
  },

  /** Is spreadsheet ke saare tab ke naam. */
  async tabs() {
    const s = await getSettings();
    return (await meta(s)).sheets
      .map((t) => t.properties.title)
      .filter((t) => t !== 'Report_Log');
  },

  /** Column A ke saare naam. */
  async names() {
    const s = await getSettings();
    const skip = /^(daily achieved|additional|difference|total|target)/i;
    return (await grid(s))
      .map((r) => String(r?.[0] ?? '').trim())
      .filter((n) => n && !skip.test(n));
  },

  async getByDate(dateStr) {
    try {
      const s = await getSettings();
      const hit = await locate(s, dateStr);
      return { date: dateStr, cell: hit.a1, value: hit.currentValue };
    } catch {
      return null;
    }
  },

  /** Sheet ke comments (verify karne ke liye). */
  async comments() {
    const s = await getSettings();
    return listComments(s.sheetId);
  },

  async deleteComment(id) {
    const s = await getSettings();
    return deleteComment(s.sheetId, id);
  },

  /**
   * Cell me count likhta hai, aur breakdown ko comment/note me daalta hai.
   * commentMode: 'comment' (asli Ctrl+Alt+M wala) | 'note' | 'both'
   */
  async saveNote(dateStr, note, data) {
    const s = await getSettings();
    const sheets = await api();
    const tab = await resolveTab(s);
    const hit = await locate(s, dateStr);
    const mode = s.commentMode || 'comment';

    const cellValue = {};
    let fields = [];
    if (mode === 'note' || mode === 'both') {
      cellValue.note = note;
      fields.push('note');
    }
    if (s.writeValue && data) {
      cellValue.userEnteredValue = { numberValue: Number(data[s.valueField] ?? 0) };
      fields.push('userEnteredValue');
    }
    fields = fields.join(',');

    if (fields) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: s.sheetId,
        requestBody: {
          requests: [{
            updateCells: {
              range: {
                sheetId: tab.id,
                startRowIndex: hit.rowIdx,
                endRowIndex: hit.rowIdx + 1,
                startColumnIndex: hit.colIdx,
                endColumnIndex: hit.colIdx + 1
              },
              rows: [{ values: [cellValue] }],
              fields
            }
          }]
        }
      });
    }

    let comment = null;
    if (mode === 'comment' || mode === 'both') {
      comment = await addCellComment({
        fileId: s.sheetId,
        gid: tab.id,
        rowIdx: hit.rowIdx,
        colIdx: hit.colIdx,
        text: note
      });
    }

    // cell badal gaya -- purana grid cache hata do
    invalidate('grid:' + s.sheetId);

    return {
      target: tab.title + '!' + hit.a1,
      previousValue: hit.currentValue,
      mode,
      comment
    };
  },

  /**
   * History ALAG spreadsheet me jaati hai (settings.logSheetId).
   * Asli tracker me kabhi kuch log nahi hota. logSheetId khali ho to
   * history bilkul save nahi hoti.
   */
  async log(entry) {
    const s = await getSettings();
    if (!s.logSheetId) return;

    const sheets = await api();
    const tab = s.logTab || 'Demowork History';

    const meta = await sheets.spreadsheets.get({
      spreadsheetId: s.logSheetId,
      fields: 'sheets.properties.title'
    });
    const exists = meta.data.sheets.some((t) => t.properties.title === tab);

    if (!exists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: s.logSheetId,
        requestBody: { requests: [{ addSheet: { properties: { title: tab } } }] }
      });
    }

    // tab pehle se ho lekin khali ho to bhi header chahiye
    let empty = !exists;
    if (exists) {
      const probe = await sheets.spreadsheets.values.get({
        spreadsheetId: s.logSheetId,
        range: `'${tab}'!A1:A1`
      });
      empty = !(probe.data.values || []).length;
    }

    if (empty) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: s.logSheetId,
        range: `'${tab}'!A1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[
            'Timestamp', 'Date', 'Name', 'Sourcing', 'Fixed', 'Integration',
            'Highlight', 'Pending', 'Other Issue', 'Total Pending', 'Cell', 'Status'
          ]]
        }
      });
    }

    invalidate('history:' + s.logSheetId);

    await sheets.spreadsheets.values.append({
      spreadsheetId: s.logSheetId,
      range: `'${tab}'!A1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          new Date().toISOString(), entry.date, s.personName, entry.sourcing,
          entry.fixed, entry.integration, entry.highlight, entry.pending,
          entry.otherIssue, entry.totalPending, entry.cell || '', entry.status
        ]]
      }
    });
  },

  async history(limit = 30) {
    const s = await getSettings();
    if (!s.logSheetId) return [];

    const tab = s.logTab || 'Demowork History';
    try {
      const res = await cached('history:' + s.logSheetId, async () => {
        const sheets = await api();
        return sheets.spreadsheets.values.get({
          spreadsheetId: s.logSheetId,
          range: `'${tab}'!A1:L`
        });
      });
      let rows = res.data.values || [];
      // pehli row header ho sakti hai (purane tabs me shayad na ho)
      if (rows.length && String(rows[0][0]).trim() === 'Timestamp') rows = rows.slice(1);
      return rows.slice(-limit).reverse().map((r) => ({
        savedAt: r[0], date: r[1], name: r[2], sourcing: r[3], fixed: r[4],
        integration: r[5], highlight: r[6], pending: r[7], otherIssue: r[8],
        totalPending: r[9], cell: r[10], status: r[11]
      }));
    } catch {
      return [];
    }
  }
};
