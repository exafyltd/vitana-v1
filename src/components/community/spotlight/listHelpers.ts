/**
 * VTID-05110 — Live Rooms rail selection: rooms live now and the next
 * scheduled ones, never repeating the room already on the stage.
 */
export function pickRailRooms<T extends { id: string }>(live: readonly T[], scheduled: readonly T[], excludeId?: string) {
  return {
    liveItems: live.filter((r) => r.id !== excludeId).slice(0, 4),
    nextItems: scheduled.filter((r) => r.id !== excludeId).slice(0, 5),
  };
}

/**
 * VTID-05110 — split a list into the items that fill complete grid rows and
 * the leftover (fewer than one row). See FullRowGrid (contract SR-13).
 */
export function splitFullRows<T>(items: readonly T[], cols: number): { grid: T[]; rest: T[] } {
  if (cols <= 1) return { grid: [...items], rest: [] };
  const full = Math.floor(items.length / cols) * cols;
  return { grid: items.slice(0, full), rest: items.slice(full) };
}
