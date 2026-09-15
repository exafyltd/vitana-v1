import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AboutForm } from "../editor/AboutForm";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/context/ProfileProvider";
import { useTranslation } from "@/hooks/useTranslation";

interface AboutDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AboutDrawer({ open, onOpenChange }: AboutDrawerProps) {
  const [formData, setFormData] = useState({
    bio: "",
    location: "",
    links: [] as Array<{ label: string; url: string }>,
    languages: [] as string[]
  });
  const [saving, setSaving] = useState(false);
  // Tracks whether AboutForm's initial profile load actually succeeded. A
  // failed/never-settled load must not be allowed to save — the form data
  // it's tracking would be blank, and saving it would silently wipe the
  // user's real bio/location/links/languages.
  const [loadSucceeded, setLoadSucceeded] = useState(false);
  const { toast } = useToast();
  const { refreshProfile } = useProfile();
  const { translate } = useTranslation();

  const handleSave = async () => {
    if (!loadSucceeded) {
      console.error('[AboutDrawer] Refusing to save: initial profile load never succeeded');
      toast({
        title: translate('toasts.error.loadFailed'),
        description: translate('toasts.error.loadFailedDesc'),
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      console.log('[AboutDrawer] Saving profile data:', formData);

      // The profiles row is created on signup so it always exists here.
      // UPSERT would attempt an INSERT first and fail the profiles.vitana_id
      // NOT NULL constraint because vitana_id isn't part of this payload.
      const { error, data } = await supabase
        .from('profiles' as any)
        .update({
          bio: formData.bio,
          location: formData.location,
          links: formData.links,
          languages: formData.languages,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select();

      if (error) {
        console.error('[AboutDrawer] Supabase error:', error);
        throw error;
      }

      console.log('[AboutDrawer] Profile updated successfully:', data);

      refreshProfile();

      toast({
        title: translate('profileEditor.profileUpdated'),
        description: translate('profileEditor.profileUpdatedDesc'),
      });
      
      onOpenChange(false);
    } catch (error: any) {
      console.error('[AboutDrawer] Save error:', error);
      toast({
        title: translate('profileEditor.saveFailed'),
        description: translate('profileEditor.saveFailedDesc'),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{translate('profileEditor.editAbout')}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <AboutForm onDataChange={setFormData} onLoadStatusChange={setLoadSucceeded} />
          
          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              {translate('profileEditor.cancel')}
            </Button>
            <Button 
              className="flex-1"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? translate('profileEditor.saving') : translate('profileEditor.save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
