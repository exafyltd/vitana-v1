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
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/hooks/useWallet";

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
      name: "Dr. Sarah Miller",
      title: "Primary Care Physician",
      specialty: "Internal Medicine",
      image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop",
      rating: 4.9,
      reviews: 234,
      experience: "15+ years",
      location: "Manhattan, NY",
      nextAvailable: "Tomorrow",
      priceRange: "$200 - $350",
      bookings: 1200,
      badges: ["Verified", "Top Rated"],
      availability: "Available Tomorrow",
      about: "Dr. Sarah Miller is a board-certified internal medicine physician with over 15 years of experience providing comprehensive primary care. She specializes in preventive medicine, chronic disease management, and patient education. Dr. Miller is known for her compassionate approach and commitment to personalized care."
    },
    {
      id: 2,
      name: "Coach Mike Johnson",
      title: "Certified Personal Trainer",
      specialty: "Fitness Training",
      image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=400&fit=crop",
      rating: 4.8,
      reviews: 189,
      experience: "10+ years",
      location: "Brooklyn, NY",
      nextAvailable: "Today",
      priceRange: "$75 - $150",
      bookings: 850,
      badges: ["Verified"],
      availability: "Available Today",
      about: "Mike Johnson is a certified personal trainer and fitness coach specializing in strength training, weight loss, and athletic performance. With over 10 years of experience, he has helped hundreds of clients achieve their fitness goals through personalized training programs and nutritional guidance."
    },
    {
      id: 3,
      name: "Dr. Lisa Chen",
      title: "Clinical Psychologist",
      specialty: "Mental Health",
      image: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&h=400&fit=crop",
      rating: 5.0,
      reviews: 156,
      experience: "12+ years",
      location: "Queens, NY",
      nextAvailable: "This Week",
      priceRange: "$180 - $300",
      bookings: 650,
      badges: ["Verified", "Top Rated"],
      availability: "Available This Week",
      about: "Dr. Lisa Chen is a licensed clinical psychologist specializing in anxiety, depression, and trauma therapy. She uses evidence-based approaches including CBT and mindfulness techniques to help clients develop coping strategies and achieve mental wellness."
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
      toast({
        title: "Appointment Booked! 🎉",
        description: "Your appointment has been confirmed"
      });
    },
    onError: (error) => {
      console.error('Error saving appointment:', error);
      toast({
        title: "Booking Failed",
        description: "Please try again",
        variant: "destructive"
      });
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
          <h1 className="text-2xl font-bold mb-4">Provider Not Found</h1>
          <Button onClick={() => navigate('/discover/doctors-coaches')}>
            Back to Providers
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
          Back
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
                    <span className="text-muted-foreground">({provider.reviews} reviews)</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{provider.bookings.toLocaleString()} bookings</span>
                  </div>
                </div>
                
                <div className="flex gap-3 mb-4">
                  <Button 
                    size="lg" 
                    className="flex-1"
                    onClick={() => setBookingOpen(true)}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Book Appointment
                  </Button>
                  <Button size="lg" variant="outline">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Message
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
                  <p className="text-sm text-muted-foreground">Location</p>
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
                  <p className="text-sm text-muted-foreground">Next Available</p>
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
                  <p className="text-sm text-muted-foreground">Experience</p>
                  <p className="font-medium">{provider.experience}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Tabs */}
        <Tabs defaultValue="about" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="availability">Availability</TabsTrigger>
          </TabsList>
          
          <TabsContent value="about" className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-3">About {provider.name}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {provider.about}
                </p>
                
                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Specialty:</span>
                    <span className="text-muted-foreground">{provider.specialty}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Experience:</span>
                    <span className="text-muted-foreground">{provider.experience}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="services" className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Services & Pricing</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 border border-border rounded-lg">
                    <div>
                      <p className="font-medium">Initial Consultation</p>
                      <p className="text-sm text-muted-foreground">60 minutes</p>
                    </div>
                    <p className="text-lg font-bold">{provider.priceRange.split('-')[0].trim()}</p>
                  </div>
                  <div className="flex justify-between items-center p-4 border border-border rounded-lg">
                    <div>
                      <p className="font-medium">Follow-up Session</p>
                      <p className="text-sm text-muted-foreground">30 minutes</p>
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
                <h3 className="text-lg font-semibold mb-4">Patient Reviews</h3>
                <p className="text-muted-foreground">Reviews feature coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="availability" className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Availability</h3>
                <p className="text-muted-foreground">Calendar integration coming soon...</p>
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
          vtn: getBalance('VTN') || 0,
          usd: getBalance('USD') || 0
        }}
        onBookingComplete={handleBookingComplete}
      />
    </AppLayout>
  );
}
