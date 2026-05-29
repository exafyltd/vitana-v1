import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CalendarIcon, Upload as UploadIcon, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { t } from '@/lib/i18n-toast';

import { formatDate } from '@/lib/locale-format';
interface MediaUploadPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const predefinedTags = [
  "Nutrition", "Sleep", "Longevity", "Motivation", "Mindfulness", 
  "Fitness", "Mental Health", "Wellness", "Education", "Lifestyle"
];

const musicMoodTags = [
  "Calming", "Relaxing", "Soothing", "Meditation", "Sleep", 
  "Inspiring", "Energetic", "Focus", "Peaceful", "Uplifting"
];

const languages = [
  { label: "English (US)", value: "en-US" },
  { label: "English (UK)", value: "en-GB" },
  { label: "German", value: "de-DE" },
  { label: "Serbian", value: "sr-RS" },
  { label: "Spanish", value: "es-ES" },
  { label: "Arabic", value: "ar-XA" },
  { label: "Russian", value: "ru-RU" },
  { label: "Chinese", value: "zh-CN" },
  { label: "French", value: "fr-FR" },
  { label: "Portuguese", value: "pt-PT" },
  { label: "Polish", value: "pl-PL" }
];

const musicGenres = [
  "Ambient", "Classical", "Pop", "Instrumental", "Nature Sounds", 
  "Binaural Beats", "Electronic", "Jazz", "Folk"
];

const musicMoods = [
  "Calming", "Energetic", "Relaxing", "Inspiring", 
  "Focus", "Sleep", "Meditation", "Workout"
];

const videoTopics = [
  "Fitness", "Nutrition", "Mental Health", "Wellness", 
  "Education", "Lifestyle", "Motivation", "Meditation"
];

