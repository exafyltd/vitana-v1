import SEO from "@/components/SEO";
import VitanaIndexValue from "@/components/health/VitanaIndexValue";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, MessageSquare, TrendingUp, Lightbulb, Plus, Heart, Share2, Clock, Plane, Search } from "lucide-react";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { CreateGroupPopup } from "@/components/CreateGroupPopup";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

import { communityNavigation } from "@/config/navigation";

export default function MyGroups() {
  const navigate = useNavigate();
  const { pendingCount, getLatestActions } = useAutopilot();
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState("my-groups");
  
  const latestActions = getLatestActions(2);
  const myGroups = [
    { name: "Morning Movers", unread: 3, members: 245, avatar: "MM" },
    { name: "Mindful Nutrition", unread: 0, members: 128, avatar: "MN" },
    { name: "Local Hikers", unread: 7, members: 89, avatar: "LH" },
  ];

  const groupUpdates = [
    { group: "Morning Movers", author: "Sarah K.", content: "Just finished an amazing 5k run! Who's joining tomorrow?", time: "2h ago", likes: 12 },
    { group: "Mindful Nutrition", author: "Alex R.", content: "Recipe share: Green smoothie bowl with chia seeds 🥬", time: "4h ago", likes: 8 },
  ];

  const recommendedGroups = [
    { name: "Yoga Beginners", match: 95, members: 156, description: "Perfect for your fitness goals" },
    { name: "Meal Prep Masters", match: 88, members: 203, description: "Based on your nutrition interests" },
  ];

  return (
    <AppLayout>
      <SEO title="My Groups & Feed | Community" description="Your personalized community feed and group updates" canonical={window.location.href} />
      <SubNavigation items={communityNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header Section with Perfect Symmetry - Three Cards Layout */}
          <div className="flex flex-col lg:flex-row gap-4 mb-8">
            {/* Shortened Header Bar - Welcome Message */}
            <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">My Groups & Feed ✨</h1>
                <p className="text-muted-foreground">Stay connected with your groups and discover what's happening.</p>
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
                <span className="text-sm font-medium text-red-400">Autopilot</span>
              </div>
              
              {/* Hover Preview */}
              {showPreview && pendingCount > 0 && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white/95 backdrop-blur-sm border border-white/20 rounded-lg shadow-xl p-3 z-10">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Latest Actions:</div>
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

          {/* Utility Action Button */}
          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search Groups…"
              onSearch={(query) => console.log('Search Groups:', query)}
            />
            <UniversalCalendarButton />
            <Button size="sm" onClick={() => setCreateGroupOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Group
            </Button>
          </UtilityActionButton>

          {/* Split Navigation */}
          <SplitBar value={activeTab} onValueChange={setActiveTab} className="w-full">
            <SplitBarList>
              <SplitBarTrigger value="my-groups">👥 My Groups</SplitBarTrigger>
              <SplitBarTrigger value="recommended">✨ Recommended Groups</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="my-groups">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - My Groups */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    My Groups
                  </h2>
                  <Button size="sm" variant="outline">
                    <Plus className="w-4 h-4 mr-1" />
                    Join
                  </Button>
                </div>
                <div className="space-y-3">
                  {myGroups.map((group, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback>{group.avatar}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{group.name}</p>
                          <p className="text-sm text-muted-foreground">{group.members} members</p>
                        </div>
                      </div>
                      {group.unread > 0 && (
                        <Badge variant="secondary">{group.unread}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  Recommended Groups
                </h3>
                <div className="space-y-3">
                  {recommendedGroups.map((group, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{group.name}</h4>
                        <Badge variant="secondary">{group.match}% match</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{group.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{group.members} members</span>
                        <Button size="sm">Join Group</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Center Column - Group Updates */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Recent Updates
                </h2>
                <div className="space-y-4">
                  {groupUpdates.map((update, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{update.group}</Badge>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm font-medium">{update.author}</span>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {update.time}
                        </span>
                      </div>
                      <p className="text-sm mb-3">{update.content}</p>
                      <div className="flex items-center gap-3">
                        <Button size="sm" variant="ghost" className="h-8 px-2">
                          <Heart className="w-4 h-4 mr-1" />
                          {update.likes}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 px-2">
                          <MessageSquare className="w-4 h-4 mr-1" />
                          Reply
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 px-2">
                          <Share2 className="w-4 h-4 mr-1" />
                          Share
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Trending & Suggestions */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Trending Discussions
                </h3>
                <div className="space-y-3">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="font-medium text-sm">#MorningMotivation</p>
                    <p className="text-xs text-muted-foreground">143 posts today</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="font-medium text-sm">#HealthyMealPrep</p>
                    <p className="text-xs text-muted-foreground">89 posts today</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="font-medium text-sm">#WeekendWorkouts</p>
                    <p className="text-xs text-muted-foreground">67 posts today</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Suggested Post</h3>
                <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
                  <p className="text-sm font-medium mb-2">💧 Share your hydration tip today!</p>
                  <p className="text-xs text-muted-foreground mb-3">Help your community stay healthy and motivated</p>
                  <Button size="sm" className="w-full">Create Post</Button>
                </div>
              </CardContent>
            </Card>
          </div>
              </div>
            </SplitBarContent>

            <SplitBarContent value="recommended">
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Discover Groups</h3>
                <p className="text-muted-foreground">Recommended groups based on your interests will appear here.</p>
              </div>
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
      
      {/* Autopilot Popup */}
      <AutopilotPopup 
        open={autopilotOpen} 
        onOpenChange={setAutopilotOpen}
      />

      {/* Create Group Popup */}
      <CreateGroupPopup 
        isOpen={createGroupOpen} 
        onClose={() => setCreateGroupOpen(false)}
      />
    </AppLayout>
  );
}