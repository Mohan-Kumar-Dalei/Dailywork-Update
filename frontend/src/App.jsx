import { useEffect, useState } from 'react';
import { api } from './api.js';
import SheetSettings from './SheetSettings.jsx';
import MailSettings from './MailSettings.jsx';
import MailPreview from './MailPreview.jsx';
import Login from './Login.jsx';
import NumberField from './NumberField.jsx';
import TableView from './TableView.jsx';
import Spinner from './Spinner.jsx';
import Confirm from './Confirm.jsx';
import PromptModal from './PromptModal.jsx';
import DatePicker, { prettyDate } from './DatePicker.jsx';
import ScheduleModal from './ScheduleModal.jsx';
import {
  cx, card, cardTitle, sectionLabel, input, btn, btnPrimary, btnGhost, btnSmall,
  chip, chipOn, hint, statusOk, statusErr
} from './ui.js';

// custom fields inke beech me aate hain -- Pending hamesha aakhir me
const BASE_FIELDS = [
  { key: 'sourcing', label: 'Sourcing Error Report' },
  { key: 'fixed', label: 'Fixed' },
  { key: 'highlight', label: 'Highlight to Tech Team' },
  { key: 'integration', label: 'Integration Fixed' }
];
const TAIL_FIELDS = [
  { key: 'pending', label: 'Pending (doubt)' },
  { key: 'otherIssue', label: 'Other Issue' }
];

const EMPTY = {
  sourcing: 0, fixed: 0, highlight: 0, integration: 0,
  pending: 0, otherIssue: 0, custom: {}, extra: {}
};

