import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { useCampaigns, type Campaign } from "@/hooks/useCampaigns";
import { useChannels } from "@/hooks/useChannels";
import { useProfile } from "@/context/ProfileProvider";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, CheckCircle, AlertCircle } from "lucide-react";
import { DISTRIBUTION_TEMPLATES, CHANNEL_BEST_TIMES, CHANNEL_INFO } from "@/lib/campaign-templates";

interface CampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCampaign?: Campaign | null;
}

export function CampaignDialog({ open, onOpenChange, editingCampaign }: CampaignDialogProps) {
  const { createCampaign, updateCampaign } = useCampaigns();
  const { channels } = useChannels();
  const { profile } = useProfile();
  
  // Form state
  const [step, setStep] = useState(1);
  const [name, setName] = useState(editingCampaign?.name || "");
  const [description, setDescription] = useState(editingCampaign?.description || "");
  const [selectedChannels, setSelectedChannels] = useState<Record<string, boolean>>(
    (editingCampaign?.target_channels as Record<string, boolean>) || {}
  );
  const [selectedTemplate, setSelectedTemplate] = useState(
    ((editingCampaign?.distribution_config as any)?.template_id as string) || "custom"
  );
  const [smartSchedulingEnabled, setSmartSchedulingEnabled] = useState(
    ((editingCampaign?.distribution_config as any)?.smart_scheduling_enabled as boolean) ?? true
  );

  useEffect(() => {
    if (!open) return;
    if (editingCampaign) {
      setName(editingCampaign.name || "");
      setDescription(editingCampaign.description || "");
      setSelectedChannels((editingCampaign.target_channels as Record<string, boolean>) || {});
      setSelectedTemplate(((editingCampaign.distribution_config as any)?.template_id as string) || "custom");
      setSmartSchedulingEnabled(((editingCampaign.distribution_config as any)?.smart_scheduling_enabled as boolean) ?? true);
      setStep(1);
    } else {
      setName("");
      setDescription("");
      setSelectedChannels({});
      setSelectedTemplate("custom");
      setSmartSchedulingEnabled(true);
      setStep(1);
    }
  }, [open, editingCampaign]);

  const isEditMode = !!editingCampaign;
  const totalSteps = 4;

  const handleClose = () => {
    setStep(1);
    setName("");
    setDescription("");
    setSelectedChannels({});
    setSelectedTemplate("custom");
    setSmartSchedulingEnabled(true);
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const template = DISTRIBUTION_TEMPLATES.find(t => t.id === selectedTemplate);
    
    const campaignData = {
      user_id: user.id,
      name,
      description,
      status: "draft",
      target_channels: selectedChannels,
      distribution_config: {
        template_id: selectedTemplate,
        frequency: template?.frequency || "custom",
        smart_scheduling_enabled: smartSchedulingEnabled,
        best_times: Object.keys(selectedChannels)
          .filter(ch => selectedChannels[ch])
          .reduce((acc, ch) => {
            acc[ch] = CHANNEL_BEST_TIMES[ch] || [];
            return acc;
          }, {} as Record<string, string[]>),
      },
    };

    if (isEditMode) {
      await updateCampaign.mutateAsync({
        id: editingCampaign.id,
        ...campaignData,
      });
    } else {
      await createCampaign.mutateAsync(campaignData);
    }

    handleClose();
  };

  const toggleChannel = (channelKey: string) => {
    setSelectedChannels(prev => ({
      ...prev,
      [channelKey]: !prev[channelKey],
    }));
  };

  const selectAllChannels = () => {
    const allSelected = Object.keys(CHANNEL_INFO).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {} as Record<string, boolean>);
    setSelectedChannels(allSelected);
  };

  const deselectAllChannels = () => {
    setSelectedChannels({});
  };

  const applyTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = DISTRIBUTION_TEMPLATES.find(t => t.id === templateId);
    if (template && template.suggestedChannels.length > 0) {
      const channels = template.suggestedChannels.reduce((acc, ch) => {
        acc[ch] = true;
        return acc;
      }, {} as Record<string, boolean>);
      setSelectedChannels(channels);
    }
  };

  const canProceed = () => {
    if (step === 1) return name.trim() !== "";
    if (step === 2) return Object.values(selectedChannels).some(v => v);
    if (step === 3) return selectedTemplate !== "";
    return true;
  };

  const getChannelConnectionStatus = (channelKey: string) => {
    // Check profiles table for social media URLs (matches Social Presence logic)
    if (profile) {
      switch(channelKey.toLowerCase()) {
        case 'linkedin': return !!profile.linkedin_url;
        case 'instagram': return !!profile.instagram_url;
        case 'facebook': return !!profile.facebook_url;
        case 'twitter': 
        case 'x': return !!profile.x_url;
        case 'youtube': return !!profile.youtube_url;
        case 'tiktok': return !!profile.tiktok_url;
      }
    }
    
    // Fall back to distribution_channels table for other channels (email, SMS, etc.)
    const channel = channels?.find(c => 
      c.channel_type?.toLowerCase() === channelKey || 
      c.channel_name?.toLowerCase() === channelKey
    );
    return channel?.is_connected || false;
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (isOpen) { onOpenChange(true); } else { handleClose(); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Campaign" : "Create New Campaign"}
          </DialogTitle>
          <div className="flex items-center gap-2 mt-4">
            {Array.from({ length: totalSteps }).map((_, i) => {
              const current = i + 1;
              const isActive = current <= step;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setStep(current)}
                  className={`h-2 flex-1 rounded-full transition-colors focus:outline-none ${isActive ? "bg-primary" : "bg-muted"}`}
                  aria-label={`Go to step ${current}`}
                  title={`Go to step ${current}`}
                />
              );
            })}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Step {step} of {totalSteps}
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Campaign Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Summer Launch 2025"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your campaign goals..."
                  rows={4}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* Step 2: Channel Selection */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={selectAllChannels}>
                  Select All
                </Button>
                <Button size="sm" variant="outline" onClick={deselectAllChannels}>
                  Deselect All
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(CHANNEL_INFO).map(([key, info]) => {
                  const isConnected = getChannelConnectionStatus(key);
                  return (
                    <div
                      key={key}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedChannels[key] ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                      }`}
                      onClick={() => toggleChannel(key)}
                    >
                      <Checkbox
                        checked={selectedChannels[key] || false}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{info.name}</span>
                          {isConnected ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-yellow-500" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {isConnected ? "Connected" : "Not connected"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Distribution Strategy */}
          {step === 3 && (
            <div className="space-y-4">
              <Label>Choose a Template</Label>
              <RadioGroup value={selectedTemplate} onValueChange={applyTemplate}>
                {DISTRIBUTION_TEMPLATES.map((template) => (
                  <div
                    key={template.id}
                    className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedTemplate === template.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                    }`}
                    onClick={() => applyTemplate(template.id)}
                  >
                    <RadioGroupItem value={template.id} id={template.id} />
                    <div className="flex-1">
                      <Label htmlFor={template.id} className="cursor-pointer">
                        <span className="text-xl mr-2">{template.icon}</span>
                        <span className="font-semibold">{template.name}</span>
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {template.description}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline">{template.frequency}</Badge>
                        <Badge variant="outline">{template.duration}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Best for: {template.bestFor}
                      </p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Step 4: Smart Scheduling */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label>AI-Powered Smart Scheduling</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Automatically suggest best posting times based on channel analytics
                  </p>
                </div>
                <Switch
                  checked={smartSchedulingEnabled}
                  onCheckedChange={setSmartSchedulingEnabled}
                />
              </div>

              {smartSchedulingEnabled && (
                <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm font-medium">Suggested Best Times</p>
                  {Object.entries(selectedChannels)
                    .filter(([_, selected]) => selected)
                    .map(([channelKey]) => {
                      const times = CHANNEL_BEST_TIMES[channelKey] || [];
                      const channelName = CHANNEL_INFO[channelKey]?.name || channelKey;
                      return (
                        <div key={channelKey} className="flex items-center justify-between">
                          <span className="text-sm">{channelName}:</span>
                          <span className="text-sm text-muted-foreground">
                            {times.join(", ")}
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}

              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm">
                  ✨ Posts will be created as <strong>drafts</strong> and require manual approval before publishing.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between gap-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => step === 1 ? handleClose() : setStep(step - 1)}
          >
            {step === 1 ? "Cancel" : (
              <>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </>
            )}
          </Button>
          
          {step < totalSteps ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={createCampaign.isPending || updateCampaign.isPending || !canProceed()}
            >
              {createCampaign.isPending || updateCampaign.isPending
                ? isEditMode ? "Updating..." : "Creating..."
                : isEditMode ? "Update Campaign" : "Create Campaign"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
