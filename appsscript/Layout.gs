/**
 * Tracker ka layout -- web app se hu-ba-hu wahi logic.
 *
 *   Row 1 : [blank] | Target | 1-September | 2-September | ...
 *   Row 2 : [blank] |        | Tue | Wed | Thu ...
 *   ...
 *   Row N   : Mohan Kumar Dalei        | 0    |    |    |   <- naam ki row
 *   Row N+1 : Daily Achieved           | 1200 | 70 | 70 |   <- yahan count jaata hai
 *   Row N+2 : Additional (OT)          | 0    |    |    |
 *   Row N+3 : Difference (Target-...)  | 1200 | 70 | 70 |
 */

var MONTHS_ = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/** "21/09/2026" -> "21-September" (sheet ke header jaisa). */
function headerLabel_(dateStr) {
  var parts = String(dateStr).split('/');
  return Number(parts[0]) + '-' + MONTHS_[Number(parts[1]) - 1];
}

function norm_(v) {
  return String(v == null ? '' : v).trim().toLowerCase().replace(/\s+/g, ' ');
}

function colLetter_(n) {
  var s = '';
  while (n > 0) {
    var r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/**
 * Grid (2D array) me target cell dhoondhta hai.
 * Return: { personRow, rowIdx, colIdx, a1, label, currentValue } -- 0-based.
 */
function locateInGrid_(rows, opts) {
  var personName = opts.personName;
  var dataRowLabel = opts.dataRowLabel || 'Daily Achieved';
  var dateHeaderRow = opts.dateHeaderRow || 1;
  var label = headerLabel_(opts.date);

  if (!String(personName || '').trim()) {
    throw new Error('Pick your name in the Sheet settings first.');
  }

  var personIdx = -1;
  for (var i = 0; i < rows.length; i++) {
    if (norm_(rows[i] && rows[i][0]) === norm_(personName)) { personIdx = i; break; }
  }
  if (personIdx === -1) {
    throw new Error('"' + personName + '" was not found in column A of this tab.');
  }

  // naam ke neeche 1-3 rows me "Daily Achieved" dhoondho
  var rowIdx = -1;
  for (var j = personIdx + 1; j <= personIdx + 3 && j < rows.length; j++) {
    if (norm_(rows[j] && rows[j][0]) === norm_(dataRowLabel)) { rowIdx = j; break; }
  }
  if (rowIdx === -1) {
    throw new Error('No "' + dataRowLabel + '" row was found under "' + personName + '".');
  }

  var header = rows[dateHeaderRow - 1] || [];
  var colIdx = -1;
  for (var k = 0; k < header.length; k++) {
    if (norm_(header[k]) === norm_(label)) { colIdx = k; break; }
  }

  // header me "21-September" na ho to "21/09/2026" bhi try kar lo
  if (colIdx === -1) {
    for (var m = 0; m < header.length; m++) {
      if (norm_(header[m]) === norm_(opts.date)) { colIdx = m; break; }
    }
  }
  if (colIdx === -1) {
    var seen = [];
    for (var n = 0; n < Math.min(8, header.length); n++) seen.push('"' + header[n] + '"');
    throw new Error(
      'No column for "' + label + '" in header row ' + dateHeaderRow + '. ' +
      'Found: ' + seen.join(', ') + '...'
    );
  }

  return {
    personRow: personIdx + 1,
    rowIdx: rowIdx,
    colIdx: colIdx,
    a1: colLetter_(colIdx + 1) + (rowIdx + 1),
    label: label,
    currentValue: (rows[rowIdx] && rows[rowIdx][colIdx]) || ''
  };
}
