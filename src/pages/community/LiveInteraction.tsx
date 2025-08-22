import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Radio, Users, Mic, Video, Bell, Eye, Calendar, MessageSquare, Headphones, Settings } from "lucide-react";

const communitySubItems = [
  { id: "overview", name: "Overview", path: "/community" },
  { id: "my-groups", name: "My Groups & Feed", path: "/community/my-groups" },
  { id: "events", name: "Events & Meetups", path: "/community/events" },
  { id: "media-hub", name: "Media Hub", path: "/community/media-hub" },
  { id: "live-interaction", name: "LIVE Hub", path: "/community/live-interaction" },
  { id: "ai-insights", name: "AI Insights", path: "/community/ai-insights" },
];

export default function LiveInteraction() {
  const activeLiveRooms = [
    {
      title: "Morning Motivation Chat",
      host: "Sarah K.",
      viewers: 45,
      category: "Wellness",
      isAudio: true,
      duration: "23 min",
      hostAvatar: "SK"
    },
    {
      title: "Cooking Together Live",
      host: "Chef Marcus",
      viewers: 78,
      category: "Nutrition",
      isAudio: false,
      duration: "1h 12min",
      hostAvatar: "CM"
    },
    {
      title: "Q&A with Dr. Wilson",
      host: "Dr. Emily Wilson",
      viewers: 156,
      category: "Health",
      isAudio: false,
      duration: "45 min",
      hostAvatar: "EW"
    }
  ];

  const scheduledSessions = [
    {
      title: "Evening Meditation Circle",
      host: "Mindful Moments",
      date: "Today",
      time: "7:00 PM",
      expectedAttendees: 25,
      type: "Audio"
    },
    {
      title: "Weekend Workout Planning",
      host: "FitnessPro",
      date: "Tomorrow",
      time: "9:00 AM",
      expectedAttendees: 40,
      type: "Video"
    }
  ];

  const coHostInvitations = [
    {
      title: "Healthy Recipe Demo",
      host: "NutriChef",
      role: "Guest Speaker",
      time: "Tomorrow 3 PM"
    }
  ];

  const livePolls = [
    {
      question: "What's your biggest wellness challenge?",
      session: "Morning Motivation Chat",
      options: ["Time management", "Motivation", "Knowledge", "Consistency"],
      responses: 23
    }
  ];

  const relatedGroups = [
    {
      name: "Live Learning",
      members: 234,
      activeNow: 12,
      category: "Education"
    },
    {
      name: "Wellness Talks",
      members: 189,
      activeNow: 8,
      category: "Health"
    }
  ];

  return (
    <AppLayout>
      <SEO title="Live Interaction | Community" description="Join real-time workshops, discussions, and social sessions" canonical={window.location.href} />
      <SubNavigation items={communitySubItems} />
      <div className="p-6 space-y-6">
        <PageHeader 
          title="Real connections, real time! 📲"
          description="Join real-time workshops, discussions, and social sessions"
          icon={Radio}
        />
        
        <div className="flex items-center justify-between">
          <div className="text-lg font-bold">Live Interaction</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
            <Button size="sm">
              <Radio className="w-4 h-4 mr-2" />
              Go Live
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Active Live Rooms */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Radio className="w-5 h-5 text-red-500" />
                  Live Now
                </h2>
                <div className="space-y-4">
                  {activeLiveRooms.map((room, index) => (
                    <div key={index} className="p-4 border rounded-lg relative">
                      <div className="absolute top-2 right-2">
                        <Badge variant="destructive" className="text-xs animate-pulse">
                          • LIVE
                        </Badge>
                      </div>
                      <div className="flex items-start gap-3 mb-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback>{room.hostAvatar}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm">{room.title}</h3>
                          <p className="text-xs text-muted-foreground mb-1">Hosted by {room.host}</p>
                          <Badge variant="outline" className="text-xs">{room.category}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {room.viewers} watching
                        </span>
                        <span className="flex items-center gap-1">
                          {room.isAudio ? <Headphones className="w-3 h-3" /> : <Video className="w-3 h-3" />}
                          {room.isAudio ? "Audio" : "Video"}
                        </span>
                        <span>{room.duration}</span>
                      </div>
                      <Button size="sm" className="w-full">
                        <Radio className="w-4 h-4 mr-2" />
                        Join Now
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Live Polls
                </h3>
                <div className="space-y-3">
                  {livePolls.map((poll, index) => (
                    <div key={index} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="mb-2">
                        <Badge variant="outline" className="text-xs mb-2">{poll.session}</Badge>
                        <p className="font-medium text-sm">{poll.question}</p>
                      </div>
                      <div className="space-y-2 mb-3">
                        {poll.options.map((option, optIndex) => (
                          <Button 
                            key={optIndex}
                            variant="outline" 
                            size="sm" 
                            className="w-full justify-start text-xs h-8"
                          >
                            {option}
                          </Button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">{poll.responses} responses so far</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Center Column - Scheduled Sessions */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Upcoming Sessions
                </h2>
                <div className="space-y-4">
                  {scheduledSessions.map((session, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-2">{session.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3">Hosted by {session.host}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {session.date} at {session.time}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {session.expectedAttendees} expected
                        </span>
                        <span className="flex items-center gap-1">
                          {session.type === "Audio" ? <Headphones className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                          {session.type}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1">
                          <Bell className="w-4 h-4 mr-1" />
                          Remind Me
                        </Button>
                        <Button size="sm" className="flex-1">
                          Join Session
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
                  <Mic className="w-5 h-5" />
                  Co-Host Invitations
                </h3>
                <div className="space-y-3">
                  {coHostInvitations.map((invitation, index) => (
                    <div key={index} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <h4 className="font-medium text-sm mb-1">{invitation.title}</h4>
                      <p className="text-xs text-muted-foreground mb-2">
                        Hosted by {invitation.host} • Role: {invitation.role}
                      </p>
                      <p className="text-xs text-muted-foreground mb-3">{invitation.time}</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1">
                          Decline
                        </Button>
                        <Button size="sm" className="flex-1">
                          Accept
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Related Groups & Settings */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Related Groups</h3>
                <div className="space-y-3">
                  {relatedGroups.map((group, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">{group.name}</h4>
                        <Badge variant="outline">{group.category}</Badge>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">{group.members} members</span>
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          {group.activeNow} active
                        </span>
                      </div>
                      <Button size="sm" variant="outline" className="w-full">
                        View Group
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <Radio className="w-4 h-4 mr-2" />
                    Start Audio Room
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Video className="w-4 h-4 mr-2" />
                    Start Video Session
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule Session
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="w-4 h-4 mr-2" />
                    Audio/Video Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}