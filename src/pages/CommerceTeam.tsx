/**
 * VTID-03999 — `/commerce/team`: the org admin's home in business mode, the
 * place invitations are sent and the roster is managed.
 *
 * F1 keeps the existing roster component (a full-width sheet on phones) and
 * mounts it over the business overview for the ACTIVE business; a member of
 * several picks the business in the switcher. Non-admin members get an
 * honest card instead of a roster they could not manage. The proper page
 * layout (invite form on top, cards below) is the next slice.
 */
import { useNavigate } from 'react-router-dom';
import { Loader2, Users } from 'lucide-react';
import { CommerceShell } from '@/components/commerce/CommerceShell';
import { PartnerOrgRoster } from '@/components/commerce/PartnerOrgRoster';
import { useBusinessMode } from '@/hooks/useBusinessMode';
import { BUSINESS_ROUTES } from '@/lib/business-mode';
import { t } from '@/lib/i18n-toast';

export default function CommerceTeam() {
  const navigate = useNavigate();
  const business = useBusinessMode();
  const org = business.activeOrg;

  return (
    <CommerceShell>
      <div className="pt-6">
        <h1 className="text-2xl font-semibold text-foreground">{t('screens.commerceportal.orgOnboarding.teamTitle')}</h1>
        {business.isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !org ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border bg-muted/30 px-5 py-14 text-center">
            <p className="font-medium text-foreground">{t('screens.commerceportal.healthOrders.notAMemberTitle')}</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{t('screens.commerceportal.healthOrders.notAMemberBody')}</p>
          </div>
        ) : org.role !== 'org_admin' ? (
          <div className="mt-6 rounded-2xl border border-border bg-card p-5 text-center">
            <Users className="mx-auto h-8 w-8 text-amber-500" />
            <p className="mt-3 font-medium text-foreground">{t('screens.commerceportal.orgOnboarding.teamAdminOnlyTitle')}</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              {t('screens.commerceportal.orgOnboarding.teamAdminOnlyBody', { org: org.display_name })}
            </p>
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted-foreground">{org.display_name}</p>
            <PartnerOrgRoster orgId={org.id} orgName={org.display_name} onClose={() => navigate(BUSINESS_ROUTES.overview)} />
          </>
        )}
      </div>
    </CommerceShell>
  );
}
