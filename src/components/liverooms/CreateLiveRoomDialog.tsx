/**
 * Dialog for creating a new live room
 * VTID-01230: Frontend integration for Daily.co Live Rooms
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCreateLiveRoom } from '@/hooks/useLiveRoom';
import { useCreatorStatus } from '@/hooks/useCreator';
import { EnablePaymentsButton } from '@/components/creator/EnablePaymentsButton';
import { useState } from 'react';
import { Plus, AlertCircle } from 'lucide-react';
import { isIAPRestricted } from '@/lib/appilix';
import { t } from '@/lib/i18n-toast';

export function CreateLiveRoomDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [accessLevel, setAccessLevel] = useState<'public' | 'group'>('public');
  const [price, setPrice] = useState('');

  const { mutate: createRoom, isPending } = useCreateLiveRoom();
  const { data: creatorStatus } = useCreatorStatus();

  const handleSubmit = () => {
    createRoom({
      title,
      access_level: accessLevel,
      metadata: {
        description: description || undefined,
        price: accessLevel === 'group' && price ? parseFloat(price) : undefined,
      },
    }, {
      onSuccess: () => {
        setOpen(false);
        // Reset form
        setTitle('');
        setDescription('');
        setAccessLevel('public');
        setPrice('');
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Live Room
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('screens.liverooms.createLiveRoom')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">{t('screens.liverooms.title')}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Live Session"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this session about?"
              rows={3}
            />
          </div>

          {!isIAPRestricted() && (
            <div>
              <Label>{t('screens.liverooms.accessLevel')}</Label>
              <RadioGroup value={accessLevel} onValueChange={(v) => setAccessLevel(v as any)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="public" id="public" />
                  <Label htmlFor="public">{t('screens.liverooms.freePublic')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="group" id="group" />
                  <Label htmlFor="group">{t('screens.liverooms.paidGroup')}</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {!isIAPRestricted() && accessLevel === 'group' && (
            <>
              {/* VTID-01230: Hard block for paid rooms without onboarding */}
              {(!creatorStatus?.charges_enabled || !creatorStatus?.payouts_enabled) && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800">
                        ⛔ Cannot create paid rooms
                      </p>
                      <p className="text-sm text-red-700 mt-1">
                        Complete payment setup first to enable paid room creation and receive 90% of revenue.
                      </p>
                    </div>
                  </div>
                  <EnablePaymentsButton />
                </div>
              )}

              <div>
                <Label htmlFor="price">{t('screens.liverooms.priceUsd')}</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="9.99"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  You'll receive 90% of the price. Vitana platform fee: 10%.
                </p>
              </div>
            </>
          )}

          <Button
            onClick={handleSubmit}
            disabled={
              isPending ||
              !title ||
              (accessLevel === 'group' && (
                !price ||
                !creatorStatus?.charges_enabled ||
                !creatorStatus?.payouts_enabled
              ))
            }
            className="w-full"
          >
            {isPending ? 'Creating...' : 'Create Room'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
