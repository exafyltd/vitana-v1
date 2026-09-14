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
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { TierBadge } from "@/components/backoffice/CommandBadges";
import ReceiptDetail from "@/components/backoffice/ReceiptDetail";
import { useMyErpAccess } from "@/hooks/useBackOfficeAccess";
import { useDraftCommand } from "@/hooks/useDraftCommand";
import { hasAnyCapability, useErpRead } from "@/hooks/useBackOfficeCommands";
import { DRAFT_FORMS, buildDraftPayload, draftCapabilities, draftCreates, draftResultSummary, emptyLine, initialDraftValues, linesTotals, parseLines, validateDraft, type DraftField, type DraftFormId, type DraftFormSpec, type DraftIssue, type DraftValues, type LookupSpec } from "@/lib/backoffice-draft";
import { formatMoney } from "@/lib/backoffice-sales";
import { t } from "@/lib/i18n-toast";

const ISSUE_KEY: Record<DraftIssue, string> = { required: "screens.backoffice.draft.issues.required", invalidEmail: "screens.backoffice.draft.issues.invalidEmail", invalidDate: "screens.backoffice.draft.issues.invalidDate", invalidOption: "screens.backoffice.draft.issues.invalidOption", invalidNumber: "screens.backoffice.draft.issues.invalidNumber", lineQtyTooHigh: "screens.backoffice.draft.issues.lineQtyTooHigh", noLines: "screens.backoffice.draft.issues.noLines", tooFewLines: "screens.backoffice.draft.issues.tooFewLines", unbalanced: "screens.backoffice.draft.issues.unbalanced", lineIncomplete: "screens.backoffice.draft.issues.lineIncomplete" };

function fieldLabel(key: string): string {
  return t(`screens.backoffice.draft.fields.${key}`);
}

/** VTID-03871 — options for a `lookup` field, loaded through a typed Read; `[]` + `refused` when the read is not permitted. */
function useLookupOptions(lookup: LookupSpec | undefined, enabled: boolean) {
  const q = useErpRead<Record<string, unknown>>(lookup?.type ?? "noop", lookup?.payload ?? {}, { enabled: enabled && !!lookup });
  const rows = ((q.data?.result?.[lookup?.listKey ?? ""] as Array<Record<string, unknown>> | undefined) ?? []).filter((r) => (lookup?.keep ? lookup.keep(r) : true));
  const options = rows.map((r) => ({ value: String(r[lookup!.valueKey] ?? ""), label: String(r[lookup!.labelKey] ?? ""), code: lookup!.codeKey ? String(r[lookup!.codeKey] ?? "") : "" })).filter((o) => o.value);
  return { options, isLoading: q.isLoading, refused: !!q.error };
}

