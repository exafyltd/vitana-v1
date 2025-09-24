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
import { Users, MapPin, Calendar, Clock, X } from "lucide-react";
import { useCommunityEvents } from "@/hooks/useCommunityEvents";

interface CreateMeetupPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateMeetupPopup({ isOpen, onClose }: CreateMeetupPopupProps) {
  const { createEvent } = useCommunityEvents();
  const [loading, setLoading] = useState(false);
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
    isRecurring: false
  });

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const availableTags = ["Beginner Friendly", "All Levels", "Advanced", "Women Only", "Men Only", "Seniors", "Youth", "Family"];

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.date || !formData.time) {
      return;
    }

    setLoading(true);
    
    // Create ISO datetime string
    const startTime = new Date(`${formData.date}T${formData.time}`).toISOString();
    
    // Calculate end time based on duration
    let endTime = undefined;
    if (formData.duration) {
      const start = new Date(startTime);
      const durationMap = {
        "30min": 30,
        "1hour": 60,
        "2hour": 120,
        "half-day": 240,
        "full-day": 480
      };
      const minutes = durationMap[formData.duration as keyof typeof durationMap] || 60;
      start.setMinutes(start.getMinutes() + minutes);
      endTime = start.toISOString();
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
    };

    const result = await createEvent(eventData);
    
    if (result.success) {
      onClose();
      setFormData({
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
        isRecurring: false
      });
      setSelectedTags([]);
    }
    
    setLoading(false);
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
                  className="mt-1"
                />
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
                    className="mt-1"
                  />
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

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Recurring Meetup</Label>
                    <p className="text-sm text-muted-foreground">Repeats weekly</p>
                  </div>
                  <Switch 
                    checked={formData.isRecurring}
                    onCheckedChange={(checked) => setFormData({...formData, isRecurring: checked})}
                  />
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