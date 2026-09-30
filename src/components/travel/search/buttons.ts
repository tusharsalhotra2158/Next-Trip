// Pill buttons shared by the destination card and the location modal
// (the Angular `.btn` / `.btn-primary` / `.btn-secondary` component styles, plus
// the Bootstrap `.btn` base properties they relied on: line-height, centring, no text selection).
const BTN_BASE =
  'inline-block flex-1 cursor-pointer select-none rounded-full px-[18px] py-[11px] text-center align-middle font-sans text-[13px] leading-normal font-semibold transition-all duration-200 ease-[ease]';

export const BTN_PRIMARY = `${BTN_BASE} border-0 bg-terracotta text-white hover:-translate-y-0.5 hover:bg-terracotta-dark hover:shadow-[0_8px_18px_rgba(0,0,0,0.2)]`;

export const BTN_SECONDARY = `${BTN_BASE} border border-solid border-white/35 bg-white/15 text-white hover:bg-white/25`;
