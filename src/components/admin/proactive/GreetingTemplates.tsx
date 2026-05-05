import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { notify, notifyError, t } from '@/lib/i18n-toast';

export function GreetingTemplates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['admin-proactive-settings', 'greeting_templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_proactive_settings')
        .select('setting_value')
        .eq('setting_key', 'greeting_templates')
        .single();
      
      if (error) throw error;
      return data.setting_value as {
        new_user: string;
        returning_user: string;
        experienced_user: string;
      };
    }
  });

  const [newUser, setNewUser] = useState("");
  const [returningUser, setReturningUser] = useState("");
  const [experiencedUser, setExperiencedUser] = useState("");

  useState(() => {
    if (templates) {
      setNewUser(templates.new_user);
      setReturningUser(templates.returning_user);
      setExperiencedUser(templates.experienced_user);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (newTemplates: typeof templates) => {
      const { error } = await supabase
        .from('admin_proactive_settings')
        .update({ 
          setting_value: newTemplates,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', 'greeting_templates');
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-proactive-settings'] });
      notify('toasts.admin.templatesUpdated', 'toasts.admin.greetingTemplatesHaveSavedSuccessfully');
    },
    onError: (error) => {
      notifyError('toasts.admin.updateFailed');
    }
  });

  const handleSave = () => {
    updateMutation.mutate({
      new_user: newUser,
      returning_user: returningUser,
      experienced_user: experiencedUser
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
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          {t('screens.admin.greetingTemplates')}
        </CardTitle>
        <CardDescription>{t('screens.admin.customizeBaseGreetingTemplatesForDifferent')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="new-user">{t('screens.admin.newUserTemplate')}</Label>
          <Textarea
            id="new-user"
            value={newUser}
            onChange={(e) => setNewUser(e.target.value)}
            placeholder={t('screens.admin.welcomeIMHereHelpYou')}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            {t('screens.admin.usedForUsersTheirFirstWeek')}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="returning-user">{t('screens.admin.returningUserTemplate')}</Label>
          <Textarea
            id="returning-user"
            value={returningUser}
            onChange={(e) => setReturningUser(e.target.value)}
            placeholder={t('screens.admin.greatSeeYouAgain')}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            {t('screens.admin.usedForUsersWithModerateEngagement')}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="experienced-user">{t('screens.admin.experiencedUserTemplate')}</Label>
          <Textarea
            id="experienced-user"
            value={experiencedUser}
            onChange={(e) => setExperiencedUser(e.target.value)}
            placeholder={t('screens.admin.readyExploreMore')}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            {t('screens.admin.usedForHighlyEngagedUsersWith')}
          </p>
        </div>

        <Button 
          onClick={handleSave} 
          disabled={updateMutation.isPending}
          className="w-full"
        >
          {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t('screens.admin.saveGreetingTemplates')}
        </Button>
      </CardContent>
    </Card>
  );
}
