/**
 * VTID-05524 — native twin of src/components/commerce/PartnerTermsSheet.tsx:
 * the supplier reads and accepts the partner terms on Vitanaland (German is
 * binding, one language at a time, switchable; the tick is never pre-set;
 * a version published meanwhile → 409, the new text and "ask again").
 * Same calls as the web (`GET /partner-onboarding/:orgId/terms?locale=`,
 * `POST …/terms/accept` with `acceptBody` from `@vitana/core`). The terms
 * text is rendered from `termsBlocks` as plain text, never HTML; an Arabic
 * text runs right to left.
 */
import { useEffect, useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, PressableRow, Text, notify, notifyError, useUITheme } from '../../../ports/ui';
import {
  BizIcon,
  Checkbox,
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  withAlpha,
} from '../../../ports/business-ui';
import {
  BINDING_TERMS_LOCALE,
  PARTNER_ONBOARDING_API,
  TERMS_LANGUAGE_NAMES,
  acceptBody,
  isStaleTermsError,
  parseTermsStatus,
  sameTermsVersion,
  termsBlocks,
  type PartnerTerms,
  type TermsStatus,
} from '../../../ports/commerce';
import { useI18n } from '../../../i18n/I18nProvider';
import { commerceFetch } from '../data/client';
import { fmtDate } from '../format';
import { CenterSpinner, SelectField } from './parts';

const K = 'screens.commerceportal.terms';

/** `fetchPartnerTerms` (src/lib/commerce-terms.ts). */
export async function fetchPartnerTerms(orgId: string, locale: string): Promise<TermsStatus> {
  const q = new URLSearchParams({ locale });
  return parseTermsStatus(await commerceFetch(`${PARTNER_ONBOARDING_API}/${encodeURIComponent(orgId)}/terms?${q.toString()}`));
}

/** `acceptPartnerTerms`. */
export async function acceptPartnerTerms(orgId: string, terms: PartnerTerms): Promise<void> {
  await commerceFetch(`${PARTNER_ONBOARDING_API}/${encodeURIComponent(orgId)}/terms/accept`, { method: 'POST', body: JSON.stringify(acceptBody(terms)) });
}

function TermsBody({ terms }: { terms: PartnerTerms }): ReactElement {
  const { colors } = useUITheme();
  const rtl = terms.direction === 'rtl';
  const dir = { writingDirection: rtl ? ('rtl' as const) : ('ltr' as const) };
  return (
    <View style={styles.body}>
      {termsBlocks(terms.text.body_md).map((b, i) =>
        b.kind === 'heading' ? (
          <Text key={i} weight="600" style={[styles.heading, dir]}>
            {b.text}
          </Text>
        ) : b.kind === 'marker' ? (
          <View key={i} style={[styles.marker, { backgroundColor: colors.accent }]}>
            <Text size="xs" weight="600" color={colors.primary}>
              {b.text}
            </Text>
          </View>
        ) : b.kind === 'item' ? (
          <View key={i} style={styles.item}>
            <Text size="sm" weight="500">
              {b.label}
            </Text>
            <Text size="sm" style={[styles.fill, dir]}>
              {b.text}
            </Text>
          </View>
        ) : (
          <Text key={i} size="sm" style={dir}>
            {b.text}
          </Text>
        ),
      )}
    </View>
  );
}

