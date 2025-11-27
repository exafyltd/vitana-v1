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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useCampaigns, type Campaign } from "@/hooks/useCampaigns";
import { useChannels } from "@/hooks/useChannels";
import { useProfile } from "@/context/ProfileProvider";
import { supabase } from "@/integrations/supabase/client";
import { 
  ChevronLeft, ChevronRight, CheckCircle, AlertCircle, 
  Settings, Target, Eye, Link2, Lightbulb, 
  Share2, MessageSquare, Home, Info, Moon,
  ShieldCheck, Rocket, X, Sparkles, Calendar
} from "lucide-react";
import { DISTRIBUTION_TEMPLATES, CHANNEL_BEST_TIMES, CHANNEL_INFO } from "@/lib/campaign-templates";
import { EnhancedStepIndicator } from "./EnhancedStepIndicator";
import { CampaignCreationHeader } from "./CampaignCreationHeader";
import { CampaignSuccessModal } from "./CampaignSuccessModal";
import { InlineChannelConnector } from "./InlineChannelConnector";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";
import { toast } from "sonner";

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

  // Step 1 additions
  const [goal, setGoal] = useState("");
  const [linkedSource, setLinkedSource] = useState<any>(null);
  const [lastSaved, setLastSaved] = useState(new Date());

  // Step 3 additions (custom template)
  const [customFrequency, setCustomFrequency] = useState("weekly");
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();
  const [aiAssistEnabled, setAiAssistEnabled] = useState(false);

  // Step 4 additions
  const [timezone, setTimezone] = useState("America/New_York");
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(true);

  // Success modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdCampaignData, setCreatedCampaignData] = useState<any>(null);

  // Channel connection modal
  const [connectingChannel, setConnectingChannel] = useState<string | null>(null);
  const [showConnectDialog, setShowConnectDialog] = useState(false);

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
        frequency: template?.frequency || customFrequency,
        smart_scheduling_enabled: smartSchedulingEnabled,
        goal,
        timezone,
        quiet_hours_enabled: quietHoursEnabled,
        ai_assist_enabled: aiAssistEnabled,
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
      handleClose();
    } else {
      await createCampaign.mutateAsync(campaignData);
      
      // Show success modal
      setCreatedCampaignData({
        name,
        channels: Object.entries(selectedChannels)
          .filter(([_, selected]) => selected)
          .map(([key]) => CHANNEL_INFO[key]?.name || key),
        template: DISTRIBUTION_TEMPLATES.find(t => t.id === selectedTemplate)?.name || "Custom",
        firstPostDate: customStartDate || addDays(new Date(), 1)
      });
      setShowSuccessModal(true);
      handleClose();
    }
  };

  // Helper function: Extract handle from URL
  const extractHandle = (url: string): string => {
    if (!url) return "";
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com\/in\/|instagram\.com\/|facebook\.com\/|twitter\.com\/|x\.com\/)([\w-]+)/);
    return match ? match[1] : url.split('/').pop() || url;
  };

  // Helper function: Get schedule summary
  const getScheduleSummary = (): string => {
    const t = DISTRIBUTION_TEMPLATES.find(t => t.id === selectedTemplate);
    const channelCount = Object.values(selectedChannels).filter(Boolean).length;
    
    if (!t) return "Custom schedule";
    
    return `Posting ${t.frequency} on ${channelCount} channel${channelCount !== 1 ? 's' : ''}${customStartDate ? ` starting ${format(customStartDate, "MMM d")}` : ''}`;
  };

  // Helper function: Handle channel connection
  const handleConnectChannel = (channelKey: string) => {
    setConnectingChannel(channelKey);
    setShowConnectDialog(true);
  };

  const handleChannelConnected = () => {
    if (connectingChannel) {
      // Auto-select the newly connected channel
      setSelectedChannels(prev => ({
        ...prev,
        [connectingChannel]: true,
      }));
    }
    setConnectingChannel(null);
    setShowConnectDialog(false);
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
    <>
      <Dialog open={open} onOpenChange={(isOpen) => { if (isOpen) { onOpenChange(true); } else { handleClose(); } }}>
        <DialogContent className={cn(
          "max-w-3xl overflow-hidden flex flex-col",
          "md:max-h-[90vh] md:rounded-2xl",
          "max-md:w-screen max-md:h-screen max-md:max-w-full max-md:rounded-none",
          "bg-gradient-to-br from-background/95 via-background to-background backdrop-blur-xl border-2 shadow-2xl"
        )}>
          <DialogHeader>
            <DialogTitle className="sr-only">
              {isEditMode ? "Edit Campaign" : "Create New Campaign"}
            </DialogTitle>
          </DialogHeader>

          {/* 3-Card Header */}
          <CampaignCreationHeader 
            currentStep={step} 
            draftsCount={0} 
            liveCount={0} 
          />

          {/* Enhanced Step Indicator */}
          <EnhancedStepIndicator 
            currentStep={step}
            onStepClick={(s) => s <= step && setStep(s)}
          />

          <div className="flex-1 overflow-y-auto px-1">
            <div className="space-y-6 py-4">
              {/* Step 1: Basic Info - Enhanced */}
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
                      placeholder="e.g., Multi-channel promotion for our new product launch targeting millennials"
                      rows={4}
                      className="mt-1"
                    />
                    <div className="flex items-start gap-2 mt-2 p-3 bg-[hsl(var(--sys-ai-tint))] border border-[hsl(var(--sys-ai-accent))]/20 rounded-lg">
                      <Lightbulb className="w-4 h-4 text-[hsl(var(--sys-ai-accent))] shrink-0 mt-0.5" />
                      <p className="text-xs text-foreground">
                        <strong>Tip:</strong> Describe your campaign in one sentence — who it's for and what success looks like.
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="goal">Campaign Goal (Optional)</Label>
                    <Select value={goal} onValueChange={setGoal}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select campaign goal..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="awareness">🎯 Awareness</SelectItem>
                        <SelectItem value="engagement">💬 Engagement</SelectItem>
                        <SelectItem value="event_promotion">📅 Event Promotion</SelectItem>
                        <SelectItem value="community_growth">🌱 Community Growth</SelectItem>
                        <SelectItem value="sales">💰 Sales</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Helps Autopilot optimize your posting strategy
                    </p>
                  </div>
                </div>
              )}

              {/* Step 2: Channel Selection - Enhanced */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label>Select Distribution Channels</Label>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={selectAllChannels}>
                        Select All
                      </Button>
                      <Button variant="ghost" size="sm" onClick={deselectAllChannels}>
                        Clear
                      </Button>
                    </div>
                  </div>

                  {/* Social Media Group */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-2 py-1 bg-muted rounded">
                      <Share2 className="w-4 h-4 text-muted-foreground" />
                      <h4 className="text-sm font-semibold text-foreground">Social Media</h4>
                    </div>
                    <div className="grid gap-3 pl-4">
                      {['linkedin', 'instagram', 'facebook', 'twitter', 'youtube', 'tiktok'].map((key) => {
                        const info = CHANNEL_INFO[key];
                        const isConnected = getChannelConnectionStatus(key);
                        const isSelected = selectedChannels[key];
                        
                        return (
                          <div
                            key={key}
                            className={cn(
                              "flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all duration-200",
                              isSelected 
                                ? "border-[hsl(var(--gradient-join-start))] bg-gradient-to-br from-[hsl(var(--pill-nutrition-tint))] to-[hsl(var(--pill-hydration-tint))] shadow-md" 
                                : "border-border hover:border-muted-foreground/50 hover:bg-muted/50"
                            )}
                            onClick={() => toggleChannel(key)}
                          >
                            <Checkbox checked={isSelected} />
                            
                            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white", info.color)}>
                              <span className="font-bold">{info.name.charAt(0)}</span>
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{info.name}</span>
                                {isConnected ? (
                                  <div className="flex items-center gap-1 px-2 py-0.5 bg-[hsl(var(--pill-nutrition-accent))]/10 rounded-full">
                                    <div className="w-2 h-2 rounded-full bg-[hsl(var(--pill-nutrition-accent))]" />
                                    <span className="text-xs text-[hsl(var(--pill-nutrition-accent))]">Connected</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 px-2 py-0.5 bg-[hsl(var(--sys-autopilot-accent))]/10 rounded-full">
                                    <AlertCircle className="w-3 h-3 text-[hsl(var(--sys-autopilot-accent))]" />
                                    <span className="text-xs text-[hsl(var(--sys-autopilot-accent))]">Not connected</span>
                                  </div>
                                )}
                              </div>
                              
                              {!isConnected && (
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="h-auto p-0 text-xs text-[hsl(var(--pill-hydration-accent))] hover:text-[hsl(var(--pill-hydration-accent))]/80"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleConnectChannel(key);
                                  }}
                                >
                                  Connect now →
                                </Button>
                              )}
                              
                              {isConnected && profile?.[`${key}_url` as keyof typeof profile] && (
                                <p className="text-xs text-muted-foreground truncate">
                                  @{extractHandle(String(profile[`${key}_url` as keyof typeof profile] || ''))}
                                </p>
                              )}
                            </div>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p className="text-xs">
                                    Connect to schedule posts automatically
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Messaging Group */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-2 py-1 bg-muted rounded">
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                      <h4 className="text-sm font-semibold text-foreground">Direct Messaging</h4>
                    </div>
                    <div className="grid gap-3 pl-4">
                      {['email', 'sms', 'whatsapp'].map((key) => {
                        const info = CHANNEL_INFO[key];
                        const isConnected = getChannelConnectionStatus(key);
                        const isSelected = selectedChannels[key];
                        
                        return (
                          <div
                            key={key}
                            className={cn(
                              "flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all duration-200",
                              isSelected 
                                ? "border-[hsl(var(--gradient-join-start))] bg-gradient-to-br from-[hsl(var(--pill-nutrition-tint))] to-[hsl(var(--pill-hydration-tint))] shadow-md" 
                                : "border-border hover:border-muted-foreground/50 hover:bg-muted/50"
                            )}
                            onClick={() => toggleChannel(key)}
                          >
                            <Checkbox checked={isSelected} />
                            
                            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white", info.color)}>
                              <span className="font-bold">{info.name.charAt(0)}</span>
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{info.name}</span>
                                {isConnected ? (
                                  <div className="flex items-center gap-1 px-2 py-0.5 bg-[hsl(var(--pill-nutrition-accent))]/10 rounded-full">
                                    <div className="w-2 h-2 rounded-full bg-[hsl(var(--pill-nutrition-accent))]" />
                                    <span className="text-xs text-[hsl(var(--pill-nutrition-accent))]">Connected</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 px-2 py-0.5 bg-[hsl(var(--sys-autopilot-accent))]/10 rounded-full">
                                    <AlertCircle className="w-3 h-3 text-[hsl(var(--sys-autopilot-accent))]" />
                                    <span className="text-xs text-[hsl(var(--sys-autopilot-accent))]">Not connected</span>
                                  </div>
                                )}
                              </div>
                              
                              {!isConnected && (
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="h-auto p-0 text-xs text-[hsl(var(--pill-hydration-accent))] hover:text-[hsl(var(--pill-hydration-accent))]/80"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleConnectChannel(key);
                                  }}
                                >
                                  Connect now →
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Email/SMS Consent Warning */}
                  {(selectedChannels.email || selectedChannels.sms) && (
                    <Alert className="bg-[hsl(var(--sys-ai-tint))] border-[hsl(var(--sys-ai-accent))]/30">
                      <AlertCircle className="w-4 h-4 text-[hsl(var(--sys-ai-accent))]" />
                      <AlertTitle className="text-foreground">Consent Required</AlertTitle>
                      <AlertDescription className="text-muted-foreground text-sm">
                        Some audience members may not have given promotional consent for{" "}
                        {selectedChannels.email && selectedChannels.sms ? "email and SMS" : selectedChannels.email ? "email" : "SMS"}.
                        <Button variant="link" className="h-auto p-0 ml-1 text-foreground underline">
                          Request consent →
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {/* Step 3: Template Selection - Enhanced */}
              {step === 3 && (
                <div className="space-y-4">
                  <Label className="text-lg font-semibold">Choose Your Campaign Template</Label>
                  <RadioGroup value={selectedTemplate} onValueChange={applyTemplate}>
                    {DISTRIBUTION_TEMPLATES.map((template) => (
                      <div
                        key={template.id}
                        className={cn(
                          "flex items-start gap-4 p-5 border-2 rounded-xl cursor-pointer transition-all duration-200",
                          selectedTemplate === template.id 
                            ? "border-[hsl(var(--gradient-join-start))] bg-gradient-to-br from-[hsl(var(--pill-nutrition-tint))] to-[hsl(var(--pill-hydration-tint))] shadow-lg ring-2 ring-[hsl(var(--gradient-join-start))]/20" 
                            : "border-border hover:border-muted-foreground/50 hover:bg-muted/50 hover:shadow-md"
                        )}
                        onClick={() => applyTemplate(template.id)}
                      >
                        <RadioGroupItem value={template.id} id={template.id} className="mt-1" />
                        <div className="flex-1">
                          <Label htmlFor={template.id} className="cursor-pointer">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-3xl">{template.icon}</span>
                              <span className="text-lg font-bold">{template.name}</span>
                            </div>
                          </Label>
                          <p className="text-sm text-foreground/80 mb-3">
                            {template.description}
                          </p>
                          <div className="flex flex-wrap gap-2 mb-3">
                            <Badge variant="secondary" className="text-xs">
                              📊 {template.frequency}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              ⏱️ {template.duration}</Badge>
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
          </div>

          <div className="flex justify-between gap-3 pt-6 border-t-2 px-1">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => step === 1 ? handleClose() : setStep(step - 1)}
              className="min-w-[120px]"
            >
              {step === 1 ? (
                <>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </>
              ) : (
                <>
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </>
              )}
            </Button>
            
            {step < totalSteps ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                size="lg"
                className="min-w-[160px] bg-gradient-to-r from-[hsl(var(--gradient-join-start))] to-[hsl(var(--gradient-join-end))] hover:shadow-lg transition-all"
              >
                Continue
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={createCampaign.isPending || updateCampaign.isPending || !canProceed()}
                size="lg"
                className="min-w-[180px] bg-gradient-to-r from-[hsl(var(--gradient-join-start))] to-[hsl(var(--gradient-join-end))] hover:shadow-xl transition-all"
              >
                {createCampaign.isPending || updateCampaign.isPending
                  ? (isEditMode ? "Updating..." : "Creating Campaign...")
                  : (isEditMode ? "Update Campaign" : "Create Campaign")}
                <Rocket className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CampaignSuccessModal 
        open={showSuccessModal}
        onOpenChange={setShowSuccessModal}
        campaign={createdCampaignData || { name: '', channels: [], template: '', firstPostDate: new Date() }}
      />

      <InlineChannelConnector
        open={showConnectDialog}
        onOpenChange={setShowConnectDialog}
        channelKey={connectingChannel || ''}
        onConnected={handleChannelConnected}
      />
    </>
  );
}
