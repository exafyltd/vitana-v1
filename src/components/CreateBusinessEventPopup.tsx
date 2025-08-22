import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, DollarSign, Users, MapPin, Video, Mic, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CreateBusinessEventPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateBusinessEventPopup({ isOpen, onClose }: CreateBusinessEventPopupProps) {
  const { toast } = useToast();
  const [currentTab, setCurrentTab] = useState("basics");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    serviceType: "",
    category: "",
    duration: "",
    capacity: "",
    pricing: {
      type: "free",
      amount: "",
      currency: "USD",
      paymentPlans: [] as string[]
    },
    schedule: {
      type: "one-time",
      startDate: "",
      startTime: "",
      recurring: {
        frequency: "weekly",
        days: [] as string[],
        endDate: ""
      }
    },
    delivery: {
      method: "in-person",
      location: "",
      virtualLink: "",
      hybrid: false
    },
    access: "public",
    requirements: "",
    cancellationPolicy: "flexible"
  });

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const availableTags = ["Yoga", "Nutrition", "Fitness", "Mental Health", "Meditation", "Wellness", "Coaching", "Workshop"];

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = () => {
    toast({
      title: "Service Created! 🎉",
      description: `${formData.title} has been created and is now available for booking.`
    });
    onClose();
  };

  const nextTab = () => {
    const tabs = ["basics", "pricing", "schedule", "delivery"];
    const currentIndex = tabs.indexOf(currentTab);
    if (currentIndex < tabs.length - 1) {
      setCurrentTab(tabs[currentIndex + 1]);
    }
  };

  const prevTab = () => {
    const tabs = ["basics", "pricing", "schedule", "delivery"];
    const currentIndex = tabs.indexOf(currentTab);
    if (currentIndex > 0) {
      setCurrentTab(tabs[currentIndex - 1]);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-green-600" />
            Create New Service or Event
          </DialogTitle>
        </DialogHeader>

        <Tabs value={currentTab} onValueChange={setCurrentTab} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basics">Basics</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="delivery">Delivery</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            <TabsContent value="basics" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Service Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="title">Service Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      placeholder="e.g., Morning Yoga Flow, Nutrition Consultation"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Describe your service, what clients can expect, and any prerequisites..."
                      className="mt-1 min-h-[100px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="serviceType">Service Type *</Label>
                      <Select value={formData.serviceType} onValueChange={(value) => setFormData({...formData, serviceType: value})}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="class">Group Class</SelectItem>
                          <SelectItem value="workshop">Workshop</SelectItem>
                          <SelectItem value="consultation">1-on-1 Consultation</SelectItem>
                          <SelectItem value="program">Program/Course</SelectItem>
                          <SelectItem value="retreat">Retreat</SelectItem>
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
                          <SelectItem value="45min">45 minutes</SelectItem>
                          <SelectItem value="1hour">1 hour</SelectItem>
                          <SelectItem value="1.5hour">1.5 hours</SelectItem>
                          <SelectItem value="2hour">2 hours</SelectItem>
                          <SelectItem value="half-day">Half day</SelectItem>
                          <SelectItem value="full-day">Full day</SelectItem>
                          <SelectItem value="multi-day">Multiple days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Categories/Tags</Label>
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

            <TabsContent value="pricing" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Pricing & Payment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Pricing Type *</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {["free", "fixed", "sliding"].map((type) => (
                        <Button
                          key={type}
                          variant={formData.pricing.type === type ? "default" : "outline"}
                          onClick={() => setFormData({
                            ...formData, 
                            pricing: {...formData.pricing, type}
                          })}
                          className="capitalize"
                        >
                          {type === "sliding" ? "Pay What You Can" : type}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {formData.pricing.type !== "free" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="amount">
                          {formData.pricing.type === "sliding" ? "Suggested Amount" : "Price *"}
                        </Label>
                        <div className="flex mt-1">
                          <span className="inline-flex items-center px-3 border border-r-0 border-input bg-muted rounded-l-md text-sm">
                            $
                          </span>
                          <Input
                            id="amount"
                            type="number"
                            value={formData.pricing.amount}
                            onChange={(e) => setFormData({
                              ...formData, 
                              pricing: {...formData.pricing, amount: e.target.value}
                            })}
                            placeholder="0.00"
                            className="rounded-l-none"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="capacity">Max Participants</Label>
                        <Input
                          id="capacity"
                          type="number"
                          value={formData.capacity}
                          onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                          placeholder="Unlimited"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Payment Plans</Label>
                    <div className="flex flex-wrap gap-2">
                      {["Single Payment", "2 Installments", "Monthly", "Pay Per Session"].map((plan) => (
                        <Badge
                          key={plan}
                          variant="outline"
                          className="cursor-pointer"
                          onClick={() => {
                            const plans = formData.pricing.paymentPlans.includes(plan)
                              ? formData.pricing.paymentPlans.filter(p => p !== plan)
                              : [...formData.pricing.paymentPlans, plan];
                            setFormData({
                              ...formData,
                              pricing: {...formData.pricing, paymentPlans: plans}
                            });
                          }}
                        >
                          {plan}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="schedule" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Scheduling</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Schedule Type *</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {["one-time", "recurring"].map((type) => (
                        <Button
                          key={type}
                          variant={formData.schedule.type === type ? "default" : "outline"}
                          onClick={() => setFormData({
                            ...formData, 
                            schedule: {...formData.schedule, type}
                          })}
                          className="capitalize"
                        >
                          {type === "one-time" ? "One-time Event" : "Recurring Service"}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startDate">Start Date *</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={formData.schedule.startDate}
                        onChange={(e) => setFormData({
                          ...formData, 
                          schedule: {...formData.schedule, startDate: e.target.value}
                        })}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="startTime">Start Time *</Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={formData.schedule.startTime}
                        onChange={(e) => setFormData({
                          ...formData, 
                          schedule: {...formData.schedule, startTime: e.target.value}
                        })}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {formData.schedule.type === "recurring" && (
                    <div className="space-y-4">
                      <div>
                        <Label>Frequency</Label>
                        <Select 
                          value={formData.schedule.recurring.frequency} 
                          onValueChange={(value) => setFormData({
                            ...formData, 
                            schedule: {
                              ...formData.schedule, 
                              recurring: {...formData.schedule.recurring, frequency: value}
                            }
                          })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Days of Week</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                            <Badge
                              key={day}
                              variant={formData.schedule.recurring.days.includes(day) ? "default" : "outline"}
                              className="cursor-pointer"
                              onClick={() => {
                                const days = formData.schedule.recurring.days.includes(day)
                                  ? formData.schedule.recurring.days.filter(d => d !== day)
                                  : [...formData.schedule.recurring.days, day];
                                setFormData({
                                  ...formData,
                                  schedule: {
                                    ...formData.schedule,
                                    recurring: {...formData.schedule.recurring, days}
                                  }
                                });
                              }}
                            >
                              {day}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="delivery" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Delivery Method</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>How will you deliver this service? *</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {["in-person", "virtual", "hybrid"].map((method) => (
                        <Button
                          key={method}
                          variant={formData.delivery.method === method ? "default" : "outline"}
                          onClick={() => setFormData({
                            ...formData, 
                            delivery: {...formData.delivery, method}
                          })}
                          className="capitalize flex items-center gap-2"
                        >
                          {method === "in-person" && <MapPin className="w-4 h-4" />}
                          {method === "virtual" && <Video className="w-4 h-4" />}
                          {method === "hybrid" && <Mic className="w-4 h-4" />}
                          {method}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {(formData.delivery.method === "in-person" || formData.delivery.method === "hybrid") && (
                    <div>
                      <Label htmlFor="location">Location *</Label>
                      <Input
                        id="location"
                        value={formData.delivery.location}
                        onChange={(e) => setFormData({
                          ...formData, 
                          delivery: {...formData.delivery, location: e.target.value}
                        })}
                        placeholder="Studio address, park name, or meeting point"
                        className="mt-1"
                      />
                    </div>
                  )}

                  <div>
                    <Label>Access Level *</Label>
                    <Select value={formData.access} onValueChange={(value) => setFormData({...formData, access: value})}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public - Anyone can join</SelectItem>
                        <SelectItem value="followers">Followers Only</SelectItem>
                        <SelectItem value="members">Group Members Only</SelectItem>
                        <SelectItem value="private">Private - Invite Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="requirements">Requirements & Prerequisites</Label>
                    <Textarea
                      id="requirements"
                      value={formData.requirements}
                      onChange={(e) => setFormData({...formData, requirements: e.target.value})}
                      placeholder="Any equipment needed, experience level, what to bring..."
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Cancellation Policy</Label>
                    <Select value={formData.cancellationPolicy} onValueChange={(value) => setFormData({...formData, cancellationPolicy: value})}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flexible">Flexible - Full refund 24h before</SelectItem>
                        <SelectItem value="moderate">Moderate - Full refund 48h before</SelectItem>
                        <SelectItem value="strict">Strict - Full refund 7 days before</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {currentTab !== "basics" && (
              <Button variant="outline" onClick={prevTab}>
                Previous
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {currentTab !== "delivery" ? (
              <Button onClick={nextTab}>
                Next
              </Button>
            ) : (
              <Button onClick={handleSubmit} className="gap-2">
                <DollarSign className="w-4 h-4" />
                Create Service
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}