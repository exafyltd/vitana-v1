import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MapPin, Calendar, Clock, X, AlertCircle, Plus, Sparkles, RefreshCw, Loader2, DollarSign, Share } from "lucide-react";
import { useCommunityEvents } from "@/hooks/useCommunityEvents";
import { useToast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";
import { TicketTypeForm, TicketTypeInput } from "@/components/tickets/TicketTypeForm";
import { notify, notifyError, t } from '@/lib/i18n-toast';

interface CommunityEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  location: string | null;
  virtual_link: string | null;
  start_time: string;
  end_time: string | null;
  max_participants: number | null;
  participant_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  image_url?: string;
  metadata?: any;
  resellable?: boolean;
  resale_scope?: string;
  default_reseller_commission_rate?: number;
}

interface EditMeetupPopupProps {
  isOpen: boolean;
  onClose: () => void;
  event: CommunityEvent;
  onUpdated?: () => void;
}

export function EditMeetupPopup({ isOpen, onClose, event, onUpdated }: EditMeetupPopupProps) {
  const { updateEvent } = useCommunityEvents();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    detailedDescription: "",
    category: "",
    date: "",
    time: "",
    duration: "",
    location: "",
    isVirtual: false,
    capacity: "",
    requirements: "",
    isRecurring: false,
    recurringType: "weekly",
    imageUrl: "",
    isPaid: false,
    price: "",
    displayCurrency: "USD" as "USD" | "EUR"
  });

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImagePreview, setGeneratedImagePreview] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  // Ticket types state
  const [enableTicketSales, setEnableTicketSales] = useState(false);
  const [ticketTypes, setTicketTypes] = useState<(TicketTypeInput & { id?: string })[]>([]);
  
  // Reselling options
  const [resellable, setResellable] = useState(false);
  const [resaleScope, setResaleScope] = useState<"public" | "tenant" | "none">("public");
  const [resellerCommission, setResellerCommission] = useState(10);
  
  const availableTags = [
    'Beginner Friendly', 'Outdoor', 'Indoor', 'Free', 'Family Friendly', 
    'Adults Only', 'Bring Equipment', 'Materials Provided', 'Expert Led',
    'Group Activity', 'Individual Focus', 'Certification Available'
  ];

  // Populate form with existing event data
  useEffect(() => {
    if (event && isOpen) {
      const startDate = new Date(event.start_time);
      const endDate = event.end_time ? new Date(event.end_time) : null;
      
      // Calculate duration
      let duration = "";
      if (endDate) {
        const diffMs = endDate.getTime() - startDate.getTime();
        const diffMinutes = Math.round(diffMs / (1000 * 60));
        if (diffMinutes === 30) duration = "30min";
        else if (diffMinutes === 60) duration = "1hour";
        else if (diffMinutes === 120) duration = "2hour";
        else if (diffMinutes === 180) duration = "3hour";
        else if (diffMinutes === 240) duration = "4hour";
        else if (diffMinutes === 300) duration = "5hour";
        else if (diffMinutes === 360) duration = "6hour";
        else if (diffMinutes === 480) duration = "8hour";
      }

      setFormData({
        title: event.title || "",
        description: event.description || "",
        detailedDescription: event.metadata?.detailed_description || "",
        category: "",
        date: startDate.toISOString().split('T')[0],
        time: startDate.toTimeString().slice(0, 5),
        duration,
        location: event.location || "",
        isVirtual: !!event.virtual_link,
        capacity: event.max_participants?.toString() || "",
        requirements: "",
        isRecurring: false,
        recurringType: "weekly",
        imageUrl: event.image_url || "",
        isPaid: event.metadata?.is_paid || false,
        price: event.metadata?.price?.toString() || "",
        displayCurrency: event.metadata?.display_currency || "USD"
      });
      
      setGeneratedImagePreview(event.image_url || null);
      setErrors({});
      
      // Initialize reselling options
      setResellable(event.resellable || false);
      setResaleScope((event.resale_scope as "public" | "tenant" | "none") || "public");
      setResellerCommission(event.default_reseller_commission_rate || 10);

      // Fetch existing ticket types for this event
      const fetchTicketTypes = async () => {
        const { data: existingTickets } = await supabase
          .from("event_ticket_types")
          .select("*")
          .eq("event_id", event.id)
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (existingTickets && existingTickets.length > 0) {
          setEnableTicketSales(true);
          setTicketTypes(existingTickets.map(t => ({
            id: t.id,
            name: t.name,
            description: t.description || "",
            price: t.price,
            currency: (t.currency || "USD") as "USD" | "EUR",
            quantity: t.quantity_available,
            saleStartDate: t.sale_start_date ? t.sale_start_date.split("T")[0] : "",
            saleEndDate: t.sale_end_date ? t.sale_end_date.split("T")[0] : "",
          })));
        } else {
          setEnableTicketSales(false);
          setTicketTypes([]);
        }
      };
      fetchTicketTypes();
    }
  }, [event, isOpen]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      // Create a temporary URL for preview
      const imageUrl = URL.createObjectURL(file);
      setFormData({...formData, imageUrl});
    }
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleGenerateImage = async () => {
    setIsGeneratingImage(true);
    setGenerationError(null);
    
    try {
      const startTime = new Date(`${formData.date}T${formData.time}`);
      const timeOfDay = startTime.getHours() < 12 ? 'morning' : startTime.getHours() < 18 ? 'afternoon' : 'evening';

      const { data, error } = await supabase.functions.invoke('generate-event-image', {
        body: {
          eventId: event.id,
          title: formData.title,
          description: formData.description,
          location: formData.location,
          metadata: {
            category: formData.category,
            venue: 'outdoor',
            timeOfDay
          }
        }
      });
      
      if (error) throw error;
      
      if (data.success) {
        setGeneratedImagePreview(data.imageUrl);
        setFormData({...formData, imageUrl: data.imageUrl});
        
        notify('toasts.common.imageGenerated', 'toasts.common.aiHasCreatedCustomImageFor');
      }
    } catch (err: any) {
      console.error('Image generation failed:', err);
      console.error('Error details:', {
        message: err.message,
        context: err.context,
        details: err.details
      });
      
      let errorMessage = 'Failed to generate image. Please try again or upload manually.';
      
      if (err.message?.includes('429') || err.message?.includes('Too many requests')) {
        errorMessage = 'Too many requests. Please wait a moment and try again.';
      } else if (err.message?.includes('402') || err.message?.includes('credits')) {
        errorMessage = 'AI credits depleted. Please add credits to continue.';
      } else if (err.message?.includes('Only event creators')) {
        errorMessage = 'You do not have permission to generate images for this event.';
      } else if (err.context?.body) {
        // Extract error from Supabase function response
        try {
          const errorBody = JSON.parse(err.context.body);
          if (errorBody.error) {
            errorMessage = errorBody.error;
          }
        } catch {}
      }
      
      setGenerationError(errorMessage);
      
      notifyError('toasts.common.generationFailed');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Meetup title is required";
    }
    if (!formData.date) {
      newErrors.date = "Date is required";
    }
    if (!formData.time) {
      newErrors.time = "Time is required";
    }
    if (!formData.isVirtual && !formData.location.trim()) {
      newErrors.location = "Location is required for in-person meetups";
    }
    
    // Validate price if paid event
    if (formData.isPaid && event.event_type === 'event') {
      const priceNum = parseFloat(formData.price);
      if (!formData.price || isNaN(priceNum) || priceNum <= 0) {
        newErrors.price = "Please enter a valid price greater than $0";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      notifyError('toasts.common.formIncomplete', 'toasts.common.pleaseFillAllRequiredFields');
      return;
    }

    setLoading(true);

    try {
      // Create ISO datetime string
      const startTime = new Date(`${formData.date}T${formData.time}`).toISOString();
      
      // Calculate end time based on duration
      let endTime: string | undefined = undefined;
      if (formData.duration) {
        const start = new Date(startTime);
        const durationMap: Record<string, number> = {
          "30min": 30,
          "1hour": 60,
          "2hour": 120,
          "3hour": 180,
          "4hour": 240,
          "5hour": 300,
          "6hour": 360,
          "8hour": 480,
          "half-day": 240,
          "full-day": 480
        };
        const minutes = durationMap[formData.duration as keyof typeof durationMap] || 60;
        start.setMinutes(start.getMinutes() + minutes);
        endTime = start.toISOString();
      }

      // Determine image URL: AI-generated, manually uploaded, or existing
      let uploadedImageUrl: string | undefined = formData.imageUrl || event.image_url; // Prefer AI-generated or new image
      if (selectedImage) {
        // Manual image upload
        try {
          const { data: { user } } = await supabase.auth.getUser();
          const ext = selectedImage.name.split('.').pop() || 'jpg';
          const fileName = `${Date.now()}.${ext}`;
          const filePath = `${(user?.id ?? 'public')}/${fileName}`;
          const { error: uploadError } = await supabase.storage.from('covers').upload(filePath, selectedImage, {
            upsert: true,
            contentType: selectedImage.type,
          });
          if (uploadError) throw uploadError;
          const { data: pub } = supabase.storage.from('covers').getPublicUrl(filePath);
          uploadedImageUrl = pub.publicUrl;
        } catch (e) {
          console.error('Image upload failed:', e);
          notify('toasts.common.imageUploadFailed', 'toasts.common.weLlKeepExistingImage');
        }
      }

      const eventData = {
        title: formData.title,
        description: formData.description || undefined,
        event_type: event.event_type,
        location: formData.isVirtual ? undefined : formData.location || undefined,
        virtual_link: formData.isVirtual ? 'Virtual Event' : undefined,
        start_time: startTime,
        end_time: endTime,
        max_participants: formData.capacity ? parseInt(formData.capacity) : undefined,
        image_url: uploadedImageUrl,
        metadata: {
          ...(event.metadata || {}),
          ...(enableTicketSales && ticketTypes.length > 0
            ? { is_paid: true, has_tickets: true, price: ticketTypes[0].price, display_currency: ticketTypes[0].currency || 'USD' }
            : formData.isPaid
            ? { is_paid: true, price: parseFloat(formData.price) || 0, display_currency: formData.displayCurrency || 'USD' }
            : { is_paid: false, display_currency: formData.displayCurrency || 'USD' }),
          detailed_description: formData.detailedDescription || null,
        },
        resellable: resellable,
        resale_scope: resellable ? resaleScope : 'none',
        default_reseller_commission_rate: resellable ? resellerCommission : null
      };

      const result = await updateEvent(event.id, eventData);
      
      if (result.success) {
        // Sync ticket types with database
        try {
          // Fetch current DB ticket types
          const { data: dbTickets } = await supabase
            .from('event_ticket_types')
            .select('id')
            .eq('event_id', event.id)
            .eq('is_active', true);

          const dbTicketIds = new Set(dbTickets?.map(t => t.id) || []);
          const formTicketIds = new Set(ticketTypes.filter(t => t.id).map(t => t.id!));

          if (enableTicketSales && ticketTypes.length > 0) {
            // Deactivate removed tickets
            const removedIds = [...dbTicketIds].filter(id => !formTicketIds.has(id));
            if (removedIds.length > 0) {
              await supabase
                .from('event_ticket_types')
                .update({ is_active: false })
                .in('id', removedIds);
            }

            // Update existing & insert new
            for (let i = 0; i < ticketTypes.length; i++) {
              const t = ticketTypes[i];
              const ticketData = {
                event_id: event.id,
                name: t.name,
                description: t.description || null,
                price: t.price,
                currency: t.currency,
                quantity_available: t.quantity,
                sale_start_date: t.saleStartDate || null,
                sale_end_date: t.saleEndDate || null,
                is_active: true,
                sort_order: i,
              };

              if (t.id && dbTicketIds.has(t.id)) {
                await supabase
                  .from('event_ticket_types')
                  .update(ticketData)
                  .eq('id', t.id);
              } else {
                await supabase
                  .from('event_ticket_types')
                  .insert(ticketData);
              }
            }
          } else {
            // Disable all ticket types if ticket sales turned off
            if (dbTicketIds.size > 0) {
              await supabase
                .from('event_ticket_types')
                .update({ is_active: false })
                .eq('event_id', event.id);
            }
          }
        } catch (syncErr) {
          console.error('Ticket type sync failed:', syncErr);
          notifyError('toasts.common.warning', 'toasts.common.eventUpdatedButTicketSyncFailed');
        }

        notify('toasts.common.meetupUpdated', 'toasts.common.yourMeetupHasSuccessfullyUpdated');
        onUpdated?.(); // Trigger parent to refetch events
        onClose();
        setErrors({});
      } else {
        notifyError('toasts.common.errorUpdatingMeetup', 'toasts.common.thereIssueUpdatingYourMeetupPlease');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-orange-600" />
            {event.event_type === 'event' ? 'Edit Event' : 'Edit Meetup'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{event.event_type === 'event' ? 'Event Details' : 'Meetup Details'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">{event.event_type === 'event' ? 'Event Title' : 'Meetup Title'} *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder={event.event_type === 'event' ? "e.g., Morning Yoga Session, Cooking Workshop" : "e.g., Weekend Hiking Adventure, Meditation Circle"}
                  className={`mt-1 ${errors.title ? 'border-destructive' : ''}`}
                />
                {errors.title && (
                  <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.title}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="description">{t('screens.common.description')}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder={event.event_type === 'event' ? "Describe your event, what attendees can expect..." : "Describe your meetup, what participants can expect..."}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="detailedDescription">{t('screens.common.detailedDescriptionOptional')}</Label>
                <Textarea
                  id="detailedDescription"
                  value={formData.detailedDescription}
                  onChange={(e) => setFormData({...formData, detailedDescription: e.target.value})}
                  placeholder="Describe the agenda, program, what's included, giveaways, sponsors..."
                  className="mt-1"
                  rows={6}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('screens.common.thisWillShownEventDetailsDrawer')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">{t('screens.common.category')}</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={t('screens.common.selectCategory')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fitness">{t('screens.common.fitnessExercise')}</SelectItem>
                      <SelectItem value="outdoor">{t('screens.common.outdoorActivities')}</SelectItem>
                      <SelectItem value="wellness">{t('screens.common.wellnessMindfulness')}</SelectItem>
                      <SelectItem value="social">{t('screens.common.socialNetworking')}</SelectItem>
                      <SelectItem value="learning">{t('screens.common.learningWorkshops')}</SelectItem>
                      <SelectItem value="support">{t('screens.common.supportCommunity')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="duration">{t('screens.common.duration')}</Label>
                  <Select value={formData.duration} onValueChange={(value) => setFormData({...formData, duration: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={t('screens.common.selectDuration')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30min">{t('screens.common.text30Minutes')}</SelectItem>
                      <SelectItem value="1hour">{t('screens.common.text1Hour')}</SelectItem>
                      <SelectItem value="2hour">{t('screens.common.text2Hours')}</SelectItem>
                      <SelectItem value="3hour">{t('screens.common.text3Hours')}</SelectItem>
                      <SelectItem value="4hour">{t('screens.common.text4Hours')}</SelectItem>
                      <SelectItem value="5hour">{t('screens.common.text5Hours')}</SelectItem>
                      <SelectItem value="6hour">{t('screens.common.text6Hours')}</SelectItem>
                      <SelectItem value="8hour">{t('screens.common.text8Hours')}</SelectItem>
                      <SelectItem value="half-day">{t('screens.common.halfDay')}</SelectItem>
                      <SelectItem value="full-day">{t('screens.common.fullDay')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>{t('screens.common.meetupImage')}</Label>
                <div className="mt-2 space-y-4">
                  <Button 
                    type="button" 
                    variant="default"
                    onClick={handleGenerateImage}
                    disabled={isGeneratingImage || !formData.title}
                    className="w-full relative"
                  >
                    {isGeneratingImage ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating with AI...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        {t('screens.common.generateImageWithAi')}
                      </>
                    )}
                  </Button>
                  
                  {generationError && (
                    <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                      <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
                      <p className="text-sm text-destructive">{generationError}</p>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">{t('screens.common.text')}</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => document.getElementById('image-upload')?.click()}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Upload New Image Manually
                    </Button>
                  </div>

                  {formData.imageUrl && (
                    <div className="border rounded p-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          {generatedImagePreview === formData.imageUrl ? "AI Generated" : "Current image"}:
                        </p>
                        {generatedImagePreview === formData.imageUrl && (
                          <Badge variant="secondary" className="gap-1">
                            <Sparkles className="w-3 h-3" />
                            AI Generated
                          </Badge>
                        )}
                      </div>
                      <img 
                        src={formData.imageUrl} 
                        alt={t('screens.common.preview')} 
                        className="w-full h-48 object-cover rounded"
                      />
                      {generatedImagePreview === formData.imageUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleGenerateImage}
                          disabled={isGeneratingImage}
                          className="w-full"
                        >
                          <RefreshCw className="w-3 h-3 mr-2" />
                          Regenerate
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Schedule & Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">{t('screens.common.date')}</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className={`mt-1 ${errors.date ? 'border-destructive' : ''}`}
                  />
                  {errors.date && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.date}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="time">{t('screens.common.time')}</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({...formData, time: e.target.value})}
                    className={`mt-1 ${errors.time ? 'border-destructive' : ''}`}
                  />
                  {errors.time && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.time}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Virtual {event.event_type === 'event' ? 'Event' : 'Meetup'}</Label>
                  <p className="text-sm text-muted-foreground">This {event.event_type === 'event' ? 'event' : 'meetup'} will be held online</p>
                </div>
                <Switch 
                  checked={formData.isVirtual}
                  onCheckedChange={(checked) => setFormData({...formData, isVirtual: checked})}
                />
              </div>

              {!formData.isVirtual && (
                <div>
                  <Label htmlFor="location">{t('screens.common.location')}</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    placeholder="e.g., Central Park, Community Center, Local Gym"
                    className={`mt-1 ${errors.location ? 'border-destructive' : ''}`}
                  />
                  {errors.location && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.location}
                    </p>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="capacity">{t('screens.common.maxParticipants')}</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                  placeholder="Leave empty for unlimited"
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Ticket Types Section - Only for Events */}
          {event.event_type === 'event' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  {t('screens.common.eventPricingTickets')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enableTicketSales">{t('screens.common.enableTicketSales')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('screens.common.setUpDifferentTicketTypesWith')}
                    </p>
                  </div>
                  <Switch
                    id="enableTicketSales"
                    checked={enableTicketSales}
                    onCheckedChange={(checked) => {
                      setEnableTicketSales(checked);
                      if (!checked) {
                        setTicketTypes([]);
                      }
                    }}
                  />
                </div>
                
                {enableTicketSales && (
                  <TicketTypeForm
                    ticketTypes={ticketTypes}
                    onChange={setTicketTypes}
                    eventDate={formData.date}
                  />
                )}

                {!enableTicketSales && (
                  <div className="space-y-3 pt-2 border-t border-border/50">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isPaid"
                        checked={formData.isPaid}
                        onChange={(e) => setFormData({...formData, isPaid: e.target.checked})}
                        className="rounded"
                      />
                      <Label htmlFor="isPaid">{t('screens.common.paidEvent')}</Label>
                    </div>

                    {formData.isPaid && (
                      <div>
                        <Label htmlFor="price">{t('screens.common.displayPrice')}</Label>
                        <div className="flex gap-2 mt-1">
                          <Select
                            value={formData.displayCurrency}
                            onValueChange={(v) => setFormData({...formData, displayCurrency: v as "USD" | "EUR"})}
                          >
                            <SelectTrigger className="w-24 shrink-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="USD">{t('screens.common.usd')}</SelectItem>
                              <SelectItem value="EUR">{t('screens.common.eur')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            id="price"
                            type="number"
                            value={formData.price}
                            onChange={(e) => setFormData({...formData, price: e.target.value})}
                            placeholder="0.00"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('screens.common.thisPriceForDisplayPurposesEnable')}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Reseller Options - Only for Events */}
          {event.event_type === 'event' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Share className="w-5 h-5 text-green-600" />
                  {t('screens.common.resellerOptions')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t('screens.common.allowResellersSellTickets')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('screens.common.letOtherResellersPromoteSellTickets')}
                    </p>
                  </div>
                  <Switch 
                    checked={resellable}
                    onCheckedChange={setResellable}
                  />
                </div>

                {resellable && (
                  <>
                    <div>
                      <Label>{t('screens.common.resaleVisibility')}</Label>
                      <Select value={resaleScope} onValueChange={(v) => setResaleScope(v as typeof resaleScope)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">{t('screens.common.publicAllResellers')}</SelectItem>
                          <SelectItem value="tenant">{t('screens.common.tenantOnly')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>{t('screens.common.defaultCommissionRate')}</Label>
                      <Input
                        type="number"
                        min="0"
                        max="50"
                        value={resellerCommission}
                        onChange={(e) => setResellerCommission(Number(e.target.value))}
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('screens.common.resellersEarnThisPercentageEachTicket')}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              {t('screens.common.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Updating..." : `Update ${event.event_type === 'event' ? 'Event' : 'Meetup'}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}