import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Search, Filter, DollarSign, Calendar, MapPin, Clock, Users, Target, TrendingUp } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface BusinessFiltersPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BusinessFiltersPopup({ isOpen, onClose }: BusinessFiltersPopupProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center pb-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-500 to-blue-600 flex items-center justify-center">
            <Filter className="w-8 h-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold">{t('screens.common.businessHubFilters')}</DialogTitle>
          <p className="text-muted-foreground">{t('screens.common.customizeYourBusinessManagementViewWith')}</p>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-6">
          {/* Service Categories */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="w-5 h-5" />
                Service Types
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {['Yoga Classes', 'Nutrition Coaching', 'Fitness Training', 'Wellness Workshops', 'Mental Health Support', 'Group Sessions'].map((service) => (
                <div key={service} className="flex items-center space-x-2">
                  <Checkbox id={service} />
                  <Label htmlFor={service} className="text-sm">{service}</Label>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Business Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="w-5 h-5" />
                Performance Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">{t('screens.common.revenueRangeMonthly')}</Label>
                <div className="px-2">
                  <Slider defaultValue={[500]} max={5000} step={100} className="w-full" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>$0</span>
                    <span>$5,000+</span>
                  </div>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium mb-2 block">{t('screens.common.clientCount')}</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder={t('screens.common.selectRange')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-10">{t('screens.common.text110Clients')}</SelectItem>
                    <SelectItem value="11-50">{t('screens.common.text1150Clients')}</SelectItem>
                    <SelectItem value="51-100">{t('screens.common.text51100Clients')}</SelectItem>
                    <SelectItem value="100+">{t('screens.common.text100Clients')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">{t('screens.common.ratingFilter')}</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder={t('screens.common.minimumRating')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4.5+">{t('screens.common.text45Stars')}</SelectItem>
                    <SelectItem value="4.0+">{t('screens.common.text40Stars')}</SelectItem>
                    <SelectItem value="3.5+">{t('screens.common.text35Stars')}</SelectItem>
                    <SelectItem value="any">{t('screens.common.anyRating')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Operational Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="w-5 h-5" />
                Operations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">{t('screens.common.serviceStatus')}</Label>
                <div className="space-y-2">
                  {['Active', 'Scheduled', 'Completed', 'Cancelled'].map((status) => (
                    <div key={status} className="flex items-center space-x-2">
                      <Checkbox id={status} />
                      <Label htmlFor={status} className="text-sm">{status}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">{t('screens.common.deliveryMethod')}</Label>
                <div className="space-y-2">
                  {['In-Person', 'Virtual', 'Hybrid'].map((method) => (
                    <div key={method} className="flex items-center space-x-2">
                      <Checkbox id={method} />
                      <Label htmlFor={method} className="text-sm">{method}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">{t('screens.common.timePeriod')}</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder={t('screens.common.selectPeriod')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">{t('screens.common.thisWeek')}</SelectItem>
                    <SelectItem value="month">{t('screens.common.thisMonth')}</SelectItem>
                    <SelectItem value="quarter">{t('screens.common.thisQuarter')}</SelectItem>
                    <SelectItem value="year">{t('screens.common.thisYear')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Advanced Search */}
        <div className="py-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Search className="w-5 h-5" />
                Advanced Search
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">{t('screens.common.clientNameService')}</Label>
                <Input placeholder={t('screens.common.searchByClientNameServiceTitle')} />
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">{t('screens.common.locationvenue')}</Label>
                <Input placeholder={t('screens.common.searchByLocationVenue')} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Clear Filters
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onClose}>
              Apply Filters
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}