/**
 * VTID-02601 — Reminders list page (route: /reminders, kept for ORB navigation
 * and push deep-links like /reminders?fire=<id>).
 *
 * The list/dialog UI lives in <RemindersPanel> so the same surface can also be
 * embedded as a tab inside the Calendar. This page is the standalone wrapper:
 * page container + heading + document title.
 */

import React, { useEffect } from "react";
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
