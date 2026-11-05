/**
 * VTID-05451 (native-wave2-public-auth-onboarding-r3/public-legal) — `/apply`:
 * native twin of src/pages/Apply.tsx (mobile branch). German by default with
 * the route-scoped DE / EN toggle (resolved against that catalog only, no
 * global locale change): hero (overline, two-line headline, three lines, three
 * chips, the "to the form" button), the three value cards, the explainer
 * (four entity rows + benefits), the application form or its success panel,
 * and the footer (© line, Privacy / Terms with `?lang=`). Same `apply.*` keys,
 * fields, validation and payload (apply-form.ts). Errors are toasts in the
 * page's language, like the web `toast.error(t(…))`.
 *
 * Native differences (program §4 allowed set): no confetti burst and no hero
 * video (the web's HERO_VIDEO_URL is null); the page gradient is the token
 * card / background surface.
 */
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type TextInputProps } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Card, PressableRow, Text, TextInput, useUITheme } from '../../ports/ui';
import { Checkbox, PublicIcon, toast, usePublicPalette, withAlpha } from '../../ports/public';
import { getSupabase } from '../../auth/client';
import { useScopedT, LocaleToggle, type ScopedT } from './legal';
import { EMPTY_APPLY_FORM, applicationPayload, submitApplication, validateApplication, type ApplyFormState, type ApplyLocale, type Device } from './apply-form';

function Chip({ icon, children }: { icon: string; children: ReactNode }) {
  const { colors } = useUITheme();
  return (
    <View style={[styles.chip, { borderColor: colors.border, backgroundColor: withAlpha(colors.card, 0.6) }]}>
      <PublicIcon name={icon} size={14} />
      <Text size="xs" weight="500">
        {children}
      </Text>
    </View>
  );
}

function ValueCard({ icon, title, body, accent }: { icon: string; title: string; body: string; accent: string }) {
  return (
    <Card style={styles.valueCard}>
      <View style={[styles.valueIcon, { backgroundColor: withAlpha(accent, 0.15) }]}>
        <PublicIcon name={icon} size={20} color={accent} />
      </View>
      <Text size="lg" editorial style={styles.mt3}>
        {title}
      </Text>
      <Text size="sm" muted style={styles.mt1}>
        {body}
      </Text>
    </Card>
  );
}

function EntityRow({ label, tag, description, tagline, accent }: { label: string; tag: string; description: string; tagline?: string; accent: string }) {
  return (
    <View style={styles.entity}>
      <View style={styles.entityHead}>
        <Text size="xl" editorial>
          {label}
        </Text>
        <View style={[styles.tag, { backgroundColor: withAlpha(accent, 0.15) }]}>
          <Text size="xs" weight="600" color={accent}>
            {tag}
          </Text>
        </View>
      </View>
      <Text size="sm" muted>
        {description}
      </Text>
      {tagline ? (
        <Text editorial color={accent} style={styles.italic}>
          {tagline}
        </Text>
      ) : null}
    </View>
  );
}

function Field({ id, label, help, required, accent, ...input }: { id: string; label: string; help?: string; required?: boolean; accent: string } & TextInputProps) {
  return (
    <View style={styles.field}>
      <Text size="sm" weight="500" nativeID={`apply-${id}-label`}>
        {label}
        {required ? <Text color={accent}> *</Text> : null}
      </Text>
      <TextInput testID={`apply-${id}`} accessibilityLabel={label} accessibilityLabelledBy={`apply-${id}-label`} {...input} />
      {help ? (
        <Text size="xs" muted>
          {help}
        </Text>
      ) : null}
    </View>
  );
}

function ConsentRow({ id, checked, onChange, label, required, accent }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string; required?: boolean; accent: string }) {
  return (
    <PressableRow testID={`apply-${id}`} accessibilityRole="button" accessibilityState={{ checked }} accessibilityLabel={label} onPress={() => onChange(!checked)} style={styles.consent}>
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(v === true)} accessibilityLabel={label} style={styles.checkbox} />
      <Text size="sm" muted style={styles.flex}>
        {label}
        {required ? <Text color={accent}> *</Text> : null}
      </Text>
    </PressableRow>
  );
}

