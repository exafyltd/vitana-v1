-- BOOTSTRAP-MATCHMAKING-V4 — context-aware, explainable, never-empty matching
--
-- Consolidates the matchmaking scoring onto ONE model (decision: the intent
-- engine is the single source of truth) and fixes the "tennis search returns
-- dance" incident. Replaces the prior compute_intent_matches versions and
-- upgrades search_intent_catalog to the same model.
--
-- PRIORITY (per product decision): Location → Time → Activity → Profile.
--   Location & time dominate; the activity is FLEXIBLE (a nearby person free at
--   your time who wants to walk is a good match for a tennis search). Activity
--   re-orders WITHIN the location+time fit; it never blanks the result.
--
-- CONTEXT-AWARE: the weight mix switches by context derived from the searcher's
-- intent:
--   • physical_social (default): 0.35 loc / 0.30 time / 0.25 activity / 0.10 profile
--   • online_social  (remote):   0.00 loc / 0.40 time / 0.35 activity / 0.25 profile
--   • business (complementary):  0.20 loc / 0.10 time / 0.45 role  / 0.25 profile
--
-- ACTIVITY is DETERMINISTIC (category match), embedding-independent, so it is
-- correct even when embeddings are NULL at match time (the original root cause).
-- Embeddings, when present, only refine the activity term upward.
--
-- NEVER EMPTY: no hard score floor — always return the top-N ranked. Quality is
-- conveyed by `tier` (perfect/great/good/worth_a_look/long_shot), not by hiding
-- low scores. The gateway adds the federation/post/invite fallback when the pool
-- itself is empty.
--
-- EXPLAINABLE: every match row's reasons JSONB carries score, tier, context, and
-- the four dimension fits + activity_exact, so the card and Vitana's voice can
-- explain WHY (and badge "different activity" honestly).

-- ─────────────────────────────────────────────────────────────────────────
-- Reusable fit helpers (IMMUTABLE so both functions share one definition)
-- ─────────────────────────────────────────────────────────────────────────

-- Location fit: remote on either side ⇒ 1.0 (location irrelevant online);
-- same label ⇒ 1.0; both present but different ⇒ 0.3; missing ⇒ 0.5 neutral.
CREATE OR REPLACE FUNCTION public.intent_location_fit(a jsonb, b jsonb)
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN a->>'location_mode' = 'remote' OR b->>'location_mode' = 'remote' THEN 1.0
    WHEN a->>'location_label' IS NOT NULL AND b->>'location_label' IS NOT NULL
         AND lower(a->>'location_label') = lower(b->>'location_label') THEN 1.0
    WHEN a->>'location_label' IS NOT NULL AND b->>'location_label' IS NOT NULL THEN 0.3
    ELSE 0.5
  END::numeric
$$;

-- Skill/experience fit: same level ⇒ 1.0; both set but differ ⇒ 0.5; missing ⇒ 0.5.
CREATE OR REPLACE FUNCTION public.intent_skill_fit(a jsonb, b jsonb)
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN a->>'skill_level' IS NOT NULL AND b->>'skill_level' IS NOT NULL
      THEN CASE WHEN lower(a->>'skill_level') = lower(b->>'skill_level') THEN 1.0 ELSE 0.5 END
    ELSE 0.5
  END::numeric
$$;

-- Deterministic activity fit for SOCIAL (mirror) intents. cosine is NULL when
-- either embedding is missing (so activity is correct without embeddings);
-- when present it can only lift the score, never replace the category signal.
CREATE OR REPLACE FUNCTION public.intent_activity_fit_social(a_cat text, b_cat text, cosine numeric)
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
  SELECT GREATEST(
    CASE
      WHEN a_cat IS NOT NULL AND b_cat IS NOT NULL AND a_cat = b_cat THEN 1.0
      WHEN a_cat IS NOT NULL AND b_cat IS NOT NULL
           AND split_part(a_cat,'.',1) = split_part(b_cat,'.',1) THEN 0.6
      ELSE 0.15
    END,
    COALESCE(cosine, 0)
  )::numeric
$$;

