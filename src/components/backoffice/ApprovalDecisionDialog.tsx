/**
 * VTID-03873 — the approver's dialog. Shows the queued command as the gateway
 * exposes it (type, ERPClaw action, tier, escalations, requester — the payload
 * itself is not on GET /commands/:id yet, see acceptance.md), takes a decision
 * note (required to reject), and posts the verdict. The outcome is shown as it
 * is: executed with the bridge receipt, approved-but-failed, or refused with the
 * orchestrator's reason. Nothing here talks to ERPClaw directly.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveDialog, ResponsiveDialogBody, ResponsiveDialogContent, ResponsiveDialogDescription, ResponsiveDialogFooter, ResponsiveDialogHeader, ResponsiveDialogTitle } from "@/components/ui/responsive-dialog";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { ChannelBadge, TierBadge } from "@/components/backoffice/CommandBadges";
import ReceiptDetail from "@/components/backoffice/ReceiptDetail";
import { QuerySkeleton } from "@/components/backoffice/QueryState";
import { shortId, useBackOfficeCommand, type BackOfficeApproval } from "@/hooks/useBackOfficeCommands";
import { useApprovalDecision } from "@/hooks/useBackOfficeDecisions";
import { validateDecisionNote, type Verdict } from "@/lib/backoffice-approvals";
import { fmtDateTime } from "@/lib/locale-format";
import { t } from "@/lib/i18n-toast";

export function ApprovalDecisionDialog({ approval, verdict, open, onOpenChange }: { approval: BackOfficeApproval; verdict: Verdict; open: boolean; onOpenChange: (open: boolean) => void }) {
  const cmd = useBackOfficeCommand(approval.command_id);
  const decision = useApprovalDecision(approval.id, verdict);
  const [note, setNote] = useState("");
  const [showIssue, setShowIssue] = useState(false);
  const issue = validateDecisionNote(verdict, note);
  const c = cmd.data;
  const done = decision.phase === "done";
  const out = decision.outcome;
  const resultCmd = decision.result?.body.command ?? null;

  const confirm = () => { setShowIssue(true); if (!issue) void decision.submit(note); };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent data-testid={`decide-dialog-${verdict}`} data-phase={decision.phase}>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t(`screens.backoffice.decide.${verdict}.title`)}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>{done ? t(`screens.backoffice.decide.outcome.${out?.kind ?? "error"}`) : t(`screens.backoffice.decide.${verdict}.description`)}</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody>
          <div className="space-y-3">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm rounded-md border p-3 bg-muted/30">
              <dt className="text-muted-foreground">{t("screens.backoffice.approvals.command")}</dt><dd className="font-mono text-xs" dir="ltr">{c ? c.type : shortId(approval.command_id)}</dd>
              {c && <><dt className="text-muted-foreground">{t("screens.backoffice.draft.action")}</dt><dd className="font-mono text-xs" dir="ltr">{c.action}</dd></>}
              {c && <><dt className="text-muted-foreground">{t("screens.backoffice.commands.tier")}</dt><dd><TierBadge tier={c.tier} /></dd></>}
              {c && c.escalations?.length > 0 && <><dt className="text-muted-foreground">{t("screens.backoffice.decide.escalations")}</dt><dd className="flex flex-wrap gap-1">{c.escalations.map((e) => <AdminStatusBadge key={e} variant="warning" className="whitespace-nowrap">{e}</AdminStatusBadge>)}</dd></>}
              {c && <><dt className="text-muted-foreground">{t("screens.backoffice.commands.channel")}</dt><dd><ChannelBadge channel={c.channel} /></dd></>}
              <dt className="text-muted-foreground">{t("screens.backoffice.approvals.requester")}</dt><dd className="font-mono text-xs" dir="ltr">{shortId(approval.requester_id)}</dd>
              <dt className="text-muted-foreground">{t("screens.backoffice.approvals.requested")}</dt><dd className="text-xs">{fmtDateTime(approval.created_at, { dateStyle: "medium", timeStyle: "short" })}</dd>
              <dt className="text-muted-foreground">{t("screens.backoffice.approvals.approverNeeds")}</dt><dd><AdminStatusBadge variant="error" className="whitespace-nowrap">{approval.approve_capability}</AdminStatusBadge></dd>
              {approval.reason && <><dt className="text-muted-foreground">{t("screens.backoffice.commands.reason")}</dt><dd className="font-mono text-xs" dir="ltr">{approval.reason}</dd></>}
            </dl>
            {cmd.isLoading && <QuerySkeleton rows={2} />}
            <p className="text-xs text-muted-foreground">{t("screens.backoffice.decide.payloadNote")}</p>
            {!done && (
              <div className="space-y-1">
                <Label htmlFor="decision-note">{t("screens.backoffice.decide.note")}{verdict === "reject" && <span aria-hidden="true" className="text-destructive"> *</span>}</Label>
                <Textarea id="decision-note" name="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} aria-invalid={showIssue && !!issue} aria-describedby={showIssue && issue ? "decision-note-issue" : undefined} placeholder={t(`screens.backoffice.decide.${verdict}.notePlaceholder`)} />
                {showIssue && issue && <p id="decision-note-issue" role="alert" className="text-xs text-destructive">{t(`screens.backoffice.decide.issues.${issue}`)}</p>}
                <p className="text-xs text-muted-foreground">{t(`screens.backoffice.decide.${verdict}.whatHappens`)}</p>
              </div>
            )}
            {done && out && (
              <div className="space-y-2" data-testid={`decide-outcome-${out.kind}`}>
                <div role={out.kind === "executed" || out.kind === "rejected" ? "status" : "alert"} className={`rounded-md border px-4 py-3 text-sm ${out.kind === "executed" ? "border-emerald-500/30 bg-emerald-500/5" : out.kind === "rejected" ? "border-border bg-muted/30" : "border-destructive/30 bg-destructive/5"}`}>
                  <div className="font-medium">{out.kind === "refused" ? t(`screens.backoffice.decide.refusals.${out.key}`) : out.kind === "executedButFailed" ? t(`screens.backoffice.errors.${out.key}`) : out.kind === "error" ? t(`screens.backoffice.errors.${out.key}`) : verdict === "reject" ? t("screens.backoffice.decide.outcome.rejectedLine") : t("screens.backoffice.decide.outcome.executedLine")}</div>
                  {decision.result?.body.error && <p className="text-xs text-muted-foreground mt-1">{t("screens.backoffice.draft.reason")} <code className="font-mono" dir="ltr">{decision.result.body.error}</code></p>}
                  {out.kind === "executedButFailed" && <p className="text-xs text-muted-foreground mt-1">{t("screens.backoffice.decide.outcome.executedButFailedHint")}</p>}
                </div>
                {resultCmd?.receipt && <ReceiptDetail receipt={resultCmd.receipt} />}
              </div>
            )}
          </div>
        </ResponsiveDialogBody>
        <ResponsiveDialogFooter>
          {!done ? (
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={decision.phase === "submitting"}>{t("screens.backoffice.draft.cancel")}</Button>
              <Button type="button" variant={verdict === "reject" ? "destructive" : "default"} onClick={confirm} disabled={decision.phase === "submitting"} aria-busy={decision.phase === "submitting"} data-testid="decide-confirm">{t(`screens.backoffice.decide.${verdict}.confirm`)}</Button>
            </>
          ) : (
            <Button type="button" onClick={() => onOpenChange(false)} data-testid="decide-close">{t("screens.backoffice.draft.close")}</Button>
          )}
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
