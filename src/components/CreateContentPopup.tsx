import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Image, Video, FileText, X, Upload } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { notify, t } from '@/lib/i18n-toast';

interface CreateContentPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateContentPopup({ isOpen, onClose }: CreateContentPopupProps) {
  const { toast } = useToast();
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

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = () => {
    const contentTypeText = contentType === "post" ? "Post" : contentType === "article" ? "Article" : "Media";
    notify('toasts.common.contentCreated');
    onClose();
    setFormData({
      title: "",
      content: "",
      category: "",
      visibility: "public",
      allowComments: true
    });
    setSelectedTags([]);
  };

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
                    placeholder="Share your thoughts, progress, tips, or ask a question..."
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
                    placeholder="e.g., 5 Tips for Better Sleep, My Fitness Journey"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="content">{t('screens.common.content')}</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    placeholder="Write your article content here..."
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
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">{t('screens.common.uploadMedia')}</p>
                  <p className="text-muted-foreground mb-4">{t('screens.common.dragDropClickSelectFiles')}</p>
                  <Button variant="outline">
                    {t('screens.common.chooseFiles')}
                  </Button>
                </div>

                <div>
                  <Label htmlFor="title">{t('screens.common.caption')}</Label>
                  <Textarea
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Add a caption to your media..."
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
          <Button variant="outline" onClick={onClose} className="flex-1">
            {t('screens.common.cancel')}
          </Button>
          <Button onClick={handleSubmit} className="flex-1">
            {contentType === "post" ? "Share Post" : contentType === "article" ? "Publish Article" : "Upload Media"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}