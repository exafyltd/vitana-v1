// Version 1.1 - Fixed Blob audio handling for Vertex AI responses
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
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
          console.error('❌ Unauthorized:', authError);
          clientSocket.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }));
          clientSocket.close(4001, 'unauthorized');
          return;
        }
        console.log(`👤 Authenticated user: ${user.id}`);

        // Conversation logging disabled due to database constraint issues
        // conversationId remains null

        // Mint Google access token directly using service account (no external vertex-auth)
        const serviceAccountJson = Deno.env.get('GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON');
        if (!serviceAccountJson) {
          console.error('❌ Missing GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON');
          clientSocket.send(JSON.stringify({ type: 'error', message: 'Server misconfiguration' }));
          clientSocket.close(4500, 'config-missing');
          return;
        }

        const serviceAccount = JSON.parse(serviceAccountJson);
        const projectId = serviceAccount.project_id;

        // Helper: base64url encode
        const base64UrlEncode = (input: Uint8Array) => {
          let str = '';
          for (let i = 0; i < input.length; i++) str += String.fromCharCode(input[i]);
          return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        };

        // Helper: PEM to ArrayBuffer (PKCS8)
        const pemToArrayBuffer = (pem: string): ArrayBuffer => {
          const b64 = pem
            .replace(/-----BEGIN PRIVATE KEY-----/g, '')
            .replace(/-----END PRIVATE KEY-----/g, '')
            .replace(/\s+/g, '');
          const raw = atob(b64);
          const buf = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
          return buf.buffer;
        };

        try {
          const enc = new TextEncoder();
          const header = { alg: 'RS256', typ: 'JWT' };
          const iat = Math.floor(Date.now() / 1000);
          const exp = iat + 3600; // 1 hour
          const payload = {
            iss: serviceAccount.client_email,
            scope: 'https://www.googleapis.com/auth/generative-language.realtime https://www.googleapis.com/auth/cloud-platform',
            aud: 'https://oauth2.googleapis.com/token',
            iat,
            exp,
          };

          const headerB64 = base64UrlEncode(enc.encode(JSON.stringify(header)));
          const payloadB64 = base64UrlEncode(enc.encode(JSON.stringify(payload)));
          const toSign = enc.encode(`${headerB64}.${payloadB64}`);

          const keyData = pemToArrayBuffer(serviceAccount.private_key);
          const privateKey = await crypto.subtle.importKey(
            'pkcs8',
            keyData,
            { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
            false,
            ['sign']
          );

          const signature = new Uint8Array(
            await crypto.subtle.sign({ name: 'RSASSA-PKCS1-v1_5' }, privateKey, toSign)
          );
          const signatureB64 = base64UrlEncode(signature);
          const assertion = `${headerB64}.${payloadB64}.${signatureB64}`;

          const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${encodeURIComponent(assertion)}`,
          });

          if (!tokenResp.ok) {
            const errText = await tokenResp.text();
            console.error('[VertexLive][OAuth] Token exchange failed', { status: tokenResp.status, body: errText.slice(0, 500) });
            try {
              clientSocket.send(JSON.stringify({ type: 'error', message: 'Vertex OAuth failed', status: tokenResp.status, detail: errText.slice(0, 500) }));
            } catch (_) {}
            clientSocket.close(4502, 'vertex-oauth-failed');
            return;
          }

          const { access_token } = await tokenResp.json();
          if (!access_token) {
            console.error('❌ No access_token in token response');
            clientSocket.send(JSON.stringify({ type: 'error', message: 'Vertex auth failed' }));
            clientSocket.close(4002, 'vertex-auth-failed');
            return;
          }

          // Connect to Gemini Live API using OAuth2 access_token via query param
          // IMPORTANT: The correct endpoint uses a dot between service and method: GenerativeService.BidiGenerateContent
          const geminiUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?access_token=${access_token}`;
          console.log('🔗 Connecting to Gemini Live API...');
          vertexSocket = new WebSocket(geminiUrl);
        } catch (e) {
          console.error('[VertexLive][OAuth] Mint error:', e);
          try { clientSocket.send(JSON.stringify({ type: 'error', message: 'Vertex OAuth mint error' })); } catch (_){ }
          clientSocket.close(4503, 'vertex-oauth-mint-error');
          return;
        }

        vertexSocket.onopen = () => {
          console.log('✅ Connected to Gemini Live API');
          isConnected = true;

          // Send setup configuration for Gemini Live
          const setupMessage = {
            setup: {
              model: "models/gemini-2.5-flash",
              generationConfig: {
                responseModalities: ["AUDIO", "TEXT"],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: {
                      voiceName: "Puck" // Happy, enthusiastic voice
                    }
                  }
                }
              },
              systemInstruction: {
                parts: [{
                  text: `You are a Vitana AI Assistant - a warm, helpful wellness coach guiding users through the Vitana health platform.

**Your Personality:**
- Enthusiastic and encouraging
- Patient and clear in explanations
- Celebrate user progress and achievements
- Use friendly, conversational language

**Your Role:**
- Guide users through Vitana features step-by-step
- Explain health tracking, appointments, wellness programs
- Help users understand what they see on their screen
- Store important insights to user memory for future reference
- Provide actionable wellness tips

**Visual Context:**
- You can see the user's screen (1 FPS) and camera when shared
- Describe what you observe to confirm you understand their context
- Proactively point out useful features they might have missed

**Response Style:**
- Keep responses concise (30-60 seconds of speech max)
- Ask clarifying questions when needed
- Be proactive but not overwhelming
- Use natural, conversational language`
                }]
              },
              tools: [
                {
                  type: "function",
                  name: "store_user_memory",
                  description: "Store important user information or insights to their AI memory for future conversations. Use this when you learn something significant about the user's health goals, preferences, achievements, or concerns.",
                  parameters: {
                    type: "object",
                    properties: {
                      memory_content: {
                        type: "string",
                        description: "The important information to remember about the user"
                      },
                      category: {
                        type: "string",
                        enum: ["health_goal", "preference", "achievement", "concern"],
                        description: "Category of the memory"
                      }
                    },
                    required: ["memory_content", "category"]
                  }
                }
              ],
              realtimeInputConfig: {
                automaticActivityDetection: {
                  startOfSpeechSensitivity: "START_SENSITIVITY_LOW",
                  endOfSpeechSensitivity: "END_SENSITIVITY_LOW",
                  prefixPaddingMs: 300,
                  silenceDurationMs: 1000,
                  disabled: false
                },
                activityHandling: "START_OF_ACTIVITY_INTERRUPTS",
                turnCoverage: "TURN_INCLUDES_ALL_INPUT"
              }
            }
          };
          vertexSocket!.send(JSON.stringify(setupMessage));
          console.log('📤 Sent setup configuration to Gemini Live API');

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
          console.error('❌ Gemini Live API WebSocket error:', error);
          try {
            clientSocket.send(
              JSON.stringify({ type: 'error', message: 'Gemini Live API connection error' }),
            );
          } catch (_) {}
        };

        vertexSocket.onclose = (ev) => {
          const e = ev as CloseEvent;
          console.log('🔌 Gemini Live API WebSocket closed', e?.code, e?.reason);
          isConnected = false;
          if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.close(4000, 'gemini-closed');
          }
        };

        vertexSocket.onmessage = async (event) => {
          try {
            // Check if message is JSON or Blob
            if (typeof event.data === 'string') {
              // Handle JSON messages from Gemini
              const data = JSON.parse(event.data);
              console.log('📥 Gemini Live API JSON message type:', data.type || Object.keys(data)[0]);
              
              // Handle tool calls (function calling)
              if (data.toolCall) {
                console.log('🔧 Tool call received:', data.toolCall);
                
                // Process store_user_memory function
                if (data.toolCall.functionCalls) {
                  for (const fc of data.toolCall.functionCalls) {
                    if (fc.name === 'store_user_memory') {
                      try {
                        const args = JSON.parse(fc.args || '{}');
                        console.log('💾 Storing memory:', args);
                        
                        // Store to ai_memory table
                        const { error: memError } = await supabase.from('ai_memory').insert({
                          user_id: user.id,
                          memory_type: args.category || 'general',
                          content: args.memory_content,
                          source: 'gemini_live_session'
                        });
                        
                        if (memError) {
                          console.error('Failed to store memory:', memError);
                        } else {
                          console.log('✅ Memory stored successfully');
                        }
                        
                        // Send response back to Gemini
                        const toolResponse = {
                          toolResponse: {
                            functionResponses: [{
                              id: fc.id,
                              name: fc.name,
                              response: { success: !memError }
                            }]
                          }
                        };
                        vertexSocket!.send(JSON.stringify(toolResponse));
                      } catch (err) {
                        console.error('Error processing tool call:', err);
                      }
                    }
                  }
                }
              }
              
              // Forward JSON to client
              clientSocket.send(event.data);
              
              // Log assistant messages if conversation tracking is enabled
              if (conversationId && data.serverContent) {
                const content = data.serverContent;
                const parts = content.modelTurn?.parts || [];
                const textParts = parts.filter((p: any) => p.text);
                const audioParts = parts.filter((p: any) => p.inlineData?.mimeType?.includes('audio'));
                if (textParts.length > 0 || audioParts.length > 0) {
                  try {
                    await supabase.from('ai_messages').insert({
                      conversation_id: conversationId,
                      role: 'assistant',
                      content: textParts.map((p: any) => p.text).join(' ') || '[Audio Response]',
                      metadata: { has_audio: audioParts.length > 0, turn_complete: content.turnComplete || false },
                    });
                  } catch (dbError) {
                    console.warn('Failed to log message (non-fatal):', dbError);
                  }
                }
              }
            } else if (event.data instanceof Blob) {
              // Handle binary audio data
              console.log('📥 Gemini Live API audio Blob received, size:', event.data.size);
              
              // Forward audio Blob to client as ArrayBuffer
              const arrayBuffer = await event.data.arrayBuffer();
              clientSocket.send(arrayBuffer);
            } else {
              console.warn('⚠️ Unknown message type from Gemini Live API:', typeof event.data);
            }
          } catch (error) {
            console.error('Error processing Gemini message:', error);
          }
        };
      } catch (error) {
        console.error('Error during setup:', error);
        try {
          clientSocket.send(JSON.stringify({ type: 'error', message: 'Failed to connect to Gemini Live API' }));
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
          console.warn('⚠️ Gemini Live API not connected, dropping message');
          return;
        }

        // Forward to Gemini Live API
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
