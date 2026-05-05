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
import { notifyError, notifySuccess, t } from '@/lib/i18n-toast';

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
    senderName: "",
    twilioAccountSid: "",
    twilioAuthToken: "",
    twilioFromNumber: "",
    metaApiToken: "",
    metaPhoneNumberId: "",
  });
  const [testing, setTesting] = useState(false);

  const channelInfo = CHANNEL_INFO[channelKey];
  const isSocialMedia = ['linkedin', 'instagram', 'facebook', 'twitter', 'youtube', 'tiktok'].includes(channelKey);
  const isMessaging = ['email', 'sms', 'whatsapp'].includes(channelKey);

  const handleConnectSocialMedia = async () => {
    if (!formData.url.trim()) {
      notifyError('toasts.sharing.pleaseEnterYourProfileUrl');
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
      notifyError('toasts.sharing.failedConnectChannel');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      if (channelKey === 'email') {
        if (!formData.email || !formData.senderName) {
          notifyError('toasts.sharing.pleaseFillAllEmailFields');
          return;
        }
        notifySuccess('toasts.sharing.emailConfigurationLooksGoodTestEmail');
      } else if (channelKey === 'sms') {
        if (!formData.twilioAccountSid || !formData.twilioAuthToken || !formData.twilioFromNumber) {
          notifyError('toasts.sharing.pleaseFillAllTwilioFields');
          return;
        }
        notifySuccess('toasts.sharing.twilioConfigurationValidated');
      } else if (channelKey === 'whatsapp') {
        if (!formData.metaApiToken || !formData.metaPhoneNumberId) {
          notifyError('toasts.sharing.pleaseFillAllWhatsappFields');
          return;
        }
        notifySuccess('toasts.sharing.whatsappBusinessApiConfigurationValidated');
      }
    } catch (error) {
      notifyError('toasts.sharing.connectionTestFailed');
    } finally {
      setTesting(false);
    }
  };

  const handleConnectMessaging = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let connectionData: any = {};
      
      if (channelKey === 'email') {
        if (!formData.email || !formData.senderName) {
          notifyError('toasts.sharing.pleaseFillSenderNameEmail');
          setLoading(false);
          return;
        }
        connectionData = { 
          email: formData.email,
          sender_name: formData.senderName
        };
      } else if (channelKey === 'sms') {
        if (!formData.twilioAccountSid || !formData.twilioAuthToken || !formData.twilioFromNumber) {
          notifyError('toasts.sharing.pleaseFillAllTwilioCredentials');
          setLoading(false);
          return;
        }
        connectionData = { 
          twilio_account_sid: formData.twilioAccountSid,
          twilio_auth_token: formData.twilioAuthToken,
          from_number: formData.twilioFromNumber
        };
      } else if (channelKey === 'whatsapp') {
        if (!formData.metaApiToken || !formData.metaPhoneNumberId) {
          notifyError('toasts.sharing.pleaseFillMetaApiCredentials');
          setLoading(false);
          return;
        }
        connectionData = { 
          meta_api_token: formData.metaApiToken,
          phone_number_id: formData.metaPhoneNumberId
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
      notifyError('toasts.sharing.failedConnectChannel');
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
              <Label htmlFor="url">{t('screens.sharing.profileUrl')}</Label>
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

          {/* Email Configuration */}
          {channelKey === 'email' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="sender-name">{t('screens.sharing.senderName')}</Label>
                <Input
                  id="sender-name"
                  type="text"
                  placeholder={t('screens.sharing.yourNameBusiness')}
                  value={formData.senderName}
                  onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('screens.sharing.thisNameWillAppearRecipientInboxes')}
                </p>
              </div>
              
              <div>
                <Label htmlFor="email">{t('screens.sharing.senderEmailAddress')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('screens.sharing.helloYourdomainCom')}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('screens.sharing.mustVerifiedDomainResend')}
                </p>
              </div>

              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <div className="flex-1 text-sm">
                  <p className="font-medium">{t('screens.sharing.domainVerification')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('screens.sharing.verifyYourDomainResendSendEmails')}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://resend.com/domains', '_blank')}
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  {t('screens.sharing.verify')}
                </Button>
              </div>

              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={handleTestConnection}
                disabled={testing}
              >
                {testing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Test Email Configuration
              </Button>
            </div>
          )}

          {/* SMS Configuration (Twilio) */}
          {channelKey === 'sms' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="twilio-sid">{t('screens.sharing.twilioAccountSid')}</Label>
                <Input
                  id="twilio-sid"
                  type="text"
                  placeholder={t('screens.sharing.acxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')}
                  value={formData.twilioAccountSid}
                  onChange={(e) => setFormData({ ...formData, twilioAccountSid: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="twilio-token">{t('screens.sharing.twilioAuthToken')}</Label>
                <Input
                  id="twilio-token"
                  type="password"
                  placeholder={t('screens.sharing.yourAuthToken')}
                  value={formData.twilioAuthToken}
                  onChange={(e) => setFormData({ ...formData, twilioAuthToken: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="twilio-from">{t('screens.sharing.fromPhoneNumber')}</Label>
                <Input
                  id="twilio-from"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={formData.twilioFromNumber}
                  onChange={(e) => setFormData({ ...formData, twilioFromNumber: e.target.value })}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('screens.sharing.yourTwilioPhoneNumberWithCountry')}
                </p>
              </div>

              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <div className="flex-1 text-sm">
                  <p className="font-medium">{t('screens.sharing.twilioSetup')}</p>
                  <p className="text-xs text-muted-foreground">
                    Get your credentials from Twilio Console
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://console.twilio.com', '_blank')}
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  {t('screens.sharing.open')}
                </Button>
              </div>

              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={handleTestConnection}
                disabled={testing}
              >
                {testing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Test SMS Connection
              </Button>
            </div>
          )}

          {/* WhatsApp Configuration (Meta Business) */}
          {channelKey === 'whatsapp' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="meta-token">{t('screens.sharing.metaBusinessApiToken')}</Label>
                <Input
                  id="meta-token"
                  type="password"
                  placeholder={t('screens.sharing.yourBusinessApiToken')}
                  value={formData.metaApiToken}
                  onChange={(e) => setFormData({ ...formData, metaApiToken: e.target.value })}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('screens.sharing.fromMetaBusinessSuite')}
                </p>
              </div>

              <div>
                <Label htmlFor="phone-id">{t('screens.sharing.phoneNumberId')}</Label>
                <Input
                  id="phone-id"
                  type="text"
                  placeholder="123456789012345"
                  value={formData.metaPhoneNumberId}
                  onChange={(e) => setFormData({ ...formData, metaPhoneNumberId: e.target.value })}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('screens.sharing.yourWhatsappBusinessPhoneNumberId')}
                </p>
              </div>

              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <div className="flex-1 text-sm">
                  <p className="font-medium">{t('screens.sharing.whatsappBusinessSetup')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('screens.sharing.configureMetaBusinessSuite')}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://business.facebook.com', '_blank')}
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  {t('screens.sharing.open')}
                </Button>
              </div>

              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={handleTestConnection}
                disabled={testing}
              >
                {testing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Test WhatsApp Connection
              </Button>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              {t('screens.sharing.cancel')}
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
