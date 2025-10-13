import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MapPin, Calendar, Clock, X, AlertCircle, Plus, Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { useCommunityEvents } from "@/hooks/useCommunityEvents";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CommunityEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  location: string | null;
  virtual_link: string | null;
  start_time: string;
  end_time: string | null;
  max_participants: number | null;
  participant_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  image_url?: string;
}

interface EditMeetupPopupProps {
  isOpen: boolean;
  onClose: () => void;
  event: CommunityEvent;
}

export function EditMeetupPopup({ isOpen, onClose, event }: EditMeetupPopupProps) {
  const { updateEvent } = useCommunityEvents();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    date: "",
    time: "",
    duration: "",
    location: "",
    isVirtual: false,
    capacity: "",
    requirements: "",
    isRecurring: false,
    recurringType: "weekly",
    imageUrl: ""
  });

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImagePreview, setGeneratedImagePreview] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  const availableTags = [
    'Beginner Friendly', 'Outdoor', 'Indoor', 'Free', 'Family Friendly', 
    'Adults Only', 'Bring Equipment', 'Materials Provided', 'Expert Led',
    'Group Activity', 'Individual Focus', 'Certification Available'
  ];

  // Populate form with existing event data
  useEffect(() => {
    if (event && isOpen) {
      const startDate = new Date(event.start_time);
      const endDate = event.end_time ? new Date(event.end_time) : null;
      
      // Calculate duration
      let duration = "";
      if (endDate) {
        const diffMs = endDate.getTime() - startDate.getTime();
        const diffMinutes = Math.round(diffMs / (1000 * 60));
        if (diffMinutes === 30) duration = "30min";
        else if (diffMinutes === 60) duration = "1hour";
        else if (diffMinutes === 120) duration = "2hour";
        else if (diffMinutes === 240) duration = "half-day";
        else if (diffMinutes === 480) duration = "full-day";
      }

      setFormData({
        title: event.title || "",
        description: event.description || "",
        category: "",
        date: startDate.toISOString().split('T')[0],
        time: startDate.toTimeString().slice(0, 5),
        duration,
        location: event.location || "",
        isVirtual: !!event.virtual_link,
        capacity: event.max_participants?.toString() || "",
        requirements: "",
        isRecurring: false,
        recurringType: "weekly",
        imageUrl: event.image_url || ""
      });
    }
  }, [event, isOpen]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      // Create a temporary URL for preview
      const imageUrl = URL.createObjectURL(file);
      setFormData({...formData, imageUrl});
    }
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleGenerateImage = async () => {
    setIsGeneratingImage(true);
    setGenerationError(null);
    
    try {
      const startTime = new Date(`${formData.date}T${formData.time}`);
      const timeOfDay = startTime.getHours() < 12 ? 'morning' : startTime.getHours() < 18 ? 'afternoon' : 'evening';

      const { data, error } = await supabase.functions.invoke('generate-event-image', {
        body: {
          eventId: event.id,
          title: formData.title,
          description: formData.description,
          location: formData.location,
          metadata: {
            category: formData.category,
            venue: 'venue',
            timeOfDay
          }
        }
      });
      
      if (error) throw error;
      
      if (data.success) {
        setGeneratedImagePreview(data.imageUrl);
        setFormData({...formData, imageUrl: data.imageUrl});
        
        toast({
          title: "Image Generated! ✨",
          description: "AI has created a custom image for your event.",
        });
      }
    } catch (err: any) {
      console.error('Image generation failed:', err);
      
      if (err.message?.includes('429') || err.message?.includes('Too many requests')) {
        setGenerationError('Too many requests. Please wait a moment and try again.');
      } else if (err.message?.includes('402') || err.message?.includes('credits')) {
        setGenerationError('AI credits depleted. Please add credits to continue.');
      } else {
        setGenerationError('Failed to generate image. Please try again or upload manually.');
      }
      
      toast({
        title: "Generation Failed",
        description: generationError || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Meetup title is required";
    }
    if (!formData.date) {
      newErrors.date = "Date is required";
    }
    if (!formData.time) {
      newErrors.time = "Time is required";
    }
    if (!formData.isVirtual && !formData.location.trim()) {
      newErrors.location = "Location is required for in-person meetups";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({
        title: "Form Incomplete",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Create ISO datetime string
      const startTime = new Date(`${formData.date}T${formData.time}`).toISOString();
      
      // Calculate end time based on duration
      let endTime: string | undefined = undefined;
      if (formData.duration) {
        const start = new Date(startTime);
        const durationMap = {
          "30min": 30,
          "1hour": 60,
          "2hour": 120,
          "half-day": 240,
          "full-day": 480
        } as const;
        const minutes = durationMap[formData.duration as keyof typeof durationMap] || 60;
        start.setMinutes(start.getMinutes() + minutes);
        endTime = start.toISOString();
      }

      // Upload selected image to Supabase Storage (covers) and use permanent public URL
      let uploadedImageUrl: string | undefined = event.image_url; // Keep existing image by default
      if (selectedImage) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          const ext = selectedImage.name.split('.').pop() || 'jpg';
          const fileName = `${Date.now()}.${ext}`;
          const filePath = `${(user?.id ?? 'public')}/${fileName}`;
          const { error: uploadError } = await supabase.storage.from('covers').upload(filePath, selectedImage, {
            upsert: true,
            contentType: selectedImage.type,
          });
          if (uploadError) throw uploadError;
          const { data: pub } = supabase.storage.from('covers').getPublicUrl(filePath);
          uploadedImageUrl = pub.publicUrl;
        } catch (e) {
          console.error('Image upload failed:', e);
          toast({
            title: "Image upload failed",
            description: "We'll keep the existing image.",
            variant: "default",
          });
        }
      }

      const eventData = {
        title: formData.title,
        description: formData.description || undefined,
        event_type: 'meetup',
        location: formData.isVirtual ? undefined : formData.location || undefined,
        virtual_link: formData.isVirtual ? 'Virtual Event' : undefined,
        start_time: startTime,
        end_time: endTime,
        max_participants: formData.capacity ? parseInt(formData.capacity) : undefined,
        image_url: uploadedImageUrl,
      };

      const result = await updateEvent(event.id, eventData);
      
      if (result.success) {
        toast({
          title: "Meetup Updated!",
          description: "Your meetup has been successfully updated.",
        });
        onClose();
        setErrors({});
      } else {
        toast({
          title: "Error Updating Meetup",
          description: "There was an issue updating your meetup. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-orange-600" />
            Edit Meetup
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Meetup Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Meetup Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g., Weekend Hiking Adventure, Meditation Circle"
                  className={`mt-1 ${errors.title ? 'border-destructive' : ''}`}
                />
                {errors.title && (
                  <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.title}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe your meetup, what participants can expect..."
                  className="mt-1"
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
                      <SelectItem value="fitness">Fitness & Exercise</SelectItem>
                      <SelectItem value="outdoor">Outdoor Activities</SelectItem>
                      <SelectItem value="wellness">Wellness & Mindfulness</SelectItem>
                      <SelectItem value="social">Social & Networking</SelectItem>
                      <SelectItem value="learning">Learning & Workshops</SelectItem>
                      <SelectItem value="support">Support & Community</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="duration">Duration</Label>
                  <Select value={formData.duration} onValueChange={(value) => setFormData({...formData, duration: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30min">30 minutes</SelectItem>
                      <SelectItem value="1hour">1 hour</SelectItem>
                      <SelectItem value="2hour">2 hours</SelectItem>
                      <SelectItem value="half-day">Half day</SelectItem>
                      <SelectItem value="full-day">Full day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Meetup Image</Label>
                <div className="mt-2 space-y-4">
                  <Button 
                    type="button" 
                    variant="default"
                    onClick={handleGenerateImage}
                    disabled={isGeneratingImage || !formData.title}
                    className="w-full relative"
                  >
                    {isGeneratingImage ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating with AI...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Image with AI
                      </>
                    )}
                  </Button>
                  
                  {generationError && (
                    <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                      <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
                      <p className="text-sm text-destructive">{generationError}</p>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">or</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => document.getElementById('image-upload')?.click()}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Upload New Image Manually
                    </Button>
                  </div>

                  {formData.imageUrl && (
                    <div className="border rounded p-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          {generatedImagePreview === formData.imageUrl ? "AI Generated" : "Current image"}:
                        </p>
                        {generatedImagePreview === formData.imageUrl && (
                          <Badge variant="secondary" className="gap-1">
                            <Sparkles className="w-3 h-3" />
                            AI Generated
                          </Badge>
                        )}
                      </div>
                      <img 
                        src={formData.imageUrl} 
                        alt="Preview" 
                        className="w-full h-48 object-cover rounded"
                      />
                      {generatedImagePreview === formData.imageUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleGenerateImage}
                          disabled={isGeneratingImage}
                          className="w-full"
                        >
                          <RefreshCw className="w-3 h-3 mr-2" />
                          Regenerate
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Schedule & Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className={`mt-1 ${errors.date ? 'border-destructive' : ''}`}
                  />
                  {errors.date && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.date}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="time">Time *</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({...formData, time: e.target.value})}
                    className={`mt-1 ${errors.time ? 'border-destructive' : ''}`}
                  />
                  {errors.time && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.time}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Virtual Meetup</Label>
                  <p className="text-sm text-muted-foreground">This meetup will be held online</p>
                </div>
                <Switch 
                  checked={formData.isVirtual}
                  onCheckedChange={(checked) => setFormData({...formData, isVirtual: checked})}
                />
              </div>

              {!formData.isVirtual && (
                <div>
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    placeholder="e.g., Central Park, Community Center, Local Gym"
                    className={`mt-1 ${errors.location ? 'border-destructive' : ''}`}
                  />
                  {errors.location && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.location}
                    </p>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="capacity">Max Participants</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                  placeholder="Leave empty for unlimited"
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Updating..." : "Update Meetup"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}