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
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { adminFetch } from '@/lib/admin-api';
import { PARTNER_ORGS_API } from '@/lib/commerce-host';
import { t, notifyError } from '@/lib/i18n-toast';

const EMPTY_FORM = { org_key: '', display_name: '', org_type: '' };

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

  const create = async () => {
    setCreating(true);
    try {
      await adminFetch(`${PARTNER_ORGS_API}/register`, {
        method: 'POST',
        body: JSON.stringify({
          org_key: form.org_key.trim(),
          display_name: form.display_name.trim(),
          org_type: form.org_type.trim(),
        }),
      });
      onOpenChange(false);
      setForm(EMPTY_FORM);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-slate-800 bg-slate-900 text-slate-100">
        <DialogHeader>
          <DialogTitle>{t('screens.commerceportal.orgOnboarding.registerTitle')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            value={form.display_name}
            onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
            placeholder={t('screens.commerceportal.orgOnboarding.orgName')}
            aria-label={t('screens.commerceportal.orgOnboarding.orgName')}
            className={fieldClass}
          />
          <Input
            value={form.org_key}
            onChange={(e) => setForm((f) => ({ ...f, org_key: e.target.value.toLowerCase() }))}
            placeholder={t('screens.commerceportal.orgOnboarding.orgKey')}
            aria-label={t('screens.commerceportal.orgOnboarding.orgKey')}
            className={fieldClass}
          />
          <Input
            value={form.org_type}
            onChange={(e) => setForm((f) => ({ ...f, org_type: e.target.value }))}
            placeholder={t('screens.commerceportal.orgOnboarding.orgTypePlaceholder')}
            aria-label={t('screens.commerceportal.orgOnboarding.orgType')}
            className={fieldClass}
          />

          <Button
            className="w-full bg-amber-500 font-semibold text-slate-950 hover:bg-amber-400"
            onClick={() => void create()}
            disabled={creating || !form.display_name.trim() || !form.org_key.trim() || !form.org_type.trim()}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
