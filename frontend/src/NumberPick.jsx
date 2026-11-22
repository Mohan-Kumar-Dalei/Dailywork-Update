import { useState } from 'react';
import WheelPicker from './WheelPicker.jsx';
import { play } from './sound.js';

/** Table ke andar ka number cell -- click karo to wheel picker khulta hai. */
export default function NumberPick({ label, value, onChange }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="block w-full min-w-[96px] px-3 py-[10px] text-center text-[13px] font-semibold
                   leading-[18px] tabular-nums text-ink rounded-[7px] cursor-pointer
                   transition-colors duration-150 hover:bg-bg/70"
        onClick={() => { play('soft'); setOpen(true); }}
      >
        {Number(value) || 0}
      </button>

      {open && (
        <WheelPicker
          label={label}
          value={Number(value) || 0}
          onChange={onChange}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
