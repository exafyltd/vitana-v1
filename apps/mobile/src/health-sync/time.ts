/**
 * VTID-05184 — wire timestamps (N5a, plan change 7 "Timestamp format").
 *
 * Machine timestamps only, never shown to a member, so no locale helper is
 * involved. The formats reproduce the vendored golden fixtures byte for byte:
 *   series `start`           UTC without milliseconds   2026-10-13T08:00:00Z
 *   series `end`/`record_id` UTC with milliseconds      2026-10-13T08:05:00.000Z
 *   record codes             local offset, no millis    2026-10-12T22:31:00+02:00
 */

export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

/** `Date#toISOString()` (UTC, milliseconds). */
export function isoUtc(ms: number): string {
  return new Date(ms).toISOString();
}

/** UTC without milliseconds (the instant is truncated to the second). */
export function isoUtcSeconds(ms: number): string {
  return new Date(Math.floor(ms / 1000) * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(tz: string): Intl.DateTimeFormat {
  let f = formatters.get(tz);
  if (!f) {
    // Fixed Latin-digit locale: these parts are parsed back into numbers, never displayed.
    f = new Intl.DateTimeFormat('en-US-u-nu-latn', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(tz, f);
  }
  return f;
}

/** Minutes east of UTC for `tz` at instant `ms` (DST-aware). Unknown zone → throws. */
export function tzOffsetMinutes(ms: number, tz: string): number {
  const parts: Record<string, number> = {};
  for (const p of formatterFor(tz).formatToParts(new Date(ms))) {
    if (p.type !== 'literal') parts[p.type] = Number(p.value);
  }
  const wall = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour % 24, parts.minute, parts.second);
  const whole = Math.floor(ms / 1000) * 1000;
  return Math.round((wall - whole) / MINUTE_MS);
}

const pad = (n: number, w = 2) => String(Math.abs(n)).padStart(w, '0');

/** Local wall time in `tz` with its offset, seconds precision: 2026-10-12T22:31:00+02:00. */
export function isoLocal(ms: number, tz: string): string {
  let offset: number;
  try {
    offset = tzOffsetMinutes(ms, tz);
  } catch {
    return isoUtcSeconds(ms);
  }
  const local = new Date(Math.floor(ms / 1000) * 1000 + offset * MINUTE_MS);
  const date = `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`;
  const time = `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:${pad(local.getUTCSeconds())}`;
  const sign = offset < 0 ? '-' : '+';
  return `${date}T${time}${sign}${pad(Math.trunc(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`;
}

/** Parses any contract timestamp to epoch ms. */
export function parseInstant(iso: string): number {
  return Date.parse(iso);
}
