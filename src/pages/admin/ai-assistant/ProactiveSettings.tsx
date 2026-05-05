import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import SubNavigation from "@/components/SubNavigation";
import { adminAIAssistantNavigation } from "@/config/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PersonalitySettings } from "@/components/admin/proactive/PersonalitySettings";
import { EngagementRules } from "@/components/admin/proactive/EngagementRules";
import { GreetingTemplates } from "@/components/admin/proactive/GreetingTemplates";
import { EngagementAnalytics } from "@/components/admin/proactive/EngagementAnalytics";
import { Bot, Settings, MessageSquare, BarChart3 } from "lucide-react";
import { t } from '@/lib/i18n-toast';

export default function ProactiveSettings() {
  return (
    <AppLayout>
      <SEO 
        title={t('screens.admin.proactiveAssistantSettingsAiAssistantAdmin')}
        description="Configure system-wide proactive assistant behavior, personality, and engagement rules"
        canonical={window.location.href}
      />
      <SubNavigation items={adminAIAssistantNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Bot className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">{t('screens.admin.proactiveAssistantSettings')}</h1>
            </div>
            <p className="text-muted-foreground">
              Configure system-wide AI assistant behavior, personality, engagement rules, and greeting templates.
            </p>
          </div>

          <Tabs defaultValue="personality" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="personality" className="gap-2">
                <Settings className="h-4 w-4" />
                Personality
              </TabsTrigger>
              <TabsTrigger value="engagement" className="gap-2">
                <Bot className="h-4 w-4" />
                Engagement Rules
              </TabsTrigger>
              <TabsTrigger value="templates" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Templates
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="personality" className="space-y-6">
              <PersonalitySettings />
            </TabsContent>

            <TabsContent value="engagement" className="space-y-6">
              <EngagementRules />
            </TabsContent>

            <TabsContent value="templates" className="space-y-6">
              <GreetingTemplates />
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <EngagementAnalytics />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}
