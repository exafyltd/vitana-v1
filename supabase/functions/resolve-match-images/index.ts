// MAXINA match-card image resolver.
//
// The frontend never decides which image to show — it asks this endpoint and
// renders whatever URLs come back. The resolver applies the canonical priority
// (uploaded > imported > generated > initials) and, if no generated cover
// exists yet, fans out to `generate-fallback-image` to create one ONCE.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import type { MaxinaCategory } from "../_shared/vertex-imagen.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  matchedUserIds: string[];
  /** Used to pick the right cover prompt. Defaults to "wellness". */
  category?: MaxinaCategory;
  /**
   * If false (the default), the resolver returns immediately even when a user
   * has no generated cover yet — the cover is generated in the background and
   * picked up on the next call. Set true for SSR/preview flows that need the
   * URL to be present before responding.
   */
  awaitGeneration?: boolean;
}

type ProfileSource = "uploaded" | "imported" | "generated" | "initials";
type CoverSource = "uploaded" | "generated" | "curated_library" | "initials";

interface ResolvedMatchImage {
  userId: string;
  displayName: string | null;
  initials: string;
  fallbackSeed: string | null;
  profileImageUrl: string | null;
  profileImageSource: ProfileSource;
  matchCoverImageUrl: string | null;
  matchCoverSource: CoverSource;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Missing auth header" }, 401);
    }
    const anon = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await anon.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const body = (await req.json()) as RequestBody;
    const ids = (body.matchedUserIds ?? []).filter(Boolean);
    if (ids.length === 0) return json({ matches: [] });
    const category: MaxinaCategory = body.category ?? "wellness";
    const awaitGeneration = !!body.awaitGeneration;

    const { data: rows, error: profErr } = await admin
      .from("profile_match_image_resolution")
      .select(
        "user_id, full_name, display_name, has_uploaded_photo, " +
          "resolved_profile_source, profile_image_url, " +
          "match_cover_image_url, match_cover_source, fallback_seed",
      )
      .in("user_id", ids);
    if (profErr) throw profErr;

    const byId = new Map<string, typeof rows[number]>();
    for (const r of rows ?? []) byId.set(r.user_id, r);

    // Users that need a Vertex generation. We dispatch them in parallel so a
    // batch of 10 matches isn't bottlenecked by one slow generation.
    const generationsNeeded: Array<Promise<void>> = [];
    const resolved: ResolvedMatchImage[] = [];

    for (const id of ids) {
      const row = byId.get(id);
      if (!row) {
        resolved.push(emptyResolution(id));
        continue;
      }

      const needsCover = row.match_cover_source !== "uploaded" &&
        row.match_cover_source !== "generated" &&
        row.match_cover_source !== "curated_library";

      if (needsCover) {
        const dispatch = invokeGeneration(supabaseUrl, serviceKey, {
          userId: id,
          category,
          imageType: "cover",
        }).then((url) => {
          if (url) {
            row.match_cover_image_url = url;
            row.match_cover_source = "generated";
          }
        }).catch((e) => {
          // Generation failures are non-fatal — the frontend falls back to
          // the initials avatar so the card still renders.
          console.error("cover generation failed", id, (e as Error).message);
        });
        if (awaitGeneration) generationsNeeded.push(dispatch);
      }

      resolved.push(toResolved(row));
    }

    if (awaitGeneration && generationsNeeded.length > 0) {
      await Promise.allSettled(generationsNeeded);
      // Re-emit URLs that were populated mid-flight.
      for (const r of resolved) {
        const row = byId.get(r.userId);
        if (row?.match_cover_image_url) {
          r.matchCoverImageUrl = row.match_cover_image_url;
          r.matchCoverSource =
            (row.match_cover_source as CoverSource) ?? "generated";
        }
      }
    }

    return json({ matches: resolved });
  } catch (err) {
    console.error("resolve-match-images error:", err);
    return json({ error: (err as Error).message ?? "Unknown error" }, 500);
  }
});

function toResolved(
  row: {
    user_id: string;
    full_name: string | null;
    display_name: string | null;
    resolved_profile_source: ProfileSource;
    profile_image_url: string | null;
    match_cover_image_url: string | null;
    match_cover_source: CoverSource | null;
    fallback_seed: string | null;
  },
): ResolvedMatchImage {
  return {
    userId: row.user_id,
    displayName: row.display_name ?? row.full_name,
    initials: deriveInitials(row.display_name ?? row.full_name ?? ""),
    fallbackSeed: row.fallback_seed,
    profileImageUrl: row.profile_image_url,
    profileImageSource: row.resolved_profile_source,
    matchCoverImageUrl: row.match_cover_image_url,
    matchCoverSource: (row.match_cover_source as CoverSource) ?? "initials",
  };
}

function emptyResolution(userId: string): ResolvedMatchImage {
  return {
    userId,
    displayName: null,
    initials: "?",
    fallbackSeed: null,
    profileImageUrl: null,
    profileImageSource: "initials",
    matchCoverImageUrl: null,
    matchCoverSource: "initials",
  };
}

function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

async function invokeGeneration(
  supabaseUrl: string,
  serviceKey: string,
  payload: { userId: string; category: MaxinaCategory; imageType: "cover" },
): Promise<string | null> {
  // We call the sibling function via the edge runtime so it inherits the same
  // environment (project id, service-account JSON, region).
  const res = await fetch(
    `${supabaseUrl}/functions/v1/generate-fallback-image`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data?.imageUrl ?? null;
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
