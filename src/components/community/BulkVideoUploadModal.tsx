import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Upload, X, Play, Check, AlertCircle, Loader2,
  ChevronDown, ChevronUp, Image as ImageIcon, Film, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBulkVideoUpload, VideoFileItem } from '@/hooks/useBulkVideoUpload';
import { useAutoShortMetadata } from '@/hooks/useAutoShortMetadata';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useQueryClient } from '@tanstack/react-query';
import { t } from '@/lib/i18n-toast';

import { fmtDate } from '@/lib/locale-format';
interface BulkVideoUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: () => void;
}

const PREDEFINED_TAGS = [
  'Fitness', 'Nutrition', 'Wellness', 'Mindfulness', 'Motivation',
  'Mental Health', 'Lifestyle', 'Education', 'Sleep', 'Longevity'
];

const VIDEO_TOPICS = [
  'Fitness', 'Nutrition', 'Mental Health', 'Wellness', 
  'Education', 'Lifestyle', 'Motivation', 'Meditation'
];

function ThumbnailPicker({ item, onUpdate }: { item: VideoFileItem; onUpdate: (updates: Partial<VideoFileItem>) => void }) {
  const [autoThumbnails, setAutoThumbnails] = useState<string[]>([]);
  const [isLoadingThumbs, setIsLoadingThumbs] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { generateAutoThumbnails, captureThumbnailAtTime } = useBulkVideoUpload();

  const loadAutoThumbnails = async () => {
    setIsLoadingThumbs(true);
    try {
      const thumbs = await generateAutoThumbnails(item.file);
      setAutoThumbnails(thumbs);
    } catch (error) {
      console.error('Failed to generate thumbnails:', error);
    } finally {
      setIsLoadingThumbs(false);
    }
  };

  const handleCaptureFrame = async () => {
    if (!videoRef.current) return;
    
    try {
      const dataUrl = await captureThumbnailAtTime(item.file, currentTime);
      onUpdate({
        thumbnail: {
          type: 'frame',
          url: dataUrl,
          selectedFrame: currentTime,
        }
      });
    } catch (error) {
      console.error('Failed to capture frame:', error);
    }
  };

  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdate({
          thumbnail: {
            type: 'custom',
            url: reader.result as string,
            file: file,
          }
        });
      };
      reader.readAsDataURL(file);
    }
  };

  if (autoThumbnails.length === 0 && !isLoadingThumbs) {
    loadAutoThumbnails();
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">{t('screens.community.thumbnail')}</Label>
      
      {/* Current thumbnail */}
      {item.thumbnail?.url && (
        <div className="relative w-full aspect-[9/16] rounded-lg overflow-hidden border-2 border-primary">
          <img 
            src={item.thumbnail.url} 
            alt={t('screens.community.selectedThumbnail')} 
            className="w-full h-full object-cover"
          />
          <Badge className="absolute top-2 right-2 text-xs">
            {item.thumbnail.type === 'auto' ? 'Auto' : item.thumbnail.type === 'frame' ? 'Frame' : 'Custom'}
          </Badge>
        </div>
      )}

      {/* Auto-generated suggestions */}
      {isLoadingThumbs ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">{t('screens.community.generatingThumbnails')}</span>
        </div>
      ) : autoThumbnails.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">{t('screens.community.quickPicks')}</Label>
          <div className="grid grid-cols-3 gap-2">
            {autoThumbnails.map((thumb, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onUpdate({
                  thumbnail: { type: 'auto', url: thumb }
                })}
                className={cn(
                  "relative aspect-[9/16] rounded border-2 overflow-hidden transition-all hover:border-primary",
                  item.thumbnail?.url === thumb ? "border-primary ring-2 ring-primary" : "border-border"
                )}
              >
                <img src={thumb} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                {item.thumbnail?.url === thumb && (
                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                    <Check className="w-5 h-5 text-primary" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Video scrubber for custom frame selection */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">{t('screens.community.pickExactFrame')}</Label>
        <div className="border rounded-lg p-2 space-y-2">
          <video
            ref={videoRef}
            src={URL.createObjectURL(item.file)}
            className="w-full rounded"
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          />
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max={item.duration || 60}
              step="0.1"
              value={currentTime}
              onChange={(e) => {
                const time = parseFloat(e.target.value);
                setCurrentTime(time);
                if (videoRef.current) {
                  videoRef.current.currentTime = time;
                }
              }}
              className="flex-1"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleCaptureFrame}
            >
              <Film className="w-4 h-4 mr-1" />
              {t('screens.community.useFrame')}
            </Button>
          </div>
        </div>
      </div>

      {/* Custom upload */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleCustomUpload}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="w-full"
        >
          <ImageIcon className="w-4 h-4 mr-2" />
          {t('screens.community.uploadCustomImage')}
        </Button>
      </div>
    </div>
  );
}

function VideoItemRow({ item, onUpdate, onRemove, onRetry }: {
  item: VideoFileItem;
  onUpdate: (updates: Partial<VideoFileItem>) => void;
  onRemove: () => void;
  onRetry: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const autoMetadata = useAutoShortMetadata();
  const [autoApplied, setAutoApplied] = useState(false);
  const triggeredRef = useRef(false);

  // Kick off auto-fill once per item as soon as it enters the queue. We only
  // auto-populate title + description here — topic / tags remain manual in the
  // bulk flow because the bulk modal uses a different display format for those
  // fields (tracked as follow-up for tag-list consolidation).
  useEffect(() => {
    if (triggeredRef.current) return;
    if (item.status !== 'queued') return;
    if (!item.file) return;
    triggeredRef.current = true;

    autoMetadata.generate(item.file, item.duration).then((metadata) => {
      if (!metadata) return;
      const updates: Partial<VideoFileItem> = {};
      if (metadata.title) {
        updates.title = metadata.title.slice(0, 100);
        updates.hasGenericTitle = false;
      }
      if (metadata.description) {
        updates.description = metadata.description.slice(0, 500);
      }
      if (Object.keys(updates).length > 0) {
        onUpdate(updates);
        setAutoApplied(true);
      }
    });
    // We intentionally depend only on item.id — regenerating on every prop
    // change would cause runaway LLM calls.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  const getStatusIcon = () => {
    switch (item.status) {
      case 'queued':
        return <div className="w-5 h-5 rounded-full border-2 border-muted-foreground" />;
      case 'uploading':
        return <Loader2 className="w-5 h-5 animate-spin text-primary" />;
      case 'done':
        return <Check className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusBadge = () => {
    const variants: Record<VideoFileItem['status'], string> = {
      queued: 'bg-muted text-muted-foreground',
      uploading: 'bg-blue-100 text-blue-700',
      processing: 'bg-purple-100 text-purple-700',
      done: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
    };

    return (
      <Badge className={cn('text-xs', variants[item.status])}>
        {item.status}
      </Badge>
    );
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="border rounded-lg">
        {/* Collapsed View */}
        <div className="flex items-center gap-3 p-3">
          {getStatusIcon()}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium text-sm truncate">{item.title}</p>
              {autoMetadata.loading && item.status === 'queued' && (
                <Badge className="text-xs bg-violet-100 text-violet-700 border-0">
                  <Sparkles className="w-3 h-3 mr-1 animate-pulse" />
                  {t('screens.community.analyzing')}
                </Badge>
              )}
              {autoApplied && !autoMetadata.loading && item.status === 'queued' && (
                <Badge className="text-xs bg-violet-100 text-violet-700 border-0">
                  <Sparkles className="w-3 h-3 mr-1" />
                  {t('screens.community.smartfilled')}
                </Badge>
              )}
              {item.hasGenericTitle && item.status === 'queued' && !autoMetadata.loading && (
                <Badge variant="destructive" className="text-xs animate-pulse">
                  {t('screens.community.needsTitle')}
                </Badge>
              )}
              {getStatusBadge()}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{t('screens.community.value0Mb', { value0: (item.file.size / 1024 / 1024).toFixed(1) })}</span>
              {item.duration && (
                <span>{Math.floor(item.duration / 60)}:{(item.duration % 60).toString().padStart(2, '0')}</span>
              )}
              {item.error && (
                <span className="text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {item.error}
                </span>
              )}
            </div>
            
            {item.status === 'uploading' && (
              <Progress value={item.progress} className="h-1 mt-2" />
            )}
          </div>

          <div className="flex items-center gap-1">
            {item.status === 'failed' && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onRetry}
              >
                {t('screens.community.retry')}
              </Button>
            )}
            {item.status !== 'uploading' && item.status !== 'done' && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onRemove}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant={item.hasGenericTitle && item.status === 'queued' ? "default" : "ghost"}
                className={cn(
                  item.hasGenericTitle && item.status === 'queued' && "animate-pulse"
                )}
                id={`expand-${item.id}`}
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {!isExpanded && item.hasGenericTitle && item.status === 'queued' && (
                  <span className="ml-1 text-xs">{t('screens.community.edit')}</span>
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        {/* Expanded View */}
        <CollapsibleContent>
          <div className="border-t p-4 space-y-4 bg-muted/20">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`title-${item.id}`} className="text-sm">{t('screens.community.title')}</Label>
                <Input
                  id={`title-${item.id}`}
                  value={item.title}
                  onChange={(e) => onUpdate({ 
                    title: e.target.value.slice(0, 100),
                    hasGenericTitle: false
                  })}
                  placeholder={t('screens.community.videoTitle')}
                  disabled={item.status === 'uploading' || item.status === 'done'}
                  className={cn(
                    item.hasGenericTitle && "border-destructive focus-visible:ring-destructive"
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`topic-${item.id}`} className="text-sm">{t('screens.community.topic')}</Label>
                <select
                  id={`topic-${item.id}`}
                  value={item.topic}
                  onChange={(e) => onUpdate({ topic: e.target.value })}
                  disabled={item.status === 'uploading' || item.status === 'done'}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  {VIDEO_TOPICS.map(topic => (
                    <option key={topic} value={topic}>{topic}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`description-${item.id}`} className="text-sm">{t('screens.community.description')}</Label>
              <Textarea
                id={`description-${item.id}`}
                value={item.description}
                onChange={(e) => onUpdate({ description: e.target.value.slice(0, 500) })}
                placeholder={t('screens.community.describeYourVideo')}
                disabled={item.status === 'uploading' || item.status === 'done'}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">{t('screens.community.tags')}</Label>
              <div className="flex flex-wrap gap-2">
                {PREDEFINED_TAGS.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      const newTags = item.tags.includes(tag)
                        ? item.tags.filter(t => t !== tag)
                        : [...item.tags, tag];
                      onUpdate({ tags: newTags });
                    }}
                    disabled={item.status === 'uploading' || item.status === 'done'}
                    className={cn(
                      'px-2 py-1 text-xs rounded-full transition-colors',
                      item.tags.includes(tag)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary hover:bg-secondary/80'
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">{t('screens.community.visibility')}</Label>
              <div className="flex gap-2">
                {(['public', 'unlisted', 'private'] as const).map(vis => (
                  <Button
                    key={vis}
                    type="button"
                    size="sm"
                    variant={item.visibility === vis ? 'default' : 'outline'}
                    onClick={() => onUpdate({ visibility: vis })}
                    disabled={item.status === 'uploading' || item.status === 'done'}
                    className="capitalize"
                  >
                    {vis}
                  </Button>
                ))}
              </div>
            </div>

            <ThumbnailPicker item={item} onUpdate={onUpdate} />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function BulkVideoUploadModal({ open, onOpenChange, onUploadComplete }: BulkVideoUploadModalProps) {
  const queryClient = useQueryClient();
  const [titlePattern, setTitlePattern] = useState('{base}');
  const [sharedDescription, setSharedDescription] = useState('');
  const [sharedTags, setSharedTags] = useState<string[]>([]);
  const [sharedTopic, setSharedTopic] = useState('General');
  const [sharedVisibility, setSharedVisibility] = useState<'public' | 'unlisted' | 'private'>('public');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const {
    items,
    isUploading,
    activeUploads,
    addFiles,
    updateItem,
    removeItem,
    uploadAll,
    retryItem,
    clearCompleted,
  } = useBulkVideoUpload();

  const applyTitlePattern = (baseTitle: string, index: number): string => {
    const today = new Date();
    const dateStr = fmtDate(today, { month: 'short', day: 'numeric', year: 'numeric' });
    
    return titlePattern
      .replace(/\{base\}/g, baseTitle)
      .replace(/\{index\}/g, (index + 1).toString())
      .replace(/\{date\}/g, dateStr);
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files) return;
    
    const filesArray = Array.from(files);
    const newItems = await addFiles(filesArray, {
      description: sharedDescription,
      tags: sharedTags,
      topic: sharedTopic,
      visibility: sharedVisibility,
    });

    // Apply title pattern to each item after creation
    if (titlePattern && titlePattern !== '{base}') {
      newItems.forEach((item, index) => {
        const baseTitle = item.title; // Already humanized by addFiles
        const patternedTitle = applyTitlePattern(baseTitle, items.length + index);
        updateItem(item.id, { title: patternedTitle });
      });
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleSubmit = async () => {
    await uploadAll(3);
    await queryClient.invalidateQueries({ queryKey: ['shorts'] });
    onUploadComplete?.();
  };

  const queuedCount = items.filter(i => i.status === 'queued').length;
  const uploadingCount = items.filter(i => i.status === 'uploading').length;
  const doneCount = items.filter(i => i.status === 'done').length;
  const failedCount = items.filter(i => i.status === 'failed').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{t('screens.community.bulkVideoUpload')}</span>
            {items.length > 0 && (
              <div className="flex items-center gap-2 text-sm font-normal">
                <Badge variant="outline">{t('screens.community.queuedcountQueued', { queuedCount })}</Badge>
                {uploadingCount > 0 && <Badge className="bg-blue-100 text-blue-700">{t('screens.community.uploadingcountUploading', { uploadingCount })}</Badge>}
                {doneCount > 0 && <Badge className="bg-green-100 text-green-700">{t('screens.community.donecountDone', { doneCount })}</Badge>}
                {failedCount > 0 && <Badge className="bg-red-100 text-red-700">{t('screens.community.failedcountFailed', { failedCount })}</Badge>}
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Drop Zone */}
          <div
            ref={dropZoneRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              items.length > 0 ? "border-border" : "border-muted-foreground/25 hover:border-primary"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="video/mp4,video/webm,video/ogg"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
              disabled={isUploading}
            />
            <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-lg font-medium mb-1">
              {items.length === 0 ? 'Drop videos here or click to browse' : 'Add more videos'}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {t('screens.community.mp4WebmOggMax500mbPer')}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {t('screens.community.selectFiles')}
            </Button>
          </div>

          {/* Shared Metadata */}
          {items.length > 0 && (
            <div className="border rounded-lg p-4 bg-muted/20 space-y-4">
              <h3 className="font-semibold text-sm">{t('screens.community.applyAllVideosOptional')}</h3>
              <div className="space-y-2 bg-muted/50 p-4 rounded-lg border border-border">
                <div className="flex items-center justify-between">
                  <Label htmlFor="titlePattern" className="text-sm font-medium">
                    {t('screens.community.titlePatternRecommended')}
                  </Label>
                  <Badge variant="outline" className="text-xs">{t('screens.community.tip')}</Badge>
                </div>
                <Input
                  id="titlePattern"
                  placeholder={t('screens.community.eGMySeriesPart')}
                  value={titlePattern}
                  onChange={(e) => setTitlePattern(e.target.value)}
                  disabled={isUploading}
                  className="font-mono"
                />
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {t('screens.community.use')} <code className="px-1 py-0.5 bg-muted rounded">{'{base}'}</code>{t('screens.community.forFilename')} 
                    <code className="px-1 py-0.5 bg-muted rounded ml-1">{'{index}'}</code>{t('screens.community.forNumber')} 
                    <code className="px-1 py-0.5 bg-muted rounded ml-1">{'{date}'}</code>{t('screens.community.forTodaySDate')}
                  </p>
                  {titlePattern !== '{base}' && items.length > 0 && (
                    <div className="bg-background p-2 rounded text-xs border border-border">
                      <strong className="text-muted-foreground">{t('screens.community.preview')}</strong> 
                      <span className="ml-2 text-foreground">
                        {applyTitlePattern(items[0]?.title.replace(/download/i, 'Video') || 'Example', 0)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">{t('screens.community.topic')}</Label>
                <select
                  value={sharedTopic}
                  onChange={(e) => setSharedTopic(e.target.value)}
                  disabled={isUploading}
                  className="h-10 px-3 rounded-md border border-input bg-background w-full"
                >
                  {VIDEO_TOPICS.map(topic => (
                    <option key={topic} value={topic}>{topic}</option>
                  ))}
                </select>
              </div>
              <Textarea
                placeholder={t('screens.community.sharedDescription')}
                value={sharedDescription}
                onChange={(e) => setSharedDescription(e.target.value)}
                disabled={isUploading}
                rows={2}
              />
              <div className="flex flex-wrap gap-2">
                {PREDEFINED_TAGS.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setSharedTags(prev =>
                        prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                      );
                    }}
                    disabled={isUploading}
                    className={cn(
                      'px-2 py-1 text-xs rounded-full transition-colors',
                      sharedTags.includes(tag)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary hover:bg-secondary/80'
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Generic title warning */}
          {items.some(item => item.status === 'queued' && item.hasGenericTitle) && (
            <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                    {t('screens.community.someVideosNeedBetterTitles')}
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-3">{t('screens.community.videosWithGenericTitlesLikeDownload')}
                    <ChevronDown className="w-3 h-3 inline" />{t('screens.community.eachVideoEditTitleAddTags')}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        items.forEach((item) => {
                          if (item.hasGenericTitle && item.status === 'queued') {
                            document.getElementById(`expand-${item.id}`)?.click();
                          }
                        });
                      }}
                      className="text-xs"
                    >{t('screens.community.expandAll')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        items.forEach((item, index) => {
                          if (item.hasGenericTitle && item.status === 'queued') {
                            const newTitle = titlePattern !== '{base}' 
                              ? applyTitlePattern('Video', index)
                              : `Video ${index + 1}`;
                            updateItem(item.id, { 
                              title: newTitle,
                              hasGenericTitle: false 
                            });
                          }
                        });
                      }}
                      className="text-xs"
                    >{t('screens.community.autorenameWithPattern')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Queue List */}
          {items.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{t('screens.community.uploadQueueLength', { length: items.length })}</h3>
                {doneCount > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearCompleted}
                    disabled={isUploading}
                  >{t('screens.community.clearCompleted')}
                  </Button>
                )}
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {items.map(item => (
                  <VideoItemRow
                    key={item.id}
                    item={item}
                    onUpdate={(updates) => updateItem(item.id, updates)}
                    onRemove={() => removeItem(item.id)}
                    onRetry={() => retryItem(item.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {items.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : 'Cancel'}
              </Button>
              <div className="flex items-center gap-2">
                {activeUploads > 0 && (
                  <span className="text-sm text-muted-foreground">{t('screens.community.activeuploadsActiveUploadValue1', { activeUploads, value1: activeUploads > 1 ? 's' : '' })}</span>
                )}
                <Button
                  onClick={handleSubmit}
                  disabled={
                    queuedCount === 0 || 
                    isUploading ||
                    items.some(item => item.status === 'queued' && item.hasGenericTitle)
                  }
                  className="bg-gradient-to-r from-violet-500 to-sky-400 hover:from-violet-600 hover:to-sky-500"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('screens.community.publishing')}
                    </>
                  ) : items.some(item => item.status === 'queued' && item.hasGenericTitle) ? (
                    <>
                      <AlertCircle className="w-4 h-4 mr-2" />
                      {t('screens.community.fixTitlesBeforeUploading')}
                    </>
                  ) : (
                    `Publish All (${queuedCount})`
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
