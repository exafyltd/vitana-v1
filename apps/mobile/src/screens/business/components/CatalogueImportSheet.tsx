/**
 * VTID-05524 — native twin of src/components/commerce/CatalogueImportSheet.tsx
 * ("Import products from a CSV file"): choose a file → a dry run at once
 * (nothing written) → every problem by line and column in the partner's
 * language → only a clean file can be imported (all or nothing, every product
 * an inactive draft). Same calls (`POST
 * /partner-onboarding/:orgId/catalogue/products/import` with `{ csv, dry_run }`,
 * the shop record created once on `NO_MERCHANT`) and the web's own outcome
 * mapping (`toOutcome`, `errorMessageKey`, `checkCsvFile` from `@vitana/core`).
 * The file comes from the system document picker; the template goes to the
 * share sheet (the web downloads it). The web's line/field/problem table is the
 * phone's stacked rows (first 50, the rest counted).
 */
import { useRef, useState, type ReactElement } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, useUITheme } from '../../../ports/ui';
import { BizIcon, Sheet, SheetContent, SheetHeader, SheetTitle, pickTextFile, shareTextFile } from '../../../ports/business-ui';
import { CSV_TEMPLATE, PARTNER_ONBOARDING_API, checkCsvFile, errorMessageKey, toOutcome, type ImportOutcome, type MyOrgRow } from '../../../ports/commerce';
import { useI18n } from '../../../i18n/I18nProvider';
import { commerceCall } from '../data/client';
import { Busy, Field, Panel, Problem, SelectField } from './parts';

const KEY = 'screens.commerceportal.catalogueImport';
const MAX_LISTED_ERRORS = 50;
type Phase = 'pick' | 'checking' | 'checked' | 'importing' | 'done';

/** `importCatalogueCsv` (src/lib/catalogue-import.ts). */
export async function importCatalogueCsv(orgId: string, csv: string, dryRun: boolean): Promise<ImportOutcome> {
  const path = `${PARTNER_ONBOARDING_API}/${encodeURIComponent(orgId)}/catalogue/products/import`;
  const send = () => commerceCall(path, { method: 'POST', body: JSON.stringify({ csv, dry_run: dryRun }) });
  let r = await send();
  if (r.status === 409 && r.body?.error === 'NO_MERCHANT') {
    const m = await commerceCall(`${PARTNER_ONBOARDING_API}/${encodeURIComponent(orgId)}/catalogue/merchant`, { method: 'PUT', body: JSON.stringify({}) });
    if (m.status >= 400) return { kind: 'failed' };
    r = await send();
  }
  return toOutcome(r.status, r.body, dryRun);
}

