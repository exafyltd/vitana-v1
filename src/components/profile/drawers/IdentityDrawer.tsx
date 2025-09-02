import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { IdentityForm } from "../editor/IdentityForm";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/context/ProfileProvider";

interface IdentityDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IdentityDrawer({ open, onOpenChange }: IdentityDrawerProps) {
  const [formData, setFormData] = useState({
    displayName: "",
    handle: "",
    avatarUrl: "",
    coverUrl: ""
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { refreshProfile } = useProfile();

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      console.log('Saving profile data:', formData);

      // Use upsert to create record if it doesn't exist, or update if it does
      const { error, data } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          display_name: formData.displayName,
          handle: formData.handle,
          avatar_url: formData.avatarUrl,
          cover_url: formData.coverUrl,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        })
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Profile updated successfully:', data);

      // Refresh the profile context to show updated data
      refreshProfile();

      toast({
        title: "Profile updated",
        description: "Your identity information has been saved successfully.",
      });
      
      onOpenChange(false);
    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        title: "Save failed",
        description: error.message || "Failed to save profile. Please try again.",
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
          <DialogTitle>Edit Identity</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <IdentityForm onDataChange={setFormData} />
          
          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}