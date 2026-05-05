import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MapPin, Calendar, Clock, X, AlertCircle, Plus } from "lucide-react";
import { useCommunityEvents } from "@/hooks/useCommunityEvents";
import { useToast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";
import { notify, notifyError } from '@/lib/i18n-toast';

interface CreateMeetupPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated?: (eventId: string) => void;
}

export function CreateMeetupPopup({ isOpen, onClose, onEventCreated }: CreateMeetupPopupProps) {
  const { createEvent } = useCommunityEvents();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customTime, setCustomTime] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    date: "",
    time: "",
    duration: "",
    customDuration: "",
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
  
  const availableTags = [
    'Beginner Friendly', 'Outdoor', 'Indoor', 'Free', 'Family Friendly', 
    'Adults Only', 'Bring Equipment', 'Materials Provided', 'Expert Led',
    'Group Activity', 'Individual Focus', 'Certification Available'
  ];

// Auto-generate image based on content
const generateImageUrl = (title: string, description: string) => {
  const text = `${title} ${description || ''}`.toLowerCase();
  const build = (t: string) => `https://placehold.co/1200x800?text=${encodeURIComponent(t)}`;
  
  if (text.includes('yoga') || text.includes('meditation') || text.includes('mindfulness')) {
    return build('Yoga & Meditation');
  }
  if (text.includes('cooking') || text.includes('nutrition') || text.includes('food') || text.includes('recipe')) {
    return build('Healthy Cooking');
  }
  if (text.includes('hiking') || text.includes('outdoor') || text.includes('nature') || text.includes('trail')) {
    return build('Outdoor Adventure');
  }
  if (text.includes('fitness') || text.includes('workout') || text.includes('exercise') || text.includes('hiit')) {
    return build('Fitness Training');
  }
  if (text.includes('stress') || text.includes('mental') || text.includes('therapy') || text.includes('wellness')) {
    return build('Mental Wellness');
  }
  if (text.includes('sleep') || text.includes('rest') || text.includes('recovery')) {
    return build('Sleep & Recovery');  
  }
  if (text.includes('social') || text.includes('networking') || text.includes('community')) {
    return build('Community Social');
  }
  
  return build('Community Meetup');
};

  // Helper function to generate time options in 15-minute intervals
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
      notifyError('toasts.common.formIncomplete', 'toasts.common.pleaseFillAllRequiredFields');
      return;
    }

    // Check if date/time is in the past
    const selectedDateTime = new Date(`${formData.date}T${formData.time}`);
    const now = new Date();
    if (selectedDateTime < now) {
      notifyError('toasts.common.invalidDate', 'toasts.common.youCannotCreateMeetupPastPlease');
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
        let minutes = 60; // default
        
        if (formData.duration === "custom") {
          // Parse custom duration (e.g., "1.5" hours or "90" minutes)
          const customValue = parseFloat(formData.customDuration);
          if (!isNaN(customValue) && customValue > 0) {
            minutes = Math.round(customValue * 60); // Assume hours input
          }
        } else {
          const durationMap = {
            "30min": 30,
            "1hour": 60,
            "2hour": 120,
            "half-day": 240,
            "full-day": 480
          } as const;
          minutes = durationMap[formData.duration as keyof typeof durationMap] || 60;
        }
        
        start.setMinutes(start.getMinutes() + minutes);
        endTime = start.toISOString();
      }

      // Upload selected image to Supabase Storage (covers) and use permanent public URL
      let uploadedImageUrl: string | undefined;
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
          notify('toasts.common.imageUploadFailed', 'toasts.common.weLlUseAutomaticFallbackImage');
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
        image_url: uploadedImageUrl || generateImageUrl(formData.title, formData.description),
      };

      const result = await createEvent(eventData);
      
      if (result.success) {
        notify('toasts.common.meetupCreated', 'toasts.common.yourMeetupHasSuccessfullyCreatedWill');
        
        // Call the callback FIRST (before closing) to allow parent to handle event display
        if (onEventCreated && result.eventId) {
          console.log('🎯 Meetup created, calling handler:', result.eventId);
          onEventCreated(result.eventId);
        }
        
        // Then close and reset after a small delay to ensure smooth transition
        setTimeout(() => {
          onClose();
          setFormData({
            title: "",
            description: "",
            category: "",
            date: "",
            time: "",
            duration: "",
            customDuration: "",
            location: "",
            isVirtual: false,
            capacity: "",
            requirements: "",
            isRecurring: false,
            recurringType: "weekly",
            imageUrl: ""
          });
          setSelectedTags([]);
          setSelectedImage(null);
          setErrors({});
        }, 100);
        
        // Fallback navigation only if no callback was provided
        if (!onEventCreated && result.eventId) {
          // Fallback: determine correct tab and navigate
          const eventDate = new Date(startTime);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          
          const tab = (eventDate >= today && eventDate < tomorrow) ? 'today' : 'upcoming';
          
          // Dispatch custom event for potential listeners
          window.dispatchEvent(new CustomEvent('community:event-created', { 
            detail: { id: result.eventId, start_time: startTime } 
          }));
          
          // Navigate to Events & MeetUps with event and tab parameters (SPA navigation)
          window.history.pushState({}, '', `/comm/events-meetups?event=${result.eventId}&tab=${tab}`);
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      } else {
        notifyError('toasts.common.errorCreatingMeetup', 'toasts.common.thereIssueCreatingYourMeetupPlease');
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
            Create New Meetup
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
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.duration === "custom" && (
                <div>
                  <Label htmlFor="customDuration">Custom Duration (hours)</Label>
                  <Input
                    id="customDuration"
                    type="number"
                    step="0.5"
                    min="0.5"
                    placeholder="e.g., 1.5"
                    value={formData.customDuration}
                    onChange={(e) => setFormData({...formData, customDuration: e.target.value})}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Enter duration in hours (e.g., 1.5 for 90 minutes)</p>
                </div>
              )}

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

              <div>
                <Label>Meetup Image</Label>
                <div className="mt-2 space-y-4">
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
                      Upload Custom Image
                    </Button>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground">
                      💡 Meetup image will be automatically generated based on your title and description
                    </p>
                  </div>

                  {formData.imageUrl && (
                    <div className="border rounded p-2">
                      <p className="text-sm text-muted-foreground mb-2">Selected image:</p>
                      <img 
                        src={formData.imageUrl} 
                        alt="Preview" 
                        className="w-full h-32 object-cover rounded"
                      />
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
                    min={new Date().toISOString().split('T')[0]}
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
                  <Select 
                    value={generateTimeOptions().includes(formData.time) ? formData.time : formData.time ? "custom" : ""} 
                    onValueChange={(value) => {
                      if (value === "custom") {
                        setFormData({...formData, time: customTime || ""});
                      } else {
                        setFormData({...formData, time: value});
                      }
                    }}
                  >
                    <SelectTrigger className={`mt-1 ${errors.time ? 'border-destructive' : ''}`}>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {generateTimeOptions().map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">Custom time...</SelectItem>
                    </SelectContent>
                  </Select>
                  {formData.time && !generateTimeOptions().includes(formData.time) && (
                    <Input
                      type="time"
                      value={customTime}
                      onChange={(e) => {
                        setCustomTime(e.target.value);
                        setFormData({...formData, time: e.target.value});
                      }}
                      className={`mt-2 ${errors.time ? 'border-destructive' : ''}`}
                      placeholder="HH:MM"
                    />
                  )}
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

              <div className="grid grid-cols-2 gap-4">
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

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <Label>Recurring Meetup</Label>
                      <p className="text-sm text-muted-foreground">Create a repeating event</p>
                    </div>
                    <Switch 
                      checked={formData.isRecurring}
                      onCheckedChange={(checked) => setFormData({...formData, isRecurring: checked})}
                    />
                  </div>
                  {formData.isRecurring && (
                    <div>
                      <Label htmlFor="recurringType">Frequency</Label>
                      <Select value={formData.recurringType} onValueChange={(value) => setFormData({...formData, recurringType: value})}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="requirements">Requirements (Optional)</Label>
                <Textarea
                  id="requirements"
                  value={formData.requirements}
                  onChange={(e) => setFormData({...formData, requirements: e.target.value})}
                  placeholder="Any equipment, preparation, or prerequisites needed..."
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="flex-1" disabled={loading}>
              {loading ? "Creating..." : "Create Meetup"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}