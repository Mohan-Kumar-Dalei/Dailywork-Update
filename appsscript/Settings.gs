/**
 * Settings.
 *
 * Do tarah ki hain, bilkul web app jaisi:
 *   TEAM  -- sheet, tab, history sheet, custom fields, recipients.
 *            Script Properties me, sabke liye ek jaisi.
 *   USER  -- sirf aadmi ka apna naam (sheet me uski row).
 *            User Properties me, har aadmi ka apna.
 *
 * Web app me ye data server ki disk par tha, jo har deploy par mit jaata tha.
 * Yahan Google ke paas rehta hai, isliye deploy karne par kuch nahi khota.
 */

var TEAM_KEY = 'team';
var USER_KEY = 'user';

/** Mail ki "Sheet Name" row ka default -- settings se badal sakte hain. */
var DEFAULT_REPORT_SHEET_NAME = 'Sourcing_Error_Report';

var TEAM_FIELDS = [
  'sheetId', 'sheetTitle', 'gid', 'tab', 'dataRowLabel', 'dateHeaderRow',
  'writeValue', 'valueField', 'commentMode', 'customFields',
  'logSheetId', 'logTab',
  'mailTo', 'mailCc', 'subjectPrefix', 'reportSheetName', 'rowLabels',
  'mailStyle', 'extraColumns'
];

function settingsDefaults_() {
  return {
    sheetId: '',
    sheetTitle: '',
    gid: '0',
    tab: '',
    personName: '',
    dataRowLabel: 'Daily Achieved',
    dateHeaderRow: 1,
    writeValue: true,
    valueField: 'sourcing',
    commentMode: 'comment',
    customFields: [],
    logSheetId: '',
    logTab: 'Demowork History',
    mailTo: [],
    mailCc: [],
    subjectPrefix: 'Work Details of',
    reportSheetName: DEFAULT_REPORT_SHEET_NAME,
    // sirf badle hue labels yahan rehte hain, baaki default chalte hain
    rowLabels: {},
    mailStyle: 'color',
    extraColumns: []
  };
}

function readJsonProp_(store, key) {
  var raw = store.getProperty(key);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

function readTeam_() {
  return readJsonProp_(PropertiesService.getScriptProperties(), TEAM_KEY);
}

function writeTeam_(value) {
  PropertiesService.getScriptProperties().setProperty(TEAM_KEY, JSON.stringify(value));
}

function readUser_() {
  return readJsonProp_(PropertiesService.getUserProperties(), USER_KEY);
}

function writeUser_(patch) {
  var store = PropertiesService.getUserProperties();
  var next = readJsonProp_(store, USER_KEY);
  for (var k in patch) next[k] = patch[k];
  next.updatedAt = new Date().toISOString();
  store.setProperty(USER_KEY, JSON.stringify(next));
  return next;
}

/** Defaults + team + is user ka naam. */
function getSettings() {
  var out = settingsDefaults_();
  var team = readTeam_();

  // sirf wahi keys lo jo hum jaante hain -- purani hatayi hui keys chhod do
  for (var i = 0; i < TEAM_FIELDS.length; i++) {
    var k = TEAM_FIELDS[i];
    if (team[k] !== undefined) out[k] = team[k];
  }

  out.personName = readUser_().personName || '';
  return out;
}

/** Sheet ka poora URL ya sirf ID -- dono chalte hain. */
function parseSheetInput_(input) {
  var text = String(input || '').trim();
  if (!text) return {};

  var out = {};
  var id = text.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  out.sheetId = id ? id[1] : text;

  var gid = text.match(/[#&?]gid=([0-9]+)/);
  if (gid) out.gid = gid[1];

  return out;
}

function toList_(value) {
  var arr = Array.isArray(value) ? value : String(value || '').split(',');
  var out = [];
  for (var i = 0; i < arr.length; i++) {
    var v = String(arr[i]).trim();
    if (v) out.push(v);
  }
  return out;
}

function saveSettings(patch) {
  patch = patch || {};

  var incoming = {};
  for (var k in patch) incoming[k] = patch[k];

  if (patch.sheet) {
    var fromUrl = parseSheetInput_(patch.sheet);
    for (var u in fromUrl) incoming[u] = fromUrl[u];
  }
  delete incoming.sheet;

  // personal cheez: sirf naam
  if (incoming.personName !== undefined) {
    writeUser_({ personName: String(incoming.personName).trim() });
  }

  var team = readTeam_();
  var next = {};
  for (var t in team) next[t] = team[t];

  for (var i = 0; i < TEAM_FIELDS.length; i++) {
    var f = TEAM_FIELDS[i];
    if (incoming[f] !== undefined) next[f] = incoming[f];
  }

  if (next.dateHeaderRow !== undefined) {
    next.dateHeaderRow = Number(next.dateHeaderRow) || 1;
  }
  if (next.tab !== undefined) next.tab = String(next.tab || '').trim();

  if (incoming.mailTo !== undefined) next.mailTo = toList_(incoming.mailTo);
  if (incoming.mailCc !== undefined) next.mailCc = toList_(incoming.mailCc);

  // field khaali chhoda ho to default wapas lag jaaye, blank na rahe
  if (next.reportSheetName !== undefined && !String(next.reportSheetName).trim()) {
    delete next.reportSheetName;
  }

  // nayi sheet chuni hai to purana title galat hai -- hata do
  if (next.sheetId !== team.sheetId && incoming.sheetTitle === undefined) {
    next.sheetTitle = '';
  }

  if (incoming.extraColumns) {
    next.extraColumns = normalizeIdLabel_(incoming.extraColumns, 'col');
  }
  if (incoming.customFields) {
    next.customFields = normalizeIdLabel_(incoming.customFields, 'field')
      .filter(function (f) { return f.label; });
  }

  writeTeam_(next);
  return getSettings();
}

function normalizeIdLabel_(list, prefix) {
  var out = [];
  for (var i = 0; i < list.length; i++) {
    var c = list[i] || {};
    var raw = String(c.id || c.label || (prefix + (i + 1)));
    var id = raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
    if (!id) continue;
    out.push({ id: id, label: String(c.label == null ? '' : c.label).trim() });
  }
  return out;
}

/** Sheet ka title ek baar padhkar settings me bhar do. */
function ensureSheetTitle_(s) {
  if (s.sheetTitle || !s.sheetId) return s;
  try {
    var title = SpreadsheetApp.openById(s.sheetId).getName();
    var team = readTeam_();
    team.sheetTitle = title;
    writeTeam_(team);
    s.sheetTitle = title;
  } catch (e) {
    // sheet nahi khuli to title ke bina hi chalao
  }
  return s;
}

function sheetUrl_(s) {
  if (!s.sheetId) return '';
  return 'https://docs.google.com/spreadsheets/d/' + s.sheetId + '/edit#gid=' + (s.gid || '0');
}
