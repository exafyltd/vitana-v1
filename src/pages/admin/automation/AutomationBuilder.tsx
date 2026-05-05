import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Save, ArrowLeft } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { adminAutomationNavigation } from "@/config/navigation";
import TriggerSelector from "@/components/admin/automation/TriggerSelector";
import ConditionBuilder from "@/components/admin/automation/ConditionBuilder";
import ActionConfigurator from "@/components/admin/automation/ActionConfigurator";
import { useAutomationRules } from "@/hooks/useAutomationRules";
import { useToast } from "@/hooks/use-toast";
import { notify, notifyError } from '@/lib/i18n-toast';

export default function AutomationBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patternId = searchParams.get("patternId");
  const { toast } = useToast();
  const { createRule } = useAutomationRules();
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [trigger, setTrigger] = useState("");
  const [conditions, setConditions] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [isEnabled, setIsEnabled] = useState(true);
  const [loadingPattern, setLoadingPattern] = useState(false);

  // Load pattern data if patternId is provided
  useEffect(() => {
    if (patternId) {
      loadPatternData(patternId);
    }
  }, [patternId]);

  const loadPatternData = async (id: string) => {
    setLoadingPattern(true);
    try {
      const { data: pattern, error } = await supabase
        .from("pattern_discoveries")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (pattern) {
        setName(pattern.pattern_name);
        setDescription(pattern.pattern_description + "\n\nExpected Impact: " + pattern.expected_impact);
        
        // Set trigger from first trigger in array
        if (Array.isArray(pattern.triggers) && pattern.triggers.length > 0) {
          setTrigger(pattern.triggers[0] as string);
        }
        
        // Set conditions
        if (Array.isArray(pattern.conditions) && pattern.conditions.length > 0) {
          setConditions(pattern.conditions as any[]);
        }
        
        // Set actions
        if (Array.isArray(pattern.suggested_actions) && pattern.suggested_actions.length > 0) {
          setActions(pattern.suggested_actions as any[]);
        }

        notify('toasts.admin.patternLoaded', 'toasts.admin.automationPrefilledFromDiscoveredPattern');
      }
    } catch (error) {
      console.error("Error loading pattern:", error);
      notifyError('toasts.admin.error', 'toasts.admin.failedLoadPatternData');
    } finally {
      setLoadingPattern(false);
    }
  };

  const handleSave = async (isDraft = false) => {
    if (!name.trim()) {
      notifyError('toasts.admin.nameRequired', 'toasts.admin.pleaseEnterNameForThisAutomation');
      return;
    }

    if (!trigger) {
      notifyError('toasts.admin.triggerRequired', 'toasts.admin.pleaseSelectTriggerEvent');
      return;
    }

    if (actions.length === 0) {
      notifyError('toasts.admin.actionsRequired', 'toasts.admin.pleaseConfigureAtLeastOneAction');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        notifyError('toasts.admin.authenticationRequired', 'toasts.admin.pleaseSignCreateAutomations');
        return;
      }

      const result = await createRule.mutateAsync({
        name,
        description,
        trigger_type: trigger,
        trigger_config: {},
        conditions: conditions.length > 0 ? conditions : null,
        action_type: actions.length === 1 ? actions[0].type : "workflow",
        action_config: actions.length === 1 ? actions[0].config : { actions },
        is_active: isDraft ? false : isEnabled,
        user_id: user.id,
      });

      // If created from a pattern, mark the pattern as implemented
      if (patternId && result) {
        await supabase
          .from("pattern_discoveries")
          .update({
            status: "implemented",
            implemented_at: new Date().toISOString(),
            linked_rule_id: result.id,
          })
          .eq("id", patternId);
      }

      toast({
        title: isDraft ? "Draft Saved" : "Automation Created",
        description: `Automation rule "${name}" has been ${isDraft ? "saved as draft" : "created successfully"}`,
      });

      navigate("/admin/automation");
    } catch (error) {
      notifyError('toasts.admin.error', 'toasts.admin.failedSaveAutomationRule');
    }
  };

  return (
    <AppLayout>
      <SEO 
        title="Automation Builder | AI Assistant | Admin" 
        description="Create and configure automation rules" 
        canonical={window.location.href} 
      />
      <SubNavigation items={adminAutomationNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-5xl mx-auto space-y-6">
          <AdminHeader
            title={patternId ? "Create Automation from Pattern" : "Automation Builder"}
            description={patternId 
              ? "Building automation from discovered pattern" 
              : "Create intelligent automation rules to enhance user experience"
            }
            emoji="🤖"
            rightAction={
              <Button variant="outline" size="sm" onClick={() => navigate("/admin/ai-assistant")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Overview
              </Button>
            }
          />

          {loadingPattern && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading pattern data...
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Give your automation a name and description</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Automation Name *</Label>
                <Input 
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Welcome New Users"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this automation does..."
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Immediately</Label>
                  <p className="text-sm text-muted-foreground">
                    Automation will start running once saved
                  </p>
                </div>
                <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
              </div>
            </CardContent>
          </Card>

          <TriggerSelector value={trigger} onChange={setTrigger} />
          
          <ConditionBuilder conditions={conditions} onChange={setConditions} />
          
          <ActionConfigurator actions={actions} onChange={setActions} />

          <Separator />

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => handleSave(true)}>
              Save as Draft
            </Button>
            <Button onClick={() => handleSave(false)} disabled={createRule.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {isEnabled ? "Create & Enable" : "Create Automation"}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
