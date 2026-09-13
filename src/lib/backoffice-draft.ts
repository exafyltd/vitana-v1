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

export type DraftFormId = "lead" | "contact" | "company" | "task" | "activity" | "customer" | "creditNote" | "payment" | "journal";

export interface DraftFormSpec {
  id: DraftFormId;
  /** typed command (services/gateway/src/constants/backoffice-commands.ts) */
  type: string;
  /** ERPClaw action the bridge runs — shown on the card so the user sees exactly what will execute */
  action: string;
  capability: string;
  /** further capabilities that also admit the command (any-of, as in the gateway catalog) */
  alsoCapabilities?: readonly string[];
  fields: readonly DraftField[];
}

export function draftCapabilities(spec: DraftFormSpec): readonly string[] {
  return [spec.capability, ...(spec.alsoCapabilities ?? [])];
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
