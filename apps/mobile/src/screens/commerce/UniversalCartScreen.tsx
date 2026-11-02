/**
 * VTID-05512 (native-wave2-discover-commerce-r2/product-cart-checkout) —
 * `/universal-cart` (DISCOVER.CART; the legacy `/cart` redirects here,
 * src/navigation/resolve.ts), twin of src/pages/UniversalCart.tsx (phone
 * branch: Spotlight is desktop-only):
 *
 *  - role-blocked (:236-256), loading (:258-271), error (:273-293): the title
 *    + the explicit state;
 *  - header: the bag + "Cart", Close (navigate(-1)), the subtitle;
 *  - tabs Cart / Saved over ONE cart (`metadata.saved`);
 *  - Cart: the budget meter, the near / over advisory, the Vitana prompt
 *    (Ask Vitana → POST /shopping-agent/propose; an empty tap focuses the
 *    prompt; Buy again → /shopping-agent/reorder; role-blocked / unavailable /
 *    error alerts), "Vitana suggests" (origin 'agent', with the safety
 *    review note) and "Buy again" (origin 'reorder') sections, then the empty
 *    state or the wallet balance card, the buyable lines (stepper, Remove,
 *    Save for later), the affiliate links panel and Checkout;
 *  - Saved: the empty state or the saved lines (Remove, Move to cart);
 *  - the AddMoneyDialog, opened prefilled on a 402 INSUFFICIENT_BALANCE.
 *
 * Checkout idempotency (VTID-03919) is the web rule from
 * `@vitana/core/checkout-idempotency`: the key is held across attempts and
 * reused while the cart contents (line id + quantity) are unchanged, rotated
 * when they change, and cleared once a request lands. A wallet order → the
 * success / duplicate toast and `/checkout/success?checkout_id=`; affiliate
 * redirects open the merchant links (system browser) and stay listed.
 *
 * iOS IAP gate flags (requirements R5, highest priority): the checkout
 * (wallet debit) and the AddMoneyDialog wallet top-up. Today's behaviour —
 * no iOS gate on the web cart; the shell's `iapRestricted`
 * (shell/logic/drawer.ts:37-38, `Platform.OS === 'ios'`) hides only the
 * wallet drawer row; gate extension deferred (program decision 5).
 */
import { useRef, useState, type ReactElement, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type TextInput as RNTextInput } from 'react-native';
import { Button, Spinner, Tabs, TabsContent, TabsList, TabsTrigger, Text, useUITheme } from '../../ports/ui';
import {
  CheckoutIcon,
  Label,
  nextIdempotency,
  notify,
  notifyError,
  openExternal,
  Textarea,
  UniversalCartApiError,
  type CheckoutIdempotencyState,
  type UniversalCartItem,
} from '../../ports/commerce';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { AgentProposalCard, BudgetMeter, CartLineHeader, QuantityStepper } from './CartParts';
import { checkoutErrorKey, isInsufficientBalanceError, mintCheckoutKey, useCommerceCart, type CheckoutAffiliateRedirect } from './data/cart';
import { useShoppingAgent } from './data/agent';
import type { WalletCurrency } from './data/wallet';
import { toMajorUnits } from './format';
import { goBack, Notice, Panel, PanelBody, PulseBlock } from './parts';
import { AddMoneyDialog } from './wallet/AddMoneyDialog';
import { GatewayWalletBalanceCard } from './wallet/GatewayWalletBalanceCard';

function Title(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  return (
    <View style={styles.titleRow}>
      <CheckoutIcon name="ShoppingBag" size={24} color={colors.foreground} />
      <Text size="2xl" weight="600" accessibilityRole="header">
        {t('universalCart.page.title')}
      </Text>
    </View>
  );
}

