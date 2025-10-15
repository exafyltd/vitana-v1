import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Event data structure based on Maxina Summer 2026 schedule
const EVENTS_DATA = [
  // JUNE - "THE AWAKENING"
  { date: '2026-06-01', time: '06:00', title: 'Sunrise Detox Flow', category: 'Mind & Body', type: 'physical', venue: 'Maxina Boat', host: 'Mariia Maksina', guest: 'Sofia Martinez', tag: 'MIND_BODY_01', reward: 45, maxPart: 25, duration: 2 },
  { date: '2026-06-04', time: '19:00', title: 'Longevity 101: Reset Your Routine', category: 'Biohacking & Longevity', type: 'online', venue: null, host: 'Dr. Andreas Berg', guest: 'Prof. Elena Kovač', tag: 'BIO_LONG_01', reward: 20, maxPart: 150, duration: 1.5 },
  { date: '2026-06-08', time: '18:00', title: 'Love Without Filters', category: 'Social & Love', type: 'physical', venue: 'Palma Beach Club', host: 'Luca Romano', guest: 'Marina Costa', tag: 'SOCIAL_01', reward: 40, maxPart: 35, duration: 3 },
  { date: '2026-06-11', time: '19:00', title: 'The Power of Mindful Breathing', category: 'Mind & Body', type: 'online', venue: null, host: 'Sofia Martinez', guest: 'Dr. Marcus Silva', tag: 'MIND_BODY_02', reward: 18, maxPart: 120, duration: 1.5 },
  { date: '2026-06-15', time: '11:00', title: 'Energy Reset Brunch', category: 'Growth & Purpose', type: 'physical', venue: 'Boutique Winery, Mallorca', host: 'Elena Kovač', guest: 'Marco Silva', tag: 'GROWTH_01', reward: 50, maxPart: 30, duration: 3 },
  { date: '2026-06-18', time: '19:00', title: 'Future of Longevity Medicine', category: 'Biohacking & Longevity', type: 'online', venue: null, host: 'Prof. Dimitri Volkov', guest: 'Dr. Lisa Chen', tag: 'BIO_LONG_02', reward: 22, maxPart: 180, duration: 1.5 },
  { date: '2026-06-22', time: '18:30', title: 'Connect & Flow Night', category: 'Social & Love', type: 'physical', venue: 'Wellness Hotel Deià', host: 'Marina Costa', guest: 'Alex Dubois', tag: 'SOCIAL_02', reward: 55, maxPart: 28, duration: 2.5 },
  { date: '2026-06-25', time: '19:00', title: 'Reclaim Your Sleep', category: 'Mind & Body', type: 'online', venue: null, host: 'Dr. Sarah Mitchell', guest: 'Prof. James Wong', tag: 'MIND_BODY_03', reward: 17, maxPart: 140, duration: 1.5 },
  { date: '2026-06-29', time: '19:00', title: 'Detox Sunset Dinner', category: 'Biohacking & Longevity', type: 'physical', venue: 'Vineyard Restaurant, Mallorca', host: 'Marco Silva', guest: 'Chef Isabella Torres', tag: 'BIO_LONG_03', reward: 60, maxPart: 24, duration: 3 },
  { date: '2026-06-30', time: '19:00', title: 'Mind Over Matter', category: 'Growth & Purpose', type: 'online', venue: null, host: 'Elena Kovač', guest: 'Tony Breslin', tag: 'GROWTH_02', reward: 19, maxPart: 160, duration: 1.5 },

  // JULY - "CONNECTIONS"
  { date: '2026-07-02', time: '18:00', title: 'Meet Your Match on the Maxina Boat', category: 'Social & Love', type: 'physical', venue: 'Maxina Boat', host: 'Mariia Maksina', guest: 'Dr. Ava Laurent', tag: 'SOCIAL_03', reward: 45, maxPart: 30, duration: 3 },
  { date: '2026-07-06', time: '19:00', title: 'The Science of Happiness', category: 'Mind & Body', type: 'online', venue: null, host: 'Dr. Marcus Silva', guest: 'Prof. Nina Petrov', tag: 'MIND_BODY_04', reward: 21, maxPart: 175, duration: 1.5 },
  { date: '2026-07-09', time: '19:30', title: 'Wine & Wisdom Night', category: 'Growth & Purpose', type: 'physical', venue: 'Winery, Mallorca', host: 'Luca Romano', guest: 'Sommelier Diego Vega', tag: 'GROWTH_03', reward: 48, maxPart: 26, duration: 2.5 },
  { date: '2026-07-12', time: '19:00', title: 'The Art of Emotional Balance', category: 'Social & Love', type: 'online', venue: null, host: 'Sofia Martinez', guest: 'Therapist Clara Blanc', tag: 'SOCIAL_04', reward: 20, maxPart: 130, duration: 1.5 },
  { date: '2026-07-15', time: '20:00', title: 'Longevity Under the Stars', category: 'Biohacking & Longevity', type: 'physical', venue: 'Vineyard Terrace, Mallorca', host: 'Prof. Dimitri Volkov', guest: 'Dr. Isabella Torres', tag: 'BIO_LONG_04', reward: 52, maxPart: 32, duration: 3 },
  { date: '2026-07-18', time: '19:00', title: 'Modern Love & Mental Health', category: 'Mind & Body', type: 'online', venue: null, host: 'Dr. Sarah Mitchell', guest: 'Psychiatrist Raj Patel', tag: 'MIND_BODY_05', reward: 23, maxPart: 145, duration: 1.5 },
  { date: '2026-07-21', time: '18:00', title: 'Maxina Sunset Networking', category: 'Growth & Purpose', type: 'physical', venue: 'Beach Lounge, Palma', host: 'Elena Kovač', guest: 'CEO Marcus Lindberg', tag: 'GROWTH_04', reward: 42, maxPart: 40, duration: 2.5 },
  { date: '2026-07-25', time: '19:00', title: 'Eat Well, Live Longer', category: 'Biohacking & Longevity', type: 'online', venue: null, host: 'Chef Isabella Torres', guest: 'Nutritionist Dr. Yuki Tanaka', tag: 'BIO_LONG_05', reward: 19, maxPart: 190, duration: 1.5 },
  { date: '2026-07-28', time: '17:00', title: 'The Friendship Project', category: 'Social & Love', type: 'physical', venue: 'Beach Club, Mallorca', host: 'Marina Costa', guest: 'Social Psychologist Dr. Ana Ruiz', tag: 'SOCIAL_05', reward: 38, maxPart: 35, duration: 2.5 },
  { date: '2026-07-31', time: '19:00', title: 'Unlock Your Flow State', category: 'Growth & Purpose', type: 'online', venue: null, host: 'Tony Breslin', guest: 'Performance Coach Lisa Wang', tag: 'GROWTH_05', reward: 24, maxPart: 155, duration: 1.5 },

  // AUGUST - "TRANSFORMATION"
  { date: '2026-08-02', time: '18:30', title: 'Founder Energy Night', category: 'Growth & Purpose', type: 'physical', venue: 'Palma Rooftop', host: 'Marco Silva', guest: 'Tech Founder Zara Khan', tag: 'GROWTH_06', reward: 44, maxPart: 38, duration: 2.5 },
  { date: '2026-08-05', time: '19:00', title: 'Biohack Your Brain', category: 'Biohacking & Longevity', type: 'online', venue: null, host: 'Dr. Andreas Berg', guest: 'Neuroscientist Dr. Felix Müller', tag: 'BIO_LONG_06', reward: 25, maxPart: 170, duration: 1.5 },
  { date: '2026-08-09', time: '08:00', title: 'Beach Breathwork & Cold Plunge', category: 'Mind & Body', type: 'physical', venue: 'Cala Major Beach', host: 'Sofia Martinez', guest: 'Wim Hof Instructor Lars Eriksen', tag: 'MIND_BODY_06', reward: 35, maxPart: 22, duration: 2 },
  { date: '2026-08-12', time: '19:00', title: 'How to Think Younger', category: 'Biohacking & Longevity', type: 'online', venue: null, host: 'Prof. Dimitri Volkov', guest: 'Anti-Aging Expert Dr. Claire Dubois', tag: 'BIO_LONG_07', reward: 21, maxPart: 165, duration: 1.5 },
  { date: '2026-08-15', time: '09:00', title: 'Purpose & Flow Retreat (1 Day)', category: 'Growth & Purpose', type: 'physical', venue: 'Wellness Hotel Deià', host: 'Elena Kovač', guest: 'Life Coach Michael Santos', tag: 'GROWTH_07', reward: 85, maxPart: 18, duration: 8 },
  { date: '2026-08-18', time: '19:00', title: 'Maxina Talk: The Future of Work & Wellbeing', category: 'Growth & Purpose', type: 'online', venue: null, host: 'Mariia Maksina', guest: 'Future of Work Expert Dr. Sarah Chen', tag: 'GROWTH_08', reward: 22, maxPart: 200, duration: 1.5 },
  { date: '2026-08-22', time: '20:00', title: 'The Intimacy Conversation', category: 'Social & Love', type: 'physical', venue: 'Beach Villa, Mallorca', host: 'Dr. Ava Laurent', guest: 'Relationship Coach Nina Petrov', tag: 'SOCIAL_06', reward: 58, maxPart: 20, duration: 2.5 },
  { date: '2026-08-25', time: '19:00', title: 'Science of Recovery', category: 'Mind & Body', type: 'online', venue: null, host: 'Dr. Marcus Silva', guest: 'Sports Physiologist Dr. Jan Kowalski', tag: 'MIND_BODY_07', reward: 18, maxPart: 135, duration: 1.5 },
  { date: '2026-08-28', time: '10:00', title: 'The Biohackers Summit Mallorca', category: 'Biohacking & Longevity', type: 'physical', venue: 'Son Vida Venue', host: 'Prof. Dimitri Volkov', guest: 'Celebrity Panel: Dave Asprey, Ben Greenfield', tag: 'BIO_LONG_08', reward: 95, maxPart: 50, duration: 6 },
  { date: '2026-08-31', time: '19:00', title: 'Refocus & Recharge', category: 'Mind & Body', type: 'online', venue: null, host: 'Sofia Martinez', guest: 'Meditation Master Thich Nhat Minh', tag: 'MIND_BODY_08', reward: 20, maxPart: 150, duration: 1.5 },

  // SEPTEMBER - "REFLECTION & CELEBRATION"
  { date: '2026-09-02', time: '07:00', title: 'Gratitude Morning Walk', category: 'Mind & Body', type: 'physical', venue: 'Palma Bay Promenade', host: 'Elena Kovač', guest: 'Mindfulness Coach Dr. Rosa Sanchez', tag: 'MIND_BODY_09', reward: 30, maxPart: 28, duration: 1.5 },
  { date: '2026-09-05', time: '19:00', title: 'The Love Reset', category: 'Social & Love', type: 'online', venue: null, host: 'Dr. Ava Laurent', guest: 'Couples Therapist James Reed', tag: 'SOCIAL_07', reward: 19, maxPart: 125, duration: 1.5 },
  { date: '2026-09-08', time: '19:30', title: 'Mindful Leaders Dinner', category: 'Growth & Purpose', type: 'physical', venue: 'Boutique Restaurant, Palma', host: 'Marco Silva', guest: 'Executive Coach Linda Zhao', tag: 'GROWTH_09', reward: 62, maxPart: 22, duration: 3 },
  { date: '2026-09-11', time: '19:00', title: 'Longevity Nutrition Masterclass', category: 'Biohacking & Longevity', type: 'online', venue: null, host: 'Chef Isabella Torres', guest: 'Longevity Nutritionist Dr. Peter Attia', tag: 'BIO_LONG_09', reward: 24, maxPart: 185, duration: 1.5 },
  { date: '2026-09-14', time: '20:00', title: 'Soul Connection Night', category: 'Social & Love', type: 'physical', venue: 'Beach Lounge, Mallorca', host: 'Marina Costa', guest: 'Spiritual Guide Amara Singh', tag: 'SOCIAL_08', reward: 46, maxPart: 30, duration: 2.5 },
  { date: '2026-09-17', time: '19:00', title: 'The Future of Conscious Tech', category: 'Growth & Purpose', type: 'online', venue: null, host: 'Tony Breslin', guest: 'AI Ethics Expert Dr. Maya Patel', tag: 'GROWTH_10', reward: 23, maxPart: 160, duration: 1.5 },
  { date: '2026-09-20', time: '17:00', title: 'Wellness Sunset & Closing Ceremony', category: 'Mind & Body', type: 'physical', venue: 'Palma Beach', host: 'Mariia Maksina', guest: 'DJ & Wellness Ambassador Alex Rivera', tag: 'MIND_BODY_10', reward: 40, maxPart: 45, duration: 3 },
  { date: '2026-09-23', time: '19:00', title: 'The Long Life Panel', category: 'Biohacking & Longevity', type: 'online', venue: null, host: 'Prof. Dimitri Volkov', guest: 'Longevity Experts Panel', tag: 'BIO_LONG_10', reward: 26, maxPart: 200, duration: 2 },
  { date: '2026-09-26', time: '19:00', title: 'Maxina End-of-Summer Gala', category: 'Social & Love', type: 'physical', venue: 'Palma Cathedral Area', host: 'Mariia Maksina', guest: 'Celebrity DJ & Wellness Panel', tag: 'SOCIAL_09', reward: 100, maxPart: 50, duration: 4 },
  { date: '2026-10-01', time: '18:00', title: 'The Future of Social Wellness', category: 'Growth & Purpose', type: 'physical', venue: 'Palma Cathedral Terrace', host: 'Mariia Maksina', guest: 'Celebrity Panel & Press', tag: 'GROWTH_11', reward: 88, maxPart: 42, duration: 3 },
];

