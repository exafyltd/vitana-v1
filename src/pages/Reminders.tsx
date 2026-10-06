/**
 * VTID-02601 — Reminders route (/reminders).
 *
 * Kept for ORB voice navigation ("show my reminders" → `calendar:open`
 * with tab 'reminders') and reminder push deep-links (/reminders/fire/<id>,
 * or legacy /reminders?fire=<id>). The list UI lives in <RemindersPanel>
 * (shared with the /calendar Reminders section).
 *
 * VTID-04915: this used to open the older calendar popup on its Reminders
 * tab on mobile and for every fire link. The popup is retired; the page is
 * now the reminders list inside the normal app shell on every device, so a
 * push tap never lands on a bare page. The global ReminderInterruptOverlay
 * (mounted at the app root) reads the fire id from the URL itself and shows
 * the Mark-done / Snooze / Dismiss card on top, exactly as before.
 */

import React, { useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import RemindersPanel from "@/components/reminders/RemindersPanel";
import { Bell } from "lucide-react";
import { t } from '@/lib/i18n-toast';

const Reminders: React.FC = () => {
  useEffect(() => {
    const prev = document.title;
    document.title = "Reminders | Vitana";
    return () => {
      document.title = prev;
    };
  }, []);

  return (
    <AppLayout>
      <div className="container max-w-2xl mx-auto p-4 space-y-6" data-testid="reminders-page">
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
    </AppLayout>
  );
};

export default Reminders;