export default function App() {
  const [cfg, setCfg] = useState(null);
  const [form, setForm] = useState({ date: '', ...EMPTY });
  const [report, setReport] = useState(null);
  const [target, setTarget] = useState(null);
  const [history, setHistory] = useState(null);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const [ask, setAsk] = useState(null);
  const [askBusy, setAskBusy] = useState(false);
  const [adding, setAddingWhat] = useState(null);      // 'row' | 'column'
  const [addBusy, setAddBusy] = useState(false);
  const [mailStyle, setMailStyle] = useState('color');
  const [subject, setSubject] = useState(null);   // null = apne aap banta hua subject
  const [schedOpen, setSchedOpen] = useState(false);
  const [schedBusy, setSchedBusy] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [view, setView] = useState(() => localStorage.getItem('dwr_view') || 'dials');

  const authMessage = new URLSearchParams(window.location.search).get('auth');

  useEffect(() => {
    reload();
    if (authMessage) window.history.replaceState({}, '', window.location.pathname);
  }, []);

  useEffect(() => { localStorage.setItem('dwr_view', view); }, [view]);

  // comment aur mail live bante rahein -- har badlav ke thodi der baad.
  // Sign in kiye bina preview 401 hi degi, isliye tab maangte hi nahi.
  useEffect(() => {
    if (!cfg || cfg.auth === 'none') return;
    const t = setTimeout(() => {
      api.preview({ ...form, mailStyle, subject, withTarget: false })
        .then(setReport)
        .catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [form, mailStyle, subject, cfg?.auth,
      cfg?.settings?.customFields, cfg?.settings?.extraColumns]);

  // message kuch der baad apne aap chala jaaye
  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), status.err ? 8000 : 5000);
    return () => clearTimeout(t);
  }, [status]);

  async function reload() {
    try {
      const c = await api.config();
      setCfg(c);
      setForm((f) => ({ ...f, date: f.date || c.today }));
      setMailStyle(c.settings.mailStyle || 'color');
      refreshTarget(c.today);
    } catch (e) {
      setStatus({ err: true, msg: e.message });
    }
    api.history().then(setHistory).catch(() => setHistory([]));
    api.schedule().then(setJobs).catch(() => setJobs([]));
  }

  function refreshTarget(date) {
    if (!date) return;
    setTarget(null);
    api.locate(date).then(setTarget).catch((e) => setTarget({ error: e.message }));
  }

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === 'date') refreshTarget(value);
  }

  function setCustom(id, value) {
    setForm((f) => ({ ...f, custom: { ...f.custom, [id]: value } }));
  }

  function setExtra(rowId, colId, text) {
    setForm((f) => ({
      ...f,
      extra: { ...f.extra, [rowId]: { ...(f.extra?.[rowId] || {}), [colId]: text } }
    }));
  }

  async function saveTeam(patch) {
    setAddBusy(true);
    try {
      const r = await api.saveSettings(patch);
      setCfg((c) => ({ ...c, settings: r.settings }));
      setAddingWhat(null);
    } catch (e) {
      setStatus({ err: true, msg: e.message });
    } finally {
      setAddBusy(false);
    }
  }

  const addField = (label) =>
    saveTeam({ customFields: [...(cfg.settings.customFields || []), { id: label, label }] });

  const addColumn = (label) =>
    saveTeam({ extraColumns: [...(cfg.settings.extraColumns || []), { id: 'col' + Date.now(), label }] });

  function removeField(field) {
    setAsk({
      title: 'Remove this field?',
      message: 'It will disappear from the form and from the comment.',
      confirmLabel: 'Remove',
      rows: [{ label: 'Field', value: field.label }],
      action: () => saveTeam({
        customFields: (cfg.settings.customFields || []).filter((f) => f.id !== field.id)
      })
    });
  }

  function removeColumn(col) {
    setAsk({
      title: 'Remove this column?',
      message: 'Whatever you typed in it will be lost.',
      confirmLabel: 'Remove',
      rows: [{ label: 'Column', value: col.label || 'Column' }],
      action: () => saveTeam({
        extraColumns: (cfg.settings.extraColumns || []).filter((c) => c.id !== col.id)
      })
    });
  }

  async function run(fn) {
    setBusy(true);
    setStatus(null);
    try {
      const r = await fn(form);
      setReport(r);
      if (r.target) setTarget(r.target);
      if (r.message) setStatus({ err: false, msg: r.message });
      api.history().then(setHistory).catch(() => {});
    } catch (e) {
      setStatus({ err: true, msg: e.message });
    } finally {
      setBusy(false);
    }
  }

  /** Ek hi click -- sheet me value + comment, aur mail. */
  function confirmSaveAndSend() {
    const to = cfg?.recipients?.to || [];
    setAsk({
      title: 'Save and send the report?',
      message: 'The sheet gets updated and the mail goes out. It cannot be taken back.',
      confirmLabel: 'Save & send',
      rows: [
        { label: 'Sheet cell', value: target?.cell ? target.tab + '!' + target.cell : '-' },
        { label: 'Current value', value: target?.currentValue || 'empty' },
        { label: 'New value', value: form.sourcing },
        { label: 'To', value: to.join(', ') || '-' },
        { label: 'Subject', value: report?.subject || '-' }
      ],
      action: () => run((f) => api.send({ ...f, mailStyle, subject, saveNote: true }))
    });
  }

  async function schedule(whenIso) {
    setSchedBusy(true);
    try {
      await api.addSchedule({ ...form, mailStyle, subject, saveNote: true, when: whenIso });
      setJobs(await api.schedule());
      setSchedOpen(false);
      setStatus({ err: false, msg: 'Scheduled for ' + new Date(whenIso).toLocaleString() });
    } catch (e) {
      setStatus({ err: true, msg: e.message });
    } finally {
      setSchedBusy(false);
    }
  }

  function cancelJob(job) {
    setAsk({
      title: 'Cancel this scheduled mail?',
      message: 'It will not be sent.',
      confirmLabel: 'Cancel it',
      rows: [{ label: 'When', value: new Date(job.when).toLocaleString() }],
      action: async () => {
        await api.cancelSchedule(job.id);
        setJobs(await api.schedule());
      }
    });
  }

  async function openInGmail() {
    try {
      const { url } = await api.composeUrl({ ...form, mailStyle, subject });
      window.open(url, '_blank', 'noopener');
    } catch (e) {
      setStatus({ err: true, msg: e.message });
    }
  }

  function signOut() {
    setAsk({
      title: 'Sign out?',
      message: 'You will need to sign in with Google again to use the app.',
      confirmLabel: 'Sign out',
      rows: [{ label: 'Account', value: cfg?.account?.email || '-' }],
      action: async () => { await api.logout(); reload(); }
    });
  }

  if (cfg && cfg.auth === 'none') return <Login cfg={cfg} authMessage={authMessage} />;

  if (!cfg) {
    return (
      <div className="max-w-[1060px] mx-auto px-4 pt-6">
        <div className="flex flex-col items-center justify-center gap-3 min-h-[70vh] text-dim">
          <span className="text-brand"><Spinner big /></span>
          <span>{status?.err ? status.msg : 'Loading...'}</span>
        </div>
      </div>
    );
  }

  const totalPending =
    cfg.totalPendingRule === 'pending'
      ? Number(form.pending || 0)
      : Number(form.pending || 0) + Number(form.otherIssue || 0);

  const hasRecipients = Boolean(cfg.recipients?.to?.length);

  const tableRows = [
    { id: 'sheetName', label: 'Sheet Name', value: cfg.settings.reportSheetName, readOnly: true },
    { id: 'sourcing', label: 'Total No. of Sourcing', value: form.sourcing, key: 'sourcing' },
    { id: 'fixed', label: 'No. of Fixed', value: form.fixed, key: 'fixed' },
    { id: 'integration', label: 'No. of Integration Fixed', value: form.integration, key: 'integration' },
    { id: 'highlight', label: 'No. of Highlight to Tech Team', value: form.highlight, key: 'highlight' },
    ...(cfg.settings.customFields || []).map((f) => ({
      id: f.id, label: f.label, value: form.custom?.[f.id] ?? 0, custom: true
    })),
    { id: 'pending', label: 'Pending', value: form.pending, key: 'pending' },
    { id: 'otherIssue', label: 'Other Issue', value: form.otherIssue, key: 'otherIssue' }
  ];

  return (
    <div className="max-w-[1060px] mx-auto px-4 pt-5 pb-10 sm:px-[18px] sm:pt-[22px]">
      <header className="flex items-center justify-between gap-3 mb-4 max-sm:flex-col max-sm:items-stretch">
        <div>
          <h1 className="m-0 text-[19px] font-semibold tracking-[-.02em] text-ink">
            Daily Work Report
          </h1>
          <p className="mt-0.5 mb-0 text-[12.5px] text-dim">{cfg.settings.personName}</p>
        </div>

        {cfg.auth === 'oauth' && cfg.account && (
          <div className="flex items-center gap-2.5 py-1 pl-1 pr-1 bg-card border border-line rounded-full">
            {cfg.account.picture ? (
              <img src={cfg.account.picture} alt="" referrerPolicy="no-referrer"
                   className="w-[30px] h-[30px] shrink-0 rounded-full object-cover border border-line" />
            ) : (
              <span className="w-[30px] h-[30px] shrink-0 grid place-items-center rounded-full
                               text-[13px] font-bold text-white bg-gradient-to-br from-brand to-brand2">
                {(cfg.account.name || cfg.account.email || '?').charAt(0).toUpperCase()}
              </span>
            )}
            <span className="flex flex-col leading-tight min-w-0">
              {cfg.account.name && <b className="text-[12.5px] font-semibold">{cfg.account.name}</b>}
              <span className="text-[11px] text-faint truncate">{cfg.account.email}</span>
            </span>
            <button className={cx(btnGhost, btnSmall)} onClick={signOut}>Sign out</button>
          </div>
        )}
      </header>

      {!cfg.canWrite && (
        <div className="mb-3 px-3 py-2.5 text-[12.5px] bg-warnbg text-warntext
                        border border-line rounded-[9px]">
          Read-only mode — the sheet is being read, but nothing will be written to it.
        </div>
      )}

      <SheetSettings
        initial={cfg.settings}
        onSaved={(r) => {
          setCfg((c) => ({ ...c, settings: r.settings }));
          if (r.target) setTarget(r.target);
        }}
      />

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2 [&>section]:h-full">
        <section className={card}>
          <h2 className={cx(cardTitle, 'flex items-center justify-between gap-2.5')}>
            Today&apos;s numbers
            <span className="flex gap-1 p-[3px] bg-bg border border-line rounded-full">
              {[['dials', 'Dials'], ['table', 'Table']].map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setView(k)}
                  className={cx(
                    'px-3.5 py-1 text-xs rounded-full transition-colors',
                    view === k ? 'bg-brand text-white' : 'text-dim hover:text-ink'
                  )}
                >
                  {label}
                </button>
              ))}
            </span>
          </h2>

          <div className="mb-3.5">
            <span className={sectionLabel}>Date</span>
            <div className="flex gap-2 max-sm:flex-wrap">
              <button
                onClick={() => setCalOpen(true)}
                className="flex items-center justify-between gap-2 flex-1 min-w-0 px-3 py-2
                           text-[13.5px] font-medium text-left bg-white border border-line
                           rounded-[9px] transition-colors hover:border-brand max-sm:basis-full"
              >
                <span className="truncate">{prettyDate(form.date)}</span>
                <span className="shrink-0 text-[10px] text-faint">▾</span>
              </button>
              <button className={cx(btnGhost, 'shrink-0')} onClick={() => set('date', cfg.today)}>
                Today
              </button>
            </div>
          </div>

          {view === 'dials' && (
            <div className="grid grid-cols-3 gap-2.5 max-[620px]:grid-cols-2 max-[430px]:grid-cols-1">
              {BASE_FIELDS.map((f) => (
                <NumberField key={f.key} label={f.label} value={form[f.key]}
                             onChange={(v) => set(f.key, v)} />
              ))}

              {(cfg.settings.customFields || []).map((f) => (
                <NumberField key={f.id} label={f.label} value={form.custom?.[f.id] ?? 0}
                             onChange={(v) => setCustom(f.id, v)}
                             onRemove={() => removeField(f)} />
              ))}

              {TAIL_FIELDS.map((f) => (
                <NumberField key={f.key} label={f.label} value={form[f.key]}
                             onChange={(v) => set(f.key, v)} />
              ))}

              <button
                onClick={() => setAddingWhat('row')}
                className="flex flex-col items-center justify-center min-h-[150px] text-faint
                           bg-transparent border border-dashed border-line rounded-[14px]
                           cursor-pointer transition-colors hover:text-brand hover:border-brand
                           hover:bg-brandsoft"
              >
                <span className="text-[26px] font-light leading-none">+</span>
                <span className="mt-1.5 text-[11.5px] font-medium">Add field</span>
              </button>
            </div>
          )}

          {view === 'table' && (
            <TableView
              date={form.date}
              extra={form.extra}
              columns={cfg.settings.extraColumns || []}
              rows={tableRows}
              onValue={(row, v) => (row.custom ? setCustom(row.id, v) : set(row.key, v))}
              onExtra={setExtra}
              onAddRow={() => setAddingWhat('row')}
              onAddColumn={() => setAddingWhat('column')}
              onRemoveRow={(row) => removeField({ id: row.id, label: row.label })}
              onRemoveColumn={removeColumn}
            />
          )}

          <div className="flex items-center justify-between gap-2.5 mt-3.5">
            <span className={cx(sectionLabel, 'm-0')}>
              Total Pending
              <span className={cx(hint, 'font-normal')}>
                {' '}({cfg.totalPendingRule === 'pending' ? 'pending only' : 'pending + other issue'})
              </span>
            </span>
            <span className="px-2.5 py-0.5 font-mono text-[13px] font-bold text-brand
                             bg-brandsoft border border-[#f0cdb4] rounded-md">
              {totalPending}
            </span>
          </div>

          {status && <p className={status.err ? statusErr : statusOk}>{status.msg}</p>}
        </section>

        <section className={card}>
          <h2 className={cardTitle}>Target cell</h2>

          {!target && (
            <p className="flex items-center gap-2 text-[12.5px] text-faint">
              <span className="text-brand"><Spinner /></span> Reading the sheet...
            </p>
          )}
          {target?.error && <p className={statusErr}>{target.error}</p>}
          {target && !target.error && (
            <table className="w-full text-[13px]">
              <tbody>
                {[
                  ['Tab', target.tab],
                  ['Cell', <span key="c" className="px-2.5 py-0.5 font-mono text-[12.5px] font-bold
                                                    text-brand bg-brandsoft border border-[#f0cdb4]
                                                    rounded-md">{target.cell}</span>],
                  ['Date column', target.dateColumn],
                  ['Name row', target.personRow],
                  ['Current value', target.currentValue === '' ? 'empty' : target.currentValue]
                ].map(([k, v]) => (
                  <tr key={k} className="border-b border-linesoft last:border-0">
                    <th className="py-2 pr-3 text-left font-medium text-dim whitespace-nowrap">{k}</th>
                    <td className="py-2 text-right font-semibold tabular-nums">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h3 className="mt-4 mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold
                         tracking-[.07em] uppercase text-faint">
            Cell comment
            <span className="w-1.5 h-1.5 rounded-full bg-[#6a8f4f] animate-pulse" />
          </h3>
          {report ? (
            <pre className="m-0 p-3 font-mono text-[11.5px] leading-relaxed text-dim
                            whitespace-pre-wrap bg-bg border border-linesoft rounded-[9px]">
              {report.note}
            </pre>
          ) : (
            <p className={hint}>Building...</p>
          )}
        </section>
      </div>

      <section className={card}>
        <h2 className={cardTitle}>Mail</h2>

        <MailSettings
          settings={cfg.settings}
          onSaved={(next) => {
            setCfg((c) => ({ ...c, settings: next }));
            api.config().then(setCfg).catch(() => {});
          }}
        />

        <div className="flex items-end justify-between gap-2.5 mb-2.5 max-sm:flex-col max-sm:items-stretch">
          <label className="flex-1 min-w-0">
            <span className={cx(sectionLabel, 'flex items-center gap-2')}>
              Subject
              {subject !== null && (
                <button className="text-[11px] font-normal text-brand hover:underline"
                        onClick={() => setSubject(null)}>
                  reset to auto
                </button>
              )}
            </span>
            <input
              className={input}
              value={subject ?? report?.subject ?? ''}
              onChange={(e) => setSubject(e.target.value)}
            />
          </label>

          <span className="flex gap-1.5 shrink-0 pb-0.5">
            {[['color', 'Colored'], ['plain', 'Plain']].map(([k, label]) => (
              <button key={k} className={cx(chip, mailStyle === k && chipOn)}
                      onClick={() => setMailStyle(k)}>
                {label}
              </button>
            ))}
          </span>
        </div>

        {report?.html ? (
          <MailPreview html={report.html} />
        ) : (
          <p className="flex items-center gap-2 text-[12.5px] text-faint">
            <span className="text-brand"><Spinner /></span> Building the mail...
          </p>
        )}

        {!hasRecipients && (
          <p className={cx(hint, 'mt-3')}>
            No recipients yet — add them under <b>To</b> above before sending.
          </p>
        )}

        <div className="flex flex-wrap gap-2 mt-3.5 [&>button]:max-sm:basis-full">
          <button
            className={btnPrimary}
            disabled={busy || !report || !cfg.canWrite || !hasRecipients}
            onClick={confirmSaveAndSend}
          >
            {busy && <Spinner />}
            {busy ? 'Working...' : 'Save & send'}
          </button>
          <button
            className={btn}
            disabled={busy || !report || !cfg.canWrite || !hasRecipients}
            onClick={() => setSchedOpen(true)}
          >
            Schedule
          </button>
          <button className={btn} disabled={busy || !report} onClick={openInGmail}>
            Open in Gmail
          </button>
          <button className={btnGhost} disabled={busy}
                  onClick={() => { setForm({ date: cfg.today, ...EMPTY }); setSubject(null); }}>
            Reset
          </button>
        </div>
      </section>

      {!!jobs.filter((j) => j.status === 'pending').length && (
        <section className={card}>
          <h2 className={cardTitle}>Scheduled</h2>
          <ul className="m-0 p-0 list-none">
            {jobs.filter((j) => j.status === 'pending').map((j) => (
              <li key={j.id}
                  className="flex items-center justify-between gap-2.5 py-2 text-[13px]
                             border-b border-linesoft last:border-0">
                <span>
                  <b>{new Date(j.when).toLocaleString()}</b>
                  <span className={cx(hint, 'ml-2')}>
                    {j.payload?.date} · sourcing {j.payload?.sourcing ?? 0}
                  </span>
                </span>
                <button className={cx(btnGhost, btnSmall)} onClick={() => cancelJob(j)}>
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={card}>
        <h2 className={cx(cardTitle, 'flex items-center justify-between gap-2.5')}>
          History
          {!!history?.length && (
            <span className={cx(hint, 'normal-case tracking-normal')}>
              last {Math.min(history.length, 30)} saves
            </span>
          )}
        </h2>

        {history === null && (
          <p className="flex items-center gap-2 text-[12.5px] text-faint">
            <span className="text-brand"><Spinner /></span> Loading history...
          </p>
        )}
        {history !== null && !history.length && <p className={hint}>Nothing saved yet.</p>}

        {!!history?.length && (
          <div className="max-h-[188px] overflow-y-auto -mx-1 px-1">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  {['Date', 'Src', 'Fixed', 'Int', 'Highlight', 'Pend', 'Cell'].map((h) => (
                    <th key={h} className="sticky top-0 z-[1] px-2 py-1.5 text-left text-[10.5px]
                                           font-bold tracking-wide uppercase text-faint bg-card
                                           border-b border-linesoft">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={h.date + '-' + i} className="border-b border-linesoft last:border-0">
                    <td className="px-2 py-1.5 tabular-nums">{h.date}</td>
                    <td className="px-2 py-1.5 tabular-nums">{h.sourcing}</td>
                    <td className="px-2 py-1.5 tabular-nums">{h.fixed}</td>
                    <td className="px-2 py-1.5 tabular-nums">{h.integration}</td>
                    <td className="px-2 py-1.5 tabular-nums">{h.highlight}</td>
                    <td className="px-2 py-1.5 tabular-nums">{h.pending}</td>
                    <td className="px-2 py-1.5 font-mono text-[11.5px] text-dim">{h.cell || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {calOpen && (
        <DatePicker
          value={form.date}
          onChange={(v) => set('date', v)}
          onClose={() => setCalOpen(false)}
        />
      )}

      {schedOpen && (
        <ScheduleModal
          today={form.date || cfg.today}
          busy={schedBusy}
          onConfirm={schedule}
          onCancel={() => setSchedOpen(false)}
        />
      )}

      {adding && (
        <PromptModal
          title={adding === 'column' ? 'Add a column' : 'Add a field'}
          message={
            adding === 'column'
              ? 'A blank column you can type anything into.'
              : 'It will appear above Pending in the table and the comment.'
          }
          placeholder={adding === 'column' ? 'e.g. Remark' : 'e.g. Rework'}
          confirmLabel="Add"
          busy={addBusy}
          onConfirm={adding === 'column' ? addColumn : addField}
          onCancel={() => setAddingWhat(null)}
        />
      )}

      {ask && (
        <Confirm
          title={ask.title}
          message={ask.message}
          rows={ask.rows}
          confirmLabel={ask.confirmLabel}
          busy={askBusy}
          onConfirm={async () => {
            setAskBusy(true);
            try {
              await ask.action();
              setAsk(null);
            } finally {
              setAskBusy(false);
            }
          }}
          onCancel={() => setAsk(null)}
        />
      )}
    </div>
  );
}






