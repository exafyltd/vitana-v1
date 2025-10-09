import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Heart,
  Sparkles,
  Grid3X3,
  Share2,
  TestTube2,
  Stethoscope,
  Pill,
  Plane,
  MapPin,
  Brain,
  TrendingUp,
  Users,
  Award,
  DollarSign,
  Plus,
  RefreshCw
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import SEO from '@/components/SEO';
import SubNavigation from '@/components/SubNavigation';
import StandardHeader from '@/components/StandardHeader';
import { UtilityActionButton } from '@/components/ui/utility-action-button';
import { ExpandableSearchButton } from '@/components/ui/expandable-search-button';
import { UniversalCalendarButton } from '@/components/UniversalCalendarButton';
import { DiscoverMasterActionPopup } from '@/components/discover/DiscoverMasterActionPopup';
import { SplitBar, SplitBarList, SplitBarTrigger, SplitBarContent } from '@/components/ui/split-bar';

import { discoverNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { AddToCartButton } from '@/components/cart/AddToCartButton';

export default withScreenId(function Discover() {
  const navigate = useNavigate();
  const { logActivity } = useActivityLogger();
  const [activeTab, setActiveTab] = useState('suggested');
  const [masterActionOpen, setMasterActionOpen] = useState(false);

  // Log discover page view
  useEffect(() => {
    logActivity({
      activityType: 'discover.view',
      activityData: { page: 'overview' },
      dedupeKey: `discover-view-${Date.now()}`,
    });
  }, []);

  // AI Recommendations Data
  const aiRecommendations = [
    {
      id: 1,
      title: "Sleep Optimization Program",
      description: "AI-detected poor sleep patterns based on your recent diary entries",
      price: "$199",
      match: 95,
      reason: "Low sleep scores detected",
      provider: "Dr. Emily Chen",
      image: "/lovable-uploads/sarah-miller-avatar.jpg",
      badge: "Perfect Match"
    },
    {
      id: 2,
      title: "Stress Management Coaching",
      description: "1-on-1 sessions to reduce cortisol levels",
      price: "$89",
      match: 92,
      reason: "High stress indicators",
      provider: "Marcus Rodriguez",
      image: "/lovable-uploads/james-davis-avatar.jpg",
      badge: "High Priority"
    },
    {
      id: 3,
      title: "Iron-Rich Nutrition Plan",
      description: "Custom meal plan targeting iron deficiency",
      price: "$149",
      match: 90,
      reason: "Low iron biomarkers",
      provider: "Luna Wellness",
      image: "/lovable-uploads/se-hun-oh-avatar.jpg",
      badge: "Great Match"
    },
    {
      id: 4,
      title: "Adaptogen Supplement Bundle",
      description: "Natural stress relief supplements",
      price: "$79",
      match: 85,
      reason: "Stress management goal",
      provider: "Vitana Shop",
      image: "/lovable-uploads/tae-min-avatar.jpg",
      badge: "Good Match"
    }
  ];

  const browseCategories = [
    {
      id: 'supplements',
      title: 'Supplements',
      icon: Pill,
      description: 'Premium vitamins, minerals, and longevity compounds',
      count: 247,
      path: '/discover/supplements'
    },
    {
      id: 'wellness',
      title: 'Wellness Services',
      icon: Heart,
      description: 'Therapies, treatments, and wellness experiences',
      count: 156,
      path: '/discover/wellness-services'
    },
    {
      id: 'lab_tests',
      title: 'Lab Tests',
      icon: TestTube2,
      description: 'Biomarker analysis and health diagnostics',
      count: 89,
      path: '/discover/browse'
    },
    {
      id: 'doctors',
      title: 'Doctors & Coaches',
      icon: Stethoscope,
      description: 'Expert professionals for personalized care',
      count: 67,
      path: '/discover/doctors-coaches'
    },
    {
      id: 'devices',
      title: 'Devices',
      icon: Plane,
      description: 'Wearables and health tracking devices',
      count: 34,
      path: '/discover/trending'
    },
    {
      id: 'experiences',
      title: 'Experiences',
      icon: MapPin,
      description: 'Wellness retreats and immersive programs',
      count: 23,
      path: '/discover/wellness-services'
    }
  ];

  const shareAndEarnItems = [
    {
      id: 1,
      title: 'Longevity Essentials Bundle',
      description: 'Curated supplement pack for healthy aging',
      price: '$299',
      commission: '$45',
      image: '/lovable-uploads/7cca32ae-be17-4ab2-bc65-98257922207a.png',
      shares: 234,
      earnings: '$1,234'
    },
    {
      id: 2,
      title: 'Wellness Weekend Retreat',
      description: 'All-inclusive health optimization experience',
      price: '$1,299',
      commission: '$195',
      image: '/lovable-uploads/emma-wilson-avatar.jpg',
      shares: 67,
      earnings: '$567'
    },
    {
      id: 3,
      title: 'Premium Lab Test Package',
      description: 'Comprehensive biomarker analysis',
      price: '$499',
      commission: '$75',
      image: '/lovable-uploads/dr-roberts-avatar.jpg',
      shares: 123,
      earnings: '$892'
    }
  ];

  return (
    <AppLayout>
      <SEO 
        title="Discover Marketplace | VITANA" 
        description="AI-powered longevity marketplace with personalized recommendations, wellness services, supplements, and community shopping"
        canonical={window.location.href} 
      />
      <SubNavigation items={discoverNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
          <div className="max-w-7xl mx-auto space-y-6">
            <StandardHeader
              title="Discover Your Longevity Marketplace"
              description="Personalized recommendations, browse categories, and earn rewards by sharing with your community"
              emoji="🔍"
            />

          {/* Utility Action Buttons */}
          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search marketplace products, services, and experiences…"
            />
            <UniversalCalendarButton />
            <Button 
              size="sm"
              onClick={() => setMasterActionOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Action
            </Button>
            <Button 
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => window.location.reload()}
              title="Refresh page"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </UtilityActionButton>

          {/* Split Bar Navigation */}
          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList>
              <SplitBarTrigger value="suggested">
                💡 Suggested for You
              </SplitBarTrigger>
              <SplitBarTrigger value="categories">
                📂 Categories
              </SplitBarTrigger>
              <SplitBarTrigger value="share">
                💰 Share & Earn
              </SplitBarTrigger>
            </SplitBarList>

            {/* Tab 1: Suggested for You */}
            <SplitBarContent value="suggested" className="space-y-6">
              <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Brain className="h-6 w-6 text-purple-500" />
                    <h2 className="text-2xl font-semibold">AI-Powered Recommendations</h2>
                  </div>
                  <p className="text-muted-foreground mb-6">
                    Based on your Vitana Index, biomarkers, sleep scores, stress levels, and health goals
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {aiRecommendations.map((rec) => (
                      <Card key={rec.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-purple-200">
                        <div className="relative">
                          <img 
                            src={rec.image} 
                            alt={rec.title}
                            className="w-full h-40 object-cover rounded-t-lg"
                          />
                          <Badge className="absolute top-2 left-2 bg-purple-500 text-white">
                            {rec.badge}
                          </Badge>
                          <div className="absolute top-2 right-2 bg-white/90 rounded-full px-2 py-1">
                            <span className="text-xs font-bold text-purple-600">{rec.match}%</span>
                          </div>
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-sm mb-2 group-hover:text-primary transition-colors line-clamp-2">
                            {rec.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{rec.description}</p>
                          <div className="bg-purple-50 p-2 rounded-lg mb-3">
                            <div className="flex items-center gap-1">
                              <Brain className="h-3 w-3 text-purple-500" />
                              <span className="text-xs text-purple-700">{rec.reason}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-base font-bold">{rec.price}</span>
                          </div>
                          <div className="flex gap-2">
                            <AddToCartButton
                              item={{
                                item_type: 'wellness_service',
                                item_id: rec.id.toString(),
                                item_name: rec.title,
                                item_price: parseFloat(rec.price.replace('$', '')),
                                item_image_url: rec.image,
                                item_metadata: { provider: rec.provider, match: rec.match }
                              }}
                              size="sm"
                              className="flex-1"
                            />
                            <Button size="sm" className="flex-1">View</Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </SplitBarContent>

            {/* Tab 2: Categories */}
            <SplitBarContent value="categories" className="space-y-6">
              <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Grid3X3 className="h-6 w-6 text-blue-500" />
                    <h2 className="text-2xl font-semibold">Browse by Category</h2>
                  </div>
                  <p className="text-muted-foreground mb-6">
                    Explore supplements, wellness services, lab tests, devices, and experiences
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {browseCategories.map((category) => (
                      <Card 
                        key={category.id}
                        className="group hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-105"
                        onClick={() => navigate(category.path)}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="bg-primary/10 p-3 rounded-lg">
                              <category.icon className="h-6 w-6 text-primary" />
                            </div>
                            <Badge variant="outline">{category.count}</Badge>
                          </div>
                          <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                            {category.title}
                          </h3>
                          <p className="text-muted-foreground text-sm">
                            {category.description}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </SplitBarContent>

            {/* Tab 3: Share & Earn */}
            <SplitBarContent value="share" className="space-y-6">
              <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Share2 className="h-6 w-6 text-green-500" />
                    <h2 className="text-2xl font-semibold">Share & Earn Commissions</h2>
                  </div>
                  <p className="text-muted-foreground mb-6">
                    Curated product bundles you can share to earn credits and commissions
                  </p>

                  {/* Earnings Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card className="bg-gradient-to-br from-green-50 to-blue-50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="h-5 w-5 text-green-600" />
                          <span className="text-sm text-muted-foreground">Total Earnings</span>
                        </div>
                        <p className="text-2xl font-bold text-green-600">$2,693</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-purple-50 to-pink-50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="h-5 w-5 text-purple-600" />
                          <span className="text-sm text-muted-foreground">Community Shares</span>
                        </div>
                        <p className="text-2xl font-bold text-purple-600">424</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-orange-50 to-yellow-50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Award className="h-5 w-5 text-orange-600" />
                          <span className="text-sm text-muted-foreground">Top Performer</span>
                        </div>
                        <p className="text-2xl font-bold text-orange-600">Top 5%</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Shareable Products */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {shareAndEarnItems.map((item) => (
                      <Card key={item.id} className="group hover:shadow-lg transition-all duration-300">
                        <div className="relative">
                          <img 
                            src={item.image} 
                            alt={item.title}
                            className="w-full h-40 object-cover rounded-t-lg"
                          />
                          <Badge className="absolute top-2 left-2 bg-green-500 text-white">
                            Earn {item.commission}
                          </Badge>
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                            {item.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                            {item.description}
                          </p>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-lg font-bold">{item.price}</span>
                            <div className="text-xs text-muted-foreground">
                              <Users className="h-3 w-3 inline mr-1" />
                              {item.shares} shares
                            </div>
                          </div>
                          <div className="bg-green-50 p-2 rounded-lg mb-3">
                            <p className="text-xs text-green-700">
                              Community earned: <span className="font-bold">{item.earnings}</span>
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="flex-1">
                              <Share2 className="h-3 w-3 mr-1" />
                              Share
                            </Button>
                            <AddToCartButton
                              item={{
                                item_type: 'product',
                                item_id: item.id.toString(),
                                item_name: item.title,
                                item_price: parseFloat(item.price.replace('$', '')),
                                item_image_url: item.image,
                                item_metadata: { commission: item.commission }
                              }}
                              size="sm"
                              className="flex-1"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
      
      <DiscoverMasterActionPopup 
        open={masterActionOpen}
        onOpenChange={setMasterActionOpen}
      />
    </AppLayout>
  );
}, SCREEN_IDS.DISCOVER_OVERVIEW);
