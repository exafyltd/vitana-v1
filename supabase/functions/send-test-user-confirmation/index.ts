// Sends a device + locale specific confirmation email to a newly accepted
// MAXINA App Test User. Invoked from a Postgres trigger on
// public.test_user_applications when status flips into invited/active.
//
// Auth: shared secret in X-Trigger-Secret header. The trigger reads the
// secret from app.settings.email_trigger_secret; this function reads the
// same value from the EMAIL_TRIGGER_SECRET env var. The function is
// configured with verify_jwt = false in supabase/config.toml.
//
// Idempotency: the trigger only fires when confirmation_sent_at IS NULL,
// and this function also re-checks the column server-side as a belt-and-
// braces guard before sending. On success it stamps the column.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { type Device, type Locale, renderEmail, subjectFor } from "./templates.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const TRIGGER_SECRET = Deno.env.get("EMAIL_TRIGGER_SECRET") ?? "";

const resend = new Resend(RESEND_API_KEY);
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, content-type, x-trigger-secret",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!TRIGGER_SECRET) {
    console.error("EMAIL_TRIGGER_SECRET is not configured");
    return json({ error: "server_misconfigured" }, 500);
  }

  const provided = req.headers.get("x-trigger-secret");
  if (provided !== TRIGGER_SECRET) {
    return json({ error: "unauthorized" }, 401);
  }

  let payload: { application_id?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const applicationId = payload.application_id;
  if (!applicationId) {
    return json({ error: "missing_application_id" }, 400);
  }

  const { data: app, error: fetchError } = await admin
    .from("test_user_applications")
    .select(
      "id, full_name, email, device, locale, status, confirmation_sent_at",
    )
    .eq("id", applicationId)
    .single();

  if (fetchError || !app) {
    console.error("application not found", { applicationId, fetchError });
    return json({ error: "not_found" }, 404);
  }

  if (app.confirmation_sent_at) {
    return json({ ok: true, skipped: "already_sent" });
  }

  if (!["invited", "active"].includes(app.status)) {
    return json({ ok: true, skipped: "status_not_eligible", status: app.status });
  }

  const device = (app.device === "ios" ? "ios" : "android") as Device;
  const locale = (app.locale === "en" ? "en" : "de") as Locale;

  const html = renderEmail({
    device,
    locale,
    fullName: app.full_name ?? "",
  });

  const { error: sendError } = await resend.emails.send({
    from: "MAXINA <noreply@vitanaland.com>",
    to: [app.email],
    subject: subjectFor(locale),
    html,
  });

  if (sendError) {
    console.error("resend send failed", sendError);
    return json({ error: "send_failed", detail: sendError.message }, 502);
  }

  const { error: stampError } = await admin
    .from("test_user_applications")
    .update({ confirmation_sent_at: new Date().toISOString() })
    .eq("id", applicationId);

  if (stampError) {
    console.error("failed to stamp confirmation_sent_at", stampError);
  }

  console.log(
    `confirmation email sent application=${applicationId} device=${device} locale=${locale}`,
  );

  return json({ ok: true });
});
