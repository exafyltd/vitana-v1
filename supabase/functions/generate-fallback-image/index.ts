// MAXINA fallback image generator.
//
// Generates either a profile avatar OR a category-aware match cover for a
// single user via Vertex AI Imagen, uploads it to the `match-covers` bucket
// and writes the resulting URL onto `profiles`. This function is intentionally
// the ONLY place that calls Imagen for the match-card pipeline so we can
// guarantee "generate once, reuse forever".

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import {
  buildPrompt,
  generateImagenPng,
  hashSeed,
  type ImageType,
  type MaxinaCategory,
} from "../_shared/vertex-imagen.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  userId: string;
  category?: MaxinaCategory;
  imageType: ImageType;
  /** Skip the "already generated" short-circuit — admin/debug only. */
  force?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  try {
    // Auth: caller must be signed-in. Service-role callers (other edge
    // functions) bypass by sending the service key as the bearer token.
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const isService = token === serviceKey;
    if (!isService) {
      const anon = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error } = await anon.auth.getUser();
      if (error || !user) {
        return json({ error: "Unauthorized" }, 401);
      }
    }

    const body = (await req.json()) as RequestBody;
    if (!body?.userId || !body?.imageType) {
      return json({ error: "userId and imageType required" }, 400);
    }
    const category: MaxinaCategory = body.category ?? "wellness";

    // Look up the profile to honour upload priority and reuse existing assets.
    const { data: profile, error: profErr } = await admin
      .from("profiles")
      .select(
        "user_id, profile_image_url, profile_image_source, " +
          "match_cover_image_url, match_cover_source, fallback_seed, " +
          "has_uploaded_photo",
      )
      .eq("user_id", body.userId)
      .maybeSingle();

    if (profErr) throw profErr;
    if (!profile) return json({ error: "Profile not found" }, 404);

    // Priority short-circuits: never overwrite a real upload or import.
    if (body.imageType === "avatar" && !body.force) {
      if (profile.has_uploaded_photo && profile.profile_image_url) {
        return json({
          imageUrl: profile.profile_image_url,
          source: "uploaded",
          reused: true,
        });
      }
      if (
        profile.profile_image_source === "imported" &&
        profile.profile_image_url
      ) {
        return json({
          imageUrl: profile.profile_image_url,
          source: "imported",
          reused: true,
        });
      }
      if (
        profile.profile_image_source === "generated" &&
        profile.profile_image_url
      ) {
        return json({
          imageUrl: profile.profile_image_url,
          source: "generated",
          reused: true,
        });
      }
    }

    if (body.imageType === "cover" && !body.force) {
      if (
        profile.match_cover_source === "uploaded" &&
        profile.match_cover_image_url
      ) {
        return json({
          imageUrl: profile.match_cover_image_url,
          source: "uploaded",
          reused: true,
        });
      }
      if (
        profile.match_cover_source === "generated" &&
        profile.match_cover_image_url
      ) {
        return json({
          imageUrl: profile.match_cover_image_url,
          source: "generated",
          reused: true,
        });
      }
    }

    // Generate via Imagen. The seed makes regeneration deterministic per user
    // so retries don't keep producing different images for the same person.
    const seedSource = profile.fallback_seed ?? profile.user_id;
    const seed = hashSeed(`${seedSource}:${body.imageType}:${category}`);
    const prompt = buildPrompt(category, body.imageType);
    const aspectRatio = body.imageType === "avatar" ? "1:1" : "4:3";

    const { pngBytes, model } = await generateImagenPng({
      prompt,
      aspectRatio,
      seed,
    });

    // Stable storage key: replacing on re-generation keeps CDN cost flat.
    const fileName =
      `${body.userId}/${body.imageType}-${category}.png`;
    const { error: upErr } = await admin.storage
      .from("match-covers")
      .upload(fileName, pngBytes, {
        contentType: "image/png",
        upsert: true,
      });
    if (upErr) throw upErr;

    const { data: urlData } = admin.storage
      .from("match-covers")
      .getPublicUrl(fileName);
    const publicUrl = urlData.publicUrl;

    // Persist image source metadata so the resolver can short-circuit next time.
    const update: Record<string, unknown> = {
      image_last_generated_at: new Date().toISOString(),
    };
    if (body.imageType === "avatar") {
      update.profile_image_url = publicUrl;
      update.profile_image_source = "generated";
    } else {
      update.match_cover_image_url = publicUrl;
      update.match_cover_source = "generated";
    }
    const { error: updErr } = await admin
      .from("profiles")
      .update(update)
      .eq("user_id", body.userId);
    if (updErr) throw updErr;

    return json({
      imageUrl: publicUrl,
      source: "generated",
      reused: false,
      model,
    });
  } catch (err) {
    const message = (err as Error)?.message ?? "Unknown error";
    const status = message === "RATE_LIMIT" ? 429 : 500;
    console.error("generate-fallback-image error:", message);
    return json({ error: message }, status);
  }
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
