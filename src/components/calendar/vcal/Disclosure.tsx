/**
 * A calendar section that opens and closes (VTID-04536).
 *
 * The closed header already tells the member what is inside ("Reminders ·
 * 3 upcoming"), so opening it is a choice, not a guess. Whether a section is
 * open is remembered per member on this device.
 *
 * VTID-04681: a quiet row. VTID-04852: an Index-style card (white, rounded-3xl,
 * soft shadow) with the title in bold and a chevron.
 */
import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { INDEX_CARD } from "@/lib/index-look";
import { SURFACE } from "./theme";

const STORE_PREFIX = "vitana.calendar.open.";

function readOpen(id: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(STORE_PREFIX + id);
    return v === null ? fallback : v === "1";
  } catch {
    return fallback;
  }
}

function writeOpen(id: string, open: boolean): void {
  try {
    localStorage.setItem(STORE_PREFIX + id, open ? "1" : "0");
  } catch {
    // per-viewer convenience only
  }
}

interface Props {
  /** Stable id; also the key the open state is remembered under. */
  id: string;
  title: string;
  /** One line that says what is inside while the section is closed. */
  summary: ReactNode;
  /** Tints the summary when something needs attention. */
  tone?: "normal" | "attention";
  defaultOpen?: boolean;
  children: ReactNode;
}

export function Disclosure({ id, title, summary, tone = "normal", defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(() => readOpen(id, defaultOpen));
  const panelId = useId();
  const toggle = () => {
    setOpen((o) => {
      writeOpen(id, !o);
      return !o;
    });
  };
  return (
    <section className={`${INDEX_CARD} !p-0`} data-testid={`vcal-section-${id}`}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 rounded-3xl px-5 py-4 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
      >
        <span className="flex min-w-0 flex-1 items-baseline gap-2">
          <span className="shrink-0 text-base font-bold text-slate-900">{title}</span>
          <span className="truncate text-sm" style={{ color: tone === "attention" ? "#A3322C" : SURFACE.muted }}>
            {summary}
          </span>
        </span>
        <ChevronDown aria-hidden className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div id={panelId} className="flex flex-col gap-3 px-5 pb-5">
          {children}
        </div>
      )}
    </section>
  );
}
