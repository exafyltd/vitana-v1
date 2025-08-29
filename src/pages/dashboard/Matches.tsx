import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, UserCheck, Zap, Heart, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { dashboardNavigation } from "@/config/navigation";
import StandardHeader from "@/components/StandardHeader";

export default function Matches() {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <SEO title="Matches | Dashboard" description="Matchmaking & Opportunities" canonical={window.location.href} />
      <SubNavigation items={dashboardNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader
            title="Matchmaking & Opportunities"
            description="Autopilot as your wingman."
            emoji="🤝"
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top 3 People */}
            <Card className="bg-white/80 backdrop-blur-sm border-white/20 hover:shadow-xl transition-all duration-300">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-pink-500/20 to-rose-500/20 flex items-center justify-center">
                    <Users className="w-6 h-6 text-pink-600" />
                  </div>
                  <CardTitle className="text-lg">Top 3 People 👋</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-pink-50 rounded-lg">
                    <Avatar>
                      <AvatarImage src="/lovable-uploads/sarah-miller-avatar.jpg" />
                      <AvatarFallback>SM</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h4 className="font-medium">Sarah Miller</h4>
                      <p className="text-sm text-muted-foreground">Yoga enthusiast</p>
                      <Badge variant="secondary">92% match</Badge>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                    <Avatar>
                      <AvatarImage src="/lovable-uploads/james-davis-avatar.jpg" />
                      <AvatarFallback>JD</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h4 className="font-medium">James Davis</h4>
                      <p className="text-sm text-muted-foreground">Fitness coach</p>
                      <Badge variant="secondary">88% match</Badge>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                    <Avatar>
                      <AvatarImage src="/lovable-uploads/emma-wilson-avatar.jpg" />
                      <AvatarFallback>EW</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h4 className="font-medium">Emma Wilson</h4>
                      <p className="text-sm text-muted-foreground">Meditation teacher</p>
                      <Badge variant="secondary">85% match</Badge>
                    </div>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <Button variant="default" size="sm" className="w-full">Say Hi</Button>
                  <Button variant="outline" size="sm" className="w-full">Book Chat</Button>
                  <Button variant="outline" size="sm" className="w-full">Save</Button>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  <Zap className="inline w-4 h-4 mr-1 text-yellow-600" />
                  Autopilot can intro automatically with context
                </p>
              </CardContent>
            </Card>

            {/* Groups & Events */}
            <Card className="bg-white/80 backdrop-blur-sm border-white/20 hover:shadow-xl transition-all duration-300">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-violet-500/20 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-purple-600" />
                  </div>
                  <CardTitle className="text-lg">Groups & Events 🎉</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium">Morning Runners Club</h4>
                      <Badge variant="outline">Trending</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      <MapPin className="inline w-3 h-3 mr-1" />
                      Central Park • 7:00 AM
                    </p>
                    <p className="text-sm text-muted-foreground">15 members joining</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium">Healthy Cooking Class</h4>
                      <Badge variant="outline">New</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      <MapPin className="inline w-3 h-3 mr-1" />
                      Downtown Kitchen • 6:00 PM
                    </p>
                    <p className="text-sm text-muted-foreground">8 spots left</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium">Mindfulness Group</h4>
                      <Badge variant="outline">Weekly</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      <MapPin className="inline w-3 h-3 mr-1" />
                      Wellness Center • 7:30 PM
                    </p>
                    <p className="text-sm text-muted-foreground">Regular meetup</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <Button variant="default" size="sm" className="w-full">Join</Button>
                  <Button variant="outline" size="sm" className="w-full">Invite Buddy</Button>
                  <Button variant="outline" size="sm" className="w-full">Remind Me</Button>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  <Zap className="inline w-4 h-4 mr-1 text-yellow-600" />
                  Autopilot: auto-RSVP and add to calendar
                </p>
              </CardContent>
            </Card>

            {/* Helpers & Coaches */}
            <Card className="bg-white/80 backdrop-blur-sm border-white/20 hover:shadow-xl transition-all duration-300">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                    <UserCheck className="w-6 h-6 text-green-600" />
                  </div>
                  <CardTitle className="text-lg">Helpers & Coaches 🧑‍⚕️</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                    <Avatar>
                      <AvatarImage src="/lovable-uploads/dr-roberts-avatar.jpg" />
                      <AvatarFallback>DR</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h4 className="font-medium">Dr. Roberts</h4>
                      <p className="text-sm text-muted-foreground">Primary Care</p>
                      <Badge variant="outline">Available</Badge>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                    <Avatar>
                      <AvatarImage src="/lovable-uploads/mike-thompson-avatar.jpg" />
                      <AvatarFallback>MT</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h4 className="font-medium">Mike Thompson</h4>
                      <p className="text-sm text-muted-foreground">Personal Trainer</p>
                      <Badge variant="outline">Next week</Badge>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
                    <Avatar>
                      <AvatarImage src="/lovable-uploads/lisa-chen-avatar.jpg" />
                      <AvatarFallback>LC</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h4 className="font-medium">Lisa Chen</h4>
                      <p className="text-sm text-muted-foreground">Life Coach</p>
                      <Badge variant="outline">Tomorrow</Badge>
                    </div>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <Button variant="default" size="sm" className="w-full">Book</Button>
                  <Button variant="outline" size="sm" className="w-full">Share Info</Button>
                  <Button variant="outline" size="sm" className="w-full">Add to List</Button>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  <Zap className="inline w-4 h-4 mr-1 text-yellow-600" />
                  Autopilot: auto-books and shares your case brief
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}