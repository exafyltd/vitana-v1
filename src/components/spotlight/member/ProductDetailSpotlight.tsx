import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, BookOpen, ClipboardList, ExternalLink, Gift, Leaf, PackageX, Sparkles, Target, ShieldCheck } from 'lucide-react';
import { ArchetypeSkeleton } from '@/components/layout/spotlight';
import { VCard } from '@/components/ui/vcard';
import { storefrontProductToVCard, discountPercent, discoverPrice } from '@/components/ui/vcard/adapters/discover';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AddToCartButton } from '@/components/cart/AddToCartButton';
import { UniversalShareButton } from '@/components/sharing/UniversalShareButton';
import { BookmarkButton } from '@/components/bookmarks/BookmarkButton';
import { RecommendButton } from '@/components/discover/RecommendButton';
import { AffiliateDisclosure } from '@/components/discover/AffiliateDisclosure';
import { getRedirectUrl, type MarketplaceProductResponse } from '@/hooks/useMarketplace';
import { getShareUrl } from '@/lib/shareUrl';
import type { BookmarkItemType } from '@/types/bookmarks';
import { t } from '@/lib/i18n-toast';
import { SpotlightEmpty, SpotlightNotice, SpotlightPanel } from './MemberSpotlight';

/**
 * VTID-05117 — /discover/product/:id on the Spotlight `detail` archetype: the
 * product itself is the one `spotlight` card (SR-06), its real sections follow
 * as panels. Every value comes from the product record; nothing is padded.
 * The page wraps this body in its own `<ScreenFrame archetype="detail">`.
 */

const humanize = (s: string) => s.replace(/_/g, ' ');

/** The same item_type the legacy product page bookmarks with ('product' is missing from BookmarkItemType — pre-existing). */
const BOOKMARK_PRODUCT = 'product' as unknown as BookmarkItemType;

