import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { communityNavigation } from "@/config/navigation";
import { useParams } from "react-router-dom";
import { Users, MessageCircle, Calendar, Settings, Send, Pin, Hash } from "lucide-react";

export default function GroupDetail() {
  const { id } = useParams();

  return (
    <AppLayout>
      <SEO title="Wellness Warriors Group | Community" description="Group discussion and activities" canonical={window.location.href} />
      <SubNavigation items={communityNavigation} />
      <div className="p-6 max-w-6xl mx-auto space-y-6">
          <StandardHeader 
            title="Wellness Warriors"
            description="Supporting each other on our fitness journey"
            emoji="💪"
          />
        
        {/* Group Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Wellness Warriors
                    <Badge className="bg-green-100 text-green-700">Active</Badge>
                  </CardTitle>
                  <p className="text-muted-foreground">156 members • Private Group</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Calendar className="w-4 h-4 mr-2" />
                  Events
                </Button>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              A supportive community for fitness enthusiasts sharing workout tips, nutrition advice, and motivation. 
              Weekly challenges and group workouts every Saturday!
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Hash className="w-4 h-4" />
                #fitness #nutrition #wellness
              </span>
              <span>Created March 2024</span>
            </div>
          </CardContent>
        </Card>

        {/* Pinned Messages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pin className="w-5 h-5" />
              Pinned Messages
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Avatar className="w-6 h-6">
                  <AvatarImage src="/lovable-uploads/sarah-miller-avatar.jpg" />
                  <AvatarFallback>SM</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">Sarah Miller</span>
                <Badge variant="outline" className="text-xs">Admin</Badge>
              </div>
              <p className="text-sm">Welcome to Wellness Warriors! Please read our community guidelines and introduce yourself. 🌟</p>
            </div>
          </CardContent>
        </Card>

        {/* Group Chat */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Group Chat
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Messages */}
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div className="flex items-start gap-3">
                <Avatar>
                  <AvatarImage src="/lovable-uploads/james-davis-avatar.jpg" />
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">James Davis</span>
                    <span className="text-xs text-muted-foreground">2 hours ago</span>
                  </div>
                  <p className="text-sm">Just finished my morning 5K run! The weather was perfect. Who else is joining the weekend group hike?</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Avatar>
                  <AvatarImage src="/lovable-uploads/lisa-chen-avatar.jpg" />
                  <AvatarFallback>LC</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">Lisa Chen</span>
                    <span className="text-xs text-muted-foreground">1 hour ago</span>
                  </div>
                  <p className="text-sm">Count me in for the hike! I'll bring healthy snacks for everyone 🥜🍎</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Avatar>
                  <AvatarImage src="/lovable-uploads/mike-thompson-avatar.jpg" />
                  <AvatarFallback>MT</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">Mike Thompson</span>
                    <span className="text-xs text-muted-foreground">30 minutes ago</span>
                  </div>
                  <p className="text-sm">Has anyone tried the new yoga studio downtown? Thinking of checking it out this week.</p>
                </div>
              </div>
            </div>

            {/* Message Composer */}
            <div className="flex gap-2">
              <Textarea 
                placeholder="Type your message..."
                className="flex-1 min-h-10 resize-none"
                rows={1}
              />
              <Button size="sm">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Avatar className="w-8 h-8">
                <AvatarImage src="/lovable-uploads/emma-wilson-avatar.jpg" />
                <AvatarFallback>EW</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm"><span className="font-medium">Emma Wilson</span> joined the group</p>
                <p className="text-xs text-muted-foreground">5 minutes ago</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Avatar className="w-8 h-8">
                <AvatarImage src="/lovable-uploads/sarah-miller-avatar.jpg" />
                <AvatarFallback>SM</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm"><span className="font-medium">Sarah Miller</span> created a new event: "Saturday Morning Hike"</p>
                <p className="text-xs text-muted-foreground">1 hour ago</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}