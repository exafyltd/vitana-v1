/**
 * Virtual event join links (VTID-04907).
 *
 * Create/Edit used to store the literal string 'Virtual Event' in
 * `global_community_events.virtual_link`, and the drawer rendered it as an
 * <a href>, i.e. a broken "Join" link. Only a real http(s) URL is ever stored
 * or rendered now; existing rows holding the literal are simply not linked
 * (no data migration).
 */
export function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  if (!/^https?:\/\//i.test(v)) return false;
  try {
    const u = new URL(v);
    return (u.protocol === 'http:' || u.protocol === 'https:') && !!u.hostname;
  } catch {
    return false;
  }
}

/** The value to store for `virtual_link`: the trimmed URL, or undefined. */
export function toVirtualLink(isVirtual: boolean, raw: string | null | undefined): string | undefined {
  if (!isVirtual || !isHttpUrl(raw)) return undefined;
  return raw.trim();
}
