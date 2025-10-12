import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const upgradeHeader = req.headers.get("upgrade") || "";
  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  try {
    // Extract token from URL query params
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    
    if (!token) {
      return new Response(JSON.stringify({ error: 'No authorization token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`🔌 WebSocket connection request from user: ${user.id}`);

    // Get Vertex AI access token
    const authResponse = await fetch(`${supabaseUrl}/functions/v1/vertex-auth`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': supabaseKey
      }
    });

    if (!authResponse.ok) {
      throw new Error('Failed to get Vertex AI access token');
    }

    const { access_token } = await authResponse.json();

    // Get service account for project ID
    const serviceAccountJson = Deno.env.get('GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON');
    const serviceAccount = JSON.parse(serviceAccountJson!);
    const projectId = serviceAccount.project_id;

    // Upgrade client connection
    const { socket: clientSocket, response } = Deno.upgradeWebSocket(req);

    let vertexSocket: WebSocket | null = null;
    let conversationId: string | null = null;
    let isConnected = false;

    // Connect to Vertex AI when client connects
    clientSocket.onopen = async () => {
      console.log('✅ Client WebSocket connected');
      
      try {
        // Create conversation record
        const { data: conversation, error: convError } = await supabase
          .from('ai_conversations')
          .insert({
            user_id: user.id,
            agent_type: 'vertex_live',
            metadata: { model: 'gemini-2.0-flash-live-preview-04-09' }
          })
          .select()
          .single();

        if (convError) {
          console.error('Failed to create conversation:', convError);
        } else {
          conversationId = conversation.id;
          console.log(`📝 Created conversation: ${conversationId}`);
        }

        // Connect to Vertex AI
        const vertexUrl = `wss://us-central1-aiplatform.googleapis.com/ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent?key=${access_token}`;
        
        vertexSocket = new WebSocket(vertexUrl);

        vertexSocket.onopen = () => {
          console.log('✅ Connected to Vertex AI Live API');
          isConnected = true;

          // Send setup configuration
          const setupMessage = {
            setup: {
              model: `projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.0-flash-live-preview-04-09`,
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
                  text: "You are a helpful AI assistant. Keep your responses natural and conversational. When the user shares their screen, describe what you see and provide helpful insights."
                }]
              }
            }
          };

          vertexSocket!.send(JSON.stringify(setupMessage));
          console.log('📤 Sent setup configuration to Vertex AI');

          // Notify client that connection is ready
          clientSocket.send(JSON.stringify({ 
            type: 'connection_ready',
            conversationId 
          }));
        };

        vertexSocket.onerror = (error) => {
          console.error('❌ Vertex AI WebSocket error:', error);
          clientSocket.send(JSON.stringify({ 
            type: 'error', 
            message: 'Vertex AI connection error' 
          }));
        };

        vertexSocket.onclose = () => {
          console.log('🔌 Vertex AI WebSocket closed');
          isConnected = false;
          if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.close();
          }
        };

        vertexSocket.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📥 Vertex AI message type:', data.type || Object.keys(data)[0]);

            // Forward all messages to client
            clientSocket.send(event.data);

            // Log server content messages
            if (data.serverContent) {
              const content = data.serverContent;
              
              // Save message to database
              if (conversationId && content.modelTurn) {
                const parts = content.modelTurn.parts || [];
                const textParts = parts.filter((p: any) => p.text);
                const audioParts = parts.filter((p: any) => p.inlineData?.mimeType?.includes('audio'));

                if (textParts.length > 0 || audioParts.length > 0) {
                  await supabase.from('ai_messages').insert({
                    conversation_id: conversationId,
                    role: 'assistant',
                    content: textParts.map((p: any) => p.text).join(' ') || '[Audio Response]',
                    metadata: {
                      has_audio: audioParts.length > 0,
                      turn_complete: content.turnComplete || false
                    }
                  });
                }
              }
            }
          } catch (error) {
            console.error('Error processing Vertex message:', error);
          }
        };

      } catch (error) {
        console.error('Error setting up Vertex connection:', error);
        clientSocket.send(JSON.stringify({ 
          type: 'error', 
          message: 'Failed to connect to Vertex AI' 
        }));
      }
    };

    // Forward client messages to Vertex AI
    clientSocket.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('📥 Client message type:', message.type);

        if (!isConnected || !vertexSocket) {
          console.warn('⚠️ Vertex AI not connected, queuing message');
          return;
        }

        // Forward to Vertex AI
        vertexSocket.send(JSON.stringify(message));

        // Log user messages to database
        if (conversationId && message.client_content) {
          const turns = message.client_content.turns || [];
          for (const turn of turns) {
            const parts = turn.parts || [];
            const textParts = parts.filter((p: any) => p.text);
            
            if (textParts.length > 0) {
              await supabase.from('ai_messages').insert({
                conversation_id: conversationId,
                role: 'user',
                content: textParts.map((p: any) => p.text).join(' '),
                metadata: { source: 'text' }
              });
            }
          }
        }
      } catch (error) {
        console.error('Error forwarding client message:', error);
      }
    };

    clientSocket.onclose = () => {
      console.log('🔌 Client WebSocket closed');
      if (vertexSocket && vertexSocket.readyState === WebSocket.OPEN) {
        vertexSocket.close();
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
