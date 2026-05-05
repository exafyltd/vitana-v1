import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock, MapPin, CreditCard, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { notify, notifyError } from '@/lib/i18n-toast';

interface LabTest {
  id: string;
  name: string;
  description: string;
  category: string;
  biomarkers: string[];
  price: number;
  turnaround_days: number;
  sample_type: string;
  provider_name: string;
}

interface LabTestOrderPopupProps {
  isOpen: boolean;
  onClose: () => void;
  labTest: LabTest | null;
}

export default function LabTestOrderPopup({ isOpen, onClose, labTest }: LabTestOrderPopupProps) {
  const { toast } = useToast();
  const [collectionMethod, setCollectionMethod] = useState<'home_kit' | 'lab_facility'>('home_kit');
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [facilityAddress, setFacilityAddress] = useState('');
  const [shippingAddress, setShippingAddress] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US'
  });
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!labTest) return;

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        notifyError('toasts.common.authenticationRequired', 'toasts.common.pleaseSignPlaceOrder');
        return;
      }

      const orderData = {
        user_id: user.id,
        lab_test_id: labTest.id,
        collection_method: collectionMethod,
        total_amount: labTest.price,
        scheduled_date: scheduledDate?.toISOString(),
        facility_address: collectionMethod === 'lab_facility' ? facilityAddress : null,
        shipping_address: collectionMethod === 'home_kit' ? shippingAddress : null,
        special_instructions: specialInstructions || null,
      };

      const { error } = await supabase
        .from('lab_test_orders')
        .insert([orderData]);

      if (error) throw error;

      notify('toasts.common.orderPlacedSuccessfully');

      onClose();
    } catch (error: any) {
      notifyError('toasts.common.orderFailed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!labTest) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Order Lab Test</DialogTitle>
          <DialogDescription>
            Complete your order for {labTest.name}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium">{labTest.name}</h4>
                  <p className="text-sm text-muted-foreground">{labTest.description}</p>
                  <Badge variant="secondary" className="mt-2">
                    {labTest.provider_name}
                  </Badge>
                </div>
                
                <Separator />
                
                <div>
                  <h5 className="font-medium mb-2">Biomarkers Tested:</h5>
                  <div className="flex flex-wrap gap-1">
                    {labTest.biomarkers.map((biomarker, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {biomarker}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Sample Type:</span>
                    <span className="font-medium">{labTest.sample_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Results Time:</span>
                    <span className="font-medium">{labTest.turnaround_days} days</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>${labTest.price.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Collection Method */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Collection Method</CardTitle>
                  <CardDescription>Choose how you'd like to collect your sample</CardDescription>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={collectionMethod} onValueChange={(value: any) => setCollectionMethod(value)}>
                    <div className="flex items-center space-x-2 p-4 border rounded-lg">
                      <RadioGroupItem value="home_kit" id="home_kit" />
                      <Label htmlFor="home_kit" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <div>
                            <div className="font-medium">Home Collection Kit</div>
                            <div className="text-sm text-muted-foreground">Kit shipped to your address</div>
                          </div>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-4 border rounded-lg">
                      <RadioGroupItem value="lab_facility" id="lab_facility" />
                      <Label htmlFor="lab_facility" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <div>
                            <div className="font-medium">Lab Facility Visit</div>
                            <div className="text-sm text-muted-foreground">Visit a nearby lab location</div>
                          </div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              {/* Collection Details */}
              {collectionMethod === 'home_kit' ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Shipping Address</CardTitle>
                    <CardDescription>Where should we send your collection kit?</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="street">Street Address</Label>
                      <Input
                        id="street"
                        value={shippingAddress.street}
                        onChange={(e) => setShippingAddress(prev => ({ ...prev, street: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          value={shippingAddress.city}
                          onChange={(e) => setShippingAddress(prev => ({ ...prev, city: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="state">State</Label>
                        <Input
                          id="state"
                          value={shippingAddress.state}
                          onChange={(e) => setShippingAddress(prev => ({ ...prev, state: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="zipCode">ZIP Code</Label>
                      <Input
                        id="zipCode"
                        value={shippingAddress.zipCode}
                        onChange={(e) => setShippingAddress(prev => ({ ...prev, zipCode: e.target.value }))}
                        required
                      />
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Lab Appointment</CardTitle>
                    <CardDescription>Schedule your lab visit</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="date">Preferred Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !scheduledDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {scheduledDate ? format(scheduledDate, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={scheduledDate}
                            onSelect={setScheduledDate}
                            disabled={(date) => date < new Date()}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label htmlFor="facility">Preferred Lab Location</Label>
                      <Input
                        id="facility"
                        placeholder="Enter lab facility address or name"
                        value={facilityAddress}
                        onChange={(e) => setFacilityAddress(e.target.value)}
                        required
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Special Instructions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Special Instructions</CardTitle>
                  <CardDescription>Any additional notes or requirements</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Enter any special instructions, medical conditions, or requirements..."
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    rows={3}
                  />
                </CardContent>
              </Card>

              {/* Submit Button */}
              <div className="flex gap-4">
                <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Place Order - ${labTest.price.toFixed(2)}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}