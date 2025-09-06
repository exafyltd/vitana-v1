import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, MapPin, Clock, Users, Bell, Share2, Star, Filter, Plane, Plus } from "lucide-react";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { CreateEventPopup } from "@/components/CreateEventPopup";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

import { communityNavigation } from "@/config/navigation";

export default function Events() {
  const navigate = useNavigate();
  const { pendingCount, getLatestActions } = useAutopilot();
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("today");
  
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
      <SubNavigation items={communityNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header Section with Perfect Symmetry - Three Cards Layout */}
          <div className="flex flex-col lg:flex-row gap-4 mb-8">
            {/* Welcome Message */}
            <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Connect, engage, grow together! 🎉</h1>
                <p className="text-muted-foreground">Discover and join local wellness events and gatherings.</p>
              </div>
            </div>
            
            {/* Autopilot Card with Live Badge Counter */}
            <div 
              className="w-32 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 cursor-pointer group transition-all duration-300 hover:shadow-xl relative"
              onClick={() => setAutopilotOpen(true)}
              onMouseEnter={() => setShowPreview(true)}
              onMouseLeave={() => setShowPreview(false)}
            >
              {pendingCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs animate-pulse z-10"
                >
                  {pendingCount}
                </Badge>
              )}
              <div className="flex flex-col items-center justify-center h-full space-y-3">
                <div>
                  <Plane className="w-10 h-10 text-red-400 transform rotate-0" />
                </div>
                <span className="text-sm font-medium text-red-400">Autopilot</span>
              </div>
              
              {/* Hover Preview */}
              {showPreview && pendingCount > 0 && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white/95 backdrop-blur-sm border border-white/20 rounded-lg shadow-xl p-3 z-10">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Latest Actions:</div>
                  {latestActions.map((action, index) => (
                    <div key={action.id} className="flex items-center space-x-2 text-xs py-1">
                      <span>{action.icon}</span>
                      <span className="truncate">{action.title}</span>
                    </div>
                  ))}
                  {pendingCount > 2 && (
                    <div className="text-xs text-muted-foreground pt-1 border-t mt-1">
                      +{pendingCount - 2} more actions
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Vitana Index Card - Circle with 742 */}
            <div 
              className="w-32 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 cursor-pointer group transition-all duration-300 hover:shadow-xl"
              onClick={() => navigate('/health-tracker/vitana-index')}
            >
              <div className="flex items-center justify-center h-full">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400/30 to-blue-500/30 flex items-center justify-center shadow-lg shadow-green-500/20 group-hover:shadow-green-500/40 transition-all duration-300">
                  <span className="text-xl font-bold text-green-600">742</span>
                </div>
              </div>
            </div>
          </div>

          {/* Utility Action Button */}
          <UtilityActionButton>
            <Button onClick={() => setCreateEventOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Event
            </Button>
          </UtilityActionButton>

          {/* Split Navigation */}
          <SplitBar value={activeTab} onValueChange={setActiveTab} className="w-full">
            <SplitBarList>
              <SplitBarTrigger value="today">Today</SplitBarTrigger>
              <SplitBarTrigger value="upcoming">Upcoming</SplitBarTrigger>
            </SplitBarList>
          </SplitBar>

          <SplitBarContent value="today">
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
          </SplitBarContent>

          <SplitBarContent value="upcoming">
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No upcoming events</h3>
              <p className="text-muted-foreground">Create your first event to get started!</p>
            </div>
          </SplitBarContent>
        </div>
      </div>
      
      {/* Autopilot Popup */}
      <AutopilotPopup 
        open={autopilotOpen} 
        onOpenChange={setAutopilotOpen}
      />
      
      {/* Create Event Popup */}
      <CreateEventPopup 
        isOpen={createEventOpen} 
        onClose={() => setCreateEventOpen(false)}
      />
    </AppLayout>
  );
}