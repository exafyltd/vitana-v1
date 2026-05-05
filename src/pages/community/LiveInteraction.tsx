import SEO from "@/components/SEO";
import VitanaIndexValue from "@/components/health/VitanaIndexValue";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Radio, Users, Mic, Video, Bell, Eye, Calendar, MessageSquare, Headphones, Settings, Plane } from "lucide-react";
import { GoLivePopup } from "@/components/GoLivePopup";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

import { communityNavigation } from "@/config/navigation";
import { t } from '@/lib/i18n-toast';

export default function LiveInteraction() {
  const navigate = useNavigate();
  const { pendingCount, getLatestActions } = useAutopilot();
  const [isGoLiveOpen, setIsGoLiveOpen] = useState(false);
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const latestActions = getLatestActions(2);
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
      <SEO title={t('screens.community.liveInteractionCommunity')} description="Join real-time workshops, discussions, and social sessions" canonical={window.location.href} />
      <SubNavigation items={communityNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header Section with Perfect Symmetry - Three Cards Layout */}
          <div className="flex flex-col lg:flex-row gap-4 mb-8">
            {/* Shortened Header Bar - Welcome Message */}
            <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">{t('screens.community.liveHub')}</h1>
                <p className="text-muted-foreground">{t('screens.community.connectLiveWithYourCommunityThrough')}</p>
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
                <span className="text-sm font-medium text-red-400">{t('screens.community.autopilot')}</span>
              </div>
              
              {/* Hover Preview */}
              {showPreview && pendingCount > 0 && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white/95 backdrop-blur-sm border border-white/20 rounded-lg shadow-xl p-3 z-10">
                  <div className="text-xs font-medium text-muted-foreground mb-2">{t('screens.community.latestActions')}</div>
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
                  <span className="text-xl font-bold text-green-600"><VitanaIndexValue /></span>
                </div>
              </div>
            </div>
          </div>
        
        <div className="flex items-center justify-between">
          <div className="text-lg font-bold">{t('screens.community.liveInteraction')}</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              {t('screens.community.settings')}
            </Button>
            <Button size="sm" onClick={() => setIsGoLiveOpen(true)}>
              <Radio className="w-4 h-4 mr-2" />
              {t('screens.community.goLive')}
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
                  {t('screens.community.liveNow')}
                </h2>
                <div className="space-y-4">
                  {activeLiveRooms.map((room, index) => (
                    <div key={index} className="p-4 border rounded-lg relative">
                      <div className="absolute top-2 right-2">
                        <Badge variant="destructive" className="text-xs animate-pulse">
                          {t('screens.community.live2')}
                        </Badge>
                      </div>
                      <div className="flex items-start gap-3 mb-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback>{room.hostAvatar}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm">{room.title}</h3>
                          <p className="text-xs text-muted-foreground mb-1">{t('screens.community.hostedByHost', { host: room.host })}</p>
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
                        {t('screens.community.joinNow')}
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
                  {t('screens.community.livePolls')}
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
                      <p className="text-xs text-muted-foreground">{t('screens.community.responsesResponsesSoFar', { responses: poll.responses })}</p>
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
                  {t('screens.community.upcomingSessions')}
                </h2>
                <div className="space-y-4">
                  {scheduledSessions.map((session, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-2">{session.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{t('screens.community.hostedByHost', { host: session.host })}</p>
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
                          {t('screens.community.remindMe')}
                        </Button>
                        <Button size="sm" className="flex-1">
                          {t('screens.community.joinSession')}
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
                  {t('screens.community.cohostInvitations')}
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
                          {t('screens.community.decline')}
                        </Button>
                        <Button size="sm" className="flex-1">
                          {t('screens.community.accept')}
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
                <h3 className="text-lg font-semibold mb-4">{t('screens.community.relatedGroups')}</h3>
                <div className="space-y-3">
                  {relatedGroups.map((group, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">{group.name}</h4>
                        <Badge variant="outline">{group.category}</Badge>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">{t('screens.community.membersMembers', { members: group.members })}</span>
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          {group.activeNow} active
                        </span>
                      </div>
                      <Button size="sm" variant="outline" className="w-full">
                        {t('screens.community.viewGroup')}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">{t('screens.community.quickActions')}</h3>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <Radio className="w-4 h-4 mr-2" />
                    {t('screens.community.startAudioRoom')}
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Video className="w-4 h-4 mr-2" />
                    {t('screens.community.startVideoSession')}
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="w-4 h-4 mr-2" />
                    {t('screens.community.scheduleSession')}
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="w-4 h-4 mr-2" />
                    {t('screens.community.audiovideoSettings')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        <GoLivePopup 
          open={isGoLiveOpen} 
          onOpenChange={setIsGoLiveOpen}
          defaultTitle="Live with User"
        />
        
        {/* Autopilot Popup */}
        <AutopilotPopup 
          open={autopilotOpen} 
          onOpenChange={setAutopilotOpen}
        />
        </div>
      </div>
    </AppLayout>
  );
}