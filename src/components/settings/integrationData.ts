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
  category: 'social' | 'fitness' | 'health' | 'other' | 'ai';
}

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

// Other integrations (mindfulness, smart home, communication, developer)
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
  ...otherIntegrations,
];

// Get connection counts
export const getConnectionStats = () => {
  const all = getAllIntegrations();
  const connected = all.filter(i => i.connected).length;
  const syncing = all.filter(i => i.connected && i.lastSync && i.lastSync.includes('min')).length;
  return { connected, syncing, total: all.length };
};
