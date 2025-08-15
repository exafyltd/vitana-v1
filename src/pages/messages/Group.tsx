import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Phone, Video, MoreHorizontal, Send } from "lucide-react";

const messagesSubItems = [
  { id: "overview", name: "Overview", path: "/messages" },
  { id: "direct", name: "Direct Messages", path: "/messages/direct" },
  { id: "group", name: "Group Chats", path: "/messages/group" },
  { id: "notifications", name: "Notifications", path: "/messages/notifications" },
  { id: "archived", name: "Archived", path: "/messages/archived" },
];

export default function Group() {
  const groupChats = [
    { id: 1, name: "Wellness Warriors", members: 24, lastMessage: "Great workout session today!", time: "1h", active: true },
    { id: 2, name: "Mindful Moments", members: 18, lastMessage: "Tomorrow's meditation at 7 AM", time: "3h", active: true },
    { id: 3, name: "Nutrition Network", members: 31, lastMessage: "Recipe sharing thread 🥗", time: "5h", active: false },
    { id: 4, name: "Fitness Fanatics", members: 42, lastMessage: "Challenge accepted! 💪", time: "1d", active: true },
  ];

  return (
    <AppLayout>
      <SEO title="Group Chats | Messages" description="Group conversations and discussions" canonical={window.location.href} />
      <SubNavigation items={messagesSubItems} />
      
      <div className="flex h-[calc(100vh-140px)]">
        {/* Left Sidebar - Group Chats */}
        <div className="w-80 border-r bg-card flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-semibold mb-3">Group Chats</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search groups..." className="pl-10" />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {groupChats.map((group) => (
              <div key={group.id} className="p-4 border-b hover:bg-muted/50 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {group.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    {group.active && (
                      <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 border-2 border-background rounded-full"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">{group.name}</p>
                      <span className="text-xs text-muted-foreground">{group.time}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{group.members} members</p>
                    <p className="text-sm text-muted-foreground truncate">{group.lastMessage}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center - Group Chat Interface */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b bg-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary text-primary-foreground">WW</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">Wellness Warriors</p>
                  <p className="text-sm text-muted-foreground">24 members • 8 online</p>
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
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto bg-muted/20">
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="text-center">
                <span className="text-xs text-muted-foreground bg-background px-3 py-1 rounded-full">TODAY</span>
              </div>
              
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>MC</AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <div className="bg-card p-3 rounded-lg shadow-sm max-w-md">
                    <p className="text-xs font-medium text-primary mb-1">Mike Chen</p>
                    <p className="text-sm">Great workout session today! Who's joining tomorrow's 6 AM session?</p>
                    <span className="text-xs text-muted-foreground">1:15 pm</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>ER</AvatarFallback>
                </Avatar>
                <div className="bg-card p-3 rounded-lg shadow-sm max-w-md">
                  <p className="text-xs font-medium text-primary mb-1">Emma Rodriguez</p>
                  <p className="text-sm">Count me in! 💪</p>
                  <span className="text-xs text-muted-foreground">1:18 pm</span>
                </div>
              </div>
              
              <div className="flex justify-end">
                <div className="bg-primary text-primary-foreground p-3 rounded-lg shadow-sm max-w-md">
                  <p className="text-sm">I'll be there too! Let's crush those goals! 🔥</p>
                  <span className="text-xs opacity-80">1:20 pm</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-4 border-t bg-card">
            <div className="flex items-center gap-2">
              <Input placeholder="Message Wellness Warriors..." className="flex-1" />
              <Button size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Group Info */}
        <div className="w-80 border-l bg-card p-6">
          <div className="text-center mb-6">
            <Avatar className="h-20 w-20 mx-auto mb-4">
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">WW</AvatarFallback>
            </Avatar>
            <h3 className="font-semibold">Wellness Warriors</h3>
            <p className="text-sm text-muted-foreground">24 members</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">A supportive community focused on fitness, nutrition, and overall wellness. Join us for workouts, challenges, and motivation!</p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Active Members</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">MC</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">Mike Chen</span>
                  <div className="ml-auto h-2 w-2 bg-green-500 rounded-full"></div>
                </div>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">ER</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">Emma Rodriguez</span>
                  <div className="ml-auto h-2 w-2 bg-green-500 rounded-full"></div>
                </div>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">AT</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">Alex Thompson</span>
                  <div className="ml-auto h-2 w-2 bg-green-500 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}