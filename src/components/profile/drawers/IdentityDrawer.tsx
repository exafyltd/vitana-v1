import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { IdentityForm } from "../editor/IdentityForm";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/context/ProfileProvider";
import { useTranslation } from "@/hooks/useTranslation";
import { lookup } from '@/lib/i18n-toast';

interface IdentityDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IdentityDrawer({ open, onOpenChange }: IdentityDrawerProps) {
  const [formData, setFormData] = useState({
    displayName: "",
    handle: "",
    avatarUrl: "",
    avatarOffsetX: 50,
    avatarOffsetY: 50,
    longevityArchetype: ""
  });
  const [saving, setSaving] = useState(false);
  // Tracks whether IdentityForm's initial profile load actually succeeded.
  // A failed/never-settled load must not be allowed to save — the handle,
  // avatarUrl, offsets, and longevityArchetype fields have no per-field
  // guard the way displayName does below, so a blank load-then-save would
  // silently wipe them.
  const [loadSucceeded, setLoadSucceeded] = useState(false);
  const { toast } = useToast();
  const { refreshProfile } = useProfile();
  const { translate } = useTranslation();

  const handleSave = async () => {
    if (!loadSucceeded) {
      console.error('[IdentityDrawer] Refusing to save: initial profile load never succeeded');
      toast({
        title: translate('toasts.error.loadFailed'),
        description: translate('toasts.error.loadFailedDesc'),
        variant: "destructive",
      });
      return;
    }

    if (!formData.displayName.trim()) {
      toast({
        title: translate('profileEditor.identity.displayName'),
        description: lookup('toasts.profile.displayNameRequired'),
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      console.log('Saving profile data:', formData);

      // The profiles row is created on signup so it always exists here.
      // UPSERT would attempt an INSERT first and fail the profiles.vitana_id
      // NOT NULL constraint because vitana_id isn't part of this payload.
      const { error, data } = await supabase
        .from('profiles')
        .update({
          display_name: formData.displayName,
          handle: formData.handle,
          avatar_url: formData.avatarUrl,
          avatar_offset_x: formData.avatarOffsetX,
          avatar_offset_y: formData.avatarOffsetY,
          longevity_archetype: formData.longevityArchetype,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Profile updated successfully:', data);

      // Refresh the profile context to show updated data
      refreshProfile();

      toast({
        title: translate('profileEditor.identity.identityUpdated'),
        description: translate('profileEditor.identity.identityUpdatedDesc'),
      });
      
      onOpenChange(false);
    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        title: translate('profileEditor.saveFailed'),
        description: error.message || translate('profileEditor.saveFailedDesc'),
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
          <DialogTitle>{translate('profileEditor.identity.editIdentity')}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <IdentityForm onDataChange={setFormData} onLoadStatusChange={setLoadSucceeded} />
          
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
