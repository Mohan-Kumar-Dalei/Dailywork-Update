import { useEffect, useState } from 'react';
import NumberPick from './NumberPick.jsx';
import { cx, btnGhost, btnSmall } from './ui.js';

/**
 * Sheet jaisa editable table -- yahan har cheez badli ja sakti hai.
 * - Row ka naam: seedha usi par type karo
 * - Number: click karo -> wahi wheel picker jo dials me hai
 * - Sheet Name aur blank columns: seedha type karo
 *
 * Soch ye hai ki editable hone ke bawajood ye form jaisa na dikhe. Har cell
 * saadha text lagta hai; box tabhi ubharta hai jab mouse us par ho ya usme
 * type ho raha ho. Isiliye koi input border ya background default me nahi hai.
 *
 * Add/remove ke buttons table ke bahar neeche hain -- pehle header me ek
 * patli extra column thi jo table ke kone par ajeeb si latki dikhti thi.
 *
 * Text cells blur ya Enter par save hote hain, har akshar par nahi.
 */

/** Saadha text jaisa dikhne wala input. */
const seamless =
  'block w-full bg-transparent border-0 outline-none rounded-[7px] ' +
  'transition-[background-color,box-shadow] duration-150 ' +
  'hover:bg-bg/70 focus:bg-white focus:shadow-[0_0_0_2px_var(--color-brandsoft)]';

const padCell = 'px-3 py-2 text-[13px] leading-[18px]';

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
      className={cx(seamless, padCell, align === 'left' ? 'text-left' : 'text-center', className)}
    />
  );
}

export default function TableView({
  rows, columns, date, extra,
  onValue, onText, onLabel, onExtra,
  onAddRow, onAddColumn, onRemoveRow, onRemoveColumn
}) {
  const head =
    'px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[.06em] ' +
    'text-brand whitespace-nowrap';

  return (
    <div className="overflow-hidden rounded-[12px] border border-line bg-card
                    shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[400px] border-collapse text-[13px]">
          <thead>
            <tr className="bg-brandsoft border-b border-line">
              <th className={cx(head, 'w-[46%] text-left')}>Date</th>
              <th className={cx(head, 'text-center tabular-nums')}>{date}</th>

              {columns.map((c) => (
                <th key={c.id} className={cx(head, 'group/col text-center')}>
                  <span className="inline-flex items-center gap-0.5">
                    {c.label || 'Column'}
                    <button
                      onClick={() => onRemoveColumn(c)}
                      title="Remove column"
                      className="px-1 text-[13px] leading-none opacity-0 transition-opacity
                                 group-hover/col:opacity-60 hover:!opacity-100"
                    >
                      ×
                    </button>
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.id}
                className={cx(
                  'group transition-colors hover:bg-bg/40',
                  i < rows.length - 1 && 'border-b border-linesoft'
                )}
              >
                <td className="p-0 align-middle">
                  <span className="flex items-center pl-1">
                    <TextCell
                      value={r.label}
                      align="left"
                      className="font-medium text-ink"
                      onCommit={(v) => onLabel(r, v)}
                    />
                    {r.custom && (
                      <button
                        onClick={() => onRemoveRow(r)}
                        title="Remove row"
                        className="mr-1 px-1 text-[14px] leading-none text-faint opacity-0
                                   transition-opacity group-hover:opacity-100 hover:text-ink"
                      >
                        ×
                      </button>
                    )}
                  </span>
                </td>

                <td className="p-0 align-middle border-l border-linesoft">
                  {r.text ? (
                    <TextCell
                      value={r.value}
                      placeholder="Sourcing_Error_Report"
                      className="min-w-[96px] text-dim"
                      onCommit={(v) => onText(r, v)}
                    />
                  ) : (
                    <NumberPick label={r.label} value={r.value} onChange={(v) => onValue(r, v)} />
                  )}
                </td>

                {columns.map((c) => (
                  <td key={c.id} className="p-0 align-middle border-l border-linesoft">
                    <input
                      className={cx(seamless, padCell, 'min-w-[110px] text-center')}
                      value={extra?.[r.id]?.[c.id] ?? ''}
                      onChange={(e) => onExtra(r.id, c.id, e.target.value)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-1 px-2 py-1.5 border-t border-linesoft bg-bg/40">
        <button className={cx(btnGhost, btnSmall)} onClick={onAddRow}>+ Row</button>
        <button className={cx(btnGhost, btnSmall)} onClick={onAddColumn}>+ Column</button>
      </div>
    </div>
  );
}
