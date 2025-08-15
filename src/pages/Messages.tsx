import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Users, Bell, Archive, Search, Phone, Video, MoreHorizontal, Send } from "lucide-react";

const messagesSubItems = [
  { id: "overview", name: "Overview", path: "/messages" },
  { id: "direct", name: "Direct Messages", path: "/messages/direct" },
  { id: "group", name: "Group Chats", path: "/messages/group" },
  { id: "notifications", name: "Notifications", path: "/messages/notifications" },
  { id: "archived", name: "Archived", path: "/messages/archived" },
];

const recentChats = [
  { id: 1, name: "Jennifer Ardy", message: "This new dashboard design, what do you think?", time: "9:12 am", avatar: "/lovable-uploads/7cca32ae-be17-4ab2-bc65-98257922207a.png", unread: 0, online: true },
  { id: 2, name: "Tae Min", message: "Seems to be waiting for a reply to your message since 1 month ago", time: "1h", avatar: "", unread: 0, online: false },
  { id: 3, name: "Se Hun oh", message: "Just Stop, I'm already late!!", time: "8m", avatar: "", unread: 0, online: true },
  { id: 4, name: "Jong Dae", message: "Typing...", time: "6m", avatar: "", unread: 0, online: true },
  { id: 5, name: "Murphy", message: "Time is running!", time: "1m", avatar: "", unread: 2, online: true },
];

export default function Messages() {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <SEO 
        title="Messages | Communication Hub" 
        description="Manage your conversations, notifications, and stay connected with your community"
        canonical={window.location.href}
      />
      <SubNavigation items={messagesSubItems} />
      
      <div className="p-6">
        <div className="flex h-[calc(100vh-140px)]" style={{ gap: '24px' }}>
          {/* Left Sidebar - Chat List */}
          <Card className="w-80 flex flex-col">
            <CardHeader className="border-b">
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="default" className="gap-1">
                  <MessageSquare className="h-3 w-3" />
                  Chats
                </Badge>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search" className="pl-10" />
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-y-auto p-0">
              {recentChats.map((chat) => (
                <div key={chat.id} className="p-4 border-b hover:bg-muted/50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={chat.avatar} />
                        <AvatarFallback>{chat.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      {chat.online && (
                        <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 border-2 border-background rounded-full"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium truncate">{chat.name}</p>
                        <span className="text-xs text-muted-foreground">{chat.time}</span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{chat.message}</p>
                    </div>
                    {chat.unread > 0 && (
                      <Badge variant="default" className="h-5 w-5 p-0 text-xs rounded-full">
                        {chat.unread}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Center - Chat Interface */}
          <Card className="flex-1 flex flex-col">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="/lovable-uploads/7cca32ae-be17-4ab2-bc65-98257922207a.png" />
                    <AvatarFallback>JA</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">Jennifer Ardy</p>
                    <p className="text-sm text-muted-foreground">Time is running!</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Video className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-y-auto bg-muted/20">
              <div className="max-w-4xl mx-auto space-y-4">
                <div className="text-center">
                  <span className="text-xs text-muted-foreground bg-background px-3 py-1 rounded-full">TODAY</span>
                </div>
                
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/lovable-uploads/7cca32ae-be17-4ab2-bc65-98257922207a.png" />
                    <AvatarFallback>JA</AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <div className="bg-card p-3 rounded-lg shadow-sm max-w-md">
                      <p className="text-sm">Hey Jhon Lever!</p>
                      <span className="text-xs text-muted-foreground">9:12 am</span>
                    </div>
                    <div className="bg-card p-3 rounded-lg shadow-sm max-w-md">
                      <p className="text-sm">I am sending the dashboard design</p>
                      <span className="text-xs text-muted-foreground">9:16 am</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <div className="bg-primary text-primary-foreground p-3 rounded-lg shadow-sm max-w-md">
                    <p className="text-sm">I'm just looking around.</p>
                    <span className="text-xs opacity-80">9:25 am</span>
                  </div>
                </div>
              </div>
            </CardContent>
            
            <div className="p-4 border-t">
              <div className="flex items-center gap-2">
                <Input placeholder="Your messages..." className="flex-1" />
                <Button size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>

          {/* Right Sidebar - Profile */}
          <Card className="w-80">
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <Avatar className="h-20 w-20 mx-auto mb-4">
                  <AvatarImage src="/lovable-uploads/7cca32ae-be17-4ab2-bc65-98257922207a.png" />
                  <AvatarFallback>JL</AvatarFallback>
                </Avatar>
                <h3 className="font-semibold">Jhon Lever</h3>
                <p className="text-sm text-muted-foreground">+1 (234) 567-890</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">UI/UX designer are responsible for the overall design of a product, from its conception to its launch.</p>
                  <Button variant="link" className="p-0 h-auto text-primary">Read more</Button>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Location</span>
                    <span className="text-sm">United State</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Experience</span>
                    <span className="text-sm">4+ years</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Applied as a</span>
                    <span className="text-sm">CEO</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Company</span>
                    <span className="text-sm">HR Management</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Work from</span>
                    <span className="text-sm">Office</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Joining date</span>
                    <span className="text-sm">Nov 01, 2023</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}