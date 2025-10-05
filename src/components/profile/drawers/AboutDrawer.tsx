import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AboutForm } from "../editor/AboutForm";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/context/ProfileProvider";

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
  const { toast } = useToast();
  const { refreshProfile } = useProfile();

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      console.log('[AboutDrawer] Saving profile data:', formData);

      const { error, data } = await supabase
        .from('profiles')
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
        title: "Profile updated",
        description: "Your about information has been saved successfully.",
      });
      
      onOpenChange(false);
    } catch (error: any) {
      console.error('[AboutDrawer] Save error:', error);
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
          <DialogTitle>Edit About</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <AboutForm onDataChange={setFormData} />
          
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