/** VTID-03873 — edit the tenant's approval policy (PUT /policy, approvals.policy) with a before/after review; every save is audited by the gateway. */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ResponsiveDialog, ResponsiveDialogBody, ResponsiveDialogContent, ResponsiveDialogDescription, ResponsiveDialogFooter, ResponsiveDialogHeader, ResponsiveDialogTitle } from "@/components/ui/responsive-dialog";
import type { BackOfficePolicy } from "@/hooks/useBackOfficeCommands";
import { usePolicyEdit } from "@/hooks/useBackOfficeDecisions";
import { policyChanges, validatePolicyEdit } from "@/lib/backoffice-approvals";
import { formatAed } from "@/lib/backoffice-format";
import { t } from "@/lib/i18n-toast";

export function PolicyEditDialog({ current, open, onOpenChange }: { current: BackOfficePolicy; open: boolean; onOpenChange: (open: boolean) => void }) {
  const edit = usePolicyEdit();
  const [threshold, setThreshold] = useState(String(current.high_risk_amount_threshold));
  const [mfa, setMfa] = useState(current.require_mfa_for_high);
  const [showIssues, setShowIssues] = useState(false);
  const { issues, body } = validatePolicyEdit(threshold, mfa);
  const changes = body ? policyChanges(current, body) : [];
  const onOff = (v: boolean) => (v ? t("screens.backoffice.policies.on") : t("screens.backoffice.policies.off"));
  const toReview = () => { setShowIssues(true); if (body && changes.length > 0) edit.review(); };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent data-testid="policy-edit-dialog" data-phase={edit.phase}>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t("screens.backoffice.policyEdit.title")}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>{edit.phase === "form" ? t("screens.backoffice.policyEdit.description") : edit.phase === "review" ? t("screens.backoffice.policyEdit.review") : edit.phase === "done" ? t("screens.backoffice.policyEdit.done") : edit.phase === "failed" ? t("screens.backoffice.policyEdit.failed") : t("screens.backoffice.draft.submitting")}</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody>
          {edit.phase === "form" && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="policy-threshold">{t("screens.backoffice.policies.threshold")}</Label>
                <Input id="policy-threshold" name="high_risk_amount_threshold" type="number" inputMode="numeric" min={0} step="1" value={threshold} onChange={(e) => setThreshold(e.target.value)} aria-invalid={showIssues && !!issues.threshold} dir="ltr" />
                {showIssues && issues.threshold && <p role="alert" className="text-xs text-destructive">{t("screens.backoffice.policyEdit.issues.invalidThreshold")}</p>}
                <p className="text-xs text-muted-foreground">{t("screens.backoffice.policies.thresholdHint")}</p>
              </div>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <Label htmlFor="policy-mfa">{t("screens.backoffice.policies.mfa")}</Label>
                  <p className="text-xs text-muted-foreground">{t("screens.backoffice.policies.mfaHint")}</p>
                </div>
                <Switch id="policy-mfa" name="require_mfa_for_high" checked={mfa} onCheckedChange={setMfa} data-testid="policy-mfa-switch" />
              </div>
              {showIssues && body && changes.length === 0 && <p role="alert" className="text-xs text-muted-foreground">{t("screens.backoffice.policyEdit.noChanges")}</p>}
            </div>
          )}
          {(edit.phase === "review" || edit.phase === "submitting") && body && (
            <div className="space-y-3" data-testid="policy-review">
              <p className="text-sm text-muted-foreground">{t("screens.backoffice.policyEdit.reviewHint")}</p>
              <table className="w-full text-sm rounded-md border">
                <thead className="bg-muted/40 text-xs text-muted-foreground"><tr><th scope="col" className="px-3 py-1 text-start font-medium">{t("screens.backoffice.policyEdit.setting")}</th><th scope="col" className="px-3 py-1 text-start font-medium">{t("screens.backoffice.policyEdit.before")}</th><th scope="col" className="px-3 py-1 text-start font-medium">{t("screens.backoffice.policyEdit.after")}</th></tr></thead>
                <tbody>
                  {changes.includes("high_risk_amount_threshold") && <tr className="border-t"><td className="px-3 py-1">{t("screens.backoffice.policies.threshold")}</td><td className="px-3 py-1" dir="ltr">{formatAed(current.high_risk_amount_threshold)}</td><td className="px-3 py-1 font-medium" dir="ltr">{formatAed(body.high_risk_amount_threshold)}</td></tr>}
                  {changes.includes("require_mfa_for_high") && <tr className="border-t"><td className="px-3 py-1">{t("screens.backoffice.policies.mfa")}</td><td className="px-3 py-1">{onOff(current.require_mfa_for_high)}</td><td className="px-3 py-1 font-medium">{onOff(body.require_mfa_for_high)}</td></tr>}
                </tbody>
              </table>
              <p className="text-xs text-muted-foreground">{t("screens.backoffice.policyEdit.audited")}</p>
            </div>
          )}
          {edit.phase === "done" && <div role="status" className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm" data-testid="policy-done">{t("screens.backoffice.policyEdit.doneLine")}</div>}
          {edit.phase === "failed" && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm" data-testid="policy-failed"><div className="font-medium">{edit.error === "FORBIDDEN" ? t("screens.backoffice.errors.noCapability") : t("screens.backoffice.errors.generic")}</div>{edit.error && <p className="text-xs text-muted-foreground mt-1">{t("screens.backoffice.draft.reason")} <code className="font-mono" dir="ltr">{edit.error}</code></p>}</div>}
        </ResponsiveDialogBody>
        <ResponsiveDialogFooter>
          {edit.phase === "form" && <><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("screens.backoffice.draft.cancel")}</Button><Button type="button" onClick={toReview} data-testid="policy-review-btn">{t("screens.backoffice.draft.toReview")}</Button></>}
          {edit.phase === "review" && body && <><Button type="button" variant="outline" onClick={edit.back}>{t("screens.backoffice.draft.back")}</Button><Button type="button" onClick={() => edit.save(body)} data-testid="policy-save">{t("screens.backoffice.policyEdit.save")}</Button></>}
          {edit.phase === "submitting" && <Button type="button" disabled aria-busy="true">{t("screens.backoffice.draft.submitting")}</Button>}
          {(edit.phase === "done" || edit.phase === "failed") && <Button type="button" onClick={() => onOpenChange(false)} data-testid="policy-close">{t("screens.backoffice.draft.close")}</Button>}
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
