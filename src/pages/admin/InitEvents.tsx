import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle, Copy } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { notify, t } from '@/lib/i18n-toast';

const SQL_SCRIPT = `INSERT INTO public.global_community_events (title, description, event_type, location, virtual_link, start_time, end_time, max_participants, participant_count, image_url, created_by, metadata) 
VALUES
  ('Sunrise Detox Flow', 'Join us for an exclusive mind & body experience.', 'networking', 'Maxina Boat', NULL, '2026-06-01T04:00:00Z'::timestamptz, '2026-06-01T06:00:00Z'::timestamptz, 25, 0, '/placeholder.svg', (SELECT id FROM auth.users LIMIT 1), '{"category":"Mind & Body","autopilot_tag":"MIND_BODY_01","host":"Mariia Maksina","guest":"Sofia Martinez","vtn_reward":45,"venue_type":"boat"}'::jsonb),
  ('Longevity 101: Reset Your Routine', 'Join us for an exclusive biohacking & longevity experience.', 'workshop', NULL, 'https://meet.vitana.app/maxina-summer', '2026-06-04T17:00:00Z'::timestamptz, '2026-06-04T18:30:00Z'::timestamptz, 150, 0, '/placeholder.svg', (SELECT id FROM auth.users LIMIT 1), '{"category":"Biohacking & Longevity","autopilot_tag":"BIO_LONG_01","host":"Dr. Andreas Berg","guest":"Prof. Elena Kovač","vtn_reward":20}'::jsonb),
  ('Love Without Filters', 'Join us for an exclusive social & love experience.', 'networking', 'Palma Beach Club', NULL, '2026-06-08T16:00:00Z'::timestamptz, '2026-06-08T19:00:00Z'::timestamptz, 35, 0, '/placeholder.svg', (SELECT id FROM auth.users LIMIT 1), '{"category":"Social & Love","autopilot_tag":"SOCIAL_01","host":"Luca Romano","guest":"Marina Costa","vtn_reward":40,"venue_type":"beach"}'::jsonb),
  ('The Power of Mindful Breathing', 'Join us for an exclusive mind & body experience.', 'workshop', NULL, 'https://meet.vitana.app/maxina-summer', '2026-06-11T17:00:00Z'::timestamptz, '2026-06-11T18:30:00Z'::timestamptz, 120, 0, '/placeholder.svg', (SELECT id FROM auth.users LIMIT 1), '{"category":"Mind & Body","autopilot_tag":"MIND_BODY_02","host":"Sofia Martinez","guest":"Dr. Marcus Silva","vtn_reward":18}'::jsonb),
  ('Energy Reset Brunch', 'Join us for an exclusive growth & purpose experience.', 'networking', 'Boutique Winery, Mallorca', NULL, '2026-06-15T09:00:00Z'::timestamptz, '2026-06-15T12:00:00Z'::timestamptz, 30, 0, '/placeholder.svg', (SELECT id FROM auth.users LIMIT 1), '{"category":"Growth & Purpose","autopilot_tag":"GROWTH_01","host":"Elena Kovač","guest":"Marco Silva","vtn_reward":50,"venue_type":"winery"}'::jsonb),
  ('Future of Longevity Medicine', 'Join us for an exclusive biohacking & longevity experience.', 'workshop', NULL, 'https://meet.vitana.app/maxina-summer', '2026-06-18T17:00:00Z'::timestamptz, '2026-06-18T18:30:00Z'::timestamptz, 180, 0, '/placeholder.svg', (SELECT id FROM auth.users LIMIT 1), '{"category":"Biohacking & Longevity","autopilot_tag":"BIO_LONG_02","host":"Prof. Dimitri Volkov","guest":"Dr. Lisa Chen","vtn_reward":22}'::jsonb),
  ('Connect & Flow Night', 'Join us for an exclusive social & love experience.', 'networking', 'Wellness Hotel Deià', NULL, '2026-06-22T16:30:00Z'::timestamptz, '2026-06-22T19:00:00Z'::timestamptz, 28, 0, '/placeholder.svg', (SELECT id FROM auth.users LIMIT 1), '{"category":"Social & Love","autopilot_tag":"SOCIAL_02","host":"Marina Costa","guest":"Alex Dubois","vtn_reward":55,"venue_type":"hotel"}'::jsonb),
  ('Reclaim Your Sleep', 'Join us for an exclusive mind & body experience.', 'workshop', NULL, 'https://meet.vitana.app/maxina-summer', '2026-06-25T17:00:00Z'::timestamptz, '2026-06-25T18:30:00Z'::timestamptz, 140, 0, '/placeholder.svg', (SELECT id FROM auth.users LIMIT 1), '{"category":"Mind & Body","autopilot_tag":"MIND_BODY_03","host":"Dr. Sarah Mitchell","guest":"Prof. James Wong","vtn_reward":17}'::jsonb),
  ('Detox Sunset Dinner', 'Join us for an exclusive biohacking & longevity experience.', 'networking', 'Vineyard Restaurant, Mallorca', NULL, '2026-06-29T17:00:00Z'::timestamptz, '2026-06-29T20:00:00Z'::timestamptz, 24, 0, '/placeholder.svg', (SELECT id FROM auth.users LIMIT 1), '{"category":"Biohacking & Longevity","autopilot_tag":"BIO_LONG_03","host":"Marco Silva","guest":"Chef Isabella Torres","vtn_reward":60,"venue_type":"winery"}'::jsonb),
  ('Mind Over Matter', 'Join us for an exclusive growth & purpose experience.', 'workshop', NULL, 'https://meet.vitana.app/maxina-summer', '2026-06-30T17:00:00Z'::timestamptz, '2026-06-30T18:30:00Z'::timestamptz, 160, 0, '/placeholder.svg', (SELECT id FROM auth.users LIMIT 1), '{"category":"Growth & Purpose","autopilot_tag":"GROWTH_02","host":"Elena Kovač","guest":"Tony Breslin","vtn_reward":19}'::jsonb),
  ('Meet Your Match on the Maxina Boat', 'Join us for an exclusive social & love experience.', 'networking', 'Maxina Boat', NULL, '2026-07-02T16:00:00Z'::timestamptz, '2026-07-02T19:00:00Z'::timestamptz, 30, 0, '/placeholder.svg', (SELECT id FROM auth.users LIMIT 1), '{"category":"Social & Love","autopilot_tag":"SOCIAL_03","host":"Mariia Maksina","guest":"Dr. Ava Laurent","vtn_reward":45,"venue_type":"boat"}'::jsonb),
  ('The Science of Happiness', 'Join us for an exclusive mind & body experience.', 'workshop', NULL, 'https://meet.vitana.app/maxina-summer', '2026-07-06T17:00:00Z'::timestamptz, '2026-07-06T18:30:00Z'::timestamptz, 175, 0, '/placeholder.svg', (SELECT id FROM auth.users LIMIT 1), '{"category":"Mind & Body","autopilot_tag":"MIND_BODY_04","host":"Dr. Marcus Silva","guest":"Prof. Nina Petrov","vtn_reward":21}'::jsonb),
  ('Wine & Wisdom Night', 'Join us for an exclusive growth & purpose experience.', 'networking', 'Winery, Mallorca', NULL, '2026-07-09T17:30:00Z'::timestamptz, '2026-07-09T20:00:00Z'::timestamptz, 26, 0, '/placeholder.svg', (SELECT id FROM auth.users LIMIT 1), '{"category":"Growth & Purpose","autopilot_tag":"GROWTH_03","host":"Luca Romano","guest":"Sommelier Diego Vega","vtn_reward":48,"venue_type":"winery"}'::jsonb),
  ('The Art of Emotional Balance', 'Join us for an exclusive social & love experience.', 'workshop', NULL, 'https://meet.vitana.app/maxina-summer', '2026-07-12T17:00:00Z'::timestamptz, '2026-07-12T18:30:00Z'::timestamptz, 130, 0, '/placeholder.svg', (SELECT id FROM auth.users LIMIT 1), '{"category":"Social & Love","autopilot_tag":"SOCIAL_04","host":"Sofia Martinez","guest":"Therapist Clara Blanc","vtn_reward":20}'::jsonb),
  ('Longevity Under the Stars', 'Join us for an exclusive biohacking & longevity experience.', 'networking', 'Vineyard Terrace, Mallorca', NULL, '2026-07-15T18:00:00Z'::timestamptz, '2026-07-15T21:00:00Z'::timestamptz, 32, 0, '/placeholder.svg', (SELECT id FROM auth.users LIMIT 1), '{"category":"Biohacking & Longevity","autopilot_tag":"BIO_LONG_04","host":"Prof. Dimitri Volkov","guest":"Dr. Isabella Torres","vtn_reward":52,"venue_type":"winery"}'::jsonb),
  ('Modern Love & Mental Health', 'Join us for an exclusive mind & body experience.', 'workshop', NULL, 'https://meet.vitana.app/maxina-summer', '2026-07-18T17:00:00Z'::timestamptz, '2026-07-18T18:30:00Z'::timestamptz, 145, 0, '/placeholder.svg', (SELECT id FROM auth.users LIMIT 1), '{"category":"Mind & Body","autopilot_tag":"MIND_BODY_05","host":"Dr. Sarah Mitchell","guest":"Psychiatrist Raj Patel","vtn_reward":23}'::jsonb),
  ('Maxina Sunset Networking', 'Join us for an exclusive growth & purpose experience.', 'networking', 'Beach Lounge, Palma', NULL, '2026-07-21T16:00:00Z'::timestamptz, '2026-07-21T18:30:00Z'::timestamptz, 40, 0, '/placeholder.svg', (SELECT id FROM auth.users LIMIT 1), '{"category":"Growth & Purpose","autopilot_tag":"GROWTH_04","host":"Elena Kovač","guest":"CEO Marcus Lindberg","vtn_reward":42,"venue_type":"beach"}'::jsonb),
  ('Eat Well, Live Longer', 'Join us for an exclusive biohacking & longevity experience.', 'workshop', NULL, 'https://meet.vitana.app/maxina-summer', '2026-07-25T17:00:00Z'::timestamptz, '2026-07-25T18:30:00Z'::timestamptz, 190, 0, '/placeholder.svg', (SELECT id FROM auth.users LIMIT 1), '{"category":"Biohacking & Longevity","autopilot_tag":"BIO_LONG_05","host":"Chef Isabella Torres","guest":"Nutritionist Dr. Yuki Tanaka","vtn_reward":19}'::jsonb),
  ('The Friendship Project', 'Join us for an exclusive social & love experience.', 'networking', 'Beach Club, Mallorca', NULL, '2026-07-28T15:00:00Z'::timestamptz, '2026-07-28T17:30:00Z'::timestamptz, 35, 0, '/placeholder.svg', (SELECT id FROM auth.users LIMIT 1), '{"category":"Social & Love","autopilot_tag":"SOCIAL_05","host":"Marina Costa","guest":"Social Psychologist Dr. Ana Ruiz","vtn_reward":38,"venue_type":"beach"}'::jsonb),
  ('Unlock Your Flow State', 'Join us for an exclusive growth & purpose experience.', 'workshop', NULL, 'https://meet.vitana.app/maxina-summer', '2026-07-31T17:00:00Z'::timestamptz, '2026-07-31T18:30:00Z'::timestamptz, 155, 0, '/placeholder.svg', (SELECT id FROM auth.users LIMIT 1), '{"category":"Growth & Purpose","autopilot_tag":"GROWTH_05","host":"Tony Breslin","guest":"Performance Coach Lisa Wang","vtn_reward":24}'::jsonb),
  ('Founder Energy Night', 'Join us for an exclusive growth & purpose experience.', 'networking', 'Palma Rooftop', NULL, '2026-08-02T16:30:00Z'::timestamptz, '2026-08-02T19:00:00Z'::timestamptz, 38, 0, '/placeholder.svg', (SELECT id FROM auth.users LIMIT 1), '{"category":"Growth & Purpose","autopilot_tag":"GROWTH_06","host":"Marco Silva","guest":"Tech Founder Zara Khan","vtn_reward":44,"venue_type":"restaurant"}'::jsonb),
  ('Biohack Your Brain', 'Join us for an exclusive biohacking & longevity experience.', 'workshop', NULL, 'https://meet.vitana.app/maxina-summer', '2026-08-05T17:00:00Z'::timestamptz, '2026-08-05T18:30:00Z'::timestamptz, 170, 0, '/placeholder.svg', (SELECT id FROM auth.users LIMIT 1), '{"category":"Biohacking & Longevity","autopilot_tag":"BIO_LONG_06","host":"Dr. Andreas Berg","guest":"Neuroscientist Dr. Felix Müller","vtn_reward":25}'::jsonb),
  ('Beach Breathwork & Cold Plunge', 'Join us for an exclusive mind & body experience.', 'networking', 'Cala Major Beach', NULL, '2026-08-09T06:00:00Z'::timestamptz, '2026-08-09T08:00:00Z'::timestamptz, 22, 0, '/placeholder.svg', (SELECT id FROM auth.users LIMIT 1), '{"category":"Mind & Body","autopilot_tag":"MIND_BODY_06","host":"Sofia Martinez","guest":"Wim Hof Instructor Lars Eriksen","vtn_reward":35,"venue_type":"beach"}'::jsonb),
  ('How to Think Younger', 'Join us for an exclusive biohacking & longevity experience.', 'workshop', NULL, 'https://meet.vitana.app/maxina-summer', '2026-08-12T17:00:00Z'::timestamptz, '2026-08-12T18:30:00Z'::timestamptz, 165, 0, '/placeholder.svg', (SELECT id FROM auth.users LIMIT 1), '{"category":"Biohacking & Longevity","autopilot_tag":"BIO_LONG_07","host":"Prof. Dimitri Volkov","guest":"Anti-Aging Expert Dr. Claire Dubois","vtn_reward":21}'::jsonb),
  ('Purpose & Flow Retreat (1 Day)', 'Join us for an exclusive growth & purpose experience.', 'networking', 'Wellness Hotel Deià', NULL, '2026-08-15T07:00:00Z'::timestamptz, '2026-08-15T15:00:00Z'::timestamptz, 18, 0, '/placeholder.svg', (SELECT id FROM auth.users LIMIT 1), '{"category":"Growth & Purpose","autopilot_tag":"GROWTH_07","host":"Elena Kovač","guest":"Life Coach Michael Santos","vtn_reward":85,"venue_type":"hotel"}'::jsonb),
  ('Maxina Talk: The Future of Work & Wellbeing', 'Join us for an exclusive growth & purpose experience.', 'workshop', NULL, 'https://meet.vitana.app/maxina-summer', '2026-08-18T17:00:00Z'::timestamptz, '2026-08-18T18:30:00Z'::timestamptz, 200, 0, '/placeholder.svg', (SELECT id FROM auth.users LIMIT 1), '{"category":"Growth & Purpose","autopilot_tag":"GROWTH_08","host":"Mariia Maksina","guest":"Future of Work Expert Dr. Sarah Chen","vtn_reward":22}'::jsonb),
  ('The Intimacy Conversation', 'Join us for an exclusive social & love experience.', 'networking', 'Beach Villa, Mallorca', NULL, '2026-08-22T18:00:00Z'::timestamptz, '2026-08-22T20:30:00Z'::timestamptz, 20, 0, '/placeholder.svg', (SELECT id FROM auth.users LIMIT 1), '{"category":"Social & Love","autopilot_tag":"SOCIAL_06","host":"Dr. Ava Laurent","guest":"Relationship Coach Nina Petrov","vtn_reward":58,"venue_type":"beach"}'::jsonb),
  ('Science of Recovery', 'Join us for an exclusive mind & body experience.', 'workshop', NULL, 'https://meet.vitana.app/maxina-summer', '2026-08-25T17:00:00Z'::timestamptz, '2026-08-25T18:30:00Z'::timestamptz, 135, 0, '/placeholder.svg', (SELECT id FROM auth.users LIMIT 1), '{"category":"Mind & Body","autopilot_tag":"MIND_BODY_07","host":"Dr. Marcus Silva","guest":"Sports Physiologist Dr. Jan Kowalski","vtn_reward":18}'::jsonb),
  ('The Biohackers Summit Mallorca', 'Join us for an exclusive biohacking & longevity experience.', 'networking', 'Son Vida Venue', NULL, '2026-08-28T08:00:00Z'::timestamptz, '2026-08-28T14:00:00Z'::timestamptz, 50, 0, '/placeholder.svg', (SELECT id FROM auth.users LIMIT 1), '{"category":"Biohacking & Longevity","autopilot_tag":"BIO_LONG_08","host":"Prof. Dimitri Volkov","guest":"Celebrity Panel: Dave Asprey, Ben Greenfield","vtn_reward":95,"venue_type":"restaurant"}'::jsonb),
  ('Refocus & Recharge', 'Join us for an exclusive mind & body experience.', 'workshop', NULL, 'https://meet.vitana.app/maxina-summer', '2026-08-31T17:00:00Z'::timestamptz, '2026-08-31T18:30:00Z'::timestamptz, 150, 0, '/placeholder.svg', (SELECT id FROM auth.users LIMIT 1), '{"category":"Mind & Body","autopilot_tag":"MIND_BODY_08","host":"Sofia Martinez","guest":"Meditation Master Thich Nhat Minh","vtn_reward":20}'::jsonb),
  ('Gratitude Morning Walk', 'Join us for an exclusive mind & body experience.', 'networking', 'Palma Bay Promenade', NULL, '2026-09-02T05:00:00Z'::timestamptz, '2026-09-02T06:30:00Z'::timestamptz, 28, 0, '/placeholder.svg', (SELECT id FROM auth.users LIMIT 1), '{"category":"Mind & Body","autopilot_tag":"MIND_BODY_09","host":"Elena Kovač","guest":"Mindfulness Coach Dr. Rosa Sanchez","vtn_reward":30,"venue_type":"beach"}'::jsonb),
  ('The Love Reset', 'Join us for an exclusive social & love experience.', 'workshop', NULL, 'https://meet.vitana.app/maxina-summer', '2026-09-05T17:00:00Z'::timestamptz, '2026-09-05T18:30:00Z'::timestamptz, 125, 0, '/placeholder.svg', (SELECT id FROM auth.users LIMIT 1), '{"category":"Social & Love","autopilot_tag":"SOCIAL_07","host":"Dr. Ava Laurent","guest":"Couples Therapist James Reed","vtn_reward":19}'::jsonb),
  ('Mindful Leaders Dinner', 'Join us for an exclusive growth & purpose experience.', 'networking', 'Boutique Restaurant, Palma', NULL, '2026-09-08T17:30:00Z'::timestamptz, '2026-09-08T20:30:00Z'::timestamptz, 22, 0, '/placeholder.svg', (SELECT id FROM auth.users LIMIT 1), '{"category":"Growth & Purpose","autopilot_tag":"GROWTH_09","host":"Marco Silva","guest":"Executive Coach Linda Zhao","vtn_reward":62,"venue_type":"restaurant"}'::jsonb),
  ('Longevity Nutrition Masterclass', 'Join us for an exclusive biohacking & longevity experience.', 'workshop', NULL, 'https://meet.vitana.app/maxina-summer', '2026-09-11T17:00:00Z'::timestamptz, '2026-09-11T18:30:00Z'::timestamptz, 185, 0, '/placeholder.svg', (SELECT id FROM auth.users LIMIT 1), '{"category":"Biohacking & Longevity","autopilot_tag":"BIO_LONG_09","host":"Chef Isabella Torres","guest":"Longevity Nutritionist Dr. Peter Attia","vtn_reward":24}'::jsonb),
  ('Soul Connection Night', 'Join us for an exclusive social & love experience.', 'networking', 'Beach Lounge, Mallorca', NULL, '2026-09-14T18:00:00Z'::timestamptz, '2026-09-14T20:30:00Z'::timestamptz, 30, 0, '/placeholder.svg', (SELECT id FROM auth.users LIMIT 1), '{"category":"Social & Love","autopilot_tag":"SOCIAL_08","host":"Marina Costa","guest":"Spiritual Guide Amara Singh","vtn_reward":46,"venue_type":"beach"}'::jsonb),
  ('The Future of Conscious Tech', 'Join us for an exclusive growth & purpose experience.', 'workshop', NULL, 'https://meet.vitana.app/maxina-summer', '2026-09-17T17:00:00Z'::timestamptz, '2026-09-17T18:30:00Z'::timestamptz, 160, 0, '/placeholder.svg', (SELECT id FROM auth.users LIMIT 1), '{"category":"Growth & Purpose","autopilot_tag":"GROWTH_10","host":"Tony Breslin","guest":"AI Ethics Expert Dr. Maya Patel","vtn_reward":23}'::jsonb),
  ('Wellness Sunset & Closing Ceremony', 'Join us for an exclusive mind & body experience.', 'networking', 'Palma Beach', NULL, '2026-09-20T15:00:00Z'::timestamptz, '2026-09-20T18:00:00Z'::timestamptz, 45, 0, '/placeholder.svg', (SELECT id FROM auth.users LIMIT 1), '{"category":"Mind & Body","autopilot_tag":"MIND_BODY_10","host":"Mariia Maksina","guest":"DJ & Wellness Ambassador Alex Rivera","vtn_reward":40,"venue_type":"beach"}'::jsonb),
  ('The Long Life Panel', 'Join us for an exclusive biohacking & longevity experience.', 'workshop', NULL, 'https://meet.vitana.app/maxina-summer', '2026-09-23T17:00:00Z'::timestamptz, '2026-09-23T19:00:00Z'::timestamptz, 200, 0, '/placeholder.svg', (SELECT id FROM auth.users LIMIT 1), '{"category":"Biohacking & Longevity","autopilot_tag":"BIO_LONG_10","host":"Prof. Dimitri Volkov","guest":"Longevity Experts Panel","vtn_reward":26}'::jsonb),
  ('Maxina End-of-Summer Gala', 'Join us for an exclusive social & love experience.', 'networking', 'Palma Cathedral Area', NULL, '2026-09-26T17:00:00Z'::timestamptz, '2026-09-26T21:00:00Z'::timestamptz, 50, 0, '/placeholder.svg', (SELECT id FROM auth.users LIMIT 1), '{"category":"Social & Love","autopilot_tag":"SOCIAL_09","host":"Mariia Maksina","guest":"Celebrity DJ & Wellness Panel","vtn_reward":100,"venue_type":"restaurant"}'::jsonb),
  ('The Future of Social Wellness', 'Join us for an exclusive growth & purpose experience.', 'networking', 'Palma Cathedral Terrace', NULL, '2026-10-01T16:00:00Z'::timestamptz, '2026-10-01T19:00:00Z'::timestamptz, 42, 0, '/placeholder.svg', (SELECT id FROM auth.users LIMIT 1), '{"category":"Growth & Purpose","autopilot_tag":"GROWTH_11","host":"Mariia Maksina","guest":"Celebrity Panel & Press","vtn_reward":88,"venue_type":"restaurant"}'::jsonb);`;

