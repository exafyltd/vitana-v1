import { describe, expect, it } from "vitest";
import { DRAFT_FORMS, buildDraftPayload, draftIdempotencyKey, draftResultSummary, initialDraftValues, validateDraft } from "./backoffice-draft";

describe("draft forms", () => {
  it("every form maps to a Draft typed command with crm.manage and at least one required field", () => {
    for (const spec of Object.values(DRAFT_FORMS)) {
      expect(spec.type).toMatch(/^crm\.[a-z_]+\.create$/);
      expect(spec.capability).toBe("crm.manage");
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
