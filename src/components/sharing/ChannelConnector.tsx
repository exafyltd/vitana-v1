import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  MessageSquare, 
  Loader2, 
  CheckCircle,
  Instagram,
  Linkedin,
  Twitter,
  Facebook,
  Youtube,
  Video,
  Phone
} from "lucide-react";
import { useChannels } from "@/hooks/useChannels";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { t } from '@/lib/i18n-toast';

const ALL_CHANNELS = [
  { type: "email" as const, name: "Email", icon: Mail, color: "text-gray-600" },
  { type: "sms" as const, name: "SMS", icon: Phone, color: "text-green-600" },
  { type: "whatsapp" as const, name: "WhatsApp", icon: MessageSquare, color: "text-green-600" },
  { type: "slack" as const, name: "Slack", icon: MessageSquare, color: "text-purple-600" },
];

const SOCIAL_CHANNELS = [
  { key: "instagram", name: "Instagram", icon: Instagram, color: "text-pink-600" },
  { key: "linkedin", name: "LinkedIn", icon: Linkedin, color: "text-blue-600" },
  { key: "twitter", name: "Twitter/X", icon: Twitter, color: "text-black" },
  { key: "facebook", name: "Facebook", icon: Facebook, color: "text-blue-500" },
  { key: "youtube", name: "YouTube", icon: Youtube, color: "text-red-600" },
  { key: "tiktok", name: "TikTok", icon: Video, color: "text-black" },
];

export function ChannelConnector() {
  const { channels, connectChannel } = useChannels();
  const [connectingChannels, setConnectingChannels] = useState<Set<string>>(new Set());

  const handleConnect = async (channelType: Database["public"]["Enums"]["channel_type"], channelName: string) => {
    setConnectingChannels(prev => new Set([...prev, channelType]));
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error("Not authenticated");
      }

      await connectChannel.mutateAsync({
        user_id: userData.user.id,
        channel_type: channelType,
        channel_name: channelName,
        is_connected: true,
        is_active: true,
      });
    } finally {
      setConnectingChannels(prev => {
        const newSet = new Set(prev);
        newSet.delete(channelType);
        return newSet;
      });
    }
  };

  const isChannelConnected = (type: string) => {
    return channels?.some(c => 
      c.channel_type === type || 
      c.channel_name?.toLowerCase() === type.toLowerCase()
    );
  };

  return (
    <div className="space-y-4">
      {/* Core Distribution Channels */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">{t('screens.sharing.distributionChannels')}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Connect messaging channels for direct distribution
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {ALL_CHANNELS.map((channel) => {
            const Icon = channel.icon;
            const isConnected = isChannelConnected(channel.type);
            const isConnecting = connectingChannels.has(channel.type);

            return (
              <div key={channel.type} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                <Icon className={`w-5 h-5 ${channel.color}`} />
                <div className="flex-1">
                  <p className="font-medium text-sm">{channel.name}</p>
                  {isConnected ? (
                    <Badge variant="outline" className="mt-1 text-xs gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Connected
                    </Badge>
                  ) : (
                    <p className="text-xs text-muted-foreground">{t('screens.sharing.notConnected')}</p>
                  )}
                </div>
                {!isConnected && (
                  <Button
                    size="sm"
                    onClick={() => handleConnect(channel.type, channel.name)}
                    disabled={isConnecting}
                  >
                    {isConnecting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Connect"
                    )}
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Social Media Channels */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">{t('screens.sharing.socialMedia')}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Social platforms require API integration (coming soon)
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {SOCIAL_CHANNELS.map((channel) => {
            const Icon = channel.icon;
            const isConnected = isChannelConnected(channel.key);

            return (
              <div key={channel.key} className="flex items-center gap-3 p-3 rounded-lg border bg-card opacity-60">
                <Icon className={`w-5 h-5 ${channel.color}`} />
                <div className="flex-1">
                  <p className="font-medium text-sm">{channel.name}</p>
                  {isConnected ? (
                    <Badge variant="outline" className="mt-1 text-xs gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Connected
                    </Badge>
                  ) : (
                    <p className="text-xs text-muted-foreground">{t('screens.sharing.comingSoon')}</p>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
