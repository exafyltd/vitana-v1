/**
 * VTID-02601 — Reminders route (/reminders).
 *
 * Kept for ORB voice navigation and reminder push deep-links
 * (/reminders?fire=<id>). The list UI lives in <RemindersPanel> (shared with
 * the Calendar → Reminders tab).
 *
 * Push deep-link behaviour (BOOTSTRAP-REMINDER-DEEPLINK): when arriving with
 * ?fire=<id>, open the Calendar popup directly on the Reminders tab so the
 * push-tap experience matches the in-app calendar. The global
 * ReminderInterruptOverlay reads ?fire= itself and renders the Mark-done /
 * Snooze / Dismiss card on top (z-9999). We render the popup locally rather
 * than dispatching the global `calendar:open` event because that event's
 * listener lives in the desktop sidebar only. BOOTSTRAP-MOBILE-NAV-CONTAINMENT
 * now also mounts that listener in MobileAppShell, and on mobile this page
 * auto-opens the Calendar popup on the Reminders tab so a mobile user never
 * gets stranded on the bare desktop full-list page.
 *
 * In that overlay-mode (mobile, or any device arriving with ?fire=) the
 * Calendar popup IS the destination. We skip rendering the full-page
 * <RemindersPanel> underneath — otherwise the user sees the same list
 * twice, and closing the popup strands them on /reminders. When the
 * popup is dismissed we send them back to the Maxina default (/) so
 * they land on home, not on a half-undressed copy of what was inside
 * the popup.
 */

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import RemindersPanel from "@/components/reminders/RemindersPanel";
import { EnhancedCalendarPopup } from "@/components/calendar/EnhancedCalendarPopup";
import { Bell } from "lucide-react";
import { t } from '@/lib/i18n-toast';
import { useIsMobile } from "@/hooks/use-mobile";

const Reminders: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  // Sticky for the lifetime of this mount — survives the URL change we do
  // when we strip ?fire= via navigate(), so the panel underneath stays
  // hidden until we leave the route.
  const isOverlayMode = useMemo(
    () => isMobile || new URLSearchParams(window.location.search).has('fire'),
    [isMobile],
  );
  const [calendarOpen, setCalendarOpen] = useState(isOverlayMode);

  useEffect(() => {
    const prev = document.title;
    document.title = "Reminders | Vitana";
    return () => {
      document.title = prev;
    };
  }, []);

  const handleCalendarOpenChange = (next: boolean) => {
    setCalendarOpen(next);
    if (!next && isOverlayMode) {
      navigate('/', { replace: true });
    }
  };

  if (isOverlayMode) {
    return (
      <EnhancedCalendarPopup
        open={calendarOpen}
        onOpenChange={handleCalendarOpenChange}
        initialMobileTab="reminders"
      />
    );
  }

  return (
    <div className="container max-w-2xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="h-6 w-6" />
          {t('screens.reminders.reminders')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('screens.reminders.subtitleDefault')}
        </p>
      </div>
      <RemindersPanel />
    </div>
  );
};

export default Reminders;
