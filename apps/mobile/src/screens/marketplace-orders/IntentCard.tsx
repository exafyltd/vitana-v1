/**
 * VTID-05511 — the marketplace's intent card, a twin of the web
 * `src/components/intents/IntentCard.tsx` with the props Marketplace.tsx uses
 * (default variant, status and share on, no themed fallback):
 *  - the cover photo when the intent carries one (`cover_url` or
 *    `kind_payload.cover_url`, intentCovers.ts `getIntentCoverUrl`), 16:9,
 *    hidden when it fails to load (the web swaps in a bundled brand photo,
 *    a web asset);
 *  - the kind pill (`KIND_LABEL` / `KIND_COLOR`, src/lib/intentKind.ts) — the
 *    labels through the catalog, the colours from the category / status tokens;
 *  - the raw status and the share button, which opens the IntentShareSheet twin;
 *  - title, the one-line scope, and the chip strip (`kindChips`, :24-94) with
 *    the match-count chip;
 *  - "open" cards are not tappable (no `to`), "mine" cards open
 *    `/intents/match/:id` (`to`), exactly as on the web.
 */
import { useState, type ReactElement } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Text, useUITheme } from '../../ports/ui';
import { alpha, CommerceIcon, useCommercePalette } from '../../ports/marketplace-orders';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { IntentShareSheet } from './IntentShareSheet';
import type { UserIntent } from './data/intents';

const K = 'discoverCommerceNative.marketplaceOrders.intentCard';

/** `getIntentCoverUrl`. */
export function getIntentCoverUrl(intent: Pick<UserIntent, 'cover_url' | 'kind_payload'>): string | null {
  if (intent.cover_url) return intent.cover_url;
  const fromPayload = (intent.kind_payload as Record<string, unknown> | null | undefined)?.cover_url;
  return typeof fromPayload === 'string' && fromPayload.length > 0 ? fromPayload : null;
}

/** `kindChips(intent)` — the chip strip, its fixed words through the catalog. */
export function kindChips(intent: UserIntent, t: (k: string, p?: Record<string, string | number>) => string): string[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = intent.kind_payload as any;
  const chips: string[] = [];
  if (intent.category) chips.push(intent.category.replace(/_/g, ' '));
  if (p?.dance && typeof p.dance === 'object') {
    const d = p.dance;
    if (d.variety) chips.push(`💃 ${d.variety}`);
    if (d.level_target) chips.push(d.level_target);
    if (d.role_pref && d.role_pref !== 'either') chips.push(d.role_pref);
  }
  switch (intent.intent_kind as string) {
    case 'commercial_buy':
    case 'commercial_sell': {
      if (p?.budget_min && p?.budget_max) chips.push(`€${p.budget_min}–${p.budget_max}`);
      else if (p?.price_floor && p?.price_ceiling) chips.push(`€${p.price_floor}–${p.price_ceiling}`);
      if (p?.location_label) chips.push(`📍 ${p.location_label}`);
      if (p?.urgency) chips.push(p.urgency);
      break;
    }
    case 'activity_seek': {
      if (p?.activity) chips.push(p.activity);
      if (p?.location_label) chips.push(`📍 ${p.location_label}`);
      if (p?.skill_level) chips.push(p.skill_level);
      break;
    }
    case 'partner_seek': {
      if (Array.isArray(p?.age_range)) chips.push(t(`${K}.age`, { min: p.age_range[0], max: p.age_range[1] }));
      if (p?.location_radius_km) chips.push(t(`${K}.within`, { km: p.location_radius_km }));
      break;
    }
    case 'social_seek': {
      if (p?.topic) chips.push(p.topic);
      if (p?.format_pref) chips.push(p.format_pref);
      break;
    }
    case 'mutual_aid': {
      if (p?.direction) chips.push(p.direction);
      if (p?.object_or_skill) chips.push(p.object_or_skill);
      break;
    }
    case 'learning_seek': {
      if (p?.learning?.topic && (!p?.dance || p.dance.variety !== p.learning.topic)) chips.push(p.learning.topic);
      if (p?.learning?.mode_pref) chips.push(String(p.learning.mode_pref).replace('_', ' '));
      if (p?.counterparty_filter?.location_label) chips.push(`📍 ${p.counterparty_filter.location_label}`);
      if (p?.counterparty_filter?.max_radius_km) chips.push(t(`${K}.within`, { km: p.counterparty_filter.max_radius_km }));
      break;
    }
    case 'mentor_seek': {
      if (p?.teaching?.topic && (!p?.dance || p.dance.variety !== p.teaching.topic)) chips.push(p.teaching.topic);
      if (Array.isArray(p?.teaching?.modes_offered) && p.teaching.modes_offered.length > 0) chips.push(p.teaching.modes_offered.join('/'));
      if (p?.teaching?.price_cents) chips.push(`${p.teaching.currency || 'EUR'} ${(p.teaching.price_cents / 100).toFixed(0)}`);
      break;
    }
  }
  return chips;
}

