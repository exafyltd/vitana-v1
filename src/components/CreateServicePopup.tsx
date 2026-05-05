import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState } from "react";
import { 
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Upload,
  Tag,
  Users,
  DollarSign,
  Sparkles
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from '@/hooks/use-toast';
import { useMessages } from "@/hooks/useMessages";
import BookingPaymentFlow from "@/components/payment/BookingPaymentFlow";
import { useWallet } from "@/hooks/useWallet";
import { notify, t } from '@/lib/i18n-toast';

interface CreateServicePopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const serviceTypes = [
  {
    id: "yoga",
    title: "Yoga Class",
    icon: "🧘",
    color: "bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 border-purple-200"
  },
  {
    id: "fitness",
    title: "Fitness Training",
    icon: "🏋️",
    color: "bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-200"
  },
  {
    id: "nutrition",
    title: "Nutrition Coaching",
    icon: "🍎",
    color: "bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-200"
  },
  {
    id: "mental-health",
    title: "Mental Health Support",
    icon: "🧠",
    color: "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-200"
  },
  {
    id: "wellness",
    title: "Wellness Workshop",
    icon: "🌱",
    color: "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-200"
  },
  {
    id: "group",
    title: "Group Session",
    icon: "👥",
    color: "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 border-orange-200"
  }
];

const availableTags = [
  "Wellness", "Longevity", "Nutrition", "Mental Health", "Fitness", "Mindfulness",
  "Recovery", "Performance", "Weight Loss", "Strength", "Flexibility", "Balance"
];

export default function CreateServicePopup({ isOpen, onClose }: CreateServicePopupProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedServiceType, setSelectedServiceType] = useState<string>("");
  const { getBalance } = useWallet();
  const [formData, setFormData] = useState({
    title: "",
    format: "",
    sessionType: "",
    price: "",
    currency: "USD",
    spots: "",
    date: undefined as Date | undefined,
    time: "",
    duration: "60",
    location: "",
    description: "",
    tags: [] as string[]
  });
  const { toast } = useToast();
  const { sendMessage } = useMessages(undefined, false); // Disable auto-fetch
  const [showPaymentDemo, setShowPaymentDemo] = useState(false);

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleServiceTypeSelect = (serviceId: string) => {
    setSelectedServiceType(serviceId);
    handleNext();
  };

  const handleTagToggle = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const handleSaveDraft = () => {
    notify('toasts.common.draftSaved', 'toasts.common.yourServiceDraftHasSavedSuccessfully');
    onClose();
  };

  const handlePublish = async () => {
    // Simulate service creation and notification
    const serviceData = {
      title: formData.title,
      price: parseFloat(formData.price) || 0,
      currency: formData.currency === 'USD' ? 'usd' : 'credits',
      date: formData.date?.toISOString().split('T')[0],
      time: formData.time,
      location: formData.location,
      description: formData.description
    };

    // Send service creation notification to community
    try {
      await sendMessage(
        `New service available: ${formData.title} - ${formData.currency === 'USD' ? '$' + formData.price : formData.price + ' credits'}`,
        undefined, // Broadcast to community
        'service_announcement',
        serviceData
      );
    } catch (error) {
      console.error('Error broadcasting service:', error);
    }

    notify('toasts.common.servicePublished', 'toasts.common.yourServiceNowLiveAcceptingBookings');
    
    // Demo the booking flow
    setShowPaymentDemo(true);
  };

  const resetForm = () => {
    setCurrentStep(1);
    setSelectedServiceType("");
    setFormData({
      title: "",
      format: "",
      sessionType: "",
      price: "",
      currency: "USD",
      spots: "",
      date: undefined,
      time: "",
      duration: "60",
      location: "",
      description: "",
      tags: []
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return "Choose Service Type";
      case 2: return "Service Details";
      case 3: return "Schedule & Location";
      case 4: return "Media & Branding";
      default: return "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center pb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-500 to-blue-600 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold">{t('screens.common.startNewBusinessOffering')}</DialogTitle>
          <p className="text-muted-foreground">{t('screens.common.turnYourSkillsIntoIncomeToday')}</p>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  step <= currentStep ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {step}
                </div>
                {step < 4 && (
                  <div className={cn(
                    "w-12 h-0.5 mx-2",
                    step < currentStep ? "bg-primary" : "bg-muted"
                  )} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-center">{getStepTitle()}</h3>
        </div>

        {/* Step 1: Service Type Selection */}
        {currentStep === 1 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-6">
            {serviceTypes.map((service) => (
              <Button
                key={service.id}
                variant="outline"
                className={cn(
                  "h-auto flex-col space-y-3 p-6 transition-all duration-200",
                  service.color,
                  selectedServiceType === service.id && "ring-2 ring-primary"
                )}
                onClick={() => handleServiceTypeSelect(service.id)}
              >
                <div className="text-3xl">{service.icon}</div>
                <div className="text-center">
                  <div className="font-semibold text-sm">{service.title}</div>
                </div>
              </Button>
            ))}
          </div>
        )}

        {/* Step 2: Service Details */}
        {currentStep === 2 && (
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">{t('screens.common.serviceTitle')}</Label>
                <Input
                  id="title"
                  placeholder={t('screens.common.eGMorningYogaFlow')}
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="format">Format</Label>
                <Select value={formData.format} onValueChange={(value) => setFormData(prev => ({ ...prev, format: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('screens.common.chooseFormat')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in-person">{t('screens.common.inperson')}</SelectItem>
                    <SelectItem value="virtual">Virtual</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sessionType">{t('screens.common.sessionType')}</Label>
                <Select value={formData.sessionType} onValueChange={(value) => setFormData(prev => ({ ...prev, sessionType: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('screens.common.chooseType')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one-time">{t('screens.common.onetime')}</SelectItem>
                    <SelectItem value="recurring">Recurring</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="spots">{t('screens.common.spotsAvailable')}</Label>
                <Input
                  id="spots"
                  placeholder="e.g., 15"
                  value={formData.spots}
                  onChange={(e) => setFormData(prev => ({ ...prev, spots: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">{t('screens.common.pricePerSession')}</Label>
                <div className="flex">
                  <Select value={formData.currency} onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">$</SelectItem>
                      <SelectItem value="EUR">€</SelectItem>
                      <SelectItem value="GBP">£</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    className="flex-1"
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Schedule & Location */}
        {currentStep === 3 && (
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t('screens.common.dateTime')}</Label>
                <div className="flex space-x-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.date ? format(formData.date, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.date}
                        onSelect={(date) => setFormData(prev => ({ ...prev, date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Input
                    type="time"
                    className="w-32"
                    value={formData.time}
                    onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="duration">{t('screens.common.durationMinutes')}</Label>
                <Select value={formData.duration} onValueChange={(value) => setFormData(prev => ({ ...prev, duration: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">{t('screens.common.text30Minutes')}</SelectItem>
                    <SelectItem value="45">{t('screens.common.text45Minutes')}</SelectItem>
                    <SelectItem value="60">{t('screens.common.text60Minutes')}</SelectItem>
                    <SelectItem value="90">{t('screens.common.text90Minutes')}</SelectItem>
                    <SelectItem value="120">{t('screens.common.text120Minutes')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="location">{t('screens.common.locationvenue')}</Label>
              <Input
                id="location"
                placeholder={formData.format === 'virtual' ? "Meeting link or platform" : "Address or venue name"}
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>
          </div>
        )}

        {/* Step 4: Media & Branding */}
        {currentStep === 4 && (
          <div className="space-y-6 py-4">
            <div>
              <Label>{t('screens.common.coverImage')}</Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">{t('screens.common.uploadCoverImageForYourService')}</p>
                <Button variant="outline" size="sm">{t('screens.common.chooseFile')}</Button>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder={t('screens.common.eGStartYourDayWith')}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div>
              <Label>{t('screens.common.tagscategories')}</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {availableTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={formData.tags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleTagToggle(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-6 border-t">
          <div>
            {currentStep > 1 && (
              <Button variant="outline" onClick={handlePrevious}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
            )}
          </div>

          <div className="flex gap-3">
            {currentStep === 4 ? (
              <>
                <Button variant="outline" onClick={handleSaveDraft}>
                  Save Draft
                </Button>
                <Button 
                  className="bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700"
                  onClick={handlePublish}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Publish & Offer Service
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleNext} disabled={currentStep === 1 && !selectedServiceType}>
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
      
      {/* Demo Booking Payment Flow */}
      <BookingPaymentFlow
        isOpen={showPaymentDemo}
        onClose={() => setShowPaymentDemo(false)}
        booking={{
          id: 'demo_service',
          title: formData.title || 'Your Service',
          description: formData.description || 'Service description',
          price: parseFloat(formData.price) || 50,
          currency: formData.currency === 'USD' ? 'usd' : 'credits',
          provider: {
            name: 'You',
            avatar: '/lovable-uploads/design-team-avatar.jpg',
            rating: 4.9
          },
          schedule: {
            date: formData.date?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
            time: formData.time || '10:00',
            duration: formData.duration + ' minutes'
          },
          location: formData.location || 'Your location',
          type: 'service'
        }}
        userBalance={{
          credits: getBalance('CREDITS') || 0,
          vtna: getBalance('VTNA') || 0,
          usd: getBalance('USD') || 0
        }}
      />
    </Dialog>
  );
}