// Image generation prompts by category
const IMAGE_PROMPTS = {
  'Mind & Body': (venue: string) => 
    `Professional photography of yoga and wellness activity ${venue ? `on ${venue}` : 'in serene Mediterranean setting'} in Mallorca, golden hour lighting, turquoise Mediterranean sea in background, 2-3 people in natural poses showing authentic connection and peace, warm natural colors, elegant wellness atmosphere, shot with 35mm lens, shallow depth of field, no text overlays, premium lifestyle photography style, 16:9 aspect ratio`,
  
  'Biohacking & Longevity': (venue: string) => 
    `Professional photography of modern wellness discussion ${venue ? `in ${venue}` : 'in minimalist Mediterranean setting'} in Mallorca, elegant minimalist aesthetic, natural Mediterranean light, small group of professionals engaged in conversation, clean white and green tones, premium health-focused atmosphere, architectural details, shot with 50mm lens, premium lifestyle photography, 16:9 aspect ratio`,
  
  'Social & Love': (venue: string) => 
    `Professional photography of evening social gathering ${venue ? `on ${venue}` : 'in elegant Mediterranean venue'} in Mallorca, warm sunset lighting, 4-6 people mingling naturally with authentic smiles and laughter, champagne glasses, elegant casual attire, romantic Mediterranean ambience, golden hour glow, shot with 35mm lens, candid lifestyle photography style, 16:9 aspect ratio`,
  
  'Growth & Purpose': (venue: string) => 
    `Professional photography of business networking event ${venue ? `in ${venue}` : 'in modern Mediterranean setting'} in Mallorca, urban sunset backdrop, small group of entrepreneurs in conversation, elegant modern setting, warm confident atmosphere, natural professional interaction, shot with 50mm lens, premium business lifestyle photography, 16:9 aspect ratio`,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');

    if (!geminiApiKey) {
      throw new Error('GOOGLE_GEMINI_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Authentication required');
    }

    console.log(`Generating 40 events for user ${user.id}`);
    
    // Determine mode from request body (fast = no images)
    let mode = 'fast';
    try {
      const body = await req.json();
      mode = body?.mode || (body?.noImages ? 'fast' : mode);
    } catch (_) {
      // no body provided
    }
    console.log('Mode:', mode);
    
    const generatedEvents = [];
    const PLACEHOLDER_IMAGE = '/placeholder.svg';
    
    // Generate events (fast mode skips AI images)
    if (mode === 'fast') {
      for (let i = 0; i < EVENTS_DATA.length; i++) {
        const event = EVENTS_DATA[i];
        console.log(`(fast) Preparing event ${i + 1}/40: ${event.title}`);

        const startTime = new Date(`${event.date}T${event.time}:00+02:00`);
        const endTime = new Date(startTime.getTime() + event.duration * 60 * 60 * 1000);

        const eventData = {
          title: event.title,
          description: `Join us for an exclusive ${event.category.toLowerCase()} experience.`,
          event_type: event.type === 'online' ? 'workshop' : 'networking',
          location: event.venue,
          virtual_link: event.type === 'online' ? 'https://meet.vitana.app/maxina-summer' : null,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          max_participants: event.maxPart,
          participant_count: 0,
          image_url: PLACEHOLDER_IMAGE,
          created_by: user.id,
          metadata: {
            category: event.category,
            autopilot_tag: event.tag,
            host: event.host,
            guest: event.guest,
            vtn_reward: event.reward,
            venue_type: event.type === 'online' ? null : event.venue?.toLowerCase().includes('boat') ? 'boat' : 
                        event.venue?.toLowerCase().includes('beach') ? 'beach' :
                        event.venue?.toLowerCase().includes('winery') || event.venue?.toLowerCase().includes('vineyard') ? 'winery' :
                        event.venue?.toLowerCase().includes('hotel') ? 'hotel' : 'restaurant'
          }
        };

        generatedEvents.push(eventData);
        console.log(`✓ (fast) Event ${i + 1}/40 prepared: ${event.title}`);
      }
    } else {
      // Generate events with AI images
      for (let i = 0; i < EVENTS_DATA.length; i++) {
        const event = EVENTS_DATA[i];
        console.log(`Processing event ${i + 1}/40: ${event.title}`);

        try {
          // Generate AI image using Gemini
          const imagePrompt = IMAGE_PROMPTS[event.category as keyof typeof IMAGE_PROMPTS](event.venue || '');
          
          const { generateContent } = await import("../_shared/gemini-client.ts");
          const imageResponse = await generateContent(
            geminiApiKey,
            [{ role: 'user', content: imagePrompt }],
            { temperature: 0.7 }
          );

          // Extract image from response (Gemini image generation returns base64)
          const imageBase64 = imageResponse.candidates?.[0]?.content?.parts?.find(
            (p: any) => p.inlineData?.data
          )?.inlineData?.data;

          if (!imageBase64) {
            throw new Error('No image returned from Gemini');
          }

          // Convert base64 to blob and upload to Supabase Storage
          const base64Data = imageBase64.split(',')[1];
          const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
          
          const fileName = `maxina-summer-2026/event-${i + 1}-${Date.now()}.jpg`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('event-images')
            .upload(fileName, binaryData, {
              contentType: 'image/jpeg',
              upsert: false
            });

          if (uploadError) {
            throw new Error(`Storage upload failed: ${uploadError.message}`);
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('event-images')
            .getPublicUrl(fileName);

          // Construct event object
          const startTime = new Date(`${event.date}T${event.time}:00+02:00`);
          const endTime = new Date(startTime.getTime() + event.duration * 60 * 60 * 1000);

          const eventData = {
            title: event.title,
            description: `Join us for an exclusive ${event.category.toLowerCase()} experience.`,
            event_type: event.type === 'online' ? 'workshop' : 'networking',
            location: event.venue,
            virtual_link: event.type === 'online' ? 'https://meet.vitana.app/maxina-summer' : null,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            max_participants: event.maxPart,
            participant_count: 0,
            image_url: publicUrl,
            created_by: user.id,
            metadata: {
              category: event.category,
              autopilot_tag: event.tag,
              host: event.host,
              guest: event.guest,
              vtn_reward: event.reward,
              venue_type: event.type === 'online' ? null : event.venue?.toLowerCase().includes('boat') ? 'boat' : 
                          event.venue?.toLowerCase().includes('beach') ? 'beach' :
                          event.venue?.toLowerCase().includes('winery') || event.venue?.toLowerCase().includes('vineyard') ? 'winery' :
                          event.venue?.toLowerCase().includes('hotel') ? 'hotel' : 'restaurant'
            }
          };

          generatedEvents.push(eventData);
          console.log(`✓ Event ${i + 1}/40 generated: ${event.title}`);

        } catch (error) {
          console.error(`Failed to generate event ${i + 1}:`, error);
          // Continue with next event
        }
      }
    }

    // Batch insert all events
    const { data: insertedEvents, error: insertError } = await supabase
      .from('global_community_events')
      .insert(generatedEvents)
      .select();

    if (insertError) {
      throw new Error(`Database insert failed: ${insertError.message}`);
    }

    console.log(`✓ Successfully inserted ${insertedEvents.length} events`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated ${insertedEvents.length} Maxina Summer 2026 events`,
        events: insertedEvents.map(e => ({ id: e.id, title: e.title }))
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error generating events:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
