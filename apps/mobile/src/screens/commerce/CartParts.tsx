/**
 * VTID-05512 — the cart page's pieces, twins of:
 *  - `QuantityStepper` + `CartLineHeader` (src/pages/UniversalCart.tsx:83-196):
 *    − / quantity / + (− disabled at 1, both "Quantity"); the line's image +
 *    title hydrated from the product (`useMarketplaceProduct`), else the
 *    snapshot label, a skeleton while it loads, else the snapshot price / the
 *    product id; the snapshot price; "View product" → /discover/product/:id;
 *  - `BudgetMeter` (src/components/universal-cart/BudgetMeter.tsx): no cap →
 *    the hint + the Budget link to /settings/limitations; a cap → title, the
 *    under / near / over pill, the progress of (spent + cart subtotal) / cap
 *    and "{spent} of {cap} this month";
 *  - `AgentProposalCard` (src/components/universal-cart/AgentProposalCard.tsx):
 *    an agent / reorder line — the reorder badge, title, snapshot price, View
 *    product, Remove (icon), the rationale, the destructive safety callout
 *    listing every flag, the confidence badge (percent), Keep (one-shot) and
 *    Remove.
 */
import { useState, type ReactElement } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Badge, Button, Skeleton, Spinner, Text, useUITheme } from '../../ports/ui';
import { alpha, CheckoutIcon, Progress, type BudgetSummary, type UniversalCartItem } from '../../ports/commerce';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { useMarketplaceProduct } from './data/product';
import { useMoney } from './format';
import { Notice, Panel } from './parts';

const asString = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
const asStringArray = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

export function QuantityStepper({ item, onChange, disabled }: { item: UniversalCartItem; onChange: (next: number) => void; disabled?: boolean }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const label = t('universalCart.page.quantityLabel');
  return (
    <View style={styles.stepper} accessibilityLabel={label} testID={`qty-${item.id}`}>
      <Button variant="ghost" size="icon" accessibilityLabel={label} testID={`qty-dec-${item.id}`} disabled={disabled || item.quantity <= 1} onPress={() => item.quantity > 1 && onChange(item.quantity - 1)}>
        <CheckoutIcon name="Minus" size={16} color={colors.foreground} />
      </Button>
      <Text style={styles.qty} testID={`qty-value-${item.id}`}>
        {String(item.quantity)}
      </Text>
      <Button variant="ghost" size="icon" accessibilityLabel={label} testID={`qty-inc-${item.id}`} disabled={disabled} onPress={() => onChange(item.quantity + 1)}>
        <CheckoutIcon name="Plus" size={16} color={colors.foreground} />
      </Button>
    </View>
  );
}

function useLine(item: UniversalCartItem, metaTitle: boolean) {
  const { data, isLoading } = useMarketplaceProduct(item.product_id);
  const money = useMoney();
  const product = data?.product;
  const snapshotPrice = item.unit_price_cents_snapshot != null ? money(item.unit_price_cents_snapshot, item.currency_snapshot?.toUpperCase() || 'EUR') : null;
  const image = product?.images?.[0] ?? item.metadata?.item_image_url;
  const title = product?.title ?? (metaTitle ? asString(item.metadata?.title) : null) ?? asString(item.metadata?.source_label);
  return { isLoading, snapshotPrice, image: typeof image === 'string' && image ? image : null, title };
}

function ViewProductLink({ productId }: { productId: string }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const label = t('universalCart.item.viewProduct');
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={label} onPress={() => navigateToWebPath(`/discover/product/${productId}`)} testID={`view-product-${productId}`} style={styles.link}>
      <Text size="xs" color={colors.primary}>
        {label}
      </Text>
      <CheckoutIcon name="ExternalLink" size={12} color={colors.primary} />
    </Pressable>
  );
}

