import { useEffect, useState } from 'react';
import { play } from './sound.js';
import { useSheet } from './useSheet.js';
import Spinner from './Spinner.jsx';
import { cx, overlay, overlayIn, overlayOut, sheet, sheetIn, sheetOut, btn, btnPrimary } from './ui.js';

/**
 * window.confirm ki jagah. Wahi warm sheet style jo picker/calendar me hai.
 * rows: [{ label, value }] -- confirm karne se pehle dikhane wali details.
 */
export default function Confirm({
  title, message, rows = [],
  confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  busy = false, onConfirm, onCancel
}) {

  const { shown, close } = useSheet(onCancel);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Enter') go();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);


  function go() {
    play('done');
    onConfirm();
  }

  return (
    <div className={cx(overlay, shown ? overlayIn : overlayOut)} onClick={close}>
      <div
        className={cx(sheet, shown ? sheetIn : sheetOut, 'w-[330px] max-w-full p-5 pb-4')}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="m-0 mb-1.5 text-base font-semibold tracking-[-.01em] text-ink">{title}</h3>
        {message && <p className="m-0 mb-3.5 text-[13px] text-dim">{message}</p>}

        {!!rows.length && (
          <table className="w-full mb-4 text-[13px]">
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-b border-linesoft last:border-0">
                  <th className="py-1.5 pr-4 text-left font-medium text-dim whitespace-nowrap">
                    {r.label}
                  </th>
                  <td className="py-1.5 text-right font-semibold tabular-nums">{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="flex gap-2">
          <button className={cx(btn, 'flex-1 py-2.5')} onClick={close} disabled={busy}>
            {cancelLabel}
          </button>
          <button className={cx(btnPrimary, 'flex-1 py-2.5')} onClick={go} disabled={busy}>
            {busy && <Spinner />}
            {busy ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
