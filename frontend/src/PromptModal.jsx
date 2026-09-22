import { useEffect, useState } from 'react';
import { play } from './sound.js';
import { useSheet } from './useSheet.js';
import Spinner from './Spinner.jsx';
import { cx, overlay, overlayIn, overlayOut, sheet, sheetIn, sheetOut, btn, btnPrimary, input } from './ui.js';

/** Ek chhoti si text input wali modal (naya field ya column add karne ke liye). */
export default function PromptModal({
  title, message, placeholder = '',
  confirmLabel = 'Add', busy = false, onConfirm, onCancel
}) {

  const { shown, close } = useSheet(onCancel);
  const [text, setText] = useState('');

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Enter' && text.trim()) go();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [text]);


  function go() {
    play('done');
    onConfirm(text.trim());
  }

  return (
    <div className={cx(overlay, shown ? overlayIn : overlayOut)} onClick={close}>
      <div
        className={cx(sheet, shown ? sheetIn : sheetOut, 'w-[330px] max-w-full p-5 pb-4')}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="m-0 mb-1.5 text-base font-semibold tracking-[-.01em] text-ink">{title}</h3>
        {message && <p className="m-0 mb-3.5 text-[13px] text-dim">{message}</p>}

        <input
          autoFocus
          className={cx(input, 'mb-4')}
          value={text}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
        />

        <div className="flex gap-2">
          <button className={cx(btn, 'flex-1 py-2.5')} onClick={close} disabled={busy}>Cancel</button>
          <button
            className={cx(btnPrimary, 'flex-1 py-2.5')}
            onClick={go}
            disabled={busy || !text.trim()}
          >
            {busy && <Spinner />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
