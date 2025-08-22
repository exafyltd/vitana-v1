import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Brain, Users, TrendingUp, Shield, Target, Star, Heart, MessageSquare, Calendar, Lightbulb, BarChart3, UserPlus } from "lucide-react";

const communitySubItems = [
  { id: "overview", name: "Overview", path: "/community" },
  { id: "my-groups", name: "My Groups & Feed", path: "/community/my-groups" },
  { id: "events", name: "Events & Meetups", path: "/community/events" },
  { id: "my-business", name: "My Business", path: "/community/my-business" },
  { id: "media-hub", name: "Media Hub", path: "/community/media-hub" },
  { id: "live-interaction", name: "LIVE Hub", path: "/community/live-interaction" },
  { id: "ai-insights", name: "AI Insights", path: "/community/ai-insights" },
];

export default function AIInsights() {
  const recommendedConnections = [
    {
      name: "Alex Rodriguez",
      matchScore: 95,
      sharedGoals: ["Weight Loss", "Running"],
      location: "2.3 miles away",
      avatar: "AR",
      commonGroups: 3,
      activityLevel: "High"
    },
    {
      name: "Maria Chen",
      matchScore: 88,
      sharedGoals: ["Meditation", "Mindfulness"],
      location: "1.8 miles away",
      avatar: "MC",
      commonGroups: 2,
      activityLevel: "Medium"
    },
    {
      name: "David Kim",
      matchScore: 82,
      sharedGoals: ["Nutrition", "Cooking"],
      location: "3.1 miles away",
      avatar: "DK",
      commonGroups: 1,
      activityLevel: "High"
    }
  ];

  const weeklyDigest = [
    {
      category: "Most Active Groups",
      items: ["Morning Movers (45 posts)", "Healthy Recipes (32 posts)", "Mindful Living (28 posts)"]
    },
    {
      category: "Trending Topics",
      items: ["#HealthyMealPrep", "#MorningRoutine", "#WeekendWorkouts"]
    },
    {
      category: "Events You Missed",
      items: ["Yoga Flow Session", "Nutrition Workshop", "Book Club Meeting"]
    }
  ];

  const safetyNudges = [
    {
      type: "Privacy Reminder",
      message: "Review your location sharing settings for meetups",
      action: "Review Settings",
      priority: "medium"
    },
    {
      type: "Interaction Tip",
      message: "Remember to keep conversations respectful and supportive",
      action: "View Guidelines",
      priority: "low"
    }
  ];

  const personalizedRecommendations = [
    {
      type: "Event",
      title: "Morning Yoga Class",
      reason: "Based on your meditation interests",
      relevanceScore: 92,
      category: "Fitness"
    },
    {
      type: "Group",
      title: "Healthy Cooking Enthusiasts",
      reason: "Matches your nutrition goals",
      relevanceScore: 88,
      category: "Nutrition"
    },
    {
      type: "Content",
      title: "10-Minute Stretching Videos",
      reason: "Popular with similar users",
      relevanceScore: 85,
      category: "Wellness"
    }
  ];

  const goalBasedSuggestions = [
    {
      goal: "Improve Vitana Index Score",
      suggestion: "Join the '30-Day Walking Challenge'",
      impact: "+15 points potential",
      participants: 89,
      difficulty: "Easy"
    },
    {
      goal: "Better Sleep",
      suggestion: "Follow 'Evening Meditation' series",
      impact: "Sleep quality boost",
      participants: 156,
      difficulty: "Beginner"
    }
  ];

  return (
    <AppLayout>
      <SEO title="AI Insights | Community" description="Personalized recommendations and intelligent community connections" canonical={window.location.href} />
      <SubNavigation items={communitySubItems} />
      <div className="p-6 space-y-6">
        <PageHeader 
          title="AI-powered community wisdom! 🤖"
          description="Personalized recommendations and intelligent community connections"
          icon={Brain}
        />
        
        <div className="flex items-center justify-between">
          <div className="text-lg font-bold flex items-center gap-2">
            Powered by AI
          </div>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Star className="w-3 h-3" />
            Powered by AI
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - People You Should Meet */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  People You Should Meet
                </h2>
                <div className="space-y-4">
                  {recommendedConnections.map((person, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-start gap-3 mb-3">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback>{person.avatar}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-sm">{person.name}</h3>
                            <Badge variant="secondary" className="text-xs">{person.matchScore}% match</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{person.location}</p>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {person.sharedGoals.map((goal, goalIndex) => (
                              <Badge key={goalIndex} variant="outline" className="text-xs">{goal}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground">
                        <span>{person.commonGroups} common groups</span>
                        <span className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${person.activityLevel === 'High' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                          {person.activityLevel} activity
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1">
                          <MessageSquare className="w-3 h-3 mr-1" />
                          Message
                        </Button>
                        <Button size="sm" className="flex-1">
                          Connect
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Safety Nudges
                </h3>
                <div className="space-y-3">
                  {safetyNudges.map((nudge, index) => (
                    <div key={index} className={`p-3 rounded-lg border ${nudge.priority === 'medium' ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-xs">{nudge.type}</Badge>
                        <div className={`w-2 h-2 rounded-full ${nudge.priority === 'medium' ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
                      </div>
                      <p className="text-sm mb-3">{nudge.message}</p>
                      <Button size="sm" variant="outline" className="w-full">
                        {nudge.action}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Center Column - Weekly Digest & Recommendations */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Weekly Digest
                </h2>
                <div className="space-y-4">
                  {weeklyDigest.map((section, index) => (
                    <div key={index} className="p-4 bg-muted/50 rounded-lg">
                      <h3 className="font-semibold text-sm mb-3">{section.category}</h3>
                      <div className="space-y-2">
                        {section.items.map((item, itemIndex) => (
                          <div key={itemIndex} className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                            <span className="text-sm">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  Personalized Recommendations
                </h3>
                <div className="space-y-3">
                  {personalizedRecommendations.map((rec, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-xs">{rec.type}</Badge>
                        <Badge variant="secondary" className="text-xs">{rec.relevanceScore}% relevant</Badge>
                      </div>
                      <h4 className="font-medium text-sm mb-1">{rec.title}</h4>
                      <p className="text-xs text-muted-foreground mb-2">{rec.reason}</p>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">{rec.category}</Badge>
                        <Button size="sm">Explore</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Goal-Based Suggestions */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Goal-Based Suggestions
                </h3>
                <div className="space-y-4">
                  {goalBasedSuggestions.map((suggestion, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="mb-3">
                        <Badge variant="outline" className="text-xs mb-2">{suggestion.goal}</Badge>
                        <h4 className="font-medium text-sm">{suggestion.suggestion}</h4>
                      </div>
                      <div className="space-y-2 text-xs text-muted-foreground mb-3">
                        <div className="flex items-center justify-between">
                          <span>Potential Impact:</span>
                          <span className="font-medium text-green-600">{suggestion.impact}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Participants:</span>
                          <span>{suggestion.participants}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Difficulty:</span>
                          <Badge variant="outline" className="text-xs">{suggestion.difficulty}</Badge>
                        </div>
                      </div>
                      <Button size="sm" className="w-full">
                        Join Challenge
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">AI Preferences</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm">Connection suggestions</span>
                    <Badge variant="secondary">On</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm">Content recommendations</span>
                    <Badge variant="secondary">On</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm">Weekly digest</span>
                    <Badge variant="secondary">On</Badge>
                  </div>
                  <Button variant="outline" className="w-full mt-3">
                    Customize Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}