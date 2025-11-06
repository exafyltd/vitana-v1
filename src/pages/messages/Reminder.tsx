import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { ReminderMasterActionPopup } from "@/components/messages/ReminderMasterActionPopup";
import { Clock, Send, Plus, MessageCircle, BarChart3, AlertCircle, CheckCircle, Edit, Trash2, Shield, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { messagesNavigation } from "@/config/navigation";
import { HorizontalCardList } from "@/components/ui/horizontal-card-list";
import { StandardHorizontalCardProps } from "@/components/ui/standard-horizontal-card";
import { HealthConsentGate } from "@/components/ui/health-consent-gate";
import { horizontalCardsSLO } from "@/lib/horizontal-cards-slo";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { SCREEN_IDS } from "@/lib/screen-id";
import { toast } from "sonner";

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
  const [consentOpen, setConsentOpen] = useState(false);
  const [consentAction, setConsentAction] = useState<() => void>(() => {});

  const useNewCards = isFeatureEnabled('enableHorizontalCardsReminder');

  // Action Handlers
  const handleMarkDone = (messageId: number) => {
    console.log('[Reminder] Marking message as done:', messageId);
    toast.success('Message marked as done');
  };

  const handleSnooze = (messageId: number) => {
    console.log('[Reminder] Snoozing message:', messageId);
    toast.info('Message snoozed for 1 hour');
  };

  const handleEdit = (messageId: number) => {
    console.log('[Reminder] Editing message:', messageId);
    toast.info('Edit dialog would open here');
  };

  const handleDelete = (messageId: number) => {
    console.log('[Reminder] Deleting message:', messageId);
    toast.success('Message deleted');
  };

  const handleReply = (messageId: number, reply: string) => {
    console.log('[Reminder] Sending reply:', reply);
    toast.success('Reply sent!');
  };

  // Transform messages to StandardHorizontalCardProps
  const baseMessages: StandardHorizontalCardProps[] = unansweredMessages.map(msg => ({
      id: msg.id.toString(),
      screenId: SCREEN_IDS.INBOX_REMINDER,
      icon: (
        <Avatar className="w-12 h-12">
          <AvatarImage src={msg.avatar} alt={msg.name} />
          <AvatarFallback>{msg.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
        </Avatar>
      ),
      title: msg.name,
      description: msg.message,
      badges: [
        { label: 'Unanswered', variant: 'secondary' as const, icon: <Clock className="w-3 h-3" /> }
      ],
      metadata: [
        { icon: <Clock className="w-3 h-3" />, text: msg.time }
      ],
      timestamp: msg.time,
      primaryAction: {
        label: 'Mark Done',
        onClick: () => handleMarkDone(msg.id),
        variant: 'default' as const,
        icon: <CheckCircle className="w-4 h-4 mr-1" />
      },
      secondaryActions: [
        { 
          label: 'Snooze', 
          onClick: () => handleSnooze(msg.id), 
          icon: <Clock className="w-3 h-3 mr-1" /> 
        },
        { 
          label: 'Edit', 
          onClick: () => handleEdit(msg.id), 
          icon: <Edit className="w-3 h-3 mr-1" /> 
        },
        { 
          label: 'Delete', 
          onClick: () => handleDelete(msg.id), 
          icon: <Trash2 className="w-3 h-3 mr-1" /> 
        }
      ],
      expandedContent: (
        <div className="pt-4 space-y-3 border-t border-white/10">
          <div className="text-sm font-medium text-muted-foreground">Quick Replies:</div>
          <div className="flex flex-wrap gap-2">
            {msg.quickReplies.map((reply, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                onClick={() => handleReply(msg.id, reply)}
              >
                <Send className="w-3 h-3 mr-1" />
                {reply}
              </Button>
            ))}
          </div>
        </div>
      ),
      density: 'comfy' as const,
      accentColor: 'hsl(var(--domain-messages-accent))'
    }));

  // Add consent test item only in dev builds
  const consentTestItem: StandardHorizontalCardProps = {
      id: 'consent-test-001',
      screenId: SCREEN_IDS.INBOX_REMINDER,
      icon: <Avatar className="w-12 h-12"><AvatarFallback>🔒</AvatarFallback></Avatar>,
      title: 'Health Data Share Request',
      description: 'Dr. Smith requested access to your recent lab results',
      badges: [
        { label: 'Requires Consent', variant: 'destructive' as const, icon: <Shield className="w-3 h-3" /> }
      ],
      privacyBadge: {
        label: 'HIPAA Protected',
        color: 'text-amber-600'
      },
      metadata: [
        { icon: <Clock className="w-3 h-3" />, text: '5m ago' }
      ],
      timestamp: '5m ago',
      primaryAction: {
        label: 'Share Data',
        onClick: () => {
          setConsentAction(() => () => {
            console.log('[HIPAA Audit] Data shared with provider');
            toast.success('Health data shared with Dr. Smith');
          });
          setConsentOpen(true);
        },
        variant: 'default' as const,
        icon: <Share2 className="w-4 h-4 mr-1" />,
        requiresConsent: true
      },
      requiresConsent: true,
      onConsentRequired: () => {
        setConsentAction(() => () => {
          console.log('[HIPAA Audit] Data shared with provider');
          toast.success('Health data shared with Dr. Smith');
        });
        setConsentOpen(true);
      },
      density: 'comfy' as const,
      accentColor: 'hsl(var(--pill-health-accent))'
    };

  const transformedMessages: StandardHorizontalCardProps[] = import.meta.env.DEV 
    ? [...baseMessages, consentTestItem]
    : baseMessages;

  // SLO Tracking
  useEffect(() => {
    if (useNewCards) {
      horizontalCardsSLO.startTTI();
    }
  }, [useNewCards]);

  useEffect(() => {
    if (useNewCards && transformedMessages.length > 0) {
      horizontalCardsSLO.endTTI();
    }
  }, [useNewCards, transformedMessages.length]);

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
            <UniversalCalendarButton />
            <Button size="sm" onClick={() => setReminderActionOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Quick Actions
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab} className="w-full">
            <SplitBarList>
              <SplitBarTrigger value="unanswered">
                ⏰ Unanswered
              </SplitBarTrigger>
              <SplitBarTrigger value="recent">
                💬 Recent Replies
              </SplitBarTrigger>
              <SplitBarTrigger value="followup">
                ⚠️ Follow Up Needed
              </SplitBarTrigger>
              <SplitBarTrigger value="stats">
                📊 Response Stats
              </SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="unanswered">
              {useNewCards ? (
                <>
                  <HorizontalCardList
                    items={transformedMessages}
                    variant="standard"
                    groupBy="date"
                    screenId={SCREEN_IDS.INBOX_REMINDER}
                    listId="reminder-unanswered"
                    gap="md"
                    emptyState={
                      <Card className="border-dashed">
                        <CardContent className="p-12 text-center">
                          <MessageCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                          <p className="text-muted-foreground">All caught up! No unanswered messages.</p>
                        </CardContent>
                      </Card>
                    }
                  />
                  
                  <HealthConsentGate
                    open={consentOpen}
                    onOpenChange={setConsentOpen}
                    actionDescription="share your health data with Dr. Smith"
                    onConsent={consentAction}
                  />
                </>
              ) : (
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
              )}
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