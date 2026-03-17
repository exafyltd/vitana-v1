import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_identity, notification_title, notification_body, open_link_url } =
      await req.json();

    if (!user_identity || !notification_title) {
      return new Response(
        JSON.stringify({ error: "Missing user_identity or notification_title" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const appKey = Deno.env.get("APPILIX_APP_KEY");
    const apiKey = Deno.env.get("APPILIX_API_KEY");

    if (!appKey || !apiKey) {
      console.error("Missing APPILIX_APP_KEY or APPILIX_API_KEY secrets");
      return new Response(
        JSON.stringify({ error: "Server misconfiguration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build form-urlencoded body matching Appilix cURL format
    const params = new URLSearchParams();
    params.append("app_key", appKey);
    params.append("api_key", apiKey);
    params.append("user_identity", user_identity);
    params.append("notification_title", notification_title);
    params.append("notification_message", notification_body || "");
    if (open_link_url) {
      params.append("open_link_url", open_link_url);
    }

    console.log(`📤 Sending Appilix push to user_identity=${user_identity}, title="${notification_title}"`);

    const response = await fetch("https://appilix.com/api/push-notification", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const responseText = await response.text();
    console.log(`📥 Appilix response: ${response.status} — ${responseText}`);

    return new Response(
      JSON.stringify({
        success: response.ok,
        status: response.status,
        appilix_response: responseText,
      }),
      { status: response.ok ? 200 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("❌ appilix-push error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
