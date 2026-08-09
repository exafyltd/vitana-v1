-- BOOTSTRAP-FIND-MATCH-VOICE — search_intent_catalog (read-only "find a match")
--
-- The Vitana Intent Engine could only match an intent AFTER it was persisted:
-- compute_intent_matches(p_intent_id) reads a stored user_intents row, scores
-- the catalog against it, and INSERTs intent_matches. There was no way to ask
-- "is there already someone in the catalog for this?" without first creating a
-- post.
--
-- This function is that missing read-only primitive. It takes the classified +
-- extracted + embedded request as PARAMETERS (no row required), runs the exact
-- same scoring as compute_intent_matches v3 (cosine with NULL tolerance +
-- kind/geo/recency/dance/category overlap + density-aware floor), and RETURNS
-- the ranked candidate intents from OTHER users. It writes nothing.
--
-- The voice tool `find_match` calls this first:
--   • candidates found  → recommend them (and separately post so the user is
--                         discoverable too).
--   • none found        → fall back to posting the intent.
--
-- Scoring parity note: keep this in lockstep with compute_intent_matches v3
-- (migration 20260505000100_d11a_compute_intent_matches_v3.sql). The only
-- differences are: (1) inputs are params, not a row; (2) it SELECTs instead of
-- INSERTing; (3) it also returns title/scope so the assistant can read matches
-- back by voice.

