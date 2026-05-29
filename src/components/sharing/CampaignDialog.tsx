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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useCampaigns, type Campaign } from "@/hooks/useCampaigns";
import { useCampaignActions } from "@/hooks/useCampaignActions";
import { useChannels } from "@/hooks/useChannels";
import { useProfile } from "@/context/ProfileProvider";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { 
  ChevronLeft, ChevronRight, CheckCircle, AlertCircle, 
  Settings, Target, Eye, Link2, Lightbulb, 
  Share2, MessageSquare, Home, Info, Moon,
  ShieldCheck, Rocket, X, Sparkles, Calendar, ChevronDown, Image
} from "lucide-react";
import { DISTRIBUTION_TEMPLATES, CHANNEL_BEST_TIMES, CHANNEL_INFO } from "@/lib/campaign-templates";
import { EnhancedStepIndicator } from "./EnhancedStepIndicator";
import { CampaignCreationHeader } from "./CampaignCreationHeader";
import { CampaignSuccessModal } from "./CampaignSuccessModal";
import { InlineChannelConnector } from "./InlineChannelConnector";
import { ManualShareActions } from "./ManualShareActions";
import type { AudienceData } from "@/types/audience";
import { AudienceSelector } from "./AudienceSelector";
import { cn } from "@/lib/utils";
import { addDays } from 'date-fns';
import { notifyError, notifySuccess, t } from '@/lib/i18n-toast';

import { formatDate } from '@/lib/locale-format';
interface CampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCampaign?: Campaign | null;
  prefillData?: {
    name?: string;
    description?: string;
    goal?: string;
    coverImage?: string;
    eventLink?: string;
    selectedChannels?: Record<string, boolean>;
    audienceData?: AudienceData;
    eventContext?: {
      eventId: string;
      creatorId: string;
      location?: string;
      eventType?: string;
    };
  };
}

