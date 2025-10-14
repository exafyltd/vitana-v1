import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const upgrade = req.headers.get("upgrade") || "";
    if (upgrade.toLowerCase() !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    // Get Google Cloud access token from query params ONLY
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    
    if (!token) {
      return new Response("Missing Google Cloud access token in query parameter", { status: 401 });
    }
    
    if (!token.startsWith('ya29.')) {
      console.error('❌ Invalid token format - expected Google Cloud access token');
      return new Response("Invalid authentication token format", { status: 401 });
    }
    
    console.log('🔑 Using Google Cloud token:', token.substring(0, 20) + '...');

    const { socket: clientSocket, response } = Deno.upgradeWebSocket(req);

    const PROJECT_ID = Deno.env.get('GOOGLE_CLOUD_PROJECT_ID') || 'your-project-id';
    const LOCATION = Deno.env.get('GOOGLE_CLOUD_REGION') || 'us-central1';
    const MODEL = 'gemini-2.0-flash-live-preview-04-09';
    
    const vertexUrl = `wss://${LOCATION}-aiplatform.googleapis.com/ws/google.cloud.aiplatform.v1beta1.GenAiWebSocketService/BidiGenerateContent?access_token=${token}`;
    
    console.log('🔌 Connecting to Vertex AI (with Bearer auth):', vertexUrl);
    
    let vertexSocket: WebSocket | null = null;
    let keepAliveInterval: number | null = null;

    clientSocket.onopen = async () => {
      console.log('📱 Client connected');
      
      try {
        // Connect to Vertex AI using access_token query parameter (Deno can't set custom headers reliably)
        vertexSocket = new WebSocket(vertexUrl);

        vertexSocket.onopen = () => {
          console.log('✅ Connected to Vertex AI');
          
          // Send setup message with configuration
          const setupMessage = {
            setup: {
              model: `projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}`,
              generation_config: {
                response_modalities: ["AUDIO"],
                speech_config: {
                  voice_config: {
                    prebuilt_voice_config: {
                      voice_name: "Aoede"
                    }
                  }
                }
              },
              system_instruction: {
                parts: [{
                  text: "You are a helpful AI assistant. Keep your responses concise and natural."
                }]
              }
            }
          };

          vertexSocket?.send(JSON.stringify(setupMessage));
          console.log('📤 Sent setup message');

          // Start keep-alive for client
          keepAliveInterval = setInterval(() => {
            if (clientSocket.readyState === WebSocket.OPEN) {
              clientSocket.send(JSON.stringify({ type: 'ping' }));
            }
          }, 30000);
        };

        vertexSocket.onmessage = (event) => {
          try {
            const data = typeof event.data === 'string' ? event.data : new TextDecoder().decode(event.data);
            
            if (clientSocket.readyState === WebSocket.OPEN) {
              clientSocket.send(data);
            }
          } catch (error) {
            console.error('❌ Error forwarding message:', error);
          }
        };

        vertexSocket.onerror = (error) => {
          console.error('❌ Vertex AI error:', error);
          if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.send(JSON.stringify({ 
              type: 'error', 
              error: 'Vertex AI connection error' 
            }));
          }
        };

        vertexSocket.onclose = (event) => {
          console.log(`🔌 Vertex AI closed: ${event.code} ${event.reason}`);
          if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.close();
          }
        };

      } catch (error) {
        console.error('❌ Error connecting to Vertex AI:', error);
        if (clientSocket.readyState === WebSocket.OPEN) {
          clientSocket.send(JSON.stringify({ 
            type: 'error', 
            error: error.message 
          }));
          clientSocket.close();
        }
      }
    };

    clientSocket.onmessage = (event) => {
      try {
        if (vertexSocket?.readyState === WebSocket.OPEN) {
          vertexSocket.send(event.data);
        }
      } catch (error) {
        console.error('❌ Error forwarding to Vertex:', error);
      }
    };

    clientSocket.onclose = () => {
      console.log('📱 Client disconnected');
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
      }
      if (vertexSocket?.readyState === WebSocket.OPEN) {
        vertexSocket.close();
      }
    };

    clientSocket.onerror = (error) => {
      console.error('❌ Client error:', error);
    };

    return response;

  } catch (error) {
    console.error('❌ Error in vertex-live:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

