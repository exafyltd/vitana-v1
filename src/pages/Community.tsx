import React, { useState } from 'react';
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from '@/components/ui/utility-action-button';
import { SplitBar, SplitBarList, SplitBarTrigger, SplitBarContent } from '@/components/ui/split-bar';
import AutopilotWidget from "@/components/health/AutopilotWidget";
import { AutopilotPopup } from '@/components/AutopilotPopup';
import { CommunityFiltersPopup } from '@/components/CommunityFiltersPopup';
import { NewsCard } from '@/components/crossover/NewsCard';
import { MotivationalBanner } from '@/components/MotivationalBanner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useAutopilot } from '@/hooks/use-autopilot';
import { withScreenId, SCREEN_IDS } from '@/lib/screen-id';
import { Users, Calendar, Award, TrendingUp, Star, Trophy, Crown, Medal, Sparkles, Heart, MapPin, Clock, UserPlus, Search, Plus, Radio, Play, Music, Target, Brain, Apple, Droplets, Moon, Dumbbell } from 'lucide-react';
import { communityNavigation } from "@/config/navigation";

// Rich mock data for Community Overview - Today Highlights
const todayHighlights = [
  {
    title: "Morning Run Club 🏃‍♀️",
    description: "Start your day with energy and community spirit at sunrise",
    imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop",
    category: "event" as const,
    pillar: "Exercise",
    author: { name: "Sarah Miller", avatar: "/lovable-uploads/sarah-miller-avatar.jpg" },
    location: "City Park",
    attendees: 32,
    timestamp: "7:00 AM"
  },
  {
    title: "Mindful Break Podcast",
    description: "\"Breathing for Focus\" - A guided meditation session",
    imageUrl: "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=800&h=600&fit=crop",
    category: "media" as const,
    pillar: "Mental",
    author: { name: "Dr. Lisa Chen", avatar: "/lovable-uploads/lisa-chen-avatar.jpg" },
    location: "Podcast Studio",
    timestamp: "New Episode"
  },
  {
    title: "Community Hydration Challenge 💪",
    description: "Join 85 participants in our daily water tracking challenge",
    imageUrl: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop",
    category: "challenge" as const,
    pillar: "Hydration",
    author: { name: "Dr. Roberts", avatar: "/lovable-uploads/dr-roberts-avatar.jpg" },
    location: "Virtual",
    attendees: 85,
    timestamp: "10:00 AM"
  }
];

// This Week in Community Events
const weeklyEvents = [
  {
    title: "Longevity Dance Night 💃",
    description: "Express yourself through movement and colorful lights",
    imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop",
    category: "event" as const,
    pillar: "Exercise",
    author: { name: "Dance Team", avatar: "/lovable-uploads/emma-wilson-avatar.jpg" },
    location: "Community Center",
    attendees: 45,
    timestamp: "Friday 8 PM"
  },
  {
    title: "Nutrition Workshop 🍎",
    description: "Learn to prep fresh, healthy meals in your kitchen",
    imageUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop",
    category: "workshop" as const,
    pillar: "Nutrition",
    author: { name: "Chef Emma", avatar: "/lovable-uploads/emma-wilson-avatar.jpg" },
    location: "Community Kitchen",
    attendees: 18,
    timestamp: "Sunday 11 AM"
  },
  {
    title: "AI Spotlight: Sleep & Recovery Circle ✨",
    description: "Discover personalized sleep optimization in cozy evening sessions",
    imageUrl: "https://images.unsplash.com/photo-1520206715542-7088b3d3c6a1?w=800&h=600&fit=crop",
    category: "ai-spotlight" as const,
    pillar: "Sleep",
    author: { name: "Sleep Expert James", avatar: "/lovable-uploads/james-davis-avatar.jpg" },
    location: "Wellness Center",
    attendees: 12,
    timestamp: "Every Wednesday"
  }
];

