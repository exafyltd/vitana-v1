/**
 * VTID-03859 — Draft-tier command forms (design gate §1.3: "structured review
 * card; the write happens when the user accepts the card").
 *
 * A form spec is the whole contract between the screen and ERPClaw: payload keys
 * are the ERPClaw flags (`lead_name` → `--lead-name`, mapped by the bridge), the
 * option lists mirror the script's VALID_* tuples, and a `*_ref` field is a human
 * reference the orchestrator resolves to an id through a Read action before
 * anything is queued or executed (VTID-03842 entity resolution).
 */

export type DraftFieldKind = "text" | "email" | "tel" | "date" | "number" | "textarea" | "select" | "lines" | "lookup";

/** VTID-03871 — a `lookup` field loads its options through a typed Read command; when that read is refused the field degrades to a typed id. */
export interface LookupSpec { type: string; payload: Record<string, unknown>; listKey: string; valueKey: string; labelKey: string; /** secondary label, e.g. an account number */ codeKey?: string; /** keep only rows for which this predicate holds (e.g. non-group accounts) */ keep?: (row: Record<string, unknown>) => boolean }

/** One column of a `lines` field. `display` columns are shown but never sent; `maxFrom` caps a number at another column's value in the same row. */
export interface LineColumn { key: string; kind: "text" | "number" | "lookup"; display?: boolean; hidden?: boolean; maxFrom?: string; required?: boolean; /** sent when the cell is blank (a `number` column of a journal line defaults to 0.00) */ default?: string; /** `lookup` columns pick their value through a typed Read, like a lookup field */ lookup?: LookupSpec }

export interface DraftField {
  key: string;
  kind: DraftFieldKind;
  required?: boolean;
  /** `select` only — the exact values ERPClaw accepts */
  options?: readonly string[];
  default?: string;
  /** shown on the form but not editable — a prefilled id the card is about */
  readOnly?: boolean;
  /** `lines` only — the row shape; rows come from `initial` values as a JSON array */
  columns?: readonly LineColumn[];
  min?: number;
  /** `lookup` only */
  lookup?: LookupSpec;
  /** `lines` only — the user may add and remove rows (else rows come from `initial`); the card starts with `minRows` blank rows */
  canAddRows?: boolean;
  minRows?: number;
  /** `lines` only — the two number columns whose totals must agree (a journal entry) */
  balance?: { debit: string; credit: string };
}

export type DraftFormId = "lead" | "contact" | "company" | "task" | "activity" | "customer" | "creditNote" | "payment" | "journal"
  | "leadUpdate" | "opportunityUpdate" | "opportunityStage" | "taskUpdate" | "taskComplete" | "taskCancel"
  | "leadConvert" | "opportunityWon" | "opportunityLost" | "invoiceSubmit" | "invoiceCancel" | "journalSubmit" | "journalCancel";

/**
 * VTID-03888 — the policy tier the card runs at (design gate §1.3/§3.3/§4.3). `draft` executes on
 * accept; `commit` executes only after an explicit confirmation (never by voice) and is sent with
 * `confirm: true`; `high` never executes here — it is queued for a second person who holds the
 * approve capability (maker-checker, requester ≠ approver) and the card ends in a "queued" state.
 */
export type DraftTier = "draft" | "commit" | "high";

export interface DraftFormSpec {
  id: DraftFormId;
  /** typed command (services/gateway/src/constants/backoffice-commands.ts) */
  type: string;
  /** ERPClaw action the bridge runs — shown on the card so the user sees exactly what will execute */
  action: string;
  capability: string;
  /** further capabilities that also admit the command (any-of, as in the gateway catalog) */
  alsoCapabilities?: readonly string[];
  /** an edit card: the form starts from the record and a field left blank keeps its current value (ERPClaw updates only the fields it is given) */
  keepsBlank?: boolean;
  /** policy tier; absent = Draft (VTID-03888) */
  tier?: DraftTier;
  fields: readonly DraftField[];
}

export function draftTier(spec: DraftFormSpec): DraftTier {
  return spec.tier ?? "draft";
}

