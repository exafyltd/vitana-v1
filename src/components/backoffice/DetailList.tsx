/** VTID-03855 — a definition list for one selected ERP record (read-only). */
import type { ReactNode } from "react";

export interface DetailRow { label: string; value: ReactNode; mono?: boolean }

export default function DetailList({ rows }: { rows: DetailRow[] }) {
  return (
    <dl>
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-2 gap-3 text-sm py-1 border-b last:border-b-0">
          <dt className="text-muted-foreground">{r.label}</dt>
          <dd className={r.mono ? "font-mono text-xs break-all" : ""} dir={r.mono ? "ltr" : undefined}>{r.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
