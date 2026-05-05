import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { adminLiveStreamNavigation } from "@/config/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Construction } from "lucide-react";
import { t } from '@/lib/i18n-toast';

export default function TelemedicineSessions() {
  return (
    <AppLayout>
      <SEO 
        title={t('screens.admin.telemedicineSessionsAdminVitana')} 
        description="Manage telemedicine video consultations" 
        canonical={window.location.href} 
      />
      <SubNavigation items={adminLiveStreamNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <AdminHeader
            title={t('screens.admin.telemedicineSessions')}
            description="Manage healthcare video consultations and appointments"
            emoji="🏥"
          />

          <Alert>
            <Construction className="h-4 w-4" />
            <AlertTitle>{t('screens.admin.comingSoon')}</AlertTitle>
            <AlertDescription>{t('screens.admin.telemedicineSessionManagementCurrentlyUnderDevelop')}
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('screens.admin.plannedFeatures')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>{t('screens.admin.secureVideoConsultations')}</p>
                <p>{t('screens.admin.doctorpatientScheduling')}</p>
                <p>{t('screens.admin.sessionRecordingWithConsent')}</p>
                <p>{t('screens.admin.hipaaComplianceChecks')}</p>
                <p>{t('screens.admin.appointmentReminders')}</p>
                <p>{t('screens.admin.electronicHealthRecordIntegration')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('screens.admin.technicalRequirements')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>{t('screens.admin.endtoendEncryptionForAllSessions')}</p>
                <p>{t('screens.admin.hipaacompliantDataStorage')}</p>
                <p>{t('screens.admin.multipartyVideoConferencing')}</p>
                <p>{t('screens.admin.screenSharingForMedicalRecords')}</p>
                <p>{t('screens.admin.prescriptionWritingTools')}</p>
                <p>{t('screens.admin.patientConsentManagement')}</p>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>{t('screens.admin.infrastructureStatus')}</CardTitle>
                <CardDescription>{t('screens.admin.currentReadinessForTelemedicineDeployment')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>{t('screens.admin.databaseSchema')}</span>
                    <span className="text-green-600 font-medium">{t('screens.admin.ready')}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>{t('screens.admin.videoStreamingInfrastructure')}</span>
                    <span className="text-green-600 font-medium">{t('screens.admin.ready')}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>{t('screens.admin.hipaaComplianceFramework')}</span>
                    <span className="text-yellow-600 font-medium">{t('screens.admin.progress2')}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>{t('screens.admin.ehrIntegration')}</span>
                    <span className="text-gray-400 font-medium">{t('screens.admin.planned')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
