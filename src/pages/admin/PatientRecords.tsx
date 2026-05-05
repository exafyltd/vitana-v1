import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, FileText, Clock, Shield, Eye } from "lucide-react";
import { adminClinicalNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { t } from '@/lib/i18n-toast';

const mockPatients = [
  { id: "1", name: "Sarah Johnson", dob: "1985-03-15", lastVisit: "2024-12-10", recordCount: 12 },
  { id: "2", name: "Mike Chen", dob: "1990-07-22", lastVisit: "2024-12-08", recordCount: 8 },
  { id: "3", name: "Lisa Park", dob: "1988-11-03", lastVisit: "2024-12-05", recordCount: 15 }
];

function PatientRecords() {
  return (
    <AppLayout>
      <SEO title={t('screens.admin.patientRecordsAdmin')} description="View and manage patient medical records" canonical={window.location.href} />
      <SubNavigation items={adminClinicalNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <AdminHeader
            title={t('screens.admin.patientRecordViewer')}
            description="Secure access to patient medical records and health data"
            emoji="📋"
          />

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">1,247</p>
                    <p className="text-sm text-muted-foreground">{t('screens.admin.totalRecords')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">156</p>
                    <p className="text-sm text-muted-foreground">{t('screens.admin.recentUpdates')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Shield className="w-8 h-8 text-purple-500" />
                  <div>
                    <p className="text-2xl font-bold">100%</p>
                    <p className="text-sm text-muted-foreground">{t('screens.admin.hipaaCompliant')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Eye className="w-8 h-8 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold">43</p>
                    <p className="text-sm text-muted-foreground">{t('screens.admin.viewsToday')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="search" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="search">{t('screens.admin.patientSearch')}</TabsTrigger>
              <TabsTrigger value="recent">{t('screens.admin.recentRecords')}</TabsTrigger>
              <TabsTrigger value="audit">{t('screens.admin.accessAudit')}</TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('screens.admin.searchPatientRecords')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input placeholder={t('screens.admin.searchByNameDobPatientId')} className="flex-1" />
                    <Button>
                      <Search className="w-4 h-4 mr-2" />
                      {t('screens.admin.search')}
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {mockPatients.map((patient) => (
                      <div key={patient.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{patient.name}</p>
                          <p className="text-sm text-muted-foreground">DOB: {patient.dob} • Last Visit: {patient.lastVisit}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{t('screens.admin.recordcountRecords', { recordCount: patient.recordCount })}</span>
                          <Button size="sm" variant="outline">{t('screens.admin.viewRecords')}</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recent" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('screens.admin.recentlyAccessedRecords')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{t('screens.admin.recentlyViewedPatientRecordsForQuick')}</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="audit" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('screens.admin.accessAuditLog')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{t('screens.admin.hipaacompliantAccessLogsAuditTrail')}</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}

export default withScreenId(PatientRecords, SCREEN_IDS.ADMIN_PATIENT_RECORDS);