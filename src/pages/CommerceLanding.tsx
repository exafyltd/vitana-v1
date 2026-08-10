/**
 * Commerce Portal — merchant landing for commerce.vitanaland.com
 * (VTID-03555, CLAUDE.md §13c self-service merchant onboarding). Also
 * reachable path-based at /commerce so previews can verify it without DNS.
 */
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plug, Store, Workflow, ShieldCheck } from 'lucide-react';
import { t } from '@/lib/i18n-toast';

const STEPS = [
  { icon: Store, title: 'screens.commerceportal.step1Title', body: 'screens.commerceportal.step1Body' },
  { icon: Workflow, title: 'screens.commerceportal.step2Title', body: 'screens.commerceportal.step2Body' },
  { icon: ShieldCheck, title: 'screens.commerceportal.step3Title', body: 'screens.commerceportal.step3Body' },
] as const;

export default function CommerceLanding() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4">
      <div className="space-y-3 py-8 text-center">
        <h1 className="text-3xl font-semibold text-foreground">{t('screens.commerceportal.heroTitle')}</h1>
        <p className="mx-auto max-w-2xl text-muted-foreground">{t('screens.commerceportal.heroSubtitle')}</p>
        <div className="flex justify-center pt-2">
          <Button size="lg" onClick={() => navigate('/commerce/connections')}>
            <Plug className="mr-2 h-4 w-4" />
            {t('screens.commerceportal.cta')}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {STEPS.map(({ icon: Icon, title, body }) => (
          <Card key={title}>
            <CardContent className="space-y-2 p-4">
              <Icon className="h-6 w-6 text-primary" />
              <h2 className="font-medium text-foreground">{t(title)}</h2>
              <p className="text-sm text-muted-foreground">{t(body)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="pb-8 text-center text-xs text-muted-foreground">{t('screens.commerceportal.footNote')}</p>
    </div>
  );
}