const KNOWN_KINDS = ['commercial_buy', 'commercial_sell', 'activity_seek', 'partner_seek', 'social_seek', 'mutual_aid', 'learning_seek', 'mentor_seek'];

export function IntentCard({ intent, to }: { intent: UserIntent; to?: string }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const palette = useCommercePalette();
  const [shareOpen, setShareOpen] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);
  const chips = kindChips(intent, t);
  const cover = coverFailed ? null : getIntentCoverUrl(intent);
  const kindTone: Record<string, string> = {
    commercial_buy: palette.category3,
    commercial_sell: palette.success,
    activity_seek: palette.warning,
    partner_seek: palette.category4,
    social_seek: palette.category2,
    mutual_aid: palette.warning,
    learning_seek: palette.info,
    mentor_seek: palette.category4,
  };
  const tone = kindTone[intent.intent_kind] ?? colors.mutedForeground;
  const kindLabel = KNOWN_KINDS.includes(intent.intent_kind) ? t(`${K}.kind.${intent.intent_kind}`) : intent.intent_kind;
  const matches = intent.match_count > 0 ? t('screens.intents.match_countMatchValue1', { match_count: intent.match_count, value1: intent.match_count === 1 ? '' : 'es' }) : null;

  const body = (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
      {cover ? (
        <View style={[styles.cover, { backgroundColor: colors.muted }]}>
          <Image source={{ uri: cover }} style={styles.fill} resizeMode="cover" onError={() => setCoverFailed(true)} accessibilityIgnoresInvertColors testID="mo-intent-cover" />
        </View>
      ) : null}
      <View style={styles.inner}>
        <View style={styles.head}>
          <View style={[styles.kind, { backgroundColor: alpha(tone, 0.15), borderColor: alpha(tone, 0.3) }]}>
            <Text size="xs" weight="500" color={tone}>
              {kindLabel}
            </Text>
          </View>
          <View style={styles.headEnd}>
            <Text size="xs" muted testID="mo-intent-status">
              {intent.status}
            </Text>
            <Pressable testID={`mo-intent-share-${intent.intent_id}`} accessibilityRole="button" accessibilityLabel={t('screens.intents.sharePost')} hitSlop={8} onPress={() => setShareOpen(true)} style={styles.share}>
              <CommerceIcon name="Share2" size={14} color={colors.foreground} />
            </Pressable>
          </View>
        </View>
        <Text weight="600" style={styles.title}>
          {intent.title}
        </Text>
        <Text size="sm" muted numberOfLines={1}>
          {intent.scope}
        </Text>
        {chips.length > 0 || matches ? (
          <View style={styles.chips}>
            {chips.map((c, i) => (
              <View key={i} style={[styles.chip, { backgroundColor: colors.muted }]}>
                <Text size="xs" muted>
                  {c}
                </Text>
              </View>
            ))}
            {matches ? (
              <View style={[styles.chip, { backgroundColor: colors.muted }]}>
                <Text size="xs" muted>
                  {matches}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );

  return (
    <View testID={`mo-intent-${intent.intent_id}`}>
      {to ? (
        <Pressable accessibilityRole="link" accessibilityLabel={intent.title} onPress={() => navigateToWebPath(to)} testID={`mo-intent-link-${intent.intent_id}`}>
          {body}
        </Pressable>
      ) : (
        body
      )}
      <IntentShareSheet open={shareOpen} onOpenChange={setShareOpen} intentId={intent.intent_id} intentTitle={intent.title} intentScopeExcerpt={intent.scope?.slice(0, 240) ?? null} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  cover: { width: '100%', aspectRatio: 16 / 9 },
  fill: { width: '100%', height: '100%' },
  inner: { padding: 12, gap: 4 },
  head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
  headEnd: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kind: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  share: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  title: { lineHeight: 22 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  chip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
});
