import { useEffect, useState } from 'react';
import NumberPick from './NumberPick.jsx';
import { cx, btnGhost, btnSmall } from './ui.js';

/**
 * Sheet jaisa editable table -- yahan har cheez badli ja sakti hai.
 * - Row ka naam: seedha usi par type karo
 * - Number: click karo -> wahi wheel picker jo dials me hai
 * - Sheet Name aur blank columns: seedha type karo
 * - Row/column add ya remove karo
 *
 * Text cells blur ya Enter par save hote hain, har akshar par nahi --
 * warna har keystroke par ek save chala jaata.
 */

const cell = 'border border-line align-middle text-center p-0';
const boxed = 'block w-full px-3 py-[9px] leading-[18px] text-[13px] bg-transparent border-0';

const typable =
  'outline-none rounded-[5px] transition-colors duration-150 ' +
  'hover:bg-bg2/70 focus:bg-white focus:ring-2 focus:ring-brandsoft';

/** Text cell jo blur/Enter par hi commit karta hai. */
function TextCell({ value, onCommit, className, placeholder, align = 'center' }) {
  const [text, setText] = useState(value ?? '');

  useEffect(() => { setText(value ?? ''); }, [value]);

  function commit() {
    if (String(text) !== String(value ?? '')) onCommit(text);
  }

  return (
    <input
      value={text}
      placeholder={placeholder}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') { setText(value ?? ''); e.currentTarget.blur(); }
      }}
      className={cx(boxed, typable, align === 'left' ? 'text-left' : 'text-center', className)}
    />
  );
}

export default function TableView({
  rows, columns, date, extra,
  onValue, onText, onLabel, onExtra,
  onAddRow, onAddColumn, onRemoveRow, onRemoveColumn
}) {
  const head =
    'px-3 py-[9px] text-xs font-semibold tracking-[.01em] text-white whitespace-nowrap ' +
    'bg-gradient-to-b from-brand to-brand2';

  return (
    <div className="overflow-x-auto rounded-[11px] border border-line shadow-[0_1px_2px_rgba(120,85,50,.05)]">
      <table className="w-full min-w-[430px] border-collapse text-[13px]">
        <thead>
          <tr>
            <th className={cx(cell, 'relative w-2/5 border-0', head)}>Date</th>
            <th className={cx(cell, 'border-0', head)}>{date}</th>

            {columns.map((c) => (
              <th key={c.id} className={cx(cell, 'border-0 group', head)}>
                <span className="inline-flex items-center gap-1">
                  {c.label || 'Column'}
                  <button
                    onClick={() => onRemoveColumn(c)}
                    title="Remove column"
                    className="px-1 text-[13px] leading-none opacity-50 hover:opacity-100"
                  >
                    ×
                  </button>
                </span>
              </th>
            ))}

            <th className="w-[1%] border-0 bg-transparent p-0">
              <button
                onClick={onAddColumn}
                title="Add a blank column"
                className="ml-1.5 px-2 py-1 text-[12px] font-semibold text-dim
                           rounded-md hover:text-ink hover:bg-bg2"
              >
                +
              </button>
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="odd:bg-bg/60 hover:bg-bg2/50 transition-colors">
              <td className={cx(cell, 'text-left')}>
                <span className="flex items-center">
                  <TextCell
                    value={r.label}
                    align="left"
                    className="font-semibold"
                    onCommit={(v) => onLabel(r, v)}
                  />
                  {r.custom && (
                    <button
                      onClick={() => onRemoveRow(r)}
                      title="Remove row"
                      className="mr-1.5 px-1 text-[13px] leading-none opacity-45 hover:opacity-100"
                    >
                      ×
                    </button>
                  )}
                </span>
              </td>

              <td className={cell}>
                {r.text ? (
                  <TextCell
                    value={r.value}
                    placeholder="Sourcing_Error_Report"
                    className="min-w-[96px]"
                    onCommit={(v) => onText(r, v)}
                  />
                ) : (
                  <NumberPick label={r.label} value={r.value} onChange={(v) => onValue(r, v)} />
                )}
              </td>

              {columns.map((c) => (
                <td key={c.id} className={cell}>
                  <input
                    className={cx(boxed, typable, 'min-w-[120px] text-center')}
                    value={extra?.[r.id]?.[c.id] ?? ''}
                    onChange={(e) => onExtra(r.id, c.id, e.target.value)}
                  />
                </td>
              ))}

              <td className="w-[1%] border-0 bg-transparent" />
            </tr>
          ))}

          <tr>
            <td colSpan={columns.length + 3} className="border-0 bg-transparent pt-2 text-left">
              <button className={cx(btnGhost, btnSmall)} onClick={onAddRow}>+ Row</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
