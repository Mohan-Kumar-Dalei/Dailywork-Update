import { useEffect, useState } from 'react';
import { play } from './sound.js';
import { useSheet } from './useSheet.js';
import { cx, overlay, overlayIn, overlayOut, sheet, sheetIn, sheetOut, btnGhost, btnSmall } from './ui.js';

/**
 * Warm-style calendar. Native date input ki jagah.
 * Value hamesha dd/MM/yyyy me aati-jaati hai (sheet ka format).
 */

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const pad = (n) => String(n).padStart(2, '0');
export const toKey = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

export function parseKey(text) {
  const [dd, mm, yyyy] = String(text || '').split('/').map(Number);
  if (!dd || !mm || !yyyy) return null;
  const d = new Date(yyyy, mm - 1, dd);
  return isNaN(d) ? null : d;
}

/** "21/09/2026" -> "Mon, 21 September 2026" */
export function prettyDate(text) {
  const d = parseKey(text);
  if (!d) return text || 'Pick a date';
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
  return `${wd}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default function DatePicker({ value, onChange, onClose }) {
  const selected = parseKey(value) || new Date();
  const [view, setView] = useState(new Date(selected.getFullYear(), selected.getMonth(), 1));
  const { shown, close } = useSheet(onClose);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);


  function shift(delta) {
    play('tick');
    setView((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1));
  }

  function pick(day) {
    play('done');
    onChange(toKey(new Date(view.getFullYear(), view.getMonth(), day)));
    close();
  }

  const year = view.getFullYear();
  const month = view.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const cells = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
  ];

  const isSelected = (day) =>
    selected.getDate() === day && selected.getMonth() === month && selected.getFullYear() === year;
  const isToday = (day) =>
    today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;

  return (
    <div className={cx(overlay, shown ? overlayIn : overlayOut)} onClick={close}>
      <div
        className={cx(sheet, shown ? sheetIn : sheetOut, 'w-[316px] max-w-full px-3.5 pt-3 pb-2.5')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 pb-2.5">
          <button className={cx(btnGhost, btnSmall)} onClick={() => shift(-1)}>‹</button>
          <span className="text-sm font-semibold text-ink">{MONTHS[month]} {year}</span>
          <button className={cx(btnGhost, btnSmall)} onClick={() => shift(1)}>›</button>
        </div>

        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {WEEK.map((w) => (
            <span key={w} className="text-center text-[10.5px] font-bold tracking-wide uppercase text-faint">
              {w}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, i) =>
            day === null ? (
              <span key={`e${i}`} />
            ) : (
              <button
                key={day}
                onClick={() => pick(day)}
                className={cx(
                  'h-[38px] text-[13.5px] font-medium tabular-nums rounded-[10px]',
                  'transition-[background,color,transform] duration-100 active:scale-90',
                  isSelected(day)
                    ? 'text-white bg-gradient-to-br from-brand to-brand2 shadow-[0_4px_10px_rgba(201,106,58,.3)]'
                    : cx('text-ink hover:bg-bg2', isToday(day) && 'text-brand font-bold')
                )}
              >
                {day}
                {isToday(day) && (
                  <span className={cx('block w-1 h-1 mx-auto mt-px rounded-full',
                    isSelected(day) ? 'bg-white' : 'bg-brand')} />
                )}
              </button>
            )
          )}
        </div>

        <div className="flex justify-between mt-2 pt-2 border-t border-linesoft">
          <button className={cx(btnGhost, btnSmall)} onClick={close}>Cancel</button>
          <button
            className={cx(btnGhost, btnSmall, 'text-brand font-bold')}
            onClick={() => { const n = new Date(); play('soft'); setView(new Date(n.getFullYear(), n.getMonth(), 1)); }}
          >
            Today
          </button>
        </div>
      </div>
    </div>
  );
}
