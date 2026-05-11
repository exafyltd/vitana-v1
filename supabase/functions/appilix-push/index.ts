const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function isSuccessfulAppilixResponse(responseText: string): boolean {
  try {
    const payload = JSON.parse(responseText);
    const status = payload?.status;
    return status === true || status === "true" || status === "success";
  } catch {
    return /notification sent successfully/i.test(responseText);
  }
}

function isTargetingFailure(responseText: string): boolean {
  return /no devices found/i.test(responseText) ||
    (/identity/i.test(responseText) && /not found/i.test(responseText));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      user_identity,
      fallback_user_identity,
      notification_title,
      notification_body,
      open_link_url,
    } =
      await req.json();

    if (!user_identity || !notification_title) {
      return new Response(
        JSON.stringify({ error: "Missing user_identity or notification_title" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const appKey = Deno.env.get("APPILIX_APP_KEY");
    const apiKey = Deno.env.get("APPILIX_API_KEY");

    if (!appKey || !apiKey) {
      console.error("Missing APPILIX_APP_KEY or APPILIX_API_KEY secrets");
      return new Response(
        JSON.stringify({ error: "Server misconfiguration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const buildFormBody = (targetIdentity: string): string => {
      const bodyParts = [
        `app_key=${encodeURIComponent(appKey)}`,
        `api_key=${encodeURIComponent(apiKey)}`,
        `user_identity=${encodeURIComponent(targetIdentity)}`,
        `notification_title=${encodeURIComponent(notification_title)}`,
        `notification_body=${encodeURIComponent(notification_body || "")}`,
      ];

      if (open_link_url) {
        bodyParts.push(`open_link_url=${encodeURIComponent(open_link_url)}`);
      }

      return bodyParts.join("&");
    };

    let usedIdentity = user_identity;
    console.log(
      `Sending Appilix push to user_identity=${usedIdentity}, title="${notification_title}"`,
    );

    let response = await fetch("https://appilix.com/api/push-notification", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: buildFormBody(usedIdentity),
    });

    let responseText = await response.text();
    let targetingFailure = isTargetingFailure(responseText);

    if (
      targetingFailure &&
      fallback_user_identity &&
      fallback_user_identity !== usedIdentity
    ) {
      console.warn(
        `Appilix found no device for ${usedIdentity}; retrying fallback identity ${fallback_user_identity}`,
      );
      usedIdentity = fallback_user_identity;
      response = await fetch("https://appilix.com/api/push-notification", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: buildFormBody(usedIdentity),
      });
      responseText = await response.text();
      targetingFailure = isTargetingFailure(responseText);
    }

    const appilixAccepted = response.ok && isSuccessfulAppilixResponse(responseText);
    const success = appilixAccepted && !targetingFailure;

    if (!success) {
      console.warn(
        `Appilix push failed for user_identity=${usedIdentity}: HTTP ${response.status} ${responseText}`,
      );
    }

    return new Response(
      JSON.stringify({
        success,
        status: response.status,
        user_identity: usedIdentity,
        identity_registered: !targetingFailure,
        appilix_response: responseText,
      }),
      {
        status: success ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("appilix-push error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