export function draftCapabilities(spec: DraftFormSpec): readonly string[] {
  return [spec.capability, ...(spec.alsoCapabilities ?? [])];
}

/**
 * VTID-03876 — an edit card must not be described as a creation. Every "…and create / Created /
 * creates an unposted record" line in the dialog has an update twin; this picks between them.
 */
export function draftCreates(spec: DraftFormSpec): boolean {
  return spec.type.endsWith(".create") || spec.type === "finance.payment.record";
}

// Mirrors VALID_* in erpclaw-growth/scripts/erpclaw-crm/db_query.py (v2.10.0).
export const LEAD_SOURCES = ["website", "referral", "campaign", "cold_call", "social_media", "trade_show", "other"] as const;
export const CONTACT_LIFECYCLES = ["lead", "mql", "sql", "customer", "other"] as const;
export const COMPANY_LIFECYCLES = ["prospect", "customer", "partner", "vendor", "other"] as const;
export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export const ACTIVITY_TYPES = ["call", "email", "meeting", "note", "task"] as const;
// Mirrors VALID_CUSTOMER_TYPES in erpclaw/scripts/erpclaw-selling/db_query.py (v4.15.0).
export const CUSTOMER_TYPES = ["company", "individual"] as const;
// Mirrors VALID_PAYMENT_TYPES / VALID_PARTY_TYPES in erpclaw/scripts/erpclaw-payments/db_query.py (v4.15.0).
// `internal_transfer` needs no party and a different card; `supplier`/`employee` parties wait for the ops/HR waves (no party read in wave 1).
export const PAYMENT_TYPES = ["receive", "pay"] as const;
export const PARTY_TYPES = ["customer"] as const;
const nonGroup = (r: Record<string, unknown>) => !(r.is_group === 1 || r.is_group === true) && !(r.disabled === 1 || r.disabled === true);
export const CUSTOMER_LOOKUP: LookupSpec = { type: "sales.customer.list", payload: { limit: 200 }, listKey: "customers", valueKey: "id", labelKey: "name" };
export const ACCOUNT_LOOKUP: LookupSpec = { type: "accounting.coa.list", payload: { limit: 200 }, listKey: "accounts", valueKey: "id", labelKey: "name", codeKey: "account_number", keep: nonGroup };
// Mirrors VALID_ENTRY_TYPES in erpclaw/scripts/erpclaw-journals/db_query.py (v4.15.0).
export const JOURNAL_ENTRY_TYPES = ["journal", "opening", "closing", "depreciation", "write_off", "exchange_rate_revaluation", "inter_company", "credit_note", "debit_note"] as const;
/** ERPClaw accepts a credit note only against an invoice in one of these states (create_credit_note). */
export const CREDIT_NOTE_SOURCE_STATUSES = ["submitted", "overdue", "partially_paid", "paid"] as const;

// --- VTID-03876: the update/complete/cancel cards ------------------------------------------------
// Mirrors VALID_LEAD_STATUSES minus `converted`: converting is its own Commit-tier command
// (crm.lead.convert) and creates the opportunity too, so setting the word by hand would leave a lead
// marked converted with nothing behind it.
export const LEAD_UPDATE_STATUSES = ["new", "contacted", "qualified", "unresponsive", "lost"] as const;
// ERPClaw freezes terminal records: a converted lead, a won/lost opportunity and a done/cancelled task
// all refuse an update. The cards hide rather than offer a button that can only fail. `completed` is not
// an ERPClaw word but the Read screens filter on it, so it counts as terminal here too.
export const LEAD_FROZEN_STATUSES = ["converted"] as const;
export const OPPORTUNITY_FROZEN_STAGES = ["won", "lost"] as const;
export const TASK_FROZEN_STATUSES = ["done", "completed", "cancelled"] as const;
/** The pipeline stage a `set-opportunity-pipeline-stage` moves to is an id, not a word — picked from the tenant's own stages. */
// --- VTID-03888: Commit-tier and High-risk cards -------------------------------------------------
// Mirrors VALID_OPP_TYPES in erpclaw-growth/scripts/erpclaw-crm/db_query.py (v2.10.0).
export const OPPORTUNITY_TYPES = ["sales", "support", "maintenance"] as const;
// ERPClaw's own state guards (submit_sales_invoice / cancel_sales_invoice / submit_journal_entry /
// cancel_journal_entry, v4.15.0): anything else is refused with "Cannot submit/cancel: … is '<status>'".
// The cards hide rather than offer a button that can only fail.
export const INVOICE_SUBMITTABLE_STATUSES = ["draft"] as const;
export const INVOICE_CANCELLABLE_STATUSES = ["submitted", "overdue", "partially_paid"] as const;
export const JOURNAL_SUBMITTABLE_STATUSES = ["draft"] as const;
export const JOURNAL_CANCELLABLE_STATUSES = ["submitted"] as const;
export const PIPELINE_STAGE_LOOKUP: LookupSpec = { type: "crm.pipeline_stage.list", payload: { limit: 200 }, listKey: "crm_pipeline_stages", valueKey: "id", labelKey: "name" };

