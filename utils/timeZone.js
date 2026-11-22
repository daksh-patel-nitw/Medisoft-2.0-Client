// Helpers for working with a doctor's timezone (slot times are stored as "HH:mm" in the doctor's zone).

/** The browser's own IANA timezone, e.g. "Asia/Kolkata" - sent to the API as `userTimezone` / `timeZone`. */
export const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

// How far ahead of UTC a timezone is at a given instant, in milliseconds.
function zoneOffsetMs(utcMs, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs));
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  const asIfUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asIfUtc - utcMs;
}

/**
 * The UTC instant at which the clock in `timeZone` reads `timeStr` on `dateStr`.
 * e.g. zonedTimeToUtc('2026-11-24', '09:00', 'Asia/Kolkata') -> 2026-11-24T03:30:00.000Z
 *
 * @param {string} dateStr - "YYYY-MM-DD"
 * @param {string} timeStr - "HH:mm" (24-hour)
 * @param {string} timeZone - IANA timezone
 * @returns {Date}
 */
export function zonedTimeToUtc(dateStr, timeStr, timeZone) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  return new Date(guess - zoneOffsetMs(guess, timeZone));
}

/** Today's date as "YYYY-MM-DD" in the browser's timezone (for date inputs' `min`). */
export function todayInputValue() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
