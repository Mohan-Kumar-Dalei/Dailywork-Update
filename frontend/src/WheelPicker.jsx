import { useEffect, useRef, useState } from 'react';
import { play } from './sound.js';
import { useSheet } from './useSheet.js';
import { cx, overlay, overlayIn, overlayOut, sheet, sheetIn, sheetOut, btnGhost, btnSmall, input } from './ui.js';

/**
 * Apple-style wheel picker.
 * Scroll snap + har number par tick sound + scroll karte waqt dikhne wali
 * scrollbar (ruk jaane par chhup jaati hai, drag bhi kar sakte ho).
 * Uske upar-neeche do pointer -- ek click = ek kadam.
 */

const ITEM = 44;              // ek row ki height (h-11)
const VISIBLE = 7;            // ek saath kitne numbers
const HEIGHT = ITEM * VISIBLE;   // 308
const PAD = (HEIGHT - ITEM) / 2; // 132 -- upar/neeche ka khali space
const HIDE_AFTER = 1400;
const WINDOW = 40;            // current ke dono taraf kitne items banane hain

// Tailwind ko class ka naam poora likha hua chahiye, isliye ye constants
// se nahi bante -- lekin numbers wahi hain jo upar hain.
const WHEEL_H = 'h-[308px]';
const BAND = 'top-[132px] h-11';

const GROW_BY = 100;   // list khatam hone se pehle itne aur jod do

