import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { discoverNavigation } from "@/config/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookmarkButton } from "@/components/bookmarks/BookmarkButton";
import { useBookmarks } from "@/hooks/useBookmarks";
import { Timer, Flame, Percent, Package, Star, MapPin, Clock, TrendingDown, TrendingUp, Heart, Brain, Target, Activity, Sparkles, Users, Plane, Plus, RefreshCw } from "lucide-react";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useState, useMemo } from "react";
import { useMarketplaceSearch, type MarketplaceProduct } from "@/hooks/useMarketplace";
import { ProductImage } from "@/components/discover/ProductImage";
import { ProductDetailsDrawer } from "@/components/discover/ProductDetailsDrawer";
import { ProductSelectionProvider, useProductSelection } from "@/context/ProductSelectionContext";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { useNavigate } from "react-router-dom";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { DiscoverShopActionPopup } from "@/components/discover/DiscoverShopActionPopup";
import { SplitBar, SplitBarList, SplitBarTrigger, SplitBarContent } from "@/components/ui/split-bar";
import { t } from '@/lib/i18n-toast';

import { fmtDateTime } from '@/lib/locale-format';
export default function DealsOffers() {
  return (
    <ProductSelectionProvider>
      <DealsOffersInner />
    </ProductSelectionProvider>
  );
}

interface DealCard {
  id: string;
  title: string;
  provider: string;
  originalPrice: number;
  price: number;
  discount: number;
  image: string | null;
  timeLeft: string | null;
  claimed: number | null;
  total: number | null;
  rating: number;
  reviews: number;
  category: string;
  _product?: MarketplaceProduct;
}

