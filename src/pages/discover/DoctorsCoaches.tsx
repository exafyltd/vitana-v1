import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { discoverNavigation } from "@/config/navigation";
import { Star, MapPin, Clock, Users, Verified, Award, TrendingUp, Plane, Plus, RefreshCw, Brain, Sparkles } from "lucide-react";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useState } from "react";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { useNavigate } from "react-router-dom";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { DiscoverBookActionPopup } from "@/components/discover/DiscoverBookActionPopup";
import { VisitHistoryCard } from "@/components/discover/VisitHistoryCard";
import { SplitBar, SplitBarList, SplitBarTrigger, SplitBarContent } from "@/components/ui/split-bar";
import { BookmarkButton } from "@/components/bookmarks/BookmarkButton";
import { useBookmarks } from "@/hooks/useBookmarks";
import { Bookmark, Calendar } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { differenceInDays, differenceInHours, addDays, subDays } from 'date-fns';
import BookingPaymentFlow from "@/components/payment/BookingPaymentFlow";
import { useToast } from '@/hooks/use-toast';
import { useWallet } from "@/hooks/useWallet";
import { notify, notifyError, t } from '@/lib/i18n-toast';

import { formatDate } from '@/lib/locale-format';
export default function DoctorsCoaches() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { pendingCount, getLatestActions } = useAutopilot();
  const { getBalance } = useWallet();
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [masterActionOpen, setMasterActionOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("find");
  const { getBookmarksByType, removeBookmark, isLoading: bookmarksLoading } = useBookmarks();
  const queryClient = useQueryClient();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<typeof providers[0] | null>(null);

  const latestActions = getLatestActions(2);

  // Fetch upcoming appointments
  const { data: upcomingAppointments = [] } = useQuery({
    queryKey: ['provider-appointments', 'upcoming'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_appointments')
        .select('*')
        .eq('status', 'scheduled')
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;
      return data || [];
    }
  });

  // Fetch visit history
  const { data: visitHistory = [] } = useQuery({
    queryKey: ['provider-appointments', 'history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_appointments')
        .select('*')
        .eq('status', 'completed')
        .lt('start_time', new Date().toISOString())
        .order('start_time', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    }
  });

  // Mutation for saving appointments
  const saveAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: any) => {
      const { data, error } = await supabase
        .from('provider_appointments')
        .insert([appointmentData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-appointments', 'upcoming'] });
      notify('toasts.discover.appointmentBooked', 'toasts.discover.yourAppointmentHasConfirmed');
    },
    onError: (error) => {
      console.error('Error saving appointment:', error);
      notifyError('toasts.discover.bookingFailed', 'toasts.discover.pleaseTryAgain');
    }
  });

  // Booking handlers
  const handleBookNow = (provider: typeof providers[0]) => {
    setSelectedProvider(provider);
    setBookingOpen(true);
  };

  const handleBookingComplete = async (bookingDetails: any) => {
    if (!selectedProvider) return;
    
    const appointmentData = {
      provider_id: selectedProvider.id.toString(),
      provider_name: selectedProvider.name,
      provider_specialty: selectedProvider.specialty,
      provider_image_url: selectedProvider.image,
      appointment_type: 'consultation',
      status: 'scheduled',
      start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      duration_minutes: 30,
      location: selectedProvider.location,
    };
    
    await saveAppointmentMutation.mutateAsync(appointmentData);
    setBookingOpen(false);
    setSelectedProvider(null);
  };

  const providers = [
    {
      id: 1,
      name: "Dr. Sarah Chen",
      title: "Longevity Medicine Specialist",
      specialty: "Longevity Medicine",
      rating: 4.9,
      reviews: 156,
      location: "New York, NY",
      image: "/lovable-uploads/sarah-miller-avatar.jpg",
      badges: ["Top Rated", "Verified"],
      experience: "15 years",
      nextAvailable: "Today 2PM",
      bookings: 1234,
      priceRange: "$150 - $400",
      about: "Board-certified physician specializing in preventive and regenerative medicine for healthy aging."
    },
    {
      id: 2,
      name: "Marcus Rodriguez",
      title: "Functional Fitness Coach",
      specialty: "Fitness & Movement",
      rating: 4.8,
      reviews: 89,
      location: "Los Angeles, CA",
      image: "/lovable-uploads/mike-thompson-avatar.jpg",
      badges: ["Trending", "Certified"],
      experience: "8 years",
      nextAvailable: "Tomorrow 9AM",
      bookings: 567,
      priceRange: "$75 - $120",
      about: "Former professional athlete turned longevity fitness specialist focusing on functional movement."
    },
    {
      id: 3,
      name: "Luna Wellness Spa",
      title: "Holistic Wellness Center",
      specialty: "Recovery Therapy",
      rating: 4.9,
      reviews: 234,
      location: "Miami, FL",
      image: "/lovable-uploads/design-team-avatar.jpg",
      badges: ["Near You", "Premium"],
      experience: "12 years",
      nextAvailable: "Today 4PM",
      bookings: 2156,
      priceRange: "$90 - $300",
      about: "Full-service wellness center offering massage, recovery treatments, and rejuvenation therapies."
    },
    {
      id: 4,
      name: "Peak Performance Lab",
      title: "Biohacking & Optimization",
      specialty: "Biohacking",
      rating: 4.7,
      reviews: 67,
      location: "Austin, TX",
      image: "/lovable-uploads/james-davis-avatar.jpg",
      badges: ["New", "Innovative"],
      experience: "5 years",
      nextAvailable: "Friday 10AM",
      bookings: 234,
      priceRange: "$200 - $500",
      about: "Cutting-edge facility specializing in human optimization through advanced biohacking protocols."
    },
    {
      id: 5,
      name: "Maya Wellness Collective",
      title: "Holistic Health Coaching",
      specialty: "Mental Wellness",
      rating: 4.9,
      reviews: 123,
      location: "Seattle, WA",
      image: "/lovable-uploads/emma-wilson-avatar.jpg",
      badges: ["Popular", "Holistic"],
      experience: "10 years",
      nextAvailable: "Monday 1PM",
      bookings: 890,
      priceRange: "$85 - $180",
      about: "Integrative approach to wellness combining coaching, nutrition, and mindfulness practices."
    },
    {
      id: 6,
      name: "Dr. Michael Roberts",
      title: "Sleep Optimization Expert",
      specialty: "Sleep Medicine",
      rating: 4.8,
      reviews: 178,
      location: "Chicago, IL",
      image: "/lovable-uploads/dr-roberts-avatar.jpg",
      badges: ["Expert", "Verified"],
      experience: "20 years",
      nextAvailable: "Next week",
      bookings: 1567,
      priceRange: "$180 - $350",
      about: "Board-certified sleep specialist helping clients optimize sleep for longevity and performance."
    }
  ];

  return (
    <AppLayout>
      <SEO title={t('screens.discover.doctorsCoachesDiscover')} description="Find verified wellness providers and longevity specialists" canonical={window.location.href} />
      <SubNavigation items={discoverNavigation} />
      <div className="p-6 bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <StandardHeader
            title={t('screens.discover.doctorsCoaches')}
            description="Connect with verified longevity specialists, wellness coaches, and health practitioners"
            emoji="👨‍⚕️"
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
              placeholder={t('screens.discover.searchDoctorsCoaches')}
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
              <SplitBarTrigger value="find">{t('screens.discover.findProviders')}</SplitBarTrigger>
              <SplitBarTrigger value="matches">{t('screens.discover.bestMatches')}</SplitBarTrigger>
              <SplitBarTrigger value="myproviders">{t('screens.discover.myProvidersValue0', { value0: getBookmarksByType('provider').length > 0 && `(${getBookmarksByType('provider').length})` })}</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="find" className="space-y-6">
              {/* Filters */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-white/20 mb-8">
            <div className="flex flex-wrap gap-3">
              <Select>
                <SelectTrigger className="w-[160px] bg-background">
                  <SelectValue placeholder={t('screens.discover.specialty')} />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="all">{t('screens.discover.allSpecialties')}</SelectItem>
                  <SelectItem value="longevity">{t('screens.discover.longevityMedicine')}</SelectItem>
                  <SelectItem value="fitness">{t('screens.discover.fitnessMovement')}</SelectItem>
                  <SelectItem value="mental">{t('screens.discover.mentalWellness')}</SelectItem>
                  <SelectItem value="recovery">{t('screens.discover.recoveryTherapy')}</SelectItem>
                  <SelectItem value="nutrition">{t('screens.discover.nutrition')}</SelectItem>
                  <SelectItem value="sleep">{t('screens.discover.sleepMedicine')}</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-[120px] bg-background">
                  <SelectValue placeholder={t('screens.discover.location')} />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="all">{t('screens.discover.allLocations')}</SelectItem>
                  <SelectItem value="online">{t('screens.discover.online')}</SelectItem>
                  <SelectItem value="local">{t('screens.discover.nearMe')}</SelectItem>
                  <SelectItem value="travel">{t('screens.discover.travelAvailable')}</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-[120px] bg-background">
                  <SelectValue placeholder={t('screens.discover.priceRange2')} />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="all">{t('screens.discover.anyPrice')}</SelectItem>
                  <SelectItem value="0-100">$0 - $100</SelectItem>
                  <SelectItem value="100-200">$100 - $200</SelectItem>
                  <SelectItem value="200+">$200+</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-[120px] bg-background">
                  <SelectValue placeholder={t('screens.discover.availability')} />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="all">{t('screens.discover.anyTime')}</SelectItem>
                  <SelectItem value="today">{t('screens.discover.today')}</SelectItem>
                  <SelectItem value="week">{t('screens.discover.thisWeek')}</SelectItem>
                  <SelectItem value="month">{t('screens.discover.thisMonth')}</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-[100px] bg-background">
                  <SelectValue placeholder={t('screens.discover.rating')} />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="all">{t('screens.discover.anyRating')}</SelectItem>
                  <SelectItem value="4.5">{t('screens.discover.text45Stars')}</SelectItem>
                  <SelectItem value="4.0">{t('screens.discover.text40Stars')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Provider Results */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {providers.map((provider) => (
              <Card key={provider.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col h-full bg-white/80 backdrop-blur-sm border-white/20 relative">
                <BookmarkButton
                  item={{
                    item_type: 'provider',
                    item_id: provider.id.toString(),
                    item_name: provider.name,
                    item_image_url: provider.image,
                    item_metadata: {
                      specialty: provider.specialty,
                      rating: provider.rating,
                      location: provider.location,
                      priceRange: provider.priceRange,
                    },
                  }}
                />
                <CardContent className="p-4 md:p-5 lg:p-6 flex-1 flex flex-col">
                  <div className="flex items-start gap-3 md:gap-4 mb-3 md:mb-4">
                    <div className="relative">
                      <img 
                        src={provider.image} 
                        alt={provider.name}
                        className="w-12 h-12 md:w-16 md:h-16 lg:w-18 lg:h-18 rounded-full object-cover"
                      />
                      {provider.badges.includes("Verified") && (
                        <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1">
                          <Verified className="h-2 w-2 md:h-3 md:w-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm md:text-base lg:text-lg text-foreground group-hover:text-primary transition-colors">
                        {provider.name}
                      </h3>
                      <p className="text-xs md:text-sm text-muted-foreground">{provider.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 md:h-4 md:w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs md:text-sm font-medium">{provider.rating}</span>
                          <span className="text-xs md:text-sm text-muted-foreground">({provider.reviews})</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {provider.badges.map((badge) => (
                      <Badge 
                        key={badge} 
                        variant="secondary" 
                        className={`text-xs ${
                          badge === "Top Rated" ? "bg-green-100 text-green-700" :
                          badge === "Trending" ? "bg-orange-100 text-orange-700" :
                          badge === "New" ? "bg-blue-100 text-blue-700" :
                          "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {badge === "Trending" && <TrendingUp className="h-3 w-3 mr-1" />}
                        {badge === "Top Rated" && <Award className="h-3 w-3 mr-1" />}
                        {badge}
                      </Badge>
                    ))}
                  </div>

                  <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4 line-clamp-2 flex-1">
                    {provider.about}
                  </p>

                  <div className="space-y-1 md:space-y-2 mb-4">
                    <div className="flex items-center justify-between text-xs md:text-sm">
                      <span className="text-muted-foreground">{t('screens.discover.experience')}</span>
                      <span className="font-medium">{provider.experience}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs md:text-sm">
                      <span className="text-muted-foreground">{t('screens.discover.priceRange')}</span>
                      <span className="font-medium">{provider.priceRange}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                      <span className="text-xs md:text-sm text-muted-foreground">{provider.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                      <span className="text-xs md:text-sm text-green-600">{t('screens.discover.availableNextavailable', { nextAvailable: provider.nextAvailable })}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-auto">
                        <Button 
                          size="sm" 
                          className="flex-1 text-xs md:text-sm h-7 md:h-8 lg:h-9"
                          onClick={() => navigate(`/discover/provider/${provider.id}`)}
                        >{t('screens.discover.viewProfile')}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="default" 
                          className="flex-1 text-xs md:text-sm h-7 md:h-8 lg:h-9"
                          onClick={() => handleBookNow(provider)}
                        >{t('screens.discover.bookNow')}
                        </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
            </SplitBarContent>

            <SplitBarContent value="matches" className="space-y-6">
              <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Brain className="h-6 w-6 text-purple-500" />
                    <h2 className="text-2xl font-semibold">{t('screens.discover.aimatchedProviders')}</h2>
                  </div>
                  <p className="text-muted-foreground mb-6">{t('screens.discover.providersMatchedYourHealthNeedsPreferences')}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {providers.slice(0, 6).map((provider, index) => (
                      <Card key={provider.id} className="group hover:shadow-lg transition-all duration-300 border-purple-200">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="relative">
                              <img 
                                src={provider.image} 
                                alt={provider.name}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                              {provider.badges.includes("Verified") && (
                                <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1">
                                  <Verified className="h-2 w-2 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <h3 className="font-semibold text-sm">{provider.name}</h3>
                                <div className="bg-white rounded-full px-2 py-1">
                                  <span className="text-xs font-bold text-purple-600">{94 - index * 2}%</span>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground">{provider.title}</p>
                            </div>
                          </div>
                          <div className="bg-purple-50 p-2 rounded-lg mb-3">
                            <div className="flex items-center gap-1">
                              <Sparkles className="h-3 w-3 text-purple-500" />
                              <span className="text-xs text-purple-700">{t('screens.discover.perfectForYourHealthGoals')}</span>
                            </div>
                          </div>
                          <div className="space-y-1 mb-3">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{provider.location}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-green-500" />
                              <span className="text-xs text-green-600">{t('screens.discover.availableNextavailable', { nextAvailable: provider.nextAvailable })}</span>
                            </div>
                          </div>
                    <Button 
                      size="sm" 
                      className="w-full text-xs"
                      onClick={() => handleBookNow(provider)}
                    >
                      {t('screens.discover.bookNow')}
                    </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </SplitBarContent>

            <SplitBarContent value="myproviders" className="space-y-6">
              {/* Stats Dashboard */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <Card className="bg-blue-500/10 border-blue-500/20">
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold text-blue-600">{upcomingAppointments.length}</div>
                    <div className="text-sm text-muted-foreground">{t('screens.discover.upcoming')}</div>
                  </CardContent>
                </Card>
                <Card className="bg-green-500/10 border-green-500/20">
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold text-green-600">{visitHistory.length}</div>
                    <div className="text-sm text-muted-foreground">{t('screens.discover.pastVisits')}</div>
                  </CardContent>
                </Card>
                <Card className="bg-purple-500/10 border-purple-500/20">
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold text-purple-600">{getBookmarksByType('provider').length}</div>
                    <div className="text-sm text-muted-foreground">{t('screens.discover.bookmarked')}</div>
                  </CardContent>
                </Card>
              </div>

              <Tabs defaultValue="bookmarked" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="bookmarked">{t('screens.discover.bookmarked')}</TabsTrigger>
                  <TabsTrigger value="upcoming">{t('screens.discover.upcomingLength', { length: upcomingAppointments.length })}</TabsTrigger>
                  <TabsTrigger value="history">{t('screens.discover.history')}</TabsTrigger>
                </TabsList>

                {/* Bookmarked Tab */}
                <TabsContent value="bookmarked" className="space-y-4">
                  {(() => {
                    const bookmarkedProviders = getBookmarksByType('provider');
                    
                    if (bookmarkedProviders.length === 0) {
                      return (
                        <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                          <CardContent className="p-12 text-center">
                            <div className="text-6xl mb-4">💛</div>
                            <h3 className="text-xl font-semibold mb-2">{t('screens.discover.noSavedProvidersYet')}</h3>
                            <p className="text-muted-foreground">
                              {t('screens.discover.saveYourFavoriteProvidersAccessThem')}
                            </p>
                          </CardContent>
                        </Card>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {bookmarkedProviders.map((bookmark) => {
                          const provider = providers.find(p => p.id.toString() === bookmark.item_id);
                          if (!provider) return null;

                          return (
                            <Card key={bookmark.id} className="bg-white/80 backdrop-blur-sm border-white/20 overflow-hidden hover:shadow-lg transition-shadow relative">
                              <BookmarkButton
                                item={{
                                  item_type: 'provider',
                                  item_id: provider.id.toString(),
                                  item_name: provider.name,
                                  item_image_url: provider.image,
                                  item_metadata: {
                                    specialty: provider.specialty,
                                    rating: provider.rating,
                                    location: provider.location
                                  }
                                }}
                              />
                              <CardContent className="p-6">
                                <div className="flex items-start gap-4 mb-4">
                                  <img 
                                    src={provider.image} 
                                    alt={provider.name}
                                    className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-lg mb-1 truncate">{provider.name}</h3>
                                    <p className="text-sm text-muted-foreground mb-2">{provider.title}</p>
                                    <div className="flex items-center gap-1 text-sm">
                                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                      <span className="font-semibold">{provider.rating}</span>
                                      <span className="text-muted-foreground">({provider.reviews})</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="space-y-2 mb-4">
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <MapPin className="h-4 w-4" />
                                    <span>{provider.location}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm">
                                    <Clock className="h-4 w-4 text-green-500" />
                                    <span className="text-green-600">{t('screens.discover.availableNextavailable', { nextAvailable: provider.nextAvailable })}</span>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button size="sm" className="flex-1">{t('screens.discover.bookNow')}</Button>
                                  <Button size="sm" variant="outline" onClick={() => removeBookmark('provider', provider.id.toString())}>
                                    {t('screens.discover.remove')}
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    );
                  })()}
                </TabsContent>

                {/* Upcoming Tab */}
                <TabsContent value="upcoming" className="space-y-4">
                  {upcomingAppointments.length === 0 ? (
                    <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                      <CardContent className="p-12 text-center">
                        <div className="text-6xl mb-4">📅</div>
                        <h3 className="text-xl font-semibold mb-2">{t('screens.discover.noUpcomingAppointments')}</h3>
                        <p className="text-muted-foreground">
                          {t('screens.discover.bookAppointmentWithProviderSeeIt')}
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {upcomingAppointments.map((appointment: any) => {
                        const now = new Date();
                        const appointmentDate = new Date(appointment.start_time);
                        const daysUntil = differenceInDays(appointmentDate, now);
                        const hoursUntil = differenceInHours(appointmentDate, now);

                        let countdownBadge;
                        if (daysUntil > 7) {
                          countdownBadge = <Badge variant="outline">{formatDate(appointmentDate, 'MMM dd, yyyy')}</Badge>;
                        } else if (daysUntil > 0) {
                          countdownBadge = <Badge className="bg-blue-500">{t('screens.discover.daysuntilDaysAway', { daysUntil })}</Badge>;
                        } else if (hoursUntil > 0) {
                          countdownBadge = <Badge className="bg-orange-500">{t('screens.discover.todayHoursuntilHAway', { hoursUntil })}</Badge>;
                        } else {
                          countdownBadge = <Badge className="bg-red-500">{t('screens.discover.startingSoon')}</Badge>;
                        }

                        return (
                          <Card key={appointment.id} className="bg-white/80 backdrop-blur-sm border-white/20">
                            <CardContent className="p-6">
                              <div className="flex justify-between items-start mb-4">
                                <div className="flex gap-4">
                                  <img
                                    src={appointment.provider_image_url || "/placeholder.svg"}
                                    alt={appointment.provider_name}
                                    className="w-16 h-16 rounded-full object-cover"
                                  />
                                  <div>
                                    <h3 className="font-semibold text-lg">{appointment.provider_name}</h3>
                                    <p className="text-sm text-muted-foreground">{appointment.provider_specialty}</p>
                                    {countdownBadge}
                                  </div>
                                </div>
                                <Badge variant="outline">{appointment.appointment_type}</Badge>
                              </div>

                              <div className="space-y-2 mb-4">
                                <div className="flex items-center gap-2 text-sm">
                                  <Calendar className="h-4 w-4" />
                                  <span>{formatDate(appointmentDate, 'EEEE, MMMM dd, yyyy')}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <Clock className="h-4 w-4" />
                                  <span>{t('screens.discover.value0Duration_minutesMin', { value0: formatDate(appointmentDate, 'HH:mm'), duration_minutes: appointment.duration_minutes })}</span>
                                </div>
                                {appointment.location && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <MapPin className="h-4 w-4" />
                                    <span>{appointment.location}</span>
                                  </div>
                                )}
                              </div>

                              <div className="flex gap-2">
                                <Button size="sm" variant="outline">{t('screens.discover.reschedule')}</Button>
                                <Button size="sm" variant="outline">{t('screens.discover.cancel')}</Button>
                                <Button size="sm" variant="outline">{t('screens.discover.addNotes')}</Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history" className="space-y-4">
                  {visitHistory.length === 0 ? (
                    <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                      <CardContent className="p-12 text-center">
                        <div className="text-6xl mb-4">📋</div>
                        <h3 className="text-xl font-semibold mb-2">{t('screens.discover.noVisitHistoryYet')}</h3>
                        <p className="text-muted-foreground">
                          {t('screens.discover.yourCompletedAppointmentsWillAppearHere')}
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {visitHistory.map((visit: any) => (
                        <VisitHistoryCard key={visit.id} visit={visit} />
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
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

      {/* Booking Flow */}
      {selectedProvider && (
        <BookingPaymentFlow
          isOpen={bookingOpen}
          onClose={() => {
            setBookingOpen(false);
            setSelectedProvider(null);
          }}
          booking={{
            id: selectedProvider.id.toString(),
            title: `${selectedProvider.title} Session`,
            description: `Book a session with ${selectedProvider.name}`,
            price: parseInt(selectedProvider.priceRange.split('-')[0].replace(/\D/g, '')),
            currency: 'usd',
            provider: {
              name: selectedProvider.name,
              avatar: selectedProvider.image,
              rating: selectedProvider.rating
            },
          schedule: {
            date: undefined,
            time: undefined,
            duration: '30 min'
          },
            location: selectedProvider.location,
            type: 'service'
          }}
          userBalance={{
          credits: getBalance('CREDITS') || 0,
            vtna: getBalance('VTNA') || 0,
            usd: getBalance('USD') || 0
          }}
          onBookingComplete={handleBookingComplete}
        />
      )}
    </AppLayout>
  );
}