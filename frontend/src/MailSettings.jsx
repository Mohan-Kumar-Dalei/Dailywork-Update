import { useEffect, useState } from 'react';
import { api } from './api.js';
import Spinner from './Spinner.jsx';
import {
  cx, sectionLabel, input, btnPrimary, btnGhost, btnSmall,
  chip, chipOn, statusOk, statusErr
} from './ui.js';

/**
 * Mail kisko jaayega. Test mode on ho to ye sab dikhta hai lekin lagta nahi --
 * mail phir bhi sirf aapko jaata hai.
 */
export default function MailSettings({ settings, onSaved }) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    setTo((settings?.mailTo || []).join(', '));
    setCc((settings?.mailCc || []).join(', '));
  }, [settings]);

  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), 4000);
    return () => clearTimeout(t);
  }, [status]);

  async function save(patch) {
    setBusy(true);
    try {
      const r = await api.saveSettings(patch);
      onSaved(r.settings);
      setStatus({ err: false, msg: 'Saved.' });
      return true;
    } catch (e) {
      setStatus({ err: true, msg: e.message });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveRecipients() {
    if (await save({ mailTo: to, mailCc: cc })) setOpen(false);
  }

  const testMode = Boolean(settings?.testMode);

  return (
    <div className="mb-3.5 px-3 py-2.5 bg-bg border border-linesoft rounded-[9px]">
      <div className="flex items-center justify-between gap-2.5 max-sm:flex-col max-sm:items-stretch">
        <div className="flex items-baseline gap-2 flex-wrap min-w-0 max-sm:flex-col max-sm:gap-0.5">
          <span className={cx(sectionLabel, 'm-0')}>To</span>
          <span className="text-[13px] font-medium">
            {(settings?.mailTo || []).join(', ') || 'nobody yet'}
          </span>
          {!!(settings?.mailCc || []).length && (
            <span className="text-xs text-dim">Cc: {settings.mailCc.join(', ')}</span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            className={cx(chip, testMode && chipOn)}
            disabled={busy}
            onClick={() => save({ testMode: !testMode })}
            title="In test mode the mail goes only to you"
          >
            {busy && <Spinner />}
            Test mode {testMode ? 'on' : 'off'}
          </button>
          <button className={cx(btnGhost, btnSmall)} onClick={() => setOpen((o) => !o)}>
            {open ? 'Hide' : 'Change'}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-3 pt-3 border-t border-line">
          <label className="block mb-2.5">
            <span className={sectionLabel}>To — separate with commas</span>
            <input className={input} value={to} placeholder="boss@company.com, tl@company.com"
                   onChange={(e) => setTo(e.target.value)} />
          </label>

          <label className="block mb-2.5">
            <span className={sectionLabel}>Cc — leave empty if not needed</span>
            <input className={input} value={cc} onChange={(e) => setCc(e.target.value)} />
          </label>

          <button className={btnPrimary} disabled={busy} onClick={saveRecipients}>
            {busy && <Spinner />}
            Save recipients
          </button>
        </div>
      )}

      {status && <p className={status.err ? statusErr : statusOk}>{status.msg}</p>}
    </div>
  );
}