export default function WheelPicker({ label, value, max = 100, items: given, onChange, onClose }) {
  const { shown, close } = useSheet(onClose);
  const listRef = useRef(null);
  const trackRef = useRef(null);
  const hideTimer = useRef(null);
  const lastIdx = useRef(0);
  const dragging = useRef(false);

  const isText = Boolean(given) && typeof given[0] === 'string';

  /**
   * Numbers ki list ki koi upar ki seema nahi hai. Shuru me `max` tak hi
   * banti hai, aur jaise-jaise neeche scroll karo, aur numbers jud jaate
   * hain -- isliye 100 ke baad bhi kuch bhi chuna ja sakta hai. Bada
   * number ek-ek karke scroll karne ke bajaye upar wale box me type bhi
   * kiya ja sakta hai.
   */
  const [limit, setLimit] = useState(Math.max(max, Math.ceil((Number(value) || 0) + 20)));
  const all = given || Array.from({ length: limit + 1 }, (_, i) => i);

  const [query, setQuery] = useState('');
  const [typed, setTyped] = useState(String(Number(value) || 0));
  // type karte hi list scroll hoti hai, aur us scroll ka handler box ko
  // dobara likh deta tha -- "4870" ban jaata tha "140". Isliye type karne
  // ke thodi der baad tak scroll box ko haath nahi lagata.
  const typingAt = useRef(0);
  // bada number type karne par list pehle badhni chahiye, tabhi scroll
  // wahan tak pahunchega -- warna browser use list ke ant par rok deta hai
  const pendingScroll = useRef(null);
  const itemList = query
    ? all.filter((i) => String(i).toLowerCase().includes(query.toLowerCase()))
    : all;
  const last = itemList.length - 1;
  const startIdx = Math.max(0, itemList.findIndex((i) => String(i) === String(value)));

  const [current, setCurrent] = useState(startIdx);

  /**
   * Numbers lakhon tak ja sakte hain, par itne divs banana bhaari padta hai.
   * Isliye sirf current ke aas-paas ke items banate hain aur upar-neeche
   * khaali jagah chhod dete hain -- scroll ki lambai wahi rehti hai, bas
   * dikhta utna hi hai jitna chahiye. Text lists chhoti hoti hain, unme
   * ye zarurat nahi.
   */
  const windowed = !isText && itemList.length > WINDOW * 3;
  const winStart = windowed ? Math.max(0, current - WINDOW) : 0;
  const winEnd = windowed ? Math.min(last, current + WINDOW) : last;
  const shownItems = windowed ? itemList.slice(winStart, winEnd + 1) : itemList;
  const [bar, setBar] = useState({ visible: false, top: 0, height: 20 });

  useEffect(() => {
    const el = listRef.current;
    lastIdx.current = startIdx;
    if (el) {
      el.scrollTop = startIdx * ITEM;
      updateBar(false);
    }

    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Enter') commit(lastIdx.current);
    };
    const onUp = () => { dragging.current = false; };
    const onMove = (e) => { if (dragging.current) dragTo(e.clientY); };

    window.addEventListener('keydown', onKey);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMove);
      clearTimeout(hideTimer.current);
    };
  }, []);

  // list ka naya size lag jaane ke baad hi scroll karo
  useEffect(() => {
    if (pendingScroll.current == null) return;
    const idx = pendingScroll.current;
    pendingScroll.current = null;
    listRef.current?.scrollTo({ top: idx * ITEM, behavior: 'auto' });
    updateBar(false);
  }, [limit, current]);

  function onSearch(text) {
    setQuery(text);
    lastIdx.current = 0;
    setCurrent(0);
    if (listRef.current) listRef.current.scrollTop = 0;
  }

  /** Thumb TRACK ke hisaab se, list ke nahi -- warna arrow par chadh jata hai. */
  function updateBar(visible = true) {
    const el = listRef.current;
    const track = trackRef.current;
    if (!el || !track) return;

    const trackH = track.clientHeight;
    const ratio = el.clientHeight / el.scrollHeight;
    const height = Math.max(22, Math.min(trackH, trackH * ratio));
    const maxScroll = el.scrollHeight - el.clientHeight;
    const top = maxScroll > 0 ? (el.scrollTop / maxScroll) * (trackH - height) : 0;

    setBar({ visible, top, height });
  }

  function handleScroll() {
    const el = listRef.current;
    if (!el) return;

    const idx = Math.max(0, Math.min(last, Math.round(el.scrollTop / ITEM)));
    if (idx !== lastIdx.current) {
      lastIdx.current = idx;
      setCurrent(idx);
      if (!isText && Date.now() - typingAt.current > 500) setTyped(String(itemList[idx]));
      play('tick');
    }

    // ant ke paas pahunch gaye -- aur numbers jod do
    if (!isText && idx > last - 5) setLimit((l) => l + GROW_BY);

    updateBar(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (!dragging.current) setBar((b) => ({ ...b, visible: false }));
    }, HIDE_AFTER);
  }

  function dragTo(clientY) {
    const el = listRef.current;
    const track = trackRef.current;
    if (!el || !track) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    el.scrollTop = Math.round(ratio * last) * ITEM;
  }

  /** State turant badalti hai -- warna jaldi click par highlight peeche reh jata hai. */
  function step(delta) {
    if (!isText && lastIdx.current + delta > last) setLimit((l) => l + GROW_BY);

    const next = Math.max(0, Math.min(isText ? last : last + delta, lastIdx.current + delta));
    if (next === lastIdx.current) return;
    lastIdx.current = next;
    setCurrent(next);
    if (!isText) setTyped(String(next));
    play('tick');
    scrollTo(next);
  }

  /** Box me number likhne par wheel wahin chala jaata hai. */
  function onTyped(text) {
    const clean = text.replace(/[^0-9]/g, '');
    typingAt.current = Date.now();
    setTyped(clean);
    if (clean === '') return;

    const n = Number(clean);
    if (!Number.isFinite(n)) return;

    if (n > limit) setLimit(n + GROW_BY);
    lastIdx.current = n;
    setCurrent(n);
    pendingScroll.current = n;       // scroll agle render ke baad
  }

  function scrollTo(idx) {
    listRef.current?.scrollTo({ top: idx * ITEM, behavior: 'smooth' });
  }


  function commit(idx) {
    play('done');

    if (!isText) {
      // box khaali chhod diya ho to wheel par jo hai wahi lo
      const n = typed === '' ? itemList[idx] : Number(typed);
      onChange(String(Number.isFinite(n) ? n : 0));
    } else {
      onChange(String(itemList[idx]));
    }

    close();
  }

  const railBtn =
    'w-[26px] h-[26px] shrink-0 grid place-items-center text-[9px] text-brand bg-card ' +
    'border border-line rounded-lg cursor-pointer transition-colors hover:bg-brandsoft ' +
    'hover:border-brand active:scale-90';

  return (
    <div className={cx(overlay, shown ? overlayIn : overlayOut)} onClick={close}>
      <div
        className={cx(sheet, shown ? sheetIn : sheetOut, 'max-w-full px-3.5 pt-3 pb-2.5',
          isText ? 'w-[380px]' : 'w-[330px]')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 pb-2.5">
          <button className={cx(btnGhost, btnSmall)} onClick={close}>Cancel</button>
          <span className="text-[12.5px] font-semibold text-dim text-center">{label}</span>
          <button
            className={cx(btnGhost, btnSmall, 'text-brand font-bold')}
            disabled={!itemList.length}
            onClick={() => commit(current)}
          >
            Done
          </button>
        </div>

        {isText && (
          <div className="relative mb-2">
            <input
              type="text"
              autoFocus
              className={cx(input, 'bg-bg pr-8')}
              value={query}
              placeholder="Search..."
              onChange={(e) => onSearch(e.target.value)}
            />
            {query && (
              <button
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[15px]
                           leading-none text-faint hover:text-brand"
                onClick={() => onSearch('')}
              >
                ×
              </button>
            )}
          </div>
        )}

        {!isText && (
          <input
            type="text"
            inputMode="numeric"
            autoFocus
            className={cx(input, 'mb-2 bg-bg text-center text-[15px] font-semibold tabular-nums')}
            value={typed}
            placeholder="Type any number"
            onChange={(e) => onTyped(e.target.value)}
            onFocus={(e) => e.target.select()}
          />
        )}

        <div className={cx('relative', WHEEL_H)}>
          <div
            className={cx('absolute left-1 right-1 bg-brandsoft border-y border-brandline',
              'rounded-[11px] pointer-events-none', BAND)}
          />

          <div
            ref={listRef}
            onScroll={handleScroll}
            className="h-full overflow-y-scroll snap-y snap-mandatory pr-[26px]
                       [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div style={{ height: PAD + winStart * ITEM }} />
            {!itemList.length && (
              <div className="h-11 grid place-items-center text-[13px] text-faint">No match</div>
            )}
            {shownItems.map((item, k) => {
              const i = winStart + k;
              const d = Math.min(3, Math.abs(i - current));
              const on = i === current;
              return (
                <div
                  key={String(item)}
                  onClick={() => scrollTo(i)}
                  // har item ka fade/scale centre se doori par nirbhar hai --
                  // har render par badalta hai, isliye Tailwind class nahi ban sakti
                  style={{ opacity: 1 - d * 0.24, transform: `scale(${1 - d * 0.08})` }}
                  className={cx(
                    'h-11 grid place-items-center snap-center cursor-pointer tabular-nums',
                    'transition-[color,opacity,transform] duration-150',
                    isText ? 'px-2.5' : '',
                    on ? 'text-brand font-bold' : 'text-dim font-semibold',
                    isText ? (on ? 'text-[17px]' : 'text-[15px]') : (on ? 'text-[25px]' : 'text-[21px]')
                  )}
                >
                  {item}
                </div>
              );
            })}
            <div style={{ height: (last - winEnd) * ITEM + PAD }} />
          </div>

          <div className="absolute top-0 right-0 bottom-0 w-[26px] flex flex-col items-center gap-1 z-[2]">
            <button className={railBtn} onClick={() => step(-1)} title="Up one">▲</button>

            <div
              ref={trackRef}
              onMouseDown={(e) => { dragging.current = true; dragTo(e.clientY); }}
              className={cx(
                'relative flex-1 w-3.5 cursor-grab active:cursor-grabbing transition-opacity duration-300',
                'before:absolute before:left-[5px] before:top-0 before:bottom-0 before:w-1',
                'before:bg-line before:rounded-sm before:content-[""]',
                bar.visible ? 'opacity-100' : 'opacity-0'
              )}
            >
              <div
                className="absolute left-1 w-1.5 max-h-full bg-brand rounded-[3px]"
                // scrollbar ki jagah scroll ke hisaab se chalti hai
                style={{ top: bar.top, height: bar.height }}
              />
            </div>

            <button className={railBtn} onClick={() => step(1)} title="Down one">▼</button>
          </div>

          <div className="absolute inset-x-0 top-0 h-[76px] pointer-events-none bg-gradient-to-b from-card to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-[76px] pointer-events-none bg-gradient-to-t from-card to-transparent" />
        </div>

        <p className="mt-2 mb-0.5 text-[11px] text-center text-faint">
          Drag the bar to move fast · tap the arrows for one step
        </p>
      </div>
    </div>
  );
}
