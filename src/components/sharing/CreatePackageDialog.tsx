import React, { useState } from "react";
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
  CalendarDays, 
  Repeat, 
  Plus, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  DollarSign,
  Sparkles
} from "lucide-react";
import { useBusinessPackages, PackageType, PackageItem, BillingInterval } from "@/hooks/useBusinessPackages";
import { cn } from "@/lib/utils";

interface CreatePackageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PACKAGE_TYPES: { value: PackageType; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'bundle',
    label: 'Session Bundle',
    description: 'One-time purchase with fixed set of sessions',
    icon: <Package className="w-5 h-5" />,
  },
  {
    value: 'subscription',
    label: 'Monthly Membership',
    description: 'Recurring access to services & events',
    icon: <Repeat className="w-5 h-5" />,
  },
  {
    value: 'program',
    label: 'Transformation Program',
    description: 'Time-bound journey with milestones',
    icon: <CalendarDays className="w-5 h-5" />,
  },
];

const ITEM_TYPES = [
  { value: 'service', label: '1:1 Session' },
  { value: 'event', label: 'Event Access' },
  { value: 'access', label: 'Membership Perk' },
  { value: 'digital_asset', label: 'Digital Content' },
];

export function CreatePackageDialog({ open, onOpenChange }: CreatePackageDialogProps) {
  const { createPackage, isCreating } = useBusinessPackages();
  const [step, setStep] = useState(1);
  
  // Step 1: Basic Info
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [packageType, setPackageType] = useState<PackageType>('bundle');
  
  // Step 2: Items
  const [items, setItems] = useState<PackageItem[]>([]);
  
  // Step 3: Pricing & Settings
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [validityDays, setValidityDays] = useState("180");
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [durationWeeks, setDurationWeeks] = useState("");
  const [publishImmediately, setPublishImmediately] = useState(false);

  const resetForm = () => {
    setStep(1);
    setTitle("");
    setDescription("");
    setPackageType('bundle');
    setItems([]);
    setPrice("");
    setOriginalPrice("");
    setValidityDays("180");
    setBillingInterval('monthly');
    setDurationWeeks("");
    setPublishImmediately(false);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const addItem = () => {
    setItems([...items, {
      item_type: 'service',
      item_title: '',
      item_description: '',
      item_duration_min: 60,
      item_value: 0,
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

  const calculateSavings = () => {
    const bundlePrice = parseFloat(price) || 0;
    const original = parseFloat(originalPrice) || 0;
    if (original > 0 && bundlePrice > 0) {
      const savings = ((original - bundlePrice) / original * 100).toFixed(0);
      return parseInt(savings);
    }
    return 0;
  };

  const handleSubmit = () => {
    createPackage({
      title,
      description,
      package_type: packageType,
      price: parseFloat(price) || 0,
      original_price: parseFloat(originalPrice) || undefined,
      validity_days: parseInt(validityDays) || 180,
      billing_interval: packageType === 'subscription' ? billingInterval : undefined,
      duration_weeks: packageType === 'program' ? parseInt(durationWeeks) || undefined : undefined,
      status: publishImmediately ? 'published' : 'draft',
      items: items.filter(item => item.item_title),
    });
    handleClose();
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
            Create Package
          </DialogTitle>
          <DialogDescription>
            {step === 1 && "Choose a package type and add basic details"}
            {step === 2 && "Add sessions, events, or perks to include"}
            {step === 3 && "Set your pricing and launch settings"}
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
            <div className="grid gap-2">
              <Label>Package Type</Label>
              <div className="grid gap-2">
                {PACKAGE_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setPackageType(type.value)}
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
                  Add sessions, events, or perks to your package
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
                        onValueChange={(v) => updateItem(index, { item_type: v as PackageItem['item_type'] })}
                      >
                        <SelectTrigger className="w-[140px]">
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

                    <Input
                      placeholder="Item name (e.g., 60-min Coaching Session)"
                      value={item.item_title || ''}
                      onChange={(e) => updateItem(index, { item_title: e.target.value })}
                    />

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
                      {item.item_type === 'service' && (
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
                          value={item.item_value || ''}
                          onChange={(e) => updateItem(index, { item_value: parseFloat(e.target.value) || 0 })}
                          placeholder="0"
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
                <span className="font-semibold">
                  ${items.reduce((sum, item) => sum + (item.item_value || 0) * item.quantity, 0).toFixed(2)}
                </span>
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
                  placeholder="299"
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
                  placeholder="375"
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value)}
                />
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
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {packageType === 'program' && (
              <div className="grid gap-2">
                <Label htmlFor="durationWeeks" className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Program Duration (weeks)
                </Label>
                <Input
                  id="durationWeeks"
                  type="number"
                  min={1}
                  placeholder="12"
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
                <p className="text-xs text-muted-foreground">
                  How long buyers have to use included items
                </p>
              </div>
            )}

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label htmlFor="publish" className="cursor-pointer">Publish immediately</Label>
                <p className="text-xs text-muted-foreground">
                  Make this package visible to clients right away
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

        <DialogFooter className="flex-row justify-between sm:justify-between">
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
              <Button type="button" onClick={() => setStep(step + 1)} disabled={!canProceed()}>
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button type="button" onClick={handleSubmit} disabled={!canProceed() || isCreating}>
                {isCreating ? "Creating..." : publishImmediately ? "Publish Package" : "Save Draft"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
