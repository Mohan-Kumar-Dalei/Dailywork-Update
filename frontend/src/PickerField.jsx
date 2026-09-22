import { useState } from 'react';
import WheelPicker from './WheelPicker.jsx';
import Spinner from './Spinner.jsx';
import { play } from './sound.js';
import { cx, sectionLabel, hint, statusErr } from './ui.js';

/**
 * Dropdown-style field: click karo -> list load hoti hai -> wahi animated
 * wheel picker khulta hai jo numbers ke liye use hota hai.
 */
export default function PickerField({ label, hint: note, value, placeholder, load, onChange }) {
  const [items, setItems] = useState(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function openPicker() {
    setError(null);
    play('soft');

    if (items) { setOpen(true); return; }

    setBusy(true);
    try {
      const list = await load();
      if (!list.length) throw new Error('Nothing found in the sheet.');
      setItems(list);
      setOpen(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-3">
      <span className={sectionLabel}>
        {label}
        {note && <span className={cx(hint, 'font-normal')}> — {note}</span>}
      </span>

      <button
        onClick={openPicker}
        disabled={busy}
        className="flex items-center justify-between gap-2 w-full px-3 py-2 text-[13.5px]
                   font-medium text-left bg-white border border-line rounded-[9px]
                   transition-colors hover:border-brand disabled:opacity-60"
      >
        <span className={cx('truncate', !value && 'text-faint font-normal')}>
          {value || placeholder}
        </span>
        {busy ? <Spinner /> : <span className="shrink-0 text-[10px] text-faint">▾</span>}
      </button>

      {error && <p className={statusErr}>{error}</p>}

      {open && (
        <WheelPicker
          label={label}
          items={items}
          value={value}
          onChange={onChange}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
