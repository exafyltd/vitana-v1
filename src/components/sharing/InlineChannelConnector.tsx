import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useChannels } from "@/hooks/useChannels";
import { useProfile } from "@/context/ProfileProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ExternalLink } from "lucide-react";
import { CHANNEL_INFO } from "@/lib/campaign-templates";

interface InlineChannelConnectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelKey: string;
  onConnected?: () => void;
}

export function InlineChannelConnector({ 
  open, 
  onOpenChange, 
  channelKey,
  onConnected 
}: InlineChannelConnectorProps) {
  const { connectChannel } = useChannels();
  const { profile, refreshProfile } = useProfile();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    url: "",
    email: "",
    phone: "",
    apiKey: "",
  });

  const channelInfo = CHANNEL_INFO[channelKey];
  const isSocialMedia = ['linkedin', 'instagram', 'facebook', 'twitter', 'youtube', 'tiktok'].includes(channelKey);
  const isMessaging = ['email', 'sms', 'whatsapp'].includes(channelKey);

  const handleConnectSocialMedia = async () => {
    if (!formData.url.trim()) {
      toast.error("Please enter your profile URL");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const urlField = `${channelKey}_url`;
      await supabase
        .from("profiles")
        .update({ [urlField]: formData.url })
        .eq("user_id", user.id);

      await refreshProfile();
      toast.success(`${channelInfo.name} connected successfully!`);
      onConnected?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Connection error:", error);
      toast.error("Failed to connect channel");
    } finally {
      setLoading(false);
    }
  };

  const handleConnectMessaging = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let connectionData: any = {};
      
      if (channelKey === 'email' && formData.email) {
        connectionData = { email: formData.email };
      } else if (channelKey === 'sms' && formData.phone) {
        connectionData = { phone: formData.phone };
      } else if (channelKey === 'whatsapp') {
        if (!formData.phone) {
          toast.error("Please enter your WhatsApp phone number");
          setLoading(false);
          return;
        }
        connectionData = { 
          phone: formData.phone,
          api_key: formData.apiKey || null 
        };
      }

      await connectChannel.mutateAsync({
        user_id: user.id,
        channel_name: channelInfo.name,
        channel_type: channelKey as any,
        is_connected: true,
        is_active: true,
        connection_data: connectionData,
      });

      toast.success(`${channelInfo.name} connected successfully!`);
      onConnected?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Connection error:", error);
      toast.error("Failed to connect channel");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSocialMedia) {
      await handleConnectSocialMedia();
    } else if (isMessaging) {
      await handleConnectMessaging();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Connect {channelInfo?.name}</DialogTitle>
          <DialogDescription>
            {isSocialMedia && "Enter your profile URL to enable posting"}
            {isMessaging && `Configure your ${channelInfo?.name} settings`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Social Media URL Input */}
          {isSocialMedia && (
            <div>
              <Label htmlFor="url">Profile URL</Label>
              <Input
                id="url"
                type="url"
                placeholder={`https://${channelKey}.com/yourprofile`}
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter your full {channelInfo.name} profile URL
              </p>
            </div>
          )}

          {/* Email Input */}
          {channelKey === 'email' && (
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1"
              />
            </div>
          )}

          {/* SMS Input */}
          {channelKey === 'sms' && (
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-1"
              />
            </div>
          )}

          {/* WhatsApp Inputs */}
          {channelKey === 'whatsapp' && (
            <>
              <div>
                <Label htmlFor="whatsapp-phone">WhatsApp Phone Number</Label>
                <Input
                  id="whatsapp-phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Include country code
                </p>
              </div>

              <div>
                <Label htmlFor="api-key">WhatsApp Business API Key (Optional)</Label>
                <Input
                  id="api-key"
                  type="password"
                  placeholder="Your API key"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Required for automated posting. Leave empty for manual posting.
                </p>
              </div>
            </>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Connect
            </Button>
          </div>

          {isSocialMedia && (
            <div className="pt-2 border-t">
              <Button
                type="button"
                variant="link"
                size="sm"
                className="w-full"
                onClick={() => {
                  window.open(`https://${channelKey}.com`, '_blank');
                }}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Visit {channelInfo.name}
              </Button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
