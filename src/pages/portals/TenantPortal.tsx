import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import NotFound from '@/pages/NotFound';
import SEO from '@/components/SEO';
import { ScreenFrame, ArchetypeSkeleton } from '@/components/layout/spotlight';
import { VCard } from '@/components/ui/vcard';
import { Button } from '@/components/ui/button';
import { TenantAuthCard, type TenantAuthMode } from '@/components/portal/TenantAuthCard';
import { useAuth } from '@/context/AuthProvider';
import { useTenant, type TenantSwitchResult } from '@/hooks/useTenant';
import { useTenantRegistry } from '@/hooks/useTenantRegistry';
import { supabase } from '@/integrations/supabase/client';
import { RETIRED_TENANT_SLUGS, retiredTenantRedirectPath } from '@/lib/retired-tenants';
import {
  SLUG_RE,
  assetUrl,
  fetchTenantBySlug,
  isReservedSlug,
  portalLandingTarget,
  type TenantEntry,
} from '@/lib/tenant-registry';
import { getI18nLocale, t } from '@/lib/i18n-toast';

/**
 * VTID-05151 — the generic community portal at /:tenantSlug (and /alkalma).
 *
 * Slug checks, in order: a slug that is malformed or reserved renders NotFound
 * without any call; a retired slug redirects to its successor; otherwise
 * resolve_tenant (GET) decides — unknown → NotFound. There is no Maxina
 * fallback on this page, not even when the call fails: the archetype error
 * state with Retry is shown instead.
 *
 * Anonymous: sign in (then switch into the tenant), sign up only for an
 * open_signup tenant, OAuth only when landing.oauth. Signed-in member: switch
 * once if needed, then go to the tenant's post_login_path — never to a portal
 * path (cycle guard). Signed-in non-member: an explicit Join button for an
 * open_signup tenant, else the invite-only notice.
 */

/** The i18n error for a refused switch: 42501 (not joinable) or anything else. */
function joinErrorText(res: TenantSwitchResult, brand: string): string {
  return 'code' in res && res.code === 'not_joinable'
    ? t('tenantPortal.errors.notJoinable', { brand })
    : t('tenantPortal.errors.generic');
}

function taglineFor(entry: TenantEntry, brand: string): string {
  const lang = getI18nLocale().split('-')[0];
  return entry.landing.tagline?.[lang] ?? t('tenantPortal.tagline', { brand });
}

interface TenantPortalProps {
  /** Fixed slug for a static alias route (/alkalma); otherwise the :tenantSlug param. */
  slug?: string;
}

export default function TenantPortal({ slug: fixedSlug }: TenantPortalProps) {
  const params = useParams();
  const location = useLocation();
  const slug = String(fixedSlug ?? params.tenantSlug ?? '').toLowerCase();

  if (!SLUG_RE.test(slug) || isReservedSlug(slug)) return <NotFound />;
  if (RETIRED_TENANT_SLUGS[slug]) {
    return (
      <Navigate
        to={retiredTenantRedirectPath(location.pathname, location.search, location.hash) ?? `/${RETIRED_TENANT_SLUGS[slug]}`}
        replace
      />
    );
  }
  return <ResolvedTenantPortal slug={slug} />;
}

function PortalShell({ children }: { children: React.ReactNode }) {
  return (
    <ScreenFrame archetype="form">
      <div data-screen="tenant-portal" className="flex flex-col gap-5">
        {children}
      </div>
    </ScreenFrame>
  );
}

function PortalError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" aria-live="assertive" className="rounded-vcard border border-dashed bg-card px-6 py-8 text-center" data-tenant-portal-error="">
      <AlertCircle className="mx-auto mb-4 size-12 text-muted-foreground" aria-hidden="true" />
      <h1 className="mb-2 text-lg font-semibold">{t('tenantPortal.loadError.title')}</h1>
      <p className="mx-auto max-w-sm text-muted-foreground">{t('tenantPortal.loadError.description')}</p>
      <Button onClick={onRetry} className="mt-4">
        {t('tenantPortal.retry')}
      </Button>
    </div>
  );
}

