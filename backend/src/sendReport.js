/**
 * Report bhejne ka ek hi rasta -- abhi bhejo ya schedule karke,
 * dono jagah yahi chalta hai, taaki behaviour ek jaisa rahe.
 *
 * Isse pehle context set hona chahiye (runAs), warna kis user ka
 * token use karna hai ye pata nahi chalega.
 */
import { buildReport } from './report.js';
import { getSettings } from './settings.js';
import { currentUser } from './context.js';
import { store } from './store/index.js';
import { sendReportMail, signatureFor } from './gmail.js';

/** Payload se report banao -- settings aur signature ke saath. */
export async function makeReport(payload) {
  const s = await getSettings();
  const email = currentUser();
  const signatureHtml = email ? await signatureFor(email) : '';

  return buildReport(payload, s.customFields, {
    signatureHtml,
    subject: payload.subject,
    signature: s.personName,
    subjectPrefix: s.subjectPrefix,
    reportSheetName: s.reportSheetName,
    mailStyle: payload.mailStyle || s.mailStyle,
    extraColumns: s.extraColumns
  });
}

/**
 * Sheet update (agar maanga ho) + mail.
 * Lautata hai: { report, saved, sent, message }
 */
export async function sendReport(payload) {
  const s = await getSettings();
  if (!s.personName) throw new Error('Pick your name in the Sheet settings first.');

  const report = await makeReport(payload);

  let saved = null;
  if (payload.saveNote) {
    saved = await store.saveNote(report.data.date, report.note, report.data);
  }

  const sent = await sendReportMail(report);

  await store.log({
    ...report.data,
    cell: saved?.target || '',
    status: 'Mailed',
    savedAt: new Date().toISOString()
  });

  return {
    report,
    saved,
    sent,
    message: 'Mail sent to ' + sent.to.join(', ') + (saved ? ' | Sheet: ' + saved.target : '')
  };
}
