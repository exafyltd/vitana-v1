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
import { useToast } from "@/hooks/use-toast";
import { useAutomationRules } from "@/hooks/useAutomationRules";

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
          toast({
            title: "Rate Limit Reached",
            description: "Too many requests. Please wait a moment and try again.",
            variant: "destructive",
          });
          return;
        }
        
        if (error.message?.includes('Payment required')) {
          toast({
            title: "Credits Required",
            description: "Please add credits to your Lovable AI workspace to continue.",
            variant: "destructive",
          });
          return;
        }
        
        throw error;
      }

      setAnalysis(data.analysis);
      toast({
        title: "Analysis Complete",
        description: "AI has generated automation suggestions for your situation",
      });
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze situation. Please try again.",
        variant: "destructive",
      });
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

      toast({
        title: "Automation Deployed",
        description: "The automation has been created (disabled). You can enable it from the builder.",
      });

      navigate('/admin/ai-assistant');
    } catch (error: any) {
      console.error('Deploy error:', error);
      toast({
        title: "Deployment Failed",
        description: error.message || "Failed to deploy automation",
        variant: "destructive",
      });
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <AppLayout>
      <SEO 
        title="AI Situation Analyzer | AI Assistant | Admin" 
        description="Analyze situations and get automation suggestions" 
        canonical={window.location.href} 
      />
      <SubNavigation items={adminAIAssistantNavigation} />
      
      <div className="p-6 pb-32 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-4xl mx-auto space-y-6">
          <AdminHeader
            title="AI Situation Analyzer"
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
