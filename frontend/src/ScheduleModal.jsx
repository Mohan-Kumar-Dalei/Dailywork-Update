import { useState } from 'react';
import DatePicker, { prettyDate, parseKey } from './DatePicker.jsx';
import PickerField from './PickerField.jsx';
import Spinner from './Spinner.jsx';
import { play } from './sound.js';
import { useSheet } from './useSheet.js';
import {
  cx, overlay, overlayIn, overlayOut, sheet, sheetIn, sheetOut,
  btn, btnPrimary, sectionLabel, statusErr
} from './ui.js';

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];
const MERIDIEM = ['AM', 'PM'];

/** 12-ghante wale waqt ko 24-ghante me badlo. 12 AM = 0, 12 PM = 12. */
function to24(hour, meridiem) {
  const h = Number(hour) % 12;
  return meridiem === 'PM' ? h + 12 : h;
}

/** Mail ko kis din, kis waqt bhejna hai. */
export default function ScheduleModal({ today, busy = false, onConfirm, onCancel }) {
  const { shown, close } = useSheet(onCancel);
  const [date, setDate] = useState(today);
  const [hour, setHour] = useState('06');
  const [minute, setMinute] = useState('00');
  const [meridiem, setMeridiem] = useState('PM');
  const [calOpen, setCalOpen] = useState(false);
  const [error, setError] = useState(null);

  function go() {
    const d = parseKey(date);
    if (!d) { setError('Pick a date first.'); return; }

    const when = new Date(
      d.getFullYear(), d.getMonth(), d.getDate(),
      to24(hour, meridiem), Number(minute)
    );
    if (when.getTime() < Date.now()) { setError('That time has already passed.'); return; }

    play('done');
    onConfirm(when.toISOString());
  }

  return (
    <div className={cx(overlay, shown ? overlayIn : overlayOut)} onClick={close}>
      <div
        className={cx(sheet, shown ? sheetIn : sheetOut, 'w-[340px] max-w-full p-5 pb-4')}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="m-0 mb-1.5 text-base font-semibold text-ink">Schedule this mail</h3>
        <p className="m-0 mb-4 text-[13px] text-dim">
          The sheet is updated and the mail goes out at the time you pick.
        </p>

        <div className="mb-3">
          <span className={sectionLabel}>Day</span>
          <button
            onClick={() => setCalOpen(true)}
            className="flex items-center justify-between gap-2 w-full px-3 py-2 text-[13.5px]
                       font-medium text-left bg-white border border-line rounded-[9px]
                       transition-colors hover:border-brand"
          >
            <span className="truncate">{prettyDate(date)}</span>
            <span className="shrink-0 text-[10px] text-faint">▾</span>
          </button>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 min-w-0">
            <PickerField label="Hour" value={hour} placeholder="06"
                         load={async () => HOURS} onChange={setHour} />
          </div>
          <div className="flex-1 min-w-0">
            <PickerField label="Minute" value={minute} placeholder="00"
                         load={async () => MINUTES} onChange={setMinute} />
          </div>
          <div className="flex-1 min-w-0">
            <PickerField label="AM / PM" value={meridiem} placeholder="PM"
                         load={async () => MERIDIEM} onChange={setMeridiem} />
          </div>
        </div>



        {error && <p className={statusErr}>{error}</p>}

        <div className="flex gap-2 mt-3">
          <button className={cx(btn, 'flex-1 py-2.5')} onClick={close} disabled={busy}>Cancel</button>
          <button className={cx(btnPrimary, 'flex-1 py-2.5')} onClick={go} disabled={busy}>
            {busy && <Spinner />}
            Schedule
          </button>
        </div>

        {calOpen && (
          <DatePicker value={date} onChange={setDate} onClose={() => setCalOpen(false)} />
        )}
      </div>
    </div>
  );
}