CREATE OR REPLACE FUNCTION public.search_intent_catalog(
  p_user_id      uuid,
  p_tenant_id    uuid,
  p_intent_kind  text,
  p_category     text,
  p_kind_payload jsonb,
  p_embedding    text DEFAULT NULL,   -- '[...]' vector literal, or NULL when not embedded yet
  p_visibility   text DEFAULT 'public',
  p_top_n        int  DEFAULT 5
) RETURNS TABLE (
  cand_intent_id  uuid,
  cand_user_id    uuid,
  cand_vitana_id  text,
  cand_kind       text,
  cand_title      text,
  cand_scope      text,
  score           numeric,
  reasons         jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_embedding vector(768);
  v_pool_size int := 0;
  v_floor     numeric;
BEGIN
  -- Parse the optional embedding literal. Tolerant: a bad/empty value just
  -- means "no embedding" and the cosine term falls back to neutral (0.5).
  BEGIN
    v_embedding := NULLIF(coalesce(p_embedding, ''), '')::vector(768);
  EXCEPTION WHEN others THEN
    v_embedding := NULL;
  END;

  -- Density probe across all compatible kinds in scope (same as v3).
  SELECT count(*) INTO v_pool_size
    FROM public.user_intents ui
    JOIN public.intent_compatibility ic
      ON ic.kind_a = p_intent_kind AND ic.kind_b = ui.intent_kind
   WHERE ui.status IN ('open','matched','engaged')
     AND ui.requester_user_id <> p_user_id
     AND (ui.tenant_id = p_tenant_id OR p_visibility = 'public');

  v_floor := CASE
    WHEN v_pool_size < 5  THEN 0.05::numeric  -- solo mode
    WHEN v_pool_size < 50 THEN 0.15::numeric  -- early mode
    ELSE                       0.30::numeric  -- growth+ mode
  END;

  RETURN QUERY
  WITH compat AS (
    SELECT ic.kind_b
      FROM public.intent_compatibility ic
     WHERE ic.kind_a = p_intent_kind
  ),
  candidates AS (
    SELECT
      ui.intent_id            AS c_intent_id,
      ui.requester_user_id    AS c_user_id,
      ui.requester_vitana_id  AS c_vitana_id,
      ui.intent_kind          AS c_kind,
      ui.title                AS c_title,
      ui.scope                AS c_scope,
      CASE
        WHEN v_embedding IS NULL OR ui.embedding IS NULL THEN 0.5::numeric
        ELSE GREATEST(0, LEAST(1, 1 - (v_embedding <=> ui.embedding)))::numeric
      END AS cosine_sim,
      CASE p_intent_kind
        WHEN 'commercial_buy'  THEN public.intent_overlap_budget(p_kind_payload, ui.kind_payload)
        WHEN 'commercial_sell' THEN public.intent_overlap_budget(ui.kind_payload, p_kind_payload)
        WHEN 'activity_seek'   THEN public.intent_overlap_time(p_kind_payload, ui.kind_payload)
        WHEN 'partner_seek'    THEN public.intent_overlap_partner(p_kind_payload, ui.kind_payload)
        WHEN 'social_seek'     THEN public.intent_overlap_time(p_kind_payload, ui.kind_payload)
        WHEN 'mutual_aid'      THEN public.intent_overlap_mutual_aid(p_kind_payload, ui.kind_payload)
        WHEN 'learning_seek'   THEN public.intent_overlap_dance(p_kind_payload, ui.kind_payload)
        WHEN 'mentor_seek'     THEN public.intent_overlap_dance(p_kind_payload, ui.kind_payload)
        ELSE 0::numeric
      END AS kind_overlap,
      CASE
        WHEN p_kind_payload->>'location_label' IS NOT NULL
         AND ui.kind_payload->>'location_label' IS NOT NULL
         AND lower(p_kind_payload->>'location_label') = lower(ui.kind_payload->>'location_label')
        THEN 1.0::numeric
        WHEN p_kind_payload->>'location_mode' = 'remote'
          OR ui.kind_payload->>'location_mode' = 'remote'
        THEN 1.0::numeric
        ELSE 0.3::numeric
      END AS geo_overlap,
      GREATEST(0, 1 - (extract(epoch from now() - ui.created_at) / 86400.0) / 90.0)::numeric AS recency_bonus,
      CASE
        WHEN p_kind_payload -> 'dance' IS NOT NULL
         AND ui.kind_payload -> 'dance' IS NOT NULL
         AND lower((p_kind_payload -> 'dance') ->> 'variety')
           = lower((ui.kind_payload -> 'dance') ->> 'variety')
         AND lower((p_kind_payload -> 'dance') ->> 'variety') NOT IN ('other','')
        THEN 0.10::numeric
        ELSE 0::numeric
      END AS dance_bonus,
      CASE
        WHEN p_category IS NOT NULL
         AND ui.category IS NOT NULL
         AND split_part(p_category, '.', 1) = split_part(ui.category, '.', 1)
        THEN 0.10::numeric
        ELSE 0::numeric
      END AS category_prefix_bonus,
      ui.embedding IS NOT NULL AS cand_has_embedding
    FROM public.user_intents ui
    JOIN compat c ON c.kind_b = ui.intent_kind
    WHERE ui.status IN ('open','matched','engaged')
      AND ui.requester_user_id <> p_user_id
      AND (ui.tenant_id = p_tenant_id OR p_visibility = 'public')
      AND (
        p_intent_kind <> 'mutual_aid'
        OR public.intent_mutual_aid_inverse(p_kind_payload, ui.kind_payload)
      )
  ),
  scored AS (
    SELECT
      c.c_intent_id,
      c.c_user_id,
      c.c_vitana_id,
      c.c_kind,
      c.c_title,
      c.c_scope,
      LEAST(1.0,
        0.40 * c.cosine_sim
        + 0.20 * c.kind_overlap
        + 0.20 * c.geo_overlap
        + 0.10 * c.recency_bonus
        + c.dance_bonus
        + c.category_prefix_bonus
      )::numeric(4,3) AS score_base,
      jsonb_build_object(
        'cosine',        c.cosine_sim,
        'kind_overlap',  c.kind_overlap,
        'geo',           c.geo_overlap,
        'recency',       c.recency_bonus,
        'dance_bonus',   c.dance_bonus,
        'category_prefix_bonus', c.category_prefix_bonus,
        'pool_size',     v_pool_size,
        'mode',          CASE WHEN v_pool_size < 5 THEN 'solo' WHEN v_pool_size < 50 THEN 'early' ELSE 'growth' END,
        'embedding_present', v_embedding IS NOT NULL AND c.cand_has_embedding,
        'source',        'search_intent_catalog'
      ) AS reasons_json
    FROM candidates c
  )
  SELECT
    s.c_intent_id,
    s.c_user_id,
    s.c_vitana_id,
    s.c_kind,
    s.c_title,
    s.c_scope,
    s.score_base,
    s.reasons_json
  FROM scored s
  WHERE s.score_base >= v_floor
  ORDER BY s.score_base DESC
  LIMIT GREATEST(p_top_n, 1);
END;
$$;

COMMENT ON FUNCTION public.search_intent_catalog(uuid, uuid, text, text, jsonb, text, text, int) IS
  'BOOTSTRAP-FIND-MATCH-VOICE: read-only catalog search. Same scoring as compute_intent_matches v3 but takes the request as params and RETURNS ranked candidates without persisting. Backs the voice find_match tool (recommend-or-post).';

-- Service role executes this (gateway uses SUPABASE_SERVICE_ROLE). Grant
-- explicitly so PostgREST exposes the RPC.
GRANT EXECUTE ON FUNCTION public.search_intent_catalog(uuid, uuid, text, text, jsonb, text, text, int) TO service_role;
