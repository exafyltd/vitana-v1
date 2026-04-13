import { CalendarEvent } from "@/hooks/useCalendarEvents";

/* ────────────────────────────────────────────────────────────────────────────
 * parseCalendarNL  — German + English natural-language calendar parser
 *
 * Time:  20.30h · 20:30 Uhr · 20:30 · 8pm · 8:30pm · 20h
 * Range: 14-16h · 2-4pm · 14:00-16:00 · 14.00–16.00h
 * Date:  heute/today · morgen/tomorrow · übermorgen · Montag–Sonntag / Mon–Sun
 * ────────────────────────────────────────────────────────────────────────── */

// ── Time helpers ───────────────────────────────────────────────────────────

/** Extract {hour, min} from a single time token (e.g. "20.30h", "1pm", "14:00") */
function extractTime(raw: string): { hour: number; min: number } | null {
  // "20.30h", "20:30h", "8.30pm", "14:00", "20.30 Uhr", "20.30"
  const withMin = raw.match(/^(\d{1,2})[.:](\d{2})\s*(?:h|uhr|[ap]m)?$/i);
  if (withMin) {
    let h = parseInt(withMin[1], 10);
    const m = parseInt(withMin[2], 10);
    if (/pm$/i.test(raw) && h !== 12) h += 12;
    if (/am$/i.test(raw) && h === 12) h = 0;
    return { hour: h, min: m };
  }

  // "1pm", "20h", "9 Uhr", "8am"
  const bare = raw.match(/^(\d{1,2})\s*(?:h|uhr|[ap]m)$/i);
  if (bare) {
    let h = parseInt(bare[1], 10);
    if (/pm$/i.test(raw) && h !== 12) h += 12;
    if (/am$/i.test(raw) && h === 12) h = 0;
    return { hour: h, min: 0 };
  }

  return null;
}

/**
 * Find a time (or time range) inside a free-text string.
 * Returns { start: {h,m}, end?: {h,m}, matched: <raw substring> }.
 */
function findTime(input: string): {
  start: { hour: number; min: number };
  end?: { hour: number; min: number };
  matched: string;
} | null {
  // Regex that captures one or two time tokens separated by – or -.
  // Each token is  digits + optional separator + optional minutes + optional suffix.
  //   Token = \d{1,2}(?:[.:]\d{2})?\s*(?:h|uhr|[ap]m)?
  const tokenPat = `\\d{1,2}(?:[.:]\\d{2})?\\s*(?:h\\b|uhr\\b|[ap]m\\b)?`;
  const rangePat = new RegExp(
    `(${tokenPat})(?:\\s*[-–]\\s*(${tokenPat}))?`,
    'gi',
  );

  let best: ReturnType<typeof findTime> = null;

  for (const m of input.matchAll(rangePat)) {
    const rawStart = m[1].trim();
    const rawEnd = m[2]?.trim();

    // A bare number without suffix/separator is not a time (avoid matching "2 eggs")
    if (/^\d{1,2}$/.test(rawStart)) continue;

    const start = extractTime(rawStart);
    if (!start) continue;
    if (start.hour > 23 || start.min > 59) continue;

    let end: { hour: number; min: number } | undefined;
    if (rawEnd) {
      // Inherit suffix from start if end has none.  "2-4pm" → end gets "pm"
      let endToken = rawEnd;
      const startSuffix = rawStart.match(/(h|uhr|[ap]m)\s*$/i)?.[1];
      if (startSuffix && !/[a-z]/i.test(endToken.replace(/\d|[.:]/g, ''))) {
        endToken = endToken + startSuffix;
      }
      end = extractTime(endToken) ?? undefined;
      if (end && (end.hour > 23 || end.min > 59)) end = undefined;
    }

    best = { start, end, matched: m[0] };
    break; // take first valid match
  }

  return best;
}

// ── Date helpers ──────────────────────────────────────────────────────────

const DAY_MAP: Record<string, number> = {
  sunday: 0, sonntag: 0, sun: 0, so: 0,
  monday: 1, montag: 1, mon: 1, mo: 1,
  tuesday: 2, dienstag: 2, tue: 2, di: 2,
  wednesday: 3, mittwoch: 3, wed: 3, mi: 3,
  thursday: 4, donnerstag: 4, thu: 4, do: 4,
  friday: 5, freitag: 5, fri: 5, fr: 5,
  saturday: 6, samstag: 6, sat: 6, sa: 6,
};

