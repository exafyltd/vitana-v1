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
 */

import React, { useEffect, useState } from "react";
import RemindersPanel from "@/components/reminders/RemindersPanel";
import { EnhancedCalendarPopup } from "@/components/calendar/EnhancedCalendarPopup";
import { Bell } from "lucide-react";
import { t } from '@/lib/i18n-toast';
import { useIsMobile } from "@/hooks/use-mobile";

const Reminders: React.FC = () => {
  const isMobile = useIsMobile();
  // Open the Calendar popup on the Reminders tab when we arrived from a push,
  // OR whenever a mobile user lands here — the bare full-list page is a desktop
  // surface, so mobile gets the popup instead (matches the ORB mobile_route).
  const [calendarOpen, setCalendarOpen] = useState(
    () => isMobile || new URLSearchParams(window.location.search).has('fire'),
  );

  useEffect(() => {
    const prev = document.title;
    document.title = "Reminders | Vitana";
    return () => {
      document.title = prev;
    };
  }, []);

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

      <EnhancedCalendarPopup
        open={calendarOpen}
        onOpenChange={setCalendarOpen}
        initialMobileTab="reminders"
      />
    </div>
  );
};

export default Reminders;
