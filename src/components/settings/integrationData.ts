import {
  Heart,
  Activity,
  Watch,
  Moon,
  Brain,
  Home,
  Hospital,
  TestTube,
  MessageCircle,
  CreditCard,
  Code,
  Apple,
  Utensils,
  Share2,
  Sparkles,
  Mail,
  Calendar,
  Contact,
  Phone,
  Music,
  Music2,
  Youtube,
  ShoppingBag,
  Store,
  Globe,
  LucideIcon
} from "lucide-react";
import { LinkedInIcon } from "@/components/icons/LinkedInIcon";
import { InstagramIcon } from "@/components/icons/InstagramIcon";
import { TikTokIcon } from "@/components/icons/TikTokIcon";
import { YouTubeIcon } from "@/components/icons/YouTubeIcon";
import { FacebookIcon } from "@/components/icons/FacebookIcon";
import { XIcon } from "@/components/icons/XIcon";

export interface Integration {
  id: string;
  name: string;
  icon: LucideIcon | React.ComponentType<{ className?: string }>;
  connected: boolean;
  syncData: string;
  lastSync?: string;
  comingSoon?: boolean;
  // VTID-02403: extended category list to include 'ai' for AI Assistants (ChatGPT, Claude)
  // Added 'productivity' for email/calendar/contacts and 'media' for music/video playback
  category: 'social' | 'fitness' | 'health' | 'other' | 'ai' | 'productivity' | 'media' | 'shopping';
}

// Shopping & Rewards — commerce providers that power the Discover marketplace.
// Status mirrors the live VCAOP affiliate programs: AliExpress / Bodylab24 /
// Alibaba (Admitad) and ROCKBROS (Awin) are live with cashback rewards; Amazon
// is recommendations-only (Amazon terms forbid incentivized cashback); eBay and
// third-party Shopify stores are coming soon. "Connecting" here opts the member
// into shopping via Discover, where the Buy action routes through the rewards-
// bearing affiliate link — no merchant password is ever stored.
export const shoppingIntegrations: Integration[] = [
  {
    id: 'aliexpress',
    name: 'AliExpress',
    icon: ShoppingBag,
    connected: true,
    syncData: 'Rewards active — shop in Discover to earn',
    category: 'shopping',
  },
  {
    id: 'bodylab24',
    name: 'Bodylab24',
    icon: ShoppingBag,
    connected: true,
    syncData: 'Rewards active — German supplements',
    category: 'shopping',
  },
  {
    id: 'alibaba',
    name: 'Alibaba',
    icon: Globe,
    connected: true,
    syncData: 'Rewards active — global marketplace',
    category: 'shopping',
  },
  {
    id: 'rockbros',
    name: 'ROCKBROS',
    icon: Store,
    connected: true,
    syncData: 'Rewards active — fitness & outdoor gear',
    category: 'shopping',
  },
  {
    id: 'amazon',
    name: 'Amazon',
    icon: ShoppingBag,
    connected: true,
    syncData: 'Recommendations only — no rewards (Amazon terms)',
    category: 'shopping',
  },
  {
    id: 'ebay',
    name: 'eBay',
    icon: ShoppingBag,
    connected: false,
    comingSoon: true,
    syncData: 'Coming soon',
    category: 'shopping',
  },
  {
    id: 'shopify-stores',
    name: 'Shopify Stores',
    icon: Store,
    connected: false,
    comingSoon: true,
    syncData: 'Coming soon',
    category: 'shopping',
  },
];

// Social & Sharing integrations
export const socialIntegrations: Integration[] = [
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: LinkedInIcon,
    connected: true,
    syncData: 'Professional network',
    lastSync: '1 hour ago',
    category: 'social',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: InstagramIcon,
    connected: true,
    syncData: 'Photos, stories, reels',
    lastSync: '30 min ago',
    category: 'social',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: TikTokIcon,
    connected: false,
    syncData: 'Short-form videos',
    category: 'social',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: YouTubeIcon,
    connected: true,
    syncData: 'Video content',
    lastSync: '2 hours ago',
    category: 'social',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: FacebookIcon,
    connected: false,
    syncData: 'Social sharing',
    category: 'social',
  },
  {
    id: 'x',
    name: 'X (Twitter)',
    icon: XIcon,
    connected: false,
    syncData: 'Posts and threads',
    category: 'social',
  },
];

