import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { communityNavigation } from "@/config/navigation";
import { useParams, useNavigate } from "react-router-dom";
import { Video, Mic, MicOff, VideoOff, Users, MessageCircle, Settings, Share, Heart, ThumbsUp, ArrowLeft } from "lucide-react";

export default function LiveRoomViewer() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  return (
    <AppLayout>
      <SEO title="Morning Wellness Chat | Live Room" description="Live community discussion room" canonical={window.location.href} />
      <SubNavigation items={communityNavigation} />
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/community/live-rooms')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Directory
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Morning Wellness Chat</h1>
              <div className="flex items-center gap-2">
                <Badge className="bg-red-100 text-red-700">🔴 Live</Badge>
                <span className="text-sm text-muted-foreground">45 viewers</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Share className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Video Area */}
          <div className="lg:col-span-3 space-y-4">
            <Card>
              <CardContent className="p-0">
                <div className="aspect-video bg-gradient-to-br from-blue-900 to-purple-900 rounded-lg relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                      <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <h3 className="text-xl font-semibold mb-2">Live Stream</h3>
                      <p className="text-blue-200">Dr. Sarah discussing morning wellness routines</p>
                    </div>
                  </div>
                  
                  {/* Live indicators */}
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-red-500 text-white">🔴 LIVE</Badge>
                  </div>
                  
                  <div className="absolute top-4 right-4 flex gap-2">
                    <Badge variant="outline" className="bg-black/20 border-white/20 text-white">
                      <Users className="w-3 h-3 mr-1" />
                      45
                    </Badge>
                  </div>

                  {/* Host info */}
                  <div className="absolute bottom-4 left-4 flex items-center gap-3 bg-black/40 backdrop-blur-sm rounded-lg p-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src="/lovable-uploads/dr-roberts-avatar.jpg" />
                      <AvatarFallback>DR</AvatarFallback>
                    </Avatar>
                    <div className="text-white">
                      <p className="text-sm font-medium">Dr. Sarah Roberts</p>
                      <p className="text-xs text-blue-200">Wellness Coach</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Controls */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Mic className="w-4 h-4 mr-2" />
                      Request to Speak
                    </Button>
                    <Button variant="outline" size="sm">
                      <Video className="w-4 h-4 mr-2" />
                      Turn on Camera
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Heart className="w-4 h-4 mr-2" />
                      24
                    </Button>
                    <Button variant="outline" size="sm">
                      <ThumbsUp className="w-4 h-4 mr-2" />
                      12
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chat Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Live Chat
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Chat Messages */}
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  <div className="flex items-start gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src="/lovable-uploads/lisa-chen-avatar.jpg" />
                      <AvatarFallback>LC</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Lisa Chen</p>
                      <p className="text-sm">Great tips on morning stretches!</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src="/lovable-uploads/james-davis-avatar.jpg" />
                      <AvatarFallback>JD</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">James Davis</p>
                      <p className="text-sm">Can you share the meditation app you mentioned?</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src="/lovable-uploads/mike-thompson-avatar.jpg" />
                      <AvatarFallback>MT</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Mike Thompson</p>
                      <p className="text-sm">Thanks for hosting! 🙏</p>
                    </div>
                  </div>
                </div>

                {/* Chat Input */}
                <div className="flex gap-2">
                  <Input 
                    placeholder="Type a message..."
                    className="flex-1"
                  />
                  <Button size="sm">Send</Button>
                </div>
              </CardContent>
            </Card>

            {/* Participants */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Participants (45)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  <div className="flex items-center gap-2 p-2 rounded">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src="/lovable-uploads/dr-roberts-avatar.jpg" />
                      <AvatarFallback>DR</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">Dr. Sarah Roberts</span>
                    <Badge variant="outline" className="text-xs ml-auto">Host</Badge>
                  </div>
                  
                  <div className="flex items-center gap-2 p-2 rounded">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src="/lovable-uploads/lisa-chen-avatar.jpg" />
                      <AvatarFallback>LC</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">Lisa Chen</span>
                  </div>
                  
                  <div className="flex items-center gap-2 p-2 rounded">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src="/lovable-uploads/james-davis-avatar.jpg" />
                      <AvatarFallback>JD</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">James Davis</span>
                  </div>
                  
                  <div className="text-center pt-2">
                    <Button variant="outline" size="sm">View All</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}