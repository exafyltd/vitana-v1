/**
 * VTID-05114 — Spotlight Phase 7.2: the BackOffice screen frame on the
 * `workspace` archetype.
 *
 * Every BackOffice screen calls `useSpotlightEnabled()` once and passes the
 * result here:
 *  - `spotlight = false` renders `<BackOfficePage>` exactly as before (same
 *    AppLayout, BackOfficeTabs, padded wrapper, header and capability gate);
 *  - `spotlight = true` keeps AppLayout and BackOfficeTabs (the section tab
 *    bar, directly above the frame — the admin-shell contract the BackOffice
 *    mirrors) and puts the same header, gate and content inside
 *    `<ScreenFrame archetype="workspace">` (full width, no rail), which owns
 *    the gutters.
 *
 * The capability gate is the same rule as BackOfficePage's (the gateway
 * enforces capabilities on every read; this only avoids a screen that can
 * only ever 403).
 */
import type { ComponentProps } from "react";
import AppLayout from "@/components/AppLayout";
import BackOfficePage from "@/components/backoffice/BackOfficePage";
import BackOfficeTabs from "@/components/backoffice/BackOfficeTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import { ScreenFrame } from "@/components/layout/spotlight";
import { useMyErpAccess } from "@/hooks/useBackOfficeAccess";
import { hasAnyCapability } from "@/hooks/useBackOfficeCommands";
import { t } from "@/lib/i18n-toast";

type BackOfficePageProps = ComponentProps<typeof BackOfficePage>;

export interface BackOfficeWorkspacePageProps extends BackOfficePageProps {
  /** The page's own `useSpotlightEnabled()` value. */
  spotlight: boolean;
}

function BackOfficeWorkspaceFrame({ sectionKey, screenId, emoji, title, description, capabilities, rightAction, children }: BackOfficePageProps) {
  const me = useMyErpAccess();
  const gated = !!capabilities && capabilities.length > 0;
  const allowed = !gated || me.isLoading || !me.data || me.data.is_exafy_admin || hasAnyCapability(me.data.capabilities, capabilities as readonly string[]);

  return (
    <AppLayout>
      <BackOfficeTabs sectionKey={sectionKey} />
      <ScreenFrame archetype="workspace">
        <div className="space-y-4" data-screen-id={screenId}>
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
      </ScreenFrame>
    </AppLayout>
  );
}

export default function BackOfficeWorkspacePage({ spotlight, ...props }: BackOfficeWorkspacePageProps) {
  return spotlight ? <BackOfficeWorkspaceFrame {...props} /> : <BackOfficePage {...props} />;
}
