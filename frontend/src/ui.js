/**
 * Baar-baar use hone wale Tailwind class groups.
 * Ek jagah rakhne se har file me lambi class strings nahi likhni padti,
 * aur design badalna ho to sirf yahan badalna padta hai.
 */

export const cx = (...parts) => parts.filter(Boolean).join(' ');

export const card =
  'bg-card border border-line rounded-[14px] p-4 mb-3.5 shadow-[0_1px_2px_rgba(120,85,50,.05)]';

export const cardTitle =
  'm-0 mb-3 text-[11.5px] font-semibold tracking-[.07em] uppercase text-faint';

export const sectionLabel = 'block mb-1.5 text-xs font-medium text-dim';

export const input =
  'w-full px-3 py-2 text-[13.5px] text-ink bg-white border border-line rounded-[9px] ' +
  'outline-none transition-[border-color,box-shadow] duration-150 ' +
  'placeholder:text-faint focus:border-brand focus:ring-[3px] focus:ring-brandsoft';

export const btn =
  'inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-[12.5px] font-semibold ' +
  'text-ink bg-white border border-line rounded-[9px] cursor-pointer transition-colors ' +
  'duration-150 hover:bg-bg2 hover:border-[#dcc9ae] disabled:opacity-45 disabled:cursor-not-allowed';

export const btnPrimary =
  'inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-[12.5px] font-semibold ' +
  'text-white bg-gradient-to-br from-brand to-brand2 border border-transparent rounded-[9px] ' +
  'cursor-pointer shadow-[0_4px_12px_rgba(201,106,58,.25)] transition-[filter] duration-150 ' +
  'hover:brightness-105 disabled:opacity-45 disabled:cursor-not-allowed';

export const btnGhost =
  'inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-[12.5px] font-semibold ' +
  'text-dim bg-transparent border border-transparent rounded-[9px] cursor-pointer ' +
  'transition-colors duration-150 hover:text-ink hover:bg-bg2 disabled:opacity-45';

export const btnSmall = 'px-2.5 py-1 text-[11.5px]';

export const chip =
  'px-2.5 py-1 text-[11.5px] font-medium rounded-full bg-bg border border-line ' +
  'text-dim cursor-pointer transition-colors hover:text-ink hover:bg-bg2';

export const chipOn = 'bg-brand border-brand text-white hover:bg-brand hover:text-white';

export const hint = 'text-xs text-faint';

export const statusOk = 'mt-3 px-3 py-2.5 text-[12.5px] rounded-[9px] bg-okbg text-oktext';
export const statusErr = 'mt-3 px-3 py-2.5 text-[12.5px] rounded-[9px] bg-errbg text-errtext';

/* modal ka backdrop aur sheet */
/* khulne aur band hone ki duration ek hi rehni chahiye -- useSheet.js dekho */
export const overlay =
  'fixed inset-0 z-40 grid place-items-center p-5 ' +
  'transition-[background-color,backdrop-filter] duration-200 ease-out';
export const overlayIn = 'bg-ink/30 backdrop-blur-[7px]';
export const overlayOut = 'bg-transparent backdrop-blur-0';

export const sheet =
  'bg-card border border-line rounded-[24px] shadow-[0_28px_70px_rgba(120,80,40,.3)] ' +
  'transition-[opacity,transform] duration-200 ease-out will-change-transform';
export const sheetIn = 'opacity-100 scale-100 translate-y-0';
export const sheetOut = 'opacity-0 scale-95 translate-y-2';
