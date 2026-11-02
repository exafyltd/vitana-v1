/**
 * VTID-05428 (Native Wave 2, delete-account lane) — native twin of the web
 * `src/pages/legal/DeleteAccount.tsx` (the phone page; the desktop Spotlight
 * shell does not apply to the mobile web branch).
 *
 * `/delete-account` is public on the web ("Public Routes - No Auth Required",
 * no AuthGuard), so the route file lives in the `(public)` group (plan
 * decision 1a) and the screen reads the session itself:
 * - signed out → the web's sign-in-required view (button to `/maxina`);
 * - signed in → info → confirm (typed DELETE check) → final AlertDialog →
 *   deleting → done (local sign-out) or error (Try Again / Go Back).
 * Same steps, order and `screens.legal.*` catalog keys as the web page. The
 * deletion request goes through `requestAccountDeletion` on the app's
 * Supabase client; unit tests mock that client and never send it.
 * React 19: typed with `ReactElement`.
 */
import { useState, type ReactElement, type ReactNode } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Text, TextInput, useUITheme } from '../../ports/ui';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  DeleteAccountIcon,
  withAlpha,
  type DeleteAccountGlyph,
} from '../../ports/delete-account';
import { radius } from '../../ports/tokens';
import { useAuth } from '../../auth/AuthProvider';
import { getSupabase } from '../../auth/client';
import { navigateToWebPath } from '../../navigation/navigate';
import { useI18n } from '../../i18n/I18nProvider';
import { isDeleteConfirmed, requestAccountDeletion } from './request';

type Step = 'info' | 'confirm' | 'deleting' | 'done' | 'error';

const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

const k = (key: string) => `screens.legal.${key}`;

function Header({ title, onBack, backLabel }: { title: string; onBack: () => void; backLabel: string }): ReactElement {
  const { colors } = useUITheme();
  const { rtl } = useI18n();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
      <IconButtonBack onPress={onBack} label={backLabel} color={colors.foreground} mirrored={rtl} />
      <Text size="lg" weight="600" accessibilityRole="header">
        {title}
      </Text>
    </View>
  );
}

/** The web's ghost icon button with ArrowLeft (mirrored under RTL). */
function IconButtonBack({ onPress, label, color, mirrored }: { onPress: () => void; label: string; color: string; mirrored: boolean }): ReactElement {
  return (
    <Button testID="delete-account-back" variant="ghost" size="icon" onPress={onPress} accessibilityLabel={label}>
      <DeleteAccountIcon testID="delete-account-back-icon" name="arrow-left" size={20} color={color} mirrored={mirrored} />
    </Button>
  );
}

/** The round tinted badge above each card title (`h-14 w-14 rounded-full bg-destructive/10`). */
function Badge({ name }: { name: DeleteAccountGlyph }): ReactElement {
  const { colors } = useUITheme();
  return (
    <View style={[styles.badge, { backgroundColor: withAlpha(colors.destructive, 0.1) }]}>
      <DeleteAccountIcon name={name} size={28} color={colors.destructive} />
    </View>
  );
}

function Centered({ children, testID }: { children: ReactNode; testID: string }): ReactElement {
  return (
    <View testID={testID} style={styles.centered}>
      {children}
    </View>
  );
}

