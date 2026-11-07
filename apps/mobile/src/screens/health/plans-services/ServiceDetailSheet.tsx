/**
 * VTID-05456 (native-wave2-health-biology-r3/health-plans-services) — twin of
 * `src/components/health/ServiceDetailDrawer.tsx` (the Services Hub card
 * sheet): header (icon, title, category + impact badges, long description),
 * the service details card (duration, price, location, next available), the
 * Book Now / Add Plan / Ask AI row, what's included, health benefits,
 * available providers, requirements and tags. The detail record is the web's
 * own sample (`mockServiceDetails`, through `@vitana/core/health-plans`).
 *
 * Book Now opens the web `BookingPaymentFlow` (ServiceDetailDrawer.tsx:188,
 * 320-347), a purchase surface that starts a Stripe checkout through the
 * `stripe-create-booking-checkout` edge function and reads the wallet
 * balance (BookingPaymentFlow.tsx:144-176). That flow is not part of this
 * reads-only port (no live write, plan decision 3a), so the button is shown
 * but disabled; no iOS purchase gate changes. Add Plan and Ask AI have no
 * handler on the web (:192-199) and none here. Provider photos are web-relative
 * `/lovable-uploads/…` paths, so the avatar shows the initials fallback.
 */
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Avatar, Badge, Button, Text, useUITheme } from '../../../ports/ui';
import { HealthIcon, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, mockServiceDetails, useHealthPalette, type Hue } from '../../../ports/health-plans';
import { useI18n } from '../../../i18n/I18nProvider';
import { IconTile, healthStyles } from './components';

export type ServiceCard = {
  id: string;
  titleKey: string;
  descKey: string;
  icon: string;
  hue: Hue;
  /** The web "+N points" badge. */
  impact?: number;
  countKey?: string;
  suggestionKey?: string;
};

