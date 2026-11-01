/**
 * VTID-05424 (Native Wave 2, wallet-rewards lane) — the "Shop" tab
 * (WALLET.REWARDS_SHOP, `?tab=shop`), a port of
 * src/components/wallet/RewardShop.tsx (VTID-04983): spend earned VTNA on
 * rewards. Same sections (summary + earned balance + Stripe-return note, the
 * item cards, "Deine Bestellungen"), same states, same wording keys. Prices
 * come from the gateway; this screen never sends a price.
 *
 * The web redeem Dialog is a bottom sheet with the same fields and the same
 * `ready` rule (balance covers the price, item available, birth date
 * YYYY-MM-DD + age confirmation when age-restricted, a shipping fee in the
 * display currency + name / street / postal code / city when shipped). Its
 * confirm hands the web `RedeemRequest` to `RewardShopActions`
 * (./data/actions.ts; the default is the web `redeemRewardItem`, POST
 * /api/v1/rewards/shop/redeem). The web outcome handling: known error code →
 * its toast, else generic; a checkout URL opens in the system browser (web
 * `window.location.assign`);
 * success → the redeemed toast, the ['wallet'] queries refetch, the sheet
 * closes. The web date input is a text field with the YYYY-MM-DD hint and the
 * country Select is a radio list (N2 has no native date picker / select).
 * The decorative lucide icons (Gift / Package / Ticket / ShoppingBag) are
 * drawn with the shell icon set's ShoppingBag on the title only.
 * React 19: `ReactElement`.
 */
