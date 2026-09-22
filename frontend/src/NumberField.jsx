import { useState } from 'react';
import WheelPicker from './WheelPicker.jsx';
import { play } from './sound.js';
import { cx } from './ui.js';

/**
 * Circular animated dial.
 * - ring par click -> Apple jaisa wheel picker
 * - neeche -10 / - / + / +10 buttons
 */

const R = 33;
const C = 2 * Math.PI * R;
const MAX = 100;

const stepBtn =
  'w-[30px] py-1 text-[13px] font-semibold text-dim bg-white border border-line rounded-md ' +
  'cursor-pointer transition-[background,color,border-color,transform] duration-100 ' +
  'hover:bg-brandsoft hover:border-brand hover:text-brand active:translate-y-px active:scale-95';

export default function NumberField({ label, value, onChange, onRemove }) {
  const [open, setOpen] = useState(false);
  const n = Math.min(MAX, Math.max(0, Number(value) || 0));
  const offset = C - (n / MAX) * C;

  function bump(delta) {
    play(Math.abs(delta) === 1 ? 'tick' : 'soft');
    onChange(String(Math.min(MAX, Math.max(0, n + delta))));
  }

  return (
    <div className="group relative flex flex-col items-center px-1.5 pt-3 pb-2.5 bg-bg
                    border border-linesoft rounded-[14px] transition-colors
                    hover:border-brand hover:bg-brandsoft">
      {onRemove && (
        <button
          onClick={onRemove}
          title="Remove this field"
          className="absolute top-1.5 right-1.5 w-5 h-5 text-sm leading-none text-faint
                     opacity-0 transition-opacity group-hover:opacity-100 hover:text-errtext"
        >
          ×
        </button>
      )}

      <button
        className="relative w-[76px] h-[76px] rounded-full cursor-pointer
                   transition-transform hover:scale-105 active:scale-95"
        onClick={() => { play('soft'); setOpen(true); }}
        title="Pick a number"
      >
        <svg width="76" height="76" viewBox="0 0 76 76" className="-rotate-90 block">
          <circle cx="38" cy="38" r={R} strokeWidth="6" fill="none"
                  className="stroke-line" strokeLinecap="round" />
          <circle
            cx="38" cy="38" r={R} strokeWidth="6" fill="none" strokeLinecap="round"
            className="stroke-brand transition-[stroke-dashoffset] duration-500
                       [transition-timing-function:cubic-bezier(.34,1.4,.5,1)]"
            strokeDasharray={C}
            strokeDashoffset={offset}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-[21px] font-bold
                         tabular-nums text-ink pointer-events-none">
          {n}
        </span>
      </button>

      <span className="mt-1.5 mb-2 text-[11.5px] font-medium leading-tight text-center text-dim">
        {label}
      </span>

      <div className="flex gap-1">
        <button className={cx(stepBtn, 'w-9 text-[10.5px]')} onClick={() => bump(-10)}>−10</button>
        <button className={stepBtn} onClick={() => bump(-1)}>−</button>
        <button className={stepBtn} onClick={() => bump(1)}>+</button>
        <button className={cx(stepBtn, 'w-9 text-[10.5px]')} onClick={() => bump(10)}>+10</button>
      </div>

      {open && (
        <WheelPicker
          label={label}
          value={n}
          max={MAX}
          onChange={onChange}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