export function CartLineHeader({ item }: { item: UniversalCartItem }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { isLoading, snapshotPrice, image, title } = useLine(item, false);
  return (
    <View style={styles.lineHead}>
      {image ? <Image source={{ uri: image }} style={[styles.thumb, { backgroundColor: colors.muted }]} accessibilityIgnoresInvertColors /> : null}
      <View style={styles.flex}>
        {title ? (
          <Text size="sm" weight="500" testID={`line-title-${item.id}`}>
            {title}
          </Text>
        ) : isLoading ? (
          <Skeleton style={styles.skeleton} accessibilityLabel={t('universalCart.page.loading')} />
        ) : (
          <Text size="sm" weight="500" testID={`line-title-${item.id}`}>
            {snapshotPrice ?? item.product_id}
          </Text>
        )}
        {snapshotPrice ? (
          <Text size="xs" muted>
            {snapshotPrice}
          </Text>
        ) : null}
        <ViewProductLink productId={item.product_id} />
      </View>
    </View>
  );
}

const BUDGET_STATUS: Record<BudgetSummary['status'], { variant: 'secondary' | 'outline' | 'destructive'; key: string; icon: string }> = {
  under: { variant: 'secondary', key: 'universalCart.budget.statusUnder', icon: 'CheckCircle2' },
  near: { variant: 'outline', key: 'universalCart.budget.statusNear', icon: 'AlertTriangle' },
  over: { variant: 'destructive', key: 'universalCart.budget.statusOver', icon: 'AlertTriangle' },
};

export function BudgetMeter({ budget }: { budget: BudgetSummary }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const money = useMoney();
  const currency = budget.currency?.toUpperCase() || 'EUR';
  if (budget.monthly_cap_cents == null) {
    return (
      <Panel testID="budget-no-cap">
        <View style={styles.budgetRow}>
          <View style={[styles.inline, styles.flex]}>
            <CheckoutIcon name="Wallet" size={16} color={colors.mutedForeground} />
            <Text size="sm" muted style={styles.flex}>
              {t('universalCart.budget.noCapHint')}
            </Text>
          </View>
          <Button variant="link" size="sm" testID="budget-settings" onPress={() => navigateToWebPath('/settings/limitations')}>
            <CheckoutIcon name="Settings2" size={14} color={colors.primary} />
            {t('universalCart.budget.title')}
          </Button>
        </View>
      </Panel>
    );
  }
  const cap = budget.monthly_cap_cents;
  const projected = budget.spent_this_month_cents + budget.cart_active_subtotal_cents;
  const pct = cap > 0 ? Math.min(100, Math.max(0, (projected / cap) * 100)) : 0;
  const status = BUDGET_STATUS[budget.status] ?? BUDGET_STATUS.under;
  const fg = status.variant === 'destructive' ? colors.destructiveForeground : status.variant === 'secondary' ? colors.secondaryForeground : colors.foreground;
  return (
    <Panel testID="budget-meter">
      <View style={styles.budgetBody}>
        <View style={styles.between}>
          <View style={styles.inline}>
            <CheckoutIcon name="Wallet" size={16} color={colors.foreground} />
            <Text size="sm" weight="500">
              {t('universalCart.budget.title')}
            </Text>
          </View>
          <Badge variant={status.variant} testID={`budget-status-${budget.status}`}>
            <View style={styles.inline4}>
              <CheckoutIcon name={status.icon} size={12} color={fg} />
              <Text size="xs" weight="600" color={fg}>
                {t(status.key)}
              </Text>
            </View>
          </Badge>
        </View>
        <Progress value={pct} testID="budget-progress" />
        <Text size="xs" muted testID="budget-spent">
          {t('universalCart.budget.spentOfCap', { spent: money(projected, currency), cap: money(cap, currency) })}
        </Text>
      </View>
    </Panel>
  );
}

