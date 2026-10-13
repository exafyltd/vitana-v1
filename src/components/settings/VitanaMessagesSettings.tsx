/**
 * VTID-05100 (Companion Messages, Phase 2) — "Vitana messages" settings.
 *
 * Lets the member switch Vitana's proactive personal Messenger messages on or
 * off and choose their topics. Business is an explicit opt-in (off by default
 * on the gateway). Self-contained so both Settings › Notifications (desktop)
 * and the mobile Settings notifications section only drop it in.
 */
import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { notify, notifyError, t } from '@/lib/i18n-toast';
import { useCompanionPreferences, type CompanionPreferences } from '@/hooks/useCompanionPreferences';

type PrefKey = keyof CompanionPreferences;

const TOPICS: { key: Exclude<PrefKey, 'enabled'>; label: string; desc: string }[] = [
  { key: 'topic_health', label: 'screens.settings.vitanaMessages.health', desc: 'screens.settings.vitanaMessages.healthDesc' },
  { key: 'topic_community', label: 'screens.settings.vitanaMessages.community', desc: 'screens.settings.vitanaMessages.communityDesc' },
  { key: 'topic_business', label: 'screens.settings.vitanaMessages.business', desc: 'screens.settings.vitanaMessages.businessDesc' },
];

export function VitanaMessagesSettings({ className }: { className?: string }) {
  const { preferences, isLoading, isError, isSaving, update } = useCompanionPreferences();
  const ready = !!preferences && !isError;

  const handleToggle = async (key: PrefKey, value: boolean) => {
    try {
      await update({ [key]: value });
      notify('toasts.settings.settingsUpdated2');
    } catch {
      notifyError('toasts.settings.error', 'toasts.settings.failedUpdateSettings');
    }
  };

  return (
    <Card className={className} data-testid="vitana-messages-settings">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          {t('screens.settings.vitanaMessages.title')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t('screens.settings.vitanaMessages.desc')}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {isError && (
          <p className="text-sm text-destructive" role="alert">
            {t('screens.settings.vitanaMessages.loadError')}
          </p>
        )}

        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h4 className="font-medium">{t('screens.settings.vitanaMessages.enabled')}</h4>
            <p className="text-sm text-muted-foreground">{t('screens.settings.vitanaMessages.enabledDesc')}</p>
          </div>
          <Switch
            checked={!!preferences?.enabled}
            disabled={!ready || isLoading || isSaving}
            onCheckedChange={(v) => handleToggle('enabled', v)}
            aria-label={t('screens.settings.vitanaMessages.enabled')}
            data-testid="vitana-messages-enabled"
          />
        </div>

        <div className={cn('space-y-4 border-t pt-4', !preferences?.enabled && 'opacity-60')}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('screens.settings.vitanaMessages.topics')}
          </p>
          {TOPICS.map((topic) => (
            <div key={topic.key} className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h4 className="font-medium">{t(topic.label)}</h4>
                <p className="text-sm text-muted-foreground">{t(topic.desc)}</p>
              </div>
              <Switch
                checked={!!preferences?.[topic.key]}
                disabled={!ready || isLoading || isSaving || !preferences?.enabled}
                onCheckedChange={(v) => handleToggle(topic.key, v)}
                aria-label={t(topic.label)}
                data-testid={`vitana-messages-${topic.key}`}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default VitanaMessagesSettings;
