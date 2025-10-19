import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract request data
    const { work_item_id, description } = await req.json();

    console.log(`🚀 CrewAI proxy called for work item: ${work_item_id}`);

    // Validate required fields
    if (!work_item_id || !description) {
      return new Response(
        JSON.stringify({ error: "work_item_id and description are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call CrewAI FastAPI endpoint via ngrok
    console.log(`📡 Calling CrewAI service at ngrok URL...`);
    const crewRes = await fetch("https://isoperimetric-marleigh-untuneably.ngrok-free.dev/crew", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ work_item_id, description }),
    });

    // Handle CrewAI errors
    if (!crewRes.ok) {
      const errorText = await crewRes.text();
      console.error(`❌ CrewAI service error (${crewRes.status}): ${errorText}`);
      return new Response(
        JSON.stringify({ error: "CrewAI service error", details: errorText }),
        { status: crewRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await crewRes.json();
    console.log(`✅ CrewAI response received successfully`);

    // Store result in Supabase
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const { error: insertError } = await supabase.from("crewai_test").insert({
      work_item_id,
      description,
      result: data,
      status: "completed",
    });

    if (insertError) {
      console.error(`❌ Database insert error:`, insertError);
      return new Response(
        JSON.stringify({ error: "Failed to store result", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`💾 Result stored in database for work_item_id: ${work_item_id}`);

    // Return success response with both stored status and CrewAI result
    return new Response(
      JSON.stringify({ 
        stored: true, 
        work_item_id,
        result: data 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`💥 Unexpected error:`, error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
