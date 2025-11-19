// VITANALAND Voice Assistant - Dedicated Vertex AI Live Session
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// VITANALAND greeting rotation
const VITANALAND_GREETINGS = [
  "Welcome to VITANALAND. I'm here to guide you. What would you like to explore?",
  "Welcome back to VITANALAND. How can I assist you today?",
  "You're here. I'm ready to help. Where would you like to go?",
  "Welcome to your world. Tell me what you want to explore.",
  "I'm here with you. What would you like to do?"
];

// Select a random greeting
const getRandomGreeting = () => {
  return VITANALAND_GREETINGS[Math.floor(Math.random() * VITANALAND_GREETINGS.length)];
};

// VITANALAND system instruction
const VITANALAND_SYSTEM_INSTRUCTION = `You are VITANALAND, a premium wellness concierge for the Vitana app.

PERSONALITY:
- Calm, elegant, composed
- Speak with intention using short, clear sentences
- Supportive and warm, never mystical or robotic
- Professional but personable
- No emojis, no slang

RESPONSE STYLE:
- Keep responses to 1-3 sentences maximum
- Be direct and helpful
- Use a soothing, confident tone
- Avoid filler words or excessive enthusiasm

NAVIGATION REQUESTS (Phase 1 - Conversational Only):
When users ask to navigate somewhere (e.g., "take me to hydration tracker", "show me my calendar"):
- Acknowledge their request warmly
- Provide the location in a helpful way
- Example: "I can help with that soon. For now, you can find it under Health → Hydration."
- DO NOT execute navigation commands yet
- Keep responses brief and guide them to the location

CONVERSATION:
- Answer wellness, health, and app-related questions naturally
- Provide brief, actionable information
- If you don't know something, be honest and direct
- Always maintain the calm, premium concierge tone`;

