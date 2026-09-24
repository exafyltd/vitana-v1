-- VTID-04514 (Community Autopilot CA-9): drop four Autopilot tables that were
-- never written.
--
-- Measured 2026-09-24 on the live project: 0 rows in each; no view or function
-- depends on them; the only foreign key INTO any of them is
-- autopilot_feedback -> autopilot_actions (dropped first). Autopilot state
-- lives in autopilot_recommendations (VTID-04503 and later); automation runs in
-- automation_runs.
--
-- Readers removed in the same PR: fetch-user-context, get-proactive-context,
-- analyze-patterns, request-account-deletion.
--
-- ORDER: apply only AFTER those edge functions are deployed (manual dispatch of
-- supabase-functions-deploy.yml). This file is not wired to any apply workflow.
-- automation_rules and tenant_autopilot_runs are kept (still read).
--
-- Guard: refuses to drop a table that has gained a row since it was measured.

DO $$
DECLARE
  t text;
  n bigint;
BEGIN
  FOREACH t IN ARRAY ARRAY['autopilot_feedback','autopilot_actions','autopilot_action_templates','automation_executions'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('SELECT count(*) FROM public.%I', t) INTO n;
      IF n > 0 THEN
        RAISE EXCEPTION 'VTID-04514: public.% has % row(s); not dropping', t, n;
      END IF;
    END IF;
  END LOOP;
END $$;

DROP TABLE IF EXISTS public.autopilot_feedback;
DROP TABLE IF EXISTS public.autopilot_actions;
DROP TABLE IF EXISTS public.autopilot_action_templates;
DROP TABLE IF EXISTS public.automation_executions;