export function PartnerTermsSheet({ open, onOpenChange, orgId, onAccepted }: { open: boolean; onOpenChange: (open: boolean) => void; orgId: string; onAccepted: () => void }): ReactElement {
  const { t, language } = useI18n();
  const { colors } = useUITheme();
  const [terms, setTerms] = useState<PartnerTerms | null>(null);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [failed, setFailed] = useState(false);
  const [switchFailed, setSwitchFailed] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updated, setUpdated] = useState(false);

  const load = async () => {
    setLoading(true);
    setFailed(false);
    setSwitchFailed(false);
    setAgreed(false);
    try {
      const s = await fetchPartnerTerms(orgId, language);
      setTerms(s.kind === 'not_published' ? null : s.terms);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setUpdated(false);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, orgId]);

  const switchTo = async (locale: string) => {
    if (!terms || locale === terms.locale) return;
    setSwitching(true);
    setSwitchFailed(false);
    try {
      const s = await fetchPartnerTerms(orgId, locale);
      const next = s.kind === 'not_published' ? null : s.terms;
      if (next && !sameTermsVersion(terms, next)) {
        setAgreed(false);
        setUpdated(true);
      }
      setTerms(next);
    } catch {
      setSwitchFailed(true);
    } finally {
      setSwitching(false);
    }
  };

  const accept = async () => {
    if (!terms || !agreed) return;
    setSaving(true);
    try {
      await acceptPartnerTerms(orgId, terms);
      notify(`${K}.accepted`);
      onOpenChange(false);
      onAccepted();
    } catch (e) {
      if (isStaleTermsError(e)) {
        setUpdated(true);
        await load();
      } else notifyError(`${K}.acceptFailed`);
    } finally {
      setSaving(false);
    }
  };

  const showingGerman = terms?.locale === BINDING_TERMS_LOCALE;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent fullscreenOnMobile testID="partner-terms-sheet">
        <ResponsiveDialogHeader>
          <View style={styles.titleRow}>
            <BizIcon name="ShieldCheck" size={24} color={colors.primary} />
            <ResponsiveDialogTitle>
              <Text size="2xl" weight="700">
                {t(`${K}.title`)}
              </Text>
            </ResponsiveDialogTitle>
          </View>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody>
          {loading ? (
            <CenterSpinner testID="partner-terms-loading" />
          ) : failed ? (
            <Text size="sm" muted testID="partner-terms-failed">
              {t(`${K}.loadFailed`)}
            </Text>
          ) : !terms ? (
            <Text size="sm" muted testID="partner-terms-none">
              {t(`${K}.notPublished`)}
            </Text>
          ) : (
            <View style={styles.stack}>
              {updated ? (
                <View style={[styles.box, { borderColor: withAlpha(colors.statusWarning, 0.4), backgroundColor: colors.statusWarningSubtle }]} testID="partner-terms-updated">
                  <Text size="sm">{t(`${K}.updated`)}</Text>
                </View>
              ) : null}
              <Text size="sm" muted testID="partner-terms-version">
                {t(`${K}.version`, { version: terms.version, date: fmtDate(terms.published_at, language) })}
              </Text>
              {terms.available_locales.length > 1 ? (
                <View style={styles.langRow}>
                  <BizIcon name="Languages" size={16} color={colors.mutedForeground} />
                  <View style={styles.fill}>
                    <SelectField
                      value={terms.locale}
                      onChange={(v) => void switchTo(v)}
                      disabled={switching || saving}
                      options={terms.available_locales.map((l) => ({ value: l, label: l === BINDING_TERMS_LOCALE ? `${TERMS_LANGUAGE_NAMES[l] ?? l} · ${t(`${K}.bindingShort`)}` : (TERMS_LANGUAGE_NAMES[l] ?? l) }))}
                      accessibilityLabel={t(`${K}.languageLabel`)}
                      testID="partner-terms-language"
                    />
                  </View>
                </View>
              ) : null}
              <View style={[styles.box, { borderColor: withAlpha(colors.primary, 0.2), backgroundColor: withAlpha(colors.accent, 0.7) }]} testID="partner-terms-binding-notice">
                <Text size="sm" color={colors.primary}>
                  {t(`${K}.bindingNotice`)}
                </Text>
                {!showingGerman ? (
                  <PressableRow onPress={() => void switchTo(BINDING_TERMS_LOCALE)} disabled={switching} testID="partner-terms-read-german" accessibilityLabel={t(`${K}.readGerman`)} style={styles.minTap}>
                    <Text size="sm" weight="600" color={colors.primary} style={styles.underline}>
                      {t(`${K}.readGerman`)}
                    </Text>
                  </PressableRow>
                ) : null}
              </View>
              {terms.fallback ? (
                <Text size="sm" muted testID="partner-terms-fallback">
                  {t(`${K}.fallbackNotice`)}
                </Text>
              ) : null}
              {switchFailed ? (
                <Text size="sm" color={colors.destructive} testID="partner-terms-switch-failed">
                  {t(`${K}.loadFailed`)}
                </Text>
              ) : null}
              <View style={[styles.textBox, { borderColor: colors.border }]} testID="partner-terms-text">
                <Text size="lg" weight="700" style={{ writingDirection: terms.direction }}>
                  {terms.text.title}
                </Text>
                {switching ? <CenterSpinner /> : <TermsBody terms={terms} />}
              </View>
            </View>
          )}
        </ResponsiveDialogBody>
        <ResponsiveDialogFooter style={styles.footer} testID="partner-terms-footer">
          {terms && !loading && !failed ? (
            <View style={[styles.agree, { backgroundColor: withAlpha(colors.accent, 0.6) }]}>
              <PressableRow onPress={() => setAgreed((v) => !v)} accessibilityRole="button" accessibilityState={{ checked: agreed }} accessibilityLabel={t(`${K}.agree`)} testID="partner-terms-agree" style={styles.agreeRow}>
                <Checkbox checked={agreed} onCheckedChange={(v: boolean | 'indeterminate') => setAgreed(v === true)} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
                <Text size="sm" weight="500" style={styles.fill}>
                  {t(`${K}.agree`)}
                </Text>
              </PressableRow>
              <Text size="xs" muted style={styles.agreeHint} testID="partner-terms-agree-explanation">
                {t(`${K}.agreeExplanation`)}
              </Text>
            </View>
          ) : null}
          <View style={styles.buttons}>
            <Button variant="outline" onPress={() => onOpenChange(false)} style={styles.button}>
              {t(`${K}.close`)}
            </Button>
            {terms ? (
              <Button onPress={() => void accept()} disabled={!agreed || saving || switching} testID="partner-terms-accept" style={styles.button}>
                {t(`${K}.accept`)}
              </Button>
            ) : null}
          </View>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stack: { gap: 16 },
  box: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  langRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  textBox: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 8 },
  body: { gap: 12 },
  heading: { paddingTop: 12 },
  marker: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  item: { flexDirection: 'row', gap: 8, paddingStart: 16 },
  fill: { flex: 1, minWidth: 0 },
  minTap: { minHeight: 44 },
  underline: { textDecorationLine: 'underline' },
  footer: { gap: 12 },
  agree: { borderRadius: 12, padding: 12 },
  agreeRow: { minHeight: 44, alignItems: 'flex-start' },
  agreeHint: { paddingStart: 28, marginTop: 4 },
  buttons: { flexDirection: 'row', gap: 8 },
  button: { flex: 1, minHeight: 48, borderRadius: 12 },
});
