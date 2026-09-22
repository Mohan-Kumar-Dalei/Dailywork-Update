import { useEffect, useState } from 'react';
import { api } from './api.js';
import PickerField from './PickerField.jsx';
import Spinner from './Spinner.jsx';
import { cx, card, cardTitle, sectionLabel, input, btnPrimary, btnGhost, btnSmall, hint, statusOk, statusErr } from './ui.js';

/**
 * Kaunsi sheet, kaunsa tab, kiska naam.
 * Tab aur naam dono sheet se fetch hote hain aur picker me khulte hain.
 */
export default function SheetSettings({ initial, onSaved }) {
  const [open, setOpen] = useState(!initial?.sheetId || !initial?.personName);
  const [form, setForm] = useState({
    sheet: initial?.url || initial?.sheetId || '',
    tab: initial?.tab || '',
    personName: initial?.personName || '',
    dataRowLabel: initial?.dataRowLabel || 'Daily Achieved',
    reportSheetName: initial?.reportSheetName || ''
  });
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), status.err ? 8000 : 4000);
    return () => clearTimeout(t);
  }, [status]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setBusy(true);
    setStatus(null);
    try {
      const r = await api.saveSettings(form);
      onSaved(r);
      if (r.target?.error) {
        setStatus({ err: true, msg: r.target.error });
      } else {
        setForm((f) => ({ ...f, tab: r.settings.tab }));
        setStatus({ err: false, msg: 'Saved. Today maps to ' + r.target.tab + '!' + r.target.cell });
        setOpen(false);
      }
    } catch (e) {
      setStatus({ err: true, msg: e.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={card}>
      <h2 className={cx(cardTitle, 'flex items-center justify-between gap-2.5')}>
        Sheet
        <button className={cx(btnGhost, btnSmall)} onClick={() => setOpen((o) => !o)}>
          {open ? 'Hide' : 'Change'}
        </button>
      </h2>

      {!open && (
        <div className="leading-snug">
          <div className="text-[15px] font-semibold text-ink">
            {initial?.sheetTitle || 'Untitled spreadsheet'}
          </div>
          <div className="inline-block my-1 px-2.5 py-0.5 text-xs font-semibold text-brand
                          bg-brandsoft border border-[#f0cdb4] rounded-full">
            {initial?.tab || 'no tab selected'}
          </div>
          <p className={cx(hint, 'm-0')}>
            {initial?.personName} ·{' '}
            <a className="text-brand hover:underline" href={initial?.url}
               target="_blank" rel="noreferrer">open sheet</a>
          </p>
        </div>
      )}

      {open && (
        <>
          <label className="block mb-3">
            <span className={sectionLabel}>Sheet link or ID</span>
            <input className={input} value={form.sheet}
                   placeholder="https://docs.google.com/spreadsheets/d/..."
                   onChange={(e) => set('sheet', e.target.value)} />
          </label>

          <PickerField label="Tab" hint="loaded from the sheet" value={form.tab}
                       placeholder="Choose a tab" load={api.tabs}
                       onChange={(v) => set('tab', v)} />

          <PickerField label="Your name" hint="as written in column A" value={form.personName}
                       placeholder="Choose your name" load={api.names}
                       onChange={(v) => set('personName', v)} />

          <label className="block mb-3">
            <span className={sectionLabel}>Row label that holds the daily count</span>
            <input className={input} value={form.dataRowLabel}
                   onChange={(e) => set('dataRowLabel', e.target.value)} />
          </label>

          <label className="block mb-3">
            <span className={sectionLabel}>Sheet name shown in the mail</span>
            <input className={input} value={form.reportSheetName}
                   placeholder={initial?.sheetTitle || "the sheet's own name"}
                   onChange={(e) => set('reportSheetName', e.target.value)} />
          </label>

          <button className={btnPrimary} disabled={busy} onClick={save}>
            {busy && <Spinner />}
            Save &amp; check
          </button>
        </>
      )}

      {status && <p className={status.err ? statusErr : statusOk}>{status.msg}</p>}
    </section>
  );
}