function LookupSelect({ id, name, lookup, value, onChange, invalid, testId, compact }: { id: string; name: string; lookup: LookupSpec | undefined; value: string; onChange: (v: string) => void; invalid: boolean; testId: string; compact?: boolean }) {
  const { options, isLoading, refused } = useLookupOptions(lookup, true);
  if (refused) {
    // The user may record the entry but not list the parties/accounts: keep the card usable with a typed id and say why.
    return (
      <>
        <Input id={id} name={name} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid} dir="ltr" className={`font-mono text-xs ${compact ? "h-8" : ""}`} placeholder={t("screens.backoffice.draft.lookupIdPlaceholder")} />
        {!compact && <p className="text-[11px] text-muted-foreground">{t("screens.backoffice.draft.lookupRefused", { command: lookup?.type ?? "" })}</p>}
      </>
    );
  }
  return (
    <Select value={value} onValueChange={onChange} disabled={isLoading}>
      <SelectTrigger id={id} aria-invalid={invalid} data-testid={testId} className={compact ? "h-8" : undefined}><SelectValue placeholder={isLoading ? t("screens.backoffice.draft.lookupLoading") : t("screens.backoffice.draft.choose")} /></SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.code ? `${o.code} · ${o.label}` : o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

/** Resolved label for a lookup value on the review card (the id is shown underneath either way). */
function LookupLabel({ lookup, value }: { lookup: LookupSpec | undefined; value: string }) {
  const { options } = useLookupOptions(lookup, true);
  const o = options.find((x) => x.value === value);
  return <>{o ? (o.code ? `${o.code} · ${o.label}` : o.label) : "—"}<span className="block font-mono text-[10px] text-muted-foreground break-all" dir="ltr">{value}</span></>;
}

/** VTID-03866 — editable rows for a `lines` field; rows live in the values map as a JSON array. */
function LinesEditor({ field, value, onChange, invalid }: { field: DraftField; value: string | undefined; onChange: (v: string) => void; invalid: boolean }) {
  const rows = parseLines(value);
  const cols = (field.columns ?? []).filter((c) => !c.hidden);
  const set = (i: number, key: string, v: string) => { const next = rows.map((r, j) => (j === i ? { ...r, [key]: v } : r)); onChange(JSON.stringify(next)); };
  const add = () => onChange(JSON.stringify([...rows, emptyLine(field)]));
  const remove = (i: number) => onChange(JSON.stringify(rows.filter((_, j) => j !== i)));
  const totals = field.balance ? linesTotals(field, value) : null;
  if (rows.length === 0 && !field.canAddRows) return <p className="text-sm text-muted-foreground">{t("screens.backoffice.draft.noLineRows")}</p>;
  return (
    <div className="space-y-2" data-testid={`draft-lines-${field.key}`}>
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>{cols.map((c) => <th key={c.key} scope="col" className={`px-2 py-1 font-medium ${c.kind === "number" ? "text-end" : "text-start"}`}>{fieldLabel(c.key)}</th>)}{field.canAddRows && <th scope="col" className="w-10" aria-label={t("screens.backoffice.draft.removeLine")} />}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t">
                {cols.map((c) => (
                  <td key={c.key} className={`px-2 py-1 ${c.kind === "number" ? "text-end" : ""}`}>
                    {c.display ? <span dir={c.kind === "number" ? "ltr" : undefined}>{r[c.key] ?? ""}</span> : c.kind === "lookup" ? (
                      <LookupSelect id={`draft-${field.key}-${i}-${c.key}`} name={`${field.key}.${i}.${c.key}`} lookup={c.lookup} value={r[c.key] ?? ""} onChange={(v) => set(i, c.key, v)} invalid={invalid} testId={`draft-select-${field.key}.${i}.${c.key}`} compact />
                    ) : (
                      <Input name={`${field.key}.${i}.${c.key}`} type={c.kind === "number" ? "number" : "text"} inputMode={c.kind === "number" ? "decimal" : undefined} min={c.kind === "number" ? 0 : undefined} max={c.maxFrom ? r[c.maxFrom] : undefined} step="any" value={r[c.key] ?? ""} onChange={(e) => set(i, c.key, e.target.value)} aria-invalid={invalid} aria-label={`${fieldLabel(c.key)} ${i + 1}`} className="h-8 w-28 text-end ms-auto" dir="ltr" />
                    )}
                  </td>
                ))}
                {field.canAddRows && <td className="px-1 py-1 text-end"><Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(i)} aria-label={`${t("screens.backoffice.draft.removeLine")} ${i + 1}`} disabled={rows.length <= (field.minRows ?? 1)}><Trash2 className="h-4 w-4" aria-hidden="true" /></Button></td>}
              </tr>
            ))}
          </tbody>
          {totals && (
            <tfoot className="bg-muted/40 text-xs">
              <tr>
                <td className="px-2 py-1 font-medium">{t("screens.backoffice.draft.totals")}</td>
                <td className="px-2 py-1 text-end whitespace-nowrap" dir="ltr">{formatMoney(totals.debit)}</td>
                <td className="px-2 py-1 text-end whitespace-nowrap" dir="ltr">{formatMoney(totals.credit)}</td>
                {field.canAddRows && <td />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className="flex items-center justify-between gap-2">
        {field.canAddRows ? <Button type="button" variant="outline" size="sm" onClick={add} data-testid={`draft-add-line-${field.key}`}><Plus className="h-4 w-4 me-1" aria-hidden="true" />{t("screens.backoffice.draft.addLine")}</Button> : <span />}
        {totals && (totals.debit > 0 || totals.credit > 0) && <span className={`text-xs ${totals.balanced ? "text-emerald-700" : "text-destructive"}`} role="status">{totals.balanced ? t("screens.backoffice.accounting.common.balanced") : t("screens.backoffice.draft.differenceIs", { amount: formatMoney(Math.abs(totals.debit - totals.credit)) })}</span>}
      </div>
    </div>
  );
}

function DraftForm({ spec, values, issues, onChange }: { spec: DraftFormSpec; values: DraftValues; issues: Record<string, DraftIssue>; onChange: (k: string, v: string) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {spec.fields.map((f) => {
        const id = `draft-${spec.id}-${f.key}`;
        const issue = issues[f.key];
        const wide = f.kind === "textarea" || f.kind === "lines";
        return (
          <div key={f.key} className={`space-y-1 ${wide ? "sm:col-span-2" : ""}`}>
            <Label htmlFor={id}>{fieldLabel(f.key)}{f.required && <span aria-hidden="true" className="text-destructive"> *</span>}</Label>
            {f.readOnly ? (
              f.kind === "select" ? <p id={id} className="text-sm py-2">{values[f.key] ? t(`screens.backoffice.draft.choices.${values[f.key]}`) : "—"}</p> : <p id={id} className="text-sm font-mono break-all py-2" dir="ltr">{values[f.key] ?? "—"}</p>
            ) : f.kind === "lines" ? (
              <LinesEditor field={f} value={values[f.key]} onChange={(v) => onChange(f.key, v)} invalid={!!issue} />
            ) : f.kind === "lookup" ? (
              <LookupSelect id={id} name={f.key} lookup={f.lookup} value={values[f.key] ?? ""} onChange={(v) => onChange(f.key, v)} invalid={!!issue} testId={`draft-select-${f.key}`} />
            ) : f.kind === "select" ? (
              <Select value={values[f.key] ?? ""} onValueChange={(v) => onChange(f.key, v)}>
                <SelectTrigger id={id} aria-invalid={!!issue} data-testid={`draft-select-${f.key}`}><SelectValue placeholder={t("screens.backoffice.draft.choose")} /></SelectTrigger>
                <SelectContent>
                  {(f.options ?? []).map((o) => <SelectItem key={o} value={o}>{t(`screens.backoffice.draft.choices.${o}`)}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : f.kind === "textarea" ? (
              <Textarea id={id} name={f.key} value={values[f.key] ?? ""} onChange={(e) => onChange(f.key, e.target.value)} rows={3} aria-invalid={!!issue} />
            ) : (
              <Input id={id} name={f.key} type={f.kind === "text" ? "text" : f.kind} inputMode={f.kind === "number" ? "decimal" : undefined} min={f.kind === "number" ? f.min : undefined} step={f.kind === "number" ? "any" : undefined} value={values[f.key] ?? ""} onChange={(e) => onChange(f.key, e.target.value)} required={f.required} aria-invalid={!!issue} aria-describedby={issue ? `${id}-issue` : undefined} dir={f.kind === "email" || f.kind === "tel" || f.kind === "date" || f.kind === "number" ? "ltr" : undefined} />
            )}
            {issue && <p id={`${id}-issue`} className="text-xs text-destructive" role="alert">{t(ISSUE_KEY[issue])}</p>}
          </div>
        );
      })}
    </div>
  );
}

function PayloadValue({ spec, k, v, values }: { spec: DraftFormSpec; k: string; v: unknown; values: DraftValues }) {
  const f = spec.fields.find((x) => x.key === k);
  if (Array.isArray(v)) {
    // A lines field: the payload carries only what ERPClaw accepts (ids + quantities); the card also shows the
    // display columns from the same row so the user sees WHICH item, not just an id.
    const cols = f?.columns ?? [];
    const sent = cols.filter((c) => !c.hidden && !c.display);
    const shown = cols.filter((c) => c.display);
    const idCols = cols.filter((c) => c.hidden);
    const source = parseLines(values[k]);
    const rows = v as Array<Record<string, string>>;
    return (
      <table className="text-xs w-full">
        <tbody>
          {rows.map((r, i) => {
            const src = source.find((s) => idCols.every((c) => (s[c.key] ?? "") === (r[c.key] ?? ""))) ?? {};
            return (
              <tr key={i} className="border-b last:border-b-0 align-top">
                {shown.map((c, j) => (
                  <td key={c.key} className="py-0.5 pe-3">
                    <span className="text-muted-foreground">{fieldLabel(c.key)}: </span>{src[c.key] ?? "—"}
                    {j === 0 && idCols.map((ic) => <span key={ic.key} className="block font-mono text-[10px] text-muted-foreground break-all" dir="ltr">{r[ic.key]}</span>)}
                  </td>
                ))}
                {sent.map((c) => <td key={c.key} className={`py-0.5 pe-3 ${c.kind === "lookup" ? "" : "whitespace-nowrap"}`}><span className="text-muted-foreground">{fieldLabel(c.key)}: </span>{c.kind === "lookup" ? <LookupLabel lookup={c.lookup} value={r[c.key] ?? ""} /> : <span className="font-medium" dir="ltr">{r[c.key]}</span>}</td>)}
                {shown.length === 0 && idCols.map((c) => <td key={c.key} className="py-0.5 font-mono text-[10px] text-muted-foreground break-all" dir="ltr">{r[c.key]}</td>)}
              </tr>
            );
          })}
          {f?.balance && (() => { const tt = linesTotals(f, values[k]); return (
            <tr className="font-medium">
              <td className="py-0.5 pe-3">{t("screens.backoffice.draft.totals")}</td>
              <td className="py-0.5 pe-3 whitespace-nowrap"><span className="text-muted-foreground">{fieldLabel(f.balance.debit)}: </span><span dir="ltr">{formatMoney(tt.debit)}</span></td>
              <td className="py-0.5 pe-3 whitespace-nowrap"><span className="text-muted-foreground">{fieldLabel(f.balance.credit)}: </span><span dir="ltr">{formatMoney(tt.credit)}</span></td>
            </tr>
          ); })()}
        </tbody>
      </table>
    );
  }
  if (f?.kind === "lookup") return <LookupLabel lookup={f.lookup} value={String(v)} />;
  return <>{f?.kind === "select" ? t(`screens.backoffice.draft.choices.${String(v)}`) : String(v)}</>;
}

function ReviewCard({ spec, payload, idempotencyKey, values }: { spec: DraftFormSpec; payload: Record<string, unknown>; idempotencyKey: string; values: DraftValues }) {
  return (
    <div className="space-y-3" data-testid="draft-review-card">
      <p className="text-sm text-muted-foreground">{t("screens.backoffice.draft.reviewHint")}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm rounded-md border p-3 bg-muted/30">
        <dt className="text-muted-foreground">{t("screens.backoffice.draft.command")}</dt><dd className="font-mono text-xs" dir="ltr">{spec.type}</dd>
        <dt className="text-muted-foreground">{t("screens.backoffice.draft.action")}</dt><dd className="font-mono text-xs" dir="ltr">{spec.action}</dd>
        <dt className="text-muted-foreground">{t("screens.backoffice.draft.tier")}</dt><dd><TierBadge tier="draft" /></dd>
        <dt className="text-muted-foreground">{t("screens.backoffice.draft.capability")}</dt><dd className="font-mono text-xs" dir="ltr">{draftCapabilities(spec).join(" | ")}</dd>
        <dt className="text-muted-foreground">{t("screens.backoffice.draft.idempotencyKey")}</dt><dd className="font-mono text-[11px] break-all" dir="ltr">{idempotencyKey}</dd>
      </dl>
      <div className="rounded-md border">
        <div className="px-3 py-2 text-xs font-medium border-b bg-muted/40">{t("screens.backoffice.draft.payload")}</div>
        <dl className="px-3 py-1">
          {Object.entries(payload).map(([k, v]) => (
            <div key={k} className="grid grid-cols-[minmax(8rem,auto)_1fr] gap-3 py-1 text-sm border-b last:border-b-0">
              <dt className="text-muted-foreground">{fieldLabel(k)}<span className="block font-mono text-[10px] text-muted-foreground/70" dir="ltr">{k}</span></dt>
              <dd className="break-words"><PayloadValue spec={spec} k={k} v={v} values={values} /></dd>
            </div>
          ))}
        </dl>
      </div>
      <p className="text-xs text-muted-foreground">{t(draftCreates(spec) ? "screens.backoffice.draft.whatHappens" : "screens.backoffice.draft.whatHappensUpdate")}</p>
    </div>
  );
}

export function DraftCommandDialog({ formId, open, onOpenChange, initial }: { formId: DraftFormId; open: boolean; onOpenChange: (open: boolean) => void; initial?: DraftValues }) {
  const spec = DRAFT_FORMS[formId];
  const draft = useDraftCommand(spec);
  const [values, setValues] = useState<DraftValues>(() => ({ ...initialDraftValues(spec), ...(initial ?? {}) }));
  const [showIssues, setShowIssues] = useState(false);
  const issues = validateDraft(spec, values);
  const payload = buildDraftPayload(spec, values);
  const cmd = draft.outcome?.body.command ?? null;
  const summary = draftResultSummary(cmd?.receipt?.result);
  const entity = (draft.outcome?.body as { entity?: { field?: string; ref?: string; candidates?: unknown[] } } | undefined)?.entity;

  const close = (next: boolean) => {
    if (!next) { draft.reset(); setValues({ ...initialDraftValues(spec), ...(initial ?? {}) }); setShowIssues(false); }
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
          <ResponsiveDialogDescription>{draft.phase === "form" ? t(`screens.backoffice.draft.forms.${spec.id}.description`) : draft.phase === "review" ? t("screens.backoffice.draft.review") : draft.phase === "done" ? t(draftCreates(spec) ? "screens.backoffice.draft.done" : "screens.backoffice.draft.doneUpdate") : draft.phase === "failed" ? t(draftCreates(spec) ? "screens.backoffice.draft.failed" : "screens.backoffice.draft.failedUpdate") : t("screens.backoffice.draft.submitting")}</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody>
          {draft.phase === "form" && (
            <>
              {/* VTID-03876 — ERPClaw updates only the fields it is given, so a blank field is "leave as it is", not "clear it". Say so rather than let the user guess. */}
              {spec.keepsBlank && <p className="text-xs text-muted-foreground mb-3">{t("screens.backoffice.draft.keepsBlank")}</p>}
              <DraftForm spec={spec} values={values} issues={showIssues ? issues : {}} onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))} />
            </>
          )}
          {(draft.phase === "review" || draft.phase === "submitting") && <ReviewCard spec={spec} payload={payload} idempotencyKey={draft.key} values={values} />}
          {draft.phase === "done" && (
            <div className="space-y-3" data-testid="draft-done">
              <div role="status" className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm">
                <div className="font-medium">{summary.reference ? t(draftCreates(spec) ? "screens.backoffice.draft.createdWithRef" : "screens.backoffice.draft.updatedWithRef", { ref: summary.reference }) : t(draftCreates(spec) ? "screens.backoffice.draft.created" : "screens.backoffice.draft.updated")}</div>
                {summary.message && <p className="text-xs text-muted-foreground mt-1" dir="auto">{summary.message}</p>}
                {cmd?.replayed && <p className="text-xs text-muted-foreground mt-1">{t("screens.backoffice.draft.replayed")}</p>}
              </div>
              <p className="text-xs text-muted-foreground">{t(draftCreates(spec) ? "screens.backoffice.draft.doneHint" : "screens.backoffice.draft.doneHintUpdate")}</p>
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
              <p className="text-xs text-muted-foreground">{t(draftCreates(spec) ? "screens.backoffice.draft.failedHint" : "screens.backoffice.draft.failedHintUpdate")}</p>
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
              <Button type="button" onClick={() => draft.submit(payload)} data-testid="draft-accept">{t(draftCreates(spec) ? "screens.backoffice.draft.accept" : "screens.backoffice.draft.acceptUpdate")}</Button>
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

/** The icon matches what the command does, so an edit card never wears a "+" (VTID-03876). */
function draftIcon(type: string) {
  if (type.endsWith(".complete")) return Check;
  if (type.endsWith(".cancel")) return X;
  if (type.endsWith(".update") || type.endsWith(".set_stage")) return Pencil;
  return Plus;
}

/** The button a Read screen puts next to the record it is about. Renders nothing without the capability — the gateway enforces it anyway. */
export function DraftCommandButton({ formId, initial, variant = "default" }: { formId: DraftFormId; initial?: DraftValues; variant?: "default" | "outline" }) {
  const me = useMyErpAccess();
  const [open, setOpen] = useState(false);
  const spec = DRAFT_FORMS[formId];
  const allowed = !!me.data && (me.data.is_exafy_admin || hasAnyCapability(me.data.capabilities, draftCapabilities(spec)));
  if (!allowed) return null;
  const Icon = draftIcon(spec.type);
  return (
    <>
      <Button type="button" size="sm" variant={variant} onClick={() => setOpen(true)} data-testid={`draft-open-${formId}`}>
        <Icon className="h-4 w-4 me-1" aria-hidden="true" />{t(`screens.backoffice.draft.forms.${formId}.button`)}
      </Button>
      {open && <DraftCommandDialog formId={formId} open={open} onOpenChange={setOpen} initial={initial} />}
    </>
  );
}