export function DeleteAccountScreen(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { user, signOut, loading: authLoading } = useAuth();
  const [step, setStep] = useState<Step>('info');
  const [confirmText, setConfirmText] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isConfirmValid = isDeleteConfirmed(confirmText);

  const back = () => {
    if (router.canGoBack()) router.back();
    else navigateToWebPath('/', { replace: true });
  };

  const handleDeleteRequest = async () => {
    setShowDialog(false);
    setStep('deleting');
    const result = await requestAccountDeletion(getSupabase());
    if (!result.ok) {
      setErrorMsg(result.message ?? t('deleteAccountNative.errorFallback'));
      setStep('error');
      return;
    }
    // Sign out locally after a successful deletion (the user is already gone server-side; a failure is fine).
    try {
      await signOut();
    } catch {
      // ignore, as on the web
    }
    setStep('done');
  };

  const shell = (testID: string, body: ReactNode, contentStyle = styles.main) => (
    <View testID={testID} style={[styles.root, { backgroundColor: colors.background }]}>
      <Header title={t(k('deleteAccount'))} onBack={back} backLabel={t(k('goBack'))} />
      <ScrollView contentContainerStyle={contentStyle} keyboardShouldPersistTaps="handled">
        {body}
      </ScrollView>
    </View>
  );

  // Not signed in (web: `!authLoading && !user && step === "info"`).
  if (!authLoading && !user && step === 'info') {
    return shell(
      'delete-account-signed-out',
      <View style={styles.signedOut}>
        <DeleteAccountIcon name="alert-triangle" size={48} color={colors.destructive} />
        <Text size="xl" weight="600" style={styles.centerText} accessibilityRole="header">
          {t(k('signRequired'))}
        </Text>
        <Text muted style={styles.centerText}>
          {t(k('youNeedSignYourAccountBefore'))}
        </Text>
        <Button testID="delete-account-sign-in" style={styles.signInButton} onPress={() => navigateToWebPath('/maxina')}>
          {t(k('sign'))}
        </Button>
      </View>,
      styles.mainSignedOut,
    );
  }

  const destructiveBorder = { borderColor: withAlpha(colors.destructive, 0.2) };

  const steps = (
    <>
      {step === 'info' ? (
        <Card testID="delete-account-info" style={destructiveBorder}>
          <CardHeader style={styles.cardHeader}>
            <Badge name="trash" />
            <CardTitle size="xl" style={styles.centerText}>
              {t(k('deleteYourAccount'))}
            </CardTitle>
            <CardDescription style={styles.centerText}>{t(k('thisActionPermanentCannotUndone'))}</CardDescription>
          </CardHeader>
          <CardContent style={styles.cardContent}>
            <View style={[styles.removeBox, { backgroundColor: withAlpha(colors.destructive, 0.05) }]}>
              <Text size="sm" weight="500">
                {t(k('whenYouDeleteYourAccountWe'))}
              </Text>
              {['yourProfilePreferencesPersonalData', 'chatMessagesAiConversationsDiaryEntries', 'uploadedPhotosVideosFiles', 'eventRsvpsMembershipsCommunityActivity', 'bookmarksSupplementsHealthData'].map((key) => (
                <View key={key} style={styles.bullet}>
                  <Text size="sm" style={styles.bulletDot}>
                    {'•'}
                  </Text>
                  <Text size="sm" style={styles.bulletText}>
                    {t(k(key))}
                  </Text>
                </View>
              ))}
            </View>
            <Text size="xs" muted>
              {t(k('completedPaymentTransactionsMayRetainedAs'), { value0: ' ' })}
              <Text testID="delete-account-privacy" size="xs" color={colors.primary} accessibilityRole="link" onPress={() => navigateToWebPath('/privacy')}>
                {t(k('privacyPolicy'))}
              </Text>
              {'.'}
            </Text>
            <Button testID="delete-account-start" variant="destructive" onPress={() => setStep('confirm')}>
              {t(k('deleteMyAccount'))}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {step === 'confirm' ? (
        <Card testID="delete-account-confirm" style={destructiveBorder}>
          <CardHeader style={styles.cardHeader}>
            <Badge name="alert-triangle" />
            <CardTitle size="xl" style={styles.centerText}>
              {t(k('youSure'))}
            </CardTitle>
            <CardDescription style={styles.centerText}>
              {t(k('type'))}{' '}
              <Text size="sm" weight="700" color={colors.destructive} style={styles.mono}>
                {t(k('delete'))}
              </Text>{' '}
              {t(k('belowConfirmAccountDeletion'))}
            </CardDescription>
          </CardHeader>
          <CardContent style={styles.cardContent}>
            <TextInput
              testID="delete-account-input"
              placeholder={t(k('typeDeleteConfirm'))}
              value={confirmText}
              onChangeText={setConfirmText}
              autoFocus
              autoCapitalize="characters"
              autoCorrect={false}
              style={styles.confirmInput}
            />
            <View style={styles.buttonRow}>
              <Button
                testID="delete-account-cancel"
                variant="outline"
                style={styles.flex}
                onPress={() => {
                  setConfirmText('');
                  setStep('info');
                }}
              >
                {t(k('cancel'))}
              </Button>
              <Button testID="delete-account-submit" variant="destructive" style={styles.flex} disabled={!isConfirmValid} onPress={() => setShowDialog(true)}>
                {t(k('permanentlyDelete'))}
              </Button>
            </View>
          </CardContent>
        </Card>
      ) : null}

      {step === 'deleting' ? (
        <Centered testID="delete-account-deleting">
          <ActivityIndicator size="large" color={colors.destructive} />
          <Text weight="500" style={styles.centerText}>
            {t(k('deletingYourAccount'))}
          </Text>
          <Text size="sm" muted style={styles.centerText}>
            {t(k('pleaseDoNotCloseThisPage'))}
          </Text>
        </Centered>
      ) : null}

      {step === 'done' ? (
        <Card testID="delete-account-done">
          <CardContent style={styles.resultContent}>
            <DeleteAccountIcon name="check-circle" size={48} color={colors.primary} />
            <Text size="xl" weight="600" style={styles.centerText} accessibilityRole="header">
              {t(k('accountDeleted'))}
            </Text>
            <Text size="sm" muted style={styles.centerText}>
              {t(k('yourAccountAssociatedDataHavePermanently'))}
            </Text>
            <Button testID="delete-account-home" variant="outline" style={styles.resultButton} onPress={() => navigateToWebPath('/')}>
              {t(k('returnHome'))}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {step === 'error' ? (
        <Card testID="delete-account-error" style={destructiveBorder}>
          <CardContent style={styles.resultContent}>
            <DeleteAccountIcon name="alert-triangle" size={48} color={colors.destructive} />
            <Text size="xl" weight="600" style={styles.centerText} accessibilityRole="header">
              {t(k('somethingWentWrong'))}
            </Text>
            <Text size="sm" muted style={styles.centerText}>
              {errorMsg}
            </Text>
            <View style={styles.resultRow}>
              <Button testID="delete-account-retry" variant="outline" onPress={() => setStep('info')}>
                {t(k('tryAgain'))}
              </Button>
              <Button testID="delete-account-error-back" variant="outline" onPress={back}>
                {t(k('goBack'))}
              </Button>
            </View>
          </CardContent>
        </Card>
      ) : null}

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent testID="delete-account-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{t(k('finalConfirmation'))}</AlertDialogTitle>
            <AlertDialogDescription>{t(k('thisWillPermanentlyDeleteYourAccount'))}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction testID="delete-account-dialog-confirm" variant="destructive" onPress={() => void handleDeleteRequest()}>
              {t(k('yesDeleteMyAccount'))}
            </AlertDialogAction>
            <AlertDialogCancel testID="delete-account-dialog-cancel">{t(k('cancel'))}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  return shell('delete-account', steps);
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  main: { width: '100%', maxWidth: 512, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 32 },
  mainSignedOut: { width: '100%', maxWidth: 512, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 64 },
  signedOut: { alignItems: 'center', gap: 8 },
  signInButton: { alignSelf: 'stretch', maxWidth: 320, width: '100%', marginTop: 16, alignItems: 'center' },
  centerText: { textAlign: 'center' },
  cardHeader: { alignItems: 'center' },
  cardContent: { paddingHorizontal: 24, paddingBottom: 24, gap: 16 },
  badge: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  removeBox: { borderRadius: radius.lg, padding: 16, gap: 8 },
  bullet: { flexDirection: 'row', gap: 8, paddingStart: 4 },
  bulletDot: { lineHeight: 20 },
  bulletText: { flex: 1, lineHeight: 20 },
  mono: { fontFamily: MONO },
  confirmInput: { textAlign: 'center', fontFamily: MONO, fontSize: 18, letterSpacing: 4 },
  buttonRow: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
  centered: { alignItems: 'center', paddingVertical: 64, gap: 16 },
  resultContent: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24, gap: 16 },
  resultButton: { marginTop: 16 },
  resultRow: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
});
