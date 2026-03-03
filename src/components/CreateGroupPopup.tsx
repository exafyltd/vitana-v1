import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Globe, Lock, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

interface CreateGroupPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateGroupPopup({ isOpen, onClose }: CreateGroupPopupProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    privacy: "public",
    location: "",
    isVirtual: false,
    rules: ""
  });

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const availableTags = ["Fitness", "Nutrition", "Mental Health", "Mindfulness", "Support", "Learning", "Social", "Outdoor"];

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Name required", description: "Please enter a group name.", variant: "destructive" });
      return;
    }
    if (!user?.id) {
      toast({ title: "Not logged in", description: "Please log in to create a group.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      // Insert group
      const { data: newGroup, error: groupError } = await supabase
        .from('global_community_groups')
        .insert({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          category: formData.category || null,
          is_public: formData.privacy === 'public',
          created_by: user.id,
          status: 'approved',
          member_count: 0,
        })
        .select('id')
        .single();

      if (groupError) throw groupError;

      // Ensure creator is a member (trigger should do this, fallback for safety)
      const { count: existingMembershipCount, error: membershipCheckError } = await supabase
        .from('global_community_group_members')
        .select('id', { count: 'exact', head: true })
        .eq('group_id', newGroup.id)
        .eq('user_id', user.id);

      if (membershipCheckError) throw membershipCheckError;

      if ((existingMembershipCount ?? 0) === 0) {
        const { error: memberError } = await supabase
          .from('global_community_group_members')
          .insert({
            group_id: newGroup.id,
            user_id: user.id,
            role: 'admin',
          });

        if (memberError) {
          console.error('[CreateGroup] member insert error:', memberError);
          throw memberError;
        }
      }

      // Invalidate caches
      queryClient.invalidateQueries({ queryKey: ['user-groups'] });
      queryClient.invalidateQueries({ queryKey: ['group-directory'] });
      queryClient.invalidateQueries({ queryKey: ['profile-stats-count'] });
      // Refresh inbox so the new group chat thread appears
      queryClient.invalidateQueries({ queryKey: ['global-threads'] });

      toast({
        title: "Group Created! 🎉",
        description: `${formData.name} has been created successfully.`
      });

      onClose();
      setFormData({ name: "", description: "", category: "", privacy: "public", location: "", isVirtual: false, rules: "" });
      setSelectedTags([]);
      navigate(`/comm/groups/${newGroup.id}`);
    } catch (err: any) {
      console.error('[CreateGroup] error:', err);
      toast({ title: "Error", description: err.message || "Could not create group.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Create New Group
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Group Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Group Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Morning Runners, Healthy Cooking Club"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe your group's purpose and activities..."
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fitness">Fitness & Exercise</SelectItem>
                      <SelectItem value="nutrition">Nutrition & Diet</SelectItem>
                      <SelectItem value="mental-health">Mental Health</SelectItem>
                      <SelectItem value="support">Support Groups</SelectItem>
                      <SelectItem value="learning">Learning & Education</SelectItem>
                      <SelectItem value="social">Social & Community</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="privacy">Privacy</Label>
                  <Select value={formData.privacy} onValueChange={(value) => setFormData({...formData, privacy: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          Public
                        </div>
                      </SelectItem>
                      <SelectItem value="private">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4" />
                          Private
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {availableTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant={selectedTags.includes(tag) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handleTagToggle(tag)}
                    >
                      {tag}
                      {selectedTags.includes(tag) && <X className="w-3 h-3 ml-1" />}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Location & Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Virtual Group</Label>
                  <p className="text-sm text-muted-foreground">This group meets online</p>
                </div>
                <Switch 
                  checked={formData.isVirtual}
                  onCheckedChange={(checked) => setFormData({...formData, isVirtual: checked})}
                />
              </div>

              {!formData.isVirtual && (
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    placeholder="e.g., Downtown Area, Central Park"
                    className="mt-1"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="rules">Group Rules (Optional)</Label>
                <Textarea
                  id="rules"
                  value={formData.rules}
                  onChange={(e) => setFormData({...formData, rules: e.target.value})}
                  placeholder="Set guidelines for group members..."
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Group'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
