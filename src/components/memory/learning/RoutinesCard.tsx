/**
 * VTID-05172 — "Routines Vitana noticed": what the habit rollup (AP-0916) and
 * the calendar pattern extractor learned, one sentence each, each forgettable.
 */
import { Link } from "react-router-dom";
import { Repeat, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VCard, VCardSkeleton } from "@/components/ui/vcard";
import { useForgetRoutine, useRoutines } from "@/hooks/useMemoryLearning";
import { notifyError, notifySuccess, t } from "@/lib/i18n-toast";
import { routineSentence } from "./routine-text";

export function RoutinesCard() {
  const { data, isLoading, isError } = useRoutines();
  const forget = useForgetRoutine();
  if (isLoading) return <VCardSkeleton size="standard" />;
  if (isError) return null;
  const routines = data ?? [];

  return (
    <VCard
      size="standard"
      data-testid="memory-routines"
      eyebrow={<span className="inline-flex items-center gap-1.5"><Repeat className="h-4 w-4" aria-hidden />{t("memoryLearning.routines.title")}</span>}
      title={t("memoryLearning.routines.description")}
      body={
        routines.length === 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="memory-routines-empty">{t("memoryLearning.routines.empty")}</p>
        ) : (
          <ul className="divide-y">
            {routines.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm" data-testid="memory-routine">
                <span className="min-w-0">{routineSentence(r)}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  disabled={forget.isPending}
                  aria-label={`${t("memoryLearning.routines.forget")}: ${routineSentence(r)}`}
                  onClick={() =>
                    forget.mutate(r.id, {
                      onSuccess: () => notifySuccess("memoryLearning.toast.forgotten"),
                      onError: () => notifyError("memoryLearning.toast.saveFailed"),
                    })
                  }
                >
                  <X className="h-4 w-4" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )
      }
      actions={
        <Button asChild variant="link" size="sm" className="px-0">
          <Link to="/memory/permissions">{t("memoryLearning.routines.manage")}</Link>
        </Button>
      }
    />
  );
}