// Discover People
const communityPeople = [
  {
    title: "Connect with Jovana T. 👩‍💻",
    description: "Tech wellness enthusiast with 12 mutual groups",
    imageUrl: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=800&h=600&fit=crop",
    category: "profile" as const,
    pillar: "Mental",
    author: { name: "Jovana T.", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    location: "Digital Nomad",
    timestamp: "Online Now"
  },
  {
    title: "Dr. Roberts - Hydration Expert 🩺",
    description: "Leading wellness doctor and Hydration Challenge host",
    imageUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800&h=600&fit=crop",
    category: "profile" as const,
    pillar: "Hydration",
    author: { name: "Dr. Roberts", avatar: "/lovable-uploads/dr-roberts-avatar.jpg" },
    location: "Medical Center",
    timestamp: "Available for consult"
  },
  {
    title: "Mariia - Wellness Ambassador 🌸",
    description: "Inspiring wellness influencer and community leader",
    imageUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&h=600&fit=crop",
    category: "profile" as const,
    pillar: "Mental",
    author: { name: "Mariia", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    location: "Wellness Studio",
    timestamp: "Active in community"
  }
];

// Community Media
const communityMedia = [
  {
    title: "Evening Yoga Flow Replay 🎥",
    description: "Relaxing sunset yoga session for stress relief",
    imageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=600&fit=crop",
    category: "video" as const,
    pillar: "Mental",
    author: { name: "Yoga Instructor Lisa", avatar: "/lovable-uploads/lisa-chen-avatar.jpg" },
    location: "Yoga Studio",
    timestamp: "45 min video"
  },
  {
    title: "3 Easy Morning Stretches 🎬",
    description: "Quick balcony wellness routine to energize your day",
    imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop",
    category: "shorts" as const,
    pillar: "Exercise",
    author: { name: "Fitness Coach Mike", avatar: "/lovable-uploads/mike-thompson-avatar.jpg" },
    location: "Home Studio",
    timestamp: "5 min routine"
  },
  {
    title: "Focus Beats for Study Playlist 🎵",
    description: "Curated music to enhance concentration and productivity",
    imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop",
    category: "music" as const,
    pillar: "Mental",
    author: { name: "VITANA Music", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    location: "Music Studio",
    timestamp: "2h playlist"
  }
];

// Rankings Data - Top Groups
const topGroups = [
  {
    title: "Sleep & Recovery Circle 🥇",
    description: "The ultimate bedtime relaxation community with 1,240 members",
    imageUrl: "https://images.unsplash.com/photo-1520206715542-7088b3d3c6a1?w=800&h=600&fit=crop",
    category: "group" as const,
    pillar: "Sleep",
    author: { name: "Sleep Community", avatar: "/lovable-uploads/james-davis-avatar.jpg" },
    location: "Virtual Rooms",
    attendees: 1240,
    timestamp: "Most Active"
  },
  {
    title: "Longevity Dance Club 🥈",
    description: "Neon dance floor energy with 980 passionate dancers",
    imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop",
    category: "group" as const,
    pillar: "Exercise",
    author: { name: "Dance Community", avatar: "/lovable-uploads/emma-wilson-avatar.jpg" },
    location: "Dance Studios",
    attendees: 980,
    timestamp: "2nd Place"
  },
  {
    title: "Plant-Based Nutritionists 🥉",
    description: "Fresh vegan cuisine experts with 860 food lovers",
    imageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&h=600&fit=crop",
    category: "group" as const,
    pillar: "Nutrition",
    author: { name: "Nutrition Community", avatar: "/lovable-uploads/tae-min-avatar.jpg" },
    location: "Community Kitchens",
    attendees: 860,
    timestamp: "3rd Place"
  }
];

// Top Events (This Week)
const topEvents = [
  {
    title: "Hydration Challenge Kickoff",
    description: "45 participants joining the community water tracking event",
    imageUrl: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop",
    category: "challenge" as const,
    pillar: "Hydration",
    author: { name: "Dr. Roberts", avatar: "/lovable-uploads/dr-roberts-avatar.jpg" },
    location: "Virtual & Local",
    attendees: 45,
    timestamp: "This Week"
  },
  {
    title: "Mindful Eating Circle",
    description: "30 participants sharing healthy recipes and mindful techniques",
    imageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&h=600&fit=crop",
    category: "circle" as const,
    pillar: "Nutrition",
    author: { name: "Nutritionist Tae", avatar: "/lovable-uploads/tae-min-avatar.jpg" },
    location: "Community Center",
    attendees: 30,
    timestamp: "Weekly"
  },
  {
    title: "Evening Sleep Workshop",
    description: "25 participants learning better sleep quality techniques",
    imageUrl: "https://images.unsplash.com/photo-1520206715542-7088b3d3c6a1?w=800&h=600&fit=crop",
    category: "workshop" as const,
    pillar: "Sleep",
    author: { name: "Sleep Expert Lisa", avatar: "/lovable-uploads/lisa-chen-avatar.jpg" },
    location: "Wellness Center",
    attendees: 25,
    timestamp: "Every Thursday"
  }
];

// Top Creators
const topCreators = [
  {
    title: "Lisa Chen - Wellness Guru",
    description: "Hosted 12 amazing events this month in yoga and mindfulness",
    imageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=600&fit=crop",
    category: "creator" as const,
    pillar: "Mental",
    author: { name: "Lisa Chen", avatar: "/lovable-uploads/lisa-chen-avatar.jpg" },
    location: "Yoga Studio",
    timestamp: "12 Events Hosted"
  },
  {
    title: "Trainer Mike - Fitness Pro",
    description: "Led 9 high-energy fitness bootcamps with incredible results",
    imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop",
    category: "creator" as const,
    pillar: "Exercise",
    author: { name: "Trainer Mike", avatar: "/lovable-uploads/mike-thompson-avatar.jpg" },
    location: "Fitness Studio",
    timestamp: "9 Bootcamps Led"
  },
  {
    title: "Chef Emma - Culinary Expert",
    description: "Created 6 inspiring cooking workshops with healthy recipes",
    imageUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop",
    category: "creator" as const,
    pillar: "Nutrition",
    author: { name: "Chef Emma", avatar: "/lovable-uploads/emma-wilson-avatar.jpg" },
    location: "Community Kitchen",
    timestamp: "6 Workshops Created"
  }
];

// Spotlight Data
const spotlightFeatures = [
  {
    title: "Featured Group: Sleep & Recovery Circle",
    description: "Join our most popular night-time community for better rest",
    imageUrl: "https://images.unsplash.com/photo-1520206715542-7088b3d3c6a1?w=800&h=600&fit=crop",
    category: "featured-group" as const,
    pillar: "Sleep",
    author: { name: "Sleep Community", avatar: "/lovable-uploads/james-davis-avatar.jpg" },
    location: "Virtual Rooms",
    attendees: 1240,
    timestamp: "Join Now"
  },
  {
    title: "Featured Event: Mindful Eating Circle",
    description: "Experience mindful nutrition with our colorful shared meal community",
    imageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&h=600&fit=crop",
    category: "featured-event" as const,
    pillar: "Nutrition",
    author: { name: "Nutritionist Tae", avatar: "/lovable-uploads/tae-min-avatar.jpg" },
    location: "Community Center",
    attendees: 30,
    timestamp: "Next Session"
  },
  {
    title: "Featured Creator: Lisa Chen - Longevity Ambassador",
    description: "Meet our inspiring yoga studio leader transforming lives daily",
    imageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=600&fit=crop",
    category: "featured-creator" as const,
    pillar: "Mental",
    author: { name: "Lisa Chen", avatar: "/lovable-uploads/lisa-chen-avatar.jpg" },
    location: "Yoga Studio",
    timestamp: "Follow Her Journey"
  },
  {
    title: "AI Spotlight Suggestion 🤖",
    description: "Based on your wellness goals, join this Hydration Challenge 💧",
    imageUrl: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop",
    category: "ai-suggestion" as const,
    pillar: "Hydration",
    author: { name: "VITANA AI", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    location: "Personalized for You",
    timestamp: "Start Today"
  }
];

// Render grid function for alternating layouts like in Meetups
const renderEventGrid = (events: any[]) => {
  const rows = [];
  
  // Group events into rows of 3 using CTO-approved patterns
  for (let i = 0; i < events.length; i += 3) {
    const rowEvents = events.slice(i, i + 3);
    const isEvenRow = Math.floor(i / 3) % 2 === 0;
    
    rows.push(
      <div key={i} className="grid grid-cols-12 gap-6 mb-6" style={{ minHeight: '280px' }}>
        {isEvenRow ? (
          // Row pattern: big + small + small
          <>
            <div className="col-span-6">
              <NewsCard
                key={`${i}-0`}
                title={rowEvents[0]?.title || ""}
                description={rowEvents[0]?.description}
                imageUrl={rowEvents[0]?.imageUrl || ""}
                pillar={rowEvents[0]?.pillar}
                author={rowEvents[0]?.author}
                location={rowEvents[0]?.location}
                attendees={rowEvents[0]?.attendees}
                timestamp={rowEvents[0]?.timestamp}
                className="h-full"
              />
            </div>
            {rowEvents[1] && (
              <div className="col-span-3">
                <NewsCard
                  key={`${i}-1`}
                  title={rowEvents[1].title}
                  description={rowEvents[1].description}
                  imageUrl={rowEvents[1].imageUrl}
                  pillar={rowEvents[1].pillar}
                  author={rowEvents[1].author}
                  location={rowEvents[1].location}
                  attendees={rowEvents[1].attendees}
                  timestamp={rowEvents[1].timestamp}
                  className="h-full"
                />
              </div>
            )}
            {rowEvents[2] && (
              <div className="col-span-3">
                <NewsCard
                  key={`${i}-2`}
                  title={rowEvents[2].title}
                  description={rowEvents[2].description}
                  imageUrl={rowEvents[2].imageUrl}
                  pillar={rowEvents[2].pillar}
                  author={rowEvents[2].author}
                  location={rowEvents[2].location}
                  attendees={rowEvents[2].attendees}
                  timestamp={rowEvents[2].timestamp}
                  className="h-full"
                />
              </div>
            )}
          </>
        ) : (
          // Row pattern: small + small + big
          <>
            {rowEvents[0] && (
              <div className="col-span-3">
                <NewsCard
                  key={`${i}-0`}
                  title={rowEvents[0].title}
                  description={rowEvents[0].description}
                  imageUrl={rowEvents[0].imageUrl}
                  pillar={rowEvents[0].pillar}
                  author={rowEvents[0].author}
                  location={rowEvents[0].location}
                  attendees={rowEvents[0].attendees}
                  timestamp={rowEvents[0].timestamp}
                  className="h-full"
                />
              </div>
            )}
            {rowEvents[1] && (
              <div className="col-span-3">
                <NewsCard
                  key={`${i}-1`}
                  title={rowEvents[1].title}
                  description={rowEvents[1].description}
                  imageUrl={rowEvents[1].imageUrl}
                  pillar={rowEvents[1].pillar}
                  author={rowEvents[1].author}
                  location={rowEvents[1].location}
                  attendees={rowEvents[1].attendees}
                  timestamp={rowEvents[1].timestamp}
                  className="h-full"
                />
              </div>
            )}
            {rowEvents[2] && (
              <div className="col-span-6">
                <NewsCard
                  key={`${i}-2`}
                  title={rowEvents[2].title}
                  description={rowEvents[2].description}
                  imageUrl={rowEvents[2].imageUrl}
                  pillar={rowEvents[2].pillar}
                  author={rowEvents[2].author}
                  location={rowEvents[2].location}
                  attendees={rowEvents[2].attendees}
                  timestamp={rowEvents[2].timestamp}
                  className="h-full"
                />
              </div>
            )}
          </>
        )}
      </div>
    );
  }
  
  return <div className="px-6">{rows}</div>;
};

export default withScreenId(function Community() {
  const { pendingCount, getLatestActions } = useAutopilot();
  const [timeframe, setTimeframe] = useState("7d");
  const [scope, setScope] = useState("global");
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [communityFiltersOpen, setCommunityFiltersOpen] = useState(false);
  
  const latestActions = getLatestActions(2);

  return (
    <AppLayout>
      <SEO title="Community" description="Connect with the community through groups, events, and matchmaking" canonical={window.location.href} />
      <SubNavigation items={communityNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader
            title="Your Community Hub"
            description="Connect, share, and grow together with your wellness community."
            emoji="✨"
          />

          {/* Action Buttons */}
          <UtilityActionButton>
            <Button variant="outline" size="sm">
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
            <Button size="sm" onClick={() => setCommunityFiltersOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Hub
            </Button>
          </UtilityActionButton>

          {/* Autopilot Integration */}
          <div className="mb-6">
            <AutopilotWidget 
              sectionName="Community"
              suggestions={[
                "Auto-join matching groups based on your interests",
                "Schedule group meetups that fit your calendar",
                "Connect with nearby members for wellness activities"
              ]}
              isEnabled={true}
              variant="inline"
            />
          </div>

          <SplitBar defaultValue="overview" className="w-full">
            <SplitBarList>
              <SplitBarTrigger value="overview">Overview</SplitBarTrigger>
              <SplitBarTrigger value="rankings">Rankings</SplitBarTrigger>
              <SplitBarTrigger value="spotlight">Spotlight</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="overview">
              {/* Today Highlights */}
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 px-6">Today Highlights</h3>
                {renderEventGrid(todayHighlights)}
              </div>

              {/* Motivational Banner */}
              <div className="px-6 mb-8">
                <MotivationalBanner variant="encouragement" />
              </div>

              {/* This Week in Community */}
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 px-6">This Week in Community</h3>
                {renderEventGrid(weeklyEvents)}
              </div>

              {/* Discover People */}
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 px-6">Discover People</h3>
                {renderEventGrid(communityPeople)}
              </div>

              {/* Community Media */}
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 px-6">Community Media</h3>
                {renderEventGrid(communityMedia)}
              </div>
            </SplitBarContent>

            <SplitBarContent value="rankings">
              {/* Rankings Controls */}
              <div className="flex flex-wrap gap-4 mb-6 p-4 bg-white/50 rounded-lg mx-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Timeframe:</span>
                  <Select value={timeframe} onValueChange={setTimeframe}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="7d">7 Days</SelectItem>
                      <SelectItem value="30d">30 Days</SelectItem>
                      <SelectItem value="all">All-time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Scope:</span>
                  <Select value={scope} onValueChange={setScope}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Global</SelectItem>
                      <SelectItem value="region">Region</SelectItem>
                      <SelectItem value="group">My Groups</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Top 3 Groups */}
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 px-6">Top 3 Groups</h3>
                {renderEventGrid(topGroups)}
              </div>

              {/* Motivational Banner */}
              <div className="px-6 mb-8">
                <MotivationalBanner variant="achievement" />
              </div>

              {/* Top Events This Week */}
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 px-6">Top Events (This Week)</h3>
                {renderEventGrid(topEvents)}
              </div>

              {/* Top Creators */}
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 px-6">Top Creators</h3>
                {renderEventGrid(topCreators)}
              </div>

              {/* Badges Section */}
              <div className="px-6 mb-8">
                <h3 className="text-xl font-bold mb-4">Community Badges</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4 text-center border-2 border-orange-200">
                    <Trophy className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                    <h4 className="font-bold">Rising Star</h4>
                    <p className="text-sm text-muted-foreground">Dr. Roberts</p>
                  </Card>
                  <Card className="p-4 text-center border-2 border-yellow-200">
                    <Star className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                    <h4 className="font-bold">Top Host</h4>
                    <p className="text-sm text-muted-foreground">Lisa Chen</p>
                  </Card>
                  <Card className="p-4 text-center border-2 border-purple-200">
                    <Heart className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <h4 className="font-bold">Most Inspiring</h4>
                    <p className="text-sm text-muted-foreground">Sarah Miller</p>
                  </Card>
                </div>
              </div>
            </SplitBarContent>

            <SplitBarContent value="spotlight">
              {/* Featured Content */}
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 px-6">Featured Content</h3>
                {renderEventGrid(spotlightFeatures)}
              </div>

              {/* Motivational Banner */}
              <div className="px-6 mb-8">
                <MotivationalBanner variant="partnership" />
              </div>

              {/* AI Spotlight Suggestion */}
              <div className="px-6">
                <Card className="p-6 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border-blue-200">
                  <div className="flex items-center space-x-4">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-full p-3">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold mb-2">AI Spotlight Recommendation</h4>
                      <p className="text-muted-foreground mb-4">
                        Based on your wellness goals and community activity, we recommend joining the Hydration Challenge 💧
                      </p>
                      <Button variant="default">
                        Join Challenge
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            </SplitBarContent>
          </SplitBar>

          {/* Popups */}
          {autopilotOpen && (
            <AutopilotPopup 
              open={autopilotOpen} 
              onOpenChange={setAutopilotOpen}
            />
          )}
          
          {communityFiltersOpen && (
            <CommunityFiltersPopup 
              open={communityFiltersOpen} 
              onOpenChange={setCommunityFiltersOpen}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}, SCREEN_IDS.COMMUNITY_OVERVIEW);