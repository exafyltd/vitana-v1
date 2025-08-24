import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, MapPin, Clock, Users, Bell, Share2, Star, Filter, Plane } from "lucide-react";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const communitySubItems = [
  { id: "overview", name: "Overview", path: "/community" },
  { id: "my-groups", name: "My Groups & Feed", path: "/community/my-groups" },
  { id: "events", name: "Events & Meetups", path: "/community/events" },
  { id: "my-business", name: "My Business", path: "/community/my-business" },
  { id: "media-hub", name: "Media Hub", path: "/community/media-hub" },
  { id: "live-interaction", name: "LIVE Hub", path: "/community/live-interaction" },
  { id: "ai-insights", name: "AI Insights", path: "/community/ai-insights" },
];

export default function Events() {
  const navigate = useNavigate();
  const { pendingCount, getLatestActions } = useAutopilot();
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const latestActions = getLatestActions(2);
  const upcomingEvents = [
    {
      title: "Morning Yoga Flow",
      host: "Sarah K.",
      date: "Tomorrow",
      time: "7:00 AM",
      location: "Central Park",
      attendees: 23,
      maxAttendees: 30,
      status: "going"
    },
    {
      title: "Healthy Cooking Workshop",
      host: "Chef Marcus",
      date: "This Saturday",
      time: "2:00 PM",
      location: "Community Kitchen",
      attendees: 15,
      maxAttendees: 20,
      status: "interested"
    },
  ];

  const recommendedMeetups = [
    {
      title: "Weekend Hiking Group",
      match: 95,
      attendees: 12,
      location: "Blue Ridge Trail",
      date: "Sunday",
      hostAvatar: "WH",
      category: "Fitness"
    },
    {
      title: "Meditation Circle",
      match: 88,
      attendees: 8,
      location: "Zen Garden",
      date: "Monday",
      hostAvatar: "MC",
      category: "Mindfulness"
    },
  ];

  const eventReminders = [
    { title: "Yoga Flow", startTime: "30 min", joinUrl: "#" },
    { title: "Book Club", startTime: "2 hours", joinUrl: "#" },
  ];

  return (
    <AppLayout>
      <SEO title="Events & Meetups | Community" description="Discover and join local wellness events and gatherings" canonical={window.location.href} />
      <SubNavigation items={communitySubItems} />
      <div className="p-6 space-y-6">
        <PageHeader 
          title="Connect, engage, grow together! 🎉"
          description="Discover and join local wellness events and gatherings"
          icon={Calendar}
        />
        
        <div className="flex items-center justify-between">
          <div className="text-lg font-bold">Events & Meetups</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            <Button size="sm">
              <Calendar className="w-4 h-4 mr-2" />
              Create Event
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Upcoming Events */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Upcoming Events
                </h2>
                <div className="space-y-4">
                  {upcomingEvents.map((event, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">{event.title}</h3>
                          <p className="text-sm text-muted-foreground">Hosted by {event.host}</p>
                        </div>
                        <Badge variant={event.status === "going" ? "default" : "secondary"}>
                          {event.status === "going" ? "Going" : "Interested"}
                        </Badge>
                      </div>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {event.date} at {event.time}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {event.location}
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          {event.attendees}/{event.maxAttendees} attendees
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button size="sm" variant="outline" className="flex-1">
                          <Share2 className="w-4 h-4 mr-1" />
                          Share
                        </Button>
                        <Button size="sm" className="flex-1">
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Event Reminders
                </h3>
                <div className="space-y-3">
                  {eventReminders.map((reminder, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{reminder.title}</p>
                        <p className="text-xs text-muted-foreground">Starting in {reminder.startTime}</p>
                      </div>
                      <Button size="sm">Join</Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Center Column - Recommended Meetups */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  Recommended for You
                </h2>
                <div className="space-y-4">
                  {recommendedMeetups.map((meetup, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <Badge variant="outline">{meetup.category}</Badge>
                        <Badge variant="secondary">{meetup.match}% match</Badge>
                      </div>
                      <h3 className="font-semibold mb-2">{meetup.title}</h3>
                      <div className="space-y-2 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {meetup.date}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {meetup.location}
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          {meetup.attendees} going
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className="text-xs">{meetup.hostAvatar}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-muted-foreground">Host</span>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            Interested
                          </Button>
                          <Button size="sm">
                            Join
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Calendar & Quick Actions */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Your Availability</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Today</p>
                      <p className="text-xs text-muted-foreground">Free after 6 PM</p>
                    </div>
                    <Badge variant="outline" className="bg-green-100">Available</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Tomorrow</p>
                      <p className="text-xs text-muted-foreground">Busy until 5 PM</p>
                    </div>
                    <Badge variant="outline" className="bg-red-100">Busy</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Weekend</p>
                      <p className="text-xs text-muted-foreground">Mostly free</p>
                    </div>
                    <Badge variant="outline" className="bg-blue-100">Open</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Quick Share</h3>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share to Groups
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="w-4 h-4 mr-2" />
                    Invite Friends
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="w-4 h-4 mr-2" />
                    Export Calendar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Autopilot Popup */}
      <AutopilotPopup 
        open={autopilotOpen} 
        onOpenChange={setAutopilotOpen}
      />
    </AppLayout>
  );
}