import { useEffect, useState } from 'react';

/** VTID-05109 — the value, `ms` after it last changed (search-as-you-type without a request per key). */
export function useDebouncedValue<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return v;
}
