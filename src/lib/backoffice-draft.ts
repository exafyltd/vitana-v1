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

export type DraftFieldKind = "text" | "email" | "tel" | "date" | "textarea" | "select";

export interface DraftField {
  key: string;
  kind: DraftFieldKind;
  required?: boolean;
  /** `select` only — the exact values ERPClaw accepts */
  options?: readonly string[];
  default?: string;
}

export type DraftFormId = "lead" | "contact" | "company" | "task" | "activity";

export interface DraftFormSpec {
  id: DraftFormId;
  /** typed command (services/gateway/src/constants/backoffice-commands.ts) */
  type: string;
  /** ERPClaw action the bridge runs — shown on the card so the user sees exactly what will execute */
  action: string;
  capability: string;
  fields: readonly DraftField[];
}

// Mirrors VALID_* in erpclaw-growth/scripts/erpclaw-crm/db_query.py (v2.10.0).
export const LEAD_SOURCES = ["website", "referral", "campaign", "cold_call", "social_media", "trade_show", "other"] as const;
export const CONTACT_LIFECYCLES = ["lead", "mql", "sql", "customer", "other"] as const;
export const COMPANY_LIFECYCLES = ["prospect", "customer", "partner", "vendor", "other"] as const;
export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export const ACTIVITY_TYPES = ["call", "email", "meeting", "note", "task"] as const;

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
};

export type DraftValues = Record<string, string>;

export function initialDraftValues(spec: DraftFormSpec, today: Date = new Date()): DraftValues {
  const v: DraftValues = {};
  for (const f of spec.fields) {
    if (f.default !== undefined) v[f.key] = f.default;
    else if (f.kind === "date" && f.required) v[f.key] = isoDay(today);
  }
  return v;
}

function isoDay(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type DraftIssue = "required" | "invalidEmail" | "invalidDate" | "invalidOption";

/** Client-side validation is a courtesy for the form; the orchestrator and ERPClaw validate again. */
export function validateDraft(spec: DraftFormSpec, values: DraftValues): Record<string, DraftIssue> {
  const issues: Record<string, DraftIssue> = {};
  for (const f of spec.fields) {
    const v = (values[f.key] ?? "").trim();
    if (!v) { if (f.required) issues[f.key] = "required"; continue; }
    if (f.kind === "email" && !EMAIL_RE.test(v)) issues[f.key] = "invalidEmail";
    else if (f.kind === "date" && !DATE_RE.test(v)) issues[f.key] = "invalidDate";
    else if (f.kind === "select" && f.options && !f.options.includes(v)) issues[f.key] = "invalidOption";
  }
  return issues;
}

/** Only the spec's keys, trimmed, empties dropped — exactly what the review card shows and the command sends. */
export function buildDraftPayload(spec: DraftFormSpec, values: DraftValues): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of spec.fields) {
    const v = (values[f.key] ?? "").trim();
    if (v) out[f.key] = v;
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
