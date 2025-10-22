import React, { useState, useRef } from "react";
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
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCreateStream } from "@/hooks/useLiveStreams";

interface GoLivePopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTitle?: string;
}

const streamTags = [
  "Wellness", "Nutrition", "Fitness", "Mental Health", "Longevity", 
  "Meditation", "Sleep", "Motivation", "Education", "Lifestyle"
];

const accessOptions = [
  { id: "public", label: "Public", description: "Anyone can join" },
  { id: "followers", label: "Followers Only", description: "Only your followers" },
  { id: "group", label: "Group/VIP", description: "Invited members only" }
];

export function GoLivePopup({ open, onOpenChange, defaultTitle = "" }: GoLivePopupProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [title, setTitle] = useState(defaultTitle || "Live with [Name]");
  const [description, setDescription] = useState("");
  const [streamType, setStreamType] = useState<"Audio" | "Video" | "">("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [coHostInput, setCoHostInput] = useState("");
  const [accessLevel, setAccessLevel] = useState("public");
  const [scheduleDate, setScheduleDate] = useState<Date>();
  const [scheduleTime, setScheduleTime] = useState("");
  const [enableChat, setEnableChat] = useState(true);
  const [enablePolls, setEnablePolls] = useState(false);
  const [enableReplay, setEnableReplay] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  const { mutateAsync: createStream } = useCreateStream();
  
  // Image upload states
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [autoGenerateImage, setAutoGenerateImage] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const isScheduled = !!scheduleDate && !!scheduleTime && new Date(`${format(scheduleDate, 'yyyy-MM-dd')}T${scheduleTime}`) > new Date();

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
        toast({ 
          title: "Invalid File Type", 
          description: "Please select an image file (JPEG, PNG, WebP)", 
          variant: "destructive" 
        });
        return;
      }
      // Validate file size (2MB max)
      if (file.size > 2 * 1024 * 1024) {
        toast({ 
          title: "File Too Large", 
          description: "Image must be smaller than 2MB", 
          variant: "destructive" 
        });
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

  const handleTagToggle = (tag: string) => {
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
      toast({ 
        title: "Select Stream Type", 
        description: "Please select Audio or Video",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ 
          title: "Error", 
          description: "You must be logged in to go live", 
          variant: "destructive" 
        });
        setIsLoading(false);
        return;
      }
      
      let uploadedImageUrl: string | undefined;
      
      // Upload manual image if selected
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
          toast({ 
            title: "Image upload failed", 
            description: "Stream will be created without an image.",
            variant: "destructive"
          });
        }
      }
      
      // Auto-generate image if enabled and no manual image
      if (autoGenerateImage && !uploadedImageUrl) {
        toast({ 
          title: "AI Image Generation", 
          description: "Image will be generated when stream starts." 
        });
      }
      
      // Prepare stream data
      const streamData = {
        title,
        description: description || null,
        stream_type: streamType.toLowerCase(),
        tags: selectedTags,
        access_level: accessLevel,
        cover_image_url: uploadedImageUrl || null,
        co_hosts: coHostInput ? [coHostInput] : [],
        scheduled_for: (scheduleDate && scheduleTime) 
          ? new Date(`${format(scheduleDate, 'yyyy-MM-dd')}T${scheduleTime}:00`).toISOString()
          : null,
        status: (scheduleDate && scheduleTime) ? 'pending' : 'live',
        enable_chat: enableChat,
        enable_polls: enablePolls,
        enable_replay: enableReplay,
        started_at: (!scheduleDate || !scheduleTime) ? new Date().toISOString() : null,
        created_by: user.id,
      };
      
      // Insert into database
      const stream = await createStream(streamData);
      
      // Show appropriate toast
      if (scheduleDate && scheduleTime) {
        toast({
          title: "Stream Scheduled! 📅",
          description: `Your stream is scheduled for ${format(scheduleDate, "PPP")} at ${scheduleTime}`,
        });
      } else {
        toast({
          title: "You're Live! 🎙️",
          description: "Your stream is now broadcasting",
        });
      }
      
      // Log activity
      import('@/hooks/useCommunityLogger').then(({ useCommunityLogger }) => {
        const { logLiveCreate, logLiveStart } = useCommunityLogger();
        if (scheduleDate) {
          logLiveCreate(title, streamType, true);
        } else {
          logLiveStart(title, streamType);
        }
      });
      
      setIsLoading(false);
      onOpenChange(false);
      
      // Reset form
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
      setEnableReplay(true);
      setSelectedImage(null);
      setImagePreviewUrl("");
      setAutoGenerateImage(false);
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    } catch (error) {
      console.error('Error creating stream:', error);
      toast({
        title: "Error",
        description: "Failed to create stream. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Go Live</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Core Section - Always Visible */}
          <div className="space-y-4">
            {/* Title */}
            <div>
              <Label htmlFor="stream-title">Stream Title</Label>
              <div className="relative">
                <Input
                  id="stream-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, 25))}
                  placeholder="Live with [Name]"
                  maxLength={25}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {title.length}/25
                </span>
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="stream-description">Description / Bio (Optional)</Label>
              <Textarea
                id="stream-description"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                placeholder="Tell your audience what this stream is about..."
                className="mt-1 resize-none"
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {description.length}/500 characters
              </p>
            </div>

            {/* Stream Type */}
            <div>
              <Label>Stream Type</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant={streamType === "Audio" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setStreamType("Audio")}
                >
                  <Mic className="w-4 h-4 mr-2" />
                  Audio
                </Button>
                <Button
                  type="button"
                  variant={streamType === "Video" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setStreamType("Video")}
                >
                  <Video className="w-4 h-4 mr-2" />
                  Video
                </Button>
              </div>
            </div>

            {/* Cover Image */}
            <div>
              <Label>Cover Image / Thumbnail</Label>
              
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
                    Generating AI image...
                  </p>
                </div>
              ) : imagePreviewUrl ? (
                <div className="relative mt-2 rounded-lg overflow-hidden border">
                  <img src={imagePreviewUrl} alt="Stream cover" className="w-full h-40 object-cover" />
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
                    Click to upload custom image
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG up to 2MB
                  </p>
                </div>
              )}
              
              {/* AI generation toggle */}
              <div className="flex items-center justify-between mt-3">
                <div className="space-y-0.5">
                  <Label>Auto-generate with AI</Label>
                  <p className="text-xs text-muted-foreground">Generate image if none uploaded</p>
                </div>
                <Switch checked={autoGenerateImage} onCheckedChange={setAutoGenerateImage} />
              </div>
            </div>

            {/* Tags */}
            <div>
              <Label>Tags / Category (Select 1-3)</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {streamTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer",
                      selectedTags.length >= 3 && !selectedTags.includes(tag) && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => handleTagToggle(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedTags.length}/3 selected
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
              <span className="font-medium">Advanced Options</span>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            
            {showAdvanced && (
              <div className="space-y-4 mt-4">
                {/* Co-Host Invite */}
                <div>
                  <Label htmlFor="cohost">Co-Host / Guest Invite</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="cohost"
                      value={coHostInput}
                      onChange={(e) => setCoHostInput(e.target.value)}
                      placeholder="Search and add co-host"
                    />
                    <Button type="button" variant="outline" size="sm">
                      <Users className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Access Level */}
                <div>
                  <Label>Access Level</Label>
                  <div className="space-y-2 mt-2">
                    {accessOptions.map((option) => (
                      <div key={option.id} className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id={option.id}
                          name="access"
                          checked={accessLevel === option.id}
                          onChange={() => setAccessLevel(option.id)}
                          className="w-4 h-4"
                        />
                        <div className="flex-1">
                          <label htmlFor={option.id} className="text-sm font-medium cursor-pointer">
                            {option.label}
                          </label>
                          <p className="text-xs text-muted-foreground">{option.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Schedule for Later */}
                <div>
                  <Label>Schedule for Later</Label>
                  <Popover>
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
                          ? `${format(scheduleDate, "PPP")} at ${scheduleTime}`
                          : scheduleDate 
                            ? `${format(scheduleDate, "PPP")} - Select time`
                            : "Go Live Now"
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={scheduleDate}
                        onSelect={setScheduleDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                      
                      {scheduleDate && (
                        <div className="p-3 border-t space-y-2">
                          <Label htmlFor="schedule-time">Time</Label>
                          <Select 
                            value={scheduleTime || ""} 
                            onValueChange={setScheduleTime}
                          >
                            <SelectTrigger id="schedule-time">
                              <SelectValue placeholder="Select time" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px]">
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
                            }}
                            className="w-full"
                          >
                            Clear Schedule (Go Live Now)
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Chat & Engagement */}
                <div className="space-y-3">
                  <Label>Chat & Engagement</Label>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Enable Chat</p>
                      <p className="text-xs text-muted-foreground">Allow viewers to chat</p>
                    </div>
                    <Switch checked={enableChat} onCheckedChange={setEnableChat} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Enable Polls</p>
                      <p className="text-xs text-muted-foreground">Create live polls during stream</p>
                    </div>
                    <Switch checked={enablePolls} onCheckedChange={setEnablePolls} />
                  </div>
                </div>

                {/* Record for Replay */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Record for Replay</Label>
                    <p className="text-xs text-muted-foreground">Save stream for later viewing</p>
                  </div>
                  <Switch checked={enableReplay} onCheckedChange={setEnableReplay} />
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
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleGoLive}
              disabled={!title || !streamType || selectedTags.length === 0 || isLoading}
            >
              {isLoading 
                ? "Starting..." 
                : isScheduled 
                  ? "Schedule Live Session" 
                  : "Go Live Now"
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}