export const DRAFT_FORMS: Record<DraftFormId, DraftFormSpec> = {
  lead: {
    id: "lead", type: "crm.lead.create", action: "add-lead", capability: "crm.manage",
    fields: [
      { key: "lead_name", kind: "text", required: true },
      { key: "company_name", kind: "text" },
      { key: "email", kind: "email" },
      { key: "phone", kind: "tel" },
      { key: "source", kind: "select", options: LEAD_SOURCES },
      { key: "industry", kind: "text" },
      { key: "notes", kind: "textarea" },
    ],
  },
  contact: {
    id: "contact", type: "crm.contact.create", action: "add-crm-contact", capability: "crm.manage",
    fields: [
      { key: "name", kind: "text", required: true },
      { key: "email", kind: "email" },
      { key: "phone", kind: "tel" },
      { key: "lifecycle", kind: "select", options: CONTACT_LIFECYCLES, default: "lead" },
      { key: "notes", kind: "textarea" },
    ],
  },
  company: {
    id: "company", type: "crm.company.create", action: "add-crm-company", capability: "crm.manage",
    fields: [
      { key: "name", kind: "text", required: true },
      { key: "industry", kind: "text" },
      { key: "lifecycle", kind: "select", options: COMPANY_LIFECYCLES, default: "prospect" },
      { key: "notes", kind: "textarea" },
    ],
  },
  task: {
    id: "task", type: "crm.task.create", action: "add-crm-task", capability: "crm.manage",
    fields: [
      { key: "subject", kind: "text", required: true },
      { key: "priority", kind: "select", options: TASK_PRIORITIES, default: "medium" },
      { key: "due_date", kind: "date" },
      { key: "description", kind: "textarea" },
    ],
  },
  activity: {
    id: "activity", type: "crm.activity.create", action: "add-activity", capability: "crm.manage",
    fields: [
      { key: "activity_type", kind: "select", options: ACTIVITY_TYPES, required: true, default: "call" },
      { key: "subject", kind: "text", required: true },
      { key: "activity_date", kind: "date", required: true },
      // ERPClaw needs one of --lead-id / --opportunity-id / --customer-id; the user types the lead's name or
      // number and the orchestrator resolves `lead_ref` → `lead_id` through `list-leads` (exact match, else a
      // rejected command with candidates — never a guess).
      { key: "lead_ref", kind: "text", required: true },
      { key: "description", kind: "textarea" },
    ],
  },
  customer: {
    id: "customer", type: "sales.customer.create", action: "add-customer", capability: "sales.draft",
    fields: [
      { key: "name", kind: "text", required: true },
      { key: "customer_type", kind: "select", options: CUSTOMER_TYPES, default: "company" },
      { key: "tax_id", kind: "text" },
      { key: "credit_limit", kind: "number", min: 0 },
      { key: "primary_address", kind: "textarea" },
    ],
  },
  creditNote: {
    id: "creditNote", type: "sales.credit_note.create", action: "create-credit-note", capability: "sales.draft",
    fields: [
      // The invoice the card was opened from; ERPClaw refuses anything not in CREDIT_NOTE_SOURCE_STATUSES.
      { key: "against_invoice_id", kind: "text", required: true, readOnly: true },
      { key: "posting_date", kind: "date", required: true },
      { key: "reason", kind: "text" },
      // Returned lines: only items of the original invoice, qty > 0 and ≤ the original quantity (ERPClaw validates both again).
      { key: "items", kind: "lines", required: true, columns: [
        { key: "item_id", kind: "text", hidden: true },
        { key: "item_name", kind: "text", display: true },
        { key: "original_qty", kind: "number", display: true },
        { key: "qty", kind: "number", maxFrom: "original_qty", required: true },
      ] },
    ],
  },
  payment: {
    id: "payment", type: "finance.payment.record", action: "add-payment", capability: "finance.approve", alsoCapabilities: ["accounting.post"],
    fields: [
      { key: "payment_type", kind: "select", options: PAYMENT_TYPES, required: true, default: "receive" },
      { key: "party_type", kind: "select", options: PARTY_TYPES, required: true, default: "customer", readOnly: true },
      { key: "party_id", kind: "lookup", required: true, lookup: CUSTOMER_LOOKUP },
      { key: "paid_amount", kind: "number", required: true, min: 0.01 },
      { key: "posting_date", kind: "date", required: true },
      { key: "paid_from_account", kind: "lookup", required: true, lookup: ACCOUNT_LOOKUP },
      { key: "paid_to_account", kind: "lookup", required: true, lookup: ACCOUNT_LOOKUP },
      { key: "reference_number", kind: "text" },
      { key: "reference_date", kind: "date" },
    ],
  },
  journal: {
    id: "journal", type: "accounting.journal.create", action: "add-journal-entry", capability: "accounting.post",
    fields: [
      { key: "posting_date", kind: "date", required: true },
      { key: "entry_type", kind: "select", options: JOURNAL_ENTRY_TYPES, default: "journal" },
      { key: "remark", kind: "text" },
      // ERPClaw validates the same rule server-side: total debit must equal total credit (add_journal_entry → _validate_lines).
      { key: "lines", kind: "lines", required: true, canAddRows: true, minRows: 2, balance: { debit: "debit", credit: "credit" }, columns: [
        { key: "account_id", kind: "lookup", lookup: ACCOUNT_LOOKUP, required: true },
        { key: "debit", kind: "number", default: "0.00" },
        { key: "credit", kind: "number", default: "0.00" },
      ] },
    ],
  },
  leadUpdate: {
    id: "leadUpdate", type: "crm.lead.update", action: "update-lead", capability: "crm.manage", keepsBlank: true,
    fields: [
      { key: "lead_id", kind: "text", required: true, readOnly: true },
      { key: "lead_name", kind: "text" },
      { key: "company_name", kind: "text" },
      { key: "email", kind: "email" },
      { key: "phone", kind: "tel" },
      { key: "source", kind: "select", options: LEAD_SOURCES },
      { key: "territory", kind: "text" },
      { key: "industry", kind: "text" },
      { key: "status", kind: "select", options: LEAD_UPDATE_STATUSES },
      { key: "notes", kind: "textarea" },
    ],
  },
  opportunityUpdate: {
    id: "opportunityUpdate", type: "crm.opportunity.update", action: "update-opportunity", capability: "crm.manage", keepsBlank: true,
    fields: [
      { key: "opportunity_id", kind: "text", required: true, readOnly: true },
      { key: "opportunity_name", kind: "text" },
      // No stage here on purpose. ERPClaw STORES the stage as the pipeline stage's NAME ("Proposal") but
      // VALIDATES `update-opportunity --stage` against its own snake_case enum ("proposal_sent"), so a
      // select prefilled from the record would be invalid the moment the card opens, and would show the
      // user a second vocabulary for one field. Moving a stage is the `opportunityStage` card, which picks
      // the tenant's real stages by id.
      { key: "probability", kind: "number", min: 0 },
      { key: "expected_revenue", kind: "number", min: 0 },
      { key: "expected_closing_date", kind: "date" },
      { key: "next_follow_up_date", kind: "date" },
    ],
  },
  opportunityStage: {
    // ERPClaw names this flag `--opportunity`, not `--opportunity-id`; the bridge derives the flag from the key.
    id: "opportunityStage", type: "crm.opportunity.set_stage", action: "set-opportunity-pipeline-stage", capability: "crm.manage",
    fields: [
      { key: "opportunity", kind: "text", required: true, readOnly: true },
      { key: "stage", kind: "lookup", required: true, lookup: PIPELINE_STAGE_LOOKUP },
    ],
  },
  taskUpdate: {
    id: "taskUpdate", type: "crm.task.update", action: "update-crm-task", capability: "crm.manage", keepsBlank: true,
    fields: [
      { key: "crm_task_id", kind: "text", required: true, readOnly: true },
      { key: "subject", kind: "text" },
      { key: "priority", kind: "select", options: TASK_PRIORITIES },
      { key: "due_date", kind: "date" },
      { key: "description", kind: "textarea" },
    ],
  },
  taskComplete: {
    id: "taskComplete", type: "crm.task.complete", action: "complete-crm-task", capability: "crm.manage",
    fields: [
      { key: "crm_task_id", kind: "text", required: true, readOnly: true },
      { key: "notes", kind: "textarea" },
    ],
  },
  taskCancel: {
    id: "taskCancel", type: "crm.task.cancel", action: "cancel-crm-task", capability: "crm.manage",
    fields: [
      { key: "crm_task_id", kind: "text", required: true, readOnly: true },
      { key: "reason", kind: "textarea", required: true },
    ],
  },
  // --- VTID-03888: Commit tier — executes at once after an explicit confirmation ---------------------
  leadConvert: {
    id: "leadConvert", type: "crm.lead.convert", action: "convert-lead-to-opportunity", capability: "crm.manage", tier: "commit",
    fields: [
      { key: "lead_id", kind: "text", required: true, readOnly: true },
      { key: "opportunity_name", kind: "text", required: true },
      { key: "opportunity_type", kind: "select", options: OPPORTUNITY_TYPES, default: "sales" },
      { key: "expected_revenue", kind: "number", min: 0 },
      { key: "probability", kind: "number", min: 0, default: "50" },
      { key: "expected_closing_date", kind: "date" },
    ],
  },
  opportunityWon: {
    id: "opportunityWon", type: "crm.opportunity.mark_won", action: "mark-opportunity-won", capability: "crm.manage", tier: "commit",
    fields: [{ key: "opportunity_id", kind: "text", required: true, readOnly: true }],
  },
  opportunityLost: {
    id: "opportunityLost", type: "crm.opportunity.mark_lost", action: "mark-opportunity-lost", capability: "crm.manage", tier: "commit",
    fields: [
      { key: "opportunity_id", kind: "text", required: true, readOnly: true },
      { key: "lost_reason", kind: "textarea", required: true },
    ],
  },
  invoiceSubmit: {
    id: "invoiceSubmit", type: "sales.invoice.submit", action: "submit-sales-invoice", capability: "sales.commit", tier: "commit",
    fields: [{ key: "sales_invoice_id", kind: "text", required: true, readOnly: true }],
  },
  journalSubmit: {
    id: "journalSubmit", type: "accounting.journal.submit", action: "submit-journal-entry", capability: "accounting.post", alsoCapabilities: ["payroll.approve", "accounting.close"], tier: "commit",
    fields: [{ key: "journal_entry_id", kind: "text", required: true, readOnly: true }],
  },
  // --- VTID-03888: High-risk — never executes here; queued for a second person (maker-checker) --------
  // The payload carries only what ERPClaw accepts (the bridge refuses undeclared flags); the approver
  // sees it through GET /commands/:id (VTID-03887) and records their own note on the decision.
  invoiceCancel: {
    id: "invoiceCancel", type: "sales.invoice.cancel", action: "cancel-sales-invoice", capability: "sales.commit", alsoCapabilities: ["finance.approve"], tier: "high",
    fields: [{ key: "sales_invoice_id", kind: "text", required: true, readOnly: true }],
  },
  journalCancel: {
    id: "journalCancel", type: "accounting.journal.cancel", action: "cancel-journal-entry", capability: "accounting.close", tier: "high",
    fields: [{ key: "journal_entry_id", kind: "text", required: true, readOnly: true }],
  },
};
export type LineRow = Record<string, string>;