import { useMemo, useState, type ReactElement } from 'react';
import { Image, Linking, StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import {
  Badge,
  BottomSheet,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Icon,
  RadioGroup,
  Text,
  TextInput,
  notifyError,
  useUITheme,
} from '../../ports/ui';
import { Checkbox, notifySuccess } from '../../ports/wallet-rewards';
import { radius } from '../../ports/tokens';
import { useI18n } from '../../i18n/I18nProvider';
import { fmtDate, fmtNumber, fmtRegion } from './format';
import { itemText, useRewardOrders, useRewardShop, type RewardShop as ShopData, type RewardShopItem, type ShopCurrency } from './data/rewards';
import { useRewardShopActions } from './data/actions';
import { useEurPerUsd, useShopCurrency } from './data/currency';

const KNOWN_ERRORS = new Set([
  'INSUFFICIENT_BALANCE',
  'OUT_OF_STOCK',
  'UNDER_MIN_AGE',
  'AGE_CONFIRMATION_REQUIRED',
  'ADDRESS_REQUIRED',
  'SHIPPING_NOT_AVAILABLE',
  'ITEM_NOT_AVAILABLE',
  'NOT_ELIGIBLE',
  'CHECKOUT_FAILED',
]);

const ADDRESS_FIELDS = ['name', 'line1', 'line2', 'postal_code', 'city'] as const;
type Address = Record<(typeof ADDRESS_FIELDS)[number], string>;

/** The web fallback key (it prefers crypto.randomUUID; the gateway only needs a unique key per dialog). */
function newKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function useMoney(currency: ShopCurrency): (eur: number) => string {
  const { locale } = useI18n();
  const eurPerUsd = useEurPerUsd();
  return (eur: number) => {
    const value = currency === 'EUR' ? eur : eur / eurPerUsd;
    return fmtNumber(locale, value, { style: 'currency', currency, maximumFractionDigits: 2 });
  };
}

function ItemCard({ item, money, onOpen }: { item: RewardShopItem; money: (eur: number) => string; onOpen: () => void }): ReactElement {
  const { t, locale } = useI18n();
  const title = itemText(item.titles, locale, item.slug);
  return (
    <Card testID={`reward-shop-item-${item.slug}`} style={styles.item}>
      {item.images[0] ? <Image source={{ uri: item.images[0] }} accessibilityLabel={title} style={styles.image} resizeMode="cover" /> : null}
      <CardHeader style={styles.gapSm}>
        <CardTitle>{title}</CardTitle>
        <View style={styles.metaRow}>
          <Text size="xs" muted>
            {t(`wallet.rewardShop.fulfilment.${item.fulfilment}`)}
          </Text>
          {item.age_restricted ? <Badge variant="outline">{t('wallet.rewardShop.ageBadge', { age: fmtNumber(locale, item.min_age ?? 18) })}</Badge> : null}
        </View>
      </CardHeader>
      <CardContent style={styles.gap}>
        <View style={styles.priceRow}>
          <Text size="xl" weight="700" testID={`reward-shop-price-${item.slug}`}>
            {t('wallet.rewardShop.price', { amount: fmtNumber(locale, item.vtna_price) })}
          </Text>
          <Text size="sm" muted>
            {t('wallet.rewardShop.approx', { money: money(item.eur_value) })}
          </Text>
        </View>
        <Button disabled={!item.available} onPress={onOpen} testID={`reward-shop-open-${item.slug}`}>
          {item.available ? t('wallet.rewardShop.view') : t('wallet.rewardShop.soldOut')}
        </Button>
      </CardContent>
    </Card>
  );
}

function RedeemSheet({
  item,
  shop,
  currency,
  money,
  onClose,
}: {
  item: RewardShopItem;
  shop: ShopData;
  currency: ShopCurrency;
  money: (eur: number) => string;
  onClose: () => void;
}): ReactElement {
  const { t, locale } = useI18n();
  const { colors } = useUITheme();
  const queryClient = useQueryClient();
  const actions = useRewardShopActions();
  const [key] = useState(newKey);
  const [busy, setBusy] = useState(false);
  const [birthDate, setBirthDate] = useState('');
  const [ageOk, setAgeOk] = useState(false);
  const countries = useMemo(
    () => item.ships_to_countries.filter((c) => shop.shipping_fees.some((f) => f.country === c && f.currency === currency)),
    [item, shop, currency],
  );
  const [country, setCountry] = useState(countries[0] ?? '');
  const [addr, setAddr] = useState<Address>({ name: '', line1: '', line2: '', postal_code: '', city: '' });
  const fee = shop.shipping_fees.find((f) => f.country === country && f.currency === currency);
  const shortfall = Math.max(0, item.vtna_price - shop.earned_balance);
  const ship = item.fulfilment === 'ship';
  const title = itemText(item.titles, locale, item.slug);
  const description = itemText(item.descriptions, locale, '');

  const ready =
    shortfall === 0 &&
    item.available &&
    (!item.age_restricted || (ageOk && /^\d{4}-\d{2}-\d{2}$/.test(birthDate))) &&
    (!ship || (!!fee && !!addr.name.trim() && !!addr.line1.trim() && !!addr.postal_code.trim() && !!addr.city.trim()));

  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    const res = await actions
      .redeem({
        item_id: item.id,
        idempotency_key: key,
        currency,
        locale,
        ...(ship ? { country, address: { ...addr, line2: addr.line2 || undefined } } : {}),
        ...(item.age_restricted ? { birth_date: birthDate, age_confirmed: ageOk } : {}),
      })
      .catch(() => ({ ok: false as const, error: 'NETWORK' }));
    setBusy(false);
    if (res.ok !== true) {
      notifyError(`wallet.rewardShop.errors.${KNOWN_ERRORS.has(res.error) ? res.error : 'generic'}`);
      return;
    }
    if (res.checkout_url) {
      void Linking.openURL(res.checkout_url);
      return;
    }
    notifySuccess('wallet.rewardShop.redeemed', undefined, { item: title });
    void queryClient.invalidateQueries({ queryKey: ['wallet'] });
    onClose();
  };

  return (
    <BottomSheet open onClose={onClose} title={title} testID="reward-shop-dialog">
      {description ? <Text muted>{description}</Text> : null}
      <View style={styles.priceRow}>
        <Text weight="600">{t('wallet.rewardShop.price', { amount: fmtNumber(locale, item.vtna_price) })}</Text>
        <Text size="sm" muted>
          {t('wallet.rewardShop.approx', { money: money(item.eur_value) })}
        </Text>
      </View>
      <Text size="sm" testID="reward-shop-balance">
        {shortfall > 0
          ? t('wallet.rewardShop.shortfall', { amount: fmtNumber(locale, shortfall) })
          : t('wallet.rewardShop.balance', { amount: fmtNumber(locale, shop.earned_balance) })}
      </Text>

      {item.age_restricted ? (
        <View style={[styles.box, { borderColor: colors.border }]}>
          <Text size="sm" weight="500">
            {t('wallet.rewardShop.birthDate')}
          </Text>
          <TextInput
            testID="reward-birth-date"
            value={birthDate}
            onChangeText={setBirthDate}
            accessibilityLabel={t('wallet.rewardShop.birthDate')}
            placeholder={t('walletRewardsNative.shop.birthDatePlaceholder')}
            keyboardType="numbers-and-punctuation"
            autoCorrect={false}
          />
          <View style={styles.checkRow}>
            <Checkbox
              testID="reward-age-confirm"
              checked={ageOk}
              onCheckedChange={(v) => setAgeOk(v === true)}
              accessibilityLabel={t('wallet.rewardShop.ageConfirm', { age: fmtNumber(locale, item.min_age ?? 18) })}
            />
            <Text size="sm" style={styles.fill}>
              {t('wallet.rewardShop.ageConfirm', { age: fmtNumber(locale, item.min_age ?? 18) })}
            </Text>
          </View>
        </View>
      ) : null}

      {ship ? (
        <View style={[styles.box, { borderColor: colors.border }]}>
          <Text weight="500">{t('wallet.rewardShop.shippingTitle')}</Text>
          {countries.length === 0 ? (
            <Text size="sm" muted>
              {t('wallet.rewardShop.noShipping')}
            </Text>
          ) : (
            <>
              <Text size="sm" weight="500">
                {t('wallet.rewardShop.country')}
              </Text>
              <RadioGroup
                accessibilityLabel={t('wallet.rewardShop.country')}
                options={countries.map((c) => ({ value: c, label: fmtRegion(locale, c) }))}
                value={country}
                onChange={setCountry}
              />
              {ADDRESS_FIELDS.map((f) => (
                <View key={f} style={styles.gapSm}>
                  <Text size="sm" weight="500">
                    {t(`wallet.rewardShop.address.${f}`)}
                  </Text>
                  <TextInput
                    testID={`reward-addr-${f}`}
                    value={addr[f]}
                    accessibilityLabel={t(`wallet.rewardShop.address.${f}`)}
                    onChangeText={(v) => setAddr((a) => ({ ...a, [f]: v }))}
                  />
                </View>
              ))}
              {fee ? (
                <Text size="sm" testID="reward-shop-fee">
                  {t('wallet.rewardShop.shippingFee', {
                    money: fmtNumber(locale, fee.fee_cents / 100, { style: 'currency', currency: fee.currency }),
                  })}
                </Text>
              ) : null}
              <Text size="xs" muted>
                {t('wallet.rewardShop.shippingNote')}
              </Text>
            </>
          )}
        </View>
      ) : null}

      <View style={styles.footer}>
        <Button variant="outline" onPress={onClose} testID="reward-shop-cancel">
          {t('wallet.rewardShop.cancel')}
        </Button>
        <Button onPress={() => void submit()} disabled={!ready || busy} testID="reward-shop-confirm">
          {ship ? t('wallet.rewardShop.payShipping') : t('wallet.rewardShop.redeem')}
        </Button>
      </View>
    </BottomSheet>
  );
}

