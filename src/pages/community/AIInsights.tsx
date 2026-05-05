import SEO from "@/components/SEO";
import VitanaIndexValue from "@/components/health/VitanaIndexValue";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Brain, Users, TrendingUp, Shield, Target, Star, Heart, MessageSquare, Calendar, Lightbulb, BarChart3, UserPlus, Plane } from "lucide-react";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

import { communityNavigation } from "@/config/navigation";
import { t } from '@/lib/i18n-toast';

export default function AIInsights() {
  const navigate = useNavigate();
  const { pendingCount, getLatestActions } = useAutopilot();
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const latestActions = getLatestActions(2);
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
      <SEO title={t('screens.community.aiInsightsCommunity')} description="Personalized recommendations and intelligent community connections" canonical={window.location.href} />
      <SubNavigation items={communityNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header Section with Perfect Symmetry - Three Cards Layout */}
          <div className="flex flex-col lg:flex-row gap-4 mb-8">
            {/* Shortened Header Bar - Welcome Message */}
            <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">{t('screens.community.aiInsights')}</h1>
                <p className="text-muted-foreground">{t('screens.community.getPersonalizedInsightsRecommendationsFromOur')}</p>
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
                <span className="text-sm font-medium text-red-400">{t('screens.community.autopilot')}</span>
              </div>
              
              {/* Hover Preview */}
              {showPreview && pendingCount > 0 && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white/95 backdrop-blur-sm border border-white/20 rounded-lg shadow-xl p-3 z-10">
                  <div className="text-xs font-medium text-muted-foreground mb-2">{t('screens.community.latestActions')}</div>
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
        
        <div className="flex items-center justify-between">
          <div className="text-lg font-bold flex items-center gap-2">
            {t('screens.community.poweredByAi')}
          </div>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Star className="w-3 h-3" />
            {t('screens.community.poweredByAi')}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - People You Should Meet */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  {t('screens.community.peopleYouShouldMeet')}
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
                          {t('screens.community.message')}
                        </Button>
                        <Button size="sm" className="flex-1">
                          {t('screens.community.connect')}
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
                  {t('screens.community.safetyNudges')}
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
                  {t('screens.community.weeklyDigest')}
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
                  {t('screens.community.personalizedRecommendations')}
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
                        <Button size="sm">{t('screens.community.explore')}</Button>
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
                  {t('screens.community.goalbasedSuggestions')}
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
                          <span>{t('screens.community.potentialImpact')}</span>
                          <span className="font-medium text-green-600">{suggestion.impact}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>{t('screens.community.participants')}</span>
                          <span>{suggestion.participants}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>{t('screens.community.difficulty')}</span>
                          <Badge variant="outline" className="text-xs">{suggestion.difficulty}</Badge>
                        </div>
                      </div>
                      <Button size="sm" className="w-full">
                        {t('screens.community.joinChallenge')}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">{t('screens.community.aiPreferences')}</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm">{t('screens.community.connectionSuggestions')}</span>
                    <Badge variant="secondary">{t('screens.community.text')}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm">{t('screens.community.contentRecommendations')}</span>
                    <Badge variant="secondary">{t('screens.community.text')}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm">{t('screens.community.weeklyDigest')}</span>
                    <Badge variant="secondary">{t('screens.community.text')}</Badge>
                  </div>
                  <Button variant="outline" className="w-full mt-3">
                    {t('screens.community.customizeSettings')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Autopilot Popup */}
        <AutopilotPopup 
          open={autopilotOpen} 
          onOpenChange={setAutopilotOpen}
        />
        </div>
      </div>
    </AppLayout>
  );
}