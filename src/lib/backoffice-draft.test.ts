import { describe, expect, it } from "vitest";
import { ACCOUNT_LOOKUP, DRAFT_FORMS, buildDraftPayload, creditNoteLinesFromInvoice, draftCapabilities, draftIdempotencyKey, draftResultSummary, initialDraftValues, validateDraft } from "./backoffice-draft";

describe("draft forms", () => {
  it("every form maps to a Draft typed command with a single capability and at least one required field", () => {
    for (const spec of Object.values(DRAFT_FORMS)) {
      expect(spec.type).toMatch(/^(crm|sales)\.[a-z_]+\.create$|^finance\.payment\.record$/);
      expect(spec.capability).toBe(spec.type.startsWith("crm.") ? "crm.manage" : spec.type.startsWith("sales.") ? "sales.draft" : "finance.approve");
      expect(spec.fields.some((f) => f.required)).toBe(true);
      for (const f of spec.fields) if (f.kind === "select") expect(f.options && f.options.length > 0).toBe(true);
    }
  });
  it("initial values carry the selects' defaults and today's date for required date fields", () => {
    expect(initialDraftValues(DRAFT_FORMS.task)).toEqual({ priority: "medium" });
    expect(initialDraftValues(DRAFT_FORMS.activity, new Date(2026, 8, 13))).toEqual({ activity_type: "call", activity_date: "2026-09-13" });
  });
});

describe("validateDraft", () => {
  it("flags missing required, bad email, bad date and an option ERPClaw would reject", () => {
    expect(validateDraft(DRAFT_FORMS.lead, {})).toEqual({ lead_name: "required" });
    expect(validateDraft(DRAFT_FORMS.lead, { lead_name: "A", email: "nope", source: "carrier_pigeon" })).toEqual({ email: "invalidEmail", source: "invalidOption" });
    expect(validateDraft(DRAFT_FORMS.task, { subject: "x", due_date: "20/09/2026" })).toEqual({ due_date: "invalidDate" });
    expect(validateDraft(DRAFT_FORMS.task, { subject: "x", due_date: "2026-09-20", priority: "high" })).toEqual({});
  });
});

describe("credit note lines (VTID-03866)", () => {
  const inv = [{ item_id: "i1", item_name: "Wellness programme (per seat)", quantity: "20.00" }, { item_id: "i2", item_name: null, item_code: "SVC-X", quantity: "5.00" }];
  const base = { against_invoice_id: "inv-1", posting_date: "2026-09-13" };
  it("seeds one blank row per invoice line and sends only rows with a returned qty, stripped to item_id + qty", () => {
    const rows = creditNoteLinesFromInvoice(inv);
    expect(rows).toEqual([{ item_id: "i1", item_name: "Wellness programme (per seat)", original_qty: "20.00", qty: "" }, { item_id: "i2", item_name: "SVC-X", original_qty: "5.00", qty: "" }]);
    rows[0].qty = "2";
    expect(buildDraftPayload(DRAFT_FORMS.creditNote, { ...base, items: JSON.stringify(rows) })).toEqual({ ...base, items: [{ item_id: "i1", qty: "2" }] });
  });
  it("refuses no lines, a non-positive qty and a qty above the original", () => {
    const rows = creditNoteLinesFromInvoice(inv);
    expect(validateDraft(DRAFT_FORMS.creditNote, { ...base, items: JSON.stringify(rows) })).toEqual({ items: "noLines" });
    expect(validateDraft(DRAFT_FORMS.creditNote, { ...base, items: JSON.stringify([{ ...rows[0], qty: "0" }]) })).toEqual({ items: "invalidNumber" });
    expect(validateDraft(DRAFT_FORMS.creditNote, { ...base, items: JSON.stringify([{ ...rows[1], qty: "6" }]) })).toEqual({ items: "lineQtyTooHigh" });
    expect(validateDraft(DRAFT_FORMS.creditNote, { ...base, items: JSON.stringify([{ ...rows[1], qty: "5" }]) })).toEqual({});
  });
  it("customer: credit limit must be a non-negative number", () => {
    expect(validateDraft(DRAFT_FORMS.customer, { name: "Acme", credit_limit: "-1" })).toEqual({ credit_limit: "invalidNumber" });
    expect(validateDraft(DRAFT_FORMS.customer, { name: "Acme", credit_limit: "25000" })).toEqual({});
    expect(buildDraftPayload(DRAFT_FORMS.customer, { name: "Acme", customer_type: "company", credit_limit: "25000", tax_id: "" })).toEqual({ name: "Acme", customer_type: "company", credit_limit: "25000" });
  });
});

