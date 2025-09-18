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
import { useMessages } from "@/hooks/useMessages";
import PaymentRequestPopup from "@/components/payment/PaymentRequestPopup";

interface CreateEventPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateEventPopup({ isOpen, onClose }: CreateEventPopupProps) {
  const { toast } = useToast();
  const { sendMessage } = useMessages(undefined, false); // Disable auto-fetch
  const [showPaymentDemo, setShowPaymentDemo] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    date: "",
    time: "",
    duration: "",
    location: "",
    capacity: "",
    isVirtual: false,
    price: "",
    isPaid: false
  });

  const handleSubmit = async () => {
    // Create event notification
    const eventData = {
      title: formData.title,
      description: formData.description,
      date: formData.date,
      time: formData.time,
      location: formData.location,
      capacity: formData.capacity,
      price: formData.isPaid ? parseFloat(formData.price) : 0,
      category: formData.category
    };

    try {
      await sendMessage(
        `New event: ${formData.title} on ${formData.date} at ${formData.time}${formData.isPaid ? ` - $${formData.price}` : ' - Free'}`,
        undefined, // Broadcast to community
        'event_announcement',
        eventData
      );
    } catch (error) {
      console.error('Error broadcasting event:', error);
    }

    toast({
      title: "Event Created! 🎉",
      description: `${formData.title} has been created successfully.`
    });
    
    if (formData.isPaid) {
      setShowPaymentDemo(true);
    } else {
      onClose();
    }
    
    setFormData({
      title: "",
      description: "",
      category: "",
      date: "",
      time: "",
      duration: "",
      location: "",
      capacity: "",
      isVirtual: false,
      price: "",
      isPaid: false
    });
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
                  <Label htmlFor="duration">Duration</Label>
                  <Select value={formData.duration} onValueChange={(value) => setFormData({...formData, duration: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30min">30 minutes</SelectItem>
                      <SelectItem value="1hour">1 hour</SelectItem>
                      <SelectItem value="1.5hour">1.5 hours</SelectItem>
                      <SelectItem value="2hour">2 hours</SelectItem>
                      <SelectItem value="half-day">Half day</SelectItem>
                      <SelectItem value="full-day">Full day</SelectItem>
                    </SelectContent>
                  </Select>
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
            <Button onClick={handleSubmit} className="flex-1">
              Create Event
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