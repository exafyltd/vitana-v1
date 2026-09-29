/**
 * VTID-04459 — golden-file helper for the app calendar regression suite.
 *
 * Each scenario's output is compared with a recorded JSON file in
 * __golden__/. A change in calendar behaviour fails the suite and the
 * reviewer sees exactly which scenario moved. If the change is intended,
 * re-record and commit the golden diff with it:
 *   UPDATE_CALENDAR_GOLDEN=1 npm run test:calendar
 * A missing golden entry fails; it is never created silently.
 */
import fs from "node:fs";
import path from "node:path";
import { afterAll, expect } from "vitest";

// The calendar works in the device's local time; the suite fixes the device
// to Europe/Berlin (DST in both directions) whatever machine runs it — the
// normal unit-test job and CALENDAR-REGRESSION alike — and puts the previous
// zone back when the file is done. Set at import, before any test body runs.
const PREVIOUS_TZ = process.env.TZ;
process.env.TZ = "Europe/Berlin";
afterAll(() => {
  if (PREVIOUS_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = PREVIOUS_TZ;
});

const DIR = path.join(process.cwd(), "src/components/calendar/__regression__/__golden__");
const UPDATE = process.env.UPDATE_CALENDAR_GOLDEN === "1";
const pending = new Map<string, Record<string, unknown>>();

function normalise(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value, (_k, v) => (v === undefined ? null : v)));
}

export function expectGolden(file: string, scenario: string, value: unknown): void {
  const p = path.join(DIR, `${file}.json`);
  const actual = normalise(value);
  if (UPDATE) {
    const current = pending.get(p) ?? (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : {});
    current[scenario] = actual;
    pending.set(p, current);
    const sorted = Object.fromEntries(Object.keys(current).sort().map((k) => [k, current[k]]));
    fs.writeFileSync(p, `${JSON.stringify(sorted, null, 2)}\n`);
    return;
  }
  const current: Record<string, unknown> = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : {};
  if (!(scenario in current)) {
    throw new Error(`No golden output for "${file}/${scenario}". Record it with UPDATE_CALENDAR_GOLDEN=1 and commit the file.`);
  }
  expect(actual).toEqual(current[scenario]);
}

/** Fails loudly if the zone could not be fixed (results depend on it). */
export function assertBerlin(): void {
  const winter = new Date(2026, 0, 15).getTimezoneOffset();
  const summer = new Date(2026, 6, 15).getTimezoneOffset();
  if (winter !== -60 || summer !== -120) {
    throw new Error(`Calendar regression suite needs the Europe/Berlin zone; got offsets ${winter}/${summer}`);
  }
}
