/**
 * VTID-03855 — Sales & CRM Read screens: ERPClaw record shapes (as captured
 * from a real ERPClaw-on-Postgres instance, see docs/validation/VTID-03855/
 * outputs/erpclaw-shapes/) and pure helpers the screens share.
 */
import { fmtNumber } from "@/lib/locale-format";

export interface ErpLead {
  id: string; naming_series: string | null; lead_name: string; company_name: string | null; email: string | null; phone: string | null;
  source: string | null; territory: string | null; industry: string | null; status: string;
  converted_to_customer: string | null; converted_to_opportunity: string | null; assigned_to: string | null; notes: string | null;
  crm_contact_id: string | null; crm_company_id: string | null; created_at: string; updated_at: string;
}
export interface ErpCrmContact {
  id: string; name: string; email: string | null; phone: string | null; mobile: string | null; job_title: string | null; linkedin_url: string | null;
  city: string | null; country: string | null; lifecycle: string; crm_company_id: string | null; assigned_to_user_id: string | null; notes: string | null; created_at: string; updated_at: string;
}
export interface ErpCrmCompany {
  id: string; name: string; domain: string | null; industry: string | null; employee_count: number | null; annual_revenue: string | number | null;
  city: string | null; country: string | null; lifecycle: string; linked_customer_id: string | null; assigned_to_user_id: string | null; notes: string | null; created_at: string; updated_at: string;
}
export interface ErpCustomer { id: string; name: string; customer_type: string | null; customer_group: string | null; territory: string | null; credit_limit: string | number | null; status: string; }
export interface ErpOpportunity {
  id: string; naming_series: string | null; opportunity_name: string; lead_id: string | null; customer_id: string | null; opportunity_type: string | null; source: string | null;
  expected_closing_date: string | null; probability: string | number | null; expected_revenue: string | number | null; weighted_revenue: string | number | null;
  stage: string | null; lost_reason: string | null; assigned_to: string | null; next_follow_up_date: string | null; quotation_id: string | null;
  crm_contact_id: string | null; crm_company_id: string | null; pipeline_stage_id: string | null; created_at: string; updated_at: string;
}
export interface ErpPipelineStageRow { pipeline: string; stage: string; count: number; total_expected_revenue: string | number; total_weighted_revenue: string | number }
export interface ErpPipelineReport { pipeline?: { stages?: ErpPipelineStageRow[]; total_opportunities?: number; total_won?: number; total_lost?: number; conversion_rate_pct?: string | number } }
export interface ErpCrmTask {
  id: string; subject: string; description: string | null; status: string; priority: string; due_date: string | null; assigned_to_user_id: string | null;
  completed_at: string | null; cancel_reason: string | null; linked_count: number; created_at: string; updated_at: string;
}
export interface ErpActivity {
  id: string; activity_type: string; subject: string; description: string | null; activity_date: string; lead_id: string | null; opportunity_id: string | null;
  customer_id: string | null; crm_contact_id: string | null; created_by: string | null; next_action_date: string | null; created_at: string;
}
export interface ErpDocumentItem { id: string; item_id: string; item_name?: string; item_code?: string; quantity: string | number; uom: string | null; rate: string | number; amount: string | number; discount_percentage?: string | number; net_amount?: string | number }
export interface ErpQuotation { id: string; naming_series: string | null; customer_id: string; customer_name?: string; quotation_date: string; valid_until?: string | null; grand_total: string | number; status: string; currency?: string; total_amount?: string | number; tax_amount?: string | number; items?: ErpDocumentItem[]; converted_to?: string | null; terms_and_conditions?: string | null }
export interface ErpSalesInvoice {
  id: string; naming_series: string | null; customer_id: string; customer_name?: string; posting_date: string; due_date: string | null; grand_total: string | number; outstanding_amount: string | number;
  status: string; is_return: number | boolean; currency?: string; total_amount?: string | number; tax_amount?: string | number; items?: ErpDocumentItem[]; payments?: unknown[]; return_against?: string | null; sales_order_id?: string | null;
}
export interface ErpCreditNote { id: string; naming_series: string | null; customer_id: string; customer_name?: string; posting_date: string; grand_total: string | number; status: string; return_against?: string | null; currency?: string }

