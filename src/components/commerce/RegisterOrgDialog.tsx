/**
 * Commerce Partner Onboarding (VTID-03936, frontend Phase 2) — self-service
 * "register your business" form.
 *
 * Modeled directly on `ManualConnectDialog.tsx`'s shape (plain useState form
 * object, `adminFetch` POST, spinner button, close + `onCreated()` on
 * success) rather than inventing a new pattern. Calls the new
 * `POST /api/v1/partner-orgs/register` (gateway VTID-03932) — a
 * `partner_organizations` row, a different concept from the VCAOP mesh
 * `connections` this dialog's sibling creates.
 *
 * VTID-03989: renders as a bottom sheet on phones (`ResponsiveDialog`), and
 * proposes the `org_key` from the business name so a registering owner types
 * one thing, not two — the key stays visible and editable, and the gateway
 * still owns validation/uniqueness.
 */
import { useState } from 'react';
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { adminFetch } from '@/lib/admin-api';
import { PARTNER_ORGS_API, slugifyOrgKey } from '@/lib/commerce-host';
import { t, notifyError } from '@/lib/i18n-toast';

type CommerceVertical = 'health' | 'general';

const EMPTY_FORM = { org_key: '', display_name: '', org_type: '', commerce_vertical: '' as CommerceVertical | '' };

const fieldClass =
  'border-slate-700 bg-slate-950/70 text-slate-100 placeholder:text-slate-500 focus-visible:ring-amber-500';

export function RegisterOrgDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void | Promise<void>;
}) {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  // Once the owner edits the key by hand, stop deriving it from the name.
  const [keyTouched, setKeyTouched] = useState(false);

  const create = async () => {
    setCreating(true);
    try {
      await adminFetch(`${PARTNER_ORGS_API}/register`, {
        method: 'POST',
        body: JSON.stringify({
          org_key: form.org_key.trim(),
          display_name: form.display_name.trim(),
          org_type: form.org_type.trim(),
          commerce_vertical: form.commerce_vertical,
        }),
      });
      onOpenChange(false);
      setForm(EMPTY_FORM);
      setKeyTouched(false);
      await onCreated();
    } catch (err) {
      if (err instanceof Error && /already taken/i.test(err.message)) {
        notifyError('screens.commerceportal.orgOnboarding.orgKeyTaken');
      } else {
        notifyError('screens.commerceportal.orgOnboarding.createFailed');
      }
    } finally {
      setCreating(false);
    }
  };

  const canSubmit =
    !creating &&
    !!form.display_name.trim() &&
    !!form.org_key.trim() &&
    !!form.org_type.trim() &&
    !!form.commerce_vertical;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="border-slate-800 bg-slate-900 text-slate-100">
        <ResponsiveDialogHeader className="border-slate-800 bg-slate-900 text-start">
          <ResponsiveDialogTitle>{t('screens.commerceportal.orgOnboarding.registerTitle')}</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody className="space-y-3 md:mt-4">
          <Input
            value={form.display_name}
            onChange={(e) => {
              const display_name = e.target.value;
              setForm((f) => ({ ...f, display_name, org_key: keyTouched ? f.org_key : slugifyOrgKey(display_name) }));
            }}
            placeholder={t('screens.commerceportal.orgOnboarding.orgName')}
            aria-label={t('screens.commerceportal.orgOnboarding.orgName')}
            autoComplete="organization"
            className={fieldClass}
          />
          <Select
            value={form.commerce_vertical}
            onValueChange={(value) => setForm((f) => ({ ...f, commerce_vertical: value as CommerceVertical }))}
          >
            <SelectTrigger className={fieldClass} aria-label={t('screens.commerceportal.orgOnboarding.commerceVertical')}>
              <SelectValue placeholder={t('screens.commerceportal.orgOnboarding.commerceVertical')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="health">{t('screens.commerceportal.orgOnboarding.commerceVerticalHealth')}</SelectItem>
              <SelectItem value="general">{t('screens.commerceportal.orgOnboarding.commerceVerticalGeneral')}</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={form.org_type}
            onChange={(e) => setForm((f) => ({ ...f, org_type: e.target.value }))}
            placeholder={t('screens.commerceportal.orgOnboarding.orgTypePlaceholder')}
            aria-label={t('screens.commerceportal.orgOnboarding.orgType')}
            className={fieldClass}
          />
          <div>
            <Input
              value={form.org_key}
              onChange={(e) => {
                setKeyTouched(true);
                setForm((f) => ({ ...f, org_key: e.target.value.toLowerCase() }));
              }}
              placeholder={t('screens.commerceportal.orgOnboarding.orgKey')}
              aria-label={t('screens.commerceportal.orgOnboarding.orgKey')}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className={`font-mono ${fieldClass}`}
            />
            <p className="mt-1 text-xs text-slate-500">{t('screens.commerceportal.orgOnboarding.orgKeyAuto')}</p>
          </div>
        </ResponsiveDialogBody>
        <ResponsiveDialogFooter className="border-slate-800 bg-slate-900 md:mt-4">
          <Button
            className="w-full bg-amber-500 font-semibold text-slate-950 hover:bg-amber-400"
            onClick={() => void create()}
            disabled={!canSubmit}
          >
            {creating ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                {t('screens.commerceportal.orgOnboarding.creating')}
              </>
            ) : (
              t('screens.commerceportal.orgOnboarding.create')
            )}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