function DealsOffersInner() {
  const navigate = useNavigate();
  const { pendingCount, getLatestActions } = useAutopilot();
  const { getBookmarksByType } = useBookmarks();
  const { selectProduct } = useProductSelection();
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [masterActionOpen, setMasterActionOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("flash");

  const latestActions = getLatestActions(2);

  // Flash Deals — real discounted products from the marketplace.
  // Client-side filter for compare_at_price_cents > price_cents; the backend
  // doesn't yet expose a has_discount param so we over-fetch and filter.
  const { data: dealsSearch } = useMarketplaceSearch({ limit: 48, sort: 'relevance' });
  const flashDeals: DealCard[] = useMemo(() => {
    const items = dealsSearch?.items ?? [];
    return items
      .filter(
        (p) =>
          p.compare_at_price_cents != null &&
          p.price_cents != null &&
          p.compare_at_price_cents > p.price_cents,
      )
      .map((p) => {
        const price = (p.price_cents ?? 0) / 100;
        const originalPrice = (p.compare_at_price_cents ?? 0) / 100;
        const discount = Math.round((1 - price / originalPrice) * 100);
        return {
          id: p.id,
          title: p.title,
          provider: p.brand ?? 'Vitana Shop',
          originalPrice,
          price,
          discount,
          image: p.images?.[0] ?? null,
          timeLeft: null, // backend has no timer; UI hides the badge when null
          claimed: null,
          total: null,
          rating: p.rating ?? 0,
          reviews: p.review_count ?? 0,
          category: p.subcategory ?? p.category ?? 'supplements',
          _product: p,
        };
      });
  }, [dealsSearch]);


  // Trending Services Data  
  const trendingServices = [
    {
      id: 1,
      title: "Personal Training Sessions",
      description: "One-on-one fitness coaching",
      provider: "Elite Fitness Center",
      price: 79,
      trend: "+45%",
      image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400",
      bookings: 234,
      rating: 4.9,
      reviews: 567,
      location: "Downtown",
      availableSlots: ["2PM", "4PM", "6PM"],
    },
    {
      id: 2,
      title: "Massage Therapy",
      description: "Relaxation and muscle recovery",
      provider: "Healing Hands Spa",
      price: 120,
      trend: "+38%",
      image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400",
      bookings: 189,
      rating: 4.8,
      reviews: 423,
      location: "Midtown",
      availableSlots: ["10AM", "2PM", "5PM"],
    },
    {
      id: 3,
      title: "Acupuncture Treatment",
      description: "Traditional healing therapy",
      provider: "Wellness Acupuncture",
      price: 95,
      trend: "+52%",
      image: "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=400",
      bookings: 312,
      rating: 4.9,
      reviews: 689,
      location: "Eastside",
      availableSlots: ["11AM", "3PM", "7PM"],
    },
    {
      id: 4,
      title: "Nutritional Counseling",
      description: "Personalized diet planning",
      provider: "NutriBalance",
      price: 89,
      trend: "+41%",
      image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400",
      bookings: 198,
      rating: 4.7,
      reviews: 345,
      location: "Westside",
      availableSlots: ["9AM", "1PM", "4PM"],
    },
    {
      id: 5,
      title: "Pilates Classes",
      description: "Core strengthening sessions",
      provider: "CoreFlow Studio",
      price: 65,
      trend: "+36%",
      image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400",
      bookings: 276,
      rating: 4.8,
      reviews: 512,
      location: "Uptown",
      availableSlots: ["8AM", "12PM", "6PM"],
    },
    {
      id: 6,
      title: "Meditation Workshops",
      description: "Mindfulness and stress relief",
      provider: "Inner Peace Center",
      price: 55,
      trend: "+48%",
      image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400",
      bookings: 401,
      rating: 5.0,
      reviews: 734,
      location: "Suburbs",
      availableSlots: ["7AM", "5PM", "8PM"],
    },
  ];

  // AI Recommendations Data
  const personalizedMatches = [
    {
      id: 1,
      title: "Health Consultation",
      provider: "Dr. Sarah Mitchell, MD",
      credentials: "Board Certified Internal Medicine",
      price: 150,
      period: "per session",
      match: 95,
      image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400",
      reason: "Based on your health goals and preferences",
      availableTime: "Next available: Tomorrow 2PM",
      duration: "60 min",
      format: "Video or In-person",
      benefits: ["Personalized health plan", "Follow-up support", "Lab review included"],
    },
    {
      id: 2,
      title: "Customized Meal Plan",
      provider: "NutriPro Dietitians",
      credentials: "Registered Dietitian Nutritionist",
      price: 99,
      period: "per month",
      match: 88,
      image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400",
      reason: "Matches your dietary requirements and fitness goals",
      availableTime: "Starts immediately",
      duration: "30-day plan",
      format: "Digital delivery",
      benefits: ["Weekly meal prep guides", "Shopping lists", "Recipe database access"],
    },
    {
      id: 3,
      title: "Cognitive Behavioral Therapy",
      provider: "Dr. James Chen, PhD",
      credentials: "Licensed Clinical Psychologist",
      price: 180,
      period: "per session",
      match: 92,
      image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400",
      reason: "Specialized in stress management and anxiety, matching your needs",
      availableTime: "Next available: Friday 4PM",
      duration: "50 min",
      format: "Teletherapy",
      benefits: ["Evidence-based techniques", "Homework assignments", "Progress tracking"],
    },
    {
      id: 4,
      title: "Personal Fitness Assessment",
      provider: "FitMetrics Lab",
      credentials: "ACSM Certified Exercise Physiologist",
      price: 129,
      period: "one-time",
      match: 90,
      image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400",
      reason: "Comprehensive evaluation aligned with your fitness objectives",
      availableTime: "Next available: This week",
      duration: "90 min",
      format: "In-person required",
      benefits: ["Body composition analysis", "Metabolic rate test", "Custom workout plan"],
    },
  ];

  // Saved Items Data
  const savedProducts = [
    {
      id: 1,
      title: "Omega-3 Fish Oil",
      brand: "Nordic Naturals",
      price: 29.99,
      originalPrice: 34.99,
      priceChange: -5.00,
      image: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=400",
      stock: "In Stock",
      savedDate: "3 days ago",
      rating: 4.8,
      reviews: 2341,
    },
    {
      id: 2,
      title: "Yoga Mat Premium",
      brand: "Manduka PRO",
      price: 49.99,
      originalPrice: 49.99,
      priceChange: 0,
      image: "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400",
      stock: "Low Stock",
      savedDate: "1 week ago",
      rating: 4.9,
      reviews: 1823,
    },
    {
      id: 3,
      title: "Resistance Bands Set",
      brand: "TheraBand",
      price: 24.99,
      originalPrice: 39.99,
      priceChange: -15.00,
      image: "https://images.unsplash.com/photo-1598632640487-6ea4a4e8b963?w=400",
      stock: "In Stock",
      savedDate: "2 days ago",
      rating: 4.7,
      reviews: 945,
    },
    {
      id: 4,
      title: "Protein Powder Chocolate",
      brand: "Optimum Nutrition",
      price: 54.99,
      originalPrice: 54.99,
      priceChange: 0,
      image: "https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=400",
      stock: "In Stock",
      savedDate: "5 days ago",
      rating: 4.6,
      reviews: 3421,
    },
    {
      id: 5,
      title: "Foam Roller",
      brand: "TriggerPoint",
      price: 29.99,
      originalPrice: 44.99,
      priceChange: -15.00,
      image: "https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=400",
      stock: "In Stock",
      savedDate: "1 day ago",
      rating: 4.8,
      reviews: 1567,
    },
    {
      id: 6,
      title: "Multivitamin Complex",
      brand: "Garden of Life",
      price: 39.99,
      originalPrice: 39.99,
      priceChange: 0,
      image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400",
      stock: "In Stock",
      savedDate: "2 weeks ago",
      rating: 4.7,
      reviews: 2134,
    },
    {
      id: 7,
      title: "Water Bottle Insulated",
      brand: "Hydro Flask",
      price: 34.99,
      originalPrice: 44.99,
      priceChange: -10.00,
      image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400",
      stock: "In Stock",
      savedDate: "4 days ago",
      rating: 4.9,
      reviews: 4567,
    },
    {
      id: 8,
      title: "Fitness Tracker Watch",
      brand: "Fitbit Charge",
      price: 129.99,
      originalPrice: 149.99,
      priceChange: -20.00,
      image: "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=400",
      stock: "Low Stock",
      savedDate: "1 week ago",
      rating: 4.5,
      reviews: 8234,
    },
  ];

  return (
    <AppLayout>
      <SEO title={t('screens.discover.dealsOffersDiscover')} description="Limited-time deals, trending services, AI recommendations, and saved items" canonical={window.location.href} />
      <SubNavigation items={discoverNavigation} />
      <div className="p-6 bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <StandardHeader
            title={t('screens.discover.dealsOffers')}
            description="Limited-time deals, trending services, AI recommendations, and saved items"
            emoji="🔥"
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
              placeholder={t('screens.discover.searchDealsOffers')}
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
              <SplitBarTrigger value="flash">{t('screens.discover.flashDeals')}</SplitBarTrigger>
              <SplitBarTrigger value="trending">{t('screens.discover.trending')}</SplitBarTrigger>
              <SplitBarTrigger value="ai">{t('screens.discover.aiPicks')}</SplitBarTrigger>
              <SplitBarTrigger value="saved">{t('screens.discover.saved')}</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="flash" className="space-y-6">
              {flashDeals.length === 0 && (
                <Card className="p-8 text-center bg-white/70 backdrop-blur-sm">
                  <Flame className="h-10 w-10 text-red-500 mx-auto mb-3" />
                  <h3 className="font-semibold mb-1">{t('screens.discover.noFlashDealsRightNow')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('screens.discover.whenMerchantsRunPromotionsTheyRsquo')}
                  </p>
                </Card>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {flashDeals.map((deal) => (
                  <Card
                    key={deal.id}
                    onClick={() => deal._product && selectProduct(deal._product)}
                    className="relative group hover:shadow-xl transition-all duration-300 bg-white/90 backdrop-blur-sm flex flex-col cursor-pointer">
                    <BookmarkButton
                      item={{
                        item_type: 'product',
                        item_id: deal.id,
                        item_name: deal.title,
                        item_image_url: deal.image ?? undefined,
                        item_metadata: {
                          provider: deal.provider,
                          price: deal.price,
                          originalPrice: deal.originalPrice,
                          discount: deal.discount,
                          category: deal.category,
                        },
                      }}
                    />
                    <div className="relative">
                      <ProductImage
                        src={deal.image}
                        alt={deal.title}
                        category={deal.category}
                        sizeClass="w-full h-48"
                        className="rounded-t-lg"
                      />
                      <div className="absolute top-2 right-12 bg-red-600 text-white px-3 py-1 rounded-full font-bold text-sm">{t('screens.discover.discountOff', { discount: deal.discount })}
                      </div>
                      {deal.timeLeft && (
                        <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {deal.timeLeft}
                        </div>
                      )}
                    </div>
                    
                    <CardContent className="flex-1 flex flex-col p-4 space-y-3">
                      <div>
                        <h3 className="font-semibold text-base line-clamp-2 group-hover:text-primary transition-colors">
                          {deal.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">{deal.provider}</p>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm">
                        <div className="flex items-center">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < Math.floor(deal.rating)
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "fill-gray-200 text-gray-200"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-muted-foreground">
                          {deal.rating} ({fmtDateTime(deal.reviews)})
                        </span>
                      </div>

                      {deal.claimed != null && deal.total != null && deal.total > 0 && (
                        <div className="bg-gray-100 rounded-lg p-2">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>{t('screens.discover.claimedTotalClaimed', { claimed: deal.claimed, total: deal.total })}</span>
                            <span>{Math.round((deal.claimed / deal.total) * 100)}%</span>
                          </div>
                          <div className="w-full bg-gray-300 rounded-full h-2">
                            <div
                              className="bg-red-600 h-2 rounded-full transition-all"
                              style={{ width: `${(deal.claimed / deal.total) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-red-600">${deal.price}</span>
                        <span className="text-muted-foreground line-through text-sm">
                          ${deal.originalPrice}
                        </span>
                        <span className="text-green-600 font-semibold text-sm ml-auto">{t('screens.discover.saveValue0', { value0: deal.originalPrice - deal.price })}</span>
                      </div>
                      
                      <div className="flex gap-2 mt-auto pt-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          className="flex-1"
                          onClick={() => deal._product && selectProduct(deal._product)}
                        >
                          {t('screens.discover.viewDeal')}
                        </Button>
                        <AddToCartButton
                          item={{
                            item_type: 'product',
                            item_id: deal.id,
                            item_name: deal.title,
                            item_price: deal.price,
                            item_image_url: deal.image ?? undefined,
                            item_metadata: {
                              originalPrice: deal.originalPrice,
                              discount: deal.discount,
                              provider: deal.provider,
                            },
                          }}
                          variant="outline"
                          size="icon"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </SplitBarContent>

            <SplitBarContent value="trending" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trendingServices.map((service) => (
                  <Card key={service.id} className="relative group hover:shadow-xl transition-all duration-300 bg-white/90 backdrop-blur-sm flex flex-col">
                    <BookmarkButton
                      item={{
                        item_type: 'wellness_service',
                        item_id: service.id.toString(),
                        item_name: service.title,
                        item_image_url: service.image,
                        item_metadata: {
                          provider: service.provider,
                          price: service.price,
                          location: service.location,
                          description: service.description,
                        },
                      }}
                    />
                    <div className="relative">
                      <img
                        src={service.image}
                        alt={service.title}
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
                      <div className="absolute top-2 right-12 bg-orange-600 text-white px-3 py-1 rounded-full font-bold text-sm flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {service.trend}
                      </div>
                    </div>
                    
                    <CardContent className="flex-1 flex flex-col p-4 space-y-3">
                      <div>
                        <h3 className="font-semibold text-base line-clamp-2 group-hover:text-primary transition-colors">
                          {service.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-1">{service.description}</p>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm">
                        <div className="flex items-center">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < Math.floor(service.rating)
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "fill-gray-200 text-gray-200"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-muted-foreground">
                          {service.rating} ({fmtDateTime(service.reviews)})
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{service.location}</span>
                        <span className="ml-auto">{t('screens.discover.bookingsBookings', { bookings: service.bookings })}</span>
                      </div>

                      <div className="flex gap-1 flex-wrap">
                        {service.availableSlots.map((slot) => (
                          <Badge key={slot} variant="outline" className="text-xs">
                            {slot}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold">${service.price}</span>
                        <span className="text-sm text-muted-foreground">{t('screens.discover.perSession')}</span>
                      </div>
                      
                      <div className="flex gap-2 mt-auto pt-2">
                        <Button className="flex-1">
                          {t('screens.discover.bookNow')}
                        </Button>
                        <AddToCartButton
                          item={{
                            item_type: 'wellness_service',
                            item_id: service.id.toString(),
                            item_name: service.title,
                            item_price: service.price,
                            item_image_url: service.image,
                            item_metadata: {
                              location: service.location,
                              bookings: service.bookings,
                              trend: service.trend,
                            },
                          }}
                          variant="outline"
                          size="icon"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </SplitBarContent>

            <SplitBarContent value="ai" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {personalizedMatches.map((match) => (
                  <Card key={match.id} className="relative group hover:shadow-xl transition-all duration-300 bg-white/90 backdrop-blur-sm flex flex-col border-purple-200">
                    <BookmarkButton
                      item={{
                        item_type: 'wellness_service',
                        item_id: match.id.toString(),
                        item_name: match.title,
                        item_image_url: match.image,
                        item_metadata: {
                          provider: match.provider,
                          price: match.price,
                          match: match.match,
                          reason: match.reason,
                        },
                      }}
                    />
                    <div className="relative">
                      <img
                        src={match.image}
                        alt={match.title}
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
                      <div className="absolute top-2 right-12 bg-purple-600 text-white px-3 py-1 rounded-full font-bold text-sm">{t('screens.discover.matchMatch', { match: match.match })}
                      </div>
                    </div>
                    
                    <CardContent className="flex-1 flex flex-col p-4 space-y-3">
                      <div>
                        <h3 className="font-semibold text-base line-clamp-2 group-hover:text-primary transition-colors">
                          {match.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">{match.provider}</p>
                        <p className="text-xs text-muted-foreground">{match.credentials}</p>
                      </div>
                      
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Brain className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-purple-700 font-medium">{match.reason}</span>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{match.availableTime}</span>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline">{match.duration}</Badge>
                          <Badge variant="outline">{match.format}</Badge>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {match.benefits.map((benefit, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                            <span>{benefit}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-baseline gap-2 pt-2">
                        <span className="text-2xl font-bold">${match.price}</span>
                        <span className="text-sm text-muted-foreground">{match.period}</span>
                      </div>
                      
                      <div className="flex gap-2 mt-auto pt-2">
                        <Button className="flex-1">
                          {t('screens.discover.bookConsultation')}
                        </Button>
                        <AddToCartButton
                          item={{
                            item_type: 'wellness_service',
                            item_id: match.id.toString(),
                            item_name: match.title,
                            item_price: match.price,
                            item_image_url: match.image,
                            item_metadata: {
                              match: match.match,
                              reason: match.reason,
                              provider: match.provider,
                            },
                          }}
                          variant="outline"
                          size="icon"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </SplitBarContent>

            <SplitBarContent value="saved" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {savedProducts.map((product) => (
                  <Card key={product.id} className="relative group hover:shadow-xl transition-all duration-300 bg-white/90 backdrop-blur-sm flex flex-col">
                    <BookmarkButton
                      item={{
                        item_type: 'deal',
                        item_id: product.id.toString(),
                        item_name: product.title,
                        item_image_url: product.image,
                        item_metadata: {
                          brand: product.brand,
                          price: product.price,
                          priceChange: product.priceChange,
                        },
                      }}
                    />
                    <div className="relative">
                      <img
                        src={product.image}
                        alt={product.title}
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
                      {product.priceChange < 0 && (
                        <div className="absolute top-2 left-2 bg-green-600 text-white px-3 py-1 rounded-full font-bold text-sm flex items-center gap-1">
                          <TrendingDown className="h-3 w-3" />
                          {t('screens.discover.priceDrop')}
                        </div>
                      )}
                    </div>
                    
                    <CardContent className="flex-1 flex flex-col p-4 space-y-3">
                      <div>
                        <h3 className="font-semibold text-base line-clamp-2 group-hover:text-primary transition-colors">
                          {product.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">{product.brand}</p>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm">
                        <div className="flex items-center">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < Math.floor(product.rating)
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "fill-gray-200 text-gray-200"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-muted-foreground">
                          {product.rating} ({fmtDateTime(product.reviews)})
                        </span>
                      </div>

                      <div className="text-xs text-muted-foreground space-y-1">
                        <div className="flex justify-between">
                          <span>{t('screens.discover.savedSaveddate', { savedDate: product.savedDate })}</span>
                          <span className={product.stock === "In Stock" ? "text-green-600" : "text-orange-600"}>
                            {product.stock}
                          </span>
                        </div>
                        {product.priceChange < 0 && (
                          <div className="text-green-600 font-semibold">{t('screens.discover.priceDroppedValue0', { value0: Math.abs(product.priceChange).toFixed(2) })}
                          </div>
                        )}
                        {product.priceChange === 0 && (
                          <div className="text-muted-foreground">{t('screens.discover.samePrice')}
                          </div>
                        )}
                      </div>

                      <div className="flex items-baseline gap-2">
                        <span className={`text-2xl font-bold ${product.priceChange < 0 ? 'text-green-600' : ''}`}>
                          ${product.price}
                        </span>
                        {product.priceChange < 0 && (
                          <span className="text-muted-foreground line-through text-sm">
                            ${product.originalPrice}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex gap-2 mt-auto pt-2">
                        <Button className="flex-1">
                          {t('screens.discover.addCart')}
                        </Button>
                        <Button variant="outline" size="icon">
                          <Package className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>

      <AutopilotPopup 
        open={autopilotOpen}
        onOpenChange={setAutopilotOpen}
      />
      <DiscoverShopActionPopup
        open={masterActionOpen}
        onOpenChange={setMasterActionOpen}
      />
      <ProductDetailsDrawer />
    </AppLayout>
  );
}
