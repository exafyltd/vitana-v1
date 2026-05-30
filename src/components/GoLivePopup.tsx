import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, Upload as UploadIcon, ChevronDown, ChevronUp, Mic, Video, Users, Clock, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/hooks/useTranslation";
import { useI18nNotify } from "@/hooks/useI18nNotify";
import { applyReplacements } from "@/lib/i18n-helpers";
import { useMyRoom, useCreateSession } from "@/hooks/useMyRoom";

import { formatDate } from '@/lib/locale-format';
interface GoLivePopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTitle?: string;
  onCreated?: (roomId: string) => void;
  permanentRoomId?: string;
}

// Stable tag IDs mapped to translation keys
const TAG_IDS = [
  "wellness", "nutrition", "fitness", "mentalHealth", "longevity", 
  "meditation", "sleep", "motivation", "education", "lifestyle"
] as const;

type TagId = typeof TAG_IDS[number];

// Access level IDs (stable internal values)
const ACCESS_LEVEL_IDS = ["public", "followers", "group"] as const;
type AccessLevelId = typeof ACCESS_LEVEL_IDS[number];

export function GoLivePopup({ open, onOpenChange, defaultTitle = "", onCreated, permanentRoomId }: GoLivePopupProps) {
  const navigate = useNavigate();
  const { translate } = useTranslation();
  const { notify } = useI18nNotify();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Helper for popup translations
  const t = (key: string, fallback?: string) => translate(`liveRooms.goLivePopup.${key}`, fallback);
  
  const [title, setTitle] = useState(defaultTitle || "Live with [Name]");
  const [description, setDescription] = useState("");
  const [streamType, setStreamType] = useState<"audio" | "video" | "">("");
  const [selectedTags, setSelectedTags] = useState<TagId[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [coHostInput, setCoHostInput] = useState("");
  const [accessLevel, setAccessLevel] = useState<AccessLevelId>("public");
  const [scheduleDate, setScheduleDate] = useState<Date>();
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [enableChat, setEnableChat] = useState(true);
  const [enablePolls, setEnablePolls] = useState(false);
  const [enableRecording, setEnableRecording] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  // Fetch user's permanent room if not passed as prop
  const { data: myRoomData, error: myRoomError } = useMyRoom();
  
  // Fallback: fetch live_room_id directly from Supabase if gateway fails
  // If no room exists, auto-provision one
  const [fallbackRoomId, setFallbackRoomId] = useState<string | null>(null);
  useEffect(() => {
    if (!permanentRoomId && !myRoomData?.room?.id && myRoomError && open) {
      console.warn('[GoLivePopup] Gateway /rooms/me failed, falling back to Supabase:', myRoomError);
      supabase.auth.getUser().then(async ({ data: { user: authUser } }) => {
        if (!authUser) return;

        // Check if user has a permanent room
        const { data: appUser } = await supabase
          .from('app_users')
          .select('live_room_id, tenant_id')
          .eq('user_id', authUser.id)
          .maybeSingle();

        if (appUser?.live_room_id) {
          // User already has a room
          setFallbackRoomId(appUser.live_room_id);
        } else if (appUser?.tenant_id) {
          // User doesn't have a room - auto-provision one
          console.log('[GoLivePopup] Auto-provisioning permanent room for user:', authUser.id);

          try {
            // Insert new permanent room
            const { data: newRoom, error: insertError } = await supabase
              .from('live_rooms')
              .insert({
                tenant_id: appUser.tenant_id,
                host_user_id: authUser.id,
                title: 'My Live Room',
                status: 'idle',
                access_level: 'public',
                topic_keys: [],
                starts_at: new Date().toISOString(),
                host_present: false,
                metadata: {},
              })
              .select('id')
              .single();

            if (insertError) {
              console.error('[GoLivePopup] Failed to create permanent room:', insertError);
              return;
            }

            // Update app_users to reference the new room
            const { error: updateError } = await supabase
              .from('app_users')
              .update({ live_room_id: newRoom.id })
              .eq('user_id', authUser.id);

            if (updateError) {
              console.error('[GoLivePopup] Failed to update app_users:', updateError);
            }

            console.log('[GoLivePopup] Permanent room created:', newRoom.id);
            setFallbackRoomId(newRoom.id);
          } catch (error) {
            console.error('[GoLivePopup] Auto-provisioning failed:', error);
          }
        }
      });
    }
  }, [permanentRoomId, myRoomData, myRoomError, open]);
  
  const roomId = permanentRoomId || myRoomData?.room?.id || fallbackRoomId;
  
  const { mutateAsync: createSession } = useCreateSession();
  
  // Image upload states
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [autoGenerateImage, setAutoGenerateImage] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const isScheduled = !!scheduleDate && !!scheduleTime && new Date(`${formatDate(scheduleDate, 'yyyy-MM-dd')}T${scheduleTime}`) > new Date();

  const generateTimeOptions = () => {
    const times: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const h = hour.toString().padStart(2, '0');
        const m = minute.toString().padStart(2, '0');
        times.push(`${h}:${m}`);
      }
    }
    return times;
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        notify.error('liveRooms.goLivePopup.errors.invalidFileTypeTitle', 'liveRooms.goLivePopup.errors.invalidFileTypeDesc');
        return;
      }
      // Validate file size (2MB max)
      if (file.size > 2 * 1024 * 1024) {
        notify.error('liveRooms.goLivePopup.errors.fileTooLargeTitle', 'liveRooms.goLivePopup.errors.fileTooLargeDesc');
        return;
      }
      setSelectedImage(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setSelectedImage(null);
    setImagePreviewUrl("");
  };

  const handleTagToggle = (tag: TagId) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      }
      if (prev.length < 3) {
        return [...prev, tag];
      }
      return prev;
    });
  };

  const handleGoLive = async () => {
    if (!streamType) {
      notify.error('liveRooms.goLivePopup.errors.selectStreamTypeTitle', 'liveRooms.goLivePopup.errors.selectStreamTypeDesc');
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        notify.error('liveRooms.goLivePopup.errors.notLoggedInTitle', 'liveRooms.goLivePopup.errors.notLoggedInDesc');
        setIsLoading(false);
        return;
      }

      // Auto-provision permanent room if needed via Gateway API
      let effectiveRoomId = roomId;
      if (!effectiveRoomId) {
        console.log('[GoLivePopup] No roomId - creating permanent room via Gateway API');

        try {
          // Create permanent room through Gateway (proper state management)
          const newRoom = await import('@/services/liveRoomService').then(m =>
            m.liveRoomService.createRoom({
              title: `${user.email?.split('@')[0] || 'User'}'s Live Room`,
              topic_keys: [],
              access_level: 'public',
              metadata: {}
            })
          );

          effectiveRoomId = newRoom.id;
          setFallbackRoomId(effectiveRoomId);
          console.log('[GoLivePopup] Permanent room created via Gateway:', effectiveRoomId);
        } catch (createError: any) {
          console.error('[GoLivePopup] Failed to create permanent room via Gateway:', createError);
          notify.error('toasts.common.error', `Failed to create permanent room: ${createError.message}`);
          setIsLoading(false);
          return;
        }
      }

      // Upload cover image if selected
      let uploadedImageUrl: string | undefined;
      if (selectedImage) {
        try {
          const ext = selectedImage.name.split('.').pop() || 'jpg';
          const fileName = `live-${Date.now()}.${ext}`;
          const filePath = `${user.id}/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('covers')
            .upload(filePath, selectedImage, {
              upsert: true,
              contentType: selectedImage.type,
            });
            
          if (uploadError) throw uploadError;
          
          const { data: publicUrlData } = supabase.storage
            .from('covers')
            .getPublicUrl(filePath);
            
          uploadedImageUrl = publicUrlData.publicUrl;
        } catch (e) {
          console.error('Image upload failed:', e);
          notify.error('liveRooms.goLivePopup.errors.imageUploadFailedTitle', 'liveRooms.goLivePopup.errors.imageUploadFailedDesc');
        }
      }
      
      // Auto-generate image hint
      if (autoGenerateImage && !uploadedImageUrl) {
        notify.info('liveRooms.goLivePopup.success.aiImageHintTitle', 'liveRooms.goLivePopup.success.aiImageHintDesc');
      }
      
      // Create session on permanent room via gateway (CLEAN - Gateway API only)
      const scheduledIso = (scheduleDate && scheduleTime)
        ? new Date(`${formatDate(scheduleDate, 'yyyy-MM-dd')}T${scheduleTime}:00`).toISOString()
        : undefined;

      const sessionRequest = {
        session_title: title,
        topic_keys: selectedTags,
        starts_at: scheduledIso || new Date().toISOString(),
        access_level: accessLevel as 'public' | 'group',
        auto_admit: true,
        metadata: {
          description: description || undefined,
          stream_type: streamType,
          cover_image_url: uploadedImageUrl || undefined,
          enable_chat: enableChat,
          enable_polls: enablePolls,
          enable_recording: enableRecording,
        },
      };

      // Step 1: Create session via Gateway (with retry logic for stuck rooms)
      console.log('[GoLivePopup] Creating session via Gateway...', { roomId: effectiveRoomId });

      let sessionResult;
      try {
        sessionResult = await createSession({ roomId: effectiveRoomId, request: sessionRequest });
      } catch (firstError: any) {
        // If room is stuck in non-idle state, cancel existing session and retry
        if (firstError.message?.includes('409') || firstError.message?.includes('ROOM_NOT_IDLE') || firstError.message?.includes('conflict')) {
          console.log('[GoLivePopup] Room not idle (409) - canceling stuck session and retrying...');
          try {
            // Step 1: Try gateway cancel
            await import('@/services/liveRoomService').then(m =>
              m.liveRoomService.cancelRoom(effectiveRoomId, user.id)
            );
            console.log('[GoLivePopup] Gateway cancel succeeded');
          } catch (cancelErr) {
            console.warn('[GoLivePopup] Gateway cancel failed, force-resetting via DB:', cancelErr);
          }

          // Step 2: Force-reset room state via DB (always do this as safety net)
          try {
            await supabase
              .from('live_rooms')
              .update({ status: 'idle', current_session_id: null })
              .eq('id', effectiveRoomId);

            // Also end any stuck sessions for this room
            await supabase
              .from('live_room_sessions')
              .update({ status: 'ended', ends_at: new Date().toISOString() })
              .eq('room_id', effectiveRoomId)
              .in('status', ['lobby', 'live', 'scheduled']);

            console.log('[GoLivePopup] DB force-reset complete');
          } catch (dbErr) {
            console.error('[GoLivePopup] DB force-reset failed:', dbErr);
          }

          // Step 3: Wait for propagation then retry
          await new Promise(r => setTimeout(r, 1500));
          try {
            sessionResult = await createSession({ roomId: effectiveRoomId, request: sessionRequest });
          } catch (retryError: any) {
            console.error('[GoLivePopup] Retry after force-reset failed:', retryError);
            notify.error('toasts.common.error', `Room stuck. Please try again in a few seconds.`);
            throw firstError;
          }
        } else {
          throw firstError;
        }
      }

      const { session_id, status, daily_room_url } = sessionResult;
      console.log('[GoLivePopup] Session created:', session_id, 'status:', status);

      // Step 2: Create Daily.co video room (CRITICAL - was missing!)
      let dailyUrl: string | null = daily_room_url || null;
      if (!isScheduled) {
        console.log('[GoLivePopup] Creating Daily.co room for video...');
        try {
          const dailyRoom = await import('@/services/liveRoomService').then(m =>
            m.liveRoomService.createDailyRoom(effectiveRoomId)
          );
          dailyUrl = dailyRoom.daily_room_url || dailyUrl;
          console.log('[GoLivePopup] Daily.co room created:', dailyUrl);
        } catch (dailyError) {
          console.error('[GoLivePopup] Daily.co room creation failed (non-blocking):', dailyError);
          // Continue anyway - user can still join without video initially
        }
      }
      
      // Notify parent if scheduled
      if (isScheduled && onCreated) {
        onCreated(effectiveRoomId);
      }
      
      // Show appropriate toast & navigate
      if (isScheduled) {
        const dateStr = formatDate(scheduleDate!, "PPP");
        notify.success(
          'liveRooms.goLivePopup.success.streamScheduledTitle', 
          'liveRooms.goLivePopup.success.streamScheduledDesc',
          { date: dateStr, time: scheduleTime }
        );
      } else {
        // Navigate creator to viewer as host
        setTimeout(() => {
          navigate(`/comm/live-rooms/${effectiveRoomId}/view`, {
            state: {
              roomId: effectiveRoomId,
              userId: user.id,
              userName: user.email?.split('@')[0] || 'Host',
              isHost: true,
              daily_room_url: dailyUrl,
              room: {
                id: effectiveRoomId,
                title,
                isLive: true,
              }
            }
          });
        }, 500);
      }
      
      setIsLoading(false);
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error creating session:', error);
      notify.error('liveRooms.goLivePopup.errors.genericTitle', 'liveRooms.goLivePopup.errors.genericDesc');
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("Live with [Name]");
    setDescription("");
    setStreamType("");
    setSelectedTags([]);
    setShowAdvanced(false);
    setCoHostInput("");
    setAccessLevel("public");
    setScheduleDate(undefined);
    setScheduleTime("");
    setEnableChat(true);
    setEnablePolls(false);
    setEnableRecording(true);
    setSelectedImage(null);
    setImagePreviewUrl("");
    setAutoGenerateImage(false);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
  };

  // Get translated tag label
  const getTagLabel = (tagId: TagId) => t(`tags.${tagId}`, tagId);

  // Get translated access option
  const getAccessLabel = (id: AccessLevelId) => t(`access.${id}.label`, id);
  const getAccessDesc = (id: AccessLevelId) => t(`access.${id}.desc`, '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('titleCreate', 'Go Live')}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Core Section - Always Visible */}
          <div className="space-y-4">
            {/* Title */}
            <div>
              <Label htmlFor="stream-title">{t('streamTitleLabel', 'Stream Title')}</Label>
              <div className="relative">
                <Input
                  id="stream-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, 100))}
                  placeholder={applyReplacements(t('streamTitlePlaceholder', 'Live with {name}'), { name: '[Name]' })}
                  maxLength={100}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {title.length}/100
                </span>
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="stream-description">{t('descriptionLabel', 'Description / Bio (Optional)')}</Label>
              <Textarea
                id="stream-description"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                placeholder={t('descriptionPlaceholder', 'Tell your audience what this stream is about...')}
                className="mt-1 resize-none"
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {applyReplacements(t('charactersCount', '{count}/500 characters'), { count: description.length })}
              </p>
            </div>

            {/* Stream Type */}
            <div>
              <Label>{t('streamTypeLabel', 'Stream Type')}</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant={streamType === "audio" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setStreamType("audio")}
                >
                  <Mic className="w-4 h-4 mr-2" />
                  {t('streamTypeAudio', 'Audio')}
                </Button>
                <Button
                  type="button"
                  variant={streamType === "video" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setStreamType("video")}
                >
                  <Video className="w-4 h-4 mr-2" />
                  {t('streamTypeVideo', 'Video')}
                </Button>
              </div>
            </div>

            {/* Cover Image */}
            <div>
              <Label>{t('coverLabel', 'Cover Image / Thumbnail')}</Label>
              
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageUpload}
                className="hidden"
              />
              
              {/* Upload area or preview */}
              {isGeneratingImage ? (
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center mt-2">
                  <Loader2 className="w-6 h-6 mx-auto mb-2 text-muted-foreground animate-spin" />
                  <p className="text-sm text-muted-foreground">
                    {t('generatingAiImage', 'Generating AI image…')}
                  </p>
                </div>
              ) : imagePreviewUrl ? (
                <div className="relative mt-2 rounded-lg overflow-hidden border">
                  <img src={imagePreviewUrl} alt={t('coverAlt', 'Stream cover')} className="w-full h-40 object-cover" />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={handleRemoveImage}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer mt-2"
                >
                  <UploadIcon className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {t('coverUploadCta', 'Click to upload custom image')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('coverUploadHint', 'PNG, JPG up to 2MB')}
                  </p>
                </div>
              )}
              
              {/* AI generation toggle */}
              <div className="flex items-center justify-between mt-3">
                <div className="space-y-0.5">
                  <Label>{t('aiAutoGenerateLabel', 'Auto-generate with AI')}</Label>
                  <p className="text-xs text-muted-foreground">{t('aiAutoGenerateHint', 'Generate image if none uploaded')}</p>
                </div>
                <Switch checked={autoGenerateImage} onCheckedChange={setAutoGenerateImage} />
              </div>
            </div>

            {/* Tags */}
            <div>
              <Label>{t('tagsLabel', 'Tags / Category (Select 1-3)')}</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {TAG_IDS.map((tagId) => (
                  <Badge
                    key={tagId}
                    variant={selectedTags.includes(tagId) ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer",
                      selectedTags.length >= 3 && !selectedTags.includes(tagId) && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => handleTagToggle(tagId)}
                  >
                    {getTagLabel(tagId)}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {applyReplacements(t('tagsSelected', '{count}/3 selected'), { count: selectedTags.length })}
              </p>
            </div>
          </div>

          {/* Advanced Options - Expandable */}
          <div className="border-t pt-4">
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-between p-2 h-auto"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <span className="font-medium">{t('advancedTitle', 'Advanced Options')}</span>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            
            {showAdvanced && (
              <div className="space-y-4 mt-4">
                {/* Co-Host Invite */}
                <div>
                  <Label htmlFor="cohost">{t('cohostLabel', 'Co-Host / Guest Invite')}</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="cohost"
                      value={coHostInput}
                      onChange={(e) => setCoHostInput(e.target.value)}
                      placeholder={t('cohostPlaceholder', 'Search and add co-host')}
                    />
                    <Button type="button" variant="outline" size="sm">
                      <Users className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Access Level */}
                <div>
                  <Label>{t('accessLevelLabel', 'Access Level')}</Label>
                  <div className="space-y-2 mt-2">
                    {ACCESS_LEVEL_IDS.map((id) => (
                      <div key={id} className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id={id}
                          name="access"
                          checked={accessLevel === id}
                          onChange={() => setAccessLevel(id)}
                          className="w-4 h-4"
                        />
                        <div className="flex-1">
                          <label htmlFor={id} className="text-sm font-medium cursor-pointer">
                            {getAccessLabel(id)}
                          </label>
                          <p className="text-xs text-muted-foreground">{getAccessDesc(id)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Schedule for Later */}
                <div>
                  <Label>{t('scheduleLabel', 'Schedule for Later')}</Label>
                  {/* Date picker — popover contains ONLY the calendar so it can never
                      push the time picker off-screen on mobile. Picking a date closes
                      the popover, revealing the time selector inline below. */}
                  <Popover open={scheduleOpen} onOpenChange={setScheduleOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal mt-1",
                          !scheduleDate && "text-muted-foreground"
                        )}
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        {scheduleDate && scheduleTime
                          ? applyReplacements(t('scheduledAt', '{date} at {time}'), { date: formatDate(scheduleDate, "PPP"), time: scheduleTime })
                          : scheduleDate
                            ? applyReplacements(t('dateNeedsTime', '{date} – select time'), { date: formatDate(scheduleDate, "PPP") })
                            : t('goLiveNow', 'Go Live Now')
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto max-h-[60vh] overflow-y-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={scheduleDate}
                        onSelect={(date) => {
                          setScheduleDate(date);
                          // Default to the next clean 15-min slot the first time a date is set
                          if (date && !scheduleTime) {
                            const now = new Date();
                            const mins = Math.ceil((now.getMinutes() + 1) / 15) * 15;
                            const next = new Date(now);
                            next.setMinutes(mins, 0, 0);
                            setScheduleTime(
                              `${next.getHours().toString().padStart(2, '0')}:${next.getMinutes().toString().padStart(2, '0')}`
                            );
                          }
                          // Close so the inline time selector below is reachable on mobile
                          if (date) setScheduleOpen(false);
                        }}
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          return date < today;
                        }}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>

                  {/* Time selector — rendered INLINE (outside the popover) so it is
                      always visible and scrollable within the dialog on mobile. */}
                  {scheduleDate && (
                    <div className="mt-3 space-y-2 rounded-md border p-3">
                      <Label htmlFor="schedule-time">{t('time', 'Time')}</Label>
                      <Select
                        value={scheduleTime || ""}
                        onValueChange={setScheduleTime}
                      >
                        <SelectTrigger id="schedule-time">
                          <SelectValue placeholder={t('selectTime', 'Select time')} />
                        </SelectTrigger>
                        <SelectContent className="max-h-[240px]">
                          {generateTimeOptions().map((time) => (
                            <SelectItem key={time} value={time}>{time}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setScheduleDate(undefined);
                          setScheduleTime("");
                          setScheduleOpen(false);
                        }}
                        className="w-full"
                      >
                        {t('clearSchedule', 'Clear Schedule (Go Live Now)')}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Chat & Engagement */}
                <div className="space-y-3">
                  <Label>{t('engagementLabel', 'Chat & Engagement')}</Label>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{t('enableChatTitle', 'Enable Chat')}</p>
                      <p className="text-xs text-muted-foreground">{t('enableChatDesc', 'Allow viewers to chat')}</p>
                    </div>
                    <Switch checked={enableChat} onCheckedChange={setEnableChat} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{t('enablePollsTitle', 'Enable Polls')}</p>
                      <p className="text-xs text-muted-foreground">{t('enablePollsDesc', 'Create live polls during stream')}</p>
                    </div>
                    <Switch checked={enablePolls} onCheckedChange={setEnablePolls} />
                  </div>
                </div>

                {/* Record for Replay */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t('recordReplayTitle', 'Record for Replay')}</Label>
                    <p className="text-xs text-muted-foreground">{t('recordReplayDesc', 'Save stream for later viewing')}</p>
                  </div>
                  <Switch checked={enableRecording} onCheckedChange={setEnableRecording} />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              {t('cancel', 'Cancel')}
            </Button>
            <Button
              className="flex-1"
              onClick={handleGoLive}
              disabled={!title || !streamType || selectedTags.length === 0 || isLoading}
            >
              {isLoading 
                ? t('starting', 'Starting…')
                : isScheduled 
                  ? t('scheduleSession', 'Schedule Live Session') 
                  : t('goLiveNowAction', 'Go Live Now')
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