function ResolvedTenantPortal({ slug }: { slug: string }) {
  const query = useQuery({
    queryKey: ['tenant-registry', 'resolve', slug],
    queryFn: () => fetchTenantBySlug(slug),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  if (query.isLoading) {
    return (
      <PortalShell>
        <ArchetypeSkeleton archetype="form" />
      </PortalShell>
    );
  }
  if (query.isError) {
    return (
      <PortalShell>
        <PortalError onRetry={() => query.refetch()} />
      </PortalShell>
    );
  }
  if (!query.data) return <NotFound />;
  return <TenantPortalPage entry={query.data} />;
}

type MemberState = 'unknown' | 'member' | 'non-member' | 'error';

function TenantPortalPage({ entry }: { entry: TenantEntry }) {
  const { user, loading: authLoading } = useAuth();
  const { tenant, setTenantBySlug } = useTenant();
  const registry = useTenantRegistry();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<TenantAuthMode>('signin');
  const [justSignedIn, setJustSignedIn] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const switchedRef = useRef(false);
  const brand = entry.display_name;
  const confirmed = searchParams.get('confirmed') === 'true';
  const logo = assetUrl(entry.brand.logo_path, entry.slug);

  // Membership of a signed-in visitor (user_tenants, select-own policy; a GET).
  const membership = useQuery({
    queryKey: ['tenant-portal-membership', user?.id, entry.tenant_id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user!.id)
        .eq('tenant_id', entry.tenant_id)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
  const memberState: MemberState = !user
    ? 'unknown'
    : membership.isError
      ? 'error'
      : membership.data === undefined
        ? 'unknown'
        : membership.data
          ? 'member'
          : 'non-member';

  // Switch (once per mount) and leave the portal. A member switches only when
  // the active tenant is a different one; after a sign-in on this page the
  // switch also runs for a non-member (the RPC joins an open tenant and
  // refuses a closed one).
  useEffect(() => {
    if (!user || switchedRef.current) return;
    if (memberState === 'member' && tenant?.slug === entry.slug) {
      switchedRef.current = true;
      navigate(portalLandingTarget(entry, registry), { replace: true });
      return;
    }
    if (memberState === 'member' || (justSignedIn && memberState === 'non-member')) {
      switchedRef.current = true;
      setJoining(true);
      setTenantBySlug(entry.slug).then((res) => {
        setJoining(false);
        if (res.ok) navigate(portalLandingTarget(entry, registry), { replace: true });
        else setJoinError(joinErrorText(res, brand));
      });
    }
  }, [user, memberState, justSignedIn, tenant?.slug, entry, registry, navigate, setTenantBySlug, brand]);

  const handleJoin = async () => {
    if (joining) return;
    switchedRef.current = true;
    setJoining(true);
    setJoinError(null);
    const res = await setTenantBySlug(entry.slug);
    setJoining(false);
    if (res.ok) navigate(portalLandingTarget(entry, registry), { replace: true });
    else setJoinError(joinErrorText(res, brand));
  };

  const hero = (
    <VCard
      size="spotlight"
      as="div"
      media={logo ? { src: logo, alt: t('tenantPortal.logoAlt', { brand }) } : undefined}
      priority
      title={<h1 data-tenant-name="">{brand}</h1>}
      body={taglineFor(entry, brand)}
    />
  );

  const joinErrorLine = joinError ? (
    <p role="alert" aria-live="assertive" className="text-sm text-destructive" data-tenant-join-error="">
      {joinError}
    </p>
  ) : null;

  const seo = <SEO title={brand} description={taglineFor(entry, brand)} />;

  // Anonymous visitor: sign in / sign up.
  if (!user) {
    if (authLoading) {
      return (
        <PortalShell>
          <ArchetypeSkeleton archetype="form" />
        </PortalShell>
      );
    }
    return (
      <ScreenFrame
        archetype="form"
        tabs={{
          value: mode,
          onValueChange: (v) => setMode(v as TenantAuthMode),
          ariaLabel: t('tenantPortal.tabsAria'),
          items: [
            { value: 'signin', label: t('tenantPortal.signInTab') },
            { value: 'signup', label: t('tenantPortal.signUpTab') },
          ],
        }}
      >
        {seo}
        <div data-screen="tenant-portal" data-tenant-slug={entry.slug} className="flex flex-col gap-5">
          {hero}
          {confirmed && (
            <p role="status" aria-live="polite" className="rounded-vcard-sm border bg-card px-4 py-3 text-sm" data-tenant-confirmed="">
              {t('tenantPortal.confirmed')}
            </p>
          )}
          <div className="rounded-vcard border bg-card p-5">
            <TenantAuthCard entry={entry} brand={brand} onSignedIn={() => setJustSignedIn(true)} />
          </div>
        </div>
      </ScreenFrame>
    );
  }

  // Signed in: switching / redirecting, or an explicit join.
  const busy = !joinError && (memberState === 'unknown' || memberState === 'member' || joining || justSignedIn);
  return (
    <PortalShell>
      {seo}
      {hero}
      {memberState === 'error' ? (
        <PortalError onRetry={() => membership.refetch()} />
      ) : busy ? (
        <ArchetypeSkeleton archetype="form" />
      ) : (
        <div className="flex flex-col gap-3 rounded-vcard border bg-card p-5" data-tenant-join="">
          {entry.open_signup ? (
            <>
              <p className="text-sm text-muted-foreground">{t('tenantPortal.joinIntro', { brand })}</p>
              <Button onClick={handleJoin} disabled={joining}>
                {t('tenantPortal.join', { brand })}
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground" data-tenant-invite-only="">
              {t('tenantPortal.inviteOnly', { brand })}
            </p>
          )}
          {joinErrorLine}
        </div>
      )}
    </PortalShell>
  );
}
