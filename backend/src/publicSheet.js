/**
 * Read-only preview — bina kisi credential ke.
 * Sheet ka CSV export padh kar batata hai ki report kis cell me jaayegi.
 * Kaam karta hai tabhi jab sheet "Anyone with the link" par ho.
 *
 * Likhne ke liye ye kaafi nahi hai — uske liye login chahiye.
 */
import { getSettings } from './settings.js';
import { locateInGrid } from './sheetLayout.js';

/** Chhota CSV parser (quoted fields aur embedded newlines handle karta hai). */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  row.push(field);
  rows.push(row);
  return rows;
}

async function fetchGrid(s) {
  if (!s.sheetId) throw new Error('No sheet selected. Add the sheet link in settings.');
  const url =
    'https://docs.google.com/spreadsheets/d/' + s.sheetId +
    '/export?format=csv&gid=' + s.gid;

  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) {
    throw new Error(
      'Could not read the sheet (' + res.status + '). Without signing in, the sheet ' +
      'must be shared as "Anyone with the link".'
    );
  }
  const text = await res.text();
  if (text.trim().startsWith('<')) {
    throw new Error('The sheet is not public - got a sign-in page instead of data.');
  }
  return parseCsv(text);
}

/** Dry run: kis cell me jaayega, abhi us cell me kya hai. */
export async function locateTarget(dateStr) {
  const s = await getSettings();
  const rows = await fetchGrid(s);
  const hit = locateInGrid(rows, {
    personName: s.personName,
    dataRowLabel: s.dataRowLabel,
    dateHeaderRow: s.dateHeaderRow,
    date: dateStr
  });
  return {
    tab: s.tab,
    cell: hit.a1,
    dateColumn: hit.label,
    personRow: hit.personRow,
    currentValue: hit.currentValue,
    readOnly: true
  };
}

/** Column A ke saare naam — settings me sahi naam chunne ke liye. */
export async function listNames() {
  const s = await getSettings();
  const rows = await fetchGrid(s);
  const skip = /^(daily achieved|additional|difference|total|target)/i;
  return rows
    .map((r) => String(r?.[0] ?? '').trim())
    .filter((n) => n && !skip.test(n));
}
