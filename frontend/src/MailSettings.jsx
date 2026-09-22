import { useEffect, useState } from 'react';
import { api } from './api.js';
import Spinner from './Spinner.jsx';
import RecipientInput from './RecipientInput.jsx';
import {
  cx, sectionLabel, btnPrimary, btnGhost, btnSmall,
  statusOk, statusErr
} from './ui.js';

/** Mail kisko jaayega -- yehi log report paate hain. */
export default function MailSettings({ settings, onSaved }) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState([]);
  const [cc, setCc] = useState([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    setTo(settings?.mailTo || []);
    setCc(settings?.mailCc || []);
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
          {busy && <Spinner />}
          <button className={cx(btnGhost, btnSmall)} onClick={() => setOpen((o) => !o)}>
            {open ? 'Hide' : 'Change'}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-3 pt-3 border-t border-line">
          <RecipientInput label="To" note="the name appears once the address matches"
                          value={to} onChange={setTo} />

          <RecipientInput label="Cc" note="leave empty if not needed"
                          value={cc} onChange={setCc} />

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
