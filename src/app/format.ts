// Shared display formatting for money and dates.

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const usdCompact = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** $1,234.50 */
export function formatMoney(amount: number): string {
  return usd.format(amount);
}

/** $1.2K, for chart axes. */
export function formatMoneyCompact(amount: number): string {
  return usdCompact.format(amount);
}

/**
 * Parses a date-only value (YYYY-MM-DD) as local midnight. `new Date('2026-10-07')`
 * is UTC midnight, which shows as the day before in US time zones.
 */
export function parseLocalDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** YYYY-MM-DD for a local date, for <input type="date"> and date columns. */
export function toDateInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** YYYY-MM-DDTHH:mm in local time, for <input type="datetime-local">. */
export function toDateTimeInputValue(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${toDateInputValue(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Converts a datetime-local input value (local time) to an ISO timestamp, or null if empty. */
export function fromDateTimeInputValue(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

/** Parses an optional number input: '' is null, anything else must be a finite number >= 0. */
export function parseOptionalNumber(value: string): number | null | 'invalid' {
  if (value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 'invalid';
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/** Opens a Google Maps search for the address. */
export function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
