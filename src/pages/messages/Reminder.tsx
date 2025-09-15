import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { ReminderMasterActionPopup } from "@/components/messages/ReminderMasterActionPopup";
import { Clock, Send, Plus, MessageCircle, BarChart3, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { messagesNavigation } from "@/config/navigation";

const unansweredMessages = [
  { 
    id: 1, 
    name: "Dr. Roberts", 
    message: "How are you feeling after the treatment?", 
    time: "2h ago", 
    avatar: "/lovable-uploads/dr-roberts-avatar.jpg",
    quickReplies: ["Much better, thanks!", "Still recovering", "Could be better"]
  },
  { 
    id: 2, 
    name: "Emma Wilson", 
    message: "Are you joining the wellness group session tomorrow?", 
    time: "4h ago", 
    avatar: "/lovable-uploads/emma-wilson-avatar.jpg",
    quickReplies: ["Yes, I'll be there", "Can't make it", "What time?"]
  },
  { 
    id: 3, 
    name: "Wellness Group", 
    message: "Don't forget about your workout goal this week!", 
    time: "1d ago", 
    avatar: "/lovable-uploads/design-team-avatar.jpg",
    quickReplies: ["Thanks for reminder!", "Already done ✓", "Will do today"]
  },
  { 
    id: 4, 
    name: "James Davis", 
    message: "How's your meditation practice going?", 
    time: "2d ago", 
    avatar: "/lovable-uploads/james-davis-avatar.jpg",
    quickReplies: ["Great progress!", "Still learning", "Need tips"]
  }
];

export default function Reminder() {
  const [reminderActionOpen, setReminderActionOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("unanswered");
  return (
    <AppLayout>
      <SEO 
        title="Smart Reminders | Messages" 
        description="Catch up with unanswered messages and respond quickly with smart suggestions"
        canonical={window.location.href}
      />
      <SubNavigation items={messagesNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-domain-messages-tint via-background to-domain-messages-tint/50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader
            title="Smart Reminders"
            description="Catch up with unanswered messages and respond quickly"
            emoji="⏰"
          />

          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search unanswered messages..."
              onSearch={(query) => console.log('Search:', query)}
            />
            <Button size="sm" onClick={() => setReminderActionOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Quick Actions
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab} className="w-full">
            <SplitBarList className="grid w-full grid-cols-4">
              <SplitBarTrigger value="unanswered">
                <Clock className="w-4 h-4 mr-2" />
                Unanswered
              </SplitBarTrigger>
              <SplitBarTrigger value="recent">
                <MessageCircle className="w-4 h-4 mr-2" />
                Recent Replies
              </SplitBarTrigger>
              <SplitBarTrigger value="followup">
                <AlertCircle className="w-4 h-4 mr-2" />
                Follow Up Needed
              </SplitBarTrigger>
              <SplitBarTrigger value="stats">
                <BarChart3 className="w-4 h-4 mr-2" />
                Response Stats
              </SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="unanswered">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-500" />
                    Unanswered Messages
                    <Badge variant="secondary">{unansweredMessages.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {unansweredMessages.map((message) => (
                    <div key={message.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={message.avatar} alt={message.name} />
                          <AvatarFallback>{message.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm">{message.name}</h4>
                            <span className="text-xs text-muted-foreground">{message.time}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{message.message}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 ml-13">
                        {message.quickReplies.map((reply, idx) => (
                          <Button
                            key={idx}
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => console.log(`Sending: ${reply}`)}
                          >
                            <Send className="w-3 h-3 mr-1" />
                            {reply}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </SplitBarContent>

            <SplitBarContent value="recent">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-green-500" />
                    Recent Replies
                    <Badge variant="secondary">3</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center py-8">Messages you've replied to recently will appear here.</p>
                </CardContent>
              </Card>
            </SplitBarContent>

            <SplitBarContent value="followup">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-orange-500" />
                    Follow Up Needed
                    <Badge variant="secondary">2</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center py-8">Messages requiring follow-up actions will appear here.</p>
                </CardContent>
              </Card>
            </SplitBarContent>

            <SplitBarContent value="stats">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-500" />
                    Response Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center py-8">Your response time analytics and patterns will appear here.</p>
                </CardContent>
              </Card>
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
      
      <ReminderMasterActionPopup 
        open={reminderActionOpen}
        onOpenChange={setReminderActionOpen}
      />
    </AppLayout>
  );
}