import NumberPick from './NumberPick.jsx';
import { cx, btnGhost, btnSmall } from './ui.js';

/**
 * Sheet jaisa editable table.
 * - Value par click -> wahi wheel picker jo dials me hai
 * - Blank columns me seedha type karo
 * - Row add karo (naya field) ya column add karo (blank column)
 */

const cell = 'border border-line align-middle text-center p-0';
const boxed = 'block w-full px-3 py-[9px] leading-[18px] text-[13px] bg-transparent border-0';

export default function TableView({
  rows, columns, date, extra,
  onValue, onExtra, onAddRow, onAddColumn, onRemoveRow, onRemoveColumn
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[430px] border-collapse text-[13px]">
        <thead>
          <tr>
            <th className={cx(cell, 'relative w-2/5 px-3 py-[9px] text-xs font-bold text-white bg-brand whitespace-nowrap')}>
              Date
            </th>
            <th className={cx(cell, 'px-3 py-[9px] text-xs font-bold text-white bg-brand whitespace-nowrap')}>
              {date}
            </th>
            {columns.map((c) => (
              <th key={c.id}
                  className={cx(cell, 'px-3 py-[9px] text-xs font-bold text-white bg-brand whitespace-nowrap')}>
                <span>{c.label || 'Column'}</span>
                <button
                  onClick={() => onRemoveColumn(c)}
                  title="Remove column"
                  className="ml-1.5 px-1 text-[13px] leading-none opacity-45 hover:opacity-100"
                >
                  ×
                </button>
              </th>
            ))}
            <th className="w-[1%] border-0 pl-2">
              <button className={cx(btnGhost, btnSmall, 'whitespace-nowrap')} onClick={onAddColumn}>
                + Column
              </button>
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="odd:[&>td:not(:last-child)]:bg-bg">
              <td className={cx(cell, 'w-2/5 font-semibold text-left whitespace-nowrap')}>
                <span className={cx(boxed, 'text-left')}>{r.label}</span>
                {r.custom && (
                  <button
                    onClick={() => onRemoveRow(r)}
                    title="Remove row"
                    className="ml-1.5 px-1 text-[13px] leading-none opacity-45 hover:opacity-100"
                  >
                    ×
                  </button>
                )}
              </td>

              <td className={cell}>
                {r.readOnly ? (
                  <span className={cx(boxed, 'min-w-[96px] text-dim')}>{r.value}</span>
                ) : (
                  <NumberPick label={r.label} value={r.value} onChange={(v) => onValue(r, v)} />
                )}
              </td>

              {columns.map((c) => (
                <td key={c.id} className={cell}>
                  <input
                    className={cx(boxed, 'min-w-[120px] text-center outline-none focus:bg-brandsoft')}
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
