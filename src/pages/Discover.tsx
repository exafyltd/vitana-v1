import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Filter, 
  Star, 
  Clock, 
  Users,   
  MapPin,
  TestTube2,
  Activity,
  Heart,
  Zap,
  TrendingUp,
  Bookmark,
  Sparkles
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import SEO from '@/components/SEO';
import SubNavigation from '@/components/SubNavigation';
import PageHeader from '@/components/PageHeader';
import LabTestCard from '@/components/LabTestCard';
import LabTestOrderPopup from '@/components/LabTestOrderPopup';
import { IntentRouter } from '@/pages/discover/IntentRouter';
import { supabase } from '@/integrations/supabase/client';

import { discoverNavigation } from "@/config/navigation";

import StandardHeader from "@/components/StandardHeader";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";

export default withScreenId(function Discover() {
  const navigate = useNavigate();
  const [labTests, setLabTests] = useState([]);
  const [selectedLabTest, setSelectedLabTest] = useState(null);
  const [isOrderPopupOpen, setIsOrderPopupOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchLabTests();
  }, []);

  const fetchLabTests = async () => {
    try {
      const { data, error } = await supabase
        .from('lab_tests')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setLabTests(data || []);
    } catch (error) {
      console.error('Error fetching lab tests:', error);
    }
  };

  const handleOrderLabTest = (labTest) => {
    setSelectedLabTest(labTest);
    setIsOrderPopupOpen(true);
  };

  const filteredLabTests = labTests.filter(test => {
    const matchesCategory = activeCategory === 'all' || test.category === activeCategory;
    const matchesSearch = test.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         test.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = [
    { id: 'all', name: 'All Tests', icon: TestTube2 },
    { id: 'blood_markers', name: 'Blood Markers', icon: Activity },
    { id: 'genomics', name: 'Genomics', icon: Zap },
    { id: 'microbiome', name: 'Microbiome', icon: Heart },
    { id: 'metabolomics', name: 'Metabolomics', icon: TrendingUp },
    { id: 'allergy', name: 'Allergy', icon: Activity },
    { id: 'cancer', name: 'Cancer Screening', icon: Heart },
    { id: 'specialized', name: 'Pregnancy & Specialized', icon: Sparkles },
  ];

  const featuredOffers = [
    {
      id: 1,
      title: "Longevity Health Assessment",
      description: "Complete biomarker analysis & optimization plan",
      price: "$299",
      originalPrice: "$399",
      image: "/lovable-uploads/dr-roberts-avatar.jpg",
      rating: 4.9,
      location: "NYC Longevity Center",
      available: "Next week",
      category: "doctor"
    },
    {
      id: 2,
      title: "NAD+ IV Therapy",
      description: "Cellular regeneration therapy session",
      price: "$189",
      period: "/session",
      image: "/lovable-uploads/emma-wilson-avatar.jpg",
      rating: 4.8,
      location: "Wellness Clinic",
      available: "Available today",
      category: "therapy"
    },
    {
      id: 3,
      title: "Red Light Therapy Device",
      description: "Professional-grade home photobiomodulation",
      price: "$599",
      originalPrice: "$799",
      image: "/lovable-uploads/7cca32ae-be17-4ab2-bc65-98257922207a.png",
      rating: 4.7,
      inStock: true,
      shipping: "Free shipping",
      category: "product"
    },
    {
      id: 4,
      title: "Functional Fitness Training",
      description: "Movement patterns for longevity & vitality",
      price: "$75",
      period: "/session",
      image: "/lovable-uploads/mike-thompson-avatar.jpg",
      rating: 4.6,
      location: "Online/Local",
      available: "Tomorrow 9AM",
      category: "fitness"
    },
    {
      id: 5,
      title: "Mindfulness for Longevity",
      description: "Stress reduction techniques for healthy aging",
      price: "$55",
      period: "/session",
      image: "/lovable-uploads/lisa-chen-avatar.jpg",
      rating: 4.8,
      location: "Zen Wellness Center",
      available: "Today 3PM",
      category: "mental"
    }
  ];

  const aiRecommendations = [
    {
      id: 1,
      title: "Sleep Optimization Program",
      description: "AI-detected poor sleep patterns. 4-week program",
      price: "$199",
      match: 95,
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
      provider: "Marcus Rodriguez",
      image: "/lovable-uploads/james-davis-avatar.jpg",
      badge: "High Priority"
    },
    {
      id: 3,
      title: "Nutrition Reset Plan",
      description: "Custom meal planning based on your goals",
      price: "$149",
      match: 88,
      provider: "Luna Wellness",
      image: "/lovable-uploads/se-hun-oh-avatar.jpg",
      badge: "Great Match"
    },
    {
      id: 4,
      title: "Flexibility Training Kit",
      description: "Equipment & guide to improve mobility scores",
      price: "$79",
      match: 85,
      provider: "FlexFit Studio",
      image: "/lovable-uploads/tae-min-avatar.jpg",
      badge: "Good Match"
    },
    {
      id: 5,
      title: "Mindfulness Course",
      description: "8-week course to boost mental wellness",
      price: "$129",
      match: 83,
      provider: "Zen Center",
      image: "/lovable-uploads/murphy-avatar.jpg",
      badge: "Recommended"
    }
  ];

  const quickActions = [
    {
      title: "Trending",
      subtitle: "Most popular longevity services this week",
      icon: TrendingUp,
      action: "Explore",
      color: "bg-orange-500",
      path: "/discover/trending"
    },
    {
      title: "AI Recommendations",
      subtitle: "Personalized suggestions based on your data",
      icon: Sparkles,
      action: "View",
      color: "bg-purple-500",
      path: "/discover/recommendations"
    },
    {
      title: "Saved Items",
      subtitle: "Your bookmarked favorites and wishlist",
      icon: Heart,
      action: "Browse",
      color: "bg-pink-500",
      path: "/discover/saved"
    }
  ];

  const topProviders = [
    {
      id: 1,
      name: "Dr. Sarah Chen",
      specialty: "Longevity Medicine",
      rating: 4.9,
      reviews: 156,
      nextAvailable: "Today 2PM",
      image: "/lovable-uploads/sarah-miller-avatar.jpg",
      badge: "Top Rated"
    },
    {
      id: 2,
      name: "Marcus Rodriguez",
      specialty: "Functional Fitness",
      rating: 4.8,
      reviews: 89,
      nextAvailable: "Tomorrow 9AM",
      image: "/lovable-uploads/mike-thompson-avatar.jpg",
      badge: "Trending"
    },
    {
      id: 3,
      name: "Luna Wellness Spa",
      specialty: "Recovery Therapy",
      rating: 4.9,
      reviews: 234,
      nextAvailable: "Today 4PM",
      image: "/lovable-uploads/design-team-avatar.jpg",
      badge: "Near You"
    },
    {
      id: 4,
      name: "Peak Performance Lab",
      specialty: "Biohacking & Optimization",
      rating: 4.7,
      reviews: 67,
      nextAvailable: "Friday 10AM",
      image: "/lovable-uploads/james-davis-avatar.jpg",
      badge: "New"
    },
    {
      id: 5,
      name: "Maya Wellness",
      specialty: "Holistic Health Coaching",
      rating: 4.9,
      reviews: 123,
      nextAvailable: "Monday 1PM",
      image: "/lovable-uploads/emma-wilson-avatar.jpg",
      badge: "Popular"
    }
  ];

  return (
    <AppLayout>
      <SEO title="Discover Overview | VITANA" description="Discover wellness services, products, and providers tailored to your needs" canonical={window.location.href} />
      <SubNavigation items={discoverNavigation} />
      <div className="p-6 space-y-8">
        <div className="max-w-7xl mx-auto">
          <StandardHeader
            title="Discover your Longevity Marketplace"
            description="Find doctors, wellness services, and community groups perfectly matched to your healthy aging journey."
            emoji="🔍"
          />

          {/* Intent Router */}
          <IntentRouter />

          {/* Enhanced Filters - moved to separate sections */}
          <div className="bg-background/95 backdrop-blur-sm rounded-xl p-6 shadow-sm border mb-8">
            <div className="flex flex-wrap gap-3">
              <Select>
                <SelectTrigger className="w-[140px] bg-background">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="lab_tests">Lab Tests</SelectItem>
                  <SelectItem value="doctor">Doctors</SelectItem>
                  <SelectItem value="therapy">Therapies</SelectItem>
                  <SelectItem value="fitness">Fitness</SelectItem>
                  <SelectItem value="mental">Mental Health</SelectItem>
                  <SelectItem value="products">Products</SelectItem>
                  <SelectItem value="hospitality">Hospitality</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-[120px] bg-background">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="all">All Locations</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="local">Local</SelectItem>
                  <SelectItem value="travel">Travel Required</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-[100px] bg-background">
                  <SelectValue placeholder="Price" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="all">All Prices</SelectItem>
                  <SelectItem value="0-50">$0 - $50</SelectItem>
                  <SelectItem value="50-150">$50 - $150</SelectItem>
                  <SelectItem value="150+">$150+</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-[120px] bg-background">
                  <SelectValue placeholder="Availability" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="all">Any Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-[130px] bg-background">
                  <SelectValue placeholder="Service Type" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="consultation">Consultation</SelectItem>
                  <SelectItem value="therapy">Therapy</SelectItem>
                  <SelectItem value="workshop">Workshop</SelectItem>
                  <SelectItem value="product">Product</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-[110px] bg-background">
                  <SelectValue placeholder="Duration" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="all">Any Duration</SelectItem>
                  <SelectItem value="30">30 mins</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">90 mins</SelectItem>
                  <SelectItem value="120">2+ hours</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-[100px] bg-background">
                  <SelectValue placeholder="Rating" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="all">Any Rating</SelectItem>
                  <SelectItem value="4.5">4.5+ Stars</SelectItem>
                  <SelectItem value="4.0">4.0+ Stars</SelectItem>
                  <SelectItem value="3.5">3.5+ Stars</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Featured Offers */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-foreground">Featured Offers</h2>
              <Button variant="outline" size="sm" onClick={() => navigate('/discover/trending')}>
                View All
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
               {featuredOffers.map((offer) => (
                 <Card key={offer.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col h-full">
                   <div className="relative">
                     <img 
                       src={offer.image} 
                       alt={offer.title}
                       className="w-full h-32 sm:h-36 md:h-40 lg:h-44 object-cover rounded-t-lg"
                     />
                    <Button size="icon" variant="ghost" className="absolute top-2 right-2 bg-white/80 hover:bg-white h-7 w-7">
                      <Heart className="h-3 w-3" />
                    </Button>
                    {offer.originalPrice && (
                      <Badge className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1">
                        -{Math.round((1 - parseInt(offer.price.slice(1)) / parseInt(offer.originalPrice.slice(1))) * 100)}%
                      </Badge>
                    )}
                  </div>
                   <CardContent className="p-3 sm:p-4 lg:p-5 flex-1 flex flex-col">
                     <div className="flex items-start justify-between gap-2 mb-2 lg:mb-3">
                       <h3 className="font-semibold text-sm lg:text-base text-foreground group-hover:text-primary transition-colors line-clamp-2 flex-1">
                         {offer.title}
                       </h3>
                       <div className="flex items-center gap-1 flex-shrink-0">
                         <Star className="h-3 w-3 lg:h-4 lg:w-4 fill-yellow-400 text-yellow-400" />
                         <span className="text-xs lg:text-sm text-muted-foreground">{offer.rating}</span>
                       </div>
                     </div>
                     <p className="text-xs lg:text-sm text-muted-foreground line-clamp-2 mb-2 lg:mb-3">{offer.description}</p>
                     <div className="flex items-center gap-1 mb-2 lg:mb-3 min-h-[16px] lg:min-h-[20px]">
                       {offer.location && (
                         <>
                           <MapPin className="h-3 w-3 lg:h-4 lg:w-4 text-muted-foreground flex-shrink-0" />
                           <span className="text-xs lg:text-sm text-muted-foreground truncate">{offer.location}</span>
                         </>
                       )}
                     </div>
                     <div className="flex items-center justify-between mb-2 lg:mb-3">
                       <div className="flex items-baseline gap-1">
                         <span className="text-sm lg:text-base font-bold text-foreground">{offer.price}</span>
                         {offer.period && <span className="text-xs lg:text-sm text-muted-foreground">{offer.period}</span>}
                         {offer.originalPrice && (
                           <span className="text-xs lg:text-sm text-muted-foreground line-through">{offer.originalPrice}</span>
                         )}
                       </div>
                     </div>
                     <div className="flex items-center gap-1 mb-4 min-h-[16px] lg:min-h-[20px]">
                       {offer.available && (
                         <>
                           <Clock className="h-3 w-3 lg:h-4 lg:w-4 text-green-500 flex-shrink-0" />
                           <span className="text-xs lg:text-sm text-green-600 truncate">{offer.available}</span>
                         </>
                       )}
                       {offer.shipping && (
                         <>
                           <Clock className="h-3 w-3 lg:h-4 lg:w-4 text-green-500 flex-shrink-0" />
                           <span className="text-xs lg:text-sm text-green-600 truncate">{offer.shipping}</span>
                         </>
                       )}
                     </div>
                     <Button size="sm" className="w-full text-xs lg:text-sm h-7 lg:h-9 mt-auto">Book Now</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Lab Tests */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                <TestTube2 className="h-6 w-6 text-blue-500" />
                Lab Tests & Biomarker Analysis
              </h2>
              <Button variant="outline" size="sm" onClick={() => navigate('/health/biomarker-results')}>
                View Results
              </Button>
            </div>
            
            {/* Lab Test Category Filters */}
            <div className="flex items-center gap-3 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search lab tests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={activeCategory === category.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveCategory(category.id)}
                    className="flex items-center gap-2"
                  >
                    <category.icon className="h-4 w-4" />
                    {category.name}
                  </Button>
                ))}
              </div>
            </div>

            {filteredLabTests.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredLabTests.slice(0, 6).map((labTest) => (
                  <LabTestCard
                    key={labTest.id}
                    labTest={labTest}
                    onOrder={handleOrderLabTest}
                  />
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <TestTube2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Lab Tests Found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || activeCategory !== 'all' 
                    ? "Try adjusting your search or filter criteria."
                    : "Lab tests are being loaded. Please check back soon."
                  }
                </p>
                {(searchQuery || activeCategory !== 'all') && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchQuery('');
                      setActiveCategory('all');
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </Card>
            )}

            {filteredLabTests.length > 6 && (
              <div className="text-center mt-6">
                <Button variant="outline" onClick={() => navigate('/discover/browse')}>
                  View All Lab Tests ({filteredLabTests.length})
                </Button>
              </div>
            )}
          </section>

          {/* AI Recommendations */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-purple-500" />
                AI Recommendations for You
              </h2>
              <Button variant="outline" size="sm" onClick={() => navigate('/discover/recommendations')}>
                View All
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
               {aiRecommendations.map((rec) => (
                 <Card key={rec.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer h-fit border-purple-200">
                   <div className="relative">
                     <img 
                       src={rec.image} 
                       alt={rec.title}
                       className="w-full h-32 sm:h-36 md:h-40 lg:h-44 object-cover rounded-t-lg"
                     />
                    <Badge className="absolute top-2 left-2 bg-purple-500 text-white text-xs px-2 py-1">
                      {rec.badge}
                    </Badge>
                    <div className="absolute top-2 right-2 bg-white/90 rounded-full px-2 py-1">
                      <span className="text-xs font-bold text-purple-600">{rec.match}%</span>
                    </div>
                  </div>
                   <CardContent className="p-3 sm:p-4 lg:p-5 min-h-[200px] md:min-h-[240px] lg:min-h-[260px] flex flex-col justify-between">
                     <div className="space-y-2 lg:space-y-3 flex-1">
                       <h3 className="font-semibold text-sm lg:text-base text-foreground group-hover:text-primary transition-colors line-clamp-2">
                         {rec.title}
                       </h3>
                       <p className="text-xs lg:text-sm text-muted-foreground line-clamp-2">{rec.description}</p>
                       <div className="text-xs lg:text-sm text-muted-foreground">{rec.provider}</div>
                       <div className="flex items-center justify-between">
                         <span className="text-sm lg:text-base font-bold text-foreground">{rec.price}</span>
                         <Button size="sm" className="text-xs lg:text-sm h-7 lg:h-9 mt-auto">Book Now</Button>
                       </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Quick Navigation */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-6">Quick Navigation</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {quickActions.map((action, index) => (
                <Card key={index} className="hover:shadow-md transition-all cursor-pointer" onClick={() => navigate(action.path)}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={`${action.color} p-3 rounded-lg`}>
                        <action.icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{action.title}</h3>
                        <p className="text-sm text-muted-foreground">{action.subtitle}</p>
                      </div>
                      <Button variant="outline" size="sm">{action.action}</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Top Service Providers */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-foreground">Top Service Providers</h2>
              <Button variant="outline" size="sm" onClick={() => navigate('/discover/recommendations')}>
                View All
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {topProviders.map((provider) => (
                <Card key={provider.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer h-fit">
                  <CardContent className="p-3">
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className="relative">
                        <img 
                          src={provider.image} 
                          alt={provider.name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                        <Badge variant="secondary" className="absolute -top-1 -right-1 text-xs px-1 py-0">
                          {provider.badge}
                        </Badge>
                      </div>
                      <div className="space-y-1 w-full">
                        <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {provider.name}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-1">{provider.specialty}</p>
                        <div className="flex items-center justify-center gap-2">
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs font-medium">{provider.rating}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">({provider.reviews})</span>
                        </div>
                        <div className="flex items-center justify-center gap-1">
                          <Clock className="h-3 w-3 text-green-500" />
                          <span className="text-xs text-green-600 line-clamp-1">{provider.nextAvailable}</span>
                        </div>
                        <Button size="sm" className="w-full text-xs h-7 mt-2">Book Session</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Explore Categories */}
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-6">Explore Categories</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { title: "Trending Now", description: "Most popular longevity services this week", icon: TrendingUp, path: "/discover/trending", count: "42 new" },
                { title: "For You", description: "AI-powered longevity recommendations", icon: Star, path: "/discover/recommendations", count: "12 matches" },
                { title: "Saved Items", description: "Your bookmarked favorites", icon: Bookmark, path: "/discover/saved", count: "8 items" }
              ].map((category) => (
                <Card 
                  key={category.title}
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
                    <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">{category.title}</h3>
                    <p className="text-muted-foreground text-sm">{category.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Lab Test Order Popup */}
      <LabTestOrderPopup
        isOpen={isOrderPopupOpen}
        onClose={() => setIsOrderPopupOpen(false)}
        labTest={selectedLabTest}
      />
    </AppLayout>
  );
}, SCREEN_IDS.DISCOVER_OVERVIEW);