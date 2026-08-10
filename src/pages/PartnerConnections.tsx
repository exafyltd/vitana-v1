/**
 * Partner Portal — connection list + connect-business entry (VTID-03546,
 * BLK-008). Thin client over the gateway's /api/v1/vcaop/portal/* surface
 * (VTID-03544): the state machine, mapping gate and activation rules all
 * live server-side; this screen only presents them.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Plug } from 'lucide-react';
import { adminFetch } from '@/lib/admin-api';
import { t, notifyError } from '@/lib/i18n-toast';
import { fmtDateTime } from '@/lib/locale-format';
import { stateBadgeVariant } from '@/lib/partner-portal';

interface ConnectionRow {
  id: string;
  name: string;
  connector_id: string;
  provider_id: string;
  state: string;
  jurisdiction?: string | null;
  updated_at: string;
}

const stateLabel = (state: string) => t(`screens.partnerportal.states.${state}`);

export default function PartnerConnections() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ConnectionRow[] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', connector_id: '', provider_id: '', jurisdiction: '', openapi: '' });

  const load = useCallback(async () => {
    try {
      const res = await adminFetch('/api/v1/vcaop/portal/connections');
      setRows(res.data ?? []);
    } catch {
      setRows([]);
      notifyError('screens.partnerportal.loadFailed');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    setCreating(true);
    try {
      let openapi_document: unknown;
      if (form.openapi.trim()) {
        openapi_document = JSON.parse(form.openapi);
      }
      await adminFetch('/api/v1/vcaop/portal/connections', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          connector_id: form.connector_id.trim(),
          provider_id: form.provider_id.trim(),
          jurisdiction: form.jurisdiction.trim() || undefined,
          openapi_document,
        }),
      });
      setDialogOpen(false);
      setForm({ name: '', connector_id: '', provider_id: '', jurisdiction: '', openapi: '' });
      await load();
    } catch {
      notifyError('screens.partnerportal.actionFailed');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t('screens.partnerportal.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('screens.partnerportal.subtitle')}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plug className="mr-2 h-4 w-4" />
              {t('screens.partnerportal.newConnection')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t('screens.partnerportal.newConnection')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={t('screens.partnerportal.businessName')}
                aria-label={t('screens.partnerportal.businessName')}
              />
              <Input
                value={form.connector_id}
                onChange={(e) => setForm((f) => ({ ...f, connector_id: e.target.value }))}
                placeholder={t('screens.partnerportal.connectorId')}
                aria-label={t('screens.partnerportal.connectorId')}
              />
              <Input
                value={form.provider_id}
                onChange={(e) => setForm((f) => ({ ...f, provider_id: e.target.value }))}
                placeholder={t('screens.partnerportal.providerId')}
                aria-label={t('screens.partnerportal.providerId')}
              />
              <Input
                value={form.jurisdiction}
                onChange={(e) => setForm((f) => ({ ...f, jurisdiction: e.target.value }))}
                placeholder={t('screens.partnerportal.jurisdiction')}
                aria-label={t('screens.partnerportal.jurisdiction')}
              />
              <Textarea
                value={form.openapi}
                onChange={(e) => setForm((f) => ({ ...f, openapi: e.target.value }))}
                placeholder={t('screens.partnerportal.openapiDocument')}
                aria-label={t('screens.partnerportal.openapiDocument')}
                rows={5}
              />
              <p className="text-xs text-muted-foreground">{t('screens.partnerportal.openapiHint')}</p>
              <Button
                className="w-full"
                onClick={() => void create()}
                disabled={creating || !form.name.trim() || !form.connector_id.trim() || !form.provider_id.trim()}
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('screens.partnerportal.creating')}
                  </>
                ) : (
                  t('screens.partnerportal.create')
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('screens.partnerportal.connections')}</CardTitle>
        </CardHeader>
        <CardContent>
          {rows === null ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t('screens.partnerportal.empty')}</p>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    className="flex w-full flex-wrap items-center justify-between gap-2 py-3 text-left hover:bg-muted/50"
                    onClick={() => navigate(`/partner/connections/${row.id}`)}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{row.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {row.connector_id} · {row.provider_id}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{fmtDateTime(new Date(row.updated_at))}</span>
                      <Badge variant={stateBadgeVariant(row.state)}>{stateLabel(row.state)}</Badge>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
