/**
 * VTID-03859 — the Draft-tier review card (design gate §1.3). Three steps in one
 * dialog: the form, the review card (typed command, ERPClaw action, tier,
 * capability, the exact payload, the idempotency key) and the outcome. The write
 * happens only when the user accepts the card; a rejected or failed command is
 * shown with its reason, never swallowed.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveDialog, ResponsiveDialogBody, ResponsiveDialogContent, ResponsiveDialogDescription, ResponsiveDialogFooter, ResponsiveDialogHeader, ResponsiveDialogTitle } from "@/components/ui/responsive-dialog";
import { Plus } from "lucide-react";
import { TierBadge } from "@/components/backoffice/CommandBadges";
import ReceiptDetail from "@/components/backoffice/ReceiptDetail";
import { useMyErpAccess } from "@/hooks/useBackOfficeAccess";
import { useDraftCommand } from "@/hooks/useDraftCommand";
import { hasAnyCapability } from "@/hooks/useBackOfficeCommands";
import { DRAFT_FORMS, buildDraftPayload, draftResultSummary, initialDraftValues, validateDraft, type DraftFormId, type DraftFormSpec, type DraftIssue, type DraftValues } from "@/lib/backoffice-draft";
import { t } from "@/lib/i18n-toast";

const ISSUE_KEY: Record<DraftIssue, string> = { required: "screens.backoffice.draft.issues.required", invalidEmail: "screens.backoffice.draft.issues.invalidEmail", invalidDate: "screens.backoffice.draft.issues.invalidDate", invalidOption: "screens.backoffice.draft.issues.invalidOption" };

function fieldLabel(key: string): string {
  return t(`screens.backoffice.draft.fields.${key}`);
}

function DraftForm({ spec, values, issues, onChange }: { spec: DraftFormSpec; values: DraftValues; issues: Record<string, DraftIssue>; onChange: (k: string, v: string) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {spec.fields.map((f) => {
        const id = `draft-${spec.id}-${f.key}`;
        const issue = issues[f.key];
        const wide = f.kind === "textarea";
        return (
          <div key={f.key} className={`space-y-1 ${wide ? "sm:col-span-2" : ""}`}>
            <Label htmlFor={id}>{fieldLabel(f.key)}{f.required && <span aria-hidden="true" className="text-destructive"> *</span>}</Label>
            {f.kind === "select" ? (
              <Select value={values[f.key] ?? ""} onValueChange={(v) => onChange(f.key, v)}>
                <SelectTrigger id={id} aria-invalid={!!issue} data-testid={`draft-select-${f.key}`}><SelectValue placeholder={t("screens.backoffice.draft.choose")} /></SelectTrigger>
                <SelectContent>
                  {(f.options ?? []).map((o) => <SelectItem key={o} value={o}>{t(`screens.backoffice.draft.choices.${o}`)}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : f.kind === "textarea" ? (
              <Textarea id={id} name={f.key} value={values[f.key] ?? ""} onChange={(e) => onChange(f.key, e.target.value)} rows={3} aria-invalid={!!issue} />
            ) : (
              <Input id={id} name={f.key} type={f.kind === "text" ? "text" : f.kind} value={values[f.key] ?? ""} onChange={(e) => onChange(f.key, e.target.value)} required={f.required} aria-invalid={!!issue} aria-describedby={issue ? `${id}-issue` : undefined} dir={f.kind === "email" || f.kind === "tel" || f.kind === "date" ? "ltr" : undefined} />
            )}
            {issue && <p id={`${id}-issue`} className="text-xs text-destructive" role="alert">{t(ISSUE_KEY[issue])}</p>}
          </div>
        );
      })}
    </div>
  );
}

function ReviewCard({ spec, payload, idempotencyKey }: { spec: DraftFormSpec; payload: Record<string, string>; idempotencyKey: string }) {
  return (
    <div className="space-y-3" data-testid="draft-review-card">
      <p className="text-sm text-muted-foreground">{t("screens.backoffice.draft.reviewHint")}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm rounded-md border p-3 bg-muted/30">
        <dt className="text-muted-foreground">{t("screens.backoffice.draft.command")}</dt><dd className="font-mono text-xs" dir="ltr">{spec.type}</dd>
        <dt className="text-muted-foreground">{t("screens.backoffice.draft.action")}</dt><dd className="font-mono text-xs" dir="ltr">{spec.action}</dd>
        <dt className="text-muted-foreground">{t("screens.backoffice.draft.tier")}</dt><dd><TierBadge tier="draft" /></dd>
        <dt className="text-muted-foreground">{t("screens.backoffice.draft.capability")}</dt><dd className="font-mono text-xs" dir="ltr">{spec.capability}</dd>
        <dt className="text-muted-foreground">{t("screens.backoffice.draft.idempotencyKey")}</dt><dd className="font-mono text-[11px] break-all" dir="ltr">{idempotencyKey}</dd>
      </dl>
      <div className="rounded-md border">
        <div className="px-3 py-2 text-xs font-medium border-b bg-muted/40">{t("screens.backoffice.draft.payload")}</div>
        <dl className="px-3 py-1">
          {Object.entries(payload).map(([k, v]) => (
            <div key={k} className="grid grid-cols-[minmax(8rem,auto)_1fr] gap-3 py-1 text-sm border-b last:border-b-0">
              <dt className="text-muted-foreground">{fieldLabel(k)}<span className="block font-mono text-[10px] text-muted-foreground/70" dir="ltr">{k}</span></dt>
              <dd className="break-words">{spec.fields.find((f) => f.key === k)?.kind === "select" ? t(`screens.backoffice.draft.choices.${v}`) : v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <p className="text-xs text-muted-foreground">{t("screens.backoffice.draft.whatHappens")}</p>
    </div>
  );
}

export function DraftCommandDialog({ formId, open, onOpenChange }: { formId: DraftFormId; open: boolean; onOpenChange: (open: boolean) => void }) {
  const spec = DRAFT_FORMS[formId];
  const draft = useDraftCommand(spec);
  const [values, setValues] = useState<DraftValues>(() => initialDraftValues(spec));
  const [showIssues, setShowIssues] = useState(false);
  const issues = validateDraft(spec, values);
  const payload = buildDraftPayload(spec, values);
  const cmd = draft.outcome?.body.command ?? null;
  const summary = draftResultSummary(cmd?.receipt?.result);
  const entity = (draft.outcome?.body as { entity?: { field?: string; ref?: string; candidates?: unknown[] } } | undefined)?.entity;

  const close = (next: boolean) => {
    if (!next) { draft.reset(); setValues(initialDraftValues(spec)); setShowIssues(false); }
    onOpenChange(next);
  };
  const toReview = () => {
    setShowIssues(true);
    if (Object.keys(issues).length === 0) draft.review();
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={close}>
      <ResponsiveDialogContent data-testid={`draft-dialog-${spec.id}`} data-phase={draft.phase}>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t(`screens.backoffice.draft.forms.${spec.id}.title`)}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>{draft.phase === "form" ? t(`screens.backoffice.draft.forms.${spec.id}.description`) : draft.phase === "review" ? t("screens.backoffice.draft.review") : draft.phase === "done" ? t("screens.backoffice.draft.done") : draft.phase === "failed" ? t("screens.backoffice.draft.failed") : t("screens.backoffice.draft.submitting")}</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody>
          {draft.phase === "form" && <DraftForm spec={spec} values={values} issues={showIssues ? issues : {}} onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))} />}
          {(draft.phase === "review" || draft.phase === "submitting") && <ReviewCard spec={spec} payload={payload} idempotencyKey={draft.key} />}
          {draft.phase === "done" && (
            <div className="space-y-3" data-testid="draft-done">
              <div role="status" className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm">
                <div className="font-medium">{summary.reference ? t("screens.backoffice.draft.createdWithRef", { ref: summary.reference }) : t("screens.backoffice.draft.created")}</div>
                {summary.message && <p className="text-xs text-muted-foreground mt-1" dir="auto">{summary.message}</p>}
                {cmd?.replayed && <p className="text-xs text-muted-foreground mt-1">{t("screens.backoffice.draft.replayed")}</p>}
              </div>
              <p className="text-xs text-muted-foreground">{t("screens.backoffice.draft.doneHint")}</p>
              <ReceiptDetail receipt={cmd?.receipt ?? null} />
            </div>
          )}
          {draft.phase === "failed" && (
            <div className="space-y-3" data-testid="draft-failed">
              <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
                <div className="font-medium">{t(`screens.backoffice.errors.${draft.errorKey ?? "generic"}`)}</div>
                {draft.reason && <p className="text-xs text-muted-foreground mt-1">{t("screens.backoffice.draft.reason")} <code className="font-mono" dir="ltr">{draft.reason}</code></p>}
                {entity?.field && <p className="text-xs text-muted-foreground mt-1">{t("screens.backoffice.draft.entityHint", { field: fieldLabel(entity.field), ref: entity.ref ?? "", count: String(entity.candidates?.length ?? 0) })}</p>}
              </div>
              <p className="text-xs text-muted-foreground">{t("screens.backoffice.draft.failedHint")}</p>
              {cmd?.receipt && <ReceiptDetail receipt={cmd.receipt} />}
            </div>
          )}
        </ResponsiveDialogBody>
        <ResponsiveDialogFooter>
          {draft.phase === "form" && (
            <>
              <Button type="button" variant="outline" onClick={() => close(false)}>{t("screens.backoffice.draft.cancel")}</Button>
              <Button type="button" onClick={toReview} data-testid="draft-review">{t("screens.backoffice.draft.toReview")}</Button>
            </>
          )}
          {draft.phase === "review" && (
            <>
              <Button type="button" variant="outline" onClick={draft.back}>{t("screens.backoffice.draft.back")}</Button>
              <Button type="button" onClick={() => draft.submit(payload)} data-testid="draft-accept">{t("screens.backoffice.draft.accept")}</Button>
            </>
          )}
          {draft.phase === "submitting" && <Button type="button" disabled aria-busy="true">{t("screens.backoffice.draft.submitting")}</Button>}
          {draft.phase === "done" && <Button type="button" onClick={() => close(false)} data-testid="draft-close">{t("screens.backoffice.draft.close")}</Button>}
          {draft.phase === "failed" && (
            <>
              <Button type="button" variant="outline" onClick={() => close(false)}>{t("screens.backoffice.draft.close")}</Button>
              <Button type="button" onClick={draft.back} data-testid="draft-retry">{t("screens.backoffice.draft.editAndRetry")}</Button>
            </>
          )}
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

/** The "New …" button a Read screen puts in its header. Renders nothing without the capability — the gateway enforces it anyway. */
export function DraftCommandButton({ formId }: { formId: DraftFormId }) {
  const me = useMyErpAccess();
  const [open, setOpen] = useState(false);
  const spec = DRAFT_FORMS[formId];
  const allowed = !!me.data && (me.data.is_exafy_admin || hasAnyCapability(me.data.capabilities, [spec.capability]));
  if (!allowed) return null;
  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)} data-testid={`draft-open-${formId}`}>
        <Plus className="h-4 w-4 me-1" aria-hidden="true" />{t(`screens.backoffice.draft.forms.${formId}.button`)}
      </Button>
      {open && <DraftCommandDialog formId={formId} open={open} onOpenChange={setOpen} />}
    </>
  );
}
