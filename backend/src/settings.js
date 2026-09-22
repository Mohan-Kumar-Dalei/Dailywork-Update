/**
 * Settings = .env ke defaults + team settings + logged-in user ka naam.
 *
 * Team wali cheezein (sheet, tab, history sheet, custom fields) sabke liye
 * ek jaisi hain. personName har aadmi ka apna hota hai.
 */
import { config } from './config.js';
import { currentUser } from './context.js';
import { readTeam, writeTeam, readUser, writeUser } from './users.js';

const TEAM_KEYS = [
  'sheetId', 'sheetTitle', 'gid', 'tab', 'dataRowLabel', 'dateHeaderRow',
  'writeValue', 'valueField', 'commentMode', 'customFields', 'logSheetId', 'logTab',
  'mailTo', 'mailCc', 'subjectPrefix', 'reportSheetName',
  'mailStyle', 'extraColumns'
];

function defaults() {
  return {
    sheetId: config.sheet.id,
    sheetTitle: '',
    gid: config.sheet.gid,
    tab: config.sheet.tab,
    personName: '',
    dataRowLabel: config.sheet.dataRowLabel,
    dateHeaderRow: config.sheet.dateHeaderRow,
    writeValue: config.sheet.writeValue,
    valueField: config.sheet.valueField,
    commentMode: config.sheet.commentMode,
    customFields: [],
    logSheetId: config.log.id,
    logTab: config.log.tab,

    // mail
    mailTo: config.mailTo,
    mailCc: config.mailCc,
    subjectPrefix: config.subjectPrefix,
    // khaali = mail me sheet ka apna naam jaayega
    reportSheetName: '',
    mailStyle: 'color',
    extraColumns: []
  };
}

/** Sheet ka pura URL ya sirf ID -- dono chalte hain. */
export function parseSheetInput(input) {
  const text = String(input || '').trim();
  if (!text) return {};

  const idFromUrl = text.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const gidFromUrl = text.match(/[#&?]gid=(\d+)/);

  return {
    sheetId: idFromUrl ? idFromUrl[1] : text,
    ...(gidFromUrl ? { gid: gidFromUrl[1] } : {})
  };
}

export async function getSettings() {
  const team = await readTeam();
  const email = currentUser();
  const user = email ? await readUser(email) : {};

  // Purani saved file me hataye hue keys pade ho sakte hain -- sirf TEAM_KEYS lo
  const known = {};
  for (const k of TEAM_KEYS) if (team[k] !== undefined) known[k] = team[k];

  return { ...defaults(), ...known, personName: user.personName || '' };
}

export async function saveSettings(patch) {
  const email = currentUser();

  // sheet link se id/gid nikaal lo
  const fromUrl = patch.sheet ? parseSheetInput(patch.sheet) : {};
  const incoming = { ...patch, ...fromUrl };
  delete incoming.sheet;

  // personal cheez: sirf naam
  if (incoming.personName !== undefined && email) {
    await writeUser(email, { personName: String(incoming.personName).trim() });
  }

  // baaki sab team ka
  const team = await readTeam();
  const next = { ...team };
  for (const key of TEAM_KEYS) {
    if (incoming[key] !== undefined) next[key] = incoming[key];
  }

  if (next.dateHeaderRow !== undefined) next.dateHeaderRow = Number(next.dateHeaderRow) || 1;
  if (next.tab !== undefined) next.tab = String(next.tab || '').trim();

  // Nayi sheet chuni hai to purana title galat hai -- hata do, taaki
  // agli /config call use sheet se dobara padh le.
  if (next.sheetId !== team.sheetId && incoming.sheetTitle === undefined) {
    next.sheetTitle = '';
  }

  for (const key of ['mailTo', 'mailCc']) {
    if (incoming[key] !== undefined) {
      next[key] = (Array.isArray(incoming[key]) ? incoming[key] : String(incoming[key]).split(','))
        .map((e) => e.trim())
        .filter(Boolean);
    }
  }

  if (incoming.extraColumns) {
    next.extraColumns = incoming.extraColumns
      .map((c, i) => ({
        id: String(c.id || 'col' + (i + 1)).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_'),
        label: String(c.label ?? '').trim()
      }))
      .filter((c) => c.id);
  }
  if (!Array.isArray(next.extraColumns)) next.extraColumns = [];

  if (incoming.customFields) {
    next.customFields = incoming.customFields
      .map((f) => ({
        id: String(f.id || f.label || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_'),
        label: String(f.label || '').trim()
      }))
      .filter((f) => f.id && f.label);
  }

  await writeTeam(next);

  const merged = await getSettings();
  if (!merged.sheetId) throw new Error('Add the sheet link or ID first.');
  return merged;
}

export function sheetUrl(s) {
  return `https://docs.google.com/spreadsheets/d/${s.sheetId}/edit#gid=${s.gid}`;
}
