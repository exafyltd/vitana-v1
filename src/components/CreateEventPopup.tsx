import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, MapPin, Clock, Users, Image as ImageIcon, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useHybridMessages } from "@/hooks/useHybridMessages";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { supabase } from "@/integrations/supabase/client";
import PaymentRequestPopup from "@/components/payment/PaymentRequestPopup";

interface CreateEventPopupProps {
  isOpen: boolean;
  onClose: () => void;
  threadId?: string;
}

export function CreateEventPopup({ isOpen, onClose, threadId }: CreateEventPopupProps) {
  const { toast } = useToast();
  const { sendMessage } = useHybridMessages();
  const { addEvent } = useCalendarEvents();
  const [showPaymentDemo, setShowPaymentDemo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("");
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    date: "",
    time: "",
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

    setIsSubmitting(true);
    
    try {
      // Upload event image to Supabase Storage
      let uploadedImageUrl: string | undefined;
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

      const messageContent = `📅 **Event Invitation**: ${formData.title}

${formData.description ? `${formData.description}\n` : ''}📍 **When**: ${formData.date}${formData.time ? ` at ${formData.time}` : ''}
${formData.location ? `📍 **Where**: ${formData.location}\n` : ''}${formData.capacity ? `👥 **Capacity**: ${formData.capacity} people\n` : ''}${formData.isPaid ? `💰 **Price**: $${formData.price}\n` : ''}
Please respond to confirm your attendance!`;

      // Helper to create ISO date strings with robust time parsing
      const composeIso = (dateStr: string, timeStr?: string) => {
        const dt = new Date(dateStr);
        if (timeStr) {
          // Handle HH:mm or HH:mm:ss format
          const timeParts = timeStr.split(':').map(Number);
          if (timeParts.length >= 2) {
            dt.setHours(timeParts[0], timeParts[1], timeParts[2] || 0, 0);
          }
        }
        const isoString = dt.toISOString();
        console.log(`📅 Composed ISO: ${dateStr} + ${timeStr} = ${isoString}`);
        return isoString;
      };

      // Helper to validate UUID
      const isValidUuid = (uuid?: string) => {
        if (!uuid) return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
      };

      let sentMessageId: string | undefined;

      // Only send message if we have a valid threadId prop
      if (threadId && isValidUuid(threadId)) {
        try {
          console.log('Creating calendar invite message...');
          const sentMessage = await sendMessage({
            context: 'global' as const,
            threadId: threadId,
            content: messageContent,
            type: 'calendar_invite' as any,
            contentData: {
              eventType: 'calendar_invite',
              ...formData
            },
            actionButtons: [
              {
                label: 'Accept',
                action: 'calendar_accept',
                data: {
                  title: formData.title,
                  description: formData.description,
                  location: formData.location,
                  start_time: composeIso(formData.date, formData.time),
                  end_time: formData.endTime ? composeIso(formData.endDate || formData.date, formData.endTime) : undefined,
                  event_type: 'personal',
                  status: 'confirmed',
                  priority: 'medium'
                }
              },
              {
                label: 'Decline', 
                action: 'calendar_decline',
                data: {
                  title: formData.title,
                  description: formData.description,
                  location: formData.location,
                  start_time: composeIso(formData.date, formData.time),
                  end_time: formData.endTime ? composeIso(formData.endDate || formData.date, formData.endTime) : undefined,
                  event_type: 'personal',
                  status: 'confirmed',
                  priority: 'medium'
                }
              },
              {
                label: 'Maybe',
                action: 'calendar_maybe',
                data: {
                  title: formData.title,
                  description: formData.description,
                  location: formData.location,
                  start_time: composeIso(formData.date, formData.time),
                  end_time: formData.endTime ? composeIso(formData.endDate || formData.date, formData.endTime) : undefined,
                  event_type: 'personal',
                  status: 'confirmed',
                  priority: 'medium'
                }
              }
            ]
          });

          if (sentMessage?.id && isValidUuid(sentMessage.id)) {
            sentMessageId = sentMessage.id;
            console.log('✅ Calendar invite message sent:', sentMessageId);
          }
        } catch (messageError) {
          console.warn('⚠️ Failed to send calendar invite message:', messageError);
          // Continue with event creation even if message fails
        }
      } else {
        console.log('⚠️ No valid threadId provided, skipping message send');
      }

      // Now create the sender's calendar event
      console.log('Creating sender calendar event...');
      
      // Sanitize attendees_count: convert to integer or null
      const sanitizedAttendeesCount = formData.capacity
        ? (parseInt(formData.capacity, 10) || null)
        : null;
      
      // Build metadata only with available fields
      const eventMetadata: Record<string, any> = {};
      if (uploadedImageUrl) {
        eventMetadata.image_url = uploadedImageUrl;
      }
      if (formData.category) {
        eventMetadata.category = formData.category.trim();
      }
      
      const senderEventData = {
        title: formData.title,
        description: formData.description || null,
        start_time: composeIso(formData.date, formData.time),
        end_time: formData.endTime ? composeIso(formData.endDate || formData.date, formData.endTime) : null,
        location: formData.location || null,
        event_type: 'personal' as const,
        status: 'confirmed' as const,
        priority: 'medium' as const,
        is_recurring: false,
        attendees_count: sanitizedAttendeesCount,
        has_rewards: false,
        source_type: sentMessageId ? ('invite' as const) : ('manual' as const),
        user_id: '', // Will be overridden by addEvent hook
        ...(sentMessageId && { source_message_id: sentMessageId }),
        metadata: Object.keys(eventMetadata).length > 0 ? eventMetadata : null,
      };

      console.log('📅 Event payload:', JSON.stringify(senderEventData, null, 2));

      try {
        const createdEvent = await addEvent(senderEventData, { showToast: false });
        console.log('✅ Sender calendar event created:', createdEvent);

        // Refresh calendar events
        window.dispatchEvent(new CustomEvent('calendar-events:refresh'));

        toast({
          title: 'Event Created!',
          description: 'Your calendar invite has been sent and added to your calendar.',
        });
      } catch (addEventError: any) {
        console.error('❌ Failed to add sender event to calendar:', addEventError);
        
        // Extract error details
        const errorMessage = addEventError?.message || 'Unknown error';
        const errorCode = addEventError?.code;
        const errorDetails = addEventError?.details;
        
        console.log('❌ Supabase error details:', { errorMessage, errorCode, errorDetails });
        
        // Try fallback with minimal required fields
        console.log('⚠️ Attempting fallback insert with minimal fields...');
        try {
          const { data: { user } } = await supabase.auth.getUser();
          
          if (!user) {
            throw new Error('User not authenticated');
          }
          
          const fallbackEventData = {
            user_id: user.id,
            title: formData.title,
            start_time: composeIso(formData.date, formData.time),
            event_type: 'personal',
            status: 'confirmed',
            priority: 'medium',
            is_recurring: false,
            location: formData.location || null,
            description: formData.description || null,
            attendees_count: null,
            has_rewards: false,
            metadata: null,
          };
          
          console.log('📅 Fallback payload:', JSON.stringify(fallbackEventData, null, 2));
          
          const { data: fallbackEvent, error: fallbackError } = await supabase
            .from('calendar_events')
            .insert(fallbackEventData)
            .select()
            .single();
          
          if (fallbackError) {
            throw fallbackError;
          }
          
          console.log('✅ Fallback event created:', fallbackEvent);
          
          // Refresh calendar events
          window.dispatchEvent(new CustomEvent('calendar-events:refresh'));
          
          toast({
            title: 'Event Created',
            description: 'Event added with basic details. You can edit it later to add image/category.',
          });
        } catch (fallbackError: any) {
          console.error('❌ Fallback insert also failed:', fallbackError);
          
          const fallbackErrorMessage = fallbackError?.message || 'Unknown error';
          const fallbackErrorCode = fallbackError?.code;
          
          toast({
            title: 'Failed to Create Event',
            description: `Error: ${fallbackErrorMessage}${fallbackErrorCode ? ` (${fallbackErrorCode})` : ''}`,
            variant: 'destructive',
          });
          return;
        }
      }

      if (formData.isPaid && formData.price && parseFloat(formData.price) > 0) {
        setShowPaymentDemo(true);
      } else {
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
                      <SelectItem value="biohacking">⚡ Biohacking & Optimization</SelectItem>
                      <SelectItem value="fitness">💪 Fitness & Movement</SelectItem>
                      <SelectItem value="nutrition">🥗 Nutrition & Diet</SelectItem>
                      <SelectItem value="sleep">😴 Sleep & Recovery</SelectItem>
                      
                      {/* Medical & Science */}
                      <SelectItem value="medical">🏥 Medical & Clinical</SelectItem>
                      <SelectItem value="research">🔬 Scientific Research</SelectItem>
                      <SelectItem value="diagnostics">🩺 Diagnostics & Testing</SelectItem>
                      <SelectItem value="preventive">🛡️ Preventive Medicine</SelectItem>
                      
                      {/* Mental & Cognitive */}
                      <SelectItem value="mindfulness">🧘 Mindfulness & Meditation</SelectItem>
                      <SelectItem value="cognitive">🧠 Cognitive Health</SelectItem>
                      <SelectItem value="mental-health">💚 Mental Health</SelectItem>
                      
                      {/* Specialized */}
                      <SelectItem value="regenerative">🔄 Regenerative Medicine</SelectItem>
                      <SelectItem value="genomics">🧬 Genomics & Personalized Health</SelectItem>
                      <SelectItem value="supplements">💊 Supplements & Protocols</SelectItem>
                      <SelectItem value="technology">🤖 Health Technology</SelectItem>
                      
                      {/* Community & Education */}
                      <SelectItem value="workshop">📚 Workshop & Training</SelectItem>
                      <SelectItem value="seminar">🎓 Seminar & Conference</SelectItem>
                      <SelectItem value="social">👥 Social & Networking</SelectItem>
                      <SelectItem value="outdoor">🌳 Outdoor Activities</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="endTime">End Time (Optional)</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                    className="mt-1"
                  />
                </div>
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
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="time">Time *</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({...formData, time: e.target.value})}
                    className="mt-1"
                  />
                </div>
              </div>

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
      
      {/* Demo Payment Request for Paid Events */}
      <PaymentRequestPopup
        isOpen={showPaymentDemo}
        onClose={() => {
          setShowPaymentDemo(false);
          onClose();
        }}
        initialAmount={formData.price}
        initialDescription={`Event registration: ${formData.title}`}
        paymentType="event"
      />
    </Dialog>
  );
}