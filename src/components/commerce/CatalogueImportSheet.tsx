/**
 * VTID-04745 — "Import products from a CSV file" for an organization admin.
 *
 * Choose a file → it is checked at once (a dry run, nothing written) → every
 * problem is listed by line and column in the partner's language → only a
 * file with no problems can be imported. The import is all or nothing and
 * every product lands as an inactive draft that goes live after review.
 * The gateway (VTID-04731/04746) is the only judge of a row; the checks here
 * only stop a file that cannot be a CSV before it is read.
 */
import { useRef, useState } from 'react';
import { CheckCircle2, Download, FileUp, Loader2, TriangleAlert } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCommerceSkin } from '@/components/commerce/CommerceShell';
import type { MyOrgRow } from '@/components/commerce/MyOrgCard';
import {
  CSV_TEMPLATE,
  checkCsvFile,
  errorMessageKey,
  importCatalogueCsv,
  type ImportOutcome,
} from '@/lib/catalogue-import';
import { t } from '@/lib/i18n-toast';

const KEY = 'screens.commerceportal.catalogueImport';
/** Enough to fix a file from; the rest is counted, not listed. */
const MAX_LISTED_ERRORS = 50;

type Phase = 'pick' | 'checking' | 'checked' | 'importing' | 'done';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Organizations the user administers; the import is per organization. */
  adminOrgs: MyOrgRow[];
}

export function CatalogueImportSheet({ open, onOpenChange, adminOrgs }: Props) {
  const { portalClass } = useCommerceSkin();
  const inputRef = useRef<HTMLInputElement>(null);
  const [orgId, setOrgId] = useState<string>(adminOrgs[0]?.id ?? '');
  const [fileName, setFileName] = useState('');
  const [csv, setCsv] = useState('');
  const [phase, setPhase] = useState<Phase>('pick');
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  // Each file or org choice starts a new generation; a check or import that
  // answers for an older one is dropped, so a slow result can never show (or
  // enable Import) for a file that was replaced or reset since.
  const generation = useRef(0);

  const activeOrgId = adminOrgs.some((o) => o.id === orgId) ? orgId : adminOrgs[0]?.id ?? '';

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

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([`${CSV_TEMPLATE}\n`], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vitanaland-catalogue-template.csv';
    a.click();
    URL.revokeObjectURL(url);
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
    if (mine !== generation.current) return; // reset or replaced meanwhile
    setOutcome(result);
    setPhase('checked');
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // the same file can be chosen again after fixing it
    if (!file) return;
    reset();
    setFileName(file.name);
    const bad = checkCsvFile(file);
    if (bad) {
      setLocalError(bad);
      return;
    }
    let text: string;
    try {
      text = await file.text();
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
      <SheetContent side="right" className={`w-full overflow-y-auto sm:max-w-2xl ${portalClass}`}>
        <SheetHeader className="text-start">
          <SheetTitle>{t(`${KEY}.title`)}</SheetTitle>
          <p className="text-sm text-muted-foreground">{t(`${KEY}.subtitle`)}</p>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {adminOrgs.length > 1 && phase !== 'done' && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-foreground">{t(`${KEY}.orgLabel`)}</p>
              <Select value={activeOrgId} onValueChange={(v) => { setOrgId(v); reset(); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {adminOrgs.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {phase === 'done' && outcome?.kind === 'imported' ? (
            <div className="rounded-2xl border border-emerald-300/60 bg-emerald-50 p-5 dark:bg-emerald-950/30">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                <p className="text-sm text-foreground">{t(`${KEY}.done`, { count: outcome.imported })}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" onClick={reset}>{t(`${KEY}.importAnother`)}</Button>
                <Button onClick={() => close(false)} className="bg-amber-700 text-white hover:bg-amber-800">
                  {t(`${KEY}.close`)}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground">{t(`${KEY}.templateHint`)}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={downloadTemplate}>
                  <Download className="me-2 h-4 w-4" />
                  {t(`${KEY}.templateCta`)}
                </Button>
              </div>

              <div>
                <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
                <Button
                  size="lg"
                  disabled={!activeOrgId || phase === 'checking' || phase === 'importing'}
                  onClick={() => inputRef.current?.click()}
                  className="h-12 w-full rounded-xl bg-amber-700 text-base font-semibold text-white hover:bg-amber-800"
                >
                  <FileUp className="me-2 h-4 w-4" />
                  {fileName ? t(`${KEY}.chooseAnother`) : t(`${KEY}.chooseFile`)}
                </Button>
                {fileName && <p className="mt-2 truncate text-xs text-muted-foreground">{fileName}</p>}
              </div>

              {localError && <Problem text={t(errorMessageKey(localError, 'file'))} />}

              {phase === 'checking' && <Busy text={t(`${KEY}.checking`)} />}
              {phase === 'importing' && <Busy text={t(`${KEY}.importing`)} />}

              {phase === 'checked' && outcome?.kind === 'file_error' && (
                <Problem text={t(errorMessageKey(outcome.code, 'file'), outcome.params)} />
              )}
              {phase === 'checked' && outcome?.kind === 'locked' && <Problem text={t(`${KEY}.locked`)} />}
              {phase === 'checked' && outcome?.kind === 'failed' && <Problem text={t(`${KEY}.failed`)} />}

              {phase === 'checked' && rowErrors.length > 0 && (
                <div className="space-y-3">
                  <Problem text={t(`${KEY}.rowsWithErrors`, { errors: new Set(rowErrors.map((e) => e.line)).size, valid: validRows })} />
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">{t(`${KEY}.colLine`)}</TableHead>
                          <TableHead>{t(`${KEY}.colField`)}</TableHead>
                          <TableHead>{t(`${KEY}.colProblem`)}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rowErrors.slice(0, MAX_LISTED_ERRORS).map((e, i) => (
                          <TableRow key={`${e.line}-${e.field ?? ''}-${i}`}>
                            <TableCell className="tabular-nums">{e.line}</TableCell>
                            <TableCell className="font-mono text-xs">{e.field ?? ''}</TableCell>
                            <TableCell>{t(errorMessageKey(e.code, 'row'), e.params ?? {})}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {rowErrors.length > MAX_LISTED_ERRORS && (
                    <p className="text-xs text-muted-foreground">
                      {t(`${KEY}.moreErrors`, { count: rowErrors.length - MAX_LISTED_ERRORS })}
                    </p>
                  )}
                </div>
              )}

              {readyToImport && outcome?.kind === 'report' && (
                <div className="rounded-2xl border border-emerald-300/60 bg-emerald-50 p-5 dark:bg-emerald-950/30">
                  <p className="text-sm text-foreground">{t(`${KEY}.ready`, { count: outcome.validRows })}</p>
                  <Button onClick={runImport} className="mt-4 w-full bg-amber-700 text-white hover:bg-amber-800 sm:w-auto">
                    {t(`${KEY}.importCta`, { count: outcome.validRows })}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Busy({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
      <Loader2 className="h-4 w-4 animate-spin" />
      {text}
    </div>
  );
}

function Problem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-amber-300/70 bg-amber-50 p-3 text-sm text-foreground dark:bg-amber-950/30" role="alert">
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
      <span>{text}</span>
    </div>
  );
}
