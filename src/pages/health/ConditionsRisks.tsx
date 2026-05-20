import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { healthNavigation } from "@/config/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, FileText, Shield } from "lucide-react";
import { t } from '@/lib/i18n-toast';

const conditionsItems = [
  { titleKey: "screens.health.riskAssessments", descriptionKey: "screens.health.conditionsSubtitle_riskTools", icon: AlertTriangle, color: "from-orange-500/20 to-amber-500/20" },
  { titleKey: "screens.health.conditionsTitle_preventivePlans", descriptionKey: "screens.health.conditionsSubtitle_preventivePlans", icon: FileText, color: "from-green-500/20 to-emerald-500/20" },
];

export default function ConditionsRisks() {
  return (
    <AppLayout>
      <SEO title={t('screens.health.conditionsRisksHealth')} description="Assess health risks and create preventive action plans" canonical={window.location.href} />
      <SubNavigation items={healthNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader 
            title={t('screens.health.takeControlYourHealthRisks')}
            description="Assess your health risks and create preventive action plans to maintain optimal wellness."
            emoji="⚠️"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {conditionsItems.map((item) => (
              <Card key={item.titleKey} className="cursor-pointer hover:shadow-lg transition-all duration-200 bg-white/80 backdrop-blur-sm border-white/20 hover:scale-105">
                <CardHeader className="pb-4">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center mb-4`}>
                    <item.icon className="w-6 h-6 text-foreground" />
                  </div>
                  <CardTitle className="text-lg">{t(item.titleKey)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {t(item.descriptionKey)}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}