import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, FileText, AlertTriangle, Download, Calendar, Users, Shield } from "lucide-react";
import { useState } from "react";
import { t } from '@/lib/i18n-toast';

interface ViewDetailsPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const sampleLogDetails = {
  id: 1,
  timestamp: "2024-01-20 14:30:15",
  action: "Data Package Created",
  details: "Comprehensive Health Profile package created for Mayo Clinic Research",
  dataTypes: ["Lab Results", "Vital Signs", "Activity Data", "Sleep Patterns"],
  recipient: "Mayo Clinic Research Network",
  status: "completed",
  metadata: {
    packageSize: "2.4 MB",
    encryptionLevel: "AES-256",
    accessDuration: "6 months",
    dataRetention: "Study completion + 5 years",
    consentExpiry: "2024-07-20",
    sharingMethod: "Secure API transfer"
  },
  auditTrail: [
    {
      timestamp: "2024-01-20 14:30:15",
      event: "Package Created",
      user: "Patient",
      details: "Health data package assembled and encrypted"
    },
    {
      timestamp: "2024-01-20 14:30:18",
      event: "Consent Verified",  
      user: "System",
      details: "Patient consent verified and logged"
    },
    {
      timestamp: "2024-01-20 14:30:22",
      event: "Data Transferred",
      user: "System",
      details: "Secure transfer initiated to Mayo Clinic Research Network"
    },
    {
      timestamp: "2024-01-20 14:30:45",
      event: "Transfer Confirmed",
      user: "Mayo Clinic Research Network",
      details: "Successful data receipt confirmed"
    }
  ]
};

const complianceChecks = [
  { check: "HIPAA Compliance", status: "passed", details: "All HIPAA requirements met" },
  { check: "Patient Consent", status: "passed", details: "Valid consent on file" },
  { check: "Data Minimization", status: "passed", details: "Only requested data types included" },
  { check: "Encryption Standards", status: "passed", details: "AES-256 encryption applied" },
  { check: "Access Controls", status: "passed", details: "Proper access permissions verified" }
];

export function ViewDetailsPopup({ isOpen, onClose }: ViewDetailsPopupProps) {
  const [activeTab, setActiveTab] = useState("overview");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "passed":
        return "text-green-600 bg-green-50 border-green-200";
      case "revoked":
      case "failed":
        return "text-red-600 bg-red-50 border-red-200";
      case "pending":
        return "text-orange-600 bg-orange-50 border-orange-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-blue-600" />
            {t('screens.common.dataSharingActivityDetails')}
          </DialogTitle>
          <DialogDescription>
            {t('screens.common.comprehensiveViewDataSharingActivityCompliance')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overview Summary */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{sampleLogDetails.action}</CardTitle>
                <Badge className={getStatusColor(sampleLogDetails.status)}>
                  {sampleLogDetails.status}
                </Badge>
              </div>
              <CardDescription>
                {sampleLogDetails.details}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="font-medium text-muted-foreground">{t('screens.common.timestamp')}</div>
                  <div>{sampleLogDetails.timestamp}</div>
                </div>
                <div>
                  <div className="font-medium text-muted-foreground">{t('screens.common.recipient')}</div>
                  <div>{sampleLogDetails.recipient}</div>
                </div>
                <div>
                  <div className="font-medium text-muted-foreground">{t('screens.common.packageSize')}</div>
                  <div>{sampleLogDetails.metadata.packageSize}</div>
                </div>
                <div>
                  <div className="font-medium text-muted-foreground">{t('screens.common.encryption')}</div>
                  <div>{sampleLogDetails.metadata.encryptionLevel}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">{t('screens.common.overview')}</TabsTrigger>
              <TabsTrigger value="data">{t('screens.common.dataTypes')}</TabsTrigger>
              <TabsTrigger value="audit">{t('screens.common.auditTrail')}</TabsTrigger>
              <TabsTrigger value="compliance">{t('screens.common.compliance')}</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('screens.common.sharingDetails')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">{t('screens.common.accessDuration')}</div>
                      <div className="text-sm">{sampleLogDetails.metadata.accessDuration}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">{t('screens.common.dataRetention')}</div>
                      <div className="text-sm">{sampleLogDetails.metadata.dataRetention}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">{t('screens.common.consentExpiry')}</div>
                      <div className="text-sm">{sampleLogDetails.metadata.consentExpiry}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">{t('screens.common.sharingMethod')}</div>
                      <div className="text-sm">{sampleLogDetails.metadata.sharingMethod}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="data" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('screens.common.sharedDataTypes')}</CardTitle>
                  <CardDescription>
                    {t('screens.common.completeListDataTypesIncludedThis')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sampleLogDetails.dataTypes.map((type, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">{type}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">{t('screens.common.included')}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="audit" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('screens.common.auditTrail')}</CardTitle>
                  <CardDescription>
                    {t('screens.common.chronologicalRecordAllActivitiesRelatedThis')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {sampleLogDetails.auditTrail.map((entry, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                        <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-sm font-medium">{entry.event}</div>
                            <div className="text-xs text-muted-foreground">{entry.timestamp}</div>
                          </div>
                          <div className="text-xs text-muted-foreground mb-1">{t('screens.common.byUser', { user: entry.user })}</div>
                          <div className="text-sm">{entry.details}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="compliance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('screens.common.complianceVerification')}</CardTitle>
                  <CardDescription>
                    {t('screens.common.automatedComplianceChecksPerformedDuringData')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {complianceChecks.map((check, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <Shield className="h-4 w-4 text-primary" />
                          <div>
                            <div className="text-sm font-medium">{check.check}</div>
                            <div className="text-xs text-muted-foreground">{check.details}</div>
                          </div>
                        </div>
                        <Badge className={getStatusColor(check.status)}>
                          {check.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            <Button size="sm">
              <Download className="h-4 w-4 mr-2" />
              {t('screens.common.exportDetails')}
            </Button>
            <Button variant="outline" size="sm">
              <AlertTriangle className="h-4 w-4 mr-2" />
              {t('screens.common.reportIssue')}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>{t('screens.common.close')}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}