serve(async (req) => {
  const traceId = `VITANALAND-${Date.now()}`;
  console.log(`[vitanaland-live][${traceId}] 📥 Request received:`, {
    method: req.method,
    url: req.url,
    upgrade: req.headers.get("upgrade"),
    timestamp: new Date().toISOString()
  });
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const upgradeHeader = req.headers.get("upgrade") || "";
  if (upgradeHeader.toLowerCase() !== "websocket") {
    console.error(`[vitanaland-live][${traceId}] ❌ Not a WebSocket request`);
    return new Response("Expected WebSocket connection", { 
      status: 400,
      headers: corsHeaders
    });
  }

  try {
    // Extract token from URL query params or Sec-WebSocket-Protocol header
    const url = new URL(req.url);
    let token = url.searchParams.get('token');

    if (!token) {
      const protoHeader = req.headers.get('sec-websocket-protocol') || '';
      const parts = protoHeader.split(',').map(p => p.trim());
      for (const p of parts) {
        if (p.startsWith('jwt.')) token = p.slice(4);
        else if (p.startsWith('bearer.')) token = p.slice(7);
      }
    }
    console.log(`[vitanaland-live][${traceId}] 🔑 Token present:`, !!token);
    
    if (!token) {
      console.error(`[vitanaland-live][${traceId}] ❌ No token provided`);
      return new Response(JSON.stringify({ error: 'No authorization token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Immediately upgrade to WebSocket BEFORE any async work
    const { socket: clientSocket, response } = Deno.upgradeWebSocket(req);
    console.log(`[vitanaland-live][${traceId}] ✅ WebSocket upgraded, establishing connection...`);

    // Shared state across handlers
    let vertexSocket: WebSocket | null = null;
    let isConnected = false;
    let pingInterval: number | undefined;
    let setupAckReceived = false;
    let hasGreeted = false;

    // Non-async env lookups
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Handle client WebSocket open: do all async setup here
    clientSocket.onopen = async () => {
      console.log(`[vitanaland-live][${traceId}] 🔌 Client WebSocket opened, initiating Vertex connection...`);

      try {
        // Initialize Supabase client scoped to this user
        const supabase = createClient(supabaseUrl, supabaseKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        });

        // Verify user
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
          console.error(`[vitanaland-live][${traceId}] ❌ Unauthorized:`, authError);
          clientSocket.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }));
          clientSocket.close(4001, 'unauthorized');
          return;
        }
        console.log(`[vitanaland-live][${traceId}] 👤 Authenticated user: ${user.id}`);

        // Get Gemini API key from environment
        const apiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');
        if (!apiKey) {
          console.error(`[vitanaland-live][${traceId}] ❌ Missing GOOGLE_GEMINI_API_KEY`);
          clientSocket.send(JSON.stringify({ type: 'error', message: 'API key not configured' }));
          clientSocket.close(4500, 'config-missing');
          return;
        }

        // Connect to Vertex AI Live endpoint
        const modelId = 'gemini-2.0-flash-exp';
        const vertexUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;

        console.log(`[vitanaland-live][${traceId}] 🌐 Connecting to Vertex AI...`);
        vertexSocket = new WebSocket(vertexUrl);

        vertexSocket.onopen = () => {
          console.log(`[vitanaland-live][${traceId}] ✅ Vertex AI connection established`);
          isConnected = true;

          // Send initial setup message with VITANALAND system instruction
          const setupMessage = {
            setup: {
              model: `models/${modelId}`,
              generation_config: {
                response_modalities: ["AUDIO"],
                speech_config: {
                  voice_config: { prebuilt_voice_config: { voice_name: "Aoede" } }
                }
              },
              system_instruction: {
                parts: [{ text: VITANALAND_SYSTEM_INSTRUCTION }]
              }
            }
          };

          console.log(`[vitanaland-live][${traceId}] 📤 Sending VITANALAND setup...`);
          vertexSocket!.send(JSON.stringify(setupMessage));
        };

        vertexSocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            // Handle setup acknowledgment
            if (data.setupComplete) {
              setupAckReceived = true;
              console.log(`[vitanaland-live][${traceId}] ✅ Setup acknowledged by Vertex AI`);
              clientSocket.send(JSON.stringify({ type: 'ready' }));
              
              // Send greeting after setup complete
              if (!hasGreeted) {
                hasGreeted = true;
                const greeting = getRandomGreeting();
                console.log(`[vitanaland-live][${traceId}] 👋 Sending VITANALAND greeting: "${greeting}"`);
                
                setTimeout(() => {
                  const greetingMessage = {
                    client_content: {
                      turns: [
                        { role: "user", parts: [{ text: `Say this greeting exactly: "${greeting}"` }] }
                      ],
                      turn_complete: true
                    }
                  };
                  vertexSocket!.send(JSON.stringify(greetingMessage));
                }, 300);
              }
            }

            // Forward all other messages to client
            if (data.serverContent || data.toolCall || data.toolCallCancellation) {
              clientSocket.send(event.data);
            }
          } catch (err) {
            console.error(`[vitanaland-live][${traceId}] ❌ Error processing Vertex message:`, err);
          }
        };

        vertexSocket.onerror = (error) => {
          console.error(`[vitanaland-live][${traceId}] ❌ Vertex AI error:`, error);
          clientSocket.send(JSON.stringify({ type: 'error', message: 'Vertex AI connection error' }));
        };

        vertexSocket.onclose = () => {
          console.log(`[vitanaland-live][${traceId}] 🔌 Vertex AI connection closed`);
          isConnected = false;
          if (pingInterval) clearInterval(pingInterval);
          clientSocket.close();
        };

        // Start keepalive ping
        pingInterval = setInterval(() => {
          if (isConnected && vertexSocket && vertexSocket.readyState === WebSocket.OPEN) {
            vertexSocket.send(JSON.stringify({ ping: Date.now() }));
          }
        }, 25000);

      } catch (error) {
        console.error(`[vitanaland-live][${traceId}] ❌ Setup error:`, error);
        clientSocket.send(JSON.stringify({ 
          type: 'error', 
          message: error instanceof Error ? error.message : 'Setup failed' 
        }));
        clientSocket.close(4500, 'setup-error');
      }
    };

    // Forward client messages to Vertex AI
    clientSocket.onmessage = (event) => {
      if (!isConnected || !vertexSocket) {
        console.warn(`[vitanaland-live][${traceId}] ⚠️ Not connected, dropping message`);
        return;
      }

      try {
        const data = JSON.parse(event.data);
        console.log(`[vitanaland-live][${traceId}] 📨 Client message type:`, data.type || 'unknown');
        
        // Forward to Vertex AI
        vertexSocket.send(event.data);
      } catch (err) {
        console.error(`[vitanaland-live][${traceId}] ❌ Error forwarding message:`, err);
      }
    };

    clientSocket.onclose = () => {
      console.log(`[vitanaland-live][${traceId}] 🔌 Client disconnected`);
      if (vertexSocket && vertexSocket.readyState === WebSocket.OPEN) {
        vertexSocket.close();
      }
      if (pingInterval) clearInterval(pingInterval);
    };

    clientSocket.onerror = (error) => {
      console.error(`[vitanaland-live][${traceId}] ❌ Client socket error:`, error);
    };

    return response;
  } catch (error) {
    console.error(`[vitanaland-live][${traceId}] ❌ Fatal error:`, error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
