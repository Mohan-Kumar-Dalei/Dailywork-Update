/* Sirf design dekhne ke liye -- app ka hissa nahi. */
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import TableView from './TableView.jsx';
import { card, cardTitle } from './ui.js';
import './styles.css';

const ROWS = [
  { id: 'sheetName', label: 'Sheet Name', value: 'Sourcing_Error_Report', text: true },
  { id: 'sourcing', label: 'Total No. of Sourcing', value: 120 },
  { id: 'fixed', label: 'No. of Fixed', value: 8 },
  { id: 'integration', label: 'No. of Integration Fixed', value: 0 },
  { id: 'highlight', label: 'No. of Highlight to Tech Team', value: 24 },
  { id: 'qa_check', label: 'QA Check', value: 4, custom: true },
  { id: 'pending', label: 'Pending', value: 3 },
  { id: 'otherIssue', label: 'Other Issue', value: 1 }
];

function Demo() {
  const [rows, setRows] = useState(ROWS);
  const [extra, setExtra] = useState({});
  const [columns, setColumns] = useState([{ id: 'c1', label: 'Remark' }]);

  const patch = (id, change) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...change } : r)));

  return (
    <div className="max-w-[1060px] mx-auto px-4 pt-6 pb-10">
      <section className={card}>
        <h2 className={cardTitle}>Today&apos;s numbers</h2>
        <TableView
          rows={rows}
          columns={columns}
          date="22/11/2026"
          extra={extra}
          onValue={(r, v) => patch(r.id, { value: v })}
          onText={(r, v) => patch(r.id, { value: v })}
          onLabel={(r, v) => patch(r.id, { label: v })}
          onExtra={(rowId, colId, v) =>
            setExtra((e) => ({ ...e, [rowId]: { ...(e[rowId] || {}), [colId]: v } }))}
          onAddRow={() => {}}
          onAddColumn={() => setColumns((c) => [...c, { id: 'c' + c.length, label: 'Column' }])}
          onRemoveRow={(r) => setRows((rs) => rs.filter((x) => x.id !== r.id))}
          onRemoveColumn={(c) => setColumns((cs) => cs.filter((x) => x.id !== c.id))}
        />
      </section>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Demo />);
