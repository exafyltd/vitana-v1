import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { useAIConsent } from '@/hooks/useAIConsent';
import { AIDataConsentDialog } from '@/components/ai/AIDataConsentDialog';

type Platform = 'linkedin' | 'instagram' | 'tiktok' | 'youtube' | 'facebook' | 'x';

interface SocialMediaImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: Platform;
  platformName: string;
  icon: React.ReactNode;
  profileId: string;
  onSuccess?: () => void;
}

const platformPlaceholders: Record<Platform, { url: string; bio: string }> = {
  linkedin: {
    url: 'https://www.linkedin.com/in/yourprofile',
    bio: 'Paste your LinkedIn About section here...'
  },
  instagram: {
    url: 'https://www.instagram.com/yourhandle',
    bio: 'Paste your Instagram bio here...'
  },
  tiktok: {
    url: 'https://www.tiktok.com/@yourhandle',
    bio: 'Paste your TikTok bio here...'
  },
  youtube: {
    url: 'https://www.youtube.com/@yourchannel',
    bio: 'Paste your YouTube channel description here...'
  },
  facebook: {
    url: 'https://www.facebook.com/yourprofile',
    bio: 'Paste your Facebook bio here...'
  },
  x: {
    url: 'https://x.com/yourhandle',
    bio: 'Paste your X/Twitter bio here...'
  }
};

const platformHelpTexts: Record<Platform, string> = {
  linkedin: 'We\'ll use AI to extract your headline, summary, and professional skills.',
  instagram: 'We\'ll analyze your bio to understand your interests and lifestyle themes.',
  tiktok: 'We\'ll extract your content themes and creative personality from your bio.',
  youtube: 'We\'ll identify your content categories and expertise areas from your description.',
  facebook: 'We\'ll extract your interests and community involvement from your bio.',
  x: 'We\'ll analyze your bio to understand your topics of interest and communication style.'
};

export const SocialMediaImportDialog: React.FC<SocialMediaImportDialogProps> = ({
  open,
  onOpenChange,
  platform,
  platformName,
  icon,
  profileId,
  onSuccess
}) => {
  const [profileUrl, setProfileUrl] = useState('');
  const [bioText, setBioText] = useState('');
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();
  const { translate } = useTranslation();
  const { hasConsent, dialogOpen: consentDialogOpen, setDialogOpen: setConsentDialogOpen, grantConsent } = useAIConsent();

  const handleImport = async () => {
    if (!hasConsent) {
      setConsentDialogOpen(true);
      return;
    }

    // Validate profileId is a real UUID (not 'current-user' or empty)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!profileId || !uuidRegex.test(profileId)) {
      console.error('[SocialMediaImport] Invalid profileId:', profileId);
      toast({
        title: translate('socialImport.authRequired', 'Authentication Required'),
        description: translate('socialImport.authRequiredDesc', 'Please make sure you are logged in to connect social accounts.'),
        variant: 'destructive'
      });
      return;
    }

    if (!profileUrl.trim()) {
      toast({
        title: translate('socialImport.urlRequired', 'URL Required'),
        description: translate('socialImport.urlRequiredDesc', 'Please enter your {platform} profile URL').replace('{platform}', platformName),
        variant: 'destructive'
      });
      return;
    }

    setImporting(true);
    console.log(`[SocialMediaImport] Starting ${platform} import for user ${profileId}`);

    try {
      const requestBody = {
        userId: profileId,
        platform,
        profileUrl: profileUrl.trim(),
        bioText: bioText.trim()
      };
      
      console.log('[SocialMediaImport] Request body:', requestBody);

      const { data, error } = await supabase.functions.invoke('social-media-import', {
        body: requestBody
      });

      console.log('[SocialMediaImport] Response:', { data, error });

      if (error) {
        console.error('[SocialMediaImport] Function error:', error);
        throw new Error(error.message || 'Failed to invoke function');
      }

      if (data?.error) {
        console.error('[SocialMediaImport] Data error:', data.error);
        throw new Error(data.error);
      }

      toast({
        title: translate('socialImport.importSuccess', 'Import Successful'),
        description: translate('socialImport.importSuccessDesc', 'Your {platform} profile has been imported and enriched with AI insights.').replace('{platform}', platformName)
      });

      onOpenChange(false);
      setProfileUrl('');
      setBioText('');
      
      // Trigger parent refresh instead of page reload
      onSuccess?.();

    } catch (error: any) {
      console.error(`[SocialMediaImport] ${platformName} import error:`, error);
      toast({
        title: translate('socialImport.importFailed', 'Import Failed'),
        description: error.message || translate('socialImport.urlRequiredDesc', 'Please enter your {platform} profile URL').replace('{platform}', platformName),
        variant: 'destructive'
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {icon}
            <span>{translate('socialImport.dialogTitle', 'Import {platform} Profile').replace('{platform}', platformName)}</span>
          </DialogTitle>
          <DialogDescription>
            {translate('socialImport.dialogDescription', 'Connect your {platform} profile to enrich your Vitana identity with AI-powered insights.').replace('{platform}', platformName)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="profile-url">{translate('socialImport.profileUrl', '{platform} Profile URL').replace('{platform}', platformName)}</Label>
            <Input
              id="profile-url"
              type="url"
              placeholder={platformPlaceholders[platform].url}
              value={profileUrl}
              onChange={(e) => setProfileUrl(e.target.value)}
              disabled={importing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio-text">
              {translate('socialImport.bioLabel', 'Bio / About Section')} <span className="text-muted-foreground">{translate('socialImport.bioOptional', '(Optional)')}</span>
            </Label>
            <Textarea
              id="bio-text"
              placeholder={platformPlaceholders[platform].bio}
              value={bioText}
              onChange={(e) => setBioText(e.target.value)}
              disabled={importing}
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {translate(`socialImport.platformHelp.${platform}`, platformHelpTexts[platform])}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={importing}
          >
            {translate('socialImport.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleImport} disabled={importing}>
            {importing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {translate('socialImport.importing', 'Importing...')}
              </>
            ) : (
              translate('socialImport.importProfile', 'Import Profile')
            )}
          </Button>
        </div>
      </DialogContent>
      <AIDataConsentDialog
        open={consentDialogOpen}
        onOpenChange={setConsentDialogOpen}
        onConsent={grantConsent}
      />
    </Dialog>
  );
};
