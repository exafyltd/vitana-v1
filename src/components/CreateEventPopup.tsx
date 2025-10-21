import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, MapPin, Clock, Users, Image as ImageIcon, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { useCommunityEvents } from "@/hooks/useCommunityEvents";
import { supabase } from "@/integrations/supabase/client";

interface CreateEventPopupProps {
  isOpen: boolean;
  onClose: () => void;
  eventContext?: 'personal' | 'community';
  onEventCreated?: (eventId: string) => void;
}

export function CreateEventPopup({ isOpen, onClose, eventContext, onEventCreated }: CreateEventPopupProps) {
  const { toast } = useToast();
  const { addEvent } = useCalendarEvents();
  const { createEvent } = useCommunityEvents();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("");
  const [autoGenerateImage, setAutoGenerateImage] = useState(false);
  const [customTime, setCustomTime] = useState("");
  const [customEndTime, setCustomEndTime] = useState("");
  const [customDuration, setCustomDuration] = useState("");
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    date: "",
    time: "",
    duration: "",
    endTime: "",
    endDate: "",
    location: "",
    capacity: "",
    isVirtual: false,
    price: "",
    isPaid: false
  });

  // Helper function to validate UUID
  const isValidUuid = (str: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
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

  const resetForm = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setSelectedImage(null);
    setImagePreviewUrl("");
    setFormData({
      title: "",
      description: "",
      category: "",
      date: "",
      time: "",
      duration: "",
      endTime: "",
      endDate: "",
      location: "",
      capacity: "",
      isVirtual: false,
      price: "",
      isPaid: false
    });
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File Type",
          description: "Please select an image file (JPEG, PNG, WebP)",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Image must be smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedImage(file);
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreviewUrl(previewUrl);
    }
  };

  const handleRemoveImage = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setSelectedImage(null);
    setImagePreviewUrl("");
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.title || !formData.date || !formData.time) {
      toast({
        title: "Missing Required Fields",
        description: "Please provide event title, date, and time.",
        variant: "destructive",
      });
      return;
    }

    // Check if date/time is in the past
    const selectedDateTime = new Date(`${formData.date}T${formData.time}`);
    const now = new Date();
    if (selectedDateTime < now) {
      toast({
        title: "Invalid Date",
        description: "You cannot create an event in the past. Please select a future date and time.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Create ISO datetime string
      const startTime = new Date(`${formData.date}T${formData.time}`).toISOString();
      
      // Calculate end time if provided
      let endTime: string | undefined = undefined;
      if (formData.endTime) {
        const endDate = formData.endDate || formData.date;
        endTime = new Date(`${endDate}T${formData.endTime}`).toISOString();
      } else if (formData.duration) {
        // Calculate end time based on duration if no manual end time is set
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

      // Upload event image to Supabase Storage
      let uploadedImageUrl: string | undefined;
      let eventId: string | undefined;
      
      if (selectedImage) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          const ext = selectedImage.name.split('.').pop() || 'jpg';
          const fileName = `event-${Date.now()}.${ext}`;
          const filePath = `${user?.id ?? 'public'}/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('covers')
            .upload(filePath, selectedImage, {
              upsert: true,
              contentType: selectedImage.type,
            });
            
          if (uploadError) throw uploadError;
          
          const { data: publicUrlData } = supabase.storage
            .from('covers')
            .getPublicUrl(filePath);
            
          uploadedImageUrl = publicUrlData.publicUrl;
          
          console.log('✅ Event image uploaded:', uploadedImageUrl);
        } catch (e) {
          console.error('❌ Image upload failed:', e);
          toast({
            title: "Image upload failed",
            description: "Event will be created without an image.",
            variant: "default",
          });
        }
      }

      // If community context: create in both tables (community + personal calendar)
      if (eventContext === 'community') {
        // 1. Create in global_community_events (visible to everyone)
        const communityEventData = {
          title: formData.title,
          description: formData.description || undefined,
          event_type: 'event',
          location: formData.isVirtual ? undefined : formData.location || undefined,
          virtual_link: formData.isVirtual ? 'Virtual Event' : undefined,
          start_time: startTime,
          end_time: endTime,
          max_participants: formData.capacity ? parseInt(formData.capacity) : undefined,
          image_url: uploadedImageUrl,
          metadata: formData.isPaid ? { 
            is_paid: true, 
            price: parseFloat(formData.price) || 0 
          } : { is_paid: false }
        };

        const result = await createEvent(communityEventData);
        
        if (!result.success) {
          toast({
            title: "Error Creating Event",
            description: "There was an issue creating your event. Please try again.",
            variant: "destructive",
          });
          return;
        }

        eventId = result.eventId;

        // Auto-generate image if enabled and no manual image was uploaded
        if (autoGenerateImage && !uploadedImageUrl && eventId) {
          toast({
            title: "Generating AI Image...",
            description: "Creating a custom image for your event.",
          });
          
          try {
            console.log('🎨 Auto-generating image for event:', eventId);
            const { data: imageData, error: imageError } = await supabase.functions.invoke('generate-event-image', {
              body: { eventId }
            });

            if (imageError) {
              console.error('Image generation error:', imageError);
              throw imageError;
            }
            
            if (imageData?.imageUrl) {
              uploadedImageUrl = imageData.imageUrl;
              console.log('✅ AI image generated:', uploadedImageUrl);
              toast({
                title: "Image Generated!",
                description: "AI-generated image added to your event.",
              });
            } else if (!imageData?.success) {
              throw new Error(imageData?.error || 'Image generation failed');
            }
          } catch (e: any) {
            console.error('❌ Auto image generation failed:', e);
            
            // Show specific error messages based on error type
            if (e?.message?.includes('RATE_LIMIT') || e?.message?.includes('Too many requests')) {
              toast({
                title: "Rate Limit Reached",
                description: "Too many image generation requests. Please try again in a moment.",
                variant: "destructive",
              });
            } else if (e?.message?.includes('quota') || e?.message?.includes('credits')) {
              toast({
                title: "Credits Required",
                description: "AI image generation credits depleted. Please add credits to continue.",
                variant: "destructive",
              });
            } else if (e?.message?.includes('permission') || e?.message?.includes('Authentication')) {
              toast({
                title: "Permission Denied",
                description: "You don't have permission to generate images for this event.",
                variant: "destructive",
              });
            } else {
              toast({
                title: "Image Generation Failed",
                description: "Couldn't generate AI image. Your event was created successfully without it.",
                variant: "destructive",
              });
            }
          }
        }

        // 2. Also add to personal calendar (so creator sees it in their calendar)
        const personalEventData = {
          title: formData.title,
          description: formData.description || null,
          start_time: startTime,
          end_time: endTime || null,
          location: formData.location || null,
          event_type: 'community' as const,
          status: 'confirmed' as const,
          priority: 'medium' as const,
          is_recurring: false,
          source_type: 'manual' as const,
          user_id: '',
          metadata: uploadedImageUrl ? { image_url: uploadedImageUrl } : null,
        };

        try {
          await addEvent(personalEventData, { showToast: false });
        } catch (personalError) {
          console.warn('⚠️ Failed to add event to personal calendar:', personalError);
          // Continue even if personal calendar fails
        }

        toast({
          title: "Event Created!",
          description: "Your event is now visible to the community and added to your calendar.",
        });

        // Refresh calendar events
        window.dispatchEvent(new CustomEvent('calendar-events:refresh'));

        onClose();
        resetForm();
        
        // Call the callback with the new event ID or navigate to Events & MeetUps
        if (onEventCreated && result.eventId) {
          onEventCreated(result.eventId);
        } else if (result.eventId) {
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
          
          // Navigate to Events & MeetUps with event and tab parameters
          window.location.href = `/comm/events-meetups?event=${result.eventId}&tab=${tab}`;
        }
      } else {
        // Personal event: only add to calendar_events
        const personalEventData = {
          title: formData.title,
          description: formData.description || null,
          start_time: startTime,
          end_time: endTime || null,
          location: formData.location || null,
          event_type: 'personal' as const,
          status: 'confirmed' as const,
          priority: 'medium' as const,
          is_recurring: false,
          source_type: 'manual' as const,
          user_id: '',
          metadata: uploadedImageUrl ? { image_url: uploadedImageUrl } : null,
        };

        await addEvent(personalEventData, { showToast: false });

        toast({
          title: 'Event Created!',
          description: 'Event has been added to your calendar.',
        });

        // Refresh calendar events
        window.dispatchEvent(new CustomEvent('calendar-events:refresh'));

        onClose();
        resetForm();
      }
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: 'Error',
        description: 'Failed to create event. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600" />
            Create New Event
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Event Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Event Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g., Morning Yoga Session, Cooking Workshop"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe your event, what attendees can expect..."
                  className="mt-1"
                />
              </div>

              {/* Event Image Upload */}
              <div>
                <Label>Event Image (Optional)</Label>
                <div className="mt-2">
                  {imagePreviewUrl ? (
                    <div className="relative">
                      <img 
                        src={imagePreviewUrl} 
                        alt="Event preview" 
                        className="w-full h-48 object-cover rounded-lg border-2 border-border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={handleRemoveImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div 
                      className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer"
                      onClick={() => document.getElementById('event-image-upload')?.click()}
                    >
                      <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground mb-1">
                        Click to upload event image
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PNG, JPG, WebP up to 5MB
                      </p>
                    </div>
                  )}
                  <input
                    type="file"
                    id="event-image-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </div>
                
                {/* Auto-generate image option */}
                {!imagePreviewUrl && eventContext === 'community' && (
                  <div className="flex items-center space-x-2 mt-3 p-3 bg-muted/50 rounded-lg">
                    <input
                      type="checkbox"
                      id="autoGenerateImage"
                      checked={autoGenerateImage}
                      onChange={(e) => setAutoGenerateImage(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="autoGenerateImage" className="text-sm cursor-pointer">
                      Generate image with AI automatically (if no image uploaded)
                    </Label>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Health & Wellness */}
                      <SelectItem value="longevity">🧬 Longevity & Anti-Aging</SelectItem>
                      <SelectItem value="fitness">💪 Fitness & Exercise</SelectItem>
                      <SelectItem value="wellness">🧘 Wellness & Mindfulness</SelectItem>
                      <SelectItem value="nutrition">🥗 Nutrition & Diet</SelectItem>
                      <SelectItem value="mental-health">🧠 Mental Health</SelectItem>
                      
                      {/* Activities */}
                      <SelectItem value="outdoor">🌳 Outdoor Activities</SelectItem>
                      <SelectItem value="sports">⚽ Sports & Recreation</SelectItem>
                      <SelectItem value="adventure">🏔️ Adventure & Travel</SelectItem>
                      
                      {/* Learning & Growth */}
                      <SelectItem value="workshop">📚 Workshop & Learning</SelectItem>
                      <SelectItem value="professional">💼 Professional Development</SelectItem>
                      <SelectItem value="creative">🎨 Creative Arts</SelectItem>
                      
                      {/* Community */}
                      <SelectItem value="social">🤝 Social & Networking</SelectItem>
                      <SelectItem value="volunteer">❤️ Volunteer & Service</SelectItem>
                      <SelectItem value="support">🫂 Support Group</SelectItem>
                      
                      {/* Other */}
                      <SelectItem value="entertainment">🎭 Entertainment</SelectItem>
                      <SelectItem value="other">✨ Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="duration">Duration (Optional)</Label>
                  <Select 
                    value={["30min", "1hour", "2hour", "half-day", "full-day"].includes(formData.duration) ? formData.duration : formData.duration ? "custom" : ""} 
                    onValueChange={(value) => {
                      if (value === "custom") {
                        setFormData({...formData, duration: customDuration || ""});
                      } else {
                        setFormData({...formData, duration: value});
                      }
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30min">30 minutes</SelectItem>
                      <SelectItem value="1hour">1 hour</SelectItem>
                      <SelectItem value="2hour">2 hours</SelectItem>
                      <SelectItem value="half-day">Half day</SelectItem>
                      <SelectItem value="full-day">Full day</SelectItem>
                      <SelectItem value="custom">Custom duration...</SelectItem>
                    </SelectContent>
                  </Select>
                  {formData.duration && !["30min", "1hour", "2hour", "half-day", "full-day"].includes(formData.duration) && (
                    <Input
                      type="text"
                      value={customDuration}
                      onChange={(e) => {
                        setCustomDuration(e.target.value);
                        setFormData({...formData, duration: e.target.value});
                      }}
                      className="mt-2"
                      placeholder="e.g., 45 minutes, 3 hours"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="endTime">End Time (Optional)</Label>
                  <Select 
                    value={generateTimeOptions().includes(formData.endTime) ? formData.endTime : formData.endTime ? "custom" : ""} 
                    onValueChange={(value) => {
                      if (value === "custom") {
                        setFormData({...formData, endTime: customEndTime || ""});
                      } else {
                        setFormData({...formData, endTime: value});
                      }
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select end time" />
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
                  {formData.endTime && !generateTimeOptions().includes(formData.endTime) && (
                    <Input
                      type="time"
                      value={customEndTime}
                      onChange={(e) => {
                        setCustomEndTime(e.target.value);
                        setFormData({...formData, endTime: e.target.value});
                      }}
                      className="mt-2"
                      placeholder="HH:MM"
                    />
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Overrides duration if set</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Virtual Event</Label>
                  <p className="text-sm text-muted-foreground">This event will be held online</p>
                </div>
                <Switch 
                  checked={formData.isVirtual}
                  onCheckedChange={(checked) => setFormData({...formData, isVirtual: checked})}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5" />
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
                    className="mt-1"
                  />
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
                    <SelectTrigger className="mt-1">
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
                      className="mt-2"
                      placeholder="HH:MM"
                    />
                  )}
                </div>
              </div>

              {!formData.isVirtual ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      placeholder="e.g., Central Park, Community Center"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="capacity">Max Attendees</Label>
                    <Input
                      id="capacity"
                      type="number"
                      value={formData.capacity}
                      onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                      placeholder="Leave empty for unlimited"
                      className="mt-1"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <Label htmlFor="capacity">Max Attendees</Label>
                  <Input
                    id="capacity"
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                    placeholder="Leave empty for unlimited"
                    className="mt-1"
                  />
                </div>
              )}

              {/* Pricing (Optional) */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isPaid"
                    checked={formData.isPaid}
                    onChange={(e) => setFormData({...formData, isPaid: e.target.checked})}
                    className="rounded"
                  />
                  <Label htmlFor="isPaid">This is a paid event</Label>
                </div>
                
                {formData.isPaid && (
                  <div>
                    <Label htmlFor="price">Event Price</Label>
                    <Input
                      id="price"
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
               onClick={handleSubmit} 
              className="flex-1"
              disabled={!formData.title || !formData.date || !formData.time || isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Event'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}