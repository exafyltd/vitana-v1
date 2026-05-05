import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, CheckCircle, AlertCircle, XCircle, Eye, Lock, Users, Database } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface PrivacyAuditPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivacyAuditPopup({ isOpen, onClose }: PrivacyAuditPopupProps) {
  const handleFixIssue = (issueId: string) => {
    // Fix privacy issue logic
    console.log('Fixing issue:', issueId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            Privacy Audit Report
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Overall Score */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Privacy Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-2">
                    <span>{t('screens.common.overallPrivacyHealth')}</span>
                    <span className="font-medium">7/10</span>
                  </div>
                  <Progress value={70} className="h-3" />
                </div>
                <Badge className="bg-green-500 text-white">Good</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                Your privacy settings are mostly secure, but there are a few areas for improvement.
              </p>
            </CardContent>
          </Card>

          {/* Issues Found */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                Issues Found (2)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-orange-50 rounded-lg">
                <XCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-orange-900">{t('screens.common.publicProfileVisibility')}</h4>
                  <p className="text-sm text-orange-800 mb-3">
                    Your profile is currently visible to all users. Consider limiting visibility to friends only.
                  </p>
                  <Button size="sm" onClick={() => handleFixIssue('profile-visibility')}>
                    Fix Now
                  </Button>
                </div>
                <Badge variant="outline" className="text-orange-600 border-orange-600">
                  Medium Risk
                </Badge>
              </div>

              <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-yellow-900">{t('screens.common.locationDataSharing')}</h4>
                  <p className="text-sm text-yellow-800 mb-3">
                    Location data is being shared with third-party services. Review sharing settings.
                  </p>
                  <Button size="sm" variant="outline" onClick={() => handleFixIssue('location-sharing')}>
                    Review Settings
                  </Button>
                </div>
                <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                  Low Risk
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Privacy Categories */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Eye className="w-4 h-4" />
                  Profile Visibility
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant="outline" className="text-orange-600 border-orange-600">
                    Needs Review
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lock className="w-4 h-4" />
                  Data Encryption
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge className="bg-green-500 text-white">Secure</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="w-4 h-4" />
                  Sharing Permissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge className="bg-green-500 text-white">Protected</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Database className="w-4 h-4" />
                  Data Collection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                    Review Needed
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-blue-500" />
                Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                <p className="text-sm">{t('screens.common.enableTwofactorAuthenticationForAddedSecurity')}</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                <p className="text-sm">{t('screens.common.reviewUpdateYourConnectedAppsPermissions')}</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                <p className="text-sm">{t('screens.common.considerUsingVpnForAdditionalPrivacy')}</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 pt-6">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Close Report
            </Button>
            <Button className="flex-1">
              <Shield className="w-4 h-4 mr-2" />
              Apply All Fixes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}