// Fitness & Wearables integrations
export const fitnessIntegrations: Integration[] = [
  {
    id: 'apple-health',
    name: 'Apple Health',
    icon: Heart,
    connected: true,
    syncData: 'Steps, heart rate, sleep',
    lastSync: '2 min ago',
    category: 'fitness',
  },
  {
    id: 'fitbit',
    name: 'Fitbit',
    icon: Activity,
    connected: true,
    syncData: 'Activity, sleep, weight',
    lastSync: '15 min ago',
    category: 'fitness',
  },
  {
    id: 'strava',
    name: 'Strava',
    icon: Activity,
    connected: false,
    syncData: 'Exercise and running data',
    category: 'fitness',
  },
  {
    id: 'oura',
    name: 'Oura Ring',
    icon: Moon,
    connected: true,
    syncData: 'Sleep quality, readiness, HRV',
    lastSync: '1 hour ago',
    category: 'fitness',
  },
  {
    id: 'garmin',
    name: 'Garmin',
    icon: Watch,
    connected: false,
    syncData: 'GPS and fitness tracking',
    category: 'fitness',
  },
  {
    id: 'myfitnesspal',
    name: 'MyFitnessPal',
    icon: Apple,
    connected: true,
    syncData: 'Nutrition, calories, macros',
    lastSync: '30 min ago',
    category: 'fitness',
  },
];

// Health & Labs integrations
export const healthIntegrations: Integration[] = [
  {
    id: 'lifespin',
    name: 'Lifespin',
    icon: Hospital,
    connected: false,
    syncData: 'Metabolic health insights',
    comingSoon: true,
    category: 'health',
  },
  {
    id: 'fhir',
    name: 'FHIR Providers',
    icon: Hospital,
    connected: false,
    syncData: 'Clinical health records',
    comingSoon: true,
    category: 'health',
  },
  {
    id: 'partner-labs',
    name: 'Partner Labs',
    icon: TestTube,
    connected: false,
    syncData: 'Lab test results, biomarkers',
    comingSoon: true,
    category: 'health',
  },
];

// Productivity integrations — email, calendar, contacts (iOS + Android + Google + Microsoft)
// Ask Vitana "do I have any meetings today?" and she'll check your connected calendars.
export const productivityIntegrations: Integration[] = [
  {
    id: 'gmail',
    name: 'Gmail',
    icon: Mail,
    connected: false,
    syncData: 'Email inbox, drafts, labels',
    category: 'productivity',
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    icon: Calendar,
    connected: false,
    syncData: 'Events, meetings, availability',
    category: 'productivity',
  },
  {
    id: 'google-contacts',
    name: 'Google Contacts',
    icon: Contact,
    connected: false,
    syncData: 'Contact directory',
    category: 'productivity',
  },
  {
    id: 'apple-mail',
    name: 'Apple Mail (iPhone)',
    icon: Mail,
    connected: false,
    syncData: 'iOS Mail accounts and inbox',
    category: 'productivity',
  },
  {
    id: 'apple-calendar',
    name: 'Apple Calendar (iPhone)',
    icon: Calendar,
    connected: false,
    syncData: 'iOS Calendar events',
    category: 'productivity',
  },
  {
    id: 'iphone-contacts',
    name: 'iPhone Contacts',
    icon: Phone,
    connected: false,
    syncData: 'Address book from iOS',
    category: 'productivity',
  },
  {
    id: 'android-contacts',
    name: 'Android Contacts',
    icon: Phone,
    connected: false,
    syncData: 'Address book from Android',
    category: 'productivity',
  },
  {
    id: 'outlook-mail',
    name: 'Outlook Mail',
    icon: Mail,
    connected: false,
    syncData: 'Microsoft email inbox',
    category: 'productivity',
  },
  {
    id: 'outlook-calendar',
    name: 'Outlook Calendar',
    icon: Calendar,
    connected: false,
    syncData: 'Microsoft calendar events',
    category: 'productivity',
  },
];