export function MediaUploadPopup({ open, onOpenChange }: MediaUploadPopupProps) {
  const { uploadMedia, isUploading, progress } = useMediaUpload();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mediaType, setMediaType] = useState<"Podcast" | "Music" | "Video" | "">("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [releaseDate, setReleaseDate] = useState<Date>();
  const [language, setLanguage] = useState("en-US");
  const [hostGuest, setHostGuest] = useState("");
  const [duration, setDuration] = useState("");
  const [genre, setGenre] = useState("");
  const [mood, setMood] = useState("");
  const [topic, setTopic] = useState("");
  const [visibility, setVisibility] = useState("Public");
  const [externalLink, setExternalLink] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    try {
      await uploadMedia(selectedFile, {
        title,
        description,
        mediaType: mediaType.toLowerCase() as "music" | "podcast" | "video",
        tags: selectedTags,
        visibility: visibility.toLowerCase(),
        language: language || undefined,
        genre: genre || undefined,
        mood: mood || undefined,
        hostGuest: hostGuest || undefined,
        duration: duration ? parseInt(duration.replace(':', '')) : undefined,
        topic: topic || undefined,
      });

      // Reset form
      setTitle("");
      setDescription("");
      setMediaType("");
      setSelectedTags([]);
      setReleaseDate(undefined);
      setLanguage("");
      setHostGuest("");
      setDuration("");
      setGenre("");
      setMood("");
      setTopic("");
      setVisibility("Public");
      setExternalLink("");
      setSelectedFile(null);
      onOpenChange(false);
    } catch (error) {
      // Error already handled by hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('screens.common.uploadMedia')}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Step 1: Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t('screens.common.basicInformation')}</h3>
            
            {/* Title */}
            <div>
              <Label htmlFor="title">{t('screens.common.title')}</Label>
              <div className="relative">
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, 25))}
                  placeholder={t('screens.common.enterMediaTitle')}
                  maxLength={25}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {title.length}/25
                </span>
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">{t('screens.common.description')}</Label>
              <div className="relative">
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 250))}
                  placeholder={t('screens.common.describeYourContent')}
                  rows={3}
                  maxLength={250}
                />
                <span className="absolute right-3 bottom-2 text-xs text-muted-foreground">
                  {description.length}/250
                </span>
              </div>
            </div>

            {/* Type Selection */}
            <div>
              <Label htmlFor="type">{t('screens.common.mediaType')}</Label>
              <Select value={mediaType} onValueChange={(value: "Podcast" | "Music" | "Video") => setMediaType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('screens.common.selectMediaType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Podcast">{t('screens.common.podcast')}</SelectItem>
                  <SelectItem value="Music">{t('screens.common.music')}</SelectItem>
                  <SelectItem value="Video">{t('screens.common.video')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* File Upload */}
            <div>
              <Label htmlFor="file">{t('screens.common.uploadFile')}</Label>
              <div className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                selectedFile ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50 cursor-pointer"
              )}>
                {!selectedFile ? (
                  <>
                    <input
                      type="file"
                      id="media-file-input"
                      className="hidden"
                      accept={
                        mediaType === "Music" ? "audio/mpeg,audio/wav,audio/ogg,audio/mp3,audio/m4a" :
                        mediaType === "Podcast" ? "audio/mpeg,audio/wav,audio/ogg,audio/mp3,audio/m4a" :
                        mediaType === "Video" ? "video/mp4,video/webm,video/ogg,video/quicktime" :
                        ""
                      }
                      onChange={handleFileSelect}
                      disabled={!mediaType || isUploading}
                    />
                    <label htmlFor="media-file-input" className="cursor-pointer block">
                      <UploadIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {mediaType ? "Click to select file" : "Select media type first"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {mediaType === "Music" && "MP3, WAV, or OGG (max 50MB)"}
                        {mediaType === "Podcast" && "MP3, WAV, or OGG (max 100MB)"}
                        {mediaType === "Video" && "MP4, WebM, or OGG (max 500MB)"}
                      </p>
                    </label>
                  </>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="text-left flex-1">
                      <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">{t('screens.common.value0Mb', { value0: (selectedFile.size / 1024 / 1024).toFixed(2) })}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={removeFile}
                      disabled={isUploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              {isUploading && (
                <div className="space-y-2 mt-3">
                  <Progress value={progress} className="w-full" />
                  <p className="text-xs text-center text-muted-foreground">{t('screens.common.uploadingProgress', { progress })}</p>
                </div>
              )}
            </div>

            {/* Tags */}
            <div>
              <Label>{mediaType === "Music" ? "Mood Tags" : "Tags"}</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {(mediaType === "Music" ? musicMoodTags : predefinedTags).map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleTagToggle(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Release Date and Language */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('screens.common.releaseDate')}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !releaseDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {releaseDate ? formatDate(releaseDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={releaseDate}
                      onSelect={setReleaseDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="language">{t('screens.common.language')}</Label>
                <Select value={language || 'en-US'} onValueChange={setLanguage} required>
                  <SelectTrigger>
                    <SelectValue placeholder={t('screens.common.selectLanguage')} />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Step 2: Conditional Fields */}
          {mediaType && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('screens.common.mediatypeDetails', { mediaType })}
              </h3>

              {mediaType === "Podcast" && (
                <>
                  <div>
                    <Label htmlFor="host-guest">{t('screens.common.hostGuestNamesOptional')}</Label>
                    <Input
                      id="host-guest"
                      value={hostGuest}
                      onChange={(e) => setHostGuest(e.target.value)}
                      placeholder={t('screens.common.enterHostGuestNames')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="duration">{t('screens.common.duration')}</Label>
                    <Input
                      id="duration"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder="e.g., 45:30"
                    />
                  </div>
                </>
              )}

              {mediaType === "Music" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="genre">{t('screens.common.genre')}</Label>
                    <Select value={genre} onValueChange={setGenre}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('screens.common.selectGenre')} />
                      </SelectTrigger>
                      <SelectContent>
                        {musicGenres.map((g) => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="mood">{t('screens.common.mood')}</Label>
                    <Select value={mood} onValueChange={setMood}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('screens.common.selectMood')} />
                      </SelectTrigger>
                      <SelectContent>
                        {musicMoods.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {mediaType === "Video" && (
                <>
                  <div>
                    <Label htmlFor="topic">{t('screens.common.videoTopic')}</Label>
                    <Select value={topic} onValueChange={setTopic}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('screens.common.selectTopic')} />
                      </SelectTrigger>
                      <SelectContent>
                        {videoTopics.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="thumbnail">{t('screens.common.thumbnailUploadOptional')}</Label>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer">
                      <UploadIcon className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">
                        {t('screens.common.uploadThumbnailImage')}
                      </p>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="video-duration">{t('screens.common.duration')}</Label>
                    <Input
                      id="video-duration"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder="e.g., 2:15"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 3: Visibility & Attribution */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t('screens.common.visibilityAttribution')}</h3>
            
            <div>
              <Label>{t('screens.common.visibility')}</Label>
              <div className="flex gap-2 mt-2">
                {["Public", "Followers", "Group-only"].map((option) => (
                  <Button
                    key={option}
                    variant={visibility === option ? "default" : "outline"}
                    size="sm"
                    onClick={() => setVisibility(option)}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="external-link">{t('screens.common.externalLinkOptional')}</Label>
              <Input
                id="external-link"
                value={externalLink}
                onChange={(e) => setExternalLink(e.target.value)}
                placeholder={t('screens.common.spotifyAppleMusicYoutubeLink')}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isUploading}
            >
              {t('screens.common.cancel')}
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={!title || !description || !mediaType || !selectedFile || isUploading}
            >
              {isUploading ? "Uploading..." : "Publish Media"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}