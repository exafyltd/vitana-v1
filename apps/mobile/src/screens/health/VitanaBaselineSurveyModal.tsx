/**
 * VTID-05455 (native-wave2-health-biology-r3/health-hub) fix 1 — twin of
 * `src/components/health/VitanaBaselineSurveyModal.tsx`, mounted on /health
 * like the web (Health.tsx:288, uncontrolled).
 *
 * Trigger (web :88-104): on mount, `GET /health/baseline-survey/status`
 * (Bearer); the dialog opens when the answer is `ok && !completed`. Any
 * failure is silent and the dialog stays closed.
 * Steps (web :23-59, :106-150): five pillar questions (icon, title, prompt),
 * "Step n of 5", a 1–5 rating row, Back (disabled on the first step) and
 * Next (disabled until the step is rated). Ratings are kept per pillar, so
 * Back shows the earlier pick.
 *
 * READS ONLY (plan.md:110 "No health data is written to production. Reads
 * only"): the web Finish POSTs `/health/baseline-survey` (:120-123). The
 * native Finish is rendered disabled and never calls it, the same treatment
 * as the upload sheet's submit (sheets.tsx). The web's hard-coded question
 * copy and button labels come from `healthNative.baselineSurvey.*`.
 * React 19: typed with `ReactElement`.
 */
import { useEffect, useState, type ReactElement } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Text, useUITheme } from '../../ports/ui';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, HealthIcon } from '../../ports/health';
import { getGateway } from '../../auth/gateway';
import { useAuth } from '../../auth/AuthProvider';
import { useHealthText } from './text';

type Rating = 1 | 2 | 3 | 4 | 5;
type PillarKey = 'nutrition' | 'hydration' | 'exercise' | 'sleep' | 'mental';

/** VitanaBaselineSurveyModal.tsx:23-59, in order. */
export const SURVEY_QUESTIONS: ReadonlyArray<{ key: PillarKey; icon: string }> = [
  { key: 'nutrition', icon: 'Apple' },
  { key: 'hydration', icon: 'Droplets' },
  { key: 'exercise', icon: 'Dumbbell' },
  { key: 'sleep', icon: 'Moon' },
  { key: 'mental', icon: 'Brain' },
];

export const BASELINE_STATUS_PATH = '/health/baseline-survey/status';

/** The web auto-open rule (:94-99): open only on `ok && !completed`; any failure keeps it closed. */
export async function needsBaselineSurvey(): Promise<boolean> {
  try {
    const res = await getGateway()(BASELINE_STATUS_PATH);
    if (!res.ok) return false;
    const json = JSON.parse((await res.text()) || '{}') as { ok?: unknown; completed?: unknown };
    return !!json.ok && !json.completed;
  } catch {
    return false;
  }
}

export function VitanaBaselineSurveyModal(): ReactElement {
  const { colors } = useUITheme();
  const { t } = useHealthText();
  const { session } = useAuth();
  const signedIn = !!session;
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [ratings, setRatings] = useState<Partial<Record<PillarKey, Rating>>>({});

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    void needsBaselineSurvey().then((needed) => {
      if (!cancelled && needed) setOpen(true);
    });
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  const current = SURVEY_QUESTIONS[step];
  const currentRating = ratings[current.key];
  const isLast = step === SURVEY_QUESTIONS.length - 1;

  const next = () => {
    if (currentRating === undefined || isLast) return;
    setStep(step + 1);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent testID="baseline-survey">
        <DialogHeader>
          <View style={styles.titleRow}>
            <View style={[styles.iconTile, { backgroundColor: colors.primary }]}>
              <HealthIcon name={current.icon} size={20} color={colors.primaryForeground} />
            </View>
            <View style={styles.fill}>
              <DialogTitle>{t(`healthNative.baselineSurvey.questions.${current.key}.title`)}</DialogTitle>
            </View>
          </View>
          <DialogDescription>{t('screens.health.fiveQuickQuestionsSetYourDay0', { value0: step + 1, length: SURVEY_QUESTIONS.length })}</DialogDescription>
        </DialogHeader>

        <View style={styles.body}>
          <Text size="sm">{t(`healthNative.baselineSurvey.questions.${current.key}.prompt`)}</Text>
          <View style={styles.ratings}>
            {([1, 2, 3, 4, 5] as Rating[]).map((n) => {
              const active = currentRating === n;
              return (
                <Pressable
                  key={n}
                  testID={`baseline-survey-rating-${n}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={t('healthNative.baselineSurvey.rating', { n })}
                  onPress={() => setRatings((prev) => ({ ...prev, [current.key]: n }))}
                  style={[
                    styles.rating,
                    active ? { backgroundColor: colors.primary, borderColor: colors.primary } : { backgroundColor: colors.background, borderColor: colors.border },
                  ]}
                >
                  <Text size="lg" weight="600" color={active ? colors.primaryForeground : colors.foreground}>
                    {String(n)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <DialogFooter>
          <View style={styles.footer}>
            <Button testID="baseline-survey-back" variant="ghost" onPress={() => step > 0 && setStep(step - 1)} disabled={step === 0}>
              {t('screens.health.back')}
            </Button>
            <Button testID="baseline-survey-next" onPress={next} disabled={currentRating === undefined || isLast}>
              {isLast ? t('healthNative.baselineSurvey.finish') : t('healthNative.baselineSurvey.next')}
            </Button>
          </View>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  iconTile: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  body: { paddingVertical: 16, gap: 16 },
  ratings: { flexDirection: 'row', gap: 8 },
  rating: { flex: 1, height: 48, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
});
