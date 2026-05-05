import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Clock, Moon } from "lucide-react";
import { notify, notifyError, t } from '@/lib/i18n-toast';

export function EngagementRules() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rules, isLoading } = useQuery({
    queryKey: ['admin-proactive-settings', 'engagement_rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_proactive_settings')
        .select('setting_value')
        .eq('setting_key', 'engagement_rules')
        .single();
      
      if (error) throw error;
      return data.setting_value as {
        max_daily_proactive: number;
        quiet_hours_start: string;
        quiet_hours_end: string;
        min_minutes_between: number;
      };
    }
  });

  const [maxDaily, setMaxDaily] = useState(5);
  const [quietStart, setQuietStart] = useState("22:00");
  const [quietEnd, setQuietEnd] = useState("08:00");
  const [minMinutes, setMinMinutes] = useState(60);

  useState(() => {
    if (rules) {
      setMaxDaily(rules.max_daily_proactive);
      setQuietStart(rules.quiet_hours_start);
      setQuietEnd(rules.quiet_hours_end);
      setMinMinutes(rules.min_minutes_between);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (newRules: typeof rules) => {
      const { error } = await supabase
        .from('admin_proactive_settings')
        .update({ 
          setting_value: newRules,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', 'engagement_rules');
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-proactive-settings'] });
      notify('toasts.admin.rulesUpdated', 'toasts.admin.engagementRulesHaveSavedSuccessfully');
    },
    onError: (error) => {
      notifyError('toasts.admin.updateFailed');
    }
  });

  const handleSave = () => {
    updateMutation.mutate({
      max_daily_proactive: maxDaily,
      quiet_hours_start: quietStart,
      quiet_hours_end: quietEnd,
      min_minutes_between: minMinutes
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
        <CardTitle>{t('screens.admin.engagementRules')}</CardTitle>
        <CardDescription>
          {t('screens.admin.configureWhenHowOftenProactiveAssistant')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="max-daily" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {t('screens.admin.maxDailyProactiveMessages')}
            </Label>
            <Input
              id="max-daily"
              type="number"
              min={1}
              max={20}
              value={maxDaily}
              onChange={(e) => setMaxDaily(parseInt(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              {t('screens.admin.maximumNumberProactiveGreetingsPerUser')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="min-minutes" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {t('screens.admin.minimumMinutesBetween')}
            </Label>
            <Input
              id="min-minutes"
              type="number"
              min={5}
              max={480}
              value={minMinutes}
              onChange={(e) => setMinMinutes(parseInt(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              {t('screens.admin.minimumTimeBetweenProactiveMessagesMinutes')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quiet-start" className="flex items-center gap-2">
              <Moon className="h-4 w-4" />
              {t('screens.admin.quietHoursStart')}
            </Label>
            <Input
              id="quiet-start"
              type="time"
              value={quietStart}
              onChange={(e) => setQuietStart(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {t('screens.admin.noProactiveMessagesAfterThisTime')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quiet-end" className="flex items-center gap-2">
              <Moon className="h-4 w-4" />
              {t('screens.admin.quietHoursEnd')}
            </Label>
            <Input
              id="quiet-end"
              type="time"
              value={quietEnd}
              onChange={(e) => setQuietEnd(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {t('screens.admin.resumeProactiveMessagesAfterThisTime')}
            </p>
          </div>
        </div>

        <Button 
          onClick={handleSave} 
          disabled={updateMutation.isPending}
          className="w-full"
        >
          {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t('screens.admin.saveEngagementRules')}
        </Button>
      </CardContent>
    </Card>
  );
}
