import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Upload, X, Music, Mic, Video, Sparkles, RotateCw, Loader2 } from 'lucide-react';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useVideoUpload } from '@/hooks/useVideoUpload';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';
import { SHORTS_TAG_IDS } from '@/lib/shortsTags';
import {
  useAutoShortMetadata,
  autoMetadataErrorCopy,
} from '@/hooks/useAutoShortMetadata';
import { readVideoDuration } from '@/lib/videoKeyframes';

interface UnifiedUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: (mediaType: 'music' | 'podcast' | 'video') => void;
  initialMediaType?: 'music' | 'podcast' | 'video';
}

// Stable IDs for predefined tags - translate display names dynamically.
// Canonical list lives in `@/lib/shortsTags` and is mirrored server-side in
// vitana-platform for the Smart Upload validator.
const PREDEFINED_TAG_IDS = SHORTS_TAG_IDS;

const SIZE_LIMITS = {
  music: { max: 50, text: 'MP3, WAV, FLAC (max 50MB)' },
  podcast: { max: 100, text: 'MP3, WAV (max 100MB)' },
  video: { max: 500, text: 'MP4, WebM, OGG (max 500MB, 5min)' },
};

export function UnifiedUploadModal({ open, onOpenChange, onUploadComplete, initialMediaType }: UnifiedUploadModalProps) {
  const { translate } = useTranslation();
  const [mediaType, setMediaType] = useState<'music' | 'podcast' | 'video' | null>(initialMediaType || null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  
  // Music-specific
  const [genre, setGenre] = useState('');
  const [mood, setMood] = useState('');
  
  // Podcast-specific
  const [hostGuest, setHostGuest] = useState('');
  const [language, setLanguage] = useState('');
  
  // Video-specific
  const [topic, setTopic] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  // Smart Upload (video only) — auto-generated metadata summary + Edit details.
  const autoMetadata = useAutoShortMetadata();
  const [autoApplied, setAutoApplied] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  const { uploadMedia, isUploading: isMediaUploading, progress: mediaProgress } = useMediaUpload();
  const { uploadVideo, isUploading: isVideoUploading, progress: videoProgress } = useVideoUpload();

  const isUploading = isMediaUploading || isVideoUploading;
  const progress = mediaType === 'video' ? videoProgress : mediaProgress;

  // Sync mediaType with initialMediaType when modal opens
  useEffect(() => {
    if (open && initialMediaType) {
      setMediaType(initialMediaType);
    } else if (!open) {
      setMediaType(null); // Reset when modal closes
    }
  }, [open, initialMediaType]);

  const runAutoMetadata = async (selectedFile: File) => {
    const duration = await readVideoDuration(selectedFile);
    const metadata = await autoMetadata.generate(
      selectedFile,
      duration || undefined,
    );
    if (!metadata) {
      // Failure — autoMetadata.error holds the code. Show the manual form so the
      // user isn't blocked.
      setAutoApplied(false);
      setDetailsExpanded(true);
      return;
    }
    setTitle(metadata.title.slice(0, 100));
    setDescription(metadata.description.slice(0, 500));
    setTopic(metadata.category);
    setTags(metadata.tags);
    setAutoApplied(true);
    setDetailsExpanded(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);

    // Reset any prior auto-fill state when the user picks a new file.
    autoMetadata.reset();
    setAutoApplied(false);
    setDetailsExpanded(false);

    if (mediaType === 'video') {
      void runAutoMetadata(selectedFile);
    } else {
      // Non-video uploads keep the existing manual-only flow.
      setDetailsExpanded(true);
    }
  };

  const handleRegenerate = () => {
    if (!file || mediaType !== 'video') return;
    void runAutoMetadata(file);
  };

  const handleCancelAuto = () => {
    autoMetadata.cancel();
    setDetailsExpanded(true);
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setThumbnailFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const toggleTag = (tag: string) => {
    setTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !mediaType || !title) return;

    try {
      if (mediaType === 'video') {
        await uploadVideo(file, {
          title,
          description,
          tags,
          category: topic || 'General',
          language: language || 'English',
        }, { thumbnailFile: thumbnailFile || undefined });
      } else {
        await uploadMedia(file, {
          title,
          description,
          mediaType,
          tags,
          visibility,
          genre: mediaType === 'music' ? genre : undefined,
          mood: mediaType === 'music' ? mood : undefined,
          hostGuest: mediaType === 'podcast' ? hostGuest : undefined,
          language: mediaType === 'podcast' ? language : undefined,
        });
      }

      onUploadComplete?.(mediaType);
      handleClose();
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setMediaType(null);
      setFile(null);
      setTitle('');
      setDescription('');
      setTags([]);
      setGenre('');
      setMood('');
      setHostGuest('');
      setLanguage('');
      setTopic('');
      setThumbnailFile(null);
      setThumbnailPreview(null);
      setVisibility('public');
      autoMetadata.reset();
      setAutoApplied(false);
      setDetailsExpanded(false);
      onOpenChange(false);
    }
  };

  const getAcceptedFileTypes = () => {
    switch (mediaType) {
      case 'music':
        return '.mp3,.wav,.flac,.m4a';
      case 'podcast':
        return '.mp3,.wav,.m4a';
      case 'video':
        return '.mp4,.webm,.ogg';
      default:
        return '';
    }
  };

  const getMediaIcon = () => {
    switch (mediaType) {
      case 'music':
        return <Music className="w-12 h-12 text-muted-foreground" />;
      case 'podcast':
        return <Mic className="w-12 h-12 text-muted-foreground" />;
      case 'video':
        return <Video className="w-12 h-12 text-muted-foreground" />;
      default:
        return <Upload className="w-12 h-12 text-muted-foreground" />;
    }
  };

  const isFormValid = mediaType && file && title.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialMediaType 
              ? translate('mediaHub.upload.titleWithType').replace('{type}', initialMediaType.charAt(0).toUpperCase() + initialMediaType.slice(1))
              : translate('mediaHub.upload.title')
            }
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Media Type Selector */}
          {!initialMediaType && (
            <div className="space-y-2">
              <Label htmlFor="mediaType">{translate('mediaHub.upload.mediaType')}</Label>
              <Select
                value={mediaType || ''}
                onValueChange={(value) => setMediaType(value as 'music' | 'podcast' | 'video')}
                disabled={isUploading}
              >
                <SelectTrigger id="mediaType">
                  <SelectValue placeholder={translate('mediaHub.upload.selectMediaType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="podcast">🎙️ {translate('mediaHub.menu.podcast')}</SelectItem>
                  <SelectItem value="music">🎵 {translate('mediaHub.menu.music')}</SelectItem>
                  <SelectItem value="video">🎬 {translate('mediaHub.menu.video')}</SelectItem>
                </SelectContent>
              </Select>
              {!mediaType && (
                <p className="text-xs text-muted-foreground">{translate('mediaHub.upload.selectMediaTypeFirst')}</p>
              )}
            </div>
          )}

          {/* File Upload Area */}
          {mediaType && (
            <div className="space-y-2">
              <Label>{translate('mediaHub.upload.file')}</Label>
              <div className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                file ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              )}>
                {file ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      {getMediaIcon()}
                    </div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFile(null)}
                      disabled={isUploading}
                    >
                      <X className="w-4 h-4 mr-1" />
                      {translate('mediaHub.upload.remove')}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {getMediaIcon()}
                    <div>
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <span className="text-primary hover:underline">{translate('mediaHub.upload.clickToUpload')}</span>
                        <span className="text-muted-foreground"> {translate('mediaHub.upload.orDragDrop')}</span>
                      </label>
                      <Input
                        id="file-upload"
                        type="file"
                        accept={getAcceptedFileTypes()}
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={isUploading}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {SIZE_LIMITS[mediaType].text}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Smart Upload — video only. Three states: loading, auto-applied, error. */}
          {mediaType === 'video' && file && autoMetadata.loading && (
            <div className="rounded-lg border border-violet-200 bg-gradient-to-br from-violet-50 to-sky-50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-violet-700">
                <Sparkles className="w-4 h-4" />
                Analyzing your video…
              </div>
              <div className="space-y-2">
                <div className="h-3 w-3/4 rounded bg-violet-200/60 animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-violet-200/60 animate-pulse" />
                <div className="h-3 w-2/3 rounded bg-violet-200/60 animate-pulse" />
              </div>
              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-muted-foreground">Usually 2–5 seconds</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelAuto}
                  disabled={isUploading}
                >
                  Skip & fill manually
                </Button>
              </div>
            </div>
          )}

          {mediaType === 'video' && file && autoMetadata.error && !autoMetadata.loading && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
              <div className="flex-1 text-sm text-amber-900">
                {autoMetadataErrorCopy(autoMetadata.error)}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRegenerate}
                disabled={isUploading || autoMetadata.loading}
                className="text-amber-900 hover:text-amber-950"
              >
                <RotateCw className="w-3.5 h-3.5 mr-1" />
                Retry
              </Button>
            </div>
          )}

          {mediaType === 'video' &&
            file &&
            autoApplied &&
            !detailsExpanded &&
            !autoMetadata.loading && (
              <div className="rounded-lg border border-violet-200 bg-gradient-to-br from-violet-50 to-sky-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium text-violet-700">
                    <Sparkles className="w-4 h-4" />
                    Smart-filled from your video
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRegenerate}
                    disabled={isUploading || autoMetadata.loading}
                    className="text-violet-700 hover:text-violet-800 h-7 px-2"
                  >
                    {autoMetadata.loading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RotateCw className="w-3.5 h-3.5" />
                    )}
                    <span className="ml-1 text-xs">Regenerate</span>
                  </Button>
                </div>
                <dl className="text-sm space-y-1.5">
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground min-w-[80px] shrink-0">Title</dt>
                    <dd className="font-medium text-foreground">{title || '—'}</dd>
                  </div>
                  {description && (
                    <div className="flex gap-2">
                      <dt className="text-muted-foreground min-w-[80px] shrink-0">Description</dt>
                      <dd className="text-foreground line-clamp-2">{description}</dd>
                    </div>
                  )}
                  {topic && (
                    <div className="flex gap-2">
                      <dt className="text-muted-foreground min-w-[80px] shrink-0">Category</dt>
                      <dd className="text-foreground">
                        {translate(`mediaHub.upload.predefinedTags.${topic}`) || topic}
                      </dd>
                    </div>
                  )}
                  {tags.length > 0 && (
                    <div className="flex gap-2">
                      <dt className="text-muted-foreground min-w-[80px] shrink-0">Tags</dt>
                      <dd className="text-foreground">
                        {tags
                          .map((t) => translate(`mediaHub.upload.predefinedTags.${t}`) || t)
                          .join(', ')}
                      </dd>
                    </div>
                  )}
                </dl>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDetailsExpanded(true)}
                  disabled={isUploading}
                  className="w-full"
                >
                  Edit details
                </Button>
              </div>
            )}

          {/* Common Fields — hidden for video when auto-fill is applied and user hasn't clicked Edit details */}
          {mediaType && (
            <>
              {(mediaType !== 'video' || detailsExpanded || autoMetadata.error) && (
                <>
              <div className="space-y-2">
                <Label htmlFor="title">{translate('mediaHub.upload.titleLabel')} ({title.length}/100)</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, 100))}
                  placeholder={translate('mediaHub.upload.titlePlaceholder')}
                  disabled={isUploading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{translate('mediaHub.upload.descriptionLabel')} ({description.length}/500)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                  placeholder={translate('mediaHub.upload.descriptionPlaceholder')}
                  disabled={isUploading}
                  rows={3}
                />
              </div>
                </>
              )}

              {/* Type-Specific Fields */}
              {mediaType === 'music' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="genre">{translate('mediaHub.upload.genre')}</Label>
                    <Input
                      id="genre"
                      value={genre}
                      onChange={(e) => setGenre(e.target.value)}
                      placeholder={translate('mediaHub.upload.genrePlaceholder')}
                      disabled={isUploading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mood">{translate('mediaHub.upload.mood')}</Label>
                    <Input
                      id="mood"
                      value={mood}
                      onChange={(e) => setMood(e.target.value)}
                      placeholder={translate('mediaHub.upload.moodPlaceholder')}
                      disabled={isUploading}
                    />
                  </div>
                </div>
              )}

              {mediaType === 'podcast' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hostGuest">{translate('mediaHub.upload.hostGuest')}</Label>
                    <Input
                      id="hostGuest"
                      value={hostGuest}
                      onChange={(e) => setHostGuest(e.target.value)}
                      placeholder={translate('mediaHub.upload.hostGuestPlaceholder')}
                      disabled={isUploading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">{translate('mediaHub.upload.language')}</Label>
                    <Input
                      id="language"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      placeholder={translate('mediaHub.upload.languagePlaceholder')}
                      disabled={isUploading}
                    />
                  </div>
                </div>
              )}

              {mediaType === 'video' && (
                <>
                  {(detailsExpanded || autoMetadata.error) && (
                    <div className="space-y-2">
                      <Label htmlFor="topic">{translate('mediaHub.upload.topic')}</Label>
                      <Input
                        id="topic"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder={translate('mediaHub.upload.topicPlaceholder')}
                        disabled={isUploading}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="thumbnail">{translate('mediaHub.upload.thumbnail')}</Label>
                    <div className={cn(
                      "border-2 border-dashed rounded-lg p-4 text-center transition-colors",
                      thumbnailFile ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    )}>
                      {thumbnailPreview ? (
                        <div className="space-y-2">
                          <img src={thumbnailPreview} alt="Thumbnail preview" className="w-full h-32 object-cover rounded" />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setThumbnailFile(null);
                              setThumbnailPreview(null);
                            }}
                            disabled={isUploading}
                          >
                            <X className="w-4 h-4 mr-1" />
                            {translate('mediaHub.upload.remove')}
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                          <div>
                            <label htmlFor="thumbnail-upload" className="cursor-pointer">
                              <span className="text-primary hover:underline">{translate('mediaHub.upload.uploadThumbnail')}</span>
                            </label>
                            <Input
                              id="thumbnail-upload"
                              type="file"
                              accept=".jpg,.jpeg,.png,.webp"
                              onChange={handleThumbnailChange}
                              className="hidden"
                              disabled={isUploading}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {translate('mediaHub.upload.thumbnailHint')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Tags — hidden for video when auto-fill is applied */}
              {(mediaType !== 'video' || detailsExpanded || autoMetadata.error) && (
                <div className="space-y-3">
                  <Label>{translate('mediaHub.upload.tags')}</Label>
                  <div className="flex flex-wrap gap-2">
                    {PREDEFINED_TAG_IDS.map((tagId) => (
                      <button
                        key={tagId}
                        type="button"
                        onClick={() => toggleTag(tagId)}
                        disabled={isUploading}
                        className={cn(
                          "px-3 py-1 rounded-full text-sm transition-colors",
                          tags.includes(tagId)
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        )}
                      >
                        {translate(`mediaHub.upload.predefinedTags.${tagId}`)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Visibility */}
              {mediaType !== 'video' && (
                <div className="space-y-3">
                  <Label>{translate('mediaHub.upload.visibility')}</Label>
                  <RadioGroup
                    value={visibility}
                    onValueChange={(value) => setVisibility(value as 'public' | 'private')}
                    disabled={isUploading}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="public" id="public" />
                      <Label htmlFor="public" className="cursor-pointer font-normal">
                        {translate('mediaHub.upload.public')}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="private" id="private" />
                      <Label htmlFor="private" className="cursor-pointer font-normal">
                        {translate('mediaHub.upload.private')}
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {/* Progress Bar */}
              {isUploading && (
                <div className="space-y-2">
                  <Progress value={progress} className="h-2" />
                  <p className="text-sm text-center text-muted-foreground">
                    {translate('mediaHub.upload.uploading').replace('{progress}', String(progress))}
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={!isFormValid || isUploading}
                className="w-full bg-gradient-to-r from-violet-500 to-sky-400 hover:from-violet-600 hover:to-sky-500"
              >
                {isUploading ? translate('mediaHub.upload.uploading').replace('{progress}', String(progress)) : translate('mediaHub.upload.submit')}
              </Button>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
