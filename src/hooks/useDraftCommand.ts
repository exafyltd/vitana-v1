/**
 * VTID-03859 — lifecycle of one Draft-tier review card: form → review → submit →
 * done | failed. The idempotency key is minted once per card and kept across
 * retries; `reset()` starts a new card with a new key. On success every cached
 * ERP read for the tenant is invalidated so the list behind the card refetches.
 *
 * VTID-03888 — the same lifecycle carries the Commit tier (`confirm: true` is sent
 * only when the dialog collected an explicit confirmation) and the High-risk tier,
 * which never executes here: a 202 / `awaiting_approval` lands in the `queued`
 * phase and refreshes the approvals + my-requests lists instead of the ERP reads.
 */
import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTenant } from "@/hooks/useTenant";
import { errorKeyFor, errorKeyOf, postBackOfficeCommand, type BackOfficeErrorKey, type CommandResponse } from "@/hooks/useBackOfficeCommands";
import { draftIdempotencyKey, type DraftFormSpec } from "@/lib/backoffice-draft";

export type DraftPhase = "form" | "review" | "submitting" | "done" | "queued" | "failed";

export interface DraftOutcome {
  status: number;
  body: CommandResponse;
}

/** What the gateway answer means for the card. Pure, so the tier rules stay testable without React. */
export function draftPhaseFor(status: number, body: CommandResponse): Extract<DraftPhase, "done" | "queued" | "failed"> {
  if (body.ok && body.command?.status === "executed") return "done";
  if (status === 202 || body.command?.status === "awaiting_approval") return "queued";
  return "failed";
}

export function useDraftCommand(spec: DraftFormSpec) {
  const qc = useQueryClient();
  const { activeTenantId } = useTenant();
  const [key, setKey] = useState(() => draftIdempotencyKey(spec.type));
  const [phase, setPhase] = useState<DraftPhase>("form");
  const [outcome, setOutcome] = useState<DraftOutcome | null>(null);
  const [thrown, setThrown] = useState<unknown>(null);

  const submit = useCallback(async (payload: Record<string, unknown>, confirm = false) => {
    setPhase("submitting");
    setThrown(null);
    try {
      const r = await postBackOfficeCommand({ type: spec.type, payload, idempotency_key: key, channel: "web", confirm });
      setOutcome(r);
      const next = draftPhaseFor(r.status, r.body);
      setPhase(next);
      if (next === "done") {
        await qc.invalidateQueries({ queryKey: ["backoffice-read", activeTenantId] });
        void qc.invalidateQueries({ queryKey: ["backoffice-commands", activeTenantId] });
      } else if (next === "queued") {
        void qc.invalidateQueries({ queryKey: ["backoffice-approvals", activeTenantId] });
        void qc.invalidateQueries({ queryKey: ["backoffice-commands", activeTenantId] });
      }
    } catch (e) {
      setThrown(e);
      setPhase("failed");
    }
  }, [spec.type, key, qc, activeTenantId]);

  const reset = useCallback(() => {
    setKey(draftIdempotencyKey(spec.type));
    setPhase("form");
    setOutcome(null);
    setThrown(null);
  }, [spec.type]);

  const errorKey: BackOfficeErrorKey | null = phase !== "failed" ? null : thrown ? errorKeyOf(thrown) : outcome ? errorKeyFor(outcome.status, outcome.body) : "generic";
  const reason = outcome?.body.command?.reason ?? outcome?.body.error ?? null;
  const approvalId = outcome?.body.approval?.approval_id ?? outcome?.body.command?.approval_id ?? null;

  return { key, phase, outcome, errorKey, reason, approvalId, submit, review: () => setPhase("review"), back: () => setPhase("form"), reset };
}