function Section({ icon, iconColor, title, children }: { icon: string; iconColor: string; title: string; children: ReactNode }) {
  const { colors } = useUITheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={healthStyles.row}>
        <HealthIcon name={icon} size={20} color={iconColor} />
        <Text size="lg" weight="600">
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

function Line({ icon, color, text }: { icon: string; color: string; text: string }) {
  return (
    <View style={healthStyles.row}>
      <HealthIcon name={icon} size={16} color={color} />
      <Text size="sm" style={healthStyles.fill}>
        {text}
      </Text>
    </View>
  );
}

const initials = (name: string) =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('');

export function ServiceDetailSheet({ service, onClose }: { service: ServiceCard | null; onClose: () => void }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const palette = useHealthPalette();
  const detail = service ? mockServiceDetails[service.id] : undefined;
  if (!service || !detail) return null;

  return (
    <Sheet open onOpenChange={(next: boolean) => (next ? undefined : onClose())}>
      <SheetContent side="right" testID="health-service-detail-sheet">
        <ScrollView contentContainerStyle={styles.body} testID="health-service-detail">
          <SheetHeader>
            <View style={healthStyles.row}>
              <IconTile name={service.icon} tint={palette.hue[service.hue]} />
              <View style={healthStyles.fill}>
                <SheetTitle>{detail.title}</SheetTitle>
                <View style={healthStyles.wrap}>
                  <Badge variant="outline">
                    <Text size="xs">{detail.category}</Text>
                  </Badge>
                  {detail.vitanaImpact ? (
                    <Badge variant="secondary" style={{ backgroundColor: palette.successSubtle }}>
                      <Text size="xs" color={palette.success}>
                        {detail.vitanaImpact}
                      </Text>
                    </Badge>
                  ) : null}
                </View>
              </View>
            </View>
            <SheetDescription>{detail.longDescription}</SheetDescription>
          </SheetHeader>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text size="lg" weight="600">
              {t('screens.health.serviceDetails')}
            </Text>
            <View style={styles.facts}>
              {[
                { icon: 'Clock', value: detail.duration, label: t('screens.health.duration') },
                { icon: 'CreditCard', value: detail.price, label: t('screens.health.price') },
                { icon: 'MapPin', value: detail.location, label: t('screens.health.location') },
              ].map((f) => (
                <View key={f.icon} style={[healthStyles.row, styles.fact]}>
                  <HealthIcon name={f.icon} size={16} color={colors.mutedForeground} />
                  <View style={healthStyles.fill}>
                    <Text size="sm" weight="500">
                      {f.value}
                    </Text>
                    <Text size="xs" muted>
                      {f.label}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
            <View style={[healthStyles.row, styles.next, { backgroundColor: palette.successSubtle }]}>
              <HealthIcon name="Calendar" size={16} color={palette.success} />
              <Text size="sm" weight="500" color={palette.success}>
                {t('screens.health.nextAvailableNextavailable', { nextAvailable: detail.nextAvailable })}
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            <Button size="lg" style={healthStyles.fill} disabled accessibilityState={{ disabled: true }} testID="health-service-book-now">
              {t('screens.health.bookNow')}
            </Button>
            <Button size="lg" variant="outline" style={healthStyles.fill}>
              {t('screens.health.addPlan')}
            </Button>
            <Button size="lg" variant="outline">
              {t('screens.health.askAi')}
            </Button>
          </View>

          <Section icon="CheckCircle" iconColor={palette.success} title={t('screens.health.whatSIncluded')}>
            {detail.features.map((f) => (
              <Line key={f} icon="CheckCircle" color={palette.success} text={f} />
            ))}
          </Section>

          <Section icon="Heart" iconColor={palette.error} title={t('screens.health.healthBenefits')}>
            {detail.benefits.map((b) => (
              <Line key={b} icon="Heart" color={palette.error} text={b} />
            ))}
          </Section>

          <Section icon="Users" iconColor={palette.category[3]} title={t('screens.health.availableProviders')}>
            {detail.providers.map((p) => (
              <View key={p.id} style={[styles.provider, { borderColor: colors.border }]} testID={`health-service-provider-${p.id}`}>
                <Avatar fallback={initials(p.name)} size={48} />
                <View style={healthStyles.fill}>
                  <View style={healthStyles.between}>
                    <Text weight="500">{p.name}</Text>
                    <View style={healthStyles.row}>
                      <HealthIcon name="Star" size={16} color={palette.warning} />
                      <Text size="sm" weight="500">
                        {String(p.rating)}
                      </Text>
                      <Text size="xs" muted>
                        {`(${p.reviews})`}
                      </Text>
                    </View>
                  </View>
                  <Text size="sm" muted>
                    {p.title}
                  </Text>
                  <View style={[healthStyles.wrap, styles.providerTags]}>
                    <View style={[styles.tag, { backgroundColor: palette.hue.purple }]}>
                      <Text size="xs" color={palette.category[3]}>
                        {p.experience}
                      </Text>
                    </View>
                    {p.specialties.slice(0, 2).map((sp) => (
                      <View key={sp} style={[styles.tag, { backgroundColor: colors.muted }]}>
                        <Text size="xs" muted>
                          {sp}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            ))}
          </Section>

          {detail.requirements.length > 0 ? (
            <Section icon="Shield" iconColor={palette.warning} title={t('screens.health.requirementsPreparation')}>
              {detail.requirements.map((r) => (
                <Line key={r} icon="Shield" color={palette.warning} text={r} />
              ))}
            </Section>
          ) : null}

          {detail.tags.length > 0 ? (
            <View style={styles.tags}>
              <Text weight="500">{t('screens.health.tags')}</Text>
              <View style={healthStyles.wrap}>
                {detail.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    <Text size="xs">{tag}</Text>
                  </Badge>
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>
      </SheetContent>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 24, paddingBottom: 32 },
  card: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 12 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  fact: { minWidth: 90, flexGrow: 1 },
  next: { padding: 12, borderRadius: 8 },
  actions: { flexDirection: 'row', gap: 12 },
  provider: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 12, borderWidth: 1, borderRadius: 8 },
  providerTags: { marginTop: 4 },
  tag: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
  tags: { gap: 8 },
});
