import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageSquare, Loader2, CheckCircle } from "lucide-react";
import { useChannels } from "@/hooks/useChannels";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

const DEMO_CHANNELS = [
  { type: "email" as const, name: "Email Newsletter", icon: Mail },
  { type: "sms" as const, name: "SMS Messages", icon: MessageSquare },
  { type: "slack" as const, name: "Slack Workspace", icon: MessageSquare },
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
    return channels?.some(c => c.channel_type === type && c.is_connected);
  };

  const allConnected = DEMO_CHANNELS.every(ch => isChannelConnected(ch.type));

  if (allConnected) {
    return null; // Hide if all demo channels are connected
  }

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-base">Quick Setup</CardTitle>
        <p className="text-sm text-muted-foreground">
          Connect channels to start distributing content
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {DEMO_CHANNELS.map((channel) => {
          const Icon = channel.icon;
          const isConnected = isChannelConnected(channel.type);
          const isConnecting = connectingChannels.has(channel.type);

          if (isConnected) return null;

          return (
            <div key={channel.type} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
              <Icon className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium text-sm">{channel.name}</p>
                <p className="text-xs text-muted-foreground">Demo channel</p>
              </div>
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
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
