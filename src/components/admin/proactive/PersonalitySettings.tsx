import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { notify, notifyError } from '@/lib/i18n-toast';

export function PersonalitySettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-proactive-settings', 'system_personality'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_proactive_settings')
        .select('setting_value')
        .eq('setting_key', 'system_personality')
        .single();
      
      if (error) throw error;
      return data.setting_value as { tone: string; verbosity: string; empathy_level: string };
    }
  });

  const [tone, setTone] = useState<number>(50);
  const [verbosity, setVerbosity] = useState<number>(50);
  const [empathy, setEmpathy] = useState<number>(75);

  // Update local state when data loads
  useState(() => {
    if (settings) {
      const toneMap: Record<string, number> = { formal: 0, professional: 25, friendly: 50, casual: 75, playful: 100 };
      const verbosityMap: Record<string, number> = { minimal: 0, concise: 33, moderate: 66, detailed: 100 };
      const empathyMap: Record<string, number> = { low: 0, medium: 50, high: 75, very_high: 100 };
      
      setTone(toneMap[settings.tone] || 50);
      setVerbosity(verbosityMap[settings.verbosity] || 50);
      setEmpathy(empathyMap[settings.empathy_level] || 75);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (newSettings: { tone: string; verbosity: string; empathy_level: string }) => {
      const { error } = await supabase
        .from('admin_proactive_settings')
        .update({ 
          setting_value: newSettings,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', 'system_personality');
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-proactive-settings'] });
      notify('toasts.admin.settingsUpdated', 'toasts.admin.systemPersonalitySettingsHaveSavedSuccessfully');
    },
    onError: (error) => {
      notifyError('toasts.admin.updateFailed');
    }
  });

  const handleSave = () => {
    const toneValue = tone <= 12 ? 'formal' : tone <= 37 ? 'professional' : tone <= 62 ? 'friendly' : tone <= 87 ? 'casual' : 'playful';
    const verbosityValue = verbosity <= 16 ? 'minimal' : verbosity <= 50 ? 'concise' : verbosity <= 83 ? 'moderate' : 'detailed';
    const empathyValue = empathy <= 25 ? 'low' : empathy <= 62 ? 'medium' : empathy <= 87 ? 'high' : 'very_high';

    updateMutation.mutate({
      tone: toneValue,
      verbosity: verbosityValue,
      empathy_level: empathyValue
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Personality</CardTitle>
        <CardDescription>
          Configure the overall personality and communication style of the proactive assistant
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Tone</Label>
              <span className="text-sm text-muted-foreground">
                {tone <= 12 ? 'Formal' : tone <= 37 ? 'Professional' : tone <= 62 ? 'Friendly' : tone <= 87 ? 'Casual' : 'Playful'}
              </span>
            </div>
            <Slider
              value={[tone]}
              onValueChange={(value) => setTone(value[0])}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Formal</span>
              <span>Playful</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Verbosity</Label>
              <span className="text-sm text-muted-foreground">
                {verbosity <= 16 ? 'Minimal' : verbosity <= 50 ? 'Concise' : verbosity <= 83 ? 'Moderate' : 'Detailed'}
              </span>
            </div>
            <Slider
              value={[verbosity]}
              onValueChange={(value) => setVerbosity(value[0])}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Minimal</span>
              <span>Detailed</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Empathy Level</Label>
              <span className="text-sm text-muted-foreground">
                {empathy <= 25 ? 'Low' : empathy <= 62 ? 'Medium' : empathy <= 87 ? 'High' : 'Very High'}
              </span>
            </div>
            <Slider
              value={[empathy]}
              onValueChange={(value) => setEmpathy(value[0])}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Low</span>
              <span>Very High</span>
            </div>
          </div>
        </div>

        <Button 
          onClick={handleSave} 
          disabled={updateMutation.isPending}
          className="w-full"
        >
          {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Personality Settings
        </Button>
      </CardContent>
    </Card>
  );
}
