import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { adminAIAssistantNavigation } from "@/config/navigation";
import SituationForm from "@/components/admin/automation/SituationForm";
import AnalysisResults from "@/components/admin/automation/AnalysisResults";
import { useToast } from '@/hooks/use-toast';
import { useAutomationRules } from "@/hooks/useAutomationRules";
import { notify, notifyError, t } from '@/lib/i18n-toast';

export default function AISituationAnalyzer() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createRule } = useAutomationRules();
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  const handleAnalyze = async (situation: string) => {
    setIsAnalyzing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase.functions.invoke('analyze-situation', {
        body: { situation },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        // Handle specific error types
        if (error.message?.includes('Rate limits exceeded')) {
          notifyError('toasts.admin.rateLimitReached', 'toasts.admin.tooManyRequestsPleaseWaitMoment');
          return;
        }
        
        if (error.message?.includes('Payment required')) {
          notifyError('toasts.admin.creditsRequired', 'toasts.admin.pleaseAddCreditsYourLovableAi');
          return;
        }
        
        throw error;
      }

      setAnalysis(data.analysis);
      notify('toasts.admin.analysisComplete', 'toasts.admin.aiHasGeneratedAutomationSuggestionsFor');
    } catch (error: any) {
      console.error('Analysis error:', error);
      notifyError('toasts.admin.analysisFailed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDeploy = async () => {
    if (!analysis) return;

    setIsDeploying(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const result = analysis.analysis_result;
      const primaryTrigger = result.suggestedTriggers[0];
      const primaryAction = result.suggestedActions[0];

      await createRule.mutateAsync({
        name: `Auto: ${analysis.situation_description.substring(0, 50)}...`,
        description: result.analysis,
        trigger_type: primaryTrigger,
        trigger_config: {},
        conditions: result.suggestedConditions,
        action_type: primaryAction.type,
        action_config: primaryAction.config,
        is_active: false,
        user_id: user.id,
      });

      // Update analysis status
      await supabase
        .from('ai_situation_analyses')
        .update({ status: 'deployed' })
        .eq('id', analysis.id);

      notify('toasts.admin.automationDeployed', 'toasts.admin.automationHasCreatedDisabledYouCan');

      navigate('/admin/ai-assistant');
    } catch (error: any) {
      console.error('Deploy error:', error);
      notifyError('toasts.admin.deploymentFailed');
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <AppLayout>
      <SEO 
        title={t('screens.admin.aiSituationAnalyzerAiAssistantAdmin')} 
        description="Analyze situations and get automation suggestions" 
        canonical={window.location.href} 
      />
      <SubNavigation items={adminAIAssistantNavigation} />
      
      <div className="p-6 pb-32 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-4xl mx-auto space-y-6">
          <AdminHeader
            title={t('screens.admin.aiSituationAnalyzer')}
            description="Describe scenarios and get intelligent automation suggestions"
            emoji="🧠"
          />

          {!analysis ? (
            <SituationForm onAnalyze={handleAnalyze} isAnalyzing={isAnalyzing} />
          ) : (
            <AnalysisResults 
              analysis={analysis} 
              onDeploy={handleDeploy}
              isDeploying={isDeploying}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
