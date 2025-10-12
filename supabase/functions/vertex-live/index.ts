import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('📥 Received request:', req.method, req.url);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const upgradeHeader = req.headers.get("upgrade") || "";
  console.log('🔍 Upgrade header:', upgradeHeader);
  const proto = req.headers.get('sec-websocket-protocol') || '';
  const version = req.headers.get('sec-websocket-version') || '';
  const origin = req.headers.get('origin') || '';
  console.log('🔎 WS headers:', { origin, version, proto });
  
  if (upgradeHeader.toLowerCase() !== "websocket") {
    console.error('❌ Not a WebSocket request');
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
      // Example values we support: "jwt.<token>", "bearer.<token>"
      const parts = protoHeader.split(',').map(p => p.trim());
      for (const p of parts) {
        if (p.startsWith('jwt.')) token = p.slice(4);
        else if (p.startsWith('bearer.')) token = p.slice(7);
      }
    }
    console.log('🔑 Token present:', !!token);
    
    if (!token) {
      console.error('❌ No token provided');
      return new Response(JSON.stringify({ error: 'No authorization token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Immediately upgrade to WebSocket BEFORE any async work
    const { socket: clientSocket, response } = Deno.upgradeWebSocket(req);
    console.log('🔄 Upgraded to WebSocket (server handshake complete)');

    // Shared state across handlers
    let vertexSocket: WebSocket | null = null;
    let conversationId: string | null = null;
    let isConnected = false;
    let pingInterval: number | undefined;

    // Non-async env lookups
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Handle client WebSocket open: do all async setup here
    clientSocket.onopen = async () => {
      console.log('✅ Client WebSocket connected');

      try {
        // Initialize Supabase client scoped to this user
        const supabase = createClient(supabaseUrl, supabaseKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        });

        // Verify user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          console.error('❌ Unauthorized:', authError);
          clientSocket.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }));
          clientSocket.close(4001, 'unauthorized');
          return;
        }
        console.log(`👤 Authenticated user: ${user.id}`);

        // Create conversation
        try {
          const { data: conversation, error: convError } = await supabase
            .from('ai_conversations')
            .insert({
              user_id: user.id,
              agent_type: 'vertex_live',
              metadata: { model: 'gemini-2.0-flash-live-preview-04-09' },
            })
            .select()
            .single();

          if (convError) {
            console.warn('⚠️ Failed to create conversation:', convError);
          } else {
            conversationId = conversation.id;
            console.log(`📝 Created conversation: ${conversationId}`);
          }
        } catch (e) {
          console.warn('⚠️ Conversation creation error (non-fatal):', e);
        }

        // Get Vertex access token via edge function
        const authResponse = await fetch(`${supabaseUrl}/functions/v1/vertex-auth`, {
          headers: { Authorization: `Bearer ${token}`, apikey: supabaseKey },
        });
        if (!authResponse.ok) {
          console.error('❌ vertex-auth failed:', authResponse.status);
          clientSocket.send(JSON.stringify({ type: 'error', message: 'Vertex auth failed' }));
          clientSocket.close(4002, 'vertex-auth-failed');
          return;
        }
        const { access_token } = await authResponse.json();

        // Get project id from service account
        const serviceAccountJson = Deno.env.get('GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON');
        if (!serviceAccountJson) {
          console.error('❌ Missing GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON');
          clientSocket.send(JSON.stringify({ type: 'error', message: 'Server misconfiguration' }));
          clientSocket.close(4500, 'config-missing');
          return;
        }
        const serviceAccount = JSON.parse(serviceAccountJson);
        const projectId = serviceAccount.project_id;

        // Connect to Vertex Live WS using access_token
        const vertexUrl = `wss://us-central1-aiplatform.googleapis.com/ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent?access_token=${access_token}`;
        console.log('🔗 Connecting to Vertex WS...');
        vertexSocket = new WebSocket(vertexUrl);

        vertexSocket.onopen = () => {
          console.log('✅ Connected to Vertex AI Live API');
          isConnected = true;

          // Send setup configuration
          const setupMessage = {
            setup: {
              model: `projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.0-flash-live-preview-04-09`,
              generation_config: {
                response_modalities: ['AUDIO'],
                speech_config: {
                  voice_config: { prebuilt_voice_config: { voice_name: 'Aoede' } },
                },
              },
              system_instruction: {
                parts: [{
                  text:
                    'You are a helpful AI assistant. Keep your responses natural and conversational. When the user shares their screen, describe what you see and provide helpful insights.',
                }],
              },
            },
          };
          vertexSocket!.send(JSON.stringify(setupMessage));
          console.log('📤 Sent setup configuration to Vertex AI');

          // Notify client that connection is ready and mark setup complete for the UI
          clientSocket.send(
            JSON.stringify({ type: 'connection_ready', conversationId }),
          );
          clientSocket.send(JSON.stringify({ setupComplete: true }));

          // Start keep-alive ping to client
          pingInterval = setInterval(() => {
            try {
              if (clientSocket.readyState === WebSocket.OPEN) {
                clientSocket.send(JSON.stringify({ type: 'ping' }));
              }
            } catch (_) {}
          }, 25000) as unknown as number;
        };

        vertexSocket.onerror = (error) => {
          console.error('❌ Vertex AI WebSocket error:', error);
          try {
            clientSocket.send(
              JSON.stringify({ type: 'error', message: 'Vertex AI connection error' }),
            );
          } catch (_) {}
        };

        vertexSocket.onclose = (ev) => {
          const e = ev as CloseEvent;
          console.log('🔌 Vertex AI WebSocket closed', e?.code, e?.reason);
          isConnected = false;
          if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.close(4000, 'vertex-closed');
          }
        };

        vertexSocket.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📥 Vertex AI message type:', data.type || Object.keys(data)[0]);

            // Forward all messages to client
            clientSocket.send(event.data);

            // Log assistant messages
            if (conversationId && data.serverContent) {
              const content = data.serverContent;
              const parts = content.modelTurn?.parts || [];
              const textParts = parts.filter((p: any) => p.text);
              const audioParts = parts.filter((p: any) => p.inlineData?.mimeType?.includes('audio'));
              if (textParts.length > 0 || audioParts.length > 0) {
                await supabase.from('ai_messages').insert({
                  conversation_id: conversationId,
                  role: 'assistant',
                  content: textParts.map((p: any) => p.text).join(' ') || '[Audio Response]',
                  metadata: { has_audio: audioParts.length > 0, turn_complete: content.turnComplete || false },
                });
              }
            }
          } catch (error) {
            console.error('Error processing Vertex message:', error);
          }
        };
      } catch (error) {
        console.error('Error during setup:', error);
        try {
          clientSocket.send(JSON.stringify({ type: 'error', message: 'Failed to connect to Vertex AI' }));
        } catch (_) {}
        clientSocket.close(4501, 'setup-failed');
      }
    };

    // Forward client messages to Vertex AI
    clientSocket.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('📥 Client message type:', message.type || (message.clientContent ? 'clientContent' : message.client_content ? 'client_content' : 'unknown'));

        if (!isConnected || !vertexSocket) {
          console.warn('⚠️ Vertex AI not connected, dropping message');
          return;
        }

        // Forward to Vertex AI
        vertexSocket.send(JSON.stringify(message));

        // Log user messages to database (support camelCase and snake_case)
        const clientContent = message.clientContent || message.client_content;
        if (conversationId && clientContent) {
          const turns = clientContent.turns || [];
          for (const turn of turns) {
            const parts = turn.parts || [];
            const textParts = parts.filter((p: any) => p.text);
            if (textParts.length > 0) {
              // Best-effort logging (no await required, but we keep await to preserve order)
              const supabase = createClient(supabaseUrl, supabaseKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
              await supabase.from('ai_messages').insert({
                conversation_id: conversationId,
                role: 'user',
                content: textParts.map((p: any) => p.text).join(' '),
                metadata: { source: 'text' },
              });
            }
          }
        }
      } catch (error) {
        console.error('Error forwarding client message:', error);
      }
    };

    clientSocket.onclose = (ev) => {
      const e = ev as CloseEvent;
      console.log('🔌 Client WebSocket closed', e?.code, e?.reason);
      if (typeof pingInterval !== 'undefined') clearInterval(pingInterval);
      if (vertexSocket && vertexSocket.readyState === WebSocket.OPEN) {
        vertexSocket.close(4000, 'client-closed');
      }
    };

    clientSocket.onerror = (error) => {
      console.error('❌ Client WebSocket error:', error);
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
