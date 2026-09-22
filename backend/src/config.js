import path from 'node:path';
import dotenv from 'dotenv';
import { BACKEND_DIR } from './paths.js';

// .env backend folder me rehti hai, lekin start repo root se bhi ho sakta hai,
// isliye jagah khud batate hain. Render par values dashboard se aati hain.
dotenv.config({ path: path.join(BACKEND_DIR, '.env') });

const bool = (v, def = false) =>
  v === undefined ? def : String(v).trim().toLowerCase() === 'true';

const list = (v) =>
  String(v || '').split(',').map((s) => s.trim()).filter(Boolean);

/**
 * Render sirf hostname deta hai (abc.onrender.com), scheme nahi.
 * localhost ko http, baaki sab ko https maan lete hain.
 */
const asOrigin = (value) => {
  const v = String(value || '').trim().replace(/\/$/, '');
  if (!v || /^https?:\/\//i.test(v)) return v;
  return (v.startsWith('localhost') || v.startsWith('127.0.0.1') ? 'http://' : 'https://') + v;
};

export const config = {
  port: Number(process.env.PORT || 4000),
  // Ek se zyada origin comma se: local + Render ka URL
  clientOrigins: list(process.env.CLIENT_ORIGIN || 'http://localhost:5173').map(asOrigin),

  cookie: {
    // alag-alag domain par frontend/backend ho to 'none' + secure chahiye
    sameSite: process.env.COOKIE_SAMESITE || 'lax',
    secure: bool(process.env.COOKIE_SECURE, false),
    days: Number(process.env.SESSION_DAYS || 30)
  },

  // Abhi sirf sheet ka kaam. Mail wala hissa baad me on karenge.
  mailEnabled: bool(process.env.MAIL_ENABLED, true),

  testMode: bool(process.env.TEST_MODE, true),
  testRecipient: process.env.TEST_RECIPIENT || '',

  mailTo: list(process.env.MAIL_TO),
  mailCc: list(process.env.MAIL_CC),
  subjectPrefix: process.env.SUBJECT_PREFIX || 'Work Details of',
  reportSheetName: process.env.REPORT_SHEET_NAME || 'Sourcing_Error_Report',
  totalPendingRule: process.env.TOTAL_PENDING_RULE === 'pending' ? 'pending' : 'sum',

  // auto = login mil gaya to sheet, warna local json
  store: process.env.STORE || 'auto',

  sheet: {
    id: process.env.SHEET_ID || '',
    gid: process.env.SHEET_GID || '0',
    tab: process.env.SHEET_TAB || 'Sheet1',
    // naam ke neeche jis row me roz ka count jaata hai
    dataRowLabel: process.env.DATA_ROW_LABEL || 'Daily Achieved',
    dateHeaderRow: Number(process.env.DATE_HEADER_ROW || 1),
    // cell me number bhi likhna hai ya sirf note
    writeValue: bool(process.env.WRITE_VALUE, true),
    // cell me kaunsa count jaata hai
    valueField: process.env.VALUE_FIELD || 'sourcing',
    // note | comment | both  -- comment = asli Ctrl+Alt+M wala
    commentMode: process.env.COMMENT_MODE || 'comment',
    keyFile: process.env.GOOGLE_KEY_FILE || './service-account.json'
  },

  // History alag spreadsheet me jaati hai -- asli tracker me kuch nahi likhte.
  log: {
    id: process.env.LOG_SHEET_ID || '',
    tab: process.env.LOG_TAB || 'Demowork History'
  }
};