export default function InitEvents() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Generating Maxina Summer 2026 events...');
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(SQL_SCRIPT);
    setCopied(true);
    notify('toasts.admin.copied2', 'toasts.admin.sqlScriptCopiedClipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    setStatus('success');
    setMessage('Please run the SQL script to generate events');
    
    // Auto-open SQL editor after 1 second
    const timer = setTimeout(() => {
      window.open('https://supabase.com/dashboard/project/inmkhvwdcuyhnxkgfvsb/sql/new', '_blank');
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-8">
      <div className="max-w-3xl w-full bg-card rounded-lg shadow-lg p-8 space-y-6">
        <div className="text-center space-y-4">
          <CheckCircle className="w-16 h-16 mx-auto text-primary" />
          <h1 className="text-2xl font-bold text-foreground">{t('screens.admin.generate40SummerEvents')}</h1>
          <p className="text-muted-foreground">
            Run the SQL script below in your Supabase SQL Editor to instantly create all 40 Maxina Summer 2026 events.
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">{t('screens.admin.sqlScriptCopyThis')}</h2>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              <Copy className="w-4 h-4" />
              {copied ? 'Copied!' : 'Copy SQL'}
            </button>
          </div>
          <pre className="bg-background p-4 rounded-lg overflow-x-auto text-xs max-h-64 overflow-y-auto border border-border">
            <code>{SQL_SCRIPT}</code>
          </pre>
        </div>

        <div className="bg-muted/50 rounded-lg p-6 space-y-4">
          <h2 className="font-semibold text-foreground">{t('screens.admin.instructions')}</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>{t('screens.admin.clickCopySqlButtonAbove')}</li>
            <li>{t('screens.admin.clickOpenSqlEditorBelow')}</li>
            <li>{t('screens.admin.pasteSqlIntoEditor')}</li>
            <li>{t('screens.admin.clickRunInsertAll40Events')}</li>
            <li>{t('screens.admin.clickViewEventsSeeThem')}</li>
          </ol>
        </div>

        <div className="flex gap-4 justify-center">
          <a
            href="https://supabase.com/dashboard/project/inmkhvwdcuyhnxkgfvsb/sql/new"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            Open SQL Editor →
          </a>
          <button
            onClick={() => navigate('/admin/community/events')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors font-medium"
          >
            View Events
          </button>
        </div>
      </div>
    </div>
  );
}
