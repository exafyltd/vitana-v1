import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { adminLiveStreamNavigation } from "@/config/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Construction } from "lucide-react";

export default function TelemedicineSessions() {
  return (
    <AppLayout>
      <SEO 
        title="Telemedicine Sessions | Admin | VITANA" 
        description="Manage telemedicine video consultations" 
        canonical={window.location.href} 
      />
      <SubNavigation items={adminLiveStreamNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <AdminHeader
            title="Telemedicine Sessions"
            description="Manage healthcare video consultations and appointments"
            emoji="🏥"
          />

          <Alert>
            <Construction className="h-4 w-4" />
            <AlertTitle>Coming Soon</AlertTitle>
            <AlertDescription>
              Telemedicine session management is currently under development. 
              This feature will enable healthcare providers to conduct secure video consultations with patients.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Planned Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>✅ Secure video consultations</p>
                <p>✅ Doctor-patient scheduling</p>
                <p>✅ Session recording with consent</p>
                <p>✅ HIPAA compliance checks</p>
                <p>✅ Appointment reminders</p>
                <p>✅ Electronic health record integration</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Technical Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>• End-to-end encryption for all sessions</p>
                <p>• HIPAA-compliant data storage</p>
                <p>• Multi-party video conferencing</p>
                <p>• Screen sharing for medical records</p>
                <p>• Prescription writing tools</p>
                <p>• Patient consent management</p>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Infrastructure Status</CardTitle>
                <CardDescription>Current readiness for telemedicine deployment</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Database schema</span>
                    <span className="text-green-600 font-medium">✓ Ready</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Video streaming infrastructure</span>
                    <span className="text-green-600 font-medium">✓ Ready</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>HIPAA compliance framework</span>
                    <span className="text-yellow-600 font-medium">⚠ In Progress</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>EHR integration</span>
                    <span className="text-gray-400 font-medium">○ Planned</span>
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
