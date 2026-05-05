import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  Plus, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  DollarSign,
  Sparkles,
  ImagePlus,
  X
} from "lucide-react";
import { 
  BusinessPackage, 
  PackageItem, 
  dollarsToCents, 
  formatCents 
} from "@/hooks/useBusinessPackages";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { notifyError, notifySuccess, t } from '@/lib/i18n-toast';

interface EditPackageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  package_: BusinessPackage;
  onSave: (packageId: string, data: Partial<BusinessPackage>, items: PackageItem[]) => void;
  isSaving?: boolean;
}

// V1: Bundle type is fixed
const PACKAGE_TYPE_V1 = {
  value: 'bundle' as const,
  label: 'Session Bundle',
  description: 'One-time purchase with fixed set of sessions',
  icon: <Package className="w-5 h-5" />,
};

// V1: Service and Event only
const ITEM_TYPES_V1 = [
  { value: 'service', label: '1:1 Session', description: 'Individual coaching or therapy session', hasDuration: true },
  { value: 'event', label: 'Event Access', description: 'Access to a specific event', hasDuration: false },
];

interface EventOption {
  id: string;
  title: string;
  start_time?: string;
}

export function EditPackageDialog({ open, onOpenChange, package_, onSave, isSaving }: EditPackageDialogProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  
  // Step 1: Basic Info
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Step 2: Items
  const [items, setItems] = useState<PackageItem[]>([]);
  
  // Step 3: Pricing & Settings
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [validityDays, setValidityDays] = useState("180");
  const [publishImmediately, setPublishImmediately] = useState(false);

  const [eventOptions, setEventOptions] = useState<EventOption[]>([]);

  // Pre-populate form with existing package data
  useEffect(() => {
    if (package_ && open) {
      setTitle(package_.title);
      setDescription(package_.description || "");
      setImageUrl(package_.image_url || null);
      setPrice((package_.price_cents / 100).toString());
      setOriginalPrice(package_.original_price_cents ? (package_.original_price_cents / 100).toString() : "");
      setValidityDays(package_.validity_days?.toString() || "180");
      setPublishImmediately(package_.status === 'published');
      
      // Transform items from DB format - filter to V1 types only
      if (package_.items) {
        setItems(package_.items
          .filter(item => item.item_type === 'service' || item.item_type === 'event')
          .map(item => ({
            id: item.id,
            item_type: item.item_type,
            service_key: item.service_key,
            event_id: item.event_id,
            item_title: item.item_title,
            item_description: item.item_description,
            item_duration_min: item.item_duration_min,
            item_value_cents: item.item_value_cents || 0,
            quantity: item.quantity,
            sort_order: item.sort_order,
          })));
      }
      setStep(1);
    }
  }, [package_, open]);

  // Fetch user's events
  useEffect(() => {
    if (!user?.id || !open) return;

    const fetchEvents = async () => {
      const { data: events } = await supabase
        .from('global_community_events')
        .select('id, title, start_time')
        .eq('created_by', user.id)
        .order('start_time', { ascending: false })
        .limit(50);

      if (events) {
        setEventOptions(events);
      }
    };

    fetchEvents();
  }, [user?.id, open]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `packages/${user?.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('package-images')
        .upload(filePath, file);

      if (uploadError) {
        // Show clear error - no fallback to avatars bucket
        console.error('Image upload failed:', uploadError);
        notifyError('toasts.sharing.failedUploadImagePleaseEnsurePackageimages');
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('package-images')
        .getPublicUrl(filePath);
      setImageUrl(publicUrl);
      notifySuccess('toasts.sharing.imageUploaded');
    } catch (error) {
      console.error('Image upload failed:', error);
      notifyError('toasts.sharing.failedUploadImage');
    } finally {
      setUploadingImage(false);
    }
  };

  const addItem = () => {
    setItems([...items, {
      item_type: 'service',
      item_title: '',
      item_description: '',
      item_duration_min: 60,
      item_value_cents: 0,
      quantity: 1,
    }]);
  };

  const updateItem = (index: number, updates: Partial<PackageItem>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleEventSelect = (index: number, eventId: string) => {
    const event = eventOptions.find(e => e.id === eventId);
    if (event) {
      updateItem(index, {
        event_id: eventId,
        item_title: event.title,
      });
    }
  };

  const calculateSavings = () => {
    const bundlePrice = parseFloat(price) || 0;
    const original = parseFloat(originalPrice) || 0;
    if (original > 0 && bundlePrice > 0) {
      const savings = ((original - bundlePrice) / original * 100).toFixed(0);
      return parseInt(savings);
    }
    return 0;
  };

  const totalItemValueCents = items.reduce((sum, item) => sum + (item.item_value_cents || 0) * item.quantity, 0);

  const handleSubmit = () => {
    onSave(
      package_.id,
      {
        title,
        description,
        image_url: imageUrl,
        package_type: 'bundle', // V1: Always bundle
        price_cents: dollarsToCents(parseFloat(price) || 0),
        original_price_cents: originalPrice ? dollarsToCents(parseFloat(originalPrice)) : null,
        validity_days: parseInt(validityDays) || 180,
        status: publishImmediately ? 'published' : 'draft',
      },
      items.filter(item => item.item_title).map((item, index) => ({
        ...item,
        item_value_cents: item.item_value_cents || 0,
        sort_order: index,
      }))
    );
  };

  const canProceed = () => {
    if (step === 1) return title.trim().length > 0;
    if (step === 2) return items.length > 0 && items.some(i => i.item_title);
    if (step === 3) return parseFloat(price) > 0;
    return false;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            {t('screens.sharing.editPackage')}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && "Update package details and cover image"}
            {step === 2 && "Modify included items"}
            {step === 3 && "Adjust pricing and settings"}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 py-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                step === s
                  ? "bg-primary text-primary-foreground"
                  : step > s
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {s}
            </div>
          ))}
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-4 py-4">
            {/* Cover Image Upload */}
            <div className="grid gap-2">
              <Label>{t('screens.sharing.coverImage')}</Label>
              {imageUrl ? (
                <div className="relative w-full h-40 rounded-lg overflow-hidden">
                  <img src={imageUrl} alt={t('screens.sharing.packageCover')} className="w-full h-full object-cover" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={() => setImageUrl(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div 
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer"
                  onClick={() => document.getElementById('edit-package-image-upload')?.click()}
                >
                  <ImagePlus className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {uploadingImage ? "Uploading..." : "Click to upload cover image"}
                  </p>
                </div>
              )}
              <input
                type="file"
                id="edit-package-image-upload"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
                disabled={uploadingImage}
              />
            </div>

            {/* V1: Bundle type is fixed - show info badge */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="p-2 rounded-md bg-primary text-primary-foreground">
                {PACKAGE_TYPE_V1.icon}
              </div>
              <div className="flex-1">
                <div className="font-medium">{PACKAGE_TYPE_V1.label}</div>
                <div className="text-sm text-muted-foreground">{PACKAGE_TYPE_V1.description}</div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="title">{t('screens.sharing.packageName')}</Label>
              <Input
                id="title"
                placeholder={t('screens.sharing.eG5sessionWellnessBundle')}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">{t('screens.sharing.description')}</Label>
              <Textarea
                id="description"
                placeholder={t('screens.sharing.describeWhatSIncludedTransformationClients')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        )}

        {/* Step 2: Items */}
        {step === 2 && (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label>{t('screens.sharing.includedItems')}</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-1" />
                {t('screens.sharing.addItem')}
              </Button>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-8 border border-dashed rounded-lg">
                <Package className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground mb-3">
                  {t('screens.sharing.addSessionsEventsYourPackage')}
                </p>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="w-4 h-4 mr-1" />
                  {t('screens.sharing.addFirstItem')}
                </Button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {items.map((item, index) => (
                  <div key={index} className="border rounded-lg p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <Select
                        value={item.item_type}
                        onValueChange={(v) => updateItem(index, { 
                          item_type: v as PackageItem['item_type'],
                          service_key: undefined,
                          event_id: undefined,
                          item_title: '',
                          item_duration_min: ITEM_TYPES_V1.find(t => t.value === v)?.hasDuration ? 60 : undefined,
                        })}
                      >
                        <SelectTrigger className="w-[160px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ITEM_TYPES_V1.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {item.item_type === 'event' ? (
                      <div className="space-y-2">
                        {eventOptions.length > 0 ? (
                          <Select
                            value={item.event_id || ''}
                            onValueChange={(v) => handleEventSelect(index, v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('screens.sharing.selectEvent')} />
                            </SelectTrigger>
                            <SelectContent>
                              {eventOptions.map((event) => (
                                <SelectItem key={event.id} value={event.id}>
                                  {event.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
                            {t('screens.sharing.noEventsFoundCreateEventFirst')}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Service - manual entry in V1 */
                      <div className="space-y-2">
                        <Input
                          placeholder={t('screens.sharing.sessionNameEG60minCoaching')}
                          value={item.item_title || ''}
                          onChange={(e) => updateItem(index, { item_title: e.target.value })}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">{t('screens.sharing.durationMin')}</Label>
                            <Input
                              type="number"
                              value={item.item_duration_min || ''}
                              onChange={(e) => updateItem(index, { item_duration_min: parseInt(e.target.value) || undefined })}
                              placeholder="60"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">{t('screens.sharing.value')}</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.item_value_cents ? (item.item_value_cents / 100).toFixed(2) : ''}
                              onChange={(e) => updateItem(index, { item_value_cents: dollarsToCents(parseFloat(e.target.value) || 0) })}
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Quantity */}
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">{t('screens.sharing.quantity')}</Label>
                      <Input
                        type="number"
                        min="1"
                        className="w-20 h-8"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, { quantity: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {totalItemValueCents > 0 && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('screens.sharing.totalIndividualValue')}</span>
                  <span className="font-medium">{formatCents(totalItemValueCents)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Pricing */}
        {step === 3 && (
          <div className="space-y-4 py-4">
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="price">{t('screens.sharing.bundlePrice')}</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      className="pl-9"
                      placeholder="0.00"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="originalPrice">{t('screens.sharing.originalValue')}</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="originalPrice"
                      type="number"
                      step="0.01"
                      className="pl-9"
                      placeholder="0.00"
                      value={originalPrice}
                      onChange={(e) => setOriginalPrice(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {calculateSavings() > 0 && (
                <Badge variant="secondary" className="w-fit">
                  <Sparkles className="w-3 h-3 mr-1" />{t('screens.sharing.value0Savings', { value0: calculateSavings() })}
                </Badge>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="validity">{t('screens.sharing.validityPeriodDays')}</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="validity"
                  type="number"
                  className="pl-9"
                  value={validityDays}
                  onChange={(e) => setValidityDays(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t('screens.sharing.howLongBuyerHasRedeemAll')}
              </p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <Label htmlFor="publish">{t('screens.sharing.publishImmediately')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('screens.sharing.makeAvailableForPurchaseRightAway')}
                </p>
              </div>
              <Switch
                id="publish"
                checked={publishImmediately}
                onCheckedChange={setPublishImmediately}
              />
            </div>

            {/* Summary */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <h4 className="font-medium">{t('screens.sharing.packageSummary')}</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('screens.sharing.items')}</span>
                  <span>{items.filter(i => i.item_title).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('screens.sharing.bundlePrice2')}</span>
                  <span className="font-medium">{formatCents(dollarsToCents(parseFloat(price) || 0))}</span>
                </div>
                {parseFloat(originalPrice) > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>{t('screens.sharing.savings')}</span>
                    <span>{formatCents(dollarsToCents(parseFloat(originalPrice) - parseFloat(price)))}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(step - 1)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              {t('screens.sharing.back')}
            </Button>
          )}
          
          {step < 3 ? (
            <Button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
            >
              {t('screens.sharing.next')}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!canProceed() || isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}