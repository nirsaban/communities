// Date/time + money formatting. Locale-agnostic: copy follows the active
// language bundle, dates are intl-formatted via the browser's locale.

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function fmtCents(cents: number, currency = '₪'): string {
  if (cents <= 0) return 'Free';
  return `${currency}${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  })}`;
}

export function fmtEventWhen(iso: string): { line: string; day: string } {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  if (isToday) return { line: `TONIGHT · ${hh}:${mm}`, day: 'Today' };
  if (isTomorrow) return { line: `TOMORROW · ${hh}:${mm}`, day: 'Tomorrow' };
  return {
    line: `${DAY[d.getDay()].toUpperCase()} · ${MONTH[d.getMonth()]} ${d.getDate()} · ${hh}:${mm}`,
    day: `${DAY[d.getDay()]} ${MONTH[d.getMonth()]} ${d.getDate()}`,
  };
}

export function fmtEventRange(startIso: string, endIso?: string): string {
  const s = new Date(startIso);
  const sh = s.getHours().toString().padStart(2, '0');
  const sm = s.getMinutes().toString().padStart(2, '0');
  if (!endIso) return `${sh}:${sm}`;
  const e = new Date(endIso);
  const eh = e.getHours().toString().padStart(2, '0');
  const em = e.getMinutes().toString().padStart(2, '0');
  return `${sh}:${sm} – ${eh}:${em}`;
}
