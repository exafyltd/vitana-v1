import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useLifeCompass } from "@/hooks/useLifeCompass";
import { t } from "@/lib/i18n-toast";

function todayIso(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Lightweight goal-target capture for My Journey. Lets a user attach a
 * deadline (which powers the North Star countdown) and an optional quantified
 * target to their existing Life Compass goal. Persists a new compass version
 * via useLifeCompass().updateCompass.
 */
export function GoalSetupDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}) {
  const { compass, updateCompassAsync, isUpdating } = useLifeCompass();

  const [goalText, setGoalText] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [targetUnit, setTargetUnit] = useState("");

  // Prefill from the active compass each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setGoalText(compass?.primary_goal ?? "");
    setTargetDate(compass?.target_date ?? "");
    setTargetValue(compass?.target_value != null ? String(compass.target_value) : "");
    setTargetUnit(compass?.target_unit ?? "");
  }, [open, compass]);

  const canSave = goalText.trim().length > 0 && targetDate.length > 0 && !isUpdating;

  const handleSave = async () => {
    if (!canSave) return;
    const parsedValue = targetValue.trim() === "" ? null : Number(targetValue);
    try {
      await updateCompassAsync({
        primary_goal: goalText.trim(),
        category: compass?.category ?? "general",
        target_date: targetDate,
        target_value: Number.isFinite(parsedValue as number) ? (parsedValue as number) : null,
        target_unit: targetUnit.trim() === "" ? null : targetUnit.trim(),
      });
      onOpenChange(false);
      onSaved?.();
    } catch {
      // useLifeCompass surfaces the error toast; keep the dialog open to retry.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("screens.autopilotdashboard.goalDialogTitle")}</DialogTitle>
          <DialogDescription>{t("screens.autopilotdashboard.goalDialogSubtitle")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="goal-text">{t("screens.autopilotdashboard.goalFieldLabel")}</Label>
            <Input
              id="goal-text"
              value={goalText}
              onChange={(e) => setGoalText(e.target.value)}
              placeholder={t("screens.autopilotdashboard.goalFieldPlaceholder")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="goal-date">{t("screens.autopilotdashboard.deadlineFieldLabel")}</Label>
            <Input
              id="goal-date"
              type="date"
              min={todayIso()}
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="goal-value">{t("screens.autopilotdashboard.targetValueLabel")}</Label>
              <Input
                id="goal-value"
                type="number"
                inputMode="decimal"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-unit">{t("screens.autopilotdashboard.targetUnitLabel")}</Label>
              <Input
                id="goal-unit"
                value={targetUnit}
                onChange={(e) => setTargetUnit(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("screens.common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {t("screens.autopilotdashboard.goalDialogSave")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default GoalSetupDialog;
