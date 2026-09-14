/**
 * VTID-03859 — lifecycle of one Draft-tier review card: form → review → submit →
 * done | failed. The idempotency key is minted once per card and kept across
 * retries; `reset()` starts a new card with a new key. On success every cached
 * ERP read for the tenant is invalidated so the list behind the card refetches.
 */
import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTenant } from "@/hooks/useTenant";
import { errorKeyFor, errorKeyOf, postBackOfficeCommand, type BackOfficeErrorKey, type CommandResponse } from "@/hooks/useBackOfficeCommands";
import { draftIdempotencyKey, type DraftFormSpec } from "@/lib/backoffice-draft";

export type DraftPhase = "form" | "review" | "submitting" | "done" | "failed";

export interface DraftOutcome {
  status: number;
  body: CommandResponse;
}

export function useDraftCommand(spec: DraftFormSpec) {
  const qc = useQueryClient();
  const { activeTenantId } = useTenant();
  const [key, setKey] = useState(() => draftIdempotencyKey(spec.type));
  const [phase, setPhase] = useState<DraftPhase>("form");
  const [outcome, setOutcome] = useState<DraftOutcome | null>(null);
  const [thrown, setThrown] = useState<unknown>(null);

  const submit = useCallback(async (payload: Record<string, unknown>) => {
    setPhase("submitting");
    setThrown(null);
    try {
      const r = await postBackOfficeCommand({ type: spec.type, payload, idempotency_key: key, channel: "web" });
      setOutcome(r);
      if (r.body.ok && r.body.command?.status === "executed") {
        setPhase("done");
        await qc.invalidateQueries({ queryKey: ["backoffice-read", activeTenantId] });
        void qc.invalidateQueries({ queryKey: ["backoffice-commands", activeTenantId] });
      } else {
        setPhase("failed");
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

  return { key, phase, outcome, errorKey, reason, submit, review: () => setPhase("review"), back: () => setPhase("form"), reset };
}