export function AgentProposalCard({
  item,
  onRemove,
  isRemoving,
  variant = 'agent',
}: {
  item: UniversalCartItem;
  onRemove: (item: UniversalCartItem) => void;
  isRemoving?: boolean;
  variant?: 'agent' | 'reorder';
}): ReactElement {
  const { t, language } = useI18n();
  const { colors } = useUITheme();
  const [kept, setKept] = useState(false);
  const { isLoading, snapshotPrice, image, title } = useLine(item, true);
  const rationale = asString(item.metadata?.rationale);
  const safetyFlags = asStringArray(item.metadata?.safety_flags);
  const confidence = typeof item.metadata?.confidence === 'number' ? (item.metadata.confidence as number) : null;
  const percent = (n: number) => {
    try {
      return new Intl.NumberFormat(language, { style: 'percent', maximumFractionDigits: 0 }).format(n);
    } catch {
      return `${Math.round(n * 100)}%`;
    }
  };
  return (
    <Panel testID={`agent-card-${item.id}`} style={safetyFlags.length > 0 ? { borderColor: alpha(colors.destructive, 0.5) } : undefined}>
      <View style={styles.agentHead}>
        <View style={[styles.lineHead, styles.flex]}>
          {image ? <Image source={{ uri: image }} style={[styles.thumb, { backgroundColor: colors.muted }]} accessibilityIgnoresInvertColors /> : null}
          <View style={styles.flex}>
            {variant === 'reorder' ? (
              <Badge variant="outline" testID={`reorder-badge-${item.id}`}>
                <View style={styles.inline4}>
                  <CheckoutIcon name="RotateCcw" size={12} color={colors.foreground} />
                  <Text size="xs" weight="600">
                    {t('universalCart.agent.reorderLabel')}
                  </Text>
                </View>
              </Badge>
            ) : null}
            {title ? (
              <Text size="sm" weight="500">
                {title}
              </Text>
            ) : isLoading ? (
              <View style={styles.inline}>
                <Spinner />
                <Text size="sm" muted>
                  {t('universalCart.page.loading')}
                </Text>
              </View>
            ) : (
              <Text size="sm" weight="500">
                {snapshotPrice ?? item.product_id}
              </Text>
            )}
            {snapshotPrice ? (
              <Text size="xs" muted>
                {snapshotPrice}
              </Text>
            ) : null}
            <ViewProductLink productId={item.product_id} />
          </View>
        </View>
        <Button variant="ghost" size="icon" accessibilityLabel={t('universalCart.agent.remove')} disabled={isRemoving} onPress={() => onRemove(item)} testID={`agent-remove-icon-${item.id}`}>
          <CheckoutIcon name="Trash2" size={16} color={colors.foreground} />
        </Button>
      </View>
      <View style={styles.agentBody}>
        {rationale ? (
          <View>
            <View style={styles.inline4}>
              <CheckoutIcon name="Sparkles" size={14} color={colors.mutedForeground} />
              <Text size="xs" weight="500" muted>
                {t('universalCart.agent.rationaleLabel')}
              </Text>
            </View>
            <Text size="sm" muted>
              {rationale}
            </Text>
          </View>
        ) : null}
        {safetyFlags.length > 0 ? (
          <Notice destructive title={t('universalCart.agent.safetyTitle')} testID={`agent-safety-${item.id}`}>
            <View>
              {safetyFlags.map((flag) => (
                <Text key={flag} size="sm" color={colors.destructive}>
                  {`• ${flag}`}
                </Text>
              ))}
            </View>
          </Notice>
        ) : null}
        <View style={styles.between}>
          {confidence != null ? (
            <Badge variant="secondary" testID={`agent-confidence-${item.id}`}>
              {t('universalCart.agent.confidenceLabel', { value: percent(confidence) })}
            </Badge>
          ) : (
            <View />
          )}
          <View style={styles.inline}>
            <Button variant={kept ? 'secondary' : 'outline'} size="sm" disabled={kept} onPress={() => setKept(true)} testID={`agent-keep-${item.id}`}>
              <CheckoutIcon name="Check" size={16} color={colors.foreground} />
              {t('universalCart.agent.keep')}
            </Button>
            <Button variant="outline" size="sm" disabled={isRemoving} onPress={() => onRemove(item)} testID={`agent-remove-${item.id}`}>
              <CheckoutIcon name="Trash2" size={16} color={colors.foreground} />
              {t('universalCart.agent.remove')}
            </Button>
          </View>
        </View>
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  link: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2, alignSelf: 'flex-start' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  qty: { minWidth: 16, textAlign: 'center', fontVariant: ['tabular-nums'] },
  lineHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  thumb: { width: 48, height: 48, borderRadius: 6 },
  flex: { flex: 1, gap: 2 },
  skeleton: { height: 16, width: 128 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inline4: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  budgetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 16 },
  budgetBody: { padding: 16, gap: 8 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  agentHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: 24, paddingBottom: 8 },
  agentBody: { paddingHorizontal: 24, paddingBottom: 24, gap: 12 },
});