export function CatalogueImportSheet({ open, onOpenChange, adminOrgs }: { open: boolean; onOpenChange: (open: boolean) => void; adminOrgs: MyOrgRow[] }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const [orgId, setOrgId] = useState<string>(adminOrgs[0]?.id ?? '');
  const [fileName, setFileName] = useState('');
  const [csv, setCsv] = useState('');
  const [phase, setPhase] = useState<Phase>('pick');
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const generation = useRef(0);
  const activeOrgId = adminOrgs.some((o) => o.id === orgId) ? orgId : (adminOrgs[0]?.id ?? '');

  const reset = () => {
    generation.current += 1;
    setFileName('');
    setCsv('');
    setPhase('pick');
    setOutcome(null);
    setLocalError(null);
  };
  const close = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const check = async (text: string) => {
    const mine = generation.current;
    setPhase('checking');
    setOutcome(null);
    let result: ImportOutcome;
    try {
      result = await importCatalogueCsv(activeOrgId, text, true);
    } catch {
      result = { kind: 'failed' };
    }
    if (mine !== generation.current) return;
    setOutcome(result);
    setPhase('checked');
  };

  const chooseFile = async () => {
    let picked;
    try {
      picked = await pickTextFile(['text/csv', 'text/comma-separated-values', 'application/csv', 'text/plain']);
    } catch {
      return;
    }
    if (picked.status !== 'picked') return;
    const file = picked.file;
    reset();
    setFileName(file.name);
    const bad = checkCsvFile({ name: file.name, size: file.size ?? 0 });
    if (bad) {
      setLocalError(bad);
      return;
    }
    let text: string;
    try {
      text = await file.read();
    } catch {
      setLocalError('unreadable');
      return;
    }
    setCsv(text);
    await check(text);
  };

  const runImport = async () => {
    const mine = generation.current;
    setPhase('importing');
    let result: ImportOutcome;
    try {
      result = await importCatalogueCsv(activeOrgId, csv, false);
    } catch {
      result = { kind: 'failed' };
    }
    if (mine !== generation.current) return;
    setOutcome(result);
    setPhase(result.kind === 'imported' ? 'done' : 'checked');
  };

  const rowErrors = outcome && (outcome.kind === 'report' || outcome.kind === 'row_errors') ? outcome.errors : [];
  const validRows = outcome && (outcome.kind === 'report' || outcome.kind === 'row_errors') ? outcome.validRows : 0;
  const readyToImport = phase === 'checked' && outcome?.kind === 'report' && outcome.errors.length === 0 && validRows > 0;

  return (
    <Sheet open={open} onOpenChange={close}>
      <SheetContent side="end" style={styles.sheet} testID="catalogue-import">
        <ScrollView contentContainerStyle={styles.content}>
          <SheetHeader>
            <SheetTitle>{t(`${KEY}.title`)}</SheetTitle>
            <Text size="sm" muted>
              {t(`${KEY}.subtitle`)}
            </Text>
          </SheetHeader>
          <View style={styles.stack}>
            {adminOrgs.length > 1 && phase !== 'done' ? (
              <Field label={t(`${KEY}.orgLabel`)}>
                <SelectField
                  value={activeOrgId}
                  onChange={(v) => {
                    setOrgId(v);
                    reset();
                  }}
                  options={adminOrgs.map((o) => ({ value: o.id, label: o.display_name }))}
                  accessibilityLabel={t(`${KEY}.orgLabel`)}
                  testID="import-org"
                />
              </Field>
            ) : null}

            {phase === 'done' && outcome?.kind === 'imported' ? (
              <View style={[styles.success, { borderColor: colors.statusSuccess, backgroundColor: colors.statusSuccessSubtle }]} testID="import-done">
                <View style={styles.row}>
                  <BizIcon name="CheckCircle2" size={20} color={colors.statusSuccess} />
                  <Text size="sm" style={styles.fill}>
                    {t(`${KEY}.done`, { count: outcome.imported })}
                  </Text>
                </View>
                <View style={styles.buttons}>
                  <Button variant="outline" onPress={reset} testID="import-another">
                    {t(`${KEY}.importAnother`)}
                  </Button>
                  <Button onPress={() => close(false)} testID="import-close">
                    {t(`${KEY}.close`)}
                  </Button>
                </View>
              </View>
            ) : (
              <>
                <Panel>
                  <Text size="sm" muted>
                    {t(`${KEY}.templateHint`)}
                  </Text>
                  <Button variant="outline" size="sm" onPress={() => void shareTextFile('vitanaland-catalogue-template.csv', `${CSV_TEMPLATE}\n`)} testID="import-template" style={styles.selfStart}>
                    <BizIcon name="Download" size={16} />
                    {t(`${KEY}.templateCta`)}
                  </Button>
                </Panel>
                <View style={styles.gap}>
                  <Button size="lg" disabled={!activeOrgId || phase === 'checking' || phase === 'importing'} onPress={() => void chooseFile()} testID="import-choose" style={styles.big}>
                    <BizIcon name="FileUp" size={16} color={colors.primaryForeground} />
                    {fileName ? t(`${KEY}.chooseAnother`) : t(`${KEY}.chooseFile`)}
                  </Button>
                  {fileName ? (
                    <Text size="xs" muted numberOfLines={1} testID="import-file-name">
                      {fileName}
                    </Text>
                  ) : null}
                </View>
                {localError ? <Problem text={t(errorMessageKey(localError, 'file'))} testID="import-local-error" /> : null}
                {phase === 'checking' ? <Busy text={t(`${KEY}.checking`)} testID="import-checking" /> : null}
                {phase === 'importing' ? <Busy text={t(`${KEY}.importing`)} testID="import-importing" /> : null}
                {phase === 'checked' && outcome?.kind === 'file_error' ? <Problem text={t(errorMessageKey(outcome.code, 'file'), outcome.params)} testID="import-file-error" /> : null}
                {phase === 'checked' && outcome?.kind === 'locked' ? <Problem text={t(`${KEY}.locked`)} testID="import-locked" /> : null}
                {phase === 'checked' && outcome?.kind === 'failed' ? <Problem text={t(`${KEY}.failed`)} testID="import-failed" /> : null}
                {phase === 'checked' && rowErrors.length > 0 ? (
                  <View style={styles.gap} testID="import-row-errors">
                    <Problem text={t(`${KEY}.rowsWithErrors`, { errors: new Set(rowErrors.map((e) => e.line)).size, valid: validRows })} />
                    <View style={[styles.table, { borderColor: colors.border }]}>
                      {rowErrors.slice(0, MAX_LISTED_ERRORS).map((e, i) => (
                        <View key={`${e.line}-${e.field ?? ''}-${i}`} style={[styles.errRow, { borderColor: colors.border }]}>
                          <Text size="xs" muted>
                            {`${t(`${KEY}.colLine`)} ${e.line}${e.field ? ` · ${e.field}` : ''}`}
                          </Text>
                          <Text size="sm">{t(errorMessageKey(e.code, 'row'), e.params ?? {})}</Text>
                        </View>
                      ))}
                    </View>
                    {rowErrors.length > MAX_LISTED_ERRORS ? (
                      <Text size="xs" muted>
                        {t(`${KEY}.moreErrors`, { count: rowErrors.length - MAX_LISTED_ERRORS })}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
                {readyToImport && outcome?.kind === 'report' ? (
                  <View style={[styles.success, { borderColor: colors.statusSuccess, backgroundColor: colors.statusSuccessSubtle }]} testID="import-ready">
                    <Text size="sm">{t(`${KEY}.ready`, { count: outcome.validRows })}</Text>
                    <Button onPress={() => void runImport()} testID="import-run">
                      {t(`${KEY}.importCta`, { count: outcome.validRows })}
                    </Button>
                  </View>
                ) : null}
              </>
            )}
          </View>
        </ScrollView>
      </SheetContent>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  sheet: { width: '100%' },
  content: { padding: 16, paddingBottom: 48, gap: 16 },
  stack: { gap: 24 },
  gap: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  fill: { flex: 1, minWidth: 0 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  success: { borderWidth: 1, borderRadius: 16, padding: 20, gap: 16 },
  selfStart: { alignSelf: 'flex-start' },
  big: { minHeight: 48, borderRadius: 12 },
  table: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  errRow: { paddingHorizontal: 12, paddingVertical: 8, gap: 2, borderBottomWidth: StyleSheet.hairlineWidth },
});