describe("payment card (VTID-03871)", () => {
  const base = { payment_type: "receive", party_type: "customer", party_id: "c1", paid_amount: "1050", posting_date: "2026-09-13", paid_from_account: "a1", paid_to_account: "a2" };
  it("is admitted by finance.approve OR accounting.post, matching the gateway catalog", () => {
    expect(draftCapabilities(DRAFT_FORMS.payment)).toEqual(["finance.approve", "accounting.post"]);
  });
  it("needs a party, both accounts and a positive amount", () => {
    expect(validateDraft(DRAFT_FORMS.payment, { ...base, paid_amount: "0" })).toEqual({ paid_amount: "invalidNumber" });
    expect(validateDraft(DRAFT_FORMS.payment, { ...base, party_id: "", paid_to_account: "" })).toEqual({ party_id: "required", paid_to_account: "required" });
    expect(validateDraft(DRAFT_FORMS.payment, base)).toEqual({});
    expect(buildDraftPayload(DRAFT_FORMS.payment, { ...base, reference_number: " TRF-1 ", reference_date: "" })).toEqual({ ...base, reference_number: "TRF-1" });
  });
  it("account lookup keeps only enabled ledger (non-group) accounts", () => {
    expect(ACCOUNT_LOOKUP.keep!({ is_group: 1, disabled: 0 })).toBe(false);
    expect(ACCOUNT_LOOKUP.keep!({ is_group: 0, disabled: 1 })).toBe(false);
    expect(ACCOUNT_LOOKUP.keep!({ is_group: 0, disabled: 0 })).toBe(true);
  });
});

describe("buildDraftPayload", () => {
  it("keeps only spec keys, trims, drops empties — the card shows exactly what is sent", () => {
    expect(buildDraftPayload(DRAFT_FORMS.lead, { lead_name: "  Acme  ", email: "", phone: "   ", source: "website", stray: "x" })).toEqual({ lead_name: "Acme", source: "website" });
  });
});

describe("draftIdempotencyKey", () => {
  it("is namespaced per type, matches the gateway's key shape, and differs per card", () => {
    const a = draftIdempotencyKey("crm.lead.create");
    const b = draftIdempotencyKey("crm.lead.create");
    expect(a).toMatch(/^ui\.draft:crm\.lead\.create:[A-Za-z0-9]+$/);
    expect(a).not.toBe(b);
    expect(draftIdempotencyKey("crm.lead.create", "fixed-nonce-1")).toBe("ui.draft:crm.lead.create:fixed-nonce-1");
    expect(() => draftIdempotencyKey("x", "bad nonce")).toThrow();
  });
});

describe("draftResultSummary", () => {
  it("finds the created record under ERPClaw's wrapper key", () => {
    expect(draftResultSummary({ lead: { id: "l1", naming_series: "LEAD-2026-00003", lead_name: "X" }, message: "Lead 'X' created", status: "ok" })).toEqual({ message: "Lead 'X' created", reference: "LEAD-2026-00003", id: "l1" });
    expect(draftResultSummary({ crm_task: { id: "t1", subject: "s" }, links: [], message: "Task created", status: "ok" })).toEqual({ message: "Task created", reference: null, id: "t1" });
    expect(draftResultSummary(null)).toEqual({ message: null, reference: null, id: null });
  });
});