export function ProductDetailSpotlight({
  data,
  isLoading,
  error,
  recId,
}: {
  data: MarketplaceProductResponse | undefined;
  isLoading: boolean;
  error: unknown;
  recId: string | null;
}) {
  const navigate = useNavigate();
  if (isLoading) return <ArchetypeSkeleton archetype="detail" />;

  const p = data?.ok ? data.product : undefined;
  if (error || !p) {
    return (
      <SpotlightEmpty
        Icon={PackageX}
        titleKey="screens.discover.productNotFound"
        descriptionKey="screens.discover.productYouRsquoReLookingFor"
        actionKey="screens.discover.discoverMore"
        onAction={() => navigate('/discover')}
      />
    );
  }

  const d = storefrontProductToVCard(p);
  const pct = discountPercent(p);
  const compareAt = pct ? discoverPrice(p.compare_at_price_cents, p.currency) : '';
  const matchReasons = p.match_reasons?.filter((r) => r.text) ?? [];
  const ingredients = Array.isArray(p.ingredients_primary) ? p.ingredients_primary : [];
  const goals = Array.isArray(p.health_goals) ? p.health_goals : [];
  const dietary = Array.isArray(p.dietary_tags) ? p.dietary_tags : [];
  const evidence = (Array.isArray(p.evidence_links) ? p.evidence_links : []).filter((e) => e.url);
  const redirectUrl = getRedirectUrl(p.id, 'product_detail', recId);
  const directions = [
    p.dosage ? { label: t('screens.discover.dose'), value: p.dosage } : null,
    p.serving_size ? { label: t('screens.discover.serving'), value: p.serving_size } : null,
    p.servings_per_container != null ? { label: t('screens.discover.servings'), value: String(p.servings_per_container) } : null,
  ].filter(Boolean) as { label: string; value: string }[];
  const item = {
    item_type: 'product' as const,
    item_id: p.id,
    item_name: p.title,
    item_price: p.price_cents ? p.price_cents / 100 : 0,
    item_image_url: p.images?.[0],
    item_metadata: { brand: p.brand, category: p.category },
  };

  return (
    <div className="flex flex-col gap-6" data-product-id={p.id}>
      <VCard
        size="spotlight"
        priority
        media={{ src: p.images?.[0] ?? null, alt: p.title, ratio: 'landscape' }}
        badge={
          p.availability && p.availability !== 'in_stock' ? (
            <Badge variant="destructive">{p.availability === 'out_of_stock' ? t('spotlightMember.discover.outOfStock') : humanize(p.availability)}</Badge>
          ) : pct ? (
            <Badge variant="destructive">{t('screens.discover.saveValue02', { value0: pct })}</Badge>
          ) : undefined
        }
        eyebrow={d.eyebrow}
        title={<h1 className="text-2xl font-bold leading-snug">{p.title}</h1>}
        meta={[d.price, compareAt && t('spotlightMember.discover.wasPrice', { price: compareAt }), d.rating, p.origin_country].filter(Boolean).join(' · ') || undefined}
        body={
          p.reward_preview?.points_estimate ? (
            <span className="flex items-center gap-1 text-status-success">
              <Gift className="size-4" aria-hidden="true" />
              {t('screens.discover.earnPoints_estimatePointsPurchase', { points_estimate: p.reward_preview.points_estimate })}
            </span>
          ) : undefined
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <AddToCartButton item={item} size="lg" />
            <Button asChild variant="outline" size="lg">
              <a href={redirectUrl} target="_blank" rel="noopener noreferrer" className="gap-1.5">
                {t('screens.discover.buy')}
                <ExternalLink className="size-4" aria-hidden="true" />
              </a>
            </Button>
            <RecommendButton productId={p.id} variant="cta" size="lg" />
            <BookmarkButton
              className="static"
              item={{ item_type: BOOKMARK_PRODUCT, item_id: p.id, item_name: p.title, item_image_url: p.images?.[0], item_metadata: item.item_metadata }}
            />
            <UniversalShareButton
              content={{
                type: 'product',
                id: p.id,
                title: p.title,
                description: p.description ?? '',
                image_url: p.images?.[0],
                url: getShareUrl('product', p.id),
              }}
              variant="outline"
              size="icon"
              showLabel={false}
            />
          </div>
        }
      />

      {matchReasons.length > 0 && (
        <SpotlightPanel Icon={Sparkles} title={t('screens.discover.whyThisForYou')}>
          <ul className="flex list-disc flex-col gap-1 ps-5 text-sm text-muted-foreground">
            {matchReasons.map((r, i) => (
              <li key={i}>{r.text}</li>
            ))}
          </ul>
        </SpotlightPanel>
      )}

      {(p.description_long || p.description) && (
        <SpotlightPanel title={t('screens.discover.aboutThisProduct')}>
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{p.description_long || p.description}</p>
        </SpotlightPanel>
      )}

      {ingredients.length > 0 && (
        <SpotlightPanel Icon={Leaf} title={t('screens.discover.keyIngredients')}>
          <ul className="grid list-disc grid-cols-2 gap-x-6 gap-y-1 ps-5 text-sm capitalize text-muted-foreground">
            {ingredients.map((ing) => (
              <li key={ing}>{humanize(ing)}</li>
            ))}
          </ul>
        </SpotlightPanel>
      )}

      {directions.length > 0 && (
        <SpotlightPanel Icon={ClipboardList} title={t('screens.discover.directions')}>
          <dl className="grid grid-cols-3 gap-2 text-sm">
            {directions.map((row) => (
              <div key={row.label} className="rounded-md bg-muted/50 p-2">
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">{row.label}</dt>
                <dd className="font-medium leading-tight">{row.value}</dd>
              </div>
            ))}
          </dl>
        </SpotlightPanel>
      )}

      {(goals.length > 0 || dietary.length > 0) && (
        <SpotlightPanel Icon={Target} title={t('screens.discover.supports')}>
          <div className="flex flex-wrap gap-1.5">
            {goals.map((g) => (
              <Badge key={g} variant="secondary" className="capitalize">
                {humanize(g)}
              </Badge>
            ))}
            {dietary.map((tag) => (
              <Badge key={tag} variant="outline" className="gap-1 capitalize">
                <ShieldCheck className="size-3" aria-hidden="true" />
                {humanize(tag)}
              </Badge>
            ))}
          </div>
        </SpotlightPanel>
      )}

      {p.safety_notes && (
        <SpotlightNotice tone="warning" Icon={AlertTriangle}>
          <strong className="block">{t('screens.discover.safetyAmpInteractions')}</strong>
          <span className="whitespace-pre-line">{p.safety_notes}</span>
        </SpotlightNotice>
      )}

      {evidence.length > 0 && (
        <SpotlightPanel Icon={BookOpen} title={t('screens.discover.evidence')}>
          <ul className="flex flex-col gap-2 text-sm">
            {evidence.map((e, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2">
                <a href={e.url ?? undefined} target="_blank" rel="noopener noreferrer" className="leading-snug text-primary hover:underline">
                  {e.title ?? e.url}
                </a>
                {e.source_type && (
                  <Badge variant="outline" className="text-xs capitalize">
                    {humanize(e.source_type)}
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </SpotlightPanel>
      )}

      <div className="flex flex-col gap-2 border-t pt-4">
        <p className="text-xs leading-relaxed text-muted-foreground">{t('screens.discover.thisProductCardInformationalAlwaysConsult2')}</p>
        <AffiliateDisclosure />
        <Link to="/discover" className="text-sm text-primary hover:underline">
          {t('screens.discover.discoverMore')}
        </Link>
      </div>
    </div>
  );
}
