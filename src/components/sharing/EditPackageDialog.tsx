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
  Calendar,
  RefreshCw,
  GraduationCap,
  ImagePlus,
  X
} from "lucide-react";
import { 
  BusinessPackage, 
  PackageType, 
  PackageItem, 
  BillingInterval, 
  dollarsToCents, 
  formatCents 
} from "@/hooks/useBusinessPackages";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface EditPackageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  package_: BusinessPackage;
  onSave: (packageId: string, data: any, items: PackageItem[]) => void;
  isSaving?: boolean;
}

const PACKAGE_TYPES = [
  { value: 'bundle', label: 'Session Bundle', description: 'One-time purchase with fixed set of sessions', icon: <Package className="w-5 h-5" /> },
  { value: 'subscription', label: 'Subscription', description: 'Recurring access with monthly or annual billing', icon: <RefreshCw className="w-5 h-5" /> },
  { value: 'program', label: 'Program', description: 'Structured multi-week journey with milestones', icon: <GraduationCap className="w-5 h-5" /> },
];

const ITEM_TYPES = [
  { value: 'service', label: '1:1 Session', description: 'Individual coaching or therapy session', hasDuration: true },
  { value: 'group_session', label: 'Group Session', description: 'Group class or workshop', hasDuration: true },
  { value: 'event', label: 'Event Access', description: 'Access to a specific event', hasDuration: false },
  { value: 'course', label: 'Course Access', description: 'Digital course or learning program', hasDuration: false },
  { value: 'digital', label: 'Digital Download', description: 'Ebook, guide, or PDF resource', hasDuration: false },
  { value: 'resource', label: 'Resource Access', description: 'Library or community access', hasDuration: false },
];