function Orders({ shop }: { shop: ShopData }): ReactElement | null {
  const { t, locale } = useI18n();
  const { colors } = useUITheme();
  const { data } = useRewardOrders();
  if (!data || data.length === 0) return null;
  const titleOf = (id: string) => {
    const it = shop.items.find((i) => i.id === id);
    return it ? itemText(it.titles, locale, it.slug) : t('wallet.rewardShop.unknownItem');
  };
  return (
    <Card testID="reward-shop-orders">
      <CardHeader>
        <CardTitle>{t('wallet.rewardShop.ordersTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.map((o, i) => (
          <View key={o.id} style={[styles.orderRow, i === data.length - 1 ? null : { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
            <View style={styles.fill}>
              <Text>{titleOf(o.item_id)}</Text>
              <Text size="xs" muted>
                {fmtDate(locale, o.created_at)}
              </Text>
            </View>
            <View style={styles.orderEnd}>
              <Badge variant="secondary">{t(`wallet.rewardShop.status.${o.status}`)}</Badge>
              <Text size="xs" muted>
                {t('wallet.rewardShop.price', { amount: fmtNumber(locale, o.vtna_amount) })}
              </Text>
            </View>
          </View>
        ))}
      </CardContent>
    </Card>
  );
}

export function RewardShop({ shippingReturn }: { shippingReturn?: 'paid' | 'cancelled' | null }): ReactElement {
  const { t, locale } = useI18n();
  const { colors } = useUITheme();
  const { data, isPending, error } = useRewardShop();
  const currency = useShopCurrency();
  const money = useMoney(currency);
  const [open, setOpen] = useState<RewardShopItem | null>(null);

  if (isPending) {
    return (
      <Text muted testID="reward-shop-loading">
        {t('wallet.rewardShop.loading')}
      </Text>
    );
  }
  if (error || !data) {
    return (
      <Text color={colors.destructive} testID="reward-shop-error">
        {t('wallet.rewardShop.error')}
      </Text>
    );
  }

  return (
    <View style={styles.stack} testID="reward-shop">
      <Card>
        <CardHeader style={styles.titleRow}>
          <Icon name="ShoppingBag" size={20} color={colors.primary} />
          <CardTitle>{t('wallet.rewardShop.title')}</CardTitle>
        </CardHeader>
        <CardContent style={styles.gapSm}>
          <Text>{t('wallet.rewardShop.summary')}</Text>
          <Text size="sm" muted testID="reward-shop-earned">
            {t('wallet.rewardShop.balance', { amount: fmtNumber(locale, data.earned_balance) })}
          </Text>
          {shippingReturn === 'paid' ? (
            <Text size="sm" color={colors.statusSuccess} testID="reward-shop-return-paid">
              {t('wallet.rewardShop.returnPaid')}
            </Text>
          ) : null}
          {shippingReturn === 'cancelled' ? (
            <Text size="sm" muted>
              {t('wallet.rewardShop.returnCancelled')}
            </Text>
          ) : null}
        </CardContent>
      </Card>

      {data.items.length === 0 ? (
        <Text muted testID="reward-shop-empty">
          {t('wallet.rewardShop.empty')}
        </Text>
      ) : (
        <View style={styles.grid}>
          {data.items.map((item) => (
            <ItemCard key={item.id} item={item} money={money} onOpen={() => setOpen(item)} />
          ))}
        </View>
      )}

      <Orders shop={data} />

      {open ? <RedeemSheet item={open} shop={data} currency={currency} money={money} onClose={() => setOpen(null)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 24 },
  grid: { gap: 16 },
  gap: { gap: 12 },
  gapSm: { gap: 8 },
  fill: { flex: 1, minWidth: 0 },
  item: { overflow: 'hidden' },
  image: { height: 160, width: '100%' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  box: { gap: 8, borderWidth: 1, borderRadius: radius.md, padding: 12 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  orderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 8 },
  orderEnd: { alignItems: 'flex-end', gap: 4 },
});