export function parseLines(v: string | undefined): LineRow[] {
  if (!v) return [];
  try { const a = JSON.parse(v); return Array.isArray(a) ? a.map((r) => Object.fromEntries(Object.entries(r ?? {}).map(([k, x]) => [k, x == null ? "" : String(x)]))) : []; } catch { return []; }
}

/** Rows the credit-note card starts from: every line of the invoice, with the returned qty blank until the user fills it. */
export function creditNoteLinesFromInvoice(items: Array<{ item_id: string; item_name?: string | null; item_code?: string | null; quantity: string | number }>): LineRow[] {
  return items.map((i) => ({ item_id: i.item_id, item_name: i.item_name ?? i.item_code ?? i.item_id, original_qty: String(i.quantity), qty: "" }));
}

const numOk = (v: string) => v.trim() !== "" && Number.isFinite(Number(v));

/** Rows that will be sent: touched rows whose required cells are all present (and required numbers > 0), display columns dropped, blank numbers defaulted. */
export function linesPayload(f: DraftField, v: string | undefined): Array<Record<string, string>> {
  const cols = f.columns ?? [];
  return parseLines(v)
    .filter((r) => isFilledLine(f, r))
    .filter((r) => cols.every((c) => c.display || !c.required || ((r[c.key] ?? "").trim() !== "" && (c.kind !== "number" || Number(r[c.key]) > 0))))
    .map((r) => Object.fromEntries(cols.filter((c) => !c.display).map((c) => [c.key, (r[c.key] ?? "").trim() || c.default || ""])));
}