/** Tenant company currency until a per-tenant setting exists; documents carry their own `currency` when they have one. */
export const DEFAULT_ERP_CURRENCY = "AED";

export function num(v: string | number | null | undefined): number {
  if (v == null || v === "") return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function formatMoney(v: string | number | null | undefined, currency?: string | null): string {
  return fmtNumber(num(v), { style: "currency", currency: currency || DEFAULT_ERP_CURRENCY, maximumFractionDigits: 2 });
}

export function formatPercent(v: string | number | null | undefined): string {
  return fmtNumber(num(v) / 100, { style: "percent", maximumFractionDigits: 1 });
}

/** Overdue = past due date with money still outstanding and not cancelled/returned. Computed client-side because ERPClaw's `check-overdue` is broken on Postgres (see acceptance). */
export function isOverdue(inv: Pick<ErpSalesInvoice, "due_date" | "outstanding_amount" | "status">, today: Date = new Date()): boolean {
  if (!inv.due_date || num(inv.outstanding_amount) <= 0) return false;
  if (["cancelled", "paid", "return", "draft"].includes(String(inv.status))) return false;
  const due = new Date(inv.due_date + "T23:59:59");
  return due.getTime() < today.getTime();
}

export function isTaskOverdue(task: Pick<ErpCrmTask, "due_date" | "status">, today: Date = new Date()): boolean {
  if (!task.due_date || task.status !== "open") return false;
  return new Date(task.due_date + "T23:59:59").getTime() < today.getTime();
}

export interface StageColumn { stage: string; count: number; expected: number; weighted: number; opportunities: ErpOpportunity[] }

/** Board columns in the report's stage order, with every opportunity placed under its `stage`; unknown stages get a trailing column. */
export function groupOpportunitiesByStage(report: ErpPipelineReport | null | undefined, opportunities: ErpOpportunity[]): StageColumn[] {
  const columns = new Map<string, StageColumn>();
  for (const s of report?.pipeline?.stages ?? []) {
    columns.set(s.stage, { stage: s.stage, count: s.count, expected: num(s.total_expected_revenue), weighted: num(s.total_weighted_revenue), opportunities: [] });
  }
  for (const o of opportunities) {
    const key = o.stage || "—";
    if (!columns.has(key)) columns.set(key, { stage: key, count: 0, expected: 0, weighted: 0, opportunities: [] });
    const col = columns.get(key)!;
    col.opportunities.push(o);
    if (!report?.pipeline?.stages?.some((s) => s.stage === key)) { col.count += 1; col.expected += num(o.expected_revenue); col.weighted += num(o.weighted_revenue); }
  }
  return Array.from(columns.values());
}

export type BadgeVariant = "active" | "warning" | "error" | "inactive" | "info";

/** One mapping for every ERPClaw status/lifecycle/priority word the wave-1 screens show. */
export function statusVariant(status: string | null | undefined): BadgeVariant {
  switch (String(status ?? "").toLowerCase()) {
    case "new": case "open": case "draft": case "prospect": case "lead": return "info";
    case "qualified": case "contacted": case "submitted": case "sent": case "active": case "customer": case "won": case "completed": case "paid": return "active";
    case "unqualified": case "cancelled": case "lost": case "closed": case "inactive": case "churned": return "inactive";
    case "overdue": case "high": case "urgent": case "on_hold": return "error";
    case "partially_paid": case "medium": case "converted": case "unpaid": return "warning";
    default: return "inactive";
  }
}

export function fullTextMatch(q: string, ...fields: Array<string | number | null | undefined>): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return fields.some((f) => f != null && String(f).toLowerCase().includes(s));
}
