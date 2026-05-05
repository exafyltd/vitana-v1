import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Ticket, Upload, AlertCircle, Clock } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface NewTicketPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewTicketPopup({ isOpen, onClose }: NewTicketPopupProps) {
  const [formData, setFormData] = useState({
    subject: "",
    category: "",
    priority: "",
    description: "",
    attachScreenshot: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Submit ticket logic
    console.log('Submitting ticket:', formData);
    onClose();
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-blue-500" />
            {t('screens.common.createSupportTicket')}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Response Time Notice */}
          <Card className="bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">{t('screens.common.expectedResponseTime')}</h4>
                  <p className="text-sm text-blue-800">
                    {t('screens.common.weTypicallyRespondWithin24Hours')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="subject">{t('screens.common.subject')}</Label>
              <Input
                id="subject"
                placeholder={t('screens.common.briefDescriptionYourIssue')}
                value={formData.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">{t('screens.common.category')}</Label>
                <Select onValueChange={(value) => handleInputChange('category', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('screens.common.selectCategory')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="account">{t('screens.common.accountBilling')}</SelectItem>
                    <SelectItem value="technical">{t('screens.common.technicalIssue')}</SelectItem>
                    <SelectItem value="feature">{t('screens.common.featureRequest')}</SelectItem>
                    <SelectItem value="privacy">{t('screens.common.privacySecurity')}</SelectItem>
                    <SelectItem value="integrations">{t('screens.common.appIntegrations')}</SelectItem>
                    <SelectItem value="other">{t('screens.common.other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority">{t('screens.common.priority')}</Label>
                <Select onValueChange={(value) => handleInputChange('priority', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('screens.common.selectPriority')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-green-600 border-green-600">{t('screens.common.low')}</Badge>
                        <span>{t('screens.common.generalQuestion')}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-yellow-600 border-yellow-600">{t('screens.common.medium')}</Badge>
                        <span>{t('screens.common.featureNotWorking')}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="high">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-orange-600 border-orange-600">{t('screens.common.high')}</Badge>
                        <span>{t('screens.common.blockingMyUsage')}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="urgent">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-red-600 border-red-600">{t('screens.common.urgent')}</Badge>
                        <span>{t('screens.common.criticalIssue')}</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">{t('screens.common.description')}</Label>
              <Textarea
                id="description"
                placeholder={t('screens.common.pleaseDescribeYourIssueDetailInclude')}
                className="min-h-32"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                required
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="screenshot"
                  checked={formData.attachScreenshot}
                  onCheckedChange={(checked) => handleInputChange('attachScreenshot', checked as boolean)}
                />
                <Label htmlFor="screenshot" className="text-sm cursor-pointer">
                  {t('screens.common.attachScreenshotCurrentPageHelpsUs')}
                </Label>
              </div>

              <Button type="button" variant="outline" className="w-full">
                <Upload className="w-4 h-4 mr-2" />
                {t('screens.common.uploadAdditionalFiles')}
              </Button>
            </div>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertCircle className="w-4 h-4" />
                {t('screens.common.beforeSubmittingHaveYouTried')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox id="tried-refresh" />
                <Label htmlFor="tried-refresh" className="text-sm cursor-pointer">
                  {t('screens.common.refreshingPageRestartingApp')}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="tried-help" />
                <Label htmlFor="tried-help" className="text-sm cursor-pointer">
                  {t('screens.common.checkingHelpDocumentation')}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="tried-different" />
                <Label htmlFor="tried-different" className="text-sm cursor-pointer">
                  {t('screens.common.usingDifferentBrowserDevice')}
                </Label>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 pt-6">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              {t('screens.common.cancel')}
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={!formData.subject || !formData.description || !formData.category}
            >
              <Ticket className="w-4 h-4 mr-2" />
              {t('screens.common.submitTicket')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}