import { describe, expect, it } from "vitest";
import de from "@/i18n/de/screens.json";
import { ACCOUNT_LOOKUP, DRAFT_FORMS, LEAD_UPDATE_STATUSES, draftCreates, linesTotals, buildDraftPayload, creditNoteLinesFromInvoice, draftCapabilities, draftIdempotencyKey, draftResultSummary, initialDraftValues, isLeadEditable, isOpportunityEditable, isTaskActionable, leadUpdateInitial, opportunityUpdateInitial, taskUpdateInitial, validateDraft } from "./backoffice-draft";

describe("draft forms", () => {
  it("every form maps to a Draft typed command with a single capability and at least one required field", () => {
    for (const spec of Object.values(DRAFT_FORMS)) {
      expect(spec.type).toMatch(/^(crm|sales|accounting)\.[a-z_]+\.(create|update|set_stage|complete|cancel)$|^finance\.payment\.record$/);
      expect(spec.capability).toBe(spec.type.startsWith("crm.") ? "crm.manage" : spec.type.startsWith("sales.") ? "sales.draft" : spec.type.startsWith("accounting.") ? "accounting.post" : "finance.approve");
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

describe("journal card (VTID-03872)", () => {
  const F = DRAFT_FORMS.journal;
  const lines = F.fields.find((f) => f.key === "lines")!;
  const row = (a: string, d: string, c: string) => ({ account_id: a, debit: d, credit: c });
  const base = { posting_date: "2026-09-13", entry_type: "journal" };
  it("starts with two blank rows and refuses fewer than two filled lines", () => {
    const init = initialDraftValues(F, new Date(2026, 8, 13));
    expect(JSON.parse(init.lines)).toEqual([{ account_id: "", debit: "", credit: "" }, { account_id: "", debit: "", credit: "" }]);
    expect(validateDraft(F, { ...base, lines: init.lines })).toEqual({ lines: "tooFewLines" });
    expect(validateDraft(F, { ...base, lines: JSON.stringify([row("a1", "120", "")]) })).toEqual({ lines: "tooFewLines" });
  });
  it("refuses an unbalanced entry, a line without an account, and a line with neither debit nor credit", () => {
    expect(validateDraft(F, { ...base, lines: JSON.stringify([row("a1", "120", ""), row("a2", "", "100")]) })).toEqual({ lines: "unbalanced" });
    expect(validateDraft(F, { ...base, lines: JSON.stringify([row("", "120", ""), row("a2", "", "120")]) })).toEqual({ lines: "lineIncomplete" });
    expect(validateDraft(F, { ...base, lines: JSON.stringify([row("a1", "0", "0"), row("a2", "", "120")]) })).toEqual({ lines: "lineIncomplete" });
    expect(validateDraft(F, { ...base, lines: JSON.stringify([row("a1", "120", ""), row("a2", "", "120")]) })).toEqual({});
  });
  it("sends every touched line with blank amounts defaulted to 0.00 and reports totals", () => {
    const v = JSON.stringify([row("a1", "120", ""), row("a2", "", "120"), { account_id: "", debit: "", credit: "" }]);
    expect(buildDraftPayload(F, { ...base, lines: v })).toEqual({ ...base, lines: [{ account_id: "a1", debit: "120", credit: "0.00" }, { account_id: "a2", debit: "0.00", credit: "120" }] });
    expect(linesTotals(lines, v)).toEqual({ debit: 120, credit: 120, balanced: true });
    expect(linesTotals(lines, JSON.stringify([row("a1", "120.10", ""), row("a2", "", "120")])).balanced).toBe(false);
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

// --- VTID-03876: the update / complete / cancel cards ---------------------------------------------

describe("edit cards are offered only where ERPClaw would accept them", () => {
  it("hides the card on a record ERPClaw has frozen", () => {
    expect(isLeadEditable({ status: "qualified" })).toBe(true);
    expect(isLeadEditable({ status: "Converted" })).toBe(false);
    expect(isOpportunityEditable({ stage: "negotiation" })).toBe(true);
    expect(isOpportunityEditable({ stage: "won" })).toBe(false);
    expect(isOpportunityEditable({ stage: "lost" })).toBe(false);
    expect(isTaskActionable({ status: "open" })).toBe(true);
    expect(isTaskActionable({ status: "done" })).toBe(false);
    expect(isTaskActionable({ status: "cancelled" })).toBe(false);
    expect(isLeadEditable(null)).toBe(false);
    expect(isTaskActionable(undefined)).toBe(false);
  });

  it("never offers a word ERPClaw refuses on an update", () => {
    // Converting a lead is crm.lead.convert (Commit), which also creates the opportunity — not a word to type here.
    expect(LEAD_UPDATE_STATUSES).not.toContain("converted");
    expect(validateDraft(DRAFT_FORMS.leadUpdate, { lead_id: "l1", status: "converted" })).toEqual({ status: "invalidOption" });
  });

  it("keeps the stage out of the opportunity edit card — ERPClaw stores a name and validates an enum", () => {
    // A real record carries stage "Proposal" (the pipeline stage's name) while update-opportunity accepts
    // "proposal_sent". A select prefilled from the record would be invalid on open; moving a stage is its own card.
    expect(DRAFT_FORMS.opportunityUpdate.fields.map((f) => f.key)).not.toContain("stage");
    expect(opportunityUpdateInitial({ id: "o1", opportunity_name: "Acme Q4", probability: 60 }).stage).toBeUndefined();
    expect(validateDraft(DRAFT_FORMS.opportunityUpdate, opportunityUpdateInitial({ id: "o1", opportunity_name: "Acme Q4", probability: 60, expected_revenue: "48000.00", expected_closing_date: "2026-10-31" }))).toEqual({});
  });
});

describe("edit cards start from the record", () => {
  it("prefills what the record has and leaves the rest blank", () => {
    expect(leadUpdateInitial({ id: "l1", lead_name: "Draft Card Probe", company_name: "Probe Trading FZE", email: "probe@example.test", phone: null, source: "website", territory: null, industry: null, status: "new", notes: null }))
      .toEqual({ lead_id: "l1", lead_name: "Draft Card Probe", company_name: "Probe Trading FZE", email: "probe@example.test", source: "website", status: "new" });
    expect(opportunityUpdateInitial({ id: "o1", opportunity_name: "Acme Q4", probability: 60, expected_revenue: "48000.00", expected_closing_date: "2026-10-31", next_follow_up_date: null }))
      .toEqual({ opportunity_id: "o1", opportunity_name: "Acme Q4", probability: "60", expected_revenue: "48000.00", expected_closing_date: "2026-10-31" });
    expect(taskUpdateInitial({ id: "t1", subject: "Call back Spike Lead", priority: "high", due_date: "2026-09-18", description: null }))
      .toEqual({ crm_task_id: "t1", subject: "Call back Spike Lead", priority: "high", due_date: "2026-09-18" });
  });

  it("sends only the filled fields — a blank one keeps its current value", () => {
    expect(DRAFT_FORMS.leadUpdate.keepsBlank).toBe(true);
    expect(buildDraftPayload(DRAFT_FORMS.leadUpdate, { lead_id: "l1", lead_name: "Draft Card Probe", phone: "  +971 50 000 0001 ", email: "", notes: "   ", status: "contacted" }))
      .toEqual({ lead_id: "l1", lead_name: "Draft Card Probe", phone: "+971 50 000 0001", status: "contacted" });
    // no card auto-dates an edit: initialDraftValues only fills a REQUIRED date, and an edit card has none.
    expect(initialDraftValues(DRAFT_FORMS.taskUpdate, new Date(2026, 8, 13))).toEqual({});
    expect(initialDraftValues(DRAFT_FORMS.opportunityUpdate, new Date(2026, 8, 13))).toEqual({});
  });

  it("cancels only with a reason, completes without one, and always carries the record id", () => {
    expect(validateDraft(DRAFT_FORMS.taskCancel, { crm_task_id: "t1" })).toEqual({ reason: "required" });
    expect(validateDraft(DRAFT_FORMS.taskCancel, { crm_task_id: "t1", reason: "Superseded by the new proposal" })).toEqual({});
    expect(validateDraft(DRAFT_FORMS.taskComplete, { crm_task_id: "t1" })).toEqual({});
    for (const id of ["leadUpdate", "opportunityUpdate", "opportunityStage", "taskUpdate", "taskComplete", "taskCancel"] as const) {
      const first = DRAFT_FORMS[id].fields[0];
      expect({ id, required: first.required, readOnly: first.readOnly }).toEqual({ id, required: true, readOnly: true });
      expect(validateDraft(DRAFT_FORMS[id], {})[first.key]).toBe("required");
    }
  });

  it("moves a stage by id, through the tenant's own pipeline stages", () => {
    const spec = DRAFT_FORMS.opportunityStage;
    expect(spec.action).toBe("set-opportunity-pipeline-stage");
    // ERPClaw names this flag --opportunity, not --opportunity-id; the bridge derives the flag from the payload key.
    expect(spec.fields.map((f) => f.key)).toEqual(["opportunity", "stage"]);
    const stage = spec.fields[1];
    expect(stage.kind).toBe("lookup");
    expect(stage.lookup?.type).toBe("crm.pipeline_stage.list");
    expect(stage.lookup?.listKey).toBe("crm_pipeline_stages");
    expect(buildDraftPayload(spec, { opportunity: "o1", stage: "3610e60b-65f9-4f9e-9538-0a71a8494c93" }))
      .toEqual({ opportunity: "o1", stage: "3610e60b-65f9-4f9e-9538-0a71a8494c93" });
  });
});

// The sweep for VTID-03876 caught a select rendering "[[missing:screens.backoffice.draft.choices.contacted]]"
// in both the form and the review card: five new option values had no label. This is the guard for that.
describe("every draft form is fully translated in the source catalogue", () => {
  const cat = (de as unknown as { screens: { backoffice: { draft: Record<string, unknown> } } }).screens.backoffice.draft;
  const group = (k: string) => (cat[k] ?? {}) as Record<string, string>;
  const line = (k: string) => cat[k];
  it("has a label for every form, field and select option", () => {
    const missing: string[] = [];
    for (const spec of Object.values(DRAFT_FORMS)) {
      const form = group("forms")[spec.id] as unknown as Record<string, string> | undefined;
      for (const k of ["button", "title", "description"]) if (!form?.[k]) missing.push(`forms.${spec.id}.${k}`);
      for (const f of spec.fields) {
        if (!group("fields")[f.key]) missing.push(`fields.${f.key}`);
        for (const o of f.options ?? []) if (!group("choices")[o]) missing.push(`choices.${o} (${spec.id}.${f.key})`);
        for (const c of f.columns ?? []) if (!group("fields")[c.key]) missing.push(`fields.${c.key} (${spec.id}.${f.key} column)`);
      }
    }
    expect(missing).toEqual([]);
  });

  // An edit card must never be worded as a creation, so every create-specific line has an update twin.
  it("has an update twin for every create-specific line", () => {
    const hasUpdateForm = Object.values(DRAFT_FORMS).some((spec) => !draftCreates(spec));
    expect(hasUpdateForm).toBe(true);
    for (const k of ["acceptUpdate", "whatHappensUpdate", "updated", "updatedWithRef", "doneUpdate", "doneHintUpdate", "failedUpdate", "failedHintUpdate", "keepsBlank"]) {
      expect(typeof line(k) === "string" && (line(k) as string).length > 0, `draft.${k}`).toBe(true);
    }
    expect(draftCreates(DRAFT_FORMS.lead)).toBe(true);
    expect(draftCreates(DRAFT_FORMS.payment)).toBe(true);
    expect(draftCreates(DRAFT_FORMS.leadUpdate)).toBe(false);
    expect(draftCreates(DRAFT_FORMS.taskComplete)).toBe(false);
    expect(draftCreates(DRAFT_FORMS.opportunityStage)).toBe(false);
  });
});