export type DraftValues = Record<string, string>;

export function initialDraftValues(spec: DraftFormSpec, today: Date = new Date()): DraftValues {
  const v: DraftValues = {};
  for (const f of spec.fields) {
    if (f.default !== undefined) v[f.key] = f.default;
    else if (f.kind === "date" && f.required) v[f.key] = isoDay(today);
    else if (f.kind === "lines" && f.canAddRows) v[f.key] = JSON.stringify(Array.from({ length: f.minRows ?? 1 }, () => emptyLine(f)));
  }
  return v;
}

function isoDay(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type DraftIssue = "required" | "invalidEmail" | "invalidDate" | "invalidOption" | "invalidNumber" | "lineQtyTooHigh" | "noLines" | "tooFewLines" | "unbalanced" | "lineIncomplete";

export function emptyLine(f: DraftField): LineRow {
  return Object.fromEntries((f.columns ?? []).map((c) => [c.key, ""]));
}

/** A row the user has touched: any user-editable column (neither display nor hidden) filled. */
export function isFilledLine(f: DraftField, r: LineRow): boolean {
  return (f.columns ?? []).some((c) => !c.display && !c.hidden && (r[c.key] ?? "").trim() !== "");
}

/** Debit/credit totals over the filled rows — the live footer and the review card's totals line. */
export function linesTotals(f: DraftField, v: string | undefined): { debit: number; credit: number; balanced: boolean } {
  const b = f.balance;
  if (!b) return { debit: 0, credit: 0, balanced: true };
  const rows = parseLines(v).filter((r) => isFilledLine(f, r));
  const sum = (k: string) => rows.reduce((a, r) => a + (Number(r[k]) || 0), 0);
  const debit = Math.round(sum(b.debit) * 100) / 100, credit = Math.round(sum(b.credit) * 100) / 100;
  return { debit, credit, balanced: Math.abs(debit - credit) < 0.005 };
}

/** Client-side validation is a courtesy for the form; the orchestrator and ERPClaw validate again. */
export function validateDraft(spec: DraftFormSpec, values: DraftValues): Record<string, DraftIssue> {
  const issues: Record<string, DraftIssue> = {};
  for (const f of spec.fields) {
    const v = (values[f.key] ?? "").trim();
    if (!v) { if (f.required) issues[f.key] = "required"; continue; }
    if (f.kind === "email" && !EMAIL_RE.test(v)) issues[f.key] = "invalidEmail";
    else if (f.kind === "date" && !DATE_RE.test(v)) issues[f.key] = "invalidDate";
    else if (f.kind === "select" && f.options && !f.options.includes(v)) issues[f.key] = "invalidOption";
    else if (f.kind === "number" && (!numOk(v) || (f.min !== undefined && Number(v) < f.min))) issues[f.key] = "invalidNumber";
    else if (f.kind === "lines") {
      const rows = parseLines(v); const cols = f.columns ?? [];
      const filled = rows.filter((r) => isFilledLine(f, r));
      if (filled.length === 0) { if (f.required) issues[f.key] = (f.minRows ?? 1) > 1 ? "tooFewLines" : "noLines"; continue; }
      if (filled.length < (f.minRows ?? 1)) { issues[f.key] = "tooFewLines"; continue; }
      let bad: DraftIssue | null = null;
      for (const r of filled) {
        for (const c of cols) {
          if (c.display) continue;
          const x = (r[c.key] ?? "").trim();
          if (!x) { if (c.required) bad = "lineIncomplete"; continue; }
          if (c.kind === "number") {
            if (!numOk(x) || Number(x) < 0 || (c.required && Number(x) <= 0)) { bad = "invalidNumber"; break; }
            if (c.maxFrom && numOk(r[c.maxFrom] ?? "") && Number(x) > Number(r[c.maxFrom])) { bad = "lineQtyTooHigh"; break; }
          }
        }
        if (bad) break;
        if (f.balance && (Number(r[f.balance.debit]) || 0) === 0 && (Number(r[f.balance.credit]) || 0) === 0) { bad = "lineIncomplete"; break; }
      }
      if (bad) { issues[f.key] = bad; continue; }
      if (f.balance && !linesTotals(f, v).balanced) issues[f.key] = "unbalanced";
    }
  }
  return issues;
}

/** Only the spec's keys, trimmed, empties dropped — exactly what the review card shows and the command sends. */
export function buildDraftPayload(spec: DraftFormSpec, values: DraftValues): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of spec.fields) {
    const v = (values[f.key] ?? "").trim();
    if (!v) continue;
    if (f.kind === "lines") { const rows = linesPayload(f, v); if (rows.length) out[f.key] = rows; }
    else out[f.key] = v;
  }
  return out;
}

