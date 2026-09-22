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

// Tailwind ko class ka naam poora likha hua chahiye, isliye ye constants
// se nahi bante -- lekin numbers wahi hain jo upar hain.
const WHEEL_H = 'h-[308px]';
const BAND = 'top-[132px] h-11';
const SPACER = 'h-[132px]';

export default function WheelPicker({ label, value, max = 100, items: given, onChange, onClose }) {
  const { shown, close } = useSheet(onClose);
  const listRef = useRef(null);
  const trackRef = useRef(null);
  const hideTimer = useRef(null);
  const lastIdx = useRef(0);
  const dragging = useRef(false);

  const all = given || Array.from({ length: max + 1 }, (_, i) => i);
  const isText = Boolean(given) && typeof all[0] === 'string';

  const [query, setQuery] = useState('');
  const itemList = query
    ? all.filter((i) => String(i).toLowerCase().includes(query.toLowerCase()))
    : all;
  const last = itemList.length - 1;
  const startIdx = Math.max(0, itemList.findIndex((i) => String(i) === String(value)));

  const [current, setCurrent] = useState(startIdx);
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
      play('tick');
    }

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
    const next = Math.max(0, Math.min(last, lastIdx.current + delta));
    if (next === lastIdx.current) return;
    lastIdx.current = next;
    setCurrent(next);
    play('tick');
    scrollTo(next);
  }

  function scrollTo(idx) {
    listRef.current?.scrollTo({ top: idx * ITEM, behavior: 'smooth' });
  }


  function commit(idx) {
    play('done');
    onChange(String(itemList[idx]));
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

        <div className={cx('relative', WHEEL_H)}>
          <div
            className={cx('absolute left-1 right-1 bg-brandsoft border-y border-[#eccdb4]',
              'rounded-[11px] pointer-events-none', BAND)}
          />

          <div
            ref={listRef}
            onScroll={handleScroll}
            className="h-full overflow-y-scroll snap-y snap-mandatory pr-[26px]
                       [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className={SPACER} />
            {!itemList.length && (
              <div className="h-11 grid place-items-center text-[13px] text-faint">No match</div>
            )}
            {itemList.map((item, i) => {
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
            <div className={SPACER} />
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
