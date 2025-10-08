import {
  Mail,
  Phone,
  MessageSquare,
  Facebook,
  Linkedin,
  Twitter,
  Instagram,
  Youtube,
  Video,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { XIcon } from "@/components/icons/XIcon";
import { TikTokIcon } from "@/components/icons/TikTokIcon";
import { InstagramIcon } from "@/components/icons/InstagramIcon";

export type ChannelType =
  | "email"
  | "sms"
  | "whatsapp"
  | "slack"
  | "facebook"
  | "linkedin"
  | "twitter"
  | "instagram"
  | "youtube"
  | "tiktok";

export interface ChannelConfig {
  icon: LucideIcon | React.ComponentType<any>;
  color: string;
  displayName: string;
}

export const CHANNEL_CONFIGS: Record<ChannelType, ChannelConfig> = {
  // Distribution channels
  email: { icon: Mail, color: "text-gray-600", displayName: "Email" },
  sms: { icon: Phone, color: "text-green-600", displayName: "SMS" },
  whatsapp: { icon: MessageSquare, color: "text-green-600", displayName: "WhatsApp" },
  slack: { icon: MessageSquare, color: "text-purple-600", displayName: "Slack" },

  // Social channels
  facebook: { icon: Facebook, color: "text-blue-700", displayName: "Facebook" },
  linkedin: { icon: Linkedin, color: "text-blue-800", displayName: "LinkedIn" },
  twitter: { icon: XIcon, color: "text-sky-500", displayName: "X (Twitter)" },
  instagram: { icon: InstagramIcon, color: "text-pink-600", displayName: "Instagram" },
  youtube: { icon: Youtube, color: "text-red-600", displayName: "YouTube" },
  tiktok: { icon: TikTokIcon, color: "text-black dark:text-white", displayName: "TikTok" },
};

export function getChannelIcon(channelType: string): LucideIcon | React.ComponentType<any> {
  const normalized = channelType.toLowerCase() as ChannelType;
  return CHANNEL_CONFIGS[normalized]?.icon || Mail;
}

export function getChannelColor(channelType: string): string {
  const normalized = channelType.toLowerCase() as ChannelType;
  return CHANNEL_CONFIGS[normalized]?.color || "text-gray-600";
}

export function getChannelDisplayName(channelType: string): string {
  const normalized = channelType.toLowerCase() as ChannelType;
  return CHANNEL_CONFIGS[normalized]?.displayName || channelType;
}