function StatePanel({ title, body, children, testID }: { title: string; body: string; children?: ReactNode; testID?: string }): ReactElement {
  return (
    <Panel testID={testID}>
      <PanelBody style={styles.stateBody}>
        <Text size="lg" weight="500" style={styles.center} accessibilityRole="header">
          {title}
        </Text>
        <Text size="sm" muted style={styles.center}>
          {body}
        </Text>
        {children}
      </PanelBody>
    </Panel>
  );
}

function SectionHead({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }): ReactElement {
  const { colors } = useUITheme();
  return (
    <View>
      <View style={styles.inline}>
        <CheckoutIcon name={icon} size={20} color={colors.foreground} />
        <Text size="lg" weight="500" accessibilityRole="header">
          {title}
        </Text>
      </View>
      <Text size="sm" muted>
        {subtitle}
      </Text>
    </View>
  );
}

export function UniversalCartScreen({ mintKey = mintCheckoutKey }: { mintKey?: () => string } = {}): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { cart, cartItems, savedItems, budget, isLoading, error, roleBlocked, patchItem, removeItem, checkout, isPatching, isRemoving, isCheckingOut } = useCommerceCart();
  const { propose, isProposing, reorder, isReordering, roleBlocked: agentRoleBlocked, llmUnavailable, error: agentError } = useShoppingAgent();
  const promptRef = useRef<RNTextInput>(null);
  const idempotencyRef = useRef<CheckoutIdempotencyState | null>(null);
  const [addMoneyOpen, setAddMoneyOpen] = useState(false);
  const [addMoneyCurrency, setAddMoneyCurrency] = useState<WalletCurrency>('EUR');
  const [addMoneyAmount, setAddMoneyAmount] = useState<number | undefined>(undefined);
  const [affiliateRedirects, setAffiliateRedirects] = useState<CheckoutAffiliateRedirect[]>([]);
  const [prompt, setPrompt] = useState('');

  if (roleBlocked) {
    return (
      <ScrollView contentContainerStyle={styles.page} testID="cart-role-blocked">
        <Title />
        <StatePanel title={t('universalCart.page.roleBlockedTitle')} body={t('universalCart.page.roleBlockedBody')} />
      </ScrollView>
    );
  }
  if (isLoading) {
    return (
      <View style={styles.page} testID="cart-loading" accessibilityLabel={t('universalCart.page.loading')}>
        <Title />
        <View style={styles.gap12}>
          <PulseBlock height={88} radius={12} />
          <PulseBlock height={88} radius={12} />
          <PulseBlock height={88} radius={12} />
        </View>
      </View>
    );
  }
  if (error) {
    return (
      <ScrollView contentContainerStyle={styles.page} testID="cart-error">
        <Title />
        <StatePanel title={t('universalCart.page.errorTitle')} body={t('universalCart.page.errorBody')} />
      </ScrollView>
    );
  }

  const agentItems = cartItems.filter((i) => i.metadata?.origin === 'agent');
  const reorderItems = cartItems.filter((i) => i.metadata?.origin === 'reorder');
  const buyableItems = cartItems.filter((i) => i.metadata?.origin !== 'agent' && i.metadata?.origin !== 'reorder');
  const hasAgentSafetyFlags = agentItems.some((i) => Array.isArray(i.metadata?.safety_flags) && (i.metadata.safety_flags as unknown[]).length > 0);
  const budgetAdvisoryKey = budget?.status === 'over' ? 'universalCart.agent.overCapAdvisory' : budget?.status === 'near' ? 'universalCart.agent.nearCapAdvisory' : null;
  const isCartEmpty = !cart || cartItems.length === 0;
  const isSavedEmpty = savedItems.length === 0;

  const onPropose = async () => {
    if (isProposing) return;
    const trimmed = prompt.trim();
    if (!trimmed) {
      promptRef.current?.focus();
      return;
    }
    try {
      await propose({ prompt: trimmed });
      setPrompt('');
    } catch {
      // surfaced by the hook state (role-blocked / unavailable / error)
    }
  };

  const onReorder = async () => {
    if (isReordering) return;
    try {
      await reorder();
    } catch {
      // surfaced by the hook state
    }
  };

  const onQuantity = async (item: UniversalCartItem, next: number) => {
    if (next === item.quantity) return;
    try {
      await patchItem(item.id, { quantity: next });
    } catch {
      notifyError('universalCart.addButton.failed');
    }
  };

  const onRemove = async (item: UniversalCartItem) => {
    try {
      await removeItem(item.id);
    } catch {
      notifyError('universalCart.addButton.failed');
    }
  };

  const onSetSaved = async (item: UniversalCartItem, saved: boolean) => {
    try {
      await patchItem(item.id, { metadata: { ...item.metadata, saved } });
    } catch {
      notifyError('universalCart.addButton.failed');
    }
  };

  const onCheckout = async () => {
    setAffiliateRedirects([]);
    const idem = nextIdempotency(
      idempotencyRef.current,
      cartItems.map((i) => ({ id: i.id, quantity: i.quantity })),
      mintKey,
    );
    idempotencyRef.current = idem;
    try {
      const res = await checkout({ idempotency_key: idem.key });
      idempotencyRef.current = null;
      if (res.affiliate_redirects.length > 0) {
        for (const r of res.affiliate_redirects) openExternal(r.affiliate_url);
        setAffiliateRedirects(res.affiliate_redirects);
        notify('marketplaceCheckout.checkout.affiliateOpened');
      }
      if (res.wallet_order) {
        if (res.wallet_order.duplicate) notify('marketplaceCheckout.checkout.duplicateTitle', 'marketplaceCheckout.checkout.duplicateBody');
        else notify('marketplaceCheckout.checkout.successTitle', 'marketplaceCheckout.checkout.successBody');
        navigateToWebPath(`/checkout/success?checkout_id=${encodeURIComponent(res.checkout_id)}`);
      }
    } catch (err) {
      if (isInsufficientBalanceError(err)) {
        const { required_minor, balance_minor, currency } = err.detail;
        setAddMoneyCurrency(currency);
        setAddMoneyAmount(toMajorUnits(Math.max(required_minor - balance_minor, 0)));
        setAddMoneyOpen(true);
        notifyError(checkoutErrorKey('INSUFFICIENT_BALANCE'));
        return;
      }
      notifyError(checkoutErrorKey(err instanceof UniversalCartApiError ? err.code : undefined));
    }
  };

  const fg = colors.foreground;
  const lineRemove = (item: UniversalCartItem) => (
    <Button variant="ghost" size="icon" accessibilityLabel={t('universalCart.page.removeAction')} disabled={isRemoving} onPress={() => void onRemove(item)} testID={`line-remove-${item.id}`}>
      <CheckoutIcon name="Trash2" size={16} color={fg} />
    </Button>
  );

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" testID="universal-cart">
      <View>
        <View style={styles.between}>
          <Title />
          <Button variant="ghost" size="icon" accessibilityLabel={t('universalCart.page.close')} onPress={() => goBack('/discover')} style={styles.close} testID="cart-close">
            <CheckoutIcon name="X" size={20} color={fg} />
          </Button>
        </View>
        <Text size="sm" muted style={styles.subtitle}>
          {t('universalCart.page.subtitle')}
        </Text>
      </View>

      <Tabs defaultValue="cart">
        <TabsList>
          <TabsTrigger value="cart" testID="cart-tab-cart">
            {t('universalCart.tabs.cart')}
          </TabsTrigger>
          <TabsTrigger value="saved" testID="cart-tab-saved">
            {t('universalCart.tabs.saved')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cart" style={styles.tab} testID="cart-tab-content-cart">
          {budget ? <BudgetMeter budget={budget} /> : null}
          {budgetAdvisoryKey ? (
            <Notice destructive={budget?.status === 'over'} testID="budget-advisory">
              {t(budgetAdvisoryKey)}
            </Notice>
          ) : null}

          <Panel>
            <PanelBody>
              <View style={styles.inline6}>
                <CheckoutIcon name="Sparkles" size={16} color={fg} />
                <Label nativeID="agent-prompt-label">{t('universalCart.agent.promptLabel')}</Label>
              </View>
              <Textarea
                ref={promptRef}
                testID="agent-prompt"
                accessibilityLabel={t('universalCart.agent.promptLabel')}
                accessibilityLabelledBy="agent-prompt-label"
                value={prompt}
                onChangeText={setPrompt}
                placeholder={t('universalCart.agent.promptPlaceholder')}
                rows={2}
                disabled={isProposing}
              />
              <Button onPress={() => void onPropose()} disabled={isProposing} style={styles.full} testID="agent-propose">
                {isProposing ? <Spinner /> : <CheckoutIcon name="Sparkles" size={16} color={colors.primaryForeground} />}
                {isProposing ? t('universalCart.agent.proposing') : t('universalCart.agent.proposeCta')}
              </Button>
              <Button variant="outline" onPress={() => void onReorder()} disabled={isReordering || isProposing} style={styles.full} testID="agent-reorder">
                {isReordering ? <Spinner /> : <CheckoutIcon name="RotateCcw" size={16} color={fg} />}
                {isReordering ? t('universalCart.agent.reordering') : t('universalCart.agent.reorderCta')}
              </Button>
              {agentRoleBlocked ? (
                <Notice destructive testID="agent-role-blocked">
                  {t('universalCart.agent.roleBlocked')}
                </Notice>
              ) : null}
              {llmUnavailable ? (
                <Notice destructive testID="agent-unavailable">
                  {t('universalCart.agent.unavailable')}
                </Notice>
              ) : null}
              {agentError && !agentRoleBlocked && !llmUnavailable ? (
                <Notice destructive testID="agent-error">
                  {t('universalCart.agent.error')}
                </Notice>
              ) : null}
            </PanelBody>
          </Panel>

          {agentItems.length > 0 ? (
            <View style={styles.gap12} testID="agent-section">
              <SectionHead icon="Sparkles" title={t('universalCart.agent.sectionTitle')} subtitle={t('universalCart.agent.sectionSubtitle')} />
              {hasAgentSafetyFlags ? (
                <Notice destructive testID="agent-review-note">
                  {t('universalCart.agent.reviewNote')}
                </Notice>
              ) : null}
              {agentItems.map((item) => (
                <AgentProposalCard key={item.id} item={item} onRemove={(i) => void onRemove(i)} isRemoving={isRemoving} />
              ))}
            </View>
          ) : null}

          {reorderItems.length > 0 ? (
            <View style={styles.gap12} testID="reorder-section">
              <SectionHead icon="RotateCcw" title={t('universalCart.agent.reorderSectionTitle')} subtitle={t('universalCart.agent.reorderSectionSubtitle')} />
              {reorderItems.map((item) => (
                <AgentProposalCard key={item.id} item={item} onRemove={(i) => void onRemove(i)} isRemoving={isRemoving} variant="reorder" />
              ))}
            </View>
          ) : null}

          {isCartEmpty ? (
            <StatePanel title={t('universalCart.page.emptyTitle')} body={t('universalCart.page.emptyBody')} testID="cart-empty">
              <Button variant="outline" onPress={() => navigateToWebPath('/discover')} testID="cart-to-discover" style={styles.mt8}>
                {t('universalCart.page.linkToDiscover')}
              </Button>
            </StatePanel>
          ) : (
            <View style={styles.gap12}>
              <GatewayWalletBalanceCard />
              {buyableItems.map((item) => (
                <Panel key={item.id} testID={`cart-line-${item.id}`}>
                  <View style={styles.lineHead}>
                    <View style={styles.flex}>
                      <CartLineHeader item={item} />
                    </View>
                    {lineRemove(item)}
                  </View>
                  <View style={styles.lineFoot}>
                    <QuantityStepper item={item} onChange={(next) => void onQuantity(item, next)} disabled={isPatching} />
                    <Button variant="outline" size="sm" disabled={isPatching} onPress={() => void onSetSaved(item, true)} testID={`line-save-${item.id}`}>
                      <CheckoutIcon name="Bookmark" size={16} color={fg} />
                      {t('universalCart.saved.saveForLater')}
                    </Button>
                  </View>
                </Panel>
              ))}

              {affiliateRedirects.length > 0 ? (
                <Panel testID="affiliate-redirects">
                  <View style={styles.affiliateHead}>
                    <Text size="sm" weight="500" accessibilityRole="header">
                      {t('marketplaceCheckout.checkout.affiliateTitle')}
                    </Text>
                    <Text size="xs" muted>
                      {t('marketplaceCheckout.checkout.affiliateBody')}
                    </Text>
                  </View>
                  <View style={styles.affiliateList}>
                    {affiliateRedirects.map((r) => (
                      <Button key={r.item_id} variant="outline" size="sm" accessibilityRole="link" onPress={() => openExternal(r.affiliate_url)} style={styles.start} testID={`affiliate-${r.item_id}`}>
                        <CheckoutIcon name="ExternalLink" size={16} color={fg} />
                        {t('marketplaceCheckout.checkout.affiliateLink')}
                      </Button>
                    ))}
                  </View>
                </Panel>
              ) : null}

              <Button size="lg" onPress={() => void onCheckout()} disabled={isCartEmpty || isCheckingOut} style={styles.full} testID="cart-checkout">
                {isCheckingOut ? <Spinner /> : <CheckoutIcon name="ShoppingBag" size={16} color={colors.primaryForeground} />}
                {isCheckingOut ? t('marketplaceCheckout.checkout.processing') : t('marketplaceCheckout.checkout.button')}
              </Button>
            </View>
          )}
        </TabsContent>

        <TabsContent value="saved" style={styles.tab} testID="cart-tab-content-saved">
          {isSavedEmpty ? (
            <StatePanel title={t('universalCart.saved.emptyTitle')} body={t('universalCart.saved.emptyBody')} testID="saved-empty" />
          ) : (
            <View style={styles.gap12}>
              {savedItems.map((item) => (
                <Panel key={item.id} testID={`saved-line-${item.id}`}>
                  <View style={styles.lineHead}>
                    <View style={styles.flex}>
                      <CartLineHeader item={item} />
                    </View>
                    {lineRemove(item)}
                  </View>
                  <View style={[styles.lineFoot, styles.endRow]}>
                    <Button variant="outline" size="sm" disabled={isPatching} onPress={() => void onSetSaved(item, false)} testID={`line-move-${item.id}`}>
                      <CheckoutIcon name="ShoppingBag" size={16} color={fg} />
                      {t('universalCart.saved.moveToCart')}
                    </Button>
                  </View>
                </Panel>
              ))}
            </View>
          )}
        </TabsContent>
      </Tabs>

      <AddMoneyDialog open={addMoneyOpen} onOpenChange={setAddMoneyOpen} initialCurrency={addMoneyCurrency} initialAmountMajor={addMoneyAmount} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 16, paddingVertical: 40, gap: 24 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  between: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  close: { marginEnd: -8 },
  subtitle: { marginTop: 4 },
  center: { textAlign: 'center' },
  stateBody: { paddingVertical: 40, alignItems: 'center', gap: 8 },
  tab: { marginTop: 16, gap: 16 },
  gap12: { gap: 12 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inline6: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  full: { alignSelf: 'stretch' },
  mt8: { marginTop: 8 },
  lineHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: 24, paddingBottom: 8 },
  lineFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 24, paddingBottom: 24 },
  endRow: { justifyContent: 'flex-end' },
  flex: { flex: 1 },
  affiliateHead: { padding: 24, paddingBottom: 8, gap: 4 },
  affiliateList: { paddingHorizontal: 24, paddingBottom: 24, gap: 8 },
  start: { alignSelf: 'stretch', justifyContent: 'flex-start' },
});
