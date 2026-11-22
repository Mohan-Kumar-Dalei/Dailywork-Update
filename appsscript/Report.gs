/**
 * Report ka data, cell ka note, aur subject.
 * Web app ke report.js se seedha port -- numbers aur text wahi rehne chahiye.
 */

var TOTAL_PENDING_RULE = 'sum';   // 'sum' = pending + otherIssue, 'pending' = sirf pending

function num_(v) {
  var n = Number(v);
  return isFinite(n) ? n : 0;
}

/** dd/MM/yyyy -- sheet ke header se match karne ke liye. */
function todayStr_(d) {
  d = d || new Date();
  var p = function (n) { return String(n).length < 2 ? '0' + n : String(n); };
  return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear();
}

function normalizeReport_(input, customFields) {
  input = input || {};
  customFields = customFields || [];

  var d = {
    date: input.date || todayStr_(),
    sourcing: num_(input.sourcing),
    fixed: num_(input.fixed),
    highlight: num_(input.highlight),
    integration: num_(input.integration),
    pending: num_(input.pending),
    otherIssue: num_(input.otherIssue)
  };

  // blank columns ki values: { rowId: { colId: 'text' } }
  d.extra = (input.extra && typeof input.extra === 'object') ? input.extra : {};

  // extra fields -- ye hamesha Pending se UPAR jaate hain
  d.custom = customFields.map(function (f) {
    var given = input.custom ? input.custom[f.id] : 0;
    return { id: f.id, label: f.label, value: num_(given) };
  });

  d.totalPending = TOTAL_PENDING_RULE === 'pending'
    ? d.pending
    : d.pending + d.otherIssue;

  return d;
}

/** Lines ke beech ki dashed line. */
var NOTE_SEP_ = ['', '----------------------------', ''].join(String.fromCharCode(10));

/** Sheet ke cell par jo comment jaata hai. */
function buildNote_(d) {
  var rows = [
    'Sourcing Error Report:- ' + d.sourcing,
    'Fixed :- ' + d.fixed,
    'Highlight to tech team :- ' + d.highlight,
    'Integration Fixed :- ' + d.integration
  ];
  // extra fields yahan aate hain -- hamesha Pending se upar
  (d.custom || []).forEach(function (f) {
    rows.push(f.label + ' :- ' + f.value);
  });
  rows.push('Pending(doubt) :- ' + d.pending);
  rows.push('Total Pending:- ' + d.totalPending);

  return rows.join(NOTE_SEP_);
}

/** Subject. User ne apna likha ho to wahi, warna prefix + date. */
function buildSubject_(d, opts) {
  opts = opts || {};
  var custom = String(opts.subject || '').trim();
  if (custom) return custom;
  return (opts.subjectPrefix || 'Work Details of') + ' (' + d.date + ')';
}

function buildReport_(input, customFields, opts) {
  opts = opts || {};
  var d = normalizeReport_(input, customFields);
  var style = opts.mailStyle === 'plain' ? 'plain' : 'color';

  return {
    data: d,
    note: buildNote_(d),
    subject: buildSubject_(d, opts),
    html: buildMailHtml_(d, opts, style),
    text: buildMailText_(d, opts),
    mailStyle: style
  };
}
