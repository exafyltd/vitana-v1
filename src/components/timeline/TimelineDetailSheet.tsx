/**
 * VTID-05170 — one moment, readable: what happened, when, how it affected the
 * Vitana Index (before → after per pillar, only when measured), whether
 * Vitana learns from it (switch = hide from Vitana), Open and Delete.
 * Bottom sheet on phones, inline-end panel on desktop (RTL-aware).
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTimelineActions, useTimelineItem } from "@/hooks/useTimeline";
import { pillarLabel } from "@/hooks/useVitanaIndex";
import { notifyError, notifySuccess, t } from "@/lib/i18n-toast";
import { fmtDateTime, fmtNumber } from "@/lib/locale-format";
import { PILLAR_KEYS } from "@/lib/timeline-api";
import { CATEGORY_LINK, PILLAR_STYLE, momentFacts, momentTitle, signed } from "./timeline-meta";

function inlineEndSide(): "left" | "right" {
  if (typeof document === "undefined") return "right";
  return document.documentElement.dir === "rtl" ? "left" : "right";
}

export function TimelineDetailSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const isMobile = useIsMobile();
  const { data, isLoading, isError } = useTimelineItem(id);
  const { hide, remove } = useTimelineActions();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const item = data?.item;
  const detail = data?.detail;
  const link = item ? CATEGORY_LINK[item.category] : undefined;

  const measured = item?.influence?.kind === "measured";
  const changed = PILLAR_KEYS.filter((p) => (item?.influence?.delta_pillars?.[p] ?? 0) !== 0);

  return (
    <Sheet open={!!id} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side={isMobile ? "bottom" : inlineEndSide()}
        className="max-h-screen w-full overflow-y-auto sm:max-w-md"
        data-testid="timeline-detail"
      >
        <SheetHeader className="text-start">
          <SheetTitle>{item ? momentTitle(item) : t("timeline.detail.loading")}</SheetTitle>
          <SheetDescription>
            {item ? [fmtDateTime(item.at, { dateStyle: "medium", timeStyle: "short" }), ...momentFacts(item)].join(" · ") : ""}
          </SheetDescription>
        </SheetHeader>

        {isLoading && (
          <div className="mt-4 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}
        {isError && <p className="mt-4 text-sm text-muted-foreground">{t("timeline.detail.error")}</p>}

        {item && detail && (
          <div className="mt-5 space-y-5">
            <section className="space-y-2" aria-labelledby="timeline-detail-index">
              <h3 id="timeline-detail-index" className="text-sm font-semibold">{t("timeline.detail.indexTitle")}</h3>
              {measured && changed.length > 0 ? (
                <ul className="space-y-1.5" data-testid="timeline-detail-measured">
                  {changed.map((p) => {
                    const before = Number(detail.index_before?.[p] ?? 0);
                    const after = Number(detail.index_after?.[p] ?? 0);
                    return (
                      <li key={p} className={`flex items-center justify-between rounded-vcard-sm px-3 py-2 text-sm ${PILLAR_STYLE[p].tint}`}>
                        <span>{pillarLabel(p)}</span>
                        <span className="tabular-nums">
                          {t("timeline.detail.beforeAfter", { before: fmtNumber(before), after: fmtNumber(after), delta: signed(after - before) })}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : item.influence?.kind === "counted" && item.influence.pillar ? (
                <p className="text-sm text-muted-foreground">{t("timeline.detail.counted", { pillar: pillarLabel(item.influence.pillar) })}</p>
              ) : (
                <p className="text-sm text-muted-foreground">{t("timeline.detail.noInfluence")}</p>
              )}
            </section>

            {item.sensitivity === "special_category" && (
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {t("timeline.detail.sensitive")}
              </p>
            )}

            <section className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{t("timeline.detail.learnTitle")}</p>
                <p className="text-sm text-muted-foreground">{t(item.hidden_from_ai ? "timeline.detail.learnOff" : "timeline.detail.learnOn")}</p>
              </div>
              <Switch
                checked={!item.hidden_from_ai}
                disabled={hide.isPending}
                aria-label={t("timeline.detail.learnTitle")}
                data-testid="timeline-learn-switch"
                onCheckedChange={(on) =>
                  hide.mutate(
                    { id: item.id, hidden: !on },
                    { onError: () => notifyError("timeline.toast.hideFailed") },
                  )
                }
              />
            </section>

            <div className="flex flex-wrap gap-2">
              {link && (
                <Button asChild variant="outline" size="sm">
                  <Link to={link}>{t("timeline.detail.open")}</Link>
                </Button>
              )}
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setConfirmDelete(true)} data-testid="timeline-delete">
                <Trash2 className="me-1.5 h-4 w-4" aria-hidden />
                {t("timeline.detail.delete")}
              </Button>
            </div>
          </div>
        )}

        <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("timeline.delete.title")}</AlertDialogTitle>
              <AlertDialogDescription>{t("timeline.delete.description")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("timeline.delete.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  item &&
                  remove.mutate(item.id, {
                    onSuccess: () => {
                      notifySuccess("timeline.toast.deleted");
                      onClose();
                    },
                    onError: () => notifyError("timeline.toast.deleteFailed"),
                  })
                }
              >
                {t("timeline.delete.confirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}
