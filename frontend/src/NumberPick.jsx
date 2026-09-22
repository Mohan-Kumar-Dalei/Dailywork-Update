import { useState } from 'react';
import WheelPicker from './WheelPicker.jsx';
import { play } from './sound.js';

/** Table ke andar ka number cell -- click karo to wheel picker khulta hai. */
export default function NumberPick({ label, value, onChange }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="block w-full min-w-[96px] px-3 py-[9px] text-center text-sm font-bold
                   leading-[18px] tabular-nums text-ink cursor-pointer transition-colors
                   hover:bg-brandsoft"
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
