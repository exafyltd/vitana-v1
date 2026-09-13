/**
 * VTID-03849 — loading / error / empty rendering for a BackOffice query.
 * Errors are mapped to `screens.backoffice.errors.*` so a missing capability,
 * an unconfigured bridge and an ERPClaw failure read differently.
 */
import { Skeleton } from "@/components/ui/skeleton";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import { errorKeyOf } from "@/hooks/useBackOfficeCommands";
import { t } from "@/lib/i18n-toast";

interface QueryStateProps {
  isLoading: boolean;
  error?: unknown;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  rows?: number;
}

export function QueryError({ error }: { error: unknown }) {
  const key = errorKeyOf(error);
  return (
    <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
      <div className="font-medium">{t(`screens.backoffice.errors.${key}`)}</div>
      {key === "bridgeUnavailable" && <p className="text-xs text-muted-foreground mt-1">{t("screens.backoffice.errors.bridgeUnavailableHint")}</p>}
      {key === "noCapability" && <p className="text-xs text-muted-foreground mt-1">{t("screens.backoffice.errors.noCapabilityHint")}</p>}
    </div>
  );
}

export function QuerySkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  );
}

/** Returns a node to render INSTEAD of the content, or null when the content should render. */
export default function QueryState({ isLoading, error, isEmpty, emptyTitle, emptyDescription, rows }: QueryStateProps) {
  if (isLoading) return <QuerySkeleton rows={rows} />;
  if (error) return <QueryError error={error} />;
  if (isEmpty) return <AdminEmptyState title={emptyTitle ?? t("screens.backoffice.common.empty")} description={emptyDescription} />;
  return null;
}
