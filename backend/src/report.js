import { config } from './config.js';
import { buildHtml, buildText } from './mailBody.js';

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** dd/MM/yyyy — sheet ke header se match karne ke liye. */
export function todayStr(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function normalize(input = {}, customFields = []) {
  const d = {
    date: input.date || todayStr(),
    sourcing: num(input.sourcing),
    fixed: num(input.fixed),
    highlight: num(input.highlight),
    integration: num(input.integration),
    pending: num(input.pending),
    otherIssue: num(input.otherIssue)
  };
  // blank columns ki values: { rowId: { colId: 'text' } }
  d.extra = input.extra && typeof input.extra === 'object' ? input.extra : {};

  // extra fields -- ye hamesha Pending se UPAR jaate hain
  d.custom = customFields.map((f) => ({
    id: f.id,
    label: f.label,
    value: num(input.custom?.[f.id])
  }));

  d.totalPending =
    config.totalPendingRule === 'pending' ? d.pending : d.pending + d.otherIssue;
  return d;
}

/** Sheet ke cell par jo note/comment jaata hai. */
/** Lines ke beech ki dashed line. */
const SEP = [
  '',
  '----------------------------',
  ''
].join(String.fromCharCode(10));

export function buildNote(d) {
  const rows = [
    `Sourcing Error Report:- ${d.sourcing}`,
    `Fixed :- ${d.fixed}`,
    `Highlight to tech team :- ${d.highlight}`,
    `Integration Fixed :- ${d.integration}`,
    // extra fields yahan aate hain -- hamesha Pending se upar
    ...(d.custom || []).map((f) => `${f.label} :- ${f.value}`),
    `Pending(doubt) :- ${d.pending}`,
    `Total Pending:- ${d.totalPending}`
  ];
  return rows.join(SEP);
}


/** Subject. User ne apna likha ho to wahi, warna prefix + date. */
export function buildSubject(d, opts = {}) {
  const custom = String(opts.subject || '').trim();
  return custom || `${opts.subjectPrefix || config.subjectPrefix} (${d.date})`;
}

export function buildBody(d, opts = {}) {
  return [
    'Hi Sir,',
    '',
    'Please find below my work details for today.',
    '',
    `Date                                        : ${d.date}`,
    `Sheet Name                            : ${opts.reportSheetName || config.reportSheetName}`,
    `Total No. of Sourcing              : ${d.sourcing}`,
    `No. of Fixed                             : ${d.fixed}`,
    `No. of Integration Fixed        : ${d.integration}`,
    `No. of Highlight to Tech Team : ${d.highlight}`,
    ...(d.custom || []).map((f) => `${f.label} : ${f.value}`),
    `Pending                                   : ${d.pending}`,
    `Other Issue                             : ${d.otherIssue}`,
    '',
    'Thanks & Regards',
    '',
    config.signature
  ].join('\n');
}

export function buildReport(input, customFields = [], opts = {}) {
  const d = normalize(input, customFields);
  const style = opts.mailStyle === 'plain' ? 'plain' : 'color';

  return {
    data: d,
    note: buildNote(d),
    subject: buildSubject(d, opts),
    // mail ke do roop: HTML table, aur plain text fallback
    html: buildHtml(d, opts, style),
    text: buildText(d, opts),
    mailStyle: style
  };
}
