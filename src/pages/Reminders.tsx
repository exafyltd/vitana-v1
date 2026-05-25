/**
 * VTID-02601 — Reminders route (/reminders).
 *
 * Kept for ORB voice navigation and reminder push deep-links
 * (/reminders?fire=<id>). The list UI lives in <RemindersPanel> (shared with
 * the Calendar → Reminders tab).
 *
 * Push deep-link behaviour (BOOTSTRAP-REMINDER-DEEPLINK): when arriving with
 * ?fire=<id>, we surface the organized Calendar → Reminders tab behind the
 * global action overlay (ReminderInterruptOverlay, which reads ?fire= itself).
 * That makes the push-tap experience match the in-app calendar instead of the
 * bare list. Plain navigation (ORB "show my reminders") just shows this page.
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

  // Push deep-link: layer the Calendar → Reminders tab behind the action modal.
  // The short delay lets the calendar:open listener (mounted in AppLayout) register.
  useEffect(() => {
    const hasFire = new URLSearchParams(window.location.search).has('fire');
    if (!hasFire) return;
    const timer = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('calendar:open', { detail: { tab: 'reminders' } }));
    }, 50);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <AppLayout>
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
    </AppLayout>
  );
};

export default Reminders;
