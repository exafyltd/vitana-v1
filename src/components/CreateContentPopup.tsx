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
import { notify } from '@/lib/i18n-toast';

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
            Create New Content
          </DialogTitle>
        </DialogHeader>

        <Tabs value={contentType} onValueChange={setContentType} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="post" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Post
            </TabsTrigger>
            <TabsTrigger value="article" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Article
            </TabsTrigger>
            <TabsTrigger value="media" className="flex items-center gap-2">
              <Image className="w-4 h-4" />
              Media
            </TabsTrigger>
          </TabsList>

          <TabsContent value="post" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Share Your Thoughts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="content">What's on your mind?</Label>
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
                    <Label htmlFor="category">Category</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="fitness">Fitness</SelectItem>
                        <SelectItem value="nutrition">Nutrition</SelectItem>
                        <SelectItem value="mental-health">Mental Health</SelectItem>
                        <SelectItem value="progress">Progress Update</SelectItem>
                        <SelectItem value="question">Question</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="visibility">Visibility</Label>
                    <Select value={formData.visibility} onValueChange={(value) => setFormData({...formData, visibility: value})}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="friends">Friends Only</SelectItem>
                        <SelectItem value="groups">Groups Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Tags</Label>
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
                <CardTitle className="text-lg">Write an Article</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Article Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="e.g., 5 Tips for Better Sleep, My Fitness Journey"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    placeholder="Write your article content here..."
                    className="mt-1 min-h-[200px]"
                  />
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wellness-tips">Wellness Tips</SelectItem>
                      <SelectItem value="personal-story">Personal Story</SelectItem>
                      <SelectItem value="how-to">How-To Guide</SelectItem>
                      <SelectItem value="research">Research & Studies</SelectItem>
                      <SelectItem value="recipes">Recipes</SelectItem>
                      <SelectItem value="workouts">Workouts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="media" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Share Media</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">Upload Media</p>
                  <p className="text-muted-foreground mb-4">Drag and drop or click to select files</p>
                  <Button variant="outline">
                    Choose Files
                  </Button>
                </div>

                <div>
                  <Label htmlFor="title">Caption</Label>
                  <Textarea
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Add a caption to your media..."
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Tags</Label>
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
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="flex-1">
            {contentType === "post" ? "Share Post" : contentType === "article" ? "Publish Article" : "Upload Media"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}