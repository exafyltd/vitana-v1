/**
 * VTID-03989 — the mobile entry point into the Commerce Partner journey.
 *
 * A member of a partner org gets a "My business" drawer item; someone who has
 * not registered a business yet has nothing to gate that on, and an
 * always-visible drawer row for the few who ever will is noise for everyone
 * else. Business Hub is already in every drawer, so the on-ramp lives here.
 */
import { Link } from 'react-router-dom';
import { Building2, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useMyPartnerOrgs } from '@/hooks/useOrgMembers';
import { t } from '@/lib/i18n-toast';

export function CommercePartnerCard() {
  const { data } = useMyPartnerOrgs();
  const isMember = (data?.length ?? 0) > 0;

  return (
    <Link to="/commerce" className="block">
      <Card className="transition-colors hover:border-primary/40">
        <CardContent className="flex items-center gap-3 p-4">
          <Building2 className="h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">
              {isMember
                ? t('screens.commerceportal.orgOnboarding.sectionTitle')
                : t('screens.commerceportal.orgOnboarding.registerAsPartnerTitle')}
            </p>
            <p className="text-sm text-muted-foreground">
              {isMember
                ? t('screens.commerceportal.orgOnboarding.openMyOrgsBody')
                : t('screens.commerceportal.orgOnboarding.registerAsPartnerBody')}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180" />
        </CardContent>
      </Card>
    </Link>
  );
}
