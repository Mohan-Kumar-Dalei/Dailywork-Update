/**
 * Jo bhi UI maangti hai, wo sab yahan se milta hai.
 *
 * Web app me ye Express ke routes the aur browser HTTP se baat karta tha.
 * Yahan browser `google.script.run.<function>()` se seedha bulata hai --
 * isliye har function ka naam UI ke api.js se match karna chahiye.
 */

/** Pehli call -- UI ko sab kuch ek saath mil jaata hai. */
function getConfig() {
  var s = ensureSheetTitle_(getSettings());
  s.url = sheetUrl_(s);

  return {
    today: todayStr_(),
    auth: 'script',               // Apps Script me user hamesha signed in hai
    oauthConfigured: true,
    account: whoami_(),
    settings: s,
    recipients: recipientsFrom_(s),
    canWrite: Boolean(s.sheetId),
    store: 'sheets',
    mailEnabled: true,
    totalPendingRule: TOTAL_PENDING_RULE
  };
}

/** Settings save karo aur bata do ki aaj ka cell kahan padega. */
function saveSettingsApi(patch) {
  var s = saveSettings(patch);
  s.url = sheetUrl_(s);
  return { ok: true, settings: s, target: locateTarget(todayStr_()) };
}

/** Payload se report banao -- settings aur signature ke saath. */
function makeReport_(payload) {
  payload = payload || {};
  var s = ensureSheetTitle_(getSettings());

  return buildReport_(payload, s.customFields, {
    signatureHtml: signatureHtml_(),
    subject: payload.subject,
    signature: s.personName,
    subjectPrefix: s.subjectPrefix,
    reportSheetName: s.reportSheetName || DEFAULT_REPORT_SHEET_NAME,
    rowLabels: s.rowLabels,
    mailStyle: payload.mailStyle || s.mailStyle,
    extraColumns: s.extraColumns
  });
}

/** Live preview -- kuch bheja ya likha nahi jaata. */
function previewReport(payload) {
  payload = payload || {};
  var report = makeReport_(payload);

  if (payload.withTarget === false) return report;

  report.target = locateTarget(report.data.date);
  return report;
}

/** Sirf sheet me likho, mail mat bhejo. */
function saveNoteOnly(payload) {
  var s = getSettings();
  if (!s.personName) throw new Error('Pick your name in the Sheet settings first.');

  var report = makeReport_(payload);
  var saved = saveToSheet_(s, report.data.date, report.note, report.data);

  logHistory_(s, mergeEntry_(report.data, saved.target, 'Saved'));

  return {
    ok: true,
    message: 'Saved to ' + saved.target + '.',
    saved: saved,
    data: report.data,
    note: report.note
  };
}

/** Sheet update (agar maanga ho) + mail. */
function sendReportNow(payload) {
  payload = payload || {};
  var s = getSettings();
  if (!s.personName) throw new Error('Pick your name in the Sheet settings first.');

  var report = makeReport_(payload);

  var saved = null;
  if (payload.saveNote) {
    saved = saveToSheet_(s, report.data.date, report.note, report.data);
  }

  var sent = sendReportMail_(s, report);

  logHistory_(s, mergeEntry_(report.data, saved ? saved.target : '', 'Mailed'));

  var who = sent.to.join(', ');
  return {
    ok: true,
    message: saved
      ? 'Saved to ' + saved.target + ' and mailed to ' + who + '.'
      : 'Mailed to ' + who + '.',
    saved: saved,
    sent: sent,
    data: report.data,
    subject: report.subject,
    html: report.html,
    text: report.text
  };
}

function mergeEntry_(data, cell, status) {
  var entry = {};
  for (var k in data) entry[k] = data[k];
  entry.cell = cell || '';
  entry.status = status;
  return entry;
}

/**
 * Gmail ka compose window kholne wala link.
 * Ismein sirf plain text jaata hai, table nahi (Gmail link HTML nahi leta).
 */
function composeUrl(payload) {
  var s = getSettings();
  var report = makeReport_(payload);
  var box = recipientsFrom_(s);

  var url = 'https://mail.google.com/mail/?view=cm&fs=1' +
    '&to=' + encodeURIComponent(box.to.join(',')) +
    '&su=' + encodeURIComponent(report.subject) +
    '&body=' + encodeURIComponent(report.text);

  if (box.cc.length) url += '&cc=' + encodeURIComponent(box.cc.join(','));
  return { url: url };
}
