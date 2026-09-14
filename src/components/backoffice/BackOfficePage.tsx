/**
 * VTID-03849 — one frame for every BackOffice screen: AppLayout (never
 * replaced — ORB widget, ProfileDrawer role switcher and sidebar stay
 * constant), the section's tab row, the admin-style header and an optional
 * capability gate. The gateway enforces capabilities on every read; the gate
 * here only avoids showing a screen that can only ever 403.
 */
import type { ReactNode } from "react";
import AppLayout from "@/components/AppLayout";
import BackOfficeTabs from "@/components/backoffice/BackOfficeTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import { useMyErpAccess } from "@/hooks/useBackOfficeAccess";
import { hasAnyCapability } from "@/hooks/useBackOfficeCommands";
import { t } from "@/lib/i18n-toast";

interface BackOfficePageProps {
  sectionKey: string;
  screenId: string;
  emoji?: string;
  title: string;
  description: string;
  /** any-of; omit for screens every BackOffice member may open */
  capabilities?: readonly string[];
  rightAction?: ReactNode;
  children: ReactNode;
}

export default function BackOfficePage({ sectionKey, screenId, emoji, title, description, capabilities, rightAction, children }: BackOfficePageProps) {
  const me = useMyErpAccess();
  const gated = !!capabilities && capabilities.length > 0;
  const allowed = !gated || me.isLoading || !me.data || me.data.is_exafy_admin || hasAnyCapability(me.data.capabilities, capabilities as readonly string[]);

  return (
    <AppLayout>
      <BackOfficeTabs sectionKey={sectionKey} />
      <div className="p-6 space-y-4" data-screen-id={screenId}>
        <AdminHeader emoji={emoji} title={title} description={description} rightAction={rightAction} />
        {allowed ? (
          children
        ) : (
          <div className="max-w-3xl rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
            <p className="text-sm text-muted-foreground">{t("screens.backoffice.noAccess")}</p>
            <p className="text-xs text-muted-foreground mt-2" dir="ltr">{(capabilities ?? []).join(" · ")}</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
