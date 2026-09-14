/**
 * BackOffice › Approvals › Policies (BO-055) — VTID-03849 Read tier; VTID-03873
 * edit (PUT /policy, approvals.policy) through PolicyEditDialog — every save is
 * audited by the gateway (policy.updated with before/after).
 */
import { useState } from "react";
import { Pencil, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PolicyEditDialog } from "@/components/backoffice/PolicyEditDialog";
import { useMyErpAccess } from "@/hooks/useBackOfficeAccess";
import { hasAnyCapability } from "@/hooks/useBackOfficeCommands";
import BackOfficePage from "@/components/backoffice/BackOfficePage";
import DataSourceNote from "@/components/backoffice/DataSourceNote";
import QueryState from "@/components/backoffice/QueryState";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBackOfficePolicy } from "@/hooks/useBackOfficeCommands";
import { formatAed } from "@/lib/backoffice-format";
import { t } from "@/lib/i18n-toast";

const POLICY_CAPS = ["approvals.policy", "audit.view"] as const;

export default function BackOfficePolicies() {
  const policy = useBackOfficePolicy();
  const me = useMyErpAccess();
  const canEdit = !!me.data && (me.data.is_exafy_admin || hasAnyCapability(me.data.capabilities, ["approvals.policy"]));
  const [editing, setEditing] = useState(false);
  // One mount per opening: keying on the policy values would remount the dialog (back to the form) the moment a save refetches them.
  const [editSession, setEditSession] = useState(0);
  const openEdit = () => { setEditSession((n) => n + 1); setEditing(true); };
  const p = policy.data?.policy;
  const d = policy.data?.defaults;
  const isDefaultThreshold = !!p && !!d && p.high_risk_amount_threshold === d.high_risk_amount_threshold;
  const isDefaultMfa = !!p && !!d && p.require_mfa_for_high === d.require_mfa_for_high;

  return (
    <BackOfficePage sectionKey="approvals" screenId="BO-055" emoji="📜" title={t("screens.backoffice.policies.title")} description={t("screens.backoffice.policies.description")} capabilities={POLICY_CAPS} rightAction={canEdit && p ? <Button type="button" size="sm" onClick={openEdit} data-testid="policy-edit-open"><Pencil className="h-4 w-4 me-1" aria-hidden="true" />{t("screens.backoffice.policyEdit.button")}</Button> : undefined}>
      {!canEdit && me.data && <p className="text-xs text-muted-foreground">{t("screens.backoffice.policyEdit.readOnlyHint")}</p>}
      {editing && p && <PolicyEditDialog key={editSession} current={p} open onOpenChange={setEditing} />}
      {QueryState({ isLoading: policy.isLoading, error: policy.error, rows: 2 }) ?? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">{t("screens.backoffice.policies.threshold")}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="text-3xl font-semibold" data-testid="policy-threshold">{formatAed(p?.high_risk_amount_threshold ?? 0)}</div>
              <p className="text-xs text-muted-foreground">{t("screens.backoffice.policies.thresholdHint")}</p>
              <AdminStatusBadge variant={isDefaultThreshold ? "inactive" : "info"}>
                {isDefaultThreshold ? t("screens.backoffice.policies.default") : t("screens.backoffice.policies.custom", { value: formatAed(d?.high_risk_amount_threshold ?? 0) })}
              </AdminStatusBadge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                {t("screens.backoffice.policies.mfa")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-3xl font-semibold" data-testid="policy-mfa">{p?.require_mfa_for_high ? t("screens.backoffice.policies.on") : t("screens.backoffice.policies.off")}</div>
              <p className="text-xs text-muted-foreground">{t("screens.backoffice.policies.mfaHint")}</p>
              <AdminStatusBadge variant={isDefaultMfa ? "inactive" : "info"}>
                {isDefaultMfa ? t("screens.backoffice.policies.default") : t("screens.backoffice.policies.custom", { value: d?.require_mfa_for_high ? t("screens.backoffice.policies.on") : t("screens.backoffice.policies.off") })}
              </AdminStatusBadge>
            </CardContent>
          </Card>
        </div>
      )}
      <div className="rounded-md border bg-muted/30 px-4 py-3 text-sm space-y-1">
        <div className="font-medium">{t("screens.backoffice.policies.rulesTitle")}</div>
        <ul className="list-disc ps-5 text-xs text-muted-foreground space-y-1">
          <li>{t("screens.backoffice.policies.ruleMakerChecker")}</li>
          <li>{t("screens.backoffice.policies.ruleCapability")}</li>
          <li>{t("screens.backoffice.policies.ruleVoice")}</li>
          <li>{t("screens.backoffice.policies.ruleEscalation")}</li>
        </ul>
      </div>
      <DataSourceNote source="gateway" />
    </BackOfficePage>
  );
}
