/**
 * VTID-05172 — "Your usage data": how many stored-but-never-shown rows exist
 * (screen visits, technical traces), a JSON export, and delete-all behind a
 * confirmation (also deletes the routines learned from them).
 */
import { useState } from "react";
import { Download, Trash2 } from "lucide-react";
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
import { VCard, VCardSkeleton } from "@/components/ui/vcard";
import { useDeleteUsageData, useUsageData } from "@/hooks/useMemoryLearning";
import { notifyError, notifySuccess, t } from "@/lib/i18n-toast";
import { fmtNumber } from "@/lib/locale-format";
import { exportUsageData } from "@/lib/memory-learning-api";

export function UsageDataCard() {
  const { data, isLoading } = useUsageData();
  const del = useDeleteUsageData();
  const [confirm, setConfirm] = useState(false);
  const [exporting, setExporting] = useState(false);
  if (isLoading) return <VCardSkeleton size="standard" />;
  const available = !!data?.available && typeof data.count === "number";

  const onExport = async () => {
    setExporting(true);
    try {
      const blob = await exportUsageData();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "vitana-usage-data.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      notifyError("memoryLearning.toast.saveFailed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <VCard
      size="standard"
      data-testid="memory-usage-data"
      title={t("memoryLearning.usage.title")}
      body={
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{t("memoryLearning.usage.description")}</p>
          <p className="text-sm font-medium" data-testid="memory-usage-count">
            {available ? t("memoryLearning.usage.count", { n: fmtNumber(data!.count as number) }) : t("memoryLearning.usage.countUnavailable")}
          </p>
        </div>
      }
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={!available || exporting} onClick={() => void onExport()} data-testid="memory-usage-export">
            <Download className="me-1.5 h-4 w-4" aria-hidden />
            {t("memoryLearning.usage.export")}
          </Button>
          <Button variant="ghost" size="sm" className="text-destructive" disabled={!available || del.isPending} onClick={() => setConfirm(true)} data-testid="memory-usage-delete">
            <Trash2 className="me-1.5 h-4 w-4" aria-hidden />
            {t("memoryLearning.usage.delete")}
          </Button>
          <AlertDialog open={confirm} onOpenChange={setConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("memoryLearning.usage.deleteTitle")}</AlertDialogTitle>
                <AlertDialogDescription>{t("memoryLearning.usage.deleteDescription")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("memoryLearning.usage.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  data-testid="memory-usage-delete-confirm"
                  onClick={() =>
                    del.mutate(undefined, {
                      onSuccess: () => notifySuccess("memoryLearning.toast.deleted"),
                      onError: () => notifyError("memoryLearning.toast.saveFailed"),
                    })
                  }
                >
                  {t("memoryLearning.usage.confirm")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      }
    />
  );
}
