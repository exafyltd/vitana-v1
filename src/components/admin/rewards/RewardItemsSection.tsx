/**
 * VTID-05036 — Admin › Rewards Shop › Artikel: every item, active or not,
 * with its photo, VTNA price (≈ €), type, stock and an on/off switch.
 */
import { useState } from 'react';
import { ImageOff, Pencil, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { notifyError, t, useI18nLocale } from '@/lib/i18n-toast';
import { fmtNumber } from '@/lib/locale-format';
import { itemText } from '@/hooks/useRewardShop';
import { type AdminRewardItem, useSaveAdminRewardItem } from '@/hooks/useAdminRewardShop';
import { EUR_PER_VTNA, itemWithActive } from './item-form';
import { RewardItemForm } from './RewardItemForm';
import { errorText } from './errors';

export function RewardItemsSection({ items }: { items: AdminRewardItem[] }) {
  const locale = useI18nLocale();
  const [editing, setEditing] = useState<AdminRewardItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const save = useSaveAdminRewardItem();

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (item: AdminRewardItem) => { setEditing(item); setFormOpen(true); };

  const toggleActive = async (item: AdminRewardItem, on: boolean) => {
    try {
      await save.mutateAsync(itemWithActive(item, on));
    } catch (e) {
      const { text, serverMessage } = errorText(e);
      notifyError('admin.rewardsShop.items.toggleFailed', undefined, { reason: serverMessage ?? text });
    }
  };

  return (
    <div className="space-y-4" data-testid="reward-admin-items">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{t('admin.rewardsShop.items.count', { count: fmtNumber(items.length) })}</p>
        <Button size="sm" onClick={openNew} data-testid="reward-admin-new-item">
          <Plus className="me-2 h-4 w-4" aria-hidden />
          {t('admin.rewardsShop.items.newItem')}
        </Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground" data-testid="reward-admin-items-empty">
            {t('admin.rewardsShop.items.empty')}
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const title = itemText(item.titles, locale, item.slug);
            return (
              <li key={item.id}>
                <Card className="h-full" data-testid={`reward-admin-item-${item.slug}`}>
                  <CardContent className="flex gap-3 p-3">
                    {item.images?.[0] ? (
                      <img src={item.images[0]} alt={title} loading="lazy" className="h-20 w-20 shrink-0 rounded-md border object-cover" />
                    ) : (
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md border border-dashed text-muted-foreground" title={t('admin.rewardsShop.items.noPhoto')}>
                        <ImageOff className="h-5 w-5" aria-hidden />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-1 text-start">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 break-words font-medium leading-snug">{title}</p>
                        <Switch
                          checked={item.is_active}
                          disabled={save.isPending}
                          aria-label={t('admin.rewardsShop.items.activeToggle', { title })}
                          data-testid={`reward-admin-item-active-${item.slug}`}
                          onCheckedChange={(c) => toggleActive(item, c)}
                        />
                      </div>
                      <p className="truncate font-mono text-xs text-muted-foreground" dir="ltr">{item.slug}</p>
                      <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                        <span className="font-semibold">{t('admin.rewardsShop.items.price', { amount: fmtNumber(item.vtna_price) })}</span>
                        <span className="text-xs text-muted-foreground">
                          {t('admin.rewardsShop.items.approx', {
                            money: fmtNumber(item.vtna_price * EUR_PER_VTNA, { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }),
                          })}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={item.is_active ? 'default' : 'secondary'}>
                          {item.is_active ? t('admin.rewardsShop.items.active') : t('admin.rewardsShop.items.inactive')}
                        </Badge>
                        <Badge variant="outline">{t(`admin.rewardsShop.fulfilment.${item.fulfilment}`)}</Badge>
                        <Badge variant="outline">
                          {item.stock == null
                            ? t('admin.rewardsShop.items.stockUnlimited')
                            : t('admin.rewardsShop.items.stock', { count: fmtNumber(item.stock) })}
                        </Badge>
                        {item.reserved > 0 && (
                          <Badge variant="outline">{t('admin.rewardsShop.items.reserved', { count: fmtNumber(item.reserved) })}</Badge>
                        )}
                      </div>
                      <div className="pt-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(item)} data-testid={`reward-admin-item-edit-${item.slug}`}>
                          <Pencil className="me-2 h-3.5 w-3.5" aria-hidden />
                          {t('admin.rewardsShop.items.edit')}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <RewardItemForm open={formOpen} item={editing} onClose={() => setFormOpen(false)} />
    </div>
  );
}
