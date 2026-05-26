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
 * Snooze / Dismiss card on top.
 *
 * The Calendar popup is wrapped in a local error boundary: it's a heavy
 * component and has crashed on some accounts' data. If it throws during
 * render we degrade to just this page (+ the global action card) instead of
 * letting the crash bubble to GlobalErrorBoundary and black-screen the whole
 * app on a push tap.
 */

import React, { Component, ReactNode, useEffect, useState } from "react";
import RemindersPanel from "@/components/reminders/RemindersPanel";
import { EnhancedCalendarPopup } from "@/components/calendar/EnhancedCalendarPopup";
import { Bell } from "lucide-react";
import { t } from '@/lib/i18n-toast';

/** Renders nothing if its child throws — keeps a calendar crash from taking
 *  down the whole /reminders route (esp. on a cold push-tap load). */
class CalendarPopupBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error("[reminders] calendar popup crashed; degrading to list", error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const Reminders: React.FC = () => {
  // Open the calendar on the Reminders tab when we arrived from a push.
  const [calendarOpen, setCalendarOpen] = useState(
    () => new URLSearchParams(window.location.search).has('fire'),
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

      <CalendarPopupBoundary>
        <EnhancedCalendarPopup
          open={calendarOpen}
          onOpenChange={setCalendarOpen}
          initialMobileTab="reminders"
        />
      </CalendarPopupBoundary>
    </div>
  );
};

export default Reminders;
