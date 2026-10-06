/**
 * VTID-04756 — the Google, Apple and Outlook calendar icons on the connect card.
 *
 * Members look for the app they use, not for a letter: each mark follows the
 * icon of the calendar app itself. Apple's icon shows today's weekday and
 * date, as the real one does.
 */
import { fmtDate } from "@/lib/locale-format";

export type CalendarProvider = "google" | "apple" | "outlook";

function GoogleCalendarLogo({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden focusable="false">
      <rect width="22" height="22" x="13" y="13" fill="#fff" />
      <polygon fill="#1e88e5" points="25.68,20.92 26.688,22.36 28.272,21.208 28.272,29.56 30,29.56 30,18.616 28.56,18.616" />
      <path
        fill="#1e88e5"
        d="M22.943,23.745c0.625-0.574,1.013-1.37,1.013-2.249c0-1.747-1.533-3.168-3.417-3.168c-1.602,0-2.972,1.009-3.33,2.453l1.657,0.421c0.165-0.664,0.868-1.146,1.673-1.146c0.942,0,1.709,0.646,1.709,1.44c0,0.794-0.767,1.44-1.709,1.44h-0.997v1.728h0.997c1.081,0,1.993,0.751,1.993,1.64c0,0.904-0.866,1.64-1.931,1.64c-0.962,0-1.784-0.61-1.914-1.418L17,26.802c0.262,1.636,1.81,2.87,3.6,2.87c2.007,0,3.64-1.511,3.64-3.368C24.24,25.281,23.736,24.363,22.943,23.745z"
      />
      <polygon fill="#fbc02d" points="34,42 14,42 13,38 14,34 34,34 35,38" />
      <polygon fill="#4caf50" points="38,35 42,34 42,14 38,13 34,14 34,34" />
      <path fill="#1e88e5" d="M34,14l1-4l-1-4H9C7.343,6,6,7.343,6,9v25l4,1l4-1V14H34z" />
      <polygon fill="#e53935" points="34,34 34,42 42,34" />
      <path fill="#1565c0" d="M39,6h-5v8h8V9C42,7.343,40.657,6,39,6z" />
      <path fill="#1565c0" d="M9,42h5v-8H6v5C6,40.657,7.343,42,9,42z" />
    </svg>
  );
}

/** White tile, red weekday, large date — today's, like the icon on an iPhone or Mac. */
function AppleCalendarLogo({ size }: { size: number }) {
  const now = new Date();
  const weekday = fmtDate(now, { weekday: "short" }).replace(/\.$/, "").toUpperCase();
  const day = fmtDate(now, { day: "numeric" });
  return (
    <span
      aria-hidden
      className="flex shrink-0 flex-col items-center justify-center bg-white"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.225,
        boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.12)",
        lineHeight: 1,
      }}
    >
      <span style={{ color: "#FF3B30", fontSize: size * 0.2, fontWeight: 500, letterSpacing: "0.02em" }}>{weekday}</span>
      <span style={{ color: "#1D1D1F", fontSize: size * 0.52, fontWeight: 400, marginTop: size * 0.02 }}>{day}</span>
    </span>
  );
}

/** Outlook: the blue envelope behind a blue tile carrying the white O. */
function OutlookLogo({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden focusable="false">
      <rect x="16" y="8" width="29" height="32" rx="3.5" fill="#0364B8" />
      <path d="M19.5 8H41.5A3.5 3.5 0 0 1 45 11.5V19H16V11.5A3.5 3.5 0 0 1 19.5 8Z" fill="#28A8EA" />
      <path d="M16 19H45V36.5A3.5 3.5 0 0 1 41.5 40H19.5A3.5 3.5 0 0 1 16 36.5Z" fill="#0078D4" />
      <path d="M16 19L30.5 29.5L45 19" fill="none" stroke="#8FD6F7" strokeWidth="1.1" opacity="0.8" strokeLinejoin="round" />
      <rect x="3" y="13" width="26" height="26" rx="3.5" fill="#0F6CBD" />
      <circle cx="16" cy="26" r="6.2" fill="none" stroke="#fff" strokeWidth="3.4" />
    </svg>
  );
}

export function CalendarProviderLogo({ p, size = 32 }: { p: CalendarProvider; size?: number }) {
  if (p === "google") return <GoogleCalendarLogo size={size} />;
  if (p === "apple") return <AppleCalendarLogo size={size} />;
  return <OutlookLogo size={size} />;
}
