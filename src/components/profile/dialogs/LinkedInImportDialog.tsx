import { useState } from "react";
import { 
  ResponsiveDialog, 
  ResponsiveDialogContent, 
  ResponsiveDialogDescription, 
  ResponsiveDialogHeader, 
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle 
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Linkedin } from "lucide-react";
import { notify, notifyError, t } from '@/lib/i18n-toast';

interface LinkedInImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: string;
}

export function LinkedInImportDialog({ open, onOpenChange, profileId }: LinkedInImportDialogProps) {
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [bioText, setBioText] = useState("");
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();

  const handleImport = async () => {
    if (!linkedinUrl.trim()) {
      notifyError('toasts.profile.linkedinUrlRequired', 'toasts.profile.pleaseEnterYourLinkedinProfileUrl');
      return;
    }

    setImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('linkedin-import', {
        body: {
          userId: profileId,
          linkedinUrl: linkedinUrl.trim(),
          bioText: bioText.trim() || null,
        }
      });

      if (error) throw error;

      notify('toasts.profile.linkedinDataImported', 'toasts.profile.yourProfileHasEnrichedWithLinkedin');

      onOpenChange(false);
      setLinkedinUrl("");
      setBioText("");
      
      // Refresh the page to show updated profile
      window.location.reload();
    } catch (error) {
      console.error('LinkedIn import error:', error);
      notifyError('toasts.profile.importFailed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <div className="flex items-center gap-2">
            <Linkedin className="h-5 w-5 text-blue-600" />
            <ResponsiveDialogTitle>{t('screens.profile.importFromLinkedin')}</ResponsiveDialogTitle>
          </div>
          <ResponsiveDialogDescription>
            {t('screens.profile.importYourProfessionalProfileEnrichYour')}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="linkedin-url">{t('screens.profile.linkedinProfileUrl')}</Label>
              <Input
                id="linkedin-url"
                placeholder={t('screens.profile.httpslinkedinCominyourname')}
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio-text">{t('screens.profile.aboutSectionOptional')}</Label>
              <Textarea
                id="bio-text"
                placeholder={t('screens.profile.pasteYourLinkedinAboutSectionHere')}
                value={bioText}
                onChange={(e) => setBioText(e.target.value)}
                rows={6}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {t('screens.profile.copyYourLinkedinBioForAipowered')}
              </p>
            </div>
          </div>
        </ResponsiveDialogBody>

        <ResponsiveDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={importing}
          >
            {t('screens.profile.cancel')}
          </Button>
          <Button
            onClick={handleImport}
            disabled={importing}
          >
            {importing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              'Import Profile'
            )}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
