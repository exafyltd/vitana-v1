import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, MapPin, Clock, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useHybridMessages } from "@/hooks/useHybridMessages";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import PaymentRequestPopup from "@/components/payment/PaymentRequestPopup";

interface CreateEventPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateEventPopup({ isOpen, onClose }: CreateEventPopupProps) {
  const { toast } = useToast();
  const { sendMessage } = useHybridMessages();
  const { addEvent } = useCalendarEvents();
  const [showPaymentDemo, setShowPaymentDemo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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

  const resetForm = () => {
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

  const handleSubmit = async () => {
    if (!formData.title || !formData.date) return;

    setIsSubmitting(true);
    
    try {
      const messageContent = `📅 **Event Invitation**: ${formData.title}

${formData.description ? `${formData.description}\n` : ''}📍 **When**: ${formData.date}${formData.time ? ` at ${formData.time}` : ''}
${formData.location ? `📍 **Where**: ${formData.location}\n` : ''}${formData.capacity ? `👥 **Capacity**: ${formData.capacity} people\n` : ''}${formData.isPaid ? `💰 **Price**: $${formData.price}\n` : ''}
Please respond to confirm your attendance!`;

      // Helper to create ISO date strings
      const composeIso = (dateStr: string, timeStr?: string) => {
        const dt = new Date(dateStr);
        if (timeStr && /^\d{1,2}:\d{2}/.test(timeStr)) {
          const [h, m] = timeStr.split(':').map(Number);
          dt.setHours(h, m, 0, 0);
        }
        return dt.toISOString();
      };

      // Send message first to get message ID, then create event
      console.log('Creating calendar invite message...');
      const sentMessage = await sendMessage({
        context: 'global' as const,
        threadId: '', // This will be handled by the messaging system
        content: messageContent,
        type: 'system',
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

      // Now create the sender's calendar event with the message ID
      console.log('Creating sender calendar event...');
      const senderEventData = {
        title: formData.title,
        description: formData.description,
        start_time: composeIso(formData.date, formData.time),
        end_time: formData.endTime ? composeIso(formData.endDate || formData.date, formData.endTime) : undefined,
        location: formData.location,
        event_type: 'personal' as const,
        status: 'confirmed' as const,
        priority: 'medium' as const,
        is_recurring: false,
        attendees_count: formData.capacity ? parseInt(formData.capacity) : undefined,
        has_rewards: false,
        source_type: 'invite' as const, // Mark as invite from the start
        source_message_id: sentMessage.id, // Link to the message immediately
        user_id: '', // Will be overridden by addEvent hook
      };

      const createdEvent = await addEvent(senderEventData);
      console.log('✅ Sender calendar event created:', createdEvent);

      toast({
        title: 'Event Created!',
        description: 'Your calendar invite has been sent successfully.',
      });

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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fitness">Fitness</SelectItem>
                      <SelectItem value="nutrition">Nutrition</SelectItem>
                      <SelectItem value="mindfulness">Mindfulness</SelectItem>
                      <SelectItem value="social">Social</SelectItem>
                      <SelectItem value="workshop">Workshop</SelectItem>
                      <SelectItem value="outdoor">Outdoor</SelectItem>
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
              disabled={!formData.title || !formData.date || isSubmitting}
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