CREATE OR REPLACE FUNCTION public.intent_activity_exact(a_cat text, b_cat text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT a_cat IS NOT NULL AND b_cat IS NOT NULL AND a_cat = b_cat
$$;

-- Tier label from a 0..1 score.
CREATE OR REPLACE FUNCTION public.intent_match_tier(score numeric)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN score >= 0.85 THEN 'perfect'
    WHEN score >= 0.70 THEN 'great'
    WHEN score >= 0.55 THEN 'good'
    WHEN score >= 0.35 THEN 'worth_a_look'
    ELSE 'long_shot'
  END
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- search_intent_catalog v2 — read-only, context-aware, never-empty
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.search_intent_catalog(
  p_user_id      uuid,
  p_tenant_id    uuid,
  p_intent_kind  text,
  p_category     text,
  p_kind_payload jsonb,
  p_embedding    text DEFAULT NULL,
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
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_embedding   vector(768);
  v_is_online   boolean := (p_kind_payload->>'location_mode' = 'remote');
  v_is_business boolean := p_intent_kind IN ('commercial_buy','commercial_sell','learning_seek','mentor_seek','mutual_aid');
  v_ctx         text;
  v_wl numeric; v_wt numeric; v_wa numeric; v_wp numeric;
  v_pool_size   int := 0;
BEGIN
  BEGIN v_embedding := NULLIF(coalesce(p_embedding,''),'')::vector(768);
  EXCEPTION WHEN others THEN v_embedding := NULL; END;

  v_ctx := CASE WHEN v_is_business THEN 'business' WHEN v_is_online THEN 'online_social' ELSE 'physical_social' END;
  IF v_ctx = 'business'      THEN v_wl:=0.20; v_wt:=0.10; v_wa:=0.45; v_wp:=0.25;
  ELSIF v_ctx = 'online_social' THEN v_wl:=0.00; v_wt:=0.40; v_wa:=0.35; v_wp:=0.25;
  ELSE                            v_wl:=0.35; v_wt:=0.30; v_wa:=0.25; v_wp:=0.10;
  END IF;

  SELECT count(*) INTO v_pool_size
    FROM public.user_intents ui
    JOIN public.intent_compatibility ic ON ic.kind_a = p_intent_kind AND ic.kind_b = ui.intent_kind
   WHERE ui.status IN ('open','matched','engaged')
     AND ui.requester_user_id <> p_user_id
     AND (ui.tenant_id = p_tenant_id OR p_visibility = 'public');

  RETURN QUERY
  WITH compat AS (
    SELECT ic.kind_b FROM public.intent_compatibility ic WHERE ic.kind_a = p_intent_kind
  ),
  fits AS (
    SELECT
      ui.intent_id AS c_intent_id, ui.requester_user_id AS c_user_id,
      ui.requester_vitana_id AS c_vitana_id, ui.intent_kind AS c_kind,
      ui.title AS c_title, ui.scope AS c_scope,
      public.intent_location_fit(p_kind_payload, ui.kind_payload) AS location_fit,
      public.intent_overlap_time(p_kind_payload, ui.kind_payload)  AS time_fit,
      CASE
        WHEN v_is_business THEN
          0.5 * (CASE WHEN p_category IS NOT NULL AND ui.category IS NOT NULL AND p_category = ui.category THEN 1.0
                      WHEN p_category IS NOT NULL AND ui.category IS NOT NULL AND split_part(p_category,'.',1)=split_part(ui.category,'.',1) THEN 0.6
                      ELSE 0.3 END)
          + 0.5 * (CASE p_intent_kind
                     WHEN 'commercial_buy'  THEN public.intent_overlap_budget(p_kind_payload, ui.kind_payload)
                     WHEN 'commercial_sell' THEN public.intent_overlap_budget(ui.kind_payload, p_kind_payload)
                     WHEN 'learning_seek'   THEN public.intent_overlap_dance(p_kind_payload, ui.kind_payload)
                     WHEN 'mentor_seek'     THEN public.intent_overlap_dance(p_kind_payload, ui.kind_payload)
                     WHEN 'mutual_aid'      THEN public.intent_overlap_mutual_aid(p_kind_payload, ui.kind_payload)
                     ELSE 0.5 END)
        ELSE public.intent_activity_fit_social(p_category, ui.category,
               CASE WHEN v_embedding IS NULL OR ui.embedding IS NULL THEN NULL
                    ELSE GREATEST(0, LEAST(1, 1 - (v_embedding <=> ui.embedding))) END)
      END AS activity_fit,
      (public.intent_skill_fit(p_kind_payload, ui.kind_payload)
        + GREATEST(0, 1 - (extract(epoch from now() - ui.created_at)/86400.0)/90.0)) / 2.0 AS profile_fit,
      CASE WHEN v_is_business THEN true ELSE public.intent_activity_exact(p_category, ui.category) END AS activity_exact
    FROM public.user_intents ui
    JOIN compat c ON c.kind_b = ui.intent_kind
    WHERE ui.status IN ('open','matched','engaged')
      AND ui.requester_user_id <> p_user_id
      AND (ui.tenant_id = p_tenant_id OR p_visibility = 'public')
      AND (p_intent_kind <> 'mutual_aid' OR public.intent_mutual_aid_inverse(p_kind_payload, ui.kind_payload))
  ),
  scored AS (
    SELECT f.*,
      LEAST(1.0, v_wl*f.location_fit + v_wt*f.time_fit + v_wa*f.activity_fit + v_wp*f.profile_fit)::numeric(4,3) AS s
    FROM fits f
  )
  SELECT s.c_intent_id, s.c_user_id, s.c_vitana_id, s.c_kind, s.c_title, s.c_scope, s.s,
    jsonb_build_object(
      'score', s.s, 'tier', public.intent_match_tier(s.s), 'context', v_ctx,
      'location_fit', round(s.location_fit,3), 'time_fit', round(s.time_fit,3),
      'activity_fit', round(s.activity_fit,3), 'profile_fit', round(s.profile_fit,3),
      'activity_exact', s.activity_exact, 'pool_size', v_pool_size, 'source', 'search_intent_catalog_v2'
    )
  FROM scored s
  ORDER BY s.s DESC
  LIMIT GREATEST(p_top_n, 1);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- compute_intent_matches v4 — persists ranked matches with the same model
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.compute_intent_matches(
  p_intent_id uuid,
  p_top_n     int DEFAULT 5
) RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  src record;
  v_is_online boolean; v_is_business boolean; v_ctx text;
  v_wl numeric; v_wt numeric; v_wa numeric; v_wp numeric;
  v_pool_size int := 0; v_inserted int := 0;
BEGIN
  SELECT * INTO src FROM public.user_intents WHERE intent_id = p_intent_id;
  IF NOT FOUND OR src.status NOT IN ('open','matched','engaged') THEN RETURN 0; END IF;

  v_is_online   := (src.kind_payload->>'location_mode' = 'remote');
  v_is_business := src.intent_kind IN ('commercial_buy','commercial_sell','learning_seek','mentor_seek','mutual_aid');
  v_ctx := CASE WHEN v_is_business THEN 'business' WHEN v_is_online THEN 'online_social' ELSE 'physical_social' END;
  IF v_ctx = 'business'      THEN v_wl:=0.20; v_wt:=0.10; v_wa:=0.45; v_wp:=0.25;
  ELSIF v_ctx = 'online_social' THEN v_wl:=0.00; v_wt:=0.40; v_wa:=0.35; v_wp:=0.25;
  ELSE                            v_wl:=0.35; v_wt:=0.30; v_wa:=0.25; v_wp:=0.10;
  END IF;

  SELECT count(*) INTO v_pool_size
    FROM public.user_intents ui
    JOIN public.intent_compatibility ic ON ic.kind_a = src.intent_kind AND ic.kind_b = ui.intent_kind
   WHERE ui.status IN ('open','matched','engaged')
     AND ui.requester_user_id <> src.requester_user_id
     AND (ui.tenant_id = src.tenant_id OR src.visibility = 'public');

  WITH compat AS (
    SELECT ic.kind_b FROM public.intent_compatibility ic WHERE ic.kind_a = src.intent_kind
  ),
  fits AS (
    SELECT
      ui.intent_id AS c_intent_id, ui.requester_user_id AS c_user_id, ui.requester_vitana_id AS c_vitana_id,
      ui.intent_kind AS c_kind,
      public.intent_location_fit(src.kind_payload, ui.kind_payload) AS location_fit,
      public.intent_overlap_time(src.kind_payload, ui.kind_payload)  AS time_fit,
      CASE
        WHEN v_is_business THEN
          0.5 * (CASE WHEN src.category IS NOT NULL AND ui.category IS NOT NULL AND src.category = ui.category THEN 1.0
                      WHEN src.category IS NOT NULL AND ui.category IS NOT NULL AND split_part(src.category,'.',1)=split_part(ui.category,'.',1) THEN 0.6
                      ELSE 0.3 END)
          + 0.5 * (CASE src.intent_kind
                     WHEN 'commercial_buy'  THEN public.intent_overlap_budget(src.kind_payload, ui.kind_payload)
                     WHEN 'commercial_sell' THEN public.intent_overlap_budget(ui.kind_payload, src.kind_payload)
                     WHEN 'learning_seek'   THEN public.intent_overlap_dance(src.kind_payload, ui.kind_payload)
                     WHEN 'mentor_seek'     THEN public.intent_overlap_dance(src.kind_payload, ui.kind_payload)
                     WHEN 'mutual_aid'      THEN public.intent_overlap_mutual_aid(src.kind_payload, ui.kind_payload)
                     ELSE 0.5 END)
        ELSE public.intent_activity_fit_social(src.category, ui.category,
               CASE WHEN src.embedding IS NULL OR ui.embedding IS NULL THEN NULL
                    ELSE GREATEST(0, LEAST(1, 1 - (src.embedding <=> ui.embedding))) END)
      END AS activity_fit,
      (public.intent_skill_fit(src.kind_payload, ui.kind_payload)
        + GREATEST(0, 1 - (extract(epoch from now() - ui.created_at)/86400.0)/90.0)) / 2.0 AS profile_fit,
      CASE WHEN v_is_business THEN true ELSE public.intent_activity_exact(src.category, ui.category) END AS activity_exact
    FROM public.user_intents ui
    JOIN compat c ON c.kind_b = ui.intent_kind
    WHERE ui.status IN ('open','matched','engaged')
      AND ui.requester_user_id <> src.requester_user_id
      AND (ui.tenant_id = src.tenant_id OR src.visibility = 'public')
      AND (src.intent_kind <> 'mutual_aid' OR public.intent_mutual_aid_inverse(src.kind_payload, ui.kind_payload))
  ),
  scored AS (
    SELECT f.*, LEAST(1.0, v_wl*f.location_fit + v_wt*f.time_fit + v_wa*f.activity_fit + v_wp*f.profile_fit)::numeric(4,3) AS s
    FROM fits f
  ),
  ranked AS (
    SELECT * FROM scored ORDER BY s DESC LIMIT GREATEST(p_top_n, 1)
  ),
  inserted AS (
    INSERT INTO public.intent_matches (
      intent_a_id, intent_b_id, vitana_id_a, vitana_id_b, kind_pairing, score, match_reasons, compass_aligned, state
    )
    SELECT src.intent_id, r.c_intent_id, src.requester_vitana_id, r.c_vitana_id,
      src.intent_kind || '::' || r.c_kind, r.s,
      jsonb_build_object(
        'score', r.s, 'tier', public.intent_match_tier(r.s), 'context', v_ctx,
        'location_fit', round(r.location_fit,3), 'time_fit', round(r.time_fit,3),
        'activity_fit', round(r.activity_fit,3), 'profile_fit', round(r.profile_fit,3),
        'activity_exact', r.activity_exact, 'pool_size', v_pool_size, 'source', 'compute_intent_matches_v4'
      ),
      false, 'new'
    FROM ranked r
    ON CONFLICT (intent_a_id, intent_b_id, external_target_kind, external_target_id) DO NOTHING
    RETURNING intent_b_id
  )
  UPDATE public.user_intents ui SET match_count = ui.match_count + 1
    FROM inserted i WHERE ui.intent_id = i.intent_b_id;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  UPDATE public.user_intents
     SET match_count = (SELECT count(*) FROM public.intent_matches WHERE intent_a_id = src.intent_id)
   WHERE intent_id = src.intent_id;

  RETURN v_inserted;
END;
$$;

COMMENT ON FUNCTION public.compute_intent_matches(uuid, int) IS
  'v4 (BOOTSTRAP-MATCHMAKING-V4): context-aware (physical/online/business) Location→Time→Activity→Profile scoring; deterministic activity_fit (embedding-independent); never-empty (no floor, top-N ranked); reasons carry tier + per-dimension fits + activity_exact.';
COMMENT ON FUNCTION public.search_intent_catalog(uuid, uuid, text, text, jsonb, text, text, int) IS
  'v2 (BOOTSTRAP-MATCHMAKING-V4): read-only mirror of compute_intent_matches v4 scoring; returns ranked candidates + tier/dimension reasons without persisting.';

GRANT EXECUTE ON FUNCTION public.search_intent_catalog(uuid, uuid, text, text, jsonb, text, text, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.intent_location_fit(jsonb, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.intent_skill_fit(jsonb, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.intent_activity_fit_social(text, text, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.intent_activity_exact(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.intent_match_tier(numeric) TO service_role;
