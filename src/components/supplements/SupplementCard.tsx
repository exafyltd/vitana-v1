import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { UserSupplement } from '@/hooks/useUserSupplements';
import { format } from 'date-fns';
import { t } from '@/lib/i18n-toast';

interface SupplementCardProps {
  supplement: UserSupplement;
  onEdit: (supplement: UserSupplement) => void;
  onDelete: (id: string) => void;
}

export function SupplementCard({ supplement, onEdit, onDelete }: SupplementCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{supplement.name}</h3>
              {!supplement.is_active && (
                <Badge variant="secondary" className="text-xs">
                  Inactive
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-2">{supplement.category}</p>
            
            <div className="grid grid-cols-2 gap-2 text-sm">
              {supplement.dosage && (
                <div>
                  <span className="text-muted-foreground">{t('screens.supplements.dosage')} </span>
                  <span className="font-medium">{supplement.dosage}</span>
                </div>
              )}
              {supplement.frequency && (
                <div>
                  <span className="text-muted-foreground">{t('screens.supplements.frequency')} </span>
                  <span className="font-medium">{supplement.frequency}</span>
                </div>
              )}
              {supplement.start_date && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">{t('screens.supplements.started')} </span>
                  <span className="font-medium">
                    {format(new Date(supplement.start_date), 'MMM dd, yyyy')}
                  </span>
                </div>
              )}
            </div>

            {supplement.notes && (
              <p className="text-sm text-muted-foreground mt-2 italic">
                {supplement.notes}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(supplement)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm(`Are you sure you want to delete ${supplement.name}?`)) {
                  onDelete(supplement.id);
                }
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
