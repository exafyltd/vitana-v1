import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { discoverNavigation } from "@/config/navigation";
import { Stethoscope, Dumbbell, Brain, Sparkles, Heart, Leaf, Zap, Coffee, Grid3X3, Plane, Plus, RefreshCw } from "lucide-react";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useState } from "react";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { useNavigate } from "react-router-dom";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { DiscoverBookActionPopup } from "@/components/discover/DiscoverBookActionPopup";
import { SplitBar, SplitBarList, SplitBarTrigger, SplitBarContent } from "@/components/ui/split-bar";
import { BookmarkButton } from "@/components/bookmarks/BookmarkButton";
import { useBookmarks } from "@/hooks/useBookmarks";
import { Bookmark } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Clock, DollarSign, Star, MapPin } from "lucide-react";
import { t } from '@/lib/i18n-toast';

export default function WellnessServices() {
  const navigate = useNavigate();
  const { pendingCount, getLatestActions } = useAutopilot();
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [masterActionOpen, setMasterActionOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("categories");
  const { getBookmarksByType, removeBookmark, isLoading: bookmarksLoading } = useBookmarks();
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);

  const latestActions = getLatestActions(2);

  // Mock services data for each category
  const categoryServicesData: Record<number, any[]> = {
    1: [ // Longevity Medicine
      { id: "WS-101", title: "Advanced Health Assessment", description: "Comprehensive biomarker analysis and health evaluation", duration: "2 hours", price: 399, vitanaImpact: 25, badge: "Popular", icon: Stethoscope, provider: "Dr. Sarah Chen", rating: 4.9 },
      { id: "WS-102", title: "IV Vitamin Therapy", description: "Customized vitamin infusions for optimal wellness", duration: "45 mins", price: 150, vitanaImpact: 15, badge: "Trending", icon: Heart, provider: "Wellness Center", rating: 4.8 },
      { id: "WS-103", title: "Hormone Optimization Consultation", description: "Expert guidance on hormone balance", duration: "60 mins", price: 250, vitanaImpact: 20, badge: "New", icon: Sparkles, provider: "Dr. Michael Ross", rating: 4.9 },
      { id: "WS-104", title: "Biomarker Analysis & Report", description: "In-depth blood work and biomarker tracking", duration: "1 hour", price: 299, vitanaImpact: 22, icon: Stethoscope, provider: "Lab Partners", rating: 4.7 },
      { id: "WS-105", title: "Peptide Therapy Session", description: "Advanced peptide treatments for longevity", duration: "90 mins", price: 450, vitanaImpact: 30, badge: "Premium", icon: Zap, provider: "Longevity Clinic", rating: 5.0 },
      { id: "WS-106", title: "Longevity Clinic Visit", description: "Full consultation with longevity specialist", duration: "2 hours", price: 500, vitanaImpact: 35, icon: Heart, provider: "Dr. James Liu", rating: 4.9 }
    ],
    2: [ // Fitness & Movement
      { id: "WS-201", title: "Functional Fitness Class", description: "Full-body functional training session", duration: "60 mins", price: 45, vitanaImpact: 10, badge: "Popular", icon: Dumbbell, provider: "FitLife Studio", rating: 4.8 },
      { id: "WS-202", title: "Mobility Training Session", description: "Improve flexibility and range of motion", duration: "45 mins", price: 60, vitanaImpact: 8, icon: Sparkles, provider: "Movement Lab", rating: 4.7 },
      { id: "WS-203", title: "Strength Building Program", description: "12-week progressive strength training", duration: "8 weeks", price: 599, vitanaImpact: 50, badge: "Trending", icon: Dumbbell, provider: "PowerHouse Gym", rating: 4.9 },
      { id: "WS-204", title: "Flexibility Workshop", description: "Advanced stretching and flexibility techniques", duration: "90 mins", price: 75, vitanaImpact: 12, icon: Heart, provider: "Yoga Haven", rating: 4.6 },
      { id: "WS-205", title: "Personal Training Package", description: "10 one-on-one training sessions", duration: "10 sessions", price: 850, vitanaImpact: 45, badge: "Premium", icon: Dumbbell, provider: "Elite Trainers", rating: 5.0 },
      { id: "WS-206", title: "Group Fitness Membership", description: "Unlimited group classes monthly", duration: "30 days", price: 199, vitanaImpact: 40, icon: Heart, provider: "Community Fit", rating: 4.8 }
    ],
    3: [ // Mental Wellness
      { id: "WS-301", title: "Guided Meditation Session", description: "Mindfulness and relaxation practice", duration: "30 mins", price: 35, vitanaImpact: 8, badge: "Popular", icon: Brain, provider: "Mindful Path", rating: 4.9 },
      { id: "WS-302", title: "Stress Management Workshop", description: "Learn effective stress reduction techniques", duration: "2 hours", price: 125, vitanaImpact: 15, icon: Sparkles, provider: "Wellness Institute", rating: 4.7 },
      { id: "WS-303", title: "Cognitive Training Program", description: "Brain fitness and memory enhancement", duration: "8 weeks", price: 399, vitanaImpact: 35, badge: "Trending", icon: Brain, provider: "Neuro Wellness", rating: 4.8 },
      { id: "WS-304", title: "Therapy Session (Individual)", description: "One-on-one mental health counseling", duration: "50 mins", price: 150, vitanaImpact: 20, icon: Heart, provider: "Dr. Emily Stone", rating: 5.0 },
      { id: "WS-305", title: "Mindfulness Class Series", description: "6-week mindfulness training program", duration: "6 weeks", price: 299, vitanaImpact: 30, icon: Brain, provider: "Zen Center", rating: 4.8 },
      { id: "WS-306", title: "Mental Health Coaching", description: "Life coaching focused on mental wellness", duration: "60 mins", price: 175, vitanaImpact: 22, badge: "New", icon: Sparkles, provider: "Coach Maria", rating: 4.9 }
    ],
    4: [ // Recovery & Therapy
      { id: "WS-401", title: "Deep Tissue Massage", description: "Therapeutic massage for muscle recovery", duration: "90 mins", price: 140, vitanaImpact: 18, badge: "Popular", icon: Heart, provider: "Healing Hands", rating: 4.9 },
      { id: "WS-402", title: "Cold Plunge Session", description: "Cryotherapy for recovery and vitality", duration: "15 mins", price: 45, vitanaImpact: 10, badge: "Trending", icon: Sparkles, provider: "Recovery Lab", rating: 4.8 },
      { id: "WS-403", title: "Infrared Sauna Session", description: "Detox and relaxation sauna experience", duration: "45 mins", price: 65, vitanaImpact: 12, icon: Heart, provider: "Wellness Spa", rating: 4.7 },
      { id: "WS-404", title: "Red Light Therapy", description: "Cellular recovery and skin health", duration: "30 mins", price: 55, vitanaImpact: 10, icon: Zap, provider: "Biohack Center", rating: 4.8 },
      { id: "WS-405", title: "Cryotherapy Package", description: "10 whole-body cryotherapy sessions", duration: "10 sessions", price: 399, vitanaImpact: 40, badge: "Premium", icon: Sparkles, provider: "Ice House", rating: 4.9 },
      { id: "WS-406", title: "Float Therapy Session", description: "Sensory deprivation tank experience", duration: "60 mins", price: 85, vitanaImpact: 15, icon: Heart, provider: "Float Studio", rating: 4.8 }
    ],
    5: [ // Nutrition & Supplements
      { id: "WS-501", title: "Nutrition Consultation", description: "Personalized meal planning and guidance", duration: "60 mins", price: 120, vitanaImpact: 15, badge: "Popular", icon: Leaf, provider: "Nutritionist Lisa", rating: 4.9 },
      { id: "WS-502", title: "Custom Supplement Plan", description: "Tailored supplement recommendations", duration: "45 mins", price: 95, vitanaImpact: 12, icon: Sparkles, provider: "Supplement Lab", rating: 4.7 },
      { id: "WS-503", title: "Dietary Analysis Package", description: "Comprehensive nutrition assessment", duration: "90 mins", price: 225, vitanaImpact: 20, badge: "Trending", icon: Leaf, provider: "Nutrition Pro", rating: 4.8 },
      { id: "WS-504", title: "Meal Prep Service", description: "Weekly prepared healthy meals", duration: "7 days", price: 299, vitanaImpact: 25, icon: Heart, provider: "Clean Eats", rating: 4.6 },
      { id: "WS-505", title: "Nutrition Workshop", description: "Learn healthy eating principles", duration: "3 hours", price: 85, vitanaImpact: 10, icon: Leaf, provider: "Food Academy", rating: 4.7 },
      { id: "WS-506", title: "Premium Supplement Box", description: "Monthly curated supplement delivery", duration: "30 days", price: 199, vitanaImpact: 20, badge: "Premium", icon: Sparkles, provider: "Vitality Box", rating: 4.9 }
    ],
    6: [ // Sleep Optimization
      { id: "WS-601", title: "Sleep Study & Analysis", description: "Comprehensive sleep assessment", duration: "1 night", price: 499, vitanaImpact: 30, badge: "Popular", icon: Coffee, provider: "Sleep Center", rating: 4.8 },
      { id: "WS-602", title: "Sleep Coaching Session", description: "Expert guidance for better sleep", duration: "60 mins", price: 125, vitanaImpact: 15, icon: Brain, provider: "Sleep Doctor", rating: 4.9 },
      { id: "WS-603", title: "Circadian Rhythm Reset", description: "4-week program to optimize your sleep cycle", duration: "4 weeks", price: 299, vitanaImpact: 25, badge: "Trending", icon: Coffee, provider: "Rhythm Lab", rating: 4.7 },
      { id: "WS-604", title: "Sleep Environment Consultation", description: "Optimize your bedroom for better sleep", duration: "90 mins", price: 175, vitanaImpact: 18, icon: Heart, provider: "Sleep Design", rating: 4.8 },
      { id: "WS-605", title: "Sleep Tracking Setup", description: "Professional wearable setup and analysis", duration: "45 mins", price: 85, vitanaImpact: 10, icon: Zap, provider: "Tech Sleep", rating: 4.6 },
      { id: "WS-606", title: "Insomnia Treatment Program", description: "CBT-I therapy for chronic insomnia", duration: "8 weeks", price: 899, vitanaImpact: 50, badge: "Premium", icon: Brain, provider: "Dr. Sleep", rating: 5.0 }
    ],
    7: [ // Biohacking
      { id: "WS-701", title: "Wearable Tech Consultation", description: "Optimize your health tracking devices", duration: "60 mins", price: 150, vitanaImpact: 15, badge: "Popular", icon: Zap, provider: "Biohack Pro", rating: 4.8 },
      { id: "WS-702", title: "Performance Testing", description: "VO2 max and metabolic analysis", duration: "90 mins", price: 275, vitanaImpact: 22, badge: "Trending", icon: Dumbbell, provider: "Performance Lab", rating: 4.9 },
      { id: "WS-703", title: "Optimization Protocol", description: "Personalized biohacking roadmap", duration: "2 hours", price: 399, vitanaImpact: 30, icon: Sparkles, provider: "Optimize Me", rating: 4.8 },
      { id: "WS-704", title: "Biometric Analysis", description: "Advanced body composition and health metrics", duration: "60 mins", price: 225, vitanaImpact: 20, icon: Stethoscope, provider: "Body Lab", rating: 4.7 },
      { id: "WS-705", title: "Tracking System Setup", description: "Complete health data integration", duration: "90 mins", price: 199, vitanaImpact: 18, icon: Zap, provider: "Data Health", rating: 4.8 },
      { id: "WS-706", title: "Elite Biohacking Package", description: "12-month comprehensive optimization", duration: "12 months", price: 2999, vitanaImpact: 150, badge: "Premium", icon: Star, provider: "Elite Health", rating: 5.0 }
    ],
    8: [ // Wellness Hospitality
      { id: "WS-801", title: "Weekend Wellness Retreat", description: "3-day rejuvenation experience", duration: "3 days", price: 1299, vitanaImpact: 60, badge: "Popular", icon: Heart, provider: "Serenity Resort", rating: 4.9 },
      { id: "WS-802", title: "Luxury Spa Day", description: "Full day of pampering and treatments", duration: "8 hours", price: 499, vitanaImpact: 35, badge: "Trending", icon: Sparkles, provider: "Grand Spa", rating: 4.8 },
      { id: "WS-803", title: "Destination Wellness Trip", description: "7-day immersive wellness vacation", duration: "7 days", price: 3999, vitanaImpact: 100, badge: "Premium", icon: Plane, provider: "Wellness Travel", rating: 5.0 },
      { id: "WS-804", title: "Wellness Immersion Program", description: "14-day transformation experience", duration: "14 days", price: 6999, vitanaImpact: 150, icon: Heart, provider: "Transform Center", rating: 4.9 },
      { id: "WS-805", title: "Recovery Weekend", description: "2-day focused recovery retreat", duration: "2 days", price: 899, vitanaImpact: 45, icon: Sparkles, provider: "Recovery Lodge", rating: 4.8 },
      { id: "WS-806", title: "Couples Wellness Package", description: "Shared wellness experience for two", duration: "2 days", price: 1799, vitanaImpact: 70, icon: Heart, provider: "Couples Retreat", rating: 4.9 }
    ]
  };

  const handleCategoryClick = (category: any) => {
    setSelectedCategory(category);
    setCategoryDrawerOpen(true);
  };

  const categories = [
    {
      id: 1,
      name: t('screens.discover.wsCategory_longevity_name'),
      description: t('screens.discover.wsCategory_longevity_desc'),
      icon: Stethoscope,
      color: "bg-domain-health-accent",
      count: 234,
      featured: [
        t('screens.discover.wsFeatured_healthAssessments'),
        t('screens.discover.wsFeatured_ivTherapy'),
        t('screens.discover.wsFeatured_hormoneOptimization'),
        t('screens.discover.wsFeatured_biomarkerAnalysis')
      ]
    },
    {
      id: 2,
      name: t('screens.discover.wsCategory_fitness_name'),
      description: t('screens.discover.wsCategory_fitness_desc'),
      icon: Dumbbell,
      color: "bg-pill-exercise-accent",
      count: 156,
      featured: [
        t('screens.discover.wsFeatured_functionalFitness'),
        t('screens.discover.wsFeatured_mobilityTraining'),
        t('screens.discover.wsFeatured_strengthBuilding'),
        t('screens.discover.wsFeatured_flexibilityPrograms')
      ]
    },
    {
      id: 3,
      name: t('screens.discover.wsCategory_mental_name'),
      description: t('screens.discover.wsCategory_mental_desc'),
      icon: Brain,
      color: "bg-pill-mental-accent",
      count: 189,
      featured: [
        t('screens.discover.wsFeatured_meditation'),
        t('screens.discover.wsFeatured_stressManagement'),
        t('screens.discover.wsFeatured_cognitiveTraining'),
        t('screens.discover.wsFeatured_therapySessions')
      ]
    },
    {
      id: 4,
      name: t('screens.discover.wsCategory_recovery_name'),
      description: t('screens.discover.wsCategory_recovery_desc'),
      icon: Sparkles,
      color: "bg-sys-vitana-accent",
      count: 123,
      featured: [
        t('screens.discover.wsFeatured_massageTherapy'),
        t('screens.discover.wsFeatured_coldPlunge'),
        t('screens.discover.wsFeatured_infraredSauna'),
        t('screens.discover.wsFeatured_redLightTherapy')
      ]
    },
    {
      id: 5,
      name: t('screens.discover.wsCategory_nutrition_name'),
      description: t('screens.discover.wsCategory_nutrition_desc'),
      icon: Leaf,
      color: "bg-pill-nutrition-accent",
      count: 267,
      featured: [
        t('screens.discover.wsFeatured_mealPlanning'),
        t('screens.discover.wsFeatured_nutritionalCounseling'),
        t('screens.discover.wsFeatured_supplementPlans'),
        t('screens.discover.wsFeatured_dietaryAnalysis')
      ]
    },
    {
      id: 6,
      name: t('screens.discover.wsCategory_sleep_name'),
      description: t('screens.discover.wsCategory_sleep_desc'),
      icon: Coffee,
      color: "bg-pill-sleep-accent",
      count: 89,
      featured: [
        t('screens.discover.wsFeatured_sleepStudies'),
        t('screens.discover.wsFeatured_sleepCoaching'),
        t('screens.discover.wsFeatured_circadianRhythm'),
        t('screens.discover.wsFeatured_sleepEnvironment')
      ]
    },
    {
      id: 7,
      name: t('screens.discover.wsCategory_biohacking_name'),
      description: t('screens.discover.wsCategory_biohacking_desc'),
      icon: Zap,
      color: "bg-sys-ai-accent",
      count: 145,
      featured: [
        t('screens.discover.wsFeatured_wearableTech'),
        t('screens.discover.wsFeatured_performanceTesting'),
        t('screens.discover.wsFeatured_optimizationPlans'),
        t('screens.discover.wsFeatured_trackingSystems')
      ]
    },
    {
      id: 8,
      name: t('screens.discover.wsCategory_hospitality_name'),
      description: t('screens.discover.wsCategory_hospitality_desc'),
      icon: Heart,
      color: "bg-domain-community-accent",
      count: 67,
      featured: [
        t('screens.discover.wsFeatured_wellnessRetreats'),
        t('screens.discover.wsFeatured_spaExperiences'),
        t('screens.discover.wsFeatured_destinationWellness'),
        t('screens.discover.wsFeatured_immersivePrograms')
      ]
    }
  ];

  return (
    <AppLayout>
      <SEO title={t('screens.discover.wellnessServicesDiscover')} description="Browse wellness categories organized by health verticals" canonical={window.location.href} />
      <SubNavigation items={discoverNavigation} />
      <div className="p-6 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <StandardHeader
            title={t('screens.discover.wellnessServices')}
            description="Explore wellness solutions organized by health verticals and longevity pillars"
            emoji="🧘"
          />

          <UtilityActionButton
            trailingElement={
              <Button 
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => window.location.reload()}
                title={t('screens.discover.refreshPage')}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            }
          >
            <ExpandableSearchButton 
              placeholder={t('screens.discover.searchWellnessServices')}
            />
            <UniversalCalendarButton />
            <Button 
              size="sm"
              onClick={() => setMasterActionOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('screens.discover.action')}
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList>
              <SplitBarTrigger value="categories">{t('screens.discover.allCategories')}</SplitBarTrigger>
              <SplitBarTrigger value="recommended">{t('screens.discover.recommended')}</SplitBarTrigger>
              <SplitBarTrigger value="bookmarked">{t('screens.discover.bookmarkedValue0', { value0: getBookmarksByType('wellness_service').length > 0 && `(${getBookmarksByType('wellness_service').length})` })}</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="categories" className="space-y-6">
              {/* Categories Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {categories.map((category) => (
              <Card key={category.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col h-full bg-white/80 backdrop-blur-sm border-white/20 relative">
                <BookmarkButton
                  item={{
                    item_type: 'wellness_service',
                    item_id: category.id.toString(),
                    item_name: category.name,
                    item_metadata: {
                      description: category.description,
                      featured: category.featured,
                    },
                  }}
                />
                <CardContent className="p-4 md:p-5 lg:p-6 flex-1 flex flex-col">
                  <div className="flex items-start gap-3 md:gap-4 mb-3 md:mb-4">
                    <div className={`${category.color} p-2 md:p-3 rounded-lg`}>
                      <category.icon className="h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-sm md:text-base lg:text-lg text-foreground group-hover:text-primary transition-colors">
                          {category.name}
                        </h3>
                        <Badge variant="secondary" className="text-xs md:text-sm">
                          {category.count}
                        </Badge>
                      </div>
                      <p className="text-xs md:text-sm text-muted-foreground mb-2 md:mb-3">
                        {category.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-1 md:space-y-2 mb-4 flex-1">
                    <div className="text-xs md:text-sm font-medium text-muted-foreground mb-1 md:mb-2">{t('screens.discover.featuredServices')}</div>
                    {category.featured.map((service, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-primary rounded-full"></div>
                        <span className="text-xs md:text-sm text-muted-foreground">{service}</span>
                      </div>
                    ))}
                  </div>
                  
                  <Button 
                    size="sm" 
                    className="w-full text-xs md:text-sm h-7 md:h-8 lg:h-9 mt-auto"
                    onClick={() => handleCategoryClick(category)}
                  >{t('screens.discover.exploreName', { name: category.name })}</Button>
                </CardContent>
              </Card>
            ))}
          </div>
            </SplitBarContent>

            <SplitBarContent value="recommended" className="space-y-6">
              <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Brain className="h-6 w-6 text-purple-500" />
                    <h2 className="text-2xl font-semibold">{t('screens.discover.airecommendedServices')}</h2>
                  </div>
                  <p className="text-muted-foreground mb-6">{t('screens.discover.personalizedWellnessServiceRecommendationsBasedYou')}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories.slice(0, 6).map((category, index) => (
                      <Card key={category.id} className="group hover:shadow-lg transition-all duration-300 border-purple-200">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3 mb-3">
                            <div className={`${category.color} p-2 rounded-lg`}>
                              <category.icon className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <h3 className="font-semibold text-sm">{category.name}</h3>
                                <div className="bg-white rounded-full px-2 py-1">
                                  <span className="text-xs font-bold text-purple-600">{92 - index * 2}%</span>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground">{category.description}</p>
                            </div>
                          </div>
                          <div className="bg-purple-50 p-2 rounded-lg mb-3">
                            <div className="flex items-center gap-1">
                              <Sparkles className="h-3 w-3 text-purple-500" />
                              <span className="text-xs text-purple-700">{t('screens.discover.basedYourHealthGoals')}</span>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            className="w-full text-xs"
                            onClick={() => handleCategoryClick(category)}
                          >{t('screens.discover.exploreServices')}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </SplitBarContent>

            <SplitBarContent value="bookmarked" className="space-y-6">
              {bookmarksLoading ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">{t('screens.discover.loadingBookmarks')}</p>
                </div>
              ) : getBookmarksByType('wellness_service').length === 0 ? (
                <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                  <CardContent className="p-12 text-center">
                    <Bookmark className="h-16 w-16 mx-auto mb-4 text-yellow-400" />
                    <h3 className="text-xl font-semibold mb-2">{t('screens.discover.noBookmarkedServicesYet')}</h3>
                    <p className="text-muted-foreground mb-4">
                      {t('screens.discover.browseWellnessServicesBookmarkYourFavorites')}
                    </p>
                    <Button onClick={() => setActiveTab('categories')}>
                      {t('screens.discover.exploreServices')}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {getBookmarksByType('wellness_service').map((bookmark) => (
                    <Card key={bookmark.id} className="group hover:shadow-lg transition-all bg-white/90 relative">
                      <button
                        onClick={() => removeBookmark('wellness_service', bookmark.item_id)}
                        className="absolute top-2 right-2 bg-yellow-400 p-2 rounded-full hover:bg-yellow-500 transition-colors z-10"
                      >
                        <Bookmark className="h-4 w-4 fill-white text-white" />
                      </button>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-lg mb-2">{bookmark.item_name}</h3>
                        {bookmark.item_metadata?.description && (
                          <p className="text-sm text-muted-foreground mb-4">{bookmark.item_metadata.description}</p>
                        )}
                        <Button 
                          size="sm" 
                          className="w-full"
                          onClick={() => {
                            const matchedCategory = categories.find(
                              c => c.name === bookmark.item_name
                            );
                            if (matchedCategory) {
                              handleCategoryClick(matchedCategory);
                            }
                          }}
                        >{t('screens.discover.exploreItem_name', { item_name: bookmark.item_name })}</Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>

      <AutopilotPopup 
        open={autopilotOpen}
        onOpenChange={setAutopilotOpen}
      />
      <DiscoverBookActionPopup 
        open={masterActionOpen}
        onOpenChange={setMasterActionOpen}
      />

      {/* Category Services Drawer */}
      <Sheet open={categoryDrawerOpen} onOpenChange={setCategoryDrawerOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedCategory && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`${selectedCategory.color} p-3 rounded-lg`}>
                    <selectedCategory.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <SheetTitle className="text-2xl">{selectedCategory.name}</SheetTitle>
                    <SheetDescription>{selectedCategory.description}</SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">{t('screens.discover.availableServices')}</h3>
                  <Badge variant="secondary">{t('screens.discover.value0Services', { value0: categoryServicesData[selectedCategory.id]?.length || 0 })}</Badge>
                </div>

                {categoryServicesData[selectedCategory.id]?.map((service) => (
                  <Card key={service.id} className="group hover:shadow-lg transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="bg-primary/10 p-2 rounded-lg">
                          <service.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-1">
                            <h4 className="font-semibold text-base">{service.title}</h4>
                            {service.badge && (
                              <Badge variant="secondary" className="text-xs">{service.badge}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{service.description}</p>

                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              <span>{service.duration}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <DollarSign className="h-3.5 w-3.5" />
                              <span>${service.price}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Star className="h-3.5 w-3.5" />
                              <span>{t('screens.discover.ratingRating', { rating: service.rating })}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                              <Sparkles className="h-3.5 w-3.5" />
                              <span>{t('screens.discover.vitanaimpactVitana', { vitanaImpact: service.vitanaImpact })}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                            <MapPin className="h-3.5 w-3.5" />
                            <span>{t('screens.discover.providerProvider', { provider: service.provider })}</span>
                          </div>

                          <div className="flex gap-2">
                            <Button size="sm" className="flex-1">
                              {t('screens.discover.bookNow')}
                            </Button>
                            <AddToCartButton
                              item={{
                                item_type: 'wellness_service',
                                item_id: service.id,
                                item_name: service.title,
                                item_price: service.price,
                                item_metadata: {
                                  duration: service.duration,
                                  provider: service.provider,
                                  vitanaImpact: service.vitanaImpact
                                }
                              }}
                              size="sm"
                              className="flex-1"
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}