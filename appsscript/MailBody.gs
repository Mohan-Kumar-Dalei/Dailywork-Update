/**
 * Mail ka body -- wahi table jo aap sheet me banate ho.
 *
 * Email clients CSS files nahi padhte, isliye har style seedha tag par
 * inline likhni padti hai. Do roop hain:
 *   color -> neela header + ek chhodkar ek grey row
 *   plain -> wahi table, bina rang ke
 */

// Ye rang "Table for work details" sheet se seedhe liye gaye hain
var BLUE_ = '#1155cc';
var STRIPE_ = '#f3f3f3';
var WHITE_ = '#ffffff';
var TEXT_ = '#222222';
var LINE_ = '#999999';

/**
 * Table ki rows -- har row ka apna id, taaki extra columns ki values
 * sahi row se judi rahein. Custom fields hamesha Pending se upar.
 */
/** Har row ka default label -- user inhe badal sakta hai. */
var DEFAULT_ROW_LABELS = {
  sheetName: 'Sheet Name',
  sourcing: 'Total No. of Sourcing',
  fixed: 'No. of Fixed',
  integration: 'No. of Integration Fixed',
  highlight: 'No. of Highlight to Tech Team',
  pending: 'Pending',
  otherIssue: 'Other Issue'
};

function mailRows_(d, opts) {
  opts = opts || {};
  var custom = opts.rowLabels || {};
  function label(id) { return custom[id] || DEFAULT_ROW_LABELS[id]; }

  var rows = [
    { id: 'sheetName', label: label('sheetName'), value: opts.reportSheetName || '' },
    { id: 'sourcing', label: label('sourcing'), value: d.sourcing },
    { id: 'fixed', label: label('fixed'), value: d.fixed },
    { id: 'integration', label: label('integration'), value: d.integration },
    { id: 'highlight', label: label('highlight'), value: d.highlight }
  ];
  (d.custom || []).forEach(function (f) {
    rows.push({ id: f.id, label: custom[f.id] || f.label, value: f.value });
  });
  rows.push({ id: 'pending', label: label('pending'), value: d.pending });
  rows.push({ id: 'otherIssue', label: label('otherIssue'), value: d.otherIssue });
  return rows;
}

/** Kisi row ke extra (blank) column ki value. */
function extraOf_(d, rowId, colId) {
  if (!d.extra || !d.extra[rowId]) return '';
  var v = d.extra[rowId][colId];
  return v == null ? '' : v;
}

function buildMailHtml_(d, opts, style) {
  opts = opts || {};
  var color = style !== 'plain';
  var rows = mailRows_(d, opts);
  var cols = opts.extraColumns || [];

  var base = 'border:1px solid ' + LINE_ + ';padding:6px 10px;' +
    'font-family:Arial,Helvetica,sans-serif;font-size:13px;color:' + TEXT_ + ';';

  var headCell = base + (color
    ? 'background:' + BLUE_ + ';color:#ffffff;font-weight:bold;text-align:center;'
    : 'font-weight:bold;text-align:center;');

  var head =
    '<td style="' + headCell + 'width:40%;">Date</td>' +
    '<td style="' + headCell + '">' + d.date + '</td>' +
    cols.map(function (c) {
      return '<td style="' + headCell + '">' + (c.label || '') + '</td>';
    }).join('');

  var body = rows.map(function (row, i) {
    var bg = color ? (i % 2 === 0 ? STRIPE_ : WHITE_) : WHITE_;
    var extras = cols.map(function (c) {
      return '<td style="' + base + 'background:' + bg + ';text-align:center;">' +
        extraOf_(d, row.id, c.id) + '</td>';
    }).join('');

    return '\n      <tr>' +
      '\n        <td style="' + base + 'background:' + bg + ';font-weight:bold;text-align:left;">' + row.label + '</td>' +
      '\n        <td style="' + base + 'background:' + bg + ';text-align:center;">' + row.value + '</td>' + extras +
      '\n      </tr>';
  }).join('');

  var sign = opts.signatureHtml
    ? '\n  <div style="margin-top:12px;">' + opts.signatureHtml + '</div>'
    : '';

  // <br> poori ek line ka gap deta hai -- isliye chhoti margins use ki hain
  return '<div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:' + TEXT_ + ';">' +
    '\n  <div>Hi Sir,</div>' +
    '\n  <div style="margin-bottom:10px;">Please find below my work details for today.</div>' +
    '\n  <table cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:570px;max-width:100%;">' +
    '\n    <tr>' + head + '</tr>' + body +
    '\n  </table>' +
    '\n  <div style="margin-top:10px;">Thanks &amp; Regards</div>' +
    '\n  <div>' + (opts.signature || '') + '</div>' + sign +
    '\n</div>';
}

/**
 * Plain-text roop -- jo mail clients HTML nahi dikha paate unke liye.
 */
function buildMailText_(d, opts) {
  opts = opts || {};
  var rows = mailRows_(d, opts);
  var cols = opts.extraColumns || [];

  var width = 4;
  rows.forEach(function (r) { width = Math.max(width, r.label.length); });

  function pad(s) {
    s = String(s);
    while (s.length < width) s += ' ';
    return s;
  }

  function line(label, value, extras) {
    var filled = extras.filter(function (e) { return e; });
    return pad(label) + ' : ' + value + (filled.length ? '   ' + extras.join('   ') : '');
  }

  var out = [
    'Hi Sir,',
    '',
    'Please find below my work details for today.',
    '',
    line('Date', d.date, cols.map(function (c) { return c.label || ''; }))
  ];

  rows.forEach(function (r) {
    out.push(line(r.label, r.value, cols.map(function (c) { return extraOf_(d, r.id, c.id); })));
  });

  out.push('', 'Thanks & Regards', '', opts.signature || '');
  return out.join('\n');
}