const KEY_RE = /^[A-Za-z0-9_.:-]{8,128}$/;

function randomNonce(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID().replace(/-/g, "");
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * One key per card, minted when the card opens and kept across retries: a network
 * hiccup after ERPClaw already wrote the record replays the receipt instead of
 * creating a second lead. A new card mints a new key.
 */
export function draftIdempotencyKey(type: string, nonce: string = randomNonce()): string {
  const key = `ui.draft:${type}:${nonce}`;
  if (!KEY_RE.test(key)) throw new Error(`idempotency key out of shape: ${key}`);
  return key;
}

/** What the receipt says was created, for the done state — ERPClaw wraps the record under its own key. */
export function draftResultSummary(result: unknown): { message: string | null; reference: string | null; id: string | null } {
  if (!result || typeof result !== "object") return { message: null, reference: null, id: null };
  const r = result as Record<string, unknown>;
  const message = typeof r.message === "string" ? r.message : null;
  const record = Object.values(r).find((v) => v && typeof v === "object" && !Array.isArray(v) && "id" in (v as object)) as Record<string, unknown> | undefined;
  const reference = record && typeof record.naming_series === "string" ? record.naming_series : null;
  const id = record && typeof record.id === "string" ? record.id : null;
  return { message, reference, id };
}

// --- VTID-03876: what an edit card starts from, and when it is offered at all --------------------

const isFrozen = (list: readonly string[], v: unknown) => list.includes(String(v ?? "").toLowerCase());
/** Only non-empty values reach the form: a blank field keeps the record's current value (`keepsBlank`). */
const present = (v: Record<string, unknown>): DraftValues =>
  Object.fromEntries(Object.entries(v).filter(([, x]) => x != null && String(x).trim() !== "").map(([k, x]) => [k, String(x)]));

/** ERPClaw refuses update-lead on a converted lead — the card is hidden rather than offered and rejected. */
export function isLeadEditable(lead: { status?: string | null } | null | undefined): boolean {
  return !!lead && !isFrozen(LEAD_FROZEN_STATUSES, lead.status);
}
/** ERPClaw freezes a won/lost opportunity ("Terminal states cannot be updated"); reaching won/lost is Commit-tier mark-opportunity-won/lost. */
export function isOpportunityEditable(opp: { stage?: string | null } | null | undefined): boolean {
  return !!opp && !isFrozen(OPPORTUNITY_FROZEN_STAGES, opp.stage);
}
/** ERPClaw refuses update/complete/cancel on a done or cancelled task. */
export function isTaskActionable(task: { status?: string | null } | null | undefined): boolean {
  return !!task && !isFrozen(TASK_FROZEN_STATUSES, task.status);
}

export function leadUpdateInitial(lead: {
  id: string; lead_name?: string | null; company_name?: string | null; email?: string | null; phone?: string | null;
  source?: string | null; territory?: string | null; industry?: string | null; status?: string | null; notes?: string | null;
}): DraftValues {
  return present({
    lead_id: lead.id, lead_name: lead.lead_name, company_name: lead.company_name, email: lead.email, phone: lead.phone,
    source: lead.source, territory: lead.territory, industry: lead.industry, status: lead.status, notes: lead.notes,
  });
}

export function opportunityUpdateInitial(opp: {
  id: string; opportunity_name?: string | null; probability?: string | number | null;
  expected_revenue?: string | number | null; expected_closing_date?: string | null; next_follow_up_date?: string | null;
}): DraftValues {
  return present({
    opportunity_id: opp.id, opportunity_name: opp.opportunity_name, probability: opp.probability,
    expected_revenue: opp.expected_revenue, expected_closing_date: opp.expected_closing_date, next_follow_up_date: opp.next_follow_up_date,
  });
}

export function taskUpdateInitial(task: {
  id: string; subject?: string | null; priority?: string | null; due_date?: string | null; description?: string | null;
}): DraftValues {
  return present({ crm_task_id: task.id, subject: task.subject, priority: task.priority, due_date: task.due_date, description: task.description });
}

// --- VTID-03888: when a Commit / High-risk card may be offered -----------------------------------------
function statusIn(list: readonly string[], status: string | null | undefined): boolean {
  return !!status && list.includes(String(status).toLowerCase());
}
/** ERPClaw refuses to convert a lead that is already converted; every other lead status may convert. */
export function canConvertLead(lead: { status?: string | null } | null | undefined): boolean {
  return isLeadEditable(lead);
}
/** won/lost are terminal in ERPClaw: an opportunity already there cannot be marked again. */
export function canMarkOpportunity(opp: { stage?: string | null } | null | undefined): boolean {
  return isOpportunityEditable(opp);
}
export function canSubmitInvoice(inv: { status?: string | null } | null | undefined): boolean {
  return !!inv && statusIn(INVOICE_SUBMITTABLE_STATUSES, inv.status);
}
export function canCancelInvoice(inv: { status?: string | null } | null | undefined): boolean {
  return !!inv && statusIn(INVOICE_CANCELLABLE_STATUSES, inv.status);
}
export function canSubmitJournal(je: { status?: string | null } | null | undefined): boolean {
  return !!je && statusIn(JOURNAL_SUBMITTABLE_STATUSES, je.status);
}
export function canCancelJournal(je: { status?: string | null } | null | undefined): boolean {
  return !!je && statusIn(JOURNAL_CANCELLABLE_STATUSES, je.status);
}
/** The convert card starts from the lead: the opportunity is named after the company (or the person), type sales, probability 50 — ERPClaw's own defaults, shown so the user can change them. */
export function leadConvertInitial(lead: { id: string; lead_name?: string | null; company_name?: string | null }): DraftValues {
  return { lead_id: lead.id, opportunity_name: (lead.company_name || lead.lead_name || "").trim(), opportunity_type: "sales", probability: "50" };
}
