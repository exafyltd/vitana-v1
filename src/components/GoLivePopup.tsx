import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { CalendarIcon, Upload as UploadIcon, ChevronDown, ChevronUp, Mic, Video, Users, Clock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
  const [title, setTitle] = useState(defaultTitle || "Live with [Name]");
  const [streamType, setStreamType] = useState<"Audio" | "Video" | "">("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [coHostInput, setCoHostInput] = useState("");
  const [accessLevel, setAccessLevel] = useState("public");
  const [scheduleDate, setScheduleDate] = useState<Date>();
  const [enableChat, setEnableChat] = useState(true);
  const [enablePolls, setEnablePolls] = useState(false);
  const [enableReplay, setEnableReplay] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const isScheduled = !!scheduleDate && scheduleDate > new Date();

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
    setIsLoading(true);
    // Simulate going live
    setTimeout(() => {
      setIsLoading(false);
      onOpenChange(false);
      // Reset form
      setTitle("Live with [Name]");
      setStreamType("");
      setSelectedTags([]);
      setShowAdvanced(false);
      setCoHostInput("");
      setAccessLevel("public");
      setScheduleDate(undefined);
      setEnableChat(true);
      setEnablePolls(false);
      setEnableReplay(true);
    }, 2000);
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
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer mt-2">
                <UploadIcon className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Auto-generated or upload custom
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG up to 2MB
                </p>
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
                        {scheduleDate ? format(scheduleDate, "PPP 'at' p") : "Go Live Now"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={scheduleDate}
                        onSelect={setScheduleDate}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                      {scheduleDate && (
                        <div className="p-3 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setScheduleDate(undefined)}
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