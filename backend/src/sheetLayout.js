/**
 * Asli tracker ka layout (demo sheet se confirm kiya):
 *
 *   Row 1 : [blank] | Target | 1-September | 2-September | ... 30-September
 *   Row 2 : [blank] |        | Tue | Wed | Thu ...  (weekday names)
 *   ...
 *   Row N   : Mohan Kumar Dalei        | 0    |    |    |     <- naam ki row
 *   Row N+1 : Daily Achieved           | 1200 | 70 | 70 | ... <- yahan count jaata hai
 *   Row N+2 : Additional (OT)          | 0    |    |    |
 *   Row N+3 : Difference (Target-...)  | 1200 | 70 | 70 | ...  (formula)
 *
 * To report ka number "Daily Achieved" row me, aaj ke date column me jaata hai,
 * aur breakdown usi cell ke note me.
 */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/** "21/09/2026" -> "21-September" (sheet ke header jaisa). */
export function headerLabel(dateStr) {
  const [dd, mm] = String(dateStr).split('/');
  return `${Number(dd)}-${MONTHS[Number(mm) - 1]}`;
}

const norm = (v) => String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

export function colLetter(n) {
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/**
 * Grid (2D array of strings) me target cell dhoondhta hai.
 * Return: { rowIdx, colIdx, a1, currentValue, personRow } — sab 0-based indexes.
 */
export function locateInGrid(rows, opts) {
  const { personName, dataRowLabel = 'Daily Achieved', dateHeaderRow = 1 } = opts;
  const label = headerLabel(opts.date);

  if (!String(personName || '').trim()) {
    throw new Error('Pick your name in the Sheet settings first.');
  }

  const personIdx = rows.findIndex((r) => norm(r?.[0]) === norm(personName));
  if (personIdx === -1) {
    throw new Error(`"${personName}" was not found in column A of this tab.`);
  }

  // Naam ke neeche 1-3 rows me "Daily Achieved" dhoondho.
  let rowIdx = -1;
  for (let i = personIdx + 1; i <= personIdx + 3 && i < rows.length; i++) {
    if (norm(rows[i]?.[0]) === norm(dataRowLabel)) { rowIdx = i; break; }
  }
  if (rowIdx === -1) {
    throw new Error(`No "${dataRowLabel}" row was found under "${personName}".`);
  }

  const header = rows[dateHeaderRow - 1] || [];
  let colIdx = header.findIndex((h) => norm(h) === norm(label));

  // Header me "21-September" na ho to "21/09/2026" ya "21" bhi try kar lo.
  if (colIdx === -1) {
    colIdx = header.findIndex((h) => norm(h) === norm(opts.date));
  }
  if (colIdx === -1) {
    throw new Error(
      `No column for "${label}" in header row ${dateHeaderRow}. ` +
      `Found: ${header.slice(0, 8).map((h) => `"${h}"`).join(', ')}...`
    );
  }

  return {
    personRow: personIdx + 1,
    rowIdx,
    colIdx,
    a1: `${colLetter(colIdx + 1)}${rowIdx + 1}`,
    label,
    currentValue: rows[rowIdx]?.[colIdx] ?? ''
  };
}
