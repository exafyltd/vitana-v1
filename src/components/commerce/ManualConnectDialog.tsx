/**
 * The manual "create a business" form (VTID-03882) — lifted verbatim from the
 * old `pages/CommerceConnections.tsx`, only re-skinned and demoted behind a
 * quiet CTA.
 *
 * It is demoted, NOT removed, for a concrete reason: the MCP server that the
 * hero card advertises is not publicly reachable (BLK-006) and its shipped
 * entry point registers read-only tools, so this form is currently the ONLY
 * working way to create a connection.
 *
 * Storefront platform sniff (VTID-03601) stays the friendly first field. It is
 * read-only on the gateway side and never creates a connection by itself.
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Search } from 'lucide-react';
import { adminFetch } from '@/lib/admin-api';
import { MY_PORTAL_API } from '@/lib/commerce-host';
import { t, notify, notifyError } from '@/lib/i18n-toast';

const EMPTY_FORM = { name: '', connector_id: '', provider_id: '', jurisdiction: '', openapi: '' };

const fieldClass = 'focus-visible:ring-amber-700';

export function ManualConnectDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void | Promise<void>;
}) {
  const [creating, setCreating] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [storeUrl, setStoreUrl] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);

  const detect = async () => {
    const url = storeUrl.trim();
    if (!url) return;
    setDetecting(true);
    try {
      const res = await adminFetch(`${MY_PORTAL_API}/connections/detect-platform`, {
        method: 'POST',
        body: JSON.stringify({ url }),
      });
      if (res.connector_id) {
        let hostname = url;
        try {
          hostname = new URL(url).hostname;
        } catch {
          // url already passed the gateway's own parse — this is defensive only.
        }
        setForm((f) => ({
          ...f,
          connector_id: res.connector_id,
          provider_id: res.provider_id ?? f.provider_id,
          name: f.name || (res.name_hint ? `${res.name_hint} (${hostname})` : f.name),
        }));
        notify('screens.commerceportal.detectPlatform.detected', undefined, {
          platform: res.name_hint ?? res.connector_id,
        });
      } else {
        notify('screens.commerceportal.detectPlatform.notDetected');
      }
    } catch {
      notify('screens.commerceportal.detectPlatform.failed');
    } finally {
      setDetecting(false);
    }
  };

  const create = async () => {
    setCreating(true);
    try {
      let openapi_document: unknown;
      if (form.openapi.trim()) {
        openapi_document = JSON.parse(form.openapi);
      }
      await adminFetch(`${MY_PORTAL_API}/connections`, {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          connector_id: form.connector_id.trim(),
          provider_id: form.provider_id.trim(),
          jurisdiction: form.jurisdiction.trim() || undefined,
          openapi_document,
        }),
      });
      onOpenChange(false);
      setForm(EMPTY_FORM);
      setStoreUrl('');
      await onCreated();
    } catch {
      notifyError('screens.partnerportal.actionFailed');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-border bg-card text-foreground">
        <DialogHeader>
          <DialogTitle>{t('screens.partnerportal.newConnection')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex gap-2">
              <Input
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
                placeholder={t('screens.commerceportal.detectPlatform.urlPlaceholder')}
                aria-label={t('screens.commerceportal.detectPlatform.urlPlaceholder')}
                type="url"
                className={fieldClass}
              />
              <Button
                type="button"
                variant="outline"
                className="border-border bg-transparent text-foreground hover:bg-muted"
                onClick={() => void detect()}
                disabled={detecting || !storeUrl.trim()}
                aria-label={t('screens.commerceportal.detectPlatform.urlPlaceholder')}
              >
                {detecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t('screens.commerceportal.detectPlatform.hint')}</p>
          </div>

          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder={t('screens.partnerportal.businessName')}
            aria-label={t('screens.partnerportal.businessName')}
            className={fieldClass}
          />
          <Input
            value={form.connector_id}
            onChange={(e) => setForm((f) => ({ ...f, connector_id: e.target.value }))}
            placeholder={t('screens.partnerportal.connectorId')}
            aria-label={t('screens.partnerportal.connectorId')}
            className={fieldClass}
          />
          <Input
            value={form.provider_id}
            onChange={(e) => setForm((f) => ({ ...f, provider_id: e.target.value }))}
            placeholder={t('screens.partnerportal.providerId')}
            aria-label={t('screens.partnerportal.providerId')}
            className={fieldClass}
          />
          <Input
            value={form.jurisdiction}
            onChange={(e) => setForm((f) => ({ ...f, jurisdiction: e.target.value }))}
            placeholder={t('screens.partnerportal.jurisdiction')}
            aria-label={t('screens.partnerportal.jurisdiction')}
            className={fieldClass}
          />
          <Textarea
            value={form.openapi}
            onChange={(e) => setForm((f) => ({ ...f, openapi: e.target.value }))}
            placeholder={t('screens.partnerportal.openapiDocument')}
            aria-label={t('screens.partnerportal.openapiDocument')}
            rows={5}
            className={fieldClass}
          />
          <p className="text-xs text-muted-foreground">{t('screens.partnerportal.openapiHint')}</p>

          <Button
            className="w-full bg-amber-700 font-semibold text-white hover:bg-amber-800"
            onClick={() => void create()}
            disabled={creating || !form.name.trim() || !form.connector_id.trim() || !form.provider_id.trim()}
          >
            {creating ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                {t('screens.partnerportal.creating')}
              </>
            ) : (
              t('screens.partnerportal.create')
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
