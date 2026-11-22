/* Sirf design dekhne ke liye -- app ka hissa nahi. */
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import TableView from './TableView.jsx';
import { card, cardTitle, btnPrimary, btnGhost, cx } from './ui.js';
import './styles.css';

const ROWS = [
  { id: 'sheetName', label: 'Sheet Name', value: 'Sourcing_Error_Report', text: true },
  { id: 'sourcing', label: 'Total No. of Sourcing', value: 120 },
  { id: 'fixed', label: 'No. of Fixed', value: 8 },
  { id: 'highlight', label: 'No. of Highlight to Tech Team', value: 24 },
  { id: 'pending', label: 'Pending', value: 3 }
];


function Sample() {
  const [rows, setRows] = useState(ROWS);
  const [extra, setExtra] = useState({});
  const columns = [{ id: 'c1', label: 'Remark' }];
  const patch = (id, c) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...c } : r)));

  return (
    <section className={cx(card, 'mb-0')}>
      <h2 className={cardTitle}>Today&apos;s numbers</h2>
      <TableView
        rows={rows} columns={columns} date="22/11/2026" extra={extra}
        onValue={(r, v) => patch(r.id, { value: v })}
        onText={(r, v) => patch(r.id, { value: v })}
        onLabel={(r, v) => patch(r.id, { label: v })}
        onExtra={(rid, cid, v) => setExtra((e) => ({ ...e, [rid]: { ...(e[rid] || {}), [cid]: v } }))}
        onAddRow={() => {}} onAddColumn={() => {}}
        onRemoveRow={() => {}} onRemoveColumn={() => {}}
      />
      <div className="flex items-center gap-2 mt-3">
        <button className={btnPrimary}>Save &amp; send</button>
        <button className={btnGhost}>Preview mail</button>
      </div>
    </section>
  );
}

createRoot(document.getElementById('root')).render(
  <div className="max-w-[1060px] mx-auto px-4 pt-6 pb-10">
    <Sample />
  </div>
);
