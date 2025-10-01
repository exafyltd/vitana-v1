import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, MoreHorizontal, Archive, FolderOpen } from "lucide-react";
import { messagesNavigation } from "@/config/navigation";

export default function Archived() {
  const archivedChats = [
    { id: 1, name: "Dr. Johnson", type: "direct", message: "Thanks for the consultation!", date: "Nov 15, 2023", category: "Healthcare" },
    { id: 2, name: "Yoga Beginners", type: "group", message: "Great session everyone!", date: "Nov 10, 2023", category: "Fitness" },
    { id: 3, name: "Sarah Martinez", type: "direct", message: "Recipe was amazing!", date: "Nov 8, 2023", category: "Nutrition" },
    { id: 4, name: "Weekend Warriors", type: "group", message: "Next hike scheduled for...", date: "Nov 5, 2023", category: "Activities" },
    { id: 5, name: "Dr. Kim", type: "direct", message: "Follow up in 2 weeks", date: "Oct 28, 2023", category: "Healthcare" },
  ];

  const categories = ["All", "Healthcare", "Fitness", "Nutrition", "Activities"];

  return (
    <AppLayout>
      <SEO title="Archived | Messages" description="View archived conversations and messages" canonical={window.location.href} />
      <SubNavigation items={messagesNavigation} />
      
      <div className="p-6">
        <StandardHeader 
          title="Never lose important conversations!"
          description="View archived conversations and messages"
          emoji="📦"
        />
        
        <div className="flex h-[calc(100vh-140px)]" style={{ gap: '24px' }}>
          {/* Left Sidebar - Archive Categories */}
          <Card className="w-80 flex flex-col">
            <CardHeader className="border-b">
              <h2 className="font-semibold mb-3">Archived Messages</h2>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search archives..." className="pl-10" />
              </div>
              <div className="space-y-1">
                {categories.map((category) => (
                  <Button key={category} variant="ghost" className="w-full justify-start">
                    {category}
                  </Button>
                ))}
              </div>
            </CardHeader>
          </Card>

          {/* Center - Archived Chat List */}
          <Card className="flex-1 flex flex-col">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">All Archived Conversations</h3>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">
                    Export
                  </Button>
                  <Button variant="ghost" size="sm">
                    Delete Selected
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-y-auto p-0">
              {archivedChats.map((chat) => (
                <div key={chat.id} className="p-4 border-b hover:bg-muted/50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {chat.type === 'group' ? '👥' : chat.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{chat.name}</p>
                          <Badge variant="outline" className="text-xs">
                            {chat.type === 'group' ? 'Group' : 'Direct'}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {chat.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{chat.message}</p>
                        <p className="text-xs text-muted-foreground">{chat.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        Restore
                      </Button>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Right Sidebar - Archive Actions */}
          <Card className="w-80">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Archive Management</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Quick Actions</h4>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      <Archive className="h-4 w-4 mr-2" />
                      Archive Current Chat
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Export Archives
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Import Archives
                    </Button>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Archive Statistics</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Archived</span>
                      <span className="text-sm font-medium">42 conversations</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">This Month</span>
                      <span className="text-sm font-medium">5 conversations</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Storage Used</span>
                      <span className="text-sm font-medium">12.5 MB</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Auto-Archive Settings</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Auto-archive after 30 days</span>
                      <input type="checkbox" defaultChecked className="rounded" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Keep important chats</span>
                      <input type="checkbox" defaultChecked className="rounded" />
                    </div>
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