// Media integrations — music & video playback so Vitana can say "play Thriller by Michael Jackson"
export const mediaIntegrations: Integration[] = [
  {
    id: 'spotify',
    name: 'Spotify',
    icon: Music,
    connected: false,
    syncData: 'Music playback, playlists, listening history',
    category: 'media',
  },
  {
    id: 'apple-music',
    name: 'Apple Music',
    icon: Music2,
    connected: false,
    syncData: 'Music playback and library',
    category: 'media',
  },
  {
    id: 'youtube-music',
    name: 'YouTube Music',
    icon: Music2,
    connected: false,
    syncData: 'Music streaming, playlists',
    category: 'media',
  },
  {
    id: 'youtube-playback',
    name: 'YouTube',
    icon: Youtube,
    connected: false,
    syncData: 'Video playback, watch history',
    category: 'media',
  },
];

// Other integrations (mindfulness, smart home, messaging, developer)
export const otherIntegrations: Integration[] = [
  {
    id: 'calm',
    name: 'Calm',
    icon: Brain,
    connected: false,
    syncData: 'Meditation, mindfulness',
    category: 'other',
  },
  {
    id: 'headspace',
    name: 'Headspace',
    icon: Brain,
    connected: false,
    syncData: 'Guided meditation',
    category: 'other',
  },
  {
    id: 'smart-scales',
    name: 'Smart Scales',
    icon: Home,
    connected: false,
    syncData: 'Weight, body composition',
    comingSoon: true,
    category: 'other',
  },
  {
    id: 'air-quality',
    name: 'Air Quality Sensors',
    icon: Home,
    connected: false,
    syncData: 'Indoor air quality',
    comingSoon: true,
    category: 'other',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: MessageCircle,
    connected: false,
    syncData: 'Messaging integration',
    comingSoon: true,
    category: 'other',
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: MessageCircle,
    connected: false,
    syncData: 'Bot and messaging',
    comingSoon: true,
    category: 'other',
  },
  {
    id: 'csv-import',
    name: 'CSV Import',
    icon: Code,
    connected: false,
    syncData: 'Bulk data import',
    category: 'other',
  },
  {
    id: 'api-access',
    name: 'API Access',
    icon: Code,
    connected: false,
    syncData: 'Developer tools',
    comingSoon: true,
    category: 'other',
  },
];

// VTID-02403: AI Assistants (ChatGPT + Claude) — live status resolved at render time in MobileConnectedAppsView.
export const aiAssistantsIntegrations: Integration[] = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    icon: Sparkles,
    connected: false,
    syncData: 'OpenAI API — chat, reasoning',
    category: 'ai',
  },
  {
    id: 'claude',
    name: 'Claude',
    icon: Sparkles,
    connected: false,
    syncData: 'Anthropic API — chat, reasoning',
    category: 'ai',
  },
];

// Get all integrations
export const getAllIntegrations = (): Integration[] => [
  ...aiAssistantsIntegrations,
  ...socialIntegrations,
  ...fitnessIntegrations,
  ...healthIntegrations,
  ...productivityIntegrations,
  ...mediaIntegrations,
  ...otherIntegrations,
];

// Get connection counts
export const getConnectionStats = () => {
  const all = getAllIntegrations();
  const connected = all.filter(i => i.connected).length;
  const syncing = all.filter(i => i.connected && i.lastSync && i.lastSync.includes('min')).length;
  return { connected, syncing, total: all.length };
};
