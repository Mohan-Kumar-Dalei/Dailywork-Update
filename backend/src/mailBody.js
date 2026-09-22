/**
 * Mail ka body -- wahi table jo aap sheet me banate ho.
 *
 * Email clients CSS files nahi padhte, isliye har style seedha tag par
 * inline likhni padti hai. Do roop hain:
 *   color -> neela header + ek chhodkar ek grey row
 *   plain -> wahi table, bina rang ke
 */

// Ye rang aapki "Table for work details" sheet se seedhe liye gaye hain
const BLUE = '#1155cc';
const STRIPE = '#f3f3f3';
const WHITE = '#ffffff';
const TEXT = '#222222';
const LINE = '#999999';

/**
 * Table ki rows -- har row ka apna id, taaki extra columns ki values
 * sahi row se judi rahein. Custom fields hamesha Pending se upar.
 */
export function mailRows(d, opts = {}) {
  return [
    { id: 'sheetName', label: 'Sheet Name', value: opts.reportSheetName || '' },
    { id: 'sourcing', label: 'Total No. of Sourcing', value: d.sourcing },
    { id: 'fixed', label: 'No. of Fixed', value: d.fixed },
    { id: 'integration', label: 'No. of Integration Fixed', value: d.integration },
    { id: 'highlight', label: 'No. of Highlight to Tech Team', value: d.highlight },
    ...(d.custom || []).map((f) => ({ id: f.id, label: f.label, value: f.value })),
    { id: 'pending', label: 'Pending', value: d.pending },
    { id: 'otherIssue', label: 'Other Issue', value: d.otherIssue }
  ];
}

/** Kisi row ke extra (blank) column ki value. */
const extraOf = (d, rowId, colId) => d.extra?.[rowId]?.[colId] ?? '';

export function buildHtml(d, opts = {}, style = 'color') {
  const color = style !== 'plain';
  const rows = mailRows(d, opts);
  const cols = opts.extraColumns || [];

  const base = `border:1px solid ${LINE};padding:6px 10px;` +
    `font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${TEXT};`;

  const headCell = base +
    (color
      ? `background:${BLUE};color:#ffffff;font-weight:bold;text-align:center;`
      : 'font-weight:bold;text-align:center;');

  const head =
    `<td style="${headCell}width:40%;">Date</td><td style="${headCell}">${d.date}</td>` +
    cols.map((c) => `<td style="${headCell}">${c.label || ''}</td>`).join('');

  const body = rows
    .map((row, i) => {
      const bg = color ? (i % 2 === 0 ? STRIPE : WHITE) : WHITE;
      const extras = cols
        .map((c) => `<td style="${base}background:${bg};text-align:center;">${extraOf(d, row.id, c.id)}</td>`)
        .join('');

      return `
      <tr>
        <td style="${base}background:${bg};font-weight:bold;text-align:left;">${row.label}</td>
        <td style="${base}background:${bg};text-align:center;">${row.value}</td>${extras}
      </tr>`;
    })
    .join('');

  // <br> poori ek line ka gap deta hai -- isliye chhoti margins use ki hain
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${TEXT};">
  <div>Hi Sir,</div>
  <div style="margin-bottom:10px;">Please find below my work details for today.</div>
  <table cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:570px;max-width:100%;">
    <tr>${head}</tr>${body}
  </table>
  <div style="margin-top:10px;">Thanks &amp; Regards</div>
  <div>${opts.signature || ''}</div>${opts.signatureHtml ? `
  <div style="margin-top:12px;">${opts.signatureHtml}</div>` : ''}
</div>`;
}

/**
 * Plain-text roop -- jo mail clients HTML nahi dikha paate unke liye,
 * aur Gmail compose link ke liye bhi (wo sirf text leta hai).
 */
export function buildText(d, opts = {}) {
  const rows = mailRows(d, opts);
  const cols = opts.extraColumns || [];
  const width = Math.max(4, ...rows.map((r) => r.label.length));

  const line = (label, value, extras) =>
    `${String(label).padEnd(width)} : ${value}` +
    (extras.filter(Boolean).length ? '   ' + extras.join('   ') : '');

  return [
    'Hi Sir,',
    '',
    'Please find below my work details for today.',
    '',
    line('Date', d.date, cols.map((c) => c.label || '')),
    ...rows.map((r) => line(r.label, r.value, cols.map((c) => extraOf(d, r.id, c.id)))),
    '',
    'Thanks & Regards',
    '',
    opts.signature || ''
  ].join('\n');
}
