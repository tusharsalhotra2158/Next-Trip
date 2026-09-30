// Formatting helpers reproducing the Angular pipes used by the destination search page.
// The Angular app's default LOCALE_ID is en-US (en-IN is only registered for the
// currency pipe's explicit locale argument), so number/date output follows en-US.

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 });

/** `value | currency: 'INR' : 'symbol' : '1.0-0' : 'en-IN'` → "₹1,23,456". */
export function formatInrCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  return inrFormatter.format(value);
}

/** ₹1,234 with Indian digit grouping; "Free" for 0; "—" when unknown. */
export function formatInr(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—';
  if (amount === 0) return 'Free';
  return inrFormatter.format(amount);
}

/** `value | number` (en-US, up to 3 fraction digits). */
export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(n) ? '' : numberFormatter.format(n);
}

/** `value | titlecase`: capitalises the first letter of each whitespace-separated word. */
export function titleCase(value: string | null | undefined): string {
  if (!value) return '';
  return value.replace(/[\p{L}\p{N}]\S*/gu, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

/** "3h 25m" / "45m". */
export function formatDuration(min: number): string {
  const hours = Math.floor(min / 60);
  const minutes = Math.round(min % 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

// Same ISO-8601 parsing rules as Angular's DatePipe (date-only strings are local dates).
const ISO8601_DATE_REGEX =
  /^(\d{4,})-?(\d\d)-?(\d\d)(?:T(\d\d)(?::?(\d\d)(?::?(\d\d)(?:\.(\d+))?)?)?(Z|([+-])(\d\d):?(\d\d))?)?$/;

function toDate(value: string | number | Date): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') return new Date(value);
  const str = value.trim();
  if (/^(\d{4}(-\d{1,2}(-\d{1,2})?)?)$/.test(str)) {
    const [y, m = 1, d = 1] = str.split('-').map((v) => +v);
    return new Date(y, m - 1, d);
  }
  const match = str.match(ISO8601_DATE_REGEX);
  if (match) {
    const date = new Date(0);
    let tzHour = 0;
    let tzMin = 0;
    const dateSetter = match[8] ? date.setUTCFullYear : date.setFullYear;
    const timeSetter = match[8] ? date.setUTCHours : date.setHours;
    if (match[9]) {
      tzHour = Number(match[9] + match[10]);
      tzMin = Number(match[9] + match[11]);
    }
    dateSetter.call(date, Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    const h = Number(match[4] || 0) - tzHour;
    const m = Number(match[5] || 0) - tzMin;
    const s = Number(match[6] || 0);
    const ms = Math.floor(parseFloat('0.' + (match[7] || 0)) * 1000);
    timeSetter.call(date, h, m, s, ms);
    return date;
  }
  const parsed = new Date(str);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Subset of Angular DatePipe formats used on this page (en-US, local time):
 * 'MMM y' → "Jan 2024", 'MMM d, y' → "Jan 5, 2024", 'MMM d, h:mm a' → "Jan 5, 3:04 PM".
 */
export function formatDate(
  value: string | number | Date | null | undefined,
  format: 'MMM y' | 'MMM d, y' | 'MMM d, h:mm a',
): string {
  if (value === null || value === undefined || value === '') return '';
  const date = toDate(value);
  if (!date) return '';
  const mon = MONTHS[date.getMonth()];
  switch (format) {
    case 'MMM y':
      return `${mon} ${date.getFullYear()}`;
    case 'MMM d, y':
      return `${mon} ${date.getDate()}, ${date.getFullYear()}`;
    case 'MMM d, h:mm a': {
      const hours = date.getHours();
      const h12 = hours % 12 === 0 ? 12 : hours % 12;
      const mm = String(date.getMinutes()).padStart(2, '0');
      return `${mon} ${date.getDate()}, ${h12}:${mm} ${hours < 12 ? 'AM' : 'PM'}`;
    }
  }
}
