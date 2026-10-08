/**
 * VTID-04992 — the one place that defines where a member's profile lives.
 * A handle wins over the id (it is the shareable form); nothing → no path.
 */
export function profilePath(userId?: string | null, handle?: string | null): string | null {
  const identifier = (handle && handle.trim()) || (userId && userId.trim()) || "";
  return identifier ? `/u/${encodeURIComponent(identifier)}` : null;
}
