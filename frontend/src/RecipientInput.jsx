import { useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import Spinner from './Spinner.jsx';
import { play } from './sound.js';
import { cx, sectionLabel, hint } from './ui.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Gmail jaisa recipient box.
 *
 * Address likhte hi Google se us aadmi ka naam dhoondha jaata hai, list me
 * "Naam <mail>" dikhta hai, aur click karte hi wo chip ban jaata hai. Naam
 * isliye taaki bhejne se pehle pakka ho jaaye ki address sahi aadmi ka hai.
 *
 * Naam na mile to bhi address seedha type karke Enter dabaya ja sakta hai.
 */
export default function RecipientInput({ label, note, value = [], onChange }) {
  const [text, setText] = useState('');
  const [list, setList] = useState([]);
  const [names, setNames] = useState({});
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const [reauth, setReauth] = useState(false);
  const boxRef = useRef(null);

  /* chune hue address ke naam ek baar nikaal lo */
  useEffect(() => {
    const missing = value.filter((e) => names[e] === undefined);
    if (!missing.length) return;
    api.contactNames(missing)
      .then((r) => {
        if (r.needsReauth) setReauth(true);
        // jo na mile unhe null kar do taaki baar-baar na poochein
        const next = {};
        for (const e of missing) next[e] = r.names[e] ?? null;
        setNames((n) => ({ ...n, ...next }));
      })
      .catch(() => {});
  }, [value]);

  /* type karte waqt suggestions */
  useEffect(() => {
    const q = text.trim();
    if (q.length < 2) { setList([]); return; }

    let dead = false;
    setBusy(true);
    const t = setTimeout(() => {
      api.contacts(q)
        .then((r) => {
          if (dead) return;
          if (r.needsReauth) setReauth(true);
          setList(r.people.filter((p) => !value.includes(p.email)));
          setActive(0);
        })
        .catch(() => { if (!dead) setList([]); })
        .finally(() => { if (!dead) setBusy(false); });
    }, 250);

    return () => { dead = true; clearTimeout(t); setBusy(false); };
  }, [text, value]);

  /* bahar click karo to list band */
  useEffect(() => {
    function away(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setList([]);
    }
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, []);

  function add(email, name) {
    const clean = String(email).trim().replace(/^.*<|>.*$/g, '').trim();
    if (!EMAIL.test(clean) || value.includes(clean)) return false;
    play('soft');
    if (name) setNames((n) => ({ ...n, [clean]: name }));
    onChange([...value, clean]);
    setText('');
    setList([]);
    return true;
  }

  function remove(email) {
    play('soft');
    onChange(value.filter((e) => e !== email));
  }

  function onKey(e) {
    if (e.key === 'ArrowDown' && list.length) {
      e.preventDefault();
      setActive((i) => (i + 1) % list.length);
      return;
    }
    if (e.key === 'ArrowUp' && list.length) {
      e.preventDefault();
      setActive((i) => (i - 1 + list.length) % list.length);
      return;
    }
    if (e.key === 'Enter' || e.key === 'Tab' || e.key === ',') {
      const pick = list[active];
      if (pick && e.key !== ',') {
        e.preventDefault();
        add(pick.email, pick.name);
      } else if (text.trim()) {
        e.preventDefault();
        add(text);
      }
      return;
    }
    if (e.key === 'Backspace' && !text && value.length) {
      remove(value[value.length - 1]);
    }
  }

  return (
    <div className="mb-3" ref={boxRef}>
      <span className={sectionLabel}>
        {label}
        {note && <span className={cx(hint, 'font-normal')}> — {note}</span>}
      </span>

      <div className="relative">
        <div className="flex flex-wrap items-center gap-1.5 w-full px-2 py-1.5 bg-white
                        border border-line rounded-[9px] transition-colors
                        focus-within:border-brand focus-within:ring-[3px] focus-within:ring-brandsoft">
          {value.map((email) => (
            <span key={email} title={email}
                  className="inline-flex items-center gap-1.5 pl-2 pr-1 py-0.5 max-w-full
                             text-[12.5px] rounded-full bg-bg border border-line">
              <span className="truncate">{names[email] || email}</span>
              {names[email] && (
                <span className="text-faint text-[11px] truncate max-sm:hidden">{email}</span>
              )}
              <button type="button" onClick={() => remove(email)}
                      aria-label={`Remove ${email}`}
                      className="shrink-0 w-4 h-4 grid place-items-center rounded-full
                                 text-faint hover:text-ink hover:bg-bg2">
                ×
              </button>
            </span>
          ))}

          <input
            className="flex-1 min-w-[10rem] px-1 py-1 text-[13.5px] text-ink bg-transparent
                       outline-none placeholder:text-faint"
            value={text}
            placeholder={value.length ? 'Add another' : 'Type a name or email'}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
            onBlur={() => text.trim() && add(text)}
          />

          {busy && <Spinner />}
        </div>

        {!!list.length && (
          <ul className="absolute z-20 left-0 right-0 mt-1 py-1 max-h-60 overflow-auto
                         bg-card border border-line rounded-[10px]
                         shadow-[0_12px_30px_rgba(120,80,40,.18)]">
            {list.map((p, i) => (
              <li key={p.email}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => add(p.email, p.name)}
                  className={cx(
                    'w-full flex flex-col items-start px-3 py-1.5 text-left',
                    i === active ? 'bg-bg2' : 'bg-transparent'
                  )}
                >
                  <span className="text-[13px] text-ink">{p.name || p.email}</span>
                  {p.name && <span className="text-[11.5px] text-faint">{p.email}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {reauth && (
        <p className={cx(hint, 'mt-1.5')}>
          Sign out and sign in again to let the app show contact names.
        </p>
      )}
    </div>
  );
}
