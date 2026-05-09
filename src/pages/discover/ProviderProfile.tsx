import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Star, MapPin, Clock, Users, Verified, Award, 
  ArrowLeft, Calendar, Shield, GraduationCap,
  MessageCircle, Share2
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import { useState } from "react";
import BookingPaymentFlow from "@/components/payment/BookingPaymentFlow";
import { BookmarkButton } from "@/components/bookmarks/BookmarkButton";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { useWallet } from "@/hooks/useWallet";
import { notify, notifyError, t } from '@/lib/i18n-toast';

export default function ProviderProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [bookingOpen, setBookingOpen] = useState(false);
  const { getBalance } = useWallet();
  
  // Mock provider data - matches DoctorsCoaches.tsx
  const providers = [
    {
      id: 1,
      name: "Dr. Sarah Chen",
      title: "Longevity Medicine Specialist",
      specialty: "Longevity Medicine",
      image: "/lovable-uploads/sarah-miller-avatar.jpg",
      rating: 4.9,
      reviews: 156,
      experience: "15 years",
      location: "New York, NY",
      nextAvailable: "Today 2PM",
      priceRange: "$150 - $400",
      bookings: 1234,
      badges: ["Top Rated", "Verified"],
      availability: "Today 2PM",
      about: "Board-certified physician specializing in preventive and regenerative medicine for healthy aging."
    },
    {
      id: 2,
      name: "Marcus Rodriguez",
      title: "Functional Fitness Coach",
      specialty: "Fitness & Movement",
      image: "/lovable-uploads/mike-thompson-avatar.jpg",
      rating: 4.8,
      reviews: 89,
      experience: "8 years",
      location: "Los Angeles, CA",
      nextAvailable: "Tomorrow 9AM",
      priceRange: "$75 - $120",
      bookings: 567,
      badges: ["Trending", "Certified"],
      availability: "Tomorrow 9AM",
      about: "Former professional athlete turned longevity fitness specialist focusing on functional movement."
    },
    {
      id: 3,
      name: "Luna Wellness Spa",
      title: "Holistic Wellness Center",
      specialty: "Recovery Therapy",
      image: "/lovable-uploads/design-team-avatar.jpg",
      rating: 4.9,
      reviews: 234,
      experience: "12 years",
      location: "Miami, FL",
      nextAvailable: "Today 4PM",
      priceRange: "$90 - $300",
      bookings: 2156,
      badges: ["Near You", "Premium"],
      availability: "Today 4PM",
      about: "Full-service wellness center offering massage, recovery treatments, and rejuvenation therapies."
    }
  ];
  
  const provider = providers.find(p => p.id.toString() === id);

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

  const handleBookingComplete = async (bookingDetails: any) => {
    if (!provider) return;
    
    const appointmentData = {
      provider_id: provider.id.toString(),
      provider_name: provider.name,
      provider_specialty: provider.specialty,
      provider_image_url: provider.image,
      appointment_type: 'consultation',
      status: 'scheduled',
      start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      duration_minutes: 30,
      location: provider.location,
    };
    
    await saveAppointmentMutation.mutateAsync(appointmentData);
    setBookingOpen(false);
  };
  
  if (!provider) {
    return (
      <AppLayout>
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">{t('screens.discover.providerNotFound')}</h1>
          <Button onClick={() => navigate('/discover/doctors-coaches')}>
            {t('screens.discover.backProviders')}
          </Button>
        </div>
      </AppLayout>
    );
  }
  
  return (
    <AppLayout>
      <SEO 
        title={`${provider.name} - ${provider.title}`}
        description={provider.about}
      />
      
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('screens.discover.back')}
        </Button>
        
        {/* Profile Header */}
        <Card className="bg-card/80 backdrop-blur-sm border-border">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Provider Image */}
              <div className="relative">
                <img 
                  src={provider.image}
                  alt={provider.name}
                  className="w-32 h-32 rounded-full object-cover border-4 border-border shadow-lg"
                />
                {provider.badges.includes("Verified") && (
                  <div className="absolute -bottom-2 -right-2 bg-primary rounded-full p-2">
                    <Verified className="h-6 w-6 text-primary-foreground" />
                  </div>
                )}
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
                  className="absolute top-0 right-0"
                />
              </div>
              
              {/* Provider Info */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">{provider.name}</h1>
                <p className="text-xl text-muted-foreground mb-3">{provider.title}</p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {provider.badges.map((badge) => (
                    <Badge 
                      key={badge}
                      variant={badge === "Top Rated" ? "default" : "secondary"}
                      className="px-3 py-1"
                    >
                      {badge === "Top Rated" && <Award className="h-4 w-4 mr-1" />}
                      {badge === "Verified" && <Verified className="h-4 w-4 mr-1" />}
                      {badge}
                    </Badge>
                  ))}
                </div>
                
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <span className="font-bold text-lg">{provider.rating}</span>
                    <span className="text-muted-foreground">{t('screens.discover.reviewsReviews', { reviews: provider.reviews })}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{t('screens.discover.value0Bookings', { value0: provider.bookings.toLocaleString() })}</span>
                  </div>
                </div>
                
                <div className="flex gap-3 mb-4">
                  <Button 
                    size="lg" 
                    className="flex-1"
                    onClick={() => setBookingOpen(true)}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    {t('screens.discover.bookAppointment')}
                  </Button>
                  <Button size="lg" variant="outline">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    {t('screens.discover.message')}
                  </Button>
                  <Button size="lg" variant="outline">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Quick Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">{t('screens.discover.location')}</p>
                  <p className="font-medium">{provider.location}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">{t('screens.discover.nextAvailable')}</p>
                  <p className="font-medium text-green-600">{provider.nextAvailable}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">{t('screens.discover.experience')}</p>
                  <p className="font-medium">{provider.experience}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Tabs */}
        <Tabs defaultValue="about" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="about">{t('screens.discover.about')}</TabsTrigger>
            <TabsTrigger value="services">{t('screens.discover.services')}</TabsTrigger>
            <TabsTrigger value="reviews">{t('screens.discover.reviews')}</TabsTrigger>
            <TabsTrigger value="availability">{t('screens.discover.availability')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="about" className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-3">{t('screens.discover.aboutName', { name: provider.name })}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {provider.about}
                </p>
                
                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{t('screens.discover.specialty2')}</span>
                    <span className="text-muted-foreground">{provider.specialty}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{t('screens.discover.experience')}</span>
                    <span className="text-muted-foreground">{provider.experience}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="services" className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">{t('screens.discover.servicesPricing')}</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 border border-border rounded-lg">
                    <div>
                      <p className="font-medium">{t('screens.discover.initialConsultation')}</p>
                      <p className="text-sm text-muted-foreground">{t('screens.discover.text60Minutes')}</p>
                    </div>
                    <p className="text-lg font-bold">{provider.priceRange.split('-')[0].trim()}</p>
                  </div>
                  <div className="flex justify-between items-center p-4 border border-border rounded-lg">
                    <div>
                      <p className="font-medium">{t('screens.discover.followupSession')}</p>
                      <p className="text-sm text-muted-foreground">{t('screens.discover.text30Minutes')}</p>
                    </div>
                    <p className="text-lg font-bold">$150</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="reviews" className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">{t('screens.discover.patientReviews')}</h3>
                <p className="text-muted-foreground">{t('screens.discover.reviewsFeatureComingSoon')}</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="availability" className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">{t('screens.discover.availability')}</h3>
                <p className="text-muted-foreground">{t('screens.discover.calendarIntegrationComingSoon')}</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Booking Flow */}
      <BookingPaymentFlow
        isOpen={bookingOpen}
        onClose={() => setBookingOpen(false)}
        booking={{
          id: provider.id.toString(),
          title: `${provider.title} Session`,
          description: `Book a session with ${provider.name}`,
          price: parseInt(provider.priceRange.split('-')[0].replace(/\D/g, '')),
          currency: 'usd',
          provider: {
            name: provider.name,
            avatar: provider.image,
            rating: provider.rating
          },
          schedule: {
            date: undefined,
            time: undefined,
            duration: '30 min'
          },
          location: provider.location,
          type: 'service'
        }}
        userBalance={{
          credits: getBalance('CREDITS') || 0,
          vtna: getBalance('VTNA') || 0,
          usd: getBalance('USD') || 0
        }}
        onBookingComplete={handleBookingComplete}
      />
    </AppLayout>
  );
}
