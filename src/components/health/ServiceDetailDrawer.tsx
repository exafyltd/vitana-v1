import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, MapPin, Star, Users, Shield, CreditCard, MessageSquare, Heart, CheckCircle, Award, Bookmark } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BookingPaymentFlow from "@/components/payment/BookingPaymentFlow";
import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { t } from '@/lib/i18n-toast';

interface ServiceProvider {
  id: string;
  name: string;
  title: string;
  rating: number;
  reviews: number;
  avatar: string;
  experience: string;
  specialties: string[];
}

interface ServiceDetail {
  id: string;
  title: string;
  description: string;
  longDescription: string;
  category: string;
  icon: any;
  color: string;
  vitanaImpact?: string;
  duration: string;
  price: string;
  location: string;
  providers: ServiceProvider[];
  features: string[];
  requirements: string[];
  benefits: string[];
  nextAvailable: string;
  tags: string[];
}

interface ServiceDetailDrawerProps {
  service: ServiceDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const mockServiceDetails: Record<string, ServiceDetail> = {
  "CT-301": {
    id: "CT-301",
    title: "Comprehensive Lab Test",
    description: "Complete blood work and biomarker analysis",
    longDescription: "Our comprehensive lab test panel covers over 80 biomarkers including complete blood count, metabolic panel, lipid profile, inflammatory markers, hormones, vitamins, and minerals. This extensive analysis provides a complete picture of your health status and identifies areas for optimization.",
    category: "Preventive",
    icon: "TestTube",
    color: "from-emerald-500/20 to-green-500/20",
    vitanaImpact: "+25 points",
    duration: "2 hours",
    price: "$299",
    location: "Multiple locations",
    nextAvailable: "Tomorrow 9:00 AM",
    providers: [
      {
        id: "p1",
        name: "Dr. Sarah Chen",
        title: "Clinical Laboratory Director",
        rating: 4.9,
        reviews: 127,
        avatar: "/lovable-uploads/lisa-chen-avatar.jpg",
        experience: "15+ years",
        specialties: ["Biomarker Analysis", "Preventive Medicine", "Longevity"]
      },
      {
        id: "p2", 
        name: "Dr. Michael Roberts",
        title: "Laboratory Medicine Specialist",
        rating: 4.8,
        reviews: 89,
        avatar: "/lovable-uploads/dr-roberts-avatar.jpg",
        experience: "12+ years",
        specialties: ["Clinical Chemistry", "Molecular Diagnostics"]
      }
    ],
    features: [
      "80+ biomarkers tested",
      "Same-day digital results",
      "Personalized health insights", 
      "AI-powered recommendations",
      "Integration with Vitana Index"
    ],
    requirements: [
      "12-hour fasting required",
      "Bring valid ID",
      "Arrive 15 minutes early"
    ],
    benefits: [
      "Complete health baseline",
      "Early disease detection",
      "Personalized recommendations",
      "Vitana Index optimization",
      "Quarterly tracking available"
    ],
    tags: ["Popular", "Comprehensive", "AI-Enhanced"]
  }
};

export default function ServiceDetailDrawer({ service, open, onOpenChange }: ServiceDetailDrawerProps) {
  const { toast } = useToast();
  const [showBookingFlow, setShowBookingFlow] = useState(false);
  const { getBalance } = useWallet();

  if (!service) return null;

  const serviceDetail = mockServiceDetails[service.id] || service;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="pb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${serviceDetail.color} flex items-center justify-center`}>
                  <service.icon className="w-6 h-6 text-foreground" />
                </div>
                <div>
                  <SheetTitle className="text-xl">{serviceDetail.title}</SheetTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{serviceDetail.category}</Badge>
                    {serviceDetail.vitanaImpact && (
                      <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700">
                        {serviceDetail.vitanaImpact}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <SheetDescription className="text-base">
                {serviceDetail.longDescription}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Quick Info */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">{t('screens.health.serviceDetails')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{serviceDetail.duration}</p>
                    <p className="text-xs text-muted-foreground">Duration</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{serviceDetail.price}</p>
                    <p className="text-xs text-muted-foreground">Price</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{serviceDetail.location}</p>
                    <p className="text-xs text-muted-foreground">Location</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                <Calendar className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">Next available: {serviceDetail.nextAvailable}</span>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button className="flex-1" size="lg" onClick={() => setShowBookingFlow(true)}>
              <Calendar className="w-4 h-4 mr-2" />
              Book Now
            </Button>
            <Button variant="outline" className="flex-1" size="lg">
              <Bookmark className="w-4 h-4 mr-2" />
              Add to Plan
            </Button>
            <Button variant="outline" size="lg">
              <MessageSquare className="w-4 h-4 mr-2" />
              Ask AI
            </Button>
          </div>

          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                What's Included
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {serviceDetail.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Benefits */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500" />
                Health Benefits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {serviceDetail.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-500" />
                    <span className="text-sm">{benefit}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Providers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Available Providers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {serviceDetail.providers.map((provider) => (
                <div key={provider.id} className="flex items-center gap-4 p-3 border rounded-lg">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={provider.avatar} />
                    <AvatarFallback>{provider.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{provider.name}</h4>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{provider.rating}</span>
                        <span className="text-xs text-muted-foreground">({provider.reviews})</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{provider.title}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">{provider.experience}</span>
                      <div className="flex gap-1">
                        {provider.specialties.slice(0, 2).map((specialty, index) => (
                          <span key={index} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{specialty}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Requirements */}
          {serviceDetail.requirements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5 text-orange-600" />
                  Requirements & Preparation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {serviceDetail.requirements.map((requirement, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-orange-600" />
                      <span className="text-sm">{requirement}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          {serviceDetail.tags.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Tags</h4>
              <div className="flex gap-2 flex-wrap">
                {serviceDetail.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
      
      {/* Booking Payment Flow */}
      <BookingPaymentFlow
        isOpen={showBookingFlow}
        onClose={() => setShowBookingFlow(false)}
        booking={{
          id: serviceDetail.id,
          title: serviceDetail.title,
          description: serviceDetail.description,
          price: parseInt(serviceDetail.price?.replace('$', '') || '50'),
          currency: 'usd',
          provider: {
            name: serviceDetail.providers[0]?.name || 'Healthcare Provider',
            avatar: serviceDetail.providers[0]?.avatar,
            rating: serviceDetail.providers[0]?.rating
          },
          schedule: {
            date: new Date().toISOString().split('T')[0],
            time: '10:00',
            duration: serviceDetail.duration || '60 minutes'
          },
          location: serviceDetail.location || 'Healthcare Facility',
          type: 'service'
        }}
        userBalance={{
          credits: getBalance('CREDITS') || 0,
          vtna: getBalance('VTNA') || 0,
          usd: getBalance('USD') || 0
        }}
      />
    </Sheet>
  );
}