/**
 * Sheet ka saara kaam: tab dhoondhna, naam padhna, cell me value likhna,
 * comment lagana, aur history log karna.
 *
 * Web app me ye sab Sheets REST API se hota tha. Yahan SpreadsheetApp se
 * hota hai -- wahi kaam, kam code, aur koi API key nahi chahiye.
 */

function openBook_(s) {
  if (!s.sheetId) throw new Error('Pick a sheet in the Sheet settings first.');
  return SpreadsheetApp.openById(s.sheetId);
}

/** Settings me likha tab, warna pehla tab. */
function resolveTab_(s) {
  var book = openBook_(s);
  var wanted = String(s.tab || '').trim();

  if (wanted) {
    var byName = book.getSheetByName(wanted);
    if (byName) return byName;
  }

  var all = book.getSheets();
  if (!all.length) throw new Error('This spreadsheet has no tabs.');
  return all[0];
}

/** Poore tab ki values, waise hi jaise screen par dikhti hain. */
function gridOf_(sheet) {
  return sheet.getDataRange().getDisplayValues();
}

/** Aaj ka (ya diye gaye date ka) target cell. */
function locateCell_(s, dateStr) {
  var sheet = resolveTab_(s);
  var hit = locateInGrid_(gridOf_(sheet), {
    personName: s.personName,
    dataRowLabel: s.dataRowLabel,
    dateHeaderRow: s.dateHeaderRow,
    date: dateStr || todayStr_()
  });
  hit.tab = sheet.getName();
  hit.gid = sheet.getSheetId();
  return hit;
}

/** UI ke liye: aaj ka cell kahan padega. */
function locateTarget(dateStr) {
  var s = ensureSheetTitle_(getSettings());
  try {
    var hit = locateCell_(s, dateStr);
    return {
      date: dateStr || todayStr_(),
      tab: hit.tab,
      cell: hit.a1,
      dateColumn: hit.label,
      personRow: hit.personRow,
      currentValue: hit.currentValue,
      readOnly: false
    };
  } catch (e) {
    return { error: e.message };
  }
}

/** Is spreadsheet ke saare tab ke naam. */
function listTabs() {
  var s = getSettings();
  return openBook_(s).getSheets()
    .map(function (t) { return t.getName(); })
    .filter(function (t) { return t !== 'Report_Log'; });
}

/** Column A ke saare naam. */
function listNames() {
  var s = getSettings();
  var skip = /^(daily achieved|additional|difference|total|target)/i;
  var out = [];
  gridOf_(resolveTab_(s)).forEach(function (r) {
    var n = String((r && r[0]) == null ? '' : r[0]).trim();
    if (n && !skip.test(n)) out.push(n);
  });
  return out;
}

/**
 * Cell me count likhta hai aur breakdown comment me daalta hai.
 * commentMode: 'comment' (asli Ctrl+Alt+M wala) | 'note' | 'both'
 */
function saveToSheet_(s, dateStr, note, data) {
  var sheet = resolveTab_(s);
  var hit = locateCell_(s, dateStr);
  var mode = s.commentMode || 'comment';
  var cell = sheet.getRange(hit.rowIdx + 1, hit.colIdx + 1);

  if (s.writeValue && data) {
    var raw = data[s.valueField];
    cell.setValue(Number(raw == null ? 0 : raw));
  }

  if (mode === 'note' || mode === 'both') {
    cell.setNote(note);
  }

  var comment = null;
  if (mode === 'comment' || mode === 'both') {
    comment = addCellComment_(s.sheetId, hit.gid, hit.rowIdx, hit.colIdx, note);
  }

  return {
    target: hit.tab + '!' + hit.a1,
    previousValue: hit.currentValue,
    mode: mode,
    comment: comment
  };
}

/* ---------- history ---------- */

var HISTORY_HEADER_ = [
  'Timestamp', 'Date', 'Name', 'Sourcing', 'Fixed', 'Integration',
  'Highlight', 'Pending', 'Other Issue', 'Total Pending', 'Cell', 'Status'
];

/**
 * History hamesha alag sheet me jaati hai. Asli tracker me kabhi kuch
 * log nahi hota -- logSheetId khaali ho to history save hi nahi hoti.
 */
function logHistory_(s, entry) {
  if (!s.logSheetId) return;

  var book = SpreadsheetApp.openById(s.logSheetId);
  var name = s.logTab || 'Demowork History';
  var tab = book.getSheetByName(name);

  if (!tab) tab = book.insertSheet(name);
  if (tab.getLastRow() === 0) tab.appendRow(HISTORY_HEADER_);

  tab.appendRow([
    new Date().toISOString(), entry.date, s.personName, entry.sourcing,
    entry.fixed, entry.integration, entry.highlight, entry.pending,
    entry.otherIssue, entry.totalPending, entry.cell || '', entry.status
  ]);
}

function listHistory(limit) {
  limit = limit || 30;
  var s = getSettings();
  if (!s.logSheetId) return [];

  try {
    var book = SpreadsheetApp.openById(s.logSheetId);
    var tab = book.getSheetByName(s.logTab || 'Demowork History');
    if (!tab || tab.getLastRow() < 2) return [];

    var rows = tab.getRange(1, 1, tab.getLastRow(), HISTORY_HEADER_.length)
      .getDisplayValues();

    if (rows.length && String(rows[0][0]).trim() === 'Timestamp') rows = rows.slice(1);

    return rows.slice(-limit).reverse().map(function (r) {
      return {
        savedAt: r[0], date: r[1], name: r[2], sourcing: r[3], fixed: r[4],
        integration: r[5], highlight: r[6], pending: r[7], otherIssue: r[8],
        totalPending: r[9], cell: r[10], status: r[11]
      };
    });
  } catch (e) {
    return [];
  }
}

/** Sheet ke comments -- verify karne ke liye. */
function listSheetComments() {
  var s = getSettings();
  if (!s.sheetId) return [];
  return listCellComments_(s.sheetId);
}
