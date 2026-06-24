import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Image, FileText, X, Upload, Loader2 } from "lucide-react";
import { useProfilePosts } from "@/hooks/useProfilePosts";
import { supabase } from "@/integrations/supabase/client";
import { notify, notifyError, t } from '@/lib/i18n-toast';

interface CreateContentPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

// Mirrors the limits enforced by MobileCreatePostSheet so both composers behave
// consistently against the shared `media-uploads` bucket.
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const BUCKET_MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB (bucket hard limit)
const MAX_COMPRESSIBLE_VIDEO_BYTES = 300 * 1024 * 1024; // 300 MB

type MediaKind = "image" | "video";

export function CreateContentPopup({ isOpen, onClose }: CreateContentPopupProps) {
  const [contentType, setContentType] = useState("post");
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "",
    visibility: "public",
    allowComments: true
  });

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const availableTags = ["Tips", "Motivation", "Progress", "Question", "Achievement", "Recipe", "Workout", "Community"];

  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaKind, setMediaKind] = useState<MediaKind | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressProgress, setCompressProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronous re-entrancy lock: media upload happens before the mutation, so
  // `createPost.isPending` lags and rapid clicks could otherwise fire handleSubmit
  // multiple times, inserting duplicate posts. The ref blocks re-entry instantly.
  const submittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { createPost } = useProfilePosts();
  const isBusy = createPost.isPending || isCompressing || isSubmitting;

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // allow re-selecting the same file

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      notifyError("toasts.profile.onlyImagesOrVideosAllowed");
      return;
    }
    if (isImage && file.size > MAX_IMAGE_BYTES) {
      notifyError("toasts.profile.imageMustUnder10mb");
      return;
    }
    if (isVideo && file.size > MAX_COMPRESSIBLE_VIDEO_BYTES) {
      notifyError("toasts.profile.videoTooLargeToCompress");
      return;
    }

    try {
      // Materialize into memory immediately to avoid Android file-descriptor issues.
      const buffer = await file.arrayBuffer();
      const materialized = new File([buffer], file.name, { type: file.type, lastModified: file.lastModified });
      if (mediaPreview) URL.revokeObjectURL(mediaPreview);
      setMediaFile(materialized);
      setMediaPreview(URL.createObjectURL(materialized));
      setMediaKind(isVideo ? "video" : "image");
    } catch {
      notifyError("toasts.profile.couldNotReadSelectedFile");
    }
  };

  const removeMedia = () => {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaFile(null);
    setMediaPreview(null);
    setMediaKind(null);
  };

  const resetForm = () => {
    setFormData({ title: "", content: "", category: "", visibility: "public", allowComments: true });
    setSelectedTags([]);
    removeMedia();
    setIsCompressing(false);
    setCompressProgress(0);
  };

  /** Upload the selected media to the shared bucket and return its public URL. */
  const uploadMedia = async (userId: string): Promise<{ imageUrl?: string; videoUrl?: string }> => {
    if (!mediaFile || !mediaKind) return {};
    let fileToUpload = mediaFile;

    if (mediaKind === "video" && mediaFile.size > BUCKET_MAX_VIDEO_BYTES) {
      setIsCompressing(true);
      setCompressProgress(0);
      try {
        const { compressVideoUnderLimit } = await import("@/lib/videoCompression");
        fileToUpload = await compressVideoUnderLimit(mediaFile, {
          onProgress: (ratio) => setCompressProgress(Math.round(ratio * 100)),
        });
      } finally {
        setIsCompressing(false);
      }
    }

    const fileExt = fileToUpload.name.split(".").pop();
    const path = `${userId}/posts/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from("media-uploads")
      .upload(path, fileToUpload, { contentType: fileToUpload.type, upsert: false });
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from("media-uploads").getPublicUrl(path);
    return mediaKind === "video" ? { videoUrl: publicUrl } : { imageUrl: publicUrl };
  };

  /**
   * Compose the post body from the active tab. `profile_posts` only stores a
   * single `content` string (plus media + is_public), so the article title is
   * folded into the body and selected tags are appended as hashtags rather than
   * being silently dropped.
   */
  const buildContent = (): string => {
    const parts: string[] = [];
    if (contentType === "article" && formData.title.trim()) parts.push(formData.title.trim());
    const body = contentType === "media" ? formData.title.trim() : formData.content.trim();
    if (body) parts.push(body);
    if (selectedTags.length) parts.push(selectedTags.map((tag) => `#${tag}`).join(" "));
    return parts.join("\n\n").trim();
  };

  const handleSubmit = async () => {
    const content = buildContent();
    // Require something to publish: text, or media on the media tab.
    if (!content && !mediaFile) return;
    // Hard guard against double/triple submit (see submittingRef above).
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const media = await uploadMedia(user.id);
      await createPost.mutateAsync({
        content,
        imageUrl: media.imageUrl,
        videoUrl: media.videoUrl,
        isPublic: formData.visibility === "public",
      });

      notify("toasts.common.contentCreated");
      resetForm();
      onClose();
    } catch {
      notifyError("toasts.common.contentCreateFailed");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const canSubmit =
    contentType === "media"
      ? !!mediaFile || formData.title.trim().length > 0
      : contentType === "article"
        ? formData.title.trim().length > 0 || formData.content.trim().length > 0
        : formData.content.trim().length > 0;

  const submitLabel =
    contentType === "post"
      ? t('screens.common.sharePost')
      : contentType === "article"
        ? t('screens.common.publishArticle')
        : t('screens.common.uploadMedia');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-purple-600" />
            {t('screens.common.createNewContent')}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={contentType} onValueChange={setContentType} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="post" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              {t('screens.common.post')}
            </TabsTrigger>
            <TabsTrigger value="article" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {t('screens.common.article')}
            </TabsTrigger>
            <TabsTrigger value="media" className="flex items-center gap-2">
              <Image className="w-4 h-4" />
              {t('screens.common.media')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="post" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('screens.common.shareYourThoughts')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="content">{t('screens.common.whatSYourMind')}</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    placeholder={t('screens.common.shareYourThoughtsProgressTipsAsk')}
                    className="mt-1 min-h-[120px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">{t('screens.common.category')}</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={t('screens.common.selectCategory')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">{t('screens.common.general')}</SelectItem>
                        <SelectItem value="fitness">{t('screens.common.fitness')}</SelectItem>
                        <SelectItem value="nutrition">{t('screens.common.nutrition')}</SelectItem>
                        <SelectItem value="mental-health">{t('screens.common.mentalHealth')}</SelectItem>
                        <SelectItem value="progress">{t('screens.common.progressUpdate')}</SelectItem>
                        <SelectItem value="question">{t('screens.common.question')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="visibility">{t('screens.common.visibility')}</Label>
                    <Select value={formData.visibility} onValueChange={(value) => setFormData({...formData, visibility: value})}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">{t('screens.common.public')}</SelectItem>
                        <SelectItem value="friends">{t('screens.common.friendsOnly')}</SelectItem>
                        <SelectItem value="groups">{t('screens.common.groupsOnly')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>{t('screens.common.tags')}</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {availableTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant={selectedTags.includes(tag) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => handleTagToggle(tag)}
                      >
                        {tag}
                        {selectedTags.includes(tag) && <X className="w-3 h-3 ml-1" />}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="article" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('screens.common.writeArticle')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">{t('screens.common.articleTitle')}</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder={t('screens.common.eG5TipsForBetter')}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="content">{t('screens.common.content')}</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    placeholder={t('screens.common.writeYourArticleContentHere')}
                    className="mt-1 min-h-[200px]"
                  />
                </div>

                <div>
                  <Label htmlFor="category">{t('screens.common.category')}</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={t('screens.common.selectCategory')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wellness-tips">{t('screens.common.wellnessTips')}</SelectItem>
                      <SelectItem value="personal-story">{t('screens.common.personalStory')}</SelectItem>
                      <SelectItem value="how-to">{t('screens.common.howtoGuide')}</SelectItem>
                      <SelectItem value="research">{t('screens.common.researchStudies')}</SelectItem>
                      <SelectItem value="recipes">{t('screens.common.recipes')}</SelectItem>
                      <SelectItem value="workouts">{t('screens.common.workouts')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="media" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('screens.common.shareMedia')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleMediaSelect}
                />
                {mediaPreview ? (
                  <div className="relative rounded-lg overflow-hidden border">
                    {mediaKind === "video" ? (
                      <video src={mediaPreview} controls playsInline className="w-full max-h-[300px] bg-black" />
                    ) : (
                      <img src={mediaPreview} alt={t('screens.profile.preview')} className="w-full max-h-[300px] object-cover" />
                    )}
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/80 backdrop-blur-sm"
                      onClick={removeMedia}
                      aria-label={t('screens.profile.removeMedia')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors"
                  >
                    <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium mb-2">{t('screens.common.uploadMedia')}</p>
                    <p className="text-muted-foreground mb-4">{t('screens.common.dragDropClickSelectFiles')}</p>
                    <span className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium">
                      {t('screens.common.chooseFiles')}
                    </span>
                  </button>
                )}

                <div>
                  <Label htmlFor="title">{t('screens.common.caption')}</Label>
                  <Textarea
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder={t('screens.common.addCaptionYourMedia')}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>{t('screens.common.tags')}</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {availableTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant={selectedTags.includes(tag) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => handleTagToggle(tag)}
                      >
                        {tag}
                        {selectedTags.includes(tag) && <X className="w-3 h-3 ml-1" />}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={isBusy}>
            {t('screens.common.cancel')}
          </Button>
          <Button onClick={handleSubmit} className="flex-1" disabled={isBusy || !canSubmit}>
            {isCompressing ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('screens.profile.compressingVideoPct', { pct: compressProgress })}</>
            ) : createPost.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('screens.common.posting')}</>
            ) : (
              submitLabel
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