function findDate(input: string, now: Date): Date {
  if (/\b(heute|today)\b/i.test(input)) return new Date(now);
  if (/\b(morgen|tomorrow)\b/i.test(input)) {
    const d = new Date(now); d.setDate(d.getDate() + 1); return d;
  }
  if (/\bübermorgen\b/i.test(input)) {
    const d = new Date(now); d.setDate(d.getDate() + 2); return d;
  }

  const names = Object.keys(DAY_MAP).join('|');
  const m = input.match(new RegExp(`\\b(${names})\\b`, 'i'));
  if (m) {
    const target = DAY_MAP[m[1].toLowerCase()];
    const current = now.getDay();
    let diff = target - current;
    if (diff <= 0) diff += 7;
    const d = new Date(now);
    d.setDate(d.getDate() + diff);
    return d;
  }

  // Default to today
  return new Date(now);
}

// ── Main parser ──────────────────────────────────────────────────────────

export function parseCalendarNL(input: string): Partial<CalendarEvent> {
  const result: Partial<CalendarEvent> = {
    status: 'confirmed',
    priority: 'medium',
    is_recurring: false,
    attendees_count: 0,
    has_rewards: false,
    source_type: 'manual',
  };

  const now = new Date();

  // ── 1. Date ────────────────────────────────────────────────────────
  const baseDate = findDate(input, now);

  // ── 2. Time ────────────────────────────────────────────────────────
  const timeResult = findTime(input);

  if (timeResult) {
    baseDate.setHours(timeResult.start.hour, timeResult.start.min, 0, 0);
    result.start_time = baseDate.toISOString();

    if (timeResult.end) {
      const endDate = new Date(baseDate);
      endDate.setHours(timeResult.end.hour, timeResult.end.min, 0, 0);
      result.end_time = endDate.toISOString();
    } else {
      result.end_time = new Date(baseDate.getTime() + 60 * 60 * 1000).toISOString();
    }
  } else {
    // No time — round current time up to next 15-min slot
    const mins = baseDate.getMinutes();
    baseDate.setMinutes(Math.ceil(mins / 15) * 15, 0, 0);
    result.start_time = baseDate.toISOString();
    result.end_time = new Date(baseDate.getTime() + 60 * 60 * 1000).toISOString();
  }

  // ── 3. Title ───────────────────────────────────────────────────────
  let title = input;
  // Strip matched time
  if (timeResult) {
    title = title.replace(timeResult.matched, '');
  }
  // Strip date keywords
  title = title.replace(
    /\b(heute|today|morgen|tomorrow|übermorgen|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
    '',
  );
  // Strip filler words around time
  title = title.replace(/\b(um|at|von|bis|from|to)\b/gi, '');
  // Strip tag markers
  title = title.replace(/tag:\s*\w+/gi, '');
  // Strip reminder
  title = title.replace(
    /(?:remind|alert|erinnerung)\s+\d+\s*(?:m|min|mins?|minute[ns]?|h|hr|hrs?|hours?|stunden?)/gi,
    '',
  );
  // Strip location
  title = title.replace(/@\s*[^,]+/g, '');
  // Clean up
  title = title.replace(/[,]+/g, ' ').replace(/\s+/g, ' ').trim();
  result.title = title || 'Calendar Event';

  // ── 4. Location (@) ────────────────────────────────────────────────
  const loc = input.match(/@\s*([^,]+)/);
  if (loc) result.location = loc[1].trim();

  // ── 5. Event type (tag:) ───────────────────────────────────────────
  const tagMatch = input.match(/tag:\s*(\w+)/i);
  if (tagMatch) {
    const tag = tagMatch[1].toLowerCase();
    const map: Record<string, CalendarEvent['event_type']> = {
      work: 'professional', professional: 'professional', business: 'professional',
      arbeit: 'professional', beruf: 'professional',
      health: 'health', medical: 'health', doctor: 'health',
      gesundheit: 'health', arzt: 'health',
      workout: 'workout', gym: 'workout', exercise: 'workout',
      training: 'workout', sport: 'workout', fitness: 'workout',
      community: 'community', social: 'community', group: 'community',
      nutrition: 'nutrition', ernährung: 'nutrition', essen: 'nutrition',
    };
    result.event_type = map[tag] || 'personal';
  } else {
    result.event_type = 'personal';
  }

  // ── 6. Reminder ────────────────────────────────────────────────────
  const rem = input.match(
    /(?:remind|alert|erinnerung)\s+(\d+)\s*(m|min|mins?|minute[ns]?|h|hr|hrs?|hours?|stunden?)/i,
  );
  if (rem) {
    const v = parseInt(rem[1], 10);
    const u = rem[2].toLowerCase();
    const txt = u.startsWith('h') || u.startsWith('s') ? `${v} hour(s) before` : `${v} minute(s) before`;
    result.description = result.description ? `${result.description}\nReminder: ${txt}` : `Reminder: ${txt}`;
  }

  return result;
}