function SuccessPanel({ email, t }: { email: string; t: ScopedT }) {
  const palette = usePublicPalette();
  return (
    <Card testID="apply-success" style={styles.success}>
      <View style={[styles.successIcon, { backgroundColor: palette.successSubtle }]}>
        <PublicIcon name="CheckCircle2" size={28} color={palette.success} />
      </View>
      <Text size="2xl" editorial accessibilityRole="header" style={styles.center}>
        {t('apply.successTitle')}
      </Text>
      <Text muted style={styles.center}>
        {t('apply.successBody', { email })}
      </Text>
      <Text size="sm" muted style={styles.center}>
        {t('apply.successHint')}
      </Text>
    </Card>
  );
}

export function ApplyScreen() {
  const { colors } = useUITheme();
  const palette = usePublicPalette();
  const accent = palette.category[4];
  const params = useLocalSearchParams<{ utm_source?: string; utm_medium?: string; utm_campaign?: string }>();
  const [locale, setLocale] = useState<ApplyLocale>('de');
  const t = useScopedT(locale);
  const [form, setForm] = useState<ApplyFormState>(EMPTY_APPLY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const scroll = useRef<ScrollView | null>(null);
  const formY = useRef(0);

  const utm = useMemo(
    () => ({
      utm_source: typeof params.utm_source === 'string' && params.utm_source ? params.utm_source : null,
      utm_medium: typeof params.utm_medium === 'string' && params.utm_medium ? params.utm_medium : null,
      utm_campaign: typeof params.utm_campaign === 'string' && params.utm_campaign ? params.utm_campaign : null,
    }),
    [params.utm_source, params.utm_medium, params.utm_campaign],
  );

  const update = <K extends keyof ApplyFormState>(key: K, value: ApplyFormState[K]) => setForm((s) => ({ ...s, [key]: value }));

  const submit = async () => {
    const invalid = validateApplication(form);
    if (invalid) {
      toast.error(t(invalid));
      return;
    }
    const payload = applicationPayload(form, locale, utm);
    setSubmitting(true);
    let errorKey: string | null;
    try {
      errorKey = await submitApplication(getSupabase(), payload);
    } catch {
      errorKey = 'apply.errorGeneric';
    }
    setSubmitting(false);
    if (errorKey) {
      toast.error(t(errorKey));
      return;
    }
    setSuccess(payload.email);
  };

  return (
    <ScrollView ref={scroll} testID="apply-screen" style={{ backgroundColor: colors.background }} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <View style={styles.toggleRow}>
        <LocaleToggle testID="apply-locale" value={locale} onChange={setLocale} t={t} />
      </View>

      <View style={styles.hero}>
        <Text size="xs" weight="600" muted style={[styles.center, styles.overline]}>
          {t('apply.overline')}
        </Text>
        <Text editorial accessibilityRole="header" style={[styles.headline, { color: colors.foreground }]}>
          {t('apply.headlineLine1')}
          {'\n'}
          <Text editorial style={[styles.headline, styles.italic, { color: accent }]}>
            {t('apply.headlineLine2')}
          </Text>
        </Text>
        <Text style={styles.center}>{t('apply.subheadline')}</Text>
        <Text style={styles.center}>{t('apply.subheadlineTicket')}</Text>
        <Text style={styles.center}>{t('apply.subheadlineCommunity')}</Text>
        <View style={styles.chips}>
          <Chip icon="Sparkles">{t('apply.chipEvents')}</Chip>
          <Chip icon="MapPin">{t('apply.chipLocation')}</Chip>
          <Chip icon="Ticket">{t('apply.chipTicket')}</Chip>
        </View>
        <PressableRow
          testID="apply-scroll"
          accessibilityLabel={t('apply.ctaScroll')}
          onPress={() => scroll.current?.scrollTo({ y: formY.current, animated: true })}
          style={[styles.cta, { backgroundColor: colors.mutedForeground }]}
        >
          <Text size="sm" weight="600" color={colors.primaryForeground}>
            {t('apply.ctaScroll')}
          </Text>
          <PublicIcon name="ArrowDown" size={16} color={colors.primaryForeground} />
        </PressableRow>
      </View>

      <View style={styles.section}>
        <ValueCard icon="Sparkles" accent={accent} title={t('apply.valueAccessTitle')} body={t('apply.valueAccessBody')} />
        <ValueCard icon="Ticket" accent={accent} title={t('apply.valueTicketTitle')} body={t('apply.valueTicketBody')} />
        <ValueCard icon="MapPin" accent={accent} title={t('apply.valueMovementTitle')} body={t('apply.valueMovementBody')} />
      </View>

      <Card style={styles.about}>
        <Text size="xs" weight="600" color={accent} style={styles.eyebrow}>
          {t('apply.aboutEyebrow')}
        </Text>
        <Text size="2xl" editorial accessibilityRole="header" style={styles.mt1}>
          {t('apply.aboutTitle')}
        </Text>
        <View style={styles.entities}>
          <EntityRow accent={accent} label={t('apply.aboutVitanalandLabel')} tag={t('apply.aboutVitanalandTag')} description={t('apply.aboutVitanalandDescription')} />
          <EntityRow accent={accent} label={t('apply.aboutVitanaLabel')} tag={t('apply.aboutVitanaTag')} description={t('apply.aboutVitanaDescription')} />
          <EntityRow accent={accent} label={t('apply.aboutMaxinaLabel')} tag={t('apply.aboutMaxinaTag')} description={t('apply.aboutMaxinaDescription')} />
          <EntityRow
            accent={accent}
            label={t('apply.aboutMaxinaExperienceLabel')}
            tag={t('apply.aboutMaxinaExperienceTag')}
            description={t('apply.aboutMaxinaExperienceDescription')}
            tagline={t('apply.tagline')}
          />
        </View>
        <View style={[styles.benefits, { borderColor: colors.border }]}>
          <Text size="xs" weight="600" color={accent} style={styles.eyebrow}>
            {t('apply.benefitsEyebrow')}
          </Text>
          <Text size="xl" editorial style={styles.mt1}>
            {t('apply.benefitsTitle')}
          </Text>
          {(['benefitTicket', 'benefitEvents', 'benefitVitana', 'benefitSeat'] as const).map((k) => (
            <View key={k} style={styles.benefit}>
              <PublicIcon name="CheckCircle2" size={16} color={accent} />
              <Text size="sm" muted style={styles.flex}>
                {t(`apply.${k}`)}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <View
        onLayout={(e) => {
          formY.current = e.nativeEvent.layout.y;
        }}
      >
        {success ? (
          <SuccessPanel email={success} t={t} />
        ) : (
          <Card testID="apply-form" accessibilityLabel={t('apply.ariaApplyForm')} style={styles.form}>
            <Text size="xs" weight="600" color={accent} style={styles.eyebrow}>
              {t('apply.formEyebrow')}
            </Text>
            <Text size="2xl" editorial accessibilityRole="header" style={styles.mt1}>
              {t('apply.formTitle')}
            </Text>
            <Text size="sm" muted style={styles.mt1}>
              {t('apply.formIntro')}
            </Text>

            <View style={styles.fields}>
              <Field id="full_name" accent={accent} required label={t('apply.nameLabel')} placeholder={t('apply.namePlaceholder')} autoComplete="name" value={form.full_name} onChangeText={(v) => update('full_name', v)} />
              <Field
                id="email"
                accent={accent}
                required
                label={t('apply.emailLabel')}
                placeholder={t('apply.emailPlaceholder')}
                autoComplete="email"
                keyboardType="email-address"
                autoCapitalize="none"
                value={form.email}
                onChangeText={(v) => update('email', v)}
              />
              <Field id="phone" accent={accent} required label={t('apply.phoneLabel')} placeholder={t('apply.phonePlaceholder')} autoComplete="tel" keyboardType="phone-pad" value={form.phone} onChangeText={(v) => update('phone', v)} />
              <Field
                id="instagram_handle"
                accent={accent}
                required
                label={t('apply.instagramLabel')}
                help={t('apply.instagramHelp')}
                placeholder={t('apply.instagramPlaceholder')}
                autoComplete="username"
                autoCapitalize="none"
                value={form.instagram_handle}
                onChangeText={(v) => update('instagram_handle', v)}
              />

              <View style={styles.field}>
                <Text size="sm" weight="500">
                  {t('apply.deviceLabel')}
                  <Text color={accent}> *</Text>
                </Text>
                <View accessibilityRole="radiogroup" accessibilityLabel={t('apply.deviceLabel')} style={styles.devices}>
                  {(['ios', 'android'] as const).map((d: Device) => {
                    const on = form.device === d;
                    return (
                      <PressableRow
                        key={d}
                        testID={`apply-device-${d}`}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: on, checked: on }}
                        accessibilityLabel={t(d === 'ios' ? 'apply.deviceIos' : 'apply.deviceAndroid')}
                        onPress={() => update('device', d)}
                        style={[styles.device, { borderColor: on ? accent : colors.border, backgroundColor: on ? withAlpha(accent, 0.1) : colors.card }]}
                      >
                        <Text size="sm" weight="500" color={on ? accent : colors.mutedForeground}>
                          {t(d === 'ios' ? 'apply.deviceIos' : 'apply.deviceAndroid')}
                        </Text>
                      </PressableRow>
                    );
                  })}
                </View>
              </View>

              {form.device === 'android' ? (
                <Field
                  id="google_account_email"
                  accent={accent}
                  required
                  label={t('apply.googleEmailLabel')}
                  help={t('apply.googleEmailHelp')}
                  placeholder={t('apply.googleEmailPlaceholder')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={form.google_account_email}
                  onChangeText={(v) => update('google_account_email', v)}
                />
              ) : null}

              <Field id="location" accent={accent} required label={t('apply.locationLabel')} placeholder={t('apply.locationPlaceholder')} value={form.location} onChangeText={(v) => update('location', v)} />

              <ConsentRow id="available_for_events" accent={accent} checked={form.available_for_events} onChange={(v) => update('available_for_events', v)} label={t('apply.availabilityLabel')} />
              <ConsentRow id="consent_age" accent={accent} required checked={form.consent_age} onChange={(v) => update('consent_age', v)} label={t('apply.consentAgeLabel')} />
              <ConsentRow id="consent_terms" accent={accent} required checked={form.consent_terms} onChange={(v) => update('consent_terms', v)} label={t('apply.consentTermsLabel')} />
            </View>

            <PressableRow
              testID="apply-submit"
              disabled={submitting}
              accessibilityLabel={submitting ? t('apply.submitting') : t('apply.submit')}
              accessibilityState={{ disabled: submitting }}
              onPress={() => void submit()}
              style={[styles.submit, { backgroundColor: accent, opacity: submitting ? 0.6 : 1 }]}
            >
              <Text size="sm" weight="600" color={colors.primaryForeground}>
                {submitting ? t('apply.submitting') : t('apply.submit')}
              </Text>
            </PressableRow>
          </Card>
        )}
      </View>

      <View style={[styles.footer, { borderColor: withAlpha(colors.border, 0.4) }]}>
        <Text size="xs" muted>
          {t('publicLegalNative.copyright', { text: t('apply.footerCopy') })}
        </Text>
        <View style={styles.footerLinks}>
          <PressableRow testID="apply-footer-privacy" accessibilityRole="link" onPress={() => router.navigate(`/privacy?lang=${locale}` as never)}>
            <Text size="xs" muted>
              {t('apply.footerPrivacy')}
            </Text>
          </PressableRow>
          <PressableRow testID="apply-footer-terms" accessibilityRole="link" onPress={() => router.navigate(`/terms?lang=${locale}` as never)}>
            <Text size="xs" muted>
              {t('apply.footerTerms')}
            </Text>
          </PressableRow>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 32 },
  toggleRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  hero: { alignItems: 'center', gap: 10 },
  overline: { letterSpacing: 4, textTransform: 'uppercase' },
  // text-[38px] leading-[1.05]: the editorial headline at 1.6 × the token 2xl.
  headline: { fontSize: 38, lineHeight: 40, textAlign: 'center' },
  italic: { fontStyle: 'italic' },
  center: { textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  cta: { marginTop: 10, minHeight: 44, borderRadius: 999, paddingHorizontal: 32, justifyContent: 'center', gap: 8 },
  section: { gap: 16 },
  valueCard: { padding: 20 },
  valueIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  mt1: { marginTop: 4 },
  mt3: { marginTop: 12 },
  about: { padding: 24, borderRadius: 24 },
  eyebrow: { letterSpacing: 3, textTransform: 'uppercase' },
  entities: { marginTop: 16 },
  entity: { paddingVertical: 16, gap: 6 },
  entityHead: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  tag: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  benefits: { marginTop: 24, paddingTop: 24, borderTopWidth: 1, gap: 10 },
  benefit: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  flex: { flex: 1 },
  form: { padding: 24, borderRadius: 24 },
  fields: { marginTop: 24, gap: 20 },
  field: { gap: 6 },
  devices: { flexDirection: 'row', gap: 8 },
  device: { flex: 1, justifyContent: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  consent: { alignItems: 'flex-start', gap: 12, paddingVertical: 4 },
  checkbox: { marginTop: 2 },
  submit: { marginTop: 28, minHeight: 48, borderRadius: 999, justifyContent: 'center' },
  success: { padding: 32, borderRadius: 24, alignItems: 'center', gap: 12 },
  successIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  footer: { borderTopWidth: 1, paddingTop: 24, alignItems: 'center', gap: 8 },
  footerLinks: { flexDirection: 'row', gap: 16 },
});
