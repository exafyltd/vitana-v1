import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Phone, Video, Send } from "lucide-react";

const messagesSubItems = [
  { id: "overview", name: "Overview", path: "/messages" },
  { id: "direct", name: "Direct Messages", path: "/messages/direct" },
  { id: "group", name: "Group Chats", path: "/messages/group" },
  { id: "notifications", name: "Notifications", path: "/messages/notifications" },
  { id: "archived", name: "Archived", path: "/messages/archived" },
];

export default function Direct() {
  const directContacts = [
    { id: 1, name: "Dr. Sarah Wilson", message: "How's your nutrition plan going?", time: "2h", status: "online", specialty: "Nutritionist" },
    { id: 2, name: "Mike Chen", message: "Ready for tomorrow's workout?", time: "4h", status: "away", specialty: "Fitness Coach" },
    { id: 3, name: "Emma Rodriguez", message: "Meditation session was great!", time: "1d", status: "offline", specialty: "Wellness Expert" },
    { id: 4, name: "Alex Thompson", message: "Your progress looks amazing!", time: "2d", status: "online", specialty: "Health Coach" },
  ];

  return (
    <AppLayout>
      <SEO title="Direct Messages | Messages" description="Private conversations with community members" canonical={window.location.href} />
      <SubNavigation items={messagesSubItems} />
      
      <div className="p-6">
        <div className="flex gap-6 h-[calc(100vh-140px)]">
          {/* Left Sidebar - Direct Message Contacts */}
          <Card className="w-80 flex flex-col">
            <CardHeader className="border-b">
              <h2 className="font-semibold mb-3">Direct Messages</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search contacts..." className="pl-10" />
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-y-auto p-0">
              {directContacts.map((contact) => (
                <div key={contact.id} className="p-4 border-b hover:bg-muted/50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>{contact.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-1 -right-1 h-3 w-3 border-2 border-background rounded-full ${
                        contact.status === 'online' ? 'bg-green-500' : 
                        contact.status === 'away' ? 'bg-yellow-500' : 'bg-gray-400'
                      }`}></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium truncate">{contact.name}</p>
                        <span className="text-xs text-muted-foreground">{contact.time}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{contact.specialty}</p>
                      <p className="text-sm text-muted-foreground truncate">{contact.message}</p>
                    </div>
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
                    <AvatarFallback>DW</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">Dr. Sarah Wilson</p>
                    <p className="text-sm text-muted-foreground">Nutritionist • Online</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Video className="h-4 w-4" />
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
                    <AvatarFallback>DW</AvatarFallback>
                  </Avatar>
                  <div className="bg-card p-3 rounded-lg shadow-sm max-w-md">
                    <p className="text-sm">How's your nutrition plan going? I hope you're finding it manageable!</p>
                    <span className="text-xs text-muted-foreground">2:30 pm</span>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <div className="bg-primary text-primary-foreground p-3 rounded-lg shadow-sm max-w-md">
                    <p className="text-sm">It's going well! I've been following the meal plan consistently.</p>
                    <span className="text-xs opacity-80">2:45 pm</span>
                  </div>
                </div>
              </div>
            </CardContent>
            
            <div className="p-4 border-t">
              <div className="flex items-center gap-2">
                <Input placeholder="Type your message..." className="flex-1" />
                <Button size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>

          {/* Right Sidebar - Contact Profile */}
          <Card className="w-80">
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <Avatar className="h-20 w-20 mx-auto mb-4">
                  <AvatarFallback className="text-lg">DW</AvatarFallback>
                </Avatar>
                <h3 className="font-semibold">Dr. Sarah Wilson</h3>
                <p className="text-sm text-muted-foreground">Certified Nutritionist</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Specialized in plant-based nutrition and metabolic health with 8+ years of experience.</p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Specialization</span>
                    <span className="text-sm">Nutrition</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Experience</span>
                    <span className="text-sm">8+ years</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Certification</span>
                    <span className="text-sm">RD, CDE</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Location</span>
                    <span className="text-sm">Los Angeles, CA</span>
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