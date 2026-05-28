/**
 * VTID-03107 · Privacy + trust promises (anchor section on Subscriptions screen).
 *
 * The four §O promises in a clean four-card row. Lead with this — every plan,
 * free or paid, gets these promises.
 */

import { Shield, ShieldOff, Sprout, ToggleRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { t } from '@/lib/i18n-toast';

const PROMISES = [
  { icon: Shield, key: 'owned' },
  { icon: ShieldOff, key: 'noSell' },
  { icon: Sprout, key: 'earn' },
  { icon: ToggleRight, key: 'control' },
] as const;

export function PrivacyFirstPromises() {
  return (
    <section
      aria-labelledby="privacy-first-anchor"
      className="space-y-4"
    >
      <header className="text-center space-y-1">
        <h2
          id="privacy-first-anchor"
          className="text-2xl font-semibold tracking-tight"
        >
          {t('billing.promises.anchorHeading')}
        </h2>
        <p className="text-sm text-muted-foreground">{t('billing.promises.subheading')}</p>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {PROMISES.map(({ icon: Icon, key }) => (
          <Card key={key} className="bg-muted/30">
            <CardContent className="p-4 space-y-2">
              <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
              <h3 className="font-medium text-sm">{t(`billing.promises.${key}.title`)}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t(`billing.promises.${key}.body`)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
