import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Zap, TrendingUp, Activity, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { adminAIAssistantNavigation } from "@/config/navigation";
import { AdminStatsCard } from "@/components/admin/AdminStatsCard";
import { t } from '@/lib/i18n-toast';

export default function AIAssistantOverview() {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <SEO 
        title={t('screens.admin.aiAssistantAdminVitana')} 
        description="Intelligent automation and AI-powered system management" 
        canonical={window.location.href} 
      />
      <SubNavigation items={adminAIAssistantNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <AdminHeader
            title={t('screens.admin.aiAssistant')}
            description="Intelligent automation engine powered by AI for proactive user engagement"
            emoji="🤖"
          />

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <AdminStatsCard
              title={t('screens.admin.activeAutomations')}
              value={0}
              subtitle="Ready to scale to 5000+"
              icon={Zap}
            />

            <AdminStatsCard
              title={t('screens.admin.aiRecommendations')}
              value={0}
              subtitle="Waiting for deployment"
              icon={Bot}
              variant="success"
            />

            <AdminStatsCard
              title={t('screens.admin.patternDiscoveries')}
              value={0}
              subtitle="Behavioral insights found"
              icon={TrendingUp}
            />

            <AdminStatsCard
              title={t('screens.admin.autopilotActions')}
              value={0}
              subtitle="Sent to users today"
              icon={Sparkles}
            />
          </div>

          {/* Quick Access Cards */}
          <div>
            <h2 className="text-lg font-semibold mb-4">{t('screens.admin.getStarted')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <Card 
                className="hover:shadow-lg transition-shadow cursor-pointer" 
                onClick={() => navigate('/admin/ai-assistant/ai-analyzer')}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Bot className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{t('screens.admin.aiSituationAnalyzer')}</CardTitle>
                      <CardDescription>{t('screens.admin.letAiSuggestAutomations')}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Describe any situation and AI will analyze it, then suggest 
                    specific automations with confidence scores.
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="hover:shadow-lg transition-shadow cursor-pointer" 
                onClick={() => navigate('/admin/ai-assistant/pattern-discovery')}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{t('screens.admin.patternDiscovery')}</CardTitle>
                      <CardDescription>{t('screens.admin.aidiscoveredOpportunities')}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    View behavioral patterns automatically discovered by AI from 
                    user data and system analytics.
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="hover:shadow-lg transition-shadow cursor-pointer" 
                onClick={() => navigate('/admin/ai-assistant/analytics')}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                      <Activity className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{t('screens.admin.analyticsPerformance')}</CardTitle>
                      <CardDescription>{t('screens.admin.trackAutomationEffectiveness')}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Monitor execution rates, success metrics, and user engagement 
                    for all automations and AI actions.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* System Architecture Info */}
          <Card>
            <CardHeader>
              <CardTitle>{t('screens.admin.systemArchitecture')}</CardTitle>
              <CardDescription>{t('screens.admin.howAiAssistantWorks')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    <h4 className="font-semibold">{t('screens.admin.automationEngine')}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Trigger-based system that executes actions based on user events, 
                    schedules, and conditions.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <h4 className="font-semibold">{t('screens.admin.aiAnalyzer')}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Uses Lovable AI to understand situations and generate 
                    intelligent automation recommendations.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <h4 className="font-semibold">{t('screens.admin.autopilotIntegration')}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('screens.admin.connectsAutomationsUserfacingProactiveActionsFor')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