function getItemPlaceholder(itemType: string): string {
  switch (itemType) {
    case 'service': return 'Session name (e.g., 60-min Coaching Session)';
    case 'group_session': return 'Group session name (e.g., Weekly Yoga Class)';
    case 'course': return 'Course name (e.g., Mindfulness Fundamentals)';
    case 'digital': return 'Download name (e.g., Wellness Guide PDF)';
    case 'resource': return 'Resource name (e.g., Member Library Access)';
    default: return 'Item name';
  }
}

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
  const [packageType, setPackageType] = useState<PackageType>('bundle');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Step 2: Items
  const [items, setItems] = useState<PackageItem[]>([]);
  
  // Step 3: Pricing & Settings
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [validityDays, setValidityDays] = useState("180");
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [durationWeeks, setDurationWeeks] = useState("");
  const [publishImmediately, setPublishImmediately] = useState(false);

  const [eventOptions, setEventOptions] = useState<EventOption[]>([]);

  // Pre-populate form with existing package data
  useEffect(() => {
    if (package_ && open) {
      setTitle(package_.title);
      setDescription(package_.description || "");
      setPackageType(package_.package_type);
      setImageUrl(package_.image_url || null);
      setPrice((package_.price_cents / 100).toString());
      setOriginalPrice(package_.original_price_cents ? (package_.original_price_cents / 100).toString() : "");
      setValidityDays(package_.validity_days?.toString() || "180");
      setBillingInterval(package_.billing_interval || 'monthly');
      setDurationWeeks(package_.duration_weeks?.toString() || "");
      setPublishImmediately(package_.status === 'published');
      
      // Transform items from DB format
      if (package_.items) {
        setItems(package_.items.map(item => ({
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
        // Bucket might not exist, try avatars bucket as fallback
        const { error: fallbackError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file);
        
        if (fallbackError) throw fallbackError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);
        setImageUrl(publicUrl);
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('package-images')
          .getPublicUrl(filePath);
        setImageUrl(publicUrl);
      }
      
      toast.success("Image uploaded");
    } catch (error) {
      console.error('Image upload failed:', error);
      toast.error("Failed to upload image");
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
        package_type: packageType,
        price_cents: dollarsToCents(parseFloat(price) || 0),
        original_price_cents: originalPrice ? dollarsToCents(parseFloat(originalPrice)) : null,
        validity_days: parseInt(validityDays) || 180,
        billing_interval: packageType === 'subscription' ? billingInterval : null,
        duration_weeks: packageType === 'program' ? parseInt(durationWeeks) || null : null,
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
            Edit Package
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
              <Label>Cover Image</Label>
              {imageUrl ? (
                <div className="relative w-full h-40 rounded-lg overflow-hidden">
                  <img src={imageUrl} alt="Package cover" className="w-full h-full object-cover" />
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

            <div className="grid gap-2">
              <Label>Package Type</Label>
              <div className="grid gap-2">
                {PACKAGE_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setPackageType(type.value as PackageType)}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border text-left transition-colors",
                      packageType === type.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className={cn(
                      "p-2 rounded-md",
                      packageType === type.value ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      {type.icon}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{type.label}</div>
                      <div className="text-sm text-muted-foreground">{type.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="title">Package Name</Label>
              <Input
                id="title"
                placeholder="e.g., 5-Session Wellness Bundle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what's included and the transformation clients can expect..."
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
              <Label>Included Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-8 border border-dashed rounded-lg">
                <Package className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground mb-3">
                  Add sessions or events to your package
                </p>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add First Item
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
                          item_duration_min: ITEM_TYPES.find(t => t.value === v)?.hasDuration ? 60 : undefined,
                        })}
                      >
                        <SelectTrigger className="w-[160px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ITEM_TYPES.map((type) => (
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
                              <SelectValue placeholder="Select an event..." />
                            </SelectTrigger>
                            <SelectContent>
                              {eventOptions.map((event) => (
                                <SelectItem key={event.id} value={event.id}>
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                    {event.title}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            placeholder="Event name"
                            value={item.item_title || ''}
                            onChange={(e) => updateItem(index, { item_title: e.target.value })}
                          />
                        )}
                      </div>
                    ) : (
                      <Input
                        placeholder={getItemPlaceholder(item.item_type)}
                        value={item.item_title || ''}
                        onChange={(e) => updateItem(index, { item_title: e.target.value })}
                      />
                    )}

                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground">Quantity</Label>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateItem(index, { quantity: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                      {(item.item_type === 'service' || item.item_type === 'group_session') && (
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground">Duration (min)</Label>
                          <Input
                            type="number"
                            min={15}
                            step={15}
                            value={item.item_duration_min || 60}
                            onChange={(e) => updateItem(index, { item_duration_min: parseInt(e.target.value) || 60 })}
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground">Value ($)</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={item.item_value_cents ? (item.item_value_cents / 100).toFixed(2) : ''}
                          onChange={(e) => updateItem(index, { item_value_cents: dollarsToCents(parseFloat(e.target.value) || 0) })}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {items.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Total item value:</span>
                <span className="font-semibold">{formatCents(totalItemValueCents)}</span>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Pricing & Settings */}
        {step === 3 && (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price" className="flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  Package Price
                </Label>
                <Input
                  id="price"
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="299.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="originalPrice" className="text-muted-foreground">
                  Original Value (optional)
                </Label>
                <Input
                  id="originalPrice"
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="375.00"
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value)}
                />
                {totalItemValueCents > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground h-auto py-1 px-2 justify-start"
                    onClick={() => setOriginalPrice((totalItemValueCents / 100).toFixed(2))}
                  >
                    Use total item value ({formatCents(totalItemValueCents)})
                  </Button>
                )}
              </div>
            </div>

            {calculateSavings() > 0 && (
              <div className="flex items-center gap-2 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span className="text-sm text-emerald-700 dark:text-emerald-400">
                  Clients save {calculateSavings()}% with this bundle!
                </span>
              </div>
            )}

            {packageType === 'subscription' && (
              <div className="grid gap-2">
                <Label>Billing Interval</Label>
                <Select value={billingInterval} onValueChange={(v) => setBillingInterval(v as BillingInterval)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {packageType === 'program' && (
              <div className="grid gap-2">
                <Label>Program Duration (weeks)</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="e.g., 8"
                  value={durationWeeks}
                  onChange={(e) => setDurationWeeks(e.target.value)}
                />
              </div>
            )}

            {packageType !== 'subscription' && (
              <div className="grid gap-2">
                <Label htmlFor="validityDays">Redemption Window (days)</Label>
                <Select value={validityDays} onValueChange={setValidityDays}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="180">6 months</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label htmlFor="publish" className="cursor-pointer">Published</Label>
                <p className="text-xs text-muted-foreground">
                  Make this package visible to clients
                </p>
              </div>
              <Switch
                id="publish"
                checked={publishImmediately}
                onCheckedChange={setPublishImmediately}
              />
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between">
          <div>
            {step > 1 && (
              <Button type="button" variant="ghost" onClick={() => setStep(step - 1)}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            {step < 3 ? (
              <Button 
                type="button" 
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
              >
                Next
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
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
