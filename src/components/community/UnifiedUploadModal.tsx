import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Upload, X, Music, Mic, Video } from 'lucide-react';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useVideoUpload } from '@/hooks/useVideoUpload';
import { cn } from '@/lib/utils';

interface UnifiedUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: (mediaType: 'music' | 'podcast' | 'video') => void;
}

const PREDEFINED_TAGS = [
  'Nutrition', 'Sleep', 'Longevity', 'Motivation', 'Mindfulness',
  'Fitness', 'Mental Health', 'Wellness', 'Education', 'Lifestyle'
];

const SIZE_LIMITS = {
  music: { max: 50, text: 'MP3, WAV, FLAC (max 50MB)' },
  podcast: { max: 100, text: 'MP3, WAV (max 100MB)' },
  video: { max: 500, text: 'MP4, WebM, OGG (max 500MB, 5min)' },
};

export function UnifiedUploadModal({ open, onOpenChange, onUploadComplete }: UnifiedUploadModalProps) {
  const [mediaType, setMediaType] = useState<'music' | 'podcast' | 'video' | null>(null);
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

  const { uploadMedia, isUploading: isMediaUploading, progress: mediaProgress } = useMediaUpload();
  const { uploadVideo, isUploading: isVideoUploading, progress: videoProgress } = useVideoUpload();

  const isUploading = isMediaUploading || isVideoUploading;
  const progress = mediaType === 'video' ? videoProgress : mediaProgress;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
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
          <DialogTitle>Upload Media</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Media Type Selector */}
          <div className="space-y-2">
            <Label htmlFor="mediaType">Media Type *</Label>
            <Select
              value={mediaType || ''}
              onValueChange={(value) => setMediaType(value as 'music' | 'podcast' | 'video')}
              disabled={isUploading}
            >
              <SelectTrigger id="mediaType">
                <SelectValue placeholder="Select media type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="podcast">🎙️ Podcast</SelectItem>
                <SelectItem value="music">🎵 Music</SelectItem>
                <SelectItem value="video">🎬 Video</SelectItem>
              </SelectContent>
            </Select>
            {!mediaType && (
              <p className="text-xs text-muted-foreground">Select media type first</p>
            )}
          </div>

          {/* File Upload Area */}
          {mediaType && (
            <div className="space-y-2">
              <Label>File *</Label>
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
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {getMediaIcon()}
                    <div>
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <span className="text-primary hover:underline">Click to upload</span>
                        <span className="text-muted-foreground"> or drag and drop</span>
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

          {/* Common Fields */}
          {mediaType && (
            <>
              <div className="space-y-2">
                <Label htmlFor="title">Title * ({title.length}/100)</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, 100))}
                  placeholder="Enter title"
                  disabled={isUploading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description ({description.length}/500)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                  placeholder="Enter description"
                  disabled={isUploading}
                  rows={3}
                />
              </div>

              {/* Type-Specific Fields */}
              {mediaType === 'music' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="genre">Genre</Label>
                    <Input
                      id="genre"
                      value={genre}
                      onChange={(e) => setGenre(e.target.value)}
                      placeholder="e.g., Classical, Jazz"
                      disabled={isUploading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mood">Mood</Label>
                    <Input
                      id="mood"
                      value={mood}
                      onChange={(e) => setMood(e.target.value)}
                      placeholder="e.g., Calm, Energetic"
                      disabled={isUploading}
                    />
                  </div>
                </div>
              )}

              {mediaType === 'podcast' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hostGuest">Host / Guest</Label>
                    <Input
                      id="hostGuest"
                      value={hostGuest}
                      onChange={(e) => setHostGuest(e.target.value)}
                      placeholder="Host Name, Guest Name"
                      disabled={isUploading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Input
                      id="language"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      placeholder="e.g., English"
                      disabled={isUploading}
                    />
                  </div>
                </div>
              )}

              {mediaType === 'video' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="topic">Topic / Category</Label>
                    <Input
                      id="topic"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g., Wellness, Fitness"
                      disabled={isUploading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="thumbnail">Custom Thumbnail (optional)</Label>
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
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                          <div>
                            <label htmlFor="thumbnail-upload" className="cursor-pointer">
                              <span className="text-primary hover:underline">Upload thumbnail</span>
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
                            JPG, PNG, WebP (auto-generated if not provided)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Tags */}
              <div className="space-y-3">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {PREDEFINED_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      disabled={isUploading}
                      className={cn(
                        "px-3 py-1 rounded-full text-sm transition-colors",
                        tags.includes(tag)
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visibility */}
              {mediaType !== 'video' && (
                <div className="space-y-3">
                  <Label>Visibility</Label>
                  <RadioGroup
                    value={visibility}
                    onValueChange={(value) => setVisibility(value as 'public' | 'private')}
                    disabled={isUploading}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="public" id="public" />
                      <Label htmlFor="public" className="cursor-pointer font-normal">
                        Public
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="private" id="private" />
                      <Label htmlFor="private" className="cursor-pointer font-normal">
                        Private
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
                    Uploading... {progress}%
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={!isFormValid || isUploading}
                className="w-full bg-gradient-to-r from-violet-500 to-sky-400 hover:from-violet-600 hover:to-sky-500"
              >
                {isUploading ? 'Publishing...' : `Publish ${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)}`}
              </Button>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
