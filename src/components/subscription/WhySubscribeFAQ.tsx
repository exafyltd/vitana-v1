/**
 * VTID-03107 · "Why Premium?" FAQ accordion.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { t } from '@/lib/i18n-toast';

const ITEMS = [1, 2, 3, 4];

export function WhySubscribeFAQ() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('billing.faq.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible>
          {ITEMS.map((i) => (
            <AccordionItem key={i} value={`q${i}`}>
              <AccordionTrigger className="text-sm text-left">{t(`billing.faq.q${i}`)}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                {t(`billing.faq.a${i}`)}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