export function CampaignDialog({ open, onOpenChange, editingCampaign, prefillData }: CampaignDialogProps) {
  const { createCampaign, updateCampaign, activateCampaign } = useCampaigns();
  const { activateAllPosts } = useCampaignActions();
  const { channels } = useChannels();
  const { profile } = useProfile();
  const { tenant } = useTenant();
  
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
  
  // Audience selection state
  const [audienceData, setAudienceData] = useState<AudienceData>({});

  // Step 1 additions
  const [goal, setGoal] = useState("");
  const [linkedSource, setLinkedSource] = useState<any>(null);
  const [lastSaved, setLastSaved] = useState(new Date());
  
  // Cover image state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(
    prefillData?.coverImage || editingCampaign?.cover_image_url || null
  );
  const [uploadingImage, setUploadingImage] = useState(false);

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
  
  // Activation state
  const [isActivating, setIsActivating] = useState(false);
  
  // Advanced channels collapsible state
  const [showAdvancedChannels, setShowAdvancedChannels] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingCampaign) {
      setName(editingCampaign.name || "");
      setDescription(editingCampaign.description || "");
      setSelectedChannels((editingCampaign.target_channels as Record<string, boolean>) || {});
      setSelectedTemplate(((editingCampaign.distribution_config as any)?.template_id as string) || "custom");
      setSmartSchedulingEnabled(((editingCampaign.distribution_config as any)?.smart_scheduling_enabled as boolean) ?? true);
      setAudienceData((editingCampaign.distribution_config as any)?.audience_data || null);
      setImagePreviewUrl((editingCampaign as any).cover_image_url || null);
      setSelectedImage(null);
      setStep(1);
    } else if (prefillData) {
      // Pre-fill from event promotion
      setName(prefillData.name || "");
      setDescription(prefillData.description || "");
      setGoal(prefillData.goal || "event_promotion");
      setSelectedChannels(prefillData.selectedChannels || { email: true, sms: true, whatsapp: true });
      setAudienceData(prefillData.audienceData || {});
      setImagePreviewUrl(prefillData.coverImage || null);
      setSelectedImage(null);
      setSelectedTemplate("custom");
      setSmartSchedulingEnabled(true);
      setStep(1);
    } else {
      setName("");
      setDescription("");
      setSelectedChannels({});
      setSelectedTemplate("custom");
      setSmartSchedulingEnabled(true);
      setAudienceData({});
      setImagePreviewUrl(null);
      setSelectedImage(null);
      setStep(1);
    }
  }, [open, editingCampaign, prefillData]);

  const isEditMode = !!editingCampaign;
  const totalSteps = 4; // Fixed 4-step flow: Basics → Channels → Template → Schedule

  const handleClose = () => {
    setStep(1);
    setName("");
    setDescription("");
    setSelectedChannels({});
    setSelectedTemplate("custom");
    setSmartSchedulingEnabled(true);
    setAudienceData(null);
    setSelectedImage(null);
    setImagePreviewUrl(null);
    onOpenChange(false);
  };

  // Core save function that doesn't close the dialog - returns campaign ID
  const saveCampaignData = async (): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    let coverImageUrl: string | null = null;

    // Upload cover image if one was selected
    if (selectedImage) {
      setUploadingImage(true);
      try {
        const fileExt = selectedImage.name.split('.').pop();
        const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('campaign-images')
          .upload(fileName, selectedImage, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('campaign-images')
          .getPublicUrl(fileName);

        coverImageUrl = publicUrl;
      } catch (error) {
        console.error('Image upload failed:', error);
        notifyError('toasts.sharing.failedUploadImage');
        setUploadingImage(false);
        return null;
      } finally {
        setUploadingImage(false);
      }
    } else if (imagePreviewUrl) {
      // Use existing image URL (e.g., from event promotion or editing)
      coverImageUrl = imagePreviewUrl;
    }

    const template = DISTRIBUTION_TEMPLATES.find(t => t.id === selectedTemplate);
    
    const campaignData = {
      user_id: user.id,
      name,
      description,
      status: "draft",
      cover_image_url: coverImageUrl,
      target_channels: selectedChannels,
      metadata: {
        tenant_slug: tenant?.slug || null,
        event_id: prefillData?.eventContext?.eventId || null,
        event_type: prefillData?.eventContext?.eventType || null,
        event_location: prefillData?.eventContext?.location || null,
      },
      distribution_config: {
        template_id: selectedTemplate,
        frequency: template?.frequency || customFrequency,
        smart_scheduling_enabled: smartSchedulingEnabled,
        goal,
        timezone,
        quiet_hours_enabled: quietHoursEnabled,
        ai_assist_enabled: aiAssistEnabled,
        audience_data: audienceData as any, // Store audience selection
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
      return editingCampaign.id;
    } else {
      const result = await createCampaign.mutateAsync(campaignData);
      
      // Show success modal with campaign ID
      setCreatedCampaignData({
        id: result?.id || '', // Use returned ID from mutation
        name,
        description,
        coverImage: coverImageUrl,
        channels: Object.entries(selectedChannels)
          .filter(([_, selected]) => selected)
          .map(([key]) => CHANNEL_INFO[key]?.name || key),
        template: DISTRIBUTION_TEMPLATES.find(t => t.id === selectedTemplate)?.name || "Custom",
        firstPostDate: customStartDate || addDays(new Date(), 1)
      });
      setShowSuccessModal(true);
      return result?.id || null;
    }
  };

  // Standard submit - saves and closes
  const handleSubmit = async () => {
    const campaignId = await saveCampaignData();
    if (campaignId) {
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
    
    return `Posting ${t.frequency} on ${channelCount} channel${channelCount !== 1 ? 's' : ''}${customStartDate ? ` starting ${formatDate(customStartDate, "MMM d")}` : ''}`;
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

  const handleSaveAndActivate = async () => {
    if (!editingCampaign) return;
    setIsActivating(true);
    try {
      // Save the campaign without closing
      const campaignId = await saveCampaignData();
      if (!campaignId) {
        throw new Error("Failed to save campaign");
      }
      // Then activate the campaign
      await activateCampaign.mutateAsync(campaignId);
      // Also activate all draft posts if any
      try {
        await activateAllPosts.mutateAsync(campaignId);
      } catch {
        // No draft posts to activate is fine
      }
      notifySuccess('toasts.sharing.campaignSavedActivated');
      handleClose();
    } catch (error) {
      console.error('Activation failed:', error);
      notifyError('toasts.sharing.failedActivateCampaign');
    } finally {
      setIsActivating(false);
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
        <DialogContent 
          className={cn(
            "max-w-3xl overflow-hidden flex flex-col z-[60]",
            "md:max-h-[90vh] md:rounded-2xl",
            "max-md:w-screen max-md:h-screen max-md:max-w-full max-md:rounded-none",
            "bg-gradient-to-br from-background/95 via-background to-background backdrop-blur-xl border-2 shadow-2xl"
          )}
          overlayClassName="z-[60]"
        >
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
            totalSteps={totalSteps}
            onStepClick={(s) => s <= step && setStep(s)}
          />

          <div className="flex-1 overflow-y-auto px-1">
            <div className="space-y-6 py-4">
              {/* Step 1: Basic Info - Enhanced */}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">{t('screens.sharing.campaignName')}</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('screens.sharing.eGSummerLaunch2025')}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">{t('screens.sharing.description')}</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={t('screens.sharing.eGMultichannelPromotionForOur')}
                      rows={4}
                      className="mt-1"
                    />
                    <div className="flex items-start gap-2 mt-2 p-3 bg-[hsl(var(--sys-ai-tint))] border border-[hsl(var(--sys-ai-accent))]/20 rounded-lg">
                      <Lightbulb className="w-4 h-4 text-[hsl(var(--sys-ai-accent))] shrink-0 mt-0.5" />
                      <p className="text-xs text-foreground">
                        <strong>{t('screens.sharing.tip')}</strong>{t('screens.sharing.describeYourCampaignOneSentenceWho')}
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="goal">{t('screens.sharing.campaignGoalOptional')}</Label>
                    <Select value={goal} onValueChange={setGoal}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={t('screens.sharing.selectCampaignGoal')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="awareness">{t('screens.sharing.awareness')}</SelectItem>
                        <SelectItem value="engagement">{t('screens.sharing.engagement')}</SelectItem>
                        <SelectItem value="event_promotion">{t('screens.sharing.eventPromotion')}</SelectItem>
                        <SelectItem value="community_growth">{t('screens.sharing.communityGrowth')}</SelectItem>
                        <SelectItem value="sales">{t('screens.sharing.sales')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('screens.sharing.helpsAutopilotOptimizeYourPostingStrategy')}
                    </p>
                  </div>

                  {/* Cover Image Upload */}
                  <div>
                    <Label>{t('screens.sharing.coverImageOptional')}</Label>
                    <div className="mt-2">
                      {imagePreviewUrl ? (
                        <div className="relative">
                          <img 
                            src={imagePreviewUrl} 
                            alt={t('screens.sharing.campaignCoverPreview')} 
                            className="w-full h-48 object-cover rounded-lg border-2 border-border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={() => {
                              setSelectedImage(null);
                              setImagePreviewUrl(null);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div 
                          className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer"
                          onClick={() => document.getElementById('campaign-image-upload')?.click()}
                        >
                          <Image className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground mb-1">
                            {t('screens.sharing.clickUploadCampaignCoverImage')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t('screens.sharing.pngJpgWebpUp5mb')}
                          </p>
                        </div>
                      )}
                      <input
                        type="file"
                        id="campaign-image-upload"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (!file.type.startsWith('image/')) {
                              notifyError('toasts.sharing.pleaseSelectImageFile');
                              return;
                            }
                            if (file.size > 5 * 1024 * 1024) {
                              notifyError('toasts.sharing.imageMustSmallerThan5mb');
                              return;
                            }
                            setSelectedImage(file);
                            setImagePreviewUrl(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Channel Selection - Enhanced */}
              {step === 2 && (
                <div className="space-y-6">
                  {/* Section 1: Social Media (Auto-Post) */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
                      <Share2 className="w-5 h-5 text-primary" />
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-foreground">{t('screens.sharing.socialMediaAutopost')}</h3>
                        <p className="text-xs text-muted-foreground">{t('screens.sharing.connectYourAccountsAutopublishYourCampaign')}</p>
                      </div>
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
                                    <span className="text-xs text-[hsl(var(--pill-nutrition-accent))]">{t('screens.sharing.connected')}</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 px-2 py-0.5 bg-[hsl(var(--sys-autopilot-accent))]/10 rounded-full">
                                    <AlertCircle className="w-3 h-3 text-[hsl(var(--sys-autopilot-accent))]" />
                                    <span className="text-xs text-[hsl(var(--sys-autopilot-accent))]">{t('screens.sharing.notConnected')}</span>
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
                                >{t('screens.sharing.connectNow')}
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
                                    {t('screens.sharing.connectSchedulePostsAutomatically')}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Section 2: Advanced Messaging (Business API) - Collapsed */}
                  <Collapsible open={showAdvancedChannels} onOpenChange={setShowAdvancedChannels}>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full flex items-center justify-between p-3 h-auto hover:bg-muted/50 rounded-lg border border-dashed"
                      >
                        <div className="flex items-center gap-2">
                          <Settings className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{t('screens.sharing.advancedBroadcastChannelsBusinessApi')}</span>
                        </div>
                        <ChevronDown className={cn(
                          "w-4 h-4 text-muted-foreground transition-transform duration-200",
                          showAdvancedChannels && "rotate-180"
                        )} />
                      </Button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="space-y-3 pt-3">
                      <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">{t('screens.sharing.forAutomatedBulkSendingViaTwilio')}
                        </AlertDescription>
                      </Alert>

                      <div className="grid gap-3">
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
                                      <span className="text-xs text-[hsl(var(--pill-nutrition-accent))]">{t('screens.sharing.connected')}</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1 px-2 py-0.5 bg-[hsl(var(--sys-autopilot-accent))]/10 rounded-full">
                                      <AlertCircle className="w-3 h-3 text-[hsl(var(--sys-autopilot-accent))]" />
                                      <span className="text-xs text-[hsl(var(--sys-autopilot-accent))]">{t('screens.sharing.notConnected')}</span>
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
                                  >{t('screens.sharing.connectNow')}
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Email/SMS Consent Warning */}
                      {(selectedChannels.email || selectedChannels.sms) && (
                        <Alert className="bg-[hsl(var(--sys-ai-tint))] border-[hsl(var(--sys-ai-accent))]/30">
                          <AlertCircle className="w-4 h-4 text-[hsl(var(--sys-ai-accent))]" />
                          <AlertTitle className="text-foreground">{t('screens.sharing.consentRequired')}</AlertTitle>
                          <AlertDescription className="text-muted-foreground text-sm">{t('screens.sharing.someAudienceMembersMayNotHave', { value0: " ", value1: selectedChannels.email && selectedChannels.sms ? "email and SMS" : selectedChannels.email ? "email" : "SMS" })}
                            <Button variant="link" className="h-auto p-0 ml-1 text-foreground underline">
                              {t('screens.sharing.requestConsent')}
                            </Button>
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Inline Audience Selection when Business API channels selected */}
                      {(selectedChannels.email || selectedChannels.sms || selectedChannels.whatsapp) && (
                        <div className="pt-4 border-t border-border mt-4">
                          <AudienceSelector
                            audienceData={audienceData}
                            onAudienceChange={setAudienceData}
                            selectedChannels={Object.entries(selectedChannels)
                              .filter(([key, val]) => val && ['email', 'sms', 'whatsapp'].includes(key))
                              .map(([key]) => key)}
                            eventContext={prefillData?.eventContext}
                          />
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Section 3: Direct Messaging (Personal Share) - Preview */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg border border-border">
                      <MessageSquare className="w-5 h-5 text-muted-foreground" />
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-foreground">{t('screens.sharing.directMessagingPersonalShare')}</h3>
                        <p className="text-xs text-muted-foreground">{t('screens.sharing.availableAfterYouCreateCampaignVia')}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pl-4">
                      {['WhatsApp', 'Viber', 'Email', 'SMS', 'Copy Link'].map((channel) => (
                        <div
                          key={channel}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-dashed border-border"
                        >
                          <span className="text-xs text-muted-foreground">{channel}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground pl-4">
                      {t('screens.sharing.opensYourPersonalAppsShareWith')}
                    </p>
                  </div>
                </div>
              )}

              {/* Step 3: Template Selection */}
              {step === 3 && (
                <div className="space-y-4">
                  <Label className="text-lg font-semibold">{t('screens.sharing.chooseYourCampaignTemplate')}</Label>
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
                      <p className="text-xs text-muted-foreground mt-2">{t('screens.sharing.bestForBestfor', { bestFor: template.bestFor })}</p>
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
                  <Label>{t('screens.sharing.aipoweredSmartScheduling')}</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('screens.sharing.automaticallySuggestBestPostingTimesBased')}
                  </p>
                </div>
                <Switch
                  checked={smartSchedulingEnabled}
                  onCheckedChange={setSmartSchedulingEnabled}
                />
              </div>

              {smartSchedulingEnabled && (
                <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm font-medium">{t('screens.sharing.suggestedBestTimes')}</p>
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

              {!smartSchedulingEnabled && (
                <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="space-y-2 text-sm">
                      <p className="font-medium">{t('screens.sharing.postsWillSavedAsDrafts')}</p>
                      <p className="text-muted-foreground">{t('screens.sharing.afterCreatingCampaignYouCanReview')}
                      </p>
                      <p className="text-xs text-muted-foreground/80">
                        {t('screens.sharing.go')} <span className="font-medium">{t('screens.sharing.campaignsYourCampaign')}</span>{t('screens.sharing.managePosts')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm">
                  {t('screens.sharing.postsWillCreatedAs')} <strong>{t('screens.sharing.drafts')}</strong>{t('screens.sharing.requireManualApprovalBeforePublishing')}
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
                  <X className="w-4 h-4 mr-2" />{t('screens.sharing.cancel')}
                </>
              ) : (
                <>
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  {t('screens.sharing.back')}
                </>
              )}
            </Button>
            
            {step < totalSteps ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                size="lg"
                className="min-w-[160px] bg-gradient-to-r from-[hsl(var(--gradient-join-start))] to-[hsl(var(--gradient-join-end))] hover:shadow-lg transition-all"
              >{t('screens.sharing.continue')}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <>
                {/* Editing a DRAFT campaign - show both options */}
                {isEditMode && editingCampaign?.status === "draft" ? (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSubmit}
                      variant="outline"
                      disabled={updateCampaign.isPending || isActivating || !canProceed()}
                      size="lg"
                      className="min-w-[120px]"
                    >
                      {updateCampaign.isPending ? "Saving..." : "Save Draft"}
                    </Button>
                    <Button
                      onClick={handleSaveAndActivate}
                      disabled={updateCampaign.isPending || isActivating || !canProceed()}
                      size="lg"
                      className="min-w-[180px] bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600 text-white hover:shadow-xl transition-all"
                    >
                      {isActivating ? "Activating..." : "Save & Activate"}
                      <Rocket className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                ) : (
                  /* New campaign or editing non-draft - current behavior */
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
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CampaignSuccessModal 
        open={showSuccessModal}
        onOpenChange={setShowSuccessModal}
        campaign={createdCampaignData || { 
          id: '', 
          name: '', 
          channels: [], 
          template: '', 
          firstPostDate: new Date(),
          description: '',
          coverImage: ''
        }}
        smartSchedulingEnabled={smartSchedulingEnabled}
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
