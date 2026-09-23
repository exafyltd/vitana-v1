import { useNavigate } from "react-router-dom";
import { EnhancedCalendarPopup } from "@/components/calendar/EnhancedCalendarPopup";

/**
 * /calendar — standalone entry point for the existing calendar surface.
 *
 * Renders the same EnhancedCalendarPopup the header button opens, opened. The
 * popup loads the user's events itself (useCalendarEvents) and switches to
 * MobileCalendarModal on mobile. Closing it returns to the previous screen, or
 * to /home when /calendar was opened directly.
 */
export default function CalendarPage() {
  const navigate = useNavigate();

  const handleOpenChange = (open: boolean) => {
    if (open) return;
    // Defer one tick: some popup actions close and then navigate elsewhere
    // (e.g. "View all reminders"). Only leave /calendar if nothing else did.
    setTimeout(() => {
      if (window.location.pathname !== "/calendar") return;
      const idx = (window.history.state as { idx?: number } | null)?.idx;
      if (typeof idx === "number" && idx > 0) {
        navigate(-1);
      } else {
        navigate("/home", { replace: true });
      }
    }, 0);
  };

  return <EnhancedCalendarPopup open onOpenChange={handleOpenChange} />;
}
