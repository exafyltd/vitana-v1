// VTID-04964: retired. This function had verify_jwt=false and no caller
// check, so anyone with its URL could push any title, body and link to any
// member through our Appilix keys. Nothing calls it since the database
// trigger was dropped (migration 20260508000100); the gateway sends Appilix
// pushes directly. Every request now gets 410 Gone, and the caller's method,
// user agent and origin are logged (never the body) so an unexpected caller
// shows up in the function logs.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  console.warn(
    "appilix-push retired: refused call",
    JSON.stringify({
      method: req.method,
      user_agent: req.headers.get("user-agent"),
      origin: req.headers.get("origin"),
    }),
  );

  return new Response(
    JSON.stringify({ error: "appilix-push retired; pushes are sent by the gateway" }),
    { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
